import { RolModel } from "../types/RolModel";
import { authFetch } from "../utils/auth-fetch";

export async function getAllRoles(): Promise<RolModel[]> {
    const response = await authFetch(`/roles/getAllRoles`);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.details || data.error || "Error al obtener los roles");
    }
    return data.roles;
}