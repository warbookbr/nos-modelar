/* montagem.js — a montagem v5 que a família gera: a camisa e a haste, peças distintas, ligadas por uma articulação
   prismática com o curso declarado.

   A montagem v5 persistida só nomeia peças por `alvo.ref` e não leva parâmetro por instância, então a família entrega a
   montagem e, junto, as receitas finas das duas peças: cada `ref` ('cilindro-hidraulico.camisa' e
   'cilindro-hidraulico.haste') é resolvido pelo carregador que a família devolve, que executa a composição da peça com os
   parâmetros da chamada. O formato da montagem não muda; o que a família faz é o que `carregadoresDeReceitas` já faz
   para uma receita com `PARAMS`. As duas peças nascem no mesmo referencial, com a haste recolhida (curso 0), e a posição da
   haste sai do encaixe da porta `eixo-da-haste` na porta `guia-da-haste`, como qualquer posição derivada de porta.

   A articulação não faz parte do JSON da montagem: ela é a declaração que `conferirArticulacao` lê. Fica aqui a mesma que
   o conjunto emite pela extensão `articulacao`, com o curso em milímetro, para a aprovação conferir o curso contra as
   malhas das duas peças. Sem estado global: cada chamada monta os seus registros. */
import {
  REGISTRO_OPERACOES, criarRegistroComExtensoes, criarRegistroComposicoes, neutroCanonico,
} from '../../nucleo/entrada.js';
import { MANIFESTO as MANIFESTO_ARTICULACAO } from '../../extensoes/articulacao/manifesto.js';
import { implementar as implementarArticulacao } from '../../extensoes/articulacao/implementacao.js';
import { MANIFESTO as MANIFESTO_CASCA } from '../../extensoes/casca/manifesto.js';
import { implementar as implementarCasca } from '../../extensoes/casca/implementacao.js';
import { chamar } from '../../../src/autoria/chamar-familia.js';
import { conferirArticulacao } from '../../../src/autoria/conferir-articulacao.js';
import { executarReceita } from '../../../src/autoria/executar-receita.js';
import { FORMATO, VERSAO, parteDaFace } from '../../../src/autoria/ler-peca-resolvida.js';
import { resolverMontagemPersistida } from '../../../src/autoria/resolver-montagem-persistida.js';
import { COMPOSICOES } from './composicoes.js';
import { chamadasDasPecas, passosDoCurso } from './derivar.js';

export const REF_DA_CAMISA = 'cilindro-hidraulico.camisa';
export const REF_DA_HASTE = 'cilindro-hidraulico.haste';
export const ID_DA_MONTAGEM = 'cilindro-hidraulico';
export const ID_DA_ARTICULACAO = 'haste-na-camisa';

const completar = (contrato, parametros) => Object.fromEntries(
  Object.entries(contrato.parametros).map(([nome, { padrao }]) => [nome, parametros[nome] ?? padrao]),
);

/** A montagem v5 persistida: duas instâncias, a ordem de construção e a posição da haste derivada da porta da guia. */
export function montagemPersistida() {
  return {
    formato: 'mecanifica.montagem',
    versao: 5,
    id: ID_DA_MONTAGEM,
    instancias: [
      { id: 'camisa', alvo: { tipo: 'peca', ref: REF_DA_CAMISA } },
      { id: 'haste', alvo: { tipo: 'peca', ref: REF_DA_HASTE } },
    ],
    relacoes: [],
    etapas: ['camisa', 'haste'],
    vinculos: [],
    posicoes: [{
      id: 'hasteNaGuia', instancia: 'haste', porta: 'eixo-da-haste', em: { instancia: 'camisa', porta: 'guia-da-haste' }, unidade: 'mm', afastamento: 0,
    }],
  };
}

