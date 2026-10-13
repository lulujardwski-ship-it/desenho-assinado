import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { onRequest } from "../functions/api/desenho.js";
import { onRequest as config } from "../functions/api/config.js";
import { gerarDesenho } from "../lib/desenho.js";

const clientId = "cliente-de-teste.apps.googleusercontent.com";
const env = { GOOGLE_CLIENT_ID: clientId };
// Fixture artificial: nao e uma credencial Google real.
const tokenTeste = "token-artificial-para-teste";
function contexto({ method = "POST", body = '{"numero":81}', auth = "Bearer " + tokenTeste, ambiente = env } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) headers.Authorization = auth;
  const init = { method, headers };
  if (method !== "GET" && method !== "HEAD" && body !== undefined) init.body = body;
  return { request: new Request("https://site.example/api/desenho", init), env: ambiente };
}
function identidade(alteracoes = {}) {
  return {
    aud: clientId,
    email_verified: "true",
    email: "aluno@example.com",
    exp: String(Math.floor(Date.now() / 1000) + 3600),
    ...alteracoes,
  };
}

for (const method of ["GET", "HEAD", "PUT", "PATCH", "DELETE", "OPTIONS"]) {
  test(method + " retorna 405 antes de validar corpo e token", async (t) => {
    const fetchMock = t.mock.method(globalThis, "fetch", () => { throw new Error("Google nao deve ser chamado"); });
    const resposta = await onRequest(contexto({ method, body: "{", auth: "" }));
    assert.equal(resposta.status, 405);
    assert.equal(resposta.headers.get("Allow"), "POST");
    assert.equal(fetchMock.mock.callCount(), 0);
  });
}

for (const [nome, body] of [
  ["corpo vazio", ""], ["JSON invalido", "{"], ["numero ausente", "{}"],
  ["null", "null"], ["array", "[]"], ["string", '"81"'],
  ["numero como string", '{"numero":"81"}'], ["decimal", '{"numero":1.5}'],
  ["zero", '{"numero":0}'], ["negativo", '{"numero":-1}'],
  ["acima de 100", '{"numero":101}'], ["booleano", '{"numero":true}'],
  ["infinito", '{"numero":1e999}'],
]) {
  test(nome + " retorna 400 antes de validar token", async (t) => {
    const fetchMock = t.mock.method(globalThis, "fetch", () => { throw new Error("Google nao deve ser chamado"); });
    const resposta = await onRequest(contexto({ body, auth: "" }));
    assert.equal(resposta.status, 400);
    assert.ok((await resposta.json()).erro);
    assert.equal(fetchMock.mock.callCount(), 0);
  });
}

for (const auth of ["", "Basic abc", "Bearer", "Bearer dois tokens"]) {
  test("cabecalho de autenticacao invalido: " + JSON.stringify(auth), async (t) => {
    const fetchMock = t.mock.method(globalThis, "fetch", () => { throw new Error("Google nao deve ser chamado"); });
    const resposta = await onRequest(contexto({ auth }));
    assert.equal(resposta.status, 401);
    assert.ok((await resposta.json()).erro);
    assert.equal(fetchMock.mock.callCount(), 0);
  });
}

test("Client ID ausente nao aceita autenticacao", async (t) => {
  const fetchMock = t.mock.method(globalThis, "fetch", () => { throw new Error("Google nao deve ser chamado"); });
  assert.equal((await onRequest(contexto({ ambiente: {} }))).status, 401);
  assert.equal(fetchMock.mock.callCount(), 0);
});

for (const status of [400, 401, 500]) {
  test("tokeninfo com status " + status + " retorna 401", async (t) => {
    t.mock.method(globalThis, "fetch", async () => new Response("{}", { status }));
    assert.equal((await onRequest(contexto())).status, 401);
  });
}

for (const [nome, alteracoes] of [
  ["audiencia diferente", { aud: "outro-client-id" }],
  ["e-mail nao verificado", { email_verified: "false" }],
  ["email_verified booleano", { email_verified: true }],
  ["token expirado", { exp: "1" }],
  ["expiracao ausente", { exp: undefined }],
  ["expiracao invalida", { exp: "abc" }],
  ["e-mail ausente", { email: undefined }],
  ["e-mail vazio", { email: "" }],
]) {
  test(nome + " retorna 401", async (t) => {
    t.mock.method(globalThis, "fetch", async () => Response.json(identidade(alteracoes)));
    assert.equal((await onRequest(contexto())).status, 401);
  });
}

test("falha de rede do Google retorna 401 sem expor token", async (t) => {
  t.mock.method(globalThis, "fetch", async () => { throw new Error(tokenTeste); });
  const resposta = await onRequest(contexto());
  assert.equal(resposta.status, 401);
  assert.ok(!(await resposta.text()).includes(tokenTeste));
});

test("resposta invalida do Google retorna 401", async (t) => {
  t.mock.method(globalThis, "fetch", async () => new Response("{"));
  assert.equal((await onRequest(contexto())).status, 401);
});

for (const numero of [1, 81, 100]) {
  test("numero " + numero + " retorna SVG original assinado pelo Google", async (t) => {
    t.mock.method(globalThis, "fetch", async (url) => {
      assert.equal(url.origin + url.pathname, "https://oauth2.googleapis.com/tokeninfo");
      assert.equal(url.searchParams.get("id_token"), tokenTeste);
      return Response.json(identidade());
    });
    const resposta = await onRequest(contexto({ body: JSON.stringify({ numero, email: "falso@example.com" }) }));
    assert.equal(resposta.status, 200);
    assert.equal(resposta.headers.get("Content-Type"), "image/svg+xml");
    assert.equal(resposta.headers.get("Cache-Control"), "no-store");
    const svg = await resposta.text();
    assert.equal(svg, gerarDesenho(numero, "aluno@example.com"));
    assert.ok(!svg.includes("falso@example.com"));
  });
}

test("config expos apenas Client ID publico", async () => {
  const resposta = config({ request: new Request("https://site.example/api/config"), env: { ...env, OUTRO_DADO: "nao-expor" } });
  assert.equal(resposta.status, 200);
  assert.deepEqual(await resposta.json(), { clientId });
});

test("config sem Client ID informa indisponibilidade", () => {
  assert.equal(config({ request: new Request("https://site.example/api/config"), env: {} }).status, 503);
});

test("config rejeita POST", () => {
  assert.equal(config({ request: new Request("https://site.example/api/config", { method: "POST" }), env }).status, 405);
});

test("nenhum arquivo publico contem a funcao de geracao", async () => {
  async function conferir(diretorio) {
    for (const arquivo of await readdir(diretorio, { withFileTypes: true })) {
      const caminho = new URL(arquivo.name, diretorio);
      if (arquivo.isDirectory()) await conferir(new URL(arquivo.name + "/", diretorio));
      else assert.ok(!(await readFile(caminho, "utf8")).includes("gerarDesenho"), arquivo.name);
    }
  }
  await conferir(new URL("../public/", import.meta.url));
});
