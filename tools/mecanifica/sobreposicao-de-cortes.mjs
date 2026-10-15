#!/usr/bin/env node
/* sobreposicao-de-cortes.mjs — os cortes planos do modelo sobre os do sólido do esboço que a receita refina, numa imagem por eixo.
 *
 * POR QUE ELE EXISTE. O crítico leu um degrau na junta do capô e a deriva mais grossa do que é, as duas vezes olhando a peça pequena
 * demais na vista montada, e as duas vezes o que o desfez foi medir e montar à mão uma sobreposição dos cortes do modelo com os do
 * sólido do esboço. A razão de volume de `forma:esboco` diz quanto a parte difere da forma, e não onde: aqui o lugar aparece, em
 * milímetro, na mesma escala.
 *
 * O QUE ELE FAZ. Lê o `REFINA.esboco` da receita e liga cada parte às formas do esboço, como a conferência de forma. O sólido de cada
 * forma vem de `src/autoria/solido-do-esboco.js` (o recorte aplicado, a malha da família), a malha do modelo vem da execução da receita,
 * e as duas são cortadas por planos perpendiculares a cada eixo, em `FRACOES_DOS_CORTES` da caixa do modelo (um quarto, a metade e três
 * quartos). Cada corte é desenhado de frente, visto do lado positivo do eixo, como as vistas direita, superior e frontal: o esboço em
 * vermelho grosso e o modelo em azul fino por cima, com a escala escrita em cada painel e uma barra de comprimento conhecido. Um
 * painel é recortado na caixa das duas linhas, e por isso cada um tem a escala dele.
 *
 * A MEDIDA. O desvio máximo entre as linhas de cada painel (a maior das distâncias de uma ponta de segmento de uma linha à outra, nas
 * duas direções, a de Hausdorff) sai no relatório de quem conduz o laço e não na imagem, que é o que o crítico recebe.
 *
 * O QUE ELE NÃO DIZ. Corte que não passa pela região onde as duas diferem não mostra a diferença, e três cortes por eixo são uma
 * amostra. Uma forma do esboço sem sólido (a faixa que contorna círculos) fica de fora e vai nas notas, no relatório e no pedido.
 *
 * Uso: node tools/mecanifica/sobreposicao-de-cortes.mjs <peça> [--saida=<pasta>] */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { lerArgumentos } from './argumentos.mjs';
import { descreverPecaReutilizavel } from './descrever-peca.mjs';
import { esbocoDeclarado } from './forma-do-esboco.mjs';
import { formasDoEsboco, malhaDaFormaDeFamilia } from './esboco-solido.mjs';
import { lerPlano } from '../../modulos/esboco/src/plano.js';
import { ErroDoSolido, criarContextoDeSolidos, criarSolidosDoEsboco, triangularPoligonos } from '../../src/autoria/solido-do-esboco.js';

export const FRACOES_DOS_CORTES = Object.freeze([0.25, 0.5, 0.75]);
export const EIXOS_DOS_CORTES = Object.freeze(['x', 'y', 'z']);

/* A vista de frente de cada corte, do lado positivo do eixo, com os eixos do plano na tela como a vista de mesmo nome os põe: `h` é o
   eixo que cresce para a direita da imagem e `v` o que cresce para cima, cada um como [índice do eixo, sinal]. A direita olha de +x e
   põe -z à direita, a superior olha de +y e põe -z em cima, e a frontal olha de +z. */
export const VISTA_DO_CORTE = Object.freeze({
  x: Object.freeze({ vista: 'direita', olho: 'a direita', h: [2, -1], v: [1, 1] }),
  y: Object.freeze({ vista: 'superior', olho: 'cima', h: [0, 1], v: [2, -1] }),
  z: Object.freeze({ vista: 'frontal', olho: 'frente', h: [0, 1], v: [1, 1] }),
});

