/* contorno.js — contorno 2D puro: retângulo de cantos arredondados, recuo por meia-esquadria, área com sinal e convexidade.

   Um contorno é uma lista de pontos [u, v] em ordem anti-horária. As funções não conhecem Three.js, malha nem domínio:
   recebem e devolvem números, e a mesma entrada dá sempre os mesmos números. Elas substituem as contas que o esbocista
   fazia num script fora do JSON (meio, contorno e offset do gerar-cacamba.py do banco de provas de 2026-10-08).

   retanguloArredondado: retângulo centrado na origem; cada canto é um quarto de elipse de raios [ru, rv] em
   `segmentosPorCanto` segmentos, uniformes em ângulo. Raio igual à meia-medida nos dois cantos de um lado dá um arco
   inteiro naquele lado (a frente em D). Pontos coincidentes (raio 0, ou arcos que se encontram no meio do lado) saem uma vez.
   deslocarContorno: recua (distância > 0) ou expande (< 0) um polígono convexo pela bissetriz de cada vértice; cada aresta
   fica paralela à original e o número de vértices não muda.
   Perfil com furo, contorno côncavo e canto redondo ou reto são de perfil2d.js, sobre a CrossSection da Manifold.
   `deslocarContorno` NÃO delega a ela de propósito: ele devolve um ponto por vértice, na mesma ordem (o `loft` com casca
   precisa dessa correspondência entre as seções) e é puro, sem WebAssembly. O teste de perfil2d.test.mjs confere que os
   dois dão os mesmos vértices na esquadria de um polígono convexo.
   ehSimples: polígono simples (convexo ou côncavo), sem ponto repetido, área nula nem arestas que se cruzem ou se toquem.
   diagnosticarContorno: o irmão de `ehSimples` que diz qual ponto se repete ou quais arestas se cruzam, para a mensagem de recusa.
   limparContorno: tira ponto repetido (e, se pedido, ponto colinear) e devolve lista nova; o núcleo não a chama, a receita sim. */

const EPS = 1e-9;
const SEGMENTOS_PADRAO = 4;

const arredondar = (x) => Math.round(x / EPS) * EPS + 0;
const ehNumero = (x) => typeof x === 'number' && Number.isFinite(x);

function exigirPoligono(poligono, nome) {
  if (!Array.isArray(poligono) || poligono.length < 3) throw new Error(`${nome}: o polígono precisa de 3 pontos ou mais`);
  poligono.forEach((p, i) => {
    if (!Array.isArray(p) || p.length < 2 || !ehNumero(p[0]) || !ehNumero(p[1])) throw new Error(`${nome}: o ponto ${i} do polígono precisa ser [u, v] com números finitos`);
  });
}

/* Área com sinal (fórmula do cadarço): positiva para anti-horário, negativa para horário. */
export function areaDoContorno(poligono) {
  exigirPoligono(poligono, 'areaDoContorno');
  const n = poligono.length;
  let soma = 0;
  for (let i = 0; i < n; i++) {
    const a = poligono[i];
    const b = poligono[(i + 1) % n];
    soma += a[0] * b[1] - b[0] * a[1];
  }
  return soma / 2;
}

/* Convexo? Sem voltas para dentro; pontos colineares são aceitos, e polígono sem nenhuma virada (todos colineares) não é. */
export function ehConvexo(poligono) {
  exigirPoligono(poligono, 'ehConvexo');
  let sinal = 0;
  for (let i = 0; i < poligono.length; i++) {
    const a = poligono[i];
    const b = poligono[(i + 1) % poligono.length];
    const c = poligono[(i + 2) % poligono.length];
    const z = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
    if (Math.abs(z) < EPS) continue;
    if (sinal === 0) sinal = Math.sign(z);
    else if (Math.sign(z) !== sinal) return false;
  }
  return sinal !== 0;
}

