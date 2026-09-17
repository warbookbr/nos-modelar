/* descricao-do-gesto.js — o que a pessoa fez na bancada, dito em palavras
 * geométricas com números.
 *
 * A rodada de absorção recebe hoje uma nuvem de pontos por parte. A nuvem prova
 * se a receita reexecutada chega onde a peça ficou, e é exatamente o que o
 * `absorver` precisa, mas ela não diz o que houve: quem lê 266 coordenadas
 * novas não sabe se a parte andou inteira, girou, cresceu ou se um canto foi
 * puxado sozinho. Este módulo responde essa pergunta comparando a malha do
 * arquivo com a editada e classificando, por parte, o movimento de cada vértice
 * que existe nas duas.
 *
 * A DESCRIÇÃO NÃO ESCREVE RECEITA. Ela é determinística e não infere passo
 * nenhum: quem transforma a descrição em `TABELA` e `derivar` continua sendo
 * quem escreve a receita, com a decisão registrada no plano de não automatizar
 * isso. O que ela faz é encurtar a leitura.
 *
 * O QUE ELA RECONHECE, e por quê esse conjunto. As operações da bancada giram e
 * escalam em torno de um eixo de coordenada, então a detecção de rotação e de
 * escala procura eixo de coordenada e nada além disso; um giro em torno de eixo
 * oblíquo cai em "sem padrão", e isso está dito no resultado em vez de virar
 * uma classificação aproximada. Esticão e dobra existem porque são o que o
 * arrasto de um vértice ou de uma face produz numa parte cujo outro extremo
 * está preso, que é o gesto que motivou este plano inteiro.
 *
 * UNIDADE. Entra metro, que é o que o estado neutro guarda, e sai milímetro em
 * todo número visível, que é a unidade em que a `TABELA` é medida.
 */

const PARADO_M = 1e-6;
const FOLGA_RELATIVA = 0.02;
/* Quanto da nuvem um pareamento parcial precisa cobrir para falar pela parte. */
const COBERTURA_MINIMA = 0.6;

const subtrair = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const escalarVetor = (a, n) => [a[0] * n, a[1] * n, a[2] * n];
const produto = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norma = (a) => Math.sqrt(produto(a, a));
const emMm = (v) => Number((v * 1000).toFixed(3));
const emMmVetor = (v) => v.map(emMm);
const EIXOS = ['x', 'y', 'z'];

/* Uma explicação vale quando o pior resto que ela deixa é pequeno perto do
   próprio movimento que ela tenta explicar. O piso absoluto existe para que uma
   parte que andou um milésimo de milímetro não passe a exigir precisão
   impossível de quem a moveu. */
function aceita(restoMaximo, deslocamentoMaximo) {
  return restoMaximo <= Math.max(deslocamentoMaximo * FOLGA_RELATIVA, PARADO_M);
}

function verticesPorParte(neutro) {
  const porParte = new Map();
  if (!neutro?.F || !neutro?.V) return porParte;
  for (const face of neutro.F.values()) {
    if (typeof face.parte !== 'string' || !face.parte) continue;
    let conjunto = porParte.get(face.parte);
    if (!conjunto) { conjunto = new Set(); porParte.set(face.parte, conjunto); }
    for (const v of face.vs) if (neutro.V.has(v)) conjunto.add(v);
  }
  return porParte;
}

function centroDe(pontos) {
  const soma = pontos.reduce((acc, p) => [acc[0] + p[0], acc[1] + p[1], acc[2] + p[2]], [0, 0, 0]);
  return escalarVetor(soma, 1 / pontos.length);
}

function tentarTranslacao(antes, depois, maior) {
  const candidato = subtrair(depois[0], antes[0]);
  let resto = 0;
  for (let i = 0; i < antes.length; i += 1) {
    resto = Math.max(resto, norma(subtrair(subtrair(depois[i], antes[i]), candidato)));
  }
  if (!aceita(resto, maior)) return null;
  return {
    tipo: 'translacao',
    frase: `a parte andou inteira ${emMm(norma(candidato))} mm, sem mudar de forma`,
    deslocamentoMm: emMmVetor(candidato),
    distanciaMm: emMm(norma(candidato)),
    restoMm: emMm(resto),
  };
}

