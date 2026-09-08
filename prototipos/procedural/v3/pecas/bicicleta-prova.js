/* bicicleta-prova.js — bicicleta de passeio de quadro aberto (step-through), aro 26.
 *
 * Exemplo de autoria, não referência de engenharia de ciclismo.
 *
 * O QUE ESTA PEÇA EXERCITA. Quase todo volume aqui é TUBO ENTRE DOIS PONTOS em
 * direção arbitrária, e o vocabulário do núcleo não tem essa operação:
 * `cilindro` nasce em torno de Y com a BASE no ponto dado, e `rotaciona` só
 * aceita eixo nominal. Cada tubo é, portanto, primitiva + duas rotações +
 * translação — encapsulado em `tuboEntre()` para que exista UMA autoria e
 * nenhum lado possa divergir do outro.
 *
 * QUADRO ABERTO, e não diamante: não há tubo superior reto entre direção e
 * selim. O que fecha o quadro é um par de tubos que desce da direção até a base
 * do tubo do selim, passando baixo. Isso muda o problema geométrico: o tubo
 * longo passa RENTE à roda dianteira, e a folga precisa ser medida, não
 * suposta. A folga alvo é 30 mm sobre o pneu; o valor está em PARAMS e o
 * `descrever --estrito` reprova se ela sumir.
 *
 * CONVENÇÃO DE EIXOS, medida e não suposta: +X é a lateral direita, +Y é para
 * cima, +Z é a frente. A roda dianteira está em +Z e o chão é y = 0.
 *
 * CONVENÇÃO DE `em`: em `cilindro`, `em` põe a BASE no ponto e centra os outros
 * dois eixos. Em `cubo`/`chamferBox`, X e Z são centro e Y é a base.
 *
 * ECONOMIA DECLARADA. Tubo com 12 lados porque sua silhueta de lado é uma reta;
 * pneu e aro com 32 porque são círculos protagonistas vistos de lado. O raio é
 * uma caixa fina, não um cilindro: na escala em que aparece a seção não chega a
 * um pixel, e `origem` de um `cubo` seleciona a primitiva inteira, enquanto a
 * de um cilindro deixa as duas tampas sem identidade semântica.
 *
 * ANEL É `lathe`, NUNCA DOIS CILINDROS CONCÊNTRICOS: cilindro é maciço, e o
 * externo engoliria aro, cubo e raios sem que medida nenhuma acusasse. A
 * declaração `formas` abaixo cobra topologia de anel (um furo passante) em
 * pneu e aro das duas rodas.
 */

