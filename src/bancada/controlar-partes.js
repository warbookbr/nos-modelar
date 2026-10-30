/* controlar-partes.js — seleção múltipla, contexto fantasma, isolamento e explosão visual. */
import * as THREE from 'three';
import { caixaDoVisivel } from './caixa-do-visivel.js';
import {
  alternarSelecao,
  calcularVetoresExplosao,
  estadoVisualDasPartes,
  normalizarSelecao,
} from './estado-bancada.js';
import { nomesDaSubarvore } from '../autoria/hierarquia-partes.js';
import { hslDeAuditoria } from '../autoria/cor-de-auditoria.js';

const VERDE_DESTAQUE = new THREE.Color('#35c98a');

/* Cores de AUDITORIA: uma por parte, para quem olha a imagem saber onde uma
   peça termina e a outra começa. A bancada normal mostra o material do autor, e
   material do autor é justamente o que confunde numa auditoria de forma — três
   partes de aço são um borrão cinza só, e a junção some.

   O tom vem do índice da parte na lista ORDENADA por nome, não da ordem de
   criação: assim a mesma parte recebe a mesma cor entre execuções, e duas
   imagens da mesma peça são comparáveis. Saturação e luminosidade fixas mantêm
   todas as partes igualmente legíveis; só a matiz distingue. */
/* A paleta e a conferencia dela moram em `cor-de-auditoria.js`, sem Three, para
   a CLI poder auditar a mesma legenda que a bancada pinta. Ver o cabecalho de
   la: saturacao e luminosidade fixas confundiam partes vizinhas em 24 nomes, e
   isso fez o critico visual cego reportar achado falso. */
export function corDeAuditoria(indice) {
  const { h, s, l } = hslDeAuditoria(indice);
  return new THREE.Color().setHSL(h, s, l);
}

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
    wireframe: Boolean(material.wireframe),
  };
}

/* O MATERIAL DE UMA VISÃO DE CONFERÊNCIA (curvatura, zebra, luz rasante) entra
   no lugar do material do autor enquanto a visão dura, e o controlador continua
   aplicando nele a seleção, o fantasma e o isolamento. Preparado aqui, ele
   guarda o estado de partida como os do autor, para cada aplicação partir dele
   em vez de acumular a anterior, e fica fora da cor de auditoria e da tinta
   verde do destaque: as duas pintariam por cima da cor que a visão mede, e a
   seleção continua legível pelo fantasma das outras partes. */
export function prepararMaterialDeVisao(material) {
  material.userData.visaoDeConferencia = true;
  guardarMaterial(material);
  return material;
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
  material.wireframe = base.wireframe ?? false;
  material.polygonOffset = false;
  material.polygonOffsetFactor = 0;
  material.polygonOffsetUnits = 0;
}

const NOME_DA_CAMADA_DE_ARAME = '__arame_opaco__';

/* AS ARESTAS LEEM AS POSIÇÕES DA PRÓPRIA MALHA. A camada de linhas era uma
   `WireframeGeometry`, que copia as posições no instante em que nasce; mover
   vértices na edição de malha escreve na posição da malha sem refazer o modelo,
   e o arame ficava parado onde a malha estava antes do gesto. Aqui a geometria
   das linhas usa o MESMO atributo de posição da malha, e só o índice das arestas
   é dela, então o arame acompanha cada quadro do movimento.
   As arestas são as mesmas da `WireframeGeometry`, na mesma ordem e com a mesma
   regra de repetição (a aresta de mesmas pontas, nos dois sentidos, entra uma
   vez), para a imagem do arame sair igual à de antes. */
