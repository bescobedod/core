import { TipoPedidoEnvioModel } from "../types/TipoPedidoEnvio";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL

export async function getAllTipoPedidoEnvio(): Promise<TipoPedidoEnvioModel[]> {
    const response = await fetch(`${BASE_URL}/pedido/getAllTipoPedidoEnvio`);

    if(!response.ok) {
        throw new Error("Error al obtener lista de tipos de pedido");
    }
    
    return response.json();
}