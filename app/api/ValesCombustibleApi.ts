import { ValesCombustibleResponse } from "../types/ValesCombustibleModel";
import { authFetch } from "../utils/auth-fetch";

export async function getValesCombustible(
  placa?: string,
  fecha?: string
): Promise<ValesCombustibleResponse> {
  const params = new URLSearchParams();

  if (placa)  params.append("placa", placa);
  if (fecha)  params.append("fecha", fecha);

  const response = await authFetch(`/vale/getValesCombustible?${params.toString()}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message ?? "Error al obtener vales de combustible");
  }

  return response.json();
}