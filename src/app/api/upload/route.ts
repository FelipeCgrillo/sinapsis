/**
 * API Route: POST /api/upload
 *
 * Recibe exactamente 3 archivos vía FormData (factura, ordenCompra, actaRecepcion).
 * Soporta PDFs e imágenes (JPEG, PNG, WebP).
 *
 * - Si el archivo es un PDF: extrae el texto plano con pdf-parse.
 * - Si el archivo es una imagen: convierte a Base64 data URI para envío directo al LLM Vision.
 *
 * Campos esperados en FormData:
 *   - factura: File (PDF o imagen)
 *   - ordenCompra: File (PDF o imagen)
 *   - actaRecepcion: File (PDF o imagen)
 */

import { NextRequest, NextResponse } from "next/server";
import { extractTextFromPDF } from "@/lib/pdf-extractor";
import { procesarImagen } from "@/lib/image-processor";
import type { ApiResponse, TipoDocumento } from "@/types";
import { ETIQUETAS_DOCUMENTO, CONFIG_DEFAULT } from "@/types";

// Campos requeridos en el FormData
const CAMPOS_REQUERIDOS: TipoDocumento[] = [
    "factura",
    "ordenCompra",
    "actaRecepcion",
];

/** MIME types que se procesan como imagen (Vision) */
const MIME_IMAGEN = ["image/jpeg", "image/png", "image/webp"];

/** Contenido procesado de un documento: texto extraído o imagen base64 */
export interface ContenidoDocumento {
    /** Tipo de contenido: "texto" para PDFs, "imagen" para fotos */
    tipo: "texto" | "imagen";
    /** El contenido: texto plano o data URI base64 */
    contenido: string;
    /** Nombre original del archivo */
    nombreArchivo: string;
}

/** Tipo de la respuesta exitosa de este endpoint */
interface UploadSuccessData {
    factura: ContenidoDocumento;
    ordenCompra: ContenidoDocumento;
    actaRecepcion: ContenidoDocumento;
}

