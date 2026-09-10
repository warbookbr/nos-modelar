/* prancha-overlay.test.js — plano de foto é apresentação, não modelo procedural. */
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { criarGerenciadorReferencias3D } from './prancha-overlay.js';
import { alvosDeEnquadramento } from '../estado-bancada.js';

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

  /* Fronteira entre referência visual e modelo procedural.

     A referência existe para ser olhada e nunca para ser medida. Se o plano da
     foto entrar na raiz do modelo, ele passa a contar na caixa envolvente, no
     enquadramento, na estatística e na medição sem cabeça — e a bancada começa
     a medir a fotografia em vez da peça, com número que parece legítimo. Este
     teste guarda exatamente isso: o plano mora no grupo de referências, que é
     irmão da raiz e não descendente dela, e o enquadramento nunca o recebe. */
  it('mantém o plano de referência fora da raiz do modelo e fora do enquadramento', () => {
    const cena = new THREE.Scene();
    const raiz = new THREE.Group();
    raiz.name = 'modelo-procedural';
    const peca = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
    raiz.add(peca);
    cena.add(raiz);

    const gerenciador = criarGerenciadorReferencias3D({ cena });
    const textura = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
    textura.needsUpdate = true;
    gerenciador.definirImagemReferencia({
      id: 'bike', fonte: 'url', url: 'https://exemplo.test/bike.jpg', rotulo: 'lateral',
      alinhamento: { x: 40, y: 0, z: 0, largura: 90, altura: 50, escala: 1, opacidade: 1, lado: 'direita' },
    }, { textura });

    const descendentes = [];
    raiz.traverse((no) => descendentes.push(no));
    expect(descendentes).not.toContain(gerenciador.grupo);
    expect(descendentes.some((no) => no.name === '__imagem_referencia__')).toBe(false);

    /* O plano é largo e está longe: se entrasse na conta, a caixa da raiz
       saltaria de 1 para dezenas de unidades. */
    const caixa = new THREE.Box3().setFromObject(raiz);
    const tamanho = caixa.getSize(new THREE.Vector3());
    expect(tamanho.x).toBeCloseTo(1, 6);

    for (const alvo of ['montagem', 'selecao']) {
      for (const objeto of alvosDeEnquadramento({ raiz, selecionados: [peca], modo: 'contexto', alvo })) {
        const dentro = [];
        objeto.traverse((no) => dentro.push(no.name));
        expect(dentro).not.toContain('__imagem_referencia__');
      }
    }

    gerenciador.destruir();
  });
});
