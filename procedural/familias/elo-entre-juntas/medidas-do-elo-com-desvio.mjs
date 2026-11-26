/* medidas-do-elo-com-desvio.mjs — o que os testes do elo com desvio compartilham: a família, a execução, o hash da malha e a
 * espessura da parede da casca medida por raio (de cada face para dentro do material até a próxima). */
import { chamar, criarRegistroDeFamilias } from '../index.js';
import { executarReceita } from '../../../src/autoria/executar-receita.js';
import { expandirChamadasDeComposicao, neutroCanonico } from '../../nucleo/entrada.js';
import { sha256Hex } from '../../nucleo/sha256.js';

export { chamar };
export const registro = criarRegistroDeFamilias();
export const F = registro.obter('elo-entre-juntas');
export const execucao = { registroOperacoes: registro.registroOperacoes, registroComposicoes: registro.registroComposicoes };
export const PADRAO = Object.fromEntries(Object.entries(F.contrato.parametros).map(([nome, p]) => [nome, p.padrao]));
export const gerar = (parametros) => executarReceita({ meta: { nome: 'elo' }, get CHAMADAS_COMPOSICOES() { return [chamar(F, 'e', parametros)]; } }, execucao).neutro;
export const hash = (n) => sha256Hex(JSON.stringify(neutroCanonico(n)));
export const GRAUS = Math.PI / 180;

/** A espessura da parede a cada face da casca (mm): o raio de cada centro de face para dentro do material até a próxima face. */
export function espessurasDaCasca(parametros, passo = 6) {
  const { passos } = expandirChamadasDeComposicao(registro.registroComposicoes, [chamar(F, 'e', parametros)]);
  const soCasca = passos.filter((x) => x[0] === 'loft' || (x[0] === 'subtrair' && x[1].origemId === 3));
  const n = executarReceita({ meta: { nome: 'casca' }, PASSOS: soCasca, PARAMS: {}, TOPO: {}, ALIASES: [], MATERIAIS: {} }, execucao).neutro;
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const ponto = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const tris = [];
  for (const f of n.F.values()) { const P = f.vs.map((v) => n.V.get(v)); for (let i = 1; i + 1 < P.length; i += 1) tris.push([P[0], P[i], P[i + 1]]); }
  const medidas = [];
  for (let k = 0; k < tris.length; k += passo) {
    const [a, b, c] = tris[k]; const nv = cruz(sub(b, a), sub(c, a)); const L = Math.hypot(...nv);
    if (L < 1e-12) continue;
    const dir = nv.map((x) => -x / L); const o = [0, 1, 2].map((i) => (a[i] + b[i] + c[i]) / 3);
    let melhor = Infinity;
    for (const [A, B, C] of tris) {
      const e1 = sub(B, A); const e2 = sub(C, A); const h = cruz(dir, e2); const det = ponto(e1, h);
      if (Math.abs(det) < 1e-14) continue;
      const s = sub(o, A); const u = ponto(s, h) / det; if (u < 0 || u > 1) continue;
      const q = cruz(s, e1); const v = ponto(dir, q) / det; if (v < 0 || u + v > 1) continue;
      const t = ponto(e2, q) / det; if (t > 1e-7 && t < melhor) melhor = t;
    }
    if (melhor < Infinity) medidas.push(melhor * 1000);
  }
  return medidas.filter((x) => x < 6).sort((x, y) => x - y);
}

