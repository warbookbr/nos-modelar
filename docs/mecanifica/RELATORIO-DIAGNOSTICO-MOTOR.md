# Relatório — diagnóstico do motor procedural

**Estado:** concluído

**Base examinada:** `a5b1a183b9e75aeba88836ab94fa767aade80484`

**Canal de evidências:** issue #30

**Decisão:** **motor adequado → abrir Montagem Mínima Persistida v1**.

## 1. Resumo executivo

O motor atual resolve uma definição de peça em coordenadas locais, de forma
determinística, mantendo geometria, partes, portas, origens, materiais e
diagnósticos suficientes para consumo externo. A separação entre núcleo neutro e
adaptadores visuais é real e deve ser preservada.

As provas com peça real, receita sintética criada em memória e caminho visual
mostraram que duas execuções da mesma definição produzem objetos independentes
para geometria, partes, portas, buffers, materiais Three.js e transformação
visual. A posição de uma ocorrência não pertence ao núcleo da peça; deve ser
adicionada pela futura camada de montagem.

Furação, revolução, arranjo, espelho e hierarquia interna foram exercitados com
testes e execuções focadas. Nenhuma falha observada exigiu redefinir o contrato
do motor. Os limites encontrados são locais: catálogo semântico de materiais
compartilhado por referência, reflexão ainda não aceita por toda a validação de
encaixe, hierarquia de partes ainda não transportada pelo formato exportado e
receitas históricas com convenções mais frágeis.

Nenhum desses limites bloqueia a primeira montagem persistida, desde que o
primeiro recorte não introduza personalização de material por instância, não
dependa de encaixe por reflexão e não exija hierarquia interna de peça através
do formato exportado.

## 2. Escopo realmente examinado

### Núcleo e auxiliares

- `prototipos/procedural/v3/motor/oficina.js`;
- `prototipos/procedural/v3/motor/expressoes.js`;
- operações, identidade, origens, aliases, partes, portas e diagnósticos;
- `nucleo`, `neutroCanonico`, `adaptarV3` e `executar`.

### Consumidores

- descritor headless;
- descrição de partes e contatos;
- revisão e comparação;
- exportação e leitura de peça resolvida;
- adaptador Three.js e bancada.

### Receitas representativas

- `_viga`: caminho simples;
- `freio-disco`: peça publicada com partes e porta;
- `_mancal-de-mesa`: furo, `lathe`, partes e portas;
- `_portas-espelho-arranja`: arranjo, espelho e portas derivadas;
- `_freio-hierarquia`: hierarquia interna de partes;
- `moto`: peça complexa e histórica.

Também foram criadas provas sintéticas somente em memória para isolar o motor de
qualquer convenção histórica de receita.

## 3. Evidência executada

A issue #30 registra quatro rodadas diagnósticas.

- R01: caminho completo, descrição, revisão e exportação; 624 testes aprovados e
  1 pulado entre as suítes escolhidas, além das provas públicas.
- R02: independência entre execuções e leituras; 577 testes focados aprovados,
  mais provas em memória com peça real e receita sintética.
- R03: independência visual; 534 testes aprovados e prova pelo caminho real da
  bancada até Three.js.
- R04: teto geométrico representativo; 71 testes focados aprovados, quatro
  receitas representativas e duas provas sintéticas obrigatórias.

As contagens se sobrepõem entre rodadas e não representam quantidade total de
casos únicos do repositório.

## 4. Contrato real de entrada

### Observado

O núcleo público aceita:

```text
nucleo(PASSOS, PARAMS = {}, TOPO = {}, MATERIAIS = {}, ESQUELETO = null, ALIASES = [])
```

`PASSOS` é a receita operacional. `PARAMS` e `TOPO` formam o dicionário numérico,
com `TOPO` prevalecendo em colisões de nome. `MATERIAIS`, `ESQUELETO` e `ALIASES`
também participam do contrato real.

