/* milimetro.js — o esboço 2.0 é escrito em milímetro, como o esboço antigo, e o núcleo trabalha em metro: este arquivo converte.
 *
 * A conversão é por tabela, campo a campo, porque um número de um passo do núcleo pode ser medida (o raio, a altura, o ponto do
 * perfil), ângulo, contagem ou identidade, e só a medida se divide por mil. A TABELA diz, por operação, quais campos são medida;
 * neles todo número se divide por mil, em qualquer profundidade, menos os que estão sob as chaves de `NAO_MEDIDA` (o `angulo` do
 * arco, os `lados` do círculo, os segmentos). Os campos de `SEMPRE_LIVRES` não são medida em operação nenhuma (a identidade, a
 * seleção sem região, o eixo, os graus, as contagens) e passam como estão. A seleção (`sel`, `referencia`, `selPara`) passa, menos
 * a `regiao`, que é medida. Qualquer outro campo com número é recusado com o nome dele, e assim a operação ou o campo que a
 * tabela não conhece nunca chega ao núcleo mil vezes maior: ela volta com o motivo, para entrar na tabela.
 *
 * O nome de ponto (texto) passa como está, e o ponto que ele cita, no `topo` da opção, se converte por `pontoEmMetro`. A
 * expressão no lugar de um número de medida é recusada, porque a conversão dela dependeria da conta. Núcleo puro. */
import { RecusaDoEsboco } from './erros.js';

export const MM = 1000;
const mm = (x) => x / MM;

/* sob estas chaves, dentro de um campo de medida, o número não é medida */
const NAO_MEDIDA = new Set(['angulo', 'lados', 'segmentos', 'segmentosArco', 'segmentosSpline', 'segmentosCurva', 'segmentosPorCanto', 'limite', 'peso', 'tangente']);
/* campos que não são medida em operação nenhuma */
const SEMPRE_LIVRES = new Set(['origemId', 'id', 'faces', 'nome', 'pai', 'substituir', 'eixo', 'graus', 'volta', 'total', 'modo', 'nomes', 'derivaDe',
  'solidos', 'solido', 'usa', 'cor', 'vista', 'lente', 'niveis', 'borda', 'simetria', 'pesoPadrao', 'lado', 'liso', 'quebraNosVincos', 'compartilha', 'lados', 'segmentos',
  'segmentosArco', 'segmentosSpline', 'segmentosCurva', 'aneis', 'seg', 'orientacao', 'direcao', 'de', 'saida', 'aresta', 'chapa', 'superficie',
  'tampa', 'linha', 'ponta', 'paineis', 'cadeia', 'vincos', 'cantos', 'medidas', 'v', 'f', 'face', 'a', 'b', 'para', 'interface', 'rotulo', 'angulo',
  'divisoes', 'estacoes', 'expoenteSecao', 'limite', 'refinar']);
const SELECOES = new Set(['sel', 'referencia', 'selPara']);

/** Os campos de medida de cada operação. */
export const TABELA_DE_MEDIDAS = Object.freeze({
  cubo: ['lado', 'larg', 'alt', 'prof', 'em'],
  chamferBox: ['lado', 'larg', 'alt', 'prof', 'chanfro', 'em'],
  cilindro: ['raio', 'altura', 'em'],
  cone: ['raio', 'altura', 'em'],
  esfera: ['raio', 'em'],
  plano: ['largura', 'profundidade', 'em'],
  extrusao: ['perfil', 'furos', 'deslocar', 'altura', 'em'],
  lathe: ['perfil', 'furos', 'deslocar', 'em'],
  loft: ['secoes'],
  inflate: ['contornoLado', 'contornoTopo'],
  transladar: ['d'],
  rotaciona: ['pivo'],
  espelha: ['pos'],
  arranja: ['d', 'pivo'],
  encostar: ['folga'],
  parte: ['pivo'],
  furo: ['profundidade', 'centro', 'centros', 'ate', 'raio'],
  arredondarAresta: ['raio'],
  filete: ['raio'],
  moveV: ['d'], moveF: ['d'], moveA: ['d'], extruda: ['dist'],
  subdivisao: ['vertices', 'espessura'],
  aberturaPorContorno: ['contorno', 'recuoDaLente'],
  arredondarCostura: ['raio', 'raioMinimo', 'afinarPontas', 'regiao', 'aparar'],
  friso: ['perfil', 'fechamento', 'aba'],
  limparLascas: ['tolerancia', 'areaMinima'],
  aparar: ['folga', 'fecha', 'limpar'],
});

