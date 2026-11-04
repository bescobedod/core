"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Egg,
  Search,
  Plus,
  Minus,
  Loader2,
  Eraser,
  ChevronDown,
  ChevronUp,
  Package,
  MapPin,
  User,
  Inbox,
  Trash2,
  UserPlus,
  Truck,
  CreditCard,
  CheckCircle2,
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Combobox } from "../ui/combobox";
import { getAllMenus } from "../api/MenuApi";
import { getRutasPollo, getTiendasDeRuta } from "../api/RutaPolloApi";
import {
  buscarClientesAvicola,
  crearClienteAvicola,
  crearPedidoArtesano,
  getPedidosArtesano,
  getProductosArtesano,
  getUsuariosArtesano,
} from "../api/PedidoEspecialApi";
import {
  ClienteAvicola,
  CondicionPagoArtesano,
  Paginacion,
  PedidoArtesano,
  ProductoArtesano,
  UsuarioArtesano,
} from "../types/PedidoEspecialModel";
import { RutaPollo, TiendaRutaPollo } from "../types/RutaPolloModel";
import { MUELLES_POLLO } from "./ReporteParametrosModal";
import { BannerMensaje, ControlesPaginacion, EntregaPlaceholder, ModalBase, formatearFechaCorta } from "./PedidoEspecialComun";

function hoy(): string {
  return new Date().toISOString().slice(0, 10);
}

function nombreMuelle(whsCode: string): string {
  return MUELLES_POLLO.find((m) => m.whs_code === whsCode)?.nombre ?? whsCode;
}

// Mismo formato de chip que EstadoPedidoBadge de las vistas de pedidos.
function EtiquetaPago({ pedido }: { pedido: PedidoArtesano }) {
  return pedido.condicion_pago === "PAGADO" ? (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border bg-green-50 text-green-700 border-green-200 whitespace-nowrap shrink-0">
      <CheckCircle2 size={12} /> Pagado
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-200 whitespace-nowrap shrink-0">
      <CreditCard size={12} /> Al crédito
    </span>
  );
}

