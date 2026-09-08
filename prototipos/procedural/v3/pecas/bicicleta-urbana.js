/* bicicleta-urbana.js — bicicleta urbana de quadro diamante, aro 700c.
 *
 * Exemplo de autoria, não referência de engenharia de ciclismo.
 *
 * POR QUE ESTA PEÇA EXISTE. O acervo tinha marcenaria (caixas em ângulo),
 * arma (seção variando ao longo do comprimento) e prensa (blocos ortogonais).
 * Faltava a forma que é feita quase inteira de TUBO ENTRE DOIS PONTOS em
 * direções arbitrárias — que é o que um quadro de bicicleta é. Nenhuma das
 * três exercitava isso, e a diferença não é de tema: é de vocabulário.
 *
 * O QUE ELA COBRA DO MOTOR, e não estava coberto:
 *   - um tubo de A até B, com A e B fora dos eixos. `cilindro` nasce preso a
 *     Y e `rotaciona` só aceita 'x'|'y'|'z', então cada tubo custa quatro
 *     passos e uma decomposição em duas rotações. Está em `tubo()` abaixo;
 *   - repetição radial (raios da roda), que `arranja` resolve;
 *   - bilateralidade parcial: bainhas, tirantes e garfo são espelhados; o
 *     resto do quadro mora no plano central.
 *
 * CONVENÇÃO DE EIXOS, medida e não suposta: +X é a lateral direita, +Y é para
 * cima, +Z é a frente da bicicleta. A roda dianteira está em +Z.
 *
 * CONVENÇÃO DE `em`, medida antes de escrever: no `cilindro`, `em` põe a BASE
 * no ponto dado e centra os outros dois eixos — um cilindro `eixo:'y'` com
 * `em:[0,0,0]` ocupa de y=0 a y=altura. Supor centro nos três eixos põe metade
 * de cada tubo do lado errado da junta.
 *
 * ECONOMIA DECLARADA. Doze lados no tubo e dezesseis no aro: o tubo é visto de
 * lado e sua silhueta é uma reta, o aro é visto de frente e a dele é um
 * círculo protagonista. Raio é cilindro de seis lados porque na escala em que
 * aparece a seção não chega a um pixel.
 */

const P = {
  /* Aro 700c com pneu urbano de 35 mm: diâmetro externo 0,70 m. */
  roda: { raioExterno: 0.350, raioAro: 0.311, larguraPneu: 0.035, larguraAro: 0.022, alturaAro: 0.020, raios: 16, raioDoRaio: 0.0011 },
  cubo: { raio: 0.022, largura: 0.100 },

  /* Geometria de quadro urbano tamanho M, em metros. Entre-eixos 1,05 é o que
     dá estabilidade sem virar bicicleta de carga. */
  quadro: {
    entreEixos: 1.05,
    alturaEixo: 0.350,
    alturaMovimentoCentral: 0.270,
    recuoMovimentoCentral: 0.06,
    /* ALTURA DA DIREÇÃO, medida contra a roda e não escolhida por gosto.
       A primeira versão pôs a base da direção em 0,560 — ABAIXO do topo da roda
       dianteira, que fica em 0,700 (eixo 0,350 + raio 0,350). O resultado é que
       tubo de direção e tubo inferior atravessavam aro, pneu e raios, e o
       `descrever` acusou `rodaDianteiraAro ↔ tuboDirecao interpenetra` desde a
       primeira medição. A base da coroa do garfo precisa passar POR CIMA da
       roda: 0,735 deixa 35 mm de folga sobre o pneu, e o comprimento do garfo
       daí até o eixo sai em 0,391 m, que é a medida real de um garfo 700c. */
    alturaSelim: 0.850,
    recuoSelim: 0.10,
    alturaDirecaoTopo: 0.930,
    alturaDirecaoBase: 0.735,
    /* Recuo da direção contra o eixo dianteiro. Não é gosto: com 0,070 o TUBO
       INFERIOR passava a 0,337 do centro da roda, e o pneu tem raio 0,350 —
       raspava 13 mm. Com 0,130 a aproximação mais curta vai a 0,366 e sobram
       16 mm de folga. De quebra o ângulo de direção sai em 71°, que é o de uma
       bicicleta urbana de verdade. */
    avancoDirecao: 0.130,
    raioTuboGrosso: 0.0175,
    raioTuboFino: 0.0110,
    meiaBitolaTraseira: 0.058,
  },

  garfo: { meiaBitola: 0.050, raioLamina: 0.0125 },
  guidao: { largura: 0.560, raio: 0.0115, alturaAcimaDaDirecao: 0.055, recuo: 0.035 },
  mesa: { raio: 0.0135 },
  selim: { comprimento: 0.260, largura: 0.150, espessura: 0.045, raioCanote: 0.0140 },
  transmissao: { raioCoroa: 0.098, espessuraCoroa: 0.004, comprimentoPedivela: 0.170, raioPedivela: 0.010, pedal: [0.090, 0.018, 0.060] },
};

