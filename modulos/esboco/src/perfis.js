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
  /* n raios retos de largura `largura` que partem do círculo `rin` (o cubo, com os arcos entre os raios) e vão até `rout`, em
     polígono simples (a janela entre dois raios fica aberta); o primeiro raio aponta para +v. `passos` divide o arco do cubo entre
     dois raios (4 por padrão). A extrusão do polígono é o conjunto cubo e raios; o aro é outra forma. */
  raios: {
    campos: ['n', 'rin', 'rout', 'largura', 'passos'],
    opcionais: ['passos'],
    exemplo: '{ "gerar": "raios", "n": 5, "rin": 45, "rout": 190, "largura": 14 }',
    gerar({ n, rin, rout, largura, passos = 4 }, onde) {
      exigir(Number.isInteger(n) && n >= 2, `${onde}: "n" deve ser um inteiro de 2 ou mais, o número de raios (veio ${JSON.stringify(n)})`);
      exigir(finito(rin) && rin > 0 && finito(rout) && rout > rin, `${onde}: "rin" e "rout" devem ser números em mm com 0 < rin < rout (vieram ${JSON.stringify(rin)} e ${JSON.stringify(rout)})`);
      exigir(finito(largura) && largura > 0 && largura < 2 * rin, `${onde}: "largura" é a largura de cada raio em mm, positiva e menor que 2 x rin = ${r3(2 * rin)} (veio ${JSON.stringify(largura)})`);
      exigir(Number.isInteger(passos) && passos >= 1, `${onde}: "passos" deve ser um inteiro de 1 ou mais (veio ${JSON.stringify(passos)})`);
      const d = (Math.asin(largura / 2 / rin) * 180) / Math.PI;
      exigir(2 * d < 360 / n, `${onde}: ${n} raios de ${largura} mm não cabem no cubo de raio ${rin} mm (cada raio ocupa ${r3(2 * d)} graus do cubo e o passo é de ${r3(360 / n)}); afine os raios, aumente "rin" ou use menos raios`);
      const pontos = [];
      for (let k = 0; k < n; k++) {
        const a = 90 + (360 / n) * k;
        const e = [Math.cos(rad(a)), Math.sin(rad(a))];
        const q = [-e[1], e[0]];
        pontos.push(polar(a - d, rin), [r3(e[0] * rout - q[0] * largura / 2), r3(e[1] * rout - q[1] * largura / 2)], [r3(e[0] * rout + q[0] * largura / 2), r3(e[1] * rout + q[1] * largura / 2)], polar(a + d, rin));
        for (let j = 1; j < passos; j++) pontos.push(polar(a + d + ((360 / n - 2 * d) * j) / passos, rin));
      }
      return pontos;
    },
  },
  /* perfil [raio, altura] de um pneu para a `revolucao` (eixo ao longo da altura, centrado): a parede reta de `raioAro` a
     `raio - ombro`, o ombro arredondado de raio `ombro` (em `passos` passos, 6 por padrão) e a banda de rodagem em `raio`. Sem
     `ombro` é o cilindro. A revolução é maciça (o cubo e o disco de dentro ficam encobertos), por isso o pneu arredondado serve à
     roda de disco; a roda de raios usa o pneu em anel. */
  pneu: {
    campos: ['raio', 'raioAro', 'largura', 'ombro', 'passos'],
    opcionais: ['ombro', 'passos'],
    exemplo: '{ "gerar": "pneu", "raio": 305, "raioAro": 210, "largura": 125, "ombro": 40 }',
    gerar({ raio, raioAro, largura, ombro = 0, passos = 6 }, onde) {
      exigir(finito(raioAro) && raioAro > 0 && finito(raio) && raio > raioAro, `${onde}: "raioAro" e "raio" devem ser números em mm com 0 < raioAro < raio (vieram ${JSON.stringify(raioAro)} e ${JSON.stringify(raio)})`);
      exigir(finito(largura) && largura > 0, `${onde}: "largura" deve ser um número positivo em mm (veio ${JSON.stringify(largura)})`);
      exigir(finito(ombro) && ombro >= 0 && ombro <= largura / 2 && ombro <= raio - raioAro, `${onde}: "ombro" é o raio do arredondamento em mm, de 0 a ${r3(Math.min(largura / 2, raio - raioAro))} (metade da largura e altura da parede; veio ${JSON.stringify(ombro)})`);
      exigir(Number.isInteger(passos) && passos >= 1, `${onde}: "passos" deve ser um inteiro de 1 ou mais (veio ${JSON.stringify(passos)})`);
      const h = largura / 2;
      const pts = [[raioAro, -h]];
      if (ombro === 0) pts.push([raio, -h], [raio, h], [raioAro, h]);
      else {
        pts.push([raio - ombro, -h]);
        for (let j = 1; j <= passos; j++) { const a = rad(-90 + (90 * j) / passos); pts.push([raio - ombro + ombro * Math.cos(a), -h + ombro + ombro * Math.sin(a)]); }
        for (let j = 0; j <= passos; j++) { const a = rad((90 * j) / passos); pts.push([raio - ombro + ombro * Math.cos(a), h - ombro + ombro * Math.sin(a)]); }
        pts.push([raioAro, h]);
      }
      const saida = [];
      for (const q of pts.map(([r, z]) => [r3(r), r3(z)])) if (saida.length === 0 || Math.hypot(q[0] - saida[saida.length - 1][0], q[1] - saida[saida.length - 1][1]) > 1e-6) saida.push(q);
      return saida;
    },
  },
  /* disco de freio: o anel de `raioInterno` a `raioExterno` em polígono simples (a extrusão não tem furo): uma fenda de `fenda`
     mm (0,4 por padrão) liga a borda de fora à de dentro, e cada furo (`furos` furos de raio `raioFuro` no raio `raioCentroFuros`,
     o meio do anel por padrão) se liga à borda de fora por um canal da mesma largura. `ranhuras` rasgos de `larguraRanhura` por
     `profundidadeRanhura` mm entram pela borda de fora, entre os furos. `lados` divide o círculo (96 por padrão). */
  disco: {
    campos: ['raioExterno', 'raioInterno', 'furos', 'raioFuro', 'raioCentroFuros', 'ranhuras', 'larguraRanhura', 'profundidadeRanhura', 'fenda', 'lados'],
    opcionais: ['furos', 'raioFuro', 'raioCentroFuros', 'ranhuras', 'larguraRanhura', 'profundidadeRanhura', 'fenda', 'lados'],
    exemplo: '{ "gerar": "disco", "raioExterno": 150, "raioInterno": 70, "furos": 12, "raioFuro": 5, "ranhuras": 6, "larguraRanhura": 4, "profundidadeRanhura": 18 }',
    gerar(a, onde) {
      const { raioExterno: ro, raioInterno: ri } = a;
      const furos = a.furos ?? 0; const ranhuras = a.ranhuras ?? 0; const fenda = a.fenda ?? 0.4; const lados = a.lados ?? 96;
      exigir(finito(ri) && ri > 0 && finito(ro) && ro > ri, `${onde}: "raioInterno" e "raioExterno" devem ser números em mm com 0 < raioInterno < raioExterno (vieram ${JSON.stringify(ri)} e ${JSON.stringify(ro)})`);
      exigir(Number.isInteger(furos) && furos >= 0 && Number.isInteger(ranhuras) && ranhuras >= 0, `${onde}: "furos" e "ranhuras" devem ser inteiros de 0 ou mais`);
      exigir(finito(fenda) && fenda > 0 && fenda < (ro - ri) / 4, `${onde}: "fenda" deve ser positiva e menor que um quarto da largura do anel (${r3((ro - ri) / 4)} mm; veio ${JSON.stringify(fenda)})`);
      exigir(Number.isInteger(lados) && lados >= 16, `${onde}: "lados" deve ser um inteiro de 16 ou mais (veio ${JSON.stringify(lados)})`);
      const h = fenda / 2;
      const rf = a.raioFuro; const rc = a.raioCentroFuros ?? (ro + ri) / 2;
      if (furos > 0) {
        exigir(finito(rf) && rf > h, `${onde}: "raioFuro" deve ser um número em mm maior que a metade da fenda (${r3(h)} mm; veio ${JSON.stringify(rf)})`);
        exigir(rc - rf > ri + fenda && rc + rf < ro - fenda, `${onde}: os furos (raio ${rf} mm no raio ${r3(rc)} mm) não cabem entre ${ri} e ${ro} mm com folga de uma fenda; mude "raioFuro" ou "raioCentroFuros"`);
        exigir(2 * rf + fenda < (2 * Math.PI * rc) / furos, `${onde}: ${furos} furos de raio ${rf} mm no raio ${r3(rc)} mm se tocam; use menos furos ou furos menores`);
      }
      const lr = a.larguraRanhura; const pr = a.profundidadeRanhura;
      if (ranhuras > 0) {
        exigir(finito(lr) && lr > fenda && finito(pr) && pr > 0 && pr < ro - ri - 2 * fenda, `${onde}: "larguraRanhura" (maior que a fenda) e "profundidadeRanhura" (menor que a largura do anel) devem ser números em mm (vieram ${JSON.stringify(lr)} e ${JSON.stringify(pr)})`);
      }
      const eventos = [];
      for (let k = 0; k < furos; k++) eventos.push({ ang: (360 * k) / furos, furo: true, meia: h });
      for (let k = 0; k < ranhuras; k++) eventos.push({ ang: furos > 0 && furos % ranhuras === 0 ? (360 * (k * (furos / ranhuras) + 0.5)) / furos : (360 * (k + 0.5)) / ranhuras, furo: false, meia: lr / 2 });
      eventos.sort((x, y) => x.ang - y.ang);
      eventos.forEach((e, i) => {
        const prox = eventos[(i + 1) % eventos.length];
        const dist = i === eventos.length - 1 ? prox.ang + 360 - e.ang : prox.ang - e.ang;
        if (eventos.length > 1) exigir(((dist * Math.PI) / 180) * ro > e.meia + prox.meia + 2 * fenda, `${onde}: os furos e as ranhuras se encontram na borda de fora (a ${r3(e.ang)} e ${r3(prox.ang)} graus); mude os números`);
      });
      const graus = (x) => (x * 180) / Math.PI;
      const sli = eventos.length === 0 ? 270 : (eventos[eventos.length - 1].ang + (eventos[0].ang + 360 - eventos[eventos.length - 1].ang) / 2) % 360;
      const noQuadro = (ang, r, t) => [r3(r * Math.cos(rad(ang)) - t * Math.sin(rad(ang))), r3(r * Math.sin(rad(ang)) + t * Math.cos(rad(ang)))];
      const dEx = graus(Math.asin(h / ro));
      const passoDeArco = 360 / lados;
      const pts = [];
      const arcoDe = (de, ate) => {
        const n = Math.max(1, Math.ceil((ate - de) / passoDeArco));
        for (let j = 0; j <= n; j++) pts.push(noQuadro(de + ((ate - de) * j) / n, ro, 0));
      };
      let atual = sli + dEx;
      const rel = (e) => ((((e.ang - sli) % 360) + 360) % 360);
      for (const e of [...eventos].sort((x, y) => rel(x) - rel(y))) {
        const ang = sli + rel(e);
        const dm = graus(Math.asin(e.meia / ro));
        arcoDe(atual, ang - dm);
        const yo = Math.sqrt(ro * ro - e.meia * e.meia);
        pts.pop();
        pts.push(noQuadro(ang, yo, -e.meia));
        if (e.furo) {
          const e1 = Math.asin(h / rf);
          const passos = Math.max(12, Math.ceil(360 / passoDeArco));
          const total = 2 * Math.PI - 2 * e1;
          for (let j = 0; j <= passos; j++) {
            const f = -e1 - (total * j) / passos;
            pts.push(noQuadro(ang, rc + rf * Math.cos(f), rf * Math.sin(f)));
          }
        } else {
          pts.push(noQuadro(ang, ro - pr, -e.meia), noQuadro(ang, ro - pr, e.meia));
        }
        pts.push(noQuadro(ang, yo, e.meia));
        atual = ang + dm;
      }
      arcoDe(atual, sli + 360 - dEx);
      const dIn = graus(Math.asin(h / ri));
      const nI = Math.max(8, Math.ceil((360 - 2 * dIn) / passoDeArco));
      for (let j = 0; j <= nI; j++) pts.push(noQuadro(sli - dIn - ((360 - 2 * dIn) * j) / nI, ri, 0));
      const unicos = pts.filter((q, i) => i === 0 || Math.hypot(q[0] - pts[i - 1][0], q[1] - pts[i - 1][1]) > 1e-6);
      if (Math.hypot(unicos[0][0] - unicos[unicos.length - 1][0], unicos[0][1] - unicos[unicos.length - 1][1]) <= 1e-6) unicos.pop();
      return unicos;
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
  for (const k of g.campos.filter((c) => !(g.opcionais ?? ['lados']).includes(c))) exigir(args[k] !== undefined, `${onde}: o gerador "${spec.gerar}" precisa do campo "${k}". Exemplo: ${g.exemplo}`);
  return g.gerar(args, onde);
}
