/* edicao-direta.js — edições locais por identidade, via serviços explícitos do núcleo. */
export function criarOperacoesEdicaoDireta({ baseDoPasso, grita, normalDaFace, addV, addF, colapsaCiclo, distintos, resolverSelecao, resolverAresta }) {
  /* `sel` no lugar do id, nas operações de edição direta. Cada op diz a cardinalidade que a sua forma por id já tinha
     (moveV um vértice, moveF uma face, moveA uma aresta, vira uma ou mais faces, mescla um ou mais vértices que somem
     e um que fica) e a seleção que não bate grita em `sel` com a contagem que resolveu. `id+sel` na mesma op grita:
     duas fontes concorrentes não se unem por acidente. As funções recusam sem mutar nada. */
  const ambigua = (st, i, op, campo, sel) => grita(st, i, op, `${campo}+${sel}`, `seleção ambígua: use ${campo} (id legado) OU ${sel}:{...}, nunca os dois`);
  function selecionar(st, sel, op, i, opcoes) {
    const antes = st.orfaos.length;
    const r = resolverSelecao(st, sel, op, i, opcoes);
    return st.orfaos.length !== antes ? null : r;
  }
  function vertices(st, sel, op, i, campo, { exatamente = null } = {}) {
    const r = selecionar(st, sel, op, i, { soVertices: true });
    if (!r) return null;
    if (exatamente != null && r.vertices.size !== exatamente) { grita(st, i, op, campo, `${op} exige exatamente ${exatamente === 1 ? 'um vértice' : `${exatamente} vértices`} em ${campo}, e resolveu ${r.vertices.size}`); return null; }
    if (!r.vertices.size) { grita(st, i, op, campo, `${campo} resolveu 0 vértices`); return null; }
    return [...r.vertices].sort((x, y) => x - y);
  }
  function faces(st, sel, op, i, { exatamente = false } = {}) {
    const r = selecionar(st, sel, op, i, {});
    if (!r) return null;
    if (exatamente ? r.faces.size !== 1 : !r.faces.size) { grita(st, i, op, 'sel', `${op} exige ${exatamente ? 'exatamente uma face' : 'ao menos uma face'} em sel, e resolveu ${r.faces.size}`); return null; }
    return [...r.faces].sort((x, y) => x - y);
  }
  return {
  moveV(st, a, i) {
    let v = a.v;
    if (a.sel != null) {
      if (a.v != null) return ambigua(st, i, 'moveV', 'v', 'sel');
      const vs = vertices(st, a.sel, 'moveV', i, 'sel', { exatamente: 1 });
      if (!vs) return;
      v = vs[0];
    }
    if (!st.V.has(v)) return grita(st, i, 'moveV', v, 'vértice inexistente');
    const d = st.vec(a.d ?? [0, 0, 0]);
    const p = st.V.get(v);
    st.V.set(v, [p[0] + d[0], p[1] + d[1], p[2] + d[2]]);   // SEMPRE por deslocamento (acompanha a base)
  },

  /* extruda (modo face): aceita `face:id` (legado) ou `sel` que resolva para UMA face. A prova da numeração de meio-de-caminho. Cria um anel
     NOVO de vértices (base = POSIÇÃO do passo), levanta a face por `dist` na
     normal, e ergue as paredes laterais. */
  extruda(st, a, i) {
    if (a.face != null && a.sel != null) return grita(st, i, 'extruda', 'face+sel', 'seleção ambígua: use face:id (legado) OU sel:{...}, nunca os dois');
    let fid = a.face;
    if (a.sel != null) {
      const antes = st.orfaos.length;
      const faces = resolverSelecao(st, a.sel, 'extruda', i).faces;
      if (st.orfaos.length !== antes) return;
      if (faces.size !== 1) return grita(st, i, 'extruda', 'sel', `seleção ${faces.size ? 'ambígua' : 'vazia'}: extruda exige exatamente uma face, e sel resolveu ${faces.size}`);
      fid = faces.values().next().value;
    }
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
    if (a.sel != null && a.de != null) return ambigua(st, i, 'mescla', 'de', 'sel');
    if (a.selPara != null && a.para != null) return ambigua(st, i, 'mescla', 'para', 'selPara');
    /* sel = os vértices que somem (um ou mais); selPara = o que fica (exatamente um). As duas se resolvem antes de
       qualquer mutação, sobre a malha como ela chegou ao passo. */
    let de = a.de ?? [];
    if (a.sel != null) { de = vertices(st, a.sel, 'mescla', i, 'sel'); if (!de) return; }
    let para = a.para;
    if (a.selPara != null) { const vs = vertices(st, a.selPara, 'mescla', i, 'selPara', { exatamente: 1 }); if (!vs) return; para = vs[0]; }
    if (!st.V.has(para)) return grita(st, i, 'mescla', para, 'destino inexistente');
    const rem = new Set();
    for (const d of de) {
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
    let fid = a.face;
    if (a.sel != null) {
      if (a.face != null) return ambigua(st, i, 'moveF', 'face', 'sel');
      const fs = faces(st, a.sel, 'moveF', i, { exatamente: true });
      if (!fs) return;
      fid = fs[0];
    }
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
    let pontas = [a.a, a.b];
    if (a.sel != null) {
      if (a.a != null || a.b != null) return grita(st, i, 'moveA', 'a+sel', "aresta ambígua: use a + b (ids legados) OU sel:{onde:{alvo:'aresta',…}}, nunca os dois");
      pontas = resolverAresta(st, a.sel, 'moveA', i);
      if (!pontas) return;
    }
    const d = st.vec(a.d ?? [0, 0, 0]);
    for (const v of pontas) {
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
    if (a.sel != null) {
      if (a.face != null) return ambigua(st, i, 'vira', 'face', 'sel');
      const fs = faces(st, a.sel, 'vira', i);
      if (!fs) return;
      for (const id of fs) st.F.get(id).vs = st.F.get(id).vs.slice().reverse();   // cada face vira por si; a ordem dos ids só fixa o determinismo
      return;
    }
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
