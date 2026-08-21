/* Primeira hipótese R2: meia pele dianteira definida por estações de caráter.
   Os valores são autorais e privados. Não reutiliza a cage nem a geometria P2. */

export const ESTACOES_DE_CARATER = [
  { nome: 'nariz', z: 2265, eixoDoCapo: 515, bojoDoCapo: 34, quebraDeOmbro: [720, 545], larguraDoFlanco: 790, soleira: [700, 170], recorteFarol: [460, 522] },
  { nome: 'frente', z: 1960, eixoDoCapo: 640, bojoDoCapo: 52, quebraDeOmbro: [880, 725], larguraDoFlanco: 945, soleira: [790, 160], recorteFarol: [555, 665] },
  { nome: 'inicio-do-arco', z: 1750, eixoDoCapo: 715, bojoDoCapo: 58, quebraDeOmbro: [930, 790], larguraDoFlanco: 980, soleira: [815, 155], recorteFarol: [595, 710] },
  { nome: 'eixo-da-roda', z: 1325, eixoDoCapo: 835, bojoDoCapo: 60, quebraDeOmbro: [965, 900], larguraDoFlanco: 1000, soleira: [845, 150], recorteFarol: [610, 780] },
  { nome: 'fim-do-arco', z: 900, eixoDoCapo: 915, bojoDoCapo: 52, quebraDeOmbro: [958, 950], larguraDoFlanco: 997, soleira: [855, 152], recorteFarol: [595, 845] },
  { nome: 'cowl', z: 480, eixoDoCapo: 970, bojoDoCapo: 42, quebraDeOmbro: [950, 985], larguraDoFlanco: 990, soleira: [860, 155], recorteFarol: [570, 890] },
];

const entre = (a, b, t) => a + (b - a) * t;

/* A seção não é elipse nem uma lista opaca de pontos. Cada anel recebe um
   papel: eixo do capô, bojo, quebra, volume do flanco, queda e soleira. */
export function avaliarSecao(estacao) {
  const [ombroX, ombroY] = estacao.quebraDeOmbro;
  const [soleiraX, soleiraY] = estacao.soleira;
  const meioCapoX = ombroX * 0.48;
  const meioCapoY = entre(estacao.eixoDoCapo, ombroY, 0.48) + estacao.bojoDoCapo;
  const flancoY = entre(ombroY, soleiraY, 0.24);
  const quedaX = entre(estacao.larguraDoFlanco, soleiraX, 0.55);
  const quedaY = entre(ombroY, soleiraY, 0.62);
  return [
    [0, estacao.eixoDoCapo],
    [meioCapoX, meioCapoY],
    [ombroX, ombroY],
    [estacao.larguraDoFlanco, flancoY],
    [quedaX, quedaY],
    [soleiraX, soleiraY],
  ];
}

