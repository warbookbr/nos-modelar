/* contorno.js — contorno 2D puro: retângulo de cantos arredondados, recuo por meia-esquadria, área com sinal e convexidade.

   Um contorno é uma lista de pontos [u, v] em ordem anti-horária. As funções não conhecem Three.js, malha nem domínio:
   recebem e devolvem números, e a mesma entrada dá sempre os mesmos números. Elas substituem as contas que o esbocista
   fazia num script fora do JSON (meio, contorno e offset do gerar-cacamba.py do banco de provas de 2026-10-08).

   retanguloArredondado: retângulo centrado na origem; cada canto é um quarto de elipse de raios [ru, rv] em
   `segmentosPorCanto` segmentos, uniformes em ângulo. Raio igual à meia-medida nos dois cantos de um lado dá um arco
   inteiro naquele lado (a frente em D). Pontos coincidentes (raio 0, ou arcos que se encontram no meio do lado) saem uma vez.
   deslocarContorno: recua (distância > 0) ou expande (< 0) um polígono convexo pela bissetriz de cada vértice; cada aresta
   fica paralela à original e o número de vértices não muda. */

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
