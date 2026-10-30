/* barra-superior.test.js — as janelas Abrir, Controles e Estado abrem uma de cada vez e fecham por Esc, o acervo e os atalhos se desenham, a captura de tecla recusa colisão e o aviso aparece só com problema. */
import { describe, expect, it, vi } from 'vitest';
import { criarEstadoCentral, estadoInicialDaBancada } from '../estado/estado-central.js';
import { criarRegistroAtalhos } from '../controles/atalhos.js';
import { criarRegistroDeEventos } from '../sessao/registro-de-eventos.js';
import { criarPagina } from './dom-de-teste.js';
import { lerElementosDaPagina } from './elementos-da-pagina.js';
import { montarBarraSuperior, problemasDoEstado } from './barra-superior.js';
import { agruparComandos } from './menu-controles.js';
import { linhasDoResumo } from './menu-estado.js';

const janelaModal = (id, corpo) => `
  <div id="${id}" hidden>
    <div class="modal-backdrop" data-fechar-modal></div>
    <button class="btn-fechar-modal" data-fechar-modal>✕</button>
    ${corpo}
  </div>`;

const MARCACAO = `
  <button id="btnMenuAbrir" aria-expanded="false">Abrir</button>
  <button id="btnMenuAtalhos" aria-expanded="false">Controles</button>
  <button id="btnMenuEstado" aria-expanded="false">Estado<span id="selo-estado" hidden></span></button>
  <button id="avisoEstado" hidden></button>
  ${janelaModal('menuAbrir', '<div id="listaAcervo"></div>')}
  ${janelaModal('menuAtalhos', '<div id="listaAtalhos"></div><span id="avisoAtalho"></span><button id="btnRestaurarAtalhos"></button>')}
  ${janelaModal('menuEstado', '<div id="resumoEstado"></div><div id="listaEventos"></div><button id="btnLimparEventos"></button>')}`;

const COMANDOS = [
  { id: 'vista-frontal', rotulo: 'Frente', grupo: 'Câmera', padrao: '1' },
  { id: 'vista-traseira', rotulo: 'Trás', grupo: 'Câmera', padrao: 'Shift+1' },
  { id: 'enquadrar', rotulo: 'Enquadrar tudo', grupo: 'Vista', padrao: 'f' },
];

function memoria() {
  const dados = new Map();
  return { getItem: (chave) => dados.get(chave) ?? null, setItem: (chave, valor) => dados.set(chave, valor) };
}

function montar() {
  const pagina = criarPagina(MARCACAO);
  const estado = criarEstadoCentral(estadoInicialDaBancada({ visao: 'solida' }));
  const registroDeEventos = criarRegistroDeEventos({ agora: () => new Date('2026-10-30T12:00:00Z') });
  const registroAtalhos = criarRegistroAtalhos({
    padrao: Object.fromEntries(COMANDOS.map((c) => [c.id, c.padrao])), armazenamento: memoria(),
  });
  const abrirDoAcervo = vi.fn();
  const elementos = lerElementosDaPagina(pagina.documento);
  montarBarraSuperior({
    elementos: elementos.barraSuperior,
    corpo: pagina.documento.body,
    estado,
    registroDeEventos,
    registroAtalhos,
    comandos: COMANDOS,
    entradasDoAcervo: [{ id: 'furgao', montagem: false }, { id: 'peca-de-prova', ensaio: true }],
    abrirDoAcervo,
    janela: pagina.janela,
  });
  return { ...pagina, estado, registroDeEventos, registroAtalhos, abrirDoAcervo };
}

