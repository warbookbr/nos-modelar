/* carro-fastback/lataria — o piloto do quarto traseiro: a chapa contínua de lataria do meio da porta (z 0) para trás, lado +x, com o para-lama
 * traseiro saliente, o rebaixo côncavo da lateral, a coluna que cai até a tampa, o arco da roda de trás, o vão do vidro lateral traseiro e o
 * vão da lanterna na quina. Fatia 2 de `docs/modelar/planos/2026-11-14-modelagem-de-carro.md`; as medidas vêm de `../../ALINHAMENTO.md`, do
 * `../../andaime.json` e das pranchas de `../../referencias/` (os pontos da TABELA são lidos delas, em mm, no referencial do carro: x para a
 * direita, y para cima com o chão em 0, z para a frente, o eixo traseiro em z -1375).
 *
 * A FORMA. A chapa é uma `subdivisao` de uma gaiola de `gaiolaPorRede`, e as arestas da gaiola SÃO as curvas planejadas: os cortes da seção em cada
 * estação (de baixo: soleira, base do rebaixo, meio do rebaixo, topo do rebaixo, ombro, base da coluna, quina do teto e eixo do carro) e as linhas
 * ao comprimento por esses níveis. Todo ponto-chave sai de uma pele analítica da TABELA: o contorno da planta da prancha superior (polígono com
 * filete, alisado ao longo do arco), recuado pela normal de quanto a seção cai (o ombro, a porta e o rebaixo), e o teto como uma coroa. Da
 * soleira à base da coluna os níveis correm pelo contorno da planta e dão a volta pela traseira até o eixo do carro, misturando suavemente a seção
 * do lado com o perfil da traseira no eixo. O arco, o vidro lateral, a lanterna e o vidro traseiro são vãos abertos na chapa pronta.
 *
 * RODADA 4. O degrau das lanternas entrou pelo perfil da traseira (`traseira`, recuo no nível `topo`), e a quina do ombro à coluna e a coroa ganharam
 * `alisamento.quina`; `emendaG1` e `chapa.pesoPorCurva` ficam vazios (medidos, sem ganho: README do banco de provas e `rodadas/`).
 * NOTA PARA A PRÓXIMA ETAPA (rodada 3). A rodada 2 tirou a onda das tabelas lidas por pixel (média gaussiana, `alisamento`), adensou o sino do
 * rebaixo e o rolo do ombro (`pontosChave`), passou a só aproximar as curvas (`chapa.pesoDasCurvas`) e fez do degrau do ombro à coluna uma
 * faixa própria da rede (o nível `coluna`, com vinco). A rodada 3 alisa as curvas da rede pelo núcleo (`alisarCurvas`), com 3 mm nas que
 * passam pelo para-lama e pelo rebaixo e as outras sem alisar, e parte a seção no ombro (`partirSecaoEm`), porque o alisamento arredondava
 * a dobra do vinco onde ela vira menos que o ângulo de canto; o índice do para-lama caiu de 809 para 86. O rebaixo some `folgaDoArco`
 * antes da boca do arco, e a região dele acaba ali. O vidro lateral e a lanterna saem nos dois lados (simetria na abertura e costura exata
 * na subdivisão); o vidro traseiro, que cruza o eixo, sai inteiro. A seção densa (10 pontos do topo do rebaixo ao ombro) estreita a faixa
 * do vinco do ombro abaixo da espessura, e a subdivisão recusa. O spoiler fica fora desta etapa.
 *
 * A cadeia: a TABELA em mm; `derivar` calcula a pele, os nós, as curvas e os retalhos; `gerarPassos` converte para metro com `m()`. */
import { gaiolaPorRede } from '../../../../nucleo/gaiola-por-rede.js';
import { furoPassante } from '../../../../nucleo/furo-passante.js';

const m = (mm) => mm / 1000;

