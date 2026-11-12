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
 * A LATARIA SAI DE UMA SUPERFÍCIE SÓ, MONTADA UMA VEZ. `casca(esp)` monta a carroceria inteira como uma chapa fechada: o sólido de fora
 * (o corpo de baixo pela interseção dos prismas do perfil lateral, da planta e da seção, unido à cabine pela interseção do perfil lateral
 * e da seção dela) menos o mesmo sólido recuado da espessura (os perfis recuados pelo `deslocar` da `extrusao`, e o perfil lateral por
 * `recuar`, que deixa o fundo aberto). `paineisPorVaos`, do núcleo, parte essa chapa pelas LINHAS de vão, cada uma desenhada numa vista,
 * num `subtrair` só, e nomeia cada painel pelo ponto visto dele (`linhasDeVao` e `sementes`, antes de `lataria`). A linha que fica numa
 * face só, ou em faces da mesma parede, vai no modo superfície, com a lâmina varrida sobre a chapa e as paredes do corte normais a ela:
 * os vidros, os furos da frente e de trás, as linhas do capô e da tampa, o contorno das portas acima da cintura, a soleira e o fim da
 * porta traseira. Essa linha corta só a camada vista do `lado`, e a de lado é escrita para os dois lados do carro. Os três planos de
 * corte que atravessam o carro, a linha de cintura e a linha entre as portas, que passam pelo degrau do ombro, e os arcos de roda vão no
 * modo vista, em que a lâmina atravessa o carro. O arco de roda, os vãos dos faróis, da grade e das lanternas e os furos dos suportes
 * são linhas fechadas com o pedaço de dentro descartado; cada janela é uma linha fechada cujo pedaço de dentro é o vidro, que por isso
 * tem a espessura da chapa. As duas versões anteriores e o que o modo superfície ainda não resolve estão no ATRITOS.
 *
 * O CHASSI é de caixas e extrusões. O membro que encosta por dentro na lataria (soleira, montante, parede corta-fogo, suporte do
 * radiador, anteparo traseiro, caixa de roda) é desenhado passando da chapa e aparado pela interseção com o interior da casca, e por
 * isso acaba na face de dentro da chapa. O interior é construído uma vez por espessura e copiado no lugar para cada membro (`arranja`
 * com `coincidente`). As quatro rodas saem de uma chamada de `instanciaDeFamilia`.
 *
 * Eixos: x lateral (a direita do carro em +x), y altura com o chão em 0, z comprimento com a frente em +z, centrado em x e z. Tudo em
 * mm. As cores são uma por painel, para os vãos aparecerem; a cor do objeto real está no `.conferir.json`.
 *
 * `npm run esboco:nucleo -- <este arquivo> --so-montar` dá a caixa e o relato de contatos, e `npm run vao:partes -- <este arquivo>
 * --esperado=4 --tolerancia=0.2` mede o vão e o degrau de cada par, com as folgas de desenho e as partes soltas de propósito declaradas
 * na opção (`CONTATOS` e `APOIA`). `SEDAN=chassi` monta só o chassi com as rodas, `SEDAN=explodida` afasta os painéis do chassi,
 * `SEDAN_CORES=reais` pinta as partes com a cor do objeto real, e `SEDAN_PLANOS=superficie` troca os três planos de corte por linhas de
 * superfície, para reproduzir o que o ATRITOS registra delas. */
import { instanciaDeFamilia } from '../../../../tools/modelar/instancia-de-familia.mjs';
import { paineisPorVaos } from '../../../nucleo/paineis-por-vaos.js';

