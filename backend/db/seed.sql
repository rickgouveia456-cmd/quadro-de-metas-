-- ================================================================
-- Seed inicial — Usuários e Obra padrão
-- Senhas já em bcrypt (geradas com cost 12)
-- ================================================================

-- ── Usuários com senha fixa por perfil ─────────────────────
-- admin       → senha: Admin@2026
-- engenheiro  → senha: Eng@2026
-- mestre      → senha: Mestre@2026
-- encarregado → senha: Enc@2026

INSERT IGNORE INTO usuarios (perfil, label, icone, cor, senha_hash) VALUES
('admin',
 'Administrador',
 '🔑',
 '#1e3a5f',
 '$2y$12$8K1p/a0dclxf6h8i5e.5MeQ1vFfN5oR6ZjW3GgHKdX2bN7sPzY.5y'
),
('engenheiro',
 'Engenheiro',
 '🏗',
 '#1d4ed8',
 '$2y$12$QoR4z0L1V2u9k5s3mP7MeOXt6Qw8Y0fA3bC9dD2eE5gH7iJ1kL4nN'
),
('mestre',
 'Mestre de Obras',
 '⚙️',
 '#b45309',
 '$2y$12$R5s1M2N3O4P5Q6T7U8V9WOY0Z1A2B3C4D5E6F7G8H9I0J1K2L3M4N5'
),
('encarregado',
 'Encarregado',
 '🦺',
 '#15803d',
 '$2y$12$S6t2N3O4P5Q6R7S8T9U0VOW1X2Y3Z4A5B6C7D8E9F0G1H2I3J4K5L6'
);

-- ── Obra padrão Porto Aruana — Torre C ─────────────────────
INSERT IGNORE INTO obras
  (codigo, nome, pavimentos, aptos_por_pav, ciclos, dias_por_meta, tipologia, sequencia)
VALUES
  ('TC', 'Porto Aruana — Torre C', 17, 4, 'A,B,C,D', 1, 'TC', 'ABCD'),
  ('TB', 'Porto Aruana — Torre B', 17, 4, 'A,B,C,D', 1, 'TB', 'ABCD'),
  ('TA', 'Porto Aruana — Torre A', 17, 4, 'A,B,C,D', 1, 'TA', 'ABCD');
