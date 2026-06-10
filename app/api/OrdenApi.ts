import { CreateOrdenCompraPayload, CreateOrdenCompraResponse } from "../types/OrdenModel";
import { OrdenesCompraResponse, VwAprobadoresOrdenCompra } from "../types/OrdenModel";
import { authFetch } from "../utils/auth-fetch";

export async function crearOrdenCompra(
    payload: CreateOrdenCompraPayload
): Promise<CreateOrdenCompraResponse> {
    const formData = new FormData();

    formData.append('header', JSON.stringify(payload.header));
    formData.append('items',  JSON.stringify(payload.items));

    if (payload.cotizacion) {
        formData.append('cotizacion', payload.cotizacion);
    }

    const response = await authFetch('/orden/createOrdenCompra', {
        method: 'POST',
        body: formData
    });

    if (!response.ok) {
        const text = await response.text().catch(() => '');
        let details: any;

        try {
            details = JSON.parse(text);
        } catch {}

        console.error('Error al crear la orden de compra:', details || text);

        throw new Error(
            details?.error ||
            details?.message ||
            'Error al crear la orden de compra'
        );
    }

    return response.json();
}

export async function getOrdenesCompraByUser(
    inicio?: string,
    fin?: string,
    estado?: string,
    page: number = 1,
    limit: number = 20
): Promise<OrdenesCompraResponse> {
    const params = new URLSearchParams();

    if (inicio) params.append('inicio', inicio);
    if (fin) params.append('fin', fin);
    if (estado) params.append('estado', estado);

    params.append('page', String(page));
    params.append('limit', String(limit));

    const response = await authFetch(`/orden/getOrdenesCompraByUser?${params.toString()}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        const text = await response.text().catch(() => '');
        let details: any;

        try {
            details = JSON.parse(text);
        } catch {}

        console.error(
            'Error al obtener las órdenes de compra para el usuario: ',
            details || text
        );

        alert(
            details?.error ||
            details?.message ||
            'Error al obtener las órdenes de compra para el usuario'
        );

        return {
            data: [],
            pagination: {
                total: 0,
                totalPages: 0,
                currentPage: 1,
                pageSize: limit,
                hasNextPage: false,
                hasPrevPage: false
            }
        };
    }

    return response.json();
}

export async function getOrdenesCompra(
    inicio?: string,
    fin?: string,
    estado?: string,
    page: number = 1,
    limit: number = 20
): Promise<OrdenesCompraResponse> {
    const params = new URLSearchParams();

    if (inicio) params.append('inicio', inicio);
    if (fin) params.append('fin', fin);
    if (estado) params.append('estado', estado);

    params.append('page', String(page));
    params.append('limit', String(limit));

    const response = await authFetch(`/orden/getOrdenesCompra?${params.toString()}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        const text = await response.text().catch(() => '');
        let details: any;

        try {
            details = JSON.parse(text);
        } catch {}

        console.error(
            'Error al obtener las órdenes de compra: ',
            details || text
        );

        alert(
            details?.error ||
            details?.message ||
            'Error al obtener las órdenes de compra'
        );

        return {
            data: [],
            pagination: {
                total: 0,
                totalPages: 0,
                currentPage: 1,
                pageSize: limit,
                hasNextPage: false,
                hasPrevPage: false
            }
        };
    }

    return response.json();
}

export async function getAprobacionOrden(id_orden: string) : Promise<VwAprobadoresOrdenCompra []> {
    const response = await authFetch(`/orden/getAprobacionOrden/${id_orden}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    });

    if (response.status === 404) {
        return [];
    }

    if(!response.ok) {
        const text = await response.text().catch(() => '');
        let details: any;
        try { details = JSON.parse(text); } catch {}

        console.error('Error al obtener las aprobaciones para la orden de compra: ', details || text);
        alert(details?.error | details?.message || 'Error al obtener las aprobaciones de la orden de compra');
    }

    return response.json();
}