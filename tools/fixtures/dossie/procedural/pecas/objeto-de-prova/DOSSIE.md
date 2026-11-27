# Dossiê: objeto-de-prova

Gerado por `npm run dossie -- objeto-de-prova` do que já está gravado; não edite fora dos marcadores `a-mao`, porque `npm run dossie -- objeto-de-prova --check` recusa o arquivo diferente do gerado. A seção entre os marcadores é escrita à mão e o gerador a preserva.

## Aceite da pessoa ao alinhamento

- alinhamento: aceite registrado: aceito pela pessoa em 2026-11-19, "a caixa é essa". ([ALINHAMENTO.md](ALINHAMENTO.md))
- rascunho: aceite registrado: aceito pela pessoa em 2026-11-19, "pode seguir".

## Planos que cobrem a pasta

- [Plano da prova](../../../documentos/modelar/planos/2026-11-20-plano-da-prova.md) (concluído)
  - banco de provas: [estudo-de-prova](../../../documentos/modelar/banco-de-provas/estudo-de-prova); tabela de tentativas: [README.md](../../../documentos/modelar/banco-de-provas/estudo-de-prova/README.md); atritos: [ATRITOS.md](../../../documentos/modelar/banco-de-provas/estudo-de-prova/ATRITOS.md), 2 item(ns), 1 sem destino
    - a tampa é grossa demais | ensaio: espessura de 4 para 2 mm | resultado: pior: empena | destino: descartada
    - a tampa é fina demais | ensaio: espessura de 2 para 4 mm | resultado: sem empeno | destino: ficou

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

| Rodada | Registrada | Medidas | Faces | Segundos | Nota | Defeitos | Decisão da pessoa |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 2026-11-20 | passou | - | - | 4 | 1 | a pessoa, 2026-11-21: tampa de 4 mm está boa, a caixa segue |
| 2 | 2026-11-27 | passou | 1234 | 0.42 | 4 | 1 | sem decisão gravada |

Faces é o total de faces da malha e segundos o tempo da execução da receita (com o cache por passo quente ou frio, como estava na medição); as rodadas sem o número são anteriores à gravação deles e não foram reescritas.

Atrito e nota de passagem de cada rodada, condensados (o texto inteiro está na rodada gravada):

- rodada 1: nota: a tampa segue grossa; a caixa confere e não precisa mudar | atrito: a espessura da tampa só apareceu na vista lateral, depois de duas execuções

Defeitos da rodada 2, a última com veredito:

- `tampa`, espessura (maior): borda da placa

Observação do crítico: A caixa confere; a tampa está grossa.

### Escolhas de técnica, à mão

<!-- dossie:a-mao:peca:inicio -->
_Escolhas de técnica e o porquê. Um item por escolha, no modelo `escolha: porquê (a rodada, o plano ou a medida que a mostrou)`. Sem rodada nem medida que a sustente, a frase não entra._

- parede fina por subtração de um cubo menor, deslocado 2 mm: a espessura da parede sai de um número só da receita (rodada 1, caixa conferida).
- tampa de 4 mm: a de 2 mm empenava no ensaio da tabela de tentativas, e a pessoa aprovou os 4 mm (decisão de 2026-11-21).
<!-- dossie:a-mao:peca:fim -->

### Dívida conhecida, à mão

<!-- dossie:a-mao:peca.divida:inicio -->
- tampa de 4 mm: a pessoa aceitou em 2026-11-21 (decisão da rodada 1), sem rodada nova
<!-- dossie:a-mao:peca.divida:fim -->
