/* esboco-alinhar-caixas.mjs — alinha as caixas de um esboço onde a receita de origem as deixou desencontradas por pouco.
   Núcleo puro: recebe as formas resolvidas (`formasResolvidas`) e devolve cópias com as caixas ajustadas e o registro do que mudou.

   Só mexe em caixa sem giro. As formas girada, cilindro e extrusão ficam como estão. Quatro regras, cada uma com o limite escrito aqui:

   Limite geral: nenhuma face anda mais que `LIMITE_DE_MUDANCA` a partir da posição original, o que impede a cascata das regras de esticar uma peça.

   0. Simetria. O eixo é o centro, em x, da caixa envolvente de todas as formas. Duas caixas que são par espelhado (a posição de uma é a da outra refletida
      no eixo com diferença de até `TOLERANCIA_DA_SIMETRIA`, e as medidas e as faixas em y e z diferem pouco) passam a ter as médias das duas, refletidas.
      A caixa sem par que está perto do eixo (até `TOLERANCIA_DA_SIMETRIA`) é centrada nele. A simetria vem antes das outras três.
      Em seguida, as caixas que ficam uma atrás da outra (as quatro pernas, os dois postes) e se cobrem em mais da metade da altura têm as faces em x e z
      alinhadas quando diferem até `TOLERANCIA_DO_DEGRAU`: a de menor volume leva a face da maior (regra `coluna`).

   1. Degrau. Duas caixas que se tocam ou se entram, com faces paralelas do mesmo lado e diferença entre `LIMIAR_DO_DEGRAU_MIN` e `TOLERANCIA_DO_DEGRAU`,
      ficam com a face igual: a peça mais fina naquele eixo (a que tem menor extensão nele) leva a face da outra; no empate, a de menor volume.
   2. Contato. Duas caixas de frente uma para a outra, com a folga ou a sobreposição entre `LIMIAR_DO_DEGRAU_MIN` e `TOLERANCIA_DO_DEGRAU`, passam a se
      encostar exatamente (a de menor base move a face).
   3. Folga. Duas caixas de frente uma para a outra na vertical (y), com os contornos se cobrindo em pelo menos metade da menor base e a folga entre
      `TOLERANCIA_DO_DEGRAU` e `TOLERANCIA_DA_FOLGA`, ligam-se: a de menor base estende a face até a outra. É o topo da perna que não chega ao assento.

   O que a regra acerta e o que não: ela trata o desencontro de milímetros, não o objeto mal desenhado. O resultado vai para a pessoa julgar em imagem. */

export const LIMIAR_DO_DEGRAU_MIN = 0.25;
export const TOLERANCIA_DO_DEGRAU = 6;
export const TOLERANCIA_DA_FOLGA = 40;
export const TOLERANCIA_DA_SIMETRIA = 40;
export const LIMITE_DE_MUDANCA = 45; // quanto uma face pode andar, no total, a partir da posição original
const PASSADAS = 6;

const identidade = (m) => m.every((l, i) => l.every((v, j) => Math.abs(v - (i === j ? 1 : 0)) < 1e-9));
const sobrepoe = (a, b, k, folga = 0) => Math.min(a.max[k], b.max[k]) - Math.max(a.min[k], b.min[k]) > -folga;
const extensao = (c, k) => c.max[k] - c.min[k];
const volume = (c) => extensao(c, 0) * extensao(c, 1) * extensao(c, 2);
const base = (c, k) => [0, 1, 2].filter((x) => x !== k).reduce((p, x) => p * extensao(c, x), 1);

/** Quanto os contornos de a e b se cobrem nos eixos que não são k, em fração da menor base. */
function cobertura(a, b, k) {
  const outros = [0, 1, 2].filter((x) => x !== k);
  let ov = 1;
  for (const x of outros) ov *= Math.max(0, Math.min(a.max[x], b.max[x]) - Math.max(a.min[x], b.min[x]));
  return ov / Math.min(base(a, k), base(b, k));
}

/**
 * @param {Array} formas as formas resolvidas de `formasResolvidas(esboco, opcao).formas`
 * @returns {{ formas: Array, alteracoes: Array<{ forma: string, eixo: string, lado: 'min'|'max', de: number, para: number, regra: string, com: string }> }}
 */
