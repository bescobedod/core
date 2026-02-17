export interface TiendaModulo {
  id_departamento: number;
  id_tienda: string;
  codigo_empresa: string;
  nombre_empresa: string;
  codigo_tienda: string;
  nombre_tienda: string;
  direccion_tienda: string;
  altitud: number;
  latitud: number;
  numero_establecimiento_sat?: number;
  division: string;
  inactiva?: boolean;
  codigo_administrador?: string;
}