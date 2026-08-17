/* normais-lisas.test.ts — a borda do furo serrilhava na bancada, e a peça não
   tinha culpa: o `freio-disco` já usa 12 lados no furo do prisioneiro e já marca
   a parede como `liso`. A culpa era do ADAPTADOR, em duas causas medidas, e este
   arquivo é a afirmação de cada uma.

   CAUSA 1 — `liso` nunca chegava ao renderizador. Das 540 faces do freio, 172
   estão marcadas `liso`, e ainda assim 100% dos triângulos saíam com normal
   CHAPADA: `computeVertexNormals()` numa geometria NÃO INDEXADA devolve, por
   definição, a normal do triângulo repetida nos três cantos. O adaptador nunca
   leu `face.liso`. Isso é SOMBREADO.

   CAUSA 2 — a borda saía com triângulo virado. O adaptador triangulava todo
   n-gon em LEQUE a partir do canto 0, e leque só vale em polígono convexo. Numa
   placa com um furo de 12 lados, 4 das 12 faces da borda são quads CÔNCAVOS: o
   leque produzia neles um triângulo de área negativa (normal invertida, com
   `DoubleSide` iluminado pelo lado errado) que ainda por cima cobria área FORA
   do polígono e deixava o reflexo descoberto. Isso é GEOMETRIA, não sombreado.

   As afirmações e a mutação que mata cada uma:
   - `liso` suaviza — morre se o adaptador voltar a ignorar a marca;
   - face CHAPADA não entra na soma — morre se a soma varrer todas as faces (a
     tampa do cilindro entortaria a normal da lateral, e a borda do furo borraria
     a quina contra a parede);
   - a borda é triangulada em ORELHAS — morre se a triangulação voltar a ser
     leque, pela normal virada e pela área que passa da área do anel.

   O que este arquivo NÃO afirma, porque não é verdade: que a SILHUETA do furo
   fique redonda. O contorno continua o polígono de `lados` arestas que a malha
   tem, e quem quiser mais volta pede mais `lados`.

   SEGUNDA LEVA — quatro frases que o `adaptar-three.js` escrevia no comentário e
   ninguém media. Cada uma foi conferida por MUTAÇÃO: com a suíte de 710 casos,
   estragar a linha correspondente deixava TUDO VERDE. Estavam prometidas, não
   provadas. Agora cada uma tem uma mutação que a mata:
   - a soma é do estado NEUTRO inteiro — morre se ela passar a ser por lote de
     desenho (parte × material), porque a divisa ganha costura;
   - a soma é pesada pela ÁREA — morre se a normal do triângulo for normalizada
     antes de entrar na conta, porque uma abinha passa a valer o mesmo que um
     barril 350× maior;
   - soma que degenera cai na CHAPADA — morre se o vetor nulo virar normal, e o
     que aparece na tela é um anel preto;
   - a normal chapada é a do TRIÂNGULO, não a do plano da face — morre se o
     plano assumir, porque os dois triângulos de um quad torto viram iguais e o
     relevo some. */
import { describe, it, expect } from 'vitest';
// @ts-expect-error — núcleo legado em JavaScript, exercitado pela API pública.
import { nucleo } from '../../prototipos/procedural/v3/motor/oficina.js';
// @ts-expect-error — adaptador em JavaScript, exercitado em runtime pelo Vitest.
import { adaptarThree } from '../../src/autoria/adaptar-three.js';

const LADOS = 12;

/** normais da malha de uma parte, agrupadas em trios (um trio = um triângulo). */
function trianguloseNormais(neutro: any, parte: string) {
  const { partes } = adaptarThree(neutro, { nome: 'fixture' });
  const grupo = partes.get(parte);
  expect(grupo, `a parte '${parte}' não existe na peça`).toBeTruthy();
  const trios: number[][][] = [];
  for (const malha of grupo.children) {
    const n = malha.geometry.getAttribute('normal');
    expect(n, 'a malha saiu sem atributo normal').toBeTruthy();
    for (let t = 0; t < n.count; t += 3) {
      trios.push([0, 1, 2].map((k) => [n.getX(t + k), n.getY(t + k), n.getZ(t + k)]));
    }
  }
  return trios;
}

const chapado = (tri: number[][]) =>
  [1, 2].every((k) => tri[k].every((c, i) => Math.abs(c - tri[0][i]) < 1e-6));

const unitario = (v: number[]) => Math.hypot(v[0], v[1], v[2]);

