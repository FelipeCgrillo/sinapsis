/**
 * docx-generator.ts
 *
 * Genera la Resolución de Pago en formato Word (.docx) editable,
 * siguiendo la estructura oficial de resoluciones exentas del
 * sector público chileno / Ejército de Chile.
 *
 * Librería: docx (dolanmiu/docx)
 * Formato: OOXML (.docx) compatible con Microsoft Word y LibreOffice
 */

import {
    Document,
    Packer,
    Paragraph,
    TextRun,
    AlignmentType,
    HeadingLevel,
    BorderStyle,
    TableRow,
    TableCell,
    Table,
    WidthType,
    ShadingType,
} from "docx";
import type { ExtraccionCompleta, ResultadoValidacion } from "@/lib/schemas";

// =============================================================================
// HELPERS
// =============================================================================

function formatoCLP(monto: number): string {
    return `$${monto.toLocaleString("es-CL")}`;
}

function montoEnTexto(monto: number): string {
    return `$${monto.toLocaleString("es-CL")}.- (pesos chilenos)`;
}

function formatoFechaLarga(fechaISO: string): string {
    if (!fechaISO) return "(sin fecha)";
    const meses = [
        "enero", "febrero", "marzo", "abril", "mayo", "junio",
        "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
    ];
    try {
        const [anio, mes, dia] = fechaISO.split("-");
        return `${parseInt(dia)} de ${meses[parseInt(mes) - 1]} de ${anio}`;
    } catch {
        return fechaISO;
    }
}

function fechaHoy(): string {
    const meses = [
        "enero", "febrero", "marzo", "abril", "mayo", "junio",
        "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
    ];
    const ahora = new Date();
    return `${ahora.getDate()} de ${meses[ahora.getMonth()]} de ${ahora.getFullYear()}`;
}

/** Párrafo vacío (espaciador) */
function espaciador(size: number = 100): Paragraph {
    return new Paragraph({ spacing: { after: size } });
}

/** Línea separadora */
function lineaSeparadora(): Paragraph {
    return new Paragraph({
        border: {
            bottom: { style: BorderStyle.SINGLE, size: 1, color: "999999" },
        },
        spacing: { after: 200 },
    });
}

// =============================================================================
// FUNCIÓN PRINCIPAL
// =============================================================================

