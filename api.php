<?php
// ════════════════════════════════════════════════════════════════
//  MILICIA — API JSON
//  Endpoints via ?action=... — utilisée par app.js (fetch).
//  Auth par session PHP. Droits vérifiés d'après le grade du compte.
// ════════════════════════════════════════════════════════════════
session_start();
header('Content-Type: application/json; charset=utf-8');

require __DIR__ . '/db.php';

function out($data) { echo json_encode($data); exit; }
function fail($msg, $code = 400) { http_response_code($code); echo json_encode(['error' => $msg]); exit; }

// Compte connecté (ou null) avec ses permissions
function current_user() {
  if (empty($_SESSION['matricule'])) return null;
  $st = db()->prepare(
    "SELECT c.matricule, c.nom, g.nom AS grade, g.section, g.niveau,
            g.peut_ajouter_effectif, g.peut_modifier_comptes,
            g.peut_voir_mdp, g.peut_gerer_grades
     FROM comptes c JOIN grades g ON g.id = c.grade_id
     WHERE c.matricule = ? AND c.actif = 1"
  );
  $st->execute([$_SESSION['matricule']]);
  $u = $st->fetch();
  if (!$u) return null;
  // caste les flags en entiers -> booléens côté JS
  foreach (['niveau','peut_ajouter_effectif','peut_modifier_comptes','peut_voir_mdp','peut_gerer_grades'] as $k) {
    $u[$k] = (int) $u[$k];
  }
  return $u;
}

function require_login() {
  $u = current_user();
  if (!$u) fail('Non authentifié', 401);
  return $u;
}

$action = $_GET['action'] ?? '';
$in = json_decode(file_get_contents('php://input'), true) ?: [];

