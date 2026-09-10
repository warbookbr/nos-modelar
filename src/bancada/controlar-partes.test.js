/* controlar-partes.test.js — apresentação temporária apenas da seleção. */
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { criarControladorPartes } from './controlar-partes.js';

describe('controlador de partes', () => {
  it('aplica wireframe e opacidade apenas à seleção e restaura ao limpar', () => {
    const raiz = new THREE.Group();
    const criarParte = (nome) => {
      const grupo = new THREE.Group();
      grupo.userData.identidadeParte = nome;
      const malha = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial({ opacity: 1 }));
      grupo.add(malha);
      raiz.add(grupo);
      return { grupo, material: malha.material };
    };
    const a = criarParte('a');
    const b = criarParte('b');
    const controlador = criarControladorPartes({ raiz, partes: new Map([['a', a.grupo], ['b', b.grupo]]) });

    controlador.selecionar('a');
    controlador.definirWireframeSelecao(true);
    controlador.definirOpacidadeSelecao(0.35);

    expect(a.material).toMatchObject({ wireframe: true, transparent: true, opacity: 0.35 });
    expect(b.material).toMatchObject({ wireframe: false, transparent: false, opacity: 1 });

    controlador.limpar();
    expect(a.material).toMatchObject({ wireframe: false, transparent: false, opacity: 1 });
    expect(b.material).toMatchObject({ wireframe: false, transparent: false, opacity: 1 });
  });
});
