/* sedan-chassi-e-lataria.esboco.mjs: o rascunho do sedã vermelho do acervo refeito como um carro é construído, um chassi (plataforma com
 * assoalho, longarinas, túnel, caixas de roda e os membros onde a lataria apoia) e a lataria em painéis de chapa separados, com 1 mm de
 * chapa e 4 mm de vão entre vizinhos. É um objeto de teste: o que ele mede é se o projeto dá a uma IA o que ela precisa para modelar
 * chassi e lataria. As dificuldades estão em `docs/modelar/banco-de-provas/sedan-chassi-e-lataria-2026-11-11/ATRITOS.md`, e as
 * medidas, as partes e os contatos, no `../ALINHAMENTO.md`.
 *
 * A REFERÊNCIA é a do `carro-sedan-classico` do acervo: `fonte-partes.json` (caixas e silhuetas em fatias, escala de 4,4 m) e
 * `fonte-vistas.png`. Os perfis da TABELA abaixo (lado, planta, seção, cabine, janelas, faróis, para-choques, rodas) são os números que
 * a receita do acervo leu dessa fonte, copiados para cá; a divisão em painéis, a espessura, os vãos e o chassi são deste rascunho.
 *
 * A LATARIA SAI DE UMA SUPERFÍCIE SÓ. `casca(esp, cortes)` monta a carroceria inteira como uma chapa fechada: o sólido de fora (o corpo
 * de baixo pela interseção dos prismas do perfil lateral, da planta e da seção, unido à cabine pela interseção do perfil lateral e da
 * seção dela) menos o mesmo sólido recuado da espessura (os perfis recuados pelo `deslocar` da `extrusao`, e o perfil lateral por
 * `recuar`, que deixa o fundo aberto), menos os cortes (arcos de roda, janelas, vãos dos faróis, da grade e das lanternas, furos dos
 * suportes dos para-choques). Cada painel é a interseção dessa casca com a REGIÃO dele: um prisma cujo contorno são as linhas de vão,
 * recuado 2 mm por `deslocar` para dentro, de modo que dois painéis vizinhos, que dividem a linha, ficam a 4 mm um do outro e sobre a
 * mesma superfície. O núcleo não copia um sólido nem parte um sólido em dois guardando os dois lados, e por isso a casca é montada de
 * novo para cada painel (ATRITOS, item 1). O vidro é a mesma construção com a casca de 4 mm e o contorno da janela recuado 2 mm.
 *
 * O CHASSI é de caixas e extrusões. O membro que encosta por dentro na lataria (soleira, montante, parede corta-fogo, suporte do
 * radiador, anteparo traseiro, caixa de roda) é desenhado passando da chapa e aparado pela interseção com o interior da casca
 * (`interior()`), e por isso acaba na face de dentro da chapa.
 *
 * Eixos: x lateral (a direita do carro em +x), y altura com o chão em 0, z comprimento com a frente em +z, centrado em x e z. Tudo em
 * mm. As cores são uma por painel, para os vãos aparecerem; a cor do objeto real está no `.conferir.json`.
 *
 * `npm run esboco:nucleo -- <este arquivo> --so-montar` dá a caixa e o relato de contatos. `SEDAN=chassi` monta só o chassi com as
 * rodas, `SEDAN=explodida` afasta os painéis do chassi, e `SEDAN_CORES=reais` pinta as partes com a cor do objeto real. */
import { readFileSync } from 'node:fs';
import { chamar, criarRegistroDeFamilias } from '../../../familias/index.js';
import { expandirChamadasDeComposicao } from '../../../nucleo/composicoes.js';

export const TABELA = {
  /* escala: fonte-partes.json, comprimento de 4,4 m, de z -2200 a 2200 (com os para-choques), altura 1523, meia largura 986 nos retrovisores */
  chapa: 1,
  vao: 4,
  vidro: 4,

  /* corpo de baixo: perfil lateral (z, y) sem os arcos, planta (z, meia largura) e seção (meia largura, y) com o alargamento dos para-lamas */
  lado: [[2122, 970], [1879, 1000], [-1421, 1000], [-2087, 972], [-2087, 460], [-1581, 419], [2122, 419]],
  planta: [[2122, 770], [2060, 852], [2000, 872], [1700, 926], [1421, 934], [871, 933], [700, 885], [560, 860], [-560, 860], [-700, 885], [-800, 913], [-1237, 928], [-1650, 911], [-1925, 888], [-2087, 880]],
  secao: [[935, 300], [935, 795], [860, 890], [860, 1100]],
  fundoAberto: 60,                /* quanto o interior passa do fundo, para a casca não ter chapa embaixo */

  /* cabine: perfil lateral (z, y) prolongado até y 950 e seção que afunila de 850 em y 1000 a 730 em y 1523 */
  cabine: [[726.9, 950], [321, 1472], [229, 1523], [-1054, 1523], [-1100, 1463], [-1283, 1066], [-1335.7, 950]],
  cabineSecao: [[850, 900], [850, 1000], [707.06, 1623]],

  /* arcos das rodas: raio do pneu mais 40 mm */
  roda: { raio: 364, largura: 205, zFrente: 1249, zTras: -1181, xCentro: 807.5, folgaDoArco: 40 },

  /* linhas de vão (o meio do vão) */
  zFrente: 2000,                  /* painel dianteiro contra capô e para-lamas */
  zTras: -2000,                   /* painel traseiro contra tampa e laterais */
  xCapo: 760,                     /* capô contra para-lama */
  zCapo: 690,                     /* fim do capô e do para-lama, começo da porta dianteira abaixo da cintura */
  xTampa: 740,                    /* tampa do porta-malas contra lateral traseira */
  zTampa: -1315,                  /* começo da tampa, atrás do pé do vidro traseiro */
  zPortas: -45,                   /* porta dianteira contra porta traseira */
  zLateral: -777,                 /* porta traseira contra lateral traseira */
  ySoleira: 470,                  /* porta contra soleira */
  yCintura: 1000,                 /* teto com as colunas contra para-lama e lateral traseira */
  yTopoDaPorta: 1470,             /* porta contra o teto */
  recuoDaColunaA: 75,             /* a borda da frente da porta dianteira, acima da cintura, paralela ao para-brisa e 75 mm atrás dele */

  /* janelas (o contorno é o meio do vão entre o vidro e a chapa) */
  paraBrisa: { y0: 1075, y1: 1425, meia0: 763, meia1: 682 },
  vidroTraseiro: { y0: 1110, y1: 1420, meia0: 755, meia1: 683 },
  janelaY0: 1075,
  janelaY1: 1420,
  quadroDaPorta: 50,              /* largura do quadro da porta em volta do vidro */
  vigia: [[-852, 1075], [-852, 1420], [-1040, 1420], [-1195, 1075]],

  /* frente e traseira */
  farol: { x0: 330, x1: 760, y0: 755, y1: 945 },
  grade: { meia: 283, y0: 765, y1: 935 },
  lanterna: { x0: 440, x1: 840, y0: 815, y1: 925 },
  paraChoqueFrente: { z0: 2126, z1: 2198, zChanfro: 2170, meia: 770, meiaPonta: 728, y0: 413, y1: 745 },
  paraChoqueTras: { z0: -2091, z1: -2200, zChanfro: -2150, meia: 856, meiaPonta: 800, y0: 457, y1: 745 },
  tomadaDeAr: { lado: [[1660, 1000], [1768, 1098], [871, 1098], [779, 1088], [720, 1000]], planta: [[1768, 446], [636, 213]] },
  retrovisor: { y0: 972, y1: 1047, z0: 321, z1: 413, x0: 840, x1: 986 },

  /* chassi */
  assoalho: { esp: 2, meia: 802, meiaTras: 638.5, perfil: [[700, 640], [600, 400], [-740, 400], [-775, 490], [-2000, 490]], zDegrau: -770 },
  tunel: [[-120, 400], [120, 400], [75, 520], [-75, 520]],
  longarina: { x0: 380, x1: 460, altura: 100, eixo: [[2121, 438], [780, 438], [650, 348], [-720, 348], [-850, 438], [-2086, 438]] },
  caixaDeRoda: { esp: 3, xParede: 637 },
  eixoRaio: 30,
  eixoMeia: 870,
};

