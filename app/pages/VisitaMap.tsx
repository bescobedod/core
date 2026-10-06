"use client";

import { useEffect, useMemo } from "react";
import { APIProvider, Map, AdvancedMarker, Pin, useMap } from "@vis.gl/react-google-maps";

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

// Mismo Map ID de prueba que usa CamionesEnRutaMap (necesario para AdvancedMarker).
const MAP_ID = "DEMO_MAP_ID";

const COLOR_GPS_TELEFONO = "#2183AE";
const COLOR_GPS_FOTO = "#f59e0b";

interface Punto {
  lat: number;
  lng: number;
}

// Encuadra el mapa en los puntos: acerca si hay uno solo, o abarca ambos.
function AjustarVista({ puntos }: { puntos: Punto[] }) {
  const map = useMap();

  useEffect(() => {
    if (!map || puntos.length === 0) return;

    if (puntos.length === 1) {
      map.setCenter(puntos[0]);
      map.setZoom(16);
      return;
    }

    const limites = new google.maps.LatLngBounds();
    puntos.forEach((p) => limites.extend(p));
    map.fitBounds(limites, 60);
  }, [map, puntos]);

  return null;
}

interface VisitaMapProps {
  telefono: Punto | null;
  foto: Punto | null;
}

export default function VisitaMap({ telefono, foto }: VisitaMapProps) {
  const puntos = useMemo(
    () => [telefono, foto].filter((p): p is Punto => p !== null),
    [telefono, foto]
  );

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
        defaultCenter={puntos[0] ?? { lat: 14.7, lng: -90.6 }}
        defaultZoom={15}
        mapId={MAP_ID}
        gestureHandling="greedy"
        style={{ width: "100%", height: "100%" }}
      >
        <AjustarVista puntos={puntos} />
        {telefono && (
          <AdvancedMarker position={telefono} title="GPS del teléfono">
            <Pin background={COLOR_GPS_TELEFONO} borderColor="#16607f" glyphColor="#ffffff" />
          </AdvancedMarker>
        )}
        {foto && (
          <AdvancedMarker position={foto} title="GPS de la foto">
            <Pin background={COLOR_GPS_FOTO} borderColor="#b45309" glyphColor="#ffffff" />
          </AdvancedMarker>
        )}
      </Map>
    </APIProvider>
  );
}
