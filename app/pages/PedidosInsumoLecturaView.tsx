"use client";

import { PedidosLecturaBase } from "./PedidosLecturaBase";

export function PedidosInsumoLecturaView({ nivelPermiso }: { nivelPermiso: "lectura" | "lectura_division" }) {
  return (
    <PedidosLecturaBase
      tipoPedido="INSUMOS"
      nivelPermiso={nivelPermiso}
      titulo="Pedidos de Insumos (solo lectura)"
      subtitulo="Consulta qué pidió cada tienda, agrupado por ruta"
    />
  );
}
