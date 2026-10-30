/* azimute-da-luz.js — a direção da luz rasante no quadro da câmera e a escolha do azimute dela pelo que a câmera vê, as mesmas
 * contas de `direcao_da_luz` e `escolher_azimutes` de `tools/blender/superficie.py`, portadas sem Three e sem DOM.
 *
 * A luz rasante da bancada e a das vistas obrigatórias do Blender usam a mesma definição: a câmera olha ao longo de -z_cam, e a
 * luz viaja com `sin(rasante)` ao longo do olhar e `cos(rasante)` dentro do plano da imagem, na direção `azimute` medida de x_cam
 * para y_cam. Por isso a luz da bancada acompanha a câmera quando a peça gira: ela fica sempre a `rasante` graus do plano da
 * imagem, como em cada vista do Blender.
 *
 * O que muda é a amostra e o número de luzes. O Blender escolhe pelos pixels que a câmera vê, com a sombra de cada um, e escolhe um
 * par de azimutes, um por imagem; a bancada passa as normais dos triângulos voltados para a câmera, pesadas pela área projetada,
 * sem oclusão e sem sombra (`amostrasDaVista`), e escolhe um azimute só (`unico`). A conta da fração de cada azimute é a mesma, e o
 * teste a compara com a do Python sobre as mesmas normais. */

export const RASANTE_GRAUS = 10;
export const RASA_ATE_GRAUS = 30;
export const AZIMUTE_PREFERIDO = 30;

const RAD = Math.PI / 180;
const modulo360 = (a) => ((a % 360) + 360) % 360;
const arredondar4 = (x) => Math.round(x * 1e4) / 1e4;

/**
 * O vetor unitário pelo qual a luz viaja, no quadro do mundo, para a câmera de eixos `xCam`, `yCam` e `zCam` (a câmera olha ao
 * longo de -zCam), como `superficie.direcao_da_luz`.
 */
export function direcaoDaLuz({ xCam, yCam, zCam }, rasanteGraus, azimuteGraus) {
  const g = rasanteGraus * RAD;
  const az = azimuteGraus * RAD;
  const d = [0, 1, 2].map((k) => Math.cos(g) * (Math.cos(az) * xCam[k] + Math.sin(az) * yCam[k]) - Math.sin(g) * zCam[k]);
  const l = Math.hypot(d[0], d[1], d[2]);
  return d.map((c) => c / l);
}

/* O cosseno entre cada normal (3 números por amostra) e o lado de onde a luz vem, com 0 onde a amostra fica de costas para ela. */
function luzNasAmostras(N, vista, rasanteGraus, azimuteGraus) {
  const d = direcaoDaLuz(vista, rasanteGraus, azimuteGraus);
  const n = N.length / 3;
  const c = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const v = N[3 * i] * -d[0] + N[3 * i + 1] * -d[1] + N[3 * i + 2] * -d[2];
    c[i] = v > 0 ? v : 0;
  }
  return c;
}

/**
 * Os dois azimutes da luz rasante de uma vista, como `superficie.escolher_azimutes` sem a sombra: cada azimute da grade de `passo`
 * graus vale a fração das amostras que a luz alcança a até `rasaAte` graus da superfície delas, o par (a, a + separacao) vale a
 * menor das duas, e entre os pares a até `folga` do melhor fica o de primeiro azimute mais perto de `preferido`. `normais` tem 3
 * números por amostra; as viradas para longe da câmera entram viradas para ela. `pesos` (opcional) dá a área de cada amostra;
 * sem ele, cada uma pesa o mesmo, como os pixels do Blender. Devolve `{ azimutes: [a, b], estimativa }`, com a fração rasante e
 * a alcançada de cada um, arredondadas a quatro casas como no Python.
 *
 * Com `unico`, a escolha é para uma luz só, a da bancada: a mesma fração rasante de cada azimute, e entre os que ficam a até
 * `folga` da melhor, o que alcança a maior fração da peça vista (no empate, o mais perto de `preferido`). O par do Blender existe
 * porque ele faz duas imagens por vista; com uma luz, o primeiro do par podia deixar escuro metade do que a câmera vê (na
 * carenagem de prova em três quartos, 350 graus alcançava 40 % da peça vista, e 240 graus, com quase a mesma fração rasante,
 * 91 %). Devolve `{ azimutes: [a], estimativa, fracoes }`, com as frações de todos os azimutes.
 */
