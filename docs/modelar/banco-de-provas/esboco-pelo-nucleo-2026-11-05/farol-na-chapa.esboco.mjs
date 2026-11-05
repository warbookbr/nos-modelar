/* farol-na-chapa.esboco.mjs — gate 1 do plano esboço pelo núcleo: as três opções do farol de 2026-11-05 refeitas pelo esboço 2.0
 * numa chapa curva de teste, com o vão aberto por `aberturaPorContorno`, para mostrar o que o núcleo faz com elas.
 *
 * As opções vêm do arquivo guardado `procedural/pecas/furgao-realista/referencias/farol-dianteiro.esboco.json`, sem cópia: de
 * cada opção entram o farol e o pisca da direita (`farol?D` e `seta?D`), em milímetro na vista frontal do furgão, [x, y]. A chapa
 * é a da abertura de prova (`tools/fixtures/abertura-de-prova/chapa.js`): 800 por 800 mm, 2 mm de espessura, duas curvaturas
 * (raio 600 mm em x e 900 mm em z), subdividida. O contorno é levado à vista de cima da chapa, [x, z], pela translação que põe a
 * ponta de dentro do farol em x 120 e o topo dele em z 300, com y para -z (o topo do farol fica em cima na vista superior da
 * bancada, e a direita em +x).
 *
 * O farol é um vão com a lente recuada 3 mm (a borda da chapa aparece em volta dela). Onde o pisca fica dentro do conjunto (A e
 * B), ele é um segundo vão aberto na lente do farol, com o contorno do pisca cortado pelo farol recuado 6 mm, porque o vão não
 * pode encostar na borda do sólido que corta; onde ele fica embaixo (C), é um segundo vão na chapa, 8 mm abaixo do farol. Nada
 * aqui vem de referência externa; as medidas da borda contra o desenho estão em `medir-farol.mjs`. */
import { readFileSync } from 'node:fs';
import { PLANO as _PLANO, TABELA, derivar, passoDaChapa } from '../../../../tools/fixtures/abertura-de-prova/chapa.js';

const FAROL = JSON.parse(readFileSync(new URL('../../../../procedural/pecas/furgao-realista/referencias/farol-dianteiro.esboco.json', import.meta.url), 'utf8'));
const m = (mm) => mm / 1000;

/** A ponta de dentro do farol vai a x 120 e o topo a z 300; y vira -z. */
export const ENCAIXE = Object.freeze({ x: 120, z: 300 });
export const RECUO_DA_LENTE_MM = 3;
export const MARGEM_DO_PISCA_MM = 6;

const area2 = (p) => p.reduce((s, q, i) => s + q[0] * p[(i + 1) % p.length][1] - p[(i + 1) % p.length][0] * q[1], 0);

/** Corta o polígono convexo `p` pelo polígono convexo `c` recuado `margem` (Sutherland e Hodgman), os dois em [x, z]. */
export function cortarPorConvexo(p, c, margem) {
  const ccw = area2(c) > 0 ? c : [...c].reverse();
  let saida = p;
  for (let i = 0; i < ccw.length; i += 1) {
    const a = ccw[i]; const b = ccw[(i + 1) % ccw.length];
    const t = [b[0] - a[0], b[1] - a[1]]; const l = Math.hypot(...t);
    const n = [t[1] / l, -t[0] / l]; // normal de fora num polígono anti-horário
    const lim = n[0] * a[0] + n[1] * a[1] - margem;
    const entrada = saida; saida = [];
    for (let k = 0; k < entrada.length; k += 1) {
      const q = entrada[k]; const r = entrada[(k + 1) % entrada.length];
      const dq = n[0] * q[0] + n[1] * q[1] - lim; const dr = n[0] * r[0] + n[1] * r[1] - lim;
      if (dq <= 0) saida.push(q);
      if ((dq < 0 && dr > 0) || (dq > 0 && dr < 0)) { const s = dq / (dq - dr); saida.push([q[0] + s * (r[0] - q[0]), q[1] + s * (r[1] - q[1])]); }
    }
  }
  return saida;
}

