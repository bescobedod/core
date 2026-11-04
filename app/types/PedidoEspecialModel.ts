// ---- Pedidos especiales (vienen de Simphony con el vendor PE AVICOLA) ----

export type EstadoPedidoEspecial =
  | "PENDIENTE_APROBACION"
  | "RECHAZADO"
  | "AUTORIZADO"
  | "EN_PREPARACION"
  | "LISTO_PARA_RECOGER"
  | "ENTREGADO";

export interface PedidoEspecialItem {
  id: string;
  codigo_producto: string;
  descripcion_producto: string;
  unidad_medida: string;
  cantidad_solicitada: number;
  cantidad_asignada: number;
}

export interface PedidoEspecial {
  id: string;
  numero_pedido: string;
  codigo_tienda: string;
  nombre_tienda: string;
  division: "1" | "2" | null;
  fecha_pedido: string;
  fecha_requerida: string;
  estado: EstadoPedidoEspecial;
  // Aún no está definido de dónde viene en el .txt.
  comentario: string | null;
  motivo_rechazo: string | null;
  autorizado_por: string | null;
  fecha_autorizacion: string | null;
  items: PedidoEspecialItem[];
}

export interface Paginacion {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PaginaPedidos<T> {
  pedidos: T[];
  paginacion: Paginacion;
}

export interface FiltrosPedidosEspeciales {
  estados?: EstadoPedidoEspecial[];
  fechaDesde?: string;
  fechaHasta?: string;
  page?: number;
}

export interface ItemStockEspecial {
  codigo_producto: string;
  stock_disponible: number;
  encontrado_en_sap: boolean;
}

export interface AsignacionEspecial {
  item_id: string;
  cantidad_asignada: number;
}

// ---- Pedidos de pollo artesano (se crean en Core) ----

export type CondicionPagoArtesano = "PAGADO" | "CREDITO";

export interface ClienteAvicola {
  id: string;
  nombre: string;
  nit: string | null;
  direccion: string | null;
  // Dirección real de entrega. Vacía para los clientes recién importados.
  direccion_fisica: string | null;
}

export interface ProductoArtesano {
  codigo_producto: string;
  descripcion_producto: string;
  unidad_medida: string;
}

export interface PedidoArtesanoItem {
  codigo_producto: string;
  descripcion_producto: string;
  unidad_medida: string;
  cantidad: number;
}

export interface PedidoArtesano {
  id: string;
  numero_pedido: string;
  fecha_requerida: string;
  creado_en: string;
  creado_por: string;
  ruta_id: string;
  nombre_ruta: string;
  // Solo referencia para saber en qué ruta va; no es la entrega.
  nombre_tienda_referencia: string | null;
  cliente_nombre: string;
  cliente_nit: string | null;
  direccion_entrega: string;
  condicion_pago: CondicionPagoArtesano;
  numero_boleta: string | null;
  comentario: string | null;
  items: PedidoArtesanoItem[];
}

export interface FiltrosPedidosArtesano {
  id_usuario?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  page?: number;
}

export interface UsuarioArtesano {
  id_usuario: string;
  nombre: string;
}

export interface CrearPedidoArtesanoPayload {
  fecha_requerida: string;
  ruta_id: string;
  // id_tienda_simphony de una tienda asignada a la ruta elegida.
  id_tienda_simphony_referencia: string | null;
  cliente_id: string;
  // Si el cliente no tenía dirección física, se completa al crear el pedido.
  direccion_fisica: string;
  condicion_pago: CondicionPagoArtesano;
  numero_boleta: string | null;
  comentario: string | null;
  items: { codigo_producto: string; cantidad: number }[];
}

export interface CrearClienteAvicolaPayload {
  nombre: string;
  nit: string | null;
  direccion: string | null;
  direccion_fisica: string;
}
