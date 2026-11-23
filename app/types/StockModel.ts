export interface ComparativoStockItem {
  codigo_producto: string | null;
  descripcion_producto: string;
  unidad_medida: string;
  cantidad_solicitada_total: number;
  stock_disponible: number;
  encontrado_en_sap: boolean;
  diferencia: number;
  // Solo en el comparativo de clientes de pollo artesano.
  unidades_sap?: number;
  stock_bolsas?: number;
}

export interface ComparativoStockPolloResponse {
  success: boolean;
  fecha: string;
  whs_code: string;
  comparativo: ComparativoStockItem[];
}