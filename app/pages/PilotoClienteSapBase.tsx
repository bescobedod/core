"use client";

import { useEffect, useMemo, useState } from "react";
import { UserCog, Search, Loader2, AlertCircle, CheckCircle2, Pencil, RefreshCw } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { getPilotos, asignarClienteSap, buscarClientesSap } from "../api/PilotoClienteSapApi";
import { PilotoConClienteSap, ClienteSap } from "../types/PilotoClienteSapModel";
import { TipoRuta } from "../types/CamionRutaModel";

interface PilotoClienteSapBaseProps {
  tipoRuta: TipoRuta;
  titulo: string;
  subtitulo: string;
}

type FiltroCliente = "todos" | "sin" | "con";

function normalizar(texto: string) {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

// Componente base compartido por las vistas de Pollo e Insumos — cada una
// consulta un SAP distinto (AVIGUA vs. la base fija de insumos), por eso el
// código de cliente de un mismo piloto se guarda por separado para cada tipo.
// Al abrir lista TODOS los pilotos con su cliente asignado (o "sin cliente");
// el filtro por nombre/código y por estado se hace en pantalla.
export function PilotoClienteSapBase({ tipoRuta, titulo, subtitulo }: PilotoClienteSapBaseProps) {
  const [pilotos, setPilotos] = useState<PilotoConClienteSap[]>([]);
  const [cargandoPilotos, setCargandoPilotos] = useState(true);
  const [errorPilotos, setErrorPilotos] = useState<string | null>(null);
  const [filtroTexto, setFiltroTexto] = useState("");
  const [filtroCliente, setFiltroCliente] = useState<FiltroCliente>("todos");

  const [editandoPilotoId, setEditandoPilotoId] = useState<number | null>(null);
  const [busquedaCliente, setBusquedaCliente] = useState("");
  const [resultadosCliente, setResultadosCliente] = useState<ClienteSap[]>([]);
  // Texto de la última búsqueda en SAP que terminó bien (para el mensaje
  // "No se encontraron clientes"); null = todavía no se buscó.
  const [clienteBuscado, setClienteBuscado] = useState<string | null>(null);
  const [buscandoCliente, setBuscandoCliente] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorFila, setErrorFila] = useState<string | null>(null);

  const cargarPilotos = async () => {
    setCargandoPilotos(true);
    setErrorPilotos(null);

    try {
      setPilotos(await getPilotos(tipoRuta));
    } catch (err) {
      setErrorPilotos(err instanceof Error ? err.message : "Error al obtener los pilotos");
    } finally {
      setCargandoPilotos(false);
    }
  };

  useEffect(() => {
    cargarPilotos();
  }, [tipoRuta]);

  const conCliente = pilotos.filter((p) => !!p.card_code).length;
  const sinCliente = pilotos.length - conCliente;

  const pilotosVisibles = useMemo(() => {
    const termino = normalizar(filtroTexto.trim());

    return pilotos.filter((p) => {
      if (filtroCliente === "con" && !p.card_code) return false;
      if (filtroCliente === "sin" && p.card_code) return false;
      if (!termino) return true;

      return normalizar(`${p.nombre || ""} ${p.codigo_user || ""} ${p.card_code || ""} ${p.card_name || ""}`).includes(termino);
    });
  }, [pilotos, filtroTexto, filtroCliente]);

  const abrirEdicion = (pilotoId: number) => {
    setEditandoPilotoId(pilotoId);
    setBusquedaCliente("");
    setResultadosCliente([]);
    setClienteBuscado(null);
    setErrorFila(null);
  };

  const cerrarEdicion = () => {
    setEditandoPilotoId(null);
    setBusquedaCliente("");
    setResultadosCliente([]);
    setClienteBuscado(null);
    setErrorFila(null);
  };

  const handleBuscarCliente = async () => {
    const texto = busquedaCliente.trim();
    if (texto.length < 2) return;

    setBuscandoCliente(true);
    setErrorFila(null);
    setClienteBuscado(null);

    try {
      const data = await buscarClientesSap(tipoRuta, texto);
      setResultadosCliente(data);
      setClienteBuscado(texto);
    } catch (err) {
      setResultadosCliente([]);
      setErrorFila(err instanceof Error ? err.message : "Error al buscar clientes en SAP");
    } finally {
      setBuscandoCliente(false);
    }
  };

  const handleAsignar = async (pilotoId: number, cliente: ClienteSap) => {
    setGuardando(true);
    setErrorFila(null);

    try {
      await asignarClienteSap(pilotoId, tipoRuta, cliente.CardCode, cliente.CardName);
      setPilotos((prev) =>
        prev.map((p) =>
          p.piloto_id === pilotoId ? { ...p, card_code: cliente.CardCode, card_name: cliente.CardName } : p
        )
      );
      cerrarEdicion();
    } catch (err) {
      setErrorFila(err instanceof Error ? err.message : "Error al asignar el cliente SAP");
    } finally {
      setGuardando(false);
    }
  };

  const FILTROS: { valor: FiltroCliente; etiqueta: string; total: number }[] = [
    { valor: "todos", etiqueta: "Todos", total: pilotos.length },
    { valor: "sin", etiqueta: "Sin cliente", total: sinCliente },
    { valor: "con", etiqueta: "Con cliente", total: conCliente },
  ];

  return (
    <div className="py-4 sm:py-6 lg:py-2 px-2 sm:px-4">
      <div className="mb-6 bg-gradient-to-r from-[#2183AE] to-[#1a6a8f] rounded-2xl shadow-lg p-6 text-white">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm shrink-0">
            <UserCog className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-white text-lg font-semibold leading-tight">{titulo}</h2>
            <p className="text-sm text-white/90 mt-0.5">{subtitulo}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <Input
            placeholder="Filtrar por nombre, código de empleado o cliente SAP…"
            value={filtroTexto}
            onChange={(e) => setFiltroTexto(e.target.value)}
            className="flex-1"
          />
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit shrink-0">
            {FILTROS.map((f) => (
              <button
                key={f.valor}
                type="button"
                onClick={() => setFiltroCliente(f.valor)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  filtroCliente === f.valor ? "bg-white text-[#2183AE] shadow-sm" : "text-gray-600 hover:text-gray-800"
                }`}
              >
                {f.etiqueta} ({f.total})
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={cargarPilotos} disabled={cargandoPilotos} className="shrink-0" title="Volver a cargar">
            <RefreshCw size={13} className={cargandoPilotos ? "animate-spin" : ""} />
          </Button>
        </div>

        {errorPilotos && (
          <p className="text-xs text-red-600 mt-2 flex items-center gap-1.5">
            <AlertCircle size={13} className="shrink-0" /> {errorPilotos}
          </p>
        )}

        <div className="mt-4">
          {cargandoPilotos ? (
            <div className="flex items-center justify-center gap-2 text-sm text-gray-400 py-10">
              <Loader2 size={18} className="animate-spin" /> Cargando pilotos…
            </div>
          ) : pilotos.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">No hay pilotos registrados (usuarios de PioApp con rol de piloto).</p>
          ) : pilotosVisibles.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">Ningún piloto coincide con el filtro.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {pilotosVisibles.map((p) => (
                <div key={p.piloto_id} className="py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm text-gray-800 truncate">{p.nombre || p.codigo_user}</p>
                      <p className="text-xs text-gray-400 truncate">{p.codigo_user}{p.email_office ? ` · ${p.email_office}` : ""}</p>
                      {p.card_code ? (
                        <p className="text-xs text-green-700 mt-1 flex items-center gap-1">
                          <CheckCircle2 size={12} className="shrink-0" />
                          <span className="truncate">Cliente SAP: <span className="font-mono">{p.card_code}</span> — {p.card_name}</span>
                        </p>
                      ) : (
                        <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                          <AlertCircle size={12} className="shrink-0" /> Sin cliente SAP asignado
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => (editandoPilotoId === p.piloto_id ? cerrarEdicion() : abrirEdicion(p.piloto_id))}
                      className="shrink-0"
                    >
                      <Pencil size={13} className="mr-1" /> {p.card_code ? "Cambiar" : "Asignar"}
                    </Button>
                  </div>

                  {editandoPilotoId === p.piloto_id && (
                    <div className="mt-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Buscar cliente en SAP por nombre…"
                          value={busquedaCliente}
                          onChange={(e) => setBusquedaCliente(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleBuscarCliente()}
                          className="h-8 text-xs flex-1"
                        />
                        <Button size="sm" onClick={handleBuscarCliente} disabled={buscandoCliente || busquedaCliente.trim().length < 2}>
                          {buscandoCliente ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
                        </Button>
                      </div>

                      {errorFila && (
                        <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
                          <AlertCircle size={12} className="shrink-0" /> {errorFila}
                        </p>
                      )}

                      {clienteBuscado !== null && resultadosCliente.length === 0 && !errorFila && (
                        <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                          <AlertCircle size={12} className="shrink-0" />
                          No se encontraron clientes en SAP con el nombre "{clienteBuscado}".
                        </p>
                      )}

                      {resultadosCliente.length > 0 && (
                        <div className="mt-2 border border-gray-200 rounded-lg divide-y divide-gray-50 max-h-52 overflow-y-auto bg-white">
                          {resultadosCliente.map((c) => (
                            <button
                              key={c.CardCode}
                              onClick={() => handleAsignar(p.piloto_id, c)}
                              disabled={guardando}
                              className="w-full text-left px-3 py-2 flex items-center justify-between gap-2 hover:bg-gray-50 transition-colors disabled:opacity-50"
                            >
                              <div className="min-w-0">
                                <p className="text-xs text-gray-700 truncate">{c.CardName}</p>
                                <p className="text-[11px] text-gray-400 font-mono">{c.CardCode}</p>
                              </div>
                              {guardando && <Loader2 size={13} className="animate-spin shrink-0" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
