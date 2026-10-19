# ⚡ FlashRevision

<p align="center">
  <strong>Aprenda. Revise. Evolua.</strong>
  <br>
  Uma plataforma de estudos interativa para transformar revisões em progresso.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/STATUS-EM%20DESENVOLVIMENTO-8B5CF6?style=for-the-badge&labelColor=0D0A14" alt="Status: Em desenvolvimento">
  <img src="https://img.shields.io/badge/PYTHON-FLASK-8B5CF6?style=for-the-badge&logo=python&logoColor=white&labelColor=0D0A14" alt="Python Flask">
  <img src="https://img.shields.io/badge/DATABASE-MYSQL-C084FC?style=for-the-badge&logo=mysql&logoColor=white&labelColor=0D0A14" alt="MySQL">
</p>

---

## `01 // Sobre o projeto`

O **FlashRevision** é uma plataforma de estudos desenvolvida para tornar a aprendizagem mais interativa, organizada e dinâmica.

A proposta é permitir que os usuários estudem diferentes assuntos, revisem conteúdos por meio de flashcards e acompanhem sua evolução, com a possibilidade de adicionar amigos e tornar a experiência mais social.

O projeto está sendo desenvolvido gradualmente, com foco em funcionalidades práticas, organização dos dados e aprendizado durante o processo de desenvolvimento.

## `02 // Funcionalidades`

- [x] Cadastro de contas e login.
- [x] Armazenamento de senhas utilizando hash.
- [x] Acesso às matérias disponíveis.
- [x] Questões de múltipla escolha.
- [x] Flashcards interativos.
- [x] Revisão de questões respondidas incorretamente.
- [x] Busca de usuários pelo nick.
- [x] Sistema de amizades com envio e gerenciamento de solicitações.
- [x] Perfil do usuário com informações da conta.
- [ ] Expansão das matérias e dos conteúdos de estudo.
- [ ] Novas funcionalidades de interação e acompanhamento do progresso.

## `03 // Matérias disponíveis`

**Cyber**

Conteúdos de cibersegurança para estudar conceitos e testar conhecimentos por meio de questões e revisões.

**Inglês**

Prática de vocabulário e aprendizagem de idiomas com atividades interativas e flashcards.

## `04 // Tecnologias utilizadas`

| Tecnologia | Aplicação |
|---|---|
| Python | Lógica e desenvolvimento do backend |
| Flask | Aplicação web e rotas |
| MySQL | Armazenamento e gerenciamento dos dados |
| HTML | Estrutura das páginas |
| CSS  | Estilização e interface |
| JavaScript | Interatividade e funcionalidades do frontend |

## `05 // Segurança e organização`

Durante o desenvolvimento, alguns cuidados importantes estão sendo aplicados:

- Senhas armazenadas por meio de hash, em vez de texto puro.
- Validação do fluxo de cadastro e login.
- Organização dos dados dos usuários no banco de dados.
- Separação entre funcionalidades de interface e lógica da aplicação.

O projeto também serve como oportunidade para aprofundar conhecimentos em desenvolvimento web, banco de dados e fundamentos de segurança da informação.

## `06 // Executando o projeto`

### Pré-requisitos

- Python instalado.
- MySQL Server em execução.
- Git instalado.
- Um editor de código, como o Visual Studio Code.

### Instalação

Clone o repositório:

```bash
git clone https://github.com/NaahDev/FlashRevision
```

Entre na pasta do projeto:

```bash
cd FlashRevision
```

Crie e ative um ambiente virtual:

```bash
python -m venv venv
```

No Windows:

```bash
venv\Scripts\activate
```

Instale as dependências:

```bash
pip install flask mysql-connector-python python-dotenv
```

Configure as variáveis de ambiente e a conexão com o MySQL conforme a configuração utilizada no projeto.

Depois, execute a aplicação pelo comando correspondente ao arquivo principal do Flask.

> **Importante:** os comandos de instalação e inicialização devem ser ajustados caso o projeto utilize outras dependências ou uma estrutura de arquivos diferente. Não compartilhe senhas ou chaves secretas no repositório.

## `07 // Objetivo`

O FlashRevision é um projeto de aprendizado contínuo, desenvolvido para praticar programação, integração com banco de dados, autenticação de usuários e criação de aplicações web interativas.

A ideia é evoluir a plataforma de forma progressiva, adicionando recursos e aprimorando a experiência de estudo conforme novos conhecimentos são adquiridos.

---

<p align="center">
  <strong>FLASHREVISION</strong>
  <br>
  <code>study.exe // loading knowledge...</code>
  <br><br>
  Desenvolvido por <strong>Anna Clara Moraes</strong>
</p>