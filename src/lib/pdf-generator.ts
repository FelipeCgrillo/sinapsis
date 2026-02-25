/**
 * pdf-generator.ts
 *
 * Genera el PDF de Resolucion de Pago siguiendo el formato oficial
 * de resoluciones exentas del sector publico chileno / Ejercito de Chile.
 *
 * Estructura:
 *   1. Encabezado institucional (Republica de Chile / institucion)
 *   2. Numero y fecha de resolucion
 *   3. Materia (descripcion del pago)
 *   4. VISTOS: Marco legal aplicable
 *   5. CONSIDERANDO: Antecedentes documentales (OC, Factura, Acta)
 *   6. RESUELVO: Autorizacion de pago + imputacion presupuestaria
 *   7. Detalle de validacion cruzada
 *   8. Cierre formal: ANOTESE, COMUNIQUESE Y ARCHIVESE
 *
 * NOTA: Se usa codificacion WinAnsi (sin tildes ni caracteres especiales)
 * porque pdf-lib con fuentes estandar no soporta Unicode completo.
 */

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { ExtraccionCompleta, ResultadoValidacion } from "@/lib/schemas";

// =============================================================================
// CONSTANTES DE DISENO
// =============================================================================

const MARGEN_X = 65;
const MARGEN_DERECHO = 65;
const ANCHO_PAGINA = 595.28; // A4
const ALTO_PAGINA = 841.89;  // A4
const ANCHO_CONTENIDO = ANCHO_PAGINA - MARGEN_X - MARGEN_DERECHO;
const INTERLINEADO = 14;
const INTERLINEADO_PARRAFO = 20;
const LIMITE_INFERIOR = 80; // Margen inferior antes de nueva pagina

const COLOR_NEGRO = rgb(0, 0, 0);
const COLOR_GRIS = rgb(0.35, 0.35, 0.35);
const COLOR_LINEA = rgb(0.6, 0.6, 0.6);
const COLOR_VERDE = rgb(0.1, 0.45, 0.1);
const COLOR_ROJO = rgb(0.7, 0.12, 0.12);

// =============================================================================
// FUNCIONES AUXILIARES
// =============================================================================

/** Formatea monto como CLP sin caracteres especiales */
function formatoCLP(monto: number): string {
    return `$${monto.toLocaleString("es-CL")}`;
}

/** Formatea monto en texto (para la parte resolutiva) */
function montoEnTexto(monto: number): string {
    return `$${monto.toLocaleString("es-CL")}.- (pesos chilenos)`;
}

/** Fecha ISO a formato dd de mes de yyyy */
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

/** Fecha actual en formato largo */
function fechaHoy(): string {
    const meses = [
        "enero", "febrero", "marzo", "abril", "mayo", "junio",
        "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
    ];
    const ahora = new Date();
    return `${ahora.getDate()} de ${meses[ahora.getMonth()]} de ${ahora.getFullYear()}`;
}

/** Wrap de texto largo a multiples lineas */
function wrapText(
    text: string,
    font: { widthOfTextAtSize: (t: string, s: number) => number },
    fontSize: number,
    maxWidth: number
): string[] {
    const palabras = text.split(" ");
    const lineas: string[] = [];
    let lineaActual = "";

    for (const palabra of palabras) {
        const test = lineaActual ? `${lineaActual} ${palabra}` : palabra;
        if (font.widthOfTextAtSize(test, fontSize) <= maxWidth) {
            lineaActual = test;
        } else {
            if (lineaActual) lineas.push(lineaActual);
            lineaActual = palabra;
        }
    }
    if (lineaActual) lineas.push(lineaActual);
    return lineas;
}

// =============================================================================
// FUNCION PRINCIPAL
// =============================================================================

