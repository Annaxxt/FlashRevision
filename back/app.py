from functools import wraps
import os
from flask import Flask, jsonify, request, session, send_from_directory
from werkzeug.security import generate_password_hash, check_password_hash
from config import Config
from database import conectar_banco


# CONFIGURAÇÃO DO FLASK
app = Flask(__name__)
app.config.from_object(Config)

app.config["SECRET_KEY"] = (
    os.getenv("SECRET_KEY") or app.config.get("SECRET_KEY")
)

if not app.config["SECRET_KEY"]:
    raise RuntimeError("Configure SECRET_KEY no arquivo .env.")

app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"

FRONT_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "front")
)

# FUNÇÕES AUXILIARES

def responder_erro(mensagem, status=400):
    return jsonify({"erro": mensagem}), status


def usuario_logado(funcao):
    @wraps(funcao)
    def wrapper(*args, **kwargs):
        if "usuario_id" not in session:
            return responder_erro("Faça login para continuar.", 401)
        return funcao(*args, **kwargs)
    return wrapper


def fechar_recursos(cursor, conexao):
    if cursor is not None:
        cursor.close()

    if conexao is not None and conexao.is_connected():
        conexao.close()


def id_inteiro_positivo(valor):
    return (
        isinstance(valor, int)
        and not isinstance(valor, bool)
        and valor > 0
    )


# SITE E TESTE DO BANCO
@app.route("/", methods=["GET"])
def inicio():
    return send_from_directory(FRONT_DIR, "index.html")


@app.route("/assets/<path:arquivo>", methods=["GET"])
def arquivos_frontend(arquivo):
    return send_from_directory(FRONT_DIR, arquivo)


@app.route("/teste-banco", methods=["GET"])
def teste_banco():
    conexao = None

    try:
        conexao = conectar_banco()

        if conexao.is_connected():
            return jsonify({
                "mensagem": "Conexão com MySQL funcionando!"
            })

        return responder_erro("Não foi possível conectar ao MySQL.", 500)

    except Exception:
        app.logger.exception("Erro ao testar conexão com MySQL")
        return responder_erro("Erro ao conectar ao banco de dados.", 500)

    finally:
        if conexao is not None and conexao.is_connected():
            conexao.close()


# CADASTRO
@app.route("/api/cadastro", methods=["POST"])
def cadastrar_usuario():
    dados = request.get_json(silent=True) or {}

    nome = dados.get("nome", "")
    email = dados.get("email", "")
    senha = dados.get("senha", "")

    if not all(isinstance(v, str) for v in (nome, email, senha)):
        return responder_erro("Dados inválidos.")

    nome = nome.strip()
    email = email.strip().lower()

    if not nome or not email or not senha:
        return responder_erro("Preencha nome, e-mail e senha.")

    if len(nome) > 100:
        return responder_erro("O nome deve ter até 100 caracteres.")

    if len(email) > 255 or "@" not in email:
        return responder_erro("Informe um e-mail válido.")

    if len(senha) < 8:
        return responder_erro("A senha deve ter pelo menos 8 caracteres.")

    conexao = None
    cursor = None

    try:
        conexao = conectar_banco()
        cursor = conexao.cursor()

        cursor.execute(
            """
            INSERT INTO usuarios (nome, email, senha_hash)
            VALUES (%s, %s, %s)
            """,
            (nome, email, generate_password_hash(senha))
        )

        conexao.commit()
        return jsonify({
            "mensagem": "Cadastro realizado com sucesso!"
        }), 201

    except Exception as erro:
        if conexao is not None:
            conexao.rollback()

        if getattr(erro, "errno", None) == 1062:
            detalhe = str(erro).lower()

            if "uq_usuarios_nome" in detalhe or "nome" in detalhe:
                return responder_erro(
                    "Este nick já está em uso. Escolha outro.",
                    409
                )

            return responder_erro(
                "Este e-mail já está cadastrado.",
                409
            )

        app.logger.exception("Erro ao cadastrar usuário")
        return responder_erro(
            "Não foi possível concluir o cadastro.",
            500
        )

    finally:
        fechar_recursos(cursor, conexao)


