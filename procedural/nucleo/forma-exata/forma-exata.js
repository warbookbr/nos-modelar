/* forma-exata.js — a peça de aresta dura guardada como forma exata, com a malha gerada só no fim (protótipo do estudo do
   método, plano "forma exata antes da malha", fatia 3).

   A FORMA. Um prisma reto de altura H sobre um contorno exato de retas e arcos (`contorno-exato.js`), com furos passantes
   redondos. Cada aresta de cima e de baixo do prisma (um trecho do contorno, no topo ou no fundo) guarda a borda dela: viva,
   chanfrada (largura para dentro da face e altura na parede) ou arredondada (raio). As faces da forma são superfícies exatas:
   o topo e o fundo são planos; a parede de um trecho reto é plano e a de um arco é cilindro; o chanfro de um reto é plano e o
   de um arco é cone; o arredondamento de um reto é cilindro e o de um arco é toro. `facesExatas` lista essas faces.

   AS OPERAÇÕES. `chanfrarAresta`, `arredondarAresta` e `furoPassante` devolvem uma forma nova; nenhuma mexe em triângulo.
   Cada uma confere, nos níveis de quebra da borda, que o contorno recuado ainda fecha: o trecho que some e a borda que muda
   numa junção tangente são recusados ali, com o trecho e a medida. Onde dois trechos de bordas diferentes se encontram num
   canto vivo, a curva de encontro das duas faces sai da interseção exata dos dois contornos recuados, nível por nível (uma
   reta quando os dois são chanfros de trechos retos).

   A MALHA. `malhaDaForma` corta cada laço nos níveis de quebra das bordas dele, amostra cada nível com o mesmo número de
   divisões por trecho e liga níveis vizinhos em faixas de quatro cantos (dois triângulos quando os quatro não ficam num
   plano). O topo e o fundo são triangulados por `triangular-regiao.js` a partir dos laços do nível, com pontos novos só por
   dentro. Toda face usa os vértices do nível que divide com a vizinha, e por isso a malha fecha sem vértice solto. O ponto
   [u, v] na altura h vai para x = u, y = h, z = v, como na `extrusao`.

   NÃO COBRE: superfície livre (subdivisão, gaiola); união, subtração e interseção de dois sólidos; furo cego, furo inclinado
   ou furo que não seja redondo; arredondar a aresta vertical de um canto do contorno (é a concordância do contorno 2D); borda
   mais larga que o trecho vizinho (recusa, sem refazer a topologia); encontro de duas bordas arredondadas ou chanfradas de
   laços diferentes (o furo cuja boca alcança a borda de fora é recusado); peça que não seja um prisma reto. O encontro de dois
   tubos está em `juncao-de-tubos.js`, por construção direta. */
import { diagnosticarContorno } from '../contorno.js';
import { ErroDeFormaExata, amostrarNivel, areaDoNivel, divisoesDoLaco, lacoDoCirculo, lacoExatoPorTrechos, nivelDoLaco } from './contorno-exato.js';
import { triangularRegiao } from './triangular-regiao.js';

export { ErroDeFormaExata };

const ehNumero = (x) => typeof x === 'number' && Number.isFinite(x);
const fmt = (x) => String(Number(x.toPrecision(6)));
const positivo = (x, onde) => { if (!ehNumero(x) || !(x > 0)) throw new ErroDeFormaExata(onde, `precisa ser um número maior que zero (veio ${x})`); return x; };

const alturaDaBorda = (b) => (!b ? 0 : b.tipo === 'chanfro' ? b.altura : b.raio);
const larguraDaBorda = (b) => (!b ? 0 : b.tipo === 'chanfro' ? b.largura : b.raio);
/* o recuo da borda b a uma distância d (na altura) da face dela */
const recuoDaBorda = (b, d) => (b.tipo === 'chanfro' ? b.largura * (1 - d / b.altura) : b.raio - Math.sqrt(Math.max(0, d * (2 * b.raio - d))));

function recuoEm(bordas, H, z) {
  const f = bordas.fundo, t = bordas.topo;
  if (f && z < alturaDaBorda(f)) return recuoDaBorda(f, z);
  if (t && H - z < alturaDaBorda(t)) return recuoDaBorda(t, H - z);
  return 0;
}

const paineisDoRaio = (r, desvio) => Math.max(1, Math.ceil(Math.PI / 2 / (2 * Math.acos(Math.max(-1, 1 - desvio / r))) - 1e-9));