export function alinharCaixas(formas) {
  const caixas = formas
    .filter((f) => f.tipo === 'caixa' && identidade(f.geometria.matriz))
    .map((f) => ({ id: f.id, min: [...f.geometria.caixa.min], max: [...f.geometria.caixa.max], origem: { min: [...f.geometria.caixa.min], max: [...f.geometria.caixa.max] }, chanfro: f.geometria.chanfro ?? 0 }));
  const alteracoes = [];
  const mover = (c, k, lado, para, regra, com) => {
    const de = c[lado][k];
    if (Math.abs(de - para) < 1e-9) return false;
    const novo = lado === 'min' ? { min: para, max: c.max[k] } : { min: c.min[k], max: para };
    if (Math.abs(para - c.origem[lado][k]) > LIMITE_DE_MUDANCA) return false;
    const minimoDoChanfro = Math.max(2 * c.chanfro + 0.5, 1);
    if (novo.max - novo.min < minimoDoChanfro) return false;
    c[lado][k] = para;
    alteracoes.push({ forma: c.id, eixo: 'xyz'[k], lado, de: Math.round(de * 100) / 100, para: Math.round(para * 100) / 100, regra, com });
    return true;
  };

  /* 0. simetria */
  const todas = formas.map((f) => f.geometria.caixa);
  const eixoX = (Math.min(...todas.map((c) => c.min[0])) + Math.max(...todas.map((c) => c.max[0]))) / 2;
  const centroX = (c) => (c.min[0] + c.max[0]) / 2;
  const perto = (a, b, tol) => Math.abs(a - b) <= tol;
  /* 0a. grupos regulares: três ou mais caixas iguais em fila (as ripas do encosto, as tábuas do assento) com o mesmo passo ficam centradas no eixo */
  const chave = (c) => [1, 2].map((k) => `${Math.round(c.min[k])}:${Math.round(c.max[k])}`).join('|') + `|${Math.round(extensao(c, 0))}`;
  const porForma = new Map();
  for (const c of caixas) { const k = chave(c); if (!porForma.has(k)) porForma.set(k, []); porForma.get(k).push(c); }
  const emGrupo = new Set();
  for (const grupo of porForma.values()) {
    if (grupo.length < 3) continue;
    const ordenado = [...grupo].sort((a, b) => centroX(a) - centroX(b));
    const passos = ordenado.slice(1).map((c, i) => centroX(c) - centroX(ordenado[i]));
    if (Math.max(...passos) - Math.min(...passos) > 2) continue;
    const centroDoGrupo = (centroX(ordenado[0]) + centroX(ordenado[ordenado.length - 1])) / 2;
    for (const c of ordenado) emGrupo.add(c.id);
    const d = eixoX - centroDoGrupo;
    if (Math.abs(d) < LIMIAR_DO_DEGRAU_MIN || Math.abs(d) > TOLERANCIA_DA_SIMETRIA) continue;
    for (const c of ordenado) { mover(c, 0, 'min', c.min[0] + d, 'grupo', 'eixo'); mover(c, 0, 'max', c.max[0] + d, 'grupo', 'eixo'); }
  }

  const pareados = new Set();
  for (let i = 0; i < caixas.length; i += 1) {
    const a = caixas[i];
    if (pareados.has(a.id) || Math.abs(centroX(a) - eixoX) <= TOLERANCIA_DA_SIMETRIA / 4) continue;
    let melhor = null; let melhorD = Infinity;
    for (let j = 0; j < caixas.length; j += 1) {
      const b = caixas[j];
      if (i === j || pareados.has(b.id)) continue;
      if ((centroX(a) - eixoX) * (centroX(b) - eixoX) >= 0) continue; // lados opostos
      const d = Math.abs((centroX(a) - eixoX) + (centroX(b) - eixoX));
      const largura = (c) => extensao(c, 0);
      const parecidas = perto(largura(a), largura(b), Math.max(6, 0.1 * largura(a))) && [1, 2].every((k) => perto(extensao(a, k), extensao(b, k), Math.max(6, 0.1 * extensao(a, k))) && perto(a.min[k], b.min[k], TOLERANCIA_DA_SIMETRIA));
      if (d <= TOLERANCIA_DA_SIMETRIA && parecidas && d < melhorD) { melhor = b; melhorD = d; }
    }
    if (!melhor) continue;
    const b = melhor;
    pareados.add(a.id); pareados.add(b.id);
    const [esq, dir] = centroX(a) < centroX(b) ? [a, b] : [b, a];
    const desloc = (Math.abs(centroX(esq) - eixoX) + Math.abs(centroX(dir) - eixoX)) / 2;
    const larg = (extensao(esq, 0) + extensao(dir, 0)) / 2;
    const faixa = (k) => [(esq.min[k] + dir.min[k]) / 2, (esq.max[k] + dir.max[k]) / 2];
    const [y0, y1] = faixa(1); const [z0, z1] = faixa(2);
    for (const [c, sinal] of [[esq, -1], [dir, 1]]) {
      const cx = eixoX + sinal * desloc;
      const novo = { min: [cx - larg / 2, y0, z0], max: [cx + larg / 2, y1, z1] };
      for (let k = 0; k < 3; k += 1) for (const lado of ['min', 'max']) mover(c, k, lado, novo[lado][k], 'simetria', sinal < 0 ? dir.id : esq.id);
    }
  }
  for (const c of caixas) {
    if (pareados.has(c.id)) continue;
    const desvio = centroX(c) - eixoX;
    if (Math.abs(desvio) > TOLERANCIA_DA_SIMETRIA || Math.abs(desvio) < LIMIAR_DO_DEGRAU_MIN) continue;
    const meia = extensao(c, 0) / 2;
    mover(c, 0, 'min', eixoX - meia, 'simetria', 'eixo'); mover(c, 0, 'max', eixoX + meia, 'simetria', 'eixo');
  }

  /* 0b. colunas: caixas separadas num eixo que se cobrem em y */
  for (let i = 0; i < caixas.length; i += 1) for (let j = i + 1; j < caixas.length; j += 1) {
    const a = caixas[i]; const b = caixas[j];
    const cobreY = Math.min(a.max[1], b.max[1]) - Math.max(a.min[1], b.min[1]);
    if (cobreY < 0.5 * Math.min(extensao(a, 1), extensao(b, 1))) continue;
    for (const k of [0, 2]) {
      const outro = k === 0 ? 2 : 0;
      if (sobrepoe(a, b, outro, 0.01)) continue; // se se tocam no outro eixo, são vizinhas, não colunas
      for (const lado of ['min', 'max']) {
        const d = a[lado][k] - b[lado][k];
        if (Math.abs(d) < LIMIAR_DO_DEGRAU_MIN || Math.abs(d) > TOLERANCIA_DO_DEGRAU) continue;
        const [menor, maior] = volume(a) <= volume(b) ? [a, b] : [b, a];
        mover(menor, k, lado, maior[lado][k], 'coluna', maior.id);
      }
    }
  }

  for (let passada = 0; passada < PASSADAS; passada += 1) {
    let mudou = false;
    for (let i = 0; i < caixas.length; i += 1) for (let j = i + 1; j < caixas.length; j += 1) {
      const a = caixas[i]; const b = caixas[j];
      for (let k = 0; k < 3; k += 1) {
        const outros = [0, 1, 2].filter((x) => x !== k);
        const seToca = outros.every((x) => sobrepoe(a, b, x, TOLERANCIA_DO_DEGRAU)) && sobrepoe(a, b, k, TOLERANCIA_DA_FOLGA);
        if (!seToca) continue;
        /* 1. degrau: faces do mesmo lado */
        for (const lado of ['min', 'max']) {
          const d = a[lado][k] - b[lado][k];
          if (Math.abs(d) < LIMIAR_DO_DEGRAU_MIN || Math.abs(d) > TOLERANCIA_DO_DEGRAU) continue;
          const [mais, menos] = extensao(a, k) < extensao(b, k) || (extensao(a, k) === extensao(b, k) && volume(a) <= volume(b)) ? [a, b] : [b, a];
          if (mover(mais, k, lado, menos[lado][k], 'degrau', menos.id)) mudou = true;
        }
        /* 2 e 3. contato e folga: a face de cima de uma e a de baixo da outra */
        for (const [de, para] of [[a, b], [b, a]]) {
          const g = para.min[k] - de.max[k]; // de vem antes de para; negativo é entrada de uma na outra
          if (Math.abs(g) < LIMIAR_DO_DEGRAU_MIN || g > TOLERANCIA_DA_FOLGA || g < -TOLERANCIA_DO_DEGRAU) continue;
          const contato = Math.abs(g) <= TOLERANCIA_DO_DEGRAU;
          if (!contato && (k !== 1 || cobertura(de, para, k) < 0.5)) continue; // a folga só se fecha na vertical: topo de perna que não chega ao assento
          if (k === 0 && (emGrupo.has(de.id) || emGrupo.has(para.id))) continue; // o vão entre as ripas é do desenho
          const [quem, lado, alvo] = base(de, k) <= base(para, k) ? [de, 'max', para.min[k]] : [para, 'min', de.max[k]];
          if (mover(quem, k, lado, alvo, contato ? 'contato' : 'folga', quem === de ? para.id : de.id)) mudou = true;
        }
      }
    }
    if (!mudou) break;
  }

  const porId = new Map(caixas.map((c) => [c.id, c]));
  const saida = formas.map((f) => {
    const c = porId.get(f.id);
    if (!c) return f;
    const g = f.geometria;
    const centro = [0, 1, 2].map((k) => (c.min[k] + c.max[k]) / 2);
    return { ...f, geometria: { ...g, caixa: { min: c.min, max: c.max }, centro, largura: c.max[0] - c.min[0], altura: c.max[1] - c.min[1], profundidade: c.max[2] - c.min[2] } };
  });
  return { formas: saida, alteracoes };
}
