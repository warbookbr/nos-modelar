/* pedido.test.mjs — o jeito de pedir o cabo (`cabo({ de, para, ... })`), as passagens com braçadeira, os terminais e o feixe: a conversão do pedido nos parâmetros da família,
 * o comprimento e a passagem medidos na malha, as faces dos acessórios contra a malha e cada recusa com o recebido e o aceito. */
import { describe, expect, it } from 'vitest';
import { chamar, criarRegistroDeFamilias } from '../index.js';
import { ErroChamadaDeFamilia } from '../../../src/autoria/chamar-familia.js';
import { executarReceita } from '../../../src/autoria/executar-receita.js';
import { conferirPortasNaForma } from '../../../src/autoria/porta-confere-forma.js';
import { neutroCanonico } from '../../nucleo/entrada.js';
import { sha256Hex } from '../../nucleo/sha256.js';
import { pedacosDaMalha } from '../../../tools/fixtures/transmissao/pedacos.mjs';
import { instanciaDeFamilia } from '../../../tools/modelar/instancia-de-familia.mjs';
import { cabo, feixeDeCabos, medidasDoPedido, parametrosDoCabo } from './index.js';
import { planejar } from './plano.js';
import { FACES_DO_ACESSORIO } from './acessorios.js';

const registro = criarRegistroDeFamilias();
const F = registro.obter('cabo');
const execucao = { registroOperacoes: registro.registroOperacoes, registroComposicoes: registro.registroComposicoes };
const gerar = (chamadas) => executarReceita({ meta: { nome: 'cabo' }, get CHAMADAS_COMPOSICOES() { return chamadas; } }, execucao).neutro;
const gerarFeixe = (pedido) => executarReceita({ meta: { nome: 'feixe' }, PASSOS: instanciaDeFamilia({ familia: 'cabo', registro, poses: feixeDeCabos(pedido).poses }).passos }, { registroOperacoes: registro.registroOperacoes }).neutro;
const hash = (n) => sha256Hex(JSON.stringify(neutroCanonico(n)));
const partes = (n) => { const por = {}; for (const f of n.F.values()) por[f.parte] = (por[f.parte] ?? 0) + 1; return por; };
const completos = (p) => Object.fromEntries(Object.entries(F.contrato.parametros).map(([nome, def]) => [nome, p[nome] ?? def.padrao]));
const recusa = (fazer) => { try { fazer(); } catch (e) { expect(e).toBeInstanceOf(ErroChamadaDeFamilia); return e; } throw new Error('não recusou'); };
const norma = (a) => Math.hypot(...a);
const dist = (p, q) => norma([p[0] - q[0], p[1] - q[1], p[2] - q[2]]);
const distanciaAoSegmento = (p, a, b) => {
  const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]; const ap = [p[0] - a[0], p[1] - a[1], p[2] - a[2]];
  const t = Math.max(0, Math.min(1, (ab[0] * ap[0] + ab[1] * ap[1] + ab[2] * ap[2]) / (ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2)));
  return dist(p, [a[0] + ab[0] * t, a[1] + ab[1] * t, a[2] + ab[2] * t]);
};
const distanciaALinha = (p, linha) => Math.min(...linha.slice(1).map((q, i) => distanciaAoSegmento(p, linha[i], q)));

const PEDIDO = { de: { ponto: [0, 0, 0], direcao: '+x' }, para: { ponto: [150, 40, 0], direcao: '-x' }, comprimento: 210, diametro: 4, lados: 8 };
const COM_PASSAGENS = { de: { ponto: [0, 0, 0], direcao: '+x' }, para: { ponto: [300, 0, 0], direcao: '-x' }, comprimento: 350, diametro: 4, passagens: [{ ponto: [100, 30, 0] }, { ponto: [200, 30, 0], direcao: '+x' }] };

