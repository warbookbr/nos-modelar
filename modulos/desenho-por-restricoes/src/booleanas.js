/* booleanas.js — união, diferença, interseção, área e deslocamento de listas de anéis em milímetro, sobre a `CrossSection` da
   Manifold (`manifold-3d`, WebAssembly, que usa a Clipper2).

   O módulo não importa o núcleo do Mecanifica: carrega a Manifold por conta própria, uma vez. Cada função recebe e devolve dados
   comuns (listas de anéis `[[h, v], ...]`), cria os objetos da biblioteca e os libera antes de voltar. O preenchimento é
   `NonZero`, de modo que anéis do mesmo sentido se unem e um anel interno de sentido oposto é um furo. Um componente é
   `{ externo, furos }`, com o externo anti-horário, e os componentes saem do maior para o menor (área, depois o menor h e o menor v
   do anel externo), de modo que a mesma entrada dá a mesma ordem. */

let carregando = null;

export function carregarManifold() {
  carregando ??= import('manifold-3d').then(async (modulo) => {
    const wasm = await modulo.default();
    wasm.setup();
    return wasm;
  });
  return carregando;
}

export const areaDoAnel = (anel) => {
  let s = 0;
  for (let i = 0; i < anel.length; i += 1) {
    const [ah, av] = anel[i]; const [bh, bv] = anel[(i + 1) % anel.length];
    s += ah * bv - bh * av;
  }
  return s / 2;
};

const menorPonto = (anel) => anel.reduce((m, p) => (p[0] < m[0] || (p[0] === m[0] && p[1] < m[1]) ? p : m), anel[0]);

/* O anel começando no menor ponto (h, depois v): a mesma forma dá o mesmo anel, venha a biblioteca de onde vier. */
export function iniciarNoMenor(anel) {
  const m = menorPonto(anel);
  const i = anel.findIndex((p) => p[0] === m[0] && p[1] === m[1]);
  return [...anel.slice(i), ...anel.slice(0, i)];
}

function componentesDe(secao) {
  const componentes = [];
  for (const parte of secao.decompose()) {
    const externos = []; const furos = [];
    for (const poligono of parte.toPolygons()) {
      const anel = poligono.map(([h, v]) => [h, v]);
      const area = areaDoAnel(anel);
      if (area > 0) externos.push(iniciarNoMenor(anel));
      else if (area < 0) furos.push(iniciarNoMenor(anel.reverse()));
    }
    parte.delete();
    if (externos.length === 1) componentes.push({ externo: externos[0], furos: furos.sort((a, b) => a[0][0] - b[0][0] || a[0][1] - b[0][1]) });
  }
  const area = (c) => areaDoAnel(c.externo);
  return componentes.sort((a, b) => area(b) - area(a) || a.externo[0][0] - b.externo[0][0] || a.externo[0][1] - b.externo[0][1]);
}

/* Roda `fn(CS, guardar)`; tudo o que `guardar` recebeu é liberado ao fim. */
async function comSecoes(fn) {
  const { CrossSection: CS } = await carregarManifold();
  const limpar = [];
  const guardar = (x) => { limpar.push(x); return x; };
  try { return fn(CS, guardar); } finally { for (const x of limpar) x.delete(); }
}

/* Uma forma de várias regiões, que é como o arquivo de contornos desenha o objeto: cada região é uma lista de anéis lida pelo
   preenchimento par-ímpar (um anel dentro de outro é um furo, qualquer que seja o sentido dele), e a forma é a união das regiões.
   O vão que as regiões cercam e nenhuma cobre fica de fora da forma e sai da área; a lista de anéis de `secaoDe` abaixo, que une
   todos, o enche quando o anel de fora é só o que se guarda. */
export const deRegioes = (regioes) => ({ regioes });

