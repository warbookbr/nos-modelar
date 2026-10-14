/* traco.js — a vista em traço do desenho, em SVG: o contorno de cada parte e a silhueta, com os nomes das partes numa coluna de
   cada lado, fora do desenho, ligados à parte por uma linha de chamada, como a prancha dos contornos faz.

   É o alvo que o roteiro da prancha procura (`<vista>.png`) e o modelo que o crítico compara com a imagem escondida. O SVG sai
   de texto puro e determinístico (números com duas casas, ordem de nome); a ferramenta o rasteriza para PNG, e os bytes do PNG
   dependem da fonte da máquina que rasteriza. Os nomes ficam em colunas fora da silhueta, na ordem da altura da marca, com
   passo mínimo entre eles; depois, qualquer par de chamadas que se cruze na mesma coluna troca de lugar, o que encurta a soma das
   chamadas, então o laço termina. Puro. */
import { caixaDe } from './geometria.js';

const FONTE = { tamanho: 14, larguraDoCaractere: 7.8, familia: 'DejaVu Sans, Arial, sans-serif' };
const PASSO_DO_NOME = 22;
const AREA_DO_DESENHO = { largura: 760, altura: 540 };
const MARGEM = { topo: 84, baixo: 76, lado: 24, chamada: 46 };

const n2 = (x) => (Math.round(x * 100) / 100).toFixed(2);
const escapar = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function dentroDoAnel([h, v], anel) {
  let dentro = false;
  for (let i = 0, j = anel.length - 1; i < anel.length; j = i, i += 1) {
    const [ah, av] = anel[i]; const [bh, bv] = anel[j];
    if ((av > v) !== (bv > v) && h < ((bh - ah) * (v - av)) / (bv - av) + ah) dentro = !dentro;
  }
  return dentro;
}

function distanciaDaBorda([h, v], anel) {
  let menor = Infinity;
  for (let i = 0; i < anel.length; i += 1) {
    const [ah, av] = anel[i]; const [bh, bv] = anel[(i + 1) % anel.length];
    const dh = bh - ah; const dv = bv - av; const l2 = dh * dh + dv * dv;
    const t = l2 ? Math.max(0, Math.min(1, ((h - ah) * dh + (v - av) * dv) / l2)) : 0;
    menor = Math.min(menor, Math.hypot(h - ah - t * dh, v - av - t * dv));
  }
  return menor;
}

/* Um ponto dentro do anel, o mais longe da borda que uma grade fina achar: onde a linha de chamada termina. Determinístico. */
export function pontoInterior(anel) {
  const [h0, v0, h1, v1] = caixaDe([anel]);
  let melhor = [(h0 + h1) / 2, (v0 + v1) / 2]; let folga = -1;
  let [a0, b0, a1, b1] = [h0, v0, h1, v1];
  for (let passada = 0; passada < 3; passada += 1) {
    const n = 24;
    for (let i = 0; i <= n; i += 1) {
      for (let j = 0; j <= n; j += 1) {
        const p = [a0 + ((a1 - a0) * i) / n, b0 + ((b1 - b0) * j) / n];
        if (!dentroDoAnel(p, anel)) continue;
        const d = distanciaDaBorda(p, anel);
        if (d > folga + 1e-9) { folga = d; melhor = p; }
      }
    }
    const meiaH = (a1 - a0) / n; const meiaV = (b1 - b0) / n;
    [a0, a1, b0, b1] = [melhor[0] - meiaH, melhor[0] + meiaH, melhor[1] - meiaV, melhor[1] + meiaV];
  }
  return melhor;
}

const seCruzam = (p, q, r, s) => {
  const lado = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  return lado(p, q, r) * lado(p, q, s) < 0 && lado(r, s, p) * lado(r, s, q) < 0;
};

