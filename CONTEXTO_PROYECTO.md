# CONTEXTO_PROYECTO.md — Fuente de Verdad

## 📋 Nombre del Proyecto
**Resolución de Pago Automatizada** (RPA-Docs)

## 🎯 Objetivo
Sistema web para automatizar la generación de "Resoluciones de Pago" en el sector público chileno. Recibe 3 documentos PDF (Factura, Orden de Compra, Acta de Recepción Conforme), extrae los datos clave mediante un LLM, valida que los datos coincidan (RUT, montos, ítems) y genera automáticamente un documento PDF final (la Resolución de Pago) listo para firma electrónica.

## 🏗️ Arquitectura

### Flujo de Datos
```
[3 PDFs] → [Extracción Texto] → [LLM → JSON Zod] → [Validación TS] → [PDF Resolución]
```

### Módulos
| Módulo | Archivo | Responsabilidad |
|--------|---------|----------------|
| Extracción | `src/lib/pdf-extractor.ts` | PDF binario → texto plano |
| LLM | `src/lib/llm-extractor.ts` | Texto → JSON estructurado (Zod) |
| Validación | `src/lib/validator.ts` | Comparar RUT/montos/ítems |
| Generación | `src/lib/pdf-generator.ts` | Datos validados → PDF final |

### Principio Crítico
> **El LLM solo EXTRAE datos.** La VALIDACIÓN es código TypeScript determinístico.

## 🛠️ Stack Tecnológico
- **Framework:** Next.js 15 (App Router) + TypeScript
- **Estilos:** TailwindCSS
- **PDF Lectura:** pdf-parse
- **PDF Generación:** pdf-lib
- **LLM:** OpenAI API (gpt-4o)
- **Validación:** Zod (esquemas estrictos)

## 📂 Estructura de Carpetas
```
src/
├── app/
│   ├── api/upload/       # POST: Recibir y extraer texto de PDFs
│   ├── api/extract/      # POST: LLM extracción estructurada
│   ├── api/validate/     # POST: Validación cruzada
│   └── api/generate/     # POST: Generar PDF de resolución
├── lib/
│   ├── schemas.ts        # Esquemas Zod + interfaces
│   ├── pdf-extractor.ts  # Extractor de texto PDF
│   ├── llm-extractor.ts  # Llamada al LLM
│   ├── validator.ts      # Validación cruzada
│   └── pdf-generator.ts  # Generador del PDF final
├── components/           # Componentes React de la UI
└── types/index.ts        # Tipos globales
```

## 🔒 Seguridad
- API Keys **solo** en `.env.local` (jamás en código)
- PDFs procesados **en memoria**, nunca almacenados en disco
- RUTs tratados como **PII** bajo Ley 19.628
- Límite de archivo: **10MB** por PDF

## 📅 Roadmap
- [x] Paso 1: Inicialización, esquemas Zod, estructura
- [x] Paso 2: Route Handler carga + extracción de texto
- [x] Paso 3: Integración LLM (extracción estructurada)
- [x] Paso 4: Validación cruzada (TypeScript puro)
- [x] Paso 5: Generación PDF + UI
