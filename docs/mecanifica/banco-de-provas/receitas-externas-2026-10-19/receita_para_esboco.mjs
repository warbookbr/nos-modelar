// Sonda: receita externo (projeto externo) -> .esboco.json do Mecanifica.
// receita: x leste, y norte, z cima, metros, frente = -y.  esboço: y cima, z para a frente, mm.  (x,y,z)->(x, z, -y)*1000
import { readFileSync, writeFileSync } from 'node:fs';

const mm = (v) => Math.round(v * 1e6) / 1e3; // m -> mm, 3 casas
const r3 = (v) => Math.round(v * 1000) / 1000;
const COR = { metal: 'cinza', moldura: 'branco', vidro: 'azul', botao: 'vermelho', base: 'marrom' };

export function traduzir(rec) {
  const formas = []; const recusas = [];
  const usados = new Set();
  const id = (n) => { let b = n.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').toLowerCase() || 'peca'; let k = b, i = 2; while (usados.has(k)) k = `${b}_${i++}`; usados.add(k); return k; };
  for (const p of rec.pecas) {
    if (p.espelhar) recusas.push({ peca: p.nome, motivo: 'espelhar (a receita já vem expandida? não)' });
    const rot = p.rot && p.rot.some((a) => Math.abs(a) > 1e-6);
    if (rot) { recusas.push({ peca: p.nome, motivo: `rot ${JSON.stringify(p.rot)}` }); continue; }
    if (p.cortes || p.curva || p.afinar) { recusas.push({ peca: p.nome, motivo: 'cortes/curva/afinar' }); continue; }
    const rgb = rec.cores?.[p.material ?? rec.material]; const cor = rgb ? '#' + rgb.map((v) => v.toString(16).padStart(2, '0')).join('') : 'cinza';
    const base = { id: id(p.nome), rotulo: p.nome, cor };
    if (p.forma === 'caixa') {
      const d = [0, 1, 2].map((i) => p.max[i] - p.min[i]);
      const f = { ...base, tipo: 'caixa', largura: mm(d[0]), altura: mm(d[2]), profundidade: mm(d[1]), centro: [mm((p.min[0] + p.max[0]) / 2), mm((p.min[2] + p.max[2]) / 2), mm(-(p.min[1] + p.max[1]) / 2)] };
      const ch = (p.chanfro ?? 0) * 1000;
      if (ch >= 0.5 && ch < Math.min(f.largura, f.altura, f.profundidade) * 0.2) f.chanfro = r3(ch); else if (ch >= 0.5) f.chanfro = r3(Math.min(f.largura, f.altura, f.profundidade) * 0.2);
      formas.push(f);
    } else if (p.forma === 'cilindro') {
      const eixo = p.eixo ?? 'z'; const [cx, cy, cz] = p.centro; const h = p.altura; const r = p.raio;
      const rt = p.raio_topo;
      const eixoE = { x: 'x', y: 'z', z: 'y' }[eixo];
      // centro do segmento: a base em `centro`, sobe h ao longo do eixo (na receita, +eixo)
      const c = { x: [cx + h / 2, cy, cz], y: [cx, cy + h / 2, cz], z: [cx, cy, cz + h / 2] }[eixo];
      const ce = [mm(c[0]), mm(c[2]), mm(-c[1])];
      let f;
      if (rt !== undefined && Math.abs(rt - r) > 1e-9) {
        // cone: base no início do eixo do esboço; receita y -> esboço -z inverte o sentido
        f = { ...base, tipo: 'cone', diametro: mm(2 * r), diametroTopo: mm(2 * rt), comprimento: mm(h), eixo: eixoE, centro: ce };
        if (eixo === 'y') recusas.push({ peca: p.nome, aviso: 'cone no eixo y da receita: sentido base/topo invertido no esboço, conferir' });
      } else f = { ...base, tipo: 'cilindro', diametro: mm(2 * r), comprimento: mm(h), eixo: eixoE, centro: ce };
      formas.push(f);
    } else if (p.forma === 'prisma') {
      const pts = p.perfil; const eixo = p.eixo; const us = pts.map((q) => q[0]); const vs = pts.map((q) => q[1]);
      const uc = (Math.min(...us) + Math.max(...us)) / 2; const vc = (Math.min(...vs) + Math.max(...vs)) / 2;
      const L = p.ate - p.de; const lc = (p.de + p.ate) / 2;
      if (eixo === 'y') {
        formas.push({ ...base, tipo: 'extrusao', eixo: 'z', perfil: pts.map(([a, z]) => [mm(a), mm(z)]), comprimento: mm(L), centro: [mm(uc), mm(vc), mm(-lc)] });
      } else {
        // eixo x da receita: plano (y,z) -> esboço eixo x, plano (z,y): u = z_esb = -y_rec
        formas.push({ ...base, tipo: 'extrusao', eixo: 'x', perfil: pts.map(([a, z]) => [mm(-a), mm(z)]), comprimento: mm(L), centro: [mm(lc), mm(vc), mm(-uc)] });
      }
    } else recusas.push({ peca: p.nome, motivo: `forma ${p.forma}` });
  }
  return { esboco: { opcoes: [{ titulo: rec.id, nota: (rec.nota ?? '').slice(0, 200), formas }], vista: 'isometrica' }, recusas };
}

if (process.argv[1].endsWith('receita_para_esboco.mjs')) {
  const [ent, sai] = process.argv.slice(2);
  const { esboco, recusas } = traduzir(JSON.parse(readFileSync(ent, 'utf8')));
  writeFileSync(sai, JSON.stringify(esboco, null, 1));
  console.log(`${esboco.opcoes[0].formas.length} formas, ${recusas.length} recusas/avisos`);
  for (const r of recusas) console.log(' ', JSON.stringify(r));
}
