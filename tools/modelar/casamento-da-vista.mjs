#!/usr/bin/env node
/* casamento-da-vista.mjs — duas medidas do modelo contra a imagem de referência numa vista, as duas tiradas da malha e não de uma
 * captura com luz: quanto de cada região tem a classe de material trocada, e a que distância cada linha do modelo está da divisa de
 * classes da referência.
 *
 * POR QUE ELE EXISTE. Na traseira da empilhadeira (2026-11-09 e 10) a leitura por regiões entregava ao crítico as doze regiões com o
 * mesmo peso, e cada diferença de forma que ele dizia era conferida no olho contra as linhas do modelo. A ordenação por cor e borda
 * tentada sobre a captura com luz falhou, porque a sombra do rascunho vira classe errada. Aqui a classe do modelo vem da parte de cada
 * pixel da malha rasterizada (`rasterizar` de `linhas-do-modelo.mjs`), e as linhas são as de `linhasDoRaster`; só a referência é
 * classificada por cor, com `classificar` de `perfil-por-cor.mjs`. O número ordena as regiões e confirma ou derruba uma diferença de
 * forma; ele não aprova forma, quem aprova é a pessoa.
 *
 * O ALINHAMENTO. É o da leitura por regiões: a caixa do objeto no modelo (o raster inteiro) é levada à `--caixa-ref` da referência,
 * cada eixo com a sua escala, e a referência é reamostrada para o tamanho do raster. A proporção altura sobre largura das duas caixas
 * sai no relato, porque a desproporção do objeto inteiro só aparece nela. `--ignorar` são retângulos em px da referência com o que
 * aparece nela e não é da peça; os pixels deles ficam fora de toda conta e nenhuma divisa que encosta neles vale como borda.
 *
 * MEDIDA 1, CLASSE TROCADA. O mapa de troca marca o pixel em que a classe do modelo (a classe declarada da parte dele, ou fundo)
 * difere da classe da referência. Para a franja do desalinhamento de um ou dois pixels não contar, o mapa passa por uma abertura
 * (erosão de `EROSAO_PX` px seguida de dilatação do mesmo tamanho, com elemento quadrado): some o que a erosão apaga, e a mancha que
 * sobrevive volta ao tamanho dela. Por região, a fração dos pixels válidos com troca e os dois pares (classe na referência, classe no
 * modelo) mais frequentes.
 *
 * MEDIDA 2, CASAMENTO DE LINHAS. A borda da referência é a divisa entre duas classes vizinhas, o fundo incluído, marcada no pixel de
 * cima ou da esquerda, ou no pixel da peça quando o vizinho é fundo, como `linhasDoRaster` marca o contorno e a divisa; a beira da
 * imagem conta como fundo. Uma transformada de distância de chanfro 3-4, em duas passadas, dá a cada pixel de contorno ou divisa do
 * modelo a distância até a borda mais próxima da referência ("linha sem borda") e a cada pixel de borda da referência a distância
 * até a linha de contorno ou divisa mais próxima do modelo ("borda sem linha"), em mm do modelo. Por região, quantos px passam de
 * `--tolerancia-mm` e a maior distância. A quina e a dobra ficam dentro de uma cor e não têm divisa de classe para casar: só se contam.
 *
 * A NOTA. `nota = troca% + 100 x (px de linha sem borda fora + px de borda sem linha fora) / (px de linha + px de borda julgados)`.
 * A primeira parcela é a área trocada e a segunda a parte das linhas julgadas da região que passa da tolerância, as duas de zero a
 * cem; a nota vai de zero a duzentos. As regiões saem em ordem decrescente de nota, e o empate fica na ordem da grade.
 *
 * USO
 *   npm run casamento:vista -- <esboço> --vista=<vista> --referencia=<png> --caixa-ref=x0,y0,x1,y1 --cores=nome:#rrggbb,...
 *     --partes=parte:classe,... [--opcao=1] [--fundo=#ffffff] [--ignorar=x0,y0,x1,y1;x0,y0,x1,y1] [--grade=4x3]
 *     [--tolerancia-mm=12] [--largura=1200] [--saida=<pasta>]
 * Grava `casamento.json` (`modelar.casamento-da-vista@1`) e `casamento.png`: a referência clareada, a troca em magenta translúcido,
 * as linhas de contorno e divisa do modelo em verde onde casam e em vermelho onde passam da tolerância, a borda da referência sem
 * linha em azul, os retângulos ignorados em cinza e a grade com o nome das regiões. */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GRADE_PADRAO, dePng, escrever, paraPng, reamostrar, regioesDaGrade } from './leitura-por-regioes.mjs';
