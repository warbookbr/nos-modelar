#!/usr/bin/env node
/* alisar-a-superficie.mjs — calcula de uma vez quanto mover cada valor editável de uma receita para tirar as falhas de
 * ondulação da superfície de subdivisão sem afastá-la dos pontos medidos mais que o erro de leitura.
 *
 * POR QUE ELE EXISTE. `npm run ondulacao` acha os amassados, mas não serve de guia quando a falha passa de três espaçamentos
 * da gaiola: mover os pontos que ele cita passa só uma fração do deslocamento ao desvio, porque a versão suavizada
 * acompanha o ponto que se moveu, e a falha reaparece nos vizinhos. Os pontos citados nem sempre se editam: a maioria é
 * estação gerada pela interpolação ou coluna de curva de seção, que saem das estações-chave. A falha vem dos dados das
 * estações-chave, que não combinam entre si, e se corrige no conjunto delas. Esta ferramenta resolve o conjunto.
 *
 * O QUE EDITA. Os valores editáveis são os números da TABELA da receita (ou, sem TABELA, os pontos nomeados de TOPO e de PARAMS
 * escritos como dado) que movem uma entrada declarada da gaiola (a coluna escrita numa estação-chave) ou um ponto-chave de curva
 * de seção. Número que muda a estrutura (posição de estação, passo da interpolação, vinco, peso da medida), que move a costura de
 * simetria ou que não move a gaiola fica de fora. Cada folha da TABELA é sondada: ela anda um passo pequeno, a receita roda de
 * novo e a diferença das posições de todos os pontos da gaiola, por nome, dá a coluna do jacobiano. A gaiola publica de onde cada
 * ponto vem (`origens`), quais entradas existem (`entradas`) e um resumo do que não é entrada (`estrutura`), e é isso que separa o
 * número editável do estrutural, sem a ferramenta conhecer a receita.
 *
 * A REDE DE CURVAS. A gaiola de `gaiolaPorRede` publica o mesmo (`origens`, `entradas`, `estrutura`): os valores editáveis são as coordenadas
 * dos pontos-chave escritos em coordenada numa curva ('cintura[3].y') e dos nós dados por coordenada ('no:cL.y'), e cada edição sai com `onde`,
 * a curva e o ponto-chave (ou o nó) e o eixo. O ponto de dentro de um arco e o de dentro de um retalho saem das curvas e não são entrada nem
 * medida: as medidas são os pontos das curvas (exatos, ou com o peso da leitura), que a edição não afasta mais que a tolerância. A rede
 * decide as divisões de cada arco pelo comprimento dele e espaça os pontos pela curvatura, de modo que um décimo de milímetro pode dar outra
 * divisão e alguns milímetros deslizam os pontos ao longo da curva; por isso a ferramenta fixa, enquanto sonda e confere, as divisões e a
 * posição de cada ponto no arco que a receita tem ao começar (`comDivisoesFixas`, de `gaiola-captura.js`), e a malha é a mesma antes e depois
 * de mexer. No fim ela roda a receita com as edições sem fixar nada, que é o que a pessoa vai ter: se a rede refez a divisão de algum arco,
 * `malhaNova` diz quantos e quantas falhas a malha nova tem, e `alisavel` só vale se ela não tem. Os pontos de dentro de um retalho não são
 * medidas porque seguem o preenchimento das curvas, que a edição move junto.
 *
 * O MODELO LINEAR. A superfície entregue é linear na gaiola declarada: a gaiola ajustada pelas medidas é a declarada vezes um
 * operador fixo (`operadorDasMedidas`, o mesmo sistema do passo, com a fatoração feita uma vez), e cada vértice da malha é o
 * ponto limite da gaiola ajustada, com os pesos tirados do próprio núcleo, três pontos por vez, em grupos de pontos distantes
 * (uma sonda por grupo; `pesosDaMalha` confere que os pesos refazem a malha entregue). O desvio de ondulação de um vértice é
 * linear nas posições da vizinhança quando se fixam os pesos robustos e o referencial do ajuste local (`operador` de
 * `ondulacaoDaSuperficie`), e reproduz o desvio medido. Com isso, o desvio de cada vértice do primeiro nível depois de mexer nos
 * valores editáveis x (em milímetro de deslocamento da entrada) é r = r0 + J x.
 *
 * A SOLUÇÃO. Mínimos quadrados com regularização, sujeitos a limites sobre os pontos medidos e sobre cada edição:
 *
 *   minimizar  ½ Σ_v w_v (r0_v + J_v x)² + ½ μ Σ x²
 *   sujeito a  ‖f0_i + F_i x‖ ≤ raio_i para cada ponto medido i,  ‖F_i x‖ ≤ 0,9 tolerância,  |x_e| ≤ 2 tolerância.
 *
 * Os pontos medidos são as `medidas` da receita (a posição declarada de cada ponto medido, antes da edição, contra o ponto da
 * superfície amarrado a ele, em três dimensões) e, se dados, os contornos dos cortes lidos por `ler-corte.py`, amostrados ao
 * longo do traço (a distância com sinal do ponto à superfície, pela normal, com a tolerância de cada corte). O primeiro limite
 * é a tolerância, ou a distância que o ponto já tinha, se maior, com folga de 10%: a edição não afasta a superfície de um ponto
 * além do erro de leitura nem a piora onde ela já estava mais longe. O segundo impede que a edição escorregue a chapa ao longo
 * de si mesma, onde a distância à superfície não vê, e é o que protege a borda livre. O terceiro diz que nenhuma entrada anda mais
 * que o dobro do erro de leitura: ela é a própria leitura. Os pesos w_v se reajustam três vezes para empurrar para baixo os
 * desvios que sobram. A regularização começa alta (0,3 vez a diagonal média do sistema) e baixa em três passos enquanto a receita
 * rodada com as edições ainda tem falha: fica a tentativa com menos falhas, porque a edição maior nem sempre ajuda, já que o modelo
 * é linear e a receita não é. O problema se resolve pelo método dos multiplicadores
 * (Lagrangiano aumentado) com Newton e fatoração de Cholesky, em ordem fixa. O modelo é linear em torno da receita atual; por isso
 * o resultado é conferido rodando a receita com as edições, e o que sobra de falha e o quanto cada medida se afastou saem da
 * receita rodada, não do modelo. `--rodadas=2` lineariza de novo em torno do resultado da primeira.
 *
 * QUANDO NÃO HÁ SOLUÇÃO. Se depois da edição ainda restam falhas, a forma pede vinco ou estação nova e não alisamento: a
 * ferramenta diz `alisavel: false`, lista as falhas que sobram e, para cada uma, as medidas que estão no limite da tolerância
 * ao redor dela, que são as que impedem a superfície de ceder. As edições saem mesmo assim, como a melhor tentativa dentro da
 * tolerância, e `depois` diz o que elas deixam.
 *
 * Mesma receita, mesma saída: nenhuma conta depende de relógio, acaso ou ordem de mapa.
 *
 *   node tools/mecanifica/alisar-a-superficie.mjs <receita.js> [--cortes=<cortes lidos.json>] [--tolerancia-mm=<erro de leitura>]
 *     [--gravar=<cópia.js>] [--rodadas=1] [--limiar-mm=0.3] [--raio=3] [--zona=1] [--passo=0] [--minimo-mm=0.02] [--maximo-mm=]
 *     [--alcance-mm=15] [--raiz=<pasta>] [--verboso]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { criarResolverNumerico } from '../../procedural/nucleo/expressoes.js';
import { assinaturaDaRede, capturarGaiolas, comDivisoesFixas, divisoesDasRedes } from '../../procedural/nucleo/gaiola-captura.js';
import { operadorDasMedidas, subdividirCatmullClark } from '../../procedural/nucleo/subdivisao.js';
import { PADROES, donoNaGaiola, ondulacaoDaSuperficie, superficiesDaReceita } from './ondulacao-da-superficie.mjs';
import { indiceEspacial, minimosQuadradosComBolas } from './alisar-numerico.mjs';
import { importarReceita, receitaDoModulo } from './importar-receita.mjs';
import { resolverCaminhoReceita } from './resolver-caminho-receita.mjs';

export const PADROES_DO_ALISAMENTO = Object.freeze({
  toleranciaMm: null, rodadas: 1, minimoMm: 0.02, alcanceMm: 15, passoDoCorteMm: 8, regularizacao: null, regularizacoes: [0.3, 0.03, 0.003], passo: 0, reponderacoes: 3,
});
const MM = 1000;
const PENALIDADE = 1000; // a penalidade do método dos multiplicadores, em vezes a diagonal média do sistema
const arred = (x, casas = 3) => { const f = 10 ** casas; const r = Math.round(x * f) / f; return Object.is(r, -0) ? 0 : r; };
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const mesmosNomes = (a, b) => a.length === b.length && a.every((n, k) => n === b[k]);

/* ---------------------------------------------------------------- pesos da malha */

