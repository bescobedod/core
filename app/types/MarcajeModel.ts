export type TipoMarcaje = "ENTRADA" | "SALIDA";
export type EstadoZonaMarcaje = "DENTRO" | "FUERA" | "SIN_GPS" | "SIN_RESTRICCION";

export interface Marcaje {
  id_marcaje: string;
  id_usuario: string;
  usuario_nombre: string;
  codigo_user: string | null;
  puesto_trabajo: string | null;
  tipo: TipoMarcaje;
  fecha_hora: string;
  latitud: number | null;
  longitud: number | null;
  es_valido: boolean;
  razon_invalido: string | null;
  is_offline: boolean;
  dispositivo_info: string | null;
  ip_address: string | null;
  fecha_sincronizacion: string;
  zona_estado: EstadoZonaMarcaje;
  zona_nombre: string | null;
  zona_distancia_m: number | null;
  zonas_asignadas: string[];
}

export interface ZonaMapa {
  id_zona: number;
  nombre: string;
  latitud: number;
  longitud: number;
  radio_metros: number;
}

export interface MarcajeDetalle extends Marcaje {
  dispositivo_uuid: string | null;
  // null si no se pudo firmar la URL de S3.
  foto_url: string | null;
  // Zonas que tenía asignadas la persona al momento del marcaje.
  zonas: ZonaMapa[];
}

export interface ZonaMarcaje extends ZonaMapa {
  activo: boolean;
  usuarios_activos: number;
}

export interface UsuarioConMarcajes {
  id_usuario: string;
  codigo_user: string | null;
  nombre: string;
}

export interface FiltrosMarcajes {
  id_usuario?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  tipo?: TipoMarcaje;
  estado?: "valido" | "invalido";
  id_zona?: string;
}

export interface ResumenMarcajes {
  entradas: number;
  salidas: number;
  fuera_zona: number;
  offline: number;
}

export interface ResultadoBusquedaMarcajes {
  total: number;
  resumen?: ResumenMarcajes;
  pagina: number;
  tamano: number;
  total_paginas: number;
  marcajes: Marcaje[];
}
