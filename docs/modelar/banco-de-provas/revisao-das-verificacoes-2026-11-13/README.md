# Revisão das verificações e dos testes: medidas e veredito

Pasta do plano [revisão das verificações e dos testes](../../planos/2026-11-13-revisao-das-verificacoes-e-dos-testes.md), ativo desde 2026-11-13. Aqui entram o mapa do que cada gate e cada grupo de testes confere, a medida por estrago de código, os sinais de fragilidade e o veredito por grupo, cada número com o comando que o reproduz. Nada aqui muda teste nem gate.

- [O mapa dos testes e o piloto da medida por estrago](mapa-e-piloto.md): os 521 arquivos de teste por área, os sinais de fragilidade, e 94 estragos em 13 arquivos, 57 percebidos.
- [O mapa dos gates e dos testes](MAPA.md): os 30 gates de `tools/gates.mjs` com o passo do CI e os 549 arquivos de teste, um por linha, com os títulos de `describe` e `it` lidos do arquivo, agrupados pelas áreas do plano (passo 1).
- [Os sinais de fragilidade](FRAGILIDADE.md): 6 pisos ou contagens ligados ao tamanho do acervo, 187 contagens exatas fora dele, 199 tetos de tempo fixos e 4 por relógio, 194 citações de 27 peças do acervo e 7 testes que só conferem que não lançou erro, cada um com arquivo e linha (passo 3).
- [O histórico](HISTORICO.md): de 2026-08-14 a 2026-11-14, 216 alterações de teste que só acompanharam número ou texto do código, e, pelo texto dos commits, 13 defeitos reais pegos e 12 falsos alarmes, 8 deles de teto de tempo (passo 4).

Estado em 2026-11-14: passos 1, 3 e 4 feitos. Falta o passo 2 ampliado (a medida por estrago além do piloto), o veredito por grupo e a decisão da pessoa.
