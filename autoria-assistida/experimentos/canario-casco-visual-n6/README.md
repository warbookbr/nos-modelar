# Canário N6 — casco por interseção de silhuetas

**Estado: reprovado e encerrado.** Esta pasta não contém uma receita-base.
Ela conserva uma hipótese testada para evitar que ela seja reapresentada como
progresso: extrair a maior silhueta das vistas frontal, lateral e superior e
intersectá-las em um volume discreto.

O resultado é uma única malha com métricas de silhueta mensuráveis, mas as
quatro imagens abertas individualmente mostram um bloco escalonado. Faltam a
topologia e os marcos que permitem reconhecer um cupê: para-lamas/arcos,
cabine integrada, cintura, entradas laterais, ombros e deck traseiro.

`resultado.json` fixa o veredito e os SHA-256 dos renders e sobreposições
inspecionados. `canario-casco-visual.test.mjs` prova deliberadamente que
fechamento, componente único e IoU não reabilitam a hipótese. O próximo
canário deve começar de marcos semânticos regionais e patches com fronteiras
compartilhadas; não deve ajustar este volume nem reutilizar sua malha.
