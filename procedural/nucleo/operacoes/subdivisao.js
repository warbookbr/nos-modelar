/* subdivisao.js (operação) — gera uma superfície Catmull-Clark com vincos a partir de uma gaiola declarada.
   A geometria sai de `procedural/nucleo/subdivisao.js`, função pura. A receita endereça a gaiola por nome: o vértice é o
   nome de um ponto, a face lista nomes de ponto e o vinco é uma sequência nomeada de pontos; o passo traduz os nomes em
   índices só para chamar a função pura, e nenhum índice de aresta, vértice ou face sai da receita. Com `espessura`, a
   superfície vira a face externa de um sólido fechado por `procedural/nucleo/espessura.js`, e o grito da espessura que
   passa do raio local cita os pontos nomeados da gaiola.

   A SOMBRA. As faces geradas saem lisas com ângulo (`liso`, padrão LISO_PADRAO graus, o mecanismo do passo `liso`), e
   as arestas que descendem de um vinco vivo levam quebra de sombra (`face.quebras`), de modo que a dobra continua aresta
   mesmo onde o diedro cai abaixo do ângulo, nas pontas do vinco. `quebraNosVincos: 'todos'` quebra também nos vincos de
   nitidez fracionária, e `'nenhum'` deixa só o ângulo; `liso: false` devolve as faces chapadas. Só a marca de sombra
   muda: as posições e as faces são as mesmas com qualquer opção. */
import { subdividirCatmullClark, espelharGaiolaEmX, ajustarGaiolaAsMedidas, ajustarGaiolaAsMedidasComPeso, nitidezDoVinco } from '../subdivisao.js';
import { espessarSuperficie, ErroDaEspessura } from '../espessura.js';
import { valorDoLiso } from '../liso-por-angulo.js';

const EXEMPLO_DE_VINCO = "{ nome: 'vincoDaAba', pontos: ['a', 'b', 'c'], nitidez: 0.5 }";
const EXEMPLO_DE_CANTO = "cantos: ['quinaDaTampa']";
const EXEMPLO_DE_MEDIDA = "{ ponto: 'cotaDoTeto', peso: 4 }";
const EXEMPLO_DE_EXATA = "{ ponto: 'alturaDoVao', exata: true }";

/** enderecosPorIndice(argumentos) -> caminhos dos campos de um passo `subdivisao` que endereçam a gaiola por índice
 *  numérico (face, vinco, canto ou medida), para o teste que confere que a receita só usa nomes. Vazio quando a receita
 *  endereça tudo por nome. */
export function enderecosPorIndice(a) {
  const achados = [];
  const olhar = (valor, caminho) => {
    if (typeof valor === 'number') achados.push(caminho);
    else if (Array.isArray(valor)) valor.forEach((v, k) => olhar(v, `${caminho}[${k}]`));
  };
  (a.vertices ?? []).forEach((v, k) => { if (typeof v !== 'string') achados.push(`vertices[${k}]`); });
  olhar(a.faces ?? [], 'faces');
  (a.vincos ?? []).forEach((v, k) => {
    if (v && typeof v === 'object' && !Array.isArray(v)) olhar(v.pontos ?? [], `vincos[${k}].pontos`);
    else olhar(v, `vincos[${k}]`);
  });
  olhar(a.cantos ?? [], 'cantos');
  (a.medidas ?? []).forEach((m, k) => {
    if (m && typeof m === 'object' && !Array.isArray(m)) { if (typeof m.ponto !== 'string') achados.push(`medidas[${k}].ponto`); } else olhar(m, `medidas[${k}]`);
  });
  return achados;
}

const chave = (a, b) => (a < b ? `${a},${b}` : `${b},${a}`);
export const LISO_PADRAO = 30;
const QUEBRAS = ['vivos', 'todos', 'nenhum'];
const citar = (nome) => `'${nome}'`;

