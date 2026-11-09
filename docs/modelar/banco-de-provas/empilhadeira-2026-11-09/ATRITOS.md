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
