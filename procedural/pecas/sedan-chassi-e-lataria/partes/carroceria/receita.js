/* sedan-chassi-e-lataria/carroceria — a carroceria do sedã sem frente, traseira, vidros, rodas e acessórios: os painéis da lataria de baixo cortados
 * da chapa (capô, para-lamas, portas, laterais traseiras, soleiras, tampa do porta-malas e os lábios dos arcos), o teto com as colunas e as molduras
 * dos vãos, e o chassi aparado por essas duas chapas (34 membros e os dois eixos).
 *
 * Etapa 1 de 5 da montagem `../../montagem.json` (item 1 das partes do `../../ALINHAMENTO.md`). A forma é a do esboço do carro inteiro com o chassi
 * aparado (`../../alta-definicao/chassi-aparado.esboco.mjs`, que encadeia `caminho-a-gaiola-da-casca`, `andar-de-cima` e o chassi do rascunho
 * facetado): os passos são os do esboço, recortados por `../_comum/recorte.mjs`, de modo que a malha de cada parte é a que ela tem no carro inteiro, e a
 * conversão para metro é a do esboço 2.0. A chapa de baixo e a do teto são gaiolas por estações com simetria em x, e o corte em painéis é um
 * `paineisPorVaos` com as linhas de vão tiradas da própria gaiola, em modo superfície, a 4 mm.
 *
 * POR QUE O CHASSI NÃO É UMA ETAPA À PARTE. O `aparar` corta cada membro pelo lado de dentro de uma chapa de `subdivisao` e lê a chapa que a própria
 * peça executou. A chapa fica na peça com as faces dela: se não for uma parte, são 141.704 faces sem identidade, e o núcleo não tem como pôr um
 * passo de ferramenta que não deixa faces. Na lataria de baixo e no teto a chapa já é parte (os painéis cortados dela e o teto), e por isso os membros
 * do chassi, que são aparados por essas duas chapas, moram na mesma peça.
 *
 * OS ENCAIXES. A carroceria é a base e a montagem a põe sem pose. Ela publica um plano para cada etapa filha, no referencial do carro: a quina do
 * ombro (y 890) para os vidros e para os acessórios, a borda da frente da chapa de baixo (z 2118) para a frente e a traseira, e a altura do centro das
 * rodas (y 364) para as rodas; cada filha publica o mesmo plano com a normal oposta, e a pose sai identidade.
 *
 * A cadeia: a TABELA em mm (os pontos dos encaixes); `derivar` calcula as interfaces das portas; `gerarPassos` põe o recorte, em metro, e as portas. */
import { CONJUNTO, ETAPAS, ENCAIXES, FACETADO, CABINE, MOLDURAS, VIDROS, linhasDeVao, normalDaPele, contatosDaEtapa, apoiaDaEtapa, folgasDaEtapa, interfaceDoEncaixe, parteDoPlano, portasEmMetro, recorteDaEtapa } from '../_comum/sedan.mjs';
import { C, yTopoDaCabine } from '../../alta-definicao/alvo.mjs';
import { faixaPorTras } from '../_comum/forro.mjs';

const ETAPA = 'carroceria';
const FILHAS = ['vidros', 'frente-e-traseira', 'rodas', 'acessorios'];

const m = (mm) => mm / 1000;

export const TABELA = {
  /* os pontos dos encaixes das etapas filhas, do alvo */
  encaixes: Object.fromEntries(FILHAS.map((f) => [f, ENCAIXES[f].ponto])),
  /* O FORRO dos vãos entre painéis (`../_comum/forro.mjs`): a faixa de `largura` mm por trás de cada linha de vão listada, de `espessura` mm, com a face de cima `folga` mm
     abaixo da pele de dentro da chapa (que tem `chapa` mm), e um ponto a cada `passo` da curva. `eixos` dá, por linha, a direção do plano da chapa que atravessa o vão. */
  forro: { largura: 24, espessura: 1, folga: 0.5, chapa: 1, passo: 3,
    eixos: { capo: 'x', tampa: 'x', fimDoParaLama: 'z', entrePortas: 'z', fimDaPortaTraseira: 'z' } },
};

