// ── Page Sanctions ──
const SANC_TYPES = ['AVERTISSEMENT', 'BLÂME', 'RÉTROGRADATION', 'EXCLUSION'];

async function loadSanctions() {
  const root = document.getElementById('sancRoot');
  if (!root) return;
  if (typeof skeletonBlock === 'function') root.innerHTML = skeletonBlock();
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
    root.querySelectorAll('.sanc-del').forEach((b) => b.addEventListener('click', () => confirmDialog('Supprimer définitivement cette sanction ?', () => sanctionDelete(+b.dataset.id))));
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
  root.querySelectorAll('.sanc-del').forEach((b) => b.addEventListener('click', () => confirmDialog('Supprimer définitivement cette sanction ?', () => sanctionDelete(+b.dataset.id))));
}

async function reloadSanctions() {
  try { SANCTIONS = (await api('sanctions')).sanctions || []; } catch (e) {}
}

async function sanctionAdd(p) {
  if (!p.membre || !p.motif || !p.date_sanction) { notify('Membre, motif et date sont obligatoires.'); return; }
  if (ME.demo) {
    SANCTIONS.unshift({ id: Date.now(), prononcee_par: ME.nom, auteur_matricule: ME.matricule, ...p });
  } else {
    try { await api('sanction_add', p); } catch (e) { notify(e.message); return; }
    await reloadSanctions();
  }
  renderSanctions();
  refreshStats('sanctions');
}

async function sanctionDelete(id) {
  if (ME.demo) {
    SANCTIONS = SANCTIONS.filter((x) => x.id !== id);
  } else {
    try { await api('sanction_delete', { id }); } catch (e) { notify(e.message); return; }
    await reloadSanctions();
  }
  renderSanctions();
  refreshStats('sanctions');
}

