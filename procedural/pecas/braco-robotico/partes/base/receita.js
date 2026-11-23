/* braco-robotico/base — a base do braço robótico, com a caixa lateral e a placa de controle dentro dela.
 *
 * Primeira etapa da montagem `braco-robotico/montagem.json`. O combinado com a
 * pessoa está em `../../ALINHAMENTO.md`; este arquivo traz o PLANO, a TABELA e
 * os contatos, e os passos são escritos pelo modelador.
 *
 * Direções: Y para cima; a vista frontal da bancada, que olha de +Z, é a vista
 * lateral da foto; o braço alcança para +X e a caixa fica em -X.
 *
 * Porta que a receita publica, porque a etapa seguinte nasce dela:
 *   assento — anel que recebe, eixo +Y, centro no meio do topo do corpo, face
 *             inteira do topo. O `anelCintura` senta aqui.
 *
 * Regra das portas de apoio do braço: quem recebe publica a face inteira,
 * de raio interno zero ao raio da face, numa faixa de 5 mm para dentro da
 * peça; quem se apoia publica só a borda de baixo, uma faixa de 10 mm de
 * largura até o raio dela e 5 mm para dentro dela. A montagem confere que a
 * borda inteira está sobre a face, sem fresta e no mesmo eixo.
 *
 * A caixa lateral é oca e aberta na face de fora por uma janela com moldura, e guarda a placa de controle do braço (fatia 4 do
 * plano `docs/modelar/planos/2026-11-16-familia-componentes-eletronicos.md`): uma placa declarada da família
 * `componente-eletronico`, em pé, paralela à face de fora, com os componentes virados para a janela e presa ao corpo por quatro
 * espaçadores com parafuso. A janela é fechada por uma tampa de vidro fumê leve, de borda chanfrada e presa por quatro parafusos nos cantos, a pedido da pessoa em 2026-11-17 (a tampa incolor não aparecia na imagem). Os componentes seguem o que o braço precisa: um driver de passo em módulo por junta (as seis), com o
 * capacitor do driver e o conector de quatro vias do motor de cada um, o microcontrolador em módulo, o borne da entrada de
 * alimentação com o capacitor de entrada, o regulador de 5 V em TO-220 no dissipador com o capacitor de saída, e o LED de
 * ligado com o resistor dele.
 */
import { placaDeclarada } from '../../../../familias/componente-eletronico/placa.js';
import { MATERIAIS as CORES_DOS_COMPONENTES } from '../../../../familias/componente-eletronico/placa-de-prova.js';
/* o cobre da placa de controle: a cópia do pedido com a lista de redes (exemplo até a mecatrônica escrever a lista real) e o
   traçado que `tools/modelar/tracar-placa.mjs` gravou dela, com a chave das entradas que a placa confere */
import pedidoDaPlaca from './placa.pedido.json' with { type: 'json' };
import tracadoDaPlaca from './placa.tracado.json' with { type: 'json' };

