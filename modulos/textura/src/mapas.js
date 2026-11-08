/**
 * Mapas de relevo (normal e altura) e de aspereza que acompanham a imagem de cor. Mesma regra do módulo: a mesma entrada e a mesma
 * semente dão os mesmos bytes, o tile não tem emenda (toda conta de vizinhança dá a volta no tile) e a escala é em metros
 * (`metrosPorTile`). Sem Three.js e sem o núcleo.
 *
 * Os quatro relevos são os de `RELEVOS` em `src/autoria/material-da-receita.js`. `escala` é o período do padrão em milímetro:
 * o passo do prisma, o passo do desenho da banda, a altura da letra, o grão. O tile guarda um número inteiro de períodos
 * (`PERIODOS_POR_TILE`), por isso `metrosPorTile` muda de um tipo para outro e de uma escala para outra.
 *
 * A normal sai no espaço da superfície (tangente) com o verde para cima, a convenção do glTF. O mapa de aspereza é um FATOR em
 * [0, 1] guardado no canal verde (255 = 1), que multiplica a aspereza do material como o `roughnessMap` do glTF faz; vermelho e
 * azul ficam em 255 (o azul é o fator da metalicidade, que fica intacto).
 */
import { ErroDeTextura } from './erro.js';
import { campoDeRuido, hashInt, limitar } from './ruido.js';

export const TIPOS_DE_RELEVO = Object.freeze(['prismas', 'bandaDeRodagem', 'letras', 'granulado']);

/* períodos do padrão por lado do tile */
export const PERIODOS_POR_TILE = Object.freeze({ prismas: 4, bandaDeRodagem: 4, granulado: 16 });

/* a profundidade do relevo em fração do período, para intensidade 1 */
const PROFUNDIDADE = Object.freeze({ prismas: 0.5, bandaDeRodagem: 0.45, letras: 0.3, granulado: 0.6 });

/* o que a aspereza perde (0 = nada) nas partes altas do relevo, para o reflexo não ser igual no fundo e no topo */
const ASPEREZA_DO_RELEVO = Object.freeze({ prismas: 0, bandaDeRodagem: 0.12, letras: 0.1, granulado: 0.25 });