import { LINHA, facesDoNeutro, linhasDoRaster, rasterizar } from './linhas-do-modelo.mjs';
import { FUNDO, FUNDO_PADRAO, classificarCaixa, lerClasses, lerCor } from './perfil-por-cor.mjs';

export const FORMATO = 'modelar.casamento-da-vista@1';
export const TOLERANCIA_PADRAO_MM = 12;
export const LARGURA_PADRAO = 1200;
export const EROSAO_PX = 2;
const INFINITO = 0x3fffffff;
const MAGENTA = [230, 0, 200]; const VERDE = [0, 160, 70]; const VERMELHO = [225, 0, 40]; const AZUL = [0, 90, 255];
const CINZA = [140, 140, 140]; const AZUL_GRADE = [0, 90, 255];

export class ErroDoCasamento extends Error {
  constructor(mensagem) { super(mensagem); this.name = 'ErroDoCasamento'; }
}

/* --- mapas binários ------------------------------------------------------------------------------------------------------------- */
/** A distância de chanfro 3-4 de cada pixel à fonte mais próxima, em px (Infinity sem fonte nenhuma). */
export function transformadaDeDistancia(fonte, L, A) {
  const d = new Int32Array(L * A);
  for (let i = 0; i < d.length; i += 1) d[i] = fonte[i] ? 0 : INFINITO;
  for (let y = 0; y < A; y += 1) for (let x = 0; x < L; x += 1) {
    const o = y * L + x; let v = d[o];
    if (x > 0 && d[o - 1] + 3 < v) v = d[o - 1] + 3;
    if (y > 0) {
      if (d[o - L] + 3 < v) v = d[o - L] + 3;
      if (x > 0 && d[o - L - 1] + 4 < v) v = d[o - L - 1] + 4;
      if (x < L - 1 && d[o - L + 1] + 4 < v) v = d[o - L + 1] + 4;
    }
    d[o] = v;
  }
  for (let y = A - 1; y >= 0; y -= 1) for (let x = L - 1; x >= 0; x -= 1) {
    const o = y * L + x; let v = d[o];
    if (x < L - 1 && d[o + 1] + 3 < v) v = d[o + 1] + 3;
    if (y < A - 1) {
      if (d[o + L] + 3 < v) v = d[o + L] + 3;
      if (x < L - 1 && d[o + L + 1] + 4 < v) v = d[o + L + 1] + 4;
      if (x > 0 && d[o + L - 1] + 4 < v) v = d[o + L - 1] + 4;
    }
    d[o] = v;
  }
  const sai = new Float32Array(L * A);
  for (let i = 0; i < d.length; i += 1) sai[i] = d[i] >= INFINITO ? Infinity : d[i] / 3;
  return sai;
}

/* o mínimo (erosão) ou o máximo (dilatação) numa janela quadrada de lado 2r+1, separável, com a beira da imagem repetida */
function filtroQuadrado(mapa, L, A, r, minimo) {
  const passo = (entra, dx, dy) => {
    const sai = new Uint8Array(L * A);
    for (let y = 0; y < A; y += 1) for (let x = 0; x < L; x += 1) {
      let v = minimo ? 1 : 0;
      for (let k = -r; k <= r; k += 1) {
        const xx = Math.min(L - 1, Math.max(0, x + k * dx)); const yy = Math.min(A - 1, Math.max(0, y + k * dy));
        const w = entra[yy * L + xx];
        if (minimo ? !w : w) { v = minimo ? 0 : 1; break; }
      }
      sai[y * L + x] = v;
    }
    return sai;
  };
  return passo(passo(mapa, 1, 0), 0, 1);
}
/** A abertura do mapa por um quadrado de raio r: some o que a erosão apaga, e o que sobrevive volta ao tamanho dele. */
export function abertura(mapa, L, A, r = EROSAO_PX) {
  return filtroQuadrado(filtroQuadrado(mapa, L, A, r, true), L, A, r, false);
}

