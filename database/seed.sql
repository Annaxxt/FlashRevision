USE flashrevision;

INSERT INTO materias (nome, descricao)
VALUES
    ('Cyber', 'Cibersegurança e segurança da informação.'),
    ('Inglês', 'Vocabulário e tradução da língua inglesa.');


-- CONTEÚDO DE CYBER
INSERT INTO conteudos (materia_id, nome, descricao)
VALUES (
    1,
    'Fundamentos de Cibersegurança',
    'Conceitos básicos de cibersegurança e segurança da informação.'
);

-- CONTEÚDO DE CYBER
INSERT INTO conteudos (materia_id, nome, descricao)
SELECT
    id,
    'Fundamentos de Cibersegurança',
    'Conceitos básicos de cibersegurança e segurança da informação.'
FROM materias
WHERE nome = 'Cyber'
AND NOT EXISTS (
    SELECT 1
    FROM conteudos
    WHERE nome = 'Fundamentos de Cibersegurança'
);

-- ASSUNTOS DE FUNDAMENTOS DE CIBERSEGURANÇA

INSERT INTO assuntos (conteudo_id, nome, descricao)
SELECT
    c.id,
    'Conceitos básicos de cibersegurança',
    'Introdução à proteção de sistemas, redes e informações.'
FROM conteudos c
WHERE c.nome = 'Fundamentos de Cibersegurança'
AND NOT EXISTS (
    SELECT 1
    FROM assuntos a
    WHERE a.conteudo_id = c.id
      AND a.nome = 'Conceitos básicos de cibersegurança'
);

INSERT INTO assuntos (conteudo_id, nome, descricao)
SELECT
    c.id,
    'Segurança da informação',
    'Princípios de confidencialidade, integridade e disponibilidade.'
FROM conteudos c
WHERE c.nome = 'Fundamentos de Cibersegurança'
AND NOT EXISTS (
    SELECT 1
    FROM assuntos a
    WHERE a.conteudo_id = c.id
      AND a.nome = 'Segurança da informação'
);

INSERT INTO assuntos (conteudo_id, nome, descricao)
SELECT
    c.id,
    'Ameaças e vulnerabilidades',
    'Conceitos de ameaças, vulnerabilidades e riscos digitais.'
FROM conteudos c
WHERE c.nome = 'Fundamentos de Cibersegurança'
AND NOT EXISTS (
    SELECT 1
    FROM assuntos a
    WHERE a.conteudo_id = c.id
      AND a.nome = 'Ameaças e vulnerabilidades'
);


-- PERGUNTAS: CONCEITOS BÁSICOS DE CIBERSEGURANÇA

INSERT INTO perguntas (assunto_id, texto, dificuldade)
SELECT
    1,
    'Qual é o principal objetivo da cibersegurança?',
    'facil'
WHERE NOT EXISTS (
    SELECT 1 FROM perguntas
    WHERE assunto_id = 1
      AND texto = 'Qual é o principal objetivo da cibersegurança?'
);

SET @pergunta1 = (
    SELECT id FROM perguntas
    WHERE assunto_id = 1
      AND texto = 'Qual é o principal objetivo da cibersegurança?'
    LIMIT 1
);

INSERT INTO alternativas (pergunta_id, texto, correta, ordem)
SELECT @pergunta1, dados.texto, dados.correta, dados.ordem
FROM (
    SELECT 'Proteger sistemas, redes e informações contra ameaças digitais.' AS texto, TRUE AS correta, 1 AS ordem
    UNION ALL SELECT 'Aumentar a velocidade da internet.', FALSE, 2
    UNION ALL SELECT 'Criar programas de entretenimento.', FALSE, 3
    UNION ALL SELECT 'Eliminar a necessidade de senhas.', FALSE, 4
) AS dados
WHERE @pergunta1 IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM alternativas
      WHERE pergunta_id = @pergunta1
  );


USE flashrevision;

-- =========================================
-- PERGUNTA 2: CONCEITOS BÁSICOS
-- =========================================

INSERT INTO perguntas (assunto_id, texto, dificuldade)
SELECT a.id, 'O que significa a sigla CIA na segurança da informação?', 'facil'
FROM assuntos a
WHERE a.nome = 'Conceitos básicos de cibersegurança'
AND NOT EXISTS (
    SELECT 1 FROM perguntas p
    WHERE p.assunto_id = a.id
    AND p.texto = 'O que significa a sigla CIA na segurança da informação?'
);

SET @p = (
    SELECT p.id FROM perguntas p
    JOIN assuntos a ON a.id = p.assunto_id
    WHERE a.nome = 'Conceitos básicos de cibersegurança'
    AND p.texto = 'O que significa a sigla CIA na segurança da informação?'
    LIMIT 1
);

INSERT INTO alternativas (pergunta_id, texto, correta, ordem)
SELECT @p, d.texto, d.correta, d.ordem
FROM (
    SELECT 'Confidencialidade, integridade e disponibilidade.' AS texto, TRUE AS correta, 1 AS ordem
    UNION ALL SELECT 'Controle, internet e acesso.', FALSE, 2
    UNION ALL SELECT 'Conexão, identificação e autenticação.', FALSE, 3
    UNION ALL SELECT 'Computadores, informações e aplicativos.', FALSE, 4
) d
WHERE @p IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM alternativas WHERE pergunta_id = @p
);


-- =========================================
-- PERGUNTA 3: SEGURANÇA DA INFORMAÇÃO
-- =========================================

