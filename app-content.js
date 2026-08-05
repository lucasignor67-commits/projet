// ── Page Communications ──
const ANN_PRIOS = ['NORMALE', 'IMPORTANTE', 'URGENTE'];
const MAX_PHOTOS = 4;

async function loadAnnonces() {
  const root = document.getElementById('commRoot');
  if (!root) return;
  try {
    if (!ME.demo) ANNONCES = (await api('annonces')).annonces || [];
  } catch (e) {
    root.innerHTML = `<div class="empty-state"><div class="empty-title">ERREUR</div><div class="empty-sub">${e.message}</div></div>`;
    return;
  }
  renderAnnonces();
  refreshStats('communications');
}

function renderAnnonces() {
  const root = document.getElementById('commRoot');
  if (!root) return;
  const canManage = !!(ME && (ME.section === 'comando' || ME.section === 'direction'));

  const cards = ANNONCES.map((a) => {
    const photos = a.photos || [];
    const snippet = escapeHtml((a.contenu || '').slice(0, 140)) + ((a.contenu || '').length > 140 ? '…' : '');
    return `
    <article class="feed-item comm-card tone-${tone(a.priorite)}" data-id="${a.id}">
      ${photos.length ? `<div class="comm-thumb"><img src="${photos[0]}" alt="">${photos.length > 1 ? `<span class="comm-thumb-more">+${photos.length - 1}</span>` : ''}</div>` : ''}
      <div class="comm-body">
        <div class="feed-head">
          <span class="feed-title">${escapeHtml(a.titre) || '—'}</span>
          ${badge(a.priorite)}
        </div>
        <p class="feed-text">${snippet || '—'}</p>
        <div class="feed-meta">${escapeHtml(a.auteur_nom) || '—'} &nbsp;·&nbsp; ${escapeHtml(a.date_annonce) || ''}</div>
      </div>
    </article>`;
  }).join('');

  root.innerHTML = `
    <div class="panel-head">
      <div><span class="panel-kicker">Diffusion</span><h2 class="panel-title">ANNONCES INTERNES</h2></div>
      <div class="map-tools">
        <span class="panel-count">${ANNONCES.length}</span>
        ${canManage ? `<button class="btn btn-primary btn-sm" id="annNew"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>NOUVELLE ANNONCE</button>` : ''}
      </div>
    </div>
    ${ANNONCES.length ? `<div class="feed">${cards}</div>`
      : '<div class="empty-state"><div class="empty-title">AUCUNE ANNONCE</div><div class="empty-sub">Aucune communication pour le moment.</div></div>'}`;

  // Clic sur une annonce → détail
  root.querySelectorAll('.comm-card').forEach((c) => c.addEventListener('click', () => openAnnonce(+c.dataset.id)));
  if (canManage) root.querySelector('#annNew')?.addEventListener('click', () => openAnnonceEditor(null));
}

// Détail (agrandir)
function openAnnonce(id) {
  const a = ANNONCES.find((x) => x.id === id);
  if (!a) return;
  const canManage = !!(ME && (ME.section === 'comando' || ME.section === 'direction'));
  const photos = a.photos || [];
  openModal(`
    <div class="modal-head">
      <div>
        <div class="modal-kicker">${escapeHtml(a.auteur_nom) || '—'} · ${escapeHtml(a.date_annonce) || ''}</div>
        <h2 class="modal-title">${escapeHtml(a.titre) || '—'}</h2>
      </div>
      <button class="popup-close" id="modalClose">✕</button>
    </div>
    <div class="modal-badge">${badge(a.priorite)}</div>
    <div class="modal-content">${escapeHtml(a.contenu || '').replace(/\n/g, '<br>')}</div>
    ${photos.length ? `<div class="comm-photos">${photos.map((p) => `<a href="${p}" target="_blank" rel="noopener"><img src="${p}" alt=""></a>`).join('')}</div>` : ''}
    ${canManage ? `<div class="modal-actions">
      <button class="btn btn-ghost btn-sm" id="annEdit">MODIFIER</button>
      <button class="btn btn-danger btn-sm" id="annDel"><svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2M6 7l1 13a1 1 0 001 1h8a1 1 0 001-1l1-13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>SUPPRIMER</button>
    </div>` : ''}
  `);
  document.getElementById('modalClose').addEventListener('click', closeModal);
  if (canManage) {
    document.getElementById('annEdit').addEventListener('click', () => openAnnonceEditor(a));
    document.getElementById('annDel').addEventListener('click', () => { if (confirm('Supprimer cette annonce ?')) annonceDelete(a.id); });
  }
}

