#!/usr/bin/env node
/* leitura-por-regioes.mjs — a vista de referência e a captura do rascunho cortadas na mesma grade, região por região, ampliadas lado a
 * lado, com a resposta de cada região cobrada antes de a rodada valer.
 *
 * POR QUE ELE EXISTE. Na traseira da empilhadeira (2026-11-09) quem conduzia olhou a vista inteira quatro vezes e deixou passar a
 * tampa mais larga que o capô, a divisa em arco, uma listra no laranja e a borda arredondada em volta do vão; a pessoa achou as quatro.
 * Com o lugar apontado e ampliado, o defeito era visto na hora. Um crítico sem a história da construção, lendo as doze regiões das
 * folhas deste comando, achou três dos quatro nos rascunhos antigos e mais uma dezena que ninguém tinha listado. A ferramenta não
 * julga nada: entrega os lugares, um por um, na mesma escala, e recusa a rodada em que alguma região ficou sem resposta.
 *
 * O QUE ELE FAZ. Acha a caixa do objeto na captura (o que difere do fundo do painel), leva essa caixa à caixa declarada do objeto na
 * referência, cada eixo com a sua escala, e corta as duas na mesma grade, com sobreposição entre regiões vizinhas. Grava `indice.png`
 * (as duas vistas inteiras com a grade), `folha-NN.png` (três regiões por folha, a referência à esquerda e o rascunho à direita),
 * `pedido.md` (o pedido pronto para o crítico, com as perguntas de cada região) e `leitura.json`. A razão entre altura e largura das
 * duas caixas sai no relato: como cada eixo é ajustado em separado, a desproporção do objeto inteiro só aparece nesse número.
 *
 * AS RODADAS. `--registrar=<respostas.json>` confere que toda região da grade tem resposta, `{ "igual": true }` ou
 * `{ "diferencas": [{ "tipo": "forma", ... }, "detalhe: onde e o quê", ...] }`, e grava `rodadas/rodada-NN.json`; região sem resposta, resposta vazia ou nome que não é
 * da grade recusam a rodada com a lista. `aceitas: { "B1": ["..."] }` guarda a diferença que quem conduz decidiu não corrigir (o eixo
 * que não é da peça, o detalhe que fica para outra fatia), com o motivo, e o pedido seguinte a repete ao crítico naquela região.
 *
 * FORMA E DETALHE. Nas duas primeiras rodadas da traseira o crítico encheu as três diferenças de toda região, citou o que o pedido
 * mandava ignorar e, de uma rodada para a outra, trocou o lado de um adjetivo (o canto de baixo do laranja era vivo na referência e
 * depois abaulado). Por isso cada diferença diz o tipo: `forma` (contorno, proporção, divisa entre materiais, volume) é o que quem
 * conduz confere contra as linhas do modelo e corrige; `detalhe` (friso, botão, relevo, grade) vai em lista à fatia de detalhe. O
 * pedido diz que região certa leva `igual`, e `--fora` escreve nele o que aparece na referência e não é da peça.
 *
 * A DIFERENÇA EM CAMPOS. Com frases livres, o que uma rodada diz não se compara com o que a outra disse. Por isso o pedido pede cada
 * diferença como objeto, `{ "tipo": "forma" | "detalhe", "onde": "embaixo, à esquerda", "atributo": "canto de baixo do laranja",
 * "referencia": "abaulado", "modelo": "vivo" }`, em que `atributo` nomeia a coisa (uma borda, um canto, uma divisa, uma largura) e
 * `referencia` e `modelo` dizem como ela é em cada um. Os cinco campos são texto não vazio de até `LIMITE_DO_CAMPO` caracteres, o
 * `tipo` é da lista `TIPOS`, e campo a mais ou a menos recusa a rodada com a região e o campo. A frase antiga, que começa por
 * `forma:` ou `detalhe:`, continua aceita como antes, e o registro conta quantas diferenças vieram de cada jeito.
 *
 * A CONTRADIÇÃO ENTRE RODADAS. O rascunho muda de uma rodada para a outra; a referência não. No registro, cada diferença em campos é
 * comparada com a última diferença em campos sobre o mesmo atributo, na mesma região, das rodadas anteriores da pasta; se o que a
 * rodada nova diz da referência difere do que a anterior dizia, a rodada grava `contradicoes: [{ regiao, atributo, antes, agora,
 * rodadaAnterior }]`, o comando as lista e a próxima ação manda quem conduz olhar a folha daquela região e decidir qual das duas
 * leituras vale, em `aceitas` ou em `decididas: { "<região>": [{ "atributo", "vale", "motivo" }] }` nas respostas seguintes. A
 * ferramenta só acusa e não escolhe porque não sabe o que a referência mostra: escolher a mais nova, a mais repetida ou a que bate com
 * o rascunho seria julgar a forma por quem falou por último ou mais vezes, e quem sabe é quem olha a folha. A contradição não recusa a
 * rodada, porque as outras regiões dela continuam valendo. Um atributo decidido numa região (em `decididas` desta rodada ou de uma
 * anterior, ou numa frase de `aceitas` daquela região que contém todas as palavras significativas dele) não volta a ser acusado ali;
 * para reabrir, quem conduz tira a decisão.
 *
 * A REGRA DE COMPARAÇÃO. Dois textos (dois atributos, ou duas leituras da referência) são o mesmo quando têm o mesmo conjunto de
 * palavras significativas: o texto vai a minúsculas, perde os acentos e a pontuação, é cortado em palavras e perde as de `VAZIAS`
 * (artigos, preposições e suas contrações, `e`, `ou`, `que`). Assim "O canto de baixo do Laranja" é o mesmo atributo que "canto de
 * baixo, laranja", e "Vivo" é a mesma leitura que "vivo". A regra não conhece sinônimo, plural nem flexão: "canto inferior do
 * laranja" não cruza com "canto de baixo do laranja" (a contradição entre os dois passa), e "redondo" contra "arredondado" é acusado
 * como contradição sem ser. O primeiro limite deixa passar; o segundo custa uma decisão de quem conduz e nada mais.
 *
 * AS LINHAS DO MODELO. A linha suave dentro de uma cor (um friso, uma onda) o crítico toma por luz: a listra do capô passou. Com
 * `--linhas=<png>`, o desenho de `npm run linhas:modelo` (o contorno, a divisa, a quina e a dobra, tirados da malha na mesma vista)
 * entra como terceiro painel de cada região, sobre a referência clareada, e o pedido pergunta de cada linha se ela existe lá.
 *
 * O PAINEL DA VISTA RÁPIDA. A imagem da `vista:rapida` tem o fundo do painel em toda a imagem, e `acharPainel` (as linhas e colunas com um
 * quarto de pixels no fundo) a encurtava quando a peça ocupava o quadro: a leitura só cortava certo com `--painel` à mão (furgão,
 * 2026-11-11). Ao lado dela a `vista:rapida` grava `<png>.rapida.json` com o painel e o fundo, e esta leitura os usa quando `--painel` não vem.
 *
 * O MODELO. `--modelo=<esboço ou peça> --vista=<vista>` tira a captura (a vista rápida) e o desenho das linhas da própria malha, no mesmo
 * quadro, e monta a leitura sobre elas num comando só; `--recorte=x0,y0,z0,x1,y1,z1` (mm do referencial da peça) enquadra a caixa e a
 * `--caixa-ref` é a região da referência que corresponde a ela. Vale para a receita de peça (nome ou caminho) e para o esboço.
 *
 * POR PARTE E A PRANCHA. Na prancha lateral do carro (2026-11-14), a pessoa achou cinco diferenças apontando um trecho de cada vez, e o
 * agente acertava cada uma quando o trecho era apontado; a grade cortava a lanterna e a coluna na divisa entre regiões. Com
 * `--partes=<partes.json>` cada parte declarada em mm vira uma região com o nome dela, ampliada no centro do recorte com um entorno
 * (`--folga`), e a rodada só vale com toda parte respondida. Com `--prancha=<arquivo.prancha.mjs>` o lado do rascunho é a vista da
 * prancha só com o desenho (sem cotas, rótulos nem legenda), rasterizada no navegador, e a parte pode citar camadas da prancha; o
 * pedido diz ao crítico que ali há um desenho de linhas. `--espelhar` vira a referência vista do outro lado. A diferença de
 * altura sobre largura acima de `LIMITE_DA_PROPORCAO` sai como aviso, porque cada eixo é esticado em separado e esconde a deformação.
 *
 * USO
 *   npm run leitura:regioes -- --referencia=<png> --caixa-ref=x0,y0,x1,y1 --captura=<png> --saida=<pasta>
 *     [--painel=x0,y0,x1,y1] [--fundo=#rrggbb] [--grade=4x3] [--margem=12] [--objeto="a traseira de uma máquina, vista de trás"]
 *     [--linhas=<png>] [--fora="o eixo e as rodas"]
 *   npm run leitura:regioes -- --referencia=<png> --caixa-ref=x0,y0,x1,y1 --modelo=<esboço ou peça> --vista=<vista> --saida=<pasta>
 *     [--recorte=x0,y0,z0,x1,y1,z1] [--ate-passo=N] [--opcao=1] [--largura=900] [--composicoes=<módulo>] [--grade=4x3] [--objeto=...] [--fora=...]
 *   npm run leitura:regioes -- --saida=<pasta> --registrar=<respostas.json>
 *
 * `--caixa-ref` é a caixa do que é modelado, em px da referência (sem o que aparece nela e não é da peça). `--painel` é o retângulo
 * da captura que contém a peça; sem ele vale o da `<captura>.rapida.json`, se existir, ou o painel da folha do `esboco:nucleo`, achado pela cor de fundo
 * dele, ou a imagem inteira. */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

export const FUNDO_DO_PAINEL = [242, 244, 243];
export const GRADE_PADRAO = [4, 3];
export const SOBREPOSICAO = 0.2;
export const AMPLIACAO = 8;       // px da folha por px da referência
export const REGIOES_POR_FOLHA = 3;
export const LIMITE_DA_FRASE = 240;
export const TIPOS = Object.freeze(['forma', 'detalhe']);
export const LIMITE_DO_CAMPO = 80; // caracteres de cada campo da diferença em objeto: poucas palavras, não uma frase
export const CAMPOS_DA_DIFERENCA = Object.freeze(['tipo', 'onde', 'atributo', 'referencia', 'modelo']);
/* as palavras que não contam na comparação de atributo e de leitura, já sem acento */
export const VAZIAS = Object.freeze(new Set(['o', 'a', 'os', 'as', 'um', 'uma', 'uns', 'umas', 'de', 'do', 'da', 'dos', 'das', 'em', 'no', 'na',
  'nos', 'nas', 'num', 'numa', 'ao', 'aos', 'com', 'por', 'pelo', 'pela', 'pelos', 'pelas', 'para', 'pra', 'e', 'ou', 'que']));
