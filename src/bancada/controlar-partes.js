/* controlar-partes.js — seleção múltipla, contexto fantasma, isolamento e explosão visual. */
import * as THREE from 'three';
import {
  alternarSelecao,
  calcularVetoresExplosao,
  estadoVisualDasPartes,
  normalizarSelecao,
} from './estado-bancada.js';

const VERDE_DESTAQUE = new THREE.Color('#35c98a');

function materiaisDoGrupo(grupo) {
  const materiais = [];
  grupo.traverse((objeto) => {
    if (!objeto.isMesh) return;
    for (const material of Array.isArray(objeto.material) ? objeto.material : [objeto.material]) {
      if (material && !materiais.includes(material)) materiais.push(material);
    }
  });
  return materiais;
}

function guardarMaterial(material) {
  if (material.userData.estadoBancada) return;
  material.userData.estadoBancada = {
    color: material.color?.clone(),
    emissive: material.emissive?.clone(),
    emissiveIntensity: material.emissiveIntensity,
    opacity: material.opacity,
    transparent: material.transparent,
    depthWrite: material.depthWrite,
  };
}

function restaurarMaterial(material) {
  const base = material.userData.estadoBancada;
  if (!base) return;
  if (base.color && material.color) material.color.copy(base.color);
  if (base.emissive && material.emissive) material.emissive.copy(base.emissive);
  material.emissiveIntensity = base.emissiveIntensity;
  material.opacity = base.opacity;
  material.transparent = base.transparent;
  material.depthWrite = base.depthWrite;
}

function aplicarEstadoMaterial(material, estado) {
  restaurarMaterial(material);
  if (estado === 'destaque') {
    material.emissive?.copy(VERDE_DESTAQUE);
    material.emissiveIntensity = 0.55;
    material.color?.lerp(VERDE_DESTAQUE, 0.46);
  } else if (estado === 'fantasma') {
    material.transparent = true;
    material.opacity = 0.105;
    material.depthWrite = false;
    material.color?.lerp(new THREE.Color('#b7c2bd'), 0.58);
    material.emissiveIntensity = 0;
  }
  material.needsUpdate = true;
}

export function criarControladorPartes({ raiz, partes, aoMudar }) {
  const nomes = [...partes.keys()].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const permitidos = new Set(nomes);
  const bases = new Map();
  let selecionadas = [];
  let modo = 'todas';
  let explosao = 0;
  let explosaoAlvo = 0;
  let animacaoExplosao = 0;

  raiz.updateWorldMatrix(true, true);
  const caixaRaiz = new THREE.Box3().setFromObject(raiz);
  const centroMundo = caixaRaiz.getCenter(new THREE.Vector3());
  const centroLocal = raiz.worldToLocal(centroMundo.clone());
  const escalaMundo = raiz.getWorldScale(new THREE.Vector3());
  const diagonalLocal = caixaRaiz.getSize(new THREE.Vector3()).length()
    / Math.max(escalaMundo.x, escalaMundo.y, escalaMundo.z, 0.001);

  const centros = [];
  for (const nome of nomes) {
    const grupo = partes.get(nome);
    bases.set(nome, grupo.position.clone());
    const centroParte = new THREE.Box3().setFromObject(grupo).getCenter(new THREE.Vector3());
    centros.push({ nome, centro: raiz.worldToLocal(centroParte).toArray() });
    for (const material of materiaisDoGrupo(grupo)) guardarMaterial(material);
  }
  const direcoes = calcularVetoresExplosao(centros, centroLocal.toArray());
  const distanciaExplosao = Math.max(0.6, diagonalLocal * 0.52);

  function estado() {
    return {
      selecionadas: selecionadas.slice(),
      modo,
      explosao: explosaoAlvo,
    };
  }

  function aplicarVisual() {
    const estados = estadoVisualDasPartes(nomes, selecionadas, modo);
    for (const nome of nomes) {
      const grupo = partes.get(nome);
      const visual = estados[nome];
      grupo.visible = visual !== 'oculto';
      for (const material of materiaisDoGrupo(grupo)) aplicarEstadoMaterial(material, visual);
    }
    aoMudar?.(estado());
  }

  function aplicarExplosao() {
    for (const nome of nomes) {
      const grupo = partes.get(nome);
      const base = bases.get(nome);
      const direcao = direcoes[nome];
      grupo.position.set(
        base.x + direcao[0] * distanciaExplosao * explosao,
        base.y + direcao[1] * distanciaExplosao * explosao,
        base.z + direcao[2] * distanciaExplosao * explosao,
      );
    }
    raiz.updateWorldMatrix(true, true);
  }

  function animarExplosao() {
    cancelAnimationFrame(animacaoExplosao);
    const reduzirMovimento = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduzirMovimento) {
      explosao = explosaoAlvo;
      aplicarExplosao();
      aoMudar?.(estado());
      return;
    }
    const quadro = () => {
      explosao += (explosaoAlvo - explosao) * 0.16;
      if (Math.abs(explosaoAlvo - explosao) < 0.001) explosao = explosaoAlvo;
      aplicarExplosao();
      aoMudar?.(estado());
      if (explosao !== explosaoAlvo) animacaoExplosao = requestAnimationFrame(quadro);
    };
    animacaoExplosao = requestAnimationFrame(quadro);
  }

  function definirSelecao(nova) {
    selecionadas = normalizarSelecao(nova, permitidos);
    aplicarVisual();
  }

  aplicarVisual();

  return {
    nomes,
    get selecionadas() { return selecionadas.slice(); },
    get modo() { return modo; },
    get explosao() { return explosaoAlvo; },
    nomeDoObjeto(objeto) {
      let cursor = objeto;
      while (cursor && cursor !== raiz.parent) {
        if (permitidos.has(cursor.userData?.identidadeParte)) return cursor.userData.identidadeParte;
        cursor = cursor.parent;
      }
      return null;
    },
    selecionar(nome, { aditiva = false } = {}) {
      if (!permitidos.has(nome)) {
        definirSelecao([]);
        return;
      }
      definirSelecao(alternarSelecao(selecionadas, nome, aditiva));
    },
    selecionarMuitas: definirSelecao,
    limpar() { definirSelecao([]); },
    definirModo(novoModo) {
      modo = ['todas', 'contexto', 'isolar'].includes(novoModo) ? novoModo : 'todas';
      aplicarVisual();
    },
    definirExplosao(valor) {
      explosaoAlvo = Math.min(1, Math.max(0, Number(valor) || 0));
      animarExplosao();
    },
    gruposSelecionados() {
      return selecionadas.map((nome) => partes.get(nome)).filter(Boolean);
    },
    estado,
    destruir() {
      cancelAnimationFrame(animacaoExplosao);
      for (const nome of nomes) {
        const grupo = partes.get(nome);
        grupo.visible = true;
        grupo.position.copy(bases.get(nome));
        for (const material of materiaisDoGrupo(grupo)) restaurarMaterial(material);
      }
    },
  };
}
