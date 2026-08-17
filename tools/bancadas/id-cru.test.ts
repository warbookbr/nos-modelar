/* id-cru.test.ts — prova do gate do O-4: que ele ACHA id cru em peça nova, que
   a lista de exceções é uma dívida CONGELADA (não um teto para crescer) e que
   valor inesperado no arquivo salvo GRITA em vez de passar.

   A revisão adversarial da R2 achou quatro buracos que os testes antigos não
   pegavam, e cada um ganhou prova aqui:
   · o gate era CEGO a três formas de coleção que afirmava cobrir
     (`pesar {vs}`, `pincel livre {pontos}`, `mescla {de}`);
   · contava PASSO e prometia contar ID no cabeçalho;
   · o arquivo gravado se AUTOINVALIDAVA com nome de peça que parece inteiro;
   · a mensagem de reprova mentia sobre o caminho de conserto. */
import { mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error — gate em .mjs sem tipos.
import { contarIdCru, validarLista, conferir, medirPecas, lerLista, gravarLista, indexar, totalDe, FORMAS, FORMATO } from './id-cru.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(AQUI, '../..');
const NUCLEO = join(REPO, 'prototipos/fps/v3/motor/oficina.js');
const TMP = join(REPO, 'node_modules/.tmp-id-cru');
mkdirSync(TMP, { recursive: true });

const zero = { faces: 0, selV: 0, selF: 0, vs: 0, pontos: 0, mesclaDe: 0 };
const uso = (p: Partial<typeof zero>) => ({ ...zero, ...p });

describe('contarIdCru — cobre TODAS as formas de coleção do núcleo', () => {
  it('conta as três formas históricas', () => {
    expect(contarIdCru([
      ['pincel', { modo: 'face', faces: [1, 2, 3], cor: '#fff' }],
      ['solido', { sel: { v: [4] } }],
      ['liso', { sel: { f: [5, 6] } }],
      ['transladar', { sel: { v: [7], f: [8] } }],
    ])).toEqual(uso({ faces: 3, selV: 2, selF: 3 }));
  });

  /* O buraco do MEDIA-5: as três formas que o gate afirmava não existir. O
     núcleo lê `a.vs` (pesar), `a.pontos[].f` (pincel modo livre) e `a.de`
     (mescla) como listas de id — e o baseline já provava: `_oficina-esqueleto`
     tem 6 `pesar` com 24 ids de vértice que a lista registrava como selV: 0. */
  it('conta vs:[ids] do pesar — o núcleo lê a.vs como lista de id de VÉRTICE', () => {
    expect(contarIdCru([['pesar', { osso: 'b0', vs: [0, 1, 2, 3, 4, 5, 6, 7], peso: 1 }]]))
      .toEqual(uso({ vs: 8 }));
  });

  it("conta pontos:[{f}] do pincel modo 'livre' — cada dab ancora numa FACE por id", () => {
    expect(contarIdCru([['pincel', { modo: 'livre', pontos: [{ f: 0, a: 0.5, b: 0.5 }, { f: 1, a: 0.2, b: 0.9 }] }]]))
      .toEqual(uso({ pontos: 2 }));
  });

  it('conta de:[ids] do mescla — `de` é COLEÇÃO, não a forma singular que a declaração antiga alegava', () => {
    expect(contarIdCru([['mescla', { de: [1, 2, 3], para: 0 }]])).toEqual(uso({ mesclaDe: 3 }));
  });

  /* O-12: `de` passou a ter DOIS contratos. `mescla` lê `de:[ids]` (coleção de
     vértice); `publicarPorta` lê `de:{op,id,...}` (origem estrutural, irmã de
     `sel:{origem}`). Contar a segunda reprovava a capacidade que a R4 shipou —
     achado na primeira peça a usar `publicarPorta`, `_jardineira`, acusada de 5
     ids posicionais que não existem. O discriminador é a FORMA, e o gate segue
     op-agnóstico: nem o nome `publicarPorta` nem o nome `mescla` aparecem aqui. */
  it('de:{op,id} do publicarPorta é ORIGEM ESTRUTURAL, não id cru', () => {
    expect(contarIdCru([
      ['publicarPorta', { nome: 'peDoCaule', de: { op: 'cilindro', id: 404, tampa: 'fundo' } }],
      ['publicarPorta', { nome: 'coloDoBulbo', de: { op: 'esfera', id: 401, faixa: 0 } }],
      ['publicarPorta', { nome: 'soleira', de: { op: 'chamferBox', id: 400 } }],
    ])).toEqual(zero);
    // e a citação da porta também não é id posicional
    expect(contarIdCru([['material', { sel: { porta: 'peDoCaule' }, usa: 'x' }]])).toEqual(zero);
    // a forma do mescla continua contando, inclusive misturada na mesma lista
    expect(contarIdCru([
      ['publicarPorta', { nome: 'p', de: { op: 'cubo', id: 7 } }],
      ['mescla', { de: [1, 2], para: 0 }],
    ])).toEqual(uso({ mesclaDe: 2 }));
    // objeto SEM o contrato {op,id} não vira isenção: continua id cru malformado
    expect(contarIdCru([['x', { de: { op: 'cubo' } }]])).toEqual(uso({ mesclaDe: 1 }));
    expect(contarIdCru([['x', { de: { id: 7 } }]])).toEqual(uso({ mesclaDe: 1 }));
  });

  it('a peça de reprodução do MEDIA-5 inteira mede 13, não 0', () => {
    const u = contarIdCru([
      ['cubo', { lado: 1 }],
      ['pesar', { osso: 'b0', vs: [0, 1, 2, 3, 4, 5, 6, 7], peso: 1 }],
      ['pincel', { modo: 'livre', pontos: [{ f: 0 }, { f: 1 }] }],
      ['mescla', { de: [1, 2, 3], para: 0 }],
    ]);
    expect(totalDe(u)).toBe(13);
  });

  /* O `encostar` trouxe uma SEGUNDA chave de seleção. Contar só `sel` deixaria
     a metade parada do contato invisível ao gate — a cegueira do MEDIA-5
     reaberta por uma porta nova. */
  it('conta id cru na referencia do encostar, não só no sel', () => {
    expect(contarIdCru([['encostar', { sel: { f: [1, 2] }, referencia: { f: [3, 4, 5] }, direcao: [0, -1, 0] }]]))
      .toEqual(uso({ selF: 5 }));
    expect(contarIdCru([['encostar', { sel: { origem: { op: 'cubo', id: 1 } }, referencia: { v: [7, 8] }, direcao: [0, -1, 0] }]]))
      .toEqual(uso({ selV: 2 }));
  });

  it('referencia por caminho semântico não conta', () => {
    expect(contarIdCru([['encostar', {
      sel: { alias: 'pastilhaInteira' }, referencia: { origem: { op: 'cubo', id: 1 } }, direcao: [0, -1, 0],
    }]])).toEqual(zero);
  });

  it('não conta caminho semântico — é isto que a peça nova deve usar', () => {
    expect(contarIdCru([
      ['pincel', { modo: 'face', sel: { grupo: 'disco' } }],
      ['solido', { sel: { alias: 'discoInteiro' } }],
      ['liso', { sel: { origem: { op: 'cilindro', id: 3, tampa: 'topo' } } }],
      ['parte', { nome: 'x', sel: { regiao: { min: [0, 0, 0], max: [1, 1, 1] } } }],
      ['espelha', { eixo: 'x', sel: { tudo: true } }],
    ])).toEqual(zero);
  });

  it('id cru MALFORMADO continua sendo id cru — o gate não é mais permissivo que o núcleo', () => {
    expect(contarIdCru([['pincel', { faces: 'nada' }], ['solido', { sel: { f: null } }], ['pesar', { vs: 7 }], ['mescla', { de: {} }]]))
      .toEqual(uso({ faces: 1, selF: 1, vs: 1, mesclaDe: 1 }));
  });

  it('chave presente com lista VAZIA conta 1 — usar a forma legada é usar a forma legada', () => {
    expect(contarIdCru([['solido', { faces: [] }]])).toEqual(uso({ faces: 1 }));
  });

  it('as formas SINGULARES estão declaradamente fora de escopo (vira não tem caminho semântico)', () => {
    expect(contarIdCru([
      ['vira', { face: 0 }], ['moveF', { face: 1, d: [0, 1, 0] }], ['extruda', { face: 2, dist: 1 }],
      ['apagaFace', { face: 3 }], ['moveV', { v: 2, d: [0, 1, 0] }], ['moveA', { a: 1, b: 2 }],
      ['mescla', { para: 0 }],
    ])).toEqual(zero);
  });
});

/* MEDIA-6: o cabeçalho promete "a contagem é EXATA nos dois sentidos", e contar
   PASSO não cumpre isso — 2 faces e 200 faces no mesmo passo davam o mesmo
   número, então a `moto` podia decuplicar a dívida sem sair dos 37 passos. */
describe('contarIdCru conta ID, não PASSO', () => {
  it('mais ids no MESMO passo muda o número', () => {
    const dois = contarIdCru([['pincel', { modo: 'face', faces: [0, 1] }]]);
    const vinte = contarIdCru([['pincel', { modo: 'face', faces: [...Array(20).keys()] }]]);
    expect(dois.faces).toBe(2);
    expect(vinte.faces).toBe(20);
    expect(vinte.faces).not.toBe(dois.faces);
  });

  it('dívida que cresce DENTRO dos mesmos passos reprova', () => {
    const antes = contarIdCru([['solido', { faces: [0, 1] }]]);
    const depois = contarIdCru([['solido', { faces: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] }]]);
    expect(conferir({ moto: antes }, { moto: antes })).toEqual([]);
    expect(conferir({ moto: depois }, { moto: antes })[0]).toMatch(/NÃO cresce/);
  });

  it('cada forma cresce por id, não por passo', () => {
    const u = contarIdCru([
      ['solido', { faces: [0, 1, 2] }],
      ['transladar', { sel: { v: [0, 1] } }],
      ['liso', { sel: { f: [3, 4, 5, 6] } }],
      ['pesar', { vs: [7, 8] }],
      ['pincel', { modo: 'livre', pontos: [{ f: 9 }] }],
      ['mescla', { de: [10, 11, 12, 13, 14], para: 0 }],
    ]);
    expect(u).toEqual(uso({ faces: 3, selV: 2, selF: 4, vs: 2, pontos: 1, mesclaDe: 5 }));
  });
});

