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

function updateProgress(current, total, label) {
  const text = document.getElementById("uv-loader-text");
  const fill = document.getElementById("uv-loader-fill");

  if (!text || !fill) return;

  const percent = total > 0 ? Math.round((current / total) * 100) : 100;
  text.textContent = `${label || "Scan du programme…"} ${percent}%`;
  fill.style.width = percent + "%";
}

function removeLoadingUI() {
  const box = document.getElementById("uv-loader-box");
  if (box) box.remove();
}

/*******************************
 * 1) SCAN DU PROGRAMME (remplace uv_data.json)
 *
 * UV_SCAN_CACHE structure :
 * { [identifier]: { branch, module, coef } }
 *
 * - identifier : code UV entre parenthèses dans detail.php, ex. "An1"
 * - branch     : premier mot du span.sheet-subtitle de la page UV, ex. "An1-TIN"
 * - module     : nom du program_module_row parent
 * - coef       : valeur numérique de la 3ème colonne du program_unit_row
 *******************************/
let SCAN_DATA = null;      // { identifier: { branch, module, coef } }
let BRANCH_TO_MODULE = {}; // branch → module
let COEFS = {};            // branch → coef

function loadScanData() {
  const raw = localStorage.getItem("UV_SCAN_CACHE");
  return raw ? JSON.parse(raw) : null;
}

function saveScanData(data) {
  localStorage.setItem("UV_SCAN_CACHE", JSON.stringify(data));
}

function buildDerivedFromScan(data) {
  BRANCH_TO_MODULE = {};
  COEFS = {};
  for (const info of Object.values(data)) {
    if (info.branch) {
      BRANCH_TO_MODULE[info.branch] = info.module || "Module inconnu";
      if (!isNaN(info.coef)) COEFS[info.branch] = info.coef;
    }
  }
}

function isScanComplete(data) {
  if (!data || Object.keys(data).length === 0) return false;
  return Object.values(data).every(e => e.branch && e.module);
}

async function scanProgramme() {
  createLoadingUI();
  updateProgress(0, 0, "Scan du programme (première fois)…");

  const html = await fetch("/consultation/programmes/detail.php").then(r => r.text());
  const doc = new DOMParser().parseFromString(html, "text/html");

  const allRows = [...doc.querySelectorAll("tr.program_module_row, tr.program_unit_row")];
  const entries = [];
  let currentModule = "Module inconnu";

  for (const row of allRows) {
    if (row.classList.contains("program_module_row")) {
      const rawModule = row.children[0]?.textContent.trim() || "";
      // Garde uniquement le texte avant la première parenthèse
      // ex: "Conception microtechnique 2 (ConceptMT2) 2023 4 ECTS | …" → "Conception microtechnique 2"
      currentModule = (rawModule.split("(")[0].trim()) || "Module inconnu";
    } else if (row.classList.contains("program_unit_row")) {
      const nameCell = row.children[0];
      const coefCell = row.children[2];
      if (!nameCell) continue;

      const fullName = nameCell.textContent.trim();
      const match = fullName.match(/\(([^)]+)\)/);
      if (!match) continue;
      const identifier = match[1];

      const coef = coefCell ? parseFloat(coefCell.textContent.trim().replace(",", ".")) : NaN;
      const link = nameCell.querySelector("a");
      const href = link?.getAttribute("href") || null;

      entries.push({ identifier, module: currentModule, coef, href });
    }
  }

  const total = entries.length;
  const result = {};

  for (let i = 0; i < entries.length; i++) {
    const { identifier, module, coef, href } = entries[i];
    updateProgress(i + 1, total, "Scan du programme (première fois)…");

    let branch = identifier; // fallback si le fetch échoue

    if (href) {
      try {
        const uvHtml = await fetch(href).then(r => r.text());
        const uvDoc = new DOMParser().parseFromString(uvHtml, "text/html");
        const subtitle = uvDoc.querySelector(".sheet-subtitle");
        if (subtitle) {
          const firstWord = subtitle.textContent.trim().split(/\s+/)[0];
          if (firstWord) branch = firstWord;
        }
      } catch (_) { /* garde le fallback */ }
    }

    result[identifier] = { branch, module, coef: isNaN(coef) ? 1 : coef };
  }

  removeLoadingUI();
  return result;
}

async function ensureScanLoaded() {
  if (SCAN_DATA) return;

  const cached = loadScanData();
  if (isScanComplete(cached)) {
    SCAN_DATA = cached;
    buildDerivedFromScan(SCAN_DATA);
    return;
  }

  SCAN_DATA = await scanProgramme();
  saveScanData(SCAN_DATA);
  buildDerivedFromScan(SCAN_DATA);
}

/********************************************
 * 4) GETMODULE
 ********************************************/
function getModule(branchName) {
  return BRANCH_TO_MODULE[branchName] || "Module inconnu";
}

/********************************************
 * 6) NOTES MANUELLES
 ********************************************/
let MANUAL_GRADES = JSON.parse(localStorage.getItem("MANUAL_GRADES") || "{}");

