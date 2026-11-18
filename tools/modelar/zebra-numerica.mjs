#!/usr/bin/env node
/* zebra-numerica.mjs — a zebra da bancada contada em número: quantas ilhas de reflexo, e quantos laços fechados de listra, a superfície
 * limite da chapa tem em cada região, por faixa de comprimento de onda.
 *
 * POR QUE ELE EXISTE. O que o crítico reprova numa chapa quase plana é a ondulação de 200 a 500 mm que a zebra mostra como laços
 * fechados e listras tortas (rodadas 3 e 4 da lataria do carro). O índice de suavidade (`suavidade-por-regiao.mjs`) ajusta em 40 mm e é
 * cego a ela, e a contagem de extremos em linhas do estudo da rodada 5 tinha ruído de ±5 extremos, porque cada linha cruza a malha onde
 * calha. Aqui a medida é a da própria zebra, sobre a superfície inteira e sem linha: dá o mesmo número com mais ou menos pontos.
 *
 * O QUE ELE CONTA. A zebra da bancada pinta sin(R·d · f), com R o olhar refletido pela normal (R = v - 2 (v·n) n), d a direção da listra
 * e f a frequência (40, listras de 4,5 graus no horizonte do reflexo). Cada região (uma caixa em mm sobre o centro das faces, ou a chapa
 * toda) é amostrada na superfície limite, pelo oráculo exato `superficieLimite` de `procedural/nucleo/subdivisao.js`, numa grade de passo
 * `--passo` mm (a mesma em toda face, soldada nas arestas pela topologia da gaiola, sem soldar por posição). Em cada uma das duas
 * direções que ficam no plano da vista (o olhar é o eixo mais alinhado à normal média da região, ou o de `--olhar`), o campo g = R·d tem
 * extremos locais: cada máximo ou mínimo de g dentro da região é o centro de uma família de curvas de nível fechadas, as ilhas da zebra.
 * A persistência de cada extremo (quanto g precisa descer até a ilha se juntar a outra ou tocar a borda da região, pelo método de
 * persistência de conjuntos de nível, com a borda da região como um ponto único acima de tudo) é a altura da ilha. Conta-se como
 * EXTREMO o que tem persistência de pelo menos `--persistencia` (padrão 0,004, em unidade de g, uns 0,2 grau de giro da normal), e
 * como LAÇO cada nível de listra (g = k π / f, as bordas branco-preto da zebra) entre o extremo e o ponto onde a ilha se junta: é o laço
 * fechado que o crítico vê, inteiro dentro da região. Como a fase das listras muda com a vista e o laço some e volta quando a ilha mal
 * cruza um nível, sai também `lacosEsperados`, a soma de persistência × f / π (a fase média), que é o número estável com a densidade. Por faixa: o comprimento de onda do extremo é o dobro da distância dele ao ponto
 * onde a ilha se junta, e as faixas (`--faixas`, padrão 100,200,500 mm) o separam em menor que 100, de 100 a 200, de 200 a 500 e de 500 em diante.
 *
 * COMO LER. A chapa lisa de verdade dá zero ou poucos extremos (uma ilha que a forma pede, como o abaulado de um capô, é extremo
 * legítimo); a taxa de base é a da chapa de prova `rede-sem-ruido` (`tools/fixtures/correcao-de-superficie/`). A medida não aprova forma:
 * diz quantos laços há e de que tamanho, e a pessoa decide se são a forma pedida ou ondulação. O resultado depende do olhar e do passo
 * só pelo que a grade perde: uma ilha mais estreita que dois passos some, e o teste mede o quanto o número varia entre passos.
 * A medida é da superfície limite da gaiola, antes dos vãos cortados depois, como `onde-ondula.mjs`: roda só os passos `subdivisao`.
 *
 * Uso: node tools/modelar/zebra-numerica.mjs <chapa de prova | caminho da receita> [--passo=<mm>] [--persistencia=<g>] [--frequencia=<f>]
 *        [--faixas=<mm,mm,...>] [--caixas=<json>] [--olhar=<+x|-x|+y|-y|+z|-z>] [--saida=<json>] [--params=<json | arquivo.json>] [--sem-cache]
 *   A receita em arquivo executa com o cache por passo (`tmp/cache-por-prefixo/`, o do `descrever` e da bancada): a segunda medida da mesma
 *   receita recomeça do estado guardado, e `--sem-cache` executa inteira. `--params` mede a variante com outros parâmetros sem editar o
 *   arquivo (`receitaComParams`, em `entrada-de-medida.mjs`, que recusa a receita que lê a tabela dos parâmetros fora de `this.PARAMS`).
 *   (também `npm run zebra -- ...` quando o atalho existir). `--caixas` é um JSON { nome: { x: [min, max], y: [...], z: [...], menos: [...] } } em mm, e
 *   cada caixa é uma região, com `olhar` opcional na própria caixa; sem ele a chapa toda é uma região. O JSON vai para a saída padrão e a
 *   tabela para a saída de erro.
 *
 * EXCLUSÕES. A caixa aceita `menos`, uma lista de sub-regiões tiradas dela, cada uma de um de dois formatos, em mm: outra caixa
 * { x: [min, max], y: [...], z: [...] } (ao menos um eixo; o eixo ausente não limita) ou um disco { centro: [x, y, z], normal: [nx, ny, nz],
 * raio }, que tira o que cai dentro do raio medido no plano do disco, em qualquer distância ao longo da normal (o cilindro do disco; a
 * caixa da região é que limita a profundidade). Serve para tirar da região o que a peça corta depois (um vão, um furo), que a superfície
 * limite ainda cobre e onde a medida contaria ilha que ninguém vê. Como a região, a exclusão vale pelo centro da face da gaiola refinada, e a
 * borda que ela abre é borda da região: a ilha que encosta nela deixa de ser fechada e não conta. A região com `menos` traz `excluidas`, as
 * faces que a exclusão tirou. */
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { refinarGaiola, superficieLimite } from '../../procedural/nucleo/subdivisao.js';
import { CHAPAS_DE_PROVA, receitaDeProva } from '../fixtures/correcao-de-superficie/chapas.mjs';
import { lerArgumentos } from './argumentos.mjs';
import { avisoDoCachePorPasso, executarComCachePorPasso, lerParams, receitaComParams } from './entrada-de-medida.mjs';

