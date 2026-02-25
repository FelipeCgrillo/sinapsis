/**
 * validator.ts
 *
 * Módulo de Validación Cruzada — Motor Lógico 100% Determinístico.
 * Compara los datos extraídos de Factura, OC y Acta de Recepción
 * usando TypeScript puro (sin LLM).
 *
 * PRINCIPIO: Este módulo NO usa IA. Cada regla es código determinístico
 * que produce resultados reproducibles y auditables.
 */

import type { ExtraccionCompleta } from "@/lib/schemas";
import type {
    ResultadoValidacion,
    CheckValidacion,
    EstadoValidacion,
} from "@/lib/schemas";

// =============================================================================
// 🔧 FUNCIONES AUXILIARES
// =============================================================================

/**
 * Normaliza un RUT chileno para comparación.
 * Elimina puntos, guiones, espacios y convierte a minúsculas.
 *
 * Ejemplos:
 *   "76.123.456-7" → "761234567"
 *   "76123456-7"   → "761234567"
 *   "76.123.456-K" → "76123456k"
 *
 * @param rut - RUT en cualquier formato
 * @returns RUT limpio (solo dígitos + dv en lowercase)
 */
export function normalizarRUT(rut: string): string {
    if (!rut) return "";
    return rut
        .replace(/\./g, "")  // Quitar puntos
        .replace(/-/g, "")   // Quitar guiones
        .replace(/\s/g, "")  // Quitar espacios
        .toLowerCase()
        .trim();
}

/**
 * Convierte un valor que puede ser string con formato monetario a número.
 * Maneja formatos como: "$1.000.000", "1.000.000", "1000000", 1000000
 *
 * @param valor - Número o string con formato monetario chileno
 * @returns Número limpio o NaN si no es convertible
 */
export function limpiarMonto(valor: string | number): number {
    if (typeof valor === "number") {
        return valor;
    }

    if (typeof valor === "string") {
        // Quitar símbolo de peso, espacios y puntos de miles
        const limpio = valor
            .replace(/\$/g, "")    // Quitar $
            .replace(/\s/g, "")    // Quitar espacios
            .replace(/\./g, "")    // Quitar puntos (separador de miles)
            .replace(/,/g, ".")    // Reemplazar coma decimal por punto
            .trim();

        const numero = Number(limpio);
        return isNaN(numero) ? NaN : numero;
    }

    return NaN;
}

/**
 * Verifica si un valor es un dato no vacío (ni null, ni undefined, ni string vacío).
 */
function tieneDato(valor: unknown): boolean {
    if (valor === null || valor === undefined) return false;
    if (typeof valor === "string") return valor.trim().length > 0;
    if (typeof valor === "number") return !isNaN(valor);
    return true;
}

// =============================================================================
// ⚖️ REGLAS DE NEGOCIO
// =============================================================================

/**
 * REGLA 1: Validación de RUT del proveedor.
 * El RUT debe coincidir exactamente en los 3 documentos.
 */
function validarRUT(
    datos: ExtraccionCompleta,
    discrepancias: string[]
): boolean {
    const rutFactura = normalizarRUT(datos.factura.rutProveedor);
    const rutOC = normalizarRUT(datos.ordenCompra.rutProveedor);
    const rutActa = normalizarRUT(datos.actaRecepcion.rutProveedor);

    let coincide = true;

    if (!rutFactura || !rutOC || !rutActa) {
        discrepancias.push(
            "Falta el RUT del proveedor en uno o más documentos."
        );
        return false;
    }

    if (rutFactura !== rutOC) {
        discrepancias.push(
            `El RUT de la Factura (${datos.factura.rutProveedor}) no coincide con el de la Orden de Compra (${datos.ordenCompra.rutProveedor}).`
        );
        coincide = false;
    }

    if (rutFactura !== rutActa) {
        discrepancias.push(
            `El RUT de la Factura (${datos.factura.rutProveedor}) no coincide con el del Acta de Recepción (${datos.actaRecepcion.rutProveedor}).`
        );
        coincide = false;
    }

    if (rutOC !== rutActa) {
        discrepancias.push(
            `El RUT de la Orden de Compra (${datos.ordenCompra.rutProveedor}) no coincide con el del Acta de Recepción (${datos.actaRecepcion.rutProveedor}).`
        );
        coincide = false;
    }

    return coincide;
}