const P = {
  /* Aro 26 com pneu de passeio de 44 mm: diâmetro externo 0,660 m. */
  roda: {
    raioExterno: 0.330,
    raioAro: 0.286,
    larguraPneu: 0.044,
    larguraAro: 0.024,
    alturaAro: 0.018,
    raios: 18,
    meiaSecaoRaio: 0.0012,
  },
  cubo: { raio: 0.024, largura: 0.104 },

  /* Quadro de passeio tamanho único, em metros. Entre-eixos 1,04 com eixo a
     0,330 do chão (o próprio raio externo da roda). */
  quadro: {
    entreEixos: 1.04,
    alturaEixo: 0.330,
    /* Movimento central logo acima do eixo traseiro em altura, e adiantado
       0,40 do entre-eixos a partir da traseira: é o que dá o triângulo de
       bainhas curto do passeio sem o pé bater no pneu. */
    alturaMovimentoCentral: 0.268,
    fracaoMovimentoCentral: 0.40,
    /* FOLGA SOBRE O PNEU DIANTEIRO, o número que governa a altura da direção.
       Topo do pneu = alturaEixo + raioExterno = 0,660. A base da direção fica
       essa folga acima disso; sem ela, tubo de direção e tubo aberto entram no
       pneu, e o contato aparece como reprovação, não como observação. */
    folgaSobrePneu: 0.030,
    /* Recuo horizontal da direção contra o eixo dianteiro: é o que dá o ângulo
       de caster e afasta o tubo longo do círculo da roda. */
    recuoDirecao: 0.135,
    comprimentoTuboDirecao: 0.145,
    inclinacaoDirecao: 0.055,
    alturaTopoSelim: 0.800,
    recuoTopoSelim: 0.115,
    raioTuboGrosso: 0.0180,
    raioTuboFino: 0.0105,
    raioTuboAberto: 0.0150,
    meiaBitolaAberta: 0.030,
    meiaBitolaTraseira: 0.056,
  },

  garfo: { meiaBitola: 0.048, raioLamina: 0.0130 },
  direcao: {
    alturaMesa: 0.075,
    recuoMesa: 0.030,
    raioMesa: 0.0140,
    larguraGuidao: 0.580,
    raioGuidao: 0.0120,
    comprimentoManopla: 0.115,
    raioManopla: 0.0160,
  },
  selim: { comprimento: 0.250, largura: 0.160, espessura: 0.048, chanfro: 0.020, alturaCanote: 0.100, raioCanote: 0.0135 },
  transmissao: {
    raioCoroa: 0.096,
    espessuraCoroa: 0.004,
    /* AFASTAMENTO LATERAL, medido contra a bainha e não escolhido por gosto.
       A bainha mora em x = ±0,056 com raio 0,0105, ou seja, sua face externa
       está em 0,0665. Com a coroa em 0,052 e o pedivela em 0,072 a medida de
       contato acusou `bainha ↔ coroa` e `bainha ↔ pedivelaDireitoBraco`
       interpenetrando: a corrente passaria dentro do quadro. Os valores abaixo
       põem coroa e manivela FORA da bainha, como numa bicicleta de verdade. */
    afastamentoCoroa: 0.078,
    afastamentoPedivela: 0.088,
    comprimentoPedivela: 0.170,
    raioPedivela: 0.0100,
    pedal: [0.092, 0.018, 0.062],
  },
};

const GRAU = 180 / Math.PI;
const LADOS_TUBO = 12;

/**
 * Tubo cilíndrico de `a` até `b`.
 *
 * `cilindro` nasce em torno de +Y com a base na origem. A direção desejada sai
 * de duas rotações compostas na ordem z→y, pela regra destrógira do núcleo:
 * girar +Y em torno de Z por `polar` dá (−sen polar, cos polar, 0); girar isso
 * em torno de Y por `azimute` dá (−sen polar·cos azimute, cos polar,
 * sen polar·sen azimute). Igualando à direção unitária desejada:
 *
 *     polar   = acos(uy)
 *     azimute = atan2(uz, −ux)
 *
 * Com `polar` nulo ou igual a 180° o azimute é indeterminado e vale zero — é o
 * tubo já vertical, e girá-lo em torno do próprio eixo não muda nada.
 */
function tuboEntre(passos, id, a, b, raio, lados = LADOS_TUBO) {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const comprimento = Math.hypot(d[0], d[1], d[2]);
  if (!(comprimento > 1e-9)) throw new Error(`tuboEntre: a e b coincidem (id ${id}).`);
  const u = d.map((v) => v / comprimento);
  const polar = Math.acos(Math.max(-1, Math.min(1, u[1])));
  const azimute = Math.abs(Math.sin(polar)) < 1e-9 ? 0 : Math.atan2(u[2], -u[0]);
  const sel = { origem: { op: 'cilindro', id } };
  passos.push(['cilindro', { origemId: id, raio, altura: comprimento, lados, em: [0, 0, 0] }]);
  if (Math.abs(polar) > 1e-9) passos.push(['rotaciona', { eixo: 'z', graus: polar * GRAU, pivo: [0, 0, 0], sel }]);
  if (Math.abs(azimute) > 1e-9) passos.push(['rotaciona', { eixo: 'y', graus: azimute * GRAU, pivo: [0, 0, 0], sel }]);
  passos.push(['transladar', { d: a, sel }]);
  return sel;
}

/* Nomeia o cilindro INTEIRO. `{op:'cilindro',id}` pega só a casca lateral; sem
   as duas tampas o `--estrito` acusa faces sem identidade semântica. `parte`
   acumula por nome, então três citações com o mesmo nome custam menos que um
   alias por tubo. */
