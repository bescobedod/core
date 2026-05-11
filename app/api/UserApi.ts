import { UserModel } from "../types/UserModel";
import { authFetch } from "../utils/auth-fetch";

export async function getUsersByDepartamento(id_matriz: string) : Promise<UserModel[]> {
    const response = await authFetch(`/usuario/getUsersByDepartamento/${id_matriz}`, {
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

        console.error('Error al obtener usuarios: ', details || text);
        alert(details?.error || details?.message || 'Error al obtener usuarios');
    }

    return response.json();
}

export async function getUsersByDepartamento2(departamento_id: string) : Promise<UserModel[]> {
    const response = await authFetch(`/usuario/getUsersByDepartamento2/${departamento_id}`, {
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

        console.error('Error al obtener usuarios: ', details || text);
        alert(details?.error || details?.message || 'Error al obtener usuarios');
    }

    return response.json();
}

export async function searchUsers(query: string, departamento_id?: string) : Promise<UserModel[]> {
    if(!query || query.trim().length < 2) {
        return [];
    }

    const params = new URLSearchParams({
        query: query.trim()
    });

    if(departamento_id) {
        params.append('departamento_id', departamento_id);
    }

    const response = await authFetch(`/usuario/searchUsers?${params.toString()}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    });

    if(response.status === 404) {
        return [];
    }

    if (!response.ok) {
        const text = await response.text().catch(() => '');
        let details: any;
        try { details = JSON.parse(text); } catch {}

        console.error('Error al buscar usuarios:', details || text);
        alert(details?.error || details?.message || 'Error al buscar usuarios');
        return [];
    }

    return response.json();
}