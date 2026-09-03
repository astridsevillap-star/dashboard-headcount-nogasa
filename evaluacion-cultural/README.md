# Evaluación cultural 2026 · Panel de resultados

Plataforma de **evaluación cultural 360° ascendente** para el equipo de ventas: cada nivel
evalúa a sus líderes en 5 competencias, y el dashboard consolida los resultados por persona,
competencia, nivel, área y región. Replica la herramienta y el cuestionario de la evaluación
cultural original, con el padrón real de la organización.

Versión estándar y autónoma: funciona de inmediato con el padrón real + respuestas de ejemplo,
y guarda las ediciones en el navegador (localStorage). La capa de datos está aislada para
conectar un backend real (p. ej. Supabase) sin tocar la interfaz.

## Modelo

- **Padrón**: 96 personas (hoja *Base de Evaluados*), con DNI, cargo, gerencia, área, nivel y región.
- **Niveles**: N1 Gerente · N2 Regional / Líder de producto · N3 Jefe / Supervisor · N4 Vendedor.
- **Evaluados** (reciben evaluación): N1, N2 y N3. Los **N4 son evaluadores**.
- **Relación (ascendente):**
  - N4 → evalúan a los **N3** de su misma **área/segmento** (Detalle, LPC, Supermercado, Home Care).
  - N3 → evalúan a su **N2** de la misma **región** (donde hay región disponible).
  - N2 → evalúan al **N1 Gerente**.
- **Competencias**: Creatividad, Autonomía, Competitividad, Empatía, Integración.
- **Cuestionario** (conductas observables, replicadas del original), por audiencia:
  - Colaborador: 1 pregunta por competencia.
  - Jefatura / Líderes: hasta 4 preguntas por competencia (20 activas).
- **Escala** 1–5 (Nunca · Rara vez · A veces · Frecuentemente · Siempre). Editable.
- **Índice cultural** de un evaluado = promedio de sus competencias. **Brecha (Δ)** = índice − meta.
  Las respuestas son **anónimas y agregadas**.

## Módulos

| Ruta | Qué hace |
| --- | --- |
| `/` | Dashboard de resultados: KPIs (índice, brecha, participación, competencia más baja), radar y barras por competencia, ranking de evaluados y matriz Área → Evaluado con puntaje por competencia y participación. Clic en un evaluado abre su detalle. |
| `/evaluar` | Registrar una evaluación: elige a la persona evaluada y responde cada conducta observable (1–5). Suma a los resultados de forma anónima. |
| `/configuracion` | Pestañas **Preguntas** (activar/desactivar y editar por competencia y audiencia) y **Personas** (editar el padrón, nivel, área y región). |
| `/metas` | Objetivo de puntaje por competencia. |
| `/accesos` | Administradores autorizados. |
| `/login` | Acceso administrativo. |

## Acceso de administrador

Administradora principal: **astrid.sevillap@gmail.com** (`OWNER_EMAIL` en `src/lib/seed.ts`).
Ingresa en `/login` con ese correo; desde `/accesos` autoriza a otras personas.

> Autenticación de demostración (valida el correo contra la lista de autorizados en el
> navegador). Para producción se conecta un proveedor de identidad real.

## Stack

- **Next.js 15** (App Router) + **Tailwind CSS v4**, tipografía Geist, iconos Phosphor.
- **Recharts** para radar y barras por competencia.
- Padrón real en `src/lib/roster.ts` (generado desde `Encuesta_Ventas.xlsx`); cuestionario en
  `src/lib/seed.ts`; agregaciones y persistencia en `src/lib/data.ts`.

## Desarrollo local

```bash
cd evaluacion-cultural
npm install
npm run dev
```

## Personalizar

- **Personas**: edita el padrón en `/configuracion → Personas` o el archivo `src/lib/roster.ts`.
- **Preguntas / competencias**: `/configuracion → Preguntas` o `src/lib/seed.ts`.
- **¿Evaluar también a los N4?** cambia `EVALUAR_NIVELES` en `src/lib/data.ts`.