const LETRAS = 'ABCDEFGHIJKL';
const AZUL = [0, 90, 255]; const PRETO = [20, 20, 20]; const BRANCO = [255, 255, 255];

export class ErroDaLeitura extends Error {
  constructor(mensagem) { super(mensagem); this.name = 'ErroDaLeitura'; }
}

/* --- imagem: um RGB por pixel num Uint8Array, sem alfa --------------------------------------------------------------------------- */
export const imagem = (largura, altura, cor = BRANCO) => {
  const dados = new Uint8Array(largura * altura * 3);
  for (let i = 0; i < dados.length; i += 3) { dados[i] = cor[0]; dados[i + 1] = cor[1]; dados[i + 2] = cor[2]; }
  return { largura, altura, dados };
};
export function dePng(buffer) {
  const png = PNG.sync.read(buffer);
  const im = imagem(png.width, png.height);
  for (let i = 0, j = 0; i < png.data.length; i += 4, j += 3) {
    const a = png.data[i + 3] / 255;
    for (let k = 0; k < 3; k += 1) im.dados[j + k] = Math.round(png.data[i + k] * a + 255 * (1 - a));
  }
  return im;
}
export function paraPng(im) {
  const png = new PNG({ width: im.largura, height: im.altura });
  for (let i = 0, j = 0; j < im.dados.length; i += 4, j += 3) {
    png.data[i] = im.dados[j]; png.data[i + 1] = im.dados[j + 1]; png.data[i + 2] = im.dados[j + 2]; png.data[i + 3] = 255;
  }
  return PNG.sync.write(png, { deflateLevel: 9 });
}
const pixel = (im, x, y) => { const i = (y * im.largura + x) * 3; return [im.dados[i], im.dados[i + 1], im.dados[i + 2]]; };

/** O retângulo [x0, y0, x1, y1) da imagem, em coordenada real, reamostrado para largura x altura: média da área ao reduzir, bilinear ao ampliar. Fora da imagem vale `fora`. */
export function reamostrar(im, [x0, y0, x1, y1], largura, altura, fora = BRANCO) {
  const sai = imagem(largura, altura);
  const px = (x1 - x0) / largura; const py = (y1 - y0) / altura;
  const le = (x, y, k) => (x < 0 || y < 0 || x >= im.largura || y >= im.altura ? fora[k] : im.dados[(y * im.largura + x) * 3 + k]);
  for (let v = 0; v < altura; v += 1) {
    for (let u = 0; u < largura; u += 1) {
      const o = (v * largura + u) * 3;
      if (px <= 1 && py <= 1) {
        const fx = x0 + (u + 0.5) * px - 0.5; const fy = y0 + (v + 0.5) * py - 0.5;
        const ix = Math.floor(fx); const iy = Math.floor(fy); const tx = fx - ix; const ty = fy - iy;
        for (let k = 0; k < 3; k += 1) {
          sai.dados[o + k] = Math.round((le(ix, iy, k) * (1 - tx) + le(ix + 1, iy, k) * tx) * (1 - ty) + (le(ix, iy + 1, k) * (1 - tx) + le(ix + 1, iy + 1, k) * tx) * ty);
        }
      } else {
        const ax = x0 + u * px; const bx = ax + px; const ay = y0 + v * py; const by = ay + py;
        const soma = [0, 0, 0]; let peso = 0;
        for (let y = Math.floor(ay); y < Math.ceil(by); y += 1) {
          const hy = Math.min(by, y + 1) - Math.max(ay, y);
          for (let x = Math.floor(ax); x < Math.ceil(bx); x += 1) {
            const w = hy * (Math.min(bx, x + 1) - Math.max(ax, x));
            for (let k = 0; k < 3; k += 1) soma[k] += le(x, y, k) * w;
            peso += w;
          }
        }
        for (let k = 0; k < 3; k += 1) sai.dados[o + k] = Math.round(soma[k] / peso);
      }
    }
  }
  return sai;
}
export function colar(destino, origem, x0, y0) {
  for (let y = 0; y < origem.altura; y += 1) {
    if (y0 + y < 0 || y0 + y >= destino.altura) continue;
    for (let x = 0; x < origem.largura; x += 1) {
      if (x0 + x < 0 || x0 + x >= destino.largura) continue;
      const o = ((y0 + y) * destino.largura + x0 + x) * 3; const i = (y * origem.largura + x) * 3;
      destino.dados[o] = origem.dados[i]; destino.dados[o + 1] = origem.dados[i + 1]; destino.dados[o + 2] = origem.dados[i + 2];
    }
  }
}
/** A imagem virada na horizontal: a referência vista do lado oposto ao do rascunho. */
export function espelhada(im) {
  const sai = imagem(im.largura, im.altura);
  for (let y = 0; y < im.altura; y += 1) for (let x = 0; x < im.largura; x += 1) {
    const o = (y * im.largura + x) * 3; const i = (y * im.largura + im.largura - 1 - x) * 3;
    sai.dados[o] = im.dados[i]; sai.dados[o + 1] = im.dados[i + 1]; sai.dados[o + 2] = im.dados[i + 2];
  }
  return sai;
}
function ponto(im, x, y, cor) {
  if (x < 0 || y < 0 || x >= im.largura || y >= im.altura) return;
  const o = (y * im.largura + x) * 3; im.dados[o] = cor[0]; im.dados[o + 1] = cor[1]; im.dados[o + 2] = cor[2];
}
function moldura(im, x0, y0, x1, y1, cor, espessura = 2) {
  for (let e = 0; e < espessura; e += 1) {
    for (let x = x0; x < x1; x += 1) { ponto(im, x, y0 + e, cor); ponto(im, x, y1 - 1 - e, cor); }
    for (let y = y0; y < y1; y += 1) { ponto(im, x0 + e, y, cor); ponto(im, x1 - 1 - e, y, cor); }
  }
}
/* as letras e os dígitos das etiquetas, 5 x 7 */
const GLIFOS = {
  A: '01110 10001 10001 11111 10001 10001 10001', B: '11110 10001 10001 11110 10001 10001 11110', C: '01111 10000 10000 10000 10000 10000 01111',
  D: '11110 10001 10001 10001 10001 10001 11110', E: '11111 10000 10000 11110 10000 10000 11111', F: '11111 10000 10000 11110 10000 10000 10000',
  G: '01111 10000 10000 10011 10001 10001 01111', H: '10001 10001 10001 11111 10001 10001 10001', I: '11111 00100 00100 00100 00100 00100 11111',
  J: '00111 00010 00010 00010 00010 10010 01100', K: '10001 10010 10100 11000 10100 10010 10001', L: '10000 10000 10000 10000 10000 10000 11111',
  N: '10001 11001 10101 10011 10001 10001 10001', O: '01110 10001 10001 10001 10001 10001 01110', R: '11110 10001 10001 11110 10100 10010 10001',
  S: '01111 10000 10000 01110 00001 00001 11110', U: '10001 10001 10001 10001 10001 10001 01110',
  M: '10001 11011 10101 10101 10001 10001 10001', P: '11110 10001 10001 11110 10000 10000 10000', Q: '01110 10001 10001 10001 10101 10010 01101',
  T: '11111 00100 00100 00100 00100 00100 00100', V: '10001 10001 10001 10001 10001 01010 00100', W: '10001 10001 10001 10101 10101 10101 01010',
  X: '10001 10001 01010 00100 01010 10001 10001', Y: '10001 10001 01010 00100 00100 00100 00100', Z: '11111 00001 00010 00100 01000 10000 11111',
  '-': '00000 00000 00000 11111 00000 00000 00000',
  0: '01110 10001 10011 10101 11001 10001 01110', 1: '00100 01100 00100 00100 00100 00100 01110', 2: '01110 10001 00001 00010 00100 01000 11111',
  3: '11110 00001 00001 01110 00001 00001 11110', 4: '00010 00110 01010 10010 11111 00010 00010', 5: '11111 10000 11110 00001 00001 10001 01110',
  6: '00110 01000 10000 11110 10001 10001 01110', 7: '11111 00001 00010 00100 01000 01000 01000', 8: '01110 10001 10001 01110 10001 10001 01110',
  9: '01110 10001 10001 01111 00001 00010 01100',
};
export function escrever(im, texto, x0, y0, cor = PRETO, escala = 3) {
  let x = x0;
  for (const c of String(texto).toUpperCase()) {
    const g = GLIFOS[c];
    if (g) g.split(' ').forEach((linha, v) => [...linha].forEach((b, u) => {
      if (b === '1') for (let dy = 0; dy < escala; dy += 1) for (let dx = 0; dx < escala; dx += 1) ponto(im, x + u * escala + dx, y0 + v * escala + dy, cor);
    }));
    x += 6 * escala;
  }
}

/* --- a caixa do objeto e o painel ------------------------------------------------------------------------------------------------ */
const distancia = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);

/** O painel da folha do esboço: as linhas e colunas em que pelo menos um quarto dos pixels tem a cor de fundo dele. Sem painel, null. */
export function acharPainel(im, fundo = FUNDO_DO_PAINEL) {
  const porLinha = new Uint32Array(im.altura); const porColuna = new Uint32Array(im.largura);
  for (let y = 0; y < im.altura; y += 1) for (let x = 0; x < im.largura; x += 1) if (distancia(pixel(im, x, y), fundo) <= 2) { porLinha[y] += 1; porColuna[x] += 1; }
  const faixa = (v, total) => { const idx = [...v.keys()].filter((i) => v[i] > total / 4); return idx.length ? [idx[0], idx[idx.length - 1] + 1] : null; };
  const ys = faixa(porLinha, im.largura); const xs = faixa(porColuna, im.altura);
  return ys && xs ? [xs[0], ys[0], xs[1], ys[1]] : null;
}

