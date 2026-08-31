"use client";

import { CamionesEnRutaBase } from "./CamionesEnRutaBase";

export function CamionesEnRutaInsumoView() {
  return (
    <CamionesEnRutaBase
      tipoRuta="INSUMOS"
      titulo="Camiones en Ruta — Insumos"
      subtitulo="Ubicación de pilotos, inventario en camión y avance de entregas por tienda"
    />
  );
}
