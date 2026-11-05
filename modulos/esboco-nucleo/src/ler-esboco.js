/* ler-esboco.js — abre no esboço 2.0 os `.esboco.json` de opções de forma que já existem, sem reescrevê-los.
 *
 * O LEITOR traduz os seis tipos que as opções de forma usam para operações do núcleo, em metro:
 *   caixa      `cubo`; com `chanfro`, `chamferBox`; com `raio` de canto ou `furos`, `extrusao` do retângulo de cantos redondos
 *              em y (o canto arredondado do esboço é o das quatro arestas verticais), com os furos passantes;
 *   cilindro   `cilindro` no eixo; com `achatado`, `extrusao` do círculo cortado pela corda do lado achatado;
 *   anel       `extrusao` do círculo com o furo do círculo de dentro, no eixo;
 *   cone       `lathe` de quatro pontos (o tronco) ou três (a ponta), com a base no início do eixo;
 *   extrusao   `extrusao` do perfil no eixo, com o plano do perfil do esboço (x e z no eixo y, z e y no eixo x, x e y no eixo z)
 *              levado ao do núcleo; `origem: "perfil"` põe a origem [0, 0] do perfil no `centro`;
 *   loft       `loft` do núcleo pelas seções (retângulo, com raio ou não, elipse, arredondado e polígono, com o centro
 *              deslocado), tampado nas duas pontas por um polo a 0,01 mm da seção (o loft do núcleo sai aberto sem polo, e é a
 *              tampa quase plana, a menos de 0,01 mm); seções de contagens diferentes são reamostradas em 48 raios a partir do
 *              centro, como o esboço fazia; `suave: true` acrescenta seis estações por trecho pela curva PCHIP de cada ponto.
 * A esfera vira `esfera` e a revolução reta, `lathe`, porque custam uma linha cada; o resto é recusado com o motivo.
 *
 * A POSIÇÃO vira o atalho de `opcao.js`: `centro` em vetor (o centro da forma, que o leitor leva ao centro da caixa da malha),
 * `sobre`, `ponta`, `desloca` e `rotacao`. A âncora (`"<id>.<ancora>"`), `encosta`, `alinha`, `de`/`para`, componente, espelho,
 * arranjo, recorte, unidade, curso e parâmetro por expressão são recusados com o nome do campo: o 2.0 posiciona pela caixa da
 * malha que o núcleo gerou e não reimplementa o resto do esboço antigo.
 *
 * A CONFERÊNCIA. Cada forma traduzida é executada sozinha e a caixa da malha é comparada com a medida declarada (largura, altura e
 * profundidade da caixa; diâmetro e comprimento do cilindro, do anel e do cone; a caixa do perfil e o comprimento da extrusão; a
 * caixa das seções do loft), com 0,5 mm de folga mais a flecha do polígono do círculo; a forma que não confere é recusada com as
 * duas medidas. É o que `esboco-para-passos.mjs` fazia forma a forma, sem o módulo antigo.
 *
 * `lerEsboco(json)` devolve `{ formato, vista, opcoes, recusas }`: `formato` é `antigo` ou `nucleo`, as opções no formato do 2.0 e
 * as recusas como `{ opcao, forma, motivo }`. Um arquivo abre quando não há recusa. Núcleo puro: recebe o JSON já lido. */
import { executarReceita } from '../../../src/autoria/executar-receita.js';
import { caixaDaMalha, lerRotacao, RecusaDoEsboco } from './opcao.js';

const mm = (x) => x / 1000;
const EIXOS = ['x', 'y', 'z'];
const IDX = { x: 0, y: 1, z: 2 };
/* o plano do perfil do esboço antigo: os eixos de mundo de u e de v para cada eixo de extrusão */
const PLANO_ANTIGO = { y: ['x', 'z'], x: ['z', 'y'], z: ['x', 'y'] };
/* o plano do perfil da `extrusao` do núcleo, medido: no eixo y [u, v] vai a (x, z); no x, a (-y, z); no z, a (x, -y) */
const PLANO_DA_EXTRUSAO = { y: [[1, 0, 0], [0, 0, 1]], x: [[0, -1, 0], [0, 0, 1]], z: [[1, 0, 0], [0, -1, 0]] };
/* a referência `orientacao` do `loft` do núcleo para cada eixo do caminho; o +u da seção é ela, e o +w é orientacao × tangente */
const ORIENTACAO_DO_LOFT = { y: [1, 0, 0], x: [0, 0, 1], z: [1, 0, 0] };
const LADOS_DO_CIRCULO = 48;
const LADOS_DA_ELIPSE = 48;
const TOLERANCIA_MM = 0.5;
const EPSILON_DA_TAMPA = 1e-5;
const ESTACOES_DO_SUAVE = 6;

