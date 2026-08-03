/* ═══════════════════════════════════════════════
   MILICIA DE CAYO PERICO — MDT
   Navigation + vues par rubrique
   ═══════════════════════════════════════════════ */

// ── Helpers ──
const countBy = (rows, key, value) => rows.filter((r) => r[key] === value).length;

// Tonalité des badges par valeur
const BADGE_TONES = {
  'EN SERVICE': 'green', 'REPOS': 'gray', 'ABSENT': 'amber',
  'TITULAIRE': 'green', 'EN TEST': 'amber',
  'VALIDÉ': 'green', 'EN COURS': 'amber', 'CLASSÉ': 'gray', 'EN ATTENTE': 'amber',
  'VALIDÉE': 'green', 'REFUSÉE': 'red',
  'PLANIFIÉE': 'gray', 'TERMINÉE': 'gray', 'ANNULÉE': 'red', 'ACTIVE': 'green',
  'INCARCÉRÉ': 'red', 'LIBÉRÉ': 'green', 'TRANSFÉRÉ': 'amber',
  'ACTIF': 'red', 'CAPTURÉ': 'green',
  'FAIBLE': 'green', 'MODÉRÉE': 'amber', 'ÉLEVÉE': 'red',
  'MODÉRÉ': 'amber', 'ÉLEVÉ': 'red',
  'NORMALE': 'gray', 'IMPORTANTE': 'amber', 'URGENTE': 'red',
  'AVERTISSEMENT': 'amber', 'BLÂME': 'red', 'RÉTROGRADATION': 'red', 'EXCLUSION': 'red',
  'TOUS': 'green', 'ÉTAT-MAJOR': 'red', 'GRADÉS': 'amber',
  'SÉCURISÉE': 'green', 'SURVEILLANCE': 'amber', 'ALERTE': 'red',
  'RESTREINT': 'amber', 'HORS LIGNE': 'gray',
};

