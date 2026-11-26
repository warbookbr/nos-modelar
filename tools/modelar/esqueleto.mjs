#!/usr/bin/env node
/* esqueleto.mjs — o esqueleto de proporção de um robô como árvore de juntas, e o andaime e as articulações gerados dela.
 *
 * Plano `2026-11-26-esqueleto-de-proporcao`, fatia 1. A árvore é a seção `esqueleto` do mesmo `proporcoes.json`
 * (`mecanifica.proporcoes@1`) e usa o mesmo avaliador de fórmulas: todo número abaixo é um número ou uma fórmula "=a + b / 2"
 * sobre `medidas`. Mudar uma medida e rodar o comando move a junta filha e tudo o que pende dela.
 *
 *   "esqueleto": {
 *     "id": "braco-de-prova",            slug do esqueleto
 *     "familia": "humanoide",            família do andaime (peca-mecanica, veiculo, humanoide, sistema-articulado)
 *     "objetivo", "alvo", "intencao"     opcionais; sem eles saem "esqueleto-<id>", "alvo-<id>" e um texto padrão
 *     "saidas": { "andaime": "andaime.json", "articulacoes": "articulacoes.json", "esqueleto": "esqueleto.json" }   relativos ao proporcoes.json;
 *                                       "esqueleto" (a árvore resolvida, com as poses, que a receita da peça lê) é opcional
 *     "chao": 0,                         opcional: altura y do chão em mm (número ou fórmula); elemento abaixo dele é aviso
 *     "poses": { "braco-no-tronco": { "angulos": { "cotovelo-direito": -90 } } }   opcional: ângulo em graus por junta com curso, dentro
 *                                       do curso (o resto fica em 0); a pose `zero`, todos em 0, sempre existe e não se declara
 *     "raiz":   { "id": "tronco", "posicao": [0, "=alturaDoTronco", 0], "raioDaBola": 60 }
 *     "juntas": [
 *       { "id": "ombro-direito", "pai": "tronco",
 *         "comprimento": "=larguraDosOmbros / 2",   mm do centro do pai ao centro desta junta (maior que zero)
 *         "direcao": [1, 0, 0],                      sentido do membro na pose zero; qualquer vetor não nulo (é normalizado)
 *         "raioDaBola": 40, "raioDoBastao": 25,      a bola é da junta; o bastão é o segmento do pai até ela
 *         "eixo": [1, 0, 0],                         eixo de giro da junta (vetor não nulo); sem ele a junta não tem porta
 *         "curso": { "minimo": -60, "maximo": 180 }  graus; sem ele a junta é fixa e não gera articulação
 *       },
 *       { "id": "ombro-esquerdo", "pai": "tronco",
 *         "espelho": { "de": "ombro-direito", "plano": "x", "troca": ["direito", "esquerdo"] } } ]
 *
 * Espelho: a junta com `espelho` copia a junta `de` (que não pode ser outro espelho) e todos os seus descendentes, refletidos pelo
 * plano que passa pela raiz e é perpendicular ao eixo `plano` ("x", "y" ou "z"). Os descendentes ganham o id da fonte com
 * `troca` = [de, para] aplicada (obrigatória quando há descendentes). A direção reflete como vetor e o eixo de giro como pseudovetor
 * (reflete e inverte o sinal), de modo que o lado espelhado flexiona para o mesmo lado que o original. O `pai` da junta espelhada
 * precisa ser o espelho do pai da fonte (ou o próprio pai da fonte, quando ele está sobre o plano), e isso é conferido.
 *
 * O que sai, sem mudar o formato do andaime (`mecanifica.andaime-global@2`):
 *   andaime       uma esfera `bola-<id>` por junta (a raiz inclusa) e um `bastao-<id>` por segmento: cilindro quando o membro é
 *                 paralelo a um eixo, tubo reto (primitiva `tubo`) quando é oblíquo, pois o cilindro do andaime só tem eixo x, y ou z;
 *                 um landmark `junta-<id>` por junta e uma porta `porta-<id>` (cilindro macho no eixo da junta) por junta com `eixo`.
 *   articulacoes  uma `mecanifica.articulacao@1` por junta com `curso`: revolução, fixo é a própria junta, móvel é o primeiro filho
 *                 e acompanham é o resto do que pende dela. Os caminhos são ids de junta; a peça de bolas e bastões (fatia 2) dá
 *                 às instâncias esses mesmos ids.
 *
 *   npm run esqueleto -- --proporcoes=<proporcoes.json>             confere a árvore e que os arquivos gravados batem
 *   npm run esqueleto -- --proporcoes=<proporcoes.json> --escrever  grava o andaime e as articulações nos caminhos de "saidas"
 *
 * Fatia 2: a peça de bolas e bastões (receita que lê `esqueleto.json`; a conta mora em
 * `src/autoria/esqueleto-de-bolas.js`, pura, para a bancada importar sem disco), as poses, o aviso de membro
 * que atravessa outro ou passa do chão em cada pose (`--estrito` faz o aviso reprovar) e as vistas por pose (`--vistas`).
 *
 *   npm run esqueleto -- --proporcoes=<proporcoes.json> --receita=<receita.js>  --vistas=<pasta>: frente, lado e de cima de cada pose
 *
 * `npm run proporcoes` sem --escrever também acusa o andaime e as articulações que ficaram para trás. Determinístico: a mesma
 * entrada dá os mesmos bytes. */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { normalizarAndaimeGlobal } from '../../src/autoria/forma-global.js';
