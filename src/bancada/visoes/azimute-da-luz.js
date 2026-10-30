/* azimute-da-luz.js — a direção da luz rasante no quadro da câmera e a escolha dela pelo que a câmera vê: as contas de
 * `direcao_da_luz` e `escolher_azimutes` de `tools/blender/superficie.py`, portadas sem Three e sem DOM, e a escolha da luz única
 * da bancada (`escolherLuz`).
 *
 * A luz rasante da bancada e a das vistas obrigatórias do Blender usam a mesma definição: a câmera olha ao longo de -z_cam, e a
 * luz viaja com `sin(elevação)` ao longo do olhar e `cos(elevação)` dentro do plano da imagem, na direção `azimute` medida de
 * x_cam para y_cam. Por isso a luz da bancada acompanha a câmera quando a peça gira: ela fica sempre à mesma elevação sobre o
 * plano da imagem, como em cada vista do Blender, que a põe a 10 graus.
 *
 * O que muda é a amostra e o número de luzes. O Blender escolhe pelos pixels que a câmera vê, com a sombra de cada um, e escolhe um
 * par de azimutes, um por imagem, sempre a 10 graus; a conta dele está aqui, e o teste a compara com a do Python sobre as mesmas
 * normais. A bancada tem uma luz só e passa as normais dos triângulos voltados para a câmera, pesadas pela área projetada, sem
 * oclusão e sem sombra (`amostrasDaVista`); ela escolhe o azimute e a elevação em que a luz deixa ler melhor uma inclinação
 * pequena (`legibilidadeDaLuz`), começando pelos 10 graus do Blender e subindo só quando a peça vista se inclina para longe do
 * plano da imagem. */

export const RASANTE_GRAUS = 10;
export const RASA_ATE_GRAUS = 30;
export const AZIMUTE_PREFERIDO = 30;

/** O brilho linear de uma superfície a `RASANTE_GRAUS` da luz, o `ALVO_LINEAR` de `tools/blender/luz-rasante.py`. */
export const BRILHO_RASANTE = 0.2;
/** As elevações sobre o plano da imagem que a luz única da bancada experimenta, da do Blender para cima. */
export const ELEVACOES_DA_LUZ = [10, 20, 30, 40, 50, 60, 70, 80];

const RAD = Math.PI / 180;
const modulo360 = (a) => ((a % 360) + 360) % 360;
const arredondar4 = (x) => Math.round(x * 1e4) / 1e4;

/* A derivada do valor sRGB da tela em relação ao brilho linear. */
const derivadaSrgb = (L) => (L <= 0.0031308 ? 12.92 : (1.055 / 2.4) * L ** (1 / 2.4 - 1));

/**
 * Quanto a luz deixa ler uma inclinação pequena numa amostra cujo cosseno com o lado de onde a luz vem é `cosseno`: a variação do
 * valor sRGB da tela por grau de inclinação da superfície, dividida pela da superfície a `rasanteGraus` da luz, e no máximo 1. O
 * brilho é o da luz rasante, linear `alvo * cosseno / sin(rasanteGraus)` sem mapeamento de tons, como no Blender, em que a
 * superfície a 10 graus da luz sai com 0,2. Vale 1 dali até a luz tangente, cai à medida que a luz chega de frente (0,64 a 20 graus
 * da superfície, 0,32 a 45 e 0,2 a 60) e é 0 na sombra e onde o brilho passa do branco, que não mostra relevo nenhum.
 */
export function legibilidadeDaLuz(cosseno, rasanteGraus = RASANTE_GRAUS, alvo = BRILHO_RASANTE) {
  if (!(cosseno > 0)) return 0;
  const brilho = (alvo * cosseno) / Math.sin(rasanteGraus * RAD);
  if (brilho >= 1) return 0;
  const variacao = derivadaSrgb(brilho) * Math.sqrt(Math.max(0, 1 - cosseno * cosseno));
  return Math.min(1, variacao / (derivadaSrgb(alvo) * Math.cos(rasanteGraus * RAD)));
}

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
 */