/* A cegueira do MEDIA-5 nasceu de uma afirmação sobre o núcleo que ninguém
   conferia. Esta trava conserta a CAUSA: se uma op passar a ler id de uma
   chave nova, o teste quebra e obriga a classificar a chave. */
describe('inventário do núcleo — nenhuma chave de argumento fica sem classificação', () => {
  const fonte = readFileSync(NUCLEO, 'utf8');
  const semComentario = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');

  const COLECAO_DE_ID = ['faces', 'vs', 'pontos', 'de'];      // cobertas pelo gate
  const SINGULAR_DE_ID = ['face', 'v', 'a', 'b', 'para'];      // fora de escopo, DECLARADO no cabeçalho
  const NAO_E_ID = [
    'alt', 'altura', 'amplitude', 'aneis', 'aresta', 'ate', 'centro', 'centros', 'chanfro', 'contornoLado', 'contornoTopo', 'cor', 'd',
    'derivaDe', 'direcao', 'dist', 'divisoes', 'dureza', 'eixo', 'folga', 'frequencia', 'graus', 'id', 'lado', 'lados', 'larg',
    'largura', 'modo', 'nome', 'nomes', 'orientacao', 'origemId', 'osso', 'pai', 'paineis', 'perfil', 'peso', 'pivo', 'pos', 'prof',
    'referencia',
    'profundidade', 'raio', 'rotulo', 'saida', 'secoes', 'seg', 'segmentosCurva', 'semente', 'substituir', 'total', 'usa', 'volta', 'interface',
  ];
  /* `aresta` (ops `filete` e `arredondarAresta`) é o ÍNDICE LOCAL da aresta dentro do polígono de
     `de` — uma posição 0..cantos-1, a mesma classe de referência que `lado`
     (cilindro) já é; nunca aponta pra um id de vértice ou de face.
     `paineis` é TOPO do arredondamento: conta a discretização do arco, nunca
     um id de face (cada face criada recebe a identidade `painel:k`).
     `direcao` e `folga` (op `encostar`) são DIMENSIONAIS: um vetor de direção e
     uma distância em metros. `referencia` é o outro lado do contato, e carrega
     uma SELEÇÃO (`{origem}`, `{alias}`, `{grupo}`…) — a mesma forma do `sel`,
     resolvida pelo mesmo `resolverAlvosV`, que já recusa id cru fora das formas
     legadas. Nenhuma das três alcança id de face ou de vértice por caminho novo.
     `nomes` (op `arranja`) é a lista de ENDEREÇOS SEMÂNTICOS das cópias, a
     mesma classe do `nome` da op `parte` e do `grupo` do `furo`: string
     declarada pelo autor, conferida contra duplicata, nunca id de face ou de
     vértice. Ela existe justamente para que citar uma cópia deixe de exigir
     índice — o oposto de carregar id.
     `ate` (op `furo`) é o SEGUNDO centro de um rasgo e entra aqui pela mesma
     razão do `centro`: ponto do mundo, dimensional, projetado no plano da
     entrada; nunca id de face ou de vértice.
     `centros` (op `furo`, vários furos num passo) entra aqui pela mesma razão
     do `centro`: os dois carregam PONTO DO MUNDO, dimensional, nunca id. A
     forma de lista é `[[x,y,z], …]` e a de círculo é `{pivo, distancia, total,
     volta|graus}`; nenhuma delas tem caminho para um id de face ou de vértice.
     `saida` (op `furo`) entra aqui, e não em COLECAO_DE_ID, pela MESMA razão do
     `derivaDe`: ela é uma ORIGEM ESTRUTURAL (`{op,id,…}`), não uma lista de ids.
     O `furo` recusa qualquer outra forma — `faceUnicaEstrutural` passa por
     `validarOrigem` antes de olhar para a malha —, então não existe caminho em
     que essa chave carregue id cru. Se um dia ela aceitar `{f:[…]}`, este teste
     não pega; o que pega é a linha acima deixar de descrever a chave, e por
     isso a razão fica escrita aqui, junto da classificação. */
  const CONTAINER = ['sel'];

  it('as chaves lidas pelas OPS são exatamente as classificadas', () => {
    const ini = fonte.indexOf('export const OPS = {');
    const fim = fonte.indexOf('\n};', ini);
    expect(ini).toBeGreaterThan(0);
    expect(fim).toBeGreaterThan(ini);
    const lidas = new Set<string>();
    for (const m of semComentario(fonte.slice(ini, fim)).matchAll(/\ba\.([A-Za-z_][A-Za-z0-9_]*)/g)) lidas.add(m[1]);
    const classificadas = [...COLECAO_DE_ID, ...SINGULAR_DE_ID, ...NAO_E_ID, ...CONTAINER].sort();
    expect([...lidas].sort()).toEqual(classificadas);
  });

  it('os seletores de `sel` que carregam id são exatamente v e f', () => {
    const ini = fonte.indexOf('function resolverSelecao(');
    const fim = fonte.indexOf('\n}\n', ini);
    expect(ini).toBeGreaterThan(0);
    const lidas = new Set<string>();
    for (const m of semComentario(fonte.slice(ini, fim)).matchAll(/\bsel\.([A-Za-z_][A-Za-z0-9_]*)/g)) lidas.add(m[1]);
    expect([...lidas].sort()).toEqual(['alias', 'f', 'grupo', 'origem', 'porta', 'regiao', 'tudo', 'v']);
  });

  it('toda COLEÇÃO de id do núcleo tem uma forma no gate — nenhuma passa em branco', () => {
    expect(contarIdCru([['x', { faces: [0] }]]).faces).toBe(1);
    expect(contarIdCru([['x', { vs: [0] }]]).vs).toBe(1);
    expect(contarIdCru([['x', { pontos: [{ f: 0 }] }]]).pontos).toBe(1);
    expect(contarIdCru([['x', { de: [0] }]]).mesclaDe).toBe(1);
    expect(contarIdCru([['x', { sel: { v: [0] } }]]).selV).toBe(1);
    expect(contarIdCru([['x', { sel: { f: [0] } }]]).selF).toBe(1);
    expect(FORMAS).toEqual(['faces', 'selV', 'selF', 'vs', 'pontos', 'mesclaDe']);
  });

  it('nenhuma forma SINGULAR entra por acidente', () => {
    for (const chave of SINGULAR_DE_ID) expect(totalDe(contarIdCru([['x', { [chave]: 0 }]]))).toBe(0);
  });
});

