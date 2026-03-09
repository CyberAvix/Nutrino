const state = {
  foods: [],
  selected: null,
  mealItems: [] // { foodId, grams }
};

const elSearch = document.getElementById("search");
const elList = document.getElementById("list");
const elDetails = document.getElementById("details");

const elMacro = d3.select("#macroChart");
const elMicro = d3.select("#microChart");

const selA = document.getElementById("compareA");
const selB = document.getElementById("compareB");
const elRadar = d3.select("#compareRadar");
const elCompareText = document.getElementById("compareText");

// Meal
const mealFood = document.getElementById("mealFood");
const mealGrams = document.getElementById("mealGrams");
const mealAdd = document.getElementById("mealAdd");
const mealClear = document.getElementById("mealClear");
const mealList = document.getElementById("mealList");
const mealTotals = document.getElementById("mealTotals");
const mealMacroStack = d3.select("#mealMacroStack");

// Lab
const labCards = document.getElementById("labCards");

// Paleta (šareno ali skladno)
const palette = [
  "#60a5fa", "#34d399", "#fbbf24", "#f472b6", "#a78bfa",
  "#fb7185", "#22d3ee", "#f97316"
];

init();

async function init() {
  try {
    const res = await fetch("./foods.json");
    if (!res.ok) throw new Error(`foods.json status: ${res.status}`);
    state.foods = await res.json();

    renderList(state.foods);
    setupCompareSelects(state.foods);
    setupMealSelect(state.foods);
    renderLabInfo();

    elSearch.addEventListener("input", () => {
      const q = elSearch.value.trim().toLowerCase();
      const filtered = state.foods.filter((f) => f.name.toLowerCase().includes(q));
      renderList(filtered);
    });

    if (state.foods.length) selectFood(state.foods[0]);
  } catch (err) {
    console.error(err);
    elDetails.innerHTML =
      `<div style="color:rgba(255,220,220,0.95)"><strong>Greška:</strong> Ne mogu da učitam foods.json.<br/>` +
      `<span style="color:rgba(238,245,255,0.75)">${String(err)}</span></div>`;
  }
}

/*LISTA I DETALJI */

function renderList(foods) {
  elList.innerHTML = "";
  foods.forEach((f) => {
    const btn = document.createElement("button");
    btn.textContent = `${f.name} - ${f.category}`;
    btn.addEventListener("click", () => selectFood(f));
    elList.appendChild(btn);
  });
}

function selectFood(food) {
  state.selected = food;
  renderDetails(food);
  renderMacroChart(food);
  renderMicroChart(food);
}

function renderDetails(food) {
  const p = food.per100g;
  elDetails.innerHTML = `
    <div><strong>${food.name}</strong> <span class="muted">(${food.category})</span></div>
    <div class="muted small">Vrednosti na 100g</div>
    <ul class="muted">
      <li><strong>${p.kcal}</strong> kcal</li>
      <li>Proteini: <strong>${p.protein_g}</strong> g</li>
      <li>Ugljeni hidrati: <strong>${p.carbs_g}</strong> g</li>
      <li>Masti: <strong>${p.fat_g}</strong> g</li>
    </ul>
  `;
}

/* CHARTS: MAKRO/MICRO */

function renderMacroChart(food) {
  const p = food.per100g;
  const data = [
    { key: "Proteini (g)", value: p.protein_g },
    { key: "UH (g)", value: p.carbs_g },
    { key: "Masti (g)", value: p.fat_g },
  ];

  drawBarChart(elMacro, data, {
    width: 420,
    height: 220,
    colors: d3.scaleOrdinal().domain(data.map(d => d.key)).range(palette),
  });
}

function renderMicroChart(food) {
  const p = food.per100g;

  const candidates = [
    ["Vitamin C (mg)", p.vitC_mg],
    ["Vitamin D (µg)", p.vitD_ug],
    ["Vitamin E (mg)", p.vitE_mg],
    ["Vitamin B1 (mg)", p.vitB1_mg],
    ["Vitamin B6 (mg)", p.vitB6_mg],
    ["Vitamin B12 (µg)", p.vitB12_ug],
    ["Kalcijum (mg)", p.calcium_mg],
    ["Gvožđe (mg)", p.iron_mg],
    ["Magnezijum (mg)", p.magnesium_mg],
    ["Kalijum (mg)", p.potassium_mg],
    ["Selen (µg)", p.selenium_ug],
    ["Folat (µg)", p.folate_ug],
    ["Vitamin K (µg)", p.vitK_ug],
  ].filter((d) => typeof d[1] === "number");

  const data = candidates.slice(0, 5).map(([key, value]) => ({ key, value }));

  drawBarChart(elMicro, data, {
    width: 420,
    height: 220,
    colors: d3.scaleOrdinal().domain(data.map(d => d.key)).range(palette),
  });
}