/** O farol e o pisca da direita de uma opção, levados à vista de cima da chapa, em mm [x, z]. */
export function desenhoDaOpcao(opcao) {
  const farol = opcao.formas.find((f) => /^farol.D$/.test(f.id)).perfil;
  const seta = opcao.formas.find((f) => /^seta.D$/.test(f.id)).perfil;
  const x0 = Math.min(...farol.map((p) => p[0])); const y1 = Math.max(...farol.map((p) => p[1]));
  const levar = ([x, y]) => [x - x0 + ENCAIXE.x, y1 - y + ENCAIXE.z];
  const f = farol.map(levar); const s = seta.map(levar);
  /* o pisca dentro do conjunto quando a caixa dele fica dentro da do farol */
  const dentro = s.every(([x, z]) => z >= Math.min(...f.map((p) => p[1])) - 1 && z <= Math.max(...f.map((p) => p[1])) + 1);
  return { farol: f, seta: dentro ? cortarPorConvexo(s, f, MARGEM_DO_PISCA_MM) : s, setaNaLente: dentro, setaDesenhada: s };
}

/** O contorno fechado de `curva2d`, em metro, por retos. */
export const contornoReto = (pontos) => ({ inicio: pontos[0].map(m), trechos: [...pontos.slice(1), pontos[0]].map((p) => ({ reto: p.map(m) })) });

function opcaoNaChapa(opcao) {
  const d = derivar(TABELA);
  const des = desenhoDaOpcao(opcao);
  const passos = [
    ['subdivisao', { origemId: 1, ...passoDaChapa(TABELA, d) }],
    ['aberturaPorContorno', { origemId: 3, chapa: { origem: { op: 'subdivisao', id: 1 } }, contorno: contornoReto(des.farol), vista: 'y', lente: true, recuoDaLente: m(RECUO_DA_LENTE_MM) }],
  ];
  if (des.setaNaLente) {
    passos.push(['aberturaPorContorno', { origemId: 4, chapa: { origem: { op: 'aberturaPorContorno', id: 3, parte: 'lente' } }, contorno: contornoReto(des.seta), vista: 'y', lente: true, recuoDaLente: m(2) }]);
    passos.push(['parte', { nome: 'chapa', sel: { origem: { op: 'aberturaPorContorno', id: 3 } } }]);
    passos.push(['parte', { nome: 'farol', sel: { origem: { op: 'aberturaPorContorno', id: 4 } } }]);
    passos.push(['parte', { nome: 'pisca', sel: { origem: { op: 'aberturaPorContorno', id: 4, parte: 'lente' } } }]);
  } else {
    passos.push(['aberturaPorContorno', { origemId: 4, chapa: { origem: { op: 'aberturaPorContorno', id: 3 } }, contorno: contornoReto(des.seta), vista: 'y', lente: true, recuoDaLente: m(2) }]);
    passos.push(['parte', { nome: 'chapa', sel: { origem: { op: 'aberturaPorContorno', id: 4 } } }]);
    passos.push(['parte', { nome: 'farol', sel: { origem: { op: 'aberturaPorContorno', id: 3, parte: 'lente' } } }]);
    passos.push(['parte', { nome: 'pisca', sel: { origem: { op: 'aberturaPorContorno', id: 4, parte: 'lente' } } }]);
  }
  return { titulo: opcao.titulo, nota: `${opcao.nota} Na chapa curva: o vão pelo contorno, a lente recuada ${RECUO_DA_LENTE_MM} mm${des.setaNaLente ? ' e o pisca aberto na lente' : ' e o pisca num vão próprio'}.`, passos, topo: d.pontos };
}

export const PLANO_DA_CHAPA = _PLANO;
export const OPCOES_DO_FAROL = FAROL.opcoes;

export default {
  formato: 'esboco-nucleo@1',
  vista: 'superior',
  opcoes: FAROL.opcoes.map(opcaoNaChapa),
};
