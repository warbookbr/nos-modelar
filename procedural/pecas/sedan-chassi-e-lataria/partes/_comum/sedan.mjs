/* sedan-chassi-e-lataria/partes/_comum/sedan.mjs: o módulo comum das etapas do sedã em alta definição (fatia 4c do plano do núcleo para qualquer
 * mecanismo). Ele carrega o conjunto que o esboço do carro inteiro com o chassi aparado monta (`../../alta-definicao/chassi-aparado.esboco.mjs`, que
 * encadeia `frente-e-traseira`, `andar-de-cima`, `caminho-a-gaiola-da-casca` e o chassi do rascunho facetado), reparte as 98 partes em etapas e
 * entrega a cada receita o recorte dela (`recorte.mjs`), os contatos e as folgas que o esboço já declara para os pares da etapa, e os encaixes de
 * porta. Nenhuma forma é escrita aqui: cada passo vem do esboço, que é o que o CICLO-5.md mediu.
 *
 * O CORTE DE CONFERÊNCIA DOS PAINÉIS fica desligado (`HD_CONFERIR=0`, a menos que quem chama peça outra coisa): ele monta a chapa e as lâminas uma vez só
 * para conferir o vão antes do corte de verdade, gasta cerca de 200 s no `import` e não muda um passo. O vão que vale é o que `vao:partes` mede na malha.
 *
 * AS ETAPAS (a ordem de montagem está em `../../montagem.json`):
 *   carroceria         a lataria de baixo (painéis cortados da chapa), o teto com as molduras e o chassi aparado por essas duas chapas. O `aparar`
 *                      lê a chapa que a própria peça executou e a chapa fica na peça com as faces dela, de modo que o chassi aparado só existe
 *                      numa peça que tem também as duas chapas como partes (atrito 1 do RECEITA.md).
 *   vidros             os oito vidros, chapas próprias que passam 12 mm por baixo da borda dos vãos do teto e das portas.
 *   frente-e-traseira  os painéis da frente e de trás, as lentes, os para-choques, a tomada de ar e as lâminas da grade.
 *   rodas              as quatro rodas pela família roda-pneu.
 *   acessorios         os dois retrovisores e as quatro maçanetas. */
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { T, ladoX, topoY } from '../../alta-definicao/alvo.mjs';
import { recortar } from './recorte.mjs';

process.env.HD_CONFERIR ??= '0';
const { default: carro } = await import('../../alta-definicao/chassi-aparado.esboco.mjs');
export const CONJUNTO = carro.opcoes[0];
/* o que o esboço do carro inteiro e o rascunho facetado exportam e as receitas conferem em PONTOS (o módulo já está carregado: é o mesmo de `carro`) */
export const { RETROVISOR } = await import('../../alta-definicao/carro-inteiro.esboco.mjs');
export const { TABELA: FACETADO } = await import('../../referencias/sedan-chassi-e-lataria.esboco.mjs');
export const { linhasDeVao } = await import('../../alta-definicao/caminho-a-gaiola-da-casca.esboco.mjs');
export const { CABINE, VIDROS, MOLDURAS } = await import('../../alta-definicao/andar-de-cima.esboco.mjs');
export const { F, PAINEL_DA_FRENTE, PAINEL_DE_TRAS } = await import('../../alta-definicao/frente-e-traseira.esboco.mjs');
export const PASTA = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const NOMES = CONJUNTO.passos.filter((p) => p[0] === 'parte').map((p) => p[1].nome);
const SO_VIDROS = /^(vidro|vigia|paraBrisa$)/;
const DA_FRENTE = /^(painel|lenteDoFarol|lanterna|paraChoque|tomadaDeAr$|laminaDaGrade)/;
const RODAS = /^(pneu|aro|cubo|disco)/;
const ACESSORIOS = /^(retrovisor|macaneta)/;
export const ETAPAS = {
  vidros: NOMES.filter((n) => SO_VIDROS.test(n)),
  'frente-e-traseira': NOMES.filter((n) => DA_FRENTE.test(n)),
  rodas: NOMES.filter((n) => RODAS.test(n)),
  acessorios: NOMES.filter((n) => ACESSORIOS.test(n)),
};
const fora = new Set(Object.values(ETAPAS).flat());
ETAPAS.carroceria = NOMES.filter((n) => !fora.has(n));
if (Object.values(ETAPAS).flat().length !== NOMES.length) throw new Error('uma parte do sedã caiu em duas etapas, ou em nenhuma');
export const etapaDe = (nome) => Object.entries(ETAPAS).find(([, ns]) => ns.includes(nome))?.[0];

