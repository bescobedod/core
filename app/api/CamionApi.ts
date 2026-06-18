import { InspeccionesResponse } from "../types/CamionModel";
import { authFetch } from "../utils/auth-fetch";

export async function getInspecciones(
    placa?: string,
    nombre_conductor?: string,
    inicio?: string,
    fin?: string,
    page: number = 1,
    limit: number = 20
): Promise<InspeccionesResponse> {
    const query = new URLSearchParams();

    if (nombre_conductor) query.append('nombre_conductor', nombre_conductor);
    if (placa) query.append('placa', placa);
    if (inicio) query.append('inicio', inicio);
    if (fin) query.append('fin', fin);

    query.append('page',  String(page));
    query.append('limit', String(limit));

    const response = await authFetch(`/camion/getInspecciones?${query.toString()}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
        const text = await response.text().catch(() => '');
        let details: any;

        try {
            details = JSON.parse(text);
        } catch {}

        console.error('Error al obtener las inspecciones de camiones:', details || text);

        alert(
            details?.error   ||
            details?.message ||
            'Error al obtener las inspecciones de camiones'
        );

        return {
            data: [],
            pagination: {
                total:       0,
                totalPages:  0,
                currentPage: page,
                pageSize:    limit,
                hasNextPage: false,
                hasPrevPage: false
            }
        };
    }

    return response.json();
}