const RAIZ_ACEITA = new Set(['opcoes', 'vista', 'plano', 'legendas', 'linhasCentro', 'formato']);
const OPCAO_ACEITA = new Set(['titulo', 'nota', 'formas', 'legendas']);
const COMUNS = ['id', 'tipo', 'centro', 'sobre', 'ponta', 'desloca', 'rotacao', 'cor', 'rotulo', 'oculto'];
const POR_TIPO = {
  caixa: ['largura', 'altura', 'profundidade', 'raio', 'chanfro', 'furos', 'furo'],
  cilindro: ['diametro', 'comprimento', 'eixo', 'lados', 'achatado'],
  anel: ['diametroExterno', 'diametroInterno', 'espessura', 'eixo', 'lados'],
  cone: ['diametro', 'diametroTopo', 'comprimento', 'eixo'],
  extrusao: ['perfil', 'comprimento', 'eixo', 'origem'],
  loft: ['secoes', 'eixo', 'suave'],
  esfera: ['diametro'],
  revolucao: ['perfil', 'eixo', 'lados'],
};
const POR_QUE_NAO = {
  tubo: 'o tubo do esboço não é traduzido; no núcleo ele é um `friso` de perfil circular numa polilinha, escrito em "passos"',
  familia: 'a forma de família não é traduzida; numa receita ela é `chamar` pelo registro de composições, escrito em "passos"',
  envolve: 'a faixa `envolve` não tem operação equivalente no núcleo',
  usa: 'a instância de componente não é traduzida; o componente vira receita própria ou família',
  espelha: 'o espelho não é traduzido; no núcleo ele é `espelha`, escrito em "passos"',
  arranja: 'o arranjo não é traduzido; no núcleo ele é `arranja`, escrito em "passos"',
  subtrai: 'o recorte não é traduzido; no núcleo ele é `subtrair`, escrito em "passos"',
  cortador: 'o cortador não é traduzido; no núcleo ele é o segundo sólido de `subtrair`, escrito em "passos"',
  encosta: '`encosta` não é traduzido; o 2.0 posiciona por centro, sobre, ponta e desloca, e no núcleo há `encostar`',
  alinha: '`alinha` não é traduzido; o 2.0 posiciona por centro, sobre, ponta e desloca',
  de: 'a haste por `de`/`para` não é traduzida; o 2.0 posiciona por centro, sobre, ponta, desloca e rotacao',
  para: 'a haste por `de`/`para` não é traduzida; o 2.0 posiciona por centro, sobre, ponta, desloca e rotacao',
  encaixa: '`encaixa` (âncora com giro) não é traduzido; o 2.0 posiciona pela caixa da malha',
  unidade: 'as unidades do Condutor não existem no 2.0',
  casca: 'a casca do loft não é traduzida; no núcleo ela é `subtrair` do loft recuado, escrito em "passos"',
};

const erro = (motivo) => { throw new RecusaDoEsboco(motivo); };
const num = (x) => typeof x === 'number' && Number.isFinite(x);
const positivo = (x, campo) => { if (!num(x) || x <= 0) erro(`"${campo}" precisa ser um número positivo em mm (expressão e parâmetro não são traduzidos)`); return x; };
const area2 = (p) => p.reduce((s, q, i) => s + q[0] * p[(i + 1) % p.length][1] - p[(i + 1) % p.length][0] * q[1], 0);
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const eixoVetor = (e) => EIXOS.map((x) => (x === e ? 1 : 0));

function circulo(r, n = LADOS_DO_CIRCULO) {
  return Array.from({ length: n }, (_, k) => { const t = (2 * Math.PI * k) / n; return [r * Math.cos(t), r * Math.sin(t)]; });
}

/** Leva um ponto [u, v] do plano do esboço (eixo `e`) a um ponto [u', v'] do plano da extrusão do núcleo no mesmo eixo. */
function paraOPlanoDaExtrusao(e, [u, v]) {
  const [eu, ev] = PLANO_ANTIGO[e];
  const mundo = [0, 0, 0]; mundo[IDX[eu]] = u; mundo[IDX[ev]] = v;
  const [U, V] = PLANO_DA_EXTRUSAO[e];
  return [dot(mundo, U), dot(mundo, V)];
}

/** Corta um polígono convexo pelo semiplano n·p <= c. */
function cortarPoligono(pts, n, c) {
  const saida = [];
  for (let i = 0; i < pts.length; i += 1) {
    const a = pts[i]; const b = pts[(i + 1) % pts.length];
    const da = n[0] * a[0] + n[1] * a[1] - c; const db = n[0] * b[0] + n[1] * b[1] - c;
    if (da <= 0) saida.push(a);
    if ((da < 0 && db > 0) || (da > 0 && db < 0)) { const t = da / (da - db); saida.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]); }
  }
  return saida;
}

