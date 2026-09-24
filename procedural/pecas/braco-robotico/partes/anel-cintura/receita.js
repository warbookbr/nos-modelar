/* braco-robotico/anel-cintura — o anel escuro da cintura, sobre a base.
 *
 * Segunda etapa da montagem `braco-robotico/montagem.json`. O combinado com a
 * pessoa está em `../../ALINHAMENTO.md`; os passos são escritos pelo modelador.
 * O raio vem da porta `assento` da base, por vínculo da montagem; o valor da
 * TABELA só vale para ver a parte sozinha.
 *
 * Portas que a receita publica:
 *   apoio — anel que ocupa, eixo +Y, centro no meio da face de baixo, borda
 *           de baixo do anel. Senta no `assento` da base.
 *   topo  — anel que recebe, eixo +Y, centro no meio da face de cima, face
 *           inteira. O `ombro` sai daqui.
 *
 * Regra das portas de apoio do braço: quem recebe publica a face inteira,
 * de raio interno zero ao raio da face, numa faixa de 5 mm para dentro da
 * peça; quem se apoia publica só a borda de baixo, uma faixa de 10 mm de
 * largura até o raio dela e 5 mm para dentro dela. A montagem confere que a
 * borda inteira está sobre a face, sem fresta e no mesmo eixo.
 */

export const TABELA = {
  raio: 90,
  altura: 40,
  /* Acabamento, escolhido pelo modelador. */
  chanfro: 2,
  suaveDoChanfro: 0.8,
  larguraDaRanhura: 3,
  fundoDaRanhura: 2,
  lados: 40,
};

export const MATERIAIS = { anelEscuro: { cor: '#4a4d52', aspereza: 0.45 } };

const m = (mm) => mm / 1000;
const ID = { anel: 100 };

export function derivar(t = TABELA) {
  const R = m(t.raio);
  const h = m(t.altura);
  const c = m(t.chanfro);
  const s = m(t.suaveDoChanfro);
  const meio = h / 2;
  const w = m(t.larguraDaRanhura) / 2;
  return { R, h, c, s, meio, w, rRanhura: R - m(t.fundoDaRanhura) };
}

export function gerarPassos(t = TABELA) {
  const P = derivar(t);
  const { R, h, c, s, meio, w, rRanhura } = P;
  const passos = [];
  /* Perfil: chanfro estreito embaixo e em cima, com as duas bordas do chanfro
     suavizadas pelo raio do vértice; ranhura retangular no meio da altura
     separando as duas faixas. */
  passos.push(['lathe', {
    origemId: ID.anel, lados: t.lados, segmentosCurva: 3,
    perfil: [
      [0, 0], [R - c, 0, s], [R, c, s],
      [R, meio - w], [rRanhura, meio - w], [rRanhura, meio + w], [R, meio + w],
      [R, h - c, s], [R - c, h, s], [0, h],
    ],
  }]);
  passos.push(['parte', { nome: 'anel', sel: { origem: { op: 'lathe', id: ID.anel } } }]);
  passos.push(['publicarPorta', {
    nome: 'apoio', de: { op: 'lathe', id: ID.anel },
    interface: { forma: 'anel', papel: 'ocupa', eixo: [0, 1, 0], centro: [0, 0, 0], raioInterno: R - 0.010, raioExterno: R, inicio: 0, fim: 0.005 },
  }]);
  passos.push(['publicarPorta', {
    nome: 'topo', de: { op: 'lathe', id: ID.anel },
    interface: { forma: 'anel', papel: 'recebe', eixo: [0, 1, 0], centro: [0, h, 0], raioInterno: 0, raioExterno: R, inicio: -0.005, fim: 0 },
  }]);
  passos.push(['material', { usa: 'anelEscuro', sel: { origem: { op: 'lathe', id: ID.anel } } }]);
  passos.push(['liso', { sel: { origem: { op: 'lathe', id: ID.anel } } }]);
  return passos;
}

const receita = {
  meta: { nome: 'braco-robotico/anel-cintura', desc: 'anel escuro da cintura do braço robótico' },
  PARAMS: TABELA,
  MATERIAIS,
  TOPO: { origem: 'centro da face de baixo do anel; y para cima' },
  PLANO: {
    objeto: 'anel de giro da cintura do braço robótico, entre o topo da base e o ombro',
    referencias: ['../../referencias/lateral.png'],
    escala: { medida: 'diâmetro do anel, igual ao da base', milimetros: 180 },
    partes: [
      { nome: 'anel', forma: 'anel de revolução escuro, cerca de 25 mm de altura, uma faixa só, bordas com chanfro estreito de bordas suavizadas', tecnica: 'revolução com perfil' },
    ],
    criteriosDeReprovacao: [
      'diâmetro diferente do da base, formando degrau na junção',
      'mais alto que uma faixa estreita, ou com ranhura no meio',
      'bordas vivas, sem o chanfro estreito',
      'fresta visível entre o anel e a base',
      'anel na cor cinza-clara da carcaça, quando ele é escuro',
    ],
  },
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
