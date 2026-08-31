---
name: modelar-maquina
description: Conceber, planejar e modelar uma máquina ou equipamento 3D procedural da Mecanifica a partir de briefing ou conceito visual, decompondo em módulos estruturais, cinemáticos e ferramentais, provando na bancada e exportando STEP apenas sob demanda explícita.
---

# Modelar Máquina / Equipamento Mecânico

Use esta skill quando a tarefa for conceber, planejar ou modelar um equipamento mecânico completo (ex: prensa, esteira, torno, braço robótico, calandra, serra industrial).

Antes de gerar a primeira forma, leia
[`GOTCHAS-AUTORIA-VISUAL.md`](../../../docs/mecanifica/usar/GOTCHAS-AUTORIA-VISUAL.md):
o registro do que já falhou na oficina. Os dois que mais pegam máquina são
tratar blockout de caixas e cilindros como modelo acabado, e confundir relação
semântica (`pai`) com apoio físico — nome certo, peça flutuando.

---

## Fluxo de Trabalho (Pipeline)

```text
1. Conceito Visual (generate_image) -> Fixar em referencias/
2. Plano de Decomposição Modular (Estrutura, Cinemático, Ferramental)
3. Autoria Procedural em PASSOS (Nomes semânticos por parte)
4. Provas de Bancada e Validação de Montagem (Sem órfãos, alinhamento)
5. Gates do Repositório (mapa, typecheck, testes)
6. Exportação CAD/STEP (SOMENTE se solicitado explicitamente pelo usuário)
```

---

## 1. Concepção Visual e Fixação de Referência

Ao receber um pedido de criação de máquina (ex: *"Gere uma prensa modelo X"*):

1. **Gerar Render Conceitual:** Utilize a ferramenta `generate_image` para criar a imagem de referência ortográfica/isométrica da máquina com proporções mecânicas realistas.
2. **Criar Diretório da Máquina:**
   Crie a pasta correspondente em `prototipos/procedural/v3/maquinas/<nome-da-maquina>/`.
3. **Fixar Imagem de Referência:**
   Crie a subpasta `referencias/` dentro da pasta da máquina e copie o artefato de imagem gerado para:
   `prototipos/procedural/v3/maquinas/<nome-da-maquina>/referencias/<nome-da-maquina>_conceito.png`.
4. **Extrair Landmarks e Dimensões Principais:**
   Defina o envelope dimensional base (comprimento, largura, altura, curso de trabalho, vão livre) em metros.

---

## 2. Decomposição Modular e Plano de Modelagem

Nunca crie uma máquina complexa em arquivo único ou monolítico. Divida a máquina nos seguintes arquivos modulares dentro da pasta da máquina:

| Arquivo | Responsabilidade | Exemplos de Corpos |
|---|---|---|
| `estrutura.js` | Chassi estático e sustentação | Mesa inferior, colunas guia, cabeçote superior, pés, tirantes |
| `cinematico.js` | Elementos móveis e transmissão | Volante de inércia, eixo excêntrico, biela, martelo/cursor, polias, motores |
| `ferramentas.js` | Ferramental, atuadores e estampos | Base porta-matriz, punções, matrizes, réguas guia, placas extratoras |
| `montagem.js` | Unificação e poses relativas | Importa as receitas, posiciona com `transladar`/`rotaciona` e exporta a receita consolidada |

Antes de codificar, registre um plano claro listando:
- Lista de partes nomeadas com `parte: 'nomeSemantico'`.
- Poses e pontos de acoplamento entre a estrutura e os mecanismos móveis.
- Provas necessárias (verificação de folgas, curso do mecanismo, ausência de faces órfãs).

---

## 3. Autoria Procedural (`PASSOS`)

Siga o padrão da skill `criar-peca`:

1. **Cabeçalho Obrigatório:** Primeira linha de cada arquivo com comentário descritivo:
   ```js
   /* estrutura.js — estrutura estática da máquina X */
   ```
2. **Contrato de Receita:**
   - `PARAMS`: dimensões parametrizadas em metros (ex: `larg: 2.4` = 2,4 m).
   - `TOPO`: decisões topológicas (ex: `furosMesa: 4`).
   - `PASSOS`: lista de passos declarativos `[['op', { ... }], ...]`.
3. **Identidade Semântica:**
   - Defina sempre o atributo `parte: 'nomeDoCorpo'` em cada primitiva/grupo para que cada componente seja exportado como um sólido individual nomeado.
   - Use `origemId` em primitivas para transformações semânticas (`transladar`, `rotaciona`, `espelha`).
4. **Montagem Unificada:**
   Em `montagem.js`, componha as receitas usando `CHAMADAS_COMPOSICOES` ou composição procedural via `executarReceita`, exportando a receita da máquina completa.

---

## 4. Provas, Ativação na Bancada e Validação de Montagem

1. **Ativação Rápida na Bancada 3D:**
   - **Via Ferramenta MCP (`ativar_bancada`):**
     Invoque `ativar_bancada` com `arquivo: "prototipos/procedural/v3/maquinas/<nome-da-maquina>/montagem.js"`, opcionalmente passando `focar` e `modo: "isolar"`.
   - **Via CLI (`npm run ativar:bancada`):**
     ```powershell
     npm run ativar:bancada -- --arquivo=prototipos/procedural/v3/maquinas/<nome-da-maquina>/montagem.js
     ```
     Para focar e isolar um componente específico:
     ```powershell
     npm run ativar:bancada -- --arquivo=prototipos/procedural/v3/maquinas/<nome-da-maquina>/montagem.js --focar=nomeDaParte --modo=isolar
     ```

2. **Execução Neutra sem Órfãos:**
   Garanta que `conferirSemOrfaos(nome, neutro.orfaos)` passe sem erros (zero faces sem parte ou desconexas).
3. **Inspeção de Vistas:**
   Verifique enquadramento e leitura nas vistas isométrica, frontal, lateral e superior na bancada Three.js.
4. **Validação de Interferência:**
   Confira se partes cinemáticas e ferramentas se encaixam sem colisões impossíveis na estrutura.

---

## 5. Gates do Repositório

Após qualquer alteração ou criação de novos arquivos:

```powershell
npm run mapa
npm run mapa:check
npm run docs:links:check
npm run typecheck
npm run mcp:check
npm test
```

---

## 6. Exportação CAD / STEP (Condicionada ao Pedido Explícito)

> [!IMPORTANT]
> **A exportação CAD/STEP NUNCA deve ser executada automaticamente.**
> Ela só deve ocorrer quando o usuário solicitar explicitamente (ex: *"Exporte para STEP"*, *"Gere o arquivo CAD"* ou *"Pode rodar o exportar"*).

Quando solicitado pelo usuário:

- **Via Ferramenta MCP (`exportar_step`):**
  Invoque `exportar_step` com `arquivo: "prototipos/procedural/v3/maquinas/<nome-da-maquina>/montagem.js"`, `saida: "exportacoes/cad/<nome-da-maquina>.step"`, `unidade: "mm"`, `sobrescrever: true`.
- **Via CLI:**
  ```powershell
  npm run exportar:step -- --arquivo=prototipos/procedural/v3/maquinas/<nome-da-maquina>/montagem.js --sobrescrever
  ```

A CLI/MCP converte automaticamente as medidas de metros para milímetros (escala `1000`) e gera um arquivo `.step` com todos os sólidos identificados na pasta `exportacoes/cad/`.
