/*******************************
 * UI DE CHARGEMENT
 *******************************/
function createLoadingUI() {
  let box = document.getElementById("uv-loader-box");
  if (box) return box;

  box = document.createElement("div");
  box.id = "uv-loader-box";
  box.style.position = "fixed";
  box.style.top = "10px";
  box.style.right = "10px";
  box.style.padding = "10px 15px";
  box.style.background = "rgba(0,0,0,0.8)";
  box.style.color = "white";
  box.style.fontSize = "14px";
  box.style.borderRadius = "6px";
  box.style.zIndex = "999999";
  box.style.width = "220px";

  const text = document.createElement("div");
  text.id = "uv-loader-text";
  text.textContent = "Chargement…";

  const bar = document.createElement("div");
  bar.style.width = "100%";
  bar.style.height = "6px";
  bar.style.background = "#444";
  bar.style.marginTop = "6px";
  bar.style.borderRadius = "3px";

  const fill = document.createElement("div");
  fill.id = "uv-loader-fill";
  fill.style.height = "100%";
  fill.style.width = "0%";
  fill.style.background = "#4caf50";
  fill.style.borderRadius = "3px";

  bar.appendChild(fill);
  box.appendChild(text);
  box.appendChild(bar);
  document.body.appendChild(box);

  return box;
}

function updateProgress(current, total) {
  const text = document.getElementById("uv-loader-text");
  const fill = document.getElementById("uv-loader-fill");

  if (!text || !fill) return;

  const percent = total > 0 ? Math.round((current / total) * 100) : 100;
  text.textContent = `Chargement des modules (première fois seulement)… ${percent}%`;
  fill.style.width = percent + "%";
}

function removeLoadingUI() {
  const box = document.getElementById("uv-loader-box");
  if (box) box.remove();
}

/*******************************
 * 1) STOCKAGE LOCAL DES MODULES
 *******************************/
function loadModules() {
  const saved = localStorage.getItem("MODULES_CACHE");
  return saved ? JSON.parse(saved) : null;
}

function saveModules(modules) {
  localStorage.setItem("MODULES_CACHE", JSON.stringify(modules));
}

let MODULES = loadModules();

/*******************************
 * 1.5) RECONSTRUIRE MODULES DEPUIS UV_DATA
 *******************************/
function rebuildModulesFromUVData(uvData) {
  const modules = {};

  for (const [id, info] of Object.entries(uvData)) {
    const moduleName = info?.module || "Inconnu";
    if (!modules[moduleName]) modules[moduleName] = [];
    modules[moduleName].push(info.branch);
  }

  return modules;
}

/********************************************
 * NOUVEAU : CHARGER LE JSON DE L'EXTENSION
 ********************************************/
let UV_DATA = {};
let BRANCH_TO_ID = {};

async function loadUVDataFromExtension() {
  const url = chrome.runtime.getURL("uv_data.json");
  const data = await fetch(url).then(r => r.json());
  return data;
}

async function ensureUVDataLoaded() {

  if (Object.keys(UV_DATA).length > 0) return;

  UV_DATA = await loadUVDataFromExtension();

  for (const [id, info] of Object.entries(UV_DATA)) {
    BRANCH_TO_ID[info.branch] = id;
  }

  MODULES = rebuildModulesFromUVData(UV_DATA);
  saveModules(MODULES);

  console.log("UV_DATA chargé :", UV_DATA);
}

/********************************************
 * 4) GETMODULE
 ********************************************/
function getModule(branchName) {

  const id = BRANCH_TO_ID[branchName];
  if (!id) return "Module inconnu";

  return UV_DATA[id]?.module || "Module inconnu";
}

/********************************************
 * 5) TES COEFS
 ********************************************/
let COEFS = JSON.parse(localStorage.getItem("COEFS_CACHE") || "{}");

