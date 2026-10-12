/* geometria.js — a superfície aerodinâmica em seções, em metro e em graus.

   Função pura sobre números: o `derivar`, a composição e os testes leem daqui, de modo que a malha, as portas e a conta
   analítica dos testes vêm da mesma conta. Nada aqui lê relógio, sorteio ou arquivo.

   O QUADRO ABSTRATO. A superfície nasce em X (a envergadura, da raiz para a ponta), Y (a espessura, para cima) e Z (a corda,
   do bordo de ataque, em Z menor, para o de fuga). `mapear` leva esse quadro ao do componente: com `orientacao` 0 ele é o do
   avião (x para a direita, y para cima, z da proa para a cauda, de modo que o bordo de ataque aponta para -z), com 1 a
   envergadura sobe em y (a deriva) e com 2 a pá sobe em y, a corda fica no plano de rotação (x) e a face de baixo olha
   para +z, o eixo da hélice. O `loft` do núcleo lê o plano de cada seção a partir do caminho e de uma `orientacao` declarada
   (a direção da corda): aqui o caminho é o eixo de torção da superfície (a linha de passo, em fração da corda) e a
   orientação é o próprio Z, de modo que o desenho de cada seção, em [u, w], é a corda e a espessura.

   O PERFIL. NACA de quatro dígitos: curvatura máxima `m`, posição dela `p` e espessura `t`, ambas em fração da corda. A espessura
   leva um termo linear que a faz valer, no bordo de fuga, a espessura mínima pedida (a espessura de um perfil NACA fechado é nula
   ali, e a de um aberto é função de `t`). O contorno de cada seção tem sempre `2 n + 2` pontos, no sentido anti-horário em
   [u, w], começando no meio do bordo de fuga: o ponto 0, o extradorso do bordo de fuga ao de ataque (índices 1 a n + 1), o
   intradorso (n + 2 a 2 n + 1) e a volta ao ponto 0. A contagem é par porque o `loft` fecha as pontas da superfície numa linha,
   a corda, e essa fecha o anel em duas metades. O intradorso segue a linha de curvatura e fica côncavo onde ela pede, e o bordo de
   ataque tem o raio que a fórmula dá, não uma quina.

   A PLANTA. A corda vai da raiz à ponta em linha reta, com um abaulamento que a engrossa no meio (zero nas asas, o da pá de hélice
   nas pás); a espessura relativa também; a torção é linear da raiz à ponta, somada à incidência da raiz; o enflechamento desloca
   o eixo de torção para trás e o diedro o levanta, sem mudar o plano de cada seção em relação ao fluxo (o enflechamento é um
   deslocamento da seção em Z, não uma inclinação dela). A ponta levantada soma ao diedro um ângulo que cresce com uma curva
   de quinto grau (continuidade de inclinação e de curvatura) nos últimos `extensaoDaPonta` da semi-envergadura, e as seções,
   perpendiculares ao caminho, acompanham a curva. A ponta fecha em seções cada vez mais finas, a espessura multiplicada pelo
   cosseno de um ângulo até zero, e a última seção é a corda: não há faceta nem quina viva na ponta. A raiz fecha numa
   corda também (ou continua pelo plano de simetria, e a malha é espelhada).

   O COMANDO. O comando (aileron, flap, profundor, leme) é o trecho do bordo de fuga entre `inicioDoComando` e `fimDoComando` da
   semi-envergadura, atrás do eixo da dobradiça, a `cordaDoComando` do bordo de fuga. O nariz do comando é um círculo de raio igual
   à meia espessura do perfil no eixo, centrado na linha de curvatura; a parte fixa tem ali um entalhe, um círculo concêntrico
   de raio maior pela `fresta`, de modo que o comando gira sem tocar a parte fixa. Na envergadura o comando fica a uma fresta de cada
   face do entalhe. */

