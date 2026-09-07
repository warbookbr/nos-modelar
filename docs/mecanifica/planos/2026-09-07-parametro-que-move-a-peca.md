# Parâmetro que move a peça

**Estado:** pronto

**Responsável:** a definir

**Repositório e base:** `warbookbr/nos-mecanifica`, `main` em `a3b589e`

## Problema observado

A IA gasta rodadas descobrindo, por tentativa e erro, qual alteração muda a
medida que ela precisa mudar. O diário da oficina mostra a assinatura disso:
**dez chamadas seguidas de `descrever` sobre o mesmo alvo, receita intocada entre
elas**. Não falta medida — a medida estava lá as dez vezes. Falta a derivada:
qual parâmetro move este critério, e o que mais cada movimento quebra.

Medindo o acervo para dimensionar essa ferramenta, apareceu uma causa anterior e
mais grave.

## Linha de base medida — 2026-09-07, `a3b589e`, Windows 11

Varredura de um parâmetro por vez, ×1,1, comparando a caixa de cada parte contra
a base. Reprodutível por script; nenhum número depende de julgamento.

| Alvo | declarados | vivos | inertes |
|---|---:|---:|---:|
| cadeira-de-madeira | 21 | **13** | 8 |
| pa-de-bico-bambu | 18 | 0 | 18 |
| chapa-de-fixacao | 9 | 0 | 9 |
| cabo-de-pa-bambu | 7 | 0 | 7 |
| mancal-guia | 7 | 0 | 7 |
| barricada-de-sucata | 2 | 0 | 2 |
| cutelo-de-sucata | 2 | 0 | 2 |
| gabarito-eixos | 0 | 0 | 0 |
| prensa-mecanica-industrial | 14 | 0 | 14 |
| prensa-hidraulica | 8 | 0 | 8 |
| prensa-progressiva | — | — | não carrega |
| **total** | **88** | **13 (15%)** | **75 (85%)** |

**Nove das dez receitas que carregam têm `PARAMS` decorativo.** Só a cadeira liga
os passos aos parâmetros (`get PASSOS() { return gerarPassos(this.PARAMS); }`);
as outras trazem `PASSOS` como lista de literais fixada na carga do módulo, e
`PARAMS` ao lado, sem efeito. A prensa industrial declara catorze parâmetros e
nenhum deles move um vértice.

Outros dois números medidos, ambos favoráveis:

- **custo de uma variante em processo**: 1,0 ms (mancal) a 62,3 ms (pá de bico),
  29,8 ms na cadeira. O mapa completo da peça mais cara sai em ~2,2 s — menos que
  uma chamada de `olhar-bancada` (3,3 s no diário).
- **determinismo**: mesmos parâmetros, duas execuções, geometria idêntica nas
  oito peças. A avaliação de variante é pura; nada precisa ir para disco.

E, na única receita paramétrica, a varredura já responde a pergunta certa:
`perna.secaoTopo` é o único dos 21 que move a menor folga — encolher abre 6,07 mm
**e cria 4 interpenetrações**; engordar abre 2,00 mm **sem quebrar nada**.

## Resultado

A IA pergunta "quais parâmetros movem este critério, e o que cada um custa" e
recebe a resposta medida em segundos — ou recebe, quando for o caso, a resposta
honesta de que a receita não tem parâmetro vivo nenhum para mover.

## Hipótese

O gargalo não é a IA calcular mal: é ela não ter o que calcular. Editar hoje é
mexer em literais dentro de `PASSOS`, cujo acoplamento é invisível — daí a
remedição. Ligar receita a parâmetro e depois medir a derivada devolve mais
rodadas que qualquer solver, e é pré-requisito dele.

## Filtro Agent-First

- **`executarReceita` + `descreverPeca` — USAR DIRETO.** Puro, determinístico e
  já medido; a varredura só os chama em cópias em memória.
- **Varredura — ENVOLVER.** O laço existe na sonda N5 para um parâmetro. A IA não
  deve reescrever o laço a cada peça; deve declarar critério e liberdades.
- **`PARAMS` inerte — REFATORAR.** Um contrato que declara liberdade que não
  existe é pior que não declarar: engana quem lê. Precisa ser detectável.
- **Solver numérico (SciPy/Drake) — ADIAR.** A 30 ms por variante e com
  dimensionalidade efetiva de 1 na única receita viva, enumerar domina. Solver
  devolve *uma* solução; a varredura devolve o mapa, que é o que sustenta uma
  decisão. E traria um segundo toolchain para um repositório cuja disciplina
  inteira é `npm run gates` determinístico.
- **Escolha de enquadramento — ENVOLVER.** Ver R03.

## Incluído

- diagnóstico de parâmetro vivo/inerte, disponível como comando e como gate;
- motor de varredura puro, com modos sensibilidade e lote;
- ligação receita→parâmetro nas receitas que o campo provar necessárias;
- prova em peça e em máquina;
- uma sugestão de enquadramento derivada da varredura.

