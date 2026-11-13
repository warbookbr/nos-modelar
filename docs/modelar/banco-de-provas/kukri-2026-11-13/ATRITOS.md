# Kukri: custo medido e atritos

## Custo

A pessoa aprovou a forma por imagem em 2026-11-13, na terceira rodada, com dois achados do crítico em aberto por decisão dela (barriga da lâmina um pouco estreita e guarda do cabo discreta, nota 8).

| Rodada | Tempo do modelador | O que mudou | Receita |
|---|---|---|---|
| 1 | 8 min | primeira forma, lâmina e cabo por gaiola de laços, furo por subtração | 9 passos, 260 linhas |
| 2 | 5 min | dorso com quebra, ponta afinada, gomos fundos, cabo mais grosso, guarda sobre a lâmina, material | 287 linhas |
| 3 | 1 min | canto da quebra do dorso suavizado, pedido da pessoa | 297 linhas |

O alinhamento levou quatro perguntas à pessoa. A modelagem somou 14 minutos em três rodadas, com dois despachos do crítico visual. O que mais custou fora da modelagem foi a condução: o pacote do crítico recusado por falta do Blender, a leitura invertida da foto na primeira crítica e o contorno de referência errado no dorso.

Para comparação, o plano do furgão realista conta as rodadas em horas e dezenas por parte. A faca ficou duas ordens de grandeza abaixo, e a forma saiu na primeira rodada reconhecível como o objeto.

## Atritos

1. A peça com passo `subdivisao` é tratada como lataria, e `npm run vistas:critica -- kukri` recusou o pacote por falta do Blender, que não está instalado na máquina da sessão.
   Custo: uma parada para a pessoa decidir, cerca de 10 minutos.
   O processo pegou: sim, a recusa de `vistas:critica`; a regra é que estava larga demais para o objeto.
   Destino: backlog, a regra de `src/autoria/lataria.js` reconhecer a peça maciça pequena sem pedir dispensa à pessoa.

2. O crítico visual leu a foto em diagonal como se estivesse reta e inverteu dorso e gume em dois achados da primeira crítica; `pedido.md` descreve a referência externa como "olha de -y; +x à direita", o que não vale para foto girada.
   Custo: uma rodada de conferência de quem conduz.
   O processo pegou: não.
   Destino: ferramenta, `--referencia` de `tools/modelar/vistas-para-critica.mjs` aceitar a descrição da orientação da foto; está na fatia 5 do plano da forma exata.

3. O contorno de referência (`referencias/contorno-derivado.json`) foi levantado da foto a olho pelo modelador e dá o dorso curvo; a pessoa olhou a foto e o dorso é reto. `npm run -s silhueta:desvio -- kukri --referencia=procedural/pecas/kukri/referencias/contorno-derivado.json --plano=xz` acusa até 7,3 mm de falta que não existe.
   Custo: um pedido errado de quem conduz à pessoa, corrigido por ela.
   O processo pegou: não.
   Destino: instrução, o contorno de referência sai do módulo de contorno da imagem e a pessoa o confere sobre a foto antes de valer como medida; entra no plano da forma exata.

4. Os números de proporção do crítico (largura sobre comprimento de 0,4 na primeira crítica, 18% contra 23% na segunda) vêm sem método e não batem com a medida na foto (0,25).
   Custo: uma conferência do modelador na segunda rodada.
   O processo pegou: não.
   Destino: ferramenta, o desvio de silhueta em milímetro (`tools/modelar/silhueta-contra-referencia.mjs`).

5. Não há operação para chapa de contorno com chanfro de gume nem para corpo de seção variável com sulcos; a lâmina e o cabo saíram por `gaiolaPorLacos` com a seção escrita à mão, e o furo por `subtrair` deixa 12 faces finas no cabo (`npm run -s malha:lascas -- kukri`).
   Custo: a maior parte das 297 linhas da receita.
   O processo pegou: sim para as faces finas, pelo aviso do `descrever`; não para a falta da operação.
   Destino: ferramenta, fatia 2 do plano da forma exata.

6. A gaiola por laços exige no mínimo 2,5 mm entre laços e a tampa recusa contorno colapsado, o que impede a ponta aguda de fechar num ponto.
   Custo: tentativas na segunda rodada.
   O processo pegou: sim, a recusa da operação.
   Destino: backlog, junto da fatia 2 do plano da forma exata.

7. A vista inferior da bancada sai sem luz e a lâmina escura fica preta, sem mostrar o chanfro.
   Custo: uma vista inútil por rodada.
   O processo pegou: não.
   Destino: backlog, luz de preenchimento nas vistas de baixo da bancada.

8. O canto de um contorno de chapa não tem opção de raio: o modelador escreveu uma curva de Bézier à mão para suavizar a quebra do dorso, e o ponto de conferência declarado no canto vivo passou a desviar 0,74 mm.
   Custo: um minuto, e um ponto de conferência perto da tolerância.
   O processo pegou: sim para o ponto, pelo `conferir-pontos`.
   Destino: ferramenta, fatia 2 do plano da forma exata.

9. O laço (`node tools/modelar/rodada-de-modelagem.mjs kukri --acao`) segue pedindo "modelar" pelos dois achados do crítico depois de a pessoa aprovar a forma; a peça solta não tem o aceite humano que a etapa de montagem tem.
   Custo: nenhum nesta peça.
   O processo pegou: não.
   Destino: backlog, aceite da pessoa registrado no laço da peça solta.

10. O modelador entregou a segunda rodada sem o bloco de registro, e `--registrar` recusou a transcrição.
    Custo: a segunda rodada ficou sem registro próprio; a rodada gravada é a terceira.
    O processo pegou: sim, a recusa de `--registrar`.
    Destino: instrução, já coberta por `.claude/agents/modelador.md`; quem conduz pede o bloco no despacho.