/** O retângulo de cantos redondos do esboço, em sentido anti-horário, com os cantos na ordem [+u+v, -u+v, -u-v, +u-v]. */
function arredondado(lu, lv, cantos, segmentos) {
  const lista = Array.isArray(cantos) ? cantos : [cantos ?? 0, cantos ?? 0, cantos ?? 0, cantos ?? 0];
  if (lista.length !== 4) erro('"cantos" é um número ou uma lista de 4 cantos');
  const raios = lista.map((c) => (Array.isArray(c) ? c : [c, c]));
  for (const r of raios) if (!r.every((x) => num(x) && x >= 0)) erro('"cantos" precisa de raios em número (expressão não é traduzida)');
  const hu = lu / 2; const hv = lv / 2;
  const centros = [[hu, hv, 0], [-hu, hv, Math.PI / 2], [-hu, -hv, Math.PI], [hu, -hv, (3 * Math.PI) / 2]];
  const pts = [];
  centros.forEach(([cu, cv, a0], k) => {
    const [ru, rv] = raios[k];
    const su = Math.sign(cu); const sv = Math.sign(cv);
    if (ru === 0 || rv === 0) { pts.push([cu, cv]); return; }
    const ou = cu - su * ru; const ov = cv - sv * rv;
    for (let s = 0; s <= segmentos; s += 1) { const t = a0 + ((Math.PI / 2) * s) / segmentos; pts.push([ou + ru * Math.cos(t), ov + rv * Math.sin(t)]); }
  });
  /* tira pontos repetidos (dois cantos que se encontram no meio de um lado) */
  return pts.filter((p, i) => { const q = pts[(i + 1) % pts.length]; return Math.hypot(p[0] - q[0], p[1] - q[1]) > 1e-9; });
}

/** Os pontos [u, v] (mm) de uma seção do loft, já com o centro, em sentido anti-horário; `null` na seção ponto. */
function pontosDaSecao(s, onde) {
  const forma = s.forma ?? 'retangulo';
  const centro = s.centro ?? [0, 0];
  if (!Array.isArray(centro) || centro.length !== 2 || !centro.every(num)) erro(`${onde}: "centro" da seção é [u, v] em mm`);
  if (s.inclinacao !== undefined && !(Array.isArray(s.inclinacao) && s.inclinacao.every((x) => x === 0))) erro(`${onde}: a seção inclinada não tem equivalente no loft do núcleo, cujas seções são perpendiculares ao caminho`);
  let pts;
  if (forma === 'poligono') {
    if (!Array.isArray(s.perfil) || s.perfil.length < 3 || !s.perfil.every((p) => Array.isArray(p) && p.length === 2 && p.every(num))) erro(`${onde}: o polígono precisa de "perfil" com 3 ou mais pontos [u, v] em número`);
    pts = s.perfil.map((p) => [...p]);
  } else {
    if (!Array.isArray(s.tamanho) || s.tamanho.length !== 2 || !s.tamanho.every((x) => num(x) && x >= 0)) erro(`${onde}: "tamanho" é [u, v] em mm (expressão não é traduzida)`);
    const [lu, lv] = s.tamanho;
    if (lu === 0 && lv === 0) return null;
    if (forma === 'elipse') pts = Array.from({ length: LADOS_DA_ELIPSE }, (_, k) => { const t = (2 * Math.PI * k) / LADOS_DA_ELIPSE; return [(lu / 2) * Math.cos(t), (lv / 2) * Math.sin(t)]; });
    else if (forma === 'arredondado') pts = arredondado(lu, lv, s.cantos ?? 0, s.segmentosPorCanto ?? 4);
    else if (forma === 'retangulo') pts = s.raio ? arredondado(lu, lv, s.raio, 8) : [[lu / 2, -lv / 2], [lu / 2, lv / 2], [-lu / 2, lv / 2], [-lu / 2, -lv / 2]];
    else erro(`${onde}: forma de seção "${forma}" não existe (retangulo, elipse, arredondado ou poligono)`);
  }
  if (area2(pts) < 0) pts.reverse();
  return pts.map(([u, v]) => [u + centro[0], v + centro[1]]);
}

/** Reamostra um polígono em `n` raios a partir de `c`: o ponto de cada raio é onde ele cruza a borda. */
function amostrarRadial(pts, c, n) {
  const saida = [];
  for (let k = 0; k < n; k += 1) {
    const t = (2 * Math.PI * k) / n; const d = [Math.cos(t), Math.sin(t)];
    let melhor = 0;
    for (let i = 0; i < pts.length; i += 1) {
      const a = [pts[i][0] - c[0], pts[i][1] - c[1]]; const b = [pts[(i + 1) % pts.length][0] - c[0], pts[(i + 1) % pts.length][1] - c[1]];
      const e = [b[0] - a[0], b[1] - a[1]];
      const den = d[0] * e[1] - d[1] * e[0];
      if (Math.abs(den) < 1e-12) continue;
      const s = (a[0] * e[1] - a[1] * e[0]) / den; const u = (a[0] * d[1] - a[1] * d[0]) / den;
      if (s > 0 && u >= -1e-9 && u <= 1 + 1e-9) melhor = Math.max(melhor, s);
    }
    saida.push([c[0] + d[0] * melhor, c[1] + d[1] * melhor]);
  }
  return saida;
}

