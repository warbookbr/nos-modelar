/* braco-robotico/braco — a coluna redonda e reta, à frente do ombro.
 *
 * Quarta etapa da montagem `braco-robotico/montagem.json`. A decisão da pessoa
 * (2026-11-03, opção 3) está no fim de `../../ALINHAMENTO.md`: cilindro de 156
 * mm do pé ao topo, 477 mm do fundo do pé ao topo, pé redondo em volta do eixo
 * da junta do ombro, uma peça só.
 *
 * Referencial local: o eixo +Z é o eixo da junta do ombro e a origem é o
 * centro do disco do pé que encosta na face do anel da junta; Y para cima. O
 * pé é um cilindro de eixo Z (raio igual ao da coluna, espessura igual ao
 * diâmetro dela) e a coluna é um cilindro de eixo Y que sobe do eixo da junta,
 * centrado na espessura do pé, de modo que as duas faces do pé ficam
 * tangentes à coluna. O fundo do pé fica a `raioDoPe` abaixo do eixo e o topo
 * a `alturaTotal` acima do fundo.
 *
 * Duas partes nomeadas, uma só peça: `pe` e `coluna` recebem o nome antes do
 * `unir`, e o sólido sai fundido. O nome do pé existe para a porta de baixo
 * medir só o pé: a coluna é tangente ao plano do anel e a conferência de porta
 * olha a parte inteira de onde a porta sai.
 *
 * Portas que a receita publica:
 *   juntaNoOmbro — cilindro interno, eixo +Z, centro no meio do disco do pé que
 *                  encosta, raio do pé. Senta na `juntaDoOmbro` do ombro.
 *   topo         — anel que recebe, eixo +Y, centro no meio da face plana de
 *                  cima, face inteira (raio da coluna). O anel do cotovelo,
 *                  de cerca de 160 mm, sai daqui.
 *
 * Curso. A rotação é em torno do eixo +Z da junta, e toda a peça fica em
 * z de 0 a 156 mm, à frente da face do anel: nenhum ponto cruza o plano do
 * anel nem entra no bloco do ombro, em nenhum ângulo. A base não limita (vai
 * até z = 115 mm e a coluna começa em 123 mm). O limite é o chão: com o eixo a
 * 360 mm do chão, a coluna encosta nele a cerca de 141 graus da vertical para
 * cada lado.
 *
 * Encontro do pé com a coluna: `unir` com `arredondarCostura` de 12 mm, com o
 * pé do mesmo raio da coluna. O pé mais estreito (3 mm de raio, na rodada 2)
 * deixava degrau, orelhas e lascas no encontro; do mesmo raio a união sai
 * limpa e a auditoria fecha. A seção do arredondamento é medida até 8 mm de
 * cada face do pé, onde a coluna fica tangente a ela e a fatia encostaria na
 * face; dali até a face, `aparar` leva o anel ao longo da costura e corta o
 * tubo por um molde, o pé com o chanfro das bordas prolongado para fora, e o
 * arredondamento termina acompanhando o chanfro. A opção entrou no núcleo em
 * 2026-11-04 por causa desta peça, e vale para qualquer encontro em que uma
 * face corta o canto.
 */

export const TABELA = {
  /* Vem do ombro pela montagem (porta `juntaDoOmbro`); o valor daqui só vale
     para ver a parte sozinha. Limita o raio do pé: o pé não passa do anel. */
  raioDaJunta: 95,
  diametroDaColuna: 156,
  /* Do fundo do pé ao topo. */
  alturaTotal: 477,
  /* Quanto o raio do pé fica abaixo do da coluna; zero é o desenho da pessoa (pé do diâmetro da coluna). */
  folgaDoPe: 0,
  /* Acabamento das carcaças: chanfro estreito nas bordas, com o raio do
     vértice suavizado. */
  chanfro: 2,
  suaveDoChanfro: 0.8,
  /* Concordância no encontro do pé com a coluna; zero a desliga (ver acima). */
  raioDoEncontro: 12,
  lados: 72,
};

