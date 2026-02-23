export interface UserModel {
    id_usuario?: string,
    estado: number,
    id_rol: number,
    nombre_usuario: string,
    email: string,
    password_hash: string,
    nombre: string,
    apellido: string,
    id_departamento: number,
    esta_activo: boolean,
    fecha_ultimo_login: Date,
    fecha_creacion: Date,
    fecha_actualizacion: Date
}