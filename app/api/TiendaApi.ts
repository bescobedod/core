import { TiendaModulo } from "../types/TiendaModel";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL

export async function getAllTiendas(): Promise<TiendaModulo[]> {
    const response = await fetch(`${BASE_URL}/tiendas/getAllTiendas`);

    if(!response.ok) {
        throw new Error("Error al obtener lista de tiendas");
    }
    
    return response.json();
}