export function escolherAzimutes(normais, vista, rasanteGraus = RASANTE_GRAUS, {
  pesos = null, passo = 10, separacao = 90, preferido = AZIMUTE_PREFERIDO, folga = 0.05, rasaAte = RASA_ATE_GRAUS,
} = {}) {
  if (separacao % passo || 360 % passo) throw new RangeError(`passo ${passo} precisa dividir 360 e a separação ${separacao}`);
  const n = Math.floor(normais.length / 3);
  if (!n) return { azimutes: [preferido, modulo360(preferido + separacao)], estimativa: {} };
  const N = voltadasParaACamera(normais, vista.zCam);
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

/* As normais (3 números por amostra) viradas para o lado da câmera. */
function voltadasParaACamera(normais, z) {
  const n = Math.floor(normais.length / 3);
  const N = new Float64Array(3 * n);
  for (let i = 0; i < n; i++) {
    const x = normais[3 * i]; const y = normais[3 * i + 1]; const w = normais[3 * i + 2];
    const s = x * z[0] + y * z[1] + w * z[2] < 0 ? -1 : 1;
    N[3 * i] = s * x; N[3 * i + 1] = s * y; N[3 * i + 2] = s * w;
  }
  return N;
}

/**
 * A luz única da bancada para uma vista: o azimute (de `passo` em `passo` graus) e a elevação sobre o plano da imagem (entre
 * `elevacoes`) de maior nota, que é a legibilidade média das amostras (`legibilidadeDaLuz`, com o brilho da luz rasante, em que a
 * superfície a `rasanteGraus` da luz sai com `alvo`) menos a fração delas que estoura no branco, pesadas por `pesos` ou iguais sem
 * eles. O estouro desconta, e a sombra só não soma: a sombra do lado de lá de uma curva é a luz rasante funcionando, e a face
 * branca esconde o relevo e se lê como defeito da vista. No empate a quatro casas fica a elevação mais baixa, e nela o azimute
 * mais perto de `preferido`. Devolve `{ azimute, elevacao, nota, legivel, estourada, sombra }`, com a fração das amostras que passa
 * do branco e a que fica de costas para a luz.
 *
 * O Blender fixa a luz a 10 graus do plano da imagem e conta como rasante a amostra a até 30 graus da luz. A versão dessa conta
 * para uma luz só, que a bancada usava (a fração rasante, com o desempate pela fração alcançada), contava igual a amostra a 9 e a
 * 29 graus da luz e preferia a luz que alcança mais, que é a mais de frente. Medido em 2026-10-30: na carenagem de prova em três
 * quartos, a peça vista se inclina de 50 a 63 graus para longe do plano da imagem, e a 10 graus dele a luz escolhida chegava quase
 * de frente à lateral, que estourava no branco (legibilidade média de 0,50; a 50 graus de elevação, 0,89); e na peça de prova com
 * vinco vista de cima ela ficava em 30 graus de azimute, com a chapa caída a 23 graus da luz e um terço do contraste do amassado
 * que a luz de 0 grau, que a pega a 9 graus, dá. Sem o desconto do estouro, o furgão do acervo na vista em que abre ficava a 50
 * graus com 28 % da peça vista no branco, e com ele fica a 60 graus com 0,2 %.
 */
export function escolherLuz(normais, vista, {
  pesos = null, passo = 10, elevacoes = ELEVACOES_DA_LUZ, preferido = AZIMUTE_PREFERIDO, rasanteGraus = RASANTE_GRAUS, alvo = BRILHO_RASANTE,
} = {}) {
  if (360 % passo) throw new RangeError(`passo ${passo} precisa dividir 360`);
  const n = Math.floor(normais.length / 3);
  const N = voltadasParaACamera(normais, vista.zCam);
  let total = 0;
  for (let i = 0; i < n; i++) total += pesos ? pesos[i] : 1;
  const saturacao = Math.sin(rasanteGraus * RAD) / alvo;
  /* a legibilidade em tabela pelo cosseno, que a conta passa por dezenas de milhares de amostras em cada uma das centenas de luzes */
  const PONTOS = 2048;
  const tabela = Float64Array.from({ length: PONTOS }, (_, k) => legibilidadeDaLuz(Math.max(k, 0.5) / (PONTOS - 1), rasanteGraus, alvo));
  const fracao = (x) => (total > 0 ? arredondar4(x / total) : 0);
  const distancia = (a) => Math.abs(modulo360(a - preferido + 180) - 180);
  let melhor = null;
  for (const elevacao of elevacoes) {
    for (let azimute = 0; azimute < 360; azimute += passo) {
      const d = direcaoDaLuz(vista, elevacao, azimute);
      let legivel = 0; let estourada = 0; let sombra = 0;
      for (let i = 0; i < n; i++) {
        const c = -(N[3 * i] * d[0] + N[3 * i + 1] * d[1] + N[3 * i + 2] * d[2]);
        const p = pesos ? pesos[i] : 1;
        if (c <= 0) sombra += p;
        else if (c >= saturacao) estourada += p;
        else legivel += p * tabela[Math.min(PONTOS - 1, Math.round(c * (PONTOS - 1)))];
      }
      const luz = { azimute, elevacao, nota: fracao(legivel - estourada), legivel: fracao(legivel), estourada: fracao(estourada), sombra: fracao(sombra) };
      /* as elevações vêm na ordem da preferência: só uma nota maior troca de elevação, e na mesma, o azimute mais perto */
      if (!melhor || luz.nota > melhor.nota
        || (luz.nota === melhor.nota && elevacao === melhor.elevacao && distancia(azimute) < distancia(melhor.azimute))) melhor = luz;
    }
  }
  return melhor ?? { azimute: preferido, elevacao: elevacoes[0], nota: 0, legivel: 0, estourada: 0, sombra: 0 };
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
