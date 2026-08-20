#!/usr/bin/env node
/* rejeicoes-p0.mjs — as oito condições de rejeição visual da seção 7 de
   docs/mecanifica/CHASSI-P0-ALVO-E-LIMIARES.md, EXECUTÁVEIS.

   Por que este arquivo existe: a rodada Q7 fechou com 52 testes verdes e foi
   reprovada pelo usuário na primeira olhada. As condições de rejeição existiam
   desde P0 — em prosa, e nunca foram rodadas. Suíte verde com entrega reprovada
   significa que a suíte mede a coisa errada. Aqui elas viram medida.

   Regra desta rodada, e ela vale mais que qualquer detector: quando uma
   reprovação escapa da lista, a LISTA CRESCE. A condição 9 nasceu assim.

   Cada condição declara escopo. Condição fora do escopo da peça devolve
   `naoAplicavel` com motivo escrito — nunca `passa`. Passar por vacuidade é
   exatamente o defeito que este arquivo corrige. */

import { construirQuartoDianteiro, ALVO } from './quarto-dianteiro.mjs';
import { subdividir, subdividirUmNivel, rastrearLoop, topologia } from './subdividir.mjs';

const chave = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norma = (a) => Math.hypot(a[0], a[1], a[2]);
const unit = (a) => { const n = norma(a) || 1; return [a[0] / n, a[1] / n, a[2] / n]; };
const ponto = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const grau = (r) => (r * 180) / Math.PI;

/* --- utilidades de leitura da malha compilada ------------------------------ */

/* Seção transversal compilada: a linha i da grade da cage seguida pela
   subdivisão. É medida exata da seção real, não fatiamento aproximado por
   plano — e é a linhagem de P1 exercida. */
export function secoesCompiladas(cage, niveis) {
  return cage.grade.map((linha) => rastrearLoop(cage, linha, niveis).pontos);
}

/* Ângulo de virada em cada ponto interno da polilinha, em graus. */
function viradas(pts) {
  const saida = [];
  for (let i = 1; i < pts.length - 1; i += 1) {
    const a = unit(sub(pts[i], pts[i - 1]));
    const b = unit(sub(pts[i + 1], pts[i]));
    saida.push(grau(Math.acos(Math.max(-1, Math.min(1, ponto(a, b))))));
  }
  return saida;
}

/* Quebras de tangente: viradas que são máximo local e passam do limiar. Duas
   viradas de 30° em pontos vizinhos são UMA quebra, não duas. */
function quebras(pts, limiar) {
  const v = viradas(pts);
  const ids = [];
  for (let i = 0; i < v.length; i += 1) {
    if (v[i] < limiar) continue;
    if (i > 0 && v[i - 1] > v[i]) continue;
    if (i < v.length - 1 && v[i + 1] >= v[i]) continue;
    ids.push({ i: i + 1, angulo: v[i] });
  }
  return ids;
}

function normalDaFace(V, vs) {
  let n = [0, 0, 0];
  for (let i = 0; i < vs.length; i += 1) {
    const c = cruz(sub(V.get(vs[(i + 1) % vs.length]), V.get(vs[i])),
      sub(V.get(vs[(i + 2) % vs.length]), V.get(vs[(i + 1) % vs.length])));
    n = [n[0] + c[0], n[1] + c[1], n[2] + c[2]];
  }
  return unit(n);
}

/* Laços de borda da malha: arestas com uma face só, encadeadas. */
export function lacosDeBorda(malha) {
  const { arestas } = topologia([...malha.F.values()]);
  const vizinho = new Map();
  for (const e of [...arestas.values()].sort((x, y) => x.a - y.a || x.b - y.b)) {
    if (e.faces.length !== 1) continue;
    if (!vizinho.has(e.a)) vizinho.set(e.a, []);
    if (!vizinho.has(e.b)) vizinho.set(e.b, []);
    vizinho.get(e.a).push(e.b);
    vizinho.get(e.b).push(e.a);
  }
  const vistos = new Set();
  const lacos = [];
  for (const inicio of [...vizinho.keys()].sort((a, b) => a - b)) {
    if (vistos.has(inicio)) continue;
    const pilha = [inicio];
    const grupo = [];
    vistos.add(inicio);
    while (pilha.length) {
      const v = pilha.pop();
      grupo.push(v);
      for (const w of vizinho.get(v) ?? []) if (!vistos.has(w)) { vistos.add(w); pilha.push(w); }
    }
    lacos.push(grupo.sort((a, b) => a - b));
  }
  return lacos;
}