/** A caixa [x0, y0, x1, y1) do que difere do fundo dentro do painel. */
export function caixaDoObjeto(im, painel, fundo, tolerancia = 30) {
  let x0 = Infinity; let y0 = Infinity; let x1 = -1; let y1 = -1;
  for (let y = painel[1]; y < painel[3]; y += 1) for (let x = painel[0]; x < painel[2]; x += 1) {
    if (distancia(pixel(im, x, y), fundo) > tolerancia) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  if (x1 < 0) throw new ErroDaLeitura('a captura não tem nada além do fundo dentro do painel; confira --painel e --fundo');
  return [x0, y0, x1 + 1, y1 + 1];
}

/** As regiões da grade sobre uma imagem de largura x altura, com sobreposição entre vizinhas: [{ nome, x, y, largura, altura }]. */
export function regioesDaGrade(largura, altura, [colunas, linhas] = GRADE_PADRAO, sobreposicao = SOBREPOSICAO) {
  if (!Number.isInteger(colunas) || !Number.isInteger(linhas) || colunas < 1 || linhas < 1 || linhas > LETRAS.length || colunas > 9) {
    throw new ErroDaLeitura(`grade ${colunas}x${linhas} fora do aceito: de 1 a 9 colunas e de 1 a ${LETRAS.length} linhas`);
  }
  const lw = largura / (colunas - (colunas - 1) * sobreposicao); const lh = altura / (linhas - (linhas - 1) * sobreposicao);
  const regioes = [];
  for (let l = 0; l < linhas; l += 1) for (let c = 0; c < colunas; c += 1) {
    regioes.push({ nome: `${LETRAS[l]}${c + 1}`, x: Math.round(c * lw * (1 - sobreposicao)), y: Math.round(l * lh * (1 - sobreposicao)), largura: Math.round(lw), altura: Math.round(lh) });
  }
  return regioes;
}

/* --- as partes declaradas ------------------------------------------------------------------------------------------------------- */
export const FOLGA_DA_PARTE = 0.15;          // contexto em volta de cada parte, em fração do maior lado dela
export const FOLGA_MINIMA = 0.03;            // e no mínimo esta fração do objeto
export const LADO_DO_PAINEL_DA_PARTE = 1200; // px do maior lado do painel de uma parte na folha
export const LIMITE_DA_PROPORCAO = 0.1;      // acima disto a diferença de altura sobre largura sai como aviso
const NOME_DA_PARTE = /^[A-Za-z][A-Za-z0-9-]*$/;

/**
 * As partes de uma declaração em mm levadas a fração da caixa do objeto, com y para baixo como na imagem.
 * @param {{ caixa: number[], partes: Record<string, number[]> }} d  `caixa` e cada parte são [a0, b0, a1, b1] em mm, a para a direita e b para cima
 * @returns {{ nome: string, fracao: number[] }[]}
 */
export function partesEmFracao(d, origem = '--partes') {
  const caixaOk = (c) => Array.isArray(c) && c.length === 4 && c.every(Number.isFinite) && c[2] > c[0] && c[3] > c[1];
  if (!caixaOk(d?.caixa)) throw new ErroDaLeitura(`${origem}: "caixa" precisa ser [a0, b0, a1, b1] em mm, com a1 > a0 e b1 > b0; veio ${JSON.stringify(d?.caixa)}`);
  const entradas = Object.entries(d.partes ?? {});
  if (!entradas.length) throw new ErroDaLeitura(`${origem}: "partes" precisa de pelo menos uma parte { "<nome>": [a0, b0, a1, b1] }`);
  const [A0, B0, A1, B1] = d.caixa;
  return entradas.map(([nome, c]) => {
    if (!NOME_DA_PARTE.test(nome)) throw new ErroDaLeitura(`${origem}: o nome "${nome}" precisa começar por letra e ter só letras sem acento, dígitos e hífen, porque sai escrito na folha`);
    if (!caixaOk(c)) throw new ErroDaLeitura(`${origem}: a parte "${nome}" precisa ser [a0, b0, a1, b1] em mm, com a1 > a0 e b1 > b0; veio ${JSON.stringify(c)}`);
    if (c[2] <= A0 || c[0] >= A1 || c[3] <= B0 || c[1] >= B1) throw new ErroDaLeitura(`${origem}: a parte "${nome}" ${JSON.stringify(c)} fica fora da caixa do objeto ${JSON.stringify(d.caixa)}`);
    return { nome, fracao: [(c[0] - A0) / (A1 - A0), (B1 - c[3]) / (B1 - B0), (c[2] - A0) / (A1 - A0), (B1 - c[1]) / (B1 - B0)] };
  });
}

/** As regiões das partes sobre uma imagem de largura x altura com a caixa do objeto a `m` px da borda: [{ nome, x, y, largura, altura }]. */
export function regioesDasPartes(partes, largura, altura, m, folga = FOLGA_DA_PARTE) {
  const lw = largura - 2 * m; const lh = altura - 2 * m;
  return partes.map(({ nome, fracao: [f0, g0, f1, g1] }) => {
    const px = Math.max(folga * Math.max((f1 - f0) * lw, (g1 - g0) * lh), FOLGA_MINIMA * Math.max(lw, lh));
    const x0 = Math.max(0, Math.round(m + f0 * lw - px)); const y0 = Math.max(0, Math.round(m + g0 * lh - px));
    const x1 = Math.min(largura, Math.round(m + f1 * lw + px)); const y1 = Math.min(altura, Math.round(m + g1 * lh + px));
    return { nome, x: x0, y: y0, largura: x1 - x0, altura: y1 - y0 };
  });
}

/**
 * Monta a leitura: as duas vistas na mesma grade, ou uma região por parte declarada (`partes`, de `partesEmFracao`).
 * @param {{ referencia, captura, caixaRef: number[], painel?: number[], fundo?: number[], grade?: number[], margem?: number, linhas?, partes?: object[], folga?: number, espelhar?: boolean, rotulo?: string }} o
 *   as imagens no formato de `dePng`; `linhas` é o desenho de `linhas:modelo`; `espelhar` vira a referência na horizontal, com
 *   `caixaRef` dada na imagem original; `rotulo` é o nome do lado do rascunho nas imagens (RASCUNHO, ou PRANCHA)
 * @returns {{ indice, folhas: object[], regioes: object[], proporcao: { referencia: number, rascunho: number }, caixaDaCaptura: number[], painel: number[] }}
 */
export function montarLeitura(o) {
  if (o.caixaRef[0] < 0 || o.caixaRef[2] > o.referencia.largura || !(o.caixaRef[2] > o.caixaRef[0])) {
    throw new ErroDaLeitura(`--caixa-ref ${o.caixaRef.join(',')} não cabe na referência de ${o.referencia.largura} x ${o.referencia.altura} px`);
  }
  const referencia = o.espelhar ? espelhada(o.referencia) : o.referencia;
  const [rx0, ry0, rx1, ry1] = o.espelhar ? [o.referencia.largura - o.caixaRef[2], o.caixaRef[1], o.referencia.largura - o.caixaRef[0], o.caixaRef[3]] : o.caixaRef;
  if (!(rx1 > rx0 && ry1 > ry0) || rx0 < 0 || ry0 < 0 || rx1 > referencia.largura || ry1 > referencia.altura) {
    throw new ErroDaLeitura(`--caixa-ref ${o.caixaRef.join(',')} não cabe na referência de ${referencia.largura} x ${referencia.altura} px`);
  }
  const rotulo = o.rotulo ?? 'RASCUNHO';
  const achado = o.painel ? null : acharPainel(o.captura, o.fundo ?? FUNDO_DO_PAINEL);
  const painel = o.painel ?? achado ?? [0, 0, o.captura.largura, o.captura.altura];
  const fundo = o.fundo ?? (achado ? FUNDO_DO_PAINEL : pixel(o.captura, painel[0], painel[1]));
  const caixa = caixaDoObjeto(o.captura, painel, fundo);
  const margem = o.margem ?? 12;
  const fx = (caixa[2] - caixa[0]) / (rx1 - rx0); const fy = (caixa[3] - caixa[1]) / (ry1 - ry0);
  const L = (rx1 - rx0 + 2 * margem) * AMPLIACAO; const A = (ry1 - ry0 + 2 * margem) * AMPLIACAO;
  const ref = reamostrar(referencia, [rx0 - margem, ry0 - margem, rx1 + margem, ry1 + margem], L, A);
  const ras = reamostrar(o.captura, [caixa[0] - margem * fx, caixa[1] - margem * fy, caixa[2] + margem * fx, caixa[3] + margem * fy], L, A, fundo);
  /* as linhas do modelo, que ocupam a caixa do objeto inteira, sobre a referência clareada */
  let lin = null;
  if (o.linhas) {
    lin = imagem(L, A);
    for (let i = 0; i < lin.dados.length; i += 1) lin.dados[i] = Math.round(ref.dados[i] * 0.4 + 255 * 0.6);
    const m = margem * AMPLIACAO; const lw = L - 2 * m; const lh = A - 2 * m;
    for (let y = 0; y < lh; y += 1) for (let x = 0; x < lw; x += 1) {
      const c = pixel(o.linhas, Math.min(o.linhas.largura - 1, Math.floor((x / lw) * o.linhas.largura)), Math.min(o.linhas.altura - 1, Math.floor((y / lh) * o.linhas.altura)));
      if (c[0] + c[1] + c[2] < 720) { const d = ((y + m) * L + x + m) * 3; lin.dados[d] = c[0]; lin.dados[d + 1] = c[1]; lin.dados[d + 2] = c[2]; }
    }
  }
  const vistas = lin ? [ref, ras, lin] : [ref, ras];
  const porParte = Boolean(o.partes?.length);
  const cortes = porParte ? regioesDasPartes(o.partes, L, A, margem * AMPLIACAO, o.folga ?? FOLGA_DA_PARTE) : regioesDaGrade(L, A, o.grade ?? GRADE_PADRAO);
  const regioes = cortes.map((r, i) => ({ ...r, folha: Math.floor(i / REGIOES_POR_FOLHA) + 1 }));
  /* o painel de cada região na folha: na grade, do tamanho do corte; por parte, com o maior lado em LADO_DO_PAINEL_DA_PARTE */
  const tamanho = (r) => {
    if (!porParte) return [r.largura, r.altura];
    const s = LADO_DO_PAINEL_DA_PARTE / Math.max(r.largura, r.altura);
    return [Math.max(1, Math.round(r.largura * s)), Math.max(1, Math.round(r.altura * s))];
  };
  /* o índice: as duas vistas pela metade, com a grade ou as partes */
  const e = 0.5; const iw = Math.round(L * e); const ih = Math.round(A * e); const faixa = 40;
  const indice = imagem(vistas.length * (iw + 30) - 30, ih + faixa);
  escrever(indice, 'REF', 6, 9); escrever(indice, rotulo, iw + 36, 9);
  if (lin) escrever(indice, 'LINHAS', 2 * (iw + 30) + 6, 9);
  vistas.forEach((im, k) => {
    const pequena = reamostrar(im, [0, 0, L, A], iw, ih);
    for (const r of regioes) {
      moldura(pequena, Math.round(r.x * e), Math.round(r.y * e), Math.round((r.x + r.largura) * e), Math.round((r.y + r.altura) * e), AZUL, 1);
      escrever(pequena, r.nome, Math.round(r.x * e) + 5, Math.round(r.y * e) + 5, AZUL, 2);
    }
    colar(indice, pequena, k * (iw + 30), faixa);
  });
  /* as folhas: três regiões por folha, a referência à esquerda e o rascunho à direita */
  const folhas = [];
  for (let k = 0; k < regioes.length; k += REGIOES_POR_FOLHA) {
    const grupo = regioes.slice(k, k + REGIOES_POR_FOLHA);
    const pw = Math.max(...grupo.map((r) => tamanho(r)[0]));
    const alturas = grupo.map((r) => tamanho(r)[1]);
    const folha = imagem(vistas.length * (pw + 30) - 10, alturas.reduce((s, h) => s + h + faixa + 10, 0) + 10);
    let y = 10;
    grupo.forEach((r) => {
      const [w, h] = tamanho(r);
      /* o nome da parte pode ser longo: REF vai depois dele */
      escrever(folha, r.nome, 10, y + 6, AZUL, 4); escrever(folha, 'REF', Math.max(110, 10 + 24 * (r.nome.length + 1)), y + 9); escrever(folha, rotulo, pw + 40, y + 9);
      if (lin) escrever(folha, 'LINHAS', 2 * pw + 70, y + 9);
      vistas.forEach((im, lado) => colar(folha, reamostrar(im, [r.x, r.y, r.x + r.largura, r.y + r.altura], w, h), 10 + lado * (pw + 30), y + faixa));
      y += h + faixa + 10;
    });
    folhas.push(folha);
  }
  const paraRef = (r) => [rx0 - margem + r.x / AMPLIACAO, ry0 - margem + r.y / AMPLIACAO, rx0 - margem + (r.x + r.largura) / AMPLIACAO, ry0 - margem + (r.y + r.altura) / AMPLIACAO].map((v) => Math.round(v));
  return {
    indice, folhas, painel, caixaDaCaptura: caixa, comLinhas: Boolean(lin), porParte, rotulo,
    regioes: regioes.map((r) => ({ nome: r.nome, folha: r.folha, caixaRef: paraRef(r) })),
    proporcao: { referencia: (ry1 - ry0) / (rx1 - rx0), rascunho: (caixa[3] - caixa[1]) / (caixa[2] - caixa[0]) },
  };
}

/* como o pedido chama o lado do rascunho, por rótulo das imagens */
const LADOS = {
  RASCUNHO: { nome: 'um RASCUNHO 3D', curto: 'o rascunho', extra: '' },
  PRANCHA: {
    nome: 'uma PRANCHA (um desenho de linhas, sem cor, sem luz e sem volume)', curto: 'a prancha',
    extra: `\nA prancha só tem linhas: o contorno, as divisas de painel, os vidros, as luzes e as curvas de caráter tracejadas. Compare a
posição, o tamanho e a forma de cada linha com a borda ou a divisa que a referência mostra no mesmo lugar; cor, reflexo e volume não
contam, e a falta de cor na prancha não é diferença.`,
  },
};

/** O pedido ao crítico: as folhas, as perguntas de cada região e o formato da resposta. */
export function pedido({ pasta, regioes, folhas, objeto, aceitas = {}, linhas = false, fora = null, porParte = false, rotulo = 'RASCUNHO' }) {
  const nomes = regioes.map((r) => r.nome);
  const jaAceitas = Object.entries(aceitas).filter(([, v]) => v.length);
  const lado = LADOS[rotulo] ?? LADOS.RASCUNHO;
  const lista = porParte ? nomes.join(', ') : `${nomes[0]} a ${nomes[nomes.length - 1]}`;
  return `# Leitura por ${porParte ? 'partes' : 'regiões'}

Você compara ${lado.nome} com a IMAGEM DE REFERÊNCIA do mesmo objeto${objeto ? ` (${objeto})` : ''}, ${porParte ? 'parte por parte' : 'região por região'}. Você não
conhece a história da construção e não supõe nada além do que vê.${lado.extra}

Abra com Read, nesta ordem: \`${join(pasta, 'indice.png')}\` (as duas vistas inteiras com ${porParte ? 'o quadro de cada parte' : 'a grade'}; a referência à esquerda e
${lado.curto} à direita) e depois ${Array.from({ length: folhas }, (_, i) => `\`${join(pasta, `folha-${String(i + 1).padStart(2, '0')}.png`)}\``).join(', ')}.
Cada folha traz até ${REGIOES_POR_FOLHA} ${porParte ? 'partes' : 'regiões'} ampliadas, a referência à esquerda e ${lado.curto} à direita, no mesmo recorte e na mesma escala.${porParte ? `
Cada região é uma parte do objeto, com o nome dela escrito em maiúsculas na folha e, na resposta, como está na lista abaixo. A parte fica
no centro do recorte, com um pouco do entorno; diga também se ela está no lugar e no tamanho da referência.` : ''}${linhas ? `
O terceiro painel, LINHAS, é a referência clareada com as linhas que o MODELO tem, tiradas da geometria dele e não da luz: em
vermelho o contorno e a divisa entre partes, em azul a quina e o degrau, em verde a dobra fechada da superfície.` : ''}

