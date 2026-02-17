import { MenuModel } from "../types/MenuModel";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL

export async function getAllMenus(): Promise<MenuModel[]> {
    const response = await fetch(`${BASE_URL}/menus/getAllMenus`);

    if(!response.ok) {
        throw new Error("Error al obtener lista de menús");
    }
    
    return response.json();
}