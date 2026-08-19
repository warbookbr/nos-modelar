# Análise — chassi realista e escolha de representação geométrica

**Estado:** dossiê com decisão de representação; autoriza prova descartável, não
autoriza código de produto

**Responsável pela curadoria:** Codex

**Objeto desta versão:** fechar a representação de autoria da carroceria,
registrar as rejeições com motivo técnico e reduzir a próxima rodada a uma prova
única e decisiva. A versão anterior mantinha seis famílias abertas e propunha um
bake-off de três kernels; esta versão elimina o que é elminável por análise e
concentra a evidência onde ela ainda falta.

## 1. Como este documento é usado

Este documento não é plano executivo. É a base técnica que decide **qual
representação** a Mecanifica passa a usar para superfície exterior, e o que
ainda precisa de prova antes de virar produto.

A versão 0 tratava toda alternativa como igualmente aberta. Isso estava errado
como método: parte das alternativas é decidível por análise de requisito e custo,
sem gastar uma rodada de implementação em cada uma. Manter tudo aberto não é
rigor; é adiar a decisão e pagar por experimentos que já se sabe que perdem.

O que continua aberto está na seção **Perguntas ainda sem resposta**. O que foi
fechado está em **Decisão de representação** com o motivo e a condição de
reabertura.

### 1.1 Regra de contenção

Enquanto o plano estiver em `rascunho`:

- não integrar operação nova ao registro do motor;
- não instalar dependência geométrica;
- não promover a carroceria atual;
- não atualizar snapshots ou limites para fazer o protótipo rejeitado passar;
- não chamar uma prova estrutural de aprovação visual.

A prova descartável da seção 14 é autorizada em diretório privado, com critério
de descarte declarado. Código de produto só começa depois do **Gate de prontidão
para implementação**.

## 2. Termo resolvido: “chassi”

No uso automotivo estrito, `chassi` é a estrutura resistente. O objeto rejeitado
é a **carroceria exterior**: capô, para-lamas, laterais, teto, para-choques,
recortes e transições de superfície.

Neste documento, `chassi realista` significa:

> carroceria exterior de um supercarro ficcional, com qualidade de ativo de jogo
> observado de perto, editável por regiões semânticas, otimizada em contagem de
> polígonos e convincente em todas as vistas canônicas.

Fora do escopo: monocoque estrutural, crash structure, suspensão, motor,
validação de fabricação e exportação CAD. Essa exclusão não é provisória — ela
é o que permite rejeitar um kernel CAD na seção 8.

## 3. Fontes de evidência

### 3.1 Estado e contratos do projeto

- [`../INDEX.md`](../INDEX.md): estado atual e gates.
- [`../ARQUITETURA.md`](../ARQUITETURA.md): núcleo neutro, peças e montagens.
- [`../AUTORIA-IA.md`](../AUTORIA-IA.md): autoria por IA e validação em camadas.
- [`../AGENT-FIRST.md`](../AGENT-FIRST.md): intenção, contexto, determinismo,
  diagnóstico, composição e identidade.
- [`../PERFIS-DE-AUTORIA.md`](../PERFIS-DE-AUTORIA.md): distinção entre F2, F3 e
  `realistaApresentacao`.
- [`../REFERENCIA-E-CRITICA-VISUAL.md`](../REFERENCIA-E-CRITICA-VISUAL.md):
  protocolo de referência e crítica.
- [`../RELATORIO-SONDA-SUPERCARRO-1-0.md`](../RELATORIO-SONDA-SUPERCARRO-1-0.md):
  métricas e limites da sonda anterior.

### 3.2 Código lido diretamente nesta versão

Esta versão não se apoia só em relatórios. Os fatos abaixo foram lidos na fonte:

- `prototipos/procedural/v3/motor/nucleo.js`: `BLOCO = 1000`, o bloco de ids por
  passo, aplicado a vértices e a faces;
- `prototipos/procedural/v3/motor/operacoes/geradores-avancados.js`: `loft`,
  `inflate` e a semântica de `orientacao`;
- `prototipos/procedural/v3/motor/operacoes/primitivas-superficie.js`: geradores
  fechados e o contrato `faixas × lados` de `origemId`;