/* ---- geometria 2D ---- */
const area = (l) => l.reduce((s, [a, b], i) => { const [c, d] = l[(i + 1) % l.length]; return s + (a * d - c * b); }, 0) / 2;
const anti = (l) => (area(l) < 0 ? [...l].reverse() : l);
const espelhar = (meia) => [...meia, ...[...meia].reverse().map(([x, y]) => [-x, y])];
const r3 = (v) => Math.round(v * 1000) / 1000;

/** O polígono com cada aresta deslocada de `dists[i]` para dentro (negativo, para fora), a aresta i do ponto i ao i + 1. */
function recuar(pol, dists) {
  const n = pol.length;
  const sinal = area(pol) < 0 ? -1 : 1;
  const linhas = pol.map((a, i) => {
    const b = pol[(i + 1) % n];
    const dx = b[0] - a[0]; const dy = b[1] - a[1]; const L = Math.hypot(dx, dy);
    return { a: [a[0] - (sinal * dy * dists[i]) / L, a[1] + (sinal * dx * dists[i]) / L], dx, dy };
  });
  return pol.map((_, i) => {
    const l1 = linhas[(i + n - 1) % n]; const l2 = linhas[i];
    const det = l1.dx * l2.dy - l1.dy * l2.dx;
    const t = ((l2.a[0] - l1.a[0]) * l2.dy - (l2.a[1] - l1.a[1]) * l2.dx) / det;
    return [r3(l1.a[0] + l1.dx * t), r3(l1.a[1] + l1.dy * t)];
  });
}

/** A faixa de espessura `esp` abaixo da polilinha (z, y), que corre de +z para -z: a polilinha e a paralela, num polígono. */
function faixa(linha, esp, centrada = false) {
  const n = linha.length;
  const normal = (a, b) => { const dx = b[0] - a[0]; const dy = b[1] - a[1]; const L = Math.hypot(dx, dy); return [-dy / L, dx / L]; };
  const desloca = (d) => linha.map((p, i) => {
    const n1 = normal(linha[Math.max(i - 1, 0)], linha[Math.max(i, 1)]);
    const n2 = normal(linha[Math.min(i, n - 2)], linha[Math.min(i + 1, n - 1)]);
    const bx = n1[0] + n2[0]; const by = n1[1] + n2[1]; const k = d / (1 + n1[0] * n2[0] + n1[1] * n2[1]);
    return [r3(p[0] + bx * k), r3(p[1] + by * k)];
  });
  const cima = centrada ? desloca(-esp / 2) : linha;
  const baixo = centrada ? desloca(esp / 2) : desloca(esp);
  return [...cima, ...baixo.reverse()];
}

const arco = (zc, yc, R, a0, a1, n) => Array.from({ length: n + 1 }, (_, k) => { const a = a0 + ((a1 - a0) * k) / n; return [r3(zc + R * Math.cos(a)), r3(yc + R * Math.sin(a))]; });
const retangulo = (u0, v0, u1, v1) => [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];

/* ---- o estado e os passos ---- */
const T = TABELA;
const MODO = process.env.SEDAN ?? 'inteiro';
const estado = { passos: [], topo: {}, origem: 0 };
const PARTES = new Map();          /* nome -> origens, para a vista explodida */
const CORES = {};

