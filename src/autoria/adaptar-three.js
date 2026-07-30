/* adaptar-three.js — adaptador neutro do núcleo da Oficina para Three.js; não altera o formato persistido. */
import * as THREE from 'three';

const COR_PADRAO = '#77817d';

function materialDaFace(face, materiais) {
  const definicao = face.material ? materiais[face.material] ?? {} : {};
  const cor = definicao.cor ?? face.cor ?? COR_PADRAO;
  const transparente = definicao.mistura === 'transparente';
  return {
    chave: JSON.stringify([
      cor,
      definicao.aspereza ?? 0.68,
      definicao.metalicidade ?? 0.12,
      definicao.emissivo ?? 0,
      transparente,
      definicao.opacidade ?? (transparente ? 0.58 : 1),
    ]),
    cor,
    aspereza: definicao.aspereza ?? 0.68,
    metalicidade: definicao.metalicidade ?? 0.12,
    emissivo: definicao.emissivo ?? 0,
    transparente,
    opacidade: definicao.opacidade ?? (transparente ? 0.58 : 1),
  };
}

function criarMaterial(info) {
  const emissivo = new THREE.Color(info.cor).multiplyScalar(Math.max(0, info.emissivo));
  return new THREE.MeshStandardMaterial({
    color: info.cor,
    roughness: info.aspereza,
    metalness: info.metalicidade,
    emissive: emissivo,
    emissiveIntensity: info.emissivo > 0 ? 1 : 0,
    transparent: info.transparente,
    opacity: info.opacidade,
    side: THREE.DoubleSide,
  });
}

function triangularFace(face, vertices, destino) {
  if (!Array.isArray(face.vs) || face.vs.length < 3) {
    throw new Error(`adaptarThree: face ${face.id} precisa de pelo menos 3 vértices`);
  }
  const pontos = face.vs.map((id) => {
    const ponto = vertices.get(id);
    if (!ponto) throw new Error(`adaptarThree: face ${face.id} referencia vértice ausente ${id}`);
    return ponto;
  });
  for (let i = 1; i < pontos.length - 1; i++) {
    destino.push(...pontos[0], ...pontos[i], ...pontos[i + 1]);
  }
}

/**
 * Converte o estado neutro produzido por `nucleo()` em um grafo Three.js.
 * A identidade persistente vem de `face.parte`; UUIDs do Three.js nunca saem daqui.
 */
export function adaptarThree(neutro, { materiais = {}, nome = 'peca-procedural' } = {}) {
  if (!neutro?.V || !neutro?.F) throw new Error('adaptarThree: estado neutro inválido');
  if (neutro.orfaos?.length) {
    const resumo = neutro.orfaos.slice(0, 3).map((o) => `${o.op}: ${o.motivo}`).join('; ');
    throw new Error(`adaptarThree: peça contém ${neutro.orfaos.length} referência(s) inválida(s): ${resumo}`);
  }

  const raiz = new THREE.Group();
  raiz.name = nome;
  raiz.userData = { tipo: 'peca-procedural', nome };

  const grupos = new Map();
  for (const face of [...neutro.F.values()].sort((a, b) => a.id - b.id)) {
    const parte = face.parte || 'estrutura-sem-nome';
    const material = materialDaFace(face, materiais);
    const chave = `${parte}\u0000${material.chave}`;
    let lote = grupos.get(chave);
    if (!lote) {
      lote = { parte, material, posicoes: [], faces: [] };
      grupos.set(chave, lote);
    }
    triangularFace(face, neutro.V, lote.posicoes);
    lote.faces.push(face.id);
  }

  const partes = new Map();
  for (const lote of grupos.values()) {
    let grupoParte = partes.get(lote.parte);
    if (!grupoParte) {
      grupoParte = new THREE.Group();
      grupoParte.name = lote.parte;
      grupoParte.userData = {
        tipo: 'parte-semantica',
        identidadeParte: lote.parte,
        faces: [],
      };
      partes.set(lote.parte, grupoParte);
      raiz.add(grupoParte);
    }

    const geometria = new THREE.BufferGeometry();
    geometria.setAttribute('position', new THREE.Float32BufferAttribute(lote.posicoes, 3));
    geometria.computeVertexNormals();
    geometria.computeBoundingBox();
    geometria.computeBoundingSphere();

    const malha = new THREE.Mesh(geometria, criarMaterial(lote.material));
    malha.name = `${lote.parte}:${grupoParte.children.length}`;
    malha.castShadow = true;
    malha.receiveShadow = true;
    malha.userData = {
      tipo: 'superficie',
      identidadeParte: lote.parte,
      faces: lote.faces.slice(),
    };
    grupoParte.userData.faces.push(...lote.faces);
    grupoParte.add(malha);
  }

  raiz.userData.partes = [...partes.keys()].sort();
  return {
    raiz,
    partes,
    estatisticas: {
      verticesNeutros: neutro.V.size,
      facesNeutras: neutro.F.size,
      triangulos: [...grupos.values()].reduce((total, lote) => total + lote.posicoes.length / 9, 0),
      partes: partes.size,
    },
  };
}
