# Montagens semânticas — visão, teto e mapa de maturidade

Este documento antecipa o espaço de solução do candidato `AUT-05`: posição,
encaixe e hierarquia semânticos. Ele existe para que decisões pequenas não
fechem, por acidente, o caminho para montagens maiores — e para que a visão de
longo prazo não autorize a construção prematura de um CAD ou solucionador
universal.

**Estado deste documento:** o Recorte A foi concluído por
[`AUT-2026-06`](planos/2026-08-02-interfaces-de-encaixe.md). O documento continua
um mapa de teto: nenhum item abaixo substitui um plano curto ativo em
`planos/README.md`.

## Índice — a visão abstraída

### A frase

Uma montagem semântica guarda **por que** as peças estão relacionadas; posição
e orientação são consequências reproduzíveis dessa intenção, não coordenadas
soltas que outra IA precisa redescobrir.

### O fluxo inteiro

```text
peça identificada
  → porta semântica com quadro local
    → relação declarada entre duas portas
      → validação explicável
        → transformação derivada
          → submontagem hierárquica
            → propagação incremental
              → conjunto limitado de restrições
                → variantes e instâncias
                  → montagens muito grandes
                    → juntas e comportamento
                      → explicação no produto
```

Cada seta é um degrau lógico. O degrau seguinte depende do contrato e das provas
do anterior; não é apenas uma tela nova.

### Mapa de níveis

| Nível | Capacidade observável | Estado | Primeiro gate imaginado |
|---|---|---|---|
| 0 | piloto, vocabulário e baseline mensurável | não iniciado | roda, cubo e freio têm relações atuais congeladas |
| 1 | portas com quadro e interface semânticos | não iniciado | portas sobrevivem a transformação e replay |
| 2 | relações dirigidas, ainda sem mover peça | não iniciado | `encaixa`/`alinha` validam uma montagem existente |
| 3 | posicionamento derivado de uma relação | não iniciado | uma peça móvel chega à pose única esperada |
| 4 | diagnóstico de folga, contato e colisão com intenção | não iniciado | encaixe oco deixa de ser falso positivo sem esconder colisão |
| 5 | hierarquia de peças e submontagens | não iniciado | selecionar um pai alcança a subárvore correta |
| 6 | grafo de dependências e propagação incremental | não iniciado | mudar uma medida recalcula só os dependentes |
| 7 | múltiplas restrições e graus de liberdade limitados | não iniciado | conflito e ambiguidade gritam com causa mínima |
| 8 | instâncias, variantes e configurações | não iniciado | variantes não duplicam nem confundem identidades |
| 9 | escala para centenas ou milhares de componentes | não iniciado | custo cresce com o trecho afetado, não com a montagem inteira |
| 10 | juntas, cinemática e estados funcionais | não iniciado | movimento respeita graus de liberdade declarados |
| 11 | projeção didática e causal no produto | não iniciado | o cliente vê relação, falha e consequência sem alterar autoria |

### Leitura rápida do teto

- **Teto próximo:** uma IA encaixa roda, cubo e freio por nomes e recebe um
  diagnóstico de folga compreensível.
- **Teto intermediário:** uma IA altera uma peça, e submontagens dependentes são
  reposicionadas ou reprovadas de modo incremental e explicável.
- **Teto alto:** sistemas com muitas instâncias, variantes e restrições limitadas
  permanecem navegáveis, reexecutáveis e editáveis por intenção.
- **Teto de produto:** juntas e relações alimentam animações e explicações de
  funcionamento, desgaste e consequência no `warbookbr/mecanica`.
- **Fora da promessa:** inferir sozinho a engenharia correta, simular resistência
  estrutural, substituir um CAD industrial ou diagnosticar um veículo real.

## Como atualizar este mapa

Cada nível usa um estado exclusivo:

- `[x] NÃO INICIADO` — hipótese mapeada, sem fatia executada;
- `[ ] EM DESENVOLVIMENTO` — há ao menos uma fatia em curso ou comprovada, mas o
  gate inteiro do nível ainda não foi atendido;
- `[ ] CONCLUÍDO` — o gate foi atendido e a evidência permanente foi vinculada.

Ao iniciar uma fatia, mova o `[x]` para `EM DESENVOLVIMENTO`; ao concluir o gate
inteiro do nível, mova-o para `CONCLUÍDO`. O plano ativo é controlado somente
por `planos/README.md`. Checklists internos mostram entregas, não porcentagem.
Uma caixa marcada não promove o nível se o gate observável continuar vermelho.

Descoberta grande não aumenta o plano em curso: volta para este mapa ou para o
backlog. Um nível pode exigir vários planos curtos, cada um com um resultado.

## O que já existe e o que ainda falta

O projeto não começa do zero:

- peças e faces têm identidade semântica estável;
- geradores e operações publicam origens endereçáveis;
- `publicarPorta` dá nome de autoria a uma seleção estrutural e o núcleo devolve
  as portas publicadas;
