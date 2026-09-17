"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Loader2, AlertCircle, Store, Truck, Package, Filter } from "lucide-react";
import { format, addDays } from "date-fns";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { getPedidosPorDivision } from "../api/PedidoPosApi";
import { getMiDivision } from "../api/UserApi";
import { PedidoPosItem, PedidoPosRuta, PedidoPosRutaInsumos } from "../types/PedidoPosModel";

interface PedidoNormalizado {
  label: string;
  numero_pedido: string;
  estado: string;
  items: PedidoPosItem[];
}

interface TiendaNormalizada {
  codigo_tienda: string;
  nombre_tienda: string;
  pedidos: PedidoNormalizado[];
}

interface RutaNormalizada {
  ruta_id: string;
  nombre_ruta: string;
  tiendas: TiendaNormalizada[];
}

function normalizarPollo(rutas: PedidoPosRuta[]): RutaNormalizada[] {
  return rutas.map((r, idx) => {
    // El backend NO fusiona por tienda para Pollo (a diferencia de Insumos):
    // una tienda puede tener más de una cabecera de pedido para la misma
    // ruta+fecha, y cada una llega como una entrada aparte en r.tiendas. Se
    // agrupan aquí por codigo_tienda para no repetir la tarjeta ni la key.
    const tiendasPorCodigo = new Map<string, TiendaNormalizada>();

    r.tiendas.forEach((t) => {
      const codigo = t.codigo_tienda || "";
      const pedido: PedidoNormalizado = {
        label: "Pedido",
        numero_pedido: t.numero_pedido,
        estado: t.estado,
        items: t.items,
      };

      const existente = tiendasPorCodigo.get(codigo);
      if (existente) {
        existente.pedidos.push(pedido);
      } else {
        tiendasPorCodigo.set(codigo, {
          codigo_tienda: codigo,
          nombre_tienda: t.nombre_tienda || "—",
          pedidos: [pedido],
        });
      }
    });

    return {
      ruta_id: r.ruta_id || `${r.nombre_ruta}-${idx}`,
      nombre_ruta: r.nombre_ruta,
      tiendas: Array.from(tiendasPorCodigo.values()),
    };
  });
}

function normalizarInsumos(rutas: PedidoPosRutaInsumos[]): RutaNormalizada[] {
  return rutas.map((r, idx) => ({
    ruta_id: r.ruta_id || `${r.nombre_ruta}-${idx}`,
    nombre_ruta: r.nombre_ruta,
    tiendas: r.tiendas.map((t) => {
      const pedidos: PedidoNormalizado[] = [];
      if (t.insumos) {
        pedidos.push({ label: "Insumos", numero_pedido: t.insumos.numero_pedido, estado: t.insumos.estado, items: t.insumos.items });
      }
      if (t.activo_fijo) {
        pedidos.push({ label: "Activo Fijo", numero_pedido: t.activo_fijo.numero_pedido, estado: t.activo_fijo.estado, items: t.activo_fijo.items });
      }
      return { codigo_tienda: t.codigo_tienda || "", nombre_tienda: t.nombre_tienda || "—", pedidos };
    }),
  }));
}

interface PedidosLecturaBaseProps {
  tipoPedido: "POLLO" | "INSUMOS";
  nivelPermiso: "lectura" | "lectura_division";
  titulo: string;
  subtitulo: string;
}

