/* `--editar`: a versão mínima da linguagem incremental. Muda, remove ou acrescenta formas no JSON declarado sem regravar o
   arquivo à mão: `<forma>.<campo>=<valor>` (também `<forma>.<campo>.<sub>` e o índice `centro[1]`), `--remover <forma>` e
   `--adicionar <json-da-forma>`. O valor é JSON (número, texto entre aspas, lista, objeto, true, false), ou "=expressão"
   (fica como texto, e a expressão continua viva), ou um texto simples sem aspas; `null` retira o campo. Puro: não lê nem
   grava arquivo, não muda o que recebe e não valida a geometria (quem chama roda a leitura e só grava se ela resolve). */
import { ErroDeEsboco } from './index.js';
import { quisDizer } from './parecido.js';

const objeto = (v) => v && typeof v === 'object' && !Array.isArray(v);
const clone = (v) => JSON.parse(JSON.stringify(v));
const exigir = (cond, msg) => { if (!cond) throw new ErroDeEsboco(msg); };
const texto = (v) => JSON.stringify(v) ?? 'nenhum';

/* O valor escrito na linha de comando: "=a+b" fica texto, JSON válido vira o valor, o resto é texto simples. */
export function lerValor(bruto) {
  const s = String(bruto);
  if (s.startsWith('=')) return s;
  try { return JSON.parse(s); } catch { return s; }
}

/* As listas de formas que a edição alcança: a da raiz, ou, sem ela, a de cada opção que tem a sua. */
function listasDeFormas(esboco) {
  if (Array.isArray(esboco.formas)) return [{ lista: esboco.formas, onde: 'a lista de formas da raiz' }];
  const listas = (esboco.opcoes ?? []).flatMap((o, i) => (objeto(o) && Array.isArray(o.formas) ? [{ lista: o.formas, onde: `a lista de formas da opção ${i + 1}` }] : []));
  exigir(listas.length > 0, 'o esboço não tem lista de formas (nem na raiz nem nas opções) para editar');
  return listas;
}

const idsDe = (lista) => lista.filter((f) => objeto(f) && typeof f.id === 'string').map((f) => f.id);

/* Separa "<forma>.<campo>..." em id e caminho do campo. O id pode ter pontos ("rodaFrente.pneu"): vale o maior prefixo que
   é uma forma declarada. */
function separar(chave, ids) {
  const partes = chave.split('.');
  for (let k = partes.length - 1; k >= 1; k--) {
    const id = partes.slice(0, k).join('.');
    if (ids.includes(id)) return { id, campo: partes.slice(k).join('.') };
  }
  return null;
}

/* "centro[1]" e "encosta.folga" em passos: ["centro", 1] e ["encosta", "folga"]. */
function passos(campo, onde) {
  const lista = [];
  for (const m of campo.matchAll(/([^.[\]]+)|\[(\d+)\]/g)) lista.push(m[2] !== undefined ? Number(m[2]) : m[1]);
  exigir(lista.length > 0 && typeof lista[0] === 'string' && campo.replace(/([^.[\]]+)|\[\d+\]|\./g, '') === '', `${onde}: "${campo}" não é um caminho de campo (use campo, campo.sub ou campo[indice], por exemplo "centro[1]" ou "encosta.folga")`);
  return lista;
}

function gravar(forma, caminho, valor, onde) {
  let alvo = forma;
  for (let i = 0; i < caminho.length - 1; i++) {
    const p = caminho[i];
    const proximo = caminho[i + 1];
    if (alvo[p] === undefined || alvo[p] === null) {
      exigir(typeof proximo === 'string', `${onde}: "${caminho.slice(0, i + 1).join('.')}" não existe, e um índice só edita uma lista que já existe`);
      alvo[p] = {};
    }
    alvo = alvo[p];
    exigir(typeof alvo === 'object', `${onde}: "${caminho.slice(0, i + 1).join('.')}" vale ${texto(alvo)}, que não tem sub-campos nem índices`);
  }
  const ultimo = caminho[caminho.length - 1];
  const antes = alvo[ultimo];
  if (typeof ultimo === 'number') {
    exigir(Array.isArray(alvo), `${onde}: o índice [${ultimo}] só vale numa lista`);
    exigir(ultimo < alvo.length, `${onde}: o índice [${ultimo}] está fora da lista, que tem ${alvo.length} ${alvo.length === 1 ? 'item' : 'itens'} (índices de 0 a ${alvo.length - 1})`);
    exigir(valor !== null, `${onde}: não dá para retirar um item de uma lista por índice; reescreva a lista inteira`);
    alvo[ultimo] = valor;
  } else {
    exigir(!Array.isArray(alvo), `${onde}: "${ultimo}" não vale numa lista; use um índice, como [0]`);
    if (valor === null) delete alvo[ultimo]; else alvo[ultimo] = valor;
  }
  return antes;
}

/* Aplica as edições em ordem (atribuições, remoções, acréscimos) numa cópia do esboço bruto. `atribuicoes` são textos
   "<forma>.<campo>=<valor>", `remover` uma lista de ids, `adicionar` uma lista de formas (objetos ou JSON em texto).
   Devolve { esboco, mudancas: [{ acao, forma, campo?, antes?, depois?, listas }] }. */
