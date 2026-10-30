/* mesa-de-revisao.test.js — a mesa do Revisão marca o modo, nomeia a vista da peça, lista as vistas da referência, recorta o quadro escolhido e escreve a comparação pelos controles. */
import { describe, expect, it, vi } from 'vitest';
import { criarEstadoCentral, estadoInicialDaBancada } from '../estado/estado-central.js';
import { VISTAS_DA_FOLHA, VISTA_INTEIRA } from '../referencias/referencia-ao-lado.js';
import { criarPagina } from './dom-de-teste.js';
import { lerElementosDaPagina } from './elementos-da-pagina.js';
import { modoDaMesa, montarMesaDeRevisao, textoDaVistaDaPeca } from './mesa-de-revisao.js';
import { FRACAO_MINIMA_DA_CENA, larguraOcupada, paineisAoAbrir } from './paineis-do-tema.js';
import { temaPorId } from '../temas/temas.js';

const MARCACAO = `
  <section id="mesaComparacao">
    <span id="vistaDaPeca"></span><span id="edicaoDaPeca" hidden></span><button id="notasDaPeca" hidden></button>
    <button id="btnMostrarReferencia"></button>
    <button id="btnVistaReferencia" aria-expanded="false"><span id="nomeVistaReferencia"></span></button>
    <div id="menuVistasReferencia" hidden></div>
    <input id="opacidadeReferencia" /><output id="valorOpacidadeReferencia"></output>
    <button data-comparar="ao-lado"></button><button data-comparar="sobreposta"></button>
    <button id="btnMesmaCamera"></button><button id="btnEsconderReferencia"></button>
    <div id="imagemReferenciaAoLado"></div><div id="imagemReferenciaSobreposta"></div>
  </section>`;

const FOLHA = { url: '/fonte-vistas.png', rotulo: 'fonte-vistas.png', folha: true, vistas: [...VISTAS_DA_FOLHA, VISTA_INTEIRA] };

function montar() {
  const pagina = criarPagina(MARCACAO);
  const estado = criarEstadoCentral(estadoInicialDaBancada({ visao: 'solida', tema: 'revisao' }));
  const acoes = { abrirNotas: vi.fn() };
  montarMesaDeRevisao({ elementos: lerElementosDaPagina(pagina.documento).mesaDeRevisao, estado, acoes, documento: pagina.documento });
  return { ...pagina, estado, acoes };
}