// Créer / modifier
function openAnnonceEditor(a) {
  EDITOR_PHOTOS = a && a.photos ? [...a.photos] : [];
  openModal(`
    <div class="modal-head">
      <h2 class="modal-title">${a ? "MODIFIER L'ANNONCE" : 'NOUVELLE ANNONCE'}</h2>
      <button class="popup-close" id="modalClose">✕</button>
    </div>
    <div class="ann-form">
      <input class="gest-in" id="annTitre" placeholder="Titre de l'annonce" value="${a ? escapeHtml(a.titre) : ''}">
      <div class="ann-row">
        <select class="gest-in" id="annPrio">${ANN_PRIOS.map((p) => `<option${a && a.priorite === p ? ' selected' : ''}>${p}</option>`).join('')}</select>
        <div class="field-with-bolt">
          <input class="gest-in" id="annDate" placeholder="Date" value="${a ? escapeHtml(a.date_annonce || '') : ''}">
          <button class="bolt-btn" id="annDateNow" type="button" title="Aujourd'hui"><svg viewBox="0 0 24 24"><path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" fill="currentColor"/></svg></button>
        </div>
      </div>
      <textarea class="gest-in ann-area" id="annContenu" placeholder="Contenu de l'annonce…">${a ? escapeHtml(a.contenu || '') : ''}</textarea>
      <div class="ann-photos-bar">
        <label class="btn btn-ghost btn-sm">
          <svg viewBox="0 0 24 24"><path d="M4 5h16v14H4z" stroke="currentColor" stroke-width="2"/><path d="M4 16l5-5 4 4 3-3 4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="9" cy="9" r="1.5" fill="currentColor"/></svg>
          AJOUTER DES PHOTOS
          <input type="file" id="annPhotoInput" accept="image/*" multiple hidden>
        </label>
        <span class="ann-photos-hint">Max ${MAX_PHOTOS} · compressées automatiquement</span>
      </div>
      <div class="ann-thumbs" id="annThumbs"></div>
      <button class="btn btn-primary btn-sm" id="annSave">${a ? 'ENREGISTRER LES MODIFICATIONS' : "PUBLIER L'ANNONCE"}</button>
    </div>
  `);

  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('annDateNow').addEventListener('click', () => { document.getElementById('annDate').value = todayFR(); });
  renderEditorThumbs();

  document.getElementById('annPhotoInput').addEventListener('change', async (e) => {
    const files = [...e.target.files];
    for (const f of files) {
      if (EDITOR_PHOTOS.length >= MAX_PHOTOS) { alert(`Maximum ${MAX_PHOTOS} photos.`); break; }
      try { EDITOR_PHOTOS.push(await compressImage(f)); } catch (err) { /* ignore */ }
    }
    e.target.value = '';
    renderEditorThumbs();
  });

  document.getElementById('annSave').addEventListener('click', () => {
    annonceSave(a ? a.id : null, {
      titre: document.getElementById('annTitre').value.trim(),
      priorite: document.getElementById('annPrio').value,
      date_annonce: document.getElementById('annDate').value.trim(),
      contenu: document.getElementById('annContenu').value.trim(),
      photos: EDITOR_PHOTOS,
    });
  });
}

function renderEditorThumbs(containerId = 'annThumbs') {
  const box = document.getElementById(containerId);
  if (!box) return;
  box.innerHTML = EDITOR_PHOTOS.map((p, i) => `
    <div class="ann-thumb"><img src="${p}" alt=""><button class="ann-thumb-del" data-i="${i}" title="Retirer">✕</button></div>`).join('');
  box.querySelectorAll('.ann-thumb-del').forEach((b) => b.addEventListener('click', () => {
    EDITOR_PHOTOS.splice(+b.dataset.i, 1);
    renderEditorThumbs();
  }));
}

