export type TipoPedidoPos = 'POLLO' | 'INSUMOS';

export interface PedidoPosItem {
  id: string;
  codigo_producto: string;
  descripcion_producto: string;
  unidad_medida: string;
  fecha_requerida: string;
  cantidad_solicitada: string;
  cantidad_asignada: string;
  estado_linea: string;
}

export interface PedidoPosTienda {
  pedido_id: string;
  codigo_tienda: string | null;
  nombre_tienda: string | null;
  codigo_empresa: string | null;
  codigo_bodega: string | null;
  numero_pedido: string;
  fecha_pedido: string;
  hora_pedido: string; 
  fecha_requerida: string;
  estado: string;
  sap_docentry: number | null;
  sap_docnum: number | null;
  sap_error: string | null;
  items: PedidoPosItem[];
}

export interface PedidoPosRuta {
  ruta_id: string | null;
  nombre_ruta: string;
  camion_id: string | null;
  camion_placa: string | null;
  piloto_id: number | null;
  piloto_nombre: string | null;
  estado_general: string;
  sap_docnum: number | null;
  sap_docentry: number | null;
  tiendas: PedidoPosTienda[];
}

export interface PedidosPosResponse {
  success: boolean;
  tipo_pedido: TipoPedidoPos;
  fecha_requerida: string;
  rutas: PedidoPosRuta[];
}

// A partir de aquí: forma exclusiva de INSUMOS, que ahora fusiona los
// pedidos de Insumos y de Activo Fijo (misma bodega/base SAP) de una misma
// tienda en una sola tarjeta, con cada tipo como un sub-bloque aparte.
// POLLO no usa esto, sigue con PedidoPosTienda/PedidoPosRuta tal cual.
export interface PedidoPosDetallePedido {
  pedido_id: string;
  numero_pedido: string;
  fecha_pedido: string;
  hora_pedido: string;
  fecha_requerida: string;
  estado: string;
  sap_docentry: number | null;
  sap_docnum: number | null;
  sap_error: string | null;
  items: PedidoPosItem[];
}

export interface PedidoPosTiendaInsumos {
  codigo_tienda: string | null;
  nombre_tienda: string | null;
  codigo_empresa: string | null;
  codigo_bodega: string | null;
  insumos: PedidoPosDetallePedido | null;
  activo_fijo: PedidoPosDetallePedido | null;
}

export interface PedidoPosRutaInsumos {
  ruta_id: string | null;
  nombre_ruta: string;
  camion_id: string | null;
  camion_placa: string | null;
  piloto_id: number | null;
  piloto_nombre: string | null;
  estado_general: string;
  sap_docnum: number | null;
  sap_docentry: number | null;
  tiendas: PedidoPosTiendaInsumos[];
}

export interface PedidosPosInsumosResponse {
  success: boolean;
  tipo_pedido: 'INSUMOS';
  fecha_requerida: string;
  rutas: PedidoPosRutaInsumos[];
}