/* POREĐENJE: RADAR CHART */

function setupCompareSelects(foods) {
  function fillSelect(selectEl) {
    selectEl.innerHTML = "";
    foods.forEach((f) => {
      const opt = document.createElement("option");
      opt.value = f.id;
      opt.textContent = f.name;
      selectEl.appendChild(opt);
    });
  }

  fillSelect(selA);
  fillSelect(selB);

  if (foods.length >= 2) {
    selA.value = foods[0].id;
    selB.value = foods[1].id;
  }

  const onChange = () => renderCompareRadar();
  selA.addEventListener("change", onChange);
  selB.addEventListener("change", onChange);

  renderCompareRadar();
}

function renderCompareRadar() {
  const a = state.foods.find((f) => f.id === selA.value);
  const b = state.foods.find((f) => f.id === selB.value);
  if (!a || !b) return;

  const ka = a.per100g;
  const kb = b.per100g;

  const axes = [
    { key: "kcal", label: "Kalorije", a: ka.kcal, b: kb.kcal },
    { key: "protein_g", label: "Proteini", a: ka.protein_g, b: kb.protein_g },
    { key: "carbs_g", label: "UH", a: ka.carbs_g, b: kb.carbs_g },
    { key: "fat_g", label: "Masti", a: ka.fat_g, b: kb.fat_g },
  ];

  // Normalizacija po osi: max(a,b) da radar bude čitljiv
  const normalized = axes.map((d) => {
    const max = Math.max(d.a, d.b, 1e-6);
    return { label: d.label, a: d.a / max, b: d.b / max, rawA: d.a, rawB: d.b, max };
  });

  drawRadarChart(elRadar, normalized, a.name, b.name, {
    width: 520,
    height: 320,
    colorA: "#60a5fa",
    colorB: "#34d399"
  });

  elCompareText.innerHTML = `
    <div><strong>${a.name}</strong> vs <strong>${b.name}</strong></div>
    <div class="muted small" style="margin-top:6px">
      Poređenje po 100g:
      <ul style="margin:8px 0 0 18px; padding:0">
        <li>Kalorije: <strong>${ka.kcal}</strong> kcal vs <strong>${kb.kcal}</strong> kcal</li>
        <li>Proteini: <strong>${ka.protein_g}</strong> g vs <strong>${kb.protein_g}</strong> g</li>
        <li>UH: <strong>${ka.carbs_g}</strong> g vs <strong>${kb.carbs_g}</strong> g</li>
        <li>Masti: <strong>${ka.fat_g}</strong> g vs <strong>${kb.fat_g}</strong> g</li>
      </ul>
    </div>
  `;
}

/*  OBROK  */

function setupMealSelect(foods) {
  mealFood.innerHTML = "";
  foods.forEach((f) => {
    const opt = document.createElement("option");
    opt.value = f.id;
    opt.textContent = f.name;
    mealFood.appendChild(opt);
  });

  mealAdd.addEventListener("click", () => {
    const id = mealFood.value;
    const grams = Math.max(1, Number(mealGrams.value || 100));
    state.mealItems.push({ foodId: id, grams });
    renderMeal();
  });

  mealClear.addEventListener("click", () => {
    state.mealItems = [];
    renderMeal();
  });

  renderMeal();
}

