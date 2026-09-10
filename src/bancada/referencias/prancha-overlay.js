/* prancha-overlay.js — projeta pranchas técnicas 2D, contornos e blueprints como planos no espaço 3D. */
import * as THREE from 'three';

export function criarGerenciadorReferencias3D({ cena }) {
  const grupoReferencias = new THREE.Group();
  grupoReferencias.name = '__grupo_referencias_3d__';
  cena.add(grupoReferencias);

  const camadas = new Map();
  let imagemReferencia = null;

  function descartarImagemReferencia() {
    if (!imagemReferencia) return;
    const { malha, possuiTextura } = imagemReferencia;
    malha.removeFromParent();
    malha.geometry.dispose();
    if (possuiTextura) malha.material.map?.dispose();
    malha.material.dispose();
    imagemReferencia = null;
  }

  function aplicarAlinhamentoImagem(alinhamento) {
    if (!imagemReferencia) return null;
    const segura = { ...imagemReferencia.descritor.alinhamento, ...alinhamento };
    imagemReferencia.descritor.alinhamento = segura;
    const { malha } = imagemReferencia;
    malha.position.set(segura.x, segura.y, segura.z);
    malha.scale.setScalar(segura.escala);
    malha.material.opacity = segura.opacidade;
    malha.material.needsUpdate = true;
    return imagemReferencia.descritor;
  }

  function definirImagemReferencia(descritor, { textura, possuiTextura = false } = {}) {
    if (!textura) throw new TypeError('imagem de referência: textura obrigatória.');
    descartarImagemReferencia();
    const alinhamento = descritor?.alinhamento;
    if (!alinhamento) throw new TypeError('imagem de referência: alinhamento obrigatório.');
    const geometria = new THREE.PlaneGeometry(alinhamento.largura, alinhamento.altura);
    geometria.rotateY(Math.PI / 2);
    const material = new THREE.MeshBasicMaterial({
      map: textura,
      transparent: true,
      opacity: alinhamento.opacidade,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const malha = new THREE.Mesh(geometria, material);
    malha.name = '__imagem_referencia__';
    malha.renderOrder = -1;
    grupoReferencias.add(malha);
    imagemReferencia = {
      descritor: { ...descritor, alinhamento: { ...alinhamento } },
      malha,
      possuiTextura,
    };
    aplicarAlinhamentoImagem(alinhamento);
    return malha;
  }

  function limpar() {
    for (const [, objeto] of camadas.entries()) {
      objeto.removeFromParent();
      objeto.traverse((no) => {
        if (no.geometry) no.geometry.dispose();
        if (no.material) {
          if (Array.isArray(no.material)) no.material.forEach((m) => m.dispose());
          else no.material.dispose();
        }
      });
    }
    camadas.clear();
  }

  /**
   * Adiciona um plano de referência 2D (prancha ou contorno) no espaço 3D.
   * @param {Object} prancha - { id, rotulo, plano: 'XY'|'XZ'|'YZ', offset: number, pontos: Array<[number, number]>, cor: string, opacidade: number }
   */
  function adicionarPlanoPrancha(prancha) {
    const id = prancha.id || `prancha-${camadas.size + 1}`;
    if (camadas.has(id)) {
      camadas.get(id).removeFromParent();
    }

    const grupoPlano = new THREE.Group();
    grupoPlano.name = `__ref_${id}__`;

    const plano = prancha.plano || 'XY';
    const offset = prancha.offset || 0;
    const cor = prancha.cor || '#39c6ff';
    const opacidade = prancha.opacidade ?? 0.85;

    if (Array.isArray(prancha.pontos) && prancha.pontos.length >= 2) {
      const vertices3d = [];
      for (const [u, v] of prancha.pontos) {
        if (plano === 'XY') vertices3d.push(new THREE.Vector3(u, v, offset));
        else if (plano === 'XZ') vertices3d.push(new THREE.Vector3(u, offset, v));
        else if (plano === 'YZ') vertices3d.push(new THREE.Vector3(offset, v, u));
      }

      const geometriaLinha = new THREE.BufferGeometry().setFromPoints(vertices3d);
      const materialLinha = new THREE.LineBasicMaterial({
        color: cor,
        transparent: true,
        opacity: opacidade,
        linewidth: 2,
        depthTest: false,
      });

      const linha = new THREE.LineLoop(geometriaLinha, materialLinha);
      linha.renderOrder = 4;
      grupoPlano.add(linha);
    }

    // Adiciona grade sutil de alinhamento do plano de referência se solicitado
    if (prancha.grade) {
      const tamanho = prancha.tamanhoGrade || 4;
      const divisoes = prancha.divisoesGrade || 20;
      const grade = new THREE.GridHelper(tamanho, divisoes, cor, '#2a3b42');
      grade.material.transparent = true;
      grade.material.opacity = 0.25;
      grade.renderOrder = 1;

      if (plano === 'XY') {
        grade.rotation.x = Math.PI / 2;
        grade.position.z = offset;
      } else if (plano === 'YZ') {
        grade.rotation.z = Math.PI / 2;
        grade.position.x = offset;
      } else {
        grade.position.y = offset;
      }
      grupoPlano.add(grade);
    }

    grupoReferencias.add(grupoPlano);
    camadas.set(id, { grupo: grupoPlano, visivel: true, dados: prancha });
    return grupoPlano;
  }

  function alternarVisibilidade(id, visivel) {
    const camada = camadas.get(id);
    if (camada) {
      camada.visivel = visivel ?? !camada.visivel;
      camada.grupo.visible = camada.visivel;
    }
  }

  function sincronizarComSessao(referenciasSessao) {
    limpar();
    if (!referenciasSessao || !Array.isArray(referenciasSessao.pranchas)) return;

    for (const prancha of referenciasSessao.pranchas) {
      adicionarPlanoPrancha(prancha);
    }
  }

  return {
    grupo: grupoReferencias,
    adicionarPlanoPrancha,
    alternarVisibilidade,
    sincronizarComSessao,
    definirImagemReferencia,
    atualizarImagemReferencia: aplicarAlinhamentoImagem,
    removerImagemReferencia: descartarImagemReferencia,
    obterImagemReferencia: () => (imagemReferencia ? imagemReferencia.descritor : null),
    limpar,
    obterCamadas: () => Array.from(camadas.entries()).map(([id, item]) => ({ id, ...item })),
    destruir: () => {
      limpar();
      descartarImagemReferencia();
      grupoReferencias.removeFromParent();
    },
  };
}
