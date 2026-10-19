CREATE DATABASE IF NOT EXISTS flashrevision
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE flashrevision;

-- 1. USUÁRIOS
CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    senha_hash VARCHAR(255) NOT NULL,
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- 2. MATÉRIAS
CREATE TABLE IF NOT EXISTS materias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    descricao TEXT
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- 3. CONTEÚDOS
CREATE TABLE IF NOT EXISTS conteudos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    materia_id INT NOT NULL,
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    CONSTRAINT fk_conteudos_materia
        FOREIGN KEY (materia_id)
        REFERENCES materias(id)
        ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- 4. ASSUNTOS
CREATE TABLE IF NOT EXISTS assuntos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    conteudo_id INT NOT NULL,
    nome VARCHAR(150) NOT NULL,
    descricao TEXT,
    CONSTRAINT fk_assuntos_conteudo
        FOREIGN KEY (conteudo_id)
        REFERENCES conteudos(id)
        ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- 5. PERGUNTAS
CREATE TABLE IF NOT EXISTS perguntas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    assunto_id INT NOT NULL,
    texto TEXT NOT NULL,
    dificuldade VARCHAR(20) NOT NULL DEFAULT 'facil',
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_perguntas_assunto
        FOREIGN KEY (assunto_id)
        REFERENCES assuntos(id)
        ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- 6. ALTERNATIVAS
CREATE TABLE IF NOT EXISTS alternativas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pergunta_id INT NOT NULL,
    texto TEXT NOT NULL,
    correta BOOLEAN NOT NULL DEFAULT FALSE,
    ordem TINYINT UNSIGNED NOT NULL,
    CONSTRAINT fk_alternativas_pergunta
        FOREIGN KEY (pergunta_id)
        REFERENCES perguntas(id)
        ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- 7. HISTÓRICO DE RESPOSTAS DOS USUÁRIOS
CREATE TABLE IF NOT EXISTS respostas_usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    pergunta_id INT NOT NULL,
    alternativa_id INT NOT NULL,
    acertou BOOLEAN NOT NULL,
    respondido_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_respostas_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_respostas_pergunta
        FOREIGN KEY (pergunta_id)
        REFERENCES perguntas(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_respostas_alternativa
        FOREIGN KEY (alternativa_id)
        REFERENCES alternativas(id)
        ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- 8. FLASHCARDS
CREATE TABLE IF NOT EXISTS flashcards (
    id INT AUTO_INCREMENT PRIMARY KEY,
    assunto_id INT NOT NULL,
    frente VARCHAR(255) NOT NULL,
    verso VARCHAR(255) NOT NULL,
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_flashcards_assunto
        FOREIGN KEY (assunto_id)
        REFERENCES assuntos(id)
        ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-----------------

CREATE TABLE IF NOT EXISTS solicitacoes_amizade (
    id INT AUTO_INCREMENT PRIMARY KEY,
    remetente_id INT NOT NULL,
    destinatario_id INT NOT NULL,
    status ENUM('pendente', 'aceita', 'recusada')
        NOT NULL DEFAULT 'pendente',
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_convite_remetente
        FOREIGN KEY (remetente_id)
        REFERENCES usuarios(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_convite_destinatario
        FOREIGN KEY (destinatario_id)
        REFERENCES usuarios(id)
        ON DELETE CASCADE,

    CONSTRAINT uq_convite_direcao
        UNIQUE (remetente_id, destinatario_id),

    CONSTRAINT chk_convite_usuarios_diferentes
        CHECK (remetente_id <> destinatario_id)
);