/* composicoes.js — as composições procedurais da família `dobradica`, geradas por laço porque o número de nós e de furos
   muda a quantidade de passos e a composição v1 só substitui valores.

   Há três tipos. `dobradica.pino` é o pino. `dobradica.folha-<lado>-n<nós>-f<furos>` é uma folha: a chapa (um cubo
   fino) menos o corte da altura dos nós da outra folha e menos os furos de fixação, unida aos tubos dos seus nós; a chapa
   e os tubos têm partes próprias, porque a porta do nó mede o raio sobre a parte que a origem dela toca. E
   `dobradica.conjunto-n<nós>-f<furos>` junta o pino e as duas folhas numa peça só, com as mesmas composições dentro, para
   a bancada e para a aprovação mecânica olharem a dobradiça inteira; a montagem v5 usa as três peças soltas.

   Os ids de origem de cada composição são literais e distintos entre o pino (300), a folha D (100) e a folha E (200), para
   os três caberem na mesma peça do conjunto sem repetir origem. */
import { FORMATO_COMPOSICAO_PROCEDURAL } from '../../nucleo/entrada.js';
import { argumentosDaFolha, argumentosDoPino, geometriaDaDobradica, nosDasFolhas } from './geometria.js';

const MALHA = 'mecanifica.malha-poligonal@1';
const PARTE = 'mecanifica.parte@1';
const PORTA = 'mecanifica.porta@1';

export const FAIXA_DE_NOS = Object.freeze({ minimo: 3, maximo: 9 });
export const FAIXA_DE_FUROS = Object.freeze({ minimo: 1, maximo: 5 });
export const ID_DO_PINO = 'dobradica.pino';
export const idDaFolha = (lado, nos, furos) => `dobradica.folha-${lado}-n${nos}-f${furos}`;
export const idDoConjunto = (nos, furos) => `dobradica.conjunto-n${nos}-f${furos}`;

const BASE = { d: 100, e: 200, pino: 300 };
const NOME_DA_PARTE = { d: 'folhaD', e: 'folhaE' };
const NOME_DOS_NOS = { d: 'nosD', e: 'nosE' };
const EIXO_DAS_PORTAS = [0, -1, 0];

const p = (nome) => ({ parametro: nome });
const tipoDoParametro = (nome, valor) => {
  if (Array.isArray(valor)) return 'vetor3';
  if (nome.startsWith('lados')) return 'inteiro';
  return 'numero';
};
const parametrosDe = (argumentos) => Object.fromEntries(Object.keys(argumentos).map((nome) => [nome, { tipo: tipoDoParametro(nome, argumentos[nome]) }]));
const origem = (op, id) => ({ origem: { op, id } });
const composicao = (id, argumentosExemplo, nos, saidas) => Object.freeze({
  formato: FORMATO_COMPOSICAO_PROCEDURAL, id, versao: '1.0.0', parametros: parametrosDe(argumentosExemplo),
  artefatos: { entra: [], sai: saidas }, nos,
});

function nosDoPino() {
  const id = BASE.pino + 1;
  return [
    {
      id: 'revolucao-do-pino', operacao: 'lathe',
      argumentos: { origemId: id, perfil: [[0, p('inicio')], [p('raio'), p('inicio')], [p('raio'), p('fim')], [0, p('fim')]], lados: p('lados') },
    },
    { id: 'parte-do-pino', operacao: 'parte', argumentos: { nome: 'pino', sel: origem('lathe', id) } },
    { id: 'material-do-pino', operacao: 'material', argumentos: { usa: 'pino', sel: origem('lathe', id) } },
    { id: 'solido-do-pino', operacao: 'solido', argumentos: { sel: origem('lathe', id) } },
    {
      id: 'porta-do-pino', operacao: 'publicarPorta',
      argumentos: {
        id: 'eixo-do-pino', de: { op: 'lathe', id },
        interface: { forma: 'cilindro', papel: 'externa', eixo: EIXO_DAS_PORTAS, referencia: [1, 0, 0], centro: p('centroDaPorta'), raio: p('raio'), inicio: p('comprimentoNegativo'), fim: 0 },
      },
    },
  ];
}