export const GRAUS = Math.PI / 180;
/* pontos por face do perfil: o contorno tem 2 n + 2 pontos */
export const PONTOS_POR_FACE = 19;
export const LADOS_DA_SECAO = 2 * PONTOS_POR_FACE + 2;
/* o comando: pontos por face atrás do eixo (a tangente do nariz inclusive) e pontos do arco do nariz entre as duas tangentes */
export const PONTOS_ATRAS_DO_EIXO = 9;
export const PONTOS_DO_NARIZ = 9;
export const LADOS_DO_COMANDO = 2 * PONTOS_ATRAS_DO_EIXO + PONTOS_DO_NARIZ + 1;
/* as seções de cada trecho (o bloco de ids do núcleo guarda 1000 vértices e 1000 faces por `loft`) */
export const INTERVALOS_ATE_A_CURVA = 8;
export const INTERVALOS_DA_RAIZ_AO_COMANDO = 4;
export const INTERVALOS_NO_ENTALHE = 3;
export const INTERVALOS_DO_COMANDO_A_CURVA = 3;
export const INTERVALOS_NA_CURVA = 6;
export const INTERVALOS_NO_COMANDO = 3;
/* a tampa da ponta: a espessura da seção vezes o cosseno destes ângulos, e a última seção é a corda */
export const ANGULOS_DA_TAMPA = Object.freeze([30, 55, 75]);
export const FRACAO_DA_TAMPA_NA_SEMI = 0.03;
/* a raiz e as pontas do comando fecham numa corda a esta distância da última seção cheia, em metro */
export const ESPESSURA_DA_TAMPA = 1e-4;
export const FRACAO_DO_CORTE_NA_ENVERGADURA = 0.0004;
export const MINIMO_DO_CORTE = 2e-4;
export const FRACAO_DO_DEGRAU_DA_RAIZ = 0.004;
export const FRACAO_MAXIMA_DA_FRESTA_NO_COMANDO = 0.1;
/* a faixa em torno do plano da porta em que a conferência mede o raio (`porta-confere-forma.js`) */
export const FAIXA_DO_RAIO = 0.010;

const suave = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * t * (10 + t * (-15 + 6 * t)));
const arredondar = (valor) => Math.round(valor * 1e10) / 1e10;
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norma = ([x, y, z]) => { const l = Math.hypot(x, y, z) || 1; return [x / l, y / l, z / l]; };
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** Leva um ponto do quadro abstrato (X envergadura, Y espessura, Z corda) ao do componente, pela `orientacao` 0, 1 ou 2. */
export function mapear(orientacao, [x, y, z]) {
  if (orientacao === 0) return [x, y, z];
  if (orientacao === 1) return [-y, x, z];
  return [-z, x, -y];
}

/* ---------- o perfil ---------- */

/** As estações de corda do perfil: `n + 1` abscissas de 0 a 1, mais fechadas nos dois bordos (a distribuição em cosseno). */
export const estacoesDeCorda = (n = PONTOS_POR_FACE) => Array.from({ length: n + 1 }, (_, i) => 0.5 * (1 - Math.cos((Math.PI * i) / n)));

/** A linha de curvatura NACA, em fração da corda, na abscissa `x`. */
export function linhaDeCurvatura(x, curvatura, posicao) {
  if (curvatura === 0) return 0;
  return x < posicao
    ? (curvatura / (posicao * posicao)) * (2 * posicao * x - x * x)
    : (curvatura / ((1 - posicao) * (1 - posicao))) * ((1 - 2 * posicao) + 2 * posicao * x - x * x);
}

/** A meia espessura NACA, em fração da corda, na abscissa `x`, com o termo linear que dá `bordoDeFuga / 2` no bordo de fuga. */
export function meiaEspessura(x, espessura, bordoDeFuga) {
  return 5 * espessura * (0.2969 * Math.sqrt(x) - 0.1260 * x - 0.3516 * x * x + 0.2843 * x ** 3 - 0.1036 * x ** 4) + (bordoDeFuga / 2) * x;
}

/**
 * O contorno do perfil, `2 n + 2` pontos [x, y] em fração da corda, anti-horário em [x, y]: o meio do bordo de fuga, o extradorso
 * do bordo de fuga ao de ataque, o intradorso do de ataque ao de fuga.
 */
export function contornoDoPerfil({ curvatura, posicaoDaCurvatura, espessura, bordoDeFuga }, n = PONTOS_POR_FACE) {
  const xs = estacoesDeCorda(n);
  const linha = xs.map((x) => linhaDeCurvatura(x, curvatura, posicaoDaCurvatura));
  const meia = xs.map((x) => meiaEspessura(x, espessura, bordoDeFuga));
  const pontos = [[1, linha[n]]];
  for (let i = n; i >= 0; i--) pontos.push([xs[i], linha[i] + meia[i]]);
  for (let i = 1; i <= n; i++) pontos.push([xs[i], linha[i] - meia[i]]);
  return pontos;
}

