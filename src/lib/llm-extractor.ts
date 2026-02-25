/**
 * llm-extractor.ts
 *
 * Módulo de extracción de datos estructurados mediante LLM (Anthropic Claude).
 * Soporta entrada MULTIMODAL: texto plano (de PDFs) e imágenes (fotos de celular).
 * Usa "Tool Use" para forzar respuesta JSON estricta validada con Zod.
 *
 * PRINCIPIO CRÍTICO: El LLM solo EXTRAE datos tal como están escritos.
 * NO compara, NO calcula, NO asume. Si un dato no existe, retorna vacío.
 */

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import {
    FacturaSchema,
    OrdenCompraSchema,
    ActaRecepcionSchema,
} from "@/lib/schemas";
import type { ExtraccionCompleta } from "@/lib/schemas";

// =============================================================================
// 🔧 CLIENTE ANTHROPIC
// =============================================================================

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

/** Modelo a usar (configurable vía .env.local) */
const MODELO_LLM =
    process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-20250514";

// =============================================================================
// 📐 ESQUEMA UNIFICADO + JSON SCHEMA PARA TOOL USE
// =============================================================================

export const ExtraccionFinancieraSchema = z.object({
    factura: FacturaSchema,
    ordenCompra: OrdenCompraSchema,
    actaRecepcion: ActaRecepcionSchema,
});

export type ExtraccionFinanciera = z.infer<typeof ExtraccionFinancieraSchema>;

/**
 * Convertir el esquema Zod a JSON Schema usando el método nativo de Zod v4.
 * Produce un JSON Schema limpio y compatible con Anthropic Tool Use.
 */
const inputSchema = z.toJSONSchema(
    ExtraccionFinancieraSchema
) as Anthropic.Tool.InputSchema;

// =============================================================================
// 📝 PROMPTS
// =============================================================================

const SYSTEM_PROMPT = `Eres un auditor financiero experto y un extractor de datos automatizado. Tu única tarea es analizar los documentos proporcionados (textos extraídos de PDFs o fotografías de documentos) y extraer los datos financieros solicitados.

REGLAS ESTRICTAS:
- NO realices cálculos, NO asumas información que no está explícitamente escrita.
- NO intentes cuadrar los montos si difieren entre documentos.
- Si un dato no existe en el texto o la imagen, devuelve un string vacío "" para strings o 0 para números.
- Si recibes una fotografía de un documento, léela cuidadosamente a pesar de posibles problemas de iluminación, ángulo o sombras.
- Para montos: usa valores numéricos sin separador de miles (ej: 1190000).
- Para fechas: usa formato YYYY-MM-DD.
- Para RUTs: mantén el formato original del documento (ej: "76.123.456-7").

SIEMPRE usa la herramienta extraer_datos_financieros para entregar tu respuesta. Tu precisión debe ser quirúrgica.`;

// =============================================================================
// 📦 TIPOS DE ENTRADA MULTIMODAL
// =============================================================================

/** Contenido de un documento: puede ser texto plano o imagen base64 */
export interface ContenidoDocumento {
    /** "texto" para PDFs, "imagen" para fotos de celular */
    tipo: "texto" | "imagen";
    /** Texto plano o data URI base64 (data:image/jpeg;base64,...) */
    contenido: string;
}

/** Parámetros de entrada para la extracción multimodal */
export interface DocumentosEntrada {
    factura: ContenidoDocumento;
    ordenCompra: ContenidoDocumento;
    actaRecepcion: ContenidoDocumento;
}

// Etiquetas para el prompt
const ETIQUETAS_DOC: Record<string, string> = {
    factura: "FACTURA",
    ordenCompra: "ORDEN DE COMPRA",
    actaRecepcion: "ACTA DE RECEPCIÓN CONFORME",
};

// =============================================================================
// 🔧 FUNCIONES AUXILIARES
// =============================================================================

/** Media types válidos para la API de Anthropic */
type AnthropicMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

/** Bloques de contenido para la API de Anthropic */
type AnthropicContentBlock =
    | Anthropic.TextBlockParam
    | Anthropic.ImageBlockParam;