/**
 * REGLA 2: Validación de montos.
 *   - El monto total de la Factura NO puede superar el monto de la OC.
 *   - El monto total de la Factura DEBE ser igual o menor al monto recepcionado.
 */
function validarMontos(
    datos: ExtraccionCompleta,
    discrepancias: string[]
): { montosCoinciden: boolean; montoOCSuficiente: boolean } {
    const montoFactura = limpiarMonto(datos.factura.montoTotal);
    const montoOC = limpiarMonto(datos.ordenCompra.montoTotal);
    const montoRecepcion = limpiarMonto(datos.actaRecepcion.montoRecepcionado);

    let montosCoinciden = true;
    let montoOCSuficiente = true;

    // Validar que los montos sean números válidos
    if (isNaN(montoFactura)) {
        discrepancias.push("El monto total de la Factura no es un número válido.");
        montosCoinciden = false;
    }
    if (isNaN(montoOC)) {
        discrepancias.push(
            "El monto total de la Orden de Compra no es un número válido."
        );
        montoOCSuficiente = false;
    }
    if (isNaN(montoRecepcion)) {
        discrepancias.push(
            "El monto recepcionado del Acta no es un número válido."
        );
        montosCoinciden = false;
    }

    // Solo comparar si todos los montos son válidos
    if (!isNaN(montoFactura) && !isNaN(montoOC) && !isNaN(montoRecepcion)) {
        // Regla 2a: Factura <= OC
        if (montoFactura > montoOC) {
            discrepancias.push(
                `El monto de la Factura ($${montoFactura.toLocaleString("es-CL")}) excede el monto de la Orden de Compra ($${montoOC.toLocaleString("es-CL")}).`
            );
            montoOCSuficiente = false;
        }

        // Regla 2b: Factura <= Recepción
        if (montoFactura > montoRecepcion) {
            discrepancias.push(
                `El monto de la Factura ($${montoFactura.toLocaleString("es-CL")}) excede el monto recepcionado ($${montoRecepcion.toLocaleString("es-CL")}).`
            );
            montosCoinciden = false;
        }

        // Regla 2c: Factura debe coincidir con Recepción (igualdad exacta)
        if (montoFactura !== montoRecepcion) {
            discrepancias.push(
                `El monto de la Factura ($${montoFactura.toLocaleString("es-CL")}) no coincide exactamente con el monto recepcionado ($${montoRecepcion.toLocaleString("es-CL")}).`
            );
            montosCoinciden = false;
        }
    }

    return { montosCoinciden, montoOCSuficiente };
}

/**
 * REGLA 3: Validación de integridad de datos críticos.
 * Verifica que no falten campos esenciales para generar la Resolución.
 */
function validarIntegridad(
    datos: ExtraccionCompleta,
    discrepancias: string[]
): { descripcionConsistente: boolean; recepcionConforme: boolean } {
    let descripcionConsistente = true;
    let recepcionConforme = true;

    // 3a: Ítem presupuestario obligatorio
    if (!tieneDato(datos.ordenCompra.itemPresupuestario)) {
        discrepancias.push(
            "Falta la imputación presupuestaria (Ítem Presupuestario) en la Orden de Compra."
        );
    }

    // 3b: Número de factura obligatorio
    if (!tieneDato(datos.factura.numeroFactura)) {
        discrepancias.push("Falta el número de la Factura.");
    }

    // 3c: Número de OC obligatorio
    if (!tieneDato(datos.ordenCompra.numeroOC)) {
        discrepancias.push("Falta el número de la Orden de Compra.");
    }

    // 3d: Número de acta obligatorio
    if (!tieneDato(datos.actaRecepcion.numeroActa)) {
        discrepancias.push("Falta el número del Acta de Recepción.");
    }

    // 3e: Recepción conforme obligatoria
    if (datos.actaRecepcion.conforme !== true) {
        discrepancias.push(
            "El Acta de Recepción NO declara conformidad. El servicio o bien no fue recepcionado conforme."
        );
        recepcionConforme = false;
    }

    // 3f: Descripción del servicio debe existir en la factura
    if (!tieneDato(datos.factura.descripcionServicio)) {
        discrepancias.push(
            "Falta la descripción del servicio o bien en la Factura."
        );
        descripcionConsistente = false;
    }

    // 3g: Razón social debe existir
    if (!tieneDato(datos.factura.razonSocial)) {
        discrepancias.push("Falta la razón social del proveedor en la Factura.");
    }

    // 3h: Fechas obligatorias
    if (!tieneDato(datos.factura.fechaEmision)) {
        discrepancias.push("Falta la fecha de emisión de la Factura.");
    }
    if (!tieneDato(datos.actaRecepcion.fechaRecepcion)) {
        discrepancias.push("Falta la fecha de recepción en el Acta.");
    }

    return { descripcionConsistente, recepcionConforme };
}

