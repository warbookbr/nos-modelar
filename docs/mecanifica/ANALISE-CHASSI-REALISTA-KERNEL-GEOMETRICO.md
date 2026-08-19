# Análise — chassi realista e alternativas de kernel geométrico

**Estado:** dossiê iterativo — não autoriza implementação

**Responsável pela curadoria:** Codex

**Objeto desta versão:** definir o problema atual com evidência, inventariar
limitações e comparar direções possíveis. Esta versão deliberadamente não fecha
arquitetura, dependência, schema, cronograma nem sequência de implementação.

## 1. Como este plano será usado

Este não é um plano pronto para execução. É o documento de trabalho que será
criticado e reescrito antes de qualquer nova tentativa de carroceria.

O processo esperado é:

1. ler e contestar fatos, inferências, requisitos e alternativas;
2. corrigir termos ambíguos e remover hipóteses sem evidência;
3. adicionar referências, medições e casos adversariais;
4. comparar abordagens com provas pequenas e descartáveis;
5. registrar decisões e rejeições com seus motivos;
6. somente depois transformar a alternativa escolhida em plano executivo.

Cada rodada deve poder alterar, adicionar ou remover conteúdo. Nada nesta versão
é definitivo só porque foi escrito. Uma mudança relevante deve atualizar a
seção **Registro das rodadas**, no fim do documento.

### 1.1 Regra de contenção

Enquanto o estado for `rascunho iterativo`:

- não integrar operação nova ao registro do motor;
- não instalar kernel ou dependência geométrica;
- não promover a carroceria atual;
- não atualizar snapshots ou limites para fazer o protótipo rejeitado passar;
- não chamar uma prova estrutural de aprovação visual;
- não confundir uma investigação descartável com arquitetura escolhida.

Spikes poderão ser autorizados numa rodada posterior, em diretório privado e
com critérios de descarte. Código de produto só começa depois do **Gate de
prontidão para implementação**, ainda não satisfeito.

## 2. Termo em disputa: “chassi”

No uso automotivo estrito, `chassi` pode significar a estrutura resistente que
recebe suspensão, carroceria e sistemas. O objeto que está visualmente ruim no
experimento é a **carroceria exterior**: capô, para-lamas, laterais, teto,
para-choques, recortes e transições de superfície.

Neste rascunho, `chassi realista` significa provisoriamente:

> carroceria exterior de um supercarro ficcional, com qualidade de ativo de jogo
> observado de perto, editável por regiões semânticas e convincente em várias
> vistas.

Isso não inclui, por enquanto, monocoque estrutural, crash structure, suspensão,
motor ou validação de fabricação. A próxima rodada precisa confirmar ou corrigir
essa definição. Implementar sem resolver essa ambiguidade repetiria o erro de
aprovar um objeto diferente do que o usuário esperava.

## 3. Fontes de evidência usadas nesta versão

### 3.1 Estado e contratos do projeto

- [`../INDEX.md`](../INDEX.md): estado atual e gates.
- [`../ARQUITETURA.md`](../ARQUITETURA.md): núcleo neutro, peças e montagens.
- [`../AUTORIA-IA.md`](../AUTORIA-IA.md): autoria por IA e validação em camadas.
- [`../AGENT-FIRST.md`](../AGENT-FIRST.md): intenção, contexto, determinismo,
  diagnóstico, composição e identidade.
- [`../PERFIS-DE-AUTORIA.md`](../PERFIS-DE-AUTORIA.md): distinção entre F2,
  F3 e `realistaApresentacao`.
- [`../REFERENCIA-E-CRITICA-VISUAL.md`](../REFERENCIA-E-CRITICA-VISUAL.md):
  protocolo de referência e crítica.
- [`../RELATORIO-SONDA-SUPERCARRO-1-0.md`](../RELATORIO-SONDA-SUPERCARRO-1-0.md):
  métricas e limites declarados pela sonda anterior.

### 3.2 Artefatos observados

- referência única em perspectiva:
  `autoria-assistida/experimentos/sonda-supercarro-1-0/referencias/supercarro-ficcional-cobalto.png`;
- cinco vistas globais canônicas do conjunto;
- receitas de carroceria, cabine, painéis, óptica e aerodinâmica;
- montagem persistida com 27 peças-folha;
- catálogo gerado das 32 operações do motor;
- protótipo local não integrado de `inflate` por seções e as imagens que ele
  regenerou.

### 3.3 Limite da evidência

Existe apenas uma imagem de referência em perspectiva. Não há prancha
ortográfica, distância focal conhecida, dimensões de envelope, seções de
carroceria, curvas mestras, desenho de caixa de roda nem mapa de continuidade.
Portanto, a referência atual sustenta uma direção estética, mas não determina
uma forma 3D única. Qualquer alegação de fidelidade precisa começar reconhecendo
essa subdeterminação.

## 4. Estado factual do que existe

### 4.1 O que a plataforma já faz bem

A plataforma não está vazia nem estruturalmente quebrada. Ela já oferece:

- receitas determinísticas e replay;
- malha neutra com vértices compartilhados e faces endereçáveis;
- identidade semântica de partes, origens e portas;
- montagens recursivas e instâncias compartilhadas;
- descrição, exportação, diff, captura e auditoria;
- seleção, isolamento e vistas reproduzíveis;
- extensões registradas, contratos de uso e descoberta Agent-First;
- falha fechada para várias classes de entrada inválida;
- separação entre núcleo geométrico e Three.js.

Essas capacidades são valiosas e devem ser preservadas. O problema não é a
ausência de uma fundação procedural; é o teto da representação geométrica e do
processo de aprovação visual para este alvo.

### 4.2 Representação geométrica atual

O artefato geométrico central é `mecanifica.malha-poligonal@1`: vértices e faces.
As 32 operações registradas cobrem:

