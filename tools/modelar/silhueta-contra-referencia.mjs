#!/usr/bin/env node
/* silhueta-contra-referencia.mjs — o desvio da silhueta de uma peça contra um contorno de referência, em milímetro, por trecho.
 *
 * FICHA silhuetaContraReferencia
 * serve: dizer, em milímetro e por trecho, onde a silhueta do modelo passa para fora ou fica para dentro de um contorno de referência, com o
 *   pico e a posição de cada desvio, e uma imagem de sobreposição (`npm run silhueta:desvio`).
 * quando: depois de a peça ter forma, antes de pedir a aprovação da forma: a referência (a prancha ou o contorno da imagem, já em mm e nos eixos
 *   do modelo) deixa de ser conferida a olho. Mede forma; quem aprova é a pessoa.
 * unidades: a referência entra em milímetro, nos eixos do modelo; a saída é em milímetro.
 * campos:
 *   plano: os dois eixos do modelo em que a silhueta é projetada (`xy`, `xz` ou `yz`); o primeiro é a abscissa.
 *   passo: o espaçamento das amostras ao longo de cada trecho, em mm (1).
 *   tolerancia: o módulo do desvio acima do qual o subtrecho é relatado, em mm (1).
 * exemplo:
 *   node tools/modelar/silhueta-contra-referencia.mjs <peça> --referencia=<contorno.json> --plano=xz
 * FIM DA FICHA
 *
 * A REFERÊNCIA é um JSON com `escala: "mm"`, `alinhamento` (dois pontos `[a, b]` da referência que, nos eixos do modelo, caem sobre o contorno da
 * silhueta; o comando mede a que distância caem e recusa acima de `--alinhamento-max`) e os trechos: ou em `trechos: { nome: [[a, b], ...] }`, ou
 * como chaves do próprio objeto cujo valor é uma lista de pares (as demais, como `origem`, são ignoradas). Referência sem escala e sem os dois
 * pontos é recusada, porque o desvio de uma referência mal alinhada engana.
 *
 * COMO MEDE. A malha de todas as partes (ou das de `--partes`) é projetada no plano e a silhueta é a união 2D dos triângulos projetados, feita pela
 * `CrossSection` da Manifold (o mesmo motor das booleanas do núcleo); buracos menores que 0,01 mm² (resto de arredondamento entre triângulos
 * vizinhos) são descartados. Cada trecho é amostrado a cada `--passo` mm, e em cada amostra o desvio é a distância ao contorno da silhueta, positiva
 * quando a amostra está dentro dela (o modelo sobra ali) e negativa quando está fora (falta modelo). */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { adaptarThree } from '../../src/autoria/adaptar-three.js';
import { manifoldCarregada, erroDaCargaDaManifold } from '../../procedural/nucleo/manifold.js';
import { lerArgumentos } from './argumentos.mjs';
import { ErroDeEntrada, avisoDeCache, lerEntradaDeMedida, opcaoDaLinha } from './entrada-de-medida.mjs';

const EIXOS = { x: 0, y: 1, z: 2 };
const PLANOS = ['xy', 'xz', 'yz'];
const AREA_MINIMA_DO_BURACO = 0.01;

export class ErroDeReferencia extends Error {
  constructor(mensagem) { super(mensagem); this.name = 'ErroDeReferencia'; }
}

const ehPar = (p) => Array.isArray(p) && p.length === 2 && p.every((v) => Number.isFinite(v));
const ehLista = (v) => Array.isArray(v) && v.length > 0 && v.every(ehPar);

