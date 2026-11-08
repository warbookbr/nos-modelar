/**
 * Mapas de relevo (normal e altura) e de aspereza que acompanham a imagem de cor. Mesma regra do módulo: a mesma entrada e a mesma
 * semente dão os mesmos bytes, o tile não tem emenda (toda conta de vizinhança dá a volta no tile) e a escala é em metros
 * (`metrosPorTile`). Sem Three.js e sem o núcleo.
 *
 * Os quatro relevos são os de `RELEVOS` em `src/autoria/material-da-receita.js`. `escala` é o período do padrão em milímetro:
 * o passo do prisma, o passo dos blocos da banda, a altura da letra, o grão.
 *
 * O TILE. `prismas` e `granulado` são tile quadrado de período inteiro (`PERIODOS_POR_TILE`). A `bandaDeRodagem` e as `letras`
 * dependem da faixa que as leva e por isso recebem as MEDIDAS dela (`larguraM`, `comprimentoM`, em metros), que a projeção da
 * malha mede (`medidasDaProjecao`, em `src/autoria/coordenada-de-textura.js`):
 *  - banda: o tile é quadrado, de lado `larguraM` (a banda inteira, de ombro a ombro, UMA vez), e o desenho é simétrico em torno
 *    do meio (a linha do meio da imagem); em volta ele se repete, e o número de blocos por tile é inteiro;
 *  - letras: UMA linha de texto centrada, num tile de `comprimentoM` por `larguraM` (não quadrado); fora do texto o fundo é plano.
 * Sem as medidas valem as padrão (`medidasPadraoDoRelevo`).
 *
 * A normal sai no espaço da superfície (tangente) com o verde para cima, a convenção do glTF. O mapa de aspereza é um FATOR em
 * [0, 1] guardado no canal verde (255 = 1), que multiplica a aspereza do material como o `roughnessMap` do glTF faz; vermelho e
 * azul ficam em 255 (o azul é o fator da metalicidade, que fica intacto).
 */
import { ErroDeTextura } from './erro.js';
import { campoDeRuido, hashInt, limitar } from './ruido.js';

export const TIPOS_DE_RELEVO = Object.freeze(['prismas', 'bandaDeRodagem', 'letras', 'granulado']);
export const DESENHOS_DA_BANDA = Object.freeze(['costelas', 'v']);

/* períodos do padrão por lado do tile (só prismas e granulado; a banda e as letras seguem a faixa) */
export const PERIODOS_POR_TILE = Object.freeze({ prismas: 4, granulado: 16 });

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
const COLUNAS_DO_TEXTO = TEXTO_DAS_LETRAS.length * 6 - 1;

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

/**
 * As medidas padrão do tile de um relevo, em metros: `comprimentoM` (a direção do u, em volta) e `larguraM` (a do v, a faixa).
 * Prismas e granulado: quadrado de período inteiro. Banda: quadrado de 5 blocos. Letras: a linha de texto com folga.
 */
export function medidasPadraoDoRelevo(tipo, escala) {
  const m = escala / 1000;
  if (tipo === 'letras') {
    const celula = m / 7;
    return { comprimentoM: COLUNAS_DO_TEXTO * celula * 1.6, larguraM: 7 * celula * 2.5 };
  }
  if (tipo === 'bandaDeRodagem') return { comprimentoM: 5 * m, larguraM: 5 * m };
  const lado = PERIODOS_POR_TILE[tipo] * m;
  return { comprimentoM: lado, larguraM: lado };
}

/** O lado do tile em metros para um relevo (a direção do u; `escala` em milímetro; nas letras, a altura da letra). */
export function metrosPorTileDoRelevo(tipo, escala, medidas = null) {
  return (medidas ?? medidasPadraoDoRelevo(tipo, escala)).comprimentoM;
}

const frac = (v) => v - Math.floor(v);
/* degrau suave: 1 dentro de `meia`, cai a 0 em `rampa` além dela */
const degrau = (d, meia, rampa) => (d < meia ? 1 : Math.max(0, 1 - (d - meia) / rampa));

/* desfoque de caixa circular (dá a volta no tile), `vezes` passadas, com raio em x e em y */
function suavizar(entrada, w, h, raioX, raioY, vezes) {
  let a = entrada;
  for (let v = 0; v < vezes; v += 1) {
    const b = new Float32Array(w * h);
    for (let j = 0; j < h; j += 1) {
      for (let i = 0; i < w; i += 1) {
        let soma = 0;
        for (let k = -raioX; k <= raioX; k += 1) soma += a[j * w + ((i + k + w) % w)];
        b[j * w + i] = soma / (2 * raioX + 1);
      }
    }
    const c = new Float32Array(w * h);
    for (let j = 0; j < h; j += 1) {
      for (let i = 0; i < w; i += 1) {
        let soma = 0;
        for (let k = -raioY; k <= raioY; k += 1) soma += b[((j + k + h) % h) * w + i];
        c[j * w + i] = soma / (2 * raioY + 1);
      }
    }
    a = c;
  }
  return a;
}