O caminho visual amplo aceita ainda `ANIMACOES` e contexto de renderização por
`executar(...)`; animação não pertence ao núcleo neutro.

Expressões numéricas são resolvidas por uma linguagem fechada e determinística:
números, nomes, parênteses e `+ - * /`. Não há `eval`, acesso a propriedades ou
chamadas arbitrárias. Parâmetros ausentes, ciclos e números não finitos falham.

Aliases, esqueleto, vetores e origens inválidas são validados antes ou durante a
execução e não são normalizados silenciosamente para um estado parcialmente
válido.

### DOCUMENTAR

A documentação simplificada que descreve apenas `PASSOS/PARAMS/TOPO` não cobre
todo o contrato praticado hoje. O contrato real inclui materiais, aliases e
esqueleto no núcleo, e animações somente na camada de execução visual.

## 5. Fluxo interno

O caminho observado é:

```text
módulo da receita
→ parâmetros e topologia
→ resolvedor numérico fechado
→ validações precoces
→ operações geométricas
→ origens e aliases
→ partes, portas e materiais
→ diagnósticos
→ saída neutra local
→ consumidores headless ou adaptadores visuais
```

O núcleo acumula mapas de vértices, faces, partes, portas, origens e relações,
executa `PASSOS` em ordem, aplica hierarquia de partes ao final e retorna um
objeto neutro independente de Three.js.

A ordem dos passos participa da construção, mas contratos persistíveis e
semânticos possuem mecanismos próprios — origem declarada, alias, nome de parte,
nome de porta e cópia derivada — em vez de depender de UUID de runtime ou posição
de um objeto visual.

## 6. Contrato real de saída

### Observado

O núcleo retorna, no recorte examinado:

```text
V
F
orfaos
merges
partes
esqueleto
pesos
portas
materiais
```

Vértices e faces descrevem a geometria neutra. Faces podem carregar parte,
material, cor e atributos geométricos. Partes e portas mantêm significado acima
da triangulação. Portas carregam interfaces em coordenadas locais, incluindo
centro e eixo suficientes para transformação externa.

Não há transformação de instância ou coordenada de mundo na saída neutra. Isso é
uma propriedade correta da definição de peça, não uma ausência a ser corrigida no
motor.

### `neutroCanonico`

`neutroCanonico` é deliberadamente mais estreito que o estado neutro completo e
serve como forma ordenada para determinismo/replay geométrico. Ele não deve ser
interpretado como serialização completa de toda a semântica da peça.

A revisão persistível possui contrato próprio: preserva partes, portas e
interfaces resolvidas e proíbe UUID, índice, passo, relógio e outras identidades
de runtime/posição. Portanto, a forma canônica geométrica estreita não provoca
perda silenciosa no contrato de revisão examinado.

### DOCUMENTAR

Deixar explícita a diferença entre:

```text
canônico geométrico para determinismo
≠
artefato persistível completo de revisão ou montagem
```

## 7. Identidade, partes e portas

### Observado

A identidade interna possui dois níveis diferentes:

1. IDs numéricos usados pelo motor para construir e relacionar geometria;
2. identidades semânticas declaradas — origem, alias, parte, porta e cópia.

Receitas modernas examinadas selecionam por origem declarada, alias ou cópia. A
revisão rejeita identidade posicional/runtime. Transformações, arranjos e espelhos
preservam origem derivada suficiente para descrever e publicar portas.

A mesma definição executada duas vezes produziu mapas separados de `V`, `F`,
`partes` e `portas`. Alterar a primeira execução em memória não alterou a segunda.
A mesma prova passou numa receita sintética criada somente com o contrato atual.

### Inferido e sustentado pelas provas

A identidade de **instância de montagem** não existe no motor e deve ser criada
acima dele. Não foi encontrada evidência de que o núcleo precise conhecer a árvore
de montagem para manter identidade interna de uma peça.

## 8. Capacidade geométrica real

### Caminhos sólidos observados

