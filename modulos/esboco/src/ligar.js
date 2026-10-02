/* `ligar`: a forma criada entre duas âncoras. `{ "id": "h", "ligar": { "de": "A.topo", "para": "B.base", "tipo": "haste",
   "diametro": 8 } }` vira a forma comum que já sabe se estender entre dois pontos (`haste`: cilindro com `de`/`para`; `tubo`:
   tubo de dois pontos; `cinta`: caixa com `de`/`para`, de `largura` por `espessura`), com a marca `daLigacao: { de, para,
   tipo }` para o conserto, o `--ligacoes` e a mensagem de erro. Como `de` e `para` são referências, a ligação acompanha as
   duas âncoras quando um parâmetro as muda. Puro: não lê nem grava arquivo. */
import { ErroDeEsboco, nomesDeAncoras } from './index.js';
import { quisDizer } from './parecido.js';

export const TIPOS_DE_LIGACAO = ['haste', 'tubo', 'cinta'];
const CHAVES_DA_LIGACAO = ['de', 'para', 'tipo', 'diametro', 'largura', 'espessura'];
const CAMPOS_DA_FORMA = ['id', 'ligar', 'cor', 'rotulo', 'oculto', 'opacidade', 'unidade', 'ponta', 'estilo', 'desloca', 'substitui', 'linhaCentro', 'ocultar', 'lado'];
const EXEMPLO = '{ "id": "haste1", "ligar": { "de": "A.topo", "para": "B.base", "tipo": "haste", "diametro": 8 } }';
const objeto = (v) => v && typeof v === 'object' && !Array.isArray(v);
const exigir = (cond, msg) => { if (!cond) throw new ErroDeEsboco(msg); };

/* A forma comum que uma entrada `ligar` representa. */
export function traduzirLigacao(f, onde) {
  const rotulo = `${onde}, ligar "${f.id}"`;
  exigir(typeof f.id === 'string' && f.id, `${onde}: uma entrada "ligar" precisa de "id". Exemplo: ${EXEMPLO}`);
  exigir(objeto(f.ligar), `${rotulo}: "ligar" deve ser { "de": "<id>.<ancora>", "para": "<id>.<ancora>", "tipo": "haste" | "tubo" | "cinta", ... }. Exemplo: ${EXEMPLO}`);
  const l = f.ligar;
  for (const k of Object.keys(f)) exigir(CAMPOS_DA_FORMA.includes(k), `${rotulo}: a ligação se posiciona pelas duas âncoras; o campo "${k}" não vale aqui${quisDizer(k, CAMPOS_DA_FORMA)} (campos: ${CAMPOS_DA_FORMA.join(', ')})`);
  for (const k of Object.keys(l)) exigir(CHAVES_DA_LIGACAO.includes(k), `${rotulo}: "ligar" não tem o campo "${k}"${quisDizer(k, CHAVES_DA_LIGACAO)} (campos: ${CHAVES_DA_LIGACAO.join(', ')}). Exemplo: ${EXEMPLO}`);
  const tipo = l.tipo ?? 'haste';
  exigir(TIPOS_DE_LIGACAO.includes(tipo), `${rotulo}: "tipo" com o valor ${JSON.stringify(tipo)} deve ser um de ${TIPOS_DE_LIGACAO.join(', ')}${quisDizer(String(tipo), TIPOS_DE_LIGACAO)}`);
  exigir(l.de !== undefined && l.para !== undefined, `${rotulo}: faltam "de" e "para", as duas âncoras que a ligação une. Exemplo: ${EXEMPLO}`);
  const secao = tipo === 'cinta' ? ['largura', 'espessura'] : ['diametro'];
  for (const k of secao) exigir(l[k] !== undefined, `${rotulo}: ${tipo === 'cinta' ? 'a cinta' : tipo === 'tubo' ? 'o tubo' : 'a haste'} precisa de "${k}" em mm, o nome de um parâmetro ou "=expressão"`);
  for (const k of ['diametro', 'largura', 'espessura'].filter((c) => !secao.includes(c))) exigir(l[k] === undefined, `${rotulo}: "${k}" não vale ${tipo === 'cinta' ? 'na cinta (use "largura" e "espessura")' : `${tipo === 'tubo' ? 'no tubo' : 'na haste'} (use "diametro")`}`);
  const { ligar, ...resto } = f;
  void ligar;
  const base = { id: resto.id };
  const forma = tipo === 'cinta'
    ? { ...base, tipo: 'caixa', largura: l.largura, profundidade: l.espessura, de: l.de, para: l.para }
    : tipo === 'tubo'
      ? { ...base, tipo: 'tubo', diametro: l.diametro, caminho: [l.de, l.para] }
      : { ...base, tipo: 'cilindro', diametro: l.diametro, de: l.de, para: l.para };
  const { id, ...extras } = resto;
  void id;
  return { ...forma, ...extras, daLigacao: { de: l.de, para: l.para, tipo } };
}

/* A lista de formas com cada entrada `ligar` trocada pela forma comum. */
export function traduzirLigacoes(formas, onde) {
  return Array.isArray(formas) ? formas.map((f) => (objeto(f) && f.ligar !== undefined ? traduzirLigacao(f, onde) : f)) : formas;
}

/* Depois da expansão: toda ponta de ligação aponta para uma forma que existe e para uma âncora que ela tem, ou para um ponto
   nomeado. Os erros dizem a ligação, o campo, a referência escrita e o que vale. `formas` é a lista final da opção. */
export function validarLigacoes(formas, onde, nomesDePontos = []) {
  const porId = new Map(formas.filter((f) => objeto(f) && typeof f.id === 'string').map((f) => [f.id, f]));
  for (const f of formas) {
    if (!objeto(f) || !objeto(f.daLigacao)) continue;
    for (const campo of ['de', 'para']) {
      const escrito = f.daLigacao[campo];
      const atual = f.tipo === 'tubo' ? f.caminho[campo === 'de' ? 0 : f.caminho.length - 1] : f[campo];
      if (typeof atual !== 'string' || nomesDePontos.includes(atual)) continue;
      const i = atual.lastIndexOf('.');
      const rotulo = `${onde}: ligar "${f.id}": "${campo}"`;
      exigir(i > 0, `${rotulo} com o valor ${JSON.stringify(escrito)} deve ser "<id>.<ancora>", um ponto nomeado (${nomesDePontos.join(', ') || 'nenhum declarado'}) ou [x, y, z]`);
      const id = atual.slice(0, i);
      const alvo = porId.get(id);
      exigir(alvo, `${rotulo} aponta para ${JSON.stringify(escrito)}, mas não há forma nem instância "${escrito.slice(0, escrito.indexOf('.') > 0 ? escrito.indexOf('.') : undefined)}" nesta opção${quisDizer(id, [...porId.keys()])} (ids: ${[...porId.keys()].join(', ')})`);
      if (alvo.tipo === undefined) continue;
      const validas = nomesDeAncoras(alvo.tipo, alvo);
      exigir(validas.includes(atual.slice(i + 1)), `${rotulo} aponta para ${JSON.stringify(escrito)}, mas a forma "${id}" (${alvo.tipo}) não tem a âncora "${atual.slice(i + 1)}"${quisDizer(atual.slice(i + 1), validas)} (âncoras: ${validas.join(', ')})`);
    }
  }
}
