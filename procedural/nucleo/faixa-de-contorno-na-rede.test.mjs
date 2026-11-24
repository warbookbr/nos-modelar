import { describe, it, expect } from 'vitest';
import { nucleo } from './nucleo.js';
import { gaiolaPorRede } from './gaiola-por-rede.js';
import { faixaDeContornoNaRede, ErroFaixaDeContorno, FICHA } from './faixa-de-contorno-na-rede.js';
import {
  montarChapaDeProva,
  alturaSuperficie,
  normalSuperficie,
  projetarNaChapa,
  pontosDoArco,
  ARCO,
  LARGURA,
  ALTURA,
} from './fixtures/faixa-de-contorno-prova.js';

function executarChapa(modo, { espessura = 0.003, cortarPainel = false } = {}) {
  const { rede, faixa } = montarChapaDeProva(modo);
  const passoSub = ['subdivisao', {
    ...rede.passo,
    origemId: 1,
    niveis: 2,
    espessura,
  }];
  const passos = [
    passoSub,
    ['parte', { nome: 'chapa', sel: { origem: { op: 'subdivisao', id: 1 } } }],
  ];

  if (cortarPainel) {
    /* corte de fresta vertical em x = 520 mm atravessando o lado direito do arco e sua faixa estampada */
    const contorno = {
      inicio: [0.520, 0.100],
      trechos: [
        { reto: [0.760, 0.100] },
        { reto: [0.760, 0.420] },
        { reto: [0.520, 0.420] },
        { reto: [0.520, 0.100] },
      ],
    };
    passos.push([
      'aberturaPorContorno',
      {
        origemId: 2,
        vista: 'y',
        sentido: '+',
        contorno,
        lente: true,
        recuoDaLente: 0.004,
        chapa: { origem: { op: 'subdivisao', id: 1 } },
      },
    ]);
    passos.push(['parte', { nome: 'painelDireito', sel: { origem: { op: 'aberturaPorContorno', id: 2, parte: 'lente' } } }]);
  }

  const res = nucleo(passos, {}, rede.pontos);
  return { res, rede, faixa };
}

/** Mede o deslocamento máximo na direção da normal perto do topo do arco (x = 400, z = ARCO.r + dr). */
function medirDeslocamentoNoTopo(res, drMm, raioBuscaMm = 22) {
  const xAlvo = ARCO.cx;
  const zAlvo = ARCO.r + drMm;
  const yBase = alturaSuperficie(xAlvo, zAlvo);
  const n = normalSuperficie(xAlvo, zAlvo);
  let melhor = null;
  let menorDistXZ = Infinity;
  for (const [, p] of res.V) {
    const px = p[0] * 1000;
    const py = p[1] * 1000;
    const pz = p[2] * 1000;
    const dXZ = Math.hypot(px - xAlvo, pz - zAlvo);
    if (dXZ <= raioBuscaMm) {
      const proj = (px - xAlvo) * n[0] + (py - yBase) * n[1] + (pz - zAlvo) * n[2];
      /* pele externa (lado positivo da normal, ou mais próximo de +y) */
      if (dXZ < menorDistXZ - 2 || (Math.abs(dXZ - menorDistXZ) <= 2 && (melhor === null || proj > melhor))) {
        menorDistXZ = dXZ;
        melhor = proj;
      }
    }
  }
  return melhor;
}

