import { PedidosPosResponse, PedidosPosInsumosResponse, TipoPedidoPos } from '../types/PedidoPosModel';
import { ComparativoStockPolloResponse } from '../types//StockModel';
import { authFetch } from '../utils/auth-fetch';

interface FiltrosPedidosPos {
    codigo_bodega?: string;
    codigo_tienda?: string;
    ruta_id?: string;
    fecha_requerida?: string;
}

// Overload: pedir 'INSUMOS' devuelve la forma fusionada (insumos + activo
// fijo por tienda); pedir 'POLLO' devuelve la forma original sin fusionar.
export async function getPedidosPos(
    tipoPedido: 'INSUMOS',
    filtros?: FiltrosPedidosPos
): Promise<PedidosPosInsumosResponse>;
export async function getPedidosPos(
    tipoPedido: 'POLLO',
    filtros?: FiltrosPedidosPos
): Promise<PedidosPosResponse>;
export async function getPedidosPos(
    tipoPedido: TipoPedidoPos,
    filtros: FiltrosPedidosPos = {}
): Promise<PedidosPosResponse | PedidosPosInsumosResponse> {
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

export interface CrearPedidoActivoFijoPayload {
    id_tienda: number;
    codigo_tienda: string;
    nombre_tienda: string;
    codigo_empresa: string;
    fecha_requerida: string;
    items: {
        codigo_articulo: string;
        nombre_articulo: string;
        unidad_medida: string;
        cantidad: number;
    }[];
}

export interface CrearPedidoActivoFijoResponse {
    success: boolean;
    id_pedido: string;
    numero_pedido: string;
    estado: string;
}

export async function crearPedidoActivoFijo(payload: CrearPedidoActivoFijoPayload): Promise<CrearPedidoActivoFijoResponse> {
    const response = await authFetch(`/pedido/crearPedidoActivoFijo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.details || data.error || "Error al crear el pedido de activo fijo");
    }
    return data;
}

export interface PedidoActivoFijoItemApi {
    id: string;
    codigo_producto: string;
    descripcion_producto: string;
    unidad_medida: string;
    cantidad_solicitada: string;
    cantidad_asignada: string;
    estado_linea: string;
}

export interface PedidoActivoFijoApi {
    pedido_id: string;
    numero_pedido: string;
    codigo_tienda: string;
    nombre_tienda: string;
    fecha_pedido: string;
    fecha_requerida: string;
    estado: string;
    items: PedidoActivoFijoItemApi[];
}

export interface BuscarPedidosActivoFijoResponse {
    success: boolean;
    data: PedidoActivoFijoApi[];
    pagination: {
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
    };
}

export interface BuscarPedidosActivoFijoFiltros {
    codigo_tienda: string;
    fecha?: string;
    fecha_inicio?: string;
    fecha_fin?: string;
    page?: number;
    pageSize?: number;
}

export async function buscarPedidosActivoFijo(filtros: BuscarPedidosActivoFijoFiltros): Promise<BuscarPedidosActivoFijoResponse> {
    const paramsObj: Record<string, string> = { codigo_tienda: filtros.codigo_tienda };

    if (filtros.fecha) paramsObj.fecha = filtros.fecha;
    if (filtros.fecha_inicio) paramsObj.fecha_inicio = filtros.fecha_inicio;
    if (filtros.fecha_fin) paramsObj.fecha_fin = filtros.fecha_fin;
    if (filtros.page) paramsObj.page = String(filtros.page);
    if (filtros.pageSize) paramsObj.pageSize = String(filtros.pageSize);

    const params = new URLSearchParams(paramsObj);
    const response = await authFetch(`/pedido/buscarPedidosActivoFijo?${params.toString()}`);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.details || data.error || "Error al buscar los pedidos de activo fijo");
    }
    return data;
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

async function descargarBlobComoArchivo(response: Response, nombreArchivo: string): Promise<void> {
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombreArchivo;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
}

export async function descargarTicketPollo(rutaId: string, fecha: string): Promise<void> {
    const params = new URLSearchParams({ ruta_id: rutaId, fecha });
    const response = await authFetch(`/pedido/generarTicketPollo?${params.toString()}`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || "Error al generar el ticket");
    }
    await descargarBlobComoArchivo(response, `ticket_pollo_${fecha}.pdf`);
}

export async function descargarTicketInsumos(rutaId: string, fecha: string): Promise<void> {
    const params = new URLSearchParams({ ruta_id: rutaId, fecha });
    const response = await authFetch(`/pedido/generarTicketInsumos?${params.toString()}`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || "Error al generar el ticket");
    }
    await descargarBlobComoArchivo(response, `ticket_insumos_${fecha}.pdf`);
}

export async function previsualizarTicketPollo(rutaId: string, fecha: string): Promise<string> {
    const params = new URLSearchParams({ ruta_id: rutaId, fecha });
    const response = await authFetch(`/pedido/generarTicketPollo?${params.toString()}`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || "Error al generar el ticket");
    }
    const blob = await response.blob();
    return window.URL.createObjectURL(blob);
}

export async function previsualizarTicketInsumos(rutaId: string, fecha: string): Promise<string> {
    const params = new URLSearchParams({ ruta_id: rutaId, fecha });
    const response = await authFetch(`/pedido/generarTicketInsumos?${params.toString()}`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || "Error al generar el ticket");
    }
    const blob = await response.blob();
    return window.URL.createObjectURL(blob);
}

export interface FirmarTicketResponse {
    success: boolean;
    ticket_id: string;
    estado: string;
}

export async function firmarTicketPollo(rutaId: string, fecha: string): Promise<FirmarTicketResponse> {
    const response = await authFetch(`/pedido/firmarTicketPollo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ruta_id: rutaId, fecha })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.details || data.error || "Error al firmar el ticket");
    }
    return data;
}

export async function firmarTicketInsumos(rutaId: string, fecha: string): Promise<FirmarTicketResponse> {
    const response = await authFetch(`/pedido/firmarTicketInsumos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ruta_id: rutaId, fecha })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.details || data.error || "Error al firmar el ticket");
    }
    return data;
}