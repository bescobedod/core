import {
    SolicitudCompraModel,
    VwAprobadoresSolicitudCompra,
    VwSolicitudCompra,
    SolicitudesCompraResponse
} from "../types/SolicitudModel";
import { authFetch } from "../utils/auth-fetch";

export async function crearSolicitudCompra(formData: FormData) {
    const response = await authFetch(`/solicitud/createSolicitudCompra`, {
        method: 'POST',
        body: formData
    });
    
    if(!response.ok) {
        const text = await response.text().catch(() => '');
        let details: any;
        try { details = JSON.parse(text); } catch {}

        console.error('Error al crear la solicitud de compra: ', details || text);
        alert(details?.error | details?.message || 'Error al crear la solicitud de compra');
    }

    return response.json();
}

export async function getSolicitudCompraAF() {
    const response = await authFetch(`/solicitud/getSolicitudCompraAF`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        }
    });

    if (response.status === 404) {
        return [];
    }

    if(!response.ok) {
        const text = await response.text().catch(() => '');
        let details: any;
        try { details = JSON.parse(text); } catch {}

        console.error('Error al obtener las solicitudes de compra para activos fijos: ', details || text);
        alert(details?.error | details?.message || 'Error al obtener las solicitudes de compra para activos fijos');
    }

    return response.json();
}

export async function getArticulosBySolicitud(id_solicitud: string) {
    const response = await authFetch(`/solicitud/getArticulosBySolicitud/${id_solicitud}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        }
    });

    if(!response.ok) {
        const text = await response.text().catch(() => '');
        let details: any;
        try { details = JSON.parse(text); } catch {}

        console.error('Error al obtener los artículos de la solicitud de compra: ', details || text);
        alert(details?.error | details?.message || 'Error al obtener los artículos de la solicitud de compra');
    }

    return response.json();
}

export async function updateArticulosCodes(items: { id: any, codigo_articulo: string, nombre_articulo: string }[]) {
    const response = await authFetch('/solicitud/updateArticulosCodes', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ items })
    });

    if(!response.ok) {
        const text = await response.text().catch(() => '');
        let details: any;
        try { details = JSON.parse(text); } catch {}

        console.error('Error al actualizar los artículos de la solicitud de compra: ', details || text);
        alert(details?.error | details?.message || 'Error al actualizar los artículos de la solicitud de compra');
    }

    return response.json();
}

export async function verificarArticulosSAP(items: { id: any, codigo_articulo: string } []) {
    const response = await authFetch('/sap/verificarArticulosSAP', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ items })
    });

    if(!response.ok) {
        const text = await response.text().catch(() => '');
        let details: any;
        try { details = JSON.parse(text); } catch {}

        console.error('Error al validar los artículos de la solicitud de compra: ', details || text);
        alert(details?.error | details?.message || 'Error al validar los artículos de la solicitud de compra');
    }

    return response.json();
}

export async function getSolicitudesCompraByUser(
    inicio?: string,
    fin?: string,
    estado?: string,
    page: number = 1,
    limit: number = 3
): Promise<SolicitudesCompraResponse> {
    const params = new URLSearchParams();

    if (inicio) params.append('inicio', inicio);
    if (fin) params.append('fin', fin);
    if (estado) params.append('estado', estado);

    params.append('page', String(page));
    params.append('limit', String(limit));

    const response = await authFetch(`/solicitud/getSolicitudesCompraByUser?${params.toString()}`, {
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
            'Error al obtener las solicitudes de compra para el usuario: ',
            details || text
        );

        alert(
            details?.error ||
            details?.message ||
            'Error al obtener las solicitudes de compra para el usuario'
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

export async function getSolicitudesCompra(
    inicio?: string,
    fin?: string,
    estado?: string,
    page: number = 1,
    limit: number = 3
): Promise<SolicitudesCompraResponse> {
    const params = new URLSearchParams();

    if (inicio) params.append('inicio', inicio);
    if (fin) params.append('fin', fin);
    if (estado) params.append('estado', estado);

    params.append('page', String(page));
    params.append('limit', String(limit));

    const response = await authFetch(`/solicitud/getSolicitudesCompra?${params.toString()}`, {
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
            'Error al obtener las solicitudes de compra para el usuario: ',
            details || text
        );

        alert(
            details?.error ||
            details?.message ||
            'Error al obtener las solicitudes de compra para el usuario'
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

export async function getAprobacionSolicitud(id_solicitud: string) : Promise<VwAprobadoresSolicitudCompra []> {
    const response = await authFetch(`/solicitud/getAprobacionSolicitud/${id_solicitud}`, {
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

        console.error('Error al obtener las aprobaciones para la solicitud de compra: ', details || text);
        alert(details?.error | details?.message || 'Error al obtener las aprobaciones de la solicitud de compra');
    }

    return response.json();
}