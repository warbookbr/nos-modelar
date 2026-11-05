/* chapa.js — as medidas e a geometria comum às duas versões da abertura de prova (`receita.js`, o corte da chapa já subdividida,
 * e `corte-na-gaiola.js`, o corte da gaiola antes da subdivisão): a gaiola de 9 por 9 pontos a cada 100 mm sobre a
 * superfície de duas curvaturas de `procedural/nucleo/fixtures/friso-prova.js` (raio 600 mm em x e 900 mm em z), sem vão, e
 * o contorno do vão desenhado na vista superior, em [x, z]. O contorno sai do bico, segue reto até o fim do trecho reto e volta
 * ao bico por dois arcos tangentes, de modo que o único canto é o bico. Nenhum dado vem de referência externa. */
import { gaiolaDoPasso } from '../../../procedural/nucleo/operacoes/subdivisao.js';
import { subdividirCatmullClark } from '../../../procedural/nucleo/subdivisao.js';
import { contornoPorTrechos } from '../../../procedural/nucleo/curva2d.js';
import { alturaDaMalha } from '../../../procedural/nucleo/operacoes/abertura-por-contorno.js';

export const m = (mm) => mm / 1000;

/** As medidas em milímetro. O contorno é desenhado em [x, z], na vista superior. */
export const TABELA = {
  chapa: { pontos: 9, passo: 100, topo: 300, centro: [400, 400], raioX: 600, raioZ: 900, espessura: 2, niveis: 2 },
  contorno: { bico: [220, 430], fimDoReto: [520, 480], fimDoArco: [540, 380], segmentosArco: 32 },
  /* o prisma do corte depois da subdivisão passa da chapa nos dois sentidos de y: a chapa fica entre 78 e 300 mm de altura */
  prisma: { de: 0, ate: 500 },
  /* no corte da gaiola, os pontos novos ficam na superfície da chapa sem vão; medidos, a subdivisão os interpola */
  corte: { medirPontosNovos: false },
  /* a caixa em [x, z] em volta do vão que a parte `emVoltaDoVao` nomeia, para a bancada enquadrar a borda */
  emVolta: { de: [190, 350], ate: [600, 500] },
};

/** derivar(T) -> o que os passos usam, já em metro: os pontos da gaiola, as faces, os quatro cantos e o contorno em trechos
 *  e discretizado. */
export function derivar(T = TABELA) {
  const { chapa, contorno } = T;
  const altura = (x, z) => m(chapa.topo) - ((x - m(chapa.centro[0])) ** 2) / (2 * m(chapa.raioX)) - ((z - m(chapa.centro[1])) ** 2) / (2 * m(chapa.raioZ));
  const nome = (i, j) => `p${i}_${j}`;
  const pontos = {};
  for (let i = 0; i < chapa.pontos; i++) for (let j = 0; j < chapa.pontos; j++) { const x = m(chapa.passo * i), z = m(chapa.passo * j); pontos[nome(i, j)] = [x, altura(x, z), z]; }
  const faces = [];
  for (let i = 0; i + 1 < chapa.pontos; i++) for (let j = 0; j + 1 < chapa.pontos; j++) faces.push([nome(i, j), nome(i, j + 1), nome(i + 1, j + 1), nome(i + 1, j)]);
  const ultimo = chapa.pontos - 1;
  const cantos = [nome(0, 0), nome(ultimo, 0), nome(ultimo, ultimo), nome(0, ultimo)];
  const ponto = (p) => p.map(m);
  const trechos = { inicio: ponto(contorno.bico), trechos: [{ reto: ponto(contorno.fimDoReto) }, { arcoTangente: ponto(contorno.fimDoArco) }, { arcoTangente: ponto(contorno.bico) }] };
  const poligono = contornoPorTrechos(trechos, { segmentosArco: contorno.segmentosArco });
  return { pontos, vertices: Object.keys(pontos), faces, cantos, trechos, poligono };
}

/** O passo da chapa sem vão, sem origem: a gaiola com todos os pontos medidos, a borda com os quatro cantos. */
export function passoDaChapa(T = TABELA, d = derivar(T)) {
  return { vertices: d.vertices, faces: d.faces, cantos: d.cantos, borda: 'suave', medidas: [...d.vertices], espessura: m(T.chapa.espessura), niveis: T.chapa.niveis };
}

/** alturaDaChapa(T) -> (x, z) => y: a altura da face de fora da chapa sem vão, a superfície limite que o passo dela entrega. */
export function alturaDaChapa(T = TABELA, d = derivar(T)) {
  const { gaiola } = gaiolaDoPasso(passoDaChapa(T, d), { vec: (p) => d.pontos[p], num: (x) => x });
  const r = subdividirCatmullClark({ ...gaiola, niveis: T.chapa.niveis, borda: 'suave', aoLimite: true });
  return alturaDaMalha(r.vertices, r.faces);
}

/** A parte que nomeia as faces em volta do vão, para a bancada enquadrar a borda. */
export function parteEmVolta(T = TABELA) {
  const { de, ate } = T.emVolta;
  return ['parte', { nome: 'emVoltaDoVao', sel: { regiao: { min: [m(de[0]), -1, m(de[1])], max: [m(ate[0]), 1, m(ate[1])] } }, substituir: true }];
}

export const PLANO = {
  objeto: 'chapa curva de 800 por 800 mm com um vão de contorno livre: bico vivo, borda reta e borda curva',
  referencias: ['referencias/alvo.md'],
  escala: { medida: 'largura da chapa em x', milimetros: 800 },
  partes: [
    { nome: 'chapa', forma: 'chapa de 2 mm de duas curvaturas com o vão do contorno projetado em y', tecnica: 'subdivisao com medidas e espessura' },
    { nome: 'emVoltaDoVao', forma: 'as faces da mesma chapa em volta do vão, nomeadas para a bancada enquadrar a borda', tecnica: 'parte por região' },
  ],
  criteriosDeReprovacao: ['a borda do vão sai do contorno desenhado ou arredonda o bico', 'a chapa tem amassado, ondulação ou dobra que a forma não pede'],
};
