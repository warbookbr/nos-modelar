/* sonda-passos.mjs — converte as caixas de um esboço traduzido em passos `cubo` e `parte` da receita do Mecanifica e compara a caixa envolvente da malha executada com a do esboço: `node sonda-passos.mjs <receita> <pasta dos esboços>`. Resultado em RESULTADO.md. */
import { readFileSync } from 'node:fs';
import { executarReceita } from '../../../../src/autoria/executar-receita.js';
import { formasResolvidas } from '../../../../modulos/esboco/src/formas-resolvidas.js';

export function passosDoEsboco(esboco) {
  const dados = formasResolvidas(esboco, 1);
  const passos = []; const recusas = []; let id = 1;
  for (const f of dados.formas) {
    const g = f.geometria;
    const identidade = g.matriz?.every((l, i) => l.every((v, j) => Math.abs(v - (i === j ? 1 : 0)) < 1e-9));
    if (f.tipo !== 'caixa' || !identidade) { recusas.push({ forma: f.id, motivo: `${f.tipo}${identidade ? '' : ' girada'}` }); continue; }
    passos.push(['cubo', { origemId: id, larg: g.largura / 1000, alt: g.altura / 1000, prof: g.profundidade / 1000, em: [g.centro[0] / 1000, g.caixa.min[1] / 1000, g.centro[2] / 1000] }]);
    passos.push(['parte', { nome: f.id.replace(/[^a-z0-9]+/gi, '_').toLowerCase(), sel: { origem: { op: 'cubo', id } } }]);
    id += 1;
  }
  return { passos, recusas, dados };
}
function medir(neutro) {
  const min = [Infinity, Infinity, Infinity]; const max = [-Infinity, -Infinity, -Infinity];
  for (const v of neutro.V.values()) for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], v[k] * 1000); max[k] = Math.max(max[k], v[k] * 1000); }
  return { min, max, tam: max.map((v, k) => Math.round((v - min[k]) * 10) / 10), faces: neutro.F.size };
}
const nome = process.argv[2];
const esboco = JSON.parse(readFileSync(`${process.argv[3]}/${nome}.esboco.json`, 'utf8'));
const { passos, recusas, dados } = passosDoEsboco(esboco);
const receita = { meta: { nome }, PASSOS: passos };
const r = executarReceita(receita);
const m = medir(r.neutro);
// caixa do esboço
const mn = [Infinity, Infinity, Infinity]; const mx = [-Infinity, -Infinity, -Infinity];
for (const f of dados.formas) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], f.geometria.caixa.min[k]); mx[k] = Math.max(mx[k], f.geometria.caixa.max[k]); }
console.log(nome, 'passos', passos.length, 'recusas', recusas.length, JSON.stringify(recusas));
console.log('receita L×A×P', m.tam.join(' × '), ' esboço', mx.map((v, k) => Math.round((v - mn[k]) * 10) / 10).join(' × '), ' faces', m.faces, ' partes', Object.keys(r.neutro.partes ?? {}).length || '?');