/** Os passos em metro, o TOPO e a origem de cada parte de uma etapa. */
export function recorteDaEtapa(etapa) {
  const { passos, topo } = recortar(CONJUNTO, ETAPAS[etapa]);
  return { passos, topo };
}

/** A origem (`{ op, id }`) que dá as faces da primeira parte nomeada de uma etapa, onde as portas se ancoram. */
export function origemDaPrimeiraParte(passos, nome) {
  const p = passos.find(([op, a]) => op === 'parte' && a.nome === nome);
  const { op, id } = p[1].sel.origem;
  return { op, id };
}

/* ---- os contatos e as folgas que o esboço declara, por etapa ---- */
const par = (c) => c.par.join('|');
const dentro = (etapa, c) => c.par.every((n) => ETAPAS[etapa].includes(n));
/** Os contatos da receita (`{ par, motivo }`): os pares `encosta` e `atravessa` do esboço com as duas partes na etapa. */
export const contatosDaEtapa = (etapa) => CONJUNTO.contatos.filter((c) => c.relacao !== 'folga' && dentro(etapa, c)).map(({ par: p, motivo }) => ({ par: p, motivo }));
/** As folgas de desenho (`FOLGAS` da receita): os pares `folga` do esboço com as duas partes na etapa. */
export const folgasDaEtapa = (etapa) => CONJUNTO.contatos.filter((c) => c.relacao === 'folga' && c.folga && dentro(etapa, c))
  .map(({ par: p, folga }) => ({ par: p, esperada: folga.esperada, tolerancia: folga.tolerancia, ...(folga.degrau !== undefined ? { degrau: folga.degrau } : {}) }));
/** As partes soltas de propósito da etapa, como a receita as declara (`APOIA`). */
export const apoiaDaEtapa = (etapa) => Object.fromEntries((CONJUNTO.apoia ?? []).filter((a) => ETAPAS[etapa].includes(a.parte)).map((a) => [a.parte, a.motivo]));
/** Os pares do esboço que cruzam duas etapas, com a relação e o motivo, para a montagem. */
export const contatosCruzados = () => CONJUNTO.contatos.filter((c) => new Set(c.par.map(etapaDe)).size > 1);
void par;

/* ---- os encaixes: o plano de cada etapa filha no pai, no referencial do carro ---- *
 * O carro é um objeto só no referencial do acervo, e cada etapa é escrita nele: o encaixe é o plano em que a filha assenta no pai, publicado pelos
 * dois com o mesmo ponto e a normal oposta, e a pose sai identidade. O ponto vem do alvo (`alvo.mjs`), e nenhum número é digitado aqui. */
const meiaLargura = T.meiaDaCabine;
const COMPRIMENTO = T.zBico - T.zTraseira;
export const ENCAIXES = {
  vidros: { pai: 'paraOsVidros', filha: 'naCarroceria', ponto: [0, T.yOmbro, 0], normal: [0, 1, 0], extensao: [2 * meiaLargura, COMPRIMENTO], referencia: [1, 0, 0],
    nota: 'os vidros assentam no plano da quina do ombro, y 890, onde a chapa de baixo acaba e o peitoril da cabine começa' },
  'frente-e-traseira': { pai: 'paraOPainelDianteiro', filha: 'naBordaDaFrente', ponto: [0, 0, T.zBico], normal: [0, 0, 1], extensao: [2 * meiaLargura, T.ladoTopo[0][1]], referencia: [1, 0, 0],
    nota: 'a frente assenta no plano da borda da frente da chapa de baixo, z 2118; o painel de trás fica a 4 mm da borda de trás por desenho' },
  rodas: { pai: 'paraAsRodas', filha: 'noEixo', ponto: [0, T.roda.raio, 0], normal: [0, 1, 0], extensao: [2 * meiaLargura, T.roda.zFrente - T.roda.zTras], referencia: [1, 0, 0],
    nota: 'as rodas giram em torno dos eixos, na altura do centro delas, y 364' },
  acessorios: { pai: 'paraOsAcessorios', filha: 'naLinhaDoOmbro', ponto: [0, T.yOmbro, 0], normal: [0, 1, 0], extensao: [2 * meiaLargura, T.zFrente - T.zTras], referencia: [1, 0, 0],
    nota: 'os retrovisores e as maçanetas ficam acima da quina do ombro, nas portas' },
};
const neg = (v) => v.map((x) => (x === 0 ? 0 : -x));
/** A interface da porta que o pai publica para a etapa filha (`recebe`), ou a que a filha publica (`apoia`, normal oposta), em mm. */
export const interfaceDoEncaixe = (filha, lado) => {
  const e = ENCAIXES[filha];
  return { forma: 'plano', papel: lado === 'pai' ? 'recebe' : 'apoia', ponto: e.ponto, normal: lado === 'pai' ? e.normal : neg(e.normal), extensao: e.extensao, referencia: e.referencia };
};

