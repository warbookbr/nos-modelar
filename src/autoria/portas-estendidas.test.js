/* portas-estendidas.test.js — suíte de testes completa para portas estendidas do núcleo:
   plano de apoio, padrão de furos, trilho e classes de ajuste. */
import { describe, expect, it } from 'vitest';
import { nucleo } from '../../procedural/nucleo/nucleo.js';
import {
  CLASSES_DE_AJUSTE,
  obterFolgaPorClasseAjuste,
  obterFolgaPorClasseAjusteEmMetros,
  resolverPortasDeMontagem,
  validarAssentamentoPlano,
  validarEncaixePadraoFuros,
  validarEncaixeTrilho,
  formatarDiagnosticoDeEncaixe,
} from './interfaces-montagem.js';
import { conferirPortasNaForma } from './porta-confere-forma.js';
import { MEDIDAS_DE_PORTA, lerVinculos, valorDoVinculo } from './vinculos-de-medida.js';
import { poseQueEncaixa, interfaceNoMundo, ErroPosicaoPorPorta } from './posicao-por-porta.js';

describe('Tabela e cálculo de classes de ajuste (ISO 286)', () => {
  it('exporta as três classes padronizadas', () => {
    expect(CLASSES_DE_AJUSTE).toEqual(['folgado', 'transicao', 'interferencia']);
  });

  it('calcula folgas nominais em mm para faixas da ISO 286 (H7/g6, H7/k6, H7/p6)', () => {
    // Faixa 1: <= 3 mm (ex: 2.5 mm)
    // H7 (ES=+10, EI=0), g6 (es=-2, ei=-8), k6 (es=+6, ei=0), p6 (es=+12, ei=+6) em um
    const fPequeno = obterFolgaPorClasseAjuste('folgado', 2.5);
    expect(fPequeno.folgaMinMm).toBeCloseTo(0.002, 6); // EI - es = 0 - (-2) = +2 um
    expect(fPequeno.folgaMaxMm).toBeCloseTo(0.018, 6); // ES - ei = 10 - (-8) = +18 um

    const tPequeno = obterFolgaPorClasseAjuste('transicao', 2.5);
    expect(tPequeno.folgaMinMm).toBeCloseTo(-0.006, 6); // EI - es = 0 - (+6) = -6 um
    expect(tPequeno.folgaMaxMm).toBeCloseTo(0.010, 6);  // ES - ei = 10 - 0 = +10 um

    const iPequeno = obterFolgaPorClasseAjuste('interferencia', 2.5);
    expect(iPequeno.folgaMinMm).toBeCloseTo(-0.012, 6); // EI - es = 0 - (+12) = -12 um
    expect(iPequeno.folgaMaxMm).toBeCloseTo(0.004, 6);  // ES - ei = 10 - (+6) = +4 um
    expect(iPequeno.interferenciaMaxMm).toBeCloseTo(0.012, 6);

    // Faixa 2: > 18 até 30 mm (ex: 20 mm ou 25 mm)
    // H7 (ES=+21, EI=0), g6 (es=-7, ei=-20), k6 (es=+15, ei=+2), p6 (es=+35, ei=+22) em um
    const fMedio = obterFolgaPorClasseAjuste('folgado', 20);
    expect(fMedio.folgaMinMm).toBeCloseTo(0.007, 6); // 0 - (-7) = +7 um
    expect(fMedio.folgaMaxMm).toBeCloseTo(0.041, 6); // 21 - (-20) = +41 um

    const tMedio = obterFolgaPorClasseAjuste('transicao', 20);
    expect(tMedio.folgaMinMm).toBeCloseTo(-0.015, 6); // 0 - (+15) = -15 um
    expect(tMedio.folgaMaxMm).toBeCloseTo(0.019, 6);  // 21 - (+2) = +19 um

    const iMedio = obterFolgaPorClasseAjuste('interferencia', 20);
    expect(iMedio.folgaMinMm).toBeCloseTo(-0.035, 6); // 0 - (+35) = -35 um
    expect(iMedio.folgaMaxMm).toBeCloseTo(-0.001, 6); // 21 - (+22) = -1 um
    expect(iMedio.interferenciaMaxMm).toBeCloseTo(0.035, 6);

    // Faixa 3: > 30 até 50 mm (ex: 40 mm)
    // H7 (ES=+25, EI=0), g6 (es=-9, ei=-25), k6 (es=+18, ei=+2), p6 (es=+42, ei=+26) em um
    const fGrande = obterFolgaPorClasseAjuste('folgado', 40);
    expect(fGrande.folgaMinMm).toBeCloseTo(0.009, 6); // 0 - (-9) = +9 um
    expect(fGrande.folgaMaxMm).toBeCloseTo(0.050, 6); // 25 - (-25) = +50 um

    const tGrande = obterFolgaPorClasseAjuste('transicao', 40);
    expect(tGrande.folgaMinMm).toBeCloseTo(-0.018, 6); // 0 - (+18) = -18 um
    expect(tGrande.folgaMaxMm).toBeCloseTo(0.023, 6);  // 25 - (+2) = +23 um

    const iGrande = obterFolgaPorClasseAjuste('interferencia', 40);
    expect(iGrande.folgaMinMm).toBeCloseTo(-0.042, 6); // 0 - (+42) = -42 um
    expect(iGrande.folgaMaxMm).toBeCloseTo(-0.001, 6); // 25 - (+26) = -1 um
    expect(iGrande.interferenciaMaxMm).toBeCloseTo(0.042, 6);
  });

  it('calcula folgas em metros', () => {
    const fMetro = obterFolgaPorClasseAjusteEmMetros('folgado', 0.020);
    expect(fMetro.folgaMinM).toBeCloseTo(0.000007, 6);
    expect(fMetro.folgaMaxM).toBeCloseTo(0.000041, 6);
  });

  it('retorna erro para classe desconhecida ou diâmetro inválido', () => {
    expect(() => obterFolgaPorClasseAjuste('desconhecida', 10)).toThrow(/desconhecida/);
    expect(() => obterFolgaPorClasseAjuste('folgado', -5)).toThrow(/dimensaoNominalMm/);
  });
});