const GRAU = 180 / Math.PI;

/**
 * Tubo cilíndrico de `a` até `b`.
 *
 * O motor não tem "tubo entre dois pontos": `cilindro` nasce em torno de Y com
 * a base na origem, e `rotaciona` só aceita eixo nominal 'x'|'y'|'z'. Então a
 * direção sai de duas rotações compostas, nesta ordem: `z` inclina +Y até o
 * ângulo polar, `y` gira em torno da vertical até o azimute. Depois translada.
 *
 * As fórmulas seguem a regra destrógira do núcleo: girar +Y em torno de Z por
 * `az` dá (−sen az, cos az, 0); girar isso em torno de Y por `ay` dá
 * (−sen az·cos ay, cos az, sen az·sen ay). Igualando à direção desejada saem
 * `az = acos(dy)` e `ay = atan2(dz, −dx)`. Verificado em cinco direções
 * conhecidas antes de a primeira forma existir, comparando o centro da caixa
 * envolvente com o ponto médio de `a` e `b`.
 */
function tubo(passos, id, a, b, raio, lados = 12) {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const comprimento = Math.hypot(d[0], d[1], d[2]);
  const u = d.map((v) => v / comprimento);
  const az = Math.acos(Math.max(-1, Math.min(1, u[1])));
  const ay = Math.abs(Math.sin(az)) < 1e-9 ? 0 : Math.atan2(u[2], -u[0]);
  const sel = { origem: { op: 'cilindro', id } };

  passos.push(['cilindro', { origemId: id, raio, altura: comprimento, lados, em: [0, 0, 0] }]);
  if (Math.abs(az) > 1e-9) passos.push(['rotaciona', { eixo: 'z', graus: az * GRAU, pivo: [0, 0, 0], sel }]);
  if (Math.abs(ay) > 1e-9) passos.push(['rotaciona', { eixo: 'y', graus: ay * GRAU, pivo: [0, 0, 0], sel }]);
  passos.push(['transladar', { d: a, sel }]);
  return sel;
}

/* Nomeia o cilindro INTEIRO. `{op:'cilindro',id}` sozinho pega só as laterais;
   as duas tampas ficam sem parte e aparecem em `facesSemParte`. Medido: 4 faces
   orfas em 2 cilindros na primeira versao desta receita.
   `sel.origem` aceita UMA origem, nao uma lista — uniao pede `ALIASES`. Mas
   `parte` ACUMULA por nome, entao tres chamadas com o mesmo nome custam menos
   que um alias por tubo. Medido: 10 faces numa parte so, 0 sem identidade. */
function nomearCilindro(passos, nome, id, extras = []) {
  for (const origem of [
    { op: 'cilindro', id },
    { op: 'cilindro', id, tampa: 'fundo' },
    { op: 'cilindro', id, tampa: 'topo' },
    ...extras,
  ]) {
    passos.push(['parte', { nome, sel: { origem } }]);
  }
}

