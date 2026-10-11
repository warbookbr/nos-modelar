/* geometria.js — as medidas do cilindro hidráulico a partir dos parâmetros da família, puras e em milímetro.

   O cilindro de dupla ação tem o eixo da haste em x e os pinos dos olhais em z. A origem é o centro do pino traseiro; o
   centro do pino dianteiro fica em x = `comprimentoRecolhido` com a haste recolhida. A camisa é um tubo de parede
   `parede` e furo `embolo`, fechado atrás e aberto na frente, onde a cabeça (a guia) fecha o furo em volta da haste; a
   haste leva o êmbolo atrás, o corpo da haste e o terminal dianteiro. O êmbolo para no fundo da camisa recolhido e na
   cabeça estendido, de modo que o curso declarado é exatamente a folga que sobra entre os dois.

   Cada olhal é um anel inteiro (disco furado, com o furo do pino no eixo z) preso por um pescoço de revolução em torno
   do eixo x, que entra no anel e na peça vizinha. Atrás, o fundo da camisa é prolongado num tronco de cone que parte da
   parede da camisa e afina até o pescoço do olhal (a tampa traseira prolongada). Na frente, a ponta da haste é
   rosqueada num terminal: um colar cilíndrico, mais grosso que a haste, que afina num cone até o pescoço do olhal. A
   rosca fica dentro do colar e não é modelada. Os dois pescoços entram no anel pelo lado do furo, onde o anel tem massa
   (entre o furo e o raio externo), e a ponta menor deles não passa da largura do anel. Com rótula, o furo do olhal é o
   alojamento (maior) e uma bucha esférica truncada, saliente dos dois lados do anel, fecha o furo do pino. A bucha
   aparece como uma cúpula mais larga que o olhal.

   Contra a ISO 6020-2 só o diâmetro do pino (cerca de metade do êmbolo) está fixado de memória, a conferir contra a
   norma, que o repositório não traz. Tudo o mais é escolha desta família e está aqui, num lugar só, em `PROPORCOES`: o
   raio externo do olhal (0,55 do êmbolo, parede de 0,3 êmbolo em torno do pino liso e de 0,25 em torno do alojamento),
   a largura do olhal (meio êmbolo), o pescoço (0,9 da meia largura), as distâncias do pino ao fundo (0,75) e ao fim da
   haste (0,85 do êmbolo), o colar do terminal (0,65 da haste, no mínimo 0,3 do êmbolo), a bucha (esfera de meio êmbolo,
   truncada a 0,38 do êmbolo de cada lado), o êmbolo de um quarto e a cabeça de três décimos do diâmetro. Nada aqui tem
   Date.now nem Math.random: os mesmos parâmetros dão as mesmas medidas. */

/** Lados dos cilindros e anéis: múltiplo de 8, para o polígono do furo ter vértice em cada eixo. */
export const LADOS = 32;
/** Folga radial do êmbolo no furo e da haste no furo da cabeça, em mm. */
export const FOLGA_RADIAL = 0.4;
/** Quanto uma peça entra na vizinha onde as duas se unem, em mm: faces exatamente coincidentes dentro de uma peça confundem o teste de contato. */
export const SOBREPOSICAO = 0.2;
/** Menor trecho de haste, em mm por mm de êmbolo, entre a frente da camisa e o corte do olhal dianteiro, recolhido. */
export const HASTE_EXPOSTA_MINIMA = 0.1;
/** Nome do que o contrato chama de proporção, para o teste e a restrição lerem do mesmo lugar. */
export const PROPORCOES = Object.freeze({
  pino: 0.5,
  olhal: 0.55,
  larguraDoOlhal: 0.5,
  alojamento: 1.2,
  /* a bucha esférica: raio da esfera e meia largura da bucha, em êmbolo */
  esfera: 0.5,
  meiaLarguraDaBucha: 0.38,
  /* o pescoço: raio da ponta menor, em êmbolo (0,9 da meia largura do olhal), e onde ela começa, contado do pino */
  pescoco: 0.225,
  inicioDoPescoco: 0.4,
  /* do centro do pino ao fundo da camisa e ao fim do corpo da haste (a face do colar), em êmbolo */
  distanciaTraseira: 0.75,
  distanciaDianteira: 0.85,
  /* o cone do terminal, em êmbolo, e o colar em haste (com o piso em êmbolo) */
  coneDoTerminal: 0.25,
  colar: 0.65,
  colarMinimo: 0.3,
  embolo: 0.25,
  cabeca: 0.3,
});

/** Pontos da cúpula da bucha por meia largura: a esfera é uma poligonal de `SEGMENTOS_DA_BUCHA` segmentos. */
export const SEGMENTOS_DA_BUCHA = 6;

const arredondar = (valor) => Number(valor.toPrecision(12));

function olhal(embolo, fixacao, centro) {
  const raioDoPino = (PROPORCOES.pino * embolo) / 2;
  const raioDoOlhal = PROPORCOES.olhal * embolo;
  const larguraDoOlhal = PROPORCOES.larguraDoOlhal * embolo;
  const raioDoAlojamento = raioDoPino * PROPORCOES.alojamento;
  const raioDaEsfera = PROPORCOES.esfera * embolo;
  const meiaLarguraDaBucha = PROPORCOES.meiaLarguraDaBucha * embolo;
  /* a cúpula da bucha: raio e posição axial (a partir da face de trás da bucha) de cada ponto da esfera */
  const cupula = Array.from({ length: SEGMENTOS_DA_BUCHA + 1 }, (_, k) => {
    const z = -meiaLarguraDaBucha + (2 * meiaLarguraDaBucha * k) / SEGMENTOS_DA_BUCHA;
    return { raio: Math.sqrt(raioDaEsfera ** 2 - z ** 2), z: z + meiaLarguraDaBucha };
  });
  return {
    centro,
    raioDoPino,
    raioDoOlhal,
    larguraDoOlhal,
    rotula: fixacao === 1,
    /* sem rótula o furo do olhal é o do pino; com rótula o olhal tem um alojamento maior e a bucha fecha o pino */
    raioDoFuro: fixacao === 1 ? raioDoAlojamento : raioDoPino,
    raioDoAlojamento,
    larguraDaBucha: 2 * meiaLarguraDaBucha,
    cupula,
    raioDoPescoco: PROPORCOES.pescoco * embolo,
    /* a ponta menor do pescoço, contada do centro do pino em direção à peça vizinha */
    distanciaDoPescoco: PROPORCOES.inicioDoPescoco * embolo,
  };
}

