/**
 * schemas.ts
 * 
 * Esquemas Zod e interfaces TypeScript para el sistema de Resolución de Pago.
 * Estos esquemas son usados por el LLM para devolver datos estructurados
 * y por el módulo de validación para comparar documentos.
 * 
 * IMPORTANTE: El LLM solo EXTRAE datos. La VALIDACIÓN es código TypeScript puro.
 */

import { z } from "zod";

// =============================================================================
// 📄 ESQUEMA: Datos extraídos de la FACTURA
// =============================================================================

export const FacturaSchema = z.object({
  /** RUT del proveedor, formato "XX.XXX.XXX-X" */
  rutProveedor: z.string().describe("RUT del proveedor en formato XX.XXX.XXX-X"),

  /** Razón social del proveedor */
  razonSocial: z.string().describe("Razón social o nombre del proveedor"),

  /** Número de la factura */
  numeroFactura: z.string().describe("Número identificador de la factura"),

  /** Fecha de emisión en formato ISO (YYYY-MM-DD) */
  fechaEmision: z.string().describe("Fecha de emisión de la factura en formato YYYY-MM-DD"),

  /** Monto neto (sin IVA) en pesos chilenos */
  montoNeto: z.number().describe("Monto neto sin IVA en pesos chilenos (CLP)"),

  /** Monto del IVA (19%) */
  iva: z.number().describe("Monto del IVA en pesos chilenos (CLP)"),

  /** Monto total (neto + IVA) */
  montoTotal: z.number().describe("Monto total de la factura incluyendo IVA"),

  /** Descripción del servicio o producto facturado */
  descripcionServicio: z.string().describe("Descripción del servicio o bien facturado"),
});

export type Factura = z.infer<typeof FacturaSchema>;

// =============================================================================
// 📋 ESQUEMA: Datos extraídos de la ORDEN DE COMPRA
// =============================================================================

export const OrdenCompraSchema = z.object({
  /** Número de la Orden de Compra */
  numeroOC: z.string().describe("Número identificador de la Orden de Compra"),

  /** RUT del proveedor adjudicado */
  rutProveedor: z.string().describe("RUT del proveedor en formato XX.XXX.XXX-X"),

  /** Razón social del proveedor */
  razonSocial: z.string().describe("Razón social o nombre del proveedor"),

  /** Monto total contratado en la OC */
  montoTotal: z.number().describe("Monto total de la Orden de Compra en CLP"),

  /** Ítem presupuestario asignado (ej: "Subtítulo 22, Ítem 04") */
  itemPresupuestario: z.string().describe(
    "Ítem presupuestario asignado, ej: Subtítulo 22, Ítem 04"
  ),

  /** Descripción del bien o servicio contratado */
  descripcion: z.string().describe("Descripción del bien o servicio contratado"),

  /** Fecha de la Orden de Compra */
  fechaOC: z.string().describe("Fecha de emisión de la Orden de Compra en formato YYYY-MM-DD"),
});

export type OrdenCompra = z.infer<typeof OrdenCompraSchema>;

// =============================================================================
// ✅ ESQUEMA: Datos extraídos del ACTA DE RECEPCIÓN CONFORME
// =============================================================================

export const ActaRecepcionSchema = z.object({
  /** Número del acta de recepción */
  numeroActa: z.string().describe("Número identificador del Acta de Recepción"),

  /** RUT del proveedor */
  rutProveedor: z.string().describe("RUT del proveedor en formato XX.XXX.XXX-X"),

  /** Monto total recepcionado conforme */
  montoRecepcionado: z.number().describe(
    "Monto total recepcionado conforme en CLP"
  ),

  /** Fecha de recepción */
  fechaRecepcion: z.string().describe("Fecha de recepción en formato YYYY-MM-DD"),

  /** Descripción del bien o servicio recepcionado */
  descripcion: z.string().describe("Descripción del bien o servicio recepcionado"),

  /** Indica si la recepción fue conforme */
  conforme: z.boolean().describe(
    "true si la recepción fue declarada conforme, false en caso contrario"
  ),
});

export type ActaRecepcion = z.infer<typeof ActaRecepcionSchema>;

// =============================================================================
// 🔗 ESQUEMA COMBINADO: Resultado completo de la extracción LLM
// =============================================================================

export const ExtraccionCompletaSchema = z.object({
  factura: FacturaSchema,
  ordenCompra: OrdenCompraSchema,
  actaRecepcion: ActaRecepcionSchema,
});

export type ExtraccionCompleta = z.infer<typeof ExtraccionCompletaSchema>;

// =============================================================================
// ⚖️ ESQUEMA: Resultado de la VALIDACIÓN CRUZADA
// =============================================================================

/** Estado final de la validación */
export const EstadoValidacionEnum = z.enum(["APROBADO", "REPARO"]);
export type EstadoValidacion = z.infer<typeof EstadoValidacionEnum>;

/** Detalle de cada check de validación */
export const CheckValidacionSchema = z.object({
  /** ¿El RUT del proveedor coincide en los 3 documentos? */
  rutCoincide: z.boolean(),

  /** ¿Los montos (Factura vs Recepción) coinciden? */
  montosCoinciden: z.boolean(),

  /** ¿El monto de la OC es >= al monto de la factura? */
  montoOCSuficiente: z.boolean(),

  /** ¿La descripción del servicio es consistente? */
  descripcionConsistente: z.boolean(),

  /** ¿El acta de recepción fue declarada conforme? */
  recepcionConforme: z.boolean(),

  /** Ítem presupuestario identificado */
  itemPresupuestario: z.string(),
});

export type CheckValidacion = z.infer<typeof CheckValidacionSchema>;

/** Resultado completo de la validación */
export const ResultadoValidacionSchema = z.object({
  /** Estado final: APROBADO o REPARO */
  estado: EstadoValidacionEnum,

  /** Detalle de cada verificación realizada */
  checks: CheckValidacionSchema,

  /** Lista de discrepancias encontradas (vacía si APROBADO) */
  discrepancias: z.array(z.string()),

  /** Timestamp de la validación */
  fechaValidacion: z.string(),
});

export type ResultadoValidacion = z.infer<typeof ResultadoValidacionSchema>;

// =============================================================================
// 📝 ESQUEMA: Datos para la RESOLUCIÓN DE PAGO
// =============================================================================

export const ResolucionPagoSchema = z.object({
  /** Número correlativo de la resolución */
  numeroResolucion: z.string(),

  /** Fecha de la resolución */
  fechaResolucion: z.string(),

  /** Datos del proveedor */
  proveedor: z.object({
    rut: z.string(),
    razonSocial: z.string(),
  }),

  /** Referencias documentales */
  referencias: z.object({
    numeroFactura: z.string(),
    fechaFactura: z.string(),
    numeroOC: z.string(),
    fechaOC: z.string(),
    numeroActa: z.string(),
    fechaRecepcion: z.string(),
  }),

  /** Montos del pago */
  montos: z.object({
    neto: z.number(),
    iva: z.number(),
    total: z.number(),
  }),

  /** Ítem presupuestario con cargo */
  itemPresupuestario: z.string(),

  /** Descripción del concepto de pago */
  conceptoPago: z.string(),

  /** Resultado de la validación */
  validacion: ResultadoValidacionSchema,
});

export type ResolucionPago = z.infer<typeof ResolucionPagoSchema>;
