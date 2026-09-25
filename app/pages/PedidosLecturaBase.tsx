"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Loader2, AlertCircle, Store, Truck, Package, Filter, QrCode, FileText, X as XIcon } from "lucide-react";
import { format, addDays } from "date-fns";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  getPedidosPorDivision,
  previsualizarQrsRutaPollo,
  previsualizarQrsRutaInsumos,
  previsualizarReporteDetallePollo,
  previsualizarReporteDetalleInsumos,
  previsualizarReporteEnTransitoPollo,
  previsualizarReporteEnTransitoInsumos,
  descargarExcelReporteDetallePollo,
  descargarExcelReporteDetalleInsumos,
  descargarExcelReporteEnTransitoPollo,
  descargarExcelReporteEnTransitoInsumos,
  DivisionReporte,
  FormatoReporte,
} from "../api/PedidoPosApi";
import { ReporteParametrosModal, FormatoReporteModal, ParametrosReporte } from "./ReporteParametrosModal";
import { getMiDivision } from "../api/UserApi";
import { PedidoPosItem, PedidoPosRuta, PedidoPosRutaInsumos } from "../types/PedidoPosModel";

const ESTADOS_CON_QR = ["EN_TRANSITO", "ENTREGADO", "ENTREGADO_PARCIAL", "MIXTO"];

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
  estado_general: string;
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
      estado_general: r.estado_general,
      tiendas: Array.from(tiendasPorCodigo.values()),
    };
  });
}

