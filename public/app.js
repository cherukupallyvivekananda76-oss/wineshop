"use strict";

// ═══════════════════════════════════════════════════════════════════
//  UTILITIES
// ═══════════════════════════════════════════════════════════════════

const esc = v => String(v ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");

function showToast(message, type = "info", duration = 4000) {
  const container = document.getElementById("toast-container");
  const toast     = document.createElement("div");
  const icons     = { success: "✅", error: "❌", info: "ℹ️" };
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-icon">${icons[type] || "ℹ️"}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = "slideOut 0.3s ease forwards";
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ─── Set default dates ──────────────────────────────────────────────
(function initDates() {
  const now = new Date();
  const fmt  = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  const today     = fmt(now);
  const yesterday = fmt(new Date(now - 864e5));

  // Desktop page 1
  const dEl = document.getElementById("date");
  if (dEl) dEl.value = today;

  // Desktop page 2
  const ydEl = document.getElementById("yesterday-date");
  const tdEl = document.getElementById("today-date-v");
  if (ydEl) ydEl.value = yesterday;
  if (tdEl) tdEl.value = today;

  // Mobile stock
  const mDateEl = document.getElementById("m-date");
  if (mDateEl) mDateEl.value = today;

  // Mobile verify
  const myEl = document.getElementById("m-y-date");
  const mtEl = document.getElementById("m-t-date");
  if (myEl) myEl.value = yesterday;
  if (mtEl) mtEl.value = today;
})();

// ═══════════════════════════════════════════════════════════════════
//  NAVIGATION
// ═══════════════════════════════════════════════════════════════════

// Desktop tab switching
function switchTab(pageId) {
  document.querySelectorAll(".tab-page").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
  const page = document.getElementById(pageId);
  const btn  = document.getElementById(`tab-${pageId}`);
  if (page) page.classList.add("active");
  if (btn)  btn.classList.add("active");
}
window.switchTab = switchTab;

// Mobile nav switching
function mobileNavSwitch(view) {
  // Toggle segmented pills
  document.querySelectorAll(".mode-btn").forEach(b => b.classList.remove("active"));
  const activeBtn = document.getElementById(`mn-${view}`);
  if (activeBtn) activeBtn.classList.add("active");

  // Views
  document.querySelectorAll(".mobile-view").forEach(v => {
    v.classList.remove("active");
    v.classList.add("hidden");
  });
  const target = document.getElementById(`mobile-${view}-view`);
  if (target) { target.classList.remove("hidden"); target.classList.add("active"); }

  // Show/hide the correct sticky bottom bar
  const stockBar  = document.getElementById("mobile-stock-bottom");
  const verifyBar = document.getElementById("mobile-verify-bottom");
  if (stockBar)  stockBar.style.display  = view === "stock"  ? "" : "none";
  if (verifyBar) verifyBar.style.display = view === "verify" ? "" : "none";
}
window.mobileNavSwitch = mobileNavSwitch;

// ═══════════════════════════════════════════════════════════════════
//  DESKTOP PAGE 1 – Generate & Download
// ═══════════════════════════════════════════════════════════════════

const generateForm = document.getElementById("generate-form");
const generateBtn  = document.getElementById("generate-btn");

if (generateForm) {
  generateForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const date          = document.getElementById("date").value.trim();
    const rows          = parseInt(document.getElementById("rows").value, 10) || 200;
    const preloadBrands = document.getElementById("preload-brands").checked;

    if (!date) { showToast("Please select a date.", "error"); return; }

    generateBtn.disabled = true;
    generateBtn.innerHTML = `<div class="btn-spinner"></div><span>Generating…</span>`;
    try {
      await downloadExcel({ date, rows, preloadBrands });
      showToast(`✨ Sheet for ${date} downloaded!`, "success", 5000);
      driveUpload({ date, rows, preloadBrands });
    } catch (err) {
      showToast(`Error: ${err.message}`, "error", 6000);
    } finally {
      generateBtn.disabled = false;
      generateBtn.innerHTML = `<span class="btn-label">⬇️ Generate &amp; Download Excel</span>`;
    }
  });
}

