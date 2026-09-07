# Parâmetro que move a peça

**Estado:** concluído

**Responsável:** execução por agente, 2026-09-07

**Repositório e base:** `warbookbr/nos-mecanifica`, `main` de `a3b589e` a `6c4865e`

## Problema observado

A IA gastava rodadas descobrindo por tentativa e erro qual alteração muda a
medida que ela precisa mudar. O diário da oficina mostra a assinatura disso:
**dez chamadas seguidas de `descrever` sobre o mesmo alvo, receita intocada entre
elas**. Não faltava medida — faltava a derivada: qual parâmetro move este
critério, e o que mais cada movimento quebra.

Medindo o acervo para dimensionar a ferramenta, apareceu uma causa anterior e
mais grave.

## Linha de base medida — 2026-09-07, `a3b589e`, Windows 11

Reprodutível por `npm run parametros -- --acervo`, em ~9 s.

| Alvo | declarados | vivos | inertes |
|---|---:|---:|---:|
| cadeira-de-madeira | 21 | **13** | 8 |
| pa-de-bico-bambu | 18 | 0 | 18 |
| prensa-progressiva | 15 | 0 | 15 |
| prensa-mecanica-industrial | 14 | 0 | 14 |
| chapa-de-fixacao | 9 | 0 | 9 |
| prensa-hidraulica | 8 | 0 | 8 |
| cabo-de-pa-bambu | 7 | 0 | 7 |
| mancal-guia | 7 | 0 | 7 |
| barricada-de-sucata | 2 | 0 | 2 |
| cutelo-de-sucata | 2 | 0 | 2 |
| gabarito-eixos | 0 | 0 | 0 |
| **total** | **103** | **13 (13%)** | **90 (87%)** |

**Dez das onze receitas têm `PARAMS` decorativo.** Só a cadeira liga os passos
aos parâmetros (`get PASSOS() { return gerarPassos(this.PARAMS); }`); as outras
trazem `PASSOS` como lista de literais fixada na carga do módulo. As três prensas
somam trinta e sete parâmetros declarados e nenhum move um vértice.

Dois números que sustentaram o recorte: uma variante custa de 1,0 ms a 62,3 ms em
processo, e a avaliação é determinística nas onze receitas — nada precisa ir para
disco, e o mapa completo de uma peça sai por menos que uma chamada de
`olhar-bancada` (3,3 s no diário).

## Resultado

A IA pergunta "quais parâmetros movem este critério, e o que cada um custa" e
recebe a resposta medida em segundos — ou a resposta honesta de que a receita não
tem parâmetro vivo nenhum para mover.

## Filtro Agent-First

- **`executarReceita` + `descreverPeca` — USAR DIRETO.** Puros, determinísticos,
  já medidos; a varredura só os chama em cópias em memória.
- **Varredura — ENVOLVER.** O laço existia na sonda N5 para um parâmetro. A IA
  declara critério e liberdades em vez de reescrever o laço a cada peça.
- **`PARAMS` inerte — REFATORAR.** Contrato que declara liberdade inexistente é
  pior que contrato que não declara nada: gasta a rodada de quem confiou.
- **Solver numérico (SciPy/Drake) — ADIAR.** A 30 ms por variante e com
  dimensionalidade efetiva de 1, enumerar domina. Solver devolve *uma* solução; a
  varredura devolve o mapa, que é o que sustenta uma decisão. E traria um segundo
  toolchain para um repositório cuja disciplina é gate determinístico.

## Invariantes — todos cumpridos

1. **A ferramenta nunca aplica um vencedor.** Devolve candidatos com o custo de
   cada um. `METODO-DIAGNOSTICO-E-SEU-LIMITE.md` vale: métrica não aprova forma.
2. Variante vive em memória; nada é escrito na árvore. A receita não é tocada.
3. Nenhum ritual novo: o instrumento mede a ferramenta, nunca pede relato.
4. Candidato que quebra a peça é **recusado**, não classificado.
5. A leitura obrigatória continua ≤ 70 KB: a documentação nova é sob demanda.

## Rodadas

### R00 — parâmetro vivo, como fato conferível — **concluída**

`npm run parametros`, sobre `src/autoria/parametros-vivos.js`, com o retrato
103/13/90 travado em teste.

**Resultado:** onze alvos em ~9 s, todos determinísticos. O comando corrigiu duas
afirmações da primeira versão desta tabela — o total era 88/13/75 e a
`prensa-progressiva` constava como receita que não carrega; o script descartável
a procurava por `modulo.default ?? modulo`, e ela não exporta `default`. Expôs
também um erro de desenho: peça que executa sem publicar parte era relatada como
"tudo inerte", resposta precisa para a pergunta errada; agora recusa diagnosticar
e diz por quê. A regra de identidade de receita, copiada em dois CLIs, passou a
morar em `receitaDoModulo`.

