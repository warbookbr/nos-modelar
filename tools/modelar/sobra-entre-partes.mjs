#!/usr/bin/env node
/* sobra-entre-partes.mjs — quanto de uma parte aparece fora do contorno da parte que a contém, vista por vista.
 *
 * POR QUE ELE EXISTE. Na traseira da empilhadeira (2026-11-09) a moldura cinza da grade voltou a ser reta de lado a lado enquanto o
 * capô laranja acompanhava a curva da planta. De trás as duas estavam no lugar e a conferência por imagem, que lê uma vista por vez,
 * não viu nada; a pessoa viu nos três quartos a moldura sobrando para fora do capô nos cantos. O que avança ou recua para o
 * observador só aparece na vista vizinha, e ali a medida é simples: a silhueta da parte contida tem de caber na da continente.
 *
 * O QUE ELE FAZ. Para cada vista e cada par declarado em `--dentro=contida:continente`, projeta a contida sozinha e a continente
 * sozinha, na mesma câmera e no mesmo quadro (a caixa do modelo inteiro naquela vista), com o `rasterizar` de linhas-do-modelo.mjs.
 * O pixel da contida que cai fora da continente é sobra; sai a área dela em mm² e a maior distância, em mm, de um pixel de sobra até
 * a silhueta da continente (centro a centro de pixel, pela transformada de distância exata). A ocultação não entra: cada parte é
 * projetada sozinha, e a parte que fica escondida atrás da outra conta como se estivesse à vista.
 *
 * O LIMITE. A parte que fica legitimamente fora numa vista dá sobra ali: a tampa que sobe 40 mm acima do capô, vista de trás, sobra
 * 40 mm, e isso é a forma, não um defeito. Por isso as vistas (`--vistas`) e a tolerância (`--tolerancia-mm`) são de quem conduz,
 * escolhidas para o par, e o número informa onde olhar; ele não aprova forma, que quem aprova é a pessoa.
 *
 * Uso: npm run sobra:partes -- <esboço> --dentro=grade:capo,fundoGrade:capo [--opcao=1] [--vistas=superior,direita,traseira,frontal]
 *        [--tolerancia-mm=3] [--largura=1200] [--saida=<pasta>]
 * O arquivo é o do `esboco:nucleo` (.esboco.json ou módulo). Sai 1 se algum par passa da tolerância em alguma vista, 0 se nenhum, e 2
 * em argumento ruim ou esboço recusado. Com `--saida`, grava `<vista>-<contida>-em-<continente>.png`: a continente em cinza claro, a
 * contida em cinza escuro e a sobra em vermelho. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { VISTAS_BANCADA } from '../../src/autoria/vistas-da-bancada.js';
import { imagem, paraPng } from './leitura-por-regioes.mjs';
import { baseDaVista, facesDoNeutro, rasterizar } from './linhas-do-modelo.mjs';

export const VISTAS_PADRAO = Object.freeze(['superior', 'direita', 'traseira', 'frontal']);
export const TOLERANCIA_MM = 3;
export const CORES_DA_SOBRA = Object.freeze({ continente: [205, 205, 205], contida: [90, 90, 90], sobra: [220, 0, 40] });

export class ErroDaSobra extends Error {
  constructor(mensagem) { super(mensagem); this.name = 'ErroDaSobra'; }
}

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** A caixa projetada das faces na base da vista, `{ u0, u1, v0, v1 }` em mm: o quadro comum a todas as partes. */
export function quadroDaVista(faces, vista) {
  const { direita, cima } = baseDaVista(vista);
  let u0 = Infinity; let u1 = -Infinity; let v0 = Infinity; let v1 = -Infinity;
  for (const f of faces) for (const p of f.pts) {
    const u = dot(p, direita); const v = dot(p, cima);
    if (u < u0) u0 = u; if (u > u1) u1 = u; if (v < v0) v0 = v; if (v > v1) v1 = v;
  }
  return { u0, u1, v0, v1 };
}

/** A silhueta de uma parte sozinha no quadro dado: `{ largura, altura, mmPorPx, mascara }`, com 1 onde a parte cobre o pixel. */
export function silhuetaDaParte(faces, parte, vista, largura, quadro) {
  const proprias = faces.filter((f) => f.parte === parte);
  if (!proprias.length) throw new ErroDaSobra(`a parte ${parte} não tem faces`);
  const r = rasterizar(proprias, vista, largura, quadro);
  const mascara = new Uint8Array(r.parte.length);
  for (let i = 0; i < mascara.length; i += 1) mascara[i] = r.parte[i] ? 1 : 0;
  return { largura: r.largura, altura: r.altura, mmPorPx: r.mmPorPx, mascara };
}