- `prototipos/procedural/v3/motor/extensoes.js`: SDK de extensão nativa;
- `prototipos/procedural/v3/motor/composicoes.js`: subgrafos declarativos;
- `autoria-assistida/experimentos/sonda-supercarro-1-0/receitas/carroceria.js`;
- `autoria-assistida/experimentos/sonda-supercarro-1-0/perfil-autoria.js`;
- `package.json`: dependências atuais.

### 3.3 Limite da evidência visual

Existe uma única imagem de referência em perspectiva. Não há prancha
ortográfica, distância focal conhecida, dimensões de envelope, seções de
carroceria, curvas mestras nem desenho de caixa de roda. A referência atual
sustenta uma direção estética, mas não determina uma forma 3D única. Isso não
bloqueia a decisão de representação — bloqueia a alegação de fidelidade.

## 4. Estado factual do que existe

### 4.1 O que a plataforma já faz bem

- receitas determinísticas e replay;
- malha neutra com vértices compartilhados e faces endereçáveis;
- identidade semântica de partes, origens e portas;
- montagens recursivas e instâncias compartilhadas;
- descrição, exportação, diff, captura e auditoria;
- seleção, isolamento e vistas reproduzíveis;
- extensões nativas registradas, contratos de uso e descoberta Agent-First;
- subgrafos declarativos com parâmetros, tipos e orçamento;
- falha fechada para várias classes de entrada inválida;
- separação entre núcleo geométrico e Three.js.

O problema não é ausência de fundação procedural. É o teto da representação de
superfície e o critério de aprovação visual.

### 4.2 A causa raiz, lida no código

A carroceria rejeitada é esta receita, integral:

```js
['loft', { origemId: CORPO, lados: 12, orientacao: [1, 0, 0], secoes: [ ...9 seções... ] }]
```

Nove seções, doze lados, 86 vértices e 96 faces. Cada seção é uma elipse fechada
gerada por `contorno(meiaLargura, piso, teto)`. A carroceria inteira de um
supercarro é **uma varredura de elipse ao longo de z**.

Isso encerra a discussão sobre “quantas seções faltam”. Nenhum número de seções
elípticas produz para-lama, caixa de roda aberta, linha de caráter ou transição
capô–para-lama, porque a representação não tem graus de liberdade para isso. O
protótipo seguinte — três envelopes sobrepostos, 1.014 vértices — confirmou:
mais que dez vezes a densidade, mesmo resultado de leitura.

### 4.3 Restrição de identidade não registrada antes: `BLOCO = 1000`

`nucleo.js:33` define `BLOCO = 1000`. A identidade posicional reserva um bloco de
mil ids por passo, no espaço de vértice e no de face. Todo gerador atual valida
contra esse teto e aborta o passo quando o estoura.

Isso tem consequência direta na arquitetura, e a versão 0 não a registrava:

> Uma superfície de carroceria com qualidade F3 não cabe no espaço de ids de um
> passo. Portanto a superfície final **não pode ser emitida como um passo comum
> que numera vértices e faces posicionalmente**.

A leitura correta não é “aumentar o BLOCO”. É que a malha densa é **produto
compilado**, não artefato autoral. O `CLAUDE.md` já diz que índices e posições
nunca são identidade persistida; a arquitetura precisa obedecer isso em vez de
esticar o limite.

### 4.4 Sonda anterior — o que ela mediu e o que não mediu

| Medida | Baseline |
|---|---:|
| definições privadas | 12 |
| peças-folha resolvidas | 27 |
| vértices/faces nas definições únicas | 1.428 / 1.434 |
| export JSON | 372.939 bytes |
| pares globais decididos | 351 / 351 |

O perfil declarado da sonda é `perfil-autoria.js`:

```js
{ visual: 'conceitual', fidelidade: 'F2', precisao: 'visual', orcamentoFaces: 1400 }
```

A sonda foi aprovada contra `F2 conceitual` e julgada pelo usuário contra `F3
realista`. O processo não errou ao aprovar: ele errou ao não exigir que o perfil
declarado fosse o perfil esperado antes de modelar.

### 4.5 Dependências atuais

