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

// 1. NUEVA INTERFAZ: Para mapear las opciones de proveedores de cada artículo
export interface ProveedorCotizado {
    proveedor_id: string;
    nombre_proveedor: string;
    precio_unitario: number;
    es_seleccionado: boolean;
    imagen_url?: string | null;
}

// 2. MODIFICADO: Estructura que requiere tu controlador backend
export interface ItemOrdenCompra {
    linea_solicitud_id: string;
    codigo_articulo: string;
    nombre_articulo: string;
    cantidad: number;
    centro_costo?: string;    // Opcional para enviar al backend
    cuenta_contable?: string;  // Opcional para enviar al backend
    descripcion?: string;
    proveedores: ProveedorCotizado[]; // <--- El arreglo que el backend leerá para hacer el bulkCreate
}

export interface CreateOrdenCompraPayload {
    header: {
        solicitud_id: string;
        moneda?: 'GTQ' | 'USD';
        notas?: string;
    };
    items: ItemOrdenCompra[];
    cotizacion?: File;
    imagenesProveedor?: ImagenProveedorPayload[];
}

export interface ImagenProveedorPayload {
    itemIndex: number;
    proveedor_id: string;
    file: File;
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
    proveedores?: LineaOrdenProveedorModel[];
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

export interface LineaOrdenProveedorModel {
    id: string;
    linea_orden_id: string;
    proveedor_id: string;
    nombre_proveedor: string;
    precio_unitario: string;
    descripcion?: string | null;
    es_seleccionado: boolean;
    imagen_s3_key?: string | null;
    imagen_url?: string | null;
    imagen_nombre?: string | null;
    fecha_creacion: Date;
}