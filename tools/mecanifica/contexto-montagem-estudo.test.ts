/* Repete R001/R002 no descritor de contexto e mede a economia Agent-First. */
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const ESTUDO = resolve(REPO, 'autoria-assistida/experimentos/estudo-campo-conjunto-dianteiro/executar-estudo.mjs');
const executar = (args: string[]) => execFileSync('node', [ESTUDO, ...args], { encoding: 'utf8' });

describe('contexto de montagem no estudo de campo — R04', () => {
  it('R001 descreve 6 peças, 2 montagens e 4 relações sem malha', () => {
    const texto = executar(['--disco-raio=0.140', '--contexto']);
    const contexto = JSON.parse(texto);

    expect(contexto.totais).toEqual({
      pecas: 6, montagens: 2, relacoesDeclaradas: 4, satisfeitas: 4, reprovadas: 0,
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

  it('consulta disco + relacionados é menor e inclui somente freio, disco e cubo', () => {
    const completo = executar(['--disco-raio=0.140', '--contexto']);
    const reduzido = executar([
      '--disco-raio=0.140', '--contexto', '--caminho=freio/disco', '--incluir-relacionados',
    ]);
    const contexto = JSON.parse(reduzido);

    expect(Buffer.byteLength(reduzido)).toBeLessThan(Buffer.byteLength(completo));
    expect(contexto.instancias.map((item: any) => item.caminho.join('/'))).toEqual([
      'freio', 'freio/cubo', 'freio/disco',
    ]);
    expect(contexto.relacoes.map((item: any) => item.id)).toEqual(['discoNoCubo']);
    expect(contexto.consulta.incluidasPorRelacao).toEqual([['freio', 'cubo']]);
  });

  it('R002 mantém quatro relações satisfeitas sem alegar validade global', () => {
    const contexto = JSON.parse(executar(['--disco-raio=0.165', '--contexto']));
    const medicao = JSON.parse(executar(['--disco-raio=0.165', '--resumo']));

    expect(contexto.totais).toMatchObject({ relacoesDeclaradas: 4, satisfeitas: 4, reprovadas: 0 });
    expect(medicao.medidasExperimentais.folgaRadialDiscoPonte).toBeCloseTo(-0.005, 9);
    expect(contexto.cobertura.colisaoGlobalVerificada).toBe(false);
    expect(contexto).not.toHaveProperty('valida');
    expect(contexto).not.toHaveProperty('montagemValida');
  });

  it('duas execuções completas são byte-idênticas', () => {
    expect(executar(['--disco-raio=0.140', '--contexto']))
      .toBe(executar(['--disco-raio=0.140', '--contexto']));
  });
});
