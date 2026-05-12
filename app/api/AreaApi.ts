import { AreasUsuariosModel } from "../types/AreaModel";
import { authFetch } from "../utils/auth-fetch";

export async function getAreasByDepartamento() {
    const response = await authFetch('/area/getAreasByDepartamento', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    });

    if(!response.ok) {
        const text = await response.text().catch(() => '');
        let details: any;
        try { details = JSON.parse(text); } catch {}

        console.error('Error al obtener areas por departamento: ', details || text);
        alert(details?.error | details?.message || 'Error al obtener areas por departamento');
    }

    return response.json();
}

export async function getAreasYEmpleadosByDepartamento(departamento_id: string) : Promise<AreasUsuariosModel> {
    const response = await authFetch(`/area/getAreasYEmpleadosByDepartamento/${departamento_id}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    });

    if(!response.ok) {
        const text = await response.text().catch(() => '');
        let details: any;
        try { details = JSON.parse(text); } catch {}

        console.error('Error al obtener areas y usuarios por departamento: ', details || text);
        alert(details?.error | details?.message || 'Error al obtener areas y usuarios por departamento');
    }

    return response.json();
}