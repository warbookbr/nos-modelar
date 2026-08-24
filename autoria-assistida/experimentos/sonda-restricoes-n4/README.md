# Sonda N4 — autoria por restrição

Prova isolada de C2. Duas seções contínuas diferentes derivam do mesmo
enunciado: máximo abaixo/fora do ombro, capô sem cavidade/G1 central e G1 no
ombro. Não usa
R2B, cupê livre ou quarto histórico; não constrói veículo.

Cada parâmetro vem de `fonte-n4.json` e passa por `procedencia:check`.
`gerar-evidencias.mjs` produz seis imagens C1 individuais por seção. A sonda só
passa se as duas formas forem distintas, todas as restrições passarem, C1
permanecer regular e `inspecao-individual.json` coincidir por SHA-256 com o
manifesto das imagens atuais.
