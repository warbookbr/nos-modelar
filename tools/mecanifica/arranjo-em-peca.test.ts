/* arranjo-em-peca.test.ts — a prova do ciclo "Arranjos semânticos v1" NA PEÇA,
   não só no núcleo.

   O ciclo entregou a op `arranja` com 356 casos de núcleo. O que ele NÃO tinha
   era peça: nenhuma peça usava a op, então o contrato estava provado em teste e
   não em modelagem. Este arquivo fecha isso em duas famílias de objeto:

   - `roda-dianteira-realista-experimento` — a peça que ORIGINOU o item (A-17).
     Ela tinha 141 parâmetros, cem deles só seno e cosseno de dez ângulos, e a
     frase "cinco pares em torno do eixo X" não existia no arquivo. Agora existe;
   - `_cerca-e-flor` — a mesma capacidade fora do vocabulário automotivo: tábuas
     por arranjo LINEAR e pétalas por arranjo RADIAL.

   O QUE ELE AFIRMA, e por que cada afirmação morre quando o valor muda:

   1. CONTAGEM DERIVADA. Nenhum número de instância está digitado neste arquivo:
      toda contagem sai de `TOPO`. E mais: cada passo `arranja` das duas peças
      precisa citar `total` pelo NOME de um campo de TOPO — escrever `total: 5`
      derruba a afirmação, mesmo que a geometria saia idêntica;
   2. IDENTIDADE. Cada cópia é uma parte, e o ÂNGULO (ou a posição, no linear)
      de cada uma é derivado do parâmetro. Trocar dois nomes de braço entre si
      deixa a peça com a mesma malha e derruba esta afirmação;
   3. RIGIDEZ. Cada cópia é a fonte movida, não uma peça remodelada: o perfil
      radial e a extensão axial são idênticos aos da fonte, com 9 casas;
   4. MÃO DA FACE. O conjunto de normais de cada cópia, GIRADO DE VOLTA pelo
      ângulo dela, é idêntico ao da fonte. Reverter os cantos da cópia (o que o
      `espelha` faz de propósito) é invisível no envelope e plausível na foto —
      é a mutação que sobreviveu ao ciclo anterior;
   5. POSIÇÃO DE PASSO NÃO É REFERÊNCIA. Inserir um passo no começo da lista
      renumera toda a malha e não muda nada do que a peça afirma.

   Régua headless das mesmas peças:
     npm run descrever -- roda-dianteira-realista-experimento --estrito
     npm run descrever -- _cerca-e-flor --estrito */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — núcleo legado em JavaScript, exercitado pela API pública.
import { nucleo } from '../../prototipos/fps/v3/motor/oficina.js';
// @ts-expect-error — peça em JavaScript, exercitada em runtime pelo Vitest.
import * as roda from '../../prototipos/fps/v3/pecas/roda-dianteira-realista-experimento.js';
// @ts-expect-error — peça em JavaScript, exercitada em runtime pelo Vitest.
import * as cerca from '../../prototipos/fps/v3/pecas/_cerca-e-flor.js';

type Peca = { PASSOS: any[]; PARAMS: any; TOPO: any; MATERIAIS: any; ALIASES: any[] };

function montar(peca: Peca, prefixo: any[] = []) {
  const neutro = nucleo([...prefixo, ...peca.PASSOS], peca.PARAMS, peca.TOPO, peca.MATERIAIS, null, peca.ALIASES);
  expect(neutro.orfaos).toEqual([]);
  return neutro;
}

const facesDaParte = (neutro: any, parte: string) => [...neutro.F.values()].filter((f: any) => f.parte === parte);
const pontosDaParte = (neutro: any, parte: string) => {
  const vistos = new Set<number>();
  for (const f of facesDaParte(neutro, parte)) for (const v of f.vs) vistos.add(v);
  return [...vistos].map((v) => neutro.V.get(v) as number[]);
};
const centroide = (ps: number[][]) => [0, 1, 2].map((k) => ps.reduce((s, p) => s + p[k], 0) / ps.length);

/* normal de Newell — a mesma do núcleo, independente de triangulação. É ela que
   diz a MÃO da face, e é a mão que some sem deixar rastro no envelope. */