const badge = (value) => `<span class="badge badge-${BADGE_TONES[value] || 'gray'}">${value}</span>`;
const tone = (value) => BADGE_TONES[value] || 'gray';
const initials = (nom) => nom.replace(/[«»"]/g, '').trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();

// ── Présence sur la carte ──
// PRESENCE = { matricule: 'nom du poste } — partagé via Supabase (temps réel).
// En mode démo (sans serveur), sauvegardé dans le navigateur.
let PRESENCE = {};
const DEMO_POSTS_KEY = 'milicia.posts';
const memberName = (mat) => { const e = PAGES.effectifs.data.find((x) => x.matricule === mat); return e ? e.nom : mat; };
const occupantsAt = (nom) => Object.keys(PRESENCE).filter((mat) => PRESENCE[mat] === nom);

// Tri par numéro de matricule croissant (du plus bas au plus haut)
const byMatricule = (a, b) => Number(a.matricule) - Number(b.matricule);
function setEffectifs(eff) {
  PAGES.effectifs.data = eff
    .map((r) => ({ matricule: r.matricule, nom: r.nom, grade: r.grade, statut: r.statut }))
    .sort(byMatricule);
}

// Catégories de formations : clés internes (air/veh/mer) ↔ base (fuerza/ejercito/marina)
const CAT_DB_TO_UI = { fuerza: 'air', ejercito: 'veh', marina: 'mer' };
const CAT_UI_TO_DB = { air: 'fuerza', veh: 'ejercito', mer: 'marina' };
const CAT_OPTS = [['fuerza', 'Fuerza'], ['ejercito', 'Ejército'], ['marina', 'Marina']];

// Recharge la présence (serveur ou démo) puis rafraîchit la carte si affichée
async function loadPresence() {
  if (ME && ME.demo) {
    try { PRESENCE = JSON.parse(localStorage.getItem(DEMO_POSTS_KEY)) || {}; } catch (e) { PRESENCE = {}; }
  } else if (ME) {
    try {
      const r = await api('presence');
      PRESENCE = {};
      (r.presence || []).forEach((p) => { if (p.mat && p.poste) PRESENCE[p.mat] = p.poste; });
    } catch (e) { /* conserve l'état précédent */ }
  }
  if (currentPage === 'carte') rerenderCarte();
}

// Prend / quitte un poste (un seul à la fois)
async function togglePost(nom) {
  if (!ME) return;
  const mat = ME.matricule;
  if (ME.demo) {
    if (PRESENCE[mat] === nom) delete PRESENCE[mat]; else PRESENCE[mat] = nom;
    try { localStorage.setItem(DEMO_POSTS_KEY, JSON.stringify(PRESENCE)); } catch (e) {}
    if (currentPage === 'carte') rerenderCarte();
    return;
  }
  try {
    if (PRESENCE[mat] === nom) await api('presence_clear');
    else await api('presence_set', { poste: nom });
  } catch (e) { alert(e.message); return; }
  await loadPresence(); // le temps réel rafraîchira aussi les autres
}

// Re-rendu de la carte (après changement de présence)
function rerenderCarte() {
  if (currentPage !== 'carte') return;
  const cfg = PAGES.carte;
  const host = document.getElementById('customSection');
  if (!host) return;
  host.innerHTML = cfg.render(cfg);
  cfg.afterRender(cfg);
  refreshStats('carte');
}

// ── Configuration des rubriques ──
const PAGES = {

  /* ─────────── VUES TABLEAU ─────────── */

  effectifs: {
    title: 'EFFECTIFS',
    desc: 'Liste du personnel de la milice, matricules et grades.',
    kicker: 'Personnel',
    listTitle: 'REGISTRE DU PERSONNEL',
    addLabel: 'NOUVEAU MEMBRE',
    columns: [
      { key: 'matricule', label: 'N°' },
      { key: 'nom', label: 'Nom' },
      { key: 'grade', label: 'Grade' },
      { key: 'statut', label: 'Statut', badge: true, align: 'right' },
    ],
    stats: (rows) => [
      ['Effectif', rows.length],
      ['Gradés', rows.filter((r) => r.grade !== 'Recluta').length],
      ['Recrues', countBy(rows, 'grade', 'Recluta')],
      ['En test', countBy(rows, 'statut', 'EN TEST')],
    ],
    data: [
      { matricule: '04', nom: 'Frost Alex', grade: 'Capitán Segundo', statut: 'EN TEST' },
      { matricule: '06', nom: 'Emax Jackson', grade: 'Capitán Primero', statut: 'TITULAIRE' },
      { matricule: '07', nom: 'Freya Myers', grade: 'Recluta', statut: 'TITULAIRE' },
      { matricule: '08', nom: 'Jean Rashford Muani', grade: 'Recluta', statut: 'TITULAIRE' },
      { matricule: '09', nom: 'Julian Salvatore', grade: 'Alfarez Segundo', statut: 'TITULAIRE' },
      { matricule: '10', nom: 'Loann Charvot', grade: 'Recluta', statut: 'TITULAIRE' },
      { matricule: '11', nom: 'Max Emerson', grade: 'Capitán Primero', statut: 'EN TEST' },
      { matricule: '12', nom: 'Perdo Faritasse', grade: 'Recluta', statut: 'TITULAIRE' },
      { matricule: '13', nom: 'Solís Grenadine', grade: 'Alfarez Primero', statut: 'TITULAIRE' },
      { matricule: '14', nom: 'Carlo Avarro', grade: 'Teniente', statut: 'TITULAIRE' },
      { matricule: '15', nom: 'Looping Lee', grade: 'Coronel', statut: 'TITULAIRE' },
      { matricule: '16', nom: 'Esmée Bueno', grade: 'Coronel', statut: 'TITULAIRE' },
      { matricule: '17', nom: 'Elie Abel', grade: 'Recluta', statut: 'TITULAIRE' },
      { matricule: '19', nom: 'Brian Peterson', grade: 'Recluta', statut: 'TITULAIRE' },
      { matricule: '20', nom: 'Reno Leven Toro', grade: 'Recluta', statut: 'TITULAIRE' },
      { matricule: '22', nom: 'Alvaro Cortes', grade: 'Soldado', statut: 'TITULAIRE' },
      { matricule: '24', nom: 'Joachim Ben Messaoud', grade: 'Recluta', statut: 'TITULAIRE' },
      { matricule: '25', nom: 'Jan Nowak', grade: 'Recluta', statut: 'TITULAIRE' },
      { matricule: '26', nom: 'Malik Abik', grade: 'Recluta', statut: 'TITULAIRE' },
      { matricule: '27', nom: 'Perdo Sisa', grade: 'Soldado', statut: 'TITULAIRE' },
      { matricule: '28', nom: 'Ben Rich The-Bee Bueno', grade: 'Recluta', statut: 'TITULAIRE' },
      { matricule: '29', nom: 'Aylan Thoands', grade: 'Recluta', statut: 'TITULAIRE' },
      { matricule: '30', nom: 'Damon Peterson', grade: 'Recluta', statut: 'TITULAIRE' },
      { matricule: '31', nom: 'Wolf Smith Nolan', grade: 'Teniente', statut: 'TITULAIRE' },
      { matricule: '33', nom: 'Gwenn Loera', grade: 'Recluta', statut: 'TITULAIRE' },
      { matricule: '34', nom: 'Hargrove Eloann', grade: 'Recluta', statut: 'TITULAIRE' },
      { matricule: '35', nom: 'Delacruz Carlos', grade: 'Recluta', statut: 'TITULAIRE' },
      { matricule: '36', nom: 'Diego Alvarez', grade: 'Recluta', statut: 'TITULAIRE' },
      { matricule: '37', nom: 'Jhonn Sléman', grade: 'Soldado', statut: 'TITULAIRE' },
      { matricule: '38', nom: 'Béné Ghanzalez', grade: 'Recluta', statut: 'TITULAIRE' },
      { matricule: '42', nom: 'Hamilton Andy', grade: 'Soldado', statut: 'TITULAIRE' },
      { matricule: '43', nom: 'Laponne Mattéo', grade: 'Coronel', statut: 'TITULAIRE' },
      { matricule: '44', nom: 'Sergio Artys', grade: 'Capitán Segundo', statut: 'TITULAIRE' },
      { matricule: '45', nom: 'Rayan Fox', grade: 'Recluta', statut: 'TITULAIRE' },
      { matricule: '46', nom: 'Tom Kirkmant', grade: 'Recluta', statut: 'TITULAIRE' },
      { matricule: '47', nom: 'Tazer Jacob', grade: 'Recluta', statut: 'TITULAIRE' },
      { matricule: '48', nom: 'Callisto Reyes', grade: 'Teniente Coronel', statut: 'EN TEST' },
      { matricule: '49', nom: 'Cédric Moreno', grade: 'Recluta', statut: 'TITULAIRE' },
      { matricule: '51', nom: 'Diego Ramirez', grade: 'Recluta', statut: 'TITULAIRE' },
      { matricule: '52', nom: 'Couper Boss', grade: 'Recluta', statut: 'TITULAIRE' },
      { matricule: '53', nom: 'Rico Ad', grade: 'Recluta', statut: 'TITULAIRE' },
      { matricule: '55', nom: 'Pablito Escanor', grade: 'Soldado', statut: 'TITULAIRE' },
      { matricule: '56', nom: 'Myers Rima', grade: 'Recluta', statut: 'TITULAIRE' },
      { matricule: '58', nom: 'Mora Jordan', grade: 'Recluta', statut: 'TITULAIRE' },
      { matricule: '59', nom: 'Gianni Lampuza', grade: 'Alfarez Segundo', statut: 'TITULAIRE' },
      { matricule: '62', nom: 'Valesco Lee Riley', grade: 'Teniente', statut: 'TITULAIRE' },
      { matricule: '64', nom: 'Lopesse Karl', grade: 'Recluta', statut: 'TITULAIRE' },
      { matricule: '65', nom: 'Juan El Sueno', grade: 'Teniente', statut: 'EN TEST' },
      { matricule: '66', nom: 'Hakim Mahgoumgo', grade: 'Soldado Primera', statut: 'TITULAIRE' },
      { matricule: '67', nom: 'James Bobby', grade: 'Recluta', statut: 'TITULAIRE' },
      { matricule: '68', nom: 'Rivera Emilio', grade: 'Alfarez Primero', statut: 'EN TEST' },
      { matricule: '69', nom: 'Clément Landy', grade: 'Recluta', statut: 'TITULAIRE' },
      { matricule: '71', nom: 'Mathis Luke', grade: 'Recluta', statut: 'TITULAIRE' },
      { matricule: '73', nom: 'Ricardo Peirrera', grade: 'Recluta', statut: 'TITULAIRE' },
      { matricule: '74', nom: 'Lucas Martin', grade: 'Sargento', statut: 'TITULAIRE' },
      { matricule: '77', nom: 'Livio Santos', grade: 'Sargento', statut: 'TITULAIRE' },
      { matricule: '78', nom: 'Djess Less', grade: 'Recluta', statut: 'TITULAIRE' },
      { matricule: '80', nom: 'Eren Kohlman', grade: 'Recluta', statut: 'TITULAIRE' },
      { matricule: '82', nom: 'Bernardo Wedson', grade: 'Cabo', statut: 'EN TEST' },
      { matricule: '83', nom: 'Clode Myers', grade: 'Recluta', statut: 'TITULAIRE' },
      { matricule: '85', nom: 'Alsan Guesumov', grade: 'Recluta', statut: 'TITULAIRE' },
      { matricule: '87', nom: 'Dovis Diego', grade: 'Recluta', statut: 'TITULAIRE' },
      { matricule: '88', nom: 'Fox Nina', grade: 'Alfarez Primero', statut: 'TITULAIRE' },
      { matricule: '89', nom: 'Jason Larkay', grade: 'Recluta', statut: 'TITULAIRE' },
      { matricule: '90', nom: 'Joe Billy', grade: 'Recluta', statut: 'TITULAIRE' },
    ],
  },

  rapports: {
    title: 'RAPPORTS',
    desc: 'Rédiger et consulter les rapports de la milice.',
    view: 'custom',
    get data() { return RAPPORTS; },
    stats: (rows) => [
      ['Rapports', rows.length],
      ['Les miens', rows.filter((r) => ME && r.auteur_matricule === ME.matricule).length],
    ],
    render: () => `<div id="rapRoot" class="gestion-root">Chargement…</div>`,
    afterRender: () => loadRapports(),
  },

  patrouilles: {
    title: 'PATROUILLES',
    desc: 'Créer et suivre les patrouilles en cours et terminées.',
    view: 'custom',
    get data() { return PATROUILLES; },
    stats: (rows) => [
      ['Total', rows.length],
      ['En cours', rows.filter((r) => r.statut === 'EN COURS').length],
      ['Terminées', rows.filter((r) => r.statut === 'TERMINÉE').length],
      ['Fixes', rows.filter((r) => r.type === 'fixe').length],
    ],
    render: () => `<div id="patRoot" class="gestion-root">Chargement…</div>`,
    afterRender: () => loadPatrouilles(),
  },

  operations: {
    title: 'OPÉRATIONS',
    desc: 'Opérations en cours et archives du commandement.',
    kicker: 'Commandement',
    listTitle: 'REGISTRE DES OPÉRATIONS',
    addLabel: 'NOUVELLE OPÉRATION',
    columns: [
      { key: 'code', label: 'Code' },
      { key: 'objectif', label: 'Objectif' },
      { key: 'responsable', label: 'Responsable' },
      { key: 'date', label: 'Date' },
      { key: 'statut', label: 'Statut', badge: true, align: 'right' },
    ],
    stats: (rows) => [
      ['Total', rows.length],
      ['En cours', countBy(rows, 'statut', 'EN COURS')],
      ['Planifiées', countBy(rows, 'statut', 'PLANIFIÉE')],
      ['Terminées', countBy(rows, 'statut', 'TERMINÉE')],
    ],
    data: [
      { code: 'OP-ALCATRAZ', objectif: 'Sécurisation du périmètre du camp', responsable: 'El Comandante', date: '25/07/2026', statut: 'PLANIFIÉE' },
      { code: 'OP-TIBURÓN', objectif: 'Escorte du convoi maritime', responsable: 'Mateo Vargas', date: '22/07/2026', statut: 'EN COURS' },
      { code: 'OP-JAGUAR', objectif: 'Ratissage des plantations', responsable: 'Lucía Fuentes', date: '12/07/2026', statut: 'TERMINÉE' },
    ],
  },

  absence: {
    title: 'ABSENCE',
    desc: 'Déclarez votre absence — vous êtes automatiquement identifié.',
    view: 'custom',
    get data() { return ABSENCES; },
    stats: (rows) => [
      ['Absences', rows.length],
      ['Les miennes', rows.filter((r) => ME && r.matricule === ME.matricule).length],
    ],
    render: () => `<div id="absRoot" class="gestion-root">Chargement…</div>`,
    afterRender: () => loadAbsences(),
  },

  detenus: {
    title: 'DÉTENUS',
    desc: 'Registre des détenus et suivi des incarcérations.',
    kicker: 'Détention',
    listTitle: 'REGISTRE DES DÉTENUS',
    addLabel: 'NOUVELLE INCARCÉRATION',
    columns: [
      { key: 'nom', label: 'Nom' },
      { key: 'motif', label: 'Motif' },
      { key: 'cellule', label: 'Cellule' },
      { key: 'entree', label: 'Entrée' },
      { key: 'duree', label: 'Durée' },
      { key: 'statut', label: 'Statut', badge: true, align: 'right' },
    ],
    stats: (rows) => [
      ['Total', rows.length],
      ['Incarcérés', countBy(rows, 'statut', 'INCARCÉRÉ')],
      ['Libérés', countBy(rows, 'statut', 'LIBÉRÉ')],
      ['Cellules', 4],
    ],
    data: [
      { nom: 'Jax Turner', motif: 'Espionnage présumé', cellule: 'C-03', entree: '23/07/2026 02:05', duree: 'Indéterminée', statut: 'INCARCÉRÉ' },
      { nom: 'Rico Morales', motif: 'Intrusion zone militaire', cellule: 'C-01', entree: '22/07/2026 20:14', duree: '48h', statut: 'INCARCÉRÉ' },
      { nom: 'Sofía Delgado', motif: 'Vol de matériel', cellule: 'C-02', entree: '21/07/2026 15:40', duree: '24h', statut: 'LIBÉRÉ' },
    ],
  },

  blacklist: {
    title: 'BLACKLIST',
    desc: 'Personnes interdites de territoire ou signalées au commandement.',
    kicker: 'Sécurité',
    listTitle: 'PERSONNES BANNIES',
    addLabel: 'AJOUTER À LA BLACKLIST',
    columns: [
      { key: 'nom', label: 'Nom' },
      { key: 'motif', label: 'Motif' },
      { key: 'niveau', label: 'Niveau', badge: true },
      { key: 'par', label: 'Ajouté par' },
      { key: 'date', label: 'Date', align: 'right' },
    ],
    stats: (rows) => [
      ['Total', rows.length],
      ['Niveau élevé', countBy(rows, 'niveau', 'ÉLEVÉ')],
      ['Niveau modéré', countBy(rows, 'niveau', 'MODÉRÉ')],
      ['Ce mois', rows.length],
    ],
    data: [
      { nom: 'Danny Ruiz', motif: 'Trafic sur le territoire', niveau: 'ÉLEVÉ', par: 'El Comandante', date: '18/07/2026' },
      { nom: 'Kira Volkov', motif: "Tentative d'infiltration", niveau: 'ÉLEVÉ', par: 'Mateo Vargas', date: '14/07/2026' },
      { nom: 'Leo Marchetti', motif: 'Dettes impayées', niveau: 'MODÉRÉ', par: 'Lucía Fuentes', date: '09/07/2026' },
    ],
  },

  sanctions: {
    title: 'SANCTIONS',
    desc: 'Registre disciplinaire de la milice.',
    view: 'custom',
    get data() { return SANCTIONS; },
    stats: (rows) => [
      ['Total', rows.length],
      ['Avertissements', rows.filter((r) => r.type === 'AVERTISSEMENT').length],
      ['Blâmes', rows.filter((r) => r.type === 'BLÂME').length],
      ['Rétrogradations', rows.filter((r) => r.type === 'RÉTROGRADATION').length],
    ],
    render: () => `<div id="sancRoot" class="gestion-root">Chargement…</div>`,
    afterRender: () => loadSanctions(),
  },

  radio: {
    title: 'RADIO',
    desc: 'Canaux radio cryptés de la milice.',
    kicker: 'Transmissions',
    listTitle: 'CANAUX ACTIFS',
    addLabel: 'NOUVEAU CANAL',
    columns: [
      { key: 'canal', label: 'Canal' },
      { key: 'freq', label: 'Fréquence' },
      { key: 'usage', label: 'Usage' },
      { key: 'acces', label: 'Accès' },
      { key: 'statut', label: 'Statut', badge: true, align: 'right' },
    ],
    stats: (rows) => [
      ['Canaux', rows.length],
      ['Actifs', countBy(rows, 'statut', 'ACTIVE')],
      ['Restreints', countBy(rows, 'statut', 'RESTREINT')],
      ['Hors ligne', countBy(rows, 'statut', 'HORS LIGNE')],
    ],
    data: [
      { canal: 'MILICIA-1', freq: '447.7 MHz', usage: 'Canal principal', acces: 'Tous', statut: 'ACTIVE' },
      { canal: 'MILICIA-2', freq: '448.2 MHz', usage: 'Patrouilles', acces: 'Tous', statut: 'ACTIVE' },
      { canal: 'MILICIA-OPS', freq: '449.9 MHz', usage: 'Opérations spéciales', acces: 'État-major', statut: 'RESTREINT' },
      { canal: 'URGENCE', freq: '450.0 MHz', usage: "Canal d'urgence", acces: 'Tous', statut: 'ACTIVE' },
      { canal: 'MILICIA-LOG', freq: '451.4 MHz', usage: 'Logistique', acces: 'Gradés', statut: 'HORS LIGNE' },
    ],
  },

  /* ─────────── VUES PERSONNALISÉES ─────────── */

  carte: {
    title: 'CARTE',
    desc: "Carte tactique de l'île — zones contrôlées et points d'intérêt.",
    view: 'custom',
    icon: '<svg viewBox="0 0 24 24"><path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M9 4v14M15 6v14" stroke="currentColor" stroke-width="2"/></svg>',
    stats: (zones) => {
      const enPoste = Object.values(PRESENCE).filter((nom) => zones.some((z) => z.nom === nom)).length;
      return [
        ['Zones', zones.length],
        ['Sécurisées', countBy(zones, 'statut', 'SÉCURISÉE')],
        ['Alerte', countBy(zones, 'statut', 'ALERTE')],
        ['En poste', enPoste],
      ];
    },
    data: [
      { nom: 'Aérodrome', x: 37, y: 21, statut: 'SÉCURISÉE' },
      { nom: 'Frontière', x: 69, y: 43, statut: 'SURVEILLANCE' },
      { nom: 'Port armée', x: 59, y: 52, statut: 'SÉCURISÉE' },
      { nom: 'entré zone rouge', x: 61, y: 72, statut: 'ALERTE' },
      { nom: 'Champ de feuille', x: 78, y: 60, statut: 'SÉCURISÉE' },
      { nom: 'Patrouille Terrestre', x: 8, y: 40, statut: 'SÉCURISÉE' },
      { nom: 'Patrouille Maritime', x: 8, y: 51, statut: 'SÉCURISÉE' },
      { nom: 'Patrouille Aérienne', x: 8, y: 45, statut: 'SÉCURISÉE' },
      { nom: 'En formation', x: 93, y: 5, statut: 'SURVEILLANCE' },
      { nom: 'Surveillance TIG', x: 93, y: 10, statut: 'SÉCURISÉE' },
    ],
    render: function (cfg) {
      const me = ME ? ME.matricule : '';
      const myPost = (me && PRESENCE[me]) || '';

      return `
      <div class="panel-head">
        <div>
          <span class="panel-kicker">Vue tactique</span>
          <h2 class="panel-title">CARTE DE L'ÎLE</h2>
        </div>
        <div class="map-tools">
          <span class="panel-count">${cfg.data.length} ZONES</span>
          <button class="btn btn-ghost btn-sm" id="mapEdit">ÉDITER</button>
        </div>
      </div>

      <div class="post-bar">
        <div class="post-me">Vous : <b>${me ? `${me} | ${ME.nom}` : '—'}</b></div>
        <div class="post-current">
          ${myPost
            ? `En poste : <b>${myPost}</b> <button class="btn btn-ghost btn-sm" id="leavePost">QUITTER</button>`
            : `<span class="post-hint">Cliquez un point sur la carte pour prendre votre poste.</span>`}
        </div>
      </div>

      <div class="map-wrap">
        <img class="map-img" src="map.jpg" alt="Carte de Cayo Perico"
             onerror="this.closest('.map-wrap').classList.add('map-missing')">
        ${cfg.data.map((z, i) => {
          const occ = occupantsAt(z.nom);
          const mine = me && myPost === z.nom;
          return `
          <div class="map-marker tone-${tone(z.statut)}${occ.length ? ' occupied' : ''}${mine ? ' mine' : ''}" data-idx="${i}" style="left:${z.x}%; top:${z.y}%">
            <span class="marker-dot">${occ.length ? occ.length : ''}</span>
            <span class="marker-label">${z.nom}</span>
          </div>`;
        }).join('')}
        ${(() => {
          const zone = cfg._openPoint ? cfg.data.find((z) => z.nom === cfg._openPoint) : null;
          if (!zone) return '';
          const occ = occupantsAt(zone.nom);
          const tx = zone.x > 55 ? 'calc(-100% - 14px)' : '14px';
          const ty = zone.y > 58 ? 'calc(-100% - 14px)' : '14px';
          return `
          <div class="post-popup" style="left:${zone.x}%; top:${zone.y}%; transform: translate(${tx}, ${ty});">
            <div class="popup-head">
              <span class="marker-dot tone-${tone(zone.statut)}"></span>
              <span class="popup-title">${zone.nom}</span>
              ${badge(zone.statut)}
              <button class="popup-close" id="popupClose" title="Fermer">✕</button>
            </div>
            <div class="popup-action">
              ${me
                ? (myPost === zone.nom
                    ? `<button class="btn btn-ghost btn-sm" id="popupToggle">QUITTER LE POSTE</button>`
                    : `<button class="btn btn-primary btn-sm" id="popupToggle">PRENDRE LE POSTE</button>`)
                : `<span class="post-hint">Sélectionnez votre matricule dans « Vous êtes » pour prendre ce poste.</span>`}
            </div>
            <div class="popup-sub">À ce poste</div>
            <div class="popup-people">
              ${occ.length
                ? occ.map((mat) => `<span class="op-chip${mat === me ? ' me' : ''}"><b>${mat}</b> ${memberName(mat)}</span>`).join('')
                : '<span class="presence-empty">Personne à ce poste</span>'}
            </div>
          </div>`;
        })()}
        <div class="map-placeholder">
          <div class="empty-title">CARTE INDISPONIBLE</div>
          <div class="empty-sub">Déposez l'image de l'île dans <b>map.jpg</b> pour l'afficher ici.</div>
        </div>
      </div>

      <div class="map-edit-bar" id="mapEditBar" hidden>
        <div class="map-readout" id="mapReadout">Glissez un point sur la carte pour le déplacer, ou modifiez son nom / statut ci-dessous.</div>
        <div class="pt-editor" id="ptEditor"></div>
        <div class="map-edit-actions">
          <button class="btn btn-ghost btn-sm" id="mapAdd">+ AJOUTER UN POINT</button>
          <button class="btn btn-primary btn-sm" id="mapCopy">COPIER LES COORDONNÉES</button>
        </div>
      </div>

      <div class="panel-head" style="margin-top:20px">
        <div>
          <span class="panel-kicker">Présence</span>
          <h2 class="panel-title">QUI EST OÙ</h2>
        </div>
        <span class="panel-count">${Object.values(PRESENCE).filter((n) => cfg.data.some((z) => z.nom === n)).length} EN POSTE</span>
      </div>
      <div class="presence">
        ${cfg.data.map((z) => {
          const occ = occupantsAt(z.nom);
          return `
          <div class="presence-row">
            <span class="marker-dot tone-${tone(z.statut)}"></span>
            <span class="presence-name">${z.nom}</span>
            <span class="presence-people">
              ${occ.length
                ? occ.map((mat) => `<span class="op-chip${mat === me ? ' me' : ''}"><b>${mat}</b> ${memberName(mat)}</span>`).join('')
                : '<span class="presence-empty">personne</span>'}
            </span>
          </div>`;
        }).join('')}
      </div>`;
    },

    afterRender: function (cfg) {
      const host = document.getElementById('customSection');
      const wrap = host.querySelector('.map-wrap');
      const img = wrap.querySelector('.map-img');
      const editBtn = host.querySelector('#mapEdit');
      const editBar = host.querySelector('#mapEditBar');
      const readout = host.querySelector('#mapReadout');
      const copyBtn = host.querySelector('#mapCopy');
      const addBtn = host.querySelector('#mapAdd');
      const ptEditor = host.querySelector('#ptEditor');
      const STATUTS = ['SÉCURISÉE', 'SURVEILLANCE', 'ALERTE'];
      let drag = null;

      // Reconstruit toute la vue (après ajout / suppression / changement de statut)
      const rerender = () => {
        host.innerHTML = cfg.render(cfg);
        cfg.afterRender(cfg);
        document.getElementById('pageStats').innerHTML = cfg
          .stats(cfg.data)
          .map(([l, v]) => `<div class="stat-box"><span class="stat-label">${l}</span><span class="stat-value">${v}</span></div>`)
          .join('');
      };

      // Restaure l'état d'édition après un rerender
      const applyEditing = () => {
        wrap.classList.toggle('editing', !!cfg._editing);
        editBtn.textContent = cfg._editing ? 'TERMINER' : 'ÉDITER';
        editBar.hidden = !cfg._editing;
      };
      applyEditing();

      editBtn.addEventListener('click', () => { cfg._editing = !cfg._editing; applyEditing(); });

      // ── Prise de poste (présence, partagée) ──
      host.querySelector('#leavePost')?.addEventListener('click', () => {
        if (ME && PRESENCE[ME.matricule]) togglePost(PRESENCE[ME.matricule]);
      });

      // Clic sur un marqueur = ouvre / ferme le panneau du poste (hors mode édition)
      wrap.querySelectorAll('.map-marker').forEach((m) => {
        m.addEventListener('click', (e) => {
          if (cfg._editing) return;
          e.stopPropagation();
          const nom = cfg.data[+m.dataset.idx].nom;
          cfg._openPoint = cfg._openPoint === nom ? null : nom;
          rerender();
        });
      });

      // Panneau de poste : prendre / quitter / fermer
      host.querySelector('#popupClose')?.addEventListener('click', () => { cfg._openPoint = null; rerender(); });
      host.querySelector('#popupToggle')?.addEventListener('click', () => {
        if (cfg._openPoint) togglePost(cfg._openPoint);
      });

      // ── Éditeur de points (nom + statut + suppression) ──
      ptEditor.innerHTML = cfg.data
        .map((z, i) => `
          <div class="pt-row" data-idx="${i}">
            <span class="pt-dot tone-${tone(z.statut)}"></span>
            <input class="pt-name" type="text" value="${z.nom.replace(/"/g, '&quot;')}" placeholder="Nom du point">
            <select class="pt-status">${STATUTS.map((s) => `<option${s === z.statut ? ' selected' : ''}>${s}</option>`).join('')}</select>
            <button class="pt-del" title="Supprimer ce point">✕</button>
          </div>`)
        .join('');

      ptEditor.querySelectorAll('.pt-row').forEach((row) => {
        const i = +row.dataset.idx;
        const nameInput = row.querySelector('.pt-name');
        // Renommage en direct (sans reconstruire, pour ne pas perdre le focus)
        nameInput.addEventListener('input', () => {
          cfg.data[i].nom = nameInput.value;
          const lbl = wrap.querySelector(`.map-marker[data-idx="${i}"] .marker-label`);
          if (lbl) lbl.textContent = nameInput.value;
          const leg = host.querySelectorAll('.legend-name')[i];
          if (leg) leg.textContent = nameInput.value;
        });
        row.querySelector('.pt-status').addEventListener('change', (e) => {
          cfg.data[i].statut = e.target.value;
          rerender();
        });
        row.querySelector('.pt-del').addEventListener('click', () => {
          cfg.data.splice(i, 1);
          rerender();
        });
      });

      addBtn?.addEventListener('click', () => {
        cfg.data.push({ nom: 'Nouvelle zone', x: 50, y: 50, statut: 'SÉCURISÉE' });
        rerender();
      });

      // ── Glisser-déposer des marqueurs ──
      const toPct = (e) => {
        const r = img.getBoundingClientRect();
        return {
          x: Math.min(100, Math.max(0, ((e.clientX - r.left) / r.width) * 100)),
          y: Math.min(100, Math.max(0, ((e.clientY - r.top) / r.height) * 100)),
        };
      };

      wrap.querySelectorAll('.map-marker').forEach((m) => {
        m.addEventListener('pointerdown', (e) => {
          if (!cfg._editing) return;
          e.preventDefault();
          drag = m;
          m.classList.add('dragging');
          m.setPointerCapture(e.pointerId);
        });
        m.addEventListener('pointermove', (e) => {
          if (drag !== m) return;
          const p = toPct(e);
          const i = +m.dataset.idx;
          m.style.left = p.x + '%';
          m.style.top = p.y + '%';
          cfg.data[i].x = Math.round(p.x);
          cfg.data[i].y = Math.round(p.y);
          readout.textContent = `${cfg.data[i].nom} → x: ${cfg.data[i].x}  y: ${cfg.data[i].y}`;
        });
        const end = (e) => {
          if (drag === m) { m.classList.remove('dragging'); m.releasePointerCapture(e.pointerId); drag = null; }
        };
        m.addEventListener('pointerup', end);
        m.addEventListener('pointercancel', end);
      });

      copyBtn.addEventListener('click', () => {
        const txt = cfg.data
          .map((z) => `      { nom: '${z.nom.replace(/'/g, "\\'")}', x: ${z.x}, y: ${z.y}, statut: '${z.statut}' },`)
          .join('\n');
        navigator.clipboard?.writeText(txt).then(
          () => { copyBtn.textContent = 'COPIÉ ✓'; setTimeout(() => (copyBtn.textContent = 'COPIER LES COORDONNÉES'), 1500); },
          () => { readout.textContent = txt; }
        );
      });
    },
  },

  hierarchie: {
    title: 'HIÉRARCHIE',
    desc: 'Organigramme du gouvernement de Cayo Perico et grades de la milice.',
    view: 'custom',
    stats: (sections) => {
      const roles = sections.filter((s) => s.roles).flatMap((s) => s.roles);
      const grades = sections.filter((s) => s.grades).flatMap((s) => s.grades);
      return [
        ['Postes occupés', roles.filter((r) => r.titulaire).length],
        ['Postes vacants', roles.filter((r) => !r.titulaire).length],
        ['Grades', grades.length],
        ['Sections', sections.length],
      ];
    },
    data: [
      {
        nom: '🎖️ Gobierno de Cayo Perico',
        roles: [
          { poste: 'Presidente', titulaire: 'Sr. Quica' },
          { poste: 'Vicepresidente', titulaire: '' },
          { poste: 'Jefe del Gobierno', titulaire: '' },
          { poste: 'Secretario General', titulaire: 'Sr. Sam Boudj' },
          { poste: 'Ministro de la Defensa', titulaire: '' },
        ],
      },
      {
        nom: '⭐ Dirección de la Milicia',
        roles: [
          { poste: 'General de la Milicia', titulaire: '' },
          { poste: 'SubGeneral de la Milicia', titulaire: '' },
          { poste: 'Responsable Maritime', titulaire: '16 | Esmée Bueno' },
          { poste: 'Adjunto Maritime', titulaire: '44 | Sergio Artys / EMS Diego.A' },
          { poste: 'Responsable Ejército', titulaire: '15 | Looping Lee' },
          { poste: 'Adjunto Ejército', titulaire: '62 | Riley Lee Valesco' },
          { poste: 'Responsable Fuerza', titulaire: '43 | Laponne Mattéo' },
          { poste: 'Adjunto Fuerza', titulaire: '31 | Nolan Wolf Smith' },
          { poste: 'Coronel', titulaire: '' },
          { poste: 'Teniente Coronel', titulaire: '' },
        ],
      },
      { nom: 'Comando', grades: ['Comandante', 'Capitán Primero', 'Capitán Segundo', 'Teniente'] },
      { nom: 'Liderazgo', grades: ['Alfarez Primero', 'Alfarez Segundo', 'Sargento Primero', 'Sargento de la Milicia'] },
      { nom: 'Aplicación', grades: ['Cabo', 'Soldado Primera', 'Soldado', 'Recluta'] },
    ],
    render: (cfg) => `
      <div class="panel-head">
        <div>
          <span class="panel-kicker">Organigramme</span>
          <h2 class="panel-title">CHAÎNE DE COMMANDEMENT</h2>
        </div>
      </div>
      ${cfg.data.map((sec) => `
        <div class="hier-section">
          <h3 class="hier-title">${sec.nom}</h3>
          ${sec.roles
            ? `<div class="hier-grid">${sec.roles.map((r) => `
                <div class="role-card${r.titulaire ? '' : ' vacant'}">
                  <span class="role-poste">${r.poste}</span>
                  <span class="role-holder">${r.titulaire || 'POSTE VACANT'}</span>
                </div>`).join('')}</div>`
            : `<div class="grade-ladder">${[...sec.grades].reverse().map((g, i) => `
                <div class="grade-chip"><span class="grade-rank">${i + 1}</span>${g}</div>`).join('')}</div>`}
        </div>`).join('')}`,
  },

  formation: {
    title: 'FORMATION',
    desc: 'Matrice des certifications — quel matricule possède quelle formation.',
    view: 'custom',

    // Liste des formations, regroupées par famille (air / véhicule / maritime)
    formations: [
      { nom: 'MAS', cat: 'air' },
      { nom: 'Pilote avancée', cat: 'air' },
      { nom: 'Pilote', cat: 'air' },
      { nom: 'Artilleur', cat: 'air' },
      { nom: 'CQB / DRESS', cat: 'veh' },
      { nom: 'Camion', cat: 'veh' },
      { nom: 'Winky', cat: 'veh' },
      { nom: 'Patrouille', cat: 'veh' },
      { nom: 'Quad', cat: 'veh' },
      { nom: 'Moto', cat: 'veh' },
      { nom: 'DBM', cat: 'mer' },
      { nom: 'Bateau avancée', cat: 'mer' },
      { nom: 'Bateau', cat: 'mer' },
      { nom: 'Plongée', cat: 'mer' },
      { nom: 'Squaddie', cat: 'mer' },
    ],

    // Certifications par matricule (les membres viennent de la page Effectifs).
    // Pour donner une formation à un matricule, ajoute son nom exact dans son tableau.
    certifs: {
      '15': ['MAS', 'Pilote avancée', 'Pilote', 'Artilleur', 'Camion', 'Winky', 'Patrouille', 'Quad', 'Moto'],
      '16': ['DBM', 'Bateau avancée', 'Bateau', 'Plongée', 'Squaddie', 'Patrouille', 'Winky'],
      '43': ['CQB / DRESS', 'Camion', 'Winky', 'Patrouille', 'Quad', 'Moto'],
      '14': ['Winky', 'Patrouille', 'Quad', 'Bateau'],
      '31': ['Camion', 'Winky', 'Patrouille', 'Quad', 'Moto'],
      '62': ['Winky', 'Patrouille', 'Quad', 'Bateau', 'Squaddie'],
      '06': ['Pilote', 'Artilleur', 'Winky', 'Patrouille'],
      '44': ['Winky', 'Patrouille', 'Quad', 'Camion'],
    },

    // Liste dérivée de la page Effectifs
    get data() {
      return PAGES.effectifs.data.map((m) => ({
        mat: m.matricule,
        nom: m.nom,
        forms: PAGES.formation.certifs[m.matricule] || [],
      }));
    },

    stats: function (rows) {
      const totalCerts = rows.reduce((s, m) => s + m.forms.length, 0);
      return [
        ['Membres', rows.length],
        ['Formations', this.formations.length],
        ['Certifications', totalCerts],
        ['Moyenne / membre', (totalCerts / rows.length).toFixed(1)],
      ];
    },

    render: function (cfg) {
      const catLabel = { air: 'FUERZA', veh: 'EJÉRCITO', mer: 'MARINA' };
      const cats = ['air', 'veh', 'mer'];
      // Colonnes regroupées par catégorie (une nouvelle formation reste dans sa famille)
      const forms = cats.flatMap((c) => cfg.formations.filter((f) => f.cat === c));

      // En-tête groupé par famille
      const groupHead = cats
        .map((c) => {
          const span = forms.filter((f) => f.cat === c).length;
          return span ? `<th class="grp cat-${c}" colspan="${span}">${catLabel[c]}</th>` : '';
        })
        .join('');

      // En-tête des formations (texte vertical)
      const formHead = forms
        .map((f) => `<th class="fcol cat-${f.cat}"><span>${f.nom}</span></th>`)
        .join('');

      // Lignes membres
      const body = cfg.data
        .map((m) => {
          const cells = forms
            .map((f) => {
              const has = m.forms.includes(f.nom);
              return `<td class="cell${has ? ' on cat-' + f.cat : ''}">${has
                ? '<svg viewBox="0 0 24 24"><path d="M5 12l5 5 9-10" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>'
                : '·'}</td>`;
            })
            .join('');
          return `<tr>
            <td class="mrow">
              <span class="mmat">${m.mat}</span>
              <span class="mname">${m.nom}</span>
            </td>
            <td class="mcount">${m.forms.length}</td>
            ${cells}
          </tr>`;
        })
        .join('');

      return `
        <div class="panel-head">
          <div>
            <span class="panel-kicker">Certifications</span>
            <h2 class="panel-title">MATRICE DES FORMATIONS</h2>
          </div>
          <span class="panel-count">${cfg.data.length} MEMBRES · ${cfg.formations.length} FORMATIONS</span>
        </div>
        <div class="matrix-legend">
          <span class="lg cat-air">Fuerza</span>
          <span class="lg cat-veh">Ejército</span>
          <span class="lg cat-mer">Marina</span>
        </div>
        <div class="table-wrap matrix-wrap">
          <table class="matrix">
            <thead>
              <tr>
                <th class="mrow" rowspan="2">Matricule</th>
                <th class="mcount" rowspan="2">Nb</th>
                ${groupHead}
              </tr>
              <tr>${formHead}</tr>
            </thead>
            <tbody>${body}</tbody>
          </table>
        </div>`;
    },
  },

  communications: {
    title: 'COMMUNICATIONS',
    desc: 'Annonces et messages internes de la milice.',
    view: 'custom',
    stats: (rows) => [
      ['Total', rows.length],
      ['Urgentes', countBy(rows, 'priorite', 'URGENTE')],
      ['Importantes', countBy(rows, 'priorite', 'IMPORTANTE')],
      ['Normales', countBy(rows, 'priorite', 'NORMALE')],
    ],
    data: [
      { titre: 'Activité suspecte repérée au large', texte: "Un bateau non identifié croise au nord-est de l'île depuis 02h00. Toutes les patrouilles maritimes doivent redoubler de vigilance et signaler tout contact.", canal: 'Sécurité', auteur: 'Mateo Vargas', date: '23/07/2026 — 06:12', priorite: 'URGENTE' },
      { titre: 'Rotation des gardes modifiée', texte: "À compter de lundi, la relève du poste de guet est passe de 3 à 2 rotations par jour. Consultez le planning mis à jour dans la documentation.", canal: 'Interne', auteur: 'El Comandante', date: '22/07/2026 — 18:40', priorite: 'IMPORTANTE' },
      { titre: 'Maintenance des véhicules jeudi', texte: "Les Squaddie et le Vetir seront immobilisés jeudi matin pour révision. Prévoyez les patrouilles en conséquence.", canal: 'Logistique', auteur: 'Lucía Fuentes', date: '20/07/2026 — 09:15', priorite: 'NORMALE' },
    ],
    render: (cfg) => `
      <div class="panel-head">
        <div>
          <span class="panel-kicker">Diffusion</span>
          <h2 class="panel-title">ANNONCES INTERNES</h2>
        </div>
        <span class="panel-count">${cfg.data.length}</span>
      </div>
      <div class="feed">
        ${cfg.data.map((m) => `
          <article class="feed-item tone-${tone(m.priorite)}">
            <div class="feed-head">
              <span class="feed-title">${m.titre}</span>
              ${badge(m.priorite)}
            </div>
            <p class="feed-text">${m.texte}</p>
            <div class="feed-meta">${m.canal} &nbsp;·&nbsp; ${m.auteur} &nbsp;·&nbsp; ${m.date}</div>
          </article>`).join('')}
      </div>`,
  },

  documentation: {
    title: 'DOCUMENTATION',
    desc: 'Règlement interne, procédures et guides de la milice.',
    view: 'custom',
    stats: (rows) => [
      ['Documents', rows.length],
      ['Accès libre', countBy(rows, 'acces', 'TOUS')],
      ['État-major', countBy(rows, 'acces', 'ÉTAT-MAJOR')],
      ['Catégories', new Set(rows.map((r) => r.categorie)).size],
    ],
    data: [
      { titre: 'Règlement interne v2', categorie: 'Règlement', auteur: 'El Comandante', maj: '01/07/2026', acces: 'TOUS' },
      { titre: "Procédure d'incarcération", categorie: 'Procédure', auteur: 'Mateo Vargas', maj: '05/07/2026', acces: 'TOUS' },
      { titre: 'Codes radio', categorie: 'Opérationnel', auteur: 'Lucía Fuentes', maj: '12/07/2026', acces: 'GRADÉS' },
      { titre: 'Plan de défense du camp', categorie: 'Confidentiel', auteur: 'El Comandante', maj: '15/07/2026', acces: 'ÉTAT-MAJOR' },
    ],
    render: (cfg) => `
      <div class="panel-head">
        <div>
          <span class="panel-kicker">Références</span>
          <h2 class="panel-title">DOCUMENTS INTERNES</h2>
        </div>
        <span class="panel-count">${cfg.data.length}</span>
      </div>
      <div class="doc-list">
        ${cfg.data.map((d) => `
          <article class="doc-item">
            <div class="doc-icon">
              <svg viewBox="0 0 24 24"><path d="M6 2h9l5 5v15H6V2z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M14 2v6h6" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>
            </div>
            <div class="doc-info">
              <div class="doc-title">${d.titre}</div>
              <div class="doc-meta">${d.categorie} &nbsp;·&nbsp; ${d.auteur} &nbsp;·&nbsp; MAJ ${d.maj}</div>
            </div>
            ${badge(d.acces)}
            <button class="btn btn-ghost btn-sm">CONSULTER</button>
          </article>`).join('')}
      </div>`,
  },

  /* ─────────── GESTION DES COMPTES (réservé) ─────────── */
  gestion: {
    title: 'GESTION DES COMPTES',
    desc: 'Administration des comptes, grades et mots de passe. Accès réservé.',
    view: 'custom',
    get data() { return ACCOUNTS; },
    stats: (rows) => [
      ['Comptes', rows.length],
      ['Actifs', rows.filter((r) => Number(r.actif) !== 0).length],
      ['En test', rows.filter((r) => r.statut === 'EN TEST').length],
      ['Grades', new Set(rows.map((r) => r.grade)).size],
    ],
    render: () => `<div id="gestionRoot" class="gestion-root">Chargement…</div>`,
    afterRender: () => loadGestion(),
  },

  /* ─────────── GESTION DES FORMATIONS (réservé) ─────────── */
  gestion_formations: {
    title: 'GESTION DES FORMATIONS',
    desc: 'Ajouter, modifier ou retirer les formations (colonnes de la matrice).',
    view: 'custom',
    get data() { return FORMS; },
    stats: (rows) => [
      ['Formations', rows.length],
      ['Fuerza', rows.filter((r) => r.categorie === 'fuerza').length],
      ['Ejército', rows.filter((r) => r.categorie === 'ejercito').length],
      ['Marina', rows.filter((r) => r.categorie === 'marina').length],
    ],
    render: () => `<div id="gestFormRoot" class="gestion-root">Chargement…</div>`,
    afterRender: () => loadGestionFormations(),
  },

  /* ─────────── DEBRIEF SOLDAT (formateurs) ─────────── */
  debrief: {
    title: 'DEBRIEF SOLDAT',
    desc: 'Mise à jour des formations des miliciens — cliquez une case pour cocher / décocher.',
    view: 'custom',
    get data() { return PAGES.formation.data; },
    stats: (rows) => {
      const total = rows.reduce((s, m) => s + m.forms.length, 0);
      return [
        ['Membres', rows.length],
        ['Formations', PAGES.formation.formations.length],
        ['Certifications', total],
        ['Moyenne / membre', rows.length ? (total / rows.length).toFixed(1) : '0'],
      ];
    },
    render: function (cfg) {
      const members = cfg.data;
      const catLabel = { air: 'FUERZA', veh: 'EJÉRCITO', mer: 'MARINA' };
      const cats = ['air', 'veh', 'mer'];
      // Colonnes regroupées par catégorie (une nouvelle formation reste dans sa famille)
      const formations = cats.flatMap((c) => PAGES.formation.formations.filter((f) => f.cat === c));
      const check = '<svg viewBox="0 0 24 24"><path d="M5 12l5 5 9-10" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';

      const groupHead = cats.map((c) => {
        const span = formations.filter((f) => f.cat === c).length;
        return span ? `<th class="grp cat-${c}" colspan="${span}">${catLabel[c]}</th>` : '';
      }).join('');
      const formHead = formations.map((f) => `<th class="fcol cat-${f.cat}"><span>${f.nom}</span></th>`).join('');
      const body = members.map((m) => {
        const cells = formations.map((f) => {
          const has = m.forms.includes(f.nom);
          return `<td class="cell editable${has ? ' on cat-' + f.cat : ''}" data-mat="${m.mat}" data-form="${f.nom.replace(/"/g, '&quot;')}" data-has="${has ? 1 : 0}">${has ? check : '·'}</td>`;
        }).join('');
        return `<tr>
          <td class="mrow"><span class="mmat">${m.mat}</span><span class="mname">${m.nom}</span></td>
          <td class="mcount">${m.forms.length}</td>${cells}</tr>`;
      }).join('');

      return `
        <div class="panel-head">
          <div><span class="panel-kicker">Formateur</span><h2 class="panel-title">MISE À JOUR DES FORMATIONS</h2></div>
          <span class="panel-count">Cliquez une case pour cocher / décocher</span>
        </div>
        <div class="matrix-legend">
          <span class="lg cat-air">Fuerza</span>
          <span class="lg cat-veh">Ejército</span>
          <span class="lg cat-mer">Marina</span>
        </div>
        <div class="table-wrap matrix-wrap">
          <table class="matrix">
            <thead>
              <tr><th class="mrow" rowspan="2">Matricule</th><th class="mcount" rowspan="2">Nb</th>${groupHead}</tr>
              <tr>${formHead}</tr>
            </thead>
            <tbody>${body}</tbody>
          </table>
        </div>`;
    },
    afterRender: function () {
      const host = document.getElementById('customSection');
      host.querySelectorAll('.cell.editable').forEach((td) => {
        td.addEventListener('click', () => {
          certifToggle(td.dataset.mat, td.dataset.form, td.dataset.has !== '1');
        });
      });
    },
  },
};

// Ordre d'affichage sur la grille d'accueil
const HOME_ORDER = [
  'effectifs', 'rapports', 'patrouilles', 'operations', 'absence', 'formation',
  'detenus', 'hierarchie', 'blacklist', 'communications', 'sanctions', 'documentation',
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
    else alert("Seuls les grades Comando / Dirección peuvent ajouter un membre.");
    return;
  }
  alert(`${PAGES[currentPage]?.addLabel || 'Ajouter'} — à implémenter`);
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

// Mode démo : pas de serveur, droits Dirección complets sur les données locales
document.getElementById('loginDemo').addEventListener('click', async () => {
  ME = {
    matricule: '00', nom: 'Démo Dirección', grade: 'General', section: 'direction', niveau: 100,
    peut_ajouter_effectif: 1, peut_modifier_comptes: 1, peut_voir_mdp: 1, peut_gerer_grades: 1, demo: true,
  };
  GRADES = DEMO_GRADES;
  hideLogin();
  await afterLogin();
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
  document.querySelectorAll('.nav-admin').forEach((el) => { el.hidden = !canAdmin; });
  document.querySelectorAll('.nav-formateur').forEach((el) => { el.hidden = !canFormateur; });
  const divider = document.querySelector('.nav-divider.nav-reserved');
  if (divider) divider.hidden = !(canFormateur || canAdmin);

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

// ── Page Gestion des comptes ──
async function loadGestion() {
  const root = document.getElementById('gestionRoot');
  if (!root) return;
  try {
    if (ME.demo) {
      ACCOUNTS = PAGES.effectifs.data.map((e) => ({
        matricule: e.matricule, nom: e.nom, grade: e.grade, statut: e.statut, actif: 1,
        grade_id: (DEMO_GRADES.find((g) => g.nom === e.grade) || {}).id,
        mot_de_passe: 'MILICIA-' + e.matricule,
      }));
    } else {
      ACCOUNTS = (await api('accounts')).accounts || [];
    }
  } catch (e) {
    root.innerHTML = `<div class="empty-state"><div class="empty-title">ACCÈS REFUSÉ</div><div class="empty-sub">${e.message}</div></div>`;
    return;
  }
  renderGestion();
  refreshStats('gestion');
}

function gradeOptions(selectedId) {
  return GRADES.map((g) => `<option value="${g.id}"${Number(g.id) === Number(selectedId) ? ' selected' : ''}>${g.nom}</option>`).join('');
}

// Trie une copie des comptes selon GEST_SORT
function sortAccounts(list) {
  const arr = [...list];
  const niveauOf = (id) => (GRADES.find((g) => Number(g.id) === Number(id)) || {}).niveau || 0;
  if (GEST_SORT === 'matricule') {
    arr.sort((a, b) => Number(a.matricule) - Number(b.matricule));
  } else if (GEST_SORT === 'recent') {
    arr.sort((a, b) => String(b.date_creation || '').localeCompare(String(a.date_creation || '')) || Number(b.matricule) - Number(a.matricule));
  } else { // grade (du plus haut au plus bas, puis matricule)
    arr.sort((a, b) => niveauOf(b.grade_id) - niveauOf(a.grade_id) || Number(a.matricule) - Number(b.matricule));
  }
  return arr;
}

function renderGestion() {
  const root = document.getElementById('gestionRoot');
  const canAdd = !!ME.peut_ajouter_effectif;
  const canEdit = !!ME.peut_modifier_comptes;
  const canPwd = !!ME.peut_voir_mdp;
  const dis = canEdit ? '' : 'disabled';

  const addRow = canAdd ? `
    <div class="gest-add">
      <input class="gest-in" id="addMat" placeholder="N°" style="max-width:70px">
      <input class="gest-in" id="addNom" placeholder="Nom complet">
      <select class="gest-in" id="addGrade">${gradeOptions(16)}</select>
      <select class="gest-in" id="addStatut"><option>TITULAIRE</option><option>EN TEST</option></select>
      <input class="gest-in" id="addPwd" placeholder="Mot de passe (auto si vide)">
      <button class="btn btn-primary btn-sm" id="addBtn">AJOUTER</button>
    </div>` : '';

  const sortOpts = [['grade', 'Grade'], ['matricule', 'Matricule'], ['recent', 'Dernier inscrit']];
  const rows = sortAccounts(ACCOUNTS).map((a) => `
    <tr data-mat="${a.matricule}">
      <td class="gest-mat">${a.matricule}</td>
      <td><input class="gest-in gest-nom" value="${(a.nom || '').replace(/"/g, '&quot;')}" ${dis}></td>
      <td><select class="gest-in gest-grade" ${dis}>${gradeOptions(a.grade_id)}</select></td>
      <td><select class="gest-in gest-statut" ${dis}>
        <option${a.statut === 'TITULAIRE' ? ' selected' : ''}>TITULAIRE</option>
        <option${a.statut === 'EN TEST' ? ' selected' : ''}>EN TEST</option>
      </select></td>
      ${canPwd ? `<td><input class="gest-in gest-pwd" value="${(a.mot_de_passe || '').replace(/"/g, '&quot;')}" ${dis}></td>` : ''}
      <td style="text-align:center">
        <label class="switch" title="Peut accéder à Debrief soldat">
          <input type="checkbox" class="gest-formateur" ${a.formateur ? 'checked' : ''} ${dis}>
          <span class="switch-slider"></span>
        </label>
      </td>
      <td class="gest-actions">
        ${canEdit ? `<button class="btn btn-ghost btn-sm gest-save">Enregistrer</button>
        <button class="gest-del" title="Supprimer">✕</button>` : '<span class="gest-ro">lecture seule</span>'}
      </td>
    </tr>`).join('');

  root.innerHTML = `
    <div class="panel-head">
      <div>
        <span class="panel-kicker">Administration</span>
        <h2 class="panel-title">COMPTES</h2>
      </div>
      <div class="gest-tools">
        <label class="gest-sort">Trier par
          <select id="gestSort">
            ${sortOpts.map(([v, l]) => `<option value="${v}"${v === GEST_SORT ? ' selected' : ''}>${l}</option>`).join('')}
          </select>
        </label>
        <span class="panel-count">${ACCOUNTS.length} COMPTES</span>
      </div>
    </div>
    ${addRow}
    <div class="table-wrap">
      <table class="data-table gest-table">
        <thead><tr>
          <th>N°</th><th>Nom</th><th>Grade</th><th>Statut</th>${canPwd ? '<th>Mot de passe</th>' : ''}<th>Formateur</th><th class="th-right">Actions</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;

  // Tri
  root.querySelector('#gestSort')?.addEventListener('change', (e) => {
    GEST_SORT = e.target.value;
    renderGestion();
  });

  // Ajout
  root.querySelector('#addBtn')?.addEventListener('click', async () => {
    const payload = {
      matricule: root.querySelector('#addMat').value.trim(),
      nom: root.querySelector('#addNom').value.trim(),
      grade_id: +root.querySelector('#addGrade').value,
      statut: root.querySelector('#addStatut').value,
      mot_de_passe: root.querySelector('#addPwd').value,
    };
    if (!payload.matricule || !payload.nom) { alert('Matricule et nom obligatoires.'); return; }
    await accountAdd(payload);
  });

  // Enregistrer / Supprimer par ligne
  root.querySelectorAll('tr[data-mat]').forEach((tr) => {
    const mat = tr.dataset.mat;
    tr.querySelector('.gest-save')?.addEventListener('click', async () => {
      await accountUpdate({
        matricule: mat,
        nom: tr.querySelector('.gest-nom').value.trim(),
        grade_id: +tr.querySelector('.gest-grade').value,
        statut: tr.querySelector('.gest-statut').value,
        mot_de_passe: tr.querySelector('.gest-pwd') ? tr.querySelector('.gest-pwd').value : undefined,
        formateur: tr.querySelector('.gest-formateur') ? tr.querySelector('.gest-formateur').checked : undefined,
      });
    });
    tr.querySelector('.gest-del')?.addEventListener('click', async () => {
      if (!confirm(`Supprimer le compte ${mat} ?`)) return;
      await accountDelete(mat);
    });
  });
}

// Actions comptes (serveur ou démo local)
async function accountAdd(p) {
  if (ME.demo) {
    if (PAGES.effectifs.data.some((e) => e.matricule === p.matricule)) { alert('Matricule déjà utilisé.'); return; }
    const grade = (DEMO_GRADES.find((g) => g.id === p.grade_id) || {}).nom || 'Recluta';
    PAGES.effectifs.data.push({ matricule: p.matricule, nom: p.nom, grade, statut: p.statut });
    PAGES.effectifs.data.sort(byMatricule);
  } else {
    try { await api('account_add', p); await api('effectifs').then((eff) => setEffectifs(eff)); }
    catch (e) { alert(e.message); return; }
  }
  updateHomeStats();
  await loadGestion();
}

async function accountUpdate(p) {
  if (ME.demo) {
    const grade = (DEMO_GRADES.find((g) => g.id === p.grade_id) || {}).nom || 'Recluta';
    const row = PAGES.effectifs.data.find((e) => e.matricule === p.matricule);
    if (row) { row.nom = p.nom; row.grade = grade; row.statut = p.statut; }
  } else {
    try { await api('account_update', p); await api('effectifs').then((eff) => setEffectifs(eff)); }
    catch (e) { alert(e.message); return; }
  }
  await loadGestion();
}

async function accountDelete(mat) {
  if (ME.demo) {
    PAGES.effectifs.data = PAGES.effectifs.data.filter((e) => e.matricule !== mat);
  } else {
    try { await api('account_delete', { matricule: mat }); await api('effectifs').then((eff) => setEffectifs(eff)); }
    catch (e) { alert(e.message); return; }
  }
  updateHomeStats();
  await loadGestion();
}

// ── Page Sanctions ──
const SANC_TYPES = ['AVERTISSEMENT', 'BLÂME', 'RÉTROGRADATION', 'EXCLUSION'];

async function loadSanctions() {
  const root = document.getElementById('sancRoot');
  if (!root) return;
  try {
    if (!ME.demo) SANCTIONS = (await api('sanctions')).sanctions || [];
  } catch (e) {
    root.innerHTML = `<div class="empty-state"><div class="empty-title">ERREUR</div><div class="empty-sub">${e.message}</div></div>`;
    return;
  }
  renderSanctions();
  refreshStats('sanctions');
}

function sanctionRow(s, canDel) {
  return `<tr>
    <td>${escapeHtml(s.membre) || '—'}</td>
    <td>${badge(s.type)}</td>
    <td>${escapeHtml(s.motif) || '—'}</td>
    <td>${escapeHtml(s.prononcee_par) || '—'}</td>
    <td${canDel ? '' : ' style="text-align:right"'}>${escapeHtml(s.date_sanction) || '—'}</td>
    ${canDel ? `<td class="th-right"><button class="gest-del sanc-del" data-id="${s.id}" title="Supprimer"><svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2M6 7l1 13a1 1 0 001 1h8a1 1 0 001-1l1-13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button></td>` : ''}
  </tr>`;
}

function renderSanctions() {
  const root = document.getElementById('sancRoot');
  if (!root) return;
  // Seuls le Commandement / Direction peuvent encoder ou supprimer
  const canManage = !!(ME && (ME.section === 'comando' || ME.section === 'direction'));

  root.innerHTML = `
    <div class="panel-head">
      <div><span class="panel-kicker">Discipline</span><h2 class="panel-title">REGISTRE DISCIPLINAIRE</h2></div>
      <span class="panel-count" id="sancCount">${SANCTIONS.length}</span>
    </div>
    <div class="filter-row">
      <div class="search-field">
        <input type="text" id="sancSearch" placeholder="Rechercher dans la rubrique" autocomplete="off">
        <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"/><path d="M21 21l-4.35-4.35" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      </div>
      ${canManage ? `<button class="btn btn-primary" id="sancNew">
        <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        NOUVELLE SANCTION
      </button>` : ''}
    </div>

    ${canManage ? `
    <div class="sanc-form" id="sancForm" hidden>
      <input class="gest-in" id="sancMembre" placeholder="Membre (matricule + nom)">
      <select class="gest-in" id="sancType">${SANC_TYPES.map((t) => `<option>${t}</option>`).join('')}</select>
      <input class="gest-in" id="sancMotif" placeholder="Motif">
      <div class="field-with-bolt">
        <input class="gest-in" id="sancDate" placeholder="Date (JJ/MM/AAAA)">
        <button class="bolt-btn" id="sancDateNow" type="button" title="Aujourd'hui"><svg viewBox="0 0 24 24"><path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" fill="currentColor"/></svg></button>
      </div>
      <button class="btn btn-primary btn-sm" id="sancAddBtn">ENREGISTRER</button>
    </div>` : ''}

    <div class="table-wrap">
      <table class="data-table">
        <thead><tr>
          <th>Membre</th><th>Type</th><th>Motif</th><th>Prononcée par</th>
          <th${canManage ? '' : ' class="th-right"'}>Date</th>${canManage ? '<th class="th-right">Action</th>' : ''}
        </tr></thead>
        <tbody id="sancBody">${SANCTIONS.map((s) => sanctionRow(s, canManage)).join('')}</tbody>
      </table>
      ${SANCTIONS.length ? '' : '<div class="empty-state"><div class="empty-title">AUCUNE SANCTION</div><div class="empty-sub">Le registre disciplinaire est vide.</div></div>'}
    </div>`;

  // Recherche (met à jour seulement le corps du tableau)
  const search = root.querySelector('#sancSearch');
  search.addEventListener('input', () => {
    const q = search.value.trim().toLowerCase();
    const filtered = SANCTIONS.filter((s) => !q || [s.membre, s.type, s.motif, s.prononcee_par, s.date_sanction].some((v) => String(v || '').toLowerCase().includes(q)));
    root.querySelector('#sancBody').innerHTML = filtered.map((s) => sanctionRow(s, canManage)).join('');
    root.querySelector('#sancCount').textContent = filtered.length;
    root.querySelectorAll('.sanc-del').forEach((b) => b.addEventListener('click', () => { if (confirm('Supprimer cette sanction ?')) sanctionDelete(+b.dataset.id); }));
  });

  if (canManage) {
    const form = root.querySelector('#sancForm');
    root.querySelector('#sancNew').addEventListener('click', () => { form.hidden = !form.hidden; });
    root.querySelector('#sancDateNow').addEventListener('click', () => { root.querySelector('#sancDate').value = todayFR(); });
    root.querySelector('#sancAddBtn').addEventListener('click', () => {
      sanctionAdd({
        membre: root.querySelector('#sancMembre').value.trim(),
        type: root.querySelector('#sancType').value,
        motif: root.querySelector('#sancMotif').value.trim(),
        date_sanction: root.querySelector('#sancDate').value.trim(),
      });
    });
  }
  root.querySelectorAll('.sanc-del').forEach((b) => b.addEventListener('click', () => { if (confirm('Supprimer cette sanction ?')) sanctionDelete(+b.dataset.id); }));
}

async function reloadSanctions() {
  try { SANCTIONS = (await api('sanctions')).sanctions || []; } catch (e) {}
}

async function sanctionAdd(p) {
  if (!p.membre || !p.motif || !p.date_sanction) { alert('Membre, motif et date sont obligatoires.'); return; }
  if (ME.demo) {
    SANCTIONS.unshift({ id: Date.now(), prononcee_par: ME.nom, auteur_matricule: ME.matricule, ...p });
  } else {
    try { await api('sanction_add', p); } catch (e) { alert(e.message); return; }
    await reloadSanctions();
  }
  renderSanctions();
  refreshStats('sanctions');
}

async function sanctionDelete(id) {
  if (ME.demo) {
    SANCTIONS = SANCTIONS.filter((x) => x.id !== id);
  } else {
    try { await api('sanction_delete', { id }); } catch (e) { alert(e.message); return; }
    await reloadSanctions();
  }
  renderSanctions();
  refreshStats('sanctions');
}

// ── Page Rapports ──
async function loadRapports() {
  const root = document.getElementById('rapRoot');
  if (!root) return;
  try {
    if (!ME.demo) RAPPORTS = (await api('rapports')).rapports || [];
  } catch (e) {
    root.innerHTML = `<div class="empty-state"><div class="empty-title">ERREUR</div><div class="empty-sub">${e.message}</div></div>`;
    return;
  }
  renderRapports();
  refreshStats('rapports');
}

function escapeHtml(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

function renderRapports() {
  const root = document.getElementById('rapRoot');
  if (!root) return;
  // Seuls le Commandement (comando) et la Direction (direction) peuvent supprimer
  const canDel = !!(ME && (ME.section === 'comando' || ME.section === 'direction'));

  const cards = RAPPORTS.map((r) => `
    <article class="rap-card${ME && r.auteur_matricule === ME.matricule ? ' mine' : ''}">
      <div class="rap-head">
        <span class="rap-date">${escapeHtml(r.date_rapport) || '—'}</span>
        <span class="rap-by">Rapport par ${escapeHtml(r.agent_rapport) || '—'}</span>
      </div>
      <div class="rap-line"><span>Agent concerné</span><b>${escapeHtml(r.concerne) || '—'}</b></div>
      <div class="rap-block"><span>Fait commis</span><p>${escapeHtml(r.fait) || '—'}</p></div>
      ${r.note ? `<div class="rap-block"><span>Note supplémentaire</span><p>${escapeHtml(r.note)}</p></div>` : ''}
      ${canDel ? `<div class="rap-actions">
        <button class="btn btn-danger btn-sm rap-del" data-id="${r.id}">
          <svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2M6 7l1 13a1 1 0 001 1h8a1 1 0 001-1l1-13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          SUPPRIMER LE RAPPORT
        </button>
      </div>` : ''}
    </article>`).join('');

  root.innerHTML = `
    <div class="panel-head">
      <div><span class="panel-kicker">Nouveau</span><h2 class="panel-title">RÉDIGER UN RAPPORT</h2></div>
    </div>
    <div class="rap-form">
      <label class="rap-field">
        <span>Date <em>*</em></span>
        <div class="field-with-bolt">
          <input class="gest-in" id="rapDate" placeholder="JJ/MM/AAAA">
          <button class="bolt-btn" id="rapDateNow" type="button" title="Aujourd'hui">
            <svg viewBox="0 0 24 24"><path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" fill="currentColor"/></svg>
          </button>
        </div>
      </label>
      <label class="rap-field">
        <span>Matricule de l'agent qui fait le rapport <em>*</em></span>
        <input class="gest-in" id="rapAgent" value="${ME ? escapeHtml(ME.matricule) : ''}" placeholder="Votre matricule">
      </label>
      <label class="rap-field">
        <span>Matricule de l'agent + Nom + Prénom <em>*</em></span>
        <input class="gest-in" id="rapConcerne" placeholder="Ex. 59 Gianni Lampuza">
      </label>
      <label class="rap-field">
        <span>Fait commis <em>*</em></span>
        <textarea class="gest-in rap-area" id="rapFait" placeholder="Décrivez les faits…"></textarea>
      </label>
      <label class="rap-field">
        <span>Note supplémentaire</span>
        <textarea class="gest-in rap-area" id="rapNote" placeholder="Facultatif"></textarea>
      </label>
      <button class="btn btn-primary btn-sm" id="rapAddBtn">ENREGISTRER LE RAPPORT</button>
    </div>

    <div class="panel-head" style="margin-top:20px">
      <div><span class="panel-kicker">Registre</span><h2 class="panel-title">RAPPORTS</h2></div>
      <span class="panel-count">${RAPPORTS.length}</span>
    </div>
    ${RAPPORTS.length ? `<div class="rap-grid">${cards}</div>`
      : '<div class="empty-state"><div class="empty-title">AUCUN RAPPORT</div><div class="empty-sub">Rédigez-en un avec le formulaire ci-dessus.</div></div>'}`;

  root.querySelector('#rapDateNow').addEventListener('click', () => { root.querySelector('#rapDate').value = todayFR(); });
  root.querySelector('#rapAddBtn').addEventListener('click', () => {
    rapportAdd({
      date_rapport: root.querySelector('#rapDate').value.trim(),
      agent_rapport: root.querySelector('#rapAgent').value.trim(),
      concerne: root.querySelector('#rapConcerne').value.trim(),
      fait: root.querySelector('#rapFait').value.trim(),
      note: root.querySelector('#rapNote').value.trim(),
    });
  });
  root.querySelectorAll('.rap-del').forEach((b) => b.addEventListener('click', () => {
    if (confirm('Supprimer ce rapport ?')) rapportDelete(+b.dataset.id);
  }));
}

async function reloadRapports() {
  try { RAPPORTS = (await api('rapports')).rapports || []; } catch (e) {}
}

async function rapportAdd(p) {
  if (!p.date_rapport || !p.agent_rapport || !p.concerne || !p.fait) {
    alert('Merci de remplir les champs obligatoires (marqués *).');
    return;
  }
  if (ME.demo) {
    RAPPORTS.unshift({ id: Date.now(), auteur_matricule: ME.matricule, ...p });
  } else {
    try { await api('rapport_add', p); } catch (e) { alert(e.message); return; }
    await reloadRapports();
  }
  renderRapports();
  refreshStats('rapports');
}

async function rapportDelete(id) {
  if (ME.demo) {
    RAPPORTS = RAPPORTS.filter((x) => x.id !== id);
  } else {
    try { await api('rapport_delete', { id }); } catch (e) { alert(e.message); return; }
    await reloadRapports();
  }
  renderRapports();
  refreshStats('rapports');
}

// ── Page Absence ──
const todayFR = () => { const d = new Date(); return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`; };
const nowFRDateTime = () => `${todayFR()} ${String(new Date().getHours()).padStart(2, '0')}H`;

async function loadAbsences() {
  const root = document.getElementById('absRoot');
  if (!root) return;
  try {
    if (!ME.demo) ABSENCES = (await api('absences')).absences || [];
  } catch (e) {
    root.innerHTML = `<div class="empty-state"><div class="empty-title">ERREUR</div><div class="empty-sub">${e.message}</div></div>`;
    return;
  }
  renderAbsences();
  refreshStats('absence');
}

function renderAbsences() {
  const root = document.getElementById('absRoot');
  if (!root) return;
  const canDelAll = !!ME.peut_modifier_comptes;

  const cards = ABSENCES.map((a) => {
    const canDel = canDelAll || (ME && a.matricule === ME.matricule);
    return `
    <article class="abs-card${ME && a.matricule === ME.matricule ? ' mine' : ''}">
      ${canDel ? `<button class="gest-del abs-del" data-id="${a.id}" title="Supprimer">✕</button>` : ''}
      <div class="abs-line"><span>Matricule</span><b>${a.matricule || '—'}</b></div>
      <div class="abs-line"><span>Nom/Prénom</span><b>${a.nom || '—'}</b></div>
      <div class="abs-line"><span>Date de départ</span><b>${a.date_depart || '—'}</b></div>
      <div class="abs-line"><span>Date de retour</span><b>${a.date_retour || '—'}</b></div>
      <div class="abs-line"><span>Raison</span><b>${a.raison || '—'}</b></div>
    </article>`;
  }).join('');

  root.innerHTML = `
    <div class="panel-head">
      <div><span class="panel-kicker">Déclaration</span><h2 class="panel-title">POSER UNE ABSENCE</h2></div>
    </div>
    <div class="abs-form">
      <div class="abs-you">Vous : <b>${ME ? `${ME.matricule} | ${ME.nom}` : '—'}</b></div>
      <div class="abs-fields">
        <div class="field-with-bolt">
          <input class="gest-in" id="absDep" placeholder="Date de départ (ex. 04/08/2026 18H)">
          <button class="bolt-btn" id="absDepNow" type="button" title="Mettre aujourd'hui">
            <svg viewBox="0 0 24 24"><path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" fill="currentColor"/></svg>
          </button>
        </div>
        <div class="field-with-bolt">
          <input class="gest-in" id="absRet" placeholder="Date de retour (ex. 28/08/2026)">
          <button class="bolt-btn" id="absRetNow" type="button" title="Mettre aujourd'hui">
            <svg viewBox="0 0 24 24"><path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" fill="currentColor"/></svg>
          </button>
        </div>
        <input class="gest-in" id="absRaison" placeholder="Raison (ex. vacances)">
        <button class="btn btn-primary btn-sm" id="absAddBtn">DÉCLARER</button>
      </div>
    </div>

    <div class="panel-head" style="margin-top:20px">
      <div><span class="panel-kicker">Registre</span><h2 class="panel-title">ABSENCES</h2></div>
      <span class="panel-count">${ABSENCES.length}</span>
    </div>
    ${ABSENCES.length ? `<div class="abs-grid">${cards}</div>`
      : '<div class="empty-state"><div class="empty-title">AUCUNE ABSENCE</div><div class="empty-sub">Déclarez la vôtre avec le formulaire ci-dessus.</div></div>'}`;

  root.querySelector('#absDepNow').addEventListener('click', () => { root.querySelector('#absDep').value = nowFRDateTime(); });
  root.querySelector('#absRetNow').addEventListener('click', () => { root.querySelector('#absRet').value = todayFR(); });

  root.querySelector('#absAddBtn').addEventListener('click', () => {
    absenceAdd({
      date_depart: root.querySelector('#absDep').value.trim(),
      date_retour: root.querySelector('#absRet').value.trim(),
      raison: root.querySelector('#absRaison').value.trim(),
    });
  });
  root.querySelectorAll('.abs-del').forEach((b) => b.addEventListener('click', () => {
    if (confirm('Supprimer cette absence ?')) absenceDelete(+b.dataset.id);
  }));
}

async function reloadAbsences() {
  try { ABSENCES = (await api('absences')).absences || []; } catch (e) {}
}

async function absenceAdd(p) {
  if (!p.date_depart || !p.date_retour) { alert('Indiquez la date de départ et de retour.'); return; }
  if (ME.demo) {
    ABSENCES.unshift({ id: Date.now(), matricule: ME.matricule, nom: ME.nom, ...p });
  } else {
    try { await api('absence_add', p); } catch (e) { alert(e.message); return; }
    await reloadAbsences();
  }
  renderAbsences();
  refreshStats('absence');
}

async function absenceDelete(id) {
  if (ME.demo) {
    ABSENCES = ABSENCES.filter((x) => x.id !== id);
  } else {
    try { await api('absence_delete', { id }); } catch (e) { alert(e.message); return; }
    await reloadAbsences();
  }
  renderAbsences();
  refreshStats('absence');
}

// ── Page Patrouilles ──
const nowHM = () => { const d = new Date(); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
const PAT_TYPES = [['aerienne', 'Aérienne'], ['terrestre', 'Terrestre'], ['marine', 'Marine'], ['fixe', 'Fixe']];
const PAT_TYPE_LABEL = { aerienne: 'Aérienne', terrestre: 'Terrestre', marine: 'Marine', fixe: 'Fixe' };

async function loadPatrouilles() {
  const root = document.getElementById('patRoot');
  if (!root) return;
  try {
    if (!ME.demo) PATROUILLES = (await api('patrouilles')).patrouilles || [];
  } catch (e) {
    root.innerHTML = `<div class="empty-state"><div class="empty-title">ERREUR</div><div class="empty-sub">${e.message}</div></div>`;
    return;
  }
  renderPatrouilles();
  refreshStats('patrouilles');
}

function renderPatrouilles() {
  const root = document.getElementById('patRoot');
  if (!root) return;

  const rows = PATROUILLES.map((p) => `
    <tr>
      <td>${PAT_TYPE_LABEL[p.type] || p.type}</td>
      <td>${p.type === 'fixe' ? (p.lieu || '—') : '—'}</td>
      <td>${p.matricules || '—'}</td>
      <td>${p.vehicule || '—'}</td>
      <td>${p.fin ? `${p.debut || '—'} – ${p.fin}` : `${p.debut || '—'} – …`}</td>
      <td>${badge(p.statut)}</td>
      <td class="gest-actions">
        ${p.statut === 'EN COURS' ? `<button class="btn btn-primary btn-sm pat-finish" data-id="${p.id}">TERMINER</button>` : ''}
        <button class="gest-del pat-del" data-id="${p.id}" title="Supprimer">✕</button>
      </td>
    </tr>`).join('');

  root.innerHTML = `
    <div class="panel-head">
      <div><span class="panel-kicker">Surveillance</span><h2 class="panel-title">NOUVELLE PATROUILLE</h2></div>
    </div>
    <div class="pat-form">
      <select class="gest-in" id="patType">${PAT_TYPES.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select>
      <input class="gest-in" id="patLieu" placeholder="Lieu (patrouille fixe)" hidden>
      <input class="gest-in" id="patMat" placeholder="Matricule(s)">
      <input class="gest-in" id="patVeh" placeholder="Véhicule">
      <button class="btn btn-primary btn-sm" id="patStart">DÉMARRER</button>
    </div>

    <div class="panel-head" style="margin-top:20px">
      <div><span class="panel-kicker">Registre</span><h2 class="panel-title">PATROUILLES</h2></div>
      <span class="panel-count">${PATROUILLES.length}</span>
    </div>
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr><th>Type</th><th>Lieu</th><th>Matricule</th><th>Véhicule</th><th>Horaire</th><th>Statut</th><th class="th-right">Action</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      ${PATROUILLES.length === 0 ? '<div class="empty-state"><div class="empty-title">AUCUNE PATROUILLE</div><div class="empty-sub">Créez-en une avec le formulaire ci-dessus.</div></div>' : ''}
    </div>`;

  // Champ « Lieu » visible seulement pour une patrouille fixe
  const typeSel = root.querySelector('#patType');
  const lieuInput = root.querySelector('#patLieu');
  const syncLieu = () => { lieuInput.hidden = typeSel.value !== 'fixe'; };
  typeSel.addEventListener('change', syncLieu);
  syncLieu();

  root.querySelector('#patStart').addEventListener('click', () => {
    const type = typeSel.value;
    patrouilleAdd({
      type,
      lieu: type === 'fixe' ? lieuInput.value.trim() : '',
      matricules: root.querySelector('#patMat').value.trim(),
      vehicule: root.querySelector('#patVeh').value.trim(),
      debut: nowHM(),
    });
  });

  root.querySelectorAll('.pat-finish').forEach((b) => b.addEventListener('click', () => patrouilleFinish(+b.dataset.id)));
  root.querySelectorAll('.pat-del').forEach((b) => b.addEventListener('click', () => {
    if (confirm('Supprimer cette patrouille ?')) patrouilleDelete(+b.dataset.id);
  }));
}

async function reloadPatrouilles() {
  try { PATROUILLES = (await api('patrouilles')).patrouilles || []; } catch (e) {}
}

async function patrouilleAdd(p) {
  if (!p.matricules) { alert('Indiquez au moins un matricule.'); return; }
  if (ME.demo) {
    PATROUILLES.unshift({ id: Date.now(), ...p, fin: '', statut: 'EN COURS' });
  } else {
    try { await api('patrouille_add', p); } catch (e) { alert(e.message); return; }
    await reloadPatrouilles();
  }
  renderPatrouilles();
  refreshStats('patrouilles');
}

async function patrouilleFinish(id) {
  const fin = nowHM();
  if (ME.demo) {
    const p = PATROUILLES.find((x) => x.id === id);
    if (p) { p.fin = fin; p.statut = 'TERMINÉE'; }
  } else {
    try { await api('patrouille_finish', { id, fin }); } catch (e) { alert(e.message); return; }
    await reloadPatrouilles();
  }
  renderPatrouilles();
  refreshStats('patrouilles');
}

async function patrouilleDelete(id) {
  if (ME.demo) {
    PATROUILLES = PATROUILLES.filter((x) => x.id !== id);
  } else {
    try { await api('patrouille_delete', { id }); } catch (e) { alert(e.message); return; }
    await reloadPatrouilles();
  }
  renderPatrouilles();
  refreshStats('patrouilles');
}

// ── Debrief soldat : cocher / décocher une certification ──
async function certifToggle(mat, formation, has) {
  if (ME.demo) {
    PAGES.formation.certifs[mat] = PAGES.formation.certifs[mat] || [];
    const arr = PAGES.formation.certifs[mat];
    if (has) { if (!arr.includes(formation)) arr.push(formation); }
    else { const i = arr.indexOf(formation); if (i >= 0) arr.splice(i, 1); }
  } else {
    try { await api('certif_set', { matricule: mat, formation, has }); }
    catch (e) { alert(e.message); return; }
    try { const fm = await api('formations'); if (fm.certifs) PAGES.formation.certifs = fm.certifs; } catch (e) {}
  }
  // Re-render la matrice si on est sur Debrief
  if (currentPage === 'debrief') {
    const cfg = PAGES.debrief;
    const host = document.getElementById('customSection');
    host.innerHTML = cfg.render(cfg);
    cfg.afterRender(cfg);
    refreshStats('debrief');
  }
}

// ── Page Gestion des formations ──
async function loadGestionFormations() {
  const root = document.getElementById('gestFormRoot');
  if (!root) return;
  try {
    if (ME.demo) {
      FORMS = PAGES.formation.formations.map((f, i) => ({ id: i + 1, nom: f.nom, categorie: CAT_UI_TO_DB[f.cat] || 'ejercito' }));
    } else {
      FORMS = ((await api('formations')).formations || []).map((f) => ({ id: f.id, nom: f.nom, categorie: f.categorie }));
    }
  } catch (e) {
    root.innerHTML = `<div class="empty-state"><div class="empty-title">ERREUR</div><div class="empty-sub">${e.message}</div></div>`;
    return;
  }
  renderGestionFormations();
  refreshStats('gestion_formations');
}

function catOptions(selected) {
  return CAT_OPTS.map(([v, l]) => `<option value="${v}"${v === selected ? ' selected' : ''}>${l}</option>`).join('');
}

function renderGestionFormations() {
  const root = document.getElementById('gestFormRoot');
  const rows = FORMS.map((f) => `
    <tr data-id="${f.id}">
      <td><input class="gest-in gf-nom" value="${(f.nom || '').replace(/"/g, '&quot;')}"></td>
      <td><select class="gest-in gf-cat">${catOptions(f.categorie)}</select></td>
      <td class="gest-actions">
        <button class="btn btn-ghost btn-sm gf-save">Enregistrer</button>
        <button class="gest-del gf-del" title="Supprimer">✕</button>
      </td>
    </tr>`).join('');

  root.innerHTML = `
    <div class="panel-head">
      <div><span class="panel-kicker">Administration</span><h2 class="panel-title">FORMATIONS</h2></div>
      <span class="panel-count">${FORMS.length} FORMATIONS</span>
    </div>
    <div class="gest-add">
      <input class="gest-in" id="gfAddNom" placeholder="Nom de la nouvelle formation">
      <select class="gest-in" id="gfAddCat">${catOptions('ejercito')}</select>
      <button class="btn btn-primary btn-sm" id="gfAddBtn">AJOUTER</button>
    </div>
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr><th>Formation</th><th>Catégorie</th><th class="th-right">Actions</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;

  root.querySelector('#gfAddBtn').addEventListener('click', () => formationAdd({
    nom: root.querySelector('#gfAddNom').value.trim(),
    categorie: root.querySelector('#gfAddCat').value,
  }));
  root.querySelectorAll('tr[data-id]').forEach((tr) => {
    const id = +tr.dataset.id;
    tr.querySelector('.gf-save').addEventListener('click', () => formationUpdate({
      id, nom: tr.querySelector('.gf-nom').value.trim(), categorie: tr.querySelector('.gf-cat').value,
    }));
    tr.querySelector('.gf-del').addEventListener('click', () => {
      if (confirm('Supprimer cette formation ? (les certifications liées seront retirées)')) formationDelete(id);
    });
  });
}

// Recharge les colonnes de la matrice après un changement
async function reloadFormationColumns() {
  if (ME.demo) return;
  try {
    const fm = await api('formations');
    if (fm.formations) PAGES.formation.formations = fm.formations.map((f) => ({ nom: f.nom, cat: CAT_DB_TO_UI[f.categorie] || 'veh' }));
  } catch (e) {}
}

async function formationAdd(p) {
  if (!p.nom) { alert('Nom de la formation obligatoire.'); return; }
  if (ME.demo) {
    PAGES.formation.formations.push({ nom: p.nom, cat: CAT_DB_TO_UI[p.categorie] || 'veh' });
  } else {
    try { await api('formation_add', p); } catch (e) { alert(e.message); return; }
    await reloadFormationColumns();
  }
  await loadGestionFormations();
}

async function formationUpdate(p) {
  if (!p.nom) { alert('Nom de la formation obligatoire.'); return; }
  if (ME.demo) {
    const f = PAGES.formation.formations[p.id - 1];
    if (f) { f.nom = p.nom; f.cat = CAT_DB_TO_UI[p.categorie] || 'veh'; }
  } else {
    try { await api('formation_update', p); } catch (e) { alert(e.message); return; }
    await reloadFormationColumns();
  }
  await loadGestionFormations();
}

async function formationDelete(id) {
  if (ME.demo) {
    PAGES.formation.formations.splice(id - 1, 1);
  } else {
    try { await api('formation_delete', { id }); } catch (e) { alert(e.message); return; }
    await reloadFormationColumns();
  }
  await loadGestionFormations();
}

// ── Init ──
async function boot() {
  buildHomeGrid();
  updateHomeStats();
  try {
    const me = await api('me');
    if (me && me.matricule) { ME = me; await afterLogin(); }
    else showLogin();
  } catch (e) {
    // Pas de backend joignable → écran de connexion (+ mode démo possible)
    showLogin('Serveur non joignable. Utilisez le mode démo ou vérifiez api.php / la base.');
  }
}

boot();