const temNumero = (v) => (typeof v === 'number' ? true : Array.isArray(v) ? v.some(temNumero) : v && typeof v === 'object' ? Object.values(v).some(temNumero) : false);

/* todo número da medida dividido por mil, menos sob as chaves que não são medida */
function medida(v, onde) {
  if (typeof v === 'number') return mm(v);
  if (Array.isArray(v)) {
    /* uma lista que começa por texto e não é de pontos é uma expressão (['+', 'a', 10]) */
    if (typeof v[0] === 'string' && v.length > 1 && v.slice(1).some((x) => typeof x === 'number')) throw new RecusaDoEsboco(`a expressão ${JSON.stringify(v)} no lugar de uma medida não é convertida para metro; escreva o número em mm`, onde);
    return v.map((x) => medida(x, onde));
  }
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, NAO_MEDIDA.has(k) ? x : medida(x, `${onde}.${k}`)]));
  return v;
}

function selecao(v, onde) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return v;
  return Object.fromEntries(Object.entries(v).map(([k, x]) => {
    if (k === 'regiao') return [k, medida(x, `${onde}.regiao`)];
    if (k === 'onde' && x && typeof x === 'object' && x.conexo != null) {
      /* conexo: `de` e `ate` são medidas e `dir` é só direção; o resto de `onde`, com número, segue recusado */
      const { conexo, ...resto } = x;
      if (temNumero(resto)) throw new RecusaDoEsboco('o filtro "onde" com número não é convertido para metro; selecione por grupo, origem ou região', `${onde}.onde`);
      const c = { ...conexo };
      if (c.de != null) c.de = medida(c.de, `${onde}.onde.conexo.de`);
      if (c.ate != null) c.ate = medida(c.ate, `${onde}.onde.conexo.ate`);
      return [k, { ...resto, conexo: c }];
    }
    if (k === 'onde' && temNumero(x)) throw new RecusaDoEsboco('o filtro "onde" com número não é convertido para metro; selecione por grupo, origem ou região', `${onde}.onde`);
    return [k, x];
  }));
}

/** Os argumentos de um passo do núcleo escritos em mm, em metro. Recusa o campo com número que a tabela não conhece. */
export function argsEmMetro(op, args, onde = `passo "${op}"`) {
  if (!args || typeof args !== 'object' || Array.isArray(args)) return args;
  const medidas = TABELA_DE_MEDIDAS[op] ?? [];
  const saida = {};
  for (const [k, v] of Object.entries(args)) {
    /* o `raio` pedido de um vinco do passo `subdivisao` é medida; o resto do vinco (nome, pontos, nitidez) passa */
    if (op === 'subdivisao' && k === 'vincos' && Array.isArray(v)) saida[k] = v.map((x) => (x && typeof x === 'object' && x.raio != null ? { ...x, raio: medida(x.raio, `${onde}.vincos.raio`) } : x));
    else if (medidas.includes(k)) saida[k] = medida(v, `${onde}.${k}`);
    else if (SELECOES.has(k)) saida[k] = selecao(v, `${onde}.${k}`);
    else if (SEMPRE_LIVRES.has(k) || !temNumero(v)) saida[k] = v;
    else {
      const conhecida = TABELA_DE_MEDIDAS[op] ? `a tabela de "${op}" não tem o campo "${k}"` : `a operação "${op}" não está na tabela de medidas`;
      throw new RecusaDoEsboco(`${conhecida} (modulos/esboco-nucleo/src/milimetro.js): o 2.0 é em mm e não sabe se o número é medida; acrescente-o à tabela`, onde);
    }
  }
  return saida;
}

/** Um passo `[op, args]` escrito em mm, em metro. */
export const passoEmMetro = ([op, args], onde) => [op, argsEmMetro(op, args, onde ?? `passo "${op}"`)];

/** Um ponto [x, y, z] em mm, em metro; o texto (nome de ponto) passa. */
export const pontoEmMetro = (p) => (Array.isArray(p) ? p.map((x) => (typeof x === 'number' ? mm(x) : x)) : p);