describe('conferir — dívida herdada é congelada, não permissão', () => {
  it('peça NOVA com id cru reprova', () => {
    const p = conferir({ nova: uso({ faces: 2 }) }, {});
    expect(p).toHaveLength(1);
    expect(p[0]).toMatch(/ID CRU em peça NOVA/);
  });

  it('peça que SAI da lista e continua usando id cru reprova como peça nova', () => {
    const herdadas = { antiga: uso({ faces: 3 }) };
    expect(conferir({ antiga: uso({ faces: 3 }) }, herdadas)).toEqual([]);
    expect(conferir({ antiga: uso({ faces: 3 }) }, {})[0]).toMatch(/ID CRU em peça NOVA/);
  });

  it('dívida herdada que CRESCE reprova', () => {
    const p = conferir({ antiga: uso({ faces: 4 }) }, { antiga: uso({ faces: 3 }) });
    expect(p[0]).toMatch(/NÃO cresce/);
  });

  it('dívida paga sem encolher a lista reprova — lista que mente vira teto', () => {
    expect(conferir({ antiga: uso({ faces: 1 }) }, { antiga: uso({ faces: 3 }) })[0]).toMatch(/dívida paga/);
    expect(conferir({}, { antiga: uso({ faces: 3 }) })[0]).toMatch(/mede 0 id cru/);
  });

  it('crescimento nas formas NOVAS também reprova', () => {
    for (const forma of ['vs', 'pontos', 'mesclaDe'] as const) {
      const p = conferir({ antiga: uso({ faces: 1, [forma]: 2 }) }, { antiga: uso({ faces: 1, [forma]: 1 }) });
      expect(p[0]).toMatch(/NÃO cresce/);
    }
  });
});

