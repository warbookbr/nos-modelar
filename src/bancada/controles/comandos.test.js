/* comandos.test.js — a tabela dos comandos tem uma tecla por comando, uma linha por visão, e os comandos de seleção não agem sem seleção nem contra o raio X. */
import { describe, expect, it, vi } from 'vitest';
import { VISOES } from '../visoes/registro-de-visoes.js';
import { criarComandos } from './comandos.js';

function montar({ selecionadas = ['cabine'], visao = 'solida' } = {}) {
  const controlador = {
    selecionadas,
    estado: () => ({ wireframeSelecao: false }),
    definirModo: vi.fn(),
    definirWireframeSelecao: vi.fn(),
  };
  const acoes = {
    definirVista: vi.fn(), alternarProjecao: vi.fn(), enquadrar: vi.fn(), alternarPreferenciaCena: vi.fn(), escolherVisao: vi.fn(),
  };
  const comandos = criarComandos({ ...acoes, controlador: () => controlador, visaoAtual: () => visao });
  const executar = (id) => comandos.find((c) => c.id === id).executar();
  return { comandos, controlador, acoes, executar };
}

describe('tabela dos comandos', () => {
  it('cada comando tem id e tecla de fábrica únicos, e cada visão do registro tem a sua linha', () => {
    const { comandos } = montar();
    expect(new Set(comandos.map((c) => c.id)).size).toBe(comandos.length);
    expect(new Set(comandos.map((c) => c.padrao)).size).toBe(comandos.length);
    expect(comandos.filter((c) => c.grupo === 'Visão').map((c) => c.padrao)).toEqual(VISOES.map((v) => v.atalho));
    expect(comandos.map((c) => c.grupo).filter((g, i, todos) => todos.indexOf(g) === i)).toEqual(['Câmera', 'Vista', 'Seleção', 'Visão']);
  });

  it('as teclas chamam as mesmas ações dos botões', () => {
    const { acoes, executar } = montar();
    executar('vista-traseira');
    executar('projecao');
    executar('alternar-grade');
    executar('visao-arame');
    expect(acoes.definirVista).toHaveBeenCalledWith('traseira');
    expect(acoes.alternarProjecao).toHaveBeenCalledTimes(1);
    expect(acoes.alternarPreferenciaCena).toHaveBeenCalledWith('grade');
    expect(acoes.escolherVisao).toHaveBeenCalledWith('arame');
  });

  it('isolar e Wireframe exigem seleção, e o Wireframe não age com a peça em raio X', () => {
    const semSelecao = montar({ selecionadas: [] });
    semSelecao.executar('isolar');
    expect(semSelecao.controlador.definirModo).not.toHaveBeenCalled();
    const emRaioX = montar({ visao: 'raio-x' });
    emRaioX.executar('wireframe-selecao');
    expect(emRaioX.controlador.definirWireframeSelecao).not.toHaveBeenCalled();
    const comum = montar();
    comum.executar('wireframe-selecao');
    expect(comum.controlador.definirWireframeSelecao).toHaveBeenCalledWith(true);
  });
});