export const TABELA = {
  raioDoCorpo: 105,
  alturaDoCorpo: 200,
  ladoDoPe: 230,
  alturaDoPe: 20,
  saidaDaCaixa: 50,
  larguraDaCaixa: 120,
  /* A caixa termina este tanto abaixo do topo do corpo. */
  caixaAbaixoDoTopo: 10,
  /* Acabamento, escolhido pelo modelador. */
  fileteDoTopo: 12,
  fileteDoPe: 5,
  /* O pé avança este tanto além da face do corpo em -X, por baixo da caixa até o meio dela. */
  avancoDoPe: 25,
  /* Chanfro da quina do topo do corpo; substitui o filete, que abria sulco sob o anel. */
  chanfroDoTopo: 1.5,
  cantoDoPe: 25,
  cantoDaCaixa: 10,
  fileteDaCaixa: 5,
  /* Quanto a caixa entra no corpo para encostar sem fresta na curva dele. */
  entradaDaCaixa: 30,
  /* A tampa do loft é um leque quase plano, 0,4 mm abaixo da face: a caixa
     afunda este tanto no pé para o apoio ser contato de verdade. */
  afundoDaCaixa: 1,
  ladosDoCorpo: 64,
  /* A caixa oca: a parede, e a margem e o canto da janela da face de fora, com a moldura em volta. */
  paredeDaCaixa: 3,
  margemDaJanela: 12,
  cantoDaJanela: 6,
  /* A placa de controle, em pé dentro da caixa: altura (em y) e largura (em z), e a folga da face de trás dela até o corpo, no
     ponto mais próximo (z = 0). */
  alturaDaPlaca: 165,
  larguraDaPlaca: 100,
  folgaDaPlacaAoCorpo: 3.4,
  /* Os furos de fixação, a esta distância das bordas, e os espaçadores e parafusos que prendem a placa ao corpo. */
  furoDaPlacaNaBorda: 5,
  diametroDoFuroDaPlaca: 3.2,
  diametroDoEspacador: 6,
  entradaDoEspacador: 1.5,
  diametroDaCabeca: 5.5,
  alturaDaCabeca: 2.2,
  /* A tampa: o chanfro da aresta de fora e os quatro parafusos dos cantos, a esta distância das bordas da janela (a cabeça é a da
     fixação da placa, e a haste leva 3 mm, o furo da placa menos a folga). */
  chanfroDaTampa: 1.2,
  entradaDoParafusoDaTampa: 3.2,
  diametroDaHasteDaTampa: 3,
};

/* Os componentes da placa de controle, no plano da placa, em mm: x sobe ao longo da altura da placa e z segue a largura, com a
   origem no centro da face de cima; o giro é em torno da normal da placa, como a placa declarada lê. */
const driver = (k, x, z) => ({
  id: `a${k}`, nome: `driver de passo da junta ${k}`, perfil: 'modulo-driver-de-passo', posicao: [x, z],
  materiais: { corpo: 'preto', placa: 'placa-verde', chip: 'preto', terminal: 'estanho' },
});
const capacitorDoDriver = (k, x, z) => ({
  id: `c${k}`, nome: `capacitor do driver da junta ${k}`, perfil: 'eletrolitico-6-3x11', posicao: [x, z],
  materiais: { corpo: 'azul', topo: 'aluminio', marca: 'cinza-claro', terminal: 'estanho' },
});
const conectorDoMotor = (k, x, z) => ({
  id: `j${k}`, nome: `conector do motor da junta ${k}`, perfil: 'barra-1x8', parametros: { viasDaBarra: 4 }, posicao: [x, z],
  materiais: { corpo: 'preto', terminal: 'estanho' },
});
/* As juntas 1, 3 e 5 na coluna de z negativo, as 2, 4 e 6 na de z positivo, de cima para baixo; o capacitor de cada driver fica
   do lado do microcontrolador e o conector do motor na borda. */
