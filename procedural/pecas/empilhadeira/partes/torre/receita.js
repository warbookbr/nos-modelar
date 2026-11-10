/* empilhadeira/torre — a parte fixa da torre da empilhadeira: os dois canais externos em U, abertos para dentro, com as três travessas
 * de trás e a orelha do cilindro de inclinação, e os dois pés com o olhal que abraça o tubo do eixo dianteiro, numa peça rígida.
 *
 * Etapa da montagem `../../montagem.json` depois do eixo traseiro (fatia 4 do plano `docs/modelar/planos/encerrados/2026-11-09-empilhadeira.md`,
 * item 4 das partes do `../../ALINHAMENTO.md`, primeira metade). A forma é a do rascunho que a pessoa aprovou por imagem em
 * 2026-11-10 (`../../referencias/torre-garfos.esboco.mjs`), levada para cá sem mudança de medida; o rascunho passou a chamar
 * `montarTorre` daqui, de modo que a geometria tem uma fonte só. Mudaram três coisas de construção: os círculos do olhal com 96 lados
 * no lugar de 40; cada pé feito do seu lado, sem espelho, porque a porta publicada de uma origem espelhada resolve o centro do lado
 * errado (atrito do eixo traseiro); e o assento do cilindro de elevação, um disco de Ø 60 e 10 mm dentro da travessa de baixo, rente
 * à face de cima dela, que não aparece e dá à porta `assentoDoCilindro` uma face do tamanho do pé do cilindro (a face de cima da
 * travessa inteira vai a 320 mm do centro do assento, e a porta de anel confere o raio pela face).
 *
 * DE ONDE VEM CADA MEDIDA (do rascunho, que as tirou das vistas; as contas de cada número estão no cabeçalho dele). A altura de 2.100
 * é a da TABELA do alinhamento (a lateral dá 2.085); a face da frente dos canais em z 372 (lateral 364 a 379, carcaca-lado 370); a
 * largura externa de 620, por dentro da aba do paralama da carcaça (x 327), que a vista de cima e a de frente cercam (706 e 555); o
 * fundo de z 100 a 372, com a face de trás encostada nas chapas do chassi, que vão até z 100. O pé fica por dentro das chapas do
 * chassi (x 266 a 327), de 215 a 262 mm (o trecho `apoioDaTorre` do eixo dianteiro), com o olhal de raio 95 e o furo de raio 77 no
 * tubo de raio 75 do eixo (2 mm de folga), e a chapa dele desce à frente até a travessa de baixo (o pé de trás da carcaca-lado). A
 * orelha do cilindro de inclinação é a cabeça em C da carcaca-lado reduzida ao bloco que segura o pino, em x 310 a 400, y 830 a 890.
 *
 * O ENCAIXE. A origem é a da máquina: o chão sob o centro do eixo dianteiro, no meio da largura; y para cima, +x à esquerda de quem
 * dirige e a frente em +z; o centro do eixo dianteiro fica em y 352,5 e z 0 (`rodas.dianteira` da carcaça). A montagem põe a torre no
 * eixo pela porta `olhalDireito` (o furo do olhal direito, no pino `pinoDaTorreDireito` do eixo), e a relação de cada lado mede o furo
 * no tubo pelo encaixe cilíndrico. A torre publica também a guia do canal interno (`guiaDoCanalInterno`, a face de dentro da alma do
 * canal externo esquerdo), o assento do cilindro de elevação (`assentoDoCilindro`) e a face de trás de cada orelha (`orelhaEsquerda` e
 * `orelhaDireita`), onde a ponta da haste do cilindro de inclinação encosta; as portas das orelhas não mudam a malha.
 *
 * A JUNTA QUE A MONTAGEM AINDA NÃO TEM. A torre inclina em torno do eixo x que passa pelo centro do eixo dianteiro (6 graus para a
 * frente e 12 para trás, no rascunho); a montagem v5 não tem articulação entre instâncias, e a torre fica de pé, na pose de
 * transporte.
 *
 * A cadeia: a TABELA em mm; `derivar` calcula os perfis e as portas em mm; `montarTorre` escreve os passos em mm num estado
 * { passos, topo, origem } (o mesmo que o rascunho da máquina usa); `gerarPassos` converte para metro com `m()`, campo de medida a campo
 * de medida, num lugar só. */