/* Traduz os vincos nomeados em [a, b, nitidez em níveis] sobre as arestas da gaiola. Devolve { vincos } ou { erro }. */
function vincosPorNome(lista, indiceDoNome, faces, st) {
  if (!Array.isArray(lista)) return { erro: `vincos precisa ser lista de vincos nomeados, como ${EXEMPLO_DE_VINCO}` };
  const arestas = new Set();
  for (const f of faces) for (let k = 0; k < f.length; k++) arestas.add(chave(f[k], f[(k + 1) % f.length]));
  const nomes = new Set(); const dono = new Map(); const vincos = [];
  for (const v of lista) {
    if (Array.isArray(v)) return { erro: `vinco por índice de aresta não é aceito, porque índice não é identidade; declare o vinco pelos pontos nomeados da gaiola, como ${EXEMPLO_DE_VINCO}, com nitidez de 0 a 1 ou 'viva'` };
    if (!v || typeof v !== 'object') return { erro: `cada vinco precisa ser objeto como ${EXEMPLO_DE_VINCO}` };
    if (typeof v.nome !== 'string' || !v.nome) return { erro: `cada vinco precisa de nome, como ${EXEMPLO_DE_VINCO}` };
    const extra = Object.keys(v).filter((k) => !['nome', 'pontos', 'nitidez'].includes(k));
    if (extra.length) return { erro: `o vinco ${citar(v.nome)} tem campo desconhecido ${extra.map(citar).join(', ')}; os campos são nome, pontos e nitidez` };
    if (nomes.has(v.nome)) return { erro: `o nome de vinco ${citar(v.nome)} aparece mais de uma vez` };
    nomes.add(v.nome);
    if (!Array.isArray(v.pontos) || v.pontos.length < 2 || v.pontos.some((p) => typeof p !== 'string')) return { erro: `o vinco ${citar(v.nome)} precisa de pontos: lista de dois ou mais nomes de ponto da gaiola, em sequência ao longo das arestas` };
    for (const p of v.pontos) if (!indiceDoNome.has(p)) return { erro: `o vinco ${citar(v.nome)} cita o ponto ${citar(p)}, que não é ponto nomeado da gaiola` };
    let s;
    if (v.nitidez === 'viva') s = nitidezDoVinco('viva');
    else {
      if (v.nitidez == null) return { erro: `o vinco ${citar(v.nome)} precisa de nitidez de 0 a 1, ou 'viva'` };
      const x = st.num(v.nitidez);
      if (!Number.isFinite(x) || x < 0 || x > 1) return { erro: `o vinco ${citar(v.nome)} tem nitidez ${x}; a nitidez vai de 0 a 1, ou é 'viva'` };
      s = nitidezDoVinco(x);
    }
    for (let k = 0; k + 1 < v.pontos.length; k++) {
      const p = v.pontos[k], q = v.pontos[k + 1];
      const a = indiceDoNome.get(p), b = indiceDoNome.get(q);
      const c = chave(a, b);
      if (a === b || !arestas.has(c)) return { erro: `o vinco ${citar(v.nome)} liga ${citar(p)} a ${citar(q)}, que não formam aresta da gaiola` };
      if (dono.has(c)) return { erro: `a aresta ${citar(p)}-${citar(q)} está ${dono.get(c) === v.nome ? `duas vezes no vinco ${citar(v.nome)}` : `nos vincos ${citar(dono.get(c))} e ${citar(v.nome)}`}` };
      dono.set(c, v.nome);
      vincos.push([a, b, s]);
    }
  }
  return { vincos };
}

const MAXIMO_DE_LUGARES = 5;
const arredondar = (x) => Number(x.toPrecision(3));

/* Os lugares em que a espessura passa do raio local, com o nome do ponto da gaiola mais perto de cada um. Os vértices
   da malha de índice menor que o número de pontos da gaiola são os pontos da gaiola refinados (o refino mantém o índice),
   e a imagem espelhada de um ponto declarado sai com o nome dele e a marca de espelhada. */
