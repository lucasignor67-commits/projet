-- ════════════════════════════════════════════════════════════════
--  MILICIA DE CAYO PERICO — Base de données
--  Comptes, grades, permissions, effectifs, formations, postes
--  Cible : MySQL 8+ / MariaDB 10.4+  (jeu de caractères utf8mb4)
-- ════════════════════════════════════════════════════════════════
--
--  IMPORTANT (sécurité) :
--   - Le panel actuel est en HTML/CSS/JS statique. Ce fichier SQL
--     décrit la base ; il faut un BACKEND (PHP/Node/…) pour que le
--     site s'y connecte, gère la connexion et applique les droits.
--   - Le champ mot_de_passe est ici en clair pour permettre l'écran
--     « voir les mdp » demandé. En production, il vaut mieux stocker
--     un HASH (bcrypt/argon2) et ne montrer le mdp qu'à la création.
--
--  RÈGLE DE PERMISSION :
--   À partir de « Comando » et de la « Dirección » (grade Teniente et
--   au-dessus, niveau >= 65), un compte peut : ajouter des membres
--   dans l'effectif (ce qui alimente toutes les rubriques), voir et
--   modifier les comptes (noms + mots de passe).
-- ════════════════════════════════════════════════════════════════

CREATE DATABASE IF NOT EXISTS milicia
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE milicia;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS journal_comptes;
DROP TABLE IF EXISTS presence;
DROP TABLE IF EXISTS postes;
DROP TABLE IF EXISTS compte_formations;
DROP TABLE IF EXISTS formations;
DROP TABLE IF EXISTS comptes;
DROP TABLE IF EXISTS grades;
SET FOREIGN_KEY_CHECKS = 1;


-- ════════════════════════════════════════════════════════════════
--  1. GRADES  (référentiel + permissions par grade)
-- ════════════════════════════════════════════════════════════════
CREATE TABLE grades (
  id                    INT PRIMARY KEY,
  nom                   VARCHAR(60)  NOT NULL UNIQUE,
  section               ENUM('direction','comando','liderazgo','aplicacion') NOT NULL,
  niveau                INT NOT NULL,               -- + élevé = + haut gradé
  -- Permissions
  peut_ajouter_effectif TINYINT(1) NOT NULL DEFAULT 0,  -- créer un membre/compte
  peut_modifier_comptes TINYINT(1) NOT NULL DEFAULT 0,  -- éditer nom/grade/mdp
  peut_voir_mdp         TINYINT(1) NOT NULL DEFAULT 0,  -- voir les mots de passe
  peut_gerer_grades     TINYINT(1) NOT NULL DEFAULT 0   -- réservé Dirección
) ENGINE=InnoDB;

-- niveau >= 65 (Teniente et +)  => gestion des comptes
-- niveau >= 85 (Teniente Coronel et +) => + gestion des grades
INSERT INTO grades (id, nom, section, niveau, peut_ajouter_effectif, peut_modifier_comptes, peut_voir_mdp, peut_gerer_grades) VALUES
  ( 1, 'General',               'direction',  100, 1, 1, 1, 1),
  ( 2, 'SubGeneral',            'direction',   95, 1, 1, 1, 1),
  ( 3, 'Coronel',               'direction',   90, 1, 1, 1, 1),
  ( 4, 'Teniente Coronel',      'direction',   85, 1, 1, 1, 1),
  ( 5, 'Comandante',            'comando',     80, 1, 1, 1, 0),
  ( 6, 'Capitán Primero',       'comando',     75, 1, 1, 1, 0),
  ( 7, 'Capitán Segundo',       'comando',     70, 1, 1, 1, 0),
  ( 8, 'Teniente',              'comando',     65, 1, 1, 1, 0),
  ( 9, 'Alfarez Primero',       'liderazgo',   60, 0, 0, 0, 0),
  (10, 'Alfarez Segundo',       'liderazgo',   55, 0, 0, 0, 0),
  (11, 'Sargento Primero',      'liderazgo',   50, 0, 0, 0, 0),
  (12, 'Sargento de la Milicia','liderazgo',   45, 0, 0, 0, 0),
  (13, 'Cabo',                  'aplicacion',  40, 0, 0, 0, 0),
  (14, 'Soldado Primera',       'aplicacion',  35, 0, 0, 0, 0),
  (15, 'Soldado',               'aplicacion',  30, 0, 0, 0, 0),
  (16, 'Recluta',               'aplicacion',  25, 0, 0, 0, 0);