/** Lê e valida a referência: `{ trechos: { nome: [[a,b],...] }, alinhamento: [[a,b],[a,b]] }`; recusa o que não declara escala e alinhamento. */
export function lerReferencia(dado, nomeDoArquivo = 'a referência') {
  const exemplo = '{ "escala": "mm", "alinhamento": [[a, b], [a, b]], "trechos": { "nome": [[a, b], ...] } }';
  if (!dado || typeof dado !== 'object' || Array.isArray(dado)) throw new ErroDeReferencia(`${nomeDoArquivo} não é um objeto JSON. Esperado: ${exemplo}.`);
  if (dado.escala !== 'mm') {
    throw new ErroDeReferencia(`${nomeDoArquivo} não declara a escala (recebi escala ${JSON.stringify(dado.escala ?? null)}). Esperado: "escala": "mm", com as coordenadas em milímetro e nos eixos do modelo. Conserte acrescentando "escala": "mm" ao arquivo, depois de conferir que as coordenadas estão em mm.`);
  }
  const al = dado.alinhamento;
  if (!Array.isArray(al) || al.length !== 2 || !al.every(ehPar)) {
    throw new ErroDeReferencia(`${nomeDoArquivo} não declara os dois pontos de alinhamento (recebi ${JSON.stringify(al ?? null)}). Esperado: "alinhamento": [[a, b], [a, b]], dois pontos da referência que, nos eixos do modelo, caem sobre o contorno da silhueta (a ponta e a base de um trecho, por exemplo). Conserte acrescentando o campo.`);
  }
  const fonte = dado.trechos !== undefined ? dado.trechos : dado;
  if (!fonte || typeof fonte !== 'object' || Array.isArray(fonte)) throw new ErroDeReferencia(`${nomeDoArquivo}: "trechos" deve ser um objeto { nome: [[a, b], ...] }. Esperado: ${exemplo}.`);
  const trechos = {};
  for (const nome of Object.keys(fonte)) {
    if (dado.trechos === undefined && nome === 'alinhamento') continue;
    const v = fonte[nome];
    if (dado.trechos !== undefined && !(Array.isArray(v))) throw new ErroDeReferencia(`${nomeDoArquivo}: o trecho '${nome}' não é uma lista de pares [a, b].`);
    if (!Array.isArray(v)) continue;
    if (!ehLista(v)) { if (dado.trechos !== undefined) throw new ErroDeReferencia(`${nomeDoArquivo}: o trecho '${nome}' tem item que não é um par [a, b] de números.`); continue; }
    if (v.length < 2) throw new ErroDeReferencia(`${nomeDoArquivo}: o trecho '${nome}' tem um ponto só; um trecho precisa de dois ou mais.`);
    trechos[nome] = v;
  }
  if (!Object.keys(trechos).length) throw new ErroDeReferencia(`${nomeDoArquivo} não tem trecho nenhum. Esperado: ${exemplo}.`);
  return { trechos, alinhamento: al };
}

/** Os triângulos do neutro executado, em mm, com a parte: `[{ p: [[x,y,z]*3], parte }]`. */
export function triangulosDoNeutro(neutro) {
  const { raiz } = adaptarThree(neutro);
  const tris = [];
  raiz.traverse((o) => {
    if (!o.isMesh) return;
    const parte = o.userData?.identidadeParte ?? o.name;
    const pos = o.geometry.attributes.position;
    for (let k = 0; k + 2 < pos.count; k += 3) tris.push({ p: [0, 1, 2].map((j) => [pos.getX(k + j) * 1000, pos.getY(k + j) * 1000, pos.getZ(k + j) * 1000]), parte });
  });
  return tris;
}

const areaDoAnel = (a) => { let s = 0; for (let i = 0; i < a.length; i++) { const p = a[i]; const q = a[(i + 1) % a.length]; s += p[0] * q[1] - q[0] * p[1]; } return s / 2; };

/**
 * A silhueta exata da projeção: os anéis (`[[a,b],...]`, fechados implicitamente) da união 2D dos triângulos no plano (`xy`, `xz` ou `yz`).
 * `partes` (lista de nomes) restringe a malha; vazia ou nula usa todas.
 */
