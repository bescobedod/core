"use client";

import { PilotoClienteSapBase } from "./PilotoClienteSapBase";

export function PilotoClienteSapInsumoView() {
  return (
    <PilotoClienteSapBase
      tipoRuta="INSUMOS"
      titulo="Pilotos — Cliente SAP (Insumos)"
      subtitulo="Asigna el código de cliente en SAP (base de insumos) de cada piloto, para poder registrar sus entregas"
    />
  );
}