/* as alturas em que o laço é cortado: as quebras de borda de todos os trechos dele e, nas bordas arredondadas, os painéis */
function alturasDoLaco(forma, laco, desvio) {
  const H = forma.altura, zs = [0, H];
  for (const b of laco.bordas) {
    for (const [lado, borda] of [['fundo', b.fundo], ['topo', b.topo]]) {
      if (!borda) continue;
      const h = alturaDaBorda(borda), de = (d) => (lado === 'fundo' ? d : H - d);
      zs.push(de(h));
      if (borda.tipo === 'arredondado') {
        const n = borda.paineis ?? Math.max(2, paineisDoRaio(borda.raio, desvio));
        for (let k = 1; k < n; k++) zs.push(de(borda.raio * (1 - Math.cos((Math.PI / 2) * (k / n)))));
      }
    }
  }
  zs.sort((a, b) => a - b);
  return zs.filter((z, i) => i === 0 || z - zs[i - 1] > 1e-9 * H);
}

const nivelEm = (forma, li, z) => {
  const laco = forma.lacos[li];
  return nivelDoLaco(laco, laco.bordas.map((b) => recuoEm(b, forma.altura, z)), { onde: `laço ${li}, altura ${fmt(z)}` });
};

/* confere que cada laço fecha em todos os níveis de quebra; é a recusa das operações */
function conferir(forma) {
  forma.lacos.forEach((laco, li) => { for (const z of alturasDoLaco(forma, laco, Infinity)) nivelEm(forma, li, z); });
  return forma;
}

const inteiroOuNada = (x, minimo, onde) => { if (x == null) return null; if (!Number.isInteger(x) || x < minimo) throw new ErroDeFormaExata(onde, `precisa ser um inteiro de ${minimo} para cima (veio ${x})`); return x; };

/** O prisma reto de altura `altura` sobre `contorno`: {inicio, trechos} (reto, arco, arcoTangente) ou {circulo: {centro, raio, lados?}}; `lados` fixa a divisão do círculo na malha, que sem ele sai do `desvio`. */
export function prismaExato({ contorno, altura } = {}) {
  positivo(altura, 'prismaExato.altura');
  const laco = contorno?.circulo ? lacoDoCirculo(contorno.circulo.centro ?? [0, 0], contorno.circulo.raio) : lacoExatoPorTrechos(contorno, { onde: 'prismaExato.contorno' });
  if (contorno?.circulo) laco.lados = inteiroOuNada(contorno.circulo.lados, 3, 'prismaExato.contorno.circulo.lados');
  return { tipo: 'prisma-exato', altura, lacos: [{ ...laco, furo: false, bordas: laco.segmentos.map(() => ({ fundo: null, topo: null })) }] };
}

function comBorda(forma, operacao, { laco: li = 0, trechos = 'todos', lado = 'topo' }, borda) {
  const laco = forma.lacos[li];
  if (!laco) throw new ErroDeFormaExata(`${operacao}.laco`, `a forma tem ${forma.lacos.length} laço(s) (veio ${li})`);
  if (!['topo', 'fundo', 'ambos'].includes(lado)) throw new ErroDeFormaExata(`${operacao}.lado`, `precisa ser 'topo', 'fundo' ou 'ambos' (veio ${lado})`);
  const quais = trechos === 'todos' ? laco.segmentos.map((s) => s.trecho) : trechos;
  if (!Array.isArray(quais) || !quais.length) throw new ErroDeFormaExata(`${operacao}.trechos`, "precisa ser 'todos' ou a lista dos índices dos trechos do contorno");
  for (const k of quais) if (!laco.segmentos.some((s) => s.trecho === k)) throw new ErroDeFormaExata(`${operacao}.trechos`, `o laço ${li} não tem o trecho ${k}; ele tem os trechos de 0 a ${laco.segmentos.length - 1}`);
  const lados = lado === 'ambos' ? ['topo', 'fundo'] : [lado];
  const bordas = laco.bordas.map((b, i) => {
    if (!quais.includes(laco.segmentos[i].trecho)) return b;
    const nova = { ...b };
    for (const l of lados) nova[l] = borda;
    const soma = alturaDaBorda(nova.fundo) + alturaDaBorda(nova.topo);
    if (soma > forma.altura * (1 + 1e-9)) throw new ErroDeFormaExata(operacao, `no trecho ${laco.segmentos[i].trecho} as bordas de cima e de baixo somam ${fmt(soma)} de altura, e a peça tem ${fmt(forma.altura)}`);
    return nova;
  });
  const lacos = forma.lacos.map((l, i) => (i === li ? { ...l, bordas } : l));
  return conferir({ ...forma, lacos });
}