export const TABELA = {
  /* escala: fonte-partes.json, comprimento de 4,4 m, de z -2200 a 2200 (com os para-choques), altura 1523, meia largura 986 nos retrovisores */
  chapa: 1,
  vao: 4,

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
  zFrente: 1990,                  /* painel dianteiro contra capô e para-lamas; 10 mm atrás da quina da planta em z 2000, onde o vão teria degrau */
  zTras: -2000,                   /* painel traseiro contra tampa e laterais */
  xCapo: 760,                     /* capô contra para-lama */
  zCapo: 690,                     /* fim do capô e do para-lama, começo da porta dianteira abaixo da cintura */
  xTampa: 740,                    /* tampa do porta-malas contra lateral traseira */
  zTampa: -1315,                  /* começo da tampa, atrás do pé do vidro traseiro */
  zPortas: -45,                   /* porta dianteira contra porta traseira */
  zLateral: -760,                 /* porta traseira contra lateral traseira; 21 mm à frente do arco, para a lateral não acabar em lasca */
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
  caixaDeRoda: { esp: 3, xParede: 637, solda: 0.5 },
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
const PARTES = new Map();          /* nome -> seleção, para a vista explodida */
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
/** A placa de seção em anel (z, y) varrida ao longo de x de `a0` a `a1` com `n + 1` estações, como gaiola literal (`subdivisao` com `niveis: 0`): as faces são as quadriláteras entre
 *  estações vizinhas, e não a tira única de ponta a ponta que a extrusão dá. Uma chapa de 2 a 3 mm em 1,6 a 2 m tem a borda de 0,0015 de razão de aspecto (face fina), e a
 *  corte por uma booleana também (a tampa de 3 por 1.400 mm que a pele deixa no alto da parede corta-fogo); com as estações, a borda e a tampa saem em `n` pedaços e o corte leva
 *  um vértice a cada estação. `anel` é o contorno fechado, de m cantos pares: os primeiros m/2 são a linha de cima e os outros a de baixo, na ordem inversa (a saída de `faixa`).
 *  As tampas são os quadriláteros entre as duas linhas. A união de sólidos que só se tocam pela face (as fatias) deixava arestas abertas, e a gaiola não tem esse problema. */
function placaPorEstacoes(anel, a0, a1, n) {
  const id = ++estado.origem;
  const m = anel.length; const meio = m / 2;
  const vertices = [];
  for (let k = 0; k <= n; k += 1) for (const [z, y] of anel) vertices.push([r3(a0 + ((a1 - a0) * k) / n), y, z]);
  const v = (k, i) => k * m + (((i % m) + m) % m);
  const faces = [];
  for (let k = 0; k < n; k += 1) for (let i = 0; i < m; i += 1) faces.push([v(k, i), v(k, i + 1), v(k + 1, i + 1), v(k + 1, i)]);
  for (let i = 0; i + 1 < meio; i += 1) {
    faces.push([v(0, m - 1 - i), v(0, m - 2 - i), v(0, i + 1), v(0, i)]);
    faces.push([v(n, i), v(n, i + 1), v(n, m - 2 - i), v(n, m - 1 - i)]);
  }
  /* a normal para fora: o volume com sinal tem de ser positivo, senão inverte a ordem de todas as faces */
  let volume = 0;
  for (const f of faces) { const q = f.map((c) => vertices[c]); for (let t = 1; t + 1 < q.length; t += 1) volume += (q[0][0] * (q[t][1] * q[t + 1][2] - q[t][2] * q[t + 1][1]) + q[0][1] * (q[t][2] * q[t + 1][0] - q[t][0] * q[t + 1][2]) + q[0][2] * (q[t][0] * q[t + 1][1] - q[t][1] * q[t + 1][0])) / 6; }
  estado.passos.push(['subdivisao', { origemId: id, vertices, faces: volume < 0 ? faces.map((f) => [...f].reverse()) : faces, niveis: 0 }]);
  return { op: 'subdivisao', id };
}
/** Orienta as faces de uma gaiola fechada: as que dividem uma aresta a percorrem em sentidos opostos, e o volume com sinal sai positivo (a normal para fora). */
function orientarGaiola(vertices, faces) {
  const saida = faces.map((f) => [...f]);
  const porAresta = new Map();
  saida.forEach((f, k) => f.forEach((a, i) => { const b = f[(i + 1) % f.length]; const c = Math.min(a, b) + '_' + Math.max(a, b); (porAresta.get(c) ?? porAresta.set(c, []).get(c)).push(k); }));
  const visto = new Set([0]); const fila = [0];
  const sentido = (f, a, b) => { const i = f.indexOf(a); return f[(i + 1) % f.length] === b ? 1 : f[(i + f.length - 1) % f.length] === b ? -1 : 0; };
  while (fila.length) {
    const k = fila.shift(); const f = saida[k];
    f.forEach((a, i) => {
      const b = f[(i + 1) % f.length];
      for (const q of porAresta.get(Math.min(a, b) + '_' + Math.max(a, b))) {
        if (q === k || visto.has(q)) continue;
        if (sentido(saida[q], a, b) === 1) saida[q].reverse();
        visto.add(q); fila.push(q);
      }
    });
  }
  if (visto.size !== saida.length) throw new Error('orientarGaiola: a gaiola tem faces desconexas');
  let volume = 0;
  for (const f of saida) { const q = f.map((c) => vertices[c]); for (let t = 1; t + 1 < q.length; t += 1) volume += (q[0][0] * (q[t][1] * q[t + 1][2] - q[t][2] * q[t + 1][1]) + q[0][1] * (q[t][2] * q[t + 1][0] - q[t][0] * q[t + 1][2]) + q[0][2] * (q[t][0] * q[t + 1][1] - q[t][1] * q[t + 1][0])) / 6; }
  return volume < 0 ? saida.map((f) => [...f].reverse()) : saida;
}
/** A caixa de roda como gaiola literal (`subdivisao` com `niveis: 0`): a aba em anel (a coroa do arco, de x `xf0` a `xf1`) e a chapa do domo (o segmento de disco de x `xp0` a `xp1`, com `xp1`
 *  igual a `xf0`) no mesmo sólido, sem a união de dois prismas. A união deixava, nas faces do arco que as duas dividiam (a chapa e a aba coplanares em x 638,5 a 640), 12 a 15 tiras de 0,2 mm
 *  por 300 mm; a de dois sólidos que só se tocam pela face deixava 52 arestas abertas (o núcleo reconstrói a face da chapa sem as arestas do anel). `O` e `I` são o arco de fora e o de dentro
 *  (z, y), `xs` o sinal do lado. */
function caixaDeRodaLiteral(O, I, [xp0, xp1, xf1], xs) {
  const id = ++estado.origem;
  const vertices = []; const indice = new Map();
  const v = (camada, nome, k) => {
    const chave = `${camada}${nome}${k}`;
    if (!indice.has(chave)) { const [z, y] = nome === 'O' ? O[k] : I[k]; indice.set(chave, vertices.push([r3(xs * { a: xp0, b: xp1, c: xf1 }[camada]), y, z]) - 1); }
    return indice.get(chave);
  };
  const n = O.length - 1; const faces = [];
  /* as quatro pontas da corda em y = yb, na ordem de z crescente: O[n], I[0], I[n], O[0] */
  const corda = (camada) => [v(camada, 'O', n), v(camada, 'I', 0), v(camada, 'I', n), v(camada, 'O', 0)];
  faces.push([...Array.from({ length: n + 1 }, (_, k) => v('a', 'O', k)), v('a', 'I', 0), v('a', 'I', n)].reverse().slice().reverse()); /* a tampa da chapa em x xp0 */
  for (let k = 0; k < n; k += 1) {
    faces.push([v('a', 'O', k), v('a', 'O', k + 1), v('b', 'O', k + 1), v('b', 'O', k)]); /* o arco de fora da chapa */
    faces.push([v('b', 'O', k), v('b', 'O', k + 1), v('c', 'O', k + 1), v('c', 'O', k)]); /* o arco de fora da aba */
    faces.push([v('b', 'I', k), v('b', 'I', k + 1), v('c', 'I', k + 1), v('c', 'I', k)]); /* o arco de dentro da aba */
    faces.push([v('c', 'O', k), v('c', 'O', k + 1), v('c', 'I', n - k - 1), v('c', 'I', n - k)]); /* a tampa da aba em x xf1 */
  }
  const ca = corda('a'); const cb = corda('b');
  for (let k = 0; k < 3; k += 1) faces.push([ca[k], ca[k + 1], cb[k + 1], cb[k]]); /* o fundo da chapa, em y = yb */
  faces.push([v('b', 'I', 0), ...Array.from({ length: n }, (_, k) => v('b', 'I', k + 1))]); /* o vão da chapa em x xp1, dentro do arco de dentro da aba */
  const cc = corda('c');
  faces.push([cb[0], cb[1], cc[1], cc[0]], [cb[2], cb[3], cc[3], cc[2]]); /* o fundo da aba: as duas pontas da coroa */
  estado.passos.push(['subdivisao', { origemId: id, vertices, faces: orientarGaiola(vertices, faces), niveis: 0 }]);
  return { op: 'subdivisao', id };
}
/** A polilinha com pontos alinhados a cada `passo` mm no máximo: a tampa de uma chapa comprida sai em quadriláteros de `passo` por espessura. */
function repartir(linha, passo) {
  const saida = [linha[0]];
  for (let i = 1; i < linha.length; i += 1) {
    const [a, b] = [linha[i - 1], linha[i]]; const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / passo));
    for (let k = 1; k <= n; k += 1) saida.push([r3(a[0] + ((b[0] - a[0]) * k) / n), r3(a[1] + ((b[1] - a[1]) * k) / n)]);
  }
  return saida;
}
/* a cor do objeto real, por nome de parte, para o lado a lado com as vistas do acervo (`SEDAN_CORES=reais`) */
const corReal = (n) => (/^pneu/.test(n) ? '#151617' : /^(aro|cubo|disco)/.test(n) ? '#8a8f94' : /^(paraBrisa|vidro|vigia)/.test(n) ? '#20262d'
  : /^farol/.test(n) ? '#c9c4a6' : /^grade/.test(n) ? '#2c2f33' : /^lanterna/.test(n) ? '#5a1f1a'
    : /^(capo|tampa|painel|paraLama|soleira(Dir|Esq)$|porta|lateral|teto|tomada|retrovisor|paraChoque)/.test(n) ? '#b23a2e' : '#4a5560');
