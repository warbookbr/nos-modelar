/* perfis.js — seções transversais da estrutura de barras: tubo redondo, quadrado, retangular e cantoneira, em geometria pura. */

/* Todo perfil é descrito no plano (x, y) da barra, com a origem no centroide da seção: o eixo da barra passa pelo centroide, e é por
   isso que um corte plano que passa pelo ponto do eixo no nó não ganha nem perde volume nas barras que se encontram ali. */

const EPS = 1e-9;
export const LADOS_PADRAO_DO_TUBO_REDONDO = 24;

export class ErroDeEstrutura extends Error { constructor(mensagem) { super(`estruturaDeBarras: ${mensagem}`); this.name = 'ErroDeEstrutura'; } }
export const mostrar = (valor) => { try { return JSON.stringify(valor) ?? String(valor); } catch { return String(valor); } };
/* Recusa com o campo, o valor recebido e o que é aceito. */
export function recusar(campo, valor, aceito) { throw new ErroDeEstrutura(`${campo} = ${mostrar(valor)} não é aceito; ${aceito}`); }

export const TIPOS_DE_PERFIL = Object.freeze({
  'tubo-redondo': Object.freeze({ medidas: ['diametro'], opcionais: ['parede', 'lados'], texto: 'diametro (> 0), parede (opcional, > 0 e < diametro/2) e lados (opcional, inteiro par de 8 a 96)' }),
  'tubo-quadrado': Object.freeze({ medidas: ['lado'], opcionais: ['parede'], texto: 'lado (> 0) e parede (opcional, > 0 e < lado/2)' }),
  'tubo-retangular': Object.freeze({ medidas: ['largura', 'altura'], opcionais: ['parede'], texto: 'largura (> 0, na direção x do perfil), altura (> 0, na direção y) e parede (opcional, > 0 e < metade da menor medida)' }),
  cantoneira: Object.freeze({ medidas: ['aba'], opcionais: ['aba2', 'espessura'], texto: 'aba (> 0), espessura (> 0 e < menor aba) e aba2 (opcional, > 0, igual a aba por padrão)', obrigatorios: ['aba', 'espessura'] }),
});
const TEXTO_DOS_TIPOS = Object.keys(TIPOS_DE_PERFIL).join(', ');

function positivo(campo, valor, numero) {
  let n;
  try { n = numero(valor); } catch (erro) { recusar(campo, valor, `número finito maior que zero, nome de parâmetro ou expressão (${String(erro.message).replace(/^.*?: /, '')})`); }
  if (typeof n !== 'number' || !Number.isFinite(n) || !(n > 0)) recusar(campo, valor, 'número finito maior que zero');
  return n;
}

/* Valida um perfil e devolve seus números resolvidos. `onde` é o caminho do campo na chamada, ex.: barras[2].perfil. */
export function normalizarPerfil(bruto, onde, numero) {
  if (!bruto || typeof bruto !== 'object' || Array.isArray(bruto)) recusar(onde, bruto, `objeto com tipo (${TEXTO_DOS_TIPOS}) e as medidas do tipo`);
  const modelo = TIPOS_DE_PERFIL[bruto.tipo];
  if (!modelo) recusar(`${onde}.tipo`, bruto.tipo, `um destes: ${TEXTO_DOS_TIPOS}`);
  const aceitas = ['tipo', ...modelo.medidas, ...modelo.opcionais, ...(modelo.obrigatorios ?? [])];
  for (const chave of Object.keys(bruto)) if (!aceitas.includes(chave)) recusar(`${onde}.${chave}`, bruto[chave], `campo do tipo '${bruto.tipo}': ${modelo.texto}`);
  const perfil = { tipo: bruto.tipo };
  for (const medida of new Set([...modelo.medidas, ...(modelo.obrigatorios ?? [])])) {
    if (bruto[medida] === undefined) recusar(`${onde}.${medida}`, undefined, `obrigatório no tipo '${bruto.tipo}': ${modelo.texto}`);
    perfil[medida] = positivo(`${onde}.${medida}`, bruto[medida], numero);
  }
  if (bruto.tipo === 'cantoneira') {
    perfil.aba2 = bruto.aba2 === undefined ? perfil.aba : positivo(`${onde}.aba2`, bruto.aba2, numero);
    if (!(perfil.espessura < Math.min(perfil.aba, perfil.aba2) - EPS)) recusar(`${onde}.espessura`, bruto.espessura, `menor que a menor aba (${Math.min(perfil.aba, perfil.aba2)})`);
    perfil.parede = null;
  } else {
    perfil.parede = bruto.parede === undefined ? null : positivo(`${onde}.parede`, bruto.parede, numero);
    if (perfil.parede !== null) {
      const menor = bruto.tipo === 'tubo-redondo' ? perfil.diametro : bruto.tipo === 'tubo-quadrado' ? perfil.lado : Math.min(perfil.largura, perfil.altura);
      if (!(perfil.parede < menor / 2 - EPS)) recusar(`${onde}.parede`, bruto.parede, `menor que a metade da menor medida do perfil (${menor / 2}); sem parede o perfil é maciço`);
    }
  }
  if (bruto.tipo === 'tubo-redondo') {
    const lados = bruto.lados === undefined ? LADOS_PADRAO_DO_TUBO_REDONDO : numero(bruto.lados);
    if (!Number.isInteger(lados) || lados < 8 || lados > 96 || lados % 2) recusar(`${onde}.lados`, bruto.lados, 'inteiro par de 8 a 96');
    perfil.lados = lados;
  }
  return Object.freeze(perfil);
}

