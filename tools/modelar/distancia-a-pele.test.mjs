import { describe, expect, it } from 'vitest';
import { conferirPele, distanciaAPele, projetorDaPele, veredito } from './distancia-a-pele.mjs';
import { chapaDaReceita } from './zebra-numerica.mjs';
import { SUPERFICIES_ANALITICAS, painel } from '../fixtures/correcao-de-superficie/chapas.mjs';

const retalho = (nome, extra = {}) => ({ u: [0, 1], v: [0, 1], ponto: SUPERFICIES_ANALITICAS[nome].ponto, ...extra });
/* pontos perto da superfície, dentro do domínio, por uma sequência fixa (sem sorteio) */
const pertos = (nome, n = 40) => Array.from({ length: n }, (_, k) => {
  const a = 0.2 + 0.6 * ((k * 0.618034) % 1); const b = 0.2 + 0.6 * ((k * 0.414214) % 1);
  const p = SUPERFICIES_ANALITICAS[nome].ponto(a, b);
  return [p[0] + 4 * Math.sin(k), p[1] + 4 * Math.cos(1.3 * k), p[2] + 4 * Math.sin(0.7 * k + 1)];
});

describe('o pé na pele', () => {
  it.each(['paraboloide', 'calota', 'toro'])('no %s, a distância é a exata, com o lado da normal constante', (nome) => {
    const S = SUPERFICIES_ANALITICAS[nome];
    const projetar = projetorDaPele(retalho(nome), { passoMm: 25 });
    const lados = new Set();
    for (const p of pertos(nome)) {
      const m = projetar(p);
      expect(m.fora).toBe(false);
      expect(Math.abs(m.d - Math.abs(S.distancia(p)))).toBeLessThan(1e-6);
      if (Math.abs(S.distancia(p)) > 1e-3) lados.add(m.s * Math.sign(S.distancia(p)));
    }
    expect(lados.size).toBe(1);
  });

  it('o ponto além da borda do domínio conta como fora da pele, e o longe da grade não tem pé', () => {
    const projetar = projetorDaPele(retalho('calota'), { passoMm: 25, alcanceMm: 30 });
    const alem = SUPERFICIES_ANALITICAS.calota.ponto(1, 0.5); alem[0] += 15;
    expect(projetar(alem).fora).toBe(true);
    expect(projetar([0, 200, 0])).toBe(null);
  });

  it('com espelho, o ponto do outro lado mede contra a imagem da pele', () => {
    const lado = { u: [100, 300], v: [0, 200], ponto: (u, v) => [u, 0, v] };
    const sem = projetorDaPele(lado); const com = projetorDaPele({ ...lado, espelho: 'x' });
    expect(sem([-200, 3, 100])).toBe(null);
    const m = com([-200, 3, 100]);
    expect(m.fora).toBe(false);
    expect(m.d).toBeCloseTo(3, 9);
  });

  it('recusa a pele mal declarada dizendo o campo e o valor', () => {
    expect(() => conferirPele('p', { u: [1, 0], v: [0, 1], ponto: () => [0, 0, 0] })).toThrow(/em u o domínio \[a, b\] com a < b, e veio \[1,0\]/);
    expect(() => conferirPele('p', { u: [0, 1], v: [0, 1] })).toThrow(/em ponto a função/);
    expect(() => conferirPele('p', { u: [0, 1], v: [0, 1], ponto: () => [0, 0, 0], espelho: 'w' })).toThrow(/espelho 'x', 'y' ou 'z', e veio "w"/);
    expect(() => conferirPele('p', { u: [0, 1], v: [0, 1], ponto: () => [0, NaN, 0] })).toThrow(/devolveu \[0,null,0\]/);
  });
});

describe('a distância da chapa à pele', () => {
  it('no painel de prova sem ruído, repete a distância ao painel do banco de provas da correção de superfície (4,04 mm)', async () => {
    const { chapa } = await chapaDaReceita('rede-sem-ruido', { cache: false });
    const pele = { painel: { u: [0, 1000], v: [0, 500], ponto: (u, v) => [u, painel(u, v), v] } };
    const r = distanciaAPele(chapa, pele, { caixas: { chapa: {}, miolo: { x: [100, 900], z: [100, 400] } } });
    const [chapaToda, miolo] = r.peles[0].regioes;
    expect(chapaToda.medidos + chapaToda.foraDaPele + chapaToda.longe).toBe(chapaToda.pontos);
    expect(chapaToda.longe).toBe(0);
    expect(miolo.maxMm).toBeGreaterThan(3.9);
    expect(miolo.maxMm).toBeLessThan(4.1);
    expect(miolo.medidos).toBeLessThan(chapaToda.medidos);
    /* a pele 2 mm acima: a chapa fica do lado de -y, que é o da normal ∂u × ∂v deste retalho */
    const acima = distanciaAPele(chapa, { painel: { ...pele.painel, ponto: (u, v) => [u, painel(u, v) + 2, v] } });
    expect(acima.peles[0].regioes[0].paraForaMm).toBeGreaterThan(chapaToda.paraForaMm + 1.9);
  });

  it('recusa a receita sem pele e a região sem face', async () => {
    const { chapa } = await chapaDaReceita('rede-sem-ruido', { cache: false });
    expect(() => distanciaAPele(chapa, {})).toThrow(/exporte PELE\(PARAMS\)/);
    const pele = { painel: { u: [0, 1000], v: [0, 500], ponto: (u, v) => [u, painel(u, v), v] } };
    expect(() => distanciaAPele(chapa, pele, { caixas: { vazia: { x: [5000, 6000] } } })).toThrow(/região 'vazia' não tem face/);
  });
});

describe('o veredito que junta a zebra à distância', () => {
  const distancia = (maxMm, limiteMm) => ({ peles: [{ nome: 'flanco', ...(limiteMm ? { limiteMm } : {}), regioes: [{ nome: 'porta', maxMm, onde: [1, 2, 3] }] }] });
  const zebra = (lacosEsperados) => ({ regioes: [{ nome: 'porta', lacosEsperados }] });

  it('aprova a zebra que não sobe com a chapa dentro do limite', () => {
    expect(veredito({ distancia: distancia(1.2), zebra: zebra(2), base: { zebra: zebra(2.04) }, limiteMm: 1.5 })).toEqual({ aprovada: true, problemas: [] });
  });

  it('reprova a zebra que sobe além da folga, mesmo com a chapa na pele', () => {
    const v = veredito({ distancia: distancia(0.1), zebra: zebra(2.1), base: { zebra: zebra(2) }, limiteMm: 1.5 });
    expect(v.aprovada).toBe(false);
    expect(v.problemas).toEqual([expect.stringMatching(/a zebra subiu na região 'porta': de 2 para 2.1/)]);
  });

  it('reprova a chapa lisa que sai da pele, que é o caso da onda de 400 mm', () => {
    const v = veredito({ distancia: distancia(8.6, 1.5), zebra: zebra(0), base: { zebra: zebra(2) } });
    expect(v.problemas).toEqual([expect.stringMatching(/a chapa fica a 8.6 mm dela em \[1,2,3\], e o limite é 1.5 mm/)]);
  });

  it('recusa a comparação sem a zebra de um dos lados', () => {
    expect(() => veredito({ distancia: distancia(1), zebra: zebra(1), base: {} })).toThrow(/grave-a com --zebra/);
    expect(() => veredito({ distancia: distancia(1), base: { zebra: zebra(1) } })).toThrow(/meça com --zebra/);
  });
});
