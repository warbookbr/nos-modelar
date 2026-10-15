/* solido-do-esboco.test.js — o sólido exato de uma forma do esboço, a partir de formas escritas à mão no formato de `formasResolvidas`.
   Cada caso tem o volume ou a caixa que a conta analítica dá, e os que o andaime do nível zero perde (o recorte, a folga, a profundidade, a
   seção inclinada de loft, a cavidade da casca, o furo de caixa, a malha de família com as partes que se sobrepõem) são os que importam. */
import { afterEach, describe, expect, it } from 'vitest';
import {
  criarContextoDeSolidos, criarSolidosDoEsboco, ErroDoSolido, soldarMalha, triangularPoligonos, volumeAssinado,
} from './solido-do-esboco.js';
import { FORMATO_FORMAS_RESOLVIDAS } from './tradutor-nivel-zero.js';

const IDENTIDADE = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
const rotacaoEmZ = (graus) => {
  const t = (graus * Math.PI) / 180;
  return [[Math.cos(t), -Math.sin(t), 0], [Math.sin(t), Math.cos(t), 0], [0, 0, 1]];
};

/* A área do polígono regular de `n` lados inscrito no círculo de raio `r`. */
const areaDoPoligono = (r, n) => 0.5 * n * r * r * Math.sin((2 * Math.PI) / n);

function forma(id, tipo, geometria, extra = {}) {
  return {
    id, tipo, oculto: false, unidade: null, parte: null, origem: null,
    geometria: { centro: [0, 0, 0], caixa: { min: [0, 0, 0], max: [0, 0, 0] }, matriz: IDENTIDADE, ancoras: {}, ...geometria },
    ...extra,
  };
}
const caixa = (id, largura, altura, profundidade, geometria = {}, extra = {}) => forma(id, 'caixa', { eixo: 'y', largura, altura, profundidade, ...geometria }, extra);
const cilindro = (id, diametro, comprimento, eixo, geometria = {}, extra = {}) => forma(id, 'cilindro', { eixo, diametro, comprimento, ...geometria }, extra);
const cortador = (id, tipo, geometria) => ({ ...forma(id, tipo, geometria), oculto: true, cortador: true });
const recorte = (...cortadores) => ({ recorte: { cortadores, volumeCheioMm3: 0, volumeMm3: 0 } });
const dados = (...formas) => ({ formato: FORMATO_FORMAS_RESOLVIDAS, opcao: { numero: 1 }, parametros: {}, pontos: {}, formas });
const retangulo = (u, v) => [[-u / 2, -v / 2], [u / 2, -v / 2], [u / 2, v / 2], [-u / 2, v / 2]];

let contexto = null;
afterEach(() => { contexto?.liberar(); contexto = null; });

function solidos(formas, opcoes = {}) {
  contexto = criarContextoDeSolidos(opcoes.origem ? { origem: opcoes.origem } : {});
  return criarSolidosDoEsboco(dados(...formas), { contexto, malhaDaFamilia: opcoes.malhaDaFamilia ?? null });
}
const volume = (s, id) => contexto.volume(s.solido(id));
const caixaDe = (s, id) => contexto.caixa(s.solido(id));

