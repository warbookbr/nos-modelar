/* caixa-do-visivel.test.js — o enquadramento mede só o que aparece. */
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { caixaDoVisivel } from './caixa-do-visivel.js';

describe('caixa do visível', () => {
  it('ignora filho visível dentro de grupo escondido, como as setas do gizmo', () => {
    const peca = new THREE.Group();
    peca.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1)));
    const gizmo = new THREE.Group();
    gizmo.visible = false;
    const seta = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 10));
    seta.position.set(20, 20, 0);
    gizmo.add(seta);
    peca.add(gizmo);
    const caixa = caixaDoVisivel([peca]);
    expect(caixa.min.toArray()).toEqual([-0.5, -0.5, -0.5]);
    expect(caixa.max.toArray()).toEqual([0.5, 0.5, 0.5]);
    /* A régua antiga incluía a seta; é essa a diferença que o teste guarda. */
    expect(new THREE.Box3().setFromObject(peca).max.x).toBeGreaterThan(20);
  });
});
