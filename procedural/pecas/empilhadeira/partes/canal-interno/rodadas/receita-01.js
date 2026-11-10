/* empilhadeira/canal-interno — o canal interno da torre da empilhadeira: os dois canais em U, abertos para dentro, que correm dentro
 * dos canais externos da torre, e a travessa de cima entre eles, que leva as polias das correntes, numa peça rígida.
 *
 * Etapa da montagem `../../montagem.json` depois da torre (fatia 4 do plano `docs/modelar/planos/2026-11-09-empilhadeira.md`, item 4
 * das partes do `../../ALINHAMENTO.md`). A forma é a do rascunho que a pessoa aprovou por imagem em 2026-11-10
 * (`../../referencias/torre-garfos.esboco.mjs`), levada para cá sem mudança de medida; o rascunho passou a chamar `montarCanalInterno`
 * daqui, de modo que a geometria tem uma fonte só.
 *
 * DE ONDE VEM CADA MEDIDA (do rascunho). A vista de frente (`frente.ia.png`) mostra o canal interno de 15 px ao lado do externo, das
 * colunas 477 a 491 e 598 a 611, com o externo e o interno chegando juntos ao topo da torre recolhida (rodada 1 do rascunho, A2 e A3:
 * com o externo 60 mm abaixo aparecia um degrau que a referência não tem). O U do interno se encaixa no U do externo: a alma, de 20 mm,
 * corre entre as abas do externo com 2 mm de folga para a alma dele e 4 mm para cada aba, e as abas de 20 mm vão para dentro até x
 * 198, de modo que de frente o interno aparece de 198 a 261, ao lado do externo. Essas folgas e as medidas do externo são da TABELA
 * da torre, de onde esta receita as tira; o pé do interno fica em y 260 e a travessa de cima vai de y 2.030 ao topo, com a frente em
 * z 350, onde as correntes descem.
 *
 * O ENCAIXE. A origem é a da máquina, a mesma da torre: o chão sob o centro do eixo dianteiro, no meio da largura; y para cima, +x à
 * esquerda de quem dirige e a frente em +z; a peça está recolhida, com o topo no topo da torre. A montagem põe o canal interno na
 * torre pela porta `guiaNoExterno` (a face de fora da alma do canal interno esquerdo) sobre a porta `guiaDoCanalInterno` da torre (a
 * face de dentro da alma do canal externo esquerdo), afastada da folga lateral.
 *
 * A JUNTA QUE A MONTAGEM AINDA NÃO TEM. O canal interno sobe na vertical dentro do externo (até 1.475 mm, no rascunho); a montagem v5
 * não tem articulação nem guia linear medida (ela mede encaixe cilíndrico e assento anular), e a posição sai das duas faces planas,
 * sem relação medida.
 *
 * A cadeia: a TABELA em mm; `derivar` calcula os perfis e a porta em mm; `montarCanalInterno` escreve os passos em mm num estado
 * { passos, topo, origem }; `gerarPassos` converte para metro com `m()`, campo de medida a campo de medida, num lugar só. */
import { TABELA as TORRE } from '../../torre/receita.js';
import { ferramentas } from '../../carcaca/receita/ferramentas.js';

export const TABELA = {
  /* A cor do rascunho: o cinza da torre. */
  cores: { aco: TORRE.cores.aco },
  /* As folgas para o canal externo: da alma do interno à alma do externo, e de cada aba do interno à aba do externo. */
  folga: { alma: 2, aba: 4 },
  /* A seção do U: alma e abas de 20 mm, e a aba vai para dentro até x 198. */
  alma: 20,
  aba: 20,
  dentro: 198,
  /* O pé do canal, em y; o topo é o da torre. */
  pe: 260,
  /* A travessa de cima, entre as almas: 70 mm de altura no topo, de trás das abas de trás até z 350, e 1 mm antes da face de fora das
     almas. */
  travessa: { altura: 70, frente: 350, recuo: 1 },
};

const m = (mm) => mm / 1000;

/** O perfil e a porta, em mm, no referencial da máquina. */
export function derivar(T = TABELA) {
  const E = TORRE.externo;
  const fora = E.x[1] - E.alma - T.folga.alma;
  const z = [TORRE.tras + E.aba + T.folga.aba, TORRE.frente - E.aba - T.folga.aba];
  const y = [T.pe, E.y[1]];
  /* o U do canal interno esquerdo em [x, z], aberto para dentro */
  const uInterno = [[T.dentro, z[0]], [fora, z[0]], [fora, z[1]], [T.dentro, z[1]], [T.dentro, z[1] - T.aba],
    [fora - T.alma, z[1] - T.aba], [fora - T.alma, z[0] + T.aba], [T.dentro, z[0] + T.aba]];
  const portas = {
    guiaNoExterno: { forma: 'plano', papel: 'apoia', ponto: [fora, y[1], (z[0] + z[1]) / 2], normal: [1, 0, 0], extensao: [z[1] - z[0], y[1] - y[0]], referencia: [0, 1, 0] },
  };
  return { fora, z, y, uInterno, portas };
}

