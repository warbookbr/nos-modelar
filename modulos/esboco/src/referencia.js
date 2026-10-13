/* Conferência contra a referência: compara, por vista, a silhueta do esboço com a silhueta de uma referência (o contorno de
   uma foto, em milímetro) e, por parte, o que aparece de cada parte da referência com o que aparece das formas que a
   representam. A medida é numérica: a razão entre a interseção e a união das duas silhuetas (IoU) e o desvio em milímetro,
   que é a maior distância entre os dois contornos (Hausdorff), com a média ao lado.

   As duas silhuetas são rasterizadas na mesma grade, na mesma escala, com a projeção e as faces que a medida de sobreposição
   já usa (`facesDaVista`, `preencher`). O que aparece de cada forma sai da profundidade: a forma mais próxima do observador
   em cada célula é a dona dela, e por isso a parte do esboço é comparada com a região da referência do mesmo modo que o mapa
   de partes da imagem a define (só o que aparece).

   O módulo não lê arquivo nem importa o módulo do contorno da imagem: recebe o contorno já lido (`lerContornos`, que valida o
   JSON `mecanifica.contornos@1`) ou uma forma qualquer `{ dentro(h, v), caixa }` (a linha de comando monta uma assim a
   partir de uma imagem calibrada). Coordenadas da referência: h para a direita e v para cima, em milímetro, na origem do
   esboço. Na vista frontal h é x, na lateral h é z (a frente para a direita, ao contrário da tela do esboço) e na superior h
   é x e v é menos z (o fundo para cima). Vistas do mesmo objeto podem ter origens diferentes (a lateral do avião conta o z da
   proa, 0, e o topo conta do eixo da asa, de -5062 a 5382): `deslocamento` da entrada soma esse valor, por eixo do mundo, às
   coordenadas da referência antes de comparar. Puro e determinístico. */
import { ErroDeEsboco, VISTAS } from './index.js';
import { facesDaVista, preencher, profundidadeAfim } from './projecao.js';

export const FORMATO_DOS_CONTORNOS = 'mecanifica.contornos@1';
export const VISTAS_DA_REFERENCIA = ['frontal', 'lateral', 'superior'];
/* Células no maior lado da grade comum: com 600, uma peça de 1,8 m tem células de 3 mm. */
export const CELULAS_DA_REFERENCIA = 600;
/* Sem `tolerancia` declarada, 3% da maior dimensão da referência (mínimo 5 mm); sem `iou_min`, 0,85. */
export const FRACAO_DA_TOLERANCIA = 0.03;
export const TOLERANCIA_MINIMA_MM = 5;
export const IOU_MINIMO_PADRAO = 0.85;
/* Eixo do mundo que cada direção da referência mede em cada vista, e o nome da medida. */
export const EIXOS_DA_VISTA = { frontal: { h: 'x', v: 'y' }, lateral: { h: 'z', v: 'y' }, superior: { h: 'x', v: 'z' } };
export const NOME_DO_EIXO = { x: 'largura', y: 'altura', z: 'profundidade' };
const TOTAL_DO_EIXO = { x: 'larguraTotal', y: 'alturaTotal', z: 'profundidadeTotal' };
/* (h, v) da referência para (u, w) da tela do esboço; cada um é o seu próprio inverso. */
const TELA = { frontal: (a, b) => [a, -b], lateral: (a, b) => [-a, -b], superior: (a, b) => [a, -b] };

/* A vista oposta (a de outros lados) de cada vista da referência que tem uma. */
const OPOSTA = { frontal: 'frontal-oposta', lateral: 'lateral-oposta' };

const objeto = (v) => v && typeof v === 'object' && !Array.isArray(v);
const exigir = (cond, msg) => { if (!cond) throw new ErroDeEsboco(msg); };
const r1 = (x) => Math.round(x * 10) / 10;
const r3 = (x) => Math.round(x * 1000) / 1000;
const mm1 = (x) => r1(x).toString().replace('.', ',');
const num2 = (x) => x.toFixed(2).replace('.', ',');
const normalizar = (v) => { const n = Math.hypot(...v) || 1; return v.map((c) => c / n); };

export function exigirVista(vista, onde) {
  exigir(VISTAS_DA_REFERENCIA.includes(vista), `${onde}: a vista ${JSON.stringify(vista)} não serve à referência (válidas: ${VISTAS_DA_REFERENCIA.join(', ')}; a isométrica não tem escala única)`);
}

