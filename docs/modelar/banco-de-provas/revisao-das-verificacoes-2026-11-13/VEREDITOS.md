# Vereditos por gate e por grupo de testes

Junta o [mapa](MAPA.md), os [sinais de fragilidade](FRAGILIDADE.md), o [histórico](HISTORICO.md), o [piloto](mapa-e-piloto.md) e a [medida por estrago](ESTRAGOS.md). Cada veredito é um de três: protege, protege mas é frágil, ou não pega nada. Quando não há número que sustente nenhum dos três, o veredito é "sem medida", e isso é dito em vez de ser adivinhado. Os números do histórico são piso: o teste que reprova na máquina e é corrigido antes do commit não deixa rastro.

## Gates

| Gate | Veredito | O número |
|---|---|---|
| `bancada:guardas` | protege | 3 defeitos reais no histórico (`13dece65`, `161c4c87`, `23a05ec0`), nenhum falso alarme |
| `docs:citacoes:check` | protege | 3 defeitos reais (`2d0ddd90`, `7079ab72`, `b69780f9`) |
| `nome:check` | protege | 1 defeito real (`92614dfe`) |
| `mcp:visual:check` | protege mas é frágil | pegou receitas com campo recusado (`ba4d071d`); os três testes de `tools/mcp/` somam 28 mudanças só de literal; na medida por estrago, 19 de 49 percebidos nos dois perfis e `mcp.test.mjs` 0 de 25 |
| `guarda:tempo` e os tetos de tempo da bateria | protege mas é frágil | 2 defeitos reais (`e3445a23`, `8bd5717f`) contra 8 falsos alarmes; 199 tetos fixos em 63 arquivos |
| `origens:check` | não pega nada no caso medido | aprovou "0 de 0 peça(s)" calado na remoção da bicicleta (`73ee0a73`) |
| `test:rapidos` | protege mas é frágil | 51% dos estragos percebidos nesta medida e 61% no piloto; 187 contagens exatas e 194 citações de peça; o falso alarme do teto de 2026-10-22 a 24 (`c2b908cc`) |
| `test:lentos` | sem medida | não rodou contra estragos; 8 dos falsos alarmes de tempo vêm de testes pesados |
| `guarda:acervo`, `familias:check`, `guarda:referencial`, `essenciais:check` | sem medida | nenhum caso no histórico; `essenciais:check` tem teste que percebeu 1 de 20 estragos do `espelha` |
| os demais gates de documento e mapa (`mapa:check`, `reguas:check`, `docs:toc:check`, `docs:links:check`, `planos:check`, `decisoes:check`, `docs:estrutura:check`, `mecanismos:check`, `leitura:obrigatoria`, `catalogo:check`, `ferramentas:check`, `banco-de-provas:check`, `calibracao:check`) | sem medida | nenhum caso no histórico; `calibracao:check` teve 2 falsos alarmes pela lista fixa de perfis (`d392aa8d`, `46576af8`) e fica como frágil |
| `typecheck`, `build`, `arquitetura:check`, `arquitetura:motor:check`, `bancada:fronteira:check` | sem medida | nenhum caso no histórico |

## Grupos de testes

| Grupo | Veredito | O número |
|---|---|---|
| Réguas de malha (`tools/modelar/reguas-de-malha/`) | protege | `face-torcida.test.mjs` 14 de 18 estragos reais; no piloto, `face-degenerada` com a maioria percebida; régua de face degenerada teve 1 falso alarme (`6c63ed9c`) |
| Núcleo, caminho comum das operações | protege | `gaiola-varrida.test.mjs` 18 de 23 reais; `subdivisao` 13 de 20; o teste com o nome da operação é o que percebe |
| Núcleo, recusas e guardas de entrada | não pega nada | 33 recusas ou `throw` tirados sem reprovação em `subdivisao`, `friso`, `espelha` e `contatos-da-peca`, somados aos 16 do piloto; o modo estrutural do `espelha`, 7 de 7 não percebidos |
| Contatos e encosto (`src/autoria/contato*`, `encosto*`) | protege mas é frágil | 12 de 25; seis `throw` de entrada sem teste; dois arquivos ligados percebem 0 |
| Servidor de ferramentas (`tools/mcp/`) | protege mas é frágil | 19 de 49 estragos; 28 mudanças só de literal no histórico, as maiores do projeto; os estragos não percebidos são schema, códigos de saída e paginação |
| Testes que citam peça do acervo (furgão, avião e outros 25) | protege mas é frágil | `gaiola-varrida.test.mjs`, que cita o furgão, percebeu 18 de 23; 194 citações em 60 arquivos, e a remoção da bicicleta derrubou 8 testes presos a ela |
| Testes ligados de longe a um arquivo do núcleo | não pega nada para aquele arquivo | dos 43 testes rodados contra o `espelha`, 38 perceberam 0 de 20; do `friso`, 16 de 21 perceberam 0 |
| Pisos e contagens ligados ao acervo | não pega nada e é frágil | 6 linhas em 3 arquivos; o piso de 500 materiais reprovou o CI em 2026-11-13 sem defeito |
| Só não lançou erro | sem medida | 7 blocos, três com a afirmação certa; nenhum foi exercitado por estrago |

## Recomendação

Nenhum teste é recomendado para sair. O que mais se aproxima é `tools/mcp/mcp.test.mjs` como guarda de `tools/mcp/perfis/procedural.mjs`, que não percebeu nenhum dos 25 estragos desse arquivo; mas ele confere outros perfis, que não foram estragados, e pegou no CI as receitas com campo recusado (`ba4d071d`), de modo que sai só se uma medida sobre os outros perfis também der zero. Os 38 testes ligados de longe ao `espelha` não percebem estrago dele, e isso diz que não servem de guarda daquele arquivo, e não que não guardam o que testam.

O que falta é teste de recusa. Recomendo, num plano ou correção pontual depois da decisão, um teste por recusa de entrada nas operações do núcleo e em `contatos-da-peca.js`, que passe a entrada ruim e confira o campo citado na recusa, começando pelo modo estrutural do `espelha`, pelas 13 recusas de `subdivisao` e `friso` e pelos seis `throw` de contatos; um teste do schema e dos códigos de saída de `parametros.mjs` e da paginação de `procedural.mjs`; e um espelho em plano fora da origem. Os dois estragos do `friso` que fazem a operação entrar em laço sem fim mostram que a leitura da linha do friso não tem limite de voltas; isso vale um teste que passe a entrada estragada e um prazo na própria operação.

Os tetos de tempo e os pisos de acervo continuam o maior custo em falso alarme (8 de 12 casos); a mudança dos tetos é do plano das melhorias de processo, e os 6 pisos de acervo podem virar conferência relativa ao tamanho lido do acervo.

O processo não teria pego sozinho a falta de teste de recusa: nenhum gate confere que uma recusa é exercitada. Se a pessoa quiser, o script de estragos pode virar uma régua por amostra rodada fora do CI, que é o que o plano adia até a medida se repetir.

A decisão da pessoa por grupo ainda não está registrada.

## Decisão da pessoa (2026-11-14)

A pessoa seguiu a recomendação para todos os grupos: nenhum teste sai, os grupos que protegem e os que protegem mas são frágeis ficam como estão, e o que falta vira o plano [testes das recusas e dos pontos sem proteção](../../planos/2026-11-14-testes-das-recusas.md), com o teste de cada recusa de entrada, o modo estrutural e o plano fora da origem do `espelha`, o schema de `parametros`, a paginação de `procedural.mjs`, os pisos do acervo lidos do tamanho do acervo, o limite de voltas no `friso` e um gate que confere que cada recusa é exercitada.