// Pantalla de solo lectura para niveles de permiso 'lectura'/'lectura_division':
// nada de candados, transporte, comparativo de stock ni envío a SAP — solo
// listar qué pidió cada tienda, agrupado por ruta, restringido a una división.
// 'lectura' permite alternar entre división 1 y 2; 'lectura_division' se fija
// a la división del usuario (UsersModel.division) sin poder cambiarla.
export function PedidosLecturaBase({ tipoPedido, nivelPermiso, titulo, subtitulo }: PedidosLecturaBaseProps) {
  const [fecha, setFecha] = useState(format(addDays(new Date(), 1), "yyyy-MM-dd"));
  const [divisionManual, setDivisionManual] = useState<"1" | "2">("1");
  const [miDivision, setMiDivision] = useState<string | null>(null);
  const [cargandoDivision, setCargandoDivision] = useState(nivelPermiso === "lectura_division");
  const [rutas, setRutas] = useState<RutaNormalizada[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [rutasAbiertas, setRutasAbiertas] = useState<Set<string>>(new Set());
  const [tiendasAbiertas, setTiendasAbiertas] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (nivelPermiso !== "lectura_division") return;

    getMiDivision()
      .then((d) => setMiDivision(d.division !== null ? String(d.division) : null))
      .catch(() => setMiDivision(null))
      .finally(() => setCargandoDivision(false));
  }, [nivelPermiso]);

  const divisionActiva = nivelPermiso === "lectura" ? divisionManual : (miDivision as "1" | "2" | null);

  // La búsqueda es manual (botón "Buscar"): no se dispara sola al cambiar la
  // fecha o la división. El filtro por división ya lo aplica el backend
  // (getPedidosPorDivision cruza contra dbo.tTienda.StoreNumberSimphony),
  // no se filtra nada del lado del cliente.
  const handleBuscar = () => {
    if (!divisionActiva) return;

    setCargando(true);
    setError(null);

    const promesa =
      tipoPedido === "POLLO"
        ? getPedidosPorDivision("POLLO", fecha, divisionActiva).then((data) => normalizarPollo(data.rutas))
        : getPedidosPorDivision("INSUMOS", fecha, divisionActiva).then((data) => normalizarInsumos(data.rutas));

    promesa
      .then((rutasNorm) => {
        setRutas(rutasNorm);
        setRutasAbiertas(new Set());
        setTiendasAbiertas(new Set());
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Error al obtener los pedidos");
      })
      .finally(() => {
        setCargando(false);
        setHasSearched(true);
      });
  };

  const toggleRuta = (id: string) => {
    setRutasAbiertas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleTienda = (key: string) => {
    setTiendasAbiertas((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const sinDivisionAsignada = nivelPermiso === "lectura_division" && !cargandoDivision && !miDivision;

  return (
    <div className="py-4 sm:py-6 lg:py-8 px-2 sm:px-4">
      <div className="w-full max-w-5xl mx-auto">
        <div className="mb-6 bg-gradient-to-r from-[#2183AE] to-[#1a6a8f] rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Store className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-white text-lg font-semibold leading-tight">{titulo}</h2>
              <p className="text-sm text-white/90">{subtitulo}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 mb-6">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <Label className="text-xs text-gray-700 mb-1.5 block">Fecha Requerida</Label>
              <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="h-9 text-sm" />
            </div>

            {nivelPermiso === "lectura" && (
              <div>
                <Label className="text-xs text-gray-700 mb-1.5 block">División</Label>
                <div className="flex border border-gray-300 rounded-lg overflow-hidden w-fit">
                  {(["1", "2"] as const).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDivisionManual(d)}
                      className={`px-4 h-9 text-sm font-medium transition-colors ${
                        divisionManual === d ? "bg-[#2183AE] text-white" : "bg-white text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      División {d}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {nivelPermiso === "lectura_division" && !cargandoDivision && miDivision && (
              <div className="text-sm text-gray-600 pb-2">
                Mostrando tiendas de tu división: <strong>División {miDivision}</strong>
              </div>
            )}

            <Button
              onClick={handleBuscar}
              disabled={cargando || (nivelPermiso === "lectura_division" && (cargandoDivision || sinDivisionAsignada))}
              className="border border-[#2183AE] bg-[#2183AE] text-white hover:bg-white hover:text-[#2183AE] flex items-center gap-2"
              size="sm"
            >
              {cargando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Filter className="h-3.5 w-3.5" />}
              Buscar
            </Button>
          </div>
        </div>

        {cargando && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 text-center">
            <Loader2 className="h-8 w-8 text-[#2183AE] animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-600">Buscando pedidos…</p>
          </div>
        )}

        {!cargando && error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</div>
        )}

        {!cargando && !error && !hasSearched && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 text-center">
            <Filter className="h-8 w-8 text-[#2183AE] mx-auto mb-3" />
            <p className="text-sm text-gray-600">Selecciona una fecha y presiona "Buscar" para ver los pedidos.</p>
          </div>
        )}

        {!cargando && !error && hasSearched && sinDivisionAsignada && (
          <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            No tienes una división asignada — contacta a un administrador.
          </div>
        )}

        {!cargando && !error && hasSearched && !sinDivisionAsignada && rutas.length === 0 && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 text-center">
            <Package className="h-8 w-8 text-gray-400 mx-auto mb-3" />
            <p className="text-sm text-gray-600">No hay pedidos para esa fecha y división.</p>
          </div>
        )}

        {!cargando && !error && hasSearched && !sinDivisionAsignada && rutas.length > 0 && (
          <div className="space-y-3">
            {rutas.map((ruta) => {
              const abierta = rutasAbiertas.has(ruta.ruta_id);
              return (
                <div key={ruta.ruta_id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleRuta(ruta.ruta_id)}
                    className="w-full flex items-center justify-between gap-2 p-3 bg-gray-50 hover:bg-gray-100 text-left sticky top-0 z-10"
                  >
                    <span className="flex items-center gap-2 text-sm font-bold text-gray-700 min-w-0">
                      <Truck className="h-4 w-4 text-[#2183AE] shrink-0" />
                      <span className="truncate">{ruta.nombre_ruta}</span>
                    </span>
                    <span className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-gray-500 bg-white border border-gray-200 rounded-full px-2 py-0.5">
                        {ruta.tiendas.length} tienda{ruta.tiendas.length !== 1 ? "s" : ""}
                      </span>
                      <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${abierta ? "rotate-180" : ""}`} />
                    </span>
                  </button>

                  {abierta && (
                    <div className="divide-y divide-gray-100">
                      {ruta.tiendas.map((tienda) => {
                        const key = `${ruta.ruta_id}::${tienda.codigo_tienda}`;
                        const tiendaAbierta = tiendasAbiertas.has(key);
                        return (
                          <div key={key}>
                            <button
                              type="button"
                              onClick={() => toggleTienda(key)}
                              className="w-full flex items-center justify-between gap-2 px-4 py-2.5 hover:bg-gray-50 text-left"
                            >
                              <span className="flex items-center gap-2 text-sm text-gray-800 min-w-0">
                                <Store className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                                <span className="truncate">{tienda.nombre_tienda}</span>
                              </span>
                              <ChevronDown
                                className={`h-3.5 w-3.5 text-gray-400 transition-transform shrink-0 ${tiendaAbierta ? "rotate-180" : ""}`}
                              />
                            </button>

                            {tiendaAbierta && (
                              <div className="px-4 pb-3 space-y-3">
                                {tienda.pedidos.map((pedido, i) => (
                                  <div key={i} className="border border-gray-100 rounded-lg p-3 bg-gray-50/50">
                                    <div className="flex items-center justify-between gap-2 mb-2">
                                      <span className="text-xs font-semibold text-gray-700">
                                        {pedido.label} · {pedido.numero_pedido}
                                      </span>
                                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-600">
                                        {pedido.estado}
                                      </span>
                                    </div>
                                    <div className="space-y-1">
                                      {pedido.items.map((item) => (
                                        <div key={item.id} className="flex items-center justify-between text-xs text-gray-600">
                                          <span className="truncate pr-2">{item.descripcion_producto}</span>
                                          <span className="shrink-0 font-medium text-gray-800">
                                            {item.cantidad_solicitada} {item.unidad_medida}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
