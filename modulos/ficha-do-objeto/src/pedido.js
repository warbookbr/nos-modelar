/* pedido.js — lê um pedido da mecatrônica contra a ficha a que ele responde e escreve a resposta de cada item, medindo a forma do
   Modelar. O pedido nunca muda a forma: aqui só se confere se a forma de agora já cumpre o que ele pede, e o item não cumprido volta
   com o motivo, para a pessoa decidir a mudança pela receita.

   As medidas, todas no referencial da montagem em mm, na pose zero:
   - espaço: procura, entre o centro pedido e os centros deslocados até a tolerância em cada eixo (passo de um quarto dela), uma
     caixa do tamanho mínimo que fique dentro da caixa envolvente da peça `dentroDe`, que nenhum triângulo de peça nenhuma corte e
     cujo centro não esteja dentro do sólido de peça nenhuma;
   - posição: a distância da origem da peça ao ponto pedido e o ângulo da rotação que leva a orientação da ficha à pedida;
   - saída de ar: no plano do centro pedido, com a normal pedida, a área dos pontos de uma grade de 1 mm por onde um segmento de
     `PROFUNDIDADE` mm para dentro da peça `em` não encontra a malha dela, na mancha ligada ao ponto livre mais perto do centro (que
     tem de estar a menos que a tolerância); é estimativa da abertura, porque a grade conta o vão da malha e não a parede real;
   - passagem: não conferida, porque o Modelar ainda não modela chicote;
   - ligações: a placa tem de ter cobre traçado com exatamente esta lista de redes (os mesmos terminais e as larguras e distâncias
     pedidas), e a placa declarada já recusa o traçado que não fecha alguma rede, que encosta em outra ou que fura as regras. */
import { conferirDocumento, textoDosErros } from './validar.js';
import { matrizDe } from './ficha.js';

export const PROFUNDIDADE = 30;

const chaveDoTerminal = (t) => `${t.peca}.${t.porta}`;

/* ---------- caixa contra triângulo (eixos separadores) ---------- */
function cortaCaixa(tri, centro, meio) {
  const v = tri.map((p) => [p[0] - centro[0], p[1] - centro[1], p[2] - centro[2]]);
  for (let k = 0; k < 3; k += 1) {
    if (Math.min(v[0][k], v[1][k], v[2][k]) > meio[k] || Math.max(v[0][k], v[1][k], v[2][k]) < -meio[k]) return false;
  }
  const e = [0, 1, 2].map((i) => v[(i + 1) % 3].map((x, k) => x - v[i][k]));
  const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const ponto = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const separa = (eixo) => {
    if (Math.abs(eixo[0]) + Math.abs(eixo[1]) + Math.abs(eixo[2]) < 1e-12) return false;
    const p = v.map((x) => ponto(x, eixo));
    const r = meio[0] * Math.abs(eixo[0]) + meio[1] * Math.abs(eixo[1]) + meio[2] * Math.abs(eixo[2]);
    return Math.min(...p) > r || Math.max(...p) < -r;
  };
  const normal = cruz(e[0], e[1]);
  if (separa(normal)) return false;
  for (const a of e) for (const u of [[1, 0, 0], [0, 1, 0], [0, 0, 1]]) if (separa(cruz(a, u))) return false;
  return true;
}

function caixaDe(triangulos) {
  const min = [Infinity, Infinity, Infinity]; const max = [-Infinity, -Infinity, -Infinity];
  for (const t of triangulos) for (const p of t) for (let k = 0; k < 3; k += 1) { if (p[k] < min[k]) min[k] = p[k]; if (p[k] > max[k]) max[k] = p[k]; }
  return { min, max };
}

/* o ponto está dentro da malha fechada: o raio em +x cruza um número ímpar de triângulos (Möller–Trumbore, com o raio levemente
   inclinado para não passar exatamente por aresta) */