const secaoDe = (CS, guardar, forma) => {
  if (!Array.isArray(forma)) return guardar(CS.union(forma.regioes.map((aneis) => guardar(new CS(aneis, 'EvenOdd')))));
  return guardar(new CS(forma.map((a) => (areaDoAnel(a) < 0 ? [...a].reverse() : a)), 'NonZero'));
};

export function uniao(aneis) {
  return comSecoes((CS, g) => componentesDe(secaoDe(CS, g, aneis)));
}

/* Os anéis de `a` menos os de `b`. */
export function diferenca(a, b) {
  return comSecoes((CS, g) => {
    const sa = secaoDe(CS, g, a);
    if (!b.length) return componentesDe(sa);
    return componentesDe(g(sa.subtract(secaoDe(CS, g, b))));
  });
}

/* As áreas da interseção e da união de duas formas, cada uma uma lista de anéis. */
export function areasDaInterseccao(a, b) {
  return comSecoes((CS, g) => {
    const sa = secaoDe(CS, g, a); const sb = secaoDe(CS, g, b);
    const inter = g(sa.intersect(sb));
    return { a: sa.area(), b: sb.area(), intersecao: inter.area(), uniao: sa.area() + sb.area() - inter.area() };
  });
}

/* O mesmo que `areasDaInterseccao`, com `b` deslocado de `[dh, dv]`. Cada forma é uma lista de anéis ou uma forma de regiões
   (`deRegioes`), e `a` e `b` são as áreas dela, com os furos descontados. */
export function areasComDeslocamento(a, b, [dh, dv]) {
  return comSecoes((CS, g) => {
    const sa = secaoDe(CS, g, a); const sb = g(secaoDe(CS, g, b).translate([dh, dv]));
    const inter = g(sa.intersect(sb));
    return { a: sa.area(), b: sb.area(), intersecao: inter.area(), uniao: sa.area() + sb.area() - inter.area() };
  });
}

/* Procura a translação de `b` que maximiza a razão interseção/união com `a`, por busca em padrão a partir de cada início: tenta
   os oito vizinhos a `passo`, anda para o melhor e, quando nenhum melhora, divide o passo ao meio, até `passoMinimo`. As duas
   formas, cada uma uma lista de anéis ou uma forma de regiões (`deRegioes`), são montadas uma vez só. Devolve
   `{ deslocamento, iou, avaliacoes }` do melhor início; empate fica com o primeiro. */
export function maximizarTranslacao(a, b, inicios, passo, passoMinimo) {
  return comSecoes((CS, g) => {
    const sa = secaoDe(CS, g, a); const sb = secaoDe(CS, g, b);
    const areaA = sa.area(); const areaB = sb.area();
    let avaliacoes = 0;
    const iou = ([dh, dv]) => {
      avaliacoes += 1;
      const deslocada = sb.translate([dh, dv]); const inter = sa.intersect(deslocada);
      const i = inter.area(); deslocada.delete(); inter.delete();
      return i / (areaA + areaB - i);
    };
    let melhor = null;
    for (const inicio of inicios) {
      let atual = [...inicio]; let valor = iou(atual); let p = passo;
      while (p >= passoMinimo) {
        let achou = null;
        for (const [sh, sv] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
          const cand = [atual[0] + sh * p, atual[1] + sv * p];
          const v = iou(cand);
          if (v > valor + 1e-12 && (!achou || v > achou.valor + 1e-12)) achou = { cand, valor: v };
        }
        if (achou) { atual = achou.cand; valor = achou.valor; } else p /= 2;
      }
      if (!melhor || valor > melhor.iou + 1e-12) melhor = { deslocamento: atual, iou: valor };
    }
    return { ...melhor, avaliacoes };
  });
}

/* Os anéis deslocados para fora (`delta` > 0) ou para dentro, com a junta em esquadria. */
export function deslocar(aneis, delta) {
  return comSecoes((CS, g) => componentesDe(g(secaoDe(CS, g, aneis).offset(delta, 'Miter', 2, 0))));
}