describe('a geometria do tipo, girada e posta no centro', () => {
  it('a caixa tem o volume e a caixa de medidas do esboço', () => {
    const s = solidos([caixa('c', 200, 100, 120, { centro: [10, 50, -5] })]);
    expect(volume(s, 'c')).toBeCloseTo(200 * 100 * 120, 3);
    const { min, max } = caixaDe(s, 'c');
    [[-90, 0, -65], [110, 100, 55]].forEach((esperado, k) => esperado.forEach((e, i) => expect((k ? max : min)[i]).toBeCloseTo(e, 4)));
  });

  it('a caixa inclinada num eixo conserva o volume e tem a caixa envolvente da conta', () => {
    const s = solidos([caixa('c', 300, 40, 60, { centro: [0, 400, 0], matriz: rotacaoEmZ(30) })]);
    /* os vértices girados entram em Float32, e meio milionésimo do volume é o que a conta deixa */
    expect(Math.abs(volume(s, 'c') / (300 * 40 * 60) - 1)).toBeLessThan(1e-5);
    const { min, max } = caixaDe(s, 'c');
    const c = Math.cos(Math.PI / 6);
    const sn = Math.sin(Math.PI / 6);
    expect(max[0] - min[0]).toBeCloseTo(300 * c + 40 * sn, 3);
    expect(max[1] - min[1]).toBeCloseTo(300 * sn + 40 * c, 3);
    expect(max[2] - min[2]).toBeCloseTo(60, 4);
  });

  it('o espelho (determinante -1) não vira o sólido do avesso, e a posição é a refletida', () => {
    const matriz = [[-1, 0, 0], [0, 1, 0], [0, 0, 1]];
    const s = solidos([caixa('c', 40, 20, 10, { centro: [-100, 0, 0], matriz }), cilindro('r', 10, 30, 'x', { centro: [100, 0, 0], matriz })]);
    expect(volume(s, 'c')).toBeCloseTo(40 * 20 * 10, 3);
    expect(caixaDe(s, 'c').min[0]).toBeCloseTo(-120, 4);
    expect(volume(s, 'r')).toBeGreaterThan(0);
  });

  it('o cilindro tem o polígono de 128 lados do esboço, ou os lados que a forma declara', () => {
    const s = solidos([cilindro('a', 60, 100, 'y'), cilindro('b', 60, 100, 'x', { lados: 16 })]);
    /* a Manifold guarda as coordenadas em Float32: um centésimo de milímetro cúbico em 275 mil é o que a conta deixa */
    expect(volume(s, 'a')).toBeCloseTo(areaDoPoligono(30, 128) * 100, 1);
    expect(volume(s, 'b')).toBeCloseTo(areaDoPoligono(30, 16) * 100, 1);
  });

  it('a caixa de canto arredondado é a extrusão do mesmo contorno do esboço', () => {
    const s = solidos([caixa('c', 100, 20, 60, { raio: 10 })]);
    expect(volume(s, 'c')).toBeCloseTo((100 * 60 - (4 - Math.PI) * 100) * 20, -2);
    expect(volume(s, 'c')).toBeLessThan(100 * 60 * 20);
  });

  it('a caixa com furo passante é a caixa menos um cilindro de 128 lados por furo', () => {
    const s = solidos([caixa('c', 100, 50, 100, { furos: [{ diametro: 20, centro: [10, -10] }, { diametro: 8, centro: [-30, 20] }] })]);
    expect(volume(s, 'c')).toBeCloseTo((100 * 100 - areaDoPoligono(10, 128) - areaDoPoligono(4, 128)) * 50, 2);
  });

  it('o tubo com canto sem raio de curva leva uma esfera na junta', () => {
    const caminho = [[0, 0, 0], [100, 0, 0], [100, 100, 0]];
    const s = solidos([forma('t', 'tubo', { diametro: 10, raioCurva: 0, caminho, centro: [50, 50, 0] })]);
    /* os dois trechos se cruzam no canto (a soma conta o cruzamento duas vezes) e a esfera da junta acrescenta o que sai dos dois */
    const dois = 2 * areaDoPoligono(5, 48) * 100;
    expect(volume(s, 't')).toBeGreaterThan(dois * 0.99);
    expect(volume(s, 't')).toBeLessThan(dois + (4 / 3) * Math.PI * 125);
    /* o ponto (103, -3, 0) está a 4,2 mm da junta, depois do fim do primeiro trecho e antes do começo do segundo: só a esfera o cobre */
    const quina = contexto.intersecao([s.solido('t'), contexto.cubo(0.6, [103, -3, 0])]);
    expect(contexto.volume(quina)).toBeCloseTo(0.6 ** 3, 4);
    const { min, max } = caixaDe(s, 't');
    expect(min[0]).toBeCloseTo(0, 3);
    expect(max[0]).toBeCloseTo(105, 1);
    expect(max[1]).toBeCloseTo(100, 3);
  });

  it('a faixa que contorna círculos não tem sólido e é recusada dizendo isso', () => {
    const s = solidos([forma('f', 'envolve', { largura: 10, espessura: 2, fechado: true, trilha: { pontos: [], fechado: true } })]);
    expect(() => s.solido('f')).toThrow(/envolve.*ainda não tem sólido/);
  });

  it('a forma que não existe é recusada com os ids da opção', () => {
    const s = solidos([caixa('c', 10, 10, 10)]);
    expect(() => s.solido('x')).toThrow(/forma "x" não existe.*formas: c/);
  });
});

