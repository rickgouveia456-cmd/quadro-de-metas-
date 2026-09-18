-- ================================================================
-- Seed inicial — Usuários e Obras padrão Porto Aruana
-- ================================================================

-- ── Usuários com senhas bcrypt (cost 12) ────────────────────
-- admin       → Admin@2026
-- engenheiro  → Eng@2026
-- mestre      → Mestre@2026
-- encarregado → Enc@2026
-- (hashes gerados com bcrypt cost 12, compatíveis com PHP password_verify)

INSERT INTO usuarios (perfil, label, icone, cor, senha_hash) VALUES
('admin',
 'Administrador',
 '👑',
 '#1d4ed8',
 '$2y$12$v9NkEg4k8JiyU.gmuU8A9ejlYUyhqCiOgjkQOAdHtQkn2iI/rjExG'
),
('engenheiro',
 'Engenheiro',
 '🏗',
 '#059669',
 '$2y$12$7Osl94SJshRwkSngwcEzd.MXdhDs54tyZxhs.o8shngEj2RSR94Fe'
),
('mestre',
 'Mestre de Obra',
 '🔨',
 '#d97706',
 '$2y$12$BbvTpNsJGS9nYvqnJSX9nOg/Gkr382jbHPAp/l62aYXnudikiuzHS'
),
('encarregado',
 'Encarregado',
 '🦺',
 '#7c3aed',
 '$2y$12$f/0H.dyVmwde0ePeKVi9O.1r5lIewCECheROro1jyxiPqYK.40qya'
)
ON DUPLICATE KEY UPDATE label = VALUES(label);

-- ── Obras padrão Porto Aruana ────────────────────────────────
INSERT INTO obras (codigo, nome, pavimentos, aptos_por_pav, ciclos, dias_por_meta, tipologia, sequencia)
VALUES
  ('TC', 'Porto Aruana — Torre C', 17, 4, 'A,B,C,D', 1, 'TC', 'ABCD'),
  ('TB', 'Porto Aruana — Torre B', 17, 4, 'A,B,C,D', 1, 'TB', 'ABCD'),
  ('TA', 'Porto Aruana — Torre A', 17, 4, 'A,B,C,D', 1, 'TA', 'ABCD')
ON DUPLICATE KEY UPDATE nome = VALUES(nome);