import { TABELA as CARCACA } from '../carcaca/receita.js';
import { ferramentas } from '../carcaca/receita/ferramentas.js';
import { TABELA as EIXO } from '../eixo-dianteiro/receita.js';

export const TABELA = {
  /* As cores do rascunho: o cinza da carcaça. */
  cores: { aco: CARCACA.cores.cinza },
  /* Lados dos círculos extrudados (o olhal, o furo e o assento). */
  lados: 96,
  /* O fundo dos canais externos, em z: a face de trás encosta nas chapas do chassi (z 100) e a da frente fica em z 372. */
  tras: 100,
  frente: 372,
  /* O canal externo de cada lado: o U de x 261 a 310, com a alma de 20 mm por fora (x 290 a 310) e as abas de 20 mm na frente e atrás,
     de y 150 a 2.100. */
  externo: { x: [261, 310], alma: 20, aba: 20, y: [150, 2100] },
  /* As travessas de trás, entre as abas de trás (z 100 a 120), e a de baixo, de fundo (z 100 a 220, y 150 a 210), que é o assento do
     cilindro de elevação; todas param 1 mm antes da face de fora das almas. */
  travessas: { meio: [1150, 1220], topo: [2030, 2100], baixo: { z: 220, y: 210 }, recuo: 1 },
  /* A orelha do cilindro de inclinação, presa à face de fora da alma: de z 60 a 160, y 830 a 890, até x 400. */
  orelha: { z: [60, 160], y: [830, 890], ate: 400 },
  /* O pé de cada lado: o olhal de raio 95 em volta do centro do eixo dianteiro, o furo com 2 mm de folga no tubo do eixo, e a chapa
     que desce à frente até a travessa de baixo, em [z, y] (os dois pontos de z `tras` são o fundo da travessa e o fim dela no pé).
     O cortador do furo passa 15 mm por dentro e 18 por fora do olhal. */
  pe: { raioDoOlhal: 95, folgaDoFuro: 2, chapa: [[-30, 266], [70, 300]], fimNaTravessa: 215, alemDoOlhal: [15, 18] },
  /* O assento do cilindro de elevação: o pé dele, de Ø 60, no centro da largura e em z 190 (a 175 a camisa entrava 5 mm no bojo do
     diferencial), sobre a travessa de baixo; o disco dentro da travessa tem 10 mm. */
  assento: { z: 190, raio: 30, profundidade: 10 },
};

const m = (mm) => mm / 1000;