describe('o pedido do cabo', () => {
  it('converte o pedido nos parâmetros da família: a ponta B vira o deslocamento a partir da A', () => {
    const p = parametrosDoCabo({ ...PEDIDO, de: { ponto: [10, 20, 30], direcao: [2, 0, 0] }, para: { ponto: [160, 60, 30], direcao: '-x' } });
    expect(p).toMatchObject({ ax: 10, ay: 20, az: 30, adx: 1, ady: 0, adz: 0, dx: 150, dy: 40, dz: 0, bdx: -1, comprimento: 210, diametro: 4, lados: 8 });
    expect(Object.keys(p)).not.toContain('passagens');
  });

  it('o cabo do pedido é o da chamada direta da família, byte a byte', () => {
    const direto = gerar([chamar(F, 'cabo', { dx: 150, dy: 40, comprimento: 210, diametro: 4, lados: 8 })]);
    const pedido = gerar(cabo(PEDIDO));
    expect(hash(pedido)).toBe(hash(direto));
    expect(hash(gerar(cabo(PEDIDO)))).toBe(hash(pedido));
  });

  it('a folga de qualquer tamanho vira comprimento, e a família a cumpre a menos de 0,5%', () => {
    for (const folga of [0.05, 0.1, 0.3]) {
      const D = norma([150, 40, 0]);
      const m = medidasDoPedido({ ...PEDIDO, comprimento: undefined, folga }).cabos[0];
      expect(Math.abs(m.comprimentoDeCorte / (D * (1 + folga)) - 1)).toBeLessThan(0.005);
    }
  });

  it('sem comprimento nem folga a folga é 0,3, e a direção aceita eixo ou vetor em qualquer escala', () => {
    const a = parametrosDoCabo({ ...PEDIDO, comprimento: undefined, de: { ponto: [0, 0, 0], direcao: 'x' } });
    expect(a.comprimento).toBeCloseTo(norma([150, 40, 0]) * 1.3, 9);
    expect(parametrosDoCabo({ ...PEDIDO, de: { ponto: [0, 0, 0], direcao: [0, 0, -7] } })).toMatchObject({ adz: -1 });
  });

  it('muda o comprimento e as faces pelo pedido: mais comprimento mais trechos, mais lados mais faces', () => {
    const curto = medidasDoPedido({ ...PEDIDO, comprimento: 200 }).cabos[0];
    const longo = medidasDoPedido({ ...PEDIDO, comprimento: 240 }).cabos[0];
    expect(longo.comprimentoDeCorte - curto.comprimentoDeCorte).toBeGreaterThan(39);
    const l8 = medidasDoPedido({ ...PEDIDO, lados: 8 }).cabos[0]; const l24 = medidasDoPedido({ ...PEDIDO, lados: 24 }).cabos[0];
    expect(l24.faces).toBeGreaterThan(2.5 * l8.faces);
  });

  describe('recusas do pedido', () => {
    it('campo desconhecido, ponto e direção malformados', () => {
      expect(recusa(() => cabo({ ...PEDIDO, comprimentos: 3 })).campo).toBe('pedido.comprimentos');
      expect(recusa(() => cabo({ ...PEDIDO, de: { ponto: [0, 0], direcao: '+x' } })).message).toMatch(/pedido\.de\.ponto recebeu .*; aceito: um ponto \[x, y, z\]/);
      expect(recusa(() => cabo({ ...PEDIDO, para: { ponto: [1, 2, 3], direcao: [0, 0, 0] } })).message).toMatch(/pedido\.para\.direcao recebeu .*aceito: uma direção não nula/);
      expect(recusa(() => cabo({ ...PEDIDO, para: { ponto: [1, 2, 3], direcao: '+w' } })).message).toMatch(/um de \+x, -x/);
      expect(recusa(() => cabo({ ...PEDIDO, de: undefined })).campo).toBe('pedido.de');
    });
    it('comprimento e folga juntos, comprimento menor que a reta, folga negativa', () => {
      expect(recusa(() => cabo({ ...PEDIDO, folga: 0.2 })).campo).toBe('pedido.folga');
      const e = recusa(() => cabo({ ...PEDIDO, comprimento: 100 }));
      expect(e.campo).toBe('pedido.comprimento');
      expect(e.message).toMatch(/ao menos 155\.24 mm/);
      expect(recusa(() => cabo({ ...PEDIDO, comprimento: undefined, folga: -0.1 })).campo).toBe('pedido.folga');
    });
    it('ponto longe demais, passagens demais, braçadeira sem passagem, terminal que não existe', () => {
      expect(recusa(() => cabo({ ...PEDIDO, para: { ponto: [2500, 0, 0], direcao: '-x' }, comprimento: 3000 })).message).toMatch(/até 2000 mm/);
      expect(recusa(() => cabo({ ...COM_PASSAGENS, passagens: [{ ponto: [50, 0, 0] }, { ponto: [100, 0, 0] }, { ponto: [150, 0, 0] }] })).message).toMatch(/de 0 a 2 passagens/);
      expect(recusa(() => cabo({ ...PEDIDO, bracadeiras: true })).message).toMatch(/braçadeiras só com passagens/);
      expect(recusa(() => cabo({ ...PEDIDO, terminais: { de: 'rosca' } })).message).toMatch(/um de capa, olhal/);
      expect(recusa(() => cabo({ ...COM_PASSAGENS, passagens: [{ ponto: [900, 0, 0] }] })).message).toMatch(/até 700 mm/);
    });
    it('um erro da família volta com o nome do parâmetro dela', () => {
      expect(recusa(() => cabo({ ...PEDIDO, lados: 10 })).restricao).toBe('lados-em-quartos');
    });
  });
});