/**
 * Parsea un data URI base64 y separa el media_type de la data pura.
 * Entrada: "data:image/jpeg;base64,iVBORw0KGgo..."
 * Salida: { mediaType: "image/jpeg", data: "iVBORw0KGgo..." }
 */
function parseDataUri(dataUri: string): {
    mediaType: AnthropicMediaType;
    data: string;
} {
    const match = dataUri.match(/^data:(image\/\w+);base64,([\s\S]+)$/);
    if (!match) {
        throw new Error(
            "El formato de la imagen no es un data URI base64 válido. Esperado: data:image/jpeg;base64,..."
        );
    }
    return {
        mediaType: match[1] as AnthropicMediaType,
        data: match[2],
    };
}

/**
 * Construye el arreglo de contenido multimodal para Anthropic.
 * Mezcla bloques de texto e imagen según el tipo de cada documento.
 */
function buildMultimodalContent(
    docs: DocumentosEntrada
): AnthropicContentBlock[] {
    const bloques: AnthropicContentBlock[] = [];

    // Instrucción inicial
    bloques.push({
        type: "text",
        text: "Analiza los siguientes tres documentos y extrae los datos financieros usando la herramienta proporcionada.\n",
    });

    const campos: (keyof DocumentosEntrada)[] = [
        "factura",
        "ordenCompra",
        "actaRecepcion",
    ];

    for (const campo of campos) {
        const doc = docs[campo];
        const etiqueta = ETIQUETAS_DOC[campo];

        if (doc.tipo === "texto") {
            // ─── Documento de texto (PDF) ──────────────────────────────────
            bloques.push({
                type: "text",
                text: `\n================================================================================\n--- ${etiqueta} ---\n================================================================================\n${doc.contenido}\n`,
            });
        } else {
            // ─── Documento de imagen (foto) ────────────────────────────────
            bloques.push({
                type: "text",
                text: `\n--- ${etiqueta} (FOTOGRAFÍA) ---\nLa siguiente imagen es una fotografía del documento "${etiqueta}". Léela cuidadosamente y extrae los datos solicitados.\n`,
            });

            // Parsear data URI → media_type + data pura
            const { mediaType, data } = parseDataUri(doc.contenido);

            bloques.push({
                type: "image",
                source: {
                    type: "base64",
                    media_type: mediaType,
                    data: data,
                },
            });
        }
    }

    // Instrucciones finales
    bloques.push({
        type: "text",
        text: "\n================================================================================\n\nExtrae TODOS los datos de los tres documentos usando la herramienta extraer_datos_financieros. Para montos usa números sin separador de miles. Para fechas usa YYYY-MM-DD. Para RUTs mantén el formato original.",
    });

    return bloques;
}

// =============================================================================
// 🚀 FUNCIÓN PRINCIPAL
// =============================================================================

/**
 * Extrae datos financieros estructurados de los 3 documentos usando Claude.
 * Soporta entrada multimodal: texto (PDF) e imágenes (fotos de celular).
 * Usa Tool Use para forzar respuesta JSON estricta.
 *
 * @param docs - Objeto con el contenido de cada documento (texto o imagen)
 * @returns ExtraccionCompleta validada con Zod (Factura + OC + Acta)
 * @throws Error si la API de Anthropic falla o la respuesta no es válida
 */