async function downloadExcel({ date, rows = 200, preloadBrands = true, rowData = null }) {
  const body = { date, rows, preloadBrands };
  if (rowData && rowData.length > 0) body.rowData = rowData;

  const res = await fetch("/api/generate-excel", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error || `Server ${res.status}`);
  }
  const blob = await res.blob();
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement("a"), { href: url, download: `JaiDurga_Stock_${date}.xlsx` });
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ═══════════════════════════════════════════════════════════════════
//  DESKTOP PAGE 2 – Verify Two Days
// ═══════════════════════════════════════════════════════════════════

let deskYFile = null, deskTFile = null;

document.getElementById("yesterday-file")?.addEventListener("change", function () {
  deskYFile = this.files[0] || null;
  const zone = document.getElementById("yesterday-zone");
  const lbl  = document.getElementById("yesterday-label");
  zone.classList.toggle("file-selected", !!deskYFile);
  lbl.textContent = deskYFile ? `✅ ${deskYFile.name}` : "Click to select file";
  updateDeskVerifyBtn();
});

document.getElementById("today-file")?.addEventListener("change", function () {
  deskTFile = this.files[0] || null;
  const zone = document.getElementById("today-zone");
  const lbl  = document.getElementById("today-label");
  zone.classList.toggle("file-selected", !!deskTFile);
  lbl.textContent = deskTFile ? `✅ ${deskTFile.name}` : "Click to select file";
  updateDeskVerifyBtn();
});

function updateDeskVerifyBtn() {
  const btn = document.getElementById("verify-btn");
  if (btn) btn.disabled = !(deskYFile && deskTFile);
}

const verifyForm = document.getElementById("verify-form");
const verifyBtn  = document.getElementById("verify-btn");

