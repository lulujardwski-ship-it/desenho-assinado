# Desenho Assinado

Nome: Luiz Henrique Weinert Jardwski
RA: 2026107781
URL: https://desenho-assinado-8dq.pages.dev/

Atividade individual de Desenvolvimento Web Pratico. O navegador recebe um
numero de 1 a 100 e um ID token do Google Identity Services. Uma Cloudflare
Pages Function verifica o token e devolve o SVG assinado com o e-mail da
conta Google verificada.

## Origem

Codigo original clonado de https://github.com/frankalcantara/2bim-Avalia1,
commit 488e076675f6e4bd16ae2172aab6c3a4d6f66113. O codigo original e sua
licenca Apache 2.0 foram preservados. O endereco alternativo
frankalcantara/desenho-assinado citado no PDF retornou 404.

A funcao original foi movida para lib/desenho.js sem alterar seu conteudo.
O desenho liga cada ponto i a ((numero + 1) * i) mod 240 na circunferencia.

## Arquivos

| Caminho | Funcao |
| --- | --- |
| public/index.html | Numero, login Google, visualizacao e download. |
| public/script.js | Login, fetch e mensagens de erro. |
| public/style.css | Aparencia da pagina. |
| lib/desenho.js | Geracao original do SVG, somente no servidor. |
| functions/api/desenho.js | POST /api/desenho. |
| functions/api/config.js | GET /api/config: retorna somente o Client ID publico. |
| tests/api.test.js | Testes locais do contrato, sem credenciais reais. |
| evidencias/exemplo.svg | PENDENTE: baixar do site publicado apos login real. |

O diretorio public/ nao contem o codigo de geracao. O token fica somente
na memoria da pagina, sem cookies, localStorage ou armazenamento no GitHub.

## Publicacao no Cloudflare Pages

1. No Cloudflare, abra Workers & Pages e crie um projeto Pages conectado ao
   GitHub, selecionando lulujardwski-ship-it/desenho-assinado.
2. Use Production branch: main, Framework preset: None, Build command:
   vazio, Build output directory: public e raiz do projeto na raiz do repo.
3. Publique e copie a URL HTTPS real. Atualize a linha URL: acima.
4. Configure o Google conforme a secao seguinte.
5. Em Settings > Variables and Secrets, adicione GOOGLE_CLIENT_ID como
   variavel de texto no ambiente Production, com o Client ID do Google.
   Se usar Preview, configure tambem esse ambiente e suas origens.
6. Salve e faca um novo deployment para aplicar a configuracao.

As Functions sao implantadas a partir de functions/ na raiz. Nao coloque
lib/, functions/, tokens ou arquivos .env dentro de public/.

## Login Google

1. Acesse https://console.cloud.google.com/ e selecione ou crie um projeto.
2. Configure nome do aplicativo, contato e publico no Google Auth Platform.
   Se usar modo de teste, permita as contas que testarao o aplicativo,
   inclusive a do professor, ou ajuste a publicacao para permitir o teste.
3. Em Clients, crie um OAuth client ID do tipo Web application.
4. Cadastre a origem exata do site em Authorized JavaScript origins:
   protocolo e dominio, sem caminho. O projeto usa popup com callback
   JavaScript e nao usa uma rota de redirecionamento OAuth.
5. Copie o Client ID terminado em .apps.googleusercontent.com para
   GOOGLE_CLIENT_ID no Cloudflare. Nao precisamos de Client Secret.

O navegador consulta /api/config para usar esse mesmo Client ID no botao.
Essa rota nunca retorna outras variaveis de ambiente.

## Contrato da API

POST /api/desenho com Content-Type: application/json,
Authorization: Bearer <id_token> e corpo {"numero":42}.

| Status | Significado |
| --- | --- |
| 405 | Metodo diferente de POST; Allow: POST. |
| 400 | Corpo ausente, JSON invalido ou numero ausente, nao inteiro ou fora de 1 a 100. |
| 401 | Token ausente/invalido/expirado, audiencia incorreta ou e-mail nao verificado. |
| 200 | SVG original com Content-Type: image/svg+xml e e-mail retornado pelo Google. |