/* a transformada de distância exata de uma linha (Felzenszwalb e Huttenlocher), sobre o quadrado da distância */
function distancia1d(f, n, d, v, z) {
  let k = 0; v[0] = 0; z[0] = -Infinity; z[1] = Infinity;
  for (let q = 1; q < n; q += 1) {
    if (f[q] === Infinity) continue;
    if (f[v[k]] === Infinity) { v[k] = q; continue; }
    let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (k > 0 && s <= z[k]) { k -= 1; s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); }
    k += 1; v[k] = q; z[k] = s; z[k + 1] = Infinity;
  }
  if (f[v[0]] === Infinity) { d.fill(Infinity, 0, n); return; }
  k = 0;
  for (let q = 0; q < n; q += 1) { while (z[k + 1] < q) k += 1; d[q] = (q - v[k]) * (q - v[k]) + f[v[k]]; }
}

/** O quadrado da distância, em px e de centro a centro, de cada pixel ao pixel marcado mais próximo da máscara; sem marca, Infinity. */
export function distanciaAoConjunto(mascara, largura, altura) {
  const n = Math.max(largura, altura);
  const f = new Float64Array(n); const d = new Float64Array(n); const v = new Int32Array(n); const z = new Float64Array(n + 1);
  const sai = new Float64Array(largura * altura);
  for (let x = 0; x < largura; x += 1) {
    for (let y = 0; y < altura; y += 1) f[y] = mascara[y * largura + x] ? 0 : Infinity;
    distancia1d(f, altura, d, v, z);
    for (let y = 0; y < altura; y += 1) sai[y * largura + x] = d[y];
  }
  for (let y = 0; y < altura; y += 1) {
    for (let x = 0; x < largura; x += 1) f[x] = sai[y * largura + x];
    distancia1d(f, largura, d, v, z);
    for (let x = 0; x < largura; x += 1) sai[y * largura + x] = d[x];
  }
  return sai;
}

/** A sobra da contida sobre a continente, as duas no mesmo quadro: `{ pixels, areaMm2, maxMm, sobra }`, com `sobra` a máscara. */
export function medirSobra(contida, continente) {
  const { largura, altura, mmPorPx } = contida;
  if (continente.largura !== largura || continente.altura !== altura) throw new ErroDaSobra('as duas silhuetas precisam do mesmo quadro');
  const sobra = new Uint8Array(largura * altura); let pixels = 0;
  for (let i = 0; i < sobra.length; i += 1) if (contida.mascara[i] && !continente.mascara[i]) { sobra[i] = 1; pixels += 1; }
  let max2 = 0;
  if (pixels) {
    const d2 = distanciaAoConjunto(continente.mascara, largura, altura);
    for (let i = 0; i < sobra.length; i += 1) if (sobra[i] && d2[i] > max2) max2 = d2[i];
  }
  return { pixels, areaMm2: pixels * mmPorPx * mmPorPx, maxMm: Math.sqrt(max2) * mmPorPx, sobra };
}

/**
 * A sobra de cada par em cada vista.
 * @param {Array<{ pts: number[][], parte: number }>} faces  as faces do modelo inteiro, em mm, com o índice da parte a partir de 1
 * @param {string[]} partes  os nomes, na ordem dos índices
 * @param {Array<[string, string]>} pares  [contida, continente]
 * @returns {Array<{ vista, contida, continente, pixels, areaMm2, maxMm, mmPorPx, sobra: boolean, contidaSil, continenteSil, mascara }>}
 */
export function sobraEntrePartes(faces, partes, pares, { vistas = VISTAS_PADRAO, toleranciaMm = TOLERANCIA_MM, largura = 1200 } = {}) {
  const indice = (nome) => {
    const i = partes.indexOf(nome);
    if (i < 0) throw new ErroDaSobra(`a parte "${nome}" não existe na opção (${partes.join(', ')})`);
    return i + 1;
  };
  const idx = pares.map(([a, b]) => [indice(a), indice(b)]);
  for (const v of vistas) if (!VISTAS_BANCADA[v]) throw new ErroDaSobra(`vista "${v}" não existe na bancada (${Object.keys(VISTAS_BANCADA).join(', ')})`);
  const saida = [];
  for (const vista of vistas) {
    const quadro = quadroDaVista(faces, vista);
    const cache = new Map();
    const sil = (p) => { if (!cache.has(p)) cache.set(p, silhuetaDaParte(faces, p, vista, largura, quadro)); return cache.get(p); };
    pares.forEach(([contida, continente], k) => {
      const a = sil(idx[k][0]); const b = sil(idx[k][1]);
      const m = medirSobra(a, b);
      saida.push({ vista, contida, continente, pixels: m.pixels, areaMm2: m.areaMm2, maxMm: m.maxMm, mmPorPx: a.mmPorPx, sobra: m.maxMm > toleranciaMm, contidaSil: a, continenteSil: b, mascara: m.sobra });
    });
  }
  return saida;
}

/** O desenho de um par numa vista: a continente em cinza claro, a contida em cinza escuro e a sobra em vermelho, sobre branco. */
export function desenharSobra({ contidaSil, continenteSil, mascara }) {
  const im = imagem(contidaSil.largura, contidaSil.altura);
  for (let i = 0; i < mascara.length; i += 1) {
    const cor = mascara[i] ? CORES_DA_SOBRA.sobra : contidaSil.mascara[i] ? CORES_DA_SOBRA.contida : continenteSil.mascara[i] ? CORES_DA_SOBRA.continente : null;
    if (cor) { im.dados[i * 3] = cor[0]; im.dados[i * 3 + 1] = cor[1]; im.dados[i * 3 + 2] = cor[2]; }
  }
  return im;
}