function dentroDaMalha(p, triangulos) {
  const d = [1, 1e-4, 2e-4];
  let cruzamentos = 0;
  for (const [a, b, c] of triangulos) {
    if (Math.max(a[0], b[0], c[0]) < p[0]) continue;
    if (Math.min(a[1], b[1], c[1]) > p[1] + 1 || Math.max(a[1], b[1], c[1]) < p[1] - 1) continue;
    if (Math.min(a[2], b[2], c[2]) > p[2] + 1 || Math.max(a[2], b[2], c[2]) < p[2] - 1) continue;
    const e1 = b.map((x, k) => x - a[k]); const e2 = c.map((x, k) => x - a[k]);
    const h = [d[1] * e2[2] - d[2] * e2[1], d[2] * e2[0] - d[0] * e2[2], d[0] * e2[1] - d[1] * e2[0]];
    const det = e1[0] * h[0] + e1[1] * h[1] + e1[2] * h[2];
    if (Math.abs(det) < 1e-12) continue;
    const s = p.map((x, k) => x - a[k]);
    const u = (s[0] * h[0] + s[1] * h[1] + s[2] * h[2]) / det;
    if (u < 0 || u > 1) continue;
    const q = [s[1] * e1[2] - s[2] * e1[1], s[2] * e1[0] - s[0] * e1[2], s[0] * e1[1] - s[1] * e1[0]];
    const v = (d[0] * q[0] + d[1] * q[1] + d[2] * q[2]) / det;
    if (v < 0 || u + v > 1) continue;
    if ((e2[0] * q[0] + e2[1] * q[1] + e2[2] * q[2]) / det > 0) cruzamentos += 1;
  }
  return cruzamentos % 2 === 1;
}

function conferirEspaco(item, malhas) {
  const dentro = malhas.get(item.dentroDe);
  if (!dentro) return { estado: 'nao-cumprido', motivo: `a peça '${item.dentroDe}' não tem malha na exportação` };
  const limite = caixaDe(dentro);
  const meio = item.caixaMinima.map((x) => x / 2);
  const todos = [...malhas.values()].flat();
  const passo = item.tolerancia > 0 ? item.tolerancia / 4 : 1;
  const desvios = item.tolerancia > 0 ? Array.from({ length: 9 }, (_, k) => (k - 4) * passo) : [0];
  const candidatos = [];
  for (const dx of desvios) for (const dy of desvios) for (const dz of desvios) candidatos.push([dx, dy, dz]);
  candidatos.sort((a, b) => Math.hypot(...a) - Math.hypot(...b));
  let fora = 0; let cortada = 0; let macica = 0;
  for (const d of candidatos) {
    const c = item.centro.map((x, k) => x + d[k]);
    if (c.some((x, k) => x - meio[k] < limite.min[k] || x + meio[k] > limite.max[k])) { fora += 1; continue; }
    const perto = todos.filter((t) => t.some((p) => Math.abs(p[0] - c[0]) <= meio[0] + 50 && Math.abs(p[1] - c[1]) <= meio[1] + 50 && Math.abs(p[2] - c[2]) <= meio[2] + 50));
    if (perto.some((t) => cortaCaixa(t, c, meio))) { cortada += 1; continue; }
    /* sem corte, a caixa está toda num vão ou toda dentro de um sólido: o centro decide */
    if ([...malhas.values()].some((m) => dentroDaMalha(c, m))) { macica += 1; continue; }
    return { estado: 'cumprido', centro: c.map((x) => Number(x.toFixed(3))) };
  }
  return { estado: 'nao-cumprido', motivo: `nenhuma caixa de ${item.caixaMinima.join(' × ')} mm cabe livre dentro de '${item.dentroDe}' com o centro a até ${item.tolerancia} mm de [${item.centro.join(', ')}]: ${cortada} posições cortam a malha de alguma peça, ${macica} ficam dentro de um sólido e ${fora} saem da caixa envolvente de '${item.dentroDe}'` };
}

function anguloEntre(a, b) {
  const ra = matrizDe(a); const rb = matrizDe(b);
  let traco = 0;
  for (let i = 0; i < 3; i += 1) for (let k = 0; k < 3; k += 1) traco += ra[k][i] * rb[k][i];
  return (Math.acos(Math.min(1, Math.max(-1, (traco - 1) / 2))) * 180) / Math.PI;
}

function conferirPosicao(item, ficha) {
  const peca = ficha.pecas.find((p) => p.id === item.alvo);
  if (peca.posicao.ausente || peca.orientacao.ausente) return { estado: 'nao-cumprido', motivo: `a ficha não tem a posição de '${item.alvo}'` };
  const distancia = Math.hypot(...peca.posicao.valor.map((x, k) => x - item.posicao[k]));
  const angulo = anguloEntre(peca.orientacao.valor, item.orientacao);
  if (distancia <= item.tolerancia.posicao && angulo <= item.tolerancia.angulo) return { estado: 'cumprido' };
  return { estado: 'nao-cumprido', motivo: `'${item.alvo}' está a ${distancia.toFixed(1)} mm do ponto pedido (tolerância ${item.tolerancia.posicao}) e girado ${angulo.toFixed(1)} graus da orientação pedida (tolerância ${item.tolerancia.angulo}); mover a peça muda a receita e volta para a pessoa decidir` };
}