/* Normaliza `cantos` para quatro [ru, rv], na ordem [+u+v, -u+v, -u-v, +u-v]. */
function normalizarCantos(cantos) {
  const lista = Array.isArray(cantos) ? cantos : [cantos, cantos, cantos, cantos];
  if (lista.length !== 4) throw new Error(`retanguloArredondado: "cantos" é um número ou uma lista de 4 cantos [+u+v, -u+v, -u-v, +u-v]; veio uma lista de ${lista.length}`);
  return lista.map((c, i) => {
    const par = Array.isArray(c) ? c : [c, c];
    if (par.length !== 2 || !ehNumero(par[0]) || !ehNumero(par[1])) throw new Error(`retanguloArredondado: o canto ${i} precisa ser um número ou [ru, rv] com números finitos`);
    if (par[0] < 0 || par[1] < 0) throw new Error(`retanguloArredondado: o canto ${i} tem raio negativo (${par[0]}, ${par[1]})`);
    return [par[0], par[1]];
  });
}

/* Retângulo `largura` (u) por `profundidade` (v) centrado na origem, cantos arredondados, anti-horário a partir do canto +u+v.
   `cantos`: número (raio igual nos quatro) ou lista de quatro cantos [+u+v, -u+v, -u-v, +u-v], cada um número ou [ru, rv].
   `segmentosPorCanto`: inteiro >= 1 (padrão 4). Raio 0 em qualquer eixo dá canto vivo. */
export function retanguloArredondado({ largura, profundidade, cantos = 0, segmentosPorCanto = SEGMENTOS_PADRAO } = {}) {
  if (!ehNumero(largura) || largura <= 0) throw new Error(`retanguloArredondado: "largura" precisa ser um número maior que zero (veio ${largura})`);
  if (!ehNumero(profundidade) || profundidade <= 0) throw new Error(`retanguloArredondado: "profundidade" precisa ser um número maior que zero (veio ${profundidade})`);
  if (!Number.isInteger(segmentosPorCanto) || segmentosPorCanto < 1) throw new Error(`retanguloArredondado: "segmentosPorCanto" precisa ser um inteiro >= 1 (veio ${segmentosPorCanto})`);
  const raios = normalizarCantos(cantos);
  const [c0, c1, c2, c3] = raios;
  const lados = [
    ['+v (cantos +u+v e -u+v)', c0[0] + c1[0], largura, 'largura'],
    ['-v (cantos -u-v e +u-v)', c2[0] + c3[0], largura, 'largura'],
    ['+u (cantos +u+v e +u-v)', c0[1] + c3[1], profundidade, 'profundidade'],
    ['-u (cantos -u+v e -u-v)', c1[1] + c2[1], profundidade, 'profundidade'],
  ];
  for (const [lado, soma, medida, nome] of lados) {
    if (soma > medida + EPS) throw new Error(`retanguloArredondado: no lado ${lado} a soma dos raios (${soma}) passa da ${nome} (${medida})`);
  }
  const meiaL = largura / 2;
  const meiaP = profundidade / 2;
  const s = segmentosPorCanto;
  // sinal em u e em v de cada canto, e o ângulo em que o arco começa (anti-horário, quarto de volta por canto)
  const forma = [[1, 1, 0], [-1, 1, 90], [-1, -1, 180], [1, -1, 270]];
  const crus = [];
  raios.forEach(([ru, rv], i) => {
    const [su, sv, inicio] = forma[i];
    if (ru === 0 || rv === 0) {
      crus.push([su * meiaL, sv * meiaP]);
      return;
    }
    const cu = su * (meiaL - ru);
    const cv = sv * (meiaP - rv);
    for (let k = 0; k <= s; k++) {
      const a = ((inicio + (90 * k) / s) * Math.PI) / 180;
      crus.push([cu + ru * Math.cos(a), cv + rv * Math.sin(a)]);
    }
  });
  const unicos = [];
  for (const p of crus) {
    const q = unicos[unicos.length - 1];
    if (q && Math.abs(p[0] - q[0]) <= EPS && Math.abs(p[1] - q[1]) <= EPS) continue;
    unicos.push(p);
  }
  const ultimo = unicos[unicos.length - 1];
  if (unicos.length > 1 && Math.abs(unicos[0][0] - ultimo[0]) <= EPS && Math.abs(unicos[0][1] - ultimo[1]) <= EPS) unicos.pop();
  return unicos.map(([u, v]) => [arredondar(u), arredondar(v)]);
}