export function silhuetaDeTriangulos(tris, plano, partes = null) {
  if (!PLANOS.includes(plano)) throw new Error(`--plano espera um de ${PLANOS.join(', ')}, e veio '${plano}'`);
  const wasm = manifoldCarregada();
  if (!wasm) throw new Error(`a Manifold não carregou (${erroDaCargaDaManifold()?.message ?? 'motivo desconhecido'}); sem ela a silhueta não se calcula`);
  const [ia, ib] = [EIXOS[plano[0]], EIXOS[plano[1]]];
  const escolhidas = partes?.length ? tris.filter((t) => partes.includes(t.parte)) : tris;
  const r = (v) => Math.round(v * 1e6) / 1e6;
  const pecas = [];
  for (const t of escolhidas) {
    const q = t.p.map((v) => [r(v[ia]), r(v[ib])]);
    const area = areaDoAnel(q);
    if (Math.abs(area) < 1e-9) continue;
    pecas.push(new wasm.CrossSection([area > 0 ? q : [q[0], q[2], q[1]]], 'Positive'));
  }
  if (!pecas.length) throw new Error('a malha escolhida não tem triângulo com área no plano pedido');
  const uniao = wasm.CrossSection.union(pecas);
  const aneis = uniao.toPolygons().filter((a) => a.length >= 3 && !(areaDoAnel(a) < 0 && Math.abs(areaDoAnel(a)) < AREA_MINIMA_DO_BURACO));
  for (const p of pecas) p.delete?.();
  uniao.delete?.();
  return aneis.map((a) => a.map((p) => [p[0], p[1]]));
}

/** A distância do ponto ao segmento e o sinal do lado: pontos como `[a, b]`. */
function distanciaAoSegmento(p, s, t) {
  const dx = t[0] - s[0]; const dy = t[1] - s[1];
  const c = dx * dx + dy * dy;
  let u = c ? ((p[0] - s[0]) * dx + (p[1] - s[1]) * dy) / c : 0;
  u = Math.max(0, Math.min(1, u));
  return Math.hypot(p[0] - (s[0] + u * dx), p[1] - (s[1] + u * dy));
}

/** Um medidor `(ponto) -> desvio com sinal` sobre os anéis da silhueta: positivo dentro (o modelo sobra), negativo fora. */
export function medidorDeDesvio(aneis) {
  const segs = [];
  for (const a of aneis) for (let i = 0; i < a.length; i++) segs.push([a[i], a[(i + 1) % a.length]]);
  const dentro = (p) => {
    let c = false;
    for (const [s, t] of segs) if ((s[1] > p[1]) !== (t[1] > p[1]) && p[0] < ((t[0] - s[0]) * (p[1] - s[1])) / (t[1] - s[1]) + s[0]) c = !c;
    return c;
  };
  return (p) => {
    let d = Infinity;
    for (const [s, t] of segs) { const x = distanciaAoSegmento(p, s, t); if (x < d) d = x; }
    return dentro(p) ? d : -d;
  };
}

/** As amostras de uma polilinha a cada `passo` mm de comprimento, com o fim incluído: `[{ s, p }]`. */
export function amostrarTrecho(pontos, passo) {
  const amostras = [];
  let acumulado = 0;
  let proximo = 0;
  for (let i = 0; i + 1 < pontos.length; i++) {
    const s = pontos[i]; const t = pontos[i + 1];
    const len = Math.hypot(t[0] - s[0], t[1] - s[1]);
    while (proximo <= acumulado + len + 1e-9) {
      const u = len ? (proximo - acumulado) / len : 0;
      amostras.push({ s: proximo, p: [s[0] + Math.min(1, Math.max(0, u)) * (t[0] - s[0]), s[1] + Math.min(1, Math.max(0, u)) * (t[1] - s[1])] });
      proximo += passo;
    }
    acumulado += len;
  }
  const fim = pontos[pontos.length - 1];
  if (!amostras.length || acumulado - amostras[amostras.length - 1].s > 1e-6) amostras.push({ s: acumulado, p: [fim[0], fim[1]] });
  return amostras;
}

const arred = (v, n = 3) => Math.round(v * 10 ** n) / 10 ** n;
const par = (p) => [arred(p[0], 2), arred(p[1], 2)];

