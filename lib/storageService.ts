import { supabase } from '@/utils/supabase/client'

/**
 * Interfaz para el servicio de almacenamiento.
 */
export interface StorageProvider {
  uploadFile(file: File, path: string): Promise<{ id: string; url: string; provider: string }>;
}

export class CloudinaryStorageProvider implements StorageProvider {
  async uploadFile(file: File, _path: string): Promise<{ id: string; url: string; provider: string }> {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      console.warn("Cloudinary configuration missing. Using local Blob URL for preview.");
      return { id: 'temp', url: URL.createObjectURL(file), provider: 'local' };
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);

    try {
      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || 'Error uploading to Cloudinary');

      return {
        id: data.public_id,
        url: data.secure_url,
        provider: 'cloudinary'
      };
    } catch (error) {
      console.error("Cloudinary Storage Error:", error);
      throw error;
    }
  }
}

/**
 * Servicio Central de Almacenamiento Worktrack RH
 * 
 * ESTRATEGIA:
 * 1. APK (Android): Sube fotos HD a Google Drive.
 *    - La APK crea la ruta: /DD.MM.YYYY/Nombre_Trabajador/
 *    - Guarda el enlace en la DB con provider = 'drive'.
 * 
 * 2. WEB: Usa este servicio solo para urgencias/fallbacks.
 */
export const storageService = {
  provider: new CloudinaryStorageProvider(),

  /**
   * Genera el path lógico compatible con la estructura de la APK en Drive.
   */
  getDrivePath(employeeName: string, date: Date) {
    const dateStr = date.toLocaleDateString('es-MX', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    }).replace(/\//g, '.');
    
    return `/${dateStr}/${employeeName.replace(/\s+/g, '_')}`;
  },

  async uploadWorkdayEvidence(file: File, employeeName: string, date: Date) {
    const drivePath = this.getDrivePath(employeeName, date);
    const result = await this.provider.uploadFile(file, drivePath);
    
    return {
      ...result,
      logicalPath: drivePath, // Guardamos la referencia compatible con Drive
      fileName: file.name,
      uploadedAt: new Date().toISOString()
    }
  }
}
