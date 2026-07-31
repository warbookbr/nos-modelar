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

/* CORPOS de uma parte AGREGADA. `recessosRaios` e `fixadores` são uma parte só
   com N sólidos soltos dentro — a forma "coleção inteira" do arranjo. A régua
   por parte mede uma caixa só e não sabe dizer quantos corpos há lá dentro; sem
   separar por conectividade, trocar a contagem do arranjo não muda nada
   observável. Isto separa: dois vértices compartilhados = mesmo corpo. */
function corposDaParte(neutro: any, parte: string) {
  const faces = facesDaParte(neutro, parte);
  const dono = new Map<number, number>();
  const raiz = (x: number): number => (dono.get(x) === x ? x : raiz(dono.get(x) as number));
  for (const f of faces) for (const v of f.vs) if (!dono.has(v)) dono.set(v, v);
  for (const f of faces) for (const v of f.vs) dono.set(raiz(v), raiz(f.vs[0]));
  const porRaiz = new Map<number, { faces: any[]; pontos: number[][] }>();
  for (const f of faces) {
    const r = raiz(f.vs[0]);
    if (!porRaiz.has(r)) porRaiz.set(r, { faces: [], pontos: [] });
    const corpo = porRaiz.get(r) as { faces: any[]; pontos: number[][] };
    corpo.faces.push(f);
    for (const v of f.vs) corpo.pontos.push(neutro.V.get(v) as number[]);
  }
  return [...porRaiz.values()];
}

/* ângulo do corpo em torno do eixo X, na convenção right-handed da peça, e o
   raio dele no plano radial. */