/* Distribui as alturas dos nomes de uma coluna: na ordem da marca, com passo mínimo, dentro de [topo, fundo], e sem chamadas cruzadas. */
function empilhar(itens, xDoNome, topo, fundo) {
  const lista = [...itens].sort((a, b) => a.marca[1] - b.marca[1] || (a.nome < b.nome ? -1 : 1));
  lista.forEach((it, i) => { it.y = Math.max(it.marca[1], i ? lista[i - 1].y + PASSO_DO_NOME : topo); });
  for (let i = lista.length - 1; i >= 0; i -= 1) lista[i].y = Math.min(lista[i].y, i < lista.length - 1 ? lista[i + 1].y - PASSO_DO_NOME : Math.max(fundo, topo + PASSO_DO_NOME * (lista.length - 1)));
  for (let volta = 0; volta < 200; volta += 1) {
    let trocou = false;
    for (let i = 0; i < lista.length; i += 1) {
      for (let j = i + 1; j < lista.length; j += 1) {
        if (seCruzam([xDoNome, lista[i].y], lista[i].marca, [xDoNome, lista[j].y], lista[j].marca)) {
          [lista[i].y, lista[j].y] = [lista[j].y, lista[i].y]; trocou = true;
        }
      }
    }
    if (!trocou) break;
  }
}

/* O comprimento redondo (1, 2 ou 5 vezes uma potência de dez) mais próximo de um quinto da largura. */
function reguaEmMm(largura) {
  const alvo = largura / 5;
  const p = 10 ** Math.floor(Math.log10(alvo));
  return [1, 2, 5, 10].map((m) => m * p).reduce((m, c) => (Math.abs(c - alvo) < Math.abs(m - alvo) ? c : m));
}

