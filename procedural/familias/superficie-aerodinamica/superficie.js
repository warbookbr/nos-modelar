/* superficie.js — as seções do `loft` de uma superfície aerodinâmica: a parte fixa, o comando de cada lado e as portas, em metro.

   O `derivar` entrega aqui os parâmetros já em metro e em graus e leva o resultado aos argumentos da composição. A lista de
   seções de cada `loft` tem comprimento fixo por composição (o `loft` do núcleo guarda 1000 vértices e 1000 faces por passo), e o
   que muda com os parâmetros são as posições: onde o comando começa e acaba, onde a ponta se levanta.

   AS SEÇÕES DA PARTE FIXA, da raiz para a ponta. Na raiz, uma seção cheia em X = 0 (a superfície inteira, que continua pelo plano
   de simetria e é espelhada) ou, na semi-superfície, uma corda em X = 0 e a seção cheia logo depois. Depois, o degrau da raiz (a
   primeira face do caminho é horizontal, e a raiz fica no plano de simetria mesmo com diedro) e o trecho até o comando. O comando
   ocupa um trecho de seções com o entalhe, entre duas seções cheias a uma distância de corte do trecho, que são a parede do
   entalhe. Depois do comando, as seções até a curva da ponta, a curva, a tampa (as seções com a espessura vezes o cosseno de um
   ângulo) e a corda da ponta. Com `comprimentoDaTampa` a tampa tem o comprimento declarado ao longo da tangente final, e com os raios dos
   cantos as seções a menos de um raio da ponta se estreitam em u, como em `geometria.js`.

   AS SEÇÕES DO COMANDO. Quatro seções cheias entre as paredes do entalhe, a uma fresta de cada uma, fechadas nas duas pontas numa
   corda a uma espessura de tampa da seção cheia. O contorno do comando é o nariz (o arco) e a parte do perfil atrás do eixo. O do
   lado esquerdo é o mesmo, com X de -b a -a em ordem crescente como o do direito, de modo que o `loft` o fecha com a mesma
   orientação. */
import {
  ANGULOS_DA_TAMPA, ESPESSURA_DA_TAMPA, FAIXA_DO_RAIO, FRACAO_DO_CORTE_NA_ENVERGADURA, FRACAO_MAXIMA_DA_FRESTA_NO_COMANDO, GRAUS,
  INTERVALOS_ATE_A_CURVA, INTERVALOS_DA_RAIZ_AO_COMANDO, INTERVALOS_DO_COMANDO_A_CURVA, INTERVALOS_NO_COMANDO,
  INTERVALOS_NO_ENTALHE, LADOS_DA_SECAO, LADOS_DO_COMANDO, MINIMO_DO_CORTE, intervalosNaCurva, inverterSuave, aparaOsCantos, contornoComEntalhe, contornoDaSecao,
  contornoDoComando, dot, mapear, meiaEspessura, norma, plantaDa, pontoDaSecao, primeiroDoGrupoDoEntalhe, quadrosDoLoft, transformarPonto,
} from './geometria.js';

/** O número de seções de cada `loft` de uma composição, para a composição e os testes contarem o mesmo. */
export function contagemDeSecoes({ simetria, comando }) {
  const raiz = simetria ? 1 : 2;
  const meio = comando
    ? INTERVALOS_DA_RAIZ_AO_COMANDO + (1 + INTERVALOS_NO_ENTALHE) + 1 + INTERVALOS_DO_COMANDO_A_CURVA
    : INTERVALOS_ATE_A_CURVA;
  return { fixa: raiz + 1 + meio + intervalosNaCurva(comando) + ANGULOS_DA_TAMPA.length + 1, comando: INTERVALOS_NO_COMANDO + 1 + 2 };
}

const ate = (de, ao, n, tipo) => Array.from({ length: n }, (_, k) => ({ x: de + ((ao - de) * (k + 1)) / n, tipo }));
/* as seções da curva da ponta, espaçadas para a fração `(k / n) ** expoente` do ângulo da ponta chegar em cada uma (o inverso da curva
   de quinto grau): com o expoente 1 o giro entre seções vizinhas é o ângulo dividido por n em toda a curva, e não 1,9 vezes isso no meio;
   com 2, a superfície sem comando, as primeiras seções ficam coladas no começo da curva, onde o bordo de ataque de uma pá de corda larga
   e incidência alta vira de 63 para 34 graus por seção (medido no ponto máximo) */