const MM_POR_METRO = 1000;
const COR_DO_ESBOCO = '#d41f1f';
const COR_DO_MODELO = '#1f4fe0';
const LARGURA_DO_ESBOCO = 4;
const LARGURA_DO_MODELO = 1.5;
/* a área de desenho de um painel, quando os três ficam em coluna e quando ficam em linha, em pixel */
const AREAS = Object.freeze({ coluna: { l: 1000, a: 390 }, linha: { l: 470, a: 880 } });
/* o título e a legenda de um painel ocupam até cinco linhas; o texto quebra na largura da área, que o `CARACTERE_PX` mede por baixo */
const ENTRELINHA = 17;
const ALTURA_DO_TITULO = 5 * ENTRELINHA + 14;
const CARACTERE_PX = 8.2;
const MARGEM = 14;
const FOLGA_DO_QUADRO = 0.04;

const virgula = (numero, casas = 2) => numero.toFixed(casas).replace('.', ',');
const arredondar = (numero) => Math.round(numero * 10) / 10;

/* ---------- a malha: faces em triângulos, em milímetro ---------- */

/** As faces das `partes` (nomes) de uma peça executada (`neutro`, em metro) como triângulos de pontos [x, y, z] em milímetro. */
export function triangulosDasPartes(neutro, partes) {
  const nomes = new Set(partes);
  const indice = new Map();
  const vertices = [];
  const poligonos = [];
  for (const face of neutro.F.values()) {
    if (!nomes.has(face.parte)) continue;
    poligonos.push(face.vs.map((id) => {
      if (!indice.has(id)) {
        const p = neutro.V.get(id);
        if (!p) throw new ErroDoSolido(`a face ${face.id} da parte '${face.parte}' cita o vértice ${id}, que a peça não tem`, 'malha-invalida');
        indice.set(id, vertices.length);
        vertices.push(p.map((c) => c * MM_POR_METRO));
      }
      return indice.get(id);
    }));
  }
  return triangularPoligonos(vertices, poligonos).map((t) => t.map((i) => vertices[i]));
}

/** A caixa { min, max } de uma lista de triângulos, ou null sem nenhum. */
export function caixaDosTriangulos(triangulos) {
  if (!triangulos.length) return null;
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const t of triangulos) for (const p of t) for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], p[k]); max[k] = Math.max(max[k], p[k]); }
  return { min, max };
}

/* ---------- o corte ---------- */

/** O plano `eixo` = `valor` (mm) cortando os triângulos, como segmentos [h1, v1, h2, v2] no quadro da vista de frente (`VISTA_DO_CORTE`).
 *  Um vértice sobre o plano conta do lado de cima, para a classificação ser a mesma nas duas faces que o dividem e a linha não abrir. */
export function segmentosDoCorte(triangulos, eixo, valor) {
  const k = EIXOS_DOS_CORTES.indexOf(eixo);
  if (k < 0) throw new Error(`o eixo do corte é x, y ou z; recebi ${JSON.stringify(eixo)}`);
  const { h, v } = VISTA_DO_CORTE[eixo];
  const plano = (p) => [p[h[0]] * h[1], p[v[0]] * v[1]];
  const segmentos = [];
  for (const t of triangulos) {
    const cima = t.map((p) => p[k] >= valor);
    if (cima[0] === cima[1] && cima[1] === cima[2]) continue;
    const pontos = [];
    for (let i = 0; i < 3; i++) {
      const j = (i + 1) % 3;
      if (cima[i] === cima[j]) continue;
      const u = (valor - t[i][k]) / (t[j][k] - t[i][k]);
      pontos.push(plano(t[i].map((c, m) => c + u * (t[j][m] - c))));
    }
    if (pontos.length === 2) segmentos.push([...pontos[0], ...pontos[1]]);
  }
  return segmentos;
}

/** Os valores dos planos de corte em cada eixo: as `fracoes` do intervalo da caixa. */
export function valoresDosCortes(caixa, fracoes = FRACOES_DOS_CORTES) {
  return Object.fromEntries(EIXOS_DOS_CORTES.map((eixo, k) => [eixo, fracoes.map((f) => caixa.min[k] + f * (caixa.max[k] - caixa.min[k]))]));
}

