import Link from "next/link";
import {
  Shield,
  FileText,
  CheckCircle,
  Upload,
  Brain,
  GitCompareArrows,
  FileOutput,
  ArrowRight,
  BookOpen,
  ChevronRight,
} from "lucide-react";

/**
 * Landing Page — PROYECTO SINAPSIS
 *
 * Página institucional corporativa que presenta el sistema
 * de Resolución de Pago automatizada del Ejército de Chile.
 */

// =============================================================================
// DATOS ESTÁTICOS
// =============================================================================

const BENEFICIOS = [
  {
    icono: Shield,
    titulo: "A prueba de Auditorías",
    descripcion:
      "Trazabilidad completa y validación milimétrica entre Órdenes de Compra, Facturas y Actas de Recepción. Cada resolución incluye el detalle de los checks realizados.",
  },
  {
    icono: FileText,
    titulo: "Procesamiento Multimodal",
    descripcion:
      "Capacidad de extraer datos tanto de documentos PDF nativos como de fotografías tomadas en terreno con el celular. La IA interpreta ambos formatos con precisión.",
  },
  {
    icono: CheckCircle,
    titulo: "Cero Errores de Tipeo",
    descripcion:
      "Generación automática del acto administrativo (Resolución Exenta) en formato PDF, listo para firma electrónica. Sin intervención manual en la transcripción.",
  },
];

const PASOS_PIPELINE = [
  {
    numero: "01",
    icono: Upload,
    titulo: "Ingesta",
    descripcion: "Carga de documentos PDF o fotografías desde el celular.",
  },
  {
    numero: "02",
    icono: Brain,
    titulo: "Extracción IA",
    descripcion: "Lectura óptica avanzada mediante modelo de lenguaje Vision.",
  },
  {
    numero: "03",
    icono: GitCompareArrows,
    titulo: "Motor Lógico",
    descripcion: "Cruce determinista de RUT, montos e ítems presupuestarios.",
  },
  {
    numero: "04",
    icono: FileOutput,
    titulo: "Generación",
    descripcion: "Resolución de pago estructurada en formato oficial.",
  },
];

