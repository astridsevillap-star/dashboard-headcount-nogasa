begin;

alter table public.ec_preguntas
  add column if not exists escala_max integer not null default 5;

alter table public.ec_preguntas
  drop constraint if exists ec_preguntas_competencia_id_check;
alter table public.ec_preguntas
  add constraint ec_preguntas_competencia_id_check
  check (competencia_id in ('creatividad','autonomia','competitividad','empatia','integracion','valoracion_general'));

alter table public.ec_preguntas
  drop constraint if exists ec_preguntas_escala_max_check;
alter table public.ec_preguntas
  add constraint ec_preguntas_escala_max_check
  check (escala_max in (5,10));

alter table public.ec_resultados add column if not exists d6 integer not null default 0;
alter table public.ec_resultados add column if not exists d7 integer not null default 0;
alter table public.ec_resultados add column if not exists d8 integer not null default 0;
alter table public.ec_resultados add column if not exists d9 integer not null default 0;
alter table public.ec_resultados add column if not exists d10 integer not null default 0;

create or replace function public.ec_questions_get()
returns jsonb language sql security invoker set search_path to ''
as $function$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', q.id,
    'competencia_id', q.competencia_id,
    'texto', q.texto,
    'activa', q.activa,
    'orden', q.orden,
    'escala_max', q.escala_max
  ) order by q.orden), '[]'::jsonb)
  from public.ec_preguntas q;
$function$;

create or replace function public.ec_questions_replace(p_admin_key text, p_questions jsonb)
returns void language plpgsql security definer set search_path to ''
as $function$
declare
  configured_key text;
  item jsonb;
  item_id text;
  item_competencia text;
  item_texto text;
  item_activa boolean;
  item_orden integer;
  item_escala integer;
begin
  select c.admin_key into configured_key from public.ec_config c where c.id = 1;
  if p_admin_key is null or p_admin_key <> configured_key then
    raise exception 'unauthorized';
  end if;
  if jsonb_typeof(p_questions) <> 'array' or jsonb_array_length(p_questions) <> 12 then
    raise exception 'se requieren exactamente 12 preguntas';
  end if;

  delete from public.ec_preguntas;
  for item in select value from jsonb_array_elements(p_questions)
  loop
    item_id := item->>'id';
    item_competencia := item->>'competencia_id';
    item_texto := trim(item->>'texto');
    item_activa := coalesce((item->>'activa')::boolean, true);
    item_orden := (item->>'orden')::integer;
    item_escala := coalesce((item->>'escala_max')::integer, 5);

    if item_id is null
       or item_competencia not in ('creatividad','autonomia','competitividad','empatia','integracion','valoracion_general')
       or item_texto is null or length(item_texto) = 0
       or item_escala not in (5,10)
       or (item_competencia = 'valoracion_general' and item_escala <> 10)
       or (item_competencia <> 'valoracion_general' and item_escala <> 5)
    then
      raise exception 'pregunta no válida';
    end if;

    insert into public.ec_preguntas(id, competencia_id, texto, activa, orden, escala_max, updated_at)
    values (item_id, item_competencia, item_texto, item_activa, item_orden, item_escala, now());
  end loop;
end;
$function$;

create or replace function public.ec_submit(p_evaluador_id text, p_answers jsonb)
returns text language plpgsql security definer set search_path to 'public'
as $function$
declare
  ev record;
  q record;
  v int;
  max_escala int;
begin
  if p_evaluador_id is null or length(p_evaluador_id) = 0 then
    raise exception 'evaluador requerido';
  end if;
  if exists (select 1 from ec_completions where evaluador_id = p_evaluador_id) then
    return 'already';
  end if;

  insert into ec_completions(evaluador_id) values (p_evaluador_id);

  for ev in select key as evaluado_id, value as answers from jsonb_each(p_answers) loop
    insert into ec_participacion(evaluado_id, respondientes) values (ev.evaluado_id, 1)
      on conflict (evaluado_id) do update set respondientes = ec_participacion.respondientes + 1;

    for q in select key as pregunta_id, value as score from jsonb_each_text(ev.answers) loop
      v := nullif(q.score, '')::int;
      select escala_max into max_escala
      from ec_preguntas
      where id = q.pregunta_id and activa = true;

      if (max_escala = 5 and v between 1 and 5)
         or (max_escala = 10 and v between 1 and 10) then
        insert into ec_resultados(evaluado_id, pregunta_id)
        values (ev.evaluado_id, q.pregunta_id)
        on conflict (evaluado_id, pregunta_id) do nothing;

        update ec_resultados set
          d1 = d1 + (v = 1)::int,
          d2 = d2 + (v = 2)::int,
          d3 = d3 + (v = 3)::int,
          d4 = d4 + (v = 4)::int,
          d5 = d5 + (v = 5)::int,
          d6 = d6 + (v = 6)::int,
          d7 = d7 + (v = 7)::int,
          d8 = d8 + (v = 8)::int,
          d9 = d9 + (v = 9)::int,
          d10 = d10 + (v = 10)::int
        where evaluado_id = ev.evaluado_id and pregunta_id = q.pregunta_id;
      end if;
    end loop;
  end loop;

  return 'ok';
end;
$function$;

delete from public.ec_preguntas;

insert into public.ec_preguntas (id, competencia_id, texto, activa, orden, escala_max) values
('q1','creatividad','Promueve e impulsa nuevas ideas para mejorar la forma de trabajo.',true,1,5),
('q2','creatividad','Gestiona y brinda soluciones oportunas a las problemáticas que se presentan en el trabajo diario.',true,2,5),
('q3','autonomia','Delega responsabilidades y genera oportunidades de desarrollo que preparan a su equipo para asumir mayores retos.',true,3,5),
('q4','autonomia','Acompaña en las rutas y hace seguimiento al trabajo diario de sus colaboradores, orientándolos para mejorar su desempeño.',true,4,5),
('q5','competitividad','Establece metas retadoras que impulsan a su equipo a alcanzar un alto nivel de desempeño.',true,5,5),
('q6','competitividad','Motiva e impulsa a su equipo a alcanzar un alto nivel de desempeño.',true,6,5),
('q7','competitividad','Hace seguimiento a los problemas y acuerdos planteados en las reuniones hasta su resolución.',true,7,5),
('q8','empatia','Se comunica con empatía y escucha de manera abierta las ideas y preocupaciones de su equipo.',true,8,5),
('q9','empatia','Brinda retroalimentación clara y constructiva, orientada a la mejora.',true,9,5),
('q10','integracion','Construye un equipo cohesionado y fomenta activamente su participación en la toma de decisiones.',true,10,5),
('q11','integracion','Mantiene una coordinación efectiva y frecuente con líderes de otras áreas de la organización.',true,11,5),
('q12','valoracion_general','En una escala del 1 al 10, ¿qué tan buen líder considera que es para el equipo?',true,12,10);

commit;
