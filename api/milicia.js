// ════════════════════════════════════════════════════════════════
//  MILICIA — API serverless (Vercel) connectée à Supabase
//  Route : /api/milicia?action=...   (appelée par app.js)
//
//  Variables d'environnement à définir sur Vercel :
//    SUPABASE_URL                 (Project URL)
//    SUPABASE_SERVICE_ROLE_KEY    (clé "service_role" — SECRÈTE)
//    SUPABASE_ANON_KEY            (clé "anon" — publique)
//    SESSION_SECRET               (une longue chaîne aléatoire)
// ════════════════════════════════════════════════════════════════
import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

const SECRET = process.env.SESSION_SECRET || 'CHANGE-ME';
const TOKEN_TTL = 12 * 60 * 60 * 1000; // 12 h

// Client Supabase créé à la demande (pour renvoyer une erreur claire
// si une variable manque, au lieu de planter au chargement).
let _client = null;
function sb() {
  if (_client) return _client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) throw new Error('Variable SUPABASE_URL absente sur Vercel');
  if (!key) throw new Error('Variable SUPABASE_SERVICE_ROLE_KEY absente sur Vercel');
  _client = createClient(url, key, { auth: { persistSession: false } });
  return _client;
}

// ── Jeton signé (sans dépendance externe) ──
function sign(payload) {
  const b = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const s = crypto.createHmac('sha256', SECRET).update(b).digest('base64url');
  return `${b}.${s}`;
}
function verify(token) {
  if (!token || !token.includes('.')) return null;
  const [b, s] = token.split('.');
  const s2 = crypto.createHmac('sha256', SECRET).update(b).digest('base64url');
  if (s !== s2) return null;
  try {
    const p = JSON.parse(Buffer.from(b, 'base64url').toString());
    if (p.exp && Date.now() > p.exp) return null;
    return p;
  } catch { return null; }
}

async function permsOf(matricule) {
  const { data } = await sb().from('v_comptes_perms').select('*').eq('matricule', matricule).maybeSingle();
  return data || null;
}

