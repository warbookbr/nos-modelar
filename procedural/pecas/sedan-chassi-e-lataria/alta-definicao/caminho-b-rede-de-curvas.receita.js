/* caminho-b-rede-de-curvas.receita.js: o caminho B do primeiro ciclo de alta definição do sedã. A gaiola sai de `gaiolaPorRede`, com as
 * curvas de feição desenhadas sobre as linhas do carro facetado: a cintura, o ombro do para-lama, o fundo (a borda de baixo, onde
 * fica a soleira), os dois arcos de roda, a frente e a traseira do trecho, e o contorno do topo da frente. Os pontos-chave são
 * amostras do alvo comum (`alvo.mjs`). Os arcos de roda são borda livre da chapa, e não corte. O raio das quinas sai do `vinco` das
 * curvas da cintura e do ombro, que age sobre a face que o `passo` da rede dá.
 *
 * `HD_NC` e `HD_NO` trocam a nitidez da cintura e do ombro; `HD_PASSO` o espaçamento da rede; `HD_NIVEIS` os níveis. */
import { gaiolaPorRede } from '../../../nucleo/gaiola-por-rede.js';
import { T, yFundo, noLado, naCintura, noTopo, noArco, R_ARCO, receitaDoCaminho } from './alvo.mjs';

const NITIDEZ_DA_CINTURA = Number(process.env.HD_NC ?? 0.4);
const NITIDEZ_DO_OMBRO = Number(process.env.HD_NO ?? 0.69);
const PASSO = Number(process.env.HD_PASSO ?? 90);
const NIVEIS = Number(process.env.HD_NIVEIS ?? 3);
/* o passo das duas curvas curtas que fecham a faixa entre a cintura e o ombro: com o passo da rede a faixa de 110 mm teria uma divisão só,
   e a malha de nível 3 mostraria a quina da cintura em segmentos de 12 mm */
const PASSO_DA_FAIXA = Number(process.env.HD_PASSO_FAIXA ?? 35);

const zF = T.zFrente; const zT = T.zTras; const yO = T.yOmbro;
const noOmbro = (z) => noLado(z, yO);
const noFundoDe = (z) => noLado(z, yFundo(z));
/* o ângulo em que o arco encontra o fundo, e os pontos do arco a 45 e 135 graus, de onde saem as ligações ao ombro */
const aFundo = (Math.asin((yFundo(0) - T.roda.raio) / R_ARCO) * 180) / Math.PI;
const zDoArco = (zc, graus) => zc + R_ARCO * Math.cos((graus * Math.PI) / 180);
const RF = T.roda.zFrente; const RT = T.roda.zTras;
const DESVIO = 120;                 /* a ligação sai do arco a 45 graus e chega ao ombro 120 mm adiante, a meio caminho entre o prumo e o raio */
const zOA = zDoArco(RF, 45) + DESVIO; const zOB = zDoArco(RF, 135) - DESVIO; const zOC = zDoArco(RT, 45) + DESVIO; const zOD = zDoArco(RT, 135) - DESVIO;
const zM = 34;                      /* a ligação do meio, entre os dois arcos */
const zP = 560; const zQ = -560;    /* onde o alargamento do para-lama acaba, na planta do rascunho: a ligação separa a zona alargada da porta plana */