// ── Page Rapports ──
async function loadRapports() {
  const root = document.getElementById('rapRoot');
  if (!root) return;
  if (typeof skeletonBlock === 'function') root.innerHTML = skeletonBlock();
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

let RAP_CREATING = false; // true = affiche le formulaire de rédaction, false = liste des rapports

function renderRapports() {
  const root = document.getElementById('rapRoot');
  if (!root) return;
  if (RAP_CREATING) { renderRapForm(); return; }
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
      <div><span class="panel-kicker">Registre</span><h2 class="panel-title">RAPPORTS</h2></div>
      <div class="map-tools">
        <span class="panel-count">${RAPPORTS.length}</span>
        ${typeof exportBtns === 'function' ? exportBtns('rapports') : ''}
        <button class="btn btn-primary btn-sm" id="rapNew"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>NOUVEAU RAPPORT</button>
      </div>
    </div>
    ${RAPPORTS.length ? `<div class="rap-grid">${cards}</div>`
      : '<div class="empty-state"><div class="empty-title">AUCUN RAPPORT</div><div class="empty-sub">Rédigez-en un avec le bouton « Nouveau rapport ».</div></div>'}`;

  root.querySelector('#rapNew').addEventListener('click', () => { RAP_CREATING = true; renderRapports(); });
  root.querySelectorAll('.rap-del').forEach((b) => b.addEventListener('click', () => confirmDialog('Supprimer définitivement ce rapport ?', () => rapportDelete(+b.dataset.id))));
}

// Vue formulaire : rédaction d'un nouveau rapport
function renderRapForm() {
  const root = document.getElementById('rapRoot');
  if (!root) return;

  root.innerHTML = `
    <div class="panel-head">
      <div><span class="panel-kicker">Nouveau</span><h2 class="panel-title">RÉDIGER UN RAPPORT</h2></div>
      <button class="btn btn-ghost btn-sm" id="rapBack" type="button">← Retour aux rapports</button>
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
    </div>`;

  root.querySelector('#rapBack').addEventListener('click', () => { RAP_CREATING = false; renderRapports(); });
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
}

async function reloadRapports() {
  try { RAPPORTS = (await api('rapports')).rapports || []; } catch (e) {}
}

async function rapportAdd(p) {
  if (!p.date_rapport || !p.agent_rapport || !p.concerne || !p.fait) {
    notify('Merci de remplir les champs obligatoires (marqués *).');
    return;
  }
  if (ME.demo) {
    RAPPORTS.unshift({ id: Date.now(), auteur_matricule: ME.matricule, ...p });
  } else {
    try { await api('rapport_add', p); } catch (e) { notify(e.message); return; }
    await reloadRapports();
  }
  RAP_CREATING = false; // retour à la liste après enregistrement
  renderRapports();
  refreshStats('rapports');
}

async function rapportDelete(id) {
  if (ME.demo) {
    RAPPORTS = RAPPORTS.filter((x) => x.id !== id);
  } else {
    try { await api('rapport_delete', { id }); } catch (e) { notify(e.message); return; }
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
  root.querySelectorAll('.abs-del').forEach((b) => b.addEventListener('click', () => confirmDialog('Supprimer définitivement cette absence ?', () => absenceDelete(+b.dataset.id))));
}

async function reloadAbsences() {
  try { ABSENCES = (await api('absences')).absences || []; } catch (e) {}
}

async function absenceAdd(p) {
  if (!p.date_depart || !p.date_retour) { notify('Indiquez la date de départ et de retour.'); return; }
  if (ME.demo) {
    ABSENCES.unshift({ id: Date.now(), matricule: ME.matricule, nom: ME.nom, ...p });
  } else {
    try { await api('absence_add', p); } catch (e) { notify(e.message); return; }
    await reloadAbsences();
  }
  renderAbsences();
  refreshStats('absence');
}

async function absenceDelete(id) {
  if (ME.demo) {
    ABSENCES = ABSENCES.filter((x) => x.id !== id);
  } else {
    try { await api('absence_delete', { id }); } catch (e) { notify(e.message); return; }
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
    else {
      // Purge démo : patrouilles de plus de 8 jours (id = Date.now() à la création)
      const limite8j = Date.now() - 8 * 24 * 60 * 60 * 1000;
      PATROUILLES = PATROUILLES.filter((p) => !p.id || p.id >= limite8j);
    }
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
  root.querySelectorAll('.pat-del').forEach((b) => b.addEventListener('click', () => confirmDialog('Supprimer définitivement cette patrouille ?', () => patrouilleDelete(+b.dataset.id))));
}

async function reloadPatrouilles() {
  try { PATROUILLES = (await api('patrouilles')).patrouilles || []; } catch (e) {}
}

async function patrouilleAdd(p) {
  if (!p.matricules) { notify('Indiquez au moins un matricule.'); return; }
  if (ME.demo) {
    PATROUILLES.unshift({ id: Date.now(), ...p, fin: '', statut: 'EN COURS' });
  } else {
    try { await api('patrouille_add', p); } catch (e) { notify(e.message); return; }
    await reloadPatrouilles();
  }
  renderPatrouilles();
  refreshStats('patrouilles');
}

async function patrouilleFinish(id) {
  const fin = nowHM();
  if (ME.demo) {
    const p = PATROUILLES.find((x) => x.id === id);
    if (p) {
      // En démo, l'id vaut Date.now() à la création → durée = maintenant − id
      if (Date.now() - id < 3 * 60 * 1000) {
        PATROUILLES = PATROUILLES.filter((x) => x.id !== id);
        notify('Patrouille de moins de 3 minutes : non enregistrée.');
      } else {
        p.fin = fin; p.statut = 'TERMINÉE';
      }
    }
  } else {
    let r;
    try { r = await api('patrouille_finish', { id, fin }); } catch (e) { notify(e.message); return; }
    if (r && r.discarded) notify('Patrouille de moins de 3 minutes : non enregistrée.');
    await reloadPatrouilles();
  }
  renderPatrouilles();
  refreshStats('patrouilles');
}

async function patrouilleDelete(id) {
  if (ME.demo) {
    PATROUILLES = PATROUILLES.filter((x) => x.id !== id);
  } else {
    try { await api('patrouille_delete', { id }); } catch (e) { notify(e.message); return; }
    await reloadPatrouilles();
  }
  renderPatrouilles();
  refreshStats('patrouilles');
}

// ── Debrief soldat : cocher / décocher une certification ──
async function certifToggle(mat, formation, has) {
  // Applique le changement en local (optimiste) pour un affichage instantané
  const setLocal = (val) => {
    const certifs = PAGES.formation.certifs;
    certifs[mat] = certifs[mat] || [];
    const arr = certifs[mat];
    const i = arr.indexOf(formation);
    if (val) { if (i < 0) arr.push(formation); }
    else if (i >= 0) arr.splice(i, 1);
  };
  const rerender = () => {
    if (currentPage !== 'debrief') return;
    const cfg = PAGES.debrief;
    const host = document.getElementById('customSection');
    if (host) { host.innerHTML = cfg.render(cfg); cfg.afterRender(cfg); }
    refreshStats('debrief');
  };

  setLocal(has);
  rerender();               // affichage immédiat, sans attendre le serveur
  if (ME.demo) return;

  // Persistance serveur en arrière-plan ; on annule visuellement si erreur
  try {
    await api('certif_set', { matricule: mat, formation, has });
  } catch (e) {
    setLocal(!has);
    rerender();
    notify(e.message);
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
    tr.querySelector('.gf-del').addEventListener('click', () => confirmDialog('Supprimer cette formation ? Les certifications liées seront retirées.', () => formationDelete(id)));
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
  if (!p.nom) { notify('Nom de la formation obligatoire.'); return; }
  if (ME.demo) {
    PAGES.formation.formations.push({ nom: p.nom, cat: CAT_DB_TO_UI[p.categorie] || 'veh' });
  } else {
    try { await api('formation_add', p); } catch (e) { notify(e.message); return; }
    await reloadFormationColumns();
  }
  await loadGestionFormations();
}

async function formationUpdate(p) {
  if (!p.nom) { notify('Nom de la formation obligatoire.'); return; }
  if (ME.demo) {
    const f = PAGES.formation.formations[p.id - 1];
    if (f) { f.nom = p.nom; f.cat = CAT_DB_TO_UI[p.categorie] || 'veh'; }
  } else {
    try { await api('formation_update', p); } catch (e) { notify(e.message); return; }
    await reloadFormationColumns();
  }
  await loadGestionFormations();
}

async function formationDelete(id) {
  if (ME.demo) {
    PAGES.formation.formations.splice(id - 1, 1);
  } else {
    try { await api('formation_delete', { id }); } catch (e) { notify(e.message); return; }
    await reloadFormationColumns();
  }
  await loadGestionFormations();
}

// ── Page Opérations (registre du commandement) ──
const OP_STATUTS = ['PLANIFIÉE', 'EN COURS', 'TERMINÉE'];
const opCanManage = () => !!(ME && (ME.section === 'comando' || ME.section === 'direction'));

async function loadOperations() {
  const root = document.getElementById('opRoot');
  if (!root) return;
  if (typeof skeletonBlock === 'function') root.innerHTML = skeletonBlock();
  try { OPERATIONS = (await api('operations')).operations || []; }
  catch (e) { root.innerHTML = `<div class="empty-state"><div class="empty-title">ERREUR</div><div class="empty-sub">${e.message}</div></div>`; return; }
  renderOperations();
  refreshStats('operations');
}

function renderOperations() {
  const root = document.getElementById('opRoot');
  if (!root) return;
  const canManage = opCanManage();

  const rows = OPERATIONS.map((o) => `
    <tr class="op-row" data-id="${o.id}">
      <td class="op-code">${escapeHtml(o.code) || '—'}</td>
      <td>${escapeHtml(o.objectif) || '—'}</td>
      <td>${escapeHtml(o.responsable) || '—'}</td>
      <td>${escapeHtml(o.date_op) || '—'}</td>
      <td>${badge(o.statut)}</td>
      <td class="gest-actions">
        <button class="btn btn-ghost btn-sm op-plan" data-id="${o.id}">🗺 Plan</button>
        ${canManage && o.statut === 'PLANIFIÉE' ? `<button class="btn btn-ghost btn-sm op-start" data-id="${o.id}">Démarrer</button>` : ''}
        ${canManage && o.statut === 'EN COURS' ? `<button class="btn btn-ghost btn-sm op-finish" data-id="${o.id}">Terminer</button>` : ''}
        ${canManage ? `<button class="gest-del op-del" data-id="${o.id}" title="Supprimer">✕</button>` : ''}
      </td>
    </tr>`).join('');

  root.innerHTML = `
    <div class="panel-head">
      <div><span class="panel-kicker">Commandement</span><h2 class="panel-title">REGISTRE DES OPÉRATIONS</h2></div>
      <div class="map-tools">
        <span class="panel-count">${OPERATIONS.length}</span>
        ${canManage ? `<button class="btn btn-primary btn-sm" id="opNew"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>NOUVELLE OPÉRATION</button>` : ''}
      </div>
    </div>
    <div class="filter-row"><div class="search-field"><input type="text" id="opSearch" placeholder="Rechercher une opération…"></div></div>
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr><th>Code</th><th>Objectif</th><th>Responsable</th><th>Date</th><th>Statut</th><th class="th-right">Actions</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      ${OPERATIONS.length ? '' : '<div class="empty-state"><div class="empty-title">AUCUNE OPÉRATION</div><div class="empty-sub">Le commandement peut en créer une avec le bouton ci-dessus.</div></div>'}
    </div>`;

  if (canManage) root.querySelector('#opNew')?.addEventListener('click', () => openOperationEditor(null));
  const search = root.querySelector('#opSearch');
  search.addEventListener('input', () => {
    const q = search.value.trim().toLowerCase();
    root.querySelectorAll('.op-row').forEach((el) => {
      const o = OPERATIONS.find((x) => x.id === +el.dataset.id) || {};
      const hit = !q || [o.code, o.objectif, o.responsable, o.participants].some((v) => String(v || '').toLowerCase().includes(q));
      el.style.display = hit ? '' : 'none';
    });
  });
  root.querySelectorAll('.op-row').forEach((tr) => tr.addEventListener('click', (e) => {
    if (e.target.closest('button')) return;
    openOperation(+tr.dataset.id);
  }));
  root.querySelectorAll('.op-plan').forEach((b) => b.addEventListener('click', () => { const o = OPERATIONS.find((x) => x.id === +b.dataset.id); if (o) renderOperationPlanner(o); }));
  root.querySelectorAll('.op-start').forEach((b) => b.addEventListener('click', () => operationSetStatus(+b.dataset.id, 'EN COURS')));
  root.querySelectorAll('.op-finish').forEach((b) => b.addEventListener('click', () => openOperationClose(+b.dataset.id)));
  root.querySelectorAll('.op-del').forEach((b) => b.addEventListener('click', () => confirmDialog('Supprimer définitivement cette opération ?', () => operationDelete(+b.dataset.id))));
}

function openOperation(id) {
  const o = OPERATIONS.find((x) => x.id === id);
  if (!o) return;
  const canManage = opCanManage();
  openModal(`
    <div class="modal-head">
      <div>
        <div class="modal-kicker">${escapeHtml(o.code) || '—'} · par ${escapeHtml(o.auteur_nom) || '—'}${o.date_op ? ' · ' + escapeHtml(o.date_op) : ''}</div>
        <h2 class="modal-title">${escapeHtml(o.objectif) || '—'}</h2>
      </div>
      <button class="popup-close" id="modalClose">✕</button>
    </div>
    <div class="modal-badge">${badge(o.statut)}</div>
    <div class="bl-info">
      <div class="bl-info-item"><span>Responsable</span><b>${escapeHtml(o.responsable) || '—'}</b></div>
      <div class="bl-info-item"><span>Participants</span><b>${escapeHtml(o.participants) || '—'}</b></div>
      <div class="bl-info-item"><span>Date</span><b>${escapeHtml(o.date_op) || '—'}</b></div>
    </div>
    ${o.compte_rendu ? `<div class="modal-sub">Compte-rendu</div><div class="modal-content">${escapeHtml(o.compte_rendu).replace(/\n/g, '<br>')}</div>` : ''}
    <button class="btn btn-ghost btn-sm" id="opPlanBtn" style="margin-top:14px">🗺 PLAN TACTIQUE</button>
    ${canManage ? `<div class="modal-actions">
      <button class="btn btn-ghost btn-sm" id="opEdit">MODIFIER</button>
      <button class="btn btn-danger btn-sm" id="opDel2"><svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2M6 7l1 13a1 1 0 001 1h8a1 1 0 001-1l1-13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>SUPPRIMER</button>
    </div>` : ''}
  `);
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('opPlanBtn').addEventListener('click', () => { closeModal(); renderOperationPlanner(o); });
  if (canManage) {
    document.getElementById('opEdit').addEventListener('click', () => openOperationEditor(o));
    document.getElementById('opDel2').addEventListener('click', () => confirmDialog('Supprimer définitivement cette opération ?', () => operationDelete(o.id)));
  }
}

function openOperationEditor(o) {
  openModal(`
    <div class="modal-head">
      <h2 class="modal-title">${o ? "MODIFIER L'OPÉRATION" : 'NOUVELLE OPÉRATION'}</h2>
      <button class="popup-close" id="modalClose">✕</button>
    </div>
    <div class="ann-form">
      <div class="ann-row">
        <input class="gest-in" id="opCode" placeholder="Code (ex. OP-JAGUAR)" value="${o ? escapeHtml(o.code || '') : ''}">
        <select class="gest-in" id="opStatut" style="max-width:180px">${OP_STATUTS.map((s) => `<option${o && o.statut === s ? ' selected' : ''}>${s}</option>`).join('')}</select>
      </div>
      <textarea class="gest-in ann-area" id="opObjectif" placeholder="Objectif de l'opération…">${o ? escapeHtml(o.objectif || '') : ''}</textarea>
      <div class="ann-row">
        <input class="gest-in" id="opResp" placeholder="Responsable" value="${o ? escapeHtml(o.responsable || '') : ''}">
        <div class="field-with-bolt"><input class="gest-in" id="opDate" placeholder="Date" value="${o ? escapeHtml(o.date_op || '') : ''}"><button class="bolt-btn" id="opDateNow" type="button" title="Aujourd'hui"><svg viewBox="0 0 24 24"><path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" fill="currentColor"/></svg></button></div>
      </div>
      <input class="gest-in" id="opParts" placeholder="Participants (matricules, ex. 12 15 43)" value="${o ? escapeHtml(o.participants || '') : ''}">
      <div class="modal-sub">Compte-rendu (à remplir à la clôture)</div>
      <textarea class="gest-in ann-area" id="opCR" placeholder="Compte-rendu de l'opération…">${o ? escapeHtml(o.compte_rendu || '') : ''}</textarea>
      <button class="btn btn-primary btn-sm" id="opSave">${o ? 'ENREGISTRER' : "CRÉER L'OPÉRATION"}</button>
    </div>
  `, 'modal-lg');
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('opDateNow').addEventListener('click', () => { document.getElementById('opDate').value = todayFR(); });
  document.getElementById('opSave').addEventListener('click', () => {
    operationSave(o ? o.id : null, {
      code: document.getElementById('opCode').value.trim(),
      objectif: document.getElementById('opObjectif').value.trim(),
      responsable: document.getElementById('opResp').value.trim(),
      participants: document.getElementById('opParts').value.trim(),
      date_op: document.getElementById('opDate').value.trim(),
      statut: document.getElementById('opStatut').value,
      compte_rendu: document.getElementById('opCR').value.trim(),
    });
  });
}

function openOperationClose(id) {
  const o = OPERATIONS.find((x) => x.id === id);
  if (!o) return;
  openModal(`
    <div class="modal-head">
      <h2 class="modal-title">TERMINER — ${escapeHtml(o.code) || 'OPÉRATION'}</h2>
      <button class="popup-close" id="modalClose">✕</button>
    </div>
    <div class="ann-form">
      <div class="modal-sub">Compte-rendu de clôture</div>
      <textarea class="gest-in ann-area" id="opCloseCR" placeholder="Ce qui s'est passé, résultat…">${escapeHtml(o.compte_rendu || '')}</textarea>
      <button class="btn btn-primary btn-sm" id="opCloseSave">MARQUER TERMINÉE</button>
    </div>
  `);
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('opCloseSave').addEventListener('click', () => {
    operationSetStatus(id, 'TERMINÉE', document.getElementById('opCloseCR').value.trim());
  });
}

async function reloadOperations() { try { OPERATIONS = (await api('operations')).operations || []; } catch (e) {} }

async function operationSave(id, p) {
  if (!p.code || !p.objectif) { notify('Code et objectif obligatoires.'); return; }
  try { await api(id ? 'operation_update' : 'operation_add', id ? { id, ...p } : p); } catch (e) { notify(e.message); return; }
  await reloadOperations();
  closeModal(); renderOperations(); refreshStats('operations');
}

async function operationSetStatus(id, statut, compte_rendu) {
  const body = { id, statut };
  if (typeof compte_rendu !== 'undefined') body.compte_rendu = compte_rendu;
  try { await api('operation_status', body); } catch (e) { notify(e.message); return; }
  await reloadOperations();
  closeModal(); renderOperations(); refreshStats('operations');
}

async function operationDelete(id) {
  try { await api('operation_delete', { id }); } catch (e) { notify(e.message); return; }
  await reloadOperations();
  closeModal(); renderOperations(); refreshStats('operations');
}

// ── Planificateur tactique d'une opération (carte + marqueurs par équipe) ──
const OP_TEAMS = [['alpha', 'Alpha'], ['bravo', 'Bravo'], ['charlie', 'Charlie'], ['delta', 'Delta']];
const OP_MARKERS = [
  ['objectif', 'Objectif', '★'], ['extraction', 'Extraction', '⬆'], ['insertion', 'Insertion', '⬇'],
  ['patrol', 'Patrouille', '↻'], ['checkpoint', 'Checkpoint', '◆'], ['nofly', 'No-fly', '⊘'],
  ['heli', 'Hélico', '🚁'], ['boat', 'Bateau', '⚓'], ['tireur', 'Tireur', '🎯'],
  ['vehicle', 'Véhicule', '🚗'], ['plane', 'Avion', '✈'], ['note', 'Annotation', '📌'],
];
const OP_MARK_ICON = Object.fromEntries(OP_MARKERS.map(([id, , ic]) => [id, ic]));
const OP_SHAPE_TOOLS = [['path', 'Chemin', '〰'], ['zone', 'Zone', '⬠'], ['arrow', "Axe d'attaque", '➟'], ['circle', 'Rayon', '◯']];
const OP_SHAPE_TYPES = ['path', 'zone', 'arrow', 'circle'];
const OP_TEAM_COLOR = { alpha: '#4ade80', bravo: '#4e96e8', charlie: '#f59e0b', delta: '#ef4444' };
let PLAN_MARKERS = [];
let PLAN_SHAPES = [];
let PLAN_PHASES = [];   // [{name}] — déroulement de l'opération
let PLAN_DRAW = null;   // tracé en cours de dessin
let PLAN_TOOL = 'select';
let PLAN_TEAM = 'alpha';
let PLAN_STEP = 0;      // phase assignée aux nouveaux éléments (0 = Toujours)
let PLAN_ANIM = null;   // { phase, playing, timer } quand l'animation est active
let PLAN_OP_ID = null;
let PLAN_SEL = null;
let _planId = 0;

function renderOperationPlanner(op) {
  const root = document.getElementById('opRoot');
  if (!root) return;
  const canManage = opCanManage();
  PLAN_OP_ID = op.id;
  PLAN_MARKERS = ((op.plan && op.plan.markers) || []).map((m) => ({ ...m }));
  PLAN_SHAPES = ((op.plan && op.plan.shapes) || []).map((s) => ({ ...s, points: s.points ? s.points.map((p) => ({ ...p })) : undefined }));
  PLAN_PHASES = ((op.plan && op.plan.phases) || []).map((p) => ({ ...p }));
  PLAN_TOOL = 'select'; PLAN_TEAM = 'alpha'; PLAN_SEL = null; PLAN_DRAW = null; PLAN_STEP = 0; PLAN_ANIM = null;
  _planId = [...PLAN_MARKERS, ...PLAN_SHAPES].reduce((mx, o) => Math.max(mx, o.id || 0), 0);

  const teamBtns = OP_TEAMS.map(([id, lbl]) => `<button class="plan-team team-${id}${id === PLAN_TEAM ? ' on' : ''}" data-team="${id}" type="button">${lbl}</button>`).join('');
  const markBtns = OP_MARKERS.map(([id, lbl, ic]) => `<button class="plan-tool" data-tool="${id}" type="button" title="${lbl}"><span>${ic}</span></button>`).join('');
  const shapeBtns = OP_SHAPE_TOOLS.map(([id, lbl, ic]) => `<button class="plan-tool" data-tool="${id}" type="button" title="${lbl}"><span>${ic}</span></button>`).join('');

  root.innerHTML = `
    <div class="panel-head" style="margin-bottom:12px">
      <div><span class="panel-kicker">Plan tactique</span><h2 class="panel-title">${escapeHtml(op.code) || 'OPÉRATION'}</h2></div>
      <div class="map-tools">
        <button class="btn btn-ghost btn-sm" id="planBack" type="button">← Retour</button>
        <button class="btn btn-ghost btn-sm" id="planAnim" type="button">▶ Animation</button>
        ${canManage ? '<button class="btn btn-primary btn-sm" id="planSave" type="button">Enregistrer le plan</button>' : ''}
      </div>
    </div>
    ${canManage ? `
    <div class="planner-toolbar" id="plannerToolbar">
      <div class="plan-group"><span class="plan-lbl">Équipe</span>${teamBtns}</div>
      <div class="plan-group"><span class="plan-lbl">Marqueurs</span>
        <button class="plan-tool on" data-tool="select" type="button" title="Sélectionner / déplacer"><span>➤</span></button>
        ${markBtns}
      </div>
      <div class="plan-group"><span class="plan-lbl">Tracés</span>${shapeBtns}</div>
      <div class="plan-group plan-phases"><span class="plan-lbl">Phase active</span><div class="phase-chips" id="phaseChips"></div><button class="plan-tool" id="phaseAdd" type="button" title="Ajouter une phase">＋</button></div>
      <button class="btn btn-ghost btn-sm" id="planDel" type="button">✕ Supprimer sélection</button>
    </div>
    <div class="plan-sel-bar" id="planSelBar" hidden></div>
    <div class="plan-draw-bar" id="planDrawBar" hidden></div>` : '<div class="map-note-bar">Plan en lecture seule — utilisez ▶ Animation pour dérouler l\'opération.</div>'}
    <div class="plan-anim-bar" id="planAnimBar" hidden></div>
    <div class="map-wrap planner-map" id="plannerMap">
      <img class="map-img" src="map.jpg" alt="Carte de Cayo Perico" onerror="this.closest('.map-wrap').classList.add('map-missing')">
      <svg class="planner-svg" id="plannerSvg" viewBox="0 0 100 100" preserveAspectRatio="none"></svg>
      <div class="map-placeholder"><div class="empty-title">CARTE INDISPONIBLE</div><div class="empty-sub">Ajoutez l'image map.jpg.</div></div>
    </div>`;

  root.querySelector('#planBack').addEventListener('click', () => { exitAnim(true); renderOperations(); });
  root.querySelector('#planAnim').addEventListener('click', () => { if (PLAN_ANIM) exitAnim(); else enterAnim(); });
  if (canManage) {
    root.querySelector('#planSave').addEventListener('click', () => operationSavePlan(PLAN_OP_ID, { markers: PLAN_MARKERS, shapes: PLAN_SHAPES, phases: PLAN_PHASES }));
    root.querySelector('#planDel').addEventListener('click', () => {
      if (PLAN_SEL == null) { notify('Sélectionnez d\'abord un marqueur ou un tracé (outil ➤).'); return; }
      PLAN_MARKERS = PLAN_MARKERS.filter((m) => m.id !== PLAN_SEL);
      PLAN_SHAPES = PLAN_SHAPES.filter((s) => s.id !== PLAN_SEL);
      PLAN_SEL = null; renderPlanMarkers(); renderPlanShapes(); updateSelBar();
    });
    root.querySelectorAll('.plan-team').forEach((b) => b.addEventListener('click', () => {
      PLAN_TEAM = b.dataset.team;
      root.querySelectorAll('.plan-team').forEach((x) => x.classList.remove('on'));
      b.classList.add('on');
    }));
    root.querySelectorAll('.plan-tool[data-tool]').forEach((b) => b.addEventListener('click', () => {
      if (PLAN_DRAW) cancelDraw();
      PLAN_TOOL = b.dataset.tool;
      root.querySelectorAll('.plan-tool[data-tool]').forEach((x) => x.classList.remove('on'));
      b.classList.add('on');
    }));
    root.querySelector('#phaseAdd').addEventListener('click', () => {
      const name = prompt('Nom de la phase :', 'Phase ' + (PLAN_PHASES.length + 1));
      if (name == null) return;
      PLAN_PHASES.push({ name: name.trim() || ('Phase ' + (PLAN_PHASES.length + 1)) });
      PLAN_STEP = PLAN_PHASES.length;
      renderPhaseChips();
    });
    const map = root.querySelector('#plannerMap');
    map.addEventListener('click', (e) => {
      if (PLAN_ANIM || e.target.closest('.plan-marker')) return;
      const r = map.getBoundingClientRect();
      const x = +(((e.clientX - r.left) / r.width) * 100).toFixed(2);
      const y = +(((e.clientY - r.top) / r.height) * 100).toFixed(2);
      if (OP_SHAPE_TYPES.includes(PLAN_TOOL)) { planShapeClick(x, y); return; }
      if (PLAN_TOOL === 'select') return;
      const label = PLAN_TOOL === 'note' ? (prompt("Texte de l'annotation :") || '') : '';
      PLAN_MARKERS.push({ id: ++_planId, type: PLAN_TOOL, team: PLAN_TEAM, x, y, label, step: PLAN_STEP });
      renderPlanMarkers();
    });
    renderPhaseChips();
  }
  // Recalcule les rayons une fois la carte chargée (ratio largeur/hauteur correct)
  const imgEl = root.querySelector('#plannerMap .map-img');
  if (imgEl) imgEl.addEventListener('load', () => renderPlanShapes());
  renderPlanMarkers();
  renderPlanShapes();
}

function renderPlanMarkers() {
  const map = document.getElementById('plannerMap');
  if (!map) return;
  const canManage = opCanManage();
  map.querySelectorAll('.plan-marker').forEach((el) => el.remove());
  PLAN_MARKERS.forEach((m) => {
    if (!planStepVisible(m.step)) return;
    const el = document.createElement('div');
    const entering = PLAN_ANIM && (m.step || 0) === PLAN_ANIM.phase;
    el.className = `plan-marker team-${m.team}${PLAN_SEL === m.id ? ' sel' : ''}${PLAN_ANIM ? ' pm-live' : ''}${entering ? ' pm-enter' : ''}`;
    el.style.left = m.x + '%'; el.style.top = m.y + '%';
    el.dataset.id = m.id;
    el.innerHTML = `<span class="pm-ico">${OP_MARK_ICON[m.type] || '•'}</span>${m.label ? `<span class="pm-lbl">${escapeHtml(m.label)}</span>` : ''}`;
    map.appendChild(el);
    if (canManage && !PLAN_ANIM) attachPlanDrag(el, m, map);
  });
}

function attachPlanDrag(el, m, map) {
  el.addEventListener('pointerdown', (e) => {
    if (PLAN_TOOL !== 'select') return;
    e.stopPropagation();
    let moved = false;
    const sx = e.clientX, sy = e.clientY;
    el.setPointerCapture(e.pointerId);
    const move = (ev) => {
      if (Math.abs(ev.clientX - sx) > 2 || Math.abs(ev.clientY - sy) > 2) moved = true;
      const r = map.getBoundingClientRect();
      m.x = Math.max(0, Math.min(100, ((ev.clientX - r.left) / r.width) * 100));
      m.y = Math.max(0, Math.min(100, ((ev.clientY - r.top) / r.height) * 100));
      el.style.left = m.x + '%'; el.style.top = m.y + '%';
    };
    const up = () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      m.x = +m.x.toFixed(2); m.y = +m.y.toFixed(2);
      if (!moved) { PLAN_SEL = (PLAN_SEL === m.id ? null : m.id); renderPlanMarkers(); updateSelBar(); }
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
  });
}

// Tracés (SVG en % sur la carte) : chemin, zone, axe d'attaque, rayon
function renderPlanShapes() {
  const svg = document.getElementById('plannerSvg');
  const map = document.getElementById('plannerMap');
  if (!svg || !map) return;
  const canManage = opCanManage();
  const rect = map.getBoundingClientRect();
  const ratio = rect.height ? rect.width / rect.height : 1;

  const draw = (s) => {
    const col = OP_TEAM_COLOR[s.team] || '#4ade80';
    const sel = PLAN_SEL === s.id;
    const sw = sel ? 4 : (s.type === 'arrow' ? 3 : 2.4);
    const idA = s.id != null ? ` data-id="${s.id}"` : '';
    const en = (PLAN_ANIM && (s.step || 0) === PLAN_ANIM.phase) ? ' data-enter="1"' : '';
    if (s.type === 'path') return `<polyline class="pl-shape"${idA}${en} points="${s.points.map((p) => `${p.x},${p.y}`).join(' ')}" fill="none" stroke="${col}" stroke-width="${sw}" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round"/>`;
    if (s.type === 'zone') return `<polygon class="pl-shape"${idA}${en} points="${s.points.map((p) => `${p.x},${p.y}`).join(' ')}" fill="${col}22" stroke="${col}" stroke-width="${sw}" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>`;
    if (s.type === 'arrow') { const [a, b] = s.points; if (!b) return ''; return `<line class="pl-shape"${idA}${en} x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${col}" stroke-width="${sw}" vector-effect="non-scaling-stroke" marker-end="url(#pl-arrow)"/>`; }
    if (s.type === 'circle') return `<ellipse class="pl-shape"${idA}${en} cx="${s.x}" cy="${s.y}" rx="${s.r}" ry="${(s.r * ratio).toFixed(2)}" fill="${col}18" stroke="${col}" stroke-width="${sw}" vector-effect="non-scaling-stroke"/>`;
    return '';
  };

  const finished = PLAN_SHAPES.filter((s) => planStepVisible(s.step)).map(draw).join('');
  let preview = '';
  if (PLAN_DRAW) {
    const d = PLAN_DRAW, col = OP_TEAM_COLOR[d.team] || '#4ade80';
    const dot = (p) => `<circle cx="${p.x}" cy="${p.y}" r="0.9" fill="${col}" vector-effect="non-scaling-stroke"/>`;
    if ((d.type === 'path' || d.type === 'zone') && d.points.length >= 2) {
      preview += `<polyline points="${d.points.map((p) => `${p.x},${p.y}`).join(' ')}" fill="none" stroke="${col}" stroke-width="2.4" vector-effect="non-scaling-stroke" stroke-dasharray="3 2" stroke-linejoin="round" stroke-linecap="round"/>`;
    }
    preview += (d.points || []).map(dot).join('');
  }

  svg.innerHTML = `<defs><marker id="pl-arrow" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto"><path d="M0,0 L5,2.5 L0,5 Z" fill="context-stroke"/></marker></defs>${finished}${preview}`;

  if (PLAN_ANIM) animateEnteringShapes(svg);

  if (canManage && !PLAN_ANIM) {
    svg.querySelectorAll('.pl-shape').forEach((el) => el.addEventListener('click', (e) => {
      if (PLAN_TOOL !== 'select') return;
      e.stopPropagation();
      const id = +el.dataset.id;
      PLAN_SEL = (PLAN_SEL === id ? null : id);
      renderPlanShapes(); renderPlanMarkers(); updateSelBar();
    }));
  }
}