/** A borda de um mapa de classes (FUNDO é o fundo), marcada como `linhasDoRaster` marca contorno e divisa; nada que encoste num pixel de `fora` vale. */
export function bordaDasClasses(classe, L, A, fora) {
  const sai = new Uint8Array(L * A);
  for (let y = 0; y < A; y += 1) for (let x = 0; x < L; x += 1) {
    const o = y * L + x;
    if (fora[o]) continue;
    if (classe[o] !== FUNDO && (x === 0 || y === 0 || x === L - 1 || y === A - 1)) sai[o] = 1;
    for (const [dx, dy] of [[1, 0], [0, 1]]) {
      if (x + dx >= L || y + dy >= A) continue;
      const p = o + dy * L + dx;
      if (fora[p] || classe[o] === classe[p]) continue;
      sai[classe[o] === FUNDO ? p : o] = 1;
    }
  }
  return sai;
}

/* --- a medida -------------------------------------------------------------------------------------------------------------------- */
const arredonda = (v, casas = 2) => (v === null || !Number.isFinite(v) ? null : Number(v.toFixed(casas)));

/**
 * Mede o casamento do modelo com a referência numa vista.
 * @param {{ faces: object[], partes: string[], classeDaParte: Record<string, string>, vista: string, largura?: number,
 *   referencia, caixaRef: number[], classes: object[], fundo?: number[], ignorar?: number[][], grade?: number[], toleranciaMm?: number }} o
 *   `faces` no formato de `facesDoNeutro` (o índice 1 é `partes[0]`), `referencia` no formato de `dePng`, `classes` de `lerClasses`
 */
