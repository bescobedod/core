import { VwUsuariosModel } from "./UserModel";

export interface AreaModel {
    id_area: string;
    departamento_id: string;
    jefe_inmediato: string;
    nombre: string;
    descripcion: string;
    activo?: boolean;
}

export interface VwAreasModel {
    id_area: string;
    nombre: string;
    descripcion: string;
    activo: boolean;
    departamento_id: string;
    nombre_departament: string;
    jefe_inmediato: string;
    nombre_jefe_inmediato: string;
}

export interface AreasUsuariosModel {
    Areas: VwAreasModel[];
    Usuarios: VwUsuariosModel[]
}