// Animation d'apparition des tracés en mode lecture : tracé progressif (lignes/chemins)
// et éclosion (zones/rayons).
function animateEnteringShapes(svg) {
  svg.querySelectorAll('[data-enter="1"]').forEach((el, i) => {
    const tag = el.tagName.toLowerCase();
    const delay = Math.min(i * 90, 400);
    if (tag === 'polyline' || tag === 'line') {
      let len = 0;
      try { len = el.getTotalLength(); } catch (e) { len = 0; }
      if (len > 0) {
        el.style.strokeDasharray = len;
        el.style.strokeDashoffset = len;
        el.getBoundingClientRect(); // force le reflow avant la transition
        el.style.transition = `stroke-dashoffset .9s ease ${delay}ms`;
        requestAnimationFrame(() => { el.style.strokeDashoffset = '0'; });
      }
    } else {
      el.style.animationDelay = delay + 'ms';
      el.classList.add('pl-pop');
    }
  });
}

function planShapeClick(x, y) {
  const t = PLAN_TOOL;
  if (t === 'arrow') {
    if (!PLAN_DRAW) PLAN_DRAW = { type: 'arrow', team: PLAN_TEAM, points: [{ x, y }] };
    else { PLAN_DRAW.points.push({ x, y }); finishDraw(); return; }
  } else if (t === 'circle') {
    if (!PLAN_DRAW) PLAN_DRAW = { type: 'circle', team: PLAN_TEAM, points: [{ x, y }] };
    else {
      const c = PLAN_DRAW.points[0];
      const rect = document.getElementById('plannerMap').getBoundingClientRect();
      const dx = (x - c.x) / 100 * rect.width;
      const dy = (y - c.y) / 100 * rect.height;
      const r = Math.hypot(dx, dy) / rect.width * 100;
      PLAN_DRAW = { type: 'circle', team: PLAN_DRAW.team, x: c.x, y: c.y, r: +r.toFixed(2) };
      finishDraw(); return;
    }
  } else { // path / zone
    if (!PLAN_DRAW) PLAN_DRAW = { type: t, team: PLAN_TEAM, points: [{ x, y }] };
    else PLAN_DRAW.points.push({ x, y });
  }
  renderPlanShapes();
  updateDrawBar();
}

