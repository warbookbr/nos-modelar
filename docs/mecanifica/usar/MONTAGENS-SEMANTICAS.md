# Montagens semânticas

> **Estado e direção, não plano de implementação.** Este documento descreve o
> que já existe para consultar partes e relações e fixa o modelo que uma futura
> montagem persistida deve respeitar. Nenhuma seção autoriza trabalho automático;
> implementação exige plano executivo próprio.

A definição ampla de autoria está em
[`AUTORIA-DE-PECA.md`](AUTORIA-DE-PECA.md). Este
arquivo detalha somente a camada de composição necessária para a IA construir e
manter sistemas complexos.

## Distinção de base

Uma **peça** é uma unidade geométrica editável, produzida por uma receita
responsável.

Uma **montagem** é a composição de instâncias de peças e, recursivamente, de
outras montagens. Ela registra identidade, posição e intenção mecânica entre os
componentes. Não deve copiar toda a geometria e todas as operações para dentro
de uma receita gigante.

O recorte executável da montagem persistida v1 está documentado em
[`MONTAGEM-PERSISTIDA-V1.md`](../MONTAGEM-PERSISTIDA-V1.md).

A regra é:

> **Peças são geradas por receitas. Conjuntos são organizados por montagens.
> Montagens podem conter outras montagens.**

Um carro e um motor são montagens recursivas. Uma roda completa, um freio, uma
porta ou um cabeçote também podem ser montagens quando contêm componentes que
merecem autoria, movimento, substituição ou validação próprios.

## Composição recursiva

Uma montagem futura precisa conseguir declarar pelo menos:

- identidade própria;
- instâncias de peças;
- instâncias de outras montagens;
- receita e versão responsáveis por cada peça;
- pose de cada instância no referencial da montagem;
- partes e interfaces publicadas pelos componentes;
- relações entre componentes;
- dependências diretas e indiretas;
- validações exigidas pela montagem.

A hierarquia de contenção responde “o que pertence a quê”, mas não responde a
todas as relações mecânicas. O modelo completo também precisa de um grafo.

Exemplo simplificado:

```text
carro
├─ carroceria
├─ conjunto dianteiro
│  ├─ suspensão
│  ├─ freio
│  └─ roda
│     ├─ pneu
│     ├─ aro
│     └─ fixadores
└─ motor
   ├─ bloco
   ├─ cabeçote
   └─ conjunto do virabrequim
```

A roda pode pertencer ao conjunto dianteiro e, ao mesmo tempo, relacionar-se
com cubo, eixo, freio, suspensão e caixa de roda. Essas relações atravessam a
árvore e não podem ser inferidas apenas pela proximidade visual.

## Relações semânticas

A relação descreve intenção mecânica entre alvos estáveis, não um UUID de
renderizador nem uma posição copiada da câmera.

Relações futuras podem expressar, sem fechar agora o formato final:

- contém;
- instancia;
- fixa em;
- encaixa em;
- gira em torno de;
- desliza sobre;
- apoia em;
- mantém folga com;
- deve permanecer alinhado com;
- depende dimensionalmente de;
- precisa ser revalidado quando muda.

Cada relação precisa nomear os dois lados, declarar o tipo de compromisso e
oferecer dados suficientes para que a validação produza resposta mensurável ou
explique por que somente inspeção visual é possível.

Uma relação inválida deve falhar sem alterar as demais.

## Mapa canônico

Conforme a IA cria peças e montagens, o sistema deve manter um mapa estruturado
de composição, relações e dependências.

Esse mapa precisa responder:

- quais peças e montagens existem;
- onde cada instância é utilizada;
- qual montagem contém cada entidade;
- quais relações ligam dois componentes;
- quais interfaces cada componente publica;
- quais conjuntos dependem de uma peça;
- quais validações precisam ser repetidas depois de uma alteração;
- qual caminho leva do sistema inteiro ao alvo de edição;
- quais componentes devem ser vistos juntos para inspecionar uma relação.

O mapa é dado validável. Documentos, diagramas e árvores podem ser gerados a
partir dele, mas prosa manual não pode ser sua única fonte de verdade.

## Contexto de trabalho

Uma tarefa sobre montagem deve separar quatro conjuntos:

1. **Alvo de edição** — peça ou montagem que pode ser alterada.
2. **Contexto visual** — entidades mostradas somente para comparação.
3. **Dependências afetadas** — relações e montagens que podem quebrar.
4. **Escopo de validação** — verificações obrigatórias antes de aceitar a
   alteração.

Exemplo:

```text
alvo:
  aro-dianteiro

contexto visual:
  pneu-dianteiro
  cubo-dianteiro
  pinca-dianteira

dependentes:
  roda-dianteira
  conjunto-dianteiro
  carro

validar:
  assentamento do pneu
  fixação no cubo
  folga da pinça
  interferência com a caixa de roda
```

