/* material-da-receita.js — o normalizador único do material declarado em `MATERIAIS` da receita.
 *
 * POR QUE ELE EXISTE. O material da receita era lido em cinco lugares, cada um com a sua lista de campos e o seu padrão: o adaptador
 * do Three.js (`adaptar-three.js`: cor, aspereza, metalicidade, emissivo, mistura, opacidade), o adaptador da Oficina
 * (`procedural/nucleo/adaptador.js`: cor, emissivo, aspereza, semLuz, contorno, mistura, opacidade), a descrição das partes
 * (`descrever-partes.js`: as oito propriedades que a revisão persiste), o exportador OBJ (`exportar-obj.mjs`: tipo, cor,
 * metalicidade, aspereza, brilho e os extras da textura) e o módulo de textura (`modulos/textura`: acabamento, desgaste, veio,
 * borda, tabuas, ferrugem, manchas, rasgos). Nenhum recusava campo que não conhecia, então um campo escrito errado (ou ainda não
 * traduzido) era ignorado em silêncio e o modelador só descobria pela imagem.
 *
 * O CONTRATO. `normalizarMaterial(nome, definicao)` confere a declaração de UM material e devolve o material completo, com todo
 * campo presente, no valor declarado ou no padrão da tabela `CAMPOS`. Campo fora da tabela é recusado com o nome do campo e a
 * lista dos aceitos; valor fora da faixa é recusado com a faixa. Os campos que já existiam mantêm o sentido e o padrão que o
 * adaptador do Three.js lhes dava (aspereza 0,68; metalicidade 0,12; emissivo 0; opacidade 1, ou 0,58 quando a mistura é
 * transparente), de modo que a cena das receitas de hoje não muda.
 *
 * OS CAMPOS NOVOS são validados e guardados, mas ainda não mudam a cena: a tradução para o material físico do Three.js (verniz,
 * transmissão, relevo) é a fatia 2 do plano de materiais realistas, e a do arquivo glTF é a fatia 4. Isto é o contrato, não a
 * tradução.
 *
 * Nada aqui lê disco, relógio ou acaso: a mesma declaração dá sempre o mesmo material. */

const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const faixa = (min, max, padrao, unidade = '') => ({ tipo: 'numero', min, max, padrao, unidade });
const inteiro = (min, max, padrao) => ({ tipo: 'inteiro', min, max, padrao });
const opcao = (opcoes, padrao) => ({ tipo: 'opcao', opcoes, padrao });

/* A tabela é a fonte única: o validador, os padrões e a lista de campos aceitos saem dela. `padrao: null` quer dizer "sem valor
   declarado", que cada consumidor trata como já tratava (a cor cai na da face ou na cor padrão da cena; o tipo da textura sai
   do nome do material no exportador). */
export const CAMPOS = Object.freeze({
  /* os que já existiam */
  tipo: opcao(['liso', 'metal', 'madeira', 'tecido'], null),
  cor: { tipo: 'cor', padrao: null },
  mistura: opcao(['opaco', 'recorte', 'transparente'], 'opaco'),
  opacidade: faixa(0, 1, null),
  aspereza: faixa(0, 1, 0.68),
  metalicidade: faixa(0, 1, 0.12),
  emissivo: faixa(0, 8, 0),
  semLuz: { tipo: 'booleano', padrao: false },
  contorno: faixa(0, 8, 0),
  acabamento: opcao(['pintado', 'escovado'], null),
  brilho: faixa(0, 1, null),
  desgaste: faixa(0, 1, 0),
  veio: faixa(0, 10, 1),
  borda: faixa(0, 1, 0),
  tabuas: inteiro(0, 32, 0),
  ferrugem: faixa(0, 1, 0),
  manchas: faixa(0, 1, 0),
  rasgos: faixa(0, 1, 0),
  /* os novos do plano de materiais realistas */
  verniz: faixa(0, 1, 0),
  asperezaDoVerniz: faixa(0, 1, 0.05),
  transmissao: faixa(0, 1, 0),
  indiceDeRefracao: faixa(1, 2.5, 1.5),
  tomDoVidro: { tipo: 'cor', padrao: null },
  flocos: faixa(0, 1, 0),
  relevo: { tipo: 'relevo', padrao: null },
});

export const CAMPOS_ACEITOS = Object.freeze(Object.keys(CAMPOS));

/* OS CAMPOS QUE A REVISÃO PERSISTE: os oito que a revisão já gravava, na mesma ordem, e os sete novos. Persistem-se só os
   declarados (campo ausente não entra), então a revisão já gravada, sem campo novo, segue idêntica. Os campos da textura (tipo,
   acabamento, brilho, desgaste e afins) seguem fora da revisão, como sempre estiveram: incluí-los mudaria as revisões gravadas. */
export const CAMPOS_DA_APARENCIA = Object.freeze([
  'cor', 'emissivo', 'aspereza', 'metalicidade', 'semLuz', 'contorno', 'mistura', 'opacidade',
  'verniz', 'asperezaDoVerniz', 'transmissao', 'indiceDeRefracao', 'tomDoVidro', 'flocos', 'relevo',
]);

/* O relevo é um objeto declarado por tipo. A escala é o período do padrão em milímetro (o passo do prisma, o passo do desenho da
   banda, a altura da letra, o grão); o padrão de cada tipo é o de uma peça de tamanho de carro. A intensidade é a profundidade
   relativa, de 0 (liso) a 1 (a mais funda que o mapa suporta). */
export const RELEVOS = Object.freeze({
  prismas: { escala: faixa(0.5, 100, 6, 'mm'), intensidade: faixa(0, 1, 0.5) },
  bandaDeRodagem: { escala: faixa(2, 200, 30, 'mm'), intensidade: faixa(0, 1, 0.6) },
  letras: { escala: faixa(2, 100, 12, 'mm'), intensidade: faixa(0, 1, 0.5) },
  granulado: { escala: faixa(0.05, 5, 0.4, 'mm'), intensidade: faixa(0, 1, 0.35) },
});