describe('as passagens e as braçadeiras', () => {
  const chamadas = cabo({ ...COM_PASSAGENS, bracadeiras: true });
  const n = gerar(chamadas);

  it('o cabo passa pelos pontos, na direção pedida, com o comprimento pedido', () => {
    const plano = planejar(completos(parametrosDoCabo({ ...COM_PASSAGENS, bracadeiras: true })));
    expect(Math.abs(plano.comprimentoDaCurva / 350 - 1)).toBeLessThan(0.005);
    expect(plano.passagens).toHaveLength(2);
    for (const q of plano.passagens) expect(distanciaALinha(q.P, plano.pontos)).toBeLessThan(0.25);
    /* a direção: o trecho de estações em volta da passagem é paralelo a ela (a passagem fica num trecho reto da haste) */
    const q = plano.passagens[1];
    const perto = plano.pontos.map((p, i) => [dist(p, q.P), i]).sort((a, b) => a[0] - b[0]).slice(0, 2).map((x) => x[1]).sort((a, b) => a - b);
    const t = plano.pontos[perto[1]].map((x, k) => x - plano.pontos[perto[0]][k]);
    expect(Math.abs(t[0] / norma(t) - q.d[0])).toBeLessThan(0.02);
  });

  it('a braçadeira é um sólido próprio, de faces conhecidas, em volta do cabo na passagem', () => {
    expect(partes(n)).toEqual({ cabo: expect.any(Number), 'bracadeira-1': FACES_DO_ACESSORIO.bracadeira, 'bracadeira-2': FACES_DO_ACESSORIO.bracadeira });
    expect((n.orfaos ?? []).map((o) => o.motivo)).toEqual([]);
    const vs = (parte) => [...n.F.values()].filter((f) => f.parte === parte).flatMap((f) => f.vs).map((v) => n.V.get(v).map((x) => x * 1000));
    const anel = vs('bracadeira-2');
    const centro = anel.reduce((s, p) => [s[0] + p[0] / anel.length, s[1] + p[1] / anel.length, s[2] + p[2] / anel.length], [0, 0, 0]);
    expect(dist(centro, [200, 30, 0])).toBeLessThan(0.01);
    /* o anel cinge o cabo com folga: o ponto do anel mais perto do eixo está a mais que o raio do cabo (2 mm) */
    expect(Math.min(...anel.map((p) => Math.hypot(p[1] - 30, p[2])))).toBeGreaterThan(2);
  });

  it('as faces do pedido somam as do cabo e as dos acessórios, e a malha tem essa contagem', () => {
    const m = medidasDoPedido({ ...COM_PASSAGENS, bracadeiras: true, terminais: { de: 'capa', para: 'olhal' } });
    const todas = gerar(cabo({ ...COM_PASSAGENS, bracadeiras: true, terminais: { de: 'capa', para: 'olhal' } }));
    expect(m.cabos[0].faces).toBe(todas.F.size);
    expect(m.cabos[0].faces).toBe(m.cabos[0].facesDoTubo + 2 * FACES_DO_ACESSORIO.bracadeira + FACES_DO_ACESSORIO.capa + FACES_DO_ACESSORIO.olhal);
  });

  it('sem direção a passagem segue a corda entre os vizinhos', () => {
    const p = parametrosDoCabo(COM_PASSAGENS);
    expect(Math.hypot(p.p1dx, p.p1dy, p.p1dz)).toBeCloseTo(1, 9);
    expect(p.p1dx / p.p1dy).toBeCloseTo(200 / 30, 6);
    expect(p).toMatchObject({ passagens: 2, p1x: 100, p1y: 30, p2x: 100, p2y: 0, p2dx: 1 });
  });

  describe('recusas', () => {
    const familia = (extra) => ({ dx: 300, comprimento: 350, diametro: 4, passagens: 2, p1x: 100, p1y: 30, p1dx: 1, p2x: 100, p2dx: 1, ...extra });
    it('passagem sobre o ponto anterior, direção nula', () => {
      expect(recusa(() => chamar(F, 'c', familia({ p1x: 0, p1y: 0 }))).restricao).toBe('passagem-1-distante');
      expect(recusa(() => chamar(F, 'c', familia({ p2dx: 0, p2dy: 0, p2dz: 0 }))).restricao).toBe('direcao-da-passagem-2');
    });
    it('a última passagem sobre a ponta B', () => {
      const e = recusa(() => chamar(F, 'c', familia({ p2y: -30, dx: 200 })));
      expect(e.restricao).toBe('passagens-distintas');
      expect(e.message).toMatch(/o trecho 3 de 3, de 200, 0, 0 a 200, 0, 0 mede 0 mm/);
    });
    it('comprimento menor que o caminho pelos pontos', () => {
      const e = recusa(() => chamar(F, 'c', familia({ comprimento: 301 })));
      expect(e.restricao).toBe('comprimento-passa-dos-pontos');
      expect(e.message).toMatch(/ao menos 3\d\d(\.\d+)? mm, o caminho reto passando pelos pontos/);
    });
    it('trecho que a curva não alcança diz qual é', () => {
      const e = recusa(() => chamar(F, 'c', familia({ comprimento: 320, p1dx: -1 })));
      expect(e.restricao).toBe('comprimento-chega');
      expect(e.message).toMatch(/o que não fecha é o trecho \d de 3/);
    });
    it('raio mínimo abaixo do aceito é acusado no cabo inteiro', () => {
      expect(recusa(() => chamar(F, 'c', familia({ comprimento: 420 }))).restricao).toBe('raio-minimo-cabe');
    });
  });
});