const anguloEmX = (c: number[]) => (Math.atan2(c[2], c[1]) * 180) / Math.PI;
const raioEmX = (c: number[]) => Math.hypot(c[1], c[2]);
const normalizarGraus = (g: number) => ((g + 540) % 360) - 180;

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

  /* As outras DUAS famílias de arranjo da roda. Elas são de propósito uma parte
     AGREGADA cada, e por isso escapavam de tudo: nenhum teste do repositório
     citava `fixadores` nem `recessosRaios`. Medido na revisão do ciclo 3:
     trocar `total:'fixadoresNaRoda'` por `total:'ladosFixador'` — cinco porcas
     viram seis — e deslocar o círculo de parafusos em 1 cm passavam a suíte
     inteira. As afirmações abaixo contam CORPOS e medem o círculo pelo
     parâmetro que o nomeia. */
  it('as porcas são exatamente a contagem declarada, em corpos separados', () => {
    const neutro = montar(roda);
    const corpos = corposDaParte(neutro, 'fixadores');
    expect(corpos.length).toBe(T.fixadoresNaRoda);
    /* cada porca é o mesmo sólido: o lathe de `ladosFixador` lados, inteiro */
    const faces = corpos.map((c) => c.faces.length);
    expect(new Set(faces).size, `contagens de face: ${faces.join(',')}`).toBe(1);
    /* e o sólido é o lathe de `ladosFixador` lados: uma faixa por lado, em cada
       segmento do perfil. `ladosFixador` conta a POLIGONAL da porca; ele não é
       a contagem de porcas, e o arranjo não pode contar por ele. */
    expect(faces[0] % T.ladosFixador, `${faces[0]} faces por porca`).toBe(0);
    expect(faces[0]).toBeGreaterThan(T.ladosFixador);
  });

  it('as porcas ficam NO círculo de parafusos, em passos iguais de volta fechada', () => {
    const neutro = montar(roda);
    const passo = 360 / T.fixadoresNaRoda;
    const corpos = corposDaParte(neutro, 'fixadores')
      .map((c) => centroide(c.pontos))
      .sort((a, b) => normalizarGraus(anguloEmX(a)) - normalizarGraus(anguloEmX(b)));
    /* o círculo é o parâmetro que o nomeia; deslocá-lo 1 cm mata isto */
    for (const c of corpos) expect(raioEmX(c), 'raio do círculo de parafusos').toBeCloseTo(P.fixadorRaioOrbita, 9);
    /* e a porca fica na face externa, entre a base e o comprimento declarados */
    const xs = corposDaParte(neutro, 'fixadores').flatMap((c) => c.pontos.map((p) => p[0]));
    expect(Math.min(...xs)).toBeCloseTo(P.fixadorBaseX, 9);
    expect(Math.max(...xs)).toBeCloseTo(P.fixadorBaseX + P.fixadorComprimento, 9);
    /* passos iguais, e a primeira porca no grupo 1 (Y+, ângulo zero) */
    const graus = corpos.map((c) => normalizarGraus(anguloEmX(c)));
    const esperados = Array.from({ length: T.fixadoresNaRoda }, (_, k) => normalizarGraus(k * passo)).sort((a, b) => a - b);
    for (const [i, g] of graus.entries()) expect(g, `porca ${i}`).toBeCloseTo(esperados[i], 9);
  });

  it('há um ressalto por grupo de raios, atrás do par e no mesmo ângulo dele', () => {
    const neutro = montar(roda);
    const corpos = corposDaParte(neutro, 'recessosRaios');
    expect(corpos.length).toBe(T.gruposDeRaios);
    for (const corpo of corpos) expect(corpo.faces.length).toBe(6);   // um cubo inteiro
    const centros = corpos.map((c) => centroide(c.pontos));
    /* o ressalto vai da raiz declarada até ela mais o comprimento declarado, e
       o centro dele é essa expressão — medida na malha, não recopiada */
    for (const c of centros) {
      expect(raioEmX(c), 'raio do ressalto').toBeCloseTo(P.recessoRaioInicio + P.recessoComprimento / 2, 9);
      expect(c[0], 'x do ressalto').toBeCloseTo(P.recessoX, 9);
    }
    /* e cada ressalto fica no centro de um grupo de braços, não entre dois */
    const centrosDeGrupo = Array.from({ length: T.gruposDeRaios }, (_, g) => normalizarGraus(g * passoDoGrupo)).sort((a, b) => a - b);
    const graus = centros.map((c) => normalizarGraus(anguloEmX(c))).sort((a, b) => a - b);
    for (const [i, g] of graus.entries()) expect(g, `ressalto ${i}`).toBeCloseTo(centrosDeGrupo[i], 9);
    /* o ressalto fica ATRÁS do par: mais para dentro que a face dos braços */
    expect(P.recessoX).toBeLessThan(P.raioFaceX);
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

  /* A OUTRA forma do endereço: a coleção INTEIRA. O cabeçalho da peça promete
     que `{op:'arranja', id}` sem `copia` endereça o conjunto e que "é assim que
     o material é aplicado" — e nada afirmava isso. Medido na revisão do ciclo
     3: tirar a referência à coleção de `cercaInteira` ou de `corolaInteira`
     deixava a suíte inteira verde, com seis tábuas e cinco pétalas SEM material
     nenhum. A cópia isolada tem parte, então a régua e a bancada seguiam
     mostrando tudo; só a pintura sumia. */
  it('a coleção inteira pinta TODAS as instâncias, não só a fonte', () => {
    const neutro = montar(cerca);
    for (const n of TABUAS) {
      const faces = facesDaParte(neutro, `tabuaDaCerca${n}`);
      expect(faces.length, `tabuaDaCerca${n} sem face`).toBeGreaterThan(0);
      for (const f of faces) expect(f.material, `tabuaDaCerca${n}`).toBe('madeiraTabua');
    }
    for (const n of PETALAS) {
      const faces = facesDaParte(neutro, `petalaDaFlor${n}`);
      expect(faces.length, `petalaDaFlor${n} sem face`).toBeGreaterThan(0);
      for (const f of faces) expect(f.material, `petalaDaFlor${n}`).toBe('corolaPetala');
    }
    /* e nenhuma face da peça fica sem material: material ausente é o buraco
       exato que a mutação abria, e ele não aparece em contagem de parte. */
    const semMaterial = [...neutro.F.values()].filter((f: any) => !f.material);
    expect(semMaterial.map((f: any) => f.parte)).toEqual([]);
  });

  it('a coleção inteira também é o endereço do `solido`, tábua por tábua', () => {
    const neutro = montar(cerca);
    for (const n of TABUAS) {
      for (const f of facesDaParte(neutro, `tabuaDaCerca${n}`)) {
        expect(f.solido, `tabuaDaCerca${n}`).toBe(true);
      }
    }
    /* a marca é da cerca, não da peça toda: a flor não é sólida */
    expect(facesDaParte(neutro, 'mioloDaFlor').every((f: any) => !f.solido)).toBe(true);
  });

  it('cada tábua tem a mesma mão de face da primeira', () => {
    const neutro = montar(cerca);
    const daFonte = chave(normaisDaParte(neutro, 'tabuaDaCerca1'));
    for (const n of TABUAS) expect(chave(normaisDaParte(neutro, `tabuaDaCerca${n}`)), `tabuaDaCerca${n}`).toEqual(daFonte);
  });
});
