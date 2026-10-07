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
   0,4 mm) é bem menor que qualquer folga que o desenho consiga mostrar. */

export const LARGURA_DO_TRACO = 2;
export const COR_DO_TRACO = '#111111';
const arred2 = (x) => Math.round(x * 100) / 100;
const arred3 = (x) => Math.round(x * 1000) / 1000;

export const passoDeDesempate = (n) => Math.min(0.004, 0.4 / Math.max(1, n));

/* `itens`: as formas visíveis do painel (`{ r, chunks, prof }`); `tela` leva um ponto 3D à tela (já com a projeção da
   vista); `tinta(r, normal)` dá a cor da face. Devolve as formas da camada, na ordem do painel. */
export function formasDoPainel(itens, { tela, olho, tinta, previa = false }) {
  const passo = passoDeDesempate(itens.length);
  return itens.map((it, rank) => {
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
}

/* A camada do quadro: todas as formas de todos os painéis (cada painel tem a própria posição no quadro e os painéis não
   se sobrepõem, então dividem o mesmo buffer de profundidade) e a faixa de profundidade para a câmera. */
export function montarCamada(formas, largura, altura) {
  let zMin = Infinity;
  let zMax = -Infinity;
  for (const f of formas) for (const q of [...f.faces.map((x) => x.c), ...f.tracos]) for (const v of q) { if (v[2] < zMin) zMin = v[2]; if (v[2] > zMax) zMax = v[2]; }
  if (!Number.isFinite(zMin)) { zMin = 0; zMax = 1; }
  return { largura, altura, zMin, zMax, corDoTraco: COR_DO_TRACO, larguraDoTraco: LARGURA_DO_TRACO, formas };
}