try {
  switch ($action) {

    // ── Connexion / session ──
    case 'login': {
      $mat = trim($in['matricule'] ?? '');
      $mdp = (string) ($in['mot_de_passe'] ?? '');
      $st = db()->prepare("SELECT matricule FROM comptes WHERE matricule = ? AND mot_de_passe = ? AND actif = 1");
      $st->execute([$mat, $mdp]);
      if (!$st->fetch()) fail('Matricule ou mot de passe incorrect', 401);
      $_SESSION['matricule'] = $mat;
      out(current_user());
    }

    case 'logout':
      session_destroy();
      out(['ok' => true]);

    case 'me':
      out(current_user() ?: ['guest' => true]);

    // ── Effectif (source des autres rubriques) ──
    case 'effectifs': {
      require_login();
      $rows = db()->query(
        "SELECT c.matricule, c.nom, g.nom AS grade, g.section, g.niveau, c.statut
         FROM comptes c JOIN grades g ON g.id = c.grade_id
         WHERE c.actif = 1
         ORDER BY g.niveau DESC, c.matricule"
      )->fetchAll();
      out($rows);
    }

    // ── Liste des grades (pour les menus déroulants) ──
    case 'grades': {
      require_login();
      $rows = db()->query("SELECT id, nom, section, niveau FROM grades ORDER BY niveau DESC")->fetchAll();
      out(['grades' => $rows]);
    }

    // ── Matrice des formations ──
    case 'formations': {
      require_login();
      $forms = db()->query("SELECT nom, categorie FROM formations ORDER BY ordre")->fetchAll();
      $links = db()->query(
        "SELECT cf.compte_matricule AS mat, f.nom AS formation
         FROM compte_formations cf JOIN formations f ON f.id = cf.formation_id"
      )->fetchAll();
      $certifs = [];
      foreach ($links as $l) { $certifs[$l['mat']][] = $l['formation']; }
      out(['formations' => $forms, 'certifs' => $certifs]);
    }

    // ── Comptes (admin) : nom + mdp (mdp seulement si autorisé) ──
    case 'accounts': {
      $u = require_login();
      if (!$u['peut_modifier_comptes'] && !$u['peut_voir_mdp'] && !$u['peut_ajouter_effectif'])
        fail('Accès refusé', 403);
      $rows = db()->query(
        "SELECT c.matricule, c.nom, c.grade_id, g.nom AS grade, c.statut, c.actif, c.mot_de_passe,
                c.date_creation, c.date_maj
         FROM comptes c JOIN grades g ON g.id = c.grade_id
         ORDER BY g.niveau DESC, c.matricule"
      )->fetchAll();
      if (!$u['peut_voir_mdp']) {
        foreach ($rows as &$r) { unset($r['mot_de_passe']); }
      }
      out(['accounts' => $rows, 'peut_voir_mdp' => $u['peut_voir_mdp']]);
    }

    // ── Ajouter un membre / compte ──
    case 'account_add': {
      $u = require_login();
      if (!$u['peut_ajouter_effectif']) fail('Vous n\'avez pas le droit d\'ajouter un membre', 403);
      $mat = trim($in['matricule'] ?? '');
      $nom = trim($in['nom'] ?? '');
      $mdp = (string) ($in['mot_de_passe'] ?? '');
      $grade_id = (int) ($in['grade_id'] ?? 0);
      $statut = ($in['statut'] ?? 'TITULAIRE') === 'EN TEST' ? 'EN TEST' : 'TITULAIRE';
      if ($mat === '' || $nom === '' || $grade_id <= 0) fail('Champs manquants');
      if ($mdp === '') $mdp = 'MILICIA-' . $mat;
      try {
        $st = db()->prepare(
          "INSERT INTO comptes (matricule, nom, mot_de_passe, grade_id, statut) VALUES (?,?,?,?,?)"
        );
        $st->execute([$mat, $nom, $mdp, $grade_id, $statut]);
      } catch (PDOException $e) {
        fail('Matricule déjà utilisé ou grade invalide');
      }
      db()->prepare("INSERT INTO journal_comptes (cible_matricule, auteur_matricule, action, details) VALUES (?,?, 'CREATION', ?)")
          ->execute([$mat, $u['matricule'], "Création de {$nom}"]);
      out(['ok' => true]);
    }

    // ── Modifier un compte ──
    case 'account_update': {
      $u = require_login();
      if (!$u['peut_modifier_comptes']) fail('Vous n\'avez pas le droit de modifier un compte', 403);
      $mat = trim($in['matricule'] ?? '');
      $nom = trim($in['nom'] ?? '');
      $grade_id = (int) ($in['grade_id'] ?? 0);
      $statut = ($in['statut'] ?? 'TITULAIRE') === 'EN TEST' ? 'EN TEST' : 'TITULAIRE';
      if ($mat === '' || $nom === '' || $grade_id <= 0) fail('Champs manquants');
      // Le mot de passe n'est changé que s'il est fourni (non vide)
      if (isset($in['mot_de_passe']) && $in['mot_de_passe'] !== '') {
        db()->prepare("UPDATE comptes SET nom=?, grade_id=?, statut=?, mot_de_passe=? WHERE matricule=?")
            ->execute([$nom, $grade_id, $statut, (string) $in['mot_de_passe'], $mat]);
      } else {
        db()->prepare("UPDATE comptes SET nom=?, grade_id=?, statut=? WHERE matricule=?")
            ->execute([$nom, $grade_id, $statut, $mat]);
      }
      db()->prepare("INSERT INTO journal_comptes (cible_matricule, auteur_matricule, action, details) VALUES (?,?, 'MODIFICATION', ?)")
          ->execute([$mat, $u['matricule'], "Modification de {$nom}"]);
      out(['ok' => true]);
    }

    // ── Supprimer / désactiver un compte ──
    case 'account_delete': {
      $u = require_login();
      if (!$u['peut_modifier_comptes']) fail('Accès refusé', 403);
      $mat = trim($in['matricule'] ?? '');
      if ($mat === '') fail('Matricule manquant');
      if ($mat === $u['matricule']) fail('Vous ne pouvez pas supprimer votre propre compte');
      db()->prepare("DELETE FROM comptes WHERE matricule = ?")->execute([$mat]);
      db()->prepare("INSERT INTO journal_comptes (cible_matricule, auteur_matricule, action) VALUES (?,?, 'SUPPRESSION')")
          ->execute([$mat, $u['matricule']]);
      out(['ok' => true]);
    }

    // ── Présence sur la carte (partagée) ──
    case 'presence': {
      require_login();
      $rows = db()->query(
        "SELECT po.nom AS poste, pr.compte_matricule AS mat, c.nom
         FROM presence pr
         JOIN postes po ON po.id = pr.poste_id
         JOIN comptes c ON c.matricule = pr.compte_matricule"
      )->fetchAll();
      out(['presence' => $rows]);
    }

    case 'presence_set': {
      $u = require_login();
      $poste = trim($in['poste'] ?? '');
      $st = db()->prepare("SELECT id FROM postes WHERE nom = ?");
      $st->execute([$poste]);
      $p = $st->fetch();
      if (!$p) fail('Poste inconnu');
      // un seul poste à la fois
      db()->prepare("DELETE FROM presence WHERE compte_matricule = ?")->execute([$u['matricule']]);
      db()->prepare("INSERT INTO presence (compte_matricule, poste_id) VALUES (?,?)")
          ->execute([$u['matricule'], $p['id']]);
      out(['ok' => true]);
    }

    case 'presence_clear': {
      $u = require_login();
      db()->prepare("DELETE FROM presence WHERE compte_matricule = ?")->execute([$u['matricule']]);
      out(['ok' => true]);
    }

    default:
      fail('Action inconnue : ' . $action, 404);
  }
} catch (Throwable $e) {
  fail('Erreur serveur : ' . $e->getMessage(), 500);
}
