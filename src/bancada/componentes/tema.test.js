/* tema.test.js — o tema escreve os atributos da raiz, leva os componentes para os lugares dele e os devolve para casa, troca os rótulos, guarda a escolha e entrega a cena com as cores das variáveis. */
import { describe, expect, it, vi } from 'vitest';
import { criarEstadoCentral, estadoInicialDaBancada } from '../estado/estado-central.js';
import { CAMPOS_DO_TEMA, TEMAS, TEMA_PADRAO, temaPorId } from '../temas/temas.js';
import { criarPagina } from './dom-de-teste.js';
import { lerElementosDaPagina } from './elementos-da-pagina.js';
import { casoDaTela, montarTema } from './tema.js';

const MARCACAO = `
  <header class="topo"><div data-lugar="topo-peca"></div><div data-lugar="barra-cena"></div></header>
  <nav class="vistas">
    <button data-vista="frontal">Frente</button>
    <button id="btnProjecao" data-movel="projecao"><span>Perspectiva</span></button>
    <button id="btnEnquadrar" data-movel="enquadrar"><span>Enquadrar</span></button>
  </nav>
  <aside class="painel">
    <button id="btnJuntas" data-movel="juntas"><span data-rotulo="juntas">Juntas</span></button>
    <button class="aba-btn"><span id="abaInspecao" data-rotulo="aba-inspecao">Inspeção</span></button>
  </aside>`;

function montar(temaInicial = 'bancada') {
  const pagina = criarPagina(MARCACAO);
  const estado = criarEstadoCentral(estadoInicialDaBancada({ visao: 'solida', tema: temaInicial }));
  const guardado = [];
  const preferencia = { salvar: vi.fn((id) => { guardado.push(id); return id; }) };
  const aoMudarCena = vi.fn();
  const variaveis = { '--cena': '#f2f4f3', '--cena-2': '#e6eae8', '--destaque': '#c2531b', '--linha-forte': '#c3c9c6' };
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
  it('só a Bancada existe, é o padrão, e um id gravado de antes (foco, revisao) cai nela', () => {
    for (const tema of TEMAS) expect(Object.keys(tema).sort()).toEqual([...CAMPOS_DO_TEMA].sort());
    expect(TEMAS.map((tema) => [tema.id, tema.cores])).toEqual([['bancada', 'escuro']]);
    expect(TEMA_PADRAO).toBe('bancada');
    for (const antigo of ['nenhum', 'foco', 'revisao']) expect(temaPorId(antigo).id).toBe('bancada');
  });
});

describe('componente do tema', () => {
  it('a Bancada tem arrumação própria, leva as juntas para o alto como Editar e pede a cena em degradê', () => {
    const { documento, $, aoMudarCena } = montar('bancada');
    const raiz = documento.documentElement;
    expect([raiz.dataset.tema, raiz.dataset.cores, raiz.dataset.arrumacao]).toEqual(['bancada', 'escuro', 'bancada']);
    expect($('btnJuntas').textContent).toBe('Editar');
    const [cena] = aoMudarCena.mock.calls.at(-1);
    expect(cena).toEqual({
      fundo: '#f2f4f3', degrade: '#e6eae8', grade: '#c3c9c6', gradeEsmaecida: true, sombraSuave: true, contornoDaSelecao: '#c2531b',
    });
  });

  it('na Bancada a primeira aba do painel da direita se chama Peça, Parte ou Edição conforme o caso', () => {
    const { $, estado } = montar('bancada');
    expect($('abaInspecao').textContent).toBe('Peça');
    estado.definir({ selecao: { selecionadas: ['farolDir'] } });
    expect($('abaInspecao').textContent).toBe('Parte');
    estado.definir({ juntas: { ...estado.obter('juntas'), modo: true } });
    expect($('abaInspecao').textContent).toBe('Edição');
    estado.definir({ juntas: { ...estado.obter('juntas'), modo: false }, malhaEmEdicao: true });
    expect($('abaInspecao').textContent).toBe('Edição');
    estado.definir({ malhaEmEdicao: false, selecao: { selecionadas: [] } });
    expect($('abaInspecao').textContent).toBe('Peça');
  });

  it('o caso da tela é a edição com um modo ligado, a parte com algo escolhido e a peça sem nada', () => {
    const juntas = { modo: false };
    expect(casoDaTela({ selecao: null, juntas, malhaEmEdicao: false })).toBe('peca');
    expect(casoDaTela({ selecao: { selecionadas: ['a'] }, juntas, malhaEmEdicao: false })).toBe('parte');
    expect(casoDaTela({ selecao: { selecionadas: ['a'] }, juntas: { modo: true }, malhaEmEdicao: false })).toBe('edicao');
    expect(casoDaTela({ selecao: null, juntas, malhaEmEdicao: true })).toBe('edicao');
  });
});
