/* ═══════════════════════════════════════════════════════════════
   MILICIA — Compléments
   Chargé en dernier (après app-main.js). Regroupe :
     1. Exports CSV / PDF des registres
     2. Recherche globale (matricule / nom)
     3. Journal d'audit (page)
     4. Statistiques par milicien (page)
   ═══════════════════════════════════════════════════════════════ */

/* ─────────────────────────────────────────────────────────────
   1. EXPORTS CSV / PDF
   ───────────────────────────────────────────────────────────── */

// Registre des jeux de données exportables (lit les tableaux globaux courants).
const EXPORTS = {
  sanctions: {
    title: 'Sanctions',
    headers: ['Membre', 'Type', 'Motif', 'Prononcée par', 'Date'],
    rows: () => (typeof SANCTIONS !== 'undefined' ? SANCTIONS : []).map((s) => [s.membre, s.type, s.motif, s.prononcee_par, s.date_sanction]),
  },
  rapports: {
    title: 'Rapports',
    headers: ['Date', 'Agent', 'Concerné', 'Fait', 'Note'],
    rows: () => (typeof RAPPORTS !== 'undefined' ? RAPPORTS : []).map((r) => [r.date_rapport, r.agent_rapport, r.concerne, r.fait, r.note]),
  },
  tig: {
    title: 'TIG',
    headers: ['Personne', 'Heures', 'Motif', 'Amende', 'Date', 'Assigné par', 'Statut'],
    rows: () => (typeof TIGS !== 'undefined' ? TIGS : []).map((t) => [t.nom, t.heures, t.motif, t.amende, t.date_tig, t.par, t.statut]),
  },
};

// Deux boutons (CSV + PDF) à insérer dans une barre d'outils. Câblés par délégation.
function exportBtns(page) {
  if (!EXPORTS[page]) return '';
  return `<div class="export-group">
    <button class="btn btn-ghost btn-sm" data-export="csv" data-export-page="${page}" type="button" title="Exporter en CSV (Excel)">
      <svg viewBox="0 0 24 24"><path d="M12 3v12M8 11l4 4 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>CSV
    </button>
    <button class="btn btn-ghost btn-sm" data-export="pdf" data-export-page="${page}" type="button" title="Imprimer / PDF">
      <svg viewBox="0 0 24 24"><path d="M6 9V3h12v6M6 18H4v-5a2 2 0 012-2h12a2 2 0 012 2v5h-2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 15h8v6H8z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>PDF
    </button>
  </div>`;
}