/* ---------- a planta ---------- */

/** A planta de uma superfície: corda, espessura, torção, deslocamento do eixo e caminho (X, Y) em função de X, em metro. */
export function plantaDa({
  semi, cordaNaRaiz, cordaNaPonta, abaulamentoDaCorda, espessuraNaRaiz, espessuraNaPonta, incidenciaNaRaiz, torcao, enflechamento, diedro,
  pontaLevantada, extensaoDaPonta, bordoDeFuga,
}) {
  const metadeDaPonta = 0.5 * espessuraNaPonta * cordaNaPonta;
  const comprimentoDaTampa = Math.min(metadeDaPonta, FRACAO_DA_TAMPA_NA_SEMI * semi);
  const xDoCorte = semi - comprimentoDaTampa;
  const xDaCurva = xDoCorte - extensaoDaPonta * semi;
  const xDoDegrau = FRACAO_DO_DEGRAU_DA_RAIZ * semi;
  const tangenteDoDiedro = Math.tan(diedro * GRAUS);
  const inclinacao = (x) => diedro * GRAUS + pontaLevantada * GRAUS * suave((x - xDaCurva) / Math.max(xDoCorte - xDaCurva, 1e-12));
  /* Y de X: nulo no degrau da raiz (a primeira face do caminho é horizontal, e a raiz fica no plano de simetria), o diedro
     depois dele e a curva da ponta somada. A integral da tangente da inclinação, em 64 trechos de Simpson por intervalo. */
  const integral = (de, ate) => {
    if (!(ate > de)) return 0;
    const passos = 64;
    const h = (ate - de) / passos;
    let soma = Math.tan(inclinacao(de)) + Math.tan(inclinacao(ate));
    for (let k = 1; k < passos; k++) soma += (k % 2 ? 4 : 2) * Math.tan(inclinacao(de + k * h));
    return (soma * h) / 3;
  };
  const alturaNoInicioDaCurva = Math.max(0, xDaCurva - xDoDegrau) * tangenteDoDiedro;
  const y = (x) => {
    if (x <= xDoDegrau) return 0;
    if (x <= xDaCurva) return (x - xDoDegrau) * tangenteDoDiedro;
    return alturaNoInicioDaCurva + integral(xDaCurva, x);
  };
  const xi = (x) => x / semi;
  return {
    semi, comprimentoDaTampa, xDoCorte, xDaCurva, xDoDegrau, bordoDeFuga,
    corda: (x) => (cordaNaRaiz + (cordaNaPonta - cordaNaRaiz) * xi(x)) * (1 + abaulamentoDaCorda * 4 * xi(x) * (1 - xi(x))),
    espessura: (x) => espessuraNaRaiz + (espessuraNaPonta - espessuraNaRaiz) * xi(x),
    incidencia: (x) => incidenciaNaRaiz + torcao * xi(x),
    deslocamento: (x) => x * Math.tan(enflechamento * GRAUS),
    y,
  };
}

/* ---------- as seções ---------- */

/**
 * A seção em [u, w] (metro) de um ponto de corda: a abscissa e a ordenada em fração da corda viram metro a partir do eixo de
 * torção (em fração da corda), giram pela incidência (nariz para cima é positivo: o bordo de fuga desce) e o enflechamento
 * desloca o resultado em u.
 */
export function transformarPonto({ corda, eixo, incidencia, deslocamento, escalaDeW = 1 }, [xn, yn]) {
  const u0 = (xn - eixo) * corda;
  const w0 = yn * corda * escalaDeW;
  const a = incidencia * GRAUS;
  return [u0 * Math.cos(a) + w0 * Math.sin(a) + deslocamento, -u0 * Math.sin(a) + w0 * Math.cos(a)];
}

