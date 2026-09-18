-- ================================================================
-- Quadro de Metas — Schema MariaDB
-- ================================================================
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ── Usuários ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usuarios (
  id           INT UNSIGNED    AUTO_INCREMENT PRIMARY KEY,
  perfil       VARCHAR(30)     NOT NULL UNIQUE,   -- admin, engenheiro, mestre, encarregado
  label        VARCHAR(60)     NOT NULL,
  icone        VARCHAR(10)     NOT NULL DEFAULT '👤',
  cor          VARCHAR(10)     NOT NULL DEFAULT '#1e3a5f',
  senha_hash   VARCHAR(255)    NOT NULL,           -- bcrypt
  ativo        TINYINT(1)      NOT NULL DEFAULT 1,
  criado_em    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Obras ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS obras (
  id              INT UNSIGNED   AUTO_INCREMENT PRIMARY KEY,
  codigo          VARCHAR(20)    NOT NULL UNIQUE,  -- TC, TB, TA...
  nome            VARCHAR(120)   NOT NULL,
  pavimentos      SMALLINT       NOT NULL DEFAULT 17,
  aptos_por_pav   SMALLINT       NOT NULL DEFAULT 8,
  ciclos          VARCHAR(50)    NOT NULL DEFAULT 'A,B,C,D',
  dias_por_meta   SMALLINT       NOT NULL DEFAULT 1,
  tipologia       VARCHAR(30)    NOT NULL DEFAULT 'TC',
  data_inicio     DATE           DEFAULT NULL,
  data_termino    DATE           DEFAULT NULL,
  obra_anterior   VARCHAR(20)    DEFAULT NULL,     -- FK código (auto-ref)
  sequencia       VARCHAR(20)    NOT NULL DEFAULT 'ABCD',
  ativo           TINYINT(1)     NOT NULL DEFAULT 1,
  criado_em       DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em   DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Estado das Metas ────────────────────────────────────────
-- Uma linha por (obra × pacote × unidade)
CREATE TABLE IF NOT EXISTS estado_metas (
  id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  obra_codigo         VARCHAR(20)   NOT NULL,
  pacote_id           VARCHAR(60)   NOT NULL,   -- ex: GRA-VAO, ESQ-JANELA
  unidade_cod         VARCHAR(20)   NOT NULL,   -- ex: 1A, 3C, TC
  status              ENUM('nao-iniciada','em-andamento','concluida','atrasada','dente')
                                    NOT NULL DEFAULT 'nao-iniciada',
  data_planejada      DATE          DEFAULT NULL,
  data_reprogramada   DATE          DEFAULT NULL,
  data_real           DATE          DEFAULT NULL,
  programado_manual   TINYINT(1)    NOT NULL DEFAULT 0,
  observacao          TEXT          DEFAULT NULL,
  atualizado_por      VARCHAR(60)   DEFAULT NULL,
  atualizado_em       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  criado_em           DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_meta (obra_codigo, pacote_id, unidade_cod),
  INDEX idx_obra     (obra_codigo),
  INDEX idx_pacote   (pacote_id),
  INDEX idx_status   (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Estado FVS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS estado_fvs (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  obra_codigo     VARCHAR(20)   NOT NULL,
  pacote_id       VARCHAR(60)   NOT NULL,
  unidade_cod     VARCHAR(20)   NOT NULL,
  fvs_status      ENUM('nao-iniciada','concluida') NOT NULL DEFAULT 'nao-iniciada',
  data_planejada  DATE          DEFAULT NULL,
  liberado_por    VARCHAR(60)   DEFAULT NULL,
  liberado_em     DATETIME      DEFAULT NULL,
  criado_em       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_fvs (obra_codigo, pacote_id, unidade_cod),
  INDEX idx_fvs_obra (obra_codigo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Histórico de Alterações ─────────────────────────────────
CREATE TABLE IF NOT EXISTS historico (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  obra_codigo     VARCHAR(20)   NOT NULL,
  pacote_id       VARCHAR(60)   DEFAULT NULL,
  unidade_cod     VARCHAR(20)   DEFAULT NULL,
  acao            VARCHAR(60)   NOT NULL,         -- ex: status_alterado, reprogramacao
  valor_anterior  JSON          DEFAULT NULL,
  valor_novo      JSON          DEFAULT NULL,
  usuario         VARCHAR(60)   NOT NULL,
  criado_em       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_hist_obra (obra_codigo),
  INDEX idx_hist_data (criado_em)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Restrições ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS restricoes (
  id          INT UNSIGNED    AUTO_INCREMENT PRIMARY KEY,
  obra_codigo VARCHAR(20)     NOT NULL,
  tipo        VARCHAR(50)     NOT NULL,
  descricao   TEXT            NOT NULL,
  responsavel VARCHAR(100)    DEFAULT NULL,
  prazo       DATE            DEFAULT NULL,
  pacote_id   VARCHAR(60)     DEFAULT NULL,
  status      ENUM('aberta','em_andamento','removida') NOT NULL DEFAULT 'aberta',
  criado_por  VARCHAR(60)     NOT NULL,
  criado_em   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_rest_obra (obra_codigo),
  INDEX idx_rest_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Feriados Customizados ───────────────────────────────────
CREATE TABLE IF NOT EXISTS feriados_custom (
  id          INT UNSIGNED    AUTO_INCREMENT PRIMARY KEY,
  data        DATE            NOT NULL UNIQUE,
  descricao   VARCHAR(120)    DEFAULT NULL,
  criado_em   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Base Zero (snapshot imutável) ──────────────────────────
CREATE TABLE IF NOT EXISTS base_zero (
  id          INT UNSIGNED    AUTO_INCREMENT PRIMARY KEY,
  obra_codigo VARCHAR(20)     NOT NULL UNIQUE,
  snapshot    LONGTEXT        NOT NULL,           -- JSON do estado completo
  criado_em   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Sessões PHP ─────────────────────────────────────────────
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