/**
 * Os planos que não cruzam o modelo vão à mesma fração do material: o quantil dos centros dos triângulos naquele eixo, e dele o centro
 * mais perto ainda não usado. Peça de dois
 * lados, como os trens principais do avião, tem a caixa larga e o material só nas pontas, e os cortes em um quarto, na metade e em três
 * quartos da caixa saíram vazios. Devolve os valores e o que mudou, para o relatório dizer.
 */
export function planosComMaterial(valores, triangulos, fracoes = FRACOES_DOS_CORTES) {
  const mudancas = [];
  const novos = Object.fromEntries(Object.entries(valores).map(([eixo, lista]) => {
    const k = EIXOS_DOS_CORTES.indexOf(eixo);
    /* só o triângulo que atravessa o eixo: o centro de uma face rente ao plano daria um corte sobre a própria face */
    const centros = triangulos
      .filter((t) => Math.max(t[0][k], t[1][k], t[2][k]) - Math.min(t[0][k], t[1][k], t[2][k]) > 1e-6)
      .map((t) => (t[0][k] + t[1][k] + t[2][k]) / 3);
    /* o plano movido não repete outro do mesmo eixo (a menos de 1 mm): dois painéis iguais não mostram nada a mais */
    const usados = lista.filter((valor) => segmentosDoCorte(triangulos, eixo, valor).length);
    const ordenados = [...centros].sort((a, b) => a - b);
    return [eixo, lista.map((valor, i) => {
      if (!centros.length || segmentosDoCorte(triangulos, eixo, valor).length) return valor;
      /* a mesma fração, agora do material: o quantil dos centros dos triângulos, e dele o centro livre mais perto */
      const fracao = fracoes[i] ?? 0.5;
      const alvo = ordenados[Math.min(ordenados.length - 1, Math.floor(fracao * ordenados.length))];
      const livres = centros.filter((c) => usados.every((u) => Math.abs(u - c) >= 1));
      if (!livres.length) return valor;
      const novo = livres.reduce((melhor, c) => (Math.abs(c - alvo) < Math.abs(melhor - alvo) ? c : melhor), livres[0]);
      usados.push(novo);
      mudancas.push({ eixo, de: valor, para: novo });
      return novo;
    })];
  }));
  return { valores: novos, mudancas };
}

function distanciaAoSegmento(px, py, [x1, y1, x2, y2]) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const comprimento2 = dx * dx + dy * dy;
  const t = comprimento2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / comprimento2));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

/* A maior distância de uma ponta de segmento de `de` ao segmento mais próximo de `para`. Com muitos segmentos olha uma ponta a cada
   `passo`, para o custo (quadrático) ficar abaixo de `LIMITE_DE_PARES`. */
const LIMITE_DE_PARES = 3e7;
function distanciaMaxima(de, para) {
  const passo = Math.max(1, Math.ceil((2 * de.length * para.length) / LIMITE_DE_PARES));
  let maior = 0;
  for (let i = 0; i < de.length; i += passo) {
    for (const ponta of [[de[i][0], de[i][1]], [de[i][2], de[i][3]]]) {
      let menor = Infinity;
      for (const s of para) menor = Math.min(menor, distanciaAoSegmento(ponta[0], ponta[1], s));
      maior = Math.max(maior, menor);
    }
  }
  return maior;
}

/** O desvio máximo entre as duas linhas, em mm: a maior das duas distâncias máximas (a de Hausdorff). Null quando uma delas é vazia. */
export function desvioMaximoEntre(a, b) {
  if (!a.length || !b.length) return null;
  return Math.max(distanciaMaxima(a, b), distanciaMaxima(b, a));
}

/** Um painel: o corte `eixo` = `valor` do sólido do esboço e do modelo, a caixa das duas linhas no quadro da vista e o desvio. */
export function painelDoCorte({ eixo, valor, triangulosDoEsboco, triangulosDoModelo }) {
  const esboco = segmentosDoCorte(triangulosDoEsboco, eixo, valor);
  const modelo = segmentosDoCorte(triangulosDoModelo, eixo, valor);
  const todos = [...esboco, ...modelo];
  const caixa = todos.length
    ? {
      h0: Math.min(...todos.map((s) => Math.min(s[0], s[2]))), v0: Math.min(...todos.map((s) => Math.min(s[1], s[3]))),
      h1: Math.max(...todos.map((s) => Math.max(s[0], s[2]))), v1: Math.max(...todos.map((s) => Math.max(s[1], s[3]))),
    }
    : null;
  return { eixo, valor, esboco, modelo, caixa, desvioMaximoMm: desvioMaximoEntre(esboco, modelo) };
}