if (verifyForm) {
  verifyForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!deskYFile || !deskTFile) return;
    verifyBtn.disabled = true;
    verifyBtn.innerHTML = `<div class="btn-spinner"></div><span>Verifying…</span>`;
    const resultsArea = document.getElementById("verify-results");
    resultsArea.innerHTML = `<div class="empty-state"><div class="btn-spinner" style="width:40px;height:40px;border-width:4px;margin:0 auto 16px;"></div><p>Comparing both sheets…</p></div>`;
    try {
      const todayDate = document.getElementById("today-date-v").value || "today";
      const data = await runVerify(deskYFile, deskTFile, todayDate);
      renderDesktopVerifyResults(data, todayDate);
      showToast(
        data.summary.mismatch_rows > 0 ? `⚠️ ${data.summary.mismatch_rows} mismatch(es) found!` : "✅ All rows OK!",
        data.summary.mismatch_rows > 0 ? "error" : "success", 6000
      );
    } catch (err) {
      resultsArea.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p style="color:#da3633;">${esc(err.message)}</p></div>`;
      showToast(`Error: ${err.message}`, "error", 6000);
    } finally {
      verifyBtn.disabled = false;
      verifyBtn.innerHTML = `<span class="btn-label">🔍 Run Verification</span>`;
    }
  });
}

async function runVerify(yFile, tFile, todayDate) {
  const fd = new FormData();
  fd.append("yesterday_file", yFile);
  fd.append("today_file", tFile);
  fd.append("today_date", todayDate);
  const res  = await fetch("/api/verify-days", { method: "POST", body: fd });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Verification failed.");
  return data;
}

function renderDesktopVerifyResults({ summary, previewRows, downloadId }, todayDate) {
  const area = document.getElementById("verify-results");
  const bc = { OK: "ok", MISMATCH: "mismatch", WARNING: "warning" };
  const rc = { OK: "row-ok", MISMATCH: "row-mismatch", WARNING: "row-warning" };
  const rows = (previewRows || []).map((r, i) =>
    `<tr class="${rc[r.status]||""}" style="animation-delay:${i*18}ms">
      <td>${esc(r.brand)}</td><td>${esc(r.size)}</td>
      <td>${esc(r.ob_today)}</td>
      <td>${r.cb_yesterday !== null ? esc(r.cb_yesterday) : "<em style='color:#484f58'>—</em>"}</td>
      <td>${esc(r.cb_today)}</td>
      <td><span class="badge ${bc[r.status]||""}">${esc(r.status)}</span></td>
      <td style="white-space:normal;max-width:280px;font-size:12px;color:var(--text-secondary);">${esc(r.message)}</td>
    </tr>`).join("");
  area.innerHTML = `
    <div class="card" style="padding:28px;">
      <div class="summary-grid">
        <div class="stat-card total"><div class="stat-value">${summary.total_rows}</div><div class="stat-label">Rows Checked</div></div>
        <div class="stat-card ok"><div class="stat-value">${summary.ok_rows}</div><div class="stat-label">OK</div></div>
        <div class="stat-card mis"><div class="stat-value">${summary.mismatch_rows}</div><div class="stat-label">Mismatch</div></div>
        <div class="stat-card warn"><div class="stat-value">${summary.warning_rows}</div><div class="stat-label">Warning</div></div>
      </div>
      <div class="preview-meta"><span class="preview-sheet-name">📋 Today's sheet – first ${previewRows.length} rows</span></div>
      <div class="table-scroll">
        <table><thead><tr><th>Brand</th><th>Size</th><th>OB Today</th><th>CB Yesterday</th><th>CB Today</th><th>Status</th><th>Message</th></tr></thead>
        <tbody>${rows}</tbody></table>
      </div>
      <div style="margin-top:20px;text-align:center;">
        <a class="btn-download" href="/api/download-verified/${downloadId}" download="JaiDurga_Verified_${todayDate}.xlsx">
          ⬇️ Download Marked Today Sheet (.xlsx)
        </a>
        <p style="margin-top:10px;font-size:12px;color:var(--text-muted);">Red rows = mismatches · New columns J/K/L added · Link valid 15 min</p>
      </div>
    </div>`;
}

// ═══════════════════════════════════════════════════════════════════
//  MOBILE STOCK – Brand List Collapse Toggle
// ═══════════════════════════════════════════════════════════════════

let brandListVisible = false;

function toggleBrandList() {
  brandListVisible = !brandListVisible;
  const panel = document.getElementById("brand-list-panel");
  const btn   = document.getElementById("m-brand-toggle-btn");
  if (!panel || !btn) return;
  if (brandListVisible) {
    panel.classList.remove("hidden");
    btn.textContent = "Hide brand list";
    // Focus search for convenience
    const search = document.getElementById("m-search");
    if (search) setTimeout(() => search.focus(), 100);
  } else {
    panel.classList.add("hidden");
    updateBrandToggleLabel();
  }
}
window.toggleBrandList = toggleBrandList;

function updateBrandToggleLabel() {
  const btn = document.getElementById("m-brand-toggle-btn");
  if (!btn) return;
  const countSpan = document.getElementById("m-brand-count");
  const n = countSpan ? countSpan.textContent : allBrands.length;
  if (!brandListVisible) {
    btn.innerHTML = `Show brand list (<span id="m-brand-count">${allBrands.length}</span>)`;
  }
}

// ═══════════════════════════════════════════════════════════════════
//  MOBILE STOCK – Data Model + Brand List
// ═══════════════════════════════════════════════════════════════════

const stockModel = new Map();
let   allBrands  = [];
let   currentBrandIdx = 0;

async function loadBrands() {
  try {
    const res  = await fetch("/api/brands");
    allBrands  = await res.json();
    // Update brand count in toggle button
    const countSpan = document.getElementById("m-brand-count");
    if (countSpan) countSpan.textContent = allBrands.length;
    // Render into the (hidden) panel — renders invisibly until opened
    renderBrandCards(allBrands);
  } catch (e) {
    const cont = document.getElementById("mobile-brand-cards");
    if (cont) cont.innerHTML = `<div class="empty-state"><p style="color:#da3633;">Could not load brands: ${esc(e.message)}</p></div>`;
  }
}

function makeKey(brand, size) {
  return `${(brand||"").trim().toUpperCase()}|${(size||"").trim().toUpperCase()}`;
}

function renderBrandCards(list) {
  const cont = document.getElementById("mobile-brand-cards");
  if (!cont) return;
  if (!list.length) {
    cont.innerHTML = `<div class="empty-state"><div class="empty-icon">🔍</div><p>No brands found</p></div>`;
    return;
  }
  cont.innerHTML = list.map(({ brand, size }, i) => {
    const key    = makeKey(brand, size);
    const row    = stockModel.get(key);
    const filled = !!row;
    const vals   = filled
      ? `OB: ${row.opening ?? 0} · CB: ${row.closing ?? 0} · Sales: ${row.sales}`
      : "";
    const sizeLabel = size ? `Size: <strong>${esc(size)}</strong>` : "(no size)";
    const origIdx = allBrands.findIndex(b => makeKey(b.brand, b.size) === key);
    return `<div class="brand-card ${filled ? "filled" : ""}" onclick="openMobileDetail(${origIdx})" role="button" tabindex="0" aria-label="${esc(brand)} ${esc(size)}">
      <div class="brand-card-dot"></div>
      <div class="brand-card-body">
        <div class="brand-card-name">${esc(brand)}</div>
        <div class="brand-card-size">${sizeLabel}</div>
        ${vals ? `<div class="brand-card-vals">✓ ${esc(vals)}</div>` : ""}
      </div>
      <div class="brand-card-arrow">›</div>
    </div>`;
  }).join("");
  updateFilledCount();
}

function updateFilledCount() {
  const el = document.getElementById("m-filled-count");
  if (el) el.textContent = `${stockModel.size} filled`;
  // Keep toggle button label in sync
  if (!brandListVisible) {
    const btn = document.getElementById("m-brand-toggle-btn");
    if (btn) btn.innerHTML = `Show brand list (<span id="m-brand-count">${allBrands.length}</span>)`;
  }
}

// Search / filter
function filterBrands(query) {
  const q = query.trim().toLowerCase();
  const filtered = q ? allBrands.filter(b => b.brand.toLowerCase().includes(q) || (b.size||"").toLowerCase().includes(q)) : allBrands;
  renderBrandCards(filtered);
}
window.filterBrands = filterBrands;

// ═══════════════════════════════════════════════════════════════════
//  MOBILE STOCK – Detail Form
// ═══════════════════════════════════════════════════════════════════

function openMobileDetail(idx) {
  currentBrandIdx = idx;
  const { brand, size } = allBrands[idx];
  const key = makeKey(brand, size);
  const row = stockModel.get(key) || {};

  document.getElementById("m-detail-brand").textContent = brand;
  document.getElementById("m-detail-size").textContent  = size ? `Size: ${size}` : "(no size)";

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val != null ? val : ""; };
  set("m-ob",   row.opening);
  set("m-recv", row.received);
  set("m-cb",   row.closing);
  set("m-rate", row.rate);
  mobileRecalc();

  // Switch view
  document.getElementById("mobile-brand-list-view").classList.add("hidden");
  document.getElementById("mobile-detail-view").classList.remove("hidden");
  // Hide stock bottom bar in detail view
  const stockBar = document.getElementById("mobile-stock-bottom");
  if (stockBar) stockBar.style.display = "none";
  window.scrollTo({ top: 0, behavior: "smooth" });
}
window.openMobileDetail = openMobileDetail;

function closeMobileDetail() {
  document.getElementById("mobile-detail-view").classList.add("hidden");
  document.getElementById("mobile-brand-list-view").classList.remove("hidden");
  // Re-show stock bottom bar
  const stockBar = document.getElementById("mobile-stock-bottom");
  if (stockBar) stockBar.style.display = "";
  // Re-render to reflect saved state
  const query = document.getElementById("m-search")?.value || "";
  filterBrands(query);
}
window.closeMobileDetail = closeMobileDetail;

function mobileRecalc() {
  const get = id => parseFloat(document.getElementById(id)?.value) || 0;
  const ob   = get("m-ob");
  const recv = get("m-recv");
  const cb   = get("m-cb");
  const rate = get("m-rate");

  const total  = ob + recv;
  const sales  = total - cb;
  const amount = sales * rate;

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set("m-total",  total);
  set("m-sales",  sales);
  set("m-amount", `₹ ${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
}
window.mobileRecalc = mobileRecalc;

function mobileSaveRow() {
  const idx   = currentBrandIdx;
  const { brand, size } = allBrands[idx];
  const key   = makeKey(brand, size);
  const get   = id => { const v = parseFloat(document.getElementById(id)?.value); return isNaN(v) ? null : v; };

  const ob   = get("m-ob");
  const recv = get("m-recv");
  const cb   = get("m-cb");
  const rate = get("m-rate");
  const total  = (ob ?? 0) + (recv ?? 0);
  const sales  = total - (cb ?? 0);
  const amount = sales * (rate ?? 0);

  stockModel.set(key, { brand, size, opening: ob, received: recv, closing: cb, rate, total, sales, amount });
  showToast(`✅ Saved: ${brand}${size ? ` (${size})` : ""}`, "success", 2500);
  updateFilledCount();
}

function mobileSave() {
  mobileSaveRow();
  closeMobileDetail();
}
window.mobileSave = mobileSave;

function mobileSaveNext() {
  mobileSaveRow();
  const next = currentBrandIdx + 1;
  if (next < allBrands.length) {
    openMobileDetail(next);
  } else {
    showToast("🎉 All brands done! You can now download.", "success", 4000);
    closeMobileDetail();
  }
}
window.mobileSaveNext = mobileSaveNext;

// Mobile generate & download (called from sticky bottom bar)
async function mobileGenerate() {
  const date          = document.getElementById("m-date")?.value?.trim();
  const preloadBrands = document.getElementById("m-preload")?.checked ?? true;

  if (!date) { showToast("Please select a date first.", "error"); return; }

  const btn = document.getElementById("m-generate-btn");
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<div class="btn-spinner"></div><span>Generating…</span>`;
  }

  try {
    const rowData = Array.from(stockModel.values()).map(r => ({
      brand: r.brand, size: r.size,
      opening: r.opening, received: r.received, closing: r.closing, rate: r.rate,
    }));
    const rdPayload = rowData.length > 0 ? rowData : null;
    await downloadExcel({ date, rows: 200, preloadBrands, rowData: rdPayload });
    showToast(`✨ Sheet for ${date} downloaded!`, "success", 5000);
    driveUpload({ date, rows: 200, preloadBrands, rowData: rdPayload });
  } catch (err) {
    showToast(`Error: ${err.message}`, "error", 6000);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `⬇️ Generate Today's Excel`;
    }
  }
}
window.mobileGenerate = mobileGenerate;

