# Autoria de peça — o contrato

O que uma IA precisa obedecer ao criar, alterar ou revisar uma peça. Saiu de
`AUTORIA-IA.md`, que misturava este contrato com a justificativa de projeto —
duas coisas com leitores diferentes. A justificativa continua lá, na área de
desenvolvimento, e não é preciso lê-la para trabalhar.

## A distinção central: peça não é montagem

A arquitetura deve separar dois conceitos.

### Peça

Uma peça é uma unidade física ou geométrica que faz sentido editar e validar
como um objeto próprio. Sua forma nasce de uma receita procedural ou de outra
representação de autoria aceita pelo núcleo.

Exemplos: pneu, aro, disco de freio, eixo, pistão, biela, capô, carcaça,
engrenagem e parafuso.

Uma peça pode possuir regiões internas nomeadas, materiais, portas, grupos e
subpartes semânticas. Isso não obriga cada região a virar outro arquivo.

### Montagem

Uma montagem é a composição de instâncias de peças e, recursivamente, de outras
montagens. Ela registra identidade, posição, relações e intenção mecânica entre
os componentes. A montagem não deve esconder a origem das peças nem copiar toda
a geometria para dentro de uma receita gigante.

Exemplos: roda completa, freio, suspensão dianteira, porta do carro, cabeçote,
motor, eixo dianteiro, carroceria e carro completo.

A regra estrutural é:

> **Peças são geradas por receitas. Conjuntos são organizados por montagens.
> Montagens podem conter outras montagens.**

## Quando algo deve ser uma peça separada

Não existe um número universal de faces, passos ou linhas que determine a
separação. A decisão deve seguir significado mecânico e custo de autoria.

Uma entidade tende a merecer receita própria quando uma ou mais destas condições
forem verdadeiras:

- existe fisicamente como componente separável;
- pode ser substituída sem substituir todo o conjunto;
- pode ser reutilizada em outra montagem;
- possui interfaces mecânicas próprias;
- move-se de forma independente;
- é fabricada ou especificada separadamente;
- precisa de validação própria;
- pode receber variantes próprias;
- é um alvo natural de trabalho para a IA;
- sua alteração não deveria exigir reescrever a definição interna de outro
  componente.

Uma entidade tende a permanecer como região interna de uma receita quando:

- é inseparável do mesmo corpo físico;
- existe apenas para nomear uma área de inspeção;
- sempre muda junto com o restante da peça;
- não possui montagem, movimento ou substituição independentes;
- separar o arquivo acrescentaria coordenação sem acrescentar controle real;
- sua identidade serve para seleção, material, medição ou explicação, e não para
  composição.

Exemplo: o canal do pneu, a borda externa e os furos de um aro podem ser regiões
semânticas de uma receita de aro. Pneu, aro e tampa, por outro lado, tendem a ser
peças distintas dentro da montagem da roda.

A fronteira pode mudar conforme a fidelidade aumenta. Uma peça simples de
prova pode começar agregada e depois ser decomposta, desde que a identidade e as
relações permitam a migração sem transformar referências em números frágeis.

## A receita: da tabela à malha

Toda receita nova segue a mesma cadeia, e as skills apontam para cá em vez de
repetir:

1. a `TABELA`, em milímetros, é o que se mede e se edita; a receita a exporta
   como `PARAMS`;
2. `derivar(tabela)` converte para metro e calcula posições, ângulos e
   comprimentos que dependem de mais de uma medida;
3. `gerarPassos(tabela)` escreve os passos já em metro, sem nenhum número que
   não venha de `derivar`;
4. `get PASSOS() { return gerarPassos(this.PARAMS); }` liga a lista de passos à
   tabela, para mudar a tabela mudar a peça.

Milímetro é a unidade em que peça mecânica se mede e se desenha. Metro é a
unidade da malha, do visor e dos formatos 3D, e a conversão acontece num lugar
só, dentro de `derivar`. Um estilo mais antigo põe `PARAMS` em metro e cita o
parâmetro pelo nome dentro do passo; ele ainda existe em fixtures, e não é o
padrão de receita nova. Quando uma montagem v5 deriva um parâmetro da porta de
uma vizinha, o vínculo declara a unidade do parâmetro, porque a medida da porta
vem sempre em metro. Hoje nenhum gate confere esta cadeia.

A receita que parte de um andaime da forma global N2 declara isso em `REFINA`, ao
lado de `PLANO`: o caminho do andaime, o volume que cada parte refina e a
tolerância em milímetro. O veredito de `npm run descrever` e a `guarda:acervo`
recusam a parte que sai do envelope do volume e a porta do andaime que a peça
moveu ou não publicou. O envelope é uma caixa e deixa passar a ponta da asa feita
em qualquer lugar da caixa da asa inteira; por isso a receita que refina uma
forma do esboço declara também `REFINA.esboco`, e a parte abaixo da razão
interseção/união de volume mínima reprova. O formato e o que cada um confere
estão no contrato da forma global N2 (`CONTRATO-FORMA-GLOBAL-N2`) e em
[`CONFERIR-CONTRA-REFERENCIA.md`](CONFERIR-CONTRA-REFERENCIA.md). O alvo que vai
ao crítico é a composta da unidade, gerada de novo por `npm run vistas:critica`, e
nunca a imagem guardada na rodada do esboço: o alvo do motor do avião era de antes
de uma correção do desenho, e só a pessoa percebeu. A receita planejada de uma
unidade do esboço aprovado sai de `npm run receita:planejada`, descrito em
[`alinhar-modelagem`](../../../.claude/skills/alinhar-modelagem/SKILL.md); ela deixa
vazios o objeto, as referências e os critérios, e o `PLANO` é recusado até lá.