describe('barra superior', () => {
  it('abre uma janela de cada vez, marca o corpo e fecha por Esc e pelo fundo', () => {
    const { $, documento, janela } = montar();
    $('btnMenuAbrir').click();
    expect([$('menuAbrir').hidden, $('btnMenuAbrir').getAttribute('aria-expanded')]).toEqual([false, 'true']);
    expect(documento.body.classList.contains('modal-aberto')).toBe(true);
    $('btnMenuAtalhos').click();
    expect([$('menuAbrir').hidden, $('menuAtalhos').hidden]).toEqual([true, false]);
    janela.teclar({ key: 'Escape' });
    expect($('menuAtalhos').hidden).toBe(true);
    expect(documento.body.classList.contains('modal-aberto')).toBe(false);
    $('btnMenuAbrir').click();
    $('menuAbrir').querySelector('.modal-backdrop').click();
    expect($('menuAbrir').hidden).toBe(true);
  });

  it('o acervo lista as receitas, marca as de ensaio e escolher fecha a janela e abre a peça', () => {
    const { $, abrirDoAcervo } = montar();
    const linhas = $('listaAcervo').querySelectorAll('[data-receita]');
    expect(linhas.map((l) => l.dataset.receita)).toEqual(['furgao', 'peca-de-prova']);
    expect(linhas[1].querySelector('.marca-ensaio').textContent).toBe('ensaio');
    $('btnMenuAbrir').click();
    linhas[0].click();
    expect($('menuAbrir').hidden).toBe(true);
    expect(abrirDoAcervo).toHaveBeenCalledWith({ id: 'furgao', montagem: false });
  });

  it('os atalhos saem agrupados, vão para o estado e a troca de tecla recusa a ocupada', () => {
    const { $, janela, estado } = montar();
    expect(agruparComandos(COMANDOS).map(({ nome, itens }) => [nome, itens.length])).toEqual([['Câmera', 2], ['Vista', 1]]);
    expect($('listaAtalhos').querySelectorAll('h4').map((h) => h.textContent)).toEqual(['Câmera', 'Vista']);
    expect(estado.obter('atalhos')).toEqual({ 'vista-frontal': '1', 'vista-traseira': 'Shift+1', enquadrar: 'f' });

    $('listaAtalhos').querySelector('[data-comando="enquadrar"]').click();
    janela.teclar({ key: '1' });
    expect($('avisoAtalho').textContent).toBe('1 já é de "Frente". Escolha outra tecla.');
    janela.teclar({ key: 'q' });
    expect(estado.obter('atalhos').enquadrar).toBe('q');
    expect($('listaAtalhos').querySelector('[data-comando="enquadrar"]').querySelector('kbd').textContent).toBe('q');
    $('btnRestaurarAtalhos').click();
    expect(estado.obter('atalhos').enquadrar).toBe('f');
  });

  it('enquanto captura uma tecla o Esc cancela a captura e não fecha a janela', () => {
    const { $, janela } = montar();
    $('btnMenuAtalhos').click();
    $('listaAtalhos').querySelector('[data-comando="enquadrar"]').click();
    janela.teclar({ key: 'Escape' });
    expect($('menuAtalhos').hidden).toBe(false);
    expect($('avisoAtalho').textContent).toBe('Captura cancelada.');
  });

  it('o aviso de estado e o selo aparecem só com problema, e o aviso abre a janela de Estado desenhada', () => {
    const { $, estado, registroDeEventos } = montar();
    expect(problemasDoEstado({ sessao: 'conectado', faceSemIdentidade: 0 })).toEqual([]);
    estado.definir({ sessao: 'erro', faceSemIdentidade: 2 });
    expect($('avisoEstado').hidden).toBe(false);
    expect($('avisoEstado').textContent).toBe('Erro de sincronia com a sessão · 2 faces sem identidade');
    expect($('selo-estado').hidden).toBe(false);

    registroDeEventos.registrar('informacao', 'Peça carregada', 'Furgao');
    estado.definir({ rotuloPeca: 'Furgao', idNaUrl: 'furgao' });
    $('avisoEstado').click();
    expect($('menuEstado').hidden).toBe(false);
    const linhas = $('resumoEstado').querySelectorAll('.linha').map((l) => l.querySelector('kbd').textContent);
    expect(linhas.slice(1)).toEqual(['Furgao', 'acervo: furgao', 'Erro de sincronia', '2 faces sem identidade']);
    expect($('listaEventos').querySelector('span').textContent).toBe('Peça carregada — Furgao');
    $('btnLimparEventos').click();
    expect($('listaEventos').querySelector('p').textContent).toBe('Nada aconteceu desde que a página abriu.');
  });

  it('o resumo do Estado diz a origem da sessão quando a peça não veio do acervo', () => {
    expect(linhasDoResumo({ rotuloPeca: null, origem: null, idNaUrl: null, sessao: 'desconectado', faceSemIdentidade: 0 }, 'v1'))
      .toEqual([['Versão', 'v1'], ['Peça', 'nenhuma carregada'], ['Origem', 'sessão ativa'], ['Sessão', 'Sessão local'],
        ['Semântica', 'nenhuma face sem identidade']]);
  });
});
