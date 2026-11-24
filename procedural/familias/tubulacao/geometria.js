/* geometria.js — as medidas de uma peça da família `tubulacao`, em milímetro: o trecho reto, a curva e o tampão, ocos.

   Toda peça tem a boca de entrada no plano y = 0, centrada na origem, com o eixo em +y. O trecho é o tubo de parede
   `parede` e comprimento `comprimento`. A curva começa na origem para +y e dobra para +x em volta do centro (raio, 0, 0)
   pelo ângulo pedido; o tubo dela é a varredura do círculo de fora menos a do de dentro, e a de dentro passa um pouco das
   duas bocas para a subtração não deixar película. O tampão é um copo: a parede do tubo, o fundo da espessura da parede e
   um chanfro de uma vez e meia a parede na borda do fundo, no comprimento `comprimentoDoTampao`; a ASME B16.9 dá o
   comprimento, e o fundo elíptico dela fica como o fundo chanfrado, regra da família. */

export const PONTOS_DO_ARCO = 13;
/* os lados do tubo (o `lathe` da composição) e da seção da curva, iguais para as bocas casarem */
export const LADOS_DA_SECAO = 48;

export function geometriaDaPeca({ forma, diametroExterno: de, parede, comprimento, raio, angulo, fase, comprimentoDoTampao: e }) {
  const ro = de / 2;
  const ri = ro - parede;
  if (forma === 1) return { forma, ro, ri, perfil: [[ri, 0], [ro, 0], [ro, comprimento], [ri, comprimento], [ri, 0]], altura: comprimento };
  if (forma === 2) {
    /* a boca reta: a varredura corta a primeira seção na bissetriz do primeiro trecho, e a boca saía inclinada; cada ponta
       ganha um trecho reto de `toco` mm, e o arco encolhe o raio para o centro à boca continuar raio·tan(ângulo/2) */
    const a = (angulo * Math.PI) / 180;
    const passoDoArco = a / (PONTOS_DO_ARCO - 1);
    const toco = 1.5 * ro * Math.tan(passoDoArco / 2) + 0.2;
    const r = raio - toco / Math.tan(a / 2);
    const ponto = (t) => [r - r * Math.cos(t), toco + r * Math.sin(t), 0];
    const arco = Array.from({ length: PONTOS_DO_ARCO }, (_, k) => ponto((a * k) / (PONTOS_DO_ARCO - 1)));
    const fimT = [Math.sin(a), Math.cos(a), 0];
    const fimDoArco = arco[arco.length - 1];
    const ao = (d) => fimDoArco.map((x, k) => x + d * fimT[k]);
    const fora = [[0, 0, 0], ...arco, ao(toco)];
    /* a de dentro passa um toco além de cada boca, reta, para a subtração não deixar película */
    const dentro = [[0, -toco, 0], ...arco, ao(2 * toco)];
    /* a seção é o polígono de LADOS do tubo, girado de `fase` graus, para os vértices da boca caírem sobre os do tubo */
    const secao = (raioDaSecao) => Array.from({ length: LADOS_DA_SECAO }, (_, k) => {
      const t = (((fase ?? 0) + (360 * k) / LADOS_DA_SECAO) * Math.PI) / 180;
      return [raioDaSecao * Math.cos(t), raioDaSecao * Math.sin(t)];
    });
    return { forma, ro, ri, fora, dentro, secaoDeFora: secao(ro), secaoDeDentro: secao(ri), toco, raioDoArco: r, saida: { centro: ao(toco), eixo: fimT } };
  }
  const c = Math.min(1.5 * parede, e / 4, ro / 2);
  /* a linha aberta toca o eixo só nas duas pontas (o fundo de fora e o de dentro), como o lathe pede */
  return { forma, ro, ri, perfil: [[0, e], [ro - c, e], [ro, e - c], [ro, 0], [ri, 0], [ri, e - parede], [0, e - parede]], altura: e };
}
