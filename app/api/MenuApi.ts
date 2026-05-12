import { MenuModel } from "../types/MenuModel";
import { authFetch } from "../utils/auth-fetch";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL

export async function getAllMenus(): Promise<MenuModel[]> {
    const response = await authFetch(`/menus/getAllMenus`);

    if(!response.ok) {
        throw new Error("Error al obtener lista de menús");
    }
    
    return response.json();
}

export async function getPermiso() {
    const response = await authFetch(`/menus/getPermiso`);

    if(!response.ok) {
        throw new Error("Error al obtener permisos del menú");
    }
    
    return response.json();
}