- primitivas e geradores: cubo, cilindro, esfera, cone, plano, caixa chanfrada,
  revolução, loft e `inflate` voxel;
- edições: mover vértice/aresta/face, extrudar face, mesclar vértices, apagar ou
  inverter face;
- transformações e repetição: translação, rotação, espelho e arranjo;
- recursos locais: furo, arredondamento convexo, filete plano, ruído;
- semântica e aparência: parte, porta, material, liso, sólido, pintura e pesos.

Não foi encontrada no registro atual uma representação de:

- curva paramétrica persistida;
- rede de curvas mestras;
- superfície Bézier, B-spline ou NURBS como artefato editável;
- superfície de subdivisão e malha de controle;
- B-rep com vértices, arestas, wires, faces, shells e sólidos;
- trimming de superfície por curvas;
- costura de patches com tolerância e continuidade declarada;
- união, interseção ou diferença geral entre sólidos;
- shell/offset de superfície com espessura;
- remalhamento ou retopologia;
- LOD derivado da mesma fonte geométrica;
- UV, baking ou tangentes como contrato de autoria.

`furo`, `espelha`, `mescla` e os filetes atuais resolvem casos locais. Eles não
equivalem a um kernel de superfícies ou a CSG/B-rep geral.

### 4.3 Sonda aprovada anteriormente

A sonda registrada como concluída possui:

| Medida | Baseline documentada |
|---|---:|
| definições privadas | 12 |
| peças-folha resolvidas | 27 |
| submontagens compartilhadas | 4 |
| vértices/faces nas definições únicas | 1.428 / 1.434 |
| vértices/faces depois das instâncias | 4.620 / 4.530 |
| export JSON | 372.939 bytes |
| vistas válidas | 13 |
| pares globais decididos | 351 / 351 |

Essas métricas provam estrutura, repetição, fechamento do fluxo e capacidade de
inspeção. Não medem semelhança com a referência, continuidade de carroceria ou
qualidade de superfície.

### 4.4 Protótipo local rejeitado

Depois da reprovação visual, foi tentado um modo opcional de `inflate` que cruza
uma silhueta lateral e uma planta por superelipses transversais. A carroceria foi
dividida em monocoque central e dois ombros de para-lama sobrepostos.

Estado mensurado desse protótipo não integrado:

| Medida | Baseline | Protótipo | Variação |
|---|---:|---:|---:|
| carroceria — vértices | 86 | 1.014 | +928 |
| carroceria — faces | 96 | 1.056 | +960 |
| definições únicas — vértices | 1.428 | 2.356 | +928 |
| definições únicas — faces | 1.434 | 2.394 | +960 |
| export JSON | 372.939 B | 642.757 B | +269.818 B |

O protótipo passou 485 testes focados do núcleo antes de ser interrompido, mas a
suíte completa e o teste da sonda não foram concluídos. O snapshot atual da
sonda espera as contagens antigas e menos de 400.000 bytes; portanto não se pode
considerar o workspace verde.

Visualmente, o protótipo produziu:

- planta em ampulheta e ombros mais claros;
- rodas parcialmente cobertas na leitura frontal e superior;
- silhueta lateral mais contínua.

Também produziu ou manteve:

- leitura de protótipo de corrida/“batmóvel”, não de supercarro realista;
- três cascas que se sobrepõem sem união ou continuidade controlada;
- ressaltos e vales arbitrários nos para-lamas;
- canópia, portas, entradas, faróis e aerodinâmica ainda aplicados como objetos
  independentes;
- caixas de roda aproximadas pela borda inferior, sem cavidade topológica;
- aumento de aproximadamente 72% nos bytes exportados sem atingir o alvo.

O usuário rejeitou explicitamente o resultado. Essa rejeição tem precedência
sobre os ganhos geométricos locais e sobre gates estruturais.

## 5. Problema atual, formulado sem solução embutida

> A Mecanifica consegue gerar e organizar malhas mecânicas determinísticas, mas
> não possui hoje um caminho demonstrado para uma IA definir, editar e validar
> uma carroceria exterior contínua de qualidade F3: com controle local de
> silhueta e curvatura em duas direções, transições entre regiões, recortes reais,
> espessura, bordas e continuidade preservados por uma história semântica.

O problema possui quatro componentes simultâneos.

### 5.1 Alvo visual subespecificado

Uma perspectiva única não fixa proporções 3D, seções ou continuidade. O agente
precisa inventar dados essenciais e pode produzir uma forma internamente
coerente, porém diferente da expectativa do usuário.

### 5.2 Representação insuficiente para o alvo

Primitivas, lofts e volumes inflados controlam envelopes globais, mas não uma
rede de superfícies automotivas. Somar corpos permite bloquear massa; não permite
declarar que duas regiões compartilham uma curva e devem encontrar-se com
continuidade G0, G1 ou G2.

#### A armadilha do “tubo de pasta de dente”

O `loft` longitudinal e o protótipo de `inflate` suave partem da mesma família
de decisão: para cada posição ao longo do carro existe uma seção transversal.
É possível alargar, achatar, elevar ou torcer essa seção. Isso equivale a apertar
e deformar um tubo ao longo do comprimento.

Essa representação acopla regiões que o autor precisa controlar separadamente.
Ao elevar o para-lama na estação da roda, também se altera a seção que atravessa
capô e região central; ao estreitar a cintura, toda a seção responde; um arco de
roda precisa ser simulado pela borda do envelope em vez de existir como trim ou
cavidade. Acrescentar seções melhora a amostragem do mesmo modelo mental, mas
não acrescenta graus de liberdade semânticos.

Portanto, a pergunta não é “quantas seções faltam?”. É:

> qual representação permite à IA editar linha de ombro, capô, para-lama,
> caixa de roda, teto e cintura como decisões relacionadas, porém independentes?

#### Mecanismo Agent-First procurado

A hipótese a testar é uma autoria hierárquica, em vez de autoria por vértices ou
por um envelope único:

1. dimensões, eixos de roda, landmarks e planos fixam a proporção;
2. curvas mestras controlam silhueta lateral, planta, ombros e aberturas;
3. uma pele composta por patches ou cage liga essas curvas com continuidade;
4. trims, cavidades, gaps e painéis acrescentam detalhes sem destruir a pele;
5. features mantêm nomes e procedência;
6. tesselação gera a malha adequada a cada distância.

A IA deveria poder pedir “subir 25 mm a crista do para-lama sem mover a base do
para-brisa” ou “aumentar a tangência capô–para-lama”, observar o impacto e
reverter. Esse é o nível de praticidade a avaliar. Ainda não está decidido se a
pele será B-rep/NURBS, SubD ou uma IR capaz de compilar para ambas.

### 5.3 Operações locais sem história de forma adequada

As edições de vértice, aresta e face existem, porém várias são posicionais e
agem depois da tesselação. Uma carroceria realista exige editar decisões como
“linha de ombro”, “arco da roda”, “queda do capô” e “transição capô–para-lama”
sem depender de IDs frágeis de centenas de vértices.

### 5.4 Aprovação visual sem critério vinculante

A sonda anterior foi declarada `aprovar` porque estrutura, orçamento, vistas e
auditoria passaram. O perfil visual era conceitual/F2, enquanto a expectativa
do usuário evoluiu para realismo. Não havia limiar verificável de semelhança,
continuidade ou fabricação que impedisse o fechamento. O processo aceitou um
fluxo funcional como se também aprovasse a forma.

## 6. Sintomas observáveis e suas causas prováveis

| Sintoma | Evidência | Classe atual | Observação |
|---|---|---|---|
| carro parece cápsula, prancha ou barco | lateral e superior | representação | seção única por estação não controla regiões independentes |
| rodas parecem externas ou coladas | frontal, traseira e lateral | representação/topologia | não há caixa de roda recortada e integrada |
| para-lamas parecem volumes anexos | isométrica e frontal | continuidade | corpos sobrepostos não compartilham superfície nem curvatura |
| cabine parece pousada sobre o corpo | lateral e isométrica | continuidade/decomposição | interseção visual substitui transição de teto, coluna e cintura |
| portas e dutos parecem placas | lateral | autoria | caixas chanfradas aplicadas não seguem a superfície hospedeira |
| faróis e lanternas parecem barras | frente e traseira | autoria/recorte | não há alojamento, lente conformada ou trim na casca |
| mais faces não trouxeram realismo | métricas do protótipo | abstração | densidade foi gasta em anéis, não em decisões de forma |
| gates passaram apesar da rejeição | relatório e feedback | validação | integridade e estética não tinham saídas independentes |

“Causa provável” não significa decisão arquitetural. Cada linha deverá ser
testada por uma prova mínima antes de virar requisito de implementação.

## 7. O que ainda não sabemos

Não há evidência suficiente para fechar estas perguntas:

1. O alvo é um **hero asset de jogo**, uma carroceria conceitual de apresentação
   ou um modelo CAD com plausibilidade de fabricação?
2. Qual distância mínima e resolução de tela precisam sustentar a ilusão?
3. A forma deve ser exportável somente como malha, ou também como STEP/B-rep?
4. Painéis precisam possuir espessura física ou basta casca visual no primeiro
   marco?
5. Portas, capô e aerofólio precisarão mover, ou apenas ser selecionáveis?
6. A bancada publicada precisa executar o kernel, ou pode consumir somente
   malha compilada por ferramenta Node/WASM?
7. É aceitável introduzir um runtime externo pesado ou processo headless?
8. Qual orçamento de download, memória, geração, faces e tempo de autoria vale?
9. “Tipo supercarro” descreve proporção e linguagem visual ou exige aproximação de
   um modelo específico? Este plano assume veículo ficcional até decisão oposta.
10. Quais vistas e referências constituem verdade: perspectiva artística,
    blueprint ortográfico, medidas ou combinação explícita?

Responder essas perguntas não é burocracia. Cada resposta altera qual kernel e
qual representação são adequados.

## 8. Capacidades que um teto realista provavelmente exige

Esta seção é uma matriz de necessidades a validar, não uma lista automática de
features.

### 8.1 Referência e esqueleto dimensional

- wheelbase, bitola, diâmetro das rodas, balanços e altura total;
- câmeras e pranchas calibradas;
- curvas mestras de lateral, planta e seções transversais;
- planos de simetria e estações nomeadas;
- vínculo explícito entre referência e decisão geométrica.

### 8.2 Curvas e superfícies

- curvas paramétricas editáveis, com grau, nós, pesos e pontos de controle;
- patches de superfície ou malha de controle SubD;
- continuidade G0 (posição), G1 (tangência) e, onde necessário, G2
  (curvatura) entre regiões;
- avaliação de curvatura, reflexão/zebra e desvio entre patches;
- controle local sem reconstruir toda a carroceria.

### 8.3 Topologia e recursos

- trims e recortes por curvas para caixa de roda, vidro, portas, dutos e luzes;
- costura de faces em shell e validação de fechamento;
- offset/shell para espessura quando exigida;
- união, diferença e interseção robustas onde a estratégia depender delas;
- filetes e blends que conheçam superfícies, não somente arestas já tesselladas;
- simetria com possibilidade de quebrá-la intencionalmente.

### 8.4 História e identidade