const naCurva = (de, ao, n, expoente) => Array.from({ length: n }, (_, k) => ({ x: de + (ao - de) * inverterSuave(((k + 1) / n) ** expoente), tipo: 'cheia' }));
const arredondar = (v) => Math.round(v * 1e12) / 1e12;

/** O índice da coordenada do mundo que o espelho em torno do plano de simetria nega: o x do avião (orientação 0) ou o y. */
export const eixoDoEspelho = (orientacao) => (orientacao === 0 ? 0 : 1);

/**
 * A superfície em seções.
 *
 * `p` (metro, graus, razões): `semi` (a extensão que o caminho percorre), `deslocamentoDaRaiz` (X da raiz, nas pás),
 * `orientacao`, `simetria`, `cordaNaRaiz`, `cordaNaPonta`, `abaulamentoDaCorda`, `eixo`, `enflechamento`, `diedro`, `torcao`,
 * `incidenciaNaRaiz`, `curvatura`, `posicaoDaCurvatura`, `espessuraNaRaiz`, `espessuraNaPonta`, `bordoDeFuga`, `pontaLevantada`,
 * `extensaoDaPonta`, `comprimentoDaTampa` (metro ao longo do caminho; zero é a tampa automática em X), `raioDoCantoDeAtaque` e `raioDoCantoDeFuga`
 * (metro; zero é a ponta sem canto arredondado), `comando`, `cordaDoComando`, `inicioDoComando`, `fimDoComando` e `fresta`. `semEixo` dispensa o comando e o eixo (a pá).
 * Sem `comando` o eixo e as seções do comando existem na mesma, para a porta do eixo da dobradiça marcar onde a dobradiça ficaria.
 */