export const TABELA = {
  /* a chapa e a malha: espessura de chapa de aço, espaçamento da gaiola, níveis de subdivisão e o peso com que a superfície se aproxima das curvas (sem ele, passa por elas) */
  chapa: { espessura: 2, passo: 70, niveis: 2, anguloMax: 15, pesoDasCurvas: 1 },
  /* a planta, [z, x, raio], a metade da silhueta da prancha superior da frente da porta ao eixo do carro atrás (o polígono com filete por vértice da prancha) */
  planta: [[1000, 915, 200], [300, 912, 5000], [-750, 912, 3000], [-950, 940, 300], [-1300, 950, 2000], [-1700, 930, 800], [-2050, 840, 800], [-2250, 690, 300], [-2340, 400, 400], [-2372, 120, 600], [-2379, 0, 4000]],
  /* o alisamento das curvas, desvio da média gaussiana em mm: a planta ao longo do contorno, as tabelas ao comprimento, a queda do ombro e o perfil da traseira na altura */
  alisamento: { planta: 40, comprimento: 120, teto: 100, queda: 20, perfil: 50, quina: 120 },
  /* a queda do ombro: quanto a seção sai para dentro da meia largura da planta em cada altura, [y, mm], lida da seção traseira (952 a y 600, 795 a y 978) */
  queda: [[170, 30], [210, 22], [300, 0], [600, 0], [758, 12], [827, 47], [932, 107], [978, 157], [1010, 160]],
  /* as alturas dos níveis ao comprimento, [z, y]: a soleira (a borda de baixo), a base e o topo do rebaixo e o ombro (cintura na porta, ombro do para-lama atrás) */
  soleira: [[0, 170], [-1200, 170], [-1744, 250], [-1960, 256], [-2050, 262]],
  baseDoRebaixo: [[0, 395], [-618, 420], [-1000, 640], [-1250, 715], [-2050, 700]],
  topoDoRebaixo: [[0, 790], [-724, 811], [-1023, 836], [-1300, 860], [-2050, 900]],
  ombro: [[0, 955], [-657, 996], [-1000, 1000], [-1300, 1004], [-2050, 1008]],
  /* RODADA 5. As leis do flanco, ajustadas por mínimos quadrados aos pontos da prancha acima (`soleira`, `baseDoRebaixo`, `topoDoRebaixo`, `ombro` e `queda` ficam como
   * os pontos de conferência: nenhum número de `leis` é lido deles na geometria). Cada nível é uma reta mais um ou dois degraus de quinto grau (C2, curvatura que sobe e
   * desce uma vez cada, sem as lombadas da poligonal alisada): y(z) = a + b z + soma de A S((za - z) / (za - zb)); o ajuste deixa a soleira a 0,9 mm dos pontos, a base do
   * rebaixo a 2,6, o topo a 1,1 e o ombro a 2,1. A queda é uma lei só em y: o encolhimento da base (S de y 170 a 300) e a curva que rola o ombro (potência 3 de `desde`,
   * curvatura que nasce de zero, misturada em S de `mistura` (820 a 1004) ao patamar `topo`), a 5,6 mm dos pontos lidos (a leitura da prancha tem 25 mm de erro). Medido no oráculo: a queda pchip alisada era a maior fonte de
   * ondulação na porta (variante de controle com a queda trocada por parábola: 22 extremos de normal em 6 linhas, contra 4). */
  leis: {
    soleira: { a: 170.2127, b: 0.0008, degraus: [[87.1059, -1100, -1925], [6.7404, -1900, -2100]] },
    baseDoRebaixo: { a: 395.6249, b: -0.004, degraus: [[312.3619, -425, -1300], [-15.9175, -1625, -2100]] },
    topoDoRebaixo: { a: 789.3445, b: -0.0182, degraus: [[72.4024, -200, -2100]] },
    ombro: { a: 957.0491, b: -0.0098, degraus: [[32.6342, -100, -450]] },
    queda: { base: { A: 28.568, de: 170, ate: 300 }, rola: { A: 182.189, desde: 550, fim: 1004, p: 3, mistura: 820, topo: 159.353 } },
  },
  /* o degrau da seção traseira entre o ombro e a base da coluna (805 a y 1000 para 745 a y 1014): uma faixa de chapa própria da rede, de `largura` para dentro e `subida` para cima,
   * que dá a volta pela traseira como a borda da tampa; `folgaDoVidro` é quanto a borda de baixo do vidro lateral fica acima da base da coluna */
  degrau: { largura: 55, subida: 14, folgaDoVidro: 8 },
  /* as alturas dos níveis no eixo do carro, atrás: o fundo (304, a borda de baixo reta da traseira no nível em que a silhueta da prancha lateral a deixa em z -2282; a prancha traseira a desenha reta em 210, o que a lateral não comporta), a base e o topo do rebaixo, o meio entre eles e a borda da tampa (o ombro) */
  calota: { soleira: 304, base: 700, meio: 800, topo: 900, ombro: 1037 },
  /* quanto a seção da porta cai mais para dentro que a do para-lama no ombro, mm */
  ombroDaPorta: 12,
  /* o rebaixo côncavo: a profundidade máxima na porta (mm), de onde ela começa a morrer (z), e a folga (mm) entre onde ela some e a boca da
   * frente do arco da roda (z do eixo mais o raio): o rebaixo morre antes do arco, e a região dele acaba onde ele some */
  rebaixo: { profundidade: 20, cheioAte: -300, folgaDoArco: 60 },
  /* o alisamento das curvas da rede (`alisarCurvas`), o maior deslocamento de um ponto-chave em mm: o das curvas que passam pelo para-lama
   * ou pelo rebaixo, que a pessoa soltou até 3 mm (o ruído delas passa de 1 mm), e o das outras (`resto`, até 1 mm pela decisão; null as
   * deixa sem alisar). Medido na rodada 3 com a seção partida no ombro: com 1 mm no resto a chapa sai com índice 326 e 10 falhas, sem
   * alisar o resto 304 e 9, e o para-lama e o rebaixo iguais (86 e 25,5); as curvas do resto são as da coluna, da quina, da borda da tampa
   * e do perfil da traseira, que vão ao limite de 1 mm arredondando a feição, e por isso ficam sem alisar */
  alisarCurvas: { resto: null, regioes: 3 },
  /* a quina do teto e a coluna, [z, x, y]: do teto sobre a porta, o vidro lateral traseiro e a coluna caindo até a tampa */
  quinaDoTeto: [[0, 598, 1262], [-400, 588, 1288], [-800, 595, 1262], [-1200, 630, 1135], [-1600, 520, 1090], [-2050, 430, 1049]],
  /* o eixo do carro, a linha do teto à tampa, [z, y]: o teto sobre a porta, o pico, a queda do fastback e a tampa */
  teto: [[0, 1346], [-320, 1381], [-728, 1341], [-1000, 1300], [-1132, 1269], [-1500, 1168], [-1893, 1050], [-2000, 1041], [-2050, 1040], [-2170, 1038], [-2210, 1037]],
  /* o perfil da traseira no eixo do carro, [y, z]: de cima para baixo, da borda da tampa ao fundo; a calota desloca cada nível por ele. O degrau das
   * lanternas: abaixo da quina da aba (961, -2224, na silhueta da prancha lateral) a faixa recua até o nível `topo` (900, -2190, uns 35 mm para dentro da
   * aba, a proporção da imagem de referência, que não é medida) e volta para fora pela lanterna até o para-choque (-2321 a y 760), como na prancha. Atrás a traseira é reta em -2375 de y 500 a 620 (a prancha lateral), e a borda de baixo desce até 304 em z -2282, onde a silhueta lateral a deixa */
  traseira: [[1037, -2210], [961, -2224], [900, -2190], [845, -2240], [760, -2321], [629, -2374], [570, -2375], [500, -2375], [416, -2350], [333, -2302], [304, -2282]],
  /* a coroa do teto, expoente da seção entre a quina do teto e o eixo (a seção traseira: 3 mm a 300 de 590, 30 mm a 487, de uma queda de 93 até a quina) */
  coroa: 5.5,
  /* as estações ao comprimento, z; a última é onde começa a calota da traseira */
  estacoes: [0, -400, -800, -1200, -1600, -1850],
  /* os pontos-chave entre os nós: o espaçamento ao comprimento, na volta da calota e no perfil da traseira (mm), quantos em cada vão da seção,
   * de baixo para cima até a quina, e as frações da quina em que a coroa do teto é lida, mais juntas perto da quina, onde ela cai. Mais
   * densos, o alisamento das curvas anda menos (as linhas, menos de 1,2 mm), mas a seção densa estreita a faixa do vinco do ombro abaixo da
   * espessura (raio de 1,1 mm) e as linhas densas subiram o índice da chapa de 326 para 364 */
  pontosChave: { comprimento: 100, calota: 90, perfil: 60, secao: [3, 3, 3, 5, 0, 4], coroa: [0.92, 0.84, 0.75, 0.65, 0.5, 0.33, 0.16] },
  /* os níveis em que a seção se parte em curvas, para o alisamento não arredondar a dobra do vinco que ela cruza: só o ombro, que tirou o
   * índice do para-lama de 239 para 86 e o da chapa de 373 para 326; partida também na coluna e na quina, a chapa subiu a 454 */
  partirSecaoEm: ['ombro'],
  /* as curvas que declaram a emenda lisa de tangente comum (`continuidade: 'G1'` da rede) e o deslocamento que se tolera (mm); vazio, nenhuma */
  emendaG1: { curvas: [], tolerancia: 1 },
  /* topoDaCalota: o vinco da quina do degrau das lanternas, no nível `topo` da volta da traseira (só a calota, o lado da porta não tem); medido: sem ele o
   * índice da caixa da traseira vai de 345 a 1025, com ele (0,3 ou 0,5) a 418 */
  vincos: { ombro: 0.5, coluna: 0.3, quinaDoTeto: 0.4, bordaDaTampa: 0.2, topoDaCalota: 0.3 },
  /* o arco da roda traseira: centro no eixo traseiro, raio da prancha (pneu de 340 mais 40), e os lados do polígono do corte (com 96, um vértice
   * dele caía a 0,4 mm de um da chapa perto do topo do arco e deixava uma face fina em cada lado) */
  arco: { z: -1375, y: 340, raio: 380, lados: 100 },
  /* as partes por região da chapa, caixas [min, max] em mm: o para-lama saliente (atrás da porta, sobre o arco) e o rebaixo da lateral (do meio da porta até onde ele some, antes do arco: a caixa dele só dá x e y atrás, e o z de trás sai de `ondeORebaixoSome`); o rebaixo vale onde as duas se sobrepõem */
  partes: { paralama: { min: [780, 250, -1950], max: [960, 1010, -900] }, rebaixo: { min: [780, 380], max: [960, 840, 1] } },
  /* o vão do vidro lateral traseiro, [z, y] do contorno da prancha lateral (a borda de fora da moldura); a borda de baixo sobe até a base da coluna mais a folga */
  vidroLateral: [[-703, 1001], [-692, 1009], [-702, 1247], [-712, 1258], [-719, 1258], [-910, 1218], [-1008, 1190], [-1199, 1121], [-1211, 1102], [-1205, 1091], [-1128, 1045], [-1084, 1031], [-911, 1013]],
  /* o vão do vidro traseiro, a metade [z, x, raio] da prancha superior (a borda de cima, a lateral e o canto de baixo), espelhada no eixo do carro */
  vidroTraseiro: [[-975, 0, 5000], [-955, 532, 60], [-1500, 502, 3000], [-1680, 445, 200], [-1795, 0, 1500]],
  /* o vão da lanterna, [x, y] vistos de trás: do painel escuro à quina, na altura entre o refletor e a borda da tampa */
  lanterna: { x0: 466, x1: 760, y0: 694, y1: 905, raio: 24 },
};

