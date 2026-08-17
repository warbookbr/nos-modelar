/* alterar-montagem.js — alteração semântica compacta de montagem persistida.

   O ATRITO. Para mudar um número, o agente precisa devolver o documento
   inteiro. Isso custa contexto, mas o custo caro é outro: quem reenvia o
   documento todo está afirmando cada byte dele. Uma chave reordenada, um
   número rearredondado ou um campo perdido na serialização vira uma alteração
   de conteúdo que o serviço não tem como distinguir de uma alteração
   deliberada. O documento é aceito porque é VÁLIDO, não porque é o pretendido.

   Uma alteração compacta inverte isso: o agente declara o que quer mudar, o
   serviço reconstitui o documento completo a partir do que já está publicado, e
   tudo que não foi declarado permanece byte a byte igual — por construção, não
   por disciplina de quem escreveu o JSON.

   O ENDEREÇO É IDENTIDADE, NUNCA POSIÇÃO. `alvo` cita a instância ou a relação
   pelo `id` semântico dela. `campo` percorre chaves nomeadas. Um segmento
   numérico é RECUSADO: índice de array é exatamente o que o repositório proíbe
   como identidade persistida, e um JSON Patch posicional traria essa proibição
   de volta por outra porta.

   Isto NÃO edita geometria, não cria instância, não remove nada e não inventa
   campo: só troca o valor de um campo que já existe num alvo que já existe. */

export const FORMATO_ALTERACAO = 'mecanifica.alteracao-montagem';
export const VERSAO_ALTERACAO = 1;

export class ErroAlteracaoMontagem extends Error {
  constructor(codigo, mensagem, acao) {
    super(mensagem);
    this.name = 'ErroAlteracaoMontagem';
    this.codigo = codigo;
    this.acao = acao;
  }
}

const falhar = (codigo, mensagem, acao) => { throw new ErroAlteracaoMontagem(codigo, mensagem, acao); };

const ehObjeto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const copiaProfunda = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
const mesmoValor = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/* O alvo é UMA entidade nomeada. `raiz` existe para os campos do próprio
   documento; instância e relação são citadas pelo `id` que elas já publicam. */
function localizarAlvo(documento, alvo, ondeTexto) {
  const chaves = Object.keys(alvo);
  if (chaves.length !== 1) {
    falhar('alvo-invalido', `${ondeTexto}: alvo cita exatamente uma entidade — {raiz:true}, {instancia:'<id>'} ou {relacao:'<id>'}; recebido ${JSON.stringify(alvo)}`, 'Declare um alvo por alteração.');
  }
  const [tipo] = chaves;
  if (tipo === 'raiz') {
    if (alvo.raiz !== true) falhar('alvo-invalido', `${ondeTexto}: {raiz} só aceita true`, 'Use {raiz:true} para os campos do próprio documento.');
    return { objeto: documento, descricao: 'raiz' };
  }
  if (tipo !== 'instancia' && tipo !== 'relacao') {
    falhar('alvo-invalido', `${ondeTexto}: '${tipo}' não é um tipo de alvo; use raiz, instancia ou relacao`, 'Corrija o alvo da alteração.');
  }
  const lista = tipo === 'instancia' ? documento.instancias : documento.relacoes;
  const id = alvo[tipo];
  if (typeof id !== 'string' || !id) falhar('alvo-invalido', `${ondeTexto}: ${tipo} precisa do id semântico como string`, 'Cite a entidade pelo id que ela publica.');
  const achado = Array.isArray(lista) ? lista.find((item) => item?.id === id) : undefined;
  if (!achado) {
    const disponiveis = (Array.isArray(lista) ? lista : []).map((item) => `'${item?.id}'`).join(', ');
    falhar('alvo-nao-encontrado', `${ondeTexto}: não há ${tipo} com id '${id}'${disponiveis ? `; os ids deste documento são ${disponiveis}` : ' — o documento não declara nenhuma'}`, 'Leia o documento ativo e cite um id existente.');
  }
  return { objeto: achado, descricao: `${tipo} '${id}'` };
}

/* O caminho é uma sequência de chaves NOMEADAS. Percorrer só o que já existe é
   o que impede a alteração de inventar contrato: criar `pose` numa instância
   que não tem pose seria acrescentar capacidade por atalho, sem passar pelo
   formato. */
