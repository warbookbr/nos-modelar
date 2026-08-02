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
const PRECISAO_CAMERA_LIVRE = 5;
const LIMITE_COORDENADA_CAMERA = 100;
const LIMITE_URL_CAMERA = 180;
const COMPONENTES_CAMERA_LIVRE = 10;

function numeroDaCamera(valor) {
  return typeof valor === 'number'
    && Number.isFinite(valor)
    && Math.abs(valor) <= LIMITE_COORDENADA_CAMERA
    ? valor
    : null;
}

function vetorDaCamera(valor) {
  if (!Array.isArray(valor) || valor.length !== 3) return null;
  const vetor = valor.map(numeroDaCamera);
  return vetor.every((componente) => componente !== null) ? vetor : null;
}

/* A câmera é dado de mundo, nunca objeto do Three.js: posição, alvo, vetor
   acima e zoom são suficientes para reconstruir a órbita nas duas projeções.
   O intervalo é muito maior que o estúdio e impede URL acidentalmente enorme
   ou coordenada não finita de atravessar para o renderer. */
export function normalizarCameraLivre(camera) {
  if (!camera || typeof camera !== 'object') return null;
  const posicao = vetorDaCamera(camera.posicao);
  const alvo = vetorDaCamera(camera.alvo);
  const acima = vetorDaCamera(camera.acima);
  const zoom = numeroDaCamera(camera.zoom);
  const comprimentoAcima = acima ? Math.hypot(...acima) : 0;
  if (!posicao || !alvo || !acima || zoom === null
    || comprimentoAcima < 0.99 || comprimentoAcima > 1.01
    || zoom < 0.05 || zoom > 20
    || Math.hypot(...posicao.map((valor, eixo) => valor - alvo[eixo])) < 0.001) return null;
  return {
    posicao: posicao.map((valor) => Object.is(valor, -0) ? 0 : valor),
    alvo: alvo.map((valor) => Object.is(valor, -0) ? 0 : valor),
    acima: acima.map((valor) => Object.is(valor, -0) ? 0 : valor),
    zoom: Object.is(zoom, -0) ? 0 : zoom,
  };
}

function formatarNumeroDaCamera(valor) {
  const seguro = Math.abs(valor) < 0.5 * 10 ** -PRECISAO_CAMERA_LIVRE ? 0 : valor;
  return seguro.toFixed(PRECISAO_CAMERA_LIVRE);
}

export function escreverCameraLivreNaUrl(camera) {
  const segura = normalizarCameraLivre(camera);
  if (!segura) return null;
  return [...segura.posicao, ...segura.alvo, ...segura.acima, segura.zoom]
    .map(formatarNumeroDaCamera)
    .join(',');
}

export function lerCameraLivreDaUrl(valor) {
  if (typeof valor !== 'string' || !valor || valor.length > LIMITE_URL_CAMERA) return null;
  const componentes = valor.split(',');
  if (componentes.length !== COMPONENTES_CAMERA_LIVRE
    || componentes.some((componente) => !/^-?\d{1,3}(?:\.\d{1,5})?$/.test(componente))) return null;
  const numeros = componentes.map(Number);
  return normalizarCameraLivre({
    posicao: numeros.slice(0, 3),
    alvo: numeros.slice(3, 6),
    acima: numeros.slice(6, 9),
    zoom: numeros[9],
  });
}

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
    /* No isolamento, a lista lateral já conserva a seleção. Tingir a única
       geometria visível destrói justamente a cor e o acabamento que se quer
       revisar. O realce material continua nos modos montagem e contexto. */
    if (selecao.has(nome)) return [nome, modoSeguro === 'isolar' ? 'normal' : 'destaque'];
    if (modoSeguro === 'isolar') return [nome, 'oculto'];
    if (modoSeguro === 'contexto') return [nome, 'fantasma'];
    return [nome, 'normal'];
  }));
}

/* O enquadramento tem dois alvos deliberadamente diferentes: a montagem inteira
   e a seleção. Em contexto, aproximar uma peça pequena sem incluir a montagem
   desfaz o propósito do modo; por isso a raiz entra como margem espacial. */
export function alvosDeEnquadramento({ raiz, selecionados = [], modo = 'todas', alvo = 'selecao' }) {
  if (alvo === 'montagem' || !selecionados.length) return raiz ? [raiz] : [];
  return modo === 'contexto' && raiz ? [raiz, ...selecionados] : selecionados;
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
  const cameraLivre = params.get('vista') === 'livre'
    ? lerCameraLivreDaUrl(params.get('camera'))
    : null;
  const vista = cameraLivre
    ? 'livre'
    : (VISTAS_BANCADA[params.get('vista')] ? params.get('vista') : 'isometrica');
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
  return { vista, modo, projecao, explosao, selecionadas, cameraLivre };
}

export function escreverEstadoNaUrl(estado) {
  const params = new URLSearchParams();
  const cameraLivre = estado.vista === 'livre' ? escreverCameraLivreNaUrl(estado.cameraLivre) : null;
  if (estado.selecionadas?.length) params.set('selecionadas', [...estado.selecionadas].sort().join(','));
  if (cameraLivre) {
    params.set('vista', 'livre');
    params.set('camera', cameraLivre);
  } else if (VISTAS_BANCADA[estado.vista] && estado.vista !== 'isometrica') {
    params.set('vista', estado.vista);
  }
  if (estado.projecao === 'ortografica') params.set('projecao', 'ortografica');
  if (estado.modo && estado.modo !== 'todas') params.set('modo', estado.modo);
  if (estado.explosao > 0) params.set('explosao', Number(estado.explosao).toFixed(2));
  return params.toString();
}
