# Nome de cópia no `arranja` — endereço de autor para o grupo linear

**Estado:** concluído

**Responsável:** execução assistida por IA

**Repositório e base:** `warbookbr/nos-mecanifica`, branch
`implementacao/nome-de-copia` sobre `main`.

## Problema observado

Pendência "dar endereço único a um grupo linear" de [`../INDEX.md`](../INDEX.md)
e limite registrado em [`../UPSTREAM-NOS.md`](../UPSTREAM-NOS.md).

A única forma de citar uma cópia do `arranja` era `copia: 2`, uma POSIÇÃO. O
`CLAUDE.md` diz que "índices de arrays e posições de passos nunca são identidade
persistida", e o `arranja` era o lugar onde a regra era quebrada todos os dias,
porque não havia alternativa.

**O que exatamente dá errado, medido e não suposto.** Aumentar `total` não troca
o corpo que `copia: 2` devolve — a cópia 2 continua nascendo em `2·d`, no mesmo
lugar. O que muda é o **papel** dela. Quem escreveu `copia: 2` numa cerca de
quatro instâncias estava dizendo "a tábua da ponta"; com seis, a mesma linha
continua resolvendo, continua sem erro, e passa a apontar para uma tábua do
meio. A referência sobrevive à mudança de intenção, e é isso que a torna
perigosa: não existe gate que perceba.

## Resultado

`arranja` aceita `nomes`, um por cópia, e a origem cita `nome` em vez de
`copia`.

## Decisão de projeto

**A lista é exata, não parcial.** Nomear metade das cópias produziria uma peça
em que metade dos alvos é estável e a outra metade não, sem a receita dizer
qual é qual. Como efeito, mexer no `total` sem revisar os nomes **grita** — e é
esse grito que obriga o autor a olhar para a citação que talvez tenha mudado de
sentido.

**`copia` e `nome` não convivem na mesma origem.** Se discordassem, um dos dois
estaria errado e a peça não diria qual.

**`copia` continua existindo e continua correto** para quem realmente quer falar
de posição. Isto acrescenta um endereço, não remove outro.

O modelo é o `grupo` do `furo`, que já resolvia o mesmo problema para furos.

## Filtro Agent-First

| Interface | Decisão | Razão |
|---|---|---|
| eixo `copia` do `arranja` | **USAR DIRETO** | contrato correto para posição; permanece intacto |
| `grupo` do `furo` | **USAR DIRETO** | precedente de endereço nomeado no mesmo arquivo, replicado sem inventar forma nova |
| origem do `arranja` | **ENVOLVER** | ganha `nome` ao lado de `copia`, com recusa de ambiguidade |
| identidade por índice | **REFATORAR** | deixa de ser a única opção; passa a ser escolha declarada |
| nomear cópia de espelho/furo por este caminho | **ADIAR** | cada op tem seu contrato; generalizar agora seria inventar forma sem evidência |

## Incluído

- `nomes` no passo `arranja`, radial e linear;
- `nome` na origem `{op:'arranja', id, de, nome}`;
- recusas: contagem parcial, nome repetido, nome inválido, `nomes` fora de
  lista, nome inexistente, `nome` em arranjo sem nomes, e `copia` com `nome`;
- `tools/mecanifica/nome-de-copia.test.ts` com 15 provas;
- documentação na skill `criar-peca`.

## Excluído

- renomear cópia depois de criada;
- nome em `espelha` ou em outras ops de repetição;
- nome como identidade persistida fora da peça;
- migrar peças existentes.

## Gate de saída

1. **comportamento mensurável** — cada nome resolve a cópia declarada, e nome
   concorda com o índice equivalente quando os dois apontam para o mesmo alvo;
2. **compatibilidade e determinismo** — arranjo sem `nomes` se comporta como
   antes, e nomear não muda um vértice sequer;
3. **prova visual** — dispensada: a afirmação é de endereço, medida por qual
   corpo cada citação devolve;
4. **testes e documentação** — 15 provas, incluindo uma que documenta a
   armadilha antiga como ela é;
5. **decisão Agent-First registrada** — tabela acima.

## Fechamento

Gates completos de [`../INDEX.md`](../INDEX.md) verdes. Nenhuma peça migrada: o
ganho é para quem escrever a próxima.

**Decisão: aprovar.** Sai da lista de pendências o endereço único de grupo
linear. Continuam abertas as costuras de `lathe`, os materiais genéricos, o
Caso 3 e os atritos A-6, A-7, A-8, A-16 e A-29.