## Excluído

- **solver de restrições simultâneas** e qualquer dependência Python;
- **cinemática de curso** — é o mesmo motor com o ângulo como liberdade, e abre
  depois, com plano próprio;
- montagem persistida (`descreverMontagemResolvida`): não medida aqui;
- aplicar automaticamente um vencedor — ver invariantes;
- consertar `prensa-progressiva`, que não carrega; vai para o backlog.

## Invariantes

1. **A ferramenta nunca aplica um vencedor.** Devolve candidatos com o custo de
   cada um. `METODO-DIAGNOSTICO-E-SEU-LIMITE.md` vale: métrica não aprova forma.
2. Variante vive em memória; nada é escrito na árvore, nem em `public/`, nem em
   `pecas/`. O arquivo da receita não é tocado pela varredura.
3. Nenhum ritual novo para a IA: o instrumento mede a ferramenta, nunca pede
   relato ao agente.
4. Toda variante reporta os invariantes estruturais (`orfaos`, `facesSemParte`,
   interpenetrações). Candidato que melhora o critério e quebra a peça é
   **recusado**, não classificado.
5. A leitura obrigatória continua ≤ 70 KB: a documentação nova entra como
   consulta sob demanda, não no caminho de entrada.
6. Ligar uma receita a seus parâmetros **preserva a geometria publicada**: com os
   valores atuais, a assinatura de saída não muda.

## Rodadas

### R00 — parâmetro vivo, como fato conferível

Transformar a tabela acima em teste e comando. `npm run parametros -- <alvo>`
responde quais liberdades existem de fato, e o teste trava a contagem para que a
regressão apareça. Prova de pureza e determinismo entra aqui, porque é a
condição de validade de tudo que vem depois.

**Saída:** os 88/13/75 reproduzíveis por comando, e a prensa-progressiva
registrada como receita que não carrega.

### R01 — motor de varredura

Módulo puro em `src/autoria/`, CLI fina em `tools/mecanifica/`, registro no
diário como qualquer ferramenta do laço. Dois modos sobre o mesmo motor:
sensibilidade (um parâmetro por vez, derivada) e lote (grade sobre liberdades
declaradas, sobreviventes ordenados). Critério vem de vocabulário fechado sobre
o que `descreverPeca` já devolve — `menor-folga`, `interpenetracoes`,
`dimensao:<parte>:<eixo>` —, não de uma linguagem de expressão nova.

**Gate:** na cadeira, o modo sensibilidade reproduz o achado de `perna.secaoTopo`
sem nenhuma dica; o orçamento de variantes é declarado e o comando recusa passar
dele em vez de rodar por minutos.

### R02 — saída que cabe na cabeça do agente

A varredura só ganha rodada se a resposta for menor que a pergunta. `descrever`
caiu de 9,8 KB para 4,2 KB no plano anterior; a varredura nasce com teto.

**Gate:** mapa completo da cadeira (21 parâmetros) em ≤ 4 KB, com os inertes
recolhidos a uma linha e o trade-off de cada parâmetro vivo explícito.

### R03 — a medição escolhe o enquadramento

A varredura sabe quais partes se moveram entre a base e o candidato. Isso decide
onde olhar melhor que um palpite: o comando emite a linha de `olhar-bancada` já
com `--selecionadas` e `--modo=isolar --focar` sobre a região que a medida
apontou. Sem renderizador novo; são bandeiras que já existem.

**Gate:** numa correção real, a vista sugerida mostra a junção alterada; V-25
(forma julgada em imagem cortada) não se repete no caso de prova.

### R04 — prova de campo e fechamento

Encaixe real, três liberdades, relações que precisam continuar válidas. Comparar
fluxo atual e assistido medindo tempo, intervenções, critérios atendidos e
regressões — e o número que o diário já colhe: **quantas chamadas repetidas de
`descrever` sobre receita intocada** acontecem nos dois. Se a ferramenta funciona,
o `10x` cai.

## Riscos e parada

- **A ligação receita→parâmetro pode não preservar geometria.** É o risco maior:
  reescrever `PASSOS` de nove receitas é mexer no acervo. Mitigação: a assinatura
  de saída com os valores atuais é o gate, e só se liga o que o campo exigir —
  não há rodada de "parametrizar tudo".
- **Dimensionalidade efetiva pode ser alta.** O mapa de um parâmetro por vez não
  vê interação. Ele é declaradamente local, e o candidato escolhido é sempre
  remedido de verdade — a previsão nunca substitui a medição.
- **Parar se** R00 mostrar que a avaliação de variante não é pura em alguma
  receita real: sem isso o resto não tem base, e o recorte muda antes de R01.

## Fechamento

Preencher ao concluir: estado final, commit, gates, resultado observado e
candidatos devolvidos ao backlog.