/** A tangente PCHIP (Fritsch e Carlson) dos valores `y` nas posições `x`. */
function tangentesPchip(x, y) {
  const n = x.length; const h = []; const delta = [];
  for (let i = 0; i < n - 1; i += 1) { h.push(x[i + 1] - x[i]); delta.push((y[i + 1] - y[i]) / h[i]); }
  const m = new Array(n).fill(0);
  if (n === 2) return [delta[0], delta[0]];
  for (let i = 1; i < n - 1; i += 1) {
    if (delta[i - 1] * delta[i] <= 0) m[i] = 0;
    else { const w1 = 2 * h[i] + h[i - 1]; const w2 = h[i] + 2 * h[i - 1]; m[i] = (w1 + w2) / (w1 / delta[i - 1] + w2 / delta[i]); }
  }
  const ponta = (h0, h1, d0, d1) => { let t = ((2 * h0 + h1) * d0 - h0 * d1) / (h0 + h1); if (Math.sign(t) !== Math.sign(d0)) t = 0; else if (Math.sign(d0) !== Math.sign(d1) && Math.abs(t) > Math.abs(3 * d0)) t = 3 * d0; return t; };
  m[0] = ponta(h[0], h[1], delta[0], delta[1]);
  m[n - 1] = ponta(h[n - 2], h[n - 3] ?? h[n - 2], delta[n - 2], delta[n - 3] ?? delta[n - 2]);
  return m;
}

/** As seções do loft suave: as declaradas e `ESTACOES_DO_SUAVE` entre cada duas, cada ponto pela cúbica de Hermite com a tangente
 *  PCHIP ao longo da posição; um trecho em que as duas seções são iguais continua reto. */
function densificarSuave(posicoes, contornos) {
  const n = contornos[0].length;
  const tang = [];
  for (let p = 0; p < n; p += 1) tang.push([0, 1].map((c) => tangentesPchip(posicoes, contornos.map((ct) => ct[p][c]))));
  const saida = [{ pos: posicoes[0], pts: contornos[0] }];
  for (let i = 0; i < posicoes.length - 1; i += 1) {
    const h = posicoes[i + 1] - posicoes[i];
    for (let s = 1; s <= ESTACOES_DO_SUAVE; s += 1) {
      const t = s / (ESTACOES_DO_SUAVE + 1);
      const h00 = 2 * t ** 3 - 3 * t ** 2 + 1; const h10 = t ** 3 - 2 * t ** 2 + t; const h01 = -2 * t ** 3 + 3 * t ** 2; const h11 = t ** 3 - t ** 2;
      saida.push({ pos: posicoes[i] + t * h, pts: contornos[i].map((q, p) => [0, 1].map((c) => h00 * q[c] + h10 * h * tang[p][c][i] + h01 * contornos[i + 1][p][c] + h11 * h * tang[p][c][i + 1])) });
    }
    saida.push({ pos: posicoes[i + 1], pts: contornos[i + 1] });
  }
  return saida;
}

