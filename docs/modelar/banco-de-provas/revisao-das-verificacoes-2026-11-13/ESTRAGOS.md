# A medida por estrago de código, ampliada (passo 2)

Medido em 2026-11-14 na cópia `revisao-testes`, sobre a main de 2026-11-13. Cada estrago é uma alteração de uma linha no arquivo de código (trocar `<` por `<=` e o inverso, `===` por `!==`, `&&` por `||`, `+` por `-`, dobrar um número ou trocar 0 por 1, devolver `undefined`, trocar a condição de uma recusa `return grita(...)` por falso, tirar um `throw`, inverter a condição de um `if (...) return`). O texto entre aspas não é estragado. O script de rascunho gera todos os candidatos que passam em `node --check`, escolhe até metade entre recusas e guardas e o resto espalhado pelo arquivo, aplica um por vez, roda só os testes ligados, registra quais arquivos de teste reprovaram e desfaz com `git checkout` do arquivo antes do próximo. Ao fim, `git status` da cópia mostrou só os documentos desta pasta.

Os testes ligados a cada arquivo são os que o importam pelo grafo de imports, contado por um leitor de imports relativos. Para os arquivos do núcleo o grafo inteiro dá de 342 a 347 testes por arquivo, quase toda a suíte, e a medida ficou com os testes a até dois imports de distância somados aos que citam a operação pelo nome, sem os da lista `TESTES_LENTOS`. Para `tools/mcp/perfis/procedural.mjs` nenhum teste o importa: `tools/mcp/procedural.test.mjs` e `tools/mcp/mcp.test.mjs` sobem o servidor como processo filho, e foram esses dois os rodados. O gate `mcp:visual:check` declara esses testes no seletor pela pasta `tools/mcp/`, de modo que a ligação existe na bateria e só o grafo de imports não a vê.

## O resultado por arquivo

| Arquivo (trecho) | Testes rodados | Estragos | Percebidos | Não percebidos | Equivalentes | Não percebidos reais | Segundos |
|---|---|---|---|---|---|---|---|
| `tools/mcp/perfis/parametros.mjs` | 1 | 24 | 10 | 14 | 0 | 14 | 78 |
| `tools/mcp/perfis/procedural.mjs` | 2 | 25 | 9 | 16 | 0 | 16 | 1014 |
| `src/autoria/contatos-da-peca.js` | 8 | 25 | 12 | 13 | 0 | 13 | 240 |
| `procedural/nucleo/operacoes/subdivisao.js` (operação, linhas 318 a 432) | 12 | 20 | 13 | 7 | 0 | 7 | 230 |
| `procedural/nucleo/operacoes/friso.js` (operação, linhas 400 a 560) | 21 | 20 | 9 | 11 | 0 | 11 | 1057 |
| `procedural/nucleo/operacoes/transformacoes.js` (`espelha`, linhas 231 a 315) | 43 | 20 | 5 | 15 | 0 | 15 | 1229 |
| `tools/modelar/reguas-de-malha/face-torcida.mjs` | 2 | 20 | 14 | 6 | 2 | 4 | 108 |
| `procedural/nucleo/gaiola-varrida.js` (testes citam o furgão) | 1 | 25 | 18 | 7 | 2 | 5 | 77 |
| Total | | 179 | 90 | 89 | 4 | 85 | 4033 |

Dos 179 estragos, 90 foram percebidos (50%). Tirando os 4 equivalentes, 90 de 175 (51%). Somado ao piloto de [mapa-e-piloto.md](mapa-e-piloto.md), são 273 estragos em 20 arquivos, 147 percebidos (54%).

Dois dos 9 percebidos do `friso` só o foram porque o teste travou: o estrago na linha 405 (`&&` por `||` no filtro das chaves da linha) e o da linha 422 (o número 2 do tamanho da lista trocado por 4) fazem a operação entrar em laço sem fim. Nenhuma conferência reprovou; o processo foi parado pelo prazo do script. Na bateria real o prazo do vitest não interrompe um laço síncrono, e o CI ficaria parado até o prazo do job. Contam aqui como percebidos, mas não por um teste que diga o que quebrou.

## Os não percebidos, lidos um a um

`parametros.mjs`, 14 reais. Sete são os limites do schema de entrada (`min(1)` por `min(2)` nas linhas 18, 22, 27, 30, 33 e 34, e o `delta` da linha 28 com `gt(1).lt(1)`, que torna toda entrada de `delta` inválida). Nenhum teste passa entrada ruim nem entrada no limite ao schema. Três são os padrões de `mostrar` e `delta` (linhas 84, 93 e 147), três são os códigos de saída `codigo: 0` e `codigo: 2` (linhas 74, 115 e 150), e um é a conversão de unidade da linha 142, que com o estrago devolve 0 ou NaN em vez de `null` para o valor ausente.

