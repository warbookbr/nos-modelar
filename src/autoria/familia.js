/* familia.js — o contrato `mecanifica.familia@1` e o validador, puros e sem nenhum import.

   Uma família é uma peça paramétrica que a IA usa e varia por parâmetros em milímetro, graus ou contagem. O
   `familia.json` de cada pasta `procedural/familias/<id>/` declara o contrato; este arquivo o lê, recusa o que não
   fecha (com o campo, o valor recebido e o que é aceito) e devolve a leitura normalizada: as mesmas chaves, na mesma
   ordem, qualquer que seja a ordem de entrada. Quem chama a família (`chamar`), deriva os argumentos da composição
   (`derivar`) ou aprova os pontos fica em arquivos próprios; aqui só mora o que a família declara.

   O vocabulário das portas é o do núcleo (`interfaces-montagem.js`): `tipo` é a forma da interface e `papel` é o
   papel dela. A tabela abaixo repete esse vocabulário porque o arquivo não importa nada; o teste da família a confere
   contra o núcleo. O vocabulário das ferramentas é o de `docs/mecanifica/ferramentas-por-objeto.json`, conferido do
   mesmo modo. */

export const FORMATO_FAMILIA = 'mecanifica.familia@1';
export const NIVEIS_DE_FAMILIA = Object.freeze(['componente', 'objeto']);
export const TIPOS_DE_PARAMETRO = Object.freeze(['numero', 'inteiro']);
export const UNIDADES_DE_PARAMETRO = Object.freeze(['mm', 'graus', 'contagem', 'razao']);
/* O teto de perguntas do crítico por componente da família. Repete `TETO_POR_COMPONENTE` de `perguntas-do-critico.js` porque o
   arquivo não importa nada; o teste da família confere os dois. */
export const TETO_DE_PERGUNTAS_POR_COMPONENTE = 4;

export const PAPEIS_POR_TIPO_DE_PORTA = Object.freeze({
  anel: Object.freeze(['recebe', 'ocupa']),
  cilindro: Object.freeze(['externa', 'interna']),
  padraoFuros: Object.freeze(['recebe', 'ocupa']),
  plano: Object.freeze(['recebe', 'apoia']),
  trilho: Object.freeze(['guia', 'deslizador']),
});
export const TIPOS_DE_PORTA = Object.freeze(Object.keys(PAPEIS_POR_TIPO_DE_PORTA));

/* A conferência com o esboço (`esboco.conferencia`): versão da declaração, os tipos de porta que o esboço sabe dar (anel e
   cilindro: a interface sai do volume), os lados da face do volume onde a porta fica e os tetos de tolerância, que são os do
   `REFINA` (`refinamento-global.js`; o teste confere). */
export const VERSAO_CONFERENCIA_ESBOCO = 1;
export const TIPOS_DE_PORTA_COM_VOLUME = Object.freeze(['anel', 'cilindro']);
export const LADOS_DA_PORTA_NO_VOLUME = Object.freeze(['+x', '-x', '+y', '-y', '+z', '-z']);
export const LIMITE_DA_TOLERANCIA_DO_ENVELOPE_NA_FAMILIA_MM = 50;
export const LIMITE_DA_TOLERANCIA_DA_PORTA_NA_FAMILIA_MM = 5;

export const FERRAMENTAS_DE_FAMILIA = Object.freeze([
  'aerofolio', 'arquitetura', 'arredonda', 'articula', 'atuador', 'barras', 'bobina', 'booleana', 'cabo', 'came',
  'casca', 'chapa', 'deforma', 'elos', 'encaixe', 'engrenagem', 'eixo', 'fixador', 'furos', 'gabinete', 'guia',
  'helice', 'lamina', 'loftSuave', 'manopla', 'mola', 'movel', 'nervura', 'pcb', 'perfil', 'polia', 'repete',
  'ressalto', 'rodaPneu', 'rolamento', 'rosca', 'tecido', 'texto', 'textura', 'tubulacao', 'varre', 'vedacao',
].sort());

const CAMPOS_DA_FAMILIA = ['formato', 'id', 'versao', 'nivel', 'parametros', 'restricoes', 'portas', 'ferramentas', 'perguntas', 'esboco', 'perfis'];
const CAMPOS_OPCIONAIS = ['esboco', 'perfis'];
const CAMPOS_OBRIGATORIOS = CAMPOS_DA_FAMILIA.filter((campo) => !CAMPOS_OPCIONAIS.includes(campo));
const CAMPOS_DO_PERFIL = ['descricao', 'parametros'];
/* O nome reservado da chamada: `chamar(familia, id, { perfil: 'nome', ...ajustes })` parte dos valores do perfil. */
export const PARAMETRO_DE_PERFIL = 'perfil';
const CAMPOS_DO_PARAMETRO = ['tipo', 'unidade', 'padrao', 'minimo', 'maximo', 'medio'];
const CAMPOS_DA_RESTRICAO = ['id', 'expressao', 'motivo'];
const CAMPOS_DA_PORTA = ['id', 'tipo', 'papel'];
const CAMPOS_DO_ESBOCO = ['componente', 'mapa', 'conferencia'];
const CAMPOS_DA_CONFERENCIA = ['versao', 'partes', 'portas', 'tolerancia'];
const CAMPOS_DA_PORTA_DO_ESBOCO = ['porta', 'volume', 'lado'];
const CAMPOS_DA_TOLERANCIA = ['envelope', 'porta'];