/* Giro em torno de um eixo de coordenada que passa pelo centro da parte. O
   ângulo sai do vértice mais afastado do eixo, que é o que mede o giro com o
   menor erro relativo, e depois é conferido em todos os outros. */
function tentarRotacao(antes, depois, centro, maior) {
  for (let e = 0; e < 3; e += 1) {
    const a = (e + 1) % 3;
    const b = (e + 2) % 3;
    let melhor = -1;
    let angulo = 0;
    for (let i = 0; i < antes.length; i += 1) {
      const u = [antes[i][a] - centro[a], antes[i][b] - centro[b]];
      const w = [depois[i][a] - centro[a], depois[i][b] - centro[b]];
      const raio = Math.hypot(u[0], u[1]);
      if (raio > melhor) {
        melhor = raio;
        angulo = Math.atan2(w[1], w[0]) - Math.atan2(u[1], u[0]);
      }
    }
    if (!(melhor > PARADO_M)) continue;
    const cos = Math.cos(angulo);
    const sen = Math.sin(angulo);
    let resto = 0;
    for (let i = 0; i < antes.length; i += 1) {
      const ua = antes[i][a] - centro[a];
      const ub = antes[i][b] - centro[b];
      const esperado = [];
      esperado[e] = antes[i][e];
      esperado[a] = centro[a] + ua * cos - ub * sen;
      esperado[b] = centro[b] + ua * sen + ub * cos;
      resto = Math.max(resto, norma(subtrair(depois[i], esperado)));
    }
    if (!aceita(resto, maior)) continue;
    const graus = Number(((angulo * 180) / Math.PI).toFixed(3));
    if (Math.abs(graus) < 1e-3) continue;
    return {
      tipo: 'rotacao',
      frase: `a parte girou ${graus}° em torno do eixo ${EIXOS[e]} que passa pelo seu centro`,
      eixo: EIXOS[e],
      grausDoGiro: graus,
      centroMm: emMmVetor(centro),
      restoMm: emMm(resto),
    };
  }
  return null;
}

/* Escala em torno do centro da parte, com um fator por eixo. Fator 1 nos três
   eixos é parada, e por isso a escala só é oferecida depois da translação. */
function tentarEscala(antes, depois, centro, maior) {
  const fatores = [];
  for (let e = 0; e < 3; e += 1) {
    let melhor = -1;
    let fator = 1;
    for (let i = 0; i < antes.length; i += 1) {
      const d = Math.abs(antes[i][e] - centro[e]);
      if (d > melhor) {
        melhor = d;
        fator = d > PARADO_M ? (depois[i][e] - centro[e]) / (antes[i][e] - centro[e]) : 1;
      }
    }
    fatores.push(melhor > PARADO_M ? fator : 1);
  }
  let resto = 0;
  for (let i = 0; i < antes.length; i += 1) {
    const esperado = [0, 1, 2].map((e) => centro[e] + (antes[i][e] - centro[e]) * fatores[e]);
    resto = Math.max(resto, norma(subtrair(depois[i], esperado)));
  }
  if (!aceita(resto, maior)) return null;
  const arredondados = fatores.map((f) => Number(f.toFixed(4)));
  if (arredondados.every((f) => Math.abs(f - 1) < 1e-4)) return null;
  const mexidos = arredondados
    .map((f, e) => (Math.abs(f - 1) < 1e-4 ? null : `${EIXOS[e]} por ${f}`))
    .filter(Boolean);
  return {
    tipo: 'escala',
    frase: `a parte mudou de tamanho em torno do seu centro, ${mexidos.join(' e ')}`,
    fatores: arredondados,
    centroMm: emMmVetor(centro),
    restoMm: emMm(resto),
  };
}

/* Esticão: uma ponta fica onde estava e a outra anda, com o meio acompanhando
   na proporção da distância até a ponta presa. É o que acontece quando alguém
   arrasta a face do topo de um tubo cuja base encosta noutra peça. */