function finishDraw() {
  if (!PLAN_DRAW) return;
  const s = PLAN_DRAW;
  const ok = (s.type === 'path' && s.points.length >= 2) ||
             (s.type === 'zone' && s.points.length >= 3) ||
             (s.type === 'arrow' && s.points && s.points.length >= 2) ||
             (s.type === 'circle' && s.r > 0);
  if (ok) { s.id = ++_planId; s.step = PLAN_STEP; PLAN_SHAPES.push(s); }
  else notify('Tracé trop court — annulé.');
  PLAN_DRAW = null;
  renderPlanShapes(); updateDrawBar();
}

function cancelDraw() {
  PLAN_DRAW = null;
  renderPlanShapes(); updateDrawBar();
}

function updateDrawBar() {
  const bar = document.getElementById('planDrawBar');
  if (!bar) return;
  if (!PLAN_DRAW) { bar.hidden = true; bar.innerHTML = ''; return; }
  const t = PLAN_DRAW.type, n = PLAN_DRAW.points ? PLAN_DRAW.points.length : 0;
  let msg;
  if (t === 'path') msg = `Chemin — ${n} point(s). Cliquez pour ajouter, puis Terminer.`;
  else if (t === 'zone') msg = `Zone — ${n} point(s). Il en faut au moins 3, puis Terminer.`;
  else if (t === 'arrow') msg = "Axe d'attaque — cliquez le point d'arrivée.";
  else msg = 'Rayon — cliquez pour définir le rayon.';
  bar.hidden = false;
  bar.innerHTML = `<span class="plan-draw-msg">${msg}</span>${(t === 'path' || t === 'zone') ? '<button class="btn btn-primary btn-sm" id="drawFinish" type="button">✓ Terminer</button>' : ''}<button class="btn btn-ghost btn-sm" id="drawCancel" type="button">Annuler</button>`;
  const f = document.getElementById('drawFinish');
  if (f) f.addEventListener('click', finishDraw);
  document.getElementById('drawCancel').addEventListener('click', cancelDraw);
}