Uma família do núcleo (`procedural/familias`, como a superfície aerodinâmica da pá
e da asa ou a roda-pneu) entra numa receita de peça pelos `PASSOS`: a receita expande
a chamada com `expandirChamadasDeComposicao(criarRegistroDeFamilias().registroComposicoes,
[chamar(FAMILIA, id, parametros)]).passos` (de `procedural/nucleo/composicoes.js` e
`procedural/familias/index.js`) e soma os próprios passos depois, com blocos de id
que não colidem. Declare em `MATERIAIS` o material que a família usa (na superfície
aerodinâmica, `materialDaPele`). A receita que só exporta `CHAMADAS_COMPOSICOES`
pede o registro de fora (`--composicoes`), e a guarda do acervo não o tem.

## Peça de uma família

Quando a forma é um caso de uma família registrada em `procedural/familias/`, a
receita chama a família com a `TABELA` e acrescenta só o material de cada
parte. A receita mínima, executada por teste, é
[`procedural/familias/exemplo/receita.js`](../../../procedural/familias/exemplo/receita.js).
O que falta na forma se corrige na família, com novo aceite da pessoa.

## Identidade estável

Toda peça, montagem, instância, parte relevante, porta e relação precisa de
identidade estável e legível.

Identidade não pode depender de:

- UUID do renderizador;
- índice num array;
- ordem casual de carregamento;
- posição visual;
- câmera;
- nome temporário gerado apenas para uma execução;
- número de face usado como atalho persistido quando existe referência
  semântica melhor.

A identidade deve permitir que a IA reencontre o mesmo alvo depois de uma
reexecução, alteração de parâmetros, nova sessão ou troca de ferramenta.

## Seleção e isolamento

A seleção deve operar sobre identidade semântica. A IA precisa conseguir:

- selecionar uma peça;
- selecionar uma montagem;
- selecionar uma parte interna;
- selecionar uma subárvore;
- selecionar duas ou mais entidades relacionadas;
- isolar somente o alvo;
- mostrar o alvo com contexto fantasma;
- mostrar um conjunto arbitrário de componentes;
- alternar entre vistas reproduzíveis;
- retornar ao contexto maior sem perder a seleção.

Exemplos de inspeção úteis:

```text
somente a roda
roda + cubo
roda + eixo
capô + dobradiças
pistão + biela + virabrequim
motor + cofre do motor
suspensão + roda + caixa de roda
```

Esse mecanismo é necessário para reduzir ruído visual e contexto, mas não
substitui a medição das relações.

## Controle total não significa ausência de limites

"Controle total" significa que a IA pode agir sobre todas as camadas necessárias
à autoria, e não apenas girar controles preparados por humanos.

A IA deve poder, conforme a capacidade for implementada:

- criar uma nova receita;
- modificar parâmetros;
- criar e reordenar operações;
- acrescentar ou remover geometria;
- nomear partes e interfaces;
- criar uma nova montagem;
- inserir ou remover instâncias;
- declarar e alterar relações;
- escolher alvos e contextos de inspeção;
- executar o núcleo;
- solicitar medições e vistas;
- comparar revisões;
- corrigir o resultado;
- registrar a nova versão.

Isso não exige permitir escrita irrestrita e silenciosa. Escrita pode ser
transacional, confinada, versionada e validada. Uma operação inválida deve
falhar sem deixar metade de uma receita, montagem ou relação publicada.

O controle da IA deve ser amplo no que ela consegue expressar e rigoroso no que
o sistema aceita como estado válido.

## Edição local e propagação de impacto

Alterar uma peça não deve obrigar a IA a editar manualmente todas as montagens
que a utilizam. Também não deve existir a promessa falsa de que toda montagem
será corrigida automaticamente.

O comportamento correto é:

1. a peça muda;
2. o sistema identifica dependentes diretos e indiretos;
3. as relações relevantes são reavaliadas;
4. resultados preservados continuam verdes;
5. relações quebradas são relatadas com alvo, causa e medida;
6. a IA decide se corrige a peça, adapta a montagem ou aceita uma nova variante.

Exemplo: aumentar o diâmetro externo de uma roda pode preservar a fixação no
cubo e, ao mesmo tempo, quebrar a folga com a caixa de roda. O sistema deve
mostrar as duas respostas separadamente.

O mapa de dependências serve para descobrir onde olhar. Ele não deve esconder
quebras nem alterar peças vizinhas sem decisão explícita.