const LINHAS_DOS_DRIVERS = [62, 32, 2];
const COLUNAS = { driver: 33, capacitor: 20.5, conector: 46 };
export const COMPONENTES_DA_PLACA = [
  ...[1, 2, 3, 4, 5, 6].flatMap((k) => {
    const x = LINHAS_DOS_DRIVERS[Math.floor((k - 1) / 2)];
    const s = k % 2 ? -1 : 1;
    return [driver(k, x, s * COLUNAS.driver), capacitorDoDriver(k, x, s * COLUNAS.capacitor), conectorDoMotor(k, x, s * COLUNAS.conector)];
  }),
  {
    id: 'u1', nome: 'microcontrolador', perfil: 'modulo-microcontrolador', posicao: [30, 0],
    materiais: { corpo: 'preto', placa: 'placa-preta', chip: 'aluminio', terminal: 'estanho' },
  },
  {
    id: 'j7', nome: 'entrada de alimentação', perfil: 'borne-2-vias', posicao: [-74, 25], giro: -90,
    materiais: { corpo: 'azul-borne', parafuso: 'aluminio', terminal: 'estanho' },
  },
  {
    id: 'c7', nome: 'capacitor de entrada da alimentação', perfil: 'eletrolitico-6-3x11',
    parametros: { diametroDoCapacitor: 10, alturaDoCapacitor: 16, passoDoCapacitor: 5 }, posicao: [-45, 8],
    materiais: { corpo: 'azul', topo: 'aluminio', marca: 'cinza-claro', terminal: 'estanho' },
  },
  {
    id: 'u2', nome: 'regulador de 5 V', perfil: 'to-220-no-dissipador', posicao: [-45, -22], materiais: { corpo: 'preto', aba: 'aluminio', terminal: 'estanho' },
    encostaEm: [{ peca: 'hs1', motivo: 'as costas da aba do regulador encostam na face de montagem do dissipador, com o furo da aba no furo dele' }],
  },
  { id: 'hs1', nome: 'dissipador do regulador', perfil: 'dissipador-to-220', posicao: [-45, -22], materiais: { corpo: 'anodizado', terminal: 'estanho' } },
  { id: 'c8', nome: 'capacitor de saída do regulador', perfil: 'ceramico-disco-5', posicao: [-45, -12], materiais: { corpo: 'ceramica', terminal: 'estanho' } },
  { id: 'd1', nome: 'LED de ligado', perfil: 'led-3', posicao: [-74, 0], materiais: { corpo: 'verde', terminal: 'estanho' } },
  { id: 'r1', nome: 'resistor do LED', perfil: 'resistor-1-4w', posicao: [-74, -10], materiais: { corpo: 'bege', terminal: 'estanho', faixas: ['marrom', 'preto', 'laranja', 'dourado'] } },
];

const m = (mm) => mm / 1000;
const ID = { corpo: 100, pe: 200, caixa: 300, cavidade: 310, janela: 320, caixaOca: 330, tampa: 340, espacador: 500, cabeca: 520, cabecaDaTampa: 600, hasteDaTampa: 620 };
/* Os ids de origem da placa declarada começam aqui, acima dos da base. */
const BASE_DA_PLACA = 10000;

/* Retângulo de cantos arredondados em [u,w], encolhido `recuo` de cada lado. */
function retangulo(meioU, meioW, canto, recuo) {
  const u = meioU - recuo, w = meioW - recuo, c = Math.max(canto - recuo, 0.0005);
  return [[u, w, c], [-u, w, c], [-u, -w, c], [u, -w, c]];
}

/* Placa de bordas arredondadas: loft vertical de seções retangulares, com a
   quina de cima e de baixo aproximada por seções recuadas num quarto de arco. */
function placa(origemId, centroX, centroZ, y0, y1, meioU, meioW, canto, filete) {
  const secoes = [{ pos: [centroX, y0, centroZ], raio: 0 }];
  /* O ponto do arco no próprio fundo fica de fora: a seção coincidiria com o polo, e o loft
     recusa segmento de comprimento zero. A tampa vira leque quase plano. */
  const arco = [0.3827, 0.7071, 0.9239, 1];
  for (const k of arco) {
    const a = Math.acos(k);
    secoes.push({ pos: [centroX, y0 + filete * (1 - Math.sin(a)), centroZ], contorno: retangulo(meioU, meioW, canto, filete * (1 - Math.cos(a))) });
  }
  for (const k of [...arco].reverse()) {
    const a = Math.acos(k);
    secoes.push({ pos: [centroX, y1 - filete * (1 - Math.sin(a)), centroZ], contorno: retangulo(meioU, meioW, canto, filete * (1 - Math.cos(a))) });
  }
  secoes.push({ pos: [centroX, y1, centroZ], raio: 0 });
  return ['loft', { origemId, secoes, lados: 4 * 9, segmentosCurva: 8, orientacao: [1, 0, 0] }];
}