`procedural.mjs`, 16 reais. Os códigos de saída de `respostaOk` e `respostaErro` (linhas 11, 14 e 16) trocados não são percebidos. O `detalhe: 'completo'` (linhas 32, 38 e 63), o cálculo de `truncado` e de `controle` (42 e 54), a conta do restante para descartes (62) e o campo `descartesOmitidos` do resumo (71 e 72) não têm teste que os leia, e o limite padrão de 8 itens (linha 101) também não. Os testes conferem a lista de ferramentas e o formato da resposta, e não o que o controle de paginação diz.

`contatos-da-peca.js`, 13 reais. Seis são `throw` de entrada inválida tirados sem que nada reprove (linhas 76, 83, 118, 123, 186 e 188: malha sem `V` e `F`, parte de tipo errado, item que não é objeto, `par` malformado, opções inválidas, opção desconhecida). O piloto já tinha achado as linhas 123, 149 e 158. Os outros: o tamanho mínimo do motivo (131), o sinal do limite de vizinhança (163), o contador `paresNoEscopo` (204), o padrão de penetração quando não há declaração (223), o desempate da ordenação por método (255), o campo `toleranciaNumerica` da saída (270) e a versão do formato (45), que só muda um campo da saída.

`subdivisao` (operação), 7 reais, todos na entrada: as recusas de `origemId` (320, duas), de `espessura` não positiva (343), de `lado` desconhecido (344), de erro de espessura que não seja `ErroDaEspessura` (389) e a do teto de vértices e faces (396), mais o campo `espessura` do contrato (415). O piloto tinha achado 344 e 396 pelo mesmo caminho.

`friso` (operação), 11 reais. Oito são recusas tiradas ou com o limite mudado (402 duas, 407, 414, 416, 422, 449, 521): `origemId` inválido, linha sem nome, `refinar` fora de superfície subdividida, volta fechada com menos de quatro pontos, lista de pontas malformada, perfil que se cruza, aba que se cruza. Os outros são o argumento citado na recusa vinda da leitura (440), a condição da aba com espessura (479) e o recorte dos pontos da volta fechada (491), que com o estrago perde o primeiro ponto e nenhum teste nota.

`espelha`, 15 reais. É o trecho mais desprotegido da amostra: dos 20 estragos, só os 5 da validação do `eixo` (linha 234) e do caminho comum foram percebidos. Todo o modo estrutural, com `origemId` e `derivaDe` (linhas 240, 241, 243, 245, 246, 248 e 250), não reprova nenhum teste quando a recusa é tirada. Também passam a recusa de face sem vértice (267) e de face inteira no plano do espelho (268), a ordem dos vértices (275), a contagem de vértices novos (279), o cursor dos ids novos (284) e a própria reflexão `2 * pos - p` trocada por `4 * pos - p` (289), que só é percebida com plano fora da origem; nenhum teste espelha num plano que não passe por zero.

`face-torcida.mjs`, 4 reais e 2 equivalentes. Equivalentes: a tolerância `1e-12` por `2e-12` (linha 58), que não muda nenhuma face medida, e `i + 2 < pos.count` por `<=` (73), que nunca difere porque `pos.count` é múltiplo de 3. Reais: o primeiro eixo da base local com a coordenada errada (30), o laço com uma volta a mais (40), a exceção do canto `i === 0` (42) e a ordem dos ids na saída (82).

`gaiola-varrida.js`, 5 reais e 2 equivalentes. Equivalentes: `EPS` de `1e-9` para `2e-9` (123) e a tolerância do quadro paralelo (332). Reais: o texto da recusa de raio que corta (234, só a mensagem), a recusa de `nome` vazio no marco (389), o limite das estações do trilho fechado (599), a escala do último marco lida do penúltimo (638) e o centro das seções calculado com o dobro do peso (716).

## Por teste, quantos estragos percebeu

