/* traducao.js — a descrição normalizada vira a lista de primitivas e restrições do planegcs.

   A tradução é direta: `sobre` vira `point_on_line_pl` (ou `point_on_circle`, `point_on_arc`), `distancia` entre pontos vira
   `p2p_distance` e entre ponto e reta `p2l_distance`, `raio` vira `circle_radius`, `tangente` vira `tangent_lc` ou
   `tangent_cc`, `paralela` vira `parallel`, `perpendicular` vira `perpendicular_ll`, `angulo` vira `l2l_angle_ll` em radianos e
   `vertical` e `horizontal` viram `vertical_pp` e `horizontal_pp`. O `lado` e o `por` não entram no resolvedor, porque o
   planegcs não tem sinal para eles: são conferidos depois de resolver (resolver.js).

   Cada restrição leva como identificador `relacao:<nome>`, o nome que a IA escreveu, e é por ele que o conflito e a redundância
   voltam. Os pontos levam `ponto:<nome>`; as retas, `reta:...`; as referências fixas, `ref:<nome>:<n>`; o que o módulo cria por
   conta própria leva `interna:`. Primitivas e restrições entram em ordem de nome, de modo que reordenar o arquivo não muda o
   resultado. Puro, sem WebAssembly. */

const RAIO_PADRAO_DA_SEMENTE = 1000;

export const idDoPonto = (nome) => `ponto:${nome}`;
export const idDaRelacao = (nome) => `relacao:${nome}`;
export const idDaParte = (tipo, nome) => `${tipo}:${nome}`;

export function idDaLinha(l) {
  if (l.via === 'referencia') return `reta:referencia:${l.nome}`;
  if (l.via === 'barra') return `reta:barra:${l.nome}`;
  return `reta:${l.pontos[0]}>${l.pontos[1]}`;
}

const porNome = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/* Os dois pontos (por nome de ponto do desenho, ou por id de referência) que dão a reta, na ordem que dá o sentido. */
export function extremosDaLinha(modelo, l) {
  if (l.via === 'referencia') return [`ref:${l.nome}:1`, `ref:${l.nome}:2`];
  if (l.via === 'barra') return modelo.partes[l.nome].pontos.map(idDoPonto);
  return l.pontos.map(idDoPonto);
}

/* A posição dos pontos fixos de uma referência: a horizontal em v vai de h = 0 a h = 1000, e a vertical em h vai de v = 0 a v = 1000,
   de modo que o sentido de uma é +h e o da outra é +v. */
export function pontosDaReferencia(ref) {
  return ref.reta === 'horizontal' ? [[0, ref.valor], [RAIO_PADRAO_DA_SEMENTE, ref.valor]] : [[ref.valor, 0], [ref.valor, RAIO_PADRAO_DA_SEMENTE]];
}

function linhasUsadas(modelo) {
  const mapa = new Map();
  const ver = (l) => { if (l && !mapa.has(idDaLinha(l))) mapa.set(idDaLinha(l), l); };
  for (const nome of Object.keys(modelo.referencias)) ver({ classe: 'linha', via: 'referencia', nome });
  for (const [nome, p] of Object.entries(modelo.partes)) if (p.tipo === 'barra') ver({ classe: 'linha', via: 'barra', nome });
  for (const r of modelo.relacoes) {
    if (r.linha) ver(r.linha);
    if (r.alvo?.classe === 'linha') ver(r.alvo);
    if (r.a?.classe === 'linha') ver(r.a);
    if (r.b?.classe === 'linha') ver(r.b);
  }
  return [...mapa].sort((x, y) => porNome(x[0], y[0])).map(([, l]) => l);
}

/* `chutes` troca o chute de pontos pelo nome ({ nome: [h, v] }), `raios` o chute do raio dos círculos pelo nome da parte, e
   `extras` junta restrições à lista (a prova de ponto solto). */
