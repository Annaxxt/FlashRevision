const $ = (selector) => document.querySelector(selector);

const authScreen = $("#auth-screen");
const appScreen = $("#app-screen");
const loginPanel = $("#login-panel");
const registerPanel = $("#register-panel");
const pageContent = $("#page-content");

let usuarioAtual = null;
let perguntas = [];
let indicePergunta = 0;
let respostaEnviada = false;
let flashcards = [];
let indiceFlashcard = 0;
let mostrandoVerso = false;
let paginaAtual = "inicio";
let modoRevisao = false;
let perguntasRevisao = [];
let materiaSelecionadaId = null;
let assuntoSelecionadoId = null;


async function api(url, options = {}) {
    const config = {
        credentials: "same-origin",
        ...options,
        headers: {
            ...(options.body ? { "Content-Type": "application/json" } : {}),
            ...(options.headers || {})
        }
    };

    const resposta = await fetch(url, config);
    const dados = await resposta.json().catch(() => ({}));

    if (!resposta.ok) {
        throw new Error(dados.erro || dados.mensagem || "Não foi possível concluir a solicitação.");
    }

    return dados;
}

function mostrarMensagem(elemento, mensagem, tipo = "error") {
    elemento.textContent = mensagem;
    elemento.className = `form-message ${tipo}`;
}

function limparMensagens() {
    $("#login-message").textContent = "";
    $("#register-message").textContent = "";
}

function trocarTelaAuth(tela) {
    const loginAtivo = tela === "login";

    loginPanel.classList.toggle("hidden", !loginAtivo);
    registerPanel.classList.toggle("hidden", loginAtivo);

    document.querySelectorAll(".auth-tab").forEach((botao) => {
        botao.classList.toggle("active", botao.dataset.auth === tela);
    });

    limparMensagens();
}

document.querySelectorAll("[data-auth]").forEach((botao) => {
    botao.addEventListener("click", () => trocarTelaAuth(botao.dataset.auth));
});

document.querySelectorAll("[data-switch]").forEach((botao) => {
    botao.addEventListener("click", () => trocarTelaAuth(botao.dataset.switch));
});

$("#register-form").addEventListener("submit", async (evento) => {
    evento.preventDefault();

    const botao = evento.currentTarget.querySelector('button[type="submit"]');
    const nick = $("#register-nick").value.trim();
    const email = $("#register-email").value.trim().toLowerCase();
    const senha = $("#register-password").value;
    const confirmar = $("#register-confirm").value;
    const mensagem = $("#register-message");

    if (nick.length < 3 || nick.length > 30) {
        mostrarMensagem(mensagem, "Seu nick precisa ter entre 3 e 30 caracteres.");
        return;
    }

    if (senha.length < 8) {
        mostrarMensagem(mensagem, "A senha precisa ter pelo menos 8 caracteres.");
        return;
    }

    if (senha !== confirmar) {
        mostrarMensagem(mensagem, "As senhas não são iguais.");
        return;
    }

    botao.disabled = true;
    botao.textContent = "Criando sua conta...";

    try {
        await api("/api/cadastro", {
            method: "POST",
            body: JSON.stringify({
                nome: nick,
                email,
                senha
            })
        });

        mostrarMensagem(
            mensagem,
            "Conta criada! Agora entre com seu e-mail e senha.",
            "success"
        );

        $("#login-email").value = email;
        $("#login-password").value = "";
        $("#register-form").reset();

        setTimeout(() => trocarTelaAuth("login"), 900);
    } catch (erro) {
        mostrarMensagem(mensagem, erro.message);
    } finally {
        botao.disabled = false;
        botao.innerHTML = 'Criar minha conta <span>→</span>';
    }
});

$("#login-form").addEventListener("submit", async (evento) => {
    evento.preventDefault();

    const botao = evento.currentTarget.querySelector('button[type="submit"]');
    const email = $("#login-email").value.trim().toLowerCase();
    const senha = $("#login-password").value;
    const mensagem = $("#login-message");

    botao.disabled = true;
    botao.textContent = "Entrando...";

    try {
        await api("/api/login", {
            method: "POST",
            body: JSON.stringify({ email, senha })
        });

        await carregarAplicativo();
    } catch (erro) {
        mostrarMensagem(mensagem, erro.message);
    } finally {
        botao.disabled = false;
        botao.innerHTML = 'Entrar na minha conta <span>→</span>';
    }
});

