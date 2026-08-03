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
        const { data: forms } = await sb().from('formations').select('nom,categorie').order('ordre');
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
