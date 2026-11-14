/* auxiliares — as contas que quase toda receita reescreve: milímetro para metro, área com sinal, sentido anti-horário e
   espelho de meia seção. Medido em 2026-11-13, 41 das 43 receitas de topo não importam nada, 48 peças reescrevem a conversão de
   milímetro e 23 reescrevem a área e o sentido do contorno. Cada função é a conta que as receitas já copiam, com a mesma
   ordem de operações, para que a receita que passar a importar daqui dê o mesmo neutro bit a bit. Sem estado, sem
   aleatoriedade e sem conhecer veículo nem outro objeto. */

/** Milímetro para metro. O núcleo trabalha em metro; a receita escreve a tabela em milímetro. */
export const milimetroParaMetro = (mm) => mm / 1000;

/** Uma lista de pontos (de qualquer dimensão) de milímetro para metro, coordenada a coordenada. */
export const pontosEmMetro = (pontos) => pontos.map((ponto) => ponto.map(milimetroParaMetro));

/** Área com sinal de um contorno [[u, v], ...] fechado pelo último ponto de volta ao primeiro: positiva no sentido anti-horário, negativa no horário. */
export const areaComSinal = (contorno) => contorno.reduce((soma, [a, b], i) => {
  const [c, d] = contorno[(i + 1) % contorno.length];
  return soma + (a * d - c * b);
}, 0) / 2;

/** O contorno no sentido anti-horário: o próprio, se já está, ou uma cópia invertida. Área nula não inverte. */
export const antiHorario = (contorno) => (areaComSinal(contorno) < 0 ? [...contorno].reverse() : contorno);

/** Meia seção [[x, y], ...], do eixo para fora, espelhada em x = 0: a meia, depois o espelho dela na ordem inversa. */
export const espelharMeia = (meia) => [...meia, ...[...meia].reverse().map(([x, y]) => [-x, y])];
