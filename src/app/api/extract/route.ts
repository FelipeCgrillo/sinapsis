/**
 * API Route: POST /api/extract
 *
 * Recibe los contenidos procesados de los 3 documentos (del upload)
 * y los envía al LLM para obtener un JSON estructurado.
 *
 * Soporta entrada multimodal: texto (PDFs) e imágenes (fotos de celular).
 *
 * Body esperado (JSON):
 * {
 *   "factura":       { "tipo": "texto"|"imagen", "contenido": "..." },
 *   "ordenCompra":   { "tipo": "texto"|"imagen", "contenido": "..." },
 *   "actaRecepcion": { "tipo": "texto"|"imagen", "contenido": "..." }
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import {
    extraerDatosFinancieros,
    type DocumentosEntrada,
} from "@/lib/llm-extractor";
import type { ApiResponse } from "@/types";
import type { ExtraccionCompleta } from "@/lib/schemas";

export async function POST(
    request: NextRequest
): Promise<NextResponse<ApiResponse<ExtraccionCompleta>>> {
    try {
        // =========================================================================
        // 1. Parsear el body JSON
        // =========================================================================
        let body: DocumentosEntrada;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json(
                {
                    success: false,
                    error:
                        "El body de la petición no es un JSON válido. Envíe un objeto con factura, ordenCompra y actaRecepcion.",
                },
                { status: 400 }
            );
        }

        // =========================================================================
        // 2. Validar que los 3 documentos estén presentes con contenido
        // =========================================================================
        const campos: (keyof DocumentosEntrada)[] = [
            "factura",
            "ordenCompra",
            "actaRecepcion",
        ];
        const faltantes: string[] = [];

        for (const campo of campos) {
            const doc = body[campo];
            if (!doc || !doc.contenido?.trim()) {
                faltantes.push(campo);
            } else if (doc.tipo !== "texto" && doc.tipo !== "imagen") {
                return NextResponse.json(
                    {
                        success: false,
                        error: `El campo "${campo}" tiene un tipo inválido: "${doc.tipo}". Debe ser "texto" o "imagen".`,
                    },
                    { status: 400 }
                );
            }
        }

        if (faltantes.length > 0) {
            return NextResponse.json(
                {
                    success: false,
                    error: `Faltan los siguientes campos en el body: ${faltantes.join(", ")}.`,
                    detalles:
                        "Se requieren los 3 documentos con su tipo y contenido.",
                },
                { status: 400 }
            );
        }

        // =========================================================================
        // 3. Llamar al LLM para extracción estructurada (multimodal)
        // =========================================================================
        const tiposInfo = campos
            .map((c) => `${c}: ${body[c].tipo === "imagen" ? "📷" : "📄"}`)
            .join(" | ");
        console.log(
            `[extract] 🚀 Iniciando extracción LLM multimodal... (${tiposInfo})`
        );

        const datosExtraidos = await extraerDatosFinancieros(body);

        console.log("[extract] ✅ Extracción LLM completada exitosamente.");

        // =========================================================================
        // 4. Respuesta exitosa
        // =========================================================================
        return NextResponse.json(
            {
                success: true,
                data: datosExtraidos,
            },
            { status: 200 }
        );
    } catch (error: unknown) {
        const mensaje =
            error instanceof Error ? error.message : "Error interno del servidor";
        console.error(`[extract] ❌ Error: ${mensaje}`);

        const isAuthError =
            mensaje.includes("autenticación") || mensaje.includes("API Key");
        const isRateLimit = mensaje.includes("límite");
        const isServiceDown = mensaje.includes("no disponible");

        let statusCode = 500;
        if (isAuthError) statusCode = 401;
        else if (isRateLimit) statusCode = 429;
        else if (isServiceDown) statusCode = 503;

        return NextResponse.json(
            {
                success: false,
                error: mensaje,
            },
            { status: statusCode }
        );
    }
}