function renderMeal() {
  if (!state.mealItems.length) {
    mealList.textContent = "Nema dodatih namirnica. Dodaj 2–4 stavke.";
    mealTotals.innerHTML = "";
    mealMacroStack.selectAll("*").remove();
    return;
  }

  // list
  mealList.innerHTML = state.mealItems
    .map((it, idx) => {
      const f = state.foods.find(x => x.id === it.foodId);
      return `<div style="display:flex; justify-content:space-between; gap:10px; margin:4px 0;">
        <span>${idx + 1}. <strong>${f?.name ?? it.foodId}</strong> — ${it.grams}g</span>
        <button data-i="${idx}" class="btnInline btnInlineGhost" style="padding:6px 10px;">Ukloni</button>
      </div>`;
    })
    .join("");

  mealList.querySelectorAll("button[data-i]").forEach(btn => {
    btn.addEventListener("click", () => {
      const i = Number(btn.getAttribute("data-i"));
      state.mealItems.splice(i, 1);
      renderMeal();
    });
  });

  // totals
  const totals = computeMealTotals(state.mealItems);

  mealTotals.innerHTML = `
    <div class="muted small">Ukupno (obrok)</div>
    <div style="display:flex; flex-wrap:wrap; gap:10px; margin-top:6px;">
      <div><strong>${formatNumber(totals.kcal)}</strong> kcal</div>
      <div>Proteini: <strong>${formatNumber(totals.protein_g)}</strong> g</div>
      <div>UH: <strong>${formatNumber(totals.carbs_g)}</strong> g</div>
      <div>Masti: <strong>${formatNumber(totals.fat_g)}</strong> g</div>
    </div>
  `;

  // D3 stacked bar (P/UH/M)
  drawStackedMacro(mealMacroStack, totals, { width: 520, height: 220 });
}

function computeMealTotals(items) {
  let kcal = 0, protein_g = 0, carbs_g = 0, fat_g = 0;

  items.forEach((it) => {
    const f = state.foods.find(x => x.id === it.foodId);
    if (!f) return;
    const factor = it.grams / 100;

    kcal += (f.per100g.kcal ?? 0) * factor;
    protein_g += (f.per100g.protein_g ?? 0) * factor;
    carbs_g += (f.per100g.carbs_g ?? 0) * factor;
    fat_g += (f.per100g.fat_g ?? 0) * factor;
  });

  return { kcal, protein_g, carbs_g, fat_g };
}

/*  LAB  */

function renderLabInfo() {
  const lab = [
    {
      name: "Vitamin D (25(OH)D)",
      what: "Važan za zdravlje kostiju i imunitet.",
      range: "Najčešće: 50–125 µmol/L (može varirati po laboratoriji)",
      note: "Referentne vrednosti zavise od metode i laboratorije."
    },
    {
      name: "Gvožđe (Fe)",
      what: "Učestvuje u prenosu kiseonika; povezano sa energijom i umorom.",
      range: "Najčešće: 10–30 µmol/L (varira)",
      note: "Tumačenje često ide uz feritin i krvnu sliku."
    },
    {
      name: "Feritin",
      what: "Pokazatelj zaliha gvožđa u organizmu.",
      range: "Žene često: ~15–150 µg/L; muškarci: ~30–400 µg/L (varira)",
      note: "Upale i infekcije mogu uticati na vrednost."
    },
    {
      name: "Vitamin B12",
      what: "Bitna uloga u nervnom sistemu i krvnoj slici.",
      range: "Najčešće: 200–900 pg/mL (varira)",
      note: "Granične vrednosti se tumače uz simptome i dodatne analize."
    },
    {
      name: "Holesterol (ukupni/LDL/HDL)",
      what: "Parametri povezani sa kardiovaskularnim rizikom.",
      range: "Opsezi zavise od ciljeva i rizika; laboratorije imaju svoje granice.",
      note: "Ishrana i životne navike utiču, ali tumačenje radi lekar."
    },
    {
      name: "Glukoza (na tašte)",
      what: "Osnovni pokazatelj metabolizma šećera.",
      range: "Najčešće: 3.9–5.6 mmol/L (varira)",
      note: "Za procenu stanja često se gleda i HbA1c."
    }
  ];

  labCards.innerHTML = lab.map(x => `
    <div class="labCard">
      <h3>${x.name}</h3>
      <div class="muted small">${x.what}</div>
      <div class="muted" style="margin-top:8px;"><strong>Referentno:</strong> ${x.range}</div>
      <div class="muted small" style="margin-top:6px;">Napomena: ${x.note}</div>
    </div>
  `).join("");
}

/*  D3 HELPERS  */