function lugaresDaEspessura(lugares, malha, gaiola, declarados) {
  const nG = gaiola.vertices.length;
  const origem = gaiola.vertices.map((_, k) => k);
  const espelhado = new Set();
  if (gaiola.imagem) gaiola.imagem.forEach((k, j) => { if (k !== j) { origem[k] = j; espelhado.add(k); } });
  const nome = (j) => (typeof declarados[j] === 'string' ? `'${declarados[j]}'` : `[${gaiola.vertices[j].map(arredondar).join(', ')}]`);
  /* um lugar por ponto declarado, do pior para o melhor; a imagem espelhada não ocupa outro lugar */
  const porPonto = new Map();
  for (const l of lugares) {
    let melhor = 0, dMelhor = Infinity;
    for (let k = 0; k < nG; k++) {
      const p = malha[k]; const d = Math.hypot(p[0] - l.ponto[0], p[1] - l.ponto[1], p[2] - l.ponto[2]);
      if (d < dMelhor) { dMelhor = d; melhor = k; }
    }
    const j = origem[melhor];
    if (!porPonto.has(j)) {
      if (porPonto.size === MAXIMO_DE_LUGARES) continue;
      porPonto.set(j, { l, direto: false, imagem: false });
    }
    porPonto.get(j)[espelhado.has(melhor) ? 'imagem' : 'direto'] = true;
  }
  if (!porPonto.size) return '';
  const textos = [...porPonto].map(([j, { l, direto, imagem }]) => `${nome(j)}${imagem ? (direto ? ' e a imagem espelhada' : ' espelhado') : ''} (raio ${arredondar(l.raio)} em [${l.ponto.map(arredondar).join(', ')}])`);
  return `, perto de ${textos.join(', ')} (${lugares.length} par(es) de vértices da malha ao todo); reduza a espessura abaixo do raio, abra a curva ali ou troque o lado; no vinco vivo o raio local é a largura da faixa de faces ao lado dele e cai pela metade a cada nível`;
}

/** gaiolaDoPasso(a, { vec, num }) -> { gaiola, declarados, declaradaCheia, medidas } ou { erro: [campo, mensagem] }
 *  A gaiola que o passo `subdivisao` subdivide, resolvida dos argumentos do passo: os nomes traduzidos em índices, a
 *  simetria aplicada (com `imagem`, o índice da imagem espelhada de cada ponto) e, com `medidas`, os pontos ajustados
 *  para a superfície limite passar pelas cotas. `vec` e `num` resolvem ponto e número pelo dicionário da peça. O passo
 *  usa esta função, e uma ferramenta que lê a superfície entregue pode usá-la para saber de que gaiola ela saiu.
 *  Com `medidas`, `declaradaCheia` é a gaiola como foi declarada (com a simetria aplicada, antes do ajuste) e `medidas` a
 *  lista de { indice, peso } da gaiola cheia (peso Infinity para a medida exata, as imagens espelhadas incluídas), que
 *  `operadorDasMedidas` de `subdivisao.js` lê para dizer como a gaiola ajustada acompanha a declarada; sem `medidas`, os
 *  dois são null. */
