/* barra-de-estado.test.js — a barra de estado conta a seleção, resume a peça e liga a grade e o chão. */
import { describe, expect, it, vi } from 'vitest';
import { criarEstadoCentral, estadoInicialDaBancada } from '../estado/estado-central.js';
import { criarPagina } from './dom-de-teste.js';
import { lerElementosDaPagina } from './elementos-da-pagina.js';
import { montarBarraDeEstado } from './barra-de-estado.js';

const MARCACAO = `
  <footer id="barraEstado">
    <span id="selecaoEstado"></span><span id="pecaEstado"></span>
    <button id="btnGradeEstado"></button><button id="btnChaoEstado"></button><button id="btnAtalhosEstado"></button>
  </footer>`;

function montar() {
  const pagina = criarPagina(MARCACAO);
  const estado = criarEstadoCentral(estadoInicialDaBancada({ visao: 'solida' }));
  const acoes = { alternarPreferenciaCena: vi.fn(), abrirConfiguracoes: vi.fn() };
  montarBarraDeEstado({
    elementos: lerElementosDaPagina(pagina.documento).barraDeEstado,
    estado,
    medidasDaPeca: () => ({ tamanho: [2.65, 2.38, 4.85], faces: 2996 }),
    acoes,
  });
  return { ...pagina, estado, acoes };
}

describe('barra de estado', () => {
  it('não tem mais a dica do gesto: o texto saiu da tela em 2026-11-03', () => {
    const { documento } = montar();
    expect(documento.getElementById('dicaEstado')).toBeNull();
  });

  it('conta a seleção, resume a peça, marca grade e chão e chama as ações', () => {
    const { $, estado, acoes } = montar();
    estado.definir({ partes: [{ nome: 'a' }, { nome: 'b' }], selecao: { selecionadas: ['a'] }, preferenciasCena: { grade: true, chao: false } });
    expect($('selecaoEstado').textContent).toBe('Seleção 1 de 2');
    expect($('pecaEstado').textContent).toBe('2 partes · 2.996 faces · 2,65 × 2,38 × 4,85 m');
    expect($('btnGradeEstado').getAttribute('aria-pressed')).toBe('true');
    expect($('btnChaoEstado').getAttribute('aria-pressed')).toBe('false');
    $('btnGradeEstado').click();
    $('btnChaoEstado').click();
    $('btnAtalhosEstado').click();
    expect(acoes.alternarPreferenciaCena.mock.calls).toEqual([['grade'], ['chao']]);
    expect(acoes.abrirConfiguracoes).toHaveBeenCalled();
  });
});