export const TIPOS_DE_RELEVO = Object.freeze(Object.keys(RELEVOS));

const CAMPOS_DO_RELEVO = Object.freeze(['tipo', 'escala', 'intensidade']);

const dizer = (v) => (typeof v === 'string' ? JSON.stringify(v) : String(v));

function recusa(nome, campo, motivo) {
  return new Error(`material '${nome}': campo '${campo}' ${motivo}`);
}

function numeroNaFaixa(nome, campo, valor, spec) {
  if (typeof valor !== 'number' || !Number.isFinite(valor)) {
    throw recusa(nome, campo, `precisa ser número entre ${spec.min} e ${spec.max} (recebido ${dizer(valor)}).`);
  }
  if (valor < spec.min || valor > spec.max) {
    throw recusa(nome, campo, `fora da faixa ${spec.min} a ${spec.max}${spec.unidade ? ` ${spec.unidade}` : ''} (recebido ${valor}).`);
  }
  return Object.is(valor, -0) ? 0 : valor;
}

function relevoNormalizado(nome, valor) {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) {
    throw recusa(nome, 'relevo', `precisa ser objeto { tipo, escala?, intensidade? } (recebido ${dizer(valor)}).`);
  }
  for (const chave of Object.keys(valor)) {
    if (!CAMPOS_DO_RELEVO.includes(chave)) {
      throw recusa(nome, `relevo.${chave}`, `desconhecido. Aceitos em relevo: ${CAMPOS_DO_RELEVO.join(', ')}.`);
    }
  }
  if (!TIPOS_DE_RELEVO.includes(valor.tipo)) {
    throw recusa(nome, 'relevo.tipo', `precisa ser um de ${TIPOS_DE_RELEVO.join(', ')} (recebido ${dizer(valor.tipo)}).`);
  }
  const spec = RELEVOS[valor.tipo];
  const escala = valor.escala === undefined ? spec.escala.padrao : numeroNaFaixa(nome, 'relevo.escala', valor.escala, spec.escala);
  const intensidade = valor.intensidade === undefined
    ? spec.intensidade.padrao
    : numeroNaFaixa(nome, 'relevo.intensidade', valor.intensidade, spec.intensidade);
  return Object.freeze({ tipo: valor.tipo, escala, intensidade });
}

function campoNormalizado(nome, campo, valor) {
  const spec = CAMPOS[campo];
  switch (spec.tipo) {
    case 'numero': return numeroNaFaixa(nome, campo, valor, spec);
    case 'inteiro':
      if (!Number.isInteger(valor)) throw recusa(nome, campo, `precisa ser inteiro entre ${spec.min} e ${spec.max} (recebido ${dizer(valor)}).`);
      return numeroNaFaixa(nome, campo, valor, spec);
    case 'cor':
      if (typeof valor !== 'string' || !HEX.test(valor)) throw recusa(nome, campo, `precisa ser cor hexadecimal #rgb ou #rrggbb (recebido ${dizer(valor)}).`);
      return valor;
    case 'booleano':
      if (typeof valor !== 'boolean') throw recusa(nome, campo, `precisa ser verdadeiro ou falso (recebido ${dizer(valor)}).`);
      return valor;
    case 'opcao':
      if (!spec.opcoes.includes(valor)) throw recusa(nome, campo, `precisa ser um de ${spec.opcoes.join(', ')} (recebido ${dizer(valor)}).`);
      return valor;
    case 'relevo': return relevoNormalizado(nome, valor);
    default: throw new Error(`material-da-receita: tipo de campo '${spec.tipo}' sem validador.`);
  }
}

/**
 * Confere a declaração de um material e a devolve completa. `definicao` ausente ou `undefined` é o material sem declaração
 * (a face cita um nome que a receita não declara), que vale como todos os padrões, como o adaptador sempre tratou.
 */
export function normalizarMaterial(nome, definicao = {}) {
  if (definicao === null || typeof definicao !== 'object' || Array.isArray(definicao)) {
    throw new Error(`material '${nome}': a declaração precisa ser objeto de campos (recebido ${dizer(definicao)}). Aceitos: ${CAMPOS_ACEITOS.join(', ')}.`);
  }
  for (const campo of Object.keys(definicao)) {
    if (!Object.hasOwn(CAMPOS, campo)) {
      throw new Error(`material '${nome}': campo '${campo}' desconhecido. Aceitos: ${CAMPOS_ACEITOS.join(', ')}.`);
    }
  }
  const saida = {};
  for (const campo of CAMPOS_ACEITOS) {
    const valor = definicao[campo];
    saida[campo] = valor === undefined ? CAMPOS[campo].padrao : campoNormalizado(nome, campo, valor);
  }
  /* A opacidade padrão depende da mistura, como no adaptador do Three.js: 0,58 quando é transparente, 1 nos demais. */
  if (saida.opacidade === null) saida.opacidade = saida.mistura === 'transparente' ? 0.58 : 1;
  return Object.freeze(saida);
}

/** Normaliza o dicionário `MATERIAIS` inteiro, nome a nome, na ordem declarada. */
export function normalizarMateriais(materiais = {}) {
  if (materiais === null || typeof materiais !== 'object' || Array.isArray(materiais)) {
    throw new Error(`MATERIAIS precisa ser um dicionário nome -> declaração (recebido ${dizer(materiais)}).`);
  }
  const saida = {};
  for (const [nome, definicao] of Object.entries(materiais)) saida[nome] = normalizarMaterial(nome, definicao);
  return saida;
}
