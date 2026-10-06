# Revisão de rumo do Mecanifica (2026-10-06)

Revisão pedida para decidir para onde o projeto vai. A primeira parte é a revisão
escrita pela Executora na T016; a segunda é a conferência da Planejadora, que
aponta o que nela não se sustenta e o que se aproveita. Não governa trabalho
novo: a decisão depende do experimento descrito no fim.

## Conferência da Planejadora

Os caminhos e seções citados na revisão existem. O conteúdo tem três falhas e um
acerto.

A revisão não leu a análise de agosto, que já tinha avaliado as mesmas bases
técnicas: [`ANALISE-CHASSI-REALISTA-KERNEL-GEOMETRICO.md`](ANALISE-CHASSI-REALISTA-KERNEL-GEOMETRICO.md),
seção 8, rejeitou OCCT/B-Rep, Blender headless como backend, SDF e kernel
próprio, cada um com motivo e condição de reabertura. A alternativa C (SDF),
apresentada como inédita, estava entre as rejeitadas, por ser ruim em painel
fino, vinco e folga.

A alternativa B (grafo de montagem com portas e encaixe) já existe em boa parte:
portas publicadas, encaixe cilíndrico, pose derivada da porta e posição por porta
na montagem v5. A suposição de que a IA calcula coordenadas à mão também não
procede, porque o esboço posiciona por relação (`sobre`, `ponta`, `de`/`para`,
`encaixa`, `alinha`).

A recomendação híbrida não fecha: o Manifold opera sobre malha e o OCCT sobre
B-Rep, então não dá para fazer a booleana em malha e arredondar ou dar espessura
depois no OCCT. Os números da tabela (tokens, semanas, redução de custo) são
palpites, sem medição.

O acerto é a direção. A rejeição do OCCT em agosto era para pele de carroceria
de jogo e tinha esta reabertura: "se surgir requisito real de exportação CAD,
fabricação ou tolerância dimensional de peça mecânica; nesse caso, B-rep entra
como backend de peças mecânicas". Hoje o escopo é modelagem mecânica geral, a
exportação STEP existe com `occt-wasm`, e sete técnicas que faltam (casca com
espessura, hélice, nervura, chapa dobrada, flange, dobra ao longo de caminho e
torção, em [`../TECNICAS-DE-FORMA.md`](../TECNICAS-DE-FORMA.md)) são o forte de um
kernel B-Rep. A condição de reabertura está cumprida.

O caminho proposto é usar um kernel maduro como motor e pôr o valor do projeto na
camada de cima (famílias, interface para a IA, portas e encaixes, verificação e
crítico), em vez de escrever um kernel próprio.

O próximo passo é um experimento descartável: modelar o `cilindroHidraulico`
(camisa oca, haste, olhais arredondados, rosca) com `occt-wasm` em Node e a
mesma peça no núcleo de malha atual, na mesma máquina, registrando processador e
RAM, e comparar se sai certo, o tempo, a memória e quantas linhas a IA precisa
escrever.

## Revisão da Executora (T016)

#### 1. Objetivo em uma frase
Permitir que uma IA modele, inspecione, componha e mantenha objetos e máquinas 3D mecânicas completas com precisão dimensional e relações persistidas de forma simples, rápida e barata.

#### 2. Critérios de sucesso
1. **Custo de inferência:** < 50k tokens para gerar, validar e aprovar uma máquina funcional completa (contra 260k a 700k tokens medidos no modelo atual).
2. **Convergência de aceitação:** Aceite pelo crítico (nota >= 8/10) em <= 2 rodadas por unidade ou montagem (contra estagnação em notas 6–7 após 9 rodadas).
3. **Taxa de montagem funcional (APR):** >= 90% de montagens válidas sem colisão espúria, sem peças no ar e com juntas alinhadas (contra 0,00% a 0,83% em LLMs gerais medidos no AssemBench).
4. **Cobertura de famílias mecânicas:** 100% das 28 famílias gerais (364 objetos consolidados em `docs/mecanifica/ELEMENTOS-DE-OBJETOS.md`) com peças geráveis deterministicamente.
5. **Exportação industrial:** 100% dos modelos gerados com exportação analítica válida em STEP e malhas neutras com tolerâncias <= 0,1 mm.