# LOGIN
@app.route("/api/login", methods=["POST"])
def login():
    dados = request.get_json(silent=True) or {}

    email = dados.get("email", "")
    senha = dados.get("senha", "")

    if not isinstance(email, str) or not isinstance(senha, str):
        return responder_erro("Dados inválidos.")

    email = email.strip().lower()

    if not email or not senha:
        return responder_erro("Informe e-mail e senha.")

    conexao = None
    cursor = None

    try:
        conexao = conectar_banco()
        cursor = conexao.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT id, nome, email, senha_hash
            FROM usuarios
            WHERE email = %s
            """,
            (email,)
        )

        usuario = cursor.fetchone()

        if not usuario or not check_password_hash(
            usuario["senha_hash"], senha
        ):
            return responder_erro("E-mail ou senha incorretos.", 401)

        session.clear()
        session["usuario_id"] = usuario["id"]
        session["usuario_nome"] = usuario["nome"]

        return jsonify({
            "mensagem": "Login realizado com sucesso!",
            "usuario": {
                "id": usuario["id"],
                "nome": usuario["nome"],
                "email": usuario["email"]
            }
        })

    except Exception:
        app.logger.exception("Erro ao realizar login")
        return responder_erro("Não foi possível realizar o login.", 500)

    finally:
        fechar_recursos(cursor, conexao)


# LOGOUT
@app.route("/api/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"mensagem": "Logout realizado com sucesso!"})



# PERFIL
@app.route("/api/perfil", methods=["GET"])
@usuario_logado
def perfil():
    conexao = None
    cursor = None

    try:
        conexao = conectar_banco()
        cursor = conexao.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT id, nome, email, criado_em
            FROM usuarios
            WHERE id = %s
            """,
            (session["usuario_id"],)
        )

        usuario = cursor.fetchone()

        if not usuario:
            session.clear()
            return responder_erro("Usuário não encontrado.", 404)

        if usuario["criado_em"]:
            usuario["criado_em"] = usuario["criado_em"].isoformat()

        return jsonify({"usuario": usuario})

    except Exception:
        app.logger.exception("Erro ao consultar perfil")
        return responder_erro("Não foi possível carregar o perfil.", 500)

    finally:
        fechar_recursos(cursor, conexao)