/* ---------- o desenho ---------- */

/* O comprimento redondo (1, 2 ou 5 vezes uma potência de dez) mais perto, por baixo, de `alvo`. */
export function comprimentoRedondo(alvo) {
  if (!(alvo > 0)) return 1;
  const potencia = 10 ** Math.floor(Math.log10(alvo));
  return [5, 2, 1].map((m) => m * potencia).find((c) => c <= alvo) ?? potencia;
}

/* O que cada ponta de um eixo é no objeto, quando `plano.orientacao` do esboço diz para onde fica a frente. */
function nomeDaPonta(indice, sinal, orientacao) {
  const ponta = `${sinal > 0 ? '+' : '-'}${'xyz'[indice]}`;
  if (!orientacao) return ponta;
  const frente = orientacao.frente;
  const oposta = `${frente[0] === '+' ? '-' : '+'}${frente[1]}`;
  if (ponta === frente) return `${ponta} (${orientacao.nomeDaFrente.replace(/^(a|o)\s+/, '')})`;
  if (ponta === oposta) return `${ponta} (${orientacao.nomeDeTras.replace(/^(a|o)\s+/, '')})`;
  return ponta;
}

/* A escala de cada painel, em px/mm, para um quadro de `area`: a que cabe a caixa das linhas com a folga de cada lado. */
function escalaDoPainel(painel, area) {
  if (!painel.caixa) return null;
  const largura = Math.max(painel.caixa.h1 - painel.caixa.h0, 1e-6) * (1 + 2 * FOLGA_DO_QUADRO);
  const altura = Math.max(painel.caixa.v1 - painel.caixa.v0, 1e-6) * (1 + 2 * FOLGA_DO_QUADRO);
  return Math.min(area.l / largura, area.a / altura);
}

/* Em coluna ou em linha: a que dá a maior escala ao painel que sai menor. */
function disposicaoDosPaineis(paineis) {
  const menor = (area) => Math.min(...paineis.map((p) => escalaDoPainel(p, area)).filter((e) => e !== null), Infinity);
  return menor(AREAS.linha) > menor(AREAS.coluna) ? 'linha' : 'coluna';
}

const escapar = (texto) => texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** O texto em linhas de até `maximo` caracteres, quebrando entre as palavras (a palavra maior que o máximo fica inteira). */
export function quebrarTexto(texto, maximo) {
  const linhas = [];
  let atual = '';
  for (const palavra of texto.split(' ')) {
    if (atual && `${atual} ${palavra}`.length > maximo) { linhas.push(atual); atual = palavra; } else atual = atual ? `${atual} ${palavra}` : palavra;
  }
  if (atual) linhas.push(atual);
  return linhas;
}
const f1 = (n) => n.toFixed(1);

function caminho(segmentos, X, Y) {
  return segmentos.map((s) => `M${f1(X(s[0]))} ${f1(Y(s[1]))}L${f1(X(s[2]))} ${f1(Y(s[3]))}`).join('');
}

/**
 * O SVG de uma imagem com os painéis de um eixo (todos do mesmo `eixo`), cada um com o título, a legenda dos eixos, a escala e a barra.
 * Devolve { svg, largura, altura, disposicao, escalas } com a escala de cada painel em px/mm (null para o painel vazio).
 */
