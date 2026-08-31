"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Truck, Snowflake, Warehouse, PackageCheck, Store, AlertCircle, CheckCircle2, Eye, User, Loader2, ChevronDown, ChevronUp, HelpCircle, MapPinOff } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible";
import {
  getRutasActivas,
  getInventarioCamion,
  getDetalleTiendas,
  getBodegasCuartoFrio,
  trasladarACuartoFrio,
  getTrasladosCuartoFrio,
  entregarProducto,
} from "../api/CamionRutaApi";
import {
  BodegaCuartoFrio,
  CamionEnRuta,
  EstadoTiendaRuta,
  MovimientoInventarioLog,
  RutaActivaBackend,
  TipoRuta,
  TrasladoCuartoFrio,
} from "../types/CamionRutaModel";

// Arma un CamionEnRuta 100% a partir del backend — sin datos de ejemplo.
// Inventario y tiendas arrancan vacíos porque se consultan bajo demanda al
// abrir el detalle (ver abrirCamion); GPS puede venir null si el piloto
// todavía no reporta ninguna posición.
function construirCamionDesdeBackend(real: RutaActivaBackend, tipoRuta: TipoRuta): CamionEnRuta {
  return {
    id: real.ruta_id,
    tipo_ruta: tipoRuta,
    nombre_ruta: real.nombre_ruta,
    whs_code_ruta: real.whs_code_destino,
    camion_placa: real.camion_placa || "—",
    piloto: {
      id_piloto: real.piloto_id,
      nombre_piloto: real.piloto_nombre || "—",
      lat: real.piloto_lat,
      lng: real.piloto_lng,
      fecha_ubicacion: real.piloto_fecha_ubicacion,
    },
    inventario: [],
    tiendas: [],
    movimientos: [],
  };
}

// El mapa se carga sin SSR porque la API de Google Maps necesita `window`,
// que no existe durante el renderizado en el servidor de Next.js.
const CamionesEnRutaMap = dynamic(() => import("./CamionesEnRutaMap"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center text-sm text-gray-400">
      Cargando mapa…
    </div>
  ),
});

type Accion = "traslado" | "entrega" | null;

// TEMPORAL: fecha fija para pruebas mientras se valida la conexión al
// backend. Quitar este valor (y volver a llamar getRutasActivas sin fecha,
// para que use el día de hoy) antes de pasar a producción.
const FECHA_PRUEBA = "2026-08-09";

// Insumos no tiene cuartos fríos: el traslado siempre va a la bodega
// central fija "01" (sin dropdown ni consulta a SAP para elegirla). Pollo
// sí elige entre bodegas "CFR-..." vía el dropdown normal.
const WHS_BODEGA_CENTRAL_INSUMOS = "01";

// Mismo estado que logistica.tbl_pedidos_pos_cabecera.estado en Core — solo
// se traduce a una etiqueta/color, no se colapsa ni se reinterpreta.
function formatearEstadoTienda(estado: EstadoTiendaRuta | string) {
  switch (estado) {
    case "RECIBIDO":
      return { label: "Recibido", className: "text-green-600" };
    case "RECIBIDO_PARCIAL":
      return { label: "Recibido Parcial", className: "text-amber-600" };
    case "EN_TRANSITO":
      return { label: "En Tránsito", className: "text-[#2183AE]" };
    default:
      return { label: estado, className: "text-gray-500" };
  }
}

function formatearHaceTiempo(fechaIso: string): string {
  const minutos = Math.max(0, Math.round((Date.now() - new Date(fechaIso).getTime()) / 60000));
  if (minutos < 1) return "hace un momento";
  if (minutos === 1) return "hace 1 minuto";
  if (minutos < 60) return `hace ${minutos} minutos`;
  const horas = Math.round(minutos / 60);
  return horas === 1 ? "hace 1 hora" : `hace ${horas} horas`;
}

interface CamionesEnRutaBaseProps {
  tipoRuta: TipoRuta;
  titulo: string;
  subtitulo: string;
}

