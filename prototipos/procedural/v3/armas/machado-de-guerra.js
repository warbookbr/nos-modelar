/* machado-de-guerra.js — machado de guerra de uma mão: cabeça de chapa com
 * barba, esporão traseiro e cabo com reforço.
 *
 * Exemplo de autoria, não referência histórica.
 *
 * POR QUE ESTE OBJETO. A espada é simétrica em torno do próprio eixo; a cadeira
 * é bilateral. O machado não é nenhum dos dois: a cabeça é ASSIMÉTRICA no plano
 * do corte — gume de um lado, esporão do outro — e simétrica só na espessura.
 *
 * O QUE FAZ LER COMO MACHADO DE GUERRA e não como machado de lenhador:
 *   - o gume DESCE abaixo da linha do cabo, formando barba, para enganchar
 *     escudo e braço. Lenhador tem gume centrado;
 *   - a cabeça é FINA. Machado de guerra pesa pouco mais de um quilo;
 *   - o esporão traseiro é uma ponta, não um martelo.
 *
 * ---------------------------------------------------------------------------
 * POR QUE `inflate` E NÃO `loft` — a correção que custou uma versão inteira
 *
 * A primeira cabeça era um `loft` de seções em LOSANGO ao longo do gume. Ela
 * passava em tudo que se mede por linha de comando — fechada, orientada, sem
 * face órfã — e mesmo assim era um cristal de quartzo, não um machado. O erro
 * não estava no número: estava na SEÇÃO.
 *
 * Um losango tem um vértice no meio de cada lado, então a cabeça ganhava uma
 * QUINA correndo pelo meio da face, e a face de uma cabeça de machado é
 * justamente a parte que tem de ser CHAPA. Somando a isso `cima`, `baixo` e
 * espessura variando cada um a seu ritmo entre quatro estações, cada quadrilátero
 * saía torto numa direção diferente e o conjunto virava um monte de facetas sem
 * plano nenhum.
 *
 * `inflate` descreve a peça como ela é de fato feita: uma SILHUETA (o perfil do
 * machado visto de lado) cruzada com uma PLANTA (a espessura, grossa no olho e
 * fina no gume). É a mesma descrição do ferreiro — chapa recortada, depois
 * afinada no fio — e sai fechada por construção, sem polo e sem tampa.
 *
 * LIÇÃO GERAL, que vale além do machado: `loft` serve quando a forma É uma
 * seção viajando; quando a forma é uma CHAPA com contorno, a seção viajando é a
 * ferramenta errada, e nenhuma quantidade de estações conserta isso.
 *
 * EIXOS. `inflate` lê a silhueta em z×y e a planta em z×x, então o gume aponta
 * para +Z e a espessura fica em X. O cabo continua em Y.
 */

const P = {
  cabo: { comprimento: 0.62, raio: 0.019, lados: 8 },
  cabeca: {
    alcance: 0.148,       // da nuca ao fio, em Z
    /* A meia-espessura no olho tem de VESTIR o cabo com folga, não empatar com
       ele. Com 0,021 contra um raio de cabo de 0,019 sobrava 2 mm de parede — e
       como a seção é superelipse, ela afina perto das bordas e o cabo saía
       pelas faces. 0,028 dá 9 mm de parede, que é o que faz o olho parecer
       olho. */
    meiaEspOlho: 0.028,
    meiaEspFio: 0.0016,
    alturaCima: 0.052,    // acima da linha do cabo
    alturaBarba: 0.082,   // abaixo: é a barba que define a arma
    divisoes: 14,
    lados: 16,
    /* Expoente da superelipse da seção. 2 daria elipse — cabeça de bico de
       pena. Alto achata os lados e é o que devolve a CHAPA que o losango do
       `loft` tinha destruído. Com 6 a face ainda saía como travesseiro no
       render; 14 é onde ela vira chapa de verdade. O modo 'grade' foi medido
       como alternativa e é pior: sai escada literal no contorno. */
    expoenteSecao: 14,
  },
  esporao: { comprimento: 0.062, base: 0.040 },
  reforco: { alt: 0.055, folga: 0.006 },
};