describe('o loft', () => {
  const secao = (w, u, v, extra = {}) => ({ w, perfil: retangulo(u, v), ...extra });
  const loft = (id, secoes, geometria = {}) => forma(id, 'loft', { eixo: 'z', eixosDoPerfil: ['x', 'y'], comprimento: 100, secoes, ...geometria });

  it('é o tronco convexo de cada par de seções, e o volume é o do prismatoide', () => {
    const s = solidos([loft('l', [secao(0, 20, 20), secao(50, 40, 40), secao(100, 20, 20)])]);
    /* cada metade é um tronco de pirâmide quadrada: h/3 (A1 + A2 + raiz(A1 A2)) */
    const tronco = (50 / 3) * (400 + 1600 + 800);
    expect(volume(s, 'l')).toBeCloseTo(2 * tronco, 2);
  });

  it('a seção inclinada fica inclinada: a caixa passa da posição w e o volume é o do prisma cortado', () => {
    const inclinada = { w: 100, n: [-0.5, 0, 0.8660254], perfil: retangulo(20, 20).map(([u, v]) => [u, v, 100 + u]) };
    const s = solidos([loft('l', [secao(0, 20, 20), inclinada])]);
    expect(volume(s, 'l')).toBeCloseTo(20 * 20 * 100, 2);
    expect(caixaDe(s, 'l').max[2]).toBeCloseTo(110, 4);
  });

  it('a casca é o sólido externo menos a cavidade, aberta no fim', () => {
    const casca = { espessura: 10, aberta: 'fim', fundoAte: 10, cavidade: [secao(10, 80, 80), secao(100, 80, 80)] };
    const s = solidos([loft('l', [secao(0, 100, 100), secao(100, 100, 100)], { casca })]);
    expect(volume(s, 'l')).toBeCloseTo(100 * 100 * 100 - 80 * 80 * 90, 2);
    /* a boca está aberta: no plano z = 100 há o anel da parede (de 100 por 100 com o furo de 80 por 80) e nenhuma tampa sobre a cavidade */
    const { vertices, triangulos } = contexto.malha(s.solido('l'));
    const naBoca = triangulos.filter((t) => t.every((i) => Math.abs(vertices[i][2] - 100) < 1e-3));
    expect(naBoca.length).toBeGreaterThan(0);
    for (const t of naBoca) {
      const [cx, cy] = [0, 1].map((e) => t.reduce((a, i) => a + vertices[i][e], 0) / 3);
      expect(Math.max(Math.abs(cx), Math.abs(cy))).toBeGreaterThan(40 - 1e-3);
    }
  });

  it('o loft girado e posto no centro leva as seções junto', () => {
    const s = solidos([loft('l', [secao(-50, 20, 20), secao(50, 20, 20)], { centro: [0, 200, 0], matriz: rotacaoEmZ(90) })]);
    const { min, max } = caixaDe(s, 'l');
    expect(max[2] - min[2]).toBeCloseTo(100, 4);
    expect(min[1]).toBeCloseTo(190, 4);
    expect(volume(s, 'l')).toBeCloseTo(40000, 2);
  });
});

