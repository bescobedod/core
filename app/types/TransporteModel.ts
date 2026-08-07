export interface PilotoUsuario {
  id_users: number;
  first_name: string;
  second_name: string | null;
  first_last_name: string | null;
  second_last_name: string | null;
  codigo_user: string;
  email: string | null;
}

export interface AsignacionTransporte {
  id: string;
  ruta_id: string;
  fecha: string;
  camion_id: string;
  camion_placa: string | null;
  piloto_id: number;
  piloto_nombre: string | null;
}

export interface AsignarTransportePayload {
  ruta_id: string;
  fecha: string;
  camion_id: string;
  piloto_id: number;
}