// Requiere: npm install exceljs
// (Se elimina la dependencia de "xlsx" para poder aplicar estilos, colores, bordes e imágenes/gráficos)
import ExcelJS from "exceljs";

// ---------------------------------------------------------------------------
// Paleta de colores (alineada con la UI: #2183AE)
// ExcelJS usa ARGB (8 caracteres, los primeros 2 son alpha = FF = opaco)
// ---------------------------------------------------------------------------
const COLOR_PRIMARY      = "FF2183AE";
const COLOR_PRIMARY_DARK = "FF1A6A8F";
const COLOR_WHITE        = "FFFFFFFF";
const COLOR_TEXT_DARK    = "FF1F2937";
const COLOR_SUBTEXT      = "FF6B7280";
const COLOR_GOOD_BG      = "FFDCFCE7";
const COLOR_GOOD_TEXT    = "FF16A34A";
const COLOR_BAD_BG       = "FFFEE2E2";
const COLOR_BAD_TEXT     = "FFDC2626";
const COLOR_WARN_TEXT    = "FFCA8A04";
const COLOR_STRIPE       = "FFF9FAFB";
const COLOR_BORDER       = "FFE5E7EB";
const COLOR_YELLOW       = "FFD97706";

const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top:    { style: "thin", color: { argb: COLOR_BORDER } },
  left:   { style: "thin", color: { argb: COLOR_BORDER } },
  bottom: { style: "thin", color: { argb: COLOR_BORDER } },
  right:  { style: "thin", color: { argb: COLOR_BORDER } },
};

// ---------------------------------------------------------------------------
// Helpers de datos (idénticos a la lógica original)
// ---------------------------------------------------------------------------
function getScore(items: any[]) {
  if (!items || items.length === 0) return { good: 0, total: 0, pct: 0 };
  const good = items.filter((i) => i.estado === "BUENO").length;
  return { good, total: items.length, pct: Math.round((good / items.length) * 100) };
}

function getEstadoLimpieza(items: any[]) {
  if (!items || items.length === 0) return "";
  return items.every((i) => i.estado === "BUENO") ? "BUENO" : "MALO";
}

function agregarHallazgos(hallazgos: any[], inspeccion: any, categoria: string, items: any[]) {
  (items ?? [])
    .filter((item) => item.estado !== "BUENO")
    .forEach((item) => {
      hallazgos.push({
        ID_CHECKLIST: inspeccion.id_checklist,
        PLACA: inspeccion.placa_vehiculo,
        FECHA: inspeccion.fecha_inspeccion,
        CATEGORIA: categoria,
        ITEM: item.item ?? item.nombre ?? "",
        OBSERVACIONES: item.observaciones ?? "",
      });
    });
}

function formatFechaCorta(fecha: string | Date): string {
  if (!fecha) return "—";
  const fechaStr = typeof fecha === "string" ? fecha : fecha.toISOString();
  const [year, month, day] = fechaStr.split("T")[0].split("-");
  return `${day}/${month}/${year}`;
}

function formatFechaGeneracion(fecha: Date): string {
  const fechaTxt = fecha.toLocaleDateString("es-GT", { year: "numeric", month: "long", day: "numeric" });
  const horaTxt = fecha.toLocaleTimeString("es-GT", { hour: "2-digit", minute: "2-digit" });
  return `${fechaTxt}, ${horaTxt}`;
}

