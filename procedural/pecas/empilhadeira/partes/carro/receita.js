/* empilhadeira/carro — o carro porta-garfos da torre da empilhadeira: a placa (as duas barras de 1.000 mm à frente da torre, as chapas
 * das pontas, os dois montantes de trás que correm por dentro dos canais internos e a travessa das correntes do cilindro) com a grade
 * de carga em cima, que sobem juntas, numa peça rígida.
 *
 * Etapa da montagem `../../montagem.json` depois do cilindro de elevação (fatia 4 do plano `docs/modelar/planos/encerrados/2026-11-09-empilhadeira.md`,
 * item 4 das partes do `../../ALINHAMENTO.md`, segunda metade da torre). A forma é a do rascunho que a pessoa aprovou por imagem em
 * 2026-11-10 (`../../referencias/torre-garfos.esboco.mjs`), levada para cá sem mudança de medida; o rascunho passou a chamar
 * `montarCarro` daqui, de modo que a geometria tem uma fonte só.
 *
 * DE ONDE VEM CADA MEDIDA (do rascunho, que as tirou das vistas). A largura de 1.000 é a da TABELA do alinhamento (classe II; a vista
 * de frente dá 836 e a de cima 920). As barras ficam à frente da torre, de z 430 a 480: a de baixo de y 170 a 240 e a de cima de 540
 * a 640 (vista de frente, linhas 480 a 497 e 388 a 415, com os garfos embaixo). As chapas das pontas, de 30 mm, ligam as duas barras
 * (de frente o quadro escuro desce dos dois lados até a barra de baixo). Os montantes de trás, de 55 mm de largura, vão de z 235 à
 * face de trás das barras e correm por dentro dos canais internos, a 3 mm da ponta das abas deles (x 198); a travessa entre eles, de
 * z 235 a 300 e y 590 a 640, recebe as correntes do cilindro de elevação. A grade de carga é o quadro de 1.000 sobre a barra de cima,
 * de z 445 a 480, com os montantes de 30 mm, a barra de cima de 1.200 a 1.230 e a do meio de 890 a 910 (vista de frente: topo na
 * linha 247, barra do meio na 347; lateral 1.236).
 *
 * O ENCAIXE. A origem é a da máquina, a mesma da torre: o chão sob o centro do eixo dianteiro, no meio da largura; y para cima, +x à
 * esquerda de quem dirige e a frente em +z; o carro está embaixo, na pose de transporte. A montagem põe o carro no canal interno pela
 * porta `guiaNoInterno` (a face de fora do montante esquerdo) sobre a porta `guiaDoCarro` do canal interno (a ponta da aba da frente
 * do canal esquerdo), afastada da folga; o ponto das duas fica na altura do pé do canal interno. Os garfos penduram nas portas
 * `apoioDoGarfoEsquerdo` e `apoioDoGarfoDireito`, a face da frente da barra de cima no centro de cada garfo.
 *
 * AS JUNTAS QUE A MONTAGEM AINDA NÃO TEM. O carro sobe na vertical pelos canais internos (2.950 mm no rascunho, o dobro do canal pelas
 * correntes); a montagem v5 não tem guia linear medida nem plano sobre plano (ela mede encaixe cilíndrico e assento anular), e a
 * posição sai das duas faces planas, sem relação medida.
 *
 * A cadeia: a TABELA em mm; `derivar` calcula as caixas e as portas em mm; `montarCarro` escreve os passos em mm num estado
 * { passos, topo, origem } (o mesmo que o rascunho da máquina usa); `gerarPassos` converte para metro com `m()`, campo de medida a
 * campo de medida, num lugar só. */
import { ferramentas } from '../carcaca/receita/ferramentas.js';
import { TABELA as INTERNO, derivar as derivarInterno } from '../canal-interno/receita.js';

export const TABELA = {
  /* A cor do rascunho: o quase preto da vista de frente (escuro mais claro que o fundo), da placa, da grade e dos garfos. */
  cores: { preto: '#26282b' },
  /* A meia largura da placa e da grade (1.000 mm). */
  meia: 500,
  /* O fundo das barras, em z: a face de trás e a da frente, onde os garfos penduram. */
  z: [430, 480],
  /* As duas barras, em y. */
  barraBaixo: [170, 240],
  barraCima: [540, 640],
  /* As chapas das pontas, entre as barras, de 30 mm na ponta; entram 1 mm em cada barra, para a união não deixar as arestas da
     divisa abertas (encostadas face a face, as quinas da chapa ficavam com uma face só). */
  ponta: { largura: 30, entra: 1 },
  /* Os montantes de trás: 55 mm de largura, a 3 mm da ponta das abas do canal interno, de z 235 à face de trás das barras. */
  montante: { largura: 55, folga: 3, tras: 235 },
  /* A travessa das correntes do cilindro, entre os montantes, 1 mm por dentro da face de fora deles. */
  travessa: { z: [235, 300], y: [590, 640], recuo: 1 },
  /* A grade de carga sobre a barra de cima: o fundo, os montantes de 30 mm, a barra de cima e a do meio; as barras param 1 mm por
     dentro da meia largura. */
  grade: { z: 445, montante: 30, topo: 1230, barraCima: 30, barraMeio: [890, 910], recuo: 1 },
  /* O centro de cada garfo, a meia distância dos dois (560 entre centros, vista de frente na escala da carcaça). */
  garfo: 280,
};

