/* material-fisico.test.js — a tradução do material normalizado para o material do Three.js (fatia 2 do plano de materiais realistas):
 * o material físico só nasce quando a declaração traz campo físico novo, e cada campo vai para a propriedade certa. */
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { adaptarThree, pedeMaterialFisico, propriedadesFisicas, ESPESSURA_DO_VIDRO, DISTANCIA_DE_ATENUACAO_DO_VIDRO } from './adaptar-three.js';
import { normalizarMaterial } from './material-da-receita.js';
import { executarReceita } from './executar-receita.js';
import receitaDeProva, { MATERIAIS } from '../../tools/fixtures/acervo/materiais-de-prova/receita.js';

const materialDaParte = (partes, nome) => partes.get(nome).children[0].material;

describe('quando o material vira físico', () => {
  it('declaração sem campo físico novo fica como estava', () => {
    for (const definicao of [{}, { cor: '#336699', aspereza: 0.3, metalicidade: 1 }, { mistura: 'transparente', opacidade: 0.4 },
      { flocos: 0.5, relevo: { tipo: 'granulado' } }, { asperezaDoVerniz: 0.5 }]) {
      expect(pedeMaterialFisico(normalizarMaterial('m', definicao)), JSON.stringify(definicao)).toBe(false);
    }
  });

  it('cada campo físico novo, sozinho, pede o material físico', () => {
    for (const definicao of [{ verniz: 0.2 }, { transmissao: 0.5 }, { tomDoVidro: '#a8cdbd' }, { indiceDeRefracao: 1.33 }]) {
      expect(pedeMaterialFisico(normalizarMaterial('m', definicao)), JSON.stringify(definicao)).toBe(true);
    }
  });
});

describe('os campos vão para as propriedades certas', () => {
  it('verniz, aspereza do verniz, transmissão, índice e tom do vidro', () => {
    const p = propriedadesFisicas(normalizarMaterial('v', {
      verniz: 0.7, asperezaDoVerniz: 0.12, transmissao: 0.9, indiceDeRefracao: 1.45, tomDoVidro: '#a8cdbd',
    }));
    expect(p).toMatchObject({ clearcoat: 0.7, clearcoatRoughness: 0.12, transmission: 0.9, ior: 1.45 });
    expect(p.attenuationColor.getHexString()).toBe(new THREE.Color('#a8cdbd').getHexString());
    expect(p.thickness).toBe(ESPESSURA_DO_VIDRO);
    expect(p.attenuationDistance).toBe(DISTANCIA_DE_ATENUACAO_DO_VIDRO);
  });

  it('sem vidro não há espessura nem atenuação', () => {
    const p = propriedadesFisicas(normalizarMaterial('t', { verniz: 1 }));
    expect(p.thickness).toBeUndefined();
    expect(p.attenuationColor).toBeUndefined();
  });
});

describe('na cena da peça de prova', () => {
  const { partes } = adaptarThree(executarReceita(receitaDeProva).neutro, { materiais: MATERIAIS });

  it('tinta, vidro, aço pintado e plástico são físicos; metal espelhado, borracha e anteparo seguem padrão', () => {
    for (const nome of ['placaDeTinta', 'placaDeVidro', 'discoDeAcoPintado', 'blocoDePlastico']) {
      expect(materialDaParte(partes, nome).isMeshPhysicalMaterial, nome).toBe(true);
    }
    for (const nome of ['calotaEspelhada', 'pneuDeBorracha', 'anteparoDoVidro']) {
      const m = materialDaParte(partes, nome);
      expect(m.isMeshPhysicalMaterial, nome).toBeFalsy();
      expect(m.isMeshStandardMaterial, nome).toBe(true);
    }
  });

  it('a tinta tem o verniz inteiro; o vidro transmite e não é transparência simples', () => {
    const tinta = materialDaParte(partes, 'placaDeTinta');
    expect(tinta.clearcoat).toBe(1);
    expect(tinta.clearcoatRoughness).toBeCloseTo(0.04, 6);
    const vidro = materialDaParte(partes, 'placaDeVidro');
    expect(vidro.transmission).toBe(1);
    expect(vidro.ior).toBe(1.5);
    expect(vidro.transparent).toBe(false);
    expect(vidro.opacity).toBe(1);
    expect(vidro.attenuationColor.getHexString()).toBe('a8cdbd');
  });

  it('o aço pintado e o plástico têm verniz fosco, entre o fosco e o brilhante', () => {
    const aco = materialDaParte(partes, 'discoDeAcoPintado');
    const plastico = materialDaParte(partes, 'blocoDePlastico');
    expect(aco.clearcoat).toBeCloseTo(0.3, 6);
    expect(plastico.clearcoat).toBeCloseTo(0.2, 6);
    expect(aco.clearcoatRoughness).toBeGreaterThan(0.2);
    expect(plastico.clearcoatRoughness).toBeGreaterThan(0.2);
  });
});