// ---------------------------------------------------------------------------
// Generación de gráficos como imagen (Canvas -> PNG base64)
// ExcelJS (versión gratuita) no soporta gráficos nativos editables de Excel,
// así que se dibujan aquí y se insertan como imagen dentro de la hoja.
// ---------------------------------------------------------------------------
function crearGraficoDona(
  data: { label: string; value: number; color: string }[],
  titulo: string
): string {
  const canvas = document.createElement("canvas");
  canvas.width = 480;
  canvas.height = 300;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#1f2937";
  ctx.font = "bold 15px Arial";
  ctx.textAlign = "center";
  ctx.fillText(titulo, canvas.width / 2, 22);

  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const cx = 140;
  const cy = 175;
  const radius = 95;
  const innerRadius = 52;
  let startAngle = -Math.PI / 2;

  data.forEach((d) => {
    const angle = (d.value / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, startAngle, startAngle + angle);
    ctx.closePath();
    ctx.fillStyle = d.color;
    ctx.fill();
    startAngle += angle;
  });

  ctx.beginPath();
  ctx.arc(cx, cy, innerRadius, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  ctx.fillStyle = "#1f2937";
  ctx.font = "bold 20px Arial";
  ctx.textAlign = "center";
  ctx.fillText(String(total), cx, cy + 6);
  ctx.font = "10px Arial";
  ctx.fillStyle = "#6b7280";
  ctx.fillText("total", cx, cy + 22);

  let legendY = 70;
  data.forEach((d) => {
    ctx.fillStyle = d.color;
    ctx.fillRect(300, legendY - 11, 14, 14);
    ctx.fillStyle = "#374151";
    ctx.font = "12px Arial";
    ctx.textAlign = "left";
    const pct = Math.round((d.value / total) * 100);
    ctx.fillText(`${d.label}: ${d.value} (${pct}%)`, 320, legendY);
    legendY += 26;
  });

  return canvas.toDataURL("image/png");
}

function crearGraficoBarras(
  data: { label: string; value: number }[],
  titulo: string,
  opts?: { sufijo?: string; colorBueno?: number }
): string {
  const sufijo = opts?.sufijo ?? "%";
  const umbralBueno = opts?.colorBueno ?? 70;
  const filas = data.slice(0, 10); // máximo 10 barras para que sea legible
  const alturaFila = 26;
  const canvas = document.createElement("canvas");
  canvas.width = 520;
  canvas.height = 50 + filas.length * alturaFila + 20;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#1f2937";
  ctx.font = "bold 15px Arial";
  ctx.textAlign = "center";
  ctx.fillText(titulo, canvas.width / 2, 22);

  const maxValue = Math.max(...filas.map((f) => f.value), 1);
  const chartLeft = 110;
  const chartRight = canvas.width - 60;
  const barMaxWidth = chartRight - chartLeft;

  filas.forEach((f, idx) => {
    const y = 45 + idx * alturaFila;
    const barWidth = Math.max((f.value / maxValue) * barMaxWidth, 2);

    ctx.fillStyle = "#374151";
    ctx.font = "11px Arial";
    ctx.textAlign = "right";
    ctx.fillText(f.label.length > 14 ? f.label.slice(0, 13) + "…" : f.label, chartLeft - 8, y + 14);

    ctx.fillStyle = f.value >= umbralBueno ? "#16a34a" : f.value >= 40 ? "#ca8a04" : "#dc2626";
    ctx.fillRect(chartLeft, y + 2, barWidth, alturaFila - 8);

    ctx.fillStyle = "#1f2937";
    ctx.font = "11px Arial";
    ctx.textAlign = "left";
    ctx.fillText(`${f.value}${sufijo}`, chartLeft + barWidth + 6, y + 14);
  });

  return canvas.toDataURL("image/png");
}

// ---------------------------------------------------------------------------
// Estilo de encabezado reutilizable para las 3 hojas
// ---------------------------------------------------------------------------
function estilizarEncabezado(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: COLOR_WHITE }, size: 11 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_PRIMARY_DARK } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = THIN_BORDER;
  });
  row.height = 26;
}

function agregarTituloYFecha(
  sheet: ExcelJS.Worksheet,
  titulo: string,
  subtitulo: string,
  totalColumnas: number
) {
  sheet.mergeCells(1, 1, 1, totalColumnas);
  const tituloCell = sheet.getCell(1, 1);
  tituloCell.value = titulo;
  tituloCell.font = { bold: true, size: 16, color: { argb: COLOR_WHITE } };
  tituloCell.alignment = { horizontal: "center", vertical: "middle" };
  tituloCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_PRIMARY } };
  sheet.getRow(1).height = 32;

  sheet.mergeCells(2, 1, 2, totalColumnas);
  const subtituloCell = sheet.getCell(2, 1);
  subtituloCell.value = subtitulo;
  subtituloCell.font = { italic: true, size: 10, color: { argb: COLOR_SUBTEXT } };
  subtituloCell.alignment = { horizontal: "center" };
  sheet.getRow(2).height = 20;
}

function pintarEstado(cell: ExcelJS.Cell, valor: string, bueno = "BUENO") {
  const esBueno = valor === bueno || valor === "SI";
  const esNeutro = valor === "" || valor === undefined || valor === null;
  if (esNeutro) return;
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: esBueno ? COLOR_GOOD_BG : COLOR_BAD_BG },
  };
  cell.font = { color: { argb: esBueno ? COLOR_GOOD_TEXT : COLOR_BAD_TEXT }, bold: true };
  cell.alignment = { horizontal: "center", vertical: "middle" };
}

