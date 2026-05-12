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

export interface ItemGroups {
    id: string;
    name: string;
}

export interface Item {
    ItemCode: string;
    ItemName: string;
    SalesUnit: string;
}