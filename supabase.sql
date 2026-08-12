-- ════════════════════════════════════════════════════════════════
--  MILICIA DE CAYO PERICO — Schéma PostgreSQL (Supabase)
--  À coller dans Supabase → SQL Editor → New query → Run.
-- ════════════════════════════════════════════════════════════════

DROP VIEW  IF EXISTS v_presence, v_comptes_admin, v_comptes_perms, v_effectifs;
DROP TABLE IF EXISTS journal_comptes, presence, postes, patrouilles, absences, rapports, sanctions, annonces, blacklist, tig, saisies,
                     compte_formations, formations, comptes, grades CASCADE;

-- ── 1. GRADES + permissions ─────────────────────────────────────
CREATE TABLE grades (
  id                    INT PRIMARY KEY,
  nom                   VARCHAR(60) NOT NULL UNIQUE,
  section               VARCHAR(12) NOT NULL CHECK (section IN ('direction','comando','liderazgo','aplicacion')),
  niveau                INT NOT NULL,
  peut_ajouter_effectif BOOLEAN NOT NULL DEFAULT false,
  peut_modifier_comptes BOOLEAN NOT NULL DEFAULT false,
  peut_voir_mdp         BOOLEAN NOT NULL DEFAULT false,
  peut_gerer_grades     BOOLEAN NOT NULL DEFAULT false
);

INSERT INTO grades (id, nom, section, niveau, peut_ajouter_effectif, peut_modifier_comptes, peut_voir_mdp, peut_gerer_grades) VALUES
  ( 1,'General',               'direction', 100, true,  true,  true,  true ),
  ( 2,'SubGeneral',            'direction',  95, true,  true,  true,  true ),
  ( 3,'Coronel',               'direction',  90, true,  true,  true,  true ),
  ( 4,'Teniente Coronel',      'direction',  85, true,  true,  true,  true ),
  ( 5,'Comandante',            'comando',    80, true,  true,  true,  false),
  ( 6,'Capitán Primero',       'comando',    75, true,  true,  true,  false),
  ( 7,'Capitán Segundo',       'comando',    70, true,  true,  true,  false),
  ( 8,'Teniente',              'comando',    65, true,  true,  true,  false),
  ( 9,'Alfarez Primero',       'liderazgo',  60, false, false, false, false),
  (10,'Alfarez Segundo',       'liderazgo',  55, false, false, false, false),
  (11,'Sargento Primero',      'liderazgo',  50, false, false, false, false),
  (12,'Sargento de la Milicia','liderazgo',  45, false, false, false, false),
  (13,'Cabo',                  'aplicacion', 40, false, false, false, false),
  (14,'Soldado Primera',       'aplicacion', 35, false, false, false, false),
  (15,'Soldado',               'aplicacion', 30, false, false, false, false),
  (16,'Recluta',               'aplicacion', 25, false, false, false, false);