/** Chanfra as arestas de cima, de baixo ou as duas dos `trechos` do laço: `largura` para dentro da face e `altura` na parede. */
export function chanfrarAresta(forma, { largura, altura, ...onde } = {}) {
  return comBorda(forma, 'chanfrarAresta', onde, { tipo: 'chanfro', largura: positivo(largura, 'chanfrarAresta.largura'), altura: positivo(altura, 'chanfrarAresta.altura') });
}

/** Arredonda as arestas de cima, de baixo ou as duas dos `trechos` do laço, com `raio`; `paineis` fixa a divisão do arco na malha, que sem ele sai do `desvio`. */
export function arredondarAresta(forma, { raio, paineis = null, ...onde } = {}) {
  return comBorda(forma, 'arredondarAresta', onde, { tipo: 'arredondado', raio: positivo(raio, 'arredondarAresta.raio'), paineis: inteiroOuNada(paineis, 1, 'arredondarAresta.paineis') });
}

const distanciaAoSegmento = (p, s) => {
  if (s.tipo === 'reta') {
    const ex = s.b[0] - s.a[0], ey = s.b[1] - s.a[1];
    const f = Math.min(1, Math.max(0, ((p[0] - s.a[0]) * ex + (p[1] - s.a[1]) * ey) / (ex * ex + ey * ey)));
    return Math.hypot(p[0] - s.a[0] - ex * f, p[1] - s.a[1] - ey * f);
  }
  let d = Math.atan2(p[1] - s.c[1], p[0] - s.c[0]) - s.a0;
  const sinal = Math.sign(s.giro);
  while (d * sinal < 0) d += sinal * 2 * Math.PI;
  while (d * sinal > 2 * Math.PI) d -= sinal * 2 * Math.PI;
  if (Math.abs(d) <= Math.abs(s.giro)) return Math.abs(Math.hypot(p[0] - s.c[0], p[1] - s.c[1]) - s.r);
  return Math.min(...[s.a0, s.a0 + s.giro].map((a) => Math.hypot(p[0] - s.c[0] - s.r * Math.cos(a), p[1] - s.c[1] - s.r * Math.sin(a))));
};

/** Abre um furo redondo passante. `boca`: {lado: 'topo'|'fundo'|'ambos', chanfro: {largura, altura}} ou {lado, raio, paineis?} arredonda a boca; `lados` fixa a divisão do círculo na malha. */
export function furoPassante(forma, { centro, raio, boca = null, lados = null } = {}) {
  positivo(raio, 'furoPassante.raio');
  const novo = lacoDoCirculo(centro, raio, { furo: true });
  novo.lados = inteiroOuNada(lados, 3, 'furoPassante.lados');
  const laco = { ...novo, furo: true, bordas: [{ fundo: null, topo: null }] };
  let saida = { ...forma, lacos: [...forma.lacos, laco] };
  if (boca) {
    const onde = { laco: saida.lacos.length - 1, trechos: 'todos', lado: boca.lado ?? 'topo' };
    saida = boca.chanfro ? chanfrarAresta(saida, { ...boca.chanfro, ...onde }) : arredondarAresta(saida, { raio: boca.raio, paineis: boca.paineis, ...onde });
  }
  /* o furo, com a boca, fica dentro do material: longe da borda de fora (com a borda dela) e dos outros furos */
  const b = saida.lacos[saida.lacos.length - 1].bordas[0];
  const alcance = raio + Math.max(larguraDaBorda(b.fundo), larguraDaBorda(b.topo));
  forma.lacos.forEach((outro, li) => {
    const folga = Math.max(...outro.bordas.map((x) => Math.max(larguraDaBorda(x.fundo), larguraDaBorda(x.topo))));
    const d = Math.min(...outro.segmentos.map((s) => distanciaAoSegmento(novo.segmentos[0].c, s)));
    if (!(d > alcance + folga)) throw new ErroDeFormaExata('furoPassante', `o furo de raio ${fmt(raio)} em [${centro.map(fmt)}] alcança ${fmt(alcance)} com a boca e fica a ${fmt(d)} do laço ${li}, que tem borda de ${fmt(folga)}; o protótipo não resolve o encontro de duas bordas, e a distância mínima é ${fmt(alcance + folga)}`);
  });
  const fora = nivelDoLaco(forma.lacos[0], forma.lacos[0].bordas.map(() => 0));
  if (!pontoDentro(novo.segmentos[0].c, amostrarNivel(fora, divisoesDoLaco(forma.lacos[0], { passo: Infinity, desvio: raio / 100 })))) throw new ErroDeFormaExata('furoPassante.centro', `o centro [${centro.map(fmt)}] fica fora do contorno`);
  return saida;
}