function normalizarInsumos(rutas: PedidoPosRutaInsumos[]): RutaNormalizada[] {
  return rutas.map((r, idx) => ({
    ruta_id: r.ruta_id || `${r.nombre_ruta}-${idx}`,
    nombre_ruta: r.nombre_ruta,
    estado_general: r.estado_general,
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

interface QrPreviewModalProps {
  url: string;
  onClose: () => void;
  titulo: string;
}

function QrPreviewModal({ url, onClose, titulo }: QrPreviewModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <h3 className="text-base font-semibold text-gray-900">{titulo}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400">
            <XIcon size={18} />
          </button>
        </div>
        <div className="flex-1 min-h-0 bg-gray-100">
          <iframe src={url} title="Vista previa de códigos QR" className="w-full h-full border-0" style={{ minHeight: "70vh" }} />
        </div>
        <div className="px-6 py-3 border-t border-gray-100 flex justify-end shrink-0">
          <Button onClick={onClose} variant="cancel" size="sm">Cerrar</Button>
        </div>
      </div>
    </div>
  );
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
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [cargandoQrRutaId, setCargandoQrRutaId] = useState<string | null>(null);
  const [errorQr, setErrorQr] = useState<string | null>(null);
  const [showReporteModal, setShowReporteModal] = useState(false);
  const [reporteUrl, setReporteUrl] = useState<string | null>(null);
  const [reporteTitulo, setReporteTitulo] = useState("Detalle de Pedidos por Tienda");
  const [cargandoReporte, setCargandoReporte] = useState(false);
  const [errorReporte, setErrorReporte] = useState<string | null>(null);
  const [showParametrosReporte, setShowParametrosReporte] = useState(false);
  const [showFormatoDetalle, setShowFormatoDetalle] = useState(false);
  const [showFormatoEnTransito, setShowFormatoEnTransito] = useState(false);
  const [cargandoEnTransito, setCargandoEnTransito] = useState(false);
  const [errorEnTransito, setErrorEnTransito] = useState<string | null>(null);

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

  // Disponible en cualquier nivel de permiso (lectura, lectura_division o
  // escritura): generar el QR es una acción de solo lectura, no requiere
  // permiso de escritura. Solo tiene sentido cuando la ruta ya está
  // EN_TRANSITO (el piloto ya la lleva).
  const handlePrevisualizarQr = async (ruta: RutaNormalizada) => {
    setCargandoQrRutaId(ruta.ruta_id);
    setErrorQr(null);

    try {
      const url =
        tipoPedido === "POLLO"
          ? await previsualizarQrsRutaPollo(ruta.ruta_id, fecha)
          : await previsualizarQrsRutaInsumos(ruta.ruta_id, fecha);
      setQrUrl(url);
      setShowQrModal(true);
    } catch (err) {
      setErrorQr(err instanceof Error ? err.message : "Error al generar los códigos QR");
    } finally {
      setCargandoQrRutaId(null);
    }
  };

  const handleCerrarQrModal = () => {
    if (qrUrl) window.URL.revokeObjectURL(qrUrl);
    setQrUrl(null);
    setShowQrModal(false);
  };

  // Reporte de las rutas de la fecha (resumen general + detalle), sin importar
  // el estado. Un usuario lectura_division siempre usa SU división (el modal
  // ni siquiera se la pregunta); con lectura elige en el modal.
  const handleGenerarReporte = async (parametros: ParametrosReporte) => {
    const division: DivisionReporte | undefined =
      nivelPermiso === "lectura_division" ? (miDivision as "1" | "2" | null) ?? undefined : parametros.division;

    if (nivelPermiso === "lectura_division" && !division) return;

    setCargandoReporte(true);
    setErrorReporte(null);

    try {
      if (parametros.formato === "excel") {
        if (tipoPedido === "POLLO") {
          await descargarExcelReporteDetallePollo(fecha, { division, muelles: parametros.muelles });
        } else {
          await descargarExcelReporteDetalleInsumos(fecha, { division });
        }
      } else {
        const url =
          tipoPedido === "POLLO"
            ? await previsualizarReporteDetallePollo(fecha, { division, muelles: parametros.muelles })
            : await previsualizarReporteDetalleInsumos(fecha, { division });
        setReporteTitulo("Detalle de Pedidos por Tienda");
        setReporteUrl(url);
        setShowReporteModal(true);
      }

      setShowParametrosReporte(false);
      setShowFormatoDetalle(false);
    } catch (err) {
      setErrorReporte(err instanceof Error ? err.message : "Error al generar el reporte");
    } finally {
      setCargandoReporte(false);
    }
  };

  // Con lectura_division en Insumos no hay muelles ni división que elegir,
  // así que solo se pregunta el formato (PDF o Excel).
  const requiereParametros = tipoPedido === "POLLO" || nivelPermiso === "lectura";

  const handleAbrirReporte = () => {
    setErrorReporte(null);

    if (requiereParametros) {
      setShowParametrosReporte(true);
    } else {
      setShowFormatoDetalle(true);
    }
  };

  // Pedidos EN_TRANSITO sin entregar, de cualquier fecha. lectura_division
  // solo ve su división; lectura ve las dos (cada una en su sección).
  const handleGenerarReporteEnTransito = async (formato: FormatoReporte) => {
    const division = nivelPermiso === "lectura_division" ? ((miDivision as "1" | "2" | null) ?? undefined) : undefined;

    if (nivelPermiso === "lectura_division" && !division) return;

    setCargandoEnTransito(true);
    setErrorEnTransito(null);

    try {
      if (formato === "excel") {
        if (tipoPedido === "POLLO") {
          await descargarExcelReporteEnTransitoPollo(division);
        } else {
          await descargarExcelReporteEnTransitoInsumos(division);
        }
      } else {
        const url =
          tipoPedido === "POLLO"
            ? await previsualizarReporteEnTransitoPollo(division)
            : await previsualizarReporteEnTransitoInsumos(division);
        setReporteTitulo(`Pedidos en Tránsito — ${tipoPedido === "POLLO" ? "Pollo" : "Insumos"}`);
        setReporteUrl(url);
        setShowReporteModal(true);
      }

      setShowFormatoEnTransito(false);
    } catch (err) {
      setErrorEnTransito(err instanceof Error ? err.message : "Error al generar el reporte");
    } finally {
      setCargandoEnTransito(false);
    }
  };

  const handleCerrarReporteModal = () => {
    if (reporteUrl) window.URL.revokeObjectURL(reporteUrl);
    setReporteUrl(null);
    setShowReporteModal(false);
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

            <Button
              onClick={handleAbrirReporte}
              disabled={cargandoReporte || !fecha || (nivelPermiso === "lectura_division" && (cargandoDivision || sinDivisionAsignada))}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              {cargandoReporte ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
              Generar Reporte
            </Button>

            <Button
              onClick={() => { setErrorEnTransito(null); setShowFormatoEnTransito(true); }}
              disabled={nivelPermiso === "lectura_division" && (cargandoDivision || sinDivisionAsignada)}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Truck className="h-3.5 w-3.5" />
              Pedidos en tránsito
            </Button>
          </div>

          {errorQr && (
            <p className="text-xs text-red-600 mt-2 flex items-center gap-1"><AlertCircle className="h-3.5 w-3.5" /> {errorQr}</p>
          )}
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
                  <div className="w-full flex items-center justify-between gap-2 p-3 bg-gray-50 hover:bg-gray-100 sticky top-0 z-10">
                    <button
                      type="button"
                      onClick={() => toggleRuta(ruta.ruta_id)}
                      className="flex items-center gap-2 text-sm font-bold text-gray-700 min-w-0 flex-1 text-left"
                    >
                      <Truck className="h-4 w-4 text-[#2183AE] shrink-0" />
                      <span className="truncate">{ruta.nombre_ruta}</span>
                    </button>
                    <span className="flex items-center gap-2 shrink-0">
                      {ESTADOS_CON_QR.includes(ruta.estado_general) && (
                        <Button
                          onClick={() => handlePrevisualizarQr(ruta)}
                          disabled={cargandoQrRutaId === ruta.ruta_id}
                          size="sm"
                          variant="outline"
                        >
                          {cargandoQrRutaId === ruta.ruta_id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                          ) : (
                            <QrCode className="h-3.5 w-3.5 mr-1.5" />
                          )}
                          Generar QRs
                        </Button>
                      )}
                      <button type="button" onClick={() => toggleRuta(ruta.ruta_id)} className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-500 bg-white border border-gray-200 rounded-full px-2 py-0.5">
                          {ruta.tiendas.length} tienda{ruta.tiendas.length !== 1 ? "s" : ""}
                        </span>
                        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${abierta ? "rotate-180" : ""}`} />
                      </button>
                    </span>
                  </div>

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

      {showQrModal && qrUrl && <QrPreviewModal url={qrUrl} onClose={handleCerrarQrModal} titulo="Códigos QR de pedidos" />}
      {showParametrosReporte && (
        <ReporteParametrosModal
          tipoPedido={tipoPedido}
          fecha={fecha}
          mostrarDivision={nivelPermiso === "lectura"}
          cargando={cargandoReporte}
          error={errorReporte}
          onGenerar={handleGenerarReporte}
          onClose={() => setShowParametrosReporte(false)}
        />
      )}
      {showFormatoDetalle && (
        <FormatoReporteModal
          titulo="Generar reporte"
          cargando={cargandoReporte}
          error={errorReporte}
          onElegir={(formato) => handleGenerarReporte({ muelles: [], formato })}
          onClose={() => setShowFormatoDetalle(false)}
        />
      )}
      {showFormatoEnTransito && (
        <FormatoReporteModal
          titulo={`Pedidos en tránsito — ${tipoPedido === "POLLO" ? "Pollo" : "Insumos"}`}
          cargando={cargandoEnTransito}
          error={errorEnTransito}
          onElegir={handleGenerarReporteEnTransito}
          onClose={() => setShowFormatoEnTransito(false)}
        />
      )}
      {showReporteModal && reporteUrl && (
        <QrPreviewModal url={reporteUrl} onClose={handleCerrarReporteModal} titulo={reporteTitulo} />
      )}
    </div>
  );
}
