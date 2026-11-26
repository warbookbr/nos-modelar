/* derivar.js — dos parâmetros do elo (milímetro) à chamada de composição (metro): as seções do `loft` de fora e da cavidade, que
   vêm da casca pela receita (`passosDaCascaDoLoft`), o anel de fixação e a furação de cada boca. */
import { passosDaCascaDoLoft } from '../../nucleo/casca-pela-receita.js';
import { ID_DO_ELO, nomeDaSecao } from './composicoes.js';
import { LADOS, anelDaBoca, furosDaBoca, secoesDoElo } from './geometria.js';

const m = (mm) => mm / 1000;

export function derivar(q) {
  const secoes = secoesDoElo(q).map((s) => ({ pos: s.pos.map(m), contorno: s.contorno.map((p) => p.map(m)) }));
  const { passos } = passosDaCascaDoLoft({ lados: LADOS, orientacao: [1, 0, 0], secoes }, { espessura: m(q.parede) });
  const a = { comprimento: m(q.comprimento) };
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
  a.planoB = [0, m(q.comprimento), 0];
  return { composicao: ID_DO_ELO, argumentos: a };
}
