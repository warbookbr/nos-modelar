/* uso-operacoes.js — contratos Agent-First executáveis das operações nativas.
   A tabela descreve como chamar a capacidade; o executor continua decidindo a
   geometria. Os exemplos alimentam também o corpus diferencial R00. */

export const FORMATO_USO_OPERACAO = 'mecanifica.uso-operacao@1';
export const FORMATO_EXEMPLO_OPERACAO = 'mecanifica.exemplo-operacao@1';

const tipos = Object.freeze({
  escalar: { anyOf: [{ type: 'number' }, { type: 'string' }, { type: 'array' }], description: 'Número, nome de PARAM/TOPO ou expressão numérica declarativa.' },
  inteiro: { anyOf: [{ type: 'integer' }, { type: 'string' }, { type: 'array' }], description: 'Inteiro ou expressão resolvida para inteiro.' },
  vetor3: { anyOf: [{ type: 'string' }, { type: 'array', minItems: 3, maxItems: 3 }], description: 'Ponto/vetor [x,y,z] ou nome de ponto em PARAMS/TOPO.' },
  texto: { type: 'string', minLength: 1 },
  booleano: { type: 'boolean' },
  eixo: { enum: ['x', 'y', 'z'] },
  cor: { anyOf: [{ type: 'string' }, { type: 'null' }] },
  origemId: { type: 'integer', minimum: 0, description: 'Identidade semântica escolhida pelo autor; não é índice de passo.' },
  idLegado: { type: 'integer', minimum: 0, description: 'Base posicional legada. Prefira origemId para identidade persistida.' },
  origem: { type: 'object', description: 'Origem estrutural semântica publicada por uma operação anterior.' },
  selecao: { type: 'object', description: 'Seleção semântica por tudo, origem, alias, grupo, região ou ids legados aceitos.' },
  listaInteiros: { type: 'array', items: { type: 'integer' } },
  listaTextos: { type: 'array', items: { type: 'string', minLength: 1 } },
  lista: { type: 'array' },
  objeto: { type: 'object' },
});

function schemaDosArgumentos(nome, campos, obrigatorios) {
  if (!campos || typeof campos !== 'object' || Array.isArray(campos)) throw new TypeError(`uso de '${nome}' exige mapa de campos`);
  for (const [campo, definicao] of Object.entries(campos)) {
    if (!campo || !Array.isArray(definicao) || !tipos[definicao[0]]) throw new TypeError(`uso de '${nome}' tem tipo desconhecido no campo '${campo}'`);
  }
  for (const campo of obrigatorios) if (!Object.hasOwn(campos, campo)) throw new TypeError(`uso de '${nome}' exige campo obrigatório declarado '${campo}'`);
  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: `mecanifica.argumentos.${nome}@1`,
    type: 'object',
    additionalProperties: false,
    required: [...obrigatorios],
    properties: Object.fromEntries(Object.entries(campos).map(([campo, [tipo, descricao]]) => [
      campo,
      { ...tipos[tipo], ...(descricao ? { description: descricao } : {}) },
    ])),
  };
}

function congelar(valor) {
  if (valor && typeof valor === 'object' && !Object.isFrozen(valor)) {
    Object.values(valor).forEach(congelar);
    Object.freeze(valor);
  }
  return valor;
}

export function criarContratoUsoOperacao(nome, {
  intencao,
  campos,
  obrigatorios = [],
  passos,
  parametros = {},
  topologia = {},
  materiais = {},
  esqueleto = null,
  aliases = [],
  precondicoes = [],
  limites = [],
  diagnosticos = [],
} = {}) {
  if (typeof nome !== 'string' || !nome || typeof intencao !== 'string' || !intencao) {
    throw new TypeError('uso de operação exige nome e intenção');
  }
  if (!campos || !Array.isArray(passos) || !passos.some(([operacao]) => operacao === nome)) {
    throw new TypeError(`uso de '${nome}' exige campos e exemplo que execute a operação`);
  }
  return congelar({
    formato: FORMATO_USO_OPERACAO,
    intencao,
    schemaArgumentos: schemaDosArgumentos(nome, campos, obrigatorios),
    exemplo: {
      formato: FORMATO_EXEMPLO_OPERACAO,
      PASSOS: passos,
      PARAMS: parametros,
      TOPO: topologia,
      MATERIAIS: materiais,
      ESQUELETO: esqueleto,
      ALIASES: aliases,
    },
    precondicoes: [...precondicoes],
    limites: [...limites],
    diagnosticos: diagnosticos.map(({ quando, acao }) => ({ quando, acao })),
  });
}

