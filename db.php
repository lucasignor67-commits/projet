<?php
// Connexion PDO partagée
function db() {
  static $pdo = null;
  if ($pdo) return $pdo;
  $c = require __DIR__ . '/config.php';
  $dsn = "mysql:host={$c['host']};dbname={$c['db']};charset={$c['charset']}";
  $pdo = new PDO($dsn, $c['user'], $c['pass'], [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
  ]);
  return $pdo;
}