const nos = {
  F: naCintura(zF), cP: naCintura(T.zPeDoCapo), Tr: naCintura(zT),
  oF: noOmbro(zF), oA: noOmbro(zOA), oB: noOmbro(zOB), oM: noOmbro(zM), oC: noOmbro(zOC), oD: noOmbro(zOD), oT: noOmbro(zT),
  oP: noOmbro(zP), oQ: noOmbro(zQ), p0: noFundoDe(zP), q0: noFundoDe(zQ),
  F0: noFundoDe(zF), s1: noArco(RF, aFundo), a1: noArco(RF, 45), a2: noArco(RF, 135), s2: noArco(RF, 180 - aFundo),
  m0: noFundoDe(zM), s3: noArco(RT, aFundo), a3: noArco(RT, 45), a4: noArco(RT, 135), s4: noArco(RT, 180 - aFundo), T0: noFundoDe(zT),
  H0: noTopo(0, zF), H1: noTopo(0, T.zPeDoCapo),
};
const entre = (a, b, n) => Array.from({ length: n }, (_, k) => a + ((b - a) * (k + 1)) / (n + 1));
const arco = (zc, graus) => graus.map((g) => noArco(zc, g));
const ligacao = (de, ate, zDe, zAte, yAte) => [de, noLado((zDe + zAte) / 2, (yO + yAte) / 2), ate];
const yDoArco45 = T.roda.raio + R_ARCO * Math.SQRT1_2;
/* os z dos pontos-chave das curvas ao comprido: os vértices da planta do rascunho e o que a graduação pede, sem os que caem a menos de 60 mm de um nó */
const AO_COMPRIDO = [1879, 1700, 1421, 1146, 871, 700, 560, 300, -280, -560, -700, -800, -1018, -1237, -1443, -1650, -1825];
const trecho = (zDe, zAte, f) => AO_COMPRIDO.filter((z) => z < zDe - 60 && z > zAte + 60).map(f);