Para CADA ${porParte ? 'parte' : 'região'} (${lista}), olhando só a forma (ignore brilho, sombra, textura e acabamento):${fora ? `
Não é do corpo modelado, e você não cita: ${fora}.` : ''}

1. Onde é cada cor ou material na referência e onde é no rascunho: as divisas estão no mesmo lugar e têm a mesma forma?
2. Há linha, borda, degrau, friso ou quina que existe na referência e falta no rascunho? E que existe no rascunho e não na referência?
3. Cantos e contornos: redondo contra reto, côncavo contra convexo, largura e proporção.
${linhas ? `4. No painel LINHAS: cada linha colorida do modelo tem debaixo dela uma linha, borda ou mudança de forma da referência? Diga cada
   linha do modelo que passa onde a referência é lisa, e cada linha da referência que não tem linha do modelo perto.
` : ''}${jaAceitas.length ? `\nJá aceito por quem conduz, e que você não repete:\n${jaAceitas.map(([n, v]) => `- ${n}: ${v.join('; ')}`).join('\n')}\n` : ''}
Responda com um JSON e nada mais, com TODAS as regiões:

\`\`\`json
{ "regioes": { "${nomes[0]}": { "igual": true }, "${nomes[1] ?? nomes[0]}": { "diferencas": [
    { "tipo": "forma", "onde": "em cima, à direita", "atributo": "canto do vão", "referencia": "redondo", "modelo": "chanfrado" } ] } },
  "graves": ["as três diferenças mais graves da vista inteira, uma frase cada"] }
\`\`\`

Cada diferença é um objeto com os cinco campos, cada um com até ${LIMITE_DO_CAMPO} caracteres: \`tipo\` é \`forma\` ou \`detalhe\`; \`onde\` diz o
lugar na região (em cima, embaixo, à esquerda, à direita, no centro); \`atributo\` nomeia a coisa que difere (uma borda, um canto, uma
divisa, uma largura), sempre com o mesmo nome para a mesma coisa; \`referencia\` e \`modelo\` dizem, em poucas palavras, como ela é em
cada um. \`referencia\` e \`modelo\` vão separados porque a referência não muda de uma rodada para a outra, e o que você diz dela é
comparado com o que se disse nas rodadas anteriores. \`forma\` é o contorno, a proporção, a posição e a forma da divisa entre materiais e
o volume de uma parte; \`detalhe\` é o que cabe dentro de uma parte sem mudar o contorno dela: friso, botão, relevo, grade, furo. Liste só
o que você vê com segurança, as de forma primeiro, no máximo três por região; a região sem diferença leva \`{ "igual": true }\`, e
é isso que se espera de uma região certa.
`;
}

/** Confere as respostas contra as regiões da grade. Devolve `{ recusas, iguais, comDiferenca, diferencas }`. */
export function conferirRespostas(regioes, respostas) {
  const recusas = [];
  const dadas = respostas?.regioes;
  if (dadas == null || typeof dadas !== 'object' || Array.isArray(dadas)) return { recusas: ['as respostas precisam de "regioes": { "<nome>": { "igual": true } | { "diferencas": [...] } }'], iguais: [], comDiferenca: [], diferencas: 0, porTipo: {} };
  const nomes = new Set(regioes.map((r) => r.nome));
  for (const n of Object.keys(dadas)) if (!nomes.has(n)) recusas.push(`a região "${n}" não é da grade (${regioes[0].nome} a ${regioes[regioes.length - 1].nome})`);
  const iguais = []; const comDiferenca = []; let diferencas = 0; const porTipo = Object.fromEntries(TIPOS.map((t) => [t, 0]));
  for (const { nome } of regioes) {
    const r = dadas[nome];
    if (r == null) { recusas.push(`a região ${nome} ficou sem resposta`); continue; }
    const lista = r.diferencas;
    if (r.igual === true && (lista == null || lista.length === 0)) { iguais.push(nome); continue; }
    if (!Array.isArray(lista) || lista.length === 0) { recusas.push(`a região ${nome} não diz "igual": true nem lista diferenças`); continue; }
    if (r.igual === true) { recusas.push(`a região ${nome} diz "igual": true e lista diferenças`); continue; }
    const frases = lista.filter((d) => !ehObjeto(d));
    const ruim = frases.find((d) => typeof d !== 'string' || !d.trim() || d.length > LIMITE_DA_FRASE);
    if (ruim !== undefined) { recusas.push(`a região ${nome} tem uma diferença vazia ou com mais de ${LIMITE_DA_FRASE} caracteres`); continue; }
    const semTipo = frases.find((d) => !TIPOS.some((t) => d.startsWith(`${t}:`)));
    if (semTipo !== undefined) { recusas.push(`a região ${nome} tem uma diferença que não começa por ${TIPOS.map((t) => `"${t}:"`).join(' ou ')}`); continue; }
    const erroDoObjeto = lista.map((d, i) => (ehObjeto(d) ? erroDaDiferenca(d, nome, i + 1) : null)).find(Boolean);
    if (erroDoObjeto) { recusas.push(erroDoObjeto); continue; }
    comDiferenca.push(nome); diferencas += lista.length;
    for (const t of TIPOS) porTipo[t] += lista.filter((d) => tipoDa(d) === t).length;
  }
  for (const [n, v] of Object.entries(respostas.aceitas ?? {})) {
    if (!nomes.has(n)) recusas.push(`"aceitas" cita a região "${n}", que não é da grade`);
    else if (!Array.isArray(v) || v.some((d) => typeof d !== 'string' || !d.trim())) recusas.push(`"aceitas" da região ${n} precisa ser uma lista de frases com o motivo`);
  }
  const decididas = respostas.decididas ?? {};
  if (typeof decididas !== 'object' || Array.isArray(decididas)) recusas.push('"decididas" precisa ser { "<região>": [{ "atributo", "vale", "motivo" }] }');
  else for (const [n, v] of Object.entries(decididas)) {
    if (!nomes.has(n)) { recusas.push(`"decididas" cita a região "${n}", que não é da grade`); continue; }
    if (!Array.isArray(v)) { recusas.push(`"decididas" da região ${n} precisa ser uma lista de { "atributo", "vale", "motivo" }`); continue; }
    v.forEach((d, i) => {
      const falta = ['atributo', 'vale', 'motivo'].find((c) => !ehObjeto(d) || typeof d[c] !== 'string' || !d[c].trim());
      if (falta) recusas.push(`"decididas" da região ${n}, item ${i + 1}: o campo "${falta}" precisa ser texto não vazio`);
    });
  }
  return { recusas, iguais, comDiferenca, diferencas, porTipo };
}

