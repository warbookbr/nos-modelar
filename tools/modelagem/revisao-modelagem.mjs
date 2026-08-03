/*
 * Revisão de modelagem — núcleo puro do ciclo assistido por IA.
 *
 * O relatório não guarda foto, caminho de máquina, host de desenvolvimento,
 * UUID de runtime, índice de face/corpo/passo nem relógio. A imagem é uma
 * evidência que uma pessoa ou outro agente lê; a verdade estrutural vem da
 * descrição neutra da peça. Assim a mesma descrição e os mesmos números de
 * enquadramento sempre produzem exatamente o mesmo JSON.
 */
import { createHash } from 'node:crypto';

export const FORMATO_REVISAO = 'mecanifica.revisao-modelagem';
export const FORMATO_CRITICA = 'mecanifica.critica-modelagem';
/* v2 acrescentou aparência; v3 separa id estável de rótulo das portas.
   As duas versões anteriores seguem verificáveis como evidência histórica. */
export const VERSAO = 3;
export const VERSAO_APARENCIA = 2;
export const VERSAO_LEGADA = 1;
export const VISTAS_CANONICAS = ['isometrica', 'frontal', 'direita', 'superior'];
export const CATEGORIAS_CRITICA = ['forma', 'proporcao', 'transicao', 'encaixe', 'material', 'apresentacao'];
export const VIABILIDADES_CRITICA = ['ajuste', 'remodelagem_local', 'capacidade_ausente'];
export const ESTADOS_CRITICA = ['atendido', 'divergente', 'bloqueado_capacidade', 'adiado'];

const UUID = /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i;
const CAMPO_PROIBIDO = /^(uuid|indice|index|passo|timestamp|createdat|updatedat|host)$/i;
/* Fixtures públicas herdadas usam o prefixo `_` (por exemplo `_jardineira`). */
const NOME_SEMANTICO = /^[\p{L}_][\p{L}\p{N}_-]*$/u;

function erro(quem, mensagem) {
  throw new Error(`${quem}: ${mensagem}`);
}

function objeto(valor, quem, campo) {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) erro(quem, `'${campo}' precisa ser objeto.`);
  return valor;
}

function texto(valor, quem, campo, { semantico = false } = {}) {
  if (typeof valor !== 'string' || valor.trim() === '') erro(quem, `'${campo}' precisa ser texto não vazio.`);
  if (UUID.test(valor)) erro(quem, `'${campo}' contém UUID de runtime, que não é identidade persistível.`);
  if (semantico && !NOME_SEMANTICO.test(valor)) {
    erro(quem, `'${campo}' precisa ser nome semântico estável, recebi ${JSON.stringify(valor)}.`);
  }
  return valor;
}

function inteiro(valor, quem, campo) {
  if (!Number.isInteger(valor) || valor < 0) erro(quem, `'${campo}' precisa ser inteiro >= 0.`);
  return valor;
}

/* `origem.id` vem do autor (por exemplo `cone:405` na jardineira), e portanto
   pode ser número. Não é índice de passo, face ou corpo: estes continuam
   proibidos no artefato persistido. Preservar o tipo impede que 405 vire a
   string "405" e mude a assinatura entre a descrição e a revisão. */
function idDeOrigem(valor, quem, campo) {
  if (Number.isInteger(valor) && valor >= 0) return valor;
  return texto(valor, quem, campo, { semantico: true });
}

function numero(valor, quem, campo) {
  if (!Number.isFinite(valor)) erro(quem, `'${campo}' precisa ser número finito.`);
  return Object.is(valor, -0) ? 0 : valor;
}

function vetor(valor, quem, campo) {
  if (!Array.isArray(valor) || valor.length !== 3) erro(quem, `'${campo}' precisa ter três números.`);
  return valor.map((n, i) => numero(n, quem, `${campo}[${i}]`));
}