export async function generarResolucionPDF(
    datos: ExtraccionCompleta,
    validacion: ResultadoValidacion,
    numeroResolucion: string = "001-2026"
): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    let pagina = pdfDoc.addPage([ANCHO_PAGINA, ALTO_PAGINA]);

    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

    let y = ALTO_PAGINA - 55;

    // Helper: verificar si necesitamos nueva pagina
    const checkNewPage = (needed: number = 40) => {
        if (y < LIMITE_INFERIOR + needed) {
            pagina = pdfDoc.addPage([ANCHO_PAGINA, ALTO_PAGINA]);
            y = ALTO_PAGINA - 55;
        }
    };

    // Helper: dibujar texto con wrap automatico
    const drawWrappedText = (
        text: string,
        x: number,
        size: number,
        font: typeof fontRegular,
        color = COLOR_NEGRO,
        indent: number = 0
    ): void => {
        const lineas = wrapText(text, font, size, ANCHO_CONTENIDO - indent);
        for (const linea of lineas) {
            checkNewPage();
            pagina.drawText(linea, { x: x + indent, y, size, font, color });
            y -= INTERLINEADO;
        }
    };

    // Helper: linea separadora
    const drawLine = (grosor: number = 0.8) => {
        pagina.drawLine({
            start: { x: MARGEN_X, y },
            end: { x: ANCHO_PAGINA - MARGEN_DERECHO, y },
            thickness: grosor,
            color: COLOR_LINEA,
        });
        y -= 15;
    };

    // =========================================================================
    // 1. ENCABEZADO INSTITUCIONAL
    // =========================================================================

    // Titulo: Republica de Chile
    const tituloRepublica = "REPUBLICA DE CHILE";
    const anchoRepublica = fontBold.widthOfTextAtSize(tituloRepublica, 11);
    pagina.drawText(tituloRepublica, {
        x: (ANCHO_PAGINA - anchoRepublica) / 2,
        y, size: 11, font: fontBold, color: COLOR_NEGRO,
    });
    y -= 16;

    // Institucion
    const institucion = "EJERCITO DE CHILE";
    const anchoInst = fontBold.widthOfTextAtSize(institucion, 10);
    pagina.drawText(institucion, {
        x: (ANCHO_PAGINA - anchoInst) / 2,
        y, size: 10, font: fontBold, color: COLOR_NEGRO,
    });
    y -= 14;

    // Departamento
    const depto = "Departamento de Finanzas";
    const anchoDepto = fontRegular.widthOfTextAtSize(depto, 9);
    pagina.drawText(depto, {
        x: (ANCHO_PAGINA - anchoDepto) / 2,
        y, size: 9, font: fontRegular, color: COLOR_GRIS,
    });
    y -= 20;

    drawLine(1.2);

    // =========================================================================
    // 2. NUMERO Y FECHA DE RESOLUCION
    // =========================================================================

    pagina.drawText(`RESOLUCION EXENTA N${String.fromCharCode(176)} ${numeroResolucion}`, {
        x: MARGEN_X, y, size: 12, font: fontBold, color: COLOR_NEGRO,
    });
    y -= 18;

    pagina.drawText(`Santiago de Chile, ${fechaHoy()}`, {
        x: MARGEN_X, y, size: 10, font: fontRegular, color: COLOR_NEGRO,
    });
    y -= INTERLINEADO_PARRAFO;

    // =========================================================================
    // 3. MATERIA
    // =========================================================================

    const estadoLabel = validacion.estado === "APROBADO"
        ? "APRUEBA"
        : "OBSERVA CON REPARO";

    const materia =
        `MATERIA: ${estadoLabel} PAGO DE FACTURA N${String.fromCharCode(176)} ${datos.factura.numeroFactura} ` +
        `A ${(datos.factura.razonSocial || "(Proveedor)").toUpperCase()} ` +
        `POR CONCEPTO DE ${(datos.factura.descripcionServicio || "(Servicio)").toUpperCase()}.`;

    pagina.drawText("MATERIA:", {
        x: MARGEN_X, y, size: 10, font: fontBold, color: COLOR_NEGRO,
    });
    y -= INTERLINEADO;

    const materiaTexto =
        `${estadoLabel} pago de Factura N${String.fromCharCode(176)} ${datos.factura.numeroFactura} ` +
        `a ${datos.factura.razonSocial || "(Proveedor)"}, RUT ${datos.factura.rutProveedor || "(sin RUT)"}, ` +
        `por concepto de ${datos.factura.descripcionServicio || "(servicio no informado)"}.`;

    drawWrappedText(materiaTexto, MARGEN_X, 10, fontRegular, COLOR_NEGRO, 0);
    y -= 10;

    drawLine();

    // =========================================================================
    // 4. VISTOS
    // =========================================================================

    pagina.drawText("VISTOS:", {
        x: MARGEN_X, y, size: 11, font: fontBold, color: COLOR_NEGRO,
    });
    y -= INTERLINEADO + 2;

    const vistos =
        "Lo dispuesto en la Ley N 19.880, que establece Bases de los Procedimientos " +
        "Administrativos que rigen los Actos de los Organos de la Administracion del Estado; " +
        "la Ley N 19.886, de Bases sobre Contratos Administrativos de Suministro y " +
        "Prestacion de Servicios, y su Reglamento contenido en el Decreto Supremo N 250 " +
        "de 2004 del Ministerio de Hacienda; la Ley N 19.983 que regula la transferencia " +
        "y otorga merito ejecutivo a la copia de la factura; la Ley N 21.131 que establece " +
        "pago a proveedores en un plazo maximo de 30 dias en el Sector Publico; " +
        "la Resolucion N 1.600 de 2008 de la Contraloria General de la Republica, " +
        "que fija normas sobre exencion del tramite de toma de razon; y los demas " +
        "antecedentes que obran en poder de esta institucion.";

    drawWrappedText(vistos, MARGEN_X, 9, fontRegular, COLOR_NEGRO, 0);
    y -= 10;

    // =========================================================================
    // 5. CONSIDERANDO
    // =========================================================================

    checkNewPage(80);
    pagina.drawText("CONSIDERANDO:", {
        x: MARGEN_X, y, size: 11, font: fontBold, color: COLOR_NEGRO,
    });
    y -= INTERLINEADO + 2;

    // Considerando 1: Orden de Compra
    const c1 =
        `1. Que, mediante Orden de Compra N ${datos.ordenCompra.numeroOC}` +
        `${datos.ordenCompra.fechaOC ? `, de fecha ${formatoFechaLarga(datos.ordenCompra.fechaOC)}` : ""}` +
        `, se aprobo la contratacion de "${datos.factura.descripcionServicio || "(servicio)"}" ` +
        `con el proveedor ${datos.factura.razonSocial || "(Proveedor)"}, ` +
        `RUT ${datos.factura.rutProveedor || "(sin RUT)"}, ` +
        `por un monto total de ${montoEnTexto(datos.ordenCompra.montoTotal)}.`;
    drawWrappedText(c1, MARGEN_X, 9, fontRegular, COLOR_NEGRO, 15);
    y -= 6;

    // Considerando 2: Factura
    checkNewPage(60);
    const c2 =
        `2. Que, el proveedor emitio la Factura N ${datos.factura.numeroFactura}` +
        `${datos.factura.fechaEmision ? `, de fecha ${formatoFechaLarga(datos.factura.fechaEmision)}` : ""}` +
        `, por la suma de ${montoEnTexto(datos.factura.montoTotal)} ` +
        `(Neto: ${formatoCLP(datos.factura.montoNeto)} + IVA: ${formatoCLP(datos.factura.iva)}), ` +
        `correspondiente al servicio/producto contratado.`;
    drawWrappedText(c2, MARGEN_X, 9, fontRegular, COLOR_NEGRO, 15);
    y -= 6;

    // Considerando 3: Acta de Recepcion
    checkNewPage(60);
    const c3 =
        `3. Que, el bien o servicio fue recibido a conformidad segun consta en ` +
        `Acta de Recepcion N ${datos.actaRecepcion.numeroActa || "(sin numero)"}` +
        `${datos.actaRecepcion.fechaRecepcion ? `, de fecha ${formatoFechaLarga(datos.actaRecepcion.fechaRecepcion)}` : ""}` +
        `, por un monto recepcionado de ${montoEnTexto(datos.actaRecepcion.montoRecepcionado)}` +
        `. Estado de recepcion: ${datos.actaRecepcion.conforme ? "CONFORME" : "NO CONFORME"}.`;
    drawWrappedText(c3, MARGEN_X, 9, fontRegular, COLOR_NEGRO, 15);
    y -= 6;

    // Considerando 4: Validacion
    checkNewPage(40);
    const c4 = validacion.estado === "APROBADO"
        ? "4. Que, la validacion cruzada de los tres documentos ha resultado APROBADA, " +
        "verificandose la coincidencia del RUT del proveedor, la consistencia de los " +
        "montos entre la factura, orden de compra y acta de recepcion, y la recepcion conforme."
        : `4. Que, la validacion cruzada de los tres documentos ha resultado CON REPARO, ` +
        `detectandose ${validacion.discrepancias.length} discrepancia(s) que se detallan ` +
        `en la seccion de validacion de la presente resolucion.`;
    drawWrappedText(c4, MARGEN_X, 9, fontRegular, COLOR_NEGRO, 15);
    y -= 6;

    // Considerando 5: Imputacion presupuestaria
    checkNewPage(30);
    const c5 =
        `5. Que, el Departamento de Finanzas ha verificado la disponibilidad presupuestaria ` +
        `con cargo a la imputacion presupuestaria: ${datos.ordenCompra.itemPresupuestario || "(no informado)"}.`;
    drawWrappedText(c5, MARGEN_X, 9, fontRegular, COLOR_NEGRO, 15);
    y -= 10;

    // =========================================================================
    // 6. RESUELVO
    // =========================================================================

    checkNewPage(100);
    drawLine();

    pagina.drawText("RESUELVO:", {
        x: MARGEN_X, y, size: 11, font: fontBold, color: COLOR_NEGRO,
    });
    y -= INTERLINEADO + 2;

    if (validacion.estado === "APROBADO") {
        // Resuelvo 1: Autorizacion de pago
        const r1 =
            `1. AUTORIZASE el pago al proveedor ${datos.factura.razonSocial || "(Proveedor)"}, ` +
            `RUT ${datos.factura.rutProveedor || "(sin RUT)"}, por el monto de ` +
            `${montoEnTexto(datos.factura.montoTotal)}, correspondiente a la ` +
            `Factura N ${datos.factura.numeroFactura}.`;
        drawWrappedText(r1, MARGEN_X, 9, fontBold, COLOR_NEGRO, 15);
        y -= 6;

        // Resuelvo 2: Imputacion
        checkNewPage(40);
        const r2 =
            `2. IMPUTASE el gasto a la cuenta presupuestaria: ` +
            `${datos.ordenCompra.itemPresupuestario || "(no informado)"}.`;
        drawWrappedText(r2, MARGEN_X, 9, fontRegular, COLOR_NEGRO, 15);
        y -= 6;

        // Resuelvo 3: Remitir
        checkNewPage(40);
        const r3 =
            "3. REMITASE el presente acto administrativo al Departamento de Finanzas " +
            "para los fines pertinentes.";
        drawWrappedText(r3, MARGEN_X, 9, fontRegular, COLOR_NEGRO, 15);
    } else {
        // REPARO
        const r1 =
            `1. OBSERVASE CON REPARO el pago de la Factura N ${datos.factura.numeroFactura} ` +
            `del proveedor ${datos.factura.razonSocial || "(Proveedor)"}, ` +
            `RUT ${datos.factura.rutProveedor || "(sin RUT)"}, por el monto de ` +
            `${montoEnTexto(datos.factura.montoTotal)}, en razon de las siguientes ` +
            `discrepancias detectadas en la validacion cruzada:`;
        drawWrappedText(r1, MARGEN_X, 9, fontBold, COLOR_ROJO, 15);
        y -= 6;

        for (let i = 0; i < validacion.discrepancias.length; i++) {
            checkNewPage(20);
            const disc = validacion.discrepancias[i];
            drawWrappedText(`   ${i + 1}. ${disc}`, MARGEN_X, 9, fontRegular, COLOR_NEGRO, 25);
            y -= 4;
        }
        y -= 6;

        checkNewPage(40);
        const r2 = "2. DEVUELVASE la documentacion al area requirente para subsanar " +
            "las observaciones detectadas antes de proceder al pago.";
        drawWrappedText(r2, MARGEN_X, 9, fontRegular, COLOR_NEGRO, 15);
    }

    y -= 10;

    // =========================================================================
    // 7. DETALLE DE VALIDACION CRUZADA
    // =========================================================================

    checkNewPage(120);
    drawLine();

    pagina.drawText("DETALLE DE VALIDACION CRUZADA", {
        x: MARGEN_X, y, size: 10, font: fontBold, color: COLOR_NEGRO,
    });
    y -= INTERLINEADO + 4;

    const checks: [string, boolean][] = [
        ["RUT del proveedor coincide en los 3 documentos", validacion.checks.rutCoincide],
        ["Montos de factura coinciden con acta de recepcion", validacion.checks.montosCoinciden],
        ["Monto de Orden de Compra es suficiente", validacion.checks.montoOCSuficiente],
        ["Descripcion del servicio es consistente", validacion.checks.descripcionConsistente],
        ["Recepcion conforme del bien o servicio", validacion.checks.recepcionConforme],
    ];

    for (const [label, valor] of checks) {
        checkNewPage(16);
        const indicador = valor ? "[OK]" : "[X]";
        const color = valor ? COLOR_VERDE : COLOR_ROJO;

        pagina.drawText(indicador, {
            x: MARGEN_X, y, size: 9, font: fontBold, color,
        });
        pagina.drawText(label, {
            x: MARGEN_X + 35, y, size: 9, font: fontRegular, color: COLOR_NEGRO,
        });
        y -= INTERLINEADO;
    }

    y -= 4;
    checkNewPage(20);
    pagina.drawText("Imputacion presupuestaria:", {
        x: MARGEN_X, y, size: 9, font: fontBold, color: COLOR_NEGRO,
    });
    pagina.drawText(datos.ordenCompra.itemPresupuestario || "(no informado)", {
        x: MARGEN_X + 150, y, size: 9, font: fontRegular, color: COLOR_NEGRO,
    });
    y -= INTERLINEADO_PARRAFO;

    // =========================================================================
    // 8. CUADRO RESUMEN FINANCIERO
    // =========================================================================

    checkNewPage(100);
    drawLine();

    pagina.drawText("RESUMEN FINANCIERO", {
        x: MARGEN_X, y, size: 10, font: fontBold, color: COLOR_NEGRO,
    });
    y -= INTERLINEADO + 4;

    const filas: [string, string][] = [
        ["Monto Neto Factura:", formatoCLP(datos.factura.montoNeto)],
        ["IVA (19%):", formatoCLP(datos.factura.iva)],
        ["Total Factura:", formatoCLP(datos.factura.montoTotal)],
        ["Total Orden de Compra:", formatoCLP(datos.ordenCompra.montoTotal)],
        ["Total Recepcionado:", formatoCLP(datos.actaRecepcion.montoRecepcionado)],
    ];

    for (const [label, valor] of filas) {
        checkNewPage(16);
        pagina.drawText(label, {
            x: MARGEN_X, y, size: 9, font: fontRegular, color: COLOR_NEGRO,
        });
        const anchoVal = fontBold.widthOfTextAtSize(valor, 9);
        pagina.drawText(valor, {
            x: MARGEN_X + ANCHO_CONTENIDO - anchoVal,
            y, size: 9, font: fontBold, color: COLOR_NEGRO,
        });
        y -= INTERLINEADO;
    }

    // Linea de total
    y -= 2;
    pagina.drawLine({
        start: { x: MARGEN_X + ANCHO_CONTENIDO - 180, y },
        end: { x: MARGEN_X + ANCHO_CONTENIDO, y },
        thickness: 1, color: COLOR_NEGRO,
    });
    y -= 16;

    checkNewPage(20);
    pagina.drawText("TOTAL A PAGAR:", {
        x: MARGEN_X, y, size: 11, font: fontBold, color: COLOR_NEGRO,
    });
    const totalStr = formatoCLP(datos.factura.montoTotal);
    const anchoTotal = fontBold.widthOfTextAtSize(totalStr, 11);
    pagina.drawText(totalStr, {
        x: MARGEN_X + ANCHO_CONTENIDO - anchoTotal,
        y, size: 11, font: fontBold, color: COLOR_NEGRO,
    });
    y -= INTERLINEADO_PARRAFO + 5;

    // =========================================================================
    // 9. CIERRE FORMAL
    // =========================================================================

    checkNewPage(60);
    drawLine(1.2);

    const cierre = "ANOTESE, COMUNIQUESE Y ARCHIVESE.";
    const anchoCierre = fontBold.widthOfTextAtSize(cierre, 10);
    pagina.drawText(cierre, {
        x: (ANCHO_PAGINA - anchoCierre) / 2,
        y, size: 10, font: fontBold, color: COLOR_NEGRO,
    });
    y -= 50;

    // Linea de firma
    checkNewPage(60);
    const lineaFirmaX = ANCHO_PAGINA / 2 - 80;
    pagina.drawLine({
        start: { x: lineaFirmaX, y },
        end: { x: lineaFirmaX + 160, y },
        thickness: 0.8, color: COLOR_NEGRO,
    });
    y -= 14;

    const firma1 = "Autoridad Competente";
    const anchoFirma1 = fontRegular.widthOfTextAtSize(firma1, 9);
    pagina.drawText(firma1, {
        x: (ANCHO_PAGINA - anchoFirma1) / 2,
        y, size: 9, font: fontRegular, color: COLOR_NEGRO,
    });
    y -= 12;

    const firma2 = "Departamento de Finanzas";
    const anchoFirma2 = fontRegular.widthOfTextAtSize(firma2, 8);
    pagina.drawText(firma2, {
        x: (ANCHO_PAGINA - anchoFirma2) / 2,
        y, size: 8, font: fontRegular, color: COLOR_GRIS,
    });
    y -= 12;

    const firma3 = "Ejercito de Chile";
    const anchoFirma3 = fontRegular.widthOfTextAtSize(firma3, 8);
    pagina.drawText(firma3, {
        x: (ANCHO_PAGINA - anchoFirma3) / 2,
        y, size: 8, font: fontRegular, color: COLOR_GRIS,
    });

    // =========================================================================
    // PIE DE PAGINA (en cada pagina)
    // =========================================================================

    const paginas = pdfDoc.getPages();
    for (let i = 0; i < paginas.length; i++) {
        const p = paginas[i];
        p.drawLine({
            start: { x: MARGEN_X, y: 55 },
            end: { x: ANCHO_PAGINA - MARGEN_DERECHO, y: 55 },
            thickness: 0.5, color: COLOR_LINEA,
        });
        p.drawText("Documento generado automaticamente - Sistema de Resolucion de Pago SINAPSIS", {
            x: MARGEN_X, y: 42, size: 7, font: fontItalic, color: COLOR_GRIS,
        });
        p.drawText(`Generado: ${new Date().toISOString().split("T")[0]}`, {
            x: MARGEN_X, y: 32, size: 7, font: fontItalic, color: COLOR_GRIS,
        });
        if (paginas.length > 1) {
            const pageNum = `Pagina ${i + 1} de ${paginas.length}`;
            const anchoPageNum = fontItalic.widthOfTextAtSize(pageNum, 7);
            p.drawText(pageNum, {
                x: ANCHO_PAGINA - MARGEN_DERECHO - anchoPageNum,
                y: 42, size: 7, font: fontItalic, color: COLOR_GRIS,
            });
        }
    }

    // =========================================================================
    // SERIALIZAR
    // =========================================================================

    const pdfBytes = await pdfDoc.save();
    console.log(
        `[pdf-generator] PDF generado: ${(pdfBytes.length / 1024).toFixed(1)} KB, ${paginas.length} pagina(s)`
    );
    return pdfBytes;
}
