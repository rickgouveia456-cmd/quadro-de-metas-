<?php
// ================================================================
// init_db.php — cria tabelas e seed embutidos (sem arquivos externos)
// ================================================================
declare(strict_types=1);
require_once __DIR__ . '/core/db.php';

const SCHEMA_SQL = <<<'SQL'
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS usuarios (
  id            INT UNSIGNED    AUTO_INCREMENT PRIMARY KEY,
  perfil        VARCHAR(30)     NOT NULL UNIQUE,
  label         VARCHAR(60)     NOT NULL,
  icone         VARCHAR(10)     NOT NULL DEFAULT '👤',
  cor           VARCHAR(10)     NOT NULL DEFAULT '#1e3a5f',
  senha_hash    VARCHAR(255)    NOT NULL,
  ativo         TINYINT(1)      NOT NULL DEFAULT 1,
  criado_em     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS obras (
  id            INT UNSIGNED   AUTO_INCREMENT PRIMARY KEY,
  codigo        VARCHAR(20)    NOT NULL UNIQUE,
  nome          VARCHAR(120)   NOT NULL,
  pavimentos    SMALLINT       NOT NULL DEFAULT 17,
  aptos_por_pav SMALLINT       NOT NULL DEFAULT 8,
  ciclos        VARCHAR(50)    NOT NULL DEFAULT 'A,B,C,D',
  dias_por_meta SMALLINT       NOT NULL DEFAULT 1,
  tipologia     VARCHAR(30)    NOT NULL DEFAULT 'TC',
  data_inicio   DATE           DEFAULT NULL,
  data_termino  DATE           DEFAULT NULL,
  obra_anterior VARCHAR(20)    DEFAULT NULL,
  sequencia     VARCHAR(20)    NOT NULL DEFAULT 'ABCD',
  ativo         TINYINT(1)     NOT NULL DEFAULT 1,
  criado_em     DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS estado_metas (
  id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  obra_codigo       VARCHAR(20)   NOT NULL,
  pacote_id         VARCHAR(60)   NOT NULL,
  unidade_cod       VARCHAR(20)   NOT NULL,
  status            ENUM('nao-iniciada','em-andamento','concluida','atrasada','dente') NOT NULL DEFAULT 'nao-iniciada',
  data_planejada    DATE          DEFAULT NULL,
  data_reprogramada DATE          DEFAULT NULL,
  data_real         DATE          DEFAULT NULL,
  programado_manual TINYINT(1)    NOT NULL DEFAULT 0,
  observacao        TEXT          DEFAULT NULL,
  atualizado_por    VARCHAR(60)   DEFAULT NULL,
  atualizado_em     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  criado_em         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_meta (obra_codigo, pacote_id, unidade_cod),
  INDEX idx_obra (obra_codigo),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS estado_fvs (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  obra_codigo   VARCHAR(20)   NOT NULL,
  pacote_id     VARCHAR(60)   NOT NULL,
  unidade_cod   VARCHAR(20)   NOT NULL,
  fvs_status    ENUM('nao-iniciada','concluida') NOT NULL DEFAULT 'nao-iniciada',
  data_planejada DATE         DEFAULT NULL,
  liberado_por  VARCHAR(60)   DEFAULT NULL,
  liberado_em   DATETIME      DEFAULT NULL,
  criado_em     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_fvs (obra_codigo, pacote_id, unidade_cod),
  INDEX idx_fvs_obra (obra_codigo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS historico (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  obra_codigo   VARCHAR(20)   NOT NULL,
  pacote_id     VARCHAR(60)   DEFAULT NULL,
  unidade_cod   VARCHAR(20)   DEFAULT NULL,
  acao          VARCHAR(60)   NOT NULL,
  valor_anterior JSON         DEFAULT NULL,
  valor_novo    JSON          DEFAULT NULL,
  usuario       VARCHAR(60)   NOT NULL,
  criado_em     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_hist_obra (obra_codigo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS restricoes (
  id            INT UNSIGNED    AUTO_INCREMENT PRIMARY KEY,
  obra_codigo   VARCHAR(20)     NOT NULL,
  tipo          VARCHAR(50)     NOT NULL,
  descricao     TEXT            NOT NULL,
  responsavel   VARCHAR(100)    DEFAULT NULL,
  prazo         DATE            DEFAULT NULL,
  pacote_id     VARCHAR(60)     DEFAULT NULL,
  status        ENUM('aberta','em_andamento','removida') NOT NULL DEFAULT 'aberta',
  criado_por    VARCHAR(60)     NOT NULL,
  criado_em     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_rest_obra (obra_codigo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS feriados_custom (
  id        INT UNSIGNED    AUTO_INCREMENT PRIMARY KEY,
  data      DATE            NOT NULL UNIQUE,
  descricao VARCHAR(120)    DEFAULT NULL,
  criado_em DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS base_zero (
  id          INT UNSIGNED    AUTO_INCREMENT PRIMARY KEY,
  obra_codigo VARCHAR(20)     NOT NULL UNIQUE,
  snapshot    LONGTEXT        NOT NULL,
  criado_em   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sessoes (
  token       VARCHAR(64)     PRIMARY KEY,
  usuario_id  INT UNSIGNED    NOT NULL,
  perfil      VARCHAR(30)     NOT NULL,
  criado_em   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expira_em   DATETIME        NOT NULL,
  INDEX idx_expira (expira_em),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;
SQL;

const SEED_SQL = <<<'SQL'
INSERT INTO usuarios (perfil, label, icone, cor, senha_hash) VALUES
('admin','Administrador','👑','#1d4ed8','$2y$12$v9NkEg4k8JiyU.gmuU8A9ejlYUyhqCiOgjkQOAdHtQkn2iI/rjExG'),
('engenheiro','Engenheiro','🏗','#059669','$2y$12$7Osl94SJshRwkSngwcEzd.MXdhDs54tyZxhs.o8shngEj2RSR94Fe'),
('mestre','Mestre de Obra','🔨','#d97706','$2y$12$BbvTpNsJGS9nYvqnJSX9nOg/Gkr382jbHPAp/l62aYXnudikiuzHS'),
('encarregado','Encarregado','🦺','#7c3aed','$2y$12$f/0H.dyVmwde0ePeKVi9O.1r5lIewCECheROro1jyxiPqYK.40qya')
ON DUPLICATE KEY UPDATE label=VALUES(label);

INSERT INTO obras (codigo,nome,pavimentos,aptos_por_pav,ciclos,dias_por_meta,tipologia,sequencia) VALUES
('TC','Porto Aruana — Torre C',17,4,'A,B,C,D',1,'TC','ABCD'),
('TB','Porto Aruana — Torre B',17,4,'A,B,C,D',1,'TB','ABCD'),
('TA','Porto Aruana — Torre A',17,4,'A,B,C,D',1,'TA','ABCD')
ON DUPLICATE KEY UPDATE nome=VALUES(nome);
SQL;

function initDb(): array {
    $db = getDB();

    // Verifica se ja existe
    $existe = $db->query("SHOW TABLES LIKE 'usuarios'")->fetch();
    if ($existe) {
        return ['ok' => true, 'msg' => 'Banco ja inicializado.'];
    }

    try {
        // Executa cada statement do schema separadamente
        foreach (explode(';', SCHEMA_SQL) as $stmt) {
            $stmt = trim($stmt);
            if ($stmt !== '') $db->exec($stmt . ';');
        }

        // Executa cada statement do seed
        foreach (explode(';', SEED_SQL) as $stmt) {
            $stmt = trim($stmt);
            if ($stmt !== '') $db->exec($stmt . ';');
        }

        return ['ok' => true, 'msg' => 'Banco inicializado com sucesso!'];
    } catch (\Throwable $e) {
        return ['ok' => false, 'msg' => 'Erro: ' . $e->getMessage()];
    }
}

function autoInit(): void {
    static $done = false;
    if ($done) return;
    $done = true;
    try {
        $db    = getDB();
        $existe = $db->query("SHOW TABLES LIKE 'usuarios'")->fetch();
        if (!$existe) initDb();
    } catch (\Throwable) {}
}