/* Recua (distancia > 0, para dentro) ou expande (distancia < 0) um polígono convexo anti-horário, por meia-esquadria:
   cada vértice anda pela bissetriz e cada aresta fica paralela à original, a `distancia` dela. Mesmo número de vértices.
   Recusa polígono não convexo, horário, com aresta de comprimento zero e recuo que faça uma aresta sumir ou o polígono
   inverter; a mensagem diz o recuo máximo aproximado. */
export function deslocarContorno(poligono, distancia) {
  exigirPoligono(poligono, 'deslocarContorno');
  if (!ehNumero(distancia)) throw new Error(`deslocarContorno: "distancia" precisa ser um número finito (veio ${distancia})`);
  const n = poligono.length;
  const area = areaDoContorno(poligono);
  if (!(area > 0)) throw new Error(`deslocarContorno: o polígono precisa ser anti-horário e ter área positiva (área ${area})`);
  if (!ehConvexo(poligono)) throw new Error('deslocarContorno: o polígono não é convexo; a meia-esquadria só vale para contorno convexo');
  const dir = (a, b, i) => {
    const x = b[0] - a[0];
    const y = b[1] - a[1];
    const t = Math.hypot(x, y);
    if (t < EPS) throw new Error(`deslocarContorno: a aresta ${i} tem comprimento zero (pontos repetidos)`);
    return [x / t, y / t];
  };
  const dirs = poligono.map((p, i) => dir(p, poligono[(i + 1) % n], i));
  // por vértice, as normais internas n1 e n2 das duas arestas vizinhas; o vértice anda (n1 + n2) * d / (1 + n1·n2)
  const normais = poligono.map((_, i) => {
    const e1 = dirs[(i - 1 + n) % n];
    const e2 = dirs[i];
    return [[-e1[1], e1[0]], [-e2[1], e2[0]]];
  });
  const bissetriz = normais.map(([n1, n2]) => {
    const k = 1 / (1 + n1[0] * n2[0] + n1[1] * n2[1]);
    return [(n1[0] + n2[0]) * k, (n1[1] + n2[1]) * k];
  });
  // o comprimento de cada aresta varia linearmente com o recuo; o máximo é o menor recuo em que alguma aresta chega a zero
  let maximo = Infinity;
  for (let i = 0; i < n; i++) {
    const m0 = bissetriz[i];
    const m1 = bissetriz[(i + 1) % n];
    const taxa = (m1[0] - m0[0]) * dirs[i][0] + (m1[1] - m0[1]) * dirs[i][1];
    if (taxa < 0) {
      const comprimento = Math.hypot(poligono[(i + 1) % n][0] - poligono[i][0], poligono[(i + 1) % n][1] - poligono[i][1]);
      maximo = Math.min(maximo, comprimento / -taxa);
    }
  }
  if (distancia > 0 && distancia >= maximo - EPS) {
    throw new Error(`deslocarContorno: o recuo ${distancia} inverte ou colapsa o polígono (alguma aresta some); o recuo máximo é aproximadamente ${maximo.toFixed(3)}`);
  }
  const saida = poligono.map((q, i) => {
    const [n1, n2] = normais[i];
    const k = distancia / (1 + n1[0] * n2[0] + n1[1] * n2[1]);
    return [q[0] + (n1[0] + n2[0]) * k, q[1] + (n1[1] + n2[1]) * k];
  });
  if (!(areaDoContorno(saida) > 0)) {
    throw new Error(`deslocarContorno: o recuo ${distancia} inverte o polígono (área ${areaDoContorno(saida)}); o recuo máximo é aproximadamente ${Number.isFinite(maximo) ? maximo.toFixed(3) : 'ilimitado'}`);
  }
  return saida;
}

/* Polígono simples? (3 pontos ou mais, sem ponto repetido, sem área nula e sem arestas que se cruzem ou se toquem
   fora dos extremos comuns) */
