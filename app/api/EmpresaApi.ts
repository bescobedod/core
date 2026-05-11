import { EmpresaModel } from "../types/EmpresaModel";
import { authFetch } from "../utils/auth-fetch";

export async function getEmpresasActivas() {
    const response = await authFetch('/empresa/getEmpresasActivas', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    })

    if (response.status === 404) {
        return [];
    }

    if(!response.ok) {
        const text = await response.text().catch(() => '');
        let details: any;
        try { details = JSON.parse(text); } catch {}

        console.error('Error al obtener empresas activas: ', details || text);
        alert(details?.error | details?.message || 'Error al obtener empresas activas');
    }

    return response.json();
}