// ── Phases (déroulement de l'opération) + animation ──
function planStepVisible(step) {
  if (!PLAN_ANIM) return true;
  const s = step || 0;
  return s === 0 || s <= PLAN_ANIM.phase;
}

function renderPhaseChips() {
  const box = document.getElementById('phaseChips');
  if (!box) return;
  const chips = [`<button class="phase-chip${PLAN_STEP === 0 ? ' on' : ''}" data-step="0" type="button">Toujours</button>`]
    .concat(PLAN_PHASES.map((p, i) => `<button class="phase-chip${PLAN_STEP === i + 1 ? ' on' : ''}" data-step="${i + 1}" type="button" title="Double-clic : renommer">${i + 1}. ${escapeHtml(p.name)}<span class="phase-del" data-del="${i + 1}" title="Supprimer la phase">✕</span></button>`));
  box.innerHTML = chips.join('');
  box.querySelectorAll('.phase-chip').forEach((c) => {
    c.addEventListener('click', (e) => {
      const del = e.target.closest('.phase-del');
      if (del) { deletePhase(+del.dataset.del); return; }
      PLAN_STEP = +c.dataset.step; renderPhaseChips();
    });
    c.addEventListener('dblclick', () => {
      const step = +c.dataset.step;
      if (!step) return;
      const cur = PLAN_PHASES[step - 1];
      const name = prompt('Nom de la phase :', cur.name);
      if (name != null) { cur.name = name.trim() || cur.name; renderPhaseChips(); }
    });
  });
}