-- ════════════════════════════════════════════════════════════════
--  2. COMPTES  (= EFFECTIFS : source unique de tous les membres)
--     Ajouter/retirer ici met à jour toutes les rubriques via les
--     vues et les clés étrangères ci-dessous.
-- ════════════════════════════════════════════════════════════════
CREATE TABLE comptes (
  id            INT PRIMARY KEY AUTO_INCREMENT,
  matricule     VARCHAR(6)  NOT NULL UNIQUE,
  nom           VARCHAR(80) NOT NULL,
  mot_de_passe  VARCHAR(255) NOT NULL,               -- cf. note sécurité
  grade_id      INT NOT NULL,
  statut        ENUM('TITULAIRE','EN TEST') NOT NULL DEFAULT 'TITULAIRE',
  actif         TINYINT(1) NOT NULL DEFAULT 1,       -- 0 = compte désactivé
  date_creation TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  date_maj      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_compte_grade FOREIGN KEY (grade_id) REFERENCES grades(id)
) ENGINE=InnoDB;

-- grade_id : 1 General · 2 SubGeneral · 3 Coronel · 4 Teniente Coronel
--            5 Comandante · 6 Cap.Primero · 7 Cap.Segundo · 8 Teniente
--            9 Alf.Primero · 10 Alf.Segundo · 11 Sarg.Primero · 12 Sargento
--            13 Cabo · 14 Sold.Primera · 15 Soldado · 16 Recluta
-- Mots de passe = valeurs par défaut à changer (« MILICIA-<matricule> »).
INSERT INTO comptes (matricule, nom, mot_de_passe, grade_id, statut) VALUES
  ('04','Frost Alex',            'MILICIA-04', 7,'EN TEST'),
  ('06','Emax Jackson',          'MILICIA-06', 6,'TITULAIRE'),
  ('07','Freya Myers',           'MILICIA-07',16,'TITULAIRE'),
  ('08','Jean Rashford Muani',   'MILICIA-08',16,'TITULAIRE'),
  ('09','Julian Salvatore',      'MILICIA-09',10,'TITULAIRE'),
  ('10','Loann Charvot',         'MILICIA-10',16,'TITULAIRE'),
  ('11','Max Emerson',           'MILICIA-11', 6,'EN TEST'),
  ('12','Perdo Faritasse',       'MILICIA-12',16,'TITULAIRE'),
  ('13','Solís Grenadine',       'MILICIA-13', 9,'TITULAIRE'),
  ('14','Carlo Avarro',          'MILICIA-14', 8,'TITULAIRE'),
  ('15','Looping Lee',           'MILICIA-15', 3,'TITULAIRE'),
  ('16','Esmée Bueno',           'MILICIA-16', 3,'TITULAIRE'),
  ('17','Elie Abel',             'MILICIA-17',16,'TITULAIRE'),
  ('19','Brian Peterson',        'MILICIA-19',16,'TITULAIRE'),
  ('20','Reno Leven Toro',       'MILICIA-20',16,'TITULAIRE'),
  ('22','Alvaro Cortes',         'MILICIA-22',15,'TITULAIRE'),
  ('24','Joachim Ben Messaoud',  'MILICIA-24',16,'TITULAIRE'),
  ('25','Jan Nowak',             'MILICIA-25',16,'TITULAIRE'),
  ('26','Malik Abik',            'MILICIA-26',16,'TITULAIRE'),
  ('27','Perdo Sisa',            'MILICIA-27',15,'TITULAIRE'),
  ('28','Ben Rich The-Bee Bueno','MILICIA-28',16,'TITULAIRE'),
  ('29','Aylan Thoands',         'MILICIA-29',16,'TITULAIRE'),
  ('30','Damon Peterson',        'MILICIA-30',16,'TITULAIRE'),
  ('31','Wolf Smith Nolan',      'MILICIA-31', 8,'TITULAIRE'),
  ('33','Gwenn Loera',           'MILICIA-33',16,'TITULAIRE'),
  ('34','Hargrove Eloann',       'MILICIA-34',16,'TITULAIRE'),
  ('35','Delacruz Carlos',       'MILICIA-35',16,'TITULAIRE'),
  ('36','Diego Alvarez',         'MILICIA-36',16,'TITULAIRE'),
  ('37','Jhonn Sléman',          'MILICIA-37',15,'TITULAIRE'),
  ('38','Béné Ghanzalez',        'MILICIA-38',16,'TITULAIRE'),
  ('42','Hamilton Andy',         'MILICIA-42',15,'TITULAIRE'),
  ('43','Laponne Mattéo',        'MILICIA-43', 3,'TITULAIRE'),
  ('44','Sergio Artys',          'MILICIA-44', 7,'TITULAIRE'),
  ('45','Rayan Fox',             'MILICIA-45',16,'TITULAIRE'),
  ('46','Tom Kirkmant',          'MILICIA-46',16,'TITULAIRE'),
  ('47','Tazer Jacob',           'MILICIA-47',16,'TITULAIRE'),
  ('48','Callisto Reyes',        'MILICIA-48', 4,'EN TEST'),
  ('49','Cédric Moreno',         'MILICIA-49',16,'TITULAIRE'),
  ('51','Diego Ramirez',         'MILICIA-51',16,'TITULAIRE'),
  ('52','Couper Boss',           'MILICIA-52',16,'TITULAIRE'),
  ('53','Rico Ad',               'MILICIA-53',16,'TITULAIRE'),
  ('55','Pablito Escanor',       'MILICIA-55',15,'TITULAIRE'),
  ('56','Myers Rima',            'MILICIA-56',16,'TITULAIRE'),
  ('58','Mora Jordan',           'MILICIA-58',16,'TITULAIRE'),
  ('59','Gianni Lampuza',        'MILICIA-59',10,'TITULAIRE'),
  ('62','Valesco Lee Riley',     'MILICIA-62', 8,'TITULAIRE'),
  ('64','Lopesse Karl',          'MILICIA-64',16,'TITULAIRE'),
  ('65','Juan El Sueno',         'MILICIA-65', 8,'EN TEST'),
  ('66','Hakim Mahgoumgo',       'MILICIA-66',14,'TITULAIRE'),
  ('67','James Bobby',           'MILICIA-67',16,'TITULAIRE'),
  ('68','Rivera Emilio',         'MILICIA-68', 9,'EN TEST'),
  ('69','Clément Landy',         'MILICIA-69',16,'TITULAIRE'),
  ('71','Mathis Luke',           'MILICIA-71',16,'TITULAIRE'),
  ('73','Ricardo Peirrera',      'MILICIA-73',16,'TITULAIRE'),
  ('74','Lucas Martin',          'MILICIA-74',12,'TITULAIRE'),
  ('77','Livio Santos',          'MILICIA-77',12,'TITULAIRE'),
  ('78','Djess Less',            'MILICIA-78',16,'TITULAIRE'),
  ('80','Eren Kohlman',          'MILICIA-80',16,'TITULAIRE'),
  ('82','Bernardo Wedson',       'MILICIA-82',13,'EN TEST'),
  ('83','Clode Myers',           'MILICIA-83',16,'TITULAIRE'),
  ('85','Alsan Guesumov',        'MILICIA-85',16,'TITULAIRE'),
  ('87','Dovis Diego',           'MILICIA-87',16,'TITULAIRE'),
  ('88','Fox Nina',              'MILICIA-88', 9,'TITULAIRE'),
  ('89','Jason Larkay',          'MILICIA-89',16,'TITULAIRE'),
  ('90','Joe Billy',             'MILICIA-90',16,'TITULAIRE');