/* MEDIA-9: retirar a Oficina humana não afrouxa o gate. A mensagem separa as
   formas convertíveis por `sel` das formas ainda sem caminho semântico no
   núcleo e explica por que a interface antiga não é uma saída. */
describe('a mensagem de reprova diz a VERDADE sobre o conserto', () => {
  const daPeca = () => conferir({ minha: uso({ faces: 5 }) }, {})[0];

  it('peça nova com id posicional continua reprovando — o gate não afrouxa', () => {
    expect(daPeca()).toMatch(/ID CRU em peça NOVA/);
  });

  it('a mensagem deixa claro que a Oficina humana foi retirada', () => {
    const m = daPeca();
    expect(m).toMatch(/Oficina humana.*foi retirada/);
    expect(m).toMatch(/A-15/);
  });

  it('a mensagem dá as duas saídas reais conforme a forma encontrada', () => {
    expect(daPeca()).toMatch(/escrita à mão: troque por sel:/);
    expect(conferir({ minha: uso({ vs: 2 }) }, {})[0]).toMatch(/entra na lista herdada de propósito/);
  });

  it('não manda usar sel:{...} para forma que não tem caminho semântico no núcleo', () => {
    const so = conferir({ minha: uso({ vs: 4 }) }, {})[0];
    expect(so).toMatch(/NÃO tem caminho semântico/);
    expect(so).not.toMatch(/troque por sel:/);
  });

  it('para as formas com caminho semântico o conselho continua sendo sel:{...}', () => {
    expect(conferir({ minha: uso({ faces: 2 }) }, {})[0]).toMatch(/troque por sel:\{alias\|grupo\|origem\|regiao\}/);
  });
});

