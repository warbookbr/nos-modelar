/* vista-da-cena.test.js — a projeção alterna e vai para a URL, as preferências da cena vão para o ambiente e para o estado, a visão indisponível responde com a dica e a subida termina com a câmera da URL. */
import { describe, expect, it, vi } from 'vitest';
import { criarEstadoCentral, estadoInicialDaBancada } from '../estado/estado-central.js';
import { criarVistaDaCena } from './vista-da-cena.js';

function montar({ parametros = '', escolha = { ok: true } } = {}) {
  const estado = criarEstadoCentral(estadoInicialDaBancada({ visao: 'solida' }));
  const ambiente = {
    projecao: 'perspectiva',
    vista: 'isometrica',
    definirProjecao: vi.fn((projecao) => { ambiente.projecao = projecao; }),
    definirVista: vi.fn((vista) => { ambiente.vista = vista; }),
    restaurarCameraLivre: vi.fn(),
    definirPreferenciasCena: vi.fn(),
  };
  const controlador = { nomes: ['cabine'], estado: () => ({ selecionadas: [] }) };
  const cena = { controlador, salvarEstadoNaUrl: vi.fn() };
  let guardadas = { grade: true, chao: false };
  const preferenciasBancada = {
    ler: () => guardadas,
    salvar: (parcial) => { guardadas = { ...guardadas, ...parcial }; return guardadas; },
  };
  const seletorDeVisao = { escolher: vi.fn(() => escolha) };
  const avisar = vi.fn();
  const vista = criarVistaDaCena({
    ambiente, estado, cena, seletorDeVisao, preferenciasBancada, avisar, parametros: new URLSearchParams(parametros),
  });
  return { vista, estado, ambiente, cena, avisar };
}

describe('vista da cena', () => {
  it('alternar a projeção troca no ambiente, escreve o estado e salva a URL', () => {
    const { vista, estado, ambiente, cena } = montar();
    vista.alternarProjecao();
    expect(ambiente.projecao).toBe('ortografica');
    expect(estado.obter('projecao')).toBe('ortografica');
    expect(cena.salvarEstadoNaUrl).toHaveBeenCalledTimes(1);
  });

  it('a grade alterna pela preferência guardada e chega ao ambiente e ao estado', () => {
    const { vista, estado, ambiente } = montar();
    vista.alternarPreferenciaCena('grade');
    expect(ambiente.definirPreferenciasCena).toHaveBeenLastCalledWith({ grade: false, chao: false });
    expect(estado.obter('preferenciasCena')).toEqual({ grade: false, chao: false });
  });

  it('escolher uma visão que funciona fecha a lista; a que não funciona mostra a dica', () => {
    const funciona = montar();
    funciona.estado.definir({ menuVisoesAberto: true });
    expect(funciona.vista.escolherVisao('arame')).toBe(true);
    expect(funciona.estado.obter('menuVisoesAberto')).toBe(false);
    const naoFunciona = montar({ escolha: { ok: false, dica: 'A zebra chega numa próxima etapa da bancada.' } });
    expect(naoFunciona.vista.escolherVisao('zebra')).toBe(false);
    expect(naoFunciona.avisar).toHaveBeenCalledWith('A zebra chega numa próxima etapa da bancada.');
  });

  it('a subida termina com a projeção e a vista da URL', () => {
    const { vista, estado, ambiente } = montar({ parametros: 'vista=direita&projecao=ortografica' });
    vista.restaurarCameraDaUrl();
    expect(ambiente.definirVista).toHaveBeenCalledWith('direita', { instantaneo: true });
    expect(estado.ler()).toMatchObject({ projecao: 'ortografica', vista: 'direita', inicializando: false });
  });
});
