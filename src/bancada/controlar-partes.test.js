/* controlar-partes.test.js — apresentação temporária apenas da seleção. */
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { criarControladorPartes, geometriaDasArestas } from './controlar-partes.js';

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

  it('em auditoria a parte selecionada não é tingida de verde', () => {
    const raiz = new THREE.Group();
    const grupo = new THREE.Group();
    grupo.userData.identidadeParte = 'anel';
    const malha = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial({ color: '#4a4d52' }));
    grupo.add(malha);
    raiz.add(grupo);
    const controlador = criarControladorPartes({ raiz, partes: new Map([['anel', grupo]]) });
    controlador.selecionar('anel');
    expect(malha.material.emissive.getHex()).not.toBe(0);
    controlador.definirAuditoria(true);
    expect(malha.material.emissive.getHex()).toBe(0);
    expect(`#${malha.material.color.getHexString()}`).toBe('#4a4d52');
  });
});

describe('arame opaco', () => {
  it('liga linhas por cima do sólido, sem deixar o material transparente, e desliga limpo', () => {
    const raiz = new THREE.Group();
    const grupo = new THREE.Group();
    grupo.userData.identidadeParte = 'a';
    const malha = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial());
    grupo.add(malha);
    raiz.add(grupo);
    const controlador = criarControladorPartes({ raiz, partes: new Map([['a', grupo]]) });
    controlador.definirArame(true);
    expect(malha.material.wireframe).toBe(false);
    expect(malha.material.polygonOffset).toBe(true);
    expect(malha.children.filter((f) => f.isLineSegments)).toHaveLength(1);
    controlador.definirArame(false);
    expect(malha.children).toHaveLength(0);
    expect(malha.material.polygonOffset).toBe(false);
  });

  it('as arestas são as mesmas da WireframeGeometry, na mesma ordem, e seguem a malha quando o vértice anda', () => {
    for (const geometria of [new THREE.BoxGeometry(1, 2, 3, 2, 1, 1), new THREE.BoxGeometry(1, 1, 1).toNonIndexed()]) {
      const arestas = geometriaDasArestas(geometria);
      const referencia = new THREE.WireframeGeometry(geometria).getAttribute('position');
      const posicao = arestas.getAttribute('position');
      expect(posicao).toBe(geometria.getAttribute('position'));
      expect(arestas.index.count).toBe(referencia.count);
      for (let i = 0; i < referencia.count; i++) {
        const v = arestas.index.getX(i);
        expect([posicao.getX(v), posicao.getY(v), posicao.getZ(v)])
          .toEqual([referencia.getX(i), referencia.getY(i), referencia.getZ(i)]);
      }
      /* A edição de malha escreve na posição da malha sem refazer o modelo. */
      const primeiro = arestas.index.getX(0);
      geometria.getAttribute('position').setX(primeiro, 9);
      expect(arestas.getAttribute('position').getX(primeiro)).toBe(9);
    }
  });

  it('o Wireframe da seleção é o raio X só da parte selecionada, por cima da visão da peça', () => {
    const raiz = new THREE.Group();
    const criarParte = (nome) => {
      const grupo = new THREE.Group();
      grupo.userData.identidadeParte = nome;
      const malha = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial());
      grupo.add(malha);
      raiz.add(grupo);
      return { grupo, malha };
    };
    const a = criarParte('a');
    const b = criarParte('b');
    const controlador = criarControladorPartes({ raiz, partes: new Map([['a', a.grupo], ['b', b.grupo]]) });
    controlador.definirArame(true);
    controlador.selecionar('a');
    controlador.definirWireframeSelecao(true);
    /* A selecionada mostra também as arestas de trás, sem a camada do arame opaco somada por cima. */
    expect(a.malha.material.wireframe).toBe(true);
    expect(a.malha.children).toHaveLength(0);
    /* A outra continua no arame da peça. */
    expect(b.malha.material.wireframe).toBe(false);
    expect(b.malha.children.filter((f) => f.isLineSegments)).toHaveLength(1);
    controlador.limpar();
    expect(a.malha.material.wireframe).toBe(false);
    expect(a.malha.children.filter((f) => f.isLineSegments)).toHaveLength(1);
  });

  it('desligar o arame tira as linhas sem descartar a posição que a malha usa', () => {
    const raiz = new THREE.Group();
    const grupo = new THREE.Group();
    grupo.userData.identidadeParte = 'a';
    const malha = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial());
    grupo.add(malha);
    raiz.add(grupo);
    const controlador = criarControladorPartes({ raiz, partes: new Map([['a', grupo]]) });
    controlador.definirArame(true);
    const linhas = malha.children[0];
    const descartados = [];
    linhas.geometry.addEventListener('dispose', ({ target }) => descartados.push(Object.keys(target.attributes)));
    controlador.definirArame(false);
    expect(descartados).toEqual([[]]);
    expect(malha.geometry.getAttribute('position')).toBeTruthy();
  });

  it('no modo raio X o arame fica transparente, sem camada de linhas', () => {
    const raiz = new THREE.Group();
    const grupo = new THREE.Group();
    grupo.userData.identidadeParte = 'a';
    const malha = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial());
    grupo.add(malha);
    raiz.add(grupo);
    const controlador = criarControladorPartes({ raiz, partes: new Map([['a', grupo]]) });
    controlador.definirArame('raio-x');
    expect(malha.material.wireframe).toBe(true);
    expect(malha.children).toHaveLength(0);
  });
});