export async function generarResolucionDOCX(
    datos: ExtraccionCompleta,
    validacion: ResultadoValidacion,
    numeroResolucion: string = "001-2026"
): Promise<Buffer> {
    const esAprobado = validacion.estado === "APROBADO";

    const doc = new Document({
        styles: {
            default: {
                document: {
                    run: { font: "Calibri", size: 22 }, // 11pt
                },
            },
        },
        sections: [
            {
                properties: {
                    page: {
                        margin: { top: 1200, right: 1200, bottom: 1000, left: 1200 },
                    },
                },
                children: [
                    // ═══════════════════════════════════════════════════════════════
                    // 1. ENCABEZADO INSTITUCIONAL
                    // ═══════════════════════════════════════════════════════════════
                    new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 40 },
                        children: [
                            new TextRun({ text: "REPÚBLICA DE CHILE", bold: true, size: 24, font: "Calibri" }),
                        ],
                    }),
                    new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 40 },
                        children: [
                            new TextRun({ text: "EJÉRCITO DE CHILE", bold: true, size: 22 }),
                        ],
                    }),
                    new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 200 },
                        children: [
                            new TextRun({ text: "Departamento de Finanzas", size: 20, color: "666666" }),
                        ],
                    }),

                    lineaSeparadora(),

                    // ═══════════════════════════════════════════════════════════════
                    // 2. NÚMERO Y FECHA
                    // ═══════════════════════════════════════════════════════════════
                    new Paragraph({
                        spacing: { after: 80 },
                        children: [
                            new TextRun({
                                text: `RESOLUCIÓN EXENTA N° ${numeroResolucion}`,
                                bold: true,
                                size: 26,
                            }),
                        ],
                    }),
                    new Paragraph({
                        spacing: { after: 200 },
                        children: [
                            new TextRun({ text: `Santiago de Chile, ${fechaHoy()}`, size: 22 }),
                        ],
                    }),

                    // ═══════════════════════════════════════════════════════════════
                    // 3. MATERIA
                    // ═══════════════════════════════════════════════════════════════
                    new Paragraph({
                        spacing: { after: 80 },
                        children: [
                            new TextRun({ text: "MATERIA: ", bold: true, size: 22 }),
                        ],
                    }),
                    new Paragraph({
                        spacing: { after: 200 },
                        children: [
                            new TextRun({
                                text: `${esAprobado ? "Aprueba" : "Observa con reparo"} pago de Factura N° ${datos.factura.numeroFactura} a ${datos.factura.razonSocial || "(Proveedor)"}, RUT ${datos.factura.rutProveedor || "(sin RUT)"}, por concepto de ${datos.factura.descripcionServicio || "(servicio no informado)"}.`,
                                size: 22,
                            }),
                        ],
                    }),

                    lineaSeparadora(),

                    // ═══════════════════════════════════════════════════════════════
                    // 4. VISTOS
                    // ═══════════════════════════════════════════════════════════════
                    new Paragraph({
                        heading: HeadingLevel.HEADING_2,
                        spacing: { after: 100 },
                        children: [
                            new TextRun({ text: "VISTOS:", bold: true, size: 24 }),
                        ],
                    }),
                    new Paragraph({
                        spacing: { after: 200 },
                        children: [
                            new TextRun({
                                text: "Lo dispuesto en la Ley N° 19.880, que establece Bases de los Procedimientos Administrativos que rigen los Actos de los Órganos de la Administración del Estado; la Ley N° 19.886, de Bases sobre Contratos Administrativos de Suministro y Prestación de Servicios, y su Reglamento contenido en el Decreto Supremo N° 250 de 2004 del Ministerio de Hacienda; la Ley N° 19.983 que regula la transferencia y otorga mérito ejecutivo a la copia de la factura; la Ley N° 21.131 que establece pago a proveedores en un plazo máximo de 30 días en el Sector Público; la Resolución N° 1.600 de 2008 de la Contraloría General de la República, que fija normas sobre exención del trámite de toma de razón; y los demás antecedentes que obran en poder de esta institución.",
                                size: 20,
                            }),
                        ],
                    }),

                    // ═══════════════════════════════════════════════════════════════
                    // 5. CONSIDERANDO
                    // ═══════════════════════════════════════════════════════════════
                    new Paragraph({
                        heading: HeadingLevel.HEADING_2,
                        spacing: { after: 100 },
                        children: [
                            new TextRun({ text: "CONSIDERANDO:", bold: true, size: 24 }),
                        ],
                    }),

                    // C1: Orden de Compra
                    new Paragraph({
                        spacing: { after: 100 },
                        indent: { left: 400 },
                        children: [
                            new TextRun({ text: "1. ", bold: true, size: 20 }),
                            new TextRun({
                                text: `Que, mediante Orden de Compra N° ${datos.ordenCompra.numeroOC}${datos.ordenCompra.fechaOC ? `, de fecha ${formatoFechaLarga(datos.ordenCompra.fechaOC)}` : ""}, se aprobó la contratación de "${datos.factura.descripcionServicio || "(servicio)"}" con el proveedor ${datos.factura.razonSocial || "(Proveedor)"}, RUT ${datos.factura.rutProveedor || "(sin RUT)"}, por un monto total de ${montoEnTexto(datos.ordenCompra.montoTotal)}.`,
                                size: 20,
                            }),
                        ],
                    }),

                    // C2: Factura
                    new Paragraph({
                        spacing: { after: 100 },
                        indent: { left: 400 },
                        children: [
                            new TextRun({ text: "2. ", bold: true, size: 20 }),
                            new TextRun({
                                text: `Que, el proveedor emitió la Factura N° ${datos.factura.numeroFactura}${datos.factura.fechaEmision ? `, de fecha ${formatoFechaLarga(datos.factura.fechaEmision)}` : ""}, por la suma de ${montoEnTexto(datos.factura.montoTotal)} (Neto: ${formatoCLP(datos.factura.montoNeto)} + IVA: ${formatoCLP(datos.factura.iva)}), correspondiente al servicio/producto contratado.`,
                                size: 20,
                            }),
                        ],
                    }),

                    // C3: Acta de Recepción
                    new Paragraph({
                        spacing: { after: 100 },
                        indent: { left: 400 },
                        children: [
                            new TextRun({ text: "3. ", bold: true, size: 20 }),
                            new TextRun({
                                text: `Que, el bien o servicio fue recibido a conformidad según consta en Acta de Recepción N° ${datos.actaRecepcion.numeroActa || "(sin número)"}${datos.actaRecepcion.fechaRecepcion ? `, de fecha ${formatoFechaLarga(datos.actaRecepcion.fechaRecepcion)}` : ""}, por un monto recepcionado de ${montoEnTexto(datos.actaRecepcion.montoRecepcionado)}. Estado de recepción: ${datos.actaRecepcion.conforme ? "CONFORME" : "NO CONFORME"}.`,
                                size: 20,
                            }),
                        ],
                    }),

                    // C4: Validación
                    new Paragraph({
                        spacing: { after: 100 },
                        indent: { left: 400 },
                        children: [
                            new TextRun({ text: "4. ", bold: true, size: 20 }),
                            new TextRun({
                                text: esAprobado
                                    ? "Que, la validación cruzada de los tres documentos ha resultado APROBADA, verificándose la coincidencia del RUT del proveedor, la consistencia de los montos entre la factura, orden de compra y acta de recepción, y la recepción conforme."
                                    : `Que, la validación cruzada de los tres documentos ha resultado CON REPARO, detectándose ${validacion.discrepancias.length} discrepancia(s) que se detallan en la sección de validación de la presente resolución.`,
                                size: 20,
                            }),
                        ],
                    }),

                    // C5: Imputación
                    new Paragraph({
                        spacing: { after: 200 },
                        indent: { left: 400 },
                        children: [
                            new TextRun({ text: "5. ", bold: true, size: 20 }),
                            new TextRun({
                                text: `Que, el Departamento de Finanzas ha verificado la disponibilidad presupuestaria con cargo a la imputación presupuestaria: ${datos.ordenCompra.itemPresupuestario || "(no informado)"}.`,
                                size: 20,
                            }),
                        ],
                    }),

                    lineaSeparadora(),

                    // ═══════════════════════════════════════════════════════════════
                    // 6. RESUELVO
                    // ═══════════════════════════════════════════════════════════════
                    new Paragraph({
                        heading: HeadingLevel.HEADING_2,
                        spacing: { after: 100 },
                        children: [
                            new TextRun({ text: "RESUELVO:", bold: true, size: 24 }),
                        ],
                    }),

                    // Contenido del RESUELVO según estado
                    ...(esAprobado
                        ? [
                            new Paragraph({
                                spacing: { after: 100 },
                                indent: { left: 400 },
                                children: [
                                    new TextRun({ text: "1. AUTORÍZASE ", bold: true, size: 20 }),
                                    new TextRun({
                                        text: `el pago al proveedor ${datos.factura.razonSocial || "(Proveedor)"}, RUT ${datos.factura.rutProveedor || "(sin RUT)"}, por el monto de ${montoEnTexto(datos.factura.montoTotal)}, correspondiente a la Factura N° ${datos.factura.numeroFactura}.`,
                                        size: 20,
                                    }),
                                ],
                            }),
                            new Paragraph({
                                spacing: { after: 100 },
                                indent: { left: 400 },
                                children: [
                                    new TextRun({ text: "2. IMPÚTASE ", bold: true, size: 20 }),
                                    new TextRun({
                                        text: `el gasto a la cuenta presupuestaria: ${datos.ordenCompra.itemPresupuestario || "(no informado)"}.`,
                                        size: 20,
                                    }),
                                ],
                            }),
                            new Paragraph({
                                spacing: { after: 200 },
                                indent: { left: 400 },
                                children: [
                                    new TextRun({ text: "3. REMÍTASE ", bold: true, size: 20 }),
                                    new TextRun({
                                        text: "el presente acto administrativo al Departamento de Finanzas para los fines pertinentes.",
                                        size: 20,
                                    }),
                                ],
                            }),
                        ]
                        : [
                            new Paragraph({
                                spacing: { after: 100 },
                                indent: { left: 400 },
                                children: [
                                    new TextRun({ text: "1. OBSÉRVASE CON REPARO ", bold: true, size: 20, color: "CC0000" }),
                                    new TextRun({
                                        text: `el pago de la Factura N° ${datos.factura.numeroFactura} del proveedor ${datos.factura.razonSocial || "(Proveedor)"}, RUT ${datos.factura.rutProveedor || "(sin RUT)"}, por el monto de ${montoEnTexto(datos.factura.montoTotal)}, en razón de las siguientes discrepancias:`,
                                        size: 20,
                                    }),
                                ],
                            }),
                            ...validacion.discrepancias.map(
                                (disc, i) =>
                                    new Paragraph({
                                        spacing: { after: 60 },
                                        indent: { left: 800 },
                                        children: [
                                            new TextRun({ text: `${i + 1}. `, bold: true, size: 20, color: "CC0000" }),
                                            new TextRun({ text: disc, size: 20 }),
                                        ],
                                    })
                            ),
                            espaciador(100),
                            new Paragraph({
                                spacing: { after: 200 },
                                indent: { left: 400 },
                                children: [
                                    new TextRun({ text: "2. DEVUÉLVASE ", bold: true, size: 20 }),
                                    new TextRun({
                                        text: "la documentación al área requirente para subsanar las observaciones detectadas antes de proceder al pago.",
                                        size: 20,
                                    }),
                                ],
                            }),
                        ]),

                    // ═══════════════════════════════════════════════════════════════
                    // 7. TABLA DE VALIDACIÓN CRUZADA
                    // ═══════════════════════════════════════════════════════════════
                    lineaSeparadora(),

                    new Paragraph({
                        spacing: { after: 100 },
                        children: [
                            new TextRun({ text: "DETALLE DE VALIDACIÓN CRUZADA", bold: true, size: 22 }),
                        ],
                    }),

                    crearTablaValidacion(validacion, datos),

                    espaciador(200),

                    // ═══════════════════════════════════════════════════════════════
                    // 8. RESUMEN FINANCIERO
                    // ═══════════════════════════════════════════════════════════════
                    new Paragraph({
                        spacing: { after: 100 },
                        children: [
                            new TextRun({ text: "RESUMEN FINANCIERO", bold: true, size: 22 }),
                        ],
                    }),

                    crearTablaFinanciera(datos),

                    espaciador(200),

                    // ═══════════════════════════════════════════════════════════════
                    // 9. CIERRE FORMAL
                    // ═══════════════════════════════════════════════════════════════
                    lineaSeparadora(),

                    new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 600 },
                        children: [
                            new TextRun({ text: "ANÓTESE, COMUNÍQUESE Y ARCHÍVESE.", bold: true, size: 22 }),
                        ],
                    }),

                    // Línea de firma
                    new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 40 },
                        children: [
                            new TextRun({ text: "________________________", size: 22 }),
                        ],
                    }),
                    new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 20 },
                        children: [
                            new TextRun({ text: "Autoridad Competente", size: 20 }),
                        ],
                    }),
                    new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 20 },
                        children: [
                            new TextRun({ text: "Departamento de Finanzas", size: 18, color: "666666" }),
                        ],
                    }),
                    new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 200 },
                        children: [
                            new TextRun({ text: "Ejército de Chile", size: 18, color: "666666" }),
                        ],
                    }),

                    // Pie de página
                    lineaSeparadora(),
                    new Paragraph({
                        alignment: AlignmentType.LEFT,
                        children: [
                            new TextRun({
                                text: `Documento generado automáticamente — Sistema SINAPSIS — ${new Date().toISOString().split("T")[0]}`,
                                size: 14,
                                color: "999999",
                                italics: true,
                            }),
                        ],
                    }),
                ],
            },
        ],
    });

    const buffer = await Packer.toBuffer(doc);
    console.log(`[docx-generator] Resolución Word generada: ${(buffer.length / 1024).toFixed(1)} KB`);
    return Buffer.from(buffer);
}