function nosDaFolha(lado, nos, furos) {
  const base = BASE[lado];
  const { d, e } = nosDasFolhas(nos);
  const proprios = lado === 'd' ? d : e;
  const outros = lado === 'd' ? e : d;
  const idPlaca = base + 1;
  const idCorte = (j) => base + 10 + j;
  const idNo = (i) => base + 20 + i;
  const idFuro = (k) => base + 40 + k;
  const idSubtracao = base + 60;
  const idUniao = base + 70;
  const lista = [];
  lista.push({ id: 'chapa', operacao: 'cubo', argumentos: { origemId: idPlaca, larg: p('larguraDaChapa'), alt: p('altura'), prof: p('espessura'), em: p('emDaChapa') } });
  outros.forEach((_, j) => lista.push({
    id: `corte-${j}`, operacao: 'cubo',
    argumentos: { origemId: idCorte(j), larg: p('larguraDoCorte'), alt: p('alturaDoCorte'), prof: p('profundidadeDoCorte'), em: p(`emCorte${j}`) },
  }));
  for (let k = 0; k < furos; k += 1) {
    lista.push({
      id: `furo-${k}`, operacao: 'lathe',
      argumentos: {
        origemId: idFuro(k), eixo: 'z',
        perfil: [[0, p('zInicialDoFuro')], [p('raioDoFuro'), p('zInicialDoFuro')], [p('raioDoFuro'), p('zFinalDoFuro')], [0, p('zFinalDoFuro')]],
        lados: p('ladosDoFuro'), em: p(`emFuro${k}`),
      },
    });
  }
  lista.push({
    id: 'chapa-recortada', operacao: 'subtrair',
    argumentos: {
      origemId: idSubtracao,
      solidos: [origem('cubo', idPlaca), ...outros.map((_, j) => origem('cubo', idCorte(j))), ...Array.from({ length: furos }, (_, k) => origem('lathe', idFuro(k)))],
    },
  });
  proprios.forEach((_, i) => {
    const dele = { origem: { op: 'chapaDobrada', id: idNo(i) } };
    const trecho = () => ({ comprimento: p('trechoDoRolo') });
    const aba = { comprimento: p('abaDoNo') };
    lista.push({
      id: `no-${i}`, operacao: 'chapaDobrada',
      argumentos: {
        origemId: idNo(i), espessura: p('espessura'), raioInterno: p('raioInternoDoNo'), largura: p('comprimentoDoNo'), segmentosPorQuarto: p('segmentosDoRolo'), tampas: 'em-tiras',
        abas: [{ ...aba, angulo: -90 }, { ...trecho(), angulo: -90 }, { ...trecho(), angulo: -90 }, trecho()],
      },
    });
    lista.push({ id: `no-${i}-em-pe`, operacao: 'rotaciona', argumentos: { eixo: 'x', graus: 90, pivo: [0, 0, 0], sel: dele } });
    if (lado === 'd') lista.push({ id: `no-${i}-para-a-direita`, operacao: 'rotaciona', argumentos: { eixo: 'z', graus: 180, pivo: [0, 0, 0], sel: dele } });
    lista.push({ id: `no-${i}-no-eixo`, operacao: 'transladar', argumentos: { d: p(`emNo${i}`), sel: dele } });
  });
  lista.push({ id: 'parte-da-chapa', operacao: 'parte', argumentos: { nome: NOME_DA_PARTE[lado], sel: origem('subtrair', idSubtracao) } });
  /* a chapa de cada nó é parte do nó, menos a aba que sai tangente ao rolo (a primeira, com as tampas dela e a borda do começo),
     que é da folha: todos os vértices do que fica no nó estão no anel do rolo, e é neles que a porta mede o raio */
  const DA_FOLHA = [['aba', { aba: 'primeira' }], ['tampa-menos', { aba: 'primeira', tampa: 'menos' }], ['tampa-mais', { aba: 'primeira', tampa: 'mais' }], ['borda', { borda: 'inicio' }]];
  proprios.forEach((_, i) => {
    const citar = (citacao) => ({ origem: { op: 'chapaDobrada', id: idNo(i), ...citacao } });
    lista.push({ id: `parte-do-no-${i}`, operacao: 'parte', argumentos: { nome: NOME_DOS_NOS[lado], sel: citar({}) } });
    for (const [nome, citacao] of DA_FOLHA) lista.push({ id: `parte-${nome}-${i}`, operacao: 'parte', argumentos: { nome: NOME_DA_PARTE[lado], sel: citar(citacao), substituir: true } });
  });
  lista.push({
    id: 'uniao', operacao: 'unir',
    argumentos: { origemId: idUniao, solidos: [origem('subtrair', idSubtracao), ...proprios.map((_, i) => origem('chapaDobrada', idNo(i)))] },
  });
  lista.push({ id: 'material-da-folha', operacao: 'material', argumentos: { usa: 'chapa', sel: origem('unir', idUniao) } });
  lista.push({ id: 'solido-da-folha', operacao: 'solido', argumentos: { sel: origem('unir', idUniao) } });
  lista.push({
    id: 'porta-dos-nos', operacao: 'publicarPorta',
    argumentos: {
      id: `nos-da-folha-${lado}`, de: { op: 'chapaDobrada', id: idNo(0), dobra: { passo: 1, fase: 0 } },
      interface: {
        forma: 'anel', papel: 'recebe', eixo: EIXO_DAS_PORTAS, centro: p('centroDaPorta'),
        raioInterno: p('raioInternoDoNo'), raioExterno: p('raioExternoDoNo'), inicio: p('comprimentoDoNoNegativo'), fim: 0,
      },
    },
  });
  lista.push({
    id: 'porta-do-plano', operacao: 'publicarPorta',
    argumentos: {
      id: `plano-da-folha-${lado}`, de: { op: 'unir', id: idUniao },
      interface: { forma: 'plano', papel: 'apoia', ponto: p('pontoDoPlano'), normal: [0, 0, 1], extensao: [p('extensaoLargura'), p('extensaoAltura')] },
    },
  });
  return lista;
}

