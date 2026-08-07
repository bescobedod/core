import { PilotoUsuario, AsignacionTransporte, AsignarTransportePayload } from '../types/TransporteModel';
import { authFetch } from '../utils/auth-fetch';

export async function getPilotos(): Promise<PilotoUsuario[]> {
    const params = new URLSearchParams({ id_rol: '5' });
    const response = await authFetch(`/usuario/getUsersByRol?${params.toString()}`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || "Error al obtener los pilotos");
    }
    return response.json();
}

export async function getAsignacionesTransporte(fecha: string): Promise<AsignacionTransporte[]> {
    const params = new URLSearchParams({ fecha });
    const response = await authFetch(`/pedido/getAsignacionesTransporte?${params.toString()}`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || "Error al obtener las asignaciones de transporte");
    }
    const data = await response.json();
    return data.asignaciones;
}

export async function asignarTransporte(payload: AsignarTransportePayload): Promise<void> {
    const response = await authFetch(`/pedido/asignarTransporte`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || "Error al asignar el transporte");
    }
}