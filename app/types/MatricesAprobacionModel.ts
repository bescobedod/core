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
    monto_minimo: string;
    monto_maximo: string;
    moneda: string;
    prioridad: number;
    esta_activo: boolean;
    fecha_creacion: Date;
    fecha_actualizacion: Date;
    departamento_id: string;
    nombre: string;
    niveles: VwNivelMatrizAprovacionSolicitudCompra[];
}