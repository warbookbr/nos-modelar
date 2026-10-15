/* O tradutor do nível zero sobre formas resolvidas escritas à mão (sem o módulo do esboço): cada tipo exato com a geometria
   que o andaime tem de dar, a rotação que gira o perfil, as aproximações com o relatório de perdas (loft, casca, inclinação,
   caixa com raio ou chanfro, cilindro achatado e o componente recolhido), o que fica de fora com o motivo, os ids em slug, as
   regiões, a recusa do conjunto no modo estrito e a determinação. A prova sobre as fixtures do esboço está em
   `tools/mecanifica/esboco-para-andaime.test.mjs`. */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { normalizarAndaimeGlobal } from './forma-global.js';
import { ErroDoTradutor, FORMATO_FORMAS_RESOLVIDAS, slugDe, traduzirFormasParaAndaime, volumeLocalDaForma } from './tradutor-nivel-zero.js';
import { compilarAndaime, medirVolumes } from '../../tools/fixtures/nivel-zero/medir-blocagem.js';

const I = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
const grau = (g) => [Math.cos(g * Math.PI / 180), Math.sin(g * Math.PI / 180)];
const rotX = (g) => { const [c, s] = grau(g); return [[1, 0, 0], [0, c, -s], [0, s, c]]; };
const rotY = (g) => { const [c, s] = grau(g); return [[c, 0, s], [0, 1, 0], [-s, 0, c]]; };
const rotZ = (g) => { const [c, s] = grau(g); return [[c, -s, 0], [s, c, 0], [0, 0, 1]]; };
const produto = (a, b) => a.map((l) => [0, 1, 2].map((j) => l[0] * b[0][j] + l[1] * b[1][j] + l[2] * b[2][j]));
const limpa = (m) => m.map((l) => l.map((x) => (Math.abs(x) < 1e-12 ? 0 : x)));

/* Uma forma resolvida como `formasResolvidas` a entrega: só os campos que o tradutor lê, com a caixa de mundo de `semi`. */
function forma(id, tipo, geometria, { centro = [0, 0, 0], matriz = I, semi = [50, 50, 50], unidade = null, parte = null, oculto = false, origem = null, caixa = null } = {}) {
  return {
    id, tipo, oculto, unidade, parte, origem,
    geometria: { centro, caixa: caixa ?? { min: centro.map((c, i) => c - semi[i]), max: centro.map((c, i) => c + semi[i]) }, matriz: limpa(matriz), ancoras: {}, ...geometria },
  };
}
const dados = (formas, extra = {}) => ({ formato: FORMATO_FORMAS_RESOLVIDAS, opcao: { numero: 1 }, parametros: {}, pontos: {}, formas, ...extra });
const traduzir = (formas, opcoes) => traduzirFormasParaAndaime(dados(formas), opcoes);
const volumeUnico = (resultado) => resultado.andaime.volumes[0];
const areaPoligono = (n, r) => (n / 2) * Math.sin(2 * Math.PI / n) * r * r;
const perto = (a, b, tol = 1e-6) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol);