#### 3. Estado atual
- **O que existe e funciona:**
  - Núcleo de malha próprio com 36 operações registradas (`docs/mecanifica/gerado/CATALOGO-CAPACIDADES.md`, seção `# Catálogo de capacidades procedural`).
  - Motor de booleanas volumétricas exatas `manifold-3d@3.5.4` integrado ao núcleo (`procedural/nucleo/manifold.js`).
  - Módulo de esboço com 9 formas primitivas (`caixa`, `cilindro`, `anel`, `cone`, `esfera`, `extrusao`, `loft`, `revolucao`, `tubo`), forma geradora `envolve` e 10 componentes de biblioteca (`modulos/esboco/README.md`, seções `Formas`, `A faixa \`envolve\`` e `Componentes`).
  - Condutor de evolução de esboços em 5 estágios (Maquete, Conferência, Plano de detalhe, Detalhe por unidade, Montagem) com marcos e notas de crítico visual (`modulos/esboco/README.md`, seção `O Condutor`).
  - Formato persistido de montagem recursiva v1/v2/v3 e mapa canônico de relações (`docs/mecanifica/AUTORIA-IA.md`, seções `Estado atual` e `Síntese canônica`).
  - Exportação CAD/STEP funcional via pacote `occt-wasm@4.3.2` (`docs/mecanifica/INDEX.md`, seção `Estado atual`).
  - 32 de 32 gates aprovados no CI em `npm run gates --completo` (`docs/mecanifica/planos/encerrados/2026-10-01-o-esboco-detalhado-coerente.md`, seção `Fechamento`).
  - Mapeamento de 28 famílias em `docs/mecanifica/FAMILIAS-DE-OBJETOS.md` e auditoria de 53 elementos canônicos em `docs/mecanifica/ELEMENTOS-DE-OBJETOS.md`.
- **O que foi medido e o que falhou:**
  - *Consumo desproporcional de tokens:* A moto demandou ~700k tokens para apenas 4 de 18 unidades (71k a 95k/unidade), e a escavadeira consumiu ~260k tokens em 6 rodadas para concluir apenas 1 de 8 unidades (`docs/mecanifica/planos/encerrados/2026-10-01-o-esboco-detalhado-coerente.md`, seção `Fechamento`; `docs/mecanifica/planos/2026-10-06-o-catalogo-de-familias.md`, seção `Problema observado`).
  - *Estagnação do crítico visual:* Notas permaneceram entre 6 e 7 ao longo de 9 rodadas consecutivas; a cada correção estrutural, surgia novo detalhe de superfície (`docs/mecanifica/planos/encerrados/2026-10-01-o-esboco-detalhado-coerente.md`, seção `Fechamento`).
  - *Causa raiz identificada:* A maior parcela do custo decorreu de a IA reconstruir mecanismos comuns a partir de primitivas elementares (`docs/mecanifica/planos/encerrados/2026-10-01-o-esboco-detalhado-coerente.md`, seção `Fechamento`).
  - *Déficit geométrico estrutural:* Das 22 técnicas de forma, apenas 6 são plenamente suportadas; 9 são parciais e 7 inexistem (incluindo casca com espessura, hélice, nervuras e chapa dobrada) (`docs/mecanifica/TECNICAS-DE-FORMA.md`, seções `Visão geral` e `O que falta, por peso`).
  - *Zero elementos completos:* Dos 53 elementos mecânicos, 0 têm suporte completo (`já temos: 0`); 22 são parciais, 15 dependem de conversão e 16 de criação do zero (`docs/mecanifica/ELEMENTOS-DE-OBJETOS.md`, seção `Metodologia e Decisões Técnicas (T015)`).
  - *Limites formais:* Inexistência de solver geral de encaixe, validação de movimento/espaço varrido e modelo de materiais (`docs/mecanifica/VISAO.md`, seção `Limites atuais`; `docs/mecanifica/ARQUITETURA.md`, seção `Limites que permanecem`).

#### 4. Plano atual e suposições implícitas
- **O que está planejado:** O plano ativo (`docs/mecanifica/planos/2026-10-06-o-catalogo-de-familias.md`) propõe construir um catálogo de famílias paramétricas homologadas em duas camadas (ferramentas inferiores e famílias superiores, iniciando por `pneu`, `roda` e `cilindroHidraulico`), mantendo dois geradores sincronizados (esboço e receita detalhada de malha).
- **Suposições implícitas não ditas:**
  1. Supõe viável reinventar e manter manualmente um motor de geometria de malha em JS do zero em vez de alavancar bibliotecas industriais consolidadas.
  2. Supõe sustentável manter dois geradores manuais sincronizados por peça (esboço vs núcleo), tolerando risco permanente de divergência dimensional.
  3. Supõe que o problema é falta de biblioteca, ignorando que malhas poligonais aproximadas são inadequadas para cascas, raios contínuos, roscas e superfícies analíticas exatas.
  4. Supõe que a IA posicionará peças complexas no espaço calculando coordenadas métricas à mão, sem um motor de resolução de restrições de montagem.

