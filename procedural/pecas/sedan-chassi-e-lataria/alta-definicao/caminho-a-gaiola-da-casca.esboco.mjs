/* caminho-a-gaiola-da-casca.esboco.mjs: o segundo ciclo de alta definição do sedã, pelo caminho A (a grade de estações por colunas).
 * O trecho é o corpo de baixo do lado direito e a metade direita do capô, em chapa de 1 mm, com seis painéis separados por 4 mm de vão
 * e o lábio dos dois arcos de roda. O alvo está em `alvo.mjs`, e a versão do primeiro ciclo, escrita à mão, em `ciclo-1/`.
 *
 * A GAIOLA sai de `gaiolaPorEstacoes`, com as estações ao longo de z e as colunas da seção, da borda de baixo à cintura, mais 40 mm de
 * faixa de cima no trecho inteiro e, do pé do capô para a frente, o capô até o meio do carro. Cada ponto é uma amostra do alvo, sem
 * medidas. O raio das duas quinas de caráter é pedido em milímetro no vinco (`raio`), e o ajudante põe as colunas de apoio. O arco de roda é borda da chapa: a coluna `fundo` sobe pelo arco e
 * as colunas abaixo do ombro se apertam acima dele, amostrando a mesma lateral.
 *
 * AS LINHAS DE VÃO saem da gaiola por `curvaDaGaiola`, sem coordenada: uma estação para cada linha vertical e uma coluna para a soleira e
 * para o capô. A estação de uma linha tem as duas vizinhas à mesma distância, e a coluna também, para a linha da superfície cair na
 * posição de projeto (a superfície aproxima os pontos, e com vizinhas desiguais a linha anda).
 *
 * O LÁBIO do arco é a aba do `friso` sobre a borda do arco, que é a coluna `fundo` entre as duas pontas dele.
 *
 * `HD_PAINEIS=0` monta só a chapa, `HD_LABIO=0` tira os lábios, `HD_NIVEIS` troca os níveis e `HD_CONFERIR=0` tira o corte de conferência
 * do ajudante de painéis, para iterar. */
import { gaiolaPorEstacoes } from '../../../nucleo/gaiola-por-estacoes.js';
import { curvaDaGaiola } from '../../../nucleo/curva-da-gaiola.js';
import { paineisPorVaos } from '../../../nucleo/paineis-por-vaos.js';
import { espelharLinha } from './espelho.mjs';
import { T, C, yTopo, yDaBorda, ladoX, topoY, ARCOS, PAINEIS, CORES, VIZINHOS } from './alvo.mjs';

const NIVEIS = Number(process.env.HD_NIVEIS ?? 2);
const COM_PAINEIS = process.env.HD_PAINEIS !== '0';
const COM_LABIO = process.env.HD_LABIO !== '0';
const CONFERIR = process.env.HD_CONFERIR !== '0';

/* ---- as estações ---- */
/* as distâncias, a partir da ponta do arco, das estações de dentro dele (até o centro) e das de fora dele: o passo cresce menos de duas
   vezes de uma para a outra, porque na ponta o arco sobe quase a prumo */
/* `HD_ARCO=fino` começa a 8 mm da ponta: o arco sai mais redondo no pé, e a leitura de ondulação acusa três calombos de 0,4 mm na faixa de
   apoio da cintura, onde as estações ficam a 8 mm umas das outras */
const FINO = process.env.HD_ARCO === 'fino';
const DENTRO_DO_ARCO = FINO ? [8.2, 24.2, 52.2, 100.2, 175.2, 280.2] : [20.2, 55.2, 110.2, 190.2, 290.2];
const FORA_DO_ARCO = FINO ? [8.8, 25.8, 57.8] : [20.8, 57.8];
const [ARCO_TRAS, ARCO_FRENTE] = ARCOS;
/* a borda de trás da cabine (o pé do vidro traseiro); a tampa do porta-malas começa 4 mm atrás dela */
const C_TRAS = C.zPeDoVidroTraseiro;
const NOMEADAS = new Map([[T.zTraseira, 'traseira'], [T.zBico, 'bico'], [C_TRAS - T.vao, 'peDaTampa'], [C_TRAS - T.vao - 33, 'antesDaTampa'], [T.zTras, 'tras'], [T.zLateral, 'fimDaPorta'], [T.zPortas, 'entrePortas'], [T.zCapo, 'fimDoParaLama'], [T.zPeDoCapo, 'peDoCapo'], [T.zFrente, 'frente'],
  [ARCO_TRAS[0], 'arcoDeTrasInicio'], [ARCO_TRAS[1], 'arcoDeTrasTopo'], [ARCO_TRAS[2], 'arcoDeTrasFim'],
  [ARCO_FRENTE[0], 'arcoDaFrenteInicio'], [ARCO_FRENTE[1], 'arcoDaFrenteTopo'], [ARCO_FRENTE[2], 'arcoDaFrenteFim']]);
