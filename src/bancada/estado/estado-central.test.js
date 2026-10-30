/* estado-central.test.js — o estado da bancada avisa quem assina a chave que mudou, só quando muda, e recusa chave que não existe. */
import { describe, expect, it } from 'vitest';
import { criarEstadoCentral, estadoInicialDaBancada } from './estado-central.js';

describe('estado central da bancada', () => {
  it('avisa só quem assina uma chave mudada, com a lista das chaves mudadas', () => {
    const estado = criarEstadoCentral({ vista: 'isometrica', sessao: 'desconectado' });
    const daVista = [];
    const deTudo = [];
    estado.assinar(['vista'], (valores, mudadas) => daVista.push([valores.vista, mudadas]));
    estado.assinar(null, (_valores, mudadas) => deTudo.push(mudadas));

    estado.definir({ sessao: 'conectado' });
    estado.definir({ vista: 'direita' });

    expect(daVista).toEqual([['direita', ['vista']]]);
    expect(deTudo).toEqual([['sessao'], ['vista']]);
  });

  it('não avisa quando o valor escrito é o mesmo, e avisa para todo objeto novo', () => {
    const estado = criarEstadoCentral({ sessao: 'desconectado', selecao: null });
    let avisos = 0;
    estado.assinar(['sessao', 'selecao'], () => { avisos += 1; });
    expect(estado.definir({ sessao: 'desconectado' })).toEqual([]);
    const selecao = { selecionadas: [] };
    estado.definir({ selecao });
    estado.definir({ selecao });
    estado.definir({ selecao: { selecionadas: [] } });
    expect(avisos).toBe(2);
  });

  it('avisa na ordem das assinaturas, e cancelar tira a assinatura', () => {
    const estado = criarEstadoCentral({ vista: 'isometrica' });
    const ordem = [];
    const cancelar = estado.assinar(['vista'], () => ordem.push('primeira'));
    estado.assinar(['vista'], () => ordem.push('segunda'));
    estado.definir({ vista: 'frontal' });
    cancelar();
    estado.definir({ vista: 'traseira' });
    expect(ordem).toEqual(['primeira', 'segunda', 'segunda']);
  });

  it('recusa escrever ou assinar uma chave que o estado não tem', () => {
    const estado = criarEstadoCentral({ vista: 'isometrica' });
    expect(() => estado.definir({ vsita: 'frontal' })).toThrow(/vsita/);
    expect(() => estado.assinar(['vsita'], () => {})).toThrow(/vsita/);
    expect(estado.obter('vista')).toBe('isometrica');
  });

  it('nasce com a peça pedida na URL, a visão do seletor e a subida em curso', () => {
    expect(estadoInicialDaBancada({ pecaPedida: 'furgao', visao: 'arame' })).toMatchObject({
      inicializando: true, nomePeca: 'furgao', idNaUrl: 'furgao', visao: 'arame', selecao: null, temHierarquia: null,
    });
    expect(estadoInicialDaBancada({ visao: 'solida' })).toMatchObject({ nomePeca: 'sessao-ativa', idNaUrl: null });
  });
});
