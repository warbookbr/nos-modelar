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
import { readFileSync } from 'node:fs';
import { derivar, FRACAO_DO_CHANFRO, CHANFRO_MAXIMO_DO_OMBRO_MM, FRACAO_DO_CHANFRO_NA_LARGURA } from '../../../../familias/roda-pneu/derivar.js';
import { T, ladoX, topoY } from '../../alta-definicao/alvo.mjs';
import { recortar } from './recorte.mjs';

process.env.HD_CONFERIR ??= '0';
const { default: carro } = await import('../../alta-definicao/chassi-aparado.esboco.mjs');
export const CONJUNTO = carro.opcoes[0];
/* o que o esboço do carro inteiro e o rascunho facetado exportam e as receitas conferem em PONTOS (o módulo já está carregado: é o mesmo de `carro`) */
export const { RETROVISOR } = await import('../../alta-definicao/carro-inteiro.esboco.mjs');
export const { TABELA: FACETADO, PARAMETROS_DA_RODA, PERFIL_DA_RODA } = await import('../../referencias/sedan-chassi-e-lataria.esboco.mjs');
export const { linhasDeVao } = await import('../../alta-definicao/caminho-a-gaiola-da-casca.esboco.mjs');
export const { CABINE, VIDROS, MOLDURAS } = await import('../../alta-definicao/andar-de-cima.esboco.mjs');
export const { F, PAINEL_DA_FRENTE, PAINEL_DE_TRAS } = await import('../../alta-definicao/frente-e-traseira.esboco.mjs');
export const PASTA = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/* As medidas das partes da roda, em mm, vêm de `derivar` da família roda-pneu com o perfil e os parâmetros da instância (o furo central e o ombro em arco), e não de conta à mão. */
const RODA = (() => {
  const perfil = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..', 'familias', 'roda-pneu', 'familia.json'), 'utf8')).perfis[PERFIL_DA_RODA].parametros;
  const p = { ...perfil, ...PARAMETROS_DA_RODA };
  const a = derivar(p).argumentos; const mm = (v) => v * 1000;
  const flanco = mm(a.raioDoFriso - a.raioDoAssento);
  return {
    pneu: { diametro: 2 * mm(a.raioDoFriso), banda: 2 * mm(a.meiaLargura), flanco, ombro: Math.min(FRACAO_DO_CHANFRO * flanco, CHANFRO_MAXIMO_DO_OMBRO_MM, FRACAO_DO_CHANFRO_NA_LARGURA * 2 * mm(a.meiaLargura)) },
    aro: { diametro: 2 * mm(a.raioDoAssento), largura: 2 * mm(a.meiaLarguraDoAro), parede: mm(a.raioDoAssento - a.raioInternoDoAro) },
    disco: { espessura: mm(a.fimDaChapa - a.inicioDaChapa), ventilacao: p.furosDeVentilacao ?? 0 },
    cubo: { diametro: 2 * mm(a.raioDoCubo), largura: mm(a.fimDoCubo - a.inicioDoCubo), furos: a.furos, diametroDoFuro: mm(a.diametroDoFuro), circulo: 2 * mm(a.raioDoCirculoDeFuros), furoCentral: 2 * mm(a.raioDoFuroCentral) },
  };
})();
const f1 = (v) => v.toFixed(1).replace('.', ',');
const f0 = (v) => String(Math.round(v));
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
/* As folgas de painel que o esboço declara em 4,1 ± 0,1 mm com o degrau de 0,3, e que a malha mede de outro jeito sem que haja defeito de ponto ou de estação a corrigir: o valor
   verdadeiro, medido sobre o carro montado pelas cinco receitas (`vao:partes --por=p05`, 2026-11-12), com o motivo. O que a medida acha fora da faixa e é correção local (o vão do painel
   dianteiro com o para-choque) não está aqui: foi corrigido na forma. */
