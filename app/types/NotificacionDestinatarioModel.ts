export interface NotificacionDestinatario {
  id: number;
  contexto: string;
  email: string;
  nombre: string | null;
  activo: boolean;
  creado_en: string;
}

export interface NotificacionContexto {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  creado_en: string;
}