/** A distância de um ponto a um segmento [a, b]: usada para achar onde um círculo corta uma reta poligonal. */
function cortarSegmentoComCirculo(a, b, centro, raio) {
  /* |a + s (b - a) - c|^2 = r^2; devolve o menor s em [0, 1] que sai de fora do círculo para dentro, ou null */
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const fx = a[0] - centro[0];
  const fy = a[1] - centro[1];
  const A = dx * dx + dy * dy;
  const B = 2 * (fx * dx + fy * dy);
  const C = fx * fx + fy * fy - raio * raio;
  const delta = B * B - 4 * A * C;
  if (!(A > 0) || delta < 0) return null;
  const raiz = Math.sqrt(delta);
  const candidatos = [(-B - raiz) / (2 * A), (-B + raiz) / (2 * A)].filter((s) => s >= -1e-12 && s <= 1 + 1e-12);
  return candidatos.length ? Math.min(...candidatos.map((s) => Math.min(1, Math.max(0, s)))) : null;
}

/**
 * O contorno completo de uma seção com a tampa da ponta: o do perfil, escalado em w por `escalaDeW`, em [u, w] metro.
 */
export function contornoDaSecao(perfil, parametros) {
  return contornoDoPerfil(perfil).map((ponto) => transformarPonto(parametros, ponto));
}

/** O índice da primeira estação cujos pontos de cada face viram o arco do entalhe: a primeira adiante da qual o círculo já não chega. */
export function primeiroDoGrupoDoEntalhe(xEixo, raioMaximo, n = PONTOS_POR_FACE) {
  const xs = estacoesDeCorda(n);
  const indice = xs.findIndex((x) => x > xEixo - raioMaximo);
  return Math.max(1, indice);
}

/**
 * O contorno da parte fixa com o entalhe do comando: os pontos adiante do entalhe são os do perfil; os `2 k + 1` de trás (o
 * meio do bordo de fuga e `k` de cada face, a partir da estação `primeiroDoGrupo`) dão lugar a um arco de raio
 * `meiaEspessura + fresta` em torno do eixo da dobradiça, que sai do intradorso, dá a volta pela frente e volta ao extradorso. O
 * primeiro e o último ponto do arco ficam sobre as faces (as quinas do entalhe); a contagem de pontos e os índices dos pontos
 * de adiante não mudam. `xEixo` e `fresta` vêm em fração da corda. Devolve null se o círculo não corta uma das faces.
 */
export function contornoComEntalhe(perfil, parametros, { xEixo, fresta, primeiroDoGrupo }) {
  const n = PONTOS_POR_FACE;
  const base = contornoDoPerfil(perfil, n);
  const meia = meiaEspessura(xEixo, perfil.espessura, perfil.bordoDeFuga);
  const yEixo = linhaDeCurvatura(xEixo, perfil.curvatura, perfil.posicaoDaCurvatura);
  const centro = [xEixo, yEixo];
  const raio = meia + fresta;
  /* a quina de cada face: o primeiro corte do círculo com a poligonal, do bordo de ataque para trás */
  const quina = (indices) => {
    for (let k = 1; k < indices.length; k++) {
      const a = base[indices[k - 1]];
      const b = base[indices[k]];
      const s = cortarSegmentoComCirculo(a, b, centro, raio);
      if (s !== null) return [a[0] + s * (b[0] - a[0]), a[1] + s * (b[1] - a[1])];
    }
    return null;
  };
  const extradorso = Array.from({ length: n + 1 }, (_, k) => n + 1 - k); // do bordo de ataque (índice n + 1) ao de fuga (1)
  const intradorso = [n + 1, ...Array.from({ length: n }, (_, k) => n + 2 + k)]; // do bordo de ataque ao de fuga
  const quinaDeCima = quina(extradorso);
  const quinaDeBaixo = quina(intradorso);
  if (!quinaDeCima || !quinaDeBaixo) return null;
  const k = n - primeiroDoGrupo + 1;
  const grupo = [...Array.from({ length: k }, (_, j) => n + 1 + primeiroDoGrupo + j), 0, ...Array.from({ length: k }, (_, j) => 1 + j)];
  const inicio = Math.atan2(quinaDeBaixo[1] - yEixo, quinaDeBaixo[0] - xEixo);
  const fim = Math.atan2(quinaDeCima[1] - yEixo, quinaDeCima[0] - xEixo) - 2 * Math.PI;
  const contorno = base.map((ponto) => ponto.slice());
  grupo.forEach((indice, m) => {
    const angulo = inicio + ((fim - inicio) * m) / (grupo.length - 1);
    contorno[indice] = m === 0 ? quinaDeBaixo : m === grupo.length - 1 ? quinaDeCima : [xEixo + raio * Math.cos(angulo), yEixo + raio * Math.sin(angulo)];
  });
  return { pontos: contorno.map((ponto) => transformarPonto(parametros, ponto)), raio, grupo };
}