### R01 — motor de varredura — **concluída**, com o R02 dentro

`npm run varrer`, sobre `src/autoria/varrer-parametros.js`: sensibilidade (um
parâmetro por vez, ±δ) e lote (grade declarada, ordenada por objetivo), com
vocabulário fechado de critérios.

**Resultado:** na cadeira, sem nenhuma dica, aponta `perna.secaoTopo` como o
único dos 21 que move a menor folga, com o trade-off — encolher abre 6,07 mm e
cria 4 interpenetrações, engordar abre 2,00 mm sem custo. 42 variantes em ~1,3 s.
O orçamento de 200 variantes recusa antes de rodar, com a conta na mensagem.

O teto do R02 saiu por construção: a saída inteira tem **788 bytes** contra o
alvo de 4 KB, com os 20 sem efeito recolhidos numa linha.

Correção durante a execução: a primeira versão listava `assento.altura` entre os
que movem o critério, por 2,8e-14 m — ruído de ponto flutuante, porque parâmetros
diferentes percorrem contas diferentes. Efeito abaixo de 1 nm deixou de contar.

### R03 — a medição escolhe o enquadramento — **concluída**

Toda varredura termina com a linha de bancada montada sobre as partes que de fato
andaram entre a base e o candidato.

**Resultado:** alterar `perna.secaoTopo` **não move a caixa das pernas** — move
saias e travessas, que é onde a mudança encosta. O palpite óbvio olharia a perna
e não veria nada. A linha sugerida seleciona as quatro, escolhe `contexto` pela
quantidade e acrescenta `--res=1280x1707`, porque a cadeira ocupava 19% da
largura no quadro deitado — V-25 nasce exatamente aí, e a bancada só avisava
depois de gastar a captura. Verificado na imagem, não pela existência do PNG.

### R04 — prova de campo — **concluída**

Alvo real escolhido por ferramenta, não por conveniência: `conferir:juntas` acusa
quatro `FRESTA VISÍVEL` na cadeira, de 9,9 a 20,8 mm entre saias e travessas.

**Custo do fluxo assistido:** dois comandos, 5,8 s, 163 variantes. A sensibilidade
apontou `perna.secaoTopo` e `saia.esp` como os únicos dois que movem aquela
fresta; o lote fechou o vão de 14,14 mm a 0,00 mm.

**E o resultado condenou a própria ferramenta.** Reaplicando o candidato e
remedindo de verdade, o zero custava quatro juntas piores — duas delas dobrando
de tamanho — e uma interpenetração nova. O relatório dizia apenas
"+1 interpenetração", então o número bonito passava como melhoria. Otimizar um
critério declarado sem contar o resto encontra uma solução pior mais rápido, que
é o risco nomeado em `METODO-DIAGNOSTICO-E-SEU-LIMITE.md`.

A correção entrou aqui: todo candidato traz quantas relações pioraram — contato
que virou folga, folga que cresceu, interpenetração nova — e o desempate
considera isso antes de interpenetração. A mesma lista passou a ler:

```text
0.00 mm  perna.secaoTopo=0.044  saia.esp=0.044   +1 interpenetração, 10 junta(s) pioraram
1.41 mm  perna.secaoTopo=0.04   saia.esp=0.038   +1 interpenetração,  1 junta(s) pioraram
```

Decisão diferente, com o mesmo esforço de medição.

**O que esta prova NÃO mediu:** o A/B contra o fluxo desassistido. Executá-lo
comigo seria fraude — eu já sei a resposta, e mediria minha memória, não a
ferramenta. Fica pendente, e precisa de agente sem contaminação, com o número que
o diário já colhe: chamadas repetidas de `descrever` sobre receita intocada, hoje
dez na série de abertura.

## Riscos e parada

O risco maior — reescrever `PASSOS` de dez receitas para ligá-las aos parâmetros
— não foi corrido: nenhuma receita foi alterada neste plano. A previsão continua
local, e por isso o candidato escolhido é sempre remedido de verdade; foi
exatamente isso que expôs a falha do R04.

## Fechamento

**Estado final:** concluído, decisão `aprovar`. R00, R01 (com o R02 dentro), R03
e R04 entregues, 19/19 gates verdes em cada uma.

Entregue: `npm run parametros`, que separa liberdade declarada de real, e
`npm run varrer`, que mede sensibilidade e lote com orçamento, custo de regressão
e a linha de bancada que a medição escolheu.

**Devolvido ao backlog, sem autorização automática:** ligar as dez receitas de
`PASSOS` literais aos seus parâmetros; cinemática de curso como liberdade;
montagem persistida; e o A/B contra o fluxo desassistido.