/* Janela de leitura da ondulação, em milímetros de arco. É o que torna o
   número comparável entre níveis de subdivisão. */
export const JANELA_DE_ARCO = 90;

/* Reamostra a polilinha em passo constante de comprimento de arco. */
function reamostrarPorArco(pts, passo) {
  const acum = [0];
  for (let i = 1; i < pts.length; i += 1) acum.push(acum[i - 1] + norma(sub(pts[i], pts[i - 1])));
  const total = acum[acum.length - 1];
  if (!(total > 0)) return pts.slice();
  const saida = [];
  let j = 0;
  for (let d = 0; d <= total; d += passo) {
    while (j < acum.length - 2 && acum[j + 1] < d) j += 1;
    const t = (d - acum[j]) / ((acum[j + 1] - acum[j]) || 1);
    saida.push([0, 1, 2].map((k) => pts[j][k] + (pts[j + 1][k] - pts[j][k]) * t));
  }
  return saida;
}

/* Ondulação = desvio máximo em relação à média móvel de JANELA_DE_ARCO. A média
   móvel carrega a curvatura pretendida do loop; o que sobra é a onda. */
export function ondulacaoPorArco(pts, janela = JANELA_DE_ARCO) {
  const passo = janela / 6;
  const r = reamostrarPorArco(pts, passo);
  if (r.length < 7) return 0;
  const raio = 3;
  let max = 0;
  for (let i = raio; i < r.length - raio; i += 1) {
    let soma = 0;
    for (let k = -raio; k <= raio; k += 1) soma += r[i + k][1];
    max = Math.max(max, Math.abs(r[i][1] - soma / (2 * raio + 1)));
  }
  return max;
}

/* --- as condições ---------------------------------------------------------- */

export const CONDICOES = [
  { n: 1, texto: 'o corpo lê como cápsula, tubo ou casco de barco na vista lateral' },
  { n: 2, texto: 'as rodas parecem externas ao corpo, ou o arco lê como borda pintada' },
  { n: 3, texto: 'o para-lama lê como volume anexo, e não como região da mesma superfície' },
  { n: 4, texto: 'a cabine parece pousada sobre o corpo, sem transição de teto e coluna' },
  { n: 5, texto: 'a reflexão ondula ou quebra ao longo da linha de ombro' },
  { n: 6, texto: 'o recorte de farol lê como decalque em vez de conformação' },
  { n: 7, texto: 'o vão envidraçado lê como superfície escurecida em vez de abertura com moldura' },
  { n: 8, texto: 'a densidade de malha está na amostragem e não na decisão de forma' },
  { n: 9, texto: 'o capô afunda entre o eixo de simetria e a crista — lê como calha, não como abaulado' },
  { n: 10, texto: 'a peça tem borda livre onde o carro é fechado — vê-se o interior da casca' },
];

/* Condição 10 é acréscimo de 2026-08-20, pelo mesmo motivo da 9. O usuário viu
   a vista frontal "muito estranha" e não soube nomear: o nariz do carro era um
   buraco aberto de 600 x 370 mm, e a vista frontal mostrava o interior da casca
   pelo outro lado. As condições 2 e 7 conferem que as aberturas que DEVEM
   existir existem; nenhuma conferia que as que NÃO devem existir não existem.

   z = 2265 não é plano de corte da prova: é a frente do carro. Corte de prova
   são a soleira, a cowl e o plano de simetria, e só esses.

   Condição 9 é acréscimo de 2026-08-19. Ela não estava em P0 e é exatamente o
   defeito que o usuário viu e a lista não pegou: em todas as oito estações da
   Q7 o capô caía de 8 a 36 mm do eixo de simetria para fora antes de subir na
   crista. Capô de carro é abaulado. A lista cresce quando falha. */