const corDe = (nome, corDaParte) => (process.env.SEDAN_CORES === 'reais' ? corReal(nome) : corDaParte);
function parte(nome, origem, corDaParte) {
  const cor = corDe(nome, corDaParte);
  estado.passos.push(['parte', { nome, sel: { origem } }], ['pincel', { modo: 'face', sel: { origem }, cor }]);
  PARTES.set(nome, { origem });
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

/** A carroceria inteira como uma chapa fechada de espessura `esp`. */
function casca(esp) {
  const corpo = bool('intersectar', [prisma('x', T.lado, -1100, 1100), prisma('y', PLANTA, 300, 1100), prisma('z', SECAO, -2300, 2300)]);
  const cab = bool('intersectar', [prisma('x', T.cabine, -1100, 1100), prisma('z', CABINE_SECAO, -1400, 800)]);
  return bool('subtrair', [bool('unir', [corpo, cab]), ...interior(esp)]);
}

/* os contornos das janelas, das portas e dos vãos da frente e de trás (o meio do vão) */
const G = T.vao / 2;
const zPorta = (y) => zParaBrisa(y) - T.recuoDaColunaA;
const Q = T.quadroDaPorta;
const VIDRO_DIANTEIRO = [[zPorta(T.janelaY0) - Q - 10, T.janelaY0], [zPorta(T.janelaY1) - Q - 10, T.janelaY1], [T.zPortas + Q, T.janelaY1], [T.zPortas + Q, T.janelaY0]];
const VIDRO_TRASEIRO_DA_PORTA = retangulo(T.zLateral + Q, T.janelaY0, T.zPortas - Q, T.janelaY1);
const trapezio = ({ y0, y1, meia0, meia1 }) => [[-meia0, y0], [meia0, y0], [meia1, y1], [-meia1, y1]];
const FAROL = (s) => retangulo(s * T.farol.x0, T.farol.y0, s * T.farol.x1, T.farol.y1);
const GRADE = retangulo(-T.grade.meia, T.grade.y0, T.grade.meia, T.grade.y1);
const LANTERNA = (s) => retangulo(s * T.lanterna.x0, T.lanterna.y0, s * T.lanterna.x1, T.lanterna.y1);
/* o suporte de trás é mais estreito que a longarina, para a ponta dela assentar no painel traseiro dos dois lados do furo */
const SUPORTE = { x0: 384, x1: 456, frente: [444, 486], tras: [462, 486], xTras: [404, 436] };
const FURO = (s, [y0, y1], [x0, x1] = [SUPORTE.x0, SUPORTE.x1]) => retangulo(s * (x0 - G), y0 - G, s * (x1 + G), y1 + G);
const R_ARCO = T.roda.raio + T.roda.folgaDoArco;
/** A altura da face de cima do corpo em z, pelo perfil lateral. */
function yDoTopo(z) {
  const topo = T.lado.slice(0, 4);
  for (let i = 0; i + 1 < topo.length; i += 1) { const [z0, y0] = topo[i]; const [z1, y1] = topo[i + 1]; if (z <= z0 && z >= z1) return y0 + ((y1 - y0) * (z0 - z)) / (z0 - z1); }
  throw new Error(`yDoTopo: z ${z} fica fora do corpo`);
}
/** A meia largura da planta em z. */
function xDaPlanta(z) {
  for (let i = 0; i + 1 < T.planta.length; i += 1) { const [z0, x0] = T.planta[i]; const [z1, x1] = T.planta[i + 1]; if (z <= z0 && z >= z1) return x0 + ((x1 - x0) * (z0 - z)) / (z0 - z1); }
  throw new Error(`xDaPlanta: z ${z} fica fora do corpo`);
}
/** Os trechos da linha de lado que desce a parede do corpo em z, um por face: a faixa de cima, a faixa inclinada do ombro e a parede da
 *  planta. Cada trecho acaba a `ponta` mm da dobra, e o ajudante alonga as duas pontas que se encontram e fecha o canto. Uma linha só,
 *  atravessando as duas dobras, o núcleo recusa. A distância da ponta à dobra foi escolhida por tentativa: com 0,5 mm a emenda deixa
 *  um dente no lado esquerdo do carro, e com 0,1, 0,25 e 0,375 mm o relato de contatos dá o anteparo atravessando a lateral esquerda
 *  (ATRITOS, terceira etapa). */
function descendoAParede(z, yInicio, yFim, ponta) {
  const [xDeCima, yDaDobra] = T.secao[2]; const [xDeBaixo, yDeBaixo] = T.secao[1];
  const x = Math.min(xDaPlanta(z), xDeBaixo);
  if (x <= xDeCima) return [[[z, yInicio], [z, yFim]]];
  const yDaFaixa = yDaDobra - ((x - xDeCima) * (yDaDobra - yDeBaixo)) / (xDeBaixo - xDeCima);
  return [[[z, yInicio], [z, yDaDobra + ponta]], [[z, yDaDobra - ponta], [z, yDaFaixa + ponta]], [[z, yDaFaixa - ponta], [z, yFim]]];
}
const circulo = (zc, R, n = 48) => arco(zc, T.roda.raio, R, 0, 2 * Math.PI * (1 - 1 / n), n - 1);

/* As linhas de vão, cada uma o meio do vão na vista em que foi desenhada: 'x' é a vista de lado ([z, y]), 'y' a de cima ([x, z]) e 'z'
   a de frente ([x, y]). As linhas que ficam numa face só, ou em faces da mesma parede, vão no modo superfície: a lâmina é varrida
   sobre a chapa, com as paredes normais a ela, e corta só a camada vista do `lado`, de modo que a linha de lado vale para um lado do
   carro e `dosDoisLados` a escreve para os dois. Ficam no modo vista, em que a lâmina atravessa o carro, os três planos de corte, as
   linhas que passam pelo degrau de 10 mm da cintura, que a vista de lado vê de perfil, e os arcos de roda, que uma linha só corta
   dos dois lados. */
const SUPERFICIE = { modo: 'superficie' };
const PLANOS = process.env.SEDAN_PLANOS ?? 'vista';
const DE_CIMA = { ...SUPERFICIE, alcance: [900, 1200] };       /* só a face de cima do corpo; o teto da cabine fica acima do alcance */
const dosDoisLados = (linha) => [{ ...linha, ...SUPERFICIE, nome: `${linha.nome}Dir`, lado: '+' }, { ...linha, ...SUPERFICIE, nome: `${linha.nome}Esq`, lado: '-' }];
function linhasDeVao() {
  const yC = T.yCintura; const yT = T.yTopoDaPorta;
  const ABAIXO = 300; const ACIMA = 1100;    /* abaixo da borda de baixo da chapa e acima da face de cima do corpo: a linha sai pela borda */
  const aoMeio = (nome, z, yInicio) => ({ nome, eixo: 'x', pontos: [[z, yInicio], [z, ABAIXO]] });
  /* A linha não dobra a aresta viva entre duas faces: cada face tem a sua, na vista em que aparece, as pontas acabam a PONTA mm da
     aresta, e o ajudante alonga as duas que se encontram e fecha o canto. O plano de corte que atravessa o carro é a linha de cima,
     na face de cima, e a de lado em cada parede, esta em um trecho por face da parede (`descendoAParede`). */
  const PONTA = 1;
  const xT = T.secao.at(-1)[0] - PONTA;
  const deCima = (nome, z) => ({ nome, eixo: 'y', pontos: [[-xT, z], [xT, z]], ...DE_CIMA });
  const deLado = (nome, z, yInicio = yDoTopo(z) - PONTA) => descendoAParede(z, yInicio, ABAIXO, 0.75 * PONTA).flatMap((pontos, k) => dosDoisLados({ nome: `${nome}${k + 1}`, eixo: 'x', pontos }));
  const fechada = (nome, eixo, pontos, extra = {}) => ({ nome, eixo, pontos, fechada: true, ...extra });
  const furo = (nome, lado, pontos) => fechada(nome, 'z', pontos, { ...SUPERFICIE, lado, dentro: 'descarta' });
  const L = [
    /* os planos de corte que atravessam o carro, a frente, a traseira e o fim do capô e do para-lama: uma linha de lado em modo vista,
       que corta a face de cima e as duas paredes, com a lâmina compensada pela parede inclinada na planta. Com
       `SEDAN_PLANOS=superficie` cada plano vira a linha de cima e três de lado por parede, que montam, com a lâmina alargada a 4,09
       mm, e deixam o relato de contatos com recusas (ATRITOS, terceira etapa) */
    ...(PLANOS === 'superficie'
      ? [deCima('frente', T.zFrente), ...deLado('frenteDaParede', T.zFrente), deCima('tras', T.zTras), ...deLado('trasDaParede', T.zTras), deCima('peDoParaBrisa', T.zCapo), ...deLado('fimDoParaLama', T.zCapo)]
      : [aoMeio('frente', T.zFrente, ACIMA), aoMeio('tras', T.zTras, ACIMA), aoMeio('fimDoParaLama', T.zCapo, yC + PONTA)]),
    deCima('peDoVidroTraseiro', T.zTampa),
    /* a linha de cintura, de lado e através do carro (modo vista): o pé das colunas A e C fica no degrau do ombro. Onde ela encontra
       a linha de uma coluna, que é de outro modo e não fecha canto com ela, passa até a borda de fora do vão da coluna */
    { nome: 'cinturaDaFrente', eixo: 'x', pontos: [[T.zCapo, yC], [zPorta(yC) - T.vao, yC]] },
    { nome: 'cinturaDeTras', eixo: 'x', pontos: [[T.zLateral + G, yC], [T.zTampa - G, yC]] },
    { nome: 'entrePortas', eixo: 'x', pontos: [[T.zPortas, T.ySoleira], [T.zPortas, yT]] },
    /* o contorno das portas acima da cintura, na parede da cabine: três linhas por lado, com os cantos fechados pelo ajudante */
    ...dosDoisLados({ nome: 'colunaA', eixo: 'x', pontos: [[zPorta(yC + PONTA), yC + PONTA], [zPorta(yT), yT]] }),
    ...dosDoisLados({ nome: 'topoDasPortas', eixo: 'x', pontos: [[zPorta(yT), yT], [T.zLateral, yT]] }),
    ...dosDoisLados({ nome: 'colunaC', eixo: 'x', pontos: [[T.zLateral, yT], [T.zLateral, yC + PONTA]] }),
    /* abaixo da cintura: o fim da porta traseira, que sai pela borda de baixo da chapa, e a soleira */
    ...deLado('fimDaPortaTraseira', T.zLateral, yC - PONTA),
    ...dosDoisLados({ nome: 'soleira', eixo: 'x', pontos: [[T.zCapo, T.ySoleira], [T.zLateral, T.ySoleira]] }),
    ...dosDoisLados(fechada('janelaDianteira', 'x', VIDRO_DIANTEIRO)),
    ...dosDoisLados(fechada('janelaTraseira', 'x', VIDRO_TRASEIRO_DA_PORTA)),
    ...dosDoisLados(fechada('janelaDaVigia', 'x', T.vigia)),
    /* o arco de roda fica no modo vista, que corta os dois lados numa linha */
    fechada('arcoDianteiro', 'x', circulo(T.roda.zFrente, R_ARCO - G), { dentro: 'descarta' }),
    fechada('arcoTraseiro', 'x', circulo(T.roda.zTras, R_ARCO - G), { dentro: 'descarta' }),
    /* de frente e de trás, na face que o `lado` vê */
    fechada('janelaDoParaBrisa', 'z', trapezio(T.paraBrisa), { ...SUPERFICIE, lado: '+' }),
    fechada('janelaDoVidroTraseiro', 'z', trapezio(T.vidroTraseiro), { ...SUPERFICIE, lado: '-' }),
    furo('vaoDaGrade', '+', GRADE),
  ];
  for (const [s, lado] of [[1, 'Dir'], [-1, 'Esq']]) {
    /* o capô e a tampa contra o para-lama e a lateral: em T sobre os planos de corte */
    L.push({ nome: `capo${lado}`, eixo: 'y', pontos: [[s * T.xCapo, T.zCapo], [s * T.xCapo, T.zFrente]], ...DE_CIMA });
    L.push({ nome: `tampa${lado}`, eixo: 'y', pontos: [[s * T.xTampa, T.zTampa], [s * T.xTampa, T.zTras]], ...DE_CIMA });
    L.push(furo(`vaoDoFarol${lado}`, '+', FAROL(s)), furo(`vaoDaLanterna${lado}`, '-', LANTERNA(s)));
    L.push(furo(`furoDoSuporteDianteiro${lado}`, '+', FURO(s, SUPORTE.frente)), furo(`furoDoSuporteTraseiro${lado}`, '-', FURO(s, SUPORTE.tras, SUPORTE.xTras)));
  }
  return L;
}

/* O ponto visto de cada painel e a cor dele: [nome, eixo, ponto, cor, lado]. Os dos dois lados têm o mesmo ponto, visto de + e de -. */
function sementes() {
  const P = [
    ['capo', 'y', [300, 1000], '#d9483b'], ['tampaDoPortaMalas', 'y', [0, -1650], '#e08a2c'], ['teto', 'y', [0, -400], '#ec7063'],
    ['painelDianteiro', 'z', [0, 600], '#8e44ad', '+'], ['painelTraseiro', 'z', [0, 600], '#16a085', '-'],
    ['paraBrisa', 'z', [0, 1250], '#20262d', '+'], ['vidroTraseiro', 'z', [0, 1250], '#20262d', '-'],
  ];
  const DOS_LADOS = [
    ['paraLama', [1400, 900], '#2e86c1', '#5dade2'], ['soleira', [0, 445], '#7f8c8d', '#95a5a6'], ['portaDianteira', [300, 700], '#27ae60', '#58d68d'],
    ['portaTraseira', [-400, 700], '#f1c40f', '#f7dc6f'], ['lateralTraseira', [-1600, 900], '#c0392b', '#e6b0aa'],
    ['vidroDianteiro', [200, 1250], '#20262d', '#20262d'], ['vidroTraseiroDaPorta', [-400, 1250], '#20262d', '#20262d'], ['vigia', [-950, 1250], '#20262d', '#20262d'],
  ];
  for (const [nome, ponto, corDir, corEsq] of DOS_LADOS) P.push([`${nome}Dir`, 'x', ponto, corDir, '+'], [`${nome}Esq`, 'x', ponto, corEsq, '-']);
  return P;
}

export let MEDIDAS_DOS_PAINEIS = null;
function lataria() {
  const LADOS = [[1, 'Dir'], [-1, 'Esq']];
  /* a casca, montada uma vez: os passos dela saem do estado e vão ao ajudante, que os devolve com as lâminas, o corte e as partes */
  const inicio = estado.passos.length;
  const origem = casca(T.chapa);
  const passosDaCasca = estado.passos.splice(inicio);
  const P = sementes();
  const g = paineisPorVaos({ chapa: { passos: passosDaCasca, origem }, vao: T.vao, linhas: linhasDeVao(),
    paineis: P.map(([nome, eixo, ponto, , lado]) => ({ nome, eixo, ponto, ...(lado ? { lado } : {}) })) });
  MEDIDAS_DOS_PAINEIS = { medidas: g.medidas, avisos: g.avisos };
  estado.passos.push(...g.passos);
  estado.origem = g.proximoId - 1;
  for (const [nome, , , corDaParte] of P) {
    const cor = corDe(nome, corDaParte);
    estado.passos.push(['pincel', { modo: 'face', sel: { grupo: nome }, cor }]);
    PARTES.set(nome, { grupo: nome });
    CORES[nome] = cor;
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
/* O encosto fica meio micrômetro aquém da chapa, dentro da tolerância de 0,001 mm do relato: com as duas faces no mesmo plano, vindas
   de booleanas diferentes, o ruído numérico fazia um lado do carro sair como encosta e o outro como travessia. */
const ENCOSTO = 0.0005;
/* O interior é construído uma vez por espessura e copiado no lugar (`arranja` com `coincidente`): a interseção consome o que recebe, e
   cada `aparar` gasta um uso, a fonte no primeiro e uma cópia nomeada em cada um dos seguintes. Os passos do interior e o `arranja`, que
   precisa do total de usos, entram no começo do chassi depois de ele ser escrito (`emitirInteriores`). */
const INTERIORES = new Map();
function usoDoInterior(esp) {
  let it = INTERIORES.get(esp);
  if (!it) {
    const inicio = estado.passos.length;
    const fonte = bool('unir', interior(esp));
    it = { passos: estado.passos.splice(inicio), fonte, idDasCopias: ++estado.origem, usos: 0 };
    INTERIORES.set(esp, it);
  }
  it.usos += 1;
  return it.usos === 1 ? it.fonte : { op: 'arranja', id: it.idDasCopias, de: it.fonte, nome: `uso${it.usos}` };
}
function emitirInteriores(posicao) {
  const passos = [];
  for (const it of INTERIORES.values()) {
    passos.push(...it.passos);
    if (it.usos > 1) passos.push(['arranja', { modo: 'linear', total: it.usos, coincidente: true, origemId: it.idDasCopias, derivaDe: it.fonte, sel: { origem: it.fonte }, nomes: Array.from({ length: it.usos - 1 }, (_, k) => `uso${k + 2}`) }]);
  }
  estado.passos.splice(posicao, 0, ...passos);
}
const aparar = (origem, esp = T.chapa + ENCOSTO) => bool('intersectar', [origem, usoDoInterior(esp)]);

function chassi() {
  const A = T.assoalho; const L = T.longarina; const C = T.caixaDeRoda;
  const comeco = estado.passos.length;
  const AZUL = '#34495e'; const CINZA = '#7b8794'; const CLARO = '#aeb6bf'; const OCRE = '#b9770e';

  /* assoalho: a chapa da cabine, com a rampa dos pés e o degrau de trás, e a do porta-malas, mais estreita, entre as caixas de roda */
  const iDegrau = A.perfil.findIndex(([z]) => z < A.zDegrau);
  const daCabine = [...A.perfil.slice(0, iDegrau + 1)];
  const deTras = [[A.zDegrau, A.perfil[iDegrau][1]], ...A.perfil.slice(iDegrau + 1)];
  /* as estações caem fora do x de 380 a 460 das longarinas (cinco na cabine, em x ±481,6 e ±160,8, e três atrás, em ±212,8): o degrau do assoalho (z -740 a -775, de y 400 a 490) corta a rampa
     da longarina (z -720 a -850, de y 398 a 488; a ponta do degrau entra até 21 mm nela), e a medida de contatos só vê a entrada pelos vértices; uma estação em x ±401 a mostrava e dava
     `atravessa` onde o par se declara `encosta`. O defeito é do rascunho (ATRITOS), e não da estação */
  parte('assoalho', bool('unir', [placaPorEstacoes(faixa(repartir(daCabine, 350), A.esp), -A.meia, A.meia, 5), placaPorEstacoes(faixa(repartir(deTras, 350), A.esp), -A.meiaTras, A.meiaTras, 3)]), CLARO);
  parte('tunel', prisma('z', T.tunel, -740, 620), CINZA);

  /* longarinas: dois perfis fechados de 80 por 100, com o rebaixo sob a cabine, da face de dentro do painel dianteiro à do traseiro */
  const perfilDaLongarina = faixa(L.eixo, L.altura, true);
  parte('longarinaDir', prisma('x', perfilDaLongarina, L.x0, L.x1), AZUL);
  parte('longarinaEsq', prisma('x', perfilDaLongarina, -L.x1, -L.x0), AZUL);
  parte('travessaDianteira', caixa(-L.x1 - 2, L.x1 + 2, 388, 488, 1900, 1960), AZUL);
  parte('travessaCentral', caixa(-L.x1 - 2, L.x1 + 2, 298, 398, -30, 30), AZUL);
  parte('travessaTraseira', caixa(-L.x1 - 2, L.x1 + 2, 388, 488, -1960, -1900), AZUL);

  /* os membros que encostam por dentro na lataria, aparados pelo interior da chapa */
  parte('paredeCortaFogo', aparar(placaPorEstacoes([[703, 1100], [703, 630], [700, 630], [700, 1100]], -1000, 1000, 5)), CINZA);
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
    /* o montante C encosta na lateral traseira acima de y 895, onde ela é o plano x 860, e fica 4 mm por dentro da porta traseira, num
       batente que passa da linha de vão: o encosto do montante na porta saía como encosta de um lado do carro e como travessia do
       outro (ATRITOS, segunda etapa). O pé estreito desce à frente do pneu até a soleira do chassi */
    const zB = T.zLateral - 3;
    parte(`montanteC${lado}`, bool('unir', [
      aparar(bool('unir', [caixa(...x(700, 1000), 895, 1530, -835, zB + 0.5), caixa(...x(700, 856), 560, 897, -835, T.zLateral + 6), caixa(...x(804, 856), 460, 562, T.zLateral - 8, T.zLateral + 6)])),
      aparar(caixa(...x(700, 1000), 895, 1530, zB, T.zLateral + 6), T.chapa + 4),
    ]), OCRE);
    /* o reforço da cintura corre por dentro do pé da coluna C, do montante C à travessa de trás da cabine */
    parte(`reforcoDaCintura${lado}`, aparar(caixa(...x(700, 1000), 940, 1040, -1295, -830)), OCRE);
    parte(`longarinaSuperior${lado}`, caixa(...x(600, 638.5), 700, 780, 701.5, 1841.5), AZUL);
    for (const [zc, ponta] of [[T.roda.zFrente, 'Dianteira'], [T.roda.zTras, 'Traseira']]) {
      const R = R_ARCO; const yb = T.lado.at(-1)[1]; const yc = T.roda.raio;
      const a1 = Math.asin((yb - yc) / (R + C.esp)); const a0 = Math.asin((yb - yc) / R);
      /* a borda da caixa de roda entra meia espessura na chapa do arco (a solda): faces só encostadas em plano inclinado saíam ora
         como encosta, ora como travessia, pelo ruído da booleana */
      parte(`caixaDeRoda${ponta}${lado}`, aparar(caixaDeRodaLiteral(arco(zc, yc, R + C.esp, a1, Math.PI - a1, 24), arco(zc, yc, R, Math.PI - a0, a0, 24), [C.xParede, C.xParede + C.esp, 1000], s), T.chapa - C.solda), CINZA);
    }
    parte(`suporteDoParaChoqueDianteiro${lado}`, caixa(...x(SUPORTE.x0, SUPORTE.x1), ...SUPORTE.frente, 2050, T.paraChoqueFrente.z0 + 2), CINZA);
    parte(`suporteDoParaChoqueTraseiro${lado}`, caixa(...x(...SUPORTE.xTras), ...SUPORTE.tras, T.paraChoqueTras.z0 - 2, -2050), CINZA);
  }
  for (const [zc, ponta] of [[T.roda.zFrente, 'Dianteiro'], [T.roda.zTras, 'Traseiro']]) {
    const id = ++estado.origem;
    estado.passos.push(['extrusao', { origemId: id, eixo: 'x', altura: 2 * T.eixoMeia, em: [-T.eixoMeia, 0, 0], perfil: { circulo: { raio: T.eixoRaio, centro: [-T.roda.raio, zc] } }, segmentosArco: 8 }]);
    parte(`eixo${ponta}`, { op: 'extrusao', id }, '#566573');
  }
  emitirInteriores(comeco);
}

/* ---- as rodas, pela família roda-pneu ---- */
export const PERFIL_DA_RODA = 'carro';
/* o perfil `carro` é um 205/55 R16 de 632 mm; a fonte tem o pneu de 728 por 205, e o resto do perfil vai em proporção. O furo central do cubo tem o diâmetro do eixo do chassi (o do perfil
   `carro` é 0,106 do diâmetro, 77 mm, e deixava 8,6 mm de folga radial no eixo de 60), e o ombro do pneu é o arco de quarto de círculo da família (`ombroRedondo`), e não o chanfro mínimo do perfil.
   Os parâmetros são os da instância (a família não muda); `partes/_comum/sedan.mjs` os passa a `derivar` da família para escrever as medidas das partes no PLANO. */
export const PARAMETROS_DA_RODA = { diametroPneu: 2 * T.roda.raio, larguraPneu: T.roda.largura / (2 * T.roda.raio), diametroFuroCentral: (2 * T.eixoRaio) / (2 * T.roda.raio), ombroRedondo: 1 };
function rodas() {
  const parametros = PARAMETROS_DA_RODA;
  const COR = { pneu: '#151617', aro: '#9aa0a6', cubo: '#7d8389', disco: '#b4b9be' };
  const cores = Object.fromEntries(Object.entries(COR).map(([nome, cor]) => [nome, corDe(nome, cor)]));
  const poses = [];
  for (const [s, lado] of [[1, 'Dir'], [-1, 'Esq']]) for (const [zc, ponta] of [[T.roda.zFrente, 'Dianteira'], [T.roda.zTras, 'Traseira']]) {
    poses.push({ nomes: (nome) => `${nome}${ponta}${lado}`, pose: { posicao: [s * T.roda.xCentro, T.roda.raio, zc], ...(s < 0 ? { giro: { eixo: 'y', graus: 180 } } : {}) } });
  }
  const r = instanciaDeFamilia({ familia: 'roda-pneu', perfil: PERFIL_DA_RODA, parametros, base: estado.origem, unidade: 'mm', materiais: false, cores, liso: 35, poses });
  estado.passos.push(...r.passos);
  estado.origem = r.origem;
  for (const { nome, nomeNaFamilia, sel } of r.partes) { PARTES.set(nome, sel); CORES[nome] = cores[nomeNaFamilia]; }
  /* os cinco furos de fixação e o furo central, que a família corta do cubo por `subtrair`, deixam em cada cubo 12 faces finas (tiras de 0,17 mm entre o vértice do círculo e a aresta da
     face): a limpeza as une às vizinhas sem mover a superfície (desvio de 3e-14 mm). Os parâmetros da instância não as evitam; a família é a que corta. */
  for (const { nome, nomeNaFamilia } of r.partes) if (nomeNaFamilia === 'cubo') estado.passos.push(['limparLascas', { sel: { grupo: nome }, tolerancia: 0.01 }]);
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
  for (const [nome, sel] of PARTES) {
    const regra = AFASTA.find(([re]) => re.test(nome));
    if (!regra) continue;
    const [dx, dy, dz] = regra[1];
    const s = /Esq$/.test(nome) ? -1 : 1;
    estado.passos.push(['transladar', { d: [/Dir$|Esq$/.test(nome) ? s * dx : 0, dy, dz], sel }]);
  }
}

/* ---- os contatos esperados ---- */
const par = (a, b, relacao, motivo) => ({ par: [a, b], relacao, motivo });
/* O vão entre dois painéis da mesma chapa, que `npm run vao:partes` confere: a lâmina do modo superfície dá de 4,0 a 4,1 mm, com as
   duas bordas no mesmo plano (degrau até 0,3 mm). Os cantos em que dois painéis se encontram em faces diferentes declaram o degrau. */
const vao = (a, b, motivo = 'vão de 4 mm entre painéis da mesma chapa', esperada = 4.1, tolerancia = 0.1, degrau = 0.3) => ({ par: [a, b], relacao: 'folga', motivo, folga: { esperada, tolerancia, degrau } });
/* a folga de desenho entre duas partes que não são painéis da mesma chapa: o valor medido e a tolerância, sem degrau */
const folga = (a, b, esperada, tolerancia, motivo) => ({ par: [a, b], relacao: 'folga', motivo, folga: { esperada, tolerancia } });
/* as partes que ficam soltas de propósito no rascunho, com o que as prenderia */
export const APOIA = [];
const apoia = (parte, motivo) => APOIA.push({ parte, motivo });
export const CONTATOS = [];
const SOLDA = 'membros do chassi soldados um no outro';
for (const L of ['Dir', 'Esq']) {
  CONTATOS.push(
    /* a lataria apoiada no chassi */
    par(`paraLama${L}`, 'paredeCortaFogo', 'encosta', 'a faixa de cima do para-lama assenta no topo da parede corta-fogo'),
    par(`paraLama${L}`, 'suporteDoRadiador', 'encosta', 'o para-lama assenta no topo e na lateral do suporte do radiador'),
    par(`paraLama${L}`, `caixaDeRodaDianteira${L}`, 'atravessa', 'a borda da caixa de roda entra meia espessura na chapa do arco (a solda)'),
    par(`paraLama${L}`, `soleiraDoChassi${L}`, 'encosta', 'o pé de trás do para-lama assenta na ponta da soleira do chassi'),
    par(`soleira${L}`, `soleiraDoChassi${L}`, 'encosta', 'a chapa da soleira veste a soleira do chassi'),
    par(`soleira${L}`, `montanteA${L}`, 'encosta', 'a chapa da soleira assenta no pé do montante A'),
    par(`soleira${L}`, `montanteB${L}`, 'encosta', 'a chapa da soleira assenta no pé do montante B'),
    par(`portaDianteira${L}`, `montanteA${L}`, 'encosta', 'a porta dianteira fecha contra o montante A, onde ficam as dobradiças'),
    par(`portaDianteira${L}`, `montanteB${L}`, 'encosta', 'a porta dianteira fecha contra o montante B, onde fica a fechadura'),
    par(`portaTraseira${L}`, `montanteB${L}`, 'encosta', 'a porta traseira fecha contra o montante B, onde ficam as dobradiças'),
    par(`lateralTraseira${L}`, `montanteC${L}`, 'encosta', 'a lateral traseira assenta no montante C'),
    par(`lateralTraseira${L}`, `caixaDeRodaTraseira${L}`, 'atravessa', 'a borda da caixa de roda entra meia espessura na chapa do arco (a solda)'),
    par(`lateralTraseira${L}`, 'anteparoTraseiro', 'encosta', 'a lateral traseira assenta na ponta do anteparo'),
    par('teto', `montanteA${L}`, 'encosta', 'o pé da coluna A assenta no topo do montante A'),
    par(`paraLama${L}`, `montanteA${L}`, 'encosta', 'a borda de trás do para-lama assenta no montante A'),
    folga(`portaTraseira${L}`, `montanteC${L}`, 4.5, 0.15, 'a porta traseira fecha contra o batente do montante C, que fica 4 mm por dentro dela; a borracha fica fora do rascunho'),
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
    vao('capo', `paraLama${L}`), vao(`portaDianteira${L}`, `portaTraseira${L}`),
    vao(`paraLama${L}`, `portaDianteira${L}`, 'vão de 4 mm; na aba do ombro a porta fica 2 mm para dentro do para-lama, num ponto', 4.1, 0.1, 2.1),
    vao(`portaTraseira${L}`, `lateralTraseira${L}`, 'vão de 4 mm; na aba do ombro a porta fica 2 mm para dentro da lateral, num ponto', 4.1, 0.1, 2.1),
    vao(`portaDianteira${L}`, `soleira${L}`), vao(`portaTraseira${L}`, `soleira${L}`),
    vao(`paraLama${L}`, `soleira${L}`), vao(`lateralTraseira${L}`, `soleira${L}`),
    vao(`lateralTraseira${L}`, 'tampaDoPortaMalas'), vao(`lateralTraseira${L}`, 'painelTraseiro'),
    vao(`paraLama${L}`, 'painelDianteiro', 'vão de 4 mm; a dobra do ombro cruza o vão em diagonal e deixa as duas bordas 0,6 mm fora de plano num ponto', 4.1, 0.1, 0.6),
    vao(`portaDianteira${L}`, 'teto'), vao(`portaTraseira${L}`, 'teto'),
    vao(`lateralTraseira${L}`, 'teto', 'vão de 4 mm na linha de cintura, com o degrau de 10 mm do ombro entre a coluna C e a lateral', 4.1, 0.1, 10.5),
    vao(`paraLama${L}`, 'teto', 'o para-lama acaba 5,6 mm à frente do pé da coluna A, que fica 2 mm acima dele', 5.6, 0.2, 3.1),
    vao(`vidroDianteiro${L}`, `portaDianteira${L}`, 'o vidro fica no vão da janela, 4 mm em toda a volta; a canaleta fica fora do rascunho'),
    vao(`vidroTraseiroDaPorta${L}`, `portaTraseira${L}`, 'o vidro fica no vão da janela, 4 mm em toda a volta; a canaleta fica fora do rascunho'),
    vao(`vigia${L}`, 'teto', 'o vidro fica no vão da coluna C, 4 mm em toda a volta; a borracha fica fora do rascunho'),
    vao(`farol${L}`, 'painelDianteiro', 'o farol fica no vão do painel, 4 mm em toda a volta, com a lente 4 mm à frente dele; a fixação fica fora do rascunho', 4.1, 0.1, 4.1),
    vao(`lanterna${L}`, 'painelTraseiro', 'a lanterna fica no vão do painel, 4 mm em toda a volta, com a lente 4 mm atrás dele; a fixação fica fora do rascunho', 4.1, 0.1, 4.1),
    /* as folgas de desenho do chassi e dos acabamentos */
    folga(`farol${L}`, 'paraChoqueDianteiro', 12, 0.2, 'o para-choque passa 12 mm abaixo do farol'),
    folga(`paraLama${L}`, 'travessaDoPainel', 6.1, 0.15, 'a travessa do painel fica 6 mm atrás da borda do para-lama, sob o pé da coluna A'),
    folga('anteparoTraseiro', `longarina${L}`, 2, 0.1, 'a chapa do assoalho, de 2 mm, fica entre o anteparo e a longarina'),
    folga('assoalho', `montanteC${L}`, 2, 0.1, 'o pé do montante C fica 2 mm ao lado da beira do assoalho'),
    folga(`longarina${L}`, 'paraChoqueDianteiro', 5.05, 0.15, 'o para-choque fica 4 mm à frente do painel, de 1 mm, que assenta na ponta da longarina'),
    folga(`longarina${L}`, 'paraChoqueTraseiro', 5.05, 0.15, 'o para-choque fica 4 mm atrás do painel, de 1 mm, que assenta na ponta da longarina'),
    folga(`lateralTraseira${L}`, `soleiraDoChassi${L}`, 4.4, 0.15, 'a soleira do chassi acaba 4,4 mm à frente da borda da lateral traseira'),
    folga('painelDianteiro', `suporteDoParaChoqueDianteiro${L}`, 4.1, 0.15, 'o suporte passa pelo furo do painel com 4 mm de folga em volta'),
    folga('painelTraseiro', `suporteDoParaChoqueTraseiro${L}`, 4.1, 0.15, 'o suporte passa pelo furo do painel com 4 mm de folga em volta'),
  );
  apoia(`vidroDianteiro${L}`, 'o vidro da porta corre na canaleta do quadro, que fica fora do rascunho');
  apoia(`vidroTraseiroDaPorta${L}`, 'o vidro da porta corre na canaleta do quadro, que fica fora do rascunho');
  apoia(`vigia${L}`, 'a vigia é presa pela borracha do vão da coluna C, que fica fora do rascunho');
  apoia(`farol${L}`, 'o farol é preso por trás no suporte do radiador; a fixação fica fora do rascunho');
  apoia(`lanterna${L}`, 'a lanterna é presa por trás no painel traseiro; a fixação fica fora do rascunho');
  for (const P of ['Dianteira', 'Traseira']) {
    CONTATOS.push(
      par(`aro${P}${L}`, `pneu${P}${L}`, 'encosta', 'o talão do pneu assenta no aro (família roda-pneu)'),
      par(`aro${P}${L}`, `disco${P}${L}`, 'atravessa', 'a borda do disco entra na parede do aro (família roda-pneu)'),
      par(`cubo${P}${L}`, `disco${P}${L}`, 'atravessa', 'a borda de dentro do disco entra no cubo (família roda-pneu)'),
      par(`cubo${P}${L}`, P === 'Dianteira' ? 'eixoDianteiro' : 'eixoTraseiro', 'encosta', 'o cubo é montado no eixo: o furo central tem o diâmetro do eixo (60 mm), e a roda é parada, sem junta modelada'),
      folga(`disco${P}${L}`, `pneu${P}${L}`, 2.2, 0.1, 'a borda do disco fica a 2,2 mm do talão do pneu (família roda-pneu)'),
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
  vao('capo', 'painelDianteiro'), vao('tampaDoPortaMalas', 'painelTraseiro'),
  vao('capo', 'teto', 'o capô acaba 5,6 mm à frente do pé do para-brisa, que fica 2 mm acima dele', 5.6, 0.2, 3.1),
  vao('tampaDoPortaMalas', 'teto', 'a tampa começa 5 mm atrás do pé do vidro traseiro, que fica 2 mm acima dela', 5.0, 0.2, 3.1),
  vao('paraBrisa', 'teto', 'o vidro fica no vão, 4 mm em toda a volta; a borracha fica fora do rascunho'),
  vao('vidroTraseiro', 'teto', 'o vidro fica no vão, 4 mm em toda a volta; a borracha fica fora do rascunho'),
  vao('grade', 'painelDianteiro', 'a grade fica no vão do painel, 4 mm em toda a volta; a fixação fica fora do rascunho'),
  folga('painelDianteiro', 'paraChoqueDianteiro', 4, 0.2, 'o para-choque fica 4 mm à frente do painel, preso pelos suportes'),
  folga('painelTraseiro', 'paraChoqueTraseiro', 3.9, 0.25, 'o para-choque fica 4 mm atrás do painel, preso pelos suportes, e 3,75 mm na faixa inclinada de baixo'),
  folga('capo', 'travessaDoPainel', 6.1, 0.15, 'a travessa do painel fica 6 mm atrás da borda do capô, sob o pé do para-brisa'),
  folga('tampaDoPortaMalas', 'travessaDaCabine', 6.05, 0.15, 'a travessa de trás da cabine fica 6 mm à frente da borda da tampa, sob o pé do vidro traseiro'),
  folga('travessaCentral', 'tunel', 2, 0.1, 'a chapa do assoalho, de 2 mm, fica entre o túnel e a travessa'),
);
apoia('paraBrisa', 'o para-brisa é colado no vão do teto; a borracha fica fora do rascunho');
apoia('vidroTraseiro', 'o vidro traseiro é colado no vão do teto; a borracha fica fora do rascunho');
apoia('grade', 'a grade é presa por trás no suporte do radiador; a fixação fica fora do rascunho');

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
    apoia: MODO === 'inteiro' ? APOIA : [],
  }],
};