- `arranja` dá identidade a cada cópia;
- a régua mede caixas, componentes conexos e relações aproximadas;
- a bancada seleciona, isola, contextualiza, explode e compartilha estado;
- receitas são determinísticas, versionadas e reexecutáveis.

Mas a porta atual ainda é, essencialmente, uma **seleção de faces com nome**.
Ela não declara sozinha um quadro local completo, volume vazio, assento, eixo,
cardinalidade ou compatibilidade. Partes continuam planas, e a montagem não
guarda uma relação como `encaixa`; guarda coordenadas e testes que produzem esse
efeito. É essa distância que os níveis abaixo percorrem.

As evidências concretas são:

- A-16: a caixa do aro e a caixa do pneu se sobrepõem por definição, mas isso
  não prova colisão entre sólidos nem o encaixe da cavidade;
- A-29: uma cópia radial é endereçável, porém um ponto local nela ainda pode
  obrigar o autor a reconstruir a rotação no mundo;
- A-32/`PEC-01`: o cubo precisa separar piloto e flange, e a roda precisa citar
  a interface correta;
- O-7/A-4: 31% dos passos do primeiro freio eram transporte de primitivas;
- O-8/A-6: a intenção “encostar” existe apenas em aritmética e testes;
- O-10/A-11: oito partes irmãs não expressam o sistema nem suas submontagens.

## Definições de trabalho

Os nomes abaixo são conceitos, não formato já aprovado.

- **Peça:** unidade autorada com identidade e geometria próprias.
- **Parte:** região semântica navegável dentro de uma peça ou montagem.
- **Porta:** interface nomeada que uma relação pode citar. Pode descrever quadro,
  superfície, eixo, contorno, volume vazio ou outra característica explícita.
- **Quadro local:** origem e orientação anexadas à porta, expressas no espaço da
  peça e transformáveis para o mundo.
- **Relação:** intenção persistida entre portas, como alinhar, encostar, encaixar,
  atravessar ou manter distância.
- **Pose:** posição e orientação de uma peça. Pode ser declarada ou derivada.
- **Montagem:** grafo versionado de peças, submontagens e relações.
- **Restrição:** relação que remove um ou mais graus de liberdade.
- **Configuração:** escolha nomeada de parâmetros, variantes e relações ativas.
- **Diagnóstico:** explicação estruturada do que satisfez, divergiu ou ficou
  ambíguo; nunca apenas `true`/`false`.

O escopo inicial é **montagem de corpos rígidos**. Malha orgânica, cabo
deformável, mangueira, borracha comprimida e peça com folga dinâmica podem usar
identidade, portas e hierarquia, mas não devem herdar automaticamente as mesmas
métricas de encaixe ou propagação de pose. Cada comportamento deformável exige
evidência e contrato próprios.

## Invariantes que valem desde o primeiro nível

### Identidade e persistência

1. Nenhuma identidade persistida usa UUID do Three.js, índice de array, posição
   de passo ou caminho de objeto do runtime.
2. Nome de exibição não é identidade. Renomear rótulo não pode desconectar a
   montagem.
3. Instâncias recebem identidade derivada e estável; duas cópias nunca publicam
   a mesma porta efetiva.
4. O documento salva a **intenção** e os parâmetros necessários. Pose, caixa,
   matriz e cache derivados só são salvos quando houver contrato explícito de
   verificação ou exportação.
5. Todo formato é versionado e migrável; replay antigo não muda de significado
   silenciosamente.

### Determinismo e lógica

1. A mesma entrada produz a mesma montagem, diagnósticos na mesma ordem e o
   mesmo artefato canônico.
2. Ambiguidade grita. “Escolher a face mais próxima” só é válido quando a regra
   e o desempate fazem parte do contrato.
3. Relações têm direção explícita: quem é referência, quem pode mover e quais
   graus de liberdade podem mudar.
4. Falta de solução, mais de uma solução e conflito são estados diferentes.
5. Ciclos são detectados antes de alterar geometria ou pose.
6. Uma operação falha atomicamente: nenhuma metade da montagem fica atualizada.
7. Nenhuma rotina “conserta” geometria, solda pontos ou troca a relação por
   tolerância sem registrar a decisão.

### Geometria e unidades

1. O núcleo usa uma convenção única de unidade, mão dos eixos e composição de
   transformações.
2. Um quadro exige origem e orientação completas. Um eixo sozinho deixa o giro
   ao redor dele indefinido.
3. Comparações usam tolerâncias declaradas e dimensionais; igualdade exata de
   `float` e um epsilon global servindo a qualquer escala são proibidos.
4. Caixa delimitadora é diagnóstico conservador, não prova universal de contato
   ou colisão.
5. Volume sólido, cavidade e superfície de assento são naturezas diferentes;
   sobreposição pode ser correta em uma e defeito em outra.