/** Os perfis e as portas, em mm, no referencial da máquina. */
export function derivar(T = TABELA) {
  const E = T.externo;
  const pivo = { y: CARCACA.rodas.dianteira.y, z: CARCACA.rodas.dianteira.z };
  const pe = { x: [EIXO.apoioDaTorre.de, EIXO.apoioDaTorre.ate], raioDoFuro: EIXO.tubo.raio + T.pe.folgaDoFuro };
  const circulo = (cx, cy, r) => Array.from({ length: T.lados }, (_, k) => [cx + r * Math.cos(2 * Math.PI * k / T.lados), cy + r * Math.sin(2 * Math.PI * k / T.lados)]);
  /* o U do canal externo esquerdo em [x, z], aberto para dentro */
  const uExterno = [[E.x[0], T.tras], [E.x[1], T.tras], [E.x[1], T.frente], [E.x[0], T.frente], [E.x[0], T.frente - E.aba],
    [E.x[1] - E.alma, T.frente - E.aba], [E.x[1] - E.alma, T.tras + E.aba], [E.x[0], T.tras + E.aba]];
  const chapaDoPe = [T.pe.chapa[0], [T.tras, E.y[0]], [T.tras, T.pe.fimNaTravessa], T.pe.chapa[1]];
  const faceDaGuia = E.x[1] - E.alma;
  const yAssento = T.travessas.baixo.y;
  const O = T.orelha;
  const orelha = (s) => ({ forma: 'plano', papel: 'recebe', ponto: [s * (E.x[1] + O.ate) / 2, (O.y[0] + O.y[1]) / 2, O.z[0]], normal: [0, 0, -1], extensao: [O.ate - E.x[1], O.y[1] - O.y[0]], referencia: [0, 1, 0] });
  const portas = {
    olhalEsquerdo: { forma: 'cilindro', papel: 'interna', eixo: [-1, 0, 0], centro: [pe.x[1], pivo.y, pivo.z], raio: pe.raioDoFuro, inicio: 0, fim: pe.x[1] - pe.x[0], referencia: [0, 1, 0] },
    olhalDireito: { forma: 'cilindro', papel: 'interna', eixo: [1, 0, 0], centro: [-pe.x[1], pivo.y, pivo.z], raio: pe.raioDoFuro, inicio: 0, fim: pe.x[1] - pe.x[0], referencia: [0, 1, 0] },
    guiaDoCanalInterno: { forma: 'plano', papel: 'recebe', ponto: [faceDaGuia, E.y[1], (T.tras + T.frente) / 2], normal: [-1, 0, 0], extensao: [T.frente - T.tras - 2 * E.aba, E.y[1] - E.y[0]], referencia: [0, 1, 0] },
    assentoDoCilindro: { forma: 'anel', papel: 'recebe', eixo: [0, 1, 0], centro: [0, yAssento, T.assento.z], raioInterno: 0, raioExterno: T.assento.raio, inicio: -T.assento.profundidade, fim: 0 },
    /* a face de trás de cada orelha, no meio dela, onde a ponta da haste do cilindro de inclinação encosta */
    orelhaEsquerda: orelha(1),
    orelhaDireita: orelha(-1),
  };
  return { pivo, pe, circulo, uExterno, chapaDoPe, portas };
}