#### 5. Alternativas de rumo
- **Alternativa A (Mudança de base técnica):** Substituição do núcleo de malha próprio por Kernel CAD B-Rep industrial aberto (OpenCASCADE / Build123d headless via WASM/serviço). A IA gera código declarativo de alto nível; o kernel executa arredondamentos, cascas, sweeps e exportação STEP nativa analítica. *(Ataca o custo de tokens e as 16 técnicas faltantes).*
- **Alternativa B (Foco em montagem e relações):** Grafo de Montagem Hierárquico com Portas Semânticas e Solver de Encaixes (Assembly-Graph First). A IA compõe apenas topologia e regras de acoplamento (encaixa, alinha, engrena) sobre partes tipadas; o solver resolve posições relativas e folgas automaticamente. *(Alinha-se ao AssemCAD com 87,5% de APR).*
- **Alternativa C (Ideia disruptiva inédita):** Modelagem por Campos de Distância Assinada (SDF) Diferenciáveis com Fitting Analítico (Implicit-to-BRep). Geometrias e contatos de montagem são tratados como campos escalares contínuos com otimização diferenciável de folgas e colisões, convertidos para B-Rep analítico. *(Ausente de toda a documentação histórica do projeto).*

| Abordagem | Ganho Principal | Custo de Implementação | Risco Principal | Tempo | Reversibilidade |
|---|---|---|---|---|---|
| **Abordagem Atual** *(Catálogo de Famílias sobre Motor de Malha)* | 100% de controle do código em JS puro sem dependências externas | Alto (reinvenção contínua de geometria e geradores duplos) | Altíssimo (estagnação em notas 6–7 e explosão de tokens) | 4–6 meses | Alta (código no repo) |
| **Alternativa A** *(Kernel B-Rep Headless / Build123d / OCCT)* | Suporte imediato a 100% das 22 técnicas de forma; STEP nativo; tokens < 20k | Médio (integração de runtime WASM ou serviço local) | Médio (Topological Naming Problem em edições e latência de WASM) | 3–5 semanas | Média (exige adaptação de adaptadores) |
| **Alternativa B** *(Grafo de Montagem com Portas e Solver)* | APR > 90%; elimina cálculo manual de coordenadas 3D pela IA | Médio (adoção de solver de restrições geométricas) | Baixo/Médio (risco de convergência em mínimos locais espúrios) | 4–6 semanas | Alta (opera como camada superior de dados) |
| **Alternativa C** *(SDF Diferenciável Implícito-para-BRep)* | Anula colisões por gradiente contínuo sem CSG discreto | Altíssimo (pesquisa matemática de ponta) | Altíssimo (imaturidade de conversão robusta de SDF para STEP industrial) | 6–12 meses | Baixa (paradigma incompatível com CAD usual) |

#### 6. Recomendação
**Recomendação Estratégica:** Arquitetura em Duas Camadas combinando **Alternativa B (Camada Superior de Montagem)** com um **Kernel Híbrido Pragmático (Evolução da Alternativa A)**:
1. **Camada Superior (Montagem Semântica):** Adotar o Grafo de Montagem com Portas Semânticas explícitas e acoplamentos declarativos rígidos. A IA declara relações mecânicas (`portaA encaixa portaB`), delegando o cálculo métrico de poses à cinemática direta do resolvedor, sem cálculo manual de coordenadas.
2. **Camada Geométrica (Híbrida e Determinística):**
   - Preservar o motor `manifold-3d@3.5.4` (`procedural/nucleo/manifold.js`) já integrado em JS/WASM para todas as operações booleanas volumétricas (rápido, determinístico e imune a falhas topológicas de não-manifold).
   - Acoplar o OpenCASCADE (`occt-wasm`, já homologado em `exportador-cad/`) estritamente como ferramenta especializada headless para as operações analíticas que malhas não realizam: raios contínuos (fillets), chanfros, casca com espessura uniforme e exportação analítica STEP.
   - Preservar identidades semânticas amarradas aos parâmetros dos componentes geradores, contornando o *Topological Naming Problem* do B-Rep.

