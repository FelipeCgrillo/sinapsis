/**
 * API Route: POST /api/validate
 *
 * Recibe los datos extraídos por el LLM (Paso 3) y ejecuta la
 * validación cruzada usando funciones TypeScript puras (sin LLM).
 *
 * Body esperado (JSON): ExtraccionCompleta
 * {
 *   "factura": { rutProveedor, montoTotal, ... },
 *   "ordenCompra": { rutProveedor, montoTotal, ... },
 *   "actaRecepcion": { rutProveedor, montoRecepcionado, ... }
 * }
 *
 * Respuesta exitosa:
 * {
 *   "success": true,
 *   "data": {
 *     "validacion": { estado, checks, discrepancias, fechaValidacion },
 *     "datosValidados": { factura, ordenCompra, actaRecepcion }
 *   }
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { ExtraccionCompletaSchema } from "@/lib/schemas";
import {
    validarYEmpaquetar,
    type ResultadoValidacionCompleto,
} from "@/lib/validator";
import type { ApiResponse } from "@/types";

export async function POST(
    request: NextRequest
): Promise<NextResponse<ApiResponse<ResultadoValidacionCompleto>>> {
    try {
        // =========================================================================
        // 1. Parsear el body JSON
        // =========================================================================
        let body: unknown;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json(
                {
                    success: false,
                    error:
                        "El body de la petición no es un JSON válido. Envíe el objeto con factura, ordenCompra y actaRecepcion.",
                },
                { status: 400 }
            );
        }

        // =========================================================================
        // 2. Validar estructura con Zod (datos del Paso 3)
        // =========================================================================
        const parseResult = ExtraccionCompletaSchema.safeParse(body);

        if (!parseResult.success) {
            const erroresZod = parseResult.error.issues.map(
                (e) => `${e.path.join(".")}: ${e.message}`
            );

            return NextResponse.json(
                {
                    success: false,
                    error:
                        "Los datos enviados no cumplen con el esquema esperado (ExtraccionCompleta).",
                    detalles: erroresZod.join("; "),
                },
                { status: 400 }
            );
        }

        // =========================================================================
        // 3. Ejecutar validación cruzada
        // =========================================================================
        console.log("[validate] ⚖️ Ejecutando validación cruzada de documentos...");

        const resultado = validarYEmpaquetar(parseResult.data);

        console.log(
            `[validate] Resultado: ${resultado.validacion.estado} (${resultado.validacion.discrepancias.length} discrepancias)`
        );

        // =========================================================================
        // 4. Respuesta
        // =========================================================================
        return NextResponse.json(
            {
                success: true,
                data: resultado,
            },
            { status: 200 }
        );
    } catch (error: unknown) {
        const mensaje =
            error instanceof Error ? error.message : "Error interno del servidor";
        console.error(`[validate] ❌ Error: ${mensaje}`);

        return NextResponse.json(
            {
                success: false,
                error: "Error interno durante la validación cruzada.",
                detalles: mensaje,
            },
            { status: 500 }
        );
    }
}