function tentarEsticao(antes, depois, maior) {
  for (let e = 0; e < 3; e += 1) {
    const valores = antes.map((p) => p[e]);
    const menor = Math.min(...valores);
    const maiorValor = Math.max(...valores);
    const extensao = maiorValor - menor;
    if (!(extensao > PARADO_M)) continue;
    for (const preso of ['menor', 'maior']) {
      const base = preso === 'menor' ? menor : maiorValor;
      let melhor = -1;
      let ponta = [0, 0, 0];
      for (let i = 0; i < antes.length; i += 1) {
        const t = Math.abs(antes[i][e] - base) / extensao;
        if (t > melhor) { melhor = t; ponta = escalarVetor(subtrair(depois[i], antes[i]), 1 / t); }
      }
      let resto = 0;
      for (let i = 0; i < antes.length; i += 1) {
        const t = Math.abs(antes[i][e] - base) / extensao;
        resto = Math.max(resto, norma(subtrair(subtrair(depois[i], antes[i]), escalarVetor(ponta, t))));
      }
      if (!aceita(resto, maior)) continue;
      if (!(norma(ponta) > PARADO_M)) continue;
      return {
        tipo: 'esticao',
        frase: `a ponta de ${EIXOS[e]} ${preso === 'menor' ? 'mais alta' : 'mais baixa'} andou `
          + `${emMm(norma(ponta))} mm e a outra ficou presa, com o meio acompanhando na proporção`,
        eixo: EIXOS[e],
        pontaPresa: preso,
        deslocamentoDaPontaMm: emMmVetor(ponta),
        restoMm: emMm(resto),
      };
    }
  }
  return null;
}

/* Dobra: o deslocamento aponta sempre para o mesmo lado, mas cresce com o
   quadrado da distância ao longo de um eixo, e não com ela. É a diferença entre
   arquear um tubo e esticá-lo, e sem esse teste os dois sairiam como "sem
   padrão" juntos. */
function tentarDobra(antes, depois, maior) {
  let direcao = [0, 0, 0];
  let melhor = -1;
  for (let i = 0; i < antes.length; i += 1) {
    const d = subtrair(depois[i], antes[i]);
    const n = norma(d);
    if (n > melhor) { melhor = n; direcao = escalarVetor(d, 1 / n); }
  }
  if (!(melhor > PARADO_M)) return null;
  for (let i = 0; i < antes.length; i += 1) {
    const d = subtrair(depois[i], antes[i]);
    const projetado = escalarVetor(direcao, produto(d, direcao));
    if (!aceita(norma(subtrair(d, projetado)), maior)) return null;
  }
  for (let e = 0; e < 3; e += 1) {
    const valores = antes.map((p) => p[e]);
    const menor = Math.min(...valores);
    const extensao = Math.max(...valores) - menor;
    if (!(extensao > PARADO_M)) continue;
    const ts = antes.map((p) => (p[e] - menor) / extensao);
    const ys = antes.map((p, i) => produto(subtrair(depois[i], p), direcao));
    const quadratico = ajustarPolinomio(ts, ys, 2);
    const linear = ajustarPolinomio(ts, ys, 1);
    if (!quadratico || !linear) continue;
    if (!aceita(quadratico.resto, maior)) continue;
    if (aceita(linear.resto, maior)) continue;
    return {
      tipo: 'dobra',
      frase: `a parte arqueou ao longo de ${EIXOS[e]}: o deslocamento cresce com o quadrado da `
        + `distância, chegando a ${emMm(melhor)} mm na ponta`,
      eixo: EIXOS[e],
      direcao: direcao.map((c) => Number(c.toFixed(4))),
      flechaMm: emMm(melhor),
      restoMm: emMm(quadratico.resto),
    };
  }
  return null;
}

/* Mínimos quadrados por eliminação de Gauss sobre a matriz normal. O grau é 1
   ou 2, então a matriz tem no máximo três linhas e não vale trazer álgebra
   linear de fora para resolvê-la. */