describe('tradutor do nível zero: tipos com correspondência exata', () => {
  it('caixa sem rotação: dimensões e centro, e a blocagem tem o volume e o envelope da caixa', () => {
    const r = traduzir([forma('cx', 'caixa', { eixo: 'y', largura: 10, altura: 20, profundidade: 30 }, { centro: [5, 6, 7] })]);
    expect(volumeUnico(r)).toMatchObject({ tipo: 'caixa', centro: [5, 6, 7], dimensoes: [10, 20, 30] });
    const m = medirVolumes(compilarAndaime(r.andaime)).get('cx');
    perto(m.volume, 6000);
    expect(m.min).toEqual([0, -4, -8]);
    expect(m.max).toEqual([10, 16, 22]);
    expect(m.arestasSemPar).toBe(0);
  });

  it('caixa girada 90 graus em torno de um eixo só troca as medidas de lugar', () => {
    const r = traduzir([forma('cx', 'caixa', { eixo: 'y', largura: 10, altura: 20, profundidade: 30 }, { matriz: rotY(90) })]);
    expect(volumeUnico(r)).toMatchObject({ tipo: 'caixa', dimensoes: [30, 20, 10] });
  });

  it('caixa girada em um eixo qualquer vira a extrusão desse eixo do retângulo girado, com volume e envelope exatos', () => {
    for (const [nome, matriz, eixo, comprimento] of [['z', rotZ(30), 'z', 30], ['x', rotX(-40), 'x', 10], ['y', rotY(25), 'y', 20]]) {
      const r = traduzir([forma('cx', 'caixa', { eixo: 'y', largura: 10, altura: 20, profundidade: 30 }, { matriz })]);
      const v = volumeUnico(r);
      expect(v, nome).toMatchObject({ tipo: 'extrusao', eixoExtrusao: eixo, comprimento });
      const m = medirVolumes(compilarAndaime(r.andaime)).get('cx');
      perto(m.volume, 6000, 6000 * 1e-6);
      expect(m.arestasSemPar).toBe(0);
      /* o envelope da caixa girada: meia-extensão em cada eixo = soma de |coluna| · meia-medida */
      const dim = [10, 20, 30];
      for (let eixoMundo = 0; eixoMundo < 3; eixoMundo++) {
        const semi = [0, 1, 2].reduce((s, j) => s + Math.abs(matriz[eixoMundo][j]) * dim[j] / 2, 0);
        perto(m.max[eixoMundo], semi, 1e-4);
        perto(m.min[eixoMundo], -semi, 1e-4);
      }
    }
  });

  it('caixa girada em dois eixos fica fora, com o motivo', () => {
    const r = traduzir([
      forma('torta', 'caixa', { eixo: 'y', largura: 10, altura: 20, profundidade: 30 }, { matriz: produto(rotZ(30), rotX(20)) }),
      forma('boa', 'caixa', { eixo: 'y', largura: 10, altura: 20, profundidade: 30 }),
    ]);
    expect(r.naoTraduzidas).toEqual([{ id: 'torta', tipo: 'caixa', motivo: expect.stringContaining('gira em dois eixos') }]);
    expect(r.andaime.volumes.map((v) => v.id)).toEqual(['boa']);
    expect(r.tabela).toEqual({ boa: 'boa' });
  });

  it('caixa com furo fica fora, com o motivo; raio zero é caixa', () => {
    const base = { eixo: 'y', largura: 10, altura: 20, profundidade: 30 };
    const r = traduzir([
      forma('furada', 'caixa', { ...base, furos: [{ diametro: 4, centro: [0, 0] }] }),
      forma('seca', 'caixa', { ...base, raio: 0 }),
    ]);
    expect(r.naoTraduzidas.map((n) => [n.id, n.motivo.split(' ').slice(0, 3).join(' ')])).toEqual([['furada', 'caixa com furo:']]);
    expect(r.andaime.volumes.map((v) => v.id)).toEqual(['seca']);
    expect(r.perdas).toEqual([]);
  });

  it('cilindro alinhado a um eixo: eixo, raio, comprimento e os lados do esboço; sem lados são 128', () => {
    const r = traduzir([
      forma('a', 'cilindro', { eixo: 'x', diametro: 20, comprimento: 100 }, { matriz: rotZ(90) }),
      forma('b', 'cilindro', { eixo: 'y', diametro: 20, comprimento: 100, lados: 24 }),
    ]);
    expect(r.andaime.volumes.find((v) => v.id === 'a')).toMatchObject({ tipo: 'cilindro', eixo: 'y', raio: 10, comprimento: 100, segmentos: 128 });
    expect(r.andaime.volumes.find((v) => v.id === 'b')).toMatchObject({ tipo: 'cilindro', eixo: 'y', segmentos: 24 });
    const m = medirVolumes(compilarAndaime(r.andaime));
    perto(m.get('a').volume, areaPoligono(128, 10) * 100, 1e-6);
    perto(m.get('b').volume, areaPoligono(24, 10) * 100, 1e-6);
  });

  it('cilindro fora dos eixos (a haste de/para) é o tubo de dois pontos, com o mesmo volume', () => {
    const matriz = produto(rotZ(35), rotX(50));
    const r = traduzir([forma('haste', 'cilindro', { eixo: 'y', diametro: 12, comprimento: 80, haste: true }, { centro: [10, 20, 30], matriz })]);
    const v = volumeUnico(r);
    expect(v).toMatchObject({ tipo: 'tubo', raio: 6, raioCurva: 0, segmentos: 128, centro: [10, 20, 30] });
    const direcao = [0, 1, 2].map((i) => matriz[i][1]);
    v.caminho[0].forEach((c, i) => perto(c, -direcao[i] * 40));
    v.caminho[1].forEach((c, i) => perto(c, direcao[i] * 40));
    const m = medirVolumes(compilarAndaime(r.andaime)).get('haste');
    perto(m.volume, areaPoligono(128, 6) * 80, 1e-3);
    expect(m.arestasSemPar).toBe(0);
  });

  it('cilindro com poucos lados fica fora: a recusa da N2 vira motivo', () => {
    const r = traduzir([
      forma('poucos', 'cilindro', { eixo: 'y', diametro: 20, comprimento: 100, lados: 6 }),
      forma('ok', 'cilindro', { eixo: 'y', diametro: 20, comprimento: 100 }),
    ]);
    expect(r.naoTraduzidas.map((n) => n.id)).toEqual(['poucos']);
    expect(r.naoTraduzidas[0].motivo).toContain('a N2 recusa o volume');
    expect(r.andaime.volumes.map((v) => v.id)).toEqual(['ok']);
  });

  it('anel com furo é o anel; sem furo é o disco, um cilindro de comprimento igual à espessura; girado fica fora', () => {
    const r = traduzir([
      forma('aro', 'anel', { eixo: 'z', diametroExterno: 100, diametroInterno: 60, espessura: 8 }),
      forma('disco', 'anel', { eixo: 'x', diametroExterno: 100, diametroInterno: 0, espessura: 8 }),
      forma('torto', 'anel', { eixo: 'y', diametroExterno: 100, diametroInterno: 60, espessura: 8 }, { matriz: rotX(30) }),
    ]);
    expect(r.andaime.volumes.find((v) => v.id === 'aro')).toMatchObject({ tipo: 'anel', eixo: 'z', raioExterno: 50, raioInterno: 30, espessura: 8, segmentos: 128 });
    expect(r.andaime.volumes.find((v) => v.id === 'disco')).toMatchObject({ tipo: 'cilindro', eixo: 'x', raio: 50, comprimento: 8 });
    expect(r.naoTraduzidas.map((n) => n.id)).toEqual(['torto']);
    const m = medirVolumes(compilarAndaime(r.andaime));
    perto(m.get('aro').volume, (areaPoligono(128, 50) - areaPoligono(128, 30)) * 8, 1e-6);
  });

  it('cone: a base no começo do eixo, e com o eixo virado para o negativo do mundo as pontas trocam', () => {
    const geo = { eixo: 'y', diametro: 40, diametroTopo: 0, comprimento: 60 };
    const r = traduzir([forma('reto', 'cone', geo), forma('virado', 'cone', geo, { matriz: rotX(180) }), forma('tronco', 'cone', { ...geo, diametroTopo: 10 })]);
    expect(r.andaime.volumes.find((v) => v.id === 'reto')).toMatchObject({ tipo: 'cone', eixo: 'y', raioBase: 20, raioTopo: 0, comprimento: 60, segmentos: 128 });
    expect(r.andaime.volumes.find((v) => v.id === 'virado')).toMatchObject({ eixo: 'y', raioBase: 0, raioTopo: 20 });
    const m = medirVolumes(compilarAndaime(r.andaime));
    perto(m.get('reto').volume, areaPoligono(128, 20) * 60 / 3, 1e-6);
    perto(m.get('virado').volume, m.get('reto').volume, 1e-6);
    expect(m.get('tronco').volume).toBeGreaterThan(m.get('reto').volume);
  });

  it('cone inclinado fica fora', () => {
    const r = traduzir([forma('inclinado', 'cone', { eixo: 'y', diametro: 40, diametroTopo: 0, comprimento: 60 }, { matriz: produto(rotZ(20), rotX(15)) }), forma('ok', 'caixa', { eixo: 'y', largura: 1, altura: 1, profundidade: 1 })]);
    expect(r.naoTraduzidas).toEqual([{ id: 'inclinado', tipo: 'cone', motivo: expect.stringContaining('cone:') }]);
  });

  it('esfera: raio e 40 lados, e a rotação não conta', () => {
    const r = traduzir([forma('bola', 'esfera', { diametro: 30 }, { matriz: produto(rotZ(33), rotX(21)) })]);
    expect(volumeUnico(r)).toMatchObject({ tipo: 'esfera', raio: 15, segmentos: 40 });
    const m = medirVolumes(compilarAndaime(r.andaime)).get('bola');
    expect(m.max[1]).toBeCloseTo(15, 9);
    expect(m.arestasSemPar).toBe(0);
  });

  it('revolução: o perfil sobe pelo eixo, e com o eixo para o negativo do mundo ele é invertido', () => {
    const perfil = [{ raio: 0, altura: -20 }, { raio: 10, altura: -20 }, { raio: 10, altura: 0 }, { raio: 4, altura: 20 }];
    const r = traduzir([forma('torno', 'revolucao', { eixo: 'z', comprimento: 40, lados: 48, perfil }), forma('invertido', 'revolucao', { eixo: 'z', comprimento: 40, lados: 48, perfil }, { matriz: rotX(180) })]);
    const a = r.andaime.volumes.find((v) => v.id === 'torno');
    const b = r.andaime.volumes.find((v) => v.id === 'invertido');
    expect(a).toMatchObject({ tipo: 'revolucao', eixo: 'z', segmentos: 48 });
    expect(a.perfil).toEqual([[0, -20], [10, -20], [10, 0], [4, 20]]);
    expect(b.perfil).toEqual([[4, -20], [10, 0], [10, 20], [0, 20]]);
    const m = medirVolumes(compilarAndaime(r.andaime));
    perto(m.get('torno').volume, m.get('invertido').volume, 1e-6);
  });

  it('revolução suave: o perfil do andaime são as estações da curva, e sem estações são os pontos declarados', () => {
    const perfil = [{ raio: 0, altura: -20 }, { raio: 10, altura: 0 }, { raio: 0, altura: 20 }];
    const estacoes = [{ raio: 0, altura: -20 }, { raio: 8, altura: -10 }, { raio: 10, altura: 0 }, { raio: 8, altura: 10 }, { raio: 0, altura: 20 }];
    const suave = traduzir([forma('bojo', 'revolucao', { eixo: 'z', comprimento: 40, lados: 48, perfil, suave: true, estacoes })]);
    expect(volumeUnico(suave).perfil).toEqual([[0, -20], [8, -10], [10, 0], [8, 10], [0, 20]]);
    const reta = traduzir([forma('bojo', 'revolucao', { eixo: 'z', comprimento: 40, lados: 48, perfil, suave: true })]);
    expect(volumeUnico(reta).perfil).toEqual([[0, -20], [10, 0], [0, 20]]);
  });

  it('extrusão côncava: o contorno gira com a forma, e o volume é a área vezes o comprimento', () => {
    const ele = [[-20, -20], [20, -20], [20, -5], [-5, -5], [-5, 20], [-20, 20]];
    const area = 40 * 15 + 15 * 25;
    for (const [nome, matriz] of [['sem giro', I], ['90 em z', rotZ(90)], ['180 em x', rotX(180)]]) {
      const r = traduzir([forma('ele', 'extrusao', { eixo: 'y', eixosDoPerfil: ['x', 'z'], comprimento: 12, convexo: false, perfil: ele }, { matriz })]);
      const m = medirVolumes(compilarAndaime(r.andaime)).get('ele');
      perto(m.volume, area * 12, 1e-6);
      expect(m.arestasSemPar, nome).toBe(0);
    }
    /* girar 90 graus em z leva o eixo da extrusão (y) para -x, e o contorno (u, v) = (x, z) para (y, z) */
    const girada = traduzir([forma('ele', 'extrusao', { eixo: 'y', eixosDoPerfil: ['x', 'z'], comprimento: 12, convexo: false, perfil: ele }, { matriz: rotZ(90) })]);
    expect(volumeUnico(girada)).toMatchObject({ eixoExtrusao: 'x', eixosPerfil: ['y', 'z'], comprimento: 12 });
    expect(volumeUnico(girada).perfil[1]).toEqual([20, -20]);
  });

  it('extrusão inclinada fica fora', () => {
    const r = traduzir([forma('inclinada', 'extrusao', { eixo: 'y', eixosDoPerfil: ['x', 'z'], comprimento: 12, convexo: true, perfil: [[-5, -5], [5, -5], [5, 5], [-5, 5]] }, { matriz: rotX(20) }), forma('ok', 'esfera', { diametro: 4 })]);
    expect(r.naoTraduzidas.map((n) => n.id)).toEqual(['inclinada']);
  });

  it('tubo: o caminho relativo ao centro, o raio, o raio de curva e os 48 lados do esboço', () => {
    const caminho = [[0, 0, 0], [100, 0, 0], [100, 100, 0]];
    const r = traduzir([forma('cano', 'tubo', { diametro: 10, raioCurva: 30, caminho, trilha: { pontos: caminho, fechado: false } }, { centro: [50, 50, 0] })]);
    expect(volumeUnico(r)).toMatchObject({ tipo: 'tubo', centro: [50, 50, 0], caminho: [[-50, -50, 0], [50, -50, 0], [50, 50, 0]], raio: 5, raioCurva: 30, segmentos: 48 });
    const m = medirVolumes(compilarAndaime(r.andaime)).get('cano');
    expect(m.arestasSemPar).toBe(0);
    /* o volume é a área da seção vezes a linha de centro: dois trechos de 70 mm e o arco de 30 mm de raio e 90 graus em 15 cordas de 6 graus */
    perto(m.volume, areaPoligono(48, 5) * (140 + 15 * 2 * 30 * Math.sin(3 * Math.PI / 180)), 1e-6 * m.volume);
  });

  it('tubo com canto sem raio de curva fica fora (esfera no esboço, esquadria na N2); a ponta reta de dois pontos entra', () => {
    const reto = [[0, 0, 0], [100, 0, 0]];
    const canto = [[0, 0, 0], [100, 0, 0], [100, 100, 0]];
    const r = traduzir([
      forma('canto', 'tubo', { diametro: 10, raioCurva: 0, caminho: canto, trilha: { pontos: canto, fechado: false } }),
      forma('reto', 'tubo', { diametro: 10, raioCurva: 0, caminho: reto, trilha: { pontos: reto, fechado: false } }),
    ]);
    expect(r.naoTraduzidas).toEqual([{ id: 'canto', tipo: 'tubo', motivo: expect.stringContaining('sem raio de curva') }]);
    expect(r.andaime.volumes.map((v) => v.id)).toEqual(['reto']);
  });

  it('faixa e loft sem seções ficam fora, com o motivo; nunca viram outra forma', () => {
    const r = traduzir([
      forma('vazio', 'loft', { eixo: 'y', comprimento: 10, secoes: [] }),
      forma('correia', 'envolve', { largura: 10, espessura: 2, fechado: true }),
      forma('ok', 'esfera', { diametro: 4 }),
    ]);
    expect(r.naoTraduzidas.map((n) => [n.id, n.tipo])).toEqual([['vazio', 'loft'], ['correia', 'envolve']]);
    expect(r.andaime.volumes).toHaveLength(1);
  });
});

