/* geometria.js — as medidas de uma cremalheira da família `cremalheira`, em milímetro.

   A cremalheira é o próprio perfil de referência tipo A da ISO 53:1998, tabela 2: flancos retos a 20° da normal à linha
   primitiva, saliência de 1 módulo, creux de 1,25 módulo e raio de pé de 0,38 módulo, com o vão de meio passo (π·m/2) na
   linha primitiva. Ela fica no plano xz e a largura em y: a linha primitiva em z = 0, os dentes para +z, o primeiro dente
   inteiro de x = 0 a x = passo e a barra de x = 0 a dentes × passo. A base abaixo do pé (alturaDaBase) é regra da família. O teto de 60 dentes vem do custo da divisão
   da tampa da barra em pedaços convexos, que cresce mais que linearmente (3 s com 60 dentes, 12 s com 100); a cremalheira
   mais longa sai de várias, postas uma depois da outra a um número inteiro de passos. */
import { ANGULO_DE_PRESSAO, CREUX, RAIO_DE_PE, SALIENCIA } from '../engrenagem/geometria.js';

const FOLGA_DO_VAO = 0.1;
export const PONTOS_DO_RAIO_DE_PE = 3;
export const PONTOS_DO_VAO = 2 * (3 + PONTOS_DO_RAIO_DE_PE);

/** As medidas da cremalheira: a barra, o vão de um dente centrado em x = 0 e o passo, em mm. */
export function geometriaDaCremalheira({ modulo: m, dentes, largura, alturaDaBase }) {
  const alfa = (ANGULO_DE_PRESSAO * Math.PI) / 180;
  const passo = Math.PI * m;
  const cabeca = SALIENCIA * m;
  const pe = -CREUX * m;
  const rho = RAIO_DE_PE * m;
  const meioVao = (z) => passo / 4 + z * Math.tan(alfa);
  /* o raio de pé: tangente ao flanco e ao fundo no canto de 90° + 20° do vão */
  const canto = [meioVao(pe), pe];
  const meioAngulo = ((90 + ANGULO_DE_PRESSAO) / 2) * (Math.PI / 180);
  const t = rho / Math.tan(meioAngulo);
  const noFlanco = [canto[0] + t * Math.sin(alfa), canto[1] + t * Math.cos(alfa)];
  const noFundo = [canto[0] - t, canto[1]];
  const centro = [noFundo[0], noFundo[1] + rho];
  const a0 = Math.atan2(noFlanco[1] - centro[1], noFlanco[0] - centro[0]);
  const a1 = -Math.PI / 2;
  const arco = Array.from({ length: PONTOS_DO_RAIO_DE_PE }, (_, k) => {
    const a = a0 + ((a1 - a0) * (k + 1)) / (PONTOS_DO_RAIO_DE_PE + 1);
    return [centro[0] + rho * Math.cos(a), centro[1] + rho * Math.sin(a)];
  });
  const fora = cabeca + FOLGA_DO_VAO;
  /* o flanco é reto: do ponto de fora vai direto à tangente do raio de pé, sem ponto no meio (três pontos alinhados abrem a extrusão) */
  const lado = [[meioVao(fora), fora], noFlanco, ...arco, noFundo];
  const vao = [...lado, ...lado.map(([x, z]) => [-x, z]).reverse()];
  const comprimento = dentes * passo;
  const fundoDaBarra = pe - alturaDaBase;
  const barra = [[0, fundoDaBarra], [comprimento, fundoDaBarra], [comprimento, cabeca], [0, cabeca]];
  return { modulo: m, dentes, largura, passo, comprimento, vao, barra, cabeca, pe, fundoDaBarra, alturaDoVao: largura + 2 };
}