Ordem de validacao: metodo, corpo, token. Um POST com numero invalido e sem
token retorna 400. A verificacao chama
https://oauth2.googleapis.com/tokeninfo?id_token=...
e exige status 200, aud igual ao GOOGLE_CLIENT_ID, email_verified igual a
"true" e expiracao futura. Qualquer campo de e-mail enviado no JSON e ignorado.

## Testes locais

Com Node.js 22 ou superior, execute npm test. Os testes usam respostas
simuladas do Google e nao substituem o login e os testes no site publicado.

Para executar as Pages Functions localmente, use:
npx wrangler pages dev public --binding GOOGLE_CLIENT_ID=SEU_CLIENT_ID_PUBLICO

Cadastre http://localhost:8788 como origem autorizada para testar o login
local. Abrir o HTML diretamente ou usar apenas um servidor estatico nao
executa as Pages Functions.

## Conclusao da entrega

- [x] Codigo original clonado e licenca preservada.
- [x] Nome e RA preenchidos.
- [x] Funcao de desenho movida para o servidor.
- [x] API e mensagens de erro implementadas.
- [x] Site publicado no Cloudflare Pages e URL real preenchida acima.
- [x] OAuth Client do tipo Web application criado no Google Cloud.
- [x] Testes 405, 400 e 401 executados no site publicado.
- [ ] GOOGLE_CLIENT_ID configurado no ambiente Production e aplicado em novo deployment.
- [ ] Login real com Google e resposta 200 com SVG no site publicado.
- [ ] SVG gerado com os dois ultimos digitos do RA (00 vira 100), baixado e
  salvo em evidencias/exemplo.svg.
- [ ] Evidencia commitada na branch main antes do prazo.

O botao Baixar SVG salva a resposta original como exemplo.svg, sem alterar
o desenho. A evidencia ainda nao existe e deve ser obtida no site publicado
apos autenticacao real, conforme o enunciado.

## Verificacao em 13/10/2026

Os 44 testes locais passaram. No site publicado foram verificados:

- GET e PUT em /api/desenho: 405.
- POST com corpo vazio, JSON invalido, numero ausente, decimal ou maior que 100: 400.
- POST com numero 81 sem token e com token artificial invalido: 401.
- Pagina inicial e public/script.js publicado como /script.js: 200.
- /desenho.js, /lib/desenho.js e /functions/api/desenho.js: 404.
- Nenhuma dessas respostas publicas contem gerarDesenho.

A rota /api/config retornou 503 com "Login indisponivel no momento".
O GOOGLE_CLIENT_ID ainda nao esta ativo no deployment verificado.
Os testes de 401 nessa publicacao nao comprovam a consulta real ao Google,
pois a configuracao ausente tambem resulta em 401. O teste com login real
e resposta 200 continua pendente.

### Proxima etapa

1. Copiar o ID do cliente OAuth criado no Google Cloud (terminado em
   .apps.googleusercontent.com).
2. No projeto Pages, abrir Settings > Variables and Secrets > Add,
   selecionar Production e salvar GOOGLE_CLIENT_ID com esse ID.
3. Fazer um novo deployment e conferir que /api/config retorna 200.
4. Conferir a origem autorizada https://desenho-assinado-8dq.pages.dev
   no OAuth Client do Google.
5. Abrir o site, entrar com Google, usar o numero **81** (RA 2026107781),
   clicar em Desenhar e depois Baixar SVG.
6. Fazer commit do arquivo baixado em evidencias/exemplo.svg na branch main.

## Documentacao

- https://developers.cloudflare.com/pages/functions/
- https://developers.cloudflare.com/pages/functions/bindings/#environment-variables
- https://developers.google.com/identity/gsi/web/guides/display-button
- https://developers.google.com/identity/gsi/web/guides/verify-google-id-token