describe('o recorte', () => {
  const placa = (geometria = {}) => caixa('placa', 200, 20, 200, { centro: [0, 10, 0], ...geometria });

  it('a caixa com um cilindro recortado perde o cilindro e conserva o resto', () => {
    const s = solidos([
      placa(recorte({ id: 'furo', retiradoMm3: 0 })),
      cortador('furo', 'cilindro', { eixo: 'y', diametro: 60, comprimento: 100, centro: [20, 10, 0] }),
    ]);
    expect(volume(s, 'placa')).toBeCloseTo((200 * 200 - areaDoPoligono(30, 128)) * 20, 1);
    expect(contexto.volume(s.solidoInteiro('placa'))).toBeCloseTo(200 * 200 * 20, 3);
  });

  it('o molde que não toca a forma não muda o volume', () => {
    const s = solidos([
      placa(recorte({ id: 'longe' })),
      cortador('longe', 'caixa', { eixo: 'y', largura: 10, altura: 10, profundidade: 10, centro: [500, 10, 0] }),
    ]);
    expect(volume(s, 'placa')).toBeCloseTo(200 * 200 * 20, 3);
  });

  it('a folga engrossa o molde em cada face, com o canto vivo', () => {
    const molde = cortador('molde', 'caixa', { eixo: 'y', largura: 40, altura: 60, profundidade: 40, centro: [0, 10, 0] });
    const s = solidos([placa(recorte({ id: 'molde', folga: 5 })), molde]);
    expect(volume(s, 'placa')).toBeCloseTo(200 * 200 * 20 - 50 * 50 * 20, 2);
  });

  it('a folga vale também para o molde girado (cada face anda 5 mm na normal dela)', () => {
    const molde = cortador('molde', 'caixa', { eixo: 'y', largura: 40, altura: 60, profundidade: 40, centro: [0, 10, 0], matriz: [[Math.SQRT1_2, 0, -Math.SQRT1_2], [0, 1, 0], [Math.SQRT1_2, 0, Math.SQRT1_2]] });
    const s = solidos([placa(recorte({ id: 'molde', folga: 5 })), molde]);
    expect(volume(s, 'placa')).toBeCloseTo(200 * 200 * 20 - 50 * 50 * 20, 1);
  });

  it('a folga do loft engrossa a peça convexa de cada faixa', () => {
    const molde = cortador('molde', 'loft', {
      eixo: 'y', eixosDoPerfil: ['x', 'z'], comprimento: 60, centro: [0, 10, 0],
      secoes: [{ w: -30, perfil: retangulo(40, 40) }, { w: 30, perfil: retangulo(40, 40) }],
    });
    const s = solidos([placa(recorte({ id: 'molde', folga: 5 })), molde]);
    expect(volume(s, 'placa')).toBeCloseTo(200 * 200 * 20 - 50 * 50 * 20, 1);
  });

  it('a profundidade com o lado deixa do molde só a fatia que entra na forma', () => {
    const molde = cortador('molde', 'caixa', { eixo: 'y', largura: 40, altura: 100, profundidade: 40, centro: [0, 20, 0] });
    const s = solidos([placa(recorte({ id: 'molde', profundidade: 3, lado: '+y' })), molde]);
    expect(volume(s, 'placa')).toBeCloseTo(200 * 200 * 20 - 40 * 40 * 3, 2);
    const embaixo = solidos([placa(recorte({ id: 'molde', profundidade: 3, lado: '-y' })), molde]);
    expect(volume(embaixo, 'placa')).toBeCloseTo(200 * 200 * 20 - 40 * 40 * 3, 2);
  });

  it('o recorte posto fora do centro da origem do contexto dá o mesmo volume', () => {
    const formas = [
      placa({ centro: [3000, 10, -4000], ...recorte({ id: 'furo' }) }),
      cortador('furo', 'cilindro', { eixo: 'y', diametro: 60, comprimento: 100, centro: [3020, 10, -4000] }),
    ];
    const perto = solidos(formas, { origem: [3000, 0, -4000] });
    const a = volume(perto, 'placa');
    contexto.liberar();
    const longe = solidos(formas, { origem: [0, 0, 0] });
    expect(volume(longe, 'placa')).toBeCloseTo(a, 0);
    expect(a).toBeCloseTo((200 * 200 - areaDoPoligono(30, 128)) * 20, 0);
  });

  it('o molde pode ser ele mesmo recortado', () => {
    const s = solidos([
      placa(recorte({ id: 'oco' })),
      cortador('oco', 'caixa', { eixo: 'y', largura: 100, altura: 60, profundidade: 100, centro: [0, 10, 0], ...recorte({ id: 'miolo' }) }),
      cortador('miolo', 'cilindro', { eixo: 'y', diametro: 40, comprimento: 100, centro: [0, 10, 0] }),
    ]);
    /* o molde é a caixa de 100 por 100 sem o miolo cilíndrico, e o que a placa perde é isso */
    expect(volume(s, 'placa')).toBeCloseTo((200 * 200 - (100 * 100 - areaDoPoligono(20, 128))) * 20, 1);
  });

  it('o recorte circular é recusado', () => {
    const s = solidos([
      caixa('a', 10, 10, 10, recorte({ id: 'b' })),
      caixa('b', 10, 10, 10, recorte({ id: 'a' })),
    ]);
    expect(() => s.solido('a')).toThrow(/recorte é circular/);
  });

  it('a folga num molde que não é convexo nem loft é recusada', () => {
    const s = solidos([
      placa(recorte({ id: 'aro', folga: 2 })),
      cortador('aro', 'anel', { eixo: 'y', diametroExterno: 60, diametroInterno: 40, espessura: 40, centro: [0, 10, 0] }),
    ]);
    expect(() => s.solido('placa')).toThrow(/folga de 2 mm só vale para molde convexo ou loft/);
  });

  it('o recorte que remove a forma inteira é recusado', () => {
    const s = solidos([
      caixa('c', 10, 10, 10, recorte({ id: 'grande' })),
      cortador('grande', 'caixa', { eixo: 'y', largura: 100, altura: 100, profundidade: 100 }),
    ]);
    expect(() => s.solido('c')).toThrow(/remove a forma inteira/);
  });
});

