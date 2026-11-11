"use client";

import { useEffect, useState } from "react";
import { Package, Truck } from "lucide-react";
import { getAllMenus } from "../api/MenuApi";
import { TabCargados, TabCargar } from "./RastroCargaArtesano";

const MENU_RASTRO = "AvicolaPedidosArtesanoView";

// Cargar incluye la autorización (total o parcial); aquí también se rechaza y se entrega.
type PestanaRastro = "cargar" | "cargados";

const PESTANAS_RASTRO: { id: PestanaRastro; etiqueta: string; icono: typeof Truck }[] = [
  { id: "cargar", etiqueta: "Por cargar", icono: Package },
  { id: "cargados", etiqueta: "Cargados", icono: Truck },
];

export function RastroPedidosArtesanoView() {
  const [pestana, setPestana] = useState<PestanaRastro>("cargar");
  // Cargar, rechazar, entregar y cambiar el piloto piden 'escritura' en el menú.
  const [puedeResolver, setPuedeResolver] = useState(false);

  useEffect(() => {
    getAllMenus()
      .then((menus) => {
        const propio = menus.find((m) => m.nombre_menu === MENU_RASTRO);
        setPuedeResolver((propio?.nivel_permiso || "escritura") === "escritura");
      })
      .catch(() => setPuedeResolver(false));
  }, []);

  return (
    <div className="py-4 sm:py-6 lg:py-8 px-2 sm:px-4">
      <div className="w-full max-w-5xl mx-auto">
        <div className="mb-6 bg-gradient-to-r from-[#2183AE] to-[#1a6a8f] rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Truck className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-white text-lg font-semibold leading-tight">Avícola · Pollo Artesano</h2>
              <p className="text-sm text-white/90">Carga, rechaza y entrega los pedidos de los clientes</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-6 bg-white border border-gray-200 rounded-xl p-1.5 shadow-sm w-fit">
          {PESTANAS_RASTRO.map(({ id, etiqueta, icono: Icono }) => (
            <button
              key={id}
              onClick={() => setPestana(id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                pestana === id ? "bg-[#2183AE] text-white shadow" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Icono className="h-4 w-4" /> {etiqueta}
            </button>
          ))}
        </div>

        {pestana === "cargar" && <TabCargar puedeResolver={puedeResolver} />}
        {pestana === "cargados" && <TabCargados puedeResolver={puedeResolver} />}
      </div>
    </div>
  );
}
