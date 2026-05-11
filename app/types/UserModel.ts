export interface UserModel {
    id_users?: number,
    codigo_user: string,
    id_rol: number,
    first_name: string,
    second_name: string,
    first_last_name: string,
    second_last_name: string,
    email: string,
    password: string,
    dpi: string,
    fecha_nacimiento: Date,
    direccion: string;
    puesto_trabajo: string,
    baja: boolean,
    division: number,
    image_profile: string,
    id_departamento: string,
    id_area: string
}

export interface UserTemporalModel {
    id_users: number;
    first_name: string;
    first_last_name: string;
    email: string;
    id_area: string;
    nombre_area: string;
};

export interface VwUsuariosModel {
    id_users: number;
    codigo_user: string;
    baja: boolean;
    id_rol: number;
    nombre_rol: string;
    email: string;
    nombre: string;
    id_departamento: string;
    nombre_departamento: string;
    puesto_trabajo: string;
    id_area: string;
    nombre_area: string;
}