# Perfis de autoria

Este documento define como uma sessão de IA escolhe e executa um fluxo de
modelagem compatível com o resultado pedido. O perfil muda prioridades,
iterações e critérios de revisão; ele **não** cria outro núcleo de autoria nem
torna Three.js ou o domínio automotivo dependências da Oficina.

O contrato geral continua em [`AUTORIA-IA.md`](AUTORIA-IA.md). Este documento
especializa o método visual.

## Por que um único nível de realismo não basta

Direção artística, fidelidade geométrica e precisão mecânica são decisões
relacionadas, mas independentes. Uma peça low-poly pode ter medidas e encaixes
corretos; uma peça com muitos polígonos pode continuar mecanicamente errada.

Por isso, cada tarefa deve declarar cinco eixos:

| Eixo | Pergunta respondida | Valores iniciais |
|---|---|---|
| perfil visual | como o objeto deve ser lido? | `esquematico`, `lowpolyIntencional`, `tecnicoDidatico`, `realistaApresentacao` |
| fidelidade | a que distância e com quanto detalhe ele será visto? | `F0` a `F3` |
| precisão | o que precisa ser verdadeiro além da aparência? | `ilustrativa`, `dimensional`, `mecanica` |
| interação | o que o usuário fará com o objeto? | `contexto`, `selecao`, `montagem`, `animacao` |
| orçamento | quanto o resultado pode custar? | faces, partes, materiais, tempo de autoria e tempo de execução |

Os níveis de fidelidade significam:

- `F0` — volume de contexto: posição, escala e silhueta geral;
- `F1` — leitura à distância: volumes principais e materiais básicos;
- `F2` — inspeção do sistema: partes, encaixes e superfícies funcionais;
- `F3` — aproximação: transições de fabricação, bordas, rebaixos e detalhes que
  sustentam uma vista próxima.

Fidelidade é requisito de observação, não sinônimo de contagem de polígonos.

## Perfis visuais

### `esquematico`

Prioriza relações e funcionamento. Cores, afastamentos e espessuras podem ser
exagerados quando isso torna causa e consequência mais legíveis.

Fluxo:

1. nomear partes e relações funcionais;
2. construir somente os volumes necessários à explicação;
3. provar estados e movimento;
4. revisar legibilidade, não acabamento de fabricação.

Gates principais: identidade completa, seleção, estados corretos e narrativa
compreensível.

### `lowpolyIntencional`

Prioriza silhueta limpa, facetas deliberadas e baixo orçamento. Não é uma
versão incompleta de outro perfil: a simplificação precisa parecer escolha
visual consistente.

Fluxo:

1. fixar silhueta e proporção;
2. escolher onde as facetas contribuem para a forma;
3. remover detalhe que não muda leitura ou interação;
4. revisar consistência de densidade e materiais.

Gates principais: silhueta nas vistas exigidas, precisão solicitada,
faceteamento coerente e orçamento respeitado.

### `tecnicoDidatico`

É o padrão recomendado para a Mecanifica enquanto o pedido não exigir outra
direção. Prioriza construção mecânica legível, partes isoláveis e detalhe
suficiente para explicar montagem e funcionamento.

Fluxo:

1. fixar envelope, eixo e interfaces;
2. decompor o sistema em partes semânticas;
3. provar encaixes e movimento com geometria simples;
4. refinar superfícies funcionais e sinais de fabricação;
5. revisar montado, isolado e explodido.

Gates principais: plausibilidade mecânica, identidade, encaixes mensuráveis,
isolamento e leitura multivista.

### `realistaApresentacao`

Prioriza aproximação visual e plausibilidade de fabricação sem abandonar
editabilidade. Exige mais do que aumentar segmentos: perfil, espessura,
rebaixos, junções, bordas e resposta de materiais precisam concordar.

Fluxo:

1. fixar prancha técnica e referências de aparência separadamente;
2. provar envelope, eixo, interfaces e vazios reais;
3. acertar silhueta e volumes de fabricação nas vistas ortogonais;
4. refinar transições, rebaixos, bordas e material por parte;
5. revisar em vista próxima, em isolamento e no contexto final;
6. reduzir ou declarar detalhe inviável, sem fingir corte ou abertura com
   pintura.

