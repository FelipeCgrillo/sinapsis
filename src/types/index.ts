/**
 * types/index.ts
 *
 * Tipos globales del sistema de Resolución de Pago.
 * Incluye tipos para manejo de archivos, estados del proceso,
 * respuestas de API y configuración.
 */

// =============================================================================
// 📁 TIPOS: Manejo de Archivos PDF
// =============================================================================

/** Tipos de documento que el sistema acepta */
export type TipoDocumento = "factura" | "ordenCompra" | "actaRecepcion";

/** Etiquetas legibles para cada tipo de documento */
export const ETIQUETAS_DOCUMENTO: Record<TipoDocumento, string> = {
    factura: "Factura",
    ordenCompra: "Orden de Compra",
    actaRecepcion: "Acta de Recepción Conforme",
};

/** Resultado de la extracción de texto de un PDF */
export interface TextoExtraido {
    /** Tipo de documento */
    tipo: TipoDocumento;
    /** Texto plano extraído del PDF */
    texto: string;
    /** Nombre original del archivo */
    nombreArchivo: string;
    /** Tamaño del archivo en bytes */
    tamanoBytes: number;
    /** Número de páginas del PDF */
    numeroPaginas: number;
}

// =============================================================================
// 🔄 TIPOS: Estados del Proceso
// =============================================================================

/** Estados posibles del flujo de procesamiento */
export type EstadoProceso =
    | "IDLE"           // Sin actividad
    | "CARGANDO"       // Subiendo archivos
    | "EXTRAYENDO"     // Extrayendo texto de PDFs
    | "ANALIZANDO"     // LLM procesando texto
    | "VALIDANDO"      // Validación cruzada en curso
    | "GENERANDO"      // Generando PDF de resolución
    | "COMPLETADO"     // Proceso terminado exitosamente
    | "ERROR";         // Error en algún paso

/** Información del progreso del proceso */
export interface ProgresoSistema {
    estado: EstadoProceso;
    paso: number;
    totalPasos: number;
    mensaje: string;
    /** Porcentaje de avance (0-100) */
    porcentaje: number;
}

// =============================================================================
// 🌐 TIPOS: Respuestas de API
// =============================================================================

/** Respuesta genérica de las API Routes */
export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    /** Detalles adicionales del error para debugging */
    detalles?: string;
}

/** Respuesta de la API de carga de archivos */
export interface UploadResponse {
    archivos: TextoExtraido[];
    mensaje: string;
}

/** Respuesta de la API de extracción LLM */
export interface ExtractResponse {
    factura: Record<string, unknown>;
    ordenCompra: Record<string, unknown>;
    actaRecepcion: Record<string, unknown>;
}

// =============================================================================
// ⚙️ TIPOS: Configuración
// =============================================================================

/** Configuración del sistema */
export interface ConfigSistema {
    /** Tamaño máximo de archivo en bytes (default: 10MB) */
    maxFileSize: number;
    /** Tipos MIME aceptados */
    mimeTypesPermitidos: string[];
    /** Modelo de OpenAI a utilizar */
    modeloLLM: string;
    /** Temperatura del LLM (0 = determinístico) */
    temperaturaLLM: number;
}

/** Configuración por defecto del sistema */
export const CONFIG_DEFAULT: ConfigSistema = {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    mimeTypesPermitidos: ["application/pdf", "image/jpeg", "image/png", "image/webp"],
    modeloLLM: "gpt-4o",
    temperaturaLLM: 0, // Máxima precisión para extracción de datos
};
