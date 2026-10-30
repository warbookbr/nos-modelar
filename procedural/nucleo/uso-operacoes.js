/* uso-operacoes.js — contratos Agent-First executáveis das operações nativas.
   A tabela descreve como chamar a capacidade; o executor continua decidindo a
   geometria. Os exemplos alimentam também o corpus diferencial R00. */

export const FORMATO_USO_OPERACAO = 'mecanifica.uso-operacao@1';
export const FORMATO_EXEMPLO_OPERACAO = 'mecanifica.exemplo-operacao@1';

const tipos = Object.freeze({
  escalar: { anyOf: [{ type: 'number' }, { type: 'string' }, { type: 'array' }], description: 'Número, nome de PARAM/TOPO ou expressão numérica declarativa.' },
  escalarOuFalso: { anyOf: [{ type: 'number' }, { type: 'string' }, { type: 'array' }, { const: false }], description: 'Número, nome de PARAM/TOPO, expressão numérica declarativa ou false para desligar.' },
  inteiro: { anyOf: [{ type: 'integer' }, { type: 'string' }, { type: 'array' }], description: 'Inteiro ou expressão resolvida para inteiro.' },
  vetor3: { anyOf: [{ type: 'string' }, { type: 'array', minItems: 3, maxItems: 3 }], description: 'Ponto/vetor [x,y,z] ou nome de ponto em PARAMS/TOPO.' },
  texto: { type: 'string', minLength: 1 },
  textoOuLista: { anyOf: [{ type: 'string', minLength: 1 }, { type: 'array', items: { type: 'string', minLength: 1 } }] },
  booleano: { type: 'boolean' },
  eixo: { enum: ['x', 'y', 'z'] },
  cor: { anyOf: [{ type: 'string' }, { type: 'null' }] },
  origemId: { type: 'integer', minimum: 0, description: 'Identidade semântica escolhida pelo autor; não é índice de passo.' },
  idLegado: { type: 'integer', minimum: 0, description: 'Base posicional legada. Prefira origemId para identidade persistida.' },
  origem: { type: 'object', description: 'Origem estrutural semântica publicada por uma operação anterior.' },
  selecao: { type: 'object', description: 'Seleção semântica por tudo, origem, alias, grupo, região ou ids legados aceitos; onde filtra por propriedade geométrica (normal, extremo, tipo).' },
  listaInteiros: { type: 'array', items: { type: 'integer' } },
  listaTextos: { type: 'array', items: { type: 'string', minLength: 1 } },
  lista: { type: 'array' },
  forma2d: { anyOf: [{ type: 'array' }, { type: 'object' }], description: 'Lista de pontos [u,v] ou forma pronta ({retangulo} ou {circulo}).' },
  objeto: { type: 'object' },
  booleanoOuObjeto: { anyOf: [{ type: 'boolean' }, { type: 'object' }] },
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
    passos: [['cilindro', { raio: 0.5, altura: 1, lados: 8 }]],
    limites: [
      'lados muda a topologia e precisa caber no bloco de IDs.',
      "{op:'cilindro', id} sem eixo seleciona SÓ AS LATERAIS. As tampas pedem citação própria (tampa:'fundo', tampa:'topo'); sem elas as duas faces ficam sem parte, cinzentas e mudas. `npm run ativar:bancada` conta as faces órfãs e diz esta causa.",
    ],
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
    campos: { [idLegado[0]]: idLegado.slice(1), [origemId[0]]: origemId.slice(1), perfil: ['lista', 'Ao menos dois pontos [raio,y] ou [raio,y,concordancia]. Com furos ou deslocar, o contorno externo da seção.'], lados: ['inteiro', 'Resolução da revolução.'], segmentosCurva: ['inteiro', 'Discretização das concordâncias.'], furos: ['lista', 'Furos da seção: cada um é uma lista de pontos [raio,y], {retangulo: {largura, profundidade, centro?, cantos?}} ou {circulo: {raio, centro?}}, com o centro em [raio,y]. Inteiros dentro da seção.'], deslocar: ['objeto', "Desloca o contorno da seção: {para: 'dentro'|'fora', distancia, canto: 'redondo'|'reto'|'esquadria', limite?}. Dentro recua o externo e aumenta os furos."], segmentosArco: ['inteiro', 'Segmentos por quarto de volta nos círculos e nos cantos redondos (padrão 4).'], segmentosSpline: ['inteiro', 'Segmentos por vão de spline de um furo escrito como {contorno} (padrão 8).'], superficie: ['booleano', 'true declara a casca aberta de propósito: sem ele, a polilinha que não toca o eixo nas duas pontas nem volta ao primeiro ponto é recusada.'], [em[0]]: em.slice(1), [eixoCriacao[0]]: eixoCriacao.slice(1) },
    obrigatorios: ['perfil'], passos: [['lathe', { perfil: [[0.3, 0], [0.3, 1]], lados: 8, superficie: true }]],
    precondicoes: ['Perfil precisa ter ao menos dois pontos e raios não negativos.', 'A polilinha precisa tocar o eixo (raio 0) nas duas pontas ou voltar ao primeiro ponto; senão é recusada, a menos de furos: [] (seção fechada pelo eixo) ou superficie: true (casca aberta declarada).'],
    limites: ['Com furos ou deslocar o perfil é o contorno externo de uma SEÇÃO fechada (o fecho pelo eixo é implícito) e cada contorno do resultado vira um laço; as faixas se enfileiram: o externo e depois os furos, na ordem canônica de perfil2d.js. Raio negativo, furo que encosta na borda e deslocamento que apaga a seção são recusados com campo e valor.'],
  },
  extrusao: {
    intencao: 'Extrudir em y um perfil 2D com furos e deslocamento de contorno (canto redondo, reto ou em esquadria), sem calcular pontos à mão.',
    campos: {
      [idLegado[0]]: idLegado.slice(1), [origemId[0]]: origemId.slice(1),
      perfil: ['forma2d', 'Contorno externo: lista de pontos [u,v], {retangulo: {largura, profundidade, centro?, cantos?}}, {circulo: {raio, centro?}} ou {contorno: {inicio: [u,v], trechos: [...]}}, com trechos {reto: [u,v]}, {arco: {por, ate}} ou {arco: {centro, angulo}}, {arcoTangente: [u,v]}, {concordancia: raio} e {spline: [[u,v], ...]}; fecha sozinho de volta ao inicio. O ponto [u,v] vai para x=u, z=v.'],
      furos: ['lista', 'Furos: lista de formas nas mesmas quatro escritas, todas inteiras dentro do perfil, a mais de 1e-6 da diagonal da borda e dos outros furos.'],
      deslocar: ['objeto', "{para: 'dentro'|'fora', distancia, canto: 'redondo'|'reto'|'esquadria', limite?}. Dentro recua o externo e aumenta os furos; fora faz o contrário. Limite da esquadria em múltiplos da distância (padrão 4)."],
      segmentosArco: ['inteiro', 'Segmentos por quarto de volta nos círculos, nos cantos redondos e nos arcos do contorno por trechos (padrão 4).'],
      segmentosSpline: ['inteiro', 'Segmentos por vão de spline do contorno por trechos (padrão 8).'],
      altura: ['escalar', 'Extensão em y, maior que zero (padrão 1).'],
      [em[0]]: em.slice(1), [eixoCriacao[0]]: ['eixo', 'Direção da extrusão; o padrão é y.'],
    },
    obrigatorios: ['perfil'],
    passos: [['extrusao', { origemId: 1, perfil: { retangulo: { largura: 1, profundidade: 0.6, cantos: 0.1 } }, furos: [{ circulo: { raio: 0.1, centro: [0.2, 0] } }], deslocar: { para: 'dentro', distancia: 0.02, canto: 'redondo' }, altura: 0.2 }]],
    precondicoes: ['Perfil simples, furos inteiros dentro dele, sem encostar na borda nem entre si, e deslocamento que não apague o perfil.'],
    limites: [
      'A origem publica lado (laterais), tampa (fundo ou topo, todas as peças convexas) e parede (externo, furos ou o número do furo).',
      'Um recuo pode partir o perfil em pedaços; cada pedaço sai como contorno próprio, na ordem canônica (menor ponto primeiro).',
      'Furo que encosta na borda é recusado com a distância medida; para abrir o furo na borda, escreva o recorte no contorno externo.',
    ],
  },
  loft: {
    intencao: 'Conectar seções ao longo de um caminho 3D.',
    campos: { [idLegado[0]]: idLegado.slice(1), [origemId[0]]: origemId.slice(1), secoes: ['lista', 'Ao menos duas seções {pos, raio}, {pos, contorno} ou, só na ponta, {pos, aresta: [[u0,w0],[u1,w1]]}, que fecha a ponta numa linha em vez de num ponto.'], lados: ['inteiro', 'Pontos por seção.'], orientacao: ['vetor3', 'Referência explícita do frame local.'], segmentosCurva: ['inteiro', 'Discretização de concordâncias.'] },
    obrigatorios: ['secoes'], passos: [['loft', { secoes: [{ pos: [0, 0, 0], raio: 0.2 }, { pos: [0, 1, 0], raio: 0.2 }], lados: 8 }]],
    precondicoes: ['Seções devem ser ordenadas, válidas e compatíveis com lados.'],
    limites: [
      'Sem seção de raio 0 em cada ponta sai TUBO ABERTO: a lâmina da espada entrou com 24 arestas de borda, e borda reprova no preparo para micropolígono. O polo pode ficar enterrado dentro da peça vizinha; ele existe para fechar, não para aparecer.',
      'Quad só sai PLANO quando as duas seções são SEMELHANTES, mesma razão entre espessura e altura — é o determinante da diagonal, que zera exatamente nesse caso. Lâmina que afila só na largura torce 25% perto da ponta. Subdividir não resolve: de 4 para 16 estações a torção cai só pela metade.',
      'Serve quando a forma É uma seção viajando: cabo, punho, tubo, corrimão, lâmina. Para CHAPA COM CONTORNO — cabeça de machado, aba de maça, guarda recortada — a seção viajando é a ferramenta errada e nenhuma quantidade de estações conserta; use inflate. O polo de raio 0 fecha afinando até virar BICO, e isso apaga o gume.',
    ],
  },
  inflate: {
    intencao: 'Construir volume fechado pelo cruzamento de uma silhueta lateral e uma planta.',
    campos: { [idLegado[0]]: idLegado.slice(1), [origemId[0]]: origemId.slice(1), contornoLado: ['lista', 'Polígono lateral z×y com ao menos três pontos.'], contornoTopo: ['lista', 'Polígono superior z×x com ao menos três pontos.'], modo: ['texto', "'grade' (padrão, aceita cavidades) ou 'secoes' (suave, exige um intervalo por estação)."], divisoes: ['inteiro', 'Resolução da grade ou quantidade de segmentos longitudinais iguais.'], estacoes: ['lista', "Frações 0..1 em ordem crescente, de 0 a 1: põe as estações onde a forma pede, no lugar de partes iguais. Só no modo 'secoes'; exclui divisoes."], lados: ['inteiro', "Pontos por seção no modo 'secoes'."], expoenteSecao: ['escalar', "Expoente positivo da superelipse no modo 'secoes'; 2 produz elipse."], segmentosCurva: ['inteiro', 'Discretização das concordâncias.'] },
    obrigatorios: ['contornoLado', 'contornoTopo'], passos: [['inflate', { contornoLado: [[0, 0], [1, 0], [1, 1], [0, 1]], contornoTopo: [[0, 0], [1, 0], [1, 1], [0, 1]], divisoes: 2 }]],
    limites: [
      "O modo 'grade' é blocky; o modo 'secoes' não representa múltiplos intervalos na mesma estação; não é CSG.",
      "Para chapa com contorno prefira 'secoes': 'grade' é literalmente voxelizado e sai com escada no contorno.",
      'expoenteSecao 2 é elipse e a face sai como travesseiro; foi preciso 12–14 para a face virar chapa de verdade.',
      'Silhueta que termina em ponta única deixa a última estação com altura zero e nascem faces de área nula, que malha:conferir reprova. Use dois pontos no z máximo: fisicamente são o pequeno plano do fio, que todo gume real tem.',
      "Face de inflate só sai plana quando as duas seções vizinhas são SEMELHANTES, a mesma regra do loft. Bloco que vai receber furo pede seção CONSTANTE, e no modo 'grade' não há endereço de face para furar.",
    ],
  },
  publicarPorta: {
    intencao: 'Publicar interface semântica endereçável de uma origem existente.',
    campos: { nome: ['texto', 'ID legado da porta.'], id: ['texto', 'ID semântico atual.'], rotulo: ['texto', 'Rótulo obrigatório quando id é usado.'], de: ['origem', 'Origem geométrica publicada.'], interface: ['objeto', 'Interface mensurável de porta: cilíndrica, anular, plano de apoio, padrão de furos ou trilho.'] },
    obrigatorios: ['de'], passos: cuboBase([['publicarPorta', { id: 'topo', rotulo: 'Topo', de: origemTopo }]]),
    precondicoes: ['Use nome ou o par id+rotulo, nunca ambos.'],
  },
  moveV: { intencao: 'Mover um vértice, por seleção que resolva para um só ou por ID posicional.', campos: { v: ['inteiro', 'ID do vértice (legado); não misture com sel.'], [selecao[0]]: ['selecao', "Seleção que resolva para EXATAMENTE um vértice, por exemplo {regiao:{min:[0.4,0.9,0.4],max:[0.6,1.1,0.6]}} em torno do canto. Para vários vértices use transladar."], d: ['vetor3', 'Deslocamento.'] }, passos: cuboBase([['moveV', { sel: { regiao: { min: [-0.6, -0.1, -0.6], max: [-0.4, 0.1, -0.4] } }, d: [0, 0.1, 0] }]]), precondicoes: ['Declare v ou sel, nunca os dois.'], limites: ['sel que resolve para zero ou vários vértices grita com a contagem; uma face ou aresta resolve para os seus cantos e por isso não serve aqui.'] },
  extruda: { intencao: 'Extrudar uma face, por ID posicional ou por seleção que resolva para uma face só.', campos: { face: ['inteiro', 'ID da face (legado); não misture com sel.'], [selecao[0]]: ['selecao', "Seleção que resolva para EXATAMENTE uma face, por exemplo {onde:{normal:{dir:[0,1,0],ate:5}}} dentro de uma origem."], dist: ['escalar', 'Distância assinada.'] }, passos: cuboBase([['extruda', { sel: { origem: { op: 'cubo', id: 1 }, onde: { extremo: { eixo: 'y', lado: 'max' } } }, dist: 0.1 }]]), precondicoes: ['Declare face ou sel, nunca os dois.'], limites: ['Local: só a face escolhida sobe; a seleção que resolve para zero ou várias faces grita.'] },
  mescla: { intencao: 'Fundir vértices em um vértice-alvo, por seleção ou por ID posicional.', campos: { de: ['listaInteiros', 'Vértices removidos (legado); não misture com sel.'], [selecao[0]]: ['selecao', 'Seleção dos vértices que somem: um ou mais. Seleção vazia grita.'], para: ['inteiro', 'Vértice preservado (legado); não misture com selPara.'], selPara: ['selecao', 'Seleção que resolva para EXATAMENTE o vértice preservado.'] }, passos: cuboBase([['mescla', { sel: { regiao: { min: [0.4, -0.1, -0.6], max: [0.6, 0.1, -0.4] } }, selPara: { regiao: { min: [-0.6, -0.1, -0.6], max: [-0.4, 0.1, -0.4] } } }]]), precondicoes: ['Declare de ou sel, e para ou selPara; nunca os dois do mesmo par.'], limites: ['Com id, de vazio volta calado; com sel a seleção vazia grita.', 'Cantos fundidos que deixam a face com menos de 3 cantos distintos a removem.'] },
  moveF: { intencao: 'Mover todos os vértices de uma face, escolhida por seleção que resolva para uma só ou por ID posicional.', campos: { face: ['inteiro', 'ID da face (legado); não misture com sel.'], [selecao[0]]: ['selecao', "Seleção que resolva para EXATAMENTE uma face, por exemplo {origem:{op:'cubo',id:1,face:'topo'}} ou {onde:{extremo:{eixo:'y',lado:'max'}}}."], d: ['vetor3', 'Deslocamento.'] }, passos: cuboBase([['moveF', { sel: { origem: origemTopo }, d: [0, 0.1, 0] }]]), precondicoes: ['Declare face ou sel, nunca os dois.'], limites: ['Os cantos compartilhados com outras faces vão junto. Para mover várias faces use transladar com sel.'] },
  moveA: { intencao: 'Mover os dois vértices de uma aresta, escolhida por seleção que resolva para uma só ou por IDs posicionais.', campos: { a: ['inteiro', 'Primeiro vértice (legado); não misture com sel.'], b: ['inteiro', 'Segundo vértice (legado).'], [selecao[0]]: ['selecao', "Seleção que resolva para EXATAMENTE uma aresta, por exemplo {origem:{op:'cubo',id:1,face:'topo'}, onde:{alvo:'aresta', extremo:{eixo:'z',lado:'max'}}}."], d: ['vetor3', 'Deslocamento.'] }, passos: cuboBase([['moveA', { sel: { origem: { op: 'cubo', id: 1, face: 'fundo' }, onde: { alvo: 'aresta', extremo: { eixo: 'z', lado: 'min' } } }, d: [0, 0.1, 0] }]]), precondicoes: ['Declare a + b ou sel, nunca os dois.'], limites: ['Só onde:{alvo:\'aresta\',…} produz aresta; sel que resolve para zero ou várias grita com a contagem.'] },
  vira: { intencao: 'Inverter o winding de uma ou mais faces, por seleção ou por ID posicional.', campos: { face: ['inteiro', 'ID da face (legado); não misture com sel.'], [selecao[0]]: ['selecao', 'Seleção de uma ou mais faces; cada uma vira por si. Seleção vazia grita.'] }, passos: cuboBase([['vira', { sel: { origem: origemTopo } }]]), precondicoes: ['Declare face ou sel, nunca os dois.'], limites: ['Use somente para corrigir orientação comprovada: virar uma face já consistente quebra o pareamento de arestas.'] },
  apagaFace: { intencao: 'Remover exatamente uma face, preferencialmente por seleção semântica.', campos: { face: ['inteiro', 'ID legado da face.'], [selecao[0]]: selecao.slice(1) }, passos: cuboBase([['apagaFace', { sel: { origem: origemTopo } }]]), precondicoes: ['A seleção precisa resolver exatamente uma face.'] },
  displace: { intencao: 'Deslocar seleção ao longo das normais por ruído determinístico.', campos: { [selecao[0]]: selecao.slice(1), amplitude: ['escalar', 'Desvio máximo.'], frequencia: ['escalar', 'Escala espacial do ruído.'], semente: ['escalar', 'Semente reproduzível.'] }, passos: cuboBase([['displace', { amplitude: 0.01, frequencia: 1, semente: 7 }]]), precondicoes: ['Vértices precisam pertencer a faces com normal calculável.'] },
  encostar: { intencao: 'Posicionar uma seleção em contato direcional com uma referência.', campos: { [selecao[0]]: selecao.slice(1), referencia: ['selecao', 'Seleção imóvel.'], direcao: ['vetor3', 'Direção não nula declarada.'], folga: ['escalar', 'Separação final não negativa.'] }, obrigatorios: ['sel', 'referencia', 'direcao'], passos: [['cubo', { origemId: 1, lado: 1 }], ['cubo', { origemId: 2, lado: 1, em: [0, 0.5, 0] }], ['encostar', { sel: { origem: { op: 'cubo', id: 2 } }, referencia: { origem: { op: 'cubo', id: 1 } }, direcao: [0, 1, 0] }]], limites: ['Não é solver, colisão ou encaixe por extensão.'] },
  transladar: { intencao: 'Transladar malha inteira ou seleção semântica.', campos: { d: ['vetor3', 'Deslocamento.'], [selecao[0]]: selecao.slice(1), [faces[0]]: faces.slice(1) }, passos: cuboBase([['transladar', { d: [0, 0.1, 0] }]]) },
  rotaciona: { intencao: 'Rotacionar malha ou seleção em convenção destra.', campos: { eixo: ['eixo', 'Eixo da rotação.'], graus: ['escalar', 'Ângulo em graus.'], pivo: ['vetor3', 'Pivô; o padrão é o centroide.'], [selecao[0]]: selecao.slice(1), [faces[0]]: faces.slice(1) }, obrigatorios: ['eixo'], passos: cuboBase([['rotaciona', { eixo: 'y', graus: 15 }]]) },
  espelha: { intencao: 'Duplicar faces refletidas, com modo estrutural opcional.', campos: { eixo: ['eixo', 'Normal do plano de espelho.'], pos: ['escalar', 'Posição do plano.'], [selecao[0]]: selecao.slice(1), [faces[0]]: faces.slice(1), origemId: ['origemId', 'Identidade da saída estrutural.'], derivaDe: ['origem', 'Origem completa copiada no modo estrutural.'] }, obrigatorios: ['eixo'], passos: cuboBase([['espelha', { eixo: 'x', origemId: 9, derivaDe: { op: 'cubo', id: 1 }, sel: { origem: { op: 'cubo', id: 1 } } }]]), precondicoes: ['Modo estrutural exige origemId, derivaDe e sel.origem equivalentes.'] },
  arranja: { intencao: 'Criar cópias lineares ou radiais com identidade estrutural.', campos: { modo: ['texto', "'linear' ou 'radial'."], total: ['inteiro', 'Total incluindo a fonte.'], d: ['vetor3', 'Passo linear.'], eixo: ['eixo', 'Eixo radial.'], graus: ['escalar', 'Passo angular.'], volta: ['escalar', 'Arco fechado.'], pivo: ['vetor3', 'Pivô radial.'], origemId: ['origemId', 'Identidade das cópias.'], derivaDe: ['origem', 'Origem-fonte.'], [selecao[0]]: selecao.slice(1), [faces[0]]: faces.slice(1), nomes: ['listaTextos', 'Um nome por cópia, total-1.'] }, obrigatorios: ['modo', 'total'], passos: cuboBase([['arranja', { modo: 'linear', total: 2, d: [2, 0, 0], origemId: 9, derivaDe: { op: 'cubo', id: 1 }, sel: { origem: { op: 'cubo', id: 1 } }, nomes: ['copia'] }]]), precondicoes: ['Modo estrutural requer origemId, derivaDe e seleção da origem completa.'], limites: ['Repetição radial é UMA descrição: seis abas de maça saem de um arranja radial com volta 360 e total 6. Descrever seis abas à mão é seis lugares para errar. Nomeie as cópias, porque posição não é identidade.'] },
  furo: { intencao: 'Abrir um ou vários furos estruturais passantes ou cegos.', campos: { origemId: ['origemId', 'Identidade obrigatória do corte.'], de: ['origem', 'Face de entrada.'], saida: ['origem', 'Face de saída no modo passante.'], profundidade: ['escalar', 'Profundidade no modo cego.'], centro: ['vetor3', 'Centro de um furo.'], centros: ['lista', 'Centros/grupos de vários furos.'], ate: ['vetor3', 'Segundo centro de um rasgo.'], raio: ['escalar', 'Raio positivo.'], lados: ['inteiro', 'Resolução da parede.'], orientacao: ['vetor3', 'Referência no plano da entrada.'] }, obrigatorios: ['origemId', 'de'], passos: [['cilindro', { origemId: 1, raio: 1, altura: 0.5, lados: 12 }], ['furo', { origemId: 9, de: { op: 'cilindro', id: 1, tampa: 'topo' }, saida: { op: 'cilindro', id: 1, tampa: 'fundo' }, centro: [0, 0.5, 0], raio: 0.15, lados: 8, orientacao: [1, 0, 0] }]], precondicoes: ['Declare centro ou centros e exatamente um entre saida e profundidade.'], limites: ['lados precisa ser ≡ 2 (mod 4) — 10, 14 ou 18, nunca múltiplo de 4. A seção começa com um vértice em 0°, então múltiplo de 4 põe outro VÉRTICE no topo, a 90°, e um furo centrado no eixo cai entre duas faces e não cabe em nenhuma. Foi o que destravou o olho do machado depois de lados:16 recusar em todas as estações.', 'de precisa resolver para exatamente UMA face, e ela precisa ser grande o bastante e plana. O furo tem de caber na face de entrada E na de saída, e as duas precisam se enxergar: com lados:12 o lado 2 enxerga o 9, e o 2 com o 8 não.', 'O furo CONSOME as faces de entrada e saída, que viram a borda anular do corte, e a origem antiga passa a ser recusada inteira. Una as duas origens num ALIAS, ou ponha a peça furada como primeira geometria e use sel:{tudo:true}.'] },
  arredondarAresta: { intencao: 'Substituir uma aresta convexa por múltiplos painéis de raio geométrico.', campos: { origemId: ['origemId', 'Identidade da saída.'], de: ['origem', 'Face que contém a aresta (com aresta); não misture com sel.'], aresta: ['inteiro', 'Índice local da aresta na face de.'], [selecao[0]]: ['selecao', "Em vez de de + aresta: seleção que resolva para EXATAMENTE uma aresta, por exemplo {origem:{op:'cubo',id:1}, onde:{alvo:'aresta', normal:{dir:[0,1,0],ate:5}, extremo:{eixo:'z',lado:'max'}}}."], raio: ['escalar', 'Raio positivo.'], paineis: ['inteiro', 'Quantidade de painéis, mínimo 2.'], cadeia: ['booleanoOuObjeto', "Arredonda de uma vez a cadeia de arestas que continua em tangência a partir da escolhida, até o canto vivo ou até fechar o laço: true ou {ate: graus}, o ângulo máximo entre arestas consecutivas da cadeia (padrão 30)."] }, obrigatorios: ['origemId', 'raio', 'paineis'], passos: cuboBase([['arredondarAresta', { origemId: 9, de: origemTopo, aresta: 0, raio: 0.1, paineis: 2 }]]), precondicoes: ['Declare de + aresta ou sel, nunca os dois.'], limites: ['Cada lado da aresta é uma face convexa ou um grupo de faces coplanares que se tocam por aresta, como a tampa partida de um perfil com furo ou de um contorno por trechos.', 'Num grupo, o raio é conferido contra todos os vértices dele e recusa com o vértice quando não cabe; peça de tampa que uma quina quase reta deixa côncava é partida em peças convexas, e a recusa fica para o que se atravessa ou se inverte. O canto da tampa partida em leque (a chapa com furos vista de cima, com a aresta ao longo da espessura) arredonda; o remate de uma segunda aresta sobre ele pede a tampa partida em outra ordem: arredonde antes as arestas da tampa e depois as do canto. Onde a face de ponta é quase paralela à aresta (borda livre que termina numa concordância do contorno) e o arco não cabe no plano dela, o arco termina na seção perpendicular, com um degrau plano, e a faixa volta a ser citável pela origem sem `painel`.', 'Onde a ponta da aresta já é ponta de uma faixa arredondada ou chanfrada por outra aresta, o canto fecha em esquadria (cantos-arredondados.js): o mesmo raio e o mesmo número de painéis nas arestas do canto, arestas a 90°, e número par de painéis onde três arestas se encontram. Fora disso o passo recusa com a causa e a malha fica como estava.', 'Com sel, a face de apoio é a de menor id entre as que usam a aresta.', 'Numa forma facetada o arco só cabe onde a face da ponta é perpendicular à aresta: o canto da ponta anda no plano do arco, e a face vizinha que não contém esse deslocamento sairia torta. O passo confere as faces que altera antes de escrever e recusa com a face e o desvio (a lateral de um prisma de oito lados, por exemplo); arredonde onde as vizinhas são perpendiculares ou modele o canto arredondado no perfil.', 'Onde a ponta da aresta encontra uma face quase paralela a ela (a faceta de uma concordância que continua a borda em tangência), o arco não cabe no plano da vizinha e termina na seção perpendicular, com um degrau plano: o resultado traz um aviso em neutro.avisos (ref degrau, com a aresta, o motivo e a sugestão) e o descrever o mostra na seção AVISOS DO NÚCLEO e reprova o veredito da peça (guarda:acervo inclusive).', 'cadeia (true, ou {ate: graus}, 30 por padrão) arredonda numa varredura só a aresta escolhida e as que continuam em tangência a partir dela, até um canto vivo (onde a aresta seguinte dobra mais que ate graus) ou até fechar o laço: sem tampa nem degrau nas junções, com o raio podendo passar do comprimento das facetas. A tampa é um grupo de faces coplanares e as paredes são perpendiculares a ela (extrusão reta, furo ou recorte de contorno por trechos); o anel de cada vértice é a seção no plano bissetor das duas arestas vizinhas e a faixa sai aresta por aresta, nos painéis de `{op:\'arredondarAresta\', id}`. Recusa, sem escrever, o diedro diferente de 90°, o raio que passa da altura da parede ou do raio de curvatura de um trecho convexo do contorno (o recorte côncavo não limita), a ponta aguda demais, a ponta em tangência que a cadeia não seguiu, o vértice da tampa mais perto que o raio e a cadeia que volta ao próprio vértice. Arredonde a cadeia antes das arestas do canto.'] },
  filete: { intencao: 'Criar chanfro plano compatível com o filete v1.', campos: { origemId: ['origemId', 'Identidade da saída.'], de: ['origem', 'Face que contém a aresta (com aresta); não misture com sel.'], aresta: ['inteiro', 'Índice local da aresta na face de.'], [selecao[0]]: ['selecao', "Em vez de de + aresta: seleção que resolva para EXATAMENTE uma aresta, por exemplo {origem:{op:'cubo',id:1}, onde:{alvo:'aresta', normal:{dir:[0,1,0],ate:5}, extremo:{eixo:'z',lado:'max'}}}."], raio: ['escalar', 'Recuo do painel.'] }, obrigatorios: ['origemId'], passos: cuboBase([['filete', { origemId: 9, sel: { origem: { op: 'cubo', id: 1 }, onde: { alvo: 'aresta', normal: { dir: [0, 1, 0], ate: 5 }, extremo: { eixo: 'z', lado: 'max' } } }, raio: 0.1 }]]), precondicoes: ['Declare de + aresta ou sel, nunca os dois.'], limites: ['Não é arredondamento multi-painel. O canto de duas arestas chanfradas fecha em esquadria; o de três é recusado, porque o vértice triplo pede um número par de painéis.', 'Numa tampa partida (grupo de faces coplanares) o recuo é conferido contra todos os vértices do grupo e recusa quando não cabe; o canto em leque, a peça de tampa que fica côncava e a ponta oblíqua seguem as regras do `arredondarAresta`.', 'Com sel, a face de apoio é a de menor id entre as que usam a aresta.'] },
  unir: { intencao: 'Fundir dois ou mais sólidos fechados numa superfície fechada só, sem face interna.', campos: { origemId: ['origemId', 'Identidade obrigatória do resultado e da costura.'], solidos: ['lista', 'Duas ou mais seleções, uma por sólido.'] }, obrigatorios: ['origemId', 'solidos'], passos: [['cubo', { origemId: 1, lado: 1 }], ['cubo', { origemId: 2, lado: 1, em: [0.5, 0.5, 0.5] }], ['unir', { origemId: 9, solidos: [{ origem: { op: 'cubo', id: 1 } }, { origem: { op: 'cubo', id: 2 } }] }]], precondicoes: ['Cada seleção precisa formar um sólido fechado e orientado depois de soldar cantos coincidentes; duas seleções não dividem face.'], limites: ['Face não tocada mantém id e cantos; face cortada mantém o id no maior pedaço convexo; pedaço a mais ganha id novo no bloco do passo; face que some é consumida e a citação dela grita.', 'Cite a costura com {op:\'unir\', id, costura:true}.', 'Resultado vazio grita.'] },
  subtrair: { intencao: 'Tirar do primeiro sólido o volume dos demais.', campos: { origemId: ['origemId', 'Identidade obrigatória do resultado e da costura.'], solidos: ['lista', 'Duas ou mais seleções: a primeira é a peça, as demais são tiradas dela.'] }, obrigatorios: ['origemId', 'solidos'], passos: [['cubo', { origemId: 1, lado: 1 }], ['cubo', { origemId: 2, lado: 1, em: [0.5, 0.5, 0.5] }], ['subtrair', { origemId: 9, solidos: [{ origem: { op: 'cubo', id: 1 } }, { origem: { op: 'cubo', id: 2 } }] }]], precondicoes: ['Cada seleção precisa formar um sólido fechado e orientado depois de soldar cantos coincidentes; duas seleções não dividem face.'], limites: ['Face não tocada mantém id e cantos; face cortada mantém o id no maior pedaço convexo; pedaço a mais ganha id novo no bloco do passo; face que some é consumida e a citação dela grita.', 'Cite a costura com {op:\'subtrair\', id, costura:true}.', 'Resultado vazio grita.'] },
  intersectar: { intencao: 'Manter só o volume comum a todos os sólidos.', campos: { origemId: ['origemId', 'Identidade obrigatória do resultado e da costura.'], solidos: ['lista', 'Duas ou mais seleções, uma por sólido.'] }, obrigatorios: ['origemId', 'solidos'], passos: [['cubo', { origemId: 1, lado: 1 }], ['cubo', { origemId: 2, lado: 1, em: [0.5, 0.5, 0.5] }], ['intersectar', { origemId: 9, solidos: [{ origem: { op: 'cubo', id: 1 } }, { origem: { op: 'cubo', id: 2 } }] }]], precondicoes: ['Cada seleção precisa formar um sólido fechado e orientado depois de soldar cantos coincidentes; duas seleções não dividem face.'], limites: ['Face não tocada mantém id e cantos; face cortada mantém o id no maior pedaço convexo; pedaço a mais ganha id novo no bloco do passo; face que some é consumida e a citação dela grita.', 'Cite a costura com {op:\'intersectar\', id, costura:true}.', 'Resultado vazio grita.'] },
  arredondarCostura: { intencao: 'Arredondar com raio declarado as arestas de uma booleana: o encontro côncavo, a borda convexa e as arestas internas da ferramenta.', campos: { origemId: ['origemId', 'Identidade das faces do arredondamento.'], de: ['origem', 'Origem {op,id} de unir, subtrair ou intersectar.'], raio: ['escalar', 'Raio positivo.'], paineis: ['inteiro', 'Faixas do arco, de 2 a 64 (padrão 8).'], regiao: ['objeto', 'Caixa {min,max}: só o trecho da costura curva dentro dela.'], arestas: ['textoOuLista', "'concavas' (padrão), 'convexas', 'internas' (só subtrair), 'todas' ou lista delas."], raioMinimo: ['escalar', 'Onde o raio não cabe (modo curvo), ele diminui até este mínimo.'] }, obrigatorios: ['origemId', 'de', 'raio'], passos: [['cubo', { origemId: 1, larg: 0.4, alt: 1.2, prof: 0.6 }], ['cubo', { origemId: 2, larg: 1, alt: 0.3, prof: 0.3, em: [0.3, 0.6, 0] }], ['unir', { origemId: 9, solidos: [{ origem: { op: 'cubo', id: 1 } }, { origem: { op: 'cubo', id: 2 } }] }], ['arredondarCostura', { origemId: 10, de: { op: 'unir', id: 9 }, raio: 0.1 }]], limites: ['Sem arestas, só a costura côncava; classe sem aresta grita e diz qual classe existe.', 'Costura entre faces planas: prismas em meia-esquadria. Costura sobre superfície curva facetada: arredondamento por fatias, que termina onde o encontro fica plano e recusa quina da própria costura nas classes novas.', 'Onde três arestas do mesmo tipo se encontram a ponta fica reta.'] },
  pincel: { intencao: 'Atribuir cor de face ou dabs locais determinísticos.', campos: { modo: ['texto', "'face' ou 'livre'."], [selecao[0]]: selecao.slice(1), [faces[0]]: faces.slice(1), cor: ['cor', 'Cor ou null.'], pontos: ['lista', 'Dabs {f,a,b} no modo livre.'], raio: ['escalar', 'Raio do dab.'], dureza: ['escalar', 'Dureza do dab.'] }, passos: cuboBase([['pincel', { faces: [1], cor: '#123456' }]]) },
  solido: { intencao: 'Marcar faces para renderização sólida.', campos: { [selecao[0]]: selecao.slice(1), [faces[0]]: faces.slice(1) }, passos: cuboBase([['solido', { faces: [1] }]]) },
  liso: { intencao: 'Marcar faces para sombreamento liso.', campos: { [selecao[0]]: selecao.slice(1), [faces[0]]: faces.slice(1), angulo: ['escalar', 'Ângulo limite em graus: quina mais fechada que ele fica nítida, como o smooth by angle do Blender. Sem ele, suaviza tudo o que toca o vértice.'] }, passos: cuboBase([['liso', { faces: [1] }]]) },
  material: { intencao: 'Associar faces a um material declarado em MATERIAIS.', campos: { [selecao[0]]: selecao.slice(1), [faces[0]]: faces.slice(1), usa: ['texto', 'Nome exato em MATERIAIS.'] }, obrigatorios: ['usa'], passos: cuboBase([['material', { faces: [1], usa: 'teste' }]]), materiais: { teste: { cor: '#ffffff' } }, precondicoes: ['O material precisa existir em MATERIAIS.'] },
  parte: { intencao: 'Nomear faces como parte semântica e declarar hierarquia opcional.', campos: { [selecao[0]]: selecao.slice(1), [faces[0]]: faces.slice(1), nome: ['texto', 'Identidade persistida da parte.'], pai: ['texto', 'Parte-pai já declarada.'], pivo: ['vetor3', 'Pivô explícito.'], substituir: ['booleano', 'Literal true permite reatribuição intencional.'] }, obrigatorios: ['nome'], passos: cuboBase([['parte', { faces: [1], nome: 'corpo' }]]), precondicoes: ['Uma face pertence a no máximo uma parte, salvo substituir:true explícito.'] },
  friso: {
    intencao: 'Desenhar nervura, tubo ou friso de perfil declarado ao longo de uma linha nomeada da chapa ou de uma polilinha, ou a aba que dobra a borda livre de um vão.',
    campos: { [origemId[0]]: origemId.slice(1), linha: ['objeto', "Linha nomeada {nome, pontos}. Com superficie, pontos são nomes de ponto da gaiola em sequência ao longo das arestas, como no vinco; sem ela, nomes de ponto de PARAMS/TOPO ou [x,y,z]. Repita o primeiro ponto no fim para fechar a volta. Numa gaiola por gaiolaPorRede, linha(curva, de, ate) dá os nomes ao longo de uma curva nomeada (a fechada inteira, com o primeiro repetido no fim)."], superficie: ['origem', "Origem {op:'subdivisao', id} de um passo anterior: a linha segue os vértices da malha dele sobre as arestas da gaiola (no ponto limite quando ele tem medidas), e v segue a normal da face de fora da chapa."], normal: ['vetor3', 'Só na polilinha, sem superficie: a direção para onde v aponta em todos os pontos.'], perfil: ['forma2d', 'Perfil [u, v] em metros: v pela normal, com v = 0 na linha, e u para a esquerda de quem segue a linha; lista de pontos, {retangulo: {largura, profundidade, centro?, cantos?}}, {circulo: {raio, centro?}} ou {contorno}. Na chapa com espessura, a parte de v negativo entra nela, menos que a espessura.'], aba: ['objeto', "Em vez de perfil, só sobre a superficie: a aba que dobra a borda livre da chapa para dentro, {largura, angulo, raio} em metros e graus, os três obrigatórios. A linha é a borda de um vão ou do contorno, pelos nomes da gaiola (bordaDoVao da gaiolaPorEstacoes dá a de um vão, e a abertura dele quando o vão tem anéis), em qualquer sentido: o passo acha o lado da chapa. largura é a perna reta depois da dobra, angulo quanto a chapa gira (90 deixa a aba perpendicular) e raio o da face de dentro da dobra, com raio + espessura na de fora; na chapa sem espessura a aba sai PELE, uma superfície aberta sem tampas e sem espessura própria, e raio é o da própria pele. A dobra começa na linha e se estende raio + espessura para o lado do vão. As faces saem lisas a 30 graus, e a dobra, a ponta e a espessura ficam vivas."], ponta: ['textoOuLista', "'aberta' (padrão: tampa plana), 'fechada' (o perfil encolhe em quarto de elipse até um ponto da linha) ou [inicio, fim]; a volta fechada não tem ponta."], fechamento: ['escalar', "Com ponta 'fechada': o comprimento ao longo da linha em que o perfil encolhe; o padrão é a largura do perfil."], segmentosArco: ['inteiro', 'Segmentos por quarto de volta no círculo e nos cantos arredondados do perfil (padrão 4).'], variacao: ['objeto', "A largura (e o ângulo da aba) como função da posição ao longo da linha, por pontos nomeados dela: {largura: [{ponto, valor}, {ponto, antes, depois}], angulo: [...]}, em metros e graus. Entre dois pontos citados o valor anda em reta pelo comprimento de arco; antes do primeiro e depois do último fica o do ponto, e na volta fechada a função dá a volta. Com perfil, largura é a extensão em u do perfil, que escala em u; com aba, largura é a perna reta e angulo o giro da dobra, e os dois mudam por rampa. antes e depois (o degrau de largura entre dois trechos) só valem num canto vivo da linha, a partir de 10 graus de giro, e só com perfil: as duas faixas se cortam no plano que passa pelo ponto, pela normal e pelo encontro das duas bordas de fora (a meia-esquadria), e a junta é um anel só, soldado, sem entalhe nem furo. Sem variacao a malha é a mesma de sempre."] },
    obrigatorios: ['linha'],
    passos: [
      ['subdivisao', { origemId: 1, vertices: ['g00', 'g01', 'g02', 'g10', 'g11', 'g12', 'g20', 'g21', 'g22'], faces: [['g00', 'g01', 'g11', 'g10'], ['g01', 'g02', 'g12', 'g11'], ['g10', 'g11', 'g21', 'g20'], ['g11', 'g12', 'g22', 'g21']], niveis: 1, espessura: 0.002 }],
      ['friso', { origemId: 2, superficie: { op: 'subdivisao', id: 1 }, linha: { nome: 'nervura', pontos: ['g01', 'g11', 'g21'] }, perfil: { retangulo: { largura: 0.006, profundidade: 0.004, centro: [0, 0.001] } } }],
    ],
    parametros: Object.fromEntries([0, 1, 2].flatMap((i) => [0, 1, 2].map((j) => [`g${i}${j}`, [0.1 * i, i === 1 && j === 1 ? 0.01 : 0, 0.1 * j]]))),
    precondicoes: ['Com superficie, o passo subdivisao citado vem antes e gerou malha, e cada par seguido da linha é aresta da gaiola dele.', 'Sem superficie, a polilinha declara normal.', 'Declare perfil ou aba, um dos dois; a aba exige superficie e uma linha de arestas de borda livre, e sai sólida na chapa com espessura e pele na chapa sem ela.'],
    limites: [
      'O friso é sólido fechado próprio, que interpenetra a chapa pela parte de v negativo; a receita nomeia as partes e declara o contato (contatos), que contatosDaPeca mede. Não há fusão por booleana com a superfície subdividida.',
      'Sobre a superfície, a linha segue só arestas da gaiola, e cada trecho entre dois vértices da malha é corda da chapa: com medidas, os vértices estão na superfície limite e a corda se afasta dela cerca de passo² / (8 × raio).',
      'Na chapa com espessura, o perfil sem parte abaixo de v = 0 e o que entra mais que a espessura gritam; a folga entre a base reta do perfil e a chapa que curva de lado (cerca de curvatura × (largura/2)² / 2) não é conferida pelo passo, e o perfil precisa entrar mais que ela.',
      'Cada junta põe o perfil no plano bissetor e o estica pela esquadria; a curva fechada demais para a largura do perfil grita com o ponto da gaiola mais perto. Partes distantes do friso que se cruzam não são conferidas.',
      'A variacao com degrau de largura num canto vivo corta as duas faixas pelo mesmo plano e solda a junta num anel só; o degrau fora de um canto (giro abaixo de 10 graus, ponta da linha aberta, ponto no plano de simetria) e o degrau na aba gritam, e a largura muda por rampa nesses casos. Na aba, o número de segmentos do arco é o do maior ângulo da linha.',
      'Na simetria em x da superfície, a linha que toca o plano x = 0 numa ponta continua na imagem espelhada, a que toca nas duas vira volta, e a que não toca ganha a cópia espelhada; o perfil assimétrico emendado pela costura não fica espelhado.',
      'A aba da chapa com espessura é sólido próprio que encosta na parede da borda da chapa, sem fusão: a receita nomeia as partes e declara o contato. Na chapa sem espessura a aba é pele aberta, que continua a borda do vão com as faces orientadas como as da chapa. Ela sai da linha pela normal média das faces da borda, e não pela tangente exata da superfície limite.',
      'A aba que volta por baixo da chapa (ângulo grande com perna longa) e a que atravessa a própria dobra gritam; nas quinas de um vão o perfil estica pela esquadria.',
      "origem publica as faces sem sub-endereço por posição; parte: 'lateral' cita a superfície varrida e 'pontas' as tampas das pontas abertas.",
    ],
  },
  pesar: { intencao: 'Atribuir peso de osso a vértices, escolhidos por seleção ou por IDs posicionais.', campos: { osso: ['texto', 'Nome em ESQUELETO.'], peso: ['escalar', 'Peso acumulado.'], [selecao[0]]: ['selecao', 'Seleção de um ou mais vértices (os cantos de uma face ou aresta entram). Seleção vazia grita.'], vs: ['listaInteiros', 'Vértices afetados (legado); não misture com sel.'], faces: ['listaInteiros', 'Faces cujos vértices são afetados (legado); não misture com sel.'] }, obrigatorios: ['osso'], passos: cuboBase([['pesar', { osso: 'raiz', sel: { regiao: { min: [-0.6, -0.1, -0.6], max: [-0.4, 0.1, -0.4] } }, peso: 1 }]]), esqueleto: { ossos: [{ nome: 'raiz' }] }, precondicoes: ['Declare vs/faces ou sel, nunca os dois.'] },
  subdivisao: { intencao: 'Gerar superfície Catmull-Clark com vincos a partir de uma gaiola de vértices e faces.', campos: { [origemId[0]]: origemId.slice(1), vertices: ['lista', 'Vértices da gaiola: nome de ponto de PARAMS (cada nome uma vez), que faces, vincos, cantos e medidas citam, ou [x,y,z] anônimo. A gaiola de uma chapa longa vem de gaiolaPorEstacoes (grade de estações e colunas) e a de uma carroceria definida por feições vem de gaiolaPorRede (curvas nomeadas e os retalhos que elas fecham), que devolvem vertices, faces, vincos, cantos e medidas já em nomes.'], faces: ['lista', 'Faces da gaiola, cada uma a lista dos nomes de ponto em sentido anti-horário visto de fora; o índice de vértice só serve à gaiola anônima.'], vincos: ['lista', "Vincos nomeados {nome, pontos, nitidez}: pontos é a sequência de nomes de ponto ao longo das arestas da gaiola (repita o primeiro no fim para fechar), e nitidez vai de 0 (liso) a 1 (vivo), ou 'viva'; a nitidez n vira 10 n² níveis de Catmull-Clark, como o vinco do Blender."], cantos: ['listaTextos', 'Nomes de ponto da gaiola que ficam como canto vivo.'], niveis: ['inteiro', 'Níveis de refinamento, 0 a 6.'], borda: ['texto', "'suave' (padrão) ou 'cantos'."], simetria: ['texto', "'x': a gaiola é a metade x >= 0 e é espelhada antes de subdividir, com a costura lisa."], medidas: ['lista', "Cotas da gaiola: o nome de ponto é cota exata, por onde a superfície limite passa; { ponto, peso } é cota que a superfície aproxima por mínimos quadrados, sem passar por ela, com os pontos em volta presos perto da gaiola declarada (peso 1 pesa o desvio à cota igual ao deslocamento de um ponto da gaiola; quanto maior, mais perto da cota). Os pontos não citados ficam onde foram declarados. Com pesoPadrao, o nome sozinho ganha o peso dele, e a cota exata é { ponto, exata: true }."], pesoPadrao: ['escalar', "Peso das medidas escritas só com o nome de ponto, para a gaiola cujos pontos vêm de leitura de imagem: a cota lida que passa exata por cada ponto copia o erro de leitura em rugas, e com o peso a superfície se aproxima delas (peso 1 serve). Sem pesoPadrao, o nome sozinho é cota exata. A cota de projeto que a peça precisa acertar se escreve { ponto, exata: true }, e a declaração de um ponto (peso ou exata) vence o padrão."], espessura: ['escalar', 'Espessura da chapa: a superfície subdividida vira a face externa, a interna fica a esta distância e a parede fecha as bordas livres e os vãos; o resultado é sólido fechado.'], lado: ['texto', "Com espessura: 'contraNormal' (padrão) põe o material contra a normal das faces, para dentro quando elas são anti-horárias vistas de fora; 'normal' põe a favor. A superfície declarada é sempre a face externa."], liso: ['escalarOuFalso', 'Ângulo em graus do sombreamento liso das faces geradas (padrão 30): aresta com diedro maior que ele divide a sombra, como o passo liso com angulo; false deixa as faces chapadas. Só a marca de sombra muda, nunca a malha.'], quebraNosVincos: ['texto', "Onde a sombra lisa se divide qualquer que seja o ângulo: 'vivos' (padrão), nas arestas que descendem de vinco vivo, que continua dobra nas pontas onde o diedro cai abaixo do ângulo; 'todos', também nos vincos de nitidez fracionária; 'nenhum', só pelo ângulo."] }, obrigatorios: ['vertices', 'faces'], passos: [['subdivisao', { vertices: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], faces: [[0, 3, 2, 1]], niveis: 1 }]], limites: ['Sem espessura, é a superfície da gaiola, aberta se a gaiola for aberta; com espessura, é sólido fechado, com as partes externa, interna e borda citáveis por origem.', 'A regra é a do OpenSubdiv no modo uniforme, sem projeção na superfície limite; confere com o Subdivision Surface do Blender com use_limit_surface desligado.', 'Sem medidas, a superfície aproxima a gaiola e não passa pelos pontos; com medidas, só os pontos marcados passam pela superfície limite, e todo vértice da malha entregue vai ao seu ponto limite, de modo que a cota é vértice da malha.', 'Medidas que a superfície limite não separa, ou que movem a gaiola mais de 100 vezes o erro do alvo, gritam com os nomes dos pontos, com peso ou exatas.', 'A medida com peso não passa pela cota: o desvio que sobra cai com o peso, e o sistema normal se resolve pela mesma eliminação de Gauss em ordem fixa, bit a bit.', 'Dado lido de imagem entra com peso: use pesoPadrao (ou leitura na gaiolaPorEstacoes e na gaiolaPorRede) e deixe exata só a cota de projeto.',
      'gaiolaPorRede (procedural/nucleo/gaiola-por-rede.js) monta a gaiola de curvas de feição nomeadas, em mm, e dos retalhos de três a oito lados que elas fecham: as arestas seguem as curvas, o interior é Coons alisado pela normal, os retalhos de três e cinco lados têm um centro extraordinário declarado, a curva vinco vira vinco nomeado e linha(curva) dá a linha nomeada do friso; a curva precisa passar por nós declarados, e a densidade sai de um passo e das divisões que o retalho declara.', 'Vinco e canto por índice gritam com a forma nomeada; par de pontos do vinco que não é aresta da gaiola, ponto inexistente e nome de vinco repetido gritam com os nomes.', 'As faces saem lisas a 30 graus com quebra de sombra nos vincos vivos (face.quebras, que a bancada respeita); o rasterizador das vistas da receita desenha toda face chapada.', 'Com espessura, a espessura que passa do raio de curvatura local do lado do material grita com os pontos nomeados mais perto; no vinco vivo esse raio é a largura da faixa de faces ao lado dele e cai pela metade a cada nível. Partes distantes da chapa a menos de uma espessura uma da outra não são conferidas.'] },
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