export const PADROES = Object.freeze({ passoMm: 25, persistencia: 0.004, frequencia: 40, faixas: Object.freeze([100, 200, 500]) });
const EIXOS = ['x', 'y', 'z'];
const CHAVES_DO_DISCO = ['centro', 'normal', 'raio'];
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const r3 = (x) => Math.round(x * 1000) / 1000;

/** o nome de cada faixa de comprimento de onda: "<100", "100-200", "200-500", ">=500" */
export function nomesDasFaixas(faixas) {
  return [`<${faixas[0]}`, ...faixas.slice(1).map((f, k) => `${faixas[k]}-${f}`), `>=${faixas[faixas.length - 1]}`];
}

/** persistencia(valores, vizinhos, naBorda) -> os pares { pico, sela, persistencia } dos MÁXIMOS de `valores` num grafo, com a borda como
 *  um ponto único de valor infinito ligado aos vértices `naBorda`: todo máximo morre ao juntar-se a outro mais alto ou à borda. */
export function persistencia(valores, vizinhos, naBorda) {
  const n = valores.length; const SUPER = n;
  const ordem = Array.from({ length: n }, (_, i) => i).sort((a, b) => valores[b] - valores[a] || a - b);
  const pai = Array.from({ length: n + 1 }, (_, i) => i); const pico = Array.from({ length: n + 1 }, (_, i) => (i === SUPER ? SUPER : i));
  const visto = new Uint8Array(n + 1); visto[SUPER] = 1;
  const alto = (p) => (p === SUPER ? Infinity : valores[p]);
  const raiz = (a) => { while (pai[a] !== a) { pai[a] = pai[pai[a]]; a = pai[a]; } return a; };
  const pares = [];
  for (const v of ordem) {
    visto[v] = 1;
    const raizes = new Set();
    for (const w of vizinhos[v]) if (visto[w]) raizes.add(raiz(w));
    if (naBorda[v]) raizes.add(raiz(SUPER));
    if (!raizes.size) continue;
    const lista = [...raizes].sort((a, b) => alto(pico[b]) - alto(pico[a]) || a - b);
    const sobrevive = lista[0]; pai[v] = sobrevive;
    for (const r of lista.slice(1)) { pares.push({ pico: pico[r], sela: v, persistencia: valores[pico[r]] - valores[v] }); pai[r] = sobrevive; }
  }
  return pares;
}