Isolar visualmente o aro não pode fazer o sistema esquecer que ele pertence a
uma roda e que a roda pertence ao carro.

## Propagação de alterações

Alterar uma peça não implica corrigir automaticamente tudo ao redor. Também não
pode encerrar a tarefa sem conferir os dependentes.

O comportamento esperado é:

1. registrar a nova definição da peça;
2. localizar dependentes diretos e indiretos;
3. reexecutar as relações relevantes;
4. preservar separadamente o que continuou válido;
5. relatar as relações quebradas, com alvo, causa e medida;
6. permitir que a IA corrija a peça, adapte a montagem ou crie uma variante.

O mapa orienta onde olhar. Ele não autoriza alterações silenciosas em peças
vizinhas.

## Invariantes

- a mesma receita e os mesmos parâmetros reproduzem a mesma peça;
- a mesma montagem e as mesmas versões reproduzem a mesma composição;
- identidade não depende de índice, câmera ou UUID de renderizador;
- origem, parte, grupo, porta, peça, instância e montagem resolvem sem
  ambiguidade;
- uma relação inválida falha e não corrompe o restante;
- montagem não esconde órfãos, faces sem identidade ou material inválido;
- montagem não absorve silenciosamente a autoria interna das peças;
- isolamento visual não remove dependências;
- alterações locais disparam descoberta e revalidação dos dependentes
  relevantes;
- representações resolvidas ou exportadas são derivadas da autoria e não a
  substituem.

## Níveis de maturidade

| Nível | Estado | Evidência ou falta |
|---:|---|---|
| 0 | peça isolada executável | núcleo, visor, estado e exportação |
| 1 | partes semânticas nomeáveis | `parte`, seleção e revisão de peças |
| 2 | grupos e portas publicáveis | painel de portas e `guarda:portas` |
| 3 | hierarquia e consulta de subárvore | bancada e `guarda:par` |
| 4 | contratos locais de pose, contato e interface | capacidades e provas específicas já existem, mas não formam uma montagem persistida geral |
| 5 | montagem persistida recursiva v1 | `mecanifica.montagem` v1, pose rígida persistida e resolução recursiva já implementadas |
| 6 | mapa de dependências e contexto derivado | implementado para universo explícito: composição, ocorrências, relações, usos reversos, impacto e contexto consultável |
| 7 | validação integrada de montagem e movimento | relações estáticas e revalidação em cascata persistida implementadas; o curso de uma articulação declarada é amostrado e conferido contra as peças que ficam (extensão de articulação), mas o espaço varrido contínuo e a dinâmica continuam fora |
| 8 | autoria transacional de sistemas compostos pela IA | implementada em perfil MCP opt-in para catálogo/repositório autorizados; não é escrita irrestrita nem promoção automática |

Os níveis 0 a 3 são operacionais. O nível 4 possui vocabulário e provas locais,
mas ainda não existe como capacidade geral de montagem. Os níveis 6 a 8 possuem
o recorte acima; seus limites permanecem direção estabelecida, não promessa de
generalização automática.

## Construção parte por parte (montagem v5)

A montagem v5 é o lugar onde um objeto de várias partes é construído, uma parte
por vez, e cada parte nasce encaixada nas que já estão prontas. Ela acrescenta
três campos à v3:

- `etapas`: a ordem de construção, com cada instância uma vez. É a ordem em que
  uma pessoa montaria o objeto.
- `vinculos`: um parâmetro da receita de uma instância é a medida de uma porta
  de outra (`raio`, `raioInterno`, `raioExterno`, `inicio` ou `fim`), mais um
  `acrescimo`, na `unidade` do parâmetro (`mm` ou `m`). A folga é o acréscimo,
  e é obrigatória mesmo quando é zero.
- `posicoes`: a porta de uma instância no eixo da porta de outra, com
  `afastamento` na `unidade` declarada. A pose da instância sai desse encaixe, e
  instância com posição derivada não declara `pose`.

```json
{ "id": "furoDoMeio", "alvo": { "instancia": "meio", "param": "raioDoFuro" },
  "de": { "instancia": "base", "porta": "pino", "medida": "raio" },
  "unidade": "mm", "acrescimo": 0.2 }
{ "id": "meioSobreABase", "instancia": "meio", "porta": "furo",
  "em": { "instancia": "base", "porta": "pino" }, "unidade": "mm", "afastamento": 0 }
```

O leitor recusa ciclo, dependência de instância construída depois, medida que
porta não publica, parâmetro com duas origens e unidade ausente. O resolvedor
constrói na ordem das etapas, executa a receita com os parâmetros derivados e
recusa porta ausente e parâmetro que a receita não declara. O giro em torno do
eixo só fica definido quando as duas portas publicam `referencia`; sem ela o
resultado diz `giroDefinido: false`. O registro de etapas põe cada junta na
etapa em que a segunda parte entra e só fixa etapa em ordem, com juntas
passando e com o aceite da pessoa. A prova mínima está em
`tools/fixtures/tres-blocos-vinculados/`.

