export interface Product {
    id: string;
    name: string;
    unit: string;
    currentStock: number;
    salesUnit: string;
    cantidad?: number;
}

export interface SupplySAPCategory {
    id: string;
    name: string;
    products: Product[];
}

export interface ValidarPedidoResponse {
    nuevoPedido: boolean;
    id_pedido: string;
    header?: any;
    categorias: SupplySAPCategory[];
}