El Dashboard actual tiene buena estructura base, pero aun está construido sobre datos mock de demostración. Para que gerencia tome decisiones de operación, calidad y ROI, propongo evolucionarlo de "reporte estático" a "panel de control operativo" con datos reales y comparativas.

## 1. KPIs principales que gerencia necesita ver

Sustituir los 3 KPIs actuales por métricas directamente ligadas al negocio de reclutamiento técnico:

- **Perfiles evaluados** — total de análisis ejecutados en el período seleccionado.
- **Match Score promedio** — porcentaje de lineamiento promedio de todos los candidatos evaluados.
- **Mejora promedio post-phone screen** — delta promedio entre score inicial y score actualizado tras respuestas del candidato.
- **Tiempo promedio por evaluación** — estimación de minutos ahorrados vs revisión manual.
- **Perfiles descartados por bajo lineamiento** — % de candidatos con score inferior a un umbral configurable (ej. 60%).
- **Tasa de CVs Harvard generados** — cuántos perfiles llegaron a la etapa final de CV estandarizado.

## 2. Visualizaciones recomendadas

- **Line chart de evolución temporal** — evaluaciones diarias/semanales y Match Score promedio para detectar tendencias.
- **Bar chart por reclutador** — mantener el actual, pero agregando volumen y calidad promedio por persona.
- **Distribución de scores** — histograma o donut que muestre cuántos candidatos caen en rangos: alto (>=80%), medio (60-79%), bajo (<60%).
- **Comparativo por vacante** — score promedio, cantidad de CVs analizados y tasa de descarte por posición.
- **Funnel de conversión** — etapas: Evaluación inicial → Phone Screen completado → Score actualizado → CV Harvard generado.

## 3. Tablas con datos accionables

- **Últimos perfiles evaluados** — candidato, vacante, reclutador, score inicial, score actualizado, fecha, acción rápida "Ver análisis".
- **Vacantes activas** — posición, estado, CVs analizados, score promedio, candidatos en pipeline, tiempo promedio.
- **Ranking de reclutadores** — volumen, score promedio de sus candidatos, eficiencia.

Reglas de UI: cargos como "FullStack Web Developer Senior" deben mostrarse con `whitespace-nowrap`. Sin emojis y sin la palabra "testing".

## 4. Filtros y contexto temporal

Agregar un control de período en la parte superior:
- Hoy / Últimos 7 días / Últimos 30 días / Mes actual / Personalizado.
- Filtros secundarios: por reclutador y por vacante.

Esto permite que el dashboard refleje el momento real del equipo y no solo datos de demostración.

## 5. Datos: backend vs mock data

El dashboard actual usa datos quemados. Para ser útil, debe consumir datos reales de la aplicación:

- Opción A (mínima viable): persistir en base de datos cada análisis completado con campos como fecha, reclutador, vacante, candidato, score_inicial, score_actualizado, respuestas, cv_generado.
- Opción B (más completa): mantener mock data mejorada solo para el primer login/demostración, pero mostrar un banner indicando que se conecta con datos reales cuando haya registros.

Recomendación: implementar Opción A con una tabla `analysis_sessions` en la base de datos y exponerla a través de una función edge function o directamente por RLS.

## 6. Exportación y descargas

- Mantener PDF de reporte gerencial.
- Agregar exportación CSV/Excel de:
  - Perfiles evaluados del período.
  - Vacantes con métricas.
  - Ranking de reclutadores.

## 7. UX y accesibilidad

- Estados vacíos: cuando no hay datos del período, mostrar un mensaje limpio y una CTA al Analizador de Perfiles.
- Loading skeletons mientras se cargan datos del backend.
- Tooltips explicativos en cada KPI para que gerencia entienda la fórmula.

## 8. Plan de implementación sugerido

Fase 1 — Diseño y datos
- Crear tabla `analysis_sessions` con campos: id, created_at, recruiter_email, position, candidate_name, initial_score, updated_score, harvard_generated, anonimized.
- Insertar registro desde `src/pages/Index.tsx` al completar cada análisis.
- Crear edge function `get-dashboard-metrics` que agrupe por fecha, reclutador y vacante.

Fase 2 — UI del dashboard
- Reemplazar KPIs mock por tarjetas reales con tooltips.
- Agregar filtros de período y selector de vacante/reclutador.
- Agregar gráficos de evolución temporal y distribución de scores.
- Agregar tabla de últimos perfiles evaluados.

Fase 3 — Exportación
- Ampliar PDF con nuevas métricas.
- Agregar botón "Exportar CSV".

Fase 4 — Validación
- Verificar que no aparezcan emojis ni la palabra "testing".
- Verificar que cargos técnicos usen `whitespace-nowrap`.
- Probar exportación PDF/CSV con datos reales.

## Pregunta de decisión para continuar

Antes de implementar, necesito confirmar: ¿prefieres que conecte el dashboard a datos reales de los análisis (requiere crear tabla y persistir cada evaluación) o que primero mejore el UI con datos mock más realistas y luego conectemos al backend? También, ¿hay alguna métrica específica que gerencia ya esté pidiendo y deba priorizar?