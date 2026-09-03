# Cadeira Realista — Notas de Projeto, Problemas e Limitações

Este documento registra os problemas, limitações da linguagem/motor procedural e decisões de modelagem durante a criação da cadeira realista em comparação com a referência visual fotorrealista gerada.

---

## 1. Alvo e Comparação com a Referência Visual

A referência gerada apresenta uma cadeira de jantar em carvalho maciço com marcenaria fina:
- **Pernas dianteiras:** Afuniladas (*tapered*) suavemente em direção aos pés, com cantos ligeiramente arredondados.
- **Pernas traseiras e montantes:** Peça contínua do chão ao topo do encosto, mas com inclinação ergonômica para trás (~6° a 8°) a partir do assento para apoio lombar adequado.
- **Assento:** Geometria trapezoidal (mais largo na frente, ~44 cm, estreitando para trás, ~38 cm), com borda frontal generosamente arredondada (*waterfall edge*) e leve esculpido/reentrância central anatômica.
- **Saia estrutural (*apron*):** Conjunto de travessas imediatamente abaixo do assento que une as quatro pernas e suporta o tampo.
- **Encosto:** 5 ripas verticais esguias e curvadas, encabeçadas por uma travessa de topo (*top rail*) em arco suave com cantos arredondados.
- **Travessas inferiores (*stretchers*):** Travessas de reforço laterais e frontais travando a flexão das pernas.

---

## 2. Problemas e Limitações Encontrados nas Ferramentas

### 2.1 Desempacotamento de Receitas em `descrever-peca.mjs`
- **Problema:** A CLI `npm run descrever -- cadeira-de-madeira --estrito` falhava com `PEÇA SEM ENVELOPE DA OFICINA: 'cadeira-de-madeira' não exporta PASSOS nem CHAMADAS_COMPOSICOES`.
- **Causa:** O script lia `modulo.PASSOS` diretamente no topo do arquivo importado, ignorando o padrão v3 de envelope (`export const receitaCadeiraDeMadeira = { PASSOS, ... }`).
- **Solução aplicada:** Atualizado `tools/mecanifica/descrever-peca.mjs` para extrair a receita via `modulo.default ?? Object.values(modulo).find(...)` de forma uniforme com `ativar-bancada.mjs` e `executar-receita.js`.

### 2.2 Inspeção Headless com `olhar-bancada.mjs` vs. Harness Privado
- **Problema:** `npm run bancada -- cadeira-de-madeira --cores` expirava com `page.waitForFunction: Timeout 30000ms exceeded`.
- **Causa:** O harness privado (`harness.html` / `harness-entry.js`) propositalmente restringe seu catálogo interno a fixtures homologadas de regressão (`fixture-visual`, `fixture-portas`, etc.). Peças de prova não catalogadas precisam ser carregadas pela **Sessão Ativa** (`public/sessao-ativa.json`) na aplicação oficial `bancada.html`.
### 2.3 Servidor Local Vite em Execução Contínua
- **Problema:** Acesso à URL `http://localhost:5174/nos-mecanifica/bancada.html` resultava em "A conexão com localhost foi recusada".
- **Causa:** O comando `npm run ativar:bancada` apenas processa e grava o arquivo de sincronização `public/sessao-ativa.json`; ele não inicia um daemon HTTP de longa duração.
- **Solução adotada:** Iniciar e manter ativo o servidor de desenvolvimento Vite (`npx vite --port 5174 --host 127.0.0.1`), permitindo ao navegador carregar a página e fazer o polling do JSON.

---

## 3. Limitações e Desafios da Modelagem Procedural

1. **Afunilamento de perfis retangulares (*chamferBox* vs. *taper*):**
   - A primitiva `chamferBox` gera caixas com chanfro estático, mas não permite variação de seção (ex: topo 42 mm -> base 28 mm) em uma única operação.
   - *Alternativas viáveis no motor:*
     a) Usar `cone` com 4 lados (`segmentos: 4`) rotacionado em 45° com `raioBase` menor que `raioTopo`.
     b) Usar `loft` com contornos retangulares chanfrados decrescentes ao longo do eixo Y.
     c) Usar composição de caixas escalonadas ou chanfros proporcionais.
