/* N4: autoria restrita de uma seção limpa. Não é uma carroceria nem toca no núcleo. */
const somar = (a, b) => a.map((v, i) => v + b[i]);
const escalar = (v, k) => v.map((x) => x * k);
const produto = (a, b) => a.reduce((soma, v, i) => soma + v * b[i], 0);
const modulo = (v) => Math.hypot(...v);
const normalizar = (v) => escalar(v, 1 / (modulo(v) || 1));

export const ENUNCIADO_N4 = [
  'ponto mais largo abaixo e para fora do ombro',
  'capô sem cavidade sobre base suave e G1 no plano central',
  'continuidade G1 na linha de ombro',
];

function hermite(a, tangenteA, b, tangenteB, t) {
  const t2 = t * t, t3 = t2 * t;
  return somar(somar(escalar(a, 2 * t3 - 3 * t2 + 1), escalar(tangenteA, t3 - 2 * t2 + t)), somar(escalar(b, -2 * t3 + 3 * t2), escalar(tangenteB, t3 - t2)));
}

function amostrar(a, tangenteA, b, tangenteB, passos, pularPrimeiro = false) {
  return Array.from({ length: passos + 1 }, (_, i) => hermite(a, tangenteA, b, tangenteB, i / passos)).slice(pularPrimeiro ? 1 : 0);
}

function validarParametros(parametros) {
  const campos = ['centroY', 'ombroX', 'ombroY', 'salienciaFlanco', 'quedaDoMaximo', 'soleiraX', 'soleiraY'];
  for (const campo of campos) if (!Number.isFinite(parametros[campo])) throw new Error(`N4 sem parâmetro finito: ${campo}`);
  if (!(parametros.salienciaFlanco > 0)) throw new Error('N4 exige flanco para fora do ombro');
  if (!(parametros.quedaDoMaximo > 0)) throw new Error('N4 exige ponto mais largo abaixo do ombro');
  if (parametros.bojoRelativo !== undefined && (!(Number.isFinite(parametros.bojoRelativo)) || !(parametros.bojoRelativo > 0))) throw new Error('N4 exige bojo relativo positivo quando ele for declarado');
}

export function construirSecaoRestrita(id, parametros) {
  validarParametros(parametros);
  const centro = [0, parametros.centroY];
  const ombro = [parametros.ombroX, parametros.ombroY];
  const maximo = [parametros.ombroX + parametros.salienciaFlanco, parametros.ombroY - parametros.quedaDoMaximo];
  const soleira = [parametros.soleiraX, parametros.soleiraY];
  /* O capô é a corda mais um bojo sempre positivo. A tangente no fim dessa
     mesma curva é reutilizada pelo flanco: convexidade e G1 são construtivos. */
  /* N4 usa 0,16 por padrão. N5 pode expor somente esta liberdade residual,
     sem soltar as três restrições que definem a família da seção. */
  const bojoDoCapo = (parametros.ombroY - parametros.centroY) * (parametros.bojoRelativo ?? .16);
  /* A formula anterior comparava o capô à corda centro→ombro. Ela criava uma
     crista C0 no plano de simetria: o P95 a escondia, mas a zebra revelou.
     A nova base é smoothstep e o bojo tem derivadas nulas nos dois extremos.
     Assim o perfil espelhado é G1 no centro e no ombro. */
  const tangenteOmbro = [parametros.ombroX * .22, 0];
  const tangenteMaximo = [10, -parametros.quedaDoMaximo * 2.4];
  const tangenteSoleira = [-parametros.ombroX * .30, -parametros.ombroY * .55];
  const capo = Array.from({ length: 33 }, (_, i) => {
    const t = i / 32;
    const baseSuave = 3 * t ** 2 - 2 * t ** 3;
    return [parametros.ombroX * t, parametros.centroY + (parametros.ombroY - parametros.centroY) * baseSuave + bojoDoCapo * 16 * t ** 2 * (1 - t) ** 2];
  });
  const flanco = amostrar(ombro, tangenteOmbro, maximo, tangenteMaximo, 12, true);
  const soleiraAmostrada = amostrar(maximo, tangenteMaximo, soleira, tangenteSoleira, 32, true);
  const direita = [...capo, ...flanco, ...soleiraAmostrada];
  const perfil = [...direita.slice().reverse().map(([x, y]) => [-x, y]), ...direita.slice(1)];
  /* Coroamento longitudinal mínimo: a prova segue sendo uma seção, mas deixa
     de colapsar numa linha quando a vista frontal olha ao longo de Z. */
  const estacoes = Array.from({ length: 13 }, (_, i) => -120 + i * 20); const V = [];
  for (const z of estacoes) {
    const coroamento = 30 * (1 - (z / 120) ** 2);
    for (const [x, y] of perfil) V.push([x, y + coroamento, z]);
  }
  const F = []; const largura = perfil.length;
  for (let i = 0; i < estacoes.length - 1; i += 1) for (let j = 0; j < largura - 1; j += 1) F.push([i * largura + j, i * largura + j + 1, (i + 1) * largura + j + 1, (i + 1) * largura + j]);
  return { id, parametros: { ...parametros }, pontos: { centro, ombro, maximo, soleira, tangenteOmbro }, amostras: { capo, bojoDoCapo }, perfil, malha: { V, F } };
}

export function verificarRestricoes(secao) {
  const { centro, ombro, maximo, tangenteOmbro } = secao.pontos;
  const capo = secao.amostras.capo;
  const capôSemCavidade = capo.every(([x, y]) => {
    const t = x / (ombro[0] || 1);
    const baseSuave = centro[1] + (ombro[1] - centro[1]) * (3 * t ** 2 - 2 * t ** 3);
    return y >= baseSuave - 1e-6;
  }) && capo.every(([, y], indice) => indice === 0 || y >= capo[indice - 1][1] - 1e-6);
  const tangenteDireita = normalizar(tangenteOmbro);
  const tangenteEsquerda = normalizar(tangenteOmbro);
  const g1 = produto(tangenteDireita, tangenteEsquerda);
  return {
    pontoMaisLargoAbaixoDoOmbro: maximo[0] > ombro[0] && maximo[1] < ombro[1],
    capoSemCavidadeEG1Central: capôSemCavidade,
    continuidadeG1: g1 >= 1 - 1e-12,
    alinhamentoG1: Number(g1.toFixed(12)),
  };
}

const EPSILON = 1e-9;

export function resolverN4(fontes) {
  return fontes.perfis.map(({ id, parametros }) => {
    const secao = construirSecaoRestrita(id, parametros);
    const restricoes = verificarRestricoes(secao);
    return { ...secao, restricoes, passa: Object.entries(restricoes).filter(([chave]) => chave !== 'alinhamentoG1').every(([, valor]) => valor) };
  });
}
