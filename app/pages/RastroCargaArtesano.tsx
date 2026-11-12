"use client";

import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Camera,
  Eraser,
  Inbox,
  Loader2,
  MapPin,
  Package,
  Phone,
  Printer,
  RefreshCw,
  Truck,
  SlidersHorizontal,
  User,
  UserCog,
  XCircle,
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Combobox } from "../ui/combobox";
import {
  cambiarPilotoArtesano,
  cargarPedidosArtesano,
  getPdfEnviosArtesano,
  getPedidosPendientesArtesano,
  getPilotosArtesano,
  getProductosArtesano,
} from "../api/PedidoEspecialApi";
import { PedidoArtesano, PilotoArtesano, ProductoArtesano } from "../types/PedidoEspecialModel";
import { BannerMensaje, ModalBase, formatearFechaCorta } from "./PedidoEspecialComun";
import { EtiquetaEstado } from "./PedidosArtesanoView";
import { AjustarCantidadesModal, EvidenciaEntrega, RechazarModal, VisorPdf } from "./ComponentesEnvioArtesano";

// Fecha de hoy en la hora local (toISOString daría la de UTC, que de noche en Guatemala ya es mañana).
function hoyLocal(): string {
  const ahora = new Date();
  const mes = String(ahora.getMonth() + 1).padStart(2, "0");
  const dia = String(ahora.getDate()).padStart(2, "0");

  return `${ahora.getFullYear()}-${mes}-${dia}`;
}

// Cantidad que realmente se envía: lo autorizado (o lo pedido si no hubo ajuste).
function cantidadEnvio(item: PedidoArtesano["items"][number]): number {
  return item.cantidad_autorizada ?? item.cantidad;
}

function redondear(n: number): number {
  return Math.round(n * 100) / 100;
}

interface TotalProducto {
  codigo: string;
  descripcion: string;
  cantidad: number;
  cajas: number | null;
  libras: number | null;
}

// Totales por producto con cajas y libras según los factores del catálogo.
function totalesPorProducto(pedidos: PedidoArtesano[], catalogo: Map<string, ProductoArtesano>): TotalProducto[] {
  const mapa = new Map<string, TotalProducto>();

  for (const pedido of pedidos) {
    for (const item of pedido.items) {
      const cantidad = cantidadEnvio(item);
      if (cantidad <= 0) continue;

      const actual = mapa.get(item.codigo_producto);
      mapa.set(item.codigo_producto, {
        codigo: item.codigo_producto,
        descripcion: item.descripcion_producto,
        cantidad: (actual?.cantidad ?? 0) + cantidad,
        cajas: null,
        libras: null,
      });
    }
  }

  return [...mapa.values()]
    .map((t) => {
      const producto = catalogo.get(t.codigo);

      return {
        ...t,
        cajas: producto?.factor_caja ? redondear(t.cantidad / producto.factor_caja) : null,
        libras: producto?.factor_libras ? redondear(t.cantidad * producto.factor_libras) : null,
      };
    })
    .sort((a, b) => (catalogo.get(a.codigo)?.orden ?? 0) - (catalogo.get(b.codigo)?.orden ?? 0));
}

function PanelTotales({ titulo, totales }: { titulo: string; totales: TotalProducto[] }) {
  if (totales.length === 0) return null;

  const totalLibras = redondear(totales.reduce((suma, t) => suma + (t.libras ?? 0), 0));
  const hayLibras = totales.some((t) => t.libras !== null);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
      <p className="text-sm font-medium text-gray-700 mb-2">{titulo}</p>
      <div className="divide-y divide-gray-100">
        {totales.map((t) => (
          <div key={t.codigo} className="flex items-center justify-between gap-3 py-1.5 text-sm">
            <div className="min-w-0">
              <p className="text-gray-800 truncate">{t.descripcion}</p>
              <p className="text-xs text-gray-400">{t.codigo}</p>
            </div>
            <div className="flex items-center gap-4 shrink-0 tabular-nums text-gray-600">
              <span>{t.cantidad} und</span>
              <span className="text-gray-400 hidden sm:inline w-24 text-right">{t.cajas !== null ? `${t.cajas} cajas` : "—"}</span>
              <span className="text-gray-400 hidden sm:inline w-24 text-right">{t.libras !== null ? `${t.libras} lbs` : "—"}</span>
            </div>
          </div>
        ))}
      </div>
      {hayLibras && <p className="text-xs text-gray-500 text-right mt-2">Total: {totalLibras} lbs</p>}
    </div>
  );
}