- **furação/passagem:** determinística; faces novas permanecem endereçáveis pela
  origem da operação; identidade de parte sobrevive ao recorte na prova sintética;
- **`lathe`/revolução:** produz geometria mensurável e semanticamente utilizável;
- **arranjo:** cópias determinísticas com origem derivada e portas transformadas;
- **espelho:** geometria e mão espelhada são transportadas corretamente;
- **hierarquia de partes:** o núcleo valida pai inexistente, próprio e ciclos e a
  relação sobrevive até a descrição;
- **peças complexas:** o motor executa `moto` com 1600 faces e relata corretamente
  a única face sem identidade em modo estrito.

### Limites reais observados

- `_mancal-de-mesa` declara `meta.fechada:false`: perfis de `lathe` podem produzir
  uma costura topológica não soldada quando a receita simula fechamento;
- relações de encaixe atuais não validam reflexão completa, embora a porta
  espelhada carregue `mao:'espelhada'`;
- o formato de peça resolvida recusa hierarquia de partes;
- `moto` possui uma face sem identidade semântica e autoria histórica mais
  frágil, mas não é peça publicada.

Esses limites foram relatados por gates, modo estrito ou recusa explícita. Não foi
observado caso em que o motor escondesse silenciosamente um desses estados.

## 9. Falhas e diagnósticos

### PRESERVAR

O comportamento de falha é predominantemente fechado:

- operação desconhecida falha;
- parâmetros inválidos ou cíclicos falham;
- aliases e origens inválidos geram erro/diagnóstico;
- órfãos permanecem visíveis;
- modo estrito recusa faces sem identidade semântica;
- exportação recusa capacidades que o formato ainda não transporta, como
  esqueleto e hierarquia, em vez de apagá-las;
- porta malformada é recusada na leitura.

Esse comportamento é especialmente importante para autoria por IA porque evita
converter perda de informação em sucesso aparente.

## 10. Independência entre instâncias

### Núcleo

Duas execuções da mesma peça são independentes em geometria, faces, partes e
portas. A prova foi repetida com `freio-disco` e com receita sintética atual.

### Bancada/Three.js

Duas adaptações visuais criam grupos, matrizes, `BufferGeometry`, buffers e
`MeshStandardMaterial` distintos. Mover ou alterar uma ocorrência visual não
altera a outra.

### Limite: catálogo semântico de materiais

O objeto `MATERIAIS` permanece compartilhado por referência no caminho:

```text
módulo da peça
→ exportarPeca
→ lerPecaResolvida
→ adaptarThree (somente leitura)
```

O adaptador visual copia os valores necessários para materiais Three.js novos e
não modifica o catálogo. Por isso não há defeito visual ativo hoje. Porém, uma
mutação in-place do catálogo antes de criar outra ocorrência pode contaminar as
leituras seguintes no mesmo processo.

### ADIAR

Eliminar esse compartilhamento mutável antes de introduzir personalização de
material por instância. Não é bloqueio para a Montagem Mínima Persistida v1 se o
primeiro recorte tratar materiais de definição como somente leitura.

## 11. Fronteira motor / montagem / bancada

A hipótese inicial foi confirmada:

```text
motor de peça
  resolve uma definição em coordenadas locais
  mantém geometria e semântica interna

montagem
  cria identidade de ocorrência
  aplica transformação externa
  mantém composição e relações
  decide revalidação entre ocorrências

bancada
  adapta e observa o resultado

MCP / CLI / API
  expõem capacidades, sem definir o núcleo
```

Portas já carregam centro e eixo locais. O núcleo não contém matriz de mundo nem
precisa recebê-la para resolver a peça. A bancada já demonstra que uma
transformação externa pode ser aplicada a uma ocorrência visual independente.

Não há evidência para mover árvore de montagem, dependências entre peças,
versionamento de montagem, alvo de edição ou contexto visual para dentro do motor.