2. **Inclinação ergonômica do encosto traseiro:**
   - Em cadeiras 90° rígidas, a sensação visual é de desconforto/artificialidade.
   - No motor procedural, para inclinar as pernas traseiras ou o encosto acima do assento sem desalinhar os pés no piso, o encosto deve ser separado em perna inferior e montante superior, ou girado em torno da linha do assento com `rotaciona` (eixo `x`, pivô `[0, yAssento, -pz]`).
3. **Assento trapezoidal anatômico:**
   - O assento não pode ser um retângulo puro. O uso de `loft` ou corte/afunilamento permite que a frente seja mais larga que a traseira, encaixando perfeitamente nos recuos das pernas dianteiras e traseiras.

---

## 4. Outras Limitações e Espaço de Melhoria

### 4.1 Limitações Estruturais do Motor Procedural
1. **Ausência de Rebaixo Anatômico (*Dishing/Sculpting*):**
   - Assentos de cadeiras de marcenaria de alta qualidade (estilo Windsor ou escandinavo) possuem uma depressão anatômica côncava para maior conforto. O motor atual dispõe de `arredondarAresta` e `filete`, mas não possui operação para cavidade orgânica superficial suave em tampo plano.
2. **Material Monocromático vs. Fibras e Veios de Madeira:**
   - O contrato atual de `MATERIAIS` suporta apenas `cor`, `metalicidade` e `aspereza`. Em madeira realista, a direção dos veios (*grain direction*) ao longo do comprimento das pernas e ripas é um sinal visual crucial de marcenaria real.
3. **Interpenetração de Encaixes (*Mortise and Tenon*):**
   - Na marcenaria real, peças se unem por furações e respigas. Na modelagem atual, as travessas simplesmente invadem o volume das pernas (relação `interpenetra`). Um sistema de montagem com machofêmea semântico tornaria as juntas fisicamente verossímeis.

### 4.2 Melhorias Imediatas Possíveis na Receita
1. **Travessas Desencontradas (*Staggered Stretchers*):**
   - Atualmente, as travessas lateral, frontal e traseira estão todas na mesma cota Y (16 cm), gerando sobreposição mútua dentro da perna. Em marcenaria clássica, a travessa lateral fica a ~13 cm e as transversais a ~17 cm para não enfraquecer o montante no mesmo ponto.
2. **Inclinação Suave do Encosto:**
   - Aplicar `rotaciona` de ~6° no eixo X para o bloco do encosto (ripas + travessa de topo) a partir da altura do assento, proporcionando reclinação ergonômica.
3. **Pernas Cônicas com `cone` Facetado:**
   - Substituir `chamferBox` nas pernas dianteiras por `cone` de 4 ou 8 lados com raio da base menor que o topo para criar pernas afuniladas típicas de cadeiras modernas.

### 4.3 Melhorias na Bancada e Experiência Visual
1. **Enquadramento Inicial Automático:**
   - A bancada poderia aplicar automaticamente o foco de câmera centrado no volume do objeto na inicialização da sessão ativa, evitando necessidade de ajuste manual de órbita em modelos pequenos.
2. **Iluminação de Estúdio e Sombras Suaves:**
   - Um preset de iluminação de 3 pontos (luz chave, preenchimento e contra-luz) na bancada valorizaria chanfros de marcenaria e superfícies acetinadas.

---

## 5. Implementação dos Perfis de Propósito: `jogo` vs `marcenaria`

A receita foi atualizada (`v1.2.0`) para incorporar o conceito de perfil semântico de propósito:

### 5.1 Perfil `jogo` (Otimizado para Tempo Real)
- **Geometria de casca limpa:** As travessas e saias têm comprimento calculado para terminar exatamente na face interna das pernas.
- **Relatório de colisão:** O comando `npm run descrever -- cadeira-de-madeira --estrito` confirma relação `encosta 0.000000` entre pernas e travessas, sem nenhuma invasão interna desnecessária (`interpenetra`).
- **Zero geometria oclusa:** Não há desperdício de vértices ou faces ocultas que sobrecarreguem o pipeline de renderização em motores de jogos.

