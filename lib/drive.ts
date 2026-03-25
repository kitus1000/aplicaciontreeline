import { google } from 'googleapis';

/**
 * Lógica para gestionar Google Drive vía Cuenta de Servicio.
 * Requiere la variable de entorno GOOGLE_SERVICE_ACCOUNT_JSON con el contenido del archivo de credenciales.
 */

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

async function getDriveClient() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '{}');
  if (!credentials.client_email) {
    throw new Error('Google Drive Credentials not configured in GOOGLE_SERVICE_ACCOUNT_JSON');
  }

  const auth = new google.auth.JWT(
    credentials.client_email,
    undefined,
    credentials.private_key,
    SCOPES
  );

  return google.drive({ version: 'v3', auth });
}

export async function getOrCreateFolder(name: string, parentId?: string) {
  const drive = await getDriveClient();
  
  // Buscar si existe
  let q = `name = '${name}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  if (parentId) q += ` and '${parentId}' in parents`;

  const response = await drive.files.list({ q, fields: 'files(id, name, webViewLink)' });
  const existing = response.data.files?.[0];

  if (existing) return existing;

  // Crear si no existe
  const fileMetadata = {
    name,
    mimeType: 'application/vnd.google-apps.folder',
    parents: parentId ? [parentId] : []
  };

  const folder = await drive.files.create({
    requestBody: fileMetadata,
    fields: 'id, name, webViewLink'
  });

  // Hacer que cualquier persona con el link pueda ver (opcional, recomendable solo lectura)
  await drive.permissions.create({
    fileId: folder.data.id!,
    requestBody: {
      role: 'reader',
      type: 'anyone',
    },
  });

  return folder.data;
}

/**
 * Provee la carpeta de evidencia para un empleado en una fecha específica.
 * Jerarquía: Raiz -> Fecha (DD.MM.YYYY) -> NombreEmpleado
 */
export async function provisionWorkdayFolder(date: string, employeeName: string) {
  // 1. Obtener/Crear carpeta del Día
  const rootId = process.env.DRIVE_ROOT_FOLDER_ID; // Opcional: carpeta base de Worktrack
  const dayFolder = await getOrCreateFolder(date, rootId);

  // 2. Obtener/Crear carpeta del Empleado dentro del día
  const employeeFolder = await getOrCreateFolder(employeeName, dayFolder.id!);

  return {
    folderId: employeeFolder.id,
    webViewLink: employeeFolder.webViewLink
  };
}