/* um cilindro com a LATERAL lisa e as TAMPAS chapadas: o caso mínimo em que as
   duas metades da regra se contradizem se a soma for indiscriminada. */
const TODOS = { passo: 1, fase: 0 };   // "todos os índices desta família"
const CILINDRO = 40;
const cilindro = (comLiso: boolean) => nucleo([
  ['cilindro', { origemId: CILINDRO, raio: 1, altura: 2, lados: LADOS }],
  ['parte', { nome: 'tubo', sel: { origem: { op: 'cilindro', id: CILINDRO } } }],
  /* `{op:'cilindro', id}` sem família é a LATERAL; as tampas se citam por
     `tampa`, e aqui elas precisam de nome para entrar na medição. */
  ['parte', { nome: 'tampas', sel: { origem: { op: 'cilindro', id: CILINDRO, tampa: 'topo' } } }],
  ['parte', { nome: 'tampas', sel: { origem: { op: 'cilindro', id: CILINDRO, tampa: 'fundo' } } }],
  ...(comLiso ? [['liso', { sel: { origem: { op: 'cilindro', id: CILINDRO, lado: TODOS } } }]] : []),
], {}, {});

/* uma placa com UM furo passante de 12 lados: a PAREDE fica lisa, a BORDA (o
   anel coplanar com a face de entrada) fica chapada. É o desenho do assento de
   prisioneiro do freio, reduzido ao osso. */
const CUBO = 10;
const FURO = 20;
const placa = (comLiso: boolean) => nucleo([
  ['cubo', { origemId: CUBO, lado: 2 }],
  /* a identidade vem ANTES do corte: o que o furo criar herda `parte` da face
     de entrada, e depois a parede e a borda ganham nome próprio. */
  ['parte', { nome: 'resto', sel: { origem: { op: 'cubo', id: CUBO } } }],
  ['furo', {
    origemId: FURO,
    de: { op: 'cubo', id: CUBO, face: 'topo' },
    saida: { op: 'cubo', id: CUBO, face: 'fundo' },
    centro: [0, 0, 0],
    raio: 0.5,
    lados: LADOS,
  }],
  ['parte', { nome: 'parede', substituir: true, sel: { origem: { op: 'furo', id: FURO, parede: TODOS } } }],
  ['parte', { nome: 'borda', substituir: true, sel: { origem: { op: 'furo', id: FURO, borda: TODOS } } }],
  ...(comLiso ? [['liso', { sel: { origem: { op: 'furo', id: FURO, parede: TODOS } } }]] : []),
], {}, {});