/**
 * pesosDaMalha(sup) -> { aplicar(dQ, v, saida), verificar(), grupos, entradas }
 * Os pesos de cada vértice da malha entregue sobre os pontos da gaiola ajustada (a que o passo subdivide): V = W Q. A malha
 * é linear na gaiola, e os pesos saem do próprio `subdividirCatmullClark`, com uma sonda por grupo de pontos: três grupos por
 * chamada, um em cada eixo. Os pontos de um grupo ficam longe o bastante para que as faces que cada um alcança (até três
 * anéis de faces) não se toquem, de modo que cada vértice da malha só enxerga uma sonda do grupo e o peso dela sai direto.
 */
export function pesosDaMalha(sup) {
  const G = sup.gaiola; const nG = G.vertices.length; const nV = sup.calculados.length;
  const dono = donoNaGaiola(G.faces, sup.niveis);
  const verticesDaFace = G.faces.map(() => new Set());
  sup.faces.forEach((f, fi) => { const g = dono(fi); for (const v of f) verticesDaFace[g].add(v); });
  const facesDoPonto = Array.from({ length: nG }, () => []);
  G.faces.forEach((f, gi) => { for (const p of f) facesDoPonto[p].push(gi); });
  const aneis = (k, n) => {
    let atual = new Set(facesDoPonto[k]); const todos = new Set(atual);
    for (let r = 1; r < n; r++) {
      const novo = new Set();
      for (const g of atual) for (const p of G.faces[g]) for (const h of facesDoPonto[p]) if (!todos.has(h)) { todos.add(h); novo.add(h); }
      atual = novo;
    }
    return todos;
  };
  const cobertura = []; const cor = new Int32Array(nG); const alcance = new Array(nG);
  for (let k = 0; k < nG; k++) {
    const R = aneis(k, 4); alcance[k] = R;
    let c = 0;
    for (; c < cobertura.length; c++) { let livre = true; for (const g of R) if (cobertura[c].has(g)) { livre = false; break; } if (livre) break; }
    if (c === cobertura.length) cobertura.push(new Set());
    for (const g of R) cobertura[c].add(g);
    cor[k] = c;
  }
  const membros = cobertura.map(() => []); for (let k = 0; k < nG; k++) membros[cor[k]].push(k);
  const lv = []; const lc = []; const lw = [];
  for (let c0 = 0; c0 < cobertura.length; c0 += 3) {
    const sonda = G.vertices.map(() => [0, 0, 0]);
    for (let ax = 0; ax < 3 && c0 + ax < cobertura.length; ax++) for (const k of membros[c0 + ax]) sonda[k][ax] = 1;
    const saida = subdividirCatmullClark({ vertices: sonda, faces: G.faces, vincos: G.vincos, cantos: G.cantos, niveis: sup.niveis, borda: G.borda, aoLimite: sup.aoLimite }).vertices;
    for (let ax = 0; ax < 3 && c0 + ax < cobertura.length; ax++) {
      for (const k of membros[c0 + ax]) {
        const vistos = new Set();
        for (const g of alcance[k]) for (const v of verticesDaFace[g]) {
          if (vistos.has(v)) continue; vistos.add(v);
          const w = saida[v][ax];
          if (Math.abs(w) > 1e-14) { lv.push(v); lc.push(k); lw.push(w); }
        }
      }
    }
  }
  /* CSR por vértice */
  const ptr = new Int32Array(nV + 1);
  for (const v of lv) ptr[v + 1] += 1;
  for (let v = 0; v < nV; v++) ptr[v + 1] += ptr[v];
  const col = new Int32Array(lv.length); const val = new Float64Array(lv.length); const prox = ptr.slice(0, nV);
  for (let t = 0; t < lv.length; t++) { const p = prox[lv[t]]++; col[p] = lc[t]; val[p] = lw[t]; }
  const aplicar = (dQ, v, saida) => {
    let x = 0, y = 0, z = 0;
    for (let p = ptr[v]; p < ptr[v + 1]; p++) { const k = 3 * col[p]; const w = val[p]; x += w * dQ[k]; y += w * dQ[k + 1]; z += w * dQ[k + 2]; }
    saida[0] = x; saida[1] = y; saida[2] = z;
  };
  /* a conferência: os pesos refazem a malha entregue, e cada linha soma 1 */
  const verificar = () => {
    const Q = new Float64Array(3 * nG); G.vertices.forEach((p, k) => { Q[3 * k] = p[0]; Q[3 * k + 1] = p[1]; Q[3 * k + 2] = p[2]; });
    const t = [0, 0, 0]; let erro = 0; let somas = 0;
    for (let v = 0; v < nV; v++) {
      aplicar(Q, v, t);
      erro = Math.max(erro, Math.abs(t[0] - sup.calculados[v][0]), Math.abs(t[1] - sup.calculados[v][1]), Math.abs(t[2] - sup.calculados[v][2]));
      let s = 0; for (let p = ptr[v]; p < ptr[v + 1]; p++) s += val[p]; somas = Math.max(somas, Math.abs(s - 1));
    }
    return { erro, somas };
  };
  return { aplicar, verificar, grupos: cobertura.length, entradas: lv.length };
}

/* ---------------------------------------------------------------- folhas editáveis */

/* As folhas numéricas de um objeto: número solto ou lista de números, na ordem das chaves. */
function folhasDe(raiz, nome) {
  const folhas = [];
  for (const chave of Object.keys(raiz)) {
    const v = raiz[chave];
    if (typeof v === 'number' && Number.isFinite(v)) folhas.push({ raiz, nomeDaRaiz: nome, chave, indice: null, valor: v });
    else if (Array.isArray(v) && v.length && v.every((x) => typeof x === 'number' && Number.isFinite(x))) v.forEach((x, i) => folhas.push({ raiz, nomeDaRaiz: nome, chave, indice: i, valor: x }));
  }
  return folhas;
}
const escrever = (f, valor) => { if (f.indice === null) f.raiz[f.chave] = valor; else f.raiz[f.chave][f.indice] = valor; };
const rotuloDaFolha = (f) => (f.indice === null ? f.chave : `${f.chave}[${f.indice}]`);

/* A receita rodada só até as posições da gaiola: os pontos por nome, e a gaiola montada (com origens e entradas) quando ela
   saiu de `gaiolaPorEstacoes`. */