/** O desvio de cada trecho: máximos para fora e para dentro, média do módulo, p90 e os subtrechos acima da tolerância. */
export function desvioPorTrecho(aneis, trechos, { passo = 1, tolerancia = 1 } = {}) {
  const medir = medidorDeDesvio(aneis);
  const saida = [];
  for (const [nome, pontos] of Object.entries(trechos)) {
    const amostras = amostrarTrecho(pontos, passo).map((a) => ({ ...a, d: medir(a.p) }));
    let fora = null; let dentro = null; let soma = 0;
    for (const a of amostras) {
      soma += Math.abs(a.d);
      if (a.d > 0 && (!fora || a.d > fora.d)) fora = a;
      if (a.d < 0 && (!dentro || a.d < dentro.d)) dentro = a;
    }
    const modulos = amostras.map((a) => Math.abs(a.d)).sort((x, y) => x - y);
    const p90 = modulos[Math.min(modulos.length - 1, Math.ceil(0.9 * modulos.length) - 1)];
    const subtrechos = [];
    let atual = null;
    for (const a of amostras) {
      const sinal = a.d > 0 ? 1 : -1;
      if (Math.abs(a.d) > tolerancia && (!atual || atual.sinal === sinal)) {
        if (!atual) atual = { sinal, ini: a, fim: a, pico: a, amostras: [] };
        atual.fim = a; atual.amostras.push(a);
        if (Math.abs(a.d) > Math.abs(atual.pico.d)) atual.pico = a;
      } else {
        if (atual) { subtrechos.push(atual); atual = null; }
        if (Math.abs(a.d) > tolerancia) atual = { sinal, ini: a, fim: a, pico: a, amostras: [a] };
      }
    }
    if (atual) subtrechos.push(atual);
    saida.push({
      trecho: nome,
      comprimentoMm: arred(amostras[amostras.length - 1].s, 2),
      amostras: amostras.length,
      maximoParaFora: fora ? { mm: arred(fora.d), em: par(fora.p) } : null,
      maximoParaDentro: dentro ? { mm: arred(-dentro.d), em: par(dentro.p) } : null,
      mediaDoModuloMm: arred(soma / amostras.length),
      p90Mm: arred(p90),
      maximoDoModuloMm: arred(modulos[modulos.length - 1]),
      acimaDaTolerancia: subtrechos.map((s) => ({
        inicio: par(s.ini.p), fim: par(s.fim.p), de: arred(s.ini.s, 2), ate: arred(s.fim.s, 2),
        sinal: s.sinal > 0 ? 'fora' : 'dentro', picoMm: arred(Math.abs(s.pico.d)), picoEm: par(s.pico.p),
        pontos: s.amostras.map((a) => par(a.p)),
      })),
    });
  }
  return saida;
}

/** A distância (mm, sem sinal) de cada ponto de alinhamento ao contorno da silhueta. */
export function distanciasDoAlinhamento(aneis, alinhamento) {
  const medir = medidorDeDesvio(aneis);
  return alinhamento.map((p) => ({ ponto: par(p), distanciaMm: arred(Math.abs(medir(p))) }));
}

const f2 = (v) => v.toFixed(2);
const p2 = (p) => `[${f2(p[0])}; ${f2(p[1])}]`;

function passoNice(extensao) {
  const bruto = extensao / 8;
  const base = 10 ** Math.floor(Math.log10(bruto));
  for (const m of [1, 2, 5, 10]) if (m * base >= bruto) return m * base;
  return 10 * base;
}

