/* Parâmetros, expressões, formas herdadas da raiz e arranjos: a etapa que transforma o JSON
   declarado num JSON simples, só com números, antes de qualquer outra leitura. Um arquivo sem
   nenhum desses recursos sai com os mesmos valores. `criarResolverNumerico` é a única importação
   do núcleo do Mecanifica (92 linhas, nenhum import). Não lê nem grava arquivo. */
import { criarResolverNumerico } from '../../../procedural/nucleo/expressoes.js';
import { ErroDeEsboco } from './index.js';

const EIXOS = ['x', 'y', 'z'];
const exigir = (cond, msg) => { if (!cond) throw new ErroDeEsboco(msg); };
const objeto = (v) => v && typeof v === 'object' && !Array.isArray(v);

/* Campos numéricos de uma forma que aceitam número, nome de parâmetro ou "=expressão". */
const ESCALARES = ['diametro', 'comprimento', 'diametroExterno', 'diametroInterno', 'espessura', 'largura', 'altura', 'profundidade', 'raio', 'opacidade'];
const VETORES = ['desloca'];
const VETORES_OU_REFERENCIA = ['centro', 'de', 'para'];

function traduzir(e, contexto, campo, valor, validos) {
  const texto = typeof valor === 'string' ? ` com o valor ${JSON.stringify(valor)}` : '';
  const dica = `parâmetros válidos: ${validos.length ? validos.join(', ') : 'nenhum declarado'}`;
  const ausente = /parâmetro '(.+)' não existe/.exec(e.message);
  if (ausente) return new ErroDeEsboco(`${contexto}: o campo "${campo}"${texto} usa o parâmetro "${ausente[1]}", que não existe (${dica})`);
  const ciclo = /ciclo de parâmetros: (.+)$/.exec(e.message);
  if (ciclo) return new ErroDeEsboco(`${contexto}: o campo "${campo}"${texto} cai num ciclo de parâmetros (${ciclo[1]})`);
  const detalhe = e.message.replace(/^oficina: (expressão inválida: )?/, '');
  return new ErroDeEsboco(`${contexto}: o campo "${campo}"${texto} não é um número, um parâmetro nem uma expressão válida (${detalhe}; ${dica}); use um número, o nome de um parâmetro ou "=expressão" com + - * / e parênteses`);
}

/* { num, valores }: `num(v, campo, contexto)` devolve o número de um valor; `valores` são os parâmetros resolvidos. */
function resolvedor(dict, onde) {
  const validos = Object.keys(dict);
  const r = criarResolverNumerico(dict);
  const num = (v, campo, contexto = onde) => {
    if (typeof v !== 'string') return v;
    try { return r.num(v); } catch (e) { throw traduzir(e, contexto, campo, v, validos); }
  };
  const valores = {};
  for (const nome of validos) {
    exigir(typeof dict[nome] === 'number' || typeof dict[nome] === 'string', `${onde}: o parâmetro "${nome}" deve ser um número, o nome de outro parâmetro ou "=expressão" (valor ${JSON.stringify(dict[nome])})`);
    valores[nome] = num(nome, `parametros.${nome}`);
  }
  return { num, valores };
}

function vetor(v, num, campo, contexto) {
  return Array.isArray(v) ? v.map((x, i) => num(x, `${campo}[${i}]`, contexto)) : v;
}

function numerosDaForma(f, num, contexto) {
  const g = { ...f };
  for (const k of ESCALARES) if (g[k] !== undefined) g[k] = num(g[k], k, contexto);
  for (const k of [...VETORES, ...VETORES_OU_REFERENCIA]) if (g[k] !== undefined) g[k] = vetor(g[k], num, k, contexto);
  const r = g.rotacao;
  if (Array.isArray(r)) g.rotacao = vetor(r, num, 'rotacao', contexto);
  else if (typeof r === 'string' || typeof r === 'number') g.rotacao = num(r, 'rotacao', contexto);
  else if (objeto(r)) g.rotacao = Object.fromEntries(Object.entries(r).map(([k, v]) => [k, ['angulo', 'x', 'y', 'z'].includes(k) ? num(v, `rotacao.${k}`, contexto) : v]));
  if (objeto(g.achatado) && g.achatado.profundidade !== undefined) g.achatado = { ...g.achatado, profundidade: num(g.achatado.profundidade, 'achatado.profundidade', contexto) };
  const furo = (o, campo) => (objeto(o) ? { ...o, ...(o.diametro !== undefined ? { diametro: num(o.diametro, `${campo}.diametro`, contexto) } : {}), ...(o.centro !== undefined ? { centro: vetor(o.centro, num, `${campo}.centro`, contexto) } : {}) } : o);
  if (g.furo !== undefined) g.furo = furo(g.furo, 'furo');
  if (Array.isArray(g.furos)) g.furos = g.furos.map((o, i) => furo(o, `furos[${i}]`));
  if (objeto(g.encosta)) {
    g.encosta = { ...g.encosta };
    if (g.encosta.folga !== undefined) g.encosta.folga = num(g.encosta.folga, 'encosta.folga', contexto);
    if (Array.isArray(g.encosta.direcao)) g.encosta.direcao = vetor(g.encosta.direcao, num, 'encosta.direcao', contexto);
  }
  if (objeto(g.linhaCentro) && g.linhaCentro.extensao !== undefined) g.linhaCentro = { ...g.linhaCentro, extensao: num(g.linhaCentro.extensao, 'linhaCentro.extensao', contexto) };
  if (objeto(g.espelha) && g.espelha.pos !== undefined) g.espelha = { ...g.espelha, pos: num(g.espelha.pos, 'espelha.pos', contexto) };
  if (objeto(g.arranja)) {
    g.arranja = { ...g.arranja };
    for (const k of ['total', 'graus']) if (g.arranja[k] !== undefined) g.arranja[k] = num(g.arranja[k], `arranja.${k}`, contexto);
    for (const k of ['passo', 'centro']) if (g.arranja[k] !== undefined) g.arranja[k] = vetor(g.arranja[k], num, `arranja.${k}`, contexto);
  }
  return g;
}