export function gerarPassos(params = P) {
  const cfg = { ...P, ...params };
  const { roda, cubo, quadro: q, garfo, guidao, mesa, selim, transmissao: tr } = cfg;
  const passos = [];
  let proximoId = 1;
  const novoId = () => proximoId++;

  /* Pontos do quadro, todos derivados do entre-eixos e da altura de eixo. */
  const zTraseiro = -q.entreEixos / 2;
  const zDianteiro = q.entreEixos / 2;
  const eixoTraseiro = [0, q.alturaEixo, zTraseiro];
  const eixoDianteiro = [0, q.alturaEixo, zDianteiro];
  const movimentoCentral = [0, q.alturaMovimentoCentral, zTraseiro + q.entreEixos * 0.42];
  const topoSelim = [0, q.alturaSelim, movimentoCentral[2] - q.recuoSelim];
  /* A direção recua em relação ao eixo dianteiro: é o que dá o ângulo de
     caster e mantém o quadro fora do círculo da roda. */
  const direcaoTopo = [0, q.alturaDirecaoTopo, zDianteiro - q.avancoDirecao - 0.055];
  const direcaoBase = [0, q.alturaDirecaoBase, zDianteiro - q.avancoDirecao];

  /* ---- rodas ------------------------------------------------------------ */
  const partesDaRoda = (nome, centro) => {
    const idPneu = novoId();
    const idAro = novoId();
    const idCubo = novoId();
    const idRaio = novoId();
    const idLeque = novoId();

    /* Pneu e aro sao ANEIS, e anel se faz com `lathe`, nao com cilindro.
       A primeira versao usou dois cilindros concentricos e a leitura de anel
       foi entregue "pela diferenca de raio na silhueta" — nao existe: o
       cilindro externo e MACICO e engole aro, cubo e raios. A vista lateral
       mostrou dois discos chapados no lugar das rodas, e nenhuma medida
       acusava nada, porque topologia e identidade estavam perfeitas.
       `lathe` revolve um perfil [raio, y] em torno do eixo; com `eixo:'x'` o
       perfil ja nasce no plano da roda. O perfil fecha repetindo o primeiro
       ponto — secao retangular, que e o que um pneu urbano tem de fato. */
    const anel = (origemId, rInterno, rExterno, meiaLargura, lados) => {
      passos.push(['lathe', {
        origemId, lados, eixo: 'x', em: centro,
        perfil: [
          [rInterno, -meiaLargura], [rExterno, -meiaLargura],
          [rExterno, meiaLargura], [rInterno, meiaLargura],
          [rInterno, -meiaLargura],
        ],
      }]);
    };
    anel(idPneu, roda.raioAro, roda.raioExterno, roda.larguraPneu / 2, 32);
    anel(idAro, roda.raioAro - roda.alturaAro, roda.raioAro, roda.larguraAro / 2, 32);
    passos.push(['cilindro', {
      origemId: idCubo, raio: cubo.raio, altura: cubo.largura, lados: 12, eixo: 'x',
      em: [centro[0] - cubo.largura / 2, centro[1], centro[2]],
    }]);

    /* Um raio, autorado no topo, e o leque por repetição radial em torno do
       eixo da roda. `arranja` mantém a identidade da cópia pelo nome do
       gerador, não pela posição. */
    /* O raio e uma CAIXA fina, nao um cilindro, e a razao e de identidade, nao
       de custo: `origem` de um cilindro seleciona so as laterais, entao o
       `arranja` copiava tubos SEM TAMPA e a conferencia de malha acusava
       buraco em cada copia. `origem` de um `cubo` pega a primitiva inteira.
       A 2,2 mm de secao a diferenca de silhueta nao chega a um pixel. */
    const comprimentoRaio = roda.raioAro - cubo.raio;
    passos.push(['cubo', {
      origemId: idRaio,
      larg: roda.raioDoRaio * 2, alt: comprimentoRaio, prof: roda.raioDoRaio * 2,
      em: [centro[0], centro[1] + cubo.raio, centro[2]],
    }]);
    passos.push(['arranja', {
      origemId: idLeque,
      derivaDe: { op: 'cubo', id: idRaio },
      sel: { origem: { op: 'cubo', id: idRaio } },
      modo: 'radial',
      eixo: 'x',
      pivo: centro,
      total: roda.raios,
      volta: 360,
    }]);

    passos.push(['parte', { nome: `${nome}Pneu`, sel: { origem: { op: 'lathe', id: idPneu } } }]);
    passos.push(['parte', { nome: `${nome}Aro`, sel: { origem: { op: 'lathe', id: idAro } } }]);
    nomearCilindro(passos, `${nome}Cubo`, idCubo);
    passos.push(['parte', { nome: `${nome}Raios`, sel: { origem: { op: 'cubo', id: idRaio } } }]);
    passos.push(['parte', { nome: `${nome}Raios`, sel: { origem: { op: 'arranja', id: idLeque, de: { op: 'cubo', id: idRaio } } } }]);
    return { idPneu, idAro, idCubo };
  };

  const traseira = partesDaRoda('rodaTraseira', eixoTraseiro);
  const dianteira = partesDaRoda('rodaDianteira', eixoDianteiro);

  /* ---- quadro ----------------------------------------------------------- */
  const tuboNomeado = (nome, a, b, raio, lados) => {
    const id = novoId();
    tubo(passos, id, a, b, raio, lados);
    nomearCilindro(passos, nome, id);
    return id;
  };

  tuboNomeado('tuboSelim', movimentoCentral, topoSelim, q.raioTuboGrosso);
  tuboNomeado('tuboSuperior', topoSelim, direcaoTopo, q.raioTuboGrosso);
  tuboNomeado('tuboInferior', movimentoCentral, direcaoBase, q.raioTuboGrosso);
  tuboNomeado('tuboDirecao', direcaoBase, direcaoTopo, q.raioTuboGrosso * 1.25);

  /* Bainhas, tirantes e garfo sao PARES. `espelha` seria o caminho — foi o
     primeiro tentado — mas ele COPIA a selecao, e selecao de cilindro por
     `origem` traz so as laterais: cada copia saiu tubo sem tampa, e a
     conferencia de malha acusou 72 arestas de casca aberta. Unir lateral e
     tampas num `sel` unico exige `ALIASES`, e alias precisa de id estavel, o
     que brigaria com a numeracao derivada daqui.
     Entao os dois lados sao autorados, com o sinal do X como unica diferenca.
     A economia de ERRO que o espelho daria continua valendo: existe UMA
     chamada no codigo, e nenhum lado pode divergir do outro sem alguem
     reescrever a funcao. */
  const par = (nome, a, b, raio, meio) => {
    for (const lado of [1, -1]) {
      const id = novoId();
      tubo(passos, id, [a[0] + meio * lado, a[1], a[2]], [b[0] + meio * lado, b[1], b[2]], raio);
      nomearCilindro(passos, nome, id);
    }
  };

  par('bainha', movimentoCentral, eixoTraseiro, q.raioTuboFino, q.meiaBitolaTraseira);
  par('tirante', topoSelim, eixoTraseiro, q.raioTuboFino, q.meiaBitolaTraseira);

  /* ---- direção e garfo -------------------------------------------------- */
  par('garfo', direcaoBase, eixoDianteiro, garfo.raioLamina, garfo.meiaBitola);

  const topoMesa = [0, direcaoTopo[1] + guidao.alturaAcimaDaDirecao, direcaoTopo[2]];
  tuboNomeado('mesa', direcaoTopo, [0, topoMesa[1], topoMesa[2] + guidao.recuo], mesa.raio);
  const idGuidao = novoId();
  passos.push(['cilindro', {
    origemId: idGuidao, raio: guidao.raio, altura: guidao.largura, lados: 12, eixo: 'x',
    em: [-guidao.largura / 2, topoMesa[1], topoMesa[2] + guidao.recuo],
  }]);
  nomearCilindro(passos, 'guidao', idGuidao);

  /* ---- selim ------------------------------------------------------------ */
  tuboNomeado('canote', topoSelim, [0, topoSelim[1] + 0.11, topoSelim[2] - 0.012], selim.raioCanote);
  const idSelim = novoId();
  passos.push(['chamferBox', {
    origemId: idSelim,
    larg: selim.largura, alt: selim.espessura, prof: selim.comprimento,
    chanfro: 0.018,
    em: [0, topoSelim[1] + 0.11, topoSelim[2] - 0.012 - selim.comprimento * 0.15],
  }]);
  passos.push(['parte', { nome: 'selim', sel: { origem: { op: 'chamferBox', id: idSelim } } }]);

  /* ---- transmissão ------------------------------------------------------ */
  const idCoroa = novoId();
  passos.push(['cilindro', {
    origemId: idCoroa, raio: tr.raioCoroa, altura: tr.espessuraCoroa, lados: 32, eixo: 'x',
    em: [0.055, movimentoCentral[1], movimentoCentral[2]],
  }]);
  nomearCilindro(passos, 'coroa', idCoroa);

  /* Pedivelas opostos: o direito para a frente e para baixo, o esquerdo para
     trás e para cima — a pose que mostra que a manivela é uma só peça girando,
     e não dois braços independentes. */
  const pedivela = (nome, lado, sentido) => {
    const x = 0.075 * lado;
    const ponta = [
      x,
      movimentoCentral[1] - tr.comprimentoPedivela * sentido * 0.85,
      movimentoCentral[2] + tr.comprimentoPedivela * sentido * 0.52,
    ];
    const id = novoId();
    tubo(passos, id, [x, movimentoCentral[1], movimentoCentral[2]], ponta, tr.raioPedivela, 8);
    nomearCilindro(passos, `${nome}Braco`, id);

    const idPedal = novoId();
    passos.push(['cubo', {
      origemId: idPedal,
      larg: tr.pedal[0], alt: tr.pedal[1], prof: tr.pedal[2],
      em: [x + 0.02 * lado, ponta[1] - tr.pedal[1] / 2, ponta[2]],
    }]);
    passos.push(['parte', { nome: `${nome}Pedal`, sel: { origem: { op: 'cubo', id: idPedal } } }]);
  };

  pedivela('pedivelaDireito', 1, 1);
  pedivela('pedivelaEsquerdo', -1, -1);

  /* ---- materiais -------------------------------------------------------- */
  /* `sel.grupo` recebe UM nome de parte, nao uma lista — um passo por parte.
     Medido: passar array grita "nome de parte precisa ser uma string". */
  const materialPorParte = {
    borracha: ['rodaDianteiraPneu', 'rodaTraseiraPneu'],
    couro: ['selim'],
    acoCromado: [
      'rodaDianteiraAro', 'rodaTraseiraAro', 'rodaDianteiraRaios', 'rodaTraseiraRaios',
      'rodaDianteiraCubo', 'rodaTraseiraCubo', 'guidao', 'coroa', 'canote',
      'pedivelaDireitoBraco', 'pedivelaEsquerdoBraco',
    ],
    pinturaQuadro: [
      'tuboSelim', 'tuboSuperior', 'tuboInferior', 'tuboDirecao',
      'bainha', 'tirante', 'garfo', 'mesa',
      'pedivelaDireitoPedal', 'pedivelaEsquerdoPedal',
    ],
  };
  for (const [usa, partes] of Object.entries(materialPorParte)) {
    for (const grupo of partes) passos.push(['material', { usa, sel: { grupo } }]);
  }

  void traseira; void dianteira;
  return passos;
}

export const receitaBicicletaUrbana = {
  meta: {
    nome: 'Bicicleta Urbana 700c',
    versao: '1.0.0',
    autor: 'Mecanifica Procedural AI',
    categoria: 'veiculos',
  },

  PARAMS: P,

  TOPO: {
    quadroDiamante: 'dois triângulos: frontal fechado por selim/superior/inferior/direção, traseiro por bainha e tirante',
    tuboEntreDoisPontos: 'cilindro em Y decomposto em rotação z (polar) e y (azimute); ver tubo()',
    bilateralidade: 'bainha, tirante e garfo autorados à direita e espelhados em X',
    anelPorConcentricidade: 'pneu e aro são cilindros de raios diferentes; o motor não tem toro nem cilindro vazado',
  },

  MATERIAIS: {
    borracha: { cor: '#1c1c1f', metalicidade: 0.0, aspereza: 0.92 },
    acoCromado: { cor: '#d9dde2', metalicidade: 0.95, aspereza: 0.14 },
    pinturaQuadro: { cor: '#1f6f5c', metalicidade: 0.35, aspereza: 0.35 },
    couro: { cor: '#4a3728', metalicidade: 0.0, aspereza: 0.7 },
  },

  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receitaBicicletaUrbana;