6. Porta não é inferida por aparência quando a intenção precisa sobreviver a
   uma mudança de topologia. O autor publica a interface.

### Fronteiras de arquitetura

1. Relações, validação e serialização permanecem independentes de Three.js e de
   vocabulário automotivo.
2. Adaptadores projetam poses e hierarquia para Three.js; não viram fonte da
   verdade.
3. Conhecimento mecânico específico fica na receita, no pacote de domínio ou no
   produto, nunca escondido numa operação geral.
4. O `nos-mecanifica` resolve e exporta autoria. O `warbookbr/mecanica` apresenta
   o resultado ao cliente sem carregar o núcleo procedural.
5. Toda capacidade geral extraível é isolada e registrada em `UPSTREAM-NOS.md`.

### Ergonomia para IA

1. A IA deve conseguir listar portas, relações, graus de liberdade e dependentes
   sem ler o núcleo.
2. Toda recusa nomeia relação, portas envolvidas, valor observado, tolerância e
   próximo dado necessário.
3. Deve existir modo de prévia: resolver e diagnosticar sem gravar nem mover a
   montagem persistida.
4. Exemplos ensinam intenção e limites; não incentivam copiar coordenadas.
5. O vocabulário cresce somente depois de uma montagem real revelar a falta.

## Modelo conceitual — não é uma proposta de sintaxe

```js
porta: {
  id: 'aro.assentoDoCubo',
  em: 'rodaDianteira',
  natureza: 'cavidade',
  quadro: {
    origem: [/* ponto local declarado */],
    eixo: [/* normal ou eixo principal */],
    acima: [/* resolve o giro restante */],
  },
  interface: {
    forma: 'cilindrica',
    raio: 'aberturaDoAro',
    profundidade: 'profundidadeDoAssento',
  },
}

relacao: {
  id: 'rodaNoCubo',
  tipo: 'encaixa',
  referencia: 'cubo.piloto',
  movel: 'aro.assentoDoCubo',
  folgaRadial: 'folgaDeMontagem',
}
```

O exemplo mostra decisões que qualquer sintaxe precisará responder: quadro
completo, natureza da interface, direção da relação e folga. Ele não promete os
nomes dessas chaves nem autoriza implementá-las.

## Três grafos que não podem virar um só

Uma montagem madura provavelmente projetará os mesmos componentes em três
estruturas diferentes:

1. **Grafo de composição:** responde “quem contém quem?”. Para navegação,
   seleção, pose local, isolamento, exportação e ciclo de vida. Idealmente é uma
   árvore ou floresta: um nó tem no máximo um pai de composição.
2. **Grafo de dependências:** responde “o que precisa ser recalculado quando isto
   muda?”. É dirigido e começa acíclico. Uma relação pode depender de portas em
   ramos diferentes da composição.
3. **Grafo de relações/restrições:** responde “quais intenções geométricas ligam
   estes elementos?”. Pode conter ciclos fisicamente legítimos no teto alto,
   embora o primeiro recorte deva recusá-los.

Usar a árvore visual como ordem de cálculo quebra quando uma roda depende do
cubo em outro ramo. Usar dependência como hierarquia dá vários pais a uma peça.
Usar relação como propriedade do pai esconde conexões cruzadas. Os três grafos
podem compartilhar identidades de nó, mas suas arestas, regras de ciclo e
consultas são diferentes.

## Ciclo lógico de uma atualização

Antes de qualquer implementação, a ordem conceitual precisa permanecer clara:

```text
validar documento e versões
  → resolver identidades e portas
    → montar grafos e detectar violações estruturais
      → calcular prévia das poses e valores derivados
        → validar relações, folgas e colisões
          → produzir diagnósticos ordenados
            → confirmar tudo atomicamente ou não confirmar nada
              → canonicalizar e exportar quando solicitado
```

O estado persistido guarda intenção. “Satisfeita”, “em conflito”, pose mundial,
caixa e ordem de recálculo são resultados da execução; não viram segunda fonte
da verdade. Se algum derivado for incluído no artefato exportado por desempenho,
ele precisa viajar com versão e assinatura das entradas que permitem verificá-lo.

Esse ciclo também define a ergonomia da IA: a prévia pode falhar e explicar sem
modificar o arquivo; uma aplicação só acontece depois de toda a transação passar.

## Nível 0 — piloto e baseline mensurável

**Resultado:** escolher uma montagem pequena que exponha posição, cavidade,
contato e hierarquia sem exigir um solucionador geral.

**Piloto recomendado:** roda dianteira + cubo-piloto + flange + disco. Primeiro
o `PEC-01` corrige o desenho do cubo; depois o aro cita o piloto correto. Pneu e
aro fornecem o caso de encaixe oco. Pastilha e disco fornecem contato plano.

**Por que começar medindo:** a primeira entrega deve declarar e validar relações
numa montagem cuja pose atual já é conhecida. Mover automaticamente antes de
saber medir torna impossível distinguir erro do quadro, da relação ou do
solucionador.