async function annonceSave(id, p) {
  if (!p.titre || !p.contenu) { alert('Titre et contenu obligatoires.'); return; }
  if (ME.demo) {
    if (id) {
      const a = ANNONCES.find((x) => x.id === id);
      if (a) Object.assign(a, p);
    } else {
      ANNONCES.unshift({ id: Date.now(), auteur_matricule: ME.matricule, auteur_nom: ME.nom, ...p });
    }
  } else {
    try { await api(id ? 'annonce_update' : 'annonce_add', id ? { id, ...p } : p); } catch (e) { alert(e.message); return; }
    await reloadAnnonces();
  }
  closeModal();
  renderAnnonces();
  refreshStats('communications');
}

async function reloadAnnonces() {
  try { ANNONCES = (await api('annonces')).annonces || []; } catch (e) {}
}

async function annonceDelete(id) {
  if (ME.demo) {
    ANNONCES = ANNONCES.filter((x) => x.id !== id);
  } else {
    try { await api('annonce_delete', { id }); } catch (e) { alert(e.message); return; }
    await reloadAnnonces();
  }
  closeModal();
  renderAnnonces();
  refreshStats('communications');
}

// ── Page TIG ──
async function loadTig() {
  const root = document.getElementById('tigRoot');
  if (!root) return;
  try { if (!ME.demo) TIGS = (await api('tig')).tig || []; }
  catch (e) { root.innerHTML = `<div class="empty-state"><div class="empty-title">ERREUR</div><div class="empty-sub">${e.message}</div></div>`; return; }
  renderTig();
  refreshStats('tig');
}

function renderTig() {
  const root = document.getElementById('tigRoot');
  if (!root) return;
  const canDel = !!(ME && (ME.section === 'comando' || ME.section === 'direction'));

  const rows = TIGS.map((t) => `
    <tr>
      <td>${escapeHtml(t.nom) || '—'}</td>
      <td>${escapeHtml(t.heures) || '—'}</td>
      <td>${escapeHtml(t.motif) || '—'}</td>
      <td>${escapeHtml(t.date_tig) || '—'}</td>
      <td>${escapeHtml(t.par) || '—'}</td>
      <td>${badge(t.statut)}</td>
      <td class="gest-actions">
        ${t.statut === 'EN COURS' ? `<button class="btn btn-ghost btn-sm tig-finish" data-id="${t.id}">TERMINER</button>` : ''}
        ${canDel || (ME && t.auteur_matricule === ME.matricule) ? `<button class="gest-del tig-del" data-id="${t.id}" title="Supprimer">✕</button>` : ''}
      </td>
    </tr>`).join('');

  root.innerHTML = `
    <div class="panel-head">
      <div><span class="panel-kicker">Sanction</span><h2 class="panel-title">NOUVEAU TIG</h2></div>
    </div>
    <div class="pat-form">
      <input class="gest-in" id="tigNom" placeholder="Nom & Prénom">
      <input class="gest-in" id="tigHeures" placeholder="Heures (ex. 20h)" style="max-width:140px">
      <input class="gest-in" id="tigMotif" placeholder="Motif">
      <div class="field-with-bolt" style="max-width:200px">
        <input class="gest-in" id="tigDate" placeholder="Date">
        <button class="bolt-btn" id="tigDateNow" type="button" title="Aujourd'hui"><svg viewBox="0 0 24 24"><path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" fill="currentColor"/></svg></button>
      </div>
      <button class="btn btn-primary btn-sm" id="tigAdd">AJOUTER</button>
    </div>
    <div class="panel-head" style="margin-top:20px">
      <div><span class="panel-kicker">Registre</span><h2 class="panel-title">TIG EN COURS ET TERMINÉS</h2></div>
      <span class="panel-count">${TIGS.length}</span>
    </div>
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr><th>Personne</th><th>Heures</th><th>Motif</th><th>Date</th><th>Assigné par</th><th>Statut</th><th class="th-right">Action</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      ${TIGS.length ? '' : '<div class="empty-state"><div class="empty-title">AUCUN TIG</div><div class="empty-sub">Créez-en un avec le formulaire ci-dessus.</div></div>'}
    </div>`;

  root.querySelector('#tigDateNow').addEventListener('click', () => { root.querySelector('#tigDate').value = todayFR(); });
  root.querySelector('#tigAdd').addEventListener('click', () => {
    tigAdd({
      nom: root.querySelector('#tigNom').value.trim(),
      heures: root.querySelector('#tigHeures').value.trim(),
      motif: root.querySelector('#tigMotif').value.trim(),
      date_tig: root.querySelector('#tigDate').value.trim(),
    });
  });
  root.querySelectorAll('.tig-finish').forEach((b) => b.addEventListener('click', () => tigFinish(+b.dataset.id)));
  root.querySelectorAll('.tig-del').forEach((b) => b.addEventListener('click', () => { if (confirm('Supprimer ce TIG ?')) tigDelete(+b.dataset.id); }));
}