-- ════════════════════════════════════════════════════════════════
--  3. FORMATIONS  (colonnes de la matrice) + certifications
-- ════════════════════════════════════════════════════════════════
CREATE TABLE formations (
  id        INT PRIMARY KEY AUTO_INCREMENT,
  nom       VARCHAR(40) NOT NULL UNIQUE,
  categorie ENUM('fuerza','ejercito','marina') NOT NULL,  -- air / véhicule / maritime
  ordre     INT NOT NULL DEFAULT 0
) ENGINE=InnoDB;

INSERT INTO formations (nom, categorie, ordre) VALUES
  ('MAS',            'fuerza',   1),
  ('Pilote avancée', 'fuerza',   2),
  ('Pilote',         'fuerza',   3),
  ('Artilleur',      'fuerza',   4),
  ('CQB / DRESS',    'ejercito', 5),
  ('Camion',         'ejercito', 6),
  ('Winky',          'ejercito', 7),
  ('Patrouille',     'ejercito', 8),
  ('Quad',           'ejercito', 9),
  ('Moto',           'ejercito',10),
  ('DBM',            'marina',  11),
  ('Bateau avancée', 'marina',  12),
  ('Bateau',         'marina',  13),
  ('Plongée',        'marina',  14),
  ('Squaddie',       'marina',  15);

