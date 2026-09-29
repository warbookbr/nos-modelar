# Plano de Implementação: Estado da Arte e Ergonomia para IA no `@mecanifica/esboco`

> **Status:** Proposta de Planejamento / Aguardando Aprovação  
> **Objetivo:** Tornar o motor de esboço declarativo capaz de modelar equipamentos complexos (ex: motocicletas, veículos e maquinários industriais) de forma rápida, robusta e ergonômica para agentes de IA, eliminando o cálculo manual de trigonometria 3D.  
> **Stack:** Node.js (ESM), SVG vetorial, Playwright (rasterização PNG), Vitest.  
> **Arquivo Alvo:** [`modulos/esboco/src/index.js`](file:///C:/Users/tiago.marcondes.adm/Desktop/criar%203D_IA/modulos/esboco/src/index.js)

---

## 1. O Porquê e Para Quê (Motivação e Diagnóstico)

### 1.1. O Problema da Modelagem Complexa por IA
Modelar um conjunto mecânico simples (como um mancal com eixo) já exige da IA calcular manualmente offsets tridimensionais. Quando a complexidade sobe para uma **motocicleta**, um **robô industrial** ou uma **máquina de usinagem**, ocorrem três gargalos críticos:
1. **Sobrecarga de Trigonometria 3D:** Modelar elementos inclinados no espaço (ex: garfo dianteiro de uma moto com cáster de 26°, balança traseira, tubos de um chassi treliçado) exige calcular centros e matrizes de rotação de Euler em três eixos. LLMs cometem erros cumulativos de 1 a 3 mm que geram folgas ou colisões invisíveis no código.
2. **Fragilidade de Posições Absolutas:** Se a altura da roda dianteira mudar em 10 mm, toda a suspensão, o guidão e a mesa de direção precisam ter seus centros `[x, y, z]` recalculados individualmente.
3. **Rigidez das Primitivas Atuais:** Com apenas `caixa`, `cilindro` e `anel`, formas aerodinâmicas ou anatômicas (tanques, carenagens, bancos) exigem "gambiarras" geométricas que poluem a especificação.

### 1.2. Para Que Servem os Novos Recursos
| Recurso | O Que Faz | O Que Resolve para a IA |
| :--- | :--- | :--- |
| **1. Vetor Direto (`tubo` de A para B)** | Cria cilindros/prismas conectando dois pontos `de` e `para`. | Elimina 100% dos cálculos de centro, comprimento e ângulos de Euler para chassis e eixos inclinados. |
| **2. Ancoragem Semântica (*Snapping*)** | Conecta peças por referências relativas (`conectar: "peca.ancora"`). | Peças permanecem conectadas mesmo se a peça base mudar de escala ou posição. |
| **3. Prisma Poligonal (`tipo: "poligono"`)** | Extruda um contorno 2D de $N$ vértices ao longo de um eixo. | Permite desenhar tanques facetados, carenagens, apoios e telhados sem rotações compostas. |
| **4. Simetria Bilateral (`espelho: "x"`)** | Duplica formas espelhadas em relação a um plano (ex: plano sagital X). | Corta pela metade o tamanho do JSON em veículos e robôs e garante simetria visual perfeita. |
| **5. Extrusão Cruzada (2 Vistas)** | Gera volume pela interseção do perfil lateral e superior. | Permite modelar carenagens orgânicas rascunhando apenas 2 silhuetas 2D simples. |

---

## 2. Especificação Técnica dos Recursos

### 2.1. Conexão por Vetor Direto (`de` / `para`)
```json
{
  "id": "bengala_esq",
  "tipo": "cilindro",
  "diametro": 32,
  "de": [-60, 680, 200],
  "para": [-60, 320, 380],
  "cor": "cinza"
}
```
*Motor internamente calcula:*
$$\vec{v} = \text{para} - \text{de}, \quad L = \|\vec{v}\|, \quad \text{centro} = \frac{\text{de} + \text{para}}{2}$$
E constrói a base ortonormal com vetor diretor $\vec{d} = \vec{v} / L$ sem passar por ângulos de Euler.

### 2.2. Ancoragem Semântica (*Snapping*)
Cada peça resolvida expõe âncoras automáticas no seu Bounding Box e no seu eixo local:
- Âncoras cardinais: `.topo`, `.base`, `.frente`, `.tras`, `.esquerda`, `.direita`, `.centro`.
- Âncoras de eixo (para cilindros/anéis): `.inicio`, `.fim`.

```json
{
  "id": "guidao",
  "tipo": "cilindro",
  "diametro": 22,
  "comprimento": 650,
  "eixo": "x",
  "conectar": "mesa_direcao.topo",
  "cor": "preto"
}
```

### 2.3. Prisma Poligonal Arbitrário (`tipo: "poligono"`)
```json
{
  "id": "tanque_combustivel",
  "tipo": "poligono",
  "perfil": [
    [0, 0], [120, 40], [280, 35], [320, -20], [180, -60], [40, -50]
  ],
  "eixo": "x",
  "comprimento": 220,
  "arredondar": 8,
  "cor": "vermelho"
}
```

### 2.4. Espelhamento Automático (`espelho: "x" | "y" | "z"`)
```json
{
  "id": "amortecedor",
  "tipo": "cilindro",
  "diametro": 25,
  "de": [-80, 200, 100],
  "para": [-80, 450, 20],
  "espelho": "x"
}
```
*O motor instancia automaticamente o irmão `amortecedor_espelho` com a coordenada X invertida.*

---

## 3. Tarefas de Implementação

### Tarefa 1: Suporte a Vetor Direto (`de` / `para`)
- **Arquivo:** [`modulos/esboco/src/index.js`](file:///C:/Users/tiago.marcondes.adm/Desktop/criar%203D_IA/modulos/esboco/src/index.js)
- **Teste:** [`modulos/esboco/tests/esboco.test.js`](file:///C:/Users/tiago.marcondes.adm/Desktop/criar%203D_IA/modulos/esboco/tests/esboco.test.js)
- **Implementação:**
  1. Detectar se `f.de` e `f.para` estão presentes em cilindro/caixa.
  2. Calcular comprimento, centro e matriz de rotação que alinha o eixo local ao vetor $(\text{para} - \text{de})$.
  3. Validar se o comprimento é $> 0$.

### Tarefa 2: Âncoras Semânticas de Montagem (`conectar`)
- **Arquivo:** [`modulos/esboco/src/index.js`](file:///C:/Users/tiago.marcondes.adm/Desktop/criar%203D_IA/modulos/esboco/src/index.js)
- **Implementação:**
  1. No resolver de formas, após calcular o Bounding Box 3D orientado de cada forma, registrar dicionário de âncoras (`ancoras.set(id, { topo, base, ... })`).
  2. Ao resolver uma forma que declare `"conectar": "alvo.ancora"`, posicionar a âncora oposta da peça filha diretamente sobre a âncora declarada.

### Tarefa 3: Primitiva `poligono` com Extrusão Livre
- **Arquivo:** [`modulos/esboco/src/index.js`](file:///C:/Users/tiago.marcondes.adm/Desktop/criar%203D_IA/modulos/esboco/src/index.js)
- **Implementação:**
  1. Adicionar caso `tipo === 'poligono'` na função `prisma()`.
  2. Validar que o perfil possui pelo menos 3 pontos não-colineares e calcular a normal.
  3. Se `f.arredondar` for especificado, arredondar os cantos com arco tangente nos vértices convexos.
  4. Suportar extrusão nos eixos `x`, `y` ou `z`.

### Tarefa 4: Espelhamento Automático (`espelho`)
- **Arquivo:** [`modulos/esboco/src/index.js`](file:///C:/Users/tiago.marcondes.adm/Desktop/criar%203D_IA/modulos/esboco/src/index.js)
- **Implementação:**
  1. Pré-processar a lista `formas` da opção.
  2. Para cada forma com `espelho: "x"`, clonar a geometria invertendo coordenadas `x`, eixos e invertendo a ordem dos vértices das tampas para preservar normais externas.

### Tarefa 5: Fixture de Validação — Moto Conceitual
- **Arquivo:** `modulos/esboco/tests/fixtures/moto-conceito.esboco.json`
- **Validação:**
  - Gerar SVG e PNG via `npm run esboco -- modulos/esboco/tests/fixtures/moto-conceito.esboco.json`.
  - Validar visualmente: rodas com pneus, garfo inclinado via `de`/`para`, guidão conectado via `mesa.topo`, chassi treliçado, motor e tanque poligonal.

---

## 4. Critérios de Aceite e Verificação
1. `npm test` passa sem quebras regressivas nas fixtures existentes (`mancal-eixo`, `teste-cubo`, `casa`).
2. O arquivo da moto deve ser descrito de forma limpa, com menos de 150 linhas de JSON legível.
3. Zero erros de sobreposição de silhuetas ou cantos rasgados.
