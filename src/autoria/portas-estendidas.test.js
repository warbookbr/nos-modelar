/* portas-estendidas.test.js — suíte de testes completa para portas estendidas do núcleo:
   plano de apoio, padrão de furos, trilho e classes de ajuste. */
import { describe, expect, it } from 'vitest';
import { nucleo } from '../../procedural/nucleo/nucleo.js';
import {
  CLASSES_DE_AJUSTE,
  obterFolgaPorClasseAjuste,
  obterFolgaPorClasseAjusteEmMetros,
  validarAssentamentoPlano,
  validarEncaixePadraoFuros,
  validarEncaixeTrilho,
  formatarDiagnosticoDeEncaixe,
} from './interfaces-montagem.js';
import { conferirPortasNaForma } from './porta-confere-forma.js';
import { MEDIDAS_DE_PORTA } from './vinculos-de-medida.js';
import { poseQueEncaixa, interfaceNoMundo } from './posicao-por-porta.js';

describe('Tabela e cálculo de classes de ajuste (ISO 286)', () => {
  it('exporta as três classes padronizadas', () => {
    expect(CLASSES_DE_AJUSTE).toEqual(['folgado', 'transicao', 'interferencia']);
  });

  it('calcula folgas nominais em mm para diferentes faixas de diâmetro', () => {
    // Diâmetro <= 3 mm (ex: 2.5 mm)
    const fPequeno = obterFolgaPorClasseAjuste('folgado', 2.5);
    expect(fPequeno.folgaMinMm).toBeGreaterThan(0);
    expect(fPequeno.folgaMaxMm).toBeGreaterThan(fPequeno.folgaMinMm);

    // Diâmetro médio (ex: 20 mm, faixa > 18 até 30 mm)
    const fMedio = obterFolgaPorClasseAjuste('folgado', 20);
    expect(fMedio.folgaMinMm).toBe(0.020);
    expect(fMedio.folgaMaxMm).toBe(0.053);

    const tMedio = obterFolgaPorClasseAjuste('transicao', 20);
    expect(tMedio.folgaMinMm).toBe(-0.009);
    expect(tMedio.folgaMaxMm).toBe(0.015);

    const iMedio = obterFolgaPorClasseAjuste('interferencia', 20);
    expect(iMedio.folgaMinMm).toBe(-0.042);
    expect(iMedio.folgaMaxMm).toBe(-0.018);
    expect(iMedio.interferenciaMaxMm).toBe(0.042);
  });

  it('calcula folgas em metros', () => {
    const fMetro = obterFolgaPorClasseAjusteEmMetros('folgado', 0.020);
    expect(fMetro.folgaMinM).toBeCloseTo(0.000020, 6);
    expect(fMetro.folgaMaxM).toBeCloseTo(0.000053, 6);
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
    expect(pLin.interface.centros).toEqual([
      [0, 0.1, 0],
      [0.02, 0.1, 0],
      [0.04, 0.1, 0],
    ]);

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
          padrao: { tipo: 'circular', quantidade: 4, raio: 0.02 },
        },
      }],
    ];
    const nCirc = nucleo(passosCircular, {}, {}, {}, null, []);
    expect(nCirc.orfaos).toEqual([]);
    const pCirc = nCirc.portas.get('furos-circulares');
    expect(pCirc.interface.quantidade).toBe(4);
    expect(pCirc.interface.centros.length).toBe(4);
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

    const resValido = validarEncaixePadraoFuros(decl, portas);
    expect(resValido.satisfeita).toBe(true);

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
    const { pose } = poseQueEncaixa(tampa, base, 0);
    expect(pose.deslocamento[1]).toBeCloseTo(0.1, 6);
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