describe('a forma de família', () => {
  /* um cubo de 20 mm de lado como malha de polígonos (os quads anti-horários vistos de fora), deslocado em x */
  const cubo = (x0, indiceInicial = 0) => {
    const vertices = [];
    for (const z of [-10, 10]) for (const [x, y] of [[0, -10], [20, -10], [20, 10], [0, 10]]) vertices.push([x + x0, y, z]);
    const i = indiceInicial;
    return { vertices, faces: [[i, i + 3, i + 2, i + 1], [i + 4, i + 5, i + 6, i + 7], [i, i + 1, i + 5, i + 4], [i + 3, i + 7, i + 6, i + 2], [i, i + 4, i + 7, i + 3], [i + 1, i + 2, i + 6, i + 5]] };
  };
  /* duas partes que se sobrepõem em 10 mm (o aro e o pneu de uma roda), com a malha recentrada no centro da caixa dela */
  function malhaDeDuasPartes() {
    const a = cubo(0, 0);
    const b = cubo(10, 8);
    const vertices = [...a.vertices, ...b.vertices].map(([x, y, z]) => [x - 15, y, z]);
    return { vertices, faces: [...a.faces, ...b.faces], partes: [{ nome: 'aro', de: 0, ate: 6 }, { nome: 'pneu', de: 6, ate: 12 }] };
  }
  const familia = (geometria = {}) => forma('roda', 'familia', { familia: 'roda-pneu', perfil: 'trem', parametros: {}, eixo: 'y', ...geometria });

  it('é a união das partes da malha, que se sobrepõem: a sobreposição conta uma vez', () => {
    const s = solidos([familia({ centro: [100, 0, 0] })], { malhaDaFamilia: malhaDeDuasPartes });
    expect(volume(s, 'roda')).toBeCloseTo(20 * 20 * 20 + 20 * 20 * 20 - 10 * 20 * 20, 2);
    const { min, max } = caixaDe(s, 'roda');
    expect(min[0]).toBeCloseTo(85, 4);
    expect(max[0]).toBeCloseTo(115, 4);
  });

  it('é girada pela matriz da forma e espelhada sem virar do avesso', () => {
    const s = solidos([familia({ centro: [0, 0, 0], matriz: [[0, -1, 0], [1, 0, 0], [0, 0, 1]] })], { malhaDaFamilia: malhaDeDuasPartes });
    const { min, max } = caixaDe(s, 'roda');
    expect(max[1] - min[1]).toBeCloseTo(30, 4);
    expect(max[0] - min[0]).toBeCloseTo(20, 4);
    const espelhada = solidos([familia({ matriz: [[-1, 0, 0], [0, 1, 0], [0, 0, 1]] })], { malhaDaFamilia: malhaDeDuasPartes });
    expect(volume(espelhada, 'roda')).toBeCloseTo(12000, 2);
  });

  it('o recorte vale na família, e a malha entregue é a que o provedor dá (não o casco)', () => {
    const molde = cortador('molde', 'caixa', { eixo: 'y', largura: 6, altura: 6, profundidade: 6, centro: [0, 0, 0] });
    const s = solidos([familia(recorte({ id: 'molde' })), molde], { malhaDaFamilia: malhaDeDuasPartes });
    expect(volume(s, 'roda')).toBeCloseTo(12000 - 6 * 6 * 6, 3);
  });

  it('sem provedor da malha, a família é recusada dizendo o que falta', () => {
    const s = solidos([familia()]);
    expect(() => s.solido('roda')).toThrow(/não recebeu o provedor da malha/);
  });

  it('a parte que não fecha é recusada, dizendo a parte', () => {
    const aberta = () => {
      const m = malhaDeDuasPartes();
      return { ...m, faces: m.faces.filter((_, k) => k !== 7) };
    };
    const s = solidos([familia()], { malhaDaFamilia: aberta });
    expect(() => s.solido('roda')).toThrow(/a malha da parte "pneu" da forma "roda" \(família roda-pneu\) não forma um sólido fechado/);
  });
});

