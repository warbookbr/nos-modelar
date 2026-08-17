# Ponto nomeado — e a revisão dos atritos vizinhos

**Estado:** concluído

**Responsável:** execução assistida por IA

**Repositório e base:** `warbookbr/nos-mecanifica`, branch
`implementacao/ponto-nomeado` sobre `main`.

## Problema observado

Atrito **A-8**, medido pela otimização **O-9**: *"só se nomeia escalar. 18 dos
61 parâmetros do freio existem para nomear 6 pontos do caminho da mangueira, e a
curva não tem nome — não dá para dizer 'afaste o flexível 5 mm da pinça'."*

Três nomes por ponto não é só verbosidade. É a mesma coisa escrita três vezes,
em três linhas que podem divergir: alterar `apoioX` e `apoioY` e esquecer
`apoioZ` produz um ponto que ninguém escreveu, e nada avisa.

## Resultado

Um nome guarda o ponto inteiro, em qualquer campo que aceita ponto.

## Achado que mudou o recorte

**A-29 não era um atrito separado.** Ele estava fichado como "centro geral do
arranjo radial ainda não é nomeável", e a causa medida é a mesma: `pivo` não
aceitava nome porque **nenhum** ponto aceitava. Uma correção na rede central
(`vec`) fecha os dois, e por isso as provas moram juntas.

## Revisão dos atritos vizinhos, pedida no mesmo recorte

**A-7 — resolvido no diagnóstico, e a ficha estava desatualizada.** O O-11
propunha que a mensagem dissesse quando o alias fica completo. Ela já diz, com
este texto: *"alias 'discoInteiro' fica completo no passo 2; você citou no passo
1 — falta cubo:2 (nasce no passo 2)"*. O que restava do O-11 era resolver o
alias **tarde**, mudança de semântica do formato salvo que o próprio item adiou
para a Faixa 3 *"se a mensagem não bastar"* — e não há evidência de que não
baste. A ficha passa a dizer o que é verdade.

**A-32 — retirado.** "O freio ainda não tem cubo-piloto" é geometria de uma peça
de exemplo, e peça de exemplo não é contrato deste repositório (ver "Peças são
exemplos" no `README.md`). Manter isso como pendência da oficina confunde o que
é capacidade com o que é conteúdo descartável.

**Seletores relacionais do O-8 — retirados.** `toca`, `oposta`, `normal` e
`maisProxima` existiam para **descobrir** o par em contato, e essa era a única
evidência que os sustentava. `encostar` entregou o contato declarando a direção,
sem descobrir nada, e sem o desempate que era o risco do item. Nenhum caso de
campo pede hoje um contato que não possa declarar direção. Reabrir exige
evidência nova, não a lembrança de que já estiveram na lista.

**`alinhar` — mantido como candidato, sem plano.** Centragem derivada é
necessidade real e da mesma família (hoje o centro é calculado à mão e se perde
em silêncio), mas `encostar` não a cobre e nenhuma medição de campo a colocou no
caminho crítico. Fica como candidato, e não como pendência.

## Filtro Agent-First

| Interface | Decisão | Razão |
|---|---|---|
| `vec`, a rede central de pontos | **ENVOLVER** | é o único ponto onde a mudança vale para todos os campos de uma vez |
| `num` e as expressões | **USAR DIRETO** | componente segue escalar; nada muda em PARAM, TOPO ou expressão |
| ponto nomeado citando ponto nomeado | **ADIAR** (recusado) | traria ciclo para dentro da rede que resolve todo campo dimensional |
| `alinhar` | **ADIAR** | necessidade real, sem evidência de campo que a coloque no caminho crítico |
| seletores relacionais | **ADIAR** (retirados) | perderam a evidência que os sustentava quando `encostar` entregou o contato |

## Incluído

- ponto nomeado em `vec`, com três recusas próprias;
- `em` e `direcao` passam a aceitar nome, como os demais campos de ponto;
- `tools/mecanifica/ponto-nomeado.test.ts` com 11 provas;
- revisão de ficha de A-7, A-29 e A-32, e retirada dos seletores relacionais.

## Excluído

- ponto nomeado recursivo;
- caminho nomeado (a curva inteira da mangueira) — o O-9 também pede, e é
  contrato próprio;
- `alinhar` e qualquer seletor relacional;
- migrar peças existentes.

## Gate de saída

1. **comportamento mensurável** — nomear o ponto produz a mesma malha que
   escrever os três componentes, e o `pivo` nomeado iguala o literal;
2. **compatibilidade e determinismo** — a forma literal segue valendo; nenhuma
   peça existente muda;
3. **prova visual** — dispensada: a afirmação é de equivalência de malha;
4. **testes e documentação** — 11 provas e a forma documentada na skill;
5. **decisão Agent-First registrada** — tabela acima.

## Fechamento

Gates completos de [`../INDEX.md`](../INDEX.md) verdes. Nenhuma peça migrada.

**Decisão: aprovar.** A-8 e A-29 saem da lista. A-7 e A-32 tiveram a ficha
corrigida em vez de gerar trabalho. Continua aberto A-16 (encaixe oco), e
continuam fora as costuras de `lathe`, os materiais genéricos, o Caso 3 e o
histórico operacional.
