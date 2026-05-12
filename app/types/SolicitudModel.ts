export interface SolicitudCompraModel {
    id?: number;
    numero_requisicion: string;
    departamento_id: string;
    solicitado_por: string;
    estrategia_adquisicion_id: string;
    estado: boolean;
    justificacion: string;
    fecha_requerida: Date;
    correlativo: number;
    fecha_creacion?: Date;
    fecha_actualizacion?: Date;
    nivel_aprobador: number;
    id_aprobador: string;
    es_activo_fijo: boolean;
    DocEntry: number;
    DocNum: number;
}

export interface LineaSolicitudCompraModel {
    id?: number;
    requisicion_id: string;
    numero_linea: number;
    codigo_articulo: string;
    nombre_articulo: string;
    descripcion?: string;
    cantidad: number;
    unidad_medida: string;
    precio_unitario_estimado: number;
    total_estimado: number;
    cuenta_contable?: string;
    centro_costo?: string;
    notas?: string;
    fecha_creacion?: Date;
    fecha_actualizacion?: Date;
    esValidadoTemporal: boolean;
    imagen_s3_key: string;
    imagen_nombre: string;
}

export interface VwSolicitudCompra {
    id: string;
    numero_requisicion: string;
    departamento_id: string;
    codigo: string;
    nombre: string;
    solicitado_por: string;
    estrategia_adquisicion_id: string;
    codigo_estrategia: string;
    estrategia_adquisicion: string;
    estado: string;
    justificacion: string;
    fecha_requerida: Date
    fecha_creacion: Date
    nivel_aprobador: number
    cantidad_articulos: number;
    cantidad_total: number;
    es_activo_fijo: boolean;
    items: LineaSolicitudCompraModel[];
    DocEntry: number;
    DocNum: number;
}

export interface VwAprobadoresSolicitudCompra {
    id: string;
    requisicion_id: string;
    numero_requisicion: string;
    nivel: number;
    usuario_aprobador_id: string;
    aprobador: string;
    puesto: string;
    estado: string;
    comentarios: string;
    fecha_aprobacion: Date;
}

export interface SolicitudesPagination {
    total: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
}

export interface SolicitudesCompraResponse {
    data: VwSolicitudCompra[];
    pagination: SolicitudesPagination;
}