function compararTexto(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

function chavesExatas(valor, permitidas, quem, campo) {
  for (const chave of Object.keys(valor)) {
    if (CAMPO_PROIBIDO.test(chave) || !permitidas.includes(chave)) {
      erro(quem, `'${campo}.${chave}' não é permitido: revisão não persiste identidade posicional, runtime ou relógio.`);
    }
  }
}

function chavesObrigatorias(valor, permitidas, quem, campo) {
  chavesExatas(valor, permitidas, quem, campo);
  const ausentes = permitidas.filter((chave) => !Object.hasOwn(valor, chave));
  if (ausentes.length) erro(quem, `'${campo}' precisa declarar: ${ausentes.join(', ')}.`);
}

/** Serialização canônica independente da ordem de inserção de objetos. */
export function jsonCanonico(valor) {
  if (valor === null || typeof valor === 'boolean' || typeof valor === 'string') return JSON.stringify(valor);
  if (typeof valor === 'number') {
    if (!Number.isFinite(valor)) throw new Error('jsonCanonico: número não finito não pode ser persistido.');
    return JSON.stringify(Object.is(valor, -0) ? 0 : valor);
  }
  if (Array.isArray(valor)) return `[${valor.map(jsonCanonico).join(',')}]`;
  if (valor && typeof valor === 'object') {
    return `{${Object.keys(valor).sort(compararTexto).map((chave) => `${JSON.stringify(chave)}:${jsonCanonico(valor[chave])}`).join(',')}}`;
  }
  throw new Error(`jsonCanonico: tipo não serializável ${typeof valor}.`);
}

function assinatura(valor) {
  return `sha256:${createHash('sha256').update(jsonCanonico(valor), 'utf8').digest('hex')}`;
}

function temIdentidadeProibida(valor, caminho = 'raiz') {
  if (typeof valor === 'string') {
    if (UUID.test(valor)) return `${caminho} contém UUID de runtime`;
    if (/^(?:[a-z]:\\|\\\\|\/)/i.test(valor) || /^data:/i.test(valor)) return `${caminho} contém caminho ou binário local`;
    return null;
  }
  if (Array.isArray(valor)) {
    for (let i = 0; i < valor.length; i++) {
      const achado = temIdentidadeProibida(valor[i], `${caminho}[${i}]`);
      if (achado) return achado;
    }
  } else if (valor && typeof valor === 'object') {
    for (const [chave, filho] of Object.entries(valor)) {
      if (CAMPO_PROIBIDO.test(chave)) return `${caminho}.${chave} é identidade posicional, runtime ou relógio`;
      const achado = temIdentidadeProibida(filho, `${caminho}.${chave}`);
      if (achado) return achado;
    }
  }
  return null;
}

function caixa(valor, quem, campo) {
  objeto(valor, quem, campo);
  chavesExatas(valor, ['nome', 'faces', 'corpos', 'min', 'max', 'centro', 'dimensoes'], quem, campo);
  const min = vetor(valor.min, quem, `${campo}.min`);
  const max = vetor(valor.max, quem, `${campo}.max`);
  const centro = vetor(valor.centro, quem, `${campo}.centro`);
  const dimensoes = vetor(valor.dimensoes, quem, `${campo}.dimensoes`);
  for (let i = 0; i < 3; i++) {
    if (min[i] > max[i]) erro(quem, `'${campo}' tem mínimo maior que máximo no eixo ${i}.`);
    if (dimensoes[i] < 0) erro(quem, `'${campo}.dimensoes' não pode ser negativa.`);
  }
  return {
    nome: texto(valor.nome, quem, `${campo}.nome`, { semantico: true }),
    faces: inteiro(valor.faces, quem, `${campo}.faces`),
    corpos: inteiro(valor.corpos, quem, `${campo}.corpos`),
    min, max, centro, dimensoes,
  };
}

function relacao(valor, partes, quem, campo) {
  objeto(valor, quem, campo);
  chavesExatas(valor, ['a', 'b', 'tipo', 'distancia', 'eixo', 'porEixo'], quem, campo);
  const a = texto(valor.a, quem, `${campo}.a`, { semantico: true });
  const b = texto(valor.b, quem, `${campo}.b`, { semantico: true });
  if (a === b || !partes.has(a) || !partes.has(b)) erro(quem, `'${campo}' referencia parte inexistente ou repetida.`);
  if (!['folga', 'encosta', 'interpenetra'].includes(valor.tipo)) erro(quem, `'${campo}.tipo' é desconhecido.`);
  if (!['x', 'y', 'z'].includes(valor.eixo)) erro(quem, `'${campo}.eixo' precisa ser x, y ou z.`);
  const [primeira, segunda] = [a, b].sort(compararTexto);
  return { a: primeira, b: segunda, tipo: valor.tipo, distancia: numero(valor.distancia, quem, `${campo}.distancia`), eixo: valor.eixo, porEixo: vetor(valor.porEixo, quem, `${campo}.porEixo`) };
}

function portaDaDescricao(valor, quem, campo) {
  objeto(valor, quem, campo);
  /* A descrição traz `passo` para leitura humana; a revisão o descarta. */
  for (const chave of Object.keys(valor)) {
    if (!['id', 'rotulo', 'op', 'origemId', 'recorte', 'origem', 'passo'].includes(chave)) erro(quem, `'${campo}.${chave}' não é reconhecido.`);
  }
  const porta = {
    id: texto(valor.id, quem, `${campo}.id`, { semantico: true }),
    rotulo: texto(valor.rotulo, quem, `${campo}.rotulo`),
    op: texto(valor.op, quem, `${campo}.op`, { semantico: true }),
    origemId: idDeOrigem(valor.origemId, quem, `${campo}.origemId`),
    recorte: typeof valor.recorte === 'string' ? valor.recorte : '',
    origem: texto(valor.origem, quem, `${campo}.origem`),
  };
  if (temIdentidadeProibida(porta)) erro(quem, `${campo} contém identidade proibida.`);
  return porta;
}

/* O formato de revisão até v2 chamava a chave da porta de `nome` e reutilizava
   `id` para a origem geométrica. É ambíguo, mas permanece legível para que uma
   revisão já assinada continue auditável exatamente como foi gravada. */
function portaLegadaDaDescricao(valor, quem, campo) {
  objeto(valor, quem, campo);
  for (const chave of Object.keys(valor)) {
    if (!['nome', 'op', 'id', 'recorte', 'origem', 'passo'].includes(chave)) erro(quem, `'${campo}.${chave}' não é reconhecido.`);
  }
  const porta = {
    nome: texto(valor.nome, quem, `${campo}.nome`, { semantico: true }),
    op: texto(valor.op, quem, `${campo}.op`, { semantico: true }),
    id: idDeOrigem(valor.id, quem, `${campo}.id`),
    recorte: typeof valor.recorte === 'string' ? valor.recorte : '',
    origem: texto(valor.origem, quem, `${campo}.origem`),
  };
  if (temIdentidadeProibida(porta)) erro(quem, `${campo} contém identidade proibida.`);
  return porta;
}

const PROPRIEDADES_MATERIAL = ['cor', 'emissivo', 'aspereza', 'semLuz', 'contorno', 'mistura', 'opacidade'];

function propriedadesMaterial(valor, quem, campo) {
  objeto(valor, quem, campo);
  chavesExatas(valor, PROPRIEDADES_MATERIAL, quem, campo);
  const resultado = {};
  for (const chave of PROPRIEDADES_MATERIAL) {
    if (!Object.hasOwn(valor, chave)) continue;
    const entrada = valor[chave];
    if (chave === 'cor' || chave === 'mistura') resultado[chave] = texto(entrada, quem, `${campo}.${chave}`);
    else if (chave === 'semLuz') {
      if (typeof entrada !== 'boolean') erro(quem, `'${campo}.${chave}' precisa ser booleano.`);
      resultado[chave] = entrada;
    } else resultado[chave] = numero(entrada, quem, `${campo}.${chave}`);
  }
  return resultado;
}

function pintura(valor, quem, campo) {
  objeto(valor, quem, campo);
  chavesExatas(valor, ['a', 'b', 'cor', 'raio', 'dureza'], quem, campo);
  return {
    a: numero(valor.a, quem, `${campo}.a`),
    b: numero(valor.b, quem, `${campo}.b`),
    cor: valor.cor === null ? null : texto(valor.cor, quem, `${campo}.cor`),
    raio: numero(valor.raio, quem, `${campo}.raio`),
    dureza: numero(valor.dureza, quem, `${campo}.dureza`),
  };
}

function cobertura(valor, quem, campo) {
  objeto(valor, quem, campo);
  chavesExatas(valor, ['material', 'cor', 'liso', 'pinturas', 'faces'], quem, campo);
  const material = valor.material === null ? null : texto(valor.material, quem, `${campo}.material`, { semantico: true });
  const cor = valor.cor === null ? null : texto(valor.cor, quem, `${campo}.cor`);
  if (typeof valor.liso !== 'boolean') erro(quem, `'${campo}.liso' precisa ser booleano.`);
  if (!Array.isArray(valor.pinturas)) erro(quem, `'${campo}.pinturas' precisa ser lista.`);
  const pinturas = valor.pinturas.map((item, i) => pintura(item, quem, `${campo}.pinturas[${i}]`));
  return { material, cor, liso: valor.liso, pinturas, faces: inteiro(valor.faces, quem, `${campo}.faces`) };
}

function aparenciaDaDescricao(valor, partes, quem, campo = 'descrição.aparencia') {
  objeto(valor, quem, campo);
  chavesExatas(valor, ['materiais', 'partes'], quem, campo);
  if (!Array.isArray(valor.materiais) || !Array.isArray(valor.partes)) erro(quem, `'${campo}.materiais' e '${campo}.partes' precisam ser listas.`);
  const materiais = valor.materiais.map((item, i) => {
    objeto(item, quem, `${campo}.materiais[${i}]`);
    chavesExatas(item, ['nome', 'propriedades'], quem, `${campo}.materiais[${i}]`);
    return {
      nome: texto(item.nome, quem, `${campo}.materiais[${i}].nome`, { semantico: true }),
      propriedades: propriedadesMaterial(item.propriedades, quem, `${campo}.materiais[${i}].propriedades`),
    };
  }).sort((a, b) => compararTexto(a.nome, b.nome));
  if (new Set(materiais.map((item) => item.nome)).size !== materiais.length) erro(quem, `'${campo}.materiais' repete nome.`);
  const nomesDeMaterial = new Set(materiais.map((item) => item.nome));
  const porParte = new Map(partes.map((parte) => [parte.nome, parte]));
  const aparenciaPartes = valor.partes.map((item, i) => {
    objeto(item, quem, `${campo}.partes[${i}]`);
    chavesExatas(item, ['nome', 'coberturas'], quem, `${campo}.partes[${i}]`);
    const nome = texto(item.nome, quem, `${campo}.partes[${i}].nome`, { semantico: true });
    const parte = porParte.get(nome);
    if (!parte) erro(quem, `'${campo}.partes[${i}]' cita parte inexistente '${nome}'.`);
    if (!Array.isArray(item.coberturas) || item.coberturas.length === 0) erro(quem, `'${campo}.partes[${i}].coberturas' precisa cobrir as faces da parte.`);
    const coberturas = item.coberturas.map((c, j) => cobertura(c, quem, `${campo}.partes[${i}].coberturas[${j}]`));
    const totalFaces = coberturas.reduce((soma, c) => soma + c.faces, 0);
    if (totalFaces !== parte.faces) erro(quem, `'${campo}.partes[${i}].coberturas' não cobre as ${parte.faces} faces da parte.`);
    for (const itemCobertura of coberturas) {
      if (itemCobertura.material !== null && !nomesDeMaterial.has(itemCobertura.material)) {
        erro(quem, `'${campo}.partes[${i}]' usa material não declarado '${itemCobertura.material}'.`);
      }
    }
    return { nome, coberturas: coberturas.sort((a, b) => compararTexto(jsonCanonico(a), jsonCanonico(b))) };
  }).sort((a, b) => compararTexto(a.nome, b.nome));
  if (aparenciaPartes.length !== partes.length || new Set(aparenciaPartes.map((item) => item.nome)).size !== partes.length) {
    erro(quem, `'${campo}.partes' precisa cobrir cada parte semântica exatamente uma vez.`);
  }
  const materiaisUsados = new Set(aparenciaPartes.flatMap((parte) => parte.coberturas.map((item) => item.material).filter(Boolean)));
  if (materiaisUsados.size !== materiais.length || [...materiaisUsados].some((nome) => !nomesDeMaterial.has(nome))) {
    erro(quem, `'${campo}.materiais' precisa conter exatamente os materiais efetivamente usados.`);
  }
  const resultado = { materiais, partes: aparenciaPartes };
  if (temIdentidadeProibida(resultado)) erro(quem, `${campo} contém identidade proibida.`);
  return resultado;
}

/** Projeta a descrição neutra para o contrato persistível da revisão. */
export function modeloDaDescricao(descricao) {
  const quem = 'modeloDaDescricao';
  objeto(descricao, quem, 'descrição');
  for (const campo of ['totais', 'partes', 'relacoes', 'portas', 'aparencia']) {
    if (!(campo in descricao)) erro(quem, `descrição não tem '${campo}'. Use descreverPeca().`);
  }
  const totaisEntrada = objeto(descricao.totais, quem, 'descrição.totais');
  if (inteiro(totaisEntrada.facesSemParte, quem, 'descrição.totais.facesSemParte') !== 0
    || inteiro(totaisEntrada.orfaos, quem, 'descrição.totais.orfaos') !== 0) {
    erro(quem, 'a peça tem faces sem identidade ou órfãos; ela não pode gerar revisão assistida.');
  }
  if (!Array.isArray(descricao.partes) || !Array.isArray(descricao.relacoes) || !Array.isArray(descricao.portas)) {
    erro(quem, 'partes, relacoes e portas precisam ser listas.');
  }
  const partes = descricao.partes.map((parte, i) => caixa(parte, quem, `descrição.partes[${i}]`)).sort((a, b) => compararTexto(a.nome, b.nome));
  const nomes = new Set();
  for (const parte of partes) {
    if (nomes.has(parte.nome)) erro(quem, `parte '${parte.nome}' foi declarada duas vezes.`);
    nomes.add(parte.nome);
  }
  const relacoes = descricao.relacoes.map((item, i) => relacao(item, nomes, quem, `descrição.relacoes[${i}]`))
    .sort((a, b) => compararTexto(`${a.a}\u0000${a.b}`, `${b.a}\u0000${b.b}`));
  const pares = new Set();
  for (const item of relacoes) {
    const chave = [item.a, item.b].sort(compararTexto).join('\u0000');
    if (pares.has(chave)) erro(quem, `a relação entre '${item.a}' e '${item.b}' aparece mais de uma vez.`);
    pares.add(chave);
  }
  const portas = descricao.portas.map((porta, i) => portaDaDescricao(porta, quem, `descrição.portas[${i}]`))
    .sort((a, b) => compararTexto(a.id, b.id));
  const idsPorta = new Set();
  for (const porta of portas) {
    if (idsPorta.has(porta.id)) erro(quem, `porta '${porta.id}' foi declarada duas vezes.`);
    idsPorta.add(porta.id);
  }
  const totais = {
    partes: inteiro(totaisEntrada.partes, quem, 'descrição.totais.partes'),
    faces: inteiro(totaisEntrada.faces, quem, 'descrição.totais.faces'),
    vertices: inteiro(totaisEntrada.vertices, quem, 'descrição.totais.vertices'),
    portas: inteiro(totaisEntrada.portas, quem, 'descrição.totais.portas'),
  };
  if (totais.partes !== partes.length || totais.portas !== portas.length) {
    erro(quem, 'contagens de partes ou portas divergem da descrição detalhada.');
  }
  const aparencia = aparenciaDaDescricao(descricao.aparencia, partes, quem);
  return { totais, partes, relacoes, portas, aparencia };
}

/** Identidade determinística do estado modelado, útil também quando uma
 * tentativa visual é recusada antes de existir uma revisão publicável. */
export function assinaturaModeloDaDescricao(descricao) {
  return assinatura(modeloDaDescricao(descricao));
}

export function rotaCanonica(peca, vista) {
  texto(peca, 'rotaCanonica', 'peca', { semantico: true });
  if (!VISTAS_CANONICAS.includes(vista)) erro('rotaCanonica', `vista '${vista}' não é canônica.`);
  const params = new URLSearchParams({ peca, projecao: 'ortografica' });
  if (vista !== 'isometrica') params.set('vista', vista);
  return `bancada.html?${params.toString()}`;
}

function enquadramento(valor, quem, campo) {
  objeto(valor, quem, campo);
  chavesExatas(valor, ['valida', 'area', 'largura', 'altura', 'cortado'], quem, campo);
  if (typeof valor.valida !== 'boolean' || typeof valor.cortado !== 'boolean') erro(quem, `'${campo}' precisa declarar valida e cortado booleanos.`);
  const resultado = {
    valida: valor.valida,
    area: numero(valor.area, quem, `${campo}.area`),
    largura: numero(valor.largura, quem, `${campo}.largura`),
    altura: numero(valor.altura, quem, `${campo}.altura`),
    cortado: valor.cortado,
  };
  if (resultado.area < 0 || resultado.area > 1 || resultado.largura < 0 || resultado.largura > 1 || resultado.altura < 0 || resultado.altura > 1) {
    erro(quem, `'${campo}' tem ocupação fora do intervalo 0..1.`);
  }
  if (!resultado.valida || resultado.cortado) erro(quem, `'${campo}' não passou o gate de enquadramento da bancada.`);
  return resultado;
}

function vistasCanonicas(peca, vistas, quem) {
  if (!Array.isArray(vistas) || vistas.length !== VISTAS_CANONICAS.length) {
    erro(quem, `precisa receber exatamente as ${VISTAS_CANONICAS.length} vistas canônicas.`);
  }
  const porNome = new Map();
  for (const [i, vista] of vistas.entries()) {
    objeto(vista, quem, `vistas[${i}]`);
    chavesExatas(vista, ['nome', 'rota', 'enquadramento'], quem, `vistas[${i}]`);
    const nome = texto(vista.nome, quem, `vistas[${i}].nome`, { semantico: true });
    if (!VISTAS_CANONICAS.includes(nome) || porNome.has(nome)) erro(quem, `vista '${nome}' é desconhecida ou repetida.`);
    const rota = rotaCanonica(peca, nome);
    if (vista.rota !== undefined && vista.rota !== rota) {
      erro(quem, `'vistas[${i}].rota' não é a rota canônica esperada; host e estado implícito não entram na revisão.`);
    }
    porNome.set(nome, { nome, rota, enquadramento: enquadramento(vista.enquadramento, quem, `vistas[${i}].enquadramento`) });
  }
  return VISTAS_CANONICAS.map((nome) => porNome.get(nome));
}

/** Constrói uma revisão persistível. Não lê arquivo, navegador nem relógio. */
export function construirRevisao({ peca, descricao, vistas }) {
  const quem = 'construirRevisao';
  const nomePeca = texto(peca, quem, 'peca', { semantico: true });
  const modelo = modeloDaDescricao(descricao);
  return {
    formato: FORMATO_REVISAO,
    versao: VERSAO,
    peca: nomePeca,
    assinaturaModelo: assinatura(modelo),
    modelo,
    vistas: vistasCanonicas(nomePeca, vistas, quem),
  };
}

function modeloPersistido(valor, quem, versao) {
  objeto(valor, quem, 'modelo');
  chavesExatas(valor, versao === VERSAO_LEGADA ? ['totais', 'partes', 'relacoes', 'portas'] : ['totais', 'partes', 'relacoes', 'portas', 'aparencia'], quem, 'modelo');
  const totais = objeto(valor.totais, quem, 'modelo.totais');
  chavesExatas(totais, ['partes', 'faces', 'vertices', 'portas'], quem, 'modelo.totais');
  const descricao = {
    totais: { ...totais, facesSemParte: 0, orfaos: 0 },
    partes: valor.partes,
    relacoes: valor.relacoes,
    portas: (valor.portas ?? []).map((porta) => ({ ...porta })),
  };
  if (versao <= VERSAO_APARENCIA) {
    /* v1 não assinava aparência; v2 ainda usava a porta ambígua nome/id.
       Ambas permanecem válidas como evidência histórica, sem reescrever a
       forma que sua assinatura original cobria. */
    if (!Array.isArray(valor.partes) || !Array.isArray(valor.relacoes) || !Array.isArray(valor.portas)) {
      erro(quem, 'modelo legado tem partes, relacoes ou portas fora de lista.');
    }
    const partes = valor.partes.map((parte, i) => caixa(parte, quem, `modelo.partes[${i}]`)).sort((a, b) => compararTexto(a.nome, b.nome));
    const nomes = new Set();
    for (const parte of partes) {
      if (nomes.has(parte.nome)) erro(quem, `parte '${parte.nome}' foi declarada duas vezes.`);
      nomes.add(parte.nome);
    }
    const relacoes = valor.relacoes.map((item, i) => relacao(item, nomes, quem, `modelo.relacoes[${i}]`))
      .sort((a, b) => compararTexto(`${a.a}\u0000${a.b}`, `${b.a}\u0000${b.b}`));
    const pares = new Set();
    for (const item of relacoes) {
      const chave = `${item.a}\u0000${item.b}`;
      if (pares.has(chave)) erro(quem, `a relação entre '${item.a}' e '${item.b}' aparece mais de uma vez.`);
      pares.add(chave);
    }
    const portas = descricao.portas.map((porta) => portaLegadaDaDescricao(porta, quem, 'modelo.portas[]')).sort((a, b) => compararTexto(a.nome, b.nome));
    const nomesPorta = new Set(portas.map((porta) => porta.nome));
    if (nomesPorta.size !== portas.length) erro(quem, 'modelo legado repete porta.');
    const totaisLegados = {
      partes: inteiro(totais.partes, quem, 'modelo.totais.partes'),
      faces: inteiro(totais.faces, quem, 'modelo.totais.faces'),
      vertices: inteiro(totais.vertices, quem, 'modelo.totais.vertices'),
      portas: inteiro(totais.portas, quem, 'modelo.totais.portas'),
    };
    if (totaisLegados.partes !== partes.length || totaisLegados.portas !== portas.length) {
      erro(quem, 'contagens de partes ou portas divergem da descrição detalhada.');
    }
    if (versao === VERSAO_LEGADA) return { totais: totaisLegados, partes, relacoes, portas };
    descricao.aparencia = valor.aparencia;
    return {
      totais: totaisLegados, partes, relacoes, portas,
      aparencia: aparenciaDaDescricao(descricao.aparencia, partes, quem),
    };
  }
  descricao.aparencia = valor.aparencia;
  /* A entrada persistida não aceita `passo`; ela é reidratada só para reutilizar
     a projeção da descrição e a validação detalhada. */
  for (const porta of descricao.portas) {
    chavesExatas(porta, ['id', 'rotulo', 'op', 'origemId', 'recorte', 'origem'], quem, 'modelo.portas[]');
  }
  return modeloDaDescricao(descricao);
}

/** Valida e canonicaliza uma revisão que veio de JSON. */
export function validarRevisao(revisao) {
  const quem = 'validarRevisao';
  objeto(revisao, quem, 'revisão');
  chavesExatas(revisao, ['formato', 'versao', 'peca', 'assinaturaModelo', 'modelo', 'vistas'], quem, 'revisão');
  if (revisao.formato !== FORMATO_REVISAO || ![VERSAO_LEGADA, VERSAO_APARENCIA, VERSAO].includes(revisao.versao)) erro(quem, 'formato ou versão não suportados.');
  const peca = texto(revisao.peca, quem, 'peca', { semantico: true });
  const modelo = modeloPersistido(revisao.modelo, quem, revisao.versao);
  const assinaturaModelo = assinatura(modelo);
  if (revisao.assinaturaModelo !== assinaturaModelo) erro(quem, 'assinaturaModelo não corresponde ao modelo canônico.');
  const vistas = vistasCanonicas(peca, revisao.vistas, quem);
  return { formato: FORMATO_REVISAO, versao: revisao.versao, peca, assinaturaModelo, modelo, vistas };
}

function textoObjetivo(valor, quem, campo) {
  const resultado = texto(valor, quem, campo);
  if (resultado.length < 12 || /deixar mais realista/i.test(resultado)) {
    erro(quem, `'${campo}' não é uma observação verificável.`);
  }
  return resultado;
}

/**
 * Valida uma crítica contra a revisão que ela leu. `checklist` é a lista dos
 * ids semânticos do briefing; o núcleo não precisa conhecer o pacote inteiro.
 */
export function validarCritica(critica, revisao, checklist) {
  const quem = 'validarCritica';
  const base = validarRevisao(revisao);
  if (!Array.isArray(checklist)) erro(quem, 'checklist precisa ser lista de ids semânticos.');
  const itensChecklist = new Set(checklist.map((id, i) => texto(id, quem, `checklist[${i}]`, { semantico: true })));
  if (itensChecklist.size !== checklist.length) erro(quem, 'checklist tem id repetido.');
  objeto(critica, quem, 'crítica');
  chavesObrigatorias(critica, ['formato', 'versao', 'peca', 'assinaturaModelo', 'itens', 'estadosChecklist', 'obsoleta'], quem, 'crítica');
  if (critica.formato !== FORMATO_CRITICA || critica.versao !== base.versao) erro(quem, 'formato ou versão não suportados.');
  if (critica.peca !== base.peca) erro(quem, 'a crítica aponta para outra peça.');
  if (critica.assinaturaModelo !== base.assinaturaModelo) erro(quem, 'a crítica não pertence à assinatura desta revisão.');
  if (critica.obsoleta !== false) erro(quem, 'crítica atual precisa declarar obsoleta: false.');
  if (!Array.isArray(critica.itens) || critica.itens.length > 5) erro(quem, 'a crítica precisa ter no máximo cinco itens.');
  const partes = new Set(base.modelo.partes.map((parte) => parte.nome));
  const vistas = new Set(base.vistas.map((vista) => vista.nome));
  const vistos = new Set();
  const itens = critica.itens.map((item, i) => {
    objeto(item, quem, `itens[${i}]`);
    chavesObrigatorias(item, ['checklist', 'parte', 'regiao', 'vista', 'categoria', 'evidencia', 'aceite', 'viabilidade'], quem, `itens[${i}]`);
    const chave = texto(item.checklist, quem, `itens[${i}].checklist`, { semantico: true });
    if (!itensChecklist.has(chave)) erro(quem, `itens[${i}] cita checklist inexistente '${chave}'.`);
    if (vistos.has(chave)) erro(quem, `checklist '${chave}' foi criticado mais de uma vez.`);
    vistos.add(chave);
    const parte = item.parte === null || item.parte === undefined ? null : texto(item.parte, quem, `itens[${i}].parte`, { semantico: true });
    const regiao = item.regiao === null || item.regiao === undefined ? null : texto(item.regiao, quem, `itens[${i}].regiao`, { semantico: true });
    if (!parte && !regiao) erro(quem, `itens[${i}] precisa apontar parte ou região.`);
    if (parte && !partes.has(parte)) erro(quem, `itens[${i}] cita parte inexistente '${parte}'.`);
    const vista = texto(item.vista, quem, `itens[${i}].vista`, { semantico: true });
    if (!vistas.has(vista)) erro(quem, `itens[${i}] cita vista inexistente '${vista}'.`);
    if (!CATEGORIAS_CRITICA.includes(item.categoria)) erro(quem, `itens[${i}].categoria é inválida.`);
    if (!VIABILIDADES_CRITICA.includes(item.viabilidade)) erro(quem, `itens[${i}].viabilidade é inválida.`);
    return {
      checklist: chave, parte, regiao, vista, categoria: item.categoria,
      evidencia: textoObjetivo(item.evidencia, quem, `itens[${i}].evidencia`),
      aceite: textoObjetivo(item.aceite, quem, `itens[${i}].aceite`),
      viabilidade: item.viabilidade,
    };
  });
  if (!Array.isArray(critica.estadosChecklist) || critica.estadosChecklist.length !== checklist.length) {
    erro(quem, 'estadosChecklist precisa cobrir exatamente todos os itens do checklist.');
  }
  const estadosVistos = new Set();
  const estadosChecklist = critica.estadosChecklist.map((item, i) => {
    objeto(item, quem, `estadosChecklist[${i}]`);
    chavesObrigatorias(item, ['checklist', 'estado'], quem, `estadosChecklist[${i}]`);
    const chave = texto(item.checklist, quem, `estadosChecklist[${i}].checklist`, { semantico: true });
    if (!itensChecklist.has(chave)) erro(quem, `estadosChecklist[${i}] cita checklist inexistente '${chave}'.`);
    if (estadosVistos.has(chave)) erro(quem, `estadosChecklist repete checklist '${chave}'.`);
    estadosVistos.add(chave);
    if (!ESTADOS_CRITICA.includes(item.estado)) erro(quem, `estadosChecklist[${i}].estado é inválido.`);
    return { checklist: chave, estado: item.estado };
  });
  for (const chave of itensChecklist) {
    if (!estadosVistos.has(chave)) erro(quem, `estadosChecklist não cobre checklist '${chave}'.`);
  }
  if (estadosChecklist.some((item, i) => item.checklist !== checklist[i])) {
    erro(quem, 'estadosChecklist precisa seguir a ordem do checklist do briefing.');
  }
  const divergentes = new Set(estadosChecklist.filter((item) => item.estado === 'divergente').map((item) => item.checklist));
  if (divergentes.size !== vistos.size || [...divergentes].some((chave) => !vistos.has(chave))) {
    erro(quem, 'cada estado divergente precisa ter exatamente um item de crítica, e nenhum outro item pode ser crítico.');
  }
  return {
    formato: FORMATO_CRITICA,
    versao: base.versao,
    peca: base.peca,
    assinaturaModelo: base.assinaturaModelo,
    itens,
    estadosChecklist,
    obsoleta: false,
  };
}

/** Não muta a crítica anterior; não inventa data de obsolescência. */
export function marcarCriticaObsoleta(critica, assinaturaAtual) {
  objeto(critica, 'marcarCriticaObsoleta', 'crítica');
  texto(assinaturaAtual, 'marcarCriticaObsoleta', 'assinaturaAtual');
  return { ...critica, obsoleta: critica.assinaturaModelo !== assinaturaAtual };
}

function porNome(lista, chave) {
  return new Map(lista.map((item) => [chave(item), item]));
}

function mudarMapas(anterior, atual, chave) {
  const a = porNome(anterior, chave);
  const b = porNome(atual, chave);
  const adicionadas = [...b.keys()].filter((k) => !a.has(k)).sort(compararTexto);
  const removidas = [...a.keys()].filter((k) => !b.has(k)).sort(compararTexto);
  const alteradas = [...a.keys()].filter((k) => b.has(k) && jsonCanonico(a.get(k)) !== jsonCanonico(b.get(k)))
    .sort(compararTexto)
    .map((k) => ({ chave: k, anterior: a.get(k), atual: b.get(k) }));
  return { adicionadas, removidas, alteradas };
}

/** Diff estrutural: nenhuma inferência por pixels nem hash de PNG. */
export function compararRevisoes(revisaoAnterior, revisaoAtual, criticaAnterior = null) {
  const anterior = validarRevisao(revisaoAnterior);
  const atual = validarRevisao(revisaoAtual);
  if (anterior.peca !== atual.peca) throw new Error('compararRevisoes: só compara revisões da mesma peça.');
  const partes = mudarMapas(anterior.modelo.partes, atual.modelo.partes, (item) => item.nome);
  const relacoes = mudarMapas(anterior.modelo.relacoes, atual.modelo.relacoes, (item) => [item.a, item.b].sort(compararTexto).join('\u0000'));
  const portas = mudarMapas(anterior.modelo.portas, atual.modelo.portas, (item) => item.id ?? item.nome);
  const aparencia = {
    materiais: mudarMapas(anterior.modelo.aparencia?.materiais ?? [], atual.modelo.aparencia?.materiais ?? [], (item) => item.nome),
    partes: mudarMapas(anterior.modelo.aparencia?.partes ?? [], atual.modelo.aparencia?.partes ?? [], (item) => item.nome),
  };
  const contagens = Object.keys(anterior.modelo.totais).sort(compararTexto)
    .filter((campo) => anterior.modelo.totais[campo] !== atual.modelo.totais[campo])
    .map((campo) => ({ campo, anterior: anterior.modelo.totais[campo], atual: atual.modelo.totais[campo] }));
  const modeloMudou = anterior.assinaturaModelo !== atual.assinaturaModelo;
  return {
    formato: 'mecanifica.comparacao-revisao',
    versao: VERSAO,
    peca: anterior.peca,
    anterior: anterior.assinaturaModelo,
    atual: atual.assinaturaModelo,
    modeloMudou,
    partes,
    /* A caixa é a própria parte; expô-la separada deixa explícito o que mudou. */
    caixas: {
      adicionadas: partes.adicionadas.map((nome) => atual.modelo.partes.find((parte) => parte.nome === nome)),
      removidas: partes.removidas.map((nome) => anterior.modelo.partes.find((parte) => parte.nome === nome)),
      alteradas: partes.alteradas.filter(({ anterior: a, atual: b }) => jsonCanonico(a.min) !== jsonCanonico(b.min) || jsonCanonico(a.max) !== jsonCanonico(b.max) || jsonCanonico(a.centro) !== jsonCanonico(b.centro) || jsonCanonico(a.dimensoes) !== jsonCanonico(b.dimensoes)),
    },
    relacoes,
    portas,
    aparencia,
    contagens,
    criticaAnterior: criticaAnterior === null ? null : marcarCriticaObsoleta(criticaAnterior, atual.assinaturaModelo),
  };
}