- grafo de features acima da malha final;
- identidades semânticas para curvas, patches, trims, painéis e recursos;
- procedência das faces tesselladas até a feature que as gerou;
- política explícita para o problema de nomeação topológica depois de booleanas,
  trims e reconstruções;
- diff que distinga mudança de intenção, controle, topologia e tesselação.

### 8.5 Compilação para jogo

- tesselação determinística por tolerância e distância;
- normais, tangentes, UVs e fronteiras de material;
- LODs derivados da mesma fonte;
- retopologia ou redução que preserve silhueta e regiões críticas;
- exportação para malha neutra atual sem fazer dela a única fonte de autoria.

### 8.6 Validação visual e geométrica

- sobreposição da referência na mesma câmera;
- erro de silhueta por vista;
- análise de continuidade nas costuras;
- mapas de curvatura/reflexão;
- crítica humana/IA ligada a hashes antes/depois;
- gates separados para estrutura, geometria, forma visual e apresentação.

## 9. Famílias de abordagem

Nenhuma alternativa abaixo está aprovada. Elas serão comparadas por spikes
equivalentes, não por demonstrações diferentes escolhidas para favorecer uma.

### A. Evoluir a malha nativa com SubD e booleanas robustas

**Ideia:** tornar uma malha de controle semântica a fonte de autoria, avaliar uma
superfície de subdivisão e usar uma biblioteca de booleanas de malha para cortes.

**Potencial:** alto para ativo de jogo, carroceria orgânica, creases, edição
local e retopologia orientada à renderização.

**Vantagens:**

- conversa diretamente com o destino em malha;
- modelagem por cage é familiar ao hard-surface de jogos;
- controle de arestas duras e suaves;
- pode preservar o núcleo atual como saída;
- tende a custar menos que uma pilha CAD completa.

**Riscos e custos:**

- booleana de malha exige entrada manifold e tolerâncias cuidadosas;
- cortes podem degradar a malha de controle e a qualidade do SubD;
- espessura, blends e painéis precisam de contratos próprios;
- continuidade existe como superfície limite, mas não substitui relações G2
  explícitas entre patches independentes;
- identidade depois de remalhamento continua difícil.

**Candidatos a investigar:** OpenSubdiv para avaliação SubD e Manifold para
booleanas de malha. OpenSubdiv é otimizado para avaliação de topologia estática
em CPU/GPU; Manifold afirma saída manifold para entrada manifold e rastreia
proveniência de faces. Isso não prova integração com a Mecanifica.

### B. Adotar um kernel CAD B-rep com curvas e superfícies paramétricas

**Ideia:** tornar wire/face/shell/solid e curvas/superfícies paramétricas uma
representação de autoria, compilando depois para a malha neutra.

**Potencial:** o teto geométrico mais alto entre as alternativas examinadas para
trims, costura, shell, booleana, filete e interoperabilidade CAD.

**Vantagens:**

- B-rep distingue geometria de superfície e topologia de borda;
- suporta NURBS/B-splines, loft, sweep, trim, sewing, shelling e booleana;
- oferece tolerâncias, checagem de shape e tesselação;
- pode exportar formatos CAD além da malha;
- evita reimplementar décadas de geometria computacional.

**Riscos e custos:**

- API extensa, verbosa e pouco Agent-First sem uma camada semântica forte;
- kernel WASM pode acrescentar megabytes, inicialização e memória;
- operações podem falhar em geometrias marginais e precisam de healing;
- nomeação topológica continua sendo problema do produto, mesmo quando o kernel
  oferece histórico de operação;
- licenciamento e forma de distribuição precisam de revisão jurídica/técnica;
- superfície CAD tecnicamente correta não produz automaticamente design
  automotivo de classe A.

**Candidato principal a investigar:** Open CASCADE Technology por meio de um
binding WASM/Node. A documentação oficial lista curvas e superfícies livres,
interseções, NURBS, sewing, lofts, sweeps, booleans, hollowing, shelling,
filetes e tesselação. OpenCascade.js oferece bindings e builds customizados, mas
o build completo documentado é pesado.

### C. Fluxo externo de DCC/Blender como backend de autoria

**Ideia:** usar um modelador headless maduro para SubD, modificadores, booleans,
UV, baking e exportação; a Mecanifica manteria briefing, identidades, montagem,
validação e procedência.

**Potencial:** caminho mais curto para qualidade visual de jogo se a dependência
externa e sua automação forem aceitáveis.

**Vantagens:**

- conjunto muito amplo de operações de modelagem e acabamento;
- ecossistema de formatos, UV, materiais, baking e LOD;
- boa adequação ao resultado final de jogo;
- permite comparar o teto visual antes de construir um kernel próprio.

**Riscos e custos:**

- runtime externo grande, processo separado e instalação mais complexa;
- scripts e estado `.blend` podem reduzir transparência e determinismo;
- identidade semântica precisa atravessar objetos, modifiers e exportação;
- integração com navegador não é direta;
- licença, distribuição e isolamento do processo precisam de análise própria;
- pode deslocar o núcleo do projeto para uma ferramenta que ele não controla.

### D. Representação implícita/SDF com CSG

**Ideia:** definir a forma como campo de distância e combinar volumes por união,
diferença, interseção e blends, extraindo a superfície no final.

**Potencial:** alto para booleanas robustas, blends orgânicos, cavidades e
exploração rápida.

**Vantagens:**

- composição volumétrica simples e fechada;
- blends e recortes naturais;
- independente de uma topologia de entrada frágil;
- bom escape hatch para formas generativas.

**Riscos e custos:**

- painéis finos, vincos controlados e gaps precisos são difíceis;
- extração gera malha que pode exigir muita resolução;
- UV, bordas semânticas e identidade de face são trabalhosas;
- continuidade visual suave não significa controle de superfície automotiva;
- tende a produzir formas “derretidas” sem disciplina adicional.

