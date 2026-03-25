-- RECUPERACIÓN DE USUARIOS 'INVISIBLES' (HUÉRFANOS DE PERFIL)
-- Ejecuta este SQL en el panel de Supabase (SQL Editor)

INSERT INTO public.perfiles (id, nombre_completo, rol, creado_el, actualizado_el)
SELECT 
    id, 
    raw_user_meta_data->>'nombre_completo', 
    raw_user_meta_data->>'rol', 
    now(), 
    now()
FROM auth.users 
WHERE id NOT IN (SELECT id FROM public.perfiles)
ON CONFLICT (id) DO NOTHING;