const m = (mm) => mm / 1000;

/** As caixas e as portas, em mm, no referencial da máquina. */
export function derivar(T = TABELA) {
  const DI = derivarInterno();
  /* a face de fora do montante esquerdo, a 3 mm da ponta das abas do canal interno */
  const fora = INTERNO.dentro - T.montante.folga;
  const montante = { x: [fora - T.montante.largura, fora], z: [T.montante.tras, T.z[0]], y: [T.barraBaixo[0], T.barraCima[1]] };
  /* o ponto da guia: a ponta da aba da frente do canal interno, na altura do pé dele (o carro embaixo, na pose de transporte) */
  const zDaAba = DI.z[1] - INTERNO.aba / 2;
  const yDoApoio = (T.barraCima[0] + T.barraCima[1]) / 2;
  const apoio = (x) => ({ forma: 'plano', papel: 'recebe', ponto: [x, yDoApoio, T.z[1]], normal: [0, 0, 1], extensao: [2 * T.meia, T.barraCima[1] - T.barraCima[0]], referencia: [0, 1, 0] });
  const portas = {
    guiaNoInterno: { forma: 'plano', papel: 'apoia', ponto: [fora, INTERNO.pe, zDaAba], normal: [1, 0, 0], extensao: [montante.z[1] - montante.z[0], montante.y[1] - montante.y[0]], referencia: [0, 1, 0] },
    apoioDoGarfoEsquerdo: apoio(T.garfo),
    apoioDoGarfoDireito: apoio(-T.garfo),
  };
  return { fora, montante, portas };
}

/** Monta o carro no estado { passos, topo, origem }, em mm, no referencial da máquina, e devolve as origens das portas. */
export function montarCarro(estado, T = TABELA) {
  const D = derivar(T);
  const { extY, booleana, parte } = ferramentas(estado);
  const unir = (...s) => booleana('unir', s);
  const novo = () => { estado.origem += 1; return estado.origem; };
  /* a cópia do outro lado, pelo espelho em x = 0 */
  const espelho = (sel) => {
    const id = novo();
    estado.passos.push(['espelha', { origemId: id, eixo: 'x', pos: 0, derivaDe: sel.origem, sel: { origem: sel.origem } }]);
    return { origem: { op: 'espelha', id, de: sel.origem } };
  };
  const par = (sel) => unir(sel, espelho(sel));
  const caixaY = (x0, x1, z0, z1, y0, y1) => extY([[x0, z0], [x1, z0], [x1, z1], [x0, z1]], y0, y1);
  const W = T.meia; const M = D.montante; const R = T.travessa; const G = T.grade;

  /* PLACA: as duas barras, o montante e a chapa da ponta de cada lado (o esquerdo e o espelho dele) e a travessa das correntes */
  const barraBaixo = caixaY(-W, W, T.z[0], T.z[1], ...T.barraBaixo);
  const barraCima = caixaY(-W, W, T.z[0], T.z[1], ...T.barraCima);
  const montante = caixaY(M.x[0], M.x[1], M.z[0], M.z[1], M.y[0], M.y[1]);
  const ponta = caixaY(W - T.ponta.largura, W, T.z[0], T.z[1], T.barraBaixo[1] - T.ponta.entra, T.barraCima[0] + T.ponta.entra);
  const travessa = caixaY(-M.x[1] + R.recuo, M.x[1] - R.recuo, R.z[0], R.z[1], R.y[0], R.y[1]);
  parte('placaGarfos', unir(barraBaixo, barraCima, par(unir(montante, ponta)), travessa), T.cores.preto);

  /* GRADE: os montantes de cada lado sobre a barra de cima, a barra de cima e a do meio */
  const lateral = caixaY(W - G.montante, W, G.z, T.z[1], T.barraCima[1], G.topo);
  const barras = [caixaY(-W + G.recuo, W - G.recuo, G.z, T.z[1], G.topo - G.barraCima, G.topo), caixaY(-W + G.recuo, W - G.recuo, G.z, T.z[1], ...G.barraMeio)];
  parte('gradeCarga', unir(par(lateral), ...barras), T.cores.preto);
  return { montante, barraCima };
}

