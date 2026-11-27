# Dossiê: objeto-de-prova

Gerado por `npm run dossie -- objeto-de-prova` do que já está gravado; não edite fora dos marcadores `a-mao`, porque `npm run dossie -- objeto-de-prova --check` recusa o arquivo diferente do gerado. A seção entre os marcadores é escrita à mão e o gerador a preserva.

## Planos que cobrem a pasta

- [Plano da prova](../../../documentos/modelar/planos/2026-11-20-plano-da-prova.md) (concluído)
  - banco de provas: [estudo-de-prova](../../../documentos/modelar/banco-de-provas/estudo-de-prova); tabela de tentativas: [README.md](../../../documentos/modelar/banco-de-provas/estudo-de-prova/README.md)

Planos encerrados que citam o objeto (o texto está no git, no commit que a crônica indica):

- `2026-11-10-caixas-antigas.md`: Caixas antigas (2026-11-12): a objeto-de-prova ganhou a primeira tampa (commit `abc1234`)

## O alvo

- Objeto: caixa de prova com tampa
- Escala: largura da caixa, 200 mm
- Referências: `referencias/alvo.md`
- Partes do plano:
  - `caixa`: caixa aberta de parede fina. Técnica declarada: cubo menos cubo menor
  - `tampa`: placa que cobre a caixa.
- Critérios de reprovação:
  - parede mais fina que 2 mm
  - tampa que não cobre a caixa

### Operações

Passos da receita: 9. Operações por parte, lidas do grafo dos passos (uma operação que serve a mais de uma parte aparece em todas):

| Parte | Operações (nome ×vezes) |
| --- | --- |
| `caixa` | cubo ×2, transladar ×1, subtrair ×1, parte ×1, material ×1 |
| `tampa` | cubo ×1, parte ×1, liso ×1 |

### Rodadas

| Rodada | Registrada | Medidas | Nota | Defeitos | Decisão da pessoa |
| --- | --- | --- | --- | --- | --- |
| 1 | 2026-11-20 | passou | 4 | 1 | a pessoa, 2026-11-21: tampa de 4 mm está boa, a caixa segue |

Defeitos da rodada 1, a última com veredito:

- `tampa`, espessura (maior): borda da placa

Observação do crítico: A caixa confere; a tampa está grossa.

### Medida de faces e tempo

Faces e tempo de execução: não gravados. O registro da rodada guarda só `facesFinas`, as faces finas, e nenhum arquivo guarda o total de faces nem o tempo da receita. De onde viria: `medidas.faces` e `medidas.segundos` no `rodada-NN.json`, tirados do `descrever` que `rodada-de-modelagem.mjs` já roda; proposta ao plano do laço de modelagem.

### Escolhas de técnica, à mão

<!-- dossie:a-mao:peca:inicio -->
_Escolhas de técnica e o porquê. Um item por escolha, no modelo `escolha: porquê (a rodada, o plano ou a medida que a mostrou)`. Sem rodada nem medida que a sustente, a frase não entra._

- parede fina por subtração de um cubo menor, deslocado 2 mm: a espessura da parede sai de um número só da receita (rodada 1, caixa conferida).
- tampa de 4 mm: a de 2 mm empenava no ensaio da tabela de tentativas, e a pessoa aprovou os 4 mm (decisão de 2026-11-21).
<!-- dossie:a-mao:peca:fim -->
