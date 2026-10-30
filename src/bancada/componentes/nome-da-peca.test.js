/* nome-da-peca.test.js — o grupo do alto escreve o nome da peça e o estado da sessão com o mesmo texto da janela Estado. */
import { describe, expect, it } from 'vitest';
import { criarEstadoCentral, estadoInicialDaBancada } from '../estado/estado-central.js';
import { criarPagina } from './dom-de-teste.js';
import { lerElementosDaPagina } from './elementos-da-pagina.js';
import { montarNomeDaPeca } from './nome-da-peca.js';

describe('nome da peça', () => {
  it('escreve a espera, depois o nome, e o estado da sessão', () => {
    const pagina = criarPagina('<b id="nomePecaFoco">…</b><span id="estadoSessaoFoco"><i></i><span>Sessão local</span></span>');
    const estado = criarEstadoCentral(estadoInicialDaBancada({ visao: 'solida' }));
    montarNomeDaPeca({ elementos: lerElementosDaPagina(pagina.documento).nomeDaPeca, estado });
    estado.definir({ aguardandoModelo: true });
    expect(pagina.$('nomePecaFoco').textContent).toBe('Aguardando modelo…');
    estado.definir({ rotuloPeca: 'Furgão', sessao: 'erro' });
    expect(pagina.$('nomePecaFoco').textContent).toBe('Furgão');
    expect(pagina.$('estadoSessaoFoco').dataset.sessao).toBe('erro');
    expect(pagina.$('estadoSessaoFoco').querySelector('span').textContent).toBe('Erro de sincronia');
  });
});
