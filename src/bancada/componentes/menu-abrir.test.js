/* menu-abrir.test.js — a janela Abrir busca por nome, separa por categoria e por situação, e os três filtros se combinam. */
import { describe, expect, it, vi } from 'vitest';
import { criarEvento, criarPagina } from './dom-de-teste.js';
import { montarMenuAbrir, normalizarBusca } from './menu-abrir.js';
import { listarParaBancada } from '../acervo-receitas.js';

const ENTRADAS = [
  { id: 'Ação-de-Mesa', categoria: 'moveis', situacao: 'trabalho' },
  { id: 'carro-suv', categoria: 'veiculos', situacao: 'trabalho' },
  { id: 'carro-taxi', categoria: 'veiculos', situacao: 'trabalho' },
  { id: 'aviao', categoria: 'outros', situacao: 'trabalho', montagem: true, emDados: true },
  { id: 'objeto/base', parteDe: 'aviao', categoria: 'outros', situacao: 'trabalho' },
  { id: 'carro-de-prova', categoria: 'veiculos', situacao: 'ensaio', ensaio: true },
  { id: 'peca-de-prova', categoria: 'outros', situacao: 'ensaio', ensaio: true },
];

function montar(entradas = ENTRADAS) {
  const pagina = criarPagina('<div id="menuAbrir" role="dialog" hidden><div id="corpo"><p>texto</p><div id="listaAcervo"></div></div></div>');
  const aoEscolher = vi.fn();
  const menu = montarMenuAbrir({ listaAcervo: pagina.$('listaAcervo'), entradas, aoEscolher });
  const lista = pagina.$('listaAcervo');
  const api = {
    ...pagina,
    menu,
    aoEscolher,
    ids: () => lista.querySelectorAll('[data-receita]').map((l) => l.dataset.receita),
    busca: pagina.$('buscaAcervo'),
    digitar(texto) {
      api.busca.value = texto;
      api.busca.dispatchEvent(criarEvento('input'));
    },
    categoria: (id) => pagina.documento.querySelector(`[data-categoria="${id}"]`),
    situacao: (id) => pagina.documento.querySelector(`[data-situacao="${id}"]`),
    limpar: () => pagina.documento.querySelectorAll('button').find((b) => b.textContent === 'Limpar'),
    texto: (el) => el.textContent,
  };
  return api;
}

describe('normalizarBusca', () => {
  it('tira acento e maiúscula', () => {
    expect(normalizarBusca('  Ação-de-MESA ')).toBe('acao-de-mesa');
  });
});

describe('janela Abrir: busca', () => {
  it('abre com a lista de trabalho, sem as de ensaio, e a parte de objeto fica fora', () => {
    const { ids } = montar();
    expect(ids()).toEqual(['Ação-de-Mesa', 'carro-suv', 'carro-taxi', 'aviao']);
  });

  it('o campo de busca fica acima da lista e filtra a cada tecla, sem diferença de maiúscula e de acento', () => {
    const { ids, digitar, $, busca } = montar();
    const corpo = $('corpo');
    expect(corpo.children.map((c) => c.className || c.tagName)).toEqual(['P', 'abrir-filtros', 'DIV']);
    expect(busca.type).toBe('search');
    digitar('CARRO');
    expect(ids()).toEqual(['carro-suv', 'carro-taxi']);
    digitar('acao');
    expect(ids()).toEqual(['Ação-de-Mesa']);
    digitar('açã');
    expect(ids()).toEqual(['Ação-de-Mesa']);
    digitar('taxi');
    expect(ids()).toEqual(['carro-taxi']);
  });

  it('sem resultado a lista diz isso, e clicar numa linha entrega a entrada', () => {
    const { ids, digitar, $, aoEscolher } = montar();
    digitar('zzz');
    expect(ids()).toEqual([]);
    expect($('listaAcervo').querySelector('[data-sem-resultado]')).not.toBeNull();
    digitar('suv');
    $('listaAcervo').querySelector('[data-receita]').click();
    expect(aoEscolher).toHaveBeenCalledWith(ENTRADAS[1]);
  });
});