export function svgDosPaineis(paineis, { orientacao = null, area: areaPedida = null } = {}) {
  if (!paineis.length) throw new Error('svgDosPaineis: sem painéis para desenhar.');
  const eixo = paineis[0].eixo;
  const { vista, olho, h, v } = VISTA_DO_CORTE[eixo];
  const disposicao = disposicaoDosPaineis(paineis);
  const area = areaPedida ?? AREAS[disposicao];
  const celulaL = area.l + 2 * MARGEM;
  const celulaA = ALTURA_DO_TITULO + area.a + 2 * MARGEM;
  const largura = disposicao === 'linha' ? celulaL * paineis.length : celulaL;
  const altura = disposicao === 'linha' ? celulaA : celulaA * paineis.length;
  const direita = nomeDaPonta(h[0], h[1], orientacao);
  const cima = nomeDaPonta(v[0], v[1], orientacao);
  const escalas = [];
  const blocos = paineis.map((p, i) => {
    const ox = disposicao === 'linha' ? i * celulaL : 0;
    const oy = disposicao === 'linha' ? 0 : i * celulaA;
    const esc = escalaDoPainel(p, area);
    escalas.push(esc);
    const maximo = Math.floor(area.l / CARACTERE_PX);
    const titulo = quebrarTexto(`corte em ${eixo} = ${virgula(arredondar(p.valor), 1)} mm, visto de ${olho} (vista ${vista})`, maximo);
    const legenda = [
      ...quebrarTexto(`olha de +${eixo}; ${direita} à direita, ${cima} em cima`, maximo),
      ...quebrarTexto('vermelho grosso: esboço; azul fino: modelo', maximo),
      ...quebrarTexto(esc === null
        ? 'o plano não corta nem o esboço nem o modelo'
        : `escala ${virgula(esc)} px/mm${p.esboco.length ? '' : '; o plano não corta o esboço'}${p.modelo.length ? '' : '; o plano não corta o modelo'}`, maximo),
    ];
    const linhas = [
      ...titulo.map((t, k) => `<text x="${ox + MARGEM}" y="${oy + MARGEM + 12 + k * ENTRELINHA}" font-size="14" font-weight="bold">${escapar(t)}</text>`),
      ...legenda.map((t, k) => `<text x="${ox + MARGEM}" y="${oy + MARGEM + 12 + (titulo.length + k) * ENTRELINHA}" font-size="13">${escapar(t)}</text>`),
    ];
    if (esc !== null) {
      const { caixa } = p;
      const larguraDoQuadro = (caixa.h1 - caixa.h0) * esc;
      const alturaDoQuadro = (caixa.v1 - caixa.v0) * esc;
      const x0 = ox + MARGEM + (area.l - larguraDoQuadro) / 2;
      const y0 = oy + ALTURA_DO_TITULO + MARGEM + (area.a - alturaDoQuadro) / 2;
      const X = (hh) => x0 + (hh - caixa.h0) * esc;
      const Y = (vv) => y0 + (caixa.v1 - vv) * esc;
      linhas.push(
        `<rect x="${ox + MARGEM}" y="${oy + ALTURA_DO_TITULO + MARGEM}" width="${area.l}" height="${area.a}" fill="none" stroke="#c8c8c8" stroke-width="1"/>`,
        `<path d="${caminho(p.esboco, X, Y)}" fill="none" stroke="${COR_DO_ESBOCO}" stroke-width="${LARGURA_DO_ESBOCO}" stroke-linecap="round" stroke-linejoin="round"/>`,
        `<path d="${caminho(p.modelo, X, Y)}" fill="none" stroke="${COR_DO_MODELO}" stroke-width="${LARGURA_DO_MODELO}" stroke-linecap="round" stroke-linejoin="round"/>`,
      );
      /* a barra de comprimento conhecido, no canto de baixo do quadro, para a escala não depender de ler o número */
      const barra = comprimentoRedondo((area.l * 0.3) / esc);
      const bx = ox + MARGEM + 10;
      const by = oy + ALTURA_DO_TITULO + MARGEM + area.a - 12;
      linhas.push(
        `<path d="M${f1(bx)} ${f1(by)}L${f1(bx + barra * esc)} ${f1(by)}M${f1(bx)} ${f1(by - 4)}L${f1(bx)} ${f1(by + 4)}M${f1(bx + barra * esc)} ${f1(by - 4)}L${f1(bx + barra * esc)} ${f1(by + 4)}" stroke="#222" stroke-width="2" fill="none"/>`,
        `<text x="${f1(bx)}" y="${f1(by - 8)}" font-size="13">${barra} mm</text>`,
      );
    }
    return linhas.join('\n');
  });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${largura}" height="${altura}" viewBox="0 0 ${largura} ${altura}" font-family="DejaVu Sans, Arial, Helvetica, sans-serif">\n<rect width="${largura}" height="${altura}" fill="#ffffff"/>\n${blocos.join('\n')}\n</svg>`;
  return { svg, largura, altura, disposicao, escalas };
}