/* Os campos de medida de cada operação e das portas: neles todo número é milímetro. */
const MEDIDAS = { extrusao: ['perfil', 'em', 'altura'], espelha: ['pos'] };
const MEDIDAS_DA_PORTA = ['ponto', 'extensao'];
const emMetro = (v) => (typeof v === 'number' ? m(v) : Array.isArray(v) ? v.map(emMetro) : v);

/** Os PASSOS, em metro: a forma e, no fim, as três portas. */
export function gerarPassos(T = TABELA) {
  const estado = { passos: [], topo: {}, origem: 0 };
  const { montante, barraCima } = montarCarro(estado, T);
  const forma = estado.passos.map(([op, args]) => [op, Object.fromEntries(Object.entries(args).map(([k, v]) => [k, (MEDIDAS[op] ?? []).includes(k) ? emMetro(v) : v]))]);
  const { portas } = derivar(T);
  const porta = (id, de) => ['publicarPorta', { id, de: de.origem, interface: Object.fromEntries(Object.entries(portas[id]).map(([k, v]) => [k, MEDIDAS_DA_PORTA.includes(k) ? emMetro(v) : v])) }];
  return [...forma, porta('guiaNoInterno', montante), porta('apoioDoGarfoEsquerdo', barraCima), porta('apoioDoGarfoDireito', barraCima)];
}

export const CONTATOS = [
  { par: ['gradeCarga', 'placaGarfos'], motivo: 'os montantes da grade assentam na face de cima da barra de cima da placa, em y 640, de x 470 a 500 de cada lado' },
];

const receita = {
  meta: { nome: 'empilhadeira/carro', desc: 'carro porta-garfos da empilhadeira: a placa de 1.000 mm com as duas barras, os montantes que correm nos canais internos e a travessa das correntes, e a grade de carga em cima' },
  PARAMS: TABELA,
  TOPO: { origem: 'a da máquina: o chão sob o centro do eixo dianteiro, no meio da largura; y para cima, +x à esquerda de quem dirige e a frente em +z; embaixo, na pose de transporte' },
  PLANO: {
    objeto: 'o carro porta-garfos da torre duplex de uma empilhadeira de 2,5 t, com a grade de carga, embaixo, na pose de transporte: a placa à frente da torre, os montantes que correm por dentro dos canais internos e a grade sobre a placa',
    referencias: ['../../referencias/frente.ia.png', '../../referencias/cima.ia.png'],
    escala: { medida: 'largura do carro porta-garfos (TABELA do alinhamento, classe II)', milimetros: 1000 },
    partes: [
      { nome: 'placaGarfos', forma: 'placa quase preta de 1.000 mm em z 430 a 480: barras em y 170 a 240 e 540 a 640, chapas de 30 mm nas pontas, montantes em x 140 a 195 e z 235 a 430, de y 170 a 640, e a travessa entre eles em z 235 a 300, y 590 a 640', tecnica: 'caixas extrudadas em y: as duas barras, o montante unido à chapa da ponta e o espelho dele, e a travessa, unidos' },
      { nome: 'gradeCarga', forma: 'o quadro quase preto de 1.000 mm sobre a barra de cima, de z 445 a 480, com os montantes de 30 mm nas pontas, de y 640 a 1.230, a barra de cima de 1.200 a 1.230 e a do meio de 890 a 910', tecnica: 'caixas extrudadas em y: o montante e o espelho dele unidos às duas barras' },
    ],
    criteriosDeReprovacao: [
      'o carro fora do centro da largura, ou mais estreito que a torre',
      'os montantes de trás cruzando os canais internos ou fora deles',
      'a grade solta da placa, ou mais estreita que ela',
      'o carro alto demais para a pose de transporte, com os garfos fora do chão',
      'cor trocada: o carro laranja ou cinza claro',
    ],
  },
  contatos: CONTATOS,
  /* Os extremos que a TABELA fixa, em mm. */
  get PONTOS() {
    const T = this.PARAMS; const D = derivar(T);
    return [
      { nome: 'canto de cima da frente da placa', parte: 'placaGarfos', medida: 'maximo', em: [T.meia, T.barraCima[1], T.z[1]], toleranciaMm: 0.5 },
      { nome: 'canto de baixo de trás da placa, nos montantes', parte: 'placaGarfos', medida: 'minimo', em: [-T.meia, T.barraBaixo[0], D.montante.z[0]], toleranciaMm: 0.5 },
      { nome: 'topo da grade', parte: 'gradeCarga', medida: 'maximo', em: [T.meia, T.grade.topo, T.z[1]], toleranciaMm: 0.5 },
      { nome: 'pé da grade', parte: 'gradeCarga', medida: 'minimo', em: [-T.meia, T.barraCima[1], T.grade.z], toleranciaMm: 0.5 },
    ];
  },
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
