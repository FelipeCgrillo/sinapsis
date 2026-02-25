/**
 * API Route: POST /api/generate
 *
 * Genera el PDF de la Resolución de Pago con los datos validados.
 *
 * Body esperado (JSON):
 * {
 *   "datosValidados": { factura, ordenCompra, actaRecepcion },
 *   "validacion": { estado, checks, discrepancias, fechaValidacion }
 * }
 *
 * Respuesta: application/pdf como descarga directa.
 */

import { NextRequest, NextResponse } from "next/server";
import { ExtraccionCompletaSchema, ResultadoValidacionSchema } from "@/lib/schemas";
import { generarResolucionPDF } from "@/lib/pdf-generator";
import { z } from "zod";

/** Esquema del body para este endpoint */
const GenerateBodySchema = z.object({
    datosValidados: ExtraccionCompletaSchema,
    validacion: ResultadoValidacionSchema,
});

export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        // =========================================================================
        // 1. Parsear y validar el body
        // =========================================================================
        let body: unknown;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json(
                { success: false, error: "El body no es un JSON válido." },
                { status: 400 }
            );
        }

        const parseResult = GenerateBodySchema.safeParse(body);
        if (!parseResult.success) {
            const errores = parseResult.error.issues.map(
                (e) => `${e.path.join(".")}: ${e.message}`
            );
            return NextResponse.json(
                {
                    success: false,
                    error: "Datos inválidos para generar la resolución.",
                    detalles: errores.join("; "),
                },
                { status: 400 }
            );
        }

        const { datosValidados, validacion } = parseResult.data;

        // =========================================================================
        // 2. Generar el PDF
        // =========================================================================
        console.log("[generate] 📄 Generando PDF de Resolución de Pago...");

        // Generar número de resolución basado en timestamp
        const ahora = new Date();
        const numResolucion = `${String(ahora.getMonth() + 1).padStart(2, "0")}${String(ahora.getDate()).padStart(2, "0")}-${ahora.getFullYear()}`;

        const pdfBytes = await generarResolucionPDF(
            datosValidados,
            validacion,
            numResolucion
        );

        console.log(
            `[generate] ✅ PDF generado: ${(pdfBytes.length / 1024).toFixed(1)} KB`
        );

        // =========================================================================
        // 3. Retornar el PDF con headers correctos
        // =========================================================================
        const nombreArchivo = `Resolucion_Pago_${numResolucion}.pdf`;

        return new NextResponse(Buffer.from(pdfBytes), {
            status: 200,
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="${nombreArchivo}"`,
                "Content-Length": String(pdfBytes.length),
            },
        });
    } catch (error: unknown) {
        const mensaje =
            error instanceof Error ? error.message : "Error interno del servidor";
        console.error(`[generate] ❌ Error: ${mensaje}`);

        return NextResponse.json(
            {
                success: false,
                error: "Error al generar el PDF de la Resolución de Pago.",
                detalles: mensaje,
            },
            { status: 500 }
        );
    }
}