/** O gerador (op e args, em metro) e a caixa local esperada (mm) de uma forma do esboço antigo. */
function traduzirGerador(f) {
  const t = f.tipo;
  if (t === 'caixa') {
    const [L, A, P] = [positivo(f.largura, 'largura'), positivo(f.altura, 'altura'), positivo(f.profundidade, 'profundidade')];
    const esperado = [L, A, P];
    if (f.chanfro !== undefined) {
      positivo(f.chanfro, 'chanfro');
      if (f.raio !== undefined || f.furos || f.furo) erro('"chanfro" não combina com "raio" nem com furos');
      return { op: 'chamferBox', args: { larg: mm(L), alt: mm(A), prof: mm(P), chanfro: mm(f.chanfro) }, esperado };
    }
    const furos = (f.furos ?? (f.furo ? [f.furo] : [])).map((h, k) => {
      positivo(h.diametro, `furos[${k}].diametro`);
      const c = h.centro ?? [0, 0];
      return { circulo: { raio: mm(h.diametro / 2), centro: [mm(c[0]), mm(c[1])] } };
    });
    if (f.raio || furos.length) {
      if (f.raio !== undefined && !(num(f.raio) && f.raio >= 0)) erro('"raio" da caixa é um número em mm');
      return { op: 'extrusao', args: { eixo: 'y', altura: mm(A), perfil: { retangulo: { largura: mm(L), profundidade: mm(P), ...(f.raio ? { cantos: mm(f.raio) } : {}) } }, ...(furos.length ? { furos } : {}), segmentosArco: 6 }, esperado };
    }
    return { op: 'cubo', args: { larg: mm(L), alt: mm(A), prof: mm(P) }, esperado };
  }
  if (t === 'cilindro') {
    const d = positivo(f.diametro, 'diametro'); const c = positivo(f.comprimento, 'comprimento');
    const e = f.eixo ?? 'y'; if (!EIXOS.includes(e)) erro('"eixo" é x, y ou z');
    const esperado = [d, d, d]; esperado[IDX[e]] = c;
    const lados = f.lados ?? LADOS_DO_CIRCULO;
    if (f.achatado) {
      const { lado, profundidade } = f.achatado;
      if (!/^[+-][xyz]$/.test(lado ?? '') || lado[1] === e) erro('"achatado.lado" é um lado perpendicular ao eixo');
      positivo(profundidade, 'achatado.profundidade');
      const [eu] = PLANO_ANTIGO[e];
      const s = lado[0] === '+' ? 1 : -1;
      const n = lado[1] === eu ? [s, 0] : [0, s];
      const perfil = cortarPoligono(circulo(d / 2, lados), n, d / 2 - profundidade).map((p) => paraOPlanoDaExtrusao(e, p).map(mm));
      esperado[IDX[lado[1]]] = d - profundidade;
      return { op: 'extrusao', args: { eixo: e, altura: mm(c), perfil }, esperado, achatado: true };
    }
    return { op: 'cilindro', args: { raio: mm(d / 2), altura: mm(c), lados, eixo: e }, esperado, raioDoCirculo: d / 2, lados };
  }
  if (t === 'anel') {
    const de = positivo(f.diametroExterno, 'diametroExterno'); const esp = positivo(f.espessura, 'espessura');
    const di = f.diametroInterno;
    if (!num(di) || di < 0 || di >= de) erro('"diametroInterno" fica entre 0 e o diâmetro externo');
    const e = f.eixo ?? 'y'; if (!EIXOS.includes(e)) erro('"eixo" é x, y ou z');
    const esperado = [de, de, de]; esperado[IDX[e]] = esp;
    return { op: 'extrusao', args: { eixo: e, altura: mm(esp), perfil: { circulo: { raio: mm(de / 2) } }, ...(di > 0 ? { furos: [{ circulo: { raio: mm(di / 2) } }] } : {}), segmentosArco: 12 }, esperado, raioDoCirculo: de / 2, lados: 48 };
  }
  if (t === 'cone') {
    const d0 = positivo(f.diametro, 'diametro'); const c = positivo(f.comprimento, 'comprimento');
    const d1 = f.diametroTopo ?? 0;
    if (!num(d1) || d1 < 0 || d1 === d0) erro('"diametroTopo" é 0 (a ponta) ou um tronco diferente do diâmetro');
    const e = f.eixo ?? 'y'; if (!EIXOS.includes(e)) erro('"eixo" é x, y ou z');
    const perfil = d1 > 0 ? [[0, 0], [mm(d0 / 2), 0], [mm(d1 / 2), mm(c)], [0, mm(c)]] : [[0, 0], [mm(d0 / 2), 0], [0, mm(c)]];
    const dm = Math.max(d0, d1); const esperado = [dm, dm, dm]; esperado[IDX[e]] = c;
    return { op: 'lathe', args: { perfil, eixo: e, lados: LADOS_DO_CIRCULO }, esperado, raioDoCirculo: dm / 2, lados: LADOS_DO_CIRCULO };
  }
  if (t === 'esfera') {
    const d = positivo(f.diametro, 'diametro');
    return { op: 'esfera', args: { raio: mm(d / 2) }, esperado: [d, d, d], raioDoCirculo: d / 2, lados: 16 };
  }
  if (t === 'extrusao') {
    const c = positivo(f.comprimento, 'comprimento');
    const e = f.eixo ?? 'y'; if (!EIXOS.includes(e)) erro('"eixo" é x, y ou z');
    if (!Array.isArray(f.perfil) || f.perfil.length < 3 || !f.perfil.every((p) => Array.isArray(p) && p.length === 2 && p.every(num))) erro('"perfil" é uma lista de 3 ou mais pontos [u, v] em número (gerador e expressão não são traduzidos)');
    if (f.origem !== undefined && f.origem !== 'caixa' && f.origem !== 'perfil') erro('"origem" da extrusão é "caixa" ou "perfil"');
    const us = f.perfil.map((p) => p[0]); const vs = f.perfil.map((p) => p[1]);
    const caixaPerfil = [Math.min(...us), Math.max(...us), Math.min(...vs), Math.max(...vs)];
    const [eu, ev] = PLANO_ANTIGO[e];
    const esperado = [0, 0, 0]; esperado[IDX[eu]] = caixaPerfil[1] - caixaPerfil[0]; esperado[IDX[ev]] = caixaPerfil[3] - caixaPerfil[2]; esperado[IDX[e]] = c;
    /* com origem "perfil" o centro da forma é a origem do perfil, e o centro da caixa fica no meio da caixa do perfil */
    const desvioDoCentro = [0, 0, 0];
    if (f.origem === 'perfil') { desvioDoCentro[IDX[eu]] = (caixaPerfil[0] + caixaPerfil[1]) / 2; desvioDoCentro[IDX[ev]] = (caixaPerfil[2] + caixaPerfil[3]) / 2; }
    return { op: 'extrusao', args: { eixo: e, altura: mm(c), perfil: f.perfil.map((p) => paraOPlanoDaExtrusao(e, p).map(mm)) }, esperado, desvioDoCentro };
  }
  if (t === 'loft') {
    const e = f.eixo ?? 'y'; if (!EIXOS.includes(e)) erro('"eixo" é x, y ou z');
    if (!Array.isArray(f.secoes) || f.secoes.length < 2) erro('o loft precisa de 2 ou mais "secoes"');
    if (f.suave !== undefined && typeof f.suave !== 'boolean') erro('"suave" é true ou false');
    const lidas = f.secoes.map((s, i) => {
      for (const k of Object.keys(s)) if (!['pos', 'forma', 'tamanho', 'perfil', 'raio', 'centro', 'nome', 'cantos', 'segmentosPorCanto', 'inclinacao', 'aresta'].includes(k)) erro(`secoes[${i}]: campo "${k}" não é traduzido`);
      if (!num(s.pos)) erro(`secoes[${i}]: "pos" é um número em mm`);
      return { pos: s.pos, pts: pontosDaSecao(s, `secoes[${i}]`), centro: s.centro ?? [0, 0] };
    });
    lidas.forEach((s, i) => { if (i > 0 && !(s.pos > lidas[i - 1].pos)) erro(`secoes[${i}]: as posições vão em ordem crescente`); });
    if (lidas.slice(1, -1).some((s) => !s.pts)) erro('só a primeira e a última seção podem ser ponto');
    const comPontos = lidas.filter((s) => s.pts);
    const contagens = new Set(comPontos.map((s) => s.pts.length));
    const n = contagens.size === 1 ? [...contagens][0] : LADOS_DA_ELIPSE;
    for (const s of lidas) if (s.pts && contagens.size > 1) s.pts = amostrarRadial(s.pts, s.centro, n);
    let estacoes = lidas.map((s) => ({ pos: s.pos, pts: s.pts, centro: s.centro }));
    if (f.suave === true && lidas.every((s) => s.pts)) estacoes = densificarSuave(lidas.map((s) => s.pos), lidas.map((s) => s.pts));
    else if (f.suave === true) erro('o loft suave com ponta em ponto não é traduzido');
    /* o plano da seção do esboço levado ao do loft do núcleo: +u é a orientação, +w é orientação × tangente */
    const tangente = eixoVetor(e); const O = ORIENTACAO_DO_LOFT[e]; const W = cruz(O, tangente);
    const [eu, ev] = PLANO_ANTIGO[e];
    const paraLoft = ([u, v]) => { const m = [0, 0, 0]; m[IDX[eu]] = u; m[IDX[ev]] = v; return [mm(dot(m, O)), mm(dot(m, W))]; };
    let contornos = estacoes.map((s) => (s.pts ? s.pts.map(paraLoft) : null));
    const amostra = contornos.find(Boolean);
    if (area2(amostra) < 0) contornos = contornos.map((c) => (c ? [...c].reverse() : c));
    /* O caminho é a reta do eixo, e todo polo (a seção ponto e a tampa) fica nela: o loft do núcleo põe cada seção perpendicular
       à tangente do caminho, e um polo fora da reta inclinaria as seções das pontas. A seção ponto com centro deslocado e a tampa
       de uma seção que não envolve o eixo (o leque do polo cruzaria a borda) ficam sem equivalente. */
    const pos = (p) => tangente.map((x) => x * mm(p));
    const envolveOEixo = (pts) => pts.every((q, i) => { const r = pts[(i + 1) % pts.length]; return q[0] * r[1] - q[1] * r[0] > 0; });
    for (const s of estacoes) if (!s.pts && (s.centro ?? [0, 0]).some((x) => x !== 0)) erro('a seção ponto com "centro" deslocado não tem equivalente no loft do núcleo, cujo caminho é a reta do eixo');
    const secoes = [];
    const primeira = estacoes[0]; const ultima = estacoes[estacoes.length - 1];
    for (const s of [primeira, ultima]) if (s.pts && !envolveOEixo(s.pts)) erro('a tampa do loft vai ao eixo, e a seção da ponta não o envolve (o centro dela está deslocado demais)');
    if (primeira.pts) secoes.push({ pos: pos(primeira.pos - EPSILON_DA_TAMPA * 1000), raio: 0 });
    estacoes.forEach((s, i) => secoes.push(contornos[i] ? { pos: pos(s.pos), contorno: contornos[i] } : { pos: pos(s.pos), raio: 0 }));
    if (ultima.pts) secoes.push({ pos: pos(ultima.pos + EPSILON_DA_TAMPA * 1000), raio: 0 });
    /* a caixa esperada: a das seções declaradas no plano e as posições no eixo */
    const todos = comPontos.flatMap((s) => s.pts);
    const esperado = [0, 0, 0];
    esperado[IDX[eu]] = Math.max(...todos.map((p) => p[0])) - Math.min(...todos.map((p) => p[0]));
    esperado[IDX[ev]] = Math.max(...todos.map((p) => p[1])) - Math.min(...todos.map((p) => p[1]));
    esperado[IDX[e]] = ultima.pos - primeira.pos + (primeira.pts ? EPSILON_DA_TAMPA * 1000 : 0) + (ultima.pts ? EPSILON_DA_TAMPA * 1000 : 0);
    return { op: 'loft', args: { lados: n, orientacao: O, secoes }, esperado, folga: f.suave ? 1 : 0 };
  }
  if (t === 'revolucao') {
    if (f.suave) erro('a revolução suave não é traduzida (o lathe do núcleo concorda por raio, e não pela curva PCHIP)');
    const e = f.eixo ?? 'y'; if (!EIXOS.includes(e)) erro('"eixo" é x, y ou z');
    if (!Array.isArray(f.perfil) || f.perfil.length < 2) erro('"perfil" é uma lista de 2 ou mais pontos [raio, altura]');
    const pts = f.perfil.map((p) => (Array.isArray(p) ? p : [p.raio, p.altura]));
    if (!pts.every((p) => p.every(num))) erro('o perfil da revolução precisa de números');
    const perfil = pts.map(([r, h]) => [mm(r), mm(h)]);
    if (perfil[0][0] > 0) perfil.unshift([0, perfil[0][1]]);
    if (perfil[perfil.length - 1][0] > 0) perfil.push([0, perfil[perfil.length - 1][1]]);
    const rm = Math.max(...pts.map((p) => p[0])); const esperado = [2 * rm, 2 * rm, 2 * rm]; esperado[IDX[e]] = pts[pts.length - 1][1] - pts[0][1];
    return { op: 'lathe', args: { perfil, eixo: e, lados: f.lados ?? LADOS_DO_CIRCULO }, esperado, raioDoCirculo: rm, lados: f.lados ?? LADOS_DO_CIRCULO };
  }
  if (POR_QUE_NAO[t]) return erro(POR_QUE_NAO[t]);
  return erro(`tipo "${t}" não é traduzido (os tipos são ${Object.keys(POR_TIPO).join(', ')})`);
}