describe('a marca `liso` chega à normal do renderizador', () => {
  it('sem `liso` nenhum triângulo é suave — o comportamento antigo, byte por byte', () => {
    const neutro = cilindro(false);
    const trios = [...trianguloseNormais(neutro, 'tubo'), ...trianguloseNormais(neutro, 'tampas')];
    expect(trios.length).toBe(2 * LADOS + 2 * (LADOS - 2));
    expect(trios.filter(chapado).length).toBe(trios.length);
  });

  it('com `liso` na lateral, a lateral vira suave e as tampas continuam chapadas', () => {
    const neutro = cilindro(true);
    const trios = [...trianguloseNormais(neutro, 'tubo'), ...trianguloseNormais(neutro, 'tampas')];
    const suaves = trios.filter((t) => !chapado(t));
    /* a lateral do cilindro são LADOS quadriláteros = 2·LADOS triângulos, e
       todos eles têm os três cantos com normais diferentes entre si. */
    expect(suaves.length).toBe(2 * LADOS);
    /* as tampas são dois leques de LADOS−2 triângulos cada, e continuam chapadas
       porque `liso` não as tocou. */
    expect(trios.length - suaves.length).toBe(2 * (LADOS - 2));
  });

  it('a normal suave da lateral é RADIAL: a tampa chapada não entra na soma', () => {
    const trios = trianguloseNormais(cilindro(true), 'tubo');
    const cantosSuaves = trios.filter((t) => !chapado(t)).flat();
    expect(cantosSuaves.length).toBe(3 * 2 * LADOS);
    for (const v of cantosSuaves) {
      /* radial = sem componente no eixo do cilindro (Y). Se a soma varresse
         todas as faces, a tampa (normal ±Y) puxaria isto para longe de zero. */
      expect(Math.abs(v[1])).toBeLessThan(1e-6);
      expect(unitario(v)).toBeCloseTo(1, 6);
    }
  });

  it('as tampas guardam a normal exata ±Y mesmo com a lateral lisa ao lado', () => {
    const chapados = trianguloseNormais(cilindro(true), 'tampas').filter(chapado);
    expect(chapados.length).toBe(2 * (LADOS - 2));
    for (const t of chapados) {
      expect(Math.abs(t[0][0])).toBeLessThan(1e-6);
      expect(Math.abs(t[0][2])).toBeLessThan(1e-6);
      expect(Math.abs(Math.abs(t[0][1]) - 1)).toBeLessThan(1e-6);
    }
  });

  it('a parede do furo suaviza e a borda do furo NÃO — a quina do contorno sobrevive', () => {
    const neutro = placa(true);
    const parede = trianguloseNormais(neutro, 'parede');
    expect(parede.length).toBe(2 * LADOS);
    expect(parede.filter(chapado).length).toBe(0);

    const borda = trianguloseNormais(neutro, 'borda');
    expect(borda.length).toBeGreaterThan(0);
    expect(borda.filter(chapado).length).toBe(borda.length);
    /* a borda é coplanar com a face de entrada (topo, +Y). Se a parede lisa
       vazasse para ela, esta normal deixaria de ser exatamente +Y. */
    for (const t of borda) {
      expect(t[0][0]).toBeCloseTo(0, 9);
      expect(t[0][1]).toBeCloseTo(1, 9);
      expect(t[0][2]).toBeCloseTo(0, 9);
    }
  });

  it('a borda do furo é triangulada em ORELHAS: a área dos triângulos é a área do polígono', () => {
    const neutro = placa(true);
    /* soma das áreas dos triângulos que o adaptador emite para a borda… */
    const { partes } = adaptarThree(neutro, { nome: 'fixture' });
    let areaTriangulos = 0;
    for (const malha of partes.get('borda').children) {
      const p = malha.geometry.getAttribute('position');
      for (let t = 0; t < p.count; t += 3) {
        const c = [0, 1, 2].map((k) => [p.getX(t + k), p.getY(t + k), p.getZ(t + k)]);
        const u = [c[1][0] - c[0][0], c[1][1] - c[0][1], c[1][2] - c[0][2]];
        const v = [c[2][0] - c[0][0], c[2][1] - c[0][1], c[2][2] - c[0][2]];
        areaTriangulos += unitario([
          u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0],
        ]) / 2;
      }
    }
    /* …contra a área do anel, que é a face de entrada menos o disco de 12 lados
       do furo, os dois em conta fechada e não em amostra. */
    const raio = 0.5, ladoDoCubo = 2;
    const areaDoAnel = ladoDoCubo * ladoDoCubo - (LADOS / 2) * raio * raio * Math.sin((2 * Math.PI) / LADOS);
    /* o leque a partir do canto 0 emitia, nos 4 quads CÔNCAVOS da borda, um
       triângulo de área NEGATIVA contado como positivo: a soma passava da área
       do anel. Se a triangulação voltar a ser leque, esta igualdade morre. */
    expect(areaTriangulos).toBeCloseTo(areaDoAnel, 6);
  });

  it('sem `liso` a parede do furo é 100% chapada — a serrilha medida antes do conserto', () => {
    const parede = trianguloseNormais(placa(false), 'parede');
    expect(parede.length).toBe(2 * LADOS);
    expect(parede.filter(chapado).length).toBe(parede.length);
  });

  it('a normal suave da parede é radial ao eixo do furo, e o furo desce em −Y', () => {
    const parede = trianguloseNormais(placa(true), 'parede');
    for (const v of parede.flat()) {
      expect(Math.abs(v[1])).toBeLessThan(1e-6);
      expect(unitario(v)).toBeCloseTo(1, 6);
    }
  });
});

/* ---------------------------------------------------------------------------
   As quatro frases que o arquivo do adaptador escrevia no comentário e ninguém
   media. Cada uma foi conferida por MUTAÇÃO: com a suíte de 710 casos, estragar
   a linha correspondente deixava tudo VERDE. As quatro estavam prometidas, não
   provadas.
   --------------------------------------------------------------------------- */

/** posição → normal, de todos os cantos de todas as malhas de uma parte. */
function normaisPorPonto(neutro: any, parte: string, materiais: any = {}) {
  const { partes } = adaptarThree(neutro, { nome: 'fixture', materiais });
  const grupo = partes.get(parte);
  expect(grupo, `a parte '${parte}' não existe na peça`).toBeTruthy();
  const mapa = new Map<string, number[][]>();
  for (const malha of grupo.children) {
    const p = malha.geometry.getAttribute('position');
    const n = malha.geometry.getAttribute('normal');
    for (let k = 0; k < p.count; k++) {
      const chave = [p.getX(k), p.getY(k), p.getZ(k)].map((c) => c.toFixed(6)).join(',');
      const lista = mapa.get(chave) ?? [];
      lista.push([n.getX(k), n.getY(k), n.getZ(k)]);
      mapa.set(chave, lista);
    }
  }
  return mapa;
}