/** exclusoesDe(nome, menos) -> os testes (centro em mm -> excluído?) das sub-regiões `menos` de uma região, com a recusa do formato errado */
export function exclusoesDe(nome, menos) {
  if (menos === undefined || menos === null) return [];
  if (!Array.isArray(menos)) throw new Error(`a região '${nome}' espera em \`menos\` uma lista de caixas e discos, e veio ${JSON.stringify(menos)}`);
  const numeros = (v, n) => Array.isArray(v) && v.length === n && v.every((x) => typeof x === 'number' && Number.isFinite(x));
  return menos.map((m, k) => {
    const onde = `a exclusão ${k + 1} da região '${nome}'`;
    if (!m || typeof m !== 'object' || Array.isArray(m)) throw new Error(`${onde} espera um objeto de caixa ou de disco, e veio ${JSON.stringify(m)}`);
    const chaves = Object.keys(m);
    const deCaixa = chaves.filter((c) => EIXOS.includes(c)); const deDisco = chaves.filter((c) => CHAVES_DO_DISCO.includes(c));
    const estranhas = chaves.filter((c) => !EIXOS.includes(c) && !CHAVES_DO_DISCO.includes(c));
    if (estranhas.length) throw new Error(`${onde} tem chave desconhecida (${estranhas.join(', ')}); a caixa usa x, y e z, e o disco usa centro, normal e raio`);
    if (deCaixa.length && deDisco.length) throw new Error(`${onde} mistura caixa (${deCaixa.join(', ')}) com disco (${deDisco.join(', ')}); declare uma exclusão para cada`);
    if (!deCaixa.length && !deDisco.length) throw new Error(`${onde} está vazia; a caixa pede ao menos um de x, y e z, e o disco pede centro, normal e raio`);
    if (deCaixa.length) {
      for (const e of deCaixa) if (!numeros(m[e], 2) || m[e][0] > m[e][1]) throw new Error(`${onde} espera em ${e} o intervalo [min, max] em mm, com min até max, e veio ${JSON.stringify(m[e])}`);
      return (c) => EIXOS.every((e, i) => !m[e] || (c[i] >= m[e][0] && c[i] <= m[e][1]));
    }
    if (!numeros(m.centro, 3)) throw new Error(`${onde} espera no disco o centro [x, y, z] em mm, e veio ${JSON.stringify(m.centro)}`);
    const tamanho = numeros(m.normal, 3) ? Math.hypot(...m.normal) : 0;
    if (!(tamanho > 0)) throw new Error(`${onde} espera no disco a normal [nx, ny, nz] diferente de zero, e veio ${JSON.stringify(m.normal)}`);
    if (!(typeof m.raio === 'number' && Number.isFinite(m.raio) && m.raio > 0)) throw new Error(`${onde} espera no disco o raio em mm maior que zero, e veio ${JSON.stringify(m.raio)}`);
    const n = m.normal.map((x) => x / tamanho);
    return (c) => {
      const d = [c[0] - m.centro[0], c[1] - m.centro[1], c[2] - m.centro[2]]; const ao = d[0] * n[0] + d[1] * n[1] + d[2] * n[2];
      return Math.hypot(d[0] - ao * n[0], d[1] - ao * n[1], d[2] - ao * n[2]) <= m.raio;
    };
  });
}