export function escolherAzimutes(normais, vista, rasanteGraus = RASANTE_GRAUS, {
  pesos = null, passo = 10, separacao = 90, preferido = AZIMUTE_PREFERIDO, folga = 0.05, rasaAte = RASA_ATE_GRAUS, unico = false,
} = {}) {
  if (separacao % passo || 360 % passo) throw new RangeError(`passo ${passo} precisa dividir 360 e a separação ${separacao}`);
  const n = Math.floor(normais.length / 3);
  if (!n) return { azimutes: [preferido, modulo360(preferido + separacao)], estimativa: {} };
  const z = vista.zCam;
  const N = new Float64Array(3 * n);
  for (let i = 0; i < n; i++) {
    const x = normais[3 * i]; const y = normais[3 * i + 1]; const w = normais[3 * i + 2];
    const s = x * z[0] + y * z[1] + w * z[2] < 0 ? -1 : 1;
    N[3 * i] = s * x; N[3 * i + 1] = s * y; N[3 * i + 2] = s * w;
  }
  let total = 0;
  for (let i = 0; i < n; i++) total += pesos ? pesos[i] : 1;
  const media = (f) => {
    let soma = 0;
    for (let i = 0; i < n; i++) if (f(i)) soma += pesos ? pesos[i] : 1;
    return total > 0 ? soma / total : 0;
  };
  const teto = Math.sin(rasaAte * RAD);
  const candidatos = Array.from({ length: Math.round(360 / passo) }, (_, k) => k * passo);
  const luz = new Map(candidatos.map((a) => [a, luzNasAmostras(N, vista, rasanteGraus, a)]));
  const rasa = new Map(candidatos.map((a) => [a, media((i) => luz.get(a)[i] > 0 && luz.get(a)[i] <= teto)]));
  if (unico) {
    /* uma luz só: entre os azimutes a até `folga` da melhor fração rasante, o que alcança mais da peça, e no empate o mais perto
       do preferido */
    const alcancada = new Map(candidatos.map((a) => [a, media((i) => luz.get(a)[i] > 0)]));
    const melhorRasa = Math.max(...rasa.values());
    const distancia = (a) => Math.abs(modulo360(a - preferido + 180) - 180);
    const [a] = candidatos
      .filter((c) => rasa.get(c) >= melhorRasa - folga)
      .sort((p, q) => alcancada.get(q) - alcancada.get(p) || distancia(p) - distancia(q) || p - q);
    const fracoes = {};
    for (const c of candidatos) fracoes[c] = { rasante: arredondar4(rasa.get(c)), iluminada: arredondar4(alcancada.get(c)) };
    return { azimutes: [a], estimativa: { [a]: fracoes[a] }, fracoes };
  }
  const pares = candidatos.map((a) => [a, modulo360(a + separacao)]);
  const nota = (p) => Math.min(rasa.get(p[0]), rasa.get(p[1]));
  const melhor = Math.max(...pares.map(nota));
  const distancia = (a) => Math.abs(modulo360(a - preferido + 180) - 180);
  const [a, b] = pares
    .filter((p) => nota(p) >= melhor - folga)
    .sort((p, q) => distancia(p[0]) - distancia(q[0]) || p[0] - q[0])[0];
  const estimativa = {};
  for (const k of [a, b]) estimativa[k] = { rasante: arredondar4(rasa.get(k)), iluminada: arredondar4(media((i) => luz.get(k)[i] > 0)) };
  return { azimutes: [a, b], estimativa };
}

/**
 * As amostras de uma vista a partir de triângulos no quadro do mundo (`posicoes`, 9 números por triângulo): a normal de cada
 * triângulo voltado para a câmera e, de peso, a área dele projetada no plano da imagem. Quando os voltados para a câmera somam
 * menos de um quarto da área projetada (uma chapa aberta vista por trás), entram todos, virados para ela.
 */
export function amostrasDaVista(posicoes, zCam) {
  const m = Math.floor(posicoes.length / 9);
  const normais = new Float64Array(3 * m);
  const projetada = new Float64Array(m);
  const deFrente = new Uint8Array(m);
  let frente = 0;
  let todas = 0;
  for (let t = 0; t < m; t++) {
    const o = 9 * t;
    const ux = posicoes[o + 3] - posicoes[o]; const uy = posicoes[o + 4] - posicoes[o + 1]; const uz = posicoes[o + 5] - posicoes[o + 2];
    const vx = posicoes[o + 6] - posicoes[o]; const vy = posicoes[o + 7] - posicoes[o + 1]; const vz = posicoes[o + 8] - posicoes[o + 2];
    const nx = uy * vz - uz * vy; const ny = uz * vx - ux * vz; const nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz);
    if (!(l > 0)) continue;
    normais[3 * t] = nx / l; normais[3 * t + 1] = ny / l; normais[3 * t + 2] = nz / l;
    const cos = (nx * zCam[0] + ny * zCam[1] + nz * zCam[2]) / l;
    projetada[t] = (l / 2) * Math.abs(cos);
    deFrente[t] = cos > 0 ? 1 : 0;
    todas += projetada[t];
    if (cos > 0) frente += projetada[t];
  }
  const usarTodas = frente < 0.25 * todas;
  const quais = [];
  for (let t = 0; t < m; t++) if (projetada[t] > 0 && (usarTodas || deFrente[t])) quais.push(t);
  return {
    normais: Float64Array.from(quais.flatMap((t) => [normais[3 * t], normais[3 * t + 1], normais[3 * t + 2]])),
    pesos: Float64Array.from(quais.map((t) => projetada[t])),
  };
}
