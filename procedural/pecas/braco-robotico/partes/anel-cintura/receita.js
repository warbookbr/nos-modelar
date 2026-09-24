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
};

const receita = {
  meta: { nome: 'braco-robotico/anel-cintura', desc: 'anel escuro da cintura do braço robótico' },
  PARAMS: TABELA,
  TOPO: { origem: 'centro da face de baixo do anel; y para cima' },
  PLANO: {
    objeto: 'anel de giro da cintura do braço robótico, entre o topo da base e o ombro',
    referencias: ['../../referencias/lateral.png'],
    escala: { medida: 'diâmetro do anel, igual ao da base', milimetros: 180 },
    partes: [
      { nome: 'anel', forma: 'anel de revolução escuro, 40 mm de altura, duas faixas separadas por uma ranhura, bordas com chanfro estreito de bordas suavizadas', tecnica: 'revolução com perfil' },
    ],
    criteriosDeReprovacao: [
      'diâmetro diferente do da base, formando degrau na junção',
      'sem a ranhura entre as duas faixas',
      'bordas vivas, sem o chanfro estreito',
      'fresta visível entre o anel e a base',
      'anel na cor cinza-clara da carcaça, quando ele é escuro',
    ],
  },
  get PASSOS() { return []; },
};

export default receita;
