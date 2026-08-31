/* machado-de-guerra.js — machado de guerra de uma mão: cabeça assimétrica com
 * barba e esporão traseiro, cabo de madeira com reforço.
 *
 * Exemplo de autoria, não referência histórica.
 *
 * POR QUE ESTE OBJETO. A espada é simétrica em torno do próprio eixo; a cadeira
 * é bilateral. O machado não é nenhum dos dois: a cabeça é ASSIMÉTRICA no plano
 * do corte — gume de um lado, esporão do outro — e simétrica só na espessura.
 * Essa é a exigência que faltava exercitar.
 *
 * O QUE FAZ LER COMO MACHADO DE GUERRA e não como machado de lenhador:
 *   - o gume DESCE abaixo da linha do cabo, formando barba. Lenhador tem gume
 *     centrado; guerra tem barba, para enganchar escudo e braço;
 *   - a cabeça é FINA. Machado de guerra pesa pouco mais de um quilo; a massa
 *     de lenhador aqui viraria arma que ninguém levanta duas vezes;
 *   - o esporão traseiro é uma ponta, não um martelo. É o lado que perfura.
 *
 * ECONOMIA. O corpo da cabeça é um loft de quatro seções ao longo de X, o eixo
 * do corte. A barba não é peça separada: é a seção do gume descendo em Y, o que
 * mantém a cabeça como um sólido só e sem junção para fechar.
 *
 * TORÇÃO ACEITA, e dita aqui porque o conferente vai acusá-la. Um quad de loft
 * só sai plano quando as duas seções vizinhas são SEMELHANTES — mesma razão
 * entre espessura e altura. A espada curta obedece a isso e as faces dela são
 * planas até o último dígito. A cabeça de machado NÃO PODE obedecer: do olho ao
 * fio ela precisa ficar mais ALTA (a barba desce) e ao mesmo tempo mais FINA
 * (42 mm para 3 mm). A razão despenca por exigência da forma, e as faces do
 * gume torcem cerca de 24%.
 *
 * Duas saídas foram medidas antes de aceitar:
 *   - subdividir o loft: de 4 para 16 estações quadruplica o triângulo (32 para
 *     128) e a torção só cai pela metade (24% para 11%). Preço ruim;
 *   - achatar o perfil até as seções ficarem semelhantes: isso é desistir da
 *     barba e do fio, ou seja, deixar de ser um machado de guerra.
 * Fica a torção. O que ela custa é a triangulação da face passar a importar, e
 * disso cuida o preparo, que escolhe a diagonal em vez de pegar a primeira.
 */

const P = {
  cabo: { comprimento: 0.62, raio: 0.019, lados: 8 },
  cabeca: {
    larguraGume: 0.115,   // do olho até o fio, em X
    espessuraOlho: 0.042,
    espessuraFio: 0.003,
    alturaCima: 0.052,    // acima da linha do cabo
    alturaBarba: 0.085,   // abaixo: é a barba que define a arma
  },
  esporao: { comprimento: 0.070, base: 0.030 },
  reforco: { alt: 0.055, folga: 0.006 },
};

/* O cabo é o eixo Y; a cabeça monta no topo. `yCabeca` é a linha do cabo na
   altura da cabeça — a referência de que "acima" e "abaixo" dependem. */
const yCabeca = P.cabo.comprimento;

/* Seção da cabeça no plano YZ, parametrizada pela distância em X do olho.
   `cima` e `baixo` são as duas alturas, e é a diferença entre elas que faz a
   barba: no olho são simétricas, no fio a de baixo desceu. */
const secaoCabeca = (x, cima, baixo, meiaEsp) => ({
  pos: [x, yCabeca, 0],
  contorno: [
    [cima, 0],
    [0, meiaEsp],
    [-baixo, 0],
    [0, -meiaEsp],
  ],
});