/** Os pares de `--dentro`: "a:b,c:d" vira [["a","b"],["c","d"]]. */
export function lerPares(texto) {
  const pares = String(texto ?? '').split(',').filter((s) => s.trim()).map((s) => s.split(':').map((x) => x.trim()));
  if (!pares.length || pares.some((p) => p.length !== 2 || !p[0] || !p[1])) throw new ErroDaSobra('--dentro espera pares "contida:continente" separados por vírgula');
  const mesmo = pares.find(([a, b]) => a === b);
  if (mesmo) throw new ErroDaSobra(`o par "${mesmo[0]}:${mesmo[1]}" põe a parte dentro dela mesma`);
  return pares;
}

const AJUDA = `npm run sobra:partes -- <esboço> --dentro=contida:continente[,...] [--opcao=1] [--vistas=${VISTAS_PADRAO.join(',')}]
    [--tolerancia-mm=${TOLERANCIA_MM}] [--largura=1200] [--saida=<pasta>]

Projeta cada parte do par sozinha, na mesma câmera e no mesmo quadro, e mede o quanto a contida sai da silhueta da continente: a
área em mm² e a maior distância em mm. Sai 1 se algum par passa da tolerância em alguma vista. A parte que fica fora de propósito
numa vista dá sobra nela; escolha as vistas e a tolerância do par. O número informa, não aprova forma.`;

export async function executar(argv) {
  const valor = (nome) => { const a = argv.find((x) => x.startsWith(`--${nome}=`)); return a === undefined ? null : a.slice(nome.length + 3); };
  const arquivo = argv.find((a) => !a.startsWith('--'));
  if (argv.includes('--ajuda') || argv.includes('--help') || !arquivo) return { codigo: arquivo || !argv.length ? 0 : 2, stdout: `${AJUDA}\n`, stderr: '' };
  try {
    const pares = lerPares(valor('dentro'));
    const vistas = valor('vistas') ? valor('vistas').split(',').map((s) => s.trim()).filter(Boolean) : [...VISTAS_PADRAO];
    const toleranciaMm = valor('tolerancia-mm') === null ? TOLERANCIA_MM : Number(valor('tolerancia-mm'));
    if (!Number.isFinite(toleranciaMm) || toleranciaMm < 0) throw new ErroDaSobra('--tolerancia-mm espera um número maior ou igual a zero');
    const largura = valor('largura') === null ? 1200 : Number(valor('largura'));
    if (!Number.isInteger(largura) || largura < 16) throw new ErroDaSobra('--largura espera um inteiro a partir de 16');
    const { lerArquivoDeEsboco, montarOpcoes } = await import('./esboco-nucleo.mjs');
    const montado = montarOpcoes(await lerArquivoDeEsboco(resolve(arquivo)), { nome: basename(arquivo) });
    if (montado.recusas?.length) throw new ErroDaSobra(`o esboço foi recusado:\n${montado.recusas.map((r) => `- ${r.motivo ?? r}`).join('\n')}`);
    const n = Number(valor('opcao') ?? 1);
    const painel = montado.paineis[n - 1];
    if (!painel) throw new ErroDaSobra(`o esboço tem ${montado.paineis.length} opções`);
    const r = sobraEntrePartes(facesDoNeutro(painel.neutro, painel.partes), painel.partes, pares, { vistas, toleranciaMm, largura });
    const pasta = valor('saida') ? resolve(valor('saida')) : null;
    if (pasta) mkdirSync(pasta, { recursive: true });
    const linhas = r.map((x) => {
      let png = '';
      if (pasta) { png = join(pasta, `${x.vista}-${x.contida}-em-${x.continente}.png`); writeFileSync(png, paraPng(desenharSobra(x))); }
      return `${x.vista}: ${x.contida} em ${x.continente}, sobra máxima ${x.maxMm.toFixed(1)} mm, área ${Math.round(x.areaMm2)} mm² (${x.mmPorPx.toFixed(2)} mm por px): ${x.sobra ? 'sobra' : 'dentro'}${png ? `  ${png}` : ''}`;
    });
    const passam = r.filter((x) => x.sobra).length;
    return { codigo: passam ? 1 : 0, stdout: `${linhas.join('\n')}\n${passam ? `${passam} de ${r.length} passam` : `nenhum dos ${r.length} passa`} da tolerância de ${toleranciaMm} mm\n`, stderr: '' };
  } catch (erro) {
    if (erro instanceof ErroDaSobra || erro?.code === 'ENOENT' || erro?.code === 'ERR_MODULE_NOT_FOUND' || erro instanceof SyntaxError) return { codigo: 2, stdout: '', stderr: `sobra:partes: ${erro.message}\n` };
    throw erro;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const r = await executar(process.argv.slice(2));
  process.stdout.write(r.stdout); process.stderr.write(r.stderr); process.exitCode = r.codigo;
}
