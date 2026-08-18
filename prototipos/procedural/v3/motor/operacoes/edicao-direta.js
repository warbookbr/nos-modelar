/* edicao-direta.js — edições locais por identidade, via serviços explícitos do núcleo. */
export function criarOperacoesEdicaoDireta({ baseDoPasso, grita, normalDaFace, addV, addF, colapsaCiclo, distintos, resolverSelecao }) {
  return {
  moveV(st, a, i) {
    const v = a.v;
    if (!st.V.has(v)) return grita(st, i, 'moveV', v, 'vértice inexistente');
    const d = st.vec(a.d ?? [0, 0, 0]);
    const p = st.V.get(v);
    st.V.set(v, [p[0] + d[0], p[1] + d[1], p[2] + d[2]]);   // SEMPRE por deslocamento (acompanha a base)
  },

  /* extruda (modo face): a prova da numeração de meio-de-caminho. Cria um anel
     NOVO de vértices (base = POSIÇÃO do passo), levanta a face por `dist` na
     normal, e ergue as paredes laterais. */
  extruda(st, a, i) {
    const fid = a.face;
    const f = st.F.get(fid);
    if (!f) return grita(st, i, 'extruda', fid, 'face inexistente');
    const anel = f.vs.slice();
    for (const v of anel) if (!st.V.has(v)) return grita(st, i, 'extruda', v, 'canto da face inexistente');
    const dist = st.num(a.dist ?? 0);
    const N = normalDaFace(st.V, anel);
    const b = baseDoPasso(i);                 // vértices novos: numerados pela posição
    const novo = anel.map((v, k) => { const p = st.V.get(v); const id = b + k; addV(st, id, [p[0] + N[0] * dist, p[1] + N[1] * dist, p[2] + N[2] * dist]); return id; });
    for (let k = 0; k < anel.length; k++) { const n = (k + 1) % anel.length; addF(st, b + k, [anel[k], anel[n], novo[n], novo[k]]); } // paredes
    f.vs = novo;                              // a face-tampa sobe pro anel novo (mantém o id)
  },

  /* mescla (de:[ids] -> para:id): a interação mais delicada. Some os `de`, faz
     as faces apontarem pro `para`, colapsa cantos repetidos e apaga a face que
     virou área-zero (<3 cantos distintos). Não abre buraco no motor — o solto é
     re-gerado na exportação. `de`/`para` ficam gravados no passo. */
  mescla(st, a, i) {
    const para = a.para;
    if (!st.V.has(para)) return grita(st, i, 'mescla', para, 'destino inexistente');
    const rem = new Set();
    for (const d of a.de ?? []) {
      if (d === para) continue;
      if (!st.V.has(d)) { grita(st, i, 'mescla', d, 'origem inexistente'); continue; }
      rem.add(d);
    }
    if (!rem.size) return;
    for (const f of st.F.values()) {
      const trocado = f.vs.map((v) => (rem.has(v) ? para : v));
      f.vs = colapsaCiclo(trocado);
    }
    for (const [id, f] of [...st.F]) {
      const dist = distintos(f.vs);
      if (dist < 3) { st.F.delete(id); continue; }   // área zero (merge de cantos adjacentes): some quieto, o doc prevê
      if (dist < f.vs.length) { grita(st, i, 'mescla', id, `face ${id} ficou com canto repetido (bowtie) — removida`); st.F.delete(id); }   // D2: dup não-consecutivo -> grita + remove (lei "órfão grita, nunca corrompe")
    }
    for (const d of rem) st.V.delete(d);
    st.merges.push({ de: [...rem].sort((x, y) => x - y), para });
  },

  /* ---- P8 do playground: edição restante — moveF/moveA/vira/apagaFace/displace
     são id-estável puro (como moveV/extruda/mescla acima: nunca criam id, nunca
     renumeram); nenhuma tem numeração própria pra documentar. ---- */

  /* moveF: move TODOS os cantos de uma face pelo mesmo delta — ADITIVO
     (`p+d`), a mesma lei do moveV. Um canto COMPARTILHADO com outra face
     move JUNTO (não existe "vértice exclusivo da face" na malha — é o
     comportamento normal de mover uma face num editor: desloca a geometria,
     não desconecta nada; pra deslocar sem afetar vizinho, use `extruda`
     antes). Face inexistente GRITA (órfão), nunca corrompe. */
  moveF(st, a, i) {
    const fid = a.face;
    const f = st.F.get(fid);
    if (!f) return grita(st, i, 'moveF', fid, 'face inexistente');
    const d = st.vec(a.d ?? [0, 0, 0]);
    for (const v of new Set(f.vs)) {   // Set: um canto REPETIDO na mesma face (não deveria existir — mescla já limpa bowtie) nunca aplica o delta 2×
      const p = st.V.get(v);
      if (!p) { grita(st, i, 'moveF', v, 'canto da face inexistente'); continue; }   // defensivo — nunca deveria faltar
      st.V.set(v, [p[0] + d[0], p[1] + d[1], p[2] + d[2]]);
    }
  },

  /* moveA: move as DUAS pontas de uma aresta (`a`,`b`) pelo mesmo delta —
     açúcar sobre dois moveV (mesma lei ADITIVA), como UM passo só na lista
     (uma aresta é uma ação, não duas). NÃO exige que `a`/`b` estejam de fato
     ligados por alguma face — mover dois vértices juntos nunca corrompe
     nada, então checar conectividade só atrapalharia um uso legítimo. Cada
     ponta inexistente GRITA (órfão) e é ignorada — a outra ainda move. */
  moveA(st, a, i) {
    const d = st.vec(a.d ?? [0, 0, 0]);
    for (const v of [a.a, a.b]) {
      const p = st.V.get(v);
      if (!p) { grita(st, i, 'moveA', v, 'ponta da aresta inexistente'); continue; }
      st.V.set(v, [p[0] + d[0], p[1] + d[1], p[2] + d[2]]);
    }
  },

  /* vira: INVERTE o winding de uma face — reverte a ORDEM dos cantos (`f.vs`),
     o que vira a normal (Newell) pro lado oposto. Não cria nem apaga
     vértice/face, só a ORDEM. Face inexistente GRITA. Conserta uma face que
     nasceu de costas sem reconstruir o passo inteiro.

     CARACTERÍSTICA (não é bug — é a natureza de uma ferramenta cirúrgica,
     medida no teste): virar uma face que já estava CONSISTENTE com as
     vizinhas QUEBRA o pareamento de arestas do teste de manifold — a
     vizinha continua no sentido antigo, então a aresta compartilhada passa a
     andar no MESMO sentido dos dois lados em vez de opostos (medido: 4
     arestas soltas ao virar o topo já-correto de um cubo). O uso responsável
     é o oposto: consertar uma face que JÁ estava de costas (aí virar
     RESTAURA o pareamento, não quebra). `vira` não valida consistência com
     vizinhas — é uma ferramenta pontual, não uma correção automática de
     malha inteira. */
  vira(st, a, i) {
    const fid = a.face;
    const f = st.F.get(fid);
    if (!f) return grita(st, i, 'vira', fid, 'face inexistente');
    f.vs = f.vs.slice().reverse();
  },

  /* apagaFace: remove uma face de `st.F`. Os VÉRTICES dela continuam
     existindo (podem estar em uso por outra face, ou não — um vértice sem
     face nenhuma não é erro, é normal ao abrir um buraco de propósito: porta,
     janela, ou preparo pra composição manual). Face inexistente GRITA. */
  apagaFace(st, a, i) {
    if (a.face != null && a.sel != null) return grita(st, i, 'apagaFace', 'face+sel', 'seleção ambígua: use face:id (legado) OU sel:{...}, nunca os dois');
    if (a.sel != null) {
      const diagnosticosAntes = st.orfaos.length;
      const faces = resolverSelecao(st, a.sel, 'apagaFace', i).faces;
      if (st.orfaos.length !== diagnosticosAntes) return;
      if (faces.size !== 1) {
        if (faces.size > 1) grita(st, i, 'apagaFace', 'sel', 'seleção ambígua: apagaFace exige exatamente uma face');
        return;
      }
      st.F.delete(faces.values().next().value);
      return;
    }
    const fid = a.face;
    if (!st.F.has(fid)) return grita(st, i, 'apagaFace', fid, 'face inexistente');
    st.F.delete(fid);
  },

  /* displace — P8c do playground: desloca uma SELEÇÃO de vértices ao longo da própria
     NORMAL (a média das normais de Newell — `normalDaFace` — de TODAS as faces ATUAIS
     que tocam aquele vértice, medida ANTES de mover qualquer um, como o centroide do
     `rotaciona`) por uma distância de RUÍDO 3D seedado (`ruido3`, acima) amostrado na
     posição do vértice × `frequencia`. Determinístico: a mesma peça com o mesmo
     `semente` sempre desloca pro MESMO lugar (a razão de existir uma semente — sem
     ela não daria pra reproduzir a peça salva, a mesma lei do resto do formato).

     SELEÇÃO (`sel`, opcional, via `resolverAlvosV` — P8): AUSENTE = malha inteira,
     como o `rotaciona`. `amplitude` (padrão 0,1) é o desvio MÁXIMO (mundo); `ruido3`
     devolve [0,1), remapeado pra [−amplitude,+amplitude] antes de multiplicar a
     normal. `frequencia` (padrão 1) escala a posição ANTES de amostrar o ruído — mais
     alta = relevo mais fino (as células do reticulado do ruído cabem mais vezes no
     mesmo espaço); não passa por validação própria (qualquer finito serve, `st.num`
     já barra o resto). Vértice SEM NENHUMA face (ex.: sobrou solto de um `apagaFace`)
     não tem normal pra seguir — GRITA (órfão) e fica no lugar, nunca desloca às
     cegas. Amplitude 0 é no-op determinístico (desvio sempre 0, mas ainda soma —
     não é atalho, só o resultado natural da fórmula). */
  };
}
