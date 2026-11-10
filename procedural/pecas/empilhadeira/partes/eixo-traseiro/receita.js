/* empilhadeira/eixo-traseiro — o eixo traseiro direcional da empilhadeira: a viga de 120 x 100 mm com o olhal do pino de articulação
 * no meio, o suporte desse pino, que sobe até o fundo do poço traseiro da carcaça, as duas mangas que esterçam (o pino-mestre
 * vertical, a ponta de eixo e o braço de direção), os dois cubos (flange de Ø 170 e tampa de Ø 100) e a barra de direção de braço a
 * braço, numa peça rígida na pose de rodas retas.
 *
 * Terceira peça da montagem `../../montagem.json` (fatia 3 do plano `docs/modelar/planos/2026-11-09-empilhadeira.md`, item 3 das
 * partes do `../../ALINHAMENTO.md`). A forma é a metade traseira do rascunho que a pessoa aprovou por imagem em 2026-11-10
 * (`../../referencias/eixos-rodas.esboco.mjs`), levada para cá sem mudança de forma; o rascunho passou a chamar `montarEixoTraseiro`
 * daqui, de modo que a geometria tem uma fonte só. Nenhuma medida mudou; mudaram três coisas de construção: as revoluções e os círculos
 * extrudados (olhal e pino-mestre) com 96 lados no lugar de 48 e 32, um anel colinear nas pontas de eixo para a porta, e a ponta de
 * eixo como corpo próprio da parte `mangas`, sem união com o pino-mestre (ver `montarEixoTraseiro`).
 *
 * DE ONDE VEM CADA MEDIDA (do rascunho). A vista de trás da carcaça (`carcaca-tras.ia.png`, 4,03 mm/px): a tampa cinza do cubo nas
 * colunas 365 a 379, Ø 89 nas linhas 457 a 479, levada a Ø 100, e o cubo escuro de Ø 177 nas linhas 445 a 489, levado a Ø 170; a ponta
 * da tampa a 625 mm, dentro do aro. O disco da roda traseira fica a 550 mm, onde o flange acaba. A lateral da carcaça
 * (`carcaca-lado.ia.png`) mostra só o pino vertical da manga sobre o cubo (coluna 782, linhas 395 a 440); a viga, as mangas e a barra
 * não aparecem inteiras em nenhuma vista, e as seções delas são de caráter. O pino-mestre fica a 400 mm, por dentro do pneu traseiro
 * (de 445 a 653, `rodas.traseira` da carcaça). O suporte sobe do topo do olhal até o fundo do poço traseiro da carcaça
 * (`pocoTraseiro.fundo`, a 428 mm do chão), que a carcaça não publica como porta: a altura vem do chão em mm, como no rascunho, e cai
 * no referencial do eixo pela altura do cubo traseiro de `rodas` da carcaça.
 *
 * O ENCAIXE. A origem é o centro do eixo, no meio da máquina, sobre o eixo dos cubos; y para cima, +x à esquerda de quem dirige e a
 * frente em +z. A montagem põe o eixo na carcaça pela porta `passagemNoChassi` (a ponta de eixo da manga esquerda no eixo do poço da
 * roda traseira, que a carcaça publica como `passagemDoEixoTraseiro`), e o vínculo `entreAsParedes` traz a distância entre as paredes
 * dos dois poços, onde a ponta de eixo leva um anel de vértices para a porta ter plano na malha. As rodas traseiras, de uma etapa
 * seguinte, assentam nas portas `cuboTraseiroEsquerdo` e `cuboTraseiroDireito`, a face de fora do flange.
 *
 * AS JUNTAS QUE A MONTAGEM AINDA NÃO TEM. A viga gira em torno do pino de articulação (o eixo z pelo centro do olhal) contra o suporte,
 * e cada manga esterça em torno do pino-mestre dela (o eixo vertical em x = ±400, z = 0, de y -95 a 95); a montagem v5 não tem
 * articulação entre instâncias, e as cinco partes ficam numa peça na pose de transporte.
 *
 * A cadeia: a TABELA em mm; `derivar` calcula os perfis e as portas em mm; `montarEixoTraseiro` escreve os passos em mm num estado
 * { passos, topo, origem } (o mesmo que o rascunho da máquina usa, com `em` levando a origem ao lugar dela); `gerarPassos` converte
 * para metro com `m()`, campo de medida a campo de medida, num lugar só. */