### E. Kernel híbrido: superfície livre + sólido/booleana + compilação de jogo

**Ideia:** manter uma IR semântica comum e permitir backends especializados:
curvas/patches ou SubD para a pele exterior, B-rep ou Manifold para sólidos e
recortes, e tesselação/LOD para consumo visual.

**Potencial:** o maior teto absoluto, porque não força uma única representação a
resolver todas as fases.

**Vantagens:**

- escolhe a representação adequada por feature;
- preserva autoria rica e saída de jogo;
- permite substituir backend sem mudar a intenção persistida;
- abre caminho para carroceria, peças mecânicas e robótica no mesmo produto.

**Riscos e custos:**

- é também a alternativa de maior complexidade arquitetural;
- conversões entre representações podem perder continuidade, identidade ou
  tolerância;
- exige um modelo de procedência e erro muito mais forte;
- dois kernels ampliam bundle, testes, diagnóstico e manutenção;
- sem uma IR mínima bem escolhida, vira apenas uma coleção de adaptadores.

### F. Construir um kernel completo internamente

**Ideia:** implementar curvas, superfícies, B-rep, interseções, booleans,
healing, fillets e tesselação dentro do repositório.

**Potencial:** controle máximo em teoria.

**Trade-off dominante:** risco e tempo desproporcionais. O problema inclui
predicados robustos, tolerâncias, degenerações e nomeação topológica. Esta opção
fica registrada para não ser confundida com “independência”, mas não é recomendada
sem uma razão que invalide kernels maduros.

## 10. Hipótese de direção mais potente — ainda não é decisão

A direção de maior teto aparente é a **E, híbrida**, com uma restrição: começar
por uma única representação autoral principal, não integrar tudo ao mesmo tempo.

Uma arquitetura candidata seria:

```text
briefing + referências calibradas
→ grafo semântico de features
→ curvas mestras e patches/sólidos autorais
→ operações de trim, costura, blend e corte
→ validação da representação rica
→ tesselação determinística
→ mecanifica.malha-poligonal@1
→ montagem, inspeção, diff e exportação atuais
```

O núcleo atual continuaria útil como executor de malha e contrato de saída. A
representação rica não deve ser achatada em `PASSOS` de vértices antes da hora.

O candidato mais forte para a primeira comparação é:

- **B-rep/OCCT** como teto de superfície, trim, shell e recursos;
- **SubD + Manifold** como teto de ativo de jogo e booleanas de malha;
- o mesmo quarto de carroceria modelado nas duas rotas;
- Blender headless como referência externa de produtividade e qualidade, não
  automaticamente como dependência final.

Escolher diretamente OCCT ou SubD sem esse bake-off seria um chute arquitetural.

### 10.1 Abordagem 1 congelada para revisão

A primeira formulação da Abordagem 1 é:

```text
grafo semântico próprio da Mecanifica
→ dimensões, landmarks e curvas mestras
→ pele por patches com continuidade
→ trims, shell, blends e cortes por kernel maduro
→ tesselação determinística
→ malha neutra, montagem e bancada atuais
```

O objetivo desta subseção é tentar quebrar e melhorar essa formulação sem
mudá-la durante o julgamento. A conclusão pode ser `manter`, `revisar` ou
`rejeitar`; acrescentar texto, sozinho, não conta como ganho.

### 10.2 Afirmações com confiança alta

1. A malha tessellada não deve ser a única fonte de autoria F3.
2. A IA precisa controlar regiões e intenções, não centenas de IDs de vértice.
3. Proporção, pele, recortes e compilação são níveis diferentes.
4. A procedência semântica precisa atravessar o backend e chegar à malha.
5. A carroceria deve ser avaliada durante a construção, não somente no final.
6. O backend geométrico deve ser substituível pela IR; chamadas cruas de OCCT,
   Blender ou outra biblioteca não devem ser o formato persistido do produto.

Essas conclusões sobrevivem à escolha entre NURBS, SubD, B-rep ou DCC.

### 10.3 Ataques à formulação inicial

#### Ataque A — curvas mestras podem recriar o tubo

Uma lista de curvas laterais e transversais ainda pode formar somente uma pele
global. Se toda alteração percorre a seção inteira, o sistema apenas substitui o
`loft` por um loft mais sofisticado.

**Correção exigida:** curvas precisam pertencer a regiões e relações locais. A
crista do para-lama, a borda do capô e a base do para-brisa são controles
separados, conectados por restrições explícitas. “Curva mestra” não pode
significar “mais uma seção do tubo”.

#### Ataque B — G2 não garante uma superfície bonita

Duas superfícies podem passar numericamente em G2 e ainda apresentar ondulação,
pinçamento ou distribuição ruim de curvatura.

**Correção exigida:** além de continuidade de borda, medir fairness: variação de
curvatura, inflexões, densidade de isocurvas, zebra e sensibilidade a pequenas
mudanças dos controles.

#### Ataque C — patches podem explodir o custo cognitivo

Uma carroceria com dezenas de patches, graus, nós e pesos pode ser tão ruim para
a IA quanto centenas de vértices.

**Correção exigida:** a interface comum deve expor handles semânticos e objetivos
locais. Grau, nós, pesos e tolerâncias ficam disponíveis para diagnóstico ou
escape hatch, mas não são a linguagem principal.

#### Ataque D — trims e booleanas quebram identidade

Depois de cortar uma caixa de roda, uma face pode ser dividida em várias; depois
de alterar a curva, a contagem pode mudar novamente.

**Correção exigida:** identidade pertence à feature e à região de intenção. A
saída carrega linhagem `feature → regiões resultantes → faces tesselladas`, com
estado explícito para divisão, fusão ou desaparecimento.