function nomearCilindro(passos, nome, id) {
  for (const tampa of [undefined, 'fundo', 'topo']) {
    const origem = tampa === undefined ? { op: 'cilindro', id } : { op: 'cilindro', id, tampa };
    passos.push(['parte', { nome, sel: { origem } }]);
  }
}

export function gerarPassos(params = P) {
  const cfg = { ...P, ...params };
  const { roda, cubo, quadro: q, garfo, direcao: dir, selim, transmissao: tr } = cfg;
  const passos = [];
  let proximoId = 0;
  const novoId = () => (proximoId += 1);

  /* ---- pontos do quadro, todos derivados de PARAMS ---------------------- */
  const zTraseiro = -q.entreEixos / 2;
  const zDianteiro = q.entreEixos / 2;
  const eixoTraseiro = [0, q.alturaEixo, zTraseiro];
  const eixoDianteiro = [0, q.alturaEixo, zDianteiro];
  const movimentoCentral = [0, q.alturaMovimentoCentral, zTraseiro + q.entreEixos * q.fracaoMovimentoCentral];
  const topoSelim = [0, q.alturaTopoSelim, movimentoCentral[2] - q.recuoTopoSelim];

  const topoDoPneu = q.alturaEixo + roda.raioExterno;
  const direcaoBase = [0, topoDoPneu + q.folgaSobrePneu, zDianteiro - q.recuoDirecao];
  const direcaoTopo = [
    0,
    direcaoBase[1] + q.comprimentoTuboDirecao,
    direcaoBase[2] - q.inclinacaoDirecao,
  ];

  /* ---- rodas ------------------------------------------------------------ */
  const montarRoda = (nome, centro) => {
    const anel = (origemId, rInterno, rExterno, meiaLargura) => {
      passos.push(['lathe', {
        origemId, lados: 32, eixo: 'x', em: centro,
        perfil: [
          [rInterno, -meiaLargura], [rExterno, -meiaLargura],
          [rExterno, meiaLargura], [rInterno, meiaLargura],
          [rInterno, -meiaLargura],
        ],
      }]);
    };

    const idPneu = novoId();
    anel(idPneu, roda.raioAro, roda.raioExterno, roda.larguraPneu / 2);
    passos.push(['parte', { nome: `${nome}Pneu`, sel: { origem: { op: 'lathe', id: idPneu } } }]);

    const idAro = novoId();
    anel(idAro, roda.raioAro - roda.alturaAro, roda.raioAro, roda.larguraAro / 2);
    passos.push(['parte', { nome: `${nome}Aro`, sel: { origem: { op: 'lathe', id: idAro } } }]);

    const idCubo = novoId();
    passos.push(['cilindro', {
      origemId: idCubo, raio: cubo.raio, altura: cubo.largura, lados: 12, eixo: 'x',
      em: [centro[0] - cubo.largura / 2, centro[1], centro[2]],
    }]);
    nomearCilindro(passos, `${nome}Cubo`, idCubo);

    /* Um raio autorado no topo, e o leque por repetição radial em torno do eixo
       da roda. `arranja` mantém a identidade da cópia pelo gerador citado, não
       pela posição no array. */
    const idRaio = novoId();
    const comprimentoRaio = roda.raioAro - roda.alturaAro - cubo.raio;
    passos.push(['cubo', {
      origemId: idRaio,
      larg: roda.meiaSecaoRaio * 2, alt: comprimentoRaio, prof: roda.meiaSecaoRaio * 2,
      em: [centro[0], centro[1] + cubo.raio, centro[2]],
    }]);
    const idLeque = novoId();
    passos.push(['arranja', {
      origemId: idLeque,
      derivaDe: { op: 'cubo', id: idRaio },
      sel: { origem: { op: 'cubo', id: idRaio } },
      modo: 'radial', eixo: 'x', pivo: centro, total: roda.raios, volta: 360,
    }]);
    passos.push(['parte', { nome: `${nome}Raios`, sel: { origem: { op: 'cubo', id: idRaio } } }]);
    passos.push(['parte', {
      nome: `${nome}Raios`,
      sel: { origem: { op: 'arranja', id: idLeque, de: { op: 'cubo', id: idRaio } } },
    }]);
  };

  montarRoda('rodaTraseira', eixoTraseiro);
  montarRoda('rodaDianteira', eixoDianteiro);

  /* ---- quadro ----------------------------------------------------------- */
  const tuboNomeado = (nome, a, b, raio, lados) => {
    const id = novoId();
    tuboEntre(passos, id, a, b, raio, lados);
    nomearCilindro(passos, nome, id);
    return id;
  };

  /* Par lateral. `espelha` copiaria a seleção, e seleção de cilindro por
     `origem` traz só a casca lateral: as cópias sairiam sem tampa. Os dois
     lados são autorados aqui, com o sinal de X como única diferença — a
     economia de erro do espelho continua valendo, porque existe UMA chamada. */
  const parLateral = (nome, a, b, raio, meiaBitola) => {
    for (const lado of [1, -1]) {
      tuboNomeado(
        nome,
        [a[0] + meiaBitola * lado, a[1], a[2]],
        [b[0] + meiaBitola * lado, b[1], b[2]],
        raio,
      );
    }
  };

  tuboNomeado('tuboDirecao', direcaoBase, direcaoTopo, q.raioTuboGrosso * 1.2);
  tuboNomeado('tuboSelim', movimentoCentral, topoSelim, q.raioTuboGrosso);
  tuboNomeado('tuboInferior', movimentoCentral, direcaoBase, q.raioTuboGrosso);

  /* O par que substitui o tubo superior do quadro diamante: desce da direção
     até a base do tubo do selim, deixando a passagem aberta no meio. */
  const encontroAberto = [0, movimentoCentral[1] + 0.075, movimentoCentral[2] - 0.012];
  parLateral('tuboAberto', direcaoTopo, encontroAberto, q.raioTuboAberto, q.meiaBitolaAberta);

  parLateral('bainha', movimentoCentral, eixoTraseiro, q.raioTuboFino, q.meiaBitolaTraseira);
  parLateral('tirante', topoSelim, eixoTraseiro, q.raioTuboFino, q.meiaBitolaTraseira);

  /* ---- direção, garfo e guidão ------------------------------------------ */
  parLateral('garfo', direcaoBase, eixoDianteiro, garfo.raioLamina, garfo.meiaBitola);

  const topoMesa = [0, direcaoTopo[1] + dir.alturaMesa, direcaoTopo[2]];
  const pontaMesa = [0, topoMesa[1], topoMesa[2] - dir.recuoMesa];
  tuboNomeado('mesa', direcaoTopo, pontaMesa, dir.raioMesa);

  const idGuidao = novoId();
  passos.push(['cilindro', {
    origemId: idGuidao, raio: dir.raioGuidao, altura: dir.larguraGuidao, lados: LADOS_TUBO, eixo: 'x',
    em: [-dir.larguraGuidao / 2, pontaMesa[1], pontaMesa[2]],
  }]);
  nomearCilindro(passos, 'guidao', idGuidao);

  for (const lado of [1, -1]) {
    const idManopla = novoId();
    const x = lado === 1
      ? dir.larguraGuidao / 2 - dir.comprimentoManopla
      : -dir.larguraGuidao / 2;
    passos.push(['cilindro', {
      origemId: idManopla, raio: dir.raioManopla, altura: dir.comprimentoManopla,
      lados: LADOS_TUBO, eixo: 'x',
      em: [x, pontaMesa[1], pontaMesa[2]],
    }]);
    nomearCilindro(passos, 'manopla', idManopla);
  }

  /* ---- selim ------------------------------------------------------------ */
  const topoCanote = [0, topoSelim[1] + selim.alturaCanote, topoSelim[2]];
  tuboNomeado('canote', topoSelim, topoCanote, selim.raioCanote);

  const idSelim = novoId();
  passos.push(['chamferBox', {
    origemId: idSelim,
    larg: selim.largura, alt: selim.espessura, prof: selim.comprimento,
    chanfro: selim.chanfro,
    em: [0, topoCanote[1] - selim.espessura / 2, topoCanote[2] - selim.comprimento * 0.18],
  }]);
  passos.push(['parte', { nome: 'selim', sel: { origem: { op: 'chamferBox', id: idSelim } } }]);

  /* ---- transmissão ------------------------------------------------------ */
  const idCoroa = novoId();
  passos.push(['cilindro', {
    origemId: idCoroa, raio: tr.raioCoroa, altura: tr.espessuraCoroa, lados: 32, eixo: 'x',
    em: [tr.afastamentoCoroa, movimentoCentral[1], movimentoCentral[2]],
  }]);
  nomearCilindro(passos, 'coroa', idCoroa);

  /* Pedivelas opostos: o direito à frente e para baixo, o esquerdo atrás e para
     cima — a pose que mostra manivela única girando, e não dois braços soltos. */
  const montarPedivela = (nome, lado, sentido) => {
    const x = tr.afastamentoPedivela * lado;
    const base = [x, movimentoCentral[1], movimentoCentral[2]];
    const ponta = [
      x,
      movimentoCentral[1] - tr.comprimentoPedivela * sentido * 0.86,
      movimentoCentral[2] + tr.comprimentoPedivela * sentido * 0.51,
    ];
    tuboNomeado(`${nome}Braco`, base, ponta, tr.raioPedivela, 8);

    const idPedal = novoId();
    passos.push(['cubo', {
      origemId: idPedal,
      larg: tr.pedal[0], alt: tr.pedal[1], prof: tr.pedal[2],
      em: [x + 0.022 * lado, ponta[1] - tr.pedal[1] / 2, ponta[2]],
    }]);
    passos.push(['parte', { nome: `${nome}Pedal`, sel: { origem: { op: 'cubo', id: idPedal } } }]);
  };

  montarPedivela('pedivelaDireito', 1, 1);
  montarPedivela('pedivelaEsquerdo', -1, -1);

  /* ---- materiais --------------------------------------------------------
     `sel.grupo` recebe UM nome de parte, não uma lista: um passo por parte. */
  const materialPorParte = {
    borracha: ['rodaDianteiraPneu', 'rodaTraseiraPneu', 'manopla', 'pedivelaDireitoPedal', 'pedivelaEsquerdoPedal'],
    couro: ['selim'],
    acoPolido: [
      'rodaDianteiraAro', 'rodaTraseiraAro', 'rodaDianteiraRaios', 'rodaTraseiraRaios',
      'rodaDianteiraCubo', 'rodaTraseiraCubo', 'guidao', 'coroa', 'canote', 'mesa',
      'pedivelaDireitoBraco', 'pedivelaEsquerdoBraco',
    ],
    pinturaQuadro: [
      'tuboDirecao', 'tuboSelim', 'tuboInferior', 'tuboAberto',
      'bainha', 'tirante', 'garfo',
    ],
  };
  for (const [usa, partes] of Object.entries(materialPorParte)) {
    for (const grupo of partes) passos.push(['material', { usa, sel: { grupo } }]);
  }

  return passos;
}