// ═══════════════════════════════════════════════════════════════════
//  MOBILE VERIFY
// ═══════════════════════════════════════════════════════════════════

let mobYFile = null, mobTFile = null;
let mobVerifyData = null;
let mobActiveFilter = "all";

document.getElementById("m-y-file")?.addEventListener("change", function () {
  mobYFile = this.files[0] || null;
  const zone = document.getElementById("m-y-zone");
  const lbl  = document.getElementById("m-y-label");
  zone.classList.toggle("file-selected", !!mobYFile);
  lbl.textContent = mobYFile ? `✅ ${mobYFile.name}` : "Tap to select file";
  updateMobVerifyBtn();
});

document.getElementById("m-t-file")?.addEventListener("change", function () {
  mobTFile = this.files[0] || null;
  const zone = document.getElementById("m-t-zone");
  const lbl  = document.getElementById("m-t-label");
  zone.classList.toggle("file-selected", !!mobTFile);
  lbl.textContent = mobTFile ? `✅ ${mobTFile.name}` : "Tap to select file";
  updateMobVerifyBtn();
});

function updateMobVerifyBtn() {
  const btn = document.getElementById("m-verify-btn");
  if (btn) btn.disabled = !(mobYFile && mobTFile);
}

async function mobileRunVerify() {
  if (!mobYFile || !mobTFile) return;
  const btn = document.getElementById("m-verify-btn");
  if (btn) {
    btn.disabled  = true;
    btn.innerHTML = `<div class="btn-spinner"></div><span>Verifying…</span>`;
  }

  const resultsDiv = document.getElementById("mobile-verify-results");
  resultsDiv.innerHTML = `<div class="empty-state"><div class="btn-spinner" style="width:36px;height:36px;border-width:3px;margin:0 auto 12px;"></div><p>Comparing sheets…</p></div>`;

  const todayDate = document.getElementById("m-t-date")?.value || "today";
  try {
    mobVerifyData = await runVerify(mobYFile, mobTFile, todayDate);
    mobActiveFilter = "all";
    renderMobileVerifyResults(mobVerifyData, todayDate);
    showToast(
      mobVerifyData.summary.mismatch_rows > 0
        ? `⚠️ ${mobVerifyData.summary.mismatch_rows} mismatch(es)!`
        : "✅ All rows OK!",
      mobVerifyData.summary.mismatch_rows > 0 ? "error" : "success", 6000
    );
  } catch (err) {
    resultsDiv.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p style="color:#da3633;">${esc(err.message)}</p></div>`;
    showToast(`Error: ${err.message}`, "error", 6000);
  } finally {
    if (btn) {
      btn.disabled  = false;
      btn.innerHTML = `🔍 Run Verification`;
    }
  }
}
window.mobileRunVerify = mobileRunVerify;

// Android-safe download helper — uses a programmatic <a> click so
// Android's download manager picks it up instead of failing on blob: URLs
function handleMobDownload(downloadId, todayDate) {
  const a = document.createElement("a");
  a.href = `/api/download-verified/${downloadId}`;
  a.download = `JaiDurga_Verified_${todayDate}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
window.handleMobDownload = handleMobDownload;

function renderMobileVerifyResults({ summary, previewRows, downloadId }, todayDate) {
  const div = document.getElementById("mobile-verify-results");

  const statsBar = `
    <div class="summary-grid" style="grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;">
      <div class="stat-card total"><div class="stat-value">${summary.total_rows}</div><div class="stat-label">Checked</div></div>
      <div class="stat-card ok"   ><div class="stat-value">${summary.ok_rows}</div><div class="stat-label">OK</div></div>
      <div class="stat-card mis"  ><div class="stat-value">${summary.mismatch_rows}</div><div class="stat-label">Mismatch</div></div>
      <div class="stat-card warn" ><div class="stat-value">${summary.warning_rows}</div><div class="stat-label">Warning</div></div>
    </div>`;

  const filterBar = `
    <div class="m-filter-bar">
      <button class="m-filter-btn active" id="mf-all"  onclick="applyMobFilter('all')">All (${summary.total_rows})</button>
      <button class="m-filter-btn"        id="mf-mis"  onclick="applyMobFilter('mis')">🔴 Mismatch (${summary.mismatch_rows})</button>
      <button class="m-filter-btn"        id="mf-warn" onclick="applyMobFilter('warn')">🟡 Warning (${summary.warning_rows})</button>
    </div>`;

  div.innerHTML = `
    <section class="m-section" style="margin-top:10px;">
      ${statsBar}
      ${filterBar}
      <div class="verify-card-list" id="mob-card-list"></div>
      <div class="m-download-bar">
        <button class="btn-download-xl" onclick="handleMobDownload('${downloadId}', '${todayDate}')">
          ⬇️ Download Verified Excel
        </button>
        <p style="font-size:11px;color:var(--text-muted);margin-top:8px;">Red = mismatches · Columns J/K/L added · Valid 15 min</p>
      </div>
    </section>`;

  renderMobCards(previewRows, "all");
}

function renderMobCards(rows, filter) {
  const list = document.getElementById("mob-card-list");
  if (!list) return;
  const filtered = filter === "all" ? rows
    : filter === "mis"  ? rows.filter(r => r.status === "MISMATCH")
    : rows.filter(r => r.status === "WARNING");

  if (!filtered.length) {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">✅</div><p>No items for this filter</p></div>`;
    return;
  }

  const cls = { OK: "ok", MISMATCH: "mis", WARNING: "warn" };
  list.innerHTML = filtered.map((r, i) => `
    <div class="verify-card ${cls[r.status]||""}" style="animation-delay:${i*20}ms">
      <div class="vc-header">
        <div class="vc-brand">${esc(r.brand)}${r.size ? ` – ${esc(r.size)}` : ""}</div>
        <span class="badge ${r.status === "MISMATCH" ? "mismatch" : r.status === "WARNING" ? "warning" : "ok"}">${esc(r.status)}</span>
      </div>
      <div class="vc-data">OB Today: <strong>${esc(r.ob_today)}</strong> &nbsp;|&nbsp; CB Yesterday: <strong>${r.cb_yesterday !== null ? esc(r.cb_yesterday) : "—"}</strong></div>
      <div class="vc-data">CB Today: <strong>${esc(r.cb_today)}</strong></div>
      <div class="vc-msg">${esc(r.message)}</div>
    </div>`).join("");
}

function applyMobFilter(filter) {
  mobActiveFilter = filter;
  document.getElementById("mf-all")?.classList.toggle("active",        filter === "all");
  document.getElementById("mf-mis")?.classList.toggle("active-red",    filter === "mis");
  document.getElementById("mf-warn")?.classList.toggle("active-yellow", filter === "warn");
  document.getElementById("mf-all")?.classList.remove("active-red", "active-yellow");
  document.getElementById("mf-mis")?.classList.remove("active", "active-yellow");
  document.getElementById("mf-warn")?.classList.remove("active", "active-red");

  if (mobVerifyData) renderMobCards(mobVerifyData.previewRows, filter);
}
window.applyMobFilter = applyMobFilter;

// ═══════════════════════════════════════════════════════════════════
//  GOOGLE DRIVE
// ═══════════════════════════════════════════════════════════════════

function setDriveUI(connected, folderName) {
  const ids = [
    ["drive-disconnected",   "drive-connected"],
    ["m-drive-disconnected", "m-drive-connected"],
  ];
  ids.forEach(([offId, onId]) => {
    const off = document.getElementById(offId);
    const on  = document.getElementById(onId);
    if (connected) {
      off?.classList.add("hidden");
      on?.classList.remove("hidden");
      if (on) on.style.display = "flex";
    } else {
      off?.classList.remove("hidden");
      on?.classList.add("hidden");
    }
  });
  if (connected && folderName) {
    const el = document.getElementById("m-drive-folder");
    if (el) el.textContent = folderName;
  }
}

async function checkDriveStatus() {
  try {
    const res  = await fetch("/api/drive/status");
    const data = await res.json();
    setDriveUI(data.connected, data.folderName);
  } catch (_) {}
}

(function handleDriveRedirect() {
  const params = new URLSearchParams(window.location.search);
  const drive  = params.get("drive");
  if (drive === "connected") {
    showToast("✅ Google Drive connected! Sheets will be saved automatically.", "success", 7000);
    history.replaceState({}, "", window.location.pathname);
  } else if (drive === "error") {
    const reason = params.get("reason") || "unknown error";
    showToast(`⚠️ Google Drive connection failed: ${reason}`, "error", 7000);
    history.replaceState({}, "", window.location.pathname);
  }
})();

async function connectDrive() {
  try {
    const res  = await fetch("/api/drive/auth-url");
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || "Could not start Drive connection.", "error", 7000);
      return;
    }
    window.location.href = data.url;
  } catch (err) {
    showToast(`Drive error: ${err.message}`, "error", 6000);
  }
}
window.connectDrive = connectDrive;

