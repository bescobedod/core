import { Empresa, SolicitudCompraModel, VwSolicitudCompra } from "./SolicitudModel";

export interface OrdenCompraModel {
    id: string;
    numero_orden: string;
    solicitud_id: string;
    proveedor_id: string;
    proveedor: string;
    fecha_orden: Date;
    estado: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | 'COMPLETADO' | 'CANCELADO';
    monto_total: number;
    moneda: 'GTQ' | 'USD';
    notas?: string;
    sap_doc_entry?: number;
    sap_doc_num?: number;
    fecha_creacion?: Date;
    fecha_actualizacion?: Date;
    id_empresa?: string;
    correlativo: number;
    codigo_departamento: string;
    cotizacion_s3_key?: string;
    cotizacion_nombre?: string;
    cotizacion_url?: string;
    solicitado_por: number;
    departamento_id: string;
    estrategia_adquisicion_id: string;
    matriz_id: string;
    fecha_requerida: Date;
}

export interface ItemOrdenCompra {
    linea_solicitud_id: string;
    codigo_articulo: string;
    nombre_articulo: string;
    proveedor_id: string;
    cantidad: number;
    precio_unitario: number;
    moneda: 'GTQ' | 'USD';
}

export interface CreateOrdenCompraPayload {
    header: {
        solicitud_id: string;
        moneda?: 'GTQ' | 'USD';
        notas?: string;
    };
    items: ItemOrdenCompra[];
    cotizacion?: File;
}

export interface CreateOrdenCompraResponse {
    message: string;
    orden: {
        id: string;
        numero_orden: string;
        estado: string;
        monto_total: number;
        moneda: string;
        fecha_orden: Date;
        cotizacion_url?: string;
        cotizacion_nombre?: string;
        solicitud: {
            id: string;
            numero_requisicion: string;
            justificacion: string;
            solicitado_por: string;
            empresa?: Empresa;
        };
    };
}

export interface LineaOrdenCompraModel {
    id: string;
    orden_id: string;
    linea_solicitud_id: string;
    numero_linea: number;
    codigo_articulo: string;
    nombre_articulo: string;
    cantidad: number;
    precio_unitario: string;
    total_linea: string;
    centro_costo: string;
    cuenta_contable: string;
    fecha_creacion: Date;
    descripcion: string;
}

export interface VwOrdenCompra {
    id: string;
    numero_orden: string;
    solicitud_id: string;
    proveedor_id: string;
    proveedor: string;
    fecha_orden: Date;
    estado: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | 'COMPLETADO' | 'CANCELADO';
    monto_total: number;
    moneda: 'GTQ' | 'USD';
    notas?: string;
    sap_doc_entry?: number;
    sap_doc_num?: number;
    fecha_creacion: Date;
    fecha_actualizacion?: Date;
    id_empresa?: string;
    correlativo: number;
    codigo_departamento: string;
    cotizacion_s3_key?: string;
    cotizacion_nombre?: string;
    cotizacion_url?: string;
    solicitado_por: number;
    departamento_id: string;
    estrategia_adquisicion_id: string;
    matriz_id: string;
    fecha_requerida: Date;
    items: LineaOrdenCompraModel[];
    empresa?: Empresa;
    solicitud?: SolicitudCompraModel;
}

export interface OrdenesPagination {
    total: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
}

export interface OrdenesCompraResponse {
    data: VwOrdenCompra[];
    pagination: OrdenesPagination;
}

export interface VwAprobadoresOrdenCompra {
    id: string;
    orden_compra_id: string;
    nivel: number;
    estado: string;
    comentarios: string;
    fecha_aprobacion: Date;
    aprobador: string;
    puesto: string;
}