// Componente base compartido: un usuario solo puede ver rutas de Pollo o de
// Insumos, nunca ambas a la vez, por eso hay dos vistas delgadas
// (CamionesEnRutaPolloView / CamionesEnRutaInsumoView) que reutilizan esta
// implementación filtrando por tipoRuta.
//
// "Trasladar a Cuarto Frío" y "Entregar Producto" ocurren cuando el camión
// ya volvió a la bodega: ambos operan sobre el TOTAL de inventario del
// camión (el WhsCode de la ruta), no sobre lo pendiente de una tienda en
// particular. El detalle por tienda (pedido vs. entregado) es solo
// informativo y no se modifica desde estos dos botones.
export function CamionesEnRutaBase({ tipoRuta, titulo, subtitulo }: CamionesEnRutaBaseProps) {
  const [rutas, setRutas] = useState<CamionEnRuta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [accion, setAccion] = useState<Accion>(null);
  const [cantidades, setCantidades] = useState<Record<string, string>>({});
  const [errorAccion, setErrorAccion] = useState<string | null>(null);
  const [cargandoInventario, setCargandoInventario] = useState(false);
  const [errorInventario, setErrorInventario] = useState<string | null>(null);
  const [cargandoTiendas, setCargandoTiendas] = useState(false);
  const [errorTiendas, setErrorTiendas] = useState<string | null>(null);
  const [inventarioExpandido, setInventarioExpandido] = useState(false);
  const [tiendasExpandidas, setTiendasExpandidas] = useState<Record<string, boolean>>({});
  const [sinPosicionRuta, setSinPosicionRuta] = useState<CamionEnRuta | null>(null);
  const [bodegasCuartoFrio, setBodegasCuartoFrio] = useState<BodegaCuartoFrio[]>([]);
  const [cargandoBodegas, setCargandoBodegas] = useState(false);
  const [errorBodegas, setErrorBodegas] = useState<string | null>(null);
  const [bodegaSeleccionada, setBodegaSeleccionada] = useState("");
  const [confirmandoAccion, setConfirmandoAccion] = useState(false);
  const [resultadoAccion, setResultadoAccion] = useState<{
    docnum: number | null;
    docentry: number | null;
    warning?: string;
  } | null>(null);
  const [historialExpandido, setHistorialExpandido] = useState(false);
  const [historial, setHistorial] = useState<TrasladoCuartoFrio[]>([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [errorHistorial, setErrorHistorial] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    setCargando(true);
    setErrorCarga(null);

    // El inventario NO se trae aquí: es una consulta pesada a SAP (hasta
    // 5000 artículos por WhsCode), así que se pide bajo demanda, una sola
    // ruta a la vez, cuando se abre su detalle (ver abrirCamion).
    getRutasActivas(tipoRuta, FECHA_PRUEBA)
      .then((rutasReales) => {
        if (cancelado) return;

        setRutas(rutasReales.map((r) => construirCamionDesdeBackend(r, tipoRuta)));
      })
      .catch((err) => {
        if (!cancelado) {
          setErrorCarga(err instanceof Error ? err.message : "Error al obtener las rutas activas");
        }
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });

    return () => {
      cancelado = true;
    };
  }, [tipoRuta]);

  const camion = useMemo(
    () => rutas.find((r) => r.id === selectedId) ?? null,
    [rutas, selectedId]
  );

  const totalTiendasPendientes = rutas.reduce(
    (acc, r) => acc + r.tiendas.filter((t) => t.estado !== "RECIBIDO").length,
    0
  );
  const totalConInventario = rutas.filter((r) => r.inventario.some((p) => p.cantidad > 0)).length;

  const cerrarDialog = () => {
    setSelectedId(null);
    setAccion(null);
    setCantidades({});
    setErrorAccion(null);
    setErrorInventario(null);
    setErrorTiendas(null);
    setBodegasCuartoFrio([]);
    setBodegaSeleccionada("");
    setErrorBodegas(null);
    setResultadoAccion(null);
  };

  // Al abrir el detalle de una ruta se consulta el inventario real de SAP
  // y el detalle por tienda de Core — ninguno de los dos se trae de
  // antemano al entrar a la vista, solo cuando se abre esa ruta puntual.
  const abrirCamion = (id: string) => {
    setSelectedId(id);
    setAccion(null);
    setCantidades({});
    setErrorAccion(null);
    setErrorInventario(null);
    setErrorTiendas(null);
    // Todo arranca comprimido cada vez que se abre un camión.
    setInventarioExpandido(false);
    setTiendasExpandidas({});

    const ruta = rutas.find((r) => r.id === id);
    if (!ruta) return;

    setCargandoInventario(true);

    getInventarioCamion(tipoRuta, ruta.id, ruta.whs_code_ruta, FECHA_PRUEBA)
      .then((inventario) => {
        setRutas((prev) => prev.map((r) => (r.id === id ? { ...r, inventario } : r)));
      })
      .catch((err) => {
        setErrorInventario(
          err instanceof Error
            ? `No se pudo consultar el inventario en SAP: ${err.message}`
            : "No se pudo consultar el inventario en SAP."
        );
      })
      .finally(() => {
        setCargandoInventario(false);
      });

    setCargandoTiendas(true);

    getDetalleTiendas(tipoRuta, ruta.id, FECHA_PRUEBA)
      .then((tiendas) => {
        setRutas((prev) => prev.map((r) => (r.id === id ? { ...r, tiendas } : r)));
      })
      .catch((err) => {
        setErrorTiendas(
          err instanceof Error
            ? `No se pudo consultar el detalle por tienda: ${err.message}`
            : "No se pudo consultar el detalle por tienda."
        );
      })
      .finally(() => {
        setCargandoTiendas(false);
      });
  };

  const mostrarSinPosicion = (ruta: CamionEnRuta) => {
    setSinPosicionRuta(ruta);
  };

  const toggleTienda = (codigoTienda: string) => {
    setTiendasExpandidas((prev) => ({ ...prev, [codigoTienda]: !prev[codigoTienda] }));
  };

  // El historial se consulta a SAP/Core solo cuando se expande la sección,
  // y se refresca cada vez que se abre (por si se hizo un traslado nuevo).
  const toggleHistorial = (abierto: boolean) => {
    setHistorialExpandido(abierto);
    if (!abierto) return;

    setCargandoHistorial(true);
    setErrorHistorial(null);

    // Sin fecha: se quiere ver TODO el historial, no solo el día de prueba.
    getTrasladosCuartoFrio(tipoRuta)
      .then(setHistorial)
      .catch((err) => {
        setErrorHistorial(err instanceof Error ? err.message : "No se pudo obtener el historial de traslados.");
      })
      .finally(() => {
        setCargandoHistorial(false);
      });
  };

  // Resalta el camión en el mapa (vuela hacia él + una animación de pulso
  // breve) sin abrir el detalle. El resaltado se limpia solo, coincidiendo
  // con la duración de la animación definida en globals.css.
  const resaltarCamion = (id: string) => {
    setHighlightedId(id);
    setTimeout(() => {
      setHighlightedId((actual) => (actual === id ? null : actual));
    }, 2700);
  };

  // Ambos botones parten del mismo inventario total del camión, por eso
  // comparten la misma inicialización y la misma validación al confirmar.
  // Solo "traslado" necesita además el dropdown de bodegas de cuarto frío,
  // que se consulta a SAP recién aquí (no antes) y solo para ese botón.
  const iniciarAccion = (tipo: Exclude<Accion, null>) => {
    if (!camion) return;
    const iniciales: Record<string, string> = {};
    camion.inventario.forEach((p) => {
      if (p.cantidad > 0) iniciales[p.codigo_producto] = "";
    });
    setCantidades(iniciales);
    setErrorAccion(null);
    setAccion(tipo);
    setResultadoAccion(null);

    if (tipo === "traslado") {
      if (tipoRuta === "INSUMOS") {
        // Sin cuartos fríos en insumos: el destino siempre es la bodega
        // central "01", no hay nada que elegir ni que consultar a SAP.
        setBodegasCuartoFrio([]);
        setErrorBodegas(null);
        setCargandoBodegas(false);
        setBodegaSeleccionada(WHS_BODEGA_CENTRAL_INSUMOS);
      } else {
        setBodegaSeleccionada("");
        setErrorBodegas(null);
        setCargandoBodegas(true);

        getBodegasCuartoFrio(tipoRuta)
          .then(setBodegasCuartoFrio)
          .catch((err) => {
            setErrorBodegas(err instanceof Error ? err.message : "No se pudieron consultar las bodegas de cuarto frío.");
          })
          .finally(() => {
            setCargandoBodegas(false);
          });
      }
    }
  };

  const cancelarAccion = () => {
    setAccion(null);
    setCantidades({});
    setErrorAccion(null);
    setBodegasCuartoFrio([]);
    setBodegaSeleccionada("");
    setErrorBodegas(null);
    setResultadoAccion(null);
  };

  const confirmarAccion = () => {
    if (!camion || !accion) return;

    if (accion === "traslado" && !bodegaSeleccionada) {
      setErrorAccion("Selecciona la bodega de cuarto frío destino.");
      return;
    }

    const lineas: { codigo_producto: string; nombre_producto: string; unidad_medida: string; cantidad: number }[] = [];
    const verbo = accion === "traslado" ? "trasladar" : "entregar";

    for (const [codigo, valor] of Object.entries(cantidades)) {
      const cantidad = Number(valor);
      if (!valor || isNaN(cantidad) || cantidad <= 0) continue;

      const item = camion.inventario.find((p) => p.codigo_producto === codigo);
      if (!item) continue;

      if (cantidad > item.cantidad) {
        setErrorAccion(`No puedes ${verbo} más de lo disponible de "${item.nombre_producto}" (${item.cantidad} ${item.unidad_medida}).`);
        return;
      }

      lineas.push({ codigo_producto: codigo, nombre_producto: item.nombre_producto, unidad_medida: item.unidad_medida, cantidad });
    }

    if (lineas.length === 0) {
      setErrorAccion("Indica una cantidad mayor a 0 para al menos un producto.");
      return;
    }

    // Solo actualiza el inventario/movimientos en pantalla — no cierra el
    // formulario, porque para "traslado" primero se muestra la confirmación
    // con el número de documento SAP (ver resultadoAccion).
    const aplicarInventarioLocal = () => {
      const movimiento: MovimientoInventarioLog = {
        id: `mov-${Date.now()}`,
        tipo: accion === "traslado" ? "TRASLADO_CUARTO_FRIO" : "ENTREGA_TIENDA",
        fecha: new Date().toISOString(),
        lineas,
      };

      setRutas((prev) =>
        prev.map((r) => {
          if (r.id !== camion.id) return r;

          return {
            ...r,
            inventario: r.inventario.map((p) => {
              const linea = lineas.find((l) => l.codigo_producto === p.codigo_producto);
              return linea ? { ...p, cantidad: p.cantidad - linea.cantidad } : p;
            }),
            movimientos: [movimiento, ...r.movimientos],
          };
        })
      );
    };

    if (accion === "traslado") {
      setConfirmandoAccion(true);
      setErrorAccion(null);

      trasladarACuartoFrio({
        tipo: tipoRuta,
        ruta_id: camion.id,
        nombre_ruta: camion.nombre_ruta,
        fecha: FECHA_PRUEBA,
        whs_origen: camion.whs_code_ruta,
        whs_destino: bodegaSeleccionada,
        camion_placa: camion.camion_placa,
        piloto_id: camion.piloto.id_piloto,
        piloto_nombre: camion.piloto.nombre_piloto,
        lineas,
      })
        .then((resultado) => {
          aplicarInventarioLocal();
          setResultadoAccion({
            docnum: resultado.sap_docnum ?? null,
            docentry: resultado.sap_docentry ?? null,
            warning: resultado.warning,
          });
        })
        .catch((err) => {
          setErrorAccion(err instanceof Error ? err.message : "Error al trasladar a cuarto frío.");
        })
        .finally(() => {
          setConfirmandoAccion(false);
        });

      return;
    }

    // "Entregar Producto": primero crea la entrega (Deliveries) en SAP con
    // el piloto como cliente; solo si eso sale bien se manda el correo — el
    // backend ya se encarga de ese orden, acá solo se llama una vez.
    setConfirmandoAccion(true);
    setErrorAccion(null);

    entregarProducto({
      tipo: tipoRuta,
      ruta_id: camion.id,
      nombre_ruta: camion.nombre_ruta,
      whs_code_ruta: camion.whs_code_ruta,
      camion_placa: camion.camion_placa,
      piloto_id: camion.piloto.id_piloto,
      piloto_nombre: camion.piloto.nombre_piloto,
      fecha: FECHA_PRUEBA,
      lineas,
    })
      .then((resultado) => {
        aplicarInventarioLocal();
        setResultadoAccion({
          docnum: resultado.sap_docnum ?? null,
          docentry: resultado.sap_docentry ?? null,
          warning: resultado.warning,
        });
      })
      .catch((err) => {
        setErrorAccion(err instanceof Error ? err.message : "Error al entregar el producto.");
      })
      .finally(() => {
        setConfirmandoAccion(false);
      });
  };

  const cerrarResultadoAccion = () => {
    setResultadoAccion(null);
    cancelarAccion();
  };

  const tieneInventarioDisponible = !!camion && camion.inventario.some((p) => p.cantidad > 0);

  return (
    <div className="py-4 sm:py-6 lg:py-2 px-2 sm:px-4">
      <div className="mb-6 bg-gradient-to-r from-[#2183AE] to-[#1a6a8f] rounded-2xl shadow-lg p-6 text-white">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm shrink-0">
            <Truck className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-white text-lg font-semibold leading-tight">{titulo}</h2>
            <p className="text-sm text-white/90 mt-0.5">{subtitulo}</p>
          </div>
        </div>
      </div>

      {cargando ? (
        <div className="flex items-center justify-center gap-2 text-sm text-gray-400 py-16">
          <Loader2 size={18} className="animate-spin" /> Cargando rutas activas…
        </div>
      ) : errorCarga ? (
        <p className="text-sm text-red-600 flex items-center gap-1.5 py-6">
          <AlertCircle size={15} /> {errorCarga}
        </p>
      ) : (
        <>
      <div className="mb-4 flex flex-wrap gap-3 text-xs text-gray-600">
        <span className="px-3 py-1.5 rounded-full bg-white border border-gray-200 shadow-sm">
          {rutas.length} ruta{rutas.length !== 1 ? "s" : ""} activa{rutas.length !== 1 ? "s" : ""} hoy
        </span>
        <span className="px-3 py-1.5 rounded-full bg-white border border-gray-200 shadow-sm">
          {totalConInventario} camión(es) con inventario a bordo
        </span>
        <span className="px-3 py-1.5 rounded-full bg-white border border-gray-200 shadow-sm">
          {totalTiendasPendientes} tienda(s) pendientes de entrega
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div
          className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-3 overflow-y-auto"
          style={{ height: 560 }}
        >
          {rutas.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-6">No hay rutas activas hoy.</p>
          ) : (
            <div className="space-y-2">
              {rutas.map((r) => (
                <div
                  key={r.id}
                  className={`p-3 rounded-lg border transition-colors ${
                    selectedId === r.id ? "border-[#2183AE] bg-[#2183AE]/5" : "border-gray-200"
                  }`}
                >
                  <p className="text-sm text-gray-800 font-medium truncate">{r.nombre_ruta}</p>
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <User size={12} className="text-gray-400 shrink-0" /> {r.piloto.nombre_piloto}
                  </p>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Truck size={12} className="text-gray-400 shrink-0" /> {r.camion_placa}
                  </p>
                  <div className="flex gap-2 mt-2">
                    {r.piloto.lat !== null && r.piloto.lng !== null ? (
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => resaltarCamion(r.id)}
                        title="Resaltar en el mapa"
                        className="shrink-0"
                      >
                        <Eye size={14} />
                      </Button>
                    ) : (
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => mostrarSinPosicion(r)}
                        title="Posición del piloto no disponible"
                        className="shrink-0 text-amber-600 border-amber-200 hover:bg-amber-50"
                      >
                        <HelpCircle size={14} />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => abrirCamion(r.id)}
                      className="flex-1 justify-center"
                    >
                      Ver Detalle
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/*
          isolate + relative + z-0 confinan los z-index internos del mapa
          (controles de Google Maps) dentro de este contenedor, para que no
          queden por encima del modal (Dialog usa z-50).
        */}
        <div
          className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden isolate relative z-0"
          style={{ height: 560 }}
        >
          <CamionesEnRutaMap camiones={rutas} onSelectCamion={abrirCamion} highlightedId={highlightedId} />
        </div>
      </div>

      <p className="mt-3 text-xs text-gray-400">
        El inventario y las tiendas se consultan solo al abrir el detalle de cada camión (no al entrar a la vista).
      </p>

      <div className="mt-4">
        <Collapsible
          open={historialExpandido}
          onOpenChange={toggleHistorial}
          className="rounded-xl border border-gray-200 bg-white overflow-hidden"
        >
          <CollapsibleTrigger className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
            <span className="text-sm font-medium text-gray-800 flex items-center gap-1.5">
              {tipoRuta === "INSUMOS" ? (
                <><Warehouse size={15} className="text-gray-400" /> Historial de traslados a bodega central</>
              ) : (
                <><Snowflake size={15} className="text-gray-400" /> Historial de traslados a cuarto frío</>
              )}
            </span>
            {historialExpandido ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="p-4 border-t border-gray-100">
              {errorHistorial && (
                <p className="text-xs text-red-600 mb-2 flex items-center gap-1.5">
                  <AlertCircle size={13} className="shrink-0" /> {errorHistorial}
                </p>
              )}
              {cargandoHistorial ? (
                <div className="flex items-center justify-center gap-2 text-xs text-gray-400 py-6">
                  <Loader2 size={14} className="animate-spin" /> Consultando historial…
                </div>
              ) : historial.length === 0 ? (
                <p className="text-xs text-gray-400 py-2">Todavía no hay traslados registrados.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 text-gray-500">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium">Fecha</th>
                        <th className="text-left px-3 py-2 font-medium">Ruta</th>
                        <th className="text-left px-3 py-2 font-medium">Camión / Piloto</th>
                        <th className="text-left px-3 py-2 font-medium">Origen → Destino</th>
                        <th className="text-left px-3 py-2 font-medium">Productos</th>
                        <th className="text-left px-3 py-2 font-medium">Usuario</th>
                        <th className="text-right px-3 py-2 font-medium">Doc. SAP</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {historial.map((t) => (
                        <tr key={t.id}>
                          <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{t.fecha}</td>
                          <td className="px-3 py-2 text-gray-700">{t.nombre_ruta || "—"}</td>
                          <td className="px-3 py-2 text-gray-700 whitespace-nowrap">
                            {t.camion_placa || "—"} / {t.piloto_nombre || "—"}
                          </td>
                          <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{t.whs_origen} → {t.whs_destino}</td>
                          <td className="px-3 py-2 text-gray-500">
                            {t.lineas.map((l) => `${l.nombre_producto} (${l.cantidad} ${l.unidad_medida})`).join(", ")}
                          </td>
                          <td className="px-3 py-2 text-gray-500">{t.usuario_registro || "—"}</td>
                          <td className="px-3 py-2 text-right text-gray-500">{t.sap_docnum ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
      </>
      )}

      <Dialog open={!!sinPosicionRuta} onOpenChange={(open) => !open && setSinPosicionRuta(null)}>
        <DialogContent className="sm:max-w-sm bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPinOff size={18} className="text-amber-600" /> Posición no disponible
            </DialogTitle>
            <DialogDescription>
              No se encuentra la posición del piloto {sinPosicionRuta?.piloto.nombre_piloto} para la ruta{" "}
              {sinPosicionRuta?.nombre_ruta}. Es posible que todavía no haya reportado su ubicación.
            </DialogDescription>
          </DialogHeader>
          <Button variant="outline" onClick={() => setSinPosicionRuta(null)}>Entendido</Button>
        </DialogContent>
      </Dialog>

      <Dialog open={!!camion} onOpenChange={(open) => !open && cerrarDialog()}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto bg-white">
          {camion && (
            <>
              <DialogHeader>
                <DialogTitle>{camion.nombre_ruta}</DialogTitle>
                <DialogDescription>
                  {camion.tipo_ruta} · Camión {camion.camion_placa} · Piloto {camion.piloto.nombre_piloto}
                </DialogDescription>
              </DialogHeader>

              <div className="text-xs text-gray-500 -mt-2">
                WhsCode ruta: <span className="font-medium text-gray-700">{camion.whs_code_ruta}</span>
                {" · "}
                {camion.piloto.lat !== null && camion.piloto.lng !== null && camion.piloto.fecha_ubicacion ? (
                  <>
                    Última ubicación: {formatearHaceTiempo(camion.piloto.fecha_ubicacion)}{" "}
                    ({camion.piloto.lat.toFixed(4)}, {camion.piloto.lng.toFixed(4)})
                  </>
                ) : (
                  <span className="text-amber-600">Sin posición reportada por el piloto</span>
                )}
              </div>

              {accion === null && (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="bg-gray-50 rounded-lg px-2 py-2 text-center">
                      <p className="text-base font-semibold text-gray-800">{camion.inventario.length}</p>
                      <p className="text-[10px] text-gray-500 leading-tight">Producto(s) en camión</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg px-2 py-2 text-center">
                      <p className="text-base font-semibold text-green-600">
                        {camion.tiendas.filter((t) => t.estado === "RECIBIDO").length}
                      </p>
                      <p className="text-[10px] text-gray-500 leading-tight">Recibidas</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg px-2 py-2 text-center">
                      <p className="text-base font-semibold text-amber-600">
                        {camion.tiendas.filter((t) => t.estado === "RECIBIDO_PARCIAL").length}
                      </p>
                      <p className="text-[10px] text-gray-500 leading-tight">Recibidas parcial</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg px-2 py-2 text-center">
                      <p className="text-base font-semibold text-[#2183AE]">
                        {camion.tiendas.filter((t) => t.estado === "EN_TRANSITO").length}
                      </p>
                      <p className="text-[10px] text-gray-500 leading-tight">En tránsito</p>
                    </div>
                  </div>

                  <Collapsible open={inventarioExpandido} onOpenChange={setInventarioExpandido} className="rounded-lg border border-gray-100 overflow-hidden">
                    <CollapsibleTrigger className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors">
                      <span className="text-sm font-medium text-gray-800 flex items-center gap-1.5">
                        <PackageCheck size={15} className="text-gray-400" /> Inventario en camión
                        {!cargandoInventario && (
                          <span className="text-xs text-gray-400 font-normal">({camion.inventario.length})</span>
                        )}
                      </span>
                      {inventarioExpandido ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="p-3 border-t border-gray-100">
                        {errorInventario && (
                          <p className="text-xs text-amber-600 mb-2 flex items-center gap-1.5">
                            <AlertCircle size={13} className="shrink-0" /> {errorInventario}
                          </p>
                        )}
                        {cargandoInventario ? (
                          <div className="flex items-center justify-center gap-2 text-xs text-gray-400 py-6">
                            <Loader2 size={14} className="animate-spin" /> Consultando inventario en SAP…
                          </div>
                        ) : camion.inventario.length === 0 ? (
                          <p className="text-xs text-gray-400">Sin inventario cargado.</p>
                        ) : (
                          <div className="border border-gray-100 rounded-lg overflow-hidden">
                            <table className="w-full text-xs">
                              <thead className="bg-gray-50 text-gray-500">
                                <tr>
                                  <th className="text-left px-3 py-2 font-medium">Código</th>
                                  <th className="text-left px-3 py-2 font-medium">Producto</th>
                                  <th className="text-right px-3 py-2 font-medium">Cantidad</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-50">
                                {camion.inventario.map((p) => (
                                  <tr key={p.codigo_producto}>
                                    <td className="px-3 py-2 text-gray-500">{p.codigo_producto}</td>
                                    <td className="px-3 py-2 text-gray-700">{p.nombre_producto}</td>
                                    <td className={`px-3 py-2 text-right font-medium ${p.cantidad > 0 ? "text-gray-800" : "text-gray-300"}`}>
                                      {p.cantidad} {p.unidad_medida}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  <div>
                    <h4 className="text-sm font-medium text-gray-800 mb-2 flex items-center gap-1.5">
                      <Store size={15} className="text-gray-400" /> Tiendas de la ruta
                    </h4>
                    <p className="text-[11px] text-gray-400 mb-2">
                      Solo informativo: pedido vs. entregado por tienda (la recepción la confirma la app móvil).
                    </p>
                    {errorTiendas && (
                      <p className="text-xs text-amber-600 mb-2 flex items-center gap-1.5">
                        <AlertCircle size={13} className="shrink-0" /> {errorTiendas}
                      </p>
                    )}
                    {cargandoTiendas ? (
                      <div className="flex items-center justify-center gap-2 text-xs text-gray-400 py-6">
                        <Loader2 size={14} className="animate-spin" /> Consultando tiendas de la ruta…
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {camion.tiendas.map((t) => {
                          const expandida = !!tiendasExpandidas[t.codigo_tienda];

                          return (
                            <Collapsible
                              key={t.codigo_tienda}
                              open={expandida}
                              onOpenChange={() => toggleTienda(t.codigo_tienda)}
                              className="rounded-lg border border-gray-100 overflow-hidden"
                            >
                              <CollapsibleTrigger className="w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="min-w-0">
                                    <p className="text-sm text-gray-800 truncate">{t.nombre_tienda}</p>
                                    <p className="text-[11px] text-gray-400">{t.codigo_tienda}</p>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    {(() => {
                                      const { label, className } = formatearEstadoTienda(t.estado);
                                      return (
                                        <span className={`flex items-center gap-1 text-[11px] font-medium ${className}`}>
                                          {t.estado === "RECIBIDO" && <CheckCircle2 size={13} />}
                                          {label}
                                        </span>
                                      );
                                    })()}
                                    {expandida ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                                  </div>
                                </div>
                              </CollapsibleTrigger>
                              <CollapsibleContent>
                                <div className="px-3 pb-2 pt-1.5 border-t border-gray-100 space-y-0.5">
                                  {t.productos.map((p) => {
                                    const sinRecepcion = p.cantidad_recibida === null;
                                    const diferencia = sinRecepcion ? 0 : p.cantidad_solicitada - p.cantidad_recibida!;

                                    return (
                                      <div key={p.codigo_producto} className="flex items-center justify-between gap-2 text-[11px] text-gray-500">
                                        <span className="truncate">{p.nombre_producto}</span>
                                        <span className="shrink-0">
                                          Pedido: {p.cantidad_solicitada} {p.unidad_medida} · Entregado:{" "}
                                          {sinRecepcion ? "sin registrar" : `${p.cantidad_recibida} ${p.unidad_medida}`}
                                          {!sinRecepcion && diferencia !== 0 && (
                                            <span className="text-amber-600 font-medium"> · Diferencia: {diferencia} {p.unidad_medida}</span>
                                          )}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </CollapsibleContent>
                            </Collapsible>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {!cargandoInventario && (
                    <div className="pt-2 border-t border-gray-100">
                      {!tieneInventarioDisponible ? (
                        <p className="text-xs text-gray-400 flex items-center gap-1.5">
                          <AlertCircle size={13} /> El camión no tiene inventario disponible en SAP para trasladar o entregar.
                        </p>
                      ) : (
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Button variant="submit" onClick={() => iniciarAccion("traslado")} className="justify-center">
                            {tipoRuta === "INSUMOS" ? (
                              <><Warehouse size={14} className="mr-1.5" /> Trasladar a Bodega Central</>
                            ) : (
                              <><Snowflake size={14} className="mr-1.5" /> Trasladar a Cuarto Frío</>
                            )}
                          </Button>
                          <Button variant="success" onClick={() => iniciarAccion("entrega")} className="justify-center">
                            <PackageCheck size={14} className="mr-1.5" /> Entregar Producto
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {accion !== null && resultadoAccion && (
                <div className="text-center py-4">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 className="text-green-600" size={24} />
                  </div>
                  <h4 className="text-sm font-medium text-gray-800 mb-1">
                    {accion === "traslado" ? "Traslado registrado en SAP" : "Entrega registrada en SAP"}
                  </h4>
                  <p className="text-xs text-gray-500">
                    Documento SAP:{" "}
                    <span className="font-semibold text-gray-800">
                      #{resultadoAccion.docnum ?? "—"}
                    </span>
                    {resultadoAccion.docentry !== null && ` (DocEntry ${resultadoAccion.docentry})`}
                  </p>
                  {resultadoAccion.warning && (
                    <p className="text-xs text-amber-600 mt-2 flex items-center justify-center gap-1.5">
                      <AlertCircle size={13} className="shrink-0" /> {resultadoAccion.warning}
                    </p>
                  )}
                  <Button variant="submit" className="mt-4" onClick={cerrarResultadoAccion}>Cerrar</Button>
                </div>
              )}

              {accion !== null && !resultadoAccion && (
                <div>
                  <h4 className="text-sm font-medium text-gray-800 mb-1">
                    {accion === "traslado"
                      ? tipoRuta === "INSUMOS" ? "Trasladar a Bodega Central" : "Trasladar a Cuarto Frío"
                      : "Entregar Producto"}
                  </h4>
                  <p className="text-xs text-gray-400 mb-3">
                    {accion === "traslado"
                      ? tipoRuta === "INSUMOS"
                        ? `Indica cuánto de cada producto se traslada del camión (WhsCode ${camion.whs_code_ruta}) a la bodega central (WhsCode ${WHS_BODEGA_CENTRAL_INSUMOS}). No es necesario trasladar la totalidad.`
                        : `Indica cuánto de cada producto se traslada del camión (WhsCode ${camion.whs_code_ruta}) al cuarto frío. No es necesario trasladar la totalidad.`
                      : `Indica cuánto de cada producto se entrega del camión (WhsCode ${camion.whs_code_ruta}). No es necesario entregar la totalidad.`}
                  </p>

                  {accion === "traslado" && tipoRuta === "INSUMOS" && (
                    <p className="text-xs text-gray-500 mb-3">
                      Bodega destino: <span className="font-medium text-gray-700">{WHS_BODEGA_CENTRAL_INSUMOS} (Bodega Central)</span>
                    </p>
                  )}

                  {accion === "traslado" && tipoRuta === "POLLO" && (
                    <div className="mb-3">
                      <label className="text-xs font-medium text-gray-700 mb-1 block">Bodega de cuarto frío destino</label>
                      {cargandoBodegas ? (
                        <div className="flex items-center gap-2 text-xs text-gray-400 py-1.5">
                          <Loader2 size={13} className="animate-spin" /> Consultando bodegas en SAP…
                        </div>
                      ) : errorBodegas ? (
                        <p className="text-xs text-red-600 flex items-center gap-1">
                          <AlertCircle size={13} className="shrink-0" /> {errorBodegas}
                        </p>
                      ) : bodegasCuartoFrio.length === 0 ? (
                        <p className="text-xs text-gray-400">No se encontraron bodegas de cuarto frío (WhsCode &quot;CFR-...&quot;) en SAP.</p>
                      ) : (
                        <select
                          value={bodegaSeleccionada}
                          onChange={(e) => setBodegaSeleccionada(e.target.value)}
                          className="w-full h-9 px-3 rounded-md border border-input bg-input-background text-sm"
                        >
                          <option value="">Selecciona una bodega…</option>
                          {bodegasCuartoFrio.map((b) => (
                            <option key={b.whs_code} value={b.whs_code}>
                              {b.whs_code} — {b.nombre}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    {Object.keys(cantidades).length === 0 ? (
                      <p className="text-xs text-gray-400">No hay productos con inventario disponible.</p>
                    ) : (
                      camion.inventario
                        .filter((p) => p.codigo_producto in cantidades)
                        .map((p) => (
                          <div key={p.codigo_producto} className="flex items-center gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-700 truncate">{p.nombre_producto}</p>
                              <p className="text-[11px] text-gray-400">Disponible en camión: {p.cantidad} {p.unidad_medida}</p>
                            </div>
                            <Input
                              type="number"
                              min={0}
                              max={p.cantidad}
                              placeholder="0"
                              value={cantidades[p.codigo_producto]}
                              onChange={(e) =>
                                setCantidades((prev) => ({ ...prev, [p.codigo_producto]: e.target.value }))
                              }
                              className="w-28 h-8 text-xs"
                            />
                          </div>
                        ))
                    )}
                  </div>

                  {errorAccion && (
                    <p className="text-xs text-red-600 mt-3 flex items-center gap-1">
                      <AlertCircle size={13} /> {errorAccion}
                    </p>
                  )}

                  <div className="flex gap-2 mt-4">
                    <Button
                      variant={accion === "traslado" ? "submit" : "success"}
                      onClick={confirmarAccion}
                      disabled={confirmandoAccion || (accion === "traslado" && (cargandoBodegas || !bodegaSeleccionada))}
                    >
                      {confirmandoAccion && <Loader2 size={14} className="mr-1.5 animate-spin" />}
                      {accion === "traslado"
                        ? confirmandoAccion ? "Enviando a SAP…" : "Confirmar traslado"
                        : confirmandoAccion ? "Entregando en SAP…" : "Confirmar entrega"}
                    </Button>
                    <Button variant="cancel" onClick={cancelarAccion} disabled={confirmandoAccion}>Cancelar</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