describe('Publicação no núcleo de portas estendidas', () => {
  const cuboBase = [
    ['cubo', { origemId: 1, lado: 0.1 }],
  ];

  it('publica porta de plano de apoio válida', () => {
    const passos = [
      ...cuboBase,
      ['publicarPorta', {
        id: 'apoio-base',
        rotulo: 'Apoio Base',
        de: { op: 'cubo', id: 1 },
        interface: {
          forma: 'plano',
          papel: 'apoia',
          ponto: [0, 0, 0],
          normal: [0, -1, 0],
          extensao: [0.1, 0.1],
          classeAjuste: 'folgado',
        },
      }],
    ];
    const n = nucleo(passos, {}, {}, {}, null, []);
    expect(n.orfaos).toEqual([]);
    const porta = n.portas.get('apoio-base');
    expect(porta).toBeDefined();
    expect(porta.interface.forma).toBe('plano');
    expect(porta.interface.largura).toBe(0.1);
    expect(porta.interface.comprimento).toBe(0.1);
    expect(porta.interface.classeAjuste).toBe('folgado');
  });

  it('recusa porta de plano com parâmetros ausentes ou inválidos', () => {
    const nSemExtensao = nucleo([
      ...cuboBase,
      ['publicarPorta', {
        id: 'p1',
        rotulo: 'P1',
        de: { op: 'cubo', id: 1 },
        interface: { forma: 'plano', papel: 'apoia', ponto: [0, 0, 0], normal: [0, 1, 0] },
      }],
    ], {}, {}, {}, null, []);
    expect(nSemExtensao.orfaos.length).toBeGreaterThan(0);
    expect(nSemExtensao.orfaos[0].motivo).toContain("interface plano exige 'extensao'");

    const nPapelInvalido = nucleo([
      ...cuboBase,
      ['publicarPorta', {
        id: 'p2',
        rotulo: 'P2',
        de: { op: 'cubo', id: 1 },
        interface: { forma: 'plano', papel: 'externa', ponto: [0, 0, 0], normal: [0, 1, 0], extensao: [0.1, 0.1] },
      }],
    ], {}, {}, {}, null, []);
    expect(nPapelInvalido.orfaos[0].motivo).toContain("interface plano.papel precisa ser 'recebe' ou 'apoia'");
  });

  it('publica porta de padrão de furos com lista explícita de centros', () => {
    const passos = [
      ...cuboBase,
      ['publicarPorta', {
        id: 'flange-4furos',
        rotulo: 'Flange 4 Furos',
        de: { op: 'cubo', id: 1 },
        interface: {
          forma: 'padraoFuros',
          papel: 'recebe',
          plano: { ponto: [0, 0.1, 0], normal: [0, 1, 0] },
          diametro: 0.005,
          centros: [
            [-0.03, 0.1, -0.03],
            [0.03, 0.1, -0.03],
            [0.03, 0.1, 0.03],
            [-0.03, 0.1, 0.03],
          ],
        },
      }],
    ];
    const n = nucleo(passos, {}, {}, {}, null, []);
    expect(n.orfaos).toEqual([]);
    const porta = n.portas.get('flange-4furos');
    expect(porta.interface.forma).toBe('padraoFuros');
    expect(porta.interface.quantidade).toBe(4);
    expect(porta.interface.raio).toBe(0.0025);
    expect(porta.interface.centros.length).toBe(4);
  });

  it('publica porta de padrão de furos procedurais (linear e circular)', () => {
    const passosLinear = [
      ...cuboBase,
      ['publicarPorta', {
        id: 'furos-lineares',
        rotulo: 'Furos Lineares',
        de: { op: 'cubo', id: 1 },
        interface: {
          forma: 'padraoFuros',
          papel: 'recebe',
          plano: { ponto: [0, 0.1, 0], normal: [0, 1, 0] },
          diametro: 0.004,
          padrao: { tipo: 'linear', quantidade: 3, passo: 0.02, direcao: [1, 0, 0] },
        },
      }],
    ];
    const nLin = nucleo(passosLinear, {}, {}, {}, null, []);
    expect(nLin.orfaos).toEqual([]);
    const pLin = nLin.portas.get('furos-lineares');
    expect(pLin.interface.quantidade).toBe(3);
    expect(pLin.interface.passo).toBe(0.02);
    expect(pLin.interface.centros).toEqual([
      [0, 0.1, 0],
      [0.02, 0.1, 0],
      [0.04, 0.1, 0],
    ]);

    // Recusa passo <= 0 ou quantidade <= 0
    const nLinInvalido = nucleo([
      ...cuboBase,
      ['publicarPorta', {
        id: 'furos-inv',
        rotulo: 'Furos Inv',
        de: { op: 'cubo', id: 1 },
        interface: {
          forma: 'padraoFuros',
          papel: 'recebe',
          plano: { ponto: [0, 0.1, 0], normal: [0, 1, 0] },
          diametro: 0.004,
          padrao: { tipo: 'linear', quantidade: 0, passo: -0.02, direcao: [1, 0, 0] },
        },
      }],
    ], {}, {}, {}, null, []);
    expect(nLinInvalido.orfaos.length).toBe(1);
    expect(nLinInvalido.orfaos[0].motivo).toMatch(/quantidade precisa ser inteiro > 0|passo precisa ser finito > 0/);

    const passosCircular = [
      ...cuboBase,
      ['publicarPorta', {
        id: 'furos-circulares',
        rotulo: 'Furos Circulares',
        de: { op: 'cubo', id: 1 },
        interface: {
          forma: 'padraoFuros',
          papel: 'recebe',
          plano: { ponto: [0, 0.1, 0], normal: [0, 1, 0] },
          diametro: 0.004,
          padrao: { tipo: 'circular', quantidade: 4, raio: 0.02, anguloInicial: 90 },
        },
      }],
    ];
    const nCirc = nucleo(passosCircular, {}, {}, {}, null, []);
    expect(nCirc.orfaos).toEqual([]);
    const pCirc = nCirc.portas.get('furos-circulares');
    expect(pCirc.interface.quantidade).toBe(4);
    expect(pCirc.interface.centros.length).toBe(4);
    // Em 90 graus (theta = pi/2), primeiro ponto fica em [-0.02, 0.1, 0]
    expect(pCirc.interface.centros[0][0]).toBeCloseTo(-0.02, 5);
    expect(pCirc.interface.centros[0][1]).toBeCloseTo(0.1, 5);
    expect(pCirc.interface.centros[0][2]).toBeCloseTo(0, 5);
  });

  it('montagem exige centros pré-resolvidos pelo núcleo e recusa recalcular a partir de padrao', () => {
    const neutroSemCentros = {
      portas: new Map([
        ['p1', {
          interface: {
            forma: 'padraoFuros',
            papel: 'recebe',
            normal: [0, 1, 0],
            plano: { ponto: [0, 0, 0], normal: [0, 1, 0] },
            diametro: 0.005,
            padrao: { tipo: 'linear', quantidade: 3, passo: 0.02, direcao: [1, 0, 0] },
          },
        }],
      ]),
    };
    const instancias = [
      {
        id: 'inst1',
        neutro: neutroSemCentros,
        escala: 1,
        rotacao: [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
        deslocamento: [0, 0, 0],
      },
    ];
    expect(() => resolverPortasDeMontagem(instancias)).toThrow(/centros precisa ser lista não vazia/);
  });

  it('publica porta de trilho válida', () => {
    const passos = [
      ...cuboBase,
      ['publicarPorta', {
        id: 'guia-linear',
        rotulo: 'Guia Linear',
        de: { op: 'cubo', id: 1 },
        interface: {
          forma: 'trilho',
          papel: 'guia',
          eixo: [0, 0, 1],
          centro: [0, 0.05, 0],
          perfil: { largura: 0.015, altura: 0.010 },
          curso: 0.200,
        },
      }],
    ];
    const n = nucleo(passos, {}, {}, {}, null, []);
    expect(n.orfaos).toEqual([]);
    const porta = n.portas.get('guia-linear');
    expect(porta.interface.forma).toBe('trilho');
    expect(porta.interface.largura).toBe(0.015);
    expect(porta.interface.altura).toBe(0.010);
    expect(porta.interface.curso).toBe(0.200);
  });

  it('recusa trilho com papel que não seja guia ou deslizador', () => {
    const passos = [
      ...cuboBase,
      ['publicarPorta', {
        id: 'guia-linear',
        rotulo: 'Guia Linear',
        de: { op: 'cubo', id: 1 },
        interface: { forma: 'trilho', papel: 'recebe', eixo: [0, 0, 1], centro: [0, 0.05, 0], perfil: { largura: 0.015, altura: 0.010 }, curso: 0.200 },
      }],
    ];
    const n = nucleo(passos, {}, {}, {}, null, []);
    expect(n.orfaos[0].motivo).toContain("'guia' ou 'deslizador'");
  });
});

describe('Conferência de portas na malha (porta-confere-forma)', () => {
  it('plano no lugar da face passa; plano deslocado reprova com porta-fora-do-plano', () => {
    // Face superior do cubo apoiado em y=0 tem topo em y = 0.1
    const planoCorreto = {
      forma: 'plano',
      papel: 'apoia',
      ponto: [0, 0.1, 0],
      normal: [0, 1, 0],
      extensao: [0.1, 0.1],
    };
    const nCorreto = nucleo([
      ['cubo', { origemId: 1, lado: 0.1 }],
      ['publicarPorta', { nome: 'topo', de: { op: 'cubo', id: 1 }, interface: planoCorreto }],
    ], {}, {}, {}, null, []);
    expect(nCorreto.orfaos).toEqual([]);
    expect(conferirPortasNaForma(nCorreto).map((a) => a.codigo)).toEqual([]);

    // Face declarada 5 mm acima do topo do cubo (em y = 0.105)
    const planoDeslocado = {
      forma: 'plano',
      papel: 'apoia',
      ponto: [0, 0.105, 0],
      normal: [0, 1, 0],
      extensao: [0.1, 0.1],
    };
    const nDeslocado = nucleo([
      ['cubo', { origemId: 1, lado: 0.1 }],
      ['publicarPorta', { nome: 'topo', de: { op: 'cubo', id: 1 }, interface: planoDeslocado }],
    ], {}, {}, {}, null, []);
    expect(conferirPortasNaForma(nDeslocado).map((a) => a.codigo)).toEqual(['porta-fora-do-plano']);
  });

  it('trilho fora do eixo reprova com porta-fora-do-eixo', () => {
    const trilhoDeslocado = {
      forma: 'trilho',
      papel: 'guia',
      eixo: [0, 1, 0],
      centro: [0.5, 0, 0],
      perfil: { largura: 0.01, altura: 0.01 },
      curso: 0.1,
    };
    const n = nucleo([
      ['cubo', { origemId: 1, lado: 0.1 }],
      ['publicarPorta', { nome: 'guia', de: { op: 'cubo', id: 1 }, interface: trilhoDeslocado }],
    ], {}, {}, {}, null, []);
    expect(conferirPortasNaForma(n).map((a) => a.codigo)).toEqual(['porta-fora-do-eixo']);
  });
});

describe('Relações e encaixe de interfaces em interfaces-montagem', () => {
  it('valida assentamento de plano contra plano', () => {
    const pRef = {
      id: 'base.p',
      forma: 'plano',
      papel: 'recebe',
      ponto: [0, 0.1, 0],
      normal: [0, 1, 0],
      extensao: [0.08, 0.08],
    };
    const pMov = {
      id: 'peca.p',
      forma: 'plano',
      papel: 'apoia',
      ponto: [0, 0.1, 0],
      normal: [0, -1, 0],
      extensao: [0.05, 0.05],
    };
    const portas = new Map([[pRef.id, pRef], [pMov.id, pMov]]);
    const decl = { id: 'r1', tipo: 'assentaPlano', referencia: 'base.p', movel: 'peca.p' };

    const resValido = validarAssentamentoPlano(decl, portas);
    expect(resValido.satisfeita).toBe(true);

    // Planos com normais não opostas
    const portasNormalErrada = new Map([[pRef.id, pRef], [pMov.id, { ...pMov, normal: [1, 0, 0] }]]);
    const resNormal = validarAssentamentoPlano(decl, portasNormalErrada);
    expect(resNormal.satisfeita).toBe(false);
    expect(resNormal.diagnosticos[0].codigo).toBe('normais-nao-opostas');

    // Planos separados além da tolerância
    const portasSeparadas = new Map([[pRef.id, pRef], [pMov.id, { ...pMov, ponto: [0, 0.15, 0] }]]);
    const resSeparado = validarAssentamentoPlano(decl, portasSeparadas);
    expect(resSeparado.satisfeita).toBe(false);
    expect(resSeparado.diagnosticos[0].codigo).toBe('contato-fora');

    // Descentro com extrapolação de apoio além dos limites da face maior
    const pRefGrande = {
      id: 'base.p', forma: 'plano', papel: 'recebe',
      ponto: [0, 0, 0], normal: [0, 1, 0], extensao: [0.1, 0.1], // meia-extensão: 0.05
    };
    // Face menor (meia-extensão: 0.02) com descentro de 0.04 (total 0.06 > 0.05)
    const pMovExtrapolado = {
      id: 'peca.p', forma: 'plano', papel: 'apoia',
      ponto: [0.04, 0, 0], normal: [0, -1, 0], extensao: [0.04, 0.04],
    };
    const resExtrapolado = validarAssentamentoPlano(decl, new Map([[pRefGrande.id, pRefGrande], [pMovExtrapolado.id, pMovExtrapolado]]));
    expect(resExtrapolado.satisfeita).toBe(false);
    expect(resExtrapolado.diagnosticos.some((d) => d.codigo === 'extrapolacao-de-apoio')).toBe(true);
  });

  it('valida encaixe de padrão de furos contra padrão de furos', () => {
    const pRef = {
      id: 'base.furos',
      forma: 'padraoFuros',
      papel: 'recebe',
      normal: [0, 1, 0],
      plano: { ponto: [0, 0, 0], normal: [0, 1, 0] },
      diametro: 0.005,
      centros: [[-0.02, 0, 0], [0.02, 0, 0]],
    };
    const pMov = {
      id: 'peca.furos',
      forma: 'padraoFuros',
      papel: 'ocupa',
      normal: [0, -1, 0],
      plano: { ponto: [0, 0, 0], normal: [0, -1, 0] },
      diametro: 0.005,
      centros: [[-0.02, 0, 0], [0.02, 0, 0]],
    };
    const portas = new Map([[pRef.id, pRef], [pMov.id, pMov]]);
    const decl = { id: 'r2', tipo: 'encaixaPadraoFuros', referencia: 'base.furos', movel: 'peca.furos' };

    // Caso A: Furos com furos (flange com flange: recebe com recebe)
    const pFlange1 = {
      id: 'flange1.furos', forma: 'padraoFuros', papel: 'recebe',
      normal: [0, 1, 0], plano: { ponto: [0, 0, 0], normal: [0, 1, 0] },
      diametro: 0.010, centros: [[-0.02, 0, 0], [0.02, 0, 0]],
    };
    const pFlange2 = {
      id: 'flange2.furos', forma: 'padraoFuros', papel: 'recebe',
      normal: [0, -1, 0], plano: { ponto: [0, 0, 0], normal: [0, -1, 0] },
      diametro: 0.010, centros: [[-0.02, 0, 0], [0.02, 0, 0]],
    };
    const resCasoA = validarEncaixePadraoFuros(
      { id: 'rFlanges', tipo: 'encaixaPadraoFuros', referencia: 'flange1.furos', movel: 'flange2.furos' },
      new Map([[pFlange1.id, pFlange1], [pFlange2.id, pFlange2]])
    );
    expect(resCasoA.satisfeita).toBe(true);
    expect(resCasoA.medidas.caso).toBe('furosComFuros');

    // Caso A com diâmetros divergentes além da tolerância
    const pFlangeDivergente = { ...pFlange2, diametro: 0.012 };
    const resDiverg = validarEncaixePadraoFuros(
      { id: 'rDiv', tipo: 'encaixaPadraoFuros', referencia: 'flange1.furos', movel: 'flange2.furos' },
      new Map([[pFlange1.id, pFlange1], [pFlange2.id, pFlangeDivergente]])
    );
    expect(resDiverg.satisfeita).toBe(false);
    expect(resDiverg.diagnosticos[0].codigo).toBe('diametros-divergentes');

    // Caso B: pino em furos (recebe com ocupa)
    const resValido = validarEncaixePadraoFuros(decl, portas);
    expect(resValido.satisfeita).toBe(true);
    expect(resValido.medidas.caso).toBe('pinoEmFuro');

    // Quantidade diferente
    const portasQtdErrada = new Map([[pRef.id, pRef], [pMov.id, { ...pMov, centros: [[-0.02, 0, 0]] }]]);
    const resQtd = validarEncaixePadraoFuros(decl, portasQtdErrada);
    expect(resQtd.satisfeita).toBe(false);
    expect(resQtd.diagnosticos[0].codigo).toBe('contagem-furos-divergente');

    // Centros desalinhados
    const portasDesal = new Map([[pRef.id, pRef], [pMov.id, { ...pMov, centros: [[-0.02, 0, 0], [0.03, 0, 0]] }]]);
    const resDesal = validarEncaixePadraoFuros(decl, portasDesal);
    expect(resDesal.satisfeita).toBe(false);
    expect(resDesal.diagnosticos[0].codigo).toBe('centros-nao-coincidentes');
  });

  it('valida encaixe de trilho contra trilho', () => {
    const pRef = {
      id: 'base.trilho',
      forma: 'trilho',
      papel: 'guia',
      eixo: [0, 0, 1],
      centro: [0, 0, 0],
      perfil: { largura: 0.02, altura: 0.01 },
      curso: 0.3,
    };
    const pMov = {
      id: 'carro.patim',
      forma: 'trilho',
      papel: 'deslizador',
      eixo: [0, 0, 1],
      centro: [0, 0, 0.05],
      perfil: { largura: 0.02, altura: 0.01 },
      curso: 0.3,
    };
    const portas = new Map([[pRef.id, pRef], [pMov.id, pMov]]);
    const decl = { id: 'r3', tipo: 'encaixaTrilho', referencia: 'base.trilho', movel: 'carro.patim' };

    const resValido = validarEncaixeTrilho(decl, portas);
    expect(resValido.satisfeita).toBe(true);

    // Eixos desalinhados
    const portasEixoErrado = new Map([[pRef.id, pRef], [pMov.id, { ...pMov, eixo: [1, 0, 0] }]]);
    const resEixo = validarEncaixeTrilho(decl, portasEixoErrado);
    expect(resEixo.satisfeita).toBe(false);
    expect(resEixo.diagnosticos[0].codigo).toBe('eixos-divergentes');

    // Perfis incompatíveis
    const portasPerfilLargo = new Map([[pRef.id, pRef], [pMov.id, { ...pMov, perfil: { largura: 0.03, altura: 0.01 } }]]);
    const resPerfil = validarEncaixeTrilho(decl, portasPerfilLargo);
    expect(resPerfil.satisfeita).toBe(false);
    expect(resPerfil.diagnosticos[0].codigo).toBe('perfil-incompativel');
  });

  it('formata diagnósticos polimórficos de encaixe', () => {
    const pRef = { id: 'b.p', forma: 'plano', papel: 'recebe', ponto: [0, 0.1, 0], normal: [0, 1, 0], extensao: [0.1, 0.1] };
    const pMov = { id: 'a.p', forma: 'plano', papel: 'apoia', ponto: [0, 0.15, 0], normal: [0, -1, 0], extensao: [0.1, 0.1] };
    const resPlano = validarAssentamentoPlano({ id: 'r1', tipo: 'assentaPlano', referencia: 'b.p', movel: 'a.p' }, new Map([[pRef.id, pRef], [pMov.id, pMov]]));
    const diagPlano = formatarDiagnosticoDeEncaixe(resPlano);
    expect(diagPlano).toContain('contato-fora');
    expect(diagPlano).toContain('separação 0.050000 m');

    const pF1 = { id: 'b.f', forma: 'padraoFuros', papel: 'recebe', normal: [0, 1, 0], plano: { ponto: [0, 0, 0], normal: [0, 1, 0] }, diametro: 0.005, centros: [[0, 0, 0]] };
    const pF2 = { id: 'a.f', forma: 'padraoFuros', papel: 'ocupa', normal: [0, -1, 0], plano: { ponto: [0, 0, 0], normal: [0, -1, 0] }, diametro: 0.005, centros: [[0, 0, 0], [0.02, 0, 0]] };
    const resFuros = validarEncaixePadraoFuros({ id: 'r2', tipo: 'encaixaPadraoFuros', referencia: 'b.f', movel: 'a.f' }, new Map([[pF1.id, pF1], [pF2.id, pF2]]));
    const diagFuros = formatarDiagnosticoDeEncaixe(resFuros);
    expect(diagFuros).toContain('contagem-furos-divergente');

    const pT1 = { id: 'b.t', forma: 'trilho', papel: 'guia', eixo: [0, 0, 1], centro: [0, 0, 0], perfil: { largura: 0.02, altura: 0.01 }, curso: 0.2 };
    const pT2 = { id: 'a.t', forma: 'trilho', papel: 'deslizador', eixo: [0, 0, 1], centro: [0, 0, 0], perfil: { largura: 0.03, altura: 0.01 }, curso: 0.2 };
    const resTrilho = validarEncaixeTrilho({ id: 'r3', tipo: 'encaixaTrilho', referencia: 'b.t', movel: 'a.t' }, new Map([[pT1.id, pT1], [pT2.id, pT2]]));
    const diagTrilho = formatarDiagnosticoDeEncaixe(resTrilho);
    expect(diagTrilho).toContain('perfil-incompativel');
  });
});

describe('Vínculos de medida com portas estendidas', () => {
  it('MEDIDAS_DE_PORTA inclui todas as grandezas escalares das novas portas', () => {
    expect(MEDIDAS_DE_PORTA).toContain('largura');
    expect(MEDIDAS_DE_PORTA).toContain('comprimento');
    expect(MEDIDAS_DE_PORTA).toContain('altura');
    expect(MEDIDAS_DE_PORTA).toContain('curso');
    expect(MEDIDAS_DE_PORTA).toContain('diametro');
    expect(MEDIDAS_DE_PORTA).toContain('quantidade');
    expect(MEDIDAS_DE_PORTA).toContain('passo');
  });

  it('lê vínculo real com medida passo de porta padraoFuros', () => {
    const instancias = [
      { id: 'trilhoBase', alvo: { tipo: 'peca', parte: 'trilho' } },
      { id: 'carroMovel', alvo: { tipo: 'peca', parte: 'carro' } },
    ];
    const etapas = ['trilhoBase', 'carroMovel'];
    const vinculosDeclarados = [
      {
        id: 'passoDoCarro',
        alvo: { instancia: 'carroMovel', param: 'passoDosFuros' },
        de: { instancia: 'trilhoBase', porta: 'furosGuia', medida: 'passo' },
        unidade: 'mm',
        acrescimo: 0,
      },
    ];
    const lidos = lerVinculos(vinculosDeclarados, instancias, etapas);
    expect(lidos.length).toBe(1);
    expect(lidos[0].de.medida).toBe('passo');

    // Porta resolvida publica passo em metros (ex: 0.02 m = 20 mm)
    const valorParametro = valorDoVinculo(lidos[0], 0.02);
    expect(valorParametro).toBe(20); // 0.02 * 1000 + 0 = 20 mm
  });
});

describe('Posição por porta (poseQueEncaixa e interfaceNoMundo)', () => {
  it('deriva pose de encaixe para portas de plano', () => {
    const base = {
      forma: 'plano',
      ponto: [0, 0.1, 0],
      normal: [0, 1, 0],
    };
    const tampa = {
      forma: 'plano',
      ponto: [0, 0, 0],
      normal: [0, 1, 0],
    };
    // Com afastamento 0, normal da tampa deve ser girada para [0, -1, 0] e seu ponto levado a [0, 0.1, 0]
    const { pose, giroDefinido } = poseQueEncaixa(tampa, base, 0);
    expect(pose.deslocamento[1]).toBeCloseTo(0.1, 6);
    expect(giroDefinido).toBe(false);

    // Alinha vetor referencia quando fornecido em ambas as portas
    const baseComRef = { forma: 'plano', ponto: [0, 0.1, 0], normal: [0, 1, 0], referencia: [1, 0, 0] };
    const tampaComRef = { forma: 'plano', ponto: [0, 0, 0], normal: [0, 1, 0], referencia: [0, 0, 1] };
    const resRef = poseQueEncaixa(tampaComRef, baseComRef, 0);
    expect(resRef.giroDefinido).toBe(true);
    const tampaNoMundo = interfaceNoMundo(tampaComRef, resRef.pose);
    expect(tampaNoMundo.referencia[0]).toBeCloseTo(1, 4);
    expect(tampaNoMundo.referencia[1]).toBeCloseTo(0, 4);
    expect(tampaNoMundo.referencia[2]).toBeCloseTo(0, 4);

    // Recusa pose quando plano retangular assimétrico não possui referencia
    const baseAssimetrica = { forma: 'plano', ponto: [0, 0, 0], normal: [0, 1, 0], extensao: [0.1, 0.2] };
    const tampaAssimetrica = { forma: 'plano', ponto: [0, 0, 0], normal: [0, 1, 0], extensao: [0.1, 0.2] };
    expect(() => poseQueEncaixa(tampaAssimetrica, baseAssimetrica, 0)).toThrow(ErroPosicaoPorPorta);
    let errPlano;
    try { poseQueEncaixa(tampaAssimetrica, baseAssimetrica, 0); } catch (e) { errPlano = e; }
    expect(errPlano?.codigo).toBe('orientacao-indeterminada');

    // Recusa pose quando apenas uma porta de plano fornece referencia
    expect(() => poseQueEncaixa(tampa, baseComRef, 0)).toThrow(ErroPosicaoPorPorta);
    let errRefUnica;
    try { poseQueEncaixa(tampa, baseComRef, 0); } catch (e) { errRefUnica = e; }
    expect(errRefUnica?.codigo).toBe('orientacao-indeterminada');
  });

  it('deriva pose para padraoFuros exigindo referencia e recusando pose indeterminada', () => {
    const baseFurosSemRef = {
      forma: 'padraoFuros', ponto: [0, 0.1, 0], normal: [0, 1, 0],
      centros: [[-0.02, 0.1, 0], [0.02, 0.1, 0]], diametro: 0.005,
    };
    const movelFurosSemRef = {
      forma: 'padraoFuros', ponto: [0, 0, 0], normal: [0, 1, 0],
      centros: [[-0.02, 0, 0], [0.02, 0, 0]], diametro: 0.005,
    };
    // Sem referencia: deve recusar com orientacao-indeterminada
    expect(() => poseQueEncaixa(movelFurosSemRef, baseFurosSemRef, 0)).toThrow(ErroPosicaoPorPorta);
    let errFuros;
    try { poseQueEncaixa(movelFurosSemRef, baseFurosSemRef, 0); } catch (e) { errFuros = e; }
    expect(errFuros?.codigo).toBe('orientacao-indeterminada');

    // Com referencia: deve alinhar furos e apoios
    const baseFurosComRef = { ...baseFurosSemRef, referencia: [1, 0, 0] };
    const movelFurosComRef = { ...movelFurosSemRef, referencia: [1, 0, 0] };
    const { pose, giroDefinido } = poseQueEncaixa(movelFurosComRef, baseFurosComRef, 0);
    expect(giroDefinido).toBe(true);
    const movelNoMundo = interfaceNoMundo(movelFurosComRef, pose);
    expect(movelNoMundo.ponto[1]).toBeCloseTo(0.1, 5);
    expect(movelNoMundo.centros[0][0]).toBeCloseTo(-0.02, 4);
    expect(movelNoMundo.centros[1][0]).toBeCloseTo(0.02, 4);
  });

  it('reprova encaixe entre portas de formas incompatíveis', () => {
    const plano = { forma: 'plano', ponto: [0, 0, 0], normal: [0, 1, 0] };
    const cilindro = { forma: 'cilindro', centro: [0, 0, 0], eixo: [0, 1, 0] };
    expect(() => poseQueEncaixa(plano, cilindro, 0)).toThrow(/não é possível encaixar/);
  });

  it('interfaceNoMundo transforma centro, ponto, normais e centros de padrão', () => {
    const local = {
      forma: 'padraoFuros',
      ponto: [0, 0.05, 0],
      normal: [0, 1, 0],
      centros: [[0.01, 0.05, 0], [-0.01, 0.05, 0]],
      diametro: 0.005,
    };
    const pose = {
      rotacao: [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
      deslocamento: [1, 2, 3],
    };
    const mundo = interfaceNoMundo(local, pose);
    expect(mundo.ponto).toEqual([1, 2.05, 3]);
    expect(mundo.centros[0]).toEqual([1.01, 2.05, 3]);
    expect(mundo.centros[1]).toEqual([0.99, 2.05, 3]);
    expect(mundo.diametro).toBe(0.005);
  });
});

describe('Conferência de portas na forma da malha (porta-confere-forma)', () => {
  it('aprova padraoFuros quando furos estão na malha e reprova quando furo está ausente', () => {
    // Malha sintética com vértices ao redor do centro [0, 0, 0] no raio 0.005 m (5 mm)
    const raio = 0.005;
    const neutro = {
      V: new Map([
        [0, [raio, 0, 0]],
        [1, [-raio, 0, 0]],
        [2, [0, 0, raio]],
        [3, [0, 0, -raio]],
        [4, [0, 0, 0]], // face plana na origem
      ]),
      F: new Map([
        [0, { vs: [0, 1, 2], parte: 'corpo' }],
        [1, { vs: [0, 2, 3], parte: 'corpo' }],
        [2, { vs: [4, 0, 1], parte: 'corpo' }],
      ]),
      facesDasPortas: new Map([['furoPresente', [2]]]),
      portas: new Map([
        ['furoPresente', {
          nome: 'furoPresente',
          de: { sel: { parte: 'corpo' } },
          interface: {
            forma: 'padraoFuros',
            papel: 'recebe',
            normal: [0, 1, 0],
            ponto: [0, 0, 0],
            diametro: raio * 2,
            centros: [[0, 0, 0]],
          },
        }],
      ]),
      partes: new Map([['corpo', {}]]),
    };

    const achadosPresente = conferirPortasNaForma(neutro);
    expect(achadosPresente.length).toBe(0);

    // Porta declarando centro onde não há vértices no raio (furo ausente)
    const neutroFuroAusente = {
      ...neutro,
      facesDasPortas: new Map([['furoAusente', [2]]]),
      portas: new Map([
        ['furoAusente', {
          nome: 'furoAusente',
          de: { sel: { parte: 'corpo' } },
          interface: {
            forma: 'padraoFuros',
            papel: 'recebe',
            normal: [0, 1, 0],
            ponto: [0, 0, 0],
            diametro: raio * 2,
            centros: [[0.05, 0, 0]], // Centro afastado sem vértices correspondentes
          },
        }],
      ]),
    };

    const achadosAusente = conferirPortasNaForma(neutroFuroAusente);
    expect(achadosAusente.length).toBeGreaterThan(0);
    expect(achadosAusente[0].codigo).toBe('porta-com-raio-errado');
  });
});

describe('Transformação de novas interfaces de portas no núcleo (espelha e arranja)', () => {
  it('transforma porta padraoFuros após espelha invertendo normal e marcando mao espelhada', () => {
    const passos = [
      ['cubo', { origemId: 1, em: [0.05, 0, 0], larg: 0.02, alt: 0.02, prof: 0.02 }],
      [
        'publicarPorta',
        {
          id: 'portaFuros',
          de: { op: 'cubo', id: 1 },
          interface: {
            forma: 'padraoFuros',
            papel: 'recebe',
            plano: { ponto: [0.05, 0, 0], normal: [1, 0, 0] },
            diametro: 0.005,
            centros: [[0.05, 0.02, 0]],
            referencia: [0, 1, 0],
          },
        },
      ],
      [
        'espelha',
        {
          origemId: 2,
          derivaDe: { op: 'cubo', id: 1 },
          sel: { origem: { op: 'cubo', id: 1 } },
          eixo: 'x',
          pos: 0,
        },
      ],
      [
        'publicarPorta',
        {
          id: 'portaFurosEspelhada',
          de: { op: 'espelha', id: 2, de: { op: 'cubo', id: 1 } },
          interface: {
            forma: 'padraoFuros',
            papel: 'recebe',
            plano: { ponto: [0.05, 0, 0], normal: [1, 0, 0] },
            diametro: 0.005,
            centros: [[0.05, 0.02, 0]],
            referencia: [0, 1, 0],
          },
        },
      ],
    ];

    const resultado = nucleo(passos);
    expect(resultado.orfaos).toEqual([]);
    const portaOriginal = resultado.portas.get('portaFuros');
    const portaEspelhada = resultado.portas.get('portaFurosEspelhada');

    expect(portaOriginal.interface.normal).toEqual([1, 0, 0]);
    expect(portaEspelhada.interface.normal[0]).toBeCloseTo(-1, 5);
    expect(portaEspelhada.interface.ponto[0]).toBeCloseTo(-0.05, 5);
    expect(portaEspelhada.interface.centros[0][0]).toBeCloseTo(-0.05, 5);
    expect(portaEspelhada.interface.mao).toBe('espelhada');
  });

  it('transforma porta plano após arranja radial rotacionando centro e normal', () => {
    const passos = [
      ['cubo', { origemId: 1, em: [0.05, 0, 0], larg: 0.02, alt: 0.02, prof: 0.02 }],
      [
        'arranja',
        {
          origemId: 2,
          derivaDe: { op: 'cubo', id: 1 },
          sel: { origem: { op: 'cubo', id: 1 } },
          modo: 'radial',
          total: 4,
          volta: 360,
          eixo: 'z',
          pivo: [0, 0, 0],
        },
      ],
      [
        'publicarPorta',
        {
          id: 'portaCopia1',
          de: { op: 'arranja', id: 2, copia: 0, de: { op: 'cubo', id: 1 } },
          interface: {
            forma: 'plano',
            papel: 'recebe',
            normal: [1, 0, 0],
            ponto: [0.05, 0, 0],
            extensao: [0.02, 0.02],
            referencia: [0, 1, 0],
          },
        },
      ],
    ];

    const resultado = nucleo(passos);
    expect(resultado.orfaos).toEqual([]);
    const portaCopia1 = resultado.portas.get('portaCopia1');
    expect(portaCopia1).toBeDefined();
    // 360 / 4 = 90 graus em torno do eixo Z: [0.05, 0, 0] vira [0, 0.05, 0] e [1, 0, 0] vira [0, 1, 0]
    expect(portaCopia1.interface.ponto[0]).toBeCloseTo(0, 5);
    expect(portaCopia1.interface.ponto[1]).toBeCloseTo(0.05, 5);
    expect(portaCopia1.interface.normal[0]).toBeCloseTo(0, 5);
    expect(portaCopia1.interface.normal[1]).toBeCloseTo(1, 5);
  });
});
