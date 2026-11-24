/* engrenamento.js — o par de engrenagens retas da família e o pinhão com a cremalheira, em milímetro e graus.

   Duas retas de mesmo módulo engrenam na distância entre centros a = m·(z1 + z2)/2, em que os primitivos se tocam. Com a
   espessura de meio passo no primitivo (ISO 53, sem correção), essa distância dá folga nula, e os flancos se encostam;
   a folga entre flancos j vem de afastar os centros em j / (2·tan 20°), o jeito de dar folga sem mudar o dente. A folga
   padrão é FOLGA_ENTRE_FLANCOS módulos, regra da família.

   Fase: o vão 0 de cada engrenagem está no ângulo 0 (eixo x) e os dentes entre os vãos; girar θ em volta de y leva o
   ângulo α a α − θ. A motora fica no centro com um dente no ângulo 0, voltado para a movida, que fica em x = a com um vão no
   ângulo 180°. Girando a motora φ, a movida gira −φ·z1/z2. A cremalheira fica com a linha primitiva em z = 0 e um vão em
   x = 0; o pinhão fica acima, em z = rp + afastamento, com um dente para baixo, e avançar a cremalheira um passo gira o
   pinhão um dente.

   FICHA parDeEngrenagens
   serve: o par de engrenagens retas da família `engrenagem`: a distância entre centros m·(z1 + z2)/2 afastada pela folga entre
     flancos, a relação e o giro de cada uma para a motora ter um dente voltado para a movida e a movida um vão, em qualquer posição.
   quando: duas retas de mesmo módulo; a motora fica no centro e a movida em x = distanciaEntreCentros, as duas pelo
     `instanciaDeFamilia` com `giro: { eixo: 'y', graus }`.
   unidades: parâmetros, folga e distância em mm; giros em graus.
   campos:
     parametros1: os parâmetros completos da motora.
     parametros2: os da movida, de mesmo módulo.
     folga: a folga entre flancos, em mm (padrão 0,05 módulo).
   devolve: { distanciaEntreCentros, distanciaNominal, afastamento, relacao, giros(phi) } com `giros(phi)` = [motora, movida] em graus
     quando a motora gira phi graus.
   exemplo:
     parDeEngrenagens({ tipo: 1, modulo: 1, dentes: 20 }, { tipo: 1, modulo: 1, dentes: 40 }).giros(4.5)
   peça: tools/fixtures/transmissao/par-de-engrenagens.mjs (o par de módulo 1 com 20 e 40 dentes).
   FIM DA FICHA

   FICHA pinhaoECremalheira
   serve: o pinhão reto da família `engrenagem` sobre a cremalheira da família `cremalheira`: a altura do centro do pinhão
     sobre a linha primitiva e o giro dele para engrenar, em qualquer avanço da cremalheira.
   quando: um pinhão reto e uma cremalheira de mesmo módulo, com a cremalheira tendo um vão em x = 0 e a linha primitiva em z = 0.
   unidades: parâmetros, folga, altura e avanço em mm; giro em graus.
   campos:
     parametrosDoPinhao: os parâmetros completos do pinhão.
     parametrosDaCremalheira: os da cremalheira, de mesmo módulo.
     folga: a folga entre flancos, em mm (padrão 0,05 módulo).
   devolve: { alturaDoCentro, raioPrimitivo, afastamento, giro(x) } com `giro(x)` o giro do pinhão quando a cremalheira avança x mm.
   exemplo:
     pinhaoECremalheira({ tipo: 1, modulo: 1, dentes: 20 }, { modulo: 1 }).giro(1.05)
   peça: tools/fixtures/transmissao/par-de-engrenagens.mjs (o pinhão de 20 dentes sobre a cremalheira de módulo 1).
   FIM DA FICHA */
import { ANGULO_DE_PRESSAO } from './geometria.js';

export const FOLGA_ENTRE_FLANCOS = 0.05;
const tanAlfa = Math.tan((ANGULO_DE_PRESSAO * Math.PI) / 180);

export class ErroDoEngrenamento extends Error {
  constructor(mensagem) { super(`engrenamento: ${mensagem}`); this.name = 'ErroDoEngrenamento'; }
}

/** O par de retas: distância entre centros, relação e o giro de cada uma (graus) na posição φ (graus) da motora. */
export function parDeEngrenagens(parametros1, parametros2, { folga = FOLGA_ENTRE_FLANCOS * parametros1.modulo } = {}) {
  if (parametros1.tipo !== 1 || parametros2.tipo !== 1) throw new ErroDoEngrenamento('as duas engrenagens precisam ser retas (tipo 1)');
  if (parametros1.modulo !== parametros2.modulo) throw new ErroDoEngrenamento(`as duas engrenagens precisam do mesmo módulo (vieram ${parametros1.modulo} e ${parametros2.modulo})`);
  const m = parametros1.modulo;
  const [z1, z2] = [parametros1.dentes, parametros2.dentes];
  const nominal = (m * (z1 + z2)) / 2;
  const afastamento = folga / (2 * tanAlfa);
  return {
    modulo: m, dentes: [z1, z2], relacao: z2 / z1, distanciaNominal: nominal, afastamento, folga, distanciaEntreCentros: nominal + afastamento,
    giros: (phi = 0) => [180 / z1 + phi, 180 - (phi * z1) / z2],
  };
}

/** O pinhão sobre a cremalheira: a altura do centro do pinhão sobre a linha primitiva e o giro dele quando a cremalheira avança x mm. */
export function pinhaoECremalheira(parametrosDoPinhao, parametrosDaCremalheira, { folga = FOLGA_ENTRE_FLANCOS * parametrosDoPinhao.modulo } = {}) {
  if (parametrosDoPinhao.tipo !== 1) throw new ErroDoEngrenamento('o pinhão precisa ser reto (tipo 1)');
  if (parametrosDoPinhao.modulo !== parametrosDaCremalheira.modulo) throw new ErroDoEngrenamento(`o pinhão e a cremalheira precisam do mesmo módulo (vieram ${parametrosDoPinhao.modulo} e ${parametrosDaCremalheira.modulo})`);
  const m = parametrosDoPinhao.modulo;
  const z = parametrosDoPinhao.dentes;
  const rp = (m * z) / 2;
  const afastamento = folga / (2 * tanAlfa);
  /* o dente do pinhão no ângulo −90° (para baixo) sobre o vão da cremalheira em x = 0; avançar x gira o pinhão x / rp */
  return { modulo: m, raioPrimitivo: rp, alturaDoCentro: rp + afastamento, afastamento, folga, giro: (x = 0) => 180 / z + 90 - ((x / rp) * 180) / Math.PI };
}
