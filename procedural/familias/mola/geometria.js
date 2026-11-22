/* geometria.js — as medidas da mola em milímetro, a partir dos parâmetros da família.

   Puro e sem núcleo: calcula a hélice do corpo e, conforme a forma, os ganchos (tração) ou os braços (torção), com a junta
   de cada ponta. O eixo da mola é y, a base do fio fica em y = 0 e a hélice gira para a direita, começando em z positivo.

   As três formas:
   - 1, compressão: espiras abertas, com a primeira e a última volta encostadas (passo de 1,05 vez o fio) e o passo do meio
     calculado para o fio ocupar o comprimento livre;
   - 2, tração: espiras encostadas e um gancho em cada ponta, uma volta quase fechada no plano do eixo, a uma folga de um
     fio acima da última espira, ligada a ela por uma perna reta;
   - 3, torção: espiras encostadas e um braço reto em cada ponta, tangente à espira.
   A junta de cada ponta é uma esfera do diâmetro do fio no ponto onde a hélice acaba, que fecha o canto entre os dois
   trechos varridos. */

export const ENCOSTADO = 1.05;
export const PONTOS_POR_VOLTA = 24;
/* o gancho: 290 graus de volta em 16 trechos, mais a perna; 17 pontos ao todo */
export const ARCO_DO_GANCHO = 290;
export const TRECHOS_DO_GANCHO = 16;
export const PONTOS_DO_GANCHO = TRECHOS_DO_GANCHO + 2;

const somar = (a, b) => a.map((x, k) => x + b[k]);
const escalar = (a, s) => a.map((x) => x * s);

/** A posição na hélice (eixo y, direita, começo em +z) no ângulo `ang`, em radianos, e na altura `y`. */
const naHelice = (raio, ang, y) => [raio * Math.sin(ang), y, raio * Math.cos(ang)];

export function geometriaDaMola(p) {
  const d = p.diametroDoFio;
  const raio = (p.diametroExterno - d) / 2;
  const voltas = p.espiras;
  const pontaPasso = ENCOSTADO * d;
  const base = d / 2;
  let helice;
  if (p.forma === 1) {
    const eixo = p.comprimentoLivre - d;
    const passo = (eixo - 2.5 * pontaPasso) / (voltas - 2.5);
    helice = { raio, passo, voltas, pontas: { voltas: 1, passo: pontaPasso }, base, altura: eixo };
  } else {
    helice = { raio, passo: pontaPasso, voltas, pontas: null, base, altura: pontaPasso * voltas };
  }
  const angFim = 2 * Math.PI * voltas;
  const inicio = naHelice(raio, 0, base);
  const fim = naHelice(raio, angFim, base + helice.altura);
  const geometria = { d, raio, helice, inicio, fim, forma: p.forma };

  if (p.forma === 2) {
    /* o gancho de cima no plano do eixo e da direção radial do fim; o de baixo, no do começo, virado para baixo */
    const gancho = (ponto, ang, sentido) => {
      const u = [Math.sin(ang), 0, Math.cos(ang)];
      const y0 = ponto[1];
      const centroY = y0 + sentido * (raio + d);
      const pontos = [ponto];
      for (let k = 0; k <= TRECHOS_DO_GANCHO; k += 1) {
        const phi = (ARCO_DO_GANCHO * Math.PI / 180) * (k / TRECHOS_DO_GANCHO);
        pontos.push(somar(escalar(u, raio * Math.cos(phi)), [0, centroY + sentido * raio * Math.sin(phi), 0]));
      }
      /* a normal do gancho é a perpendicular ao plano dele, a mesma em todos os pontos */
      const normal = [u[2], 0, -u[0]];
      return { pontos, normal };
    };
    geometria.ganchos = [gancho(fim, angFim, 1), gancho(inicio, 0, -1)];
  }
  if (p.forma === 3) {
    /* o braço sai tangente à espira, no plano horizontal: no fim para a frente, no começo para trás */
    const tangente = (ang) => [Math.cos(ang), 0, -Math.sin(ang)];
    geometria.bracos = [
      [fim, somar(fim, escalar(tangente(angFim), p.comprimentoDoBraco))],
      [inicio, somar(inicio, escalar(tangente(0), -p.comprimentoDoBraco))],
    ];
  }
  return geometria;
}