/* Retângulo de cantos arredondados centrado, como lista de pontos [u, v]: meia largura, meia profundidade e raio do canto. */
function retanguloArredondado(meioU, meioV, canto, n = 6) {
  const pontos = [];
  for (const [cu, cv, a0] of [[meioU - canto, -meioV + canto, -Math.PI / 2], [meioU - canto, meioV - canto, 0], [-meioU + canto, meioV - canto, Math.PI / 2], [-meioU + canto, -meioV + canto, Math.PI]]) {
    for (let k = 0; k <= n; k += 1) {
      const a = a0 + (Math.PI / 2) * (k / n);
      pontos.push([cu + canto * Math.cos(a), cv + canto * Math.sin(a)]);
    }
  }
  return pontos;
}

export function derivar(t = TABELA) {
  const R = m(t.raioDoCorpo);
  const yPe = m(t.alturaDoPe);
  const yTopo = yPe + m(t.alturaDoCorpo);
  const xFora = -(R + m(t.saidaDaCaixa));
  const xDentro = -(R - m(t.entradaDaCaixa));
  return {
    R, yPe, yTopo,
    meioPe: m(t.ladoDoPe) / 2,
    pe: {
      centroX: (m(t.ladoDoPe) / 2 - (R + m(t.avancoDoPe))) / 2,
      meioU: (m(t.ladoDoPe) / 2 + R + m(t.avancoDoPe)) / 2,
    },
    caixa: {
      centroX: (xFora + xDentro) / 2,
      meioU: (xDentro - xFora) / 2,
      meioW: m(t.larguraDaCaixa) / 2,
      y0: yPe - m(t.afundoDaCaixa),
      y1: yTopo - m(t.caixaAbaixoDoTopo),
      xFora,
    },
  };
}

/* A placa de controle, como a família lê (em mm). Ela fica em pé, com a face de cima virada para -X, a janela: a rotação de +90
   graus em z leva a normal +y da placa para -x e o x da placa para +y, e deixa o z; a origem dela, o centro da face de cima, fica
   no meio da altura de dentro da caixa, com a face de trás a `folgaDaPlacaAoCorpo` do corpo. */
export function declaracaoDaPlaca(t = TABELA) {
  const C = derivar(t).caixa;
  const espessura = 1.6;
  const meioX = t.alturaDaPlaca / 2 - t.furoDaPlacaNaBorda, meioZ = t.larguraDaPlaca / 2 - t.furoDaPlacaNaBorda;
  return {
    id: 'placa', pai: 'caixaLateral',
    contorno: { retangulo: { largura: t.alturaDaPlaca, profundidade: t.larguraDaPlaca, cantos: 3 } },
    espessura,
    furos: [[meioX, meioZ], [-meioX, meioZ], [-meioX, -meioZ], [meioX, -meioZ]].map((centro) => ({ centro, diametro: t.diametroDoFuroDaPlaca })),
    pecas: COMPONENTES_DA_PLACA,
    pose: { rotacoes: [{ eixo: 'z', graus: 90 }], posicao: [-(t.raioDoCorpo + t.folgaDaPlacaAoCorpo + espessura), ((C.y0 + C.y1) / 2) * 1000, 0] },
    cobre: { tracado: tracadoDaPlaca, redes: pedidoDaPlaca.itens.find((i) => i.tipo === 'ligacoes').redes },
  };
}

let gerada = null;
/** A placa de controle gerada pela placa declarada, guardada pela declaração: a mesma tabela não gera duas vezes. */
export function placaDeControle(t = TABELA) {
  const declaracao = declaracaoDaPlaca(t);
  const chave = JSON.stringify(declaracao);
  if (gerada?.chave !== chave) gerada = { chave, declaracao, ...placaDeclarada(declaracao, { base: BASE_DA_PLACA }) };
  return gerada;
}