export function vistaEmTraco(modelo, contornos) {
  const nomes = Object.keys(contornos.regioes);
  const pedacosDaSilhueta = contornos.silhueta.pedacos.map((p) => p.contornoMm);
  const [h0, v0, h1, v1] = caixaDe(pedacosDaSilhueta);
  const w = h1 - h0 || 1; const alt = v1 - v0 || 1;
  const escala = Math.min(AREA_DO_DESENHO.largura / w, AREA_DO_DESENHO.altura / alt);

  const marcas = nomes.map((nome) => ({ nome, marcaMm: pontoInterior(contornos.regioes[nome].contornoMm) }));
  const centroH = (h0 + h1) / 2;
  const esquerda = marcas.filter((m) => m.marcaMm[0] < centroH); const direita = marcas.filter((m) => m.marcaMm[0] >= centroH);
  const larguraDaColuna = (col) => Math.max(0, ...col.map((m) => m.nome.length)) * FONTE.larguraDoCaractere;
  const colunaE = esquerda.length ? larguraDaColuna(esquerda) + MARGEM.chamada : 0;
  const colunaD = direita.length ? larguraDaColuna(direita) + MARGEM.chamada : 0;
  const ox = MARGEM.lado + colunaE; const oy = MARGEM.topo;
  const x = (h) => ox + (h - h0) * escala; const y = (v) => oy + (v1 - v) * escala;
  const largura = Math.ceil(ox + w * escala + colunaD + MARGEM.lado + 80);
  const altura = Math.ceil(oy + alt * escala + MARGEM.baixo);

  for (const m of marcas) m.marca = [x(m.marcaMm[0]), y(m.marcaMm[1])];
  const xE = MARGEM.lado + (colunaE ? colunaE - MARGEM.chamada + 8 : 0);
  const xD = ox + w * escala + MARGEM.chamada - 8;
  empilhar(esquerda, xE, oy - 6, oy + alt * escala + 6);
  empilhar(direita, xD, oy - 6, oy + alt * escala + 6);

  const caminho = (anel) => `M${anel.map(([h, v]) => `${n2(x(h))},${n2(y(v))}`).join(' L')} Z`;
  const L = [];
  L.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${largura}" height="${altura}" viewBox="0 0 ${largura} ${altura}" font-family="${FONTE.familia}" font-size="${FONTE.tamanho}">`);
  L.push(`<rect width="${largura}" height="${altura}" fill="#ffffff"/>`);
  L.push(`<text x="${MARGEM.lado}" y="30" font-size="18" font-weight="bold" fill="#111111">${escapar(modelo.objeto)} - vista ${escapar(modelo.vista)}</text>`);
  L.push(`<text x="${MARGEM.lado}" y="52" fill="#555555">Milímetros. Desenho por restrições; os nomes das partes ficam fora do desenho.${modelo.olhando ? ` Olhando ${escapar(modelo.olhando)}.` : ''}</text>`);

  const referencias = Object.keys(modelo.referencias).sort();
  const folga = 14 / escala;
  for (const nome of referencias) {
    const r = modelo.referencias[nome];
    const [pa, pb] = r.reta === 'horizontal' ? [[h0 - folga, r.valor], [h1 + folga, r.valor]] : [[r.valor, v0 - folga], [r.valor, v1 + folga]];
    L.push(`<line x1="${n2(x(pa[0]))}" y1="${n2(y(pa[1]))}" x2="${n2(x(pb[0]))}" y2="${n2(y(pb[1]))}" stroke="#9a9a9a" stroke-width="1" stroke-dasharray="6 4"/>`);
  }
  for (const nome of nomes) {
    const r = contornos.regioes[nome];
    for (const p of r.pedacos) L.push(`<path d="${caminho(p.contornoMm)}" fill="none" stroke="${r.foraDoModelo ? '#8a8a8a' : '#333333'}" stroke-width="1.3"${r.foraDoModelo ? ' stroke-dasharray="3 3"' : ''} stroke-linejoin="round"/>`);
  }
  for (const anel of pedacosDaSilhueta) L.push(`<path d="${caminho(anel)}" fill="none" stroke="#000000" stroke-width="2.6" stroke-linejoin="round"/>`);

  for (const [lado, col, xn] of [['e', esquerda, xE], ['d', direita, xD]]) {
    for (const m of col) {
      L.push(`<line x1="${n2(xn)}" y1="${n2(m.y)}" x2="${n2(m.marca[0])}" y2="${n2(m.marca[1])}" stroke="#8a8a8a" stroke-width="0.8"/>`);
      L.push(`<circle cx="${n2(m.marca[0])}" cy="${n2(m.marca[1])}" r="2.6" fill="#8a8a8a"/>`);
      const tx = lado === 'e' ? xn - 6 : xn + 6;
      L.push(`<text x="${n2(tx)}" y="${n2(m.y + 4.5)}" text-anchor="${lado === 'e' ? 'end' : 'start'}" fill="#111111">${escapar(m.nome)}</text>`);
    }
  }

  const regua = reguaEmMm(w);
  const yr = altura - 36;
  L.push(`<line x1="${MARGEM.lado}" y1="${yr}" x2="${n2(MARGEM.lado + regua * escala)}" y2="${yr}" stroke="#111111" stroke-width="2"/>`);
  L.push(`<line x1="${MARGEM.lado}" y1="${yr - 5}" x2="${MARGEM.lado}" y2="${yr + 5}" stroke="#111111" stroke-width="2"/>`);
  L.push(`<line x1="${n2(MARGEM.lado + regua * escala)}" y1="${yr - 5}" x2="${n2(MARGEM.lado + regua * escala)}" y2="${yr + 5}" stroke="#111111" stroke-width="2"/>`);
  L.push(`<text x="${MARGEM.lado}" y="${yr + 22}" fill="#111111">${regua} mm</text>`);
  if (referencias.length) {
    L.push(`<text x="${n2(MARGEM.lado + regua * escala + 30)}" y="${yr + 22}" fill="#666666">tracejado: referência (${escapar(referencias.map((n) => `${n} ${modelo.referencias[n].reta === 'horizontal' ? 'v' : 'h'} = ${modelo.referencias[n].valor}`).join('; '))})</text>`);
  }
  L.push('</svg>');
  return { svg: `${L.join('\n')}\n`, largura, altura, escala: Math.round(escala * 1e4) / 1e4 };
}