import { avisosDaPose, posesDoEsqueleto, textoDoAviso } from '../../src/autoria/esqueleto-de-bolas.js';
import { lerArgumentos } from './argumentos.mjs';
import { avaliarFormula, ErroDasProporcoes, lerProporcoes, primeiraDiferenca, resolverMedidas } from './proporcoes.mjs';

export const SEGMENTOS_DA_ESFERA = 16;
export const SEGMENTOS_DO_BASTAO = 16;
const ARRED = 6;
const EPS = 1e-9;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const FAMILIAS = ['peca-mecanica', 'veiculo', 'humanoide', 'sistema-articulado'];
const PLANOS = ['x', 'y', 'z'];
const INDICE = { x: 0, y: 1, z: 2 };
const ARQUIVOS = [['andaime', 'o andaime'], ['articulacoes', 'as articulações']];
const OPCIONAIS = [['esqueleto', 'o esqueleto resolvido']];

const objeto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const arred = (n) => Number(n.toFixed(ARRED));
const curto = (a) => a.replace(/\\/g, '/');
const norma = (v) => Math.hypot(...v);
const unitario = (v) => { const n = norma(v); return v.map((x) => x / n); };
const mostrar = (v) => (typeof v === 'string' ? JSON.stringify(v) : JSON.stringify(v) ?? 'ausente');

/* ---------- leitura da árvore ---------- */

function contexto(caminho) {
  const comando = `npm run esqueleto -- --proporcoes=${curto(caminho)}`;
  return { caminho, comando, conserto: (onde) => `corrija ${onde} em ${curto(caminho)} e rode ${comando}` };
}

function numeroDe(valor, campo, medidas, ctx, { positivo = false } = {}) {
  let n;
  if (typeof valor === 'number') n = valor;
  else if (typeof valor === 'string' && valor.startsWith('=')) {
    n = avaliarFormula(valor.slice(1), (nome) => {
      if (!(nome in medidas)) {
        const nomes = Object.keys(medidas);
        throw new ErroDasProporcoes(`${campo} = ${mostrar(valor)}, que usa a medida '${nome}'`, `um destes nomes de "medidas": ${nomes.slice(0, 12).join(', ')}${nomes.length > 12 ? ', ...' : ''}`, `${ctx.conserto(campo)} (ou acrescente '${nome}' em "medidas")`);
      }
      return medidas[nome];
    });
  } else throw new ErroDasProporcoes(`${campo} = ${mostrar(valor)}`, 'um número ou uma fórmula "=..."', ctx.conserto(campo));
  if (!Number.isFinite(n)) throw new ErroDasProporcoes(`${campo} = ${mostrar(valor)}`, 'um número finito', ctx.conserto(campo));
  if (positivo && n <= 0) throw new ErroDasProporcoes(`${campo} = ${n}${typeof valor === 'string' ? ` (de ${mostrar(valor)})` : ''}`, 'um número maior que zero', ctx.conserto(campo));
  return n;
}

function vetorDe(valor, campo, medidas, ctx, { naoNulo = false } = {}) {
  if (!Array.isArray(valor) || valor.length !== 3) throw new ErroDasProporcoes(`${campo} = ${mostrar(valor)}`, 'uma lista [x, y, z] de números ou fórmulas', ctx.conserto(campo));
  const v = valor.map((x, i) => numeroDe(x, `${campo}[${i}]`, medidas, ctx));
  if (naoNulo && norma(v) < EPS) throw new ErroDasProporcoes(`${campo} = ${mostrar(valor)}, um vetor nulo`, 'um vetor com ao menos uma componente diferente de zero', ctx.conserto(campo));
  return v;
}

function slugDe(valor, campo, ctx) {
  if (typeof valor !== 'string' || !SLUG.test(valor)) throw new ErroDasProporcoes(`${campo} = ${mostrar(valor)}`, 'um slug em minúsculas, como "ombro-direito"', ctx.conserto(campo));
  return valor;
}

const refletir = (v, plano) => v.map((x, i) => (i === INDICE[plano] ? -x : x));

