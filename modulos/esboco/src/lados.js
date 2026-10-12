/* De que lado cada vista olha, em texto, para o brief do crítico cego. As quatro vistas de sempre olham dos lados positivos dos
   eixos (frontal de +z, lateral de +x, superior de +y, isométrica de [1, 1, 1]); num objeto com a proa em z 0 e a cauda em z
   positivo, como o avião, a frontal vê a cauda, e o crítico do Marco de 75% deu 7 por ler o leme à frente da deriva sem saber
   disso. O texto diz o eixo de onde o olho olha e onde cada eixo cai na imagem, e, quando o `plano.orientacao` diz para onde
   fica a frente do objeto, diz também o lado do objeto que a vista mostra, nas palavras dele (a proa, a cauda, o lado
   direito). O lado direito sai da frente e de y para cima, como o de quem olha para a frente do objeto: com a frente em -z, a
   direita é +x e o lado esquerdo, o de x negativo. Puro: não lê arquivo. */
import { ErroDeEsboco, VISTAS, VISTAS_EXTRAS, VISTAS_TODAS } from './index.js';

const objeto = (v) => v && typeof v === 'object' && !Array.isArray(v);
const exigir = (cond, msg) => { if (!cond) throw new ErroDeEsboco(msg); };

/* Os eixos horizontais que a frente do objeto pode ter (y é sempre para cima). */
export const FRENTES_POSSIVEIS = ['+x', '-x', '+z', '-z'];
const CHAVES_DA_ORIENTACAO = ['frente', 'nomeDaFrente', 'nomeDeTras'];
const EXEMPLO_DA_ORIENTACAO = '{ "frente": "-z", "nomeDaFrente": "a proa", "nomeDeTras": "a cauda" }';

const VETOR = { '+x': [1, 0, 0], '-x': [-1, 0, 0], '+y': [0, 1, 0], '-y': [0, -1, 0], '+z': [0, 0, 1], '-z': [0, 0, -1] };
const produtoVetorial = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const produto = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const nomeDoEixo = (v) => { const k = [0, 1, 2].find((i) => v[i] !== 0); return `${v[k] > 0 ? '+' : '-'}${'xyz'[k]}`; };

/* O `plano.orientacao` lido: { frente: "-z", nomeDaFrente: "a proa", nomeDeTras: "a cauda" }. `frente` é o eixo para onde o
   objeto olha (x ou z, com o sinal); os nomes levam o artigo, porque entram no texto como "vê a cauda", e sem eles valem "a
   frente" e "a traseira". */
export function lerOrientacao(o, onde = 'esboço: plano.orientacao') {
  exigir(objeto(o), `${onde} deve ser um objeto. Exemplo: ${EXEMPLO_DA_ORIENTACAO}`);
  for (const k of Object.keys(o)) exigir(CHAVES_DA_ORIENTACAO.includes(k), `${onde}: o campo "${k}" não existe; campos válidos: ${CHAVES_DA_ORIENTACAO.join(', ')}. Exemplo: ${EXEMPLO_DA_ORIENTACAO}`);
  exigir(FRENTES_POSSIVEIS.includes(o.frente), `${onde}: "frente" com o valor ${JSON.stringify(o.frente)} deve ser o eixo para onde o objeto olha, um de ${FRENTES_POSSIVEIS.join(', ')} (y é sempre para cima). Exemplo: ${EXEMPLO_DA_ORIENTACAO}`);
  for (const k of ['nomeDaFrente', 'nomeDeTras']) exigir(o[k] === undefined || (typeof o[k] === 'string' && o[k].trim()), `${onde}: "${k}" deve ser o nome com o artigo, como "a proa" ou "o nariz" (veio ${JSON.stringify(o[k])})`);
  return { frente: o.frente, nomeDaFrente: o.nomeDaFrente?.trim() ?? 'a frente', nomeDeTras: o.nomeDeTras?.trim() ?? 'a traseira' };
}

/* Os papéis dos seis lados no objeto: a frente, a traseira, o lado direito e o esquerdo, o de cima e o de baixo. */
function papeis(orientacao) {
  const f = VETOR[orientacao.frente];
  const direita = produtoVetorial(f, VETOR['+y']);
  return {
    frente: { v: f, nome: orientacao.nomeDaFrente },
    tras: { v: f.map((c) => -c), nome: orientacao.nomeDeTras },
    direita: { v: direita, nome: 'o lado direito' },
    esquerda: { v: direita.map((c) => -c), nome: 'o lado esquerdo' },
    cima: { v: VETOR['+y'], nome: 'o lado de cima' },
    baixo: { v: VETOR['-y'], nome: 'o lado de baixo' },
  };
}