export function superficieEmSecoes(p) {
  const planta = plantaDa(p);
  const { semi, xDoDegrau, xDaCurva, xDoCorte, comprimentoDaTampa } = planta;
  const orientacao = p.orientacao;
  const perfilEm = (x) => ({
    curvatura: p.curvatura, posicaoDaCurvatura: p.posicaoDaCurvatura, espessura: planta.espessura(x), bordoDeFuga: p.bordoDeFuga,
  });
  const secaoEm = (x, escalaDeW = 1) => ({
    corda: planta.corda(x), eixo: p.eixo, incidencia: planta.incidencia(x), deslocamento: planta.deslocamento(x), escalaDeW,
  });
  const posicao = (x, lado = 1) => mapear(orientacao, [arredondar(lado * (p.deslocamentoDaRaiz + x)), arredondar(planta.y(x)), 0]);
  const orientacaoDoMundo = mapear(orientacao, [0, 0, 1]);
  const corte = Math.max(MINIMO_DO_CORTE, FRACAO_DO_CORTE_NA_ENVERGADURA * semi);
  const epsilonDaRaiz = Math.min(ESPESSURA_DA_TAMPA, xDoDegrau / 3);

  /* ----- o comando: a faixa, a fresta, o eixo ----- */
  const a = p.inicioDoComando * semi;
  const b = p.fimDoComando * semi;
  const xEixo = 1 - p.cordaDoComando;
  const fresta = Math.min(p.fresta * planta.corda((a + b) / 2), FRACAO_MAXIMA_DA_FRESTA_NO_COMANDO * (b - a));
  const xa = a + fresta;
  const xb = b - fresta;
  const epsilonDoComando = Math.min(ESPESSURA_DA_TAMPA, fresta / 4);

  /* ----- as seções da parte fixa ----- */
  const estacoes = [];
  if (p.simetria) estacoes.push({ x: 0, tipo: 'cheia' });
  else estacoes.push({ x: 0, tipo: 'borda' }, { x: epsilonDaRaiz, tipo: 'cheia' });
  estacoes.push({ x: xDoDegrau, tipo: 'cheia' });
  if (p.comando) {
    estacoes.push(...ate(xDoDegrau, a - corte, INTERVALOS_DA_RAIZ_AO_COMANDO, 'cheia'));
    estacoes.push({ x: a, tipo: 'entalhe' });
    for (let k = 1; k <= INTERVALOS_NO_ENTALHE; k++) estacoes.push({ x: a + ((b - a) * k) / INTERVALOS_NO_ENTALHE, tipo: 'entalhe' });
    estacoes.push({ x: b + corte, tipo: 'cheia' });
    estacoes.push(...ate(b + corte, xDaCurva, INTERVALOS_DO_COMANDO_A_CURVA, 'cheia'));
  } else {
    estacoes.push(...ate(xDoDegrau, xDaCurva, INTERVALOS_ATE_A_CURVA, 'cheia'));
  }
  estacoes.push(...naCurva(xDaCurva, xDoCorte, intervalosNaCurva(p.comando), p.comando ? 1 : 2));
  for (const angulo of ANGULOS_DA_TAMPA) estacoes.push({ x: xDoCorte + comprimentoDaTampa * Math.sin(angulo * GRAUS), tipo: 'cheia', escalaDeW: Math.cos(angulo * GRAUS) });
  estacoes.push({ x: semi, tipo: 'borda' });

  /* o primeiro ponto do arco do entalhe: a primeira estação que o círculo, no seu maior raio nas seções do entalhe, não alcança */
  const raioMaximo = Math.max(0, ...estacoes.filter(({ tipo }) => tipo === 'entalhe')
    .map(({ x }) => meiaEspessura(xEixo, planta.espessura(x), p.bordoDeFuga) + fresta / planta.corda(x)));
  const primeiroDoGrupo = primeiroDoGrupoDoEntalhe(xEixo, raioMaximo);

  const cantos = { xDaPonta: semi, raioDeAtaque: p.raioDoCantoDeAtaque ?? 0, raioDeFuga: p.raioDoCantoDeFuga ?? 0 };
  const fixa = estacoes.map((e) => {
    const parametros = secaoEm(e.x, e.escalaDeW ?? 1);
    const pos = posicao(e.x);
    if (e.tipo === 'borda') {
      const aresta = [transformarPonto({ ...parametros, escalaDeW: 0 }, [1, 0]), transformarPonto({ ...parametros, escalaDeW: 0 }, [0, 0])];
      return { x: e.x, pos, aresta: aparaOsCantos(aresta, e.x, cantos) };
    }
    if (e.tipo === 'entalhe') {
      const entalhe = contornoComEntalhe(perfilEm(e.x), parametros, { xEixo, fresta: fresta / planta.corda(e.x), primeiroDoGrupo });
      if (!entalhe) throw new Error(`superfície aerodinâmica: o entalhe do comando não corta o perfil em X = ${e.x} m`);
      return { x: e.x, pos, contorno: entalhe.pontos };
    }
    return { x: e.x, pos, contorno: aparaOsCantos(contornoDaSecao(perfilEm(e.x), parametros), e.x, cantos) };
  });

  /* ----- o comando de cada lado ----- */
  const secoesDoComando = (lado) => {
    const xs = [xa - epsilonDoComando, ...Array.from({ length: INTERVALOS_NO_COMANDO + 1 }, (_, k) => xa + ((xb - xa) * k) / INTERVALOS_NO_COMANDO), xb + epsilonDoComando];
    /* o `loft` lê o X em ordem crescente: o lado esquerdo (X negativo) percorre a lista do direito de trás para a frente */
    return (lado > 0 ? xs : xs.slice().reverse()).map((x, i, todos) => {
      const borda = i === 0 || i === todos.length - 1;
      const xCheio = borda ? (x < (xa + xb) / 2 ? xa : xb) : x;
      const forma = contornoDoComando(perfilEm(xCheio), secaoEm(xCheio), { xEixo });
      return { x, xCheio, pos: posicao(x, lado), forma, ...(borda ? { aresta: forma.corda } : { contorno: forma.pontos }) };
    });
  };
  const comandos = (p.semEixo ? [] : p.simetria ? [1, -1] : [1]).map((lado) => {
    const secoes = secoesDoComando(lado);
    const quadros = quadrosDoLoft(secoes.map((s) => s.pos), orientacaoDoMundo);
    const aneis = secoes.map((s, i) => ({ s, quadro: quadros[i] })).filter(({ s }) => !s.aresta);
    const centro = (anel) => pontoDaSecao(anel.s.pos, anel.quadro, anel.s.forma.centro);
    return { lado, secoes, quadros, eixo: { de: centro(aneis[0]), para: centro(aneis.at(-1)) } };
  });

  return {
    planta, fixa, quadrosDaFixa: quadrosDoLoft(fixa.map((s) => s.pos), orientacaoDoMundo), comandos, orientacaoDoMundo, fresta, primeiroDoGrupo, xEixo, a, b, xa, xb,
    lados: LADOS_DA_SECAO, ladosDoComando: LADOS_DO_COMANDO,
  };
}