export function ehSimples(perfil) {
  const n = perfil.length;
  const area = perfil.reduce((acc, q, i) => acc + q[0] * perfil[(i + 1) % n][1] - perfil[(i + 1) % n][0] * q[1], 0);
  if (Math.abs(area) < 1e-9) return false;
  const orient = (a, b, c) => Math.sign((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]));
  const noSegmento = (a, b, c) => Math.min(a[0], b[0]) <= c[0] && c[0] <= Math.max(a[0], b[0]) && Math.min(a[1], b[1]) <= c[1] && c[1] <= Math.max(a[1], b[1]);
  const cruza = (a, b, c, d) => {
    const o1 = orient(a, b, c); const o2 = orient(a, b, d); const o3 = orient(c, d, a); const o4 = orient(c, d, b);
    if (o1 !== o2 && o3 !== o4) return true;
    return (o1 === 0 && noSegmento(a, b, c)) || (o2 === 0 && noSegmento(a, b, d)) || (o3 === 0 && noSegmento(c, d, a)) || (o4 === 0 && noSegmento(c, d, b));
  };
  for (let i = 0; i < n; i++) {
    const a = perfil[i]; const b = perfil[(i + 1) % n];
    if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 1e-9) return false;
    for (let j = i + 1; j < n; j++) {
      if (j === i + 1 || (i === 0 && j === n - 1)) continue;
      if (cruza(a, b, perfil[j], perfil[(j + 1) % n])) return false;
    }
  }
  return true;
}

const ptoTexto = (p) => `[${Number(p[0].toPrecision(10))}, ${Number(p[1].toPrecision(10))}]`;
const AJUDA_REPETIDO = 'Causa provável: o contorno foi espelhado sobre um eixo e o ponto que está no eixo entrou nas duas metades, ou dois arcos'
  + ' se juntam repetindo o ponto de encontro. Escreva esse ponto uma vez só, ou passe a lista por limparContorno(pontos)'
  + ' (procedural/nucleo/contorno.js), que tira os repetidos.';

/* Por que o contorno não é um polígono simples: o irmão de `ehSimples` que diz o ponto ou as arestas. Devolve null quando
   `ehSimples` devolve true, e senão {motivo, indices, pontos, mensagem}:
     - 'poucos-pontos': menos de 3 pontos;
     - 'ponto-repetido': `indices` são os dois pontos que coincidem (a menos de 1e-9), do menor para o maior;
     - 'area-nula': todos os pontos ficam numa reta (ou a área sai abaixo de 1e-9);
     - 'arestas-se-cruzam': `indices` são os pontos de partida das duas arestas que se cruzam ou se tocam (a aresta k vai do
       ponto k ao ponto k+1, e a última volta ao 0).
   Os índices contam da lista recebida, a partir de 0. A mensagem já traz a causa provável e a correção. */
export function diagnosticarContorno(perfil) {
  const n = perfil.length;
  if (n < 3) return { motivo: 'poucos-pontos', indices: [], pontos: [], mensagem: `o contorno tem ${n} ponto(s) e precisa de 3 ou mais` };
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (Math.hypot(perfil[j][0] - perfil[i][0], perfil[j][1] - perfil[i][1]) < 1e-9) {
        const seguidos = j === i + 1 || (i === 0 && j === n - 1);
        return {
          motivo: 'ponto-repetido',
          indices: [i, j],
          pontos: [perfil[i], perfil[j]],
          mensagem: `o ponto ${i} e o ponto ${j} são o mesmo ponto ${ptoTexto(perfil[i])}${seguidos ? ' e estão em seguida' : ''}, o que deixa uma aresta de comprimento zero ou faz o contorno tocar a si mesmo. ${AJUDA_REPETIDO}`,
        };
      }
    }
  }
  const orient = (a, b, c) => Math.sign((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]));
  const noSegmento = (a, b, c) => Math.min(a[0], b[0]) <= c[0] && c[0] <= Math.max(a[0], b[0]) && Math.min(a[1], b[1]) <= c[1] && c[1] <= Math.max(a[1], b[1]);
  const cruza = (a, b, c, d) => {
    const o1 = orient(a, b, c); const o2 = orient(a, b, d); const o3 = orient(c, d, a); const o4 = orient(c, d, b);
    if (o1 !== o2 && o3 !== o4) return true;
    return (o1 === 0 && noSegmento(a, b, c)) || (o2 === 0 && noSegmento(a, b, d)) || (o3 === 0 && noSegmento(c, d, a)) || (o4 === 0 && noSegmento(c, d, b));
  };
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (j === i + 1 || (i === 0 && j === n - 1)) continue;
      if (cruza(perfil[i], perfil[(i + 1) % n], perfil[j], perfil[(j + 1) % n])) {
        return {
          motivo: 'arestas-se-cruzam',
          indices: [i, j],
          pontos: [perfil[i], perfil[(i + 1) % n], perfil[j], perfil[(j + 1) % n]],
          mensagem: `a aresta ${i} (do ponto ${i} ${ptoTexto(perfil[i])} ao ponto ${(i + 1) % n} ${ptoTexto(perfil[(i + 1) % n])}) cruza ou toca a aresta ${j} (do ponto ${j} ${ptoTexto(perfil[j])} ao ponto ${(j + 1) % n} ${ptoTexto(perfil[(j + 1) % n])}); reordene os pontos ou afaste a ponta que invade a outra aresta`,
        };
      }
    }
  }
  const area = perfil.reduce((acc, q, i) => acc + q[0] * perfil[(i + 1) % n][1] - perfil[(i + 1) % n][0] * q[1], 0);
  if (Math.abs(area) < 1e-9) {
    return { motivo: 'area-nula', indices: [], pontos: [], mensagem: `os ${n} pontos ficam numa reta e o contorno não tem área; confira se uma das coordenadas foi copiada no lugar da outra` };
  }
  return null;
}