function numerosDoContato(c, num, onde) {
  if (!objeto(c)) return c;
  const g = { ...c };
  for (const k of ['tolerancia', 'penetracao', 'folga']) if (g[k] !== undefined) g[k] = num(g[k], `contato.${k}`, onde);
  if (Array.isArray(g.pares)) g.pares = g.pares.map((p, i) => (objeto(p) && p.max !== undefined ? { ...p, max: num(p.max, `contato.pares[${i}].max`, onde) } : p));
  if (objeto(g.projecao) && g.projecao.limiar !== undefined) g.projecao = { ...g.projecao, limiar: num(g.projecao.limiar, 'contato.projecao.limiar', onde) };
  return g;
}

function numerosDaExplosao(e, num, onde) {
  return objeto(e) && e.fator !== undefined ? { ...e, fator: num(e.fator, 'explosao.fator', onde) } : e;
}

function numerosDosPontos(p, num, onde) {
  if (!objeto(p)) return p;
  return Object.fromEntries(Object.entries(p).map(([nome, v]) => [nome, vetor(v, num, `pontos.${nome}`, onde)]));
}

const CHAVES_ARRANJA = ['forma', 'modo', 'total', 'passo', 'eixo', 'centro', 'graus', 'nomes'];
const MODOS_DO_ARRANJO = ['linear', 'radial'];

/* Troca cada entrada `{ "arranja": {...} }` pelas cópias da forma-fonte: formas virtuais
   `{ id, arranjoDe }` que `resolverOpcao` posiciona a partir da fonte já resolvida. `total` conta
   a fonte: ela é a peça 0 e as cópias são `<id>1` ... `<id><total-1>`. Idempotente: a forma virtual
   passa sem mudança. */
export function expandirArranjos(formas, onde = 'opção') {
  if (!Array.isArray(formas)) return formas;
  const saida = [];
  for (const [i, f] of formas.entries()) {
    if (!objeto(f) || f.arranja === undefined || f.id !== undefined) { saida.push(f); continue; }
    const contexto = `${onde}, forma ${i + 1} (arranja)`;
    const extras = Object.keys(f).filter((k) => k !== 'arranja');
    exigir(extras.length === 0, `${contexto}: a entrada de arranjo só tem o campo "arranja"; retire "${extras[0]}"`);
    const a = f.arranja;
    exigir(objeto(a), `${contexto}: "arranja" deve ser { "forma": "<id>", "modo": "linear" | "radial", "total": n, ... }`);
    const fora = Object.keys(a).filter((k) => !CHAVES_ARRANJA.includes(k));
    exigir(fora.length === 0, `${contexto}: "arranja" não tem o campo "${fora[0]}" (campos: ${CHAVES_ARRANJA.join(', ')})`);
    exigir(typeof a.forma === 'string' && a.forma, `${contexto}: "arranja.forma" deve ser o id da forma-fonte`);
    exigir(MODOS_DO_ARRANJO.includes(a.modo), `${contexto}: "arranja.modo" deve ser "linear" ou "radial"`);
    exigir(Number.isInteger(a.total) && a.total >= 2, `${contexto}: "arranja.total" deve ser um inteiro de 2 ou mais (conta a fonte; as cópias são ${a.forma}1 a ${a.forma}<total-1>)`);
    const vec3 = (v) => Array.isArray(v) && v.length === 3 && v.every(Number.isFinite);
    let dados;
    if (a.modo === 'linear') {
      exigir(vec3(a.passo) && Math.hypot(...a.passo) > 0, `${contexto}: o modo linear precisa de "passo": [dx, dy, dz] em mm, não nulo`);
      exigir(a.eixo === undefined && a.centro === undefined && a.graus === undefined, `${contexto}: "eixo", "centro" e "graus" valem só no modo radial`);
      dados = { passo: a.passo };
    } else {
      exigir(EIXOS.includes(a.eixo), `${contexto}: o modo radial precisa de "eixo": "x", "y" ou "z"`);
      exigir(vec3(a.centro) || (typeof a.centro === 'string' && a.centro), `${contexto}: o modo radial precisa de "centro": [x, y, z], um ponto nomeado ou "<id>.<ancora>"`);
      exigir(a.passo === undefined, `${contexto}: "passo" vale só no modo linear`);
      const graus = a.graus ?? 360;
      exigir(Number.isFinite(graus) && graus !== 0, `${contexto}: "arranja.graus" deve ser um número diferente de zero`);
      dados = { eixo: a.eixo, centro: a.centro, graus };
    }
    if (a.nomes !== undefined) {
      exigir(Array.isArray(a.nomes) && a.nomes.length === a.total - 1 && a.nomes.every((n) => typeof n === 'string' && n) && new Set(a.nomes).size === a.nomes.length,
        `${contexto}: "arranja.nomes" deve listar ${a.total - 1} nomes distintos, um por cópia (a fonte "${a.forma}" já tem o nome dela)`);
    }
    for (let k = 1; k < a.total; k++) {
      saida.push({ id: a.nomes ? a.nomes[k - 1] : `${a.forma}${k}`, arranjoDe: { fonte: a.forma, modo: a.modo, indice: k, total: a.total, ...dados } });
    }
  }
  return saida;
}