/** Monta a torre no estado { passos, topo, origem }, em mm, no referencial da máquina, e devolve as origens das portas. */
export function montarTorre(estado, T = TABELA) {
  const D = derivar(T);
  const { extX, extY, booleana, parte } = ferramentas(estado);
  const unir = (...s) => booleana('unir', s);
  const cortar = (a, ...s) => booleana('subtrair', [a, ...s]);
  const novo = () => { estado.origem += 1; return estado.origem; };
  /* a cópia do outro lado, pelo espelho em x = 0 */
  const espelho = (sel) => {
    const id = novo();
    estado.passos.push(['espelha', { origemId: id, eixo: 'x', pos: 0, derivaDe: sel.origem, sel: { origem: sel.origem } }]);
    return { origem: { op: 'espelha', id, de: sel.origem } };
  };
  const par = (sel) => unir(sel, espelho(sel));
  const caixaY = (x0, x1, z0, z1, y0, y1) => extY([[x0, z0], [x1, z0], [x1, z1], [x0, z1]], y0, y1);
  const E = T.externo; const R = T.travessas; const O = T.orelha; const P = D.pivo;

  /* PÉS: de cada lado o olhal unido à chapa, menos o furo; cada um feito do seu lado, para a porta do furo sair do lado certo */
  const furos = {};
  for (const s of [1, -1]) {
    const [a, b] = s > 0 ? D.pe.x : [-D.pe.x[1], -D.pe.x[0]];
    const [c0, c1] = s > 0 ? [D.pe.x[0] - T.pe.alemDoOlhal[0], D.pe.x[1] + T.pe.alemDoOlhal[1]] : [-D.pe.x[1] - T.pe.alemDoOlhal[1], -D.pe.x[0] + T.pe.alemDoOlhal[0]];
    furos[s] = extX(D.circulo(P.z, P.y, D.pe.raioDoFuro), c0, c1);
    parte('peTorre', cortar(unir(extX(D.circulo(P.z, P.y, T.pe.raioDoOlhal), a, b), extX(D.chapaDoPe, a, b)), furos[s]), T.cores.aco);
  }

  /* CANAIS EXTERNOS: o U de pé com a orelha, o espelho, e as três travessas de trás */
  const canalExterno = extY(D.uExterno, E.y[0], E.y[1]);
  const orelha = caixaY(E.x[1], O.ate, O.z[0], O.z[1], O.y[0], O.y[1]);
  const meia = E.x[1] - R.recuo;
  const travessas = [
    caixaY(-meia, meia, T.tras, T.tras + E.aba, ...R.meio),
    caixaY(-meia, meia, T.tras, T.tras + E.aba, R.topo[0], E.y[1]),
    caixaY(-meia, meia, T.tras, R.baixo.z, E.y[0], R.baixo.y),
  ];
  const lados = par(unir(canalExterno, orelha));
  parte('canaisExternos', unir(lados, ...travessas), T.cores.aco);
  /* o assento do cilindro: corpo próprio dentro da travessa de baixo, rente à face de cima, sem união (unido, a face dele some) */
  const A = T.assento;
  const assento = extY(D.circulo(0, A.z, A.raio), R.baixo.y - A.profundidade, R.baixo.y);
  parte('canaisExternos', assento, T.cores.aco);
  return { furoEsquerdo: furos[1], furoDireito: furos[-1], canalExterno, assento, lados };
}

/* Os campos de medida de cada operação e das portas: neles todo número é milímetro. */
const MEDIDAS = { extrusao: ['perfil', 'em', 'altura'], espelha: ['pos'] };
const MEDIDAS_DA_PORTA = ['centro', 'ponto', 'raio', 'raioInterno', 'raioExterno', 'inicio', 'fim', 'extensao'];
const emMetro = (v) => (typeof v === 'number' ? m(v) : Array.isArray(v) ? v.map(emMetro) : v);

/** Os PASSOS, em metro: a forma e, no fim, as seis portas. */
export function gerarPassos(T = TABELA) {
  const estado = { passos: [], topo: {}, origem: 0 };
  const { furoEsquerdo, furoDireito, canalExterno, assento, lados } = montarTorre(estado, T);
  const forma = estado.passos.map(([op, args]) => [op, Object.fromEntries(Object.entries(args).map(([k, v]) => [k, (MEDIDAS[op] ?? []).includes(k) ? emMetro(v) : v]))]);
  const { portas } = derivar(T);
  /* a parede do furo: as laterais do cortador (as tampas dele foram consumidas pelo corte) */
  const paredeDo = (furo) => ({ origem: { ...furo.origem, lado: { passo: 1, fase: 0 } } });
  const porta = (id, de) => ['publicarPorta', { id, de: de.origem, interface: Object.fromEntries(Object.entries(portas[id]).map(([k, v]) => [k, MEDIDAS_DA_PORTA.includes(k) ? emMetro(v) : v])) }];
  return [...forma, porta('olhalEsquerdo', paredeDo(furoEsquerdo)), porta('olhalDireito', paredeDo(furoDireito)), porta('guiaDoCanalInterno', canalExterno), porta('assentoDoCilindro', assento),
    /* as orelhas saem da união dos dois lados, e não do espelho: a porta de uma origem espelhada leva a mão espelhada */
    porta('orelhaEsquerda', lados), porta('orelhaDireita', lados)];
}

export const CONTATOS = [
  { par: ['canaisExternos', 'peTorre'], motivo: 'a face da frente da chapa de cada pé, em z 100 e de y 150 a 215, encosta na face de trás da travessa de baixo e do canal externo' },
];