**Gate do nível:** baseline numérico e visual versionado; relações pretendidas,
folgas e graus de liberdade escritos em linguagem humana; uma fixture neutra
equivalente, como eixo/rolamento/alojamento ou pino/luva.

**Cuidados específicos:** não deformar roda ou cubo para fazer a ferramenta
passar; não escolher o vocabulário apenas pelo freio; não usar a caixa global
como oráculo de cavidade.

**Estado**

- [ ] NÃO INICIADO
- [ ] EM DESENVOLVIMENTO
- [x] CONCLUÍDO

**Checklist**

- [x] corrigir e medir cubo-piloto/flange sem esconder a folga atual;
- [x] nomear as interfaces mínimas do aro e do piloto, sem inventar as demais;
- [x] registrar referência (`freio`) e móvel (`roda`) da primeira relação;
- [x] congelar pose, escalas, folga válida e mutações que devem reprovar;
- [x] criar caso não automotivo com as mesmas relações (pino e luva);
- [x] decidir o primeiro plano curto sem ativar os níveis seguintes.

## Nível 1 — portas com quadro e interface semânticos

**Resultado:** uma porta deixa de ser apenas seleção de faces e passa a oferecer
os dados mínimos para orientar e validar uma conexão.

**Capacidades imaginadas:** quadro local completo; natureza `superficie`,
`eixo`, `contorno`, `volumeExterno`, `cavidade` ou `assento`; medidas citadas por
parâmetro; cardinalidade e compatibilidade optativas.

**Gate do nível:** transladar, rotacionar, espelhar e instanciar uma peça mantém
a porta no lugar esperado; serialização e replay são canônicos; porta incompleta,
degenerada ou duplicada é recusada antes da montagem.

**Cuidados específicos:** eixo sem vetor “acima” deixa uma família infinita de
poses; normal de face pode inverter com espelhamento; centroide pode mudar com a
topologia; interface vazia não pode ser confundida com o sólido que a envolve.

**Estado**

- [ ] NÃO INICIADO
- [x] EM DESENVOLVIMENTO
- [ ] CONCLUÍDO

**Checklist**

- [ ] definir convenção de quadro local, mão, unidade e transformação;
- [ ] separar identidade da porta, rótulo e dados derivados;
- [ ] declarar comportamento sob espelho e `arranja`;
- [x] validar vetores nulos, não finitos e medidas negativas na interface cilíndrica;
- [x] expor a interface cilíndrica no `descrever`; a bancada ainda só lista a porta;
- [ ] provar replay e round-trip fora do domínio automotivo.

## Nível 2 — relações dirigidas sem reposicionamento

**Resultado:** a intenção entra no documento e pode validar uma pose já pronta,
mas ainda não move nenhuma peça.

**Capacidades imaginadas:** `alinha`, `coincide`, `encosta`, `distancia`,
`concentrico`, `atravessa` e `encaixa`. O vocabulário final deve nascer do
piloto; esta lista é horizonte.

Neste nível, validar significa medir resíduos simples de quadro, eixo, plano ou
distância. A geometria especializada de cavidade, interferência e contato fica
no nível 4; assim a relação pode ser provada antes de existir um detector de
colisão sofisticado.

**Por que é um degrau separado:** validação read-only prova a semântica e os
diagnósticos sem misturá-los à composição de transformações. Também entrega
valor imediato para IA: a intenção deixa de morar apenas em comentários e
testes.

**Gate do nível:** a montagem correta passa; deslocamentos e rotações controlados
produzem diagnósticos distintos; trocar referência e móvel não acontece em
silêncio; nenhuma relação escolhe uma porta implícita.

**Cuidados específicos:** definir cardinalidade (`uma`, `muitas`, opcional),
compatibilidade entre naturezas, direção e tolerância. `encosta` entre planos,
`encaixa` entre volumes e `alinha` entre quadros não são sinônimos.

**Estado**

- [ ] NÃO INICIADO
- [x] EM DESENVOLVIMENTO
- [ ] CONCLUÍDO

**Checklist**

- [x] escolher `encaixaCilindrico` exigido pelo piloto;
- [x] definir referência, móvel e graus de liberdade que continuam intocados;
- [ ] definir estado satisfeito, divergente, ambíguo e impossível;
- [ ] produzir diagnóstico estruturado e ordenado;
- [ ] testar relações invertidas e portas incompatíveis;
- [x] manter o modo estritamente read-only neste nível.

## Nível 3 — posicionamento derivado de uma relação

**Resultado:** uma relação dirigida calcula uma pose única para uma peça móvel,
mantendo a referência fixa.

**Capacidades imaginadas:** alinhar quadros completos; aplicar deslocamento ou
folga declarada; compor transformação local com a pose do pai; pré-visualizar
antes de confirmar.

