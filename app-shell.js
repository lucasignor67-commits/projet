// Ordre d'affichage sur la grille d'accueil
const HOME_ORDER = [
  'effectifs', 'rapports', 'patrouilles', 'operations', 'absence', 'formation',
  'tig', 'saisies', 'hierarchie', 'blacklist', 'communications', 'sanctions', 'documentation',
  'carte', 'radio',
];

let currentPage = 'accueil';

// ── État d'authentification / données serveur ──
let ME = null;        // compte connecté + permissions
let GRADES = [];      // liste des grades (menus déroulants)
let ACCOUNTS = [];    // comptes (page Gestion des comptes)
let FORMS = [];       // formations (page Gestion des formations)
let GEST_SORT = 'matricule'; // tri de la page Gestion des comptes : grade | matricule | recent
let PATROUILLES = [];    // patrouilles (page Patrouilles)
let ABSENCES = [];       // absences (page Absence)
let RAPPORTS = [];       // rapports (page Rapports)
let SANCTIONS = [];      // sanctions (page Sanctions)
let TIGS = [];           // TIG (page TIG)
let SAISIES = [];        // saisies (page Saisies)
let ANNONCES = [];       // annonces (page Communications)
let BLACKLIST = [];      // blacklist (page Blacklist)
let CONTRATS = [];       // contrats de travail (page Recruteur)
let DOCUMENTS = [];      // documents (page Documentation)
let OPERATIONS = [];     // opérations (page Opérations)
let EDITOR_PHOTOS = [];  // photos (data URLs) de l'élément en cours d'édition (annonce / BL)

// ── Éléments DOM ──
const sidebar = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebarToggle');
const homePage = document.getElementById('homePage');
const listPage = document.getElementById('listPage');
const breadcrumb = document.getElementById('breadcrumb');
const pathTag = document.getElementById('pathTag');
const pageTitle = document.getElementById('pageTitle');
const pageDesc = document.getElementById('pageDesc');
const pageStats = document.getElementById('pageStats');
const homeGrid = document.getElementById('homeGrid');

const tableSection = document.getElementById('tableSection');
const customSection = document.getElementById('customSection');
const listKicker = document.getElementById('listKicker');
const listTitle = document.getElementById('listTitle');
const listCount = document.getElementById('listCount');
const searchInput = document.getElementById('searchInput');
const newBtn = document.getElementById('newBtn');
const newBtnLabel = document.getElementById('newBtnLabel');
const tableHead = document.getElementById('tableHead');
const tableBody = document.getElementById('tableBody');
const emptyState = document.getElementById('emptyState');

// ── Sidebar ──
sidebarToggle.addEventListener('click', () => {
  sidebar.classList.toggle('collapsed');
});

// ── Navigation ──
function navigate(page) {
  currentPage = page;

  // États actifs (sidebar + boutons rapides)
  document.querySelectorAll('.nav-item.active, .quick-btn.active').forEach((el) => el.classList.remove('active'));
  document.querySelector(`.nav-item[data-page="${page}"]`)?.classList.add('active');
  document.querySelector(`.quick-btn[data-page="${page}"]`)?.classList.add('active');

  if (page === 'accueil') {
    homePage.hidden = false;
    listPage.hidden = true;
    breadcrumb.innerHTML = 'Accueil';
  } else {
    const cfg = PAGES[page];
    if (!cfg) return;
    homePage.hidden = true;
    listPage.hidden = false;
    breadcrumb.innerHTML = `Accueil&nbsp;/&nbsp;<span>${cfg.title}</span>`;
    pathTag.innerHTML = `MDT&nbsp;/&nbsp;MILICIA&nbsp;/&nbsp;${cfg.title.replace(/ /g, '&nbsp;')}`;
    pageTitle.textContent = cfg.title;
    pageDesc.textContent = cfg.desc;

    // Stats du bandeau
    pageStats.innerHTML = cfg.stats(cfg.data).map(([label, value]) => `
      <div class="stat-box">
        <span class="stat-label">${label}</span>
        <span class="stat-value">${value}</span>
      </div>`).join('');

    if (cfg.view === 'custom') {
      tableSection.hidden = true;
      customSection.hidden = false;
      customSection.innerHTML = cfg.render(cfg);
      if (cfg.afterRender) cfg.afterRender(cfg);
      if (page === 'carte') loadPresence(); // rafraîchit la présence depuis le serveur
    } else {
      customSection.hidden = true;
      tableSection.hidden = false;
      listKicker.textContent = cfg.kicker || 'Registre';
      listTitle.textContent = cfg.listTitle || cfg.title;
      newBtnLabel.textContent = cfg.addLabel || 'AJOUTER';
      searchInput.value = '';
      renderTable();
    }
  }

  if (window.matchMedia('(max-width: 900px)').matches) {
    sidebar.classList.remove('collapsed');
  }

  window.scrollTo({ top: 0 });
}