const DOIS_LADOS = (a, b) => [[a, b], [a.replace(/Dir$/, 'Esq'), b.replace(/Dir$/, 'Esq')]];
export const FOLGAS_MEDIDAS = [
  { pares: [['capo', 'teto'], ['tampaDoPortaMalas', 'teto']], folga: { esperada: 4.0, tolerancia: 0.1, degrau: 1.2 },
    motivo: 'o vão é o nominal de 4,0 mm (p05 de 3,998, no limite de baixo da faixa de 4,0 a 4,2 que o esboço declara), e o desnível entre a pele do capô, ou da tampa, e a do pé do teto é de 1,01 mm de mediana e 1,10 de máximo ao longo de todo o pé do para-brisa e do vidro traseiro: é a forma do pé, e não um ponto' },
  { pares: [...DOIS_LADOS('paraLamaDir', 'teto'), ...DOIS_LADOS('lateralTraseiraDir', 'teto')], folga: { esperada: 4.0, tolerancia: 0.1, degrau: 1.1 },
    motivo: 'o vão é de 4,000 mm em toda a linha; o desnível de 1,009 mm aparece só no canto em que a linha chega ao pé do para-brisa ou do vidro traseiro, e a mediana é zero' },
  { pares: [...DOIS_LADOS('capo', 'paraLamaDir')], folga: { esperada: 4.1, tolerancia: 0.1, degrau: 3.4 },
    motivo: 'o desnível de 3,35 mm é de 1 mm de linha só, no canto da frente (x 679, y 972, z 2116), onde a quina do para-lama de raio 6 vira o canto da planta e o capô acaba na borda do painel; no resto da linha a mediana é zero e o vão tem p05 de 4,02' },
  { pares: [['capo', 'painelDianteiro']], folga: { esperada: 4.1, tolerancia: 0.1, degrau: 0.6 },
    motivo: 'o desnível chega a 0,58 mm perto da ponta do capô (x 674, y 970), onde o capô acaba na curva do canto da planta; a mediana é 0,14 e o vão é de 4,009 a 4,035' },
  { pares: [...DOIS_LADOS('painelDianteiro', 'paraLamaDir')], folga: { esperada: 4.0, tolerancia: 0.75, degrau: 0.5 },
    motivo: 'a borda do painel dianteiro segue a do para-lama por trechos retos entre as colunas, e o vão sai de 3,28 a 4,67 mm (p05 e p95) com 0,45 de desnível; o canto de cima, em que a quina do para-lama de raio 6 chega a 2,06 mm de uma quina viva do painel, entra no p05' },
  { pares: [...DOIS_LADOS('lateralTraseiraDir', 'painelTraseiro')], folga: { esperada: 3.35, tolerancia: 1.35, degrau: 0.3 },
    motivo: 'a borda do painel de trás segue a da lateral por trechos retos entre as colunas, e a lateral tem o degrau do ombro (y 890) e a quina da cintura de raio 6: o vão sai de 2,03 a 4,63 mm (p05 e p95), com 1,39 mm no canto de cima (x 856, y 971) e 2,28 no ombro' },
  { pares: [['painelTraseiro', 'tampaDoPortaMalas']], folga: { esperada: 3.9, tolerancia: 0.2, degrau: 0.3 },
    motivo: 'o vão é de 4,00 a 4,05 mm em toda a borda de cima e cai a 3,26 mm só no canto com a lateral (x 757, y 971), onde a borda do painel de trás vira a quina da cintura; o p05 é de 3,73' },
  /* Os 16 pares de apoio do chassi declarados em 0,5 ± 0,5 e medidos com p95 de 3 a 11 mm (rodada 2 de 2026-11-12), mais os dois do montante A com o teto, que a limpeza das lascas deixou de 0,50 a 0,80. A
     declaração estava errada, e a forma não: o 0,5 do desenho é a distância 3D da pele de dentro da chapa ao membro (de 0,46 a 0,50 mm, na medida de cada linha), e o `vao:partes` mede o vão de borda a borda ao
     longo da linha comum, que sobe onde o membro acaba antes da borda do painel. A malha do chassi é a mesma a menos de 1 nm (comparada com a do commit anterior, parte por parte), e por isso a faixa é a que a
     medida acha, com 0,05 mm de margem, e não o que a forma deveria ter. */
  { pares: [...DOIS_LADOS('montanteADir', 'portaDianteiraDir')], folga: { esperada: 5.87, tolerancia: 5.27 },
    motivo: 'o montante A (z 600 a 696) assenta a 0,5 mm da borda da porta no pé da dobradiça, em z 688 (3D mínimo de 0,46 a 0,47); no resto da linha comum a borda do montante fica de 0,7 a 11 mm da da porta, onde ele acaba antes dela' },
  { pares: [...DOIS_LADOS('paraLamaDir', 'paredeCortaFogo')], folga: { esperada: 9.21, tolerancia: 1.37 },
    motivo: 'a parede corta-fogo (z 700 a 703) fica de 7,9 a 10,5 mm atrás da borda do para-lama (z 690); o apoio de 0,5 mm é a distância 3D de 0,48 mm entre as peles, em x 875' },
  { pares: [...DOIS_LADOS('soleiraDir', 'soleiraDoChassiDir')], folga: { esperada: 5.47, tolerancia: 2.6 },
    motivo: 'a soleira do chassi apoia a 0,5 mm da chapa da soleira (3D mínimo de 0,50), e a borda dela fica de 2,9 a 8,0 mm da borda da chapa ao longo dos 1.010 mm da linha' },
  { pares: [...DOIS_LADOS('lateralTraseiraDir', 'montanteCDir')], folga: { esperada: 8.06, tolerancia: 0.11 },
    motivo: 'o montante C apoia a 0,5 mm da pele de dentro da lateral (3D mínimo de 0,50), e o batente dele fica a 8,0 a 8,1 mm da borda da lateral' },
  { pares: [['anteparoTraseiro', 'tampaDoPortaMalas']], folga: { esperada: 4.93, tolerancia: 2.79 },
    motivo: 'a tampa assenta 2 mm acima do topo do anteparo, e a borda do anteparo (z -1360 a -1340) fica de 2,2 a 7,7 mm da da tampa ao longo dos 3 m da linha (3D mínimo de 1,77)' },
  { pares: [['capo', 'suporteDoRadiador']], folga: { esperada: 3.89, tolerancia: 3.13 },
    motivo: 'o capô assenta a 0,5 mm do topo do suporte do radiador (3D mínimo de 0,50), e a borda do suporte fica de 0,8 a 7,0 mm da do capô ao longo dos 3,1 m da linha' },
  { pares: [...DOIS_LADOS('montanteBDir', 'portaDianteiraDir'), ...DOIS_LADOS('montanteBDir', 'portaTraseiraDir')], folga: { esperada: 3.23, tolerancia: 2.78 },
    motivo: 'o montante B (z -75 a -15) fica a 0,5 mm da porta no pé da coluna (3D mínimo de 0,50), e a borda dele fica de 0,5 a 6,0 mm da da porta ao longo dos 1.184 mm da linha' },
  { pares: [...DOIS_LADOS('anteparoTraseiro', 'lateralTraseiraDir')], folga: { esperada: 1.75, tolerancia: 1.3 },
    motivo: 'o anteparo (z -1360 a -1340) assenta a 0,5 mm da pele de dentro da lateral (3D mínimo de 0,497) no pé, e a borda dele fica a 0,5 mm na metade da linha (mediana) e a 3,0 a 3,7 mm (p95 e máximo), na quina de cima' },
  { pares: [...DOIS_LADOS('montanteADir', 'teto')], folga: { esperada: 0.66, tolerancia: 0.21 },
    motivo: 'o montante A apoia a 0,5 mm do teto (3D mínimo de 0,499, mediana de 0,50) e a borda dele sobe a 0,8 mm (p95) e a 1,24 mm (máximo, em x 805 e z 696); a linha comum que a medida amostra passou de 88 a 241 mm depois da união das lascas da borda, com a malha igual a 1 nm' },
];
const ajusteDe = ([a, b]) => FOLGAS_MEDIDAS.find((f) => f.pares.some(([x, y]) => (x === a && y === b) || (x === b && y === a)));
/** A folga declarada de um contato `folga` do esboço, com o valor medido no lugar do 4,1 ± 0,1 onde `FOLGAS_MEDIDAS` o corrige. */
export const folgaDoContato = (c) => ({ ...c.folga, ...(ajusteDe(c.par)?.folga ?? {}) });
/** As folgas de desenho (`FOLGAS` da receita): os pares `folga` do esboço com as duas partes na etapa. */
export const folgasDaEtapa = (etapa) => CONJUNTO.contatos.filter((c) => c.relacao === 'folga' && c.folga && dentro(etapa, c))
  .map((c) => { const f = folgaDoContato(c); return { par: c.par, esperada: f.esperada, tolerancia: f.tolerancia, ...(f.degrau !== undefined ? { degrau: f.degrau } : {}) }; });
