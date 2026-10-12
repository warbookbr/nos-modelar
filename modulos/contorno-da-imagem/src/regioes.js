/* regioes.js — as partes da imagem, separadas por watershed com sementes.
 *
 * A silhueta é o que fica abaixo do limiar do fundo claro. Quem conhece o
 * objeto semeia cada parte com um ponto ou uma linha traçada dentro dela, e o
 * watershed faz cada semente crescer até encontrar a vizinha, com a divisa
 * onde a imagem muda mais. Assim partes do mesmo cinza sem borda forte entre
 * elas saem separadas. Parte que não será modelada, como um cabo, também
 * precisa de semente, senão a vizinha a engole. A região é o que aparece: parte
 * escondida atrás de outra fica só com o pedaço visível.
 *
 * Ensaio de 2026-09-25 na lateral do braço robótico: Potrace e OpenCV traçam a
 * silhueta a até 2 px da borda, mas o Potrace só separa por limiar de cor e é
 * GPL; o corte só por bordas de sombra juntava partes vizinhas do mesmo cinza. */
import { PNG } from 'pngjs';
import { carregarOpenCV } from './opencv.js';

/* Uma semente é um ponto `[x, y]`, uma linha `[[x, y], [x, y], ...]` ou várias
   linhas `[[[x, y], ...], [[x, y], ...]]`, com pontos soltos `[x, y]` no meio se preciso. Várias linhas servem à parte que a
   imagem mostra em pedaços separados por outra, como a carcaça do punho vista
   de frente, dos dois lados do antebraço: uma linha só atravessaria a vizinha.
   Devolve a lista de linhas. */
export function tracosDaSemente(semente) {
  /* Com pelo menos uma linha na lista, cada ponto solto vira uma semente de um
     ponto só: o desenhador pode misturar os dois sem converter. */
  const temLinha = Array.isArray(semente) && semente.some((e) => Array.isArray(e?.[0]));
  const linhas = temLinha ? semente.map((e) => (Array.isArray(e?.[0]) ? e : [e])) : [Array.isArray(semente?.[0]) ? semente : [semente]];
  const ponto = (p) => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite);
  if (!linhas.length || linhas.some((l) => !Array.isArray(l) || !l.length || !l.every(ponto))) {
    throw new Error(`semente inválida: ${JSON.stringify(semente)}; use [x, y], [[x, y], ...] ou [[[x, y], ...], ...].`);
  }
  return linhas;
}

/* Área mínima, em px², de um pedaço de parte além do maior (área do contorno
   de `contourArea`, que já é menor que a contagem de pixels). O watershed deixa
   ilhas de 1 a 2 px de largura onde a divisa dobra, e uma ilha dessas de até
   uns 10 px de comprimento tem área 9 ou menos; 9 também é um quadrado de uns
   4 x 4 px. Na lateral, na frontal e no topo do avião o menor pedaço de uma
   janela ou de uma pá tem 16, então o corte passa abaixo de tudo que é parte. */
export const MINIMO_DO_PEDACO_PX2 = 9;

/* Área máxima, em px², de um buraco de fundo cercado pela silhueta que a
   silhueta fecha. Na lateral do avião, logo abaixo da linha escura do topo da
   fuselagem, o reflexo tem pixels de cinza 225 a 239, no tom do fundo (232) ou
   mais claros, e o limiar os deixava como buracos dentro da silhueta, sem dono
   na pintura. Medido nas três vistas do avião, os buracos cercados têm de 1 a 22
   px² (o maior é o reflexo da lateral, 19 x 2 px), todos fios de um a três
   pixels de largura, e os vãos de verdade têm 1.740 px² ou mais (o espaço entre
   as pernas do trem com o chão). 64 é um quadrado de 8 x 8 px: fica a quase três
   vezes o maior reflexo e a mais de vinte vezes abaixo do menor vão, e um furo
   de 8 x 8 px numa referência de 500 px é 1,6% da imagem, pequeno demais para o
   modelador querer um furo ali. Vão real maior que isso, como a janela vazada ou
   o espaço entre as pás, continua fundo. Com `buracoMaximo` no arquivo de
   regiões, 0 desliga. */
export const MAXIMO_DO_BURACO_PX2 = 64;

/* Pinta de silhueta, na própria máscara (255 = silhueta), cada buraco de fundo
   que não toca a borda da imagem e tem no máximo `maximo` px². O fundo é
   ligado de lado, em 4 vizinhos, que é o dual da silhueta ligada em 8 do
   `findContours`. Devolve quantos buracos e quantos pixels fechou, e a lista
   dos pixels (`indices`). */