/** O prisma do polígono: no eixo x o polígono é (z, y), no z é (x, y), no y é (x, z); `deslocar` positivo é para fora. */
function prisma(eixo, pol, a0, a1, deslocar = 0) {
  const id = ++estado.origem;
  const perfil = anti(eixo === 'x' ? pol.map(([z, y]) => [-y, z]) : eixo === 'z' ? pol.map(([x, y]) => [x, -y]) : pol);
  const em = eixo === 'x' ? [a0, 0, 0] : eixo === 'z' ? [0, 0, a0] : [0, a0, 0];
  const extra = deslocar ? { deslocar: { para: deslocar > 0 ? 'fora' : 'dentro', distancia: Math.abs(deslocar), canto: 'esquadria' } } : {};
  estado.passos.push(['extrusao', { origemId: id, eixo, altura: a1 - a0, em, perfil, ...extra }]);
  return { op: 'extrusao', id };
}
function caixa(x0, x1, y0, y1, z0, z1) {
  const id = ++estado.origem;
  estado.passos.push(['cubo', { origemId: id, larg: x1 - x0, alt: y1 - y0, prof: z1 - z0, em: [(x0 + x1) / 2, y0, (z0 + z1) / 2] }]);
  return { op: 'cubo', id };
}
function bool(op, origens) {
  const id = ++estado.origem;
  estado.passos.push([op, { origemId: id, solidos: origens.map((origem) => ({ origem })) }]);
  return { op, id };
}
/* a cor do objeto real, por nome de parte, para o lado a lado com as vistas do acervo (`SEDAN_CORES=reais`) */
const corReal = (n) => (/^pneu/.test(n) ? '#151617' : /^(aro|cubo|disco)/.test(n) ? '#8a8f94' : /^(paraBrisa|vidro|vigia)/.test(n) ? '#20262d'
  : /^farol/.test(n) ? '#c9c4a6' : /^grade/.test(n) ? '#2c2f33' : /^lanterna/.test(n) ? '#5a1f1a'
    : /^(capo|tampa|painel|paraLama|soleira(Dir|Esq)$|porta|lateral|teto|tomada|retrovisor|paraChoque)/.test(n) ? '#b23a2e' : '#4a5560');
function parte(nome, origem, corDaParte) {
  const cor = process.env.SEDAN_CORES === 'reais' ? corReal(nome) : corDaParte;
  estado.passos.push(['parte', { nome, sel: { origem } }], ['pincel', { modo: 'face', sel: { origem }, cor }]);
  PARTES.set(nome, origem);
  CORES[nome] = cor;
}
/** O prisma do lado direito (x de x0 a x1) ou do esquerdo (o espelho). */
const prismaDoLado = (s, pol, x0, x1, deslocar) => (s > 0 ? prisma('x', pol, x0, x1, deslocar) : prisma('x', pol, -x1, -x0, deslocar));

/* ---- a superfície da carroceria ---- */
const PLANTA = espelhar([[T.planta[0][1], T.planta[0][0] + 80], ...T.planta.map(([z, x]) => [x, z]), [T.planta.at(-1)[1], T.planta.at(-1)[0] - 80]]);
const SECAO = espelhar(T.secao);
const CABINE_SECAO = espelhar(T.cabineSecao);
const zParaBrisa = (y) => 688 - (367 / 472) * (y - 1000);          /* a reta do para-brisa no perfil lateral */

/** O volume de dentro da chapa: o sólido de fora recuado de `esp`, com o fundo do corpo e o da cabine abertos. */
function interior(esp) {
  const lado = recuar(T.lado, [esp, esp, esp, esp, -T.fundoAberto, -T.fundoAberto, esp]);
  const cabine = recuar(T.cabine, [esp, esp, esp, esp, esp, esp, -T.fundoAberto]);
  const corpo = bool('intersectar', [prisma('x', lado, -1100, 1100), prisma('y', PLANTA, 200, 1200, -esp), prisma('z', SECAO, -2300, 2300, -esp)]);
  const cab = bool('intersectar', [prisma('x', cabine, -1100, 1100), prisma('z', CABINE_SECAO, -1400, 800, -esp)]);
  return [corpo, cab];
}

/** A carroceria inteira como uma chapa fechada de espessura `esp`, menos os cortes. */
function casca(esp, cortes = []) {
  const corpo = bool('intersectar', [prisma('x', T.lado, -1100, 1100), prisma('y', PLANTA, 300, 1100), prisma('z', SECAO, -2300, 2300)]);
  const cab = bool('intersectar', [prisma('x', T.cabine, -1100, 1100), prisma('z', CABINE_SECAO, -1400, 800)]);
  return bool('subtrair', [bool('unir', [corpo, cab]), ...interior(esp), ...cortes()]);
}

/* os contornos das janelas, das portas e dos vãos da frente e de trás (o meio do vão) */
const G = T.vao / 2;
const zPorta = (y) => zParaBrisa(y) - T.recuoDaColunaA;
const PORTA_DIANTEIRA = [[T.zCapo, T.ySoleira], [T.zCapo, T.yCintura], [zPorta(T.yCintura), T.yCintura], [zPorta(T.yTopoDaPorta), T.yTopoDaPorta], [T.zPortas, T.yTopoDaPorta], [T.zPortas, T.ySoleira]];
const PORTA_TRASEIRA = retangulo(T.zLateral, T.ySoleira, T.zPortas, T.yTopoDaPorta);
const Q = T.quadroDaPorta;
const VIDRO_DIANTEIRO = [[zPorta(T.janelaY0) - Q - 10, T.janelaY0], [zPorta(T.janelaY1) - Q - 10, T.janelaY1], [T.zPortas + Q, T.janelaY1], [T.zPortas + Q, T.janelaY0]];
const VIDRO_TRASEIRO_DA_PORTA = retangulo(T.zLateral + Q, T.janelaY0, T.zPortas - Q, T.janelaY1);
const trapezio = ({ y0, y1, meia0, meia1 }) => [[-meia0, y0], [meia0, y0], [meia1, y1], [-meia1, y1]];
const FAROL = (s) => retangulo(s * T.farol.x0, T.farol.y0, s * T.farol.x1, T.farol.y1);
const GRADE = retangulo(-T.grade.meia, T.grade.y0, T.grade.meia, T.grade.y1);
const LANTERNA = (s) => retangulo(s * T.lanterna.x0, T.lanterna.y0, s * T.lanterna.x1, T.lanterna.y1);
const SUPORTE = { x0: 384, x1: 456, frente: [444, 486], tras: [462, 486] };
const FURO = (s, [y0, y1]) => retangulo(s * (SUPORTE.x0 - 4), y0 - 4, s * (SUPORTE.x1 + 4), y1 + 4);
const R_ARCO = T.roda.raio + T.roda.folgaDoArco;
const circulo = (zc, R, n = 48) => arco(zc, T.roda.raio, R, 0, 2 * Math.PI * (1 - 1 / n), n - 1);

