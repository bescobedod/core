import { GrupoBuscable, OpcionBuscable } from "../ui/select-buscable";
import { PilotoUsuario } from "../types/TransporteModel";
import { CamionModel } from "../types/CamionModel";
import { MapaSedes } from "../api/SedeTransporteApi";

export function nombrePilotoTransporte(p: PilotoUsuario) {
  return [p.first_name, p.second_name, p.first_last_name, p.second_last_name].filter(Boolean).join(" ");
}

// Sede que se está despachando (solo Pollo). Sin sede = Insumos: se muestran
// todos los pilotos/camiones en un solo grupo, como antes.
export interface SedeDespacho {
  whs_code_origen: string;
  nombre: string;
}

interface Recurso {
  id: string;
  label: string;
}

// Arma los grupos del dropdown:
// - con sede: "De <sede>" (asignados a esa sede) y "Sin sede asignada"
//   (sin ninguna sede). Los que solo pertenecen a OTRAS sedes no salen.
// - el valor ya asignado siempre aparece, aunque sea de otra sede, para que
//   el dropdown no se vea vacío al editar.
function armarGrupos(
  recursos: Recurso[],
  { sede, idsSede, idsConSede, tomados, valorActual, etiqueta }: {
    sede: SedeDespacho | null;
    idsSede: Set<string>;
    idsConSede: Set<string>;
    tomados: Set<string>;
    valorActual: string;
    etiqueta: string;
  }
): GrupoBuscable[] {
  const opcion = (r: Recurso): OpcionBuscable => ({
    value: r.id,
    label: r.label,
    disabled: tomados.has(r.id),
    detalle: tomados.has(r.id) ? "ya asignado este día" : undefined,
  });

  if (!sede) {
    return [{ opciones: recursos.map(opcion) }];
  }

  const deLaSede = recursos.filter((r) => idsSede.has(r.id));
  const sinSede = recursos.filter((r) => !idsConSede.has(r.id));
  const grupos: GrupoBuscable[] = [
    { titulo: `${etiqueta} de ${sede.nombre}`, opciones: deLaSede.map(opcion) },
    { titulo: "Sin sede asignada", opciones: sinSede.map(opcion) },
  ];

  const yaVisible = deLaSede.some((r) => r.id === valorActual) || sinSede.some((r) => r.id === valorActual);
  const actual = valorActual && !yaVisible ? recursos.find((r) => r.id === valorActual) : undefined;

  if (actual) {
    grupos.unshift({ titulo: "Asignado actualmente (otra sede)", opciones: [opcion(actual)] });
  }

  return grupos.filter((g) => g.opciones.length > 0);
}

export function gruposPilotos(
  pilotos: PilotoUsuario[],
  { sede, mapa, tomados, valorActual }: { sede: SedeDespacho | null; mapa: MapaSedes | null; tomados: Set<number>; valorActual: string }
): GrupoBuscable[] {
  const asignaciones = mapa?.pilotos ?? [];

  return armarGrupos(
    pilotos
      .map((p) => ({ id: String(p.id_users), label: nombrePilotoTransporte(p) || p.codigo_user }))
      .sort((a, b) => a.label.localeCompare(b.label)),
    {
      sede,
      idsSede: new Set(asignaciones.filter((a) => a.whs_code_origen === sede?.whs_code_origen).map((a) => String(a.piloto_id))),
      idsConSede: new Set(asignaciones.map((a) => String(a.piloto_id))),
      tomados: new Set([...tomados].map(String)),
      valorActual,
      etiqueta: "Pilotos",
    }
  );
}

export function gruposCamiones(
  camiones: CamionModel[],
  { sede, mapa, tomados, valorActual }: { sede: SedeDespacho | null; mapa: MapaSedes | null; tomados: Set<string>; valorActual: string }
): GrupoBuscable[] {
  const asignaciones = mapa?.camiones ?? [];

  return armarGrupos(
    camiones
      .map((c) => ({ id: c.id_camion, label: c.placa }))
      .sort((a, b) => a.label.localeCompare(b.label)),
    {
      sede,
      idsSede: new Set(asignaciones.filter((a) => a.whs_code_origen === sede?.whs_code_origen).map((a) => a.id_camion)),
      idsConSede: new Set(asignaciones.map((a) => a.id_camion)),
      tomados,
      valorActual,
      etiqueta: "Camiones",
    }
  );
}