function percorrerCampo(objeto, campo, ondeTexto) {
  if (typeof campo !== 'string' || campo.trim() === '') {
    falhar('campo-invalido', `${ondeTexto}: campo precisa ser o nome do que muda, como 'pose.deslocamento'`, 'Declare o campo semântico da alteração.');
  }
  const partes = campo.split('.');
  let atual = objeto;
  for (let k = 0; k < partes.length; k++) {
    const parte = partes[k];
    if (parte === '') falhar('campo-invalido', `${ondeTexto}: o campo '${campo}' tem segmento vazio`, 'Use nomes separados por ponto, sem ponto duplo.');
    if (/^\d+$/.test(parte)) {
      falhar('campo-posicional', `${ondeTexto}: o campo '${campo}' usa o índice '${parte}' como endereço, e índice de array não é identidade neste repositório — troque o valor inteiro do campo que contém a lista, ou cite a entidade pelo id dela`, 'Enderece por identidade, nunca por posição.');
    }
    if (!ehObjeto(atual) || !Object.hasOwn(atual, parte)) {
      const existentes = ehObjeto(atual) ? Object.keys(atual).map((c) => `'${c}'`).join(', ') : '(o caminho chegou a um valor que não é objeto)';
      falhar('campo-inexistente', `${ondeTexto}: '${partes.slice(0, k + 1).join('.')}' não existe no alvo; os campos disponíveis aí são ${existentes}`, 'Alteração troca valor de campo existente; ela não cria campo nem capacidade nova.');
    }
    if (k === partes.length - 1) return { dono: atual, chave: parte };
    atual = atual[parte];
  }
  return null;   // inalcançável: o laço sempre retorna na última parte
}

/**
 * Aplica alterações endereçadas por identidade a um documento de montagem.
 * Não valida o formato resultante — quem chama segue pelo leitor/validador
 * de sempre, que é a autoridade sobre o contrato.
 *
 * @returns {{montagem: object, diff: Array<{alvo: string, campo: string, de: any, para: any}>}}
 */
export function alterarMontagem(documento, alteracoes) {
  if (!ehObjeto(documento)) {
    falhar('documento-invalido', 'A alteração precisa de um documento de montagem para partir', 'Leia a revisão ativa antes de alterar.');
  }
  if (!Array.isArray(alteracoes) || alteracoes.length === 0) {
    falhar('alteracoes-vazias', 'A lista de alterações está vazia: uma proposta que não muda nada seria publicada como revisão sem conteúdo', 'Declare ao menos uma alteração, ou não publique.');
  }

  const novo = copiaProfunda(documento);
  const diff = [];
  const jaTocados = new Set();

  for (let k = 0; k < alteracoes.length; k++) {
    const alteracao = alteracoes[k];
    const onde = `alteracoes[${k}]`;
    if (!ehObjeto(alteracao)) falhar('alteracao-invalida', `${onde} precisa ser {alvo, campo, valor}`, 'Corrija a forma da alteração.');
    const chaves = Object.keys(alteracao).sort().join(',');
    if (chaves !== 'alvo,campo,valor') {
      falhar('alteracao-invalida', `${onde} usa exatamente alvo, campo e valor; recebido ${Object.keys(alteracao).join(', ') || '(nada)'}`, 'Corrija a forma da alteração.');
    }
    if (!ehObjeto(alteracao.alvo)) falhar('alvo-invalido', `${onde}: alvo precisa ser um objeto`, 'Use {instancia:"<id>"}, {relacao:"<id>"} ou {raiz:true}.');

    const { objeto, descricao } = localizarAlvo(novo, alteracao.alvo, onde);
    const { dono, chave } = percorrerCampo(objeto, alteracao.campo, onde);

    /* Duas alterações sobre o mesmo endereço tornam o resultado dependente da
       ordem da lista — e ordem de lista é posição, que é o que este módulo
       existe para não usar como significado. */
    const endereco = `${descricao}::${alteracao.campo}`;
    if (jaTocados.has(endereco)) {
      falhar('alteracao-duplicada', `${onde}: ${descricao} já teve '${alteracao.campo}' alterado nesta proposta; duas alterações no mesmo endereço fariam o resultado depender da ordem da lista`, 'Declare uma alteração por endereço, já com o valor final.');
    }
    jaTocados.add(endereco);

    const anterior = dono[chave];
    if (mesmoValor(anterior, alteracao.valor)) {
      falhar('alteracao-sem-efeito', `${onde}: ${descricao} já tem '${alteracao.campo}' igual ao valor proposto (${JSON.stringify(anterior)}); uma alteração sem efeito publica uma revisão que afirma uma mudança que não houve`, 'Remova a alteração, ou proponha o valor que de fato muda.');
    }

    dono[chave] = copiaProfunda(alteracao.valor);
    diff.push({ alvo: descricao, campo: alteracao.campo, de: copiaProfunda(anterior), para: copiaProfunda(alteracao.valor) });
  }

  return { montagem: novo, diff };
}