/** Os cortes da chapa: arcos, janelas com o vão do vidro, vãos dos faróis, da grade e das lanternas, furos dos suportes. */
function cortesDaChapa() {
  const c = [prisma('x', circulo(T.roda.zFrente, R_ARCO), -1100, 1100), prisma('x', circulo(T.roda.zTras, R_ARCO), -1100, 1100)];
  c.push(prisma('z', trapezio(T.paraBrisa), 200, 800, G), prisma('z', trapezio(T.vidroTraseiro), -1400, -900, G));
  for (const s of [1, -1]) {
    for (const pol of [VIDRO_DIANTEIRO, VIDRO_TRASEIRO_DA_PORTA, T.vigia]) c.push(prismaDoLado(s, pol, 600, 1100, G));
    c.push(prisma('z', FAROL(s), 2000, 2300, G), prisma('z', LANTERNA(s), -2300, -2000, G));
    c.push(prisma('z', FURO(s, SUPORTE.frente), 2000, 2300), prisma('z', FURO(s, SUPORTE.tras), -2300, -2000));
  }
  c.push(prisma('z', GRADE, 2000, 2300, G));
  return c;
}

/** Um painel: a casca cortada, só dentro da região (os prismas dados por quem chama, já recuados do meio vão). */
function painel(nome, cor, regiao, tirar = () => []) {
  const dentro = bool('intersectar', [casca(T.chapa, cortesDaChapa), regiao()]);
  const fora = tirar();
  parte(nome, fora.length ? bool('subtrair', [dentro, ...fora]) : dentro, cor);
}
/** Um vidro: a casca de 4 mm sem corte, só dentro do contorno da janela recuado do meio vão. */
function vidro(nome, regiao) {
  parte(nome, bool('intersectar', [casca(T.vidro, () => []), regiao()]), '#20262d');
}

function lataria() {
  const LADOS = [[1, 'Dir'], [-1, 'Esq']];
  painel('capo', '#d9483b', () => prisma('y', retangulo(-T.xCapo, T.zCapo, T.xCapo, T.zFrente), 900, 1200, -G));
  painel('tampaDoPortaMalas', '#e08a2c', () => prisma('y', retangulo(-T.xTampa, T.zTras, T.xTampa, T.zTampa), 900, 1200, -G));
  painel('painelDianteiro', '#8e44ad', () => prisma('y', retangulo(-1100, T.zFrente, 1100, 2400), 300, 1200, -G));
  painel('painelTraseiro', '#16a085', () => prisma('y', retangulo(-1100, -2400, 1100, T.zTras), 300, 1200, -G));
  for (const [s, lado] of LADOS) {
    painel(`paraLama${lado}`, s > 0 ? '#2e86c1' : '#5dade2', () => prismaDoLado(s, retangulo(T.zCapo, 380, T.zFrente, 1100), T.xCapo + G, 1100, -G));
    painel(`soleira${lado}`, s > 0 ? '#7f8c8d' : '#95a5a6', () => prismaDoLado(s, retangulo(T.zLateral, 380, T.zCapo, T.ySoleira), 700, 1100, -G));
    painel(`portaDianteira${lado}`, s > 0 ? '#27ae60' : '#58d68d', () => prismaDoLado(s, PORTA_DIANTEIRA, 700, 1100, -G));
    painel(`portaTraseira${lado}`, s > 0 ? '#f1c40f' : '#f7dc6f', () => prismaDoLado(s, PORTA_TRASEIRA, 700, 1100, -G));
    painel(`lateralTraseira${lado}`, s > 0 ? '#c0392b' : '#e6b0aa', () => prismaDoLado(s, [[T.zLateral, 380], [T.zLateral, T.yCintura], [T.zTampa, T.yCintura], [T.zTampa, 1100], [T.zTras, 1100], [T.zTras, 380]], T.xTampa + G, 1100, -G));
  }
  painel('teto', '#ec7063', () => caixa(-1100, 1100, T.yCintura + G, 1700, -1400, 800), () => LADOS.flatMap(([s]) => [prismaDoLado(s, PORTA_DIANTEIRA, 600, 1100, G), prismaDoLado(s, PORTA_TRASEIRA, 600, 1100, G)]));

  vidro('paraBrisa', () => prisma('z', trapezio(T.paraBrisa), 200, 800, -G));
  vidro('vidroTraseiro', () => prisma('z', trapezio(T.vidroTraseiro), -1400, -900, -G));
  for (const [s, lado] of LADOS) {
    vidro(`vidroDianteiro${lado}`, () => prismaDoLado(s, VIDRO_DIANTEIRO, 600, 1100, -G));
    vidro(`vidroTraseiroDaPorta${lado}`, () => prismaDoLado(s, VIDRO_TRASEIRO_DA_PORTA, 600, 1100, -G));
    vidro(`vigia${lado}`, () => prismaDoLado(s, T.vigia, 600, 1100, -G));
  }

  /* o que se prende na lataria e não é chapa dela */
  const A = T.tomadaDeAr;
  const plantaDaTomada = espelhar([[A.planta[0][1], A.planta[0][0] + 20], [A.planta[1][1], A.planta[1][0] - 20]].map(([x, z]) => [x, z]));
  parte('tomadaDeAr', bool('intersectar', [prisma('x', A.lado, -600, 600), prisma('y', plantaDaTomada, 950, 1150)]), '#a93226');
  const V = T.retrovisor;
  for (const [s, lado] of LADOS) parte(`retrovisor${lado}`, s > 0 ? caixa(V.x0, V.x1, V.y0, V.y1, V.z0, V.z1) : caixa(-V.x1, -V.x0, V.y0, V.y1, V.z0, V.z1), '#922b21');
  for (const [s, lado] of LADOS) {
    const f = T.farol; const l = T.lanterna;
    const [fa, fb] = s > 0 ? [f.x0 + G, f.x1 - G] : [-f.x1 + G, -f.x0 - G];
    const [la, lb] = s > 0 ? [l.x0 + G, l.x1 - G] : [-l.x1 + G, -l.x0 - G];
    parte(`farol${lado}`, caixa(fa, fb, f.y0 + G, f.y1 - G, 2090, 2126), '#f4f1d0');
    parte(`lanterna${lado}`, caixa(la, lb, l.y0 + G, l.y1 - G, -2091, -2060), '#7b241c');
  }
  parte('grade', caixa(-T.grade.meia + G, T.grade.meia - G, T.grade.y0 + G, T.grade.y1 - G, 2085, 2122), '#2c3e50');
  const pf = T.paraChoqueFrente; const pt = T.paraChoqueTras;
  parte('paraChoqueDianteiro', prisma('y', [[-pf.meia, pf.z0], [pf.meia, pf.z0], [pf.meia, pf.zChanfro], [pf.meiaPonta, pf.z1], [-pf.meiaPonta, pf.z1], [-pf.meia, pf.zChanfro]], pf.y0, pf.y1), '#bdc3c7');
  parte('paraChoqueTraseiro', prisma('y', [[pt.meia, pt.z0], [pt.meia, pt.zChanfro], [pt.meiaPonta, pt.z1], [-pt.meiaPonta, pt.z1], [-pt.meia, pt.zChanfro], [-pt.meia, pt.z0]], pt.y0, pt.y1), '#aab7b8');
}

