import { authFetch } from '../utils/auth-fetch';
import { TipoRuta } from '../types/CamionRutaModel';
import { PilotoConClienteSap, ClienteSap } from '../types/PilotoClienteSapModel';

export async function getPilotos(tipo: TipoRuta, query: string): Promise<PilotoConClienteSap[]> {
  const params = new URLSearchParams({ tipo, query });

  const response = await authFetch(`/pilotoClienteSap/getPilotos?${params.toString()}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.details || errorData.error || "Error al obtener los pilotos");
  }
  const data = await response.json();
  return data.pilotos;
}

export async function asignarClienteSap(
  pilotoId: number,
  tipo: TipoRuta,
  cardCode: string,
  cardName?: string
): Promise<void> {
  const response = await authFetch(`/pilotoClienteSap/asignarClienteSap`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ piloto_id: pilotoId, tipo, card_code: cardCode, card_name: cardName }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.details || data.error || "Error al asignar el cliente SAP");
  }
}

export async function buscarClientesSap(tipo: TipoRuta, query: string): Promise<ClienteSap[]> {
  const params = new URLSearchParams({ tipo, query });

  const response = await authFetch(`/pilotoClienteSap/buscarClientes?${params.toString()}`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.details || data.error || "Error al buscar clientes en SAP");
  }
  return data.clientes;
}