export function fecharBuracos(mascara, largura, altura, maximo = MAXIMO_DO_BURACO_PX2) {
  const visto = new Uint8Array(mascara.length);
  let buracos = 0; const indices = [];
  for (let inicio = 0; inicio < mascara.length; inicio += 1) {
    if (mascara[inicio] || visto[inicio]) continue;
    const fila = [inicio]; visto[inicio] = 1;
    let tocaBorda = false;
    for (let i = 0; i < fila.length; i += 1) {
      const p = fila[i]; const x = p % largura; const y = (p - x) / largura;
      if (x === 0 || y === 0 || x === largura - 1 || y === altura - 1) tocaBorda = true;
      for (const q of [x > 0 ? p - 1 : -1, x < largura - 1 ? p + 1 : -1, y > 0 ? p - largura : -1, y < altura - 1 ? p + largura : -1]) {
        if (q >= 0 && !mascara[q] && !visto[q]) { visto[q] = 1; fila.push(q); }
      }
    }
    if (!tocaBorda && fila.length <= maximo) { for (const p of fila) { mascara[p] = 255; indices.push(p); } buracos += 1; }
  }
  return { buracos, pixels: indices.length, indices };
}

/* Devolve, para cada nome, a semente, o contorno externo do maior pedaço em
   pixel (`contornoPx`) e a área dele (`areaPx`), e em `pedacos` todos os
   pedaços externos da parte, do maior para o menor, cada um com `areaPx` e
   `contornoPx`. Uma parte vista em vários pedaços separados por outra, como a
   hélice do avião cortada pelo cone em duas pás, ou as janelas, ficava só com
   o maior pedaço e a medida dela era a de uma pá. Devolve também o rótulo de
   cada pixel (`rotulos`, -1 na divisa, 1 no fundo, 2 em diante nas partes na
   ordem de `nomes`), a máscara da silhueta, os pixels dela sem dono e
   `buracosFechados`, os buracos pequenos cercados pela silhueta que ela
   fechou (`fecharBuracos`). */
/* Realce para o watershed, que é onde a divisa é escolhida. O contraste local
   (CLAHE na luminância) puxa a diferença pequena entre duas partes do mesmo
   cinza, e a nitidez (máscara de desfoque) afina a costura entre elas. A
   silhueta e a medida de borda continuam na imagem original: o realce só
   decide por onde a semente cresce. `realce: true` usa os valores padrão. */
export const REALCE_PADRAO = { contraste: 3, grade: 16, nitidez: 1, raio: 1.5 };

function realcar(cv, cor, novo, realce) {
  const { contraste, grade, nitidez, raio } = { ...REALCE_PADRAO, ...(realce === true ? {} : realce) };
  const lab = novo(new cv.Mat()); cv.cvtColor(cor, lab, cv.COLOR_RGB2Lab);
  const canais = novo(new cv.MatVector()); cv.split(lab, canais);
  const l = canais.get(0); const l2 = novo(new cv.Mat());
  const clahe = new cv.CLAHE(contraste, new cv.Size(grade, grade));
  clahe.apply(l, l2); clahe.delete();
  l2.copyTo(l); canais.set(0, l); l.delete();
  const junto = novo(new cv.Mat()); cv.merge(canais, junto);
  const volta = novo(new cv.Mat()); cv.cvtColor(junto, volta, cv.COLOR_Lab2RGB);
  const borrada = novo(new cv.Mat()); cv.GaussianBlur(volta, borrada, new cv.Size(0, 0), raio);
  const saida = novo(new cv.Mat()); cv.addWeighted(volta, 1 + nitidez, borrada, -nitidez, 0, saida);
  return saida;
}