const doArco = ([z0, zc, z1]) => [z0, ...DENTRO_DO_ARCO.map((d) => z0 + d), zc, ...DENTRO_DO_ARCO.map((d) => z1 - d).reverse(), z1];
const Z = [
  T.zTraseira, -2055, -2027, T.zTras, -1890, -1790, ...FORA_DO_ARCO.map((d) => ARCO_TRAS[0] - d).reverse(), ...doArco(ARCO_TRAS),
  /* a linha do fim da porta fica a 20,8 mm da ponta do arco, e a estação seguinte à mesma distância dela */
  T.zLateral, 2 * T.zLateral - ARCO_TRAS[2], -700, -630, -520, -380,
  /* as vizinhas da linha entre as portas, a 175 mm dela */
  T.zPortas - 175, T.zPortas, T.zPortas + 175, 290, 440, 560,
  /* as vizinhas da linha do para-lama com a porta, a 52 mm dela; a da frente é o pé do capô */
  2 * T.zCapo - T.zPeDoCapo, T.zCapo, T.zPeDoCapo, ...FORA_DO_ARCO.map((d) => ARCO_FRENTE[0] - d).reverse(), ...doArco(ARCO_FRENTE),
  ...FORA_DO_ARCO.map((d) => ARCO_FRENTE[2] + d), 1765, 1860, T.zFrente, 2032, 2070, 2098, T.zBico,
];
/* a estação do pé da tampa e uma 15 mm antes dela: a linha de vão ao longo de uma coluna não chega à estação em que a coluna termina no
   meio da grade (CICLO-4.md), e vai até a anterior, 33 mm antes, com a ponta passando 7 mm da borda; a 15 mm, a gradação das estações
   (59, 15, 26 mm) deixava um calombo de 9,6 mm junto do ombro */
Z.push(C_TRAS - T.vao, C_TRAS - T.vao - 33); Z.sort((a, b) => a - b);
const nomeDaEstacao = (z) => NOMEADAS.get(z) ?? `z${z < 0 ? 'm' : ''}${Math.abs(Math.round(z))}`;

/* ---- as colunas ---- */
/* as colunas da lateral abaixo do ombro, pela fração da altura entre a borda de baixo e o ombro. A soleira e as duas vizinhas ficam a 51 mm
   uma da outra onde a borda é o fundo (y 419), e a linha da soleira cai em y 470 */
const H = T.yOmbro - T.ladoFundo[0][1];
const DO_LADO = [['fundo', 0], ['soleira', 51 / H], ['saia', 102 / H], ['alargado', (T.yAlargado - T.ladoFundo[0][1]) / H],
  /* entre a altura do alargado e o ombro a seção é curva, e as colunas ficam a 36 mm. Com três colunas a 71 mm (`HD_FLANCO=largo`) a
     superfície, que fica para dentro dos pontos onde o passo é largo, deixa calombo de 0,3 a 0,6 mm ao lado da faixa de apoio do ombro */
  ...(process.env.HD_FLANCO === 'largo' ? [['flancoBaixo', 257 / H], ['meioDoOmbro', 328 / H], ['flancoAlto', 400 / H]] : [1, 2, 3, 4, 5, 6, 7].map((k) => [`flanco${k}`, (186 + (285 * k) / 8) / H]))];
/* a faixa de cima: 40 mm de topo depois da quina da cintura, no trecho inteiro. Atrás do pé do capô ela é o peitoril das portas e da lateral
   traseira, e é por ela que a quina da cintura existe no carro todo e que as linhas das portas a sobem */
