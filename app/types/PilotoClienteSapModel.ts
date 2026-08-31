export interface PilotoConClienteSap {
  piloto_id: number;
  codigo_user: string;
  nombre: string;
  email_office: string | null;
  card_code: string | null;
  card_name: string | null;
}

export interface ClienteSap {
  CardCode: string;
  CardName: string;
}
