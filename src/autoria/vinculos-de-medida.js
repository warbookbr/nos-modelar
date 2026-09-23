/* vinculos-de-medida.js — o grafo de "esta medida vem daquela porta" dentro de
   uma montagem, e a ordem de construção que ele impõe.

   POR QUE EXISTE. Até a montagem v4, cada peça trazia os próprios números e as
   relações só conferiam no fim se eles batiam: a bucha tinha o furo que alguém
   digitou, e não o do eixo que existe. Na v5 uma instância declara que um
   parâmetro da receita dela é a medida de uma porta de outra instância mais um
   acréscimo explícito, e a montagem declara em que ordem as instâncias são
   construídas. A peça nasce encaixada na vizinha que já está pronta.

   Este módulo é puro: não carrega peça nem executa receita. Ele valida a forma
   dos vínculos, recusa ciclo e recusa vínculo que aponte para instância ainda
   não construída na ordem declarada. Se a porta e a medida existem é pergunta
   do resolvedor, que tem a peça em mãos. */

/* As medidas escalares que as interfaces de porta publicam, em
   `interfaces-montagem.js`: cilindro tem raio, início e fim; anel tem raio
   interno, raio externo, início e fim. Vetores (eixo, centro) ficam de fora:
   um parâmetro de receita vinculado é um número. */
export const MEDIDAS_DE_PORTA = Object.freeze(['fim', 'inicio', 'raio', 'raioExterno', 'raioInterno']);

export class ErroVinculoDeMedida extends Error {
  constructor(codigo, caminho, mensagem) {
    super(`${caminho}: ${mensagem}`);
    this.name = 'ErroVinculoDeMedida';
    this.codigo = codigo;
    this.caminho = caminho;
  }
}

function falhar(codigo, caminho, mensagem) {
  throw new ErroVinculoDeMedida(codigo, caminho, mensagem);
}

function objetoSimples(valor) {
  return valor !== null && typeof valor === 'object' && !Array.isArray(valor)
    && Object.getPrototypeOf(valor) === Object.prototype;
}

function chavesExatas(valor, permitidas, caminho) {
  const extras = Object.keys(valor).filter((chave) => !permitidas.includes(chave));
  if (extras.length) falhar('chave-desconhecida', caminho, `chave(s) desconhecida(s): ${extras.sort().join(', ')}.`);
}

function texto(valor, caminho) {
  if (typeof valor !== 'string' || !valor) falhar('vinculo-invalido', caminho, 'precisa ser texto não vazio.');
  return valor;
}

function comparar(a, b) { return a < b ? -1 : a > b ? 1 : 0; }

/* Lê `etapas`: a lista das instâncias na ordem em que são construídas. Toda
   instância aparece uma vez; uma instância fora da lista não teria lugar na
   construção, e isso é recusado em vez de adivinhado. */
export function lerEtapas(valor, instanciaIds) {
  if (!Array.isArray(valor) || valor.length === 0) {
    falhar('etapas-invalidas', 'etapas', 'precisa ser lista não vazia com a ordem de construção.');
  }
  const vistas = new Set();
  const etapas = valor.map((id, indice) => {
    const nome = texto(id, `etapas[${indice}]`);
    if (!instanciaIds.has(nome)) falhar('etapas-invalidas', `etapas[${indice}]`, `instância '${nome}' não existe na montagem.`);
    if (vistas.has(nome)) falhar('etapas-invalidas', `etapas[${indice}]`, `instância '${nome}' repetida.`);
    vistas.add(nome);
    return nome;
  });
  const faltando = [...instanciaIds].filter((id) => !vistas.has(id)).sort();
  if (faltando.length) falhar('etapas-invalidas', 'etapas', `instância(s) sem etapa: ${faltando.join(', ')}.`);
  return etapas;
}

