"use client";

import { MenuModel } from "../types/MenuModel";
import * as Icons from "lucide-react";

// Mapa BD.nombre_menu → Vista en tu app
const viewMap: Record<string, string> = {
  OrderView: "pedidos",
  PendingOrdersView: "gestionar-pedidos",
  HomeView: "home",
  // agrega los que necesites
};

// Función para obtener el ícono desde lucide-react
function getIcon(name: string) {
  if (name in Icons) {
    // @ts-expect-error clave dinámica
    return Icons[name];
  }
  return Icons.Circle;
}

export function HomeView({
  menus,
  onNavigate
}: {
  menus: MenuModel[];
  onNavigate: (v: any) => void;
}) {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-12rem)]">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-gray-900 mb-3">Bienvenido al Sistema</h1>
          <p className="text-gray-600 text-base sm:text-lg">
            Selecciona una opción para comenzar
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-6 sm:gap-8">
            {menus
            .filter(m => m.visible)
            .map(m => {
              const Icon = getIcon(m.icono);
              const view = viewMap[m.nombre_menu ?? ""] ?? "home";
              return (
                <button
                  key={m.id_menu}
                  onClick={() => onNavigate(view)}
                  className="group bg-white rounded-2xl p-6 sm:p-8 shadow-xl border border-gray-200 hover:shadow-2xl hover:border-[#2183AE] transition-all duration-300 transform hover:-translate-y-1 w-full sm:w-[calc(50%-1rem)]"
                >
                  <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-[#2183AE] to-[#2183AE] rounded-2xl flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 transition-transform duration-300">
                      <Icon className="w-8 h-8 sm:w-10 sm:h-10 text-gray-900" />
                    </div>
                    <h2 className="text-gray-900 mb-2 sm:mb-3">{m.nombre}</h2>
                    <p className="text-gray-600 text-sm sm:text-base">
                      {m.descripcion}
                    </p>
                  </div>
                </button>
              );
            })}
        </div>
      </div>
    </div>
  );
}