import { TABELA as CARCACA } from '../carcaca/receita.js';
import { ferramentas } from '../carcaca/receita/ferramentas.js';

export const TABELA = {
  /* A distância entre as paredes de dentro dos dois poços traseiros do contrapeso da carcaça (2 x 405). Vem da porta
     `passagemDoEixoTraseiro` pelo vínculo da montagem; este valor só vale para ver a peça sozinha. */
  entreAsParedes: 810,
  /* As cores do rascunho: o escuro da viga e das mangas, o cinza do suporte, dos cubos e da barra (as da carcaça). */
  cores: { eixo: CARCACA.cores.escuro, aco: CARCACA.cores.cinza },
  /* Lados das revoluções e dos círculos extrudados. */
  lados: 96,
  /* A viga: seção de 120 (em z) por 100 mm (em y), de -360 a 360 mm, onde a ponta encosta no pino-mestre; o olhal do pino de
     articulação é um cilindro de Ø 140 ao longo de z, de -110 a 110 mm. */
  viga: { meiaProfundidade: 60, meiaAltura: 50, ate: 360 },
  olhal: { raio: 70, meioComprimento: 110 },
  /* O suporte do pino de articulação: o bloco de 180 mm de largura que sobe do topo do olhal até o fundo do poço traseiro, de z 60 a
     105 mm (à frente da viga). */
  suporte: { meiaLargura: 90, z: [60, 105] },
  /* A manga de cada lado: o pino-mestre de Ø 80 em x 400 (de y -95 a 95), a ponta de eixo de Ø 90 de 400 a 480 mm e o braço de direção,
     de x 375 a 420, z 20 a 165 e y -20 a 20. */
  manga: { pinoX: 400, raioDoPino: 40, meiaAlturaDoPino: 95, raioDaPonta: 45, pontaAte: 480, braco: { x: [375, 420], z: [20, 165], meiaAltura: 20 } },
  /* O cubo de cada lado: o flange de Ø 170 de 480 a 550 mm (a face de fora recebe a roda) e a tampa de Ø 100 até 625. */
  cubo: { raioDoFlange: 85, face: 550, raioDaTampa: 50, ateATampa: 625 },
  /* A barra de direção: tubo de Ø 44 de braço a braço (até a face de dentro de cada braço, a 375 mm), 140 mm à frente do eixo. */
  barra: { raio: 22, z: 140 },
};

const m = (mm) => mm / 1000;
const r1 = (v) => Math.round(v * 10) / 10;