export function gerarPassos(t = TABELA) {
  const P = derivar(t);
  const passos = [];
  passos.push(['lathe', {
    origemId: ID.corpo, lados: t.ladosDoCorpo, segmentosCurva: 8,
    perfil: [[0, P.yPe], [P.R, P.yPe], [P.R, P.yTopo - m(t.chanfroDoTopo)], [P.R - m(t.chanfroDoTopo), P.yTopo], [0, P.yTopo]],
  }]);
  passos.push(['parte', { nome: 'corpo', sel: { origem: { op: 'lathe', id: ID.corpo } } }]);
  passos.push(placa(ID.pe, P.pe.centroX, 0, 0, P.yPe, P.pe.meioU, P.meioPe, m(t.cantoDoPe), m(t.fileteDoPe)));
  passos.push(['parte', { nome: 'pe', sel: { origem: { op: 'loft', id: ID.pe } } }]);
  const C = P.caixa;
  const e = m(t.paredeDaCaixa);
  passos.push(placa(ID.caixa, C.centroX, 0, C.y0, C.y1, C.meioU, C.meioW, m(t.cantoDaCaixa), m(t.fileteDaCaixa)));
  /* O oco: a mesma caixa recuada a parede de cada lado, com o canto e o filete recuados junto, para a parede ficar com a mesma
     espessura também nas quinas; o fundo do oco fica dentro do corpo, que faz o fundo visível. */
  const xDentroDoOco = C.centroX + C.meioU - e, xForaDoOco = C.xFora + e;
  passos.push(placa(ID.cavidade, (xDentroDoOco + xForaDoOco) / 2, 0, C.y0 + e, C.y1 - e, (xDentroDoOco - xForaDoOco) / 2, C.meioW - e,
    m(t.cantoDaCaixa - t.paredeDaCaixa), m(Math.max(t.fileteDaCaixa - t.paredeDaCaixa, 1))));
  /* A janela na face de fora, dentro da parte plana dela: a moldura fica com a margem da janela até a borda da caixa. A extrusão
     nasce em y e a rotação de -90 graus em z a deita em +x. */
  const alturaDaJanela = C.y1 - C.y0 - 2 * m(t.margemDaJanela);
  const larguraDaJanela = 2 * (C.meioW - m(t.margemDaJanela));
  const janela = { origem: { op: 'extrusao', id: ID.janela } };
  passos.push(['extrusao', { origemId: ID.janela, perfil: retanguloArredondado(alturaDaJanela / 2, larguraDaJanela / 2, m(t.cantoDaJanela)), altura: 4 * e }]);
  passos.push(['rotaciona', { eixo: 'z', graus: -90, pivo: [0, 0, 0], sel: janela }]);
  passos.push(['transladar', { d: [C.xFora - 2 * e, (C.y0 + C.y1) / 2, 0], sel: janela }]);
  passos.push(['subtrair', { origemId: ID.caixaOca, solidos: [{ origem: { op: 'loft', id: ID.caixa } }, { origem: { op: 'loft', id: ID.cavidade } }, janela] }]);
  passos.push(['parte', { nome: 'caixaLateral', sel: { origem: { op: 'subtrair', id: ID.caixaOca } } }]);
  /* A tampa transparente: o mesmo contorno da janela, na espessura da parede, assentada na moldura e rente à face de fora; a borda
     dela encosta na borda da janela em volta toda, e a placa e os componentes ficam 12 mm ou mais atrás da face de dentro dela. */
  const tampa = { origem: { op: 'loft', id: ID.tampa } };
  /* A tampa é um loft ao longo de x: a face de fora recuada o chanfro de cada lado, e a aresta de fora corta em 45 graus para pegar a luz. */
  const chanfro = m(t.chanfroDaTampa);
  const secaoDaTampa = (x, recuo) => ({ pos: [x, (C.y0 + C.y1) / 2, 0], contorno: retangulo(alturaDaJanela / 2, larguraDaJanela / 2, m(t.cantoDaJanela), recuo) });
  /* Os polos das pontas fecham a malha: um leque de 0,2 mm de flecha em cada face, sem efeito na imagem. */
  const polo = (x) => ({ pos: [x, (C.y0 + C.y1) / 2, 0], raio: 0 });
  passos.push(['loft', { origemId: ID.tampa, secoes: [polo(C.xFora - 0.0002), secaoDaTampa(C.xFora, chanfro), secaoDaTampa(C.xFora + chanfro, 0), secaoDaTampa(C.xFora + e, 0), polo(C.xFora + e + 0.0002)], lados: 4 * 9, segmentosCurva: 8, orientacao: [0, 1, 0] }]);
  passos.push(['parte', { nome: 'tampaDaCaixa', material: 'vidroFume', pai: 'caixaLateral', sel: tampa }]);
  /* Os quatro parafusos dos cantos: a cabeça assentada na face de fora da tampa e a haste furando a tampa até a face de dentro. */
  const raioDaHaste = m(t.diametroDaHasteDaTampa) / 2, hCabeca = m(t.alturaDaCabeca), rCabeca = m(t.diametroDaCabeca) / 2;
  const uCanto = alturaDaJanela / 2 - m(t.entradaDoParafusoDaTampa), wCanto = larguraDaJanela / 2 - m(t.entradaDoParafusoDaTampa);
  [[1, 1], [1, -1], [-1, -1], [-1, 1]].forEach(([su, sw], k) => {
    const em = [C.xFora, (C.y0 + C.y1) / 2 + su * uCanto, sw * wCanto];
    passos.push(['lathe', {
      origemId: ID.cabecaDaTampa + k, eixo: 'x', lados: 16, segmentosCurva: 2,
      perfil: [[0, -hCabeca], [rCabeca - m(0.5), -hCabeca], [rCabeca, -hCabeca + m(0.5)], [rCabeca, 0], [0, 0]], em,
    }]);
    passos.push(['lathe', { origemId: ID.hasteDaTampa + k, eixo: 'x', lados: 16, segmentosCurva: 1, perfil: [[0, 0], [raioDaHaste, 0], [raioDaHaste, e], [0, e]], em }]);
    for (const op of [ID.cabecaDaTampa + k, ID.hasteDaTampa + k]) {
      passos.push(['parte', { nome: 'parafusosDaTampa', material: 'acoEscuro', pai: 'caixaLateral', sel: { origem: { op: 'lathe', id: op } } }]);
    }
  });
  passos.push(['publicarPorta', {
    nome: 'assento', de: { op: 'lathe', id: ID.corpo, faixa: 3 },
    interface: {
      forma: 'anel', papel: 'recebe', eixo: [0, 1, 0], centro: [0, P.yTopo, 0],
      raioInterno: 0, raioExterno: P.R, inicio: -0.005, fim: 0,
    },
  }]);
  /* Com ângulo: a tampa de baixo e a lateral do corpo se encontram numa quina viva, e a média sem ângulo deixava o disco grande da tampa
     puxar a sombra da lateral para baixo (a lateral escurecia em direção ao pé com o peso pelo ângulo do canto). */
  passos.push(['liso', { angulo: 40, sel: { origem: { op: 'lathe', id: ID.corpo } } }]);
  /* O pé é loft de seções recuadas em arco; sem liso a sombra marca cada seção como degrau. */
  passos.push(['liso', { sel: { origem: { op: 'loft', id: ID.pe } } }]);
  /* A caixa oca: liso até 40 graus, para a borda da janela e as quinas do oco ficarem vivas e o filete de fora continuar liso. */
  passos.push(['liso', { angulo: 40, sel: { origem: { op: 'subtrair', id: ID.caixaOca } } }]);

  /* A placa de controle e o que a prende: um espaçador por furo de fixação, da face de trás da placa até dentro do corpo, e a
     cabeça do parafuso na face de cima. */
  const { declaracao, passos: daPlaca } = placaDeControle(t);
  passos.push(...daPlaca);
  const [xCima, yMeio] = declaracao.pose.posicao.map(m);
  const xTras = xCima + m(declaracao.espessura);
  const raioDoEspacador = m(t.diametroDoEspacador) / 2, raioDaCabeca = m(t.diametroDaCabeca) / 2, h = m(t.alturaDaCabeca);
  declaracao.furos.forEach(({ centro: [u, v] }, k) => {
    const y = yMeio + m(u), z = m(v);
    /* o espaçador entra no corpo até passar da superfície curva na borda dele mais longe do eixo, mais a entrada */
    const zLonge = Math.abs(z) + raioDoEspacador;
    const comprimento = -Math.sqrt(P.R * P.R - zLonge * zLonge) + m(t.entradaDoEspacador) - xTras;
    passos.push(['lathe', {
      origemId: ID.espacador + k, eixo: 'x', lados: 16, segmentosCurva: 1,
      perfil: [[0, 0], [raioDoEspacador, 0], [raioDoEspacador, comprimento], [0, comprimento]],
      em: [xTras, y, z],
    }]);
    passos.push(['lathe', {
      origemId: ID.cabeca + k, eixo: 'x', lados: 16, segmentosCurva: 2,
      perfil: [[0, -h], [raioDaCabeca - m(0.5), -h], [raioDaCabeca, -h + m(0.5)], [raioDaCabeca, 0], [0, 0]],
      em: [xCima, y, z],
    }]);
    for (const op of [ID.espacador + k, ID.cabeca + k]) {
      passos.push(['parte', { nome: 'fixacaoDaPlaca', material: 'aluminio', pai: 'caixaLateral', sel: { origem: { op: 'lathe', id: op } } }]);
    }
  });
  return passos;
}