export function editarEsboco(bruto, { atribuicoes = [], remover = [], adicionar = [] } = {}) {
  exigir(objeto(bruto), 'editar: o esboço deve ser um objeto JSON');
  const esboco = clone(bruto);
  const listas = listasDeFormas(esboco);
  const mudancas = [];
  for (const a of atribuicoes) {
    const i = String(a).indexOf('=');
    exigir(i > 0, `editar: "${a}" não é <forma>.<campo>=<valor> (por exemplo tanque.cor=azul, garfoE.centro[1]=450 ou banco.largura="=larguraBanco*2")`);
    const chave = a.slice(0, i);
    const valor = lerValor(a.slice(i + 1));
    const todos = [...new Set(listas.flatMap((l) => idsDe(l.lista)))];
    const s = separar(chave, todos);
    if (!s) {
      const id = chave.split('.')[0];
      exigir(false, `editar: "${chave}" não começa por uma forma declarada${quisDizer(id, todos)} (formas declaradas: ${todos.slice(0, 40).join(', ')}${todos.length > 40 ? `, e mais ${todos.length - 40}` : ''}); uma peça de componente (instância.parte) se muda pela instância`);
    }
    exigir(s.campo !== '', `editar: "${chave}" cita só a forma "${s.id}": diga o campo (${s.id}.<campo>=<valor>)`);
    const caminho = passos(s.campo, `editar: "${chave}"`);
    exigir(caminho[0] !== 'id', 'editar: o id é a identidade da forma e não se troca por --editar (remova a forma e adicione outra)');
    let antes;
    for (const { lista } of listas) {
      const f = lista.find((x) => objeto(x) && x.id === s.id);
      if (f) antes = gravar(f, caminho, valor, `editar: "${chave}"`);
    }
    mudancas.push({ acao: 'editar', forma: s.id, campo: s.campo, antes: antes ?? null, depois: valor });
  }
  /* `--remover a,b`: uma lista separada por vírgula vale como duas chamadas */
  const aRemover = (Array.isArray(remover) ? remover : [remover]).flatMap((x) => String(x).split(',').map((id) => id.trim()).filter(Boolean));
  for (const id of aRemover) {
    const todos = [...new Set(listas.flatMap((l) => idsDe(l.lista)))];
    exigir(todos.includes(id), `editar: --remover "${id}": não há forma com esse id${quisDizer(id, todos)} (formas declaradas: ${todos.slice(0, 40).join(', ')}${todos.length > 40 ? `, e mais ${todos.length - 40}` : ''})`);
    for (const { lista } of listas) {
      const k = lista.findIndex((x) => objeto(x) && x.id === id);
      if (k >= 0) lista.splice(k, 1);
    }
    mudancas.push({ acao: 'remover', forma: id });
  }
  for (const entrada of adicionar) {
    let nova = entrada;
    if (typeof entrada === 'string') {
      try { nova = JSON.parse(entrada); } catch (e) { throw new ErroDeEsboco(`editar: --adicionar precisa do JSON de uma forma (por exemplo '{"id":"farol","tipo":"esfera","diametro":120,"centro":[0,0,0]}'): ${e.message}`); }
    }
    for (const f of Array.isArray(nova) ? nova : [nova]) {
      exigir(objeto(f), 'editar: --adicionar recebe um objeto de forma (ou uma lista deles)');
      if (f.id === undefined && f.arranja !== undefined) {
        /* a entrada de arranjo (`{ "arranja": { "forma": "<id>", "modo": ... } }`) não tem id: as cópias herdam o da fonte */
        exigir(objeto(f.arranja) && typeof f.arranja.forma === 'string' && f.arranja.forma, 'editar: o arranjo de --adicionar precisa de "arranja": { "forma": "<id>", "modo": "linear" | "radial", "total": n, ... }');
        exigir(Object.keys(f).length === 1, `editar: a entrada de arranjo só tem o campo "arranja"; retire "${Object.keys(f).find((k) => k !== 'arranja')}"`);
        const todos = [...new Set(listas.flatMap((l) => idsDe(l.lista)))];
        exigir(todos.includes(f.arranja.forma), `editar: --adicionar o arranjo de "${f.arranja.forma}": não há forma com esse id${quisDizer(f.arranja.forma, todos)} (formas declaradas: ${todos.slice(0, 40).join(', ')}${todos.length > 40 ? `, e mais ${todos.length - 40}` : ''})`);
        for (const { lista } of listas) lista.push(clone(f));
        mudancas.push({ acao: 'adicionar', forma: `arranja de ${f.arranja.forma}`, arranjo: true });
        continue;
      }
      exigir(typeof f.id === 'string' && f.id, 'editar: a forma de --adicionar precisa de "id" (ou, num arranjo, só de "arranja")');
      const todos = new Set(listas.flatMap((l) => idsDe(l.lista)));
      exigir(!todos.has(f.id), `editar: --adicionar "${f.id}": já existe uma forma com esse id (use <forma>.<campo>=<valor> para mudar a que existe)`);
      for (const { lista } of listas) lista.push(clone(f));
      mudancas.push({ acao: 'adicionar', forma: f.id });
    }
  }
  return { esboco, mudancas };
}

/* O relato das mudanças, uma linha cada. */
export function formatarMudancas(mudancas) {
  return mudancas.map((m) => {
    if (m.acao === 'remover') return `removida a forma ${m.forma}`;
    if (m.acao === 'adicionar') return m.arranjo ? `adicionado o ${m.forma}` : `adicionada a forma ${m.forma}`;
    return `${m.forma}.${m.campo}: ${m.antes === null ? '(sem valor)' : texto(m.antes)} -> ${m.depois === null ? '(retirado)' : texto(m.depois)}`;
  });
}