/** Os perfis e as portas, em mm, no referencial do eixo. */
export function derivar(T = TABELA) {
  const { viga: V, olhal: O, suporte: S, manga: M, cubo: CU, barra: B } = T;
  const parede = T.entreAsParedes / 2;
  const circulo = (cx, cy, r) => Array.from({ length: T.lados }, (_, k) => [cx + r * Math.cos(2 * Math.PI * k / T.lados), cy + r * Math.sin(2 * Math.PI * k / T.lados)]);
  /* o suporte vai do topo do olhal ao fundo do poço traseiro da carcaça, levado do chão ao eixo pela altura do cubo traseiro */
  const topoDoSuporte = CARCACA.pocoTraseiro.fundo[0][1] - CARCACA.rodas.traseira.y;
  /* a seção da viga em [z, y] e as seções do suporte em [x, y] e do braço em [x, z] */
  const secaoDaViga = [[V.meiaProfundidade, -V.meiaAltura], [-V.meiaProfundidade, -V.meiaAltura], [-V.meiaProfundidade, V.meiaAltura], [V.meiaProfundidade, V.meiaAltura]];
  const secaoDoSuporte = [[-S.meiaLargura, O.raio], [S.meiaLargura, O.raio], [S.meiaLargura, topoDoSuporte], [-S.meiaLargura, topoDoSuporte]];
  const secaoDoBraco = [[M.braco.x[0], M.braco.z[0]], [M.braco.x[1], M.braco.z[0]], [M.braco.x[1], M.braco.z[1]], [M.braco.x[0], M.braco.z[1]]];
  /* a ponta de eixo e o cubo em [raio, x], de cada lado (s = 1 à esquerda); o do lado direito é o espelho em x, com a ordem invertida
     para a revolução manter a face de fora para fora. O anel da ponta em x = parede é colinear e não muda a forma: é o plano da porta
     da passagem. */
  const doLado = (p, s) => { const q = p.map(([r, x]) => [r, s * x]); return s > 0 ? q : q.reverse(); };
  const perfilDaPonta = (s) => doLado([[0, M.pinoX], [M.raioDaPonta, M.pinoX], [M.raioDaPonta, parede], [M.raioDaPonta, M.pontaAte], [0, M.pontaAte]], s);
  const perfilDoCubo = (s) => doLado([[0, M.pontaAte], [CU.raioDoFlange, M.pontaAte], [CU.raioDoFlange, CU.face], [CU.raioDaTampa, CU.face], [CU.raioDaTampa, CU.ateATampa], [0, CU.ateATampa]], s);
  const xDaBarra = M.braco.x[0];
  const perfilDaBarra = [[0, -xDaBarra], [B.raio, -xDaBarra], [B.raio, xDaBarra], [0, xDaBarra]];
  const portas = {
    passagemNoChassi: { forma: 'cilindro', papel: 'externa', eixo: [-1, 0, 0], centro: [parede, 0, 0], raio: M.raioDaPonta, inicio: 0, fim: T.entreAsParedes, referencia: [0, 1, 0] },
    cuboTraseiroEsquerdo: { forma: 'anel', papel: 'ocupa', eixo: [-1, 0, 0], centro: [CU.face, 0, 0], raioInterno: CU.raioDaTampa, raioExterno: CU.raioDoFlange, inicio: 0, fim: CU.face - M.pontaAte },
    cuboTraseiroDireito: { forma: 'anel', papel: 'ocupa', eixo: [1, 0, 0], centro: [-CU.face, 0, 0], raioInterno: CU.raioDaTampa, raioExterno: CU.raioDoFlange, inicio: 0, fim: CU.face - M.pontaAte },
  };
  return { circulo, topoDoSuporte, secaoDaViga, secaoDoSuporte, secaoDoBraco, perfilDaPonta, perfilDoCubo, perfilDaBarra, portas };
}

/** Monta o eixo traseiro no estado { passos, topo, origem }, em mm, com a origem do eixo levada a `em`, e devolve as origens das
 *  partes e das portas. O rascunho da máquina inteira chama esta função com o centro do cubo traseiro da carcaça. */
export function montarEixoTraseiro(estado, T = TABELA, em = [0, 0, 0]) {
  const D = derivar(T);
  const { extX, extY, extZ, booleana, parte } = ferramentas(estado);
  const [ex, ey, ez] = em;
  const unir = (...s) => booleana('unir', s);
  const novo = () => { estado.origem += 1; return estado.origem; };
  /* revolução em torno de x: o perfil é [raio, x] e `em` leva o eixo a [ex, y, z] */
  const torno = (perfil, y, z) => {
    const id = novo();
    estado.passos.push(['lathe', { origemId: id, perfil: perfil.map(([r, x]) => [r1(r), r1(x + ex)]), eixo: 'x', lados: T.lados, em: [0, r1(y + ey), r1(z + ez)] }]);
    return { origem: { op: 'lathe', id } };
  };
  /* a cópia do outro lado, pelo espelho no plano do meio da máquina */
  const espelho = (sel) => {
    const id = novo();
    estado.passos.push(['espelha', { origemId: id, eixo: 'x', pos: r1(ex), derivaDe: sel.origem, sel: { origem: sel.origem } }]);
    return { origem: { op: 'espelha', id, de: sel.origem } };
  };
  const par = (sel) => unir(sel, espelho(sel));
  const { viga: V, olhal: O, suporte: S, manga: M, barra: B } = T;
  const zy = (p) => p.map(([z, y]) => [z + ez, y + ey]);
  const xy = (p) => p.map(([x, y]) => [x + ex, y + ey]);
  const xz = (p) => p.map(([x, z]) => [x + ex, z + ez]);

  /* a viga com o olhal no meio */
  const viga = unir(extX(zy(D.secaoDaViga), -V.ate + ex, V.ate + ex), extZ(xy(D.circulo(0, 0, O.raio)), -O.meioComprimento + ez, O.meioComprimento + ez));
  parte('eixoTraseiro', viga, T.cores.eixo);
  parte('suporteTraseiro', extZ(xy(D.secaoDoSuporte), S.z[0] + ez, S.z[1] + ez), T.cores.aco);
  /* a manga esquerda: o pino-mestre unido ao braço, e a direita é o espelho deles; a ponta de eixo de cada lado é corpo próprio da
     mesma parte, que entra no pino sem união: unida, a face de dentro dela some no pino e a porta da passagem, que sai dela, fica sem
     face (o núcleo recusa porta em face consumida) */
  const manga = unir(
    extY(xz(D.circulo(M.pinoX, 0, M.raioDoPino)), -M.meiaAlturaDoPino + ey, M.meiaAlturaDoPino + ey),
    extY(xz(D.secaoDoBraco), -M.braco.meiaAltura + ey, M.braco.meiaAltura + ey),
  );
  parte('mangas', par(manga), T.cores.eixo);
  const ponta = torno(D.perfilDaPonta(1), 0, 0);
  const pontaD = torno(D.perfilDaPonta(-1), 0, 0);
  parte('mangas', ponta, T.cores.eixo);
  parte('mangas', pontaD, T.cores.eixo);
  const cuboE = torno(D.perfilDoCubo(1), 0, 0);
  const cuboD = torno(D.perfilDoCubo(-1), 0, 0);
  parte('cubosTraseiros', unir(cuboE, cuboD), T.cores.aco);
  parte('barraDirecao', torno(D.perfilDaBarra, 0, B.z), T.cores.aco);
  return { viga, ponta, manga, cuboE, cuboD };
}