/** A normal da pele de fora da carroceria de baixo em p (mm), para fora, pelas funções do alvo: na lateral, x = ladoX(z, y); no topo, y = topoY(x, z). O ponto vale pela
 *  superfície de que ele fica mais perto, e o lado esquerdo é a imagem do direito. */
export function normalDaPele([x, y, z]) {
  const s = x < 0 ? -1 : 1; const ax = Math.abs(x); const e = 0.5;
  if (Math.abs(ax - ladoX(z, y)) <= Math.abs(y - topoY(ax, z))) {
    const dxdy = (ladoX(z, y + e) - ladoX(z, y - e)) / (2 * e); const dxdz = (ladoX(z + e, y) - ladoX(z - e, y)) / (2 * e);
    return [s, -dxdy, -dxdz];
  }
  const dydx = (topoY(ax + e, z) - topoY(ax - e, z)) / (2 * e); const dydz = (topoY(ax, z + e) - topoY(ax, z - e)) / (2 * e);
  return [-s * dydx, 1, -dydz];
}

const m = (mm) => mm / 1000;
/** Os passos `publicarPorta` de uma etapa, em metro: `portas` é { id: { parte, interface } }, com a interface em mm e a porta ancorada na origem da parte. */
export function portasEmMetro(passos, portas) {
  return Object.entries(portas).map(([id, { parte, interface: i }]) => ['publicarPorta', { id, de: origemDaPrimeiraParte(passos, parte),
    interface: Object.fromEntries(Object.entries(i).map(([k, v]) => [k, ['ponto', 'extensao'].includes(k) ? v.map(m) : v])) }]);
}