describe('a soma das normais lisas é do estado NEUTRO inteiro, não do lote de desenho', () => {
  /* o mesmo cilindro liso, uma vez com a lateral toda de um material e outra com
     as faces PARES num material e as ÍMPARES noutro. A troca de material parte a
     peça em duas malhas, e a divisa passa por DENTRO da superfície lisa. */
  const PARES = { passo: 2, fase: 0 };
  const IMPARES = { passo: 2, fase: 1 };
  const MATERIAIS = { claro: { cor: '#ffffff' }, escuro: { cor: '#101010' } };
  const cilindroPartido = (partir: boolean) => nucleo([
    ['cilindro', { origemId: CILINDRO, raio: 1, altura: 2, lados: LADOS }],
    ['parte', { nome: 'tubo', sel: { origem: { op: 'cilindro', id: CILINDRO } } }],
    ['liso', { sel: { origem: { op: 'cilindro', id: CILINDRO, lado: TODOS } } }],
    ...(partir ? [
      ['material', { sel: { origem: { op: 'cilindro', id: CILINDRO, lado: PARES } }, usa: 'claro' }],
      ['material', { sel: { origem: { op: 'cilindro', id: CILINDRO, lado: IMPARES } }, usa: 'escuro' }],
    ] : []),
  ], {}, {}, MATERIAIS);

  it('a troca de material parte a peça em várias malhas — a divisa existe de verdade', () => {
    const { partes } = adaptarThree(cilindroPartido(true), { nome: 'fixture', materiais: MATERIAIS });
    expect(partes.get('tubo').children.length).toBe(2);
    expect(adaptarThree(cilindroPartido(false), { nome: 'fixture', materiais: MATERIAIS })
      .partes.get('tubo').children.length).toBe(1);
  });

  it('cada ponto da divisa recebe a MESMA normal nas duas malhas', () => {
    for (const [ponto, normais] of normaisPorPonto(cilindroPartido(true), 'tubo', MATERIAIS)) {
      const [primeira] = normais;
      for (const n of normais) {
        for (let i = 0; i < 3; i++) {
          expect(n[i], `costura em ${ponto}: o mesmo ponto saiu com normais diferentes`)
            .toBeCloseTo(primeira[i], 9);
        }
      }
    }
  });

  it('partir por material não muda normal nenhuma: a superfície lisa continua lisa', () => {
    const inteira = normaisPorPonto(cilindroPartido(false), 'tubo', MATERIAIS);
    const partida = normaisPorPonto(cilindroPartido(true), 'tubo', MATERIAIS);
    expect([...partida.keys()].sort()).toEqual([...inteira.keys()].sort());
    for (const [ponto, normais] of partida) {
      const esperada = inteira.get(ponto)![0];
      for (const n of normais) {
        for (let i = 0; i < 3; i++) expect(n[i], `divergiu em ${ponto}`).toBeCloseTo(esperada[i], 9);
      }
      /* e continua RADIAL: se a soma fosse por lote, cada malha veria só metade
         das faces vizinhas de cada coluna e a normal sairia inclinada. */
      expect(Math.abs(esperada[1])).toBeLessThan(1e-9);
      /* 6 casas, e não 9: a normal viaja num Float32BufferAttribute, então o
         módulo volta com o erro de arredondamento do float de 32 bits. A
         igualdade ENTRE as duas montagens acima é exata porque as duas passam
         pelo mesmo arredondamento. */
      expect(unitario(esperada)).toBeCloseTo(1, 6);
    }
  });
});

