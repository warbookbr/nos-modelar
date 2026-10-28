/* Primitivas do nível zero na forma global N2: cone (com tronco), esfera, anel, revolução, extrusão côncava e tubo.
   Cada uma é provada por envelope medido, malha fechada com a normal para fora e volume conhecido, determinismo e recusa
   de entrada inválida com campo, valor e o que é aceito. */
import { describe, expect, it } from 'vitest';
import {
  ErroFormaGlobal, TIPOS_VOLUME_FORMA_GLOBAL, compilarBlocagemGlobal, normalizarAndaimeGlobal,
} from '../../src/autoria/forma-global.js';

const EIXOS = { direita: '+x', cima: '+y', frente: '+z' };
const quadrado = (lado) => ({ contornos: [{ id: 'massa', papel: 'massa-primaria', pontos: [[-lado, -lado], [lado, -lado], [lado, lado], [-lado, lado]] }] });

/* Alvo e andaime mínimos para compilar um volume só: o envelope é largo, porque aqui se mede o envelope derivado da malha. */
function alvoLargo() {
  return {
    formato: 'mecanifica.alvo-forma-global@2', id: 'alvo-primitiva', objetivo: 'primitiva', familia: 'peca-mecanica',
    intencao: 'compilar uma primitiva isolada', unidade: 'mm', eixos: EIXOS,
    envelope: { min: [-1000, -1000, -1000], max: [1000, 1000, 1000] },
    procedencia: { tipo: 'teste', referencias: ['repo://tools/modelar/forma-global-n2-primitivas.test.mjs'] },
    rubrica: { id: 'primitiva', categoriaEsperada: 'primitiva', criterios: ['categoria-identificavel'], papeisAuxiliares: [] },
    landmarks: [{ id: 'origem', posicao: [0, 0, 0], tolerancia: 10 }], regioesObrigatorias: ['corpo'],
    vistas: { frontal: quadrado(1000), direita: quadrado(1000), superior: quadrado(1000) },
    limiares: { iouMinimo: 0, desvioMaximo: 1, erroEnvelopeRelativoMaximo: 1, erroLandmarkNormalizadoMaximo: 1 },
    orcamento: { volumesMaximos: 8, triangulosMaximos: 20000, resolucaoGrade: 64 }, rejeicoes: ['forma-parcial'],
  };
}
const andaimeCom = (...volumes) => ({
  formato: 'mecanifica.andaime-global@2', id: 'andaime-primitiva', objetivo: 'primitiva', alvo: 'alvo-primitiva', familia: 'peca-mecanica',
  intencao: 'compilar uma primitiva isolada', unidade: 'mm', eixos: EIXOS,
  envelope: { min: [-1000, -1000, -1000], max: [1000, 1000, 1000] }, landmarks: [{ id: 'origem', posicao: [0, 0, 0] }], volumes,
});
const volume = (tipo, campos, centro = [0, 0, 0]) => ({ id: `${tipo}-teste`, regioes: ['corpo'], tipo, centro, ...campos });
const compilar = (v) => compilarBlocagemGlobal({ alvo: alvoLargo(), andaime: andaimeCom(v) });