describe('faixaDeContornoNaRede', () => {
  it('expõe FICHA completa para registro em capacidade', () => {
    expect(FICHA.nome).toBe('faixaDeContornoNaRede');
    expect(FICHA.campos).toContain('faixas');
    expect(FICHA.campos).toContain('modulacao');
    expect(FICHA.campos).toContain('abaInterna');
  });

  it('gera baseline, chanfro, ombro vincado com aba interna e bojo G1 sem faces órfãs e com amplitude fiel', () => {
    const base = executarChapa('baseline');
    expect(base.res.orfaos ?? []).toHaveLength(0);
    expect(base.res.F.size).toBeGreaterThan(200);

    const chanfro = executarChapa('chanfro');
    expect(chanfro.res.orfaos ?? []).toHaveLength(0);
    expect(chanfro.faixa.estatisticas.numeroAneis).toBe(1);
    const dChanfro = medirDeslocamentoNoTopo(chanfro.res, 4);
    expect(dChanfro).not.toBeNull();
    expect(dChanfro).toBeLessThan(-4);

    const ombro = executarChapa('ombro');
    expect(ombro.res.orfaos ?? []).toHaveLength(0);
    expect(ombro.faixa.curvaAba).toBe('borda_aba');
    expect(ombro.faixa.estatisticas.numeroAneis).toBe(2);
    const dOmbro = medirDeslocamentoNoTopo(ombro.res, 18);
    expect(dOmbro).not.toBeNull();
    expect(dOmbro).toBeGreaterThan(10);
    expect(dOmbro).toBeLessThan(16);

    const bojo = executarChapa('bojo');
    expect(bojo.res.orfaos ?? []).toHaveLength(0);
    expect(bojo.faixa.estatisticas.numeroAneis).toBe(4);
    const dBojo = medirDeslocamentoNoTopo(bojo.res, 26);
    expect(dBojo).not.toBeNull();
    expect(dBojo).toBeGreaterThan(16);
  });

  it('é determinístico para entradas equivalentes', () => {
    const a = montarChapaDeProva('ombro');
    const b = montarChapaDeProva('ombro');
    expect(a.faixa).toEqual(b.faixa);
  });

  it('recusa com diagnóstico quando a largura total atinge ou excede o raio côncavo mínimo', () => {
    /* curva em arco de raio 50 mm expandindo para o lado côncavo (centro) com largura 60 mm */
    const pts = [];
    for (let i = 0; i <= 8; i += 1) {
      const ang = (Math.PI * i) / 8;
      pts.push([50 * Math.cos(ang), 0, 50 * Math.sin(ang)]);
    }
    let erro = null;
    try {
      faixaDeContornoNaRede({
        nome: 'apertado',
        contorno: pts,
        fora: [0, 1, 0],
        lado: 'dentro',
        faixas: [{ larguraMm: 60, deslocamentoMm: 5 }],
      });
    } catch (e) {
      erro = e;
    }
    expect(erro).toBeInstanceOf(ErroFaixaDeContorno);
    expect(erro.motivo).toBe('auto-intersecao-por-raio');
    expect(erro.raioMinimoMm).toBeLessThan(60);
    expect(erro.larguraTotalMm).toBe(60);
    expect(erro.indice).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(erro.ponto)).toBe(true);
  });

  it('suporta contorno fechado (fechada: true) gerando anéis e retalhos fechados', () => {
    const pts = [];
    for (let i = 0; i < 12; i += 1) {
      const ang = (2 * Math.PI * i) / 12;
      const x = 400 + 80 * Math.cos(ang);
      const z = 220 + 80 * Math.sin(ang);
      pts.push([x, alturaSuperficie(x, z), z]);
    }
    const f = faixaDeContornoNaRede({
      nome: 'anel',
      contorno: pts,
      fechada: true,
      fora: [0, 1, 0],
      projetar: projetarNaChapa,
      lado: 'dentro',
      faixas: [{ larguraMm: 20, deslocamentoMm: 8 }],
    });
    expect(f.curvas.find((c) => c.nome === 'anel_anel0')?.fechada).toBe(true);
    expect(f.curvas.find((c) => c.nome === 'anel_anel1')?.fechada).toBe(true);
    expect(f.retalhos.length).toBe(4);
  });

  it('preserva continuidade de altura através da fresta ao cortar a chapa estampada em dois painéis', () => {
    const { res } = executarChapa('ombro', { cortarPainel: true });
    expect(res.orfaos ?? []).toHaveLength(0);

    /* compara a altura média y (pele externa) imediatamente à esquerda (x = 516..519) e à direita (x = 521..524) da fresta em x = 520,
       na faixa de altura z = 80..120 onde a emenda atravessa o ombro estampado */
    const yEsq = [];
    const yDir = [];
    for (const [, p] of res.V) {
      const x = p[0] * 1000;
      const y = p[1] * 1000;
      const z = p[2] * 1000;
      if (z >= 80 && z <= 120 && y > alturaSuperficie(x, z) - 1) {
        if (x >= 514 && x <= 519.5) yEsq.push(y);
        if (x >= 520.5 && x <= 526) yDir.push(y);
      }
    }
    expect(yEsq.length).toBeGreaterThan(0);
    expect(yDir.length).toBeGreaterThan(0);
    const maxEsq = Math.max(...yEsq);
    const maxDir = Math.max(...yDir);
    expect(Math.abs(maxEsq - maxDir)).toBeLessThan(1.5);
  });

  it('costura automaticamente num vão retangular (vao) com anelDeAmortecimentoMm e divisoes radiais >= 2, recusando topoTemVinco', () => {
    const P = (x, z) => [x, alturaSuperficie(x, z), z];
    const nosBase = {
      E0: P(0, 0),
      E1: P(0, ALTURA),
      D1: P(LARGURA, ALTURA),
      D0: P(LARGURA, 0),
    };
    const faixa = faixaDeContornoNaRede({
      nome: 'vaoAuto',
      contorno: pontosDoArco(13),
      fora: [0, 1, 0],
      projetar: projetarNaChapa,
      lado: 'dentro',
      deslocamentoBaseMm: 8,
      faixas: [
        { larguraMm: 18, deslocamentoMm: 12 },
        { larguraMm: 22, deslocamentoMm: 0, vinco: 0.65 },
      ],
      ancoras: [0, 3, 9, 12],
      vao: {
        baseFrente: 'E0',
        topoFrente: 'E1',
        topoTras: 'D1',
        baseTras: 'D0',
        curvaFrente: 'esq',
        curvaTopo: 'topo',
        curvaTras: 'dir',
        nosDoVao: nosBase,
        passoTransicaoMm: 90,
      },
    });
    expect(faixa.estatisticas.anelDeAmortecimentoMm).toBe(20);
    expect(faixa.cantos).toHaveLength(2);

    const rede = gaiolaPorRede({
      passo: 180,
      fora: [0, 1, 0],
      nos: { ...nosBase, ...faixa.nos },
      curvas: [
        ...faixa.curvas,
        { nome: 'esq', pontos: ['E0', P(0, 225), 'E1'] },
        { nome: 'dir', pontos: ['D0', P(LARGURA, 225), 'D1'] },
        { nome: 'topo', pontos: ['E1', P(400, ALTURA), 'D1'] },
      ],
      retalhos: faixa.retalhos,
      cantos: faixa.cantos,
    });
    const dLigF = Object.entries(rede.densidades).find(([k]) => k.startsWith('vaoAuto_ligF:'))?.[1];
    expect(dLigF?.divisoes).toBeGreaterThanOrEqual(2);
    expect(rede.avisos.filter((a) => a.ref === 'cordaLongaEmTransicao')).toHaveLength(0);

    expect(() => faixaDeContornoNaRede({
      nome: 'emVinco',
      contorno: pontosDoArco(13),
      fora: [0, 1, 0],
      lado: 'dentro',
      faixas: [{ larguraMm: 20, deslocamentoMm: 0, vinco: 0.5 }],
      ancoras: [0, 3, 9, 12],
      vao: {
        baseFrente: 'E0', topoFrente: 'E1', topoTras: 'D1', baseTras: 'D0',
        curvaFrente: 'esq', curvaTopo: 'topo', curvaTras: 'dir',
        nosDoVao: nosBase, topoTemVinco: true,
      },
    })).toThrow(/vinco/);
  });

  it('gaiolaPorRede emite avisos extraordinarioEmVinco e cordaLongaEmTransicao quando presentes', () => {
    /* rede com polo valência 5 exatamente sobre curva com vinco e curva arqueada travada em 1 divisão */
    const rede = gaiolaPorRede({
      passo: 400,
      fora: [0, 1, 0],
      nos: {
        A: [0, 0, 0], B: [200, 0, 0], C: [400, 0, 0],
        D: [0, 0, 200], E: [200, 0, 200], F: [400, 0, 200],
        G: [0, 0, 400], H: [200, 0, 400], I: [400, 0, 400],
        M: [100, 18, 100],
      },
      curvas: [
        { nome: 'v', pontos: ['D', 'E', 'F'], vinco: 0.8 },
        { nome: 'b1', pontos: ['A', 'B'] },
        { nome: 'b2', pontos: ['B', 'C'] },
        { nome: 't1', pontos: ['G', 'H'] },
        { nome: 't2', pontos: ['H', 'I'] },
        { nome: 'l1', pontos: ['A', 'D'] },
        { nome: 'l2', pontos: ['D', 'G'] },
        { nome: 'r1', pontos: ['C', 'F'] },
        { nome: 'r2', pontos: ['F', 'I'] },
        { nome: 'm1', pontos: ['B', 'E'] },
        { nome: 'm2', pontos: ['E', 'H'] },
        { nome: 'diag', pontos: ['A', 'M', 'E'] },
      ],
      retalhos: [
        { nome: 'q1', borda: ['b1', 'm1', 'diag'] },
        { nome: 'q2', borda: ['l1', { curva: 'v', de: 'D', ate: 'E' }, 'diag'] },
        { nome: 'q3', borda: ['b2', 'r1', { curva: 'v', de: 'F', ate: 'E' }, 'm1'] },
        { nome: 'q4', borda: [{ curva: 'v', de: 'D', ate: 'E' }, 'm2', 't1', 'l2'] },
        { nome: 'q5', borda: [{ curva: 'v', de: 'E', ate: 'F' }, 'r2', 't2', 'm2'] },
      ],
    });
    expect(rede.avisos.some((a) => a.ref === 'extraordinarioEmVinco' && a.ponto === 'E')).toBe(true);
    expect(rede.avisos.some((a) => a.ref === 'cordaLongaEmTransicao' && a.curva === 'diag')).toBe(true);
  });
});