function lerVinculo(valor, indice, instancias) {
  const caminho = `vinculos[${indice}]`;
  if (!objetoSimples(valor)) falhar('vinculo-invalido', caminho, 'precisa ser objeto simples.');
  chavesExatas(valor, ['id', 'alvo', 'de', 'acrescimo'], caminho);
  const id = texto(valor.id, `${caminho}.id`);

  if (!objetoSimples(valor.alvo)) falhar('vinculo-invalido', `${caminho}.alvo`, 'precisa ser objeto simples.');
  chavesExatas(valor.alvo, ['instancia', 'param'], `${caminho}.alvo`);
  const alvoInstancia = texto(valor.alvo.instancia, `${caminho}.alvo.instancia`);
  const param = texto(valor.alvo.param, `${caminho}.alvo.param`);
  const alvo = instancias.get(alvoInstancia);
  if (!alvo) falhar('vinculo-invalido', `${caminho}.alvo.instancia`, `instância '${alvoInstancia}' não existe na montagem.`);
  /* Só peça tem receita com parâmetros; uma submontagem não tem onde receber
     o valor. */
  if (alvo.alvo.tipo !== 'peca') falhar('vinculo-invalido', `${caminho}.alvo.instancia`, 'o alvo de um vínculo precisa ser peça.');

  if (!objetoSimples(valor.de)) falhar('vinculo-invalido', `${caminho}.de`, 'precisa ser objeto simples.');
  chavesExatas(valor.de, ['instancia', 'porta', 'medida'], `${caminho}.de`);
  const deInstancia = texto(valor.de.instancia, `${caminho}.de.instancia`);
  if (!instancias.has(deInstancia)) falhar('vinculo-invalido', `${caminho}.de.instancia`, `instância '${deInstancia}' não existe na montagem.`);
  if (instancias.get(deInstancia).alvo.tipo !== 'peca') falhar('vinculo-invalido', `${caminho}.de.instancia`, 'a origem de um vínculo precisa ser peça.');
  if (deInstancia === alvoInstancia) falhar('vinculo-ciclo', caminho, `a instância '${deInstancia}' não pode derivar de si mesma.`);
  const porta = texto(valor.de.porta, `${caminho}.de.porta`);
  const medida = texto(valor.de.medida, `${caminho}.de.medida`);
  if (!MEDIDAS_DE_PORTA.includes(medida)) {
    falhar('vinculo-invalido', `${caminho}.de.medida`, `aceita somente ${MEDIDAS_DE_PORTA.join(', ')}.`);
  }

  /* O acréscimo é obrigatório e explícito, mesmo quando é zero: folga e
     sobreposição são decisões, e um vínculo sem elas esconderia a decisão. */
  if (!Number.isFinite(valor.acrescimo)) falhar('vinculo-invalido', `${caminho}.acrescimo`, 'precisa ser número finito, mesmo que zero.');
  const acrescimo = Object.is(valor.acrescimo, -0) ? 0 : valor.acrescimo;
  return { id, alvo: { instancia: alvoInstancia, param }, de: { instancia: deInstancia, porta, medida }, acrescimo };
}

/* Ordem topológica pelos vínculos, com desempate alfabético para ser
   determinística. Recusa ciclo nomeando as instâncias envolvidas. */
export function ordemPorVinculos(vinculos, instanciaIds) {
  const dependencias = new Map([...instanciaIds].map((id) => [id, new Set()]));
  for (const vinculo of vinculos) dependencias.get(vinculo.alvo.instancia).add(vinculo.de.instancia);
  const ordem = [];
  const pendentes = new Set(instanciaIds);
  while (pendentes.size) {
    const prontas = [...pendentes].filter((id) => [...dependencias.get(id)].every((dep) => !pendentes.has(dep))).sort(comparar);
    if (!prontas.length) {
      falhar('vinculo-ciclo', 'vinculos', `ciclo entre as instâncias: ${[...pendentes].sort().join(', ')}.`);
    }
    ordem.push(prontas[0]);
    pendentes.delete(prontas[0]);
  }
  return ordem;
}

/* Lê os vínculos de uma montagem v5 contra as instâncias e a ordem declarada.
   `instancias` é a lista já lida pela montagem. */
export function lerVinculos(valor, instancias, etapas) {
  if (!Array.isArray(valor)) falhar('vinculo-invalido', 'vinculos', 'precisa ser lista, mesmo que vazia.');
  const porId = new Map(instancias.map((instancia) => [instancia.id, instancia]));
  const vinculos = valor.map((item, indice) => lerVinculo(item, indice, porId));
  const ids = new Set();
  const destinos = new Set();
  for (const [indice, vinculo] of vinculos.entries()) {
    if (ids.has(vinculo.id)) falhar('vinculo-duplicado', `vinculos[${indice}].id`, `ID '${vinculo.id}' duplicado.`);
    ids.add(vinculo.id);
    /* Um parâmetro com duas origens teria dois valores; recusar é a única
       leitura que não escolhe um deles em silêncio. */
    const destino = `${vinculo.alvo.instancia}.${vinculo.alvo.param}`;
    if (destinos.has(destino)) falhar('vinculo-duplicado', `vinculos[${indice}].alvo`, `o parâmetro '${destino}' já tem origem.`);
    destinos.add(destino);
  }
  ordemPorVinculos(vinculos, new Set(porId.keys()));
  const posicao = new Map(etapas.map((id, indice) => [id, indice]));
  for (const [indice, vinculo] of vinculos.entries()) {
    if (posicao.get(vinculo.de.instancia) > posicao.get(vinculo.alvo.instancia)) {
      falhar('vinculo-fora-de-ordem', `vinculos[${indice}]`,
        `'${vinculo.alvo.instancia}' deriva de '${vinculo.de.instancia}', que só é construída depois nas etapas.`);
    }
  }
  return vinculos.sort((a, b) => comparar(a.id, b.id));
}