function normalDaFace(neutro: any, face: any) {
  let nx = 0, ny = 0, nz = 0;
  for (let k = 0; k < face.vs.length; k++) {
    const c = neutro.V.get(face.vs[k]) as number[];
    const n = neutro.V.get(face.vs[(k + 1) % face.vs.length]) as number[];
    nx += (c[1] - n[1]) * (c[2] + n[2]);
    ny += (c[2] - n[2]) * (c[0] + n[0]);
    nz += (c[0] - n[0]) * (c[1] + n[1]);
  }
  const l = Math.hypot(nx, ny, nz) || 1;
  return [nx / l, ny / l, nz / l];
}
/* rotação right-handed, a mesma convenção de `giraPonto` no núcleo. */
function girar(p: number[], ax: number, graus: number) {
  const r = (graus * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r);
  if (ax === 0) return [p[0], p[1] * c - p[2] * s, p[1] * s + p[2] * c];
  if (ax === 1) return [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c];
  return [p[0] * c - p[1] * s, p[0] * s + p[1] * c, p[2]];
}
const chave = (ps: number[][]) => ps.map((p) => p.map((n) => (Math.abs(n) < 1e-9 ? 0 : n).toFixed(6)).join(' ')).sort();
const normaisDaParte = (neutro: any, parte: string) => facesDaParte(neutro, parte).map((f: any) => normalDaFace(neutro, f));

/* toda origem `arranja` da peça precisa contar por NOME de TOPO. Isto é o item
   "contagem derivada do parâmetro, nunca número digitado": a afirmação vale
   sobre a PEÇA, então trocar `total:'gruposDeRaios'` por `total:5` — que produz
   exatamente a mesma malha — a derruba. */
function arranjosDe(peca: Peca) {
  return peca.PASSOS.filter((p: any[]) => p[0] === 'arranja').map((p: any[]) => p[1]);
}

describe('arranjo semântico na peça — a roda que originou o item (A-17)', () => {
  const P = roda.PARAMS;
  const T = roda.TOPO;
  const passoDoGrupo = 360 / T.gruposDeRaios;
  const meiaAbertura = P.raioParAbertura / 2;
  /* os dez braços e o ângulo que CADA UM promete, derivados de TOPO/PARAMS. */
  const BRACOS = Array.from({ length: T.gruposDeRaios }, (_, i) => i + 1).flatMap((grupo) => [
    { nome: `raioRecuadoDoGrupo${grupo}`, graus: (grupo - 1) * passoDoGrupo - meiaAbertura },
    { nome: `raioAvancadoDoGrupo${grupo}`, graus: (grupo - 1) * passoDoGrupo + meiaAbertura },
  ]);
  const FONTE = 'raioRecuadoDoGrupo1';

  it('todo arranjo conta por nome de TOPO, nunca por número digitado', () => {
    const arranjos = arranjosDe(roda);
    expect(arranjos.length).toBeGreaterThan(0);
    for (const a of arranjos) {
      expect(typeof a.total, `arranja origemId ${a.origemId}`).toBe('string');
      expect(Object.hasOwn(T, a.total), `total '${a.total}' precisa ser campo de TOPO`).toBe(true);
    }
  });

  it('a peça perdeu os cem parâmetros de coordenada dos braços', () => {
    const coordenadas = Object.keys(P).filter((k) => /^r\d+_/.test(k));
    expect(coordenadas).toEqual([]);
    /* o teto é a medida do item: 141 parâmetros era o estado que originou o
       A-17. Qualquer volta àquele regime rompe isto antes de virar hábito. */
    expect(Object.keys(P).length).toBeLessThan(60);
  });

  it('cada cópia é uma parte, e são exatamente duas por grupo', () => {
    const neutro = montar(roda);
    const nomes = new Set<string>();
    for (const f of neutro.F.values()) nomes.add(f.parte);
    for (const braco of BRACOS) expect(nomes.has(braco.nome), braco.nome).toBe(true);
    const dosBracos = [...nomes].filter((n) => n.startsWith('raio'));
    expect(dosBracos.length).toBe(T.gruposDeRaios * T.bracosPorPar);
    expect([...nomes].filter((n) => !n)).toEqual([]);
  });

  it('cada braço está no ângulo que o nome promete, derivado do parâmetro', () => {
    const neutro = montar(roda);
    for (const braco of BRACOS) {
      const c = centroide(pontosDaParte(neutro, braco.nome));
      const medido = (Math.atan2(c[2], c[1]) * 180) / Math.PI;
      const esperado = ((braco.graus + 540) % 360) - 180;
      expect(medido, braco.nome).toBeCloseTo(esperado, 9);
    }
  });

  it('cada braço é a fonte GIRADA: mesmo perfil radial, mesma extensão axial', () => {
    const neutro = montar(roda);
    const perfil = (parte: string) => {
      const ps = pontosDaParte(neutro, parte);
      return {
        faces: facesDaParte(neutro, parte).length,
        raios: ps.map((p) => Math.hypot(p[1], p[2]).toFixed(9)).sort(),
        x: ps.map((p) => p[0].toFixed(9)).sort(),
      };
    };
    const fonte = perfil(FONTE);
    for (const braco of BRACOS) expect(perfil(braco.nome), braco.nome).toEqual(fonte);
  });

  it('a mão da face sobrevive à cópia: as normais giradas de volta são as da fonte', () => {
    const neutro = montar(roda);
    const daFonte = chave(normaisDaParte(neutro, FONTE));
    for (const braco of BRACOS) {
      const desgirado = normaisDaParte(neutro, braco.nome)
        .map((n: number[]) => girar(n, 0, -(braco.graus - BRACOS[0].graus)));
      expect(chave(desgirado), braco.nome).toEqual(daFonte);
    }
  });

  it('inserir um passo antes de tudo renumera a malha e não muda nada', () => {
    const antes = montar(roda);
    const depois = montar(roda, [['cubo', { lado: 0.01 }]]);
    expect(Math.max(...depois.V.keys())).toBeGreaterThan(Math.max(...antes.V.keys()));
    for (const braco of BRACOS) {
      expect(chave(pontosDaParte(depois, braco.nome)), braco.nome)
        .toEqual(chave(pontosDaParte(antes, braco.nome)));
    }
  });
});