// ---------------------------------------------------------------------------
// Función principal
// ---------------------------------------------------------------------------
export async function exportInspeccionesExcel(
  inspecciones: any[],
  getValesCombustible: (placa: string, fecha: string) => Promise<any>
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Sistema de Inspección de Camiones";
  workbook.created = new Date();

  const ahora = new Date();
  const fechaGeneracionTxt = formatFechaGeneracion(ahora);

  // =========================================================================
  // 1. Cálculo de datos (igual que la versión original)
  // =========================================================================
  const resumen = inspecciones.map((i) => {
    const scoreNiveles = getScore(i.niveles ?? []);
    const scoreFuncionamiento = getScore(i.chequeo_funcionamiento ?? []);
    const scoreEquipoBasico = getScore(i.equipo_basico ?? []);
    const scoreVarios = getScore(i.varios ?? []);
    const scoreGeneral = getScore([
      ...(i.niveles ?? []),
      ...(i.chequeo_funcionamiento ?? []),
      ...(i.equipo_basico ?? []),
      ...(i.varios ?? []),
    ]);
    const totalDanios =
      (i.puntos_frontal?.length ?? 0) +
      (i.puntos_trasero?.length ?? 0) +
      (i.puntos_lateral_izq?.length ?? 0) +
      (i.puntos_lateral_der?.length ?? 0);

    return {
      ID_CHECKLIST: i.id_checklist,
      FECHA: formatFechaCorta(i.fecha_inspeccion),
      PLACA: i.placa_vehiculo,
      CONDUCTOR: i.nombre_conductor,
      ESTADO: i.estado_checklist,
      TIPO_CHECKLIST: i.tipo_checklist,
      LICENCIA: i.licencia_conducir,
      KILOMETRAJE: i.kilometraje,
      USUARIO_REGISTRO: i.usuario?.nombre ?? "",
      NIVELES_PCT: scoreNiveles.pct,
      FUNCIONAMIENTO_PCT: scoreFuncionamiento.pct,
      EQUIPO_BASICO_PCT: scoreEquipoBasico.pct,
      VARIOS_PCT: scoreVarios.pct,
      PORCENTAJE_GENERAL: scoreGeneral.pct,
      ITEMS_BUENOS: scoreGeneral.good,
      TOTAL_ITEMS: scoreGeneral.total,
      ESTADO_GENERAL: scoreGeneral.pct >= 80 ? "BUENO" : "REVISAR",
      LIMPIEZA_EXTERIOR: getEstadoLimpieza(i.limpieza_exterior),
      LIMPIEZA_CABINA: getEstadoLimpieza(i.limpieza_cabina),
      LIMPIEZA_FURGON: getEstadoLimpieza(i.limpieza_furgon),
      TOTAL_DANIOS: totalDanios,
      FIRMA_SUPERVISOR: i.firma_supervisor ? "SI" : "NO",
      FIRMA_PILOTO: i.firma_canvas_base64 ? "SI" : "NO",
      TIENE_VALE_COMBUSTIBLE: i.tiene_vale_combustible ? "SI" : "NO",
    };
  });

  const hallazgos: any[] = [];
  inspecciones.forEach((i) => {
    agregarHallazgos(hallazgos, i, "NIVELES", i.niveles);
    agregarHallazgos(hallazgos, i, "FUNCIONAMIENTO", i.chequeo_funcionamiento);
    agregarHallazgos(hallazgos, i, "EQUIPO BASICO", i.equipo_basico);
    agregarHallazgos(hallazgos, i, "VARIOS", i.varios);
  });
  hallazgos.forEach((h) => (h.FECHA = formatFechaCorta(h.FECHA)));

  const valesExcel: any[] = [];
  // Set para llevar el control de vales únicos ya agregados al Excel
  const valesProcesados = new Set<string>();

  for (const inspeccion of inspecciones) {
    if (!inspeccion.tiene_vale_combustible) continue;
    
    const fecha =
      typeof inspeccion.fecha_inspeccion === "string"
        ? inspeccion.fecha_inspeccion.split("T")[0]
        : inspeccion.fecha_inspeccion.toISOString().split("T")[0];

    const respuesta = await getValesCombustible(inspeccion.placa_vehiculo, fecha);
    
    for (const vale of respuesta.data ?? []) {
      // Si el vale ya fue procesado en una inspección previa del mismo día, lo omitimos
      if (valesProcesados.has(vale.id_vale)) {
        continue;
      }
      
      // Registrar el ID para evitar duplicarlo en la siguiente iteración
      valesProcesados.add(vale.id_vale);

      valesExcel.push({
        ID_CHECKLIST: inspeccion.id_checklist, // Conserva el ID de la primera inspección que lo encontró
        PLACA: inspeccion.placa_vehiculo,
        CONDUCTOR: inspeccion.nombre_conductor,
        FECHA_VALE: vale.createdAt ? new Date(vale.createdAt).toLocaleString("es-GT") : "",
        MONTO: Number(vale.monto) || 0,
        FOTO_VALE: vale.foto_vale_url ? "SI" : "NO",
        FOTO_BOMBA: vale.foto_bomba_url ? "SI" : "NO",
        LATITUD: vale.coordenadas?.latitude ?? "",
        LONGITUD: vale.coordenadas?.longitude ?? "",
      });
    }
  }

  // =========================================================================
  // 2. Hoja "Resumen"
  // =========================================================================
  const columnasResumen: { header: string; key: string; width: number }[] = [
    { header: "ID Checklist", key: "ID_CHECKLIST", width: 14 },
    { header: "Fecha", key: "FECHA", width: 12 },
    { header: "Placa", key: "PLACA", width: 12 },
    { header: "Conductor", key: "CONDUCTOR", width: 22 },
    { header: "Estado", key: "ESTADO", width: 12 },
    { header: "Tipo Checklist", key: "TIPO_CHECKLIST", width: 14 },
    { header: "Licencia", key: "LICENCIA", width: 12 },
    { header: "Kilometraje", key: "KILOMETRAJE", width: 12 },
    { header: "Usuario Registro", key: "USUARIO_REGISTRO", width: 18 },
    { header: "Niveles %", key: "NIVELES_PCT", width: 11 },
    { header: "Funcionamiento %", key: "FUNCIONAMIENTO_PCT", width: 15 },
    { header: "Equipo Básico %", key: "EQUIPO_BASICO_PCT", width: 14 },
    { header: "Varios %", key: "VARIOS_PCT", width: 10 },
    { header: "% General", key: "PORCENTAJE_GENERAL", width: 11 },
    { header: "Ítems Buenos", key: "ITEMS_BUENOS", width: 12 },
    { header: "Total Ítems", key: "TOTAL_ITEMS", width: 11 },
    { header: "Estado General", key: "ESTADO_GENERAL", width: 13 },
    { header: "Limp. Exterior", key: "LIMPIEZA_EXTERIOR", width: 13 },
    { header: "Limp. Cabina", key: "LIMPIEZA_CABINA", width: 12 },
    { header: "Limp. Furgón", key: "LIMPIEZA_FURGON", width: 12 },
    { header: "Total Daños", key: "TOTAL_DANIOS", width: 11 },
    { header: "Firma Supervisor", key: "FIRMA_SUPERVISOR", width: 14 },
    { header: "Firma Piloto", key: "FIRMA_PILOTO", width: 12 },
    { header: "Tiene Vale", key: "TIENE_VALE_COMBUSTIBLE", width: 10 },
  ];

  const resumenSheet = workbook.addWorksheet("Resumen", {
    views: [{ state: "frozen", ySplit: 4 }],
  });

  agregarTituloYFecha(
    resumenSheet,
    "REPORTE DE INSPECCIONES DE CAMIONES",
    `Generado el ${fechaGeneracionTxt}  •  Total de registros: ${inspecciones.length}`,
    columnasResumen.length
  );

  const headerRowResumen = resumenSheet.getRow(4);
  columnasResumen.forEach((col, idx) => {
    headerRowResumen.getCell(idx + 1).value = col.header;
    resumenSheet.getColumn(idx + 1).width = col.width;
  });
  estilizarEncabezado(headerRowResumen);

  resumen.forEach((fila, idx) => {
    const excelRow = resumenSheet.getRow(5 + idx);
    columnasResumen.forEach((col, colIdx) => {
      const cell = excelRow.getCell(colIdx + 1);
      cell.value = (fila as any)[col.key];
      cell.border = THIN_BORDER;
      cell.alignment = { vertical: "middle" };
      if (idx % 2 === 1) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_STRIPE } };
      }
    });
    pintarEstado(excelRow.getCell(17), fila.ESTADO_GENERAL); // Estado General
    pintarEstado(excelRow.getCell(18), fila.LIMPIEZA_EXTERIOR);
    pintarEstado(excelRow.getCell(19), fila.LIMPIEZA_CABINA);
    pintarEstado(excelRow.getCell(20), fila.LIMPIEZA_FURGON);
    pintarEstado(excelRow.getCell(22), fila.FIRMA_SUPERVISOR);
    pintarEstado(excelRow.getCell(23), fila.FIRMA_PILOTO);
    excelRow.height = 20;
  });

  resumenSheet.autoFilter = {
    from: { row: 4, column: 1 },
    to: { row: 4, column: columnasResumen.length },
  };

  // ---- Gráficos embebidos en la hoja Resumen (debajo de la tabla) ----
  const filaGraficos = 6 + resumen.length;

  const conteoEstado = [
    { label: "BUENO", value: resumen.filter((r) => r.ESTADO_GENERAL === "BUENO").length, color: "#16a34a" },
    { label: "REVISAR", value: resumen.filter((r) => r.ESTADO_GENERAL === "REVISAR").length, color: "#dc2626" },
  ];
  const donutBase64 = crearGraficoDona(conteoEstado, "Distribución de Estado General");
  const donutImageId = workbook.addImage({
    base64: donutBase64.split(",")[1],
    extension: "png",
  });
  resumenSheet.addImage(donutImageId, {
    tl: { col: 0, row: filaGraficos },
    ext: { width: 480, height: 300 },
  });

  const promedioPorPlaca = new Map<string, { suma: number; cantidad: number }>();
  resumen.forEach((r) => {
    const actual = promedioPorPlaca.get(r.PLACA) ?? { suma: 0, cantidad: 0 };
    actual.suma += r.PORCENTAJE_GENERAL;
    actual.cantidad += 1;
    promedioPorPlaca.set(r.PLACA, actual);
  });
  const datosBarras = Array.from(promedioPorPlaca.entries())
    .map(([label, v]) => ({ label, value: Math.round(v.suma / v.cantidad) }))
    .sort((a, b) => b.value - a.value);

  const barrasBase64 = crearGraficoBarras(datosBarras, "Promedio % General por Placa");
  const barrasImageId = workbook.addImage({
    base64: barrasBase64.split(",")[1],
    extension: "png",
  });
  resumenSheet.addImage(barrasImageId, {
    tl: { col: 7, row: filaGraficos },
    ext: { width: 520, height: 50 + Math.min(datosBarras.length, 10) * 26 + 20 },
  });

  // =========================================================================
  // 3. Hoja "Hallazgos"
  // =========================================================================
  const columnasHallazgos = [
    { header: "ID Checklist", key: "ID_CHECKLIST", width: 14 },
    { header: "Placa", key: "PLACA", width: 12 },
    { header: "Fecha", key: "FECHA", width: 12 },
    { header: "Categoría", key: "CATEGORIA", width: 18 },
    { header: "Ítem", key: "ITEM", width: 35 },
    { header: "Observaciones", key: "OBSERVACIONES", width: 40 },
  ];
  const hallazgosSheet = workbook.addWorksheet("Hallazgos", {
    views: [{ state: "frozen", ySplit: 4 }],
  });
  agregarTituloYFecha(
    hallazgosSheet,
    "HALLAZGOS (ÍTEMS EN ESTADO MALO)",
    `Generado el ${fechaGeneracionTxt}  •  Total de hallazgos: ${hallazgos.length}`,
    columnasHallazgos.length
  );
  const headerRowHallazgos = hallazgosSheet.getRow(4);
  columnasHallazgos.forEach((col, idx) => {
    headerRowHallazgos.getCell(idx + 1).value = col.header;
    hallazgosSheet.getColumn(idx + 1).width = col.width;
  });
  estilizarEncabezado(headerRowHallazgos);

  if (hallazgos.length === 0) {
    hallazgosSheet.mergeCells(5, 1, 5, columnasHallazgos.length);
    const sinHallazgosCell = hallazgosSheet.getCell(5, 1);
    sinHallazgosCell.value = "No se encontraron hallazgos (todos los ítems en estado BUENO).";
    sinHallazgosCell.font = { italic: true, color: { argb: COLOR_GOOD_TEXT } };
    sinHallazgosCell.alignment = { horizontal: "center" };
  } else {
    hallazgos.forEach((fila, idx) => {
      const excelRow = hallazgosSheet.getRow(5 + idx);
      columnasHallazgos.forEach((col, colIdx) => {
        const cell = excelRow.getCell(colIdx + 1);
        cell.value = (fila as any)[col.key];
        cell.border = THIN_BORDER;
        cell.alignment = { vertical: "middle", wrapText: colIdx >= 4 };
        if (idx % 2 === 1) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_STRIPE } };
        }
      });
      excelRow.getCell(4).font = { color: { argb: COLOR_WARN_TEXT }, bold: true }; // Categoría
    });
  }
  hallazgosSheet.autoFilter = {
    from: { row: 4, column: 1 },
    to: { row: 4, column: columnasHallazgos.length },
  };

  // =========================================================================
  // 4. Hoja "Vales"
  // =========================================================================
  const columnasVales = [
    { header: "ID Checklist", key: "ID_CHECKLIST", width: 14 },
    { header: "Placa", key: "PLACA", width: 12 },
    { header: "Conductor", key: "CONDUCTOR", width: 22 },
    { header: "Fecha Vale", key: "FECHA_VALE", width: 18 },
    { header: "Monto (Q)", key: "MONTO", width: 12 },
    { header: "Foto Vale", key: "FOTO_VALE", width: 11 },
    { header: "Foto Bomba", key: "FOTO_BOMBA", width: 12 },
    { header: "Latitud", key: "LATITUD", width: 12 },
    { header: "Longitud", key: "LONGITUD", width: 12 },
  ];
  const valesSheet = workbook.addWorksheet("Vales", {
    views: [{ state: "frozen", ySplit: 4 }],
  });
  const totalMonto = valesExcel.reduce((s, v) => s + v.MONTO, 0);
  agregarTituloYFecha(
    valesSheet,
    "VALES DE COMBUSTIBLE",
    `Generado el ${fechaGeneracionTxt}  •  Total de vales: ${valesExcel.length}  •  Monto total: Q ${totalMonto.toFixed(2)}`,
    columnasVales.length
  );
  const headerRowVales = valesSheet.getRow(4);
  columnasVales.forEach((col, idx) => {
    headerRowVales.getCell(idx + 1).value = col.header;
    valesSheet.getColumn(idx + 1).width = col.width;
  });
  estilizarEncabezado(headerRowVales);

  valesExcel.forEach((fila, idx) => {
    const excelRow = valesSheet.getRow(5 + idx);
    columnasVales.forEach((col, colIdx) => {
      const cell = excelRow.getCell(colIdx + 1);
      cell.value = (fila as any)[col.key];
      cell.border = THIN_BORDER;
      cell.alignment = { vertical: "middle" };
      if (col.key === "MONTO") cell.numFmt = '"Q" #,##0.00';
      if (idx % 2 === 1) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_STRIPE } };
      }
    });
    pintarEstado(excelRow.getCell(6), fila.FOTO_VALE);
    pintarEstado(excelRow.getCell(7), fila.FOTO_BOMBA);
  });

  if (valesExcel.length > 0) {
    const totalRow = valesSheet.getRow(5 + valesExcel.length);
    totalRow.getCell(4).value = "TOTAL";
    totalRow.getCell(4).font = { bold: true, color: { argb: COLOR_WHITE } };
    totalRow.getCell(4).fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_YELLOW } };
    totalRow.getCell(5).value = totalMonto;
    totalRow.getCell(5).numFmt = '"Q" #,##0.00';
    totalRow.getCell(5).font = { bold: true, color: { argb: COLOR_WHITE } };
    totalRow.getCell(5).fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_YELLOW } };
    for (let c = 1; c <= columnasVales.length; c++) {
      totalRow.getCell(c).border = THIN_BORDER;
    }
  }
  valesSheet.autoFilter = {
    from: { row: 4, column: 1 },
    to: { row: 4, column: columnasVales.length },
  };

  // =========================================================================
  // 5. Descarga del archivo
  // =========================================================================
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const fechaArchivo = ahora.toISOString().split("T")[0];
  a.href = url;
  a.download = `inspecciones_${fechaArchivo}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}