-- Table de liaison : quel matricule possède quelle formation
CREATE TABLE compte_formations (
  compte_matricule VARCHAR(6) NOT NULL,
  formation_id     INT NOT NULL,
  date_obtention   DATE NULL,
  PRIMARY KEY (compte_matricule, formation_id),
  CONSTRAINT fk_cf_compte    FOREIGN KEY (compte_matricule) REFERENCES comptes(matricule) ON DELETE CASCADE,
  CONSTRAINT fk_cf_formation FOREIGN KEY (formation_id)     REFERENCES formations(id)     ON DELETE CASCADE
) ENGINE=InnoDB;

-- Certifications de départ (mêmes données que la matrice du panel)
INSERT INTO compte_formations (compte_matricule, formation_id)
SELECT c.matricule, f.id FROM comptes c JOIN formations f
WHERE (c.matricule='15' AND f.nom IN ('MAS','Pilote avancée','Pilote','Artilleur','Camion','Winky','Patrouille','Quad','Moto'))
   OR (c.matricule='16' AND f.nom IN ('DBM','Bateau avancée','Bateau','Plongée','Squaddie','Patrouille','Winky'))
   OR (c.matricule='43' AND f.nom IN ('CQB / DRESS','Camion','Winky','Patrouille','Quad','Moto'))
   OR (c.matricule='14' AND f.nom IN ('Winky','Patrouille','Quad','Bateau'))
   OR (c.matricule='31' AND f.nom IN ('Camion','Winky','Patrouille','Quad','Moto'))
   OR (c.matricule='62' AND f.nom IN ('Winky','Patrouille','Quad','Bateau','Squaddie'))
   OR (c.matricule='06' AND f.nom IN ('Pilote','Artilleur','Winky','Patrouille'))
   OR (c.matricule='44' AND f.nom IN ('Winky','Patrouille','Quad','Camion'));


-- ════════════════════════════════════════════════════════════════
--  4. POSTES (points de la carte) + PRÉSENCE (prise de poste)
-- ════════════════════════════════════════════════════════════════
CREATE TABLE postes (
  id     INT PRIMARY KEY AUTO_INCREMENT,
  nom    VARCHAR(60) NOT NULL UNIQUE,
  pos_x  DECIMAL(5,2) NOT NULL,   -- position en % (0-100)
  pos_y  DECIMAL(5,2) NOT NULL,
  statut ENUM('SÉCURISÉE','SURVEILLANCE','ALERTE') NOT NULL DEFAULT 'SÉCURISÉE'
) ENGINE=InnoDB;

INSERT INTO postes (nom, pos_x, pos_y, statut) VALUES
  ('Aérodrome',            37, 21, 'SÉCURISÉE'),
  ('Frontière',            69, 43, 'SURVEILLANCE'),
  ('Port armée',           59, 52, 'SÉCURISÉE'),
  ('entré zone rouge',     61, 72, 'ALERTE'),
  ('Champ de feuille',     78, 60, 'SÉCURISÉE'),
  ('Patrouille Terrestre',  8, 40, 'SÉCURISÉE'),
  ('Patrouille Maritime',   8, 51, 'SÉCURISÉE'),
  ('Patrouille Aérienne',   8, 45, 'SÉCURISÉE'),
  ('En formation',         93,  5, 'SURVEILLANCE'),
  ('Surveillance TIG',     93, 10, 'SÉCURISÉE');