const ehObjeto = (d) => d != null && typeof d === 'object' && !Array.isArray(d);
/** O tipo de uma diferença, em frase (`forma: ...`) ou em objeto. */
export const tipoDa = (d) => (ehObjeto(d) ? d.tipo : TIPOS.find((t) => String(d).startsWith(`${t}:`)));
/** A primeira coisa errada de uma diferença em objeto, com a região e o campo, ou null. */
function erroDaDiferenca(d, regiao, indice) {
  const aqui = `a região ${regiao}, diferença ${indice}`;
  const sobra = Object.keys(d).find((c) => !CAMPOS_DA_DIFERENCA.includes(c));
  if (sobra) return `${aqui}: o campo "${sobra}" não é do formato (${CAMPOS_DA_DIFERENCA.join(', ')})`;
  for (const c of CAMPOS_DA_DIFERENCA) {
    if (d[c] == null) return `${aqui}: falta o campo "${c}"`;
    if (typeof d[c] !== 'string' || !d[c].trim()) return `${aqui}: o campo "${c}" precisa ser texto não vazio`;
    if (d[c].length > LIMITE_DO_CAMPO) return `${aqui}: o campo "${c}" passa de ${LIMITE_DO_CAMPO} caracteres`;
  }
  if (!TIPOS.includes(d.tipo)) return `${aqui}: o campo "tipo" vale "${d.tipo}" e precisa ser ${TIPOS.map((t) => `"${t}"`).join(' ou ')}`;
  return null;
}

/** As palavras significativas de um texto: minúsculas, sem acento nem pontuação, sem as de `VAZIAS`. Ver A REGRA DE COMPARAÇÃO. */
export function palavras(texto) {
  const p = String(texto).toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').split(/[^a-z0-9]+/).filter((w) => w && !VAZIAS.has(w));
  return new Set(p);
}
/** Dois textos dizem o mesmo quando têm o mesmo conjunto de palavras significativas, e nenhum deles fica vazio. */
export function mesmoTexto(a, b) {
  const x = palavras(a); const y = palavras(b);
  return x.size > 0 && x.size === y.size && [...x].every((w) => y.has(w));
}
const contemTexto = (frase, atributo) => { const f = palavras(frase); const a = palavras(atributo); return a.size > 0 && [...a].every((w) => f.has(w)); };

/**
 * As contradições de uma rodada nova contra as anteriores: para cada diferença em objeto, a última diferença em objeto sobre o mesmo
 * atributo na mesma região, nas rodadas anteriores (da mais nova para a mais velha), e a contradição quando o que elas dizem da
 * referência difere. O atributo decidido naquela região, em `decididas` ou em `aceitas`, desta rodada ou de uma anterior, não é acusado.
 * @param {{ regioes: object, aceitas?: object, decididas?: object }} respostas  as respostas da rodada nova, já conferidas
 * @param {{ numero: number, regioes: object, aceitas?: object, decididas?: object }[]} anteriores  as rodadas gravadas, em ordem
 * @returns {{ regiao: string, atributo: string, antes: string, agora: string, rodadaAnterior: number }[]}
 */
export function acharContradicoes(respostas, anteriores) {
  const todas = [...anteriores, respostas];
  const decidido = (regiao, atributo) => todas.some((r) => (r.decididas?.[regiao] ?? []).some((d) => mesmoTexto(d.atributo, atributo))
    || (r.aceitas?.[regiao] ?? []).some((f) => contemTexto(f, atributo)));
  const contradicoes = [];
  for (const [regiao, resposta] of Object.entries(respostas.regioes ?? {})) {
    for (const d of (resposta.diferencas ?? []).filter(ehObjeto)) {
      if (decidido(regiao, d.atributo)) continue;
      let anterior = null;
      for (let k = anteriores.length - 1; k >= 0 && !anterior; k -= 1) {
        const achada = (anteriores[k].regioes?.[regiao]?.diferencas ?? []).filter(ehObjeto).find((x) => mesmoTexto(x.atributo, d.atributo));
        if (achada) anterior = { numero: anteriores[k].numero, referencia: achada.referencia };
      }
      if (anterior && !mesmoTexto(anterior.referencia, d.referencia)) {
        contradicoes.push({ regiao, atributo: d.atributo, antes: anterior.referencia, agora: d.referencia, rodadaAnterior: anterior.numero });
      }
    }
  }
  return contradicoes;
}

/* --- a consolidação de vários críticos ------------------------------------------------------------------------------------------- */
/* palavras de atributo que não nomeiam uma coisa do objeto: duas diferenças só se juntam por uma palavra fora desta lista */
export const GENERICAS = Object.freeze(new Set(['linha', 'borda', 'contorno', 'forma', 'canto', 'curva', 'divisa', 'perfil', 'base', 'face', 'parte',
  'lado', 'superior', 'inferior', 'traseiro', 'traseira', 'dianteiro', 'dianteira', 'frontal', 'lateral', 'ponta', 'topo', 'saida', 'entrada',
  'altura', 'largura', 'posicao', 'tamanho', 'regiao', 'centro', 'meio', 'baixo', 'alto', 'cima']));
const raiz = (w) => (w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w);
/** As palavras de um atributo que nomeiam a coisa: as significativas, no singular, sem as de `GENERICAS`. */
export const palavrasDaCoisa = (texto) => new Set([...palavras(texto)].map(raiz).filter((w) => !GENERICAS.has(w)));

/** O ponto que `onde` aponta dentro de uma caixa [x0, y0, x1, y1]: um sexto da borda para cada lado dito, o meio no resto. */
export function pontoDoOnde(onde, [x0, y0, x1, y1]) {
  const p = palavras(onde);
  const fx = p.has('esquerda') ? 1 / 6 : p.has('direita') ? 5 / 6 : 0.5;
  const fy = (p.has('cima') || p.has('alto') || p.has('topo')) ? 1 / 6 : (p.has('embaixo') || p.has('baixo')) ? 5 / 6 : 0.5;
  return [x0 + fx * (x1 - x0), y0 + fy * (y1 - y0)];
}
/** A parte da diferença: na leitura por partes, a da região; na grade, a menor parte cuja caixa contém o ponto do `onde`, ou a mais próxima. */
export function parteDoPonto([x, y], partes) {
  const dentro = partes.filter(({ caixaRef: [a, b, c, d] }) => x >= a && x <= c && y >= b && y <= d);
  const area = ({ caixaRef: [a, b, c, d] }) => (c - a) * (d - b);
  if (dentro.length) return dentro.reduce((m, p) => (area(p) < area(m) ? p : m)).nome;
  const dist = ({ caixaRef: [a, b, c, d] }) => Math.hypot(Math.max(a - x, 0, x - c), Math.max(b - y, 0, y - d));
  return partes.reduce((m, p) => (dist(p) < dist(m) ? p : m)).nome;
}

/**
 * Junta as respostas de vários críticos, de leituras em grade e por partes da mesma referência, por parte e pela coisa nomeada.
 * Cada diferença em campos vai à parte do lugar dela; na mesma parte, duas diferenças cujos atributos dividem uma palavra que nomeia a
 * coisa (`palavrasDaCoisa`) ficam no mesmo grupo. O apoio de um grupo é quantos críticos do alvo o disseram; o controle, quantos
 * críticos do controle disseram, na mesma parte, um atributo que divide uma dessas palavras. A frase antiga, sem campos, não entra.
 * @param {{ partes: { nome: string, caixaRef: number[] }[], alvo: Leitura[], controle?: Leitura[] }} o
 *   Leitura = { regioes: { nome, caixaRef }[], porParte: boolean, criticos: { id: string, respostas: object }[] }
 * @returns {{ grupos: object[], criticos: { alvo: number, controle: number } }}
 */
export function consolidar({ partes, alvo, controle = [] }) {
  const diferencasDe = (leituras) => leituras.flatMap((l) => l.criticos.flatMap(({ id, respostas }) => Object.entries(respostas.regioes ?? {}).flatMap(([regiao, r]) => {
    const caixa = l.regioes.find((x) => x.nome === regiao)?.caixaRef;
    return (r.diferencas ?? []).filter(ehObjeto).map((d) => ({
      critico: id, regiao, ...d,
      parte: l.porParte ? regiao : parteDoPonto(pontoDoOnde(d.onde, caixa), partes),
      coisas: palavrasDaCoisa(d.atributo),
    }));
  })));
  const doAlvo = diferencasDe(alvo); const doControle = diferencasDe(controle);
  /* os grupos: união por parte e palavra em comum */
  const pai = doAlvo.map((_, i) => i);
  const achar = (i) => (pai[i] === i ? i : (pai[i] = achar(pai[i])));
  for (let i = 0; i < doAlvo.length; i += 1) for (let j = i + 1; j < doAlvo.length; j += 1) {
    if (doAlvo[i].parte === doAlvo[j].parte && [...doAlvo[i].coisas].some((w) => doAlvo[j].coisas.has(w))) pai[achar(j)] = achar(i);
  }
  const porRaiz = new Map();
  doAlvo.forEach((d, i) => { const k = achar(i); if (!porRaiz.has(k)) porRaiz.set(k, []); porRaiz.get(k).push(d); });
  const total = (ls) => ls.reduce((s, l) => s + l.criticos.length, 0);
  const grupos = [...porRaiz.values()].map((ds) => {
    const contagem = new Map();
    for (const d of ds) for (const w of d.coisas) contagem.set(w, (contagem.get(w) ?? 0) + 1);
    const coisas = [...contagem.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([w]) => w);
    const nomes = new Set(coisas);
    const doControleAqui = doControle.filter((c) => c.parte === ds[0].parte && [...c.coisas].some((w) => nomes.has(w)));
    return {
      parte: ds[0].parte, coisas: coisas.slice(0, 4),
      apoio: new Set(ds.map((d) => d.critico)).size, controle: new Set(doControleAqui.map((d) => d.critico)).size,
      tipos: [...new Set(ds.map((d) => d.tipo))],
      ditos: ds.map((d) => ({ critico: d.critico, regiao: d.regiao, atributo: d.atributo, referencia: d.referencia, modelo: d.modelo })),
      noControle: doControleAqui.map((d) => ({ critico: d.critico, regiao: d.regiao, atributo: d.atributo, referencia: d.referencia, modelo: d.modelo })),
    };
  }).sort((a, b) => (b.apoio - b.controle) - (a.apoio - a.controle) || b.apoio - a.apoio || a.parte.localeCompare(b.parte) || a.coisas.join().localeCompare(b.coisas.join()));
  return { grupos, criticos: { alvo: total(alvo), controle: total(controle) } };
}

