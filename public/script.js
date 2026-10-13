const formulario = document.getElementById("formulario");
const campoNumero = document.getElementById("numero");
const area = document.getElementById("desenho");
const mensagem = document.getElementById("mensagem");
const estadoLogin = document.getElementById("estadoLogin");
const botaoGoogle = document.getElementById("botaoGoogle");
const botaoSair = document.getElementById("sair");
const botaoGerar = document.getElementById("gerar");
const botaoBaixar = document.getElementById("baixar");

// O token fica somente na memoria desta pagina, nunca no localStorage.
let idToken = "";
let svgAtual = "";
let versao = 0;

function limparDesenho() {
  versao += 1;
  svgAtual = "";
  area.replaceChildren();
  botaoBaixar.hidden = true;
}

function sairDaConta() {
  idToken = "";
  limparDesenho();
  botaoSair.hidden = true;
  botaoGoogle.hidden = false;
  estadoLogin.textContent = "Entre com Google para assinar seu desenho.";
  window.google?.accounts.id.disableAutoSelect();
}

async function prepararLogin() {
  try {
    const resposta = await fetch("/api/config", { cache: "no-store" });
    if (!resposta.ok) throw new Error("Login indisponível.");
    const config = await resposta.json();
    if (!config.clientId || !window.google?.accounts.id) throw new Error("Login indisponível.");
    window.google.accounts.id.initialize({
      client_id: config.clientId,
      auto_select: false,
      callback: (respostaGoogle) => {
        if (!respostaGoogle.credential) return;
        idToken = respostaGoogle.credential;
        limparDesenho();
        mensagem.textContent = "";
        estadoLogin.textContent = "Conta Google conectada. Agora escolha seu número.";
        botaoSair.hidden = false;
        botaoGoogle.hidden = true;
      },
    });
    window.google.accounts.id.renderButton(botaoGoogle, {
      theme: "outline", size: "large", text: "signin_with", locale: "pt-BR",
    });
    estadoLogin.textContent = "Entre com Google para assinar seu desenho.";
  } catch {
    estadoLogin.textContent = "Login indisponível no momento. Tente recarregar a página mais tarde.";
  }
}

formulario.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  mensagem.textContent = "";
  limparDesenho();
  const numero = Number(campoNumero.value);
  if (!Number.isInteger(numero) || numero < 1 || numero > 100) {
    mensagem.textContent = "Digite um número inteiro entre 1 e 100.";
    return;
  }

  const versaoAtual = versao;
  botaoGerar.disabled = true;
  botaoGerar.textContent = "Gerando…";
  try {
    const headers = { "Content-Type": "application/json" };
    if (idToken) headers.Authorization = "Bearer " + idToken;
    const resposta = await fetch("/api/desenho", {
      method: "POST", headers, body: JSON.stringify({ numero }),
    });
    if (versaoAtual !== versao) return;
    if (resposta.status === 400) {
      mensagem.textContent = "Digite um número inteiro entre 1 e 100.";
      return;
    }
    if (resposta.status === 401) {
      sairDaConta();
      mensagem.textContent = "Entre com sua conta Google para gerar o desenho. Se já entrou, faça login novamente.";
      return;
    }
    if (!resposta.ok) throw new Error("Não foi possível gerar o desenho.");
    if (!resposta.headers.get("Content-Type")?.startsWith("image/svg+xml")) {
      throw new Error("Resposta inesperada.");
    }
    const svg = await resposta.text();
    if (versaoAtual !== versao) return;
    svgAtual = svg;
    area.innerHTML = svgAtual;
    botaoBaixar.hidden = false;
  } catch {
    if (versaoAtual === versao) mensagem.textContent = "Não foi possível gerar o desenho. Confira sua conexão e tente novamente.";
  } finally {
    botaoGerar.disabled = false;
    botaoGerar.textContent = "Desenhar";
  }
});

campoNumero.addEventListener("input", limparDesenho);
botaoSair.addEventListener("click", () => {
  sairDaConta();
  mensagem.textContent = "";
});

botaoBaixar.addEventListener("click", () => {
  if (!svgAtual) return;
  // Salva a resposta sem modificar nenhum byte do SVG.
  const arquivo = new Blob([svgAtual], { type: "image/svg+xml" });
  const url = URL.createObjectURL(arquivo);
  const link = document.createElement("a");
  link.href = url;
  link.download = "exemplo.svg";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

prepararLogin();