O leitor também recusa duas instâncias posicionadas na mesma porta, porque
elas ficariam no mesmo lugar. Peça apoiada sobre peça usa a relação
`assentaAnular`, com portas em forma de anel: quem recebe publica a face, quem
se apoia publica a borda. Ela confere o eixo, a sobreposição radial e a axial,
e reprova qualquer fresta entre as faces; fresta só é aceita quando a
especificação traz `separacaoAxial`, com a mesma forma de faixa das outras
medidas.

### O apoio no chão e a auditoria da montagem construída

A montagem v5 pode declarar `apoioNoChao`, ao lado de `auditoriaIntersecoes`. O
campo é opcional, vale só na montagem raiz e não muda a versão: a montagem sem
ele é lida igual a antes, e um leitor anterior ao campo recusa a montagem que o
traz, porque as chaves da v5 são fechadas. Ele traz o `plano` do chão, com
`normal` unitária e `altura` ao longo dela, a `toleranciaNumerica`, que é
obrigatória, e `apoiam`, a lista não vazia de caminhos de instância que se
apoiam no chão.

```json
"apoioNoChao": {
  "plano": { "normal": [0, 1, 0], "altura": 0 },
  "toleranciaNumerica": 0.001,
  "apoiam": [{ "caminho": ["trem-do-nariz"] }, { "caminho": ["trens-principais"] }]
}
```

A medida confere que o ponto mais baixo de cada instância de apoio, tomado nos
vértices que a malha usa e já no mundo, fica a no máximo a tolerância do plano,
para cima ou para baixo, e que nenhuma outra instância passa abaixo do plano
além da tolerância. Instância sem malha reprova como inconclusiva. A altura
medida está na unidade da montagem, e a tolerância também.

`npm run etapas -- <montagem.json> --auditar` resolve a montagem com as etapas
que já têm geometria e roda a auditoria de interseções, com a profundidade de
cada invasão, e a medida de apoio. O relatório traz primeiro os pares
`interpenetram` e `encostam` que a montagem não declarou, depois os declarados,
os declarados sem contato e a cobertura, e por fim o apoio de cada instância. A
saída é 1 quando um par não declarado se invade ou o apoio reprova, e 2 quando
nada reprova e a auditoria é incompleta, seja por par que não pôde ser medido,
seja por etapa ainda sem geometria. Nesse segundo caso o apoio declarado numa
instância ainda não construída fica fora da medida e o relatório diz qual, e
as peças que já existem continuam conferidas contra o chão. A profundidade é um
piso, porque só amostra pontos, e vem como indeterminada quando os sólidos se
cruzam apenas pelas arestas. `--json` imprime o resultado inteiro.

Uma expectativa explica um par que se invade e o tira da reprovação, seja qual
for a profundidade; o relatório continua mostrando a profundidade do par
declarado. As tolerâncias da auditoria de interseções e do apoio não têm teto,
e o relatório as imprime. A declaração de `apoioNoChao` numa submontagem não
vale, porque só a da raiz é lida, e o relatório lista as que encontrar. Só o
comando das etapas mede o campo: `descrever_montagem` e `revisar_montagem`
resolvem a montagem com ele e não o medem, de modo que uma roda no ar só reprova
quando alguém roda `--auditar`.

### Formatos e interfaces de portas publicadas

As portas declaram a interface geométrica e técnica de acoplamento da peça via
`publicarPorta`. O núcleo e a montagem cobrem cinco formas estruturadas:

1. **Cilindro (`cilindro`)**:
   - Campos: `forma: 'cilindro'`, `papel: 'macho'|'femea'`, `eixo`, `centro`,
     `raio` (ou `diametro`), `inicio`, `fim`, `referencia` opcional,
     `classeAjuste` opcional.
   - Encaixes: `encaixaCilindrico`.

2. **Anel (`anel`)**:
   - Campos: `forma: 'anel'`, `papel: 'face'|'borda'|'macho'|'femea'`, `eixo`,
     `centro`, `raioInterno`, `raioExterno`, `inicio`, `fim`, `referencia`
     opcional, `classeAjuste` opcional.
   - Encaixes: `assentaAnular`.

3. **Plano de apoio (`plano`)**:
   - Campos: `forma: 'plano'`, `papel: 'recebe'|'apoia'`, `ponto`, `normal`,
     `extensao: [largura, comprimento]`, `referencia` opcional, `classeAjuste` opcional.
   - Encaixes: `assentaPlano` — valida contato planar face a face (normais opostas),
     afastamento nulo ou conforme `separacao`, e limites de extensão de apoio.