/* A vista do esboço que olha do mesmo lado que a imagem da referência de uma entrada (`vista` é a que a entrada declara,
   `orientacao` o `plano.orientacao` lido, ou null): { vista, oposta, motivo }. A imagem tem o h para a direita e o v para cima,
   e a conferência a leva à tela da vista de mesmo nome por `TELA`. Quando essa passagem inverte o h, a imagem é a da vista
   oposta e não a de mesmo nome: na lateral o h é z, a tela da lateral põe z para a esquerda (a proa de um objeto com a frente
   em -z fica à direita) e a imagem a põe à esquerda, que é a `lateral-oposta`. A frontal não se decide pela passagem, que
   serve aos dois lados e por isso só confere a silhueta: a referência frontal é a imagem da frente do objeto (no avião, a proa
   com a hélice), e o olho dela é o do lado da frente de `plano.orientacao`, em z; com a frente em -z é a `frontal-oposta`
   (a `frontal` olha de +z e vê a cauda). Sem orientação em z vale a passagem. A superior não inverte nada (olha de +y). A
   isométrica não é vista de referência. Puro. */
export function vistaDoMesmoOlho(vista, orientacao = null) {
  exigirVista(vista, 'vista da referência');
  const oposta = OPOSTA[vista];
  if (vista === 'frontal' && (orientacao?.frente === '+z' || orientacao?.frente === '-z')) {
    const daFrente = orientacao.frente === '-z';
    return { vista: daFrente ? oposta : vista, oposta: daFrente, motivo: `a referência frontal é a imagem da frente do objeto (${orientacao.nomeDaFrente}, em ${orientacao.frente})` };
  }
  const espelhada = oposta !== undefined && TELA[vista](1, 0)[0] < 0;
  return { vista: espelhada ? oposta : vista, oposta: espelhada, motivo: espelhada ? `na referência ${vista} o eixo ${EIXOS_DA_VISTA[vista].h} cresce para a direita, e a vista ${vista} o põe para a esquerda` : '' };
}

/* Uma forma de referência a partir de um contorno fechado em mm: { aneis: [[[h, v], ...]], caixa: [h0, v0, h1, v1] }. */
function formaDoContorno(pontos, onde) {
  exigir(Array.isArray(pontos) && pontos.length >= 3 && pontos.every((p) => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite)), `${onde}: "contornoMm" deve ser uma lista de 3 ou mais pontos [h, v] em milímetro`);
  return { aneis: [pontos], caixa: [Math.min(...pontos.map((p) => p[0])), Math.min(...pontos.map((p) => p[1])), Math.max(...pontos.map((p) => p[0])), Math.max(...pontos.map((p) => p[1]))] };
}

/* A forma de uma região: o `contornoMm` do maior pedaço, ou, se o arquivo traz `pedacos`, todos eles como anéis disjuntos
   (o preenchimento é par-ímpar, e anéis separados enchem cada um o seu pedaço). Uma parte que a imagem mostra em pedaços, como a
   hélice do avião cortada pelo cone em duas pás, comparada só com o maior pedaço reprovava um esboço que tem as duas pás e
   medida a altura de uma pá; a conferência é do que a parte mostra inteira. */
function formaDaRegiao(r, onde) {
  const lista = Array.isArray(r.pedacos) && r.pedacos.length ? r.pedacos.map((p, k) => formaDoContorno(p?.contornoMm, `${onde}, pedaço ${k + 1}`)) : [formaDoContorno(r.contornoMm, onde)];
  const caixas = lista.map((f) => f.caixa);
  return { aneis: lista.flatMap((f) => f.aneis), caixa: [Math.min(...caixas.map((c) => c[0])), Math.min(...caixas.map((c) => c[1])), Math.max(...caixas.map((c) => c[2])), Math.max(...caixas.map((c) => c[3]))] };
}

/* O JSON de contornos da imagem (`mecanifica.contornos@1`) lido: { silhueta, regioes: { nome: forma }, mmPorPx }. */
export function lerContornos(json, onde = 'referência') {
  exigir(objeto(json) && json.formato === FORMATO_DOS_CONTORNOS, `${onde}: o arquivo de contornos deve ter "formato": "${FORMATO_DOS_CONTORNOS}" (o que o contorno da imagem grava)`);
  exigir(objeto(json.silhueta) && Array.isArray(json.silhueta.contornoMm), `${onde}: falta "silhueta.contornoMm", o contorno da silhueta inteira em milímetro`);
  const regioes = {};
  for (const [nome, r] of Object.entries(objeto(json.regioes) ? json.regioes : {})) {
    if (objeto(r) && Array.isArray(r.contornoMm) && r.contornoMm.length >= 3) regioes[nome] = formaDaRegiao(r, `${onde}: região "${nome}"`);
  }
  /* A silhueta também vem em pedaços quando uma parte fora do modelo a corta: na frontal do avião, o corpo escuro sob a asa
     separa a ponta direita, e só o maior pedaço deixava a envergadura em 10.778 mm em vez de 12.800. */
  return { silhueta: formaDaRegiao(json.silhueta, `${onde}: silhueta`), regioes, mmPorPx: Number.isFinite(json.mmPorPx) ? json.mmPorPx : null };
}