INSERT INTO perguntas (assunto_id, texto, dificuldade)
SELECT a.id, 'Qual princípio garante que uma informação não seja alterada indevidamente?', 'facil'
FROM assuntos a
WHERE a.nome = 'Segurança da informação'
AND NOT EXISTS (
    SELECT 1 FROM perguntas p
    WHERE p.assunto_id = a.id
    AND p.texto = 'Qual princípio garante que uma informação não seja alterada indevidamente?'
);

SET @p = (
    SELECT p.id FROM perguntas p
    JOIN assuntos a ON a.id = p.assunto_id
    WHERE a.nome = 'Segurança da informação'
    AND p.texto = 'Qual princípio garante que uma informação não seja alterada indevidamente?'
    LIMIT 1
);

INSERT INTO alternativas (pergunta_id, texto, correta, ordem)
SELECT @p, d.texto, d.correta, d.ordem
FROM (
    SELECT 'Integridade.' AS texto, TRUE AS correta, 1 AS ordem
    UNION ALL SELECT 'Disponibilidade.', FALSE, 2
    UNION ALL SELECT 'Confidencialidade.', FALSE, 3
    UNION ALL SELECT 'Portabilidade.', FALSE, 4
) d
WHERE @p IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM alternativas WHERE pergunta_id = @p
);


-- =========================================
-- PERGUNTA 4: SEGURANÇA DA INFORMAÇÃO
-- =========================================

INSERT INTO perguntas (assunto_id, texto, dificuldade)
SELECT a.id, 'O que significa confidencialidade?', 'facil'
FROM assuntos a
WHERE a.nome = 'Segurança da informação'
AND NOT EXISTS (
    SELECT 1 FROM perguntas p
    WHERE p.assunto_id = a.id
    AND p.texto = 'O que significa confidencialidade?'
);

SET @p = (
    SELECT p.id FROM perguntas p
    JOIN assuntos a ON a.id = p.assunto_id
    WHERE a.nome = 'Segurança da informação'
    AND p.texto = 'O que significa confidencialidade?'
    LIMIT 1
);

INSERT INTO alternativas (pergunta_id, texto, correta, ordem)
SELECT @p, d.texto, d.correta, d.ordem
FROM (
    SELECT 'Garantir que somente pessoas autorizadas acessem a informação.' AS texto, TRUE AS correta, 1 AS ordem
    UNION ALL SELECT 'Garantir que os sistemas nunca sejam desligados.', FALSE, 2
    UNION ALL SELECT 'Permitir que qualquer pessoa consulte os dados.', FALSE, 3
    UNION ALL SELECT 'Impedir a criação de cópias de segurança.', FALSE, 4
) d
WHERE @p IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM alternativas WHERE pergunta_id = @p
);


-- =========================================
-- PERGUNTA 5: AMEAÇAS E VULNERABILIDADES
-- =========================================

INSERT INTO perguntas (assunto_id, texto, dificuldade)
SELECT a.id, 'O que é uma vulnerabilidade em um sistema?', 'facil'
FROM assuntos a
WHERE a.nome = 'Ameaças e vulnerabilidades'
AND NOT EXISTS (
    SELECT 1 FROM perguntas p
    WHERE p.assunto_id = a.id
    AND p.texto = 'O que é uma vulnerabilidade em um sistema?'
);

SET @p = (
    SELECT p.id FROM perguntas p
    JOIN assuntos a ON a.id = p.assunto_id
    WHERE a.nome = 'Ameaças e vulnerabilidades'
    AND p.texto = 'O que é uma vulnerabilidade em um sistema?'
    LIMIT 1
);

INSERT INTO alternativas (pergunta_id, texto, correta, ordem)
SELECT @p, d.texto, d.correta, d.ordem
FROM (
    SELECT 'Uma falha que pode ser explorada para comprometer a segurança.' AS texto, TRUE AS correta, 1 AS ordem
    UNION ALL SELECT 'Um programa usado exclusivamente para criar senhas.', FALSE, 2
    UNION ALL SELECT 'Uma atualização que sempre corrige falhas.', FALSE, 3
    UNION ALL SELECT 'Um tipo de cópia de segurança.', FALSE, 4
) d
WHERE @p IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM alternativas WHERE pergunta_id = @p
);


-- =========================================
-- PERGUNTA 6: AMEAÇAS E VULNERABILIDADES
-- =========================================

INSERT INTO perguntas (assunto_id, texto, dificuldade)
SELECT a.id, 'Qual situação é um exemplo de ameaça à segurança digital?', 'facil'
FROM assuntos a
WHERE a.nome = 'Ameaças e vulnerabilidades'
AND NOT EXISTS (
    SELECT 1 FROM perguntas p
    WHERE p.assunto_id = a.id
    AND p.texto = 'Qual situação é um exemplo de ameaça à segurança digital?'
);

SET @p = (
    SELECT p.id FROM perguntas p
    JOIN assuntos a ON a.id = p.assunto_id
    WHERE a.nome = 'Ameaças e vulnerabilidades'
    AND p.texto = 'Qual situação é um exemplo de ameaça à segurança digital?'
    LIMIT 1
);

INSERT INTO alternativas (pergunta_id, texto, correta, ordem)
SELECT @p, d.texto, d.correta, d.ordem
FROM (
    SELECT 'Um criminoso tentando roubar credenciais por phishing.' AS texto, TRUE AS correta, 1 AS ordem
    UNION ALL SELECT 'Um usuário criando uma senha forte.', FALSE, 2
    UNION ALL SELECT 'Uma atualização de segurança instalada corretamente.', FALSE, 3
    UNION ALL SELECT 'Uma cópia de segurança armazenada com proteção.', FALSE, 4
) d
WHERE @p IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM alternativas WHERE pergunta_id = @p
);