export function gaiolaDoPasso(a, { vec, num }) {
  const erro = (campo, mensagem) => ({ erro: [campo, mensagem] });
  let gaiola; let soltos = [];
  let declaradaCheia = null; let medidasLidas = null;
  const declarados = a.vertices ?? [];
  /* Os pontos nomeados da gaiola: o nome endereça o vértice em faces, vincos, cantos e medidas. */
  const indiceDoNome = new Map();
  for (const [k, v] of declarados.entries()) {
    if (typeof v !== 'string') continue;
    if (indiceDoNome.has(v)) return erro('vertices', `o ponto ${citar(v)} aparece mais de uma vez na gaiola`);
    indiceDoNome.set(v, k);
  }
  let faces;
  if (!Array.isArray(a.faces)) return erro('faces', 'faces precisa ser lista de faces, cada uma uma lista de nomes de ponto da gaiola');
  try {
    faces = a.faces.map((f) => {
      if (!Array.isArray(f)) throw new TypeError('cada face precisa ser lista de nomes de ponto da gaiola');
      return f.map((p) => {
        if (typeof p !== 'string') return p;
        if (!indiceDoNome.has(p)) throw new TypeError(`a face [${f.map(citar).join(', ')}] cita o ponto ${citar(p)}, que não é ponto nomeado da gaiola`);
        return indiceDoNome.get(p);
      });
    });
  } catch (e) { return erro('faces', String(e.message)); }
  const traduzidos = vincosPorNome(a.vincos ?? [], indiceDoNome, faces.filter((f) => f.every((x) => Number.isInteger(x))), { num });
  if (traduzidos.erro) return erro('vincos', traduzidos.erro);
  const cantos = [];
  if (a.cantos != null) {
    if (!Array.isArray(a.cantos)) return erro('cantos', `cantos precisa ser lista de nomes de ponto da gaiola, como ${EXEMPLO_DE_CANTO}`);
    for (const c of a.cantos) {
      if (typeof c !== 'string') return erro('cantos', `canto por índice de vértice não é aceito; declare o canto pelo nome do ponto da gaiola, como ${EXEMPLO_DE_CANTO}`);
      if (!indiceDoNome.has(c)) return erro('cantos', `o canto ${citar(c)} não é ponto nomeado da gaiola`);
      cantos.push(indiceDoNome.get(c));
    }
  }
  try {
    const vertices = declarados.map((p) => vec(p));
    gaiola = { vertices, faces, vincos: traduzidos.vincos, cantos };
    const usados = new Set(faces.flat());
    soltos = vertices.map((p, k) => (usados.has(k) ? null : (typeof declarados[k] === 'string' ? `'${declarados[k]}'` : `[${p.join(', ')}]`))).filter((x) => x !== null);
    if (a.simetria === 'x') gaiola = espelharGaiolaEmX(gaiola);
    else if (a.simetria != null) return erro('simetria', "simetria só aceita 'x'");
  } catch (e) { return erro('vertices', String(e.message)); }
  /* Vértice sem face não pertence a nenhuma superfície: grita com o nome do ponto (ou a posição, se foi escrito como
     número), em vez de sair como vértice solto na malha. */
  if (soltos.length) return erro('vertices', `${soltos.length === 1 ? 'o vértice' : 'os vértices'} ${soltos.join(', ')} da gaiola ${soltos.length === 1 ? 'não pertence' : 'não pertencem'} a nenhuma face`);
  /* medidas: nomes de ponto da gaiola que a superfície limite atravessa, ou { ponto, peso } para a cota que a superfície
     só aproxima por mínimos quadrados; os outros pontos ficam onde foram declarados (com peso, perto de onde foram
     declarados). Na simetria em x, a imagem espelhada de um ponto medido também é medida, com o mesmo peso.
     `pesoPadrao` declara que os pontos da gaiola vêm de leitura de imagem: o nome escrito sozinho ganha esse peso em vez de
     ser cota exata, e a cota de projeto que a peça precisa acertar se escreve { ponto, exata: true }. A declaração de um
     ponto (peso ou exata) vence o padrão sobre ele. Sem `pesoPadrao`, o nome sozinho continua a cota exata. */
  if (a.medidas != null) {
    if (!Array.isArray(a.medidas) || !a.medidas.length) return erro('medidas', `medidas precisa ser lista não vazia de nomes de ponto da gaiola ou de ${EXEMPLO_DE_MEDIDA}`);
    let pesoPadrao = null;
    if (a.pesoPadrao != null) {
      pesoPadrao = num(a.pesoPadrao);
      if (!Number.isFinite(pesoPadrao) || pesoPadrao <= 0) return erro('pesoPadrao', `pesoPadrao precisa ser número finito maior que zero, e veio ${pesoPadrao}`);
    }
    const lidas = [];
    for (const m of a.medidas) {
      let nome = m; let peso = pesoPadrao ?? Infinity; let declarada = pesoPadrao === null;
      if (m && typeof m === 'object' && !Array.isArray(m)) {
        const extra = Object.keys(m).filter((k) => k !== 'ponto' && k !== 'peso' && k !== 'exata');
        if (extra.length) return erro('medidas', `a medida com peso tem campo desconhecido ${extra.map(citar).join(', ')}; os campos são ponto e peso, como ${EXEMPLO_DE_MEDIDA}, ou ponto e exata, como ${EXEMPLO_DE_EXATA}`);
        if (typeof m.ponto !== 'string') return erro('medidas', `a medida com peso precisa do nome do ponto, como ${EXEMPLO_DE_MEDIDA}`);
        nome = m.ponto; declarada = true;
        if (m.exata != null && m.exata !== true) return erro('medidas', `a medida ${citar(nome)} aceita exata só como true, como ${EXEMPLO_DE_EXATA}`);
        if (m.exata === true) {
          if (m.peso != null) return erro('medidas', `a medida ${citar(nome)} declara exata e peso; a cota exata não tem peso`);
          peso = Infinity;
        } else {
          if (m.peso == null) return erro('medidas', `a medida ${citar(nome)} precisa de peso maior que zero, como ${EXEMPLO_DE_MEDIDA}; para a cota exata, escreva só o nome${pesoPadrao === null ? '' : ' (com pesoPadrao, { ponto, exata: true })'}`);
          peso = num(m.peso);
          if (!Number.isFinite(peso) || peso <= 0) return erro('medidas', `a medida ${citar(nome)} tem peso ${peso}; o peso é número finito maior que zero, e a cota exata se escreve só com o nome${pesoPadrao === null ? '' : ' ou { ponto, exata: true }'}`);
        }
      } else if (typeof m !== 'string') return erro('medidas', `medidas precisa ser lista não vazia de nomes de ponto da gaiola ou de ${EXEMPLO_DE_MEDIDA}`);
      if (!indiceDoNome.has(nome)) return erro('medidas', `a medida '${nome}' não é ponto declarado da gaiola`);
      lidas.push({ indice: indiceDoNome.get(nome), peso, nome, declarada });
    }
    /* o padrão não vence uma declaração sobre o mesmo ponto; duas declarações de pesos diferentes gritam */
    const vistos = new Map();
    for (const m of lidas) {
      const antes = vistos.get(m.nome);
      if (antes?.declarada && !m.declarada) continue;
      if (antes?.declarada && m.declarada && antes.peso !== m.peso) return erro('medidas', `o ponto ${citar(m.nome)} aparece em medidas com pesos diferentes`);
      vistos.set(m.nome, m);
    }
    lidas.splice(0, lidas.length, ...vistos.values());
    const origem = gaiola.vertices.map((_, k) => k);
    if (gaiola.imagem) gaiola.imagem.forEach((k, j) => { origem[k] = j; });
    declaradaCheia = gaiola;
    try {
      if (lidas.every((m) => m.peso === Infinity)) {
        /* só medidas exatas: o caminho de sempre, que a saída das fixtures guarda bit a bit */
        const indices = lidas.map((m) => m.indice);
        const marcados = gaiola.imagem ? [...indices, ...indices.map((k) => gaiola.imagem[k])] : indices;
        medidasLidas = [...new Set(marcados)].map((indice) => ({ indice, peso: Infinity }));
        gaiola = { ...gaiola, vertices: ajustarGaiolaAsMedidas({ ...gaiola, borda: a.borda ?? 'suave' }, marcados).vertices };
      } else {
        const marcados = lidas.map(({ indice, peso }) => ({ indice, peso }));
        if (gaiola.imagem) marcados.push(...lidas.map(({ indice, peso }) => ({ indice: gaiola.imagem[indice], peso })));
        medidasLidas = marcados;
        gaiola = { ...gaiola, vertices: ajustarGaiolaAsMedidasComPeso({ ...gaiola, borda: a.borda ?? 'suave' }, marcados).vertices };
      }
    } catch (e) {
      if (!e.indices) return erro('medidas', String(e.message));
      const nomes = [...new Set(e.indices.map((k) => origem[k]))].map((k) => (typeof declarados[k] === 'string' ? `'${declarados[k]}'` : `[${gaiola.vertices[k].join(', ')}]`));
      return erro('medidas', `${e.motivo}: ${nomes.join(', ')}`);
    }
  }
  return { gaiola, declarados, declaradaCheia, medidas: medidasLidas };
}