/* Tira do contorno o que o torna inválido sem mudar a forma, e devolve uma lista nova (a entrada não é alterada):
     - repetidos (padrão true): de dois pontos a menos de `tolerancia` um do outro, em seguida, fica o primeiro; o último ponto
       igual ao primeiro, de contorno escrito fechado, sai também;
     - colineares (padrão false): o ponto que fica a menos de `tolerancia` da reta entre os vizinhos, e entre eles, sai. O ponto
       colinear de uma extrusão dá uma lateral própria, que é endereço salvo, por isso é opt-in;
     - tolerancia (padrão 1e-9, em unidades do contorno): número finito, zero ou maior.
   A função é pura e o núcleo nunca a chama: deduplicar sozinho dentro de `extrusao` renumeraria as laterais e esconderia o erro de
   quem espelhou o contorno. A receita chama quando quer. Recusa o contorno que fica com menos de 3 pontos. */
export function limparContorno(pontos, { colineares = false, repetidos = true, tolerancia = EPS } = {}) {
  exigirPoligono(pontos, 'limparContorno');
  if (!ehNumero(tolerancia) || tolerancia < 0) throw new Error(`limparContorno: "tolerancia" precisa ser um número finito maior ou igual a zero (veio ${tolerancia})`);
  let lista = pontos.map((p) => [p[0], p[1]]);
  if (repetidos) {
    const seguinte = [];
    for (const p of lista) {
      const anterior = seguinte[seguinte.length - 1];
      if (anterior && Math.hypot(p[0] - anterior[0], p[1] - anterior[1]) <= tolerancia) continue;
      seguinte.push(p);
    }
    while (seguinte.length > 1 && Math.hypot(seguinte[0][0] - seguinte[seguinte.length - 1][0], seguinte[0][1] - seguinte[seguinte.length - 1][1]) <= tolerancia) seguinte.pop();
    lista = seguinte;
  }
  if (colineares) {
    let mudou = true;
    while (mudou && lista.length > 3) {
      mudou = false;
      for (let i = 0; i < lista.length && lista.length > 3; i++) {
        const a = lista[(i - 1 + lista.length) % lista.length];
        const p = lista[i];
        const b = lista[(i + 1) % lista.length];
        const ab = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (ab === 0) continue;
        const desvio = Math.abs((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])) / ab;
        const entre = (p[0] - a[0]) * (b[0] - p[0]) + (p[1] - a[1]) * (b[1] - p[1]) > 0;
        if (desvio <= tolerancia && entre) { lista.splice(i, 1); mudou = true; i--; }
      }
    }
  }
  if (lista.length < 3) throw new Error(`limparContorno: o contorno ficou com ${lista.length} ponto(s) depois de tirar repetidos${colineares ? ' e colineares' : ''}; ele não tem forma`);
  return lista;
}
