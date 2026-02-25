/**
 * image-processor.ts
 *
 * Módulo de procesamiento de imágenes para Anthropic Vision API.
 * 
 * Versión SERVERLESS — sin dependencias nativas (sin sharp).
 * Compatible con Vercel, AWS Lambda, Cloudflare Workers.
 *
 * Estrategia:
 * 1. Si la imagen está bajo 4MB → pasar tal cual.
 * 2. Si excede 4MB → informar al usuario que reduzca la imagen.
 *
 * Nota: La mayoría de fotos de celular moderno están bajo 4MB en JPEG.
 * Las que excedan serán rechazadas con un mensaje claro.
 */

// =============================================================================
// CONSTANTES
// =============================================================================

/** Límite seguro: 4MB (deja margen sobre el límite de 5MB de Anthropic) */
const MAX_BYTES = 4 * 1024 * 1024;

// =============================================================================
// TIPOS
// =============================================================================

export interface ResultadoProcesamiento {
    /** Buffer de la imagen procesada */
    buffer: Buffer;
    /** MIME type resultante */
    mimeType: string;
    /** Tamaño original en bytes */
    tamanoOriginal: number;
    /** Tamaño final en bytes */
    tamanoFinal: number;
    /** true si la imagen fue procesada */
    fueProcesada: boolean;
    /** Calidad usada */
    calidadUsada: number;
}

// =============================================================================
// FUNCIÓN PRINCIPAL
// =============================================================================

/**
 * Procesa una imagen para que cumpla con los límites de Anthropic Vision.
 * En esta versión serverless, verifica el tamaño y pasa la imagen sin modificar.
 *
 * @param buffer - Buffer de la imagen original
 * @param mimeType - MIME type original (image/jpeg, image/png, image/webp)
 * @returns ResultadoProcesamiento con el buffer y metadata
 * @throws Error si la imagen excede 4MB
 */
export async function procesarImagen(
    buffer: Buffer,
    mimeType: string
): Promise<ResultadoProcesamiento> {
    const tamanoOriginal = buffer.length;

    // Verificar que no exceda el límite
    if (tamanoOriginal > MAX_BYTES) {
        const tamanoMB = (tamanoOriginal / 1024 / 1024).toFixed(1);
        throw new Error(
            `La imagen pesa ${tamanoMB}MB y excede el límite de 4MB para análisis con IA. ` +
            `Por favor, reduzca el tamaño de la imagen antes de subirla (use una resolución menor o comprima el archivo).`
        );
    }

    console.log(
        `[image-processor] ✅ Imagen aceptada: ${(tamanoOriginal / 1024).toFixed(0)}KB (${mimeType})`
    );

    return {
        buffer,
        mimeType,
        tamanoOriginal,
        tamanoFinal: tamanoOriginal,
        fueProcesada: false,
        calidadUsada: 100,
    };
}
