/* barra-das-vistas.test.js — a vista ativa, a projeção e o seletor de visão seguem o estado, e a lista das visões abre, fecha e escolhe pela mesma porta do atalho. */
import { describe, expect, it, vi } from 'vitest';
import { criarEstadoCentral, estadoInicialDaBancada } from '../estado/estado-central.js';
import { VISOES } from '../visoes/registro-de-visoes.js';
import { criarPagina } from './dom-de-teste.js';
import { lerElementosDaPagina } from './elementos-da-pagina.js';
import { montarBarraDasVistas } from './barra-das-vistas.js';

const MARCACAO = `
  <nav class="vistas">
    <button data-vista="frontal"><span>Frente</span></button>
    <button data-vista="isometrica" class="ativa"><span>Iso</span></button>
    <button id="btnProjecao"><span>Perspectiva</span></button>
    <button id="btnEnquadrar"><span>Enquadrar</span></button>
    <div class="seletor-visao">
      <button id="btnVisao" aria-expanded="false"><span>Visão</span><b id="nomeVisao">Sólida</b></button>
      <div id="menuVisoes" hidden></div>
    </div>
  </nav>
  <canvas id="cenaBancada"></canvas>`;

function montar({ semMenu = false } = {}) {
  const pagina = criarPagina(semMenu ? MARCACAO.replace(/<div class="seletor-visao">[\s\S]*?<\/div>\s*<\/div>/, '') : MARCACAO);
  const estado = criarEstadoCentral(estadoInicialDaBancada({ visao: 'solida' }));
  const acoes = {
    definirVista: vi.fn(), alternarProjecao: vi.fn(), enquadrar: vi.fn(),
    escolherVisao: vi.fn(() => { estado.definir({ menuVisoesAberto: false }); return true; }),
    aoRefletirVisao: vi.fn(),
  };
  montarBarraDasVistas({ elementos: lerElementosDaPagina(pagina.documento).barraDasVistas, estado, janela: pagina.janela, ...acoes });
  return { ...pagina, estado, acoes };
}

const TECLAS = Object.fromEntries(VISOES.map((visao) => [`visao-${visao.id}`, visao.atalho]));

describe('barra das vistas', () => {
  it('marca a vista em vigor e redesenha no fim da subida', () => {
    const { documento, estado } = montar();
    const ativa = () => documento.querySelectorAll('[data-vista]').filter((b) => b.classList.contains('ativa')).map((b) => b.dataset.vista);
    estado.definir({ vista: 'frontal' });
    expect(ativa()).toEqual(['frontal']);
    documento.querySelector('[data-vista="isometrica"]').classList.add('ativa');
    estado.definir({ inicializando: false });
    expect(ativa()).toEqual(['frontal']);
  });

  it('a projeção troca o texto e a marca do botão, e os botões chamam as ações', () => {
    const { $, documento, estado, acoes } = montar();
    estado.definir({ projecao: 'ortografica' });
    expect($('btnProjecao').querySelector('span').textContent).toBe('Ortográfica');
    expect($('btnProjecao').classList.contains('ativa')).toBe(true);
    $('btnProjecao').click();
    $('btnEnquadrar').click();
    documento.querySelector('[data-vista="frontal"]').click();
    expect(acoes.alternarProjecao).toHaveBeenCalledTimes(1);
    expect(acoes.enquadrar).toHaveBeenCalledTimes(1);
    expect(acoes.definirVista).toHaveBeenCalledWith('frontal');
  });

  it('a lista das visões sai do registro com a tecla de cada uma, marca a escolhida, e as seis funcionam', () => {
    const { $, estado, acoes } = montar();
    estado.definir({ atalhos: TECLAS });
    const itens = $('menuVisoes').querySelectorAll('[data-visao]');
    expect(itens.map((i) => i.dataset.visao)).toEqual(VISOES.map((v) => v.id));
    expect(itens.find((i) => i.dataset.visao === 'raio-x').querySelector('kbd').textContent).toBe('⇧M');
    expect(itens.filter((i) => i.getAttribute('aria-disabled') === 'true')).toHaveLength(0);
    expect(itens.find((i) => i.dataset.visao === 'solida').getAttribute('aria-checked')).toBe('true');
    expect(acoes.aoRefletirVisao).toHaveBeenLastCalledWith('solida');

    estado.definir({ visao: 'arame' });
    expect($('nomeVisao').textContent).toBe('Arame');
    expect($('btnVisao').classList.contains('ativa')).toBe(true);
    expect(acoes.aoRefletirVisao).toHaveBeenLastCalledWith('arame');
    itens.find((i) => i.dataset.visao === 'arame').click();
    expect(acoes.escolherVisao).toHaveBeenCalledWith('arame');
  });

  it('abre pelo botão, fecha por clique fora e por Esc, e o Esc não segue para a cena', () => {
    const { $, documento, janela, estado } = montar();
    $('btnVisao').click();
    expect([$('menuVisoes').hidden, $('btnVisao').getAttribute('aria-expanded')]).toEqual([false, 'true']);
    janela.apontar($('btnVisao'));
    expect($('menuVisoes').hidden).toBe(false);
    janela.apontar($('cenaBancada'));
    expect($('menuVisoes').hidden).toBe(true);

    $('btnVisao').click();
    const naCena = vi.fn();
    janela.addEventListener('keydown', naCena);
    janela.teclar({ key: 'Escape' });
    expect($('menuVisoes').hidden).toBe(true);
    expect(naCena).not.toHaveBeenCalled();
    expect(documento.activeElement).toBe($('btnVisao'));
    expect(estado.obter('menuVisoesAberto')).toBe(false);
  });

  it('sem a lista das visões na página, as teclas não desenham nada e a visão ainda se reflete', () => {
    const { estado, acoes } = montar({ semMenu: true });
    estado.definir({ atalhos: TECLAS });
    expect(acoes.aoRefletirVisao).not.toHaveBeenCalled();
    estado.definir({ visao: 'raio-x' });
    expect(acoes.aoRefletirVisao).toHaveBeenCalledWith('raio-x');
  });
});