/** Confere a caixa da malha do gerador contra a medida declarada, em mm. */
function conferir(g) {
  const { neutro } = executarReceita({ meta: { nome: 'conferencia' }, PASSOS: [[g.op, { origemId: 1, ...g.args }]] });
  if (neutro.orfaos?.length) erro(`o núcleo recusou o ${g.op}: ${neutro.orfaos[0].motivo}`);
  const c = caixaDaMalha(neutro);
  const tamanho = c.tamanho.map((x) => x * 1000);
  const flecha = g.raioDoCirculo ? g.raioDoCirculo * (1 - Math.cos(Math.PI / (g.lados ?? LADOS_DO_CIRCULO))) * 2 : 0;
  const tol = TOLERANCIA_MM + flecha + (g.folga ?? 0);
  const k = [0, 1, 2].find((i) => Math.abs(tamanho[i] - g.esperado[i]) > tol);
  if (k !== undefined) erro(`a malha do ${g.op} não confere com a medida declarada em ${EIXOS[k]}: ${tamanho[k].toFixed(2)} mm contra ${g.esperado[k].toFixed(2)} mm`);
  return { tamanhoMm: tamanho, esperadoMm: g.esperado };
}

/** Uma forma do esboço antigo em forma do 2.0 (metro), com a conferência. */
export function traduzirForma(f) {
  if (!f || typeof f !== 'object') erro('a forma precisa ser um objeto');
  if (typeof f.id !== 'string') erro('a forma precisa de "id"');
  if (POR_QUE_NAO[f.tipo]) erro(POR_QUE_NAO[f.tipo]);
  if (f.usa !== undefined) erro(POR_QUE_NAO.usa);
  if (f.espelha !== undefined) erro(POR_QUE_NAO.espelha);
  for (const k of Object.keys(f)) {
    if (POR_QUE_NAO[k]) erro(POR_QUE_NAO[k]);
    if (!COMUNS.includes(k) && !(POR_TIPO[f.tipo] ?? []).includes(k)) erro(`campo "${k}" não é traduzido para o núcleo`);
  }
  const g = traduzirGerador(f);
  const conferencia = conferir(g);
  const forma = { id: f.id, op: g.op, args: g.args };
  if (f.centro !== undefined) {
    if (!Array.isArray(f.centro) || f.centro.length !== 3 || !f.centro.every(num)) erro('"centro" por âncora, ponto nomeado ou "entre" não é traduzido; o 2.0 aceita o vetor [x, y, z]');
    forma.centro = f.centro.map((x, k) => mm(x + (g.desvioDoCentro?.[k] ?? 0)));
  }
  if (f.sobre !== undefined) forma.sobre = f.sobre;
  if (f.ponta !== undefined) forma.ponta = f.ponta;
  if (f.desloca !== undefined) {
    if (!Array.isArray(f.desloca) || f.desloca.length !== 3 || !f.desloca.every(num)) erro('"desloca" é [dx, dy, dz] em mm');
    forma.desloca = f.desloca.map(mm);
  }
  if (f.rotacao !== undefined) {
    const r = Array.isArray(f.rotacao) ? f.rotacao : { eixo: f.rotacao?.eixo, graus: f.rotacao?.angulo ?? f.rotacao?.graus };
    lerRotacao(r, null);
    forma.rotacao = r;
  }
  if (f.oculto === true) forma.oculto = true;
  if (f.cor !== undefined) forma.cor = f.cor;
  if (f.rotulo !== undefined) forma.rotulo = f.rotulo;
  /* sem posição, o esboço punha o centro da forma na origem; o atalho deixaria a forma onde o gerador a pôs */
  if (forma.centro === undefined && forma.sobre === undefined && forma.ponta === undefined) forma.centro = [0, 0, 0].map((_, k) => mm(g.desvioDoCentro?.[k] ?? 0));
  return { forma, conferencia };
}

