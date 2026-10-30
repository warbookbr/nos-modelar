/* referencia-metrica.test.js — a régua escolhe o comprimento redondo mais perto de 88 pixels e só começa a medir no fim da subida. */
import { describe, expect, it } from 'vitest';
import { criarEstadoCentral, estadoInicialDaBancada } from '../estado/estado-central.js';
import { criarPagina } from './dom-de-teste.js';
import { lerElementosDaPagina } from './elementos-da-pagina.js';
import { medirRegua, montarReferenciaMetrica } from './referencia-metrica.js';

describe('referência métrica', () => {
  it('escolhe o comprimento cujo traço fica mais perto de 88 pixels e limita a largura', () => {
    expect(medirRegua({ pixelsPorMetro: 162, aproximada: true })).toEqual({ largura: '81px', texto: '≈ 50 cm · 162 px/m' });
    expect(medirRegua({ pixelsPorMetro: 90, aproximada: false })).toEqual({ largura: '90px', texto: '1 m · 90 px/m' });
    expect(medirRegua({ pixelsPorMetro: 20000, aproximada: false }).largura).toBe('128px');
  });

  it('mede a cada quadro depois da subida, e parar cancela o quadro pendente', () => {
    const { documento, janela, $ } = criarPagina(
      '<span id="eixosReferencia"></span><i id="barraReferencia"></i><output id="valorReferencia"></output>',
    );
    const estado = criarEstadoCentral(estadoInicialDaBancada({ visao: 'solida' }));
    let pixelsPorMetro = 162;
    const regua = montarReferenciaMetrica({
      elementos: lerElementosDaPagina(documento).referenciaMetrica,
      estado,
      referenciaMetrica: () => ({ pixelsPorMetro, aproximada: false, eixos: 'X / Y / Z EM PERSPECTIVA' }),
      janela,
    });
    expect(janela.quadrosPendentes()).toBe(0);
    estado.definir({ inicializando: false });
    expect($('valorReferencia').textContent).toBe('50 cm · 162 px/m');
    expect($('eixosReferencia').textContent).toBe('X / Y / Z EM PERSPECTIVA');
    pixelsPorMetro = 880;
    janela.avancarQuadro();
    expect([$('valorReferencia').textContent, $('barraReferencia').style.width]).toEqual(['10 cm · 880 px/m', '88px']);
    regua.parar();
    expect(janela.quadrosPendentes()).toBe(0);
  });
});