export async function segmentar(pngBuffer, { limiar = 225, regioes = {}, realce = false, buracoMaximo = MAXIMO_DO_BURACO_PX2 } = {}) {
  const nomes = Object.keys(regioes).sort();
  if (!nomes.length) throw new Error('o arquivo de regiões não nomeia nenhuma região.');
  const sementes = nomes.map((nome) => ({ nome, tracos: tracosDaSemente(regioes[nome]) }));
  const { cv } = await carregarOpenCV();
  const png = PNG.sync.read(pngBuffer);
  const { width: largura, height: altura } = png;
  const mats = [];
  const novo = (m) => { mats.push(m); return m; };
  try {
    const src = novo(cv.matFromImageData({ data: png.data, width: largura, height: altura }));
    const cor = novo(new cv.Mat()); cv.cvtColor(src, cor, cv.COLOR_RGBA2RGB);
    const cinza = novo(new cv.Mat()); cv.cvtColor(src, cinza, cv.COLOR_RGBA2GRAY);
    const silhueta = novo(new cv.Mat()); cv.threshold(cinza, silhueta, limiar, 255, cv.THRESH_BINARY_INV);
    /* Antes da dilatação que marca o fundo: um buraco pequeno fechado depois
       ainda guardaria uma semente de fundo no meio. */
    const fechados = fecharBuracos(silhueta.data, largura, altura, buracoMaximo);
    const nucleo = novo(cv.Mat.ones(3, 3, cv.CV_8U));
    const larga = novo(new cv.Mat()); cv.dilate(silhueta, larga, nucleo, new cv.Point(-1, -1), 3);
    const marcas = novo(new cv.Mat(altura, largura, cv.CV_32S, new cv.Scalar(0)));
    for (let p = 0; p < larga.data.length; p += 1) if (!larga.data[p]) marcas.data32S[p] = 1;
    const dentro = ([x, y]) => silhueta.data[Math.round(y) * largura + Math.round(x)] > 0;
    sementes.forEach(({ nome, tracos }, i) => {
      for (const ponto of tracos.flat()) {
        if (!dentro(ponto)) throw new Error(`o ponto ${JSON.stringify(ponto)} de '${nome}' cai fora da silhueta; mova o ponto para dentro da parte.`);
      }
      const rotulo = new cv.Scalar(i + 2);
      for (const linha of tracos) {
        if (linha.length === 1) cv.circle(marcas, new cv.Point(linha[0][0], linha[0][1]), 2, rotulo, -1);
        for (let k = 1; k < linha.length; k += 1) {
          cv.line(marcas, new cv.Point(linha[k - 1][0], linha[k - 1][1]), new cv.Point(linha[k][0], linha[k][1]), rotulo, 2);
        }
      }
    });
    cv.watershed(realce ? realcar(cv, cor, novo, realce) : cor, marcas);
    const rotulos = Int32Array.from(marcas.data32S);
    /* O watershed corre pelo gradiente, e um buraco fechado é do tom do fundo:
       parte dele chega com o rótulo do fundo (1) por um fio de pixels claros.
       Cada pixel fechado nesse caso passa à parte vizinha, do pixel já dono ao
       ainda sem dono, até todos terem uma. */
    const pendentes = new Set(fechados.indices.filter((p) => rotulos[p] === 1));
    const vizinhos = (p) => { const x = p % largura; const y = (p - x) / largura; return [[0, -1], [-1, 0], [1, 0], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]].map(([dx, dy]) => [x + dx, y + dy]).filter(([a, b]) => a >= 0 && b >= 0 && a < largura && b < altura).map(([a, b]) => b * largura + a); };
    while (pendentes.size) {
      const dados = [];
      for (const p of [...pendentes].sort((a, b) => a - b)) {
        const dono = vizinhos(p).map((q) => rotulos[q]).find((r) => r >= 2);
        if (dono !== undefined) dados.push([p, dono]);
      }
      if (!dados.length) break;
      for (const [p, dono] of dados) { rotulos[p] = dono; pendentes.delete(p); }
    }
    const resultado = {};
    sementes.forEach(({ nome, tracos }, i) => {
      const so = novo(new cv.Mat(altura, largura, cv.CV_8U, new cv.Scalar(0)));
      for (let p = 0; p < rotulos.length; p += 1) if (rotulos[p] === i + 2 && silhueta.data[p]) so.data[p] = 255;
      const contornos = novo(new cv.MatVector()); const hierarquia = novo(new cv.Mat());
      cv.findContours(so, contornos, hierarquia, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_NONE);
      /* Cada contorno externo é um pedaço da parte. Do maior para o menor, com
         o primeiro na frente em caso de empate: `areaPx` e `contornoPx` seguem
         sendo os do maior, e `pedacos` traz todos, sem os que são ruído. O maior
         fica sempre, mesmo abaixo do mínimo, para a parte não sumir. */
      const achados = [];
      for (let k = 0; k < contornos.size(); k += 1) {
        const c = contornos.get(k);
        achados.push({ c, area: cv.contourArea(c) });
      }
      achados.sort((p, q) => q.area - p.area);
      const pedacos = [];
      achados.forEach(({ c, area }, k) => {
        if (k === 0 || area >= MINIMO_DO_PEDACO_PX2) {
          const simples = new cv.Mat(); cv.approxPolyDP(c, simples, 1, true);
          const contornoPx = [];
          for (let m = 0; m < simples.data32S.length; m += 2) contornoPx.push([simples.data32S[m], simples.data32S[m + 1]]);
          simples.delete();
          pedacos.push({ areaPx: area, contornoPx });
        }
        c.delete();
      });
      if (!pedacos.length) throw new Error(`'${nome}' não ficou com região nenhuma; a semente foi engolida pelas vizinhas.`);
      resultado[nome] = { semente: tracos.flat(), rotulo: i + 2, areaPx: pedacos[0].areaPx, contornoPx: pedacos[0].contornoPx, pedacos };
    });
    let semDono = 0;
    for (let p = 0; p < rotulos.length; p += 1) if (silhueta.data[p] && rotulos[p] === 1) semDono += 1;
    return { largura, altura, regioes: resultado, ordem: Object.keys(regioes), rotulos, silhueta: Uint8Array.from(silhueta.data), semDono, buracosFechados: { buracos: fechados.buracos, pixels: fechados.pixels } };
  } finally {
    mats.forEach((m) => m.delete());
  }
}

