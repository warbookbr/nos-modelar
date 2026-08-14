/* Repete R001/R002 no descritor de contexto e mede a economia Agent-First. */
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const ESTUDO = resolve(REPO, 'autoria-assistida/experimentos/estudo-campo-conjunto-dianteiro/executar-estudo.mjs');
const executar = (args: string[]) => execFileSync('node', [ESTUDO, ...args], { encoding: 'utf8' });

describe('contexto de montagem no estudo de campo — R04', () => {
  it('R001 descreve 6 peças, 2 montagens e 5 relações sem malha', () => {
    const texto = executar(['--disco-raio=0.140', '--contexto']);
    const contexto = JSON.parse(texto);

    expect(contexto.totais).toEqual({
      pecas: 6, montagens: 2, relacoesDeclaradas: 5, satisfeitas: 5, reprovadas: 0,
    });
    expect(contexto.cobertura).toMatchObject({
      relacoesLocaisExecutadas: true,
      colisaoGlobalVerificada: false,
      dependenciasIndiretasVerificadas: false,
    });
    expect(texto).not.toMatch(/"[VF]":|"definicao":|"instancia":/);
    expect(texto).not.toContain(REPO);
    expect(Buffer.byteLength(texto)).toBeLessThan(64 * 1024);
  });

  it('consulta disco + relacionados inclui os dois vizinhos diretos', () => {
    const completo = executar(['--disco-raio=0.140', '--contexto']);
    const reduzido = executar([
      '--disco-raio=0.140', '--contexto', '--caminho=freio/disco', '--incluir-relacionados',
    ]);
    const contexto = JSON.parse(reduzido);

    expect(Buffer.byteLength(reduzido)).toBeLessThan(Buffer.byteLength(completo));
    expect(contexto.instancias.map((item: any) => item.caminho.join('/'))).toEqual([
      'freio', 'freio/cubo', 'freio/disco', 'freio/pinca',
    ]);
    expect(contexto.relacoes.map((item: any) => item.id)).toEqual(['discoNoCubo', 'discoPontePinca']);
    expect(contexto.consulta.incluidasPorRelacao).toEqual([['freio', 'cubo'], ['freio', 'pinca']]);
    expect(contexto.relacoes[1].movel).toMatchObject({ caminho: ['freio', 'pinca'], parte: 'pinca' });
  });

  it('R002 reprova somente a separação direcional sem alegar colisão geral', () => {
    const contexto = JSON.parse(executar(['--disco-raio=0.165', '--contexto']));
    const medicao = JSON.parse(executar(['--disco-raio=0.165', '--resumo']));

    expect(contexto.totais).toMatchObject({ relacoesDeclaradas: 5, satisfeitas: 4, reprovadas: 1 });
    expect(medicao.medidasExperimentais.folgaRadialDiscoPonte).toBeCloseTo(-0.005, 9);
    const separacao = contexto.relacoes.find((item: any) => item.id === 'discoPontePinca');
    expect(separacao.satisfeita).toBe(false);
    expect(separacao.medidas.separacaoDirecional).toBeCloseTo(-0.005, 9);
    expect(contexto.cobertura.colisaoGlobalVerificada).toBe(false);
    expect(contexto).not.toHaveProperty('valida');
    expect(contexto).not.toHaveProperty('montagemValida');
  });

  it('mapa do disco separa relações diretas e indiretas', () => {
    const mapa = JSON.parse(executar(['--disco-raio=0.140', '--impacto=freio/disco']));

    expect(mapa.relacoesDiretas.map((item: any) => item.id)).toEqual(['discoNoCubo', 'discoPontePinca']);
    expect(mapa.relacoesIndiretas.map((item: any) => item.id)).toEqual([
      'aroNoPiloto', 'eixoNoCubo', 'aroNoPneu',
    ]);
    expect(mapa.instanciasRelacionadas).toContainEqual({ caminho: ['freio', 'cubo'], origem: 'direta' });
    expect(mapa.instanciasRelacionadas).toContainEqual({ caminho: ['freio', 'pinca'], origem: 'direta' });
    expect(mapa.montagensARevalidar).toEqual([
      { caminho: [] }, { caminho: ['freio'] }, { caminho: ['roda'] },
    ]);
  });

  it('duas execuções completas são byte-idênticas', () => {
    expect(executar(['--disco-raio=0.140', '--contexto']))
      .toBe(executar(['--disco-raio=0.140', '--contexto']));
  });
});
