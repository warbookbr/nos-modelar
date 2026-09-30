/* `--ajustar`: aplica no JSON declarado as sugestões de contato do gate e reexecuta o gate, até aprovar,
   até uma rodada não reduzir os achados ou até o limite de rodadas. Altera só o campo de posição das formas
   movidas (`centro` numérico simples, ou `desloca`, somado ao que já existe); parâmetros, expressões,
   relações e os outros campos ficam como estavam. Puro: não lê nem grava arquivo. */
import { ErroDeEsboco } from './index.js';
import { verificarContato } from './contato.js';
import { temRelacaoDePosicao } from './conserto.js';
import { componente } from './componentes.js';

export const MAXIMO_DE_RODADAS = 5;
const arred1 = (x) => Math.round(x * 10) / 10;
const limpar = (x) => Math.round(x * 1e6) / 1e6;
const clone = (v) => JSON.parse(JSON.stringify(v));
const mm1 = (x) => arred1(x).toString().replace('.', ',');
const vetor = (v) => `[${v.map(mm1).join(' ')}]`;

/* Soma `d` a um elemento do vetor: número soma direto; parâmetro ou "=expressão" vira "=expressão+d". */
function somaEm(x, d) {
  if (typeof x === 'number') return limpar(x + d);
  if (d === 0) return x;
  const expr = x.startsWith('=') ? `(${x.slice(1)})` : x;
  return `=${expr}${d > 0 ? '+' : '-'}${Math.abs(d)}`;
}

/* Forma declarada com o id dado na opção `indice` (ou na raiz, se a opção herda as formas dela). */
function formaDeclarada(bruto, indice, id) {
  const opcao = bruto.opcoes?.[indice];
  const lista = Array.isArray(opcao?.formas) ? opcao.formas : bruto.formas;
  return (Array.isArray(lista) ? lista : []).find((f) => f && f.id === id) ?? null;
}

/* Soma `delta` à posição da forma declarada. Devolve { campo, antes, depois } ou null se a forma não existe. */
export function aplicarDeslocamento(bruto, indice, id, delta) {
  let f = formaDeclarada(bruto, indice, id);
  if (!f) {
    /* forma principal de um componente: quem se move é a instância, pelo `desloca` que o componente declara */
    const i = id.indexOf('.');
    const instancia = i > 0 ? formaDeclarada(bruto, indice, id.slice(0, i)) : null;
    if (instancia?.usa === undefined) return null;
    const comp = componente(instancia.usa, `instância "${instancia.id}"`);
    if (comp.principal !== id.slice(i + 1) || !Object.hasOwn(comp.entradas ?? {}, 'desloca')) return null;
    f = instancia;
  }
  const editaCentro = f.usa === undefined ? !temRelacaoDePosicao(f) : (Array.isArray(f.centro) && f.centro.every((x) => typeof x === 'number') && Object.keys(f).every((k) => !['sobre', 'ponta', 'encosta', 'alinha', 'de', 'para'].includes(k)));
  const campo = editaCentro ? 'centro' : 'desloca';
  const antes = f[campo] === undefined ? null : clone(f[campo]);
  const base = f[campo] ?? [0, 0, 0];
  if (!Array.isArray(base) || base.length !== 3) return null;
  f[campo] = base.map((x, i) => somaEm(x, delta[i]));
  return { campo, antes, depois: clone(f[campo]) };
}

/* Sugestões aplicáveis de uma rodada: no máximo uma por forma, e nenhuma que arraste (ou seja arrastada por)
   outra já escolhida, pois a soma dos dois vetores passaria do que cada um mediu. */
function escolher(achados, titulos) {
  const escolhidas = [];
  const movidas = new Map();
  const arrastadas = new Map();
  for (const a of achados) {
    const s = a.sugestao;
    if (!s?.aplicavel || !s.fonte) continue;
    const indice = titulos.indexOf(a.opcao);
    if (indice < 0) continue;
    const m = movidas.get(indice) ?? new Set(); const d = arrastadas.get(indice) ?? new Set();
    if (d.has(s.fonte) || s.arrasta.some((x) => m.has(x))) continue;
    m.add(s.fonte); s.arrasta.forEach((x) => d.add(x));
    movidas.set(indice, m); arrastadas.set(indice, d);
    escolhidas.push({ indice, achado: a, sugestao: s });
  }
  return escolhidas;
}

