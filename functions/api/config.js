// O Client ID e publico. Nenhum token ou segredo e exposto por esta rota.
export function onRequest({ request, env }) {
  const headers = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };
  if (request.method !== "GET") {
    return new Response(JSON.stringify({ erro: "Use o método GET." }), {
      status: 405,
      headers: { ...headers, Allow: "GET" },
    });
  }
  const clientId = typeof env?.GOOGLE_CLIENT_ID === "string" ? env.GOOGLE_CLIENT_ID.trim() : "";
  if (!clientId) {
    return new Response(JSON.stringify({ erro: "Login indisponível no momento." }), { status: 503, headers });
  }
  return new Response(JSON.stringify({ clientId }), { status: 200, headers });
}