function drawBarChart(svgSel, data, { width, height, colors }) {
  svgSel.selectAll("*").remove();

  const margin = { top: 10, right: 10, bottom: 50, left: 50 };
  const w = width - margin.left - margin.right;
  const h = height - margin.top - margin.bottom;

  const svg = svgSel
    .attr("viewBox", `0 0 ${width} ${height}`)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleBand().domain(data.map((d) => d.key)).range([0, w]).padding(0.25);
  const y = d3
    .scaleLinear()
    .domain([0, d3.max(data, (d) => d.value) || 1])
    .nice()
    .range([h, 0]);

  const axisColor = "rgba(238,245,255,0.85)";
  svg.append("g")
    .attr("transform", `translate(0,${h})`)
    .call(d3.axisBottom(x))
    .call(g => g.selectAll("text")
      .attr("transform", "rotate(-25)")
      .style("text-anchor", "end")
      .style("fill", axisColor))
    .call(g => g.selectAll("path,line").style("stroke", "rgba(238,245,255,0.35)"));

  svg.append("g")
    .call(d3.axisLeft(y).ticks(5))
    .call(g => g.selectAll("text").style("fill", axisColor))
    .call(g => g.selectAll("path,line").style("stroke", "rgba(238,245,255,0.35)"));

  svg.selectAll("rect")
    .data(data)
    .join("rect")
    .attr("x", (d) => x(d.key))
    .attr("y", (d) => y(d.value))
    .attr("width", x.bandwidth())
    .attr("height", (d) => h - y(d.value))
    .attr("rx", 6)
    .attr("fill", (d) => colors ? colors(d.key) : "rgba(255,255,255,0.35)");

  svg.selectAll("text.val")
    .data(data)
    .join("text")
    .attr("class", "val")
    .attr("x", (d) => x(d.key) + x.bandwidth() / 2)
    .attr("y", (d) => y(d.value) - 6)
    .attr("text-anchor", "middle")
    .attr("fill", "rgba(238,245,255,0.92)")
    .attr("font-size", 11)
    .text((d) => formatNumber(d.value));
}

/* Radar chart: data = [{label, a, b, rawA, rawB, max}] with a,b in [0..1] */
function drawRadarChart(svgSel, data, labelA, labelB, { width, height, colorA, colorB }) {
  svgSel.selectAll("*").remove();

  const svg = svgSel.attr("viewBox", `0 0 ${width} ${height}`);
  const g = svg.append("g").attr("transform", `translate(${width/2},${height/2})`);

  const radius = Math.min(width, height) * 0.35;
  const levels = 4;
  const angleSlice = (Math.PI * 2) / data.length;

  // grid
  for (let lvl = 1; lvl <= levels; lvl++) {
    const r = (radius * lvl) / levels;
    g.append("circle")
      .attr("r", r)
      .attr("fill", "none")
      .attr("stroke", "rgba(238,245,255,0.22)");
  }

  // axes
  const axis = g.selectAll(".axis")
    .data(data)
    .join("g")
    .attr("class", "axis");

  axis.append("line")
    .attr("x1", 0).attr("y1", 0)
    .attr("x2", (d, i) => radius * Math.cos(angleSlice * i - Math.PI/2))
    .attr("y2", (d, i) => radius * Math.sin(angleSlice * i - Math.PI/2))
    .attr("stroke", "rgba(238,245,255,0.25)");

  axis.append("text")
    .attr("x", (d, i) => (radius + 18) * Math.cos(angleSlice * i - Math.PI/2))
    .attr("y", (d, i) => (radius + 18) * Math.sin(angleSlice * i - Math.PI/2))
    .attr("text-anchor", "middle")
    .attr("fill", "rgba(238,245,255,0.90)")
    .attr("font-size", 12)
    .text(d => d.label);

  const radarLine = d3.lineRadial()
    .radius(d => d.value * radius)
    .angle((d, i) => i * angleSlice)
    .curve(d3.curveLinearClosed);

  const aSeries = data.map(d => ({ value: d.a }));
  const bSeries = data.map(d => ({ value: d.b }));

  // polygons
  g.append("path")
    .datum(aSeries)
    .attr("d", radarLine)
    .attr("fill", colorA)
    .attr("fill-opacity", 0.25)
    .attr("stroke", colorA)
    .attr("stroke-width", 2);

  g.append("path")
    .datum(bSeries)
    .attr("d", radarLine)
    .attr("fill", colorB)
    .attr("fill-opacity", 0.22)
    .attr("stroke", colorB)
    .attr("stroke-width", 2);

  // points
  g.selectAll(".ptA")
    .data(data)
    .join("circle")
    .attr("class", "ptA")
    .attr("r", 4)
    .attr("fill", colorA)
    .attr("cx", (d, i) => (d.a * radius) * Math.cos(angleSlice * i - Math.PI/2))
    .attr("cy", (d, i) => (d.a * radius) * Math.sin(angleSlice * i - Math.PI/2));

  g.selectAll(".ptB")
    .data(data)
    .join("circle")
    .attr("class", "ptB")
    .attr("r", 4)
    .attr("fill", colorB)
    .attr("cx", (d, i) => (d.b * radius) * Math.cos(angleSlice * i - Math.PI/2))
    .attr("cy", (d, i) => (d.b * radius) * Math.sin(angleSlice * i - Math.PI/2));

  // title legend
  const legend = svg.append("g").attr("transform", `translate(16,18)`);
  legend.append("rect").attr("x", 0).attr("y", 0).attr("width", 10).attr("height", 10).attr("rx", 2).attr("fill", colorA);
  legend.append("text").attr("x", 16).attr("y", 10).attr("fill", "rgba(238,245,255,0.9)").attr("font-size", 12).text(labelA);

  legend.append("rect").attr("x", 0).attr("y", 18).attr("width", 10).attr("height", 10).attr("rx", 2).attr("fill", colorB);
  legend.append("text").attr("x", 16).attr("y", 28).attr("fill", "rgba(238,245,255,0.9)").attr("font-size", 12).text(labelB);
}

