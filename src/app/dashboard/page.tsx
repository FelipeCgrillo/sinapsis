"use client";

/**
 * Dashboard — Sistema de Resolución de Pago SINAPSIS
 *
 * Interfaz principal para:
 * 1. Subir 3 documentos (PDF o fotografías)
 * 2. Procesar pipeline: Upload → Extract → Validate
 * 3. Ver resultado de validación
 * 4. Descargar Resolución de Pago en PDF
 */

import { useState, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Shield,
  FileText,
  ClipboardList,
  Camera,
  Upload,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Download,
  RotateCcw,
  ArrowLeft,
  Zap,
  Eye,
  Brain,
  GitCompareArrows,
  FileOutput,
  ChevronRight,
  ImageIcon,
} from "lucide-react";

// =============================================================================
// TIPOS
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

const MIME_PDF = "application/pdf";
const MIME_IMAGENES = ["image/jpeg", "image/png", "image/webp"];
const ACCEPT_STRING = ".pdf,image/jpeg,image/png,image/webp";

const DOC_CONFIG: {
  key: TipoDoc;
  label: string;
  icono: typeof FileText;
  descripcion: string;
}[] = [
    {
      key: "factura",
      label: "Factura Electrónica",
      icono: FileText,
      descripcion: "PDF o foto de la factura del proveedor",
    },
    {
      key: "ordenCompra",
      label: "Orden de Compra",
      icono: ClipboardList,
      descripcion: "PDF o foto de la OC aprobada",
    },
    {
      key: "actaRecepcion",
      label: "Acta de Recepción",
      icono: Camera,
      descripcion: "PDF o foto del acta de recepción conforme",
    },
  ];