/* O deslocamento declarado (`{ x, y, z }` em mm, só os eixos que a vista mede) em (h, v) da referência: h soma o eixo
   horizontal da vista e v o vertical, e na superior o v é menos z, de modo que somar z a uma posição subtrai de v. */
export function deslocamentoNaVista(deslocamento, vista) {
  const d = deslocamento ?? {};
  const e = EIXOS_DA_VISTA[vista];
  return [d[e.h] ?? 0, vista === 'superior' ? -(d.z ?? 0) : (d[e.v] ?? 0)];
}

function deslocarForma(f, dh, dv) {
  const caixa = [f.caixa[0] + dh, f.caixa[1] + dv, f.caixa[2] + dh, f.caixa[3] + dv];
  if (f.aneis) return { aneis: f.aneis.map((an) => an.map(([h, v]) => [h + dh, v + dv])), caixa };
  return { ...f, caixa, dentro: (h, v) => f.dentro(h - dh, v - dv) };
}

/* A referência lida com todas as formas deslocadas para a origem do esboço (a mesma referência quando não há deslocamento). */
export function deslocarReferencia(ref, deslocamento, vista) {
  const [dh, dv] = deslocamentoNaVista(deslocamento, vista);
  if (dh === 0 && dv === 0) return ref;
  return { ...ref, silhueta: deslocarForma(ref.silhueta, dh, dv), regioes: Object.fromEntries(Object.entries(ref.regioes).map(([n, f]) => [n, deslocarForma(f, dh, dv)])) };
}

/* "z +5062 mm": o deslocamento em palavras, para o relato dizer em que origem a referência foi conferida. */
export function deslocamentoEmTexto(deslocamento) {
  return ['x', 'y', 'z'].filter((k) => Number.isFinite(deslocamento?.[k]) && deslocamento[k] !== 0).map((k) => `${k} ${deslocamento[k] >= 0 ? '+' : '-'}${mm1(Math.abs(deslocamento[k]))}`).join(', ') + ' mm';
}

/* Extensão de uma forma de referência por eixo do mundo, na vista. */
function extensaoPorEixo(forma, vista) {
  const [h0, v0, h1, v1] = forma.caixa;
  const eixos = EIXOS_DA_VISTA[vista];
  const faixa = (eixo, a, b) => (eixo === 'z' && vista === 'superior' ? [-b, -a] : [a, b]);
  return { h: { eixo: eixos.h, faixa: faixa(eixos.h, h0, h1) }, v: { eixo: eixos.v, faixa: faixa(eixos.v, v0, v1) } };
}

/* As medidas da referência: a silhueta e cada região, com a faixa e o tamanho em mm de cada eixo do mundo que a vista mede,
   e as linhas sugeridas de `plano.medidas` (origem "referencia"). `formasDa` (opcional) diz as formas de cada região, e
   `deslocamento` (opcional, o da entrada de `plano.referencia`) leva as faixas para a origem do esboço. */
export function medidasDaReferencia(refLida, vista, { formasDa = {}, deslocamento } = {}) {
  exigirVista(vista, 'medidas da referência');
  const ref = deslocarReferencia(refLida, deslocamento, vista);
  const linha = (nome, forma) => {
    const e = extensaoPorEixo(forma, vista);
    return { parte: nome, eixos: ['h', 'v'].map((k) => ({ eixo: e[k].eixo, nome: NOME_DO_EIXO[e[k].eixo], de: r1(e[k].faixa[0]), ate: r1(e[k].faixa[1]), tamanho: r1(e[k].faixa[1] - e[k].faixa[0]) })) };
  };
  const linhas = [linha(null, ref.silhueta), ...Object.entries(ref.regioes).map(([nome, f]) => linha(nome, f))];
  const sugestoes = [];
  for (const l of linhas) {
    for (const e of l.eixos) {
      if (!(e.tamanho > 0)) continue;
      const tolerancia = Math.max(1, Math.round(Math.max(0.02 * e.tamanho, 2 * (ref.mmPorPx ?? 0))));
      sugestoes.push({
        nome: `${l.parte ?? 'silhueta'}.${e.nome}`, valor: e.tamanho, unidade: 'mm', origem: 'referencia', tolerancia,
        mede: l.parte === null ? TOTAL_DO_EIXO[e.eixo] : { caixa: e.eixo, formas: formasDa[l.parte] ?? [l.parte] },
      });
    }
  }
  return { vista, mmPorPx: ref.mmPorPx, linhas, sugestoes };
}