`three`, `earcut`, `ajv`, `zod`, `@modelcontextprotocol/server`. Nenhum kernel
geométrico. Qualquer dependência nova é a primeira do tipo e carrega custo de
bundle, licença e distribuição que hoje não existe.

## 5. Problema, formulado sem solução embutida

> A Mecanifica gera e organiza malhas mecânicas determinísticas, mas não possui
> caminho demonstrado para uma IA definir, editar e validar uma carroceria
> exterior contínua de qualidade F3: com controle local de silhueta e curvatura
> em duas direções, transições entre regiões, recortes reais, bordas e
> continuidade preservados por uma história semântica, dentro de um orçamento de
> polígonos justificável.

Quatro componentes simultâneos: alvo visual subespecificado, representação
insuficiente, história de forma inadequada e aprovação visual sem critério
vinculante.

### 5.1 A armadilha do envelope longitudinal

`loft` e `inflate` partem da mesma decisão: para cada posição ao longo do carro
existe **uma** seção transversal. Dá para alargar, achatar, elevar ou torcer essa
seção — é apertar um tubo ao longo do comprimento.

Isso acopla regiões que o autor precisa controlar separadamente. Elevar o
para-lama na estação da roda altera a seção que atravessa capô e túnel central.
Estreitar a cintura move tudo naquela estação. Um arco de roda precisa ser
simulado pela borda do envelope em vez de existir como abertura.

A pergunta correta:

> qual representação permite editar linha de ombro, capô, para-lama, caixa de
> roda, teto e cintura como decisões relacionadas, porém independentes?

## 6. Sintomas e causa técnica

| Sintoma | Evidência | Causa técnica |
|---|---|---|
| carro parece cápsula ou barco | lateral e superior | uma seção elíptica por estação; sem controle regional |
| rodas parecem externas | frontal e lateral | não existe abertura de caixa de roda; só borda do envelope |
| para-lamas parecem volumes anexos | isométrica | corpos sobrepostos não compartilham superfície |
| cabine parece pousada | lateral | interseção visual no lugar de transição de teto e coluna |
| portas e dutos parecem placas | lateral | caixas chanfradas não seguem a superfície hospedeira |
| faróis parecem barras | frente | sem alojamento nem abertura conformada |
| mais faces não trouxeram realismo | métricas do protótipo | densidade gasta em anéis, não em decisões de forma |
| gates passaram apesar da rejeição | relatório e feedback | perfil declarado F2 contra expectativa F3 |

Todas as linhas, exceto a última, têm a mesma raiz: **a superfície não tem
topologia de controle**. A última é de processo.

## 7. Decisão de representação

A representação de autoria da superfície exterior passa a ser:

> **malha de controle de quadriláteros com vincos, avaliada por subdivisão
> Catmull-Clark determinística, implementada no núcleo, sem dependência externa.**

A malha final entregue a `mecanifica.malha-poligonal@1` é **produto compilado**
dessa malha de controle, num nível de subdivisão declarado.

Em vocabulário do projeto: a `cage` é o artefato autoral e versionado; a malha
tesselada é derivada, como o grafo de execução da R04 é derivado da receita.

### 7.1 Por que esta é a escolha certa para este alvo

**1. É o pipeline real da indústria para o alvo declarado.** Carroceria de
veículo como ativo de jogo ou de filme é modelada com subdivisão sobre uma malha
de quads com vincos. Não é uma aposta: é o método padrão de estúdio, e é
exatamente o alvo do documento — ativo de jogo visto de perto, não peça de
fabricação.

**2. Resolve os sintomas por topologia, não por sobreposição.** Numa malha de
controle única, para-lama, lateral e capô são regiões da *mesma* superfície,
ligadas por loops de aresta. A continuidade deixa de ser algo a declarar e
verificar entre corpos: ela é propriedade da superfície limite. A caixa de roda
deixa de ser aproximada pela borda e passa a ser um loop fechado com borda
retornada para dentro — abertura real, com espessura visível.

**3. Entrega o requisito de otimização.** Subdivisão é a tecnologia que dá
superfície suave a partir de poucos controles. Uma cage de carroceria na casa de
300 a 500 quads produz, no nível 2, uma malha na casa de 5 a 8 mil faces com
silhueta correta. O protótipo rejeitado gastou 1.056 faces para não chegar a
lugar nenhum, porque a densidade estava na amostragem de um modelo errado, não
na forma. Vincos semi-agudos reduzem ainda mais: uma linha de caráter vira um
atributo de aresta, dispensando os loops de suporte que dobrariam a cage.

