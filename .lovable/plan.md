# Presentación Final: TechScreen AI — TA Portal

**Autor:** Ricardo Agüero Maguiña
**Formato:** PPTX 16:9 (1920×1080), generado con pptxgenjs, entregado en `/mnt/documents/TechScreen_AI_Trabajo_Final.pptx`.
**Estilo visual:** Ejecutivo minimalista alineado a la app (Light Executive B2B). Paleta Midnight Executive: navy `#1E2761` como dominante, ice blue `#CADCFC` de soporte, blanco `#FFFFFF` y un accent indigo `#4F46E5` (coherente con los botones indigo-600 de la plataforma). Tipografía: Georgia para titulares, Calibri para cuerpo. Sin emojis, sin la palabra "testing" (se usa "evaluación técnica" / "validación de código"), cargo "FullStack Web Developer Senior" siempre en una sola línea.

## Estructura propuesta (14 slides)

1. **Portada** — TechScreen AI · TA Portal. Subtítulo: "Trabajo Final · Reclutamiento IT potenciado por IA generativa". Autor: Ricardo Agüero Maguiña. Fecha y contexto académico.
2. **Agenda** — Problema, Solución, Demo, Nuevas Funcionalidades, Gobierno de Datos, Impacto/ROI, Roadmap, Cierre.
3. **El cuello de botella operativo** — Stat hero 40% + Time to Fill 5-7 días + costo de oportunidad (versión pulida del slide 2 original).
4. **La palanca de la IA** — Comparativa 2 columnas: ATS tradicional (parser literal) vs TechScreen AI (evaluación semántica LLM). Mantiene contenido original con mejor jerarquía.
5. **Arquitectura de la solución** — Diagrama de flujo: Reclutador → Upload CV+JD → Edge Function (Gemini) → Anonimización → Diagnóstico → Guía Phone Screen → Reanálisis → CV Harvard. Stack: React + Tailwind + Supabase + Gemini.
6. **Demo del MVP** — Screenshot del analizador con 3 callouts (Upload consentido, Score con evidencia, CV Harvard exportable).
7. **NUEVA · Flujo de 3 fases del reclutador** — Diagnóstico inicial → Guía Phone Screen (validación con candidato) → Score actualizado con evidencia → Generación CV Harvard bajo demanda. Explica por qué el CV Harvard ya no se genera en el paso 1.
8. **NUEVA · Guía de Phone Screen inteligente** — Panel de preguntas de validación autogeneradas por la IA a partir de brechas detectadas; el reclutador captura respuestas del candidato y la plataforma recalcula el Match Score sumando la nueva evidencia. Incluye microcopy del botón "Actualizar score con respuestas".
9. **NUEVA · Recalibración de score con evidencia** — Panel de "Mejoras": score inicial vs actualizado, delta en puntos, breakdown Keywords/Experiencia/Estructura y chips de evidencia validada. Refuerza objetividad del proceso.
10. **NUEVA · Dashboard Ejecutivo (ROI)** — KPIs conectados a datos reales: perfiles evaluados, match promedio, mejora post Phone Screen, tasa de conversión a CV Harvard. Gráficos Recharts + tabla de vacantes + export PDF/jsPDF.
11. **Gobierno de datos crítico** — Ley 29733 (consentimiento opt-in), anonimización previa (DNI/edad/género), RLS por sesión, rate limiting. Versión mejorada del slide 5 original.
12. **Impacto medible y KPIs SMART** — 20 min → 2 min por perfil, Match Score de terna final > 80%, mejora promedio +X pts post Phone Screen.
13. **Modelo de ROI conservador** — Fórmula ROI, supuestos, ejemplo numérico simple (proyectado vs validado). Basado en el slide 7 original con mejor tipografía.
14. **Roadmap y cierre** — Próximos pasos (auth por reclutador, export Excel, alertas de vacantes de bajo lineamiento). Slide de agradecimiento + "¿Preguntas?" + créditos a Ricardo Agüero Maguiña.

## Detalles técnicos

- Se usa la skill PPTX con `pptxgenjs` desde Node en el sandbox.
- Layouts variados por slide (hero, 2 columnas, timeline, grid 2×2, stat cards, diagrama de flujo) para evitar monotonía.
- Screenshot del dashboard: se captura vía Playwright de `http://localhost:8080/dashboard` y `/` para tener imágenes reales del MVP (embebidas base64 en el pptx).
- QA obligatorio: convertir a PDF con LibreOffice, renderizar cada slide con `pdftoppm`, revisar con `code--view` y corregir overflow/contraste antes de entregar.
- No se toca código de la aplicación. Único entregable: el archivo `.pptx` en `/mnt/documents/`.

## Fuera de alcance

- No se modifica la app web ni la base de datos.
- No se incluye branding/logo externo salvo el nombre "TechScreen AI".
- El PDF original se usa solo como referencia de contenido; no se reutiliza su maqueta.
