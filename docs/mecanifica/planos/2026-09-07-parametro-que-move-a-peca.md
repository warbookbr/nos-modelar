# Parâmetro que move a peça

**Estado:** ativo

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

Reprodutível por `npm run parametros -- --acervo` (R00), em ~9 s. Um parâmetro
por vez, sondado em ×1,1 e — quando inteiro — em ±1, comparando forma e contato
medidos contra a base. Nenhum número depende de julgamento.

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

A `prensa-progressiva` constava aqui como receita que não carrega: era o script
descartável procurando-a por `modulo.default ?? modulo`, e ela não exporta
`default` nem envelope único. Pela regra que o `descrever` usa, carrega — e traz
quinze parâmetros, todos inertes.

**Dez das onze receitas do acervo têm `PARAMS` decorativo.** Só a cadeira liga
os passos aos parâmetros (`get PASSOS() { return gerarPassos(this.PARAMS); }`);
as outras trazem `PASSOS` como lista de literais fixada na carga do módulo, e
`PARAMS` ao lado, sem efeito. As três prensas somam trinta e sete
parâmetros declarados e nenhum deles move um vértice.

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

### R00 — parâmetro vivo, como fato conferível — **concluída**

`npm run parametros -- <alvo>` e `-- --acervo`, sobre o módulo puro
`src/autoria/parametros-vivos.js`, com o retrato 103/13/90 travado em teste.

**Resultado:** onze alvos diagnosticados em ~9 s, todos determinísticos.
O comando corrigiu duas afirmações da primeira versão desta tabela — o total era
88/13/75 e a `prensa-progressiva` constava como receita que não carrega. Ele
também expôs um erro de desenho meu: peça que executa sem publicar parte era
relatada como "tudo inerte", resposta precisa para a pergunta errada; agora
recusa diagnosticar e diz por quê. A regra de identidade de receita, que estava
copiada em dois CLIs, passou a morar em `receitaDoModulo`.

O teste é o gate: se alguém ligar uma receita aos seus parâmetros — ou
desligar —, o número muda e a suíte avisa. Não virou passo novo em `gates`
porque já roda dentro de `npm test`.

### R01 — motor de varredura — **concluída**, com o R02 dentro

`npm run varrer`, sobre `src/autoria/varrer-parametros.js`. Dois modos no mesmo
motor: sensibilidade (um parâmetro por vez, ±δ) e lote (grade declarada,
sobreviventes ordenados por objetivo). Critério é vocabulário fechado sobre o
que `descreverPeca` já devolve.

**Resultado:** na cadeira, sem nenhuma dica, a sensibilidade aponta
`perna.secaoTopo` como o único dos 21 que move a menor folga, e mostra o
trade-off — encolher abre 6,07 mm e cria 4 interpenetrações, engordar abre
2,00 mm sem custo. 42 variantes em ~1,3 s. Orçamento de 200 variantes recusa
antes de rodar, com a conta na mensagem.

O teto do R02 saiu junto e por construção, não como rodada separada: a saída
inteira tem **788 bytes**, contra o alvo de 4 KB, com os 20 sem efeito
recolhidos numa linha. Ficou travado em teste.

Uma correção durante a execução: a primeira versão listava `assento.altura`
entre os que movem o critério, por uma diferença de 2,8e-14 m — ruído de ponto
flutuante, porque parâmetros diferentes percorrem contas diferentes. Efeito
abaixo de 1 nm deixou de contar, e o teste guarda o caso medido.

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