const m = (mm) => mm / 1000;
const ID = { pe: 100, coluna: 200, corpo: 300, concordancia: 400, molde: 500 };

export function derivar(t = TABELA) {
  const rc = m(t.diametroDaColuna) / 2;
  if (rc > m(t.raioDaJunta)) throw new Error('a coluna não cabe no anel da junta: o pé passaria da borda dele.');
  const rp = rc - m(t.folgaDoPe);
  /* O pé tem a espessura do diâmetro da coluna. */
  const esp = 2 * rc;
  /* Eixo da junta em y = 0; o fundo do pé em -rp; o topo em alturaTotal - rp. */
  const yTopo = m(t.alturaTotal) - rp;
  return { rc, rp, esp, yTopo, c: m(t.chanfro), s: m(t.suaveDoChanfro) };
}

export function gerarPassos(t = TABELA) {
  const { rc, rp, esp, yTopo, c, s } = derivar(t);
  const passos = [];
  /* Pé: disco de eixo Z, do plano que encosta no anel à face de trás. */
  passos.push(['lathe', {
    origemId: ID.pe, eixo: 'z', lados: t.lados, segmentosCurva: 2, em: [0, 0, 0],
    perfil: [[0, 0], [rp - c, 0, s], [rp, c, s], [rp, esp - c, s], [rp - c, esp, s], [0, esp]],
  }]);
  /* Coluna: cilindro de eixo Y do eixo da junta ao topo, com chanfro no topo. */
  passos.push(['lathe', {
    origemId: ID.coluna, eixo: 'y', lados: t.lados, segmentosCurva: 2, em: [0, 0, esp / 2],
    perfil: [[0, 0], [rc, 0], [rc, yTopo - c, s], [rc - c, yTopo, s], [0, yTopo]],
  }]);
  const dePe = { origem: { op: 'lathe', id: ID.pe } };
  const daColuna = { origem: { op: 'lathe', id: ID.coluna } };
  passos.push(['parte', { nome: 'pe', sel: dePe }]);
  passos.push(['parte', { nome: 'coluna', sel: daColuna }]);
  passos.push(['unir', { origemId: ID.corpo, solidos: [{ origem: { op: 'lathe', id: ID.pe } }, { origem: { op: 'lathe', id: ID.coluna } }] }]);
  const corpo = { origem: { op: 'unir', id: ID.corpo } };
  if (t.raioDoEncontro > 0) {
    /* O molde do corte do arredondamento: o pé com o chanfro das bordas prolongado para fora, até além do raio do encontro.
       O arredondamento termina acompanhando o chanfro, e o passo consome o molde. */
    const alem = m(t.raioDoEncontro) + 0.01;
    /* 0,2 mm para dentro do chanfro: o molde em cima do chanfro deixaria face sem área na união, e para fora, lasca no canto arredondado dele */
    const fora = -0.0002;
    passos.push(['lathe', {
      origemId: ID.molde, eixo: 'z', lados: t.lados, segmentosCurva: 2, em: [0, 0, 0],
      perfil: [[0, -fora], [rp - c, -fora], [rp + alem, c + alem - fora], [rp + alem, esp - c - alem + fora], [rp - c, esp + fora], [0, esp + fora]],
    }]);
    passos.push(['arredondarCostura', { origemId: ID.concordancia, de: { op: 'unir', id: ID.corpo }, raio: m(t.raioDoEncontro), raioMinimo: 0.003, regiao: { min: [-1, -1, 0.008], max: [1, rc + 0.01, esp - 0.008] }, aparar: { solido: { origem: { op: 'lathe', id: ID.molde } } } }]);
  }
  const concordancia = { origem: { op: 'arredondarCostura', id: ID.concordancia } };
  if (t.raioDoEncontro > 0) passos.push(['parte', { nome: 'coluna', sel: concordancia, substituir: true }]);
  /* As portas citam só a faixa de tampa de cada lathe, que o unir não consome; assim a medida da porta olha só o pé e só a coluna. */
  passos.push(['publicarPorta', {
    nome: 'juntaNoOmbro', de: { op: 'lathe', id: ID.pe, faixa: 0 },
    interface: { forma: 'cilindro', papel: 'interna', eixo: [0, 0, 1], centro: [0, 0, 0], raio: rp, inicio: 0, fim: 0.005 },
  }]);
  passos.push(['publicarPorta', {
    nome: 'topo', de: { op: 'lathe', id: ID.coluna, faixa: 7 },
    interface: { forma: 'anel', papel: 'recebe', eixo: [0, 1, 0], centro: [0, yTopo, esp / 2], raioInterno: 0, raioExterno: rc, inicio: -0.005, fim: 0 },
  }]);
  passos.push(['liso', { sel: corpo, angulo: 20 }]);
  if (t.raioDoEncontro > 0) passos.push(['liso', { sel: concordancia, angulo: 20 }]);
  return passos;
}

