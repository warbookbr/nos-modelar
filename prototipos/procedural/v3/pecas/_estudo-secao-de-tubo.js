/* _estudo-secao-de-tubo.js — FIXTURE de estudo, não é peça de acervo.
 *
 * PARA QUE SERVE. O quadro da bicicleta saiu com tubos perfeitamente redondos e
 * não pareceu com a referência, que é um quadro de alumínio hidroformado: seção
 * ovalada, com faces quase planas, e que MUDA ao longo do tubo. A pergunta é se
 * isso é limitação do motor. Não é: `loft` aceita `{pos, contorno}` além de
 * `{pos, raio}`, e o contorno pode ser diferente em cada seção.
 *
 * Quatro variantes do MESMO tubo, lado a lado, para escolher olhando:
 *   A redondo          — o que o quadro tem hoje
 *   B ovalado          — superelipse de expoente 2, achatada
 *   C caixa arredondada — superelipse de expoente 5, faces quase planas
 *   D hidroformado     — a seção MUDA: redonda na base, larga e chata no meio,
 *                        alta e estreita no topo
 *
 * A SUPERELIPSE DÁ EXATAMENTE `lados` PONTOS, e isso importa: o motor recusa
 * contorno que, depois de expandir concordâncias, não tenha exatamente `lados`.
 * Uma fórmula contínua nunca erra essa contagem; uma lista escrita à mão erra.
 */

const LADOS = 24;
const COMPRIMENTO = 400;
const m = (v) => v / 1000;

/** Superelipse com `LADOS` pontos. expoente 2 = elipse; acima disso as faces
 *  achatam e os cantos viram raio curto, que é o desenho de tubo hidroformado. */
function secao(largura, altura, expoente = 2) {
  const a = largura / 2;
  const b = altura / 2;
  const p = 2 / expoente;
  const pts = [];
  for (let i = 0; i < LADOS; i += 1) {
    const t = (2 * Math.PI * i) / LADOS;
    const c = Math.cos(t);
    const s = Math.sin(t);
    pts.push([
      m(a * Math.sign(c) * Math.abs(c) ** p),
      m(b * Math.sign(s) * Math.abs(s) ** p),
    ]);
  }
  return pts;
}

const ID = { redondo: 201, ovalado: 202, caixa: 203, hidro: 204 };

/* Cada tubo corre em Z e fica deslocado em X, para as quatro seções aparecerem
   lado a lado na vista de frente. `orientacao` declara para onde aponta o eixo
   local +u do contorno: com o caminho em Z, [1,0,0] põe a largura em X. */
const emZ = (x, f) => ({ pos: [m(x), m(200), m(-COMPRIMENTO / 2 + f * COMPRIMENTO)] });

function gerarPassos() {
  const passos = [];
  const tubo = (origemId, x, secoes) => passos.push(['loft', {
    origemId, lados: LADOS, orientacao: [1, 0, 0], secoes,
  }]);
  const polo = (x, f) => ({ ...emZ(x, f), raio: 0 });

  tubo(ID.redondo, -180, [
    polo(-180, -0.01),
    { ...emZ(-180, 0), contorno: secao(46, 46, 2) },
    { ...emZ(-180, 1), contorno: secao(46, 46, 2) },
    polo(-180, 1.01),
  ]);
  tubo(ID.ovalado, -60, [
    polo(-60, -0.01),
    { ...emZ(-60, 0), contorno: secao(64, 34, 2) },
    { ...emZ(-60, 1), contorno: secao(64, 34, 2) },
    polo(-60, 1.01),
  ]);
  tubo(ID.caixa, 60, [
    polo(60, -0.01),
    { ...emZ(60, 0), contorno: secao(64, 34, 5) },
    { ...emZ(60, 1), contorno: secao(64, 34, 5) },
    polo(60, 1.01),
  ]);
  tubo(ID.hidro, 180, [
    polo(180, -0.01),
    { ...emZ(180, 0), contorno: secao(46, 46, 2.4) },
    { ...emZ(180, 0.35), contorno: secao(72, 36, 4.5) },
    { ...emZ(180, 0.7), contorno: secao(58, 46, 4) },
    { ...emZ(180, 1), contorno: secao(40, 52, 3) },
    polo(180, 1.01),
  ]);

  for (const [nome, id] of Object.entries(ID)) {
    passos.push(['parte', { nome, sel: { origem: { op: 'loft', id } } }]);
    passos.push(['material', { usa: 'aluminioBranco', sel: { grupo: nome } }]);
    passos.push(['solido', { sel: { grupo: nome } }]);
  }
  return passos;
}

export const receitaEstudoSecaoDeTubo = {
  meta: {
    nome: 'Estudo de seção de tubo',
    versao: '0.1.0',
    autor: 'Mecanifica Procedural AI',
    desc: 'fixture: quatro seções de tubo lado a lado, para escolher a do quadro',
  },
  PARAMS: { lados: LADOS, comprimento: COMPRIMENTO },
  /* Quatro tubos separados no espaço: nenhum encosta em nenhum. */
  contatos: [],
  TOPO: { estudo: 'comparar seção redonda, ovalada, caixa e hidroformada' },
  MATERIAIS: { aluminioBranco: { cor: '#f2f3f4', metalicidade: 0.35, aspereza: 0.35 } },
  get PASSOS() { return gerarPassos(); },
};

export default receitaEstudoSecaoDeTubo;