/* ---- o chassi ---- */
/** O sólido aparado pelo interior da chapa: acaba na face de dentro dela. */
const aparar = (origem) => bool('intersectar', [origem, bool('unir', interior(T.chapa))]);

function chassi() {
  const A = T.assoalho; const L = T.longarina; const C = T.caixaDeRoda;
  const AZUL = '#34495e'; const CINZA = '#7b8794'; const CLARO = '#aeb6bf'; const OCRE = '#b9770e';

  /* assoalho: a chapa da cabine, com a rampa dos pés e o degrau de trás, e a do porta-malas, mais estreita, entre as caixas de roda */
  const iDegrau = A.perfil.findIndex(([z]) => z < A.zDegrau);
  const daCabine = [...A.perfil.slice(0, iDegrau + 1)];
  const deTras = [[A.zDegrau, A.perfil[iDegrau][1]], ...A.perfil.slice(iDegrau + 1)];
  parte('assoalho', bool('unir', [prisma('x', faixa(daCabine, A.esp), -A.meia, A.meia), prisma('x', faixa(deTras, A.esp), -A.meiaTras, A.meiaTras)]), CLARO);
  parte('tunel', prisma('z', T.tunel, -740, 620), CINZA);

  /* longarinas: dois perfis fechados de 80 por 100, com o rebaixo sob a cabine, da face de dentro do painel dianteiro à do traseiro */
  const perfilDaLongarina = faixa(L.eixo, L.altura, true);
  parte('longarinaDir', prisma('x', perfilDaLongarina, L.x0, L.x1), AZUL);
  parte('longarinaEsq', prisma('x', perfilDaLongarina, -L.x1, -L.x0), AZUL);
  parte('travessaDianteira', caixa(-L.x1 - 2, L.x1 + 2, 388, 488, 1900, 1960), AZUL);
  parte('travessaCentral', caixa(-L.x1 - 2, L.x1 + 2, 298, 398, -30, 30), AZUL);
  parte('travessaTraseira', caixa(-L.x1 - 2, L.x1 + 2, 388, 488, -1960, -1900), AZUL);

  /* os membros que encostam por dentro na lataria, aparados pelo interior da chapa */
  parte('paredeCortaFogo', aparar(caixa(-1000, 1000, 630, 1100, 700, 703)), CINZA);
  parte('suporteDoRadiador', aparar(caixa(-1000, 1000, 486, 1100, 1840, 1870)), CINZA);
  /* o anteparo fecha o porta-malas atrás do banco: uma parede entre as caixas de roda e uma faixa de lado a lado acima delas */
  parte('anteparoTraseiro', aparar(bool('unir', [caixa(-C.xParede - 1.5, C.xParede + 1.5, 490, 1100, -1360, -1340), caixa(-1000, 1000, 800, 1100, -1360, -1340)])), CINZA);
  /* as travessas da linha de cintura, por dentro do pé do para-brisa e do pé do vidro traseiro, onde o teto com as colunas assenta */
  parte('travessaDoPainel', aparar(caixa(-1000, 1000, 940, 1040, 660, 686)), OCRE);
  parte('travessaDaCabine', aparar(caixa(-1000, 1000, 940, 1040, -1311, -1280)), OCRE);
  for (const [s, lado] of [[1, 'Dir'], [-1, 'Esq']]) {
    const x = (a, b) => (s > 0 ? [a, b] : [-b, -a]);
    /* a soleira do chassi sobe 6 mm acima da linha de vão da porta, e os montantes A e C passam 6 mm das linhas de vão das portas:
       a borda da porta fecha contra eles e o vão não deixa ver através do carro */
    parte(`soleiraDoChassi${lado}`, aparar(caixa(...x(800, 1000), 380, T.ySoleira + 6, T.zLateral + 2, 701.5)), AZUL);
    parte(`montanteA${lado}`, aparar(caixa(...x(800, 1000), 460, 1040, 600, T.zCapo + 6)), OCRE);
    /* os montantes B e C partem de x 700 para chegar ao teto, que em y 1523 tem 730 de meia largura */
    parte(`montanteB${lado}`, aparar(caixa(...x(700, 1000), 460, 1530, -75, -15)), OCRE);
    /* o montante C tem um pé estreito à frente do pneu, que desce até a soleira do chassi por trás da linha de vão da porta */
    parte(`montanteC${lado}`, aparar(bool('unir', [caixa(...x(700, 1000), 560, 1530, -835, T.zLateral + 6), caixa(...x(804, 1000), 460, 562, T.zLateral - 8, T.zLateral + 6)])), OCRE);
    /* o reforço da cintura corre por dentro do pé da coluna C, do montante C à travessa de trás da cabine */
    parte(`reforcoDaCintura${lado}`, aparar(caixa(...x(700, 1000), 940, 1040, -1295, -830)), OCRE);
    parte(`longarinaSuperior${lado}`, caixa(...x(600, 638.5), 700, 780, 701.5, 1841.5), AZUL);
    for (const [zc, ponta] of [[T.roda.zFrente, 'Dianteira'], [T.roda.zTras, 'Traseira']]) {
      const R = R_ARCO; const yb = T.lado.at(-1)[1]; const yc = T.roda.raio;
      const a1 = Math.asin((yb - yc) / (R + C.esp)); const a0 = Math.asin((yb - yc) / R);
      const anel = [...arco(zc, yc, R + C.esp, a1, Math.PI - a1, 24), ...arco(zc, yc, R, Math.PI - a0, a0, 24)];
      const parede = arco(zc, yc, R + C.esp, a1, Math.PI - a1, 24);
      parte(`caixaDeRoda${ponta}${lado}`, aparar(bool('unir', [prismaDoLado(s, anel, C.xParede + 1.5, 1000), prismaDoLado(s, parede, C.xParede, C.xParede + C.esp)])), CINZA);
    }
    parte(`suporteDoParaChoqueDianteiro${lado}`, caixa(...x(SUPORTE.x0, SUPORTE.x1), ...SUPORTE.frente, 2050, T.paraChoqueFrente.z0 + 2), CINZA);
    parte(`suporteDoParaChoqueTraseiro${lado}`, caixa(...x(SUPORTE.x0, SUPORTE.x1), ...SUPORTE.tras, T.paraChoqueTras.z0 - 2, -2050), CINZA);
  }
  for (const [zc, ponta] of [[T.roda.zFrente, 'Dianteiro'], [T.roda.zTras, 'Traseiro']]) {
    const id = ++estado.origem;
    estado.passos.push(['extrusao', { origemId: id, eixo: 'x', altura: 2 * T.eixoMeia, em: [-T.eixoMeia, 0, 0], perfil: { circulo: { raio: T.eixoRaio, centro: [-T.roda.raio, zc] } }, segmentosArco: 8 }]);
    parte(`eixo${ponta}`, { op: 'extrusao', id }, '#566573');
  }
}

