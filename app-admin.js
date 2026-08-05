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

// ── Page Blacklist ──
async function loadBlacklist() {
  const root = document.getElementById('blRoot');
  if (!root) return;
  try {
    if (!ME.demo) BLACKLIST = (await api('blacklist')).blacklist || [];
  } catch (e) {
    root.innerHTML = `<div class="empty-state"><div class="empty-title">ERREUR</div><div class="empty-sub">${e.message}</div></div>`;
    return;
  }
  renderBlacklist();
  refreshStats('blacklist');
}

function blCardHtml(b) {
  const photos = b.photos || [];
  const snippet = escapeHtml((b.motif || '').slice(0, 100)) + ((b.motif || '').length > 100 ? '…' : '');
  const actif = b.actif !== false;
  return `
    <article class="bl-card" data-id="${b.id}">
      ${photos.length ? `<div class="comm-thumb"><img src="${photos[0]}" alt="">${photos.length > 1 ? `<span class="comm-thumb-more">+${photos.length - 1}</span>` : ''}</div>` : ''}
      <div class="comm-body">
        <div class="feed-head">
          <span class="feed-title">${escapeHtml(b.nom) || '—'}</span>
          <span class="badge ${actif ? 'badge-red' : 'badge-gray'}">${actif ? 'ACTIF' : 'LEVÉ'}</span>
        </div>
        <div class="bl-tags"><span class="bl-duree">${escapeHtml(b.duree) || '—'}</span></div>
        <p class="feed-text">${snippet || '—'}</p>
        <div class="feed-meta">Le ${escapeHtml(b.date_bl) || '—'} &nbsp;·&nbsp; par ${escapeHtml(b.auteur_nom) || '—'}</div>
      </div>
    </article>`;
}

function renderBlFeed(list) {
  const feed = document.getElementById('blFeed');
  if (!feed) return;
  feed.innerHTML = list.length
    ? `<div class="feed">${list.map(blCardHtml).join('')}</div>`
    : '<div class="empty-state"><div class="empty-title">AUCUN RÉSULTAT</div><div class="empty-sub">Aucune blacklist ne correspond.</div></div>';
  feed.querySelectorAll('.bl-card').forEach((c) => c.addEventListener('click', () => openBL(+c.dataset.id)));
}

function renderBlacklist() {
  const root = document.getElementById('blRoot');
  if (!root) return;
  const canManage = !!(ME && (ME.section === 'comando' || ME.section === 'direction'));

  root.innerHTML = `
    <div class="panel-head">
      <div><span class="panel-kicker">Sécurité</span><h2 class="panel-title">PERSONNES BLACKLISTÉES</h2></div>
      <span class="panel-count">${BLACKLIST.length}</span>
    </div>
    <div class="filter-row">
      <div class="search-field">
        <input type="text" id="blSearch" placeholder="Rechercher un nom, un motif…" autocomplete="off">
        <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"/><path d="M21 21l-4.35-4.35" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      </div>
      ${canManage ? `<button class="btn btn-primary" id="blNew"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>NOUVELLE BLACKLIST</button>` : ''}
    </div>
    <div id="blFeed"></div>`;

  renderBlFeed(BLACKLIST);

  const search = root.querySelector('#blSearch');
  search.addEventListener('input', () => {
    const q = search.value.trim().toLowerCase();
    const list = BLACKLIST.filter((b) => !q || [b.nom, b.motif, b.duree, b.auteur_nom].some((v) => String(v || '').toLowerCase().includes(q)));
    renderBlFeed(list);
  });
  if (canManage) root.querySelector('#blNew')?.addEventListener('click', () => openBLEditor(null));
}

function openBL(id) {
  const b = BLACKLIST.find((x) => x.id === id);
  if (!b) return;
  const canManage = !!(ME && (ME.section === 'comando' || ME.section === 'direction'));
  const photos = b.photos || [];
  openModal(`
    <div class="modal-head">
      <div>
        <div class="modal-kicker">Blacklist · par ${escapeHtml(b.auteur_nom) || '—'}</div>
        <h2 class="modal-title">${escapeHtml(b.nom) || '—'}</h2>
      </div>
      <button class="popup-close" id="modalClose">✕</button>
    </div>
    <div class="bl-info">
      <div class="bl-info-item"><span>Date</span><b>${escapeHtml(b.date_bl) || '—'}</b></div>
      <div class="bl-info-item"><span>Durée</span><b>${escapeHtml(b.duree) || '—'}</b></div>
      <div class="bl-info-item"><span>Statut</span>${badge(b.actif !== false ? 'ACTIF' : 'LEVÉ')}</div>
    </div>
    <div class="modal-sub">Motif du BL</div>
    <div class="modal-content">${escapeHtml(b.motif || '').replace(/\n/g, '<br>')}</div>
    ${photos.length ? `<div class="comm-photos">${photos.map((p) => `<a href="${p}" target="_blank" rel="noopener"><img src="${p}" alt=""></a>`).join('')}</div>` : ''}
    ${canManage ? `<div class="modal-actions">
      <button class="btn btn-ghost btn-sm" id="blEdit">MODIFIER</button>
      <button class="btn btn-danger btn-sm" id="blDel"><svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2M6 7l1 13a1 1 0 001 1h8a1 1 0 001-1l1-13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>SUPPRIMER</button>
    </div>` : ''}
  `);
  document.getElementById('modalClose').addEventListener('click', closeModal);
  if (canManage) {
    document.getElementById('blEdit').addEventListener('click', () => openBLEditor(b));
    document.getElementById('blDel').addEventListener('click', () => { if (confirm('Supprimer cette blacklist ?')) blDelete(b.id); });
  }
}

