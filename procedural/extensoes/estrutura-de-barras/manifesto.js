/* manifesto.js — contrato versionado da extensão nativa estruturaDeBarras: nós nomeados, barras com perfil, juntas cortadas e unidas. */
import { FORMATO_EXTENSAO_NATIVA } from '../../nucleo/extensoes.js';
import { criarContratoUsoOperacao } from '../../nucleo/uso-operacoes.js';

export const EXEMPLO = {
  nos: [{ nome: 'a', posicao: [0, 0, 0] }, { nome: 'b', posicao: [1000, 0, 0] }, { nome: 'c', posicao: [1000, 0, 600] }, { nome: 'd', posicao: [0, 0, 600] }],
  barras: [{ nome: 'base', de: 'a', para: 'b' }, { nome: 'direita', de: 'b', para: 'c' }, { nome: 'topo', de: 'c', para: 'd' }, { nome: 'esquerda', de: 'd', para: 'a' }],
  perfil: { tipo: 'tubo-quadrado', lado: 40, parede: 3 },
  densidade: 7850,
};

export const MANIFESTO = Object.freeze({
  formato: FORMATO_EXTENSAO_NATIVA, id: 'mecanifica.extensao.estrutura-de-barras', versao: '1.0.0',
  operacao: {
    id: 'mecanifica.operacao.estruturaDeBarras', nome: 'estruturaDeBarras', versao: '1.0.0',
    categoria: 'extensao', artefatos: { entra: [], sai: ['mecanifica.malha-poligonal@1'] },
    efeitos: ['cria-geometria'], identidade: 'cria-por-passo',
    uso: criarContratoUsoOperacao('estruturaDeBarras', {
      intencao: 'Criar uma estrutura de barras: nós com nome e posição, barras entre pares de nós com um perfil (tubo redondo, quadrado, retangular ou cantoneira), cortadas ou encaixadas em cada nó e unidas num sólido só.',
      campos: {
        nos: ['lista', 'Lista de { nome, posicao: [x, y, z] }; de 2 a 64 nós, cada um ligado a ao menos uma barra. A posição aceita parâmetros e expressões.'],
        barras: ['lista', 'Lista de { nome, de, para, perfil?, orientacao? }; de 1 a 128 barras. "de" e "para" são nomes de nós, nunca índices; orientacao é a direção "para cima" do perfil (padrão: +Y do mundo, ou +Z para barra vertical).'],
        perfil: ['objeto', 'Perfil padrão das barras que não declaram o seu: { tipo: tubo-redondo (diametro, parede?, lados?) | tubo-quadrado (lado, parede?) | tubo-retangular (largura, altura, parede?) | cantoneira (aba, espessura, aba2?) }. Sem parede o tubo é maciço.'],
        densidade: ['escalar', 'Densidade em kg/m³ (aço: 7850). Com ela, as medidas trazem o peso por metro de cada barra, o peso do corte e a massa total.'],
        unidade: ['texto', 'Unidade das posições e medidas: mm (padrão), cm ou m.'],
      },
      obrigatorios: ['nos', 'barras'],
      passos: [['estruturaDeBarras', EXEMPLO]],
      precondicoes: ['Nenhum nó fica no meio de uma barra: a barra é dividida no nó.', 'Barras que saem do mesmo nó formam ao menos 15° entre si.'],
      limites: [
        'Nó sem par de barras alinhadas (180°) exige a mesma seção em todas as barras e é cortado em esquadria; com um par alinhado, as outras barras chegam retas e precisam caber na seção da barra passante.',
        'Os comprimentos de corte e o peso por metro saem de descreverEstrutura (procedural/extensoes/estrutura-de-barras/estrutura.js), não da malha publicada; a seção tem cantos vivos, sem raio de dobra.',
        'A malha publicada é triangulada e usa a faixa estendida de ids do passo.',
      ],
      diagnosticos: [
        { quando: 'nó, barra ou perfil recusado', acao: 'a mensagem diz o campo, o valor recebido e o que é aceito' },
        { quando: 'barra de comprimento zero, nó sem barra, nó no meio de uma barra ou ângulo menor que 15°', acao: 'corrija as posições ou divida a barra no nó' },
      ],
    }),
  },
});
