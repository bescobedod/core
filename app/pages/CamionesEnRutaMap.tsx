"use client";

import { useEffect } from "react";
import { APIProvider, Map, AdvancedMarker, useMap } from "@vis.gl/react-google-maps";
import { CamionEnRuta } from "../types/CamionRutaModel";

const COLOR_POLLO = "#2183AE";
const COLOR_INSUMOS = "#c2410c";
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

// AdvancedMarker necesita un Map ID para poder mostrar contenido HTML
// personalizado. "DEMO_MAP_ID" es el ID de prueba que Google documenta para
// esto — funciona sin configurar nada en Cloud Console. Para producción se
// puede crear un Map ID propio (gratis) si se quiere personalizar el estilo
// del mapa además de los marcadores.
const MAP_ID = "DEMO_MAP_ID";

function IconoCamion({
  tipo,
  tieneInventario,
  resaltado,
}: {
  tipo: CamionEnRuta["tipo_ruta"];
  tieneInventario: boolean;
  resaltado: boolean;
}) {
  const color = tipo === "POLLO" ? COLOR_POLLO : COLOR_INSUMOS;
  const anillo = tieneInventario ? "#f59e0b" : "#94a3b8";
  const tamano = resaltado ? 40 : 34;

  return (
    <div style={{ position: "relative", width: tamano, height: tamano }}>
      {resaltado && <span className="camion-en-ruta-pulso" />}
      <div
        style={{
          position: "relative",
          width: tamano,
          height: tamano,
          borderRadius: 9999,
          background: color,
          border: `3px solid ${anillo}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 2px 6px rgba(0,0,0,0.35)",
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M1 3h15v13H1z" />
          <path d="M16 8h4l3 3v5h-7V8z" />
          <circle cx="5.5" cy="18.5" r="2.5" />
          <circle cx="18.5" cy="18.5" r="2.5" />
        </svg>
      </div>
    </div>
  );
}

// Cuando se resalta un camión desde el listado, centra y acerca el mapa
// hacia su posición.
function VolarHaciaResaltado({ camiones, highlightedId }: { camiones: CamionEnRuta[]; highlightedId: string | null }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !highlightedId) return;

    const camion = camiones.find((c) => c.id === highlightedId);
    if (!camion || camion.piloto.lat === null || camion.piloto.lng === null) return;

    map.panTo({ lat: camion.piloto.lat, lng: camion.piloto.lng });
    if ((map.getZoom() ?? 0) < 12) map.setZoom(12);
  }, [highlightedId, camiones, map]);

  return null;
}

interface CamionesEnRutaMapProps {
  camiones: CamionEnRuta[];
  onSelectCamion: (id: string) => void;
  highlightedId?: string | null;
}

export default function CamionesEnRutaMap({ camiones, onSelectCamion, highlightedId = null }: CamionesEnRutaMapProps) {
  const centro = { lat: 14.7, lng: -90.6 };

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div className="h-full w-full flex items-center justify-center text-sm text-red-500 text-center px-6">
        Falta configurar la variable de entorno NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.
      </div>
    );
  }

  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
      <Map
        defaultCenter={centro}
        defaultZoom={8}
        mapId={MAP_ID}
        gestureHandling="greedy"
        disableDefaultUI={false}
        style={{ width: "100%", height: "100%" }}
      >
        <VolarHaciaResaltado camiones={camiones} highlightedId={highlightedId} />
        {camiones
          // Sin lat/lng no hay dónde poner el marcador — esos camiones solo
          // aparecen en el listado de la izquierda (con el botón de "sin posición").
          .filter((camion) => camion.piloto.lat !== null && camion.piloto.lng !== null)
          .map((camion) => {
            const tieneInventario = camion.inventario.some((p) => p.cantidad > 0);

            return (
              <AdvancedMarker
                key={camion.id}
                position={{ lat: camion.piloto.lat as number, lng: camion.piloto.lng as number }}
                onClick={() => onSelectCamion(camion.id)}
              >
                <IconoCamion
                  tipo={camion.tipo_ruta}
                  tieneInventario={tieneInventario}
                  resaltado={camion.id === highlightedId}
                />
              </AdvancedMarker>
            );
          })}
      </Map>
    </APIProvider>
  );
}
