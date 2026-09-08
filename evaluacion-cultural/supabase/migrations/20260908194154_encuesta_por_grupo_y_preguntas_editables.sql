create table if not exists public.ec_preguntas (
  id text primary key,
  competencia_id text not null check (competencia_id in ('creatividad','autonomia','competitividad','empatia','integracion')),
  texto text not null check (length(trim(texto)) > 0),
  activa boolean not null default true,
  orden integer not null check (orden > 0),
  updated_at timestamptz not null default now()
);
alter table public.ec_preguntas enable row level security;
revoke all on table public.ec_preguntas from anon, authenticated;

insert into public.ec_preguntas (id, competencia_id, texto, activa, orden) values
('q1','creatividad','Crea un entorno donde la experimentación y la creatividad son reconocidas y recompensadas.',true,1),
('q2','creatividad','Cuando alguien de su equipo propone una idea innovadora, la impulsa y ayuda a concretarla.',true,2),
('q3','creatividad','Estimula a su equipo a generar nuevas ideas y métodos de trabajo.',true,3),
('q4','creatividad','Propone regularmente ideas creativas sobre procesos, productos o procedimientos.',true,4),
('q5','autonomia','Delega responsabilidades que representan oportunidades reales de crecimiento para su equipo.',true,5),
('q6','autonomia','Asegura que los miembros de su equipo tengan acceso a oportunidades de desarrollo personal y profesional.',true,6),
('q7','autonomia','Al empoderar a otros, genera un clima motivador que energiza a todo el equipo.',true,7),
('q8','autonomia','Prepara activamente a sus colaboradores para asumir roles de mayor responsabilidad.',true,8),
('q9','competitividad','Establece metas ambiciosas que desafían a su equipo a superar los estándares habituales.',true,9),
('q10','competitividad','Motiva e impulsa a otros a dar lo mejor de sí en su trabajo.',true,10),
('q11','competitividad','Orienta a su área hacia niveles de rendimiento de excelencia en productos y/o servicios.',true,11),
('q12','competitividad','Promueve una cultura de mejora continua dentro de su área.',true,12),
('q13','empatia','Se comunica de manera empática cuando las personas de su equipo comparten sus problemas.',true,13),
('q14','empatia','Cuando da retroalimentación, lo hace de forma que impulsa la mejora en lugar de generar defensividad.',true,14),
('q15','empatia','Escucha de manera abierta y atenta las ideas de otros, incluso cuando no está de acuerdo.',true,15),
('q16','empatia','Genera confianza y apertura demostrando comprensión genuina ante las preocupaciones de su equipo.',true,16),
('q17','integracion','Construye equipos cohesionados con sentido de compromiso compartido.',true,17),
('q18','integracion','Crea un ambiente donde la participación en las decisiones es activamente fomentada.',true,18),
('q19','integracion','Coordina de manera regular con líderes de otras áreas de la organización.',true,19),
('q20','integracion','Al liderar grupos, asegura la colaboración y la resolución positiva de conflictos.',true,20)
on conflict (id) do nothing;

drop policy if exists ec_preguntas_public_read on public.ec_preguntas;
create policy ec_preguntas_public_read on public.ec_preguntas
for select to anon, authenticated using (true);
grant select on table public.ec_preguntas to anon, authenticated;

create or replace function public.ec_questions_get()
returns jsonb language sql security invoker set search_path to ''
as $function$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', q.id, 'competencia_id', q.competencia_id, 'texto', q.texto,
    'activa', q.activa, 'orden', q.orden
  ) order by q.orden), '[]'::jsonb)
  from public.ec_preguntas q;
$function$;

create or replace function public.ec_questions_replace(p_admin_key text, p_questions jsonb)
returns void language plpgsql security definer set search_path to ''
as $function$
declare configured_key text; item jsonb; item_id text; item_competencia text;
  item_texto text; item_activa boolean; item_orden integer;
begin
  select c.admin_key into configured_key from public.ec_config c where c.id = 1;
  if p_admin_key is null or p_admin_key <> configured_key then raise exception 'unauthorized'; end if;
  if jsonb_typeof(p_questions) <> 'array' or jsonb_array_length(p_questions) <> 20 then
    raise exception 'se requieren exactamente 20 preguntas';
  end if;
  delete from public.ec_preguntas;
  for item in select value from jsonb_array_elements(p_questions) loop
    item_id := item->>'id'; item_competencia := item->>'competencia_id';
    item_texto := trim(item->>'texto'); item_activa := coalesce((item->>'activa')::boolean, true);
    item_orden := (item->>'orden')::integer;
    if item_id is null or item_competencia not in ('creatividad','autonomia','competitividad','empatia','integracion')
      or item_texto is null or length(item_texto) = 0 then raise exception 'pregunta no válida'; end if;
    insert into public.ec_preguntas(id, competencia_id, texto, activa, orden, updated_at)
    values (item_id, item_competencia, item_texto, item_activa, item_orden, now());
  end loop;
end;
$function$;

revoke all on function public.ec_questions_get() from public;
revoke all on function public.ec_questions_replace(text, jsonb) from public;
grant execute on function public.ec_questions_get() to anon, authenticated;
grant execute on function public.ec_questions_replace(text, jsonb) to anon, authenticated;
