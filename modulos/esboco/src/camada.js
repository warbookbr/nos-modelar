/* Camada das formas para o desenho com teste de profundidade por pixel.

   O desenho em SVG pinta cada forma inteira por cima ou por baixo das outras (algoritmo do pintor), e erra quando uma
   forma longa passa por trás e depois pela frente de outra, quando duas se interpenetram ou se encostam. Esta camada
   entrega as mesmas faces e os mesmos traços, já na tela, com a profundidade ao longo do olho em cada vértice, para um
   desenhista com buffer de profundidade (a ferramenta usa Three.js num WebGL do Chromium) resolver a oclusão pixel a
   pixel. O módulo só prepara dados: não depende de Three.js nem de navegador.

   Coordenadas: x e y em pixels do quadro (os mesmos do SVG), z em milímetros ao longo do olho (maior é mais perto de quem
   olha), já somado o viés de desempate. Regra do contato (z-fighting): duas formas cujas faces ficam no mesmo plano
   disputariam o mesmo pixel, e a que vem depois na lista de formas da opção vence. O viés é o índice da forma vezes
   `passoDeDesempate` e vale para as faces e os traços da forma, de modo que o resultado não depende da placa de vídeo
   nem de arredondamento. O passo (no máximo 0,004 mm, e menos quando há muitas formas, para o viés total ficar abaixo de
   0,4 mm) é bem menor que qualquer folga que o desenho consiga mostrar.

   Perfil dos traços: um traço é uma fita de 2 px, e a face a que ele pertence, quando inclinada em relação ao olho, passa pela
   frente da metade da fita que fica sobre ela e a come, se a fita é plana na profundidade. Empurrar as faces para trás em
   proporção à inclinação delas (polygonOffset) evita isso, mas o empurrão é de uns 2 px de olho e, com a vista longe, passa dos
   milímetros de uma chapa: o traço de uma forma que está atrás de uma chapa fina atravessava a chapa. Em vez disso, cada
   segmento de traço leva o perfil da superfície sob a fita (`inclinacoes`, por traço e por segmento, ver `inclinarTracos`), e
   o desenhista deita a fita nessa superfície: ela fica na frente da própria face só pelo viés do traço, e atrás de qualquer
   face de outra forma na mesma distância em que a própria superfície está. */
export const LARGURA_DO_TRACO = 2;
export const COR_DO_TRACO = '#111111';
/* inclinação máxima de uma face, em milímetro de profundidade por milímetro de tela: só evita que a conta exploda numa face quase de perfil */
export const INCLINACAO_MAXIMA = 1000;
/* a ponta da fita, que só preenche a quina entre dois segmentos, afunda atrás do vértice até o equivalente a esta inclinação */
const INCLINACAO_DA_PONTA = 4;
/* fora das faces, a fita só acompanha o plano das faces da aresta que tenham até esta inclinação */
const INCLINACAO_EXTERIOR = 2.5;
/* uma face de outra forma encosta numa aresta quando o plano dela passa pelo meio do segmento a menos de tanto, em mm de profundidade */
export const FOLGA_DO_ENCOSTO = 0.6;
/* as colunas do perfil de cada lado do eixo da fita, em frações da meia largura (o sinal positivo é o do lado de `(-dy, dx)`, a normal do segmento a -> b) */
export const AMOSTRAS_DO_PERFIL = [-1, -0.75, -0.5, -0.25, 0.25, 0.5, 0.75, 1];
const CELULA = 16;
const arred2 = (x) => Math.round(x * 100) / 100;
const arred3 = (x) => Math.round(x * 1000) / 1000;

export const passoDeDesempate = (n) => Math.min(0.004, 0.4 / Math.max(1, n));

/* Inclinação [gx, gy] da profundidade na tela de uma face com vértices [x, y, z] (pelo vetor normal de Newell), ou null quando a
   face está de perfil para o olho (ela não cobre pixel). A inclinação é limitada a `maxima` (em milímetro de profundidade por
   pixel do quadro), só para a conta não explodir numa face quase de perfil. */