/** As faixas do forro, uma por linha de vão (nos dois lados): `{ nome, curva, gaiola }`, em mm. */
export function forrosDosVaos(Tab = TABELA) {
  const F = Tab.forro;
  return linhasDeVao().filter((l) => (F.eixos[l.nome.replace(/Esq$/, '')] !== undefined)).map((l) => {
    const nome = `forro${l.nome[0].toUpperCase()}${l.nome.slice(1)}`;
    return { nome, linha: l.nome, gaiola: faixaPorTras({ nome, curva: l.curva, across: F.eixos[l.nome.replace(/Esq$/, '')], largura: F.largura, espessura: F.espessura, fundo: F.chapa + F.folga, passo: F.passo, normalDaPele }) };
  });
}
/* os números de origem do forro: depois do maior do carro inteiro e da aba do painel de trás */
const ID_DO_FORRO = Math.max(...CONJUNTO.passos.map(([, a]) => a.origemId ?? 0)) + 10;
const passosDoForro = (Tab) => {
  const faixas = forrosDosVaos(Tab);
  if (!faixas.length) return [];
  const ids = faixas.map((_, k) => ID_DO_FORRO + k); const uniao = ID_DO_FORRO + faixas.length;
  const sel = { origem: { op: 'unir', id: uniao } };
  return [...faixas.map((f, k) => ['subdivisao', { origemId: ids[k], vertices: f.gaiola.vertices, faces: f.gaiola.faces, niveis: 0 }]),
    ['unir', { origemId: uniao, solidos: ids.map((id) => ({ origem: { op: 'subdivisao', id } })) }],
    ['parte', { nome: 'forroDosVaos', sel }], ['pincel', { modo: 'face', sel, cor: '#4a5560' }], ['liso', { sel, angulo: 35 }]];
};

/* Os pares que o esboço declara `encosta` e o `descrever` não dá por encostados: o relato do esboço mede o toque a 1 µm (`TOLERANCIA_DO_RELATO_M`), o `descrever` a 1 nm e a declaração
   de contato aceita no máximo 0,1 µm (atrito 5 do RECEITA.md). O lábio assenta na borda da caixa de roda, e o par fica sem declaração aqui e no relato do carro. */
const SO_NO_RELATO = new Set(['caixaDeRodaDianteiraDir', 'caixaDeRodaDianteiraEsq'].map((c) => `${c}|labioDianteiro`));

/* Os membros do chassi que passam atrás de uma linha de vão: o forro, que corre a 1,5 mm da pele de fora (0,5 mm da pele de dentro), entra neles, e a solda o prende. Medido no
   `descrever` da carroceria; as quatro portas e as soleiras, que o forro tocava onde a pele inclina, deixaram de ser tocadas com a normal da pele (e não a de um eixo fixo). */
const CONTATOS_DO_FORRO = [...['A', 'B', 'C'].flatMap((n) => ['Dir', 'Esq'].map((L) => [`montante${n}${L}`, `o forro do vão ao lado do montante ${n} é soldado nele: a faixa passa pelo montante, 0,5 mm abaixo da pele de dentro`])),
  ['paredeCortaFogo', 'o forro do vão do para-lama com a porta, em z 690, é soldado na parede corta-fogo, que fica em z 700, onde a faixa a atravessa'],
  ['suporteDoRadiador', 'o forro do vão do capô com o para-lama é soldado no suporte do radiador, onde a faixa a atravessa'],
  ['travessaDoPainel', 'o forro do vão do para-lama com a porta, que cruza a faixa de cima em z 690, é soldado na travessa do painel, onde a faixa a atravessa']].map(([membro, motivo]) => ({ par: ['forroDosVaos', membro], motivo }));

/* Os painéis soltos de propósito, com o que os prende fora do esboço. */
const SOLTAS = Object.fromEntries(['capo', 'portaDianteiraDir', 'portaDianteiraEsq', 'portaTraseiraDir', 'portaTraseiraEsq', 'soleiraDir', 'soleiraEsq', 'tampaDoPortaMalas'].map((contem) => [contem,
  contem === 'capo' || contem === 'tampaDoPortaMalas' ? 'o painel é preso por dobradiça e fechadura, que ficam fora do esboço, e apoia 0,5 mm acima dos membros do chassi'
    : contem.startsWith('soleira') ? 'a chapa da soleira é colada na soleira do chassi, 0,5 mm acima dela, pela cola de estrutura que fica fora do esboço'
      : 'a porta é presa por dobradiça no montante A ou B, que ficam fora do esboço, e fecha a 0,5 mm dos montantes do chassi']));

/** As interfaces das quatro portas que a carroceria publica, em mm. */
export function derivar(Tab = TABELA) {
  return { portas: Object.fromEntries(FILHAS.map((f) => [ENCAIXES[f].pai, { ...interfaceDoEncaixe(f, 'pai'), ponto: Tab.encaixes[f] }])) };
}

/** Os PASSOS, em metro: o recorte do esboço e as portas dos encaixes. */
export function gerarPassos(Tab = TABELA) {
  const { passos } = recorteDaEtapa(ETAPA);
  const { portas } = derivar(Tab);
  return [...passos, ...passosDoForro(Tab), ...portasEmMetro(passos, Object.fromEntries(Object.entries(portas).map(([id, i]) => [id, { parte: 'capo', interface: i }])))];
}

/** Os pontos nomeados das gaiolas, em metro. */
export function gerarTopo(Tab = TABELA) {
  const topo = recorteDaEtapa(ETAPA).topo;
  for (const f of forrosDosVaos(Tab)) for (const [n, p] of Object.entries(f.gaiola.pontos)) topo[n] = p.map(m);
  return topo;
}