/* ---- O CAMINHO INVERSO: a diferença entre duas revisões ----

   Ler uma diferença e escrever uma alteração passam a falar a MESMA língua:
   `{alvo, campo, de, para}`. Um agente que leu "instancia 'movel' ::
   pose.deslocamento: de X para Y" já sabe escrever a alteração que desfaz isso,
   sem traduzir formato nenhum no meio.

   A HONESTIDADE QUE ESTA FUNÇÃO PRECISA TER. Nem toda diferença é expressável
   como alteração: acrescentar ou remover uma instância muda a estrutura, e
   `alterarMontagem` só troca valor de campo existente. Devolver tudo numa lista
   só faria o agente acreditar que qualquer diferença pode ser desfeita com uma
   alteração — e ele descobriria o contrário no meio de uma correção. Por isso as
   duas saem separadas, e `estruturais` diz explicitamente o que a alteração não
   alcança. */

function ehFolha(v) { return !ehObjeto(v); }

function comparar(antes, depois, prefixo, alvo, saida) {
  const chaves = new Set([...Object.keys(antes ?? {}), ...Object.keys(depois ?? {})]);
  for (const chave of chaves) {
    const caminho = prefixo ? `${prefixo}.${chave}` : chave;
    const a = antes?.[chave];
    const b = depois?.[chave];
    if (mesmoValor(a, b)) continue;
    /* Lista é comparada INTEIRA, e não item a item, pela mesma razão que a
       alteração recusa índice: posição não é endereço. */
    if (ehFolha(a) || ehFolha(b)) { saida.push({ alvo, campo: caminho, de: copiaProfunda(a), para: copiaProfunda(b) }); continue; }
    comparar(a, b, caminho, alvo, saida);
  }
}

function porId(lista) {
  const mapa = new Map();
  for (const item of Array.isArray(lista) ? lista : []) if (item && typeof item.id === 'string') mapa.set(item.id, item);
  return mapa;
}

/**
 * Diferença semântica entre dois documentos de montagem.
 * @returns {{alteracoes: Array<{alvo,campo,de,para}>, estruturais: Array<{tipo,alvo}>}}
 */
export function diferencaMontagem(antes, depois) {
  if (!ehObjeto(antes) || !ehObjeto(depois)) {
    falhar('documento-invalido', 'A comparação precisa de dois documentos de montagem', 'Leia as duas revisões antes de comparar.');
  }
  const alteracoes = [];
  const estruturais = [];

  const semListas = (d) => { const { instancias, relacoes, ...resto } = d; return resto; };
  comparar(semListas(antes), semListas(depois), '', 'raiz', alteracoes);

  for (const [tipo, chave] of [['instancia', 'instancias'], ['relacao', 'relacoes']]) {
    const a = porId(antes[chave]);
    const b = porId(depois[chave]);
    for (const id of a.keys()) if (!b.has(id)) estruturais.push({ tipo: `${tipo}-removida`, alvo: `${tipo} '${id}'` });
    for (const id of b.keys()) if (!a.has(id)) estruturais.push({ tipo: `${tipo}-acrescentada`, alvo: `${tipo} '${id}'` });
    for (const [id, item] of a) if (b.has(id)) comparar(item, b.get(id), '', `${tipo} '${id}'`, alteracoes);
  }

  return { alteracoes, estruturais };
}
