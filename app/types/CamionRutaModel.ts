export type TipoRuta = "POLLO" | "INSUMOS";

export interface ProductoInventarioCamion {
  codigo_producto: string;
  nombre_producto: string;
  unidad_medida: string;
  cantidad: number; // cantidad actual disponible en el WhsCode de la ruta (SAP)
}

export interface ProductoTiendaRuta {
  codigo_producto: string;
  nombre_producto: string;
  unidad_medida: string;
  cantidad_solicitada: number;
  // null = la app móvil todavía no registra la recepción de este producto.
  cantidad_recibida: number | null;
}

// Mismo valor que logistica.tbl_pedidos_pos_cabecera.estado en Core — no se
// deriva ni se colapsa, se muestra tal cual viene del backend.
export type EstadoTiendaRuta = "EN_TRANSITO" | "RECIBIDO" | "RECIBIDO_PARCIAL";

export interface TiendaRutaEnCurso {
  codigo_tienda: string;
  nombre_tienda: string;
  estado: EstadoTiendaRuta;
  productos: ProductoTiendaRuta[];
}

export interface PilotoUbicacion {
  id_piloto: number;
  nombre_piloto: string;
  // null = el piloto todavía no reporta ninguna posición en
  // app.usuario_ubicacion_logs (PIOAPP).
  lat: number | null;
  lng: number | null;
  fecha_ubicacion: string | null; // ISO
}

export type TipoMovimientoInventario = "TRASLADO_CUARTO_FRIO" | "ENTREGA_TIENDA";

export interface LineaMovimientoInventario {
  codigo_producto: string;
  nombre_producto: string;
  cantidad: number;
}

export interface MovimientoInventarioLog {
  id: string;
  tipo: TipoMovimientoInventario;
  fecha: string; // ISO
  codigo_tienda?: string;
  nombre_tienda?: string;
  lineas: LineaMovimientoInventario[];
}

// Forma tal cual la devuelve GET /camionesRuta/getRutasActivas (backend real).
export interface RutaActivaBackend {
  ruta_id: string;
  nombre_ruta: string;
  whs_code_origen: string;
  whs_code_destino: string;
  fecha: string;
  camion_id: string;
  camion_placa: string | null;
  piloto_id: number;
  piloto_nombre: string | null;
  piloto_lat: number | null;
  piloto_lng: number | null;
  piloto_fecha_ubicacion: string | null;
}

// Bodega de cuarto frío (WhsCode con prefijo "CFR-") para el destino del
// botón "Trasladar a Cuarto Frío".
export interface BodegaCuartoFrio {
  whs_code: string;
  nombre: string;
}

export interface CamionEnRuta {
  id: string;
  tipo_ruta: TipoRuta;
  nombre_ruta: string;
  whs_code_ruta: string; // bodega móvil del camión, asignada a la ruta (SAP)
  camion_placa: string;
  piloto: PilotoUbicacion;
  inventario: ProductoInventarioCamion[];
  tiendas: TiendaRutaEnCurso[];
  movimientos: MovimientoInventarioLog[];
}

export interface LineaTrasladoCuartoFrio {
  codigo_producto: string;
  nombre_producto: string;
  unidad_medida: string;
  cantidad: number;
}

// Payload de POST /camionesRuta/trasladarACuartoFrio.
export interface TrasladoCuartoFrioPayload {
  tipo: TipoRuta;
  ruta_id: string;
  nombre_ruta: string;
  fecha: string;
  whs_origen: string;
  whs_destino: string;
  camion_placa: string;
  piloto_id: number;
  piloto_nombre: string;
  lineas: LineaTrasladoCuartoFrio[];
}

// Fila del historial, tal cual la devuelve GET /camionesRuta/getTrasladosCuartoFrio.
export interface TrasladoCuartoFrio {
  id: string;
  tipo_pedido: TipoRuta;
  ruta_id: string;
  nombre_ruta: string | null;
  fecha: string;
  whs_origen: string;
  whs_destino: string;
  camion_placa: string | null;
  piloto_id: number | null;
  piloto_nombre: string | null;
  usuario_registro: string | null;
  sap_docentry: number | null;
  sap_docnum: number | null;
  lineas: LineaTrasladoCuartoFrio[];
  creado_en: string;
}

// Payload de POST /camionesRuta/entregarProducto.
export interface EntregarProductoPayload {
  tipo: TipoRuta;
  ruta_id: string;
  nombre_ruta: string;
  whs_code_ruta: string;
  camion_placa: string;
  piloto_id: number;
  piloto_nombre: string;
  fecha: string;
  lineas: LineaTrasladoCuartoFrio[];
}
