export interface LineaAsignacionFifo {
  detalle_id: string;
  codigo_producto: string;
  descripcion_producto: string;
  unidad_medida: string;
  numero_pedido: string;
  nombre_tienda: string;
  fecha_pedido: string;
  hora_pedido: string;
  cantidad_solicitada: number;
  cantidad_asignada: number;
  ajustado_manual: boolean;
}

export interface GrupoArticuloFifo {
  codigo_producto: string;
  descripcion_producto: string;
  unidad_medida: string;
  stock_original: number;
  encontrado_en_sap: boolean;
  lineas: LineaAsignacionFifo[];
}

export interface GuardarAsignacionPayload {
  fecha: string;
  asignaciones: {
    detalle_id: string;
    cantidad_asignada: number;
    ajustado_manual: boolean;
  }[];
}

export interface GuardarAsignacionResponse {
  success: boolean;
  pedidos_actualizados: number;
  lineas_actualizadas: number;
}