document.querySelectorAll('.nav-item, .quick-btn[data-page]').forEach((item) => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    navigate(item.dataset.page);
  });
});

// ── Rendu des vues tableau ──
function renderTable() {
  const cfg = PAGES[currentPage];
  if (!cfg || cfg.view === 'custom') return;

  const query = searchInput.value.trim().toLowerCase();
  const filtered = cfg.data.filter(
    (row) => !query || Object.values(row).some((v) => String(v).toLowerCase().includes(query))
  );

  tableHead.innerHTML = `<tr>${cfg.columns
    .map((c) => `<th${c.align === 'right' ? ' class="th-right"' : ''}>${c.label}</th>`)
    .join('')}</tr>`;

  tableBody.innerHTML = filtered
    .map(
      (row) => `<tr>${cfg.columns
        .map((c) => {
          const value = c.badge ? badge(row[c.key]) : row[c.key];
          return `<td${c.align === 'right' ? ' style="text-align:right"' : ''}>${value}</td>`;
        })
        .join('')}</tr>`
    )
    .join('');

  listCount.textContent = filtered.length;
  emptyState.style.display = filtered.length === 0 ? 'block' : 'none';
}

searchInput.addEventListener('input', renderTable);

newBtn.addEventListener('click', () => {
  // L'ajout de membre passe par la Gestion des comptes (droits requis)
  if (currentPage === 'effectifs') {
    if (ME && (ME.peut_ajouter_effectif || ME.peut_modifier_comptes)) navigate('gestion');
    else notify("Seuls les grades Comando / Dirección peuvent ajouter un membre.");
    return;
  }
  notify(`${PAGES[currentPage]?.addLabel || 'Ajouter'} — à implémenter`);
});

// ── Grille de rubriques sur l'accueil ──
function buildHomeGrid() {
  homeGrid.innerHTML = '';
  HOME_ORDER.forEach((page) => {
    const cfg = PAGES[page];
    if (!cfg) return;
    const refIcon =
      document.querySelector(`.nav-item[data-page="${page}"] svg`) ||
      document.querySelector(`.quick-btn[data-page="${page}"] svg`);
    const tile = document.createElement('button');
    tile.className = 'home-tile';
    tile.innerHTML = `
      ${refIcon ? refIcon.outerHTML : cfg.icon || ''}
      <span class="home-tile-name">${cfg.title}</span>
      <svg class="tile-arrow" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    tile.addEventListener('click', () => navigate(page));
    homeGrid.appendChild(tile);
  });
}

// ── Stats de l'accueil ──
function updateHomeStats() {
  document.getElementById('homeEffectifs').textContent = PAGES.effectifs.data.length;
  document.getElementById('homeAlertes').textContent =
    countBy(PAGES.carte.data, 'statut', 'ALERTE') + countBy(PAGES.communications.data, 'priorite', 'URGENTE');
}

// Recalcule le bandeau de stats de la page courante
function refreshStats(page) {
  const cfg = PAGES[page];
  if (!cfg) return;
  pageStats.innerHTML = cfg.stats(cfg.data).map(([label, value]) => `
    <div class="stat-box"><span class="stat-label">${label}</span><span class="stat-value">${value}</span></div>`).join('');
}

/* ═══════════════════════════════════════════════
   AUTHENTIFICATION + API + GESTION DES COMPTES
   ═══════════════════════════════════════════════ */

// Grades de secours (mode démo, sans serveur)
const DEMO_GRADES = [
  { id: 1, nom: 'General', section: 'direction', niveau: 100 },
  { id: 2, nom: 'SubGeneral', section: 'direction', niveau: 95 },
  { id: 3, nom: 'Coronel', section: 'direction', niveau: 90 },
  { id: 4, nom: 'Teniente Coronel', section: 'direction', niveau: 85 },
  { id: 5, nom: 'Comandante', section: 'comando', niveau: 80 },
  { id: 6, nom: 'Capitán Primero', section: 'comando', niveau: 75 },
  { id: 7, nom: 'Capitán Segundo', section: 'comando', niveau: 70 },
  { id: 8, nom: 'Teniente', section: 'comando', niveau: 65 },
  { id: 9, nom: 'Alfarez Primero', section: 'liderazgo', niveau: 60 },
  { id: 10, nom: 'Alfarez Segundo', section: 'liderazgo', niveau: 55 },
  { id: 11, nom: 'Sargento Primero', section: 'liderazgo', niveau: 50 },
  { id: 12, nom: 'Sargento de la Milicia', section: 'liderazgo', niveau: 45 },
  { id: 13, nom: 'Cabo', section: 'aplicacion', niveau: 40 },
  { id: 14, nom: 'Soldado Primera', section: 'aplicacion', niveau: 35 },
  { id: 15, nom: 'Soldado', section: 'aplicacion', niveau: 30 },
  { id: 16, nom: 'Recluta', section: 'aplicacion', niveau: 25 },
];

// Appel API JSON (Vercel serverless + Supabase, auth par token)
const TOKEN_KEY = 'milicia.token';
async function api(action, body) {
  const token = localStorage.getItem(TOKEN_KEY);
  const res = await fetch(`/api/milicia?action=${action}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({ error: 'Réponse serveur invalide' }));
  if (!res.ok || data.error) throw new Error(data.error || `Erreur ${res.status}`);
  return data;
}

const loginOverlay = document.getElementById('loginOverlay');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');

function showLogin(msg) {
  loginOverlay.hidden = false;
  if (msg) { loginError.textContent = msg; loginError.hidden = false; }
}
function hideLogin() { loginOverlay.hidden = true; loginError.hidden = true; }

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.hidden = true;
  const matricule = document.getElementById('loginMat').value.trim();
  const mot_de_passe = document.getElementById('loginPwd').value;
  try {
    const r = await api('login', { matricule, mot_de_passe });
    localStorage.setItem(TOKEN_KEY, r.token);
    ME = r.user;
    hideLogin();
    await afterLogin();
  } catch (err) {
    loginError.textContent = err.message;
    loginError.hidden = false;
  }
});

