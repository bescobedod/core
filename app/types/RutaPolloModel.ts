export interface RutaPollo {
  id: string;
  nombre_ruta: string;
  whs_code_origen: string;
  whs_code_destino: string;
  activo: boolean;
  total_tiendas: number;
}

export interface TiendaPdvBusqueda {
  id_tienda_pdv: number;
  id_tienda_simphony: string;
  codigo_tienda: string;
  nombre_tienda: string;
  codigo_empresa: string;
  whs_code: string;
  ya_asignada: boolean;
  ruta_id_actual: string | null;
}

export interface TiendaRutaPollo {
  id: string;
  ruta_id: string;
  id_tienda_simphony: string;
  id_tienda_pdv: number | null;
  codigo_tienda: string | null;
  nombre_tienda: string | null;
  codigo_empresa: string | null;
  whs_code: string | null;
  fecha_asignacion: string;
  fecha_fin_asignacion: string | null;
}

export interface CrearRutaPolloPayload {
  nombre_ruta: string;
  whs_code_origen: string;
  whs_code_destino: string;
}

export interface AsignarTiendaRutaPayload {
  ruta_id: string;
  id_tienda_simphony: string;
  id_tienda_pdv: number | null;
  codigo_tienda: string | null;
  nombre_tienda: string | null;
  codigo_empresa: string | null;
  whs_code: string | null;
}

export interface MuelleUsuario {
  whs_code_origen: string;
  nombre_muelle: string;
}

export interface CandadoRutaPollo {
  id: string;
  whs_code_origen: string;
  ruta_id: string;
  fecha: string;
  id_usuario: number;
  estado: string;
  fecha_bloqueo: string;
  fecha_liberacion: string | null;
}