describe('os terminais', () => {
  const pedido = { ...PEDIDO, terminais: { de: 'capa', para: 'olhal' } };
  const n = gerar(cabo(pedido));
  it('a capa e o olhal são partes próprias, de faces conhecidas, e a malha tem a contagem do plano', () => {
    expect(partes(n)).toMatchObject({ 'terminal-a': FACES_DO_ACESSORIO.capa, 'terminal-b': FACES_DO_ACESSORIO.capa, 'olhal-b': FACES_DO_ACESSORIO.olhal - FACES_DO_ACESSORIO.capa });
    expect(n.F.size).toBe(medidasDoPedido(pedido).cabos[0].faces);
    expect((n.orfaos ?? []).map((o) => o.motivo)).toEqual([]);
    expect(pedacosDaMalha(n)).toBe(4);
  });
  it('a capa cobre a ponta: o cilindro passa 1 mm da ponta para fora e cobre o cabo, com raio maior que o dele', () => {
    const vs = [...n.F.values()].filter((f) => f.parte === 'terminal-a').flatMap((f) => f.vs).map((v) => n.V.get(v).map((x) => x * 1000));
    expect(Math.min(...vs.map((p) => p[0]))).toBeCloseTo(-1, 6);
    expect(Math.max(...vs.map((p) => p[0]))).toBeCloseTo(12, 6);
    expect(Math.max(...vs.map((p) => Math.hypot(p[1], p[2])))).toBeCloseTo(2.8, 6);
  });
  it('o olhal fica para fora da ponta B, com o furo no eixo lateral', () => {
    const vs = [...n.F.values()].filter((f) => f.parte === 'olhal-b').flatMap((f) => f.vs).map((v) => n.V.get(v).map((x) => x * 1000));
    /* a ponta B sai para -x a partir de (150, 40, 0): o anel fica em x maior que 150 */
    expect(Math.min(...vs.map((p) => p[0]))).toBeGreaterThan(149);
    expect(Math.max(...vs.map((p) => p[0]))).toBeLessThan(165);
  });
  it('as portas das pontas seguem no cabo, medidas na malha', () => {
    expect(conferirPortasNaForma(n).map((a) => a.codigo)).toEqual([]);
  });
});