const ID_DA_FAMILIA = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const VERSAO = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const NOME_DE_PARAMETRO = /^[a-z][A-Za-z0-9]*$/;
const ID_DA_RESTRICAO = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const IDENTIFICADOR = /^[A-Za-z][A-Za-z0-9_-]*$/;
const NOME_DA_PARTE = /^[a-zA-Z][a-zA-Z0-9]*$/;
const NOME_DO_COMPONENTE = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const NOME_NO_COMPONENTE = /^[A-Za-z][A-Za-z0-9_]*$/;
const ID_DO_PERFIL = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
/* O valor do mapa do esboço: um parâmetro da família, ou o produto de dois (`a * b`), que leva duas proporções ao milímetro
   do componente (a proporção do aro vezes o diâmetro do pneu). */
const VALOR_DO_MAPA = /^([a-z][A-Za-z0-9]*)(?:\s*\*\s*([a-z][A-Za-z0-9]*))?$/;
export const parametrosDoValorDoMapa = (valor) => {
  const achado = VALOR_DO_MAPA.exec(valor);
  return achado ? [achado[1], ...(achado[2] ? [achado[2]] : [])] : null;
};

/* Funções da expressão de restrição, sobre números. Os ângulos entram em graus, como nas expressões da Oficina. */
const GRAUS = 180 / Math.PI;
const FUNCOES = Object.freeze({
  abs: { aridade: 1, calcular: (x) => Math.abs(x) },
  atan2: { aridade: 2, calcular: (y, x) => Math.atan2(y, x) * GRAUS },
  cos: { aridade: 1, calcular: (a) => Math.cos(a / GRAUS) },
  max: { aridade: 2, calcular: (a, b) => Math.max(a, b) },
  min: { aridade: 2, calcular: (a, b) => Math.min(a, b) },
  sin: { aridade: 1, calcular: (a) => Math.sin(a / GRAUS) },
  sqrt: { aridade: 1, calcular: (x) => Math.sqrt(x) },
  tan: { aridade: 1, calcular: (a) => Math.tan(a / GRAUS) },
});
const COMPARADORES = Object.freeze({
  '<': (a, b) => a < b, '<=': (a, b) => a <= b, '>': (a, b) => a > b, '>=': (a, b) => a >= b,
});

export class ErroFamilia extends Error {
  constructor({ familia = null, campo, valor, aceito }) {
    const recebido = valor === undefined ? 'nada (campo ausente)' : JSON.stringify(valor);
    super(`família${familia ? ` '${familia}'` : ''}: ${campo} recebeu ${recebido}; aceito: ${aceito}.`);
    this.name = 'ErroFamilia';
    this.campo = campo;
    this.valor = valor;
    this.aceito = aceito;
  }
}

const comparar = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const plano = (valor) => valor !== null && typeof valor === 'object' && !Array.isArray(valor);
const lista = (itens) => itens.join(', ');
const semZeroNegativo = (n) => (Object.is(n, -0) ? 0 : n);

function congelar(valor) {
  if (valor && typeof valor === 'object' && !Object.isFrozen(valor)) { Object.values(valor).forEach(congelar); Object.freeze(valor); }
  return valor;
}

/* A expressão de restrição: `soma COMPARADOR soma`, com números, nomes de parâmetro, + - * /, parênteses, menos
   unário e as funções fechadas acima. Não avalia JavaScript. Cada restrição compara uma vez; condições compostas
   viram restrições separadas, cada uma com o seu motivo. */
function tokenizar(fonte, recusar) {
  const tokens = [];
  let i = 0;
  while (i < fonte.length) {
    const c = fonte[i];
    if (/\s/.test(c)) { i += 1; continue; }
    const numero = /^\d+(?:\.\d+)?/.exec(fonte.slice(i));
    if (numero) { tokens.push({ tipo: 'numero', valor: Number(numero[0]), posicao: i }); i += numero[0].length; continue; }
    const nome = /^[A-Za-z_][A-Za-z0-9_]*/.exec(fonte.slice(i));
    if (nome) { tokens.push({ tipo: 'nome', valor: nome[0], posicao: i }); i += nome[0].length; continue; }
    const duplo = fonte.slice(i, i + 2);
    if (duplo === '<=' || duplo === '>=') { tokens.push({ tipo: 'comparador', valor: duplo, posicao: i }); i += 2; continue; }
    if (c === '<' || c === '>') { tokens.push({ tipo: 'comparador', valor: c, posicao: i }); i += 1; continue; }
    if ('+-*/(),'.includes(c)) { tokens.push({ tipo: 'simbolo', valor: c, posicao: i }); i += 1; continue; }
    recusar(`o símbolo '${c}' na posição ${i} não existe na expressão`);
  }
  return tokens;
}

