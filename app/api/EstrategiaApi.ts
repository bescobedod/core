import { EstrategiaModel } from "../types/EstrategiaModel";
import { authFetch } from "../utils/auth-fetch";

export async function getEstrategias() : Promise<EstrategiaModel[]> {
    const response = await authFetch(`/estrategia/getEstrategias`, {
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

        console.error('Error al obtener las estrategias de adquisición para el departamento: ', details || text);
        alert(`Error al obtener las estrategias de adquisición para el departamento: ${details.error}`);
    }

    return response.json();
}

export async function getMatrizAprobacion(id_estrategia: string) {
    const response = await authFetch(`/estrategia/getMatrizAprobacion/${id_estrategia}`, {
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

        console.error('Error al obtener las matrices de aprobación para la estrategia de adquisicion: ', details || text);
        alert(details?.error | details?.message || 'Error al obtener las matrices de aprobación para la estrategiade adquisicion');
    }

    return response.json();
}

export async function deleteNivelMatrizSolicitud(matriz_id: string, nivel: number) {
    const response = await authFetch(`/estrategia/deleteNivelMatrizSolicitud`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ matriz_id, nivel })
    });

    if (response.status === 404) {
        return [];
    }

    if(!response.ok) {
        const text = await response.text().catch(() => '');
        let details: any;
        try { details = JSON.parse(text); } catch {}

        console.error('Error al eliminar el nivel de la matriz: ', details || text);
        alert(details?.error | details?.message || 'Error al eliminar el nivel de la matriz');
    }

    return response.json();
}

export async function updateEstrategiaAdquisicion(payload: any) {
    const response = await authFetch('/estrategia/updateEstrategiaAdquisicion', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    if(!response.ok) {
        const text = await response.text().catch(() => '');
        let details: any;
        try { details = JSON.parse(text); } catch {}

        console.error('Error al actualizar estrategia de adquisición: ', details || text);
        alert(details?.error | details?.message || 'Error al actualizar estrategia de adquisición');
    }

    return response.json();
}

export async function createEstrategiaByArea(area: string, estrategia: any) {
    const response = await authFetch(`/estrategia/createEstrategiaByArea/${area}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({estrategia})
    });

    if(!response.ok) {
        const text = await response.text().catch(() => '');
        let details: any;
        try { details = JSON.parse(text); } catch {}

        console.error('Error al crear estrategia de adquisición: ', details || text);
        alert(`Error al crear estrategia de adquisición: ${details.error}`);
    }

    return response.json();
}

export async function createMatrizAprobacionSolicitud(payload: {id_estrategia: string, nombre: string}) {
    const response = await authFetch('/estrategia/createMatrizAprobacionSolicitud', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    })

    if(!response.ok) {
        const text = await response.text().catch(() => '');
        let details: any;
        try { details = JSON.parse(text); } catch {}

        console.error('Error al crear matriz de aprobación: ', details || text);
        alert(details?.error | details?.message || 'Error al crear matriz de aprobación');
    }

    return response.json();
}

export async function getJefeInmediatoByEstrategia(id_estrategia: string) {
    const response = await authFetch(`/estrategia/getJefeInmediatoByEstrategia/${id_estrategia}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    });

    if (response.status === 404) {
        return null;
    }

    if (!response.ok) {
        const text = await response.text().catch(() => '');
        let details: any;
        try { details = JSON.parse(text); } catch {}

        console.error('Error al obtener jefe inmediato por estrategia: ', details || text);
        alert(details?.error || details?.message || 'Error al obtener jefe inmediato');
        return null;
    }

    return response.json();
}