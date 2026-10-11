/* geometria.js — as medidas do roupeiro a partir dos parâmetros da família, em milímetro.

   Função pura sobre números: o `derivar`, a montagem e os testes leem daqui, de modo que a composição, o curso declarado e as
   contas dos testes vêm da mesma conta. Nada aqui conhece Three.js nem a malha.

   O QUADRO. O corpo tem a origem no chão, no centro da largura e da profundidade: x é a largura, y a altura (o chão é y = 0)
   e z a profundidade, com a frente em z = +profundidade / 2. As portas são embutidas: ficam entre as laterais, à ras da
   frente do corpo (z entre a frente menos a espessura e a frente), com 3 mm de folga em volta.

   A DISTRIBUIÇÃO. Uma porta (uma baia), duas (uma baia com o par), três (duas baias: um par e uma porta só) ou quatro (dois
   pares) e, de três portas para cima, uma divisória central entre as baias. Todas as portas têm a mesma largura. A porta de
   uma ponta gira na lateral; a que fica junto da divisória gira na divisória, em cada face dela, de modo que cada par é um par
   de portas de abrir que se encontram no meio da baia.

   A DOBRADIÇA. Cada porta tem n dobradiças da família `dobradica`, com os parâmetros derivados da altura e do peso da
   porta. O pino fica no meio da espessura da parede em que a porta gira (lateral ou divisória), a dois milímetros e meio de
   fundo atrás da frente, de modo que o tambor (pino, nós e a folga) fica inteiro dentro da espessura da parede e atrás do
   plano da frente: a folha fixa entra pelo fundo da parede, num rasgo de 2 mm, e a folha móvel entra pela borda da porta, num
   rasgo igual. Na parede se abre, na altura de cada dobradiça, um rebaixo que abre para a frente e para o vão, onde o tambor
   gira. Com a porta fechada a dobradiça está dobrada a 90 graus (a folha fixa vai para o fundo e a móvel para dentro da porta)
   e a porta abre até o curso declarado, a 110 graus nas laterais. */
import { geometriaDaDobradica } from '../dobradica/geometria.js';

export const FOLGA_DA_PORTA = 3; // mm entre a porta e o que a cerca
export const SOBREPOSICAO = 1; // mm que uma peça entra na outra para a união não ter face coincidente
export const RECUO_DA_PRATELEIRA = 2; // mm atrás da face de trás da porta (a espessura do painel mais isto, da frente)
export const RECUO_DO_RODAPE_NA_FRENTE = 50; // mm
export const RECUO_DO_RODAPE_NO_FUNDO = 20; // mm
export const RECUO_DA_DIVISORIA = 0.5; // mm atrás da frente: a divisória não tem face coplanar com as bordas do corpo
export const RAIO_DO_CABIDEIRO = 12.5; // mm (tubo de 25 mm)
export const LADOS_DO_CABIDEIRO = 16;
export const DISTANCIA_DO_CABIDEIRO_AO_TAMPO = 120; // mm do eixo do tubo até a face de baixo do tampo
export const ROUPA_PENDURADA = 1000; // mm abaixo do eixo do tubo
export const ESPACO_DO_CABIDEIRO = DISTANCIA_DO_CABIDEIRO_AO_TAMPO + ROUPA_PENDURADA;
export const DENSIDADE_DO_MDF = 7e-7; // kg/mm3 (700 kg/m3)
export const CURSO_NA_LATERAL = 110; // graus
export const FOLGA_DO_REBAIXO = 0.5; // mm entre o tambor e a parede do rebaixo
export const MARGEM_DO_REBAIXO = 3; // mm acima e abaixo da dobradiça
export const FOLGA_DO_RASGO = 0.2; // mm de cada lado da folha
export const ENTRADA_DA_FOLHA_NA_PORTA = 15; // mm que a folha móvel entra na borda da porta
export const MARGEM_DA_DOBRADICA = 80; // mm da borda da porta à borda da dobradiça
export const COMPRIMENTO_MAXIMO_DO_PUXADOR = 400; // mm
export const LARGURA_DO_PUXADOR = 20; // mm
export const SAIDA_DO_PUXADOR = 20; // mm para fora da frente

/* O ângulo máximo de uma porta que gira na divisória. As duas portas que giram nas faces da divisória abrem uma para cada
   lado e, abertas demais, se encontram na frente dela; o limite sai da conta em planta (`cursoNaDivisoria`). */