export function medirCasamento(o) {
  const { classes, partes, classeDaParte } = o;
  const fundo = o.fundo ?? FUNDO_PADRAO; const tol = o.toleranciaMm ?? TOLERANCIA_PADRAO_MM; const grade = o.grade ?? GRADE_PADRAO;
  if (!(tol >= 0)) throw new ErroDoCasamento(`--tolerancia-mm espera um número não negativo e veio ${o.toleranciaMm}`);
  const [rx0, ry0, rx1, ry1] = o.caixaRef;
  if (!o.caixaRef.every(Number.isFinite) || !(rx1 > rx0 && ry1 > ry0) || rx0 < 0 || ry0 < 0 || rx1 > o.referencia.largura || ry1 > o.referencia.altura) {
    throw new ErroDoCasamento(`--caixa-ref ${o.caixaRef.join(',')} não cabe na referência de ${o.referencia.largura} x ${o.referencia.altura} px`);
  }
  /* a classe de cada parte; parte sem classe, ou com classe que não está em --cores, é recusa */
  const nomesDasClasses = classes.map((c) => c.nome);
  for (const [p, c] of Object.entries(classeDaParte)) {
    if (!partes.includes(p)) throw new ErroDoCasamento(`--partes cita a parte "${p}", que a opção não tem; as partes dela são ${partes.join(', ')}`);
    if (!nomesDasClasses.includes(c)) throw new ErroDoCasamento(`--partes dá à parte "${p}" a classe "${c}", que não está em --cores (${nomesDasClasses.join(', ')})`);
  }
  const semClasse = partes.filter((p) => classeDaParte[p] === undefined);
  if (semClasse.length) throw new ErroDoCasamento(`--partes não diz a classe de ${semClasse.join(', ')}; as partes da opção são ${partes.join(', ')}`);
  const indiceDaParte = [FUNDO, ...partes.map((p) => nomesDasClasses.indexOf(classeDaParte[p]))];

  /* o modelo: a classe de cada pixel pela parte dele, e as linhas */
  const r = rasterizar(o.faces, o.vista, o.largura ?? LARGURA_PADRAO);
  const { largura: L, altura: A, mmPorPx } = r;
  const linhas = linhasDoRaster(r);
  const modelo = new Int8Array(L * A);
  for (let i = 0; i < modelo.length; i += 1) {
    const k = r.parte[i];
    if (k >= indiceDaParte.length) throw new ErroDoCasamento(`a malha tem faces sem parte nomeada; as partes da opção são ${partes.join(', ')}`);
    modelo[i] = indiceDaParte[k];
  }
  /* a referência: a caixa reamostrada para o raster, cada eixo com a sua escala, e classificada */
  const ref = reamostrar(o.referencia, o.caixaRef, L, A, fundo);
  const referencia = classificarCaixa(ref, [0, 0, L, A], classes, fundo);
  const fx = L / (rx1 - rx0); const fy = A / (ry1 - ry0);
  const fora = new Uint8Array(L * A);
  for (const [a, b, c, d] of o.ignorar ?? []) {
    const xa = Math.max(0, Math.round((a - rx0) * fx)); const xb = Math.min(L, Math.round((c - rx0) * fx));
    const ya = Math.max(0, Math.round((b - ry0) * fy)); const yb = Math.min(A, Math.round((d - ry0) * fy));
    for (let y = ya; y < yb; y += 1) for (let x = xa; x < xb; x += 1) fora[y * L + x] = 1;
  }
  /* medida 1 */
  const bruto = new Uint8Array(L * A);
  for (let i = 0; i < bruto.length; i += 1) bruto[i] = !fora[i] && modelo[i] !== referencia[i] ? 1 : 0;
  const troca = abertura(bruto, L, A, EROSAO_PX);
  /* medida 2 */
  const linhaDoModelo = new Uint8Array(L * A);
  for (let i = 0; i < linhas.length; i += 1) if (!fora[i] && (linhas[i] === LINHA.contorno || linhas[i] === LINHA.divisa)) linhaDoModelo[i] = 1;
  const borda = bordaDasClasses(referencia, L, A, fora);
  const ateBorda = transformadaDeDistancia(borda, L, A);
  const ateLinha = transformadaDeDistancia(linhaDoModelo, L, A);

  const nomeDaClasse = (k) => (k === FUNDO ? 'fundo' : nomesDasClasses[k]);
  const regioes = []; const ignoradas = [];
  for (const g of regioesDaGrade(L, A, grade, undefined)) {
    const xa = Math.max(0, g.x); const xb = Math.min(L, g.x + g.largura); const ya = Math.max(0, g.y); const yb = Math.min(A, g.y + g.altura);
    let validos = 0; let trocados = 0; const pares = new Map();
    const semBorda = { px: 0, fora: 0, maior: 0 }; const semLinha = { px: 0, fora: 0, maior: 0 }; let quina = 0; let dobra = 0;
    for (let y = ya; y < yb; y += 1) for (let x = xa; x < xb; x += 1) {
      const i = y * L + x;
      if (fora[i]) continue;
      validos += 1;
      if (troca[i]) {
        trocados += 1;
        const chave = `${nomeDaClasse(referencia[i])}>${nomeDaClasse(modelo[i])}`; pares.set(chave, (pares.get(chave) ?? 0) + 1);
      }
      if (linhas[i] === LINHA.quina) quina += 1; else if (linhas[i] === LINHA.dobra) dobra += 1;
      for (const [marca, dist, conta] of [[linhaDoModelo, ateBorda, semBorda], [borda, ateLinha, semLinha]]) {
        if (!marca[i]) continue;
        const mm = dist[i] * mmPorPx; conta.px += 1;
        if (mm > tol) conta.fora += 1;
        if (mm > conta.maior) conta.maior = mm;
      }
    }
    if (!validos) { ignoradas.push(g.nome); continue; }
    const fracao = trocados / validos;
    const julgados = semBorda.px + semLinha.px;
    const nota = fracao * 100 + (julgados ? (100 * (semBorda.fora + semLinha.fora)) / julgados : 0);
    const topo = [...pares.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, 2)
      .map(([k, n]) => { const [referencia, modelo] = k.split('>'); return { referencia, modelo, fracao: arredonda(n / validos, 4) }; });
    const resumo = (c) => ({ px: c.px, fora: c.fora, maiorMm: c.px ? arredonda(c.maior, 1) : null });
    regioes.push({
      nome: g.nome, caixa: [xa, ya, xb, yb], pixels: validos, nota: arredonda(nota),
      troca: { fracao: arredonda(fracao, 4), pares: topo },
      linhaSemBorda: resumo(semBorda), bordaSemLinha: resumo(semLinha), naoJulgadas: { quina, dobra },
    });
  }
  regioes.sort((a, b) => b.nota - a.nota);   // a ordenação do JavaScript é estável: o empate fica na ordem da grade
  return {
    largura: L, altura: A, mmPorPx, toleranciaMm: tol, grade, regioes, ignoradas,
    proporcao: { referencia: (ry1 - ry0) / (rx1 - rx0), modelo: A / L },
    mapas: { ref, troca, linhas, linhaDoModelo, borda, ateBorda, ateLinha, fora },
  };
}

