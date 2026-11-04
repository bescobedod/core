"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Star,
  Loader2,
  Store,
  Package,
  ChevronDown,
  ChevronUp,
  Search,
  Inbox,
  Scale,
  PackageCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { getAllMenus } from "../api/MenuApi";
import { getMiDivision } from "../api/UserApi";
import {
  getPedidosEspeciales,
  getStockPedidoEspecial,
  guardarAsignacionPedidoEspecial,
  marcarPedidoEspecialListo,
} from "../api/PedidoEspecialApi";
import { EstadoPedidoEspecial, ItemStockEspecial, Paginacion, PedidoEspecial } from "../types/PedidoEspecialModel";
import { NivelPermisoMenu } from "../types/MenuModel";
import {
  BannerMensaje,
  ComentarioPedido,
  ESTADO_ESPECIAL_CFG,
  EntregaPlaceholder,
  EstadoEspecialBadge,
  ControlesPaginacion,
  ModalBase,
  fechaManana,
  formatearFechaCorta,
} from "./PedidoEspecialComun";

interface FiltrosAplicados {
  estado: string;
  fecha: string;
}

const ESTADOS_OPERATIVOS: EstadoPedidoEspecial[] = ["AUTORIZADO", "EN_PREPARACION", "LISTO_PARA_RECOGER", "ENTREGADO"];
const TODOS_LOS_ESTADOS: EstadoPedidoEspecial[] = ["PENDIENTE_APROBACION", "RECHAZADO", ...ESTADOS_OPERATIVOS];

interface OpcionEstado {
  id: string;
  label: string;
  estados: EstadoPedidoEspecial[];
}

// Opciones del desplegable de estado. Quien despacha ve del autorizado en
// adelante; la asistente de división (solo lectura) ve todos los estados.
function opcionesEstado(soloLectura: boolean): OpcionEstado[] {
  const base = soloLectura ? TODOS_LOS_ESTADOS : ESTADOS_OPERATIVOS;

  return [
    ...(soloLectura
      ? []
      : [{ id: "en_proceso", label: "En proceso (autorizado a listo)", estados: ["AUTORIZADO", "EN_PREPARACION", "LISTO_PARA_RECOGER"] as EstadoPedidoEspecial[] }]),
    { id: "todos", label: "Todos", estados: base },
    ...base.map((estado) => ({ id: estado, label: ESTADO_ESPECIAL_CFG[estado].label, estados: [estado] })),
  ];
}

type EstadoLinea = "cubierto" | "parcial" | "sin_stock" | "no_encontrado";

function estadoDeLinea(solicitada: number, stock: ItemStockEspecial | undefined): EstadoLinea {
  if (!stock || !stock.encontrado_en_sap) return "no_encontrado";
  if (stock.stock_disponible <= 0) return "sin_stock";
  return stock.stock_disponible >= solicitada ? "cubierto" : "parcial";
}

const CFG_LINEA: Record<EstadoLinea, { texto: string; clase: string; icono: React.ReactNode }> = {
  cubierto: { texto: "Cubierto", clase: "bg-green-50 text-green-700 border-green-200", icono: <CheckCircle2 size={11} /> },
  parcial: { texto: "Parcial", clase: "bg-amber-50 text-amber-700 border-amber-200", icono: <AlertTriangle size={11} /> },
  sin_stock: { texto: "Sin stock", clase: "bg-red-50 text-red-700 border-red-200", icono: <XCircle size={11} /> },
  no_encontrado: { texto: "No está en SAP", clase: "bg-gray-100 text-gray-500 border-gray-200", icono: <AlertCircle size={11} /> },
};