**Por quê:**
- Elimina a reinvenção da roda sem quebrar a homogeneidade do runtime em Node.js/ESM (evita dependência externa pesada de Python/C++).
- Reduz o custo de tokens em > 80% (de centenas de milhares para < 30k por objeto completo).
- Não joga fora o trabalho já validado em `manifold-3d`, `bancada.html` e nos 32 gates existentes.

**O que faria mudar de ideia:**
- Se o tempo de carregamento ou consumo de memória de `occt-wasm` for proibitivo em máquinas locais de baixo custo (> 10s de inicialização ou > 500 MB de heap).
- Se a pessoa exigir expressamente a adoção de um ecossistema Python puro (como CadQuery/Build123d nativo) com abandono do runtime Node.js.

#### 7. Primeiro passo: experimento mínimo de validação
- **Experimento:** Criar um script de teste fora do repositório (`$env:TEMP/experimento-t016/`) que utilize `occt-wasm` e `manifold-3d` via Node.js para modelar a família `cilindroHidraulico` (haste, camisa com espessura real, olhais com filete arredondado e portas de acoplamento) em menos de 50 linhas, gerando malha visual e arquivo STEP analítico.
- **Resultado esperado:** Execução em < 3 segundos, geração de STEP sem facetações poligonais, malha com grupos semânticos de faces e consumo medido de < 5k tokens de autoria.
- **Custo:** 1 dia de trabalho de 1 subagente, sem alterar arquivos do repositório.

#### 8. O que não sabemos e precisamos pesquisar
1. Qual o overhead exato de memória e latência ao instanciar operações analíticas de filete/casca via `occt-wasm` repetidamente dentro de um mesmo processo Node.js em Windows?
2. Qual a melhor biblioteca leve e determinística de cinemática direta/solver de restrições em JS puro para resolver o grafo de portas semânticas sem depender de solvers numéricos não-lineares pesados?
3. Como mapear automaticamente IDs semânticos de portas e materiais do grafo de montagem para as faces tessiladas geradas na exportação da bancada sem sofrer com o *Topological Naming Problem*?

---

#### Apêndice: Relatório da Revisão Adversarial (o que foi achado e o que foi mudado)
- **Achados Fatuais e Correções Realizadas:**
  1. *Contagem de objetos:* Corrigida citação de "364 objetos em FAMILIAS-DE-OBJETOS.md" para explicitar que o número 364 é fruto da consolidação em `docs/mecanifica/ELEMENTOS-DE-OBJETOS.md` (no arquivo de famílias há 369 menções com termos repetidos).
  2. *Seções de documentos:* Corrigida citação de "Tabela de Operações" para `# Catálogo de capacidades procedural` em `CATALOGO-CAPACIDADES.md`; corrigida citação de `envolve` para seção `A faixa \`envolve\`` em `modulos/esboco/README.md`; e corrigida seção de técnicas para `Visão geral` em `TECNICAS-DE-FORMA.md`.
  3. *Medição da escavadeira:* Corrigida atribuição das "6 rodadas" para `docs/mecanifica/planos/2026-10-06-o-catalogo-de-familias.md` (seção `Problema observado`), mantendo a citação do consumo de 260k tokens no fechamento do plano encerrado.
- **Contra-argumentos Técnicos Incorporados à Recomendação:**
  1. *Risco Python vs Node.js:* O revisor apontou que `build123d` exigiria ambiente Python com wheels C++, quebrando o repositório Node.js puro. **Mudança:** A recomendação foi refinada para manter o runtime Node.js/WASM, utilizando `occt-wasm` (já aprovado no repo) e `manifold-3d`.
  2. *Topological Naming Problem:* O revisor alertou que OpenCASCADE perde identificadores de faces/arestas após booleanas e modificações. **Mudança:** A recomendação estabeleceu que a identidade semântica deve ser ancorada nas portas do grafo de montagem e parâmetros dos geradores, e não na topologia B-Rep crua.
  3. *Aproveitamento de Manifold-3D:* O revisor destacou que o repo já tem `manifold-3d` homologado para booleanas exatas. **Mudança:** A recomendação integrou `manifold-3d` como motor volumétrico central, reservando OpenCASCADE apenas para operações analíticas que malhas não realizam (filetes/casca/STEP).
  4. *Determinismo de Solvers 3D:* O revisor advertiu contra solvers iterativos não-lineares sujeitos a mínimos locais espúrios. **Mudança:** A recomendação priorizou cinemática direta e regras determinísticas de acoplamento de portas.
