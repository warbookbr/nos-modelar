/* friso.js (operação) — nervura, tubo ou friso que segue uma linha nomeada, com perfil declarado.
   A linha é uma sequência de pontos nomeados da gaiola de um passo `subdivisao` anterior, citado por origem, ou uma
   polilinha de pontos com uma normal declarada. Na superfície, a linha segue as arestas da gaiola, e cada ponto dela é
   o vértice da malha que o passo da superfície entregou sobre essas arestas (no ponto limite quando o passo tem
   `medidas`); a normal é a da face de fora da chapa naquele vértice. Assim o friso acompanha a chapa vértice a vértice,
   mesmo depois de uma pose ou transformação dela. O perfil [u, v] tem v pela normal, com v = 0 na superfície, e u para
   a esquerda de quem segue a linha; a parte de v negativo entra na chapa, e com espessura o passo confere que ela
   entra e não atravessa. O friso é um sólido próprio que interpenetra a chapa, e a receita declara o contato entre as
   partes (`contatos`), que `contatosDaPeca` mede; a fusão por booleana fica de fora, como no plano da carroceria.
   Na simetria em x, o friso segue a chapa: a linha que toca o plano x = 0 numa ponta continua na imagem espelhada, a
   que toca nas duas vira volta fechada, e a que não toca ganha a cópia espelhada. Nenhum índice sai da receita.

   A ABA. No lugar de `perfil`, `aba: { largura, angulo, raio }` dobra para dentro a borda livre de uma chapa com
   espessura: a linha é a borda de um vão ou do contorno, pelos nomes da gaiola (`bordaDoVao` da gaiola por estações dá a
   de um vão), em qualquer sentido, e o passo acha o lado da chapa pelo sentido em que as faces percorrem a aresta. O perfil
   em L (`perfilDaAba`) nasce na face de fora e na de dentro da chapa sobre a linha, dobra no raio e no ângulo declarados e
   segue em perna reta; as faces saem lisas a 30 graus e as tampas das pontas abertas são quadriláteros. */
import { ErroDoFriso, cadeiaRefinada, ladoDaBorda, perfilDaAba, tampaDaAba, varrerPerfil } from '../friso.js';
import { valorDoLiso } from '../liso-por-angulo.js';
import { espelharGaiolaEmX } from '../subdivisao.js';
import { formaParaContorno, ErroDePerfil, SEGMENTOS_ARCO_PADRAO } from '../perfil2d.js';
import { ehSimples } from '../contorno.js';

/** A aba sai com as faces lisas até este ângulo, como as da superfície: a dobra arredonda a sombra e a ponta e a espessura ficam vivas. */
const LISO_DA_ABA = valorDoLiso(30);
const EXEMPLO_DE_ABA = "aba: { largura: 0.02, angulo: 90, raio: 0.003 }";
const EXEMPLO_DE_LINHA = "{ nome: 'frisoDaPorta', pontos: ['a', 'b', 'c'] }";
const citar = (nome) => `'${nome}'`;
const iguais = (p, q) => (typeof p === 'string' || typeof q === 'string' ? p === q : Array.isArray(p) && Array.isArray(q) && p.length === q.length && p.every((x, k) => x === q[k]));

/* Normal de Newell de uma face por posições, com o comprimento igual ao dobro da área. */
function newell(pontos) {
  const n = [0, 0, 0];
  for (let k = 0; k < pontos.length; k++) {
    const a = pontos[k], b = pontos[(k + 1) % pontos.length];
    n[0] += (a[1] - b[1]) * (a[2] + b[2]); n[1] += (a[2] - b[2]) * (a[0] + b[0]); n[2] += (a[0] - b[0]) * (a[1] + b[1]);
  }
  return n;
}

/* As cadeias de pontos da gaiola cheia que o friso percorre: a linha declarada e, na simetria em x, a imagem dela,
   emendada à linha pela ponta que fica no plano x = 0. Cada cadeia diz se é volta e se é a cópia espelhada. */
function cadeiasDaSimetria(cadeia, fechada, imagem) {
  if (!imagem) return [{ cadeia, fechada, espelhada: false }];
  const noPlano = (k) => imagem[k] === k;
  if (cadeia.every(noPlano)) return [{ cadeia, fechada, espelhada: false }];
  if (fechada) return [{ cadeia, fechada, espelhada: false }, { cadeia, fechada, espelhada: true }];
  const im = cadeia.map((k) => imagem[k]);
  const ini = noPlano(cadeia[0]), fim = noPlano(cadeia[cadeia.length - 1]);
  if (ini && fim) return [{ cadeia: [...cadeia, ...[...im].reverse().slice(1)], fechada: true, espelhada: false }];
  if (fim) return [{ cadeia: [...cadeia, ...[...im].reverse().slice(1)], fechada: false, espelhada: false }];
  if (ini) return [{ cadeia: [...[...im].reverse(), ...cadeia.slice(1)], fechada: false, espelhada: false }];
  return [{ cadeia, fechada, espelhada: false }, { cadeia, fechada, espelhada: true }];
}