/** a chave canônica de uma amostra (face, i, j) da grade N x N de uma face de quatro lados: o canto, a aresta (com o parâmetro na
 *  orientação da menor ponta) ou o interior; assim duas faces vizinhas dividem a mesma amostra sem comparar posições */
function chaveDaAmostra(f, fi, i, j, N) {
  const ci = (a, b) => (i === a * N && j === b * N);
  if (ci(0, 0)) return `v${f[0]}`; if (ci(1, 0)) return `v${f[1]}`; if (ci(1, 1)) return `v${f[2]}`; if (ci(0, 1)) return `v${f[3]}`;
  let a = null; let b = null; let t = 0;
  if (j === 0) { a = f[0]; b = f[1]; t = i; } else if (i === N) { a = f[1]; b = f[2]; t = j; } else if (j === N) { a = f[3]; b = f[2]; t = i; } else if (i === 0) { a = f[0]; b = f[3]; t = j; }
  if (a === null) return `f${fi}:${i}:${j}`;
  return a < b ? `a${a}.${b}:${t}` : `a${b}.${a}:${N - t}`;
}

/** zebraNumerica(chapa, { passoMm, persistencia, frequencia, faixas, caixas, olhar }) -> { parametros, regioes: [{ nome, olhar, faces, pontos,
 *  direcoes: [{ eixo, extremos, maximos, minimos, lacos, porFaixa, maiorPersistencia }], extremos, lacos, porFaixa }] }
 *  `chapa` é o neutro de um passo `subdivisao` (a gaiola); `caixas` é { nome: { x, y, z, olhar, menos } } em mm, ou null para a chapa toda;
 *  `menos` é a lista de caixas e discos tirados da região (ver EXCLUSÕES no cabeçalho). */