**Gate do nível:** partindo de três poses iniciais diferentes, a mesma relação
chega à mesma pose canônica; repetir a resolução é idempotente; desfazer restaura
o estado anterior; falha não deixa transformação parcial.

**Cuidados específicos:** ordem de multiplicação das matrizes, escala não
uniforme, reflexão, pivô, espaço local versus mundo e giro residual. A primeira
versão deve mover um lado só e resolver uma relação só; dois corpos livres já
introduzem infinitas respostas equivalentes.

**Estado**

- [x] NÃO INICIADO
- [ ] EM DESENVOLVIMENTO
- [ ] CONCLUÍDO

**Checklist**

- [ ] congelar a regra “referência fixa, recebido móvel”;
- [ ] implementar prévia pura e aplicação transacional;
- [ ] provar composição local/mundo e pai transformado;
- [ ] testar idempotência, determinismo e rollback;
- [ ] recusar escala/reflexão fora do contrato inicial;
- [ ] comparar pose derivada com o baseline do nível 0.

## Nível 4 — validação explicável de encaixe e colisão

**Resultado:** a ferramenta distingue sobreposição esperada, folga correta,
contato, interferência real e ausência de alcance.

**Capacidades imaginadas:** medidas entre interfaces declaradas; envelope local
da porta; pares sólido–cavidade; tolerância radial e axial; relatório de contato;
colisão ampla como alerta separado.

**Gate do nível:** `aro↔pneu` e `aro↔piloto` recebem leitura coerente; uma invasão
de sólido semelhante reprova; remover a relação não silencia a colisão global;
o caso neutro produz os mesmos estados.

**Cuidados específicos:** nunca adicionar “ignorar colisão” genérico para fazer
um encaixe passar. A relação justifica uma métrica local, não apaga o restante
da geometria. AABB serve como filtro amplo; contato curvo ou concavidade pode
exigir métrica própria. Tolerância de fabricação não é epsilon numérico.

**Estado**

- [x] NÃO INICIADO
- [ ] EM DESENVOLVIMENTO
- [ ] CONCLUÍDO

**Checklist**

- [ ] separar tolerância numérica, folga de projeto e tolerância de fabricação;
- [ ] definir métricas por par de naturezas de porta;
- [ ] manter colisão global visível ao lado da relação local;
- [ ] testar falso positivo, falso negativo e limite exato;
- [ ] explicar valor, unidade, tolerância e interfaces comparadas;
- [ ] medir custo antes de aceitar malha contra malha como padrão.

## Nível 5 — hierarquia de peças e submontagens

**Resultado:** partes deixam de ser uma lista plana e passam a formar uma árvore
navegável, sem duplicar a verdade das relações.

**Capacidades imaginadas:** pai/filho explícito; seleção por subárvore; pose local
ao pai; submontagem reutilizável; políticas de isolamento, explosão e exportação.

**Gate do nível:** `freioDianteiroDireito` contém suas partes; a pinça agrupa os
componentes definidos pelo contrato; selecionar, mover ou exportar uma subárvore
não perde nem duplica faces e portas; o formato antigo migra de modo explícito.

**Cuidados específicos:** hierarquia é propriedade de composição, não licença
para uma face pertencer a dois pais. Relações podem cruzar subárvores, portanto
árvore visual e grafo de dependências não são a mesma coisa. Alterar pai muda o
espaço local e exige migração de pose.

**Estado**

- [x] NÃO INICIADO
- [ ] EM DESENVOLVIMENTO
- [ ] CONCLUÍDO

**Checklist**

- [ ] definir identidade de nó e caminho semântico sem usar nome de exibição;
- [ ] decidir se peça e parte compartilham ou não o mesmo tipo de nó;
- [ ] definir pose local, reparenting e preservação da pose mundial;
- [ ] migrar lista plana com versão e prova byte/canônica apropriada;
- [ ] adaptar bancada, descrição e exportação;
- [ ] testar subárvore, relação cruzada e nó removido.

## Nível 6 — grafo de dependências e propagação incremental

**Resultado:** mudar parâmetro, porta ou peça invalida e recalcula somente o
trecho dependente, com a causa rastreável.

**Capacidades imaginadas:** grafo dirigido acíclico inicial; ordem topológica;
marcação de “sujo”; cache derivado por assinatura; consulta “quem depende de
quem”; transação de atualização.

**Gate do nível:** uma alteração no piloto recalcula apenas as relações e
submontagens alcançáveis; resultado coincide com reconstrução integral; ciclo é
recusado com o caminho mínimo; falha reverte toda a transação.

**Cuidados específicos:** pai visual não define dependência lógica; caches não
viram fonte da verdade; eventos não podem depender da ordem de iteração de Map
ou do scheduler; uma atualização não pode disparar cascata infinita.

**Estado**

- [x] NÃO INICIADO
- [ ] EM DESENVOLVIMENTO
- [ ] CONCLUÍDO