export const CURSO_MAXIMO_NA_DIVISORIA = 90;

const arredondar = (valor) => Number(valor.toPrecision(12));
export const metro = (mm) => arredondar(mm * 0.001);
const limitar = (valor, minimo, maximo) => Math.min(maximo, Math.max(minimo, valor));

/** Há divisória de três portas para cima. */
export const temDivisoria = (portas) => portas >= 3;

/** As portas de cada baia: uma porta, um par, um par e uma porta, dois pares. */
export const PORTAS_POR_BAIA = Object.freeze({ 1: [1], 2: [2], 3: [2, 1], 4: [2, 2] });

/** A largura de cada porta, em milímetro. */
export function larguraDaPorta({ largura, painel, portas }) {
  const baias = temDivisoria(portas) ? 2 : 1;
  return (largura - (baias + 1) * painel - (portas + baias) * FOLGA_DA_PORTA) / portas;
}

/** A altura de cada porta, em milímetro. */
export const alturaDaPorta = ({ altura, rodape, painel }) => altura - rodape - 2 * painel - 2 * FOLGA_DA_PORTA;

/** O peso de uma porta de MDF, em quilograma (o puxador não conta). */
export const pesoDaPorta = (p) => larguraDaPorta(p) * alturaDaPorta(p) * p.painel * DENSIDADE_DO_MDF;

/**
 * Os parâmetros da família `dobradica` para uma porta de `peso` quilogramas e `altura` milímetros, num painel de `painel`
 * milímetros. Quanto mais pesada, mais comprida a dobradiça, mais grossa a chapa e o pino e mais dobradiças; a folha tem a
 * largura que sobra depois do tambor, do afastamento até a borda da porta e da entrada na porta.
 */
export function dobradicaDaPorta({ peso, altura, painel }) {
  const pesada = peso > 12;
  const diametroPino = pesada ? 6 : 5;
  const espessura = pesada ? 2.5 : 2;
  const alturaDaDobradica = Math.round(limitar(60 + 3 * peso, 70, 120));
  /* o mínimo de nós e de furos: a folha entra num rasgo e o furo de fixação não aparece, e cada nó a mais pesa na conferência do curso */
  const nos = 3;
  const furos = 1;
  const porAltura = altura <= 900 ? 2 : altura <= 1500 ? 3 : altura <= 2100 ? 4 : 5;
  const quantidade = limitar(Math.max(2, Math.ceil(peso / 8), porAltura), 2, 5);
  const afastamento = painel / 2 + FOLGA_DA_PORTA; // do pino até a borda da porta
  const larguraFolha = Math.round((afastamento - diametroPino / 2 + ENTRADA_DA_FOLHA_NA_PORTA) * 10) / 10;
  return {
    quantidade,
    parametros: { altura: alturaDaDobradica, larguraFolha, espessura, diametroPino, nos, furos },
  };
}

/** O que cada apoio de dobradiça é: a face da parede, o lado do vão e o sentido do giro. */
const APOIOS = Object.freeze({
  'lateral-esquerda': { vao: 1 },
  'divisoria-esquerda': { vao: -1 },
  'divisoria-direita': { vao: 1 },
  'lateral-direita': { vao: -1 },
});

/**
 * Todas as medidas do roupeiro, em milímetro. `p` traz os parâmetros completos da família. Devolve o corpo, a divisória, as
 * prateleiras, o cabideiro, as portas (cada uma com as suas dobradiças) e o apoio de cada porta.
 */