export function zebraNumerica(chapa, { passoMm = PADROES.passoMm, persistencia: eps = PADROES.persistencia, frequencia = PADROES.frequencia, faixas = PADROES.faixas, caixas = null, olhar = null } = {}) {
  if (!(passoMm > 0)) throw new Error(`--passo espera mm maior que zero, e veio ${passoMm}`);
  if (!(eps > 0)) throw new Error(`--persistencia espera um número maior que zero, e veio ${eps}`);
  if (!(frequencia > 0)) throw new Error(`--frequencia espera um número maior que zero, e veio ${frequencia}`);
  if (!faixas.length || faixas.some((f, k) => !(f > 0) || (k && f <= faixas[k - 1]))) throw new Error('--faixas espera mm crescentes e maiores que zero, como 100,200,500');
  const G = refinarGaiola({ vertices: chapa.vertices, faces: chapa.faces, vincos: chapa.vincos ?? [], cantos: chapa.cantos ?? [], borda: chapa.borda ?? 'suave' });
  if (G.faces.some((f) => f.length !== 4)) throw new Error('a gaiola refinada tem face de mais de quatro lados; a zebra numérica pede quadriláteros');
  const sup = superficieLimite(G);
  const comp = [];
  for (const f of G.faces) for (let k = 0; k < 4; k++) comp.push(dist(G.vertices[f[k]], G.vertices[f[(k + 1) % 4]]) * 1000);
  comp.sort((a, b) => a - b);
  const N = Math.max(1, Math.round(comp[comp.length >> 1] / passoMm));
  const nomes = nomesDasFaixas(faixas);
  const regioesDeclaradas = caixas ?? { chapa: {} };
  const centros = G.faces.map((f) => [0, 1, 2].map((k) => (f.reduce((s, v) => s + G.vertices[v][k], 0) / 4) * 1000));
  const dentro = (c, cx) => EIXOS.every((e, k) => !cx[e] || (c[k] >= cx[e][0] && c[k] <= cx[e][1]));
  /* as amostras, avaliadas uma vez cada, na ordem das faces */
  const indice = new Map(); const pontos = []; const normais = [];
  const amostra = (fi, i, j) => {
    const chave = chaveDaAmostra(G.faces[fi], fi, i, j, N);
    if (indice.has(chave)) return indice.get(chave);
    const a = sup.avaliar(fi, i / N, j / N);
    const k = pontos.length; indice.set(chave, k);
    pontos.push(a.ponto.map((c) => c * 1000)); normais.push(a.normal ?? null);
    return k;
  };
  const regioes = [];
  for (const [nome, cx] of Object.entries(regioesDeclaradas)) {
    const exclusoes = exclusoesDe(nome, cx.menos); let excluidas = 0;
    const faces = []; G.faces.forEach((_, fi) => { if (!dentro(centros[fi], cx)) return; if (exclusoes.some((fora) => fora(centros[fi]))) excluidas++; else faces.push(fi); });
    if (!faces.length && excluidas) throw new Error(`a região '${nome}' ficou sem face: as exclusões de \`menos\` tiram as ${excluidas} faces que a caixa cobre`);
    if (!faces.length) throw new Error(`a região '${nome}' não tem face: a caixa não cobre o centro de nenhuma face da gaiola refinada`);
    const tris = [];
    for (const fi of faces) {
      for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
        const q = [amostra(fi, i, j), amostra(fi, i + 1, j), amostra(fi, i + 1, j + 1), amostra(fi, i, j + 1)];
        if (q.some((k) => !normais[k])) continue;
        tris.push([q[0], q[1], q[2]], [q[0], q[2], q[3]]);
      }
    }
    const usados = [...new Set(tris.flat())].sort((a, b) => a - b); const local = new Map(usados.map((k, m) => [k, m]));
    const vizinhos = usados.map(() => new Set()); const contagemDeAresta = new Map();
    for (const t of tris) for (let k = 0; k < 3; k++) {
      const a = local.get(t[k]); const b = local.get(t[(k + 1) % 3]); vizinhos[a].add(b); vizinhos[b].add(a);
      const c = a < b ? `${a},${b}` : `${b},${a}`; contagemDeAresta.set(c, (contagemDeAresta.get(c) ?? 0) + 1);
    }
    const naBorda = new Uint8Array(usados.length);
    for (const [c, n] of contagemDeAresta) if (n === 1) for (const v of c.split(',')) naBorda[Number(v)] = 1;
    const normalMedia = [0, 0, 0]; for (const k of usados) for (let m = 0; m < 3; m++) normalMedia[m] += normais[k][m];
    let eixoDoOlhar = 0; for (let m = 1; m < 3; m++) if (Math.abs(normalMedia[m]) > Math.abs(normalMedia[eixoDoOlhar])) eixoDoOlhar = m;
    const pedido = cx.olhar ?? olhar;
    let sinal = normalMedia[eixoDoOlhar] >= 0 ? 1 : -1;
    if (pedido) {
      if (!/^[+-][xyz]$/.test(pedido)) throw new Error(`o olhar espera +x, -x, +y, -y, +z ou -z, e veio '${pedido}'`);
      eixoDoOlhar = EIXOS.indexOf(pedido[1]); sinal = pedido[0] === '+' ? 1 : -1;
    }
    const v = [0, 0, 0]; v[eixoDoOlhar] = -sinal;
    const direcoes = [];
    for (const eixo of [0, 1, 2].filter((m) => m !== eixoDoOlhar)) {
      const g = usados.map((k) => { const n = normais[k]; const vn = v[0] * n[0] + v[1] * n[1] + v[2] * n[2]; return (v[eixo] - 2 * vn * n[eixo]); });
      const viz = vizinhos.map((s) => [...s]);
      const lista = [];
      for (const [tipo, sgn] of [['maximo', 1], ['minimo', -1]]) {
        for (const p of persistencia(g.map((x) => sgn * x), viz, naBorda)) {
          if (!(p.persistencia >= eps)) continue;
          const gp = g[p.pico]; const gs = g[p.sela];
          const lo = Math.min(gp, gs); const hi = Math.max(gp, gs);
          const lacos = Math.max(0, Math.floor((hi * frequencia) / Math.PI) - Math.floor((lo * frequencia) / Math.PI));
          const onda = 2 * dist(pontos[usados[p.pico]], pontos[usados[p.sela]]);
          lista.push({ tipo, persistencia: p.persistencia, lacos, esperados: (p.persistencia * frequencia) / Math.PI, ondaMm: onda, ponto: pontos[usados[p.pico]] });
        }
      }
      const porFaixa = Object.fromEntries(nomes.map((n) => [n, { extremos: 0, lacos: 0, lacosEsperados: 0 }]));
      for (const e of lista) { const f = nomes[faixas.filter((x) => e.ondaMm >= x).length]; porFaixa[f].extremos++; porFaixa[f].lacos += e.lacos; porFaixa[f].lacosEsperados += e.esperados; }
      for (const f of Object.values(porFaixa)) f.lacosEsperados = r3(f.lacosEsperados);
      direcoes.push({
        eixo: EIXOS[eixo], extremos: lista.length, maximos: lista.filter((e) => e.tipo === 'maximo').length, minimos: lista.filter((e) => e.tipo === 'minimo').length,
        lacos: lista.reduce((s, e) => s + e.lacos, 0), lacosEsperados: r3(lista.reduce((s, e) => s + e.esperados, 0)), porFaixa, maiorPersistencia: r3(Math.max(0, ...lista.map((e) => e.persistencia))),
        ilhas: lista.sort((a, b) => b.persistencia - a.persistencia || a.ondaMm - b.ondaMm).slice(0, 12).map((e) => ({ tipo: e.tipo, persistencia: r3(e.persistencia), lacos: e.lacos, ondaMm: Math.round(e.ondaMm), ponto: e.ponto.map(Math.round) })),
      });
    }
    const porFaixa = Object.fromEntries(nomes.map((n) => [n, { extremos: direcoes.reduce((s, d) => s + d.porFaixa[n].extremos, 0), lacos: direcoes.reduce((s, d) => s + d.porFaixa[n].lacos, 0), lacosEsperados: r3(direcoes.reduce((s, d) => s + d.porFaixa[n].lacosEsperados, 0)) }]));
    regioes.push({
      nome, olhar: `${sinal > 0 ? '+' : '-'}${EIXOS[eixoDoOlhar]}`, faces: faces.length, ...(cx.menos ? { excluidas } : {}), pontos: usados.length,
      direcoes, extremos: direcoes.reduce((s, d) => s + d.extremos, 0), lacos: direcoes.reduce((s, d) => s + d.lacos, 0), lacosEsperados: r3(direcoes.reduce((s, d) => s + d.lacosEsperados, 0)), porFaixa,
    });
  }
  return { parametros: { passoMm, passoEfetivoMm: r3(comp[comp.length >> 1] / N), persistencia: eps, frequencia, faixas: [...faixas] }, regioes };
}

