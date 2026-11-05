/* corte-na-gaiola.js — a abertura de prova pela segunda técnica que a fatia 1 mediu: o contorno corta a gaiola de 9 por 9
 * pontos antes da subdivisão (`cortarGaiola` do protótipo), os pontos novos ficam na superfície da chapa sem vão, o bico entra
 * como canto e a subdivisão com espessura levanta a parede do vão. A chapa e o contorno são os de `chapa.js`; com
 * `corte.medirPontosNovos`, os pontos novos entram também como medidas, exatas ou com o peso dado. Fica para a medida do banco de provas reproduzir a
 * decisão; a peça de teste é `receita.js`. */
import { cortarGaiola } from '../../../procedural/nucleo/operacoes/abertura-por-contorno.js';
import { PLANO, TABELA, alturaDaChapa, derivar, m, parteEmVolta } from './chapa.js';

/** derivarCorte(T) -> o que `derivar` dá e o corte da gaiola: os pontos (os de antes que sobram e os novos), as faces, a borda
 *  do vão na ordem do contorno e o nome do bico. */
export function derivarCorte(T = TABELA) {
  const d = derivar(T);
  const corte = cortarGaiola({ pontos: d.pontos, faces: d.faces, poligono: d.poligono, alturaEm: alturaDaChapa(T, d), prefixo: 'vao' });
  return { ...d, corte };
}

export function gerarPassos(T = TABELA) {
  const { cantos, corte } = derivarCorte(T);
  const vertices = Object.keys(corte.pontos);
  const novos = new Set(corte.novos);
  /* medirPontosNovos: false deixa os pontos novos como pontos de controle, true os mede exatos e um número os mede com esse peso */
  const medir = T.corte.medirPontosNovos;
  const medidas = typeof medir === 'number' ? vertices.map((v) => (novos.has(v) ? { ponto: v, peso: medir } : { ponto: v, exata: true }))
    : medir ? vertices : vertices.filter((v) => !novos.has(v));
  return [
    ['subdivisao', { origemId: 1, vertices, faces: corte.faces, cantos: [...cantos, corte.bico], borda: 'suave', medidas, espessura: m(T.chapa.espessura), niveis: T.chapa.niveis }],
    ['parte', { nome: 'chapa', sel: { origem: { op: 'subdivisao', id: 1 } } }],
    parteEmVolta(T),
  ];
}

export default {
  meta: { nome: 'abertura-de-prova-corte-na-gaiola', desc: 'a abertura de prova pelo corte da gaiola antes da subdivisão' },
  TABELA,
  PARAMS: TABELA,
  get TOPO() { return { origem: 'canto da gaiola em x = 0 e z = 0, y para cima', ...derivarCorte(this.PARAMS).corte.pontos }; },
  get PASSOS() { return gerarPassos(this.PARAMS); },
  PLANO,
};