/** Lê a seção `esqueleto` e devolve a árvore concreta (espelhos expandidos, números resolvidos, posições em mm). */
export function resolverEsqueleto(doc, medidas, caminho = '<proporcoes.json>') {
  const ctx = contexto(caminho);
  const e = doc.esqueleto;
  if (!objeto(e)) throw new ErroDasProporcoes('nenhuma seção "esqueleto"', '"esqueleto": { "id", "familia", "saidas", "raiz", "juntas" }', `acrescente a seção "esqueleto" em ${curto(caminho)}; o formato está no cabeçalho de tools/modelar/esqueleto.mjs`);
  const id = slugDe(e.id, 'esqueleto.id', ctx);
  if (!FAMILIAS.includes(e.familia)) throw new ErroDasProporcoes(`esqueleto.familia = ${mostrar(e.familia)}`, `uma de ${FAMILIAS.join(', ')}`, ctx.conserto('esqueleto.familia'));
  if (!objeto(e.saidas) || ARQUIVOS.some(([k]) => typeof e.saidas[k] !== 'string' || !e.saidas[k])) {
    throw new ErroDasProporcoes(`esqueleto.saidas = ${mostrar(e.saidas)}`, '{ "andaime": "andaime.json", "articulacoes": "articulacoes.json" }', ctx.conserto('esqueleto.saidas'));
  }
  if (e.saidas.esqueleto !== undefined && (typeof e.saidas.esqueleto !== 'string' || !e.saidas.esqueleto)) {
    throw new ErroDasProporcoes(`esqueleto.saidas.esqueleto = ${mostrar(e.saidas.esqueleto)}`, 'o caminho do arquivo da árvore resolvida, como "esqueleto.json", ou nenhum', ctx.conserto('esqueleto.saidas.esqueleto'));
  }
  if (doc.andaime && curto(doc.andaime.arquivo) === curto(e.saidas.andaime)) {
    throw new ErroDasProporcoes(`o andaime '${curto(e.saidas.andaime)}' declarado em "andaime" e em "esqueleto.saidas"`, 'cada arquivo gerado por uma só seção', ctx.conserto('esqueleto.saidas.andaime'));
  }
  if (!objeto(e.raiz)) throw new ErroDasProporcoes(`esqueleto.raiz = ${mostrar(e.raiz)}`, '{ "id", "posicao": [x, y, z], "raioDaBola" }', ctx.conserto('esqueleto.raiz'));
  const raiz = {
    id: slugDe(e.raiz.id, 'esqueleto.raiz.id', ctx),
    posicao: vetorDe(e.raiz.posicao, 'esqueleto.raiz.posicao', medidas, ctx),
    raioDaBola: numeroDe(e.raiz.raioDaBola, 'esqueleto.raiz.raioDaBola', medidas, ctx, { positivo: true }),
  };
  if (!Array.isArray(e.juntas) || !e.juntas.length) throw new ErroDasProporcoes(`esqueleto.juntas = ${mostrar(e.juntas)}`, 'uma lista com ao menos uma junta', ctx.conserto('esqueleto.juntas'));

  /* 1. as juntas declaradas por inteiro */
  const proprias = new Map();
  const lidas = e.juntas.map((j, i) => {
    const onde = `esqueleto.juntas[${i}]`;
    if (!objeto(j)) throw new ErroDasProporcoes(`${onde} = ${mostrar(j)}`, 'um objeto com id, pai e as medidas da junta', ctx.conserto(onde));
    const jid = slugDe(j.id, `${onde}.id`, ctx);
    const pai = slugDe(j.pai, `${onde}.pai`, ctx);
    if (j.espelho !== undefined) {
      const sobra = Object.keys(j).filter((k) => !['id', 'pai', 'espelho'].includes(k));
      if (sobra.length) throw new ErroDasProporcoes(`${onde} com espelho e também '${sobra.join("', '")}'`, 'só id, pai e espelho: o resto vem da junta espelhada', ctx.conserto(onde));
      if (!objeto(j.espelho) || typeof j.espelho.de !== 'string') throw new ErroDasProporcoes(`${onde}.espelho = ${mostrar(j.espelho)}`, "{ \"de\": id-da-junta, \"plano\": \"x\"|\"y\"|\"z\", \"troca\": [de, para] }", ctx.conserto(`${onde}.espelho`));
      if (!PLANOS.includes(j.espelho.plano)) throw new ErroDasProporcoes(`${onde}.espelho.plano = ${mostrar(j.espelho.plano)}`, `um de ${PLANOS.join(', ')}`, ctx.conserto(`${onde}.espelho.plano`));
      const t = j.espelho.troca;
      if (t !== undefined && !(Array.isArray(t) && t.length === 2 && t.every((s) => typeof s === 'string' && s))) throw new ErroDasProporcoes(`${onde}.espelho.troca = ${mostrar(t)}`, '[trecho do id, trecho que o substitui], como ["direito", "esquerdo"]', ctx.conserto(`${onde}.espelho.troca`));
      return { id: jid, pai, espelho: j.espelho, onde };
    }
    const bola = numeroDe(j.raioDaBola, `${onde}.raioDaBola`, medidas, ctx, { positivo: true });
    const bastao = numeroDe(j.raioDoBastao, `${onde}.raioDoBastao`, medidas, ctx, { positivo: true });
    const junta = {
      id: jid, pai, onde,
      comprimento: numeroDe(j.comprimento, `${onde}.comprimento`, medidas, ctx, { positivo: true }),
      direcao: unitario(vetorDe(j.direcao, `${onde}.direcao`, medidas, ctx, { naoNulo: true })),
      raioDaBola: bola, raioDoBastao: bastao,
      eixo: j.eixo === undefined ? null : unitario(vetorDe(j.eixo, `${onde}.eixo`, medidas, ctx, { naoNulo: true })),
      curso: null,
    };
    if (j.curso !== undefined) {
      if (!objeto(j.curso)) throw new ErroDasProporcoes(`${onde}.curso = ${mostrar(j.curso)}`, '{ "minimo": graus, "maximo": graus }', ctx.conserto(`${onde}.curso`));
      const minimo = numeroDe(j.curso.minimo, `${onde}.curso.minimo`, medidas, ctx), maximo = numeroDe(j.curso.maximo, `${onde}.curso.maximo`, medidas, ctx);
      if (!(minimo < maximo)) throw new ErroDasProporcoes(`${onde}.curso = { minimo: ${minimo}, maximo: ${maximo} }`, 'minimo menor que maximo', ctx.conserto(`${onde}.curso`));
      if (!junta.eixo) throw new ErroDasProporcoes(`${onde} com curso e sem eixo`, 'o eixo de giro da junta que tem curso', ctx.conserto(`${onde}.eixo`));
      junta.curso = { minimo, maximo };
    }
    proprias.set(jid, junta);
    return junta;
  });

  /* 2. espelhos expandidos sobre as juntas próprias */
  const ids = new Set([raiz.id]);
  const duplicada = (jid, onde) => { if (ids.has(jid)) throw new ErroDasProporcoes(`${onde}: o id '${jid}' repetido`, 'um id diferente para cada junta, a raiz inclusa', ctx.conserto(`${onde}.id`)); ids.add(jid); };
  const juntas = [];
  for (const j of lidas) {
    if (!j.espelho) { duplicada(j.id, j.onde); juntas.push(j); continue; }
    const { de, plano, troca } = j.espelho;
    const fonte = proprias.get(de);
    if (!fonte) {
      const eEspelho = lidas.some((x) => x.espelho && x.id === de);
      throw new ErroDasProporcoes(`${j.onde}.espelho.de = '${de}'${eEspelho ? ', que é ele mesmo um espelho' : ', que não existe'}`, `o id de uma junta declarada por inteiro: ${[...proprias.keys()].slice(0, 12).join(', ')}`, ctx.conserto(`${j.onde}.espelho.de`));
    }
    const subarvore = [fonte];
    for (let k = 0; k < subarvore.length; k++) for (const c of proprias.values()) if (c.pai === subarvore[k].id && !subarvore.includes(c)) subarvore.push(c);
    if (subarvore.length > 1 && !troca) throw new ErroDasProporcoes(`${j.onde}.espelho sem "troca", e '${de}' tem ${subarvore.length - 1} descendente(s)`, 'troca: [trecho do id, trecho que o substitui], para nomear os descendentes do lado espelhado', ctx.conserto(`${j.onde}.espelho.troca`));
    const nome = (idFonte) => (idFonte === de ? j.id : idFonte.split(troca[0]).join(troca[1]));
    for (const f of subarvore) {
      const novoId = nome(f.id);
      duplicada(novoId, j.onde);
      juntas.push({
        ...f, id: novoId, pai: f === fonte ? j.pai : nome(f.pai), onde: j.onde, direcao: refletir(f.direcao, plano),
        eixo: f.eixo ? refletir(f.eixo, plano).map((x) => -x) : null,
        espelhoDe: { id: f.id, plano, paiDaFonte: f.pai, raiz: f === fonte },
      });
    }
  }

  /* 3. pai que existe e ciclo */
  const porId = new Map(juntas.map((j) => [j.id, j]));
  for (const j of juntas) {
    if (j.pai !== raiz.id && !porId.has(j.pai)) throw new ErroDasProporcoes(`${j.onde}.pai = '${j.pai}', que não existe`, `a raiz '${raiz.id}' ou um id de junta: ${juntas.slice(0, 12).map((x) => x.id).join(', ')}`, ctx.conserto(`${j.onde}.pai`));
  }
  for (const j of juntas) {
    const visto = [j.id];
    for (let p = j.pai; p !== raiz.id; p = porId.get(p).pai) {
      if (visto.includes(p)) throw new ErroDasProporcoes(`o ciclo ${[...visto.slice(visto.indexOf(p)), p].join(' -> ')} em esqueleto.juntas`, `uma árvore: toda junta chega à raiz '${raiz.id}' subindo pelos pais`, ctx.conserto(`${j.onde}.pai`));
      visto.push(p);
    }
  }

  /* 4. posições e o pai do espelho */
  const posicoes = new Map([[raiz.id, raiz.posicao]]);
  const posicaoDe = (j) => {
    if (posicoes.has(j.id)) return posicoes.get(j.id);
    const base = posicaoDe(j.pai === raiz.id ? { id: raiz.id } : porId.get(j.pai));
    const p = base.map((x, i) => x + j.comprimento * j.direcao[i]);
    posicoes.set(j.id, p);
    return p;
  };
  for (const j of juntas) posicaoDe(j);
  for (const j of juntas) {
    if (!j.espelhoDe?.raiz) continue;
    const { plano, paiDaFonte } = j.espelhoDe;
    const pFonte = posicoes.get(paiDaFonte);
    const esperado = pFonte.map((x, i) => (i === INDICE[plano] ? 2 * raiz.posicao[i] - x : x));
    const real = posicoes.get(j.pai);
    if (esperado.some((x, i) => Math.abs(x - real[i]) > 1e-6)) {
      throw new ErroDasProporcoes(`${j.onde}.pai = '${j.pai}', em ${JSON.stringify(real.map(arred))}`, `o espelho (plano ${plano}) do pai '${paiDaFonte}' de '${j.espelhoDe.id}', em ${JSON.stringify(esperado.map(arred))}`, ctx.conserto(`${j.onde}.pai`));
    }
  }
  const filhos = (jid) => juntas.filter((j) => j.pai === jid);
  for (const j of juntas) if (j.curso && !filhos(j.id).length) throw new ErroDasProporcoes(`a junta '${j.id}' com curso e sem filha`, 'ao menos uma junta que pende dela para girar', ctx.conserto(`${j.onde}.curso`));

  const chao = e.chao === undefined ? null : numeroDe(e.chao, 'esqueleto.chao', medidas, ctx);

  /* poses: ângulo por junta com curso, dentro do curso */
  const poses = [];
  if (e.poses !== undefined) {
    if (!objeto(e.poses)) throw new ErroDasProporcoes(`esqueleto.poses = ${mostrar(e.poses)}`, '{ "nome-da-pose": { "angulos": { "id-da-junta": graus } } }', ctx.conserto('esqueleto.poses'));
    for (const [nome, p] of Object.entries(e.poses)) {
      const onde = `esqueleto.poses.${nome}`;
      if (!SLUG.test(nome) || nome === 'zero') throw new ErroDasProporcoes(`${onde}, o nome ${mostrar(nome)}`, `um slug em minúsculas diferente de "zero" (a pose zero, com todos os ângulos em 0, sempre existe)`, ctx.conserto(onde));
      if (!objeto(p) || (p.angulos !== undefined && !objeto(p.angulos))) throw new ErroDasProporcoes(`${onde} = ${mostrar(p)}`, '{ "angulos": { "id-da-junta": graus } }', ctx.conserto(onde));
      const angulos = {};
      for (const [jid, valor] of Object.entries(p.angulos ?? {})) {
        const campo = `${onde}.angulos.${jid}`;
        const junta = juntas.find((x) => x.id === jid);
        if (!junta?.curso) throw new ErroDasProporcoes(`${campo} = ${mostrar(valor)}, '${jid}' ${junta ? 'sem curso' : 'que não existe'}`, `o id de uma junta com curso: ${juntas.filter((x) => x.curso).map((x) => x.id).join(', ')}`, ctx.conserto(campo));
        const graus = numeroDe(valor, campo, medidas, ctx);
        if (graus < junta.curso.minimo || graus > junta.curso.maximo) {
          throw new ErroDasProporcoes(`${campo} = ${graus}${typeof valor === 'string' ? ` (de ${mostrar(valor)})` : ''}`, `um ângulo entre ${junta.curso.minimo} e ${junta.curso.maximo} graus, o curso da junta '${jid}'`, ctx.conserto(campo));
        }
        angulos[jid] = graus;
      }
      poses.push({ nome, angulos });
    }
  }

  return {
    id, familia: e.familia, saidas: e.saidas, chao, poses,
    objetivo: e.objetivo ?? `esqueleto-${id}`, alvo: e.alvo ?? `alvo-${id}`,
    intencao: e.intencao ?? `Esqueleto de proporção ${id}: uma bola por junta e um bastão por membro, na pose zero.`,
    raiz,
    juntas: juntas.map((j) => ({ ...j, posicao: posicoes.get(j.id) })),
  };
}