describe('a soma das normais lisas é pesada pela ÁREA de cada triângulo', () => {
  /* uma casca de revolução com duas faixas de tamanhos MUITO diferentes: um
     barril de altura 10 (normal radial) e uma abinha de 0,02 inclinada a 45°.
     No anel que as duas dividem, a área do barril é ~350× a da abinha. */
  const CASCA = 80;
  const casca = nucleo([
    ['lathe', { origemId: CASCA, lados: LADOS, perfil: [[1, 0], [1, 10], [1.02, 10.02]] }],
    ['parte', { nome: 'casca', sel: { origem: { op: 'lathe', id: CASCA } } }],
    ['liso', { sel: { origem: { op: 'lathe', id: CASCA } } }],
  ], {}, {});

  it('o anel compartilhado herda quase inteira a normal da faixa GRANDE', () => {
    const noAnel = [...normaisPorPonto(casca, 'casca')]
      .filter(([ponto]) => ponto.split(',')[1] === '10.000000')
      .flatMap(([, normais]) => normais);
    expect(noAnel.length).toBeGreaterThan(0);
    for (const n of noAnel) {
      /* pesada pela área: |y| ≈ 0,0020. Com peso IGUAL por triângulo a abinha de
         45° valeria o mesmo que o barril inteiro e |y| passaria de 0,38 — 190×
         maior. A margem de 0,01 separa os dois casos sem ambiguidade. */
      expect(Math.abs(n[1])).toBeLessThan(0.01);
      expect(unitario(n)).toBeCloseTo(1, 6);
    }
  });
});

describe('normal que degenera cai na CHAPADA, nunca sai nula', () => {
  /* uma aba de espessura zero: o perfil vai de r=0,5 a r=1 e volta pelo mesmo
     y. As duas faixas dividem o anel externo e têm normais exatamente OPOSTAS,
     então a soma naquele anel é o vetor nulo. */
  const ABA = 90;
  const aba = nucleo([
    ['lathe', { origemId: ABA, lados: LADOS, perfil: [[0.5, 0], [1, 0], [0.5, 0]] }],
    ['parte', { nome: 'aba', sel: { origem: { op: 'lathe', id: ABA } } }],
    ['liso', { sel: { origem: { op: 'lathe', id: ABA } } }],
  ], {}, {});

  it('nenhuma normal emitida tem módulo zero', () => {
    const todas = [...normaisPorPonto(aba, 'aba').values()].flat();
    expect(todas.length).toBeGreaterThan(0);
    for (const n of todas) expect(unitario(n)).toBeCloseTo(1, 6);
  });

  it('no anel onde a soma se cancela vale a normal CHAPADA da faixa, ±Y exato', () => {
    const noAnel = [...normaisPorPonto(aba, 'aba')]
      .filter(([ponto]) => {
        const [x, , z] = ponto.split(',').map(Number);
        return Math.abs(Math.hypot(x, z) - 1) < 1e-6;
      })
      .flatMap(([, normais]) => normais);
    expect(noAnel.length).toBeGreaterThan(0);
    for (const n of noAnel) {
      expect(Math.abs(n[0])).toBeLessThan(1e-9);
      expect(Math.abs(n[2])).toBeLessThan(1e-9);
      expect(Math.abs(Math.abs(n[1]) - 1)).toBeLessThan(1e-9);
    }
  });
});

describe('a normal chapada é a do TRIÂNGULO, não a do plano da face', () => {
  /* um loft entre um quadrado e o mesmo quadrado girado 45°: as quatro faces
     laterais são quads NÃO PLANARES. Nenhuma é `liso`, então toda normal aqui é
     chapada — e num quad torto os dois triângulos têm relevo diferente. */
  const TORTO = 70;
  const quadrado = (fase: number) => [0, 1, 2, 3].map((k) => {
    const a = fase + (k * Math.PI) / 2;
    return [Math.cos(a), Math.sin(a)];
  });
  const torto = nucleo([
    ['loft', { origemId: TORTO, lados: 4, orientacao: [1, 0, 0], secoes: [
      { pos: [0, 0, 0], contorno: quadrado(0) },
      { pos: [0, 2, 0], contorno: quadrado(Math.PI / 4) },
    ] }],
    ['parte', { nome: 'torto', sel: { origem: { op: 'loft', id: TORTO } } }],
  ], {}, {});

  it('os quads são mesmo tortos: os 4 quads dão 8 triângulos com 8 normais distintas', () => {
    const trios = trianguloseNormais(torto, 'torto');
    expect(trios.length).toBe(8);
    /* cada triângulo é chapado por dentro (os 3 cantos iguais)… */
    expect(trios.filter(chapado).length).toBe(8);
    /* …e os 8 são diferentes ENTRE SI. Se a normal viesse do plano da face, os
       dois triângulos de cada quad seriam idênticos e sobrariam 4 valores. */
    const distintas = new Set(trios.map((t) => t[0].map((c) => c.toFixed(6)).join(',')));
    expect(distintas.size).toBe(8);
  });
});