const GEO_DE_EXEMPLO = (nos) => geometriaDaDobradica({ altura: 100, larguraFolha: 35, espessura: 2, diametroPino: 5, nos, furos: 1 });

/* Os nomes dos argumentos de uma folha dependem só do lado, dos nós e dos furos. */
function argumentosDeExemplo(lado, nos, furos) {
  const geo = geometriaDaDobradica({ altura: 100, larguraFolha: 35, espessura: 2, diametroPino: 5, nos, furos });
  return argumentosDaFolha(geo, lado);
}

const PREFIXO = { pino: 'pino', d: 'folhaD', e: 'folhaE' };
const maiuscula = (nome) => nome[0].toUpperCase() + nome.slice(1);
/** O nome que um argumento de `quem` ('pino', 'd' ou 'e') tem na composição do conjunto. */
export const nomeNoConjunto = (quem, nome) => `${PREFIXO[quem]}${maiuscula(nome)}`;

function composicaoDoConjunto(nos, furos) {
  const exemplos = { pino: argumentosDoPino(GEO_DE_EXEMPLO(nos)), d: argumentosDeExemplo('d', nos, furos), e: argumentosDeExemplo('e', nos, furos) };
  const parametros = {};
  const argumentosDosNos = {};
  for (const quem of ['pino', 'd', 'e']) {
    argumentosDosNos[quem] = {};
    for (const nome of Object.keys(exemplos[quem])) {
      parametros[nomeNoConjunto(quem, nome)] = { tipo: tipoDoParametro(nome, exemplos[quem][nome]) };
      argumentosDosNos[quem][nome] = p(nomeNoConjunto(quem, nome));
    }
  }
  return Object.freeze({
    formato: FORMATO_COMPOSICAO_PROCEDURAL, id: idDoConjunto(nos, furos), versao: '1.0.0', parametros,
    artefatos: { entra: [], sai: [MALHA, PARTE, PORTA] },
    nos: [
      { id: 'pino', composicao: ID_DO_PINO, argumentos: argumentosDosNos.pino },
      { id: 'folha-d', composicao: idDaFolha('d', nos, furos), argumentos: argumentosDosNos.d },
      { id: 'folha-e', composicao: idDaFolha('e', nos, furos), argumentos: argumentosDosNos.e },
    ],
  });
}

function gerarComposicoes() {
  const lista = [composicao(ID_DO_PINO, argumentosDoPino(GEO_DE_EXEMPLO(FAIXA_DE_NOS.minimo)), nosDoPino(), [MALHA, PARTE, PORTA])];
  for (let nos = FAIXA_DE_NOS.minimo; nos <= FAIXA_DE_NOS.maximo; nos += 1) {
    for (let furos = FAIXA_DE_FUROS.minimo; furos <= FAIXA_DE_FUROS.maximo; furos += 1) {
      for (const lado of ['d', 'e']) {
        lista.push(composicao(idDaFolha(lado, nos, furos), argumentosDeExemplo(lado, nos, furos), nosDaFolha(lado, nos, furos), [MALHA, PARTE, PORTA]));
      }
      lista.push(composicaoDoConjunto(nos, furos));
    }
  }
  return Object.freeze(lista);
}

export const COMPOSICOES = gerarComposicoes();