export function geometriaDasArestas(geometria) {
  const posicao = geometria.getAttribute('position');
  const indices = geometria.index;
  const vistas = new Set();
  const arestas = [];
  const ponto = (i) => `${posicao.getX(i)},${posicao.getY(i)},${posicao.getZ(i)}`;
  const acrescentar = (a, b) => {
    const ida = `${ponto(a)}-${ponto(b)}`;
    const volta = `${ponto(b)}-${ponto(a)}`;
    if (vistas.has(ida) || vistas.has(volta)) return;
    vistas.add(ida);
    vistas.add(volta);
    arestas.push(a, b);
  };
  if (indices) {
    const grupos = geometria.groups.length ? geometria.groups : [{ start: 0, count: indices.count }];
    for (const { start, count } of grupos) {
      for (let i = start; i < start + count; i += 3) {
        for (let j = 0; j < 3; j++) acrescentar(indices.getX(i + j), indices.getX(i + ((j + 1) % 3)));
      }
    }
  } else {
    for (let i = 0; i < posicao.count / 3; i++) {
      for (let j = 0; j < 3; j++) acrescentar(3 * i + j, 3 * i + ((j + 1) % 3));
    }
  }
  const linhas = new THREE.BufferGeometry();
  linhas.setAttribute('position', posicao);
  linhas.setIndex(arestas);
  return linhas;
}

/* Liga ou desliga, em cada malha do grupo, a camada de linhas do arame. As
   linhas são as arestas dos triângulos, desenhadas por cima do sólido; o teste
   de profundidade contra o sólido esconde as que ficam atrás. */
export function sincronizarArame(grupo, ligado) {
  grupo.traverse((objeto) => {
    if (!objeto.isMesh || objeto.name === NOME_DA_CAMADA_DE_ARAME) return;
    const existente = objeto.children.find((filho) => filho.name === NOME_DA_CAMADA_DE_ARAME);
    if (!ligado) {
      if (existente) {
        objeto.remove(existente);
        /* A posição é da malha: descartá-la junto com as linhas apagaria do
           desenho o buffer que a malha continua usando. Sai só o índice. */
        existente.geometry.deleteAttribute('position');
        existente.geometry.dispose();
        existente.material.dispose();
      }
      return;
    }
    if (existente) return;
    const linhas = new THREE.LineSegments(
      geometriaDasArestas(objeto.geometry),
      new THREE.LineBasicMaterial({ color: '#2f3b36' }),
    );
    linhas.name = NOME_DA_CAMADA_DE_ARAME;
    linhas.raycast = () => {};
    /* A esfera de corte das linhas seria calculada uma vez e não acompanharia o
       movimento dos vértices; a malha-mãe já decide se a peça está na tela. */
    linhas.frustumCulled = false;
    objeto.add(linhas);
  });
}

function aplicarEstadoMaterial(material, estado, corDaParte = null, arame = false, apresentacaoSelecao = null, semTinta = false) {
  restaurarMaterial(material);
  if (arame === 'raio-x') {
    material.wireframe = true;
  } else if (arame) {
    /* ARAME QUE ESCONDE O QUE FICA ATRÁS. O material continua sólido, empurrado
       um pouco para trás na profundidade, e as arestas vêm de uma camada de
       linhas por cima (`sincronizarArame`). Com `wireframe` no próprio material
       a malha ficava transparente: na vista de trás do ombro, as tampas da
       frente e o tambor se sobrepunham às costas, e o crítico apontou um leque
       que parecia muito maior do que era. */
    material.polygonOffset = true;
    material.polygonOffsetFactor = 1;
    material.polygonOffsetUnits = 1;
  }
  /* A cor de auditoria entra ANTES dos estados de seleção, para que destaque e
     fantasma continuem funcionando por cima dela. Se entrasse depois, isolar uma
     peça deixaria de marcá-la e o modo viraria duas coisas que brigam. */
  const daVisao = Boolean(material.userData.visaoDeConferencia);
  if (corDaParte && material.color && !daVisao) {
    material.color.copy(corDaParte);
    material.emissive?.setRGB(0, 0, 0);
    material.emissiveIntensity = 0;
    if (material.metalness !== undefined) material.metalness = 0.05;
    if (material.roughness !== undefined) material.roughness = 0.62;
  }
  if (estado === 'destaque') {
    /* Com cor de auditoria ligada o destaque NÃO tinge. O verde existe para o
       olho humano achar a seleção num modelo cinza; sobre cores de auditoria ele
       apaga justamente a informação que a imagem foi feita para carregar — três
       partes selecionadas viravam três verdes iguais. Aqui a seleção já se lê
       pelo fantasma das outras. */
    /* Em auditoria a peça também não tinge: a imagem vai para o crítico julgar
       cor e forma, e o verde clareava o topo do anel escuro. */
    if (!corDaParte && !semTinta && !daVisao) {
      material.emissive?.copy(VERDE_DESTAQUE);
      material.emissiveIntensity = 0.55;
      material.color?.lerp(VERDE_DESTAQUE, 0.46);
    }
  } else if (estado === 'fantasma') {
    material.transparent = true;
    material.opacity = 0.105;
    material.depthWrite = false;
    material.color?.lerp(new THREE.Color('#b7c2bd'), 0.58);
    material.emissiveIntensity = 0;
  }
  if (apresentacaoSelecao) {
    if (apresentacaoSelecao.opacidade < 1) {
      material.transparent = true;
      material.opacity = apresentacaoSelecao.opacidade;
      material.depthWrite = false;
    }
  }
  material.needsUpdate = true;
}