describe('arranjo semântico fora do vocabulário automotivo — _cerca-e-flor', () => {
  const P = cerca.PARAMS;
  const T = cerca.TOPO;
  const TABUAS = Array.from({ length: T.tabuasDaCerca }, (_, i) => i + 1);
  const PETALAS = Array.from({ length: T.petalasDaFlor }, (_, i) => i + 1);

  it('todo arranjo conta por nome de TOPO, nos dois modos', () => {
    const arranjos = arranjosDe(cerca);
    expect(arranjos.map((a: any) => a.modo).sort()).toEqual(['linear', 'radial']);
    for (const a of arranjos) expect(Object.hasOwn(T, a.total), `total '${a.total}'`).toBe(true);
  });

  it('as tábuas caminham exatamente um passo, e o passo é o parâmetro', () => {
    const neutro = montar(cerca);
    const centros = TABUAS.map((n) => centroide(pontosDaParte(neutro, `tabuaDaCerca${n}`)));
    for (const [i, c] of centros.entries()) {
      expect(c[0], `tabuaDaCerca${i + 1} em x`).toBeCloseTo(centros[0][0] + i * P.tabuaPasso, 9);
      expect(c[1], `tabuaDaCerca${i + 1} em y`).toBeCloseTo(centros[0][1], 9);
      expect(c[2], `tabuaDaCerca${i + 1} em z`).toBeCloseTo(centros[0][2], 9);
    }
  });

  it('a travessa acompanha a contagem: ela cobre da primeira à última tábua', () => {
    const neutro = montar(cerca);
    const xDe = (parte: string) => pontosDaParte(neutro, parte).map((p) => p[0]);
    const primeira = Math.min(...xDe('tabuaDaCerca1'));
    const ultima = Math.max(...xDe(`tabuaDaCerca${T.tabuasDaCerca}`));
    for (const travessa of ['travessaBaixa', 'travessaAlta']) {
      expect(Math.min(...xDe(travessa)), travessa).toBeCloseTo(primeira, 9);
      expect(Math.max(...xDe(travessa)), travessa).toBeCloseTo(ultima, 9);
    }
    /* e a cobertura é a expressão declarada, medida na malha */
    expect(ultima - primeira).toBeCloseTo(P.tabuaPasso * (T.tabuasDaCerca - 1) + P.tabuaLargura, 9);
  });

  it('as pétalas fecham a volta em passos iguais, derivados da contagem', () => {
    const neutro = montar(cerca);
    const passo = 360 / T.petalasDaFlor;
    for (const n of PETALAS) {
      const c = centroide(pontosDaParte(neutro, `petalaDaFlor${n}`));
      const dx = c[0] - P.florX, dy = c[1] - P.florY;
      const medido = (Math.atan2(-dx, dy) * 180) / Math.PI;
      const esperado = (((n - 1) * passo + 540) % 360) - 180;
      expect(medido, `petalaDaFlor${n}`).toBeCloseTo(esperado, 9);
      expect(c[2], `petalaDaFlor${n} fica no plano da flor`).toBeCloseTo(P.florZ, 9);
    }
  });

  it('cada pétala é a fonte girada, com a mesma mão de face', () => {
    const neutro = montar(cerca);
    const passo = 360 / T.petalasDaFlor;
    const daFonte = chave(normaisDaParte(neutro, 'petalaDaFlor1'));
    for (const n of PETALAS) {
      const desgirado = normaisDaParte(neutro, `petalaDaFlor${n}`)
        .map((v: number[]) => girar(v, 2, -(n - 1) * passo));
      expect(chave(desgirado), `petalaDaFlor${n}`).toEqual(daFonte);
      expect(facesDaParte(neutro, `petalaDaFlor${n}`).length).toBe(6);
    }
  });

  it('cada tábua tem a mesma mão de face da primeira', () => {
    const neutro = montar(cerca);
    const daFonte = chave(normaisDaParte(neutro, 'tabuaDaCerca1'));
    for (const n of TABUAS) expect(chave(normaisDaParte(neutro, `tabuaDaCerca${n}`)), `tabuaDaCerca${n}`).toEqual(daFonte);
  });
});
