/* derivar.js — dos parâmetros do elo (milímetro) à chamada de composição (metro): as seções do `loft` de fora e da cavidade, que
   vêm da casca pela receita (`passosDaCascaDoLoft`), o anel de fixação e a furação de cada boca. */
import { passosDaCascaDoLoft } from '../../nucleo/casca-pela-receita.js';
import { ID_DO_ELO, ID_DO_ELO_DE_CURVA_DUPLA, ID_DO_ELO_DESVIADO, nomeDaSecao } from './composicoes.js';
import { LADOS, anelDaBoca, caminhoDoElo, caminhoDuplo, direcaoDoDesvio, ehDupla, ehReto, furosDaBoca, giroDaBocaB, planoDasCurvas, quadroDaBoca, secoesDoElo } from './geometria.js';

const m = (mm) => mm / 1000;
/* a tampa do sólido de fora na boca B inclinada: a casca da receita põe o polo a 1 µm da ponta, o que com a ponta fora dos eixos
   deixa a booleana com uma aresta de 30 nm (abaixo da precisão do motor, que recusa a união); o polo a 50 µm deixa a borda
   da parede, que sobra além da ponta, com 2 µm de altura em vez de 0,03 µm */
const TAMPA_DA_BOCA_B_INCLINADA = 5e-5;
function tamparAInclinada(secoes, noComeco = false) {
  const n = secoes.length; const ponta = secoes[noComeco ? 1 : n - 2].pos; const iPolo = noComeco ? 0 : n - 1; const polo = secoes[iPolo];
  const v = [polo.pos[0] - ponta[0], polo.pos[1] - ponta[1], polo.pos[2] - ponta[2]]; const L = Math.hypot(...v);
  secoes[iPolo] = { ...polo, pos: [0, 1, 2].map((i) => ponta[i] + (v[i] / L) * TAMPA_DA_BOCA_B_INCLINADA) };
}

export function derivar(q) {
  const secoes = secoesDoElo(q).map((s) => ({ pos: s.pos.map(m), contorno: s.contorno.map((p) => p.map(m)) }));
  const dupla = ehDupla(q);
  const eixoDoGiro = dupla ? planoDasCurvas(q).eixoDoGiro : direcaoDoDesvio(q).eixoDoGiro;
  const { passos } = passosDaCascaDoLoft({ lados: LADOS, orientacao: eixoDoGiro, secoes }, { espessura: m(q.parede) });
  const a = { comprimento: m(q.comprimento) };
  if (!ehReto(q)) tamparAInclinada(passos[0][1].secoes);
  if (dupla) tamparAInclinada(passos[0][1].secoes, true);
  [['fo', passos[0][1].secoes], ['de', passos[1][1].secoes]].forEach(([grupo, lista]) => lista.forEach((s, k) => {
    a[nomeDaSecao(grupo, k, 'p')] = s.pos;
    if (s.contorno) s.contorno.forEach(([u, w], j) => { a[nomeDaSecao(grupo, k, 'u', j)] = u; a[nomeDaSecao(grupo, k, 'w', j)] = w; });
  }));
  for (const lado of ['A', 'B']) {
    const anel = anelDaBoca(q, lado); const f = furosDaBoca(q, lado); const y0 = lado === 'A' ? 0 : q.comprimento - anel.espessura;
    Object.assign(a, {
      [`anelDentro${lado}`]: m(anel.dentro), [`anelFora${lado}`]: m(anel.fora), [`anelEspessura${lado}`]: m(anel.espessura), [`anelEm${lado}`]: [0, m(y0), 0],
      [`furoRaio${lado}`]: m(q[`diametroDoFuroDaBoca${lado}`] / 2), [`furoAltura${lado}`]: m(anel.espessura + 2), [`furoEm${lado}`]: [m(f.em[0]), m(y0 - 1), m(f.em[2])],
      [`furos${lado}`]: f.total, [`graus${lado}`]: f.graus, [`angulo${lado}`]: f.anguloInicial, [`diametro${lado}`]: m(q[`diametroDoFuroDaBoca${lado}`]), [`raio${lado}`]: m(q[`circuloDaBoca${lado}`] / 2),
    });
  }
  if (ehReto(q)) { a.planoB = [0, m(q.comprimento), 0]; return { composicao: ID_DO_ELO, argumentos: a }; }
  if (dupla) return { composicao: ID_DO_ELO_DE_CURVA_DUPLA, argumentos: argumentosDaCurvaDupla(q, a, eixoDoGiro) };
  /* a boca B (o anel e os furos) nasce reta, em y = comprimento, gira em torno do eixo do giro até a tangente da boca B (o
     `rotaciona` em y, x e y) e vai ao ponto da boca B */
  const { pontoB } = caminhoDoElo(q); const { tangente, referencia, anguloExtra } = giroDaBocaB(q);
  const pivo = [0, m(q.comprimento), 0];
  Object.assign(a, {
    eixoDoGiro, giroDoAzimute: q.azimute || 0, giroDoAzimuteInverso: -q.azimute || 0, giroDoDesvio: q.desvio,
    anguloB: furosDaBoca(q, 'B').anguloInicial + anguloExtra, pivoDaBocaB: pivo, idaDaBocaB: pontoB.map((v, i) => m(v) - pivo[i]), planoB: pontoB.map(m), normalB: tangente, referenciaB: referencia,
  });
  return { composicao: ID_DO_ELO_DESVIADO, argumentos: a };
}

/* a curva dupla: as duas bocas nascem retas (a A na origem, a B em y = comprimento), giram em torno do eixo do plano das curvas até a
   tangente de cada uma (a A só gira, a B gira e vai ao ponto dela) e a porta A leva a normal e a referência giradas */
function argumentosDaCurvaDupla(q, a, eixoDoGiro) {
  const { azimute, anguloA, anguloB } = planoDasCurvas(q); const { pontoB } = caminhoDuplo(q);
  const B = quadroDaBoca(q, 'B'); const A = quadroDaBoca(q, 'A'); const pivo = [0, m(q.comprimento), 0];
  const GRAUS = 180 / Math.PI; const r = Math.max(q.diametroDaBocaA, q.espessuraDaBocaA) / 2 + 5;
  return Object.assign(a, {
    eixoDoGiro, ...girosDaBoca('A', azimute, anguloA * GRAUS), ...girosDaBoca('B', azimute, anguloB * GRAUS),
    anguloB: furosDaBoca(q, 'B').anguloInicial + B.anguloExtra, anguloA: furosDaBoca(q, 'A').anguloInicial + A.anguloExtra,
    pivoDaBocaB: pivo, idaDaBocaB: pontoB.map((v, i) => m(v) - pivo[i]), planoB: pontoB.map(m), normalB: B.normal, referenciaB: B.referencia,
    normalA: A.normal, referenciaA: A.referencia, caixaMinA: [-r, -5, -r].map(m), caixaMaxA: [r, q.espessuraDaBocaA + 5, r].map(m),
  });
}

/** Os quatro giros (y para trás, x, y de volta, z) de uma boca: nos azimutes cardinais um giro só, nos outros os três em y, x e y. */
function girosDaBoca(lado, azimute, graus) {
  const g = { inv: 0, x: 0, volta: 0, z: 0 };
  if (azimute === 0) g.x = graus; else if (azimute === 180 || azimute === -180) g.x = -graus; else if (azimute === 90) g.z = -graus; else if (azimute === -90 || azimute === 270) g.z = graus;
  else { g.inv = -azimute; g.x = graus; g.volta = azimute; }
  return Object.fromEntries(Object.entries(g).map(([k, v]) => [`giro${k}${lado}`, v || 0]));
}