const placaPadrao = placaDeControle(TABELA);

const receita = {
  meta: { nome: 'braco-robotico/base', desc: 'base do braço robótico com a caixa lateral aberta e a placa de controle dentro dela' },
  PARAMS: TABELA,
  TOPO: { origem: 'centro do fundo do pé no chão; y para cima, a caixa em -X' },
  /* As cores dos componentes são as das pranchas da família, escolhidas por peça, sem paleta nova. */
  MATERIAIS: {
    ...Object.fromEntries(placaPadrao.materiais.map((nome) => [nome, CORES_DOS_COMPONENTES[nome]])),
    /* a tampa da janela: vidro fumê leve, a pedido da pessoa em 2026-11-17 porque a tampa incolor (opacidade de 0,3) não aparecia. A
       cor é um cinza-azulado claro, o mais próximo da paleta existente: o vidro claro do farol do furgão (`lenteDoFarol` em
       procedural/pecas/furgao-realista/receita.js) escurecido; a opacidade fica em 0,38 para a placa continuar legível. */
    /* os parafusos da tampa: o aço escuro do soquete do farol do furgão (`acoEscuro` em procedural/pecas/furgao-realista/receita.js), a
       pedido da pessoa em 2026-11-17, para os parafusos aparecerem contra o vidro fumê */
    acoEscuro: { tipo: 'metal', acabamento: 'pintado', cor: '#34363b', aspereza: 0.35, metalicidade: 0.85, verniz: 0.5, asperezaDoVerniz: 0.35 },
    vidroFume: { tipo: 'liso', cor: '#8fa3ad', mistura: 'transparente', opacidade: 0.38, aspereza: 0.25, metalicidade: 0 },
  },
  PLANO: {
    objeto: 'base do braço robótico industrial, presa no chão, com uma caixa colada no lado esquerdo que guarda a placa de controle',
    referencias: ['../../referencias/lateral.prancha.png'],
    escala: { medida: 'diâmetro do corpo da base', milimetros: 210 },
    partes: [
      { nome: 'corpo', forma: 'cilindro de revolução em pé, 210 mm de diâmetro e 200 mm de altura; a quina do topo leva só um chanfro pequeno, sem sulco na junção com o anel', tecnica: 'revolução com perfil' },
      { nome: 'pe', forma: 'placa de 20 mm de altura, 230 mm de lado, que avança à esquerda por baixo da caixa até o meio dela; cantos e borda arredondados', tecnica: 'placa com cantos e bordas arredondados' },
      { nome: 'caixaLateral', forma: 'caixa oca de cantos arredondados encostada no corpo em -X, 50 mm de saída, apoiada no pé só onde ele existe, 10 mm mais baixa que o corpo, com parede de 3 mm e uma janela com moldura na face de fora', tecnica: 'caixa com bordas arredondadas menos o oco e a janela' },
      { nome: 'tampaDaCaixa', forma: 'tampa de vidro fumê leve no contorno da janela, de cantos arredondados, com a espessura da parede e a aresta de fora chanfrada em 1,2 mm, assentada na moldura e rente à face de fora da caixa', tecnica: 'loft de seções do contorno da janela' },
      { nome: 'parafusosDaTampa', forma: 'quatro parafusos de cabeça de 5,5 mm nos cantos da tampa, a cabeça na face de fora e a haste de 3 mm furando a tampa', tecnica: 'revolução com perfil' },
      { nome: 'fixacaoDaPlaca', forma: 'quatro espaçadores de 6 mm da face de trás da placa até dentro do corpo e as quatro cabeças de parafuso na face de cima, nos furos de fixação', tecnica: 'revolução com perfil' },
      ...placaPadrao.partesDoPlano.map((p) => (p.nome === 'placa'
        ? { ...p, dePerto: [{ ponto: placaPadrao.pose.posicao, oQue: 'a placa de controle pela janela da caixa, com os drivers, o microcontrolador e a alimentação' }] }
        : p)),
    ],
    criteriosDeReprovacao: [
      'o corpo não é redondo visto de cima',
      'o pé não é quadrado de cantos arredondados visto de cima',
      'sulco visível entre o topo do corpo e o anel, ou quina viva na borda do pé',
      'a caixa solta do corpo, com fresta, ou flutuando acima do pé',
      'a caixa do lado errado: na vista frontal ela fica à esquerda, em -X',
      'a placa de controle tocando a parede da caixa ou o corpo, ou um componente saindo pela janela',
      'a tampa opaca ou incolor a ponto de não se ver, sem parafusos nos cantos, solta da moldura, saindo da face de fora ou tocando a placa ou um componente',
      'um componente atravessando outro, ou fora da face da placa',
    ],
  },
  get contatos() {
    return [
      { par: ['corpo', 'pe'], motivo: 'o corpo nasce no centro do pé' },
      /* embutido de propósito: medido em 2026-11-14 (10,4 mm) com a caixa maciça e em 2026-11-17 (11,2 mm) com a caixa oca */
      { par: ['caixaLateral', 'corpo'], motivo: 'a caixa de face plana entra até 12 mm no corpo redondo para não deixar fresta nas bordas da curva', penetracaoMaxima: 0.012 },
      { par: ['caixaLateral', 'pe'], motivo: 'a caixa se apoia no pé' },
      { par: ['fixacaoDaPlaca', 'placa'], motivo: 'os espaçadores encostam na face de trás da placa e as cabeças dos parafusos na de cima, em volta dos furos de fixação' },
      { par: ['parafusosDaTampa', 'tampaDaCaixa'], motivo: 'a cabeça assenta na face de fora da tampa e a haste a fura de lado a lado', penetracaoMaxima: 0.003 },
      { par: ['parafusosDaTampa', 'caixaLateral'], motivo: 'a cabeça do parafuso do canto assenta também na moldura, rente à face de fora' },
      { par: ['tampaDaCaixa', 'caixaLateral'], motivo: 'a tampa assenta na moldura: a borda dela encosta na borda da janela em volta toda' },
      { par: ['fixacaoDaPlaca', 'corpo'], motivo: 'a ponta de cada espaçador entra no corpo, que é curvo, para assentar inteira nele', penetracaoMaxima: 0.006 },
      ...placaDeControle(this.PARAMS).contatos,
    ];
  },
  get ilhas() { return placaDeControle(this.PARAMS).ilhasDaReceita; },
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
