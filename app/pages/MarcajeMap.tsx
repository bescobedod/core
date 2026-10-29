"use client";

import { useEffect, useMemo } from "react";
import { APIProvider, Map, AdvancedMarker, Pin, useMap } from "@vis.gl/react-google-maps";
import { ZonaMapa } from "../types/MarcajeModel";

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

// Mismo Map ID de prueba que usan VisitaMap y CamionesEnRutaMap (necesario para AdvancedMarker).
const MAP_ID = "DEMO_MAP_ID";

const COLOR_MARCAJE = "#2183AE";
const COLOR_ZONA = "#16a34a";

interface Punto {
  lat: number;
  lng: number;
}

// Dibuja el radio permitido de cada zona y encuadra el mapa en el marcaje y las zonas.
function ZonasYVista({ marcaje, zonas }: { marcaje: Punto | null; zonas: ZonaMapa[] }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    const circulos = zonas.map(
      (z) =>
        new google.maps.Circle({
          map,
          center: { lat: z.latitud, lng: z.longitud },
          radius: z.radio_metros,
          strokeColor: COLOR_ZONA,
          strokeOpacity: 0.9,
          strokeWeight: 2,
          fillColor: COLOR_ZONA,
          fillOpacity: 0.15,
        })
    );

    const bounds = new google.maps.LatLngBounds();
    let hayPuntos = false;
    if (marcaje) {
      bounds.extend(marcaje);
      hayPuntos = true;
    }
    circulos.forEach((c) => {
      const b = c.getBounds();
      if (b) {
        bounds.union(b);
        hayPuntos = true;
      }
    });

    if (hayPuntos) {
      if (zonas.length === 0 && marcaje) {
        map.setCenter(marcaje);
        map.setZoom(16);
      } else {
        map.fitBounds(bounds, 40);
      }
    }

    return () => circulos.forEach((c) => c.setMap(null));
  }, [map, marcaje, zonas]);

  return null;
}

interface MarcajeMapProps {
  marcaje: Punto | null;
  zonas: ZonaMapa[];
}

export default function MarcajeMap({ marcaje, zonas }: MarcajeMapProps) {
  const centro = useMemo(
    () => marcaje ?? (zonas[0] ? { lat: zonas[0].latitud, lng: zonas[0].longitud } : { lat: 14.7, lng: -90.6 }),
    [marcaje, zonas]
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
        defaultCenter={centro}
        defaultZoom={15}
        mapId={MAP_ID}
        gestureHandling="greedy"
        style={{ width: "100%", height: "100%" }}
      >
        <ZonasYVista marcaje={marcaje} zonas={zonas} />
        {marcaje && (
          <AdvancedMarker position={marcaje} title="Ubicación del marcaje">
            <Pin background={COLOR_MARCAJE} borderColor="#16607f" glyphColor="#ffffff" />
          </AdvancedMarker>
        )}
      </Map>
    </APIProvider>
  );
}