/* Os campos de medida de cada operação deste eixo e das portas: neles todo número é milímetro. */
const MEDIDAS = { lathe: ['perfil', 'em'], extrusao: ['perfil', 'em', 'altura'], espelha: ['pos'] };
const MEDIDAS_DA_PORTA = ['centro', 'raio', 'raioInterno', 'raioExterno', 'inicio', 'fim'];
const emMetro = (v) => (typeof v === 'number' ? m(v) : Array.isArray(v) ? v.map(emMetro) : v);

/** Os PASSOS, em metro: a forma e, no fim, as três portas. */
export function gerarPassos(T = TABELA) {
  const estado = { passos: [], topo: {}, origem: 0 };
  const { ponta, cuboE, cuboD } = montarEixoTraseiro(estado, T);
  const forma = estado.passos.map(([op, args]) => [op, Object.fromEntries(Object.entries(args).map(([k, v]) => [k, (MEDIDAS[op] ?? []).includes(k) ? emMetro(v) : v]))]);
  const { portas } = derivar(T);
  const porta = (id, de) => ['publicarPorta', { id, de: de.origem, interface: Object.fromEntries(Object.entries(portas[id]).map(([k, v]) => [k, MEDIDAS_DA_PORTA.includes(k) ? emMetro(v) : v])) }];
  return [...forma, porta('passagemNoChassi', ponta), porta('cuboTraseiroEsquerdo', cuboE), porta('cuboTraseiroDireito', cuboD)];
}

export const CONTATOS = [
  { par: ['eixoTraseiro', 'suporteTraseiro'], motivo: 'o topo do olhal, a 70 mm do eixo, toca a face de baixo do suporte do pino de articulação' },
  { par: ['eixoTraseiro', 'mangas'], motivo: 'a ponta da viga, a 360 mm do centro, encosta no pino-mestre de cada manga' },
  { par: ['cubosTraseiros', 'mangas'], motivo: 'a ponta de eixo de cada manga acaba a 480 mm, onde a face de dentro do flange do cubo começa' },
  { par: ['barraDirecao', 'mangas'], motivo: 'cada ponta da barra de direção, a 375 mm, encosta na face de dentro do braço da manga' },
];