// =============================================================================
// TABLAS
// =============================================================================

function crearTablaValidacion(
    validacion: ResultadoValidacion,
    datos: ExtraccionCompleta
): Table {
    const checks: [string, boolean][] = [
        ["RUT del proveedor coincide en los 3 documentos", validacion.checks.rutCoincide],
        ["Montos de factura coinciden con acta de recepción", validacion.checks.montosCoinciden],
        ["Monto de Orden de Compra es suficiente", validacion.checks.montoOCSuficiente],
        ["Descripción del servicio es consistente", validacion.checks.descripcionConsistente],
        ["Recepción conforme del bien o servicio", validacion.checks.recepcionConforme],
    ];

    const filas = checks.map(
        ([label, valor]) =>
            new TableRow({
                children: [
                    new TableCell({
                        width: { size: 70, type: WidthType.PERCENTAGE },
                        children: [
                            new Paragraph({
                                children: [new TextRun({ text: label, size: 18 })],
                            }),
                        ],
                    }),
                    new TableCell({
                        width: { size: 30, type: WidthType.PERCENTAGE },
                        children: [
                            new Paragraph({
                                alignment: AlignmentType.CENTER,
                                children: [
                                    new TextRun({
                                        text: valor ? "APROBADO" : "FALLIDO",
                                        bold: true,
                                        size: 18,
                                        color: valor ? "228B22" : "CC0000",
                                    }),
                                ],
                            }),
                        ],
                    }),
                ],
            })
    );

    // Fila de imputación presupuestaria
    filas.push(
        new TableRow({
            children: [
                new TableCell({
                    width: { size: 70, type: WidthType.PERCENTAGE },
                    shading: { type: ShadingType.SOLID, color: "F1F5F9" },
                    children: [
                        new Paragraph({
                            children: [
                                new TextRun({ text: "Imputación presupuestaria", bold: true, size: 18 }),
                            ],
                        }),
                    ],
                }),
                new TableCell({
                    width: { size: 30, type: WidthType.PERCENTAGE },
                    shading: { type: ShadingType.SOLID, color: "F1F5F9" },
                    children: [
                        new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [
                                new TextRun({
                                    text: datos.ordenCompra.itemPresupuestario || "(no informado)",
                                    size: 18,
                                }),
                            ],
                        }),
                    ],
                }),
            ],
        })
    );

    return new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
            // Header
            new TableRow({
                children: [
                    new TableCell({
                        width: { size: 70, type: WidthType.PERCENTAGE },
                        shading: { type: ShadingType.SOLID, color: "1E3A8A" },
                        children: [
                            new Paragraph({
                                children: [
                                    new TextRun({ text: "Verificación", bold: true, size: 18, color: "FFFFFF" }),
                                ],
                            }),
                        ],
                    }),
                    new TableCell({
                        width: { size: 30, type: WidthType.PERCENTAGE },
                        shading: { type: ShadingType.SOLID, color: "1E3A8A" },
                        children: [
                            new Paragraph({
                                alignment: AlignmentType.CENTER,
                                children: [
                                    new TextRun({ text: "Estado", bold: true, size: 18, color: "FFFFFF" }),
                                ],
                            }),
                        ],
                    }),
                ],
            }),
            ...filas,
        ],
    });
}