function deletePhase(idx) {
  PLAN_PHASES.splice(idx - 1, 1);
  const fix = (o) => { const s = o.step || 0; if (s === idx) o.step = 0; else if (s > idx) o.step = s - 1; };
  PLAN_MARKERS.forEach(fix); PLAN_SHAPES.forEach(fix);
  if (PLAN_STEP === idx) PLAN_STEP = 0; else if (PLAN_STEP > idx) PLAN_STEP -= 1;
  renderPhaseChips(); renderPlanMarkers(); renderPlanShapes();
}

function updateSelBar() {
  const bar = document.getElementById('planSelBar');
  if (!bar) return;
  const el = PLAN_MARKERS.find((m) => m.id === PLAN_SEL) || PLAN_SHAPES.find((s) => s.id === PLAN_SEL);
  if (!el || PLAN_ANIM) { bar.hidden = true; bar.innerHTML = ''; return; }
  const chips = [`<button class="phase-chip${(el.step || 0) === 0 ? ' on' : ''}" data-s="0" type="button">Toujours</button>`]
    .concat(PLAN_PHASES.map((p, i) => `<button class="phase-chip${(el.step || 0) === i + 1 ? ' on' : ''}" data-s="${i + 1}" type="button">${i + 1}</button>`));
  bar.hidden = false;
  bar.innerHTML = `<span class="plan-lbl">Phase de l'élément</span>${chips.join('')}`;
  bar.querySelectorAll('.phase-chip').forEach((c) => c.addEventListener('click', () => { el.step = +c.dataset.s; updateSelBar(); }));
}