export default async function handler(req, res) {
  const action = req.query.action || '';
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const fail = (msg, code = 400) => res.status(code).json({ error: msg });

  try {
    // ── Diagnostic : quelles variables sont présentes ? (aucune valeur révélée) ──
    if (action === 'health') {
      return res.status(200).json({
        ok: true,
        env: {
          SUPABASE_URL: !!process.env.SUPABASE_URL,
          SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
          SUPABASE_ANON_KEY: !!process.env.SUPABASE_ANON_KEY,
          SESSION_SECRET: !!process.env.SESSION_SECRET,
        },
      });
    }

    const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    const auth = verify(token);
    const me = auth ? await permsOf(auth.matricule) : null;

    switch (action) {

      case 'login': {
        const mat = String(body.matricule || '').trim();
        const mdp = String(body.mot_de_passe || '');
        const { data } = await sb().from('comptes')
          .select('matricule').eq('matricule', mat).eq('mot_de_passe', mdp).eq('actif', true).maybeSingle();
        if (!data) return fail('Matricule ou mot de passe incorrect', 401);
        const user = await permsOf(mat);
        const tok = sign({ matricule: mat, exp: Date.now() + TOKEN_TTL });
        return res.status(200).json({ token: tok, user });
      }

      case 'me':
        return res.status(200).json(me || { guest: true });

      case 'realtime_config':
        if (!me) return fail('Non authentifié', 401);
        return res.status(200).json({
          url: process.env.SUPABASE_URL || '',
          anonKey: process.env.SUPABASE_ANON_KEY || '',
        });

      case 'effectifs': {
        if (!me) return fail('Non authentifié', 401);
        const { data, error } = await sb().from('v_effectifs').select('*');
        if (error) throw error;
        return res.status(200).json(data);
      }

      case 'grades': {
        if (!me) return fail('Non authentifié', 401);
        const { data, error } = await sb().from('grades')
          .select('id,nom,section,niveau').order('niveau', { ascending: false });
        if (error) throw error;
        return res.status(200).json({ grades: data });
      }

      case 'formations': {
        if (!me) return fail('Non authentifié', 401);
        const { data: forms } = await sb().from('formations').select('id,nom,categorie,ordre').order('ordre');
        const { data: links } = await sb().from('compte_formations').select('compte_matricule, formations(nom)');
        const certifs = {};
        (links || []).forEach((l) => {
          const nom = l.formations?.nom;
          if (!nom) return;
          (certifs[l.compte_matricule] ||= []).push(nom);
        });
        return res.status(200).json({ formations: forms || [], certifs });
      }

      case 'accounts': {
        if (!me) return fail('Non authentifié', 401);
        if (!me.peut_modifier_comptes && !me.peut_voir_mdp && !me.peut_ajouter_effectif) return fail('Accès refusé', 403);
        const { data, error } = await sb().from('v_comptes_admin').select('*');
        if (error) throw error;
        const rows = data.map((r) => {
          if (!me.peut_voir_mdp) { const { mot_de_passe, ...rest } = r; return rest; }
          return r;
        });
        return res.status(200).json({ accounts: rows, peut_voir_mdp: me.peut_voir_mdp });
      }

      case 'account_add': {
        if (!me) return fail('Non authentifié', 401);
        if (!me.peut_ajouter_effectif) return fail("Vous n'avez pas le droit d'ajouter un membre", 403);
        const mat = String(body.matricule || '').trim();
        const nom = String(body.nom || '').trim();
        const grade_id = Number(body.grade_id || 0);
        const statut = body.statut === 'EN TEST' ? 'EN TEST' : 'TITULAIRE';
        let mdp = String(body.mot_de_passe || '');
        if (!mat || !nom || !grade_id) return fail('Champs manquants');
        if (!mdp) mdp = 'MILICIA-' + mat;
        const { error } = await sb().from('comptes')
          .insert({ matricule: mat, nom, mot_de_passe: mdp, grade_id, statut });
        if (error) return fail(error.code === '23505' ? 'Matricule déjà utilisé' : error.message);
        await sb().from('journal_comptes').insert({ cible_matricule: mat, auteur_matricule: me.matricule, action: 'CREATION', details: 'Création de ' + nom });
        return res.status(200).json({ ok: true });
      }

      case 'account_update': {
        if (!me) return fail('Non authentifié', 401);
        if (!me.peut_modifier_comptes) return fail("Vous n'avez pas le droit de modifier un compte", 403);
        const mat = String(body.matricule || '').trim();
        const nom = String(body.nom || '').trim();
        const grade_id = Number(body.grade_id || 0);
        const statut = body.statut === 'EN TEST' ? 'EN TEST' : 'TITULAIRE';
        if (!mat || !nom || !grade_id) return fail('Champs manquants');
        const patch = { nom, grade_id, statut };
        if (body.mot_de_passe) patch.mot_de_passe = String(body.mot_de_passe);
        if (typeof body.formateur !== 'undefined') patch.formateur = !!body.formateur;
        if (typeof body.recruteur !== 'undefined') patch.recruteur = !!body.recruteur;
        const { error } = await sb().from('comptes').update(patch).eq('matricule', mat);
        if (error) return fail(error.message);
        await sb().from('journal_comptes').insert({ cible_matricule: mat, auteur_matricule: me.matricule, action: 'MODIFICATION', details: 'Modification de ' + nom });
        return res.status(200).json({ ok: true });
      }

      case 'account_delete': {
        if (!me) return fail('Non authentifié', 401);
        if (!me.peut_modifier_comptes) return fail('Accès refusé', 403);
        const mat = String(body.matricule || '').trim();
        if (!mat) return fail('Matricule manquant');
        if (mat === me.matricule) return fail('Vous ne pouvez pas supprimer votre propre compte');
        const { error } = await sb().from('comptes').delete().eq('matricule', mat);
        if (error) return fail(error.message);
        await sb().from('journal_comptes').insert({ cible_matricule: mat, auteur_matricule: me.matricule, action: 'SUPPRESSION' });
        return res.status(200).json({ ok: true });
      }

      // ── Recruteur : contrats de travail + création de recrues ──
      case 'contrats': {
        if (!me) return fail('Non authentifié', 401);
        if (!me.recruteur && !me.peut_ajouter_effectif && !me.peut_modifier_comptes) return fail('Accès refusé', 403);
        const { data, error } = await sb().from('contrats').select('*').order('id', { ascending: false });
        if (error) throw error;
        return res.status(200).json({ contrats: data });
      }

      case 'recruit_add': {
        if (!me) return fail('Non authentifié', 401);
        if (!me.recruteur && !me.peut_ajouter_effectif) return fail('Réservé aux recruteurs', 403);
        const mat = String(body.matricule || '').trim();
        const nom = String(body.nom || '').trim();
        const mdp = String(body.mot_de_passe || '');
        if (!mat || !nom || !mdp) return fail('Matricule, nom et mot de passe obligatoires');
        // Grade le plus bas (niveau minimum)
        const { data: low } = await sb().from('grades').select('id').order('niveau', { ascending: true }).limit(1).maybeSingle();
        if (!low) return fail('Aucun grade disponible');
        const { error: e1 } = await sb().from('comptes')
          .insert({ matricule: mat, nom, mot_de_passe: mdp, grade_id: low.id, statut: 'EN TEST' });
        if (e1) return fail(e1.code === '23505' ? 'Matricule déjà utilisé' : e1.message);
        const { error: e2 } = await sb().from('contrats').insert({
          matricule: mat, nom,
          telephone: String(body.telephone || '').trim() || null,
          rib: String(body.rib || '').trim() || null,
          assermentation: String(body.assermentation || '').trim() || null,
          photo: body.photo || null,
          cree_par: me.nom, auteur_matricule: me.matricule,
        });
        if (e2) return fail(e2.message);
        await sb().from('journal_comptes').insert({ cible_matricule: mat, auteur_matricule: me.matricule, action: 'CREATION', details: 'Recrutement de ' + nom });
        return res.status(200).json({ ok: true });
      }

      case 'contrat_delete': {
        if (!me) return fail('Non authentifié', 401);
        const id = Number(body.id || 0);
        if (!id) return fail('id manquant');
        const { data: c } = await sb().from('contrats').select('auteur_matricule').eq('id', id).maybeSingle();
        if (c && c.auteur_matricule !== me.matricule && me.section !== 'comando' && me.section !== 'direction' && !me.peut_modifier_comptes) return fail('Suppression non autorisée', 403);
        const { error } = await sb().from('contrats').delete().eq('id', id);
        if (error) return fail(error.message);
        return res.status(200).json({ ok: true });
      }

      // ── TIG ──
      case 'tig': {
        if (!me) return fail('Non authentifié', 401);
        const { data, error } = await sb().from('tig').select('*').order('id', { ascending: false });
        if (error) throw error;
        return res.status(200).json({ tig: data });
      }
      case 'tig_add': {
        if (!me) return fail('Non authentifié', 401);
        const row = {
          nom: String(body.nom || '').trim() || null,
          heures: String(body.heures || '').trim() || null,
          motif: String(body.motif || '').trim() || null,
          amende: Number(body.amende) || 0,
          date_tig: String(body.date_tig || '').trim() || null,
          statut: 'EN COURS',
          par: me.nom,
          auteur_matricule: me.matricule,
        };
        if (!row.nom) return fail('Le nom est obligatoire.');
        const { error } = await sb().from('tig').insert(row);
        if (error) return fail(error.message);
        return res.status(200).json({ ok: true });
      }
      case 'tig_finish': {
        if (!me) return fail('Non authentifié', 401);
        const id = Number(body.id || 0);
        if (!id) return fail('id manquant');
        const { error } = await sb().from('tig').update({ statut: 'TERMINÉ' }).eq('id', id);
        if (error) return fail(error.message);
        return res.status(200).json({ ok: true });
      }
      case 'tig_delete': {
        if (!me) return fail('Non authentifié', 401);
        const id = Number(body.id || 0);
        if (!id) return fail('id manquant');
        const { data: t } = await sb().from('tig').select('auteur_matricule').eq('id', id).maybeSingle();
        if (t && t.auteur_matricule !== me.matricule && me.section !== 'comando' && me.section !== 'direction') return fail('Suppression non autorisée', 403);
        const { error } = await sb().from('tig').delete().eq('id', id);
        if (error) return fail(error.message);
        return res.status(200).json({ ok: true });
      }

      // ── Saisies ──
      case 'saisies': {
        if (!me) return fail('Non authentifié', 401);
        const { data, error } = await sb().from('saisies').select('*').order('id', { ascending: false });
        if (error) throw error;
        return res.status(200).json({ saisies: data });
      }
      case 'saisie_add': {
        if (!me) return fail('Non authentifié', 401);
        const infractions = Array.isArray(body.infractions) ? body.infractions : [];
        const total = infractions.reduce((s, it) => s + (Number(it.prix) || 0) * (Number(it.qte) || 1), 0);
        const row = {
          nom: String(body.nom || '').trim() || null,
          prenom: String(body.prenom || '').trim() || null,
          date_saisie: String(body.date_saisie || '').trim() || null,
          heure_arrestation: String(body.heure_arrestation || '').trim() || null,
          matricules_presents: String(body.matricules_presents || '').trim() || null,
          etat_amendes: body.etat_amendes === 'PAYÉ' ? 'PAYÉ' : 'NON PAYÉ',
          infractions,
          total,
          photos: Array.isArray(body.photos) ? body.photos.slice(0, 4) : [],
          par: me.nom,
          auteur_matricule: me.matricule,
        };
        if (!row.nom) return fail('Nom obligatoire');
        const { error } = await sb().from('saisies').insert(row);
        if (error) return fail(error.message);
        return res.status(200).json({ ok: true });
      }

      case 'saisie_update': {
        if (!me) return fail('Non authentifié', 401);
        const id = Number(body.id || 0);
        if (!id) return fail('id manquant');
        const { data: cur } = await sb().from('saisies').select('auteur_matricule').eq('id', id).maybeSingle();
        if (cur && cur.auteur_matricule !== me.matricule && me.section !== 'comando' && me.section !== 'direction') return fail('Modification non autorisée', 403);
        const infractions = Array.isArray(body.infractions) ? body.infractions : [];
        const total = infractions.reduce((s, it) => s + (Number(it.prix) || 0) * (Number(it.qte) || 1), 0);
        const patch = {
          nom: String(body.nom || '').trim() || null,
          prenom: String(body.prenom || '').trim() || null,
          date_saisie: String(body.date_saisie || '').trim() || null,
          heure_arrestation: String(body.heure_arrestation || '').trim() || null,
          matricules_presents: String(body.matricules_presents || '').trim() || null,
          etat_amendes: body.etat_amendes === 'PAYÉ' ? 'PAYÉ' : 'NON PAYÉ',
          infractions,
          total,
          photos: Array.isArray(body.photos) ? body.photos.slice(0, 4) : [],
        };
        if (!patch.nom) return fail('Nom obligatoire');
        const { error } = await sb().from('saisies').update(patch).eq('id', id);
        if (error) return fail(error.message);
        return res.status(200).json({ ok: true });
      }
      case 'saisie_delete': {
        if (!me) return fail('Non authentifié', 401);
        const id = Number(body.id || 0);
        if (!id) return fail('id manquant');
        const { data: s } = await sb().from('saisies').select('auteur_matricule').eq('id', id).maybeSingle();
        if (s && s.auteur_matricule !== me.matricule && me.section !== 'comando' && me.section !== 'direction') return fail('Suppression non autorisée', 403);
        const { error } = await sb().from('saisies').delete().eq('id', id);
        if (error) return fail(error.message);
        return res.status(200).json({ ok: true });
      }

      // ── Blacklist (création réservée Commandement / Direction) ──
      case 'blacklist': {
        if (!me) return fail('Non authentifié', 401);
        const { data, error } = await sb().from('blacklist').select('*').order('id', { ascending: false });
        if (error) throw error;
        return res.status(200).json({ blacklist: data });
      }

      case 'bl_add': {
        if (!me) return fail('Non authentifié', 401);
        if (me.section !== 'comando' && me.section !== 'direction') return fail('Réservé au Commandement / Direction', 403);
        const photos = Array.isArray(body.photos) ? body.photos.slice(0, 4) : [];
        const row = {
          nom: String(body.nom || '').trim() || null,
          date_bl: String(body.date_bl || '').trim() || null,
          duree: String(body.duree || '').trim() || null,
          motif: String(body.motif || '').trim() || null,
          actif: body.actif !== false,
          photos,
          auteur_matricule: me.matricule,
          auteur_nom: me.nom,
        };
        if (!row.nom || !row.motif) return fail('Nom et motif obligatoires');
        const { error } = await sb().from('blacklist').insert(row);
        if (error) return fail(error.message);
        return res.status(200).json({ ok: true });
      }

      case 'bl_update': {
        if (!me) return fail('Non authentifié', 401);
        if (me.section !== 'comando' && me.section !== 'direction') return fail('Réservé au Commandement / Direction', 403);
        const id = Number(body.id || 0);
        if (!id) return fail('id manquant');
        const patch = {
          nom: String(body.nom || '').trim() || null,
          date_bl: String(body.date_bl || '').trim() || null,
          duree: String(body.duree || '').trim() || null,
          motif: String(body.motif || '').trim() || null,
          actif: body.actif !== false,
          photos: Array.isArray(body.photos) ? body.photos.slice(0, 4) : [],
        };
        if (!patch.nom || !patch.motif) return fail('Nom et motif obligatoires');
        const { error } = await sb().from('blacklist').update(patch).eq('id', id);
        if (error) return fail(error.message);
        return res.status(200).json({ ok: true });
      }

      case 'bl_delete': {
        if (!me) return fail('Non authentifié', 401);
        if (me.section !== 'comando' && me.section !== 'direction') return fail('Réservé au Commandement / Direction', 403);
        const id = Number(body.id || 0);
        if (!id) return fail('id manquant');
        const { error } = await sb().from('blacklist').delete().eq('id', id);
        if (error) return fail(error.message);
        return res.status(200).json({ ok: true });
      }

      // ── Communications / Annonces (création réservée Commandement / Direction) ──
      case 'annonces': {
        if (!me) return fail('Non authentifié', 401);
        const { data, error } = await sb().from('annonces').select('*').order('id', { ascending: false });
        if (error) throw error;
        return res.status(200).json({ annonces: data });
      }

      case 'annonce_add': {
        if (!me) return fail('Non authentifié', 401);
        if (me.section !== 'comando' && me.section !== 'direction') return fail('Seuls le Commandement et la Direction peuvent publier une annonce', 403);
        const PRIOS = ['NORMALE', 'IMPORTANTE', 'URGENTE'];
        const photos = Array.isArray(body.photos) ? body.photos.slice(0, 4) : [];
        const row = {
          titre: String(body.titre || '').trim() || null,
          contenu: String(body.contenu || '').trim() || null,
          priorite: PRIOS.includes(body.priorite) ? body.priorite : 'NORMALE',
          canal: String(body.canal || '').trim() || null,
          date_annonce: String(body.date_annonce || '').trim() || null,
          photos,
          auteur_matricule: me.matricule,
          auteur_nom: me.nom,
        };
        if (!row.titre || !row.contenu) return fail('Titre et contenu obligatoires');
        const { error } = await sb().from('annonces').insert(row);
        if (error) return fail(error.message);
        return res.status(200).json({ ok: true });
      }

      case 'annonce_update': {
        if (!me) return fail('Non authentifié', 401);
        if (me.section !== 'comando' && me.section !== 'direction') return fail('Modification réservée au Commandement / Direction', 403);
        const id = Number(body.id || 0);
        if (!id) return fail('id manquant');
        const PRIOS = ['NORMALE', 'IMPORTANTE', 'URGENTE'];
        const patch = {
          titre: String(body.titre || '').trim() || null,
          contenu: String(body.contenu || '').trim() || null,
          priorite: PRIOS.includes(body.priorite) ? body.priorite : 'NORMALE',
          canal: String(body.canal || '').trim() || null,
          date_annonce: String(body.date_annonce || '').trim() || null,
          photos: Array.isArray(body.photos) ? body.photos.slice(0, 4) : [],
        };
        if (!patch.titre || !patch.contenu) return fail('Titre et contenu obligatoires');
        const { error } = await sb().from('annonces').update(patch).eq('id', id);
        if (error) return fail(error.message);
        return res.status(200).json({ ok: true });
      }

      case 'annonce_delete': {
        if (!me) return fail('Non authentifié', 401);
        if (me.section !== 'comando' && me.section !== 'direction') return fail('Suppression réservée au Commandement / Direction', 403);
        const id = Number(body.id || 0);
        if (!id) return fail('id manquant');
        const { error } = await sb().from('annonces').delete().eq('id', id);
        if (error) return fail(error.message);
        return res.status(200).json({ ok: true });
      }

      // ── Documentation (lecture selon l'accès, écriture réservée Commandement / Direction) ──
      case 'documents': {
        if (!me) return fail('Non authentifié', 401);
        const { data, error } = await sb().from('documents').select('*').order('id', { ascending: false });
        if (error) throw error;
        const major = me.section === 'comando' || me.section === 'direction';
        const grade = major || me.section === 'liderazgo';
        const visible = (data || []).filter((d) => d.acces === 'TOUS' || (d.acces === 'GRADÉS' && grade) || (d.acces === 'ÉTAT-MAJOR' && major));
        return res.status(200).json({ documents: visible, canManage: major });
      }

      case 'document_add': {
        if (!me) return fail('Non authentifié', 401);
        if (me.section !== 'comando' && me.section !== 'direction') return fail('Réservé au Commandement / Direction', 403);
        const ACCES = ['TOUS', 'GRADÉS', 'ÉTAT-MAJOR'];
        const row = {
          titre: String(body.titre || '').trim() || null,
          categorie: String(body.categorie || '').trim() || null,
          acces: ACCES.includes(body.acces) ? body.acces : 'TOUS',
          contenu: String(body.contenu || '').trim() || null,
          lien: String(body.lien || '').trim() || null,
          photos: Array.isArray(body.photos) ? body.photos.slice(0, 4) : [],
          date_doc: String(body.date_doc || '').trim() || null,
          auteur_matricule: me.matricule,
          auteur_nom: me.nom,
        };
        if (!row.titre) return fail('Le titre est obligatoire');
        const { error } = await sb().from('documents').insert(row);
        if (error) return fail(error.message);
        return res.status(200).json({ ok: true });
      }

      case 'document_update': {
        if (!me) return fail('Non authentifié', 401);
        if (me.section !== 'comando' && me.section !== 'direction') return fail('Réservé au Commandement / Direction', 403);
        const id = Number(body.id || 0);
        if (!id) return fail('id manquant');
        const ACCES = ['TOUS', 'GRADÉS', 'ÉTAT-MAJOR'];
        const patch = {
          titre: String(body.titre || '').trim() || null,
          categorie: String(body.categorie || '').trim() || null,
          acces: ACCES.includes(body.acces) ? body.acces : 'TOUS',
          contenu: String(body.contenu || '').trim() || null,
          lien: String(body.lien || '').trim() || null,
          photos: Array.isArray(body.photos) ? body.photos.slice(0, 4) : [],
          date_doc: String(body.date_doc || '').trim() || null,
        };
        if (!patch.titre) return fail('Le titre est obligatoire');
        const { error } = await sb().from('documents').update(patch).eq('id', id);
        if (error) return fail(error.message);
        return res.status(200).json({ ok: true });
      }

      case 'document_delete': {
        if (!me) return fail('Non authentifié', 401);
        if (me.section !== 'comando' && me.section !== 'direction') return fail('Réservé au Commandement / Direction', 403);
        const id = Number(body.id || 0);
        if (!id) return fail('id manquant');
        const { error } = await sb().from('documents').delete().eq('id', id);
        if (error) return fail(error.message);
        return res.status(200).json({ ok: true });
      }

      // ── Opérations (lecture pour tous, écriture réservée Commandement / Direction) ──
      case 'operations': {
        if (!me) return fail('Non authentifié', 401);
        const { data, error } = await sb().from('operations').select('*').order('id', { ascending: false });
        if (error) throw error;
        return res.status(200).json({ operations: data, canManage: me.section === 'comando' || me.section === 'direction' });
      }

      case 'operation_add': {
        if (!me) return fail('Non authentifié', 401);
        if (me.section !== 'comando' && me.section !== 'direction') return fail('Réservé au Commandement / Direction', 403);
        const STA = ['PLANIFIÉE', 'EN COURS', 'TERMINÉE'];
        const row = {
          code: String(body.code || '').trim() || null,
          objectif: String(body.objectif || '').trim() || null,
          responsable: String(body.responsable || '').trim() || null,
          participants: String(body.participants || '').trim() || null,
          date_op: String(body.date_op || '').trim() || null,
          statut: STA.includes(body.statut) ? body.statut : 'PLANIFIÉE',
          compte_rendu: String(body.compte_rendu || '').trim() || null,
          auteur_matricule: me.matricule,
          auteur_nom: me.nom,
        };
        if (!row.code || !row.objectif) return fail('Code et objectif obligatoires');
        const { error } = await sb().from('operations').insert(row);
        if (error) return fail(error.message);
        return res.status(200).json({ ok: true });
      }

      case 'operation_update': {
        if (!me) return fail('Non authentifié', 401);
        if (me.section !== 'comando' && me.section !== 'direction') return fail('Réservé au Commandement / Direction', 403);
        const id = Number(body.id || 0);
        if (!id) return fail('id manquant');
        const STA = ['PLANIFIÉE', 'EN COURS', 'TERMINÉE'];
        const patch = {
          code: String(body.code || '').trim() || null,
          objectif: String(body.objectif || '').trim() || null,
          responsable: String(body.responsable || '').trim() || null,
          participants: String(body.participants || '').trim() || null,
          date_op: String(body.date_op || '').trim() || null,
          statut: STA.includes(body.statut) ? body.statut : 'PLANIFIÉE',
          compte_rendu: String(body.compte_rendu || '').trim() || null,
        };
        if (!patch.code || !patch.objectif) return fail('Code et objectif obligatoires');
        const { error } = await sb().from('operations').update(patch).eq('id', id);
        if (error) return fail(error.message);
        return res.status(200).json({ ok: true });
      }

      case 'operation_status': {
        if (!me) return fail('Non authentifié', 401);
        if (me.section !== 'comando' && me.section !== 'direction') return fail('Réservé au Commandement / Direction', 403);
        const id = Number(body.id || 0);
        const STA = ['PLANIFIÉE', 'EN COURS', 'TERMINÉE'];
        if (!id || !STA.includes(body.statut)) return fail('Paramètres invalides');
        const patch = { statut: body.statut };
        if (typeof body.compte_rendu !== 'undefined') patch.compte_rendu = String(body.compte_rendu || '').trim() || null;
        const { error } = await sb().from('operations').update(patch).eq('id', id);
        if (error) return fail(error.message);
        return res.status(200).json({ ok: true });
      }

      case 'operation_delete': {
        if (!me) return fail('Non authentifié', 401);
        if (me.section !== 'comando' && me.section !== 'direction') return fail('Réservé au Commandement / Direction', 403);
        const id = Number(body.id || 0);
        if (!id) return fail('id manquant');
        const { error } = await sb().from('operations').delete().eq('id', id);
        if (error) return fail(error.message);
        return res.status(200).json({ ok: true });
      }

      // ── Sanctions (encodage réservé Commandement / Direction) ──
      case 'sanctions': {
        if (!me) return fail('Non authentifié', 401);
        const { data, error } = await sb().from('sanctions').select('*').order('id', { ascending: false });
        if (error) throw error;
        return res.status(200).json({ sanctions: data });
      }

      case 'sanction_add': {
        if (!me) return fail('Non authentifié', 401);
        if (me.section !== 'comando' && me.section !== 'direction') return fail('Seuls le Commandement et la Direction peuvent sanctionner', 403);
        const TYPES = ['AVERTISSEMENT', 'BLÂME', 'RÉTROGRADATION', 'EXCLUSION'];
        const row = {
          membre: String(body.membre || '').trim() || null,
          type: TYPES.includes(body.type) ? body.type : 'AVERTISSEMENT',
          motif: String(body.motif || '').trim() || null,
          date_sanction: String(body.date_sanction || '').trim() || null,
          prononcee_par: me.nom,
          auteur_matricule: me.matricule,
        };
        if (!row.membre || !row.motif || !row.date_sanction) return fail('Champs obligatoires manquants');
        const { error } = await sb().from('sanctions').insert(row);
        if (error) return fail(error.message);
        return res.status(200).json({ ok: true });
      }

      case 'sanction_delete': {
        if (!me) return fail('Non authentifié', 401);
        if (me.section !== 'comando' && me.section !== 'direction') return fail('Seuls le Commandement et la Direction peuvent supprimer une sanction', 403);
        const id = Number(body.id || 0);
        if (!id) return fail('id manquant');
        const { error } = await sb().from('sanctions').delete().eq('id', id);
        if (error) return fail(error.message);
        return res.status(200).json({ ok: true });
      }

      // ── Rapports ──
      case 'rapports': {
        if (!me) return fail('Non authentifié', 401);
        const { data, error } = await sb().from('rapports').select('*').order('id', { ascending: false });
        if (error) throw error;
        return res.status(200).json({ rapports: data });
      }

      case 'rapport_add': {
        if (!me) return fail('Non authentifié', 401);
        const row = {
          date_rapport: String(body.date_rapport || '').trim() || null,
          agent_rapport: String(body.agent_rapport || '').trim() || null,
          concerne: String(body.concerne || '').trim() || null,
          fait: String(body.fait || '').trim() || null,
          note: String(body.note || '').trim() || null,
          auteur_matricule: me.matricule,
        };
        if (!row.date_rapport || !row.agent_rapport || !row.concerne || !row.fait) return fail('Champs obligatoires manquants');
        const { error } = await sb().from('rapports').insert(row);
        if (error) return fail(error.message);
        return res.status(200).json({ ok: true });
      }

      case 'rapport_delete': {
        if (!me) return fail('Non authentifié', 401);
        const id = Number(body.id || 0);
        if (!id) return fail('id manquant');
        if (me.section !== 'comando' && me.section !== 'direction') {
          return fail('Seuls le Commandement et la Direction peuvent supprimer un rapport', 403);
        }
        const { error } = await sb().from('rapports').delete().eq('id', id);
        if (error) return fail(error.message);
        return res.status(200).json({ ok: true });
      }

      // ── Absences ──
      case 'absences': {
        if (!me) return fail('Non authentifié', 401);
        const { data, error } = await sb().from('absences').select('*').order('id', { ascending: false });
        if (error) throw error;
        return res.status(200).json({ absences: data });
      }

      case 'absence_add': {
        if (!me) return fail('Non authentifié', 401);
        const row = {
          matricule: me.matricule,
          nom: me.nom,
          date_depart: String(body.date_depart || '').trim() || null,
          date_retour: String(body.date_retour || '').trim() || null,
          raison: String(body.raison || '').trim() || null,
        };
        if (!row.date_depart || !row.date_retour) return fail('Dates manquantes');
        const { error } = await sb().from('absences').insert(row);
        if (error) return fail(error.message);
        return res.status(200).json({ ok: true });
      }

      case 'absence_delete': {
        if (!me) return fail('Non authentifié', 401);
        const id = Number(body.id || 0);
        if (!id) return fail('id manquant');
        // On récupère l'absence pour vérifier le droit (auteur ou admin)
        const { data: abs } = await sb().from('absences').select('matricule').eq('id', id).maybeSingle();
        if (!abs) return fail('Absence introuvable', 404);
        if (abs.matricule !== me.matricule && !me.peut_modifier_comptes) return fail('Vous ne pouvez supprimer que votre absence', 403);
        const { error } = await sb().from('absences').delete().eq('id', id);
        if (error) return fail(error.message);
        return res.status(200).json({ ok: true });
      }

      // ── Patrouilles ──
      case 'patrouilles': {
        if (!me) return fail('Non authentifié', 401);
        const { data, error } = await sb().from('patrouilles').select('*').order('id', { ascending: false });
        if (error) throw error;
        return res.status(200).json({ patrouilles: data });
      }

      case 'patrouille_add': {
        if (!me) return fail('Non authentifié', 401);
        const type = ['aerienne', 'terrestre', 'marine', 'fixe'].includes(body.type) ? body.type : 'terrestre';
        const row = {
          type,
          lieu: String(body.lieu || '').trim() || null,
          matricules: String(body.matricules || '').trim() || null,
          vehicule: String(body.vehicule || '').trim() || null,
          debut: String(body.debut || '').trim() || null,
          statut: 'EN COURS',
          auteur_matricule: me.matricule,
        };
        const { error } = await sb().from('patrouilles').insert(row);
        if (error) return fail(error.message);
        return res.status(200).json({ ok: true });
      }

      case 'patrouille_finish': {
        if (!me) return fail('Non authentifié', 401);
        const id = Number(body.id || 0);
        const fin = String(body.fin || '').trim();
        if (!id) return fail('id manquant');
        const { error } = await sb().from('patrouilles').update({ fin, statut: 'TERMINÉE' }).eq('id', id);
        if (error) return fail(error.message);
        return res.status(200).json({ ok: true });
      }

      case 'patrouille_delete': {
        if (!me) return fail('Non authentifié', 401);
        const id = Number(body.id || 0);
        if (!id) return fail('id manquant');
        const { error } = await sb().from('patrouilles').delete().eq('id', id);
        if (error) return fail(error.message);
        return res.status(200).json({ ok: true });
      }

      // ── Debrief soldat : cocher / décocher une certification (formateur) ──
      case 'certif_set': {
        if (!me) return fail('Non authentifié', 401);
        if (!me.formateur && !me.peut_modifier_comptes) return fail('Réservé aux formateurs', 403);
        const mat = String(body.matricule || '').trim();
        const formationNom = String(body.formation || '').trim();
        const has = !!body.has;
        if (!mat || !formationNom) return fail('Champs manquants');
        const { data: f } = await sb().from('formations').select('id').eq('nom', formationNom).maybeSingle();
        if (!f) return fail('Formation inconnue');
        if (has) {
          const { error } = await sb().from('compte_formations')
            .upsert({ compte_matricule: mat, formation_id: f.id }, { onConflict: 'compte_matricule,formation_id' });
          if (error) return fail(error.message);
        } else {
          const { error } = await sb().from('compte_formations')
            .delete().eq('compte_matricule', mat).eq('formation_id', f.id);
          if (error) return fail(error.message);
        }
        return res.status(200).json({ ok: true });
      }

      // ── Gestion des formations (catalogue = colonnes de la matrice) ──
      case 'formation_add': {
        if (!me) return fail('Non authentifié', 401);
        if (!me.peut_modifier_comptes) return fail('Accès refusé', 403);
        const nom = String(body.nom || '').trim();
        const categorie = ['fuerza', 'ejercito', 'marina'].includes(body.categorie) ? body.categorie : 'ejercito';
        const ordre = Number(body.ordre || 99);
        if (!nom) return fail('Nom manquant');
        const { error } = await sb().from('formations').insert({ nom, categorie, ordre });
        if (error) return fail(error.code === '23505' ? 'Cette formation existe déjà' : error.message);
        return res.status(200).json({ ok: true });
      }

      case 'formation_update': {
        if (!me) return fail('Non authentifié', 401);
        if (!me.peut_modifier_comptes) return fail('Accès refusé', 403);
        const id = Number(body.id || 0);
        const nom = String(body.nom || '').trim();
        const categorie = ['fuerza', 'ejercito', 'marina'].includes(body.categorie) ? body.categorie : 'ejercito';
        if (!id || !nom) return fail('Champs manquants');
        const { error } = await sb().from('formations').update({ nom, categorie }).eq('id', id);
        if (error) return fail(error.code === '23505' ? 'Ce nom existe déjà' : error.message);
        return res.status(200).json({ ok: true });
      }

      case 'formation_delete': {
        if (!me) return fail('Non authentifié', 401);
        if (!me.peut_modifier_comptes) return fail('Accès refusé', 403);
        const id = Number(body.id || 0);
        if (!id) return fail('id manquant');
        const { error } = await sb().from('formations').delete().eq('id', id);
        if (error) return fail(error.message);
        return res.status(200).json({ ok: true });
      }

      case 'presence': {
        if (!me) return fail('Non authentifié', 401);
        const { data } = await sb().from('presence').select('depuis, postes(nom), comptes(matricule,nom)');
        const rows = (data || []).map((p) => ({ poste: p.postes?.nom, mat: p.comptes?.matricule, nom: p.comptes?.nom }));
        return res.status(200).json({ presence: rows });
      }

      case 'presence_set': {
        if (!me) return fail('Non authentifié', 401);
        const { data: poste } = await sb().from('postes').select('id').eq('nom', String(body.poste || '')).maybeSingle();
        if (!poste) return fail('Poste inconnu');
        await sb().from('presence').delete().eq('compte_matricule', me.matricule);
        const { error } = await sb().from('presence').insert({ compte_matricule: me.matricule, poste_id: poste.id });
        if (error) return fail(error.message);
        return res.status(200).json({ ok: true });
      }

      case 'presence_clear': {
        if (!me) return fail('Non authentifié', 401);
        await sb().from('presence').delete().eq('compte_matricule', me.matricule);
        return res.status(200).json({ ok: true });
      }

      default:
        return fail('Action inconnue : ' + action, 404);
    }
  } catch (e) {
    return fail('Erreur serveur : ' + (e.message || e), 500);
  }
}