/* ---------- geração ---------- */

const descendentes = (arvore, jid) => {
  const lista = [];
  const ir = (p) => { for (const j of arvore.juntas) if (j.pai === p) { lista.push(j.id); ir(j.id); } };
  ir(jid);
  return lista;
};

export function gerarAndaimeDoEsqueleto(arvore) {
  const { raiz, juntas } = arvore;
  const posDe = new Map([[raiz.id, raiz.posicao], ...juntas.map((j) => [j.id, j.posicao])]);
  const volumes = [{ id: `bola-${raiz.id}`, regioes: [raiz.id], tipo: 'esfera', centro: raiz.posicao.map(arred), raio: raiz.raioDaBola, segmentos: SEGMENTOS_DA_ESFERA }];
  const min = raiz.posicao.map((x) => x - raiz.raioDaBola), max = raiz.posicao.map((x) => x + raiz.raioDaBola);
  const cobrir = (p, r) => p.forEach((x, i) => { min[i] = Math.min(min[i], x - r); max[i] = Math.max(max[i], x + r); });
  const landmarks = [{ id: `junta-${raiz.id}`, posicao: raiz.posicao.map(arred) }];
  const portas = [];
  for (const j of juntas) {
    const pai = posDe.get(j.pai), p = j.posicao;
    const meio = p.map((x, i) => (x + pai[i]) / 2);
    volumes.push({ id: `bola-${j.id}`, regioes: [j.id], tipo: 'esfera', centro: p.map(arred), raio: j.raioDaBola, segmentos: SEGMENTOS_DA_ESFERA });
    const paralelo = j.direcao.findIndex((c) => Math.abs(Math.abs(c) - 1) < EPS);
    if (paralelo >= 0) volumes.push({ id: `bastao-${j.id}`, regioes: [j.id], tipo: 'cilindro', centro: meio.map(arred), eixo: PLANOS[paralelo], raio: j.raioDoBastao, comprimento: arred(j.comprimento), segmentos: 24 });
    else {
      const metade = j.direcao.map((c) => (c * j.comprimento) / 2);
      volumes.push({ id: `bastao-${j.id}`, regioes: [j.id], tipo: 'tubo', centro: meio.map(arred), caminho: [metade.map((x) => arred(-x)), metade.map(arred)], raio: j.raioDoBastao, raioCurva: 0, segmentos: SEGMENTOS_DO_BASTAO });
    }
    cobrir(p, j.raioDaBola);
    cobrir(pai, j.raioDoBastao);
    landmarks.push({ id: `junta-${j.id}`, posicao: p.map(arred) });
    if (j.eixo) portas.push({ id: `porta-${j.id}`, interface: { forma: 'cilindro', papel: 'macho', eixo: j.eixo.map(arred), centro: p.map(arred), raio: j.raioDoBastao, inicio: -j.raioDaBola, fim: j.raioDaBola } });
  }
  const andaime = {
    formato: 'mecanifica.andaime-global@2', id: arvore.id, objetivo: arvore.objetivo, alvo: arvore.alvo, familia: arvore.familia,
    intencao: arvore.intencao, unidade: 'mm', eixos: { direita: '+x', cima: '+y', frente: '+z' },
    envelope: { min: min.map(arred), max: max.map(arred) }, landmarks, volumes,
  };
  if (portas.length) andaime.portas = portas;
  normalizarAndaimeGlobal(andaime);
  return andaime;
}