/* Volume com sinal pelo divergente (positivo com a normal para fora) e arestas sem par oposto (zero numa malha fechada). */
function medirMalha({ malha }) {
  let soma = 0;
  const arestas = new Map();
  for (const { vertices: [i, j, k] } of malha.faces) {
    const a = malha.vertices[i], b = malha.vertices[j], c = malha.vertices[k];
    soma += (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6;
    for (const [de, para] of [[i, j], [j, k], [k, i]]) arestas.set(`${de}>${para}`, (arestas.get(`${de}>${para}`) ?? 0) + 1);
  }
  let semPar = 0;
  for (const [chave, quantas] of arestas) {
    const [de, para] = chave.split('>');
    if (quantas !== 1 || arestas.get(`${para}>${de}`) !== 1) semPar++;
  }
  return { volume: soma, arestasSemPar: semPar };
}

/* Volume exato de um sólido de revolução em n lados com perfil linear por partes: (n/2) sen(2π/n) ∫ r² dh. */
function volumeDeRevolucao(perfil, n) {
  let integral = 0;
  for (let i = 0; i < perfil.length - 1; i++) {
    const [r1, h1] = perfil[i], [r2, h2] = perfil[i + 1];
    integral += (h2 - h1) * (r1 * r1 + r1 * r2 + r2 * r2) / 3;
  }
  return (n / 2) * Math.sin(2 * Math.PI / n) * integral;
}

const perto = (lista, esperado) => lista.forEach((valor, i) => expect(valor).toBeCloseTo(esperado[i], 6));

const PERFIL_COPO = [[0, 0], [30, 0], [30, 8], [22, 8], [22, 50], [0, 50]];
const PERFIL_L = [[0, 0], [60, 0], [60, 10], [10, 10], [10, 40], [0, 40]];

const CASOS = [
  {
    nome: 'cone', volume: volume('cone', { eixo: 'x', raioBase: 30, raioTopo: 0, comprimento: 90, segmentos: 64 }, [5, 6, 7]),
    envelope: { min: [-40, -24, -23], max: [50, 36, 37] }, triangulos: 128, volumeEsperado: volumeDeRevolucao([[30, -45], [0, 45]], 64),
  },
  {
    nome: 'tronco de cone', volume: volume('cone', { eixo: 'z', raioBase: 20, raioTopo: 35, comprimento: 50, segmentos: 32 }),
    envelope: { min: [-35, -35, -25], max: [35, 35, 25] }, triangulos: 128, volumeEsperado: volumeDeRevolucao([[20, -25], [35, 25]], 32),
  },
  {
    nome: 'esfera', volume: volume('esfera', { raio: 40, segmentos: 64 }, [10, 20, 30]),
    envelope: { min: [-30, -20, -10], max: [50, 60, 70] }, triangulos: 64 * 62,
    volumeEsperado: (4 / 3) * Math.PI * 40 ** 3, tolerancia: 0.02,
  },
  {
    nome: 'anel', volume: volume('anel', { eixo: 'y', raioExterno: 50, raioInterno: 30, espessura: 12, segmentos: 64 }),
    envelope: { min: [-50, -6, -50], max: [50, 6, 50] }, triangulos: 512,
    volumeEsperado: volumeDeRevolucao([[50, -6], [50, 6]], 64) - volumeDeRevolucao([[30, -6], [30, 6]], 64),
  },
  {
    nome: 'revolução de perfil', volume: volume('revolucao', { eixo: 'y', perfil: PERFIL_COPO, segmentos: 48 }, [0, 100, 0]),
    envelope: { min: [-30, 75, -30], max: [30, 125, 30] }, triangulos: 384, volumeEsperado: volumeDeRevolucao(PERFIL_COPO, 48),
  },
  {
    nome: 'extrusão de perfil côncavo', volume: volume('extrusao', { eixoExtrusao: 'y', eixosPerfil: ['x', 'z'], comprimento: 20, perfil: PERFIL_L }, [100, 0, 0]),
    envelope: { min: [100, -10, 0], max: [160, 10, 40] }, triangulos: 20, volumeEsperado: 20 * (60 * 10 + 10 * 30),
  },
  {
    nome: 'tubo com raio de curva', volume: volume('tubo', {
      caminho: [[0, 0, 0], [100, 0, 0], [100, 100, 0], [100, 100, 100]], raio: 5, raioCurva: 20, segmentos: 32,
    }),
    envelope: { min: [0, -5, -5], max: [105, 105, 100] }, triangulos: 2176, volumeEsperado: Math.PI * 25 * (300 - 2 * (2 * 20 - Math.PI * 20 / 2)), tolerancia: 0.01,
  },
  {
    nome: 'tubo com canto em meia-esquadria', volume: volume('tubo', { caminho: [[0, 0, 0], [100, 0, 0], [100, 100, 0]], raio: 5, raioCurva: 0, segmentos: 32 }),
    envelope: { min: [0, -5, -5], max: [105, 100, 5] }, triangulos: 192, volumeEsperado: Math.PI * 25 * 200, tolerancia: 0.02,
  },
];

describe('N2 — primitivas do nível zero', () => {
  it('declara as seis primitivas no vocabulário de volumes, depois dos quatro anteriores', () => {
    expect(TIPOS_VOLUME_FORMA_GLOBAL).toEqual(['caixa', 'cilindro', 'prisma', 'casco-secoes', 'cone', 'esfera', 'anel', 'revolucao', 'extrusao', 'tubo']);
  });

  describe.each(CASOS)('$nome', (caso) => {
    it('mede o envelope da malha e conta os triângulos', () => {
      const blocagem = compilar(caso.volume);
      perto(blocagem.envelopeDerivado.min, caso.envelope.min);
      perto(blocagem.envelopeDerivado.max, caso.envelope.max);
      expect(blocagem.estatisticas.triangulos).toBe(caso.triangulos);
      expect(blocagem.volumes).toHaveLength(1);
      expect(blocagem.volumes[0]).toMatchObject({ id: caso.volume.id, tipo: caso.volume.tipo, quantidadeTriangulos: caso.triangulos });
      expect(blocagem.malha.faces.every((face) => face.volume === caso.volume.id && face.regioes[0] === 'corpo')).toBe(true);
    });

    it('gera uma malha fechada, com a normal para fora e o volume esperado', () => {
      const { volume: medido, arestasSemPar } = medirMalha(compilar(caso.volume));
      expect(arestasSemPar).toBe(0);
      expect(medido).toBeGreaterThan(0);
      expect(Math.abs(medido - caso.volumeEsperado) / caso.volumeEsperado).toBeLessThanOrEqual(caso.tolerancia ?? 1e-9);
    });

    it('é determinística: o mesmo andaime dá a mesma blocagem, byte a byte', () => {
      const primeira = JSON.stringify(compilar(caso.volume)), segunda = JSON.stringify(compilar(structuredClone(caso.volume)));
      expect(segunda).toBe(primeira);
      expect(primeira).not.toMatch(/NaN|null/);
    });
  });

  it('aceita os três arranjos de eixos de perfil da extrusão, com a mesma área e a normal para fora', () => {
    const arranjos = [
      { eixoExtrusao: 'x', eixosPerfil: ['y', 'z'], perfil: PERFIL_L },
      { eixoExtrusao: 'x', eixosPerfil: ['z', 'y'], perfil: PERFIL_L },
      { eixoExtrusao: 'y', eixosPerfil: ['z', 'x'], perfil: [...PERFIL_L].reverse() },
      { eixoExtrusao: 'z', eixosPerfil: ['y', 'x'], perfil: PERFIL_L },
    ];
    for (const arranjo of arranjos) {
      const medido = medirMalha(compilar(volume('extrusao', { comprimento: 20, ...arranjo })));
      expect(medido.arestasSemPar).toBe(0);
      expect(medido.volume).toBeCloseTo(20 * (60 * 10 + 10 * 30), 6);
    }
  });

  it('põe a esfera com o equador e os quatro pontos cardeais em vértices, e o raio exato no envelope', () => {
    const { envelopeDerivado } = compilar(volume('esfera', { raio: 40, segmentos: 8 }));
    perto(envelopeDerivado.min, [-40, -40, -40]);
    perto(envelopeDerivado.max, [40, 40, 40]);
  });

  it('deixa a revolução com degraus e cinturas côncavas fechada', () => {
    const perfil = [[10, 0], [30, 0], [30, 10], [12, 10], [12, 25], [30, 25], [30, 35], [10, 35]];
    const medido = medirMalha(compilar(volume('revolucao', { eixo: 'x', perfil, segmentos: 24 })));
    expect(medido.arestasSemPar).toBe(0);
    expect(medido.volume).toBeCloseTo(volumeDeRevolucao(perfil, 24), 6);
  });

  it('mantém o tubo fechado e sem torção em um caminho tridimensional com várias curvas', () => {
    const tubo = volume('tubo', {
      caminho: [[0, 0, 0], [80, 0, 0], [80, 80, 0], [80, 80, 80], [0, 80, 80]], raio: 6, raioCurva: 15, segmentos: 24,
    });
    const medido = medirMalha(compilar(tubo));
    expect(medido.arestasSemPar).toBe(0);
    /* a seção de 24 lados tem a área do círculo vezes n sen(2π/n) / 2π */
    const comprimento = 320 - 3 * (2 * 15 - Math.PI * 15 / 2), esperado = Math.PI * 36 * comprimento * (24 * Math.sin(2 * Math.PI / 24)) / (2 * Math.PI);
    expect(Math.abs(medido.volume - esperado) / esperado).toBeLessThan(0.002);
  });

  it('reduz o arco do tubo a seções retas de no máximo 6 graus', () => {
    const quarto = compilar(volume('tubo', { caminho: [[0, 0, 0], [100, 0, 0], [100, 100, 0]], raio: 5, raioCurva: 20, segmentos: 8 }));
    /* 90 graus a 6 graus por seção dão 15 passos e 16 pontos de arco; com os dois extremos são 18 anéis de 8 vértices e 2 centros */
    expect(quarto.malha.vertices).toHaveLength(18 * 8 + 2);
  });

  it('coloca no mesmo andaime todas as primitivas e as quatro anteriores sem perder a identidade dos volumes', () => {
    const andaime = normalizarAndaimeGlobal(andaimeCom(
      ...CASOS.map((caso, i) => ({ ...caso.volume, id: `volume-${i}` })),
      volume('caixa', { dimensoes: [10, 10, 10] }), volume('cilindro', { eixo: 'y', raio: 5, comprimento: 10, segmentos: 16 }),
    ));
    expect(andaime.volumes.map(({ tipo }) => tipo).sort()).toEqual(
      ['anel', 'caixa', 'cilindro', 'cone', 'cone', 'esfera', 'extrusao', 'revolucao', 'tubo', 'tubo'],
    );
  });
});

/* O contrato da recusa: o caminho do campo, o que chegou e o que é aceito. */
function recusa(volumeInvalido) {
  try { normalizarAndaimeGlobal(andaimeCom(volumeInvalido)); } catch (erro) { return erro; }
  return null;
}
const CONE = { eixo: 'y', raioBase: 20, raioTopo: 5, comprimento: 40, segmentos: 32 };
const ESFERA = { raio: 20, segmentos: 32 };
const ANEL = { eixo: 'y', raioExterno: 30, raioInterno: 20, espessura: 6, segmentos: 32 };
const REVOLUCAO = { eixo: 'y', perfil: PERFIL_COPO, segmentos: 24 };
const EXTRUSAO = { eixoExtrusao: 'y', eixosPerfil: ['x', 'z'], comprimento: 10, perfil: PERFIL_L };
const TUBO = { caminho: [[0, 0, 0], [100, 0, 0], [100, 100, 0]], raio: 5, raioCurva: 20, segmentos: 16 };

const RECUSAS = [
  ['cone', CONE, { eixo: 'w' }, 'eixo-invalido', 'volumes[0].eixo', '"w"', "'x', 'y' ou 'z'"],
  ['cone', CONE, { raioBase: -1 }, 'numero-invalido', 'volumes[0].raioBase', '-1', 'maior ou igual a zero'],
  ['cone', CONE, { raioTopo: 20 }, 'cone-degenerado', 'volumes[0].raioTopo', '20', "cilindro"],
  ['cone', CONE, { raioBase: 0, raioTopo: 0 }, 'cone-degenerado', 'volumes[0].raioBase', '0', 'maior que zero'],
  ['cone', CONE, { comprimento: 0 }, 'numero-invalido', 'volumes[0].comprimento', '0', 'maior que zero'],
  ['cone', CONE, { segmentos: 4 }, 'numero-invalido', 'volumes[0].segmentos', '4', 'inteiro de 8 a 128'],
  ['cone', CONE, { segmentos: 12.5 }, 'numero-invalido', 'volumes[0].segmentos', '12.5', 'inteiro de 8 a 128'],
  ['cone', CONE, { raioTopo: '5' }, 'numero-invalido', 'volumes[0].raioTopo', '"5"', 'maior ou igual a zero'],
  ['esfera', ESFERA, { raio: 0 }, 'numero-invalido', 'volumes[0].raio', '0', 'maior que zero'],
  ['esfera', ESFERA, { raio: Infinity }, 'numero-invalido', 'volumes[0].raio', 'Infinity', 'finito'],
  ['esfera', ESFERA, { segmentos: 30 }, 'numero-invalido', 'volumes[0].segmentos', '30', 'múltiplo de 4'],
  ['esfera', ESFERA, { segmentos: 4 }, 'numero-invalido', 'volumes[0].segmentos', '4', 'inteiro de 8 a 128'],
  ['anel', ANEL, { raioInterno: 30 }, 'anel-degenerado', 'volumes[0].raioInterno', '30', 'menor que raioExterno (30)'],
  ['anel', ANEL, { raioInterno: 0 }, 'numero-invalido', 'volumes[0].raioInterno', '0', 'maior que zero'],
  ['anel', ANEL, { espessura: -2 }, 'numero-invalido', 'volumes[0].espessura', '-2', 'maior que zero'],
  ['anel', ANEL, { eixo: 'xy' }, 'eixo-invalido', 'volumes[0].eixo', '"xy"', "'x', 'y' ou 'z'"],
  ['revolucao', REVOLUCAO, { perfil: [[5, 0]] }, 'perfil-invalido', 'volumes[0].perfil', '[[5,0]]', 'lista de 2 a 256 pontos'],
  ['revolucao', REVOLUCAO, { perfil: [[5, 0], [5, -3]] }, 'perfil-invalido', 'volumes[0].perfil[1][1]', '-3', 'não volte atrás'],
  ['revolucao', REVOLUCAO, { perfil: [[5, 0], [-5, 3]] }, 'perfil-invalido', 'volumes[0].perfil[1][0]', '-5', 'maior ou igual a zero'],
  ['revolucao', REVOLUCAO, { perfil: [[5, 0], [0, 3], [5, 6]] }, 'perfil-invalido', 'volumes[0].perfil[1][0]', '0', 'primeiro e no último'],
  ['revolucao', REVOLUCAO, { perfil: [[5, 0], [5, 0], [8, 3]] }, 'perfil-invalido', 'volumes[0].perfil[1]', '[5,0]', 'diferente do anterior'],
  ['revolucao', REVOLUCAO, { perfil: [[0, 0], [0, 4]] }, 'perfil-invalido', 'volumes[0].perfil', '[[0,0],[0,4]]', 'raio maior que zero'],
  ['revolucao', REVOLUCAO, { perfil: [[5, 0], [5]] }, 'ponto-invalido', 'volumes[0].perfil[1]', '[5]', 'dois números finitos'],
  ['extrusao', EXTRUSAO, { perfil: [[0, 0], [10, 10], [10, 0], [0, 10]] }, 'perfil-nao-simples', 'volumes[0].perfil', '[[0,0],[10,10],[10,0],[0,10]]', 'arestas que se cruzem'],
  ['extrusao', EXTRUSAO, { perfil: [[0, 0], [10, 0], [20, 0]] }, 'perfil-nao-simples', 'volumes[0].perfil', '[[0,0],[10,0],[20,0]]', 'área nula'],
  ['extrusao', EXTRUSAO, { perfil: [[0, 0], [10, 0]] }, 'perfil-invalido', 'volumes[0].perfil', '[[0,0],[10,0]]', 'lista de 3 a 512 pontos'],
  ['extrusao', EXTRUSAO, { eixosPerfil: ['x', 'y'] }, 'eixos-perfil-invalidos', 'volumes[0].eixosPerfil', '["x","y"]', "eixoExtrusao ('y')"],
  ['extrusao', EXTRUSAO, { comprimento: -1 }, 'numero-invalido', 'volumes[0].comprimento', '-1', 'maior que zero'],
  ['tubo', TUBO, { caminho: [[0, 0, 0]] }, 'caminho-invalido', 'volumes[0].caminho', '[[0,0,0]]', 'lista de 2 a 64 pontos'],
  ['tubo', TUBO, { caminho: [[0, 0, 0], [0, 0, 0], [50, 0, 0]] }, 'caminho-invalido', 'volumes[0].caminho[1]', '[0,0,0]', 'diferente do anterior'],
  ['tubo', TUBO, { caminho: [[0, 0, 0], [50, 0, 0], [0, 0, 0]] }, 'caminho-invalido', 'volumes[0].caminho[1]', '[50,0,0]', 'não volte sobre si mesmo'],
  ['tubo', TUBO, { caminho: [[0, 0, 0], [50, 0, NaN]] }, 'ponto-invalido', 'volumes[0].caminho[1]', '[50,0,null]', 'três números finitos'],
  ['tubo', TUBO, { raio: 0 }, 'numero-invalido', 'volumes[0].raio', '0', 'maior que zero'],
  ['tubo', TUBO, { raioCurva: 5 }, 'raio-curva-invalido', 'volumes[0].raioCurva', '5', 'maior que o raio do tubo (5)'],
  ['tubo', TUBO, { raioCurva: 150 }, 'raio-curva-invalido', 'volumes[0].raioCurva', '150', 'caiba no trecho 1'],
  ['tubo', TUBO, { caminho: [[0, 0, 0], [4, 0, 0], [4, 100, 0]], raioCurva: 0 }, 'caminho-invalido', 'volumes[0].caminho[1]', '[4,0,0]', 'meia-esquadria'],
  ['tubo', TUBO, { segmentos: 200 }, 'numero-invalido', 'volumes[0].segmentos', '200', 'inteiro de 8 a 128'],
];

describe('N2 — recusa das primitivas', () => {
  it.each(RECUSAS)('%s: %j + %j recusa com o campo, o valor e o aceito', (tipo, completo, troca, codigo, caminho, valorTexto, aceito) => {
    expect(recusa(volume(tipo, completo))).toBeNull();
    const erro = recusa(volume(tipo, { ...completo, ...troca }));
    expect(erro).toBeInstanceOf(ErroFormaGlobal);
    expect(erro.codigo).toBe(codigo);
    expect(erro.caminho).toBe(caminho);
    expect(erro.message.startsWith(`${caminho}: recebeu ${valorTexto}; aceita `)).toBe(true);
    expect(erro.message).toContain(aceito);
  });

  it('diz os campos que faltam, os que sobram e os que o tipo aceita', () => {
    const { raioTopo, ...semTopo } = CONE;
    const erro = recusa(volume('cone', { ...semTopo, raio: 3 }));
    expect(erro).toBeInstanceOf(ErroFormaGlobal);
    expect(erro.codigo).toBe('campos-invalidos');
    expect(erro.message).toBe('volumes[0]: campos ausentes: raioTopo; extras: raio; o tipo \'cone\' aceita exatamente: centro, comprimento, eixo, id, raioBase, raioTopo, regioes, segmentos, tipo.');
    expect(raioTopo).toBe(5);
  });

  it('diz o tipo recebido e a lista de tipos aceitos quando o tipo não existe', () => {
    const erro = recusa(volume('piramide', {}));
    expect(erro.codigo).toBe('tipo-volume-invalido');
    expect(erro.message).toBe('volumes[0].tipo: recebeu "piramide"; aceita caixa, cilindro, prisma, casco-secoes, cone, esfera, anel, revolucao, extrusao, tubo.');
  });

  it('recusa a esfera com eixo, porque os polos ficam sempre em y', () => {
    const erro = recusa(volume('esfera', { ...ESFERA, eixo: 'x' }));
    expect(erro.codigo).toBe('campos-invalidos');
    expect(erro.message).toContain('extras: eixo');
  });
});