/* Forma declarada pelo usuário, parâmetros e expressões resolvidos. Devolve o JSON simples:
   sem `parametros` nem `formas` na raiz (cada opção traz as suas formas e os seus parâmetros
   resolvidos), sem expressões e com os arranjos já em formas virtuais. */
export function expandirEsboco(esboco) {
  if (!objeto(esboco) || !Array.isArray(esboco.opcoes)) return esboco;
  const declaradosRaiz = esboco.parametros;
  exigir(declaradosRaiz === undefined || objeto(declaradosRaiz), 'esboço: "parametros" deve ser um objeto { nome: número | "outroNome" | "=expressão" }');
  const raiz = resolvedor(declaradosRaiz ?? {}, 'esboço');
  const saida = { ...esboco };
  delete saida.parametros;
  delete saida.formas;
  if (esboco.contato !== undefined) saida.contato = numerosDoContato(esboco.contato, raiz.num, 'esboço');
  if (esboco.explosao !== undefined) saida.explosao = numerosDaExplosao(esboco.explosao, raiz.num, 'esboço');
  const pontosDaRaiz = objeto(esboco.pontos) ? esboco.pontos : undefined;
  const raizTemExpressao = pontosDaRaiz && Object.values(pontosDaRaiz).some((v) => Array.isArray(v) && v.some((x) => typeof x === 'string'));
  if (pontosDaRaiz && !raizTemExpressao) saida.pontos = pontosDaRaiz;
  else delete saida.pontos;
  saida.opcoes = esboco.opcoes.map((o, i) => {
    if (!objeto(o)) return o;
    const onde = `opção ${i + 1}${o.titulo ? ` (${o.titulo})` : ''}`;
    exigir(o.parametros === undefined || objeto(o.parametros), `${onde}: "parametros" deve ser um objeto { nome: número | "outroNome" | "=expressão" }`);
    const { num, valores } = resolvedor({ ...(declaradosRaiz ?? {}), ...(o.parametros ?? {}) }, onde);
    const g = { ...o };
    delete g.parametros;
    if (Object.keys(valores).length > 0) g.parametros = valores;
    const fonte = o.formas ?? esboco.formas;
    if (Array.isArray(fonte)) {
      g.formas = expandirArranjos(fonte.map((f, j) => (objeto(f) ? numerosDaForma(f, num, `${onde}, forma ${f.id ? `"${f.id}"` : j + 1}`) : f)), onde);
    }
    if (o.contato !== undefined) g.contato = numerosDoContato(o.contato, num, onde);
    if (o.explosao !== undefined) g.explosao = numerosDaExplosao(o.explosao, num, onde);
    if (objeto(o.pontos) || raizTemExpressao) {
      const juntos = { ...(raizTemExpressao ? pontosDaRaiz : {}), ...(objeto(o.pontos) ? o.pontos : {}) };
      g.pontos = numerosDosPontos(juntos, num, onde);
    }
    return g;
  });
  return saida;
}

/* Os parâmetros resolvidos de cada opção, na ordem das opções (objeto vazio quando não há). */
export function parametrosDasOpcoes(esboco) {
  const e = expandirEsboco(esboco);
  return (Array.isArray(e?.opcoes) ? e.opcoes : []).map((o) => o?.parametros ?? {});
}