const idLegado = ['id', 'idLegado', 'Base de IDs do passo para compatibilidade; prefira origemId.'];
const origemId = ['origemId', 'origemId', 'Identidade estrutural publicada pela operação.'];
const em = ['em', 'vetor3', 'Translação aplicada somente ao que este gerador criou.'];
const eixoCriacao = ['eixo', 'eixo', 'Direção do eixo de revolução; o padrão é y.'];
const selecao = ['sel', 'selecao', 'Seleção semântica; quando ausente, siga o contrato específico da operação.'];
const faces = ['faces', 'listaInteiros', 'Compatibilidade posicional legada; não misture com sel.'];
const cuboBase = (extra = []) => [['cubo', { origemId: 1, larg: 1, alt: 1, prof: 1 }], ...extra];
const origemTopo = { op: 'cubo', id: 1, face: 'topo' };

const definicoes = {
  cubo: {
    intencao: 'Criar uma caixa retangular apoiada em y=0.',
    campos: { [idLegado[0]]: idLegado.slice(1), [origemId[0]]: origemId.slice(1), lado: ['escalar', 'Atalho para largura, altura e profundidade.'], larg: ['escalar', 'Largura em x.'], alt: ['escalar', 'Altura em y.'], prof: ['escalar', 'Profundidade em z.'], [em[0]]: em.slice(1) },
    passos: [['cubo', { lado: 1 }]], limites: ['Produz seis faces nominais; dimensões não devem ser degeneradas.'],
  },
  cilindro: {
    intencao: 'Criar cilindro fechado com laterais e duas tampas endereçáveis.',
    campos: { [idLegado[0]]: idLegado.slice(1), [origemId[0]]: origemId.slice(1), raio: ['escalar', 'Raio positivo.'], altura: ['escalar', 'Comprimento no eixo.'], lados: ['inteiro', 'Resolução circular, mínimo 3.'], [em[0]]: em.slice(1), [eixoCriacao[0]]: eixoCriacao.slice(1) },
    passos: [['cilindro', { raio: 0.5, altura: 1, lados: 8 }]], limites: ['lados muda a topologia e precisa caber no bloco de IDs.'],
  },
  esfera: {
    intencao: 'Criar esfera UV apoiada no chão.',
    campos: { [idLegado[0]]: idLegado.slice(1), [origemId[0]]: origemId.slice(1), raio: ['escalar', 'Raio positivo.'], aneis: ['inteiro', 'Divisões polares, mínimo 2.'], lados: ['inteiro', 'Divisões azimutais, mínimo 3.'], [em[0]]: em.slice(1) },
    passos: [['esfera', { raio: 0.5, aneis: 4, lados: 6 }]],
  },
  cone: {
    intencao: 'Criar cone fechado com base circular.',
    campos: { [idLegado[0]]: idLegado.slice(1), [origemId[0]]: origemId.slice(1), raio: ['escalar', 'Raio da base.'], altura: ['escalar', 'Comprimento no eixo.'], lados: ['inteiro', 'Resolução circular.'], [em[0]]: em.slice(1), [eixoCriacao[0]]: eixoCriacao.slice(1) },
    passos: [['cone', { raio: 0.5, altura: 1, lados: 8 }]],
  },
  plano: {
    intencao: 'Criar grade plana no plano xz.',
    campos: { [idLegado[0]]: idLegado.slice(1), [origemId[0]]: origemId.slice(1), largura: ['escalar', 'Extensão em x.'], profundidade: ['escalar', 'Extensão em z.'], seg: ['inteiro', 'Divisões por eixo.'], [em[0]]: em.slice(1) },
    passos: [['plano', { largura: 1, profundidade: 1 }]], limites: ['É superfície aberta, não sólido.'],
  },
  chamferBox: {
    intencao: 'Criar caixa de faces planas com quinas chanfradas.',
    campos: { [idLegado[0]]: idLegado.slice(1), [origemId[0]]: origemId.slice(1), lado: ['escalar', 'Atalho cúbico.'], larg: ['escalar', 'Largura.'], alt: ['escalar', 'Altura.'], prof: ['escalar', 'Profundidade.'], chanfro: ['escalar', 'Recuo das quinas.'], [em[0]]: em.slice(1) },
    passos: [['chamferBox', { larg: 1, alt: 1, prof: 1, chanfro: 0.1 }]], limites: ['Não produz arredondamento suave; mantém painéis planos.'],
  },
  lathe: {
    intencao: 'Revolucionar perfil [raio,y] em torno de um eixo.',
    campos: { [idLegado[0]]: idLegado.slice(1), [origemId[0]]: origemId.slice(1), perfil: ['lista', 'Ao menos dois pontos [raio,y] ou [raio,y,concordancia].'], lados: ['inteiro', 'Resolução da revolução.'], segmentosCurva: ['inteiro', 'Discretização das concordâncias.'], [em[0]]: em.slice(1), [eixoCriacao[0]]: eixoCriacao.slice(1) },
    obrigatorios: ['perfil'], passos: [['lathe', { perfil: [[0.3, 0], [0.3, 1]], lados: 8 }]],
    precondicoes: ['Perfil precisa ter ao menos dois pontos e raios não negativos.'],
  },
  loft: {
    intencao: 'Conectar seções ao longo de um caminho 3D.',
    campos: { [idLegado[0]]: idLegado.slice(1), [origemId[0]]: origemId.slice(1), secoes: ['lista', 'Ao menos duas seções {pos, raio} ou {pos, contorno}.'], lados: ['inteiro', 'Pontos por seção.'], orientacao: ['vetor3', 'Referência explícita do frame local.'], segmentosCurva: ['inteiro', 'Discretização de concordâncias.'] },
    obrigatorios: ['secoes'], passos: [['loft', { secoes: [{ pos: [0, 0, 0], raio: 0.2 }, { pos: [0, 1, 0], raio: 0.2 }], lados: 8 }]],
    precondicoes: ['Seções devem ser ordenadas, válidas e compatíveis com lados.'],
  },
  inflate: {
    intencao: 'Construir volume voxel fechado pela interseção de dois contornos 2D.',
    campos: { [idLegado[0]]: idLegado.slice(1), [origemId[0]]: origemId.slice(1), contornoLado: ['lista', 'Polígono lateral com ao menos três pontos.'], contornoTopo: ['lista', 'Polígono superior com ao menos três pontos.'], divisoes: ['inteiro', 'Resolução da grade voxel.'], segmentosCurva: ['inteiro', 'Discretização das concordâncias.'] },
    obrigatorios: ['contornoLado', 'contornoTopo'], passos: [['inflate', { contornoLado: [[0, 0], [1, 0], [1, 1], [0, 1]], contornoTopo: [[0, 0], [1, 0], [1, 1], [0, 1]], divisoes: 2 }]],
    limites: ['Produz forma blocky; grade acima do limite de sanidade é recusada.'],
  },
  publicarPorta: {
    intencao: 'Publicar interface semântica endereçável de uma origem existente.',
    campos: { nome: ['texto', 'ID legado da porta.'], id: ['texto', 'ID semântico atual.'], rotulo: ['texto', 'Rótulo obrigatório quando id é usado.'], de: ['origem', 'Origem geométrica publicada.'], interface: ['objeto', 'Interface cilíndrica ou anular mensurável.'] },
    obrigatorios: ['de'], passos: cuboBase([['publicarPorta', { id: 'topo', rotulo: 'Topo', de: origemTopo }]]),
    precondicoes: ['Use nome ou o par id+rotulo, nunca ambos.'],
  },
  moveV: { intencao: 'Mover um vértice por ID posicional.', campos: { v: ['inteiro', 'ID do vértice.'], d: ['vetor3', 'Deslocamento.'] }, obrigatorios: ['v'], passos: cuboBase([['moveV', { v: 0, d: [0, 0.1, 0] }]]), limites: ['Operação posicional; prefira transformações com seleção semântica.'] },
  extruda: { intencao: 'Extrudar uma face por ID posicional.', campos: { face: ['inteiro', 'ID da face.'], dist: ['escalar', 'Distância assinada.'] }, obrigatorios: ['face'], passos: cuboBase([['extruda', { face: 1, dist: 0.1 }]]), limites: ['Operação posicional e local.'] },
  mescla: { intencao: 'Fundir vértices posicionais em um vértice-alvo.', campos: { de: ['listaInteiros', 'Vértices removidos.'], para: ['inteiro', 'Vértice preservado.'] }, obrigatorios: ['de', 'para'], passos: cuboBase([['mescla', { de: [1], para: 0 }]]), limites: ['Operação posicional; conferir efeito porque entrada vazia pode ser no-op.'] },
  moveF: { intencao: 'Mover todos os vértices de uma face posicional.', campos: { face: ['inteiro', 'ID da face.'], d: ['vetor3', 'Deslocamento.'] }, obrigatorios: ['face'], passos: cuboBase([['moveF', { face: 1, d: [0, 0.1, 0] }]]), limites: ['Operação posicional.'] },
  moveA: { intencao: 'Mover os dois vértices de uma aresta posicional.', campos: { a: ['inteiro', 'Primeiro vértice.'], b: ['inteiro', 'Segundo vértice.'], d: ['vetor3', 'Deslocamento.'] }, obrigatorios: ['a', 'b'], passos: cuboBase([['moveA', { a: 0, b: 1, d: [0, 0.1, 0] }]]), limites: ['Operação posicional.'] },
  vira: { intencao: 'Inverter o winding de uma face posicional.', campos: { face: ['inteiro', 'ID da face.'] }, obrigatorios: ['face'], passos: cuboBase([['vira', { face: 1 }]]), limites: ['Operação posicional; use somente para corrigir orientação comprovada.'] },
  apagaFace: { intencao: 'Remover exatamente uma face, preferencialmente por seleção semântica.', campos: { face: ['inteiro', 'ID legado da face.'], [selecao[0]]: selecao.slice(1) }, passos: cuboBase([['apagaFace', { sel: { origem: origemTopo } }]]), precondicoes: ['A seleção precisa resolver exatamente uma face.'] },
  displace: { intencao: 'Deslocar seleção ao longo das normais por ruído determinístico.', campos: { [selecao[0]]: selecao.slice(1), amplitude: ['escalar', 'Desvio máximo.'], frequencia: ['escalar', 'Escala espacial do ruído.'], semente: ['escalar', 'Semente reproduzível.'] }, passos: cuboBase([['displace', { amplitude: 0.01, frequencia: 1, semente: 7 }]]), precondicoes: ['Vértices precisam pertencer a faces com normal calculável.'] },
  encostar: { intencao: 'Posicionar uma seleção em contato direcional com uma referência.', campos: { [selecao[0]]: selecao.slice(1), referencia: ['selecao', 'Seleção imóvel.'], direcao: ['vetor3', 'Direção não nula declarada.'], folga: ['escalar', 'Separação final não negativa.'] }, obrigatorios: ['sel', 'referencia', 'direcao'], passos: [['cubo', { origemId: 1, lado: 1 }], ['cubo', { origemId: 2, lado: 1, em: [0, 0.5, 0] }], ['encostar', { sel: { origem: { op: 'cubo', id: 2 } }, referencia: { origem: { op: 'cubo', id: 1 } }, direcao: [0, 1, 0] }]], limites: ['Não é solver, colisão ou encaixe por extensão.'] },
  transladar: { intencao: 'Transladar malha inteira ou seleção semântica.', campos: { d: ['vetor3', 'Deslocamento.'], [selecao[0]]: selecao.slice(1), [faces[0]]: faces.slice(1) }, passos: cuboBase([['transladar', { d: [0, 0.1, 0] }]]) },
  rotaciona: { intencao: 'Rotacionar malha ou seleção em convenção destra.', campos: { eixo: ['eixo', 'Eixo da rotação.'], graus: ['escalar', 'Ângulo em graus.'], pivo: ['vetor3', 'Pivô; o padrão é o centroide.'], [selecao[0]]: selecao.slice(1), [faces[0]]: faces.slice(1) }, obrigatorios: ['eixo'], passos: cuboBase([['rotaciona', { eixo: 'y', graus: 15 }]]) },
  espelha: { intencao: 'Duplicar faces refletidas, com modo estrutural opcional.', campos: { eixo: ['eixo', 'Normal do plano de espelho.'], pos: ['escalar', 'Posição do plano.'], [selecao[0]]: selecao.slice(1), [faces[0]]: faces.slice(1), origemId: ['origemId', 'Identidade da saída estrutural.'], derivaDe: ['origem', 'Origem completa copiada no modo estrutural.'] }, obrigatorios: ['eixo'], passos: cuboBase([['espelha', { eixo: 'x', origemId: 9, derivaDe: { op: 'cubo', id: 1 }, sel: { origem: { op: 'cubo', id: 1 } } }]]), precondicoes: ['Modo estrutural exige origemId, derivaDe e sel.origem equivalentes.'] },
  arranja: { intencao: 'Criar cópias lineares ou radiais com identidade estrutural.', campos: { modo: ['texto', "'linear' ou 'radial'."], total: ['inteiro', 'Total incluindo a fonte.'], d: ['vetor3', 'Passo linear.'], eixo: ['eixo', 'Eixo radial.'], graus: ['escalar', 'Passo angular.'], volta: ['escalar', 'Arco fechado.'], pivo: ['vetor3', 'Pivô radial.'], origemId: ['origemId', 'Identidade das cópias.'], derivaDe: ['origem', 'Origem-fonte.'], [selecao[0]]: selecao.slice(1), [faces[0]]: faces.slice(1), nomes: ['listaTextos', 'Um nome por cópia, total-1.'] }, obrigatorios: ['modo', 'total'], passos: cuboBase([['arranja', { modo: 'linear', total: 2, d: [2, 0, 0], origemId: 9, derivaDe: { op: 'cubo', id: 1 }, sel: { origem: { op: 'cubo', id: 1 } }, nomes: ['copia'] }]]), precondicoes: ['Modo estrutural requer origemId, derivaDe e seleção da origem completa.'] },
  furo: { intencao: 'Abrir um ou vários furos estruturais passantes ou cegos.', campos: { origemId: ['origemId', 'Identidade obrigatória do corte.'], de: ['origem', 'Face de entrada.'], saida: ['origem', 'Face de saída no modo passante.'], profundidade: ['escalar', 'Profundidade no modo cego.'], centro: ['vetor3', 'Centro de um furo.'], centros: ['lista', 'Centros/grupos de vários furos.'], ate: ['vetor3', 'Segundo centro de um rasgo.'], raio: ['escalar', 'Raio positivo.'], lados: ['inteiro', 'Resolução da parede.'], orientacao: ['vetor3', 'Referência no plano da entrada.'] }, obrigatorios: ['origemId', 'de'], passos: [['cilindro', { origemId: 1, raio: 1, altura: 0.5, lados: 12 }], ['furo', { origemId: 9, de: { op: 'cilindro', id: 1, tampa: 'topo' }, saida: { op: 'cilindro', id: 1, tampa: 'fundo' }, centro: [0, 0.5, 0], raio: 0.15, lados: 8, orientacao: [1, 0, 0] }]], precondicoes: ['Declare centro ou centros e exatamente um entre saida e profundidade.'] },
  arredondarAresta: { intencao: 'Substituir uma aresta convexa por múltiplos painéis de raio geométrico.', campos: { origemId: ['origemId', 'Identidade da saída.'], de: ['origem', 'Face que contém a aresta.'], aresta: ['inteiro', 'Índice local da aresta na face.'], raio: ['escalar', 'Raio positivo.'], paineis: ['inteiro', 'Quantidade de painéis, mínimo 2.'] }, obrigatorios: ['origemId', 'de', 'aresta', 'raio', 'paineis'], passos: cuboBase([['arredondarAresta', { origemId: 9, de: origemTopo, aresta: 0, raio: 0.1, paineis: 2 }]]), limites: ['Escopo atual exige duas faces convexas manifold.'] },
  filete: { intencao: 'Criar chanfro plano compatível com o filete v1.', campos: { origemId: ['origemId', 'Identidade da saída.'], de: ['origem', 'Face que contém a aresta.'], aresta: ['inteiro', 'Índice local da aresta.'], raio: ['escalar', 'Recuo do painel.'] }, obrigatorios: ['origemId', 'de', 'aresta'], passos: cuboBase([['filete', { origemId: 9, de: origemTopo, aresta: 0, raio: 0.1 }]]), limites: ['Não é arredondamento multi-painel e não cobre encontro de três arestas.'] },
  pincel: { intencao: 'Atribuir cor de face ou dabs locais determinísticos.', campos: { modo: ['texto', "'face' ou 'livre'."], [selecao[0]]: selecao.slice(1), [faces[0]]: faces.slice(1), cor: ['cor', 'Cor ou null.'], pontos: ['lista', 'Dabs {f,a,b} no modo livre.'], raio: ['escalar', 'Raio do dab.'], dureza: ['escalar', 'Dureza do dab.'] }, passos: cuboBase([['pincel', { faces: [1], cor: '#123456' }]]) },
  solido: { intencao: 'Marcar faces para renderização sólida.', campos: { [selecao[0]]: selecao.slice(1), [faces[0]]: faces.slice(1) }, passos: cuboBase([['solido', { faces: [1] }]]) },
  liso: { intencao: 'Marcar faces para sombreamento liso.', campos: { [selecao[0]]: selecao.slice(1), [faces[0]]: faces.slice(1) }, passos: cuboBase([['liso', { faces: [1] }]]) },
  material: { intencao: 'Associar faces a um material declarado em MATERIAIS.', campos: { [selecao[0]]: selecao.slice(1), [faces[0]]: faces.slice(1), usa: ['texto', 'Nome exato em MATERIAIS.'] }, obrigatorios: ['usa'], passos: cuboBase([['material', { faces: [1], usa: 'teste' }]]), materiais: { teste: { cor: '#ffffff' } }, precondicoes: ['O material precisa existir em MATERIAIS.'] },
  parte: { intencao: 'Nomear faces como parte semântica e declarar hierarquia opcional.', campos: { [selecao[0]]: selecao.slice(1), [faces[0]]: faces.slice(1), nome: ['texto', 'Identidade persistida da parte.'], pai: ['texto', 'Parte-pai já declarada.'], pivo: ['vetor3', 'Pivô explícito.'], substituir: ['booleano', 'Literal true permite reatribuição intencional.'] }, obrigatorios: ['nome'], passos: cuboBase([['parte', { faces: [1], nome: 'corpo' }]]), precondicoes: ['Uma face pertence a no máximo uma parte, salvo substituir:true explícito.'] },
  pesar: { intencao: 'Atribuir peso de osso a vértices ou faces posicionais.', campos: { osso: ['texto', 'Nome em ESQUELETO.'], peso: ['escalar', 'Peso acumulado.'], vs: ['listaInteiros', 'Vértices afetados.'], faces: ['listaInteiros', 'Faces cujos vértices são afetados.'] }, obrigatorios: ['osso'], passos: cuboBase([['pesar', { osso: 'raiz', vs: [0], peso: 1 }]]), esqueleto: { ossos: [{ nome: 'raiz' }] }, limites: ['Ainda é posicional; não aceita sel.'] },
};

const contratos = Object.fromEntries(Object.entries(definicoes).map(([nome, definicao]) => [
  nome,
  criarContratoUsoOperacao(nome, definicao),
]));

export function usoDaOperacao(nome) {
  return contratos[nome] ?? null;
}

export function usosDasOperacoes() {
  return congelar(Object.fromEntries(Object.entries(contratos)));
}
