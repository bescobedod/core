import { VwNivelMatrizAprovacionSolicitudCompra } from "./NivelesAprobacionModel";

export interface MatrizAprobacionSolicitudModel {
    id: string;
    departamento_id: string;
    estrategia_adquisicion_id: string;
    prioridad: number;
    esta_activo: boolean;
    fecha_creacion: Date;
    fecha_actualizacion: Date;
    nombre: string;
    niveles: VwNivelMatrizAprovacionSolicitudCompra[];
}

export interface MatrizAprobacionOrdenModel {
    id: string;
    estrategia_adquisicion_id: string;
    prioridad: number;
    esta_activo: boolean;

    niveles: VwNivelMatrizAprovacionSolicitudCompra[];
}