export async function POST(
    request: NextRequest
): Promise<NextResponse<ApiResponse<UploadSuccessData>>> {
    try {
        // =========================================================================
        // 1. Extraer FormData de la request
        // =========================================================================
        let formData: FormData;
        try {
            formData = await request.formData();
        } catch {
            return NextResponse.json(
                {
                    success: false,
                    error:
                        "La petición no contiene un FormData válido. Asegúrese de enviar los archivos como multipart/form-data.",
                },
                { status: 400 }
            );
        }

        // =========================================================================
        // 2. Validar que los 3 archivos estén presentes
        // =========================================================================
        const archivos: Record<TipoDocumento, File> = {} as Record<
            TipoDocumento,
            File
        >;
        const faltantes: string[] = [];

        for (const campo of CAMPOS_REQUERIDOS) {
            const archivo = formData.get(campo);

            if (!archivo || !(archivo instanceof File)) {
                faltantes.push(ETIQUETAS_DOCUMENTO[campo]);
                continue;
            }

            archivos[campo] = archivo;
        }

        if (faltantes.length > 0) {
            return NextResponse.json(
                {
                    success: false,
                    error: `Faltan los siguientes documentos: ${faltantes.join(", ")}.`,
                    detalles: `Se requieren exactamente 3 archivos: Factura, Orden de Compra y Acta de Recepción Conforme.`,
                },
                { status: 400 }
            );
        }

        // =========================================================================
        // 3. Validar tipo MIME y tamaño de cada archivo
        // =========================================================================
        for (const campo of CAMPOS_REQUERIDOS) {
            const archivo = archivos[campo];
            const etiqueta = ETIQUETAS_DOCUMENTO[campo];

            // Validar MIME type (PDF o imagen)
            if (!CONFIG_DEFAULT.mimeTypesPermitidos.includes(archivo.type)) {
                return NextResponse.json(
                    {
                        success: false,
                        error: `El archivo "${etiqueta}" no es un formato válido. Tipo recibido: "${archivo.type}".`,
                        detalles: `Formatos aceptados: PDF, JPEG, PNG, WebP.`,
                    },
                    { status: 400 }
                );
            }

            // Validar tamaño máximo
            if (archivo.size > CONFIG_DEFAULT.maxFileSize) {
                return NextResponse.json(
                    {
                        success: false,
                        error: `El archivo "${etiqueta}" excede el tamaño máximo permitido de ${CONFIG_DEFAULT.maxFileSize / (1024 * 1024)}MB.`,
                        detalles: `Tamaño recibido: ${(archivo.size / (1024 * 1024)).toFixed(2)}MB.`,
                    },
                    { status: 400 }
                );
            }
        }

        // =========================================================================
        // 4. Procesar cada archivo según su tipo (PDF → texto, Imagen → base64)
        // =========================================================================
        const contenidos: Record<string, ContenidoDocumento> = {};

        for (const campo of CAMPOS_REQUERIDOS) {
            const archivo = archivos[campo];
            const etiqueta = ETIQUETAS_DOCUMENTO[campo];
            const esImagen = MIME_IMAGEN.includes(archivo.type);

            try {
                const arrayBuffer = await archivo.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);

                if (esImagen) {
                    // ─── IMAGEN: Comprimir/redimensionar + convertir a base64 ──
                    const resultado = await procesarImagen(buffer, archivo.type);
                    const base64 = resultado.buffer.toString("base64");
                    const dataUri = `data:${resultado.mimeType};base64,${base64}`;

                    contenidos[campo] = {
                        tipo: "imagen",
                        contenido: dataUri,
                        nombreArchivo: archivo.name,
                    };

                    if (resultado.fueProcesada) {
                        console.log(
                            `[upload] 📷 ${etiqueta}: Imagen comprimida ${(resultado.tamanoOriginal / 1024 / 1024).toFixed(1)}MB → ${(resultado.tamanoFinal / 1024 / 1024).toFixed(1)}MB (calidad ${resultado.calidadUsada}%) — "${archivo.name}"`
                        );
                    } else {
                        console.log(
                            `[upload] 📷 ${etiqueta}: Imagen OK (${(archivo.size / 1024).toFixed(0)} KB) — "${archivo.name}"`
                        );
                    }
                } else {
                    // ─── PDF: Extraer texto plano ─────────────────────────────────
                    const texto = await extractTextFromPDF(buffer);

                    contenidos[campo] = {
                        tipo: "texto",
                        contenido: texto,
                        nombreArchivo: archivo.name,
                    };

                    console.log(
                        `[upload] 📄 ${etiqueta}: ${texto.length} caracteres extraídos — "${archivo.name}"`
                    );
                }
            } catch (error: unknown) {
                const mensaje =
                    error instanceof Error ? error.message : "Error desconocido";

                console.error(
                    `[upload] ❌ Error procesando ${etiqueta} ("${archivo.name}"): ${mensaje}`
                );

                return NextResponse.json(
                    {
                        success: false,
                        error: `Error al procesar "${etiqueta}" (${archivo.name}): ${mensaje}`,
                    },
                    { status: 422 }
                );
            }
        }

        // =========================================================================
        // 5. Respuesta exitosa con los contenidos procesados
        // =========================================================================
        const tiposUsados = Object.values(contenidos).map((c) =>
            c.tipo === "imagen" ? "📷" : "📄"
        );
        console.log(
            `[upload] ✅ 3 documentos procesados: ${tiposUsados.join(" ")}`
        );

        return NextResponse.json(
            {
                success: true,
                data: {
                    factura: contenidos["factura"] as ContenidoDocumento,
                    ordenCompra: contenidos["ordenCompra"] as ContenidoDocumento,
                    actaRecepcion: contenidos["actaRecepcion"] as ContenidoDocumento,
                },
            },
            { status: 200 }
        );
    } catch (error: unknown) {
        const mensaje =
            error instanceof Error ? error.message : "Error interno del servidor";
        console.error(`[upload] ❌ Error inesperado: ${mensaje}`);

        return NextResponse.json(
            {
                success: false,
                error: "Error interno del servidor al procesar los documentos.",
                detalles: mensaje,
            },
            { status: 500 }
        );
    }
}
