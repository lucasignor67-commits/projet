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
  FORMATION: 'blue', FORMATION_RETRAIT: 'gray',
};

PAGES.audit = {
  title: "JOURNAL D'AUDIT",
  desc: 'Traçabilité des actions sensibles : qui a fait quoi (sanctions, blacklist, opérations, formations).',
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
  root.innerHTML = skeletonBlock(7);
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
let STATS_PERIOD = 'semaine';           // uniquement la semaine en cours
let STATS_SORT_MODE = 'total';          // total | matricule | nom
let STATS_SHOW_ALL = false;             // false = seulement les actifs de la semaine
let STATS_Q = '';
let STATS_SUMMARY = [['Membres', 0]];
let _statsAll = [];

// Métriques agrégées : [clé, libellé, icône, infobulle]
const STAT_COLS = [
  ['patrouilles', 'Patrouilles', '🚓', 'Patrouilles créées ou où le matricule est présent'],
  ['rapports', 'Rapports', '📄', 'Rapports rédigés'],
  ['saisies', 'Saisies', '💶', 'Saisies créées ou où le matricule est présent'],
  ['tig', 'TIG', '🧹', 'TIG assignés'],
  ['sanctions', 'Sanctions', '⚖️', 'Sanctions prononcées'],
  ['operations', 'Opérations', '🎯', 'Opérations créées'],
  ['annonces', 'Annonces', '📢', 'Annonces publiées'],
  ['recrutements', 'Recrues', '🎖️', 'Recrutements effectués'],
  ['formations', 'Formations', '🎓', 'Formations données à des miliciens sur les 7 derniers jours'],
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
  root.innerHTML = skeletonBlock(8);
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
  const grabObj = async (action, key) => { try { return (await api(action))[key] || {}; } catch (e) { return {}; } };
  const [rapports, patrouilles, saisies, tig, sanctions, operations, annonces, absences, contrats, formationsSemaine] = await Promise.all([
    grab('rapports', 'rapports'), grab('patrouilles', 'patrouilles'), grab('saisies', 'saisies'),
    grab('tig', 'tig'), grab('sanctions', 'sanctions'), grab('operations', 'operations'),
    grab('annonces', 'annonces'), grab('absences', 'absences'), grab('contrats', 'contrats'),
    grabObj('formations_semaine', 'formations_semaine'),
  ]);
  return { rapports, patrouilles, saisies, tig, sanctions, operations, annonces, absences, contrats, formationsSemaine };
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

  // Formations : nb de formations DONNÉES par le formateur sur les 7 derniers jours
  const formSem = d.formationsSemaine || {};
  members.forEach((m) => { m.formations = Number(formSem[m.matricule] || 0); });

  // Score d'activité de la semaine (formations données incluses)
  members.forEach((m) => {
    m.total = m.patrouilles + m.rapports + m.saisies + m.tig + m.sanctions + m.operations + m.annonces + m.recrutements + m.formations;
  });
  return members;
}

function renderStats() {
  const root = document.getElementById('statsRoot');
  if (!root) return;
  STATS_PERIOD = 'semaine';
  document.querySelector('.main')?.classList.remove('main-wide'); // cartes responsives : plus besoin
  _statsAll = computeStats();

  // Résumé (bandeau du haut)
  const sum = (k) => _statsAll.reduce((s, m) => s + m[k], 0);
  const ranked = _statsAll.slice().sort((a, b) => b.total - a.total);
  const top = ranked[0];
  STATS_SUMMARY = [
    ['Actifs', _statsAll.filter((m) => m.total > 0).length],
    ['Patrouilles', sum('patrouilles')],
    ['Rapports', sum('rapports')],
    ['Plus actif', top && top.total ? top.matricule : '—'],
  ];
  refreshStats('statistiques');

  // Podium : 3 plus actifs de la semaine
  const podium = ranked.filter((m) => m.total > 0).slice(0, 3);
  const medals = ['🥇', '🥈', '🥉'];
  const podiumHTML = podium.length ? `<div class="stats-podium">${podium.map((m, i) => `
    <div class="podium-card p${i + 1}">
      <div class="podium-medal">${medals[i]}</div>
      <div class="podium-info">
        <span class="podium-name">${escapeHtml(m.nom)}</span>
        <span class="podium-mat">Matricule ${escapeHtml(m.matricule)}</span>
      </div>
      <div class="podium-score"><b>${m.total}</b><span>actions</span></div>
    </div>`).join('')}</div>` : '';

  const sorts = [['total', 'Plus actifs'], ['matricule', 'Matricule'], ['nom', 'Nom']];
  const sortBtns = sorts.map(([id, lbl]) => `<button class="stats-sort${STATS_SORT_MODE === id ? ' on' : ''}" data-sort="${id}" type="button">${lbl}</button>`).join('');

  root.innerHTML = `
    <div class="panel-head">
      <div><span class="panel-kicker">Activité de la semaine</span><h2 class="panel-title">STATISTIQUES PAR MILICIEN</h2></div>
      <span class="stats-week-tag">7 derniers jours</span>
    </div>
    ${podiumHTML}
    <div class="stats-controls">
      <div class="search-field stats-search">
        <input type="text" id="statsSearch" placeholder="Rechercher un matricule ou un nom…" autocomplete="off" value="${escapeHtml(STATS_Q)}">
        <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"/><path d="M21 21l-4.35-4.35" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      </div>
      <div class="stats-sorts"><span class="stats-ctrl-lbl">Trier</span>${sortBtns}</div>
      <button class="stats-toggle${STATS_SHOW_ALL ? ' on' : ''}" id="statsShowAll" type="button">${STATS_SHOW_ALL ? 'Tous les miliciens' : 'Actifs seulement'}</button>
    </div>
    <div class="stats-cards" id="statsCards"></div>
    <div class="stats-note">🚓 Patrouilles · 📄 Rapports · 💶 Saisies · 🧹 TIG · ⚖️ Sanctions · 🎯 Opérations · 📢 Annonces · 🎖️ Recrues · 🎓 Formations données. Actions comptées sur les 7 derniers jours.</div>`;

  const search = root.querySelector('#statsSearch');
  search.addEventListener('input', () => { STATS_Q = search.value; renderStatsCards(); });
  root.querySelectorAll('.stats-sort').forEach((b) => b.addEventListener('click', () => {
    STATS_SORT_MODE = b.dataset.sort;
    root.querySelectorAll('.stats-sort').forEach((x) => x.classList.toggle('on', x === b));
    renderStatsCards();
  }));
  root.querySelector('#statsShowAll').addEventListener('click', (e) => {
    STATS_SHOW_ALL = !STATS_SHOW_ALL;
    e.currentTarget.classList.toggle('on', STATS_SHOW_ALL);
    e.currentTarget.textContent = STATS_SHOW_ALL ? 'Tous les miliciens' : 'Actifs seulement';
    renderStatsCards();
  });

  renderStatsCards();
}

function sortStats(rows) {
  const r = rows.slice();
  if (STATS_SORT_MODE === 'matricule') return r.sort((a, b) => Number(a.matricule) - Number(b.matricule));
  if (STATS_SORT_MODE === 'nom') return r.sort((a, b) => String(a.nom || '').localeCompare(String(b.nom || '')));
  return r.sort((a, b) => (b.total - a.total) || (Number(a.matricule) - Number(b.matricule)));
}

function renderStatsCards() {
  const wrap = document.getElementById('statsCards');
  if (!wrap) return;
  const q = STATS_Q.trim().toLowerCase();
  let rows = _statsAll.filter((m) => !q || String(m.matricule).toLowerCase().includes(q) || String(m.nom || '').toLowerCase().includes(q));
  // Par défaut : seulement les actifs de la semaine (sauf recherche ou bouton « Tous »)
  if (!STATS_SHOW_ALL && !q) rows = rows.filter((m) => m.total > 0);
  rows = sortStats(rows);

  if (!rows.length) {
    wrap.innerHTML = `<div class="empty-state"><div class="empty-title">${STATS_SHOW_ALL || q ? 'AUCUN RÉSULTAT' : 'AUCUNE ACTIVITÉ CETTE SEMAINE'}</div><div class="empty-sub">${q ? 'Aucun milicien ne correspond à la recherche.' : 'Cliquez « Actifs seulement » pour voir tout le monde.'}</div></div>`;
    return;
  }

  const maxTotal = Math.max(1, ..._statsAll.map((m) => m.total));
  const showRank = STATS_SORT_MODE === 'total';
  wrap.innerHTML = rows.map((m, i) => {
    const pct = Math.round((m.total / maxTotal) * 100);
    const chips = STAT_COLS.map(([k, l, ic, tip]) => `
      <div class="mstat${m[k] ? '' : ' zero'}" title="${escapeHtml(tip)}">
        <span class="mstat-ic">${ic}</span>
        <span class="mstat-val">${m[k]}</span>
        <span class="mstat-lbl">${l}</span>
      </div>`).join('');
    return `<article class="mcard${m.total ? '' : ' inactive'}">
      <div class="mcard-head">
        ${showRank ? `<span class="mcard-rank">${i + 1}</span>` : ''}
        <span class="mcard-mat">${escapeHtml(m.matricule)}</span>
        <div class="mcard-id">
          <span class="mcard-name">${escapeHtml(m.nom)}</span>
          <span class="mcard-grade">${escapeHtml(m.grade || '—')}</span>
        </div>
        <div class="mcard-total"><b>${m.total}</b><span>actions</span></div>
      </div>
      <div class="mcard-bar"><span style="width:${pct}%"></span></div>
      <div class="mcard-stats">${chips}</div>
    </article>`;
  }).join('');
}

// La visibilité des entrées « Journal d'audit » et « Statistiques » est gérée
// dans app-shell.js › afterLogin (classes .nav-audit / .nav-stats).

/* ─────────────────────────────────────────────────────────────
   4a. PHOTOS → SUPABASE STORAGE
   Convertit les images base64 (data URLs) en fichiers stockés,
   remplacées par leur URL publique. Rétro-compatible : les anciennes
   photos base64 continuent de s'afficher, et en cas d'échec on garde
   le base64 (aucune perte).
   ───────────────────────────────────────────────────────────── */

async function uploadPhotos(arr) {
  if (!Array.isArray(arr) || !arr.length || (ME && ME.demo)) return arr || [];
  const out = [];
  for (const p of arr) {
    if (typeof p === 'string' && p.startsWith('data:')) {
      try { out.push((await api('photo_upload', { dataUrl: p })).url); }
      catch (e) { out.push(p); } // fallback : on conserve le base64
    } else {
      out.push(p);
    }
  }
  return out;
}
async function uploadPhoto(p) {
  if (!p) return p;
  return (await uploadPhotos([p]))[0];
}

/* ─────────────────────────────────────────────────────────────
   4b. SKELETONS DE CHARGEMENT
   ───────────────────────────────────────────────────────────── */

// Bloc squelette animé (en-tête + lignes) affiché pendant les fetch.
function skeletonBlock(n = 6) {
  const widths = [70, 55, 80, 62, 74, 50, 66, 58];
  let rows = '';
  for (let i = 0; i < n; i++) {
    rows += `<div class="skel-row"><div class="skel skel-av"></div><div class="skel skel-line" style="max-width:${widths[i % widths.length]}%"></div><div class="skel skel-pill"></div></div>`;
  }
  return `<div class="skel skel-head"></div><div class="skel-wrap">${rows}</div>`;
}

/* ─────────────────────────────────────────────────────────────
   5. TOPBAR : popovers Profil / Nouveau / Notifications
   ───────────────────────────────────────────────────────────── */

const SECTION_META = {
  direction: ['Dirección', 'red'],
  comando: ['Comando', 'amber'],
  liderazgo: ['Liderazgo', 'blue'],
  aplicacion: ['Aplicación', 'green'],
};
const SECTION_ORDER = ['direction', 'comando', 'liderazgo', 'aplicacion'];

// Retrouve la section d'un grade (via GRADES chargés, sinon grades de démo)
function sectionOfGrade(gradeName) {
  const list = (typeof GRADES !== 'undefined' && GRADES.length) ? GRADES
    : (typeof DEMO_GRADES !== 'undefined' ? DEMO_GRADES : []);
  const g = list.find((x) => x.nom === gradeName);
  return g ? g.section : 'aplicacion';
}

let _popover = null;
function closePopover() {
  if (!_popover) return;
  _popover.remove(); _popover = null;
  document.removeEventListener('click', popoverOutside, true);
  document.removeEventListener('keydown', popoverKey);
}
function popoverOutside(e) {
  if (_popover && !_popover.contains(e.target) && !_popover._anchor.contains(e.target)) closePopover();
}
function popoverKey(e) { if (e.key === 'Escape') closePopover(); }
function openPopover(anchor, html, cls) {
  closePopover();
  const p = document.createElement('div');
  p.className = 'topbar-pop' + (cls ? ' ' + cls : '');
  p.innerHTML = html;
  p._anchor = anchor;
  document.body.appendChild(p);
  const r = anchor.getBoundingClientRect();
  p.style.top = (r.bottom + 8) + 'px';
  p.style.right = Math.max(8, window.innerWidth - r.right) + 'px';
  _popover = p;
  setTimeout(() => {
    document.addEventListener('click', popoverOutside, true);
    document.addEventListener('keydown', popoverKey);
  }, 0);
  return p;
}

function openProfile() {
  if (!ME) { notify('Non connecté.', 'info'); return; }
  const perms = [];
  if (ME.peut_modifier_comptes) perms.push('Admin comptes');
  if (ME.peut_ajouter_effectif) perms.push('Ajout effectif');
  if (ME.peut_voir_mdp) perms.push('Voir mots de passe');
  if (ME.formateur) perms.push('Formateur');
  if (ME.recruteur) perms.push('Recruteur');
  const secLabel = (SECTION_META[ME.section] || [ME.section || '—'])[0];
  const p = openPopover(document.getElementById('profileBtn'), `
    <div class="pop-profile">
      <div class="pop-prof-head">
        <span class="pop-avatar sec-${ME.section || 'aplicacion'}">${escapeHtml(initials(ME.nom || '?'))}</span>
        <div class="pop-prof-id">
          <div class="pop-prof-name">${escapeHtml(ME.nom || '—')}</div>
          <div class="pop-prof-mat">Matricule ${escapeHtml(ME.matricule || '—')}</div>
        </div>
      </div>
      <div class="pop-prof-rows">
        <div><span>Grade</span><b>${escapeHtml(ME.grade || '—')}</b></div>
        <div><span>Section</span><b>${escapeHtml(secLabel)}</b></div>
        <div><span>Statut</span><b>${escapeHtml(ME.statut || '—')}</b></div>
      </div>
      ${perms.length ? `<div class="pop-perms">${perms.map((x) => `<span class="pop-perm">${x}</span>`).join('')}</div>` : ''}
      <button class="btn btn-ghost btn-sm pop-logout" id="popLogout" type="button">Se déconnecter</button>
    </div>`, 'pop-wide');
  p.querySelector('#popLogout').addEventListener('click', () => {
    localStorage.removeItem('milicia.token'); location.reload();
  });
}

function openQuickNew() {
  const items = [['📄', 'Rapport', 'rapports'], ['🚓', 'Patrouille', 'patrouilles'], ['🧹', 'TIG', 'tig']];
  if (ME && (ME.section === 'comando' || ME.section === 'direction')) {
    items.push(['⚖️', 'Sanction', 'sanctions'], ['🎯', 'Opération', 'operations'], ['📢', 'Annonce', 'communications']);
  }
  const p = openPopover(document.getElementById('quickNewBtn'), `
    <div class="pop-menu">
      <div class="pop-menu-title">Créer…</div>
      ${items.map(([ic, l, pg]) => `<button class="pop-menu-item" data-page="${pg}" type="button"><span class="pop-menu-ic">${ic}</span>${l}</button>`).join('')}
    </div>`);
  p.querySelectorAll('.pop-menu-item').forEach((b) => b.addEventListener('click', () => { navigate(b.dataset.page); closePopover(); }));
}

function openNotif() {
  const zoneAlerts = countBy(PAGES.carte.data, 'statut', 'ALERTE');
  const urgent = countBy(PAGES.communications.data, 'priorite', 'URGENTE');
  const total = zoneAlerts + urgent;
  const body = total ? `
    ${zoneAlerts ? `<button class="pop-menu-item" data-page="carte" type="button"><span class="pop-menu-ic">⚠️</span>${zoneAlerts} zone(s) en alerte</button>` : ''}
    ${urgent ? `<button class="pop-menu-item" data-page="communications" type="button"><span class="pop-menu-ic">📢</span>${urgent} annonce(s) urgente(s)</button>` : ''}`
    : '<div class="pop-empty">Aucune alerte en cours.</div>';
  const p = openPopover(document.getElementById('notifBtn'), `
    <div class="pop-menu">
      <div class="pop-menu-title">Notifications</div>
      ${body}
    </div>`);
  p.querySelectorAll('.pop-menu-item').forEach((b) => b.addEventListener('click', () => { navigate(b.dataset.page); closePopover(); }));
}

(function wireTopbar() {
  document.getElementById('profileBtn')?.addEventListener('click', (e) => { e.stopPropagation(); openProfile(); });
  document.getElementById('quickNewBtn')?.addEventListener('click', (e) => { e.stopPropagation(); openQuickNew(); });
  document.getElementById('notifBtn')?.addEventListener('click', (e) => { e.stopPropagation(); openNotif(); });
})();

/* ─────────────────────────────────────────────────────────────
   6. EFFECTIFS : regroupement par section + avatars + badges
   ───────────────────────────────────────────────────────────── */

let EFF_Q = '';

PAGES.effectifs.view = 'custom';
PAGES.effectifs.render = function () {
  const canAdd = !!(ME && (ME.peut_ajouter_effectif || ME.peut_modifier_comptes));
  return `
    <div class="panel-head">
      <div><span class="panel-kicker">Personnel</span><h2 class="panel-title">REGISTRE DU PERSONNEL</h2></div>
      <span class="panel-count" id="effCount">${PAGES.effectifs.data.length}</span>
    </div>
    <div class="filter-row">
      <div class="search-field">
        <input type="text" id="effSearch" placeholder="Rechercher un matricule, un nom, un grade…" autocomplete="off" value="${escapeHtml(EFF_Q)}">
        <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"/><path d="M21 21l-4.35-4.35" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      </div>
      ${canAdd ? `<button class="btn btn-primary" id="effNew"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>NOUVEAU MEMBRE</button>` : ''}
    </div>
    <div id="effGroups"></div>`;
};
PAGES.effectifs.afterRender = function () {
  const root = document.getElementById('customSection');
  const search = root.querySelector('#effSearch');
  search?.addEventListener('input', () => { EFF_Q = search.value; renderEffGroups(); });
  root.querySelector('#effNew')?.addEventListener('click', () => navigate('gestion'));
  renderEffGroups();
};

function effCardHTML(m) {
  const sec = m.section || sectionOfGrade(m.grade);
  return `<div class="eff-card sec-${sec}">
    <span class="eff-avatar sec-${sec}">${escapeHtml(initials(m.nom || '?'))}</span>
    <span class="eff-mat">${escapeHtml(m.matricule)}</span>
    <span class="eff-name">${escapeHtml(m.nom)}</span>
    <span class="eff-grade">${escapeHtml(m.grade || '—')}</span>
    ${badge(m.statut)}
  </div>`;
}

function renderEffGroups() {
  const host = document.getElementById('effGroups');
  if (!host) return;
  const q = EFF_Q.trim().toLowerCase();
  const filtered = PAGES.effectifs.data.filter((m) => !q || [m.matricule, m.nom, m.grade].some((v) => String(v || '').toLowerCase().includes(q)));

  const groups = {};
  filtered.forEach((m) => { const s = m.section || sectionOfGrade(m.grade); (groups[s] = groups[s] || []).push(m); });

  let html = '';
  SECTION_ORDER.forEach((sec) => {
    const arr = groups[sec];
    if (!arr || !arr.length) return;
    arr.sort((a, b) => (Number(b.niveau || 0) - Number(a.niveau || 0)) || (Number(a.matricule) - Number(b.matricule)));
    const [label] = SECTION_META[sec];
    html += `<div class="eff-group">
      <div class="eff-group-head sec-${sec}"><span class="eff-group-name">${label}</span><span class="eff-group-count">${arr.length}</span></div>
      <div class="eff-list">${arr.map(effCardHTML).join('')}</div>
    </div>`;
  });

  host.innerHTML = html || '<div class="empty-state"><div class="empty-title">AUCUN MEMBRE</div><div class="empty-sub">Aucun résultat pour cette recherche.</div></div>';
  const count = document.getElementById('effCount');
  if (count) count.textContent = filtered.length;
}

/* ─────────────────────────────────────────────────────────────
   7. RADIO : cartes de canaux
   ───────────────────────────────────────────────────────────── */

PAGES.radio.view = 'custom';
PAGES.radio.render = function (cfg) {
  return `
    <div class="panel-head">
      <div><span class="panel-kicker">Transmissions</span><h2 class="panel-title">CANAUX ACTIFS</h2></div>
      <span class="panel-count">${cfg.data.length}</span>
    </div>
    <div class="radio-cards">
      ${cfg.data.map((c) => `
        <div class="radio-card">
          <div class="radio-ico"><svg viewBox="0 0 24 24"><rect x="4" y="8" width="16" height="12" rx="2" stroke="currentColor" stroke-width="2"/><path d="M8 8V5a2 2 0 012-2h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="9" cy="14" r="2" stroke="currentColor" stroke-width="2"/><path d="M14 12h3M14 16h3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></div>
          <div class="radio-info">
            <span class="radio-canal">${escapeHtml(c.canal)}</span>
            ${c.usage ? `<span class="radio-usage">${escapeHtml(c.usage)}</span>` : ''}
          </div>
          <div class="radio-freq">${escapeHtml(c.freq)}${c.statut ? `<span class="radio-statut">${badge(c.statut)}</span>` : ''}</div>
        </div>`).join('')}
    </div>`;
};