function compilarExpressao(fonte, recusar) {
  const tokens = tokenizar(fonte, recusar);
  let p = 0;
  const olhar = () => tokens[p];
  const simbolo = (s) => olhar()?.tipo === 'simbolo' && olhar().valor === s;
  const esperar = (s) => { if (!simbolo(s)) recusar(`esperava '${s}' ${olhar() ? `na posição ${olhar().posicao}` : 'no fim da expressão'}`); p += 1; };
  const nomes = new Set();
  function primario() {
    const t = olhar();
    if (!t) return recusar('a expressão acaba antes de um operando');
    if (t.tipo === 'numero') { p += 1; return { no: 'numero', valor: t.valor }; }
    if (t.tipo === 'nome') {
      p += 1;
      if (simbolo('(')) {
        const funcao = FUNCOES[t.valor];
        if (!funcao) return recusar(`a função '${t.valor}' não existe; funções aceitas: ${lista(Object.keys(FUNCOES))}`);
        p += 1;
        const argumentos = [];
        if (!simbolo(')')) { do { argumentos.push(soma()); } while (simbolo(',') && (p += 1)); }
        esperar(')');
        if (argumentos.length !== funcao.aridade) return recusar(`a função '${t.valor}' pede ${funcao.aridade} argumento(s) e recebeu ${argumentos.length}`);
        return { no: 'chamada', nome: t.valor, argumentos };
      }
      nomes.add(t.valor);
      return { no: 'nome', nome: t.valor };
    }
    if (simbolo('(')) { p += 1; const interno = soma(); esperar(')'); return interno; }
    return recusar(`a posição ${t.posicao} não começa um operando ('${t.valor}')`);
  }
  function unario() {
    if (simbolo('-')) { p += 1; return { no: 'negativo', operando: unario() }; }
    return primario();
  }
  function termo() {
    let esquerda = unario();
    while (simbolo('*') || simbolo('/')) { const op = olhar().valor; p += 1; esquerda = { no: 'binario', op, esquerda, direita: unario() }; }
    return esquerda;
  }
  function soma() {
    let esquerda = termo();
    while (simbolo('+') || simbolo('-')) { const op = olhar().valor; p += 1; esquerda = { no: 'binario', op, esquerda, direita: termo() }; }
    return esquerda;
  }
  const esquerda = soma();
  if (olhar()?.tipo !== 'comparador') recusar(`falta o comparador (${lista(Object.keys(COMPARADORES))}); a restrição compara duas somas`);
  const comparador = olhar().valor;
  p += 1;
  const direita = soma();
  if (p < tokens.length) recusar(`sobra '${tokens[p].valor}' na posição ${tokens[p].posicao}; a restrição tem um só comparador`);
  return { comparador, esquerda, direita, nomes: [...nomes].sort(comparar) };
}

function calcular(no, valores) {
  if (no.no === 'numero') return no.valor;
  if (no.no === 'nome') return valores[no.nome];
  if (no.no === 'negativo') return -calcular(no.operando, valores);
  if (no.no === 'chamada') return FUNCOES[no.nome].calcular(...no.argumentos.map((a) => calcular(a, valores)));
  const a = calcular(no.esquerda, valores);
  const b = calcular(no.direita, valores);
  return no.op === '+' ? a + b : no.op === '-' ? a - b : no.op === '*' ? a * b : a / b;
}

/**
 * Avalia uma restrição (`{ id, expressao, motivo }`) sobre os valores dos parâmetros em milímetro, graus ou contagem.
 * Devolve `{ id, satisfeita, esquerda, direita, motivo }`; um lado indefinido (divisão por zero, raiz de negativo)
 * conta como não satisfeita, com `indefinida: true`. Lança `ErroFamilia` se a expressão não for válida ou se faltar
 * valor de parâmetro que ela cita.
 */
export function avaliarRestricao(restricao, valores) {
  const campo = `restricao '${restricao?.id ?? '?'}'.expressao`;
  const recusar = (aceito) => { throw new ErroFamilia({ campo, valor: restricao?.expressao, aceito }); };
  if (typeof restricao?.expressao !== 'string') recusar('texto com a expressão');
  const compilada = compilarExpressao(restricao.expressao, (problema) => recusar(`expressão válida (${problema})`));
  for (const nome of compilada.nomes) {
    if (!plano(valores) || !Number.isFinite(valores[nome])) recusar(`valor finito para o parâmetro '${nome}' em 'valores'`);
  }
  const esquerda = semZeroNegativo(calcular(compilada.esquerda, valores));
  const direita = semZeroNegativo(calcular(compilada.direita, valores));
  const indefinida = !Number.isFinite(esquerda) || !Number.isFinite(direita);
  return {
    id: restricao.id, satisfeita: !indefinida && COMPARADORES[compilada.comparador](esquerda, direita),
    esquerda, direita, ...(indefinida ? { indefinida: true } : {}), motivo: restricao.motivo,
  };
}