/* ---------------------------------------------------------------- interpolação */

/** Interpolação cúbica monótona (Fritsch-Carlson) de uma tabela [x, y], em qualquer ordem de x; fora do intervalo, o valor da ponta. */
export function pchip(tabela) {
  const t = [...tabela].sort((a, b) => a[0] - b[0]);
  const n = t.length;
  const h = []; const d = [];
  for (let i = 0; i < n - 1; i += 1) { h.push(t[i + 1][0] - t[i][0]); d.push((t[i + 1][1] - t[i][1]) / h[i]); }
  const s = new Array(n).fill(0);
  if (n === 2) { s[0] = d[0]; s[1] = d[0]; } else {
    for (let i = 1; i < n - 1; i += 1) {
      if (d[i - 1] * d[i] <= 0) s[i] = 0;
      else { const w1 = 2 * h[i] + h[i - 1]; const w2 = h[i] + 2 * h[i - 1]; s[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]); }
    }
    const ponta = (h0, h1, d0, d1) => { let v = ((2 * h0 + h1) * d0 - h0 * d1) / (h0 + h1); if (v * d0 <= 0) v = 0; else if (d0 * d1 <= 0 && Math.abs(v) > 3 * Math.abs(d0)) v = 3 * d0; return v; };
    s[0] = ponta(h[0], h[1], d[0], d[1]);
    s[n - 1] = ponta(h[n - 2], h[n - 3], d[n - 2], d[n - 3]);
  }
  return (x) => {
    if (x <= t[0][0]) return t[0][1];
    if (x >= t[n - 1][0]) return t[n - 1][1];
    let i = 0; while (x > t[i + 1][0]) i += 1;
    const u = (x - t[i][0]) / h[i]; const u2 = u * u; const u3 = u2 * u;
    return (2 * u3 - 3 * u2 + 1) * t[i][1] + (u3 - 2 * u2 + u) * h[i] * s[i] + (-2 * u3 + 3 * u2) * t[i + 1][1] + (u3 - u2) * h[i] * s[i + 1];
  };
}

/* os pesos da média gaussiana, em 41 amostras de -2,5 a 2,5 desvios */
const GAUSS = (() => { const k = []; for (let i = -20; i <= 20; i += 1) { const t = (i / 20) * 2.5; k.push([t, Math.exp(-0.5 * t * t)]); } const soma = k.reduce((a, [, w]) => a + w, 0); return k.map(([t, w]) => [t, w / soma]); })();

/** A função alisada por média gaussiana de desvio `sigma` (mm): tira a quebra de curvatura que a interpolação deixa em cada ponto da tabela, que a chapa brilhante mostra como onda. */
export const alisar = (f, sigma) => (x) => GAUSS.reduce((a, [t, w]) => a + w * f(x + sigma * t), 0);

const suave = (u) => { const s = Math.min(1, Math.max(0, u)); return s * s * s * (s * (6 * s - 15) + 10); };