async function reloadTig() { try { TIGS = (await api('tig')).tig || []; } catch (e) {} }

async function tigAdd(p) {
  if (!p.nom || !p.motif) { alert('Nom et motif obligatoires.'); return; }
  if (ME.demo) { TIGS.unshift({ id: Date.now(), par: ME.nom, auteur_matricule: ME.matricule, statut: 'EN COURS', ...p }); }
  else { try { await api('tig_add', p); } catch (e) { alert(e.message); return; } await reloadTig(); }
  renderTig(); refreshStats('tig');
}
async function tigFinish(id) {
  if (ME.demo) { const t = TIGS.find((x) => x.id === id); if (t) t.statut = 'TERMINÉ'; }
  else { try { await api('tig_finish', { id }); } catch (e) { alert(e.message); return; } await reloadTig(); }
  renderTig(); refreshStats('tig');
}
async function tigDelete(id) {
  if (ME.demo) { TIGS = TIGS.filter((x) => x.id !== id); }
  else { try { await api('tig_delete', { id }); } catch (e) { alert(e.message); return; } await reloadTig(); }
  renderTig(); refreshStats('tig');
}

// ── Page Saisies (rapport de saisie / amendes) ──
const fmtMoney = (n) => '$' + Number(n || 0).toLocaleString('en-US').replace(/,/g, ' ');
let SAI_ITEMS = []; // infractions du rapport en cours d'édition

function grilleOptions() {
  const byCat = {};
  GRILLE.forEach((g, i) => { const k = g.cat || g.groupe || 'Autres'; (byCat[k] = byCat[k] || []).push({ g, i }); });
  return Object.entries(byCat).map(([cat, list]) =>
    `<optgroup label="${escapeHtml(cat)}">${list.map(({ g, i }) => `<option value="${i}">${escapeHtml(g.nom)} — ${g.prix != null ? fmtMoney(g.prix) : (g.peine || '')}</option>`).join('')}</optgroup>`
  ).join('');
}
const saiTotal = (items) => items.reduce((s, it) => s + (Number(it.prix) || 0) * (Number(it.qte) || 1), 0);

async function loadSaisies() {
  const root = document.getElementById('saiRoot');
  if (!root) return;
  try { if (!ME.demo) SAISIES = (await api('saisies')).saisies || []; }
  catch (e) { root.innerHTML = `<div class="empty-state"><div class="empty-title">ERREUR</div><div class="empty-sub">${e.message}</div></div>`; return; }
  renderSaisies();
  refreshStats('saisies');
}