function ajustarPolinomio(ts, ys, grau) {
  const n = grau + 1;
  const matriz = [];
  for (let i = 0; i < n; i += 1) {
    const linha = [];
    for (let j = 0; j < n; j += 1) linha.push(ts.reduce((s, t) => s + t ** (i + j), 0));
    linha.push(ts.reduce((s, t, k) => s + t ** i * ys[k], 0));
    matriz.push(linha);
  }
  for (let coluna = 0; coluna < n; coluna += 1) {
    let pivo = coluna;
    for (let l = coluna + 1; l < n; l += 1) {
      if (Math.abs(matriz[l][coluna]) > Math.abs(matriz[pivo][coluna])) pivo = l;
    }
    if (Math.abs(matriz[pivo][coluna]) < 1e-12) return null;
    [matriz[coluna], matriz[pivo]] = [matriz[pivo], matriz[coluna]];
    for (let l = 0; l < n; l += 1) {
      if (l === coluna) continue;
      const fator = matriz[l][coluna] / matriz[coluna][coluna];
      for (let c = coluna; c <= n; c += 1) matriz[l][c] -= fator * matriz[coluna][c];
    }
  }
  const coeficientes = matriz.map((linha, i) => linha[n] / matriz[i][i]);
  let resto = 0;
  for (let k = 0; k < ts.length; k += 1) {
    const previsto = coeficientes.reduce((s, c, i) => s + c * ts[k] ** i, 0);
    resto = Math.max(resto, Math.abs(previsto - ys[k]));
  }
  return { coeficientes, resto };
}

function classificar(antes, depois) {
  let maior = 0;
  let quantosAndaram = 0;
  for (let i = 0; i < antes.length; i += 1) {
    const d = norma(subtrair(depois[i], antes[i]));
    if (d > PARADO_M) quantosAndaram += 1;
    if (d > maior) maior = d;
  }
  if (quantosAndaram === 0) {
    return { tipo: 'parada', frase: 'nenhum vértice desta parte andou', quantosAndaram: 0, maiorMm: 0 };
  }
  const centro = centroDe(antes);
  const achado = tentarTranslacao(antes, depois, maior)
    ?? tentarRotacao(antes, depois, centro, maior)
    ?? tentarEscala(antes, depois, centro, maior)
    ?? tentarEsticao(antes, depois, maior)
    ?? tentarDobra(antes, depois, maior)
    ?? {
      tipo: 'sem padrao',
      frase: 'os vértices andaram sem seguir translação, rotação, escala, esticão nem dobra',
    };
  return { ...achado, quantosAndaram, maiorMm: emMm(maior) };
}

/* A descrição por parte, mais o que a edição mudou de topologia. Parte que
   nasceu ou sumiu não tem movimento a classificar, e dizer isso é metade do que
   a rodada de absorção precisa saber para revisar `PLANO` e `contatos`. */
export function descreverGesto(antes, depois) {
  const deAntes = verticesPorParte(antes);
  const deDepois = verticesPorParte(depois);
  const nomes = [...new Set([...deAntes.keys(), ...deDepois.keys()])].sort();

  const partes = [];
  const nascidas = [];
  const sumidas = [];
  for (const nome of nomes) {
    if (!deAntes.has(nome)) { nascidas.push(nome); continue; }
    if (!deDepois.has(nome)) { sumidas.push(nome); continue; }
    const comuns = [...deAntes.get(nome)].filter((v) => deDepois.get(nome).has(v)).sort((a, b) => a - b);
    const total = deAntes.get(nome).size;
    if (comuns.length === 0) {
      partes.push({
        parte: nome,
        tipo: 'sem padrao',
        frase: 'nenhum vértice desta parte sobreviveu à edição, então não há movimento a comparar',
        quantosAndaram: 0,
        verticesComparados: 0,
        verticesAntes: total,
        verticesDepois: deDepois.get(nome).size,
      });
      continue;
    }
    const classificacao = classificar(
      comuns.map((v) => antes.V.get(v)),
      comuns.map((v) => depois.V.get(v)),
    );
    partes.push({
      parte: nome,
      ...classificacao,
      verticesComparados: comuns.length,
      verticesAntes: total,
      verticesDepois: deDepois.get(nome).size,
    });
  }

  return {
    partes,
    nascidas,
    sumidas,
    mexidas: partes.filter((p) => p.tipo !== 'parada').map((p) => p.parte),
  };
}