/** O polígono [a, b, raio] com filete por vértice, amostrado: os trechos retos e os arcos de cada canto. */
function filete2d(pts) {
  const out = [[pts[0][0], pts[0][1]]];
  for (let i = 1; i < pts.length - 1; i += 1) {
    const [pa, pb, r = 0] = pts[i];
    const ua = [pts[i - 1][0] - pa, pts[i - 1][1] - pb]; const ub = [pts[i + 1][0] - pa, pts[i + 1][1] - pb];
    const la = Math.hypot(...ua); const lb = Math.hypot(...ub);
    const teta = Math.acos(Math.max(-1, Math.min(1, (ua[0] * ub[0] + ua[1] * ub[1]) / (la * lb))));
    if (!(r > 0) || teta < 1e-4 || Math.PI - teta < 1e-4) { out.push([pa, pb]); continue; }
    let t = r / Math.tan(teta / 2); let rr = r;
    const lim = 0.5 * Math.min(la, lb); if (t > lim) { t = lim; rr = t * Math.tan(teta / 2); }
    const A = [pa + (ua[0] / la) * t, pb + (ua[1] / la) * t]; const B = [pa + (ub[0] / lb) * t, pb + (ub[1] / lb) * t];
    const bi = [ua[0] / la + ub[0] / lb, ua[1] / la + ub[1] / lb]; const lbi = Math.hypot(...bi);
    const C = [pa + (bi[0] / lbi) * (rr / Math.sin(teta / 2)), pb + (bi[1] / lbi) * (rr / Math.sin(teta / 2))];
    const a0 = Math.atan2(A[1] - C[1], A[0] - C[0]); let da = Math.atan2(B[1] - C[1], B[0] - C[0]) - a0;
    if (da > Math.PI) da -= 2 * Math.PI; if (da < -Math.PI) da += 2 * Math.PI;
    const n = Math.max(2, Math.ceil(Math.abs(da) / (Math.PI / 180)));
    for (let k = 0; k <= n; k += 1) out.push([C[0] + rr * Math.cos(a0 + (da * k) / n), C[1] + rr * Math.sin(a0 + (da * k) / n)]);
  }
  out.push([pts[pts.length - 1][0], pts[pts.length - 1][1]]);
  return out;
}

/** O contorno da planta, [z, x] da frente ao eixo do carro atrás: o polígono com filete da prancha, refeito a cada 5 mm de arco e alisado
 * pela média gaussiana ao longo do arco; o fim de trás continua espelhado, para a média passar lisa pelo eixo do carro. Devolve o ponto e a
 * normal para dentro (de x para o eixo do carro no lado, de z para a frente na traseira) em cada comprimento de arco. */
export function contornoDaPlanta(planta, sigma) {
  const bruto = filete2d([...planta, ...planta.slice(0, -1).reverse().map(([z, x, r]) => [z, -x, r])]);
  const h = 5; const pts = [bruto[0]];
  let resto = 0;
  for (let i = 1; i < bruto.length; i += 1) {
    const [a, b] = [bruto[i - 1], bruto[i]]; const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    let d = h - resto;
    while (d <= l) { pts.push([a[0] + ((b[0] - a[0]) * d) / l, a[1] + ((b[1] - a[1]) * d) / l]); d += h; }
    resto = l - (d - h);
  }
  const raio = Math.ceil((2.5 * sigma) / h);
  const pesos = []; for (let k = -raio; k <= raio; k += 1) pesos.push(Math.exp(-0.5 * ((k * h) / sigma) ** 2));
  const soma = pesos.reduce((a, w) => a + w, 0);
  const lisos = pts.map((_, i) => { let z = 0; let x = 0; for (let k = -raio; k <= raio; k += 1) { const p = pts[Math.min(pts.length - 1, Math.max(0, i + k))]; z += p[0] * pesos[k + raio]; x += p[1] * pesos[k + raio]; } return [z / soma, x / soma]; });
  /* a metade x >= 0: até onde o contorno cruza o eixo do carro */
  let fim = lisos.findIndex((p, i) => i > 0 && p[1] <= 0);
  const [a, b] = [lisos[fim - 1], lisos[fim]]; const f = a[1] / (a[1] - b[1]);
  const meia = [...lisos.slice(0, fim), [a[0] + (b[0] - a[0]) * f, 0]];
  const s = [0]; for (let i = 1; i < meia.length; i += 1) s.push(s[i - 1] + Math.hypot(meia[i][0] - meia[i - 1][0], meia[i][1] - meia[i - 1][1]));
  const total = s[s.length - 1];
  const achar = (u) => { let lo = 0; let hi = meia.length - 1; while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (s[mid] <= u) lo = mid; else hi = mid; } return lo; };
  const ponto = (u) => { const c = Math.min(total, Math.max(0, u)); const i = Math.min(achar(c), meia.length - 2); const t = (c - s[i]) / (s[i + 1] - s[i]); return [meia[i][0] + (meia[i + 1][0] - meia[i][0]) * t, meia[i][1] + (meia[i + 1][1] - meia[i][1]) * t]; };
  /* a tangente por diferença central de 10 mm; a normal para dentro é a tangente girada: (-dx, dz) em [z, x] */
  const normal = (u) => { const p = ponto(u - 10); const q = ponto(u + 10); const l = Math.hypot(q[0] - p[0], q[1] - p[1]); return [-(q[1] - p[1]) / l, (q[0] - p[0]) / l]; };
  /* o comprimento de arco em que o contorno passa por z, no lado (onde z cai ao longo do arco) */
  const deZ = (z) => { let lo = 0; let hi = total; for (let k = 0; k < 60; k += 1) { const mid = (lo + hi) / 2; if (ponto(mid)[0] > z) lo = mid; else hi = mid; } return (lo + hi) / 2; };
  return { ponto, normal, deZ, total, zFim: meia[meia.length - 1][0] };
}

/** O z em que o rebaixo some: a folga antes da boca da frente do arco da roda. */
export const ondeORebaixoSome = (T) => T.arco.z + T.arco.raio + T.rebaixo.folgaDoArco;

/** As caixas das regiões em mm: a do rebaixo acaba, atrás, onde ele some. */
export const caixasDasPartes = (T) => ({ paralama: T.partes.paralama, rebaixo: { min: [...T.partes.rebaixo.min, ondeORebaixoSome(T)], max: T.partes.rebaixo.max } });