export function formatarMedidasDaReferencia(m, { arquivo = 'a referência' } = {}) {
  const eixos = EIXOS_DA_VISTA[m.vista];
  const L = [`medidas de ${arquivo} (vista ${m.vista}: horizontal é ${NOME_DO_EIXO[eixos.h]} (${eixos.h}), vertical é ${NOME_DO_EIXO[eixos.v]} (${eixos.v})${m.mmPorPx ? `, ${String(Math.round(m.mmPorPx * 10000) / 10000).replace('.', ',')} mm por pixel` : ''}):`];
  for (const l of m.linhas) L.push(`  ${l.parte === null ? 'silhueta' : `parte ${l.parte}`}: ${l.eixos.map((e) => `${e.nome} ${mm1(e.tamanho)} mm (${e.eixo} de ${mm1(e.de)} a ${mm1(e.ate)})`).join('; ')}`);
  L.push('linhas sugeridas para plano.medidas (origem "referencia"; em "mede" troque o nome da parte pelos ids das formas do esboço que a representam):');
  m.sugestoes.forEach((s, i) => L.push(`  ${JSON.stringify(s)}${i < m.sugestoes.length - 1 ? ',' : ''}`));
  return `${L.join('\n')}\n`;
}

/* --- grade comum ----------------------------------------------------------- */

/* A grade da vista: as células em que alguma forma aparece, com a forma mais próxima do observador em cada uma (`dono`).
   `caixasDaReferencia` (em h, v) entram no enquadramento para a grade cobrir também o que o esboço não cobre. */
function montarGrade(rs, vista, caixasDaReferencia) {
  const V = VISTAS[vista];
  const olho = normalizar(V.olho);
  const listas = rs.map((r) => facesDaVista(r, vista, olho).map((f) => {
    const furos = f.furos && f.furos.length > 0 ? f.furos : f.furo ? [f.furo] : [];
    return { pts: f.pts, aneis: [f.pts.map((p) => V.p(p)), ...furos.map((fu) => fu.map((p) => V.p(p)))] };
  }));
  let umin = Infinity; let umax = -Infinity; let vmin = Infinity; let vmax = -Infinity;
  const ver = (u, w) => { if (u < umin) umin = u; if (u > umax) umax = u; if (w < vmin) vmin = w; if (w > vmax) vmax = w; };
  const caixas = listas.map((fs) => {
    let a0 = Infinity; let a1 = -Infinity; let b0 = Infinity; let b1 = -Infinity;
    for (const f of fs) for (const an of f.aneis) for (const q of an) {
      if (q[0] < a0) a0 = q[0]; if (q[0] > a1) a1 = q[0]; if (q[1] < b0) b0 = q[1]; if (q[1] > b1) b1 = q[1];
    }
    for (const f of fs) for (const q of f.aneis[0]) ver(q[0], q[1]);
    return { a0, a1, b0, b1 };
  });
  for (const [h0, v0, h1, v1] of caixasDaReferencia) { ver(...TELA[vista](h0, v0)); ver(...TELA[vista](h1, v1)); }
  exigir(Number.isFinite(umin), 'referência: o esboço não tem forma visível para comparar');
  const cel = Math.max(umax - umin, vmax - vmin, 1) / CELULAS_DA_REFERENCIA;
  const W = Math.ceil((umax - umin) / cel) + 2;
  const H = Math.ceil((vmax - vmin) / cel) + 2;
  const u0 = umin - cel;
  const v0 = vmin - cel;
  const melhor = new Float64Array(W * H).fill(-Infinity);
  const dono = new Int32Array(W * H).fill(-1);
  rs.forEach((r, k) => {
    const c = caixas[k];
    if (!Number.isFinite(c.a0)) return;
    const I0 = Math.max(0, Math.floor((c.a0 - u0) / cel) - 1);
    const I1 = Math.min(W - 1, Math.ceil((c.a1 - u0) / cel) + 1);
    const J0 = Math.max(0, Math.floor((c.b0 - v0) / cel) - 1);
    const J1 = Math.min(H - 1, Math.ceil((c.b1 - v0) / cel) + 1);
    if (!(I1 >= I0 && J1 >= J0)) return;
    const w = I1 - I0 + 1;
    const h = J1 - J0 + 1;
    const prof = new Float64Array(w * h).fill(-Infinity);
    for (const f of listas[k]) {
      const plano = profundidadeAfim(f.pts, V, olho);
      if (plano) preencher(prof, I0, J0, w, h, u0, v0, cel, f.aneis, plano);
    }
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const d = prof[j * w + i];
      const g = (J0 + j) * W + I0 + i;
      if (d > melhor[g]) { melhor[g] = d; dono[g] = k; }
    }
  });
  return { W, H, u0, v0, cel, dono };
}