const PASOS_PIPELINE: {
  estado: EstadoProceso;
  label: string;
  labelCorto: string;
  icono: typeof Upload;
  porcentaje: number;
}[] = [
    { estado: "CARGANDO", label: "Subiendo archivos al servidor...", labelCorto: "Ingesta", icono: Upload, porcentaje: 15 },
    { estado: "EXTRAYENDO", label: "Contenido procesado", labelCorto: "Procesado", icono: Eye, porcentaje: 30 },
    { estado: "ANALIZANDO", label: "Analizando con IA Vision...", labelCorto: "IA Vision", icono: Brain, porcentaje: 55 },
    { estado: "VALIDANDO", label: "Ejecutando validación cruzada...", labelCorto: "Validación", icono: GitCompareArrows, porcentaje: 80 },
    { estado: "COMPLETADO", label: "Proceso completado", labelCorto: "Completado", icono: FileOutput, porcentaje: 100 },
  ];

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export default function Dashboard() {
  const [archivos, setArchivos] = useState<
    Record<TipoDoc, ArchivoSeleccionado | null>
  >({
    factura: null,
    ordenCompra: null,
    actaRecepcion: null,
  });

  const [estado, setEstado] = useState<EstadoProceso>("IDLE");
  const [mensaje, setMensaje] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [resultado, setResultado] = useState<ResultadoCompleto | null>(null);
  const [descargando, setDescargando] = useState(false);

  const inputRefs = useRef<Record<TipoDoc, HTMLInputElement | null>>({
    factura: null,
    ordenCompra: null,
    actaRecepcion: null,
  });

  // ===========================================================================
  // HANDLERS
  // ===========================================================================

  const handleFileSelect = useCallback((tipo: TipoDoc, file: File | null) => {
    if (!file) return;

    const esImagen = MIME_IMAGENES.includes(file.type);
    const esPDF = file.type === MIME_PDF;

    if (!esImagen && !esPDF) {
      setError(`"${file.name}" no es un formato válido. Use PDF, JPEG, PNG o WebP.`);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError(`"${file.name}" excede el límite de 10MB.`);
      return;
    }

    setError("");

    const previewUrl = esImagen ? URL.createObjectURL(file) : undefined;

    setArchivos((prev) => {
      if (prev[tipo]?.previewUrl) URL.revokeObjectURL(prev[tipo]!.previewUrl!);
      return { ...prev, [tipo]: { file, nombre: file.name, esImagen, previewUrl } };
    });
  }, []);

  const todosListos = archivos.factura && archivos.ordenCompra && archivos.actaRecepcion;

  const procesarPago = useCallback(async () => {
    if (!todosListos) return;
    setError("");
    setResultado(null);

    try {
      // Paso 1: Upload
      setEstado("CARGANDO");
      setMensaje("Subiendo archivos al servidor...");

      const formData = new FormData();
      formData.append("factura", archivos.factura!.file);
      formData.append("ordenCompra", archivos.ordenCompra!.file);
      formData.append("actaRecepcion", archivos.actaRecepcion!.file);

      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
      if (!uploadRes.ok) {
        const err = await uploadRes.json();
        throw new Error(err.error || "Error al subir los archivos.");
      }

      const uploadData = await uploadRes.json();
      const contenidos = uploadData.data;

      setEstado("EXTRAYENDO");
      setMensaje("Contenido procesado correctamente");

      // Paso 2: Extract
      setEstado("ANALIZANDO");
      const tieneImagenes = [contenidos.factura, contenidos.ordenCompra, contenidos.actaRecepcion].some(
        (c: { tipo: string }) => c.tipo === "imagen"
      );
      setMensaje(tieneImagenes ? "Analizando documentos con IA Vision..." : "Analizando documentos con IA...");

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
        const err = await extractRes.json();
        throw new Error(err.error || "Error al analizar con IA.");
      }

      const extractData = await extractRes.json();

      // Paso 3: Validate
      setEstado("VALIDANDO");
      setMensaje("Ejecutando validación cruzada de documentos...");

      const validateRes = await fetch("/api/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(extractData.data),
      });

      if (!validateRes.ok) {
        const err = await validateRes.json();
        throw new Error(err.error || "Error en la validación cruzada.");
      }

      const validateData = await validateRes.json();

      setEstado("COMPLETADO");
      setMensaje("Proceso completado exitosamente");
      setResultado(validateData.data as ResultadoCompleto);
    } catch (err: unknown) {
      setEstado("ERROR");
      setError(err instanceof Error ? err.message : "Error inesperado del sistema.");
      setMensaje("");
    }
  }, [archivos, todosListos]);

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
        const err = await res.json();
        throw new Error(err.error || "Error al generar el PDF.");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Resolucion_Pago_SINAPSIS_${new Date().toISOString().split("T")[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al descargar.");
    } finally {
      setDescargando(false);
    }
  }, [resultado]);

  const reiniciar = useCallback(() => {
    Object.values(archivos).forEach((a) => {
      if (a?.previewUrl) URL.revokeObjectURL(a.previewUrl);
    });
    setArchivos({ factura: null, ordenCompra: null, actaRecepcion: null });
    setEstado("IDLE");
    setMensaje("");
    setError("");
    setResultado(null);
  }, [archivos]);

  // ===========================================================================
  // HELPERS UI
  // ===========================================================================

  const pasoActual = PASOS_PIPELINE.find((p) => p.estado === estado);
  const porcentaje = pasoActual?.porcentaje ?? 0;
  const enProceso = !["IDLE", "COMPLETADO", "ERROR"].includes(estado);
  const archivosCount = Object.values(archivos).filter(Boolean).length;

  // ===========================================================================
  // RENDER
  // ===========================================================================

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* HEADER                                                            */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-50 border-b border-[#e2e8f0] bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 text-sm text-[#64748b] hover:text-[#0f172a] transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Inicio</span>
            </Link>
            <div className="h-5 w-px bg-[#e2e8f0]" />
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1e3a8a]">
                <Shield className="h-4 w-4 text-white" strokeWidth={2} />
              </div>
              <div>
                <h1 className="text-sm font-bold text-[#0f172a] tracking-tight">
                  SINAPSIS
                </h1>
                <p className="text-[11px] text-[#94a3b8] leading-none -mt-0.5">
                  Panel de Procesamiento
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {archivosCount > 0 && estado === "IDLE" && (
              <span className="text-xs text-[#64748b] bg-[#f1f5f9] px-3 py-1.5 rounded-full border border-[#e2e8f0]">
                {archivosCount}/3 documentos
              </span>
            )}
            <div className="flex items-center gap-2 text-xs text-[#64748b] bg-[#f1f5f9] px-3 py-1.5 rounded-full border border-[#e2e8f0]">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Operativo
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        {/* ═════════════════════════════════════════════════════════════════ */}
        {/* PASO 1: CARGA DE DOCUMENTOS                                     */}
        {/* ═════════════════════════════════════════════════════════════════ */}
        <section className="mb-8">
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-1">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1e3a8a] text-[10px] font-bold text-white">
                1
              </span>
              <h2 className="text-base font-bold text-[#0f172a]">
                Cargar Documentos
              </h2>
            </div>
            <p className="text-sm text-[#64748b] ml-8">
              Selecciona los 3 documentos requeridos. Acepta <strong>PDF</strong> y{" "}
              <strong>fotografías</strong> (JPEG, PNG, WebP).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {DOC_CONFIG.map((doc) => {
              const sel = archivos[doc.key];
              const Icono = doc.icono;
              return (
                <div
                  key={doc.key}
                  onClick={() => !enProceso && inputRefs.current[doc.key]?.click()}
                  className={`
                    group relative cursor-pointer rounded-2xl border-2 p-5 transition-all duration-200
                    ${sel
                      ? "border-[#1e40af] bg-[#eff6ff] shadow-sm"
                      : "border-dashed border-[#cbd5e1] hover:border-[#93c5fd] hover:bg-[#f8fafc]"
                    }
                    ${enProceso ? "opacity-50 pointer-events-none" : ""}
                  `}
                >
                  {/* Preview de imagen */}
                  {sel?.esImagen && sel.previewUrl ? (
                    <div className="relative w-full h-24 mb-4 rounded-xl overflow-hidden bg-[#e2e8f0]">
                      <Image
                        src={sel.previewUrl}
                        alt={`Preview ${doc.label}`}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                      <div className="absolute top-2 right-2 flex items-center gap-1 bg-[#0f172a]/70 text-white text-[10px] font-semibold px-2 py-0.5 rounded-md backdrop-blur-sm">
                        <ImageIcon className="h-3 w-3" />
                        FOTO
                      </div>
                    </div>
                  ) : (
                    <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl transition-colors ${sel
                        ? "bg-[#1e40af] text-white"
                        : "bg-[#f1f5f9] text-[#64748b] group-hover:bg-[#dbeafe] group-hover:text-[#1e40af]"
                      }`}>
                      {sel && !sel.esImagen ? (
                        <CheckCircle2 className="h-6 w-6" strokeWidth={1.8} />
                      ) : (
                        <Icono className="h-6 w-6" strokeWidth={1.8} />
                      )}
                    </div>
                  )}

                  <h3 className="font-semibold text-[#0f172a] text-sm">{doc.label}</h3>
                  <p className="text-xs text-[#94a3b8] mt-1">{doc.descripcion}</p>

                  <div className="mt-3 min-h-[24px]">
                    {sel ? (
                      <div className="flex items-center gap-2 text-xs text-[#1e40af] font-medium">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span className="truncate max-w-[180px]">{sel.nombre}</span>
                        {sel.esImagen && (
                          <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-semibold shrink-0">
                            Foto
                          </span>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-[#94a3b8] group-hover:text-[#3b82f6] transition-colors flex items-center gap-1.5">
                        <Upload className="h-3 w-3" />
                        Click para seleccionar
                      </p>
                    )}
                  </div>

                  <input
                    ref={(el) => { inputRefs.current[doc.key] = el; }}
                    type="file"
                    accept={ACCEPT_STRING}
                    className="hidden"
                    onChange={(e) => handleFileSelect(doc.key, e.target.files?.[0] ?? null)}
                  />
                </div>
              );
            })}
          </div>
        </section>

        {/* ═════════════════════════════════════════════════════════════════ */}
        {/* ERROR                                                           */}
        {/* ═════════════════════════════════════════════════════════════════ */}
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
            <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-700 text-sm">Error en el procesamiento</p>
              <p className="text-sm text-red-600 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════ */}
        {/* BOTÓN PROCESAR                                                  */}
        {/* ═════════════════════════════════════════════════════════════════ */}
        <section className="mb-8">
          <div className="flex items-center gap-3">
            <button
              onClick={procesarPago}
              disabled={!todosListos || enProceso}
              className={`
                inline-flex items-center gap-2.5 rounded-xl px-7 py-3 text-sm font-bold transition-all duration-200
                ${todosListos && !enProceso
                  ? "bg-[#1e3a8a] text-white shadow-lg hover:bg-[#1e40af] hover:shadow-xl active:scale-[0.97]"
                  : "bg-[#e2e8f0] text-[#94a3b8] cursor-not-allowed"
                }
              `}
            >
              {enProceso ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  Procesar Resolución de Pago
                </>
              )}
            </button>

            {(estado === "COMPLETADO" || estado === "ERROR") && (
              <button
                onClick={reiniciar}
                className="inline-flex items-center gap-2 rounded-xl border border-[#e2e8f0] px-5 py-3 text-sm font-medium text-[#64748b] hover:bg-[#f1f5f9] transition-all"
              >
                <RotateCcw className="h-4 w-4" />
                Nuevo Proceso
              </button>
            )}
          </div>
        </section>

        {/* ═════════════════════════════════════════════════════════════════ */}
        {/* BARRA DE PROGRESO                                               */}
        {/* ═════════════════════════════════════════════════════════════════ */}
        {enProceso && (
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1e3a8a] text-[10px] font-bold text-white">
                2
              </span>
              <h2 className="text-base font-bold text-[#0f172a]">Pipeline en ejecución</h2>
            </div>

            <div className="rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-sm">
              {/* Progreso */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-[#0f172a]">{mensaje}</span>
                <span className="text-xs font-mono text-[#64748b] bg-[#f1f5f9] px-2 py-0.5 rounded">
                  {porcentaje}%
                </span>
              </div>
              <div className="w-full h-2.5 bg-[#e2e8f0] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#1e3a8a] to-[#3b82f6] rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${porcentaje}%` }}
                />
              </div>

              {/* Steps */}
              <div className="mt-5 flex items-center gap-1">
                {PASOS_PIPELINE.map((paso, i) => {
                  const activo = paso.estado === estado;
                  const pasado = paso.porcentaje < porcentaje;
                  const PasoIcono = paso.icono;
                  return (
                    <div key={paso.estado} className="flex items-center flex-1">
                      <div className={`flex flex-col items-center flex-1 ${activo ? "opacity-100" : pasado ? "opacity-80" : "opacity-40"
                        }`}>
                        <div className={`flex h-9 w-9 items-center justify-center rounded-xl mb-1.5 transition-colors ${activo
                            ? "bg-[#1e3a8a] text-white"
                            : pasado
                              ? "bg-emerald-100 text-emerald-600"
                              : "bg-[#f1f5f9] text-[#94a3b8]"
                          }`}>
                          {pasado ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : activo ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <PasoIcono className="h-4 w-4" strokeWidth={1.8} />
                          )}
                        </div>
                        <span className={`text-[11px] font-medium ${activo ? "text-[#1e3a8a]" : pasado ? "text-emerald-600" : "text-[#94a3b8]"
                          }`}>
                          {paso.labelCorto}
                        </span>
                      </div>
                      {i < PASOS_PIPELINE.length - 1 && (
                        <ChevronRight className={`h-3.5 w-3.5 shrink-0 mx-0.5 ${pasado ? "text-emerald-400" : "text-[#cbd5e1]"
                          }`} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* ═════════════════════════════════════════════════════════════════ */}
        {/* RESULTADO                                                       */}
        {/* ═════════════════════════════════════════════════════════════════ */}
        {resultado && estado === "COMPLETADO" && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1e3a8a] text-[10px] font-bold text-white">
                3
              </span>
              <h2 className="text-base font-bold text-[#0f172a]">Resultado de Validación</h2>
            </div>

            {/* Banner de estado */}
            <div className={`rounded-2xl border p-6 mb-5 ${resultado.validacion.estado === "APROBADO"
                ? "bg-emerald-50 border-emerald-200"
                : "bg-red-50 border-red-200"
              }`}>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${resultado.validacion.estado === "APROBADO"
                      ? "bg-emerald-100 text-emerald-600"
                      : "bg-red-100 text-red-600"
                    }`}>
                    {resultado.validacion.estado === "APROBADO" ? (
                      <CheckCircle2 className="h-7 w-7" strokeWidth={1.8} />
                    ) : (
                      <AlertTriangle className="h-7 w-7" strokeWidth={1.8} />
                    )}
                  </div>
                  <div>
                    <h3 className={`text-xl font-bold ${resultado.validacion.estado === "APROBADO" ? "text-emerald-800" : "text-red-800"
                      }`}>
                      {resultado.validacion.estado === "APROBADO"
                        ? "Resolución Aprobada"
                        : "Resolución con Reparo"}
                    </h3>
                    <p className="text-sm text-[#64748b] mt-0.5">
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
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-md hover:bg-emerald-700 hover:shadow-lg active:scale-[0.97] transition-all"
                  >
                    {descargando ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generando...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" />
                        Descargar Resolución
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Tabla de checks */}
            <div className="rounded-2xl border border-[#e2e8f0] bg-white overflow-hidden mb-5 shadow-sm">
              <div className="px-5 py-3.5 border-b border-[#e2e8f0] bg-[#f8fafc]">
                <h4 className="font-bold text-sm text-[#0f172a]">
                  Detalle de Validación Cruzada
                </h4>
              </div>
              <div className="divide-y divide-[#f1f5f9]">
                {[
                  { label: "RUT del proveedor coincide", valor: resultado.validacion.checks.rutCoincide },
                  { label: "Montos factura = recepción", valor: resultado.validacion.checks.montosCoinciden },
                  { label: "Monto OC suficiente", valor: resultado.validacion.checks.montoOCSuficiente },
                  { label: "Descripción consistente", valor: resultado.validacion.checks.descripcionConsistente },
                  { label: "Recepción conforme", valor: resultado.validacion.checks.recepcionConforme },
                ].map((check) => (
                  <div key={check.label} className="flex items-center justify-between px-5 py-3.5">
                    <span className="text-sm text-[#0f172a]">{check.label}</span>
                    <span className={`inline-flex items-center gap-1.5 text-sm font-semibold ${check.valor ? "text-emerald-600" : "text-red-600"
                      }`}>
                      {check.valor ? (
                        <><CheckCircle2 className="h-4 w-4" /> Aprobado</>
                      ) : (
                        <><XCircle className="h-4 w-4" /> Fallido</>
                      )}
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between px-5 py-3.5 bg-[#f8fafc]">
                  <span className="text-sm font-medium text-[#0f172a]">Ítem presupuestario</span>
                  <span className="text-sm font-mono text-[#1e40af]">
                    {resultado.validacion.checks.itemPresupuestario || "—"}
                  </span>
                </div>
              </div>
            </div>

            {/* Discrepancias */}
            {resultado.validacion.discrepancias.length > 0 && (
              <div className="rounded-2xl border border-red-200 bg-white overflow-hidden mb-5 shadow-sm">
                <div className="px-5 py-3.5 border-b border-red-100 bg-red-50 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <h4 className="font-bold text-sm text-red-700">
                    Discrepancias Detectadas ({resultado.validacion.discrepancias.length})
                  </h4>
                </div>
                <ul className="divide-y divide-[#f1f5f9]">
                  {resultado.validacion.discrepancias.map((disc, i) => (
                    <li key={i} className="px-5 py-3.5 text-sm text-[#0f172a] flex items-start gap-3">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 text-[10px] font-bold mt-0.5">
                        {i + 1}
                      </span>
                      {disc}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Botón REPARO */}
            {resultado.validacion.estado === "REPARO" && (
              <div className="flex items-center gap-3">
                <button
                  onClick={descargarResolucion}
                  disabled={descargando}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#e2e8f0] px-5 py-2.5 text-sm font-medium text-[#64748b] hover:bg-[#f1f5f9] transition-all"
                >
                  {descargando ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generando...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4" />
                      Descargar Informe de Reparo
                    </>
                  )}
                </button>
                <span className="text-xs text-[#94a3b8]">
                  El PDF incluirá las discrepancias detectadas.
                </span>
              </div>
            )}
          </section>
        )}

        {/* ═════════════════════════════════════════════════════════════════ */}
        {/* EMPTY STATE                                                     */}
        {/* ═════════════════════════════════════════════════════════════════ */}
        {estado === "IDLE" && !todosListos && (
          <section className="text-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#f1f5f9] mx-auto mb-4">
              <FileText className="h-8 w-8 text-[#94a3b8]" strokeWidth={1.5} />
            </div>
            <h3 className="font-bold text-[#0f172a] text-lg">
              Selecciona los 3 documentos para comenzar
            </h3>
            <p className="text-sm text-[#64748b] mt-2 max-w-md mx-auto">
              El sistema acepta <strong>PDFs</strong> y{" "}
              <strong>fotografías de celular</strong> (JPEG, PNG, WebP).
              Las fotos serán analizadas con IA Vision.
            </p>
          </section>
        )}
      </main>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* FOOTER                                                            */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <footer className="border-t border-[#e2e8f0] bg-white mt-8">
        <div className="mx-auto max-w-5xl flex items-center justify-between px-6 py-4 text-xs text-[#94a3b8]">
          <div className="flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5" />
            <span>SINAPSIS — Procesamiento seguro en memoria</span>
          </div>
          <span>Sin almacenamiento de datos</span>
        </div>
      </footer>
    </div>
  );
}
