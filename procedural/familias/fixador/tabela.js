/* tabela.js — as medidas métricas de rosca grossa, em mm, por diâmetro nominal: passo (ISO 261), sextavado da cabeça e da
   porca (ISO 4017 e ISO 4032: chave s, cabeça k, porca m), cabeça cilíndrica allen (ISO 4762: dk, sextavado interno s), e
   arruela lisa (ISO 7089: furo, diâmetro externo e espessura). São as medidas das normas, sem marca nem fabricante.

   Um diâmetro fora da tabela usa a linha do maior diâmetro padrão que não passa dele, com as medidas escaladas pela razão dos
   diâmetros e o passo da linha. */
export const TABELA_ISO = Object.freeze([
  { d: 3, passo: 0.5, chave: 5.5, cabeca: 2, porca: 2.4, dkAllen: 5.5, chaveAllen: 2.5, furoArruela: 3.2, externoArruela: 7, espessuraArruela: 0.5 },
  { d: 4, passo: 0.7, chave: 7, cabeca: 2.8, porca: 3.2, dkAllen: 7, chaveAllen: 3, furoArruela: 4.3, externoArruela: 9, espessuraArruela: 0.8 },
  { d: 5, passo: 0.8, chave: 8, cabeca: 3.5, porca: 4.7, dkAllen: 8.5, chaveAllen: 4, furoArruela: 5.3, externoArruela: 10, espessuraArruela: 1 },
  { d: 6, passo: 1, chave: 10, cabeca: 4, porca: 5.2, dkAllen: 10, chaveAllen: 5, furoArruela: 6.4, externoArruela: 12, espessuraArruela: 1.6 },
  { d: 8, passo: 1.25, chave: 13, cabeca: 5.3, porca: 6.8, dkAllen: 13, chaveAllen: 6, furoArruela: 8.4, externoArruela: 16, espessuraArruela: 1.6 },
  { d: 10, passo: 1.5, chave: 16, cabeca: 6.4, porca: 8.4, dkAllen: 16, chaveAllen: 8, furoArruela: 10.5, externoArruela: 20, espessuraArruela: 2 },
  { d: 12, passo: 1.75, chave: 18, cabeca: 7.5, porca: 10.8, dkAllen: 18, chaveAllen: 10, furoArruela: 13, externoArruela: 24, espessuraArruela: 2.5 },
  { d: 16, passo: 2, chave: 24, cabeca: 10, porca: 14.8, dkAllen: 24, chaveAllen: 14, furoArruela: 17, externoArruela: 30, espessuraArruela: 3 },
  { d: 20, passo: 2.5, chave: 30, cabeca: 12.5, porca: 18, dkAllen: 30, chaveAllen: 17, furoArruela: 21, externoArruela: 37, espessuraArruela: 3 },
  { d: 24, passo: 3, chave: 36, cabeca: 15, porca: 21.5, dkAllen: 36, chaveAllen: 19, furoArruela: 25, externoArruela: 44, espessuraArruela: 4 },
]);

/** As medidas do diâmetro nominal `d`: a linha da tabela, escalada quando `d` não é padrão. */
export function medidasIso(d) {
  const linha = [...TABELA_ISO].reverse().find((l) => l.d <= d) ?? TABELA_ISO[0];
  const f = d / linha.d;
  const escalada = Object.fromEntries(Object.entries(linha).map(([k, v]) => [k, k === 'passo' ? v : v * f]));
  return { ...escalada, d, padrao: linha.d === d };
}
