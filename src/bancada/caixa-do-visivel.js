/* caixa-do-visivel.js — a caixa do que a câmera de fato mostra. */
import * as THREE from 'three';

/* SÓ O QUE ESTÁ À VISTA ENTRA NA CAIXA. `Box3.expandByObject` percorre todos
   os filhos, escondidos ou não. O gizmo de setas mora dentro da peça, começa
   escondido pelo grupo dele, e as setas lá dentro continuam `visible`: na
   base do braço ele era cinco vezes maior que a peça, e a câmera mirava nele.
   A peça saía pequena num canto em toda imagem desde que o gizmo entrou, e a
   conferência de enquadramento aprovava, porque media a mesma caixa errada. */
export function caixaDoVisivel(objetos) {
  const caixa = new THREE.Box3();
  for (const objeto of objetos.filter(Boolean)) {
    objeto.updateWorldMatrix(true, true);
    objeto.traverseVisible((filho) => {
      if (!filho.geometry) return;
      if (!filho.geometry.boundingBox) filho.geometry.computeBoundingBox();
      const propria = filho.geometry.boundingBox;
      if (!propria || propria.isEmpty()) return;
      caixa.union(propria.clone().applyMatrix4(filho.matrixWorld));
    });
  }
  return caixa;
}