const receita = {
  meta: { nome: 'sedan-chassi-e-lataria/carroceria', desc: 'a carroceria do sedã: lataria de baixo em painéis, teto com molduras e o chassi aparado por essas duas chapas' },
  PARAMS: TABELA,
  get TOPO() { return { origem: 'o centro do carro no chão: x lateral com a direita em +x, y para cima, a frente em +z', ...gerarTopo(this.PARAMS) }; },
  PLANO: {
    objeto: 'a carroceria de um sedã de 4,4 m sem frente, traseira, vidros e rodas: painéis de chapa de 1 mm a 4 mm de vão, teto com colunas e molduras, e o chassi de plataforma aparado pela lataria',
    referencias: ['../../referencias/sedan-chassi-e-lataria.contornos.json'],
    escala: { medida: 'comprimento total do sedã, de z -2200 a 2200', milimetros: 4400 },
    partes: [...ETAPAS[ETAPA], 'forroDosVaos'].map(parteDoPlano),
    criteriosDeReprovacao: [
      'um vão entre painéis fora de 4,0 a 4,2 mm, ou os dois lados do carro com vãos diferentes',
      'o capô, a tampa ou o teto com costura ou degrau no eixo do carro',
      'um membro do chassi atravessando a pele de dentro da lataria, ou solto dela por mais de 0,5 mm onde o plano o apoia',
      'a quina do ombro, da cintura ou do teto em quina viva no lugar do raio pedido',
      'um vão entre painéis que deixa ver o outro lado do carro por trás dele',
    ],
    lataria: { partes: ['capo', 'paraLamaDir', 'paraLamaEsq', 'portaDianteiraDir', 'portaDianteiraEsq', 'portaTraseiraDir', 'portaTraseiraEsq', 'lateralTraseiraDir', 'lateralTraseiraEsq', 'soleiraDir', 'soleiraEsq', 'tampaDoPortaMalas', 'teto'] },
  },
  contatos: [...contatosDaEtapa(ETAPA).filter(({ par }) => !SO_NO_RELATO.has(par.join('|'))), ...CONTATOS_DO_FORRO],
  FOLGAS: folgasDaEtapa(ETAPA),
  APOIA: { ...apoiaDaEtapa(ETAPA), ...SOLTAS },
  /* As partes soltas desta peça: os painéis que fecham os vãos entre os outros ficam a 4 mm deles e a 0,5 mm dos membros do chassi, presos por dobradiça e cola de estrutura que
     ficam fora do esboço; nenhum toca outra parte. O grupo principal é o do chassi com os para-lamas, as laterais e o teto. */
  ilhas: Object.entries(SOLTAS).map(([contem, motivo]) => ({ contem, motivo })),
  /* Os vãos do teto: as cinco janelas, cada uma com a moldura de borracha que a contorna. As janelas das portas e a vigia valem para os dois lados (a borda declarada é a da
     metade). A abertura da chapa de baixo em que a cabine assenta NÃO está aqui, e o `descrever` a reprova por isso: o corte em painéis tira os vértices dela onde cada linha de vão
     a atravessa, e `vaos` só aceita a borda cujos vértices todos existem na malha (atrito 2 do RECEITA.md). */
  get vaos() {
    return VIDROS.map(([, , vao], i) => ({ nome: vao, borda: CABINE.bordaDoVao(vao), frisos: [MOLDURAS[i]] }));
  },
  /* Os extremos que a tabela do alvo e a do rascunho fixam: o eixo da frente (de x -870 a 870, raio 30, centro em y 364 e z 1249), o de trás, e o alto do teto (a borda do peitoril, em x 816, e o pé do para-brisa, em z 738). */
  get PONTOS() {
    const E = FACETADO.eixoRaio; const R = FACETADO.roda;
    const zs = Array.from({ length: 401 }, (_, k) => C.zTras + ((C.zFrente - C.zTras) * k) / 400);
    return [
      { nome: 'eixo dianteiro, a ponta de fora, de cima e da frente', parte: 'eixoDianteiro', medida: 'maximo', em: [FACETADO.eixoMeia, R.raio + E, R.zFrente + E], toleranciaMm: 1 },
      { nome: 'eixo traseiro, a ponta de fora, de baixo e de trás', parte: 'eixoTraseiro', medida: 'minimo', em: [-FACETADO.eixoMeia, R.raio - E, R.zTras - E], toleranciaMm: 1 },
      { nome: 'teto, a borda do peitoril, o alto e o pé do para-brisa', parte: 'teto', medida: 'maximo', em: [C.xBase, Math.max(...zs.map((z) => yTopoDaCabine(0, z))), C.zFrente], toleranciaMm: 3 },
    ];
  },
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