function csvEscape(v) {
  const s = (v === null || v === undefined) ? '' : String(v);
  return /[";\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
function buildCSV(headers, rows) {
  // BOM + point-virgule : ouverture directe dans Excel FR
  const sep = ';';
  const lines = [headers.map(csvEscape).join(sep)]
    .concat(rows.map((r) => r.map(csvEscape).join(sep)));
  return '﻿' + lines.join('\r\n');
}
function downloadFile(name, mime, content) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function doExportCSV(page) {
  const set = EXPORTS[page]; if (!set) return;
  const rows = set.rows();
  if (!rows.length) { notify('Rien à exporter pour le moment.', 'info'); return; }
  downloadFile(`milicia-${page}-${stamp()}.csv`, 'text/csv;charset=utf-8', buildCSV(set.headers, rows));
  notify(`${set.title} exporté (${rows.length} ligne(s)).`, 'success');
}

function doExportPDF(page) {
  const set = EXPORTS[page]; if (!set) return;
  const rows = set.rows();
  if (!rows.length) { notify('Rien à imprimer pour le moment.', 'info'); return; }
  const esc = (v) => escapeHtml(v == null ? '' : v);
  const w = window.open('', '_blank');
  if (!w) { notify("Le navigateur a bloqué la fenêtre d'impression.", 'error'); return; }
  const thead = set.headers.map((h) => `<th>${esc(h)}</th>`).join('');
  const tbody = rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('');
  w.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>MILICIA — ${esc(set.title)}</title>
    <style>
      *{box-sizing:border-box} body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:28px}
      h1{font-size:18px;margin:0 0 2px} .sub{color:#555;font-size:12px;margin-bottom:16px}
      table{border-collapse:collapse;width:100%;font-size:12px}
      th,td{border:1px solid #bbb;padding:6px 8px;text-align:left;vertical-align:top}
      thead th{background:#1f6f43;color:#fff;font-weight:700}
      tbody tr:nth-child(even){background:#f4f7f4}
      @media print{ body{margin:12mm} }
    </style></head><body>
    <h1>MILICIA DE CAYO PERICO — ${esc(set.title)}</h1>
    <div class="sub">${rows.length} entrée(s) · exporté le ${esc(new Date().toLocaleString('fr-FR'))}</div>
    <table><thead><tr>${thead}</tr></thead><tbody>${tbody}</tbody></table>
    <script>window.onload=function(){setTimeout(function(){window.print();},250);};<\/script>
  </body></html>`);
  w.document.close();
}

// Délégation : un seul écouteur pour tous les boutons d'export
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-export]');
  if (!btn) return;
  const page = btn.dataset.exportPage;
  if (btn.dataset.export === 'csv') doExportCSV(page);
  else doExportPDF(page);
});

/* ─────────────────────────────────────────────────────────────
   2. RECHERCHE GLOBALE (matricule / nom)
   ───────────────────────────────────────────────────────────── */

let SEARCH_LOADED = false;

// Charge à la demande les jeux susceptibles d'être vides (jamais visités)
async function ensureSearchData() {
  if (SEARCH_LOADED || !ME || ME.demo) { SEARCH_LOADED = true; return; }
  const grab = async (action, key, assign) => {
    try { const r = await api(action); assign(r[key] || []); } catch (e) { /* ignore */ }
  };
  await Promise.all([
    (typeof SANCTIONS !== 'undefined' && SANCTIONS.length) ? null : grab('sanctions', 'sanctions', (v) => { SANCTIONS = v; }),
    (typeof BLACKLIST !== 'undefined' && BLACKLIST.length) ? null : grab('blacklist', 'blacklist', (v) => { BLACKLIST = v; }),
    (typeof OPERATIONS !== 'undefined' && OPERATIONS.length) ? null : grab('operations', 'operations', (v) => { OPERATIONS = v; }),
  ].filter(Boolean));
  SEARCH_LOADED = true;
}

function globalSearch(q) {
  const s = q.trim().toLowerCase();
  if (!s) return [];
  const out = [];
  const hit = (v) => String(v || '').toLowerCase().includes(s);

  (PAGES.effectifs.data || []).forEach((m) => {
    if (hit(m.matricule) || hit(m.nom) || hit(m.grade)) {
      out.push({ page: 'effectifs', icon: '👤', title: `${m.matricule} · ${m.nom}`, sub: `${m.grade || ''} — ${m.statut || ''}` });
    }
  });
  (typeof SANCTIONS !== 'undefined' ? SANCTIONS : []).forEach((x) => {
    if (hit(x.membre) || hit(x.motif) || hit(x.prononcee_par)) {
      out.push({ page: 'sanctions', icon: '⚖️', title: x.membre || '—', sub: `${x.type || ''} — ${x.motif || ''}` });
    }
  });
  (typeof BLACKLIST !== 'undefined' ? BLACKLIST : []).forEach((x) => {
    if (hit(x.nom) || hit(x.motif)) {
      out.push({ page: 'blacklist', icon: '🚫', title: x.nom || '—', sub: `${x.actif === false ? 'Levée' : 'Active'} — ${x.motif || ''}` });
    }
  });
  (typeof OPERATIONS !== 'undefined' ? OPERATIONS : []).forEach((x) => {
    if (hit(x.code) || hit(x.objectif) || hit(x.responsable)) {
      out.push({ page: 'operations', icon: '🎯', title: x.code || '—', sub: `${x.statut || ''} — ${x.objectif || ''}` });
    }
  });
  return out.slice(0, 40);
}

let searchOverlay = null;
function openGlobalSearch() {
  if (searchOverlay) { searchOverlay.querySelector('#gsInput').focus(); return; }
  searchOverlay = document.createElement('div');
  searchOverlay.className = 'gs-overlay';
  searchOverlay.innerHTML = `
    <div class="gs-box" role="dialog" aria-label="Recherche globale">
      <div class="gs-field">
        <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2" fill="none"/><path d="M21 21l-4.35-4.35" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        <input type="text" id="gsInput" placeholder="Rechercher un matricule, un nom, une opération…" autocomplete="off">
        <kbd>Échap</kbd>
      </div>
      <div class="gs-results" id="gsResults"><div class="gs-hint">Tapez pour rechercher dans les effectifs, sanctions, blacklist et opérations.</div></div>
    </div>`;
  document.body.appendChild(searchOverlay);

  const input = searchOverlay.querySelector('#gsInput');
  const results = searchOverlay.querySelector('#gsResults');
  const close = () => { searchOverlay?.remove(); searchOverlay = null; };

  const render = () => {
    const items = globalSearch(input.value);
    if (!input.value.trim()) {
      results.innerHTML = '<div class="gs-hint">Tapez pour rechercher dans les effectifs, sanctions, blacklist et opérations.</div>';
      return;
    }
    if (!items.length) { results.innerHTML = '<div class="gs-hint">Aucun résultat.</div>'; return; }
    results.innerHTML = items.map((it, i) => `
      <button class="gs-item${i === 0 ? ' sel' : ''}" data-page="${it.page}" type="button">
        <span class="gs-ico">${it.icon}</span>
        <span class="gs-txt"><span class="gs-title">${escapeHtml(it.title)}</span><span class="gs-sub">${escapeHtml(it.sub)}</span></span>
        <span class="gs-tag">${it.page}</span>
      </button>`).join('');
    results.querySelectorAll('.gs-item').forEach((b) => b.addEventListener('click', () => { navigate(b.dataset.page); close(); }));
  };

  input.addEventListener('input', render);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { close(); return; }
    if (e.key === 'Enter') { const first = results.querySelector('.gs-item'); if (first) first.click(); }
  });
  searchOverlay.addEventListener('click', (e) => { if (e.target === searchOverlay) close(); });

  ensureSearchData().then(() => { if (searchOverlay) render(); });
  setTimeout(() => input.focus(), 20);
}

// Bouton loupe de la topbar + raccourci Ctrl/Cmd+K
(function wireGlobalSearch() {
  const btn = document.querySelector('.topbar-right .icon-btn[title="Recherche"]');
  if (btn) { btn.id = 'globalSearchBtn'; btn.addEventListener('click', openGlobalSearch); }
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); openGlobalSearch(); }
  });
})();

/* ─────────────────────────────────────────────────────────────
   3. JOURNAL D'AUDIT
   ───────────────────────────────────────────────────────────── */

let AUDIT = [];
const AUDIT_TONE = {
  SANCTION: 'red', SANCTION_SUPPR: 'gray', BLACKLIST: 'red', BLACKLIST_MODIF: 'amber',
  BLACKLIST_SUPPR: 'gray', OPERATION: 'green', OPERATION_STATUT: 'amber', OPERATION_SUPPR: 'gray',
};

PAGES.audit = {
  title: "JOURNAL D'AUDIT",
  desc: 'Traçabilité des actions sensibles : qui a fait quoi (sanctions, blacklist, opérations).',
  view: 'custom',
  get data() { return AUDIT; },
  stats: (rows) => {
    const today = new Date().toDateString();
    return [
      ['Entrées', rows.length],
      ["Aujourd'hui", rows.filter((r) => r.ts && new Date(r.ts).toDateString() === today).length],
      ['Acteurs', new Set(rows.map((r) => r.acteur_matricule)).size],
    ];
  },
  render: () => `<div id="auditRoot" class="gestion-root">Chargement…</div>`,
  afterRender: () => loadAudit(),
};

async function loadAudit() {
  const root = document.getElementById('auditRoot');
  if (!root) return;
  try {
    AUDIT = ME && ME.demo ? [] : ((await api('audit_log')).audit || []);
  } catch (e) {
    root.innerHTML = `<div class="empty-state"><div class="empty-title">ACCÈS REFUSÉ</div><div class="empty-sub">${escapeHtml(e.message)}</div></div>`;
    return;
  }
  renderAudit();
  refreshStats('audit');
}

function auditRow(a) {
  const ts = a.ts ? new Date(a.ts).toLocaleString('fr-FR') : '—';
  return `<tr>
    <td class="audit-ts">${escapeHtml(ts)}</td>
    <td>${escapeHtml(a.acteur_matricule || '—')}${a.acteur_nom ? ' · ' + escapeHtml(a.acteur_nom) : ''}</td>
    <td><span class="badge badge-${AUDIT_TONE[a.action] || 'gray'}">${escapeHtml(a.action)}</span></td>
    <td>${escapeHtml(a.cible || '—')}</td>
    <td>${escapeHtml(a.details || '')}</td>
  </tr>`;
}

function renderAudit() {
  const root = document.getElementById('auditRoot');
  if (!root) return;
  root.innerHTML = `
    <div class="panel-head">
      <div><span class="panel-kicker">Traçabilité</span><h2 class="panel-title">JOURNAL D'AUDIT</h2></div>
      <span class="panel-count" id="auditCount">${AUDIT.length}</span>
    </div>
    <div class="filter-row">
      <div class="search-field">
        <input type="text" id="auditSearch" placeholder="Filtrer (acteur, action, cible…)" autocomplete="off">
        <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"/><path d="M21 21l-4.35-4.35" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      </div>
    </div>
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr><th>Date</th><th>Acteur</th><th>Action</th><th>Cible</th><th>Détails</th></tr></thead>
        <tbody id="auditBody">${AUDIT.map(auditRow).join('')}</tbody>
      </table>
      ${AUDIT.length ? '' : '<div class="empty-state"><div class="empty-title">JOURNAL VIDE</div><div class="empty-sub">Aucune action sensible enregistrée pour le moment.</div></div>'}
    </div>`;

  const search = root.querySelector('#auditSearch');
  search.addEventListener('input', () => {
    const q = search.value.trim().toLowerCase();
    const filtered = AUDIT.filter((a) => !q || [a.acteur_matricule, a.acteur_nom, a.action, a.cible, a.details].some((v) => String(v || '').toLowerCase().includes(q)));
    root.querySelector('#auditBody').innerHTML = filtered.map(auditRow).join('');
    root.querySelector('#auditCount').textContent = filtered.length;
  });
}

/* ─────────────────────────────────────────────────────────────
   4. STATISTIQUES PAR MILICIEN
   ───────────────────────────────────────────────────────────── */

let STATS_RAW = null;
let STATS_PERIOD = 'semaine';           // semaine | mois | tout
let STATS_SORT = { key: 'total', dir: 'desc' };
let STATS_Q = '';
let STATS_SUMMARY = [['Membres', 0]];

// Colonnes agrégées (clé interne → libellé + infobulle)
const STAT_COLS = [
  ['patrouilles', 'Patrouilles', 'Patrouilles créées ou où le matricule est présent'],
  ['rapports', 'Rapports', 'Rapports rédigés'],
  ['saisies', 'Saisies', 'Saisies créées ou où le matricule est présent'],
  ['tig', 'TIG', 'TIG assignés'],
  ['sanctions', 'Sanctions', 'Sanctions prononcées'],
  ['operations', 'Opérations', 'Opérations créées'],
  ['annonces', 'Annonces', 'Annonces publiées'],
  ['recrutements', 'Recrues', 'Recrutements effectués'],
  ['formations', 'Formations', 'Certifications détenues (total)'],
];

PAGES.statistiques = {
  title: 'STATISTIQUES',
  desc: "Activité de chaque milicien : patrouilles, rapports, formations… Filtrable par période et recherchable par matricule.",
  view: 'custom',
  get data() { return []; },
  stats: () => STATS_SUMMARY,
  render: () => `<div id="statsRoot" class="gestion-root">Chargement…</div>`,
  afterRender: () => loadStats(),
};

async function loadStats() {
  const root = document.getElementById('statsRoot');
  if (!root) return;
  root.innerHTML = '<div class="stats-loading">Agrégation des données…</div>';
  try {
    STATS_RAW = await fetchStatsData();
  } catch (e) {
    root.innerHTML = `<div class="empty-state"><div class="empty-title">ERREUR</div><div class="empty-sub">${escapeHtml(e.message)}</div></div>`;
    return;
  }
  renderStats();
}

async function fetchStatsData() {
  if (ME && ME.demo) {
    return {
      rapports: RAPPORTS || [], patrouilles: PATROUILLES || [], saisies: SAISIES || [],
      tig: TIGS || [], sanctions: SANCTIONS || [], operations: OPERATIONS || [],
      annonces: ANNONCES || [], absences: ABSENCES || [], contrats: [],
    };
  }
  const grab = async (action, key) => { try { return (await api(action))[key] || []; } catch (e) { return []; } };
  const [rapports, patrouilles, saisies, tig, sanctions, operations, annonces, absences, contrats] = await Promise.all([
    grab('rapports', 'rapports'), grab('patrouilles', 'patrouilles'), grab('saisies', 'saisies'),
    grab('tig', 'tig'), grab('sanctions', 'sanctions'), grab('operations', 'operations'),
    grab('annonces', 'annonces'), grab('absences', 'absences'), grab('contrats', 'contrats'),
  ]);
  return { rapports, patrouilles, saisies, tig, sanctions, operations, annonces, absences, contrats };
}

function statsPeriodStart() {
  const now = Date.now();
  if (STATS_PERIOD === 'semaine') return now - 7 * 864e5;
  if (STATS_PERIOD === 'mois') return now - 30 * 864e5;
  return 0;
}
function inPeriod(row) {
  const start = statsPeriodStart();
  if (!start) return true;
  const t = row && row.date_creation ? Date.parse(row.date_creation) : NaN;
  if (isNaN(t)) return false; // période active mais date inconnue → exclu
  return t >= start;
}
// Extrait les matricules présents dans un champ texte ("12, 07 08")
function matsIn(txt) {
  return String(txt || '').split(/[^0-9]+/).filter(Boolean);
}

function computeStats() {
  const members = (PAGES.effectifs.data || []).map((m) => ({
    matricule: m.matricule, nom: m.nom, grade: m.grade,
    patrouilles: 0, rapports: 0, saisies: 0, tig: 0, sanctions: 0,
    operations: 0, annonces: 0, recrutements: 0, formations: 0, total: 0,
  }));
  const byMat = {}; members.forEach((m) => { byMat[m.matricule] = m; });
  const bump = (mat, key, n = 1) => { const m = byMat[String(mat || '').trim()]; if (m) m[key] += n; };
  const d = STATS_RAW || {};

  // Patrouilles / saisies : auteur + participants (sans double comptage par entrée)
  (d.patrouilles || []).filter(inPeriod).forEach((r) => {
    const set = new Set(matsIn(r.matricules));
    if (r.auteur_matricule) set.add(String(r.auteur_matricule).trim());
    set.forEach((mat) => bump(mat, 'patrouilles'));
  });
  (d.saisies || []).filter(inPeriod).forEach((r) => {
    const set = new Set(matsIn(r.matricules_presents));
    if (r.auteur_matricule) set.add(String(r.auteur_matricule).trim());
    set.forEach((mat) => bump(mat, 'saisies'));
  });
  (d.rapports || []).filter(inPeriod).forEach((r) => bump(r.auteur_matricule, 'rapports'));
  (d.tig || []).filter(inPeriod).forEach((r) => bump(r.auteur_matricule, 'tig'));
  (d.sanctions || []).filter(inPeriod).forEach((r) => bump(r.auteur_matricule, 'sanctions'));
  (d.operations || []).filter(inPeriod).forEach((r) => bump(r.auteur_matricule, 'operations'));
  (d.annonces || []).filter(inPeriod).forEach((r) => bump(r.auteur_matricule, 'annonces'));
  (d.contrats || []).filter(inPeriod).forEach((r) => bump(r.auteur_matricule, 'recrutements'));

  // Formations : total détenu (non daté)
  const certifs = (PAGES.formation && PAGES.formation.certifs) || {};
  members.forEach((m) => { m.formations = (certifs[m.matricule] || []).length; });

  // Score d'activité (hors formations, qui sont un cumul)
  members.forEach((m) => {
    m.total = m.patrouilles + m.rapports + m.saisies + m.tig + m.sanctions + m.operations + m.annonces + m.recrutements;
  });
  return members;
}

function renderStats() {
  const root = document.getElementById('statsRoot');
  if (!root) return;
  const all = computeStats();

  // Résumé (bandeau du haut)
  const sum = (k) => all.reduce((s, m) => s + m[k], 0);
  const top = all.slice().sort((a, b) => b.total - a.total)[0];
  STATS_SUMMARY = [
    ['Actifs', all.filter((m) => m.total > 0).length],
    ['Patrouilles', sum('patrouilles')],
    ['Rapports', sum('rapports')],
    ['Plus actif', top && top.total ? `${top.matricule}` : '—'],
  ];
  refreshStats('statistiques');

  const periods = [['semaine', 'Cette semaine'], ['mois', 'Ce mois'], ['tout', 'Tout']];
  const periodBtns = periods.map(([id, lbl]) => `<button class="stats-period${STATS_PERIOD === id ? ' on' : ''}" data-period="${id}" type="button">${lbl}</button>`).join('');

  root.innerHTML = `
    <div class="panel-head">
      <div><span class="panel-kicker">Activité</span><h2 class="panel-title">STATISTIQUES PAR MILICIEN</h2></div>
      <div class="stats-periods">${periodBtns}</div>
    </div>
    <div class="filter-row">
      <div class="search-field">
        <input type="text" id="statsSearch" placeholder="Rechercher un matricule ou un nom…" autocomplete="off" value="${escapeHtml(STATS_Q)}">
        <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"/><path d="M21 21l-4.35-4.35" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      </div>
    </div>
    <div class="table-wrap">
      <table class="data-table stats-table">
        <thead><tr id="statsHead"></tr></thead>
        <tbody id="statsBody"></tbody>
      </table>
      <div class="empty-state" id="statsEmpty" style="display:none"><div class="empty-title">AUCUN MILICIEN</div><div class="empty-sub">Aucun résultat pour cette recherche.</div></div>
    </div>
    <div class="stats-note">Période appliquée aux actions datées. « Formations » = certifications détenues (cumul, non daté).</div>`;

  root.querySelectorAll('.stats-period').forEach((b) => b.addEventListener('click', () => {
    STATS_PERIOD = b.dataset.period; renderStats();
  }));
  const search = root.querySelector('#statsSearch');
  search.addEventListener('input', () => { STATS_Q = search.value; renderStatsBody(all); });

  renderStatsHead();
  renderStatsBody(all);
}

function renderStatsHead() {
  const head = document.getElementById('statsHead');
  if (!head) return;
  const arrow = (k) => STATS_SORT.key === k ? (STATS_SORT.dir === 'desc' ? ' ▾' : ' ▴') : '';
  const cols = [['matricule', 'N°'], ['nom', 'Nom'], ['grade', 'Grade']]
    .concat(STAT_COLS.map(([k, l]) => [k, l]))
    .concat([['total', 'Total']]);
  head.innerHTML = cols.map(([k, l]) => {
    const tip = (STAT_COLS.find((c) => c[0] === k) || [])[2];
    const num = !['matricule', 'nom', 'grade'].includes(k);
    return `<th class="sortable${num ? ' th-right' : ''}${k === 'total' ? ' col-total' : ''}" data-sort="${k}"${tip ? ` title="${escapeHtml(tip)}"` : ''}>${l}${arrow(k)}</th>`;
  }).join('');
  head.querySelectorAll('.sortable').forEach((th) => th.addEventListener('click', () => {
    const k = th.dataset.sort;
    if (STATS_SORT.key === k) STATS_SORT.dir = STATS_SORT.dir === 'desc' ? 'asc' : 'desc';
    else { STATS_SORT.key = k; STATS_SORT.dir = ['matricule', 'nom', 'grade'].includes(k) ? 'asc' : 'desc'; }
    renderStatsHead(); renderStatsBodyCached();
  }));
}

let _statsAll = [];
function renderStatsBody(all) { _statsAll = all; renderStatsBodyCached(); }
function renderStatsBodyCached() {
  const body = document.getElementById('statsBody');
  if (!body) return;
  const q = STATS_Q.trim().toLowerCase();
  let rows = _statsAll.filter((m) => !q || String(m.matricule).toLowerCase().includes(q) || String(m.nom || '').toLowerCase().includes(q));

  const { key, dir } = STATS_SORT;
  const mul = dir === 'desc' ? -1 : 1;
  rows = rows.slice().sort((a, b) => {
    let va = a[key], vb = b[key];
    if (key === 'matricule') { va = Number(a.matricule); vb = Number(b.matricule); }
    if (typeof va === 'string' || typeof vb === 'string') return String(va || '').localeCompare(String(vb || '')) * mul;
    return (va - vb) * mul;
  });

  const maxTotal = Math.max(1, ..._statsAll.map((m) => m.total));
  const cell = (v) => `<td class="th-right stat-num${v ? '' : ' zero'}">${v || '·'}</td>`;
  body.innerHTML = rows.map((m) => {
    const pct = Math.round((m.total / maxTotal) * 100);
    return `<tr>
      <td class="stat-mat">${escapeHtml(m.matricule)}</td>
      <td>${escapeHtml(m.nom)}</td>
      <td class="stat-grade">${escapeHtml(m.grade || '—')}</td>
      ${STAT_COLS.map(([k]) => cell(m[k])).join('')}
      <td class="th-right col-total"><span class="stat-total-wrap"><span class="stat-total-bar" style="width:${pct}%"></span><b>${m.total}</b></span></td>
    </tr>`;
  }).join('');

  const empty = document.getElementById('statsEmpty');
  if (empty) empty.style.display = rows.length ? 'none' : 'block';
}

// La visibilité des entrées « Journal d'audit » et « Statistiques » est gérée
// dans app-shell.js › afterLogin (classes .nav-audit / .nav-stats).
