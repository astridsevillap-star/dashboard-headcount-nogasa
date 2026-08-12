# Headcount · Panel de dotación

Dashboard web de headcount conectado a Supabase y desplegado en Vercel. Reemplaza el
flujo de Excel: carga mensual de la nómina, presupuesto editable en la plataforma y
un panel comparativo con detalle hasta el nivel de cargo y persona.

> Repositorio oficial conectado al proyecto `dashboard-headcount-nogasa` en Vercel.

## Módulos

| Ruta | Qué hace |
| --- | --- |
| `/` | Dashboard: KPIs (dotación, presupuesto, cobertura, altas, bajas), evolución mensual contra presupuesto, comparativo por dotación, altas y bajas, mayores brechas por cargo y la matriz jerárquica Dotación → Categoría → Cargo con HC y diferencia por mes. Clic en cualquier celda abre el detalle de personas de ese corte. |
| `/datos` | Carga mensual: descarga de plantilla `.xlsx`, subida con validación y vista previa, reemplazo por mes completo y gestión de meses cargados. |
| `/presupuesto` | Presupuesto de posiciones por año: edición fila por fila en la plataforma (cantidad con stepper, campos editables, agregar y eliminar), importación por plantilla, copia entre años. |
| `/configuracion` | Reglas de homologación: cuando un nombre cambia (área, categoría, cargo o dotación), una regla agrupa el valor histórico bajo el nombre nuevo en todo el dashboard, sin modificar los registros guardados. La coincidencia ignora tildes, mayúsculas y espacios, y también reemplaza el segmento dentro de nombres compuestos (p. ej. "JEFE DE CAPITAL HUMANO" pasa a "JEFE DE GESTIÓN DE PERSONAS"). |

## Semántica de conteo

- Cada fila de la data mensual es una persona en la foto de ese mes (`FECHA DATA` = primer día del mes).
- Una persona cuenta como **activa** en un mes si `FECHA CESE` está vacía o es posterior al fin de ese mes. El selector "Activos | Todos" del dashboard alterna entre ambas vistas.
- **Altas** de un mes: DNI activos que no estaban activos el mes anterior. **Bajas**: lo inverso.
- La **diferencia (Δ)** de cada celda es `HC del mes − presupuesto del año`. Si un año no tiene presupuesto cargado se usa como base el año más reciente disponible (se indica en el KPI).

## Stack

- **Next.js 15** (App Router) + **Tailwind CSS v4**, tipografía Geist, iconos Phosphor.
- **Recharts** para gráficos, **SheetJS (xlsx)** para plantillas, lectura y exportación de Excel.
- **Supabase** (Postgres + PostgREST) como base de datos, con RPCs para agregados:
  - `headcount_records`: una fila por persona y mes.
  - `budget_positions`: posiciones presupuestadas por año con cantidad (editable).
  - `hc_aggregate_json`, `hc_movimientos_json`, `hc_months`: agregados que alimentan el dashboard sin bajar filas crudas.
  - El detalle por celda consulta `headcount_records` con filtros.

## Desarrollo local

```bash
npm install
cp .env.example .env.local   # URL y publishable key de Supabase
npm run dev
```

Sin variables de entorno, el cliente usa como respaldo la URL y la clave publicable del
proyecto Supabase `headcount-dashboard` (las claves publicables son seguras de exponer;
el acceso a datos se gobierna con RLS en Supabase).

## Notas de datos

- El dashboard abre por defecto con el año en curso y la empresa NOGASA; ambos filtros se pueden cambiar.
- En la matriz y las brechas, el fondo rojo marca déficit contra presupuesto, el ámbar superávit y el verde se reserva para cuando la dotación es igual al presupuesto.
- Cada mes cargado se puede descargar como Excel desde Datos mensuales (data cruda, con los valores originales).
- El detalle de personas (drawer) siempre muestra el cargo/área/dotación tal como está en el registro histórico; la homologación es una vista agregada del dashboard, no reescribe los datos.
- Los meses se reemplazan completos al subir un archivo que los contenga: la carga es idempotente.
- La plantilla acepta los encabezados del Excel original (`FECHA DATA`, `HC CAT`, `CESADO`, etc.) además de los nombres nuevos; las fechas pueden venir como fecha de Excel o texto `dd/mm/aaaa`.
- La importación de presupuesto acepta el formato agregado (con `CANTIDAD`) y el formato del Excel original (una fila por puesto).