/* A PARTIR DO ALVO SALVO, que é o que existe em disco.
 *
 * O alvo guarda nuvem de pontos por parte e não guarda identificador de vértice
 * nenhum, porque id interno não é identidade persistida. Comparar duas nuvens
 * exige então descobrir qual ponto virou qual, e aqui isso é feito por duas
 * suposições, testadas nessa ordem.
 *
 * A primeira é a ordem lexicográfica, que é como o alvo já guarda os pontos:
 * deslocar a parte inteira não troca dois pontos de lugar nessa ordem, então
 * parear pelo índice acerta qualquer translação, por maior que seja. A segunda é
 * o vizinho mais próximo nos dois sentidos, que acerta um gesto pequeno onde a
 * ordem mudou mas ninguém passou do outro lado de um vizinho.
 *
 * Vence a suposição que explica os números — a que produz uma classificação
 * reconhecida em vez de "sem padrão". Quando nenhuma das duas explica, o que sai
 * é justamente "sem padrão", com o pareamento por vizinho, e isso é uma resposta
 * e não uma falha: resta o `absorver`, que mede desvio sem precisar saber quem
 * virou quem. */
export function descreverGestoDoAlvo(neutro, alvo) {
  const atuais = extrairNuvemPorParte(neutro);
  const declaradas = new Map((alvo?.partes ?? []).map((p) => [p.parte, p.pontos ?? []]));
  const nomes = [...new Set([...atuais.keys(), ...declaradas.keys()])].sort();

  const partes = [];
  const nascidas = [];
  const sumidas = [];
  for (const nome of nomes) {
    if (!atuais.has(nome)) { nascidas.push(nome); continue; }
    if (!declaradas.has(nome)) { sumidas.push(nome); continue; }
    partes.push({ parte: nome, ...compararNuvens(atuais.get(nome), declaradas.get(nome)) });
  }

  return {
    partes,
    nascidas,
    sumidas,
    mexidas: partes.filter((p) => p.tipo !== 'parada').map((p) => p.parte),
  };
}

function compararNuvens(antes, depois) {
  const comum = {
    verticesAntes: antes.length,
    verticesDepois: depois.length,
  };
  if (antes.length !== depois.length || antes.length === 0) {
    return {
      ...comum,
      tipo: 'sem pareamento',
      frase: `a parte tem ${antes.length} pontos na receita e ${depois.length} no alvo, então não `
        + 'dá para dizer qual ponto virou qual',
      quantosAndaram: 0,
      verticesComparados: 0,
    };
  }

  /* O pareamento por vizinho pode cobrir só parte da nuvem, e cobrir parte é
     melhor que cobrir errado: quem move a peça em x desmancha a ordem
     lexicográfica, que é ordenada por x primeiro, e parear por índice ali
     compara pontos de pontas opostas do tubo. Um pareamento parcial só é aceito
     quando alcança a maioria dos pontos, senão o que resta descreve um pedaço
     pequeno demais para valer pela parte. */
  const porVizinho = parearPorVizinhoMutuo(antes, depois) ?? [];
  const candidatos = [
    { nome: 'ordem', pares: antes.map((_, i) => [i, i]) },
    { nome: 'vizinho', pares: porVizinho },
    { nome: 'guloso', pares: parearPorMenorDistancia(antes, depois) },
  ].filter((c) => c.pares.length >= antes.length * COBERTURA_MINIMA);

  let escolhida = null;
  for (const candidato of candidatos) {
    const achado = classificar(
      candidato.pares.map(([a]) => antes[a]),
      candidato.pares.map(([, b]) => depois[b]),
    );
    const cobertura = candidato.pares.length;
    if (achado.tipo !== 'sem padrao') {
      if (!escolhida || escolhida.tipo === 'sem padrao' || cobertura > escolhida.verticesComparados) {
        escolhida = { ...achado, pareamento: candidato.nome, verticesComparados: cobertura };
      }
      continue;
    }
    /* Nenhum padrão reconhecido ainda: fica o de menor deslocamento máximo, e
       não o que cobre mais pontos. Um pareamento trocado infla esse número com
       distâncias que ninguém percorreu — medido na bicicleta, o pareamento
       completo por menor distância atribuiu 32,6 mm de movimento a um gesto de
       6 mm, enquanto o parcial, cobrindo 28 dos 30 pontos, ficou em 5,9 mm. */
    if (!escolhida || (escolhida.tipo === 'sem padrao' && achado.maiorMm < escolhida.maiorMm)) {
      escolhida = { ...achado, pareamento: candidato.nome, verticesComparados: cobertura };
    }
  }
  if (!escolhida) {
    return {
      ...comum,
      tipo: 'sem pareamento',
      frase: `só ${porVizinho.length} dos ${antes.length} pontos emparelham um a um com os do `
        + 'alvo, então não dá para dizer o que a parte virou',
      quantosAndaram: 0,
      verticesComparados: porVizinho.length,
    };
  }
  return { ...comum, ...escolhida };
}