/** O relato da consolidação em texto: os grupos com apoio de pelo menos `minimo` críticos primeiro, depois o resto numa linha cada. */
export function relatoDaConsolidacao({ grupos, criticos }, minimo = 2) {
  const linha = (g) => `${g.parte} — ${g.coisas.join(', ') || '(sem nome)'}: ${g.apoio} de ${criticos.alvo} críticos${criticos.controle ? `, ${g.controle} de ${criticos.controle} no controle` : ''}`;
  const fortes = grupos.filter((g) => g.apoio >= minimo);
  const fracos = grupos.filter((g) => g.apoio < minimo);
  const exemplo = (d) => `    - ${d.atributo}: ${d.referencia} na referência, ${d.modelo} no desenho`;
  return `# Leitura consolidada\n\n${criticos.alvo} críticos no alvo${criticos.controle ? ` e ${criticos.controle} no controle` : ''}. ${fortes.length} grupos com pelo menos ${minimo} críticos, ${fracos.length} com menos.\n\n`
    + `## Ditos por pelo menos ${minimo} críticos\n\n${fortes.map((g) => `- ${linha(g)}\n${g.ditos.slice(0, 3).map(exemplo).join('\n')}`).join('\n') || '(nenhum)'}\n\n`
    + `## Ditos por menos\n\n${fracos.map((g) => `- ${linha(g)}`).join('\n') || '(nenhum)'}\n`;
}

/* --- linha de comando ------------------------------------------------------------------------------------------------------------ */
const AJUDA = `npm run leitura:regioes -- --referencia=<png> --caixa-ref=x0,y0,x1,y1 --captura=<png> --saida=<pasta>
    [--painel=x0,y0,x1,y1] [--fundo=#rrggbb] [--grade=4x3] [--margem=12] [--objeto="<o que é e de onde é visto>"]
    [--linhas=<png de linhas:modelo>] [--fora="<o que aparece na referência e não é da peça>"]
npm run leitura:regioes -- --referencia=<png> --caixa-ref=x0,y0,x1,y1 --modelo=<esboço ou peça> --vista=<vista> --saida=<pasta>
    [--recorte=x0,y0,z0,x1,y1,z1] [--ate-passo=N] [--opcao=1] [--largura=900] [--composicoes=<módulo>] [--grade=4x3] [--objeto=...] [--fora=...]
npm run leitura:regioes -- --referencia=<png> --caixa-ref=x0,y0,x1,y1 --prancha=<arquivo.prancha.mjs> --saida=<pasta>
    [--vista=<vista>] [--partes=<partes.json>] [--folga=0.15] [--espelhar] [--objeto=...] [--fora=...]
npm run leitura:regioes -- --saida=<pasta> --registrar=<respostas.json>
npm run leitura:regioes -- --consolidar=<config.json> --saida=<pasta>

--consolidar junta as respostas de vários críticos, de leituras em grade e por partes da mesma referência no mesmo quadro: cada
diferença vai à parte do lugar dela, e as que dividem a coisa nomeada no atributo formam um grupo, com quantos críticos o disseram
e quantos do controle (a prancha anterior, por exemplo) disseram o mesmo na mesma parte. config: { "partes": "<pasta da leitura
por partes>", "alvo": [{ "leitura": "<pasta>", "respostas": ["<r.json>", ...] }], "controle": [...], "minimo": 2 }, com os
caminhos a partir da pasta da config. Grava consolidado.json e consolidado.md.

Com --partes=<partes.json>, { "caixa": [a0, b0, a1, b1], "partes": { "<nome>": [a0, b0, a1, b1] } } em mm (a para a direita, b para
cima, a caixa é a do objeto inteiro), cada parte vira uma região com o nome dela, no lugar da grade; com --prancha a caixa é a da
prancha e a parte pode ser { "camadas": ["<nome da camada>", ...] }. --folga é o entorno de cada parte, em fração do maior lado dela.
Com --prancha, o lado do rascunho é a vista da prancha só com as linhas, sem cotas, rótulos nem legenda.
--espelhar vira a referência na horizontal (vista do lado oposto); a --caixa-ref continua dada na imagem original.

Corta a referência e a captura do rascunho na mesma grade e grava indice.png, folha-NN.png, pedido.md e leitura.json.
Com --modelo, a captura (a vista rápida) e as linhas saem da própria malha do esboço ou da receita de peça, no mesmo quadro, e
--recorte (mm do referencial da peça) enquadra uma caixa: a --caixa-ref é então a região da referência que corresponde a ela.
Sem --painel, vale o da <captura>.rapida.json que a vista:rapida grava ao lado da imagem.
--registrar confere que toda região tem resposta, grava rodadas/rodada-NN.json e acusa o que a rodada diz da referência ao contrário
de uma rodada anterior, na mesma região e sobre o mesmo atributo.`;

const numeros = (texto, n, nome) => {
  const v = String(texto).split(',').map(Number);
  if (v.length !== n || !v.every(Number.isFinite)) throw new ErroDaLeitura(`${nome} espera ${n} números separados por vírgula`);
  return v;
};
const ultimaRodada = (pasta) => {
  const dir = join(pasta, 'rodadas');
  const nomes = existsSync(dir) ? readdirSync(dir).filter((f) => /^rodada-\d+\.json$/.test(f)).sort() : [];
  return { dir, numero: nomes.length, ultima: nomes.length ? JSON.parse(readFileSync(join(dir, nomes[nomes.length - 1]), 'utf8')) : null };
};
/* as rodadas gravadas na pasta, em ordem, cada uma com o número tirado do nome do arquivo */
const rodadasAnteriores = (dir) => (existsSync(dir) ? readdirSync(dir).filter((f) => /^rodada-\d+\.json$/.test(f)).sort() : [])
  .map((f) => ({ ...JSON.parse(readFileSync(join(dir, f), 'utf8')), numero: Number(/\d+/.exec(f)[0]) }));

/**
 * Grava a leitura montada por `montarLeitura` na pasta: `indice.png`, `folha-NN.png`, `pedido.md` (com as aceitas da última rodada
 * da pasta) e `leitura.json`. `referencia` e `captura` são os caminhos como vão no JSON. Devolve o caminho do pedido.
 */
export function gravarLeitura(pasta, r, { referencia, captura, caixaRef, grade, objeto = null, fora = null, espelhar = false }) {
  mkdirSync(pasta, { recursive: true });
  writeFileSync(join(pasta, 'indice.png'), paraPng(r.indice));
  r.folhas.forEach((f, i) => writeFileSync(join(pasta, `folha-${String(i + 1).padStart(2, '0')}.png`), paraPng(f)));
  const { ultima } = ultimaRodada(pasta);
  writeFileSync(join(pasta, 'pedido.md'), pedido({ pasta, regioes: r.regioes, folhas: r.folhas.length, objeto, aceitas: ultima?.aceitas ?? {}, linhas: r.comLinhas, fora, porParte: r.porParte, rotulo: r.rotulo }));
  writeFileSync(join(pasta, 'leitura.json'), `${JSON.stringify({ formato: 'modelar.leitura-por-regioes@1', referencia, captura, caixaRef, ...(espelhar ? { espelhar: true } : {}), painel: r.painel, caixaDaCaptura: r.caixaDaCaptura, grade: r.porParte ? 'partes' : grade, proporcao: { referencia: Number(r.proporcao.referencia.toFixed(4)), rascunho: Number(r.proporcao.rascunho.toFixed(4)) }, regioes: r.regioes }, null, 1)}\n`);
  return join(pasta, 'pedido.md');
}

/**
 * `--consolidar=<config.json>`: lê as leituras e as respostas de cada crítico, confere cada resposta contra a leitura dela e grava
 * `consolidado.json` e `consolidado.md` na pasta de saída. Os caminhos da config valem a partir da pasta dela.
 * config: { "partes": "<pasta da leitura por partes>", "alvo": [{ "leitura": "<pasta>", "respostas": ["<r.json>", ...] }], "controle"?: [...], "minimo"?: 2 }
 */
function consolidarPeloComando(arquivo, pasta) {
  const cfg = JSON.parse(readFileSync(arquivo, 'utf8'));
  const aqui = (p) => resolve(dirname(arquivo), p);
  const lerLeitura = (p) => JSON.parse(readFileSync(join(aqui(p), 'leitura.json'), 'utf8'));
  if (typeof cfg.partes !== 'string' || !Array.isArray(cfg.alvo) || !cfg.alvo.length) {
    throw new ErroDaLeitura(`--consolidar: a config precisa de "partes" (a pasta da leitura por partes) e de "alvo": [{ "leitura": "<pasta>", "respostas": ["<r.json>", ...] }]; veio ${Object.keys(cfg).join(', ') || 'nada'}`);
  }
  const partes = lerLeitura(cfg.partes);
  if (partes.grade !== 'partes') throw new ErroDaLeitura(`--consolidar: "partes" aponta ${cfg.partes}, que é uma leitura em grade; rode a leitura com --partes e aponte a pasta dela`);
  const recusas = [];
  const montar = (lista, papel) => (lista ?? []).map((item, i) => {
    if (typeof item?.leitura !== 'string' || !Array.isArray(item.respostas) || !item.respostas.length) {
      recusas.push(`${papel} ${i + 1}: precisa de "leitura" e de "respostas" com pelo menos um arquivo`);
      return { regioes: [], porParte: false, criticos: [] };
    }
    const l = lerLeitura(item.leitura);
    if (JSON.stringify(l.caixaRef) !== JSON.stringify(partes.caixaRef) || Boolean(l.espelhar) !== Boolean(partes.espelhar)) {
      recusas.push(`${papel} ${item.leitura}: a leitura tem --caixa-ref ${l.caixaRef} e espelhar ${Boolean(l.espelhar)}, e a das partes ${partes.caixaRef} e ${Boolean(partes.espelhar)}; as duas precisam ser da mesma referência no mesmo quadro`);
    }
    const criticos = item.respostas.map((r) => {
      const respostas = JSON.parse(readFileSync(aqui(r), 'utf8'));
      const c = conferirRespostas(l.regioes, respostas);
      recusas.push(...c.recusas.map((x) => `${papel} ${r}: ${x}`));
      return { id: r, respostas };
    });
    return { regioes: l.regioes, porParte: l.grade === 'partes', criticos };
  });
  const alvo = montar(cfg.alvo, 'alvo'); const controle = montar(cfg.controle, 'controle');
  if (recusas.length) return { codigo: 1, stdout: '', stderr: `consolidação recusada:\n${recusas.map((x) => `- ${x}`).join('\n')}\n` };
  const r = consolidar({ partes: partes.regioes, alvo, controle });
  const minimo = cfg.minimo ?? 2;
  mkdirSync(pasta, { recursive: true });
  writeFileSync(join(pasta, 'consolidado.json'), `${JSON.stringify({ formato: 'modelar.leitura-consolidada@1', minimo, ...r }, null, 1)}\n`);
  const md = relatoDaConsolidacao(r, minimo);
  writeFileSync(join(pasta, 'consolidado.md'), md);
  return { codigo: 0, stdout: `${md}\n${join(pasta, 'consolidado.md')}\n`, stderr: '' };
}

