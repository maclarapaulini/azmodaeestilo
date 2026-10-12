CREATE TABLE usuarios (
    id_usuario      SERIAL PRIMARY KEY,
    nome            VARCHAR(150) NOT NULL,
    email           VARCHAR(150) NOT NULL UNIQUE,
    senha_hash      VARCHAR(255) NOT NULL,
    tipo_usuario    VARCHAR(20)  NOT NULL DEFAULT 'cliente',
    data_cadastro   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_tipo_usuario CHECK (tipo_usuario IN ('cliente', 'administradora'))
);

CREATE TABLE categorias_pecas (
    id_categoria    SERIAL PRIMARY KEY,
    nome_categoria  VARCHAR(80) NOT NULL UNIQUE,
    descricao       VARCHAR(255)
);

CREATE TABLE pecas_roupa (
    id_peca         SERIAL PRIMARY KEY,
    id_cliente      INTEGER NOT NULL,
    id_categoria    INTEGER NOT NULL,
    nome_peca       VARCHAR(150) NOT NULL,
    tamanho         VARCHAR(20),
    cor             VARCHAR(50),
    marca           VARCHAR(80),
    descricao       VARCHAR(500),
    data_cadastro   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_pecas_cliente
        FOREIGN KEY (id_cliente) REFERENCES usuarios (id_usuario)
        ON DELETE CASCADE,

    CONSTRAINT fk_pecas_categoria
        FOREIGN KEY (id_categoria) REFERENCES categorias_pecas (id_categoria)
        ON DELETE RESTRICT
);

CREATE TABLE peca_imagens (
    id_imagem       SERIAL PRIMARY KEY,
    id_peca         INTEGER NOT NULL,
    url_imagem      VARCHAR(500) NOT NULL,
    data_upload     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_imagens_peca
        FOREIGN KEY (id_peca) REFERENCES pecas_roupa (id_peca)
        ON DELETE CASCADE
);

CREATE TABLE looks (
    id_look             SERIAL PRIMARY KEY,
    id_administradora   INTEGER NOT NULL,
    id_cliente          INTEGER NOT NULL,
    nome_look           VARCHAR(150) NOT NULL,
    descricao           VARCHAR(500),
    data_criacao        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_looks_administradora
        FOREIGN KEY (id_administradora) REFERENCES usuarios (id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT fk_looks_cliente
        FOREIGN KEY (id_cliente) REFERENCES usuarios (id_usuario)
        ON DELETE CASCADE
);

CREATE TABLE look_pecas (
    id_look     INTEGER NOT NULL,
    id_peca     INTEGER NOT NULL,

    PRIMARY KEY (id_look, id_peca),

    CONSTRAINT fk_lookpecas_look
        FOREIGN KEY (id_look) REFERENCES looks (id_look)
        ON DELETE CASCADE,

    CONSTRAINT fk_lookpecas_peca
        FOREIGN KEY (id_peca) REFERENCES pecas_roupa (id_peca)
        ON DELETE CASCADE
);

CREATE TABLE blog_posts (
    id_post             SERIAL PRIMARY KEY,
    id_administradora   INTEGER NOT NULL,
    titulo              VARCHAR(200) NOT NULL,
    conteudo            TEXT NOT NULL,
    data_publicacao     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_blogposts_administradora
        FOREIGN KEY (id_administradora) REFERENCES usuarios (id_usuario)
        ON DELETE CASCADE
);

CREATE TABLE blog_anexos (
    id_anexo        SERIAL PRIMARY KEY,
    id_post         INTEGER NOT NULL,
    url_arquivo     VARCHAR(500) NOT NULL,
    tipo_arquivo    VARCHAR(50),
    data_upload     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_anexos_post
        FOREIGN KEY (id_post) REFERENCES blog_posts (id_post)
        ON DELETE CASCADE
);

CREATE INDEX idx_pecas_cliente ON pecas_roupa (id_cliente);
CREATE INDEX idx_pecas_categoria ON pecas_roupa (id_categoria);
CREATE INDEX idx_imagens_peca ON peca_imagens (id_peca);
CREATE INDEX idx_looks_cliente ON looks (id_cliente);
CREATE INDEX idx_looks_administradora ON looks (id_administradora);
CREATE INDEX idx_blogposts_administradora ON blog_posts (id_administradora);
CREATE INDEX idx_anexos_post ON blog_anexos (id_post);