/* A mesma ordem em que o alvo guarda os pontos: arredondada para seis casas,
   sem repetido e lexicográfica. Ela precisa ser a mesma dos dois lados, senão
   parear por índice compararia pontos que nada têm a ver um com o outro. */
function extrairNuvemPorParte(neutro) {
  const porParte = new Map();
  for (const [nome, ids] of verticesPorParte(neutro)) {
    const vistos = new Set();
    const pontos = [];
    for (const v of ids) {
      const p = neutro.V.get(v);
      if (!p || p.length < 3) continue;
      const canonico = [0, 1, 2].map((i) => {
        const n = Number(p[i].toFixed(6));
        return Object.is(n, -0) ? 0 : n;
      });
      const chave = canonico.join(',');
      if (vistos.has(chave)) continue;
      vistos.add(chave);
      pontos.push(canonico);
    }
    pontos.sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]);
    porParte.set(nome, pontos);
  }
  return porParte;
}

/* Pareamento completo pelo menor custo, tomando as distâncias em ordem
   crescente e aceitando um par quando os dois pontos ainda estão livres. Ele
   alcança casos que o vizinho mútuo abandona, porque não exige reciprocidade:
   quando dois pontos disputam o mesmo destino, o mais próximo fica com ele e o
   outro segue para o seguinte em vez de ambos saírem sem par. */
function parearPorMenorDistancia(antes, depois) {
  if (antes.length !== depois.length || !antes.length) return [];
  const custos = [];
  for (let i = 0; i < antes.length; i += 1) {
    for (let j = 0; j < depois.length; j += 1) {
      custos.push([norma(subtrair(depois[j], antes[i])), i, j]);
    }
  }
  custos.sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]);
  const usadoA = new Set();
  const usadoB = new Set();
  const pares = [];
  for (const [, i, j] of custos) {
    if (usadoA.has(i) || usadoB.has(j)) continue;
    usadoA.add(i); usadoB.add(j);
    pares.push([i, j]);
  }
  return pares.sort((a, b) => a[0] - b[0]);
}

function parearPorVizinhoMutuo(antes, depois) {
  if (!antes.length || !depois.length) return null;
  const maisPerto = (ponto, lista) => {
    let indice = -1;
    let menor = Infinity;
    for (let i = 0; i < lista.length; i += 1) {
      const d = norma(subtrair(lista[i], ponto));
      if (d < menor) { menor = d; indice = i; }
    }
    return indice;
  };
  const daFrente = antes.map((p) => maisPerto(p, depois));
  const daVolta = depois.map((p) => maisPerto(p, antes));
  const pares = [];
  for (let i = 0; i < antes.length; i += 1) {
    if (daVolta[daFrente[i]] === i) pares.push([i, daFrente[i]]);
  }
  return pares;
}