/**
 * Lê e normaliza uma família. Recusa com `ErroFamilia` (campo, valor recebido e o que é aceito) na primeira
 * divergência e devolve, congelada, a leitura com as mesmas chaves na mesma ordem para o mesmo conteúdo: parâmetros,
 * restrições, portas, ferramentas e perguntas em ordem alfabética. `opcoes.componentes` ({ nome: [parâmetros] })
 * deixa conferir o vínculo com o esboço contra os componentes que existem; sem ele o vínculo só é conferido contra
 * os parâmetros da própria família.
 */
export function lerFamilia(bruta, opcoes = {}) {
  let familia = plano(bruta) && typeof bruta.id === 'string' ? bruta.id : null;
  const recusar = (campo, valor, aceito) => { throw new ErroFamilia({ familia, campo, valor, aceito }); };
  const objetoCom = (valor, campo, permitidos, obrigatorios = permitidos) => {
    if (!plano(valor)) recusar(campo, valor, `objeto com os campos ${lista(obrigatorios)}`);
    for (const chave of Object.keys(valor)) if (!permitidos.includes(chave)) recusar(`${campo}.${chave}`, valor[chave], `campo conhecido (${lista(permitidos)}); '${chave}' não existe no contrato`);
    for (const chave of obrigatorios) if (!Object.hasOwn(valor, chave)) recusar(`${campo}.${chave}`, undefined, `o campo '${chave}', obrigatório`);
    return valor;
  };
  const texto = (valor, campo, padrao, aceito) => {
    if (typeof valor !== 'string' || !padrao.test(valor)) recusar(campo, valor, aceito);
    return valor;
  };
  const textoLivre = (valor, campo, descricao) => {
    if (typeof valor !== 'string' || !valor.trim()) recusar(campo, valor, `${descricao} não vazio`);
    return valor.trim();
  };
  const uma = (valor, campo, aceitos) => {
    if (!aceitos.includes(valor)) recusar(campo, valor, `um de ${lista(aceitos)}`);
    return valor;
  };

  objetoCom(bruta, 'família', CAMPOS_DA_FAMILIA, CAMPOS_OBRIGATORIOS);
  if (bruta.formato !== FORMATO_FAMILIA) recusar('formato', bruta.formato, `'${FORMATO_FAMILIA}'`);
  const id = texto(bruta.id, 'id', ID_DA_FAMILIA, 'identificador em minúsculas com hífen entre as palavras (o nome da pasta da família)');
  familia = id;
  const versao = texto(bruta.versao, 'versao', VERSAO, 'versão semântica x.y.z');
  const nivel = uma(bruta.nivel, 'nivel', NIVEIS_DE_FAMILIA);

  /* Parâmetros */
  if (!plano(bruta.parametros) || !Object.keys(bruta.parametros).length) recusar('parametros', bruta.parametros, 'objeto com ao menos um parâmetro, indexado pelo nome');
  const parametros = {};
  for (const nome of Object.keys(bruta.parametros).sort(comparar)) {
    const campo = `parametros.${nome}`;
    if (!NOME_DE_PARAMETRO.test(nome) || Object.hasOwn(FUNCOES, nome) || nome === PARAMETRO_DE_PERFIL) recusar(campo, nome, `nome começando em minúscula, só letras e dígitos, que não seja função da expressão (${lista(Object.keys(FUNCOES))}) nem '${PARAMETRO_DE_PERFIL}', o nome reservado da chamada por perfil`);
    const p = objetoCom(bruta.parametros[nome], campo, CAMPOS_DO_PARAMETRO);
    const tipo = uma(p.tipo, `${campo}.tipo`, TIPOS_DE_PARAMETRO);
    const unidade = uma(p.unidade, `${campo}.unidade`, UNIDADES_DE_PARAMETRO);
    if ((unidade === 'contagem') !== (tipo === 'inteiro')) recusar(`${campo}.tipo`, tipo, unidade === 'contagem' ? "'inteiro', porque a unidade é contagem" : `'numero', porque a unidade é ${unidade}; só contagem usa 'inteiro'`);
    const numero = (chave) => {
      const valor = p[chave];
      if (!Number.isFinite(valor)) recusar(`${campo}.${chave}`, valor, 'número finito');
      if (tipo === 'inteiro' && !Number.isInteger(valor)) recusar(`${campo}.${chave}`, valor, 'número inteiro, porque o parâmetro é uma contagem');
      return semZeroNegativo(valor);
    };
    const minimo = numero('minimo');
    const maximo = numero('maximo');
    if (!(minimo < maximo)) recusar(`${campo}.minimo`, minimo, `número menor que o máximo (${maximo}); a faixa [${minimo}, ${maximo}] está invertida ou vazia`);
    const dentro = (chave) => {
      const valor = numero(chave);
      if (valor < minimo || valor > maximo) recusar(`${campo}.${chave}`, valor, `número dentro da faixa [${minimo}, ${maximo}]`);
      return valor;
    };
    parametros[nome] = { tipo, unidade, padrao: dentro('padrao'), minimo, maximo, medio: dentro('medio') };
  }
  const nomesDosParametros = Object.keys(parametros);

  /* Restrições */
  if (!Array.isArray(bruta.restricoes)) recusar('restricoes', bruta.restricoes, 'lista de restrições (pode ser vazia)');
  const idsDeRestricao = new Set();
  const restricoes = bruta.restricoes.map((r, indice) => {
    const campo = `restricoes[${indice}]`;
    objetoCom(r, campo, CAMPOS_DA_RESTRICAO);
    const idDaRestricao = texto(r.id, `${campo}.id`, ID_DA_RESTRICAO, 'identificador em minúsculas com hífen entre as palavras');
    if (idsDeRestricao.has(idDaRestricao)) recusar(`${campo}.id`, idDaRestricao, 'id que ainda não foi usado por outra restrição');
    idsDeRestricao.add(idDaRestricao);
    const expressao = textoLivre(r.expressao, `${campo}.expressao`, 'texto com a expressão');
    const compilada = compilarExpressao(expressao, (problema) => recusar(`${campo}.expressao`, expressao, `expressão válida (${problema})`));
    for (const nome of compilada.nomes) {
      if (!nomesDosParametros.includes(nome)) recusar(`${campo}.expressao`, expressao, `só parâmetros da família; '${nome}' não existe (parâmetros: ${lista(nomesDosParametros)})`);
    }
    return { id: idDaRestricao, expressao, motivo: textoLivre(r.motivo, `${campo}.motivo`, 'texto com o motivo da recusa') };
  }).sort((a, b) => comparar(a.id, b.id));
  const pontos = { padrao: 'o padrão', medio: 'o ponto médio' };
  for (const [chave, descricao] of Object.entries(pontos)) {
    const valores = Object.fromEntries(nomesDosParametros.map((nome) => [nome, parametros[nome][chave]]));
    restricoes.forEach((restricao) => {
      const resultado = avaliarRestricao(restricao, valores);
      if (!resultado.satisfeita) {
        recusar(`restricoes['${restricao.id}'].expressao`, restricao.expressao, `expressão satisfeita por ${descricao} dos parâmetros (${lista(nomesDosParametros.map((nome) => `${nome}=${valores[nome]}`))}); aí o lado esquerdo vale ${resultado.esquerda} e o direito ${resultado.direita}`);
      }
    });
  }

  /* Portas */
  if (!Array.isArray(bruta.portas)) recusar('portas', bruta.portas, 'lista de portas publicadas (pode ser vazia)');
  const idsDePorta = new Set();
  const portas = bruta.portas.map((porta, indice) => {
    const campo = `portas[${indice}]`;
    objetoCom(porta, campo, CAMPOS_DA_PORTA, ['id']);
    const idDaPorta = texto(porta.id, `${campo}.id`, IDENTIFICADOR, 'identificador com letras, dígitos, hífen e sublinhado, começando por letra, o mesmo que a receita publica');
    if (idsDePorta.has(idDaPorta)) recusar(`${campo}.id`, idDaPorta, 'id que ainda não foi usado por outra porta');
    idsDePorta.add(idDaPorta);
    if (!Object.hasOwn(porta, 'tipo')) recusar(`${campo}.tipo`, undefined, `o tipo da porta, um de ${lista(TIPOS_DE_PORTA)}`);
    if (!TIPOS_DE_PORTA.includes(porta.tipo)) recusar(`${campo}.tipo`, porta.tipo, `um de ${lista(TIPOS_DE_PORTA)}, os tipos de porta do núcleo`);
    if (!Object.hasOwn(porta, 'papel')) recusar(`${campo}.papel`, undefined, `o papel da porta ${porta.tipo}, um de ${lista(PAPEIS_POR_TIPO_DE_PORTA[porta.tipo])}`);
    if (!PAPEIS_POR_TIPO_DE_PORTA[porta.tipo].includes(porta.papel)) recusar(`${campo}.papel`, porta.papel, `um de ${lista(PAPEIS_POR_TIPO_DE_PORTA[porta.tipo])}, os papéis da porta ${porta.tipo}`);
    return { id: idDaPorta, tipo: porta.tipo, papel: porta.papel };
  }).sort((a, b) => comparar(a.id, b.id));

  /* Ferramentas */
  if (!Array.isArray(bruta.ferramentas) || !bruta.ferramentas.length) recusar('ferramentas', bruta.ferramentas, 'lista com ao menos uma ferramenta que a família usa');
  const ferramentas = new Set();
  bruta.ferramentas.forEach((ferramenta, indice) => {
    const aceitas = opcoes.ferramentas ? [...opcoes.ferramentas].sort(comparar) : FERRAMENTAS_DE_FAMILIA;
    if (!aceitas.includes(ferramenta)) recusar(`ferramentas[${indice}]`, ferramenta, `uma ferramenta conhecida: ${lista(aceitas)}`);
    if (ferramentas.has(ferramenta)) recusar(`ferramentas[${indice}]`, ferramenta, 'ferramenta citada uma vez só');
    ferramentas.add(ferramenta);
  });

  /* Perguntas do crítico, por componente */
  if (!plano(bruta.perguntas) || !Object.keys(bruta.perguntas).length) recusar('perguntas', bruta.perguntas, 'objeto com ao menos um componente e as perguntas do crítico sobre ele');
  const perguntas = {};
  for (const componente of Object.keys(bruta.perguntas).sort(comparar)) {
    const campo = `perguntas.${componente}`;
    if (!IDENTIFICADOR.test(componente)) recusar(campo, componente, 'nome de componente com letras, dígitos, hífen e sublinhado, começando por letra');
    const itens = bruta.perguntas[componente];
    if (!Array.isArray(itens) || !itens.length) recusar(campo, itens, 'lista com ao menos uma pergunta');
    if (itens.length > TETO_DE_PERGUNTAS_POR_COMPONENTE) recusar(campo, `${itens.length} perguntas`, `no máximo ${TETO_DE_PERGUNTAS_POR_COMPONENTE} perguntas por componente; o brief do crítico cresce com cada uma, então corte as que o --medidas ou as cinco fixas já cobrem`);
    const vistas = new Set();
    perguntas[componente] = itens.map((pergunta, indice) => {
      const limpa = textoLivre(pergunta, `${campo}[${indice}]`, 'texto com a pergunta');
      if (vistas.has(limpa)) recusar(`${campo}[${indice}]`, pergunta, 'pergunta que ainda não foi feita sobre este componente');
      vistas.add(limpa);
      return limpa;
    });
  }

  /* A declaração dos pares que o esboço confere (`esboco.conferencia`): parte da família e volume do componente, porta da
     família e volume do componente com o lado da face onde ela fica, e a tolerância do `REFINA`. */
  function lerConferencia(c) {
    const base = 'esboco.conferencia';
    objetoCom(c, base, CAMPOS_DA_CONFERENCIA, ['partes', 'tolerancia']);
    if (Object.hasOwn(c, 'versao') && c.versao !== VERSAO_CONFERENCIA_ESBOCO) recusar(`${base}.versao`, c.versao, `${VERSAO_CONFERENCIA_ESBOCO}, a única versão que esta leitura conhece`);
    if (!plano(c.partes) || !Object.keys(c.partes).length) recusar(`${base}.partes`, c.partes, 'objeto { parte da família: volume do componente } com ao menos um par');
    const partes = {};
    for (const parte of Object.keys(c.partes).sort(comparar)) {
      const campo = `${base}.partes.${parte}`;
      if (!NOME_DA_PARTE.test(parte)) recusar(campo, parte, "nome de parte como o do passo 'parte': letras e dígitos, sem espaço");
      partes[parte] = texto(c.partes[parte], campo, IDENTIFICADOR, 'id de uma forma do componente do esboço (o volume), com letras, dígitos, hífen e sublinhado');
    }
    let ligadas = [];
    if (Object.hasOwn(c, 'portas')) {
      if (!Array.isArray(c.portas) || !c.portas.length) recusar(`${base}.portas`, c.portas, 'lista com ao menos uma porta ligada a volume; omita o campo se nenhuma porta é conferida');
      const vistas = new Set();
      ligadas = c.portas.map((item, indice) => {
        const campo = `${base}.portas[${indice}]`;
        objetoCom(item, campo, CAMPOS_DA_PORTA_DO_ESBOCO);
        const daFamilia = portas.find((p) => p.id === item.porta);
        if (!daFamilia) recusar(`${campo}.porta`, item.porta, `uma porta da família: ${portas.length ? lista(portas.map((p) => p.id)) : 'a família não declara porta'}`);
        if (!TIPOS_DE_PORTA_COM_VOLUME.includes(daFamilia.tipo)) recusar(`${campo}.porta`, item.porta, `porta de tipo ${lista(TIPOS_DE_PORTA_COM_VOLUME)}, os que o volume do esboço dá; '${item.porta}' é ${daFamilia.tipo}`);
        if (vistas.has(item.porta)) recusar(`${campo}.porta`, item.porta, 'porta ligada a um só volume');
        vistas.add(item.porta);
        return {
          porta: item.porta,
          volume: texto(item.volume, `${campo}.volume`, IDENTIFICADOR, 'id de uma forma do componente do esboço (o volume), com letras, dígitos, hífen e sublinhado'),
          lado: uma(item.lado, `${campo}.lado`, LADOS_DA_PORTA_NO_VOLUME),
        };
      }).sort((a, b) => comparar(a.porta, b.porta));
    }
    objetoCom(c.tolerancia, `${base}.tolerancia`, CAMPOS_DA_TOLERANCIA);
    const tolerancia = (chave, limite) => {
      const valor = c.tolerancia[chave];
      if (!Number.isFinite(valor) || valor < 0 || valor > limite) recusar(`${base}.tolerancia.${chave}`, valor, `número de 0 a ${limite} mm`);
      return semZeroNegativo(valor);
    };
    return {
      versao: VERSAO_CONFERENCIA_ESBOCO, partes, ...(ligadas.length ? { portas: ligadas } : {}),
      tolerancia: { envelope: tolerancia('envelope', LIMITE_DA_TOLERANCIA_DO_ENVELOPE_NA_FAMILIA_MM), porta: tolerancia('porta', LIMITE_DA_TOLERANCIA_DA_PORTA_NA_FAMILIA_MM) },
    };
  }

  /* Vínculo opcional com o componente do esboço */
  let esboco;
  if (Object.hasOwn(bruta, 'esboco')) {
    objetoCom(bruta.esboco, 'esboco', CAMPOS_DO_ESBOCO, ['componente', 'mapa']);
    const componente = texto(bruta.esboco.componente, 'esboco.componente', NOME_DO_COMPONENTE, 'nome do componente do esboço, em minúsculas com hífen');
    const doEsboco = opcoes.componentes ? opcoes.componentes[componente] : undefined;
    if (opcoes.componentes && !doEsboco) recusar('esboco.componente', componente, `um componente do esboço: ${lista(Object.keys(opcoes.componentes).sort(comparar))}`);
    if (!plano(bruta.esboco.mapa) || !Object.keys(bruta.esboco.mapa).length) recusar('esboco.mapa', bruta.esboco.mapa, 'objeto { parâmetro do componente: parâmetro da família } com ao menos um par');
    const mapa = {};
    for (const doComponente of Object.keys(bruta.esboco.mapa).sort(comparar)) {
      const campo = `esboco.mapa.${doComponente}`;
      if (!NOME_NO_COMPONENTE.test(doComponente)) recusar(campo, doComponente, 'nome de parâmetro do componente, com letras, dígitos e sublinhado');
      if (doEsboco && !doEsboco.includes(doComponente)) recusar(campo, doComponente, `um parâmetro do componente '${componente}': ${lista([...doEsboco].sort(comparar))}`);
      const daFamilia = bruta.esboco.mapa[doComponente];
      const citados = typeof daFamilia === 'string' ? parametrosDoValorDoMapa(daFamilia) : null;
      if (!citados || !citados.every((nome) => nomesDosParametros.includes(nome))) recusar(campo, daFamilia, `um parâmetro da família, ou o produto de dois ('a * b'), entre: ${lista(nomesDosParametros)}`);
      mapa[doComponente] = citados.join(' * ');
    }
    esboco = { componente, mapa };
    if (Object.hasOwn(bruta.esboco, 'conferencia')) esboco.conferencia = lerConferencia(bruta.esboco.conferencia);
  }

  /* Perfis: pontos nomeados da família. Cada um preenche parâmetros e a chamada `{ perfil }` parte deles; o que o perfil
     não cita fica no padrão. Um perfil é uma chamada que a família tem de aceitar, então a leitura o confere inteiro. */
  let perfis;
  if (Object.hasOwn(bruta, 'perfis')) {
    if (!plano(bruta.perfis) || !Object.keys(bruta.perfis).length) recusar('perfis', bruta.perfis, 'objeto { nome do perfil: { descricao, parametros } } com ao menos um perfil; omita o campo se a família não tem perfis');
    perfis = {};
    for (const nome of Object.keys(bruta.perfis).sort(comparar)) {
      const campo = `perfis.${nome}`;
      if (!ID_DO_PERFIL.test(nome)) recusar(campo, nome, 'identificador em minúsculas com hífen entre as palavras');
      const perfil = objetoCom(bruta.perfis[nome], campo, CAMPOS_DO_PERFIL);
      const descricao = textoLivre(perfil.descricao, `${campo}.descricao`, 'texto com o objeto que o perfil representa');
      if (!plano(perfil.parametros) || !Object.keys(perfil.parametros).length) recusar(`${campo}.parametros`, perfil.parametros, 'objeto { parâmetro da família: valor } com ao menos um parâmetro');
      const valores = {};
      for (const parametro of Object.keys(perfil.parametros).sort(comparar)) {
        const alvo = `${campo}.parametros.${parametro}`;
        if (!Object.hasOwn(parametros, parametro)) recusar(alvo, perfil.parametros[parametro], `parâmetro da família: ${lista(nomesDosParametros)}`);
        const { tipo, unidade, minimo, maximo } = parametros[parametro];
        const valor = perfil.parametros[parametro];
        if (!Number.isFinite(valor) || (tipo === 'inteiro' && !Number.isInteger(valor)) || valor < minimo || valor > maximo) {
          recusar(alvo, valor, `${tipo === 'inteiro' ? 'número inteiro' : 'número'} em ${unidade} dentro da faixa [${minimo}, ${maximo}]`);
        }
        valores[parametro] = semZeroNegativo(valor);
      }
      const completos = Object.fromEntries(nomesDosParametros.map((parametro) => [parametro, Object.hasOwn(valores, parametro) ? valores[parametro] : parametros[parametro].padrao]));
      for (const restricao of restricoes) {
        const resultado = avaliarRestricao(restricao, completos);
        if (!resultado.satisfeita) recusar(`${campo}.parametros`, valores, `parâmetros que satisfaçam a restrição '${restricao.id}' (${restricao.expressao}; o lado esquerdo vale ${resultado.esquerda} e o direito ${resultado.direita}): ${restricao.motivo}`);
      }
      perfis[nome] = { descricao, parametros: valores };
    }
  }

  return congelar({
    formato: FORMATO_FAMILIA, id, versao, nivel, parametros, restricoes, portas,
    ferramentas: [...ferramentas].sort(comparar), perguntas, ...(esboco ? { esboco } : {}), ...(perfis ? { perfis } : {}),
  });
}

