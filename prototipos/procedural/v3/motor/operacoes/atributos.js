/* atributos.js — operações do grupo, isoladas por serviços explícitos do núcleo. */
export function criarOperacoesAtributos(servicos) {
  const { FORMATO, Face, grita, nomeDeParteInvalido, temNomeDeParte, resolverAlvosF, neutroCanonico } = servicos;
  return {
  pincel(st, a, i) {
    const modo = a.modo ?? 'face';
    if (modo === 'face') {   // passo 9: preenche faces INTEIRAS de uma cor chapada (f.cor).
      for (const fid of resolverAlvosF(st, a, 'pincel', i)) st.F.get(fid).cor = a.cor ?? null;
      return;
    }
    if (modo === 'livre') {
      /* passo 11b — PINCEL MACIO: cada ponto é um DAB (pincelada radial) numa FACE,
         ancorado à posição FACE-LOCAL {a,b} — as coords s,t da projeção do atlas em
         [0,1] (`s=(p[pa]-aMin)/aSpan`), NÃO um texel cru. É isso que faz a tinta
         ACOMPANHAR a face: mover um vértice depois muda a projeção/o UV, mas o dab
         segue no mesmo {a,b} (não desliza pra outro texel). `raio`/`dureza` são do
         pincel (a mesma pincelada) — gravados POR dab pra a face ficar auto-contida e
         o replay ser determinístico. Ordem de `pontos`/dos pushes = ordem de PINTURA
         (o rasterizador compõe mais nova por cima). Ponto com face inexistente GRITA
         (órfão), nunca corrompe (lei do envelope). */
      if (a.sel != null || a.faces != null) return grita(st, i, 'pincel', 'seleção', "modo 'livre' usa pontos:[{f,a,b}], não faces/sel");
      const cor = a.cor ?? null, raio = st.num(a.raio ?? 0), dureza = st.num(a.dureza ?? 0);
      for (const pt of a.pontos ?? []) {
        const f = st.F.get(pt.f);
        if (!f) { grita(st, i, 'pincel', pt.f, 'face inexistente'); continue; }
        f.tinta.push({ a: st.num(pt.a ?? 0), b: st.num(pt.b ?? 0), cor, raio, dureza });
      }
      return;
    }
    return grita(st, i, 'pincel', modo, `modo '${modo}' desconhecido (só 'face' e 'livre')`);
  },
  solido(st, a, i) { for (const fid of resolverAlvosF(st, a, 'solido', i)) st.F.get(fid).solido = true; },
  liso(st, a, i) { for (const fid of resolverAlvosF(st, a, 'liso', i)) st.F.get(fid).liso = true; },

  /* material (passo 12a): seta f.material = NOME de um material DECLARADO em
     MATERIAIS (a peça-nível, como PARAMS/TOPO). Só o NOME entra na face — mudar o
     material muda TODAS as faces dele de uma vez (um dono só, a regra do doc); os
     params (cor/emissivo/aspereza/semLuz/contorno) o adaptarV3 resolve em MATERIAIS
     e o render aplica POR LOTE (padrão do uRim). Grita se `usa` não é um material
     declarado, ou se a face não existe — nunca corrompe (lei do envelope). Face SEM
     material segue idêntica (o lote PADRÃO no-op). `hasOwn` (não `in`) pra um nome
     como 'toString' não passar pela cadeia de protótipos. */
  material(st, a, i) {
    const usa = a.usa;
    if (!Object.hasOwn(st.materiais, usa)) return grita(st, i, 'material', usa, `material '${usa}' não existe em MATERIAIS`);
    for (const fid of resolverAlvosF(st, a, 'material', i)) st.F.get(fid).material = usa;
  },

  /* parte (passo 13a): dá NOME a um conjunto de faces (`f.parte = nome`) — é o ALVO
     que a ANIMAÇÃO (e no futuro o material) usam pra mover/deformar aquele pedaço
     como peça sólida. Registra a parte no neutro (`st.partes[nome] = {pivo}`): `pivo`
     (opcional `[x,y,z]`) é o ponto em torno do qual ela gira/escala — dimensional
     (passa por `st.vec`, então pode citar um PARAM, como os outros pontos); AUSENTE,
     o adaptarV3 usa o CENTROIDE da parte como default. Identidade posicional: face
     inexistente GRITA (órfão), como as outras ops — nunca corrompe (lei do envelope).

     Uma face pertence a NO MÁXIMO uma parte. Até o O-2 (R2 do plano em
     docs/mecanifica/historico/OFICINA-OTIMIZACOES.md) reatribuir era SILENCIOSO
     ("última atribuição vence"), e essa era a pior classe de defeito do
     vocabulário: resultado ERRADO que PASSA. Duas seleções sobrepostas (duas
     caixas de `regiao`, um alias que engloba outro) e a parte declarada antes
     perde faces sem nada reclamar — a bancada mostra a contagem de faces SEM
     nome, nunca as roubadas. Agora reatribuir para OUTRA parte GRITA e a face
     fica com o dono ANTIGO (a op nova é a suspeita, não a lista já escrita),
     salvo `substituir: true` explícito no passo. Renomear para a MESMA parte
     segue mudo: é seleção redundante, não conflito (medido: as 18 peças do
     repositório fazem isso 8 vezes e reatribuem 0 face para outra parte, então
     o diagnóstico é ADITIVO — nenhuma peça shipada muda de hash).

     `neutroCanonico` anexa `f.parte` (replay determinístico); o pivô é metadado
     de animação, não muda a MALHA. */
  parte(st, a, i) {
    const nome = a.nome;
    /* A IDENTIDADE entra primeiro e FECHADA: `nome` é o que o canon anexa, o
       que `sel:{grupo}` cita, o que a régua mede e o que a animação move. Sem
       contrato, `nome: 42`/`true`/`['a']` atravessava tudo e só estourava na
       bancada, e `nome` AUSENTE gravava a chave literal `"undefined"` em
       `st.partes` — nomear virava no-op silencioso. Recusa aqui, com grito, e
       NENHUMA face é tocada (fail-closed): meia atribuição com identidade
       inválida seria pior que nenhuma. */
    const erroNome = nomeDeParteInvalido(nome);
    if (erroNome) {
      grita(st, i, 'parte', 'nome', `nome de parte inválido: ${erroNome} — a identidade da parte é FORMATO SALVO (o canon a anexa, sel:{grupo} a cita, a régua mede por ela)`);
      return;
    }
    const declaraPai = Object.hasOwn(a, 'pai');
    const pai = a.pai;
    if (declaraPai) {
      const erroPai = nomeDeParteInvalido(pai);
      if (erroPai) {
        grita(st, i, 'parte', 'pai', `pai de parte inválido: ${erroPai}`);
        return;
      }
      if (pai === nome) {
        grita(st, i, 'parte', 'pai', `parte '${nome}' não pode ser pai de si mesma`);
        return;
      }
      const anterior = st.paisDasPartes.get(nome);
      if (anterior && anterior.pai !== pai) {
        grita(st, i, 'parte', 'pai', `parte '${nome}' já declarou pai '${anterior.pai}' no passo ${anterior.passo}; reparenting não faz parte deste contrato`);
        return;
      }
    }
    /* `substituir` é chave do FORMATO SALVO: só o literal `true` passa, como o
       `tudo:true` do `sel` (D-129). `substituir:'sim'`/`1` aceito em silêncio
       ensinaria a próxima IA a escrever besteira que passa — e ainda por cima
       desligaria justamente a rede que este item instalou. Valor estranho GRITA
       e a op segue ESTRITA (fail-closed). */
    if (a.substituir != null && a.substituir !== true) grita(st, i, 'parte', 'substituir', `substituir inválido: só aceita o literal true (recebido ${JSON.stringify(a.substituir)})`);
    const substituir = a.substituir === true;
    const alvos = resolverAlvosF(st, a, 'parte', i);
    if (!alvos.size) return;
    const pivo = a.pivo != null ? st.vec(a.pivo) : null;   // avaliado ANTES de atribuir: ponto malformado segue estourando alto, como antes
    let atribuiu = false;
    for (const fid of alvos) {
      const f = st.F.get(fid);
      // `temNomeDeParte`, não `!= null`: a guarda e o canon precisam concordar
      // sobre o que é identidade, senão um nome invisível no arquivo salvo
      // bloqueia a nomeação seguinte (a regressão que a revisão da R2 achou).
      if (temNomeDeParte(f.parte) && f.parte !== nome && !substituir) {
        const antes = st.parteAtribuidaEm.get(fid);
        grita(st, i, 'parte', fid, `face já pertence à parte '${f.parte}'${antes != null ? ` (nomeada no passo ${antes})` : ''} e viraria '${nome}': seleções sobrepostas roubam faces em silêncio — separe as seleções ou escreva substituir: true`);
        continue;
      }
      f.parte = nome; st.parteAtribuidaEm.set(fid, i); atribuiu = true;
    }
    if (!atribuiu) return;   // toda a seleção foi recusada: não registra parte fantasma (nome sem nenhuma face)
    st.partes[nome] = { ...st.partes[nome], pivo };   // registro nome->{pivo}; pivo null => centroide (no adaptador)
    if (declaraPai) st.paisDasPartes.set(nome, { pai, passo: i });
  },

  /* pesar (passo 14a): soma `peso` de influência do OSSO aos VÉRTICES dados (`vs`)
     ou aos vértices das `faces`. Ops `pesar` ACUMULAM por (vértice, osso) — o
     adaptarV3 depois NORMALIZA (somam 1) e mantém as TOP-N (N=4) influências. O
     peso viaja com o ID do vértice (V): toda cópia dele no mesh loose herda o
     mesmo índice+peso. Identidade posicional (lei do envelope): osso fora do
     ESQUELETO GRITA (órfão), vértice/face inexistente GRITA (órfão) — nunca
     corrompe. Vértice SEM peso nenhum fica preso à IDENTIDADE (bind pose, não
     deforma) — o default seguro, resolvido no shader. `neutroCanonico` anexa o
     peso do vértice (replay determinístico); vértice sem peso => canon intacta. */
  pesar(st, a, i) {
    const osso = a.osso;
    if (!st.ossoSet || !st.ossoSet.has(osso)) return grita(st, i, 'pesar', osso, st.ossoSet ? `osso '${osso}' não existe em ESQUELETO` : 'peça sem ESQUELETO (nenhum osso pra pesar)');
    const peso = st.num(a.peso ?? 0);
    const alvos = new Set();
    for (const v of a.vs ?? []) { if (!st.V.has(v)) { grita(st, i, 'pesar', v, 'vértice inexistente'); continue; } alvos.add(v); }
    for (const fid of a.faces ?? []) { const f = st.F.get(fid); if (!f) { grita(st, i, 'pesar', fid, 'face inexistente'); continue; } for (const v of f.vs) if (st.V.has(v)) alvos.add(v); }
    for (const v of alvos) { let m = st.pesos.get(v); if (!m) { m = new Map(); st.pesos.set(v, m); } m.set(osso, (m.get(osso) || 0) + peso); }   // ACUMULA por (vértice, osso)
  },
  };
}