/**
 * O contorno do comando: o meio do bordo de fuga, o extradorso do bordo de fuga até a tangente do nariz, o arco do nariz pela
 * frente e o intradorso da tangente ao bordo de fuga. As abscissas atrás do eixo são cossenos entre o eixo e o bordo de fuga.
 */
export function contornoDoComando(perfil, parametros, { xEixo }) {
  const k = PONTOS_ATRAS_DO_EIXO;
  const meia = meiaEspessura(xEixo, perfil.espessura, perfil.bordoDeFuga);
  const yEixo = linhaDeCurvatura(xEixo, perfil.curvatura, perfil.posicaoDaCurvatura);
  const abscissa = (j) => xEixo + (1 - xEixo) * 0.5 * (1 - Math.cos((Math.PI * j) / (k - 1)));
  const face = (j, sinal) => {
    const x = abscissa(j);
    return [x, linhaDeCurvatura(x, perfil.curvatura, perfil.posicaoDaCurvatura) + sinal * meiaEspessura(x, perfil.espessura, perfil.bordoDeFuga)];
  };
  const pontos = [[1, linhaDeCurvatura(1, perfil.curvatura, perfil.posicaoDaCurvatura)]];
  for (let j = k - 1; j >= 0; j--) pontos.push(face(j, 1));
  for (let m = 1; m <= PONTOS_DO_NARIZ; m++) {
    const angulo = Math.PI / 2 + (Math.PI * m) / (PONTOS_DO_NARIZ + 1);
    pontos.push([xEixo + meia * Math.cos(angulo), yEixo + meia * Math.sin(angulo)]);
  }
  for (let j = 0; j < k; j++) pontos.push(face(j, -1));
  return {
    pontos: pontos.map((ponto) => transformarPonto(parametros, ponto)),
    corda: [transformarPonto(parametros, pontos[0]), transformarPonto(parametros, [xEixo - meia, yEixo])],
    centro: transformarPonto(parametros, [xEixo, yEixo]),
    raio: meia,
  };
}

/* ---------- os quadros do `loft` ---------- */

/**
 * Os quadros [u, w, t] de cada seção como o `loft` do núcleo os calcula: a tangente é a direção do segmento na ponta e a média
 * normalizada dos dois vizinhos no meio; `u` é a `orientacao` projetada no plano da seção e `w = u x t`.
 */
export function quadrosDoLoft(posicoes, orientacao) {
  const direcoes = [];
  for (let i = 0; i < posicoes.length - 1; i++) direcoes.push(norma([posicoes[i + 1][0] - posicoes[i][0], posicoes[i + 1][1] - posicoes[i][1], posicoes[i + 1][2] - posicoes[i][2]]));
  const ultimo = posicoes.length - 1;
  return posicoes.map((_, i) => {
    const t = i === 0 ? direcoes[0] : i === ultimo ? direcoes[ultimo - 1]
      : norma([direcoes[i - 1][0] + direcoes[i][0], direcoes[i - 1][1] + direcoes[i][1], direcoes[i - 1][2] + direcoes[i][2]]);
    const d = dot(orientacao, t);
    const u = norma([orientacao[0] - t[0] * d, orientacao[1] - t[1] * d, orientacao[2] - t[2] * d]);
    return { u, w: cross(u, t), t };
  });
}

/** O ponto 3D de [u, w] numa seção do `loft`. */
export const pontoDaSecao = (posicao, quadro, [u, w]) => [
  posicao[0] + quadro.u[0] * u + quadro.w[0] * w, posicao[1] + quadro.u[1] * u + quadro.w[1] * w, posicao[2] + quadro.u[2] * u + quadro.w[2] * w,
];

export { arredondar, cross, dot, norma };