async function ensureCoefsLoaded() {

  if (Object.keys(COEFS).length > 0) return;

  const html = await fetch("/consultation/programmes/detail.php").then(r => r.text());
  const doc = new DOMParser().parseFromString(html, "text/html");

  const rows = [...doc.getElementsByClassName("program_unit_row")];

  for (const row of rows) {

    const nameCell = row.children[0];
    const coefCell = row.children[2];

    if (!nameCell || !coefCell) continue;

    const fullName = nameCell.textContent.trim();
    const coefText = coefCell.textContent.trim();

    const uvCodeMatch = fullName.match(/\((.*?)\)/);
    if (!uvCodeMatch) continue;

    const branch = uvCodeMatch[1];
    const coef = parseInt(coefText, 10);

    if (!isNaN(coef)) {
      COEFS[branch] = coef;
    }

  }

  localStorage.setItem("COEFS_CACHE", JSON.stringify(COEFS));
}

/********************************************
 * 6) TON CODE EXISTANT
 ********************************************/
function extractMoyenne(text) {
  const match = text.match(/moyenne(?:\s+hors\s+examen)?\s*:\s*([\d.,]+)/i);
  return match ? parseFloat(match[1].replace(",", ".")) : null;
}

function createModuleHeader(moduleName, moyenne) {
  const tr = document.createElement("tr");
  const td = document.createElement("td");

  td.className = "bigheader";
  td.colSpan = 6;
  td.textContent = `${moduleName} – moyenne : ${moyenne.toFixed(2)}`;

  td.style.backgroundColor = moyenne >= 4 ? "#30b616" : "#f23030";
  td.style.color = "white";

  tr.appendChild(td);
  return tr;
}

/********************************************
 * 7) OBSERVER
 ********************************************/
const observer = new MutationObserver(async () => {

  const tbodys = document.querySelectorAll("tbody");
  if (tbodys.length < 9) return;

  observer.disconnect();

  await ensureUVDataLoaded();
  await ensureCoefsLoaded();

  const tbody = document.querySelectorAll("tbody")[4];
  const rows = Array.from(tbody.children);

  const blocks = [];
  let currentBlock = [];

  rows.forEach(tr => {
    if (tr.querySelector('td[colspan="6"]')) {
      if (currentBlock.length) blocks.push(currentBlock);
      currentBlock = [tr];
    } else {
      currentBlock.push(tr);
    }
  });

  if (currentBlock.length) blocks.push(currentBlock);

  blocks.sort((a, b) => {

    const aBranch = a[0].textContent.trim().split(" ")[0];
    const bBranch = b[0].textContent.trim().split(" ")[0];

    const aId = BRANCH_TO_ID[aBranch];
    const bId = BRANCH_TO_ID[bBranch];

    const aModule = UV_DATA[aId]?.module || "";
    const bModule = UV_DATA[bId]?.module || "";

    return aModule.localeCompare(bModule);

  });

  const moduleStats = {};

  for (const block of blocks) {

    const headerText = block[0].textContent.trim();
    const branchName = headerText.split(" ")[0];
    const moyenne = extractMoyenne(headerText);

    const id = BRANCH_TO_ID[branchName];
    const module = UV_DATA[id]?.module || "Module inconnu";
    const coef = COEFS[branchName] ?? 1;

    if (moyenne === null || isNaN(moyenne)) continue;

    if (!moduleStats[module]) {
      moduleStats[module] = { sum: 0, coef: 0 };
    }

    moduleStats[module].sum += moyenne * coef;
    moduleStats[module].coef += coef;
  }

  tbody.innerHTML = "";

  let lastModule = null;

  for (const block of blocks) {

    const branchName = block[0].textContent.trim().split(" ")[0];
    const module = getModule(branchName);

    if (module !== lastModule) {

      const stats = moduleStats[module];
      const moduleMoyenne = stats && stats.coef > 0 ? stats.sum / stats.coef : 0;

      tbody.appendChild(createModuleHeader(module, moduleMoyenne));
      lastModule = module;
    }

    block.forEach(tr => tbody.appendChild(tr));
  }

});

(async () => {

  await ensureUVDataLoaded();
  await ensureCoefsLoaded();

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

})();
