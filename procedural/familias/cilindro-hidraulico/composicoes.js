/* composicoes.js — as composições procedurais do cilindro hidráulico: a camisa, a haste e o conjunto dos dois.

   A camisa sai da casca nativa: um cilindro de eixo x esvaziado por dentro, aberto na frente, com a parede pedida. A cabeça
   (a guia da haste) fecha o furo na frente e o pescoço traseiro (a tampa prolongada) sai do fundo até o olhal traseiro. A
   haste junta o êmbolo, o corpo e o terminal rosqueado, que leva o olhal dianteiro. Cada peça do conjunto é um corpo
   fechado com a sua parte, e os corpos de uma peça se unem entrando uns nos outros: 0,2 mm nas juntas planas e, no
   pescoço, até o meio da massa do anel do olhal. O pescoço é cilíndrico e mais fino que a largura do anel enquanto está
   sobre o disco dele, e só engrossa (no cone até a camisa ou até o colar do terminal) fora do anel. Os olhais com rótula levam uma bucha esférica a mais, mais larga que o
   olhal, no furo do pino. O conjunto é a camisa e a haste lado a lado, na pose recolhida, numa peça só, com a declaração da articulação, e é o que `chamar` devolve; a montagem v5 da
   família usa a camisa e a haste separadas.

   A composição v1 só substitui valores, então cada medida chega pronta, em metro, do `derivar`. As variantes de cada peça
   (olhal liso ou com rótula) são geradas aqui pela mesma função, e não escritas várias vezes. Os ids de origem são fixos
   e estão separados por peça (1 a 6 na camisa, 11 a 16 na haste), para as duas poderem morar na mesma peça. */
import { FORMATO_COMPOSICAO_PROCEDURAL } from '../../nucleo/entrada.js';
import { SEGMENTOS_DA_BUCHA } from './geometria.js';

const MALHA = 'mecanifica.malha-poligonal@1';
const PARTE = 'mecanifica.parte@1';
const PORTA = 'mecanifica.porta@1';
const ARTICULACAO = 'mecanifica.articulacao@1';

export const ID_CAMISA = 'cilindro-hidraulico.camisa';
export const ID_HASTE = 'cilindro-hidraulico.haste';
export const ID_CONJUNTO = 'cilindro-hidraulico.conjunto';

/** O id da composição com a fixação dada (0 olhal liso, 1 olhal com rótula). */
export const idDaCamisa = (fixacao) => `${ID_CAMISA}-${fixacao}`;
export const idDaHaste = (fixacao) => `${ID_HASTE}-${fixacao}`;
export const idDoConjunto = (traseira, dianteira) => `${ID_CONJUNTO}-${traseira}${dianteira}`;

const p = (nome) => ({ parametro: nome });
const numero = { tipo: 'numero' };
const aneis = (raioInterno, raioExterno, comprimento) => [[raioInterno, 0], [raioExterno, 0], [raioExterno, comprimento], [raioInterno, comprimento], [raioInterno, 0]];

const PARAMETROS_DO_OLHAL = (lado) => Object.fromEntries([
  'Centro', 'RaioDoOlhal', 'RaioDoFuro', 'RaioDoPino', 'LarguraDoOlhal', 'InicioDoOlhal',
].map((nome) => [`${lado}${nome}`, numero]));
const PARAMETROS_DA_ROTULA = (lado) => Object.fromEntries([
  `${lado}InicioDaBucha`,
  ...Array.from({ length: SEGMENTOS_DA_BUCHA + 1 }, (_, k) => [`${lado}BuchaRaio${k}`, `${lado}BuchaZ${k}`]).flat(),
].map((nome) => [nome, numero]));

/** Os nós de um olhal: o anel inteiro furado no eixo z e, com rótula, a bucha esférica truncada no furo do pino. */
function nosDoOlhal({ lado, origem, rotula, nome }) {
  const nos = [{
    id: `${nome}-anel`,
    operacao: 'extrusao',
    argumentos: {
      origemId: origem,
      eixo: 'z',
      altura: p(`${lado}LarguraDoOlhal`),
      em: [p(`${lado}Centro`), 0, p(`${lado}InicioDoOlhal`)],
      segmentosArco: p('segmentosDoArco'),
      perfil: { circulo: { raio: p(`${lado}RaioDoOlhal`), centro: [0, 0] } },
      furos: [{ circulo: { raio: p(`${lado}RaioDoFuro`), centro: [0, 0] } }],
    },
  }];
  if (rotula) {
    const cupula = Array.from({ length: SEGMENTOS_DA_BUCHA + 1 }, (_, k) => [p(`${lado}BuchaRaio${k}`), p(`${lado}BuchaZ${k}`)]);
    nos.push({
      id: `${nome}-bucha`,
      operacao: 'lathe',
      argumentos: {
        origemId: origem + 1,
        perfil: [[p(`${lado}RaioDoPino`), 0], ...cupula, [p(`${lado}RaioDoPino`), p(`${lado}BuchaZ${SEGMENTOS_DA_BUCHA}`)], [p(`${lado}RaioDoPino`), 0]],
        lados: p('lados'),
        eixo: 'z',
        em: [p(`${lado}Centro`), 0, p(`${lado}InicioDaBucha`)],
      },
    });
  }
  return nos;
}