/** A pele analítica da TABELA: as funções de que os pontos-chave das curvas saem. */
export function pele(T) {
  const A = T.alisamento;
  const O = contornoDaPlanta(T.planta, A.planta);
  const lisa = (tab, s = A.comprimento) => alisar(pchip(tab), s);
  const nivelDa = ({ a, b, degraus }) => (z) => a + b * z + degraus.reduce((t, [h, za, zb]) => t + h * suave((za - z) / (za - zb)), 0);
  const quedaDe = (y) => { const { base, rola } = T.leis.queda; const u = Math.max(0, (y - rola.desde) / (rola.fim - rola.desde)); const t = suave((y - rola.mistura) / (rola.fim - rola.mistura)); return base.A * suave((base.ate - y) / (base.ate - base.de)) + rola.A * (1 - t) * u ** rola.p + rola.topo * t; };
  const yBase = nivelDa(T.leis.baseDoRebaixo); const yTopo = nivelDa(T.leis.topoDoRebaixo);
  const yOmbro = nivelDa(T.leis.ombro); const ySoleira = nivelDa(T.leis.soleira);
  const yTeto = lisa(T.teto, A.teto);
  const zx = lisa(T.quinaDoTeto.map(([z, x]) => [z, x]), A.quina ?? A.comprimento); const zy = lisa(T.quinaDoTeto.map(([z, , y]) => [z, y]), A.quina ?? A.comprimento);
  const zEixo = alisar(pchip(T.traseira.map(([y, z]) => [y, z])), A.perfil);
  const { profundidade, cheioAte } = T.rebaixo; const someEm = ondeORebaixoSome(T);
  const fundo = (z) => profundidade * suave((z - someEm) / (cheioAte - someEm));
  const rebaixo = (z, y) => {
    const b = yBase(z); const t = yTopo(z);
    if (y <= b || y >= t) return 0;
    /* o sino em seno à quarta: valor, inclinação e curvatura nulos na base e no topo, para o reflexo não quebrar na borda do rebaixo */
    const s = Math.sin((Math.PI * (y - b)) / (t - b));
    return fundo(z) * s ** 4;
  };
  /* a porta cai um pouco mais para dentro que o para-lama: a base da cabine (745 na seção traseira) fica 12 mm mais para dentro que a do ombro de trás, e o efeito some até z -1000 */
  const portaExtra = (z, y) => T.ombroDaPorta * suave((y - 850) / 150) * suave((z + 1000) / 300);
  /* quanto o lado sai para dentro do contorno da planta, pela normal, em z e y */
  const recuo = (z, y) => quedaDe(y) + portaExtra(z, y) + rebaixo(z, y);
  const R = (z) => [zx(z), zy(z)];
  const coroa = (z, x) => { const [xr, yr] = R(z); return yTeto(z) - (yTeto(z) - yr) * (x / xr) ** T.coroa; };
  /* o ponto 3D do contorno de arco u recuado de d pela normal, na altura y */
  const sobre = (u, d, y, w = 0) => { const [z, x] = O.ponto(u); const [nz, nx] = O.normal(u); return [x + d * ((1 - w) * -1 + w * nx), y, z + d * w * nz]; };
  return { O, quedaDe, yBase, yTopo, yOmbro, ySoleira, yTeto, R, fundo, rebaixo, recuo, coroa, zEixo, sobre };
}

const NIVEIS = ['soleira', 'base', 'meio', 'topo', 'ombro', 'coluna', 'quina', 'eixo'];
const LADO = 6; /* os níveis que correm pelo contorno da planta e dão a volta pela traseira: da soleira à coluna */

/** Uma caixa [min, max] em mm contém o ponto [x, y, z] em mm. */
const naCaixa = (p, { min, max }) => p.every((c, k) => c >= min[k] && c <= max[k]);

/** A opção `alisarCurvas` da rede, da TABELA: a tolerância das curvas que têm ponto-chave nas regiões do para-lama ou do rebaixo (as caixas
 * de `partes`), que a pessoa soltou até `regioes` mm, e a das outras (`resto`; null as deixa sem alisar); sem `alisarCurvas` na TABELA, nada. */
function alisamentoDasCurvas(T, curvas, nos) {
  const A = T.alisarCurvas;
  if (!A) return {};
  const ponto = (p) => (typeof p === 'string' ? nos[p] : p);
  const C = caixasDasPartes(T);
  const nasRegioes = curvas.filter((c) => c.pontos.some((p) => naCaixa(ponto(p), C.paralama) || naCaixa(ponto(p), C.rebaixo)));
  const porCurva = Object.fromEntries(nasRegioes.map((c) => [c.nome, A.regioes]));
  if (A.resto == null) return { alisarCurvas: { tolerancia: A.regioes, curvas: nasRegioes.map((c) => c.nome) } };
  return { alisarCurvas: { tolerancia: A.resto, toleranciaPorCurva: porCurva } };
}

