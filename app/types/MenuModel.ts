export interface MenuModel {
    id_menu: number;
    nombre: string;
    icono: string;
    nombre_menu: string;
    descripcion: string;
    visible: boolean;
    tipo?: string;
}

export interface MenuRolAsignacion {
    id_menu_rol: number;
    id_rol_core: number;
    nombre_rol: string | null;
}