const area = (pontos) => pontos.reduce((soma, p, i) => { const q = pontos[(i + 1) % pontos.length]; return soma + (p[0] * q[1] - q[0] * p[1]) / 2; }, 0);
function centroide(pontos) {
  const a = area(pontos);
  let cx = 0, cy = 0;
  pontos.forEach((p, i) => { const q = pontos[(i + 1) % pontos.length], c = p[0] * q[1] - q[0] * p[1]; cx += (p[0] + q[0]) * c; cy += (p[1] + q[1]) * c; });
  return [cx / (6 * a), cy / (6 * a)];
}
function dentroDoPoligono(pontos, x, y) {
  let dentro = false;
  for (let i = 0, j = pontos.length - 1; i < pontos.length; j = i++) {
    const [xi, yi] = pontos[i], [xj, yj] = pontos[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) dentro = !dentro;
  }
  return dentro;
}
function distanciaAoSegmento(x, y, p, q) {
  const dx = q[0] - p[0], dy = q[1] - p[1], t = Math.max(0, Math.min(1, ((x - p[0]) * dx + (y - p[1]) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(x - (p[0] + t * dx), y - (p[1] + t * dy));
}

/* Contornos (anti-horário o externo, horário o furo, centrados no centroide), áreas e testes da seção.
   `areaNominal` é a da seção como se fabrica (círculo exato no tubo redondo) e vale para o peso por metro; `areaMalha` é a do polígono
   que vira malha, e é ela que o volume da malha reproduz. */
export function secao(perfil) {
  let externo, furo = null, areaNominal, contem;
  const t = perfil.parede;
  if (perfil.tipo === 'tubo-redondo') {
    const n = perfil.lados, R = perfil.diametro / 2, r = t === null ? null : R - t;
    const anel = (raio) => Array.from({ length: n }, (_, k) => [raio * Math.cos(2 * Math.PI * k / n), raio * Math.sin(2 * Math.PI * k / n)]);
    externo = anel(R); furo = r === null ? null : anel(r);
    areaNominal = Math.PI * (R * R - (r ?? 0) * (r ?? 0));
    contem = (x, y, folga = 0) => Math.hypot(x, y) <= R + folga;
  } else if (perfil.tipo === 'cantoneira') {
    const a = perfil.aba, b = perfil.aba2, e = perfil.espessura;
    const bruto = [[0, 0], [a, 0], [a, e], [e, e], [e, b], [0, b]], [cx, cy] = centroide(bruto);
    externo = bruto.map(([x, y]) => [x - cx, y - cy]);
    areaNominal = area(externo);
    contem = (x, y, folga = 0) => dentroDoPoligono(externo, x, y) || externo.some((p, i) => distanciaAoSegmento(x, y, p, externo[(i + 1) % externo.length]) <= folga + EPS);
  } else {
    const w = perfil.tipo === 'tubo-quadrado' ? perfil.lado : perfil.largura, h = perfil.tipo === 'tubo-quadrado' ? perfil.lado : perfil.altura;
    const caixa = (a, b) => [[-a / 2, -b / 2], [a / 2, -b / 2], [a / 2, b / 2], [-a / 2, b / 2]];
    externo = caixa(w, h); furo = t === null ? null : caixa(w - 2 * t, h - 2 * t);
    areaNominal = w * h - (t === null ? 0 : (w - 2 * t) * (h - 2 * t));
    contem = (x, y, folga = 0) => Math.abs(x) <= w / 2 + folga && Math.abs(y) <= h / 2 + folga;
  }
  return Object.freeze({
    perfil, externo, furo, areaNominal, areaMalha: area(externo) - (furo ? area(furo) : 0), contem,
    raioCircunscrito: Math.max(...externo.map(([x, y]) => Math.hypot(x, y))),
    chave: JSON.stringify(Object.entries(perfil).sort(([a], [b]) => (a < b ? -1 : 1))),
  });
}
