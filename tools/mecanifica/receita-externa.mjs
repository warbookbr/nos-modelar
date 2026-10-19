/* Tradutor da receita do externo (projeto externo, `externo/receitas/<id>.json`, já expandida pelo `receita.py`) para o esboço do Mecanifica.
   Núcleo puro: recebe o objeto da receita e devolve `{ esboco, recusas }`.

   Quadro. A receita é em metro, com x leste, y norte, z para cima e o objeto virado para o sul (frente em -y). O esboço é em milímetro, com y para
   cima e a frente em +z: (x, y, z) vira (x, z, -y).

   Formas. `caixa` vira caixa (com `chanfro` limitado a 20% da menor medida, que é o que o esboço aceita em peça fina), `cilindro` vira cilindro ou
   cone (`raio_topo`), `prisma` vira extrusão. A peça com `rot`, `cortes`, `curva` ou `afinar` ainda não é traduzida e sai em `recusas` com o motivo.

   Materiais. O bloco `realista.materiais` e a tabela `cores` da receita passam para o `materiais` da raiz do esboço sem perda, e cada forma leva o
   nome do seu `material`. O esboço guarda e não interpreta (ver o tópico `materiais` da ajuda do esboço); `materiaisParaReceita` faz o caminho de volta. */

const mm = (v) => Math.round(v * 1e6) / 1e3;
const r3 = (v) => Math.round(v * 1000) / 1000;
const hex = (rgb) => `#${rgb.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
const girada = (p) => Boolean(p.rot) && p.rot.some((a) => Math.abs(a) > 1e-6);

/** O bloco de materiais do esboço a partir da receita: `{ nome: { tipo, ...campos de realista.materiais, cor } }`; um nome só de `cores` leva `declarado: false`. */
export function materiaisDaReceita(receita) {
  const real = receita.realista?.materiais ?? {};
  const cores = receita.cores ?? {};
  const saida = {};
  for (const nome of new Set([...Object.keys(real), ...Object.keys(cores), ...receita.pecas.map((p) => p.material ?? receita.material).filter(Boolean)])) {
    const m = real[nome];
    saida[nome] = { tipo: m?.tipo ?? 'liso', ...(m ? Object.fromEntries(Object.entries(m).filter(([k]) => k !== 'tipo')) : { declarado: false }) };
    if (cores[nome]) saida[nome].cor = cores[nome];
  }
  return saida;
}

/** O caminho de volta dos materiais: `{ cores, realista: { materiais }, materialPorPeca }`, com o que a receita tinha. */
export function materiaisParaReceita(esboco) {
  const cores = {}; const real = {};
  for (const [nome, m] of Object.entries(esboco.materiais ?? {})) {
    const { tipo, cor, declarado, ...resto } = m;
    if (cor) cores[nome] = cor;
    if (declarado !== false) real[nome] = { tipo, ...resto };
  }
  const materialPorPeca = {};
  for (const o of esboco.opcoes ?? []) for (const f of o.formas ?? []) if (f.material) materialPorPeca[f.rotulo ?? f.id] = f.material;
  return { cores, realista: { materiais: real }, materialPorPeca };
}

export function receitaParaEsboco(receita) {
  const formas = []; const recusas = []; const usados = new Set();
  const id = (n) => { const b = n.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').toLowerCase() || 'peca'; let k = b; let i = 2; while (usados.has(k)) k = `${b}_${i++}`; usados.add(k); return k; };
  for (const p of receita.pecas) {
    if (girada(p)) { recusas.push({ peca: p.nome, motivo: `rot ${JSON.stringify(p.rot)}` }); continue; }
    if (p.cortes || p.curva || p.afinar) { recusas.push({ peca: p.nome, motivo: 'cortes, curva ou afinar' }); continue; }
    const base = { id: id(p.nome), rotulo: p.nome, material: p.material ?? receita.material };
    const cor = receita.cores?.[base.material];
    if (cor) base.cor = hex(cor);
    if (p.forma === 'caixa') {
      const d = [0, 1, 2].map((i) => p.max[i] - p.min[i]);
      const f = { ...base, tipo: 'caixa', largura: mm(d[0]), altura: mm(d[2]), profundidade: mm(d[1]), centro: [mm((p.min[0] + p.max[0]) / 2), mm((p.min[2] + p.max[2]) / 2), mm(-(p.min[1] + p.max[1]) / 2)] };
      const ch = (p.chanfro ?? 0) * 1000; const teto = Math.min(f.largura, f.altura, f.profundidade) * 0.2;
      if (ch >= 0.5) f.chanfro = r3(Math.min(ch, teto));
      formas.push(f);
    } else if (p.forma === 'cilindro') {
      const eixo = p.eixo ?? 'z'; const [cx, cy, cz] = p.centro; const h = p.altura; const r = p.raio;
      const eixoE = { x: 'x', y: 'z', z: 'y' }[eixo];
      const c = { x: [cx + h / 2, cy, cz], y: [cx, cy + h / 2, cz], z: [cx, cy, cz + h / 2] }[eixo];
      const centro = [mm(c[0]), mm(c[2]), mm(-c[1])];
      if (p.raio_topo !== undefined && Math.abs(p.raio_topo - r) > 1e-9) {
        formas.push({ ...base, tipo: 'cone', diametro: mm(2 * r), diametroTopo: mm(2 * p.raio_topo), comprimento: mm(h), eixo: eixoE, centro });
        if (eixo === 'y') recusas.push({ peca: p.nome, aviso: 'cone no eixo y da receita: o sentido base e topo fica invertido no esboço, conferir' });
      } else formas.push({ ...base, tipo: 'cilindro', diametro: mm(2 * r), comprimento: mm(h), eixo: eixoE, centro });
    } else if (p.forma === 'prisma') {
      const us = p.perfil.map((q) => q[0]); const vs = p.perfil.map((q) => q[1]);
      const uc = (Math.min(...us) + Math.max(...us)) / 2; const vc = (Math.min(...vs) + Math.max(...vs)) / 2;
      const L = p.ate - p.de; const lc = (p.de + p.ate) / 2;
      if (p.eixo === 'y') formas.push({ ...base, tipo: 'extrusao', eixo: 'z', perfil: p.perfil.map(([a, z]) => [mm(a), mm(z)]), comprimento: mm(L), centro: [mm(uc), mm(vc), mm(-lc)] });
      else formas.push({ ...base, tipo: 'extrusao', eixo: 'x', perfil: p.perfil.map(([a, z]) => [mm(-a), mm(z)]), comprimento: mm(L), centro: [mm(lc), mm(vc), mm(-uc)] });
    } else recusas.push({ peca: p.nome, motivo: `forma ${p.forma}` });
  }
  return { esboco: { materiais: materiaisDaReceita(receita), opcoes: [{ titulo: receita.id, nota: (receita.nota ?? '').slice(0, 200), formas }], vista: 'isometrica' }, recusas };
}