export function criarControladorPartes({ raiz, partes, hierarquia = [], aoMudar, aoEstabilizarExplosao }) {
  const nomes = [...partes.keys()].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  let coresPorParte = false;
  let arame = false;
  let auditoria = false;
  let wireframeSelecao = false;
  let opacidadeSelecao = 1;
  const permitidos = new Set(nomes);
  /* A seleção entende a árvore declarada, mas os grupos Three continuam irmãos.
     Isso impede que escolher uma subárvore mude transformações, explosão ou a
     fonte semântica da receita. */
  const subarvore = (nome) => nomesDaSubarvore(hierarquia, nome)
    .filter((item) => permitidos.has(item));
  const bases = new Map();
  let selecionadas = [];
  let modo = 'todas';
  let explosao = 0;
  let explosaoAlvo = 0;
  let animacaoExplosao = 0;

  raiz.updateWorldMatrix(true, true);
  const caixaRaiz = caixaDoVisivel([raiz]);
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
      wireframeSelecao,
      opacidadeSelecao,
    };
  }

  /* O ARAME DE CADA PARTE sai de um lugar só. O arame da peça inteira é o que
     a visão escolhida pede (`definirArame`), e o "Wireframe" da Inspeção é o
     raio X restrito à seleção: a parte selecionada passa a mostrar as arestas
     de trás também, e as outras continuam na visão da peça. Antes os dois eram
     caminhos separados, e com o arame da peça ligado a seleção recebia o
     `wireframe` do material por cima da camada de linhas, dois desenhos de
     aresta somados. */
  function arameDe(selecionada) {
    return selecionada && wireframeSelecao ? 'raio-x' : arame;
  }

  function aplicarVisual() {
    const estados = estadoVisualDasPartes(nomes, selecionadas, modo);
    for (const nome of nomes) {
      const grupo = partes.get(nome);
      const visual = estados[nome];
      grupo.visible = visual !== 'oculto';
      const selecionada = selecionadas.includes(nome);
      const arameDaParte = arameDe(selecionada);
      sincronizarArame(grupo, arameDaParte && arameDaParte !== 'raio-x');
      const cor = coresPorParte ? corDeAuditoria(nomes.indexOf(nome)) : null;
      const apresentacaoSelecao = selecionada ? { opacidade: opacidadeSelecao } : null;
      for (const material of materiaisDoGrupo(grupo)) {
        aplicarEstadoMaterial(material, visual, cor, arameDaParte, apresentacaoSelecao, auditoria);
      }
    }
    aoMudar?.(estado());
  }

  function aplicarExplosao() {
    for (const nome of nomes) {
      const grupo = partes.get(nome);
      const base = bases.get(nome);
      const direcao = direcoes[nome];
      // Em montagens mecânicas assentes na bancada, a explosão expande radialmente
      // no plano horizontal e eleva componentes superiores, impedindo que a base
      // ou componentes inferiores atravessem a cota do piso.
      const dy = Math.max(0, direcao[1]);
      grupo.position.set(
        base.x + direcao[0] * distanciaExplosao * explosao,
        base.y + dy * distanciaExplosao * explosao,
        base.z + direcao[2] * distanciaExplosao * explosao,
      );
    }
    raiz.updateWorldMatrix(true, true);
  }

  function animarExplosao(enquadrarAoEstabilizar = true) {
    cancelAnimationFrame(animacaoExplosao);
    const reduzirMovimento = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduzirMovimento) {
      explosao = explosaoAlvo;
      aplicarExplosao();
      aoMudar?.(estado());
      aoEstabilizarExplosao?.(estado(), { enquadrar: enquadrarAoEstabilizar });
      return;
    }
    const quadro = () => {
      explosao += (explosaoAlvo - explosao) * 0.16;
      if (Math.abs(explosaoAlvo - explosao) < 0.001) explosao = explosaoAlvo;
      aplicarExplosao();
      aoMudar?.(estado());
      if (explosao !== explosaoAlvo) animacaoExplosao = requestAnimationFrame(quadro);
      else aoEstabilizarExplosao?.(estado(), { enquadrar: enquadrarAoEstabilizar });
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
    selecionarSubarvores(raizes = selecionadas) {
      const nomesDaSelecao = new Set();
      for (const raizDaSelecao of raizes) {
        for (const nome of subarvore(raizDaSelecao)) nomesDaSelecao.add(nome);
      }
      definirSelecao([...nomesDaSelecao]);
    },
    temDescendentesNaSelecao() {
      return selecionadas.some((nome) => subarvore(nome).length > 1);
    },
    temHierarquia() {
      return hierarquia.some((item) => item?.pai !== null && item?.pai !== undefined);
    },
    limpar() { definirSelecao([]); },
    /* Liga/desliga a cor por parte. Devolve a LEGENDA — nome e cor em hex — sem
       a qual a imagem colorida é bonita e inútil: quem audita precisa saber que
       o roxo é o colar, e não adivinhar pela posição. */
    definirCoresPorParte(ligado) {
      coresPorParte = Boolean(ligado);
      aplicarVisual();
      return nomes.map((nome, i) => ({
        parte: nome,
        cor: coresPorParte ? `#${corDeAuditoria(i).getHexString()}` : null,
      }));
    },
    definirAuditoria(ligado) {
      auditoria = Boolean(ligado);
      aplicarVisual();
      return auditoria;
    },
    definirArame(ligado) {
      arame = ligado === 'raio-x' ? 'raio-x' : Boolean(ligado);
      aplicarVisual();
      return arame;
    },
    definirWireframeSelecao(ligado) {
      wireframeSelecao = Boolean(ligado);
      aplicarVisual();
      return wireframeSelecao;
    },
    definirOpacidadeSelecao(valor) {
      opacidadeSelecao = Math.min(1, Math.max(0, Number(valor)));
      if (!Number.isFinite(opacidadeSelecao)) opacidadeSelecao = 1;
      aplicarVisual();
      return opacidadeSelecao;
    },
    definirModo(novoModo) {
      modo = ['todas', 'contexto', 'isolar'].includes(novoModo) ? novoModo : 'todas';
      aplicarVisual();
    },
    definirExplosao(valor, { enquadrar = true } = {}) {
      explosaoAlvo = Math.min(1, Math.max(0, Number(valor) || 0));
      animarExplosao(enquadrar);
    },
    gruposSelecionados() {
      return selecionadas.map((nome) => partes.get(nome)).filter(Boolean);
    },
    /* Uma parte pelo nome. Existe para quem precisa medir DUAS partes separadas
       em vez do conjunto selecionado — o foco de contato compara as caixas uma
       da outra, e `gruposSelecionados` já devolve as duas fundidas numa lista
       sem dizer qual é qual. */
    grupoDe(nome) {
      return partes.get(nome) ?? null;
    },
    gruposVisiveis() {
      return nomes.map((nome) => partes.get(nome)).filter((grupo) => grupo?.visible);
    },
    estado,
    /* Reaplica a seleção, o fantasma e o arame em vigor nos materiais que as
       malhas têm agora: a visão de conferência troca os materiais e, ao
       desfazer, devolve os do autor, que precisam receber o estado de hoje. */
    reaplicar() { aplicarVisual(); },
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
