import { gerarDesenho, numeroValido } from "../../lib/desenho.js";

function erro(status, mensagem) {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  };
  if (status === 405) headers.Allow = "POST";
  return new Response(JSON.stringify({ erro: mensagem }), { status, headers });
}

export async function onRequest({ request, env }) {
  // A ordem faz parte do contrato: metodo, corpo e, por ultimo, token.
  if (request.method !== "POST") return erro(405, "Use o método POST.");

  let corpo;
  try {
    corpo = await request.json();
  } catch {
    return erro(400, "Envie um JSON com um número inteiro entre 1 e 100.");
  }
  if (!corpo || !numeroValido(corpo.numero)) {
    return erro(400, "Digite um número inteiro entre 1 e 100.");
  }

  const bearer = /^Bearer\s+(\S+)$/i.exec(request.headers.get("Authorization") || "");
  const clientId = typeof env?.GOOGLE_CLIENT_ID === "string" ? env.GOOGLE_CLIENT_ID.trim() : "";
  const mensagemLogin = "Entre com sua conta Google para gerar o desenho. Se já entrou, faça login novamente.";
  if (!bearer || !clientId) return erro(401, mensagemLogin);

  let identidade;
  try {
    const url = new URL("https://oauth2.googleapis.com/tokeninfo");
    url.searchParams.set("id_token", bearer[1]);
    const resposta = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    });
    if (resposta.status !== 200) return erro(401, mensagemLogin);
    identidade = await resposta.json();
  } catch {
    return erro(401, mensagemLogin);
  }

  if (
    !identidade ||
    identidade.aud !== clientId ||
    identidade.email_verified !== "true" ||
    typeof identidade.email !== "string" ||
    identidade.email.trim() === "" ||
    !Number.isFinite(Number(identidade.exp)) ||
    Number(identidade.exp) <= Date.now() / 1000
  ) return erro(401, mensagemLogin);

  // Somente o e-mail retornado pelo Google pode assinar o desenho.
  return new Response(gerarDesenho(corpo.numero, identidade.email), {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
