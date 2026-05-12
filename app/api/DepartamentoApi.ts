import { DepartamentoModel } from "../types/DepartamentoModel";
import { authFetch } from "../utils/auth-fetch";

export async function getDepartamentos() : Promise<DepartamentoModel[]> {
    const response = await authFetch('/departamento/getDepartamentos', {
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

        console.error('Error al obtener departamentos: ', details || text);
        alert(details?.error | details?.message || 'Error al obtener departamentos');
    }

    return response.json();
}

export async function updateDepartamento(id_d: string, payload: any) {
    const response = await authFetch(`/departamento/updateDepartamento/${id_d}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    })

    if (response.status === 404) {
        return [];
    }

    if(!response.ok) {
        const text = await response.text().catch(() => '');
        let details: any;
        try { details = JSON.parse(text); } catch {}

        console.error('Error al actualizar departamento: ', details || text);
        alert(details?.error | details?.message || 'Error al actualizar departamento');
    }

    return response.json();
}