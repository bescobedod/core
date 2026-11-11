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

// Pago por depósito (boleta opcional) o descuento de planilla (código de empleado en las observaciones).
export type CondicionPagoArtesano = "DEPOSITO" | "PLANILLA" | "PENDIENTE";

// CREADO → CARGADO → ENTREGADO, o CREADO → RECHAZADO. Cargar incluye la autorización.
export type EstadoPedidoArtesano = "CREADO" | "RECHAZADO" | "CARGADO" | "ENTREGADO";

export interface ClienteAvicola {
  id: string;
  nombre: string;
  nit: string | null;
  // Dirección de entrega; vacía en los empleados.
  direccion: string | null;
  telefono: string | null;
  // Solo si el cliente es empleado de la empresa (ej. "AL 8641").
  codigo_empleado: string | null;
  // Cliente en SAP; sin él no se puede entregar el pedido.
  card_code: string | null;
}

export interface ProductoArtesano {
  codigo_producto: string;
  descripcion_producto: string;
  unidad_medida: string;
  orden: number;
  // Unidades por caja y libras por unidad; null = no aplica.
  factor_caja: number | null;
  factor_libras: number | null;
}

export interface HistorialPedidoArtesano {
  estado_anterior: EstadoPedidoArtesano | null;
  estado_nuevo: EstadoPedidoArtesano;
  usuario: string | null;
  comentario: string | null;
  // Fecha y hora ISO.
  fecha: string;
}

export interface PedidoArtesanoItem {
  codigo_producto: string;
  descripcion_producto: string;
  unidad_medida: string;
  cantidad: number;
  // Precio con el que se vendió la línea; null en pedidos creados sin precio.
  precio_unitario: number | null;
  // Lo que se autorizó cargar (puede ser menos de lo solicitado); null hasta cargar.
  cantidad_autorizada: number | null;
}

export interface PedidoArtesano {
  id: string;
  numero_pedido: string;
  // Se imprime junto al número en el envío.
  serie: string;
  estado: EstadoPedidoArtesano;
  fecha_requerida: string;
  creado_en: string;
  creado_por: string;
  ruta_id: string;
  nombre_ruta: string;
  // Solo referencia para saber en qué ruta va; no es la entrega.
  codigo_tienda_referencia: string | null;
  nombre_tienda_referencia: string | null;
  cliente_id: string;
  cliente_nombre: string;
  cliente_nit: string | null;
  // Vacía en los pedidos de empleados.
  direccion_entrega: string | null;
  telefono_contacto: string | null;
  condicion_pago: CondicionPagoArtesano;
  numero_boleta: string | null;
  comentario: string | null;
  motivo_rechazo: string | null;
  rechazado_por: string | null;
  fecha_rechazo: string | null;
  codigo_piloto: number | null;
  nombre_piloto: string | null;
  cargado_por: string | null;
  fecha_carga: string | null;
  entregado_por: string | null;
  fecha_entrega: string | null;
  // Hay foto (o PDF) de la hoja firmada; la URL se pide aparte.
  tiene_evidencia_entrega: boolean;
  // Documentos creados en SAP: transferencia al cargar y entrega al entregar.
  sap_traslado_docnum: number | null;
  sap_entrega_docnum: number | null;
  // Versión del pedido (ISO); se devuelve al cargar para detectar cambios hechos mientras tanto.
  actualizado_en: string;
  items: PedidoArtesanoItem[];
  historial: HistorialPedidoArtesano[];
}

export interface FiltrosPedidosArtesano {
  id_usuario?: string;
  estados?: EstadoPedidoArtesano[];
  numero?: string;
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
  id_tienda_simphony_referencia: string;
  cliente_id: string;
  // Si el cliente no tenía dirección, se completa al crear el pedido. Vacía solo para empleados.
  direccion: string;
  telefono_contacto: string | null;
  condicion_pago: CondicionPagoArtesano;
  numero_boleta: string | null;
  comentario: string | null;
  items: { codigo_producto: string; cantidad: number }[];
}

// Solo se puede modificar un pedido que sigue en estado CREADO.
export interface EditarPedidoArtesanoPayload extends CrearPedidoArtesanoPayload {
  id: string;
}

export interface CrearClienteAvicolaPayload {
  nombre: string;
  nit: string | null;
  // Obligatoria salvo que se indique el código de empleado.
  direccion: string;
  telefono: string | null;
  codigo_empleado: string | null;
}

export interface PilotoArtesano {
  // Código de empleado en Nomina.
  codigo: number;
  nombre: string;
}

export interface StockArtesano {
  codigo_producto: string;
  stock_disponible: number;
  encontrado_en_sap: boolean;
}