function enterAnim() {
  if (PLAN_DRAW) cancelDraw();
  PLAN_SEL = null; updateSelBar();
  PLAN_ANIM = { phase: 0, playing: false, timer: null, speed: 1600 };
  const tb = document.getElementById('plannerToolbar'); if (tb) tb.style.display = 'none';
  const db = document.getElementById('planDrawBar'); if (db) db.hidden = true;
  const btn = document.getElementById('planAnim'); if (btn) btn.textContent = '■ Quitter';
  renderAnimBar(); renderPlanMarkers(); renderPlanShapes();
}

function exitAnim(silent) {
  if (!PLAN_ANIM) return;
  if (PLAN_ANIM.timer) clearInterval(PLAN_ANIM.timer);
  PLAN_ANIM = null;
  const tb = document.getElementById('plannerToolbar'); if (tb) tb.style.display = '';
  const ab = document.getElementById('planAnimBar'); if (ab) { ab.hidden = true; ab.innerHTML = ''; }
  const btn = document.getElementById('planAnim'); if (btn) btn.textContent = '▶ Animation';
  if (!silent) { renderPlanMarkers(); renderPlanShapes(); }
}

function animGoto(p) {
  if (!PLAN_ANIM) return;
  PLAN_ANIM.phase = Math.max(0, Math.min(PLAN_PHASES.length, p));
  renderAnimBar(); renderPlanMarkers(); renderPlanShapes();
}