/** O desenho do casamento: a referência clareada, a troca, as linhas que casam e as que não, a borda sem linha, o ignorado e a grade. */
export function desenharCasamento(m) {
  const { largura: L, altura: A, mmPorPx, toleranciaMm: tol } = m; const { ref, troca, linhaDoModelo, borda, ateBorda, ateLinha, fora } = m.mapas;
  const im = { largura: L, altura: A, dados: new Uint8Array(L * A * 3) };
  for (let i = 0; i < im.dados.length; i += 1) im.dados[i] = Math.round(ref.dados[i] * 0.4 + 255 * 0.6);
  const pinta = (x, y, cor, alfa = 1) => {
    if (x < 0 || y < 0 || x >= L || y >= A) return;
    const o = (y * L + x) * 3;
    for (let k = 0; k < 3; k += 1) im.dados[o + k] = Math.round(im.dados[o + k] * (1 - alfa) + cor[k] * alfa);
  };
  for (let i = 0; i < troca.length; i += 1) if (troca[i]) pinta(i % L, Math.floor(i / L), MAGENTA, 0.45);
  for (let i = 0; i < fora.length; i += 1) if (fora[i] && ((i % L) + Math.floor(i / L)) % 8 === 0) pinta(i % L, Math.floor(i / L), CINZA);
  const grosso = (i, cor) => { const x = i % L; const y = Math.floor(i / L); for (let dy = 0; dy < 2; dy += 1) for (let dx = 0; dx < 2; dx += 1) pinta(x + dx, y + dy, cor); };
  for (let i = 0; i < borda.length; i += 1) if (borda[i] && ateLinha[i] * mmPorPx > tol) grosso(i, AZUL);
  for (let i = 0; i < linhaDoModelo.length; i += 1) if (linhaDoModelo[i]) grosso(i, ateBorda[i] * mmPorPx > tol ? VERMELHO : VERDE);
  for (const g of regioesDaGrade(L, A, m.grade)) {
    for (let x = g.x; x < g.x + g.largura; x += 1) { pinta(x, g.y, AZUL_GRADE, 0.6); pinta(x, g.y + g.altura - 1, AZUL_GRADE, 0.6); }
    for (let y = g.y; y < g.y + g.altura; y += 1) { pinta(g.x, y, AZUL_GRADE, 0.6); pinta(g.x + g.largura - 1, y, AZUL_GRADE, 0.6); }
    escrever(im, g.nome, g.x + 6, g.y + 6, AZUL_GRADE, Math.max(2, Math.round(L / 400)));
  }
  return im;
}

/** O JSON `modelar.casamento-da-vista@1`. */
export function paraJson(m, origem = {}) {
  return {
    formato: FORMATO, ...origem, largura: m.largura, altura: m.altura, mmPorPx: arredonda(m.mmPorPx, 4), toleranciaMm: m.toleranciaMm,
    erosaoPx: EROSAO_PX, grade: m.grade,
    nota: 'troca% + 100 x (px de linha sem borda fora + px de borda sem linha fora) / (px de linha + px de borda julgados)',
    proporcao: { referencia: arredonda(m.proporcao.referencia, 4), modelo: arredonda(m.proporcao.modelo, 4) },
    regioes: m.regioes, ignoradas: m.ignoradas,
  };
}