/** A declaração da articulação prismática: o curso em milímetro, de 0 (recolhida) ao curso da família, em passos de 25 mm. */
export function declaracaoDaArticulacao(curso) {
  return {
    id: ID_DA_ARTICULACAO,
    tipo: 'prismatica',
    fixo: { caminho: ['camisa'], porta: 'guia-da-haste' },
    movel: { caminho: ['haste'], porta: 'eixo-da-haste' },
    unidade: 'mm',
    curso: { minimo: 0, maximo: curso },
    passos: passosDoCurso(curso),
    folga: { valor: 0, unidade: 'mm' },
  };
}

/* Os registros desta família: as operações do núcleo mais a casca e a articulação, e as suas composições. */
function registros() {
  const registroOperacoes = criarRegistroComExtensoes({
    registroBase: REGISTRO_OPERACOES,
    extensoes: [
      { manifesto: MANIFESTO_CASCA, implementacao: implementarCasca },
      { manifesto: MANIFESTO_ARTICULACAO, implementacao: implementarArticulacao },
    ],
  });
  const registroComposicoes = criarRegistroComposicoes({ composicoes: [...COMPOSICOES], resolverOperacao: registroOperacoes.resolver });
  return { registroOperacoes, registroComposicoes };
}

/* A peça resolvida (o que o resolvedor de montagem lê) da composição de uma peça. */
function pecaResolvida(ref, chamada, ambiente) {
  const receita = {
    meta: { nome: ref }, CHAMADAS_COMPOSICOES: [{ id: ref.split('.').at(-1), ...chamada }], PARAMS: {}, TOPO: {}, ALIASES: [], MATERIAIS: {},
  };
  const { neutro: bruto } = executarReceita(receita, ambiente);
  if (bruto.orfaos.length) throw new Error(`${ref}: a composição deixou ${bruto.orfaos.length} órfão(s): ${bruto.orfaos[0].motivo}`);
  const neutro = neutroCanonico(bruto);
  return {
    formato: FORMATO,
    versao: VERSAO,
    peca: ref,
    meta: { nome: ref },
    materiais: {},
    partes: [...new Set(neutro.F.map(parteDaFace).filter(Boolean))].sort(),
    portas: [...bruto.portas.values()],
    V: neutro.V,
    F: neutro.F,
  };
}

/**
 * Gera a montagem da família para um conjunto de parâmetros. Confere faixa e restrição pela própria `chamar` (a recusa é
 * a da família, antes de existir peça) e devolve `{ parametros, montagem, articulacao, pecas, carregadores, resolver,
 * conferirCurso }`. `montagem` é o JSON v5; `pecas` é o mapa `ref -> peça resolvida`; `carregadores` são os que
 * `resolverMontagemPersistida` pede; `resolver()` devolve a montagem resolvida; `conferirCurso(opcoes, curso)` confere a
 * articulação declarada (ou uma de curso diferente, para provar o limite) pela `conferirArticulacao`.
 */
export function montarCilindro(familia, parametros = {}) {
  chamar(familia, 'conjunto', parametros);
  const completos = completar(familia.contrato, parametros);
  const chamadas = chamadasDasPecas(completos);
  const ambiente = registros();
  const pecas = new Map([
    [REF_DA_CAMISA, pecaResolvida(REF_DA_CAMISA, chamadas.camisa, ambiente)],
    [REF_DA_HASTE, pecaResolvida(REF_DA_HASTE, chamadas.haste, ambiente)],
  ]);
  const carregarPeca = async (ref) => {
    if (!pecas.has(ref)) throw new Error(`a família cilindro-hidraulico não tem a peça '${ref}'; tem ${[...pecas.keys()].join(', ')}.`);
    return pecas.get(ref);
  };
  const montagem = montagemPersistida();
  const articulacao = declaracaoDaArticulacao(completos.curso);
  const resolver = () => resolverMontagemPersistida(montagem, { carregarPeca });
  return Object.freeze({
    parametros: Object.freeze(completos),
    montagem,
    articulacao,
    pecas,
    carregadores: Object.freeze({ carregarPeca }),
    resolver,
    async conferirCurso(opcoes = {}, declaracao = articulacao) {
      return conferirArticulacao(await resolver(), declaracao, opcoes);
    },
  });
}