function animStop() {
  if (!PLAN_ANIM) return;
  if (PLAN_ANIM.timer) { clearInterval(PLAN_ANIM.timer); PLAN_ANIM.timer = null; }
  PLAN_ANIM.playing = false;
}

function animPlayToggle() {
  if (!PLAN_ANIM) return;
  if (PLAN_ANIM.playing) { animStop(); renderAnimBar(); return; }
  if (PLAN_ANIM.phase >= PLAN_PHASES.length) { animGoto(0); }
  PLAN_ANIM.playing = true;
  PLAN_ANIM.timer = setInterval(() => {
    if (!PLAN_ANIM || PLAN_ANIM.phase >= PLAN_PHASES.length) { animStop(); renderAnimBar(); return; }
    animGoto(PLAN_ANIM.phase + 1);
  }, PLAN_ANIM.speed);
  renderAnimBar(); renderPlanMarkers(); renderPlanShapes();
}

function cycleAnimSpeed() {
  if (!PLAN_ANIM) return;
  const order = [1600, 900, 2600]; // 1× → 2× → 0.5×
  PLAN_ANIM.speed = order[(order.indexOf(PLAN_ANIM.speed) + 1) % order.length];
  if (PLAN_ANIM.playing) { animStop(); animPlayToggle(); } else renderAnimBar();
}

function renderAnimBar() {
  const bar = document.getElementById('planAnimBar');
  if (!bar || !PLAN_ANIM) return;
  const N = PLAN_PHASES.length, p = PLAN_ANIM.phase;
  const name = p === 0 ? 'Mise en place (éléments « Toujours »)' : (PLAN_PHASES[p - 1] ? PLAN_PHASES[p - 1].name : '');
  const pct = N ? Math.round((p / N) * 100) : 0;
  const speedLbl = PLAN_ANIM.speed <= 900 ? '2×' : (PLAN_ANIM.speed >= 2600 ? '0.5×' : '1×');
  let dots = '';
  for (let i = 0; i <= N; i++) {
    const dl = i === 0 ? 'Mise en place' : (PLAN_PHASES[i - 1] ? PLAN_PHASES[i - 1].name : 'Phase ' + i);
    dots += `<button class="anim-dot${i === p ? ' on' : ''}${i < p ? ' done' : ''}" data-go="${i}" type="button" title="${escapeHtml(dl)}">${i}</button>`;
  }
  bar.hidden = false;
  bar.innerHTML = `
    <div class="anim-controls">
      <button class="btn btn-ghost btn-sm" id="animPrev" type="button"${p <= 0 ? ' disabled' : ''}>◀</button>
      <button class="btn btn-primary btn-sm" id="animPlay" type="button">${PLAN_ANIM.playing ? '⏸ Pause' : '▶ Lecture'}</button>
      <button class="btn btn-ghost btn-sm" id="animNext" type="button"${p >= N ? ' disabled' : ''}>▶</button>
      <button class="btn btn-ghost btn-sm" id="animRestart" type="button" title="Recommencer">↺</button>
      <button class="btn btn-ghost btn-sm" id="animSpeed" type="button" title="Vitesse de lecture">${speedLbl}</button>
      <span class="anim-phase"><b>Phase ${p} / ${N}</b>${name ? ' — ' + escapeHtml(name) : ''}</span>
    </div>
    <div class="anim-timeline">
      <div class="anim-track"><div class="anim-fill" style="width:${pct}%"></div></div>
      <div class="anim-dots">${dots}</div>
    </div>`;
  bar.querySelector('#animPrev').addEventListener('click', () => { animStop(); animGoto(p - 1); });
  bar.querySelector('#animNext').addEventListener('click', () => { animStop(); animGoto(p + 1); });
  bar.querySelector('#animPlay').addEventListener('click', animPlayToggle);
  bar.querySelector('#animRestart').addEventListener('click', () => { animStop(); animGoto(0); });
  bar.querySelector('#animSpeed').addEventListener('click', cycleAnimSpeed);
  bar.querySelectorAll('.anim-dot').forEach((d) => d.addEventListener('click', () => { animStop(); animGoto(+d.dataset.go); }));
}

async function operationSavePlan(id, plan) {
  try { await api('operation_plan', { id, plan }); } catch (e) { notify(e.message); return; }
  await reloadOperations();
  notify('Plan tactique enregistré.', 'success');
  const op = OPERATIONS.find((x) => x.id === id);
  if (op) renderOperationPlanner(op); else renderOperations();
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
    // Pas de backend joignable → écran de connexion
    showLogin("Serveur non joignable. Vérifiez l'API / la base.");
  }
}

boot();