## 12. Achados PRESERVAR

1. separação entre núcleo neutro e adaptadores de renderização;
2. resolvedor numérico fechado e determinístico;
3. coordenadas locais como contrato da definição de peça;
4. origens, aliases, partes e portas como endereçamento semântico;
5. diagnósticos fail-closed e órfãos explícitos;
6. independência de execuções do núcleo;
7. independência dos objetos visuais por ocorrência;
8. consumidores headless que medem e revisam sem Three.js;
9. furo, arranjo, espelho e hierarquia interna no comportamento provado atual.

## 13. Achados DOCUMENTAR

1. o contrato real de entrada é mais amplo que `PASSOS/PARAMS/TOPO`;
2. uma peça pode ser geometricamente válida sem possuir identidade semântica em
   todas as faces; modo estrito deve ser usado quando o consumidor exigir essa
   identidade;
3. `neutroCanonico` não é a persistência semântica completa da peça;
4. hierarquia e esqueleto existem no núcleo, mas não são transportados pelo
   formato exportado atual;
5. reflexão é representada geometricamente, mas não aceita por toda a validação
   de relações.

## 14. Achados REFATORAR

**Nenhum achado exige refatoração antes da primeira montagem persistida.**

Uma futura personalização de material por ocorrência deverá abrir um plano curto
para quebrar o compartilhamento mutável do catálogo semântico. Se esse requisito
entrar no escopo de uma montagem futura, a classificação deixa de ser `ADIAR` e
passa a exigir correção antes dessa funcionalidade.

## 15. Achados ADIAR

- clonagem/imutabilidade do catálogo de materiais antes de personalização por
  instância;
- validação de encaixe por reflexão;
- transporte de hierarquia de partes no formato exportado;
- correção das costuras históricas de `lathe` onde forem realmente necessárias;
- limpeza de autoria histórica da `moto` e de outras receitas não publicadas.

## 16. Bloqueios antes da montagem mínima

**Nenhum bloqueio estrutural comprovado.**

O primeiro plano de montagem deve apenas respeitar os limites já medidos:

- não depender de personalização mutável de material por ocorrência;
- não exigir reflexão como relação validada no primeiro recorte;
- não exigir hierarquia interna através do formato exportado atual;
- consumir peças com identidade/portas adequadas ao caso de montagem.

Essas condições delimitam escopo; não exigem mudança prévia do núcleo.

## 17. O que não precisa mudar

Antes da primeira montagem persistida, não há evidência para:

- reescrever `oficina.js`;
- trocar o modelo de `PASSOS`;
- substituir o resolvedor de expressões;
- mover transformação de ocorrência para dentro da peça;
- acoplar o núcleo a Three.js;
- transformar montagem em operação geométrica do motor;
- corrigir todas as receitas históricas;
- ampliar o MCP;
- criar contrato genérico de materiais.

## 18. Lacunas não examinadas

- o caminho de atlas/canvas de `adaptarV3` não foi exercitado de ponta a ponta na
  R03 porque depende de `ctx` de renderização externo; a bancada usada pela
  direção atual passa por `adaptarThree` e foi provada;
- não existe montagem persistida para executar de ponta a ponta; este diagnóstico
  avalia se a saída da peça possui condições para que essa camada seja criada;
- materiais foram estudados apenas como contrato de saída, conforme o protocolo;
- o estudo não tenta provar todo caso geométrico possível, somente famílias e
  receitas representativas suficientes para decidir a fronteira arquitetural.

## 19. Recomendação única

```text
motor adequado
→ abrir Montagem Mínima Persistida v1
```

A nova camada deve consumir definições de peça resolvidas em espaço local e
acrescentar identidade de ocorrência, transformação externa e relações de
composição sem alterar o motor para representar conceitos de montagem.

O diagnóstico não autoriza a implementação. A montagem deve ser aberta por plano
executivo separado, com objetivo, formato persistível, invariantes e gates
próprios.