const receita = {
  meta: { nome: 'braco-robotico/braco', desc: 'coluna redonda e reta de 156 mm, com o pé redondo em volta do eixo da junta do ombro' },
  PARAMS: TABELA,
  TOPO: { origem: 'centro do disco do pé que encosta no anel da junta; +Z é o eixo da junta, y para cima, a coluna à frente (z de 0 a 156)' },
  PLANO: {
    objeto: 'coluna do braço robótico: cilindro redondo e reto à frente do ombro, que gira em volta do eixo da junta do ombro e leva o anel do cotovelo no topo',
    referencias: ['../../referencias/coluna-reta.png', '../../referencias/coluna-reta-lado.png'],
    escala: { medida: 'diâmetro da coluna, do pé ao topo', milimetros: 156 },
    partes: [
      { nome: 'pe', forma: 'disco redondo de eixo Z (o da junta do ombro), 156 mm de diâmetro (o da coluna) e 156 mm de espessura, encostado na face do anel da junta, fundido à coluna: uma peça só', tecnica: 'lathe de eixo Z com chanfro de vértice suavizado, unido à coluna por unir, com arredondarCostura no encontro' },
      { nome: 'coluna', forma: 'cilindro redondo e reto de 156 mm do pé ao topo, 477 mm do fundo do pé ao topo, de eixo vertical sobre o pé; topo plano onde assenta o anel do cotovelo; bordas suavizadas', tecnica: 'lathe de eixo Y com chanfro de vértice suavizado no topo, unir, arredondarCostura no encontro com o pé e liso com ângulo' },
    ],
    criteriosDeReprovacao: [
      'coluna que afunila, engrossa ou tem diâmetro diferente de 156 mm em algum trecho',
      'altura do fundo do pé ao topo diferente de 477 mm',
      'pé que não é redondo em volta do eixo da junta, ou de diâmetro diferente do da coluna',
      'fresta, emenda, degrau ou parafuso entre o pé e a coluna: precisa ser uma peça só',
      'pé afastado da face do anel da junta ou entrando nele',
      'qualquer ponto da peça atrás do plano da face do anel (z menor que 0 no referencial da peça): atravessaria o bloco do ombro',
      'topo inclinado, abaulado ou sem a face plana de assento do anel do cotovelo',
      'bordas vivas, sem o acabamento suavizado das carcaças',
      'sombreado torcido ou rasgo no encontro do pé com a coluna',
      'sem a porta `topo` para o anel do cotovelo, de eixo vertical',
      'curso declarado além do que a geometria permite: nenhum toque com ombro, anel da cintura ou base em ângulo algum; cerca de 141 graus da vertical para cada lado até o chão (eixo a 360 mm)',
    ],
  },
  contatos: [],
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