Gates principais: todos os gates de `tecnicoDidatico`, mais silhueta `F3`,
transições plausíveis, ausência de volumes de bloqueio visíveis e inspeção
próxima nos enquadramentos de uso.

## Contrato de execução para uma IA

Antes de modelar, a sessão registra um briefing curto com os cinco eixos. Esta
forma é metadado experimental e ainda não pertence ao schema da Oficina:

```js
export const PERFIL_AUTORIA = {
  visual: 'realistaApresentacao',
  fidelidade: 'F3',
  precisao: 'mecanica',
  interacao: 'montagem',
  distanciaMinima: 0.45,
  orcamentoFaces: 2500,
};
```

O fluxo compartilhado é:

1. separar verdade técnica de referência estética;
2. declarar eixo, envelope, interfaces e partes antes de detalhar;
3. construir a menor versão que prova montagem e silhueta;
4. revisar na bancada com vistas reproduzíveis;
5. refinar por camadas conforme o perfil, sem regenerar o objeto inteiro;
6. medir geometria e identidade sem navegador;
7. integrar somente depois dos gates do perfil.

Iterar continua sendo o caminho em todos os perfis. O que muda é o conteúdo de
cada rodada: `lowpolyIntencional` encerra quando a simplificação está coerente;
`realistaApresentacao` precisa de rodadas próprias para transições e leitura
próxima.

Se o pedido não trouxer informação suficiente, a sessão adota
`tecnicoDidatico`, `F2`, precisão `mecanica`, interação `montagem` e registra a
suposição. Essa escolha é reversível e não altera identidade nem medidas.

## Evidência: roda dianteira

O contrato de
[`EXPERIMENTO-RODA-REALISTA.md`](EXPERIMENTO-RODA-REALISTA.md) pediu
`realistaApresentacao`, `F3`, precisão mecânica e montagem usando a linguagem
procedural atual. O resultado e os contornos estão em
[`RELATO-RODA-REALISTA.md`](RELATO-RODA-REALISTA.md).

Avaliação do agente principal, em que 10 é o melhor resultado:

| Critério | Nota | Leitura |
|---|---:|---|
| aparência e fabricação | 6/10 | silhueta e aro são legíveis; pneu e junções ainda parecem procedurais |
| plausibilidade mecânica | 7/10 | eixo, envelope, abertura e composição com o cubo são coerentes |
| identidade e separabilidade | 9/10 | sete partes, zero face sem identidade e zero id cru |
| refinamento por outra IA | 5/10 | partes são claras, mas a intenção radial está escondida em muitos parâmetros |
| adequação do custo geométrico | 8/10 | 2.082 faces e 4.024 triângulos são aceitáveis para inspeção |
| economia de autoria | 4/10 | 141 parâmetros, cem deles para coordenadas dos dez braços |

O experimento valida que a Oficina não limita a IA a low-poly. Também mostra
que um perfil, sozinho, não fornece capacidades geométricas ausentes. A peça
chegou a um `tecnicoDidatico` detalhado, com realismo procedural estilizado, mas
não cumpriu o gate de `realistaApresentacao`.

As lacunas justificadas pela prova são gerais:

- repetição radial declarativa com identidade derivada;
- orientação explícita da seção de um caminho;
- segmentos curvos em perfis;
- cortes e vazios editáveis;
- filetes ou transições entre corpos sem perder identidade.

Elas devem permanecer neutras no núcleo e ser provadas também fora de um caso
automotivo antes de serem tratadas como capacidade geral concluída.

## Decisão atual

- a roda experimental permanece isolada e não substitui a roda da aplicação;
- o perfil padrão da Mecanifica é `tecnicoDidatico`;
- uma próxima peça de aproximação deve declarar o perfil antes da modelagem;
- se ela exigir `realistaApresentacao`, a sessão deve conferir primeiro se as
  capacidades necessárias existem e registrar qualquer redução de escopo;
- a repetição radial O-13 é o ganho visual mais diretamente sustentado pelo
  experimento, mas não deve ser implementada antes da fundação de identidade
  O-6/O-12; repetir faces sem identidade só ampliaria o problema;
- a ordem executiva e o backlog vigente ficam em
  [`PLANO.md`](PLANO.md), não neste registro de perfis.