export function geometriaDoRoupeiro(p) {
  const { largura, altura, profundidade, painel, portas, prateleiras, rodape, cabideiro } = p;
  const frente = profundidade / 2;
  const fundo = -profundidade / 2;
  const x0 = -largura / 2 + painel; // face interna da lateral esquerda
  const x1 = largura / 2 - painel; // face interna da lateral direita
  const yBase = rodape + painel; // face de cima da base
  const yTampo = altura - painel; // face de baixo do tampo
  const divisoria = temDivisoria(portas);
  const porBaia = PORTAS_POR_BAIA[portas];
  const wd = larguraDaPorta(p);
  const hd = alturaDaPorta(p);
  const y0 = rodape + painel + FOLGA_DA_PORTA; // a porta começa aqui
  const peso = pesoDaPorta(p);
  const dobradica = dobradicaDaPorta({ peso, altura: hd, painel });
  const dg = geometriaDaDobradica(dobradica.parametros);
  const raioDoTambor = dg.mm.raioDoNo;
  const zDoPino = frente - (raioDoTambor + FOLGA_DO_REBAIXO);
  const recuoDoPino = painel / 2; // o pino no meio da espessura da parede
  const afastamento = recuoDoPino + FOLGA_DA_PORTA; // do pino até a borda da porta
  const alturaDaDobradica = dobradica.parametros.altura;
  const stagger = portas === 4 ? alturaDaDobradica + 40 : 0;

  /* as baias: x do começo, largura e as portas */
  const baias = [];
  let x = x0;
  porBaia.forEach((n, i) => {
    const larguraDaBaia = n * wd + (n + 1) * FOLGA_DA_PORTA;
    baias.push({ indice: i, n, x, largura: larguraDaBaia, fim: x + larguraDaBaia });
    x += larguraDaBaia + (divisoria && i === 0 ? painel : 0);
  });
  const xDaDivisoria = divisoria ? { esquerda: baias[0].fim, direita: baias[0].fim + painel, centro: baias[0].fim + painel / 2 } : null;

  /* as portas, da esquerda para a direita */
  const listaDePortas = [];
  baias.forEach((baia, i) => {
    const ultima = i === baias.length - 1;
    for (let j = 0; j < baia.n; j += 1) {
      const xMin = baia.x + FOLGA_DA_PORTA + j * (wd + FOLGA_DA_PORTA);
      /* a porta da esquerda da baia gira à esquerda; no par, a da direita gira à direita; a porta só da última baia, que
         vem depois do par, gira na lateral da direita, e a porta só de uma única baia gira na lateral da esquerda */
      let apoio;
      if (baia.n === 2) apoio = j === 0 ? (i === 0 ? 'lateral-esquerda' : 'divisoria-direita') : (i === 0 && divisoria ? 'divisoria-esquerda' : 'lateral-direita');
      else apoio = ultima && divisoria ? 'lateral-direita' : 'lateral-esquerda';
      const vao = APOIOS[apoio].vao;
      const face = { 'lateral-esquerda': x0, 'lateral-direita': x1, 'divisoria-esquerda': xDaDivisoria?.esquerda, 'divisoria-direita': xDaDivisoria?.direita }[apoio];
      const xDoPino = face - vao * recuoDoPino;
      listaDePortas.push({
        indice: listaDePortas.length, baia: i, apoio, vao, face, xDoPino,
        xMin, xMax: xMin + wd,
        xDaBorda: xDoPino + vao * afastamento,
        xLivre: vao === 1 ? xMin + wd : xMin,
      });
    }
  });

  /* as dobradiças de cada porta: altura dos centros, igualmente espaçadas */
  const n = dobradica.quantidade;
  const margemDoCentro = MARGEM_DA_DOBRADICA + alturaDaDobradica / 2;
  const passo = (hd - 2 * margemDoCentro - stagger) / (n - 1);
  for (const porta of listaDePortas) {
    const deslocamento = porta.apoio === 'divisoria-direita' ? stagger : 0;
    porta.y0 = y0;
    porta.altura = hd;
    porta.curso = porta.apoio.startsWith('divisoria') ? CURSO_MAXIMO_NA_DIVISORIA : CURSO_NA_LATERAL;
    porta.dobradicas = Array.from({ length: n }, (_, k) => ({
      indice: k,
      y: y0 + margemDoCentro + deslocamento + k * passo,
      x: porta.xDoPino,
      z: zDoPino,
    }));
    porta.primeiraDobradica = porta.dobradicas[0].y;
    porta.passoDasDobradicas = passo;
  }

  /* prateleiras e cabideiro */
  const cabideiroNaBaia = cabideiro && divisoria ? baias[1] : null;
  const cabideiroNoVaoInteiro = cabideiro && !divisoria;
  const zonaDasPrateleiras = (yTampo - yBase) - (cabideiroNoVaoInteiro ? ESPACO_DO_CABIDEIRO : 0);
  const baiaDasPrateleiras = divisoria ? { x: baias[0].x, fim: baias[0].fim } : { x: x0, fim: x1 };
  const folgaEntrePrateleiras = prateleiras > 0 ? (zonaDasPrateleiras - prateleiras * painel) / (prateleiras + 1) : null;

  return {
    quadro: { frente, fundo, x0, x1, yBase, yTampo },
    wd, hd, y0, peso,
    dobradica, dobradicaGeometria: dg, raioDoTambor, zDoPino, recuoDoPino, afastamento,
    stagger,
    baias, divisoria: xDaDivisoria,
    portas: listaDePortas,
    prateleiras: prateleiras > 0 ? {
      total: prateleiras, x: baiaDasPrateleiras.x, fim: baiaDasPrateleiras.fim, zona: zonaDasPrateleiras,
      folga: folgaEntrePrateleiras, passo: folgaEntrePrateleiras + painel, yPrimeira: yBase + folgaEntrePrateleiras,
    } : null,
    cabideiro: cabideiro ? {
      x: cabideiroNaBaia ? cabideiroNaBaia.x : x0,
      fim: cabideiroNaBaia ? cabideiroNaBaia.fim : x1,
      y: yTampo - DISTANCIA_DO_CABIDEIRO_AO_TAMPO,
    } : null,
  };
}

