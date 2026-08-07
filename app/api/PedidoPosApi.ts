import { PedidosPosResponse, TipoPedidoPos } from '../types/PedidoPosModel';
import { ComparativoStockPolloResponse } from '../types//StockModel';
import { authFetch } from '../utils/auth-fetch';

interface FiltrosPedidosPos {
    codigo_bodega?: string;
    codigo_tienda?: string;
    ruta_id?: string;
    fecha_requerida?: string;
}

export async function getPedidosPos(
    tipoPedido: TipoPedidoPos,
    filtros: FiltrosPedidosPos = {}
): Promise<PedidosPosResponse> {
    const paramsObj: Record<string, string> = { tipo_pedido: tipoPedido };

    if (filtros.codigo_bodega) paramsObj.codigo_bodega = filtros.codigo_bodega;
    if (filtros.codigo_tienda) paramsObj.codigo_tienda = filtros.codigo_tienda;
    if (filtros.ruta_id) paramsObj.ruta_id = filtros.ruta_id;
    if (filtros.fecha_requerida) paramsObj.fecha_requerida = filtros.fecha_requerida;

    const params = new URLSearchParams(paramsObj);

    const response = await authFetch(`/pedido/getPedidosPos?${params.toString()}`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || "Error desconocido en el servidor al obtener los pedidos POS");
    }

    return response.json();
}

export async function getComparativoStockPollo(fecha: string, rutaId: string): Promise<ComparativoStockPolloResponse> {
    const params = new URLSearchParams({ fecha, ruta_id: rutaId });
    const response = await authFetch(`/pedido/getComparativoStockPollo?${params.toString()}`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || "Error al obtener el comparativo de stock");
    }
    return response.json();
}

export async function getComparativoStockInsumos(fecha: string, rutaId: string): Promise<ComparativoStockPolloResponse> {
    const params = new URLSearchParams({ fecha, ruta_id: rutaId });
    const response = await authFetch(`/pedido/getComparativoStockInsumos?${params.toString()}`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || "Error al obtener el comparativo de stock");
    }
    return response.json();
}

export interface EnviarTransferenciaResponse {
    success: boolean;
    sap_docentry: number;
    sap_docnum: number;
    pedidos_actualizados: number;
}

export async function enviarTransferenciaPollo(rutaId: string, fecha: string): Promise<EnviarTransferenciaResponse> {
    const response = await authFetch(`/pedido/enviarTransferenciaPollo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ruta_id: rutaId, fecha })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.details || data.error || "Error al enviar la transferencia a SAP");
    }
    return data;
}

export async function enviarTransferenciaInsumos(rutaId: string, fecha: string): Promise<EnviarTransferenciaResponse> {
    const response = await authFetch(`/pedido/enviarTransferenciaInsumos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ruta_id: rutaId, fecha })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.details || data.error || "Error al enviar la transferencia a SAP");
    }
    return data;
}