function renderSaisies() {
  const root = document.getElementById('saiRoot');
  if (!root) return;

  const cards = SAISIES.map((s) => {
    const photos = s.photos || [];
    const paye = s.etat_amendes === 'PAYÉ';
    return `
    <article class="bl-card" data-id="${s.id}">
      ${photos.length ? `<div class="comm-thumb"><img src="${photos[0]}" alt="">${photos.length > 1 ? `<span class="comm-thumb-more">+${photos.length - 1}</span>` : ''}</div>` : ''}
      <div class="comm-body">
        <div class="feed-head">
          <span class="feed-title">${escapeHtml(s.nom) || '—'} ${escapeHtml(s.prenom) || ''}</span>
          <span class="badge ${paye ? 'badge-green' : 'badge-red'}">${paye ? 'PAYÉ' : 'NON PAYÉ'}</span>
        </div>
        <div class="bl-tags"><span class="sai-total">${fmtMoney(s.total)}</span><span class="bl-duree">${(s.infractions || []).length} infraction(s)</span></div>
        <div class="feed-meta">Le ${escapeHtml(s.date_saisie) || '—'}${s.heure_arrestation ? ' · ' + escapeHtml(s.heure_arrestation) : ''} · par ${escapeHtml(s.par) || '—'}</div>
      </div>
    </article>`;
  }).join('');

  root.innerHTML = `
    <div class="panel-head">
      <div><span class="panel-kicker">Amendes</span><h2 class="panel-title">RAPPORTS DE SAISIE</h2></div>
      <div class="map-tools">
        <span class="panel-count">${SAISIES.length}</span>
        <button class="btn btn-primary btn-sm" id="saiNew"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>NOUVELLE SAISIE</button>
      </div>
    </div>
    ${SAISIES.length ? `<div class="feed">${cards}</div>`
      : '<div class="empty-state"><div class="empty-title">AUCUNE SAISIE</div><div class="empty-sub">Créez un rapport avec le bouton ci-dessus.</div></div>'}`;

  root.querySelectorAll('.bl-card').forEach((c) => c.addEventListener('click', () => openSaisie(+c.dataset.id)));
  root.querySelector('#saiNew').addEventListener('click', () => openSaisieEditor(null));
}

function openSaisie(id) {
  const s = SAISIES.find((x) => x.id === id);
  if (!s) return;
  const canEdit = !!(ME && (s.auteur_matricule === ME.matricule || ME.section === 'comando' || ME.section === 'direction'));
  const photos = s.photos || [];
  const paye = s.etat_amendes === 'PAYÉ';
  openModal(`
    <div class="modal-head">
      <div>
        <div class="modal-kicker">Rapport de saisie · par ${escapeHtml(s.par) || '—'}</div>
        <h2 class="modal-title">${escapeHtml(s.nom) || '—'} ${escapeHtml(s.prenom) || ''}</h2>
      </div>
      <button class="popup-close" id="modalClose">✕</button>
    </div>
    <div class="bl-info">
      <div class="bl-info-item"><span>Date</span><b>${escapeHtml(s.date_saisie) || '—'}</b></div>
      <div class="bl-info-item"><span>Heure d'arrestation</span><b>${escapeHtml(s.heure_arrestation) || '—'}</b></div>
      <div class="bl-info-item"><span>Matricule(s) présent(s)</span><b>${escapeHtml(s.matricules_presents) || '—'}</b></div>
      <div class="bl-info-item"><span>État des amendes</span>${badge(paye ? 'PAYÉ' : 'NON PAYÉ')}</div>
    </div>
    <div class="modal-sub">Infractions</div>
    <div class="sai-list">
      ${(s.infractions || []).map((it) => `<div class="sai-line"><span>${escapeHtml(it.nom)}${it.qte > 1 ? ` (x${it.qte})` : ''}</span><b>${fmtMoney((Number(it.prix) || 0) * (Number(it.qte) || 1))}</b></div>`).join('') || '<div class="presence-empty">Aucune</div>'}
    </div>
    <div class="sai-total-row"><span>TOTAL DES AMENDES</span><strong>${fmtMoney(s.total)}</strong></div>
    ${photos.length ? `<div class="comm-photos">${photos.map((p) => `<a href="${p}" target="_blank" rel="noopener"><img src="${p}" alt=""></a>`).join('')}</div>` : ''}
    ${canEdit ? `<div class="modal-actions">
      <button class="btn btn-ghost btn-sm" id="saiEdit">MODIFIER</button>
      <button class="btn btn-danger btn-sm" id="saiDel2"><svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2M6 7l1 13a1 1 0 001 1h8a1 1 0 001-1l1-13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>SUPPRIMER</button>
    </div>` : ''}
  `);
  document.getElementById('modalClose').addEventListener('click', closeModal);
  if (canEdit) {
    document.getElementById('saiEdit').addEventListener('click', () => openSaisieEditor(s));
    document.getElementById('saiDel2').addEventListener('click', () => { if (confirm('Supprimer ce rapport ?')) saisieDelete(s.id); });
  }
}