/** A gaiola por rede de curvas: os nós em mm, as curvas ao comprimento e as seções, os retalhos. */
export function derivar(T) {
  const P = pele(T);
  const { O } = P;
  const D = T.degrau;
  const zs = T.estacoes;
  const iJ = zs.length - 1;
  const uJ = O.deZ(zs[iJ]);
  const uFim = O.total;
  const C = T.calota;
  const yCentro = [C.soleira, C.base, C.meio, C.topo, C.ombro, C.ombro + D.subida];
  const recuoCentro = (j) => (P.zEixo(yCentro[Math.min(j, 4)]) - O.zFim) + (j === 5 ? D.largura : 0);
  /* a altura de cada nível do lado em z */
  const yLado = (j, z) => {
    const b = P.yBase(z); const t = P.yTopo(z);
    return [P.ySoleira(z), b, (b + t) / 2, t, P.yOmbro(z), P.yOmbro(z) + D.subida][j];
  };
  /* o ponto do nível j (soleira a coluna) no contorno de arco u: no lado, a pele; na calota, a mistura suave do lado com o perfil do eixo do carro */
  const nivel = (j, u) => {
    const z = O.ponto(u)[0];
    const w = suave((u - uJ) / (uFim - uJ));
    const yl = yLado(j, z);
    const dl = j === 5 ? P.recuo(z, yLado(4, z)) + D.largura : P.recuo(z, yl);
    const y = (1 - w) * yl + w * yCentro[j];
    const d = (1 - w) * dl + w * recuoCentro(j);
    return P.sobre(u, d, y, w);
  };
  const cima = (j, z) => (j === 6 ? [...P.R(z), z] : [0, P.yTeto(z), z]);
  const nos = {};
  const nome = (i, j) => `e${i}_${NIVEIS[j]}`;
  const fixo = (p) => p.map((c) => +c.toFixed(4));
  zs.forEach((z, i) => { const u = O.deZ(z); NIVEIS.forEach((k, j) => { nos[nome(i, j)] = fixo(j < LADO ? nivel(j, u) : cima(j, z)); }); });
  NIVEIS.slice(0, LADO).forEach((k, j) => { nos[`t_${k}`] = fixo([0, yCentro[j], P.zEixo(yCentro[Math.min(j, 4)]) + (j === 5 ? D.largura : 0)]); });

  /* a seção de uma estação, vão por vão (o vão j vai do nível j ao j + 1): os pontos-chave de dentro do vão, na pele (do lado, pela altura),
   * em linha da coluna à quina e na coroa do teto */
  const dentroDoVao = (i, j) => {
    const z = zs[i]; const u = O.deZ(z); const pts = [];
    const a = nos[nome(i, j)]; const b = nos[nome(i, j + 1)];
    if (j === 6) { const xr = a[0]; for (const f of T.pontosChave.coroa) { const x = xr * f; pts.push([x, P.coroa(z, x), z]); } return pts; }
    const K = T.pontosChave.secao[j];
    for (let q = 1; q <= K; q += 1) {
      const f = q / (K + 1);
      if (j < 4) { const y = a[1] + (b[1] - a[1]) * f; pts.push(P.sobre(u, P.recuo(z, y), y)); } else pts.push(a.map((c, k) => c + (b[k] - c) * f));
    }
    return pts;
  };
  /* a seção é partida em curvas nos níveis de `partirSecaoEm`, onde cruza um vinco: o alisamento das curvas trata cada trecho à parte e não
   * arredonda a dobra do vinco, que nas estações em que ela vira menos que o ângulo de canto da rede (35 graus; o ombro vira de 28 a 68)
   * ele arredondaria até a tolerância, cada estação de um jeito. Na estação da traseira a quina não parte, porque o trecho da coluna ao
   * eixo é um lado só da tampa (o retalho de três lados). */
  const cortesDe = (i) => T.partirSecaoEm.map((k) => NIVEIS.indexOf(k)).filter((j) => !(i === iJ && j === 6));
  const trechosDe = (i) => {
    const c = cortesDe(i); const limites = [0, ...c, NIVEIS.length - 1];
    return limites.slice(0, -1).map((de, k) => ({ nome: k === 0 ? `S${i}` : `S${i}${NIVEIS[de]}`, de, ate: limites[k + 1] }));
  };
  /* o nome da curva da seção i que contém o vão j */
  const secaoDoVao = (i, j) => trechosDe(i).find((t) => j >= t.de && j < t.ate).nome;
  const curvas = [];
  zs.forEach((z, i) => {
    for (const t of trechosDe(i)) {
      const pts = [nome(i, t.de)];
      for (let j = t.de; j < t.ate; j += 1) pts.push(...dentroDoVao(i, j), nome(i, j + 1));
      curvas.push({ nome: t.nome, pontos: pts });
    }
  });

  /* as linhas ao comprimento: um ponto-chave a cada `pontosChave.comprimento` mm entre as estações */
  const vincosDe = { 4: T.vincos.ombro, 5: T.vincos.coluna, 6: T.vincos.quinaDoTeto };
  NIVEIS.forEach((k, j) => {
    const pts = [];
    zs.forEach((z, i) => {
      pts.push(nome(i, j));
      if (i === iJ) return;
      const z1 = zs[i + 1]; const n = Math.max(1, Math.round((z - z1) / T.pontosChave.comprimento) - 1);
      for (let q = 1; q <= n; q += 1) {
        const zz = z + ((z1 - z) * q) / (n + 1);
        pts.push(j < LADO ? nivel(j, O.deZ(zz)) : cima(j, zz));
      }
    });
    curvas.push({ nome: `L${j}`, pontos: pts, ...(vincosDe[j] ? { vinco: vincosDe[j] } : {}) });
  });

  /* a calota: cada nível do lado dá a volta pelo contorno da planta, da estação da traseira ao eixo do carro */
  const nVolta = Math.max(2, Math.round((uFim - uJ) / T.pontosChave.calota));
  for (let j = 0; j < LADO; j += 1) {
    const pts = [nome(iJ, j)];
    for (let q = 1; q < nVolta; q += 1) pts.push(nivel(j, uJ + ((uFim - uJ) * q) / nVolta));
    pts.push(`t_${NIVEIS[j]}`);
    const vinco = j === 4 ? T.vincos.bordaDaTampa : j === 3 ? T.vincos.topoDaCalota : vincosDe[j];
    curvas.push({ nome: `Q${j}`, pontos: pts, ...(vinco ? { vinco } : {}) });
  }

  /* o perfil da traseira no eixo do carro, de cima (a base da coluna) para baixo pelos nós */
  const perfil = [];
  for (let j = LADO - 1; j >= 0; j -= 1) {
    perfil.push(`t_${NIVEIS[j]}`);
    if (j === 0) break;
    const a = nos[`t_${NIVEIS[j]}`][1]; const b = nos[`t_${NIVEIS[j - 1]}`][1];
    const k = j === 5 ? 0 : Math.max(0, Math.round((a - b) / T.pontosChave.perfil) - 1);
    for (let s = 1; s <= k; s += 1) { const y = a + ((b - a) * s) / (k + 1); perfil.push([0, y, P.zEixo(y)]); }
  }
  curvas.push({ nome: 'perfilDaTraseira', pontos: perfil });

  /* a tampa no eixo do carro: do teto na estação da traseira até a base da coluna atrás, que fica `subida` acima da borda */
  const zJ = zs[iJ]; const tc = nos.t_coluna;
  const salto = tc[1] - P.yTeto(tc[2]);
  curvas.push({ nome: 'Qeixo', pontos: [nome(iJ, 7), ...[0.25, 0.5, 0.75].map((f) => { const z = zJ + (tc[2] - zJ) * f; return [0, P.yTeto(z) + salto * f * f, z]; }), 't_coluna'] });

  const retalhos = [];
  const lado = (curva, de, ate) => ({ curva, de, ate });
  for (let i = 0; i < iJ; i += 1) {
    for (let j = 0; j < NIVEIS.length - 1; j += 1) {
      retalhos.push({ nome: `r${i}_${NIVEIS[j]}`, borda: [lado(`L${j}`, nome(i, j), nome(i + 1, j)), lado(secaoDoVao(i + 1, j), nome(i + 1, j), nome(i + 1, j + 1)), lado(`L${j + 1}`, nome(i + 1, j + 1), nome(i, j + 1)), lado(secaoDoVao(i, j), nome(i, j + 1), nome(i, j))] });
    }
  }
  for (let j = 0; j < LADO - 1; j += 1) {
    retalhos.push({ nome: `c_${NIVEIS[j]}`, borda: [lado(`Q${j}`, nome(iJ, j), `t_${NIVEIS[j]}`), lado('perfilDaTraseira', `t_${NIVEIS[j]}`, `t_${NIVEIS[j + 1]}`), lado(`Q${j + 1}`, `t_${NIVEIS[j + 1]}`, nome(iJ, j + 1)), lado(secaoDoVao(iJ, j), nome(iJ, j + 1), nome(iJ, j))] });
  }
  retalhos.push({ nome: 'c_tampa', borda: [lado(secaoDoVao(iJ, 5), nome(iJ, 5), nome(iJ, 7)), lado('Qeixo', nome(iJ, 7), 't_coluna'), lado('Q5', 't_coluna', nome(iJ, 5))] });

  /* com `pesoDasCurvas`, a superfície só se aproxima dos pontos das curvas por mínimos quadrados, em vez de passar por eles: a interpolação exata de muitos pontos ondula */
  const comPeso = T.chapa.pesoDasCurvas ? curvas.map((c) => ({ ...c, peso: T.chapa.pesoPorCurva?.[c.nome] ?? T.chapa.pesoDasCurvas })) : curvas;
  const G1 = T.emendaG1.curvas;
  const pesadas = G1.length ? comPeso.map((c) => (G1.includes(c.nome) ? { ...c, continuidade: 'G1' } : c)) : comPeso;
  const rede = gaiolaPorRede({ passo: T.chapa.passo, anguloMax: T.chapa.anguloMax, fora: [1, 0, 0], simetria: 'x', nos, curvas: pesadas, retalhos, ...(T.chapa.liso ? { liso: T.chapa.liso } : {}), ...(G1.length ? { limitesDaEmenda: { tolerancia: T.emendaG1.tolerancia } } : {}), ...alisamentoDasCurvas(T, curvas, nos) });
  return { rede, P, zs };
}