const escapar = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** A imagem de sobreposição em SVG: silhueta cinza, referência preta, subtrechos fora da tolerância em vermelho (fora) e azul (dentro). */
export function sobreposicaoEmSvg({ aneis, trechos, resultado, plano, tolerancia }) {
  const todos = [...aneis.flat(), ...Object.values(trechos).flat()];
  const min = [Math.min(...todos.map((p) => p[0])), Math.min(...todos.map((p) => p[1]))];
  const max = [Math.max(...todos.map((p) => p[0])), Math.max(...todos.map((p) => p[1]))];
  const margem = 40;
  const largura = 1100;
  const k = (largura - 2 * margem) / Math.max(1e-9, max[0] - min[0]);
  const altura = Math.round((max[1] - min[1]) * k + 2 * margem + 20);
  const X = (a) => arred(margem + (a - min[0]) * k, 2);
  const Y = (b) => arred(altura - margem - 10 - (b - min[1]) * k, 2);
  const anel = (a) => `M${a.map((p) => `${X(p[0])},${Y(p[1])}`).join('L')}Z`;
  const linha = (ps) => ps.map((p) => `${X(p[0])},${Y(p[1])}`).join(' ');
  const o = [];
  o.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${largura}" height="${altura}" viewBox="0 0 ${largura} ${altura}" font-family="sans-serif" font-size="11">`);
  o.push(`<rect width="${largura}" height="${altura}" fill="#fff"/>`);
  o.push(`<path d="${aneis.map(anel).join(' ')}" fill="#d9d9d9" fill-rule="evenodd" stroke="#9a9a9a" stroke-width="0.5"/>`);
  const passo = passoNice(max[0] - min[0]);
  const eixoY = altura - margem + 2;
  for (let v = Math.ceil(min[0] / passo) * passo; v <= max[0] + 1e-9; v += passo) {
    o.push(`<line x1="${X(v)}" y1="${eixoY - 4}" x2="${X(v)}" y2="${eixoY + 2}" stroke="#444"/><text x="${X(v)}" y="${eixoY + 14}" text-anchor="middle" fill="#444">${arred(v, 3)}</text>`);
  }
  o.push(`<line x1="${X(min[0])}" y1="${eixoY - 1}" x2="${X(max[0])}" y2="${eixoY - 1}" stroke="#444"/>`);
  o.push(`<text x="${largura - margem}" y="16" text-anchor="end" fill="#444">eixo ${plano[0]} (horizontal) e ${plano[1]} (vertical), em mm; tolerância ${tolerancia} mm; vermelho: modelo para fora, azul: modelo para dentro</text>`);
  for (const [nome, pontos] of Object.entries(trechos)) {
    o.push(`<polyline points="${linha(pontos)}" fill="none" stroke="#000" stroke-width="1.2"/>`);
    const m = pontos[Math.floor(pontos.length / 2)];
    o.push(`<text x="${X(m[0]) + 4}" y="${Y(m[1]) - 6}" fill="#000">${escapar(nome)}</text>`);
  }
  for (const r of resultado) for (const s of r.acimaDaTolerancia) {
    const cor = s.sinal === 'fora' ? '#d62728' : '#1f4fd6';
    o.push(`<polyline points="${linha(s.pontos)}" fill="none" stroke="${cor}" stroke-width="3.5" stroke-linecap="round"/>`);
  }
  o.push('</svg>');
  return `${o.join('\n')}\n`;
}

/** O pior trecho: o de maior módulo máximo (empate vai para o primeiro). */
export function piorTrecho(resultado) {
  let pior = null;
  for (const r of resultado) if (!pior || r.maximoDoModuloMm > pior.maximoDoModuloMm) pior = r;
  return pior;
}

export function formatarRelatorio({ nome, plano, passo, tolerancia, alinhamento, resultado }) {
  const l = [];
  l.push(`${nome}: silhueta no plano ${plano} contra a referência, passo ${passo} mm, tolerância ${tolerancia} mm (positivo: o modelo passa para fora da referência; negativo: fica para dentro)`);
  l.push(`alinhamento: ${alinhamento.map((a) => `${p2(a.ponto)} a ${f2(a.distanciaMm)} mm do contorno`).join('; ')}`);
  for (const r of resultado) {
    l.push(`trecho ${r.trecho} (${f2(r.comprimentoMm)} mm, ${r.amostras} amostras): para fora ${r.maximoParaFora ? `${f2(r.maximoParaFora.mm)} mm em ${p2(r.maximoParaFora.em)}` : 'nenhum'}; para dentro ${r.maximoParaDentro ? `${f2(r.maximoParaDentro.mm)} mm em ${p2(r.maximoParaDentro.em)}` : 'nenhum'}; média do módulo ${f2(r.mediaDoModuloMm)} mm; p90 ${f2(r.p90Mm)} mm`);
    if (!r.acimaDaTolerancia.length) l.push(`  nenhum subtrecho acima de ${tolerancia} mm`);
    for (const s of r.acimaDaTolerancia) l.push(`  acima de ${tolerancia} mm: ${p2(s.inicio)} a ${p2(s.fim)} (${f2(s.de)} a ${f2(s.ate)} mm no trecho), ${s.sinal}, pico ${f2(s.picoMm)} mm em ${p2(s.picoEm)}`);
  }
  const pior = piorTrecho(resultado);
  l.push(`pior trecho: ${pior.trecho}, desvio máximo ${f2(pior.maximoDoModuloMm)} mm`);
  return l.join('\n');
}