function openSaisieEditor(s) {
  SAI_ITEMS = s && s.infractions ? s.infractions.map((it) => ({ ...it })) : [];
  EDITOR_PHOTOS = s && s.photos ? [...s.photos] : [];
  openModal(`
    <div class="modal-head">
      <h2 class="modal-title">${s ? 'MODIFIER LA SAISIE' : 'NOUVELLE SAISIE'}</h2>
      <button class="popup-close" id="modalClose">✕</button>
    </div>
    <div class="ann-form">
      <div class="ann-row">
        <input class="gest-in" id="saiNom" placeholder="Nom" value="${s ? escapeHtml(s.nom || '') : ''}">
        <input class="gest-in" id="saiPrenom" placeholder="Prénom" value="${s ? escapeHtml(s.prenom || '') : ''}">
      </div>
      <div class="ann-row">
        <div class="field-with-bolt"><input class="gest-in" id="saiDate" placeholder="Date" value="${s ? escapeHtml(s.date_saisie || '') : ''}"><button class="bolt-btn" id="saiDateNow" type="button" title="Aujourd'hui"><svg viewBox="0 0 24 24"><path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" fill="currentColor"/></svg></button></div>
        <input class="gest-in" id="saiHeure" placeholder="Heure d'arrestation (ex. 20H00)" value="${s ? escapeHtml(s.heure_arrestation || '') : ''}">
      </div>
      <div class="ann-row">
        <input class="gest-in" id="saiMats" placeholder="Matricule(s) présent(s)" value="${s ? escapeHtml(s.matricules_presents || '') : ''}">
        <select class="gest-in" id="saiEtat" style="max-width:180px">
          <option value="NON PAYÉ"${s && s.etat_amendes === 'NON PAYÉ' ? ' selected' : ''}>Non payé</option>
          <option value="PAYÉ"${s && s.etat_amendes === 'PAYÉ' ? ' selected' : ''}>Payé</option>
        </select>
      </div>
      <div class="modal-sub">Infractions (grille tarifaire)</div>
      <div class="sai-add-row">
        <select class="gest-in" id="saiPick">${grilleOptions()}</select>
        <button class="btn btn-ghost btn-sm" id="saiAddItem">+ AJOUTER</button>
      </div>
      <div class="sai-items" id="saiItems"></div>
      <div class="sai-total-row"><span>TOTAL</span><strong id="saiTotalDisp">$0</strong></div>
      <div class="ann-photos-bar">
        <label class="btn btn-ghost btn-sm"><svg viewBox="0 0 24 24"><path d="M4 5h16v14H4z" stroke="currentColor" stroke-width="2"/><path d="M4 16l5-5 4 4 3-3 4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="9" cy="9" r="1.5" fill="currentColor"/></svg>AJOUTER UNE PHOTO<input type="file" id="saiPhotoInput" accept="image/*" multiple hidden></label>
        <span class="ann-photos-hint">Max ${MAX_PHOTOS} · compressées</span>
      </div>
      <div class="ann-thumbs" id="saiThumbs"></div>
      <button class="btn btn-primary btn-sm" id="saiSave">${s ? 'ENREGISTRER' : 'CRÉER LE RAPPORT'}</button>
    </div>
  `, 'modal-lg');
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('saiDateNow').addEventListener('click', () => { document.getElementById('saiDate').value = todayFR(); });
  renderSaiItems();
  renderEditorThumbs('saiThumbs');

  document.getElementById('saiAddItem').addEventListener('click', () => {
    const g = GRILLE[+document.getElementById('saiPick').value];
    if (!g) return;
    SAI_ITEMS.push({ nom: g.nom, prix: g.prix || 0, qte: 1 });
    renderSaiItems();
  });
  document.getElementById('saiPhotoInput').addEventListener('change', async (e) => {
    for (const f of [...e.target.files]) { if (EDITOR_PHOTOS.length >= MAX_PHOTOS) { alert(`Maximum ${MAX_PHOTOS} photos.`); break; } try { EDITOR_PHOTOS.push(await compressImage(f)); } catch (err) {} }
    e.target.value = '';
    renderEditorThumbs('saiThumbs');
  });
  document.getElementById('saiSave').addEventListener('click', () => {
    saisieSave(s ? s.id : null, {
      nom: document.getElementById('saiNom').value.trim(),
      prenom: document.getElementById('saiPrenom').value.trim(),
      date_saisie: document.getElementById('saiDate').value.trim(),
      heure_arrestation: document.getElementById('saiHeure').value.trim(),
      matricules_presents: document.getElementById('saiMats').value.trim(),
      etat_amendes: document.getElementById('saiEtat').value,
      infractions: SAI_ITEMS,
      total: saiTotal(SAI_ITEMS),
      photos: EDITOR_PHOTOS,
    });
  });
}