/* alturas em [0, 1], linha 0 em cima */
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

/* A banda de rodagem. x corre em volta (`blocos` períodos por tile), y corre pela largura, de ombro a ombro, uma vez só; o meio é
   y = 0,5 e o desenho é simétrico em torno dele. */
const SULCOS_DAS_COSTELAS = Object.freeze([0.18, 0.385, 0.615, 0.82]);

function alturaDaBanda(px, desenho, blocos) {
  const h = new Float32Array(px * px);
  for (let j = 0; j < px; j += 1) {
    /* a linha 0 é o ombro de cima e a última, o de baixo: o meio cai exatamente entre as duas linhas centrais */
    const y = (j + 0.5) / px;
    const yc = Math.abs(y - 0.5) * 2;
    for (let i = 0; i < px; i += 1) {
      const a = frac(blocos * ((i + 0.5) / px));
      let valor;
      if (desenho === 'v') {
        /* as garras: a fase anda 0,8 bloco do meio ao ombro, igual dos dois lados, e as duas metades se encontram em seta */
        const fase = frac(a + 0.8 * yc);
        const garra = degrau(Math.min(fase, 1 - fase), 0.12, 0.06);
        const lamela = degrau(Math.abs(fase - 0.5), 0.012, 0.02);
        valor = (1 - garra) * (1 - 0.5 * lamela);
      } else {
        let menor = 1;
        for (const g of SULCOS_DAS_COSTELAS) menor = Math.min(menor, Math.abs(y - g));
        const sulco = degrau(menor, 0.016, 0.012);
        /* o corte lateral curto: só no ombro, do canto para dentro, um por bloco */
        const noOmbro = y < 0.115 || y > 0.885 ? 1 : 0;
        const corte = noOmbro * degrau(Math.min(a, 1 - a), 0.07, 0.04);
        /* a lamela fina no meio de cada bloco, rasa */
        const lamela = degrau(Math.abs(a - 0.5), 0.016, 0.02);
        valor = (1 - sulco) * (1 - corte) * (1 - 0.5 * lamela);
      }
      h[j * px + i] = valor;
    }
  }
  return suavizar(h, px, px, Math.max(1, Math.round(px / 192)), Math.max(1, Math.round(px / 192)), 1);
}

/* A linha de texto das letras, centrada no tile; o resto do tile é fundo plano (altura 1) e a letra é baixo-relevo. */
function alturaDasLetras(largura, altura, comprimentoM, larguraM, escala) {
  const h = new Float32Array(largura * altura);
  const celula = escala / 7000;
  const texto = COLUNAS_DO_TEXTO * celula;
  const u0 = (comprimentoM - texto) / 2;
  const v0 = (larguraM - 7 * celula) / 2;
  const sub = 3;
  for (let j = 0; j < altura; j += 1) {
    for (let i = 0; i < largura; i += 1) {
      let cobre = 0;
      for (let b = 0; b < sub; b += 1) {
        for (let a = 0; a < sub; a += 1) {
          const mu = ((i + (a + 0.5) / sub) / largura) * comprimentoM - u0;
          const mv = ((j + (b + 0.5) / sub) / altura) * larguraM - v0;
          if (mu < 0 || mv < 0) continue;
          const cx = Math.floor(mu / celula);
          const cy = Math.floor(mv / celula);
          if (cy > 6 || cx >= COLUNAS_DO_TEXTO) continue;
          const c = cx % 6;
          if (c < 5 && FONTE[TEXTO_DAS_LETRAS[Math.floor(cx / 6)]][cy][c] === '1') cobre += 1;
        }
      }
      h[j * largura + i] = 1 - cobre / (sub * sub);
    }
  }
  const pixelU = comprimentoM / largura;
  const pixelV = larguraM / altura;
  return suavizar(h, largura, altura, Math.max(1, Math.round((celula * 0.25) / pixelU)), Math.max(1, Math.round((celula * 0.25) / pixelV)), 2);
}

function alturaDoGranulado(px, semente) {
  const n = PERIODOS_POR_TILE.granulado;
  return campoDeRuido(px, n, n, { detalhe: 1, rugosidade: 0.6, semente: semente * 977 + 5 });
}

function normalDaAltura(hmap, largura, altura, profundidadeM, metrosPorPixelU, metrosPorPixelV) {
  const rgba = new Uint8ClampedArray(largura * altura * 4);
  const ku = profundidadeM / (2 * metrosPorPixelU);
  const kv = profundidadeM / (2 * metrosPorPixelV);
  for (let j = 0; j < altura; j += 1) {
    const jm = (j - 1 + altura) % altura;
    const jp = (j + 1) % altura;
    for (let i = 0; i < largura; i += 1) {
      const im = (i - 1 + largura) % largura;
      const ip = (i + 1) % largura;
      const dx = (hmap[j * largura + ip] - hmap[j * largura + im]) * ku;
      /* a linha 0 da imagem é o alto da textura: o verde sobe com o v, que cresce para cima */
      const dy = (hmap[jm * largura + i] - hmap[jp * largura + i]) * kv;
      const inv = 1 / Math.hypot(dx, dy, 1);
      const p = (j * largura + i) * 4;
      rgba[p] = Math.round((-dx * inv * 0.5 + 0.5) * 255);
      rgba[p + 1] = Math.round((-dy * inv * 0.5 + 0.5) * 255);
      rgba[p + 2] = Math.round((inv * 0.5 + 0.5) * 255);
      rgba[p + 3] = 255;
    }
  }
  return rgba;
}