**Checklist**

- [ ] definir nós, arestas e assinatura de entrada;
- [ ] separar grafo de hierarquia do grafo de dependências;
- [ ] ordenar diagnósticos e recomputações deterministicamente;
- [ ] detectar ciclo antes da aplicação;
- [ ] provar incremental igual à reconstrução integral;
- [ ] instrumentar quantidade e tempo de nós recalculados.

## Nível 7 — múltiplas restrições e graus de liberdade limitados

**Resultado:** uma peça pode satisfazer mais de uma relação compatível, e a
ferramenta explica quando o conjunto está completo, subdeterminado ou em
conflito.

**Capacidades imaginadas:** contagem de graus de liberdade; grupos rígidos;
restrições compatíveis; prioridades somente se explícitas; solucionadores
especializados por família, não um otimizador genérico opaco.

**Gate do nível:** casos de solução única, infinitas soluções e nenhuma solução
são classificados corretamente; a menor coleção conflitante é reportada; ordem
de declaração não muda a resposta.

**Cuidados específicos:** este é o primeiro nível com risco real de virar um CAD
universal. Não usar “tente até convergir” como contrato. Solução aproximada sem
resíduo e orçamento declarados é não determinismo. Prioridade silenciosa apenas
esconde contradição.

**Estado**

- [x] NÃO INICIADO
- [ ] EM DESENVOLVIMENTO
- [ ] CONCLUÍDO

**Checklist**

- [ ] provar necessidade com uma montagem que o nível 3 não expressa;
- [ ] modelar graus de liberdade de cada relação admitida;
- [ ] limitar combinações e orçamento da primeira versão;
- [ ] detectar subdeterminação e sobre-restrição;
- [ ] produzir conjunto conflitante mínimo ou aproximação declarada;
- [ ] testar permutação da ordem e repetibilidade entre plataformas.

## Nível 8 — instâncias, variantes e configurações

**Resultado:** uma montagem reutiliza definições e alterna opções sem copiar
geometria, relações ou identidades à mão.

**Capacidades imaginadas:** definição versus instância; namespace por instância;
variante de peça; relações condicionais; configuração nomeada; diferença entre
substituir componente e alterar parâmetro.

**Gate do nível:** duas instâncias do mesmo conjunto têm portas distintas e
resultado igual; trocar uma variante preserva relações compatíveis e denuncia
as incompatíveis; replay não depende da ordem de carregamento.

**Cuidados específicos:** identidade da definição não é identidade da instância;
override profundo vira linguagem paralela; relações condicionais podem criar
grafos diferentes e precisam entrar na versão e na assinatura.

**Estado**

- [x] NÃO INICIADO
- [ ] EM DESENVOLVIMENTO
- [ ] CONCLUÍDO

**Checklist**

- [ ] separar identidade de definição, instância e porta efetiva;
- [ ] definir herança ou composição de variantes, escolhendo uma só inicialmente;
- [ ] validar compatibilidade antes da substituição;
- [ ] canonicalizar configurações e condições;
- [ ] testar duas instâncias, variante ausente e migração;
- [ ] impedir colisão de nomes e caches compartilhados indevidamente.

## Nível 9 — escala para montagens muito grandes

**Resultado:** centenas ou milhares de componentes continuam consultáveis e
editáveis sem reconstrução integral ou contexto textual impraticável para IA.

**Capacidades imaginadas:** resolução incremental; índices espaciais; carregamento
por submontagem; LOD visual separado do modelo; consultas paginadas; orçamento
de memória e tempo; diagnóstico agregado com expansão sob demanda.

**Gate do nível:** benchmark versionado mede montagem sintética e montagem real;
alteração local toca apenas o subgrafo esperado; resultado integral permanece
canônico; interface e ferramenta de IA não despejam a árvore inteira.

**Cuidados específicos:** otimizar antes do nível 6 cria cache sem dependência
confiável. LOD não pode remover identidade ou mudar validação. Paralelismo não
pode alterar a ordem canônica. Limites de entrada evitam explosão de instâncias,
relações ou diagnóstico.

**Estado**

- [x] NÃO INICIADO
- [ ] EM DESENVOLVIMENTO
- [ ] CONCLUÍDO

**Checklist**

- [ ] definir cenários e orçamentos, não apenas “muitos componentes”;
- [ ] medir reconstrução integral e atualização local;
- [ ] indexar por identidade, subgrafo e espaço sem duplicar autoridade;
- [ ] separar detalhe visual de detalhe semântico;
- [ ] testar determinismo sob paralelismo e carregamento parcial;
- [ ] oferecer consultas pequenas e navegáveis para agentes.

## Nível 10 — juntas, cinemática e estados funcionais

**Resultado:** algumas relações deixam de fixar pose e passam a declarar movimento
permitido: rotação, translação, curso, batente e estado.

