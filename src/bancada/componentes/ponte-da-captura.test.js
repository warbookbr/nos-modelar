/* ponte-da-captura.test.js — a ponte da captura mantém a superfície que os consumidores chamam, lê o estado vivo e liga e desliga a auditoria. */
import { describe, expect, it, vi } from 'vitest';
import { criarEstadoCentral, estadoInicialDaBancada } from '../estado/estado-central.js';
import { CHAVES_DA_PONTE, criarPonteDaCaptura, publicarPonte } from './ponte-da-captura.js';
import { criarPagina } from './dom-de-teste.js';

function montar() {
  const { documento } = criarPagina('');
  const estado = criarEstadoCentral(estadoInicialDaBancada({ pecaPedida: 'furgao', visao: 'solida' }));
  const controlador = {
    nomes: ['cabine', 'roda'],
    estado: () => ({ selecionadas: ['cabine'], modo: 'todas' }),
    definirCoresPorParte: vi.fn(() => [{ parte: 'cabine', cor: '#ff0000' }]),
    definirArame: vi.fn(),
    definirAuditoria: vi.fn(),
  };
  const cena = {
    modelo: null, controlador: null, parInspecionado: null, marcadoresDoPar: 0,
    focarSelecao: vi.fn(), focarContato: vi.fn(), inspecionarPar: vi.fn(), enquadrarMontagem: vi.fn(),
  };
  const ambiente = {
    projecao: 'perspectiva', cameraLivre: () => null, definirAuditoria: vi.fn(), redimensionar: vi.fn(),
    definirVista: vi.fn(), definirProjecao: vi.fn(), medirEnquadramento: vi.fn(),
  };
  const seletorDeVisao = { suspender: vi.fn(), retomar: vi.fn() };
  const ponte = criarPonteDaCaptura({
    estado, pecasDisponiveis: [], cena, ambiente, edicao: { camada: null }, imagemNaCena: { descreverNaCena: () => null },
    sincronizador: { definirPayload: vi.fn() }, seletorDeVisao, parametros: new URLSearchParams('selecionadas=cabine,porta'),
    corpo: documento.body, endereco: { href: () => 'http://x/' },
  });
  return { documento, estado, cena, controlador, ambiente, seletorDeVisao, ponte };
}

describe('ponte da captura', () => {
  it('tem exatamente as chaves do contrato, na mesma ordem', () => {
    const { ponte } = montar();
    expect(Object.keys(ponte)).toEqual([...CHAVES_DA_PONTE]);
  });

  it('as leituras são vivas: a peça que chega depois aparece sem remontar a ponte', () => {
    const { ponte, cena, controlador, estado } = montar();
    expect([ponte.carregado, ponte.partes, ponte.selecaoIgnorada, ponte.estatisticas]).toEqual([false, [], [], null]);
    cena.modelo = { partes: new Map([['roda', {}], ['cabine', {}]]), estatisticas: { faces: 2 }, medida: {} };
    cena.controlador = controlador;
    estado.definir({ nomePeca: 'Furgão', vista: 'direita' });
    expect(ponte.carregado).toBe(true);
    expect(ponte.partes).toEqual(['cabine', 'roda']);
    expect(ponte.selecaoIgnorada).toEqual(['porta']);
    expect(ponte.nomePeca).toBe('Furgão');
    expect(ponte.estado()).toEqual({
      peca: 'Furgão', selecionadas: ['cabine'], modo: 'todas', vista: 'direita', projecao: 'perspectiva', cameraLivre: null, inspecao: null,
    });
  });

  it('a auditoria suspende a visão da pessoa e a desfaz na volta', () => {
    const { ponte, cena, controlador, seletorDeVisao, documento } = montar();
    cena.controlador = controlador;
    expect(ponte.auditoria({ cores: true, arame: 'raio-x' })).toEqual({
      auditoria: true, cores: true, arame: true, legenda: [{ parte: 'cabine', cor: '#ff0000' }],
    });
    expect(documento.body.classList.contains('auditoria')).toBe(true);
    expect(seletorDeVisao.suspender).toHaveBeenCalled();
    expect(controlador.definirArame).toHaveBeenLastCalledWith('raio-x');
    ponte.semAuditoria();
    expect(documento.body.classList.contains('auditoria')).toBe(false);
    expect(seletorDeVisao.retomar).toHaveBeenCalled();
    expect(controlador.definirArame).toHaveBeenLastCalledWith(false);
  });

  it('publicar põe a ponte na janela, onde os consumidores a procuram', () => {
    const { ponte } = montar();
    const janela = {};
    publicarPonte(ponte, janela);
    expect(janela.__mecanificaBancada).toBe(ponte);
  });
});
