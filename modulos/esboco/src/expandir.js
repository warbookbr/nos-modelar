/* Parâmetros, expressões, formas herdadas da raiz e arranjos: a etapa que transforma o JSON
   declarado num JSON simples, só com números, antes de qualquer outra leitura. Um arquivo sem
   nenhum desses recursos sai com os mesmos valores. `criarResolverNumerico` é a única importação
   do núcleo do Mecanifica (92 linhas, nenhum import). Não lê nem grava arquivo. */
import { criarResolverNumerico } from '../../../procedural/nucleo/expressoes.js';
import { ErroDeEsboco } from './index.js';
import { catalogoDe, expandirComponentes } from './componentes.js';
import { validarEsquema } from './esquema.js';
import { fontesDoArranjo, nomesDasCopias } from './arranjo.js';
import { traduzirLigacoes, validarLigacoes } from './ligar.js';
import { ehGerador, gerarPerfil } from './perfis.js';
import { estilosDasFormasDeModulo, lerEstilos, prepararFormas } from './estilos.js';

const EIXOS = ['x', 'y', 'z'];
const exigir = (cond, msg) => { if (!cond) throw new ErroDeEsboco(msg); };
const objeto = (v) => v && typeof v === 'object' && !Array.isArray(v);

/* Campos numéricos de uma forma que aceitam número, nome de parâmetro ou "=expressão". */
const ESCALARES = ['diametro', 'diametroTopo', 'comprimento', 'diametroExterno', 'diametroInterno', 'espessura', 'largura', 'altura', 'profundidade', 'raio', 'raioCurva', 'chanfro', 'opacidade'];
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
export function resolvedor(dict, onde) {
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

/* Um ponto: vetor (números, parâmetros ou expressões), texto (ponto nomeado ou "<id>.<ancora>", que fica como está)
   ou { "entre": [A, B], "t" | "mm" | "mmAntes": número }, com A e B pontos e o número resolvido. */
function ponto(v, num, campo, contexto) {
  if (Array.isArray(v)) return vetor(v, num, campo, contexto);
  if (objeto(v) && Array.isArray(v.entre)) {
    const g = { ...v, entre: v.entre.map((q, i) => ponto(q, num, `${campo}.entre[${i}]`, contexto)) };
    for (const k of ['t', 'mm', 'mmAntes']) if (g[k] !== undefined) g[k] = num(g[k], `${campo}.${k}`, contexto);
    return g;
  }
  /* âncora com deslocamento: { "ancora": "<id>.<ancora>", "mm": [dx, dy, dz] } */
  if (objeto(v) && v.ancora !== undefined) {
    const g = { ...v, ancora: ponto(v.ancora, num, `${campo}.ancora`, contexto) };
    if (Array.isArray(v.mm)) g.mm = vetor(v.mm, num, `${campo}.mm`, contexto);
    return g;
  }
  /* ponto-guia nomeado do caminho de um tubo: { "nome": "joelho", "ponto": <ponto> } */
  if (objeto(v) && v.nome !== undefined && v.ponto !== undefined) return { ...v, ponto: ponto(v.ponto, num, `${campo}.ponto`, contexto) };
  return v;
}

/* Ponto de perfil de revolução escrito como { raio, altura, nome }. */
function numerosDoPontoDePerfil(q, num, campo, contexto) {
  const g = { ...q };
  for (const k of ['raio', 'altura']) if (g[k] !== undefined) g[k] = num(g[k], `${campo}.${k}`, contexto);
  return g;
}

/* Seção de loft: posição, tamanho, centro, inclinação, raio, cantos e polígono aceitam número, parâmetro ou expressão. Os `cantos` da
   seção "arredondado" são um número ou uma lista de 4 cantos, cada um um número ou [ru, rv]. */
function cantosDaSecao(c, num, campo, contexto) {
  if (!Array.isArray(c)) return num(c, campo, contexto);
  return c.map((x, i) => (Array.isArray(x) ? vetor(x, num, `${campo}[${i}]`, contexto) : num(x, `${campo}[${i}]`, contexto)));
}

function numerosDaSecao(q, num, campo, contexto) {
  if (!objeto(q)) return q;
  const g = { ...q };
  for (const k of ['pos', 'raio', 'segmentosPorCanto']) if (g[k] !== undefined) g[k] = num(g[k], `${campo}.${k}`, contexto);
  if (g.cantos !== undefined) g.cantos = cantosDaSecao(g.cantos, num, `${campo}.cantos`, contexto);
  for (const k of ['tamanho', 'centro', 'inclinacao']) if (g[k] !== undefined) g[k] = vetor(g[k], num, `${campo}.${k}`, contexto);
  if (ehGerador(g.perfil)) g.perfil = gerarPerfil(g.perfil, num, `${campo}.perfil`, contexto);
  if (Array.isArray(g.perfil)) g.perfil = g.perfil.map((p, i) => vetor(p, num, `${campo}.perfil[${i}]`, contexto));
  return g;
}

export function numerosDaForma(f, num, contexto) {
  const g = { ...f };
  for (const k of ESCALARES) if (g[k] !== undefined) g[k] = num(g[k], k, contexto);
  for (const k of VETORES) if (g[k] !== undefined) g[k] = vetor(g[k], num, k, contexto);
  for (const k of VETORES_OU_REFERENCIA) if (g[k] !== undefined) g[k] = ponto(g[k], num, k, contexto);
  if (Array.isArray(g.caminho)) g.caminho = g.caminho.map((q, i) => ponto(q, num, `caminho[${i}]`, contexto));
  if (ehGerador(g.perfil)) g.perfil = gerarPerfil(g.perfil, num, 'perfil', contexto);
  if (Array.isArray(g.perfil)) g.perfil = g.perfil.map((q, i) => (objeto(q) ? numerosDoPontoDePerfil(q, num, `perfil[${i}]`, contexto) : vetor(q, num, `perfil[${i}]`, contexto)));
  if (Array.isArray(g.circulos)) {
    g.circulos = g.circulos.map((c, i) => (objeto(c) ? { ...c, ...(c.raio !== undefined ? { raio: num(c.raio, `circulos[${i}].raio`, contexto) } : {}), ...(c.centro !== undefined ? { centro: ponto(c.centro, num, `circulos[${i}].centro`, contexto) } : {}) } : c));
  }
  if (Array.isArray(g.secoes)) g.secoes = g.secoes.map((q, i) => numerosDaSecao(q, num, `secoes[${i}]`, contexto));
  if (objeto(g.casca) && g.casca.espessura !== undefined) g.casca = { ...g.casca, espessura: num(g.casca.espessura, 'casca.espessura', contexto) };
  if (objeto(g.alinha) && objeto(g.alinha.com)) g.alinha = { ...g.alinha, com: ponto(g.alinha.com, num, 'alinha.com', contexto) };
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
  if (objeto(g.encaixa)) {
    g.encaixa = { ...g.encaixa };
    if (g.encaixa.em !== undefined) g.encaixa.em = ponto(g.encaixa.em, num, 'encaixa.em', contexto);
    if (objeto(g.encaixa.gira) && g.encaixa.gira.graus !== undefined) g.encaixa.gira = { ...g.encaixa.gira, graus: num(g.encaixa.gira.graus, 'encaixa.gira.graus', contexto) };
  }
  if (objeto(g.linhaCentro) && g.linhaCentro.extensao !== undefined) g.linhaCentro = { ...g.linhaCentro, extensao: num(g.linhaCentro.extensao, 'linhaCentro.extensao', contexto) };
  if (objeto(g.espelha) && g.espelha.pos !== undefined) g.espelha = { ...g.espelha, pos: num(g.espelha.pos, 'espelha.pos', contexto) };
  if (objeto(g.arranja)) {
    g.arranja = { ...g.arranja };
    for (const k of ['total', 'graus']) if (g.arranja[k] !== undefined) g.arranja[k] = num(g.arranja[k], `arranja.${k}`, contexto);
    for (const k of ['passo', 'centro']) if (g.arranja[k] !== undefined) g.arranja[k] = Array.isArray(g.arranja[k]) ? vetor(g.arranja[k], num, `arranja.${k}`, contexto) : (k === 'passo' ? num(g.arranja[k], 'arranja.passo', contexto) : g.arranja[k]);
    if (g.arranja.desde !== undefined) g.arranja.desde = num(g.arranja.desde, 'arranja.desde', contexto);
  }
  return g;
}

function numerosDoContato(c, num, onde) {
  if (!objeto(c)) return c;
  const g = { ...c };
  for (const k of ['tolerancia', 'penetracao', 'folga']) if (g[k] !== undefined) g[k] = num(g[k], `contato.${k}`, onde);
  if (Array.isArray(g.pares)) g.pares = g.pares.map((p, i) => (objeto(p) && p.max !== undefined ? { ...p, max: num(p.max, `contato.pares[${i}].max`, onde) } : p));
  if (objeto(g.projecao) && g.projecao.limiar !== undefined) g.projecao = { ...g.projecao, limiar: num(g.projecao.limiar, 'contato.projecao.limiar', onde) };
  if (Array.isArray(g.juntas)) g.juntas = g.juntas.map((j, i) => (objeto(j) && j.max !== undefined ? { ...j, max: num(j.max, `contato.juntas[${i}].max`, onde) } : j));
  return g;
}

function numerosDaExplosao(e, num, onde) {
  if (!objeto(e)) return e;
  const g = { ...e };
  if (g.fator !== undefined) g.fator = num(g.fator, 'explosao.fator', onde);
  if (g.distancia !== undefined && g.distancia !== 'auto') g.distancia = num(g.distancia, 'explosao.distancia', onde);
  return g;
}

function numerosDosPontos(p, num, onde) {
  if (!objeto(p)) return p;
  return Object.fromEntries(Object.entries(p).map(([nome, v]) => [nome, vetor(v, num, `pontos.${nome}`, onde)]));
}

const CHAVES_ARRANJA = ['forma', 'modo', 'total', 'passo', 'eixo', 'centro', 'graus', 'nomes', 'caminho', 'desde'];
const MODOS_DO_ARRANJO = ['linear', 'radial', 'caminho'];

/* Troca cada entrada `{ "arranja": {...} }` pelas cópias da forma-fonte (ou de cada forma do grupo): formas virtuais
   `{ id, arranjoDe }` que `resolverOpcao` posiciona a partir da fonte já resolvida. `total` conta
   a fonte: ela é a peça 0 e as cópias são `<id>1` ... `<id><total-1>`. Idempotente: a forma virtual
   passa sem mudança. */
export function expandirArranjos(formas, onde = 'opção') {
  if (!Array.isArray(formas)) return formas;
  const saida = [];
  for (const [i, f] of formas.entries()) {
    if (!objeto(f) || f.arranja === undefined || f.id !== undefined) { saida.push(f); continue; }
    const contexto = `${onde}, forma ${i + 1} (arranja)`;
    const extras = Object.keys(f).filter((k) => k !== 'arranja' && k !== 'daInstancia');
    exigir(extras.length === 0, `${contexto}: a entrada de arranjo só tem o campo "arranja"; retire "${extras[0]}"`);
    const a = f.arranja;
    exigir(objeto(a), `${contexto}: "arranja" deve ser { "forma": "<id>", "modo": "linear" | "radial", "total": n, ... }`);
    const fora = Object.keys(a).filter((k) => !CHAVES_ARRANJA.includes(k));
    exigir(fora.length === 0, `${contexto}: "arranja" não tem o campo "${fora[0]}" (campos: ${CHAVES_ARRANJA.join(', ')})`);
    const fontes = fontesDoArranjo(a);
    exigir(fontes.length > 0 && fontes.every((x) => typeof x === 'string' && x) && new Set(fontes).size === fontes.length, `${contexto}: "arranja.forma" deve ser o id da forma-fonte ou uma lista de ids distintos (o grupo repetido junto)`);
    exigir(MODOS_DO_ARRANJO.includes(a.modo), `${contexto}: "arranja.modo" deve ser "linear", "radial" ou "caminho"`);
    exigir(Number.isInteger(a.total) && a.total >= 2, `${contexto}: "arranja.total" deve ser um inteiro de 2 ou mais (conta a fonte; as cópias são ${fontes[0]}1 a ${fontes[0]}<total-1>)`);
    const vec3 = (v) => Array.isArray(v) && v.length === 3 && v.every(Number.isFinite);
    let dados;
    if (a.modo === 'caminho') {
      exigir(typeof a.caminho === 'string' && a.caminho, `${contexto}: o modo caminho precisa de "caminho": o id de um tubo ou de uma faixa "envolve" que as cópias seguem`);
      exigir(a.eixo === undefined && a.centro === undefined && a.graus === undefined, `${contexto}: "eixo", "centro" e "graus" valem só no modo radial`);
      exigir(a.passo === undefined || (Number.isFinite(a.passo) && a.passo > 0), `${contexto}: no modo caminho "passo" é a distância em mm, ao longo do caminho, entre duas cópias (número positivo; sem ele as cópias se espaçam por igual no comprimento todo)`);
      exigir(a.desde === undefined || Number.isFinite(a.desde), `${contexto}: "arranja.desde" deve ser um número em mm, a distância do começo do caminho à fonte (padrão 0)`);
      dados = { caminho: a.caminho, ...(a.passo === undefined ? {} : { passo: a.passo }), ...(a.desde === undefined ? {} : { desde: a.desde }) };
    } else if (a.modo === 'linear') {
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
      const esperados = a.total - 1;
      const conferir = (lista, fonte, rotulo) => {
        const veio = Array.isArray(lista) ? lista.length : 0;
        exigir(Array.isArray(lista) && lista.length === esperados && lista.every((n) => typeof n === 'string' && n) && new Set(lista).size === lista.length,
          `${contexto}: ${rotulo} deve listar ${esperados} ${esperados === 1 ? 'nome' : 'nomes'}, veio ${veio}${Array.isArray(lista) ? '' : ' (não é uma lista)'}; um por cópia, textos não vazios e distintos, e a fonte "${fonte}" já tem o nome dela`);
      };
      if (Array.isArray(a.forma)) {
        exigir(objeto(a.nomes) && Object.keys(a.nomes).every((x) => fontes.includes(x)), `${contexto}: com uma lista em "arranja.forma", "arranja.nomes" deve ser { "<fonte>": [nomes] } com fontes do grupo (${fontes.join(', ')}); a fonte omitida usa ${fontes[0]}1, ${fontes[0]}2...`);
        for (const [fonte, lista] of Object.entries(a.nomes)) conferir(lista, fonte, `"arranja.nomes.${fonte}"`);
      } else conferir(a.nomes, a.forma, '"arranja.nomes"');
    }
    const copias = nomesDasCopias(a);
    for (let k = 1; k < a.total; k++) {
      for (const { fonte, nomes } of copias) {
        saida.push({ id: nomes[k - 1], arranjoDe: { fonte, modo: a.modo, indice: k, total: a.total, ...dados }, ...(objeto(f.daInstancia) ? { daInstancia: { id: f.daInstancia.id, principal: f.daInstancia.principal }, ...(f.daInstancia.oculto === undefined ? {} : { oculto: f.daInstancia.oculto }), ...(f.daInstancia.opacidade === undefined ? {} : { opacidade: f.daInstancia.opacidade }) } : {}) });
      }
    }
  }
  return saida;
}

/* Forma declarada pelo usuário, parâmetros e expressões resolvidos. Devolve o JSON simples:
   sem `parametros` nem `formas` na raiz (cada opção traz as suas formas e os seus parâmetros
   resolvidos), sem expressões e com os arranjos já em formas virtuais. */
export function expandirEsboco(esboco) {
  if (!objeto(esboco) || !Array.isArray(esboco.opcoes)) return esboco;
  validarEsquema(esboco);
  const declaradosRaiz = esboco.parametros;
  exigir(declaradosRaiz === undefined || objeto(declaradosRaiz), 'esboço: "parametros" deve ser um objeto { nome: número | "outroNome" | "=expressão" }');
  const raiz = resolvedor(declaradosRaiz ?? {}, 'esboço');
  const catalogo = catalogoDe(esboco.modulos);
  const saida = { ...esboco };
  delete saida.parametros;
  delete saida.modulos;
  delete saida.formas;
  const estilos = lerEstilos(esboco);
  delete saida.estilos;
  delete saida.unidades;
  delete saida.baseDoMestre;
  delete saida.simetrico;
  if (esboco.contato !== undefined) saida.contato = numerosDoContato(esboco.contato, raiz.num, 'esboço');
  if (esboco.explosao !== undefined) saida.explosao = numerosDaExplosao(esboco.explosao, raiz.num, 'esboço');
  if (objeto(esboco.enquadrar) && typeof esboco.enquadrar.margem === 'string') saida.enquadrar = { ...esboco.enquadrar, margem: raiz.num(esboco.enquadrar.margem, 'enquadrar.margem', 'esboço') };
  if (objeto(esboco.corte) && typeof esboco.corte.valor === 'string' && !esboco.corte.valor.includes('.')) saida.corte = { ...esboco.corte, valor: raiz.num(esboco.corte.valor, 'corte.valor', 'esboço') };
  const pontosDaRaiz = objeto(esboco.pontos) ? esboco.pontos : undefined;
  const raizTemExpressao = pontosDaRaiz && Object.values(pontosDaRaiz).some((v) => Array.isArray(v) && v.some((x) => typeof x === 'string'));
  if (pontosDaRaiz && !raizTemExpressao) saida.pontos = pontosDaRaiz;
  else delete saida.pontos;
  const expansoes = [];
  saida.opcoes = esboco.opcoes.map((o, i) => {
    if (!objeto(o)) return o;
    const onde = `opção ${i + 1}${o.titulo ? ` (${o.titulo})` : ''}`;
    exigir(o.parametros === undefined || objeto(o.parametros), `${onde}: "parametros" deve ser um objeto { nome: número | "outroNome" | "=expressão" }`);
    const { num, valores } = resolvedor({ ...(declaradosRaiz ?? {}), ...(o.parametros ?? {}) }, onde);
    const g = { ...o };
    delete g.parametros;
    if (Object.keys(valores).length > 0) g.parametros = valores;
    const fonte = prepararFormas(traduzirLigacoes(o.formas ?? esboco.formas, onde), estilos, num, onde);
    let componentes = { pares: [], aliasDeId: () => undefined, instancias: 0 };
    if (Array.isArray(fonte)) {
      componentes = expandirComponentes(fonte, { num, resolvedor, numerosDaForma, onde, catalogo });
      g.formas = expandirArranjos(estilosDasFormasDeModulo(componentes.formas, estilos, onde).map((f, j) => (objeto(f) ? numerosDaForma(f, num, `${onde}, forma ${f.id ? `"${f.id}"` : j + 1}`) : f)), onde);
      validarLigacoes(g.formas, onde, Object.keys({ ...(esboco.pontos ?? {}), ...(o.pontos ?? {}) }));
    }
    expansoes.push(componentes);
    /* medidas do plano: os pontos "<instancia>.<ancora>" viram a forma e a âncora reais desta opção */
    if (objeto(esboco.plano) && Array.isArray(esboco.plano.medidas)) {
      const trocar = (e) => (objeto(e) && Array.isArray(e.distancia) ? { ...e, distancia: e.distancia.map((q) => componentes.ponto(q)) } : e);
      g.medidas = esboco.plano.medidas.map((m) => {
        if (!objeto(m) || !objeto(m.mede)) return m;
        if (Array.isArray(m.mede.razao)) return { ...m, mede: { ...m.mede, razao: m.mede.razao.map(trocar) } };
        return Array.isArray(m.mede.distancia) ? { ...m, mede: trocar(m.mede) } : m;
      });
    }
    if (o.contato !== undefined) g.contato = numerosDoContato(o.contato, num, onde);
    if (o.explosao !== undefined) g.explosao = numerosDaExplosao(o.explosao, num, onde);
    if (objeto(o.pontos) || raizTemExpressao) {
      const juntos = { ...(raizTemExpressao ? pontosDaRaiz : {}), ...(objeto(o.pontos) ? o.pontos : {}) };
      g.pontos = numerosDosPontos(juntos, num, onde);
    }
    return g;
  });
  const aliasDaRaiz = (id) => expansoes.map((x) => x.aliasDeId(id)).find((a) => a !== undefined);
  /* componentes: o id da instância nos pares do gate é a forma principal dela, e os pares do próprio
     componente entram em cada opção que o usa, a menos que o esboço já declare o mesmo par */
  if (expansoes.some((x) => x.instancias > 0)) {
    const comAlias = (c, alias) => (objeto(c) && Array.isArray(c.pares) ? { ...c, pares: c.pares.map((p) => (objeto(p) ? { ...p, a: alias(p.a) ?? p.a, b: alias(p.b) ?? p.b } : p)) } : c);
    if (saida.contato !== undefined) saida.contato = comAlias(saida.contato, aliasDaRaiz);
    const chave = (p) => (p.a < p.b ? `${p.a}\u0000${p.b}` : `${p.b}\u0000${p.a}`);
    saida.opcoes = saida.opcoes.map((g, i) => {
      if (!objeto(g)) return g;
      let h = g.contato !== undefined ? { ...g, contato: comAlias(g.contato, (id) => expansoes[i].aliasDeId(id) ?? aliasDaRaiz(id)) } : g;
      const ja = new Set([...(saida.contato?.pares ?? []), ...(h.contato?.pares ?? [])].filter(objeto).map(chave));
      const novos = expansoes[i].pares.filter((p) => !ja.has(chave(p)));
      if (novos.length > 0) h = { ...h, contato: { ...(h.contato ?? {}), pares: [...(h.contato?.pares ?? []), ...novos] } };
      return h;
    });
  }
  aplicarJuntas(saida, expansoes, aliasDaRaiz);
  return saida;
}

const CHAVES_DA_JUNTA = ['pecas', 'max', 'motivo'];
const chaveDoPar = (a, b) => (a < b ? `${a}\u0000${b}` : `${b}\u0000${a}`);

/* `contato.juntas: [{ pecas: [ids ou padrões], max, motivo }]` (na raiz e na opção): cada junta vira um par `atravessa`
   com o `max` e o `motivo` dela para todo par de peças que ela lista, no lugar de dezenas de pares escritos à mão. Um
   padrão (`garfoE.*`) casa os ids da opção; o id de uma instância de componente é a forma principal dela. Um par
   declarado à mão (ou do componente) prevalece sobre o da junta, e a primeira junta que cita o par prevalece sobre as
   outras. O gate os trata como qualquer `atravessa`, e o espelho os herda pelo mecanismo de sempre. */
function aplicarJuntas(saida, expansoes, aliasDaRaiz) {
  const tem = (c) => objeto(c) && c.juntas !== undefined;
  if (!tem(saida.contato) && !saida.opcoes.some((o) => objeto(o) && tem(o.contato))) return;
  const semJuntas = (c) => { const { juntas, ...resto } = c; return resto; };
  const daRaiz = saida.contato?.juntas;
  if (tem(saida.contato)) saida.contato = semJuntas(saida.contato);
  saida.opcoes = saida.opcoes.map((g, i) => {
    if (!objeto(g)) return g;
    const daOpcao = g.contato?.juntas;
    if (daRaiz === undefined && daOpcao === undefined) return g;
    const onde = `opção ${i + 1}${g.titulo ? ` (${g.titulo})` : ''}`;
    const ids = (g.formas ?? []).filter((f) => objeto(f) && f.oculto !== true).map((f) => f.id);
    /* uma peça oculta (a unidade isolada por --detalhar esconde as outras) sai da junta em silêncio */
    const ocultos = new Set((g.formas ?? []).filter((f) => objeto(f) && f.oculto === true && typeof f.id === 'string').map((f) => f.id));
    const alias = (id) => expansoes[i]?.aliasDeId(id) ?? aliasDaRaiz(id) ?? id;
    const lista = [];
    for (const [origem, juntas] of [['contato.juntas', daRaiz], [`contato.juntas (${onde})`, daOpcao]]) {
      if (juntas === undefined) continue;
      exigir(Array.isArray(juntas), `${onde}: "contato.juntas" deve ser uma lista de { "pecas": ["garfoE.*", "guidao"], "max": 15, "motivo": "a presilha do guidão abraça a coroa" }`);
      juntas.forEach((j, k) => lista.push({ j, nome: `${origem}[${k}]` }));
    }
    const existentes = new Set([...(saida.contato?.pares ?? []), ...(g.contato?.pares ?? [])].filter(objeto).map((p) => chaveDoPar(p.a, p.b)));
    const novos = [];
    for (const { j, nome } of lista) {
      const exemplo = '{ "pecas": ["garfoE.*", "guidao"], "max": 15, "motivo": "a presilha do guidão abraça a coroa" }';
      exigir(objeto(j), `${onde}: ${nome} deve ser ${exemplo}`);
      const fora = Object.keys(j).filter((k) => !CHAVES_DA_JUNTA.includes(k));
      exigir(fora.length === 0, `${onde}: ${nome} não tem o campo "${fora[0]}" (campos: ${CHAVES_DA_JUNTA.join(', ')}). Exemplo: ${exemplo}`);
      exigir(Array.isArray(j.pecas) && j.pecas.length >= 1 && j.pecas.every((x) => typeof x === 'string' && x), `${onde}: ${nome}.pecas deve ser uma lista de ids ou padrões de forma (por exemplo "garfoE.*"). Exemplo: ${exemplo}`);
      exigir(j.max === undefined || (typeof j.max === 'number' && Number.isFinite(j.max) && j.max >= 0), `${onde}: ${nome}.max deve ser um número em mm, finito e maior ou igual a zero`);
      exigir(j.motivo === undefined || typeof j.motivo === 'string', `${onde}: ${nome}.motivo deve ser um texto`);
      const membros = [];
      for (const q of j.pecas) {
        if (q.includes('*')) {
          const re = new RegExp(`^${q.split('*').map((t) => t.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*')}$`);
          const casadas = ids.filter((id) => re.test(id));
          const casadasOcultas = [...ocultos].filter((id) => re.test(id));
          exigir(casadas.length > 0 || casadasOcultas.length > 0, `${onde}: ${nome}.pecas: o padrão "${q}" não casa com nenhuma forma visível (ids: ${ids.join(', ')})`);
          membros.push(...casadas, ...casadasOcultas);
        } else {
          const id = alias(q);
          exigir(ids.includes(id) || ocultos.has(id), `${onde}: ${nome}.pecas cita "${q}", que não é uma forma visível (ids: ${ids.join(', ')})`);
          membros.push(id);
        }
      }
      const unicos = [...new Set(membros)];
      /* a peça oculta fica na junta para o par com uma visível (a unidade isolada o confere); o par entre duas ocultas, e a junta que só tem
         ocultas, saem em silêncio */
      if (unicos.some((id) => ocultos.has(id)) && (unicos.length < 2 || unicos.every((id) => ocultos.has(id)))) continue;
      exigir(unicos.length >= 2, `${onde}: ${nome} precisa de pelo menos duas peças distintas depois de expandir os padrões (veio ${unicos.length}: ${unicos.join(', ') || 'nenhuma'})`);
      for (let a = 0; a < unicos.length; a++) for (let b = a + 1; b < unicos.length; b++) {
        if (ocultos.has(unicos[a]) && ocultos.has(unicos[b])) continue;
        const chave = chaveDoPar(unicos[a], unicos[b]);
        if (existentes.has(chave)) continue;
        existentes.add(chave);
        novos.push({ a: unicos[a], b: unicos[b], tipo: 'atravessa', ...(j.max === undefined ? {} : { max: j.max }), ...(j.motivo === undefined ? {} : { motivo: j.motivo }), junta: `${nome} (${j.pecas.join(', ')})` });
      }
    }
    const resto = tem(g.contato) ? semJuntas(g.contato) : (g.contato ?? {});
    return { ...g, contato: { ...resto, pares: [...(resto.pares ?? []), ...novos] } };
  });
}

/* Os parâmetros resolvidos de cada opção, na ordem das opções (objeto vazio quando não há). */
export function parametrosDasOpcoes(esboco) {
  const e = expandirEsboco(esboco);
  return (Array.isArray(e?.opcoes) ? e.opcoes : []).map((o) => o?.parametros ?? {});
}