export async function extraerDatosFinancieros(
    docs: DocumentosEntrada
): Promise<ExtraccionCompleta> {
    // Validar que los contenidos no estén vacíos
    const campos: (keyof DocumentosEntrada)[] = [
        "factura",
        "ordenCompra",
        "actaRecepcion",
    ];
    for (const campo of campos) {
        if (!docs[campo]?.contenido?.trim()) {
            throw new Error(
                `El contenido del documento "${campo}" está vacío. Se requieren los 3 documentos.`
            );
        }
    }

    // Logging de tipos de entrada
    const tiposInfo = campos
        .map(
            (c) => `${c}: ${docs[c].tipo === "imagen" ? "📷 imagen" : "📄 texto"}`
        )
        .join(" | ");

    try {
        console.log(
            `[llm-extractor] 🚀 Enviando documentos a Claude (${MODELO_LLM})...`
        );
        console.log(`[llm-extractor] Tipos: ${tiposInfo}`);

        const tieneImagenes = campos.some((c) => docs[c].tipo === "imagen");
        if (tieneImagenes) {
            console.log(
                "[llm-extractor] 📷 Modo Vision activado — procesando imágenes"
            );
        }

        // Construir contenido multimodal
        const contenido = buildMultimodalContent(docs);

        // =========================================================================
        // Llamada a Claude con Tool Use
        // =========================================================================
        const response = await anthropic.messages.create({
            model: MODELO_LLM,
            max_tokens: 4096,
            temperature: 0.0,
            system: SYSTEM_PROMPT,
            messages: [
                {
                    role: "user",
                    content: contenido,
                },
            ],
            tools: [
                {
                    name: "extraer_datos_financieros",
                    description:
                        "Extrae los datos financieros estructurados de los 3 documentos (Factura, Orden de Compra y Acta de Recepción). Debe poblar todos los campos del esquema con la información encontrada en los documentos.",
                    input_schema: inputSchema as Anthropic.Tool.InputSchema,
                },
            ],
            // Forzar el uso de la herramienta
            tool_choice: {
                type: "tool",
                name: "extraer_datos_financieros",
            },
        });

        // =========================================================================
        // Extraer los argumentos de la Tool llamada por Claude
        // =========================================================================
        const toolUseBlock = response.content.find(
            (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
        );

        if (!toolUseBlock) {
            console.error(
                "[llm-extractor] ❌ Claude no invocó la herramienta de extracción."
            );
            throw new Error(
                "El modelo no devolvió datos estructurados. No se encontró el bloque tool_use en la respuesta."
            );
        }

        // =========================================================================
        // Validar con Zod antes de retornar
        // =========================================================================
        const datosRaw = toolUseBlock.input;
        const parsed = ExtraccionFinancieraSchema.parse(datosRaw);

        // Log de uso
        console.log(
            `[llm-extractor] ✅ Extracción completada. Tokens: ${response.usage.input_tokens} prompt + ${response.usage.output_tokens} completion`
        );
        console.log(
            `[llm-extractor] ✅ Datos extraídos: Factura #${parsed.factura.numeroFactura}, OC #${parsed.ordenCompra.numeroOC}, Acta #${parsed.actaRecepcion.numeroActa}`
        );

        return parsed;
    } catch (error: unknown) {
        // ─── Errores de Anthropic ─────────────────────────────────────────
        if (error instanceof Anthropic.APIError) {
            const { status, message } = error;

            if (status === 401) {
                console.error("[llm-extractor] ❌ API Key inválida o expirada.");
                throw new Error(
                    "Error de autenticación con Anthropic. Verifica tu ANTHROPIC_API_KEY en .env.local."
                );
            }
            if (status === 429) {
                console.error("[llm-extractor] ❌ Límite de tasa excedido.");
                throw new Error(
                    "Se excedió el límite de solicitudes a Anthropic. Intenta nuevamente en unos minutos."
                );
            }
            if (status === 500 || status === 529) {
                console.error(
                    `[llm-extractor] ❌ Error del servidor de Anthropic (${status}).`
                );
                throw new Error(
                    "Anthropic está temporalmente no disponible. Intenta nuevamente en unos minutos."
                );
            }

            console.error(
                `[llm-extractor] ❌ Error de API Anthropic (${status}): ${message}`
            );
            throw new Error(`Error de Anthropic (${status}): ${message}`);
        }

        // ─── Errores de validación Zod ────────────────────────────────────
        if (error instanceof z.ZodError) {
            const detalles = error.issues
                .map((e) => `${e.path.join(".")}: ${e.message}`)
                .join("; ");
            console.error(
                `[llm-extractor] ❌ Los datos del LLM no cumplen el esquema Zod: ${detalles}`
            );
            throw new Error(
                `Los datos extraídos por el modelo no son válidos: ${detalles}`
            );
        }

        // Re-lanzar errores ya manejados
        if (error instanceof Error && error.message.includes("extracción")) {
            throw error;
        }

        const mensaje = error instanceof Error ? error.message : String(error);
        console.error(`[llm-extractor] ❌ Error inesperado: ${mensaje}`);
        throw new Error(`Error inesperado durante la extracción LLM: ${mensaje}`);
    }
}
