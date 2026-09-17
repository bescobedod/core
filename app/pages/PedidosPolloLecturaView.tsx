"use client";

import { PedidosLecturaBase } from "./PedidosLecturaBase";

export function PedidosPolloLecturaView({ nivelPermiso }: { nivelPermiso: "lectura" | "lectura_division" }) {
  return (
    <PedidosLecturaBase
      tipoPedido="POLLO"
      nivelPermiso={nivelPermiso}
      titulo="Pedidos de Pollo (solo lectura)"
      subtitulo="Consulta qué pidió cada tienda, agrupado por ruta"
    />
  );
}