function conferirSaidaDeAr(item, malhas) {
  const tris = malhas.get(item.em);
  if (!tris) return { estado: 'nao-cumprido', motivo: `a peça '${item.em}' não tem malha na exportação` };
  const nn = Math.hypot(...item.normal); const n = item.normal.map((x) => x / nn);
  const u0 = Math.abs(n[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
  const proj = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const u = (() => { const d = proj(u0, n); const w = u0.map((x, k) => x - d * n[k]); const l = Math.hypot(...w); return w.map((x) => x / l); })();
  const v = [n[1] * u[2] - n[2] * u[1], n[2] * u[0] - n[0] * u[2], n[0] * u[1] - n[1] * u[0]];
  const R = Math.ceil(Math.sqrt(item.areaMinima) * 1.5 + item.tolerancia);
  /* os triângulos da faixa de profundidade, projetados no plano e guardados por célula de 4 mm */
  const celula = 4; const baldes = new Map();
  for (const t of tris) {
    const rel = t.map((p) => p.map((x, k) => x - item.centro[k]));
    const prof = rel.map((p) => proj(p, n));
    if (Math.max(...prof) < -PROFUNDIDADE || Math.min(...prof) > 1) continue;
    const t2 = rel.map((p) => [proj(p, u), proj(p, v)]);
    const [u1, u2] = [Math.min(...t2.map((p) => p[0])), Math.max(...t2.map((p) => p[0]))];
    const [v1, v2] = [Math.min(...t2.map((p) => p[1])), Math.max(...t2.map((p) => p[1]))];
    if (u2 < -R || u1 > R || v2 < -R || v1 > R) continue;
    for (let i = Math.floor(u1 / celula); i <= Math.floor(u2 / celula); i += 1) {
      for (let j = Math.floor(v1 / celula); j <= Math.floor(v2 / celula); j += 1) {
        const k = `${i},${j}`; if (!baldes.has(k)) baldes.set(k, []); baldes.get(k).push(t2);
      }
    }
  }
  const dentroDoTri = (p, [a, b, c]) => {
    const s = (q, r, w) => (r[0] - q[0]) * (w[1] - q[1]) - (r[1] - q[1]) * (w[0] - q[0]);
    const d1 = s(a, b, p); const d2 = s(b, c, p); const d3 = s(c, a, p);
    return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
  };
  const livre = (i, j) => !(baldes.get(`${Math.floor(i / celula)},${Math.floor(j / celula)}`) ?? []).some((t) => dentroDoTri([i, j], t));
  /* o ponto livre mais perto do centro, dentro da tolerância, e a mancha ligada a ele */
  let semente = null;
  for (let r = 0; r <= item.tolerancia && !semente; r += 1) {
    for (let i = -r; i <= r && !semente; i += 1) for (let j = -r; j <= r && !semente; j += 1) if (Math.max(Math.abs(i), Math.abs(j)) === r && livre(i, j)) semente = [i, j];
  }
  if (!semente) return { estado: 'nao-cumprido', motivo: `não há abertura em '${item.em}' a até ${item.tolerancia} mm de [${item.centro.join(', ')}] na direção da normal pedida: a malha dela fecha o ponto` };
  const vistos = new Set([semente.join(',')]); const fila = [semente]; let area = 0;
  while (fila.length && area < 4 * item.areaMinima) {
    const [i, j] = fila.pop(); area += 1;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const q = [i + di, j + dj]; const k = q.join(',');
      if (vistos.has(k) || Math.abs(q[0]) > R || Math.abs(q[1]) > R) continue;
      vistos.add(k); if (livre(...q)) fila.push(q);
    }
  }
  if (area >= item.areaMinima) return { estado: 'cumprido' };
  return { estado: 'nao-cumprido', motivo: `a abertura de '${item.em}' perto do centro pedido tem cerca de ${area} mm² (grade de 1 mm), e o pedido é de ${item.areaMinima} mm²; abrir mais muda a receita e volta para a pessoa decidir` };
}

function conferirLigacoes(item, placas) {
  const placa = placas[item.placa];
  if (!placa?.redes) return { estado: 'nao-cumprido', motivo: `a placa '${item.placa}' não tem cobre traçado no Modelar`, redes: item.redes.map((r) => r.id) };
  const declaradas = new Map(placa.redes.map((r) => [r.id, r]));
  const diferentes = item.redes.filter((r) => {
    const d = declaradas.get(r.id);
    if (!d) return true;
    const a = r.terminais.map(chaveDoTerminal).sort().join(' '); const b = d.terminais.map(chaveDoTerminal).sort().join(' ');
    return a !== b || (r.larguraMinima ?? null) !== (d.larguraMinima ?? null) || (r.distanciaMinima ?? null) !== (d.distanciaMinima ?? null);
  }).map((r) => r.id);
  const sobra = placa.redes.filter((r) => !item.redes.some((x) => x.id === r.id)).map((r) => r.id);
  if (!diferentes.length && !sobra.length) return { estado: 'cumprido' };
  return {
    estado: 'nao-cumprido',
    motivo: `o cobre da placa '${item.placa}' foi traçado com outra lista de redes (${diferentes.length} rede(s) do pedido diferem${sobra.length ? `, e ${sobra.length} traçada(s) não estão no pedido` : ''}); traçar de novo com esta lista pelo tracar-placa`,
    ...(diferentes.length ? { redes: diferentes } : {}),
  };
}

/**
 * Responde um pedido contra a ficha. `malhas` dá os triângulos de cada peça da ficha no referencial da montagem, em mm; `placas`
 * dá, por id de peça da ficha, as redes com que o cobre da placa foi traçado. Devolve `{ recusa }` quando o pedido não passa no
 * esquema ou nas referências, ou `{ pedido, itens: [{ id, tipo, estado, motivo? }] }` com a resposta escrita em cada item.
 */
/* O componente comprado: cumprido quando a ponte do objeto diz a instância que o representa e ela é peça da ficha; senão, o
   motivo que a ponte declara (por que ele não coube ou ainda não está na forma). */
function conferirComponente(item, ficha, componentes) {
  const d = componentes[item.id];
  if (!d) return { estado: 'nao-cumprido', motivo: `a ponte do objeto não diz que peça representa o componente '${item.id}'` };
  if (d.naoCumprido) return { estado: 'nao-cumprido', motivo: d.naoCumprido };
  if (!ficha.pecas.some((p) => p.id === d.peca)) return { estado: 'nao-cumprido', motivo: `a peça '${d.peca}' que a ponte do objeto dá ao componente não está na ficha` };
  return { estado: 'cumprido', peca: d.peca };
}

export function responderPedido({ pedido, ficha, malhas = new Map(), placas = {}, componentes = {} }) {
  const conferido = conferirDocumento(pedido, { ficha });
  if (conferido.erros.length) return { recusa: textoDosErros(conferido), erros: conferido.erros };
  const respondido = structuredClone(pedido);
  const itens = respondido.itens.map((item) => {
    let r;
    if (item.tipo === 'espaco') r = conferirEspaco(item, malhas);
    else if (item.tipo === 'posicao') r = conferirPosicao(item, ficha);
    else if (item.tipo === 'saidaDeAr') r = conferirSaidaDeAr(item, malhas);
    else if (item.tipo === 'ligacoes') r = conferirLigacoes(item, placas);
    else if (item.tipo === 'componente') r = conferirComponente(item, ficha, componentes);
    else r = { estado: 'nao-cumprido', motivo: 'o Modelar ainda não modela chicote, e a passagem não é conferida pela geometria' };
    item.resposta = r.estado === 'cumprido'
      ? { estado: 'cumprido', revisaoDaFicha: ficha.revisao, ...(r.peca ? { peca: r.peca } : {}) }
      : { estado: 'nao-cumprido', motivo: r.motivo, ...(item.tipo === 'ligacoes' && r.redes ? { redes: r.redes } : {}) };
    return { id: item.id, tipo: item.tipo, estado: r.estado, ...(r.motivo ? { motivo: r.motivo } : {}), ...(r.centro ? { centro: r.centro } : {}) };
  });
  const depois = conferirDocumento(respondido, { ficha });
  if (depois.erros.length) throw new Error(`a resposta escrita não passa no esquema:\n${textoDosErros(depois)}`);
  return { pedido: respondido, itens };
}