# LISTAR MATÉRIAS
@app.route("/api/materias", methods=["GET"])
@usuario_logado
def listar_materias():
    conexao = None
    cursor = None

    try:
        conexao = conectar_banco()
        cursor = conexao.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT id, nome, descricao
            FROM materias
            ORDER BY id
            """
        )

        return jsonify({"materias": cursor.fetchall()})

    except Exception:
        app.logger.exception("Erro ao listar matérias")
        return responder_erro("Não foi possível carregar as matérias.", 500)

    finally:
        fechar_recursos(cursor, conexao)


# LISTAR ASSUNTOS DE UMA MATÉRIA
@app.route("/api/assuntos", methods=["GET"])
@usuario_logado
def listar_assuntos():
    materia_id = request.args.get("materia_id", type=int)

    if request.args.get("materia_id") and materia_id is None:
        return responder_erro("O ID da matéria é inválido.")

    conexao = None
    cursor = None

    try:
        conexao = conectar_banco()
        cursor = conexao.cursor(dictionary=True)

        sql = """
            SELECT
                a.id,
                a.nome,
                a.descricao,
                a.conteudo_id,
                c.nome AS conteudo_nome,
                m.id AS materia_id,
                m.nome AS materia_nome
            FROM assuntos a
            JOIN conteudos c ON c.id = a.conteudo_id
            JOIN materias m ON m.id = c.materia_id
        """
        parametros = []

        if materia_id is not None:
            sql += " WHERE m.id = %s"
            parametros.append(materia_id)

        sql += " ORDER BY m.id, c.id, a.id"

        cursor.execute(sql, tuple(parametros))
        return jsonify({"assuntos": cursor.fetchall()})

    except Exception:
        app.logger.exception("Erro ao listar assuntos")
        return responder_erro("Não foi possível carregar os assuntos.", 500)

    finally:
        fechar_recursos(cursor, conexao)


# LISTAR PERGUNTAS E ALTERNATIVAS
@app.route("/api/perguntas", methods=["GET"])
@usuario_logado
def listar_perguntas():
    assunto_id = request.args.get("assunto_id", type=int)
    materia_id = request.args.get("materia_id", type=int)

    if request.args.get("assunto_id") and assunto_id is None:
        return responder_erro("O ID do assunto é inválido.")

    if request.args.get("materia_id") and materia_id is None:
        return responder_erro("O ID da matéria é inválido.")

    conexao = None
    cursor = None

    try:
        conexao = conectar_banco()
        cursor = conexao.cursor(dictionary=True)

        sql = """
            SELECT
                p.id AS pergunta_id,
                p.texto AS pergunta,
                p.dificuldade,
                a.id AS assunto_id,
                a.nome AS assunto_nome,
                m.id AS materia_id,
                m.nome AS materia_nome,
                alt.id AS alternativa_id,
                alt.texto AS alternativa,
                alt.ordem
            FROM perguntas p
            JOIN assuntos a ON a.id = p.assunto_id
            JOIN conteudos c ON c.id = a.conteudo_id
            JOIN materias m ON m.id = c.materia_id
            JOIN alternativas alt ON alt.pergunta_id = p.id
            WHERE 1 = 1
        """
        parametros = []

        if assunto_id is not None:
            sql += " AND a.id = %s"
            parametros.append(assunto_id)

        if materia_id is not None:
            sql += " AND m.id = %s"
            parametros.append(materia_id)

        sql += " ORDER BY p.id, alt.ordem"
        cursor.execute(sql, tuple(parametros))
        linhas = cursor.fetchall()

        perguntas = {}

        for linha in linhas:
            pergunta_id = linha["pergunta_id"]

            if pergunta_id not in perguntas:
                perguntas[pergunta_id] = {
                    "id": pergunta_id,
                    "texto": linha["pergunta"],
                    "pergunta": linha["pergunta"],
                    "dificuldade": linha["dificuldade"],
                    "assunto_id": linha["assunto_id"],
                    "assunto_nome": linha["assunto_nome"],
                    "materia_id": linha["materia_id"],
                    "materia_nome": linha["materia_nome"],
                    "alternativas": []
                }

            perguntas[pergunta_id]["alternativas"].append({
                "id": linha["alternativa_id"],
                "texto": linha["alternativa"],
                "ordem": linha["ordem"]
            })

        return jsonify({"perguntas": list(perguntas.values())})

    except Exception:
        app.logger.exception("Erro ao listar perguntas")
        return responder_erro("Não foi possível carregar as perguntas.", 500)

    finally:
        fechar_recursos(cursor, conexao)


# RESPONDER UMA PERGUNTA
@app.route("/api/responder", methods=["POST"])
@usuario_logado
def responder_pergunta():
    dados = request.get_json(silent=True) or {}

    pergunta_id = dados.get("pergunta_id")
    alternativa_id = dados.get("alternativa_id")

    if (
        not id_inteiro_positivo(pergunta_id)
        or not id_inteiro_positivo(alternativa_id)
    ):
        return responder_erro(
            "Informe os IDs da pergunta e da alternativa."
        )

    conexao = None
    cursor = None

    try:
        conexao = conectar_banco()
        cursor = conexao.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT id, pergunta_id, correta
            FROM alternativas
            WHERE id = %s AND pergunta_id = %s
            """,
            (alternativa_id, pergunta_id)
        )

        alternativa = cursor.fetchone()

        if not alternativa:
            return responder_erro(
                "Essa alternativa não pertence à pergunta informada."
            )

        acertou = bool(alternativa["correta"])

        cursor.execute(
            """
            INSERT INTO respostas_usuarios
                (usuario_id, pergunta_id, alternativa_id, acertou)
            VALUES (%s, %s, %s, %s)
            """,
            (
                session["usuario_id"],
                pergunta_id,
                alternativa_id,
                acertou
            )
        )

        conexao.commit()

        return jsonify({
            "pergunta_id": pergunta_id,
            "acertou": acertou,
            "mensagem": (
                "Resposta correta!" if acertou
                else "Resposta incorreta."
            )
        })

    except Exception:
        if conexao is not None:
            conexao.rollback()

        app.logger.exception("Erro ao registrar resposta")
        return responder_erro("Não foi possível registrar a resposta.", 500)

    finally:
        fechar_recursos(cursor, conexao)