/* O schema JSON da estrutura, gerado das mesmas tabelas que o validador usa. Ele confere forma e vocabulário; as
   relações (faixa, padrão dentro da faixa, restrição que cita parâmetro, padrão que viola restrição) ficam em
   `lerFamilia`, como nos outros contratos. */
const textoNaoVazio = () => ({ type: 'string', minLength: 1, pattern: '\\S' });
const objetoFechado = (properties, required = Object.keys(properties)) => ({ type: 'object', additionalProperties: false, required, properties });
const numeroDoParametro = (tipo) => ({ type: tipo === 'inteiro' ? 'integer' : 'number' });

export const SCHEMA_FAMILIA = congelar({
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: FORMATO_FAMILIA,
  ...objetoFechado({
    formato: { const: FORMATO_FAMILIA },
    id: { type: 'string', pattern: ID_DA_FAMILIA.source },
    versao: { type: 'string', pattern: VERSAO.source },
    nivel: { enum: [...NIVEIS_DE_FAMILIA] },
    parametros: {
      type: 'object', minProperties: 1, propertyNames: { pattern: NOME_DE_PARAMETRO.source },
      additionalProperties: {
        oneOf: [
          objetoFechado({
            tipo: { const: 'numero' }, unidade: { enum: UNIDADES_DE_PARAMETRO.filter((unidade) => unidade !== 'contagem') },
            padrao: numeroDoParametro('numero'), minimo: numeroDoParametro('numero'), maximo: numeroDoParametro('numero'), medio: numeroDoParametro('numero'),
          }),
          objetoFechado({
            tipo: { const: 'inteiro' }, unidade: { const: 'contagem' },
            padrao: numeroDoParametro('inteiro'), minimo: numeroDoParametro('inteiro'), maximo: numeroDoParametro('inteiro'), medio: numeroDoParametro('inteiro'),
          }),
        ],
      },
    },
    restricoes: {
      type: 'array',
      items: objetoFechado({ id: { type: 'string', pattern: ID_DA_RESTRICAO.source }, expressao: textoNaoVazio(), motivo: textoNaoVazio() }),
    },
    portas: {
      type: 'array',
      items: { oneOf: TIPOS_DE_PORTA.map((tipo) => objetoFechado({
        id: { type: 'string', pattern: IDENTIFICADOR.source }, tipo: { const: tipo }, papel: { enum: [...PAPEIS_POR_TIPO_DE_PORTA[tipo]] },
      })) },
    },
    ferramentas: { type: 'array', minItems: 1, uniqueItems: true, items: { enum: [...FERRAMENTAS_DE_FAMILIA] } },
    perguntas: {
      type: 'object', minProperties: 1, propertyNames: { pattern: IDENTIFICADOR.source },
      additionalProperties: { type: 'array', minItems: 1, maxItems: TETO_DE_PERGUNTAS_POR_COMPONENTE, uniqueItems: true, items: textoNaoVazio() },
    },
    esboco: objetoFechado({
      componente: { type: 'string', pattern: NOME_DO_COMPONENTE.source },
      mapa: {
        type: 'object', minProperties: 1, propertyNames: { pattern: NOME_NO_COMPONENTE.source },
        additionalProperties: { type: 'string', pattern: VALOR_DO_MAPA.source },
      },
      conferencia: objetoFechado({
        versao: { const: VERSAO_CONFERENCIA_ESBOCO },
        partes: {
          type: 'object', minProperties: 1, propertyNames: { pattern: NOME_DA_PARTE.source },
          additionalProperties: { type: 'string', pattern: IDENTIFICADOR.source },
        },
        portas: {
          type: 'array', minItems: 1,
          items: objetoFechado({
            porta: { type: 'string', pattern: IDENTIFICADOR.source }, volume: { type: 'string', pattern: IDENTIFICADOR.source }, lado: { enum: [...LADOS_DA_PORTA_NO_VOLUME] },
          }),
        },
        tolerancia: objetoFechado({
          envelope: { type: 'number', minimum: 0, maximum: LIMITE_DA_TOLERANCIA_DO_ENVELOPE_NA_FAMILIA_MM },
          porta: { type: 'number', minimum: 0, maximum: LIMITE_DA_TOLERANCIA_DA_PORTA_NA_FAMILIA_MM },
        }),
      }, ['partes', 'tolerancia']),
    }, ['componente', 'mapa']),
    perfis: {
      type: 'object', minProperties: 1, propertyNames: { pattern: ID_DO_PERFIL.source },
      additionalProperties: objetoFechado({
        descricao: textoNaoVazio(),
        parametros: { type: 'object', minProperties: 1, propertyNames: { pattern: NOME_DE_PARAMETRO.source }, additionalProperties: { type: 'number' } },
      }),
    },
  }, CAMPOS_OBRIGATORIOS),
});