export const receitaMachadoDeGuerra = {
  meta: { nome: 'Machado de Guerra', versao: '1.0.0', autor: 'Mecanifica Procedural AI' },

  PARAMS: P,

  TOPO: {
    assimetria: 'no plano do corte, não bilateral: gume de um lado, esporão do outro',
    barba: 'o gume desce abaixo da linha do cabo — é o que separa guerra de lenhador',
    cabecaUnica: 'a barba é seção do mesmo loft, não peça colada',
    eixoDoCorte: 'X; o cabo é Y; a espessura é Z',
  },

  MATERIAIS: {
    aco: { cor: '#9aa3ad', metalicidade: 0.88, aspereza: 0.38 },
    acoEscuro: { cor: '#6f7885', metalicidade: 0.85, aspereza: 0.5 },
    madeira: { cor: '#7a5230', metalicidade: 0.0, aspereza: 0.8 },
  },

  PASSOS: [
    /* ---------- cabo ----------
       Levemente mais grosso no fim, para a mão não escorregar no golpe. Fecha
       nas duas pontas com polo de raio zero: loft sem isso sai tubo aberto. */
    ['loft', {
      origemId: 1,
      lados: P.cabo.lados,
      orientacao: [1, 0, 0],
      secoes: [
        { pos: [0, 0, 0], raio: 0 },
        { pos: [0, 0.004, 0], raio: P.cabo.raio * 1.12 },
        { pos: [0, P.cabo.comprimento * 0.25, 0], raio: P.cabo.raio * 0.94 },
        { pos: [0, P.cabo.comprimento * 0.8, 0], raio: P.cabo.raio },
        { pos: [0, P.cabo.comprimento + 0.03, 0], raio: P.cabo.raio },
        { pos: [0, P.cabo.comprimento + 0.034, 0], raio: 0 },
      ],
    }],
    ['parte', { nome: 'cabo', sel: { origem: { op: 'loft', id: 1 } } }],

    /* ---------- cabeça ----------
       Quatro estações ao longo de X. A primeira e a última são polos, e é entre
       a segunda e a terceira que a barba aparece: `baixo` cresce de 0,022 para
       a altura cheia enquanto `cima` quase não muda. */
    ['loft', {
      origemId: 2,
      lados: 4,
      orientacao: [0, 1, 0],
      secoes: [
        { pos: [-0.016, yCabeca, 0], raio: 0 },
        secaoCabeca(-0.010, P.cabeca.alturaCima * 0.62, 0.022, P.cabeca.espessuraOlho / 2),
        secaoCabeca(0.030, P.cabeca.alturaCima * 0.9, P.cabeca.alturaBarba * 0.55, P.cabeca.espessuraOlho / 2.4),
        secaoCabeca(P.cabeca.larguraGume * 0.8, P.cabeca.alturaCima, P.cabeca.alturaBarba, P.cabeca.espessuraOlho / 5),
        secaoCabeca(P.cabeca.larguraGume, P.cabeca.alturaCima * 0.98, P.cabeca.alturaBarba * 0.97, P.cabeca.espessuraFio / 2),
        { pos: [P.cabeca.larguraGume + 0.002, yCabeca, 0], raio: 0 },
      ],
    }],
    ['parte', { nome: 'cabeca', sel: { origem: { op: 'loft', id: 2 } } }],

    /* ---------- esporão ----------
       Cone apontando para -X, no lado oposto ao gume. É ponta, não martelo:
       machado de guerra perfura pelo lado de trás. */
    ['cone', {
      origemId: 3,
      raio: P.esporao.base / 2,
      altura: P.esporao.comprimento,
      lados: 6,
      eixo: 'x',
      em: [-0.012 - P.esporao.comprimento, yCabeca, 0],
    }],
    ['parte', { nome: 'esporao', sel: { origem: { op: 'cone', id: 3 } } }],

    /* ---------- reforço do olho ----------
       A cinta de metal que impede o cabo de rachar sob o impacto. Detalhe
       pequeno e é ele que faz a arma parecer montada em vez de encaixada. */
    ['cilindro', {
      origemId: 4,
      raio: P.cabo.raio + P.reforco.folga,
      altura: P.reforco.alt,
      lados: P.cabo.lados,
      em: [0, yCabeca - P.reforco.alt * 0.72, 0],
    }],
    /* Laterais e tampas são citações separadas: `{op:'cilindro',id}` sem eixo
       resolve só a lateral. Sem as duas linhas seguintes o reforço perde fundo e
       topo para o limbo das faces sem parte. */
    ['parte', { nome: 'reforcoDoOlho', sel: { origem: { op: 'cilindro', id: 4 } } }],
    ['parte', { nome: 'reforcoDoOlho', sel: { origem: { op: 'cilindro', id: 4, tampa: 'fundo' } } }],
    ['parte', { nome: 'reforcoDoOlho', sel: { origem: { op: 'cilindro', id: 4, tampa: 'topo' } } }],

    ['material', { usa: 'madeira', sel: { grupo: 'cabo' } }],
    ['material', { usa: 'aco', sel: { grupo: 'cabeca' } }],
    ['material', { usa: 'aco', sel: { grupo: 'esporao' } }],
    ['material', { usa: 'acoEscuro', sel: { grupo: 'reforcoDoOlho' } }],
  ],
};

export default receitaMachadoDeGuerra;
