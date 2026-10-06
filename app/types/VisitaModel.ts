export interface Visita {
  id_visita: string;
  id_usuario: string;
  usuario_nombre: string;
  codigo_user: string | null;
  whs_code: string;
  whs_name: string | null;
  comentario: string;
  fecha_visita: string;
  phone_lat: number | null;
  phone_lng: number | null;
  photo_lat: number | null;
  photo_lng: number | null;
  is_offline: boolean;
  device_model: string | null;
  device_so: string | null;
  total_evidencias: number;
}

export interface VisitaDetalle extends Visita {
  device_uuid: string | null;
}

export interface EvidenciaVisita {
  id_evidencia: string;
  tipo_archivo: "IMAGEN" | "VIDEO";
  orden: number;
  es_obligatoria: boolean;
  // null si no se pudo firmar la URL de S3.
  url: string | null;
}

export interface UsuarioConVisitas {
  id_usuario: string;
  codigo_user: string | null;
  nombre: string;
}

export interface FiltrosVisitas {
  id_usuario?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  whs_name?: string;
}

export interface ResultadoBusquedaVisitas {
  total: number;
  limite: number;
  visitas: Visita[];
}