/** O contorno de um vão em metro, escrito fechado, de uma lista de pontos [u, v] em mm: os cantos vivos ficam vivos. */
const contornoDe = (pontos) => ({ inicio: pontos[0].map(m), trechos: [...pontos.slice(1), pontos[0]].map((q) => ({ reto: q.map(m) })) });

/** O retângulo [x0, x1] por [y0, y1] com os quatro cantos arredondados em `raio`, em pontos, de 4 passos por canto. */
function retanguloArredondado(x0, x1, y0, y1, raio) {
  const pts = [];
  const canto = (cx, cy, a0) => { for (let k = 0; k <= 4; k += 1) { const a = ((a0 + 90 * (k / 4)) * Math.PI) / 180; pts.push([cx + raio * Math.cos(a), cy + raio * Math.sin(a)]); } };
  canto(x1 - raio, y1 - raio, 0); canto(x0 + raio, y1 - raio, 90); canto(x0 + raio, y0 + raio, 180); canto(x1 - raio, y0 + raio, 270);
  return pts;
}

/** Uma caixa [min, max] em mm vira a região de seleção em metro; a face entra se estiver inteira nela. */
const caixa = ({ min, max }) => ({ min: min.map(m), max: max.map(m), modo: 'contem' });

/** O contorno fechado de pontos [u, v, raio] em mm, com concordância em cada canto que tem raio, em metro; como na prancha, o filete
 * recua no máximo metade de cada reto vizinho, e o raio que não cabe vira o maior que cabe. */
const contornoComFilete = (pontos) => {
  const n = pontos.length;
  const raio = (i) => {
    const [p, a, b] = [pontos[i], pontos[(i + n - 1) % n], pontos[(i + 1) % n]];
    if (!p[2]) return 0;
    const ua = [a[0] - p[0], a[1] - p[1]]; const ub = [b[0] - p[0], b[1] - p[1]];
    const la = Math.hypot(...ua); const lb = Math.hypot(...ub);
    const teta = Math.acos(Math.max(-1, Math.min(1, (ua[0] * ub[0] + ua[1] * ub[1]) / (la * lb))));
    return Math.min(p[2], (Math.min(la, lb) / 2) * Math.tan(teta / 2));
  };
  const trechos = [];
  if (raio(0)) trechos.push({ concordancia: m(raio(0)) });
  for (let i = 1; i < n; i += 1) { const [u, v] = pontos[i]; trechos.push({ reto: [m(u), m(v)] }); if (raio(i)) trechos.push({ concordancia: m(raio(i)) }); }
  trechos.push({ reto: [m(pontos[0][0]), m(pontos[0][1])] });
  return { inicio: [m(pontos[0][0]), m(pontos[0][1])], trechos };
};

/** O vidro lateral da prancha com a borda de baixo levada acima da base da coluna (o degrau), mais a folga. */
const vidroLateralSobreODegrau = (T, P) => T.vidroLateral.map(([z, y]) => [z, Math.max(y, P.yOmbro(z) + T.degrau.subida + T.degrau.folgaDoVidro)]);

/** O vidro traseiro inteiro, [x, z, raio] na vista de cima: a metade da prancha e o espelho dela no eixo do carro. */
const vidroTraseiroInteiro = (T) => {
  const meia = T.vidroTraseiro.map(([z, x, r]) => [x, z, r]);
  return [...meia, ...meia.slice(1, -1).reverse().map(([x, z, r]) => [-x, z, r])];
};

const ARCO = { origem: { op: 'subtrair', id: 3 } };
const VIDRO = { origem: { op: 'aberturaPorContorno', id: 4 } };
const LANTERNA = { origem: { op: 'aberturaPorContorno', id: 5 } };
const VIDRO_TRASEIRO = { origem: { op: 'aberturaPorContorno', id: 6 } };

const furoDoArco = (T) => furoPassante({ solido: { origem: { op: 'subdivisao', id: 1 } }, posicao: [0, T.arco.y, T.arco.z], direcao: 'x', raio: T.arco.raio, comprimento: 2 * T.planta[3][1] + 300, lados: T.arco.lados, ids: { cilindro: 2, subtrair: 3 }, nome: 'arco' });
export const ALIASES = furoDoArco(TABELA).aliases;

/** Os PASSOS, em metro: a chapa subdividida com espessura e os quatro vãos abertos nela, o arco, o vidro lateral, a lanterna e o vidro traseiro. */
export function gerarPassos(T) {
  const { rede, P } = derivar(T);
  const L = T.lanterna;
  const arco = furoDoArco(T);
  return [
    ['subdivisao', { origemId: 1, ...rede.passo, borda: 'cantos', niveis: T.chapa.niveis, espessura: m(T.chapa.espessura), costuraExata: true }],
    ...arco.passos,
    ['aberturaPorContorno', { origemId: 4, chapa: ARCO, vista: 'x', sentido: '+', simetria: 'x', contorno: contornoDe(vidroLateralSobreODegrau(T, P)) }],
    ['aberturaPorContorno', { origemId: 5, chapa: VIDRO, vista: 'z', simetria: 'x', contorno: contornoDe(retanguloArredondado(L.x0, L.x1, L.y0, L.y1, L.raio)) }],
    ['aberturaPorContorno', { origemId: 6, chapa: LANTERNA, vista: 'y', sentido: '+', contorno: contornoComFilete(vidroTraseiroInteiro(T)) }],
    ['parte', { nome: 'chapa', sel: VIDRO_TRASEIRO }],
    ['parte', { nome: 'paralamaTraseiro', substituir: true, sel: { regiao: caixa(caixasDasPartes(T).paralama) } }],
    ['parte', { nome: 'rebaixoLateral', substituir: true, sel: { regiao: caixa(caixasDasPartes(T).rebaixo) } }],
  ];
}