function avaliador(receita, nomes) {
  return () => {
    const { resultado: dict, gaiolas } = capturarGaiolas(() => ({ ...(receita.PARAMS ?? {}), ...(receita.TOPO ?? {}) }));
    const { num } = criarResolverNumerico(dict);
    const pos = nomes.map((n) => (typeof n === 'string' && Array.isArray(dict[n]) ? dict[n].map(num) : null));
    const g = gaiolas.find((x) => mesmosNomes(x.passo.vertices, nomes)) ?? null;
    return { pos, g };
  };
}

/* A entrada da rede de curvas em nomes: o ponto-chave de uma curva ({ curva, pontoChave, eixo }) ou o nó dado por coordenada ({ no, eixo });
   a entrada da gaiola por estações já se cita pelo id, e fica sem referência. */
function referenciaDaEntrada(e) {
  if (e.tipo === 'chave') return { curva: e.curva, pontoChave: e.pontoChave, eixo: e.eixo };
  if (e.tipo === 'no') return { no: e.no, eixo: e.eixo };
  return null;
}

/**
 * descobrirEditaveis(receita, raizes, sup) -> { folhas, recusadas }
 * Sonda cada folha numérica das raízes: o passo anda um pouco, a receita roda e a diferença das posições dos pontos da gaiola
 * diz o que a folha move. Fica a folha que move pontos da gaiola só pelas entradas editáveis (coluna declarada ou ponto-chave de
 * curva); a que muda a estrutura da gaiola, ou a costura de simetria, ou não move nada, vai para `recusadas` com o motivo.
 */
export function descobrirEditaveis(receita, raizes, sup) {
  const nomes = sup.declarados; const nDecl = nomes.length;
  const avaliar = avaliador(receita, nomes);
  const base = avaliar();
  const estruturaBase = base.g ? JSON.stringify(base.g.estrutura) : null;
  const naCostura = nomes.map((_, k) => (sup.simetria && base.pos[k] ? Math.abs(base.pos[k][0]) <= 1e-9 : false));
  const folhas = []; const recusadas = [];
  for (const raiz of raizes) {
    for (const f of folhasDe(raiz.objeto, raiz.nome)) {
      const h = 1e-4 * Math.max(1, Math.abs(f.valor));
      let ev;
      try { escrever(f, f.valor + h); ev = avaliar(); } catch (e) { escrever(f, f.valor); recusadas.push({ folha: rotuloDaFolha(f), motivo: `a receita não roda com a folha movida: ${e.message}` }); continue; }
      escrever(f, f.valor);
      if (base.g && !ev.g) { recusadas.push({ folha: rotuloDaFolha(f), motivo: 'a gaiola deixou de sair da receita' }); continue; }
      if (base.g && JSON.stringify(ev.g.estrutura) !== estruturaBase) { recusadas.push({ folha: rotuloDaFolha(f), motivo: 'muda a estrutura da gaiola (posição de estação, passo, vinco, peso ou nomes)' }); continue; }
      const mov = []; let maximo = 0; let quebraCostura = false;
      for (let k = 0; k < nDecl; k++) {
        if (!base.pos[k] || !ev.pos[k]) continue;
        const d = [0, 1, 2].map((q) => (ev.pos[k][q] - base.pos[k][q]) / h);
        const m = Math.max(Math.abs(d[0]), Math.abs(d[1]), Math.abs(d[2]));
        if (m < 1e-12) continue;
        if (naCostura[k] && Math.abs(d[0]) > 1e-12) quebraCostura = true;
        mov.push({ k, d }); maximo = Math.max(maximo, m);
      }
      if (!mov.length) { recusadas.push({ folha: rotuloDaFolha(f), motivo: 'não move nenhum ponto da gaiola' }); continue; }
      if (quebraCostura) { recusadas.push({ folha: rotuloDaFolha(f), motivo: 'move em x um ponto da costura de simetria' }); continue; }
      let entradas = [];
      let escalaMm = maximo * MM;
      if (base.g) {
        const a = base.g.entradas, b = ev.g.entradas;
        if (a.length !== b.length) { recusadas.push({ folha: rotuloDaFolha(f), motivo: 'muda a lista de entradas da gaiola' }); continue; }
        a.forEach((e, i) => { if (Math.abs(b[i].valor - e.valor) > 1e-15) entradas.push({ id: e.id, d: Math.abs(b[i].valor - e.valor) / h, onde: referenciaDaEntrada(e) }); });
        if (!entradas.length) { recusadas.push({ folha: rotuloDaFolha(f), motivo: 'move pontos da gaiola sem passar por entrada editável' }); continue; }
        escalaMm = Math.max(...entradas.map((e) => e.d)) * MM;
      }
      const pontos = mov.map(({ k, d }) => ({ nome: nomes[k], m: Math.max(Math.abs(d[0]), Math.abs(d[1]), Math.abs(d[2])) })).sort((x, y) => y.m - x.m).slice(0, 3).map((p) => p.nome);
      folhas.push({ ...f, h, mov, escalaMm, entradas: entradas.map((e) => e.id), onde: entradas.map((e) => e.onde).filter(Boolean), pontos });
    }
  }
  return { folhas, recusadas, rastreada: base.g !== null };
}

/* ---------------------------------------------------------------- cortes lidos */

/** pontosDosCortes(json, passoMm) -> [{ corte, p: [x, y, z] em metro, erroMm }] ao longo de cada traço, a cada `passoMm` de arco. */
export function pontosDosCortes(json, passoMm) {
  const lista = Array.isArray(json) ? json : json?.cortes;
  if (!Array.isArray(lista)) throw new Error('alisar: o arquivo de cortes precisa ser o JSON de ler-corte.py, com a lista `cortes`');
  const eixos = { x: 0, y: 1, z: 2 };
  const saida = [];
  for (const c of lista) {
    const uv = c.eixos_uv; const plano = c.eixo;
    if (!Array.isArray(uv) || uv.length !== 2 || !(plano in eixos)) throw new Error(`alisar: o corte ${c.corte} não traz eixo e eixos_uv`);
    for (const pl of c.polilinhas ?? []) {
      let acumulado = Infinity; let anterior = null;
      for (const q of pl.pontos_mm) {
        if (anterior) acumulado += Math.hypot(q[0] - anterior[0], q[1] - anterior[1]); anterior = q;
        if (acumulado < passoMm) continue;
        acumulado = 0;
        const p = [0, 0, 0]; p[eixos[plano]] = c.valor_mm / MM; p[eixos[uv[0]]] = q[0] / MM; p[eixos[uv[1]]] = q[1] / MM;
        saida.push({ corte: c.corte, p, erroMm: c.erro_mm ?? 0 });
      }
    }
  }
  return saida;
}

/* ---------------------------------------------------------------- geometria da malha entregue */

