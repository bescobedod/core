import { MenuModel, MenuRolAsignacion } from "../types/MenuModel";
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

export async function getAllMenusAdmin(): Promise<MenuModel[]> {
    const response = await authFetch(`/menus/getAllMenusAdmin`);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.details || data.error || "Error al obtener los menús");
    }
    return data.menus;
}

export async function crearMenu(menu: {
    nombre: string;
    icono: string;
    nombre_menu: string;
    descripcion: string;
    tipo?: string;
}): Promise<MenuModel> {
    const response = await authFetch(`/menus/crearMenu`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(menu),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.details || data.error || "Error al crear el menú");
    }
    return data.menu;
}

export async function actualizarVisibilidadMenu(id: number, visible: boolean): Promise<MenuModel> {
    const response = await authFetch(`/menus/actualizarVisibilidad/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visible }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.details || data.error || "Error al actualizar el menú");
    }
    return data.menu;
}

export async function getRolesDeMenu(id_menu: number): Promise<MenuRolAsignacion[]> {
    const params = new URLSearchParams({ id_menu: String(id_menu) });
    const response = await authFetch(`/menus/getRolesDeMenu?${params.toString()}`);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.details || data.error || "Error al obtener los roles del menú");
    }
    return data.roles;
}

export async function asignarRolAMenu(id_menu: number, id_rol_core: number): Promise<MenuRolAsignacion> {
    const response = await authFetch(`/menus/asignarRolAMenu`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_menu, id_rol_core }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.details || data.error || "Error al asignar el rol al menú");
    }
    return data.asignacion;
}

export async function quitarRolDeMenu(id_menu_rol: number): Promise<void> {
    const response = await authFetch(`/menus/quitarRolDeMenu/${id_menu_rol}`, {
        method: 'DELETE',
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.details || data.error || "Error al quitar el rol del menú");
    }
}