describe('validarLista — valor inesperado GRITA', () => {
  const base = () => ({ formato: FORMATO, herdadas: [{ peca: 'a', ...uso({ faces: 1 }) }] });
  it('aceita a lista bem formada', () => expect(validarLista(base())).toEqual([]));
  it('recusa formato desconhecido', () => {
    const d = base(); (d as any).formato = 1;
    expect(validarLista(d)[0]).toMatch(/formato 1 desconhecido/);
  });
  it('recusa chave de topo extra', () => {
    const d = base(); (d as any).extra = true;
    expect(validarLista(d)[0]).toMatch(/chaves de topo inesperadas/);
  });
  it('recusa herdadas que não é lista — objeto não carrega ordem', () => {
    expect(validarLista({ formato: FORMATO, herdadas: { a: uso({ faces: 1 }) } })[0]).toMatch(/precisa ser uma LISTA/);
  });
  it('recusa contagem que não é inteiro não-negativo', () => {
    const d = base(); (d as any).herdadas[0].faces = -1;
    expect(validarLista(d)[0]).toMatch(/não é inteiro não-negativo/);
    const e = base(); (e as any).herdadas[0].faces = 1.5;
    expect(validarLista(e)[0]).toMatch(/não é inteiro não-negativo/);
  });
  it('recusa chave de contagem faltando ou sobrando', () => {
    const d = base(); delete (d as any).herdadas[0].selF;
    expect(validarLista(d)[0]).toMatch(/precisa ter exatamente/);
    const e = base(); (e as any).herdadas[0].selX = 0;
    expect(validarLista(e)[0]).toMatch(/precisa ter exatamente/);
  });
  it('recusa entrada sem nome de peça', () => {
    const d = base(); delete (d as any).herdadas[0].peca;
    expect(validarLista(d)[0]).toMatch(/precisa ser um nome não-vazio/);
  });
  it('recusa entrada zerada — peça sem dívida não é dívida herdada', () => {
    const d = base(); (d as any).herdadas[0].faces = 0;
    expect(validarLista(d)[0]).toMatch(/entrada zerada/);
  });
  it('recusa lista fora de ordem — o arquivo salvo é determinístico', () => {
    const d = { formato: FORMATO, herdadas: [{ peca: 'b', ...uso({ faces: 1 }) }, { peca: 'a', ...uso({ faces: 1 }) }] };
    expect(validarLista(d)[0]).toMatch(/fora de ordem/);
  });
  it('recusa peça duplicada — a segunda entrada venceria em silêncio', () => {
    const d = { formato: FORMATO, herdadas: [{ peca: 'a', ...uso({ faces: 1 }) }, { peca: 'a', ...uso({ faces: 9 }) }] };
    expect(validarLista(d)[0]).toMatch(/duplicada/);
  });
});