describe('mesa do Revisão', () => {
  it('o Revisão dá lugar à mesa e nasce com a árvore aberta, que deixa a cena com mais de 70% em 1400 e em 1100 pixels', () => {
    const revisao = temaPorId('revisao');
    expect(revisao.lugares['mesa-comparacao']).toBe('mesa');
    expect(temaPorId('foco').lugares['mesa-comparacao']).toBeUndefined();
    const abertos = { partes: revisao.paineis.partes.abertoAoNascer, inspecao: revisao.paineis.inspecao.abertoAoNascer };
    expect(abertos).toEqual({ partes: true, inspecao: false });
    for (const largura of [1400, 1100]) {
      expect(largura - larguraOcupada(abertos, revisao.paineis)).toBeGreaterThanOrEqual(FRACAO_MINIMA_DA_CENA * largura);
      /* Abrir os detalhes recolhe a árvore: as duas juntas passariam dos 30%. */
      expect(paineisAoAbrir({ abertos, abrir: 'inspecao', paineis: revisao.paineis, larguraDaJanela: largura })).toEqual({ partes: false, inspecao: true });
    }
  });

  it('o modo é o escolhido, ou sem referência quando a peça não tem imagem', () => {
    expect(modoDaMesa({ comparacao: { modo: 'sobreposta' }, imagemDaReferencia: FOLHA })).toBe('sobreposta');
    expect(modoDaMesa({ comparacao: { modo: 'sobreposta' }, imagemDaReferencia: null })).toBe('sem-referencia');
  });

  it('o cabeçalho da peça diz a vista dela, e a da referência quando a câmera está na dela', () => {
    expect(textoDaVistaDaPeca({ vista: 'direita', projecao: 'ortografica' })).toBe('Direita · ortográfica');
    expect(textoDaVistaDaPeca({ vista: 'livre', projecao: 'perspectiva' })).toBe('Câmera livre · perspectiva');
    expect(textoDaVistaDaPeca({
      vista: 'direita', projecao: 'ortografica', comparacao: { alinhada: true, vista: 'direita' }, imagemDaReferencia: FOLHA,
    })).toBe('Lateral direita da referência · ortográfica');
  });

  it('sem imagem a mesa diz que não há referência e a mesma câmera fica desligada', () => {
    const { $ } = montar();
    expect($('mesaComparacao').dataset.comparacao).toBe('sem-referencia');
    expect($('btnMesmaCamera').disabled).toBe(true);
    expect($('btnVistaReferencia').disabled).toBe(true);
  });

  it('com a folha lista as vistas, recorta o quadro escolhido e escreve a comparação pelos controles', () => {
    const { $, documento, estado, acoes } = montar();
    estado.definir({ imagemDaReferencia: FOLHA, comparacao: { ...estado.obter('comparacao'), vista: 'direita' } });
    expect($('mesaComparacao').dataset.comparacao).toBe('ao-lado');
    expect($('nomeVistaReferencia').textContent).toBe('Lateral direita');
    expect($('imagemReferenciaAoLado').style.backgroundImage).toBe('url("/fonte-vistas.png")');
    expect($('imagemReferenciaAoLado').style.backgroundSize).toBe('200% 200%');
    expect($('imagemReferenciaAoLado').style.backgroundPosition).toBe('100% 0%');
    expect($('btnMesmaCamera').getAttribute('aria-pressed')).toBe('true');

    $('btnVistaReferencia').click();
    expect($('menuVistasReferencia').hidden).toBe(false);
    const itens = documento.querySelectorAll('[data-vista-referencia]');
    expect(itens.map((item) => item.textContent)).toEqual(['Isométrica', 'Lateral direita', 'Frontal', 'De cima', 'Imagem inteira']);
    itens[3].click();
    expect(estado.obter('comparacao').vista).toBe('superior');
    expect($('menuVistasReferencia').hidden).toBe(true);
    expect($('imagemReferenciaAoLado').style.backgroundPosition).toBe('100% 100%');

    documento.querySelector('[data-comparar="sobreposta"]').click();
    expect($('mesaComparacao').dataset.comparacao).toBe('sobreposta');
    $('opacidadeReferencia').value = '35';
    $('opacidadeReferencia').dispatchEvent({ type: 'input' });
    expect(estado.obter('comparacao').opacidade).toBe(0.35);
    expect($('imagemReferenciaSobreposta').style.opacity).toBe('0.35');
    expect($('valorOpacidadeReferencia').textContent).toBe('35%');

    $('btnMesmaCamera').click();
    expect(estado.obter('comparacao').mesmaCamera).toBe(false);
    $('btnEsconderReferencia').click();
    expect($('mesaComparacao').dataset.comparacao).toBe('escondida');
    $('btnMostrarReferencia').click();
    expect($('mesaComparacao').dataset.comparacao).toBe('ao-lado');

    estado.definir({ comparacao: { ...estado.obter('comparacao'), vista: 'inteira', mesmaCamera: true } });
    expect($('imagemReferenciaAoLado').style.backgroundSize).toBe('100% 100%');
    expect($('btnMesmaCamera').disabled).toBe(true);

    estado.definir({ anotacoes: [{ id: 1 }, { id: 2 }], juntas: { ...estado.obter('juntas'), modo: true } });
    expect($('notasDaPeca').textContent).toBe('2 notas');
    expect($('edicaoDaPeca').hidden).toBe(false);
    $('notasDaPeca').click();
    expect(acoes.abrirNotas).toHaveBeenCalled();
  });

  it('fora do Revisão o quadro fica sem imagem', () => {
    const { $, estado } = montar();
    estado.definir({ imagemDaReferencia: FOLHA, comparacao: { ...estado.obter('comparacao'), vista: 'isometrica' }, tema: 'foco' });
    expect($('imagemReferenciaAoLado').style.backgroundImage).toBe('');
  });
});