async function carregarAplicativo() {
    const perfil = await api("/api/perfil");

    usuarioAtual = perfil.usuario || perfil;
    authScreen.classList.add("hidden");
    appScreen.classList.remove("hidden");

    const nick = usuarioAtual.nick || usuarioAtual.nome || "Estudante";

    $("#user-nick").textContent = nick;
    $("#user-avatar").textContent = nick.charAt(0).toUpperCase();

    await abrirPagina("inicio");
}

$("#logout-button").addEventListener("click", async () => {
    try {
        await api("/api/logout", { method: "POST" });
    } catch (erro) {
        console.error("Não foi possível encerrar a sessão:", erro);
    }

    usuarioAtual = null;
    appScreen.classList.add("hidden");
    authScreen.classList.remove("hidden");
    $("#login-form").reset();
    $("#register-form").reset();
    trocarTelaAuth("login");
});

document.querySelectorAll("[data-page]").forEach((botao) => {
    botao.addEventListener("click", () => abrirPagina(botao.dataset.page));
});

function escaparHTML(valor) {
    return String(valor ?? "").replace(/[&<>"']/g, (caractere) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[caractere]);
}

function mensagemAplicativo(texto, tipo = "") {
    const elemento = $("#app-message");
    elemento.textContent = texto;
    elemento.className = `app-message ${tipo}`;
}

async function abrirPagina(pagina) {
    paginaAtual = pagina;
    mensagemAplicativo("");

    document.querySelectorAll(".nav-item").forEach((botao) => {
        botao.classList.toggle("active", botao.dataset.page === pagina);
    });

    const titulos = {
        inicio: "Início",
        estudar: "Estudar",
        revisao: "Revisar erros",
        flashcards: "Flashcards",
        amigos: "Amigos",
        perfil: "Meu perfil"
    };

    $("#page-heading").textContent = titulos[pagina] || "FlashRevision";

    try {
        if (pagina === "inicio") await renderizarInicio();
        if (pagina === "estudar") await renderizarEstudo();
        if (pagina === "revisao") await renderizarRevisao();
        if (pagina === "flashcards") await renderizarFlashcards();
        if (pagina === "amigos") await renderizarAmigos();
        if (pagina === "perfil") renderizarPerfil();
    } catch (erro) {
        if (erro.message.toLowerCase().includes("autoriz") ||
            erro.message.toLowerCase().includes("sessão") ||
            erro.message.toLowerCase().includes("login")) {
            appScreen.classList.add("hidden");
            authScreen.classList.remove("hidden");
            trocarTelaAuth("login");
            return;
        }

        pageContent.innerHTML = `
            <div class="content-panel">
                <h3>Não foi possível carregar esta página</h3>
                <p>${escaparHTML(erro.message)}</p>
                <button class="secondary-button" id="retry-button">Tentar novamente</button>
            </div>
        `;

        $("#retry-button").addEventListener("click", () => abrirPagina(paginaAtual));
    }
}

async function renderizarInicio() {
    let metricas = {
        total_respondidas: 0,
        acertos: 0,
        erros: 0,
        percentual_acerto: 0,
        perguntas_para_revisar: 0
    };

    let materias = [];

    try {
        metricas = await api("/api/metricas");
    } catch (erro) {
        console.warn("Métricas indisponíveis:", erro.message);
    }

    try {
        const dados = await api("/api/materias");
        materias = Array.isArray(dados) ? dados : (dados.materias || []);
    } catch (erro) {
        console.warn("Matérias indisponíveis:", erro.message);
    }

    const nick = usuarioAtual?.nick || usuarioAtual?.nome || "Estudante";

    pageContent.innerHTML = `
        <section class="welcome-banner">
            <p class="eyebrow">BEM-VINDO DE VOLTA</p>
            <h3>Vamos aprender algo novo, ${escaparHTML(nick)}?</h3>
            <p class="description">
                Continue sua jornada de estudos, pratique o que aprendeu
                e revise os assuntos que precisam de mais atenção.
            </p>
            <button class="primary-button" id="start-study" style="max-width:220px">
                Começar a estudar <span>→</span>
            </button>
        </section>

        <div class="section-heading">
            <div>
                <h3>Seu progresso</h3>
                <p>Acompanhe como estão seus estudos.</p>
            </div>
        </div>

        <section class="stats-grid">
            <article class="stat-card">
                <span class="stat-label">Perguntas respondidas</span>
                <strong class="stat-number">${Number(metricas.total_respondidas) || 0}</strong>
                <span class="stat-foot">Total de respostas registradas</span>
            </article>
            <article class="stat-card">
                <span class="stat-label">Acertos</span>
                <strong class="stat-number">${Number(metricas.acertos) || 0}</strong>
                <span class="stat-foot">Respostas corretas</span>
            </article>
            <article class="stat-card">
                <span class="stat-label">Taxa de acerto</span>
                <strong class="stat-number">${Number(metricas.percentual_acerto) || 0}%</strong>
                <span class="stat-foot">Seu desempenho nas perguntas</span>
            </article>
        </section>

        <div class="section-heading">
            <div>
                <h3>Suas matérias</h3>
                <p>Escolha uma área para continuar aprendendo.</p>
            </div>
        </div>

        <section class="subject-grid">
            ${materias.length ? materias.map((materia, indice) => `
                <button class="subject-card" data-study-all="${escaparHTML(materia.id)}">
                    <span class="subject-icon">${indice === 0 ? "⌘" : "✦"}</span>
                    <h4>${escaparHTML(materia.nome)}</h4>
                    <p>${escaparHTML(materia.descricao || "Pratique e revise seus conhecimentos.")}</p>
                    <span class="inline-button">Começar a estudar →</span>
                </button>
            `).join("") : `
                <div class="content-panel">
                    <p>Suas matérias aparecerão aqui quando estiverem disponíveis no banco de dados.</p>
                </div>
            `}
        </section>

        <div class="section-heading">
            <div>
                <h3>Continue praticando</h3>
                <p>Escolha como quer estudar agora.</p>
            </div>
        </div>

        <section class="action-grid">
            <button class="action-card" data-page="estudar">
                <span class="subject-icon">▤</span>
                <h4>Responder perguntas</h4>
                <p>Teste o que você já aprendeu.</p>
            </button>
            <button class="action-card" data-page="revisao">
                <span class="subject-icon">↻</span>
                <h4>Revisar erros</h4>
                <p>Volte às questões que errou.</p>
            </button>
            <button class="action-card" data-page="flashcards">
                <span class="subject-icon">▣</span>
                <h4>Revisar flashcards</h4>
                <p>Reforce sua memória com cartões.</p>
            </button>
        </section>
    `;

    $("#start-study").addEventListener("click", () => abrirPagina("estudar"));

    pageContent.querySelectorAll("[data-page]").forEach((botao) => {
        botao.addEventListener("click", () => abrirPagina(botao.dataset.page));
    });

    pageContent.querySelectorAll("[data-study-all]").forEach((botao) => {
        botao.addEventListener("click", async () => {
            materiaSelecionadaId = Number(botao.dataset.studyAll);
            assuntoSelecionadoId = null;
            await abrirPagina("estudar");
        });
    });
}

function extrairLista(dados, chave) {
    if (Array.isArray(dados)) return dados;
    if (Array.isArray(dados[chave])) return dados[chave];
    return [];
}


async function renderizarEstudo() {
    const materiasDados = await api("/api/materias");
    const materias = extrairLista(materiasDados, "materias");

    if (
        materiaSelecionadaId === null &&
        materias.length
    ) {
        materiaSelecionadaId = Number(materias[0].id);
    }

    const assuntosUrl = materiaSelecionadaId
        ? `/api/assuntos?materia_id=${materiaSelecionadaId}`
        : "/api/assuntos";

    let assuntos = [];

    try {
        const dadosAssuntos = await api(assuntosUrl);
        assuntos = extrairLista(dadosAssuntos, "assuntos");
    } catch (erro) {
        console.warn("Não foi possível carregar assuntos:", erro.message);
    }

    if (
        assuntoSelecionadoId !== null &&
        !assuntos.some(
            (assunto) => Number(assunto.id) === assuntoSelecionadoId
        )
    ) {
        assuntoSelecionadoId = null;
    }

    const parametros = new URLSearchParams();

    if (materiaSelecionadaId !== null) {
        parametros.set("materia_id", materiaSelecionadaId);
    }

    if (assuntoSelecionadoId !== null) {
        parametros.set("assunto_id", assuntoSelecionadoId);
    }

    const dados = await api(`/api/perguntas?${parametros.toString()}`);
    perguntas = extrairLista(dados, "perguntas");
    indicePergunta = 0;
    respostaEnviada = false;

    pageContent.innerHTML = `
        <section class="content-panel study-filters">
            <div class="study-filter-header">
                <h3>Configurar estudo</h3>
                <span>Matéria e assunto</span>
            </div>

            <div class="study-filter-controls">
                <div class="filter-group">
                    <label for="study-materia">Matéria</label>
                    <select id="study-materia" class="form-control">
                        ${materias.map((materia) => `
                            <option
                                value="${escaparHTML(materia.id)}"
                                ${Number(materia.id) === materiaSelecionadaId ? "selected" : ""}
                            >
                                ${escaparHTML(materia.nome)}
                            </option>
                        `).join("")}
                    </select>
                </div>

                <div class="filter-group">
                    <label for="study-assunto">Assunto</label>
                    <select id="study-assunto" class="form-control">
                        <option value="">Todos os assuntos</option>
                        ${assuntos.map((assunto) => `
                            <option
                                value="${escaparHTML(assunto.id)}"
                                ${Number(assunto.id) === assuntoSelecionadoId ? "selected" : ""}
                            >
                                ${escaparHTML(assunto.nome)}
                            </option>
                        `).join("")}
                    </select>
                </div>
            </div>
        </section>

        <div id="study-question-area"></div>
    `;

    $("#study-materia").addEventListener("change", async (evento) => {
        materiaSelecionadaId = Number(evento.target.value);
        assuntoSelecionadoId = null;
        await renderizarEstudo();
    });

    $("#study-assunto").addEventListener("change", async (evento) => {
        assuntoSelecionadoId = evento.target.value
            ? Number(evento.target.value)
            : null;

        await renderizarEstudo();
    });

    if (!perguntas.length) {
        $("#study-question-area").innerHTML = `
            <div class="content-panel empty-state">
                <h3>Nenhuma pergunta disponível nesta matéria</h3>
                <p>
                    Ainda não há perguntas cadastradas para esta seleção.
                    Escolha outra matéria ou volte quando novos conteúdos forem adicionados.
                </p>
            </div>
        `;
        return;
    }

    mostrarPergunta();
}

function mostrarPergunta() {
    const pergunta = perguntas[indicePergunta];

    if (!pergunta) {
        pageContent.innerHTML = `
            <div class="content-panel empty-state">
                <h3>Parabéns por concluir esta sessão!</h3>
                <p>Você chegou ao fim das perguntas disponíveis nesta rodada.</p>
                <button class="primary-button" id="study-again">Estudar novamente</button>
                <button class="secondary-button" id="go-home">Voltar ao início</button>
            </div>
        `;

        $("#study-again").addEventListener("click", renderizarEstudo);
        $("#go-home").addEventListener("click", () => abrirPagina("inicio"));
        return;
    }

    respostaEnviada = false;
    const alternativas = pergunta.alternativas || [];
    const areaPergunta = $("#study-question-area") || pageContent;
    areaPergunta.innerHTML = `
        <div class="quiz-card">
            <p class="eyebrow">SESSÃO DE ESTUDO</p>
            <p class="muted">Pergunta ${indicePergunta + 1} de ${perguntas.length}</p>
            <div class="quiz-progress">
                <div style="width:${((indicePergunta + 1) / perguntas.length) * 100}%"></div>
            </div>

            <p class="muted">${escaparHTML(pergunta.assunto_nome || pergunta.assunto || "Revisão")}</p>
            <h3 class="quiz-question">${escaparHTML(pergunta.texto)}</h3>

            <div class="answer-list">
                ${alternativas.map((alternativa, indice) => `
                    <button class="answer-option" data-answer-id="${escaparHTML(alternativa.id)}">
                        <strong>${String.fromCharCode(65 + indice)}.</strong>
                        ${escaparHTML(alternativa.texto)}
                    </button>
                `).join("")}
            </div>

            <p id="quiz-feedback" class="quiz-feedback" aria-live="polite"></p>
            <button id="next-question" class="primary-button hidden">
                Próxima pergunta <span>→</span>
            </button>
        </div>
    `;

    pageContent.querySelectorAll("[data-answer-id]").forEach((botao) => {
        botao.addEventListener("click", () => responderPergunta(botao));
    });
}

async function responderPergunta(botaoSelecionado) {
    if (respostaEnviada) return;

    respostaEnviada = true;

    const pergunta = perguntas[indicePergunta];
    const alternativaId = Number(botaoSelecionado.dataset.answerId);
    const botoes = [...pageContent.querySelectorAll("[data-answer-id]")];
    botoes.forEach((botao) => botao.disabled = true);

    try {
        const resultado = await api("/api/responder", {
            method: "POST",
            body: JSON.stringify({
                pergunta_id: Number(pergunta.id),
                alternativa_id: alternativaId
            })
        });

        const acertou = Boolean(resultado.acertou);
        const feedback = $("#quiz-feedback");

        botaoSelecionado.classList.add(acertou ? "correct" : "incorrect");
        feedback.textContent = acertou
            ? "Muito bem! Você acertou."
            : "Não foi dessa vez. Revise este assunto e tente novamente.";
        feedback.style.color = acertou ? "var(--success)" : "var(--danger)";

        $("#next-question").classList.remove("hidden");
        $("#next-question").addEventListener("click", () => {
            indicePergunta++;
            mostrarPergunta();
        }, { once: true });
    } catch (erro) {
        respostaEnviada = false;
        botoes.forEach((botao) => botao.disabled = false);
        mensagemAplicativo(erro.message, "error");
    }
}


async function renderizarRevisao() {
    modoRevisao = false;

    const dados = await api("/api/revisao");
    const lista = extrairLista(dados, "perguntas");

    if (!lista.length) {
        pageContent.innerHTML = `
            <div class="content-panel empty-state">
                <h3>Nenhum erro para revisar!</h3>
                <p>Quando você errar alguma pergunta, ela poderá aparecer aqui para revisão.</p>
                <button class="primary-button" id="back-to-study">
                    Voltar a estudar
                </button>
            </div>
        `;

        $("#back-to-study").addEventListener("click", () => {
            abrirPagina("estudar");
        });

        return;
    }

    pageContent.innerHTML = `
        <div class="section-heading">
            <div>
                <h3>Vamos reforçar o aprendizado</h3>
                <p>Estas são as perguntas disponíveis para revisão.</p>
            </div>
        </div>

        <section class="answer-list">
            ${lista.map((pergunta, indice) => `
                <article class="content-panel">
                    <p class="eyebrow">QUESTÃO ${indice + 1}</p>
                    <h3>${escaparHTML(pergunta.texto)}</h3>
                    <p>${escaparHTML(
                        pergunta.assunto_nome ||
                        pergunta.assunto ||
                        "Revisão"
                    )}</p>

                    <button class="secondary-button"
                        data-review-index="${indice}">
                        Revisar esta pergunta
                    </button>
                </article>
            `).join("")}
        </section>
    `;

    pageContent.querySelectorAll("[data-review-index]").forEach((botao) => {
        botao.addEventListener("click", () => {
            const indice = Number(botao.dataset.reviewIndex);

            perguntasRevisao = lista;
            perguntas = [...lista];
            indicePergunta = indice;
            modoRevisao = true;
            respostaEnviada = false;

            $("#page-heading").textContent = "Revisar erros";
            mostrarPergunta();
        });
    });
}

async function renderizarFlashcards() {
    const dados = await api("/api/flashcards");
    flashcards = extrairLista(dados, "flashcards");
    indiceFlashcard = 0;
    mostrandoVerso = false;

    if (!flashcards.length) {
        pageContent.innerHTML = `
            <div class="content-panel empty-state">
                <h3>Seus flashcards aparecerão aqui</h3>
                <p>Ainda não há cartões cadastrados. Você poderá usá-los para revisar conceitos e memorizar conteúdos.</p>
            </div>
        `;
        return;
    }

    mostrarFlashcard();
}

function mostrarFlashcard() {
    const cartao = flashcards[indiceFlashcard];
    if (!cartao) return;

    pageContent.innerHTML = `
        <div class="section-heading">
            <div>
                <h3>Revisão com flashcards</h3>
                <p>Cartão ${indiceFlashcard + 1} de ${flashcards.length}</p>
            </div>
        </div>

        <div class="flashcard" id="flashcard-flip" role="button" tabindex="0"
             aria-label="Virar flashcard">
            <div>
                <small>${mostrandoVerso ? "RESPOSTA" : "PERGUNTA"}</small>
                <p>${escaparHTML(mostrandoVerso ? cartao.verso : cartao.frente)}</p>
                <div class="flashcard-hint">Clique no cartão para virar</div>
            </div>
        </div>

        <div class="flashcard-controls">
            <button class="secondary-button" id="flashcard-prev">← Anterior</button>
            <button class="secondary-button" id="flashcard-flip-button">Virar cartão</button>
            <button class="secondary-button" id="flashcard-next">Próximo →</button>
        </div>
    `;

    const virar = () => {
        mostrandoVerso = !mostrandoVerso;
        mostrarFlashcard();
    };

    $("#flashcard-flip").addEventListener("click", virar);
    $("#flashcard-flip").addEventListener("keydown", (evento) => {
        if (evento.key === "Enter" || evento.key === " ") {
            evento.preventDefault();
            virar();
        }
    });

    $("#flashcard-flip-button").addEventListener("click", virar);

    $("#flashcard-prev").addEventListener("click", () => {
        indiceFlashcard = (indiceFlashcard - 1 + flashcards.length) % flashcards.length;
        mostrandoVerso = false;
        mostrarFlashcard();
    });

    $("#flashcard-next").addEventListener("click", () => {
        indiceFlashcard = (indiceFlashcard + 1) % flashcards.length;
        mostrandoVerso = false;
        mostrarFlashcard();
    });
}

function renderizarPerfil() {
    const nick = usuarioAtual?.nick || usuarioAtual?.nome || "Estudante";
    const email = usuarioAtual?.email || "Não informado";

    pageContent.innerHTML = `
        <div class="content-panel">
            <p class="eyebrow">SUA CONTA</p>
            <h3>Perfil de estudante</h3>
            <p>Estas são as informações básicas da sua conta.</p>

            <div class="profile-row">
                <div class="avatar">${escaparHTML(nick.charAt(0).toUpperCase())}</div>
                <div>
                    <p class="label">Nick</p>
                    <p class="value">${escaparHTML(nick)}</p>
                </div>
            </div>

            <div class="profile-row">
                <div>
                    <p class="label">E-mail</p>
                    <p class="value">${escaparHTML(email)}</p>
                </div>
            </div>

            <p>Sua senha não é exibida nesta página.</p>
        </div>
    `;
}

async function iniciar() {
    try {
        await carregarAplicativo();
    } catch {
        authScreen.classList.remove("hidden");
        appScreen.classList.add("hidden");
        trocarTelaAuth("login");
    }
}


async function renderizarAmigos() {
    const [dadosAmigos, dadosConvites] = await Promise.all([
        api("/api/amigos"),
        api("/api/amigos/convites")
    ]);

    const amigos = extrairLista(dadosAmigos, "amigos");
    const recebidos = extrairLista(dadosConvites, "recebidos");
    const enviados = extrairLista(dadosConvites, "enviados");

    pageContent.innerHTML = `
        <section class="content-panel">
            <h3>Encontrar pessoas</h3>
            <p>Pesquise pelo nick para encontrar outros estudantes.</p>

            <form id="friend-search-form">
                <label for="friend-search">Nick do usuário</label>
                <input id="friend-search" type="search"
                       placeholder="Digite um nick..." maxlength="100" required>
                <button class="primary-button" type="submit">
                    Buscar
                </button>
            </form>

            <div id="friend-search-results" aria-live="polite"></div>
        </section>

        <section class="content-panel">
            <h3>Solicitações recebidas (${recebidos.length})</h3>
            <div class="friend-list">
                ${recebidos.length ? recebidos.map((pessoa) => `
                    <div class="friend-row">
                        <span>${escaparHTML(pessoa.nome)}</span>
                        <div>
                            <button class="primary-button"
                                data-accept-friend="${pessoa.id}">
                                Aceitar
                            </button>
                            <button class="secondary-button"
                                data-decline-friend="${pessoa.id}">
                                Recusar
                            </button>
                        </div>
                    </div>
                `).join("") : "<p>Nenhuma solicitação recebida.</p>"}
            </div>
        </section>

        <section class="content-panel">
            <h3>Convites enviados (${enviados.length})</h3>
            ${enviados.length ? enviados.map((pessoa) => `
                <p>${escaparHTML(pessoa.nome)} — aguardando resposta</p>
            `).join("") : "<p>Você não enviou convites pendentes.</p>"}
        </section>

        <section class="content-panel">
            <h3>Meus amigos (${amigos.length})</h3>
            ${amigos.length ? amigos.map((pessoa) => `
                <div class="friend-row">
                    <span>${escaparHTML(pessoa.nome)}</span>
                </div>
            `).join("") : "<p>Você ainda não tem amigos adicionados.</p>"}
        </section>
    `;

    $("#friend-search-form").addEventListener("submit", async (evento) => {
        evento.preventDefault();

        const busca = $("#friend-search").value.trim();
        const resultados = $("#friend-search-results");
        resultados.textContent = "Pesquisando...";

        try {
            const dados = await api(
                `/api/amigos/buscar?q=${encodeURIComponent(busca)}`
            );
            const pessoas = extrairLista(dados, "usuarios");

            resultados.innerHTML = pessoas.length
                ? pessoas.map((pessoa) => `
                    <div class="friend-row">
                        <span>${escaparHTML(pessoa.nome)}</span>
                        <button class="secondary-button"
                            data-add-friend="${pessoa.id}">
                            Enviar convite
                        </button>
                    </div>
                `).join("")
                : "<p>Nenhum usuário encontrado.</p>";
        } catch (erro) {
            resultados.textContent = erro.message;
        }
    });

    pageContent.querySelectorAll("[data-add-friend]").forEach((botao) => {
        botao.addEventListener("click", async () => {
            try {
                await api("/api/amigos/convites", {
                    method: "POST",
                    body: JSON.stringify({
                        usuario_id: Number(botao.dataset.addFriend)
                    })
                });

                mensagemAplicativo("Convite enviado!", "success");
                await renderizarAmigos();
            } catch (erro) {
                mensagemAplicativo(erro.message, "error");
            }
        });
    });

    pageContent.querySelectorAll("[data-accept-friend]").forEach((botao) => {
        botao.addEventListener("click", async () => {
            try {
                await api(
                    `/api/amigos/convites/${botao.dataset.acceptFriend}/aceitar`,
                    { method: "POST" }
                );

                await renderizarAmigos();
            } catch (erro) {
                mensagemAplicativo(erro.message, "error");
            }
        });
    });

    pageContent.querySelectorAll("[data-decline-friend]").forEach((botao) => {
        botao.addEventListener("click", async () => {
            try {
                await api(
                    `/api/amigos/convites/${botao.dataset.declineFriend}/recusar`,
                    { method: "POST" }
                );

                await renderizarAmigos();
            } catch (erro) {
                mensagemAplicativo(erro.message, "error");
            }
        });
    });
}

iniciar();