const receita = {
  meta: { nome: 'empilhadeira/eixo-traseiro', desc: 'eixo traseiro direcional da empilhadeira: viga com olhal de articulação e suporte, as duas mangas com pino-mestre e braço, os cubos e a barra de direção' },
  PARAMS: TABELA,
  TOPO: { origem: 'centro do eixo, no meio da máquina, sobre o eixo dos cubos traseiros; y para cima, +x à esquerda de quem dirige e a frente em +z' },
  PLANO: {
    objeto: 'eixo traseiro direcional de empilhadeira de 2,5 t, articulado no meio sob o contrapeso: a viga com o olhal e o suporte do pino de articulação, as mangas que esterçam, os cubos e a barra de direção, rodas retas',
    referencias: ['../../referencias/carcaca-tras.ia.png', '../../referencias/carcaca-lado.ia.png', '../../referencias/tras.ia.png'],
    escala: { medida: 'distância entre as faces de fora dos dois flanges dos cubos traseiros (o assento das rodas traseiras)', milimetros: 1100 },
    partes: [
      { nome: 'eixoTraseiro', forma: 'viga escura de seção 120 (em z) por 100 mm (em y) de -360 a 360 mm, com o olhal do pino de articulação no meio: cilindro de Ø 140 ao longo de z, de -110 a 110 mm', tecnica: 'seção retangular extrudada em x unida ao círculo de 96 lados extrudado em z' },
      { nome: 'suporteTraseiro', forma: 'bloco cinza de 180 mm de largura, de z 60 a 105 mm, que sobe do topo do olhal (70 mm acima do eixo) até o fundo do poço traseiro da carcaça (428 mm do chão)', tecnica: 'seção retangular em x e y extrudada em z' },
      { nome: 'mangas', forma: 'de cada lado, a manga escura: o pino-mestre vertical de Ø 80 em x 400, de 95 mm abaixo a 95 acima do eixo, a ponta de eixo de Ø 90 de 400 a 480 mm e o braço de direção de x 375 a 420, z 20 a 165 e 40 mm de altura, à frente do eixo', tecnica: 'círculo de 96 lados extrudado em y, revolução em torno de x (96 lados) e retângulo extrudado em y, unidos; a direita é o espelho da esquerda' },
      { nome: 'cubosTraseiros', forma: 'de cada lado, o flange cinza de Ø 170 de 480 a 550 mm do centro e a tampa de Ø 100 de 550 a 625', tecnica: 'revolução em torno de x (96 lados) e o espelho dela, unidos' },
      { nome: 'barraDirecao', forma: 'tubo cinza de Ø 44 de -375 a 375 mm, 140 mm à frente do eixo, de braço a braço das mangas', tecnica: 'revolução em torno de x (96 lados)' },
    ],
    criteriosDeReprovacao: [
      'os cubos fora do eixo dos poços traseiros da carcaça, ou as rodas que eles levam cruzando o contrapeso',
      'o suporte do pino de articulação sem tocar o fundo do poço traseiro, ou atravessando-o',
      'manga sem o pino-mestre vertical por dentro do pneu, ou sem o braço que leva à barra de direção',
      'a barra de direção solta dos braços, ou atrás do eixo',
      'cor trocada: a viga e as mangas cinza, ou o suporte, os cubos e a barra escuros',
    ],
  },
  contatos: CONTATOS,
  /* Os extremos que a TABELA fixa, em mm: a ponta da tampa de cada lado, o topo do suporte e a frente da barra. */
  get PONTOS() {
    const T = this.PARAMS; const CU = T.cubo; const S = T.suporte; const B = T.barra;
    const topo = CARCACA.pocoTraseiro.fundo[0][1] - CARCACA.rodas.traseira.y;
    return [
      { nome: 'ponta da tampa do cubo esquerdo', parte: 'cubosTraseiros', medida: 'maximo', em: [CU.ateATampa, CU.raioDoFlange, CU.raioDoFlange], toleranciaMm: 1 },
      { nome: 'ponta da tampa do cubo direito', parte: 'cubosTraseiros', medida: 'minimo', em: [-CU.ateATampa, -CU.raioDoFlange, -CU.raioDoFlange], toleranciaMm: 1 },
      { nome: 'topo do suporte, sob o fundo do poço traseiro', parte: 'suporteTraseiro', medida: 'maximo', em: [S.meiaLargura, topo, S.z[1]], toleranciaMm: 0.5 },
      { nome: 'frente da barra de direção', parte: 'barraDirecao', medida: 'maximo', em: [T.manga.braco.x[0], B.raio, B.z + B.raio], toleranciaMm: 1 },
    ];
  },
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