describe('tradutor do nível zero: a forma de família como casco por seções', () => {
  const octogono = (r) => Array.from({ length: 8 }, (_, i) => [r * Math.cos((2 * Math.PI * i) / 8), r * Math.sin((2 * Math.PI * i) / 8)]);
  /* o que `formasResolvidas` entrega da forma de família: o casco por seções do eixo principal (x, com o contorno em z e y), o volume
     da superfície (o tubo de parede, bem menor que o casco cheio) e as partes que a família declara */
  const familia = (extra = {}) => ({
    familia: 'tubo-de-prova', parametros: {}, partes: ['corpo'], volume: 30000, extensao: [100, 40, 40],
    eixo: 'x', eixosDoPerfil: ['z', 'y'], comprimento: 100, secoes: [{ w: -50, perfil: octogono(20) }, { w: 0, perfil: octogono(20) }, { w: 50, perfil: octogono(20) }],
    ...extra,
  });
  const medida = (r, id) => medirVolumes(compilarAndaime(r.andaime)).get(id);

  it('vira o casco por seções do eixo principal, com o volume contra o da superfície e a perda declarada', () => {
    const r = traduzir([forma('tubo', 'familia', familia(), { semi: [50, 20, 20] })]);
    expect(volumeUnico(r)).toMatchObject({ tipo: 'casco-secoes', eixoPercurso: 'x', eixosSecao: ['y', 'z'] });
    expect(volumeUnico(r).secoes.map((q) => q.posicao)).toEqual([-50, 0, 50]);
    expect(r.naoTraduzidas).toEqual([]);
    const [p] = r.perdas;
    expect(p).toMatchObject({ id: 'tubo', tipo: 'familia', aproximacao: 'familia-como-casco', volumeEsboco: 30000 });
    expect(p.perdido).toHaveLength(1);
    expect(p.perdido[0]).toMatchObject({ codigo: 'superficie' });
    expect(p.perdido[0].descricao).toMatch(/a superfície da família tubo-de-prova virou o casco convexo de 3 seções perpendiculares ao eixo x: o furo, as cavidades e as reentrâncias de cada seção deixam de existir, e as partes \(corpo\) viram um sólido só/);
    /* o octógono de raio 20 de 100 mm de comprimento: 2 sqrt(2) r2 x 100 */
    perto(p.volumeAndaime, 2 * Math.SQRT2 * 400 * 100, 1e-2);
    perto(p.volumeAndaime, medida(r, 'tubo').volume, 1e-2);
    expect(p.erroVolume.relativo).toBeGreaterThan(1);
    expect(p.erroEnvelope.mm).toBe(0);
  });

  it('a família girada de forma que o eixo fica sobre um eixo do mundo vai para esse eixo, e a que gira em dois eixos fica de fora com o motivo', () => {
    const emZ = traduzir([forma('tubo', 'familia', familia(), { matriz: rotY(90), semi: [20, 20, 50] })]);
    expect(volumeUnico(emZ)).toMatchObject({ tipo: 'casco-secoes', eixoPercurso: 'z' });
    /* sozinha no esboço, a forma que não se traduz deixa o andaime sem volume, e a tradução inteira é recusada com o motivo dela */
    const solta = (opcoes) => traduzir([forma('tubo', 'familia', familia(), { matriz: produto(rotY(30), rotZ(20)) }), forma('base', 'caixa', { eixo: 'y', largura: 10, altura: 10, profundidade: 10 })], opcoes);
    expect(solta().naoTraduzidas).toEqual([expect.objectContaining({ id: 'tubo', tipo: 'familia', motivo: expect.stringMatching(/família tubo-de-prova.*não deixa nenhum eixo da forma sobre um eixo do mundo/) })]);
    expect(() => solta({ estrito: true })).toThrow(ErroDoTradutor);
  });

  it('a família sem o casco por seções fica de fora dizendo o que falta', () => {
    const r = traduzir([forma('tubo', 'familia', familia({ secoes: [] })), forma('base', 'caixa', { eixo: 'y', largura: 10, altura: 10, profundidade: 10 })]);
    expect(r.naoTraduzidas).toEqual([expect.objectContaining({ id: 'tubo', tipo: 'familia', motivo: expect.stringMatching(/família sem o casco por seções: a N2 precisa de duas ou mais seções/) })]);
  });

  it('o mesmo dado dá o mesmo andaime', () => {
    const f = () => traduzir([forma('tubo', 'familia', familia(), { semi: [50, 20, 20] })]);
    expect(JSON.stringify(f())).toBe(JSON.stringify(f()));
  });
});