| Teste | Arquivo estragado | Percebeu |
|---|---|---|
| `tools/mcp/perfis/parametros.test.mjs` | `parametros.mjs` | 10 de 24 |
| `tools/mcp/procedural.test.mjs` | `procedural.mjs` | 9 de 25 |
| `tools/mcp/mcp.test.mjs` | `procedural.mjs` | 0 de 25 |
| `src/autoria/contatos-da-peca.test.mjs` | `contatos-da-peca.js` | 10 de 25 |
| `src/autoria/contato-em-plano-inclinado.test.mjs` | `contatos-da-peca.js` | 5 de 25 |
| `src/autoria/contato-de-solidos-memoria.test.mjs` | `contatos-da-peca.js` | 4 de 25 |
| `src/autoria/encosto-da-peca.test.mjs` | `contatos-da-peca.js` | 4 de 25 |
| `tools/modelar/ferramentas-sobre-uniao.test.ts` | `contatos-da-peca.js` | 3 de 25 |
| `tools/modelar/ombro-uniao.test.ts` | `contatos-da-peca.js` | 2 de 25 |
| os outros 2 testes ligados a `contatos-da-peca.js` | | 0 de 25 |
| `procedural/nucleo/subdivisao.test.mjs` | `subdivisao` | 6 de 20 |
| `procedural/nucleo/subdivisao-ponto-repetido.test.mjs` | `subdivisao` | 3 de 20 |
| `procedural/nucleo/subdivisao-grupos.test.ts` | `subdivisao` | 3 de 20 |
| `procedural/nucleo/medidas-com-peso.test.mjs` | `subdivisao` | 1 de 20 |
| `procedural/nucleo/gaiola-por-estacoes.test.mjs` | `subdivisao` | 1 de 20 |
| os outros 7 testes ligados à `subdivisao` | | 0 de 20 |
| `procedural/nucleo/friso.test.mjs` | `friso` | 5 de 20 |
| `procedural/nucleo/friso-largura-variavel.test.mjs` | `friso` | 3 de 20 |
| `procedural/nucleo/friso-aba.test.mjs` | `friso` | 2 de 20 |
| `src/autoria/molduras-do-vao.test.mjs` | `friso` | 2 de 20 |
| `src/autoria/molduras-do-vao-casos-reais.test.mjs` | `friso` | 1 de 20 |
| os outros 16 testes ligados ao `friso` | | 0 de 20, fora os 2 travamentos |
| `src/autoria/portas-estendidas.test.js` | `espelha` | 4 de 20 |
| `tools/modelar/portas-espelho-arranja.test.ts` | `espelha` | 4 de 20 |
| `modulos/esboco-nucleo/tests/posicao.test.js` | `espelha` | 3 de 20 |
| `procedural/nucleo/operacoes/estouro-de-bloco.test.ts` | `espelha` | 3 de 20 |
| `tools/gates/argumentos-essenciais.test.mjs` | `espelha` | 1 de 20 |
| os outros 38 testes ligados ao `espelha` | | 0 de 20 |
| `tools/modelar/reguas-de-malha/face-torcida.test.mjs` | `face-torcida.mjs` | 14 de 20 |
| `procedural/nucleo/operacoes/furo-em-aneis.test.ts` | `face-torcida.mjs` | 5 de 20 |
| `procedural/nucleo/gaiola-varrida.test.mjs` | `gaiola-varrida.js` | 18 de 25 |

O teste com o nome do arquivo é quase sempre o que percebe mais; os ligados de longe percebem de zero a quatro. `tools/mcp/mcp.test.mjs`, que leva 42 s, não percebeu nenhum dos 25 estragos de `procedural.mjs`; o que ele confere está em outros perfis do servidor, que não foram estragados aqui.

## Arquivos e trechos sem proteção

Nenhum arquivo da amostra ficou com zero percebidos. Ficaram sem proteção estes trechos, em que nenhum teste rápido percebeu nenhum estrago:

1. O modo estrutural do `espelha` (`origemId` e `derivaDe`), `procedural/nucleo/operacoes/transformacoes.js` linhas 240 a 250, 7 de 7 estragos não percebidos, e a reflexão em plano fora da origem (linha 289).
2. As recusas de entrada de `src/autoria/contatos-da-peca.js` (linhas 76, 83, 118, 123, 186 e 188), 6 de 6 `throw` tirados sem reprovação.
3. As recusas de entrada da operação `subdivisao` (linhas 320, 343, 344, 389 e 396) e da operação `friso` (402, 407, 414, 416, 422, 449, 521): 13 recusas tiradas ou afrouxadas sem reprovação.
4. O schema de entrada de `tools/mcp/perfis/parametros.mjs` (linhas 18 a 34) e os códigos de saída dos dois perfis do servidor.
5. O controle de paginação de `tools/mcp/perfis/procedural.mjs` (`detalhe`, `truncado`, `descartesOmitidos`, limite padrão), linhas 32 a 101.

## Alcance e incerteza

A amostra é de 8 arquivos (3 deles por trecho), 179 estragos. Os testes lentos e os gates (guarda do acervo, guardas da bancada, `familias:check`) não rodaram contra os estragos; um estrago não percebido aqui pode ser pego por eles no CI, e o número é piso da proteção, não teto. Para os arquivos do núcleo a escolha dos testes ligados cortou a maior parte do grafo; o seletor real rodaria uns 340 testes para cada estrago.

## Tempo gasto

4033 s de testes nas oito medidas, mais 1200 s perdidos na primeira tentativa do `friso`, em que o estrago da linha 405 travou o teste e o script esperou o prazo de 20 minutos: perto de uma hora e meia de máquina, abaixo do limite de seis horas do pedido. Depois do travamento o script passou a chamar o vitest direto, com `--pool=threads` e parada forçada em 300 s, para que o laço sem fim não deixasse processo órfão.
