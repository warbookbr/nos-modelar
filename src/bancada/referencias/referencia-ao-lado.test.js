/* referencia-ao-lado.test.js — a câmera de um quadro da folha posta na cena projeta a peça onde a câmera da fonte a projetou, as vistas da folha seguem as da bancada, e a referência da mesa segue a imagem da aba e a vista da peça. */
import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { QUADRO_DA_FONTE, VISTAS_DA_FONTE, enquadramentoDaFonte } from '../../autoria/quadro-da-fonte.js';
import { criarEstadoCentral, estadoInicialDaBancada } from '../estado/estado-central.js';
import {
  VISTAS_DA_FOLHA, VISTA_INTEIRA, cameraDoQuadro, criarReferenciaAoLado, folhaDaFonte, recorteDoQuadro,
} from './referencia-ao-lado.js';

/* A caixa total do furgão em `procedural/pecas/furgao/referencias/fonte-partes.json`, em metro. */
const TOTAL = { minimo: [-1.3237, 0, -2.4269], maximo: [1.3237, 2.3827, 2.4269], tamanho: [2.6475, 2.3827, 4.8538] };

/** O ponto em coordenadas normalizadas da câmera ortográfica dada. */
function projetar(camera, ponto) {
  camera.updateMatrixWorld(true);
  camera.updateProjectionMatrix();
  return new THREE.Vector3(...ponto).project(camera).toArray().slice(0, 2);
}

/* A câmera da fonte, como `tools/modelar/modelo-de-referencia.mjs` a monta, no quadro de 640 por 480. */
function cameraDaFonte(quadro) {
  const { W, H, folga } = QUADRO_DA_FONTE;
  const { centro, raio } = enquadramentoDaFonte(TOTAL);
  const [, direcao, acima] = VISTAS_DA_FONTE[quadro];
  const camera = new THREE.OrthographicCamera(-raio * folga * W / H, raio * folga * W / H, raio * folga, -raio * folga, 0.01, raio * 30);
  camera.up.set(...acima);
  camera.position.copy(new THREE.Vector3(...centro)).add(new THREE.Vector3(...direcao).normalize().multiplyScalar(raio * 5));
  camera.lookAt(new THREE.Vector3(...centro));
  return camera;
}

/* A câmera da bancada a partir de `cameraDoQuadro`, num canvas de `aspecto`, como `olharComoReferencia` a monta. */
function cameraDaBancada(camera, aspecto) {
  const meiaAltura = Math.max(camera.meiaAltura, camera.meiaLargura / aspecto);
  const resultado = new THREE.OrthographicCamera(-meiaAltura * aspecto, meiaAltura * aspecto, meiaAltura, -meiaAltura, 0.01, 1000);
  resultado.up.set(...camera.acima);
  resultado.position.copy(new THREE.Vector3(...camera.centro)).addScaledVector(new THREE.Vector3(...camera.direcao).normalize(), 20);
  resultado.lookAt(new THREE.Vector3(...camera.centro));
  return resultado;
}