/* BAIXA-11: o formato salvo se autoinvalidava. Nome de peça que parece inteiro
   (`9.js` e `10.js` são nomes de arquivo legais) é reordenado numericamente
   tanto pelo motor JS quanto pelo `JSON.parse`, então `npm run id-cru` gravava
   numa ordem e `npm run id-cru:check` no comando seguinte recusava o arquivo
   que ele mesmo acabara de escrever. */
describe('ida e volta do arquivo salvo — o que grava, relê', () => {
  const nomes = ['10', '9', '2', 'moto', '_corpo', 'zebra'];
  const entrada = Object.fromEntries(nomes.map((n) => [n, uso({ faces: 1 })]));

  it('grava e relê nome que parece inteiro sem se autoinvalidar', () => {
    const alvo = join(TMP, 'ida-e-volta.json');
    gravarLista(entrada, alvo);
    const { erros, dados } = lerLista(alvo);
    // isolado do resto: o sintoma do BAIXA-11 era ESTE erro, sozinho, sobre um
    // arquivo que a ferramenta acabara de escrever.
    expect(erros).not.toContainEqual(expect.stringMatching(/fora de ordem/));
    expect(erros).toEqual([]);
    expect(dados.herdadas.map((e: any) => e.peca)).toEqual(nomes.slice().sort());
  });

  it('a ordem no DISCO é a ordem alfabética, não a numérica do motor', () => {
    const alvo = join(TMP, 'ordem.json');
    gravarLista(entrada, alvo);
    const texto = readFileSync(alvo, 'utf8');
    const naOrdemDoTexto = [...texto.matchAll(/"peca":\s*"([^"]*)"/g)].map((m) => m[1]);
    expect(naOrdemDoTexto).toEqual(nomes.slice().sort());
    expect(naOrdemDoTexto.indexOf('10')).toBeLessThan(naOrdemDoTexto.indexOf('9'));
  });

  it('o que voltou do disco compara igual ao que foi medido', () => {
    const alvo = join(TMP, 'comparar.json');
    gravarLista(entrada, alvo);
    const { dados } = lerLista(alvo);
    expect(conferir(entrada, indexar(dados.herdadas))).toEqual([]);
  });
});

describe('estado real do repositório', () => {
  it('o arquivo commitado é válido e bate com a medição — 0 id cru fora da lista', async () => {
    const { dados, erros, ausente } = lerLista();
    expect(ausente).toBe(false);
    expect(erros).toEqual([]);
    const { usos, falhas } = await medirPecas();
    expect(falhas).toEqual([]);
    expect(conferir(usos, indexar(dados.herdadas))).toEqual([]);
    expect(dados.herdadas).toHaveLength(13);
    expect(Object.values(usos).reduce((s: number, u: any) => s + totalDe(u), 0)).toBe(8244);
  });

  it('as formas que o gate era cego já apareciam no baseline', async () => {
    const { usos } = await medirPecas();
    expect(usos['_oficina-esqueleto'].vs).toBe(24);        // 6 passos `pesar`, 24 ids de vértice
    expect(usos['_espelhado'].mesclaDe).toBe(3);
    expect(usos['_oficina-toco'].mesclaDe).toBe(1);
  });

  it('freio-disco e a peça de exercício do O-14 não têm id cru', async () => {
    const { usos } = await medirPecas();
    expect(usos['freio-disco']).toBeUndefined();
    expect(usos['_vao-e-anteparo']).toBeUndefined();
  });
});