/** Monta o canal interno no estado { passos, topo, origem }, em mm, no referencial da máquina, e devolve a origem da porta. */
export function montarCanalInterno(estado, T = TABELA) {
  const D = derivar(T);
  const { extY, booleana, parte } = ferramentas(estado);
  const unir = (...s) => booleana('unir', s);
  const novo = () => { estado.origem += 1; return estado.origem; };
  const espelho = (sel) => {
    const id = novo();
    estado.passos.push(['espelha', { origemId: id, eixo: 'x', pos: 0, derivaDe: sel.origem, sel: { origem: sel.origem } }]);
    return { origem: { op: 'espelha', id, de: sel.origem } };
  };
  const par = (sel) => unir(sel, espelho(sel));
  const R = T.travessa;
  const meia = D.fora - R.recuo;
  const canal = extY(D.uInterno, D.y[0], D.y[1]);
  const travessa = extY([[-meia, D.z[0]], [meia, D.z[0]], [meia, R.frente], [-meia, R.frente]], D.y[1] - R.altura, D.y[1]);
  parte('canaisInternos', unir(par(canal), travessa), T.cores.aco);
  return { canal };
}

const MEDIDAS = { extrusao: ['perfil', 'em', 'altura'], espelha: ['pos'] };
const MEDIDAS_DA_PORTA = ['ponto', 'extensao'];
const emMetro = (v) => (typeof v === 'number' ? m(v) : Array.isArray(v) ? v.map(emMetro) : v);

/** Os PASSOS, em metro: a forma e, no fim, a porta da guia. */
export function gerarPassos(T = TABELA) {
  const estado = { passos: [], topo: {}, origem: 0 };
  const { canal } = montarCanalInterno(estado, T);
  const forma = estado.passos.map(([op, args]) => [op, Object.fromEntries(Object.entries(args).map(([k, v]) => [k, (MEDIDAS[op] ?? []).includes(k) ? emMetro(v) : v]))]);
  const { portas } = derivar(T);
  const porta = (id, de) => ['publicarPorta', { id, de: de.origem, interface: Object.fromEntries(Object.entries(portas[id]).map(([k, v]) => [k, MEDIDAS_DA_PORTA.includes(k) ? emMetro(v) : v])) }];
  return [...forma, porta('guiaNoExterno', canal)];
}

/* Uma parte só: os dois canais e a travessa são um corpo. */
export const CONTATOS = [];

const receita = {
  meta: { nome: 'empilhadeira/canal-interno', desc: 'canal interno da torre da empilhadeira: dois canais em U abertos para dentro, que correm dentro dos externos, e a travessa de cima' },
  PARAMS: TABELA,
  TOPO: { origem: 'a da máquina: o chão sob o centro do eixo dianteiro, no meio da largura; y para cima, +x à esquerda de quem dirige e a frente em +z; recolhido' },
  PLANO: {
    objeto: 'o canal interno da torre duplex de 3 m de uma empilhadeira de 2,5 t: os dois canais que sobem dentro dos externos, com a travessa de cima, recolhido',
    referencias: ['../../referencias/frente.ia.png', '../../referencias/cima.ia.png'],
    escala: { medida: 'altura do canal interno recolhido, do pé ao topo da torre', milimetros: 1840 },
    partes: [
      { nome: 'canaisInternos', forma: 'dois canais em U cinza de pé, de y 260 a 2.100, de x 198 a 288 e z 124 a 348 de cada lado, abertos para dentro, com a alma entre as abas do canal externo, e a travessa de cima entre as almas, de y 2.030 a 2.100 e z 124 a 350', tecnica: 'U extrudado em y e o espelho dele, unidos à travessa extrudada em y' },
    ],
    criteriosDeReprovacao: [
      'o canal interno cruzando o canal externo, ou fora do U dele',
      'o topo do interno fora do topo do externo, na torre recolhida',
      'o canal sem o U aberto para dentro, ou sem a travessa de cima',
      'cor trocada: o canal laranja ou escuro',
    ],
  },
  contatos: CONTATOS,
  /* Os extremos que a TABELA fixa, em mm. */
  get PONTOS() {
    const D = derivar(this.PARAMS);
    return [
      { nome: 'topo da frente do canal esquerdo', parte: 'canaisInternos', medida: 'maximo', em: [D.fora, D.y[1], this.PARAMS.travessa.frente], toleranciaMm: 0.5 },
      { nome: 'pé de trás do canal direito', parte: 'canaisInternos', medida: 'minimo', em: [-D.fora, D.y[0], D.z[0]], toleranciaMm: 0.5 },
    ];
  },
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