async function disconnectDrive() {
  try {
    await fetch("/api/drive/disconnect", { method: "POST" });
    setDriveUI(false);
    showToast("Google Drive disconnected.", "info", 4000);
  } catch (err) {
    showToast(`Error: ${err.message}`, "error", 5000);
  }
}
window.disconnectDrive = disconnectDrive;

async function driveUpload({ date, rows = 200, preloadBrands = true, rowData = null }) {
  try {
    const body = { date, rows, preloadBrands };
    if (rowData) body.rowData = rowData;
    const res  = await fetch("/api/drive/upload", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      if (data.error?.includes("not connected")) return;
      showToast(`⚠️ Couldn't save to Google Drive. (${data.error})`, "error", 7000);
      return;
    }
    showToast(`☁️ Saved to Drive: ${data.folderName} / ${data.filename}`, "success", 5000);
  } catch (err) {
    showToast(`⚠️ Drive upload failed. File downloaded to device. (${err.message})`, "error", 7000);
  }
}

// ═══════════════════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════════════════

// Show the correct sticky bottom bar for the initial view (stock)
(function initBottomBars() {
  const stockBar  = document.getElementById("mobile-stock-bottom");
  const verifyBar = document.getElementById("mobile-verify-bottom");
  if (stockBar)  stockBar.style.display  = "";
  if (verifyBar) verifyBar.style.display = "none";
})();

// Load brand list
loadBrands();
// Check Drive status
checkDriveStatus();