### 5.2 Perfil `marcenaria` (Técnico / Fabricação / STEP)
- **Espigas estruturais (*Tenons*):** As travessas e saias ganham o comprimento total com acréscimo de 15 mm de espiga nas pontas, adentrando o corpo sólido das pernas.
- **Pronto para exportação CAD:** Ao rodar `npm run exportar:step`, a peça exportada carrega as cotas físicas reais de encaixe para projeto técnico e usinagem CNC.

### 5.3 Melhorias Geométricas Comuns Implementadas
- **Travessas escalonadas (*Staggered*):** Travessas laterais posicionadas a $Y = 13\text{ cm}$ e travessas transversais a $Y = 17\text{ cm}$. Resultado medido: **`folga y 0.010677`** (fim do conflito interno de 90°).
- **Ajuste Milimétrico de Vão Livre (Zero Invasão):** Vão frontal ($34\text{ cm}$) e vão traseiro ($33\text{ cm}$) agora são calculados individualmente pelas faces internas das pernas correspondentes. As travessas e saias tocam exatamente com `encosta 0.000000`, eliminando qualquer invasão visual ou sobreposição.
- **Reclinação ergonômica lombar:** As 5 ripas e a travessa de topo recebem inclinação de $4^\circ$ para trás a partir do assento via `rotaciona` destrógiro com pivô na junção traseira.

### 5.4 Ativação na Bancada
A CLI `tools/mecanifica/ativar-bancada.mjs` agora aceita `--perfil`:
```powershell
npm run ativar:bancada -- --arquivo=prototipos/procedural/v3/pecas/cadeira-de-madeira.js --perfil=jogo
A sessão ativa [`public/sessao-ativa.json`](file:///c:/Users/micro/Desktop/mecanifica/public/sessao-ativa.json) registra o perfil selecionado e atualiza a cena 3D na bancada instantaneamente.

---

## 6. Encosto Orgânico Esculpido e Ciclo de Crítica Visual Independente

### 6.1. O Desafio Topológico da Referência
Ao inspecionar a referência fotográfica, o usuário notou que o encosto não seguia uma carpintaria de caixas retas sobrepostas, mas sim uma **linguagem contínua de marcenaria fina (estilo escandinavo)**:
- A travessa de topo e os montantes traseiros pareciam uma peça única ou esculpida com encaixe invisível.
- As 5 ripas verticais seguiam uma curvatura anatômica sinuosa em $S$.
- Os cantos superiores apresentavam ombros convexos e concordâncias internas côncavas suaves.

### 6.2. Ciclo com Subagente Crítico Visual (Skill de Auditoria)
Conforme preconizado em `docs/mecanifica/usar/REFERENCIA-E-CRITICA-VISUAL.md`, foi disparado um **subagente crítico visual independente**, sem acesso prévio ao código da receita, encarregado de confrontar a renderização 3D diretamente contra o recorte da foto original:
1. **1ª Rodada:** O crítico apontou que os montantes pareciam "mourões de caixotaria bruta" (seção uniforme $40\times 40\text{ mm}$ do piso ao topo), a travessa parecia uma "tampa horizontal deitada" e as ripas tinham quebra poligonal intermediária.
2. **2ª Rodada:** Introduziu-se o **afunilamento progressivo (*tapering*)** das pernas traseiras ($38\text{ mm}$ no assento $\rightarrow$ $24\text{ mm}$ no topo) e spline $G2$ contínua nas ripas. O crítico elogiou a esbeltez e o salto de qualidade, mas identificou um desencontro de $45^\circ$ nos cantos superiores e a ausência do raio côncavo interno.
3. **3ª Rodada (Versão Mestre):** A travessa de topo foi redefinida para que suas extremidades descessem verticalmente em curva de $90^\circ$ com ombro convexo e raio interno de $\approx 18\text{ mm}$, encontrando o topo dos montantes em cota e bitola perfeitamente coplanares ($24\times 24\text{ mm}$). O crítico avaliou a fidelidade como de alta aderência.

### 6.3. Lição Arquitetural do Motor
Formas orgânicas e contínuas não exigem a invenção de ferramentas auxiliares complexas ou heurísticas mágicas: a primitiva determinística **`loft`** com seções de 8 pontos chanfrados/arredondados e coordenadas de caminho bem dimensionadas é suficiente para produzir marcenaria de autor mantendo o modelo ultraleve ($630$ vértices) e $100\%$ livre de faces órfãs.

