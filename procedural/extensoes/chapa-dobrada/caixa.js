/* caixa.js — a caixa de chapa de cantos abertos, como sai da dobradeira: a base plana com uma aba dobrada em cada uma das
   quatro bordas, o alívio de canto e o planificado da peça inteira, em milímetro, montada como passos da receita sobre a
   `chapaDobrada`. Os cantos ficam abertos porque a chapa leva um recorte em cada canto (o alívio) para as dobras vizinhas
   não se amassarem; na peça pronta o fabricante solda e lixa os cantos ou fecha com uma orelha rebitada, e isso não é
   feito aqui. Serve como o fundo, a tampa ou a bandeja de um gabinete, ou como a peça antes da solda.

   A caixa tem as quatro bordas com aba. A base é o retângulo largura × profundidade no plano [x, z], com a linha média da espessura em y = 0. Cada aba é uma
   `chapaDobrada` de duas abas: a primeira, curta, entra `sobreposicao` na base (o trecho que a `unir` funde), e a dobra de
   90° (para cima, +y, ou para baixo) leva à aba de altura pedida. A chapa dobrada nasce com a primeira aba ao longo de +x,
   a dobra para +y e a largura em z; o passo `rotaciona` em y leva +x à normal de fora da borda e o `transladar` leva a
   origem à borda, recuada a sobreposição. Nos cantos em que duas abas se encontram, cada aba é encurtada pelo alívio de
   canto retangular, de raio interno + espessura + folga, e as duas não se tocam.

   O planificado é o retângulo da base com cada aba aberta para fora: a largura da aba por (desenvolvimento da dobra + altura
   da aba), com o desenvolvimento |ângulo| · (raio + fatorK · espessura) da mesma `medidasDaChapa` da extensão, e o canto
   aberto pelo alívio.

   FICHA passosDaCaixaDeChapa
   serve: a caixa de chapa dobrada de cantos abertos, como sai da dobradeira: a base retangular com uma aba dobrada a 90° em
     cada uma das quatro bordas, a fresta do alívio de canto e a área do planificado, como passos da receita numa parte. Os
     cantos não são soldados nem fechados por orelha.
   quando: bandeja, tampa ou fundo de gabinete de chapa em que a fresta dos cantos pode ficar; o perfil em U ou em L, que é
     uma seção só, sai direto da `chapaDobrada`.
   unidades: mm nos parâmetros; os passos saem em metro.
   campos:
     largura: a largura da base em x.
     profundidade: a profundidade da base em z.
     espessura: a espessura da chapa.
     raioInterno: o raio de dentro das dobras.
     alturaDaAba: a altura reta de cada aba.
     sentido: 1 para as abas para cima, −1 para baixo.
     folgaDoAlivio: a folga do alívio de canto (padrão 0,5 mm).
     fatorK: a linha neutra para o planificado (padrão o da extensão).
   devolve: { passos, origem, ultimoId, geometria } com a geometria { base, abas, alivio, areaDoPlanificado }.
   exemplo:
     passosDaCaixaDeChapa({ largura: 200, profundidade: 120, espessura: 1.5, raioInterno: 2, alturaDaAba: 40 })
   peça: tools/fixtures/casca-chapa-e-gabinete/gabinete-de-chapa.mjs (a base e a tampa de chapa do gabinete).
   FIM DA FICHA */
import { medidasDaChapa } from './chapa.js';

const BORDAS = Object.freeze(['frente', 'direita', 'tras', 'esquerda']);

