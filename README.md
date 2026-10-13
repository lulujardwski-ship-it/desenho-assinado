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
| evidencias/exemplo.svg | SVG baixado do site pelo aluno, numero 81, assinado pela conta Google. |

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
- [x] GOOGLE_CLIENT_ID configurado no ambiente Production e aplicado em novo deployment.
- [x] Fluxo de login e geracao no site concluido pelo aluno; SVG baixado e conferido.
- [x] SVG gerado com o numero 81, derivado do RA 2026107781, baixado e
  salvo em evidencias/exemplo.svg.
- [x] Evidencia commitada na branch main.

O botao Baixar SVG salva a resposta original como exemplo.svg, sem alterar
o desenho. A evidencia recebida do aluno foi preservada sem modificar
nenhum byte e corresponde ao desenho original para o numero 81.

## Verificacao em 13/10/2026

Os 44 testes locais passaram. No site publicado foram verificados:

- GET e PUT em /api/desenho: 405.
- POST com corpo vazio, JSON invalido, numero ausente, decimal ou maior que 100: 400.
- POST com numero 81 sem token e com token artificial invalido: 401.
- Pagina inicial e public/script.js publicado como /script.js: 200.
- /desenho.js, /lib/desenho.js e /functions/api/desenho.js: 404.
- Nenhuma dessas respostas publicas contem gerarDesenho.

Depois de configurar GOOGLE_CLIENT_ID em Production e fazer um novo
deployment, /api/config passou a responder 200 com o Client ID completo.
Os testes de metodo, corpo, token ausente e token artificial invalido foram
repetidos nessa publicacao e retornaram 405, 400, 401 e 401.

O aluno concluiu o fluxo no site, fez o download e enviou o exemplo.svg.
A evidencia usa data-numero="81" e a assinatura lulujardwski@gmail.com.
A comparacao byte a byte com gerarDesenho(81, "lulujardwski@gmail.com")
foi identica. O arquivo tem 19.779 bytes e 237 segmentos.

SHA-256 do arquivo original recebido:
1049a90cb103b6f720773aaffecb45035db9dd50d47f09c9116109421587afd4

O token real ficou na memoria do navegador do aluno e nao foi enviado
para o repositorio. Os testes locais usam respostas simuladas do Google;
o teste manual do login foi realizado pelo aluno no site publicado.

## Conferencia da entrega

O repositorio e o site publicado estao prontos para a verificacao do
professor. Entregar os links registrados nas linhas Nome:, RA: e URL:,
conforme as orientacoes da disciplina. Manter o site e o OAuth Client
disponiveis durante a correcao.

## Documentacao

- https://developers.cloudflare.com/pages/functions/
- https://developers.cloudflare.com/pages/functions/bindings/#environment-variables
- https://developers.google.com/identity/gsi/web/guides/display-button
- https://developers.google.com/identity/gsi/web/guides/verify-google-id-token
