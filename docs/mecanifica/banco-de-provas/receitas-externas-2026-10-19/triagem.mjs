/* Triagem das receitas do externo por família candidata, sem modelar nada: `node triagem.mjs <pasta de receitas expandidas> > triagem.md`.
   Mede a caixa envolvente aproximada (peças sem giro; o cilindro entra pela caixa do eixo), conta peças e recusas do tradutor, e marca a família do
   Mecanifica que já cobre o grupo ou a que falta. */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { receitaParaEsboco } from '../../../../tools/mecanifica/receita-externa.mjs';

const MARCAS = /fabricante_a|fabricante_b|fabricante_c|fabricante_d|fabricante_e|fabricante_f|fabricante_g|fabricante_h/;
const GRUPOS = [
  [/^cadeira_/, 'cadeira', 'família nova (cadeira)'],
  [/^(balcao_|mesa_)/, 'balcão e mesa', '`movel-de-caixa` (opção de balcão de bancada e canto)'],
  [/^(fogao_|fogao_)/, 'fogão e forno', '`aparelho-de-caixa` (perfil forninho-eletrico cobre o forno; fogão com bocas pede opção)'],
  [/^(geladeira_|geladeira_|congelador_)/, 'geladeira e congelador', '`aparelho-de-caixa` com opção de duas portas, ou família nova'],
  [/^(microondas_)/, 'micro-ondas', '`aparelho-de-caixa` (perfil micro-ondas)'],
  [/^(lava_loucas_)/, 'lava-louças', '`aparelho-de-caixa` (perfil lava-loucas-compacta)'],
  [/^(lavadora_|lavadora_)/, 'máquina de lavar', '`aparelho-de-caixa` com opção de porta redonda'],
  [/^televisao_|^computador_|^radio_/, 'eletrônico', '`aparelho-de-caixa` com tela no lugar da janela'],
  [/^(pia_|sanitario_)/, 'louça sanitária', 'família nova (louça), ou fora'],
];
const grupoDe = (n) => GRUPOS.find(([re]) => re.test(n)) ?? [null, 'solto', 'sem família: decidir'];

function caixa(r) {
  const min = [Infinity, Infinity, Infinity]; const max = [-Infinity, -Infinity, -Infinity];
  const ponto = (p) => p.forEach((v, i) => { min[i] = Math.min(min[i], v); max[i] = Math.max(max[i], v); });
  for (const p of r.pecas) {
    if (p.forma === 'caixa') { ponto(p.min); ponto(p.max); } else if (p.forma === 'cilindro') {
      const e = { x: 0, y: 1, z: 2 }[p.eixo ?? 'z']; const a = [...p.centro]; const b = [...p.centro]; b[e] += p.altura;
      for (const q of [a, b]) for (let i = 0; i < 3; i++) { const rr = i === e ? 0 : p.raio; min[i] = Math.min(min[i], q[i] - rr); max[i] = Math.max(max[i], q[i] + rr); }
    }
  }
  return max.map((v, i) => Math.round((v - min[i]) * 1000)); // x largura, y profundidade, z altura, em mm
}

const pasta = process.argv[2];
const linhas = readdirSync(pasta).filter((f) => f.endsWith('.json')).sort().map((f) => {
  const r = JSON.parse(readFileSync(join(pasta, f), 'utf8'));
  const { recusas } = receitaParaEsboco(r);
  const [, grupo, familia] = grupoDe(r.id);
  const [l, p, a] = caixa(r);
  return { id: r.id, grupo, familia, pecas: r.pecas.length, recusas: recusas.filter((x) => x.motivo).length, l, p, a, marca: MARCAS.test(r.id) };
});
console.log('# Triagem das 66 receitas por família candidata\n');
console.log('Medidas aproximadas em milímetro (largura × profundidade × altura, peças sem giro). A coluna "marca" marca o objeto cujo nome carrega marca ou fabricante: ele só entra com nome neutro.\n');
const porGrupo = Map.groupBy(linhas, (x) => x.grupo);
console.log('| Grupo | Receitas | Peças (mediana) | Recusas | Família candidata |\n|---|---|---|---|---|');
for (const [g, v] of [...porGrupo].sort((a, b) => b[1].length - a[1].length)) {
  const ps = v.map((x) => x.pecas).sort((a, b) => a - b);
  console.log(`| ${g} | ${v.length} | ${ps[Math.floor(ps.length / 2)]} | ${v.reduce((s, x) => s + x.recusas, 0)} | ${v[0].familia} |`);
}
console.log('\n## Por receita\n\n| Receita | Grupo | Peças | Recusas | L × P × A (mm) | Marca |\n|---|---|---|---|---|---|');
for (const x of linhas) console.log(`| ${x.id} | ${x.grupo} | ${x.pecas} | ${x.recusas} | ${x.l} × ${x.p} × ${x.a} | ${x.marca ? 'sim' : ''} |`);