describe('o feixe', () => {
  const pedido = { de: { ponto: [0, 0, 0], direcao: '+x' }, para: { ponto: [200, 0, 0], direcao: '-x' }, comprimento: 260, feixe: { diametros: [4, 3, 3] }, lados: 8 };
  const { cabos, faces, lateral, centros, poses } = feixeDeCabos(pedido);
  const n = gerarFeixe(pedido);

  it('três cabos, cada um uma parte própria e um sólido fechado, sem órfão, cada um com as portas de prefixo próprio', () => {
    expect(poses.map((p) => p.id)).toEqual(['cabo-1', 'cabo-2', 'cabo-3']);
    expect(Object.keys(partes(n)).sort()).toEqual(['cabo-1', 'cabo-2', 'cabo-3']);
    expect((n.orfaos ?? []).map((o) => o.motivo)).toEqual([]);
    expect(pedacosDaMalha(n)).toBe(3);
    expect([...n.portas.keys()].sort()).toEqual(['cabo-1-ponta-a', 'cabo-1-ponta-b', 'cabo-2-ponta-a', 'cabo-2-ponta-b', 'cabo-3-ponta-a', 'cabo-3-ponta-b']);
  });

  it('a contagem de faces do feixe é a soma dos cabos, e a malha a tem', () => {
    const soma = cabos.map((p) => medidasDoPedido({ ...pedido, feixe: undefined, diametro: p.diametro }).cabos[0].faces).reduce((s, x) => s + x, 0);
    expect(n.F.size).toBe(faces);
    expect(faces).toBe(soma);
  });

  it('os cabos ficam lado a lado, com o eixo lateral perpendicular ao plano de dobra e os eixos a uma distância maior que a soma dos raios', () => {
    expect(Math.abs(lateral[2])).toBeGreaterThan(0.999);
    expect(centros[1] - centros[0]).toBeCloseTo(2 + 0.5 + 1.5, 9);
    const eixo = cabos.map((p) => planejar(completos(p)).pontos);
    for (let i = 0; i < 3; i += 1) for (let j = i + 1; j < 3; j += 1) {
      const raios = (cabos[i].diametro + cabos[j].diametro) / 2;
      const menor = Math.min(...eixo[i].map((p) => distanciaALinha(p, eixo[j])));
      expect(menor).toBeGreaterThan(raios);
    }
  });

  it('cada cabo tem o comprimento pedido a menos de 0,5%, mesmo com diâmetros diferentes', () => {
    for (const p of cabos) expect(Math.abs(medidasDoPedido({ ...pedido, feixe: undefined, diametro: p.diametro }).cabos[0].comprimentoDeCorte / 260 - 1)).toBeLessThan(0.005);
  });

  it('o orçamento de faces vale para o feixe inteiro e a recusa diz a soma', () => {
    const e = recusa(() => feixeDeCabos({ ...pedido, orcamentoDeFaces: faces - 1 }));
    expect(e.campo).toBe('pedido.orcamentoDeFaces');
    expect(e.message).toMatch(new RegExp(`ao menos ${faces} faces, a soma dos 3 cabos \\(\\d+ \\+ \\d+ \\+ \\d+\\)`));
    expect(() => feixeDeCabos({ ...pedido, orcamentoDeFaces: faces })).not.toThrow();
  });

  it('o feixe leva também terminais e passagens, em cada cabo', () => {
    const com = { ...pedido, comprimento: 330, para: { ponto: [300, 0, 0], direcao: '-x' }, passagens: [{ ponto: [150, 20, 0] }], bracadeiras: true, terminais: { de: 'capa' } };
    const f = feixeDeCabos(com);
    expect(gerarFeixe(com).F.size).toBe(f.faces);
    expect(Object.keys(partes(gerarFeixe(com))).sort()).toEqual(['bracadeira-1-1', 'bracadeira-1-2', 'bracadeira-1-3', 'cabo-1', 'cabo-2', 'cabo-3', 'terminal-a-1', 'terminal-a-2', 'terminal-a-3']);
  });

  it('recusa o feixe de um cabo só, o diâmetro solto, o campo desconhecido, a mais de seis cabos e o cabo() com feixe', () => {
    expect(recusa(() => feixeDeCabos({ ...pedido, feixe: { diametros: [4] } })).campo).toBe('pedido.feixe.diametros');
    expect(recusa(() => feixeDeCabos({ ...pedido, feixe: { diametros: [4, 4, 4, 4, 4, 4, 4] } })).campo).toBe('pedido.feixe.diametros');
    expect(recusa(() => feixeDeCabos({ ...pedido, diametro: 4 })).campo).toBe('pedido.diametro');
    expect(recusa(() => feixeDeCabos({ ...pedido, feixe: { diametros: [4, 3], largura: 2 } })).campo).toBe('pedido.feixe.largura');
    expect(recusa(() => feixeDeCabos({ ...pedido, feixe: { diametros: [4, -3] } })).campo).toBe('pedido.feixe.diametros[1]');
    expect(recusa(() => cabo(pedido)).message).toMatch(/use feixeDeCabos/);
  });

  it('o feixe que se atravessa é recusado com a distância medida: o eixo lateral dentro do plano de dobra', () => {
    const e = recusa(() => feixeDeCabos({ ...pedido, feixe: { diametros: [4, 4, 4], lateral: [0, 1, 0] } }));
    expect(e.campo).toBe('pedido.feixe.folgaLateral');
    expect(e.message).toMatch(/o eixo do cabo \d chega a [\d.]+ mm do eixo do cabo \d e a soma dos raios é 4 mm/);
  });

  it('a mesma chamada dá os mesmos bytes', () => {
    expect(hash(gerarFeixe(pedido))).toBe(hash(n));
  });
});