#### Ataque E — B-rep pode ser inadequado como única pele de jogo

OCCT oferece recursos fortes de sólido e superfície, mas uma API CAD extensa não
é automaticamente produtiva para estilização, retopologia, UV e LOD.

**Correção exigida:** não decidir que B-rep será toda a autoria. Comparar uma
pele paramétrica B-rep com uma cage SubD usando o mesmo briefing e a mesma saída.

#### Ataque F — SubD pode degradar recortes e painéis

Booleans sobre a malha de controle podem criar poles, triângulos e densidade
irregular, prejudicando a superfície limite e a edição posterior.

**Correção exigida:** separar a pele primária dos detalhes compilados e testar
se trims devem permanecer paramétricos até a tesselação, em vez de destruir a
cage.

#### Ataque G — preview pode ficar lento demais

Uma interação correta, porém com segundos ou dezenas de segundos por pequena
mudança, impede a IA de explorar e corrigir.

**Correção exigida:** cada feature declara seu domínio de impacto; preview pode
usar tesselação provisória e recompilar somente regiões dependentes. Qualidade
final não precisa ser o custo de cada iteração.

#### Ataque H — referência ainda pode dominar o erro

Mesmo a melhor superfície não recupera uma forma 3D determinada a partir de uma
perspectiva única.

**Correção exigida:** a camada de referência é parte da autoria: câmeras,
landmarks, medidas, confiança e conflitos precisam ser dados, não memória do
agente.

### 10.4 Abordagem 1 revisada

A reanálise transforma a proposta numa arquitetura de cinco camadas:

#### Camada R — referência calibrada

- imagens, câmeras e escala conhecidas;
- landmarks 2D/3D com confiança e fonte;
- dimensões rígidas: rodas, eixos, wheelbase, bitola e envelope;
- divergências entre referências registradas, não suavizadas em silêncio.

#### Camada I — intenção e dependências

- regiões: capô, para-lama, lateral, teto e aberturas;
- handles: crista, linha de ombro, cintura, arco e bordas;
- restrições locais e dependências direcionadas;
- simetria como restrição removível, não cópia irreversível;
- objetivos como posição, tangência, curvatura, fairness e folga.

#### Camada S — representação de superfície

- backend candidato B-spline/B-rep ou SubD;
- fronteiras compartilhadas e continuidade verificável;
- domínio paramétrico e regiões semanticamente nomeadas;
- pele primária preservada antes de detalhes destrutivos.

#### Camada F — features e detalhes

- trims, caixas de roda, gaps, dutos, alojamentos e retornos;
- histórico não destrutivo e ordenado;
- linhagem de identidade através de divisões e fusões;
- falha local com causa, feature e sugestão de correção.

#### Camada C — compilação e apresentação

- tesselação por tolerância e distância;
- normais, tangentes, UV/material e LOD;
- malha atual como produto compilado;
- preview incremental, diff visual e commit condicionado aos gates.

O ganho principal é separar **o que a IA quer mudar** de **como o kernel calcula
a superfície**. A primeira formulação dizia “curvas e patches”; a revisão define
onde vivem referência, intenção, superfície, features e compilação, e quais
perdas não podem atravessar essas fronteiras.

### 10.5 Interação mínima desejada para a IA

Uma alteração típica deveria poder ser expressa assim, conceitualmente:

```text
alvo: para-lama-dianteiro-esquerdo.crista
mudança: elevar 0,025 m na estação do eixo
preservar:
  - arco-da-roda.folga
  - capô.borda-central
  - para-brisa.base
continuidade:
  com capô: G2
  com lateral: G1
validar:
  - lateral
  - frontal
  - superior
  - zebra-isometrica
```

O sistema derivaria curvas, patches e regiões afetadas, produziria preview e
mostraria violações antes de publicar. Essa forma ainda não é schema; ela serve
para testar se uma alternativa reduz esforço cognitivo de verdade.

### 10.6 Bake-off refinado

O quarto dianteiro será produzido por três rotas:

| Rota | Pele | Recorte/fechamento | Papel |
|---|---|---|---|
| A | B-spline/NURBS | OCCT B-rep | maior teto CAD/superfície |
| B | cage SubD | Manifold ou feature não destrutiva | maior aderência a jogo |
| C | Blender headless | modifiers/booleans do DCC | controle externo de produtividade |

Todas recebem os mesmos landmarks, handles, dimensões, alterações e vistas. O
teste não permite que cada backend modele um carro diferente ou receba ajuda
manual desigual.

### 10.7 Como julgar se a reanálise ajudou

| Critério | Antes | Depois desta revisão |
|---|---|---|
| unidade editável | “curvas e patches” | região + handle + restrição + feature |
| referência | entrada visual implícita | camada calibrada com confiança |
| continuidade | G0/G1/G2 | continuidade + fairness + zebra |
| identidade | requisito geral | linhagem explícita entre feature e faces |
| backend | OCCT como candidato forte | bake-off simétrico B-rep/SubD/DCC |
| iteração | não definida | preview incremental por domínio de impacto |
| saída | tesselação | compilação com LOD, atributos e gates |
| falha | kernel recusa | diagnóstico localizado na feature/intenção |

**Ganho material encontrado:** sim. A arquitetura ficou menos acoplada ao OCCT,
passou a tratar referência e iteração como partes do sistema, identificou que
G2 sozinho é insuficiente e transformou identidade/preview em contratos de
fronteira. Também derivou um bake-off mais justo.

**O que não foi resolvido:** schema da IR, algoritmo de fairness, backend
vencedor, topological naming completo, tolerâncias, desempenho e licenças.

**Decisão da rodada:** `revisar e manter como Abordagem 1`. Ela é mais forte que
o envelope longitudinal, mas ainda não está pronta para implementação.

