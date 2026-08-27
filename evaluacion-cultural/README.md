# Evaluación cultural · Panel de evaluados

Plataforma web para medir la **cultura organizacional** por persona y dimensión. Reutiliza
la misma herramienta y el mismo sistema de diseño del panel de headcount, pero con su
propio dominio: lo único que cambia son **los evaluados** y los valores culturales medidos.

Es una **versión estándar y autónoma**: funciona de inmediato con datos de ejemplo y
guarda las ediciones en el navegador (localStorage). No requiere backend para revisarla.

## Módulos

| Ruta | Qué hace |
| --- | --- |
| `/` | Dashboard: KPIs (índice cultural, brecha vs meta, cobertura, dimensión más baja), evolución del índice por trimestre contra la meta, puntaje por dimensión (barras o radar), ranking de evaluados y la matriz jerárquica Empresa → Área → Evaluado con el índice por trimestre. Clic en cualquier celda abre el detalle de la persona. |
| `/evaluaciones` | Carga de calificaciones: edición directa del puntaje (1–5) por evaluado y dimensión, descarga de plantilla `.xlsx`, importación y exportación por periodo. |
| `/metas` | Objetivo de puntaje por dimensión y año, editable con stepper. Alimenta el cálculo de brechas del dashboard. |
| `/configuracion` | Reglas de homologación: agrupa un nombre histórico (empresa, área o cargo) bajo el nombre nuevo en todo el dashboard, sin tocar los registros. Ignora tildes, mayúsculas y espacios. |
| `/accesos` | Gestión de administradores autorizados. |
| `/login` | Acceso administrativo. |

## Modelo de datos

- **Evaluado**: persona evaluada (nombre, empresa, área, cargo).
- **Dimensión**: valor cultural medido en escala 1–5 (Integridad, Trabajo en equipo, Orientación al cliente, Innovación, Compromiso, Comunicación, Liderazgo, Adaptabilidad).
- **Evaluación**: puntaje de un evaluado en una dimensión, en un periodo (cierre trimestral).
- **Meta**: objetivo de puntaje por dimensión y año.
- El **índice cultural** de un evaluado es el promedio de sus dimensiones. La **brecha (Δ)** es `índice − meta`.

## Escala

| 1 | 2 | 3 | 4 | 5 |
| --- | --- | --- | --- | --- |
| En desarrollo | Básico | Competente | Destacado | Referente |

## Acceso de administrador

La administradora principal es **astrid.sevillap@gmail.com** (`OWNER_EMAIL` en `src/lib/seed.ts`).
Desde `/login` ingresa con ese correo y desde `/accesos` puede autorizar a otras personas.

> La autenticación de esta versión estándar es una **puerta de demostración** basada en
> localStorage (valida el correo contra la lista de autorizados, en el navegador). No es
> seguridad real. Para producción se conecta un proveedor de identidad (p. ej. Supabase
> Auth) y se validan los administradores en el servidor — la capa de datos está aislada en
> `src/lib/data.ts` y `src/lib/auth.ts` para facilitar ese reemplazo.

## Stack

- **Next.js 15** (App Router) + **Tailwind CSS v4**, tipografía Geist, iconos Phosphor.
- **Recharts** para gráficos (evolución, barras, radar).
- **SheetJS (xlsx)** para plantillas, importación y exportación de Excel.
- Datos semilla en `src/lib/seed.ts`; ediciones persistidas en localStorage vía `src/lib/data.ts`.

## Desarrollo local

```bash
cd evaluacion-cultural
npm install
npm run dev
```

Abre http://localhost:3000.

## Personalizar los evaluados

Edite la lista `EVALUADOS` en `src/lib/seed.ts` (o cargue una plantilla desde `/evaluaciones`).
Las dimensiones culturales se definen en `DIMENSIONES` del mismo archivo.