describe('o que a N2 recusa', () => {
  it('o volume que a N2 recusa vira recusa da forma, dizendo o que ela disse', () => {
    /* uma extrusão cujo perfil cruza a si mesmo: o esboço não a conhece, a N2 recusa */
    const extrusao = forma('x', 'extrusao', { eixo: 'y', eixosDoPerfil: ['x', 'z'], comprimento: 10, convexo: false, perfil: [[0, 0], [10, 10], [10, 0], [0, 10]] });
    const s = solidos([extrusao]);
    expect(() => s.solido('x')).toThrow(ErroDoSolido);
    expect(() => s.solido('x')).toThrow(/forma "x" \(extrusao\): a N2 recusa o volume/);
  });

  it('o loft cujo casco a N2 recusa cai nas peças convexas das seções, em vez de falhar', () => {
    const s = solidos([forma('l', 'loft', {
      eixo: 'z', eixosDoPerfil: ['x', 'y'], comprimento: 100,
      /* seções de números de pontos diferentes: o casco da N2 exige o mesmo número em todas */
      secoes: [{ w: 0, perfil: retangulo(20, 20) }, { w: 100, perfil: [[-10, -10], [10, -10], [0, 10]] }],
    })]);
    expect(volume(s, 'l')).toBeGreaterThan(0);
  });
});