export function executar(argv) {
  const valor = (nome) => { const a = argv.find((x) => x.startsWith(`--${nome}=`)); return a === undefined ? null : a.slice(nome.length + 3); };
  if (argv.includes('--ajuda') || argv.includes('--help') || argv.length === 0) return { codigo: 0, stdout: `${AJUDA}\n`, stderr: '' };
  try {
    const saida = valor('saida');
    if (!saida) throw new ErroDaLeitura('falta --saida=<pasta>');
    const pasta = resolve(saida);
    if (valor('consolidar')) return consolidarPeloComando(resolve(valor('consolidar')), pasta);
    if (valor('registrar')) {
      const leitura = JSON.parse(readFileSync(join(pasta, 'leitura.json'), 'utf8'));
      const respostas = JSON.parse(readFileSync(resolve(valor('registrar')), 'utf8'));
      const r = conferirRespostas(leitura.regioes, respostas);
      if (r.recusas.length) return { codigo: 1, stdout: '', stderr: `rodada recusada:\n${r.recusas.map((x) => `- ${x}`).join('\n')}\n` };
      const { dir, numero } = ultimaRodada(pasta);
      const anteriores = rodadasAnteriores(dir);
      const contradicoes = acharContradicoes(respostas, anteriores);
      const dadas = r.comDiferenca.flatMap((n) => respostas.regioes[n].diferencas);
      const estruturadas = dadas.filter(ehObjeto).length; const emFrase = dadas.length - estruturadas;
      mkdirSync(dir, { recursive: true });
      const arquivo = join(dir, `rodada-${String(numero + 1).padStart(2, '0')}.json`);
      writeFileSync(arquivo, `${JSON.stringify({ formato: 'modelar.leitura-por-regioes.rodada@1', captura: leitura.captura, iguais: r.iguais, comDiferenca: r.comDiferenca, diferencas: r.diferencas, porTipo: r.porTipo, estruturadas, emFrase, regioes: respostas.regioes, graves: respostas.graves ?? [], aceitas: respostas.aceitas ?? {}, decididas: respostas.decididas ?? {}, contradicoes }, null, 1)}\n`);
      const linhas = r.comDiferenca.flatMap((n) => respostas.regioes[n].diferencas.map((d) => `  ${n}: ${ehObjeto(d) ? `${d.tipo}: ${d.onde}, ${d.atributo}: ${d.referencia} na referência, ${d.modelo} no rascunho` : d}`));
      const folhaDe = (n) => String(leitura.regioes.find((x) => x.nome === n)?.folha ?? 1).padStart(2, '0');
      const linhasDaContradicao = contradicoes.map((c) => `  ${c.regiao} (folha-${folhaDe(c.regiao)}.png), ${c.atributo}: a rodada ${c.rodadaAnterior} disse "${c.antes}" da referência e esta diz "${c.agora}"`);
      const corrigir = r.porTipo.forma ? 'confira cada diferença de forma contra as linhas do modelo, corrija ou aceite com o motivo em "aceitas", e rode a leitura de novo sobre a captura nova' : (r.diferencas ? 'só restam detalhes: leve a imagem à pessoa com a lista deles' : 'nenhuma diferença: leve a imagem à pessoa');
      const proxima = contradicoes.length
        ? `antes de corrigir, olhe a folha de cada região com contradição (${[...new Set(contradicoes.map((c) => `${c.regiao} na folha-${folhaDe(c.regiao)}.png`))].join(', ')}) e decida qual das duas leituras da referência vale, registrando nas respostas da rodada seguinte em "aceitas" ou em "decididas": { "<região>": [{ "atributo", "vale", "motivo" }] }; depois, ${corrigir}`
        : corrigir;
      const contra = contradicoes.length ? `contradições com rodadas anteriores sobre a referência: ${contradicoes.length}\n${linhasDaContradicao.join('\n')}\n` : '';
      return { codigo: 0, stdout: `rodada ${numero + 1}: ${r.iguais.length} regiões iguais, ${r.comDiferenca.length} com diferença, ${r.porTipo.forma} de forma e ${r.porTipo.detalhe} de detalhe; ${estruturadas} em campos e ${emFrase} em frase\n${linhas.join('\n')}${linhas.length ? '\n' : ''}${contra}próxima ação: ${proxima}\n${arquivo}\n`, stderr: '' };
    }
    for (const n of ['referencia', 'caixa-ref', 'captura']) if (!valor(n)) throw new ErroDaLeitura(`falta --${n}`);
    const grade = valor('grade') ? valor('grade').split('x').map(Number) : GRADE_PADRAO;
    const cor = valor('fundo');
    if (cor && !/^#[0-9a-fA-F]{6}$/.test(cor)) throw new ErroDaLeitura('--fundo espera #rrggbb');
    /* a vista rápida diz o painel e o fundo dela ao lado da imagem: sem isso o painel achado pelas linhas de fundo encurta quando a peça ocupa o quadro */
    let lado = null;
    const arquivoDoLado = `${resolve(valor('captura'))}.rapida.json`;
    if (!valor('painel') && !cor && existsSync(arquivoDoLado)) { try { lado = JSON.parse(readFileSync(arquivoDoLado, 'utf8')); } catch { lado = null; } }
    if (valor('partes') && valor('grade')) throw new ErroDaLeitura('--partes e --grade se excluem: a região é a parte declarada ou a célula da grade');
    const partes = valor('partes') ? partesEmFracao(JSON.parse(readFileSync(resolve(valor('partes')), 'utf8')), `--partes=${valor('partes')}`) : undefined;
    const folga = valor('folga') === null ? undefined : Number(valor('folga'));
    if (folga !== undefined && !(folga >= 0 && folga <= 2)) throw new ErroDaLeitura(`--folga espera uma fração entre 0 e 2 do maior lado da parte; veio ${valor('folga')}`);
    const rotulo = valor('rotulo') ?? undefined;
    if (rotulo !== undefined && !LADOS[rotulo]) throw new ErroDaLeitura(`--rotulo espera ${Object.keys(LADOS).join(' ou ')}; veio ${rotulo}`);
    const espelhar = argv.includes('--espelhar');
    const r = montarLeitura({
      referencia: dePng(readFileSync(resolve(valor('referencia')))), captura: dePng(readFileSync(resolve(valor('captura')))),
      caixaRef: numeros(valor('caixa-ref'), 4, '--caixa-ref'), painel: valor('painel') ? numeros(valor('painel'), 4, '--painel') : lado?.painel,
      fundo: cor ? [1, 3, 5].map((i) => parseInt(cor.slice(i, i + 2), 16)) : lado?.fundo, grade, margem: valor('margem') ? Number(valor('margem')) : undefined,
      linhas: valor('linhas') ? dePng(readFileSync(resolve(valor('linhas')))) : undefined, partes, folga, espelhar, rotulo,
    });
    gravarLeitura(pasta, r, { referencia: valor('referencia'), captura: valor('captura'), caixaRef: numeros(valor('caixa-ref'), 4, '--caixa-ref'), grade, objeto: valor('objeto'), fora: valor('fora'), espelhar });
    const desvio = (r.proporcao.rascunho / r.proporcao.referencia - 1) * 100;
    const aviso = Math.abs(desvio) > LIMITE_DA_PROPORCAO * 100
      ? `AVISO: a altura sobre a largura difere ${Math.abs(desvio).toFixed(1)}%, acima de ${LIMITE_DA_PROPORCAO * 100}%: cada eixo é esticado em separado, então confira no índice se as partes caem umas sobre as outras; se não caem, a --caixa-ref está errada ou a referência é deformada, e a leitura engana\n`
      : '';
    return { codigo: 0, stdout: `${lado ? `painel e fundo da vista rápida, de ${arquivoDoLado}\n` : ''}${r.regioes.length} ${partes ? 'partes' : 'regiões'} em ${r.folhas.length} folhas, em ${pasta}\naltura sobre largura: referência ${r.proporcao.referencia.toFixed(3)}, ${(r.rotulo ?? 'rascunho').toLowerCase()} ${r.proporcao.rascunho.toFixed(3)} (${desvio >= 0 ? '+' : ''}${desvio.toFixed(1)}%)\n${aviso}pedido ao crítico: ${join(pasta, 'pedido.md')}\n`, stderr: '' };
  } catch (erro) {
    if (erro instanceof ErroDaLeitura || erro?.code === 'ENOENT' || erro instanceof SyntaxError) return { codigo: 2, stdout: '', stderr: `leitura:regioes: ${erro.message}\n` };
    throw erro;
  }
}

/**
 * `executar` com `--modelo`: tira da malha do esboço ou da receita de peça a captura (vista rápida) e as linhas, no mesmo quadro, grava
 * `captura.png` e `linhas.png` na pasta da leitura e monta a leitura sobre elas. Sem `--modelo` é `executar`. As duas imagens saem com a
 * mesma câmera e o mesmo quadro; as linhas são cortadas na caixa do objeto da captura, que é onde `montarLeitura` as espera.
 */
export async function executarComModelo(argv) {
  const valor = (nome) => { const a = argv.find((x) => x.startsWith(`--${nome}=`)); return a === undefined ? null : a.slice(nome.length + 3); };
  if (valor('prancha') !== null && !valor('registrar')) return executarComPrancha(argv);
  if (valor('modelo') === null || valor('registrar')) return executar(argv);
  try {
    for (const n of ['vista', 'saida', 'referencia', 'caixa-ref']) if (!valor(n)) throw new ErroDaLeitura(`falta --${n}`);
    if (valor('captura')) throw new ErroDaLeitura('--modelo e --captura se contradizem: a captura sai do modelo');
    const { abrirModelo, painelDaOpcao, lerRecorte, recortarFaces, resumoDaAbertura, ErroDoModelo } = await import('./modelo-aberto.mjs');
    const { facesDaOpcao, rasterSombreado, LARGURA_PADRAO, ErroDaVista } = await import('./vista-rapida.mjs');
    const { desenharLinhas, facesDoNeutro, linhasDoRaster, rasterizar } = await import('./linhas-do-modelo.mjs');
    const largura = valor('largura') === null ? LARGURA_PADRAO : Number(valor('largura'));
    if (!Number.isInteger(largura) || largura < 8) throw new ErroDaLeitura('--largura espera um inteiro de pelo menos 8');
    let montado; let recorte;
    try {
      recorte = lerRecorte(valor('recorte'));
      montado = await abrirModelo(valor('modelo'), { ateOPasso: valor('ate-passo') === null ? null : Number(valor('ate-passo')), composicoes: valor('composicoes'), relato: false });
    } catch (e) { if (e instanceof ErroDoModelo || e?.name === 'ErroDeConfiguracao') throw new ErroDaLeitura(e.message); throw e; }
    const { painel, erro } = painelDaOpcao(montado, Number(valor('opcao') ?? 1), 'leitura:regioes');
    if (erro) return erro;
    let cap;
    try { cap = rasterSombreado(facesDaOpcao(painel.neutro), { vista: valor('vista'), largura, margem: recorte ? 0 : undefined, recorte }); } catch (e) {
      if (e instanceof ErroDaVista) throw new ErroDaLeitura(e.message);
      throw e;
    }
    const raster = rasterizar(recortarFaces(facesDoNeutro(painel.neutro, painel.partes), recorte), valor('vista'), largura, cap.caixa);
    const desenho = desenharLinhas(raster, linhasDoRaster(raster));
    const caixa = caixaDoObjeto(cap.imagem, [0, 0, cap.largura, cap.altura], FUNDO_DO_PAINEL);
    const alturaDoDesenho = desenho.altura;
    const cortada = reamostrar(desenho, [caixa[0], caixa[1] * (alturaDoDesenho / cap.altura), caixa[2], caixa[3] * (alturaDoDesenho / cap.altura)], caixa[2] - caixa[0], caixa[3] - caixa[1]);
    const pasta = resolve(valor('saida')); mkdirSync(pasta, { recursive: true });
    writeFileSync(join(pasta, 'captura.png'), paraPng(cap.imagem)); writeFileSync(join(pasta, 'linhas.png'), paraPng(cortada));
    const repasse = argv.filter((a) => !/^--(modelo|vista|recorte|ate-passo|opcao|largura|composicoes)=/.test(a));
    const r = executar([...repasse, `--captura=${join(pasta, 'captura.png')}`, `--linhas=${join(pasta, 'linhas.png')}`, `--painel=0,0,${cap.largura},${cap.altura}`, `--fundo=#${FUNDO_DO_PAINEL.map((c) => c.toString(16).padStart(2, '0')).join('')}`]);
    const abertura = resumoDaAbertura(montado);
    return { ...r, stdout: `${abertura ? `${abertura}\n` : ''}captura e linhas da malha de ${valor('modelo')}, vista ${valor('vista')}${recorte ? `, recorte ${recorte.min.join(', ')} a ${recorte.max.join(', ')} mm` : ''}, ${cap.mmPorPx.toFixed(2)} mm por px\n${r.stdout}` };
  } catch (erro) {
    if (erro instanceof ErroDaLeitura) return { codigo: 2, stdout: '', stderr: `leitura:regioes: ${erro.message}\n` };
    throw erro;
  }
}

/* --- a prancha como lado do rascunho --------------------------------------------------------------------------------------------- */
export const FUNDO_DA_PRANCHA = Object.freeze([0xfb, 0xfb, 0xfa]);

const caixaDosPontos = (pts) => {
  const as = pts.map((p) => p[0]); const bs = pts.map((p) => p[1]);
  return [Math.min(...as), Math.min(...bs), Math.max(...as), Math.max(...bs)];
};
/** A caixa [a0, b0, a1, b1] em mm de uma camada da prancha: os pontos, ou o círculo inteiro. */
export function caixaDaCamada(c) {
  if (c.tipo === 'circulo') return [c.centro[0] - c.raio, c.centro[1] - c.raio, c.centro[0] + c.raio, c.centro[1] + c.raio];
  if (!Array.isArray(c.pts) || !c.pts.length) return null;
  return caixaDosPontos(c.pts);
}
const uniao = (a, b) => (a ? [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])] : b);

