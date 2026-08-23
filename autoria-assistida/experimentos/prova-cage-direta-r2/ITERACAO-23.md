# R2 — iteração 23: expansão dianteira

**Decisão:** aprovada; usa o loop existente `anelExpansaoDianteira`.

O maior resíduo de planta após a correção traseira era a expansão em
`z ≈ 2,00 m`. O flanco do anel foi reduzido de 0,80 para 0,78. A busca em
resolução final reduz a planta de 11,0/35,8 para 11,0/31,5 mm
(média/máximo), com lateral e frontal inalteradas em 8,1/20,5 e 16,3/32,7 mm.
O envelope compilado continua exato.

O maior desvio global passa à frontal. A próxima rodada deve isolar a faixa
vertical em `y ≈ 0,90 m` com `transicaoAncaTraseira` e a linha de ombro, sem
desfazer a calibração de planta.