**4. Resolve o problema de identidade que a versão 0 declarou insolúvel.** A
seção 11 da versão 0 dizia que nenhuma biblioteca resolve topological naming
sozinha. Isso é verdade para booleanas e trims, e **falso para subdivisão**. Em
Catmull-Clark, cada face de `n` lados gera exatamente `n` filhas por nível, em
ordem determinística. A linhagem `face da cage → faces tesseladas` é uma função
aritmética, não uma heurística de correspondência. Uma face de cage nomeada
`paralama-dianteiro-esquerdo.crista` mantém procedência exata até a malha final,
em qualquer nível, para sempre. Nenhuma outra alternativa avaliada oferece isso
de graça.

**5. Respeita `BLOCO = 1000` sem esticá-lo.** A cage cabe folgadamente no espaço
de ids de passo. A malha subdividida nasce com identidade derivada da cage, o que
é exatamente o que o `CLAUDE.md` exige quando proíbe índice como identidade.

**6. Custo de implementação baixo e sob controle.** Catmull-Clark uniforme com
vincos é um algoritmo pequeno, fechado e determinístico: pontos de face, pontos
de aresta, reposicionamento de vértice, com as regras de vinco aplicadas por
peso. Cabe no núcleo em JavaScript puro. Sem WASM, sem bundle novo, sem licença
de terceiros, sem processo externo. Isso preserva `bancada.html`, o determinismo
byte a byte e a independência do núcleo.

**7. LOD sai de graça.** Níveis 0, 1, 2 e 3 da mesma fonte, sem retopologia e sem
segunda pipeline.

### 7.2 O que esta decisão não resolve

- não produz automaticamente uma forma bonita: cage ruim gera superfície ruim;
- não substitui referência calibrada;
- pontos extraordinários (valência diferente de 4) são G1, não G2, e podem
  concentrar curvatura — a disciplina de topologia precisa mantê-los fora de
  superfícies de classe visível;
- não dá booleana robusta; recortes complexos permanecem questão separada;
- não dá UV nem baking.

## 8. Alternativas rejeitadas, com motivo

Rejeição aqui significa: fora do caminho de produção, com condição explícita de
reabertura. Não significa que a tecnologia seja ruim.

### 8.1 Rejeitada — kernel CAD B-rep (OCCT / opencascade.js)

A versão 0 tratava OCCT como candidato principal. Isto está errado para este
alvo, por cinco razões independentes:

1. **O requisito que justificaria B-rep não existe.** B-rep se paga quando é
   preciso STEP, tolerância de fabricação ou interoperabilidade CAD. A seção 2
   exclui fabricação. Pagar o custo de um kernel de sólidos por um ativo de jogo
   ficcional é comprar a ferramenta errada.
2. **B-rep e ativo de jogo são incompatíveis na saída.** A malha vem de
   tesselação de superfícies aparadas, que produz triangulação irregular,
   inadequada para jogo, sem loops de aresta e sem quads. O caminho realista
   seria B-rep → tesselação → retopologia manual: duas conversões, e a segunda
   descarta a identidade que a primeira preservava.
3. **Superfície de estilo não é o forte de OCCT.** OCCT é kernel de sólidos
   mecânicos. Blends e fillets falham em geometria marginal e exigem healing —
   e é justamente na transição capô–para-lama, o caso difícil desta carroceria,
   que essa fragilidade aparece.
4. **Custo de distribuição incompatível.** O build completo de opencascade.js
   está na casa de dezenas de megabytes de WASM. `bancada.html` é a única
   aplicação publicada e hoje não carrega nenhum kernel. Builds customizados
   reduzem, ao preço de manter uma toolchain de build C++/Emscripten no projeto.
5. **Superfície de API contrária ao Agent-First.** Milhares de classes é o risco
   15.3 deste próprio documento. Domar isso exigiria uma camada semântica que é,
   sozinha, maior que a implementação nativa de subdivisão.