/* Os extremos da caixa da chapa (o lado de x negativo inteiro e o de x positivo sem as duas regiões de parte): o fundo de trás, a soleira e o teto.
 * O mais largo do lado -x fica na boca da frente do arco, onde a planta tem 940 (z -950): sobre o eixo traseiro, onde ela chega a 950, o arco tira a chapa da altura sem queda. */
export const PONTOS = [
  { nome: 'canto de baixo de trás da chapa: o lado -x, a soleira e o fim da traseira', parte: 'chapa', medida: 'minimo', em: [-TABELA.planta[3][1], TABELA.soleira[0][1], Math.min(...TABELA.traseira.map(([, z]) => z))], toleranciaMm: 6 },
  { nome: 'canto de cima da frente da chapa: o teto sobre a porta, no corte de z 0', parte: 'chapa', medida: 'maximo', em: [TABELA.planta[3][1] - 10, TABELA.teto[1][1], 0], toleranciaMm: 6 },
];

/* O que só esta peça diz ao pacote do crítico: as pranchas estão no referencial do carro em mm (o quarto traseiro cai sobre a metade de
 * trás delas), a superior desenha o comprimento na horizontal e gira 90 graus para casar com a vista de cima, e a foto lateral, gerada
 * por IA e guardada em `referencias/locais/` fora do git, olha do lado +x, com a frente à esquerda. */
export const CRITICA = {
  pranchas: {
    'lateral.prancha.svg': { referencial: true },
    'traseira.prancha.svg': { referencial: true },
    'superior.prancha.svg': { girar: 90, referencial: true },
  },
  referencias: { 'lateral.png': 'direita', 'traseira.png': 'traseira' },
};

const receita = {
  meta: { nome: 'carro-fastback/lataria', desc: 'o quarto traseiro do cupê fastback: chapa contínua do meio da porta para trás, com para-lama saliente, rebaixo, coluna, arco e vãos' },
  PARAMS: TABELA,
  ALIASES,
  get TOPO() { return { origem: 'o centro do carro no chão: x para a direita, y para cima, a frente em +z', ...derivar(this.PARAMS).rede.pontos }; },
  PLANO: {
    objeto: 'o quarto traseiro de um cupê fastback de 4750 mm, do meio da porta para trás, lado +x',
    referencias: ['../../referencias/lateral.prancha.svg', '../../referencias/traseira.prancha.svg', '../../referencias/superior.prancha.svg', '../../referencias/locais/lateral.png', '../../referencias/locais/traseira.png'],
    escala: { medida: 'comprimento total do carro, de z -2375 a 2375', milimetros: 4750 },
    partes: [
      { nome: 'chapa', forma: 'chapa contínua de 2 mm do meio da porta à traseira, lisa, com teto, coluna até a tampa, quina, arco, degrau do ombro, degrau das lanternas (aba da tampa sobre a faixa recuada) e os vãos de vidro e lanterna', tecnica: 'subdivisao de uma gaiolaPorRede cujas arestas seguem as curvas da prancha, com os vãos por furoPassante e aberturaPorContorno' },
      { nome: 'paralamaTraseiro', forma: 'a faixa da chapa do para-lama traseiro, que sai 38 mm sobre a linha da porta vista de cima, sem moldura de arco', tecnica: 'região da mesma chapa, da pele analítica da planta (meia largura 950 contra 912)' },
      { nome: 'rebaixoLateral', forma: 'o rebaixo côncavo em cunha da lateral, do meio da porta até morrer antes do arco, sob o vinco do ombro', tecnica: 'região da mesma chapa, com um sino de profundidade entre a base e o topo do rebaixo' },
    ],
    criteriosDeReprovacao: [
      'a chapa não vai de z 0 a -2375, ou a silhueta de lado, de cima ou de trás sai da prancha além da tolerância da rodada',
      'o para-lama traseiro não sai cerca de 40 mm sobre a linha da porta, ou ganha moldura de arco',
      'o rebaixo da lateral é convexo, ou continua além do arco traseiro, ou some antes da porta',
      'falha de ondulação fora das saliências declaradas, quina do ombro sem raio, ou aresta facetada',
      'o vão do vidro lateral, o arco da roda ou o vão da lanterna ausentes, ou a coluna sem cair até a tampa',
      'a traseira sem o degrau das lanternas: a tampa que não termina em aba sobre a faixa recuada dos vãos, ou a chapa que não volta para fora abaixo dela',
    ],
    /* as três partes são a mesma chapa: a curvatura da lataria as lê juntas (só com 'chapa', o para-lama e o rebaixo saíam cinza, sem dado) */
    lataria: { partes: ['chapa', 'paralamaTraseiro', 'rebaixoLateral'] },
    saliencias: [
      { regiao: { min: [780, 250, -1950], max: [960, 1010, -700] }, sentido: 'fora', amplitudeMm: 38, motivo: 'o para-lama traseiro sai 38 mm sobre a linha da porta (950 contra 912 de meia largura, vista de cima), sem moldura, por desenho' },
      { regiao: caixasDasPartes(TABELA).rebaixo, sentido: 'dentro', amplitudeMm: TABELA.rebaixo.profundidade, motivo: 'o rebaixo côncavo em cunha da lateral, da porta até morrer antes do arco traseiro, sob o vinco do ombro, é feição de dupla curvatura desenhada' },
    ],
  },
  PONTOS,
  contatos: [],
  /* Os três vãos por contorno ficam sem moldura nesta etapa: o vidro e a borracha são da etapa de vidros e a lanterna é peça de borda, que a fatia 5 põe atrás do vão. */
  vaos: [
    { nome: 'vidroLateralTraseiro', superficie: { op: 'aberturaPorContorno', id: 4 }, semMoldura: { motivo: 'o vidro e a borracha do lateral traseiro são da etapa de vidros, que assenta na borda deste vão' } },
    { nome: 'vaoDaLanterna', superficie: { op: 'aberturaPorContorno', id: 5 }, semMoldura: { motivo: 'a lanterna é peça de borda da etapa de frente e traseira, posta atrás deste vão' } },
    { nome: 'vidroTraseiro', superficie: { op: 'aberturaPorContorno', id: 6 }, semMoldura: { motivo: 'o vidro traseiro e a borracha são da etapa de vidros, que assenta na borda deste vão; a pessoa pediu o vão sem vidro por enquanto' } },
  ],
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