function openBLEditor(b) {
  EDITOR_PHOTOS = b && b.photos ? [...b.photos] : [];
  openModal(`
    <div class="modal-head">
      <h2 class="modal-title">${b ? 'MODIFIER LA BLACKLIST' : 'NOUVELLE BLACKLIST'}</h2>
      <button class="popup-close" id="modalClose">✕</button>
    </div>
    <div class="ann-form">
      <input class="gest-in" id="blNom" placeholder="Nom & Prénom" value="${b ? escapeHtml(b.nom || '') : ''}">
      <div class="ann-row">
        <div class="field-with-bolt">
          <input class="gest-in" id="blDate" placeholder="Date" value="${b ? escapeHtml(b.date_bl || '') : ''}">
          <button class="bolt-btn" id="blDateNow" type="button" title="Aujourd'hui"><svg viewBox="0 0 24 24"><path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" fill="currentColor"/></svg></button>
        </div>
        <input class="gest-in" id="blDuree" placeholder="Durée (ex. 2 MOIS, Définitif)" value="${b ? escapeHtml(b.duree || '') : ''}">
      </div>
      <label class="bl-actif-row">
        <span>Blacklist active</span>
        <label class="switch"><input type="checkbox" id="blActif" ${b ? (b.actif !== false ? 'checked' : '') : 'checked'}><span class="switch-slider"></span></label>
      </label>
      <textarea class="gest-in ann-area" id="blMotif" placeholder="Motif du BL…">${b ? escapeHtml(b.motif || '') : ''}</textarea>
      <div class="ann-photos-bar">
        <label class="btn btn-ghost btn-sm">
          <svg viewBox="0 0 24 24"><path d="M4 5h16v14H4z" stroke="currentColor" stroke-width="2"/><path d="M4 16l5-5 4 4 3-3 4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="9" cy="9" r="1.5" fill="currentColor"/></svg>
          AJOUTER DES PHOTOS
          <input type="file" id="blPhotoInput" accept="image/*" multiple hidden>
        </label>
        <span class="ann-photos-hint">Max ${MAX_PHOTOS} · compressées automatiquement</span>
      </div>
      <div class="ann-thumbs" id="blThumbs"></div>
      <button class="btn btn-primary btn-sm" id="blSave">${b ? 'ENREGISTRER LES MODIFICATIONS' : 'AJOUTER À LA BLACKLIST'}</button>
    </div>
  `);
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('blDateNow').addEventListener('click', () => { document.getElementById('blDate').value = todayFR(); });
  renderEditorThumbs('blThumbs');
  document.getElementById('blPhotoInput').addEventListener('change', async (e) => {
    for (const f of [...e.target.files]) {
      if (EDITOR_PHOTOS.length >= MAX_PHOTOS) { alert(`Maximum ${MAX_PHOTOS} photos.`); break; }
      try { EDITOR_PHOTOS.push(await compressImage(f)); } catch (err) { /* ignore */ }
    }
    e.target.value = '';
    renderEditorThumbs('blThumbs');
  });
  document.getElementById('blSave').addEventListener('click', () => {
    blSave(b ? b.id : null, {
      nom: document.getElementById('blNom').value.trim(),
      date_bl: document.getElementById('blDate').value.trim(),
      duree: document.getElementById('blDuree').value.trim(),
      motif: document.getElementById('blMotif').value.trim(),
      actif: document.getElementById('blActif').checked,
      photos: EDITOR_PHOTOS,
    });
  });
}

async function reloadBlacklist() {
  try { BLACKLIST = (await api('blacklist')).blacklist || []; } catch (e) {}
}

async function blSave(id, p) {
  if (!p.nom || !p.motif) { alert('Nom et motif obligatoires.'); return; }
  if (ME.demo) {
    if (id) { const b = BLACKLIST.find((x) => x.id === id); if (b) Object.assign(b, p); }
    else BLACKLIST.unshift({ id: Date.now(), auteur_matricule: ME.matricule, auteur_nom: ME.nom, ...p });
  } else {
    try { await api(id ? 'bl_update' : 'bl_add', id ? { id, ...p } : p); } catch (e) { alert(e.message); return; }
    await reloadBlacklist();
  }
  closeModal();
  renderBlacklist();
  refreshStats('blacklist');
}

async function blDelete(id) {
  if (ME.demo) {
    BLACKLIST = BLACKLIST.filter((x) => x.id !== id);
  } else {
    try { await api('bl_delete', { id }); } catch (e) { alert(e.message); return; }
    await reloadBlacklist();
  }
  closeModal();
  renderBlacklist();
  refreshStats('blacklist');
}

// ── Modale générique ──
function closeModal() { document.getElementById('modalOverlay')?.remove(); }
function openModal(html, cls = '') {
  closeModal();
  const ov = document.createElement('div');
  ov.className = 'modal-overlay';
  ov.id = 'modalOverlay';
  ov.innerHTML = `<div class="modal-card ${cls}">${html}</div>`;
  ov.addEventListener('click', (e) => { if (e.target === ov) closeModal(); });
  document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape') { closeModal(); document.removeEventListener('keydown', esc); } });
  document.body.appendChild(ov);
  return ov;
}

// ── Compression d'image (côté navigateur) ──
function compressImage(file, maxDim = 1280, quality = 0.72) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let { width, height } = img;
        if (width >= height && width > maxDim) { height = Math.round(height * maxDim / width); width = maxDim; }
        else if (height > maxDim) { width = Math.round(width * maxDim / height); height = maxDim; }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