describe('vistas da folha da fonte', () => {
  it('a lateral, a frontal e a de cima são as vistas da bancada; a isométrica da folha olha de outro ponto', () => {
    expect(VISTAS_DA_FOLHA.map((vista) => [vista.id, vista.quadro, vista.exata]))
      .toEqual([['isometrica', 0, false], ['direita', 1, true], ['frontal', 2, true], ['superior', 3, true]]);
    expect(VISTA_INTEIRA.quadro).toBeNull();
    expect([0, 1, 2, 3].map(recorteDoQuadro)).toEqual([
      { coluna: 0, linha: 0 }, { coluna: 1, linha: 0 }, { coluna: 0, linha: 1 }, { coluna: 1, linha: 1 },
    ]);
    expect(recorteDoQuadro(null)).toBeNull();
  });

  it('reconhece a folha pelo nome e pelo fonte-partes.json da mesma peça', () => {
    const partes = { '../../../procedural/pecas/furgao/referencias/fonte-partes.json': '/furgao/partes.json' };
    expect(folhaDaFonte({ id: 'furgao:referencias/fonte-vistas.png' }, partes)).toEqual({ peca: 'furgao', urlDasPartes: '/furgao/partes.json' });
    expect(folhaDaFonte({ id: 'furgao:referencias/vistas.png' }, partes)).toBeNull();
    expect(folhaDaFonte({ id: 'onibus:referencias/fonte-vistas.png' }, partes)).toBeNull();
    expect(folhaDaFonte({ id: 'imagem-referencia' }, partes)).toBeNull();
    expect(folhaDaFonte({ id: 'furgao:referencias/fonte-vistas.png' })?.peca).toBe('furgao');
  });

  it.each([0, 1, 2, 3])('no quadro %i, a peça posta no estúdio cai onde a câmera da fonte a pôs, em qualquer canvas', (quadro) => {
    /* O estúdio aumenta a peça e a desloca, como `posicionarNoEstudio`. */
    const escala = 0.7;
    const deslocamento = [0.1, 0.08, -0.2];
    const paraCena = (ponto) => ponto.map((valor, eixo) => valor * escala + deslocamento[eixo]);
    const camera = cameraDoQuadro({ total: TOTAL, quadro, paraCena, escala });
    const fonte = cameraDaFonte(quadro);
    const quinas = [];
    for (const x of [TOTAL.minimo[0], TOTAL.maximo[0]]) for (const y of [TOTAL.minimo[1], TOTAL.maximo[1]]) for (const z of [TOTAL.minimo[2], TOTAL.maximo[2]]) quinas.push([x, y, z]);
    for (const aspecto of [QUADRO_DA_FONTE.W / QUADRO_DA_FONTE.H, 580 / 788, 1160 / 788]) {
      const bancada = cameraDaBancada(camera, aspecto);
      /* O quadro da fonte ocupa, no canvas, o retângulo da imagem que cabe inteira nele. */
      const largura = Math.min(1, (QUADRO_DA_FONTE.W / QUADRO_DA_FONTE.H) / aspecto);
      const altura = Math.min(1, aspecto / (QUADRO_DA_FONTE.W / QUADRO_DA_FONTE.H));
      for (const quina of quinas) {
        const [fx, fy] = projetar(fonte, quina);
        const [bx, by] = projetar(bancada, paraCena(quina));
        expect(bx).toBeCloseTo(fx * largura, 9);
        expect(by).toBeCloseTo(fy * altura, 9);
      }
    }
  });
});

function montar({ tema = 'revisao', descritor = { id: 'furgao:referencias/fonte-vistas.png', url: '/fonte-vistas.png', rotulo: 'referencias/fonte-vistas.png' } } = {}) {
  const estado = criarEstadoCentral(estadoInicialDaBancada({ visao: 'solida', tema }));
  estado.definir({ inicializando: false });
  const raiz = new THREE.Group();
  raiz.scale.setScalar(0.7);
  raiz.position.set(0, 0.08, 0);
  const ambiente = {
    projecao: 'perspectiva',
    olharComoReferencia: vi.fn(),
    scene: { getObjectByName: () => gizmo },
  };
  const gizmo = { visible: true };
  /* Com a chave "Na cena" desligada, a imagem só está na aba: o gerenciador não tem imagem, e `descreverNaCena` devolve
     a oferecida, fora da cena. */
  const gerenciador = { grupo: { visible: true }, obterImagemReferencia: () => null };
  const alternarProjecao = vi.fn(() => { ambiente.projecao = 'ortografica'; });
  const referencia = criarReferenciaAoLado({
    ambiente, cena: { modelo: { raiz } }, imagemNaCena: { gerenciador, descreverNaCena: () => (descritor ? { ...descritor, naCena: false } : null) }, estado, alternarProjecao,
    carregarJson: async () => ({ total: TOTAL }),
  });
  return { estado, ambiente, gerenciador, gizmo, alternarProjecao, referencia };
}

const esperar = () => new Promise((resolver) => { setTimeout(resolver, 0); });

