/* geometria.js — a seção e o comprimento do perfil estrutural, em milímetro.

   A seção fica no plano [x, z] (x na largura das abas, z na altura), centrada na caixa dela, e o perfil vai ao longo de y,
   de 0 ao comprimento medido na linha do meio. O I e o H têm as quatro concordâncias da alma com as abas; o U tem a alma
   em x = −b/2, a face de dentro da aba inclinada, a concordância da raiz e o raio da ponta. O alumínio ranhurado é o
   quadrado com uma ranhura em T em cada lado (abertura da tabela, lábio de 0,09 do lado, fundo a 0,27 do lado e cavidade
   de até 1,6 abertura) e o furo central, regra da família.

   O corte a 45° gira em torno de x: o lado de cima (z = +h/2) é o mais comprido, como no canto de um quadro. Com `corte` 1
   só a ponta final é cortada; com 2, as duas. */

export const SEGMENTOS_DA_CONCORDANCIA = 4;
const N = SEGMENTOS_DA_CONCORDANCIA;
export const RAIO_MINIMO = 0.2;

/* troca cada vértice que tem raio pelo arco tangente aos dois lados, com N segmentos */
function concordar(vertices) {
  const saida = [];
  const n = vertices.length;
  vertices.forEach(([x, z, raio], i) => {
    if (raio === undefined) { saida.push([x, z]); return; }
    /* o raio nulo vira um raio mínimo, para o número de pontos da seção não mudar */
    const r = Math.max(raio, RAIO_MINIMO);
    const [px, pz] = vertices[(i + n - 1) % n]; const [nx, nz] = vertices[(i + 1) % n];
    const a = [px - x, pz - z]; const b = [nx - x, nz - z];
    const la = Math.hypot(...a); const lb = Math.hypot(...b);
    const ua = [a[0] / la, a[1] / la]; const ub = [b[0] / lb, b[1] / lb];
    const teta = Math.acos(Math.max(-1, Math.min(1, ua[0] * ub[0] + ua[1] * ub[1])));
    const t = r / Math.tan(teta / 2);
    const bis = [ua[0] + ub[0], ua[1] + ub[1]]; const lbis = Math.hypot(...bis);
    const c = [x + (bis[0] / lbis) * (r / Math.sin(teta / 2)), z + (bis[1] / lbis) * (r / Math.sin(teta / 2))];
    const t1 = [x + ua[0] * t, z + ua[1] * t]; const t2 = [x + ub[0] * t, z + ub[1] * t];
    const a1 = Math.atan2(t1[1] - c[1], t1[0] - c[0]); let a2 = Math.atan2(t2[1] - c[1], t2[0] - c[0]);
    let d = a2 - a1; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
    for (let k = 0; k <= N; k += 1) { const ang = a1 + (d * k) / N; saida.push([c[0] + r * Math.cos(ang), c[1] + r * Math.sin(ang)]); }
  });
  return saida;
}

function secaoI({ altura: h, largura: b, alma: tw, aba: tf, raio: r }) {
  return concordar([[-b / 2, -h / 2], [b / 2, -h / 2], [b / 2, -h / 2 + tf], [tw / 2, -h / 2 + tf, r], [tw / 2, h / 2 - tf, r], [b / 2, h / 2 - tf], [b / 2, h / 2], [-b / 2, h / 2], [-b / 2, h / 2 - tf], [-tw / 2, h / 2 - tf, r], [-tw / 2, -h / 2 + tf, r], [-b / 2, -h / 2 + tf]]);
}

function secaoU({ altura: h, largura: b, alma: tw, aba: tf, raio: r1, raioDaPonta: r2, inclinacao }) {
  const k = inclinacao / 100;
  const espessura = (x) => tf + k * (b / 2 - x); // x medido do dorso da alma
  const x0 = -b / 2;
  return concordar([[x0, -h / 2], [x0 + b, -h / 2], [x0 + b, -h / 2 + espessura(b), r2], [x0 + tw, -h / 2 + espessura(tw), r1], [x0 + tw, h / 2 - espessura(tw), r1], [x0 + b, h / 2 - espessura(b), r2], [x0 + b, h / 2], [x0, h / 2]]);
}

export function regraDaRanhura({ altura: a, aberturaDaRanhura: s }) {
  const labio = 0.09 * a;
  const fundo = 0.27 * a;
  const cavidade = Math.min(1.6 * s, 2 * (a / 2 - fundo) - 0.06 * a);
  const raioDoFuro = 0.42 * (a / 2 - fundo);
  return { labio, fundo, cavidade, raioDoFuro };
}

function secaoAluminio(q) {
  const a = q.altura; const s = q.aberturaDaRanhura;
  const { labio, fundo, cavidade } = regraDaRanhura(q);
  /* o lado de baixo, da quina esquerda até antes da quina direita, e os outros três por giro de 90° */
  const lado = [[-a / 2, -a / 2], [-s / 2, -a / 2], [-s / 2, -a / 2 + labio], [-cavidade / 2, -a / 2 + labio], [-cavidade / 2, -a / 2 + fundo], [cavidade / 2, -a / 2 + fundo], [cavidade / 2, -a / 2 + labio], [s / 2, -a / 2 + labio], [s / 2, -a / 2]];
  const girar = ([x, z], k) => { let p = [x, z]; for (let i = 0; i < k; i += 1) p = [-p[1], p[0]]; return p; };
  return [0, 1, 2, 3].flatMap((k) => lado.map((p) => girar(p, k)));
}

export function geometriaDoPerfil(entrada) {
  /* o alumínio é quadrado: o lado é a altura */
  const q = entrada.tipo === 3 ? { ...entrada, largura: entrada.altura } : entrada;
  const secao = q.tipo === 1 ? secaoI(q) : q.tipo === 2 ? secaoU(q) : secaoAluminio(q);
  const h = q.altura; const b = q.largura; const L = q.comprimento;
  const inicio = q.corte >= 2 ? -h / 2 : 0;
  const fim = q.corte >= 1 ? L + h / 2 : L;
  const e = 1;
  /* as ferramentas do corte: triângulos no plano [y, z], extrudados ao longo de x (a extrusão em x leva [u, v] a y = −u, z = v) */
  const yz = (pts) => pts.map(([y, z]) => [-y, z]);
  const corteDoInicio = yz([[-h / 2 - e, h / 2 + e], [-h / 2 - e, -h / 2 - e], [h / 2 + e, -h / 2 - e]]);
  const corteDoFim = yz([[L - h / 2 - e, -h / 2 - e], [L + h / 2 + e, -h / 2 - e], [L + h / 2 + e, h / 2 + e]]);
  const raizDois = Math.SQRT1_2;
  return {
    secao, inicio, comprimentoBruto: fim - inicio, largura: b, altura: h, emFerramenta: [-b / 2 - e, 0, 0], larguraDaFerramenta: b + 2 * e,
    corteDoInicio, corteDoFim, raioDoFuro: q.tipo === 3 ? regraDaRanhura(q).raioDoFuro : 0,
    normalDoInicio: q.corte >= 2 ? [0, -raizDois, -raizDois] : [0, -1, 0], normalDoFim: q.corte >= 1 ? [0, raizDois, -raizDois] : [0, 1, 0],
  };
}