export function gerarArticulacoesDoEsqueleto(arvore) {
  const articulacoes = arvore.juntas.filter((j) => j.curso).map((j) => {
    const filhas = arvore.juntas.filter((f) => f.pai === j.id).map((f) => f.id);
    const movel = filhas[0];
    const acompanham = descendentes(arvore, j.id).filter((d) => d !== movel).map((d) => [d]);
    return {
      id: j.id, tipo: 'revolucao', fixo: { caminho: [j.id], porta: `porta-${j.id}` }, movel: { caminho: [movel], porta: `porta-${j.id}` },
      unidade: 'graus', curso: { minimo: j.curso.minimo, maximo: j.curso.maximo }, passos: Math.max(1, Math.ceil((j.curso.maximo - j.curso.minimo) / 5)),
      folga: { valor: 0, unidade: 'mm' }, acompanham,
    };
  });
  return { nota: `Gerado de esqueleto.juntas em proporcoes.json por npm run esqueleto (${arvore.id}). Não edite à mão. Fixo é a própria junta, móvel é a primeira filha e acompanham é o resto do que pende dela.`, articulacoes };
}

/** A árvore resolvida como JSON (`mecanifica.esqueleto@1`), o que a receita da peça de bolas e bastões lê. */
export function esqueletoResolvido(arvore) {
  const cinco = (v) => v.map((x) => Number(x.toFixed(9)));
  const json = {
    formato: 'mecanifica.esqueleto@1', id: arvore.id, familia: arvore.familia, unidade: 'mm',
    nota: `Gerado de esqueleto em proporcoes.json por npm run esqueleto (${arvore.id}). Não edite à mão: a receita da peça de bolas e bastões lê este arquivo.`,
    chao: arvore.chao,
    raiz: { id: arvore.raiz.id, posicao: arvore.raiz.posicao.map(arred), raioDaBola: arvore.raiz.raioDaBola },
    juntas: arvore.juntas.map((j) => ({
      id: j.id, pai: j.pai, comprimento: arred(j.comprimento), direcao: cinco(j.direcao), raioDaBola: j.raioDaBola, raioDoBastao: j.raioDoBastao,
      eixo: j.eixo ? cinco(j.eixo) : null, curso: j.curso, posicao: j.posicao.map(arred),
    })),
    poses: arvore.poses,
  };
  return json;
}