const X_DA_FAIXA = T.xCapo + 60;
/* as colunas do capô, pela meia largura: a do vão do capô tem as duas vizinhas a 60 mm, a faixa de um lado e a borda do capô do outro */
const DO_CAPO = [['vaoDoCapo', T.xCapo], ['capoBorda', T.xCapo - 60], ['capoMeio', 560], ['capoDentro', 300], ['centro', 0]];
const mm = (v) => v / 1000;
function colunasDe(z) {
  const yb = yDaBorda(z);
  const colunas = DO_LADO.map(([nome, f]) => { const y = yb + f * (T.yOmbro - yb); return { nome, em: [mm(ladoX(z, y)), mm(y)] }; });
  colunas.push({ nome: 'ombro', em: [mm(ladoX(z, T.yOmbro)), mm(T.yOmbro)] }, { nome: 'cintura', em: [mm(ladoX(z, yTopo(z))), mm(yTopo(z))] });
  /* onde a planta fecha o canto da frente, a faixa e as colunas do capô se afastam da quina junto com ela */
  const xc = ladoX(z, yTopo(z)); const xFaixa = Math.min(X_DA_FAIXA, xc - 40); const xVao = Math.min(T.xCapo, xFaixa - 60);
  colunas.push({ nome: 'faixa', em: [mm(xFaixa), mm(topoY(xFaixa, z))] });
  /* o capô começa na estação do pé dele, e a tampa do porta-malas acaba na do pé dela: as duas são bordas, e as mesmas colunas servem às duas */
  const comCapo = z >= T.zPeDoCapo - 1e-6; const comTampa = z <= C_TRAS - T.vao + 1e-6;
  if (comCapo || comTampa) {
    const xs = { vaoDoCapo: xVao, capoBorda: xVao - 60, capoMeio: 560, capoDentro: 300, centro: 0 };
    for (const [nome] of DO_CAPO) colunas.push({ nome, em: [mm(xs[nome]), mm(topoY(xs[nome], z))], ...(Math.abs(z - T.zPeDoCapo) < 1e-6 ? { comeca: true } : {}), ...(Math.abs(z - (C_TRAS - T.vao)) < 1e-6 ? { termina: true } : {}) });
  }
  return colunas;
}
const estacoes = Z.map((z) => ({ nome: nomeDaEstacao(z), em: mm(z), colunas: colunasDe(z) }));

const cantos = [['traseira', 'fundo'], ['traseira', 'centro'], ['bico', 'fundo'], ['bico', 'centro'], ['peDoCapo', 'centro'], ['peDoCapo', 'faixa'], ['peDaTampa', 'centro'], ['peDaTampa', 'faixa'],
  ['arcoDeTrasInicio', 'fundo'], ['arcoDeTrasFim', 'fundo'], ['arcoDaFrenteInicio', 'fundo'], ['arcoDaFrenteFim', 'fundo']].map(([estacao, coluna]) => ({ estacao, coluna }));

/* ---- os vincos: o raio pedido em milímetro ---- */
/* A cintura tem 6 mm no trecho inteiro. O ombro é quina rasa e de dobra variável: com um raio só de 3 mm o ajudante pede colunas de apoio
   de 0,04 a 1,3 mm da quina, e a chapa sai com mais de mil faces finas. Por isso a gaiola é montada duas vezes: a primeira só lê a dobra
   do ombro em cada estação (`raios` da saída), e a segunda pede em cada ponto o raio que dá o apoio de `apoioDoOmbro` mm, pela relação
   medida do apoio com a dobra (apoio = 1,47 x raio x tangente de meia dobra). `HD_RAIO_DO_OMBRO=<mm>` volta ao raio único. */
const FATOR_DO_APOIO = 1.47;
const APOIO_DO_OMBRO = Number(process.env.HD_APOIO_OMBRO ?? T.apoioDoOmbro);
/* `HD_MEDIDAS=1` faz a superfície passar pelos pontos das colunas que não são quina nem apoio dela; fica como sonda, porque o capô sai com
   uma ondulação de 23,7 mm junto da coluna que começa no pé dele */