function ProcesarPedidoModal({
  pedido,
  onClose,
  onGuardado,
}: {
  pedido: PedidoEspecial;
  onClose: () => void;
  onGuardado: (pedido: PedidoEspecial) => void;
}) {
  const yaAsignado = pedido.estado === "EN_PREPARACION";
  const [stock, setStock] = useState<ItemStockEspecial[] | null>(null);
  const [calculando, setCalculando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [asignadas, setAsignadas] = useState<Record<string, string>>(
    Object.fromEntries(pedido.items.map((i) => [i.id, yaAsignado ? String(i.cantidad_asignada) : ""]))
  );

  const stockPorCodigo = useMemo(() => new Map((stock ?? []).map((s) => [s.codigo_producto, s])), [stock]);

  const handleCalcular = async () => {
    setCalculando(true);
    setError(null);

    try {
      const resultado = await getStockPedidoEspecial(pedido.id);
      const porCodigo = new Map(resultado.map((s) => [s.codigo_producto, s]));
      setStock(resultado);

      // Sugerencia: lo que alcance del stock, sin pasar de lo solicitado.
      setAsignadas(
        Object.fromEntries(
          pedido.items.map((i) => {
            const disponible = porCodigo.get(i.codigo_producto)?.stock_disponible ?? 0;
            return [i.id, String(Math.max(0, Math.min(i.cantidad_solicitada, disponible)))];
          })
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al calcular el stock");
    } finally {
      setCalculando(false);
    }
  };

  const lineas = pedido.items.map((item) => {
    const valor = Number(asignadas[item.id]);
    const disponible = stockPorCodigo.get(item.codigo_producto)?.stock_disponible ?? 0;
    const invalida = asignadas[item.id] === "" || !Number.isFinite(valor) || valor < 0 || valor > item.cantidad_solicitada;
    const superaStock = stock !== null && valor > disponible;

    return { item, valor, invalida, superaStock };
  });

  const hayErrores = lineas.some((l) => l.invalida || l.superaStock);
  const sinAsignar = lineas.every((l) => l.valor === 0);

  const handleGuardar = async () => {
    setGuardando(true);
    setError(null);

    try {
      const actualizado = await guardarAsignacionPedidoEspecial(
        pedido.id,
        lineas.map((l) => ({ item_id: l.item.id, cantidad_asignada: l.valor }))
      );
      onGuardado(actualizado);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la asignación");
      setGuardando(false);
    }
  };

  return (
    <ModalBase
      titulo="Procesar pedido"
      subtitulo={`${pedido.numero_pedido} · ${pedido.nombre_tienda} · Stock del muelle Central`}
      ancho="max-w-2xl"
      deshabilitarCierre={guardando}
      onClose={onClose}
    >
      <div className="px-6 py-5 space-y-4 overflow-y-auto min-h-0">
        <ComentarioPedido comentario={pedido.comentario} />

        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-gray-500">
            {stock === null && !yaAsignado
              ? "Calcula el stock para sugerir lo que se puede asignar."
              : "Ajusta lo asignado si hace falta. No puede superar lo solicitado ni el stock."}
          </p>
          <Button onClick={handleCalcular} disabled={calculando || guardando} size="sm" variant="submit">
            {calculando ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <Scale size={14} className="mr-1.5" />}
            {stock === null ? "Calcular stock" : "Recalcular"}
          </Button>
        </div>

        <div className="border border-gray-200 rounded-xl divide-y divide-gray-100">
          {lineas.map(({ item, invalida, superaStock }) => {
            const info = stockPorCodigo.get(item.codigo_producto);
            const estado = stock ? CFG_LINEA[estadoDeLinea(item.cantidad_solicitada, info)] : null;

            return (
              <div key={item.id} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-800">{item.descripcion_producto}</p>
                  <p className="text-xs text-gray-400">
                    {item.codigo_producto} · Solicitado: <span className="text-gray-600">{item.cantidad_solicitada}</span>
                    {stock && <> · Stock: <span className="text-gray-600">{info?.encontrado_en_sap ? info.stock_disponible : "—"}</span></>}
                  </p>
                </div>
                {estado && (
                  <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border shrink-0 ${estado.clase}`}>
                    {estado.icono} {estado.texto}
                  </span>
                )}
                <div className="shrink-0">
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    value={asignadas[item.id]}
                    placeholder="Asignar"
                    disabled={stock === null && !yaAsignado}
                    onChange={(e) => setAsignadas((prev) => ({ ...prev, [item.id]: e.target.value }))}
                    className={`w-24 h-8 text-right ${invalida || superaStock ? "border-red-400" : ""}`}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {lineas.some((l) => l.superaStock) && <p className="text-xs text-red-600">Hay líneas que superan el stock disponible.</p>}
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>

      <div className="px-6 py-3 border-t border-gray-100 flex justify-end gap-2 shrink-0">
        <Button onClick={onClose} disabled={guardando} variant="cancel" size="sm">
          Cancelar
        </Button>
        <Button
          onClick={handleGuardar}
          disabled={guardando || hayErrores || sinAsignar || (stock === null && !yaAsignado)}
          variant="success"
          size="sm"
        >
          {guardando && <Loader2 size={14} className="animate-spin mr-1.5" />}
          Guardar asignación
        </Button>
      </div>
    </ModalBase>
  );
}

function TarjetaDespacho({
  pedido,
  soloLectura,
  marcandoListo,
  onProcesar,
  onMarcarListo,
}: {
  pedido: PedidoEspecial;
  soloLectura: boolean;
  marcandoListo: boolean;
  onProcesar: (pedido: PedidoEspecial) => void;
  onMarcarListo: (pedido: PedidoEspecial) => void;
}) {
  const [abierta, setAbierta] = useState(false);
  const asignado = pedido.estado === "EN_PREPARACION" || pedido.estado === "LISTO_PARA_RECOGER" || pedido.estado === "ENTREGADO";

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setAbierta((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <span className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center shrink-0">
          <Store size={14} className="text-gray-500" />
        </span>
        <span className="text-sm text-gray-700 flex-1 min-w-0 truncate">{pedido.nombre_tienda}</span>
        <span className="text-xs text-gray-400 shrink-0 hidden sm:inline">{pedido.numero_pedido}</span>
        <EstadoEspecialBadge estado={pedido.estado} />
        <span className="text-xs text-gray-400 shrink-0 hidden sm:inline">{pedido.items.length} ítems</span>
        {abierta ? <ChevronUp size={15} className="text-gray-400 shrink-0" /> : <ChevronDown size={15} className="text-gray-400 shrink-0" />}
      </button>
      <AnimatePresence>
        {abierta && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden bg-white"
          >
            <div className="px-4 sm:px-6 pt-3 text-xs text-gray-500 flex flex-wrap gap-x-3 gap-y-1">
              <span>
                Pedido: <span className="font-medium text-gray-700">{pedido.numero_pedido}</span>
              </span>
              <span>
                Entrega: <span className="font-medium text-gray-700">{formatearFechaCorta(pedido.fecha_requerida)}</span>
              </span>
              {pedido.division && <span>División {pedido.division}</span>}
              <span className="sm:hidden">{pedido.items.length} ítems</span>
            </div>

            <div className="px-3 pt-3 space-y-3">
              <ComentarioPedido comentario={pedido.comentario} />

              {pedido.estado === "RECHAZADO" && (
                <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-red-700">Motivo del rechazo</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{pedido.motivo_rechazo}</p>
                </div>
              )}
            </div>

            <div className="space-y-1.5 px-3 py-3">
              <div className="space-y-1.5">
                {asignado && (
                  <div className="flex justify-end gap-6 px-3 text-[11px] uppercase tracking-wide text-gray-400">
                    <span>Solicitado</span>
                    <span>Asignado</span>
                  </div>
                )}
                {pedido.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg hover:bg-gray-50">
                    <div className="flex items-start gap-3 min-w-0">
                      <Package size={14} className="text-sky-500 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm text-gray-800">{item.descripcion_producto}</p>
                        <p className="text-xs text-gray-400">
                          {item.codigo_producto} · {item.unidad_medida}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-6 text-sm tabular-nums shrink-0">
                      <span className="text-gray-600 w-16 text-right">{item.cantidad_solicitada}</span>
                      {asignado && <span className="text-gray-800 w-16 text-right">{item.cantidad_asignada}</span>}
                    </div>
                  </div>
                ))}
              </div>

              <EntregaPlaceholder />

              {!soloLectura && (pedido.estado === "AUTORIZADO" || pedido.estado === "EN_PREPARACION") && (
                <div className="flex flex-col sm:flex-row sm:justify-end gap-2 pt-1">
                  <Button onClick={() => onProcesar(pedido)} variant="submit" size="sm" className="w-full sm:w-auto">
                    <Scale size={14} className="mr-1.5" />
                    {pedido.estado === "AUTORIZADO" ? "Calcular stock y asignar" : "Ver o editar asignación"}
                  </Button>
                  {pedido.estado === "EN_PREPARACION" && (
                    <Button onClick={() => onMarcarListo(pedido)} disabled={marcandoListo} variant="success" size="sm" className="w-full sm:w-auto">
                      {marcandoListo ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <PackageCheck size={14} className="mr-1.5" />}
                      Marcar listo para recoger
                    </Button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// division solo se usa para el texto del encabezado: el filtro real lo aplica el backend.
function PedidosEspecialesBase({ soloLectura, division }: { soloLectura: boolean; division?: "1" | "2" }) {
  const opciones = useMemo(() => opcionesEstado(soloLectura), [soloLectura]);
  const estadoInicial = soloLectura ? "todos" : "en_proceso";
  const [estadoElegido, setEstadoElegido] = useState(estadoInicial);
  // Por defecto la fecha de mañana (hoy + 1), cada vez que se carga la vista.
  const [fechaElegida, setFechaElegida] = useState(fechaManana);
  // Filtros con los que se hizo la última búsqueda: al cambiar de página se
  // usan estos, no lo que se esté editando en los campos.
  const [aplicados, setAplicados] = useState<FiltrosAplicados>({ estado: estadoInicial, fecha: "" });
  const [pedidos, setPedidos] = useState<PedidoEspecial[]>([]);
  const [paginacion, setPaginacion] = useState<Paginacion>({ page: 1, pageSize: 10, total: 0, totalPages: 1 });
  // No se busca nada hasta que se presiona Buscar.
  const [cargando, setCargando] = useState(false);
  const [yaBusco, setYaBusco] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [procesando, setProcesando] = useState<PedidoEspecial | null>(null);
  const [marcandoListoId, setMarcandoListoId] = useState<string | null>(null);

  const cargar = useCallback(async (pagina: number, filtros: FiltrosAplicados) => {
    setCargando(true);
    setError(null);

    try {
      const resultado = await getPedidosEspeciales({
        estados: opcionesEstado(soloLectura).find((o) => o.id === filtros.estado)?.estados,
        fechaDesde: filtros.fecha || undefined,
        fechaHasta: filtros.fecha || undefined,
        page: pagina,
      });

      setPedidos(resultado.pedidos);
      setPaginacion(resultado.paginacion);
      setYaBusco(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al obtener los pedidos");
    } finally {
      setCargando(false);
    }
  }, [soloLectura]);

  const handleBuscar = () => {
    const filtros = { estado: estadoElegido, fecha: fechaElegida };
    setAplicados(filtros);
    cargar(1, filtros);
  };

  const handleMarcarListo = async (pedido: PedidoEspecial) => {
    setMarcandoListoId(pedido.id);
    setError(null);

    try {
      await marcarPedidoEspecialListo(pedido.id);
      setAviso(`Pedido ${pedido.numero_pedido} marcado como listo para recoger.`);
      await cargar(paginacion.page, aplicados);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo marcar el pedido");
    } finally {
      setMarcandoListoId(null);
    }
  };

  return (
    <div className="py-4 sm:py-6 lg:py-2 px-2 sm:px-4">
      <div className="mb-6 bg-gradient-to-r from-[#2183AE] to-[#1a6a8f] rounded-2xl shadow-lg p-6 text-white">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm shrink-0">
            <Star className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-white text-lg font-semibold leading-tight">Pedidos Especiales</h2>
            <p className="text-sm text-white/90 mt-0.5">
              {soloLectura
                ? `Pedidos especiales de las tiendas de tu división${division ? ` (División ${division})` : ""}`
                : "Procesa cada pedido por separado: calcula el stock, asigna y avisa cuando esté listo para recoger"}
            </p>
          </div>
        </div>
      </div>

      {aviso && <BannerMensaje tipo="ok" texto={aviso} onCerrar={() => setAviso(null)} />}

      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-5">
        <h3 className="text-sm font-medium text-gray-800 mb-4 flex items-center gap-1.5">
          <Search size={15} className="text-gray-400" /> Elige los pedidos a consultar
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div className="sm:col-span-2">
            <Label className="text-xs text-gray-700 mb-1.5 block">Estado</Label>
            <select
              value={estadoElegido}
              onChange={(e) => setEstadoElegido(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2183AE] focus:border-transparent"
            >
              {opciones.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs text-gray-700 mb-1.5 block">Fecha requerida</Label>
            <Input type="date" value={fechaElegida} onChange={(e) => setFechaElegida(e.target.value)} className="h-9 text-xs" />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Button onClick={handleBuscar} disabled={cargando || !fechaElegida} variant="submit" size="sm">
            {cargando ? <Loader2 size={14} className="animate-spin mr-1.5" /> : null}
            Buscar
          </Button>
        </div>

        {error && (
          <p className="text-xs text-red-600 mb-3 flex items-center gap-1">
            <AlertCircle size={12} /> {error}
          </p>
        )}

        {cargando ? (
          <div className="flex items-center justify-center gap-2 text-sm text-gray-400 py-8">
            <Loader2 size={18} className="animate-spin" /> Cargando pedidos…
          </div>
        ) : !yaBusco ? (
          <p className="text-xs text-gray-400">Presiona Buscar para ver los pedidos.</p>
        ) : pedidos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center border border-gray-100 rounded-xl">
            <Inbox size={22} className="text-gray-300 mb-2" />
            <p className="text-sm text-gray-400">No hay pedidos especiales con esos filtros.</p>
          </div>
        ) : (
          <div className="mb-2">
            <p className="text-xs text-gray-400 mb-2">
              {paginacion.total} pedido{paginacion.total !== 1 ? "s" : ""} encontrado{paginacion.total !== 1 ? "s" : ""}
            </p>
            <div className="space-y-2">
              {pedidos.map((pedido) => (
                <TarjetaDespacho
                  key={pedido.id}
                  pedido={pedido}
                  soloLectura={soloLectura}
                  marcandoListo={marcandoListoId === pedido.id}
                  onProcesar={setProcesando}
                  onMarcarListo={handleMarcarListo}
                />
              ))}
            </div>
          </div>
        )}

        <ControlesPaginacion
          paginacion={paginacion}
          cargando={cargando}
          onCambiar={(pagina) => cargar(pagina, aplicados)}
        />
      </div>

      {procesando && (
        <ProcesarPedidoModal
          pedido={procesando}
          onClose={() => setProcesando(null)}
          onGuardado={async (actualizado) => {
            setProcesando(null);
            setAviso(`Asignación guardada: el pedido ${actualizado.numero_pedido} quedó en preparación.`);
            await cargar(paginacion.page, aplicados);
          }}
        />
      )}
    </div>
  );
}

// Según el nivel_permiso del menú: 'escritura' despacha (procesa, asigna y
// marca listo); 'lectura_division' (asistente de división) solo ve los
// pedidos de las tiendas de su división.
export function PedidosEspecialesView() {
  const [nivelPermiso, setNivelPermiso] = useState<NivelPermisoMenu>("escritura");
  const [division, setDivision] = useState<"1" | "2" | undefined>(undefined);
  const [cargandoPermiso, setCargandoPermiso] = useState(true);
  const [errorDivision, setErrorDivision] = useState<string | null>(null);

  useEffect(() => {
    getAllMenus()
      .then(async (menus) => {
        const nivel = menus.find((m) => m.nombre_menu === "PedidosEspecialesView")?.nivel_permiso || "escritura";
        setNivelPermiso(nivel);

        if (nivel === "lectura_division") {
          const { division: miDivision } = await getMiDivision();
          if (miDivision === 1 || miDivision === 2) setDivision(String(miDivision) as "1" | "2");
          else setErrorDivision("Tu usuario no tiene una división asignada.");
        }
      })
      .catch(() => setNivelPermiso("escritura"))
      .finally(() => setCargandoPermiso(false));
  }, []);

  if (cargandoPermiso) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 text-[#2183AE] animate-spin" />
      </div>
    );
  }

  if (errorDivision) {
    return (
      <div className="py-6 px-4">
        <BannerMensaje tipo="error" texto={errorDivision} />
      </div>
    );
  }

  return <PedidosEspecialesBase soloLectura={nivelPermiso !== "escritura"} division={division} />;
}