/** A vista da bancada que corresponde à do esboço antigo. */
export const VISTA_DA_BANCADA = Object.freeze({ frontal: 'frontal', lateral: 'direita', superior: 'superior', isometrica: 'isometrica', traseira: 'traseira', inferior: 'inferior', esquerda: 'esquerda', direita: 'direita' });

/** Um esboço do 2.0 tem opções com `passos` ou formas com `op`/`ajudante`; o antigo tem formas com `tipo`. */
export function formatoDoEsboco(json) {
  const formas = (json?.opcoes ?? []).flatMap((o) => o?.formas ?? []);
  if (json?.formato === 'esboco-nucleo@1') return 'nucleo';
  if ((json?.opcoes ?? []).some((o) => o?.passos) || formas.some((f) => f?.op || f?.ajudante)) return 'nucleo';
  return 'antigo';
}

/**
 * Lê um esboço (o antigo, de opções de forma, ou o do 2.0) e devolve as opções no formato do 2.0.
 * @returns {{ formato: 'antigo'|'nucleo', vista: string, opcoes: Array, recusas: Array<{opcao, forma, motivo}>, conferencias: Array }}
 */
export function lerEsboco(json) {
  const recusas = []; const conferencias = [];
  if (!json || typeof json !== 'object' || !Array.isArray(json.opcoes) || !json.opcoes.length) {
    return { formato: null, vista: null, opcoes: [], recusas: [{ opcao: null, forma: null, motivo: 'o esboço precisa de "opcoes", uma lista com pelo menos uma opção' }], conferencias };
  }
  const formato = formatoDoEsboco(json);
  const vista = VISTA_DA_BANCADA[json.vista ?? 'isometrica'] ?? null;
  if (!vista) recusas.push({ opcao: null, forma: null, motivo: `vista "${json.vista}" não existe na bancada` });
  if (formato === 'nucleo') return { formato, vista, opcoes: json.opcoes, recusas, conferencias };
  for (const k of Object.keys(json)) if (!RAIZ_ACEITA.has(k)) recusas.push({ opcao: null, forma: null, motivo: `campo da raiz "${k}" não é traduzido (o 2.0 lê opcoes, vista, plano e legendas)` });
  const opcoes = json.opcoes.map((o, i) => {
    const titulo = o?.titulo ?? `opção ${i + 1}`;
    for (const k of Object.keys(o ?? {})) if (!OPCAO_ACEITA.has(k)) recusas.push({ opcao: titulo, forma: null, motivo: `campo da opção "${k}" não é traduzido` });
    const formas = [];
    for (const f of o?.formas ?? []) {
      try {
        const { forma, conferencia } = traduzirForma(f);
        formas.push(forma);
        conferencias.push({ opcao: titulo, forma: f.id, tipo: f.tipo, op: forma.op, ...conferencia });
      } catch (e) {
        if (!(e instanceof RecusaDoEsboco)) throw e;
        recusas.push({ opcao: titulo, forma: f?.id ?? null, motivo: e.motivo });
      }
    }
    return { titulo, nota: o?.nota ?? '', formas };
  });
  return { formato, vista, opcoes, recusas, conferencias };
}