function createSyntheticBlock(branchName, moyenne) {
  const tr = document.createElement("tr");
  const td = document.createElement("td");
  td.colSpan = 6;
  const coef = COEFS[branchName] ?? 1;
  td.textContent = `${branchName} \u2013 moyenne\u00a0: ${moyenne.toFixed(2)} (coef ${coef}) [manuel]`;
  td.dataset.coefAdded = "1";

  const delBtn = document.createElement("button");
  delBtn.textContent = "\u2715";
  delBtn.title = "Supprimer cette note manuelle";
  delBtn.style.cssText = "margin-left:12px;cursor:pointer;font-size:11px;padding:1px 5px;border:1px solid #aaa;border-radius:3px;background:rgba(255,255,255,0.2);color:inherit;";
  delBtn.onclick = () => {
    delete MANUAL_GRADES[branchName];
    localStorage.setItem("MANUAL_GRADES", JSON.stringify(MANUAL_GRADES));
    renderAll();
  };
  td.appendChild(delBtn);
  tr.appendChild(td);
  return [tr];
}



/********************************************
 * 7) RENDU
 ********************************************/
let _cachedBlocks = null;
let _cachedTbody = null;

function renderAll() {
  if (!_cachedBlocks || !_cachedTbody) return;

  const displayedBranches = new Set(_cachedBlocks.map(b => b[0].textContent.trim().split(" ")[0]));
  const blocks = [..._cachedBlocks];

  for (const [branchName, moyenne] of Object.entries(MANUAL_GRADES)) {
    if (!displayedBranches.has(branchName)) {
      blocks.push(createSyntheticBlock(branchName, moyenne));
      displayedBranches.add(branchName);
    }
  }

  blocks.sort((a, b) => {
    const aBranch = a[0].textContent.trim().split(" ")[0];
    const bBranch = b[0].textContent.trim().split(" ")[0];
    const aModule = BRANCH_TO_MODULE[aBranch] || "";
    const bModule = BRANCH_TO_MODULE[bBranch] || "";
    return aModule.localeCompare(bModule);
  });

  const grouped = [];
  let currentGroup = null;
  for (const block of blocks) {
    const module = getModule(block[0].textContent.trim().split(" ")[0]);
    if (!currentGroup || currentGroup.module !== module) {
      currentGroup = { module, blocks: [] };
      grouped.push(currentGroup);
    }
    currentGroup.blocks.push(block);
  }

  const moduleStats = {};
  for (const block of blocks) {
    const headerText = block[0].textContent.trim();
    const branchName = headerText.split(" ")[0];
    const moyenne = extractMoyenne(headerText);
    const module = BRANCH_TO_MODULE[branchName] || "Module inconnu";
    const coef = COEFS[branchName] ?? 1;
    if (moyenne === null || isNaN(moyenne)) continue;
    if (!moduleStats[module]) moduleStats[module] = { sum: 0, coef: 0 };
    moduleStats[module].sum += moyenne * coef;
    moduleStats[module].coef += coef;
  }

  _cachedTbody.innerHTML = "";

  for (const group of grouped) {
    const stats = moduleStats[group.module];
    const moduleMoyenne = stats && stats.coef > 0 ? stats.sum / stats.coef : 0;
    _cachedTbody.appendChild(createModuleHeader(group.module, moduleMoyenne));

    for (const block of group.blocks) {
      const branchName = block[0].textContent.trim().split(" ")[0];
      const headerCell = block[0].querySelector('td[colspan="6"]');
      if (headerCell && !headerCell.dataset.coefAdded) {
        headerCell.textContent += ` (coef ${COEFS[branchName] ?? 1})`;
        headerCell.dataset.coefAdded = "1";
      }
      block.forEach(tr => _cachedTbody.appendChild(tr));
    }

    const spacer = document.createElement("tr");
    const spacerTd = document.createElement("td");
    spacerTd.colSpan = 6;
    spacerTd.style.cssText = "height:14px;padding:0;background:none !important;border:none !important;box-shadow:none;";
    spacer.appendChild(spacerTd);
    _cachedTbody.appendChild(spacer);
  }
}

/********************************************
 * 8) CODE EXISTANT
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
 * 9) OBSERVER
 ********************************************/
const observer = new MutationObserver(async () => {

  const tbodys = document.querySelectorAll("tbody");
  if (tbodys.length < 9) return;

  observer.disconnect();

  await ensureScanLoaded();

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

  _cachedBlocks = blocks;
  _cachedTbody = tbody;
  renderAll();

});

(async () => {

  await ensureScanLoaded();

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Bouton reload : efface le cache et relance un scan complet
  const reloadBtn = document.createElement("button");
  reloadBtn.textContent = "⟳ Recharger le programme";
  reloadBtn.title = "Efface le cache et rescanne le programme GAPS";
  reloadBtn.style.cssText = [
    "position:fixed", "bottom:14px", "right:14px",
    "z-index:999999", "padding:6px 12px",
    "background:#1e6fcc", "color:white",
    "border:none", "border-radius:6px",
    "font-size:13px", "cursor:pointer",
    "box-shadow:0 2px 6px rgba(0,0,0,0.4)"
  ].join(";");
  reloadBtn.addEventListener("mouseenter", () => reloadBtn.style.background = "#155bb5");
  reloadBtn.addEventListener("mouseleave", () => reloadBtn.style.background = "#1e6fcc");
  reloadBtn.addEventListener("click", async () => {
    localStorage.removeItem("UV_SCAN_CACHE");
    SCAN_DATA = null;
    BRANCH_TO_MODULE = {};
    COEFS = {};
    _cachedBlocks = null;
    _cachedTbody = null;
    reloadBtn.disabled = true;
    reloadBtn.textContent = "Scan en cours…";
    await ensureScanLoaded();
    location.reload();
  });
  document.body.appendChild(reloadBtn);

})();
