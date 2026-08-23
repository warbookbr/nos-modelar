# R2 — iteração 22: contorno da extremidade traseira

**Decisão:** aprovada; usa o loop existente `contornoTraseira`.

No landmark L09 a projeção superior excedia a meia-largura declarada. A busca
alterou somente o flanco do contorno traseiro, de 0,645 para 0,60. O máximo de
planta passa de 36,1 para 35,8 mm, e a média de 12,2 para 11,0 mm. Lateral,
frontal e envelope compilado permanecem inalterados.

O maior resíduo passa para a expansão dianteira, em `z ≈ 2,00 m`. Ele já tem
o loop `anelExpansaoDianteira`; a próxima busca deve atuar nele, sem tocar na
ponta ou no contorno traseiro aprovados.