# MÉTRICAS DO USUÁRIO
@app.route("/api/metricas", methods=["GET"])
@usuario_logado
def metricas():
    conexao = None
    cursor = None

    try:
        conexao = conectar_banco()
        cursor = conexao.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT
                COUNT(*) AS total_respondidas,
                COALESCE(SUM(acertou = TRUE), 0) AS acertos,
                COALESCE(SUM(acertou = FALSE), 0) AS erros
            FROM respostas_usuarios
            WHERE usuario_id = %s
            """,
            (session["usuario_id"],)
        )

        resultado = cursor.fetchone()
        total = resultado["total_respondidas"]
        acertos = int(resultado["acertos"])
        erros = int(resultado["erros"])

        percentual = round((acertos / total) * 100, 2) if total else 0

        cursor.execute(
            """
            SELECT COUNT(DISTINCT pergunta_id) AS total
            FROM respostas_usuarios
            WHERE usuario_id = %s AND acertou = FALSE
            """,
            (session["usuario_id"],)
        )

        total_com_erros = cursor.fetchone()["total"]

        return jsonify({
            "total_respondidas": total,
            "acertos": acertos,
            "erros": erros,
            "percentual_acerto": percentual,
            "perguntas_para_revisar": total_com_erros
        })

    except Exception:
        app.logger.exception("Erro ao calcular métricas")
        return responder_erro("Não foi possível calcular as métricas.", 500)

    finally:
        fechar_recursos(cursor, conexao)


# REVISAR PERGUNTAS ERRADAS
@app.route("/api/revisao", methods=["GET"])
@usuario_logado
def revisar_erros():
    conexao = None
    cursor = None

    try:
        conexao = conectar_banco()
        cursor = conexao.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT
                p.id AS pergunta_id,
                p.id AS id,
                p.texto AS pergunta,
                p.texto AS texto,
                MAX(r.respondido_em) AS ultima_resposta_errada
            FROM respostas_usuarios r
            JOIN perguntas p ON p.id = r.pergunta_id
            WHERE r.usuario_id = %s AND r.acertou = FALSE
            GROUP BY p.id, p.texto
            ORDER BY ultima_resposta_errada DESC
            """,
            (session["usuario_id"],)
        )

        perguntas = cursor.fetchall()

        for pergunta in perguntas:
            cursor.execute(
                """
                SELECT id, texto, ordem
                FROM alternativas
                WHERE pergunta_id = %s
                ORDER BY ordem
                """,
                (pergunta["pergunta_id"],)
            )
            pergunta["alternativas"] = cursor.fetchall()

            if pergunta["ultima_resposta_errada"]:
                pergunta["ultima_resposta_errada"] = (
                    pergunta["ultima_resposta_errada"].isoformat()
                )

        return jsonify({"perguntas": perguntas})

    except Exception:
        app.logger.exception("Erro ao carregar revisão")
        return responder_erro("Não foi possível carregar a revisão.", 500)

    finally:
        fechar_recursos(cursor, conexao)

# FLASHCARDS
@app.route("/api/flashcards", methods=["GET"])
@usuario_logado
def listar_flashcards():
    assunto_id = request.args.get("assunto_id", type=int)
    materia_id = request.args.get("materia_id", type=int)

    if request.args.get("assunto_id") and assunto_id is None:
        return responder_erro("O ID do assunto é inválido.")

    if request.args.get("materia_id") and materia_id is None:
        return responder_erro("O ID da matéria é inválido.")

    conexao = None
    cursor = None

    try:
        conexao = conectar_banco()
        cursor = conexao.cursor(dictionary=True)

        sql = """
            SELECT
                f.id,
                f.frente,
                f.verso,
                a.id AS assunto_id,
                a.nome AS assunto,
                m.id AS materia_id,
                m.nome AS materia_nome
            FROM flashcards f
            JOIN assuntos a ON a.id = f.assunto_id
            JOIN conteudos c ON c.id = a.conteudo_id
            JOIN materias m ON m.id = c.materia_id
            WHERE 1 = 1
        """
        parametros = []

        if assunto_id is not None:
            sql += " AND a.id = %s"
            parametros.append(assunto_id)

        if materia_id is not None:
            sql += " AND m.id = %s"
            parametros.append(materia_id)

        sql += " ORDER BY f.id"
        cursor.execute(sql, tuple(parametros))

        return jsonify({"flashcards": cursor.fetchall()})

    except Exception:
        app.logger.exception("Erro ao listar flashcards")
        return responder_erro("Não foi possível carregar os flashcards.", 500)

    finally:
        fechar_recursos(cursor, conexao)