/** O cálculo inteiro sobre os triângulos já lidos (sem arquivo nenhum). */
export function medirSilhueta({ tris, referencia, plano, partes = null, passo = 1, tolerancia = 1, alinhamentoMax = 5 }) {
  const aneis = silhuetaDeTriangulos(tris, plano, partes);
  const alinhamento = distanciasDoAlinhamento(aneis, referencia.alinhamento);
  const longe = alinhamento.find((a) => a.distanciaMm > alinhamentoMax);
  if (longe) {
    throw new ErroDeReferencia(`o ponto de alinhamento ${p2(longe.ponto)} cai a ${f2(longe.distanciaMm)} mm do contorno da silhueta no plano ${plano} (o limite é ${alinhamentoMax} mm, --alinhamento-max). Esperado: dois pontos da referência que coincidam com o modelo. Conferir se o plano é o certo (--plano), se a referência está nos eixos do modelo, ou corrigir o campo "alinhamento".`);
  }
  const resultado = desvioPorTrecho(aneis, referencia.trechos, { passo, tolerancia });
  return { aneis, alinhamento, resultado };
}

const AJUDA = `node tools/modelar/silhueta-contra-referencia.mjs <receita | esboço> --referencia=<arquivo.json> --plano=<xy|xz|yz> [opções]
npm run silhueta:desvio -- <peça> --referencia=<arquivo.json> --plano=<xy|xz|yz>

Mede, em milímetro e por trecho, o desvio da silhueta da peça contra um contorno de referência. A silhueta é a união dos triângulos projetados no
plano (o primeiro eixo é a abscissa); o desvio é a distância com sinal ao contorno, positiva onde o modelo passa para fora da referência.

  --referencia=<arquivo>     JSON em mm, nos eixos do modelo, com "escala": "mm", "alinhamento": [[a,b],[a,b]] e os trechos
                             ("trechos": { nome: [[a,b],...] }, ou chaves de lista de pares no próprio objeto); sem escala e sem alinhamento é recusado
  --plano=<xy|xz|yz>         os eixos do modelo em que a silhueta é projetada
  --partes=a,b               só estas partes entram na silhueta (padrão: todas)
  --passo=<mm>               espaçamento das amostras ao longo de cada trecho (1)
  --tolerancia=<mm>          módulo acima do qual o subtrecho é relatado (1)
  --alinhamento-max=<mm>     distância máxima dos pontos de alinhamento ao contorno (5)
  --imagem=<arquivo.svg>     grava a sobreposição: silhueta cinza, referência preta, fora em vermelho, dentro em azul
  --opcao=<n>                a opção de um esboço (padrão 1)
  --json                     saída em JSON
  --sem-cache                monta a peça de novo
  --ajuda                    esta mensagem

Código de saída: 0 mediu, 2 uso errado ou referência recusada. Mede forma; quem aprova é a pessoa.
`;

function uso(mensagem) {
  process.stderr.write(`silhueta:desvio: ${mensagem}\nuso: node tools/modelar/silhueta-contra-referencia.mjs <peça> --referencia=<arquivo.json> --plano=<xy|xz|yz> [--partes=a,b] [--passo=1] [--tolerancia=1] [--imagem=<arquivo.svg>] [--json] (--ajuda para tudo)\n`);
  return 2;
}

const numero = (texto, nome, padrao) => {
  if (texto === null) return padrao;
  const n = Number(texto);
  if (!(n > 0) || !Number.isFinite(n)) throw new Error(`--${nome} precisa ser um número positivo, e veio '${texto}'.`);
  return n;
};