/* A máscara de uma forma de referência na grade. */
function mascaraDaReferencia(forma, vista, g) {
  const m = new Uint8Array(g.W * g.H);
  const t = TELA[vista];
  if (forma.aneis) {
    const aneis = forma.aneis.map((an) => an.map((p) => t(p[0], p[1])));
    let a0 = Infinity; let a1 = -Infinity; let b0 = Infinity; let b1 = -Infinity;
    for (const an of aneis) for (const q of an) { if (q[0] < a0) a0 = q[0]; if (q[0] > a1) a1 = q[0]; if (q[1] < b0) b0 = q[1]; if (q[1] > b1) b1 = q[1]; }
    const I0 = Math.max(0, Math.floor((a0 - g.u0) / g.cel) - 1);
    const I1 = Math.min(g.W - 1, Math.ceil((a1 - g.u0) / g.cel) + 1);
    const J0 = Math.max(0, Math.floor((b0 - g.v0) / g.cel) - 1);
    const J1 = Math.min(g.H - 1, Math.ceil((b1 - g.v0) / g.cel) + 1);
    const w = I1 - I0 + 1; const h = J1 - J0 + 1;
    const prof = new Float64Array(w * h).fill(-Infinity);
    preencher(prof, I0, J0, w, h, g.u0, g.v0, g.cel, aneis, { a: 0, b: 0, c: 0 });
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (prof[j * w + i] > -Infinity) m[(J0 + j) * g.W + I0 + i] = 1;
    return m;
  }
  for (let j = 0; j < g.H; j++) for (let i = 0; i < g.W; i++) {
    const [h, v] = t(g.u0 + (i + 0.5) * g.cel, g.v0 + (j + 0.5) * g.cel);
    if (h >= forma.caixa[0] && h <= forma.caixa[2] && v >= forma.caixa[1] && v <= forma.caixa[3] && forma.dentro(h, v)) m[j * g.W + i] = 1;
  }
  return m;
}

/* Preenche os buracos de uma máscara (as células de fora que a borda da grade não alcança por quatro vizinhos). O contorno da
   referência é o contorno externo de cada região, que tampa o que uma peça da frente deixa de fora (o garfo cortando a roda),
   e a máscara do esboço tem de ser comparada do mesmo jeito. */
function semBuracos(m, W, H) {
  const fora = new Uint8Array(W * H);
  const pilha = [];
  const entrar = (k) => { if (!m[k] && !fora[k]) { fora[k] = 1; pilha.push(k); } };
  for (let i = 0; i < W; i++) { entrar(i); entrar((H - 1) * W + i); }
  for (let j = 0; j < H; j++) { entrar(j * W); entrar(j * W + W - 1); }
  while (pilha.length) {
    const k = pilha.pop();
    const i = k % W;
    if (i > 0) entrar(k - 1);
    if (i < W - 1) entrar(k + 1);
    if (k >= W) entrar(k - W);
    if (k < W * (H - 1)) entrar(k + W);
  }
  const cheia = new Uint8Array(W * H);
  for (let k = 0; k < cheia.length; k++) cheia[k] = fora[k] ? 0 : 1;
  return cheia;
}

/* Células do contorno de uma máscara: as que têm pelo menos um vizinho (de quatro) fora dela. */
function bordaDaMascara(m, W, H) {
  const b = new Uint8Array(W * H);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const k = j * W + i;
    if (!m[k]) continue;
    if (i === 0 || j === 0 || i === W - 1 || j === H - 1 || !m[k - 1] || !m[k + 1] || !m[k - W] || !m[k + W]) b[k] = 1;
  }
  return b;
}