function pontoDentro(p, poligono) {
  let dentro = false;
  for (let i = 0, j = poligono.length - 1; i < poligono.length; j = i++) {
    const a = poligono[i], b = poligono[j];
    if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]) dentro = !dentro;
  }
  return dentro;
}

const SUPERFICIE = { reta: { parede: 'plano', chanfro: 'plano', arredondado: 'cilindro' }, arco: { parede: 'cilindro', chanfro: 'cone', arredondado: 'toro' } };

/** As faces exatas da forma: [{tipo: 'plano'|'cilindro'|'cone'|'toro', parte, laco?, trecho?}]. */
export function facesExatas(forma) {
  const faces = [{ tipo: 'plano', parte: 'fundo' }, { tipo: 'plano', parte: 'topo' }];
  forma.lacos.forEach((laco, li) => laco.segmentos.forEach((s, i) => {
    const b = laco.bordas[i];
    if (b.fundo) faces.push({ tipo: SUPERFICIE[s.tipo][b.fundo.tipo], parte: `${b.fundo.tipo} de baixo`, laco: li, trecho: s.trecho });
    if (forma.altura - alturaDaBorda(b.fundo) - alturaDaBorda(b.topo) > 1e-9 * forma.altura) faces.push({ tipo: SUPERFICIE[s.tipo].parede, parte: 'parede', laco: li, trecho: s.trecho });
    if (b.topo) faces.push({ tipo: SUPERFICIE[s.tipo][b.topo.tipo], parte: `${b.topo.tipo} de cima`, laco: li, trecho: s.trecho });
  }));
  return faces;
}

/* os 24 nós e pesos de Gauss-Legendre em [0, 1], pelas raízes do polinômio de Legendre (Newton a partir da estimativa de Chebyshev) */
const GAUSS = (() => {
  const n = 24, nos = [];
  for (let i = 0; i < n; i++) {
    let x = Math.cos((Math.PI * (i + 0.75)) / (n + 0.5)), dp = 1;
    for (let it = 0; it < 50; it++) {
      let p0 = 1, p1 = x;
      for (let k = 2; k <= n; k++) { const p2 = ((2 * k - 1) * x * p1 - (k - 1) * p0) / k; p0 = p1; p1 = p2; }
      dp = (n * (x * p1 - p0)) / (x * x - 1);
      const dx = p1 / dp;
      x -= dx;
      if (Math.abs(dx) < 1e-16) break;
    }
    nos.push([(x + 1) / 2, 1 / ((1 - x * x) * dp * dp)]);
  }
  return nos;
})();

/** O volume exato da forma: a área exata de cada nível integrada na altura por Gauss-Legendre de 24 pontos em cada faixa entre quebras, numa variável que tira a raiz das pontas. */
export function volumeExato(forma) {
  const H = forma.altura;
  const quebras = new Set([0, H]);
  for (const laco of forma.lacos) for (const b of laco.bordas) { quebras.add(alturaDaBorda(b.fundo)); quebras.add(H - alturaDaBorda(b.topo)); }
  const zs = [...quebras].sort((a, b) => a - b).filter((z, i, l) => i === 0 || z - l[i - 1] > 1e-12 * H);
  const area = (z) => forma.lacos.reduce((soma, _, li) => soma + areaDoNivel(nivelEm(forma, li, z)), 0);
  let volume = 0;
  for (let k = 0; k + 1 < zs.length; k++) {
    const a = zs[k], b = zs[k + 1];
    /* z = a + (b - a)(1 - cos πt)/2 tira a raiz da ponta do arredondamento; dz = (b - a)(π/2) sen πt dt, nulo nas duas pontas */
    const f = (t) => area(Math.min(b, Math.max(a, a + ((b - a) * (1 - Math.cos(Math.PI * t))) / 2))) * (b - a) * (Math.PI / 2) * Math.sin(Math.PI * t);
    for (const [t, peso] of GAUSS) volume += f(t) * peso;
  }
  return volume;
}

