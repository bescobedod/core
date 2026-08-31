"use client";

import { PilotoClienteSapBase } from "./PilotoClienteSapBase";

export function PilotoClienteSapPolloView() {
  return (
    <PilotoClienteSapBase
      tipoRuta="POLLO"
      titulo="Pilotos — Cliente SAP (Pollo)"
      subtitulo="Asigna el código de cliente en SAP (AVIGUA) de cada piloto, para poder registrar sus entregas"
    />
  );
}