const porta = ({ id, de, interface: interfaceDaPorta }) => ({
  id: `porta-${id}`,
  operacao: 'publicarPorta',
  argumentos: { nome: id, de, interface: interfaceDaPorta },
});

const interfaceDoOlhal = ({ lado, parte }) => ({
  forma: 'anel',
  papel: 'recebe',
  parte,
  eixo: [0, 0, 1],
  centro: [p(`${lado}Centro`), 0, p(`${lado}InicioDoOlhal`)],
  raioInterno: p(`${lado}RaioDoPino`),
  raioExterno: p(`${lado}RaioDoOlhal`),
  inicio: 0,
  fim: p(`${lado}LarguraDoOlhal`),
});

/** Nomeia as faces de um cilindro: as laterais e as duas tampas, na mesma parte. */
const partesDoCilindro = ({ id, nome, origem }) => [
  { id: `${id}-lateral`, operacao: 'parte', argumentos: { nome, sel: { origem: { op: 'cilindro', id: origem } } } },
  { id: `${id}-fundo`, operacao: 'parte', argumentos: { nome, sel: { origem: { op: 'cilindro', id: origem, tampa: 'fundo' } } } },
  { id: `${id}-topo`, operacao: 'parte', argumentos: { nome, sel: { origem: { op: 'cilindro', id: origem, tampa: 'topo' } } } },
];

const solidos = (...nos) => nos.map(({ id, sel }) => ({ id: `${id}-solido`, operacao: 'solido', argumentos: { sel } }));

/** Os nós da camisa. */
function nosDaCamisa({ rotula }) {
  const nos = [
    {
      id: 'volume-do-tubo',
      operacao: 'cilindro',
      argumentos: { origemId: 1, raio: p('raioExterno'), altura: p('comprimentoDaCamisa'), lados: p('lados'), eixo: 'x', em: [p('inicioDaCamisa'), 0, 0] },
    },
    {
      id: 'tubo-oco',
      operacao: 'casca',
      argumentos: {
        origemId: 2,
        solido: { origem: { op: 'cilindro', id: 1 }, tudo: true },
        abertas: { origem: { op: 'cilindro', id: 1, tampa: 'topo' } },
        espessura: p('parede'),
      },
    },
    {
      id: 'cabeca-anel',
      operacao: 'lathe',
      argumentos: {
        origemId: 3,
        perfil: aneis(p('raioDaGuia'), p('raioExternoDaCabeca'), p('comprimentoDaCabeca')),
        lados: p('lados'),
        eixo: 'x',
        em: [p('inicioDaCabeca'), 0, 0],
      },
    },
    ...nosDoOlhal({ lado: 'traseiro', origem: 4, rotula, nome: 'olhal-traseiro' }),
    {
      id: 'pescoco-traseiro-tronco',
      operacao: 'lathe',
      argumentos: {
        origemId: 6,
        perfil: [
          [0, 0], [p('pescocoRaioMenor'), 0], [p('pescocoRaioMenor'), p('pescocoComprimentoDoCilindro')],
          [p('pescocoRaioMaior'), p('pescocoComprimento')], [0, p('pescocoComprimento')],
        ],
        lados: p('lados'),
        eixo: 'x',
        em: [p('pescocoInicio'), 0, 0],
      },
    },
    { id: 'parte-tubo', operacao: 'parte', argumentos: { nome: 'tubo', sel: { origem: { op: 'casca', id: 2 } } } },
    { id: 'parte-cabeca', operacao: 'parte', argumentos: { nome: 'cabeca', sel: { origem: { op: 'lathe', id: 3 } } } },
    { id: 'parte-olhal-traseiro', operacao: 'parte', argumentos: { nome: 'olhal-traseiro', sel: { origem: { op: 'extrusao', id: 4 } } } },
    { id: 'parte-pescoco-traseiro', operacao: 'parte', argumentos: { nome: 'pescoco-traseiro', sel: { origem: { op: 'lathe', id: 6 } } } },
  ];
  if (rotula) nos.push({ id: 'parte-rotula-traseira', operacao: 'parte', argumentos: { nome: 'rotula-traseira', sel: { origem: { op: 'lathe', id: 5 } } } });
  nos.push(
    ...solidos(
      { id: 'tubo', sel: { origem: { op: 'casca', id: 2 } } },
      { id: 'cabeca', sel: { origem: { op: 'lathe', id: 3 } } },
      { id: 'olhal-traseiro', sel: { origem: { op: 'extrusao', id: 4 } } },
      { id: 'pescoco-traseiro', sel: { origem: { op: 'lathe', id: 6 } } },
      ...(rotula ? [{ id: 'rotula-traseira', sel: { origem: { op: 'lathe', id: 5 } } }] : []),
    ),
    porta({
      id: 'olhal-traseiro',
      de: { op: 'extrusao', id: 4, parede: 'externo' },
      interface: interfaceDoOlhal({ lado: 'traseiro', parte: 'olhal-traseiro' }),
    }),
    porta({
      id: 'guia-da-haste',
      de: { op: 'lathe', id: 3, faixa: 3 },
      interface: {
        forma: 'trilho',
        papel: 'guia',
        parte: 'cabeca',
        eixo: [1, 0, 0],
        centro: [p('frenteDaCamisa'), 0, 0],
        perfil: { largura: p('diametroDaGuia'), altura: p('diametroDaGuia') },
        curso: p('curso'),
      },
    }),
  );
  return nos;
}