/* O texto das letras: genérico, uma medida de pneu sem marca, em grade de 5 x 7 células com 1 de espaço entre letras. */
export const TEXTO_DAS_LETRAS = '205/55R16 91';
const FONTE = Object.freeze({
  0: ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  1: ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  2: ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  5: ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  6: ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  9: ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
  '/': ['00001', '00010', '00010', '00100', '01000', '01000', '10000'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
});
/* 12 letras de 6 células = 72 colunas; as linhas têm passo de 9 células (7 da letra e 2 de entrelinha) = 8 linhas, tile quadrado */
const COLUNAS_DO_TEXTO = TEXTO_DAS_LETRAS.length * 6;
const CELULAS_POR_LINHA = 9;

function conferirPx(px) {
  if (!Number.isInteger(px) || px < 16 || px > 4096) throw new ErroDeTextura('px deve ser um inteiro de 16 a 4096.');
}
function conferirSemente(semente) {
  if (typeof semente !== 'number' || !Number.isFinite(semente)) throw new ErroDeTextura('semente deve ser um número.');
}
function numeroEm(valor, campo, min, max) {
  if (typeof valor !== 'number' || !Number.isFinite(valor) || valor < min || valor > max) {
    throw new ErroDeTextura(`${campo} deve ser um número entre ${min} e ${max}.`);
  }
  return valor;
}

/** O lado do tile em metros para um relevo (`escala` em milímetro; nas letras, a altura da letra). */
export function metrosPorTileDoRelevo(tipo, escala) {
  if (tipo === 'letras') return (COLUNAS_DO_TEXTO * escala) / 7000;
  return (PERIODOS_POR_TILE[tipo] * escala) / 1000;
}

const frac = (v) => v - Math.floor(v);
/* degrau suave: 1 dentro de `meia`, cai a 0 em `rampa` além dela */
const degrau = (d, meia, rampa) => (d < meia ? 1 : Math.max(0, 1 - (d - meia) / rampa));

/* desfoque de caixa circular (dá a volta no tile), `vezes` passadas */
function suavizar(entrada, px, raio, vezes) {
  let a = entrada;
  const largura = 2 * raio + 1;
  for (let v = 0; v < vezes; v += 1) {
    const b = new Float32Array(px * px);
    for (let j = 0; j < px; j += 1) {
      for (let i = 0; i < px; i += 1) {
        let soma = 0;
        for (let k = -raio; k <= raio; k += 1) soma += a[j * px + ((i + k + px) % px)];
        b[j * px + i] = soma / largura;
      }
    }
    const c = new Float32Array(px * px);
    for (let j = 0; j < px; j += 1) {
      for (let i = 0; i < px; i += 1) {
        let soma = 0;
        for (let k = -raio; k <= raio; k += 1) soma += b[((j + k + px) % px) * px + i];
        c[j * px + i] = soma / largura;
      }
    }
    a = c;
  }
  return a;
}

/* alturas em [0, 1], px * px, linha 0 em cima */
function alturaDosPrismas(px) {
  const h = new Float32Array(px * px);
  const n = PERIODOS_POR_TILE.prismas;
  for (let j = 0; j < px; j += 1) {
    for (let i = 0; i < px; i += 1) {
      const fx = frac(((i + 0.5) / px) * n) - 0.5;
      const fy = frac(((j + 0.5) / px) * n) - 0.5;
      /* pirâmide de quatro faces com o topo chato, uma célula por período */
      const d = Math.max(Math.abs(fx), Math.abs(fy)) * 2;
      h[j * px + i] = limitar((1 - d) / 0.85);
    }
  }
  return h;
}

function alturaDaBanda(px) {
  const h = new Float32Array(px * px);
  const n = PERIODOS_POR_TILE.bandaDeRodagem;
  for (let j = 0; j < px; j += 1) {
    for (let i = 0; i < px; i += 1) {
      const x = (i + 0.5) / px;
      const y = (j + 0.5) / px;
      /* sulco transversal inclinado, um por período; a fase anda dois períodos por tile em y (coeficientes inteiros: sem emenda) */
      const fase = Math.abs(frac(n * x + y * n * 0.5) - 0.5);
      const transversal = degrau(fase, 0.1, 0.05);
      /* dois sulcos longitudinais por tile, estreitos */
      const lon = Math.abs(frac(y * 2) - 0.5);
      const longitudinal = degrau(lon, 0.04, 0.03);
      h[j * px + i] = (1 - transversal) * (1 - longitudinal);
    }
  }
  return h;
}

function alturaDasLetras(px) {
  const h = new Float32Array(px * px);
  const sub = 3;
  const linhas = COLUNAS_DO_TEXTO;
  for (let j = 0; j < px; j += 1) {
    for (let i = 0; i < px; i += 1) {
      let cobre = 0;
      for (let b = 0; b < sub; b += 1) {
        for (let a = 0; a < sub; a += 1) {
          const cx = Math.floor(((i + (a + 0.5) / sub) / px) * COLUNAS_DO_TEXTO);
          const cy = Math.floor(((j + (b + 0.5) / sub) / px) * linhas) % CELULAS_POR_LINHA;
          const letra = TEXTO_DAS_LETRAS[Math.floor(cx / 6)];
          const c = cx % 6;
          if (cy < 7 && c < 5 && FONTE[letra][cy][c] === '1') cobre += 1;
        }
      }
      /* a letra é baixo-relevo: afundada num fundo plano */
      h[j * px + i] = 1 - cobre / (sub * sub);
    }
  }
  return suavizar(h, px, Math.max(1, Math.round((px / COLUNAS_DO_TEXTO) * 0.25)), 2);
}

function alturaDoGranulado(px, semente) {
  const n = PERIODOS_POR_TILE.granulado;
  return campoDeRuido(px, n, n, { detalhe: 1, rugosidade: 0.6, semente: semente * 977 + 5 });
}

function normalDaAltura(h, px, profundidadeM, metrosPorPixel) {
  const rgba = new Uint8ClampedArray(px * px * 4);
  const k = profundidadeM / (2 * metrosPorPixel);
  for (let j = 0; j < px; j += 1) {
    const jm = (j - 1 + px) % px;
    const jp = (j + 1) % px;
    for (let i = 0; i < px; i += 1) {
      const im = (i - 1 + px) % px;
      const ip = (i + 1) % px;
      const dx = (h[j * px + ip] - h[j * px + im]) * k;
      /* a linha 0 da imagem é o alto da textura: o verde sobe com o v, que cresce para cima */
      const dy = (h[jm * px + i] - h[jp * px + i]) * k;
      const inv = 1 / Math.hypot(dx, dy, 1);
      const p = (j * px + i) * 4;
      rgba[p] = Math.round((-dx * inv * 0.5 + 0.5) * 255);
      rgba[p + 1] = Math.round((-dy * inv * 0.5 + 0.5) * 255);
      rgba[p + 2] = Math.round((inv * 0.5 + 0.5) * 255);
      rgba[p + 3] = 255;
    }
  }
  return rgba;
}

function mapaDeFator(fator, px) {
  const rgba = new Uint8ClampedArray(px * px * 4);
  for (let p = 0; p < px * px; p += 1) {
    rgba[p * 4] = 255;
    rgba[p * 4 + 1] = Math.round(limitar(fator[p]) * 255);
    rgba[p * 4 + 2] = 255;
    rgba[p * 4 + 3] = 255;
  }
  return rgba;
}

/**
 * Os mapas de um relevo.
 * @param {{tipo: string, escala: number, intensidade: number}} relevo o relevo normalizado do material
 * @returns {{largura: number, altura: number, normal: Uint8ClampedArray, aspereza: Uint8ClampedArray, relevo: Float32Array, metrosPorTile: number}}
 *   `normal` e `aspereza` são RGBA 8 bits; `relevo` é a altura em [0, 1] (1 = topo), para quem prefere deslocar.
 */
export function gerarMapasDoRelevo(relevo, { px = 256, semente = 1 } = {}) {
  if (!relevo || typeof relevo !== 'object') throw new ErroDeTextura('O relevo é obrigatório.');
  conferirPx(px);
  conferirSemente(semente);
  const { tipo } = relevo;
  if (!TIPOS_DE_RELEVO.includes(tipo)) throw new ErroDeTextura(`Tipo de relevo desconhecido: ${JSON.stringify(tipo)}.`);
  const escala = numeroEm(relevo.escala, 'relevo.escala', 0.01, 1000);
  const intensidade = numeroEm(relevo.intensidade, 'relevo.intensidade', 0, 1);

  let altura;
  if (tipo === 'prismas') altura = alturaDosPrismas(px);
  else if (tipo === 'bandaDeRodagem') altura = suavizar(alturaDaBanda(px), px, Math.max(1, Math.round(px / 128)), 1);
  else if (tipo === 'letras') altura = alturaDasLetras(px);
  else altura = alturaDoGranulado(px, semente);

  const metrosPorTile = metrosPorTileDoRelevo(tipo, escala);
  /* nas letras o período que a profundidade segue é a largura da letra (5 células de 1/7 da altura) */
  const periodoM = tipo === 'letras' ? ((escala / 1000) / 7) * 5 : escala / 1000;
  const normal = normalDaAltura(altura, px, intensidade * PROFUNDIDADE[tipo] * periodoM, metrosPorTile / px);

  /* a aspereza cai um pouco nas partes altas (polidas pelo uso) e fica inteira no fundo */
  const perda = ASPEREZA_DO_RELEVO[tipo] * intensidade;
  const fator = new Float32Array(px * px);
  for (let p = 0; p < px * px; p += 1) fator[p] = 1 - perda * altura[p];
  return { largura: px, altura: px, normal, aspereza: mapaDeFator(fator, px), relevo: altura, metrosPorTile };
}

/** O lado do tile dos flocos em metros: 4 cm, para o floco de cerca de 0,15 mm por texel. */
export const METROS_POR_TILE_DOS_FLOCOS = 0.04;

/**
 * O mapa de aspereza dos flocos da tinta metálica: ruído fino em que cada floco é um ponto que pega luz (aspereza e brilho
 * variam juntos: o fator cai onde o floco brilha). `flocos` é a fração de 0 a 1 declarada no material.
 * @returns {{largura: number, altura: number, aspereza: Uint8ClampedArray, metrosPorTile: number}}
 */
export function gerarMapaDeFlocos(flocos, { px = 256, semente = 1 } = {}) {
  conferirPx(px);
  conferirSemente(semente);
  numeroEm(flocos, 'flocos', 0, 1);
  const fator = new Float32Array(px * px);
  const sem = Math.round(semente * 1000);
  const nuvem = campoDeRuido(px, 8, 8, { detalhe: 1, rugosidade: 0.5, semente: semente * 977 + 11 });
  for (let j = 0; j < px; j += 1) {
    for (let i = 0; i < px; i += 1) {
      const sorte = hashInt(i, j, sem + 0x2f1) / 4294967296;
      /* só uma fração dos pontos é floco; a nuvem lenta agrupa e rarefaz, como a tinta espalhada */
      const chance = Math.min(1, (0.25 + 0.5 * nuvem[j * px + i]) * flocos * 1.4);
      const brilho = sorte < chance ? 0.35 + 0.65 * (sorte / Math.max(chance, 1e-6)) : 1;
      fator[j * px + i] = 1 - flocos * (1 - brilho) * 0.85;
    }
  }
  return { largura: px, altura: px, aspereza: mapaDeFator(fator, px), metrosPorTile: METROS_POR_TILE_DOS_FLOCOS };
}
