export interface ValesCombustible {
  id_vale: string;
  id_usuario: number;
  placa_vehiculo: string;
  monto: number;
  foto_vale_url: string | null;
  foto_bomba_url: string | null;
  coordenadas: {
    latitude: number;
    longitude: number;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface ValesCombustiblePagination {
  total: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface ValesCombustibleResponse {
  data: ValesCombustible[];
  pagination: ValesCombustiblePagination;
}