/** Os avisos de cada pose (a zero primeiro): [{ pose, avisos }]. */
export function avisosDoEsqueleto(arvore) {
  return posesDoEsqueleto(arvore).map((p) => ({ pose: p.nome, avisos: avisosDaPose(arvore, p.angulos) }));
}

const texto = (o) => `${JSON.stringify(o, null, 2)}\n`;

/** Os dois arquivos gerados, como texto, e o caminho de cada um. */
export function gerarEsqueleto(caminho) {
  const doc = lerProporcoes(caminho);
  const medidas = resolverMedidas(doc, caminho);
  const arvore = resolverEsqueleto(doc, medidas, caminho);
  const base = dirname(resolve(caminho));
  const arquivos = [
    { chave: 'andaime', rotulo: 'o andaime', saida: arvore.saidas.andaime, caminho: resolve(base, arvore.saidas.andaime), json: gerarAndaimeDoEsqueleto(arvore) },
    { chave: 'articulacoes', rotulo: 'as articulações', saida: arvore.saidas.articulacoes, caminho: resolve(base, arvore.saidas.articulacoes), json: gerarArticulacoesDoEsqueleto(arvore) },
  ];
  if (arvore.saidas.esqueleto) arquivos.push({ chave: 'esqueleto', rotulo: 'o esqueleto resolvido', saida: arvore.saidas.esqueleto, caminho: resolve(base, arvore.saidas.esqueleto), json: esqueletoResolvido(arvore) });
  return { arvore, arquivos, base };
}

