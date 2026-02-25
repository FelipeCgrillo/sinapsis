/**
 * pdf-extractor.ts
 *
 * Módulo de extracción de texto desde archivos PDF.
 * Usa la librería `unpdf` — parser PDF puro en JavaScript,
 * compatible con entornos serverless (Vercel, AWS Lambda, Cloudflare).
 *
 * Principio: Este módulo solo EXTRAE texto. No interpreta ni valida contenido.
 */

import { extractText } from "unpdf";
import type { TextoExtraido, TipoDocumento } from "@/types";
import { CONFIG_DEFAULT } from "@/types";

// =============================================================================
// FUNCIÓN PRINCIPAL: Extracción de texto desde un Buffer PDF
// =============================================================================

/**
 * Extrae el texto crudo de un archivo PDF.
 *
 * @param buffer - Buffer con el contenido binario del PDF
 * @returns string con el texto plano extraído del PDF
 * @throws Error personalizado si el PDF está corrupto, protegido o es inválido
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
    try {
        // unpdf espera un ArrayBuffer o Uint8Array
        const { text: textPages, totalPages } = await extractText(new Uint8Array(buffer));

        console.log(`[pdf-extractor] Páginas extraídas: ${totalPages}`);

        // unpdf retorna un array de strings (uno por página), unir en un solo texto
        const textoCompleto = Array.isArray(textPages) ? textPages.join("\n") : String(textPages);

        // Verificar que se extrajo contenido
        if (!textoCompleto || textoCompleto.trim().length === 0) {
            throw new Error(
                "El PDF no contiene texto extraíble. Puede ser un PDF escaneado (imagen) sin OCR."
            );
        }

        return textoCompleto;
    } catch (error: unknown) {
        const mensajeOriginal =
            error instanceof Error ? error.message : String(error);

        // Detectar errores comunes
        if (mensajeOriginal.includes("password")) {
            console.error(
                `[pdf-extractor] PDF protegido con contraseña: ${mensajeOriginal}`
            );
            throw new Error(
                "No se pudo extraer el texto del PDF: El documento está protegido con contraseña."
            );
        }

        if (
            mensajeOriginal.includes("Invalid") ||
            mensajeOriginal.includes("corrupt")
        ) {
            console.error(
                `[pdf-extractor] PDF corrupto o inválido: ${mensajeOriginal}`
            );
            throw new Error(
                "No se pudo extraer el texto del PDF: El archivo está corrupto o no es un PDF válido."
            );
        }

        // Error genérico
        console.error(
            `[pdf-extractor] Error extrayendo texto del PDF: ${mensajeOriginal}`
        );
        throw new Error(`No se pudo extraer el texto del PDF: ${mensajeOriginal}`);
    }
}

// =============================================================================
// FUNCIÓN COMPLETA: Extracción con metadatos
// =============================================================================

/**
 * Extrae texto de un PDF y retorna un objeto con metadatos completos.
 *
 * @param buffer - Buffer del archivo PDF
 * @param tipo - Tipo de documento (factura, ordenCompra, actaRecepcion)
 * @param nombreArchivo - Nombre original del archivo
 * @returns Objeto TextoExtraido con texto y metadatos
 */
export async function extraerTextoPDF(
    buffer: Buffer,
    tipo: TipoDocumento,
    nombreArchivo: string
): Promise<TextoExtraido> {
    // Validar tamaño máximo
    if (buffer.length > CONFIG_DEFAULT.maxFileSize) {
        throw new Error(
            `El archivo "${nombreArchivo}" excede el tamaño máximo permitido de ${CONFIG_DEFAULT.maxFileSize / (1024 * 1024)
            }MB`
        );
    }

    // Extraer texto
    const texto = await extractTextFromPDF(buffer);

    return {
        tipo,
        texto,
        nombreArchivo,
        tamanoBytes: buffer.length,
        numeroPaginas: 0,
    };
}
