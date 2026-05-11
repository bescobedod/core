import { SupplySAPCategory, ItemGroups, Item } from '../types/SapModels';
import { authFetch } from '../utils/auth-fetch';

const BASIC_URL = process.env.NEXT_PUBLIC_API_URL;

export async function productosAgrupados(): Promise<SupplySAPCategory[]> {
    const response = await fetch(`${BASIC_URL}/sap/productosAgrupados`);

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        throw new Error(errorData.details || errorData.error || "Error desconocido en el servidor");
    }

    return response.json();
}

export async function obtenerGruposArticulos(): Promise<ItemGroups[]> {
    const response = await fetch(`${BASIC_URL}/sap/obtenerGruposArticulos`);

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        throw new Error(errorData.details || errorData.error || "Error desconocido en el servidor");
    }

    return response.json();
}

export async function obtenerProductosPorGrupo(prefix: string, page: number) {
    const response = await fetch(`${BASIC_URL}/sap/obtenerProductosPorGrupo?prefix=${prefix}&page=${page}`);

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        throw new Error(errorData.details || errorData.error || "Error desconocido en el servidor");
    }

    return response.json();
}

export async function buscarProductosPorNombre(name: string, page: number, empresa_id: string) {
    const response = await authFetch(`/sap/buscarProductosPorNombre?query=${name}&page=${page}&empresa_id=${empresa_id}`);

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        throw new Error(errorData.details || errorData.error || "Error desconocido en el servidor");
    }

    return response.json();
}