describe('as malhas', () => {
  it('o volume com sinal é positivo para as faces que olham para fora', () => {
    const vertices = [[0, 0, 0], [10, 0, 0], [0, 10, 0], [0, 0, 10]];
    const fora = [[0, 2, 1], [0, 1, 3], [0, 3, 2], [1, 2, 3]];
    expect(volumeAssinado(vertices, fora)).toBeCloseTo(1000 / 6, 6);
    expect(volumeAssinado(vertices, fora.map(([a, b, c]) => [a, c, b]))).toBeCloseTo(-1000 / 6, 6);
  });

  it('a solda funde os vértices coincidentes, tira o triângulo sem área e o vértice sem uso', () => {
    const vertices = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 0.00001], [5, 5, 5]];
    const r = soldarMalha(vertices, [[0, 1, 2], [3, 1, 2], [0, 3, 1]]);
    expect(r.vertices).toHaveLength(3);
    expect(r.triangulos).toEqual([[0, 1, 2], [0, 1, 2]]);
  });

  it('o polígono convexo vira um leque e o côncavo sai por orelhas, sempre com a normal do polígono', () => {
    const l = [[0, 0, 0], [4, 0, 0], [4, 4, 0], [2, 1, 0], [0, 4, 0]];
    const areaCom = (tris) => tris.reduce((a, [i, j, k]) => a + ((l[j][0] - l[i][0]) * (l[k][1] - l[i][1]) - (l[j][1] - l[i][1]) * (l[k][0] - l[i][0])) / 2, 0);
    const concavo = triangularPoligonos(l, [[0, 1, 2, 3, 4]]);
    expect(areaCom(concavo)).toBeCloseTo(16 - 6, 6);
    const clockwise = triangularPoligonos(l, [[4, 3, 2, 1, 0]]);
    expect(areaCom(clockwise)).toBeCloseTo(-(16 - 6), 6);
    const quad = triangularPoligonos([[0, 0, 0], [2, 0, 0], [2, 2, 0], [0, 2, 0]], [[0, 1, 2, 3]]);
    expect(quad).toEqual([[0, 1, 2], [0, 2, 3]]);
  });
});

describe('o contexto', () => {
  it('é determinístico: as mesmas formas dão a mesma malha, vértice a vértice', () => {
    const formas = [
      caixa('placa', 200, 20, 200, { centro: [0, 10, 0], ...recorte({ id: 'furo' }) }),
      cortador('furo', 'cilindro', { eixo: 'y', diametro: 60, comprimento: 100, centro: [20, 10, 0] }),
    ];
    const primeira = solidos(formas);
    const a = contexto.malha(primeira.solido('placa'));
    contexto.liberar();
    const segunda = solidos(formas);
    expect(contexto.malha(segunda.solido('placa'))).toEqual(a);
  });

  it('recusa as formas que não são o formato das formas resolvidas', () => {
    contexto = criarContextoDeSolidos();
    expect(() => criarSolidosDoEsboco({ formas: [] }, { contexto })).toThrow(ErroDoSolido);
    expect(() => criarSolidosDoEsboco(dados(), {})).toThrow(/precisa do contexto da Manifold/);
  });

  it('a malha sem volume ou aberta é recusada com o motivo', () => {
    contexto = criarContextoDeSolidos();
    expect(() => contexto.daMalha([[0, 0, 0], [1, 0, 0], [0, 1, 0]], [[0, 1, 2]], 'a malha do plano')).toThrow(/a malha do plano não tem volume/);
    const vertices = [[0, 0, 0], [10, 0, 0], [0, 10, 0], [0, 0, 10]];
    expect(() => contexto.daMalha(vertices, [[0, 1, 3], [0, 3, 2], [1, 2, 3]], 'o tetraedro aberto')).toThrow(/o tetraedro aberto não forma um sólido fechado e orientado \(Manifold: /);
  });
});