# BUSCAR USUÁRIOS PELO NICK
@app.route("/api/amigos/buscar", methods=["GET"])
@usuario_logado
def buscar_usuarios():
    termo = request.args.get("q", "").strip()

    if len(termo) < 1:
        return jsonify({"usuarios": []})

    if len(termo) > 100:
        return responder_erro("A busca deve ter até 100 caracteres.")

    conexao = None
    cursor = None

    try:
        conexao = conectar_banco()
        cursor = conexao.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT u.id, u.nome
            FROM usuarios u
            WHERE u.id <> %s
              AND u.nome LIKE %s
              AND NOT EXISTS (
                  SELECT 1
                  FROM solicitacoes_amizade s
                  WHERE (
                      (s.remetente_id = %s AND s.destinatario_id = u.id)
                      OR
                      (s.remetente_id = u.id AND s.destinatario_id = %s)
                  )
                  AND s.status IN ('pendente', 'aceita')
              )
            ORDER BY u.nome
            LIMIT 20
            """,
            (
                session["usuario_id"],
                f"%{termo}%",
                session["usuario_id"],
                session["usuario_id"]
            )
        )

        return jsonify({"usuarios": cursor.fetchall()})

    except Exception:
        app.logger.exception("Erro ao buscar usuários")
        return responder_erro("Não foi possível buscar usuários.", 500)

    finally:
        fechar_recursos(cursor, conexao)


# LISTAR AMIGOS
@app.route("/api/amigos", methods=["GET"])
@usuario_logado
def listar_amigos():
    conexao = None
    cursor = None

    try:
        conexao = conectar_banco()
        cursor = conexao.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT DISTINCT u.id, u.nome
            FROM solicitacoes_amizade s
            JOIN usuarios u
              ON u.id = CASE
                  WHEN s.remetente_id = %s THEN s.destinatario_id
                  ELSE s.remetente_id
              END
            WHERE s.status = 'aceita'
              AND (s.remetente_id = %s OR s.destinatario_id = %s)
            ORDER BY u.nome
            """,
            (
                session["usuario_id"],
                session["usuario_id"],
                session["usuario_id"]
            )
        )

        return jsonify({"amigos": cursor.fetchall()})

    except Exception:
        app.logger.exception("Erro ao listar amigos")
        return responder_erro("Não foi possível carregar seus amigos.", 500)

    finally:
        fechar_recursos(cursor, conexao)


# LISTAR CONVITES RECEBIDOS E ENVIADOS
@app.route("/api/amigos/convites", methods=["GET"])
@usuario_logado
def listar_convites():
    conexao = None
    cursor = None

    try:
        conexao = conectar_banco()
        cursor = conexao.cursor(dictionary=True)
        usuario_id = session["usuario_id"]

        cursor.execute(
            """
            SELECT
                s.id,
                s.remetente_id AS usuario_id,
                u.nome
            FROM solicitacoes_amizade s
            JOIN usuarios u ON u.id = s.remetente_id
            WHERE s.destinatario_id = %s
              AND s.status = 'pendente'
            ORDER BY s.criado_em DESC
            """,
            (usuario_id,)
        )
        recebidos = cursor.fetchall()

        cursor.execute(
            """
            SELECT
                s.id AS solicitacao_id,
                s.destinatario_id AS id,
                u.nome
            FROM solicitacoes_amizade s
            JOIN usuarios u ON u.id = s.destinatario_id
            WHERE s.remetente_id = %s
              AND s.status = 'pendente'
            ORDER BY s.criado_em DESC
            """,
            (usuario_id,)
        )
        enviados = cursor.fetchall()

        return jsonify({
            "recebidos": recebidos,
            "enviados": enviados
        })

    except Exception:
        app.logger.exception("Erro ao listar convites")
        return responder_erro("Não foi possível carregar os convites.", 500)

    finally:
        fechar_recursos(cursor, conexao)


