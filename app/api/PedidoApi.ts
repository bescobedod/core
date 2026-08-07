import { ValidarPedidoResponse } from '../types/SapModels';
import { authFetch } from '../utils/auth-fetch';

const BASIC_URL = process.env.NEXT_PUBLIC_API_URL;

export async function validarYObtenerPedido(
    idTienda: string,
    fecha_requerida: string,
    idTipo: string
): Promise<ValidarPedidoResponse> {
    const params = new URLSearchParams({
        id_tienda: idTienda,
        fecha_requerida: fecha_requerida,
        id_tipo: idTipo
    });

    const response = await authFetch(`/pedido/validarYObtenerPedido?${params.toString()}`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || "Error desconocido en el servidor");
    }

    return response.json();
}


export async function createPedido(pedido: any) {
    const response = await authFetch(`/pedido/createPedido`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(pedido)
    })

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || "Error desconocido en el servidor al crear el pedido");
    }

    return response.json();
}