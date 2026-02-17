import { ValidarPedidoResponse } from '../types/SapModels';

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

    const response = await fetch(`${BASIC_URL}/pedido/validarYObtenerPedido?${params.toString()}`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || "Error desconocido en el servidor");
    }
    console.log('FUNCIONA')

    return response.json();
}


export async function createPedido(pedido: any) {
    const response = await fetch(`${BASIC_URL}/pedido/createPedido`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(pedido)
    })

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.log(errorData.details || errorData.error)
        throw new Error(errorData.details || errorData.error || "Error desconocido en el servidor al crear el pedido");
    }

    return response.json();
}