describe('janela Abrir: categorias e situação', () => {
  it('cada categoria traz a contagem do que a busca e a situação deixam', () => {
    const { categoria, digitar, texto, situacao } = montar();
    expect(texto(categoria('todas'))).toBe('Todas (4)');
    expect(texto(categoria('veiculos'))).toBe('Veículos (2)');
    expect(texto(categoria('moveis'))).toBe('Móveis e eletrodomésticos (1)');
    expect(texto(categoria('outros'))).toBe('Outros (1)');
    digitar('suv');
    expect(texto(categoria('todas'))).toBe('Todas (1)');
    expect(texto(categoria('veiculos'))).toBe('Veículos (1)');
    expect(texto(categoria('moveis'))).toBe('Móveis e eletrodomésticos (0)');
    digitar('');
    situacao('ensaio').click();
    expect(texto(categoria('veiculos'))).toBe('Veículos (3)');
  });

  it('escolher a categoria filtra, e escolher de novo a desfaz', () => {
    const { ids, categoria } = montar();
    categoria('veiculos').click();
    expect(ids()).toEqual(['carro-suv', 'carro-taxi']);
    expect(categoria('veiculos').getAttribute('aria-pressed')).toBe('true');
    categoria('veiculos').click();
    expect(ids()).toHaveLength(4);
    expect(categoria('todas').getAttribute('aria-pressed')).toBe('true');
  });

  it('as de ensaio ficam escondidas até pedir, e voltam com a marca', () => {
    const { ids, situacao, $ } = montar();
    expect(situacao('trabalho').getAttribute('aria-pressed')).toBe('true');
    expect(situacao('ensaio').getAttribute('aria-pressed')).toBe('false');
    expect(situacao('ensaio').textContent).toBe('De ensaio (2)');
    situacao('ensaio').click();
    expect(ids()).toContain('peca-de-prova');
    const marca = $('listaAcervo').querySelector('[data-receita="peca-de-prova"]').querySelector('.marca-ensaio');
    expect(marca.textContent).toBe('ensaio');
    expect($('listaAcervo').querySelector('[data-receita="carro-suv"]').querySelector('.marca-ensaio')).toBeNull();
    situacao('trabalho').click();
    expect(ids()).toEqual(['carro-de-prova', 'peca-de-prova']);
  });

  it('busca, categoria e situação se combinam, e limpar volta à lista de abertura', () => {
    const { ids, digitar, categoria, situacao, limpar, busca } = montar();
    situacao('ensaio').click();
    categoria('veiculos').click();
    digitar('carro');
    expect(ids()).toEqual(['carro-suv', 'carro-taxi', 'carro-de-prova']);
    digitar('prova');
    expect(ids()).toEqual(['carro-de-prova']);
    limpar().click();
    expect(busca.value).toBe('');
    expect(ids()).toEqual(['Ação-de-Mesa', 'carro-suv', 'carro-taxi', 'aviao']);
    expect(categoria('todas').getAttribute('aria-pressed')).toBe('true');
    expect(situacao('ensaio').getAttribute('aria-pressed')).toBe('false');
  });

  it('entrada sem categoria e sem como classificar conta como outros', () => {
    const { categoria, texto } = montar([{ id: 'solta', montagem: false }]);
    expect(texto(categoria('outros'))).toBe('Outros (1)');
  });
});

describe('janela Abrir: categorias que se completam', () => {
  it('a lista aparece inteira antes de classificar, e as categorias se completam quando a classificação termina', async () => {
    const classificadas = [
      ['carro', 'veiculos'], ['cadeira', 'moveis'], ['copo', 'outros'],
    ].map(([id, destino]) => {
      const e = { id, categoria: null, situacao: 'trabalho' };
      e.classificar = vi.fn(async () => { e.categoria = destino; return destino; });
      return e;
    });
    const { ids, menu, categoria, texto, $ } = montar(classificadas);
    expect(ids()).toEqual(['carro', 'cadeira', 'copo']);
    expect(texto(categoria('veiculos'))).toBe('Veículos (0)');
    const pronta = menu.classificar();
    expect($('listaAcervo').parentNode.textContent).toContain('classificando');
    await pronta;
    expect(classificadas.every((e) => e.classificar.mock.calls.length === 1)).toBe(true);
    expect(texto(categoria('veiculos'))).toBe('Veículos (1)');
    expect(texto(categoria('moveis'))).toBe('Móveis e eletrodomésticos (1)');
    categoria('moveis').click();
    expect(ids()).toEqual(['cadeira']);
    await menu.classificar();
    expect(classificadas[0].classificar).toHaveBeenCalledTimes(1);
  });
});

describe('janela Abrir sobre o acervo real', () => {
  it('abre com o acervo de trabalho inteiro, e as de ensaio entram ao serem pedidas, com a marca', () => {
    const lista = listarParaBancada().filter((e) => !e.parteDe);
    const { ids, situacao, $ } = montar(lista);
    const trabalho = lista.filter((e) => e.situacao === 'trabalho').length;
    const ensaios = lista.filter((e) => e.situacao === 'ensaio').length;
    expect(ensaios).toBeGreaterThan(0);
    expect(ids()).toHaveLength(trabalho);
    situacao('ensaio').click();
    expect(ids()).toHaveLength(trabalho + ensaios);
    expect($('listaAcervo').querySelectorAll('.marca-ensaio')).toHaveLength(ensaios);
  });
});