export function traduzir(modelo, { chutes = {}, raios = {}, extras = [] } = {}) {
  const chute = (nome) => chutes[nome] ?? modelo.pontos[nome];
  const primitivas = [];
  for (const nome of Object.keys(modelo.pontos).sort(porNome)) primitivas.push({ id: idDoPonto(nome), type: 'point', x: chute(nome)[0], y: chute(nome)[1], fixed: false });
  for (const nome of Object.keys(modelo.referencias).sort(porNome)) {
    pontosDaReferencia(modelo.referencias[nome]).forEach(([x, y], k) => primitivas.push({ id: `ref:${nome}:${k + 1}`, type: 'point', x, y, fixed: true }));
  }
  for (const l of linhasUsadas(modelo)) {
    const [p1, p2] = extremosDaLinha(modelo, l);
    primitivas.push({ id: idDaLinha(l), type: 'line', p1_id: p1, p2_id: p2 });
  }
  const raioDoCirculo = (nome) => {
    const p = modelo.partes[nome];
    const r = modelo.relacoes.find((x) => x.tipo === 'raio' && x.alvo.parte === nome);
    return raios[nome] ?? p.chute ?? r?.mm ?? 1;
  };
  for (const nome of Object.keys(modelo.partes).sort(porNome)) {
    const p = modelo.partes[nome];
    if (p.tipo === 'circulo') primitivas.push({ id: idDaParte('circulo', nome), type: 'circle', c_id: idDoPonto(p.centro), radius: raioDoCirculo(nome) });
    if (p.tipo === 'arco') {
      const c = chute(p.centro); const a = chute(p.inicio); const b = chute(p.fim);
      const angulo = (pt) => Math.atan2(pt[1] - c[1], pt[0] - c[0]);
      const ini = angulo(a); let fim = angulo(b);
      if (fim <= ini) fim += 2 * Math.PI;
      primitivas.push({
        id: idDaParte('arco', nome), type: 'arc', c_id: idDoPonto(p.centro), start_id: idDoPonto(p.inicio), end_id: idDoPonto(p.fim),
        radius: Math.hypot(a[0] - c[0], a[1] - c[1]) || 1, start_angle: ini, end_angle: fim,
      });
      primitivas.push({ id: `interna:arc_rules:${nome}`, type: 'arc_rules', a_id: idDaParte('arco', nome) });
    }
  }
  const alvoCircular = (c) => idDaParte(c.tipo, c.parte);
  for (const r of modelo.relacoes) {
    const id = idDaRelacao(r.nome);
    if (r.tipo === 'sobre') {
      if (r.alvo.classe === 'linha') primitivas.push({ id, type: 'point_on_line_pl', p_id: idDoPonto(r.ponto), l_id: idDaLinha(r.alvo) });
      else if (r.alvo.tipo === 'circulo') primitivas.push({ id, type: 'point_on_circle', p_id: idDoPonto(r.ponto), c_id: alvoCircular(r.alvo) });
      else primitivas.push({ id, type: 'point_on_arc', p_id: idDoPonto(r.ponto), a_id: alvoCircular(r.alvo) });
    } else if (r.tipo === 'coincidente') primitivas.push({ id, type: 'p2p_coincident', p1_id: idDoPonto(r.a), p2_id: idDoPonto(r.b) });
    else if (r.tipo === 'distancia') {
      if (r.linha) primitivas.push({ id, type: 'p2l_distance', p_id: idDoPonto(r.a), l_id: idDaLinha(r.linha), distance: r.mm });
      else primitivas.push({ id, type: 'p2p_distance', p1_id: idDoPonto(r.a), p2_id: idDoPonto(r.b), distance: r.mm });
    } else if (r.tipo === 'raio') {
      if (r.alvo.tipo === 'circulo') primitivas.push({ id, type: 'circle_radius', c_id: alvoCircular(r.alvo), radius: r.mm });
      else primitivas.push({ id, type: 'arc_radius', a_id: alvoCircular(r.alvo), radius: r.mm });
    } else if (r.tipo === 'tangente') {
      if (r.linha) primitivas.push({ id, type: 'tangent_lc', l_id: idDaLinha(r.linha), c_id: alvoCircular(r.a) });
      else primitivas.push({ id, type: 'tangent_cc', c1_id: alvoCircular(r.a), c2_id: alvoCircular(r.b) });
    } else if (r.tipo === 'paralela') primitivas.push({ id, type: 'parallel', l1_id: idDaLinha(r.a), l2_id: idDaLinha(r.b) });
    else if (r.tipo === 'perpendicular') primitivas.push({ id, type: 'perpendicular_ll', l1_id: idDaLinha(r.a), l2_id: idDaLinha(r.b) });
    else if (r.tipo === 'vertical') primitivas.push({ id, type: 'vertical_pp', p1_id: idDoPonto(r.a), p2_id: idDoPonto(r.b) });
    else if (r.tipo === 'horizontal') primitivas.push({ id, type: 'horizontal_pp', p1_id: idDoPonto(r.a), p2_id: idDoPonto(r.b) });
    else if (r.tipo === 'angulo') primitivas.push({ id, type: 'l2l_angle_ll', l1_id: idDaLinha(r.a), l2_id: idDaLinha(r.b), angle: (r.graus * Math.PI) / 180 });
    else if (r.tipo === 'igual') {
      if (r.a.classe === 'linha') primitivas.push({ id, type: 'equal_length', l1_id: idDaLinha(r.a), l2_id: idDaLinha(r.b) });
      else if (r.a.tipo === 'circulo' && r.b.tipo === 'circulo') primitivas.push({ id, type: 'equal_radius_cc', c1_id: alvoCircular(r.a), c2_id: alvoCircular(r.b) });
      else if (r.a.tipo === 'arco' && r.b.tipo === 'arco') primitivas.push({ id, type: 'equal_radius_aa', a1_id: alvoCircular(r.a), a2_id: alvoCircular(r.b) });
      else {
        const [circ, arc] = r.a.tipo === 'circulo' ? [r.a, r.b] : [r.b, r.a];
        primitivas.push({ id, type: 'equal_radius_ca', c_id: alvoCircular(circ), a_id: alvoCircular(arc) });
      }
    }
  }
  primitivas.push(...extras);
  return primitivas;
}

/* O nome que a IA escreveu para um identificador do planegcs, ou null quando é interno. */
export function nomeDaRelacao(id) {
  return id.startsWith('relacao:') ? id.slice('relacao:'.length) : null;
}
