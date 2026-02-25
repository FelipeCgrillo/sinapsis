/**
 * image-processor.ts
 *
 * Módulo de compresión y redimensión automática de imágenes.
 * Garantiza que las imágenes no excedan el límite de 5MB de Anthropic
 * para la API de Vision, manteniendo suficiente calidad para OCR.
 *
 * Estrategia:
 * 1. Si la imagen ya está bajo 4MB → retornar tal cual.
 * 2. Redimensionar a un máximo de 2048px en el lado más largo.
 * 3. Comprimir iterativamente reduciendo calidad hasta estar bajo 4MB.
 * 4. Convertir siempre a JPEG para máxima compresión.
 */

import sharp from "sharp";

// =============================================================================
// CONSTANTES
// =============================================================================

/** Límite seguro: 4MB (deja margen sobre el límite de 5MB de Anthropic) */
const MAX_BYTES = 4 * 1024 * 1024;

/** Resolución máxima: 2048px en el lado más largo (suficiente para OCR) */
const MAX_DIMENSION = 2048;

/** Calidad JPEG inicial para compresión (80% es buen balance calidad/tamaño) */
const CALIDAD_INICIAL = 80;

/** Paso de reducción de calidad en cada iteración */
const PASO_CALIDAD = 10;

/** Calidad mínima permitida (bajo esto la imagen se vuelve ilegible) */
const CALIDAD_MINIMA = 30;

// =============================================================================
// FUNCIÓN PRINCIPAL
// =============================================================================

export interface ResultadoProcesamiento {
    /** Buffer de la imagen procesada */
    buffer: Buffer;
    /** MIME type resultante (siempre image/jpeg después de procesamiento) */
    mimeType: string;
    /** Tamaño original en bytes */
    tamanoOriginal: number;
    /** Tamaño final en bytes */
    tamanoFinal: number;
    /** true si la imagen fue redimensionada/comprimida */
    fueProcesada: boolean;
    /** Calidad JPEG usada (si fue comprimida) */
    calidadUsada: number;
}

/**
 * Procesa una imagen para que cumpla con los límites de Anthropic Vision.
 * Si la imagen ya es suficientemente pequeña, la retorna sin cambios.
 * Si no, la redimensiona y/o comprime iterativamente.
 *
 * @param buffer - Buffer de la imagen original
 * @param mimeType - MIME type original (image/jpeg, image/png, image/webp)
 * @returns ResultadoProcesamiento con el buffer procesado y metadata
 */
export async function procesarImagen(
    buffer: Buffer,
    mimeType: string
): Promise<ResultadoProcesamiento> {
    const tamanoOriginal = buffer.length;

    // Si ya está bajo el límite → retornar sin procesar
    if (tamanoOriginal <= MAX_BYTES) {
        return {
            buffer,
            mimeType,
            tamanoOriginal,
            tamanoFinal: tamanoOriginal,
            fueProcesada: false,
            calidadUsada: 100,
        };
    }

    // ─── Paso 1: Redimensionar si excede dimensiones máximas ──────────
    let imagen = sharp(buffer);
    const metadata = await imagen.metadata();

    const ancho = metadata.width ?? 0;
    const alto = metadata.height ?? 0;
    const ladoMayor = Math.max(ancho, alto);

    if (ladoMayor > MAX_DIMENSION) {
        imagen = imagen.resize({
            width: ancho >= alto ? MAX_DIMENSION : undefined,
            height: alto > ancho ? MAX_DIMENSION : undefined,
            fit: "inside",
            withoutEnlargement: true,
        });
        console.log(
            `[image-processor] 📐 Redimensionando de ${ancho}x${alto} → max ${MAX_DIMENSION}px`
        );
    }

    // ─── Paso 2: Compresión iterativa en JPEG ─────────────────────────
    let calidad = CALIDAD_INICIAL;
    let resultado: Buffer;

    // Primera compresión
    resultado = await imagen.jpeg({ quality: calidad, mozjpeg: true }).toBuffer();

    console.log(
        `[image-processor] 🗜️  Comprimiendo: ${(tamanoOriginal / 1024 / 1024).toFixed(1)}MB → ${(resultado.length / 1024 / 1024).toFixed(1)}MB (calidad: ${calidad}%)`
    );

    // Reducir calidad iterativamente si sigue siendo muy grande
    while (resultado.length > MAX_BYTES && calidad > CALIDAD_MINIMA) {
        calidad -= PASO_CALIDAD;
        resultado = await sharp(buffer)
            .resize({
                width: ancho >= alto ? MAX_DIMENSION : undefined,
                height: alto > ancho ? MAX_DIMENSION : undefined,
                fit: "inside",
                withoutEnlargement: true,
            })
            .jpeg({ quality: calidad, mozjpeg: true })
            .toBuffer();

        console.log(
            `[image-processor] 🗜️  Re-comprimiendo → ${(resultado.length / 1024 / 1024).toFixed(1)}MB (calidad: ${calidad}%)`
        );
    }

    // Verificación final
    if (resultado.length > MAX_BYTES) {
        console.warn(
            `[image-processor] ⚠️ Imagen sigue grande (${(resultado.length / 1024 / 1024).toFixed(1)}MB) después de compresión máxima`
        );
    }

    const reduccion = ((1 - resultado.length / tamanoOriginal) * 100).toFixed(0);
    console.log(
        `[image-processor] ✅ Imagen procesada: ${(tamanoOriginal / 1024 / 1024).toFixed(1)}MB → ${(resultado.length / 1024 / 1024).toFixed(1)}MB (${reduccion}% reducción, calidad: ${calidad}%)`
    );

    return {
        buffer: resultado,
        mimeType: "image/jpeg", // Siempre JPEG después de compresión
        tamanoOriginal,
        tamanoFinal: resultado.length,
        fueProcesada: true,
        calidadUsada: calidad,
    };
}