/** Divergências entre os arquivos gravados e o que a árvore gera; vazia quando concordam. Sem seção "esqueleto", vazia. */
export function conferirEsqueleto(caminho, doc = lerProporcoes(caminho)) {
  if (!doc.esqueleto) return [];
  const comando = `npm run esqueleto -- --proporcoes=${curto(caminho)} --escrever`;
  const divergencias = [];
  for (const a of gerarEsqueleto(caminho).arquivos) {
    if (!existsSync(a.caminho)) { divergencias.push({ lugar: curto(a.saida), mensagem: new ErroDasProporcoes(`${a.rotulo} ${curto(a.saida)}, que não existe`, `${a.rotulo} gerado do esqueleto`, comando).message }); continue; }
    const d = primeiraDiferenca(JSON.parse(readFileSync(a.caminho, 'utf8')), a.json);
    if (d) divergencias.push({ lugar: `${curto(a.saida)}${d.onde}`, mensagem: new ErroDasProporcoes(`${curto(a.saida)}${d.onde} = ${d.recebido}`, `${d.esperado}, o que o esqueleto dá`, comando).message });
  }
  return divergencias;
}

/** Grava o andaime e as articulações; devolve os caminhos que mudaram. */
export function escreverEsqueleto(caminho, doc = lerProporcoes(caminho)) {
  if (!doc.esqueleto) return [];
  const mudou = [];
  for (const a of gerarEsqueleto(caminho).arquivos) {
    const t = texto(a.json);
    if (!existsSync(a.caminho) || readFileSync(a.caminho, 'utf8').replace(/\r\n/g, '\n') !== t) { writeFileSync(a.caminho, t); mudou.push(curto(a.saida)); }
  }
  return mudou;
}

const VISTAS_DA_POSE = ['frontal', 'direita', 'superior'];

/** Gera as imagens de frente, lado e de cima de cada pose com `olhar-bancada`, uma receita por pose na própria pasta de saída
 * (a ferramenta de vistas não conhece pose). A pasta fica dentro do repositório (o confinamento recusa fora), por padrão em
 * `tools/bancadas/out/`, que o git ignora. Devolve [{ pose, pasta, imagens }]. */
export function gerarVistasDoEsqueleto(caminho, pastaDeSaida = null) {
  const { arvore, arquivos, base } = gerarEsqueleto(caminho);
  const resolvido = arquivos.find((a) => a.chave === 'esqueleto');
  const ctx = contexto(caminho);
  if (!resolvido) throw new ErroDasProporcoes('esqueleto.saidas sem "esqueleto"', 'o caminho do esqueleto resolvido, como { "esqueleto": "esqueleto.json" }', ctx.conserto('esqueleto.saidas'));
  if (!existsSync(resolvido.caminho)) throw new ErroDasProporcoes(`${curto(resolvido.saida)}, que não existe`, 'o esqueleto resolvido gravado', `${ctx.comando} --escrever`);
  const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
  const pasta = resolve(repo, pastaDeSaida ?? join('tools', 'bancadas', 'out', `esqueleto-${arvore.id}`));
  const dentro = relative(repo, pasta).replace(/\\/g, '/');
  if (dentro.startsWith('..') || isAbsolute(dentro)) throw new ErroDasProporcoes(`--vistas=${curto(pastaDeSaida)}, fora do repositório`, 'uma pasta dentro do repositório (de preferência em tools/bancadas/out/, que o git ignora)', 'npm run esqueleto -- --proporcoes=<proporcoes.json> --vistas=tools/bancadas/out/esqueleto-<id>');
  mkdirSync(pasta, { recursive: true });
  const especificador = (alvo) => { const r = relative(pasta, alvo).replace(/\\/g, '/'); return r.startsWith('.') ? r : `./${r}`; };
  const modulo = resolve(repo, 'src/autoria/esqueleto-de-bolas.js');
  const feitas = [];
  for (const p of posesDoEsqueleto(arvore)) {
    const receita = join(pasta, `receita-${p.nome}.js`);
    writeFileSync(receita, `/* gerado por npm run esqueleto --vistas: a pose '${p.nome}' do esqueleto '${arvore.id}'. */\nimport esqueleto from '${especificador(resolvido.caminho)}' with { type: 'json' };\nimport { receitaDoEsqueleto } from '${especificador(modulo)}';\n\nexport default receitaDoEsqueleto(esqueleto, { pose: '${p.nome}' });\n`);
    const saida = join(dentro, p.nome);
    const r = spawnSync(process.execPath, [join(repo, 'tools/modelar/olhar-bancada.mjs'), join(dentro, `receita-${p.nome}.js`), `--vistas=${VISTAS_DA_POSE.join(',')}`, '--enquadrar', '--sem-contatos', '--sobrescrever', `--saida=${saida}`], { cwd: repo, encoding: 'utf8', timeout: 300000 });
    if (r.status !== 0) throw new ErroDasProporcoes(`as vistas da pose '${p.nome}' falharam (código ${r.status}): ${(r.stderr || r.stdout || '').trim().split('\n').slice(-3).join(' | ')}`, 'as imagens frontal, direita e superior', `node tools/modelar/olhar-bancada.mjs ${join(dentro, `receita-${p.nome}.js`)} --ajuda`);
    const imagens = existsSync(join(repo, saida)) ? readdirSync(join(repo, saida)).filter((f) => f.endsWith('.png')).sort().map((f) => join(saida, f).replace(/\\/g, '/')) : [];
    feitas.push({ pose: p.nome, pasta: saida.replace(/\\/g, '/'), imagens });
  }
  return feitas;
}