/**
 * As medidas, em milímetro, de um conjunto de parâmetros já conferido pela família. Quem chama passa os parâmetros
 * completos (`chamar` os completa); aqui só se calcula. O raio de um polígono de `LADOS` lados é o circunscrito, e o
 * furo da camisa tem a apótema pedida, de modo que o êmbolo e a haste, redondos, passam por dentro dele.
 */
export function geometriaDoCilindro(parametros) {
  const {
    embolo, haste, curso, parede, comprimentoRecolhido, fixacaoTraseira, fixacaoDianteira,
  } = parametros;
  const cos = Math.cos(Math.PI / LADOS);
  const traseiro = olhal(embolo, fixacaoTraseira, 0);
  const dianteiro = olhal(embolo, fixacaoDianteira, comprimentoRecolhido);
  const comprimentoDoEmbolo = PROPORCOES.embolo * embolo;
  const comprimentoDaCabeca = PROPORCOES.cabeca * embolo;
  const inicioDaCamisa = PROPORCOES.distanciaTraseira * embolo;
  const comprimentoDaCamisa = parede + comprimentoDoEmbolo + curso + comprimentoDaCabeca;
  const frenteDaCamisa = inicioDaCamisa + comprimentoDaCamisa;
  const inicioDoEmbolo = inicioDaCamisa + parede;
  const inicioDoCorpo = inicioDoEmbolo + comprimentoDoEmbolo - SOBREPOSICAO;
  /* o colar do terminal começa aqui; o corpo da haste entra SOBREPOSICAO nele */
  const inicioDoColar = comprimentoRecolhido - PROPORCOES.distanciaDianteira * embolo;
  const fimDoCorpo = inicioDoColar + SOBREPOSICAO;
  const raioDoColar = Math.max(PROPORCOES.colar * haste, PROPORCOES.colarMinimo * embolo);
  const comprimentoDoCone = PROPORCOES.coneDoTerminal * embolo;
  const comprimentoDoTerminal = PROPORCOES.distanciaDianteira * embolo - dianteiro.distanciaDoPescoco;
  /* o tronco de cone traseiro vai da ponta menor (junto do pino) até SOBREPOSICAO dentro do fundo da camisa; a base fica
     no meio da parede, para ficar dentro da face externa do tubo */
  const raioDaBaseDoPescoco = embolo / 2 + parede / 2;
  return {
    lados: LADOS,
    embolo,
    diametroDaHaste: haste,
    curso,
    parede,
    comprimentoRecolhido,
    camisa: {
      raioExterno: (embolo / 2 + parede) / cos,
      raioDoFuro: embolo / 2 / cos,
      inicio: inicioDaCamisa,
      comprimento: comprimentoDaCamisa,
      frente: frenteDaCamisa,
      cabeca: {
        raioExterno: embolo / 2 / cos + SOBREPOSICAO,
        raioInterno: haste / 2 + FOLGA_RADIAL,
        comprimento: comprimentoDaCabeca - SOBREPOSICAO,
        inicio: frenteDaCamisa - comprimentoDaCabeca,
      },
      pescoco: {
        inicio: traseiro.distanciaDoPescoco,
        comprimento: inicioDaCamisa + SOBREPOSICAO - traseiro.distanciaDoPescoco,
        raioMenor: traseiro.raioDoPescoco,
        raioMaior: raioDaBaseDoPescoco,
      },
      olhal: traseiro,
    },
    haste: {
      raioDoEmbolo: embolo / 2 - FOLGA_RADIAL,
      comprimentoDoEmbolo,
      inicioDoEmbolo,
      raioDoCorpo: haste / 2,
      inicioDoCorpo,
      fimDoCorpo,
      terminal: {
        inicio: inicioDoColar,
        comprimento: comprimentoDoTerminal,
        raioDoColar,
        comprimentoDoColar: comprimentoDoTerminal - comprimentoDoCone,
        raioDoPescoco: dianteiro.raioDoPescoco,
      },
      olhal: dianteiro,
    },
    /* o que sobra entre o êmbolo recolhido e a cabeça: é o curso, e o teste confere */
    folgaDoEmbolo: frenteDaCamisa - comprimentoDaCabeca - (inicioDoEmbolo + comprimentoDoEmbolo),
    /* a haste que aparece entre a frente da camisa e a face do colar do terminal, recolhido */
    hasteExposta: inicioDoColar - frenteDaCamisa,
  };
}

/** O menor comprimento recolhido que o curso e as partes mortas deixam, em mm; a restrição da família usa a mesma conta. */
export function comprimentoRecolhidoMinimo({ embolo, curso, parede }) {
  return arredondar(
    (PROPORCOES.distanciaTraseira + PROPORCOES.embolo + PROPORCOES.cabeca + HASTE_EXPOSTA_MINIMA + PROPORCOES.distanciaDianteira) * embolo
    + parede + curso,
  );
}