const percentil = (lista, p) => { if (!lista.length) return 0; const s = [...lista].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const resumoDe = (lista) => ({ n: lista.length, medioMm: arred(lista.length ? lista.reduce((s, x) => s + x, 0) / lista.length : 0, 2), p95Mm: arred(percentil(lista, 0.95), 2), maximoMm: arred(lista.length ? Math.max(...lista) : 0, 2) });
const decimaisParaMm = (escalaMm) => Math.max(0, Math.ceil(-Math.log10(0.01 / escalaMm) - 1e-6));

const opcoesDeOndulacao = (o) => ({ limiarMm: o.limiarMm, raio: o.raio, zonaDeclarada: o.zonaDeclarada, emendaGraus: o.emendaGraus });

/* O afastamento de cada ponto medido da superfície, em milímetro: o vetor do ponto medido ao ponto da superfície que a gaiola
   amarrou a ele. A medida de uma receita é a posição declarada de um ponto da gaiola, e o erro de leitura vale no espaço. */
function afastamentosDasMedidas(sup, alvos) {
  const V = sup.calculados;
  return alvos.map((a) => { const p = V[a.indice]; return [MM * (p[0] - a.alvo[0]), MM * (p[1] - a.alvo[1]), MM * (p[2] - a.alvo[2])]; });
}
const norma3 = (v) => Math.hypot(v[0], v[1], v[2]);

function distanciasDosCortes(sup, pontos, alcanceM) {
  const idx = indiceEspacial(sup.calculados, sup.faces);
  return pontos.map((c) => {
    const r = idx.maisPerto(c.p, alcanceM);
    if (!r) return null;
    return MM * dot(r.normal, [r.pe[0] - c.p[0], r.pe[1] - c.p[1], r.pe[2] - c.p[2]]);
  });
}

const compactaFalha = (f) => ({
  tipo: f.tipo, amplitudeMm: f.amplitudeMm, posicaoMm: f.posicaoMm, ...(f.extensaoEmEspacamentos !== undefined ? { extensaoEmEspacamentos: f.extensaoEmEspacamentos } : {}),
  extensaoMm: f.extensaoMm, pontos: (f.pontos ?? []).map((p) => p.nome),
});
const resumoDaOndulacao = (ond) => ({ falhas: ond.falhas.length, maiorAmplitudeMm: ond.falhas.length ? Math.max(...ond.falhas.map((f) => f.amplitudeMm)) : 0, desvioMm: ond.desvioMm, lista: ond.falhas.map(compactaFalha) });

/* ---------------------------------------------------------------- uma rodada */

/* Uma linearização em torno da receita como está, a solução e a conferência rodando a receita com as edições. Não deixa a
   TABELA mexida: as edições voltam como valores novos, e quem chama decide se as aplica. */
function umaRodada({ receita, raizes, o, toleranciaMm, pontosDeCorte, fixo, original, tempo }) {
  const marca = (nome) => { tempo[nome] = (tempo[nome] ?? 0) - Date.now(); };
  const fecha = (nome) => { tempo[nome] += Date.now(); };
  const opOnd = opcoesDeOndulacao(o);
  marca('leitura');
  const sups = superficiesDaReceita(receita);
  const sup = sups[o.passo];
  if (!sup) throw new Error(`alisar: a receita tem ${sups.length} passo(s) subdivisao e o passo ${o.passo} não existe`);
  const ond = ondulacaoDaSuperficie(sup, { ...opOnd, devolverOperador: true });
  const V = sup.calculados; const nV = V.length; const nG = sup.gaiola.vertices.length; const nDecl = sup.declarados.length;
  const imagem = sup.gaiola.imagem ?? null;
  const alcanceM = o.alcanceMm / MM;

  /* os pontos medidos: as medidas da receita, na posição declarada antes de qualquer edição, e os pontos dos cortes */
  const idxAntes = indiceEspacial(V, sup.faces);
  if (!fixo) {
    fixo = { alvos: [], cortes: [], limitesMedidas: null, limitesCortes: null, origemMedidas: null, distanciasDosCortes: null };
    if (sup.declaradaCheia && sup.medidas) {
      const vistos = new Set();
      for (const m of [...sup.medidas].sort((a, b) => a.indice - b.indice)) {
        if (m.indice >= nDecl || typeof sup.declarados[m.indice] !== 'string' || vistos.has(m.indice)) continue;
        /* o ponto de dentro de um retalho da rede de curvas não é leitura: é o preenchimento das curvas, que a cota dele só prende à
           superfície, e a edição o move junto com as curvas */
        if (sup.origemDe?.(m.indice)?.tipo === 'retalho') continue;
        vistos.add(m.indice);
        fixo.alvos.push({ indice: m.indice, nome: sup.declarados[m.indice], alvo: [...sup.declaradaCheia.vertices[m.indice]] });
      }
    }
    fixo.cortes = pontosDeCorte.filter((c) => idxAntes.maisPerto(c.p, alcanceM));
  }
  const f0Medidas = afastamentosDasMedidas(sup, fixo.alvos);
  const pes = fixo.cortes.map((c) => idxAntes.maisPerto(c.p, alcanceM));
  const f0Cortes = fixo.cortes.map((c, j) => (pes[j] ? MM * dot(pes[j].normal, [pes[j].pe[0] - c.p[0], pes[j].pe[1] - c.p[1], pes[j].pe[2] - c.p[2]]) : 0));
  if (!fixo.limitesMedidas) {
    fixo.toleranciasDosCortes = fixo.cortes.map((c) => o.toleranciaMm ?? (c.erroMm > 0 ? c.erroMm : toleranciaMm));
    fixo.limitesMedidas = f0Medidas.map((d) => Math.max(toleranciaMm, norma3(d)));
    fixo.limitesCortes = f0Cortes.map((d, j) => Math.max(fixo.toleranciasDosCortes[j], Math.abs(d)));
    /* de onde a superfície partiu na primeira rodada: as rodadas seguintes medem o quanto ela andou a partir daqui */
    fixo.origemMedidas = fixo.alvos.map((a) => V[a.indice].map((q) => q * MM));
    fixo.distanciasDosCortes = f0Cortes.slice();
  }
  fecha('leitura');

  /* sem falha de ondulação não há o que alisar, e a edição que o ajuste faria por hábito seria só ruído */
  if (ond.falhas.length === 0) {
    const mAntes0 = f0Medidas.map(norma3); const cAntes0 = f0Cortes.map(Math.abs);
    const antes0 = resumoDaOndulacao(ond);
    return {
      fixo, edicoes: [], alisavel: true, sobram: [], antes: antes0, depois: antes0,
      modelo: { semFalhas: true, pontosMedidos: fixo.alvos.length, pontosDeCorte: fixo.cortes.length },
      medidasAntes: resumoDe(mAntes0), medidasDepois: resumoDe(mAntes0), pioresMedidas: [],
      cortesAntes: resumoDe(cAntes0), cortesDepois: resumoDe(cAntes0), porCorte: {},
    };
  }

  /* os pesos da malha e o operador das medidas */
  marca('pesos');
  const W = pesosDaMalha(sup);
  const conf = W.verificar();
  if (!(conf.erro < 1e-8) || !(conf.somas < 1e-8)) throw new Error(`alisar: os pesos da malha não refazem a superfície (erro ${conf.erro.toExponential(2)} m, soma ${conf.somas.toExponential(2)})`);
  const operador = sup.declaradaCheia && sup.medidas
    ? operadorDasMedidas({ vertices: sup.declaradaCheia.vertices, faces: sup.declaradaCheia.faces, vincos: sup.declaradaCheia.vincos, cantos: sup.declaradaCheia.cantos, borda: sup.borda }, sup.medidas)
    : null;
  fecha('pesos');

  /* as folhas editáveis */
  marca('folhas');
  const { folhas, recusadas, rastreada } = descobrirEditaveis(receita, raizes, sup);
  fecha('folhas');
  if (!folhas.length) throw new Error(`alisar: nenhum número da receita move a gaiola por entrada editável (${recusadas.length} recusados); a ferramenta edita a TABELA ou os pontos nomeados de TOPO`);
  const nE = folhas.length;

  /* as linhas do ajuste: o desvio nos vértices do primeiro nível, na metade declarada */
  const linhas = [];
  for (let v = 0; v < ond.amostra; v++) {
    const op = ond.operador[v]; if (!op) continue;
    if (sup.simetria && V[v][0] < -1e-9) continue;
    linhas.push({ v, op, d0: ond.desvios[v] * MM });
  }
  const nR = linhas.length; const nM = fixo.alvos.length; const nC = fixo.cortes.length;
  const posN = new Int32Array(nV).fill(-1); const lista = [];
  const precisa = (v) => { if (posN[v] < 0) { posN[v] = lista.length; lista.push(v); } };
  for (const l of linhas) { precisa(l.v); for (const [a] of l.op.itens) precisa(a); }
  for (const a of fixo.alvos) precisa(a.indice);
  pes.forEach((p) => { if (p) { precisa(p.a); precisa(p.b); precisa(p.c); } });

  /* o jacobiano, coluna a coluna: por milímetro de deslocamento da entrada, o quanto muda o desvio de cada linha e a
     distância a cada ponto medido */
  marca('colunas');
  const J = new Float64Array(nR * nE); const Fm = new Float64Array(3 * nM * nE); const Fc = new Float64Array(nC * nE);
  const dQ = new Float64Array(3 * nG); const tmp = [0, 0, 0]; const dV = new Float64Array(3 * lista.length);
  folhas.forEach((f, e) => {
    const D = Array.from({ length: nG }, () => [0, 0, 0]);
    for (const { k, d } of f.mov) {
      const v = [d[0] / f.escalaMm, d[1] / f.escalaMm, d[2] / f.escalaMm];
      D[k] = v;
      if (imagem && imagem[k] !== k) D[imagem[k]] = [-v[0], v[1], v[2]];
    }
    const Q = operador ? operador.aplicar(D) : D;
    for (let k = 0; k < nG; k++) { dQ[3 * k] = Q[k][0]; dQ[3 * k + 1] = Q[k][1]; dQ[3 * k + 2] = Q[k][2]; }
    for (let p = 0; p < lista.length; p++) { W.aplicar(dQ, lista[p], tmp); dV[3 * p] = tmp[0]; dV[3 * p + 1] = tmp[1]; dV[3 * p + 2] = tmp[2]; }
    for (let r = 0; r < nR; r++) {
      const { v, op } = linhas[r]; const pv = 3 * posN[v];
      let x = dV[pv], y = dV[pv + 1], z = dV[pv + 2];
      for (const [a, pi] of op.itens) { const pa = 3 * posN[a]; x -= pi * dV[pa]; y -= pi * dV[pa + 1]; z -= pi * dV[pa + 2]; }
      J[r * nE + e] = MM * (op.nz[0] * x + op.nz[1] * y + op.nz[2] * z) / op.s;
    }
    fixo.alvos.forEach((a, i) => { const pa = 3 * posN[a.indice]; for (let q = 0; q < 3; q++) Fm[(3 * i + q) * nE + e] = MM * dV[pa + q]; });
    pes.forEach((p, j) => {
      if (!p) return;
      let x = 0, y = 0, z = 0;
      [p.a, p.b, p.c].forEach((vv, t) => { const pa = 3 * posN[vv]; x += p.bary[t] * dV[pa]; y += p.bary[t] * dV[pa + 1]; z += p.bary[t] * dV[pa + 2]; });
      Fc[j * nE + e] = MM * (p.normal[0] * x + p.normal[1] * y + p.normal[2] * z);
    });
  });
  fecha('colunas');

  /* o ajuste */
  const esparsa = (M, n) => Array.from({ length: n }, (_, i) => {
    const cols = []; const vals = [];
    for (let e = 0; e < nE; e++) { const v = M[i * nE + e]; if (Math.abs(v) > 1e-9) { cols.push(e); vals.push(v); } }
    return { colunas: Int32Array.from(cols), valores: Float64Array.from(vals) };
  });
  const maximoMm = o.maximoMm ?? 2 * toleranciaMm;
  const Fmedidas = esparsa(Fm, 3 * nM); const Fcortes = esparsa(Fc, nC);
  const Fteto = folhas.map((_, e) => ({ colunas: Int32Array.of(e), valores: Float64Array.of(1) }));
  /* Cada ponto medido tem duas restrições: a distância dele à superfície depois da edição não passa da tolerância (nem do que
     já era, se maior), e o ponto da superfície amarrado a ele não anda mais que a tolerância, para que a edição não escorregue a
     chapa ao longo de si mesma, onde a distância não vê. Os raios deixam uma folga de 10% da tolerância, porque o modelo é
     linear e a receita não é. Nenhuma entrada anda mais que o dobro do erro de leitura: ela é a própria leitura. */
  const F = [...Fmedidas, ...Fcortes, ...Fmedidas, ...Fcortes, ...Fteto];
  const nA = 3 * nM + nC;
  const andouMedidas = fixo.alvos.flatMap((a, i) => V[a.indice].map((q, k) => q * MM - fixo.origemMedidas[i][k]));
  const andouCortes = f0Cortes.map((d, j) => d - fixo.distanciasDosCortes[j]);
  const jaEditado = folhas.map((f) => (f.valor - original.get(`${f.nomeDaRaiz}.${rotuloDaFolha(f)}`)) * f.escalaMm);
  const f0 = Float64Array.from([...f0Medidas.flat(), ...f0Cortes, ...andouMedidas, ...andouCortes, ...jaEditado]);
  const grupos = [
    ...f0Medidas.map((d, i) => ({ linhas: [3 * i, 3 * i + 1, 3 * i + 2], raio: Math.max(0.9 * toleranciaMm, norma3(d)) })),
    ...f0Cortes.map((d, j) => ({ linhas: [3 * nM + j], raio: Math.max(0.9 * fixo.toleranciasDosCortes[j], Math.abs(d)) })),
    ...f0Medidas.map((_, i) => ({ linhas: [nA + 3 * i, nA + 3 * i + 1, nA + 3 * i + 2], raio: 0.9 * toleranciaMm })),
    ...f0Cortes.map((_, j) => ({ linhas: [nA + 3 * nM + j], raio: 0.9 * fixo.toleranciasDosCortes[j] })),
    ...folhas.map((_, e) => ({ linhas: [2 * nA + e], raio: maximoMm })),
  ];
  const linhasEsparsas = esparsa(J, nR);
  const livres = linhas.map((l) => ond.foraDaZona(l.v));
  const mAntes = f0Medidas.map(norma3); const cAntes = f0Cortes.map(Math.abs);
  let partida = null;

  /* Uma tentativa com uma regularização: o ajuste (com os pesos reajustados), as edições que saem dele, a receita rodada com
     elas e o balanço do que sobra. */
  const tentar = (regularizacao) => {
    marca('ajuste');
    const peso = new Float64Array(nR).fill(1);
    let x = new Float64Array(nE); let ultima = null; let previsto = 0;
    for (let it = 0; it <= o.reponderacoes; it++) {
      const H = new Float64Array(nE * nE); const g = new Float64Array(nE);
      for (let r = 0; r < nR; r++) {
        const { colunas, valores } = linhasEsparsas[r]; const w = peso[r]; const d0 = linhas[r].d0;
        for (let a = 0; a < colunas.length; a++) {
          const ca = colunas[a], va = w * valores[a];
          g[ca] -= va * d0;
          for (let b = 0; b <= a; b++) H[ca * nE + colunas[b]] += va * valores[b];
        }
      }
      for (let i = 0; i < nE; i++) for (let j = i + 1; j < nE; j++) H[i * nE + j] = H[j * nE + i];
      let traco = 0; for (let i = 0; i < nE; i++) traco += H[i * nE + i];
      const mu = regularizacao * (traco / nE || 1);
      for (let i = 0; i < nE; i++) H[i * nE + i] += mu;
      ultima = minimosQuadradosComBolas({ H, g, n: nE, F, f0, grupos, x0: partida?.x, lambda0: partida?.lambda, kappa: PENALIDADE * (traco / nE || 1), externas: 6, tolerancia: 0.02 });
      x = ultima.x; partida = ultima;
      previsto = 0;
      for (let r = 0; r < nR; r++) {
        let rr = linhas[r].d0; const { colunas, valores } = linhasEsparsas[r];
        for (let a = 0; a < colunas.length; a++) rr += valores[a] * x[colunas[a]];
        peso[r] = 1 + 4 * (rr / o.limiarMm) ** 2;
        if (livres[r]) previsto = Math.max(previsto, Math.abs(rr));
      }
    }
    fecha('ajuste');

    /* as edições: o valor novo de cada folha, arredondado ao centésimo de milímetro da entrada */
    const edicoes = [];
    folhas.forEach((f, e) => {
      if (Math.abs(x[e]) < o.minimoMm) return;
      const decimais = decimaisParaMm(f.escalaMm);
      const novoExato = Number((f.valor + x[e] / f.escalaMm).toFixed(decimais));
      if (novoExato === f.valor) return;
      edicoes.push({
        folhaRef: f, tabela: f.chave, indice: f.indice, raiz: f.nomeDaRaiz, antigo: f.valor, novoExato,
        deslocamentoMm: arred((novoExato - f.valor) * f.escalaMm, 2), escalaMm: f.escalaMm, entradas: f.entradas, onde: f.onde,
      });
    });

    /* a conferência: a receita rodada com as edições */
    marca('conferencia');
    const valoresAntes = edicoes.map((e) => e.folhaRef.valor);
    for (const e of edicoes) escrever(e.folhaRef, e.novoExato);
    let supN; let ondN;
    try {
      supN = superficiesDaReceita(receita)[o.passo];
      ondN = ondulacaoDaSuperficie(supN, { ...opOnd, devolverDesvios: true });
    } finally {
      edicoes.forEach((e, k) => escrever(e.folhaRef, valoresAntes[k]));
    }
    fecha('conferencia');
    if (supN.calculados.length !== nV) throw new Error('alisar: a receita com as edições mudou o número de vértices da malha; as edições mexeram na estrutura');
    const fMedidas = afastamentosDasMedidas(supN, fixo.alvos);
    const fCortes = distanciasDosCortes(supN, fixo.cortes, alcanceM);
    let erroQuadrado = 0;
    linhas.forEach((l, r) => {
      let pred = l.d0; const { colunas, valores } = linhasEsparsas[r];
      for (let a = 0; a < colunas.length; a++) pred += valores[a] * x[colunas[a]];
      erroQuadrado += (pred - ondN.desvios[l.v] * MM) ** 2;
    });
    const modelo = {
      folhasEditaveis: nE, folhasRecusadas: recusadas.length, rastreadas: rastreada, linhas: nR, pontosMedidos: nM, pontosDeCorte: nC,
      regularizacao, desvioPrevistoMm: arred(previsto, 3), passosDoAjuste: { externos: ultima.externas, internos: ultima.internas }, violacaoMaximaMm: arred(ultima.violacaoMaxima, 3), diferencaDoModeloMm: arred(Math.sqrt(erroQuadrado / Math.max(1, nR)), 3),
    };

    /* o balanço */
    const mDepois = fMedidas.map(norma3);
    const cDepois = fCortes.map((d, j) => (d === null ? cAntes[j] : Math.abs(d)));
    const excede = (d, t) => d > t * 1.05 + 0.05;
    const foraMedidas = fMedidas.map((d, i) => excede(norma3(d), fixo.limitesMedidas[i]));
    const foraCortes = fCortes.map((d, j) => d !== null && excede(Math.abs(d), fixo.limitesCortes[j]));
    const medidasForaDoLimite = foraMedidas.filter(Boolean).length + foraCortes.filter(Boolean).length;
    const depois = resumoDaOndulacao(ondN);
    const alisavel = depois.falhas === 0 && medidasForaDoLimite === 0;
    const sobram = [];
    if (!alisavel) {
      const ativos = [];
      fixo.alvos.forEach((a, i) => ativos.push({ tipo: 'medida', nome: a.nome, pos: supN.calculados[a.indice].map((q) => arred(q * MM, 1)), d: norma3(fMedidas[i]), t: fixo.limitesMedidas[i], xyz: supN.calculados[a.indice] }));
      fixo.cortes.forEach((c, j) => { if (fCortes[j] !== null) ativos.push({ tipo: 'corte', nome: c.corte, pos: c.p.map((q) => arred(q * MM, 1)), d: Math.abs(fCortes[j]), t: fixo.limitesCortes[j], xyz: c.p }); });
      for (const f of ondN.falhas) {
        const centro = f.posicaoMm.map((q) => q / MM); const alcance = Math.max(f.extensaoMm, 3 * f.espacamentoMm) / MM;
        const longe = (a) => Math.hypot(a.xyz[0] - centro[0], a.xyz[1] - centro[1], a.xyz[2] - centro[2]);
        const perto = ativos.filter((a) => a.d >= 0.85 * a.t && longe(a) <= alcance)
          .sort((p, q) => longe(p) - longe(q) || (p.nome < q.nome ? -1 : 1)).slice(0, 6)
          .map((a) => ({ tipo: a.tipo, nome: a.nome, posicaoMm: a.pos, distanciaMm: arred(a.d, 2), limiteMm: arred(a.t, 2) }));
        sobram.push({ ...compactaFalha(f), impedem: perto });
      }
    }
    const movimento = fixo.alvos.map((a, i) => ({ ponto: a.nome, antesMm: arred(mAntes[i], 2), depoisMm: arred(mDepois[i], 2), moveuMm: arred(norma3([fMedidas[i][0] - f0Medidas[i][0], fMedidas[i][1] - f0Medidas[i][1], fMedidas[i][2] - f0Medidas[i][2]]), 2), limiteMm: arred(fixo.limitesMedidas[i], 2) }))
      .sort((p, q) => Math.abs(q.moveuMm) - Math.abs(p.moveuMm) || (p.ponto < q.ponto ? -1 : 1)).slice(0, 10);
    const cortesPorNome = new Map();
    fixo.cortes.forEach((c, j) => {
      if (!cortesPorNome.has(c.corte)) cortesPorNome.set(c.corte, { antes: [], depois: [], moveu: 0 });
      const r = cortesPorNome.get(c.corte); r.antes.push(cAntes[j]); r.depois.push(cDepois[j]); r.moveu = Math.max(r.moveu, Math.abs((fCortes[j] ?? f0Cortes[j]) - f0Cortes[j]));
    });
    const porCorte = Object.fromEntries([...cortesPorNome].map(([nome, r]) => [nome, { antes: resumoDe(r.antes), depois: resumoDe(r.depois), moveuMaximoMm: arred(r.moveu, 2) }]));
    return {
      edicoes, modelo, depois, alisavel,
      ...(alisavel ? {} : { motivo: depois.falhas ? `não alisável dentro da tolerância de ${arred(toleranciaMm, 2)} mm: depois das edições ainda há ${depois.falhas} falha(s) de ondulação, e a forma pede vinco ou estação nova` : `as edições tiraram as falhas, mas afastaram ${medidasForaDoLimite} ponto(s) medido(s) além do limite` }),
      sobram,
      medidasDepois: resumoDe(mDepois), pioresMedidas: movimento,
      cortesDepois: resumoDe(cDepois), porCorte,
    };
  };

  /* A regularização começa alta e baixa por passos enquanto a receita rodada com as edições ainda tem falha: a edição maior
     nem sempre ajuda, porque o modelo é linear e a receita não é, e fica a tentativa com menos falhas (ou, empatando, a de menor
     amplitude e, depois, a de menor edição). */
  const grade = o.regularizacao != null ? [o.regularizacao] : o.regularizacoes;
  let melhor = null;
  for (const regularizacao of grade) {
    const t = tentar(regularizacao);
    const melhora = !melhor || (t.depois.falhas < melhor.depois.falhas) || (t.depois.falhas === melhor.depois.falhas && t.depois.maiorAmplitudeMm < melhor.depois.maiorAmplitudeMm - 1e-9);
    if (t.alisavel && (!melhor || !melhor.alisavel)) { melhor = t; break; }
    if (melhora) melhor = t;
  }
  return {
    fixo, ...melhor,
    antes: resumoDaOndulacao(ond),
    medidasAntes: resumoDe(mAntes), cortesAntes: resumoDe(cAntes),
  };
}

/* A receita com as edições acumuladas, sem fixar as divisões. Devolve se a malha é a mesma e, se não for, quantos arcos mudaram de
   divisão e as falhas de ondulação que a malha nova tem. A TABELA volta como estava. */
function conferirSemFixar({ receita, raizes, acumulado, fixas, leituraDaGaiola, o }) {
  if (!fixas.size || !acumulado.length) return { malhaIgual: true };
  const alvos = acumulado.map((a) => {
    const objeto = raizes.find((r) => r.nome === a.raiz).objeto;
    return { objeto, tabela: a.tabela, indice: a.indice, novo: a.novo };
  });
  const antes = alvos.map((a) => (a.indice === null ? a.objeto[a.tabela] : a.objeto[a.tabela][a.indice]));
  const pr = (a, v) => { if (a.indice === null) a.objeto[a.tabela] = v; else a.objeto[a.tabela][a.indice] = v; };
  alvos.forEach((a) => pr(a, a.novo));
  try {
    let arcos = 0;
    for (const g of leituraDaGaiola()) {
      const fixa = g.estrutura?.definicao ? fixas.get(assinaturaDaRede(g.estrutura.definicao)) : null;
      if (!fixa) continue;
      for (const [arco, n] of Object.entries(g.estrutura.divisoes)) if (fixa.divisoes[arco] !== n) arcos += 1;
    }
    if (!arcos) return { malhaIgual: true };
    const sup = superficiesDaReceita(receita)[o.passo];
    const ond = ondulacaoDaSuperficie(sup, opcoesDeOndulacao(o));
    return { malhaIgual: false, arcosComOutraDivisao: arcos, falhas: ond.falhas.length, maiorAmplitudeMm: ond.falhas.length ? Math.max(...ond.falhas.map((f) => f.amplitudeMm)) : 0 };
  } finally {
    alvos.forEach((a, k) => pr(a, antes[k]));
  }
}

/**
 * alisarReceita({ receita, tabela }, opcoes) -> o relatório do alisamento.
 * `tabela` é o objeto de números que a receita lê e que a ferramenta edita no lugar (e devolve como estava ao fim): a TABELA do
 * módulo, lida de novo pela receita a cada acesso a `PASSOS`, `PARAMS` e `TOPO`. Sem `tabela`, os números editáveis são os
 * pontos nomeados de `TOPO` e de `PARAMS`, quando são dado e não conta. Opções: as da ondulação (`limiarMm`, `raio`,
 * `zonaDeclarada`, `emendaGraus`), `cortes` (o JSON de `ler-corte.py`), `toleranciaMm`, `rodadas`, `minimoMm`, `alcanceMm`,
 * `passoDoCorteMm`, `regularizacao`, `passo` (qual passo `subdivisao`) e `reponderacoes`.
 */
export function alisarReceita({ receita, tabela = null }, opcoes = {}) {
  const o = { ...PADROES, ...PADROES_DO_ALISAMENTO, ...opcoes };
  const raizes = [];
  if (tabela) raizes.push({ nome: 'TABELA', objeto: tabela });
  else {
    for (const nome of ['TOPO', 'PARAMS']) {
      const d = Object.getOwnPropertyDescriptor(receita, nome);
      if (d && 'value' in d && d.value && typeof d.value === 'object') raizes.push({ nome, objeto: d.value });
    }
  }
  if (!raizes.length) throw new Error('alisar: a receita não tem TABELA, nem TOPO ou PARAMS como dado, e não há o que editar');
  const chaveDe = (f) => `${f.nomeDaRaiz}.${rotuloDaFolha(f)}`;
  const original = new Map(raizes.flatMap((r) => folhasDe(r.objeto, r.nome).map((f) => [chaveDe(f), f.valor])));
  const restaurar = () => { for (const r of raizes) for (const f of folhasDe(r.objeto, r.nome)) { const v = original.get(chaveDe(f)); if (v !== undefined) escrever(f, v); } };
  const cortesJson = o.cortes ?? null;
  const listaDeCortes = cortesJson ? (Array.isArray(cortesJson) ? cortesJson : cortesJson.cortes) : [];
  const pontosDeCorte = cortesJson ? pontosDosCortes(cortesJson, o.passoDoCorteMm) : [];
  const erros = listaDeCortes.map((c) => c.erro_mm ?? 0).filter((e) => e > 0).sort((a, b) => a - b);
  const toleranciaMm = o.toleranciaMm ?? (erros.length ? erros[Math.floor((erros.length - 1) / 2)] : 2);
  const tempo = {};
  const rodadas = []; let fixo = null;
  /* A rede de curvas decide as divisões de cada arco pelo comprimento dele, e um décimo de milímetro a mais pode mudar a malha. Aqui as
     divisões que a receita tem agora ficam fixas em todas as rodadas, para que a malha seja a mesma antes e depois de mexer nos números;
     a conferência no fim roda a receita sem fixar nada, que é o que a pessoa vai ter. */
  const leituraDaGaiola = () => capturarGaiolas(() => ({ ...(receita.PARAMS ?? {}), ...(receita.TOPO ?? {}) })).gaiolas;
  const fixas = divisoesDasRedes(leituraDaGaiola());
  try {
    comDivisoesFixas(fixas, () => {
      for (let rodada = 0; rodada < o.rodadas; rodada++) {
        const r = umaRodada({ receita, raizes, o, toleranciaMm, pontosDeCorte, fixo, original, tempo });
        fixo = r.fixo;
        rodadas.push(r);
        if (!r.edicoes.length || r.alisavel || rodada + 1 === o.rodadas) break;
        for (const e of r.edicoes) escrever(e.folhaRef, e.novoExato);
      }
    });
  } finally {
    /* a TABELA volta ao que era; as edições saem no relatório e `gravarCopia` as põe numa cópia */
    restaurar();
  }
  /* vale a melhor rodada (menos falhas, depois menor amplitude), com as edições de todas as anteriores */
  let k = 0;
  rodadas.forEach((r, i) => {
    if (r.alisavel && !rodadas[k].alisavel) k = i;
    else if (!rodadas[k].alisavel && (r.depois.falhas < rodadas[k].depois.falhas || (r.depois.falhas === rodadas[k].depois.falhas && r.depois.maiorAmplitudeMm < rodadas[k].depois.maiorAmplitudeMm - 1e-9))) k = i;
  });
  const final = rodadas[k];
  /* as edições acumuladas contra os valores originais */
  const acumulado = new Map();
  for (const r of rodadas.slice(0, k + 1)) for (const e of r.edicoes) {
    const chave = `${e.raiz}.${e.indice === null ? e.tabela : `${e.tabela}[${e.indice}]`}`;
    const a = acumulado.get(chave) ?? { raiz: e.raiz, tabela: e.tabela, indice: e.indice, antigo: original.get(chave), entradas: e.entradas, onde: e.onde, escalaMm: e.escalaMm };
    a.novo = e.novoExato;
    acumulado.set(chave, a);
  }
  const edicoes = [...acumulado.values()].map((a) => ({
    tabela: a.tabela, ...(a.indice === null ? {} : { indice: a.indice }), antigo: a.antigo, novo: a.novo, deslocamentoMm: arred((a.novo - a.antigo) * a.escalaMm, 2), entradas: a.entradas,
    ...(a.onde?.length ? { onde: a.onde } : {}),
  })).filter((e) => e.deslocamentoMm !== 0)
    .sort((a, b) => Math.abs(b.deslocamentoMm) - Math.abs(a.deslocamentoMm) || (a.tabela < b.tabela ? -1 : a.tabela > b.tabela ? 1 : (a.indice ?? 0) - (b.indice ?? 0)));
  /* a conferência sem fixar as divisões: a receita com as edições, como a pessoa a vai rodar. Se a rede refez a divisão de algum arco, a
     malha é outra e a leitura de ondulação dela é que vale. */
  const malha = conferirSemFixar({ receita, raizes, acumulado: [...acumulado.values()], fixas, leituraDaGaiola, o });
  const semFalhaNaMalhaNova = malha.malhaIgual || malha.falhas === 0;
  const alisavel = final.alisavel && semFalhaNaMalhaNova;
  const motivo = final.alisavel && !semFalhaNaMalhaNova
    ? `com as edições a rede refaz as divisões de ${malha.arcosComOutraDivisao} arco(s), e a malha nova tem ${malha.falhas} falha(s) de ondulação; rode de novo com --rodadas=2 a partir dela`
    : final.motivo;
  const resultado = {
    tolerancia: { medidasMm: arred(toleranciaMm, 2), limiarMm: o.limiarMm },
    antes: rodadas[0].antes,
    depois: final.depois,
    alisavel,
    ...(alisavel ? {} : { motivo, sobram: final.sobram }),
    ...(malha.malhaIgual ? {} : { malhaNova: malha }),
    edicoes,
    medidas: { antes: rodadas[0].medidasAntes, depois: final.medidasDepois, piores: final.pioresMedidas },
    ...(cortesJson ? { cortes: { antes: rodadas[0].cortesAntes, depois: final.cortesDepois, porCorte: final.porCorte } } : {}),
    modelo: final.modelo,
    rodadas: rodadas.map((r) => ({ edicoes: r.edicoes.length, falhasDepois: r.depois.falhas })),
    rodadaEscolhida: k + 1,
  };
  if (o.verboso) process.stderr.write(`alisar: tempo em ms ${JSON.stringify(tempo)}\n`);
  return resultado;
}

/* ---------------------------------------------------------------- linha de comando */

function lerArgumentos(args) {
  const o = {}; let alvo = null;
  const nomes = {
    'tolerancia-mm': ['toleranciaMm', Number], 'limiar-mm': ['limiarMm', Number], raio: ['raio', Number], zona: ['zonaDeclarada', Number],
    'emenda-graus': ['emendaGraus', Number], rodadas: ['rodadas', Number], passo: ['passo', Number], 'minimo-mm': ['minimoMm', Number],
    'alcance-mm': ['alcanceMm', Number], 'maximo-mm': ['maximoMm', Number], reponderacoes: ['reponderacoes', Number], gravar: ['gravar', String], raiz: ['raiz', String], cortes: ['cortes', String], regularizacao: ['regularizacao', Number],
  };
  for (const a of args) {
    if (a === '--verboso') { o.verboso = true; continue; }
    const m = /^--([a-z-]+)=(.+)$/.exec(a);
    if (!m) { if (alvo === null && !a.startsWith('--')) { alvo = a; continue; } throw new Error(`alisar: argumento desconhecido ${a}`); }
    if (!nomes[m[1]]) throw new Error(`alisar: opção desconhecida ${a}; as opções são ${Object.keys(nomes).map((k) => `--${k}=`).join(', ')}`);
    const [chave, tipo] = nomes[m[1]];
    const x = tipo(m[2]);
    if (tipo === Number && !(x >= 0)) throw new Error(`alisar: ${a} precisa ser número`);
    o[chave] = x;
  }
  return { alvo, o };
}

async function principal(argv) {
  const { alvo, o } = lerArgumentos(argv.slice(2));
  if (!alvo) { process.stderr.write('uso: node tools/mecanifica/alisar-a-superficie.mjs <receita.js> [--cortes=<cortes lidos.json>] [--tolerancia-mm=<erro de leitura>] [--gravar=<cópia.js>] [--rodadas=1] [--limiar-mm=0.3]\n'); return 2; }
  const caminho = resolverCaminhoReceita(alvo, o.raiz ? { raiz: resolve(o.raiz) } : undefined);
  if (!caminho) { process.stderr.write(`alisar: não achei a receita '${alvo}'.\n`); return 2; }
  const modulo = await importarReceita(caminho);
  const receita = receitaDoModulo(modulo);
  const { gravar, cortes, raiz: _raiz, ...opcoes } = o;
  if (cortes) opcoes.cortes = JSON.parse(readFileSync(cortes, 'utf8'));
  const resultado = alisarReceita({ receita, tabela: modulo.TABELA ?? null }, opcoes);
  if (gravar) resultado.copia = gravarCopia(caminho, gravar, resultado.edicoes);
  process.stdout.write(`${JSON.stringify({ peca: alvo, ...resultado }, null, 2)}\n`);
  return 0;
}

/** gravarCopia(origem, destino, edicoes) -> o caminho gravado: a receita com cada número editado trocado no texto da TABELA. */
export function gravarCopia(origem, destino, edicoes) {
  let texto = readFileSync(origem, 'utf8');
  for (const e of edicoes) {
    const re = new RegExp(`(^|[\\s,{])(['"]?)${e.tabela.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\2\\s*:\\s*`, 'm');
    const m = re.exec(texto);
    if (!m) throw new Error(`alisar: não achei '${e.tabela}' como literal no texto da receita; edite o valor ${e.antigo} para ${e.novo} à mão`);
    const ini = m.index + m[0].length;
    if (e.indice == null) {
      const num = /^-?\d+(\.\d+)?([eE][-+]?\d+)?/.exec(texto.slice(ini));
      if (!num) throw new Error(`alisar: '${e.tabela}' não é número literal no texto da receita`);
      texto = texto.slice(0, ini) + String(e.novo) + texto.slice(ini + num[0].length);
    } else {
      if (texto[ini] !== '[') throw new Error(`alisar: '${e.tabela}' não é lista literal no texto da receita`);
      const fim = texto.indexOf(']', ini);
      const itens = texto.slice(ini + 1, fim).split(',');
      if (e.indice >= itens.length || !/^\s*-?\d+(\.\d+)?([eE][-+]?\d+)?\s*$/.test(itens[e.indice])) throw new Error(`alisar: o item ${e.indice} de '${e.tabela}' não é número literal no texto da receita`);
      const espacos = /^(\s*)/.exec(itens[e.indice])[1]; const depois = /(\s*)$/.exec(itens[e.indice])[1];
      itens[e.indice] = `${espacos}${e.novo}${depois}`;
      texto = texto.slice(0, ini + 1) + itens.join(',') + texto.slice(fim);
    }
  }
  writeFileSync(destino, texto);
  return destino;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  principal(process.argv).then((codigo) => { process.exitCode = codigo; }, (erro) => { process.stderr.write(`${erro.message}\n`); process.exitCode = 1; });
}