// Modal: piloto (cargar o cambiar)
function PilotoModal({
  titulo,
  subtitulo,
  textoConfirmar,
  pilotos,
  cargandoPilotos,
  pilotoInicial,
  onClose,
  onConfirmar,
}: {
  titulo: string;
  subtitulo: string;
  textoConfirmar: string;
  pilotos: PilotoArtesano[];
  cargandoPilotos: boolean;
  pilotoInicial: string;
  onClose: () => void;
  onConfirmar: (codigoPiloto: number) => Promise<void>;
}) {
  const [piloto, setPiloto] = useState(pilotoInicial);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const opciones = useMemo(
    () => pilotos.map((p) => ({ id: String(p.codigo), name: `${p.nombre} (${p.codigo})` })),
    [pilotos]
  );

  const confirmar = async () => {
    if (piloto === "") {
      setError("Debe seleccionar el piloto");
      return;
    }

    setGuardando(true);
    setError(null);

    try {
      await onConfirmar(Number(piloto));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo completar la acción");
      setGuardando(false);
    }
  };

  return (
    <ModalBase titulo={titulo} subtitulo={subtitulo} deshabilitarCierre={guardando} onClose={onClose}>
      <div className="px-6 py-4 space-y-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Piloto</label>
          {cargandoPilotos ? (
            <p className="text-sm text-gray-400 flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" /> Cargando pilotos...
            </p>
          ) : (
            <Combobox
              options={opciones}
              value={piloto}
              onChange={setPiloto}
              placeholder="Seleccione un piloto"
              searchPlaceholder="Buscar por nombre..."
              emptyMessage="No se encontró el piloto"
              disabled={guardando}
            />
          )}
        </div>
        {error && <BannerMensaje tipo="error" texto={error} />}
      </div>
      <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
        <Button onClick={onClose} disabled={guardando} variant="outline" size="sm">
          Cancelar
        </Button>
        <Button onClick={confirmar} disabled={guardando || cargandoPilotos || piloto === ""} variant="success" size="sm">
          {guardando && <Loader2 size={14} className="animate-spin mr-1.5" />}
          {textoConfirmar}
        </Button>
      </div>
    </ModalBase>
  );
}

