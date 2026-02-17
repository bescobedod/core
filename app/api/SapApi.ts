import { SupplySAPCategory } from '../types/SapModels';

const BASIC_URL = process.env.NEXT_PUBLIC_API_URL;

export async function productosAgrupados(): Promise<SupplySAPCategory[]> {
    const response = await fetch(`${BASIC_URL}/sap/productosAgrupados`);

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        throw new Error(errorData.details || errorData.error || "Error desconocido en el servidor");
    }

    return response.json();
}