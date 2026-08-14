/* adaptar-montagem-three.js — projeta uma montagem resolvida em cena Three.js. */

import * as THREE from 'three';
import { adaptarThree } from './adaptar-three.js';

function aplicarPoseMundo(objeto, pose) {
  const [x, y, z] = pose.deslocamento;
  const r = pose.rotacao;
  objeto.matrixAutoUpdate = false;
  objeto.matrix.set(
    r[0][0], r[0][1], r[0][2], x,
    r[1][0], r[1][1], r[1][2], y,
    r[2][0], r[2][1], r[2][2], z,
    0, 0, 0, 1,
  );
  objeto.matrixWorldNeedsUpdate = true;
}

/**
 * Cria uma cena visual derivada exclusivamente da árvore já resolvida.
 * Caminhos persistidos ficam em userData; UUIDs do Three.js não saem daqui.
 */
export function adaptarMontagemThree(montagemResolvida) {
  if (!montagemResolvida?.id || !Array.isArray(montagemResolvida.instancias)) {
    throw new TypeError('adaptarMontagemThree: informe uma montagem resolvida.');
  }
  const raiz = new THREE.Group();
  raiz.name = montagemResolvida.id;
  raiz.userData = { tipo: 'montagem-resolvida', id: montagemResolvida.id };
  const instancias = new Map();

  function percorrer(montagem) {
    for (const instancia of montagem.instancias) {
      if (instancia.alvo.tipo === 'montagem') {
        percorrer(instancia.montagem);
        continue;
      }
      const visual = adaptarThree(instancia.definicao.neutro, {
        materiais: instancia.definicao.neutro.materiais ?? {},
        nome: instancia.caminho.join('/'),
      });
      aplicarPoseMundo(visual.raiz, instancia.poseMundo);
      visual.raiz.userData = {
        ...visual.raiz.userData,
        caminho: instancia.caminho.slice(),
        alvo: { ...instancia.alvo },
      };
      raiz.add(visual.raiz);
      instancias.set(JSON.stringify(instancia.caminho), {
        caminho: instancia.caminho.slice(),
        visual,
      });
    }
  }

  percorrer(montagemResolvida);
  raiz.updateWorldMatrix(true, true);
  return { raiz, instancias };
}
