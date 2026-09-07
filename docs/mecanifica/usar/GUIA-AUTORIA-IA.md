# Guia de Autoria e Modelagem Procedural para IA

Este guia orienta o agente de inteligência artificial a conceber, estruturar, modelar, validar e inspecionar peças e montagens procedurais no Mecanifica de forma autônoma, consistente e sem desvios.

## 1. Documentos e Skills Governança

Ao receber um pedido de criação ou modificação geométrica:
1. **Skill de Autoria**: Consulte a skill `criar-peca` (ou `modelar-maquina` para equipamentos complexos).
2. **Contrato Conceitual**: Leia [`AUTORIA-DE-PECA.md`](AUTORIA-DE-PECA.md) e [`AUTORIA-RECEITA-DECLARATIVA.md`](AUTORIA-RECEITA-DECLARATIVA.md).
3. **Armadilhas Visuais**: Consulte [`GOTCHAS-AUTORIA-VISUAL.md`](GOTCHAS-AUTORIA-VISUAL.md) antes de definir a geometria.

---

## 2. Anatomia Canônica de uma Receita Procedural

Uma receita de peça reside em `prototipos/procedural/v3/pecas/<nome-da-peca>.js` (ou `prototipos/procedural/v3/maquinas/<nome-maquina>/montagem.js`) e deve exportar um objeto com:

```javascript
export const receita = {
  meta: {
    nome: 'Nome Semântico da Peça',
    versao: '1.0.0',
    descricao: 'Descrição técnica concisa da função mecânica.',
  },
  MATERIAIS: {
    aco: { cor: '#3a3f44', metalicidade: 0.85, aspereza: 0.25 },
    bronze: { cor: '#b87333', metalicidade: 0.70, aspereza: 0.35 },
  },
  PARAMS: {
    // Parâmetros dimensionais configuráveis com padrões seguros
  },
  PASSOS: [
    // Sequência determinística de operações procedurais
  ],
};
```

---

## 3. Regras críticas de seleção e sintaxe

Estas moram, medidas e travadas por teste, em
[`operacoes-procedurais.md`](../../../.claude/skills/criar-peca/references/operacoes-procedurais.md),
a referência da skill `criar-peca`. Não são repetidas aqui, e a razão não é
economia de espaço: a versão que existia nesta seção ensinava `ALIASES` como
OBJETO (`ALIASES: { nome: {...} }`), e o núcleo exige LISTA DE PARES —
`if (!Array.isArray(ALIASES)) throw new Error('oficina: ALIASES precisa ser uma
lista')`. Quem seguisse este guia batia no grito do motor antes da primeira
malha.

Duas verdades sobre a mesma coisa em dois documentos é pior que uma verdade
longe: quem lê a errada não tem como saber que era a errada. As três que mais
pegam, para você saber o que procurar lá:

- `{op:'cilindro', id}` seleciona **só as laterais**; as tampas pedem citação
  própria (`tampa:'fundo'`, `tampa:'topo'`);
- `ALIASES` é uma lista de pares `[nome, definição]`, cada termo uma origem ou
  um `unir` de origens, e **não encadeia**;
- toda face precisa de `parte` semântica, e identidade nunca é índice nem UUID.


## 4. Esteira Canônica de Validação Local

A esteira suporta **argumentos posicionais e nomes curtos** (sem a necessidade de digitar o caminho completo ou a extensão `.js`).

Execute as validações nesta sequência:

### Passo 1: Inspeção de Contrato e Ausência de Órfãos
```bash
npm run descrever -- <nome-da-peca> --estrito
```
*Critério:* Código de saída 0, zero referências órfãs e zero faces sem identidade.

### Passo 2: Verificação de Encaixes e Juntas
```bash
npm run conferir:juntas -- <nome-da-peca>
```
*Critério:* Folgas e penetrações controladas conforme a especificação do projeto.

### Passo 3: Ativação na Bancada 3D
```bash
npm run ativar:bancada -- <nome-da-peca>
```
*Critério:* Sessão gravada em `public/sessao-ativa.json` sem recusa do motor procedural.

### Passo 4: Captura e Validação de Vistas (Playwright Headless)
```bash
node tools/mecanifica/olhar-bancada.mjs --peca=<nome-da-peca> --vistas=isometrica,frontal,superior
```
*Critério:* Renderização das imagens PNG na pasta `tools/bancadas/out/` sem erros de enquadramento ou corte.

### Passo 5: Validação ou Exportação de Geometria CAD (STEP)
Apenas valide a malha durante o ciclo padrão de modelagem:
```bash
npm run exportar:step -- <nome-da-peca> --somente-validar
```
*Atenção:* Só gere o arquivo STEP físico quando solicitado explicitamente pelo usuário:
```bash
npm run exportar:step -- <nome-da-peca>
```