/* Distância euclidiana quadrada (em células) de cada célula à borda mais próxima (Felzenszwalb e Huttenlocher). */
function distanciaAteABorda(borda, W, H) {
  const INF = 1e20;
  const f = new Float64Array(W * H);
  for (let k = 0; k < f.length; k++) f[k] = borda[k] ? 0 : INF;
  const n = Math.max(W, H);
  const v = new Int32Array(n); const z = new Float64Array(n + 1); const d = new Float64Array(n); const col = new Float64Array(n);
  const passo = (len) => {
    let k = 0; v[0] = 0; z[0] = -INF; z[1] = INF;
    for (let q = 1; q < len; q++) {
      let s = ((col[q] + q * q) - (col[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
      while (s <= z[k]) { k--; s = ((col[q] + q * q) - (col[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); }
      k++; v[k] = q; z[k] = s; z[k + 1] = INF;
    }
    k = 0;
    for (let q = 0; q < len; q++) { while (z[k + 1] < q) k++; d[q] = (q - v[k]) * (q - v[k]) + col[v[k]]; }
  };
  for (let i = 0; i < W; i++) { for (let j = 0; j < H; j++) col[j] = f[j * W + i]; passo(H); for (let j = 0; j < H; j++) f[j * W + i] = d[j]; }
  for (let j = 0; j < H; j++) { for (let i = 0; i < W; i++) col[i] = f[j * W + i]; passo(W); for (let i = 0; i < W; i++) f[j * W + i] = d[i]; }
  return f;
}

/* IoU e desvio entre duas máscaras da mesma grade. O desvio é a maior distância de um contorno ao outro (nos dois sentidos),
   e `desvio_medio_mm` a média das distâncias. Uma máscara vazia não tem contorno: IoU zero e desvio infinito. */
function compararMascaras(a, b, g) {
  let ia = 0; let ib = 0; let inter = 0;
  for (let k = 0; k < a.length; k++) { if (a[k]) ia++; if (b[k]) ib++; if (a[k] && b[k]) inter++; }
  const uniao = ia + ib - inter;
  const extremos = (m) => {
    let i0 = Infinity; let i1 = -Infinity; let j0 = Infinity; let j1 = -Infinity;
    for (let j = 0; j < g.H; j++) for (let i = 0; i < g.W; i++) if (m[j * g.W + i]) { if (i < i0) i0 = i; if (i > i1) i1 = i; if (j < j0) j0 = j; if (j > j1) j1 = j; }
    return ia && ib ? { u: [g.u0 + i0 * g.cel, g.u0 + (i1 + 1) * g.cel], w: [g.v0 + j0 * g.cel, g.v0 + (j1 + 1) * g.cel] } : null;
  };
  const base = { celulas_esboco: ia, celulas_referencia: ib, iou: uniao === 0 ? 0 : inter / uniao, extremos: { esboco: extremos(a), referencia: extremos(b) } };
  if (ia === 0 || ib === 0) return { ...base, desvio_mm: Infinity, desvio_medio_mm: Infinity };
  const ba = bordaDaMascara(a, g.W, g.H); const bb = bordaDaMascara(b, g.W, g.H);
  const da = distanciaAteABorda(ba, g.W, g.H); const db = distanciaAteABorda(bb, g.W, g.H);
  let maxAB = 0; let maxBA = 0; let somaAB = 0; let somaBA = 0; let nAB = 0; let nBA = 0;
  for (let k = 0; k < a.length; k++) {
    if (ba[k]) { maxAB = Math.max(maxAB, db[k]); somaAB += Math.sqrt(db[k]); nAB++; }
    if (bb[k]) { maxBA = Math.max(maxBA, da[k]); somaBA += Math.sqrt(da[k]); nBA++; }
  }
  return { ...base, desvio_mm: Math.sqrt(Math.max(maxAB, maxBA)) * g.cel, desvio_medio_mm: ((somaAB / nAB + somaBA / nBA) / 2) * g.cel };
}

/* Caixa (h0, v0, h1, v1) de uma faixa de tela. */
function caixaDaTela(e, vista) {
  if (!e) return null;
  const p = TELA[vista](e.u[0], e.w[0]); const q = TELA[vista](e.u[1], e.w[1]);
  return [Math.min(p[0], q[0]), Math.min(p[1], q[1]), Math.max(p[0], q[0]), Math.max(p[1], q[1])];
}

/* A sobreposição das duas silhuetas numa imagem RGBA (largura x altura, na tela do esboço: a mesma orientação das vistas da
   análise): cinza onde as duas cobrem, laranja só o esboço, azul só a referência, branco fora. */
export function sobreposicaoDaReferencia(entrada, refLida, rs) {
  const vista = entrada.vista;
  exigirVista(vista, `referência "${entrada.arquivo}"`);
  const ref = deslocarReferencia(refLida, entrada.deslocamento, vista);
  const g = montarGrade(rs, vista, [ref.silhueta.caixa]);
  const r = mascaraDaReferencia(ref.silhueta, vista, g);
  const pixels = new Uint8Array(g.W * g.H * 4);
  const cheia = ref.silhueta.aneis ? semBuracos(g.dono.map((d) => (d >= 0 ? 1 : 0)), g.W, g.H) : null;
  for (let k = 0; k < g.W * g.H; k++) {
    const e = cheia ? cheia[k] === 1 : g.dono[k] >= 0;
    const cor = e && r[k] ? [150, 150, 150] : e ? [224, 137, 43] : r[k] ? [61, 111, 181] : [255, 255, 255];
    pixels.set([...cor, 255], k * 4);
  }
  return { largura: g.W, altura: g.H, celula_mm: Math.round(g.cel * 100) / 100, pixels };
}

const maiorDimensao = (forma) => Math.max(forma.caixa[2] - forma.caixa[0], forma.caixa[3] - forma.caixa[1]);

/* Confere uma entrada de `plano.referencia` contra as formas visíveis `rs` de uma opção. `ref` é a referência lida
   ({ silhueta, regioes }), `selecionar(entrada)` devolve as formas resolvidas que um id ou padrão designa (e recusa o que não
   existe), e `tentar` é o mesmo sem recusar (vazio se nada casa). `entrada.partes` mapeia região para formas; uma lista vazia
   (`"partes": []`) desliga a conferência por parte e deixa só a silhueta, e uma região com lista vazia (`"parede": []`) fica
   fora (nenhuma forma do esboço a representa, como a fuselagem do avião, que a imagem parte por watershed e a forma não
   acompanha). `entrada.deslocamento` leva a referência à origem do esboço. Devolve { vista, celula_mm, resultados, semParte, ok }; cada
   resultado traz `parte` (nulo para a silhueta inteira), `formas`, `iou`, `desvio_mm`, `desvio_medio_mm`, os limites, `ok`,
   `caixa_esboco` e `caixa_referencia` (h0, v0, h1, v1) e `texto`. */
export function conferirReferencia(entrada, refLida, rs, { selecionar, tentar, sujeito = 'do esboço' }) {
  const vista = entrada.vista;
  exigirVista(vista, `referência "${entrada.arquivo}"`);
  const ref = deslocarReferencia(refLida, entrada.deslocamento, vista);
  const soSilhueta = Array.isArray(entrada.partes);
  const partes = soSilhueta ? {} : (entrada.partes ?? {});
  for (const nome of Object.keys(partes)) exigir(Object.hasOwn(ref.regioes, nome), `referência "${entrada.arquivo}": "partes" cita a região "${nome}", que o arquivo não tem (regiões: ${Object.keys(ref.regioes).join(', ') || 'nenhuma'})`);
  const g = montarGrade(rs, vista, [ref.silhueta.caixa, ...Object.values(ref.regioes).map((f) => f.caixa)]);
  const indice = new Map(rs.map((r, k) => [r.id, k]));
  const tolerancia = entrada.tolerancia ?? Math.max(TOLERANCIA_MINIMA_MM, FRACAO_DA_TOLERANCIA * maiorDimensao(ref.silhueta));
  const iouMin = entrada.iou_min ?? IOU_MINIMO_PADRAO;
  const limites = { tolerancia_mm: r1(tolerancia), tolerancia_declarada: entrada.tolerancia !== undefined, iou_min: iouMin, iou_min_declarado: entrada.iou_min !== undefined };
  const resultados = [];
  const comparar = (parte, formas, donos, forma) => {
    const esb = new Uint8Array(g.W * g.H);
    for (let k = 0; k < esb.length; k++) if (donos === null ? g.dono[k] >= 0 : donos.has(g.dono[k])) esb[k] = 1;
    /* uma referência de contorno externo tampa os buracos; uma imagem calibrada tem os buracos que a silhueta tem */
    const c = compararMascaras(forma.aneis ? semBuracos(esb, g.W, g.H) : esb, mascaraDaReferencia(forma, vista, g), g);
    const ok = c.iou >= iouMin && c.desvio_mm <= tolerancia + 1e-9;
    const cE = caixaDaTela(c.extremos.esboco, vista); const cR = caixaDaTela(c.extremos.referencia, vista);
    const dif = cE && cR ? { extensao_mm: [r1((cE[2] - cE[0]) - (cR[2] - cR[0])), r1((cE[3] - cE[1]) - (cR[3] - cR[1]))], centro_mm: [r1((cE[0] + cE[2]) / 2 - (cR[0] + cR[2]) / 2), r1((cE[1] + cE[3]) / 2 - (cR[1] + cR[3]) / 2)] } : null;
    resultados.push({
      parte, formas, iou: r3(c.iou), desvio_mm: Number.isFinite(c.desvio_mm) ? r1(c.desvio_mm) : null, desvio_medio_mm: Number.isFinite(c.desvio_medio_mm) ? r1(c.desvio_medio_mm) : null,
      ...limites, ok, caixa_esboco: cE ? cE.map(r1) : null, caixa_referencia: cR ? cR.map(r1) : null, ...(dif ? { diferenca: dif } : {}),
    });
  };
  comparar(null, rs.map((r) => r.id), null, ref.silhueta);
  const semParte = [];
  for (const [nome, forma] of soSilhueta ? [] : Object.entries(ref.regioes)) {
    if (Object.hasOwn(partes, nome) && partes[nome].length === 0) continue;
    const escolhidas = Object.hasOwn(partes, nome)
      ? [...new Set(partes[nome].flatMap((q) => selecionar(q)))]
      : tentar(nome);
    if (escolhidas.length === 0) { semParte.push(nome); continue; }
    comparar(nome, escolhidas.map((r) => r.id), new Set(escolhidas.map((r) => indice.get(r.id))), forma);
  }
  for (const r of resultados) r.texto = textoDoResultado(r, vista, sujeito);
  return { vista, celula_mm: Math.round(g.cel * 100) / 100, resultados, semParte, ok: resultados.every((r) => r.ok) };
}

const sinal = (x) => `${x >= 0 ? '+' : '-'}${mm1(Math.abs(x))}`;

/* A frase de um resultado: o desvio e a razão contra os limites, e a diferença de tamanho e de posição quando ela explica. */
export function textoDoResultado(r, vista, sujeito = 'do esboço') {
  const eixos = EIXOS_DA_VISTA[vista];
  const de = r.parte === null ? `a silhueta ${sujeito}` : `a parte "${r.parte}"${r.formas.length === 1 && r.formas[0] === r.parte ? '' : ` (${r.formas.join(', ')})`} ${sujeito}`;
  const limites = `tolerância ${mm1(r.tolerancia_mm)} mm${r.tolerancia_declarada ? '' : ' (padrão)'}, razão interseção/união mínima ${num2(r.iou_min)}${r.iou_min_declarado ? '' : ' (padrão)'}`;
  if (r.desvio_mm === null) return `na vista ${vista}, ${de} e a referência não têm silhueta em comum para comparar (uma delas está vazia); ${limites}`;
  let dica = '';
  if (r.diferenca) {
    const [dh, dv] = r.diferenca.extensao_mm; const [ch, cv] = r.diferenca.centro_mm;
    const partes = [];
    if (Math.abs(dh) >= 1 || Math.abs(dv) >= 1) partes.push(`a extensão ${sujeito} difere ${sinal(dh)} mm em ${NOME_DO_EIXO[eixos.h]} e ${sinal(dv)} mm em ${NOME_DO_EIXO[eixos.v]}`);
    const centro = [[ch, 'na horizontal'], [cv, 'na vertical']].filter(([v]) => Math.abs(v) >= 1).map(([v, onde]) => `${sinal(v)} mm ${onde}`);
    if (centro.length) partes.push(`o centro ${sujeito} fica ${centro.join(' e ')} da referência (horizontal para a direita, vertical para cima)`);
    if (partes.length) dica = `; ${partes.join(' e ')}`;
  }
  return `na vista ${vista}, ${de} desvia ${mm1(r.desvio_mm)} mm da referência (desvio médio ${mm1(r.desvio_medio_mm)} mm) e a razão interseção/união é ${num2(r.iou)}${r.ok ? '' : ` (${limites})`}${dica}`;
}

/* " (extensão +12,0 mm em h e 0 em v; centro -40,0 mm em h ...)": só o que passa de 1 mm. */
function diferencaEmLinha(d) {
  const p = [];
  const [eh, ev] = d.extensao_mm; const [ch, cv] = d.centro_mm;
  if (Math.abs(eh) >= 1 || Math.abs(ev) >= 1) p.push(`extensão ${sinal(eh)} x ${sinal(ev)} mm`);
  if (Math.abs(ch) >= 1 || Math.abs(cv) >= 1) p.push(`centro ${sinal(ch)} x ${sinal(cv)} mm`);
  return p.length ? ` (esboço menos referência, horizontal x vertical: ${p.join('; ')})` : '';
}

/* As linhas impressas pela linha de comando para uma opção. */
export function formatarConferencia(entrada, c, { titulo } = {}) {
  const L = [`referência ${entrada.arquivo} (vista ${c.vista}, célula de ${mm1(c.celula_mm)} mm${entrada.deslocamento ? `, referência deslocada ${deslocamentoEmTexto(entrada.deslocamento)}` : ''}, tolerância ${mm1(c.resultados[0].tolerancia_mm)} mm${c.resultados[0].tolerancia_declarada ? '' : ' (padrão)'}, razão interseção/união mínima ${num2(c.resultados[0].iou_min)}${c.resultados[0].iou_min_declarado ? '' : ' (padrão)'})${titulo ? `, opção ${titulo}` : ''}: ${c.ok ? 'aprovada' : 'reprovada'}`];
  for (const r of c.resultados) {
    L.push(`  ${r.parte === null ? 'silhueta' : `parte ${r.parte}`}: desvio ${r.desvio_mm === null ? 'sem medida' : `${mm1(r.desvio_mm)} mm (médio ${mm1(r.desvio_medio_mm)} mm)`}, razão interseção/união ${num2(r.iou)}: ${r.ok ? 'passa' : 'reprova'}${r.parte === null || (r.formas.length === 1 && r.formas[0] === r.parte) ? '' : ` [${r.formas.join(', ')}]`}${r.ok || !r.diferenca ? '' : diferencaEmLinha(r.diferenca)}`);
  }
  if (c.semParte.length) L.push(`  regiões sem forma correspondente (declare plano.referencia.partes): ${c.semParte.join(', ')}`);
  return L.join('\n');
}
