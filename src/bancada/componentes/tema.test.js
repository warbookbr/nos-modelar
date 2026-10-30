/* tema.test.js — o tema escreve os atributos da raiz, leva os componentes para os lugares dele e os devolve para casa, troca os rótulos, guarda a escolha e entrega a cena com as cores das variáveis. */
import { describe, expect, it, vi } from 'vitest';
import { criarEstadoCentral, estadoInicialDaBancada } from '../estado/estado-central.js';
import { CAMPOS_DO_TEMA, TEMAS, TEMA_PADRAO, temaPorId } from '../temas/temas.js';
import { criarPagina } from './dom-de-teste.js';
import { lerElementosDaPagina } from './elementos-da-pagina.js';
import { montarTema } from './tema.js';

const MARCACAO = `
  <header class="topo"><div data-lugar="topo-peca"></div><div data-lugar="barra-cena"></div></header>
  <nav class="vistas">
    <button data-vista="frontal">Frente</button>
    <button id="btnProjecao" data-movel="projecao"><span>Perspectiva</span></button>
    <button id="btnEnquadrar" data-movel="enquadrar"><span>Enquadrar</span></button>
  </nav>
  <aside class="painel">
    <button id="btnJuntas" data-movel="juntas"><span data-rotulo="juntas">Juntas</span></button>
  </aside>
  <div id="escolhaTema"></div>`;

function montar(temaInicial = 'foco') {
  const pagina = criarPagina(MARCACAO);
  const estado = criarEstadoCentral(estadoInicialDaBancada({ visao: 'solida', tema: temaInicial }));
  const guardado = [];
  const preferencia = { salvar: vi.fn((id) => { guardado.push(id); return id; }) };
  const aoMudarCena = vi.fn();
  const variaveis = { '--cena': '#f2f4f3', '--destaque': '#c2531b', '--linha-forte': '#c3c9c6' };
  const tema = montarTema({
    elementos: lerElementosDaPagina(pagina.documento).tema,
    estado,
    preferencia,
    aoMudarCena,
    lerVariavel: (nome) => variaveis[nome] ?? null,
    janela: pagina.janela,
  });
  return { ...pagina, estado, tema, preferencia, aoMudarCena, guardado };
}

describe('temas', () => {
  it('cada tema declara todos os campos, o Foco é o padrão e id desconhecido cai nele', () => {
    for (const tema of TEMAS) expect(Object.keys(tema).sort()).toEqual([...CAMPOS_DO_TEMA].sort());
    expect(TEMA_PADRAO).toBe('foco');
    expect(temaPorId('nenhum').id).toBe('foco');
    expect(TEMAS.map((tema) => [tema.id, tema.cores])).toEqual([['foco', 'claro'], ['bancada', 'escuro'], ['revisao', 'claro']]);
  });
});

describe('componente do tema', () => {
  it('escreve tema, cores e arrumação na raiz e leva os móveis para os lugares do Foco, na ordem do tema', () => {
    const { documento, $ } = montar('foco');
    const raiz = documento.documentElement;
    expect([raiz.dataset.tema, raiz.dataset.cores, raiz.dataset.arrumacao]).toEqual(['foco', 'claro', 'foco']);
    const barraCena = documento.querySelector('[data-lugar="barra-cena"]');
    expect(barraCena.children.map((filho) => filho.id)).toEqual(['btnProjecao', 'btnEnquadrar']);
    expect($('btnJuntas').parentNode.dataset.lugar).toBe('topo-peca');
    expect($('btnJuntas').textContent).toBe('Editar');
  });

  it('trocar para a Bancada devolve cada móvel para a casa dele e o rótulo da página', () => {
    const { documento, $, tema, guardado, aoMudarCena } = montar('foco');
    tema.escolher('bancada');
    const raiz = documento.documentElement;
    expect([raiz.dataset.tema, raiz.dataset.cores, raiz.dataset.arrumacao]).toEqual(['bancada', 'escuro', 'classica']);
    const nav = documento.querySelector('.vistas');
    expect(nav.children.map((filho) => filho.id || filho.dataset.vista)).toEqual(['frontal', 'btnProjecao', 'btnEnquadrar']);
    expect($('btnJuntas').parentNode.classList.contains('painel')).toBe(true);
    expect($('btnJuntas').textContent).toBe('Juntas');
    expect(guardado).toEqual(['bancada']);
    expect(aoMudarCena).toHaveBeenLastCalledWith(null, expect.objectContaining({ id: 'bancada' }));
  });

  it('a cena do Foco chega com as cores lidas das variáveis do sistema visual', () => {
    const { aoMudarCena } = montar('foco');
    const [cena] = aoMudarCena.mock.calls[0];
    expect(cena).toEqual({ fundo: '#f2f4f3', grade: '#c3c9c6', gradeEsmaecida: true, sombraSuave: true, contornoDaSelecao: '#c2531b' });
  });

  it('a escolha do menu Controles marca o tema em vigor e escolhe pelo clique', () => {
    const { documento, estado } = montar('revisao');
    const opcoes = () => documento.querySelectorAll('.opcao-tema');
    expect(opcoes().map((botao) => [botao.dataset.tema, botao.getAttribute('aria-checked')]))
      .toEqual([['foco', 'false'], ['bancada', 'false'], ['revisao', 'true']]);
    opcoes()[0].click();
    expect(estado.obter('tema')).toBe('foco');
    expect(documento.querySelector('[data-tema="foco"]').getAttribute('aria-checked')).toBe('true');
  });
});