export function criarOperacoesFriso({ BLOCO, FAIXA_ESTENDIDA, idDoPasso, confereId, grita, addV, addF, registraOrigem, validarOrigem }) {
  /* A superfície: o passo `subdivisao` que a origem cita, já executado. Devolve { passo, args } ou { erro }. */
  function passoDaSuperficie(st, origem) {
    if (!origem || typeof origem !== 'object' || origem.op !== 'subdivisao' || Object.keys(origem).some((k) => k !== 'op' && k !== 'id')) return { erro: "superficie precisa ser a origem de um passo subdivisao, { op: 'subdivisao', id }, sem parte: o friso lê a face de fora da chapa" };
    const validacao = validarOrigem(origem);
    if (validacao.erro) return { erro: `superficie: ${validacao.erro}` };
    const declaracoes = st.declaracoesOrigem.get(origem.id) ?? [];
    if (declaracoes.length !== 1 || declaracoes[0].op !== 'subdivisao') return { erro: `superficie: nenhum passo subdivisao declara a origem ${origem.id}${declaracoes.length > 1 ? ' sozinho' : ''}` };
    if (!(st.origens.get(origem.id) ?? []).length) return { erro: `superficie: o passo subdivisao da origem ${origem.id} ainda não foi executado ou gritou; ele precisa vir antes do friso e gerar a malha` };
    const passo = declaracoes[0].passo;
    return { passo, args: st.passos[passo][1] ?? {} };
  }

  /* A linha sobre a chapa: pontos, normais e o nome do ponto da gaiola mais perto de cada ponto, por cadeia. */
  function linhaNaSuperficie(st, a, nomes, fechada) {
    const sup = passoDaSuperficie(st, a.superficie);
    if (sup.erro) return { erro: ['superficie', sup.erro] };
    const { passo, args } = sup;
    const declarados = args.vertices ?? [];
    const indiceDoNome = new Map();
    declarados.forEach((v, k) => { if (typeof v === 'string') indiceDoNome.set(v, k); });
    for (const p of nomes) {
      if (typeof p !== 'string') return { erro: ['linha', `a linha ${citar(a.linha.nome)} sobre a superfície cita pontos da gaiola por nome; veio ${JSON.stringify(p)}`] };
      if (!indiceDoNome.has(p)) return { erro: ['linha', `a linha ${citar(a.linha.nome)} cita o ponto ${citar(p)}, que não é ponto nomeado da gaiola da superfície`] };
    }
    let faces = (args.faces ?? []).map((f) => f.map((p) => (typeof p === 'string' ? indiceDoNome.get(p) : p)));
    let imagem = null; let nVertices = declarados.length;
    if (args.simetria === 'x') {
      const espelhada = espelharGaiolaEmX({ vertices: declarados.map((p) => st.vec(p)), faces });
      faces = espelhada.faces; imagem = espelhada.imagem; nVertices = espelhada.vertices.length;
    }
    const niveis = Math.trunc(st.num(args.niveis ?? 2));
    const cadeia = nomes.map((p) => indiceDoNome.get(p));
    const nomeDoPonto = (k) => {
      if (k < declarados.length) return citar(declarados[k]);
      const j = imagem.indexOf(k);
      return `${citar(declarados[j])} espelhado`;
    };
    try { cadeiaRefinada(faces, nVertices, 0, cadeia); } catch (e) {
      if (!(e instanceof ErroDoFriso)) throw e;
      return { erro: ['linha', `a linha ${citar(a.linha.nome)} liga ${citar(nomes[e.indice])} a ${citar(nomes[e.indice + 1])}, que não formam aresta da gaiola; a linha segue as arestas da gaiola, como o vinco`] };
    }
    /* As faces da malha entregue pelo passo da superfície, na ordem dele: a face k é o id idDoPasso(passo, k). */
    const lista = [];
    for (const c of cadeiasDaSimetria(cadeia, fechada, imagem)) {
      const r = cadeiaRefinada(faces, nVertices, niveis, c.cadeia);
      const passoDaCadeia = 2 ** niveis;
      const facesDoVertice = new Map();
      const naCadeia = new Set(r.cadeia);
      r.faces.forEach((f, fi) => { for (const v of f) if (naCadeia.has(v)) { if (!facesDoVertice.has(v)) facesDoVertice.set(v, []); facesDoVertice.get(v).push(fi); } });
      const pontos = []; const normais = [];
      const indices = c.fechada ? r.cadeia.slice(0, -1) : r.cadeia;
      for (const v of indices) {
        const p = st.V.get(idDoPasso(passo, v));
        if (!p) return { erro: ['superficie', `o vértice da chapa sob a linha ${citar(a.linha.nome)} perto de ${nomeDoPonto(c.cadeia[0])} não existe mais; o friso lê a superfície como o passo ${passo} a gerou`] };
        const n = [0, 0, 0];
        for (const fi of facesDoVertice.get(v) ?? []) {
          const face = st.F.get(idDoPasso(passo, fi));
          const esperado = r.faces[fi].map((k) => idDoPasso(passo, k));
          if (!face || face.vs.length !== esperado.length || !esperado.every((id) => face.vs.includes(id))) return { erro: ['superficie', `a face da chapa sob a linha ${citar(a.linha.nome)} mudou depois do passo ${passo}; o friso lê a superfície como o passo a gerou`] };
          const m = newell(face.vs.map((id) => st.V.get(id)));
          n[0] += m[0]; n[1] += m[1]; n[2] += m[2];
        }
        pontos.push(p); normais.push(n);
      }
      const nomeDoIndice = (j) => nomeDoPonto(c.cadeia[Math.min(c.cadeia.length - 1, Math.round(j / passoDaCadeia))]);
      /* a aba precisa saber de que lado da linha a chapa fica: a linha é borda livre, e a chapa é o lado da face que a tem */
      let lado = null;
      if (a.aba != null) {
        const tocadas = new Set();
        for (const fis of facesDoVertice.values()) for (const fi of fis) tocadas.add(fi);
        try {
          lado = ladoDaBorda([...tocadas].map((fi) => st.F.get(idDoPasso(passo, fi)).vs), r.cadeia.map((v) => idDoPasso(passo, v)));
        } catch (e) {
          if (!(e instanceof ErroDoFriso)) throw e;
          return { erro: ['linha', `a aba segue a borda livre da chapa, e na linha ${citar(a.linha.nome)}, perto de ${nomeDoIndice(e.indice)}${c.espelhada ? ' (na cópia espelhada)' : ''}: ${e.motivo}; cite os pontos da borda de um vão ou do contorno (bordaDoVao dá a de um vão)`] };
        }
      }
      lista.push({ pontos, normais, fechada: c.fechada, espelhada: c.espelhada, lado, nomeDoIndice });
    }
    let espessura = null;
    if (args.espessura != null) espessura = st.num(args.espessura);
    return { cadeias: lista, espessura };
  }

  /* A aba declarada: largura (da perna reta), angulo (de quanto a chapa gira na dobra, em graus) e raio (da face de
     dentro da dobra), todos obrigatórios para a medida da aba ficar escrita na receita. */
  function lerAba(st, a) {
    if (a.perfil != null) return { erro: ['aba', 'aba e perfil se excluem: a aba desenha o próprio perfil em L; declare só um dos dois'] };
    const aba = a.aba;
    if (!aba || typeof aba !== 'object' || Array.isArray(aba)) return { erro: ['aba', `aba precisa ser a medida da dobra, como ${EXEMPLO_DE_ABA}`] };
    const extra = Object.keys(aba).filter((k) => k !== 'largura' && k !== 'angulo' && k !== 'raio');
    if (extra.length) return { erro: ['aba', `a aba tem campo desconhecido ${extra.map(citar).join(', ')}; os campos são largura, angulo e raio`] };
    const lida = {};
    for (const campo of ['largura', 'angulo', 'raio']) {
      if (aba[campo] == null) return { erro: ['aba', `a aba precisa de ${campo}, como ${EXEMPLO_DE_ABA}: largura da perna reta, angulo em graus e raio da face de dentro da dobra`] };
      try { lida[campo] = st.num(aba[campo]); } catch (e) { return { erro: ['aba', `${campo} da aba: ${e.message}`] }; }
    }
    return lida;
  }

  return {
  friso(st, a, i) {
    confereId(st, i, 'friso', a);
    if (a.origemId != null && (!Number.isSafeInteger(a.origemId) || a.origemId < 0)) return grita(st, i, 'friso', 'origemId', 'origemId precisa ser inteiro não-negativo');
    const linha = a.linha;
    if (!linha || typeof linha !== 'object' || Array.isArray(linha)) return grita(st, i, 'friso', 'linha', `linha precisa ser a linha nomeada, como ${EXEMPLO_DE_LINHA}`);
    const extra = Object.keys(linha).filter((k) => k !== 'nome' && k !== 'pontos');
    if (extra.length) return grita(st, i, 'friso', 'linha', `a linha tem campo desconhecido ${extra.map(citar).join(', ')}; os campos são nome e pontos`);
    if (typeof linha.nome !== 'string' || !linha.nome) return grita(st, i, 'friso', 'linha', `a linha precisa de nome, como ${EXEMPLO_DE_LINHA}`);
    if (!Array.isArray(linha.pontos) || linha.pontos.length < 2) return grita(st, i, 'friso', 'linha', `a linha ${citar(linha.nome)} precisa de dois pontos ou mais; repita o primeiro no fim para fechar a volta`);
    const fechada = linha.pontos.length > 2 && iguais(linha.pontos[0], linha.pontos[linha.pontos.length - 1]);
    if (fechada && linha.pontos.length < 4) return grita(st, i, 'friso', 'linha', `a volta ${citar(linha.nome)} precisa de três pontos distintos ou mais`);
    /* pontas: 'aberta' tampa o perfil plano, 'fechada' encolhe o perfil até um ponto; a volta não tem ponta */
    let pontas = ['aberta', 'aberta'];
    if (a.ponta != null) {
      if (fechada) return grita(st, i, 'friso', 'ponta', `a linha ${citar(linha.nome)} é volta fechada e não tem ponta; tire ponta`);
      const lista = typeof a.ponta === 'string' ? [a.ponta, a.ponta] : a.ponta;
      if (!Array.isArray(lista) || lista.length !== 2 || lista.some((p) => p !== 'aberta' && p !== 'fechada')) return grita(st, i, 'friso', 'ponta', `ponta precisa ser 'aberta' (tampa plana), 'fechada' (o perfil encolhe até um ponto ao longo de fechamento) ou [inicio, fim] com esses valores; veio ${JSON.stringify(a.ponta)}`);
      pontas = lista;
    }
    let fechamento = null;
    if (a.fechamento != null) {
      if (!pontas.includes('fechada')) return grita(st, i, 'friso', 'fechamento', "fechamento só vale com ponta 'fechada'");
      fechamento = st.num(a.fechamento);
      if (!Number.isFinite(fechamento) || fechamento <= 0) return grita(st, i, 'friso', 'fechamento', `o fechamento precisa ser maior que zero, e veio ${fechamento}`);
    }
    let segmentosArco;
    try {
      segmentosArco = a.segmentosArco == null ? SEGMENTOS_ARCO_PADRAO : st.num(a.segmentosArco);
    } catch (e) { return grita(st, i, 'friso', 'segmentosArco', String(e.message)); }
    if (!Number.isInteger(segmentosArco) || segmentosArco < 1) return grita(st, i, 'friso', 'segmentosArco', `segmentosArco precisa ser inteiro de 1 para cima, e veio ${segmentosArco}`);
    const comAba = a.aba != null;
    let perfil = null; let vMin = null; let vMax = null; let medidasDaAba = null;
    if (comAba) {
      const lida = lerAba(st, a);
      if (lida.erro) return grita(st, i, 'friso', lida.erro[0], lida.erro[1]);
      medidasDaAba = lida;
    } else {
      try {
        perfil = formaParaContorno(a.perfil, 'perfil', { num: st.num, segmentosArco });
      } catch (e) {
        if (e instanceof ErroDePerfil) return grita(st, i, 'friso', 'perfil', `${e.message}; o perfil é [u, v] com v pela normal (v = 0 na superfície) e u para a esquerda de quem segue a linha`);
        throw e;
      }
      if (!ehSimples(perfil)) return grita(st, i, 'friso', 'perfil', 'o perfil se cruza; desenhe um polígono simples');
      vMin = Math.min(...perfil.map((p) => p[1])); vMax = Math.max(...perfil.map((p) => p[1]));
      if (!(vMax > 0)) return grita(st, i, 'friso', 'perfil', `o perfil fica todo abaixo da linha (v de ${vMin} a ${vMax}); o friso sai pela normal, com v > 0`);
    }

    let cadeias;
    if (a.superficie != null) {
      if (a.normal != null) return grita(st, i, 'friso', 'normal', 'normal só vale na polilinha; sobre a superfície o friso segue a normal da chapa');
      let r;
      try { r = linhaNaSuperficie(st, a, linha.pontos, fechada); } catch (e) { return grita(st, i, 'friso', 'superficie', String(e.message)); }
      if (r.erro) return grita(st, i, 'friso', r.erro[0], r.erro[1]);
      if (comAba) {
        if (r.espessura === null) return grita(st, i, 'friso', 'aba', 'a aba dobra a borda de uma chapa com espessura: declare espessura no passo subdivisao da superfície');
        try {
          perfil = perfilDaAba({ ...medidasDaAba, espessura: r.espessura, segmentosPorQuarto: segmentosArco });
        } catch (e) {
          if (!(e instanceof ErroDoFriso)) throw e;
          return grita(st, i, 'friso', 'aba', e.motivo);
        }
        if (!ehSimples(perfil)) return grita(st, i, 'friso', 'aba', `o perfil da aba se cruza: com raio ${medidasDaAba.raio}, espessura ${r.espessura}, largura ${medidasDaAba.largura} e ${medidasDaAba.angulo} graus a perna atravessa a dobra; reduza o ângulo ou a largura`);
      } else if (r.espessura !== null) {
        if (!(vMin < 0)) return grita(st, i, 'friso', 'perfil', `o perfil não entra na chapa (v vai de ${vMin} a ${vMax}): sem uma parte abaixo de v = 0 o friso só encostaria numa linha da superfície; desça o perfil para dentro da chapa, de menos que a espessura ${r.espessura}`);
        if (!(-vMin < r.espessura)) return grita(st, i, 'friso', 'perfil', `o perfil entra ${-vMin} na chapa, e a espessura é ${r.espessura}: ele atravessaria a face de dentro; suba o perfil para entrar menos que a espessura`);
      }
      cadeias = r.cadeias;
    } else {
      if (comAba) return grita(st, i, 'friso', 'aba', "a aba dobra a borda da chapa: cite a superfície por superficie: { op: 'subdivisao', id } e a borda de um vão pelos nomes da gaiola");
      if (a.normal == null) return grita(st, i, 'friso', 'normal', "a polilinha precisa de normal, o vetor para onde v aponta; ou cite a superfície por superficie: { op: 'subdivisao', id } com os nomes da gaiola");
      let normal; let pontos;
      try {
        normal = st.vec(a.normal);
        pontos = (fechada ? linha.pontos.slice(0, -1) : linha.pontos).map((p) => st.vec(p));
      } catch (e) { return grita(st, i, 'friso', 'linha', String(e.message)); }
      const nome = (j) => (typeof linha.pontos[j] === 'string' ? citar(linha.pontos[j]) : `o ponto ${j} [${linha.pontos[j]}]`);
      cadeias = [{ pontos, normais: pontos.map(() => normal), fechada, espelhada: false, nomeDoIndice: nome }];
    }

    const vertices = []; const faces = []; const lateral = []; const tampas = [];
    for (const c of cadeias) {
      let s;
      try {
        s = varrerPerfil({ pontos: c.pontos, normais: c.normais, perfil: comAba ? perfil.map(([w, v]) => [c.lado * w, v]) : perfil, fechada: c.fechada, pontas, fechamento, tampa: comAba ? tampaDaAba(perfil) : null });
      } catch (e) {
        if (!(e instanceof ErroDoFriso)) return grita(st, i, 'friso', 'linha', String(e.message));
        return grita(st, i, 'friso', 'linha', `na linha ${citar(linha.nome)}${e.indice != null ? `, perto de ${c.nomeDoIndice(e.indice)}${c.espelhada ? ' (na cópia espelhada)' : ''}` : ''}: ${e.motivo}`);
      }
      const base = vertices.length;
      for (const p of s.vertices) vertices.push(c.espelhada ? [-p[0], p[1], p[2]] : p);
      const inicio = faces.length;
      for (const f of s.faces) faces.push((c.espelhada ? [...f].reverse() : f).map((k) => base + k));
      for (const k of s.partes.lateral) lateral.push(inicio + k);
      for (const k of s.partes.pontas) tampas.push(inicio + k);
    }
    const limite = BLOCO + FAIXA_ESTENDIDA;
    if (vertices.length > limite || faces.length > limite) return grita(st, i, 'friso', 'linha', `o friso gera ${vertices.length} vértices e ${faces.length} faces, acima do limite do passo (${limite})`);
    vertices.forEach((p, k) => addV(st, idDoPasso(i, k), p));
    const facesSaida = faces.map((f, k) => { const id = idDoPasso(i, k); addF(st, id, f.map((v) => idDoPasso(i, v))); if (comAba) st.F.get(id).liso = LISO_DA_ABA; return id; });
    if (a.origemId != null) registraOrigem(st, i, 'friso', a.origemId, { faces: facesSaida, lateral: lateral.map((k) => facesSaida[k]), pontas: tampas.map((k) => facesSaida[k]) });
  },
  };
}