/* ---- a descrição de cada parte, para o PLANO ---- */
const L = '(Dir|Esq)?$';
const DESCRICOES = [
  [/^capo$/, 'chapa de 1 mm do capô, de x -760 a 760 até a borda da frente da chapa de baixo, a 4 mm do painel da frente e dos para-lamas', 'painel cortado da chapa de baixo por paineisPorVaos, com a linha de vão por curva da gaiola'],
  [/^paraLama/, 'chapa do arco da roda da frente, alargada até a planta, do painel da frente à porta, com a faixa de cima ao lado do capô', 'painel cortado da chapa de baixo por paineisPorVaos'],
  [/^portaDianteira/, 'porta dianteira, do fim do para-lama ao entre-portas, a 4 mm dos vizinhos, com o vão da janela fechado pelo vidro', 'painel cortado da chapa de baixo por paineisPorVaos'],
  [/^portaTraseira/, 'porta traseira, do entre-portas ao fim da porta, a 4 mm dos vizinhos', 'painel cortado da chapa de baixo por paineisPorVaos'],
  [/^lateralTraseira/, 'chapa do arco de trás, do fim da porta traseira ao painel traseiro, com a faixa de cima ao lado da tampa', 'painel cortado da chapa de baixo por paineisPorVaos'],
  [/^soleira(Dir|Esq)$/, 'chapa que veste a soleira do chassi sob as portas', 'painel cortado da chapa de baixo por paineisPorVaos'],
  [/^tampaDoPortaMalas$/, 'chapa da tampa do porta-malas, do pé do vidro traseiro à borda de trás da chapa de baixo, a 4 mm do painel de trás e do teto', 'painel cortado da chapa de baixo por paineisPorVaos'],
  [/^labio/, 'lábio de 14 mm que a chapa dobra para dentro em volta do arco de roda', 'friso com aba de 90 graus sobre a borda do arco da chapa de baixo'],
  [/^abaDoPainel/, 'aba de borda do painel de trás: a perna de 20 mm que dobra para dentro do carro, a 90 graus, em cada ponta do painel, atrás do vão de 4 mm com a lateral', 'friso com aba sobre a borda livre da última estação do painel, com a cópia espelhada pela simetria'],
  [/^forro/, 'faixa fina por trás de um vão entre painéis, que fecha o fundo dele: a luz que passa pelo vão encontra o forro e não o outro lado do carro', 'gaiolaVarrida de seção retangular ao longo da linha do vão, a 0,5 mm atrás da pele de dentro'],
  [/^teto$/, 'teto com as colunas A, B e C, a calha sobre as portas e os vãos do para-brisa, do vidro traseiro, das janelas das portas e das vigias', 'gaiolaPorEstacoes ao longo de z com simetria em x e raio pedido nas quinas'],
  [/^moldura/, 'moldura de borracha de 14 por 3,9 mm em volta do vão de um vidro, que desce 0,9 mm na chapa', 'friso com perfil retangular sobre a borda do vão, refinado em dois níveis'],
  [/^vidro|^vigia|^paraBrisa$/, 'chapa de 4 mm do vidro, com a face de fora 0,8 mm para dentro da pele, que passa 12 mm da borda do vão por baixo da chapa', 'gaiolaPorEstacoes de chapa própria com espessura; o lado esquerdo é a cópia espelhada do direito'],
  [/^painelDianteiro$/, 'painel da frente de 1 mm no plano z 2118, com a grade até o eixo e os dois vãos de farol em rebaixo de 14 mm', 'gaiolaPorEstacoes ao longo de x com vãos e anéis de relevo'],
  [/^painelTraseiro$/, 'painel de trás de 1 mm no plano z -2083, com os dois vãos de lanterna em rebaixo de 14 mm', 'gaiolaPorEstacoes ao longo de x com vãos e anéis de relevo'],
  [/^lenteDoFarol|^lanterna(Dir|Esq)$/, 'lente de 4 mm atrás da abertura do rebaixo, 0,8 mm dentro dela e 6 mm maior de cada lado', 'lente do anel de relevo, devolvida pela gaiola; o lado esquerdo é a cópia espelhada'],
  [/^paraChoque/, 'barra de ponta a ponta com quinas de raio 8 mm e ponta de raio 6 mm, 4 mm fora do painel', 'gaiolaPorLacos ao longo de x, com o vinco da ponta cruzado pelo núcleo'],
  [/^tomadaDeAr$/, 'chapa sobre o capô de z 790 a 1760, aberta na frente e fundida no capô atrás, de 70 mm de altura', 'gaiolaPorEstacoes ao longo de z com simetria em x'],
  [/^laminaDaGrade/, 'lâmina horizontal de 7 mm de altura e 28 de fundo atrás do vão da grade', 'cubo que passa 17 mm da borda do vão por trás da chapa'],
  [/^retrovisor/, 'retrovisor de laços com raio 6 mm nas quatro quinas, o pé 11 mm dentro da porta dianteira', 'gaiolaPorLacos ao longo de x; o esquerdo é a cópia espelhada do direito'],
  [/^macaneta/, 'maçaneta de 110 por 22 mm que sai 11 mm da porta e entra 3 mm nela', 'cubo'],
  [/^(pneu|aro|cubo|disco)/, 'parte da roda de pneu de 728 mm e 205 de banda, como a família roda-pneu a faz', 'família roda-pneu por instanciaDeFamilia, posta no eixo'],
  [/^eixo/, 'eixo de Ø 60, de roda a roda, sob as longarinas', 'revolução em torno de x'],
  [/^(assoalho|tunel)/, 'assoalho e túnel da plataforma do chassi', 'extrusão e união de caixas'],
  [/^longarina|^travessa|^suporte|^parede|^anteparo|^caixaDeRoda|^soleiraDoChassi|^montante|^reforco/, 'membro do chassi, aparado pelo lado de dentro da lataria a 0,5 mm da pele de dentro onde ela o limita', 'extrusão ou caixa do rascunho facetado, cortada pela operação aparar com as duas chapas da lataria'],
];
export function parteDoPlano(nome) {
  const d = DESCRICOES.find(([re]) => re.test(nome));
  if (!d) throw new Error(`sem descrição de plano para a parte ${nome}`);
  return { nome, forma: d[1], tecnica: d[2] };
}
void L;
