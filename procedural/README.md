# procedural — núcleo, receitas, famílias e extensões

Este diretório guarda o núcleo procedural do Modelar e o que ele executa. A
superfície visual é a bancada, em `/bancada.html`, que lê a malha neutra do
núcleo por um adaptador para Three.js; o núcleo não importa Three.js nem nada do
domínio automotivo.

```
procedural/
  nucleo/       o motor: entrada.js (fachada), nucleo.js, as operações em
                operacoes/, a subdivisão, as gaiolas por estações e por rede e
                o friso
  pecas/        o acervo: uma pasta por peça, com receita.js, referencias/ e
                rodadas/; a parte de um objeto mora em <objeto>/partes/<parte>/
  familias/     as famílias registradas (familia.json, composições e derivar.js)
  extensoes/    as extensões nativas (casca, chapa dobrada, estrutura de barras,
                articulação) e a de prova (prisma triangular)
  criterios/    critérios de forma por família de objeto
  servicos/     a descoberta de capacidades que o MCP usa
```

Como se escreve uma receita está na skill `criar-peca` e em
`docs/modelar/usar/AUTORIA-DE-PECA.md`; `npm run comecar -- modelar/peca`
diz o que ler. O visor herdado do NÓS (`visor.html`, `render.js` e os comandos
`criar`, `executar`, `gabarito` e `peca`) saiu em 2026-10-25.
