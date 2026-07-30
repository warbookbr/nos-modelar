/* estado-bancada.js — estado headless e determinístico da bancada de inspeção. */
export const VISTAS_BANCADA = Object.freeze({
  isometrica: Object.freeze({
    nome: 'Isométrica',
    direcao: Object.freeze([1, 0.72, 1]),
    atalho: '0',
  }),
  frontal: Object.freeze({
    nome: 'Frontal',
    direcao: Object.freeze([0, 0, 1]),
    atalho: '1',
  }),
  traseira: Object.freeze({
    nome: 'Traseira',
    direcao: Object.freeze([0, 0, -1]),
    atalho: 'Shift+1',
  }),
  direita: Object.freeze({
    nome: 'Direita',
    direcao: Object.freeze([1, 0, 0]),
    atalho: '3',
  }),
  esquerda: Object.freeze({
    nome: 'Esquerda',
    direcao: Object.freeze([-1, 0, 0]),
    atalho: 'Shift+3',
  }),
  superior: Object.freeze({
    nome: 'Superior',
    direcao: Object.freeze([0, 1, 0]),
    atalho: '7',
  }),
  inferior: Object.freeze({
    nome: 'Inferior',
    direcao: Object.freeze([0, -1, 0]),
    atalho: 'Shift+7',
  }),
});

const MODOS = new Set(['todas', 'contexto', 'isolar']);

export function normalizarSelecao(nomes, disponiveis) {
  const permitidos = disponiveis instanceof Set ? disponiveis : new Set(disponiveis);
  return [...new Set(nomes)].filter((nome) => permitidos.has(nome)).sort();
}

export function alternarSelecao(atual, nome, aditiva = false) {
  const proxima = new Set(aditiva ? atual : []);
  if (aditiva && proxima.has(nome)) proxima.delete(nome);
  else proxima.add(nome);
  return [...proxima].sort();
}

export function estadoVisualDasPartes(partes, selecionadas, modo = 'todas') {
  const selecao = selecionadas instanceof Set ? selecionadas : new Set(selecionadas);
  const modoSeguro = MODOS.has(modo) ? modo : 'todas';
  return Object.fromEntries(partes.map((nome) => {
    if (!selecao.size) return [nome, 'normal'];
    if (selecao.has(nome)) return [nome, 'destaque'];
    if (modoSeguro === 'isolar') return [nome, 'oculto'];
    if (modoSeguro === 'contexto') return [nome, 'fantasma'];
    return [nome, 'normal'];
  }));
}

function direcaoFallback(nome) {
  let hash = 2166136261;
  for (const caractere of nome) {
    hash ^= caractere.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  const angulo = ((hash >>> 0) % 360) * Math.PI / 180;
  const y = ((((hash >>> 8) % 100) / 100) - 0.5) * 0.6;
  const vetor = [Math.cos(angulo), y, Math.sin(angulo)];
  const tamanho = Math.hypot(...vetor) || 1;
  return vetor.map((valor) => valor / tamanho);
}

export function calcularVetoresExplosao(partes, centro = [0, 0, 0]) {
  const saida = {};
  for (const parte of [...partes].sort((a, b) => a.nome.localeCompare(b.nome))) {
    const vetor = parte.centro.map((valor, eixo) => valor - centro[eixo]);
    const tamanho = Math.hypot(...vetor);
    saida[parte.nome] = tamanho > 1e-5
      ? vetor.map((valor) => valor / tamanho)
      : direcaoFallback(parte.nome);
  }
  return saida;
}

export function lerEstadoDaUrl(params, nomesDisponiveis) {
  const vista = VISTAS_BANCADA[params.get('vista')] ? params.get('vista') : 'isometrica';
  const modo = MODOS.has(params.get('modo')) ? params.get('modo') : 'todas';
  const projecao = params.get('projecao') === 'ortografica' ? 'ortografica' : 'perspectiva';
  const explosaoLida = Number(params.get('explosao'));
  const explosao = Number.isFinite(explosaoLida)
    ? Math.min(1, Math.max(0, explosaoLida))
    : 0;
  const selecionadas = normalizarSelecao(
    (params.get('selecionadas') ?? '').split(',').filter(Boolean),
    nomesDisponiveis,
  );
  return { vista, modo, projecao, explosao, selecionadas };
}

export function escreverEstadoNaUrl(estado) {
  const params = new URLSearchParams();
  if (estado.selecionadas?.length) params.set('selecionadas', [...estado.selecionadas].sort().join(','));
  if (estado.vista && estado.vista !== 'isometrica') params.set('vista', estado.vista);
  if (estado.projecao === 'ortografica') params.set('projecao', 'ortografica');
  if (estado.modo && estado.modo !== 'todas') params.set('modo', estado.modo);
  if (estado.explosao > 0) params.set('explosao', Number(estado.explosao).toFixed(2));
  return params.toString();
}
