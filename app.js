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

      // En-tête groupé par famille
      const groupHead = cats
        .map((c) => {
          const span = cfg.formations.filter((f) => f.cat === c).length;
          return `<th class="grp cat-${c}" colspan="${span}">${catLabel[c]}</th>`;
        })
        .join('');

      // En-tête des formations (texte vertical)
      const formHead = cfg.formations
        .map((f) => `<th class="fcol cat-${f.cat}"><span>${f.nom}</span></th>`)
        .join('');

      // Lignes membres
      const body = cfg.data
        .map((m) => {
          const cells = cfg.formations
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
let ACCOUNTS = [];    // comptes (page Gestion)

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
      PAGES.effectifs.data = eff.map((r) => ({ matricule: r.matricule, nom: r.nom, grade: r.grade, statut: r.statut }));
      const fm = await api('formations');
      if (fm.certifs) PAGES.formation.certifs = fm.certifs;
      GRADES = (await api('grades')).grades || DEMO_GRADES;
    } catch (e) {
      console.warn('Chargement des données:', e.message);
    }
  }

  document.getElementById('operatorName').textContent = `${ME.matricule} | ${ME.nom}`;
  document.getElementById('logoutBtn').hidden = false;

  // Section réservée visible selon les droits
  const canAdmin = ME.peut_ajouter_effectif || ME.peut_modifier_comptes || ME.peut_voir_mdp;
  document.querySelectorAll('.nav-admin').forEach((el) => { el.hidden = !canAdmin; });

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

  const rows = ACCOUNTS.map((a) => `
    <tr data-mat="${a.matricule}">
      <td class="gest-mat">${a.matricule}</td>
      <td><input class="gest-in gest-nom" value="${(a.nom || '').replace(/"/g, '&quot;')}" ${dis}></td>
      <td><select class="gest-in gest-grade" ${dis}>${gradeOptions(a.grade_id)}</select></td>
      <td><select class="gest-in gest-statut" ${dis}>
        <option${a.statut === 'TITULAIRE' ? ' selected' : ''}>TITULAIRE</option>
        <option${a.statut === 'EN TEST' ? ' selected' : ''}>EN TEST</option>
      </select></td>
      ${canPwd ? `<td><input class="gest-in gest-pwd" value="${(a.mot_de_passe || '').replace(/"/g, '&quot;')}" ${dis}></td>` : ''}
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
      <span class="panel-count">${ACCOUNTS.length} COMPTES</span>
    </div>
    ${addRow}
    <div class="table-wrap">
      <table class="data-table gest-table">
        <thead><tr>
          <th>N°</th><th>Nom</th><th>Grade</th><th>Statut</th>${canPwd ? '<th>Mot de passe</th>' : ''}<th class="th-right">Actions</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;

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
  } else {
    try { await api('account_add', p); await api('effectifs').then((eff) => { PAGES.effectifs.data = eff.map((r) => ({ matricule: r.matricule, nom: r.nom, grade: r.grade, statut: r.statut })); }); }
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
    try { await api('account_update', p); await api('effectifs').then((eff) => { PAGES.effectifs.data = eff.map((r) => ({ matricule: r.matricule, nom: r.nom, grade: r.grade, statut: r.statut })); }); }
    catch (e) { alert(e.message); return; }
  }
  await loadGestion();
}

async function accountDelete(mat) {
  if (ME.demo) {
    PAGES.effectifs.data = PAGES.effectifs.data.filter((e) => e.matricule !== mat);
  } else {
    try { await api('account_delete', { matricule: mat }); await api('effectifs').then((eff) => { PAGES.effectifs.data = eff.map((r) => ({ matricule: r.matricule, nom: r.nom, grade: r.grade, statut: r.statut })); }); }
    catch (e) { alert(e.message); return; }
  }
  updateHomeStats();
  await loadGestion();
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
