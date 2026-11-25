/* servo.js — o atuador de caixa (forma 2, o servo de robô pequeno), em milímetro, com o eixo da saída em y.

   A caixa é a extrusão em y do retângulo de cantos arredondados, de comprimento em x e largura em z, da base (y = 0) à
   altura da caixa. As orelhas de fixação são uma placa mais comprida que a caixa, na altura da aba, com dois furos
   passantes em cada ponta. A torre redonda do eixo fica em cima, deslocada do centro para +x, e a saída do cabo sai da
   ponta −x, abaixo das orelhas. O horn é a peça que gira: um disco sobre a torre, com quatro furos cegos em cruz para os
   parafusos do membro. Regra da família, na proporção dos servos de mercado, sem marca. */

export function geometriaDoServo(q) {
  const L = q.comprimentoDaCaixa; const W = q.larguraDaCaixa; const H = q.alturaDaCaixa;
  const e = q.abaDeFixacao; const te = q.espessuraDaAba; const ya = q.alturaDaAba;
  const xe = L / 2 + e / 2; const ze = q.distanciaDosFurosDaAba / 2; const rf = q.diametroDoFuroDaAba / 2;
  const xs = q.deslocamentoDoEixo; const rt = 0.25 * W; const ht = 0.12 * H;
  const rh = q.diametroDoHorn / 2; const th = q.espessuraDoHorn;
  const cantos = Math.min(1.5, 0.08 * W);
  const rc = 0.12 * W; const lc = 0.12 * L;
  const topo = H + ht + th;
  const centrosDaAba = [[-xe, ya, -ze], [-xe, ya, ze], [xe, ya, -ze], [xe, ya, ze]];
  const rFuroHorn = 0.08 * rh + 0.4; const cFuroHorn = 0.65 * rh;
  return {
    caixa: { largura: L, profundidade: W, cantos, altura: H },
    aba: { largura: L + 2 * e, profundidade: W, cantos, y: ya, altura: te },
    furosDaAba: centrosDaAba.map(([x, , z]) => ({ em: [x, ya - 1, z], perfil: [[0, 0], [rf, 0], [rf, te + 2], [0, te + 2]] })),
    torre: { em: [xs, H - 0.5, 0], perfil: [[0, 0], [rt, 0], [rt, ht + 0.5], [0, ht + 0.5]] },
    cabo: { em: [-L / 2 + 0.5 - lc, 0.25 * H, 0], perfil: [[0, 0], [rc, 0], [rc, lc], [0, lc]] },
    horn: { em: [xs, H + ht, 0], perfil: [[0, 0], [rh, 0], [rh, th], [0, th]] },
    furoDoHorn: { em: [xs + cFuroHorn, topo - th / 2, 0], perfil: [[0, 0], [rFuroHorn, 0], [rFuroHorn, th / 2 + 1], [0, th / 2 + 1]], raio: cFuroHorn, diametro: 2 * rFuroHorn },
    centrosDaAba, topo, xs,
  };
}

export const SERVOS = Object.freeze({
  pequeno: Object.freeze({ forma: 2, comprimentoDaCaixa: 23, larguraDaCaixa: 12.5, alturaDaCaixa: 22, abaDeFixacao: 5, espessuraDaAba: 2, alturaDaAba: 15.5, diametroDoFuroDaAba: 2, distanciaDosFurosDaAba: 5, diametroDoHorn: 10, espessuraDoHorn: 2, deslocamentoDoEixo: 6 }),
  medio: Object.freeze({ forma: 2, comprimentoDaCaixa: 40, larguraDaCaixa: 20, alturaDaCaixa: 38, abaDeFixacao: 7, espessuraDaAba: 2.5, alturaDaAba: 27, diametroDoFuroDaAba: 4.2, distanciaDosFurosDaAba: 10, diametroDoHorn: 20, espessuraDoHorn: 3, deslocamentoDoEixo: 10 }),
  grande: Object.freeze({ forma: 2, comprimentoDaCaixa: 60, larguraDaCaixa: 30, alturaDaCaixa: 52, abaDeFixacao: 9, espessuraDaAba: 3, alturaDaAba: 37, diametroDoFuroDaAba: 5.5, distanciaDosFurosDaAba: 16, diametroDoHorn: 28, espessuraDoHorn: 4, deslocamentoDoEixo: 15 }),
});

/** Os parâmetros da família pelo tamanho do servo; recusa o tamanho que não existe. */
export function parametrosDoServo(tamanho) {
  const s = SERVOS[tamanho];
  if (!s) throw new Error(`atuador de junta: o servo ${tamanho} não existe; aceitos: ${Object.keys(SERVOS).join(', ')}`);
  return { ...s };
}
