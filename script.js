(function () {
  "use strict";

  const STORAGE_KEY = "compPackage_fy2027_v1";
  const app = document.getElementById("app");
  const ITEM_MAP = Object.fromEntries(ITEMS.map((it) => [it.id, it]));

  let selected = new Set();

  // ---------- helpers ----------

  function computeTotal(idSet) {
    let sum = 0;
    idSet.forEach((id) => {
      if (ITEM_MAP[id]) sum += ITEM_MAP[id].cost;
    });
    return sum;
  }

  // Deliberately coarse: never surface the exact running total, only a
  // bucketed label. Showing an exact number here would let anyone learn an
  // item's precise value just by toggling it and reading the before/after
  // total — the budget itself can stay visible, but the live total can't.
  function usageLabel(total, budget) {
    if (total <= 0) return { label: "No allocations yet", pct: 0 };
    const pct = total / budget;
    if (pct >= 1) return { label: "At capacity", pct: 100 };
    if (pct > 0.75) return { label: "Nearly maxed", pct: 80 };
    if (pct > 0.5) return { label: "Solid package", pct: 60 };
    if (pct > 0.25) return { label: "Building up", pct: 40 };
    return { label: "Getting started", pct: 20 };
  }

  function encodeShare(record) {
    const json = JSON.stringify(record);
    const b64 = btoa(unescape(encodeURIComponent(json)));
    return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  function decodeShare(str) {
    try {
      let b64 = str.replace(/-/g, "+").replace(/_/g, "/");
      while (b64.length % 4) b64 += "=";
      const json = decodeURIComponent(escape(atob(b64)));
      const record = JSON.parse(json);
      if (!record || !Array.isArray(record.ids)) return null;
      record.ids = record.ids.filter((id) => ITEM_MAP[id]);
      return record;
    } catch (e) {
      return null;
    }
  }

  function shareUrl(record) {
    const base = location.origin + location.pathname;
    return `${base}?pkg=${encodeShare(record)}`;
  }

  function formatDate(ts) {
    try {
      return new Date(ts).toLocaleDateString(undefined, {
        year: "numeric", month: "long", day: "numeric",
      });
    } catch (e) {
      return "";
    }
  }

  // ---------- builder view ----------

  function renderBuilder() {
    selected = new Set();

    app.innerHTML = `
      <div class="form-head">
        <div class="eyebrow"><span>FORM CP-2027</span><span>DRAFT</span></div>
        <h1>Compensation Package Election — FY2027</h1>
        <p class="sub">Select the perks you want. Total budget: ${BUDGET}c.</p>
      </div>

      <div class="ledger">
        <div class="ledger-row">
          <span>Package usage</span>
          <span class="num" id="usage-num">No allocations yet</span>
        </div>
        <div class="gauge"><div class="gauge-fill" id="gauge-fill" style="width:0%"></div></div>
      </div>

      <div class="items" id="items-list"></div>

      <div class="actions">
        <button class="secondary" id="clear-btn" type="button">Clear all</button>
        <button class="primary" id="submit-btn" type="button" disabled>Lock In Package</button>
      </div>
    `;

    const list = document.getElementById("items-list");
    list.innerHTML = ITEMS.map((it) => `
      <div class="item-row" data-id="${it.id}">
        <input type="checkbox" id="chk-${it.id}" />
        <label for="chk-${it.id}">
          <span class="item-title">${it.title}</span>
          ${it.desc ? `<span class="item-desc">${it.desc}</span>` : ""}
        </label>
      </div>
    `).join("");

    ITEMS.forEach((it) => {
      document.getElementById(`chk-${it.id}`).addEventListener("change", (e) => {
        if (e.target.checked) selected.add(it.id);
        else selected.delete(it.id);
        refreshBuilderState();
      });
    });

    document.getElementById("clear-btn").addEventListener("click", () => {
      selected = new Set();
      ITEMS.forEach((it) => { document.getElementById(`chk-${it.id}`).checked = false; });
      refreshBuilderState();
    });

    document.getElementById("submit-btn").addEventListener("click", () => {
      openConfirmModal();
    });

    refreshBuilderState();
  }

  function refreshBuilderState() {
    const total = computeTotal(selected);
    const { label, pct } = usageLabel(total, BUDGET);

    document.getElementById("usage-num").textContent = label;
    const fill = document.getElementById("gauge-fill");
    fill.style.width = `${pct}%`;
    fill.parentElement.classList.toggle("full", total >= BUDGET);

    ITEMS.forEach((it) => {
      const row = document.querySelector(`.item-row[data-id="${it.id}"]`);
      const chk = document.getElementById(`chk-${it.id}`);
      const isSelected = selected.has(it.id);
      const wouldExceed = !isSelected && (total + it.cost > BUDGET);
      chk.disabled = wouldExceed;
      row.classList.toggle("disabled", wouldExceed);
    });

    document.getElementById("submit-btn").disabled = selected.size === 0;
  }

  // ---------- confirm modal ----------

  function openConfirmModal() {
    const overlay = document.createElement("div");
    overlay.className = "modal-backdrop";
    overlay.innerHTML = `
      <div class="modal">
        <h2>Lock in this package?</h2>
        <p>Once locked in, it's final for the year — no changes after this. Package usage: <strong>${usageLabel(computeTotal(selected), BUDGET).label}</strong>.</p>
        <div class="actions">
          <button class="secondary" id="cancel-lock" type="button">Cancel</button>
          <button class="primary" id="confirm-lock" type="button">Yes, lock it in</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    document.getElementById("cancel-lock").addEventListener("click", () => overlay.remove());
    document.getElementById("confirm-lock").addEventListener("click", () => {
      overlay.remove();
      submitPackage();
    });
  }

  function submitPackage() {
    const record = {
      ids: Array.from(selected),
      total: computeTotal(selected),
      ts: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    playStampThen(() => renderCertificate(record, { shared: false }));
  }

  function playStampThen(callback) {
    const overlay = document.createElement("div");
    overlay.className = "stamp-overlay";
    overlay.innerHTML = `<div class="stamp-mark" id="stamp-mark">LOCKED IN</div>`;
    document.body.appendChild(overlay);
    const mark = document.getElementById("stamp-mark");
    requestAnimationFrame(() => mark.classList.add("play"));
    setTimeout(() => {
      overlay.remove();
      callback();
    }, 650);
  }

  // ---------- certificate / submitted view ----------

  function renderCertificate(record, { shared }) {
    const items = record.ids.map((id) => ITEM_MAP[id]).filter(Boolean);
    const url = shareUrl(record);

    app.innerHTML = `
      ${shared ? `<div class="viewing-shared">Viewing a shared package — read only.</div>` : ""}
      <div class="certificate">
        <div class="angle-stamp">APPROVED</div>
        <h1>Compensation Package — FY2027</h1>
        <p class="sub">${shared ? "Locked in" : "You locked this in on"} ${formatDate(record.ts)} · ${usageLabel(record.total, BUDGET).label}</p>
        ${items.length ? items.map((it) => `
          <div class="cert-item">
            <span class="item-title">${it.title}</span>
            ${it.desc ? `<span class="item-desc">${it.desc}</span>` : ""}
          </div>
        `).join("") : `<div class="empty-note">No items were selected.</div>`}

        ${!shared ? `
          <div class="share-box">
            <div>Share this package (view-only link):</div>
            <div>${url}</div>
            <button type="button" id="copy-link-btn">Copy link</button>
          </div>
        ` : ""}
      </div>
    `;

    if (!shared) {
      const btn = document.getElementById("copy-link-btn");
      btn.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(url);
          btn.textContent = "Copied!";
        } catch (e) {
          btn.textContent = "Select the text above to copy";
        }
        setTimeout(() => { btn.textContent = "Copy link"; }, 2000);
      });
    }
  }

  // ---------- init ----------

  function init() {
    const params = new URLSearchParams(location.search);
    const pkgParam = params.get("pkg");

    if (pkgParam) {
      const shared = decodeShare(pkgParam);
      if (shared) {
        renderCertificate(shared, { shared: true });
        return;
      }
    }

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const record = JSON.parse(saved);
        if (record && Array.isArray(record.ids)) {
          renderCertificate(record, { shared: false });
          return;
        }
      } catch (e) { /* fall through to builder */ }
    }

    renderBuilder();
  }

  init();
})();