const AJUDA = `uso: npm run esqueleto -- --proporcoes=<proporcoes.json> [--escrever] [--estrito] [--vistas=<pasta>] [--json]
  confere a árvore de juntas da seção "esqueleto" e, sem --escrever, que o andaime, as articulações e o esqueleto resolvido gravados batem com ela; sai com 1 se divergirem.
  --escrever grava o andaime, as articulações e o esqueleto resolvido (se declarado) nos caminhos de "esqueleto.saidas".
  Em cada pose (a zero e as de "esqueleto.poses") lista os pares de elementos, bola ou bastão, que se interpenetram (os vizinhos na árvore
  ficam fora da conta) e o elemento abaixo do chão declarado ("esqueleto.chao"). O aviso não reprova.
  --estrito  o aviso de qualquer pose faz o comando sair com 1.
  --vistas=<pasta>  gera as imagens frontal, direita e superior de cada pose (pasta dentro do repositório, de preferência em tools/bancadas/out/, que o git ignora); pede o esqueleto resolvido gravado e um navegador para a bancada.
  --json     imprime divergências e avisos como JSON.
  O formato da árvore está no cabeçalho de tools/modelar/esqueleto.mjs.`;

export function comoCLI(argv, saida = (t) => process.stdout.write(`${t}\n`)) {
  const args = lerArgumentos(argv, { opcoes: ['proporcoes', 'vistas'], bandeiras: ['escrever', 'estrito', 'json', 'ajuda'] });
  if (args.bandeira('ajuda')) { saida(AJUDA); return 0; }
  const caminho = args.opcao('proporcoes');
  if (!caminho) throw new ErroDasProporcoes('nenhum arquivo de proporções', '--proporcoes=<proporcoes.json>', 'npm run esqueleto -- --proporcoes=<pasta-da-montagem>/proporcoes.json');
  const doc = lerProporcoes(caminho);
  if (!doc.esqueleto) throw new ErroDasProporcoes(`${curto(caminho)} sem a seção "esqueleto"`, 'a seção "esqueleto" com raiz, juntas e saidas', `acrescente a seção "esqueleto" em ${curto(caminho)}; o formato está no cabeçalho de tools/modelar/esqueleto.mjs`);
  const json = args.bandeira('json');
  let divergencias = [];
  let escrito = null;
  if (args.bandeira('escrever')) escrito = escreverEsqueleto(caminho, doc);
  else divergencias = conferirEsqueleto(caminho, doc);
  const porPose = avisosDoEsqueleto(gerarEsqueleto(caminho).arvore);
  const total = porPose.reduce((n, p) => n + p.avisos.length, 0);
  const vistas = args.opcao('vistas') ? gerarVistasDoEsqueleto(caminho, args.opcao('vistas')) : null;
  if (json) saida(JSON.stringify({ divergencias, avisos: porPose, ...(vistas ? { vistas } : {}) }, null, 2));
  else {
    if (escrito) saida(escrito.length ? `escrito: ${escrito.join(', ')}` : 'nada a escrever: o andaime, as articulações e o esqueleto resolvido já concordam');
    else if (!divergencias.length) saida('esqueleto, andaime e articulações concordam');
    else { saida(`${divergencias.length} divergência(s):`); for (const d of divergencias) saida(`- ${d.mensagem}`); }
    saida(`poses: ${porPose.map((p) => `${p.pose} (${p.avisos.length ? `${p.avisos.length} aviso(s)` : 'sem aviso'})`).join(', ')}`);
    for (const p of porPose) for (const a of p.avisos) saida(`aviso: ${textoDoAviso(p.pose, a)}`);
    if (vistas) for (const v of vistas) saida(`vistas da pose '${v.pose}': ${v.imagens.join(', ') || v.pasta}`);
  }
  return divergencias.length || (args.bandeira('estrito') && total) ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { process.exitCode = comoCLI(process.argv.slice(2)); } catch (erro) { process.stderr.write(`${erro.message}\n`); process.exitCode = 2; }
}