**Reabertura:** se surgir requisito real de exportação CAD, fabricação ou
tolerância dimensional de peça mecânica. Nesse caso, B-rep entra como backend de
*peças mecânicas*, não como pele exterior.

### 8.2 Rejeitada — Blender headless como backend de produção

Viola de uma vez três invariantes já estabelecidos: determinismo verificável
(estado `.blend` e ordem de modificadores não são reexecutáveis byte a byte),
procedência semântica (identidade teria de atravessar objetos, modificadores e
exportador) e distribuição (runtime externo grande, processo separado, sem
caminho para o navegador).

**Papel mantido:** referência externa de teto visual. Um humano ou uma IA pode
produzir em Blender a imagem-alvo da carroceria e usá-la como critério de
aceitação. Isso é referência, não backend. É um uso legítimo e barato.

### 8.3 Rejeitada — SDF / implícito

Bom para composição volumétrica, blends orgânicos e cavidades; ruim exatamente
no que esta carroceria exige: painéis finos, vincos controlados, gaps precisos e
bordas. A extração de superfície gera densidade alta e destrói identidade de
face. Tende a produzir formas derretidas.

**Reabertura:** para formas orgânicas onde painel e vinco não sejam requisito.

### 8.4 Rejeitada — kernel próprio completo de B-rep

Predicados robustos, tolerâncias, degenerações e nomeação topológica. Risco e
tempo desproporcionais. Registrada para não ser confundida com independência.

Note-se a assimetria com a decisão da seção 7: implementar **Catmull-Clark** não
é implementar um kernel. É um algoritmo local, sem predicados de robustez, sem
interseção e sem tolerância global. A diferença de risco é de ordens de grandeza.

### 8.5 Adiada — booleana de malha (Manifold)

Manifold é a escolha certa *se* booleana for necessária: saída manifold para
entrada manifold, e rastreio de propriedades através da operação.

Mas a decisão de arquitetura é mais forte:

> **A pele primária nunca sofre booleana.** Caixa de roda, recorte de vidro e
> vão de porta são feitos por topologia da cage — loop fechado, borda retornada
> — não por subtração.

Isso elimina o ataque F da versão 0 na origem: booleana sobre cage destrói a
malha de controle, cria polos e degrada a superfície limite. Booleana fica
disponível apenas para features secundárias, depois da subdivisão, e só entra no
projeto quando um caso concreto provar que a topologia da cage não resolve.

### 8.6 Rejeitado como método — o bake-off de três kernels

A versão 0 propunha modelar o mesmo quarto dianteiro em B-rep, SubD e Blender. O
custo é uma rodada inteira em três pilhas, e duas delas já são elimináveis por
requisito e custo, como as seções 8.1 e 8.2 mostram. Um experimento que confirma
uma rejeição já derivável não gera informação; consome orçamento.

A prova da seção 14 substitui o bake-off: uma rota, o caso difícil de verdade,
critério de descarte declarado.

## 9. Arquitetura em cinco camadas

### Camada R — referência calibrada

- imagens, câmeras e escala conhecidas;
- landmarks 2D/3D com confiança e fonte;
- dimensões rígidas: rodas, eixos, entre-eixos, bitola e envelope;
- divergências entre referências registradas, não suavizadas em silêncio.

Referência é dado do sistema, não memória do agente.

### Camada I — intenção e topologia de controle

Esta é a camada que a versão 0 deixou abstrata (“região + handle + restrição”) e
que agora tem forma concreta. A unidade editável é o **loop de arestas nomeado**
sobre a cage:

| Intenção do autor | Objeto na cage |
|---|---|
| linha de ombro | loop longitudinal nomeado |
| arco da caixa de roda | loop fechado com borda retornada |
| crista do para-lama | loop com vinco parcial |
| cintura | loop longitudinal |
| base do para-brisa | loop transversal |
| linha de caráter | vinco semi-agudo sobre um loop |

Isso resolve o ataque A da versão 0 — curvas mestras recriando o tubo. Um loop
pertence a uma região e tem extensão finita; mover a crista do para-lama entre as
estações do eixo dianteiro não toca a base do para-brisa, porque são loops
distintos, com domínio distinto. Não existe seção global que force acoplamento.

### Camada S — superfície