export function criarOperacoesSubdivisao({ BLOCO, FAIXA_ESTENDIDA, idDoPasso, confereId, grita, addV, addF, registraOrigem }) {
  return {
  subdivisao(st, a, i) {
    confereId(st, i, 'subdivisao', a);
    if (a.origemId != null && (!Number.isSafeInteger(a.origemId) || a.origemId < 0)) return grita(st, i, 'subdivisao', 'origemId', 'origemId precisa ser inteiro não-negativo');
    const resolvida = gaiolaDoPasso(a, st);
    if (resolvida.erro) return grita(st, i, 'subdivisao', ...resolvida.erro);
    let { gaiola } = resolvida; const { declarados } = resolvida;
    let espessura = null;
    if (a.espessura != null) {
      espessura = st.num(a.espessura);
      if (!Number.isFinite(espessura) || espessura <= 0) return grita(st, i, 'subdivisao', 'espessura', `a espessura precisa ser maior que zero, e veio ${espessura}`);
      if (a.lado != null && a.lado !== 'contraNormal' && a.lado !== 'normal') return grita(st, i, 'subdivisao', 'lado', `lado precisa ser 'contraNormal' (o material contra a normal das faces, o padrão) ou 'normal', e veio ${JSON.stringify(a.lado)}`);
    } else if (a.lado != null) return grita(st, i, 'subdivisao', 'lado', 'lado só vale com espessura: declare a espessura da chapa');
    let liso = false;
    if (a.liso !== false) {
      const angulo = a.liso == null ? LISO_PADRAO : st.num(a.liso);
      try { liso = valorDoLiso(angulo); } catch { return grita(st, i, 'subdivisao', 'liso', `liso precisa ser ângulo em graus entre 0 e 180 (padrão ${LISO_PADRAO}), ou false para as faces chapadas, e veio ${JSON.stringify(a.liso)}`); }
    }
    const quebra = a.quebraNosVincos ?? 'vivos';
    if (!QUEBRAS.includes(quebra)) return grita(st, i, 'subdivisao', 'quebraNosVincos', `quebraNosVincos precisa ser 'vivos' (o padrão: a sombra se divide nos vincos vivos), 'todos' (também nos de nitidez fracionária) ou 'nenhum', e veio ${JSON.stringify(quebra)}`);
    if (liso === false && a.quebraNosVincos != null) return grita(st, i, 'subdivisao', 'quebraNosVincos', 'quebraNosVincos só vale com as faces lisas; com liso: false toda aresta já divide a sombra');
    let r;
    try {
      /* Com medidas, a malha entregue vai à superfície limite: sem isso o ponto medido ficaria a centímetros da malha de
         nível finito, e a cota não apareceria na peça. Sem medidas, a malha é a do nível pedido, como no oráculo. */
      r = subdividirCatmullClark({ ...gaiola, niveis: Math.trunc(st.num(a.niveis ?? 2)), borda: a.borda ?? 'suave', aoLimite: a.medidas != null, comVincos: true });
    } catch (e) { return grita(st, i, 'subdivisao', 'gaiola', String(e.message)); }
    /* as arestas da superfície em que a sombra se divide; com espessura, a face interna repete cada uma a nS vértices */
    const nS = r.vertices.length;
    const quebras = liso === false || quebra === 'nenhum' ? [] : r.vincos.filter(([, , viva]) => quebra === 'todos' || viva).map(([p, q]) => [p, q]);
    let partes = null;
    if (espessura !== null) {
      /* A superfície subdividida é a face externa, e nela ficam as medidas; a interna e a parede das bordas livres e dos
         vãos são derivadas. Quando a espessura passa do raio local, o grito cita os pontos nomeados da gaiola mais perto
         de onde a face interna se dobra. */
      try {
        const s = espessarSuperficie({ vertices: r.vertices, faces: r.faces, espessura, lado: a.lado ?? 'contraNormal' });
        r = s; partes = s.partes;
      } catch (e) {
        if (!(e instanceof ErroDaEspessura)) return grita(st, i, 'subdivisao', 'espessura', String(e.message));
        return grita(st, i, 'subdivisao', 'espessura', `${e.motivo}${lugaresDaEspessura(e.lugares, r.vertices, gaiola, declarados)}`);
      }
    }
    const limite = BLOCO + FAIXA_ESTENDIDA;
    if (r.vertices.length > limite || r.faces.length > limite) return grita(st, i, 'subdivisao', 'niveis', `a subdivisão gera ${r.vertices.length} vértices e ${r.faces.length} faces, acima do limite do passo (${limite})`);
    r.vertices.forEach((p, k) => addV(st, idDoPasso(i, k), p));
    const facesSaida = r.faces.map((f, k) => { const id = idDoPasso(i, k); addF(st, id, f.map((v) => idDoPasso(i, v))); return id; });
    if (liso !== false) {
      const naQuebra = new Set(quebras.map(([p, q]) => chave(p, q)));
      if (espessura !== null) for (const [p, q] of quebras) naQuebra.add(chave(p + nS, q + nS));
      r.faces.forEach((f, k) => {
        const face = st.F.get(facesSaida[k]); face.liso = liso;
        if (!naQuebra.size) return;
        const daFace = [];
        for (let j = 0; j < f.length; j++) {
          const p = f[j], q = f[(j + 1) % f.length];
          if (naQuebra.has(chave(p, q))) { const ip = idDoPasso(i, p), iq = idDoPasso(i, q); daFace.push(ip < iq ? [ip, iq] : [iq, ip]); }
        }
        if (daFace.length) face.quebras = daFace;
      });
    }
    if (a.origemId != null) {
      const grupos = partes ? Object.fromEntries(Object.entries(partes).map(([nome, lista]) => [nome, lista.map((k) => facesSaida[k])])) : {};
      registraOrigem(st, i, 'subdivisao', a.origemId, { faces: facesSaida, espessura: partes !== null, ...grupos });
    }
    /* A gaiola da chapa, para a conferência dos vãos (`src/autoria/molduras-do-vao.js`) achar as aberturas pela borda livre dela:
       os nomes, as faces por índice da gaiola cheia (a simetria aplicada), as posições, os níveis e a imagem espelhada. Só leitura;
       nada disto entra na malha nem na forma canônica. */
    const indiceDoNome = new Map();
    declarados.forEach((v, k) => { if (typeof v === 'string') indiceDoNome.set(v, k); });
    (st.chapas ??= []).push({
      passo: i, origemId: a.origemId ?? null, declarados: declarados.map((v) => (typeof v === 'string' ? v : null)), indiceDoNome,
      faces: gaiola.faces.map((f) => [...f]), vertices: gaiola.vertices.map((p) => [...p]), nVertices: gaiola.vertices.length,
      niveis: Math.trunc(st.num(a.niveis ?? 2)), simetria: a.simetria ?? null, imagem: gaiola.imagem ?? null,
    });
  },
  };
}