export function construirPeleDianteira() {
  const V = new Map();
  const F = new Map();
  const secoes = ESTACOES_DE_CARATER.map((estacao, indice) => ({
    ...estacao,
    vertices: avaliarSecao(estacao).map(([x, y], anel) => {
      const id = indice * 10 + anel;
      V.set(id, [x, y, estacao.z]);
      return id;
    }),
  }));
  let id = 1;
  for (let i = 0; i < secoes.length - 1; i += 1) {
    for (let anel = 0; anel < 5; anel += 1) {
      /* A faixa baixa do flanco sai da pele antes de o arco entrar. Isto cria
         espaço vazio de verdade; não há um círculo pintado por cima de chapa. */
      if ((i >= 1 && i <= 3 && anel >= 3) || (i === 0 && anel === 1)) continue;
      const parte = anel < 2 ? 'capo' : anel === 2 ? 'quebraDeOmbro' : 'flanco';
      F.set(id, { id, parte, vs: [secoes[i].vertices[anel], secoes[i + 1].vertices[anel], secoes[i + 1].vertices[anel + 1], secoes[i].vertices[anel + 1]] });
      id += 1;
    }
  }
  const proximoVertice = 100;
  const proximoArco = id;
  const centroDaRoda = { y: 355, z: 1325 };
  const raioInterno = 345;
  const raioExterno = 425;
  const segmentos = 10;
  const arcoInterno = [];
  const arcoExterno = [];
  for (let i = 0; i <= segmentos; i += 1) {
    const t = Math.PI * i / segmentos;
    const ponto = (raio, x) => [x, centroDaRoda.y + raio * Math.sin(t), centroDaRoda.z + raio * Math.cos(t)];
    const interno = proximoVertice + i * 2;
    const externo = interno + 1;
    /* A borda tem largura e faces: o vazio interno não pertence à malha. */
    V.set(interno, ponto(raioInterno, 1012));
    V.set(externo, ponto(raioExterno, 984));
    arcoInterno.push(interno); arcoExterno.push(externo);
    if (i) F.set(proximoArco + i - 1, { id: proximoArco + i - 1, parte: 'arcoDeRoda', vs: [arcoInterno[i - 1], arcoInterno[i], arcoExterno[i], arcoExterno[i - 1]] });
  }
  /* Grade local: um trilho acompanha o ombro acima do arco. Cada faixa entre
     esse trilho e a borda externa do arco é um quad; a transição não depende
     mais de duas cunhas grandes nas extremidades. */
  const inicioDoArco = secoes[2].vertices;
  const eixoDaRoda = secoes[3].vertices;
  const fimDoArco = secoes[4].vertices;
  const trilhoDoOmbro = [];
  const porTrecho = (a, b, t) => a + (b - a) * t;
  for (let i = 0; i <= segmentos; i += 1) {
    if (i === 0) { trilhoDoOmbro.push(inicioDoArco[2]); continue; }
    if (i === segmentos / 2) { trilhoDoOmbro.push(eixoDaRoda[2]); continue; }
    if (i === segmentos) { trilhoDoOmbro.push(fimDoArco[2]); continue; }
    const primeiroTrecho = i < segmentos / 2;
    const t = primeiroTrecho ? i / (segmentos / 2) : (i - segmentos / 2) / (segmentos / 2);
    const a = primeiroTrecho ? inicioDoArco[2] : eixoDaRoda[2];
    const b = primeiroTrecho ? eixoDaRoda[2] : fimDoArco[2];
    const pa = V.get(a); const pb = V.get(b);
    const idTrilho = proximoVertice + (segmentos + 1) * 2 + i;
    V.set(idTrilho, [porTrecho(pa[0], pb[0], t), porTrecho(pa[1], pb[1], t), porTrecho(pa[2], pb[2], t)]);
    trilhoDoOmbro.push(idTrilho);
  }
  for (let i = 1; i <= segmentos; i += 1) {
    F.set(proximoArco + segmentos + i - 1, { id: proximoArco + segmentos + i - 1, parte: 'gradeLocalDoArco', vs: [trilhoDoOmbro[i - 1], trilhoDoOmbro[i], arcoExterno[i], arcoExterno[i - 1]] });
  }
  /* O retalho do farol removido vira um loop interno de quatro lados. A moldura
     compartilha sua borda externa com capô e ombro; o centro não recebe face. */
  const bordaExternaDoFarol = [secoes[0].vertices[1], secoes[1].vertices[1], secoes[1].vertices[2], secoes[0].vertices[2]];
  const centroDoFarol = bordaExternaDoFarol.reduce((soma, vertice) => {
    const p = V.get(vertice);
    return soma.map((v, eixo) => v + p[eixo] / bordaExternaDoFarol.length);
  }, [0, 0, 0]);
  const loopDoFarol = bordaExternaDoFarol.map((vertice, indice) => {
    const p = V.get(vertice);
    const idDoVertice = proximoVertice + 50 + indice;
    V.set(idDoVertice, p.map((v, eixo) => v + (centroDoFarol[eixo] - v) * 0.38));
    return idDoVertice;
  });
  const primeiroIdDoFarol = proximoArco + segmentos * 2;
  for (let i = 0; i < 4; i += 1) {
    const proximo = (i + 1) % 4;
    F.set(primeiroIdDoFarol + i, { id: primeiroIdDoFarol + i, parte: 'gradeLocalDoFarol', vs: [bordaExternaDoFarol[i], bordaExternaDoFarol[proximo], loopDoFarol[proximo], loopDoFarol[i]] });
  }
  const farol = { parte: 'recorteDeFarol', removida: true, entreEstacoes: ['nariz', 'frente'], anel: 1, loop: loopDoFarol };
  return { identidade: 'prova-superficie-aceite-r2', V, F, secoes, aberturas: { arcoDeRoda: { centroDaRoda, raioInterno, loop: arcoInterno }, farol } };
}

export function assinaturaDasSecoes() {
  return ESTACOES_DE_CARATER.map((s) => `${s.nome}@${s.z}:ombro=${s.quebraDeOmbro.join(',')}`).join('|');
}