-- Un membre ne peut occuper qu'un seul poste à la fois (UNIQUE sur matricule)
CREATE TABLE presence (
  compte_matricule VARCHAR(6) NOT NULL,
  poste_id         INT NOT NULL,
  depuis           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (compte_matricule),
  CONSTRAINT fk_pr_compte FOREIGN KEY (compte_matricule) REFERENCES comptes(matricule) ON DELETE CASCADE,
  CONSTRAINT fk_pr_poste  FOREIGN KEY (poste_id)         REFERENCES postes(id)         ON DELETE CASCADE
) ENGINE=InnoDB;


-- ════════════════════════════════════════════════════════════════
--  5. JOURNAL  (traçabilité des actions sur les comptes)
-- ════════════════════════════════════════════════════════════════
CREATE TABLE journal_comptes (
  id                 INT PRIMARY KEY AUTO_INCREMENT,
  cible_matricule    VARCHAR(6) NULL,       -- compte concerné
  auteur_matricule   VARCHAR(6) NULL,       -- qui a fait l'action
  action             ENUM('CREATION','MODIFICATION','SUPPRESSION','RESET_MDP','CHANGE_GRADE') NOT NULL,
  details            VARCHAR(255) NULL,
  date_action        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;


-- ════════════════════════════════════════════════════════════════
--  6. VUES pratiques
-- ════════════════════════════════════════════════════════════════

-- Effectif complet (alimente toutes les rubriques du panel)
CREATE OR REPLACE VIEW v_effectifs AS
SELECT c.matricule, c.nom, g.nom AS grade, g.section, g.niveau, c.statut, c.actif
FROM comptes c JOIN grades g ON g.id = c.grade_id
ORDER BY g.niveau DESC, c.matricule;

-- Vue d'administration (nom + mot de passe) — à n'exposer qu'aux
-- comptes ayant peut_voir_mdp = 1.
CREATE OR REPLACE VIEW v_comptes_admin AS
SELECT c.matricule, c.nom, c.mot_de_passe, g.nom AS grade, c.statut, c.actif,
       c.date_creation, c.date_maj
FROM comptes c JOIN grades g ON g.id = c.grade_id
ORDER BY g.niveau DESC, c.matricule;

-- Qui est où (présence sur la carte)
CREATE OR REPLACE VIEW v_presence AS
SELECT p.nom AS poste, po.statut, c.matricule, c.nom, pr.depuis
FROM presence pr
JOIN comptes c ON c.matricule = pr.compte_matricule
JOIN postes po ON po.id = pr.poste_id
JOIN postes p  ON p.id = pr.poste_id
ORDER BY p.nom;


-- ════════════════════════════════════════════════════════════════
--  7. EXEMPLES DE REQUÊTES (à utiliser depuis le backend)
-- ════════════════════════════════════════════════════════════════
-- --- Connexion : vérifier identifiants ---
-- SELECT c.matricule, c.nom, g.nom AS grade,
--        g.peut_ajouter_effectif, g.peut_modifier_comptes, g.peut_voir_mdp
-- FROM comptes c JOIN grades g ON g.id = c.grade_id
-- WHERE c.matricule = ? AND c.mot_de_passe = ? AND c.actif = 1;
--
-- --- Le compte connecté a-t-il le droit de gérer les comptes ? ---
-- SELECT g.peut_modifier_comptes
-- FROM comptes c JOIN grades g ON g.id = c.grade_id
-- WHERE c.matricule = ?;
--
-- --- Ajouter un membre (réservé peut_ajouter_effectif = 1) ---
-- INSERT INTO comptes (matricule, nom, mot_de_passe, grade_id, statut)
-- VALUES (?, ?, ?, (SELECT id FROM grades WHERE nom = ?), ?);
--
-- --- Modifier un compte (nom / grade / mot de passe) ---
-- UPDATE comptes
-- SET nom = ?, grade_id = (SELECT id FROM grades WHERE nom = ?), mot_de_passe = ?
-- WHERE matricule = ?;
--
-- --- Prendre un poste (retire d'abord l'ancien : un seul à la fois) ---
-- DELETE FROM presence WHERE compte_matricule = ?;
-- INSERT INTO presence (compte_matricule, poste_id)
-- VALUES (?, (SELECT id FROM postes WHERE nom = ?));
--
-- --- Quitter son poste ---
-- DELETE FROM presence WHERE compte_matricule = ?;
-- ════════════════════════════════════════════════════════════════
