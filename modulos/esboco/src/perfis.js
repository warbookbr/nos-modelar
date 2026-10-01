/* Perfis por função: no lugar da lista de pontos, o `perfil` de uma `extrusao`, `revolucao` ou seção de `loft` pode ser
   `{ "gerar": "<gerador>", ... }`, que a expansão troca pela lista numérica. Os argumentos aceitam número, parâmetro ou
   "=expressão". O perfil sai com o centro do círculo na origem do plano [u, v] (nada é recentrado), em milímetros e graus,
   arredondado a 0,001 mm, e o mesmo pedido dá sempre a mesma lista. Puro. */
import { ErroDeEsboco } from './index.js';
import { quisDizer } from './parecido.js';

const exigir = (cond, msg) => { if (!cond) throw new ErroDeEsboco(msg); };
const objeto = (v) => v && typeof v === 'object' && !Array.isArray(v);
const r3 = (x) => Math.round(x * 1000) / 1000;
const rad = (g) => (g * Math.PI) / 180;

/* `u = r cos(a)`, `v = r sin(a)`: 0 graus é o eixo +u e o ângulo cresce para +v. */
const polar = (angulo, raio) => [r3(raio * Math.cos(rad(angulo))), r3(raio * Math.sin(rad(angulo)))];
const finito = (v) => typeof v === 'number' && Number.isFinite(v);

export const GERADORES = {
  /* n raios que partem do círculo `rin` e acabam num bico de `rout`, com `semi` graus de largura na ponta; o primeiro raio aponta para +v */
  estrela: {
    campos: ['n', 'rin', 'rout', 'semi'],
    exemplo: '{ "gerar": "estrela", "n": 5, "rin": 62, "rout": 207, "semi": 11 }',
    gerar({ n, rin, rout, semi }, onde) {
      exigir(Number.isInteger(n) && n >= 3, `${onde}: "n" deve ser um inteiro de 3 ou mais (veio ${JSON.stringify(n)})`);
      exigir(finito(rin) && rin > 0 && finito(rout) && rout > rin, `${onde}: "rin" e "rout" devem ser números em mm com 0 < rin < rout (vieram ${JSON.stringify(rin)} e ${JSON.stringify(rout)})`);
      exigir(finito(semi) && semi > 0 && semi < 360 / n, `${onde}: "semi" é a largura angular da ponta do raio em graus, entre 0 e ${r3(360 / n)} para ${n} raios (veio ${JSON.stringify(semi)})`);
      const pontos = [];
      for (let k = 0; k < n; k++) {
        const a = 90 + (360 / n) * k;
        pontos.push(polar(a - 180 / n, rin), polar(a - semi / 2, rout), polar(a + semi / 2, rout));
      }
      return pontos;
    },
  },
  /* faixa de coroa circular entre dois raios, de -angulo a +angulo em torno de +v, com `passos` divisões: a borda externa de um lado a outro e a interna na volta */
  arco: {
    campos: ['raioExterno', 'raioInterno', 'angulo', 'passos'],
    exemplo: '{ "gerar": "arco", "raioExterno": 325, "raioInterno": 312, "angulo": 34, "passos": 8 }',
    gerar({ raioExterno, raioInterno, angulo, passos }, onde) {
      exigir(finito(raioExterno) && finito(raioInterno) && raioInterno > 0 && raioExterno > raioInterno, `${onde}: "raioExterno" deve ser maior que "raioInterno", que deve ser positivo (vieram ${JSON.stringify(raioExterno)} e ${JSON.stringify(raioInterno)})`);
      exigir(finito(angulo) && angulo > 0 && angulo <= 180, `${onde}: "angulo" é o meio-ângulo do arco em graus, entre 0 e 180 (veio ${JSON.stringify(angulo)})`);
      exigir(Number.isInteger(passos) && passos >= 1, `${onde}: "passos" deve ser um inteiro de 1 ou mais (veio ${JSON.stringify(passos)})`);
      const em = (r, k) => { const a = -angulo + (2 * angulo * k) / passos; return [r3(r * Math.sin(rad(a))), r3(r * Math.cos(rad(a)))]; };
      const pontos = [];
      for (let k = 0; k <= passos; k++) pontos.push(em(raioExterno, k));
      for (let k = passos; k >= 0; k--) pontos.push(em(raioInterno, k));
      return pontos;
    },
  },
  /* polígono regular de `lados` lados (24 por padrão) com o vértice em +u */
  circulo: {
    campos: ['raio', 'lados'],
    exemplo: '{ "gerar": "circulo", "raio": 40, "lados": 24 }',
    gerar({ raio, lados = 24 }, onde) {
      exigir(finito(raio) && raio > 0, `${onde}: "raio" deve ser um número positivo em mm (veio ${JSON.stringify(raio)})`);
      exigir(Number.isInteger(lados) && lados >= 3, `${onde}: "lados" deve ser um inteiro de 3 ou mais (veio ${JSON.stringify(lados)})`);
      return Array.from({ length: lados }, (_, k) => polar((360 / lados) * k, raio));
    },
  },
  /* os pontos escritos como [ângulo em graus, raio em mm] */
  polar: {
    campos: ['pontos'],
    exemplo: '{ "gerar": "polar", "pontos": [[0, 40], [120, 40], [240, 25]] }',
    gerar({ pontos }, onde) {
      exigir(Array.isArray(pontos) && pontos.length >= 3 && pontos.every((p) => Array.isArray(p) && p.length === 2 && finito(p[0]) && finito(p[1]) && p[1] >= 0), `${onde}: "pontos" deve ser uma lista de pelo menos 3 pares [ângulo em graus, raio em mm], com raio maior ou igual a zero`);
      return pontos.map(([a, r]) => polar(a, r));
    },
  },
};