// =============================================================================
// 🚀 FUNCIÓN PRINCIPAL
// =============================================================================

/**
 * Valida cruzadamente los datos extraídos de los 3 documentos.
 *
 * Ejecuta 3 conjuntos de reglas:
 *   1. RUT: coincidencia en 3 documentos
 *   2. Montos: Factura <= OC, Factura == Recepción
 *   3. Integridad: campos críticos presentes + recepción conforme
 *
 * @param datos - Datos extraídos del LLM (Factura + OC + Acta)
 * @returns ResultadoValidacion con estado APROBADO o REPARO
 */
export function validarResolucion(
    datos: ExtraccionCompleta
): ResultadoValidacion {
    const discrepancias: string[] = [];

    // Ejecutar todas las reglas de negocio
    const rutCoincide = validarRUT(datos, discrepancias);
    const { montosCoinciden, montoOCSuficiente } = validarMontos(
        datos,
        discrepancias
    );
    const { descripcionConsistente, recepcionConforme } = validarIntegridad(
        datos,
        discrepancias
    );

    // Construir el detalle de checks
    const checks: CheckValidacion = {
        rutCoincide,
        montosCoinciden,
        montoOCSuficiente,
        descripcionConsistente,
        recepcionConforme,
        itemPresupuestario: datos.ordenCompra.itemPresupuestario || "(No informado)",
    };

    // Determinar estado final
    const estado: EstadoValidacion =
        discrepancias.length === 0 ? "APROBADO" : "REPARO";

    const resultado: ResultadoValidacion = {
        estado,
        checks,
        discrepancias,
        fechaValidacion: new Date().toISOString(),
    };

    // Log del resultado
    if (estado === "APROBADO") {
        console.log(
            "[validator] ✅ Validación APROBADA — Todos los documentos cuadran."
        );
    } else {
        console.log(
            `[validator] ⚠️ Validación con REPARO — ${discrepancias.length} discrepancia(s) encontrada(s):`
        );
        discrepancias.forEach((d, i) => console.log(`  ${i + 1}. ${d}`));
    }

    return resultado;
}

// =============================================================================
// 📦 TIPO DE RESPUESTA ENRIQUECIDA (para el Route Handler)
// =============================================================================

/**
 * Resultado completo de la validación, incluyendo los datos originales
 * para pasarlos al generador de PDF en el Paso 5.
 */
export interface ResultadoValidacionCompleto {
    /** Resultado de la validación (estado + checks + discrepancias) */
    validacion: ResultadoValidacion;
    /** Datos originales extraídos del LLM (para generar la Resolución) */
    datosValidados: ExtraccionCompleta;
}

/**
 * Ejecuta la validación y retorna el resultado junto con los datos originales.
 *
 * @param datos - Datos extraídos del LLM
 * @returns Objeto con la validación y los datos para el PDF
 */
export function validarYEmpaquetar(
    datos: ExtraccionCompleta
): ResultadoValidacionCompleto {
    const validacion = validarResolucion(datos);

    return {
        validacion,
        datosValidados: datos,
    };
}
