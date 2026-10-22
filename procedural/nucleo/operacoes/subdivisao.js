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
import { subdividirCatmullClark, espelharGaiolaEmX, ajustarGaiolaAsMedidas, nitidezDoVinco } from '../subdivisao.js';
import { espessarSuperficie, ErroDaEspessura } from '../espessura.js';
import { valorDoLiso } from '../liso-por-angulo.js';

const EXEMPLO_DE_VINCO = "{ nome: 'vincoDaAba', pontos: ['a', 'b', 'c'], nitidez: 0.5 }";
const EXEMPLO_DE_CANTO = "cantos: ['quinaDaTampa']";

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
  olhar(a.medidas ?? [], 'medidas');
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

export function criarOperacoesSubdivisao({ BLOCO, FAIXA_ESTENDIDA, idDoPasso, confereId, grita, addV, addF, registraOrigem }) {
  return {
  subdivisao(st, a, i) {
    confereId(st, i, 'subdivisao', a);
    if (a.origemId != null && (!Number.isSafeInteger(a.origemId) || a.origemId < 0)) return grita(st, i, 'subdivisao', 'origemId', 'origemId precisa ser inteiro não-negativo');
    let gaiola; let soltos = [];
    const declarados = a.vertices ?? [];
    /* Os pontos nomeados da gaiola: o nome endereça o vértice em faces, vincos, cantos e medidas. */
    const indiceDoNome = new Map();
    for (const [k, v] of declarados.entries()) {
      if (typeof v !== 'string') continue;
      if (indiceDoNome.has(v)) return grita(st, i, 'subdivisao', 'vertices', `o ponto ${citar(v)} aparece mais de uma vez na gaiola`);
      indiceDoNome.set(v, k);
    }
    let faces;
    if (!Array.isArray(a.faces)) return grita(st, i, 'subdivisao', 'faces', 'faces precisa ser lista de faces, cada uma uma lista de nomes de ponto da gaiola');
    try {
      faces = a.faces.map((f) => {
        if (!Array.isArray(f)) throw new TypeError('cada face precisa ser lista de nomes de ponto da gaiola');
        return f.map((p) => {
          if (typeof p !== 'string') return p;
          if (!indiceDoNome.has(p)) throw new TypeError(`a face [${f.map(citar).join(', ')}] cita o ponto ${citar(p)}, que não é ponto nomeado da gaiola`);
          return indiceDoNome.get(p);
        });
      });
    } catch (e) { return grita(st, i, 'subdivisao', 'faces', String(e.message)); }
    const traduzidos = vincosPorNome(a.vincos ?? [], indiceDoNome, faces.filter((f) => f.every((x) => Number.isInteger(x))), st);
    if (traduzidos.erro) return grita(st, i, 'subdivisao', 'vincos', traduzidos.erro);
    const cantos = [];
    if (a.cantos != null) {
      if (!Array.isArray(a.cantos)) return grita(st, i, 'subdivisao', 'cantos', `cantos precisa ser lista de nomes de ponto da gaiola, como ${EXEMPLO_DE_CANTO}`);
      for (const c of a.cantos) {
        if (typeof c !== 'string') return grita(st, i, 'subdivisao', 'cantos', `canto por índice de vértice não é aceito; declare o canto pelo nome do ponto da gaiola, como ${EXEMPLO_DE_CANTO}`);
        if (!indiceDoNome.has(c)) return grita(st, i, 'subdivisao', 'cantos', `o canto ${citar(c)} não é ponto nomeado da gaiola`);
        cantos.push(indiceDoNome.get(c));
      }
    }
    try {
      const vertices = declarados.map((p) => st.vec(p));
      gaiola = { vertices, faces, vincos: traduzidos.vincos, cantos };
      const usados = new Set(faces.flat());
      soltos = vertices.map((p, k) => (usados.has(k) ? null : (typeof declarados[k] === 'string' ? `'${declarados[k]}'` : `[${p.join(', ')}]`))).filter((x) => x !== null);
      if (a.simetria === 'x') gaiola = espelharGaiolaEmX(gaiola);
      else if (a.simetria != null) return grita(st, i, 'subdivisao', 'simetria', "simetria só aceita 'x'");
    } catch (e) { return grita(st, i, 'subdivisao', 'vertices', String(e.message)); }
    /* Vértice sem face não pertence a nenhuma superfície: grita com o nome do ponto (ou a posição, se foi escrito como
       número), em vez de sair como vértice solto na malha. */
    if (soltos.length) return grita(st, i, 'subdivisao', 'vertices', `${soltos.length === 1 ? 'o vértice' : 'os vértices'} ${soltos.join(', ')} da gaiola ${soltos.length === 1 ? 'não pertence' : 'não pertencem'} a nenhuma face`);
    /* medidas: nomes de ponto da gaiola que a superfície limite atravessa; os outros pontos ficam onde foram declarados.
       Na simetria em x, a imagem espelhada de um ponto medido também é medida. */
    if (a.medidas != null) {
      if (!Array.isArray(a.medidas) || !a.medidas.length || a.medidas.some((m) => typeof m !== 'string')) return grita(st, i, 'subdivisao', 'medidas', 'medidas precisa ser lista não vazia de nomes de ponto da gaiola');
      const indices = [];
      for (const nome of a.medidas) {
        if (!indiceDoNome.has(nome)) return grita(st, i, 'subdivisao', 'medidas', `a medida '${nome}' não é ponto declarado da gaiola`);
        indices.push(indiceDoNome.get(nome));
      }
      const origem = gaiola.vertices.map((_, k) => k);
      if (gaiola.imagem) gaiola.imagem.forEach((k, j) => { origem[k] = j; });
      const marcados = gaiola.imagem ? [...indices, ...indices.map((k) => gaiola.imagem[k])] : indices;
      try {
        gaiola = { ...gaiola, vertices: ajustarGaiolaAsMedidas({ ...gaiola, borda: a.borda ?? 'suave' }, marcados).vertices };
      } catch (e) {
        if (!e.indices) return grita(st, i, 'subdivisao', 'medidas', String(e.message));
        const nomes = [...new Set(e.indices.map((k) => origem[k]))].map((k) => (typeof declarados[k] === 'string' ? `'${declarados[k]}'` : `[${gaiola.vertices[k].join(', ')}]`));
        return grita(st, i, 'subdivisao', 'medidas', `${e.motivo}: ${nomes.join(', ')}`);
      }
    }
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
  },
  };
}