/* ---- as rodas, pela família roda-pneu ---- */
const MEDIDAS_DA_FAMILIA = { lathe: ['perfil', 'em'], cubo: ['larg', 'alt', 'prof', 'em'], arranja: ['d', 'pivo'] };
const emMm = (v) => (typeof v === 'number' ? Math.round(v * 1e7) / 1e4 : Array.isArray(v) ? v.map(emMm) : v);
const comBase = (v, base) => {
  if (Array.isArray(v)) return v.map((x) => comBase(x, base));
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, k === 'origemId' || (k === 'id' && typeof v.op === 'string') ? x + base : comBase(x, base)]));
  return v;
};
export const PERFIL_DA_RODA = 'carro';
function rodas() {
  const familia = JSON.parse(readFileSync(new URL('../../../familias/roda-pneu/familia.json', import.meta.url), 'utf8'));
  const registro = criarRegistroDeFamilias();
  /* o perfil `carro` é um 205/55 R16 de 632 mm; a fonte tem o pneu de 728 por 205, e o resto do perfil vai em proporção */
  const parametros = { ...familia.perfis[PERFIL_DA_RODA].parametros, diametroPneu: 2 * T.roda.raio, larguraPneu: T.roda.largura / (2 * T.roda.raio) };
  const daFamilia = expandirChamadasDeComposicao(registro.registroComposicoes, [chamar(registro.obter('roda-pneu'), 'roda', parametros)]).passos;
  const COR = { pneu: '#151617', aro: '#9aa0a6', cubo: '#7d8389', disco: '#b4b9be' };
  for (const [s, lado] of [[1, 'Dir'], [-1, 'Esq']]) for (const [zc, ponta] of [[T.roda.zFrente, 'Dianteira'], [T.roda.zTras, 'Traseira']]) {
    const base = estado.origem; let maior = 0; const nomeadas = [];
    for (const passo of daFamilia) {
      const [op, args] = comBase(passo, base);
      if (op === 'publicarPorta' || op === 'material' || op === 'solido') continue;
      if (Number.isFinite(args.origemId)) maior = Math.max(maior, args.origemId);
      if (op === 'parte') { nomeadas.push([args.nome, args.sel.origem]); continue; }
      estado.passos.push([op, Object.fromEntries(Object.entries(args).map(([k, v]) => [k, (MEDIDAS_DA_FAMILIA[op] ?? []).includes(k) ? emMm(v) : v]))]);
    }
    estado.origem = Math.max(estado.origem, maior);
    for (const [nome, origem] of nomeadas) {
      if (s < 0) estado.passos.push(['rotaciona', { eixo: 'y', graus: 180, pivo: [0, 0, 0], sel: { origem } }]);
      estado.passos.push(['transladar', { d: [s * T.roda.xCentro, T.roda.raio, zc], sel: { origem } }]);
      parte(`${nome}${ponta}${lado}`, origem, COR[nome]);
      estado.passos.push(['liso', { sel: { origem }, angulo: 35 }]);
    }
  }
}

chassi();
rodas();
if (MODO !== 'chassi') lataria();

/* a vista explodida: cada painel afastado do chassi no sentido em que ele sai do carro */
const AFASTA = [
  [/^capo$|^tomadaDeAr$/, [0, 420, 150]], [/^tampaDoPortaMalas$/, [0, 420, -150]], [/^teto$|^paraBrisa$|^vidroTraseiro$|^vigia/, [0, 650, 0]],
  [/^painelDianteiro$|^farol|^grade$/, [0, 0, 450]], [/^painelTraseiro$|^lanterna/, [0, 0, -450]],
  [/^paraChoqueDianteiro$/, [0, 0, 750]], [/^paraChoqueTraseiro$/, [0, 0, -750]],
  [/^paraLama/, [380, 0, 160]], [/^lateralTraseira/, [380, 0, -160]], [/^soleira(Dir|Esq)$/, [300, -160, 0]],
  [/^portaDianteira|^vidroDianteiro|^retrovisor/, [520, 0, 60]], [/^portaTraseira|^vidroTraseiroDaPorta/, [520, 0, -60]],
  [/^(pneu|aro|cubo|disco)/, [330, 0, 0]],
];
if (MODO === 'explodida') {
  for (const [nome, origem] of PARTES) {
    const regra = AFASTA.find(([re]) => re.test(nome));
    if (!regra) continue;
    const [dx, dy, dz] = regra[1];
    const s = /Esq$/.test(nome) ? -1 : 1;
    estado.passos.push(['transladar', { d: [/Dir$|Esq$/.test(nome) ? s * dx : 0, dy, dz], sel: { origem } }]);
  }
}