/** O SVG como PNG, rasterizado pelo Chromium do Playwright, como o esboço rasteriza o dele. `navegador` opcional. */
export async function rasterizarSvg(svg, largura, altura, destino, navegador = null) {
  const proprio = !navegador;
  if (proprio) navegador = await (await import('playwright')).default.chromium.launch();
  try {
    const pagina = await navegador.newPage({ viewport: { width: largura, height: altura } });
    await pagina.setContent(`<!doctype html><body style="margin:0;background:#fff">${svg}</body>`);
    const png = await pagina.screenshot({ type: 'png' });
    await pagina.close();
    writeFileSync(destino, png);
    return png;
  } finally {
    if (proprio) await navegador.close();
  }
}

/* ---------- a peça contra o esboço ---------- */

/** Os ids das formas do esboço que a receita liga (`esbocoDeclarado().ligadas`), sem repetir e em ordem. */
export function formasLigadas(ligadas) {
  return [...new Set(Object.values(ligadas).flatMap((v) => (Array.isArray(v) ? v : v.formas)))].sort();
}

/**
 * Os cortes do modelo sobre os do sólido do esboço de `peca`, uma imagem `sobreposicao-<eixo>.png` por eixo em `saida`. Devolve
 * `{ arquivos, paineis, notas, caixa }`, ou null quando a receita não declara `REFINA.esboco`. `dependencias` troca o que o teste
 * não quer pagar (`rasterizar`, `executar`).
 */
export async function sobreposicaoDeCortes({ peca, saida, fracoes = FRACOES_DOS_CORTES, dependencias = {} }) {
  const declarado = await esbocoDeclarado(peca);
  if (!declarado) return null;
  let bruto;
  try {
    bruto = JSON.parse(readFileSync(declarado.esboco, 'utf8'));
  } catch (erro) {
    throw new Error(`não foi possível ler o esboço ${declarado.esboco}: ${erro.message}`);
  }
  const execucao = await (dependencias.executar ?? ((p) => descreverPecaReutilizavel({ peca: p, semVeredito: true })))(peca);
  if (!execucao.ok) throw new Error(`a peça '${peca}' não executou:\n${execucao.stderr.trim()}`);
  const neutro = execucao.resultado.neutro;
  const notas = [];
  const partes = Object.keys(declarado.ligadas);
  const entregues = new Set([...neutro.F.values()].map((f) => f.parte).filter(Boolean));
  for (const parte of partes.filter((p) => !entregues.has(p))) notas.push(`a parte '${parte}' não existe na peça e ficou fora da sobreposição`);
  const triangulosDoModelo = triangulosDasPartes(neutro, partes.filter((p) => entregues.has(p)));
  const caixa = caixaDosTriangulos(triangulosDoModelo);
  if (!caixa) throw new Error(`a peça '${peca}' não tem face nas partes que o REFINA.esboco liga (${partes.join(', ')}); não há o que cortar.`);

  const dados = formasDoEsboco(bruto, declarado.opcao);
  const contexto = criarContextoDeSolidos({ origem: [0, 1, 2].map((k) => (caixa.min[k] + caixa.max[k]) / 2) });
  let triangulosDoEsboco = [];
  try {
    const solidos = criarSolidosDoEsboco(dados, { contexto, malhaDaFamilia: malhaDaFormaDeFamilia });
    for (const id of formasLigadas(declarado.ligadas)) {
      let malha;
      try {
        malha = contexto.malha(solidos.solido(id));
      } catch (erro) {
        if (!(erro instanceof ErroDoSolido)) throw erro;
        notas.push(`a forma '${id}' do esboço não tem sólido (${erro.message}) e ficou fora da sobreposição`);
        continue;
      }
      triangulosDoEsboco = triangulosDoEsboco.concat(malha.triangulos.map((t) => t.map((i) => malha.vertices[i])));
    }
  } finally {
    contexto.liberar();
  }
  if (!triangulosDoEsboco.length) throw new Error(`o esboço ${declarado.esboco} não deu sólido para nenhuma das formas que '${peca}' liga; não há o que sobrepor.`);

  const orientacao = lerPlano(bruto.plano)?.orientacao ?? null;
  const ajuste = planosComMaterial(valoresDosCortes(caixa, fracoes), triangulosDoModelo, fracoes);
  const valores = ajuste.valores;
  for (const { eixo, de, para } of ajuste.mudancas) notas.push(`o corte em ${eixo} = ${arredondar(de)} mm não cruzava o modelo e foi para ${eixo} = ${arredondar(para)} mm`);
  const rasterizar = dependencias.rasterizar ?? rasterizarSvg;
  mkdirSync(saida, { recursive: true });
  const arquivos = [];
  const paineis = [];
  for (const eixo of EIXOS_DOS_CORTES) {
    const doEixo = valores[eixo].map((valor) => painelDoCorte({ eixo, valor, triangulosDoEsboco, triangulosDoModelo }));
    const desenho = svgDosPaineis(doEixo, { orientacao });
    const arquivo = join(saida, `sobreposicao-${eixo}.png`);
    await rasterizar(desenho.svg, desenho.largura, desenho.altura, arquivo);
    arquivos.push(arquivo);
    doEixo.forEach((p, i) => paineis.push({
      eixo, valor: arredondar(p.valor), arquivo, escala: desenho.escalas[i], desvioMaximoMm: p.desvioMaximoMm,
      segmentosDoEsboco: p.esboco.length, segmentosDoModelo: p.modelo.length,
    }));
  }
  return { arquivos, paineis, notas, caixa, partes, formas: formasLigadas(declarado.ligadas) };
}

