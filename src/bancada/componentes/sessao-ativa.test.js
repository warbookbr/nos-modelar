/* sessao-ativa.test.js — a oferta da entrega em espera aparece com o nome da peça e carrega no clique, e a tela de espera segue o estado. */
import { describe, expect, it, vi } from 'vitest';
import { criarEstadoCentral, estadoInicialDaBancada } from '../estado/estado-central.js';
import { criarPagina } from './dom-de-teste.js';
import { lerElementosDaPagina } from './elementos-da-pagina.js';
import { montarSessaoAtiva } from './sessao-ativa.js';

const MARCACAO = `
  <section id="estadoCatalogoVazio" hidden><button id="btnCarregarExemplo">Demonstração</button></section>
  <button id="avisoSessaoNova" hidden></button>`;

describe('sessão ativa na tela', () => {
  it('mostra e esconde a oferta e o catálogo vazio, e os botões chamam a sessão', () => {
    const { documento, $ } = criarPagina(MARCACAO);
    const estado = criarEstadoCentral(estadoInicialDaBancada({ visao: 'solida' }));
    const aceitarEntrega = vi.fn();
    const carregarDemonstracao = vi.fn();
    montarSessaoAtiva({ elementos: lerElementosDaPagina(documento).sessaoAtiva, estado, aceitarEntrega, carregarDemonstracao });

    estado.definir({ ofertaDaSessao: { emEspera: true, nome: 'Peça de prova' } });
    expect($('avisoSessaoNova').hidden).toBe(false);
    expect($('avisoSessaoNova').textContent).toBe('A sessão da IA trouxe Peça de prova. Carregar.');
    $('avisoSessaoNova').click();
    expect(aceitarEntrega).toHaveBeenCalledTimes(1);
    estado.definir({ ofertaDaSessao: { emEspera: false, nome: '' } });
    expect($('avisoSessaoNova').hidden).toBe(true);

    estado.definir({ catalogoVazio: true });
    expect($('estadoCatalogoVazio').hidden).toBe(false);
    $('btnCarregarExemplo').click();
    expect(carregarDemonstracao).toHaveBeenCalledTimes(1);
    estado.definir({ catalogoVazio: false });
    expect($('estadoCatalogoVazio').hidden).toBe(true);
  });
});
