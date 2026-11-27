/* junta-com-cabo-falhas.test.mjs — gate 3 do plano dos cabos, os arranjos feitos para falhar: a conferência do curso acusa a pose em que o cabo estica, dobra abaixo do raio mínimo ou atravessa a carcaça. A pose
 * esperada vem de uma conta independente da família: a distância entre as pontas contra o comprimento (estica) e a polilinha do eixo do cabo contra o raio do corpo da carcaça B (atravessa; o corpo é de revolução em torno do eixo da
 * junta, y, e por isso o teste não depende da pose de B). O curso é amostrado em 12 passos de 15°. */
import { describe, expect, it } from 'vitest';
import { conferirCursoDoCabo, refazerNoCurso } from '../../../procedural/familias/cabo/montagem.js';
import { ARRANJOS, prepararJuntaComCabo } from './junta-com-cabo.mjs';

const { execucao, resolvida, declaracao } = prepararJuntaComCabo();
const PASSOS = 12;
const confere = (nome) => conferirCursoDoCabo(resolvida, declaracao, ARRANJOS[nome].pedido, execucao, { passos: PASSOS });
const indices = (r, motivo) => r.falhas.filter((f) => f.motivo === motivo).map((f) => f.indice);

describe('o cabo na junta, os arranjos que falham', () => {
  it('curto: estica de 60° para cada lado, que é onde a distância entre as pontas chega perto do comprimento', () => {
    const r = confere('curto');
    expect(r.ok).toBe(false);
    expect(r.falhas.every((f) => f.motivo === 'estica')).toBe(true);
    const L = 48;
    /* o passo i está em −90 + 15 i graus: acusa 0 a 2 (−90 a −60) e 10 a 12 (60 a 90), e nenhum entre −45 e 45 */
    expect(indices(r, 'estica')).toEqual([0, 1, 2, 10, 11, 12]);
    for (const p of r.posicoes) {
      if (p.distanciaEntrePontas >= L) expect(p.ok, `passo ${p.indice}: as pontas a ${p.distanciaEntrePontas} mm de um cabo de ${L}`).toBe(false);
      if (p.distanciaEntrePontas < 0.85 * L) expect(p.ok, `passo ${p.indice}`).toBe(true);
    }
    expect(r.legivel[0]).toMatch(/^junta 'juntaA', passo 0 de 12 \(-90 graus\): estica: o cabo estica: /);
    expect(r.legivel).toHaveLength(6);
  }, 60000);

  it('fechado: dobra abaixo do raio mínimo de −30° a 30°, e só ali', () => {
    const r = confere('fechado');
    expect(r.ok).toBe(false);
    expect(r.falhas.every((f) => f.motivo === 'dobra')).toBe(true);
    expect(indices(r, 'dobra')).toEqual([4, 5, 6, 7, 8]);
    expect(r.legivel[2]).toMatch(/passo 6 de 12 \(0 graus\): dobra: o cabo dobra abaixo do raio mínimo: .*menor raio de dobra seja ao menos 9 mm/);
  }, 60000);

  it('atravessa: o cabo passa por dentro da carcaça B no passo zero, onde a conta independente também o põe dentro', () => {
    const r = confere('atravessa');
    expect(r.ok).toBe(false);
    expect(indices(r, 'atravessa')).toEqual([6, 6]);
    expect(r.falhas.map((f) => f.contra).sort()).toEqual(['carcacaB', 'saidaB']);
    expect(r.falhas.every((f) => f.indice === 6 && f.penetracao > 0.3)).toBe(true);
    expect(r.legivel.some((l) => /passo 6 de 12 \(0 graus\): atravessa: o cabo atravessa 'carcacaB', penetrando/.test(l))).toBe(true);
    /* a conta independente: algum ponto do eixo do cabo dentro do corpo de B (raio 22 mm do eixo y, entre 79 e 101 mm de altura) */
    const dentro = refazerNoCurso(resolvida, declaracao, ARRANJOS.atravessa.pedido, { passos: PASSOS }).map((p) => {
      const a = p.chamadas[0].argumentos; const pontos = [];
      for (let k = 0; a[`p${k}`]; k += 1) pontos.push(a[`p${k}`].map((v) => v * 1000));
      return pontos.some(([x, y, z]) => Math.hypot(x, z) < 20 && y > 80 && y < 100);
    });
    expect(dentro.map((d, i) => (d ? i : -1)).filter((i) => i >= 0)).toEqual([6]);
  }, 60000);
});