const titulosDe = (bruto) => (bruto.opcoes ?? []).map((o, i) => o?.titulo ?? `Opção ${i + 1}`);

/* Resultado: { esboco, aprovado, parou, rodadas, inicial, final }. `parou`: 'ja-aprovava', 'aprovou',
   'sem-progresso' (a rodada não reduziu os achados e foi descartada), 'sem-sugestao' ou 'limite'. */
export function ajustarEsboco(bruto, { maxRodadas = MAXIMO_DE_RODADAS } = {}) {
  let atual = clone(bruto);
  let gate = verificarContato(atual);
  if (!gate.usar) throw new ErroDeEsboco('--ajustar precisa do gate de contato ligado: declare "contato": { "usar": true } no esboço');
  const inicial = gate;
  const titulos = titulosDe(atual);
  const rodadas = [];
  let parou = gate.resultado === 'aprovado' ? 'ja-aprovava' : 'limite';
  for (let n = 1; parou === 'limite' && n <= maxRodadas; n++) {
    const propostas = escolher(gate.achados, titulos);
    if (propostas.length === 0) { parou = 'sem-sugestao'; break; }
    const candidato = clone(atual);
    const movidos = [];
    for (const p of propostas) {
      const ed = aplicarDeslocamento(candidato, p.indice, p.sugestao.fonte, p.sugestao.delta);
      if (ed) movidos.push({ opcao: p.achado.opcao, forma: p.sugestao.forma, fonte: p.sugestao.fonte, delta: p.sugestao.delta, achado: p.achado.tipo, texto: p.sugestao.texto, ...ed });
    }
    const depois = verificarContato(candidato);
    const rodada = { rodada: n, achados_antes: gate.achados.length, achados_depois: depois.achados.length, movidos };
    if (depois.achados.length >= gate.achados.length) {
      rodadas.push({ ...rodada, descartada: true });
      parou = 'sem-progresso';
      break;
    }
    rodadas.push(rodada);
    atual = candidato; gate = depois;
    if (gate.resultado === 'aprovado') parou = 'aprovou';
  }
  return { esboco: atual, aprovado: gate.resultado === 'aprovado', parou, rodadas, inicial, final: gate };
}

/* JSON com o mesmo recuo do original (2 espaços se não der para saber) e a mesma quebra final. */
export function serializarComoOriginal(esboco, textoOriginal) {
  const recuo = /^([ \t]+)"/m.exec(textoOriginal)?.[1] ?? '  ';
  return `${JSON.stringify(esboco, null, recuo)}${/\n$/.test(textoOriginal) ? '\n' : ''}`;
}

const FRASE_DA_PARADA = {
  'ja-aprovava': 'o gate já aprovava; nada a ajustar',
  aprovou: 'o gate aprovou',
  'sem-progresso': 'parou: a última rodada não reduziu os achados e foi descartada',
  'sem-sugestao': 'parou: os achados que sobraram não têm sugestão aplicável (ajuste à mão)',
  limite: `parou no limite de ${MAXIMO_DE_RODADAS} rodadas`,
};

/* Texto do relato do ajuste (sem a linha do arquivo gravado). */
export function formatarAjuste(res, descreverAchado) {
  const L = [`gate antes: ${res.inicial.achados.length} achado${res.inicial.achados.length === 1 ? '' : 's'} de contato`];
  for (const r of res.rodadas) {
    L.push(`rodada ${r.rodada}: ${r.achados_antes} achados viram ${r.achados_depois}${r.descartada ? ' (descartada)' : ''}`);
    for (const m of r.movidos) L.push(`  moveu ${m.forma}${m.fonte === m.forma ? '' : ` (pela fonte ${m.fonte})`} [${m.opcao}] em ${vetor(m.delta)} mm: ${m.campo} ${m.antes === null ? '(novo)' : JSON.stringify(m.antes)} -> ${JSON.stringify(m.depois)}`);
  }
  L.push(`${FRASE_DA_PARADA[res.parou]}${res.parou === 'aprovou' ? ` na rodada ${res.rodadas.length}` : ''}`);
  if (!res.aprovado) for (const a of res.final.achados) L.push(`  sobrou: ${descreverAchado(a)}`);
  return L.join('\n');
}