/** tabelaDaZebra(resultado, nome) -> o texto legível da medida */
export function tabelaDaZebra(res, nome) {
  const nomes = nomesDasFaixas(res.parametros.faixas);
  const col = (t, n) => String(t).padEnd(n); const num = (x, n) => String(x).padStart(n);
  const larg = Math.max(8, ...res.regioes.map((r) => r.nome.length));
  return [`zebra numérica — ${nome}, passo ${res.parametros.passoEfetivoMm} mm, persistência ${res.parametros.persistencia}, f ${res.parametros.frequencia}`,
    `${col('região', larg)}  olhar  ${num('pontos', 7)}  ${num('extremos', 8)}  ${num('laços', 6)}  ${num('esperados', 9)}  ${nomes.map((n) => num(n, 9)).join(' ')}   (extremos/laços por faixa de onda, mm)`,
    ...res.regioes.map((r) => `${col(r.nome, larg)}  ${col(r.olhar, 5)}  ${num(r.pontos, 7)}  ${num(r.extremos, 8)}  ${num(r.lacos, 6)}  ${num(r.lacosEsperados, 9)}  ${nomes.map((n) => num(`${r.porFaixa[n].extremos}/${r.porFaixa[n].lacos}`, 9)).join(' ')}`)].join('\n');
}