/** As linhas do relato, uma por região, na ordem da nota. */
export function relato(m) {
  const pct = (v) => `${(v * 100).toFixed(1)}%`;
  const mm = (c) => (c.maiorMm === null ? 'sem px' : `${c.fora} de ${c.px} px fora, máx ${c.maiorMm} mm`);
  return m.regioes.map((r) => `${r.nome.padEnd(3)} nota ${r.nota.toFixed(2).padStart(6)}  troca ${pct(r.troca.fracao).padStart(6)}${r.troca.pares.length ? ` (${r.troca.pares.map((p) => `${p.referencia} na ref, ${p.modelo} no modelo ${pct(p.fracao)}`).join('; ')})` : ''}`
    + `  linha sem borda ${mm(r.linhaSemBorda)}  borda sem linha ${mm(r.bordaSemLinha)}  quina ${r.naoJulgadas.quina} px, dobra ${r.naoJulgadas.dobra} px`);
}

/* --- linha de comando ------------------------------------------------------------------------------------------------------------ */
const AJUDA = `npm run casamento:vista -- <esboço> --vista=<vista> --referencia=<png> --caixa-ref=x0,y0,x1,y1 --cores=nome:#rrggbb,...
    --partes=parte:classe,... [--opcao=1] [--fundo=#ffffff] [--ignorar=x0,y0,x1,y1;x0,y0,x1,y1] [--grade=4x3]
    [--tolerancia-mm=${TOLERANCIA_PADRAO_MM}] [--largura=${LARGURA_PADRAO}] [--saida=<pasta>]

Mede, por região da grade, a fração de classe de material trocada entre o modelo (cor chapada pela parte, tirada da malha) e a
referência (classificada por cor), e a distância de cada linha de contorno e divisa do modelo à divisa de classes da referência, e
o contrário. Grava casamento.json e casamento.png em --saida. O número ordena as regiões e informa; não aprova forma.`;

const numeros = (texto, n, nome) => {
  const v = String(texto).split(',').map((s) => Number(s.trim()));
  if (v.length !== n || !v.every(Number.isFinite)) throw new ErroDoCasamento(`${nome} espera ${n} números separados por vírgula e veio "${texto}"`);
  return v;
};
function lerPartes(texto) {
  const sai = {};
  for (const item of String(texto).split(',')) {
    const m = /^([^:\s,]+):([^:\s,]+)$/.exec(item.trim());
    if (!m) throw new ErroDoCasamento(`--partes espera parte:classe separados por vírgula e veio "${item}"`);
    if (sai[m[1]] !== undefined) throw new ErroDoCasamento(`--partes repete a parte "${m[1]}"`);
    sai[m[1]] = m[2];
  }
  return sai;
}

