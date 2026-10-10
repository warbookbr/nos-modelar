/* O tradutor do nível zero sobre formas resolvidas escritas à mão (sem o módulo do esboço): cada tipo exato com a geometria
   que o andaime tem de dar, a rotação que gira o perfil, o que fica de fora com o motivo, os ids em slug, as regiões, a recusa
   do conjunto no modo estrito e a determinação. A prova sobre as fixtures do esboço está em
   `tools/mecanifica/esboco-para-andaime.test.mjs`. */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { normalizarAndaimeGlobal } from './forma-global.js';
import { ErroDoTradutor, FORMATO_FORMAS_RESOLVIDAS, slugDe, traduzirFormasParaAndaime } from './tradutor-nivel-zero.js';
import { compilarAndaime, medirVolumes } from '../../tools/fixtures/nivel-zero/medir-blocagem.js';

const I = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
const grau = (g) => [Math.cos(g * Math.PI / 180), Math.sin(g * Math.PI / 180)];
const rotX = (g) => { const [c, s] = grau(g); return [[1, 0, 0], [0, c, -s], [0, s, c]]; };
const rotY = (g) => { const [c, s] = grau(g); return [[c, 0, s], [0, 1, 0], [-s, 0, c]]; };
const rotZ = (g) => { const [c, s] = grau(g); return [[c, -s, 0], [s, c, 0], [0, 0, 1]]; };
const produto = (a, b) => a.map((l) => [0, 1, 2].map((j) => l[0] * b[0][j] + l[1] * b[1][j] + l[2] * b[2][j]));
const limpa = (m) => m.map((l) => l.map((x) => (Math.abs(x) < 1e-12 ? 0 : x)));

/* Uma forma resolvida como `formasResolvidas` a entrega: só os campos que o tradutor lê, com a caixa de mundo de `semi`. */
function forma(id, tipo, geometria, { centro = [0, 0, 0], matriz = I, semi = [50, 50, 50], unidade = null, parte = null, oculto = false } = {}) {
  return {
    id, tipo, oculto, unidade, parte, origem: null,
    geometria: { centro, caixa: { min: centro.map((c, i) => c - semi[i]), max: centro.map((c, i) => c + semi[i]) }, matriz: limpa(matriz), ancoras: {}, ...geometria },
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

  it('caixa com raio, chanfro ou furo fica fora; raio zero é caixa', () => {
    const base = { eixo: 'y', largura: 10, altura: 20, profundidade: 30 };
    const r = traduzir([
      forma('redonda', 'caixa', { ...base, raio: 4 }),
      forma('chanfrada', 'caixa', { ...base, chanfro: 2 }),
      forma('furada', 'caixa', { ...base, furos: [{ diametro: 4, centro: [0, 0] }] }),
      forma('seca', 'caixa', { ...base, raio: 0 }),
    ]);
    expect(r.naoTraduzidas.map((n) => [n.id, n.motivo.split(' ').slice(0, 3).join(' ')])).toEqual([
      ['redonda', 'caixa com raio'], ['chanfrada', 'caixa com chanfro'], ['furada', 'caixa com furo:'],
    ]);
    expect(r.andaime.volumes.map((v) => v.id)).toEqual(['seca']);
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

  it('cilindro com face plana e cilindro com poucos lados ficam fora; a recusa da N2 vira motivo', () => {
    const r = traduzir([
      forma('chato', 'cilindro', { eixo: 'y', diametro: 20, comprimento: 100, achatado: { lado: '+x', profundidade: 2 } }),
      forma('poucos', 'cilindro', { eixo: 'y', diametro: 20, comprimento: 100, lados: 6 }),
      forma('ok', 'cilindro', { eixo: 'y', diametro: 20, comprimento: 100 }),
    ]);
    expect(r.naoTraduzidas.map((n) => n.id)).toEqual(['chato', 'poucos']);
    expect(r.naoTraduzidas[0].motivo).toContain('face plana');
    expect(r.naoTraduzidas[1].motivo).toContain('a N2 recusa o volume');
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

  it('loft e faixa ficam fora, com o motivo; nunca viram outra forma', () => {
    const r = traduzir([
      forma('tanque', 'loft', { eixo: 'y', comprimento: 10, secoes: [] }),
      forma('correia', 'envolve', { largura: 10, espessura: 2, fechado: true }),
      forma('ok', 'esfera', { diametro: 4 }),
    ]);
    expect(r.naoTraduzidas.map((n) => [n.id, n.tipo])).toEqual([['tanque', 'loft'], ['correia', 'envolve']]);
    expect(r.andaime.volumes).toHaveLength(1);
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
      expect(e.message).toContain('2 forma(s) sem correspondência exata');
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
    forma('tanque', 'loft', { eixo: 'y', comprimento: 10, secoes: [] }),
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
