/* geometria.js — as medidas do cilindro hidráulico a partir dos parâmetros da família, puras e em milímetro.

   O cilindro de dupla ação tem o eixo da haste em x e os pinos dos olhais em z. A origem é o centro do pino traseiro; o
   centro do pino dianteiro fica em x = `comprimentoRecolhido` com a haste recolhida. A camisa é um tubo de parede
   `parede` e furo `embolo`, fechado atrás e aberto na frente, onde a cabeça (a guia) fecha o furo em volta da haste; a
   haste leva o êmbolo atrás, o corpo da haste e o olhal dianteiro. O êmbolo para no fundo da camisa recolhido e na cabeça
   estendido, de modo que o curso declarado é exatamente a folga que sobra entre os dois.

   Cada olhal é um disco furado cortado por um plano: o corte encosta no fundo da camisa (atrás) ou na ponta da haste
   (na frente), e as peças se tocam ali sem se atravessar. Com rótula, o furo do olhal é maior e um anel mais largo
   (a rótula) fecha o furo do pino. O olhal dianteiro é um pouco mais estreito que o traseiro: dois olhais de mesma largura
   deixam faces coplanares em peças diferentes, e o teste de contato entre sólidos (`contato-de-solidos.js`) não separa
   triângulos coplanares distantes, de modo que a conferência do curso acusaria colisão em toda posição.

   As proporções que a ISO 6020-2 não fixa são escolhas desta família e estão aqui, num lugar só: pino de meio êmbolo,
   olhal de 0,9 do êmbolo, êmbolo de um quarto e cabeça de três décimos do diâmetro. Nada aqui tem Date.now nem
   Math.random: os mesmos parâmetros dão as mesmas medidas. */

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
  olhal: 0.45,
  larguraDoOlhalTraseiro: 0.5,
  larguraDoOlhalDianteiro: 0.45,
  alojamento: 1.2,
  rotula: 1.25,
  corteDoOlhal: 0.85,
  embolo: 0.25,
  cabeca: 0.3,
});

const arredondar = (valor) => Number(valor.toPrecision(12));

function olhal(embolo, fixacao, centro, sentido, proporcaoDaLargura) {
  const raioDoPino = (PROPORCOES.pino * embolo) / 2;
  const raioDoOlhal = PROPORCOES.olhal * embolo;
  const larguraDoOlhal = proporcaoDaLargura * embolo;
  const raioDoAlojamento = raioDoPino * PROPORCOES.alojamento;
  /* o disco é cortado SOBREPOSICAO além do plano onde o vizinho começa, para entrar nele */
  const corte = PROPORCOES.corteDoOlhal * raioDoOlhal + SOBREPOSICAO;
  return {
    centro,
    /* +1 corta o disco do lado da frente (olhal traseiro, que encosta na camisa), -1 do lado de trás */
    sentido,
    raioDoPino,
    raioDoOlhal,
    larguraDoOlhal,
    corte,
    semiCorda: Math.sqrt(raioDoOlhal ** 2 - corte ** 2),
    rotula: fixacao === 1,
    /* sem rótula o furo do olhal é o do pino; com rótula o olhal tem um alojamento maior e a rótula fecha o pino */
    raioDoFuro: fixacao === 1 ? raioDoAlojamento : raioDoPino,
    raioDaRotula: raioDoAlojamento,
    larguraDaRotula: PROPORCOES.rotula * larguraDoOlhal,
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
  const traseiro = olhal(embolo, fixacaoTraseira, 0, 1, PROPORCOES.larguraDoOlhalTraseiro);
  const dianteiro = olhal(embolo, fixacaoDianteira, comprimentoRecolhido, -1, PROPORCOES.larguraDoOlhalDianteiro);
  const comprimentoDoEmbolo = PROPORCOES.embolo * embolo;
  const comprimentoDaCabeca = PROPORCOES.cabeca * embolo;
  const inicioDaCamisa = traseiro.corte - SOBREPOSICAO;
  const comprimentoDaCamisa = parede + comprimentoDoEmbolo + curso + comprimentoDaCabeca;
  const frenteDaCamisa = inicioDaCamisa + comprimentoDaCamisa;
  const inicioDoEmbolo = inicioDaCamisa + parede;
  const inicioDoCorpo = inicioDoEmbolo + comprimentoDoEmbolo - SOBREPOSICAO;
  const fimDoCorpo = comprimentoRecolhido - (dianteiro.corte - SOBREPOSICAO);
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
      olhal: traseiro,
    },
    haste: {
      raioDoEmbolo: embolo / 2 - FOLGA_RADIAL,
      comprimentoDoEmbolo,
      inicioDoEmbolo,
      raioDoCorpo: haste / 2,
      inicioDoCorpo,
      fimDoCorpo,
      olhal: dianteiro,
    },
    /* o que sobra entre o êmbolo recolhido e a cabeça: é o curso, e o teste confere */
    folgaDoEmbolo: frenteDaCamisa - comprimentoDaCabeca - (inicioDoEmbolo + comprimentoDoEmbolo),
    /* a haste que aparece entre a frente da camisa e o corte do olhal dianteiro, recolhido */
    hasteExposta: fimDoCorpo - frenteDaCamisa,
  };
}

/** O menor comprimento recolhido que o curso e as partes mortas deixam, em mm; a restrição da família usa a mesma conta. */
export function comprimentoRecolhidoMinimo({ embolo, curso, parede }) {
  const corte = PROPORCOES.corteDoOlhal * PROPORCOES.olhal * embolo;
  return arredondar(corte + parede + PROPORCOES.embolo * embolo + curso + PROPORCOES.cabeca * embolo + HASTE_EXPOSTA_MINIMA * embolo + corte);
}