export function geometriaDaCaixaDeChapa({ largura: W, profundidade: D, espessura: t, raioInterno: r, alturaDaAba: h, bordas = BORDAS, sentido = 1, folgaDoAlivio = 0.5, fatorK } = {}) {
  /* a base com uma aba em cada uma das quatro bordas, dobrada para cima (sentido 1) ou para baixo (−1) */
  for (const b of bordas) if (!BORDAS.includes(b)) throw new Error(`caixa de chapa: a borda '${b}' não existe; aceitas: ${BORDAS.join(', ')}`);
  const alivio = r + t + folgaDoAlivio;
  /* com uma borda sem aba, a ponta da aba vizinha fica rente à lateral da base, e a união não fecha a malha; o perfil em U
     ou em L, que é uma seção só, já sai da `chapaDobrada` */
  if (!BORDAS.every((b) => bordas.includes(b))) throw new Error(`caixa de chapa: as bordas [${bordas.join(', ')}] deixam a ponta de uma aba rente à lateral da base; aceito: as quatro bordas (caixa); para o perfil em U ou em L use a chapaDobrada com as abas da seção`);
  const sobreposicao = Math.min(t, Math.min(W, D) / 4);
  const borda = {
    frente: { normal: [0, -1], meio: [0, -D / 2], comprimento: W, },
    direita: { normal: [1, 0], meio: [W / 2, 0], comprimento: D, },
    tras: { normal: [0, 1], meio: [0, D / 2], comprimento: W, },
    esquerda: { normal: [-1, 0], meio: [-W / 2, 0], comprimento: D, },
  };
  const abas = bordas.map((nome) => {
    const b = borda[nome];
    const larguraDaAba = b.comprimento - 2 * alivio;
    const chapa = { espessura: t, raioInterno: r, largura: larguraDaAba, abas: [{ comprimento: sobreposicao, angulo: 90 * sentido }, { comprimento: h }], ...(fatorK !== undefined ? { fatorK } : {}) };
    const graus = (Math.atan2(-b.normal[1], b.normal[0]) * 180) / Math.PI;
    const origem = [b.meio[0] - b.normal[0] * sobreposicao, b.meio[1] - b.normal[1] * sobreposicao];
    return { nome, chapa, graus, origem, larguraDaAba, desenvolvimento: medidasDaChapa(chapa).desenvolvimentoDasDobras };
  });
  const areaDoPlanificado = W * D + abas.reduce((s, a) => s + a.larguraDaAba * (a.desenvolvimento + h), 0);
  return { base: { largura: W, profundidade: D, espessura: t }, abas, alivio, sobreposicao, areaDoPlanificado };
}

/** Os passos da receita (metro) da caixa de chapa, a partir do `origemId` dado; devolve os passos e a origem da peça unida. */
export function passosDaCaixaDeChapa(q, { origemId = 1, parte = 'chapa' } = {}) {
  const g = geometriaDaCaixaDeChapa(q);
  const m = (mm) => mm / 1000;
  const PASSOS = [];
  let id = origemId;
  const base = id;
  PASSOS.push(['extrusao', { origemId: base, perfil: { retangulo: { largura: m(g.base.largura), profundidade: m(g.base.profundidade) } }, altura: m(g.base.espessura), em: [0, -m(g.base.espessura / 2), 0] }]);
  const solidos = [{ origem: { op: 'extrusao', id: base } }];
  for (const a of g.abas) {
    id += 1;
    const c = a.chapa;
    PASSOS.push(['chapaDobrada', { origemId: id, espessura: m(c.espessura), raioInterno: m(c.raioInterno), largura: m(c.largura), abas: c.abas.map((x) => ({ ...x, comprimento: m(x.comprimento) })) }]);
    const sel = { origem: { op: 'chapaDobrada', id } };
    PASSOS.push(['rotaciona', { eixo: 'y', graus: a.graus, pivo: [0, 0, 0], sel }]);
    PASSOS.push(['transladar', { d: [m(a.origem[0]), 0, m(a.origem[1])], sel }]);
    solidos.push(sel);
  }
  id += 1;
  PASSOS.push(['unir', { origemId: id, solidos }]);
  PASSOS.push(['parte', { nome: parte, sel: { origem: { op: 'unir', id } } }]);
  return { passos: PASSOS, origem: { op: 'unir', id }, ultimoId: id, geometria: g };
}

