import { NextResponse } from 'next/server';
import { provisionWorkdayFolder } from '@/lib/drive';
import { supabase } from '@/utils/supabase/client';

/**
 * Endpoint para que la APK o el trabajador pida su link de Drive para hoy.
 * POST /api/drive/provision
 * Body: { date: '2026-03-24', employeeId: '...' }
 */

export async function POST(req: Request) {
  try {
    const { date, employeeId } = await req.json();

    if (!date || !employeeId) {
      return NextResponse.json({ error: 'Faltan parámetros: date, employeeId' }, { status: 400 });
    }

    // 1. Obtener nombre del empleado para la carpeta
    const { data: emp, error: empError } = await supabase
      .from('empleados')
      .select('nombre, apellido_paterno')
      .eq('id_empleado', employeeId)
      .single();

    if (empError || !emp) throw new Error('Empleado no encontrado');

    const folderName = `${emp.nombre}_${emp.apellido_paterno}`;
    const dateFolderName = new Date(date).toLocaleDateString('es-MX').replace(/\//g, '.');

    // 2. Provisionar en Drive
    const driveInfo = await provisionWorkdayFolder(dateFolderName, folderName);

    // 3. Guardar en workday_approval_status para que aparezca el botón en la web
    const { error: upsertError } = await supabase
      .from('workday_approval_status')
      .upsert({
        employee_id: employeeId,
        date: date,
        drive_folder_id: driveInfo.folderId,
        drive_folder_url: driveInfo.webViewLink,
        status: 'Borrador' // Por defecto al iniciar
      }, { onConflict: 'employee_id, date' });

    if (upsertError) console.error('Error saving drive link to DB:', upsertError);

    return NextResponse.json({
      ok: true,
      folderId: driveInfo.folderId,
      url: driveInfo.webViewLink
    });

  } catch (error: any) {
    console.error('Drive Provisioning Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