const yCabeca = P.cabo.comprimento;
const C = P.cabeca;

/* SILHUETA (z×y): o recorte da chapa, em metros absolutos.

   O DESENHO importa mais que os números. Um machado de guerra não é um retângulo
   com um entalhe — foi isso que a primeira chapa produziu, e ela lia como cutelo
   de açougue. A forma tem três trechos, nesta ordem:

     1. PESCOÇO: logo depois do olho a chapa é ESTREITA. É o que separa a massa
        do gume da massa do cabo, e é ele que faz a arma parecer leve;
     2. ABANO: a partir da metade a chapa abre para cima e para baixo;
     3. GUME EM CRESCENTE, com barriga adiante e BARBA que desce e volta para
        trás em gancho. O gume não é uma reta vertical: reta lê como lâmina de
        guilhotina, e o gancho da barba é o que engata escudo e braço. */
const silhueta = [
  [0, 0.042],                       // olho, borda de cima
  [C.alcance * 0.30, 0.035],        // pescoço: quase sem crescer
  [C.alcance * 0.63, 0.047],        // ombro: aqui começa o abano
  [C.alcance * 0.86, 0.052],
  [C.alcance * 0.985, 0.030],       // o gume vira para dentro no alto
  /* A barriga do gume precisa de DOIS pontos no z máximo, não de um. Com um só,
     a última estação do `inflate` tem altura zero e nascem oito faces de área
     nula — o `malha:conferir` reprova e a bancada recusa a peça. Fisicamente
     estes dois pontos são o pequeno plano do fio, que todo machado real tem. */
  [C.alcance, 0.006],
  [C.alcance, -0.034],
  [C.alcance * 0.94, -0.058],
  [C.alcance * 0.78, -0.086],       // ponta da barba, o gancho
  [C.alcance * 0.45, -0.062],
  [C.alcance * 0.20, -0.032],       // pescoço por baixo
  [0, -0.026],                      // olho, borda de baixo
];

/* PLANTA (z×x): a espessura. Quase constante nos dois primeiros terços — o
   corpo da chapa é paralelo — e só então cai para o fio. É o bisel, e
   concentrá-lo no fim é o que deixa a face grande PLANA. */
const planta = [
  [0, C.meiaEspOlho],
  [C.alcance * 0.55, C.meiaEspOlho * 0.86],
  [C.alcance, C.meiaEspFio],
  [C.alcance, -C.meiaEspFio],
  [C.alcance * 0.55, -C.meiaEspOlho * 0.86],
  [0, -C.meiaEspOlho],
];

