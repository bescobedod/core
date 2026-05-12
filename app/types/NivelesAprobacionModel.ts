export interface NivelAprobacionModel {
    id: string;
    matriz_id: string;
    nivel: number;
    rol_aprobador_id: number;
    usuario_aprobador_id: string;
    es_requerido?: boolean;
    puede_delegar?: boolean;
}

export interface VwNivelMatrizAprovacionSolicitudCompra {
    id: string;
    matriz_id: string;
    nivel: number;
    rol_aprobador_id: number;
    usuario_aprobador_id: string;
    aprobador: string;
    puesto_aprobador: string;
    es_requerido?: boolean;
    puede_delegar?: boolean;
    fecha_creacion: Date;
    fecha_actualizacion: Date;
}