# ENVIAR SOLICITAÇÃO DE AMIZADE
@app.route("/api/amigos/convites", methods=["POST"])
@usuario_logado
def enviar_convite():
    dados = request.get_json(silent=True) or {}
    destinatario_id = dados.get("usuario_id")
    remetente_id = session["usuario_id"]

    if not id_inteiro_positivo(destinatario_id):
        return responder_erro("Informe um usuário válido.")

    if destinatario_id == remetente_id:
        return responder_erro("Você não pode enviar convite para si mesmo.")

    conexao = None
    cursor = None

    try:
        conexao = conectar_banco()
        cursor = conexao.cursor(dictionary=True)

        cursor.execute(
            "SELECT id FROM usuarios WHERE id = %s",
            (destinatario_id,)
        )
        if not cursor.fetchone():
            return responder_erro("Esse usuário não existe.", 404)

        # Se a outra pessoa já enviou convite, aceitar esse convite
        # cria a amizade sem duplicar a solicitação.
        cursor.execute(
            """
            SELECT id, status
            FROM solicitacoes_amizade
            WHERE remetente_id = %s AND destinatario_id = %s
            """,
            (destinatario_id, remetente_id)
        )
        convite_inverso = cursor.fetchone()

        if convite_inverso and convite_inverso["status"] == "aceita":
            return responder_erro("Vocês já são amigos.", 409)

        if convite_inverso and convite_inverso["status"] == "pendente":
            cursor.execute(
                """
                UPDATE solicitacoes_amizade
                SET status = 'aceita'
                WHERE id = %s
                """,
                (convite_inverso["id"],)
            )
            conexao.commit()
            return jsonify({
                "mensagem": "Convite aceito automaticamente. Vocês agora são amigos!"
            })

        # Verifica se já existe uma solicitação enviada por este usuário.
        cursor.execute(
            """
            SELECT id, status
            FROM solicitacoes_amizade
            WHERE remetente_id = %s AND destinatario_id = %s
            """,
            (remetente_id, destinatario_id)
        )
        convite_existente = cursor.fetchone()

        if convite_existente:
            if convite_existente["status"] == "aceita":
                return responder_erro("Vocês já são amigos.", 409)

            if convite_existente["status"] == "pendente":
                return responder_erro("Você já enviou um convite para essa pessoa.", 409)

            cursor.execute(
                """
                UPDATE solicitacoes_amizade
                SET status = 'pendente'
                WHERE id = %s
                """,
                (convite_existente["id"],)
            )
        else:
            cursor.execute(
                """
                INSERT INTO solicitacoes_amizade
                    (remetente_id, destinatario_id, status)
                VALUES (%s, %s, 'pendente')
                """,
                (remetente_id, destinatario_id)
            )

        conexao.commit()
        return jsonify({"mensagem": "Convite enviado com sucesso!"}), 201

    except Exception:
        if conexao is not None:
            conexao.rollback()

        app.logger.exception("Erro ao enviar convite")
        return responder_erro("Não foi possível enviar o convite.", 500)

    finally:
        fechar_recursos(cursor, conexao)


# ACEITAR SOLICITAÇÃO
@app.route("/api/amigos/convites/<int:convite_id>/aceitar", methods=["POST"])
@usuario_logado
def aceitar_convite(convite_id):
    conexao = None
    cursor = None

    try:
        conexao = conectar_banco()
        cursor = conexao.cursor()

        cursor.execute(
            """
            UPDATE solicitacoes_amizade
            SET status = 'aceita'
            WHERE id = %s
              AND destinatario_id = %s
              AND status = 'pendente'
            """,
            (convite_id, session["usuario_id"])
        )

        if cursor.rowcount == 0:
            conexao.rollback()
            return responder_erro(
                "Convite não encontrado ou já respondido.",
                404
            )

        conexao.commit()
        return jsonify({"mensagem": "Solicitação aceita. Vocês agora são amigos!"})

    except Exception:
        if conexao is not None:
            conexao.rollback()

        app.logger.exception("Erro ao aceitar convite")
        return responder_erro("Não foi possível aceitar o convite.", 500)

    finally:
        fechar_recursos(cursor, conexao)


# RECUSAR SOLICITAÇÃO
@app.route("/api/amigos/convites/<int:convite_id>/recusar", methods=["POST"])
@usuario_logado
def recusar_convite(convite_id):
    conexao = None
    cursor = None

    try:
        conexao = conectar_banco()
        cursor = conexao.cursor()

        cursor.execute(
            """
            UPDATE solicitacoes_amizade
            SET status = 'recusada'
            WHERE id = %s
              AND destinatario_id = %s
              AND status = 'pendente'
            """,
            (convite_id, session["usuario_id"])
        )

        if cursor.rowcount == 0:
            conexao.rollback()
            return responder_erro(
                "Convite não encontrado ou já respondido.",
                404
            )

        conexao.commit()
        return jsonify({"mensagem": "Solicitação recusada."})

    except Exception:
        if conexao is not None:
            conexao.rollback()

        app.logger.exception("Erro ao recusar convite")
        return responder_erro("Não foi possível recusar o convite.", 500)

    finally:
        fechar_recursos(cursor, conexao)


if __name__ == "__main__":
    app.run(debug=True)