/** Os nós da haste. */
function nosDaHaste({ rotula }) {
  const nos = [
    {
      id: 'volume-do-embolo',
      operacao: 'cilindro',
      argumentos: { origemId: 11, raio: p('raioDoEmbolo'), altura: p('comprimentoDoEmbolo'), lados: p('lados'), eixo: 'x', em: [p('inicioDoEmbolo'), 0, 0] },
    },
    {
      id: 'volume-do-corpo',
      operacao: 'cilindro',
      argumentos: { origemId: 12, raio: p('raioDoCorpo'), altura: p('comprimentoDoCorpo'), lados: p('lados'), eixo: 'x', em: [p('inicioDoCorpo'), 0, 0] },
    },
    ...nosDoOlhal({ lado: 'dianteiro', origem: 13, rotula, nome: 'olhal-dianteiro' }),
    {
      id: 'terminal-dianteiro-corpo',
      operacao: 'lathe',
      argumentos: {
        origemId: 15,
        perfil: [
          [0, 0], [p('terminalRaioDoColar'), 0], [p('terminalRaioDoColar'), p('terminalComprimentoDoColar')],
          [p('terminalRaioDoPescoco'), p('terminalComprimentoAteOPescoco')],
          [p('terminalRaioDoPescoco'), p('terminalComprimento')], [0, p('terminalComprimento')],
        ],
        lados: p('lados'),
        eixo: 'x',
        em: [p('terminalInicio'), 0, 0],
      },
    },
    ...partesDoCilindro({ id: 'parte-embolo', nome: 'embolo', origem: 11 }),
    ...partesDoCilindro({ id: 'parte-corpo', nome: 'haste', origem: 12 }),
    { id: 'parte-olhal-dianteiro', operacao: 'parte', argumentos: { nome: 'olhal-dianteiro', sel: { origem: { op: 'extrusao', id: 13 } } } },
    { id: 'parte-terminal', operacao: 'parte', argumentos: { nome: 'terminal', sel: { origem: { op: 'lathe', id: 15 } } } },
  ];
  if (rotula) nos.push({ id: 'parte-rotula-dianteira', operacao: 'parte', argumentos: { nome: 'rotula-dianteira', sel: { origem: { op: 'lathe', id: 14 } } } });
  nos.push(
    ...solidos(
      { id: 'embolo', sel: { grupo: 'embolo' } },
      { id: 'haste', sel: { grupo: 'haste' } },
      { id: 'olhal-dianteiro', sel: { origem: { op: 'extrusao', id: 13 } } },
      { id: 'terminal', sel: { origem: { op: 'lathe', id: 15 } } },
      ...(rotula ? [{ id: 'rotula-dianteira', sel: { origem: { op: 'lathe', id: 14 } } }] : []),
    ),
    porta({
      id: 'olhal-dianteiro',
      de: { op: 'extrusao', id: 13, parede: 'externo' },
      interface: interfaceDoOlhal({ lado: 'dianteiro', parte: 'olhal-dianteiro' }),
    }),
    porta({
      id: 'eixo-da-haste',
      de: { op: 'cilindro', id: 12 },
      interface: {
        forma: 'trilho',
        papel: 'deslizador',
        parte: 'haste',
        eixo: [1, 0, 0],
        centro: [p('frenteDaCamisa'), 0, 0],
        perfil: { largura: p('diametroDaHaste'), altura: p('diametroDaHaste') },
        curso: p('curso'),
      },
    }),
  );
  return nos;
}

