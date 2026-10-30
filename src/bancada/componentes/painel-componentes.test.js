/* painel-componentes.test.js — a lista das partes nasce do estado, marca a seleção, filtra, e o painel recolhe com a seta certa. */
import { describe, expect, it, vi } from 'vitest';
import { criarEstadoCentral, estadoInicialDaBancada } from '../estado/estado-central.js';
import { criarPagina } from './dom-de-teste.js';
import { lerElementosDaPagina } from './elementos-da-pagina.js';
import { montarPainelComponentes } from './painel-componentes.js';

const MARCACAO = `
  <aside class="painel painel-partes" data-painel="partes">
    <button class="recolher" type="button" data-recolher="partes" aria-expanded="true"><span aria-hidden="true">‹</span></button>
    <input id="filtroPartes" type="search" />
    <span id="resumoFiltro">0 componentes</span>
    <strong id="fixtureAtual">Aguardando modelo…</strong>
    <div id="listaPartes"></div>
    <button id="btnLimpar" type="button">Limpar</button>
  </aside>`;

function montar() {
  const pagina = criarPagina(MARCACAO);
  const estado = criarEstadoCentral(estadoInicialDaBancada({ visao: 'solida' }));
  const acoes = { selecionar: vi.fn(), limpar: vi.fn(), aoRecolher: vi.fn() };
  montarPainelComponentes({
    elementos: lerElementosDaPagina(pagina.documento).painelComponentes, estado, janela: pagina.janela, ...acoes,
  });
  return { ...pagina, estado, acoes };
}

const PARTES = [
  { nome: 'caixaRodaFrente', pai: null, faces: 19 },
  { nome: 'aroFrenteDir', pai: 'rodaFrenteDir', faces: 120 },
];

describe('painel de componentes', () => {
  it('desenha uma linha por parte, com o nome formatado, o pai e as faces, sem marca', () => {
    const { $, estado } = montar();
    estado.definir({ partes: PARTES });
    const linhas = $('listaPartes').querySelectorAll('.parte-linha');
    expect(linhas.map((l) => l.dataset.parte)).toEqual(['caixaRodaFrente', 'aroFrenteDir']);
    expect(linhas[1].querySelector('.nome').textContent).toBe('Aro Frente Dir de Roda Frente Dir');
    expect(linhas[1].querySelector('.faces').textContent).toBe('120F');
    expect(linhas.every((l) => l.getAttribute('aria-pressed') === 'false')).toBe(true);
    expect($('resumoFiltro').textContent).toBe('2 componentes');
  });

  it('marca a seleção que o estado traz e manda o clique para a peça', () => {
    const { $, estado, acoes } = montar();
    estado.definir({ partes: PARTES });
    estado.definir({ selecao: { selecionadas: ['aroFrenteDir'] } });
    const [primeira, segunda] = $('listaPartes').querySelectorAll('.parte-linha');
    expect(segunda.classList.contains('ativa')).toBe(true);
    expect(segunda.getAttribute('aria-pressed')).toBe('true');
    expect(segunda.querySelector('.check').textContent).toBe('✓');
    expect(primeira.querySelector('.check').textContent).toBe('');
    primeira.click();
    expect(acoes.selecionar).toHaveBeenCalledWith('caixaRodaFrente');
    $('btnLimpar').click();
    expect(acoes.limpar).toHaveBeenCalled();
  });

  it('filtra pelo nome e limpa o filtro quando a lista é refeita', () => {
    const { $, estado } = montar();
    estado.definir({ partes: PARTES });
    $('filtroPartes').value = 'caixa';
    $('filtroPartes').dispatchEvent({ type: 'input' });
    expect($('listaPartes').querySelectorAll('.parte-linha').map((l) => l.hidden)).toEqual([false, true]);
    expect($('resumoFiltro').textContent).toBe('1 de 2 componentes');
    estado.definir({ partes: [...PARTES] });
    expect($('filtroPartes').value).toBe('');
    expect($('resumoFiltro').textContent).toBe('2 componentes');
  });

  it('escreve o nome da peça e só escreve a espera quando a sessão não trouxe peça', () => {
    const { $, estado } = montar();
    $('fixtureAtual').textContent = 'Carregando…';
    estado.definir({ aguardandoModelo: true });
    expect($('fixtureAtual').textContent).toBe('Aguardando modelo…');
    estado.definir({ rotuloPeca: 'Furgao' });
    expect($('fixtureAtual').textContent).toBe('Furgao');
  });

  it('a barra leva ao filtro fora de campo de texto, e recolher vira a seta e avisa', () => {
    const { documento, janela, $, acoes } = montar();
    const evento = janela.teclar({ key: '/' });
    expect(evento.defaultPrevented).toBe(true);
    expect(documento.activeElement).toBe($('filtroPartes'));
    expect(janela.teclar({ key: '/', target: $('filtroPartes') }).defaultPrevented).toBe(false);

    const botao = documento.querySelector('[data-recolher="partes"]');
    botao.click();
    expect(documento.querySelector('.painel').classList.contains('recolhido')).toBe(true);
    expect(botao.getAttribute('aria-expanded')).toBe('false');
    expect(botao.querySelector('[aria-hidden="true"]').textContent).toBe('›');
    expect(acoes.aoRecolher).toHaveBeenCalledTimes(1);
  });
});
