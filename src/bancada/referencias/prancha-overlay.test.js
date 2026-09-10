/* prancha-overlay.test.js — plano de foto é apresentação, não modelo procedural. */
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { criarGerenciadorReferencias3D } from './prancha-overlay.js';

describe('gerenciador 3D de referências', () => {
  it('materializa, atualiza e remove somente o plano de imagem de referência', () => {
    const cena = new THREE.Scene();
    const gerenciador = criarGerenciadorReferencias3D({ cena });
    const textura = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
    textura.needsUpdate = true;

    gerenciador.definirImagemReferencia({
      id: 'bike',
      fonte: 'url',
      url: 'https://exemplo.test/bike.jpg',
      rotulo: 'Bicicleta lateral',
      alinhamento: { x: 0.2, y: 1, z: 0, largura: 4, altura: 2, escala: 1, opacidade: 1, lado: 'direita' },
    }, { textura });

    const plano = gerenciador.grupo.children.find((filho) => filho.name === '__imagem_referencia__');
    expect(plano).toBeInstanceOf(THREE.Mesh);
    expect(plano.position.toArray()).toEqual([0.2, 1, 0]);

    gerenciador.atualizarImagemReferencia({ opacidade: 0.4 });
    expect(plano.material.opacity).toBe(0.4);

    gerenciador.removerImagemReferencia();
    expect(gerenciador.grupo.children.some((filho) => filho.name === '__imagem_referencia__')).toBe(false);
  });
});