export async function comoCLI(argv) {
  if (argv.includes('--ajuda')) { process.stdout.write(AJUDA); return 0; }
  let lido;
  try {
    lido = lerArgumentos(argv, {
      opcoes: ['referencia', 'plano', 'partes', 'passo', 'tolerancia', 'alinhamento-max', 'imagem', 'opcao'],
      bandeiras: ['json', 'sem-cache'],
      posicional: { nome: 'a peça', obrigatorio: true },
    });
  } catch (erro) { return uso(erro.message); }
  const plano = lido.opcao('plano');
  if (!PLANOS.includes(plano)) return uso(`--plano espera um de ${PLANOS.join(', ')}, e veio '${plano ?? ''}'.`);
  const caminhoRef = lido.opcao('referencia');
  if (!caminhoRef) return uso('falta --referencia=<arquivo.json>.');
  let passo; let tolerancia; let alinhamentoMax;
  try {
    passo = numero(lido.opcao('passo'), 'passo', 1);
    tolerancia = numero(lido.opcao('tolerancia'), 'tolerancia', 1);
    alinhamentoMax = numero(lido.opcao('alinhamento-max'), 'alinhamento-max', 5);
  } catch (erro) { return uso(erro.message); }
  let referencia;
  try {
    referencia = lerReferencia(JSON.parse(readFileSync(resolve(caminhoRef), 'utf8')), caminhoRef);
  } catch (erro) {
    if (erro instanceof ErroDeReferencia || erro.code === 'ENOENT' || erro instanceof SyntaxError) return uso(erro instanceof SyntaxError ? `${caminhoRef} não é JSON válido (${erro.message}).` : erro.code === 'ENOENT' ? `${caminhoRef} não existe.` : erro.message);
    throw erro;
  }
  let entrada;
  try {
    entrada = await lerEntradaDeMedida(lido.posicional, { opcao: opcaoDaLinha(lido.opcao('opcao')), montagem: false, cache: !lido.bandeira('sem-cache') });
  } catch (erro) {
    if (erro instanceof ErroDeEntrada) return uso(erro.message);
    throw erro;
  }
  process.stderr.write(avisoDeCache(entrada, 'silhueta:desvio'));
  const partes = lido.opcao('partes') ? lido.opcao('partes').split(',').map((s) => s.trim()).filter(Boolean) : null;
  const tris = triangulosDoNeutro(entrada.executar().neutro);
  if (partes) {
    const existentes = [...new Set(tris.map((t) => t.parte))];
    const faltam = partes.filter((p) => !existentes.includes(p));
    if (faltam.length) return uso(`--partes cita ${faltam.map((p) => `'${p}'`).join(', ')}, que a peça não tem. Partes da peça: ${existentes.join(', ')}.`);
  }
  let medida;
  try {
    medida = medirSilhueta({ tris, referencia, plano, partes, passo, tolerancia, alinhamentoMax });
  } catch (erro) {
    if (erro instanceof ErroDeReferencia) return uso(erro.message);
    throw erro;
  }
  const { aneis, alinhamento, resultado } = medida;
  const imagem = lido.opcao('imagem');
  if (imagem) {
    mkdirSync(dirname(resolve(imagem)), { recursive: true });
    writeFileSync(resolve(imagem), sobreposicaoEmSvg({ aneis, trechos: referencia.trechos, resultado, plano, tolerancia }));
  }
  const pior = piorTrecho(resultado);
  if (lido.bandeira('json')) {
    const limpo = resultado.map((r) => ({ ...r, acimaDaTolerancia: r.acimaDaTolerancia.map(({ pontos, ...s }) => s) }));
    process.stdout.write(`${JSON.stringify({ peca: lido.posicional, plano, partes: partes ?? 'todas', passoMm: passo, toleranciaMm: tolerancia, alinhamento, trechos: limpo, piorTrecho: { trecho: pior.trecho, maximoDoModuloMm: pior.maximoDoModuloMm }, ...(imagem ? { imagem } : {}) }, null, 2)}\n`);
  } else {
    process.stdout.write(`${formatarRelatorio({ nome: lido.posicional, plano, passo, tolerancia, alinhamento, resultado })}\n`);
    if (imagem) process.stdout.write(`imagem: ${imagem}\n`);
  }
  return 0;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  process.exitCode = await comoCLI(process.argv.slice(2));
}
