"use client";

import * as React from "react";
import { ChevronsUpDown, Search, Check } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "./popover";
import { cn } from "./utils";

export interface OpcionBuscable {
  value: string;
  label: string;
  // Texto chico a la derecha (p. ej. "ya asignado este día").
  detalle?: string;
  disabled?: boolean;
}

export interface GrupoBuscable {
  // Sin título = las opciones se muestran sin encabezado de grupo.
  titulo?: string;
  opciones: OpcionBuscable[];
}

interface SelectBuscableProps {
  grupos: GrupoBuscable[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  placeholderBusqueda?: string;
  mensajeVacio?: string;
  disabled?: boolean;
  className?: string;
}

function normalizar(texto: string) {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

// Dropdown con buscador. A diferencia de ui/combobox, acepta grupos con
// título y opciones deshabilitadas (se ven pero no se pueden elegir).
export function SelectBuscable({
  grupos,
  value,
  onChange,
  placeholder = "Seleccionar…",
  placeholderBusqueda = "Buscar…",
  mensajeVacio = "No se encontraron resultados",
  disabled = false,
  className,
}: SelectBuscableProps) {
  const [abierto, setAbierto] = React.useState(false);
  const [busqueda, setBusqueda] = React.useState("");

  const seleccionada = React.useMemo(
    () => grupos.flatMap((g) => g.opciones).find((o) => o.value === value) || null,
    [grupos, value]
  );

  const gruposFiltrados = React.useMemo(() => {
    const termino = normalizar(busqueda.trim());
    return grupos
      .map((g) => ({
        ...g,
        opciones: termino ? g.opciones.filter((o) => normalizar(o.label).includes(termino)) : g.opciones,
      }))
      .filter((g) => g.opciones.length > 0);
  }, [grupos, busqueda]);

  const elegir = (opcion: OpcionBuscable) => {
    if (opcion.disabled) return;
    onChange(opcion.value);
    setAbierto(false);
  };

  return (
    <Popover
      open={abierto}
      onOpenChange={(estado) => {
        if (disabled) return;
        setAbierto(estado);
        if (!estado) setBusqueda("");
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={abierto}
          disabled={disabled}
          className={cn(
            "flex w-full items-center justify-between gap-2 px-3 py-2 text-xs border border-gray-300 rounded-lg bg-white text-left focus:ring-2 focus:ring-[#2183AE] focus:border-transparent outline-none disabled:opacity-50",
            className
          )}
        >
          <span className={cn("truncate", !seleccionada && "text-gray-500")}>
            {seleccionada ? seleccionada.label : placeholder}
          </span>
          <ChevronsUpDown size={14} className="shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      {/* hideWhenDetached={false}: el PopoverContent oculta la lista cuando su
          campo queda dentro de la franja reservada para el Header (112 px).
          Dentro de una tarjeta baja con overflow-hidden (p. ej. la sección de
          transporte) eso la ocultaba siempre y el dropdown se veía vacío. */}
      <PopoverContent align="start" className="p-0 bg-white" hideWhenDetached={false}>
        <div className="sticky top-0 z-10 bg-white flex items-center gap-2 border-b border-gray-200 px-3">
          <Search size={14} className="shrink-0 opacity-50" />
          <input
            autoFocus
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const primera = gruposFiltrados.flatMap((g) => g.opciones).find((o) => !o.disabled);
                if (primera) {
                  e.preventDefault();
                  elegir(primera);
                }
              }
            }}
            placeholder={placeholderBusqueda}
            className="h-9 w-full bg-transparent text-xs outline-none placeholder:text-gray-500"
          />
        </div>
        <div className="max-h-64 overflow-y-auto p-1">
          {gruposFiltrados.length === 0 ? (
            <p className="py-6 text-center text-xs text-gray-500">{mensajeVacio}</p>
          ) : (
            gruposFiltrados.map((g, i) => (
              <div key={g.titulo ?? `grupo-${i}`} className={i > 0 ? "mt-1 border-t border-gray-100 pt-1" : ""}>
                {g.titulo && (
                  <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">{g.titulo}</p>
                )}
                {g.opciones.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    disabled={o.disabled}
                    onClick={() => elegir(o)}
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-gray-800 hover:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-400 disabled:hover:bg-transparent"
                  >
                    <Check size={12} className={cn("shrink-0", o.value === value ? "text-[#2183AE]" : "invisible")} />
                    <span className="flex-1 truncate">{o.label}</span>
                    {o.detalle && <span className="shrink-0 text-[10px] text-gray-400">{o.detalle}</span>}
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