// Tarjeta de un pedido (por cargar, cargado o en el reporte)
export function TarjetaEnvio({
  pedido,
  seleccionado = false,
  seleccionable = false,
  onSeleccionar,
  mostrarEstado = false,
  puedeAdjuntar = false,
  onCambio,
  acciones,
}: {
  pedido: PedidoArtesano;
  seleccionado?: boolean;
  seleccionable?: boolean;
  onSeleccionar?: () => void;
  mostrarEstado?: boolean;
  puedeAdjuntar?: boolean;
  onCambio?: () => void;
  // Botones al pie de la tarjeta (ajustar, rechazar...).
  acciones?: ReactNode;
}) {
  const [abierta, setAbierta] = useState(false);
  // Pedido pendiente al que ya se le bajó alguna cantidad: se cargará parcial.
  const ajustado = pedido.estado === "CREADO" && pedido.items.some((i) => i.cantidad_autorizada !== null && i.cantidad_autorizada < i.cantidad);

  return (
    <div className={`border rounded-xl overflow-hidden ${seleccionado ? "border-[#2183AE]" : "border-gray-200"}`}>
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-50">
        {seleccionable && (
          <input
            type="checkbox"
            checked={seleccionado}
            onChange={onSeleccionar}
            aria-label={`Seleccionar ${pedido.numero_pedido}`}
            className="h-4 w-4 accent-[#2183AE] shrink-0"
          />
        )}
        <button onClick={() => setAbierta((v) => !v)} className="flex-1 min-w-0 flex items-center gap-3 text-left">
          <span className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center shrink-0">
            <User size={14} className="text-gray-500" />
          </span>
          <span className="text-sm text-gray-700 flex-1 min-w-0 truncate">{pedido.cliente_nombre}</span>
          <span className="text-xs text-gray-400 shrink-0 hidden sm:inline">
            {pedido.serie} {pedido.numero_pedido}
          </span>
          <span className="text-xs text-gray-500 shrink-0">{formatearFechaCorta(pedido.fecha_requerida)}</span>
          {mostrarEstado && <EtiquetaEstado estado={pedido.estado} />}
          {ajustado && (
            <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 shrink-0 inline-flex items-center gap-1">
              <SlidersHorizontal size={12} /> Ajustado
            </span>
          )}
          {(pedido.estado === "CARGADO" || pedido.estado === "ENTREGADO") && (
            <span className="text-xs text-violet-700 bg-violet-50 border border-violet-200 rounded-full px-2 py-0.5 shrink-0 hidden md:inline-flex items-center gap-1">
              <Truck size={12} /> {pedido.nombre_piloto ?? "Sin piloto"}
            </span>
          )}
          {pedido.tiene_evidencia_entrega && <Camera size={14} className="text-emerald-600 shrink-0" aria-label="Con foto de la hoja firmada" />}
          {abierta ? <ChevronUp size={15} className="text-gray-400 shrink-0" /> : <ChevronDown size={15} className="text-gray-400 shrink-0" />}
        </button>
      </div>

      {abierta && (
        <div className="px-4 py-3 space-y-3 bg-white">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              {pedido.direccion_entrega && (
                <>
                  <p className="text-xs text-gray-400">Dirección de entrega</p>
                  <p className="text-gray-800 flex items-start gap-1.5">
                    <MapPin size={13} className="text-[#2183AE] mt-1 shrink-0" /> {pedido.direccion_entrega}
                  </p>
                </>
              )}
              {pedido.telefono_contacto && (
                <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                  <Phone size={11} /> {pedido.telefono_contacto}
                </p>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-400">Ruta</p>
              <p className="text-gray-800">{pedido.nombre_ruta}</p>
              {pedido.nombre_tienda_referencia && <p className="text-xs text-gray-400">Tienda: {pedido.nombre_tienda_referencia}</p>}
              {pedido.rechazado_por && <p className="text-xs text-gray-400">Rechazado por {pedido.rechazado_por}</p>}
              {pedido.estado === "ENTREGADO" && pedido.entregado_por && (
                <p className="text-xs text-emerald-700">
                  Entregado por {pedido.entregado_por}
                  {pedido.fecha_entrega ? ` · ${formatearFechaCorta(pedido.fecha_entrega)}` : ""}
                </p>
              )}
            </div>
          </div>

          {pedido.estado === "RECHAZADO" && pedido.motivo_rechazo && (
            <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              <p className="text-[11px] font-medium uppercase tracking-wide text-red-700">Motivo del rechazo</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{pedido.motivo_rechazo}</p>
            </div>
          )}

          {(pedido.sap_traslado_docnum || pedido.sap_entrega_docnum) && (
            <p className="text-xs text-gray-500">
              SAP:{pedido.sap_traslado_docnum ? ` transferencia ${pedido.sap_traslado_docnum}` : ""}
              {pedido.sap_entrega_docnum ? ` · entrega ${pedido.sap_entrega_docnum}` : ""}
            </p>
          )}

          {pedido.comentario && (
            <div className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Comentario</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{pedido.comentario}</p>
            </div>
          )}

          <div className="space-y-1.5">
            {pedido.items.map((item) => (
              <div key={item.codigo_producto} className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg hover:bg-gray-50">
                <div className="flex items-start gap-3 min-w-0">
                  <Package size={14} className="text-sky-500 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm text-gray-800">{item.descripcion_producto}</p>
                    <p className="text-xs text-gray-400">{item.codigo_producto}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600 tabular-nums shrink-0 text-right">
                  {item.cantidad_autorizada !== null && item.cantidad_autorizada !== item.cantidad ? (
                    <>
                      <span className="line-through text-gray-400 mr-1.5">{item.cantidad}</span>
                      <span className="font-medium text-amber-700">{item.cantidad_autorizada}</span>
                    </>
                  ) : (
                    item.cantidad
                  )}
                </p>
              </div>
            ))}
          </div>

          <EvidenciaEntrega pedido={pedido} puedeAdjuntar={puedeAdjuntar} onCambio={onCambio ?? (() => {})} />

        </div>
      )}

      {(acciones || (!abierta && pedido.direccion_entrega)) && (
        <div className="px-4 py-2.5 border-t border-gray-100 bg-white flex flex-wrap items-center gap-2">
          {!abierta && pedido.direccion_entrega && (
            <p className="flex-1 min-w-0 text-sm text-gray-600 flex items-center gap-1.5" title={pedido.direccion_entrega}>
              <MapPin size={13} className="text-[#2183AE] shrink-0" />
              <span className="truncate">{pedido.direccion_entrega}</span>
            </p>
          )}
          {acciones && <div className="flex flex-wrap justify-end gap-2 ml-auto">{acciones}</div>}
        </div>
      )}
    </div>
  );
}

// Carga común de la lista, filtros y selección
function useListaEnvios(estado: "CREADO" | "CARGADO") {
  // Por defecto se ven los pedidos con entrega de hoy; se pueden cambiar o quitar las fechas.
  const [fechaDesde, setFechaDesde] = useState(hoyLocal);
  const [fechaHasta, setFechaHasta] = useState(hoyLocal);
  const [recarga, setRecarga] = useState(0);
  const [pedidos, setPedidos] = useState<PedidoArtesano[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const [catalogo, setCatalogo] = useState<Map<string, ProductoArtesano>>(new Map());

  const fechasInvertidas = fechaDesde !== "" && fechaHasta !== "" && fechaDesde > fechaHasta;

  useEffect(() => {
    getProductosArtesano()
      .then((productos) => setCatalogo(new Map(productos.map((p) => [p.codigo_producto, p]))))
      .catch(() => setCatalogo(new Map()));
  }, []);

  useEffect(() => {
    if (fechasInvertidas) return;

    let vigente = true;

    getPedidosPendientesArtesano(fechaDesde || undefined, fechaHasta || undefined, estado)
      .then((lista) => {
        if (!vigente) return;
        setPedidos(lista);
        setError(null);
        setSeleccion((previa) => new Set([...previa].filter((id) => lista.some((p) => p.id === id))));
      })
      .catch((err) => {
        if (vigente) setError(err instanceof Error ? err.message : "Error al obtener los pedidos");
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });

    return () => {
      vigente = false;
    };
  }, [fechaDesde, fechaHasta, fechasInvertidas, estado, recarga]);

  const recargar = useCallback(() => {
    setCargando(true);
    setRecarga((n) => n + 1);
  }, []);

  const alternar = (id: string) =>
    setSeleccion((previa) => {
      const nueva = new Set(previa);
      if (nueva.has(id)) nueva.delete(id);
      else nueva.add(id);
      return nueva;
    });

  const seleccionados = useMemo(() => pedidos.filter((p) => seleccion.has(p.id)), [pedidos, seleccion]);

  return {
    fechaDesde, setFechaDesde, fechaHasta, setFechaHasta, fechasInvertidas,
    pedidos, cargando, error, setError, seleccion, setSeleccion, alternar, seleccionados, catalogo, recargar,
  };
}

function Filtros({
  fechaDesde, setFechaDesde, fechaHasta, setFechaHasta, fechasInvertidas, cargando, recargar, unaFecha = false,
}: {
  fechaDesde: string;
  setFechaDesde: (v: string) => void;
  fechaHasta: string;
  setFechaHasta: (v: string) => void;
  fechasInvertidas: boolean;
  cargando: boolean;
  recargar: () => void;
  // Una sola fecha de entrega (la carga es de un día); si no, un rango.
  unaFecha?: boolean;
}) {
  if (unaFecha) {
    const cambiarFecha = (valor: string) => {
      if (!valor) return;
      setFechaDesde(valor);
      setFechaHasta(valor);
    };

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Fecha de entrega</label>
            <Input type="date" value={fechaDesde} onChange={(e) => cambiarFecha(e.target.value)} />
          </div>
          <Button onClick={() => cambiarFecha(hoyLocal())} disabled={cargando || fechaDesde === hoyLocal()} size="sm" variant="outline">
            Hoy
          </Button>
          <Button onClick={recargar} disabled={cargando} size="sm" variant="submit">
            {cargando ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <RefreshCw size={14} className="mr-1.5" />}
            Actualizar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Requerido desde</label>
          <Input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Requerido hasta</label>
          <Input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} />
        </div>
        <Button
          onClick={() => {
            setFechaDesde(hoyLocal());
            setFechaHasta(hoyLocal());
          }}
          disabled={cargando || (fechaDesde === hoyLocal() && fechaHasta === hoyLocal())}
          size="sm"
          variant="outline"
        >
          Hoy
        </Button>
        <Button
          onClick={() => {
            setFechaDesde("");
            setFechaHasta("");
          }}
          disabled={cargando || (fechaDesde === "" && fechaHasta === "")}
          size="sm"
          variant="outline"
        >
          <Eraser size={14} className="mr-1.5" />
          Todas las fechas
        </Button>
        <Button onClick={recargar} disabled={cargando || fechasInvertidas} size="sm" variant="submit">
          {cargando ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <RefreshCw size={14} className="mr-1.5" />}
          Actualizar
        </Button>
      </div>
      {fechasInvertidas && <p className="text-xs text-red-600 mt-2">La fecha inicial no puede ser mayor que la final.</p>}
    </div>
  );
}

export function ListaVacia({ texto }: { texto: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center">
      <Inbox size={24} className="text-gray-300 mb-2" />
      <p className="text-sm text-gray-400">{texto}</p>
    </div>
  );
}

// Pilotos de Nomina, se piden la primera vez que se abre un modal que los usa.
function usePilotos() {
  const [pilotos, setPilotos] = useState<PilotoArtesano[]>([]);
  const [cargando, setCargando] = useState(false);
  const [yaCargo, setYaCargo] = useState(false);

  const cargar = useCallback(() => {
    if (yaCargo) return;

    setYaCargo(true);
    setCargando(true);

    getPilotosArtesano()
      .then(setPilotos)
      .catch(() => setYaCargo(false))
      .finally(() => setCargando(false));
  }, [yaCargo]);

  return { pilotos, cargandoPilotos: cargando, cargarPilotos: cargar };
}

// ---------------------------------------------------------------------------
// Pestaña por cargar (pedidos CREADOS). Cargar incluye la autorización: se puede bajar la cantidad o rechazar.
// ---------------------------------------------------------------------------
export function TabCargar({ puedeResolver }: { puedeResolver: boolean }) {
  const lista = useListaEnvios("CREADO");
  const { pilotos, cargandoPilotos, cargarPilotos } = usePilotos();
  const [aviso, setAviso] = useState<string | null>(null);
  // Ruta y día que se van a cargar con un solo piloto (se cargan completos).
  const [rutaACargar, setRutaACargar] = useState<{ ids: string[]; nombre: string; fecha: string } | null>(null);
  // Cantidades a cargar de los pedidos ajustados (por id de pedido y código de producto).
  const [ajustes, setAjustes] = useState<Record<string, Record<string, number>>>({});
  const [ajustando, setAjustando] = useState<PedidoArtesano | null>(null);
  const [rechazando, setRechazando] = useState<PedidoArtesano | null>(null);

  // Cada pedido con sus cantidades ya ajustadas, que es lo que se muestra, se suma y se carga.
  const pedidos = useMemo(
    () =>
      lista.pedidos.map((p) => {
        const ajuste = ajustes[p.id];

        return ajuste ? { ...p, items: p.items.map((i) => ({ ...i, cantidad_autorizada: ajuste[i.codigo_producto] ?? i.cantidad })) } : p;
      }),
    [lista.pedidos, ajustes]
  );
  const totales = useMemo(() => totalesPorProducto(pedidos, lista.catalogo), [pedidos, lista.catalogo]);

  // Pedidos por ruta y día: cada ruta la recorre un solo piloto ese día, así que se cargan completos.
  const grupos = useMemo(() => {
    const mapa = new Map<string, { clave: string; nombre: string; fecha: string; pedidos: PedidoArtesano[] }>();

    for (const p of pedidos) {
      const clave = `${p.ruta_id}|${p.fecha_requerida}`;
      const grupo = mapa.get(clave) ?? { clave, nombre: p.nombre_ruta, fecha: p.fecha_requerida, pedidos: [] };
      grupo.pedidos.push(p);
      mapa.set(clave, grupo);
    }

    return [...mapa.values()].sort((a, b) => a.fecha.localeCompare(b.fecha) || a.nombre.localeCompare(b.nombre, "es"));
  }, [pedidos]);

  const cargarRuta = (grupo: { nombre: string; fecha: string; pedidos: PedidoArtesano[] }) => {
    cargarPilotos();
    setRutaACargar({ ids: grupo.pedidos.map((p) => p.id), nombre: grupo.nombre, fecha: grupo.fecha });
  };

  const aplicarAjuste = (pedido: PedidoArtesano, cantidades: Record<string, number> | null) => {
    setAjustes((previos) => {
      const nuevos = { ...previos };
      if (cantidades) nuevos[pedido.id] = cantidades;
      else delete nuevos[pedido.id];
      return nuevos;
    });
    setAjustando(null);
  };

  const alRechazar = (pedido: PedidoArtesano) => {
    setRechazando(null);
    setAviso(`Pedido ${pedido.numero_pedido} rechazado.`);
    lista.recargar();
  };

  const confirmarCarga = async (codigoPiloto: number) => {
    if (!rutaACargar) return;

    const ids = rutaACargar.ids;
    const ajustesApi = Object.fromEntries(
      ids
        .filter((id) => ajustes[id])
        .map((id) => [id, Object.entries(ajustes[id]).map(([codigo_producto, cantidad]) => ({ codigo_producto, cantidad }))])
    );
    const versiones = Object.fromEntries(lista.pedidos.filter((p) => ids.includes(p.id)).map((p) => [p.id, p.actualizado_en]));

    // Si no se carga ninguno, el error sale en el modal. Si SAP rechazó alguna ruta, las demás sí se cargaron.
    const { pedidos: cargados, errores } = await cargarPedidosArtesano(ids, codigoPiloto, ajustesApi, versiones);
    const idsCargados = cargados.map((p) => p.id);

    setRutaACargar(null);
    setAjustes((previos) => Object.fromEntries(Object.entries(previos).filter(([id]) => !idsCargados.includes(id))));
    lista.recargar();

    if (errores.length > 0) lista.setError(errores.join(" | "));

    if (idsCargados.length > 0) setAviso(`${idsCargados.length} pedido(s) cargado(s).`);
  };

  return (
    <>
      <Filtros {...lista} unaFecha />

      {aviso && <BannerMensaje tipo="ok" texto={aviso} onCerrar={() => setAviso(null)} />}
      {lista.error && <BannerMensaje tipo="error" texto={lista.error} onCerrar={() => lista.setError(null)} />}

      <PanelTotales titulo={`Totales de los ${pedidos.length} pedido(s) por cargar`} totales={totales} />

      {lista.cargando && pedidos.length === 0 && (
        <div className="flex items-center justify-center py-14 text-gray-400">
          <Loader2 size={20} className="animate-spin" />
        </div>
      )}

      {!lista.cargando && !lista.error && pedidos.length === 0 && <ListaVacia texto="No hay pedidos por cargar." />}

      {grupos.length > 0 && (
        <div className="space-y-6">
          {grupos.map((grupo) => {
            const ids = grupo.pedidos.map((p) => p.id);
            const resumen = totalesPorProducto(grupo.pedidos, lista.catalogo);

            return (
              <section key={grupo.clave} className="space-y-2.5">
                <div className="flex flex-wrap items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3">
                  <MapPin size={16} className="text-[#2183AE] shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">
                      {grupo.nombre}{" "}
                      <span className="text-gray-400 font-normal">
                        · {formatearFechaCorta(grupo.fecha)} · {ids.length} pedido(s)
                      </span>
                    </p>
                    {resumen.length > 0 && (
                      <p className="text-xs text-gray-500 truncate">{resumen.map((t) => `${t.descripcion} ${t.cantidad}`).join(" · ")}</p>
                    )}
                  </div>
                  {puedeResolver && (
                    <Button onClick={() => cargarRuta(grupo)} size="sm" variant="success">
                      <Truck size={14} className="mr-1.5" />
                      Cargar ruta
                    </Button>
                  )}
                </div>
                {grupo.pedidos.map((pedido) => (
                  <TarjetaEnvio
                    key={pedido.id}
                    pedido={pedido}
                    acciones={
                      puedeResolver ? (
                        <>
                          <Button onClick={() => setRechazando(pedido)} variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                            <XCircle size={14} className="mr-1.5" />
                            Rechazar
                          </Button>
                          <Button onClick={() => setAjustando(pedido)} variant="outline" size="sm">
                            <SlidersHorizontal size={14} className="mr-1.5" />
                            Ajustar cantidades
                          </Button>
                        </>
                      ) : undefined
                    }
                  />
                ))}
              </section>
            );
          })}
        </div>
      )}

      {ajustando && (
        <AjustarCantidadesModal
          // Se parte de lo solicitado, no de lo ya ajustado, para que los topes sean los del pedido.
          pedido={lista.pedidos.find((p) => p.id === ajustando.id) ?? ajustando}
          cantidadesActuales={ajustes[ajustando.id]}
          onClose={() => setAjustando(null)}
          onAplicar={(cantidades) => aplicarAjuste(ajustando, cantidades)}
        />
      )}

      {rechazando && (
        <RechazarModal
          pedido={lista.pedidos.find((p) => p.id === rechazando.id) ?? rechazando}
          onClose={() => setRechazando(null)}
          onRechazado={alRechazar}
        />
      )}

      {rutaACargar && (
        <PilotoModal
          titulo="Cargar ruta"
          subtitulo={`${rutaACargar.nombre} · ${formatearFechaCorta(rutaACargar.fecha)} · ${rutaACargar.ids.length} pedido(s) con el mismo piloto`}
          textoConfirmar="Cargar"
          pilotos={pilotos}
          cargandoPilotos={cargandoPilotos}
          pilotoInicial=""
          onClose={() => setRutaACargar(null)}
          onConfirmar={confirmarCarga}
        />
      )}
    </>
  );
}

// Pestaña: cargados (reimprimir y cambiar piloto; la entrega se hace desde la PioApp)
export function TabCargados({ puedeResolver }: { puedeResolver: boolean }) {
  const lista = useListaEnvios("CARGADO");
  const { pilotos, cargandoPilotos, cargarPilotos } = usePilotos();
  const [aviso, setAviso] = useState<string | null>(null);
  const [cambiandoPiloto, setCambiandoPiloto] = useState(false);
  const [generando, setGenerando] = useState(false);
  const [urlPdf, setUrlPdf] = useState<string | null>(null);

  const { pedidos, seleccionados } = lista;
  const base = seleccionados.length > 0 ? seleccionados : pedidos;
  const totales = useMemo(() => totalesPorProducto(base, lista.catalogo), [base, lista.catalogo]);

  // Código de piloto común a la selección, para precargarlo en el modal.
  const pilotoComun = useMemo(() => {
    const codigos = new Set(seleccionados.map((p) => p.codigo_piloto));

    return codigos.size === 1 && seleccionados[0]?.codigo_piloto ? String(seleccionados[0].codigo_piloto) : "";
  }, [seleccionados]);

  const reimprimir = async () => {
    setGenerando(true);
    lista.setError(null);

    try {
      setUrlPdf(await getPdfEnviosArtesano(seleccionados.map((p) => p.id)));
    } catch (err) {
      lista.setError(err instanceof Error ? err.message : "Error al generar el PDF del envío");
    } finally {
      setGenerando(false);
    }
  };

  const cerrarPdf = () => {
    if (urlPdf) window.URL.revokeObjectURL(urlPdf);
    setUrlPdf(null);
  };

  const confirmarPiloto = async (codigoPiloto: number) => {
    await cambiarPilotoArtesano(seleccionados.map((p) => p.id), codigoPiloto);

    setCambiandoPiloto(false);
    setAviso("Piloto actualizado. Reimprime el envío para que salga con el piloto nuevo.");
    lista.setSeleccion(new Set());
    lista.recargar();
  };

  return (
    <>
      <Filtros {...lista} />

      {aviso && <BannerMensaje tipo="ok" texto={aviso} onCerrar={() => setAviso(null)} />}
      {lista.error && <BannerMensaje tipo="error" texto={lista.error} onCerrar={() => lista.setError(null)} />}

      <PanelTotales
        titulo={seleccionados.length > 0 ? `Totales de ${seleccionados.length} pedido(s) seleccionado(s)` : `Totales de los ${pedidos.length} pedido(s) cargados`}
        totales={totales}
      />

      {seleccionados.length > 0 && (
        <div className="sticky top-2 z-20 flex flex-wrap items-center justify-between gap-2 bg-sky-50 border border-sky-200 rounded-xl px-4 py-2.5 mb-4 shadow-md">
          <p className="text-sm text-sky-800">{seleccionados.length} pedido(s) seleccionado(s)</p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => lista.setSeleccion(new Set())} size="sm" variant="outline">
              Quitar selección
            </Button>
            {puedeResolver && (
              <Button
                onClick={() => {
                  cargarPilotos();
                  setCambiandoPiloto(true);
                }}
                size="sm"
                variant="outline"
              >
                <UserCog size={14} className="mr-1.5" />
                Cambiar piloto
              </Button>
            )}
            <Button onClick={reimprimir} disabled={generando} size="sm" variant="outline">
              {generando ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <Printer size={14} className="mr-1.5" />}
              Reimprimir
            </Button>
          </div>
        </div>
      )}

      {lista.cargando && pedidos.length === 0 && (
        <div className="flex items-center justify-center py-14 text-gray-400">
          <Loader2 size={20} className="animate-spin" />
        </div>
      )}

      {!lista.cargando && !lista.error && pedidos.length === 0 && <ListaVacia texto="No hay pedidos cargados." />}

      {pedidos.length > 0 && (
        <div className="space-y-2.5">
          {pedidos.map((pedido) => (
            <TarjetaEnvio
              key={pedido.id}
              pedido={pedido}
              seleccionado={lista.seleccion.has(pedido.id)}
              seleccionable
              onSeleccionar={() => lista.alternar(pedido.id)}
              onCambio={lista.recargar}
            />
          ))}
        </div>
      )}

      {cambiandoPiloto && (
        <PilotoModal
          titulo="Cambiar piloto"
          subtitulo={`${seleccionados.length} pedido(s) cargados`}
          textoConfirmar="Guardar piloto"
          pilotos={pilotos}
          cargandoPilotos={cargandoPilotos}
          pilotoInicial={pilotoComun}
          onClose={() => setCambiandoPiloto(false)}
          onConfirmar={confirmarPiloto}
        />
      )}

      {urlPdf && <VisorPdf url={urlPdf} onClose={cerrarPdf} />}
    </>
  );
}
