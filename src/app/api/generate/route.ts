/**
 * API Route: POST /api/generate
 *
 * Genera la Resolución de Pago en formato Word (.docx) o PDF.
 *
 * Query params:
 *   ?format=docx  (default) — Documento Word editable
 *   ?format=pdf   — PDF estático
 *
 * Body esperado (JSON):
 * {
 *   "datosValidados": { factura, ordenCompra, actaRecepcion },
 *   "validacion": { estado, checks, discrepancias, fechaValidacion }
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { ExtraccionCompletaSchema, ResultadoValidacionSchema } from "@/lib/schemas";
import { generarResolucionPDF } from "@/lib/pdf-generator";
import { generarResolucionDOCX } from "@/lib/docx-generator";
import { z } from "zod";

/** Esquema del body para este endpoint */
const GenerateBodySchema = z.object({
    datosValidados: ExtraccionCompletaSchema,
    validacion: ResultadoValidacionSchema,
});

export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        // =====================================================================
        // 1. Determinar formato de salida (docx por defecto)
        // =====================================================================
        const format = request.nextUrl.searchParams.get("format") || "docx";
        const esWord = format !== "pdf";

        // =====================================================================
        // 2. Parsear y validar el body
        // =====================================================================
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

        // =====================================================================
        // 3. Generar número de resolución
        // =====================================================================
        const ahora = new Date();
        const numResolucion = `${String(ahora.getMonth() + 1).padStart(2, "0")}${String(ahora.getDate()).padStart(2, "0")}-${ahora.getFullYear()}`;

        // =====================================================================
        // 4. Generar documento en el formato solicitado
        // =====================================================================
        if (esWord) {
            console.log("[generate] 📝 Generando Word (.docx) de Resolución de Pago...");
            const docxBuffer = await generarResolucionDOCX(datosValidados, validacion, numResolucion);
            console.log(`[generate] ✅ Word generado: ${(docxBuffer.length / 1024).toFixed(1)} KB`);

            const nombreArchivo = `Resolucion_Pago_SINAPSIS_${numResolucion}.docx`;
            return new NextResponse(new Uint8Array(docxBuffer), {
                status: 200,
                headers: {
                    "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                    "Content-Disposition": `attachment; filename="${nombreArchivo}"`,
                    "Content-Length": String(docxBuffer.length),
                },
            });
        } else {
            console.log("[generate] 📄 Generando PDF de Resolución de Pago...");
            const pdfBytes = await generarResolucionPDF(datosValidados, validacion, numResolucion);
            console.log(`[generate] ✅ PDF generado: ${(pdfBytes.length / 1024).toFixed(1)} KB`);

            const nombreArchivo = `Resolucion_Pago_SINAPSIS_${numResolucion}.pdf`;
            return new NextResponse(Buffer.from(pdfBytes), {
                status: 200,
                headers: {
                    "Content-Type": "application/pdf",
                    "Content-Disposition": `attachment; filename="${nombreArchivo}"`,
                    "Content-Length": String(pdfBytes.length),
                },
            });
        }
    } catch (error: unknown) {
        const mensaje = error instanceof Error ? error.message : "Error interno del servidor";
        console.error(`[generate] ❌ Error: ${mensaje}`);

        return NextResponse.json(
            {
                success: false,
                error: "Error al generar la Resolución de Pago.",
                detalles: mensaje,
            },
            { status: 500 }
        );
    }
}