function mapaDeFator(fator, n) {
  const rgba = new Uint8ClampedArray(n * 4);
  for (let p = 0; p < n; p += 1) {
    rgba[p * 4] = 255;
    rgba[p * 4 + 1] = Math.round(limitar(fator[p]) * 255);
    rgba[p * 4 + 2] = 255;
    rgba[p * 4 + 3] = 255;
  }
  return rgba;
}

/**
 * Os mapas de um relevo.
 * @param {{tipo: string, escala: number, intensidade: number, desenho?: string}} relevo o relevo normalizado do material
 * @param {{px?: number, semente?: number, comprimentoM?: number, larguraM?: number}} [opcoes] `px` é a largura da imagem; a
 *   altura acompanha a razão `larguraM / comprimentoM` nas letras e é igual à largura nos demais
 * @returns {{largura: number, altura: number, normal: Uint8ClampedArray, aspereza: Uint8ClampedArray, relevo: Float32Array, metrosPorTile: number, metrosPorTileV: number}}
 *   `normal` e `aspereza` são RGBA 8 bits; `relevo` é a altura em [0, 1] (1 = topo), para quem prefere deslocar.
 */
export function gerarMapasDoRelevo(relevo, { px = 256, semente = 1, comprimentoM, larguraM } = {}) {
  if (!relevo || typeof relevo !== 'object') throw new ErroDeTextura('O relevo é obrigatório.');
  conferirPx(px);
  conferirSemente(semente);
  const { tipo } = relevo;
  if (!TIPOS_DE_RELEVO.includes(tipo)) throw new ErroDeTextura(`Tipo de relevo desconhecido: ${JSON.stringify(tipo)}.`);
  const escala = numeroEm(relevo.escala, 'relevo.escala', 0.01, 1000);
  const intensidade = numeroEm(relevo.intensidade, 'relevo.intensidade', 0, 1);
  const desenho = relevo.desenho ?? 'costelas';
  if (tipo === 'bandaDeRodagem' && !DESENHOS_DA_BANDA.includes(desenho)) {
    throw new ErroDeTextura(`relevo.desenho deve ser um de ${DESENHOS_DA_BANDA.join(', ')}.`);
  }
  const padrao = medidasPadraoDoRelevo(tipo, escala);
  let comp = comprimentoM ?? padrao.comprimentoM;
  let larg = larguraM ?? padrao.larguraM;
  if (tipo === 'bandaDeRodagem') {
    /* tile quadrado, de lado a largura da banda; o número de blocos em volta do tile é inteiro */
    comp = larguraM ?? comprimentoM ?? padrao.larguraM;
    larg = comp;
  }
  numeroEm(comp, 'comprimentoM', 1e-6, 100);
  numeroEm(larg, 'larguraM', 1e-6, 100);

  const largura = px;
  const altura = tipo === 'letras' ? Math.min(4096, Math.max(16, Math.round((px * larg) / comp))) : px;
  let hmap;
  if (tipo === 'prismas') hmap = alturaDosPrismas(px);
  else if (tipo === 'bandaDeRodagem') hmap = alturaDaBanda(px, desenho, Math.max(1, Math.round(larg / (escala / 1000))));
  else if (tipo === 'letras') hmap = alturaDasLetras(largura, altura, comp, larg, escala);
  else hmap = alturaDoGranulado(px, semente);

  const lado = tipo === 'prismas' || tipo === 'granulado' ? padrao.comprimentoM : comp;
  const ladoV = tipo === 'prismas' || tipo === 'granulado' ? padrao.larguraM : larg;
  /* nas letras o período que a profundidade segue é a largura da letra (5 células de 1/7 da altura) */
  const periodoM = tipo === 'letras' ? ((escala / 1000) / 7) * 5 : escala / 1000;
  const normal = normalDaAltura(hmap, largura, altura, intensidade * PROFUNDIDADE[tipo] * periodoM, lado / largura, ladoV / altura);

  /* a aspereza cai um pouco nas partes altas (polidas pelo uso) e fica inteira no fundo */
  const perda = ASPEREZA_DO_RELEVO[tipo] * intensidade;
  const fator = new Float32Array(largura * altura);
  for (let p = 0; p < fator.length; p += 1) fator[p] = 1 - perda * hmap[p];
  return {
    largura, altura, normal, aspereza: mapaDeFator(fator, largura * altura), relevo: hmap, metrosPorTile: lado, metrosPorTileV: ladoV,
  };
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
  return { largura: px, altura: px, aspereza: mapaDeFator(fator, px * px), metrosPorTile: METROS_POR_TILE_DOS_FLOCOS };
}