const PARAMETROS_DA_CAMISA = (rotula) => ({
  lados: { tipo: 'inteiro' },
  segmentosDoArco: { tipo: 'inteiro' },
  curso: numero,
  parede: numero,
  raioExterno: numero,
  inicioDaCamisa: numero,
  comprimentoDaCamisa: numero,
  frenteDaCamisa: numero,
  raioExternoDaCabeca: numero,
  raioDaGuia: numero,
  diametroDaGuia: numero,
  inicioDaCabeca: numero,
  comprimentoDaCabeca: numero,
  pescocoInicio: numero,
  pescocoComprimento: numero,
  pescocoComprimentoDoCilindro: numero,
  pescocoRaioMenor: numero,
  pescocoRaioMaior: numero,
  ...PARAMETROS_DO_OLHAL('traseiro'),
  ...(rotula ? PARAMETROS_DA_ROTULA('traseiro') : {}),
});

const PARAMETROS_DA_HASTE = (rotula) => ({
  lados: { tipo: 'inteiro' },
  segmentosDoArco: { tipo: 'inteiro' },
  curso: numero,
  frenteDaCamisa: numero,
  diametroDaHaste: numero,
  raioDoEmbolo: numero,
  comprimentoDoEmbolo: numero,
  inicioDoEmbolo: numero,
  raioDoCorpo: numero,
  inicioDoCorpo: numero,
  comprimentoDoCorpo: numero,
  terminalInicio: numero,
  terminalComprimento: numero,
  terminalComprimentoDoColar: numero,
  terminalComprimentoAteOPescoco: numero,
  terminalRaioDoColar: numero,
  terminalRaioDoPescoco: numero,
  ...PARAMETROS_DO_OLHAL('dianteiro'),
  ...(rotula ? PARAMETROS_DA_ROTULA('dianteiro') : {}),
});

const composicao = ({ id, parametros, nos, sai }) => Object.freeze({
  formato: FORMATO_COMPOSICAO_PROCEDURAL,
  id,
  versao: '1.0.0',
  parametros,
  artefatos: { entra: [], sai: [MALHA, PARTE, PORTA, ...sai] },
  nos,
});

/** A declaração da articulação prismática entre a camisa e a haste, com o curso em milímetro e a folga de contato zero. */
const nosDaArticulacao = () => [{
  id: 'articulacao-da-haste',
  operacao: 'articulacao',
  argumentos: {
    id: 'haste-na-camisa',
    tipo: 'prismatica',
    fixo: { caminho: ['camisa'], porta: 'guia-da-haste' },
    movel: { caminho: ['haste'], porta: 'eixo-da-haste' },
    unidade: 'mm',
    curso: { minimo: 0, maximo: p('cursoEmMm') },
    passos: p('passosDoCurso'),
    folga: { valor: 0, unidade: 'mm' },
  },
}];

export const COMPOSICOES = Object.freeze([
  ...[0, 1].map((fixacao) => composicao({
    id: idDaCamisa(fixacao),
    parametros: PARAMETROS_DA_CAMISA(fixacao === 1),
    nos: nosDaCamisa({ rotula: fixacao === 1 }),
    sai: [],
  })),
  ...[0, 1].map((fixacao) => composicao({
    id: idDaHaste(fixacao),
    parametros: PARAMETROS_DA_HASTE(fixacao === 1),
    nos: nosDaHaste({ rotula: fixacao === 1 }),
    sai: [],
  })),
  ...[0, 1].flatMap((traseira) => [0, 1].map((dianteira) => composicao({
    id: idDoConjunto(traseira, dianteira),
    parametros: {
      ...PARAMETROS_DA_CAMISA(traseira === 1),
      ...PARAMETROS_DA_HASTE(dianteira === 1),
      cursoEmMm: numero,
      passosDoCurso: { tipo: 'inteiro' },
    },
    nos: [...nosDaCamisa({ rotula: traseira === 1 }), ...nosDaHaste({ rotula: dianteira === 1 }), ...nosDaArticulacao()],
    sai: [ARTICULACAO],
  }))),
]);