document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.removeItem(TOKEN_KEY);
  location.reload();
});

// Après connexion : charge les données, applique les droits, ouvre l'accueil
async function afterLogin() {
  if (!ME.demo) {
    try {
      const eff = await api('effectifs');
      setEffectifs(eff);
      const fm = await api('formations');
      if (fm.certifs) PAGES.formation.certifs = fm.certifs;
      if (fm.formations && fm.formations.length) {
        PAGES.formation.formations = fm.formations.map((f) => ({ nom: f.nom, cat: CAT_DB_TO_UI[f.categorie] || 'veh' }));
      }
      GRADES = (await api('grades')).grades || DEMO_GRADES;
    } catch (e) {
      console.warn('Chargement des données:', e.message);
    }
  }

  document.getElementById('operatorName').textContent = `${ME.matricule} | ${ME.nom}`;
  document.getElementById('logoutBtn').hidden = false;

  // Section réservée visible selon les droits
  const canAdmin = ME.peut_ajouter_effectif || ME.peut_modifier_comptes || ME.peut_voir_mdp;
  const canFormateur = ME.formateur || canAdmin;
  const canRecruteur = ME.recruteur || canAdmin;
  document.querySelectorAll('.nav-admin').forEach((el) => { el.hidden = !canAdmin; });
  document.querySelectorAll('.nav-formateur').forEach((el) => { el.hidden = !canFormateur; });
  document.querySelectorAll('.nav-recruteur').forEach((el) => { el.hidden = !canRecruteur; });
  const divider = document.querySelector('.nav-divider.nav-reserved');
  if (divider) divider.hidden = !(canFormateur || canAdmin || canRecruteur);

  buildHomeGrid();
  updateHomeStats();
  navigate('accueil');

  // Présence + temps réel
  await loadPresence();
  setupRealtime();
}

// Abonnement Supabase Realtime : rafraîchit la présence dès qu'un poste change
let RT_CHANNEL = null;
async function setupRealtime() {
  if (!ME || ME.demo || RT_CHANNEL || !window.supabase) return;
  try {
    const cfg = await api('realtime_config');
    if (!cfg.url || !cfg.anonKey) return;
    const sb = window.supabase.createClient(cfg.url, cfg.anonKey, { auth: { persistSession: false } });
    RT_CHANNEL = sb
      .channel('presence-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'presence' }, () => loadPresence())
      .subscribe();
  } catch (e) {
    console.warn('Realtime indisponible :', e.message);
  }
}

