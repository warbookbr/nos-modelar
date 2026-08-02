/* interfaces-montagem.test.ts — provas do Recorte A de AUT-05: interfaces
   cilíndricas persistidas pelo núcleo e encaixe estritamente mensurável. */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — núcleo legado em JavaScript, exercitado pela API pública.
import { nucleo } from '../../prototipos/fps/v3/motor/oficina.js';
// @ts-expect-error — fixture em JavaScript, exercitada pela API pública.
import { montarPinoELuva } from '../../prototipos/fps/v3/montagens/pino-e-luva.js';
// @ts-expect-error — montagem piloto em JavaScript, exercitada pela API pública.
import { montarRodaNoFreio } from '../../prototipos/fps/v3/montagens/roda-no-freio.js';
// @ts-expect-error — módulo de autoria em JavaScript, exercitado pela API pública.
import { resolverPortasDeMontagem, validarEncaixeCilindrico, formatarDiagnosticoDeEncaixe } from '../../src/autoria/interfaces-montagem.js';

const resolver = (montagem: any) => resolverPortasDeMontagem(montagem.instancias);
const clonarPortas = (portas: Map<string, any>) => new Map([...portas].map(([id, porta]) => [id, JSON.parse(JSON.stringify(porta))]));

describe('interfaces mensuráveis de encaixe — AUT-2026-06', () => {
  it('porta sem interface preserva a forma histórica; a interface resolve parâmetros e não guarda referência do passo', () => {
    const passos: any = [
      ['cilindro', { origemId: 1, raio: 'r', altura: 0.02, lados: 8 }],
      ['publicarPorta', { nome: 'antiga', de: { op: 'cilindro', id: 1 } }],
      ['publicarPorta', {
        nome: 'nova', de: { op: 'cilindro', id: 1 },
        interface: { forma: 'cilindro', papel: 'externa', eixo: [2, 0, 0], centro: [0, 0, 0], raio: 'r', inicio: 0, fim: 0.02 },
      }],
    ];
    const neutro = nucleo(passos, { r: 0.01 });
    expect(neutro.portas.get('antiga')).toEqual({ nome: 'antiga', de: { op: 'cilindro', id: 1 }, passo: 1 });
    expect(neutro.portas.get('nova')?.interface).toEqual({
      forma: 'cilindro', papel: 'externa', eixo: [1, 0, 0], centro: [0, 0, 0], raio: 0.01, inicio: 0, fim: 0.02,
    });
    expect(neutro.portas.get('nova')?.interface).not.toBe(passos[2][1].interface);
  });

  it('recusa interface incompleta antes de ela virar dado de montagem', () => {
    const neutro = nucleo([
      ['cilindro', { origemId: 1, raio: 0.01, altura: 0.02, lados: 8 }],
      ['publicarPorta', { nome: 'ruim', de: { op: 'cilindro', id: 1 }, interface: { forma: 'cilindro', papel: 'externa' } }],
    ] as any);
    expect(neutro.orfaos).toHaveLength(1);
    expect(neutro.orfaos[0].motivo).toMatch(/interface exige 'eixo'/);
    expect(neutro.portas.size).toBe(0);
  });

  it('pino e luva passam sem vocabulário automotivo', () => {
    const montagem = montarPinoELuva();
    const resultado = validarEncaixeCilindrico(montagem.relacao, resolver(montagem));
    expect(resultado.satisfeita).toBe(true);
    expect(resultado.medidas.folgaRadial).toBeCloseTo(0.002, 9);
    expect(resultado.diagnosticos).toEqual([]);
  });

  it('roda e cubo publicam a razão do encaixe na pose que já existe', () => {
    const montagem = montarRodaNoFreio();
    const portas = resolver(montagem);
    const resultado = validarEncaixeCilindrico(montagem.relacao, portas);
    expect(resultado).toMatchObject({
      id: 'rodaNoCubo', satisfeita: true,
      referencia: 'freio.pilotoDaRoda', movel: 'roda.cavidadeDoCubo',
    });
    expect(resultado.medidas.folgaRadial).toBeCloseTo(0.00305, 9);
    expect(resultado.medidas.sobreposicaoAxial).toBeGreaterThan(0);
    expect(formatarDiagnosticoDeEncaixe(resultado)).toContain('estado: satisfeita');
  });

  it('raio fora da faixa e piloto axialmente fora falham com causas diferentes', () => {
    const montagem = montarRodaNoFreio();
    const portas = resolver(montagem);
    const radial = clonarPortas(portas);
    radial.get('freio.pilotoDaRoda').raio += 0.01;
    expect(validarEncaixeCilindrico(montagem.relacao, radial).diagnosticos.map((d: any) => d.codigo))
      .toContain('folga-radial-fora');

    const axial = clonarPortas(portas);
    axial.get('freio.pilotoDaRoda').centro[0] += 1;
    const resultadoAxial = validarEncaixeCilindrico(montagem.relacao, axial);
    expect(resultadoAxial.diagnosticos.map((d: any) => d.codigo)).toContain('intervalo-axial-fora');
    expect(resultadoAxial.diagnosticos.map((d: any) => d.codigo)).not.toContain('folga-radial-fora');
  });

  it('direção e descentro não são corrigidos em silêncio nem mutam a pose', () => {
    const montagem = montarPinoELuva();
    const portas = resolver(montagem);
    const antes = JSON.stringify([...portas]);
    const invertida = validarEncaixeCilindrico({ ...montagem.relacao, referencia: 'luva.cavidade', movel: 'pino.piloto' }, portas);
    expect(invertida.diagnosticos.map((d: any) => d.codigo)).toContain('direcao-incompativel');
    const deslocada = clonarPortas(portas);
    deslocada.get('pino.piloto').centro[0] += 0.01;
    expect(validarEncaixeCilindrico(montagem.relacao, deslocada).diagnosticos.map((d: any) => d.codigo))
      .toContain('eixos-descentrados');
    expect(JSON.stringify([...portas])).toBe(antes);
  });
});