describe('tradutor do nível zero: aproximações e relatório de perdas', () => {
  const quadrado = (m) => [[-m / 2, -m / 2], [m / 2, -m / 2], [m / 2, m / 2], [-m / 2, m / 2]];
  /* o loft do esboço: eixo y, o contorno em (x, z) e a posição `w` de cada seção */
  const loft = (secoes, extra = {}) => ({ eixo: 'y', eixosDoPerfil: ['x', 'z'], comprimento: secoes.at(-1).w - secoes[0].w, secoes, ...extra });
  const medida = (r, id) => medirVolumes(compilarAndaime(r.andaime)).get(id);

  it('o loft sem inclinação nem casca vira o casco por seções, com o volume do tronco e sem perda de forma', () => {
    const secoes = [{ w: -50, perfil: quadrado(100) }, { w: 50, perfil: quadrado(60) }];
    const r = traduzir([forma('tronco', 'loft', loft(secoes), { semi: [50, 50, 50] })]);
    const v = volumeUnico(r);
    expect(v).toMatchObject({ tipo: 'casco-secoes', eixoPercurso: 'y', eixosSecao: ['x', 'z'], centro: [0, 0, 0] });
    expect(v.secoes.map((q) => q.posicao)).toEqual([-50, 50]);
    expect(r.naoTraduzidas).toEqual([]);
    const [p] = r.perdas;
    expect(p).toMatchObject({ id: 'tronco', tipo: 'loft', aproximacao: 'loft-como-casco', volumeId: 'tronco', perdido: [] });
    /* o tronco de pirâmide de bases 100 e 60 e altura 100: h/3 (A + raiz(A a) + a) */
    perto(p.volumeEsboco, 100 / 3 * (10000 + 6000 + 3600), 1e-2);
    perto(p.volumeAndaime, medida(r, 'tronco').volume, 1e-2);
    expect(Math.abs(p.erroVolume.relativo)).toBeLessThan(1e-9);
    expect(p.erroEnvelope).toEqual({ mm: 0, relativo: 0 });
  });

  it('o loft suave leva ao andaime as estações da curva e não as seções declaradas, e o volume do esboço é o da curva', () => {
    const declaradas = [{ w: -50, perfil: quadrado(100) }, { w: 0, perfil: quadrado(200) }, { w: 50, perfil: quadrado(100) }];
    const estacoes = [-50, -25, 0, 25, 50].map((w, i) => ({ w, perfil: quadrado([100, 170, 200, 170, 100][i]) }));
    const r = traduzir([forma('barriga', 'loft', loft(declaradas, { suave: true, estacoes }))]);
    expect(volumeUnico(r).secoes.map((q) => q.posicao)).toEqual([-50, -25, 0, 25, 50]);
    const [p] = r.perdas;
    expect(p.aproximacao).toBe('loft-como-casco');
    perto(p.erroVolume.relativo, 0, 1e-9);
    const retas = traduzir([forma('barriga', 'loft', loft(declaradas, { suave: true }))]);
    expect(volumeUnico(retas).secoes.map((q) => q.posicao)).toEqual([-50, 0, 50]);
  });

  it('o loft girado em um eixo ou virado para o negativo do eixo dá o mesmo sólido no lugar certo', () => {
    const secoes = [{ w: -50, perfil: quadrado(100) }, { w: 50, perfil: quadrado(60) }];
    const reto = traduzir([forma('a', 'loft', loft(secoes))]);
    const virado = traduzir([forma('a', 'loft', loft(secoes), { matriz: rotX(180) })]);
    const lateral = traduzir([forma('a', 'loft', { eixo: 'x', eixosDoPerfil: ['z', 'y'], comprimento: 100, secoes })]);
    expect(volumeUnico(virado).secoes.map((q) => q.posicao)).toEqual([-50, 50]);
    expect(volumeUnico(virado).secoes[0].perfil).toHaveLength(4);
    perto(medida(virado, 'a').volume, medida(reto, 'a').volume, 1e-6);
    /* com o eixo virado a seção de 100 fica em +50: o envelope mostra o lado largo em cima */
    expect(medida(virado, 'a').max[1]).toBe(50);
    expect(volumeUnico(lateral)).toMatchObject({ eixoPercurso: 'x', eixosSecao: ['y', 'z'] });
    expect(reto.perdas[0].erroEnvelope.mm).toBe(0);
    expect(virado.perdas[0].erroEnvelope.mm).toBe(0);
    expect(lateral.perdas[0].erroEnvelope.mm).toBe(0);
  });

  it('o loft em dois eixos, sem seções suficientes ou com números de pontos diferentes fica fora', () => {
    const secoes = [{ w: -50, perfil: quadrado(100) }, { w: 50, perfil: quadrado(60) }];
    const r = traduzir([
      forma('torto', 'loft', loft(secoes), { matriz: produto(rotZ(30), rotX(20)) }),
      forma('desigual', 'loft', loft([{ w: -50, perfil: quadrado(100) }, { w: 50, perfil: [[-30, -30], [30, -30], [0, 30]] }])),
      forma('ok', 'loft', loft(secoes)),
    ]);
    expect(r.naoTraduzidas.map((n) => n.id)).toEqual(['torto', 'desigual']);
    expect(r.naoTraduzidas[0].motivo).toContain('gira em dois eixos');
    expect(r.naoTraduzidas[1].motivo).toContain('números de pontos diferentes');
    expect(r.perdas.map((p) => p.id)).toEqual(['ok']);
  });

  it('a seção ponto vira o polígono do vizinho a 1%, declarado, e o volume a mais é o do tronco medido', () => {
    const secoes = [{ w: -50, perfil: quadrado(100) }, { w: 50, perfil: [[0, 0], [0, 0], [0, 0], [0, 0]] }];
    const r = traduzir([forma('piramide', 'loft', loft(secoes))]);
    expect(r.naoTraduzidas).toEqual([]);
    const [p] = r.perdas;
    expect(p.perdido.map((d) => d.codigo)).toEqual(['secao-ponto']);
    perto(p.volumeEsboco, 10000 * 100 / 3, 1e-2);
    /* o tronco de bases 100 e 1 de altura 100 */
    perto(p.volumeAndaime, 100 / 3 * (10000 + 100 + 1), 1e-2);
    perto(p.erroVolume.relativo, (10101 - 10000) / 10000, 1e-6);
    expect(p.erroEnvelope).toEqual({ mm: 0, relativo: 0 });
  });

  it('a seção inclinada é ignorada: o prisma oblíquo vira o prisma reto com o envelope do esboço, e o erro de volume é medido', () => {
    /* duas seções de 100 por 100 inclinadas 30 graus em torno de u e deslocadas 100 mm uma da outra: prisma oblíquo cujo
       volume é a área da base (100 por 100) vezes a altura perpendicular (100 cos 30). O envelope do esboço vai de -75 a 75 em w. */
    const a = Math.cos(Math.PI / 6);
    const sen = Math.sin(Math.PI / 6);
    const anel = (w) => [[-50, -50], [50, -50], [50, 50], [-50, 50]].map(([u, v]) => [u, v * a, w + v * sen]);
    const n = [0, -sen, a];
    const secoes = [{ w: -50, n, perfil: anel(-50) }, { w: 50, n, perfil: anel(50) }];
    const r = traduzir([forma('obliquo', 'loft', loft(secoes), { semi: [50, 75, 50 * a] })]);
    const [p] = r.perdas;
    expect(p.perdido.map((d) => d.codigo)).toEqual(['inclinacao']);
    expect(volumeUnico(r).secoes.map((q) => q.posicao)).toEqual([-75, 75]);
    perto(p.volumeEsboco, 10000 * 100 * a, 1e-2);
    perto(p.volumeAndaime, 100 * 100 * a * 150, 1e-2);
    perto(p.erroVolume.relativo, 150 / 100 - 1, 1e-6);
    expect(p.erroEnvelope.mm).toBeLessThan(1e-5);
    perto(p.volumeAndaime, medida(r, 'obliquo').volume, 1e-2);
    /* sem mover as pontas, o envelope em w seria o nominal (-50 a 50) e o erro, de 25 mm de cada lado */
    expect(p.envelopeAndaime.min[1]).toBe(-75);
    expect(p.envelopeAndaime.max[1]).toBe(75);
  });

  it('a casca vira o sólido externo cheio: a perda de cavidade é declarada e o volume a mais é o da cavidade', () => {
    const secoes = [{ w: -50, perfil: quadrado(100) }, { w: 50, perfil: quadrado(100) }];
    const cavidade = [{ w: -40, perfil: quadrado(92) }, { w: 50, perfil: quadrado(92) }];
    const r = traduzir([forma('bacia', 'loft', loft(secoes, { casca: { espessura: 4, aberta: 'fim', fundoAte: -46, cavidade } }))]);
    const [p] = r.perdas;
    expect(p.perdido.map((d) => d.codigo)).toEqual(['casca']);
    perto(p.volumeEsboco, 1e6 - 92 * 92 * 90, 1e-2);
    perto(p.volumeAndaime, 1e6, 1e-2);
    perto(p.erroVolume.mm3, 92 * 92 * 90, 1e-2);
    perto(p.volumeExternoEsboco, 1e6, 1e-2);
    expect(Math.abs(p.erroVolumeExterno.relativo)).toBeLessThan(1e-9);
    expect(p.erroEnvelope).toEqual({ mm: 0, relativo: 0 });
  });

  it('a caixa com raio vira a extrusão do contorno arredondado do esboço, com o mesmo volume, também girada em um eixo', () => {
    const geo = { eixo: 'y', largura: 100, altura: 40, profundidade: 60, raio: 10 };
    for (const [nome, matriz, semi, eixo] of [['parada', I, [50, 20, 30], 'y'], ['em y', rotY(90), [30, 20, 50], 'y'], ['em x (o y do esboço vira z)', rotX(90), [50, 30, 20], 'z']]) {
      const r = traduzir([forma('redonda', 'caixa', geo, { matriz, semi })]);
      expect(volumeUnico(r), nome).toMatchObject({ tipo: 'extrusao', eixoExtrusao: eixo, comprimento: 40 });
      expect(volumeUnico(r).perfil, nome).toHaveLength(36);
      const [p] = r.perdas;
      expect(p).toMatchObject({ id: 'redonda', aproximacao: 'caixa-com-raio-como-extrusao' });
      expect(Math.abs(p.erroVolume.relativo), nome).toBeLessThan(1e-6);
      expect(p.erroEnvelope.mm, nome).toBeLessThan(1e-5);
      /* o contínuo: o retângulo menos os quatro cantos, a menos de 0,2% pelo polígono de oito lados por canto */
      perto(p.volumeAndaime / ((100 * 60 - (4 - Math.PI) * 100) * 40), 1, 2e-3);
    }
    /* um raio maior que a metade da menor medida é recortado, como no esboço */
    const grande = traduzir([forma('pilula', 'caixa', { ...geo, raio: 500 })]);
    perto(grande.perdas[0].volumeAndaime / (Math.PI * 30 * 30 + 40 * 60) / 40, 1, 1e-2);
  });

  it('a caixa com raio ou chanfro com o eixo y fora de um eixo do mundo fica fora', () => {
    const base = { eixo: 'y', largura: 10, altura: 20, profundidade: 30 };
    const r = traduzir([
      forma('redonda', 'caixa', { ...base, raio: 3 }, { matriz: rotX(30) }),
      forma('chanfrada', 'caixa', { ...base, chanfro: 2 }, { matriz: produto(rotZ(30), rotX(20)) }),
      forma('ok', 'esfera', { diametro: 4 }),
    ]);
    expect(r.naoTraduzidas.map((n) => n.id)).toEqual(['redonda', 'chanfrada']);
    expect(r.naoTraduzidas[0].motivo).toContain('caixa com raio de canto (3 mm)');
    expect(r.naoTraduzidas[1].motivo).toContain('caixa com chanfro (2 mm)');
  });

  it('a caixa com chanfro vira o casco das quatro seções do esboço, com o envelope e o volume dele', () => {
    const geo = { eixo: 'y', largura: 100, altura: 60, profundidade: 80, chanfro: 10 };
    for (const [nome, matriz, semi] of [['parada', I, [50, 30, 40]], ['em y', rotY(90), [40, 30, 50]]]) {
      const r = traduzir([forma('chanfrada', 'caixa', geo, { matriz, semi })]);
      const v = volumeUnico(r);
      expect(v, nome).toMatchObject({ tipo: 'casco-secoes', eixoPercurso: 'y' });
      expect(v.secoes.map((q) => q.posicao), nome).toEqual([-30, -20, 20, 30]);
      expect(v.secoes.map((q) => q.perfil.length), nome).toEqual([8, 8, 8, 8]);
      const [p] = r.perdas;
      expect(p.aproximacao, nome).toBe('caixa-com-chanfro-como-casco');
      expect(Math.abs(p.erroVolume.relativo), nome).toBeLessThan(1e-9);
      expect(p.erroEnvelope.mm, nome).toBeLessThan(1e-5);
      /* menos que a caixa cheia e mais que a caixa sem as doze arestas inteiras */
      expect(p.volumeAndaime, nome).toBeLessThan(100 * 60 * 80);
      expect(p.volumeAndaime, nome).toBeGreaterThan(100 * 60 * 80 - 12 * 50 * 80);
    }
  });

  it('o cilindro com face plana vira a extrusão do círculo cortado, no eixo que ele tem', () => {
    const r = traduzir([
      forma('chato', 'cilindro', { eixo: 'y', diametro: 20, comprimento: 100, achatado: { lado: '+x', profundidade: 2 } }, { caixa: { min: [-10, -50, -10], max: [8, 50, 10] } }),
      forma('chatoZ', 'cilindro', { eixo: 'x', diametro: 20, comprimento: 100, achatado: { lado: '-z', profundidade: 2 } }, { matriz: rotZ(90), caixa: { min: [-10, -50, -8], max: [10, 50, 10] } }),
    ]);
    expect(r.naoTraduzidas).toEqual([]);
    const [a, b] = r.perdas;
    expect(a).toMatchObject({ id: 'chato', aproximacao: 'cilindro-achatado-como-extrusao' });
    expect(volumeUnico(r)).toMatchObject({ tipo: 'extrusao' });
    expect(Math.abs(a.erroVolume.relativo)).toBeLessThan(1e-6);
    /* a corda do círculo de raio 10 a 8 do centro: o segmento tirado tem 16,35 mm2 (contínuo) */
    perto(a.volumeAndaime / 100, Math.PI * 100 - (100 * Math.acos(0.8) - 8 * 6), 0.5);
    expect(a.erroEnvelope.mm).toBeLessThan(1e-5);
    expect(b.id).toBe('chatoZ');
    expect(Math.abs(b.erroVolume.relativo)).toBeLessThan(1e-6);
    /* achatado girado em dois eixos não tem equivalente */
    const torto = traduzir([forma('torto', 'cilindro', { eixo: 'y', diametro: 20, comprimento: 100, achatado: { lado: '+x', profundidade: 2 } }, { matriz: produto(rotZ(30), rotX(20)) }), forma('ok', 'esfera', { diametro: 4 })]);
    expect(torto.naoTraduzidas[0].motivo).toContain('cilindro com face plana (achatado)');
  });

  const componente = (id, tipo, geo, instancia, principal, extra = {}) => forma(id, tipo, geo, { origem: { componente: { instancia, principal, usa: 'roda' } }, ...extra });
  const roda = () => [
    componente('roda.aro', 'caixa', { eixo: 'y', largura: 100, altura: 100, profundidade: 100 }, 'roda', true),
    componente('roda.cubo', 'cilindro', { eixo: 'y', diametro: 20, comprimento: 40 }, 'roda', false, { centro: [60, 0, 0], semi: [10, 20, 10] }),
    componente('roda.tampa', 'esfera', { diametro: 20 }, 'roda', false, { centro: [0, 60, 0], semi: [10, 10, 10] }),
  ];

  it('o componente com detalhe interno que passa do orçamento é recolhido à caixa do envelope da forma principal, e a perda é declarada', () => {
    const solta = forma('solta', 'caixa', { eixo: 'y', largura: 10, altura: 10, profundidade: 10 }, { centro: [300, 0, 0], semi: [5, 5, 5] });
    const cheio = traduzir([...roda(), solta]);
    expect(cheio.andaime.volumes).toHaveLength(4);
    expect(cheio.perdas).toEqual([]);
    const r = traduzir([...roda(), solta], { volumesMaximos: 2 });
    expect(r.andaime.volumes.map((v) => [v.id, v.tipo]).sort()).toEqual([['roda-aro', 'caixa'], ['solta', 'caixa']]);
    expect(r.tabela).toEqual({ 'roda.aro': 'roda-aro', 'roda.cubo': 'roda-aro', 'roda.tampa': 'roda-aro', solta: 'solta' });
    const [p] = r.perdas;
    expect(p).toMatchObject({ id: 'roda', tipo: 'componente', aproximacao: 'componente-recolhido-ao-envelope', volumeId: 'roda-aro', formas: ['roda.aro', 'roda.cubo', 'roda.tampa'] });
    expect(p.perdido).toEqual([{ codigo: 'detalhe-interno', descricao: expect.stringContaining('forma principal roda.aro') }]);
    /* o volume do esboço é a soma dos volumes das formas traduzidas, medidos antes de recolher */
    const antes = medirVolumes(compilarAndaime(cheio.andaime));
    const soma = ['roda-aro', 'roda-cubo', 'roda-tampa'].reduce((s, id) => s + antes.get(id).volume, 0);
    perto(p.volumeEsboco, soma, 1e-2);
    perto(p.volumeAndaime, 1e6, 1e-2);
    /* a união dos três passa de 50 em x (o cubo vai a 70) e em y (a tampa vai a 70): o desvio é de 20 mm */
    expect(p.erroEnvelope.mm).toBeCloseTo(20, 6);
    expect(p.envelopeAndaime).toEqual({ min: [-50, -50, -50], max: [50, 50, 50] });
    expect(r.andaime.envelope.max[0]).toBe(305);
    expect(() => normalizarAndaimeGlobal(r.andaime)).not.toThrow();
  });

  it('o recolhimento começa pelo componente de mais volumes, só toca quem tem pelo menos dois e recusa quando não basta', () => {
    const outra = [
      componente('par.a', 'caixa', { eixo: 'y', largura: 10, altura: 10, profundidade: 10 }, 'par', true, { centro: [500, 0, 0], semi: [5, 5, 5] }),
      componente('par.b', 'caixa', { eixo: 'y', largura: 10, altura: 10, profundidade: 10 }, 'par', false, { centro: [520, 0, 0], semi: [5, 5, 5] }),
    ];
    const r = traduzir([...roda(), ...outra], { volumesMaximos: 3 });
    expect(r.perdas.map((p) => p.id)).toEqual(['roda']);
    expect(r.andaime.volumes).toHaveLength(3);
    const dois = traduzir([...roda(), ...outra], { volumesMaximos: 2 });
    expect(dois.perdas.map((p) => p.id)).toEqual(['par', 'roda']);
    expect(() => traduzir([...roda(), ...outra], { volumesMaximos: 1 })).toThrow(/orçamento do alvo é 1/);
    expect(() => traduzir([forma('a', 'esfera', { diametro: 4 }), forma('b', 'esfera', { diametro: 4 })], { volumesMaximos: 1 })).toThrow(ErroDoTradutor);
    expect(() => traduzir(roda(), { volumesMaximos: 0 })).toThrow(/volumesMaximos/);
  });

  it('sem forma principal declarada, o recolhimento usa o envelope de todas as formas do componente, e o que não tem equivalente sai da lista', () => {
    const formas = [
      componente('p.a', 'caixa', { eixo: 'y', largura: 10, altura: 10, profundidade: 10 }, 'p', false, { semi: [5, 5, 5] }),
      componente('p.b', 'caixa', { eixo: 'y', largura: 10, altura: 10, profundidade: 10 }, 'p', false, { centro: [30, 0, 0], semi: [5, 5, 5] }),
      componente('p.furo', 'caixa', { eixo: 'y', largura: 10, altura: 10, profundidade: 10, furos: [{ diametro: 2, centro: [0, 0] }] }, 'p', false, { centro: [60, 0, 0], semi: [5, 5, 5] }),
      forma('fora', 'caixa', { eixo: 'y', largura: 10, altura: 10, profundidade: 10, furos: [{ diametro: 2, centro: [0, 0] }] }, { centro: [90, 0, 0], semi: [5, 5, 5] }),
    ];
    const antes = traduzir(formas);
    expect(antes.naoTraduzidas.map((n) => n.id)).toEqual(['p.furo', 'fora']);
    const r = traduzir(formas, { volumesMaximos: 1 });
    expect(r.naoTraduzidas.map((n) => n.id)).toEqual(['fora']);
    expect(r.andaime.volumes).toHaveLength(1);
    expect(r.andaime.volumes[0]).toMatchObject({ id: 'p-a', tipo: 'caixa', centro: [30, 0, 0], dimensoes: [70, 10, 10] });
    expect(r.perdas[0].perdido[0].descricao).toContain('o componente não declara forma principal');
    expect(r.perdas[0].erroEnvelope.mm).toBe(0);
    expect(r.tabela['p.furo']).toBe('p-a');
  });

  it('o resultado com perdas é determinístico, JSON puro, e não depende da ordem das formas', () => {
    const secoes = [{ w: -50, perfil: quadrado(100) }, { w: 50, perfil: quadrado(60) }];
    const formas = () => [
      forma('tronco', 'loft', loft(secoes)),
      forma('redonda', 'caixa', { eixo: 'y', largura: 100, altura: 40, profundidade: 60, raio: 10 }, { centro: [200, 0, 0] }),
      forma('chato', 'cilindro', { eixo: 'y', diametro: 20, comprimento: 100, achatado: { lado: '+x', profundidade: 2 } }, { centro: [400, 0, 0] }),
      ...roda().map((f) => ({ ...f, geometria: { ...f.geometria, centro: f.geometria.centro.map((c, i) => c + [0, 0, 300][i]) } })),
    ];
    const opcoes = { volumesMaximos: 5 };
    const a = JSON.stringify(traduzirFormasParaAndaime(dados(formas()), opcoes));
    const b = JSON.stringify(traduzirFormasParaAndaime(JSON.parse(JSON.stringify(dados(formas()))), opcoes));
    const invertido = traduzirFormasParaAndaime(dados([...formas()].reverse()), opcoes);
    expect(b).toBe(a);
    expect(JSON.stringify(JSON.parse(a))).toBe(a);
    expect(JSON.stringify(invertido.perdas)).toBe(JSON.stringify(JSON.parse(a).perdas));
    expect(JSON.parse(a).perdas.map((p) => p.id)).toEqual(['chato', 'redonda', 'roda', 'tronco']);
  });

  it('o modo estrito aceita o conjunto só com aproximações e continua recusando o que não tem equivalente', () => {
    const secoes = [{ w: -50, perfil: quadrado(100) }, { w: 50, perfil: quadrado(60) }];
    expect(traduzir([forma('tronco', 'loft', loft(secoes))], { estrito: true }).perdas).toHaveLength(1);
    expect(() => traduzir([forma('tronco', 'loft', loft(secoes)), forma('correia', 'envolve', { largura: 10, espessura: 2, fechado: true })], { estrito: true })).toThrow(/correia \(faixa/);
  });
});

describe('tradutor do nível zero: ids, regiões, andaime e modo estrito', () => {
  const cx = (id, extra) => forma(id, 'caixa', { eixo: 'y', largura: 10, altura: 10, profundidade: 10 }, extra);

  it('os ids viram slug do id da forma e a tabela leva cada id do esboço ao do andaime', () => {
    expect(slugDe('portaE.abaPainel1')).toBe('porta-e-aba-painel1');
    expect(slugDe('garfoE')).toBe('garfo-e');
    expect(slugDe('pés de apoio')).toBe('pes-de-apoio');
    expect(slugDe('HTTPServer_2')).toBe('http-server-2');
    const r = traduzir([cx('portaE.abaPainel1'), cx('garfoE'), cx('perna_frente')]);
    expect(r.tabela).toEqual({ 'portaE.abaPainel1': 'porta-e-aba-painel1', garfoE: 'garfo-e', perna_frente: 'perna-frente' });
    for (const id of Object.values(r.tabela)) expect(id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(new Set(Object.values(r.tabela)).size).toBe(3);
  });

  it('ids que dão o mesmo slug ganham o hash do original, nos dois, qualquer que seja a ordem', () => {
    const a = traduzir([cx('garfoE'), cx('garfo_e'), cx('outro')]);
    const b = traduzir([cx('outro'), cx('garfo_e'), cx('garfoE')]);
    expect(a.tabela.garfoE).toMatch(/^garfo-e-[0-9a-f]{8}$/);
    expect(a.tabela.garfo_e).toMatch(/^garfo-e-[0-9a-f]{8}$/);
    expect(a.tabela.garfoE).not.toBe(a.tabela.garfo_e);
    expect(a.tabela.outro).toBe('outro');
    expect(b.tabela).toEqual(a.tabela);
  });

  it('id sem nenhum caractere de slug ainda recebe um id válido', () => {
    const r = traduzir([cx('___')]);
    expect(r.tabela['___']).toMatch(/^forma-[0-9a-f]{8}$/);
  });

  it('as regiões são a unidade e a parte da forma, sem repetir, e sem nenhuma das duas vão para sem-regiao', () => {
    const r = traduzir([
      cx('a', { unidade: 'rodaDianteira', parte: 'quadro tubular' }),
      cx('b', { unidade: 'pernas', parte: 'pernas' }),
      cx('c', { parte: 'pés de apoio' }),
      cx('d', { unidade: 'chassi' }),
      cx('e'),
    ]);
    const regioes = Object.fromEntries(r.andaime.volumes.map((v) => [v.id, v.regioes]));
    expect(regioes).toEqual({ a: ['quadro-tubular', 'roda-dianteira'], b: ['pernas'], c: ['pes-de-apoio'], d: ['chassi'], e: ['sem-regiao'] });
  });

  it('as formas ocultas são referência do esboço: ficam fora do andaime e voltam em ocultas', () => {
    const r = traduzir([cx('visivel'), cx('guia', { oculto: true })]);
    expect(r.ocultas).toEqual(['guia']);
    expect(r.andaime.volumes.map((v) => v.id)).toEqual(['visivel']);
    expect(r.naoTraduzidas).toEqual([]);
    expect(r.tabela).toEqual({ visivel: 'visivel' });
  });

  it('o andaime sai aceito, com o envelope da união das caixas, o centro do conjunto e os pontos nomeados de dentro', () => {
    const r = traduzirFormasParaAndaime(dados([cx('a', { centro: [0, 0, 0], semi: [5, 5, 5] }), cx('b', { centro: [100, 0, 0], semi: [5, 5, 5] })], { pontos: { 'rodaFrente.eixo': [100, 0, 0], longe: [900, 0, 0] } }));
    expect(() => normalizarAndaimeGlobal(r.andaime)).not.toThrow();
    expect(r.andaime.envelope).toEqual({ min: [-5, -5, -5], max: [105, 5, 5] });
    expect(r.andaime.landmarks.map((l) => l.id)).toEqual(['centro-do-conjunto', 'roda-frente-eixo']);
    expect(r.andaime.landmarks[0].posicao).toEqual([50, 0, 0]);
    expect(r.andaime.formato).toBe('mecanifica.andaime-global@2');
    expect(r.andaime.unidade).toBe('mm');
    expect(r.andaime.eixos).toEqual({ direita: '+x', cima: '+y', frente: '+z' });
  });

  it('as opções do andaime (id, objetivo, alvo, família, intenção, eixos) passam', () => {
    const r = traduzir([cx('a')], { id: 'meu-andaime', objetivo: 'cadeira', alvo: 'alvo-cadeira', familia: 'veiculo', intencao: 'um texto', eixos: { direita: '+z', cima: '+y', frente: '-x' } });
    expect(r.andaime).toMatchObject({ id: 'meu-andaime', objetivo: 'cadeira', alvo: 'alvo-cadeira', familia: 'veiculo', intencao: 'um texto', eixos: { direita: '+z', cima: '+y', frente: '-x' } });
  });

  it('o modo estrito recusa o conjunto inteiro quando alguma forma visível não se traduz, e lista todas', () => {
    const formas = [cx('a'), forma('t', 'loft', { eixo: 'y', comprimento: 10, secoes: [] }), cx('c', { matriz: produto(rotZ(30), rotX(20)) })];
    expect(traduzir(formas).naoTraduzidas).toHaveLength(2);
    try {
      traduzir(formas, { estrito: true });
      throw new Error('devia recusar');
    } catch (e) {
      expect(e).toBeInstanceOf(ErroDoTradutor);
      expect(e.message).toContain('2 forma(s) sem correspondência na N2');
      expect(e.message).toContain('t (loft');
      expect(e.message).toContain('c (caixa');
      expect(e.naoTraduzidas.map((n) => n.id)).toEqual(['t', 'c']);
    }
    expect(() => traduzir([cx('a'), cx('guia', { oculto: true })], { estrito: true })).not.toThrow();
  });

  it('sem nenhuma forma traduzida a tradução recusa, com os motivos', () => {
    expect(() => traduzir([forma('t', 'loft', { eixo: 'y', comprimento: 10, secoes: [] })])).toThrow(/nenhuma forma visível se traduz: t \(loft/);
    expect(() => traduzir([cx('guia', { oculto: true })])).toThrow(/não tem forma visível/);
  });

  it('só lê o formato das formas resolvidas', () => {
    expect(() => traduzirFormasParaAndaime({ formato: 'outro@1', formas: [] })).toThrow(ErroDoTradutor);
    expect(() => traduzirFormasParaAndaime(null)).toThrow(ErroDoTradutor);
    expect(() => traduzir([forma('m', 'caixa', { eixo: 'y', largura: 1, altura: 1, profundidade: 1 }, { matriz: [[1, 0], [0, 1]] })])).toThrow(/matriz inválida/);
  });
});

describe('tradutor do nível zero: determinismo e fronteira', () => {
  const formas = () => [
    forma('quadro', 'tubo', { diametro: 10, raioCurva: 30, caminho: [[0, 0, 0], [100, 0, 0], [100, 100, 0]], trilha: { pontos: [], fechado: false } }, { centro: [50, 50, 0], unidade: 'chassi' }),
    forma('haste', 'cilindro', { eixo: 'y', diametro: 12, comprimento: 80 }, { matriz: produto(rotZ(35), rotX(50)), parte: 'hastes' }),
    forma('caixa', 'caixa', { eixo: 'y', largura: 10, altura: 20, profundidade: 30 }, { matriz: rotZ(30) }),
    forma('bola', 'esfera', { diametro: 30 }),
    forma('tanque', 'loft', { eixo: 'y', eixosDoPerfil: ['x', 'z'], comprimento: 100, secoes: [{ w: -50, perfil: [[-50, -50], [50, -50], [50, 50], [-50, 50]] }, { w: 50, perfil: [[-30, -30], [30, -30], [30, 30], [-30, 30]] }] }),
    forma('redonda', 'caixa', { eixo: 'y', largura: 10, altura: 20, profundidade: 30, raio: 3 }),
    forma('correia', 'envolve', { largura: 10, espessura: 2, fechado: true }),
  ];

  it('a mesma entrada dá o mesmo resultado, byte a byte, sem alterar a entrada, e o resultado é JSON puro', () => {
    const entrada = dados(formas());
    const antes = JSON.stringify(entrada);
    const a = JSON.stringify(traduzirFormasParaAndaime(entrada));
    const b = JSON.stringify(traduzirFormasParaAndaime(JSON.parse(antes)));
    expect(b).toBe(a);
    expect(JSON.stringify(entrada)).toBe(antes);
    expect(JSON.stringify(JSON.parse(a))).toBe(a);
  });

  it('a ordem das formas não muda o andaime nem a tabela', () => {
    const direto = traduzir(formas());
    const invertido = traduzir([...formas()].reverse());
    expect(JSON.stringify(invertido.andaime)).toBe(JSON.stringify(direto.andaime));
    expect(invertido.tabela).toEqual(direto.tabela);
  });

  it('o tradutor não importa o módulo do esboço, Three.js nem lê arquivo', () => {
    const texto = readFileSync(new URL('./tradutor-nivel-zero.js', import.meta.url), 'utf8');
    const importacoes = texto.split('\n').filter((l) => /^\s*import\b/.test(l));
    expect(importacoes.length).toBeGreaterThan(0);
    for (const linha of importacoes) {
      expect(linha).not.toMatch(/modulos\/esboco/);
      expect(linha).not.toMatch(/three/);
      expect(linha).not.toMatch(/node:/);
    }
  });
});

describe('tradutor do nível zero: o volume no quadro local (a base do sólido do esboço)', () => {
  it('a forma girada em dois eixos, que o andaime recusa, tem o volume local com as medidas dela', () => {
    const livre = forma('pa', 'cone', { eixo: 'y', diametro: 20, diametroTopo: 10, comprimento: 40 }, { matriz: produto(rotX(30), rotZ(40)) });
    expect(() => traduzir([livre])).toThrow(/gira em dois eixos/);
    const local = volumeLocalDaForma(livre);
    expect(local.volume).toMatchObject({ tipo: 'cone', eixo: 'y', raioBase: 10, raioTopo: 5, comprimento: 40 });
    expect(local.aproximacao).toBeNull();
  });

  it('a matriz não entra: a caixa sai com as medidas do esboço no eixo de cada uma', () => {
    const caixa = forma('cx', 'caixa', { eixo: 'y', largura: 10, altura: 20, profundidade: 30 }, { matriz: rotY(90), centro: [100, 0, 0] });
    expect(volumeLocalDaForma(caixa).volume).toEqual({ tipo: 'caixa', dimensoes: [10, 20, 30] });
  });

  it('o recorte não entra, e a aproximação diz o que a N2 mudou na forma', () => {
    const recortada = forma('cx', 'caixa', { eixo: 'y', largura: 10, altura: 20, profundidade: 30, raio: 3, recorte: { cortadores: [{ id: 'm', retiradoMm3: 5 }], volumeCheioMm3: 6000, volumeMm3: 5995 } });
    const local = volumeLocalDaForma(recortada);
    expect(local.volume.tipo).toBe('extrusao');
    expect(local.aproximacao.codigo).toBe('caixa-com-raio-como-extrusao');
    expect(local.aproximacao.perdido.map((p) => p.codigo)).toEqual(['tipo']);
  });

  it('o tubo continua relativo ao centro da forma, em mundo', () => {
    const tubo = forma('tb', 'tubo', { diametro: 10, raioCurva: 0, caminho: [[100, 0, 0], [100, 50, 0]], trilha: { pontos: [[100, 0, 0], [100, 50, 0]], fechado: false } }, { centro: [100, 25, 0] });
    expect(volumeLocalDaForma(tubo).volume).toMatchObject({ tipo: 'tubo', caminho: [[0, -25, 0], [0, 25, 0]], raio: 5 });
  });

  it('o que a N2 não tem é recusado com ErroDoTradutor e o motivo', () => {
    expect(() => volumeLocalDaForma(forma('f', 'envolve', { largura: 10, espessura: 2 }))).toThrow(ErroDoTradutor);
    expect(() => volumeLocalDaForma(forma('f', 'envolve', { largura: 10, espessura: 2 }))).toThrow(/a N2 não tem faixa/);
    expect(() => volumeLocalDaForma(forma('cx', 'caixa', { eixo: 'y', largura: 10, altura: 20, profundidade: 30, furos: [{ diametro: 4, centro: [0, 0] }] }))).toThrow(/caixa com furo/);
  });

  it('não muda o andaime: a tradução da mesma forma continua igual', () => {
    const f = forma('cx', 'caixa', { eixo: 'y', largura: 10, altura: 20, profundidade: 30 }, { matriz: rotZ(30) });
    const antes = JSON.stringify(traduzir([f]));
    volumeLocalDaForma(f);
    expect(JSON.stringify(traduzir([f]))).toBe(antes);
    expect(f.geometria.matriz).toEqual(limpa(rotZ(30)));
  });
});