/** As folgas de desenho de todos os pares do carro, para a receita que reúne as cinco etapas. */
export const folgasDoCarro = () => CONJUNTO.contatos.filter((c) => c.relacao === 'folga' && c.folga)
  .map((c) => { const f = folgaDoContato(c); return { par: c.par, esperada: f.esperada, tolerancia: f.tolerancia, ...(f.degrau !== undefined ? { degrau: f.degrau } : {}) }; });
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
  [/^paraLama/, 'chapa do arco da roda da frente, alargada até a planta, do painel da frente à porta, com a faixa de cima ao lado do capô e o canto da planta de 82 por 62 mm com que ela vira para a frente, que a curvatura mostra como faixa', 'painel cortado da chapa de baixo por paineisPorVaos'],
  [/^portaDianteira/, 'porta dianteira, do fim do para-lama ao entre-portas, a 4 mm dos vizinhos, com o vão da janela fechado pelo vidro', 'painel cortado da chapa de baixo por paineisPorVaos'],
  [/^portaTraseira/, 'porta traseira, do entre-portas ao fim da porta, a 4 mm dos vizinhos', 'painel cortado da chapa de baixo por paineisPorVaos'],
  [/^lateralTraseira/, 'chapa do arco de trás, do fim da porta traseira ao painel traseiro, com a faixa de cima ao lado da tampa', 'painel cortado da chapa de baixo por paineisPorVaos'],
  [/^soleira(Dir|Esq)$/, 'chapa que veste a soleira do chassi sob as portas', 'painel cortado da chapa de baixo por paineisPorVaos'],
  [/^tampaDoPortaMalas$/, 'chapa da tampa do porta-malas, do pé do vidro traseiro à borda de trás da chapa de baixo, a 4 mm do painel de trás e do teto', 'painel cortado da chapa de baixo por paineisPorVaos'],
  [/^labio/, 'lábio de 14 mm que a chapa dobra para dentro em volta do arco de roda', 'friso com aba de 90 graus sobre a borda do arco da chapa de baixo'],
  [/^abaDoPainel/, 'aba de borda do painel de trás: a perna de 20 mm que dobra para dentro do carro, a 90 graus, em cada ponta do painel, atrás do vão de 4 mm com a lateral', 'friso com aba sobre a borda livre da última estação do painel, com a cópia espelhada pela simetria'],
  [/^forro/, 'trechos curtos de faixa (24 por 1 mm) por trás do vão entre painéis, só onde ele deixaria ver através do carro (capô, tampa, entre-portas, fim do para-lama), a plaquinha de 5,4 mm do canto de trás e a faixa em L do peitoril', 'faixa de seção retangular ao longo da linha do vão, a 0,5 mm atrás da pele de dentro, unida em uma parte só'],
  [/^teto$/, 'teto com as colunas A, B e C, a calha sobre as portas e os vãos do para-brisa, do vidro traseiro, das janelas das portas e das vigias', 'gaiolaPorEstacoes ao longo de z com simetria em x e raio pedido nas quinas'],
  [/^moldura/, 'moldura de borracha de 14 por 3,9 mm em volta do vão de um vidro, que desce 0,9 mm na chapa', 'friso com perfil retangular sobre a borda do vão, refinado em dois níveis'],
  [/^vidroDianteiro|^vidroTraseiroDaPorta|^vigia/, 'chapa de 4 mm do vidro, 0,8 mm para dentro da pele, maior que o vão: passa 12 mm da borda e o contorno não é o do vão; a ponta é truncada e fica sob a chapa e a moldura, com o degrau no canto de baixo', 'gaiolaPorEstacoes de chapa própria com espessura; o lado esquerdo é a cópia espelhada do direito'],
  [/^vidro|^vigia|^paraBrisa$/, 'chapa de 4 mm do vidro, 0,8 mm para dentro da pele, por dentro da chapa do teto, encostada na face de dentro da borda do vão e 12 mm além dela; o anel escuro em volta é a moldura da carroceria', 'gaiolaPorEstacoes de chapa própria com espessura; o lado esquerdo é a cópia espelhada do direito'],
  [/^painelDianteiro$/, 'painel da frente de 1 mm em z 2118, com a grade até o eixo e vãos de farol em rebaixo de 14 mm, que acaba a 10 mm da borda; a subida de 32 mm até o plano é a mancha de curvatura junto do canto', 'gaiolaPorEstacoes ao longo de x com vãos e anéis de relevo'],
  [/^painelTraseiro$/, 'painel de trás de 1 mm em z -2083, com vãos de lanterna em rebaixo de 14 mm; o contorno segue a lateral, mais larga que o para-choque (856): 881 mm em y 670, 25 além da ponta dele, e 856 em y 970', 'gaiolaPorEstacoes ao longo de x com vãos e anéis de relevo'],
  [/^lenteDoFarol|^lanterna(Dir|Esq)$/, 'lente de 4 mm atrás da abertura do rebaixo, 0,8 mm dentro dela e 6 mm maior de cada lado', 'lente do anel de relevo, devolvida pela gaiola; o lado esquerdo é a cópia espelhada'],
  [/^paraChoque/, 'barra de ponta a ponta com quinas de raio 8 mm e ponta de raio 6 mm, 4 mm fora do painel', 'gaiolaPorLacos ao longo de x, com o vinco da ponta cruzado pelo núcleo'],
  [/^tomadaDeAr$/, 'chapa sobre o capô de z 790 a 1760, aberta na frente e fundida no capô atrás, de 70 mm de altura', 'gaiolaPorEstacoes ao longo de z com simetria em x'],
  [/^laminaDaGrade/, 'lâmina horizontal de 7 mm de altura e 28 de fundo atrás do vão da grade', 'cubo que passa 17 mm da borda do vão por trás da chapa'],
  [/^retrovisor/, 'retrovisor de laços com raio 6 mm nas quatro quinas, o pé 11 mm dentro da porta dianteira', 'gaiolaPorLacos ao longo de x; o esquerdo é a cópia espelhada do direito'],
  [/^macaneta/, 'maçaneta de 110 por 22 mm que sai 11 mm da porta e entra 3 mm nela', 'cubo'],
  [/^pneu/, `pneu de ${f0(RODA.pneu.diametro)} mm de diâmetro e ${f0(RODA.pneu.banda)} de banda, flanco de ${f0(RODA.pneu.flanco)} mm e ombro em arco de quarto de círculo de ${f0(RODA.pneu.ombro)} mm de raio`, 'família roda-pneu por instanciaDeFamilia, perfil carro com ombroRedondo; revolução do perfil do pneu'],
  [/^aro/, `aro de ${f0(RODA.aro.diametro)} mm de diâmetro e ${f0(RODA.aro.largura)} de largura, de parede de ${f1(RODA.aro.parede)} mm, que o pneu abraça`, 'família roda-pneu por instanciaDeFamilia, perfil carro; revolução do perfil do aro'],
  [/^disco/, `disco liso de ${f1(RODA.disco.espessura)} mm de espessura, sem ventilação, entre o aro e o cubo`, 'família roda-pneu por instanciaDeFamilia, perfil carro; chapa de revolução'],
  [/^cubo/, `cubo de ${f0(RODA.cubo.diametro)} mm de diâmetro e ${f0(RODA.cubo.largura)} de largura, com ${RODA.cubo.furos} furos de ${f0(RODA.cubo.diametroDoFuro)} mm no círculo de ${f0(RODA.cubo.circulo)} e o furo central de ${f0(RODA.cubo.furoCentral)} mm, o diâmetro do eixo`, 'família roda-pneu por instanciaDeFamilia, com diametroFuroCentral do eixo; furos por subtrair, limparLascas'],
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