-- ── 2. COMPTES (= EFFECTIFS, source unique) ─────────────────────
CREATE TABLE comptes (
  id            SERIAL PRIMARY KEY,
  matricule     VARCHAR(6)  NOT NULL UNIQUE,
  nom           VARCHAR(80) NOT NULL,
  mot_de_passe  VARCHAR(255) NOT NULL,
  grade_id      INT NOT NULL REFERENCES grades(id),
  statut        VARCHAR(12) NOT NULL DEFAULT 'TITULAIRE' CHECK (statut IN ('TITULAIRE','EN TEST')),
  actif         BOOLEAN NOT NULL DEFAULT true,
  formateur     BOOLEAN NOT NULL DEFAULT false,
  recruteur     BOOLEAN NOT NULL DEFAULT false,
  date_creation TIMESTAMPTZ NOT NULL DEFAULT now(),
  date_maj      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 2b. CONTRATS DE TRAVAIL (recrues créées par les recruteurs) ──
CREATE TABLE contrats (
  id               SERIAL PRIMARY KEY,
  matricule        VARCHAR(6),
  nom              VARCHAR(120),
  telephone        VARCHAR(20),
  rib              VARCHAR(40),
  assermentation   VARCHAR(20),
  photo            TEXT,
  cree_par         VARCHAR(80),
  auteur_matricule VARCHAR(6),
  date_creation    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Met à jour date_maj automatiquement à chaque UPDATE
CREATE OR REPLACE FUNCTION set_date_maj() RETURNS trigger AS $$
BEGIN NEW.date_maj := now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_comptes_maj BEFORE UPDATE ON comptes
  FOR EACH ROW EXECUTE FUNCTION set_date_maj();

-- grade_id : 1 General · 2 SubGeneral · 3 Coronel · 4 Teniente Coronel
--            5 Comandante · 6 Cap.Primero · 7 Cap.Segundo · 8 Teniente
--            9 Alf.Primero · 10 Alf.Segundo · 11 Sarg.Primero · 12 Sargento
--            13 Cabo · 14 Sold.Primera · 15 Soldado · 16 Recluta
INSERT INTO comptes (matricule, nom, mot_de_passe, grade_id, statut) VALUES
  ('04','Frost Alex',            'gaufre64', 7,'EN TEST'),
  ('06','Emax Jackson',          'melon61', 6,'TITULAIRE'),
  ('07','Freya Myers',           'orage91',16,'TITULAIRE'),
  ('08','Jean Rashford Muani',   'saphir55',16,'TITULAIRE'),
  ('09','Julian Salvatore',      'tonnerre62',10,'TITULAIRE'),
  ('10','Loann Charvot',         'panda57',16,'TITULAIRE'),
  ('11','Max Emerson',           'banane79', 6,'EN TEST'),
  ('12','Perdo Faritasse',       'argent23',16,'TITULAIRE'),
  ('13','Solís Grenadine',       'tigre41', 9,'TITULAIRE'),
  ('14','Carlo Avarro',          'marbre37', 8,'TITULAIRE'),
  ('15','Looping Lee',           'taureau42', 3,'TITULAIRE'),
  ('16','Esmée Bueno',           'aigle52', 3,'TITULAIRE'),
  ('17','Elie Abel',             'cerise64',16,'TITULAIRE'),
  ('19','Brian Peterson',        'bison69',16,'TITULAIRE'),
  ('20','Reno Leven Toro',       'moto70',16,'TITULAIRE'),
  ('22','Alvaro Cortes',         'ocre25',15,'TITULAIRE'),
  ('24','Joachim Ben Messaoud',  'mangue63',16,'TITULAIRE'),
  ('25','Jan Nowak',             'cascade49',16,'TITULAIRE'),
  ('26','Malik Abik',            'galaxie65',16,'TITULAIRE'),
  ('27','Perdo Sisa',            'biscuit70',15,'TITULAIRE'),
  ('28','Ben Rich The-Bee Bueno','hibou21',16,'TITULAIRE'),
  ('29','Aylan Thoands',         'granit14',16,'TITULAIRE'),
  ('30','Damon Peterson',        'kiwi52',16,'TITULAIRE'),
  ('31','Wolf Smith Nolan',      'glacier88', 8,'TITULAIRE'),
  ('33','Gwenn Loera',           'ambre34',16,'TITULAIRE'),
  ('34','Hargrove Eloann',       'canyon54',16,'TITULAIRE'),
  ('35','Delacruz Carlos',       'piment56',16,'TITULAIRE'),
  ('36','Diego Alvarez',         'castor47',16,'TITULAIRE'),
  ('37','Jhonn Sléman',          'montagne29',15,'TITULAIRE'),
  ('38','Béné Ghanzalez',        'cobra84',16,'TITULAIRE'),
  ('42','Hamilton Andy',         'dauphin43',15,'TITULAIRE'),
  ('43','Laponne Mattéo',        'phoque65', 3,'TITULAIRE'),
  ('44','Sergio Artys',          'cheval64', 7,'TITULAIRE'),
  ('45','Rayan Fox',             'soleil73',16,'TITULAIRE'),
  ('46','Tom Kirkmant',          'diamant41',16,'TITULAIRE'),
  ('47','Tazer Jacob',           'raisin85',16,'TITULAIRE'),
  ('48','Callisto Reyes',        'koala95', 4,'EN TEST'),
  ('49','Cédric Moreno',         'cannelle85',16,'TITULAIRE'),
  ('51','Diego Ramirez',         'pomme68',16,'TITULAIRE'),
  ('52','Couper Boss',           'ours82',16,'TITULAIRE'),
  ('53','Rico Ad',               'opale74',16,'TITULAIRE'),
  ('55','Pablito Escanor',       'faucon81',15,'TITULAIRE'),
  ('56','Myers Rima',            'foret48',16,'TITULAIRE'),
  ('58','Mora Jordan',           'carotte14',16,'TITULAIRE'),
  ('59','Gianni Lampuza',        'lion65',10,'TITULAIRE'),
  ('62','Valesco Lee Riley',     'ananas94', 8,'TITULAIRE'),
  ('64','Lopesse Karl',          'indigo99',16,'TITULAIRE'),
  ('65','Juan El Sueno',         'magenta97', 8,'EN TEST'),
  ('66','Hakim Mahgoumgo',       'puma10',14,'TITULAIRE'),
  ('67','James Bobby',           'volcan15',16,'TITULAIRE'),
  ('68','Rivera Emilio',         'renard53', 9,'EN TEST'),
  ('69','Clément Landy',         'riviere29',16,'TITULAIRE'),
  ('71','Mathis Luke',           'bronze74',16,'TITULAIRE'),
  ('73','Ricardo Peirrera',      'loup97',16,'TITULAIRE'),
  ('74','Lucas Martin',          'cuivre81',12,'TITULAIRE'),
  ('77','Livio Santos',          'fraise41',12,'TITULAIRE'),
  ('78','Djess Less',            'corbeau83',16,'TITULAIRE'),
  ('80','Eren Kohlman',          'zebre58',16,'TITULAIRE'),
  ('82','Bernardo Wedson',       'desert19',13,'EN TEST'),
  ('83','Clode Myers',           'cyan71',16,'TITULAIRE'),
  ('85','Alsan Guesumov',        'tempete60',16,'TITULAIRE'),
  ('87','Dovis Diego',           'silex40',16,'TITULAIRE'),
  ('88','Fox Nina',              'caramel76', 9,'TITULAIRE'),
  ('89','Jason Larkay',          'pirate81',16,'TITULAIRE'),
  ('90','Joe Billy',             'chocolat68',16,'TITULAIRE');

-- ── 3. FORMATIONS + certifications ──────────────────────────────
CREATE TABLE formations (
  id        SERIAL PRIMARY KEY,
  nom       VARCHAR(40) NOT NULL UNIQUE,
  categorie VARCHAR(10) NOT NULL CHECK (categorie IN ('fuerza','ejercito','marina')),
  ordre     INT NOT NULL DEFAULT 0
);

INSERT INTO formations (nom, categorie, ordre) VALUES
  ('MAS','fuerza',1),('Pilote avancée','fuerza',2),('Pilote','fuerza',3),('Artilleur','fuerza',4),
  ('CQB / DRESS','ejercito',5),('Camion','ejercito',6),('Winky','ejercito',7),('Patrouille','ejercito',8),
  ('Quad','ejercito',9),('Moto','ejercito',10),
  ('DBM','marina',11),('Bateau avancée','marina',12),('Bateau','marina',13),('Plongée','marina',14),('Squaddie','marina',15);

CREATE TABLE compte_formations (
  compte_matricule VARCHAR(6) NOT NULL REFERENCES comptes(matricule) ON DELETE CASCADE,
  formation_id     INT NOT NULL REFERENCES formations(id) ON DELETE CASCADE,
  date_obtention   DATE,
  PRIMARY KEY (compte_matricule, formation_id)
);

INSERT INTO compte_formations (compte_matricule, formation_id)
SELECT c.matricule, f.id
FROM comptes c CROSS JOIN formations f
WHERE (c.matricule='15' AND f.nom IN ('MAS','Pilote avancée','Pilote','Artilleur','Camion','Winky','Patrouille','Quad','Moto'))
   OR (c.matricule='16' AND f.nom IN ('DBM','Bateau avancée','Bateau','Plongée','Squaddie','Patrouille','Winky'))
   OR (c.matricule='43' AND f.nom IN ('CQB / DRESS','Camion','Winky','Patrouille','Quad','Moto'))
   OR (c.matricule='14' AND f.nom IN ('Winky','Patrouille','Quad','Bateau'))
   OR (c.matricule='31' AND f.nom IN ('Camion','Winky','Patrouille','Quad','Moto'))
   OR (c.matricule='62' AND f.nom IN ('Winky','Patrouille','Quad','Bateau','Squaddie'))
   OR (c.matricule='06' AND f.nom IN ('Pilote','Artilleur','Winky','Patrouille'))
   OR (c.matricule='44' AND f.nom IN ('Winky','Patrouille','Quad','Camion'));

-- ── 4. POSTES + PRÉSENCE ────────────────────────────────────────
CREATE TABLE postes (
  id     SERIAL PRIMARY KEY,
  nom    VARCHAR(60) NOT NULL UNIQUE,
  pos_x  NUMERIC(5,2) NOT NULL,
  pos_y  NUMERIC(5,2) NOT NULL,
  statut VARCHAR(14) NOT NULL DEFAULT 'SÉCURISÉE' CHECK (statut IN ('SÉCURISÉE','SURVEILLANCE','ALERTE'))
);

INSERT INTO postes (nom, pos_x, pos_y, statut) VALUES
  ('Aérodrome',37,21,'SÉCURISÉE'),('Frontière',69,43,'SURVEILLANCE'),('Port armée',59,52,'SÉCURISÉE'),
  ('entré zone rouge',61,72,'ALERTE'),('Champ de feuille',78,60,'SÉCURISÉE'),
  ('Patrouille Terrestre',8,40,'SÉCURISÉE'),('Patrouille Maritime',8,51,'SÉCURISÉE'),
  ('Patrouille Aérienne',8,45,'SÉCURISÉE'),('En formation',93,5,'SURVEILLANCE'),('Surveillance TIG',93,10,'SÉCURISÉE');

CREATE TABLE presence (
  compte_matricule VARCHAR(6) PRIMARY KEY REFERENCES comptes(matricule) ON DELETE CASCADE,
  poste_id         INT NOT NULL REFERENCES postes(id) ON DELETE CASCADE,
  depuis           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Temps réel : diffuse les changements de présence à tous les clients abonnés.
-- (données non sensibles : matricule + poste)
ALTER PUBLICATION supabase_realtime ADD TABLE presence;
GRANT SELECT ON presence TO anon;

-- ── 4b. PATROUILLES ─────────────────────────────────────────────
CREATE TABLE patrouilles (
  id               SERIAL PRIMARY KEY,
  type             VARCHAR(12) NOT NULL CHECK (type IN ('aerienne','terrestre','marine','fixe')),
  lieu             VARCHAR(80),
  matricules       VARCHAR(120),
  vehicule         VARCHAR(80),
  debut            VARCHAR(20),
  fin              VARCHAR(20),
  statut           VARCHAR(12) NOT NULL DEFAULT 'EN COURS' CHECK (statut IN ('EN COURS','TERMINÉE')),
  auteur_matricule VARCHAR(6),
  date_creation    TIMESTAMPTZ NOT NULL DEFAULT now()
) ;

-- ── 4h. TIG (travaux d'intérêt général) ─────────────────────────
CREATE TABLE tig (
  id               SERIAL PRIMARY KEY,
  nom              VARCHAR(120),
  heures           VARCHAR(40),
  motif            TEXT,
  amende           INTEGER DEFAULT 0,
  date_tig         VARCHAR(40),
  statut           VARCHAR(12) NOT NULL DEFAULT 'EN COURS' CHECK (statut IN ('EN COURS','TERMINÉ')),
  par              VARCHAR(80),
  auteur_matricule VARCHAR(6),
  date_creation    TIMESTAMPTZ NOT NULL DEFAULT now()
) ;

-- ── 4i. SAISIES (rapports d'amende) ─────────────────────────────
CREATE TABLE saisies (
  id                  SERIAL PRIMARY KEY,
  nom                 VARCHAR(80),
  prenom              VARCHAR(80),
  date_saisie         VARCHAR(40),
  heure_arrestation   VARCHAR(20),
  matricules_presents VARCHAR(120),
  etat_amendes        VARCHAR(12) DEFAULT 'NON PAYÉ',
  infractions         JSONB DEFAULT '[]'::jsonb,
  total               INTEGER DEFAULT 0,
  photos              JSONB DEFAULT '[]'::jsonb,
  par                 VARCHAR(80),
  auteur_matricule    VARCHAR(6),
  date_creation       TIMESTAMPTZ NOT NULL DEFAULT now()
) ;

-- ── 4g. BLACKLIST (avec photos compressées) ─────────────────────
CREATE TABLE blacklist (
  id               SERIAL PRIMARY KEY,
  nom              VARCHAR(120),
  date_bl          VARCHAR(40),
  duree            VARCHAR(40),
  motif            TEXT,
  actif            BOOLEAN NOT NULL DEFAULT true,
  photos           JSONB DEFAULT '[]'::jsonb,
  auteur_matricule VARCHAR(6),
  auteur_nom       VARCHAR(80),
  date_creation    TIMESTAMPTZ NOT NULL DEFAULT now()
) ;

-- ── 4f. ANNONCES (communications, avec photos compressées) ──────
CREATE TABLE annonces (
  id               SERIAL PRIMARY KEY,
  titre            VARCHAR(160),
  contenu          TEXT,
  priorite         VARCHAR(12) DEFAULT 'NORMALE',
  canal            VARCHAR(40),
  date_annonce     VARCHAR(40),
  photos           JSONB DEFAULT '[]'::jsonb,
  auteur_matricule VARCHAR(6),
  auteur_nom       VARCHAR(80),
  date_creation    TIMESTAMPTZ NOT NULL DEFAULT now()
) ;

-- ── 4e. SANCTIONS ───────────────────────────────────────────────
CREATE TABLE sanctions (
  id               SERIAL PRIMARY KEY,
  membre           VARCHAR(120),
  type             VARCHAR(20),
  motif            VARCHAR(255),
  prononcee_par    VARCHAR(80),
  date_sanction    VARCHAR(40),
  auteur_matricule VARCHAR(6),
  date_creation    TIMESTAMPTZ NOT NULL DEFAULT now()
) ;

-- ── 4d. RAPPORTS ────────────────────────────────────────────────
CREATE TABLE rapports (
  id               SERIAL PRIMARY KEY,
  date_rapport     VARCHAR(40),
  agent_rapport    VARCHAR(80),
  concerne         VARCHAR(120),
  fait             TEXT,
  note             TEXT,
  auteur_matricule VARCHAR(6),
  date_creation    TIMESTAMPTZ NOT NULL DEFAULT now()
) ;

-- ── 4c. ABSENCES ────────────────────────────────────────────────
CREATE TABLE absences (
  id            SERIAL PRIMARY KEY,
  matricule     VARCHAR(6),
  nom           VARCHAR(80),
  date_depart   VARCHAR(40),
  date_retour   VARCHAR(40),
  raison        VARCHAR(200),
  date_creation TIMESTAMPTZ NOT NULL DEFAULT now()
) ;

-- ── 5. JOURNAL ──────────────────────────────────────────────────
CREATE TABLE journal_comptes (
  id               SERIAL PRIMARY KEY,
  cible_matricule  VARCHAR(6),
  auteur_matricule VARCHAR(6),
  action           VARCHAR(20) NOT NULL,
  details          VARCHAR(255),
  date_action      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 5b. DOCUMENTS (bibliothèque de références) ──────────────────
CREATE TABLE documents (
  id               SERIAL PRIMARY KEY,
  titre            VARCHAR(160),
  categorie        VARCHAR(60),
  acces            VARCHAR(16) NOT NULL DEFAULT 'TOUS',
  contenu          TEXT,
  lien             TEXT,
  photos           JSONB DEFAULT '[]'::jsonb,
  auteur_matricule VARCHAR(6),
  auteur_nom       VARCHAR(80),
  date_doc         VARCHAR(40),
  date_creation    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 5c. OPÉRATIONS (registre du commandement) ───────────────────
CREATE TABLE operations (
  id               SERIAL PRIMARY KEY,
  code             VARCHAR(60),
  objectif         TEXT,
  responsable      VARCHAR(120),
  participants     VARCHAR(255),
  date_op          VARCHAR(40),
  statut           VARCHAR(12) NOT NULL DEFAULT 'PLANIFIÉE' CHECK (statut IN ('PLANIFIÉE','EN COURS','TERMINÉE')),
  compte_rendu     TEXT,
  plan             JSONB DEFAULT '{}'::jsonb,
  auteur_matricule VARCHAR(6),
  auteur_nom       VARCHAR(80),
  date_creation    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 5d. JOURNAL D'AUDIT (actions disciplinaires / opérationnelles) ──
-- Trace « qui a fait quoi » pour sanctions, blacklist et opérations.
-- Les actions sur les comptes sont déjà tracées dans journal_comptes.
CREATE TABLE audit_log (
  id               BIGSERIAL PRIMARY KEY,
  ts               TIMESTAMPTZ NOT NULL DEFAULT now(),
  acteur_matricule VARCHAR(10),
  acteur_nom       VARCHAR(120),
  action           VARCHAR(60) NOT NULL,
  cible            VARCHAR(120),
  details          TEXT
);
CREATE INDEX idx_audit_ts ON audit_log (ts DESC);

-- Notifications temps réel : annonces + sanctions (comme presence plus haut)
ALTER PUBLICATION supabase_realtime ADD TABLE annonces;
ALTER PUBLICATION supabase_realtime ADD TABLE sanctions;

-- ── 5e. STOCKAGE DES PHOTOS (Supabase Storage) ──────────────────
-- Les nouvelles photos (blacklist / annonces / saisies / documents /
-- contrats) sont uploadées comme fichiers au lieu d'être stockées en
-- base64. Bucket PUBLIC (lecture via URL publique ; écriture via la clé
-- service-role de l'API, qui ignore la RLS). Les anciennes photos base64
-- déjà en base continuent de s'afficher normalement.
INSERT INTO storage.buckets (id, name, public)
VALUES ('milicia-photos', 'milicia-photos', true)
ON CONFLICT (id) DO NOTHING;

-- ── 6. VUES ─────────────────────────────────────────────────────
CREATE VIEW v_effectifs AS
SELECT c.matricule, c.nom, g.nom AS grade, g.section, g.niveau, c.statut, c.actif
FROM comptes c JOIN grades g ON g.id = c.grade_id
ORDER BY g.niveau DESC, c.matricule;

CREATE VIEW v_comptes_perms AS
SELECT c.matricule, c.nom, c.statut, g.nom AS grade, g.section, g.niveau,
       g.peut_ajouter_effectif, g.peut_modifier_comptes, g.peut_voir_mdp, g.peut_gerer_grades,
       c.formateur, c.recruteur
FROM comptes c JOIN grades g ON g.id = c.grade_id
WHERE c.actif = true;

CREATE VIEW v_comptes_admin AS
SELECT c.matricule, c.nom, c.mot_de_passe, c.grade_id, g.nom AS grade, c.statut, c.actif, c.formateur,
       c.date_creation, c.date_maj, c.recruteur
FROM comptes c JOIN grades g ON g.id = c.grade_id
ORDER BY g.niveau DESC, c.matricule;

-- Exemples de formateurs (à ajuster ensuite via Gestion des comptes)
UPDATE comptes SET formateur = true WHERE matricule IN ('15','16','43');

-- ════════════════════════════════════════════════════════════════
--  IMPORTANT SÉCURITÉ (Supabase / RLS)
--  L'API serverless utilise la clé SERVICE ROLE (secrète, côté serveur)
--  qui ignore la RLS. NE JAMAIS mettre cette clé dans le navigateur.
--  Si tu actives la RLS sur ces tables, l'API service-role continue
--  de fonctionner ; la clé "anon" (publique) n'y aura aucun accès.
-- ════════════════════════════════════════════════════════════════