function TarjetaArtesano({ pedido }: { pedido: PedidoArtesano }) {
  const [abierta, setAbierta] = useState(false);

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setAbierta((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <span className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center shrink-0">
          <User size={14} className="text-gray-500" />
        </span>
        <span className="text-sm text-gray-700 flex-1 min-w-0 truncate">{pedido.cliente_nombre}</span>
        <span className="text-xs text-gray-400 shrink-0 hidden sm:inline">{pedido.numero_pedido}</span>
        <EtiquetaPago pedido={pedido} />
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
              <span>{pedido.nombre_ruta}</span>
              {pedido.condicion_pago === "PAGADO" && pedido.numero_boleta && <span>Boleta {pedido.numero_boleta}</span>}
              <span className="sm:hidden">{pedido.items.length} ítems</span>
            </div>

            <div className="px-4 py-3 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div>
                  <p className="text-xs text-gray-400">Dirección de entrega</p>
                  <p className="text-gray-800 flex items-start gap-1.5">
                    <MapPin size={13} className="text-[#2183AE] mt-1 shrink-0" /> {pedido.direccion_entrega}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Cliente</p>
                  <p className="text-gray-800">{pedido.cliente_nombre}</p>
                  {pedido.cliente_nit && <p className="text-xs text-gray-400">NIT {pedido.cliente_nit}</p>}
                </div>
                <div>
                  <p className="text-xs text-gray-400">Ruta</p>
                  <p className="text-gray-800">{pedido.nombre_ruta}</p>
                  {pedido.nombre_tienda_referencia && (
                    <p className="text-xs text-gray-400">Tienda de referencia: {pedido.nombre_tienda_referencia}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-400">Creado por</p>
                  <p className="text-gray-800">{pedido.creado_por}</p>
                  <p className="text-xs text-gray-400">{formatearFechaCorta(pedido.creado_en)}</p>
                </div>
              </div>

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
                        <p className="text-xs text-gray-400">
                          {item.codigo_producto} · {item.unidad_medida}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 tabular-nums shrink-0">{item.cantidad}</p>
                  </div>
                ))}
              </div>

              <EntregaPlaceholder />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NuevoClienteModal({
  onCreado,
  onClose,
}: {
  onCreado: (cliente: ClienteAvicola) => void;
  onClose: () => void;
}) {
  const [nombre, setNombre] = useState("");
  const [nit, setNit] = useState("");
  const [direccion, setDireccion] = useState("");
  const [direccionFisica, setDireccionFisica] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const incompleto = nombre.trim() === "" || direccionFisica.trim() === "";

  const handleGuardar = async () => {
    setGuardando(true);
    setError(null);

    try {
      onCreado(
        await crearClienteAvicola({
          nombre: nombre.trim(),
          nit: nit.trim() || null,
          direccion: direccion.trim() || null,
          direccion_fisica: direccionFisica.trim(),
        })
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el cliente");
      setGuardando(false);
    }
  };

  return (
    <ModalBase titulo="Nuevo cliente" deshabilitarCierre={guardando} onClose={onClose}>
      <div className="px-6 py-5 space-y-3 overflow-y-auto min-h-0">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Nombre *</label>
          <Input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={250} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">NIT</label>
          <Input value={nit} onChange={(e) => setNit(e.target.value)} maxLength={20} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Dirección</label>
          <Input value={direccion} onChange={(e) => setDireccion(e.target.value)} maxLength={250} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Dirección física de entrega *</label>
          <Input value={direccionFisica} onChange={(e) => setDireccionFisica(e.target.value)} maxLength={250} />
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
      <div className="px-6 py-3 border-t border-gray-100 flex justify-end gap-2 shrink-0">
        <Button onClick={onClose} disabled={guardando} variant="cancel" size="sm">
          Cancelar
        </Button>
        <Button onClick={handleGuardar} disabled={guardando || incompleto} variant="submit" size="sm">
          {guardando && <Loader2 size={14} className="animate-spin mr-1.5" />}
          Guardar cliente
        </Button>
      </div>
    </ModalBase>
  );
}

function BuscarPedidos() {
  const [usuarios, setUsuarios] = useState<UsuarioArtesano[]>([]);
  const [usuario, setUsuario] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  // Filtros con los que se hizo la última búsqueda: al cambiar de página se
  // usan estos, no lo que se esté editando en los campos.
  const [aplicados, setAplicados] = useState({ usuario: "", fechaDesde: "", fechaHasta: "" });
  const [pedidos, setPedidos] = useState<PedidoArtesano[]>([]);
  const [paginacion, setPaginacion] = useState<Paginacion>({ page: 1, pageSize: 10, total: 0, totalPages: 1 });
  const [buscando, setBuscando] = useState(false);
  const [yaBusco, setYaBusco] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fechasInvertidas = fechaDesde !== "" && fechaHasta !== "" && fechaDesde > fechaHasta;

  useEffect(() => {
    getUsuariosArtesano()
      .then(setUsuarios)
      .catch(() => setUsuarios([]));
  }, []);

  const buscar = async (pagina: number, filtros: { usuario: string; fechaDesde: string; fechaHasta: string }) => {
    setBuscando(true);
    setError(null);

    try {
      const resultado = await getPedidosArtesano({
        id_usuario: filtros.usuario || undefined,
        fechaDesde: filtros.fechaDesde || undefined,
        fechaHasta: filtros.fechaHasta || undefined,
        page: pagina,
      });

      setPedidos(resultado.pedidos);
      setPaginacion(resultado.paginacion);
      setYaBusco(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al buscar los pedidos");
    } finally {
      setBuscando(false);
    }
  };

  const handleBuscar = () => {
    const filtros = { usuario, fechaDesde, fechaHasta };
    setAplicados(filtros);
    buscar(1, filtros);
  };

  const handleLimpiar = () => {
    setUsuario("");
    setFechaDesde("");
    setFechaHasta("");
    setPedidos([]);
    setPaginacion({ page: 1, pageSize: 10, total: 0, totalPages: 1 });
    setYaBusco(false);
    setError(null);
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Usuario</label>
            <select
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-[#2183AE] focus:border-transparent"
            >
              <option value="">Todos los usuarios</option>
              {usuarios.map((u) => (
                <option key={u.id_usuario} value={u.id_usuario}>
                  {u.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Requerido desde</label>
            <Input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Requerido hasta</label>
            <Input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} />
          </div>
        </div>
        {fechasInvertidas && <p className="text-xs text-red-600 mt-2">La fecha inicial no puede ser mayor que la final.</p>}

        <div className="flex gap-2 mt-3">
          <Button onClick={handleBuscar} disabled={buscando || fechasInvertidas} size="sm" variant="submit">
            {buscando ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <Search size={14} className="mr-1.5" />}
            Buscar
          </Button>
          <Button onClick={handleLimpiar} disabled={buscando} size="sm" variant="outline">
            <Eraser size={14} className="mr-1.5" />
            Limpiar
          </Button>
        </div>
      </div>

      {error && <BannerMensaje tipo="error" texto={error} />}

      {!yaBusco && !buscando && !error && (
        <div className="flex flex-col items-center justify-center py-14 text-center">
          <Egg size={24} className="text-gray-300 mb-2" />
          <p className="text-sm text-gray-400">Define los filtros y presiona Buscar para ver los pedidos.</p>
        </div>
      )}

      {yaBusco && pedidos.length === 0 && (
        <div className="flex flex-col items-center justify-center py-14 text-center">
          <Inbox size={24} className="text-gray-300 mb-2" />
          <p className="text-sm text-gray-400">No se encontraron pedidos con esos filtros.</p>
        </div>
      )}

      {pedidos.length > 0 && (
        <div className="space-y-2.5">
          {pedidos.map((pedido) => (
            <TarjetaArtesano key={pedido.id} pedido={pedido} />
          ))}
        </div>
      )}

      <ControlesPaginacion
        paginacion={paginacion}
        cargando={buscando}
        onCambiar={(pagina) => buscar(pagina, aplicados)}
      />
    </>
  );
}

interface LineaPedido {
  codigo_producto: string;
  cantidad: string;
}

function EncabezadoSeccion({ icono, titulo, subtitulo }: { icono: ReactNode; titulo: string; subtitulo: string }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <div className="w-10 h-10 rounded-xl bg-[#2183AE] flex items-center justify-center shadow-md shrink-0">{icono}</div>
      <div>
        <h3 className="text-sm font-bold text-gray-900">{titulo}</h3>
        <p className="text-xs text-gray-600">{subtitulo}</p>
      </div>
    </div>
  );
}

function NuevoPedido({ onCreado }: { onCreado: (mensaje: string) => void }) {
  const [rutas, setRutas] = useState<RutaPollo[]>([]);
  // Tiendas asignadas a la ruta elegida (tbl_tiendas_rutas_pollo, asignación vigente).
  const [tiendasRuta, setTiendasRuta] = useState<TiendaRutaPollo[]>([]);
  const [cargandoTiendas, setCargandoTiendas] = useState(false);
  const [errorTiendas, setErrorTiendas] = useState<string | null>(null);
  const [clientes, setClientes] = useState<ClienteAvicola[]>([]);
  const [productos, setProductos] = useState<ProductoArtesano[]>([]);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [errorDatos, setErrorDatos] = useState<string | null>(null);

  const [fechaRequerida, setFechaRequerida] = useState("");
  const [rutaId, setRutaId] = useState("");
  const [tiendaId, setTiendaId] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [direccionFisica, setDireccionFisica] = useState("");
  const [lineas, setLineas] = useState<LineaPedido[]>([]);
  const [condicionPago, setCondicionPago] = useState<CondicionPagoArtesano>("PAGADO");
  const [numeroBoleta, setNumeroBoleta] = useState("");
  const [comentario, setComentario] = useState("");
  const [mostrarNuevoCliente, setMostrarNuevoCliente] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getRutasPollo(), buscarClientesAvicola(""), getProductosArtesano()])
      .then(([listaRutas, listaClientes, listaProductos]) => {
        setRutas(listaRutas.filter((r) => r.activo));
        setClientes(listaClientes);
        setProductos(listaProductos);
        // Hoy solo hay un código de artesano: la línea ya viene lista.
        if (listaProductos.length === 1) setLineas([{ codigo_producto: listaProductos[0].codigo_producto, cantidad: "1" }]);
      })
      .catch((err) => setErrorDatos(err instanceof Error ? err.message : "Error al cargar los datos del formulario"))
      .finally(() => setCargandoDatos(false));
  }, []);

  const opcionesRutas = useMemo(
    () => rutas.map((r) => ({ id: r.id, name: `${r.nombre_ruta} · ${nombreMuelle(r.whs_code_origen)}` })),
    [rutas]
  );

  // Al cambiar de ruta se cargan sus tiendas; se ignora la respuesta si mientras
  // tanto se eligió otra ruta.
  useEffect(() => {
    setTiendaId("");
    setTiendasRuta([]);
    setErrorTiendas(null);

    if (!rutaId) return;

    let vigente = true;
    setCargandoTiendas(true);

    getTiendasDeRuta(rutaId)
      .then((lista) => {
        if (vigente) setTiendasRuta(lista);
      })
      .catch((err) => {
        if (vigente) setErrorTiendas(err instanceof Error ? err.message : "Error al cargar las tiendas de la ruta");
      })
      .finally(() => {
        if (vigente) setCargandoTiendas(false);
      });

    return () => {
      vigente = false;
    };
  }, [rutaId]);

  const opcionesTiendas = useMemo(
    () =>
      tiendasRuta.map((t) => ({
        id: t.id_tienda_simphony,
        name: t.nombre_tienda || t.codigo_tienda || t.id_tienda_simphony,
      })),
    [tiendasRuta]
  );

  const opcionesClientes = useMemo(
    () => clientes.map((c) => ({ id: c.id, name: c.nit ? `${c.nombre} · ${c.nit}` : c.nombre })),
    [clientes]
  );

  const cliente = clientes.find((c) => c.id === clienteId) ?? null;
  const productosDisponibles = productos.filter((p) => !lineas.some((l) => l.codigo_producto === p.codigo_producto));

  const seleccionarCliente = (id: string) => {
    setClienteId(id);
    setDireccionFisica(clientes.find((c) => c.id === id)?.direccion_fisica ?? "");
  };

  const actualizarLinea = (indice: number, cambios: Partial<LineaPedido>) => {
    setLineas((prev) => prev.map((l, i) => (i === indice ? { ...l, ...cambios } : l)));
  };

  const problemas: string[] = [];
  if (!fechaRequerida) problemas.push("Elige la fecha requerida.");
  else if (fechaRequerida < hoy()) problemas.push("La fecha requerida no puede ser anterior a hoy.");
  if (!rutaId) problemas.push("Elige la ruta.");
  if (!clienteId) problemas.push("Elige el cliente.");
  else if (direccionFisica.trim() === "") problemas.push("El cliente necesita una dirección física de entrega.");
  if (lineas.length === 0 || lineas.some((l) => !(Number(l.cantidad) > 0))) problemas.push("Cada producto necesita una cantidad mayor a 0.");
  if (condicionPago === "PAGADO" && numeroBoleta.trim() === "") problemas.push("Indica el número de boleta de pago.");

  const handleCrear = async () => {
    setEnviando(true);
    setErrorEnvio(null);

    try {
      const pedido = await crearPedidoArtesano({
        fecha_requerida: fechaRequerida,
        ruta_id: rutaId,
        id_tienda_simphony_referencia: tiendaId || null,
        cliente_id: clienteId,
        direccion_fisica: direccionFisica.trim(),
        condicion_pago: condicionPago,
        numero_boleta: condicionPago === "PAGADO" ? numeroBoleta.trim() : null,
        comentario: comentario.trim() || null,
        items: lineas.map((l) => ({ codigo_producto: l.codigo_producto, cantidad: Number(l.cantidad) })),
      });

      // Recarga los clientes: la dirección física capturada quedó guardada en el cliente.
      setClientes(await buscarClientesAvicola(""));
      setFechaRequerida("");
      setRutaId("");
      setTiendaId("");
      setClienteId("");
      setDireccionFisica("");
      setLineas(productos.length === 1 ? [{ codigo_producto: productos[0].codigo_producto, cantidad: "1" }] : []);
      setCondicionPago("PAGADO");
      setNumeroBoleta("");
      setComentario("");
      onCreado(`Pedido ${pedido.numero_pedido} creado para ${pedido.cliente_nombre}.`);
    } catch (err) {
      setErrorEnvio(err instanceof Error ? err.message : "No se pudo crear el pedido");
    } finally {
      setEnviando(false);
    }
  };

  if (cargandoDatos) {
    return (
      <div className="flex items-center justify-center gap-2 text-sm text-gray-400 py-14">
        <Loader2 size={18} className="animate-spin" /> Cargando formulario…
      </div>
    );
  }

  if (errorDatos) return <BannerMensaje tipo="error" texto={errorDatos} />;

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4 sm:p-6">
      <div className="mb-6">
        <EncabezadoSeccion icono={<Truck className="h-5 w-5 text-white" />} titulo="Datos del pedido" subtitulo="Fecha requerida y ruta por la que sale" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-gray-700 mb-1.5 block">Fecha Requerida *</Label>
            <Input type="date" min={hoy()} value={fechaRequerida} onChange={(e) => setFechaRequerida(e.target.value)} className="h-11" />
          </div>
          <div>
            <Label className="text-xs text-gray-700 mb-1.5 block">Ruta *</Label>
            <Combobox
              options={opcionesRutas}
              value={rutaId}
              onChange={setRutaId}
              placeholder="Seleccione una ruta"
              searchPlaceholder="Buscar ruta por nombre..."
              emptyMessage="No se encontraron rutas"
              className="h-11"
            />
          </div>
          <div className="sm:col-span-2">
            <div className="flex items-center justify-between mb-1.5">
              <Label className="text-xs text-gray-700 block">Tienda de referencia (solo para saber la ruta, no es la entrega)</Label>
              {tiendaId && (
                <button type="button" onClick={() => setTiendaId("")} className="text-[11px] text-[#2183AE] hover:underline">
                  Quitar
                </button>
              )}
            </div>
            <Combobox
              options={opcionesTiendas}
              value={tiendaId}
              onChange={setTiendaId}
              disabled={!rutaId || cargandoTiendas}
              placeholder={
                !rutaId
                  ? "Primero selecciona una ruta"
                  : cargandoTiendas
                    ? "Cargando tiendas..."
                    : opcionesTiendas.length === 0
                      ? "La ruta no tiene tiendas asignadas"
                      : "Sin tienda de referencia"
              }
              searchPlaceholder="Buscar tienda por nombre..."
              emptyMessage="No se encontraron tiendas"
              className="h-11"
            />
            {errorTiendas && <p className="text-xs text-red-600 mt-1.5">{errorTiendas}</p>}
          </div>
        </div>
      </div>

      <div className="mb-6">
        <EncabezadoSeccion icono={<User className="h-5 w-5 text-white" />} titulo="Cliente" subtitulo="A quién se le entrega el pedido y en qué dirección" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <div className="flex items-center justify-between mb-1.5">
              <Label className="text-xs text-gray-700 block">Cliente *</Label>
              <button
                type="button"
                onClick={() => setMostrarNuevoCliente(true)}
                className="text-xs text-[#2183AE] hover:underline inline-flex items-center gap-1"
              >
                <UserPlus className="h-3 w-3" /> Nuevo cliente
              </button>
            </div>
            <Combobox
              options={opcionesClientes}
              value={clienteId}
              onChange={seleccionarCliente}
              placeholder="Seleccione un cliente"
              searchPlaceholder="Buscar por nombre o NIT..."
              emptyMessage="No se encontraron clientes"
              className="h-11"
            />
          </div>

          {cliente && (
            <div className="sm:col-span-2">
              <p className="text-xs text-gray-500 mb-3">
                {cliente.nit ? `NIT ${cliente.nit}` : "Sin NIT"}
                {cliente.direccion ? ` · ${cliente.direccion}` : ""}
              </p>
              <Label className="text-xs text-gray-700 mb-1.5 block">Dirección física de entrega *</Label>
              <Input value={direccionFisica} onChange={(e) => setDireccionFisica(e.target.value)} maxLength={250} className="h-11" />
              {!cliente.direccion_fisica && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2">
                  Este cliente no tenía dirección física: se guardará la que escribas.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mb-6">
        <EncabezadoSeccion icono={<Package className="h-5 w-5 text-white" />} titulo="Productos del pedido" subtitulo="Producto y cantidad que se despacha" />
        <div className="space-y-2">
          {lineas.map((linea, indice) => {
            const producto = productos.find((p) => p.codigo_producto === linea.codigo_producto);
            const cantidad = Math.max(0, Number(linea.cantidad) || 0);

            return (
              <div key={linea.codigo_producto} className="border border-gray-200 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 break-words">{producto?.descripcion_producto ?? linea.codigo_producto}</p>
                  <p className="text-xs text-gray-500 font-mono break-words">{linea.codigo_producto}</p>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                  <div>
                    <Label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Cantidad</Label>
                    <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden w-fit">
                      <button
                        type="button"
                        onClick={() => actualizarLinea(indice, { cantidad: String(Math.max(1, cantidad - 1)) })}
                        className="w-9 h-9 flex items-center justify-center text-gray-600 hover:bg-gray-100 active:bg-gray-200 shrink-0"
                        aria-label="Disminuir cantidad"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <input
                        type="number"
                        inputMode="numeric"
                        min="1"
                        value={linea.cantidad}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => actualizarLinea(indice, { cantidad: e.target.value })}
                        className="w-14 h-9 text-center text-sm border-x border-gray-300 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button
                        type="button"
                        onClick={() => actualizarLinea(indice, { cantidad: String(cantidad + 1) })}
                        className="w-9 h-9 flex items-center justify-center text-gray-600 hover:bg-gray-100 active:bg-gray-200 shrink-0"
                        aria-label="Aumentar cantidad"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  {lineas.length > 1 && (
                    <Button
                      type="button"
                      onClick={() => setLineas((prev) => prev.filter((_, i) => i !== indice))}
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:bg-red-50 shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {productosDisponibles.length > 0 && (
          <Button
            type="button"
            onClick={() => setLineas((prev) => [...prev, { codigo_producto: productosDisponibles[0].codigo_producto, cantidad: "1" }])}
            variant="outline"
            size="sm"
            className="mt-3"
          >
            <Plus className="h-4 w-4" /> Agregar producto
          </Button>
        )}
      </div>

      <div className="mb-6">
        <EncabezadoSeccion icono={<CreditCard className="h-5 w-5 text-white" />} titulo="Pago y comentario" subtitulo="Si ya se pagó, indica la boleta" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-gray-700 mb-1.5 block">Condición de pago *</Label>
            <div className="grid grid-cols-2 gap-2">
              {(["PAGADO", "CREDITO"] as const).map((condicion) => (
                <button
                  key={condicion}
                  type="button"
                  onClick={() => setCondicionPago(condicion)}
                  className={`h-11 rounded-md border text-sm font-medium transition-colors ${
                    condicionPago === condicion
                      ? "border-[#2183AE] bg-[#2183AE] text-white shadow"
                      : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {condicion === "PAGADO" ? "Pagado" : "Al crédito"}
                </button>
              ))}
            </div>
          </div>

          <AnimatePresence initial={false}>
            {condicionPago === "PAGADO" && (
              <motion.div
                key="boleta"
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.2 }}
              >
                <Label className="text-xs text-gray-700 mb-1.5 block">Número de Boleta de Pago *</Label>
                <Input value={numeroBoleta} onChange={(e) => setNumeroBoleta(e.target.value)} maxLength={50} className="h-11" />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="sm:col-span-2">
            <Label className="text-xs text-gray-700 mb-1.5 block">Comentario</Label>
            <Textarea value={comentario} onChange={(e) => setComentario(e.target.value)} rows={3} maxLength={500} placeholder="Indicaciones de la entrega..." />
          </div>
        </div>
      </div>

      <div className="border-t pt-6">
        {problemas.length > 0 && (
          <ul className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-4 space-y-0.5 list-disc pl-8">
            {problemas.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        )}
        {errorEnvio && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">{errorEnvio}</p>}

        <Button
          onClick={handleCrear}
          disabled={enviando || problemas.length > 0}
          className="w-full border border-[#2183AE] bg-[#2183AE] text-white hover:bg-white hover:text-[#2183AE]"
        >
          {enviando ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : "Crear Pedido de Pollo Artesano"}
        </Button>
      </div>

      {mostrarNuevoCliente && (
        <NuevoClienteModal
          onClose={() => setMostrarNuevoCliente(false)}
          onCreado={(nuevo) => {
            setClientes((prev) => [...prev, nuevo]);
            setClienteId(nuevo.id);
            setDireccionFisica(nuevo.direccion_fisica ?? "");
            setMostrarNuevoCliente(false);
          }}
        />
      )}
    </div>
  );
}

export function PedidosArtesanoView() {
  const [tab, setTab] = useState<"buscar" | "crear">("buscar");
  const [aviso, setAviso] = useState<string | null>(null);
  // Crear pedidos pide el nivel 'escritura' del menú; con otro nivel solo se busca.
  const [puedeCrear, setPuedeCrear] = useState(false);

  useEffect(() => {
    getAllMenus()
      .then((menus) => {
        const propio = menus.find((m) => m.nombre_menu === "PedidosArtesanoView");
        setPuedeCrear((propio?.nivel_permiso || "escritura") === "escritura");
      })
      .catch(() => setPuedeCrear(false));
  }, []);

  return (
    <div className="py-4 sm:py-6 lg:py-8 px-2 sm:px-4">
      <div className="w-full max-w-5xl mx-auto">
        <div className="mb-6 bg-gradient-to-r from-[#2183AE] to-[#1a6a8f] rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Egg className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-white text-lg font-semibold leading-tight">Pollo Artesano</h2>
              <p className="text-sm text-white/90">Busca los pedidos realizados o crea uno nuevo para un cliente</p>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mb-6 bg-white border border-gray-200 rounded-xl p-1.5 shadow-sm w-fit">
          <button
            onClick={() => setTab("buscar")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              tab === "buscar" ? "bg-[#2183AE] text-white shadow" : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <Search className="h-4 w-4" /> Buscar Pedidos
          </button>
          {puedeCrear && (
            <button
              onClick={() => setTab("crear")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                tab === "crear" ? "bg-[#2183AE] text-white shadow" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Plus className="h-4 w-4" /> Crear Pedido
            </button>
          )}
        </div>

        {aviso && <BannerMensaje tipo="ok" texto={aviso} onCerrar={() => setAviso(null)} />}

        {tab === "crear" && puedeCrear ? (
          <NuevoPedido
            onCreado={(mensaje) => {
              setAviso(mensaje);
              setTab("buscar");
            }}
          />
        ) : (
          <BuscarPedidos />
        )}
      </div>
    </div>
  );
}