/* O `perfil` é um gerador? */
export const ehGerador = (v) => objeto(v) && v.gerar !== undefined;

/* A lista numérica de um perfil `{ gerar, ... }`; `num(valor, campo, contexto)` resolve parâmetros e expressões. */
export function gerarPerfil(spec, num, campo, contexto) {
  const nomes = Object.keys(GERADORES);
  const onde = `${contexto}: ${campo}`;
  exigir(typeof spec.gerar === 'string' && Object.hasOwn(GERADORES, spec.gerar), `${onde}: "gerar" com o valor ${JSON.stringify(spec.gerar)} não é um gerador de perfil${quisDizer(String(spec.gerar), nomes)}; geradores: ${nomes.map((n) => `"${n}" (${GERADORES[n].campos.join(', ')})`).join('; ')}. Exemplo: ${GERADORES[nomes.includes(spec.gerar) ? spec.gerar : 'estrela'].exemplo}`);
  const g = GERADORES[spec.gerar];
  for (const k of Object.keys(spec)) {
    exigir(k === 'gerar' || g.campos.includes(k), `${onde}: o gerador "${spec.gerar}" não tem o campo "${k}"${quisDizer(k, g.campos)}; campos: ${g.campos.join(', ')}. Exemplo: ${g.exemplo}`);
  }
  const args = {};
  for (const k of g.campos) {
    if (spec[k] === undefined) continue;
    args[k] = k === 'pontos' && Array.isArray(spec[k])
      ? spec[k].map((p, i) => (Array.isArray(p) ? p.map((x, j) => num(x, `${campo}.pontos[${i}][${j}]`, contexto)) : p))
      : num(spec[k], `${campo}.${k}`, contexto);
  }
  for (const k of g.campos.filter((c) => c !== 'lados')) exigir(args[k] !== undefined, `${onde}: o gerador "${spec.gerar}" precisa do campo "${k}". Exemplo: ${g.exemplo}`);
  return g.gerar(args, onde);
}
