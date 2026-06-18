import { UserModel } from "./UserModel";

export interface CamionModel {
    id_camion: string;
    placa: string;
    marca?: string;
    linea?: string;
    modelo?: number;
    color?: string;
    kilometraje_actual: number;
    kilometraje_ultimo_mantenimiento: number;
    intervalo_mantenimiento: number;
    id_supervisor?: number;
    id_conductor_habitual?: number;
    tarjeta_circulacion?: string;
    vencimiento_seguro?: string;
    foto_camion_url?: string;
    estado: 'ACTIVO' | 'INACTIVO' | 'EN_MANTENIMIENTO';
    nombre_conductor_ultimo?: string;
    numero_licencia_ultimo?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

// ─── Inspección (checklist) ───────────────────────────────────────────────────

export type TipoChecklist = 'PILOTO' | 'SUPERVISOR';
export type EstadoChecklist = 'ENVIADO';

export interface ChecklistItem {
    item: string;
    estado: 'BUENO' | 'MALO';
    observaciones?: string;
}

export interface DamagePoint {
    x: number;
    y: number;
}

export interface MarcasDanos {
    frente?: DamagePoint[];
    trasera?: DamagePoint[];
    'lateral-izq'?: DamagePoint[];
    'lateral-der'?: DamagePoint[];
}

export interface Coordenadas {
    latitud?: number;
    longitud?: number;
    precision?: number;
}

export interface CamionInspeccionModel {
    id_checklist: string;
    tipo_checklist: TipoChecklist;
    id_usuario: number;
    placa_vehiculo: string;
    licencia_conducir?: string;
    licencia_conducir_num?: string;
    kilometraje?: string;
    fecha_inspeccion: Date;
    estado_checklist: EstadoChecklist;
    niveles?: ChecklistItem[];
    chequeo_funcionamiento?: ChecklistItem[];
    equipo_basico?: ChecklistItem[];
    varios?: ChecklistItem[];
    marcas_danos?: MarcasDanos;
    puntos_frontal?: DamagePoint[];
    puntos_trasero?: DamagePoint[];
    puntos_lateral_izq?: DamagePoint[];
    puntos_lateral_der?: DamagePoint[];
    foto_placa_url?: string;
    foto_kilometraje_url?: string;
    foto_licencia_url?: string;
    firma_canvas_base64: string;
    firma_supervisor?: string;
    nombre_conductor?: string;
    fecha_mantenimiento?: string;
    coordenadas?: Coordenadas;
    limpieza_exterior?: ChecklistItem[];
    limpieza_cabina?: ChecklistItem[];
    limpieza_furgon?: ChecklistItem[];
    createdAt: Date;
    updatedAt: Date;
}

// ─── Vista enriquecida (respuesta del backend con usuario resuelto) ────────────

export interface VwCamionInspeccion extends CamionInspeccionModel {
    usuario?: {
        nombre: string;
    };
    tiene_vale_combustible: boolean;
}

// ─── Paginación ───────────────────────────────────────────────────────────────

export interface InspeccionesPagination {
    total: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
}

export interface InspeccionesResponse {
    data: VwCamionInspeccion[];
    pagination: InspeccionesPagination;
}

// ─── Query params del listado ─────────────────────────────────────────────────

export interface GetInspeccionesParams {
    nombre_conductor?: string;
    placa?: string;
    tipo_checklist?: TipoChecklist;
    page?: number;
    limit?: number;
}