/**
 * A prancha de uma vista só com o desenho (contorno, painéis, vidros, luzes, curvas de caráter e rodas), sem título, rótulos, cotas,
 * marcos nem legenda, e a caixa em mm do que ela desenha: a do contorno no relatório da prancha somada às camadas fora dele (as rodas).
 * @param {object} espec  a especificação que `prancha()` recebe (o `ESPEC` do arquivo da prancha)
 * @param {(espec: object) => { svg: string, relatorio: object }} desenhar  `prancha` de tools/modelar/prancha/prancha.mjs
 * @returns {{ vista: string, svg: string, caixa: number[], camadas: Record<string, number[]> }}
 */
export function pranchaSoDesenho(espec, desenhar, vista = null) {
  const vistas = Object.keys(espec?.vistas ?? {});
  if (!vistas.length || !Array.isArray(espec.camadas)) throw new ErroDaLeitura('--prancha: o arquivo precisa exportar ESPEC com "vistas" e "camadas", como o que prancha() recebe');
  const v = vista ?? (vistas.length === 1 ? vistas[0] : null);
  if (!v) throw new ErroDaLeitura(`--prancha tem as vistas ${vistas.join(', ')}: diga qual com --vista=<vista>`);
  if (!vistas.includes(v)) throw new ErroDaLeitura(`--vista=${v} não é da prancha, que tem ${vistas.join(', ')}`);
  const e = { ...espec, titulo: '', subtitulo: '', vistas: { [v]: { ...espec.vistas[v], rotulo: '' } }, camadas: espec.camadas.filter((c) => c.vista === v), cotas: [], landmarks: [] };
  delete e.legenda; delete e.familia;
  const { svg, relatorio } = desenhar(e);
  const contorno = relatorio?.porVista?.[v]?.caixa;
  let caixa = contorno ? [contorno.xMin, contorno.yMin, contorno.xMax, contorno.yMax] : null;
  const camadas = {};
  for (const c of e.camadas) {
    const k = caixaDaCamada(c);
    if (!k) continue;
    camadas[c.nome] = k;
    if (c.foraDoContorno || !contorno) caixa = uniao(caixa, k);
  }
  if (!caixa) throw new ErroDaLeitura(`--prancha: a vista ${v} não desenha nada`);
  return { vista: v, svg, caixa, camadas };
}

/**
 * As partes de um `--partes` para a prancha: cada parte é [a0, b0, a1, b1] em mm ou { "camadas": ["<nome>", ...] }, a caixa das camadas
 * da prancha somadas; a caixa do objeto é a da prancha quando o arquivo não a traz.
 */
export function partesDaPrancha(d, desenho, origem = '--partes') {
  const partes = {};
  for (const [nome, p] of Object.entries(d?.partes ?? {})) {
    if (Array.isArray(p)) { partes[nome] = p; continue; }
    const lista = p?.camadas;
    if (!Array.isArray(lista) || !lista.length) throw new ErroDaLeitura(`${origem}: a parte "${nome}" precisa ser [a0, b0, a1, b1] em mm ou { "camadas": ["<nome>", ...] }`);
    const faltam = lista.filter((n) => !desenho.camadas[n]);
    if (faltam.length) throw new ErroDaLeitura(`${origem}: a parte "${nome}" cita camadas que a vista ${desenho.vista} da prancha não tem: ${faltam.join(', ')}; as que ela tem: ${Object.keys(desenho.camadas).join(', ')}`);
    partes[nome] = lista.reduce((k, n) => uniao(k, desenho.camadas[n]), null);
  }
  return { caixa: d?.caixa ?? desenho.caixa, partes };
}

/** O SVG rasterizado no navegador, com o dobro da resolução, como o `olhar.mjs` faz. */
async function rasterizarSvg(svg) {
  const { chromium } = await import('playwright');
  const { lancarChromium } = await import('./navegador.mjs');
  const navegador = await lancarChromium(chromium);
  try {
    const pagina = await navegador.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 2 });
    await pagina.setContent(`<!doctype html><meta charset="utf-8"><style>body{margin:0}svg{display:block}</style>${svg}`, { waitUntil: 'load' });
    return await pagina.locator('svg').first().screenshot();
  } finally { await navegador.close(); }
}

/**
 * `executar` com `--prancha`: desenha a vista da prancha só com as linhas, rasteriza, grava `prancha.svg` e `prancha.png` na pasta da
 * leitura e monta a leitura sobre elas, com o lado do rascunho chamado PRANCHA. Com `--partes`, as partes podem citar camadas da
 * prancha, e o arquivo resolvido em mm vai para `partes.json` na pasta.
 */
export async function executarComPrancha(argv) {
  const valor = (nome) => { const a = argv.find((x) => x.startsWith(`--${nome}=`)); return a === undefined ? null : a.slice(nome.length + 3); };
  try {
    for (const n of ['saida', 'referencia', 'caixa-ref']) if (!valor(n)) throw new ErroDaLeitura(`falta --${n}`);
    if (valor('captura') || valor('modelo')) throw new ErroDaLeitura('--prancha não se combina com --captura nem com --modelo: o lado do rascunho é a prancha');
    const { pathToFileURL } = await import('node:url');
    const { prancha } = await import('./prancha/prancha.mjs');
    const modulo = await import(pathToFileURL(resolve(valor('prancha'))).href);
    const desenho = pranchaSoDesenho(modulo.ESPEC ?? modulo.default, prancha, valor('vista'));
    const pasta = resolve(valor('saida')); mkdirSync(pasta, { recursive: true });
    writeFileSync(join(pasta, 'prancha.svg'), desenho.svg);
    const png = await rasterizarSvg(desenho.svg);
    writeFileSync(join(pasta, 'prancha.png'), png);
    const im = dePng(png);
    const extra = [`--captura=${join(pasta, 'prancha.png')}`, `--painel=0,0,${im.largura},${im.altura}`, `--fundo=#${FUNDO_DA_PRANCHA.map((c) => c.toString(16).padStart(2, '0')).join('')}`, '--rotulo=PRANCHA'];
    if (valor('partes')) {
      const resolvidas = partesDaPrancha(JSON.parse(readFileSync(resolve(valor('partes')), 'utf8')), desenho, `--partes=${valor('partes')}`);
      writeFileSync(join(pasta, 'partes.json'), `${JSON.stringify(resolvidas, null, 1)}\n`);
      extra.push(`--partes=${join(pasta, 'partes.json')}`);
    }
    const repasse = argv.filter((a) => !/^--(prancha|vista|partes)=/.test(a));
    const r = executar([...repasse, ...extra]);
    return { ...r, stdout: `prancha ${valor('prancha')}, vista ${desenho.vista}, caixa ${desenho.caixa.map((v) => Math.round(v)).join(', ')} mm\n${r.stdout}` };
  } catch (erro) {
    if (erro instanceof ErroDaLeitura || erro?.code === 'ENOENT' || erro instanceof SyntaxError) return { codigo: 2, stdout: '', stderr: `leitura:regioes: ${erro.message}\n` };
    throw erro;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const r = await executarComModelo(process.argv.slice(2));
  process.stdout.write(r.stdout); process.stderr.write(r.stderr); process.exitCode = r.codigo;
}