/* ---- os contatos esperados ---- */
const par = (a, b, relacao, motivo) => ({ par: [a, b], relacao, motivo });
export const CONTATOS = [];
const SOLDA = 'membros do chassi soldados um no outro';
for (const L of ['Dir', 'Esq']) {
  CONTATOS.push(
    /* a lataria apoiada no chassi */
    par(`paraLama${L}`, 'paredeCortaFogo', 'encosta', 'a faixa de cima do para-lama assenta no topo da parede corta-fogo'),
    par(`paraLama${L}`, 'suporteDoRadiador', 'encosta', 'o para-lama assenta no topo e na lateral do suporte do radiador'),
    par(`paraLama${L}`, `caixaDeRodaDianteira${L}`, 'encosta', 'a borda do arco assenta na caixa de roda'),
    par(`paraLama${L}`, `soleiraDoChassi${L}`, 'encosta', 'o pé de trás do para-lama assenta na ponta da soleira do chassi'),
    par(`soleira${L}`, `soleiraDoChassi${L}`, 'encosta', 'a chapa da soleira veste a soleira do chassi'),
    par(`soleira${L}`, `montanteA${L}`, 'encosta', 'a chapa da soleira assenta no pé do montante A'),
    par(`soleira${L}`, `montanteB${L}`, 'encosta', 'a chapa da soleira assenta no pé do montante B'),
    par(`portaDianteira${L}`, `montanteA${L}`, 'encosta', 'a porta dianteira fecha contra o montante A, onde ficam as dobradiças'),
    par(`portaDianteira${L}`, `montanteB${L}`, 'encosta', 'a porta dianteira fecha contra o montante B, onde fica a fechadura'),
    par(`portaTraseira${L}`, `montanteB${L}`, 'encosta', 'a porta traseira fecha contra o montante B, onde ficam as dobradiças'),
    par(`lateralTraseira${L}`, `montanteC${L}`, 'encosta', 'a lateral traseira assenta no montante C'),
    par(`lateralTraseira${L}`, `caixaDeRodaTraseira${L}`, 'encosta', 'a borda do arco assenta na caixa de roda'),
    par(`lateralTraseira${L}`, 'anteparoTraseiro', 'encosta', 'a lateral traseira assenta na ponta do anteparo'),
    par('teto', `montanteA${L}`, 'encosta', 'o pé da coluna A assenta no topo do montante A'),
    par(`paraLama${L}`, `montanteA${L}`, 'encosta', 'a borda de trás do para-lama assenta no montante A'),
    par(`portaTraseira${L}`, `montanteC${L}`, 'encosta', 'a porta traseira fecha contra o montante C, onde fica a fechadura'),
    par(`portaDianteira${L}`, `soleiraDoChassi${L}`, 'encosta', 'a borda de baixo da porta fecha contra a soleira do chassi'),
    par(`portaTraseira${L}`, `soleiraDoChassi${L}`, 'encosta', 'a borda de baixo da porta fecha contra a soleira do chassi'),
    par('teto', `reforcoDaCintura${L}`, 'encosta', 'o pé da coluna C assenta no reforço da cintura'),
    par(`lateralTraseira${L}`, `reforcoDaCintura${L}`, 'encosta', 'a borda de cima da lateral traseira assenta no reforço da cintura'),
    par(`lateralTraseira${L}`, 'travessaDaCabine', 'encosta', 'a lateral traseira assenta na ponta da travessa de trás da cabine'),
    par(`reforcoDaCintura${L}`, `montanteC${L}`, 'atravessa', SOLDA), par(`reforcoDaCintura${L}`, 'travessaDaCabine', 'atravessa', SOLDA),
    par(`montanteA${L}`, 'travessaDoPainel', 'atravessa', SOLDA),
    par('teto', `montanteB${L}`, 'encosta', 'o teto assenta no topo do montante B'),
    par('teto', `montanteC${L}`, 'encosta', 'a coluna C e o teto assentam no montante C'),
    par('painelDianteiro', `longarina${L}`, 'encosta', 'o painel dianteiro assenta na ponta da longarina'),
    par('painelTraseiro', `longarina${L}`, 'encosta', 'o painel traseiro assenta na ponta da longarina'),
    /* o chassi */
    par('assoalho', `longarina${L}`, 'encosta', 'o assoalho assenta nas longarinas'),
    par('anteparoTraseiro', `caixaDeRodaTraseira${L}`, 'atravessa', SOLDA),
    par('assoalho', `caixaDeRodaTraseira${L}`, 'atravessa', 'a beira do assoalho de trás entra 1,5 mm na parede da caixa de roda (o relato mede a caixa, não o sólido)'),
    par('assoalho', `soleiraDoChassi${L}`, 'atravessa', SOLDA),
    par('assoalho', `montanteA${L}`, 'atravessa', SOLDA),
    par(`caixaDeRodaDianteira${L}`, `longarinaSuperior${L}`, 'atravessa', SOLDA),
    par(`longarinaSuperior${L}`, 'paredeCortaFogo', 'atravessa', SOLDA),
    par(`longarinaSuperior${L}`, 'suporteDoRadiador', 'atravessa', SOLDA),
    par(`caixaDeRodaTraseira${L}`, `montanteC${L}`, 'atravessa', 'o montante C nasce sobre a caixa de roda'),
    par('eixoDianteiro', `longarina${L}`, 'atravessa', 'o eixo é preso sob a longarina (a suspensão fica fora do rascunho)'),
    par('eixoTraseiro', `longarina${L}`, 'atravessa', 'o eixo é preso sob a longarina (a suspensão fica fora do rascunho)'),
    par(`longarina${L}`, 'travessaDianteira', 'atravessa', SOLDA), par(`longarina${L}`, 'travessaCentral', 'atravessa', SOLDA), par(`longarina${L}`, 'travessaTraseira', 'atravessa', SOLDA),
    par(`longarina${L}`, 'suporteDoRadiador', 'atravessa', SOLDA),
    par(`longarina${L}`, `suporteDoParaChoqueDianteiro${L}`, 'atravessa', 'o suporte sai de dentro da longarina'),
    par(`longarina${L}`, `suporteDoParaChoqueTraseiro${L}`, 'atravessa', 'o suporte sai de dentro da longarina'),
    par(`montanteA${L}`, `soleiraDoChassi${L}`, 'atravessa', SOLDA), par(`montanteB${L}`, `soleiraDoChassi${L}`, 'atravessa', SOLDA), par(`montanteC${L}`, `soleiraDoChassi${L}`, 'atravessa', SOLDA),
    par('paraChoqueDianteiro', `suporteDoParaChoqueDianteiro${L}`, 'atravessa', 'o suporte entra 2 mm no para-choque'),
    par('paraChoqueTraseiro', `suporteDoParaChoqueTraseiro${L}`, 'atravessa', 'o suporte entra 2 mm no para-choque'),
    par(`portaDianteira${L}`, `retrovisor${L}`, 'atravessa', 'o pé do retrovisor entra na chapa da porta'),
    /* os vãos da lataria */
    par('capo', `paraLama${L}`, 'folga', 'vão de 4 mm'), par(`paraLama${L}`, `portaDianteira${L}`, 'folga', 'vão de 4 mm'),
    par(`portaDianteira${L}`, `portaTraseira${L}`, 'folga', 'vão de 4 mm'), par(`portaTraseira${L}`, `lateralTraseira${L}`, 'folga', 'vão de 4 mm'),
    par(`portaDianteira${L}`, `soleira${L}`, 'folga', 'vão de 4 mm'), par(`portaTraseira${L}`, `soleira${L}`, 'folga', 'vão de 4 mm'),
    par(`lateralTraseira${L}`, 'tampaDoPortaMalas', 'folga', 'vão de 4 mm'), par(`lateralTraseira${L}`, 'painelTraseiro', 'folga', 'vão de 4 mm'),
    par(`paraLama${L}`, 'painelDianteiro', 'folga', 'vão de 4 mm'), par(`portaDianteira${L}`, 'teto', 'folga', 'vão de 4 mm'), par(`portaTraseira${L}`, 'teto', 'folga', 'vão de 4 mm'),
    par(`vidroDianteiro${L}`, `portaDianteira${L}`, 'folga', 'o vidro fica no vão da janela, 4 mm em toda a volta; a canaleta fica fora do rascunho'),
    par(`vidroTraseiroDaPorta${L}`, `portaTraseira${L}`, 'folga', 'o vidro fica no vão da janela, 4 mm em toda a volta; a canaleta fica fora do rascunho'),
    par(`vigia${L}`, 'teto', 'folga', 'o vidro fica no vão da coluna C, 4 mm em toda a volta; a borracha fica fora do rascunho'),
    par(`farol${L}`, 'painelDianteiro', 'folga', 'o farol fica no vão do painel, 4 mm em toda a volta; a fixação fica fora do rascunho'),
    par(`lanterna${L}`, 'painelTraseiro', 'folga', 'a lanterna fica no vão do painel, 4 mm em toda a volta; a fixação fica fora do rascunho'),
  );
  for (const P of ['Dianteira', 'Traseira']) {
    CONTATOS.push(
      par(`aro${P}${L}`, `pneu${P}${L}`, 'encosta', 'o talão do pneu assenta no aro (família roda-pneu)'),
      par(`aro${P}${L}`, `disco${P}${L}`, 'atravessa', 'a borda do disco entra na parede do aro (família roda-pneu)'),
      par(`cubo${P}${L}`, `disco${P}${L}`, 'atravessa', 'a borda de dentro do disco entra no cubo (família roda-pneu)'),
      par(`cubo${P}${L}`, P === 'Dianteira' ? 'eixoDianteiro' : 'eixoTraseiro', 'folga', 'o cubo gira no eixo, com 8,6 mm de folga no raio'),
    );
  }
}
CONTATOS.push(
  par('capo', 'paredeCortaFogo', 'encosta', 'a borda de trás do capô assenta no topo da parede corta-fogo'),
  par('capo', 'suporteDoRadiador', 'encosta', 'a frente do capô assenta no topo do suporte do radiador'),
  par('capo', 'tomadaDeAr', 'encosta', 'a tomada de ar assenta sobre o capô'),
  par('tampaDoPortaMalas', 'anteparoTraseiro', 'encosta', 'a borda da frente da tampa assenta no topo do anteparo'),
  par('teto', 'travessaDoPainel', 'encosta', 'o pé do para-brisa assenta na travessa do painel'),
  par('teto', 'travessaDaCabine', 'encosta', 'o pé do vidro traseiro assenta na travessa de trás da cabine'),
  par('assoalho', 'tunel', 'encosta', 'o túnel assenta no assoalho'),
  par('assoalho', 'travessaCentral', 'encosta', 'o assoalho assenta na travessa'),
  par('assoalho', 'travessaTraseira', 'encosta', 'o assoalho de trás assenta na travessa'),
  par('assoalho', 'anteparoTraseiro', 'encosta', 'o anteparo nasce do assoalho de trás'),
  par('assoalho', 'paredeCortaFogo', 'atravessa', SOLDA),
  par('capo', 'painelDianteiro', 'folga', 'vão de 4 mm'), par('tampaDoPortaMalas', 'painelTraseiro', 'folga', 'vão de 4 mm'),
  par('capo', 'teto', 'folga', 'o capô acaba 6 mm à frente do pé do para-brisa'), par('tampaDoPortaMalas', 'teto', 'folga', 'a tampa começa 5 mm atrás do pé do vidro traseiro'),
  par('paraBrisa', 'teto', 'folga', 'o vidro fica no vão, 4 mm em toda a volta; a borracha fica fora do rascunho'),
  par('vidroTraseiro', 'teto', 'folga', 'o vidro fica no vão, 4 mm em toda a volta; a borracha fica fora do rascunho'),
  par('grade', 'painelDianteiro', 'folga', 'a grade fica no vão do painel, 4 mm em toda a volta; a fixação fica fora do rascunho'),
  par('painelDianteiro', 'paraChoqueDianteiro', 'folga', 'o para-choque fica 4 mm à frente do painel, preso pelos suportes'),
  par('painelTraseiro', 'paraChoqueTraseiro', 'folga', 'o para-choque fica 4 mm atrás do painel, preso pelos suportes'),
);

export const CORES_DAS_PARTES = CORES;
export default {
  plano: 'O sedã vermelho do acervo em rascunho, refeito como chassi e lataria: a plataforma com assoalho, longarinas, túnel e caixas de roda, e os painéis de chapa de 1 mm tirados de uma superfície só, com 4 mm de vão.',
  vista: 'isometrica',
  opcoes: [{
    titulo: MODO === 'chassi' ? 'chassi e rodas' : MODO === 'explodida' ? 'painéis afastados do chassi' : 'sedã em chassi e lataria',
    nota: 'rascunho de diagnóstico; uma cor por painel',
    passos: estado.passos,
    topo: estado.topo,
    contatos: MODO === 'inteiro' ? CONTATOS : [],
  }],
};
