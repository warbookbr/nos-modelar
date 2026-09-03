# Plano de Modelagem: Prensa Hidráulica H-Frame Industrial

> **Status:** AGUARDANDO APROVAÇÃO DO USUÁRIO — NÃO INICIAR MODELAGEM AINDA.
> **Alvo:** `prototipos/procedural/v3/maquinas/prensa-hidraulica/`
> **Referência:** `prototipos/procedural/v3/maquinas/prensa-hidraulica/referencias/prensa-hidraulica_conceito.png`

---

## 1. Concepção e Extração Dimensional

Com base no conceito visual realista gerado (pórtico H-frame mecânico pesado com unidade de potência lateral e cilindro superior):

### 1.1. Dimensões Principais (em metros)
- **Altura Total ($H$):** 1.85 m
- **Largura da Estrutura ($L$):** 0.72 m (total com unidade lateral: 1.05 m)
- **Profundidade nos Pés ($P$):** 0.60 m
- **Vão Livre de Trabalho (Luz entre Colunas):** 0.52 m
- **Altura Útil do Vão de Prensagem:** 0.85 m
- **Cilindro Hidráulico Superior:** $\varnothing 0.12\text{ m} \times 0.45\text{ m}$ de altura
- **Haste Cromada do Pistão:** $\varnothing 0.06\text{ m} \times 0.28\text{ m}$ de comprimento
- **Mesa Ajustável (Bed Frame):** Vigas duplas transversais $0.68\text{ m} \times 0.14\text{ m} \times 0.08\text{ m}$
- **Placa de Prensagem (Bolster Plate):** $0.32\text{ m} \times 0.32\text{ m} \times 0.04\text{ m}$
- **Unidade Hidráulica Lateral:** Tanque $0.28 \times 0.20 \times 0.22\text{ m}$, motor elétrico $\varnothing 0.14 \times 0.22\text{ m}$

### 1.2. Materiais Padronizados
- `acoEstrutural`: `#2b2f36` (cinza grafite escuro, metalicidade 0.82, aspereza 0.38)
- `acoCromado`: `#d8dce2` (espelhado/haste, metalicidade 0.95, aspereza 0.10)
- `acoUsinado`: `#8c949e` (mesa e bolster plate, metalicidade 0.88, aspereza 0.24)
- `unidadeForca`: `#202328` (tanque e bomba, metalicidade 0.75, aspereza 0.45)
- `bronzeAcessorios`: `#c29b53` (manômetro e registros, metalicidade 0.78, aspereza 0.28)

---

## 2. Decomposição Modular da Máquina

```text
prototipos/procedural/v3/maquinas/prensa-hidraulica/
├── referencias/
│   └── prensa-hidraulica_conceito.png
├── estrutura.js     # Chassi H-frame, colunas gêmeas, travessão superior, pés e pinos
├── cinematico.js    # Cilindro superior, haste móvel cromada, sapata e mesa móvel ajustável
├── ferramentas.js   # Bolster plate, unidade hidráulica, motor, manômetro e tubulações
└── montagem.js      # Agregação e composição dos módulos com tolerâncias e poses
```

---

## 3. Tarefas de Implementação

### Tarefa 1: Modelagem Estrutural (`estrutura.js`)
- **Partes Semânticas:**
  - `pesApoio`: Cantoneiras L inferiores de sustentação no solo com chapas de ancoragem.
  - `colunaEsquerda` e `colunaDireita`: Perfis verticais maciços com matriz de furos passantes para pinos.
  - `travessaoSuperior`: Vigas paralelas superiores de suporte e fixação do cilindro mestre.
  - `pinosSustentacao`: Pinos de aço temperado inseridos nas furações das colunas para travar a mesa.
- **Critério:** 0 faces sem identidade, juntas seladas contra pés e travessão.

### Tarefa 2: Modelagem Cinemática e Cilindro (`cinematico.js`)
- **Partes Semânticas:**
  - `camisaCilindro`: Corpo cilíndrico superior flangeado com tampas (respeitando a armadilha de `cilindro` e tampas `topo`/`fundo`).
  - `hastePistao`: Haste cilíndrica de aço cromado com diâmetro menor concêntrico.
  - `sapataPistao`: Flange de pressão na ponta da haste com chanfro de borda.
  - `mesaAjustavel`: Conjunto de vigas gêmeas que repousa sobre os pinos passantes.
- **Critério:** Alinhamento concêntrico perfeito no eixo vertical Y; 0 faces órfãs.

### Tarefa 3: Unidade Hidráulica e Acessórios (`ferramentas.js`)
- **Partes Semânticas:**
  - `bolsterPlate`: Placa espessa de aço retificado apoiada no centro da mesa de prensagem.
  - `tanqueHidraulico`: Reservatório montado na lateral da coluna direita por cantoneiras.
  - `motorBomba`: Motor cilíndrico aletado no topo do tanque com caixa de ligação elétrica.
  - `manometro`: Caixa cilíndrica de pressão com mostrador analógico no topo do cilindro.
  - `tubulacaoPressao`: Linha rígida de alta pressão interligando a bomba ao cabeçote do cilindro.
- **Critério:** Poses relativas exatas sem sobreposição cega e materiais atribuídos a 100% dos corpos.

### Tarefa 4: Consolidação na Montagem (`montagem.js`) e Inspeção Estrita
- Consolidar parâmetros (`PARAMS`), materiais (`MATERIAIS`), apelidos (`ALIASES`) e passos (`PASSOS`).
- Executar validações com os comandos simplificados:
  ```bash
  npm run descrever -- prensa-hidraulica --estrito
  npm run conferir:juntas -- prensa-hidraulica
  npm run ativar:bancada -- prensa-hidraulica --imagem=public/referencias/prensa-hidraulica.png
  node tools/mecanifica/olhar-bancada.mjs --peca=prensa-hidraulica --vistas=isometrica,frontal,superior,direita
  ```
- Avaliar capturas visuais em `tools/bancadas/out/` e confrontar com a imagem de referência.

### Tarefa 5: Gates de Governança e Qualidade
- `npm run docs:estrutura:check`
- `npm run docs:links:check`
- `npm run mapa` & `npm run mapa:check`
- `npm run typecheck`
- Vitest em `tools/mecanifica/`

---

## 4. Próximo Passo Imediato

Aguardar confirmação explícita do usuário antes de iniciar qualquer código de modelagem nas Tarefas 1 a 5.
