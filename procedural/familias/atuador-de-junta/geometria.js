/* geometria.js — o atuador de junta cilíndrico, em milímetro, com o eixo da junta em y.

   A carcaça é uma peça torneada: a flange de fixação de y = 0 à espessura dela, o corpo do diâmetro da carcaça até o
   comprimento, com o chanfro nas bordas de fora (a de trás da flange e a da frente do corpo); a saída do cabo é um
   cilindro de lado, a 0,3 do comprimento, unido à carcaça; a flange tem os furos passantes em círculo. A flange de saída
   é a peça que gira: um disco sobre a face da frente da carcaça, do comprimento à espessura dela, com o chanfro de fora e
   os furos cegos em círculo para os parafusos do membro. Os furos começam meio passo fora do eixo x, para o cabo, que sai
   em +x, ficar entre dois furos da flange. Regra da família, sem norma. */

export function geometriaDoAtuador(q) {
  const R = q.diametro / 2; const L = q.comprimento; const c = q.chanfro;
  const Rf = q.diametroDoFlange / 2; const tf = q.espessuraDoFlange;
  const Rs = q.diametroDaSaida / 2; const ts = q.espessuraDaSaida;
  const carcaca = [[0, 0], [Rf - c, 0], [Rf, c], [Rf, tf], [R, tf], [R, L - c], [R - c, L], [0, L]];
  const saida = [[0, L], [Rs, L], [Rs, L + ts - c], [Rs - c, L + ts], [0, L + ts]];
  const rc = q.diametroDoCabo / 2; const yc = tf + 0.3 * (L - tf);
  const cabo = { perfil: [[0, 0], [rc, 0], [rc, 2 + 0.12 * q.diametro], [0, 2 + 0.12 * q.diametro]], em: [R - 2, yc, 0] };
  /* o furo 0 fica no ângulo 180°/n do plano [x, z]; a porta padraoFuros mede o ângulo no quadro do plano de apoio dela,
     que para a normal −y (atrás) põe esse furo em 90° + 180°/n e para a normal +y (frente) em −90° − 180°/n */
  const furo = (circulo, diametro, n, y0, y1, normalY) => {
    const a = Math.PI / n; const r = circulo / 2;
    return { perfil: [[0, y0], [diametro / 2, y0], [diametro / 2, y1], [0, y1]], em: [r * Math.cos(a), 0, r * Math.sin(a)], total: n, graus: 360 / n, anguloInicial: normalY < 0 ? 90 + 180 / n : -90 - 180 / n };
  };
  const profundidade = Math.min(ts - 1, 1.5 * q.diametroDoFuroDaSaida + 1);
  return {
    carcaca, saida, cabo,
    furosDoFlange: furo(q.circuloDoFlange, q.diametroDoFuroDoFlange, q.furosDoFlange, -1, tf + 1, -1),
    furosDaSaida: furo(q.circuloDaSaida, q.diametroDoFuroDaSaida, q.furosDaSaida, L + ts - profundidade, L + ts + 1, 1),
    topo: L + ts,
  };
}