/** A malha da forma: { V: [[x, y, z]], F: [[índices]], superficie: [tipo de cada face], naoRefinados }. `passo` é a aresta alvo e `desvio` o desvio máximo da corda. */
export function malhaDaForma(forma, { passo, desvio, qualidade } = {}) {
  positivo(passo, 'malhaDaForma.passo');
  positivo(desvio, 'malhaDaForma.desvio');
  const H = forma.altura;
  const V = [], F = [], superficie = [];
  const vertice = (p, h) => { V.push([p[0], p[1], h]); return V.length - 1; };
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const tampas = { fundo: [], topo: [] };
  forma.lacos.forEach((laco, li) => {
    const zs = alturasDoLaco(forma, laco, desvio);
    const recuoMaximo = Math.max(...laco.bordas.map((b) => Math.max(larguraDaBorda(b.fundo), larguraDaBorda(b.topo))));
    const divisoes = divisoesDoLaco(laco, { passo, desvio, recuoMaximo: laco.furo ? recuoMaximo : 0 });
    const dono = [];
    laco.segmentos.forEach((_, i) => { for (let k = 0; k < divisoes[i]; k++) dono.push(i); });
    /* a conferência de contorno simples usa as retas inteiras: `diagnosticarContorno` compara sinais sem tolerância, e os pontos
       intermediários de uma reta inclinada, colineares a menos do arredondamento, saem dela como arestas que se cruzam */
    const semDividirRetas = divisoes.map((n, i) => (laco.segmentos[i].tipo === 'reta' ? 1 : n));
    const aneis = zs.map((z) => {
      const nivel = nivelEm(forma, li, z);
      const pontos = amostrarNivel(nivel, divisoes);
      const defeito = diagnosticarContorno(amostrarNivel(nivel, semDividirRetas));
      if (defeito) throw new ErroDeFormaExata(`malhaDaForma, laço ${li}, altura ${fmt(z)}`, `o contorno recuado deixa de ser simples: ${defeito.mensagem}`);
      return { pontos, ids: pontos.map((p) => vertice(p, z)) };
    });
    tampas.fundo.push(aneis[0]);
    tampas.topo.push(aneis[aneis.length - 1]);
    const M = dono.length;
    for (let k = 0; k + 1 < zs.length; k++) {
      const meio = (zs[k] + zs[k + 1]) / 2;
      for (let j = 0; j < M; j++) {
        const b = laco.bordas[dono[j]];
        const faixa = b.fundo && meio < alturaDaBorda(b.fundo) ? b.fundo.tipo : b.topo && H - meio < alturaDaBorda(b.topo) ? b.topo.tipo : 'parede';
        const tipo = SUPERFICIE[laco.segmentos[dono[j]].tipo][faixa];
        const q = [aneis[k].ids[j], aneis[k].ids[(j + 1) % M], aneis[k + 1].ids[(j + 1) % M], aneis[k + 1].ids[j]];
        const P = q.map((v) => V[v]);
        const n = cruz(sub(P[1], P[0]), sub(P[2], P[0]));
        const fora = Math.abs(n[0] * (P[3][0] - P[0][0]) + n[1] * (P[3][1] - P[0][1]) + n[2] * (P[3][2] - P[0][2])) / (Math.hypot(...n) || 1);
        const diagonal = Math.max(Math.hypot(...sub(P[2], P[0])), Math.hypot(...sub(P[3], P[1])));
        if (fora <= 1e-9 * diagonal) { F.push(q); superficie.push(tipo); continue; }
        if (Math.hypot(...sub(P[2], P[0])) <= Math.hypot(...sub(P[3], P[1]))) F.push([q[0], q[1], q[2]], [q[0], q[2], q[3]]);
        else F.push([q[0], q[1], q[3]], [q[1], q[2], q[3]]);
        superficie.push(tipo, tipo);
      }
    }
  });
  let naoRefinados = 0;
  for (const [lado, h] of [['fundo', 0], ['topo', H]]) {
    const pontos = [], ids = [], lacos = [];
    for (const anel of tampas[lado]) {
      lacos.push(anel.pontos.map((_, k) => pontos.length + k));
      pontos.push(...anel.pontos);
      ids.push(...anel.ids);
    }
    tampas[lado].slice(1).forEach((anel, k) => {
      if (!anel.pontos.every((p) => pontoDentro(p, tampas[lado][0].pontos))) throw new ErroDeFormaExata(`malhaDaForma, ${lado}`, `a boca do furo ${k + 1} passa da borda de fora nesta face`);
    });
    const t = triangularRegiao(pontos, lacos, { qualidade });
    naoRefinados += t.naoRefinados;
    for (let k = pontos.length; k < t.pontos.length; k++) ids.push(vertice(t.pontos[k], h));
    for (const [a, b, c] of t.triangulos) { F.push(lado === 'topo' ? [ids[a], ids[b], ids[c]] : [ids[a], ids[c], ids[b]]); superficie.push('plano'); }
  }
  /* (u, v, h) vai para x = u, y = h, z = v; a troca de eixos inverte a orientação, e cada face é escrita ao contrário */
  return { V: V.map(([u, v, h]) => [u, h, v]), F: F.map((f) => [...f].reverse()), superficie, naoRefinados };
}
