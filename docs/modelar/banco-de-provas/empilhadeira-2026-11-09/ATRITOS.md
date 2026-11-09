# Empilhadeira — atritos

Plano: [`2026-11-09-empilhadeira.md`](../../planos/2026-11-09-empilhadeira.md). Cada atrito diz como se reproduz, se o
processo o teria pego sozinho e o destino.

1. **O teste do esboço contava as opções de peça por número exato.** Cada esboço novo numa pasta de peça quebrava
   `modulos/esboco-nucleo/tests/leitor.test.js` (13, 15, 17, 18, 19 e 20 em dois dias), e quem conduz tinha de editar o
   número. O processo pegava, mas pelo motivo errado. Destino: o teste passou a exigir um piso e a conferir cada esboço,
   corrigido no mesmo commit da fatia 0.
2. **A captura do esboço falha de forma intermitente.** `npm run esboco:nucleo -- <esboço> --vista direita` (ou
   `esquerda`) falhou em todas as tentativas com `page.screenshot: Protocol error (Page.captureScreenshot): Unable to
   capture screenshot`, e com `--vistas` de quatro painéis falhou em cerca de metade. Reproduz com a maquete
   `procedural/pecas/empilhadeira/referencias/maquete.esboco.json` neste ambiente (Chromium headless 1243 no lugar do
   1194 que o Playwright do projeto pede). O processo não pega: é ambiente, mas a ferramenta não tenta de novo. Destino:
   o item "Captura de tela recusada pelo Chromium" do backlog, com esta evidência.
3. **O esboço 2.0 não conhecia o `inflate`.** O passo `["inflate", {...}]` no esboço da carcaça voltava recusado pela
   tabela de milímetro (`a operação "inflate" não está na tabela de medidas`), e `divisoes`, `estacoes` e
   `expoenteSecao` eram tratados como medida. O processo pegou, pela recusa com o nome do campo, que é o desenho da
   tabela. Destino: `inflate` entrou em `TABELA_DE_MEDIDAS` (`contornoLado`, `contornoTopo`) e os três campos em
   `SEMPRE_LIVRES`, em `modulos/esboco-nucleo/src/milimetro.js`.
4. **O `inflate` não serve à carcaça.** Com a silhueta lateral da carcaça inteira, a grade passou do bloco de 1000 ids
   que o esboço reserva por passo, e o modo `secoes` recusa estação com mais de um intervalo, que é o caso de toda
   estação que corta um arco de roda ou o vão do posto. O processo pegou, pelas recusas. Destino: a carcaça foi feita por
   extrusão da silhueta lateral de cada parte cruzada com a planta (`extrusao` + `intersectar`), que não tem esses
   limites; o `inflate` fica para corpo de uma peça só sem cavidade, sem item de backlog, porque nenhuma peça em curso
   precisa dele.
5. **As vistas de IA são mais largas que a máquina da ficha.** Escalada pela lateral (entre-eixos de 1.700), a vista de
   cima dá a carcaça com uns 1.320 mm e os pneus com 1.485 mm por fora, contra 1.150 da ficha de 2,5 t; a de frente e a
   de trás dão o mesmo. Nenhuma classe real tem essa razão entre largura e entre-eixos (0,87). O processo pegou porque
   quem conduz mediu as vistas antes de modelar, mas nada o obrigava. Destino: a pergunta da escala na skill
   `alinhar-modelagem` passou a pedir a razão entre medidas em cada vista antes de modelar; a largura sai da ficha,
   com a proporção interna da vista de cima (carcaça a 0,89 da largura nos pneus), e a decisão vai à pessoa com a
   imagem.
