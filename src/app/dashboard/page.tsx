"use client";

/**
 * page.tsx — Dashboard principal del Sistema de Resolución de Pago.
 *
 * Interfaz interactiva que permite:
 * 1. Subir 3 documentos (PDF o fotografías JPEG/PNG/WebP)
 * 2. Procesar el pipeline completo (Upload → Extract → Validate)
 * 3. Ver resultado de validación (APROBADO / REPARO)
 * 4. Descargar la Resolución de Pago en PDF
 *
 * Soporta entrada multimodal: PDFs e imágenes de celular.
 */

import { useState, useCallback, useRef } from "react";
import Image from "next/image";

// =============================================================================
// TIPOS LOCALES
// =============================================================================

type TipoDoc = "factura" | "ordenCompra" | "actaRecepcion";
type EstadoProceso =
  | "IDLE"
  | "CARGANDO"
  | "EXTRAYENDO"
  | "ANALIZANDO"
  | "VALIDANDO"
  | "GENERANDO"
  | "COMPLETADO"
  | "ERROR";

interface ArchivoSeleccionado {
  file: File;
  nombre: string;
  esImagen: boolean;
  previewUrl?: string;
}

interface CheckValidacion {
  rutCoincide: boolean;
  montosCoinciden: boolean;
  montoOCSuficiente: boolean;
  descripcionConsistente: boolean;
  recepcionConforme: boolean;
  itemPresupuestario: string;
}

interface ResultadoValidacion {
  estado: "APROBADO" | "REPARO";
  checks: CheckValidacion;
  discrepancias: string[];
  fechaValidacion: string;
}

interface DatosValidados {
  factura: Record<string, unknown>;
  ordenCompra: Record<string, unknown>;
  actaRecepcion: Record<string, unknown>;
}

interface ResultadoCompleto {
  validacion: ResultadoValidacion;
  datosValidados: DatosValidados;
}

// =============================================================================
// CONSTANTES
// =============================================================================

/** MIME types válidos */
const MIME_PDF = "application/pdf";
const MIME_IMAGENES = ["image/jpeg", "image/png", "image/webp"];
const ACCEPT_STRING = ".pdf,image/jpeg,image/png,image/webp";

const DOC_CONFIG: {
  key: TipoDoc;
  label: string;
  icono: string;
  descripcion: string;
}[] = [
    {
      key: "factura",
      label: "Factura Electrónica",
      icono: "📄",
      descripcion: "PDF o foto de la factura del proveedor",
    },
    {
      key: "ordenCompra",
      label: "Orden de Compra",
      icono: "📋",
      descripcion: "PDF o foto de la OC aprobada",
    },
    {
      key: "actaRecepcion",
      label: "Acta de Recepción",
      icono: "📸",
      descripcion: "PDF o foto del acta de recepción conforme",
    },
  ];

