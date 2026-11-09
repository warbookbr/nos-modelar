/* braco-robotico/flange — o disco onde a ferramenta se prende, na face da frente do anel da junta 6.
 *
 * Última etapa do punho da montagem `braco-robotico/montagem.json`. O combinado com a pessoa está em `../../ALINHAMENTO.md`, seção
 * "O punho, 2026-11-09" (disco de 154 mm por 43 mm, no anel da junta 6; forma `flange` do esboço escolhido, opção 2 de
 * `../../referencias/punho-diametro.png`) e na tabela de peças ("o disco com oito furos em círculo e um furo central", prancha
 * `../../referencias/lateral-sem-cabo.prancha.png`). O raio do disco, 77 mm, é medida própria (o disco é mais largo que o anel de 135 mm, como a
 * carcaça de 190 é mais larga que o anel da junta 4); a posição vem da porta `topo` do anel da junta 6, centrada, e o raio da porta de apoio
 * (`raioDoApoio`) vem dela por vínculo da montagem: o valor da TABELA só vale para ver a parte sozinha.
 *
 * Referencial local: origem no centro da face de trás do disco (a que assenta no anel); o eixo do disco é +X; o disco ocupa x de 0 a
 * `espessura`. A montagem o gira para o eixo do tubo deitado do elo da junta 5 (z do mundo).
 *
 * Material: nenhum, o claro padrão das carcaças do braço (só os anéis levam o escuro).
 *
 * Técnica: um `lathe` de eixo x, com chanfro de 2 mm nas duas bordas do perfil; os furos da face de fora são cegos, abertos com a operação `furo`
 * (oito num círculo de furação e um central), todos a partir da face da frente.
 *
 * Portas que a receita publica:
 *   apoio      — anel que ocupa, eixo +X, centro no meio da face de trás, de 0,01 m abaixo do raio do anel da junta 6 até a borda da face (raio do disco menos o chanfro), para a sobreposição radial ser a do anel. Senta no `topo` do anel da junta 6.
 *   ferramenta — anel que recebe, eixo +X, centro no meio da face da frente, até a borda da face (raio do disco menos o chanfro); sai das faces de borda dos furos, que ficam no plano da face de fora, porque o furo consome a tampa. A ferramenta futura assenta aqui.
 */

export const TABELA = {
  /* Medida própria do disco: 154 mm de diâmetro. */
  raio: 77,
  /* Espessura do disco ao longo do eixo. */
  espessura: 43,
  /* Vem do anel da junta 6 pela montagem (porta `topo`, medida `raioExterno`); o valor daqui só vale para ver a parte sozinha. */
  raioDoApoio: 67.5,
  /* Acabamento, como as carcaças. */
  chanfro: 2,
  lados: 144,
  /* Furos cegos da face de fora: oito num círculo de furação e um central. */
  furosEmCirculo: 8,
  raioDoCirculoDeFuracao: 62.5,
  raioDoFuro: 3,
  raioDoFuroCentral: 15,
  profundidadeDosFuros: 6,
  ladosDoFuro: 18,
};

const m = (mm) => mm / 1000;
const ID = { disco: 100, furos: 101, borda1: 102, borda2: 103 };

export function derivar(t = TABELA) {
  return { R: m(t.raio), E: m(t.espessura), c: m(t.chanfro), Ra: m(t.raioDoApoio) };
}

export function gerarPassos(t = TABELA) {
  const { R, E, c, Ra } = derivar(t);
  const passos = [];
  passos.push(['cilindro', { origemId: ID.disco, raio: R, altura: E, lados: t.lados, eixo: 'x' }]);
  /* Bordas de fora e de dentro: o arredondamento de 2 mm em duas faixas, a cadeia fecha o laço de cada borda. */
  passos.push(['arredondarAresta', { origemId: ID.borda1, de: { op: 'cilindro', id: ID.disco, tampa: 'fundo' }, aresta: 0, raio: c, paineis: 2, cadeia: true }]);
  passos.push(['arredondarAresta', { origemId: ID.borda2, de: { op: 'cilindro', id: ID.disco, tampa: 'topo' }, aresta: 0, raio: c, paineis: 2, cadeia: true }]);
  passos.push(['parte', { nome: 'disco', sel: { tudo: true } }]);
  passos.push(['publicarPorta', {
    nome: 'apoio', de: { op: 'cilindro', id: ID.disco, tampa: 'fundo' },
    interface: { forma: 'anel', papel: 'ocupa', eixo: [1, 0, 0], centro: [0, 0, 0], raioInterno: Ra - 0.010, raioExterno: R - c, inicio: 0, fim: 0.005 },
  }]);
  passos.push(['furo', {
    origemId: ID.furos, de: { op: 'cilindro', id: ID.disco, tampa: 'topo' }, lados: t.ladosDoFuro,
    centros: [
      { nome: 'central', centro: [E, 0, 0], raio: m(t.raioDoFuroCentral), profundidade: m(t.profundidadeDosFuros) },
      { nome: 'circulo', pivo: [E, 0, 0], distancia: m(t.raioDoCirculoDeFuracao), total: t.furosEmCirculo, volta: 360, raio: m(t.raioDoFuro), profundidade: m(t.profundidadeDosFuros) },
    ],
  }]);
  passos.push(['publicarPorta', {
    nome: 'ferramenta', de: { op: 'furo', id: ID.furos },
    interface: { forma: 'anel', papel: 'recebe', eixo: [1, 0, 0], centro: [E, 0, 0], raioInterno: 0, raioExterno: R - c, inicio: -0.005, fim: 0 },
  }]);
  return passos;
}

const receita = {
  meta: { nome: 'braco-robotico/flange', desc: 'flange do braço robótico: disco de 154 mm por 43 mm na face da frente do anel da junta 6, com oito furos cegos em círculo e um furo central, onde a ferramenta se prende' },
  PARAMS: TABELA,
  TOPO: { origem: 'centro da face de trás do disco; y para cima, x ao longo do eixo da junta 6, para a frente (a face de fora, dos furos)' },
  PLANO: {
    objeto: 'flange do braço robótico: disco de 154 mm de diâmetro e 43 mm de espessura, centrado na face da frente do anel da junta 6, com oito furos em círculo e um furo central na face de fora, onde a ferramenta se prende',
    referencias: ['../../referencias/punho-diametro.png', '../../referencias/lateral-sem-cabo.prancha.png'],
    escala: { medida: 'diâmetro do disco', milimetros: 154 },
    partes: [
      { nome: 'disco', forma: 'disco de 154 mm por 43 mm, eixo da junta 6, centrado no anel, claro como as carcaças, chanfro de 2 mm; na face de fora, oito furos cegos de 6 mm num círculo de 125 mm e um central de 30 mm, 6 mm de fundo', tecnica: 'revolução com perfil de eixo x e chanfro no perfil; furos pela operação furo (cegos), a partir da face da frente' },
    ],
    criteriosDeReprovacao: [
      'diâmetro do disco diferente de 154 mm',
      'espessura do disco diferente de 43 mm',
      'disco fora do centro do anel da junta 6, ou com o eixo inclinado em relação a ele',
      'disco sem os furos: faltar os oito furos em círculo ou o furo central na face de fora',
      'furo passante, ou furos na face de dentro, a que assenta no anel',
      'aresta viva nas bordas, sem o chanfro de 2 mm',
      'disco na cor escura dos anéis, quando ele é cinza-claro como as carcaças',
    ],
  },
  /* Uma parte só; o contato com o anel é a relação de assento da montagem, não um par interno. */
  contatos: [],
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