/* ---------- as portas ---------- */

/** Os vértices de um `loft`: cada anel inteiro e as duas pontas de cada seção-corda (o resto da corda fica entre elas). */
export function verticesDoLoft(secoes, quadros) {
  const vertices = [];
  secoes.forEach((s, i) => {
    for (const ponto of s.contorno ?? s.aresta) vertices.push(pontoDaSecao(s.pos, quadros[i], ponto));
  });
  return vertices;
}

/** Os vértices refletidos no plano de simetria (a coordenada do mundo que o espelho nega). */
export const refletirVertices = (vertices, orientacao) => vertices.map((v) => v.map((c, k) => (k === eixoDoEspelho(orientacao) ? -c : c)));

/**
 * A porta do eixo da dobradiça: o cilindro em torno do eixo que liga os centros do nariz nas duas pontas do comando, com o
 * centro no plano de um vértice da parte (a conferência da porta exige um vértice da face de origem no plano) e o raio que a
 * conferência mede: o maior raio, em torno do eixo, dos vértices da parte a até 10 mm do plano.
 */
export function portaDoEixo({ eixo, vertices, vertice }) {
  const d = norma([eixo.para[0] - eixo.de[0], eixo.para[1] - eixo.de[1], eixo.para[2] - eixo.de[2]]);
  const comprimento = Math.hypot(eixo.para[0] - eixo.de[0], eixo.para[1] - eixo.de[1], eixo.para[2] - eixo.de[2]);
  const t0 = dot([vertice[0] - eixo.de[0], vertice[1] - eixo.de[1], vertice[2] - eixo.de[2]], d);
  const centro = [eixo.de[0] + t0 * d[0], eixo.de[1] + t0 * d[1], eixo.de[2] + t0 * d[2]];
  let maior = 0;
  for (const v of vertices) {
    const rel = [v[0] - centro[0], v[1] - centro[1], v[2] - centro[2]];
    const t = dot(rel, d);
    if (Math.abs(t) > FAIXA_DO_RAIO) continue;
    maior = Math.max(maior, Math.hypot(rel[0] - t * d[0], rel[1] - t * d[1], rel[2] - t * d[2]));
  }
  return { centro, eixo: d, raio: maior, inicio: -t0, fim: comprimento - t0 };
}

/**
 * Os três giros em torno de eixos do mundo que valem um giro de `graus` em torno do eixo `d`: alinham `d` a x (um giro em y e um
 * em z), giram em x e desfazem o alinhamento. Devolve a lista de `{ eixo, graus }` na ordem em que se aplicam.
 */
export function giroEmTornoDe(d, graus) {
  const rho = Math.hypot(d[0], d[2]);
  const beta = Math.atan2(d[2], d[0]) / GRAUS;
  const fi = Math.atan2(d[1], rho) / GRAUS;
  return [{ eixo: 'y', graus: beta }, { eixo: 'z', graus: -fi }, { eixo: 'x', graus }, { eixo: 'z', graus: fi }, { eixo: 'y', graus: -beta }];
}