const PASOS_PROCESO: {
  estado: EstadoProceso;
  label: string;
  porcentaje: number;
}[] = [
    { estado: "CARGANDO", label: "Subiendo archivos...", porcentaje: 15 },
    { estado: "EXTRAYENDO", label: "Extrayendo contenido...", porcentaje: 35 },
    { estado: "ANALIZANDO", label: "Analizando con IA...", porcentaje: 60 },
    { estado: "VALIDANDO", label: "Validación cruzada...", porcentaje: 85 },
    { estado: "COMPLETADO", label: "¡Proceso completado!", porcentaje: 100 },
  ];

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export default function Home() {
  // Estado de archivos seleccionados
  const [archivos, setArchivos] = useState<
    Record<TipoDoc, ArchivoSeleccionado | null>
  >({
    factura: null,
    ordenCompra: null,
    actaRecepcion: null,
  });

  // Estado de procesamiento
  const [estado, setEstado] = useState<EstadoProceso>("IDLE");
  const [mensaje, setMensaje] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [resultado, setResultado] = useState<ResultadoCompleto | null>(null);
  const [descargando, setDescargando] = useState(false);

  // Refs para los inputs de archivo
  const inputRefs = useRef<Record<TipoDoc, HTMLInputElement | null>>({
    factura: null,
    ordenCompra: null,
    actaRecepcion: null,
  });

  // =========================================================================
  // HANDLERS
  // =========================================================================

  /** Manejar selección de archivo (PDF o imagen) */
  const handleFileSelect = useCallback((tipo: TipoDoc, file: File | null) => {
    if (!file) return;

    // Validar MIME type
    const esImagen = MIME_IMAGENES.includes(file.type);
    const esPDF = file.type === MIME_PDF;

    if (!esImagen && !esPDF) {
      setError(
        `El archivo "${file.name}" no es un formato válido. Use PDF, JPEG, PNG o WebP.`
      );
      return;
    }

    // Validar tamaño (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError(`El archivo "${file.name}" excede el límite de 10MB.`);
      return;
    }

    setError("");

    // Crear preview URL para imágenes
    const previewUrl = esImagen ? URL.createObjectURL(file) : undefined;

    setArchivos((prev) => {
      // Limpiar preview anterior si existe
      const prevArchivo = prev[tipo];
      if (prevArchivo?.previewUrl) {
        URL.revokeObjectURL(prevArchivo.previewUrl);
      }

      return {
        ...prev,
        [tipo]: { file, nombre: file.name, esImagen, previewUrl },
      };
    });
  }, []);

  /** Verificar si los 3 archivos están listos */
  const todosListos =
    archivos.factura && archivos.ordenCompra && archivos.actaRecepcion;

  /** Pipeline completo: Upload → Extract → Validate */
  const procesarPago = useCallback(async () => {
    if (!todosListos) return;

    setError("");
    setResultado(null);

    try {
      // =====================================================================
      // PASO 1: Upload — Subir y procesar (texto o base64)
      // =====================================================================
      setEstado("CARGANDO");
      setMensaje("Subiendo archivos al servidor...");

      const formData = new FormData();
      formData.append("factura", archivos.factura!.file);
      formData.append("ordenCompra", archivos.ordenCompra!.file);
      formData.append("actaRecepcion", archivos.actaRecepcion!.file);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        const uploadErr = await uploadRes.json();
        throw new Error(uploadErr.error || "Error al subir los archivos.");
      }

      const uploadData = await uploadRes.json();
      const contenidos = uploadData.data;

      // Informar tipos procesados
      const tiposUsados = [
        contenidos.factura.tipo === "imagen" ? "📷" : "📄",
        contenidos.ordenCompra.tipo === "imagen" ? "📷" : "📄",
        contenidos.actaRecepcion.tipo === "imagen" ? "📷" : "📄",
      ].join(" ");

      setEstado("EXTRAYENDO");
      setMensaje(`Contenido procesado: ${tiposUsados}`);

      // =====================================================================
      // PASO 2: Extract — Enviar al LLM (multimodal)
      // =====================================================================
      setEstado("ANALIZANDO");
      const tieneImagenes = [
        contenidos.factura,
        contenidos.ordenCompra,
        contenidos.actaRecepcion,
      ].some(
        (c: { tipo: string }) => c.tipo === "imagen"
      );

      setMensaje(
        tieneImagenes
          ? "Analizando documentos y fotografías con IA Vision (~20 seg)..."
          : "Analizando documentos con IA (~15 seg)..."
      );

      const extractRes = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          factura: contenidos.factura,
          ordenCompra: contenidos.ordenCompra,
          actaRecepcion: contenidos.actaRecepcion,
        }),
      });

      if (!extractRes.ok) {
        const extractErr = await extractRes.json();
        throw new Error(extractErr.error || "Error al analizar con IA.");
      }

      const extractData = await extractRes.json();
      const datosExtraidos = extractData.data;

      // =====================================================================
      // PASO 3: Validate — Validación cruzada
      // =====================================================================
      setEstado("VALIDANDO");
      setMensaje("Ejecutando validación cruzada de documentos...");

      const validateRes = await fetch("/api/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datosExtraidos),
      });

      if (!validateRes.ok) {
        const validateErr = await validateRes.json();
        throw new Error(
          validateErr.error || "Error en la validación cruzada."
        );
      }

      const validateData = await validateRes.json();

      // =====================================================================
      // COMPLETADO
      // =====================================================================
      setEstado("COMPLETADO");
      setMensaje("¡Proceso completado exitosamente!");
      setResultado(validateData.data as ResultadoCompleto);
    } catch (err: unknown) {
      setEstado("ERROR");
      const mensajeError =
        err instanceof Error ? err.message : "Error inesperado del sistema.";
      setError(mensajeError);
      setMensaje("");
    }
  }, [archivos, todosListos]);

  /** Descargar Resolución de Pago en PDF */
  const descargarResolucion = useCallback(async () => {
    if (!resultado) return;
    setDescargando(true);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resultado),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Error al generar el PDF.");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Resolucion_de_Pago_${new Date().toISOString().split("T")[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al descargar.";
      setError(msg);
    } finally {
      setDescargando(false);
    }
  }, [resultado]);

  /** Reiniciar todo */
  const reiniciar = useCallback(() => {
    // Limpiar previews
    Object.values(archivos).forEach((a) => {
      if (a?.previewUrl) URL.revokeObjectURL(a.previewUrl);
    });
    setArchivos({ factura: null, ordenCompra: null, actaRecepcion: null });
    setEstado("IDLE");
    setMensaje("");
    setError("");
    setResultado(null);
  }, [archivos]);

  // =========================================================================
  // HELPERS DE UI
  // =========================================================================

  const pasoActual = PASOS_PROCESO.find((p) => p.estado === estado);
  const porcentaje = pasoActual?.porcentaje ?? 0;
  const enProceso = !["IDLE", "COMPLETADO", "ERROR"].includes(estado);

  // =========================================================================
  // RENDER
  // =========================================================================

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-surface">
        <div className="mx-auto max-w-5xl px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">
              Resolución de Pago Automatizada
            </h1>
            <p className="text-sm text-text-muted mt-0.5">
              Sistema de procesamiento documental — Sector Público
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-text-muted bg-surface-hover px-3 py-1.5 rounded-full border border-border">
            <span className="inline-block w-2 h-2 rounded-full bg-success animate-pulse" />
            Sistema activo
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        {/* ============================================ */}
        {/* Zona de carga de archivos */}
        {/* ============================================ */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-1">
            1. Cargar Documentos
          </h2>
          <p className="text-sm text-text-muted mb-5">
            Selecciona los 3 documentos requeridos. Acepta{" "}
            <strong>PDF</strong> y <strong>fotografías</strong> (JPEG, PNG,
            WebP).
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {DOC_CONFIG.map((doc) => {
              const seleccionado = archivos[doc.key];
              return (
                <div
                  key={doc.key}
                  onClick={() =>
                    !enProceso && inputRefs.current[doc.key]?.click()
                  }
                  className={`
                    relative group cursor-pointer rounded-xl border-2 border-dashed p-5
                    transition-all duration-200 ease-out
                    ${seleccionado
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border hover:border-primary-light hover:bg-surface-hover"
                    }
                    ${enProceso ? "opacity-60 pointer-events-none" : ""}
                  `}
                >
                  {/* Miniatura de imagen o icono */}
                  {seleccionado?.esImagen && seleccionado.previewUrl ? (
                    <div className="relative w-full h-20 mb-3 rounded-lg overflow-hidden bg-surface-hover">
                      <Image
                        src={seleccionado.previewUrl}
                        alt={`Preview ${doc.label}`}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                      {/* Badge "Foto" */}
                      <div className="absolute top-1 right-1 bg-warning/90 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                        📷 FOTO
                      </div>
                    </div>
                  ) : (
                    <div className="text-3xl mb-3">
                      {seleccionado ? (
                        seleccionado.esImagen ? "📷" : "📄"
                      ) : (
                        doc.icono
                      )}
                    </div>
                  )}

                  {/* Label */}
                  <h3 className="font-semibold text-foreground text-sm">
                    {doc.label}
                  </h3>
                  <p className="text-xs text-text-muted mt-1">
                    {doc.descripcion}
                  </p>

                  {/* Estado del archivo */}
                  <div className="mt-3 min-h-[28px]">
                    {seleccionado ? (
                      <div className="flex items-center gap-2 text-xs text-primary font-medium animate-fade-in-up">
                        <svg
                          className="w-4 h-4 text-success shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        <span className="truncate max-w-[180px]">
                          {seleccionado.nombre}
                        </span>
                        {seleccionado.esImagen && (
                          <span className="text-[10px] bg-warning/10 text-warning px-1.5 py-0.5 rounded font-semibold shrink-0">
                            Foto
                          </span>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-text-muted group-hover:text-primary-light transition-colors">
                        Click para seleccionar PDF o foto
                      </p>
                    )}
                  </div>

                  {/* Input oculto — Acepta PDF e imágenes */}
                  <input
                    ref={(el) => {
                      inputRefs.current[doc.key] = el;
                    }}
                    type="file"
                    accept={ACCEPT_STRING}
                    className="hidden"
                    onChange={(e) =>
                      handleFileSelect(doc.key, e.target.files?.[0] ?? null)
                    }
                  />
                </div>
              );
            })}
          </div>
        </section>

        {/* Error global */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-danger-light border border-danger/20 animate-fade-in-up">
            <div className="flex items-start gap-3">
              <span className="text-danger text-lg mt-0.5">✗</span>
              <div>
                <h4 className="font-semibold text-danger text-sm">Error</h4>
                <p className="text-sm text-foreground mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Botón procesar */}
        <section className="mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={procesarPago}
              disabled={!todosListos || enProceso}
              className={`
                px-8 py-3 rounded-xl font-semibold text-sm transition-all duration-200
                ${todosListos && !enProceso
                  ? "bg-primary text-white hover:bg-primary-dark shadow-md hover:shadow-lg active:scale-[0.98] animate-pulse-ring"
                  : "bg-border text-text-muted cursor-not-allowed"
                }
              `}
            >
              {enProceso ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4 animate-spin-slow"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Procesando...
                </span>
              ) : (
                "🚀 Procesar Pago"
              )}
            </button>

            {(estado === "COMPLETADO" || estado === "ERROR") && (
              <button
                onClick={reiniciar}
                className="px-5 py-3 rounded-xl font-medium text-sm border border-border text-text-muted hover:bg-surface-hover transition-all"
              >
                🔄 Nuevo Proceso
              </button>
            )}
          </div>
        </section>

        {/* Barra de progreso */}
        {enProceso && (
          <section className="mb-8 animate-fade-in-up">
            <h2 className="text-lg font-semibold text-foreground mb-3">
              2. Procesando
            </h2>
            <div className="bg-surface rounded-xl border border-border p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">
                  {mensaje}
                </span>
                <span className="text-xs text-text-muted font-mono">
                  {porcentaje}%
                </span>
              </div>
              <div className="w-full h-2 bg-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-primary-light rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${porcentaje}%` }}
                />
              </div>

              <div className="flex gap-2 mt-4">
                {PASOS_PROCESO.slice(0, -1).map((paso) => {
                  const activo = paso.estado === estado;
                  const pasado = paso.porcentaje < porcentaje;
                  return (
                    <div
                      key={paso.estado}
                      className={`flex-1 text-center text-xs py-1.5 rounded-lg transition-all ${activo
                          ? "bg-primary/10 text-primary font-semibold"
                          : pasado
                            ? "bg-success/10 text-success"
                            : "text-text-muted"
                        }`}
                    >
                      {pasado ? "✓" : ""} {paso.label.replace("...", "")}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* Resultado de validación */}
        {resultado && estado === "COMPLETADO" && (
          <section className="animate-fade-in-up">
            <h2 className="text-lg font-semibold text-foreground mb-3">
              3. Resultado
            </h2>

            {/* Estado principal */}
            <div
              className={`rounded-xl border p-6 mb-5 ${resultado.validacion.estado === "APROBADO"
                  ? "bg-success-light border-success/30"
                  : "bg-danger-light border-danger/30"
                }`}
            >
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">
                    {resultado.validacion.estado === "APROBADO" ? "✅" : "🚫"}
                  </span>
                  <div>
                    <h3
                      className={`text-xl font-bold ${resultado.validacion.estado === "APROBADO"
                          ? "text-success"
                          : "text-danger"
                        }`}
                    >
                      {resultado.validacion.estado === "APROBADO"
                        ? "Resolución Aprobada"
                        : "Resolución con Reparo"}
                    </h3>
                    <p className="text-sm text-text-muted mt-0.5">
                      {resultado.validacion.estado === "APROBADO"
                        ? "Todos los documentos cuadran correctamente."
                        : `Se encontraron ${resultado.validacion.discrepancias.length} discrepancia(s).`}
                    </p>
                  </div>
                </div>

                {resultado.validacion.estado === "APROBADO" && (
                  <button
                    onClick={descargarResolucion}
                    disabled={descargando}
                    className="px-6 py-3 bg-success text-white rounded-xl font-semibold text-sm hover:bg-success/90 transition-all shadow-md hover:shadow-lg active:scale-[0.98] flex items-center gap-2"
                  >
                    {descargando ? (
                      <>
                        <svg
                          className="w-4 h-4 animate-spin-slow"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                          />
                        </svg>
                        Generando...
                      </>
                    ) : (
                      <>📥 Descargar Resolución</>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Tabla de checks */}
            <div className="bg-surface rounded-xl border border-border overflow-hidden mb-5">
              <div className="px-5 py-3 border-b border-border bg-surface-hover">
                <h4 className="font-semibold text-sm text-foreground">
                  Detalle de Validación Cruzada
                </h4>
              </div>
              <div className="divide-y divide-border">
                {[
                  {
                    label: "RUT del proveedor coincide",
                    valor: resultado.validacion.checks.rutCoincide,
                  },
                  {
                    label: "Montos factura = recepción",
                    valor: resultado.validacion.checks.montosCoinciden,
                  },
                  {
                    label: "Monto OC suficiente",
                    valor: resultado.validacion.checks.montoOCSuficiente,
                  },
                  {
                    label: "Descripción consistente",
                    valor: resultado.validacion.checks.descripcionConsistente,
                  },
                  {
                    label: "Recepción conforme",
                    valor: resultado.validacion.checks.recepcionConforme,
                  },
                ].map((check) => (
                  <div
                    key={check.label}
                    className="flex items-center justify-between px-5 py-3"
                  >
                    <span className="text-sm text-foreground">
                      {check.label}
                    </span>
                    <span
                      className={`text-sm font-semibold ${check.valor ? "text-success" : "text-danger"
                        }`}
                    >
                      {check.valor ? "✓ Aprobado" : "✗ Fallido"}
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between px-5 py-3 bg-surface-hover">
                  <span className="text-sm font-medium text-foreground">
                    Ítem presupuestario
                  </span>
                  <span className="text-sm font-mono text-primary">
                    {resultado.validacion.checks.itemPresupuestario}
                  </span>
                </div>
              </div>
            </div>

            {/* Discrepancias */}
            {resultado.validacion.discrepancias.length > 0 && (
              <div className="bg-surface rounded-xl border border-danger/20 overflow-hidden mb-5">
                <div className="px-5 py-3 border-b border-danger/20 bg-danger-light">
                  <h4 className="font-semibold text-sm text-danger">
                    ⚠️ Discrepancias Detectadas (
                    {resultado.validacion.discrepancias.length})
                  </h4>
                </div>
                <ul className="divide-y divide-border">
                  {resultado.validacion.discrepancias.map((disc, i) => (
                    <li
                      key={i}
                      className="px-5 py-3 text-sm text-foreground flex items-start gap-2"
                    >
                      <span className="text-danger font-bold mt-0.5 shrink-0">
                        {i + 1}.
                      </span>
                      {disc}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Botón descargar para REPARO */}
            {resultado.validacion.estado === "REPARO" && (
              <div className="flex items-center gap-3">
                <button
                  onClick={descargarResolucion}
                  disabled={descargando}
                  className="px-5 py-2.5 border border-border rounded-xl text-sm font-medium text-text-muted hover:bg-surface-hover transition-all flex items-center gap-2"
                >
                  {descargando
                    ? "Generando..."
                    : "📄 Descargar Informe de Reparo"}
                </button>
                <span className="text-xs text-text-muted">
                  El PDF incluirá las discrepancias detectadas.
                </span>
              </div>
            )}
          </section>
        )}

        {/* Empty state */}
        {estado === "IDLE" && !todosListos && (
          <section className="text-center py-12">
            <div className="text-5xl mb-4">📑</div>
            <h3 className="font-semibold text-foreground text-lg">
              Selecciona los 3 documentos para comenzar
            </h3>
            <p className="text-sm text-text-muted mt-2 max-w-md mx-auto">
              El sistema acepta <strong>PDFs</strong> y{" "}
              <strong>fotografías de celular</strong> (JPEG, PNG, WebP).
              Las fotos serán analizadas directamente con IA Vision.
            </p>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-auto">
        <div className="mx-auto max-w-5xl px-6 py-4 flex items-center justify-between text-xs text-text-muted">
          <span>SINAPSIS — Sistema de Resolución de Pago v1.1</span>
          <span>Soporta PDFs y fotos • Procesamiento seguro</span>
        </div>
      </footer>
    </div>
  );
}
