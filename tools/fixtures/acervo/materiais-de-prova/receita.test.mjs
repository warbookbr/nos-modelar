/* receita.test.mjs — a peça de prova dos materiais declara os seis materiais do plano, passa pelo normalizador e abre na bancada. */
import { describe, expect, it } from 'vitest';
import receita, { MATERIAIS, TABELA, gerarPassos } from './receita.js';
import { executarReceita } from '../../../../src/autoria/executar-receita.js';
import { adaptarThree } from '../../../../src/autoria/adaptar-three.js';
import { descreverPeca } from '../../../../src/autoria/descrever-partes.js';
import { normalizarMateriais } from '../../../../src/autoria/material-da-receita.js';
import { listarAcervo, listarParaBancada } from '../../../../src/bancada/acervo-receitas.js';

const malha = () => executarReceita(receita).neutro;
/* o anteparo é a barra escura atrás do vidro, no mesmo x dele: fica fora da fila das seis peças */
const ANTEPARO = 'anteparoDoVidro';
const PARTES = ['placaDeTinta', 'placaDeVidro', 'calotaEspelhada', 'discoDeAcoPintado', 'pneuDeBorracha', 'blocoDePlastico', 'placaDeLente'];

describe('peça de prova dos materiais', () => {
  it('declara os seis materiais do plano e os da lente, dos flancos do pneu e do anteparo do vidro, e o normalizador os aceita', () => {
    expect(Object.keys(MATERIAIS).sort()).toEqual(
      ['acoPintado', 'anteparoDoVidro', 'borrachaComLetras', 'borrachaComRelevo', 'lenteDePrismas', 'metalEspelhado', 'plasticoGranulado', 'tintaComVerniz', 'vidro'],
    );
    const n = normalizarMateriais(MATERIAIS);
    expect(n.tintaComVerniz.verniz).toBe(1);
    expect(n.vidro).toMatchObject({ transmissao: 1, indiceDeRefracao: 1.5, tomDoVidro: '#a8cdbd', mistura: 'transparente' });
    expect(n.metalEspelhado).toMatchObject({ metalicidade: 1, aspereza: 0.02 });
    expect(n.acoPintado.verniz).toBeGreaterThan(0);
    expect(n.acoPintado.metalicidade).toBeGreaterThan(0.4);
    expect(n.acoPintado.metalicidade).toBeLessThan(0.9);
    expect(n.acoPintado.asperezaDoVerniz).toBeGreaterThan(0.2);
    expect(n.borrachaComRelevo.relevo.tipo).toBe('bandaDeRodagem');
    expect(n.borrachaComLetras.relevo.tipo).toBe('letras');
    expect(n.lenteDePrismas.relevo.tipo).toBe('prismas');
    expect(n.plasticoGranulado.relevo.tipo).toBe('granulado');
  });

  it('entrega as seis partes e o anteparo, cada uma com seu material, sem órfão nem face sem parte', () => {
    const neutro = malha();
    expect(neutro.orfaos ?? []).toEqual([]);
    const descricao = descreverPeca(neutro);
    expect(descricao.partes.map((p) => p.nome).sort()).toEqual([...PARTES, ANTEPARO].sort());
    expect(descricao.totais.facesSemParte).toBe(0);
    expect(descricao.aparencia.materiais.map((m) => m.nome).sort()).toEqual(Object.keys(MATERIAIS).sort());
  });

  it('a cena traz uma malha por material, sem fundir materiais diferentes', () => {
    const { partes } = adaptarThree(malha(), { materiais: MATERIAIS });
    expect([...partes.keys()].sort()).toEqual([...PARTES, ANTEPARO].sort());
    const cores = [...partes.values()].map((g) => g.children[0].material.color.getHexString());
    expect(new Set(cores).size).toBe(8);
  });

  it('o pneu tem dois materiais: os flancos levam as letras e a banda com os ombros leva o relevo de rodagem', () => {
    const { partes } = adaptarThree(malha(), { materiais: MATERIAIS });
    const malhas = partes.get('pneuDeBorracha').children;
    expect(malhas).toHaveLength(2);
    const porRelevo = Object.fromEntries(malhas.map((g) => [g.userData.faces.length, g]));
    const contagens = malhas.map((g) => g.userData.faces.length).sort((a, b) => a - b);
    /* 48 lados: dois flancos de 48 faces, e a banda com os dois ombros de 48 faces cada, mais o aro de dentro na parte da banda */
    expect(contagens).toEqual([96, 48 * 4]);
    expect(Object.keys(porRelevo)).toHaveLength(2);
  });

  it('só o material com relevo ganha uv e mapas; os outros seguem sem coordenada de textura', () => {
    const { partes } = adaptarThree(malha(), { materiais: MATERIAIS });
    const malhaDe = (nome, i = 0) => partes.get(nome).children[i];
    for (const nome of ['placaDeTinta', 'placaDeVidro', 'calotaEspelhada', 'discoDeAcoPintado', 'anteparoDoVidro']) {
      const m = malhaDe(nome);
      expect(m.geometry.getAttribute('uv'), nome).toBeUndefined();
      expect(m.material.normalMap ?? null, nome).toBeNull();
      expect(m.material.roughnessMap ?? null, nome).toBeNull();
    }
    for (const nome of ['placaDeLente', 'blocoDePlastico']) {
      const m = malhaDe(nome);
      expect(m.geometry.getAttribute('uv').count, nome).toBe(m.geometry.getAttribute('position').count);
      expect(m.material.normalMap, nome).toBeTruthy();
      expect(m.material.roughnessMap, nome).toBeTruthy();
    }
    for (const m of partes.get('pneuDeBorracha').children) {
      expect(m.geometry.getAttribute('uv').count).toBe(m.geometry.getAttribute('position').count);
      expect(m.material.normalMap).toBeTruthy();
    }
  });

  it('a banda do pneu recebe uma faixa contínua e centrada: v de 0 a 1 de ombro a ombro e u dando a volta em tiles inteiros', () => {
    const { partes } = adaptarThree(malha(), { materiais: MATERIAIS });
    const banda = partes.get('pneuDeBorracha').children.find((m) => m.material.normalMap && m.userData.faces.length > 100);
    const uv = banda.geometry.getAttribute('uv');
    const pos = banda.geometry.getAttribute('position');
    let menorU = Infinity; let maiorU = -Infinity; let menorV = Infinity; let maiorV = -Infinity;
    for (let t = 0; t < uv.count; t += 3) {
      const us = [0, 1, 2].map((k) => uv.getX(t + k));
      /* nenhum triângulo estica por uma volta inteira: a emenda do ângulo está desenrolada */
      expect(Math.max(...us) - Math.min(...us)).toBeLessThan(1);
      for (let k = 0; k < 3; k += 1) {
        menorU = Math.min(menorU, us[k]); maiorU = Math.max(maiorU, us[k]);
        menorV = Math.min(menorV, uv.getY(t + k)); maiorV = Math.max(maiorV, uv.getY(t + k));
      }
    }
    /* a banda tem 80 mm de largura: o desenho a cobre uma vez, e a circunferência de 628 mm dá 8 tiles de 80 mm */
    expect(menorV).toBeCloseTo(0, 5);
    expect(maiorV).toBeCloseTo(1, 5);
    expect(maiorU - menorU).toBeGreaterThan(7.5);
    expect(maiorU - menorU).toBeLessThan(8.5);
    expect(pos.count).toBe(uv.count);
    /* o mapa foi gerado para a largura medida: tile quadrado */
    expect(banda.material.normalMap.image.width).toBe(banda.material.normalMap.image.height);
  });

  it('o flanco do pneu leva uma linha de texto: v de 0 a 1 do raio de fora ao de dentro, o mapa mais largo que alto', () => {
    const { partes } = adaptarThree(malha(), { materiais: MATERIAIS });
    const flanco = partes.get('pneuDeBorracha').children.find((m) => m.material.normalMap && m.userData.faces.length <= 100);
    const uv = flanco.geometry.getAttribute('uv');
    let menorV = Infinity; let maiorV = -Infinity;
    for (let k = 0; k < uv.count; k += 1) { menorV = Math.min(menorV, uv.getY(k)); maiorV = Math.max(maiorV, uv.getY(k)); }
    expect(menorV).toBeCloseTo(0, 5);
    expect(maiorV).toBeCloseTo(1, 5);
    const { width, height } = flanco.material.normalMap.image;
    expect(width).toBeGreaterThan(height * 3);
  });

  it('é determinística: duas execuções dão a mesma malha', () => {
    const a = malha();
    const b = malha();
    expect(a.V.size).toBe(b.V.size);
    expect(a.F.size).toBe(b.F.size);
    for (const [id, p] of a.V) expect(b.V.get(id)).toEqual(p);
    expect(JSON.stringify(gerarPassos(TABELA))).toBe(JSON.stringify(gerarPassos(TABELA)));
  });

  it('assenta no chão e mantém as seis peças separadas em x', () => {
    const neutro = malha();
    const caixa = new Map();
    for (const f of neutro.F.values()) for (const v of f.vs) {
      const p = neutro.V.get(v);
      const c = caixa.get(f.parte) ?? { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
      for (let i = 0; i < 3; i++) { c.min[i] = Math.min(c.min[i], p[i]); c.max[i] = Math.max(c.max[i], p[i]); }
      caixa.set(f.parte, c);
    }
    for (const nome of PARTES) expect(caixa.get(nome).min[1], nome).toBeCloseTo(0, 6);
    const porX = PARTES.map((n) => caixa.get(n)).sort((a, b) => a.min[0] - b.min[0]);
    for (let i = 1; i < porX.length; i++) expect(porX[i].min[0]).toBeGreaterThan(porX[i - 1].max[0]);
  });

  it('a bancada a lista como ensaio e a abre pelo caminho de ENSAIOS, fora do acervo', async () => {
    const entrada = listarParaBancada().find((e) => e.id === 'materiais-de-prova');
    expect(entrada).toBeDefined();
    expect(entrada.ensaio).toBe(true);
    expect(listarAcervo().some((e) => e.id === 'materiais-de-prova')).toBe(false);
    const aberta = await entrada.carregar();
    expect(Array.isArray(aberta.PASSOS)).toBe(true);
    expect(aberta.MATERIAIS).toBe(MATERIAIS);
  });
});