## Validação em camadas

Nenhuma única técnica prova que uma peça ou montagem está correta. A validação
deve combinar camadas.

### 1. Validação estrutural

Confere se a definição é legível e íntegra:

- receita executável;
- referências resolvidas;
- identidade sem ambiguidade;
- ausência de órfãos silenciosos;
- formato conhecido;
- montagem sem componentes ausentes;
- relações apontando para alvos existentes.

### 2. Validação geométrica

Confere propriedades mensuráveis da geometria:

- dimensões;
- centros e eixos;
- espessuras;
- faces ou volumes inválidos;
- interpenetrações;
- folgas;
- alinhamentos;
- caixas e regiões ocupadas;
- continuidade e fechamento quando aplicável.

### 3. Validação de interfaces

Confere relações mecânicas declaradas:

- eixo compatível com abertura;
- quantidade e distribuição de furos;
- diâmetros compatíveis;
- centros coincidentes;
- orientação correta;
- tolerância declarada;
- contato ou afastamento esperado.

### 4. Validação de montagem e movimento

Confere relações que dependem de pose ou movimento. Hoje a articulação de
revolução e a prismática amostram o curso em poses discretas, com limites e
batentes e a interferência em cada pose (`usar/MONTAGENS-SEMANTICAS.md`); o
espaço varrido contínuo ainda não existe.

### 5. Inspeção visual

Continua necessária para aspectos que não são reduzidos de forma confiável a
uma regra numérica:

- proporção;
- leitura da forma;
- aparência mecânica;
- detalhes escondidos;
- continuidade visual;
- qualidade estética;
- resultado em ângulos diferentes;
- coerência com referências visuais.

A inspeção visual é indispensável, mas não deve ser a primeira e única defesa
para encaixe mecânico. Uma imagem pode esconder pequenas colisões, folgas
incorretas ou desalinhamentos.

## Fluxo de autoria esperado

Os comandos de cada passo estão na esteira de `GUIA-AUTORIA-IA.md` e na skill
`criar-peca`; a ordem que eles preservam é esta:

1. identificar o alvo pelo mapa semântico;
2. carregar a receita ou montagem responsável;
3. carregar dependências e relações relevantes;
4. escolher o contexto visual mínimo suficiente;
5. declarar o que pode ser alterado;
6. criar ou modificar a definição;
7. executar o núcleo;
8. verificar integridade estrutural;
9. medir a peça e suas interfaces;
10. inspecionar vistas do alvo isolado;
11. inspecionar pares ou conjuntos relevantes;
12. revalidar montagens dependentes;
13. comparar a revisão nova com a anterior;
14. corrigir ou publicar a revisão.

Uma IA não deve precisar lembrar sozinha quais relações revisar. O sistema deve
fornecer essa lista a partir do mapa canônico.

## Invariantes de direção

Qualquer arquitetura, plano ou ferramenta futura deve respeitar estas regras:

1. Um carro completo é uma montagem recursiva, não uma receita monolítica.
2. Um motor é uma montagem de conjuntos e peças, não uma receita única.
3. Uma peça editável possui uma definição responsável por sua geometria.
4. Uma montagem guarda composição e relações; não copia silenciosamente toda a
   autoria das peças.
5. Montagens podem conter outras montagens.
6. Toda entidade relevante possui identidade estável.
7. Isolamento visual não remove contexto estrutural.
8. O alvo de edição é separado dos objetos exibidos apenas como contexto.
9. O mapa de relações é dado validável, não documentação manual como única
   verdade.
10. Alterar uma peça exige descobrir e revalidar dependentes relevantes.
11. Validação visual complementa medições; não substitui contratos mecânicos
    básicos.
12. A IA deve poder criar lógica geométrica, não apenas alterar parâmetros de
    moldes fixos.
13. Escrita inválida falha sem publicar estado parcial.
14. MCP, CLI ou API são portas de acesso; nenhum deles define o modelo de
    autoria.
15. Testes resolvem decisões ambíguas, não reabrem princípios lógicos já
    estabelecidos.
16. Capacidades do motor são módulos registrados e consultáveis; documentação,
    schemas e grafos derivam dos mesmos contratos executáveis.
17. Uma capacidade composta pode ser reutilizada como subgrafo declarativo; um
    algoritmo novo entra como extensão nativa confinada e validada.

## Desvios a evitar

Os seguintes caminhos contradizem esta definição:

- tentar modelar um carro inteiro em um único arquivo procedural;
- tentar modelar um motor inteiro como uma única receita indivisível;
- transformar todo detalhe visual em arquivo separado sem significado mecânico;
- manter relações apenas em prosa;
- usar posição de câmera ou UUID do Three.js como identidade persistida;
- oferecer à IA apenas parâmetros de modelos preparados;
- permitir que uma alteração local ignore montagens dependentes;
- considerar uma imagem bonita prova suficiente de encaixe;
- tratar o MCP como substituto do núcleo ou do formato de montagem;
- acrescentar escrita antes de definir transação, alvo e validação;
- esconder falhas para manter um fluxo aparentemente verde.