export function inclinacaoDaFace(pts, maxima) {
  const n = pts.length;
  let nx = 0; let ny = 0; let nz = 0;
  for (let i = 0; i < n; i++) {
    const a = pts[i]; const b = pts[(i + 1) % n];
    nx += (a[1] - b[1]) * (a[2] + b[2]);
    ny += (a[2] - b[2]) * (a[0] + b[0]);
    nz += (a[0] - b[0]) * (a[1] + b[1]);
  }
  if (!(Math.abs(nz) > 1e-9 * (Math.abs(nx) + Math.abs(ny) + Math.abs(nz)) && Math.abs(nz) > 1e-12)) return null;
  const g = [-nx / nz, -ny / nz];
  const m = Math.hypot(g[0], g[1]);
  return m > maxima ? [g[0] * (maxima / m), g[1] * (maxima / m)] : g;
}

/* `itens`: as formas visíveis do painel (`{ r, chunks, prof }`); `tela` leva um ponto 3D à tela (já com a projeção da
   vista); `tinta(r, normal)` dá a cor da face. Devolve as formas da camada, na ordem do painel. */
export function formasDoPainel(itens, { tela, olho, tinta, previa = false }) {
  const passo = passoDeDesempate(itens.length);
  /* pixels do quadro por milímetro (a projeção é ortogonal: um vetor perpendicular ao olho mantém o comprimento) */
  const apoio = Math.abs(olho[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
  const perp = [olho[1] * apoio[2] - olho[2] * apoio[1], olho[2] * apoio[0] - olho[0] * apoio[2], olho[0] * apoio[1] - olho[1] * apoio[0]];
  const norma = Math.hypot(...perp) || 1;
  const t0 = tela([0, 0, 0]);
  const t1 = tela(perp.map((x) => x / norma));
  const pxPorMm = Math.hypot(t1[0] - t0[0], t1[1] - t0[1]) || 1;
  const formas = itens.map((it, rank) => {
    const vies = rank * passo;
    const p3 = (p) => { const [x, y] = tela(p); return [arred2(x), arred2(y), arred3(p[0] * olho[0] + p[1] * olho[1] + p[2] * olho[2] + vies)]; };
    const faces = [];
    const tracos = [];
    const anel = (pts, fechado) => { const q = pts.map(p3); if (fechado) q.push(q[0]); tracos.push(q); };
    for (const ch of it.chunks) {
      for (const f of [...ch.dentro, ...ch.lados]) {
        faces.push({ c: f.pts.map(p3), k: tinta(it.r, f.n) });
        if (it.r.prisma?.naoConvexo && !previa) for (const l of f.linhas ?? []) tracos.push(l.map(p3));
      }
      for (const t of ch.tampas) {
        const furos = t.furos && t.furos.length > 0 ? t.furos : t.furo ? [t.furo] : [];
        faces.push({ c: t.pts.map(p3), ...(furos.length > 0 ? { h: furos.map((fu) => fu.map(p3)) } : {}), k: tinta(it.r, t.n) });
        anel(t.pts, true);
        for (const fu of furos) anel(fu, true);
      }
      if (!previa) {
        for (const arc of ch.arcos ?? []) if (arc.length >= 2) anel(arc, false);
        if (!it.r.prisma?.naoConvexo) for (const l of ch.linhas) tracos.push(l.map(p3));
      }
    }
    return { id: it.r.id, rank, opacidade: it.r.opacidade !== undefined && it.r.opacidade < 1 ? it.r.opacidade : 1, prof: it.prof, faces, tracos };
  });
  inclinarTracos(formas, { maxima: INCLINACAO_MAXIMA / pxPorMm, maximaDaPonta: INCLINACAO_DA_PONTA / pxPorMm, maximaExterior: INCLINACAO_EXTERIOR / pxPorMm, meia: LARGURA_DO_TRACO / 2 });
  return formas;
}

/* Cada forma da camada ganha `inclinacoes`: por traço e por segmento, `[perfil, fundoA, fundoB]`.

   `perfil`: a profundidade da superfície sob a fita em relação ao eixo dela, em milímetro (positivo é mais perto do olho), em
   `AMOSTRAS_DO_PERFIL` pontos a cada lado do eixo, primeiro os de A e depois os de B (cada grupo na ordem das amostras). A
   superfície é a das faces da própria forma que cobrem o ponto e a das faces de outras formas que encostam na aresta (cujo
   plano passa pelo meio do segmento a menos de `FOLGA_DO_ENCOSTO` mm de profundidade: a parede sobre o piso); a mais perto do
   olho vale. Sem face sobre o ponto, vale o plano, entre as faces da aresta, que o deixa mais longe do olho, estendido, e nunca
   mais perto do olho que o eixo; as faces mais inclinadas que `INCLINACAO_EXTERIOR` (a face quase de perfil, no contorno de um
   sólido curvo, tem plano de inclinação enorme e não diz nada do que há fora dela) não valem, e então a fita fica plana. O perfil de cada extremo é medido um pouco para dentro do segmento (até uma meia
   largura, e no máximo um quarto dele), para os pontos de cima e de baixo da fita não caírem fora da face na quina, onde ela
   acaba. A fita deitada nessa superfície não é comida pela própria face, por mais inclinada que ela seja, e fica tão atrás de
   qualquer face de outra forma quanto a própria superfície dela.

   `fundoA` e `fundoB`: quantos milímetros a ponta da fita, que passa do vértice em meia largura (só preenche a quina entre dois
   segmentos), afunda atrás do vértice: a maior variação do perfil nesse extremo, vezes 1,5, limitada a `INCLINACAO_DA_PONTA`
   vezes a meia largura (a ponta cobre até 1,4 px de distância do vértice). Plana na profundidade do vértice, ela ficaria à
   frente de uma face inclinada que passa atrás do vértice.

   Segmento sem face (uma linha solta) leva um perfil zerado e a fita fica plana. */
function inclinarTracos(formas, { maxima, maximaDaPonta, maximaExterior, meia }) {
  const chave = (q) => `${q[0]},${q[1]},${q[2]}`;
  const perfilPlano = Array(2 * AMOSTRAS_DO_PERFIL.length).fill(0);
  /* o ponto está dentro da face (anel de fora menos os furos, regra par-ímpar)? */
  const dentroDe = (f, x, y) => {
    let dentro = false;
    for (const anel of [f.c, ...(f.h ?? [])]) {
      for (let i = 0, n = anel.length, j = n - 1; i < n; j = i++) {
        const a = anel[i]; const b = anel[j];
        if ((a[1] > y) !== (b[1] > y) && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) dentro = !dentro;
      }
    }
    return dentro;
  };
  /* as faces de todas as formas, com a inclinação e a caixa na tela, numa grade de células de CELULA px */
  const grade = new Map();
  const porForma = formas.map((forma, k) => {
    const porVertice = new Map();
    for (const f of forma.faces) {
      const g = inclinacaoDaFace(f.c, maxima);
      if (!g) continue;
      const xs = f.c.map((q) => q[0]); const ys = f.c.map((q) => q[1]);
      const d = { f, g, k, z: f.c[0], chaves: [...new Set([...f.c, ...(f.h ?? []).flat()].map(chave))], caixa: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] };
      for (const q of d.chaves) {
        if (!porVertice.has(q)) porVertice.set(q, []);
        porVertice.get(q).push(d);
      }
      const x0 = Math.floor(d.caixa[0] / CELULA); const x1 = Math.floor(d.caixa[2] / CELULA);
      const y0 = Math.floor(d.caixa[1] / CELULA); const y1 = Math.floor(d.caixa[3] / CELULA);
      for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) {
        const c = `${cx},${cy}`;
        if (!grade.has(c)) grade.set(c, []);
        grade.get(c).push(d);
      }
    }
    return porVertice;
  });
  const zDe = (d, x, y) => d.z[2] + d.g[0] * (x - d.z[0]) + d.g[1] * (y - d.z[1]);
  formas.forEach((forma, k) => {
    const porVertice = porForma[k];
    forma.inclinacoes = forma.tracos.map((t) => {
      const segs = [];
      for (let i = 0; i + 1 < t.length; i++) {
        const a = t[i]; const b = t[i + 1];
        const dx = b[0] - a[0]; const dy = b[1] - a[1];
        const n = Math.hypot(dx, dy);
        if (!(n > 1e-6)) { segs.push([perfilPlano, 0, 0]); continue; }
        /* as faces de outras formas que encostam na aresta (só se a aresta é de alguma face da forma) */
        const mx = (a[0] + b[0]) / 2; const my = (a[1] + b[1]) / 2; const mz = (a[2] + b[2]) / 2;
        const B = new Set(porVertice.get(chave(b)) ?? []);
        const comuns = (porVertice.get(chave(a)) ?? []).filter((d) => B.has(d));
        const encostam = new Set(comuns.length > 0 ? (grade.get(`${Math.floor(mx / CELULA)},${Math.floor(my / CELULA)}`) ?? []).filter((d) => d.k !== k && Math.abs(zDe(d, mx, my) - mz) <= FOLGA_DO_ENCOSTO) : []);
        const px = -dy / n; const py = dx / n;
        const recuo = Math.min(meia, n / 4);
        const perfilEm = (v, sinal) => {
          const bx = v[0] + sinal * recuo * (dx / n); const by = v[1] + sinal * recuo * (dy / n);
          const bz = v[2] + sinal * recuo * ((b[2] - a[2]) / n);
          return AMOSTRAS_DO_PERFIL.map((s) => {
            const x = bx + s * meia * px; const y = by + s * meia * py;
            let melhor = -Infinity;
            for (const d of grade.get(`${Math.floor(x / CELULA)},${Math.floor(y / CELULA)}`) ?? []) {
              if (x < d.caixa[0] || x > d.caixa[2] || y < d.caixa[1] || y > d.caixa[3]) continue;
              if ((d.k === k || encostam.has(d)) && dentroDe(d.f, x, y)) melhor = Math.max(melhor, zDe(d, x, y));
            }
            if (melhor > -Infinity) return arred3(melhor - bz);
            /* fora de toda face: o plano das faces da aresta que deixa o ponto mais longe, estendido: só pode afastar a fita */
            let ext = Infinity;
            for (const d of comuns) if (Math.hypot(d.g[0], d.g[1]) <= maximaExterior) ext = Math.min(ext, zDe(d, x, y) - bz);
            return ext === Infinity ? 0 : arred3(Math.min(0, ext));
          });
        };
        const pa = perfilEm(a, 1); const pb = perfilEm(b, -1);
        const fundo = (p) => arred3(Math.min(maximaDaPonta * meia, 1.5 * Math.max(0, ...p.map(Math.abs))));
        segs.push([[...pa, ...pb], fundo(pa), fundo(pb)]);
      }
      return segs;
    });
  });
}

/* A camada do quadro: todas as formas de todos os painéis (cada painel tem a própria posição no quadro e os painéis não
   se sobrepõem, então dividem o mesmo buffer de profundidade) e a faixa de profundidade para a câmera. `colunasDoTraco` são as
   colunas da fita, de um lado ao outro do eixo, em frações da meia largura, e o perfil de cada segmento tem uma amostra por
   coluna fora do eixo. */
export function montarCamada(formas, largura, altura) {
  let zMin = Infinity;
  let zMax = -Infinity;
  for (const f of formas) for (const q of [...f.faces.map((x) => x.c), ...f.tracos]) for (const v of q) { if (v[2] < zMin) zMin = v[2]; if (v[2] > zMax) zMax = v[2]; }
  if (!Number.isFinite(zMin)) { zMin = 0; zMax = 1; }
  const colunasDoTraco = [...AMOSTRAS_DO_PERFIL.filter((s) => s < 0), 0, ...AMOSTRAS_DO_PERFIL.filter((s) => s > 0)];
  return { largura, altura, zMin, zMax, corDoTraco: COR_DO_TRACO, larguraDoTraco: LARGURA_DO_TRACO, colunasDoTraco, formas };
}
