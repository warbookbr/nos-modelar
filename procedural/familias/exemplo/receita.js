/* exemplo/receita.js — a receita mínima de uma peça que sai de uma família, para copiar.
 *
 * A ordem: a TABELA em milímetro, `derivar` que chama a família, os MATERIAIS, `gerarPassos` que expande a chamada e dá
 * material a cada parte que a família nomeia, e a receita com PLANO, `formas` e `PASSOS` como getter. Os parâmetros, os
 * limites e os perfis estão no `familia.json` da família. A peça de verdade mora em `procedural/pecas/<nome>/receita.js`,
 * com o alvo e as decisões em `referencias/alvo.md`. Material: `tipo` 'liso' ou 'metal' (com `acabamento`) e `cor`; não
 * há material transparente. */
import { chamar, criarRegistroDeFamilias } from '../index.js';
import { expandirChamadasDeComposicao } from '../../nucleo/composicoes.js';

export const TABELA = { perfil: 'forninho-eletrico', largura: 480, altura: 290, profundidade: 380, botoesGiratorios: 2 };

let registro = null;
const familias = () => { registro ??= criarRegistroDeFamilias(); return registro; };

/* `chamar` recusa valor fora dos limites; o que a TABELA não diz sai do perfil. */
export function derivar(t = TABELA) {
  return chamar(familias().obter('aparelho-de-caixa'), 'aparelho', t);
}

export const MATERIAIS = {
  corpo: { tipo: 'liso', cor: '#d9d9d6' },
  vidro: { tipo: 'liso', cor: '#2b2f38', desgaste: 0.15 },
  escuro: { tipo: 'liso', cor: '#1b1c1f' },
  aco: { tipo: 'metal', cor: '#b9bdc3', acabamento: 'escovado' },
};

/* Parte sem material aqui é erro. */
export const MATERIAL_DA_PARTE = {
  corpo: 'corpo', porta: 'corpo', painel: 'corpo', vidro: 'vidro', botao: 'escuro', indicador: 'corpo', pes: 'escuro',
  grelha: 'aco', puxador: 'aco',
};

export function gerarPassos(t = TABELA) {
  const { passos: daFamilia } = expandirChamadasDeComposicao(familias().registroComposicoes, [derivar(t)]);
  return daFamilia.flatMap((passo) => {
    const [operacao, argumentos] = passo;
    if (operacao !== 'parte') return [passo];
    const usa = MATERIAL_DA_PARTE[argumentos.nome];
    if (!usa) throw new Error(`exemplo: a parte '${argumentos.nome}' da família não tem material na receita`);
    return [passo, ['material', { usa, sel: argumentos.sel }]];
  });
}

const receita = {
  meta: { nome: 'exemplo', desc: 'forninho pela família aparelho-de-caixa' },
  PARAMS: TABELA,
  MATERIAIS,
  /* `partes` com os nomes que a família dá; cada critério se vê nas vistas. */
  PLANO: {
    objeto: 'forninho elétrico de bancada com porta de visor, puxador horizontal e painel à direita com dois botões giratórios',
    referencias: ['referencias/alvo.md'],
    escala: { medida: 'largura total', milimetros: 480 },
    familiaProcedural: 'aparelho-de-caixa',
    partes: Object.keys(MATERIAL_DA_PARTE).map((nome) => ({ nome, forma: `${nome}, como a família faz`, tecnica: 'família aparelho-de-caixa, perfil forninho-eletrico' })),
    criteriosDeReprovacao: ['a caixa não mede 480 por 290 mm de frente', 'o painel não fica à direita da porta com dois botões giratórios'],
  },
  /* Sem `contatos`: a família funde as partes, e a medida não decide os pares. */
  formas: Object.fromEntries(Object.keys(MATERIAL_DA_PARTE).map((nome) => [nome, 'solido'])),
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
