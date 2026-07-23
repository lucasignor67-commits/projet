/* ═══════════════════════════════════════════════
   MILICIA DE CAYO PERICO — MDT
   Navigation + vues par rubrique
   ═══════════════════════════════════════════════ */

// ── Helpers ──
const countBy = (rows, key, value) => rows.filter((r) => r[key] === value).length;

// Tonalité des badges par valeur
const BADGE_TONES = {
  'EN SERVICE': 'green', 'REPOS': 'gray', 'ABSENT': 'amber',
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

// ── Configuration des rubriques ──
const PAGES = {

  /* ─────────── VUES TABLEAU ─────────── */

  effectifs: {
    title: 'EFFECTIFS',
    desc: 'Liste du personnel de la milice, grades et affectations.',
    kicker: 'Personnel',
    listTitle: 'REGISTRE DU PERSONNEL',
    addLabel: 'NOUVEAU MEMBRE',
    columns: [
      { key: 'matricule', label: 'Matricule' },
      { key: 'nom', label: 'Nom' },
      { key: 'grade', label: 'Grade' },
      { key: 'telephone', label: 'Téléphone' },
      { key: 'statut', label: 'Statut', badge: true, align: 'right' },
    ],
    stats: (rows) => [
      ['Total', rows.length],
      ['En service', countBy(rows, 'statut', 'EN SERVICE')],
      ['Repos', countBy(rows, 'statut', 'REPOS')],
      ['Absents', countBy(rows, 'statut', 'ABSENT')],
    ],
    data: [
      { matricule: 'M-01', nom: 'Ramón « El Comandante » Herrera', grade: 'Comandante', telephone: '555-0140', statut: 'EN SERVICE' },
      { matricule: 'M-02', nom: 'Mateo Vargas', grade: 'Teniente', telephone: '555-0177', statut: 'EN SERVICE' },
      { matricule: 'M-03', nom: 'Lucía Fuentes', grade: 'Sargento', telephone: '555-0192', statut: 'REPOS' },
      { matricule: 'M-04', nom: 'Diego Salazar', grade: 'Soldado', telephone: '555-0163', statut: 'EN SERVICE' },
      { matricule: 'M-05', nom: 'Carmen Reyes', grade: 'Soldado', telephone: '555-0128', statut: 'ABSENT' },
      { matricule: 'M-06', nom: 'Álvaro Mendoza', grade: 'Recluta', telephone: '555-0151', statut: 'REPOS' },
    ],
  },

  rapports: {
    title: 'RAPPORTS',
    desc: "Comptes rendus d'intervention et rapports internes.",
    kicker: 'Comptes rendus',
    listTitle: 'REGISTRE DES RAPPORTS',
    addLabel: 'NOUVEAU RAPPORT',
    columns: [
      { key: 'num', label: 'N°' },
      { key: 'type', label: 'Type' },
      { key: 'titre', label: 'Titre' },
      { key: 'auteur', label: 'Auteur' },
      { key: 'date', label: 'Date' },
      { key: 'statut', label: 'Statut', badge: true, align: 'right' },
    ],
    stats: (rows) => [
      ['Total', rows.length],
      ['En cours', countBy(rows, 'statut', 'EN COURS')],
      ['Validés', countBy(rows, 'statut', 'VALIDÉ')],
      ['Classés', countBy(rows, 'statut', 'CLASSÉ')],
    ],
    data: [
      { num: 'R-015', type: 'Incident', titre: 'Bateau non identifié au large du lagon', auteur: 'El Comandante', date: '23/07/2026', statut: 'EN COURS' },
      { num: 'R-014', type: 'Intervention', titre: 'Intrusion plage nord', auteur: 'Mateo Vargas', date: '21/07/2026', statut: 'VALIDÉ' },
      { num: 'R-013', type: 'Incident', titre: 'Rixe au camp principal', auteur: 'Lucía Fuentes', date: '19/07/2026', statut: 'EN COURS' },
      { num: 'R-012', type: 'Saisie', titre: "Saisie d'armes au port", auteur: 'Diego Salazar', date: '17/07/2026', statut: 'VALIDÉ' },
      { num: 'R-011', type: 'Patrouille', titre: 'RAS secteur aérodrome', auteur: 'Carmen Reyes', date: '15/07/2026', statut: 'CLASSÉ' },
    ],
  },

  patrouilles: {
    title: 'PATROUILLES',
    desc: "Planification et suivi des patrouilles sur l'île.",
    kicker: 'Surveillance',
    listTitle: 'REGISTRE DES PATROUILLES',
    addLabel: 'NOUVELLE PATROUILLE',
    columns: [
      { key: 'num', label: 'N°' },
      { key: 'zone', label: 'Zone' },
      { key: 'equipe', label: 'Équipe' },
      { key: 'vehicule', label: 'Véhicule' },
      { key: 'horaire', label: 'Horaire' },
      { key: 'statut', label: 'Statut', badge: true, align: 'right' },
    ],
    stats: (rows) => [
      ['Total', rows.length],
      ['En cours', countBy(rows, 'statut', 'EN COURS')],
      ['Planifiées', countBy(rows, 'statut', 'PLANIFIÉE')],
      ['Terminées', countBy(rows, 'statut', 'TERMINÉE')],
    ],
    data: [
      { num: 'P-09', zone: 'Tour radio', equipe: 'Salazar / Mendoza', vehicule: 'Winky', horaire: '08:00 – 11:00', statut: 'PLANIFIÉE' },
      { num: 'P-08', zone: 'Plage nord', equipe: 'Vargas / Salazar', vehicule: 'Squaddie', horaire: '20:00 – 23:00', statut: 'EN COURS' },
      { num: 'P-07', zone: 'Aérodrome', equipe: 'Fuentes / Reyes', vehicule: 'Vetir', horaire: '14:00 – 17:00', statut: 'TERMINÉE' },
      { num: 'P-06', zone: 'Port principal', equipe: 'Herrera / Mendoza', vehicule: 'Dinghy', horaire: '09:00 – 12:00', statut: 'TERMINÉE' },
    ],
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
    desc: "Déclarations d'absence et indisponibilités du personnel.",
    kicker: 'Personnel',
    listTitle: 'REGISTRE DES ABSENCES',
    addLabel: 'DÉCLARER UNE ABSENCE',
    columns: [
      { key: 'membre', label: 'Membre' },
      { key: 'motif', label: 'Motif' },
      { key: 'du', label: 'Du' },
      { key: 'au', label: 'Au' },
      { key: 'statut', label: 'Statut', badge: true, align: 'right' },
    ],
    stats: (rows) => [
      ['Total', rows.length],
      ['En attente', countBy(rows, 'statut', 'EN ATTENTE')],
      ['Validées', countBy(rows, 'statut', 'VALIDÉE')],
      ['Refusées', countBy(rows, 'statut', 'REFUSÉE')],
    ],
    data: [
      { membre: 'Carmen Reyes', motif: "Déplacement hors de l'île", du: '20/07/2026', au: '28/07/2026', statut: 'VALIDÉE' },
      { membre: 'Álvaro Mendoza', motif: 'Raisons personnelles', du: '24/07/2026', au: '26/07/2026', statut: 'EN ATTENTE' },
      { membre: 'Diego Salazar', motif: 'Blessure en service', du: '10/07/2026', au: '15/07/2026', statut: 'VALIDÉE' },
    ],
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
    desc: 'Sanctions disciplinaires et avertissements du personnel.',
    kicker: 'Discipline',
    listTitle: 'REGISTRE DISCIPLINAIRE',
    addLabel: 'NOUVELLE SANCTION',
    columns: [
      { key: 'membre', label: 'Membre' },
      { key: 'type', label: 'Type', badge: true },
      { key: 'motif', label: 'Motif' },
      { key: 'par', label: 'Prononcée par' },
      { key: 'date', label: 'Date', align: 'right' },
    ],
    stats: (rows) => [
      ['Total', rows.length],
      ['Avertissements', countBy(rows, 'type', 'AVERTISSEMENT')],
      ['Blâmes', countBy(rows, 'type', 'BLÂME')],
      ['Rétrogradations', countBy(rows, 'type', 'RÉTROGRADATION')],
    ],
    data: [
      { membre: 'Álvaro Mendoza', type: 'AVERTISSEMENT', motif: 'Retards répétés aux prises de service', par: 'Lucía Fuentes', date: '19/07/2026' },
      { membre: 'Diego Salazar', type: 'BLÂME', motif: "Usage non autorisé d'un véhicule", par: 'Mateo Vargas', date: '11/07/2026' },
    ],
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
    stats: (zones) => [
      ['Zones', zones.length],
      ['Sécurisées', countBy(zones, 'statut', 'SÉCURISÉE')],
      ['Surveillance', countBy(zones, 'statut', 'SURVEILLANCE')],
      ['Alerte', countBy(zones, 'statut', 'ALERTE')],
    ],
    data: [
      { nom: 'Aérodrome', x: 22, y: 24, statut: 'SÉCURISÉE' },
      { nom: 'Plage nord', x: 46, y: 28, statut: 'SURVEILLANCE' },
      { nom: 'Quai nord', x: 63, y: 26, statut: 'SÉCURISÉE' },
      { nom: 'Lagon / entrepôts', x: 57, y: 46, statut: 'SÉCURISÉE' },
      { nom: 'Plantations', x: 73, y: 51, statut: 'ALERTE' },
      { nom: 'Poste de guet est', x: 84, y: 60, statut: 'SÉCURISÉE' },
      { nom: 'Camp principal', x: 60, y: 74, statut: 'SÉCURISÉE' },
    ],
    render: (cfg) => `
      <div class="panel-head">
        <div>
          <span class="panel-kicker">Vue tactique</span>
          <h2 class="panel-title">CARTE DE L'ÎLE</h2>
        </div>
        <span class="panel-count">${cfg.data.length} ZONES</span>
      </div>
      <div class="map-wrap">
        <img class="map-img" src="map.jpg" alt="Carte de Cayo Perico"
             onerror="this.closest('.map-wrap').classList.add('map-missing')">
        ${cfg.data.map((z) => `
          <div class="map-marker tone-${tone(z.statut)}" style="left:${z.x}%; top:${z.y}%">
            <span class="marker-dot"></span>
            <span class="marker-label">${z.nom}</span>
          </div>`).join('')}
        <div class="map-placeholder">
          <div class="empty-title">CARTE INDISPONIBLE</div>
          <div class="empty-sub">Déposez l'image de l'île dans <b>assets/carte.jpg</b> pour l'afficher ici.</div>
        </div>
      </div>
      <div class="map-legend">
        ${cfg.data.map((z) => `
          <div class="legend-item">
            <span class="marker-dot tone-${tone(z.statut)}"></span>
            <span class="legend-name">${z.nom}</span>
            ${badge(z.statut)}
          </div>`).join('')}
      </div>`,
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
          { poste: 'Vicepresidente', titulaire: 'Sr. Noche Hiedler' },
          { poste: 'Jefe del Gobierno', titulaire: '' },
          { poste: 'Secretario General', titulaire: 'Sr. Sam Boudj' },
          { poste: 'Ministro de la Defensa', titulaire: '01 | Eren Ernesto Bueno' },
        ],
      },
      {
        nom: '⭐ Dirección de la Milicia',
        roles: [
          { poste: 'General de la Milicia', titulaire: '01 | Eren Ernesto Bueno' },
          { poste: 'SubGeneral de la Milicia', titulaire: '02 | Alvarez Zed' },
          { poste: 'Responsable Maritime', titulaire: '16 | Esmée Bueno' },
          { poste: 'Adjunto Maritime', titulaire: '34 | Zayne Alvarez' },
          { poste: 'Responsable Ejército', titulaire: '23 | Roméro Hiedler' },
          { poste: 'Adjunto Ejército', titulaire: '15 | Looping Lee' },
          { poste: 'Responsable Fuerza', titulaire: '43 | Laponne Mattéo' },
          { poste: 'Adjunto Fuerza', titulaire: '' },
          { poste: 'Coronel', titulaire: '' },
          { poste: 'Teniente Coronel', titulaire: '' },
        ],
      },
      { nom: 'Commando', grades: ['Comandante', 'Capitán Primero', 'Capitán Segundo', 'Teniente'] },
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

  coffre: {
    title: 'COFFRE',
    desc: 'Inventaire et mouvements du coffre de la milice.',
    view: 'custom',
    stats: (rows) => [
      ['Articles', rows.length],
      ['Armes', countBy(rows, 'categorie', 'Arme')],
      ['Équipement', countBy(rows, 'categorie', 'Équipement')],
      ['Fonds', '$148,500'],
    ],
    data: [
      { article: "Fusil d'assaut", categorie: 'Arme', quantite: 'x6', mouvement: 'Dépôt — 22/07/2026', par: 'Mateo Vargas' },
      { article: 'Pistolet', categorie: 'Arme', quantite: 'x10', mouvement: 'Retrait — 21/07/2026', par: 'Diego Salazar' },
      { article: 'Munitions 9mm', categorie: 'Munitions', quantite: 'x480', mouvement: 'Dépôt — 20/07/2026', par: 'Lucía Fuentes' },
      { article: 'Gilet pare-balles', categorie: 'Équipement', quantite: 'x8', mouvement: 'Dépôt — 18/07/2026', par: 'El Comandante' },
      { article: 'Radio cryptée', categorie: 'Équipement', quantite: 'x12', mouvement: 'Dépôt — 15/07/2026', par: 'El Comandante' },
      { article: 'Kit de soin', categorie: 'Équipement', quantite: 'x15', mouvement: 'Dépôt — 14/07/2026', par: 'Carmen Reyes' },
      { article: 'Jerrican essence', categorie: 'Logistique', quantite: 'x9', mouvement: 'Retrait — 13/07/2026', par: 'Álvaro Mendoza' },
      { article: 'Argent liquide', categorie: 'Fonds', quantite: '$148,500', mouvement: 'Dépôt — 23/07/2026', par: 'El Comandante' },
    ],
    render: (cfg) => `
      <div class="panel-head">
        <div>
          <span class="panel-kicker">Logistique</span>
          <h2 class="panel-title">INVENTAIRE DU COFFRE</h2>
        </div>
        <span class="panel-count">${cfg.data.length} ARTICLES</span>
      </div>
      <div class="inv-grid">
        ${cfg.data.map((it) => `
          <article class="inv-card">
            <div class="inv-top">
              <span class="inv-cat">${it.categorie.toUpperCase()}</span>
              <span class="inv-qty">${it.quantite}</span>
            </div>
            <div class="inv-name">${it.article}</div>
            <div class="inv-meta">${it.mouvement}<br>par ${it.par}</div>
          </article>`).join('')}
      </div>`,
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
};

// Ordre d'affichage sur la grille d'accueil
const HOME_ORDER = [
  'effectifs', 'rapports', 'patrouilles', 'operations', 'absence', 'coffre',
  'detenus', 'hierarchie', 'blacklist', 'communications', 'sanctions', 'documentation',
  'carte', 'radio',
];

let currentPage = 'accueil';

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
  // TODO : formulaire d'ajout par rubrique
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

// ── Init ──
buildHomeGrid();
updateHomeStats();