describe('referência da mesa', () => {
  it('lê a imagem da aba, oferece as vistas da folha e põe a peça na câmera da isométrica, em ortográfica', async () => {
    const { estado, ambiente, alternarProjecao, gerenciador, gizmo, referencia } = montar();
    referencia.acompanhar();
    await esperar();
    expect(estado.obter('imagemDaReferencia')).toMatchObject({ url: '/fonte-vistas.png', folha: true });
    expect(estado.obter('imagemDaReferencia').vistas.map((vista) => vista.id)).toEqual(['isometrica', 'direita', 'frontal', 'superior', 'inteira']);
    expect(estado.obter('comparacao')).toMatchObject({ vista: 'isometrica', alinhada: true });
    expect(alternarProjecao).toHaveBeenCalledTimes(1);
    const pedido = ambiente.olharComoReferencia.mock.calls.at(-1)[0];
    expect(pedido.vista).toBe('livre');
    expect(pedido.direcao).toEqual(VISTAS_DA_FONTE[0][1]);
    expect(pedido.meiaAltura).toBeCloseTo(enquadramentoDaFonte(TOTAL).raio * QUADRO_DA_FONTE.folga * 0.7, 9);
    /* A referência na cena 3D some enquanto a mesa está na tela. */
    expect(gerenciador.grupo.visible).toBe(false);
    expect(gizmo.visible).toBe(false);
  });

  it('a vista escolhida na peça troca o quadro; enquadrar ou girar só tiram o alinhamento', async () => {
    const { estado, ambiente, referencia } = montar();
    referencia.acompanhar();
    await esperar();
    referencia.aoMudarVista('direita');
    expect(estado.obter('comparacao')).toMatchObject({ vista: 'direita', alinhada: true });
    expect(ambiente.olharComoReferencia.mock.calls.at(-1)[0]).toMatchObject({ vista: 'direita', direcao: [1, 0, 0], acima: [0, 1, 0] });
    const chamadas = ambiente.olharComoReferencia.mock.calls.length;
    referencia.aoMudarVista('direita');
    expect(estado.obter('comparacao').alinhada).toBe(false);
    referencia.aoMudarVista('traseira');
    referencia.aoMudarVista('livre');
    expect(ambiente.olharComoReferencia.mock.calls.length).toBe(chamadas);
    expect(estado.obter('comparacao').vista).toBe('direita');
    /* Escolher a vista pela referência alinha de novo. */
    estado.definir({ comparacao: { ...estado.obter('comparacao'), vista: 'superior' } });
    expect(ambiente.olharComoReferencia.mock.calls.at(-1)[0]).toMatchObject({ vista: 'superior', acima: [0, 0, -1] });
  });

  it('sem a mesma câmera, a peça não se mexe; a imagem inteira não tem câmera', async () => {
    const { estado, ambiente, referencia } = montar();
    estado.definir({ comparacao: { ...estado.obter('comparacao'), mesmaCamera: false } });
    referencia.acompanhar();
    await esperar();
    referencia.aoMudarVista('frontal');
    expect(ambiente.olharComoReferencia).not.toHaveBeenCalled();
    estado.definir({ comparacao: { ...estado.obter('comparacao'), mesmaCamera: true, vista: 'inteira' } });
    expect(ambiente.olharComoReferencia).not.toHaveBeenCalled();
  });

  it('imagem que não é a folha aparece inteira, e fora do Revisão a referência volta à cena', async () => {
    const { estado, ambiente, gerenciador, referencia } = montar({ descritor: { id: 'peca:referencias/foto.png', url: '/foto.png' } });
    referencia.acompanhar();
    await esperar();
    expect(estado.obter('imagemDaReferencia')).toMatchObject({ folha: false, vistas: [VISTA_INTEIRA] });
    expect(estado.obter('comparacao').vista).toBe('inteira');
    expect(ambiente.olharComoReferencia).not.toHaveBeenCalled();
    expect(gerenciador.grupo.visible).toBe(false);
    estado.definir({ tema: 'foco' });
    referencia.acompanhar();
    expect(gerenciador.grupo.visible).toBe(true);
  });

  it('sem imagem na aba a mesa fica sem referência, e fora do Revisão nada se esconde nem se alinha', async () => {
    const { estado, ambiente, gerenciador, referencia } = montar({ tema: 'foco', descritor: null });
    referencia.acompanhar();
    await esperar();
    expect(estado.obter('imagemDaReferencia')).toBeNull();
    expect(gerenciador.grupo.visible).toBe(true);
    expect(ambiente.olharComoReferencia).not.toHaveBeenCalled();
  });
});