const MEDIDAS = process.env.HD_MEDIDAS === '1' ? [...DO_LADO.map(([nome]) => nome), 'faixa', ...DO_CAPO.map(([nome]) => nome)].map((coluna) => ({ coluna })) : undefined;
/* ciclo 5: a gaiola é a metade x >= 0 do carro inteiro, e o passo a espelha antes de subdividir */
export const SIMETRIA = process.env.HD_SIMETRIA === '0' ? {} : { simetria: 'x' };
const montar = (raioDoOmbro) => gaiolaPorEstacoes({ eixo: 'z', estacoes, cantos, niveis: NIVEIS, ...SIMETRIA, ...(MEDIDAS ? { medidas: MEDIDAS } : {}),
  vincos: [{ nome: 'cintura', coluna: 'cintura', raio: T.raioDaCintura }, { nome: 'ombro', coluna: 'ombro', raio: raioDoOmbro }] });
const dobras = montar(T.raioMinimoDoOmbro).raios.find((r) => r.vinco === 'ombro').pontos.map((p) => p.angulo);
if (dobras.length !== Z.length) throw new Error(`o ombro devia ter uma dobra por estação (${Z.length}), e a gaiola deu ${dobras.length}`);
export const RAIO_DO_OMBRO = process.env.HD_RAIO_DO_OMBRO ? Number(process.env.HD_RAIO_DO_OMBRO)
  : dobras.map((graus) => Math.round(Math.min(400, Math.max(T.raioMinimoDoOmbro, APOIO_DO_OMBRO / (FATOR_DO_APOIO * Math.tan((Math.max(graus, 0.5) * Math.PI) / 360)))) * 100) / 100);

export const GAIOLA = montar(RAIO_DO_OMBRO);
/* a definição da gaiola, para as sondas que a remontam com outra opção (a dos anéis no arco, no CICLO-2.md) */
export const DEFINICAO = { eixo: 'z', estacoes, cantos, niveis: NIVEIS, ...SIMETRIA,
  vincos: [{ nome: 'cintura', coluna: 'cintura', raio: T.raioDaCintura }, { nome: 'ombro', coluna: 'ombro', raio: RAIO_DO_OMBRO }] };

/* ---- do metro da gaiola ao milímetro do esboço ---- */
const emMm = (r) => (typeof r === 'number' ? r * 1000 : Array.isArray(r) ? r.map(emMm) : r && typeof r === 'object' ? Object.fromEntries(Object.entries(r).map(([k, v]) => [k, emMm(v)])) : r);
const pontos = Object.fromEntries(Object.entries(GAIOLA.pontos).map(([k, p]) => [k, p.map((c) => c * 1000)]));
const passo = { ...GAIOLA.passo, vincos: (GAIOLA.passo.vincos ?? []).map((v) => (v.raio != null ? { ...v, raio: emMm(v.raio) } : v)) };
const chapa = ['subdivisao', { origemId: 1, ...passo, niveis: NIVEIS, borda: 'cantos', espessura: T.chapa }];

/* ---- as linhas de vão, tiradas da gaiola ---- */
const NA_CHAPA = { niveis: NIVEIS, borda: 'cantos' };
/* a curva da metade direita: na gaiola com simetria a curva sai da metade declarada */
const curva = (pedido) => curvaDaGaiola(GAIOLA, pedido, NA_CHAPA).curva;
export function linhasDeVao() {
  const direitas = [
    /* o para-lama com a porta: sobe a lateral, passa a quina da cintura, cruza a faixa de cima e sai pela borda de dentro dela */
    { nome: 'fimDoParaLama', curva: curva({ estacao: 'fimDoParaLama', de: 'fundo', ate: 'faixa' }), alem: [30, 30] },
    /* a ponta da frente passa só 6 mm da borda: com 30 mm a prova de separação acusa ponte num ponto da própria ponta, fora da chapa (CICLO-4.md) */
    { nome: 'capo', curva: curva({ coluna: 'vaoDoCapo', de: 'peDoCapo', ate: 'bico' }), alem: [30, Number(process.env.HD_ALEM_CAPO ?? 6)] },
    { nome: 'tampa', curva: curva({ coluna: 'vaoDoCapo', de: 'traseira', ate: 'antesDaTampa' }), alem: [6, 40] },
    { nome: 'entrePortas', curva: curva({ estacao: 'entrePortas', de: 'soleira', ate: 'faixa' }), alem: [0, 30] },
    { nome: 'fimDaPortaTraseira', curva: curva({ estacao: 'fimDaPorta', de: 'fundo', ate: 'faixa' }), alem: [30, 30] },
    { nome: 'soleira', curva: curva({ coluna: 'soleira', de: 'fimDaPorta', ate: 'fimDoParaLama' }) },
  ];
  /* o lado esquerdo: a mesma curva com x trocado de sinal (a chapa é simétrica, e a curva da metade cai na imagem) */
  return SIMETRIA.simetria ? [...direitas, ...direitas.map((l) => ({ ...l, nome: `${l.nome}Esq`, curva: espelharLinha(l.curva) }))] : direitas;
}

