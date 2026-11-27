/* acessorios.js — a geometria dos acessórios do cabo, em milímetro: o terminal das pontas (capa cilíndrica ou olhal) e a braçadeira de uma passagem.

   Tudo sai das medidas do cabo, sem parâmetro próprio: a capa é um cilindro um pouco mais grosso que o cabo, que cobre os primeiros milímetros dele e sobra 1 mm para fora
   da ponta; o olhal é a mesma capa com um anel, de fio redondo, que sai para fora da ponta com o furo no eixo lateral; a braçadeira é um anel de fio redondo em volta do cabo,
   com o furo um pouco maior que ele, e o eixo na direção em que o cabo passa. Os anéis são uma volta fechada do `friso` (uma polilinha de `PONTOS_DO_ANEL` pontos que volta ao
   primeiro), sem booleana, e por isso as faces de cada acessório são as mesmas em qualquer orientação. Cada acessório é um sólido próprio (uma parte). Os números de faces
   são os da malha, e o teste da família os trava contra ela. */

const soma = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mult = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unitario = (a) => mult(a, 1 / Math.hypot(a[0], a[1], a[2]));

export const LADOS_DO_ACESSORIO = 12;
/** Os lados da seção do fio dos anéis e os pontos da volta de cada anel. */
export const LADOS_DO_FIO = 8;
export const PONTOS_DO_ANEL = 12;
export const TIPOS_DE_TERMINAL = Object.freeze(['nenhum', 'capa', 'olhal']);
/** As faces e os triângulos de cada acessório, os da malha (o teste da família os confere). */
export const FACES_DO_ANEL = PONTOS_DO_ANEL * LADOS_DO_FIO;
export const FACES_DO_ACESSORIO = Object.freeze({ capa: 32, olhal: 32 + FACES_DO_ANEL, bracadeira: FACES_DO_ANEL });
export const TRIANGULOS_DO_ACESSORIO = Object.freeze({ capa: 44, olhal: 44 + 2 * FACES_DO_ANEL, bracadeira: 2 * FACES_DO_ANEL });

/** Um vetor unitário perpendicular a `v`, pelo eixo em que `v` tem a menor componente (o mesmo critério do quadro do tubo). */
export function perpendicular(v) {
  const menor = [0, 1, 2].reduce((m, q) => (Math.abs(v[q]) < Math.abs(v[m]) ? q : m), 0);
  const base = [0, 0, 0]; base[menor] = 1;
  return unitario(sub(base, mult(v, dot(base, v))));
}

/* A volta fechada de um anel: PONTOS_DO_ANEL pontos de um círculo de raio `raio` em volta de `centro`, no plano de `a` e `b` (unitários e perpendiculares), e o primeiro de novo no fim. */
function volta(centro, a, b, raio) {
  const pontos = Array.from({ length: PONTOS_DO_ANEL }, (_, k) => { const t = (2 * Math.PI * k) / PONTOS_DO_ANEL; return soma(centro, soma(mult(a, raio * Math.cos(t)), mult(b, raio * Math.sin(t)))); });
  return [...pontos, pontos[0]];
}

/** O terminal de uma ponta: `ponto` é a ponta do cabo, `saida` a direção em que o cabo sai dela, `diametro` o do cabo, `tipo` 1 (capa) ou 2 (olhal). */
export function terminalDaPonta({ ponto, saida, diametro, tipo }) {
  const r = diametro / 2;
  const raio = r + Math.max(0.5, 0.2 * diametro);
  const comprimento = Math.max(6, 3 * diametro);
  const sobra = 1;
  const normal = perpendicular(saida);
  const capa = { p0: sub(ponto, mult(saida, sobra)), p1: soma(ponto, mult(saida, comprimento)), normal, raio };
  if (tipo !== 2) return { tipo, capa };
  /* o anel: o fio de raio `fio`, o furo de raio `furo`, o centro para fora da capa, encostado nela; o eixo do furo é o lateral */
  const lateral = unitario(cruz(saida, normal));
  const fio = Math.max(0.5, 0.18 * diametro); const furo = Math.max(1, 0.5 * diametro);
  const raioDaVolta = furo + fio;
  const centro = sub(ponto, mult(saida, sobra + raioDaVolta + fio - 0.5));
  return { tipo, capa, anel: { pontos: volta(centro, saida, normal, raioDaVolta), normal: lateral, fio } };
}

/** A braçadeira de uma passagem: `ponto` onde o cabo passa, `tangente` a direção em que passa. O anel cinge o cabo, com folga de 0,25 mm. */
export function bracadeiraDaPassagem({ ponto, tangente, diametro }) {
  const t = unitario(tangente);
  const n = perpendicular(t); const b = cruz(t, n);
  const fio = Math.max(0.9, 0.3 * diametro);
  const raioDaVolta = diametro / 2 + 0.25 + fio;
  return { pontos: volta(ponto, n, b, raioDaVolta), normal: t, fio };
}

/** Os acessórios de um plano de cabo: `{ terminais: [{ lado, ... }], bracadeiras: [...] }` e o total de faces e de triângulos que eles somam. */
export function acessoriosDoCabo({ A, B, dA, dB, passagens, diametro, terminalA, terminalB, bracadeiras }) {
  const terminais = [];
  if (terminalA) terminais.push({ lado: 'a', ...terminalDaPonta({ ponto: A, saida: dA, diametro, tipo: terminalA }) });
  if (terminalB) terminais.push({ lado: 'b', ...terminalDaPonta({ ponto: B, saida: dB, diametro, tipo: terminalB }) });
  const lista = bracadeiras ? passagens.map((q) => bracadeiraDaPassagem({ ponto: q.P, tangente: q.d, diametro })) : [];
  let faces = 0; let triangulos = 0;
  for (const t of terminais) {
    const nome = t.tipo === 2 ? 'olhal' : 'capa';
    faces += FACES_DO_ACESSORIO[nome]; triangulos += TRIANGULOS_DO_ACESSORIO[nome];
  }
  faces += lista.length * FACES_DO_ACESSORIO.bracadeira; triangulos += lista.length * TRIANGULOS_DO_ACESSORIO.bracadeira;
  return { terminais, bracadeiras: lista, faces, triangulos };
}