- cage de quads com vincos, versionada e endereçável;
- avaliação Catmull-Clark determinística por nível declarado;
- continuidade como propriedade da superfície limite, não como restrição a
  verificar entre corpos;
- pontos extraordinários inventariados e mantidos fora de superfície de classe
  visível.

### Camada F — features e detalhes

- aberturas por topologia da cage: caixa de roda, vidro, vão de porta, entrada;
- retorno de borda por extrusão para dentro, dando espessura visível;
- alojamentos e dutos como features secundárias, aplicadas após subdivisão;
- histórico não destrutivo e ordenado;
- falha local com causa, feature e correção sugerida.

### Camada C — compilação e apresentação

- subdivisão até o nível declarado, com linhagem aritmética preservada;
- LOD por nível, da mesma fonte;
- normais e sombreamento derivados da superfície limite, não da cage;
- `mecanifica.malha-poligonal@1` como produto compilado;
- preview em nível baixo, publicação em nível alto.

## 10. Interação mínima desejada

Uma alteração típica, conceitualmente:

```text
alvo: paralama-dianteiro-esquerdo.crista        # um loop nomeado
mudança: elevar 0,025 m nas estações 4 a 7      # domínio finito e explícito
preservar:
  - arco-da-roda.folga
  - capo.borda-central
validar:
  - lateral
  - frontal
  - superior
  - zebra-isometrica
```

O sistema resolve o loop, aplica o deslocamento no domínio declarado, subdivide
no nível de preview e mostra violações antes de publicar. Isto não é schema
ainda; serve para testar se a linguagem reduz esforço cognitivo de verdade.

O ganho sobre a versão 0 é que cada termo aqui já tem correspondente concreto na
representação escolhida. `crista` é um loop; `estações 4 a 7` é um intervalo de
arestas do loop; `folga` é medida entre malha e envelope de roda.

## 11. Identidade e procedência

A subdivisão resolve a linhagem principal por aritmética:

- cada face de `n` lados gera `n` filhas por nível, em ordem determinística;
- a linhagem `face da cage → faces do nível k` é função, não correspondência;
- o nome semântico vive na cage e é herdado, não recalculado.

O que continua exigindo política explícita:

- edição da própria cage: inserir ou remover um loop muda a contagem de faces da
  cage e precisa de diff que distinga “forma mudou” de “topologia mudou”;
- features secundárias pós-subdivisão, se e quando existirem;
- desaparecimento de região por edição, com estado explícito.

Isso é bem menor que o problema geral de topological naming da versão 0, e é essa
redução que torna a decisão da seção 7 defensável.

## 12. Restrições do motor atual a respeitar

1. **`BLOCO = 1000`.** A cage cabe; a malha subdividida não pode ser emitida como
   passo posicional. A subdivisão é compilação com identidade derivada.
2. **Núcleo neutro.** Nenhum vocabulário automotivo entra no motor. A operação é
   `subdividir` sobre malha de quads; `paralama` vive na receita e na montagem.
3. **Determinismo byte a byte.** A avaliação precisa produzir a mesma saída no
   mesmo nível, sempre; o gate de exportação já cobre isso.
4. **Receitas existentes intactas.** A subdivisão é aditiva; nenhuma peça atual
   muda de bytes.
5. **Catálogo público vazio.** A prova vive em zona privada.

## 13. Validação visual com limiares

A validação separa oito eixos; o erro da sonda foi deixar 1, 2 e 7 aprovarem por
3, 4 e 8:

1. **integridade:** executa, fecha e exporta;
2. **dimensão:** rodas, eixos, balanços e envelope obedecem ao briefing;
3. **silhueta:** contorno por vista aproxima a referência calibrada;
4. **superfície:** curvatura e reflexão não denunciam topologia ruim;
5. **topologia:** aberturas existem de verdade, com retorno de borda;
6. **semântica:** regiões continuam endereçáveis e comparáveis;
7. **apresentação:** material e iluminação permitem enxergar a forma;
8. **aceite:** o usuário aprova explicitamente o marco.

Métricas a instrumentar:

- IoU e distância de Hausdorff entre silhuetas por vista;
- desvio de landmarks projetados;
- zebra e mapa de curvatura sobre a superfície limite;
- inventário de pontos extraordinários em superfície visível;
- razão entre faces da cage e faces compiladas — mede se a densidade está na
  decisão de forma ou na amostragem;
- contagem de gaps, overlaps e self-intersections;
- estabilidade de hash sob replay.

Os limiares numéricos são fixados na rodada P0, junto com a referência
calibrada, e antes de modelar. Fixá-los depois repetiria o erro de 2026-08-18.

## 14. Prova decisiva — uma rota, o caso difícil

Substitui o bake-off. Escopo: **um quarto dianteiro**, em cage manual mais
subdivisão, num diretório privado descartável.

Deve conter, obrigatoriamente:

- plano de simetria;
- capô, para-lama e lateral como regiões da mesma superfície;
- arco de roda realmente aberto, com retorno de borda;
- transição capô–para-lama sem corpo sobreposto;
- uma linha de caráter por vinco semi-agudo;
- recorte de farol conformado;
- identidades semânticas preservadas da cage até a malha compilada;
- uma alteração local (`elevar a crista 25 mm`) reexecutada por outra sessão.

Medidas a registrar: faces da cage, faces por nível, bytes, tempo de avaliação,
erro de silhueta contra a referência calibrada, pontos extraordinários visíveis e
custo de contexto da alteração.

**Critério de descarte, declarado antes:** se a cage exigir mais de
aproximadamente 800 quads para o quarto dianteiro, ou se o arco de roda não puder
ser aberto sem booleana, ou se a alteração local exigir tocar mais de um loop
nomeado, a decisão da seção 7 é reaberta e o bake-off volta à mesa.

A mesma tecnologia deve também produzir uma forma não automotiva — casco,
carenagem industrial ou eletrodoméstico — para provar que a representação não
carrega vocabulário de carro.

## 15. Perguntas ainda sem resposta

As perguntas abaixo permanecem abertas e são endereçadas na P0. As que a versão 0
listava sobre kernel externo, execução WASM e exportação CAD foram fechadas pelas
seções 7 e 8.

1. Quais dimensões rígidas o carro tem: entre-eixos, bitola, diâmetro de roda,
   balanços e altura?
2. Qual distância mínima de observação precisa sustentar a ilusão?
3. Painéis precisam de espessura física ou basta retorno de borda visível?
4. Portas, capô e asa precisarão mover, ou apenas ser selecionáveis?
5. Quais vistas e referências constituem verdade, e como serão calibradas?
6. Qual orçamento de faces compiladas é aceitável para o carro completo?

## 16. Riscos

**16.1 Trocar a representação sem trocar o processo.** Uma cage boa ainda produz
carro ruim se a referência continuar subespecificada e o aceite continuar tardio.
Por isso P0 vem antes de qualquer modelagem.

**16.2 Cage mal construída.** Subdivisão não perdoa topologia ruim: polos em
superfície visível aparecem como amassados no reflexo. Exige disciplina de quads
e inventário de pontos extraordinários.

**16.3 Reintroduzir o tubo com outro nome.** Uma cage gerada por varredura de
seções é o mesmo erro com mais vértices. A cage precisa nascer de regiões e
loops, não de estações.

**16.4 Chamar densidade de qualidade.** Toda métrica de custo precisa estar
ligada a ganho visual ou semântico observável.

**16.5 Perder identidade em features secundárias.** Se booleana entrar depois,
ela precisa chegar com política de linhagem pronta, não improvisada.

## 17. Gate de prontidão para implementação

O plano vira `pronto` quando todos os itens tiverem evidência:

- alvo e nível de fidelidade inequívocos, com perfil de autoria declarado antes
  de modelar;
- referências calibradas suficientes e limiares numéricos fixados;
- prova da seção 14 executada, com todas as medidas registradas;
- critério de descarte avaliado explicitamente, com resultado `manter` ou
  `reabrir`;
- contrato entre cage e `mecanifica.malha-poligonal@1` escrito;
- política de identidade para edição de cage e para features secundárias;
- impacto medido em bundle, tempo de execução e bytes exportados;
- plano de migração que preserve receitas e baseline existentes;
- destino do protótipo local rejeitado decidido: descarte, reaproveitamento ou
  evidência histórica.

