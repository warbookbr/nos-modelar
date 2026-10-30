/* paineis-do-tema.test.js — a regra dos 70% da cena recolhe um painel quando o outro abre, e o componente abre, fecha e marca os painéis só no tema que os declara. */
import { describe, expect, it } from 'vitest';
import { criarEstadoCentral, estadoInicialDaBancada } from '../estado/estado-central.js';
import { temaPorId } from '../temas/temas.js';
import { criarPagina } from './dom-de-teste.js';
import { lerElementosDaPagina } from './elementos-da-pagina.js';
import { larguraOcupada, montarPaineisDoTema, paineisAoAbrir } from './paineis-do-tema.js';

const PAINEIS = temaPorId('foco').paineis;

const MARCACAO = `
  <button data-abrir-painel="partes" aria-expanded="false">Partes</button>
  <button data-abrir-painel="inspecao" aria-expanded="false">Detalhes</button>
  <aside class="painel" data-painel="partes"><button data-fechar-painel="partes">x</button></aside>
  <aside class="painel" data-painel="inspecao"><button data-fechar-painel="inspecao">x</button></aside>`;

function montar({ tema = 'foco', largura = 1400 } = {}) {
  const pagina = criarPagina(MARCACAO);
  pagina.janela.innerWidth = largura;
  const estado = criarEstadoCentral(estadoInicialDaBancada({ visao: 'solida', tema }));
  const abas = [];
  const paineis = montarPaineisDoTema({
    elementos: lerElementosDaPagina(pagina.documento).paineisDoTema, estado, abrirAba: (aba) => abas.push(aba), janela: pagina.janela,
  });
  const aberto = (nome) => pagina.documento.querySelector(`.painel[data-painel="${nome}"]`).dataset.aberto;
  return { ...pagina, estado, paineis, abas, aberto };
}

describe('regra dos painéis', () => {
  it('mede a largura que os painéis abertos tiram da cena, com as margens', () => {
    expect(larguraOcupada({ partes: true, inspecao: false }, PAINEIS)).toBe(272);
    expect(larguraOcupada({ partes: true, inspecao: true }, PAINEIS)).toBe(576);
  });

  it('abrir o segundo recolhe o primeiro enquanto a cena ficaria com menos de 70%, e os dois cabem a partir de 1920', () => {
    for (const larguraDaJanela of [1100, 1400, 1919]) {
      expect(paineisAoAbrir({ abertos: { partes: true, inspecao: false }, abrir: 'inspecao', paineis: PAINEIS, larguraDaJanela }))
        .toEqual({ partes: false, inspecao: true });
    }
    expect(paineisAoAbrir({ abertos: { partes: true, inspecao: false }, abrir: 'inspecao', paineis: PAINEIS, larguraDaJanela: 1920 }))
      .toEqual({ partes: true, inspecao: true });
  });
});

describe('painéis do tema', () => {
  it('no Foco nascem fechados e abrem e fecham pelos botões, um de cada vez em 1400', () => {
    const { documento, aberto, estado } = montar();
    expect([aberto('partes'), aberto('inspecao')]).toEqual(['false', 'false']);
    documento.querySelector('[data-abrir-painel="partes"]').click();
    expect(aberto('partes')).toBe('true');
    expect(documento.querySelector('[data-abrir-painel="partes"]').getAttribute('aria-expanded')).toBe('true');
    documento.querySelector('[data-abrir-painel="inspecao"]').click();
    expect(estado.obter('paineis')).toEqual({ partes: false, inspecao: true });
    documento.querySelector('[data-fechar-painel="inspecao"]').click();
    expect(aberto('inspecao')).toBe('false');
  });

  it('abrir com uma aba escolhe a aba, e encolher a janela deixa só o último aberto', () => {
    const { paineis, abas, estado, janela } = montar({ largura: 2000 });
    paineis.abrir('partes');
    paineis.abrir('inspecao', { aba: 'referencias' });
    expect(estado.obter('paineis')).toEqual({ partes: true, inspecao: true });
    expect(abas).toEqual(['referencias']);
    janela.innerWidth = 1300;
    janela.disparar({ type: 'resize' }, { captura: false });
    expect(estado.obter('paineis')).toEqual({ partes: false, inspecao: true });
  });

  it('na arrumação clássica não abre nem marca nada, e trocar de tema volta ao que o tema declara', () => {
    const { paineis, documento, estado } = montar({ tema: 'bancada' });
    expect(paineis.abrir('partes')).toBe(false);
    expect(documento.querySelector('.painel').hasAttribute('data-aberto')).toBe(false);
    estado.definir({ tema: 'foco' });
    expect(documento.querySelector('.painel').dataset.aberto).toBe('false');
    /* O Revisão encosta a árvore aberta ao nascer. */
    estado.definir({ tema: 'revisao' });
    expect(documento.querySelector('.painel').dataset.aberto).toBe('true');
  });
});