/** stacked macro bar: Proteini/UH/Masti */
function drawStackedMacro(svgSel, totals, { width, height }) {
  svgSel.selectAll("*").remove();

  const data = [
    { key: "Obrok", protein: totals.protein_g, carbs: totals.carbs_g, fat: totals.fat_g }
  ];

  const keys = ["protein", "carbs", "fat"];
  const labels = { protein: "Proteini", carbs: "UH", fat: "Masti" };
  const colors = { protein: "#60a5fa", carbs: "#fbbf24", fat: "#f472b6" };

  const margin = { top: 10, right: 10, bottom: 40, left: 50 };
  const w = width - margin.left - margin.right;
  const h = height - margin.top - margin.bottom;

  const svg = svgSel.attr("viewBox", `0 0 ${width} ${height}`)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const stack = d3.stack().keys(keys);
  const series = stack(data);

  const x = d3.scaleBand().domain(data.map(d => d.key)).range([0, w]).padding(0.35);
  const y = d3.scaleLinear()
    .domain([0, d3.max(series, s => d3.max(s, d => d[1])) || 1]).nice()
    .range([h, 0]);

  const axisColor = "rgba(238,245,255,0.85)";
  svg.append("g")
    .attr("transform", `translate(0,${h})`)
    .call(d3.axisBottom(x))
    .call(g => g.selectAll("text").style("fill", axisColor))
    .call(g => g.selectAll("path,line").style("stroke", "rgba(238,245,255,0.35)"));

  svg.append("g")
    .call(d3.axisLeft(y).ticks(5))
    .call(g => g.selectAll("text").style("fill", axisColor))
    .call(g => g.selectAll("path,line").style("stroke", "rgba(238,245,255,0.35)"));

  svg.selectAll("g.layer")
    .data(series)
    .join("g")
    .attr("class", "layer")
    .attr("fill", d => colors[d.key])
    .selectAll("rect")
    .data(d => d)
    .join("rect")
    .attr("x", (d) => x(d.data.key))
    .attr("y", (d) => y(d[1]))
    .attr("height", (d) => y(d[0]) - y(d[1]))
    .attr("width", x.bandwidth())
    .attr("rx", 6);

  // legenda
  const lg = svg.append("g").attr("transform", `translate(${w - 220}, 0)`);
  keys.forEach((k, i) => {
    lg.append("rect").attr("x", 0).attr("y", i*16).attr("width", 10).attr("height", 10).attr("rx", 2).attr("fill", colors[k]);
    lg.append("text").attr("x", 16).attr("y", i*16 + 10).attr("fill", axisColor).attr("font-size", 12).text(labels[k]);
  });
}

function formatNumber(x) {
  if (Number.isInteger(x)) return String(x);
  return x.toFixed(1);
}