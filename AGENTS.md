# Mecanifica — instruções para agentes

Comece por `docs/mecanifica/INDEX.md`. Ele informa o estado atual, a hierarquia
das fontes e quais documentos ler para cada tipo de tarefa. Não leia todo o
legado por padrão.

Antes de alterar núcleo procedural, plano, atritos ou identidades enquanto houver
trabalho paralelo em `brigsd/nos-mecanifica`, leia
`docs/mecanifica/COORDENACAO-REPOS.md` e a issue viva indicada ali. Declare sua
intenção antes do primeiro commit de comportamento.

## Fonte de verdade

- `docs/mecanifica/` governa o produto Mecanifica.
- `docs/mecanifica/PLANO.md` é o único roteiro vigente.
- `docs/uso/`, `docs/rumo/` e `docs/historico/` descrevem o NÓS herdado. Use-os
  somente quando a tarefa tocar no núcleo procedural ou exigir contexto histórico.
- Se dois documentos divergirem, o material de `docs/mecanifica/` prevalece para
  este produto.

## Regras essenciais

- Preserve o núcleo, as peças e o jogo de referência em `prototipos/fps/v3/`.
  A Oficina humana (`oficina.html` e a antiga aba de som) foi removida de
  propósito e não deve ser recriada no Mecanifica.
- Mantenha o núcleo de autoria independente de Three.js e do domínio automotivo.
- Nunca persista UUIDs do Three.js, índices de arrays ou posições de passos como
  identidade.
- Toda parte relevante recebe identidade semântica estável.
- Conteúdo salvo deve ser determinístico, versionado, reexecutável e validável.
- Modele e revise peças na bancada neutra antes de levá-las à experiência do
  cliente.
- Mudanças gerais que possam voltar ao NÓS devem permanecer isoladas e ser
  registradas em `docs/mecanifica/UPSTREAM-NOS.md`.

## Qualidade e documentação

- Use pt-BR para documentação e nomes de domínio.
- Rode testes proporcionais ao risco; para a verificação completa, use os
  comandos indicados em `docs/mecanifica/INDEX.md`.
- Confira trabalho visual no navegador em mais de um enquadramento.
- Atualize o plano quando uma fase mudar de estado e o índice quando mudar a
  porta de entrada, a estrutura principal ou o próximo passo.
- Não edite `docs/uso/MAPA.md` à mão; regenere com `npm run mapa`.
