/* Conserto proposto pelo gate: para cada achado de contato, qual forma mover, em que vetor e por quê.
   Trabalha sobre o esboço já expandido (números, sem expressões) e não mede geometria: recebe do
   gate o vetor que separa ou aproxima o par. Puro: não lê nem grava arquivo. */

const EIXOS = ['x', 'y', 'z'];
const arred1 = (x) => { const r = Math.round(x * 10) / 10; return r === 0 ? 0 : r; };
const mm1 = (x) => arred1(x).toString().replace('.', ',');
const vetorTexto = (v) => `[${v.map(mm1).join(' ')}]`;
const objeto = (v) => v && typeof v === 'object' && !Array.isArray(v);

/* Um ponto pode ser texto ("<id>.<ancora>"), vetor ou { "entre": [A, B] }, que cita os dois pontos. */
function citaPonto(v, cita) {
  if (typeof v === 'string') cita(v);
  else if (objeto(v) && Array.isArray(v.entre)) for (const q of v.entre) citaPonto(q, cita);
}

/* Ids de formas que a forma cita para se posicionar (encosta, alinha, sobre, ponta, de/para, centro por
   âncora "<id>.<ancora>", espelho e arranjo). Pontos nomeados não são forma e ficam de fora. */
export function alvosDaForma(f, ids) {
  const alvos = new Set();
  const cita = (v) => {
    if (typeof v !== 'string') return;
    const id = v.includes('.') ? v.slice(0, v.indexOf('.')) : v;
    if (ids.has(id) && id !== f.id) alvos.add(id);
  };
  cita(f.sobre);
  if (Array.isArray(f.ponta)) cita(f.ponta[0]);
  else if (objeto(f.ponta)) cita(f.ponta.id);
  else cita(f.ponta);
  if (objeto(f.encosta)) cita(f.encosta.referencia);
  if (objeto(f.alinha)) citaPonto(f.alinha.com, cita);
  if (objeto(f.espelha)) cita(f.espelha.forma);
  if (objeto(f.arranjoDe)) { cita(f.arranjoDe.fonte); cita(f.arranjoDe.centro); }
  for (const k of ['centro', 'de', 'para']) citaPonto(f[k], cita);
  if (Array.isArray(f.caminho)) for (const q of f.caminho) citaPonto(q, cita);
  return alvos;
}

/* A posição da forma sai de outra forma (a menos de `centro` numérico simples). */
export function temRelacaoDePosicao(f) {
  return ['sobre', 'ponta', 'encosta', 'alinha', 'espelha', 'arranjoDe', 'de', 'para', 'caminho'].some((k) => f[k] !== undefined)
    || (f.centro !== undefined && !(Array.isArray(f.centro) && f.centro.every((x) => typeof x === 'number')));
}

function girarEmTorno(eixo, graus, v) {
  const a = (graus * Math.PI) / 180; const c = Math.cos(a); const s = Math.sin(a);
  const [x, y, z] = v;
  if (eixo === 'x') return [x, c * y - s * z, s * y + c * z];
  if (eixo === 'y') return [c * x + s * z, y, -s * x + c * z];
  return [c * x - s * y, s * x + c * y, z];
}

/* Fábrica do conserto de uma opção. `formas` é a lista expandida da opção (com as ocultas e as cópias
   de espelho e arranjo) e `resolvidas` as formas visíveis já resolvidas. */