const receita = {
  meta: { nome: 'empilhadeira/torre', desc: 'torre da empilhadeira, a parte presa ao eixo: os dois canais externos em U com as travessas e a orelha do cilindro de inclinação, e os dois pés com o olhal no tubo do eixo dianteiro' },
  PARAMS: TABELA,
  TOPO: { origem: 'a da máquina: o chão sob o centro do eixo dianteiro, no meio da largura; y para cima, +x à esquerda de quem dirige e a frente em +z' },
  PLANO: {
    objeto: 'a torre duplex de 3 m de uma empilhadeira de contrapeso de 2,5 t, na parte que inclina presa ao eixo dianteiro: os canais externos com as travessas e os pés com o olhal, de pé, na pose de transporte',
    referencias: ['../../referencias/frente.ia.png', '../../referencias/cima.ia.png', '../../referencias/carcaca-lado.ia.png', '../../referencias/carcaca-frente.ia.png'],
    escala: { medida: 'altura da torre abaixada (TABELA do alinhamento)', milimetros: 2100 },
    partes: [
      { nome: 'canaisExternos', forma: 'dois canais em U cinza de pé, y 150 a 2.100, x 261 a 310 e z 100 a 372, abertos para dentro; travessas de trás em y 1.150 e 2.030 e a de baixo até z 220; a orelha por fora da alma, x 310 a 400, y 830 a 890', tecnica: 'U extrudado em y unido à orelha e ao espelho dele, unido às três travessas extrudadas em y; o disco de Ø 60 do assento do cilindro dentro da travessa de baixo, rente à face de cima' },
      { nome: 'peTorre', forma: 'de cada lado, de x 215 a 262, o olhal de raio 95 no centro do eixo dianteiro (y 352,5, z 0) com o furo de raio 77, unido à chapa que desce à frente até a face de trás da travessa de baixo, em z 100', tecnica: 'círculo de 96 lados e chapa extrudados em x, unidos, menos o círculo do furo extrudado em x; um de cada lado, sem espelho' },
    ],
    criteriosDeReprovacao: [
      'a torre baixa ou fina demais para uma empilhadeira de 2,5 t, ou fora da vertical na pose de transporte',
      'o olhal do pé fora do eixo do tubo do eixo dianteiro, ou o furo cruzando o tubo',
      'o canal externo atravessando a aba do paralama ou as chapas do chassi',
      'o canal sem o U aberto para dentro onde o canal interno corre, ou sem as travessas de trás',
      'cor trocada: a torre laranja ou escura',
    ],
  },
  contatos: CONTATOS,
  /* Os extremos que a TABELA fixa, em mm: o topo dos canais e a orelha, o pé dos canais e o olhal. */
  get PONTOS() {
    const T = this.PARAMS; const E = T.externo; const P = derivar(T).pivo;
    return [
      { nome: 'topo da frente dos canais, com a orelha', parte: 'canaisExternos', medida: 'maximo', em: [T.orelha.ate, E.y[1], T.frente], toleranciaMm: 0.5 },
      { nome: 'pé de trás dos canais, com a orelha', parte: 'canaisExternos', medida: 'minimo', em: [-T.orelha.ate, E.y[0], T.orelha.z[0]], toleranciaMm: 0.5 },
      { nome: 'topo do olhal do pé esquerdo', parte: 'peTorre', medida: 'maximo', em: [EIXO.apoioDaTorre.ate, P.y + T.pe.raioDoOlhal, T.tras], toleranciaMm: 0.5 },
      { nome: 'fundo do olhal do pé direito', parte: 'peTorre', medida: 'minimo', em: [-EIXO.apoioDaTorre.ate, E.y[0], P.z - T.pe.raioDoOlhal], toleranciaMm: 0.5 },
    ];
  },
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
