#!/usr/bin/env node
/* medir-paridade.mjs — a luz rasante e a curvatura da bancada medidas contra as do Blender na mesma peça e na mesma vista (fatia 5 do
 * plano do reflexo na bancada). Reproduz o relatório `PARIDADE.md` desta pasta.
 *
 * O QUE FAZ. Gera as vistas do Blender (`vistasDeSuperficie`, as mesmas do pacote do crítico) e, para cada azimute que o Blender
 * escolheu na vista pedida, a luz rasante da bancada com o mesmo azimute, ortográfica e enquadrada (`--visao=luz-rasante --azimute
 * --projecao=ortografica --enquadrar`), e a curvatura da bancada na mesma vista. Mede:
 *  - a fração da peça iluminada, com a regra do Blender (`superficie.fracao_iluminada`: luminância do PNG acima de 8/255);
 *  - com `--lisa`, a posição do amassado: o centroide da diferença absoluta entre a imagem da peça e a da chapa lisa, na mesma
 *    ferramenta, em fração da caixa da peça na imagem (0 a 1 da esquerda para a direita e de cima para baixo), contra a posição declarada;
 *  - a escala da curvatura (a cor cheia, em 1/m) de cada uma, e a curvatura que a cor de cada imagem diz no centro do amassado e, na
 *    grade comum de 60 por 40 pontos da caixa da peça, a correlação e a diferença mediana entre as duas, em 1/m.
 * A caixa e a máscara da peça na imagem do Blender saem da curvatura da mesma vista (o que não é o fundo preto); na da bancada, do
 * que não é o fundo da auditoria. Grava `<saida>/paridade-<rotulo>.json` e, com `--figura`, a imagem pequena lado a lado.
 *
 * Uso: MODELAR_BLENDER=<blender> node docs/modelar/banco-de-provas/reflexo-na-bancada-2026-11-15/medir-paridade.mjs <peça>
 *        --vista-blender=frente --vista-bancada=frontal --rotulo=chapa [--lisa=<peça lisa>] [--amassado=u,v] [--figura=<png>]
 * A vista de três quartos (fatia 6) se mede com `--vista-blender=tresquartos --vista-bancada=tresquartos`, que a bancada faz na mesma
 * direção do Blender; o Blender roda só a vista medida, e `bancada.elevacao` diz a altura da luz que a bancada escolheu. Com
 * `--luz-da-bancada`, a bancada usa as duas direções que ela escolhe (as do pacote do crítico sem o Blender) no lugar dos azimutes do
 * Blender, e a comparação fica na fração iluminada e na posição do amassado.
 * `--saida` (padrão `tmp/paridade-reflexo`, dentro do repositório, porque a bancada só grava nele). */
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { lerArgumentos } from '../../../../tools/modelar/argumentos.mjs';
import { comoCLI } from '../../../../tools/modelar/olhar-bancada.mjs';
import { latariaDaPeca, vistasDeSuperficie } from '../../../../tools/modelar/vistas-de-superficie.mjs';
import { lerEntradaDeMedida } from '../../../../tools/modelar/entrada-de-medida.mjs';
import { criarCalculadoraDaCurvatura } from '../../../../src/bancada/visoes/calculo-da-curvatura.js';
import { fonteDaCurvatura } from '../../../../src/bancada/visoes/fonte-da-curvatura.js';
import { COR_CONCAVA, COR_CONVEXA } from '../../../../src/autoria/curvatura-da-lataria.js';

const REPO = resolve(fileURLToPath(new URL('../../../..', import.meta.url)));
const FUNDO_DA_BANCADA = [242, 244, 243];
const LIMIAR_ACESO = 8 / 255;
const GRADE = [60, 40];

const lerPng = (arquivo) => { const p = PNG.sync.read(readFileSync(arquivo)); return { W: p.width, H: p.height, d: p.data }; };
const lum = (r, g, b) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
const linear = (c) => { const x = c / 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; };

/* a curvatura que a cor diz, em fração da escala (-1 a 1), ou NaN no cinza sem dado; a cor do PNG volta ao linear antes */
function tDaCor(r, g, b) {
  const [R, G, B] = [linear(r), linear(g), linear(b)];
  if (Math.abs(R - G) < 0.03 && Math.abs(G - B) < 0.03 && R < 0.9) return NaN;
  if (R >= B) return Math.min(1, Math.max(0, (1 - G) / (1 - COR_CONVEXA[1])));
  return -Math.min(1, Math.max(0, (1 - G) / (1 - COR_CONCAVA[1])));
}