4. **Padrão de furos (`padraoFuros`)**:
   - Campos: `forma: 'padraoFuros'`, `papel: 'recebe'|'ocupa'`, `plano: { ponto, normal }`,
     `diametro` (ou `raio`), `centros: [[x,y,z], ...]` ou gerador no núcleo `padrao: { tipo: 'linear'|'circular', ... }` (com `passo` guardado na porta),
     `profundidade` opcional, `referencia` opcional, `classeAjuste` opcional.
   - Encaixes: `encaixaPadraoFuros` — suporta dois casos técnicos fundamentais:
     - **Caso A — Furos com furos (`recebe` com `recebe`)**: união flange-flange onde os furos
       se alinham para passagem de fixadores externos. Valida paralelismo das normais, coincidência métrica
       dos centros e compatibilidade dos diâmetros nominais dos furos (sem folga de contato macho-fêmea).
     - **Caso B — Pino em furos (`recebe` com `ocupa`)**: união macho-fêmea onde pinos, prisioneiros
       ou eixos penetram os furos da peça de apoio. Valida paralelismo das normais, coincidência métrica
       dos centros e folga diametral conferida por `classeAjuste` (ISO 286) ou especificação explícita de folga.

5. **Trilho / Guia linear (`trilho`)**:
   - Campos: `forma: 'trilho'`, `papel: 'guia'|'deslizador'`, `eixo`, `centro`,
     `perfil: { largura, altura }`, `curso`, `referencia` opcional, `classeAjuste` opcional.
   - Encaixes: `encaixaTrilho` — valida alinhamento colinear dos eixos, compatibilidade dos
     perfis de seção transversal e curso útil.

### Classes de ajuste padronizadas (ISO 286)

Portas cilíndricas, furos e guias podem declarar a classe de tolerância e ajuste
através do campo `classeAjuste`:

- `folgado` (ex: H7/g6, H8/f7): garante jogo positivo livre para deslizamento ou rotação.
- `transicao` (ex: H7/k6, H7/js6): ajuste com leve aperto ou pequena folga para centragem precisa.
- `interferencia` (ex: H7/p6, H7/s6): ajuste forçado por prensa ou expansão térmica para união rígida.

As tabelas de folga nominal mínima e máxima são versionadas em milímetros
(`TABELA_CLASSES_AJUSTE_V1` em `src/autoria/regua-de-portas.js`, reexportada por
`src/autoria/interfaces-montagem.js`) e cobrem faixas nominais de até 500 mm.

O arquivo `src/autoria/regua-de-portas.js` é puro e não importa nada: guarda a
tabela, a coaxialidade de duas portas, a folga de eixo em furo pela classe e o
assentamento de plano sobre plano, e `src/autoria/interfaces-montagem.js` mede os encaixes
`encaixaCilindrico`, `assentaAnular`, `assentaPlano` e `encaixaPadraoFuros` com
essas funções. O gate de contato do esboço (`modulos/esboco/src/portas.js`) usa
as mesmas, sem importar o núcleo: um anel que `recebe` e um cilindro que `ocupa`
passam pela classe de ajuste, e uma face que `apoia` sobre outra que `recebe`
passa pelo assentamento de plano, ambos declarados pelo campo `porta` da forma
do esboço (ver a seção Portas do README do módulo). A interface sai da geometria
da forma e as medidas ficam em milímetro, com a tolerância numérica de 0,001 mm.

Parte de objeto de várias partes mora em `procedural/pecas/<objeto>/partes/<parte>/`,
com a montagem em `procedural/pecas/<objeto>/montagem.json`, e é citada por
`<objeto>/<parte>`. Enquanto a etapa dela não está fixa, a receita pode ter o
`PLANO` e nenhum passo; `guarda:acervo` avisa e não reprova.

`npm run etapas -- <montagem.json> --olhar` desenha juntas, em vista
ortográfica, as etapas que já têm geometria, e grava as imagens em
`tools/bancadas/out/etapas-<montagem>-<vista>-orto.png`.

## O que não existe

Ainda não há:

- relações persistidas gerais;
- descoberta de dependências fora de universo explícito;
- resolução automática de contato;
- solver geral de encaixe;
- validação de espaço varrido contínuo (a articulação confere posições amostradas do curso);
- escrita irrestrita de montagem por MCP, CLI ou outra porta.

Não simule essas capacidades com índices internos, posições de câmera, cópia de
matriz do Three.js ou documentação manual tratada como verdade executável.

As questões que este contrato deliberadamente **não** decide — versionamento
de instâncias, cinemática, alcance de revalidação, solver, reserva entre
agentes concorrentes — estão no backlog, em
[`../planos/BACKLOG.md`](../planos/BACKLOG.md). Elas são trabalho de
desenvolvimento e não mudam o que este documento manda fazer.
