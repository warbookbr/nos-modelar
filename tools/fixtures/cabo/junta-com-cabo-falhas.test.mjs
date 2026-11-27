/* junta-com-cabo-falhas.test.mjs — gate 3 do plano dos cabos, os arranjos feitos para falhar entre as portas reais dos atuadores: a conferência do curso acusa a pose em que o cabo estica, dobra abaixo do raio mínimo ou atravessa a carcaça A, e o
 * `atravessa` diz o ângulo, a peça e por onde uma braçadeira tiraria o cabo do caminho. A pose esperada vem de contas independentes da família: a distância entre as pontas contra o comprimento (estica), e a polilinha do eixo do cabo contra
 * o corpo da carcaça A, de revolução em torno de y (atravessa). O curso é amostrado em 12 passos. */
import { describe, expect, it } from 'vitest';
import { conferirCursoDoCabo, linhaDoCabo, refazerNoCurso } from '../../../procedural/familias/cabo/montagem.js';
import { ARRANJOS, prepararJuntaComCabo } from './junta-com-cabo.mjs';

const PASSOS = 12;
const preparos = {};
const preparo = (nome) => (preparos[nome] ??= prepararJuntaComCabo({ curso: ARRANJOS[nome].curso, passos: PASSOS }));
const confere = (nome) => { const { execucao, resolvida, declaracao } = preparo(nome); return conferirCursoDoCabo(resolvida, declaracao, ARRANJOS[nome].pedido, execucao, { limiarDeFolga: 0 }); };
const valores = (r, motivo) => r.falhas.filter((f) => f.motivo === motivo).map((f) => f.valor);

describe('o cabo na junta, os arranjos que falham', () => {
  it('curto: o cabo de 80 mm estica em todo o curso, e a conta independente concorda onde as pontas passam de 80 mm', () => {
    const r = confere('curto');
    expect(r.ok).toBe(false);
    expect(r.falhas.every((f) => f.motivo === 'estica')).toBe(true);
    expect(valores(r, 'estica')).toEqual(r.posicoes.map((p) => p.valor));
    for (const p of r.posicoes) if (p.distanciaEntrePontas >= 80) expect(p.ok, `passo ${p.indice}: as pontas a ${p.distanciaEntrePontas} mm de um cabo de 80`).toBe(false);
    /* onde a reta entre as pontas já passa do comprimento (de ±60° para fora) a família diz que um cabo não encurta; no meio, que a curva de menor energia não alcança */
    expect(r.legivel[0]).toMatch(/^junta 'juntaA', passo 0 de 12 \(-90 graus\): estica: o cabo estica: .*um cabo não encurta/);
    expect(r.legivel.some((l) => /\(0 graus\): estica: .*menor energia alcança/.test(l))).toBe(true);
  }, 60000);

  it('fechado: o cabo de 130 mm dobra abaixo do raio mínimo (9 mm) só nos extremos do curso', () => {
    const r = confere('fechado');
    expect(r.ok).toBe(false);
    expect(r.falhas.every((f) => f.motivo === 'dobra')).toBe(true);
    expect(valores(r, 'dobra')).toEqual([-90, 90]);
    expect(r.legivel[0]).toMatch(/\(-90 graus\): dobra: o cabo dobra abaixo do raio mínimo: .*raioMinimo recebeu 7\.9\d*; aceito: .*ao menos 9 mm/);
  }, 60000);

  it('atravessa: o cabo de 200 mm atravessa a carcaça A perto de ±180°, onde a conta independente também o põe dentro, e a mensagem diz o ângulo, a peça e a braçadeira', () => {
    const r = confere('atravessa');
    expect(r.ok).toBe(false);
    expect(r.falhas.every((f) => f.motivo === 'atravessa' && f.contra === 'carcacaA')).toBe(true);
    /* a conta independente: algum ponto da linha de centro dentro do corpo de A (de revolução em torno de y, raio 50 mm, de 10 a 65 mm de altura), a mais de 1,5 mm da superfície */
    const { resolvida, declaracao } = preparo('atravessa');
    const dentro = refazerNoCurso(resolvida, declaracao, ARRANJOS.atravessa.pedido, { passos: PASSOS }).map((p) => {
      const linha = linhaDoCabo(p.chamadas);
      return linha ? linha.some(([x, y, z]) => Math.hypot(x, z) * 1000 < 48.5 && y * 1000 > 11.5 && y * 1000 < 63.5) : false;
    });
    const esperados = refazerNoCurso(resolvida, declaracao, ARRANJOS.atravessa.pedido, { passos: PASSOS }).filter((p, i) => dentro[i]).map((p) => p.valor);
    expect(esperados.length).toBeGreaterThan(0);
    expect(new Set(valores(r, 'atravessa'))).toEqual(new Set(esperados));
    /* a mensagem: ângulo, peça, ponto mais fundo, direção para fora e a braçadeira */
    const f = r.falhas.find((x) => x.valor === 180);
    expect(f.mensagem).toMatch(/o cabo atravessa 'carcacaA' a 180 graus, penetrando [\d.]+ mm/);
    expect(f.mensagem).toMatch(/o ponto do cabo mais fundo na peça está em \[/);
    expect(f.mensagem).toMatch(/uma braçadeira em \[.*\] mm \(a [\d.]+ mm dali\) tiraria o cabo do caminho/);
    /* a braçadeira sugerida fica fora de A: acima do topo (65 mm) ou além do raio de 50 mm, e a direção é unitária */
    const [bx, by, bz] = f.bracadeira;
    expect(by > 65 || by < 10 || Math.hypot(bx, bz) > 50).toBe(true);
    expect(Math.hypot(...f.direcaoDeSaida)).toBeCloseTo(1, 2);
  }, 120000);
});
