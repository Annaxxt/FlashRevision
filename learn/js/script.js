const listaAssuntos = document.getElementById("lista-assuntos");
const botaoVoltar = document.querySelector(".voltar");

if (listaAssuntos) {

    // Descobre qual JSON a página deve carregar
    const arquivoJson = listaAssuntos.dataset.json;

    fetch(`../data/${arquivoJson}`)
        .then(resposta => resposta.json())
        .then(dados => {

            const icones = {
                python: "🐍",
                javascript: "🟨",
                "html-css": "🌐",
                git: "🔀",
                logica: "🧠",
                apis: "🔌",

                cloud: "☁️",
                aws: "🟠",
                azure: "🔵",
                redes: "🌐",
                containers: "📦",
                "seguranca-cloud": "🔐",

                fundamentos: "🛡️",
                "seguranca-da-informacao": "🔐",
                "seguranca-de-redes": "🌐",
                "criptografia": "🔑",
                "controle-de-acesso": "🔒",
                "malware": "🦠",
                "engenharia-social": "🎭",
                "vulnerabilidades": "⚠️",
                "incidentes": "🚨"
            };

            let nivelAtual = "conteudos";

            function mostrarConteudos() {

                nivelAtual = "conteudos";

                if (botaoVoltar) {
                    botaoVoltar.href = "../index.html";
                }

                listaAssuntos.innerHTML = "";

                for (let assunto in dados.conteudos) {

                    const conteudo = dados.conteudos[assunto];

                    listaAssuntos.innerHTML += `
                        <div class="assunto" data-assunto="${assunto}">
                            <span>${icones[assunto] || "📚"}</span>

                            <h3>${conteudo.nome}</h3>

                            <p>${conteudo.assuntos.length} assuntos</p>
                        </div>
                    `;
                }
            }

            function mostrarAssuntos(assunto) {

                const conteudo = dados.conteudos[assunto];

                if (!conteudo) {
                    return;
                }

                nivelAtual = "assuntos";

                if (botaoVoltar) {
                    botaoVoltar.href = "#";
                }

                listaAssuntos.innerHTML = `
                    <button class="voltar-assuntos">
                        ← Voltar
                    </button>
                `;

                conteudo.assuntos.forEach(item => {

                    listaAssuntos.innerHTML += `
                        <div class="assunto">
                            <h3>${item.nome}</h3>
                            <p>${item.descricao}</p>
                        </div>
                    `;

                });
            }

            if (botaoVoltar) {

                botaoVoltar.addEventListener("click", function(evento) {

                    if (nivelAtual === "assuntos") {

                        evento.preventDefault();

                        mostrarConteudos();
                    }

                });

            }

            listaAssuntos.addEventListener("click", function(evento) {

                const card = evento.target.closest(".assunto");

                if (card) {

                    const assunto = card.dataset.assunto;

                    mostrarAssuntos(assunto);
                }

                const voltarAssuntos =
                    evento.target.closest(".voltar-assuntos");

                if (voltarAssuntos) {

                    mostrarConteudos();
                }

            });

            mostrarConteudos();

        })
        .catch(erro => {

            console.error("Erro ao carregar o JSON:", erro);

            listaAssuntos.innerHTML = `
                <p>Não foi possível carregar os conteúdos.</p>
            `;

        });

}