export const receitaBicicletaProva = {
  meta: {
    nome: 'Bicicleta de Passeio Aro 26 (quadro aberto)',
    versao: '1.0.0',
    autor: 'Mecanifica Procedural AI',
    categoria: 'veiculos',
  },

  PARAMS: P,

  TOPO: {
    quadroAberto: 'sem tubo superior reto; um par de tubos desce da direção à base do tubo do selim',
    tuboEntreDoisPontos: 'cilindro em Y decomposto em rotação z (polar) e y (azimute); ver tuboEntre()',
    bilateralidade: 'tuboAberto, bainha, tirante e garfo autorados como par com o sinal de X invertido',
    anelPorRevolucao: 'pneu e aro são lathe de perfil retangular em torno de X; cilindro seria maciço',
    apoio: 'as duas rodas tocam y = 0; o chão é o plano de apoio',
  },

  MATERIAIS: {
    borracha: { cor: '#1b1b1e', metalicidade: 0.0, aspereza: 0.92 },
    acoPolido: { cor: '#d5d9de', metalicidade: 0.92, aspereza: 0.18 },
    pinturaQuadro: { cor: '#8c2f39', metalicidade: 0.30, aspereza: 0.38 },
    couro: { cor: '#43301f', metalicidade: 0.0, aspereza: 0.72 },
  },

  formas: {
    rodaDianteiraPneu: 'anel',
    rodaTraseiraPneu: 'anel',
    rodaDianteiraAro: 'anel',
    rodaTraseiraAro: 'anel',
    selim: 'solido',
  },

  contatos: [
    { par: ['bainha', 'rodaTraseiraCubo'], motivo: 'a ponteira da bainha abraca o eixo traseiro; e onde a roda e presa ao quadro' },
    { par: ['bainha', 'tirante'], motivo: 'bainha e tirante se encontram na mesma ponteira traseira e formam o triangulo' },
    { par: ['rodaTraseiraCubo', 'tirante'], motivo: 'o tirante desce ate o mesmo eixo traseiro que a bainha segura' },
    { par: ['garfo', 'rodaDianteiraCubo'], motivo: 'a ponteira do garfo abraca o eixo dianteiro; e a fixacao da roda da frente' },
    { par: ['tuboDirecao', 'tuboInferior'], motivo: 'o tubo inferior e soldado na base do tubo de direcao; a junta e o quadro' },
    { par: ['tuboAberto', 'tuboDirecao'], motivo: 'o par de tubos abertos nasce no topo do tubo de direcao, soldado nele' },
    { par: ['tuboAberto', 'tuboSelim'], motivo: 'o par de tubos abertos morre na base do tubo do selim, fechando o quadro' },
    { par: ['tuboInferior', 'tuboSelim'], motivo: 'ambos chegam ao movimento central e se encontram nessa junta soldada' },
    { par: ['mesa', 'tuboDirecao'], motivo: 'a mesa entra no tubo de direcao pela caixa; encaixe telescopico intencional' },
    { par: ['guidao', 'mesa'], motivo: 'o guidao e preso pela garra da mesa e por isso atravessa o volume dela' },
    { par: ['guidao', 'manopla'], motivo: 'a manopla e calcada sobre a ponta do guidao, envolvendo-o por fora' },
    { par: ['canote', 'tuboSelim'], motivo: 'o canote desliza dentro do tubo do selim; e a regulagem de altura' },
    { par: ['canote', 'selim'], motivo: 'o selim e fixado no topo do canote pelo grampo, apoiado sobre ele' },
    { par: ['coroa', 'pedivelaDireitoBraco'], motivo: 'a coroa e parafusada nas garras do pedivela direito e gira solidaria a ele' },
    { par: ['pedivelaDireitoBraco', 'pedivelaDireitoPedal'], motivo: 'o pedal e rosqueado na ponta do braco do pedivela direito' },
    { par: ['pedivelaEsquerdoBraco', 'pedivelaEsquerdoPedal'], motivo: 'o pedal e rosqueado na ponta do braco do pedivela esquerdo' },
    { par: ['rodaDianteiraAro', 'rodaDianteiraPneu'], motivo: 'o pneu assenta sobre o aro dianteiro; e o encaixe do talao no aro' },
    { par: ['rodaTraseiraAro', 'rodaTraseiraPneu'], motivo: 'o pneu assenta sobre o aro traseiro; e o encaixe do talao no aro' },
    { par: ['rodaDianteiraAro', 'rodaDianteiraRaios'], motivo: 'cada raio e niplado no aro dianteiro e por isso encosta nele' },
    { par: ['rodaTraseiraAro', 'rodaTraseiraRaios'], motivo: 'cada raio e niplado no aro traseiro e por isso encosta nele' },
    { par: ['rodaDianteiraCubo', 'rodaDianteiraRaios'], motivo: 'os raios saem do flange do cubo dianteiro, que e onde eles nascem' },
    { par: ['rodaTraseiraCubo', 'rodaTraseiraRaios'], motivo: 'os raios saem do flange do cubo traseiro, que e onde eles nascem' },
  ],

  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receitaBicicletaProva;