/* ---- o esboço ---- */
let passos = [chapa, ['parte', { nome: 'chapa', sel: { origem: { op: 'subdivisao', id: 1 } } }]];
export let MEDIDAS_DO_CORTE = null;
let avisosDoCorte = [];
let livre = 2;
if (COM_PAINEIS) {
  const g = paineisPorVaos({ chapa: { passos: [chapa], origem: { op: 'subdivisao', id: 1 }, pontos }, vao: T.vao, linhas: linhasDeVao(), paineis: PAINEIS,
    conferir: CONFERIR, medirTempo: true });
  passos = [...g.passos];
  for (const p of PAINEIS) passos.push(['pincel', { modo: 'face', sel: { grupo: p.nome }, cor: CORES[p.nome] }]);
  MEDIDAS_DO_CORTE = g.medidas; avisosDoCorte = g.avisos; livre = g.proximoId;
}
if (COM_LABIO) {
  /* a borda de cada arco: a coluna `fundo` da ponta de trás à da frente */
  for (const [nome, [z0, , z1]] of [['labioTraseiro', ARCO_TRAS], ['labioDianteiro', ARCO_FRENTE]]) {
    const borda = Z.filter((z) => z >= z0 && z <= z1).map((z) => GAIOLA.ponto(nomeDaEstacao(z), 'fundo'));
    passos.push(['friso', { origemId: livre, superficie: { op: 'subdivisao', id: 1 }, linha: { nome, pontos: borda }, aba: T.labio }],
      ['parte', { nome, sel: { origem: { op: 'friso', id: livre } } }], ['pincel', { modo: 'face', sel: { origem: { op: 'friso', id: livre } }, cor: CORES[nome] }]);
    livre += 1;
  }
}

export const AVISOS = { gaiola: GAIOLA.avisos ?? [], corte: avisosDoCorte };
export const RAIOS = GAIOLA.raios ?? null;
export default {
  plano: 'Segundo ciclo de alta definição do sedã: o corpo de baixo do lado direito e a metade direita do capô, em chapa de 1 mm com vão de 4 mm, raio pedido nas quinas e lábio nos arcos de roda.',
  vista: 'isometrica',
  opcoes: [{
    titulo: 'caminho A, ciclo 2: grade de estações com raio no vinco',
    nota: 'gaiolaPorEstacoes com raio em mm, linhas de vão por curvaDaGaiola, arco de roda como borda da grade e lábio por aba',
    passos,
    topo: pontos,
    contatos: COM_PAINEIS ? [
      ...VIZINHOS.map((par) => ({ par, relacao: 'folga', motivo: 'vão de 4 mm entre painéis da mesma chapa', folga: { esperada: 4.1, tolerancia: 0.1, degrau: 0.3 } })),
      /* o friso sobre a chapa com simetria ganha a cópia espelhada na mesma parte: o lábio de cada arco é uma parte com os dois lados */
      ...(COM_LABIO ? [['labioDianteiro', 'paraLamaDir'], ['labioTraseiro', 'lateralTraseiraDir'], ['labioDianteiro', 'paraLamaEsq'], ['labioTraseiro', 'lateralTraseiraEsq']].map((par) => ({ par, relacao: 'atravessa', motivo: 'o lábio nasce da borda do arco de roda e é a mesma chapa do painel, virada para dentro' })) : []),
    ] : [],
  }],
};