### 10.8 Confiança depois da reanálise

| Afirmação | Confiança |
|---|---:|
| abandonar envelope longitudinal como fonte principal | 95% |
| grafo semântico com regiões, handles e features | 92% |
| separar representação rica da malha compilada | 92% |
| curvas/pele controlável como base do exterior | 84% |
| bake-off B-rep/SubD/DCC como próxima prova | 90% |
| OCCT como único backend | 58% |
| arquitetura híbrida como teto de longo prazo | 78% |

As porcentagens são juízo arquitetural explícito, não estatística. A próxima
rodada deve aumentá-las ou reduzi-las por evidência comparativa.

## 11. O problema de identidade que nenhuma biblioteca resolve sozinha

O projeto exige identidade semântica estável. Booleanas e trims mudam a
topologia: uma face pode ser dividida, removida ou recriada. IDs de face do
kernel ou índices da malha não podem virar identidade persistida.

O plano futuro precisará definir:

- feature de origem: `paralama-dianteiro-esquerdo`, `recorte-caixa-roda`;
- regiões esperadas da saída: exterior, retorno interno, borda do recorte;
- linhagem um-para-muitos e muitos-para-um;
- política quando uma região desaparece;
- seleção por intenção e procedência, com a topologia apenas como resolução;
- diff e diagnóstico quando o kernel não consegue mapear a história.

Esse é um requisito central, não um detalhe posterior de MCP ou UI.

## 12. O problema de validação visual

As próximas provas não podem usar apenas “PNG válido”, “não cortado” ou “vistas
distintas”. Esses gates verificam infraestrutura de captura.

Uma validação de carroceria precisa separar:

1. **integridade:** receita/IR executa, fecha e exporta;
2. **dimensão:** rodas, eixos, balanços e envelope obedecem ao briefing;
3. **silhueta:** contorno por vista aproxima referências calibradas;
4. **superfície:** costuras, reflexos e curvatura não denunciam patches ruins;
5. **topologia:** trims, gaps e cavidades existem de verdade;
6. **semântica:** regiões continuam endereçáveis e comparáveis;
7. **apresentação:** material e iluminação permitem enxergar a forma;
8. **aceite:** usuário ou crítico autorizado aprova explicitamente o marco.

Métricas candidatas a investigar:

- IoU e distância de Hausdorff entre silhuetas por vista;
- desvio de landmarks projetados;
- diferença angular G1 e diferença de curvatura G2 nas costuras;
- zebra/reflection lines e mapas de curvatura;
- contagem de gaps, overlaps e self-intersections;
- erro de espessura e raio mínimo;
- tempo, tokens, operações e correções até o aceite;
- estabilidade de hash sob replay e tesselação repetida.

Os limiares ainda não existem e não devem ser inventados nesta rodada.

## 13. Prova comparativa proposta para uma rodada futura

Antes de um carro completo, cada abordagem deverá construir o mesmo recorte
neutro: um quarto dianteiro de carroceria com:

- plano de simetria;
- roda e envelope de esterçamento somente como contexto;
- capô, para-lama e lateral;
- arco de roda realmente aberto;
- transição capô–para-lama com continuidade declarada;
- uma linha de caráter controlada;
- recorte de farol conformado;
- espessura ou retorno de borda conforme o perfil escolhido;
- identidades semânticas preservadas até a malha final.

A mesma tecnologia também deverá provar uma forma não automotiva — por exemplo,
casco, carenagem industrial ou eletrodoméstico — para evitar um kernel com
vocabulário específico de carro.

Saídas comparáveis:

- fonte de autoria;
- grafo de features;
- malha tessellada no mesmo erro máximo;
- vistas ortográficas, isométrica e zebra;
- relatório de continuidade e topologia;
- tempo, memória, bundle, bytes persistidos e custo de contexto;
- alteração local repetida por outra sessão de IA.

## 14. Trade-offs que precisam de decisão explícita

| Decisão | Ganho | Custo ou risco |
|---|---|---|
| B-rep em vez de malha como fonte | trims, shell, CAD, precisão | kernel pesado, API complexa, naming |
| SubD como fonte | forma visual e edição de cage | cortes, precisão e semântica de painel |
| backend externo | teto visual imediato | instalação, processo, determinismo e licença |
| WASM no navegador | autoria local uniforme | download, compilação e memória |
| kernel apenas em Node | bancada leve | preview requer compilação/serviço |
| múltiplas representações | teto amplo | conversão, procedência e manutenção |
| malha final como única verdade | simplicidade | perde intenção e editabilidade de alto nível |
| IR própria acima do kernel | identidade e portabilidade | desenho de schema e adaptadores |
| fidelidade F3 | inspeção próxima convincente | autoria, polígonos, materiais e validação maiores |
| alvo ficcional | liberdade e menor risco de cópia | referência técnica precisa ser criada |

## 15. Riscos de projeto

### 15.1 Trocar o motor sem trocar o processo

Um kernel poderoso ainda pode produzir um carro ruim se a referência continuar
subespecificada e o aceite continuar subjetivo e tardio.

### 15.2 Construir uma fachada sem representação

Schemas bonitos como `criarParalama` não aumentam o teto se forem compilados
para os mesmos balões sobrepostos.

### 15.3 Expor a API bruta do kernel à IA

Milhares de classes CAD ou detalhes de half-edge aumentariam contexto e chance
de erro. A integração precisa de uma camada Agent-First menor, descobrível e
diagnosticável.

### 15.4 Perder a identidade conquistada

Migrar para uma biblioteca que devolve faces novas sem linhagem pode elevar a
imagem e degradar manutenção, diff e revalidação.

### 15.5 Otimizar bundle antes de provar a forma