function renderSaiItems() {
  const box = document.getElementById('saiItems');
  if (!box) return;
  box.innerHTML = SAI_ITEMS.map((it, i) => `
    <div class="sai-item">
      <span class="sai-item-nom">${escapeHtml(it.nom)}</span>
      <input class="gest-in sai-qte" type="number" min="1" value="${it.qte || 1}" data-i="${i}" title="Quantité">
      <span class="sai-item-prix">${fmtMoney((Number(it.prix) || 0) * (Number(it.qte) || 1))}</span>
      <button class="ann-thumb-del sai-item-del" data-i="${i}" title="Retirer">✕</button>
    </div>`).join('') || '<div class="presence-empty" style="padding:6px 0">Aucune infraction ajoutée.</div>';
  const disp = document.getElementById('saiTotalDisp');
  if (disp) disp.textContent = fmtMoney(saiTotal(SAI_ITEMS));
  box.querySelectorAll('.sai-qte').forEach((inp) => inp.addEventListener('input', () => {
    const i = +inp.dataset.i;
    SAI_ITEMS[i].qte = Math.max(1, +inp.value || 1);
    inp.closest('.sai-item').querySelector('.sai-item-prix').textContent = fmtMoney((Number(SAI_ITEMS[i].prix) || 0) * SAI_ITEMS[i].qte);
    document.getElementById('saiTotalDisp').textContent = fmtMoney(saiTotal(SAI_ITEMS));
  }));
  box.querySelectorAll('.sai-item-del').forEach((b) => b.addEventListener('click', () => { SAI_ITEMS.splice(+b.dataset.i, 1); renderSaiItems(); }));
}

async function reloadSaisies() { try { SAISIES = (await api('saisies')).saisies || []; } catch (e) {} }

async function saisieSave(id, p) {
  if (!p.nom) { alert('Le nom est obligatoire.'); return; }
  if (ME.demo) {
    if (id) { const s = SAISIES.find((x) => x.id === id); if (s) Object.assign(s, p); }
    else SAISIES.unshift({ id: Date.now(), par: ME.nom, auteur_matricule: ME.matricule, ...p });
  } else {
    try { await api(id ? 'saisie_update' : 'saisie_add', id ? { id, ...p } : p); } catch (e) { alert(e.message); return; }
    await reloadSaisies();
  }
  closeModal(); renderSaisies(); refreshStats('saisies');
}

async function saisieDelete(id) {
  if (ME.demo) { SAISIES = SAISIES.filter((x) => x.id !== id); }
  else { try { await api('saisie_delete', { id }); } catch (e) { alert(e.message); return; } await reloadSaisies(); }
  closeModal(); renderSaisies(); refreshStats('saisies');
}