/** O relatório de uma sobreposição, uma linha por painel. */
export function descreverSobreposicao({ peca, arquivos, paineis, notas }) {
  const linhas = [`sobreposição dos cortes de ${peca}, vermelho grosso o esboço e azul fino o modelo:`];
  for (const arquivo of arquivos) linhas.push(`  ${arquivo}`);
  for (const p of paineis) {
    const desvio = p.desvioMaximoMm === null ? 'sem corte em um dos lados' : `desvio máximo entre as linhas ${virgula(p.desvioMaximoMm, 1)} mm`;
    linhas.push(`  ${p.eixo} = ${virgula(p.valor, 1)} mm: escala ${p.escala === null ? 'sem corte' : `${virgula(p.escala)} px/mm`}, ${desvio}`);
  }
  for (const nota of notas) linhas.push(`  nota: ${nota}`);
  return `${linhas.join('\n')}\n`;
}

async function comoCLI(argv) {
  let lido;
  try {
    lido = lerArgumentos(argv, { opcoes: ['saida'], posicional: { nome: 'a peça', obrigatorio: true } });
  } catch (erro) {
    process.stderr.write(`sobreposicao-de-cortes: ${erro.message}\n`);
    return 2;
  }
  const peca = lido.posicional;
  const saida = resolve(lido.opcao('saida') ?? join('tools/bancadas/out', `sobreposicao-${peca.replace(/[^A-Za-z0-9._-]+/g, '-')}`));
  const feito = await sobreposicaoDeCortes({ peca, saida });
  if (!feito) {
    process.stderr.write(`sobreposicao-de-cortes: a receita de '${peca}' não declara REFINA.esboco; não há esboço para sobrepor.\n`);
    return 1;
  }
  process.stdout.write(descreverSobreposicao({ peca, ...feito }));
  return 0;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  comoCLI(process.argv.slice(2)).then((codigo) => { process.exitCode = codigo; }, (erro) => {
    process.stderr.write(`sobreposicao-de-cortes: ${erro.message}\n`);
    process.exitCode = 1;
  });
}