Hoje nenhum item está completo. Não há plano ativo de implementação.

## 18. Confiança nas afirmações desta versão

| Afirmação | Confiança |
|---|---:|
| abandonar o envelope longitudinal como fonte | 98% |
| a malha compilada não pode ser a fonte de autoria | 95% |
| cage de quads + subdivisão é a representação certa para o alvo | 90% |
| o loop de aresta nomeado é a unidade editável correta | 88% |
| subdivisão resolve a linhagem principal por aritmética | 95% |
| B-rep/OCCT é a ferramenta errada para carroceria de jogo | 88% |
| Blender headless é incompatível como backend de produção | 92% |
| a pele primária não deve sofrer booleana | 90% |
| Catmull-Clark nativo é implementável sem risco de kernel | 90% |
| o bake-off de três rotas não vale o custo | 85% |

São juízos arquiteturais explícitos, não estatística. A prova da seção 14 deve
mover os três primeiros para cima ou reabrir a decisão.

## 19. Fontes técnicas

- [OCCT — visão geral](https://dev.opencascade.org/doc/overview/html/index.html)
  e [formato B-rep](https://dev.opencascade.org/doc/overview/html/specification__brep_format.html):
  base da avaliação da seção 8.1.
- [OpenCascade.js](https://dev.opencascade.org/project/opencascadejs): bindings
  WASM e o custo de build que motiva a rejeição por distribuição.
- [Manifold](https://github.com/elalish/manifold): booleana manifold com
  rastreio de propriedades — opção adiada da seção 8.5.
- [OpenSubdiv](https://github.com/PixarAnimationStudios/OpenSubdiv): referência
  de comportamento para subdivisão com vincos e refinamento adaptativo. É
  referência de algoritmo, não dependência proposta.
- [Three.js `NURBSSurface`](https://threejs.org/docs/pages/NURBSSurface.html):
  avaliador isolado, sem B-rep, trimming, costura ou história semântica.

## 20. Estado do workspace

O workspace contém alterações locais não integradas da tentativa rejeitada: modo
`secoes` experimental em `inflate`, testes focados, receita de carroceria por
três envelopes e imagens regeneradas. Não são baseline, não estão aprovadas e não
devem ser publicadas. A destinação é decidida no gate da seção 17.

## 21. Registro das rodadas

### Versão 0 — 2026-08-18

- consolidou evidência do baseline e do protótipo rejeitado;
- formulou o problema em referência, representação, história e validação;
- comparou seis famílias de abordagem sem decidir;
- propôs bake-off de três kernels.

### Versão 1 — 2026-08-19

Mudanças materiais em relação à versão 0:

1. **Decisão de representação fechada:** cage de quads com vincos + Catmull-Clark
   nativo, com a malha compilada como produto derivado.
2. **OCCT/B-rep rejeitado** por requisito ausente, incompatibilidade com saída de
   jogo, fragilidade em superfície de estilo, custo de distribuição e superfície
   de API. Reabertura condicionada a requisito CAD.
3. **Blender headless rejeitado** como backend e mantido como referência visual.
4. **Bake-off de três rotas eliminado** e substituído por uma prova única com
   critério de descarte declarado.
5. **Unidade editável definida:** loop de aresta nomeado, com domínio finito —
   fecha o ataque A da versão 0.
6. **Booleana proibida na pele primária** — fecha o ataque F na origem.
7. **Identidade reformulada:** a linhagem principal passa a ser aritmética; a
   afirmação da versão 0 de que nenhuma biblioteca resolve o problema vale para
   booleana, não para subdivisão.
8. **`BLOCO = 1000` registrado** como restrição de arquitetura, lido em
   `nucleo.js:33`, com a consequência de que a malha densa é produto compilado.
9. **Causa raiz citada do código:** a carroceria é um `loft` de nove seções
   elípticas, não uma aproximação a refinar.
10. **Perfil de autoria identificado como causa do falso positivo:** a sonda
    declarava `F2 conceitual, orcamentoFaces 1400` e foi julgada contra F3.

### Próxima revisão esperada

P0: fixar dimensões rígidas, referência calibrada, limiares numéricos e perfil de
autoria esperado, antes de qualquer modelagem.
