/* edicao-da-peca.test.js — a base do ajuste é uma cópia da malha do arquivo, a malha só conta como mudada por vértice movido ou por vértice ou face a mais ou a menos, e o rodapé das juntas fala da peça que está em cena. */
import * as THREE from 'three';
import { afterEach, describe, expect, it } from 'vitest';
import { adaptarThree } from '../../autoria/adaptar-three.js';
import { executarReceita } from '../../autoria/executar-receita.js';
import receitaDeProva from '../../../tools/fixtures/acervo/peca-de-prova/receita.js';
import { criarPagina } from '../componentes/dom-de-teste.js';
import { lerElementosDaPagina } from '../componentes/elementos-da-pagina.js';
import { montarRodapeJuntas } from '../componentes/rodape-juntas.js';
import { criarEstadoCentral, estadoInicialDaBancada } from '../estado/estado-central.js';
import { criarEdicaoDaPeca, fotografarMalha, malhaMudouDesdeOArquivo } from './edicao-da-peca.js';

const malha = () => ({
  V: new Map([[1, [0, 0, 0]], [2, [1, 0, 0]], [3, [0, 1, 0]]]),
  F: new Map([[10, { vs: [1, 2, 3], parte: 'chapa' }]]),
  portas: [{ id: 'eixo' }],
});

describe('edição da peça', () => {
  it('a fotografia copia vértices e faces, e leva as portas sem cópia', () => {
    const viva = malha();
    const foto = fotografarMalha(viva);
    viva.V.get(1)[0] = 9;
    viva.F.get(10).vs.push(4);
    expect(foto.V.get(1)).toEqual([0, 0, 0]);
    expect(foto.F.get(10).vs).toEqual([1, 2, 3]);
    expect(foto.portas).toBe(viva.portas);
    expect('portas' in fotografarMalha({ V: new Map(), F: new Map() })).toBe(false);
  });

  it('mudou só com vértice movido além da tolerância, ou com vértice ou face trocados', () => {
    const doArquivo = fotografarMalha(malha());
    const igual = fotografarMalha(malha());
    expect(malhaMudouDesdeOArquivo(doArquivo, igual)).toBe(false);
    igual.V.get(2)[1] = 1e-12;
    expect(malhaMudouDesdeOArquivo(doArquivo, igual)).toBe(false);
    igual.V.get(2)[1] = 1e-6;
    expect(malhaMudouDesdeOArquivo(doArquivo, igual)).toBe(true);

    const outraFace = fotografarMalha(malha());
    outraFace.F.delete(10);
    outraFace.F.set(11, { vs: [1, 2, 3] });
    expect(malhaMudouDesdeOArquivo(doArquivo, outraFace)).toBe(true);
    expect(malhaMudouDesdeOArquivo(null, igual)).toBe(false);
  });
});

describe('rodapé das juntas na troca de peça', () => {
  const documentoAntes = globalThis.document;
  afterEach(() => { globalThis.document = documentoAntes; });

  /* A edição com a peça em cena como `peca-em-cena.js` a monta: os três ganchos de `aplicarModelo`, na mesma ordem, e o
     rodapé de verdade lendo o estado central. */
  function bancada() {
    const { documento, $ } = criarPagina(`
      <footer id="rodapeJuntas" hidden>
        <span id="resumoJuntas">nenhuma junta movida</span>
        <button id="btnSalvarAjusteDeJunta" disabled>Salvar ajuste</button>
      </footer>`);
    /* a camada da edição de malha põe a caixa de seleção no corpo da página */
    globalThis.document = documento;
    const estado = criarEstadoCentral(estadoInicialDaBancada({ visao: 'solida' }));
    montarRodapeJuntas({ elementos: lerElementosDaPagina(documento).rodapeJuntas, estado, salvar: () => {}, baixar: () => {} });
    const ambiente = { scene: new THREE.Scene(), camera: new THREE.PerspectiveCamera(), controls: { mouseButtons: {} } };
    const canvas = { addEventListener() {}, removeEventListener() {}, getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }), style: {} };
    let edicao = null;
    const cena = {
      modelo: null,
      controlador: null,
      aplicarModelo(convertido, { deAjuste = false } = {}) {
        if (this.modelo) {
          this.modelo.raiz.removeFromParent();
          edicao.antesDeTrocarDeModelo();
        }
        this.modelo = convertido;
        if (!deAjuste) edicao.receberPecaDoArquivo(convertido);
        ambiente.scene.add(convertido.raiz);
        edicao.criarCamadaDoModelo(convertido, { deAjuste });
      },
    };
    edicao = criarEdicaoDaPeca({ ambiente, canvas, estado, registroDeEventos: { registrar() {} }, cena, avisar: () => {} });
    const abrir = (nome) => {
      const neutro = executarReceita(receitaDeProva).neutro;
      cena.aplicarModelo({ nome, rotulo: nome, neutro, ...adaptarThree(neutro, { nome }) });
    };
    const rodape = () => ({ oculto: $('rodapeJuntas').hidden, texto: $('resumoJuntas').textContent, salvar: !$('btnSalvarAjusteDeJunta').disabled });
    return { edicao, abrir, rodape };
  }

  it('a malha editada de uma peça não fica no rodapé da peça aberta em seguida', () => {
    const { edicao, abrir, rodape } = bancada();
    abrir('carenagem');
    expect(rodape()).toEqual({ oculto: true, texto: 'nenhuma junta movida', salvar: false });
    /* Tab, A e S, como na bancada: a peça inteira escalada, fora do modo de juntas */
    edicao.alternarEdicaoDeMalha();
    edicao.camada.selecionarTudo();
    expect(edicao.aplicarNaMalha('escalar', { fator: 1.1 })).toBe(true);
    expect(rodape()).toEqual({ oculto: false, texto: 'malha editada', salvar: true });
    edicao.alternarEdicaoDeMalha();
    /* outra peça, do arquivo: nada foi feito nela. Antes, o rodapé continuava em "malha editada", com o salvar ligado */
    abrir('furgao');
    expect(rodape()).toEqual({ oculto: true, texto: 'nenhuma junta movida', salvar: false });
  });

  it('com o modo de juntas ligado, a peça nova abre com o rodapé à vista e nada a salvar', () => {
    const { edicao, abrir, rodape } = bancada();
    abrir('carenagem');
    edicao.alternarEdicaoDeMalha();
    edicao.camada.selecionarTudo();
    edicao.aplicarNaMalha('escalar', { fator: 1.1 });
    edicao.alternarEdicaoDeMalha();
    edicao.definirModoJuntas(true);
    expect(rodape()).toEqual({ oculto: false, texto: 'malha editada', salvar: true });
    abrir('furgao');
    expect(rodape()).toEqual({ oculto: false, texto: 'nenhuma junta movida', salvar: false });
  });
});