export async function executar(argv) {
  const valor = (nome) => { const a = argv.find((x) => x.startsWith(`--${nome}=`)); return a === undefined ? null : a.slice(nome.length + 3); };
  const arquivo = argv.find((a) => !a.startsWith('--'));
  if (argv.includes('--ajuda') || argv.includes('--help') || argv.length === 0) return { codigo: 0, stdout: `${AJUDA}\n`, stderr: '' };
  try {
    if (!arquivo) throw new ErroDoCasamento('falta o esboço');
    for (const n of ['vista', 'referencia', 'caixa-ref', 'cores', 'partes']) if (!valor(n)) throw new ErroDoCasamento(`falta --${n}`);
    const classes = lerClasses(valor('cores'));
    const classeDaParte = lerPartes(valor('partes'));
    const caixaRef = numeros(valor('caixa-ref'), 4, '--caixa-ref');
    const ignorar = valor('ignorar') ? valor('ignorar').split(';').filter((s) => s.trim()).map((s) => numeros(s, 4, '--ignorar')) : [];
    const grade = valor('grade') ? valor('grade').split('x').map(Number) : GRADE_PADRAO;
    const toleranciaMm = valor('tolerancia-mm') === null ? TOLERANCIA_PADRAO_MM : Number(valor('tolerancia-mm'));
    if (!Number.isFinite(toleranciaMm) || toleranciaMm < 0) throw new ErroDoCasamento(`--tolerancia-mm espera um número não negativo e veio "${valor('tolerancia-mm')}"`);
    const largura = valor('largura') === null ? LARGURA_PADRAO : Number(valor('largura'));
    if (!Number.isInteger(largura) || largura < 16) throw new ErroDoCasamento(`--largura espera um inteiro de pelo menos 16 e veio "${valor('largura')}"`);
    const fundo = valor('fundo') ? lerCor(valor('fundo'), '--fundo') : FUNDO_PADRAO;
    const referencia = dePng(readFileSync(resolve(valor('referencia'))));
    const { lerArquivoDeEsboco, montarOpcoes } = await import('./esboco-nucleo.mjs');
    const montado = montarOpcoes(await lerArquivoDeEsboco(resolve(arquivo)), { nome: basename(arquivo), relato: false });
    if (montado.recusas?.length) return { codigo: 1, stdout: '', stderr: `casamento:vista: o esboço foi recusado:\n${montado.recusas.map((r) => `- ${r}`).join('\n')}\n` };
    const opcao = Number(valor('opcao') ?? 1); const painel = montado.paineis[opcao - 1];
    if (!painel) throw new ErroDoCasamento(`o esboço tem ${montado.paineis.length} opções e veio --opcao=${valor('opcao')}`);
    let m;
    try {
      m = medirCasamento({ faces: facesDoNeutro(painel.neutro, painel.partes), partes: painel.partes, classeDaParte, vista: valor('vista'), largura, referencia, caixaRef, classes, fundo, ignorar, grade, toleranciaMm });
    } catch (erro) {
      if (/não existe na bancada|não tem área|grade .* fora do aceito/.test(erro?.message ?? '')) throw new ErroDoCasamento(erro.message);
      throw erro;
    }
    const gravados = [];
    if (valor('saida')) {
      const pasta = resolve(valor('saida')); mkdirSync(pasta, { recursive: true });
      const origem = { esboco: arquivo, opcao, vista: valor('vista'), referencia: valor('referencia'), caixaRef, ignorar, cores: valor('cores'), partes: classeDaParte };
      writeFileSync(join(pasta, 'casamento.json'), `${JSON.stringify(paraJson(m, origem), null, 1)}\n`);
      writeFileSync(join(pasta, 'casamento.png'), paraPng(desenharCasamento(m)));
      gravados.push(join(pasta, 'casamento.json'), join(pasta, 'casamento.png'));
    }
    const desvio = (m.proporcao.modelo / m.proporcao.referencia - 1) * 100;
    const cabeca = [
      `casamento da vista ${valor('vista')}: o número ordena as regiões e confirma ou derruba uma diferença; não aprova forma, quem aprova é a pessoa.`,
      `${m.largura} x ${m.altura} px, ${m.mmPorPx.toFixed(2)} mm por px, tolerância ${m.toleranciaMm} mm; altura sobre largura: referência ${m.proporcao.referencia.toFixed(3)}, modelo ${m.proporcao.modelo.toFixed(3)} (${desvio >= 0 ? '+' : ''}${desvio.toFixed(1)}%)`,
      ...(m.ignoradas.length ? [`regiões inteiras no ignorado, fora da conta: ${m.ignoradas.join(', ')}`] : []),
    ];
    return { codigo: 0, stdout: `${[...cabeca, ...relato(m), ...(gravados.length ? gravados : ['nada gravado: use --saida=<pasta>'])].join('\n')}\n`, stderr: '' };
  } catch (erro) {
    if (erro instanceof ErroDoCasamento || erro?.name === 'ErroDoPerfil' || erro?.code === 'ENOENT') return { codigo: 2, stdout: '', stderr: `casamento:vista: ${erro.message}\n` };
    throw erro;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const r = await executar(process.argv.slice(2));
  process.stdout.write(r.stdout); process.stderr.write(r.stderr); process.exitCode = r.codigo;
}