export const OPCOES_DA_CLI = ['passo', 'persistencia', 'frequencia', 'faixas', 'caixas', 'olhar', 'saida', 'params'];

function numero(lido, nome, padrao) {
  const t = lido.opcao(nome); if (t === null || t === undefined) return padrao;
  const x = Number(t); if (!Number.isFinite(x)) throw new Error(`--${nome} espera um número, e veio '${t}'`);
  return x;
}

async function principal(argv) {
  let lido;
  try { lido = lerArgumentos(argv.slice(2), { opcoes: OPCOES_DA_CLI, bandeiras: ['ajuda', 'sem-cache'], posicional: { nome: 'chapa', obrigatorio: false } }); } catch (e) { process.stderr.write(`zebra: ${e.message}\n`); return 2; }
  const alvo = lido.posicional;
  if (lido.bandeira('ajuda') || !alvo) {
    process.stderr.write(`uso: node tools/modelar/zebra-numerica.mjs <chapa de prova | caminho da receita> [--${OPCOES_DA_CLI.join('=...] [--')}=...] [--sem-cache]\n  padrões: passo ${PADROES.passoMm} mm, persistência ${PADROES.persistencia}, frequência ${PADROES.frequencia}, faixas ${PADROES.faixas.join(',')} mm; ver o cabeçalho do arquivo\n`);
    return lido.bandeira('ajuda') ? 0 : 2;
  }
  let res; let nome;
  try {
    const faixas = lido.opcao('faixas') ? lido.opcao('faixas').split(',').map(Number) : [...PADROES.faixas];
    if (faixas.some((f) => !Number.isFinite(f))) throw new Error(`--faixas espera mm separados por vírgula, e veio '${lido.opcao('faixas')}'`);
    const caixas = lido.opcao('caixas') ? JSON.parse(readFileSync(resolve(lido.opcao('caixas')), 'utf8')) : null;
    /* a chapa de prova é gerada na hora e não tem arquivo: executa inteira, sem cache, e não aceita --params */
    const abs = CHAPAS_DE_PROVA.includes(alvo) ? null : resolve(alvo);
    let receita = abs ? (await import(pathToFileURL(abs).href)).default : receitaDeProva(alvo);
    const params = lerParams(lido.opcao('params'));
    if (params) receita = receitaComParams(abs ? receita : null, params, { texto: abs ? readFileSync(abs, 'utf8') : null, nome: alvo });
    const executada = await executarComCachePorPasso(abs, { ...receita, PASSOS: receita.PASSOS.filter(([op]) => op === 'subdivisao'), vaos: undefined },
      { cache: !lido.bandeira('sem-cache'), variante: params ? 'so-subdivisao+params' : 'so-subdivisao' });
    process.stderr.write(avisoDoCachePorPasso(executada, 'zebra'));
    const { neutro } = executada.executada;
    const chapa = (neutro.chapas ?? [])[0];
    if (!chapa) throw new Error(`${alvo}: nenhum passo subdivisao na receita`);
    nome = alvo;
    res = zebraNumerica(chapa, { passoMm: numero(lido, 'passo', PADROES.passoMm), persistencia: numero(lido, 'persistencia', PADROES.persistencia), frequencia: numero(lido, 'frequencia', PADROES.frequencia), faixas, caixas, olhar: lido.opcao('olhar') ?? null });
  } catch (e) { process.stderr.write(`zebra: ${e.message}\n`); return 2; }
  const texto = `${JSON.stringify({ alvo: nome, ...res }, null, 1)}\n`;
  if (lido.opcao('saida')) { const s = resolve(lido.opcao('saida')); mkdirSync(dirname(s), { recursive: true }); writeFileSync(s, texto); }
  process.stderr.write(`${tabelaDaZebra(res, nome)}\n`);
  process.stdout.write(texto);
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  principal(process.argv).then((c) => { process.exitCode = c; }, (e) => { process.stderr.write(`${e.message}\n`); process.exitCode = 1; });
}