/* Os pedaços da silhueta inteira, em pixel: `pedacos`, do maior para o menor,
   cada um com `areaPx` e `contornoPx` (a silhueta medida, sem simplificar:
   simplificada, ela corta os cantos por um pixel e as partes, que vêm de dentro
   dela, apareciam como pontos fora dela), e `linhasDeFora`, os contornos da
   silhueta crescida `folga` pixels (1 por padrão) e simplificados em 1 px, que
   cabe dentro da folga. É o que a prancha desenha como linha de fora, com as
   partes por dentro: elas tocam a borda da silhueta pixel a pixel, e sem folga
   caíam em cima da linha e contavam como fora. Crescida, a silhueta fecha as
   trincas de um ou dois pixels que a divisa entre partes deixa, e por isso a
   linha de fora não é pedaço a pedaço: dois pedaços a menos de dois pixels um do
   outro saem na mesma linha.
   Parte fora do modelo, como um cabo, sai da silhueta (`sem`): ela tem semente
   só para a vizinha não a engolir. Tirá-la corta a silhueta onde passa, e na
   frontal do avião o corpo escuro sobre a asa deixou a ponta da asa num pedaço à
   parte; `contornoDaSilhueta` guardava só o maior e a silhueta ia de -6.400 a
   4.378 mm, com a asa direita cortada. Como nas partes, a silhueta guarda todos
   os pedaços acima de MINIMO_DO_PEDACO_PX2, sem preencher o que a parte fora do
   modelo ocupa: aquilo é pixel que quem desenha tirou do modelo, e ligar os
   pedaços por cima dele inventaria silhueta onde a imagem não a mostra. O maior
   fica sempre, mesmo abaixo do mínimo. */
export async function silhuetaEmPedacos(segmentacao, { folga = 1, sem = [] } = {}) {
  const { cv } = await carregarOpenCV();
  const { largura, altura, silhueta } = segmentacao;
  const mats = [];
  const novo = (m) => { mats.push(m); return m; };
  /* Contornos externos de uma máscara, do maior para o menor, sem os que são ruído. */
  const externos = (mascara) => {
    const contornos = novo(new cv.MatVector()); const hierarquia = novo(new cv.Mat());
    cv.findContours(mascara, contornos, hierarquia, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_NONE);
    const lista = [];
    for (let k = 0; k < contornos.size(); k += 1) { const c = novo(contornos.get(k)); lista.push({ c, area: cv.contourArea(c) }); }
    return lista.sort((p, q) => q.area - p.area).filter(({ area }, k) => k === 0 || area >= MINIMO_DO_PEDACO_PX2);
  };
  const pontos = (dados) => { const lista = []; for (let k = 0; k < dados.length; k += 2) lista.push([dados[k], dados[k + 1]]); return lista; };
  try {
    const mascara = novo(new cv.Mat(altura, largura, cv.CV_8U, new cv.Scalar(0)));
    mascara.data.set(silhueta);
    const fora = new Set(sem.map((nome) => segmentacao.regioes[nome]?.rotulo).filter(Boolean));
    if (fora.size) for (let p = 0; p < mascara.data.length; p += 1) if (fora.has(segmentacao.rotulos[p]) || segmentacao.rotulos[p] === -1) mascara.data[p] = 0;
    const pedacos = externos(mascara).map(({ c, area }) => ({ areaPx: area, contornoPx: pontos(c.data32S) }));
    if (folga > 0) {
      const nucleo = novo(cv.Mat.ones(3, 3, cv.CV_8U));
      cv.dilate(mascara, mascara, nucleo, new cv.Point(-1, -1), folga);
    }
    const linhasDeFora = externos(mascara).map(({ c }) => {
      if (folga <= 0) return pontos(c.data32S);
      const simples = novo(new cv.Mat()); cv.approxPolyDP(c, simples, 1, true);
      return pontos(simples.data32S);
    });
    return { pedacos, linhasDeFora };
  } finally {
    mats.forEach((m) => m.delete());
  }
}

/* O contorno externo do maior pedaço da silhueta, em pixel: o de sempre, para
   quem só precisa de um anel. Com `folga`, o anel vem crescido e simplificado. */
export async function contornoDaSilhueta(segmentacao, { folga = 0, sem = [] } = {}) {
  const { pedacos, linhasDeFora } = await silhuetaEmPedacos(segmentacao, { folga, sem });
  return folga > 0 ? linhasDeFora[0] : pedacos[0].contornoPx;
}
