# Guia de Autoria e Modelagem Procedural para IA

Este guia orienta a autoria, a validação e a inspeção de peças e montagens procedurais.

## 1. Documentos e skills

Ao receber um pedido de criação ou modificação geométrica, siga a skill `criar-peca` (um objeto de várias partes é construído parte por parte pelo laço de modelagem) e os documentos do roteiro `modelar/peca`, em especial [`AUTORIA-DE-PECA.md`](AUTORIA-DE-PECA.md) e [`GOTCHAS-AUTORIA-VISUAL.md`](GOTCHAS-AUTORIA-VISUAL.md) antes de definir a geometria.


## 2. Anatomia Canônica de uma Receita Procedural

Uma receita de peça reside em `procedural/pecas/<nome-da-peca>/receita.js` e segue a cadeia de [`AUTORIA-DE-PECA.md`](AUTORIA-DE-PECA.md): `TABELA` em milímetros exportada como `PARAMS`, `derivar`, `gerarPassos` e `get PASSOS`. O exemplo mínimo abaixo é executado por `tools/mecanifica/exemplo-canonico.test.mjs` pelo caminho do acervo.

```javascript exemplo-canonico
export const TABELA = { base_largura: 120, base_profundidade: 80, base_espessura: 10, coluna_lado: 30, coluna_altura: 90 };

/* Caixas em milímetro: { nome, x0, x1, y0, y1, z0, z1, material }. */
export function derivar(T) {
  const base = { nome: 'base', material: 'aco', x0: -T.base_largura / 2, x1: T.base_largura / 2, y0: 0, y1: T.base_espessura, z0: -T.base_profundidade / 2, z1: T.base_profundidade / 2 };
  const coluna = { nome: 'coluna', material: 'aco', x0: -T.coluna_lado / 2, x1: T.coluna_lado / 2, y0: base.y1, y1: base.y1 + T.coluna_altura, z0: -T.coluna_lado / 2, z1: T.coluna_lado / 2 };
  return [base, coluna];
}

const m = (mm) => mm / 1000;

/** Os PASSOS, já em metro: um `cubo`, a `parte` e o `material` de cada caixa. */
export function gerarPassos(T) {
  const passos = [];
  derivar(T).forEach((c, i) => {
    const sel = { origem: { op: 'cubo', id: i + 1 } };
    passos.push(['cubo', { origemId: i + 1, larg: m(c.x1 - c.x0), alt: m(c.y1 - c.y0), prof: m(c.z1 - c.z0), em: [m((c.x0 + c.x1) / 2), m(c.y0), m((c.z0 + c.z1) / 2)] }]);
    passos.push(['parte', { nome: c.nome, sel }], ['material', { sel, usa: c.material }]);
  });
  return passos;
}

export const CONTATOS = [
  { par: ['base', 'coluna'], motivo: 'a face de cima da base, em y 10, recebe a face de baixo da coluna' },
];

const receita = {
  meta: { nome: 'coluna-sobre-base', desc: 'coluna quadrada de aço sobre uma base retangular, duas caixas retas' },
  PARAMS: TABELA,
  MATERIAIS: { aco: { cor: '#6b737b', metalicidade: 0.8, aspereza: 0.4 } },
  TOPO: { origem: 'centro da face de baixo da base; y para cima e a frente da base em +z' },
  PLANO: {
    objeto: 'coluna quadrada de 30 mm de lado e 90 mm de altura sobre uma base de 120 por 80 por 10 mm',
    referencias: ['referencias/alvo.md'],
    escala: { medida: 'altura total da peça', milimetros: 100 },
    partes: [
      { nome: 'base', forma: 'caixa de 120 por 10 por 80 mm no chão, centrada em x e z', tecnica: 'cubo no chão, de y 0 a 10' },
      { nome: 'coluna', forma: 'caixa de 30 por 90 por 30 mm centrada sobre a base', tecnica: 'cubo sobre a base, de y 10 a 100' },
    ],
    criteriosDeReprovacao: ['a coluna não assenta na face de cima da base, em y 10', 'a coluna sai do centro da base'],
  },
  contatos: CONTATOS,
  get PONTOS() {
    const T = this.PARAMS;
    return [
      { nome: 'junta da coluna na base', entre: ['base', 'coluna'], em: [0, T.base_espessura, 0], toleranciaMm: 0.5 },
      { nome: 'topo da coluna', parte: 'coluna', medida: 'maximo', em: [T.coluna_lado / 2, T.base_espessura + T.coluna_altura, T.coluna_lado / 2], toleranciaMm: 0.5 },
    ];
  },
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
```


## 3. Regras críticas de seleção e sintaxe

Moram, medidas e travadas por teste, em
[`operacoes-procedurais.md`](../../../.claude/skills/criar-peca/references/operacoes-procedurais.md),
e não são repetidas aqui: a cópia que existia nesta seção ensinava `ALIASES`
como objeto, e o núcleo exige lista de pares. As três que mais pegam:

- `{op:'cilindro', id}` seleciona **só as laterais**; as tampas pedem citação
  própria (`tampa:'fundo'`, `tampa:'topo'`);
- `ALIASES` é uma lista de pares `[nome, definição]`, cada termo uma origem ou
  um `unir` de origens, e **não encadeia**;
- toda face precisa de `parte` semântica, e identidade nunca é índice nem UUID.

## 4. Esteira Canônica de Validação Local

A esteira aceita nomes curtos, sem caminho nem `.js`. Execute nesta sequência:

```bash
npm run descrever -- <nome-da-peca>
npm run conferir:juntas -- <nome-da-peca>
npm run ativar:bancada -- <nome-da-peca>
npm run bancada -- <nome-da-peca> --vistas=isometrica,frontal,direita,superior --cores
npm run exportar:step -- <nome-da-peca> --somente-validar
```

1. `descrever` passa com código de saída 0, zero referências órfãs, zero faces sem identidade, nenhum contato fora do que a receita declarou em `contatos`, nenhum grupo de partes solto fora do que ela declarou em `ilhas` (`{ contem, motivo }`) e nenhuma parte com forma diferente da prometida. A receita que compõe por `CHAMADAS_COMPOSICOES` precisa do registro (`--composicoes=<módulo>`, o mesmo argumento de `npm run varrer`); sem ele o comando recusa dizendo o que falta.
2. `conferir:juntas` mantém folgas e penetrações dentro da especificação.
3. `ativar:bancada` grava `public/sessao-ativa.json` sem recusa do motor.
4. `bancada` grava os PNG em `tools/bancadas/out/` sem erro de enquadramento.
5. `exportar:step --somente-validar` só valida a malha. O STEP físico (o mesmo comando, sem a bandeira) só se gera a pedido explícito do usuário.