export const receitaMachadoDeGuerra = {
  meta: { nome: 'Machado de Guerra', versao: '2.0.0', autor: 'Mecanifica Procedural AI' },

  PARAMS: P,

  TOPO: {
    cabecaPorInflate: 'silhueta recortada cruzada com a planta da espessura, como chapa forjada',
    faceChapa: 'expoenteSecao alto achata a face; losango de loft punha uma quina no meio dela',
    barba: 'o gume desce abaixo da linha do cabo — é o que separa guerra de lenhador',
    eixoDoCorte: 'Z; o cabo é Y; a espessura é X',
  },

  MATERIAIS: {
    aco: { cor: '#9aa3ad', metalicidade: 0.88, aspereza: 0.38 },
    acoEscuro: { cor: '#6f7885', metalicidade: 0.85, aspereza: 0.5 },
    madeira: { cor: '#7a5230', metalicidade: 0.0, aspereza: 0.8 },
  },

  PASSOS: [
    /* ---------- cabo ----------
       Levemente mais grosso no fim, para a mão não escorregar no golpe. Fecha
       nas duas pontas com polo de raio zero: loft sem isso sai tubo aberto.
       Aqui o loft está CERTO — o cabo é mesmo uma seção viajando. */
    ['loft', {
      origemId: 1,
      lados: P.cabo.lados,
      orientacao: [1, 0, 0],
      secoes: [
        { pos: [0, 0, 0], raio: 0 },
        { pos: [0, 0.004, 0], raio: P.cabo.raio * 1.12 },
        { pos: [0, P.cabo.comprimento * 0.25, 0], raio: P.cabo.raio * 0.94 },
        { pos: [0, P.cabo.comprimento * 0.8, 0], raio: P.cabo.raio },
        /* O cabo TERMINA DENTRO da cabeça. Antes ele subia até 0,654 e o topo
           da cabeça sobre o olho estava em 0,6538: o cabo furava a cabeça por
           dois décimos de milímetro, que na imagem é um bico saindo do dorso.
           Num machado real o cabo para dentro do olho e é encunhado ali. */
        { pos: [0, P.cabo.comprimento + 0.022, 0], raio: P.cabo.raio },
        { pos: [0, P.cabo.comprimento + 0.026, 0], raio: 0 },
      ],
    }],
    ['parte', { nome: 'cabo', sel: { origem: { op: 'loft', id: 1 } } }],

    /* ---------- cabeça ---------- */
    ['inflate', {
      origemId: 2,
      contornoLado: silhueta,
      contornoTopo: planta,
      modo: 'secoes',
      divisoes: C.divisoes,
      lados: C.lados,
      expoenteSecao: C.expoenteSecao,
    }],
    ['parte', { nome: 'cabeca', sel: { origem: { op: 'inflate', id: 2 } } }],
    /* `inflate` nasce em torno da origem; a cabeça sobe até o topo do cabo e
       recua um pouco em Z para o olho abraçar a haste em vez de tangenciá-la. */
    /* O recuo em Z põe o OLHO em cima da haste, não atrás dela. Com -0,012 a
       cabeça encostava na haste pela quina de cima e a arma lia como lâmina
       aparafusada num pau; o cabo precisa ATRAVESSAR o corpo da cabeça.

       O valor mede a NUCA — o bloco de aço atrás do olho. Com -0,030 sobravam
       9 mm atrás do cabo e a lâmina continuava lendo como colada na frente do
       pau. Com -0,048 sobram 27 mm, e é essa massa atrás do olho que faz o
       machado parecer montado. O `alcance` cresceu junto para o gume não
       perder distância. */
    ['transladar', { d: [0, yCabeca, -0.048], sel: { grupo: 'cabeca' } }],

    /* ---------- esporão ----------
       Cone apontando para -Z, no lado oposto ao gume. É ponta, não martelo. */
    ['cone', {
      origemId: 3,
      raio: P.esporao.base / 2,
      altura: P.esporao.comprimento,
      lados: 6,
      eixo: 'z',
      /* O esporão ENTRA na cabeça em vez de encostar no plano dela: tangência
         exata deixa costura visível na junção. */
      em: [0, yCabeca, -0.040 - P.esporao.comprimento],
    }],
    ['parte', { nome: 'esporao', sel: { origem: { op: 'cone', id: 3 } } }],

    /* ---------- reforço do olho ----------
       A cinta de metal que impede o cabo de rachar sob o impacto. Laterais e
       tampas são citações separadas: `{op:'cilindro',id}` sem eixo resolve só a
       lateral, e sem as duas linhas seguintes o reforço perde fundo e topo. */
    ['cilindro', {
      origemId: 4,
      raio: P.cabo.raio + P.reforco.folga,
      altura: P.reforco.alt,
      lados: P.cabo.lados,
      /* A cinta fica ABAIXO da cabeça, encostada nela. Com o cálculo antigo ela
         subia até 0,635 e entrava no corpo da cabeça, cujo ventre no olho está
         em 0,594. */
      em: [0, yCabeca - 0.028 - P.reforco.alt, 0],
    }],
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