const rede = gaiolaPorRede({
  passo: PASSO, fora: [1, 0.3, 0],
  nos,
  curvas: [
    { nome: 'cintura', pontos: ['F', ...trecho(zF, T.zPeDoCapo, naCintura), 'cP', ...trecho(T.zPeDoCapo, zT, naCintura), 'Tr'], vinco: NITIDEZ_DA_CINTURA },
    { nome: 'ombro', pontos: ['oF', ...trecho(zF, zOA, noOmbro), 'oA', ...trecho(zOA, zOB, noOmbro), 'oB', ...trecho(zOB, zP, noOmbro), 'oP', ...trecho(zP, zM, noOmbro), 'oM',
      ...trecho(zM, zQ, noOmbro), 'oQ', ...trecho(zQ, zOC, noOmbro), 'oC', ...trecho(zOC, zOD, noOmbro), 'oD', ...trecho(zOD, zT, noOmbro), 'oT'], vinco: NITIDEZ_DO_OMBRO },
    { nome: 'frenteAlta', pontos: ['oF', noLado(zF, 940), 'F'], passo: PASSO_DA_FAIXA },
    { nome: 'frenteBaixa', pontos: ['F0', ...[500, 600, 700, 795].map((y) => noLado(zF, y)), 'oF'] },
    { nome: 'trasAlta', pontos: ['oT', noLado(zT, 945), 'Tr'], passo: PASSO_DA_FAIXA },
    { nome: 'trasBaixa', pontos: ['T0', ...[540, 620, 700, 795].map((y) => noLado(zT, y)), 'oT'] },
    { nome: 'fundoFrente', pontos: ['F0', noFundoDe(1820), 's1'] },
    { nome: 'arcoFrente', pontos: ['s1', ...arco(RF, [20, 32]), 'a1', ...arco(RF, [60, 75, 90, 105, 120]), 'a2', ...arco(RF, [148, 160]), 's2'] },
    { nome: 'fundoMeio', pontos: ['s2', noFundoDe(700), 'p0', noFundoDe(300), 'm0', noFundoDe(-280), 'q0', noFundoDe(-700), 's3'] },
    { nome: 'arcoTras', pontos: ['s3', ...arco(RT, [20, 32]), 'a3', ...arco(RT, [60, 75, 90, 105, 120]), 'a4', ...arco(RT, [148, 160]), 's4'] },
    { nome: 'fundoTras', pontos: ['s4', ...[-1720, -1860].map(noFundoDe), 'T0'] },
    { nome: 'ligA1', pontos: ligacao('oA', 'a1', zOA, zDoArco(RF, 45), yDoArco45) },
    { nome: 'ligA2', pontos: ligacao('oB', 'a2', zOB, zDoArco(RF, 135), yDoArco45) },
    { nome: 'ligM', pontos: ['oM', ...[795, 700, 560].map((y) => noLado(zM, y)), 'm0'] },
    { nome: 'ligP', pontos: ['oP', ...[795, 700, 560].map((y) => noLado(zP, y)), 'p0'] },
    { nome: 'ligQ', pontos: ['oQ', ...[795, 700, 560].map((y) => noLado(zQ, y)), 'q0'] },
    { nome: 'ligA3', pontos: ligacao('oC', 'a3', zOC, zDoArco(RT, 45), yDoArco45) },
    { nome: 'ligA4', pontos: ligacao('oD', 'a4', zOD, zDoArco(RT, 135), yDoArco45) },
    { nome: 'capoFrente', pontos: ['H0', ...entre(0, nos.F[0], 3).map((x) => noTopo(x, zF)), 'F'] },
    { nome: 'capoTras', pontos: ['cP', ...entre(nos.cP[0], 0, 3).map((x) => noTopo(x, T.zPeDoCapo)), 'H1'] },
    { nome: 'centro', pontos: ['H1', ...[1146, 1421, 1700, 1879].map((z) => noTopo(0, z)), 'H0'] },
  ],
  retalhos: [
    { nome: 'faixaDaCintura', borda: ['cintura', 'trasAlta', 'ombro', 'frenteAlta'] },
    { nome: 'frenteDoArco', borda: ['frenteBaixa', { curva: 'ombro', de: 'oF', ate: 'oA' }, 'ligA1', { curva: 'arcoFrente', de: 'a1', ate: 's1' }, 'fundoFrente'] },
    { nome: 'sobreOArcoDaFrente', borda: [{ curva: 'ombro', de: 'oA', ate: 'oB' }, 'ligA2', { curva: 'arcoFrente', de: 'a2', ate: 'a1' }, 'ligA1'] },
    { nome: 'atrasDoArcoDaFrente', borda: [{ curva: 'ombro', de: 'oB', ate: 'oP' }, 'ligP', { curva: 'fundoMeio', de: 'p0', ate: 's2' }, { curva: 'arcoFrente', de: 's2', ate: 'a2' }, 'ligA2'] },
    { nome: 'portaDaFrente', borda: [{ curva: 'ombro', de: 'oP', ate: 'oM' }, 'ligM', { curva: 'fundoMeio', de: 'm0', ate: 'p0' }, 'ligP'] },
    { nome: 'portaDeTras', borda: [{ curva: 'ombro', de: 'oM', ate: 'oQ' }, 'ligQ', { curva: 'fundoMeio', de: 'q0', ate: 'm0' }, 'ligM'] },
    { nome: 'frenteDoArcoDeTras', borda: [{ curva: 'ombro', de: 'oQ', ate: 'oC' }, 'ligA3', { curva: 'arcoTras', de: 'a3', ate: 's3' }, { curva: 'fundoMeio', de: 's3', ate: 'q0' }, 'ligQ'] },
    { nome: 'sobreOArcoDeTras', borda: [{ curva: 'ombro', de: 'oC', ate: 'oD' }, 'ligA4', { curva: 'arcoTras', de: 'a4', ate: 'a3' }, 'ligA3'] },
    { nome: 'trasDoArco', borda: [{ curva: 'ombro', de: 'oD', ate: 'oT' }, 'trasBaixa', 'fundoTras', { curva: 'arcoTras', de: 's4', ate: 'a4' }, 'ligA4'] },
    { nome: 'topoDaFrente', borda: [{ curva: 'cintura', de: 'F', ate: 'cP' }, 'capoTras', 'centro', 'capoFrente'] },
  ],
});

export const REDE = rede;
const receita = receitaDoCaminho({
  nome: 'sedan-alta-definicao-caminho-b',
  desc: 'corpo de baixo direito e capô do sedã em alta definição, pela gaiola por rede de curvas sobre as linhas do carro facetado',
  pontos: rede.pontos,
  passo: rede.passo,
  niveis: NIVEIS,
  arcos: false,
  avisos: rede.avisos,
});
export default receita;
