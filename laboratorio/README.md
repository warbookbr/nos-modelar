# Laboratório computacional para IA

Este diretório contém o laboratório experimental isolado da Mecanifica. O
pacote Python vive em `src/laboratorio`; testes ficam em `testes`; artefatos de
execução e o ambiente virtual local ficam, respectivamente, em `.lab/` e
`.venv/`, ambos fora do Git.

Use Python 3.12 e instale o pacote em modo editável:

```powershell
python -m venv laboratorio/.venv
laboratorio/.venv/Scripts/python -m pip install -e "laboratorio[test]"
npm run lab:check
```

## Perguntar pela linha de comando

`npm run lab` roda os candidatos curados do estudo em qualquer caso de projeto,
sem editar Python e sem venv — o ponto de entrada põe `src/` no caminho sozinho.
Tudo sai em JSON; recusa sai em JSON no `stderr`, com código 1.

```bash
npm run lab -- candidatos
npm run lab -- avaliar bambu-colmo --diametro-mm 32
npm run lab -- diametro-minimo seringueira --forca 350
npm run lab -- peneirar --massa-maxima 0.8
npm run lab -- procedencia eucalipto-urograndis
npm run lab -- ensaio flexao --largura-mm 25 --altura-mm 25 --vao-mm 410 \
  --forca 1000 --modulo-gpa 13 --resistencia-mpa 112
```

O que se passa por parâmetro é o CASO — força, comprimento, massa, flecha,
margem, diâmetro. O que NÃO se passa é propriedade de material: nenhum comando
de candidato aceita `--resistencia`, porque isso seria inventar material sem
fonte pela porta dos fundos. Material entra em `estudos/cabo_de_pa.py`, com
procedência por propriedade, e aparece na linha de comando sozinho.

A exceção é `ensaio`, e ela é declarada: a bancada virtual existe justamente
para rodar material hipotético. O que sai dela vem marcado como simulado e não
vira candidato de nada.

As restrições que o estudo pagou caro para descobrir valem aqui também, como
recusa e não como aviso: diâmetro acima da empunhadura e parede abaixo da
mínima prática são erro. As paredes que o próprio estudo herdou de antes da
restrição (aço e alumínio) continuam rodando, com a violação nomeada no campo
`paredeAbaixoDaMinima`.

## Revisar um documento

O laboratório recusa **propriedade** sem fonte desde que `_conferir_fontes`
existe. O revisor fecha o outro lado da ponte: o **documento**, que é escrito à
mão a partir da saída do estudo e onde um número pode chegar sem origem.

```bash
npm run lab:revisar                 # o dossiê do cabo de pá
npm run lab -- revisar <doc.md>
npm run lab -- revisar x --poder    # quanto este revisor de fato pega
```

Ele faz duas conferências, e **só uma reprova**:

- **Propriedade sem fonte usada sem ressalva** — REPROVA. Se o estudo diz que
  nenhuma fonte mediu amortecimento, o documento não pode falar de amortecimento
  sem avisar. É o erro que já aconteceu duas vezes aqui.
- **Número sem rastro** — RELATA. Ele junta todo número que o estudo consegue
  produzir e acusa o que não bate com nada. Num documento correto ainda sobram
  dezenas de achados para triar — nome de liga, catálogo de fornecedor, valor
  citado de artigo. Reprovar por isso ensinaria a ignorar o relatório.

**`--poder` existe porque um gate precisa dizer o quanto ele pega.** A primeira
versão comparava número solto contra número solto e deixava passar 91% dos
valores inventados — dizendo "aprovado". A correção foi usar a unidade escrita ao
lado do número: `37 mm` só se compara com comprimento. Hoje a detecção fica entre
87% e 99% por dimensão, e o balde fraco (número sem unidade escrita) está medido
e nomeado em vez de escondido.

A fronteira é direcional: a Mecanifica não importa o laboratório. Integrações
do laboratório com portas da Mecanifica ficam exclusivamente em
`laboratorio/adaptadores/mecanifica-node/`.