/* a máscara e a caixa da peça numa captura da bancada (o que não é o fundo da auditoria) */
function caixaDaBancada(img) {
  const m = new Uint8Array(img.W * img.H);
  let x0 = img.W; let x1 = -1; let y0 = img.H; let y1 = -1;
  for (let y = 0; y < img.H; y++) {
    for (let x = 0; x < img.W; x++) {
      const i = 4 * (y * img.W + x);
      if (Math.abs(img.d[i] - FUNDO_DA_BANCADA[0]) + Math.abs(img.d[i + 1] - FUNDO_DA_BANCADA[1]) + Math.abs(img.d[i + 2] - FUNDO_DA_BANCADA[2]) <= 3) continue;
      m[y * img.W + x] = 1;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  return { mascara: m, caixa: [x0, y0, x1 + 1, y1 + 1] };
}

/* a máscara e a caixa da peça na imagem do Blender: o que não é o fundo preto na curvatura da mesma vista, que sai da mesma câmera (a
   da caixa dos vértices do OBJ) e não tem pixel preto na peça (o cinza sem dado é 0,25) */
function caixaDoBlender(curvatura) {
  const m = new Uint8Array(curvatura.W * curvatura.H);
  let x0 = curvatura.W; let x1 = -1; let y0 = curvatura.H; let y1 = -1;
  for (let y = 0; y < curvatura.H; y++) {
    for (let x = 0; x < curvatura.W; x++) {
      const i = 4 * (y * curvatura.W + x);
      if (Math.max(curvatura.d[i], curvatura.d[i + 1], curvatura.d[i + 2]) <= 10) continue;
      m[y * curvatura.W + x] = 1;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  return { mascara: m, caixa: [x0, y0, x1 + 1, y1 + 1] };
}

function fracaoIluminada(img, mascara) {
  let n = 0; let acesos = 0;
  for (let k = 0; k < img.W * img.H; k++) {
    if (!mascara[k]) continue;
    n++;
    if (lum(img.d[4 * k], img.d[4 * k + 1], img.d[4 * k + 2]) > LIMIAR_ACESO) acesos++;
  }
  return n ? acesos / n : 0;
}

/* o ponto (u, v) da caixa, em pixel */
const pixelDe = (caixa, u, v) => [Math.round(caixa[0] + u * (caixa[2] - caixa[0])), Math.round(caixa[1] + v * (caixa[3] - caixa[1]))];

/* o centroide de |a - b| (luminância, ou fração da escala) acima do percentil 99 dentro da caixa, em fração da caixa */
function centroideDaDiferenca(a, b, caixa, valor) {
  const dif = [];
  for (let y = caixa[1]; y < caixa[3]; y++) for (let x = caixa[0]; x < caixa[2]; x++) {
    const va = valor(a, x, y); const vb = valor(b, x, y);
    if (Number.isFinite(va) && Number.isFinite(vb)) dif.push([x, y, Math.abs(va - vb)]);
  }
  const ordenados = dif.map((d) => d[2]).sort((p, q) => p - q);
  const corte = Math.max(ordenados[Math.floor(0.99 * ordenados.length)] ?? 0, 1e-6);
  let sx = 0; let sy = 0; let sw = 0;
  for (const [x, y, w] of dif) if (w >= corte) { sx += x * w; sy += y * w; sw += w; }
  if (!sw) return null;
  return { u: +((sx / sw - caixa[0]) / (caixa[2] - caixa[0])).toFixed(4), v: +((sy / sw - caixa[1]) / (caixa[3] - caixa[1])).toFixed(4), maximo: +ordenados[ordenados.length - 1].toFixed(4) };
}
const lumEm = (img, x, y) => { if (x < 0 || y < 0 || x >= img.W || y >= img.H) return NaN; const i = 4 * (y * img.W + x); return lum(img.d[i], img.d[i + 1], img.d[i + 2]); };
const tEm = (img, x, y) => { if (x < 0 || y < 0 || x >= img.W || y >= img.H) return NaN; const i = 4 * (y * img.W + x); return tDaCor(img.d[i], img.d[i + 1], img.d[i + 2]); };

/* a média de t num quadrado de lado 2r+1 em volta do ponto */
function tNoPonto(img, caixa, u, v, r = 3) {
  const [cx, cy] = pixelDe(caixa, u, v);
  let s = 0; let n = 0;
  for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) { const t = tEm(img, x, y); if (Number.isFinite(t)) { s += t; n++; } }
  return n ? s / n : NaN;
}

/* a luminância das duas imagens na grade comum da caixa, só onde as duas máscaras têm a peça (o vão do vidro e o arco da roda são fundo
   preto no Blender e cinza claro na bancada): correlação, diferença mediana e a média de cada uma */
function compararLuminancias(a, caixaA, mascaraA, b, caixaB, mascaraB) {
  const pares = [];
  for (let j = 0; j < GRADE[1]; j++) for (let i = 0; i < GRADE[0]; i++) {
    const u = (i + 0.5) / GRADE[0]; const v = (j + 0.5) / GRADE[1];
    const pa = pixelDe(caixaA, u, v); const pb = pixelDe(caixaB, u, v);
    if (!mascaraA[pa[1] * a.W + pa[0]] || !mascaraB[pb[1] * b.W + pb[0]]) continue;
    const la = lumEm(a, ...pa); const lb = lumEm(b, ...pb);
    if (Number.isFinite(la) && Number.isFinite(lb)) pares.push([la, lb]);
  }
  const n = pares.length;
  const ma = pares.reduce((s, p) => s + p[0], 0) / n; const mb = pares.reduce((s, p) => s + p[1], 0) / n;
  let sab = 0; let saa = 0; let sbb = 0;
  for (const [x, y] of pares) { sab += (x - ma) * (y - mb); saa += (x - ma) ** 2; sbb += (y - mb) ** 2; }
  const difs = pares.map(([x, y]) => Math.abs(x - y)).sort((p, q) => p - q);
  return { pontos: n, correlacao: +(sab / Math.sqrt(saa * sbb)).toFixed(4), diferencaMediana: +difs[Math.floor(n / 2)].toFixed(4), mediaBlender: +ma.toFixed(4), mediaBancada: +mb.toFixed(4) };
}

/* a curvatura (1/m) das duas imagens na grade comum da caixa: correlação e diferença mediana */
function compararCurvaturas(a, caixaA, escalaA, b, caixaB, escalaB) {
  const pares = [];
  for (let j = 0; j < GRADE[1]; j++) for (let i = 0; i < GRADE[0]; i++) {
    const u = (i + 0.5) / GRADE[0]; const v = (j + 0.5) / GRADE[1];
    const ha = tNoPonto(a, caixaA, u, v, 1) * escalaA; const hb = tNoPonto(b, caixaB, u, v, 1) * escalaB;
    if (Number.isFinite(ha) && Number.isFinite(hb)) pares.push([ha, hb]);
  }
  const n = pares.length;
  const ma = pares.reduce((s, p) => s + p[0], 0) / n; const mb = pares.reduce((s, p) => s + p[1], 0) / n;
  let sab = 0; let saa = 0; let sbb = 0;
  for (const [x, y] of pares) { sab += (x - ma) * (y - mb); saa += (x - ma) ** 2; sbb += (y - mb) ** 2; }
  const difs = pares.map(([x, y]) => Math.abs(x - y)).sort((p, q) => p - q);
  return { pontos: n, correlacao: sab / Math.sqrt(saa * sbb), diferencaMediana: difs[Math.floor(n / 2)], diferencaP90: difs[Math.floor(0.9 * n)] };
}

let capturas = 0;
/* a altura da luz rasante que a bancada escolheu, em graus sobre o plano da imagem, lida do relato da captura */
let ultimaElevacao = null;
let ultimoAzimute = null;
let ultimaSegunda = null;
async function capturar(peca, saida, args) {
  const pasta = join(saida, `c-${String(++capturas).padStart(2, "0")}`);
  mkdirSync(pasta, { recursive: true });
  const r = await comoCLI([peca, '--sem-contatos', '--auditoria', '--projecao=ortografica', '--enquadrar', '--res=1400x1050', `--saida=${relative(REPO, pasta)}`, ...args]);
  if (r.codigo !== 0) throw new Error(`a bancada falhou em ${peca} ${args.join(' ')}:\n${r.stdout}\n${r.stderr}`);
  const arquivos = readdirSync(pasta).filter((a) => a.endsWith('.png'));
  if (arquivos.length !== 1) throw new Error(`a bancada deu ${arquivos.length} imagens em ${pasta}`);
  const alta = /e (\d+(?:\.\d+)?) graus do plano da imagem/.exec(r.stdout);
  ultimaElevacao = alta ? Number(alta[1]) : null;
  const luz = /luz a (\d+(?:\.\d+)?) graus/.exec(r.stdout);
  ultimoAzimute = luz ? Number(luz[1]) : null;
  const outra = /a outra direção boa desta vista: (\d+(?:\.\d+)?) graus/.exec(r.stdout);
  ultimaSegunda = outra ? Number(outra[1]) : null;
  return join(pasta, arquivos[0]);
}

async function escalaDaBancada(peca) {
  const entrada = await lerEntradaDeMedida(peca, { montagem: false });
  const { neutro } = entrada.executar();
  const fonte = fonteDaCurvatura(entrada.receita, neutro);
  return criarCalculadoraDaCurvatura()({ vincos: fonte.vincos, lataria: fonte.lataria, neutro }).escala;
}

async function blenderDe(peca, saida, vistas) {
  const pasta = join(saida, `blender-${peca.replace(/[^A-Za-z0-9]+/g, '-')}`);
  const lataria = await latariaDaPeca(peca);
  const feitas = await vistasDeSuperficie(peca, { pasta, lataria, ...(vistas ? { vistas } : {}) });
  const sup = join(pasta, 'superficie');
  return { feitas, rasante: JSON.parse(readFileSync(join(sup, 'peca-rasante.json'), 'utf8')), curvatura: JSON.parse(readFileSync(join(sup, 'peca-curvatura.json'), 'utf8')), sup };
}

/* a figura pequena: as imagens recortadas na caixa da peça, reduzidas à mesma altura, numa fileira */
function figura(paineis, arquivo, altura = 160) {
  const recortes = paineis.map(({ img, caixa }) => {
    const w = caixa[2] - caixa[0]; const h = caixa[3] - caixa[1];
    const W = Math.max(1, Math.round((w / h) * altura));
    return { img, caixa, W, w, h };
  });
  const margem = 8;
  const total = recortes.reduce((s, r) => s + r.W + margem, margem);
  const out = new PNG({ width: total, height: altura + 2 * margem });
  out.data.fill(255);
  let x0 = margem;
  for (const r of recortes) {
    for (let y = 0; y < altura; y++) for (let x = 0; x < r.W; x++) {
      const sx = Math.min(r.img.W - 1, Math.max(0, Math.floor(r.caixa[0] + ((x + 0.5) / r.W) * r.w)));
      const sy = Math.min(r.img.H - 1, Math.max(0, Math.floor(r.caixa[1] + ((y + 0.5) / altura) * r.h)));
      const i = 4 * (sy * r.img.W + sx); const o = 4 * ((y + margem) * total + x0 + x);
      out.data[o] = r.img.d[i]; out.data[o + 1] = r.img.d[i + 1]; out.data[o + 2] = r.img.d[i + 2]; out.data[o + 3] = 255;
    }
    x0 += r.W + margem;
  }
  writeFileSync(arquivo, PNG.sync.write(out));
}

async function principal(argv) {
  const lido = lerArgumentos(argv.slice(2), { opcoes: ['vista-blender', 'vista-bancada', 'rotulo', 'lisa', 'amassado', 'figura', 'saida'], bandeiras: ['luz-da-bancada'], posicional: { nome: 'a peça', obrigatorio: true } });
  const peca = lido.posicional;
  const vistaB = lido.opcao('vista-blender'); const vistaN = lido.opcao('vista-bancada'); const rotulo = lido.opcao('rotulo') ?? 'peca';
  const saida = resolve(REPO, lido.opcao('saida') ?? 'tmp/paridade-reflexo', rotulo);
  rmSync(saida, { recursive: true, force: true });
  mkdirSync(saida, { recursive: true });
  const lisa = lido.opcao('lisa');
  const amassado = lido.opcao('amassado')?.split(',').map(Number) ?? null;

  /* o Blender roda só a vista medida (a fatia 6 mediu a de três quartos assim, sem pagar as outras três) */
  const bl = await blenderDe(peca, saida, [vistaB]);
  const blLisa = lisa ? await blenderDe(lisa, saida, [vistaB]) : null;
  const curvB = bl.curvatura.imagens.find((i) => i.vista === vistaB);
  const imgCB = lerPng(curvB.arquivo);
  const caixaB = caixaDoBlender(imgCB);
  const rasantes = bl.rasante.imagens.filter((i) => i.vista === vistaB);
  const resultado = { peca, rotulo, vistaBlender: vistaB, vistaBancada: vistaN, caixaBlenderPx: caixaB.caixa, rasante: [], curvatura: null };
  const paineis = [];

  /* com `--luz-da-bancada`, a bancada usa as duas direções dela (a que ela escolhe pela vista e a outra boa a 90 graus, `segundaLuz`),
     como o pacote do crítico sem o Blender, e não os azimutes do Blender: as duas ferramentas são comparadas pela fração iluminada e pela
     posição do amassado, e não pela luminância, que com luzes diferentes não se compara */
  const daBancada = lido.bandeira('luz-da-bancada');
  let azimutesDaBancada = null;
  let primeiraDaBancada = null;
  if (daBancada) {
    primeiraDaBancada = await capturar(peca, saida, ['--visao=luz-rasante', `--vistas=${vistaN}`]);
    azimutesDaBancada = [ultimoAzimute, ultimaSegunda];
    resultado.azimutesDaBancada = azimutesDaBancada;
  }
  for (const [k, r] of rasantes.entries()) {
    const imgB = lerPng(r.arquivos.malha);
    const azN = daBancada ? azimutesDaBancada[k] : r.azimute;
    const arqN = daBancada && k === 0 ? primeiraDaBancada : await capturar(peca, saida, ['--visao=luz-rasante', `--azimute=${azN}`, `--vistas=${vistaN}`]);
    const imgN = lerPng(arqN);
    const caixaN = caixaDaBancada(imgN);
    const linha = {
      azimute: r.azimute,
      blender: { fracao: r.iluminacao.fracao, fracaoRemedida: +fracaoIluminada(imgB, caixaB.mascara).toFixed(4) },
      bancada: { azimute: azN, fracao: +fracaoIluminada(imgN, caixaN.mascara).toFixed(4), elevacao: ultimaElevacao, arquivo: relative(REPO, arqN), caixaPx: caixaN.caixa },
      ...(daBancada ? {} : { luminancia: compararLuminancias(imgB, caixaB.caixa, caixaB.mascara, imgN, caixaN.caixa, caixaN.mascara) }),
    };
    if (lisa) {
      const rl = blLisa.rasante.imagens.find((i) => i.vista === vistaB && i.azimute === r.azimute);
      if (rl) linha.blender.amassado = centroideDaDiferenca(imgB, lerPng(rl.arquivos.malha), caixaB.caixa, lumEm);
      else linha.blender.amassado = `a chapa lisa não tem a luz de ${r.azimute} graus na vista ${vistaB} (azimutes ${blLisa.rasante.imagens.filter((i) => i.vista === vistaB).map((i) => i.azimute).join(', ')})`;
      const imgNL = lerPng(await capturar(lisa, saida, ['--visao=luz-rasante', `--azimute=${azN}`, `--vistas=${vistaN}`]));
      linha.bancada.amassado = centroideDaDiferenca(imgN, imgNL, caixaN.caixa, lumEm);
    }
    resultado.rasante.push(linha);
    paineis.push({ img: imgB, caixa: caixaB.caixa }, { img: imgN, caixa: caixaN.caixa });
  }

  const arqCN = await capturar(peca, saida, ['--visao=curvatura', `--vistas=${vistaN}`]);
  const imgCN = lerPng(arqCN);
  const caixaCN = caixaDaBancada(imgCN).caixa;
  const escalaB = bl.curvatura.escala_1_m; const escalaN = await escalaDaBancada(peca);
  resultado.curvatura = { escalaBlender: escalaB, escalaBancada: +escalaN.toFixed(5), arquivoBancada: relative(REPO, arqCN), ...compararCurvaturas(imgCB, caixaB.caixa, escalaB, imgCN, caixaCN, escalaN) };
  if (amassado) {
    resultado.amassadoDeclarado = amassado;
    resultado.curvatura.noAmassado = { blender: +(tNoPonto(imgCB, caixaB.caixa, ...amassado) * escalaB).toFixed(4), bancada: +(tNoPonto(imgCN, caixaCN, ...amassado) * escalaN).toFixed(4) };
  }
  /* a posição do amassado pela diferença para a chapa lisa não depende da posição declarada, que só vale na vista de frente: na de três
     quartos as duas ferramentas são comparadas entre si */
  if (lisa) {
    const curvL = blLisa.curvatura.imagens.find((i) => i.vista === vistaB);
    const arqCNL = await capturar(lisa, saida, ['--visao=curvatura', `--vistas=${vistaN}`]);
    resultado.curvatura.amassado = {
      blender: centroideDaDiferenca(imgCB, lerPng(curvL.arquivo), caixaB.caixa, tEm),
      bancada: centroideDaDiferenca(imgCN, lerPng(arqCNL), caixaCN, tEm),
    };
  }
  paineis.push({ img: imgCB, caixa: caixaB.caixa }, { img: imgCN, caixa: caixaCN });
  writeFileSync(join(saida, `paridade-${rotulo}.json`), `${JSON.stringify(resultado, null, 2)}\n`);
  if (lido.opcao('figura')) figura(paineis, resolve(REPO, lido.opcao('figura')));
  process.stdout.write(`${JSON.stringify(resultado, null, 2)}\n`);
  return 0;
}

principal(process.argv).then((c) => { process.exitCode = c; }, (e) => { process.stderr.write(`medir-paridade: ${e.stack ?? e.message}\n`); process.exitCode = 1; });
