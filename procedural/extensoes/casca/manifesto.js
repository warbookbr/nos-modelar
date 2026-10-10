/* manifesto.js — contrato versionado da extensão `casca`: sólido oco de parede com espessura constante. */
import { FORMATO_EXTENSAO_NATIVA } from '../../nucleo/extensoes.js';
import { TIPO_MALHA_POLIGONAL } from '../../nucleo/artefatos.js';
import { criarContratoUsoOperacao } from '../../nucleo/uso-operacoes.js';

export const MANIFESTO = Object.freeze({
  formato: FORMATO_EXTENSAO_NATIVA, id: 'mecanifica.extensao.casca', versao: '1.0.0',
  operacao: {
    id: 'mecanifica.operacao.casca', nome: 'casca', versao: '1.0.0',
    categoria: 'extensao', artefatos: { entra: [TIPO_MALHA_POLIGONAL], sai: [TIPO_MALHA_POLIGONAL] },
    efeitos: ['transforma-malha'], identidade: 'preserva-ou-deriva',
    uso: criarContratoUsoOperacao('casca', {
      intencao: 'Esvaziar um sólido fechado por dentro, deixando parede de espessura constante, com as faces abertas escolhidas por seleção.',
      campos: {
        origemId: ['origemId', 'Identidade obrigatória do resultado; publica os grupos externa, interna e borda.'],
        solido: ['selecao', 'Seleção das faces do sólido fechado a esvaziar (cilindro e loft pedem alias ou tudo:true para incluir as tampas).'],
        abertas: ['selecao', 'Seleção das faces do sólido que ficam abertas; ausente, a casca é fechada. Precisa estar dentro de solido.'],
        espessura: ['escalar', 'Espessura da parede, maior que zero e menor que a metade da menor medida do sólido.'],
      },
      obrigatorios: ['origemId', 'solido', 'espessura'],
      passos: [
        ['cubo', { origemId: 1, larg: 2, alt: 1, prof: 3 }],
        ['casca', { origemId: 9, solido: { origem: { op: 'cubo', id: 1 } }, abertas: { origem: { op: 'cubo', id: 1, face: 'topo' } }, espessura: 0.1 }],
      ],
      precondicoes: [
        'solido precisa formar superfície fechada e orientada, com a normal das faces para fora, e ter faces planas.',
        'As faces abertas precisam ser faces de solido e deixar pelo menos uma face fechada.',
      ],
      limites: [
        'A parede interna é o recuo de cada face pelo plano: a espessura medida em amostras da parede, perpendicular à face, fica dentro de 2% da pedida (e nunca abaixo disso até a superfície). Em aresta côncava a parede engrossa perto do vértice.',
        'As faces fechadas do sólido continuam com id, vértices, cor, material e parte; as faces abertas saem da malha e a citação delas passa a ser recusada; a parede interna e a borda nascem no bloco do passo, que comporta 1000 faces.',
        "Cite o resultado com {op:'casca', id, parte:'externa'|'interna'|'borda'}; sem parte são todas as faces.",
        'Face não plana (quadrilátero torcido de loft com seções não semelhantes) e vértice onde as faces recuadas não se encontram num ponto passam da tolerância e são recusados.',
      ],
      diagnosticos: [
        { quando: 'espessura maior ou igual à metade da menor medida do sólido', acao: 'a mensagem traz o limite; use espessura menor que ele' },
        { quando: 'solido aberto ou com a orientação invertida', acao: 'inclua as tampas na seleção (alias ou tudo:true) e confira que a normal aponta para fora' },
        { quando: 'abertas fora de solido, ou todas as faces abertas', acao: 'escolha faces do sólido e deixe ao menos uma fechada' },
        { quando: 'parede que invade a si mesma ou face interna invertida', acao: 'reduza a espessura' },
      ],
    }),
  },
});