// =============================================================================
// COMPONENTES
// =============================================================================

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-[#0f172a]">
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* NAVEGACIÓN                                                        */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <nav className="sticky top-0 z-50 border-b border-[#e2e8f0] bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1e3a8a]">
              <Shield className="h-5 w-5 text-white" strokeWidth={2} />
            </div>
            <div>
              <span className="text-sm font-bold tracking-tight text-[#0f172a]">
                SINAPSIS
              </span>
              <span className="ml-2 hidden text-xs text-[#64748b] sm:inline">
                Ejército de Chile
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-lg bg-[#1e3a8a] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#1e40af] active:scale-[0.97]"
            >
              Ingresar al Sistema
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </nav>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* HERO SECTION                                                      */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#0f172a] via-[#1e293b] to-[#1e3a8a]">
        {/* Patrón de fondo sutil */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "40px 40px",
          }}
        />

        <div className="relative mx-auto max-w-6xl px-6 py-24 md:py-32">
          <div className="max-w-3xl">
            {/* Badge */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#334155] bg-[#1e293b]/80 px-4 py-1.5 text-xs font-medium text-[#94a3b8]">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Sistema operativo v1.2
            </div>

            {/* Título */}
            <h1 className="text-4xl font-extrabold tracking-tight text-white md:text-5xl lg:text-6xl">
              PROYECTO{" "}
              <span className="bg-gradient-to-r from-[#60a5fa] to-[#93c5fd] bg-clip-text text-transparent">
                SINAPSIS
              </span>
            </h1>

            {/* Subtítulo */}
            <p className="mt-3 text-lg font-medium text-[#93c5fd] md:text-xl">
              Automatización Financiera y Resolución de Pagos
            </p>

            {/* Descripción */}
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-[#cbd5e1] md:text-lg">
              Plataforma impulsada por Inteligencia Artificial y validación
              determinista para auditar, cruzar y generar resoluciones de pago
              con cero margen de error.
            </p>

            {/* CTAs */}
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link
                href="/dashboard"
                className="group inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 text-sm font-bold text-[#1e3a8a] shadow-lg transition-all hover:bg-[#f1f5f9] hover:shadow-xl active:scale-[0.97]"
              >
                Ingresar al Sistema
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <a
                href="#como-funciona"
                className="inline-flex items-center gap-2 rounded-xl border border-[#475569] px-6 py-3.5 text-sm font-semibold text-[#cbd5e1] transition-all hover:border-[#64748b] hover:bg-[#1e293b] hover:text-white"
              >
                <BookOpen className="h-4 w-4" />
                Ver Documentación
              </a>
            </div>

            {/* Métricas rápidas */}
            <div className="mt-14 flex flex-wrap gap-10 border-t border-[#334155] pt-8">
              {[
                ["< 10 seg", "Tiempo de procesamiento"],
                ["3 docs", "Validación simultánea"],
                ["100%", "Trazabilidad auditable"],
              ].map(([valor, label]) => (
                <div key={label}>
                  <p className="text-2xl font-bold text-white">{valor}</p>
                  <p className="mt-1 text-xs text-[#94a3b8]">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Gradiente inferior para transición suave */}
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white to-transparent" />
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SECCIÓN BENEFICIOS                                                */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section className="py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-6">
          {/* Header de sección */}
          <div className="mb-14 max-w-2xl">
            <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-[#1e40af]">
              Beneficios Clave
            </p>
            <h2 className="text-3xl font-bold tracking-tight text-[#0f172a] md:text-4xl">
              Diseñado para el estándar del sector público
            </h2>
            <p className="mt-4 text-base leading-relaxed text-[#64748b]">
              Cada componente del sistema fue construido bajo los principios de
              auditabilidad, precisión y cumplimiento normativo.
            </p>
          </div>

          {/* Grid de beneficios */}
          <div className="grid gap-6 md:grid-cols-3">
            {BENEFICIOS.map((beneficio) => {
              const Icono = beneficio.icono;
              return (
                <div
                  key={beneficio.titulo}
                  className="group rounded-2xl border border-[#e2e8f0] bg-white p-7 shadow-sm transition-all hover:border-[#bfdbfe] hover:shadow-md"
                >
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-[#eff6ff] text-[#1e40af] transition-colors group-hover:bg-[#1e40af] group-hover:text-white">
                    <Icono className="h-6 w-6" strokeWidth={1.8} />
                  </div>
                  <h3 className="mb-2 text-lg font-bold text-[#0f172a]">
                    {beneficio.titulo}
                  </h3>
                  <p className="text-sm leading-relaxed text-[#64748b]">
                    {beneficio.descripcion}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SECCIÓN CÓMO FUNCIONA (Pipeline)                                  */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section id="como-funciona" className="bg-[#f8fafc] py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-6">
          {/* Header */}
          <div className="mb-14 text-center">
            <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-[#1e40af]">
              Pipeline de Procesamiento
            </p>
            <h2 className="text-3xl font-bold tracking-tight text-[#0f172a] md:text-4xl">
              Cómo Funciona
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-[#64748b]">
              Cuatro etapas automatizadas transforman documentos crudos en una
              resolución de pago verificada y lista para firma.
            </p>
          </div>

          {/* Pipeline horizontal */}
          <div className="grid gap-0 md:grid-cols-4">
            {PASOS_PIPELINE.map((paso, index) => {
              const Icono = paso.icono;
              const esUltimo = index === PASOS_PIPELINE.length - 1;
              return (
                <div key={paso.numero} className="relative flex flex-col items-center text-center">
                  {/* Línea conectora (horizontal en desktop) */}
                  {!esUltimo && (
                    <div className="absolute right-0 top-10 z-0 hidden h-[2px] w-1/2 bg-gradient-to-r from-[#bfdbfe] to-[#93c5fd] md:block" />
                  )}
                  {index > 0 && (
                    <div className="absolute left-0 top-10 z-0 hidden h-[2px] w-1/2 bg-gradient-to-r from-[#93c5fd] to-[#bfdbfe] md:block" />
                  )}

                  {/* Círculo con ícono */}
                  <div className="relative z-10 mb-5 flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-[#bfdbfe] bg-white shadow-sm">
                    <Icono className="h-8 w-8 text-[#1e40af]" strokeWidth={1.6} />
                    <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#1e3a8a] text-[10px] font-bold text-white">
                      {paso.numero}
                    </span>
                  </div>

                  {/* Flecha vertical (mobile) */}
                  {!esUltimo && (
                    <div className="mb-4 flex items-center justify-center md:hidden">
                      <ChevronRight className="h-5 w-5 rotate-90 text-[#94a3b8]" />
                    </div>
                  )}

                  {/* Texto */}
                  <h3 className="mb-1.5 text-base font-bold text-[#0f172a]">
                    {paso.titulo}
                  </h3>
                  <p className="mb-8 max-w-[200px] text-xs leading-relaxed text-[#64748b] md:mb-0">
                    {paso.descripcion}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SECCIÓN CTA FINAL                                                 */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section className="bg-[#0f172a] py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-2xl font-bold text-white md:text-3xl">
            Comienza a procesar resoluciones de pago hoy
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-[#94a3b8]">
            Sube tus documentos, deja que la IA extraiga los datos y obtén una
            resolución exenta verificada en segundos.
          </p>
          <Link
            href="/dashboard"
            className="group mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-sm font-bold text-[#1e3a8a] shadow-lg transition-all hover:shadow-xl active:scale-[0.97]"
          >
            Ingresar al Sistema
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* FOOTER                                                            */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <footer className="border-t border-[#e2e8f0] bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-xs text-[#94a3b8] md:flex-row">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-[#cbd5e1]" />
            <span>
              SINAPSIS — Sistema Integrado de Nivelación y Aprobación de Pagos
              y Saldos Institucionales
            </span>
          </div>
          <span>Procesamiento seguro en memoria. Sin almacenamiento de datos.</span>
        </div>
      </footer>
    </div>
  );
}
