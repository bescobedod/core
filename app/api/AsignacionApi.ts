import { GuardarAsignacionPayload, GuardarAsignacionResponse } from '../types/AsignacionModel';
import { authFetch } from '../utils/auth-fetch';

export async function guardarAsignacionCantidades(payload: GuardarAsignacionPayload): Promise<GuardarAsignacionResponse> {
    const response = await authFetch(`/pedido/guardarAsignacionCantidades`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || "Error al guardar la asignación de cantidades");
    }

    return response.json();
}