/* Cortes declarados da prova: onde a peça acaba porque é um quarto, não porque
   a forma acabou. Tudo fora disto é casca aberta. */
const CORTES = { soleiraY: 170, cowlZ: 500 };

const LIMIARES = {
  recuoDoRetornoMin: 6,      // mm — abaixo disto o arco é borda pintada
  quebrasNoCapoMax: 1,       // só a crista
  ondulacaoDaCristaMax: 6,   // mm
  profundidadeDoFarolMin: 12,// mm sobreviventes à subdivisão, a 60 cm
  diedroLisoMax: 12,         // graus fora de vinco e borda
  afundamentoDoCapoMax: 5,   // mm
};

export function avaliarRejeicoes({ niveis = 2, cage = construirQuartoDianteiro() } = {}) {
  const malha = subdividir(cage, niveis);
  const secoes = secoesCompiladas(cage, niveis);
  const r = [];
  const diz = (n, veredito, medida, detalhe) => r.push({ n, texto: CONDICOES[n - 1].texto, veredito, medida, detalhe });

  /* 1 — cápsula na lateral. Fora de escopo: a condição fala do CORPO na vista
     lateral, e esta peça é um quarto dianteiro sem cabine nem traseira. Julgar
     a silhueta de um quarto como se fosse a do carro daria aprovação vazia. */
  diz(1, 'naoAplicavel', null, 'exige corpo inteiro; a peça é um quarto dianteiro');

  /* 2 — arco como borda pintada. Duas perguntas: o buraco é topológico, e o
     retorno sobrevive à subdivisão? O retorno puxa a borda para dentro do
     círculo do arco, então o recuo mede diretamente a espessura da abertura. */
  {
    /* Não dá para isolar o arco por CONECTIVIDADE: ele é aberto embaixo, na
       soleira, então seu contorno é o mesmo componente do perímetro da peça.
       A primeira versão deste detector agrupava por conectividade e concluía
       "não há buraco" numa peça cujo buraco está provado desde Q4 — detector
       mentindo, não forma errada. Seleciona-se por posição. */
    const naBorda = new Set(lacosDeBorda(malha).flat());
    const raios = [];
    for (const v of naBorda) {
      const p = malha.V.get(v);
      const raio = Math.hypot(p[2] - ALVO.zEixo, p[1] - ALVO.rodaRaio);
      if (raio < ALVO.arcoRaio + 40) raios.push(raio);
    }
    if (raios.length < 8) diz(2, 'reprova', { verticesNoArco: raios.length }, 'não há contorno de abertura no círculo do arco');
    else {
      const medio = raios.reduce((a, b) => a + b, 0) / raios.length;
      const recuo = ALVO.arcoRaio - medio;
      diz(2, recuo >= LIMIARES.recuoDoRetornoMin ? 'passa' : 'reprova',
        { recuoDoRetorno: +recuo.toFixed(2), minimo: LIMIARES.recuoDoRetornoMin, vertices: raios.length }, null);
    }
  }

  /* 3 — para-lama como volume anexo. Numa superfície única do eixo de simetria
     até a crista existe UMA quebra de tangente: a crista. Volume anexo aparece
     como segunda quebra, onde o anexo encontra o capô. */
  {
    const pior = { estacao: -1, quebras: 0 };
    secoes.forEach((pts, i) => {
      const ate = Math.round((pts.length - 1) * 5 / 9) + 1;
      const q = quebras(pts.slice(0, ate), 20);
      if (q.length > pior.quebras) { pior.estacao = i; pior.quebras = q.length; }
    });
    diz(3, pior.quebras <= LIMIARES.quebrasNoCapoMax ? 'passa' : 'reprova',
      { quebrasNoCapo: pior.quebras, maximo: LIMIARES.quebrasNoCapoMax, estacao: pior.estacao }, null);
  }

  /* 4 — cabine pousada. Fora de escopo pelo mesmo motivo da 1. */
  diz(4, 'naoAplicavel', null, 'não há cabine nesta peça');

  /* 5 — reflexão ondula na linha de ombro. Ondulação medida por JANELA DE
     COMPRIMENTO DE ARCO, não por segunda diferença entre vértices vizinhos.

     A primeira versão usava a segunda diferença crua, e ela encolhe ~4x por
     nível de subdivisão: um zigue-zague de 80 mm na cage lia 40 mm no nível 1 e
     2,4 mm no nível 3, passando no limiar. Isso mede espaçamento de amostra, não
     ondulação — o mesmo defeito já corrigido uma vez no motor de prancha, e
     repetido aqui. Reamostrado por arco e comparado à média móvel, o número é
     estável entre níveis, que é o que um limiar em milímetros exige. */
  {
    const loop = cage.grade.map((l) => l[4]);
    diz(5, ...(() => {
      const max = ondulacaoPorArco(rastrearLoop(cage, loop, niveis).pontos);
      return [max <= LIMIARES.ondulacaoDaCristaMax ? 'passa' : 'reprova',
        { ondulacao: +max.toFixed(2), maximo: LIMIARES.ondulacaoDaCristaMax, janelaMm: JANELA_DE_ARCO }, null];
    })());
  }

  /* 6 — farol como decalque. Mede o que SOBRA do recuo depois da subdivisão,
     comparando a mesma cage com e sem recorte. Mesma topologia, então os ids
     correspondem e a diferença é o rebaixo real. */
  {
    const semFarol = subdividir(construirQuartoDianteiro({ recorteFarol: 0 }), niveis);
    let max = 0;
    for (const [id, p] of malha.V) {
      const q = semFarol.V.get(id);
      if (q) max = Math.max(max, norma(sub(p, q)));
    }
    diz(6, max >= LIMIARES.profundidadeDoFarolMin ? 'passa' : 'reprova',
      { profundidade: +max.toFixed(2), minimo: LIMIARES.profundidadeDoFarolMin }, null);
  }

  /* 7 — vão envidraçado. A mesma regra do arco: abertura é laço de borda com
     moldura de retorno. Borda de grade não é abertura — é onde a peça acaba. */
  {
    const temRetorno = [...cage.F.values()].some((f) => /parabrisa|envidracad|janela/i.test(f.parte ?? ''));
    diz(7, temRetorno ? 'passa' : 'reprova', { faceDeMoldura: temRetorno },
      temRetorno ? null 
        : 'a base do para-brisa apenas desloca vértices da borda da grade; não há laço de abertura nem moldura de retorno');
  }

  /* 8 — facetamento. Diedro entre faces vizinhas onde a superfície deveria ser
     lisa: fora de vinco declarado e fora de borda. */
  {
    const faces = new Map([...malha.F.values()].map((f) => [f.id, f]));
    const { arestas } = topologia([...faces.values()]);
    const normais = new Map([...faces.values()].map((f) => [f.id, normalDaFace(malha.V, f.vs)]));
    /* Linha de caráter é quebra INTENCIONAL: o vinco é o projeto, não defeito de
       amostragem. Rastrear os loops declarados dá as arestas exatas a ignorar.
       Ler `malha.vincos` no nível compilado não serve: nitidez 2 já expirou no
       nível 2, e a crista — quebra deliberada de 98° — entrava como facetamento. */
    const arestasDeCaracter = new Set();
    for (const [nome, l] of Object.entries(cage.loops ?? {})) {
      if (!/ombro|crista|farol|arco/i.test(nome)) continue;
      const vs = rastrearLoop(cage, l.v, niveis).vertices;
      for (let i = 0; i < vs.length - 1; i += 1) arestasDeCaracter.add(chave(vs[i], vs[i + 1]));
    }
    let max = 0;
    let onde = null;
    for (const e of [...arestas.values()].sort((x, y) => x.a - y.a || x.b - y.b)) {
      if (e.faces.length !== 2) continue;
      if (arestasDeCaracter.has(chave(e.a, e.b))) continue;
      /* O retorno de borda dobra quase 180° POR PROJETO: é a espessura da
         abertura, não facetamento. Medir a dobra dele como defeito de pele dava
         177,8° e escondia o número que interessa. */
      if (e.faces.some((id) => /Retorno/.test(faces.get(id).parte ?? ''))) continue;
      const d = grau(Math.acos(Math.max(-1, Math.min(1, ponto(normais.get(e.faces[0]), normais.get(e.faces[1]))))));
      if (d > max) { max = d; onde = [e.a, e.b]; }
    }
    diz(8, max <= LIMIARES.diedroLisoMax ? 'passa' : 'reprova',
      { diedroMax: +max.toFixed(2), maximo: LIMIARES.diedroLisoMax, aresta: onde }, null);
  }

  /* 9 — capô em calha. Do eixo de simetria até a crista o capô não pode
     afundar. Mede no compilado, não na tabela de entrada. */
  {
    /* Calha é CONCAVIDADE, não queda. No nariz a crista fica abaixo do eixo de
       simetria de propósito — o capô desce para o bico. Medir queda absoluta
       acusava 100 mm ali, e ali a forma está certa. O que denuncia calha é o
       capô passar POR BAIXO da corda que liga o eixo de simetria à crista. */
    let pior = { estacao: -1, afundamento: 0 };
    secoes.forEach((pts, i) => {
      const ate = Math.round((pts.length - 1) * 4 / 9);
      const a = pts[0];
      const b = pts[ate];
      const dx = b[0] - a[0];
      if (Math.abs(dx) < 1e-6) return;
      for (let k = 1; k < ate; k += 1) {
        const t = (pts[k][0] - a[0]) / dx;
        const abaixo = (a[1] + (b[1] - a[1]) * t) - pts[k][1];
        if (abaixo > pior.afundamento) pior = { estacao: i, afundamento: abaixo };
      }
    });
    diz(9, pior.afundamento <= LIMIARES.afundamentoDoCapoMax ? 'passa' : 'reprova',
      { afundamento: +pior.afundamento.toFixed(2), maximo: LIMIARES.afundamentoDoCapoMax, estacao: pior.estacao }, null);
  }

  /* 10 — casca aberta onde o carro é fechado. Borda livre é permitida só nos
     cortes declarados: soleira, cowl e plano de simetria. */
  {
    const naBorda = new Set(lacosDeBorda(malha).flat());
    const indevidos = [];
    for (const v of naBorda) {
      const [x, y, z] = malha.V.get(v);
      if (x <= 1) continue;                       // costura de simetria
      if (y <= CORTES.soleiraY) continue;         // corte da soleira
      if (z <= CORTES.cowlZ) continue;            // corte da cowl
      const raio = Math.hypot(z - ALVO.zEixo, y - ALVO.rodaRaio);
      if (raio < ALVO.arcoRaio + 40) continue;    // arco de roda, abertura declarada
      indevidos.push(v);
    }
    diz(10, indevidos.length ? 'reprova' : 'passa',
      { verticesEmBordaIndevida: indevidos.length },
      indevidos.length ? `a superfície acaba no ar em ${indevidos.length} vértice(s) fora de corte declarado` : null);
  }

  return {
    niveis,
    resultados: r,
    reprovadas: r.filter((x) => x.veredito === 'reprova').map((x) => x.n),
    naoAplicaveis: r.filter((x) => x.veredito === 'naoAplicavel').map((x) => x.n),
  };
}

export function imprimirRejeicoes(av) {
  const linhas = [`condições de rejeição do P0 — nível ${av.niveis}`, ''];
  for (const x of av.resultados) {
    const marca = { passa: '  ok  ', reprova: 'REPROVA', naoAplicavel: '  n/a ' }[x.veredito];
    linhas.push(`${marca}  ${x.n}. ${x.texto}`);
    if (x.medida) linhas.push(`          ${JSON.stringify(x.medida)}`);
    if (x.detalhe) linhas.push(`          ${x.detalhe}`);
  }
  linhas.push('', av.reprovadas.length
    ? `REPROVADA — dispararam: ${av.reprovadas.join(', ')}`
    : 'nenhuma condição de rejeição disparou');
  return linhas.join('\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const av = avaliarRejeicoes();
  console.log(imprimirRejeicoes(av));
  process.exitCode = av.reprovadas.length ? 1 : 0;
}