export function criarConserto(formas, resolvidas) {
  const porId = new Map(formas.map((f) => [f.id, f]));
  const ids = new Set(porId.keys());
  const alvos = new Map(formas.map((f) => [f.id, alvosDaForma(f, ids)]));
  const filhos = new Map(formas.map((f) => [f.id, []]));
  for (const [id, set] of alvos) for (const a of set) filhos.get(a).push(id);
  const volumes = new Map(resolvidas.map((r) => [r.id, (r.max[0] - r.min[0]) * (r.max[1] - r.min[1]) * (r.max[2] - r.min[2])]));

  /* Ids que se movem junto quando `id` se move: ele mesmo e quem depende dele, direta ou indiretamente. */
  const arrasta = (id) => {
    const visto = new Set([id]);
    const fila = [id];
    while (fila.length) for (const y of filhos.get(fila.pop()) ?? []) if (!visto.has(y)) { visto.add(y); fila.push(y); }
    return visto;
  };

  /* Forma cuja edição move `id`: a própria, ou a fonte quando ela é cópia de espelho ou de arranjo. O vetor
     acompanha: no espelho a componente do eixo troca de sinal, no arranjo radial o vetor gira de volta. */
  const fonteDe = (id, delta) => {
    let atual = id; let v = delta; const cadeia = [];
    for (let n = 0; n < 20; n++) {
      const f = porId.get(atual);
      if (objeto(f?.espelha) && porId.has(f.espelha.forma)) {
        v = v.map((c, i) => (i === EIXOS.indexOf(f.espelha.eixo) ? -c : c));
        cadeia.push(`espelho de ${f.espelha.forma}`); atual = f.espelha.forma;
      } else if (objeto(f?.arranjoDe) && porId.has(f.arranjoDe.fonte)) {
        const a = f.arranjoDe;
        if (a.modo === 'radial') {
          const passo = Math.abs(a.graus) >= 360 ? a.graus / a.total : a.graus / (a.total - 1);
          v = girarEmTorno(a.eixo, -a.indice * passo, v);
        }
        cadeia.push(`cópia ${a.indice} de ${a.fonte}`); atual = a.fonte;
      } else break;
    }
    return { fonte: atual, delta: v, cadeia };
  };

  /* Forma de um componente que não é a principal: a edição da instância a moveria junto com as outras partes, e por
     isso ela não é movida sozinha (só a principal, que a instância posiciona). */
  const parteDeComponente = (id) => {
    const d = porId.get(id)?.daInstancia;
    return Boolean(d && !d.principal);
  };

  const descricaoDaRelacao = (f, alvo) => {
    const partes = [];
    if (f.sobre === alvo) partes.push('sobre');
    if (f.encosta?.referencia === alvo) partes.push('encosta');
    if (f.alinha?.com === alvo || String(f.alinha?.com).startsWith(`${alvo}.`)) partes.push('alinha');
    if (f.espelha?.forma === alvo) partes.push('espelha');
    if (f.arranjoDe?.fonte === alvo) partes.push('arranja');
    if (partes.length === 0) partes.push('posição');
    return partes.join('/');
  };

  /* Quem se move num par: aquela que não arrasta a outra (mover a que a outra usa como referência
     desfaria o conserto, pois a dependente acompanha). Se as duas servem, a de menor caixa envolvente; se
     nenhuma serve, nenhuma. */
  const escolher = (a, b) => {
    const serve = (x, y) => !parteDeComponente(fonteDe(x, [0, 0, 0]).fonte) && !arrasta(fonteDe(x, [0, 0, 0]).fonte).has(y) && fonteDe(x, [0, 0, 0]).fonte !== fonteDe(y, [0, 0, 0]).fonte;
    const sa = serve(a, b); const sb = serve(b, a);
    if (sa && sb) {
      const va = volumes.get(a) ?? 0; const vb = volumes.get(b) ?? 0;
      const mover = va < vb ? a : b;
      const outro = mover === a ? b : a;
      return { mover, motivo: `nenhuma depende da outra e ${mover} é a de menor caixa envolvente (${mm1(Math.min(va, vb) / 1000)} cm³ contra ${mm1(Math.max(va, vb) / 1000)} cm³ de ${outro})` };
    }
    if (sa || sb) {
      const mover = sa ? a : b; const outro = sa ? b : a;
      const direta = alvos.get(mover)?.has(outro);
      return { mover, motivo: `${mover} depende de ${outro}${direta ? ` (${descricaoDaRelacao(porId.get(mover), outro)})` : ' por relações encadeadas'}; mover ${outro} arrastaria ${mover} junto` };
    }
    return { mover: null, motivo: `${a} e ${b} se movem juntas (uma depende da outra ou vêm da mesma fonte); ajuste a relação entre elas` };
  };

  const montar = (mover, delta, motivo, extra = {}) => {
    const { fonte, delta: dFonte, cadeia } = fonteDe(mover, delta);
    const d = dFonte.map(arred1);
    const alvoTexto = fonte === mover ? mover : `${fonte} (fonte de ${mover}: ${cadeia.join(', ')})`;
    const parte = parteDeComponente(fonte);
    const texto = `mova ${alvoTexto} em ${vetorTexto(d)} mm (${motivo})${parte ? `; ${fonte} é parte do componente ${porId.get(fonte).daInstancia.id} e não se move sozinha: ajuste a instância` : ''}`;
    return { forma: mover, fonte, delta: d, mm: arred1(Math.hypot(...d)), texto, motivo, aplicavel: !parte && d.some((c) => c !== 0), arrasta: [...arrasta(fonte)].sort(), ...extra };
  };

  return {
    /* Sugestão para um par: `dirA` é a direção unitária em que `a` se moveria para o efeito pedido e `mm`
       a distância; se quem se move é `b`, o vetor troca de sinal. */
    par(a, b, dirA, mm, motivo) {
      const { mover, motivo: porque } = escolher(a, b);
      const deltaA = dirA.map((c) => c * mm);
      if (mover === null) {
        return { forma: null, fonte: null, delta: deltaA.map(arred1), mm: arred1(mm), texto: `ajuste as relações de ${a} e ${b} (${motivo}; ${porque}); afastar ${a} em ${vetorTexto(deltaA)} mm resolveria`, motivo: `${motivo}; ${porque}`, aplicavel: false, arrasta: [] };
      }
      return montar(mover, mover === a ? deltaA : deltaA.map((c) => -c), `${motivo}; ${porque}`);
    },
    /* Sugestão para uma forma que se move por definição (voando, longe). */
    forma(id, dir, mm, motivo) {
      return montar(id, dir.map((c) => c * mm), motivo);
    },
  };
}