/* Um retângulo em planta (x, z) de uma porta, no instante em que ela gira `graus` em torno do pino. O retângulo é a seção
   horizontal da porta: da borda da porta até a ponta livre, da face de trás até a frente. */
function retanguloDaPorta(g, porta, graus) {
  const { quadro } = g;
  const vao = porta.vao;
  const espessura = g.espessura;
  const rad = (graus * Math.PI) / 180;
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  const pino = [porta.xDoPino, g.zDoPino];
  const longe = porta.xLivre - porta.xDoPino;
  const perto = vao * g.afastamento;
  const cantos = [[perto, quadro.frente - espessura], [longe, quadro.frente - espessura], [longe, quadro.frente], [perto, quadro.frente]]
    .map(([dx, zAbs]) => [dx, zAbs - g.zDoPino]);
  /* a rotação leva a ponta livre para a frente (+z): com a porta no vão +x, (dx, dz) vai a (dx c - dz s, dx s + dz c); com a
     porta no vão -x, a (dx c + dz s, -dx s + dz c) */
  return cantos.map(([dx, dz]) => {
    const dxg = vao === 1 ? dx * c - dz * s : dx * c + dz * s;
    const dzg = vao === 1 ? dx * s + dz * c : -dx * s + dz * c;
    return [pino[0] + dxg, pino[1] + dzg];
  });
}

function seCruzam(a, b) {
  const eixos = [];
  for (const poligono of [a, b]) {
    for (let i = 0; i < poligono.length; i += 1) {
      const p = poligono[i];
      const q = poligono[(i + 1) % poligono.length];
      eixos.push([-(q[1] - p[1]), q[0] - p[0]]);
    }
  }
  return eixos.every(([ex, ez]) => {
    const pa = a.map(([x, z]) => x * ex + z * ez);
    const pb = b.map(([x, z]) => x * ex + z * ez);
    return Math.max(...pa) > Math.min(...pb) && Math.max(...pb) > Math.min(...pa);
  });
}

/**
 * O ângulo, no máximo `CURSO_MAXIMO_NA_DIVISORIA`, até o qual as duas portas que giram nas faces da divisória abrem juntas
 * sem se tocar, medido em planta com a seção de cada porta como retângulo. Sem divisória com quatro portas devolve o máximo.
 */
export function cursoNaDivisoria(g, painel) {
  const esquerda = g.portas.find((porta) => porta.apoio === 'divisoria-esquerda');
  const direita = g.portas.find((porta) => porta.apoio === 'divisoria-direita');
  if (!esquerda || !direita) return CURSO_MAXIMO_NA_DIVISORIA;
  const contexto = { ...g, espessura: painel };
  const livre = (graus) => !seCruzam(retanguloDaPorta(contexto, esquerda, graus), retanguloDaPorta(contexto, direita, graus));
  if (livre(CURSO_MAXIMO_NA_DIVISORIA)) return CURSO_MAXIMO_NA_DIVISORIA;
  let livreAte = 0;
  for (let graus = 0; graus <= CURSO_MAXIMO_NA_DIVISORIA; graus += 0.5) {
    if (!livre(graus)) break;
    livreAte = graus;
  }
  /* um grau a menos que o último ângulo livre, para as duas portas não ficarem encostadas no fim do curso */
  return Math.max(0, Math.floor(livreAte) - 1);
}