**Capacidades imaginadas:** junta revoluta, prismática e fixa; limites; pose em
função de `t`; cadeia cinemática; interferência durante o movimento; estados
normal, gasto ou falho como configurações autorais.

**Gate do nível:** uma fixture neutra percorre todo o curso sem romper relações;
limites e batentes são respeitados; a mesma entrada gera a mesma trajetória; o
produto reproduz sem importar o solucionador de autoria.

**Cuidados específicos:** cinemática não é dinâmica. Massa, força, atrito,
elasticidade e resistência não entram por associação. Loop cinemático é muito
mais difícil que cadeia aberta. Amostragem que não detecta colisão entre quadros
não prova curso seguro.

**Estado**

- [x] NÃO INICIADO
- [ ] EM DESENVOLVIMENTO
- [ ] CONCLUÍDO

**Checklist**

- [ ] provar primeiro juntas fixa, revoluta e prismática separadamente;
- [ ] declarar eixo, limites, zero e unidade;
- [ ] distinguir pose estática, parâmetro de animação e estado persistido;
- [ ] validar curso contínuo ou declarar a resolução de amostragem;
- [ ] manter dinâmica e engenharia estrutural fora do contrato;
- [ ] exportar trajetória/estado sem dependência do runtime de autoria.

## Nível 11 — projeção didática e causal no produto

**Resultado:** o produto usa a montagem resolvida para mostrar localização,
funcionamento, desgaste e consequência, sem transformar a linguagem geral em
vocabulário automotivo.

**Capacidades imaginadas:** seleção por sistema/subárvore; explosão guiada por
relações; destaque de interfaces; sequência de desmontagem; estados de desgaste;
grafo causal de domínio apontando para identidades exportadas.

**Gate do nível:** um mecânico conduz uma explicação completa do primeiro freio;
o produto mostra que relação mudou e qual consequência foi declarada; nenhum
diagnóstico é inventado pela ferramenta.

**Cuidados específicos:** relação geométrica não prova causalidade mecânica.
“Pastilha encosta no disco” não autoriza concluir perda de frenagem. Narrativa,
diagnóstico e responsabilidade profissional ficam no produto e em dados de
domínio revisados. O produto consome peças resolvidas, não `PASSOS`.

**Estado**

- [x] NÃO INICIADO
- [ ] EM DESENVOLVIMENTO
- [ ] CONCLUÍDO

**Checklist**

- [ ] definir o contrato exportado de hierarquia, portas e relações necessárias;
- [ ] separar fato geométrico, estado mecânico e texto didático;
- [ ] mapear explosão e animação por identidade semântica;
- [ ] provar acessibilidade e entendimento sem depender apenas de cor;
- [ ] impedir diagnóstico inferido sem fonte/autoria explícita;
- [ ] validar integração no `warbookbr/mecanica` como plano próprio.

## Cuidados transversais por nível

| Cuidado | Níveis em que nasce | Onde precisa continuar sendo provado |
|---|---|---|
| identidade estável | 0–1 | todos |
| quadro local completo e mão correta | 1 | 2–11 |
| intenção separada da pose derivada | 2 | 3–11 |
| referência/móvel e graus de liberdade | 2–3 | 6–10 |
| tolerância com unidade e natureza | 2–4 | 7–10 |
| ambiguidade e conflito explícitos | 2 | 3–10 |
| atomicidade e rollback | 3 | 6–10 |
| sólido versus cavidade | 1–4 | 7, 10–11 |
| hierarquia separada de dependência | 5 | 6–11 |
| ciclo e ordem determinística | 6 | 7–10 |
| definição versus instância | 8 | 9–11 |
| cache derivado, nunca autoridade | 6 | 9–11 |
| fronteira autoria/produto | 0 | todos |
| diagnóstico legível por IA | 1 | todos |

## Classes de falha que precisam existir no vocabulário

Não reduzir todos os erros a “não encaixa”. No teto da ferramenta, pelo menos
estas classes são distintas:

1. identidade ou porta inexistente;
2. porta incompleta ou degenerada;
3. naturezas incompatíveis;
4. relação sem direção ou com móvel bloqueado;
5. pose subdeterminada — faltam graus de restrição;
6. pose ambígua — mais de uma solução discreta;
7. relações conflitantes — nenhuma solução;
8. ciclo de dependência;
9. folga fora do intervalo;
10. interferência local na interface;
11. colisão fora da interface declarada;
12. limite numérico ou orçamento excedido;
13. versão ou migração incompatível;
14. referência válida na definição, mas ausente numa variante;
15. dado de domínio necessário, mas não declarado.

Cada diagnóstico deve apontar para identidades semânticas, nunca para UUID ou
índice. Quando possível, deve incluir o menor caminho causal e uma sugestão de
dado faltante — não uma correção automática inventada.

## Estratégia de testes ao longo da escada

### Pirâmide de prova