function crearTablaFinanciera(datos: ExtraccionCompleta): Table {
    const montos: [string, string][] = [
        ["Monto Neto Factura", formatoCLP(datos.factura.montoNeto)],
        ["IVA (19%)", formatoCLP(datos.factura.iva)],
        ["Total Factura", formatoCLP(datos.factura.montoTotal)],
        ["Total Orden de Compra", formatoCLP(datos.ordenCompra.montoTotal)],
        ["Total Recepcionado", formatoCLP(datos.actaRecepcion.montoRecepcionado)],
    ];

    const filas = montos.map(
        ([label, valor]) =>
            new TableRow({
                children: [
                    new TableCell({
                        width: { size: 60, type: WidthType.PERCENTAGE },
                        children: [
                            new Paragraph({ children: [new TextRun({ text: label, size: 18 })] }),
                        ],
                    }),
                    new TableCell({
                        width: { size: 40, type: WidthType.PERCENTAGE },
                        children: [
                            new Paragraph({
                                alignment: AlignmentType.RIGHT,
                                children: [new TextRun({ text: valor, bold: true, size: 18 })],
                            }),
                        ],
                    }),
                ],
            })
    );

    // Fila TOTAL
    filas.push(
        new TableRow({
            children: [
                new TableCell({
                    width: { size: 60, type: WidthType.PERCENTAGE },
                    shading: { type: ShadingType.SOLID, color: "1E3A8A" },
                    children: [
                        new Paragraph({
                            children: [
                                new TextRun({ text: "TOTAL A PAGAR", bold: true, size: 20, color: "FFFFFF" }),
                            ],
                        }),
                    ],
                }),
                new TableCell({
                    width: { size: 40, type: WidthType.PERCENTAGE },
                    shading: { type: ShadingType.SOLID, color: "1E3A8A" },
                    children: [
                        new Paragraph({
                            alignment: AlignmentType.RIGHT,
                            children: [
                                new TextRun({
                                    text: formatoCLP(datos.factura.montoTotal),
                                    bold: true,
                                    size: 20,
                                    color: "FFFFFF",
                                }),
                            ],
                        }),
                    ],
                }),
            ],
        })
    );

    return new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: filas,
    });
}
