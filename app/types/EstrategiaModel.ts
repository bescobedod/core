import { MatrizAprobacionSolicitudModel, MatrizAprobacionOrdenModel } from "./MatricesAprobacionModel";

export interface EstrategiaModel {
    id?: string;
    codigo?: string;
    nombre: string;
    descripcion: string;
    requiere_cotizaciones: boolean;
    minimo_cotizaciones?: number;
    esta_activo: boolean;
    departamento_id?: string;
}

export interface Matrices {
    matrices_solicitud: MatrizAprobacionSolicitudModel | null;
    matrices_orden: MatrizAprobacionOrdenModel[];
}