/* O que a vista faz com um vetor do mundo na imagem (x para a direita, y para baixo, como a tela do esboço): "fica à direita",
   "fica em cima", "desce para a esquerda"; null quando o vetor está sobre o eixo do olho e some na imagem. */
function posicaoNaImagem(vista, v) {
  const [u, w] = VISTAS_TODAS[vista].p(v);
  const h = Math.abs(u) > 0.2 ? (u > 0 ? 'direita' : 'esquerda') : null;
  const t = Math.abs(w) > 0.2 ? (w > 0 ? 'embaixo' : 'em cima') : null;
  if (h && t) return `${w > 0 ? 'desce' : 'sobe'} para a ${h}`;
  if (h) return `fica à ${h}`;
  if (t) return `fica ${t}`;
  return null;
}

/* O lado do objeto que o olho vê, nas palavras dele: a vista isométrica junta os três lados de que olha. */
function ladosVistos(olho, orientacao) {
  const p = papeis(orientacao);
  const achados = [];
  for (const chave of ['cima', 'baixo', 'direita', 'esquerda', 'frente', 'tras']) {
    if (produto(olho, p[chave].v) > 0.5) achados.push(p[chave].nome);
  }
  return achados;
}

/* "a, b e c" */
const lista = (itens) => (itens.length <= 1 ? itens.join('') : `${itens.slice(0, -1).join(', ')} e ${itens.at(-1)}`);

/* A linha de uma vista: de onde olha, o que vê do objeto (com a orientação) e onde caem os eixos na imagem. */
export function linhaDaVista(nome, orientacao = null) {
  const V = VISTAS_TODAS[nome];
  exigir(V, `vista "${nome}" desconhecida (vistas: ${Object.keys(VISTAS_TODAS).join(', ')})`);
  const diagonal = V.olho.filter((c) => c !== 0).length > 1;
  const de = diagonal ? `de [${V.olho.join(', ')}], do lado positivo de x, de y e de z` : `de ${nomeDoEixo(V.olho)}`;
  const vistos = orientacao ? ladosVistos(V.olho, orientacao) : [];
  const partes = [`olha ${de}${vistos.length > 0 ? ` e vê ${lista(vistos)}` : ''}`];
  if (orientacao) {
    const p = papeis(orientacao);
    for (const chave of ['frente', 'direita']) {
      const onde = posicaoNaImagem(nome, p[chave].v);
      const rotulo = `${p[chave].nome} (${nomeDoEixo(p[chave].v)})`;
      if (onde !== null) partes.push(`${rotulo} ${onde}${onde.startsWith('fica') ? ' da imagem' : ' na imagem'}`);
      else if (chave === 'frente') partes.push(`${rotulo} fica ${produto(V.olho, p.frente.v) > 0 ? 'voltada para o olho' : 'longe do olho, atrás do objeto'}`);
    }
  } else {
    partes.push(['+x', '+y', '+z'].map((e) => ({ e, onde: posicaoNaImagem(nome, VETOR[e]) })).filter((x) => x.onde !== null).map((x) => `${x.e} ${x.onde}`).join(', '));
  }
  return `${nome}: ${partes.join('; ')}`;
}

/* As linhas do bloco "de que lado cada vista olha" do brief: as quatro vistas de sempre e, em `extras`, as vistas de outros lados
   que a unidade pede, e no fim o que as quatro não olham. `orientacao` é o `plano.orientacao` lido, ou null. */
export function ladosDasVistas({ orientacao = null, extras = [] } = {}) {
  for (const e of extras) exigir(Object.hasOwn(VISTAS_EXTRAS, e), `vista a mais "${e}" desconhecida (vistas: ${Object.keys(VISTAS_EXTRAS).join(', ')})`);
  const L = ['De que lado cada vista olha (eixos do esboço, com y para cima; "olha de +z" quer dizer que o olho está do lado de z positivo, voltado para o lado negativo):'];
  for (const v of [...Object.keys(VISTAS), ...extras]) L.push(`  ${linhaDaVista(v, orientacao)}`);
  const cobertos = extras.map((x) => nomeDoEixo(VISTAS_EXTRAS[x].olho));
  const falta = ['-x', '-y', '-z'].filter((e) => !cobertos.includes(e)).map((e) => (orientacao ? `${e} (${Object.values(papeis(orientacao)).find((q) => nomeDoEixo(q.v) === e).nome})` : e));
  const base = 'As quatro vistas de sempre só olham dos lados positivos (+x, +y, +z).';
  if (extras.length === 0) L.push(`  ${base} O que está voltado para ${lista(falta)} só aparece nas vistas a mais (frontal-oposta, lateral-oposta, inferior), que a unidade pede em "vistas", e nos cortes.`);
  else L.push(`  ${base}${falta.length > 0 ? ` O que está voltado para ${lista(falta)} continua sem vista, só nos cortes.` : ''}`);
  return L;
}
