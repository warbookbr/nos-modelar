/* busca-de-comandos.test.js — a busca abre com Ctrl+K sem deixar a tecla chegar à cena, filtra sem acento, anda com as setas, executa com Enter e fecha com Esc; e os itens saem das ações, dos comandos e das partes. */
import { describe, expect, it, vi } from 'vitest';
import { itensDaBusca, normalizarBusca } from '../controles/itens-da-busca.js';
import { criarPagina } from './dom-de-teste.js';
import { lerElementosDaPagina } from './elementos-da-pagina.js';
import { montarBuscaDeComandos } from './busca-de-comandos.js';

const MARCACAO = `
  <button data-abrir-busca aria-expanded="false">Buscar comando</button>
  <div id="buscaComandos" hidden>
    <div class="veu-busca" data-fechar-busca></div>
    <input id="entradaBusca" />
    <div id="resultadosBusca"></div>
  </div>`;

function montar() {
  const pagina = criarPagina(MARCACAO);
  const executados = [];
  const extras = [
    { id: 'abrir', grupo: 'Peça', rotulo: 'Abrir peça do acervo', executar: () => executados.push('abrir') },
    { id: 'grade', grupo: 'Cena', rotulo: 'Grade', tecla: 'h', ligado: () => true, executar: () => executados.push('grade') },
    { id: 'tema-foco', grupo: 'Tema', rotulo: 'Foco', escolhido: () => true, executar: () => executados.push('foco') },
  ];
  const comandos = [{ id: 'visao-curvatura', grupo: 'Visão', rotulo: 'Curvatura', padrao: 'k', executar: () => executados.push('curvatura') }];
  const ouvinteDaCena = vi.fn();
  /* o teclado da bancada ouve a janela na borbulha, depois da busca */
  pagina.janela.addEventListener('keydown', ouvinteDaCena);
  const busca = montarBuscaDeComandos({
    elementos: lerElementosDaPagina(pagina.documento).buscaDeComandos,
    fontes: () => ({ extras, comandos, teclas: {}, partes: [{ nome: 'rodaFrenteEsq' }], selecionar: (nome) => executados.push(`parte:${nome}`) }),
    janela: pagina.janela,
  });
  const nomes = () => pagina.documento.querySelectorAll('.item-busca').map((item) => item.querySelector('.nome-item').textContent);
  const digitar = (texto) => {
    pagina.$('entradaBusca').value = texto;
    pagina.$('entradaBusca').dispatchEvent({ type: 'input' });
  };
  return { ...pagina, busca, executados, ouvinteDaCena, nomes, digitar };
}

describe('itens da busca', () => {
  it('normaliza sem acento e sem caixa', () => {
    expect(normalizarBusca('  Visão ')).toBe('visao');
  });

  it('com o campo vazio lista só as ações da tela; com termo, também comandos e partes', () => {
    const extras = [{ id: 'a', grupo: 'Peça', rotulo: 'Abrir', executar() {} }];
    const comandos = [{ id: 'vista-frontal', grupo: 'Câmera', rotulo: 'Frente', padrao: '1', executar() {} }];
    const partes = [{ nome: 'paraChoqueFrente' }];
    expect(itensDaBusca({ extras, comandos, partes }).map((g) => g.grupo)).toEqual(['Peça']);
    const grupos = itensDaBusca({ termo: 'frente', extras, comandos, partes, teclas: { 'vista-frontal': 'Shift+f' } });
    expect(grupos.map((g) => [g.grupo, g.itens.map((i) => [i.rotulo, i.tecla])])).toEqual([
      ['Câmera', [['Frente', 'Shift+f']]],
      ['Partes', [['Para Choque Frente', null]]],
    ]);
  });
});

describe('busca de comandos', () => {
  it('Ctrl+K abre e fecha, e a tecla não chega ao teclado da cena', () => {
    const { $, janela, ouvinteDaCena, documento } = montar();
    const evento = janela.teclar({ key: 'k', ctrlKey: true });
    expect($('buscaComandos').hidden).toBe(false);
    expect(evento.defaultPrevented).toBe(true);
    expect(ouvinteDaCena).not.toHaveBeenCalled();
    expect(documento.activeElement).toBe($('entradaBusca'));
    expect(documento.querySelector('[data-abrir-busca]').getAttribute('aria-expanded')).toBe('true');
    janela.teclar({ key: 'K', metaKey: true });
    expect($('buscaComandos').hidden).toBe(true);
  });

  it('lista os grupos das ações com o estado de cada interruptor e a tecla', () => {
    const { busca, documento, nomes } = montar();
    busca.abrir();
    expect(documento.querySelectorAll('.grupo-busca').map((h) => h.textContent)).toEqual(['Peça', 'Cena', 'Tema']);
    expect(nomes()).toEqual(['Abrir peça do acervo', 'Grade', 'Foco']);
    const grade = documento.querySelector('[data-item="grade"]');
    expect(grade.querySelector('.interruptor').getAttribute('aria-checked')).toBe('true');
    expect(grade.querySelector('kbd').textContent).toBe('H');
    expect(documento.querySelector('[data-item="tema-foco"]').querySelector('.marca-escolha').getAttribute('aria-checked')).toBe('true');
  });

  it('filtra pelo termo, anda com as setas e executa com Enter, fechando antes', () => {
    const { busca, janela, nomes, digitar, executados, $ } = montar();
    busca.abrir();
    digitar('curva');
    expect(nomes()).toEqual(['Curvatura']);
    digitar('roda');
    expect(nomes()).toEqual(['Roda Frente Esq']);
    digitar('');
    janela.teclar({ key: 'ArrowDown' });
    janela.teclar({ key: 'ArrowDown' });
    janela.teclar({ key: 'ArrowDown' });
    expect($('resultadosBusca').querySelector('[aria-selected="true"]').dataset.item).toBe('abrir');
    janela.teclar({ key: 'ArrowUp' });
    janela.teclar({ key: 'Enter' });
    expect(executados).toEqual(['foco']);
    expect($('buscaComandos').hidden).toBe(true);
  });

  it('Esc fecha sem chegar à cena, e o clique num item ou no véu também', () => {
    const { busca, janela, ouvinteDaCena, executados, $, documento } = montar();
    busca.abrir();
    janela.teclar({ key: 'Escape' });
    expect($('buscaComandos').hidden).toBe(true);
    expect(ouvinteDaCena).not.toHaveBeenCalled();
    busca.abrir();
    documento.querySelector('[data-item="grade"]').click();
    expect(executados).toEqual(['grade']);
    busca.abrir();
    documento.querySelector('.veu-busca').click();
    expect($('buscaComandos').hidden).toBe(true);
  });
});
