import { NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase/client';

/**
 * Endpoint para que la APK o el trabajador pida su ruta de almacenamiento en Supabase.
 * POST /api/storage/provision
 * Body: { date: '2026-03-24', employeeId: '...' }
 */

export async function POST(req: Request) {
  try {
    const { date, employeeId } = await req.json();

    if (!date || !employeeId) {
      return NextResponse.json({ error: 'Faltan parámetros: date, employeeId' }, { status: 400 });
    }

    // 1. Construir la ruta lógica: evidencias/YYYY-MM-DD/EmployeeID
    const storagePath = `evidencias/${date}/${employeeId}`;

    // 2. Obtener URL pública (asumiendo que el bucket es público)
    const { data: { publicUrl } } = supabase
      .storage
      .from('evidencias')
      .getPublicUrl(`${date}/${employeeId}`);

    // 3. Guardar en workday_approval_status
    // Intentamos insertar o actualizar el registro de jornada
    const { error: upsertError } = await supabase
      .from('workday_approval_status')
      .upsert({
        employee_id: employeeId,
        date: date,
        storage_path: storagePath,
        storage_url: publicUrl, // URL base de la carpeta
        status: 'Borrador'
      }, { onConflict: 'employee_id, date' });

    if (upsertError) {
      console.error('Error saving storage info to DB:', upsertError);
    }

    return NextResponse.json({
      ok: true,
      storagePath: storagePath,
      publicUrl: publicUrl,
      bucket: 'evidencias'
    });

  } catch (error: any) {
    console.error('Storage Provisioning Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