1. **Funções puras:** quadro, composição, tolerância, classificação e grafo.
2. **Formato:** validação, round-trip, migração e canonicalização.
3. **Fixture neutra:** prova fora do vocabulário automotivo.
4. **Piloto real:** roda, cubo e freio com medidas conhecidas.
5. **Adaptador:** mesma semântica em headless e Three.js.
6. **Bancada:** inspeção visual e diagnóstico legível.
7. **Exportação/produto:** artefato resolvido reproduz a montagem sem o núcleo.

### Provas que devem reaparecer em todos os níveis aplicáveis

- determinismo por repetição e permutação da ordem de entrada;
- entradas inválidas e limites de orçamento;
- transformação em pai já transformado;
- espelho e instância quando admitidos;
- replay e round-trip de formato;
- mutação que demonstre que o gate cai pelo motivo certo;
- comparação de atualização incremental com reconstrução integral;
- diagnóstico com identidade, unidade e causa;
- revisão visual em mais de uma vista, sempre como complemento da medida.

### O que uma foto não prova

- coincidência numérica ou folga;
- ausência de colisão interna;
- identidade e cardinalidade corretas;
- determinismo;
- solução única;
- ausência de ciclo;
- preservação depois de mudar um parâmetro.

A bancada é indispensável para leitura, mas o gate de montagem precisa existir
também em estado neutro e headless.

## Primeiro recorte recomendado

O pré-início sugeriu dois planos curtos consecutivos. O Recorte A foi concluído
por [`AUT-2026-06`](planos/2026-08-02-interfaces-de-encaixe.md); o Recorte B
permanece apenas candidato.

### Recorte A — interfaces mensuráveis, sem movimento automático

1. executar `PEC-01`: separar piloto e flange no cubo e ajustar a roda sem
   alterar o encaixe correto;
2. estender portas somente com os dados que esse encaixe exige;
3. declarar uma relação de encaixe dirigida entre aro e piloto;
4. medir folga radial/axial e manter colisão global separada;
5. provar em pino e luva não automotivos;
6. não mover peça, não criar hierarquia e não resolver múltiplas restrições.

**Resultado verificável:** a montagem atual explica por dados por que o aro cabe
no piloto, e uma variação inválida reprova com medida e causa.

### Recorte B — uma relação, uma referência, uma peça móvel

1. usar as mesmas portas já provadas;
2. manter o cubo fixo e derivar a pose da roda;
3. resolver quadro completo e folga declarada;
4. provar três poses iniciais, idempotência e rollback;
5. não combinar relações nem adicionar solucionador.

**Resultado verificável:** uma roda deslocada volta à única pose canônica do
piloto, e uma relação impossível não altera a montagem.

Essa separação reduz o principal risco lógico: se medir e mover entrarem juntos,
um erro pode produzir uma pose que valida a própria régua errada.

## Perguntas que o primeiro plano deverá congelar

1. Qual é a convenção exata do quadro da porta?
2. Porta pertence a peça, parte ou a ambas?
3. Quais dados são persistidos e quais são derivados?
4. Como uma porta se comporta sob espelho e instância?
5. Qual lado é referência e qual pode mover?
6. Qual é a diferença formal entre cavidade, assento e superfície?
7. Como folga de projeto e tolerância numérica são declaradas?
8. Qual relação mínima o piloto realmente exige?
9. Como o diagnóstico aparece no `descrever` e na bancada?
10. O que atravessa para `pecas-resolvidas` e para o produto?
11. Qual fixture neutra prova que o núcleo não virou automotivo?
12. Que mutação demonstra que cada gate vigia o contrato certo?

## Critérios para não avançar de nível

Pare e devolva a descoberta ao mapa quando:

- a única saída depender de UUID, índice ou ordem acidental;
- uma ambiguidade for resolvida por escolha silenciosa;
- o formato precisar salvar estado interno de Three.js ou de um solver;
- tolerância passar a funcionar como solda ou reparo invisível;
- uma relação automotiva for embutida numa operação geral;
- a prova depender apenas de screenshot;
- a versão incremental divergir da reconstrução integral;
- o nível exigir migrar todo o acervo antes de existir piloto;
- o escopo crescer para múltiplas restrições sem uma relação dirigida provada;
- um diagnóstico não conseguir dizer qual dado ou relação causou a falha.

## Sinal de sucesso da visão

Uma IA nova consegue abrir uma montagem, consultar sua árvore e suas relações,
alterar uma medida ou componente, prever o trecho afetado, executar uma prévia e
receber um diagnóstico reproduzível — sem reconstruir coordenadas, sem ler o
núcleo e sem aceitar uma correção geométrica silenciosa.

O número de componentes pode crescer muito depois disso. O que torna a escala
possível não é um solver maior: é a combinação, provada desde cedo, de identidade
estável, quadros completos, relações dirigidas, grafos explícitos, atualização
incremental e diagnósticos que uma pessoa ou IA consegue seguir.
