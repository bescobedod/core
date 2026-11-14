"use client";

import { useEffect, useState } from "react";
import { Egg, Loader2, Store } from "lucide-react";
import { getAllMenus } from "../api/MenuApi";
import { NivelPermisoMenu } from "../types/MenuModel";
import { PedidosPolloView } from "./PedidosPolloView";
import { PedidosPolloArtesanoPanel } from "./PedidosPolloArtesanoPanel";

type Modo = "TIENDAS" | "ARTESANO";

const OPCIONES: { modo: Modo; label: string; icono: typeof Store }[] = [
  { modo: "TIENDAS", label: "Pedidos de tienda", icono: Store },
  { modo: "ARTESANO", label: "Pollo Artesano", icono: Egg },
];

// Elige entre los pedidos de tienda (la vista de siempre, sin cambios) y los de pollo artesano.
// El selector se dibuja debajo del título de cada vista, para que salga junto con ella.
export function PedidosPolloSelector() {
  const [modo, setModo] = useState<Modo>("TIENDAS");
  const [nivel, setNivel] = useState<NivelPermisoMenu | null>(null);

  useEffect(() => {
    getAllMenus()
      .then((menus) => setNivel(menus.find((m) => m.nombre_menu === "PedidosPolloView")?.nivel_permiso || "escritura"))
      .catch(() => setNivel("escritura"));
  }, []);

  if (nivel === null) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 text-[#2183AE] animate-spin" />
      </div>
    );
  }

  // Con permiso de solo lectura se muestra únicamente la vista de tienda.
  if (nivel !== "escritura") return <PedidosPolloView />;

  const selector = (
    <div className="mb-4">
      <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
        {OPCIONES.map(({ modo: valor, label, icono: Icono }) => (
          <button
            key={valor}
            onClick={() => setModo(valor)}
            className={`flex items-center gap-1.5 px-4 py-1.5 text-sm rounded-lg transition-colors ${
              modo === valor ? "bg-[#2183AE] text-white" : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <Icono size={14} /> {label}
          </button>
        ))}
      </div>
    </div>
  );

  return modo === "TIENDAS" ? <PedidosPolloView selector={selector} /> : <PedidosPolloArtesanoPanel selector={selector} />;
}
