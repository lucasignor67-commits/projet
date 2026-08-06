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
  'LEVÉ': 'gray', 'INACTIF': 'gray',
  'PAYÉ': 'green', 'NON PAYÉ': 'red',
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
  } catch (e) { notify(e.message); return; }
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
    view: 'custom',
    get data() { return OPERATIONS; },
    stats: (rows) => [
      ['Total', rows.length],
      ['En cours', countBy(rows, 'statut', 'EN COURS')],
      ['Planifiées', countBy(rows, 'statut', 'PLANIFIÉE')],
      ['Terminées', countBy(rows, 'statut', 'TERMINÉE')],
    ],
    render: () => `<div id="opRoot" class="gestion-root">Chargement…</div>`,
    afterRender: () => loadOperations(),
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

  tig: {
    title: 'TIG',
    desc: 'Travaux d\'intérêt général — suivi des personnes assignées.',
    view: 'custom',
    get data() { return TIGS; },
    stats: (rows) => [
      ['Total', rows.length],
      ['En cours', rows.filter((r) => r.statut === 'EN COURS').length],
      ['Terminés', rows.filter((r) => r.statut === 'TERMINÉ').length],
      ['Total amendes', fmtMoney(rows.reduce((s, r) => s + (Number(r.amende) || 0), 0))],
    ],
    render: () => `<div id="tigRoot" class="gestion-root">Chargement…</div>`,
    afterRender: () => loadTig(),
  },

  saisies: {
    title: 'SAISIES',
    desc: 'Rapports de saisie / amendes. Cliquez un rapport pour le détailler.',
    view: 'custom',
    get data() { return SAISIES; },
    stats: (rows) => [
      ['Rapports', rows.length],
      ['Payés', rows.filter((r) => r.etat_amendes === 'PAYÉ').length],
      ['Non payés', rows.filter((r) => r.etat_amendes === 'NON PAYÉ').length],
      ['Total amendes', fmtMoney(rows.reduce((s, r) => s + (Number(r.total) || 0), 0))],
    ],
    render: () => `<div id="saiRoot" class="gestion-root">Chargement…</div>`,
    afterRender: () => loadSaisies(),
  },

  blacklist: {
    title: 'BLACKLIST',
    desc: 'Personnes blacklistées. Cliquez une fiche pour la détailler.',
    view: 'custom',
    get data() { return BLACKLIST; },
    stats: (rows) => [
      ['Total', rows.length],
      ['Actives', rows.filter((r) => r.actif !== false).length],
      ['Levées', rows.filter((r) => r.actif === false).length],
      ['Avec photo', rows.filter((r) => (r.photos || []).length).length],
    ],
    render: () => `<div id="blRoot" class="gestion-root">Chargement…</div>`,
    afterRender: () => loadBlacklist(),
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
    desc: "Fréquences radio de la milice et de l'île.",
    kicker: 'Transmissions',
    listTitle: 'CANAUX ACTIFS',
    addLabel: 'NOUVEAU CANAL',
    columns: [
      { key: 'canal', label: 'Canal' },
      { key: 'freq', label: 'Fréquence', align: 'right' },
    ],
    stats: (rows) => [
      ['Canaux', rows.length],
    ],
    data: [
      { canal: 'MILICE - Principale', freq: '10.24 MHz' },
      { canal: 'CAYO GLOBAL', freq: '10.25 MHz' },
      { canal: 'MILICE - Entraînements', freq: '10.26 MHz' },
      { canal: 'République', freq: '10.27 MHz' },
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
    desc: 'Annonces internes de la milice. Cliquez une annonce pour la détailler.',
    view: 'custom',
    get data() { return ANNONCES; },
    stats: (rows) => [
      ['Annonces', rows.length],
      ['Urgentes', rows.filter((r) => r.priorite === 'URGENTE').length],
      ['Importantes', rows.filter((r) => r.priorite === 'IMPORTANTE').length],
      ['Avec photo', rows.filter((r) => (r.photos || []).length).length],
    ],
    render: () => `<div id="commRoot" class="gestion-root">Chargement…</div>`,
    afterRender: () => loadAnnonces(),
  },

  documentation: {
    title: 'DOCUMENTATION',
    desc: 'Règlement interne, procédures et guides de la milice.',
    view: 'custom',
    get data() { return DOCUMENTS; },
    stats: (rows) => [
      ['Documents', rows.length],
      ['Accès libre', countBy(rows, 'acces', 'TOUS')],
      ['Gradés', countBy(rows, 'acces', 'GRADÉS')],
      ['État-major', countBy(rows, 'acces', 'ÉTAT-MAJOR')],
    ],
    render: () => `<div id="docRoot" class="gestion-root">Chargement…</div>`,
    afterRender: () => loadDocuments(),
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

  /* ─────────── RECRUTEUR (ajout de recrues + contrats) ─────────── */
  recruteur: {
    title: 'RECRUTEUR',
    desc: 'Ajout de nouvelles recrues (grade le plus bas) et contrats de travail.',
    view: 'custom',
    get data() { return CONTRATS; },
    stats: (rows) => [
      ['Contrats', rows.length],
      ['Avec photo', rows.filter((r) => r.photo).length],
    ],
    render: () => `<div id="recruteurRoot" class="gestion-root">Chargement…</div>`,
    afterRender: () => loadRecruteur(),
  },
};