Bundle importa para `bancada.html`, mas um kernel leve incapaz do alvo não é
ganho. A ordem correta é provar capacidade em spike isolado, medir e só então
decidir onde executá-la.

### 15.6 Chamar densidade de qualidade

O protótipo aumentou faces e bytes sem alcançar o alvo. Toda métrica de custo
deve ser relacionada a um ganho visual ou semântico observável.

## 16. Rodadas de maturação deste plano

As rodadas abaixo refinam o documento; não constituem implementação do produto.

### P0 — definição do alvo

- resolver “chassi” versus “carroceria”;
- fixar perfil, distância, plataforma e uso;
- reunir referência ortográfica e dimensional suficiente;
- escrever condições de rejeição visual antes de modelar.

### P1 — matriz de capacidade existente

- provar o que cada operação atual consegue ou não consegue no quarto dianteiro;
- separar ausência de representação, ausência de operação e ausência de workflow;
- registrar contornos legítimos e seus custos.

### P2 — pesquisa e bake-off dos kernels

- definir versões, licenças e ambientes candidatos;
- executar o mesmo spike em B-rep, SubD/mesh e backend externo;
- medir forma, robustez, identidade, tempo, contexto e custo.

### P3 — IR, persistência e identidade

- desenhar somente o mínimo de artefatos ricos exigidos pelo vencedor;
- resolver procedência e naming em operações destrutivas;
- testar replay, diff e alteração por outra sessão.

### P4 — integração e operação

- decidir Node, WASM/browser, worker ou processo externo;
- medir bundle, memória, cache, falha, isolamento e distribuição;
- definir relação com registro de capacidades, extensão nativa e MCP.

### P5 — plano executivo

- escolher uma arquitetura;
- dividir implementação em fatias reversíveis;
- declarar baseline, migração, gates, rollback e condição de encerramento;
- pedir aprovação explícita antes de alterar o produto.

## 17. Gate de prontidão para implementação

O plano só pode mudar para `pronto` quando todos os itens abaixo tiverem resposta
com evidência:

- alvo e nível de fidelidade inequívocos;
- referências calibradas suficientes;
- recorte comparativo e métricas aprovados;
- ao menos duas abordagens comparadas no mesmo problema;
- representação autoral escolhida e alternativas rejeitadas com motivo;
- estratégia de identidade/topological naming;
- contrato entre representação rica e `mecanifica.malha-poligonal@1`;
- ambiente de execução e impacto de distribuição medidos;
- licença e dependências revisadas;
- gates visuais e geométricos com limiares;
- plano de migração que preserve receitas e baseline existentes;
- protótipo local rejeitado classificado como descarte, reaproveitamento ou
  evidência histórica.

Hoje, nenhum desses itens está completo o bastante para autorizar implementação.

## 18. Pesquisa técnica inicial, sem decisão

Fontes primárias consultadas nesta versão:

- [OCCT — visão geral dos algoritmos de modelagem](https://dev.opencascade.org/doc/overview/html/index.html):
  documenta curvas/superfícies livres, NURBS, sewing, sweeps, lofts, booleans,
  shelling, fillets e tesselação B-rep.
- [OCCT — formato B-rep](https://dev.opencascade.org/doc/overview/html/specification__brep_format.html):
  distingue vértices, arestas, wires, faces, shells, sólidos e triangulações.
- [OpenCascade.js](https://dev.opencascade.org/project/opencascadejs): bindings
  JavaScript/WASM e builds customizados; a documentação de tamanho registra
  custo relevante do build completo.
- [OCCT — licença](https://dev.opencascade.org/doc/overview/html/index.html):
  LGPL 2.1 com exceção adicional e obrigações de distribuição a revisar.
- [Manifold](https://github.com/elalish/manifold): booleanas sobre malhas
  manifold, bindings JS/WASM e rastreamento de propriedades/proveniência.
- [OpenSubdiv](https://github.com/PixarAnimationStudios/OpenSubdiv): avaliação
  de superfícies de subdivisão em CPU/GPU, incluindo refinamento adaptativo.
- [Three.js `NURBSSurface`](https://threejs.org/docs/pages/NURBSSurface.html):
  avaliador de superfície disponível como addon; por si só não fornece B-rep,
  trimming, sewing, booleans ou história semântica.

Essas fontes demonstram que as famílias de tecnologia existem. Elas não provam
compatibilidade, estabilidade, desempenho ou adequação Agent-First neste projeto.

## 19. Estado do workspace durante esta redação

O workspace contém alterações locais não integradas da tentativa rejeitada:

- modo `secoes` experimental em `inflate`;
- testes focados desse modo;
- receita de carroceria por três envelopes;
- cinco imagens globais regeneradas;
- rascunho anterior de plano apontando essa direção.

Esses arquivos não são baseline, não estão aprovados e não devem ser publicados
ou usados para atualizar expectativas. Esta versão do plano não remove nem
integra essas alterações; a destinação será decidida explicitamente em rodada
posterior para preservar evidência e evitar perda acidental.

## 20. Registro das rodadas

### Versão 0 — 2026-08-18

- consolidou evidência do baseline e do protótipo rejeitado;
- formulou o problema em referência, representação, história e validação;
- inventariou capacidades ausentes sem convertê-las em backlog automático;
- comparou seis famílias de abordagem;
- registrou a hipótese híbrida como maior teto, sem decisão;
- definiu rodadas de maturação e gate que impede implementação prematura.

### Próxima revisão esperada

Debater, nesta ordem:

1. definição exata de `chassi realista`;
2. aceitabilidade de kernel externo e execução Node/WASM;
3. quais referências e métricas podem representar a expectativa do usuário;
4. se o bake-off deve comparar B-rep, SubD/mesh e Blender headless;
5. quais partes deste documento são excessivas, ausentes ou baseadas em hipótese.
