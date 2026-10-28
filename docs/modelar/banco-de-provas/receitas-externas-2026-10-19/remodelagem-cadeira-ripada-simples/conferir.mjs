#!/usr/bin/env node
/* conferir.mjs — executa a receita de cadeira_ripada_simples pelo executor do repositório e confere: (a) caixa total contra o alvo, (b) simetria esquerda/direita,
   (c) posicionamento de pernas, postes e ripas e contato de cada parte, (d) penetrações não declaradas, (e) faces coplanares que a receita original mantém,
   (f) medidas contra a receita original, com as diferenças intencionais listadas.

   Uso: node conferir.mjs [--receita <arquivo.mjs>]
   Sai com código 1 se qualquer conferência falhar. Milímetro em tudo que é impresso; a comparação usa a tolerância de cada conferência.

   Quadro: o núcleo tem y para cima e z para a frente. A receita original tem z para cima e frente = -y, então a caixa original vai para o núcleo com
   x = x, y = z e z = -y. */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const RAIZ = new URL('../../../../../', import.meta.url);
const { executarReceita } = await import(new URL('src/autoria/executar-receita.js', RAIZ));

const args = process.argv.slice(2);
const valorDe = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : null; };
const caminhoReceita = valorDe('--receita');
const modulo = caminhoReceita
  ? await import(pathToFileURL(resolve(caminhoReceita)).href)
  : await import('./cadeira_ripada_simples.receita.mjs');

const TOL = 0.01;          // mm, para contato, simetria, alinhamento e penetração
const TOL_MEDIDA = 0.5;    // mm, para cada dimensão contra a receita original
const TOL_TOTAL = 1;       // mm, para a caixa total

/* ---------- caixas do resultado ---------- */

const { neutro } = executarReceita(modulo);
const novo = new Map();
for (const fc of neutro.F.values()) {
  for (const v of fc.vs) {
    const p = neutro.V.get(v).map((x) => x * 1000);
    let c = novo.get(fc.parte);
    if (!c) { c = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] }; novo.set(fc.parte, c); }
    for (let k = 0; k < 3; k += 1) { c.min[k] = Math.min(c.min[k], p[k]); c.max[k] = Math.max(c.max[k], p[k]); }
  }
}
const NOMES = [...novo.keys()];
const get = (nome) => {
  const c = novo.get(nome);
  if (!c) throw new Error(`parte ausente: ${nome}`);
  return c;
};

/* ---------- caixas da receita original, no quadro do núcleo ---------- */

const original = JSON.parse(readFileSync(new URL('tools/modelar/fixtures/receita-externa-cadeiras/cadeira_ripada_simples.receita.json', RAIZ), 'utf8'));
const MAPA = {
  pes: 'perna_frente_esq', 'pes.x': 'perna_frente_dir', 'pes.y': 'perna_tras_esq', 'pes.xy': 'perna_tras_dir',
  saia_base: 'saia', assento: 'assento', postes_encosto: 'poste_esq', 'postes_encosto.x': 'poste_dir',
  travessa_alta: 'travessa_alta', travessa_baixa: 'travessa_baixa',
  ripa_1: 'ripa_1', ripa_2: 'ripa_2', ripa_3: 'ripa_3', ripa_4: 'ripa_4', ripa_5: 'ripa_5',
};
const antigo = new Map();
for (const p of original.pecas) {
  const nome = MAPA[p.nome];
  if (!nome) throw new Error(`peça original sem par: ${p.nome}`);
  const [a, b] = [p.min, p.max];
  antigo.set(nome, { min: [a[0] * 1000, a[2] * 1000, -b[1] * 1000], max: [b[0] * 1000, b[2] * 1000, -a[1] * 1000] });
}

/* ---------- helpers ---------- */

const dimsDe = (c) => c.max.map((v, k) => v - c.min[k]);
/* separação com sinal em um eixo: positiva é folga, negativa é sobreposição */
const sep = (a, b, k) => Math.max(a.min[k] - b.max[k], b.min[k] - a.max[k]);
const EIXOS = [0, 1, 2];
const EIXO_NOME = ['x', 'y', 'z'];
const contato = (a, b) => {
  const s = EIXOS.map((k) => sep(a, b, k));
  return EIXOS.some((k) => Math.abs(s[k]) <= TOL && EIXOS.filter((j) => j !== k).every((j) => s[j] < -TOL));
};
const penetracao = (a, b) => {
  const s = EIXOS.map((k) => sep(a, b, k));
  return EIXOS.every((k) => s[k] < -TOL) ? -Math.max(...s) : 0;
};
const sobrepoe2D = (a, b, eixos) => eixos.every((k) => sep(a, b, k) < -TOL);
const fmt = (v) => v.toFixed(2).padStart(9);

/* ---------- conferências ---------- */

const resultados = [];
const registrar = (id, titulo, fn) => {
  try {
    const r = fn();
    resultados.push({ id, titulo, ...r });
  } catch (e) {
    resultados.push({ id, titulo, passa: false, numero: NaN, detalhe: `erro: ${e.message}` });
  }
};

/* (a) caixa total */
registrar('a', 'caixa total contra o alvo (tolerância 1 mm)', () => {
  const min = EIXOS.map((k) => Math.min(...NOMES.map((n) => get(n).min[k])));
  const max = EIXOS.map((k) => Math.max(...NOMES.map((n) => get(n).max[k])));
  const alvo = { min: [-255, 0, -270], max: [255, 1120, 270] };
  const desvios = [...EIXOS.map((k) => Math.abs(min[k] - alvo.min[k])), ...EIXOS.map((k) => Math.abs(max[k] - alvo.max[k]))];
  /* alturas-alvo dos encontros, em y, para a posição absoluta (não só a relativa) das peças */
  const alturas = [
    ['base do assento', get('assento').min[1], 440],
    ['topo do assento', get('assento').max[1], 490],
    ['topo das pernas', get('perna_frente_esq').max[1], 440],
    ['base dos postes', get('poste_esq').min[1], 490],
    ['topo da travessa baixa', get('travessa_baixa').max[1], 530],
    ['base da travessa alta', get('travessa_alta').min[1], 1020],
  ];
  const desvioAltura = Math.max(...alturas.map(([, v, alvoY]) => Math.abs(v - alvoY)));
  const numero = Math.max(...desvios, desvioAltura);
  return {
    passa: numero <= TOL_TOTAL,
    numero,
    detalhe: `x ${min[0].toFixed(2)}..${max[0].toFixed(2)}, y ${min[1].toFixed(2)}..${max[1].toFixed(2)}, z ${min[2].toFixed(2)}..${max[2].toFixed(2)} (alvo x -255..255, y 0..1120, z -270..270); maior desvio da caixa ${Math.max(...desvios).toFixed(2)} mm; alturas: ${alturas.map(([r, v, a]) => `${r} ${v.toFixed(2)} (alvo ${a})`).join(', ')}; maior desvio de altura ${desvioAltura.toFixed(2)} mm`,
  };
});

/* (b) simetria: pares espelhados em x (e as pernas em z), e peças centradas em x = 0 */
const PARES_X = [
  ['perna_frente_esq', 'perna_frente_dir'], ['perna_tras_esq', 'perna_tras_dir'], ['poste_esq', 'poste_dir'],
  ['ripa_1', 'ripa_5'], ['ripa_2', 'ripa_4'],
];
const CENTRADAS_X = ['saia', 'assento', 'travessa_alta', 'travessa_baixa', 'ripa_3'];
const PARES_Z = [['perna_frente_esq', 'perna_tras_esq'], ['perna_frente_dir', 'perna_tras_dir']];
/* desvio de a contra b espelhada no eixo `e`: os limites trocam de sinal nesse eixo e são iguais nos outros */
const desvioEspelho = (a, b, e) => {
  let d = 0;
  for (const k of EIXOS) {
    if (k === e) d = Math.max(d, Math.abs(a.min[k] + b.max[k]), Math.abs(a.max[k] + b.min[k]));
    else d = Math.max(d, Math.abs(a.min[k] - b.min[k]), Math.abs(a.max[k] - b.max[k]));
  }
  return d;
};
registrar('b', 'simetria esquerda/direita (tolerância 0,01 mm)', () => {
  const pares = [
    ...PARES_X.map(([a, b]) => ({ rotulo: `${a} / ${b} (x)`, d: desvioEspelho(get(a), get(b), 0) })),
    ...CENTRADAS_X.map((n) => ({ rotulo: `${n} centrada em x`, d: Math.abs(get(n).min[0] + get(n).max[0]) })),
    ...PARES_Z.map(([a, b]) => ({ rotulo: `${a} / ${b} (z)`, d: desvioEspelho(get(a), get(b), 2) })),
  ];
  const numero = Math.max(...pares.map((p) => p.d));
  const pior = pares.reduce((m, p) => (p.d > m.d ? p : m));
  return {
    passa: numero <= TOL,
    numero,
    detalhe: `${pares.length} pares e peças centradas; maior desvio ${numero.toFixed(4)} mm em ${pior.rotulo}`,
  };
});

/* (c) posicionamento */
const PERNAS = ['perna_frente_esq', 'perna_frente_dir', 'perna_tras_esq', 'perna_tras_dir'];
const RIPAS = ['ripa_1', 'ripa_2', 'ripa_3', 'ripa_4', 'ripa_5'];
registrar('c1', 'topo das quatro pernas na face de baixo do assento (y 440, tolerância 0,01 mm)', () => {
  const ass = get('assento');
  const desvios = PERNAS.map((n) => Math.abs(get(n).max[1] - ass.min[1]));
  const apoio = PERNAS.every((n) => sobrepoe2D(get(n), ass, [0, 2]));
  const numero = Math.max(...desvios);
  return { passa: numero <= TOL && apoio, numero, detalhe: `topo das pernas em y ${PERNAS.map((n) => get(n).max[1].toFixed(2)).join(', ')}; assento em y ${ass.min[1].toFixed(2)}; apoio em x e z: ${apoio ? 'sim' : 'não'}` };
});
registrar('c2', 'base dos dois postes na face de cima do assento (y 490, tolerância 0,01 mm)', () => {
  const ass = get('assento');
  const desvios = ['poste_esq', 'poste_dir'].map((n) => Math.abs(get(n).min[1] - ass.max[1]));
  const numero = Math.max(...desvios);
  return { passa: numero <= TOL, numero, detalhe: `base dos postes em y ${get('poste_esq').min[1].toFixed(2)} e ${get('poste_dir').min[1].toFixed(2)}; assento em y ${ass.max[1].toFixed(2)}` };
});
registrar('c3', 'ripas encostadas na face de cima da travessa baixa e na de baixo da alta (tolerância 0,01 mm)', () => {
  const tb = get('travessa_baixa'); const ta = get('travessa_alta');
  const desvios = RIPAS.flatMap((n) => [Math.abs(get(n).min[1] - tb.max[1]), Math.abs(get(n).max[1] - ta.min[1])]);
  const apoio = RIPAS.every((n) => sobrepoe2D(get(n), tb, [0, 2]) && sobrepoe2D(get(n), ta, [0, 2]));
  const numero = Math.max(...desvios);
  return { passa: numero <= TOL && apoio, numero, detalhe: `ripas de y ${get('ripa_1').min[1].toFixed(2)} a ${get('ripa_1').max[1].toFixed(2)}; travessa baixa termina em y ${tb.max[1].toFixed(2)}; alta começa em y ${ta.min[1].toFixed(2)}; apoio em x e z: ${apoio ? 'sim' : 'não'}` };
});
registrar('c4', 'nenhuma peça flutuando (cada parte toca ao menos outra)', () => {
  const semContato = NOMES.filter((n) => !NOMES.some((m) => m !== n && contato(get(n), get(m))));
  return { passa: semContato.length === 0, numero: semContato.length, detalhe: `partes sem contato: ${semContato.length}${semContato.length ? ` (${semContato.join(', ')})` : ''}` };
});

/* c5: o bisel do assento não pode passar da face externa das pernas nem da dos postes, senão o encontro fica sobre a quina chanfrada */
registrar('c5', 'bisel do assento dentro da face de baixo plana sobre as pernas e os postes (folga em mm, deve ser ≥ 0)', () => {
  const P = modulo.PARAMS;
  const margem = Math.min(P.assento_meia_x - P.perna_x_externo, P.assento_meia_z - P.perna_z_frente, P.assento_meia_z + P.poste_z_tras);
  const folga = margem - P.assento_chanfro;
  return {
    passa: folga >= 0,
    numero: folga,
    detalhe: `margem do assento sobre as pernas e os postes ${margem} mm; bisel ${P.assento_chanfro} mm; folga ${folga} mm`,
  };
});

/* (d) penetração entre peças */
/* EMBUTIDOS: pares que se atravessam de propósito, com o motivo. Vazio: nenhuma penetração é aceita nesta receita. */
const EMBUTIDOS = [];
registrar('d', 'nenhuma peça atravessa outra mais que 0,01 mm, salvo EMBUTIDOS declarados', () => {
  const pen = [];
  for (let i = 0; i < NOMES.length; i += 1) for (let j = i + 1; j < NOMES.length; j += 1) {
    const d = penetracao(get(NOMES[i]), get(NOMES[j]));
    if (d > TOL) pen.push({ a: NOMES[i], b: NOMES[j], d });
  }
  const declarados = new Set(EMBUTIDOS.map((e) => [e.a, e.b].sort().join('|')));
  const naoDeclarados = pen.filter((p) => !declarados.has([p.a, p.b].sort().join('|')));
  const observados = new Set(pen.map((p) => [p.a, p.b].sort().join('|')));
  const fantasmas = EMBUTIDOS.filter((e) => !observados.has([e.a, e.b].sort().join('|')));
  const numero = naoDeclarados.length + fantasmas.length;
  const maior = naoDeclarados.reduce((m, p) => Math.max(m, p.d), 0);
  const lista = naoDeclarados.map((p) => `${p.a} / ${p.b} ${p.d.toFixed(2)} mm`).join('; ');
  return {
    passa: numero === 0,
    numero: maior,
    detalhe: `pares que se atravessam: ${pen.length}; não declarados: ${naoDeclarados.length}${lista ? ` (${lista})` : ''}; EMBUTIDOS declarados sem sobreposição: ${fantasmas.length}`,
  };
});

/* (e) alinhamento: faces que estão no mesmo plano na receita original continuam no mesmo plano */
const facesDe = (mapa) => {
  const faces = [];
  for (const [nome, c] of mapa) for (const k of EIXOS) for (const lado of ['min', 'max']) faces.push({ nome, k, lado, v: c[lado][k] });
  return faces;
};
const facesOriginais = facesDe(antigo);
const pares = [];
for (let i = 0; i < facesOriginais.length; i += 1) for (let j = i + 1; j < facesOriginais.length; j += 1) {
  const f = facesOriginais[i]; const g = facesOriginais[j];
  if (f.nome !== g.nome && f.k === g.k && Math.abs(f.v - g.v) <= TOL) pares.push([f, g]);
}
registrar('e', 'faces coplanares na receita original continuam coplanares (tolerância 0,01 mm)', () => {
  const valorNovo = (f) => get(f.nome)[f.lado][f.k];
  const desvios = pares.map(([f, g]) => Math.abs(valorNovo(f) - valorNovo(g)));
  const numero = Math.max(0, ...desvios);
  const quebrados = pares.filter((_, i) => desvios[i] > TOL).map(([f, g]) => `${f.nome}.${f.lado}${EIXO_NOME[f.k]} / ${g.nome}.${g.lado}${EIXO_NOME[g.k]}`);
  return {
    passa: numero <= TOL,
    numero,
    detalhe: `${pares.length} pares coplanares na original; quebrados: ${quebrados.length}${quebrados.length ? ` (${quebrados.join('; ')})` : ''}`,
  };
});
/* o que o plano pediu e que a original não tem: medido, sem exigir */
const informativos = [
  ['frente das ripas (z) e frente dos postes (z)', get('ripa_3').max[2], get('poste_esq').max[2]],
  ['fundo das ripas (z) e fundo das travessas (z)', get('ripa_3').min[2], get('travessa_alta').min[2]],
  ['laterais externas do assento (x) e das pernas (x)', get('assento').max[0], get('perna_frente_dir').max[0]],
];

/* (f) medidas contra a receita original; diferenças intencionais listadas e exigidas com o valor esperado */
const INTENCIONAIS = [
  ...PERNAS.map((n) => ({ parte: n, eixo: 1, esperado: 440, motivo: 'o topo encosta na face de baixo do assento (y 440); a original tinha y 450 e penetrava 10 mm no assento' })),
  { parte: 'saia', eixo: 0, esperado: 380, motivo: 'a saia cabe entre as pernas (x ±190), sem entrar nelas; a original tinha x ±235 e atravessava as pernas' },
  { parte: 'poste_esq', eixo: 1, esperado: 630, motivo: 'a base do poste fica na face de cima do assento (y 490); a original começava em y 480' },
  { parte: 'poste_dir', eixo: 1, esperado: 630, motivo: 'a base do poste fica na face de cima do assento (y 490); a original começava em y 480' },
];
const usadas = new Set();
registrar('f', 'medidas de cada parte contra a receita original (tolerância 0,5 mm, diferenças listadas)', () => {
  const nao = []; const listadas = []; let maiorOk = 0;
  for (const nome of antigo.keys()) {
    const dn = dimsDe(get(nome)); const dA = dimsDe(antigo.get(nome));
    for (const k of EIXOS) {
      const d = dn[k] - dA[k];
      if (Math.abs(d) <= TOL_MEDIDA) { maiorOk = Math.max(maiorOk, Math.abs(d)); continue; }
      const idx = INTENCIONAIS.findIndex((i) => i.parte === nome && i.eixo === k);
      if (idx < 0 || Math.abs(dn[k] - INTENCIONAIS[idx].esperado) > TOL) { nao.push(`${nome} ${EIXO_NOME[k]}: ${dA[k].toFixed(2)} -> ${dn[k].toFixed(2)}`); continue; }
      usadas.add(idx);
      listadas.push(`${nome} ${EIXO_NOME[k]}: ${dA[k].toFixed(0)} -> ${dn[k].toFixed(0)} (${INTENCIONAIS[idx].motivo})`);
    }
  }
  const fantasmas = INTENCIONAIS.filter((_, i) => !usadas.has(i)).map((i) => `${i.parte} ${EIXO_NOME[i.eixo]}`);
  const numero = nao.length + fantasmas.length;
  return {
    passa: numero === 0,
    numero,
    detalhe: `dimensões não listadas fora da tolerância: ${nao.length}${nao.length ? ` (${nao.join('; ')})` : ''}; maior desvio entre as que conferem ${maiorOk.toFixed(2)} mm; diferenças intencionais listadas: ${listadas.length}; listadas sem efeito: ${fantasmas.length}`,
    listadas,
  };
});

/* ---------- saída ---------- */

console.log('Peças (mm; caixa envolvente da parte, x direita, y cima, z frente):');
for (const n of NOMES) {
  const c = get(n); const d = dimsDe(c);
  console.log(`  ${n.padEnd(18)} x ${fmt(c.min[0])} ${fmt(c.max[0])}  y ${fmt(c.min[1])} ${fmt(c.max[1])}  z ${fmt(c.min[2])} ${fmt(c.max[2])}   dim ${d.map((v) => v.toFixed(1)).join(' x ')}`);
}
const total = EIXOS.map((k) => [Math.min(...NOMES.map((n) => get(n).min[k])), Math.max(...NOMES.map((n) => get(n).max[k]))]);
console.log(`Caixa envolvente total: x ${total[0][0].toFixed(2)}..${total[0][1].toFixed(2)}  y ${total[1][0].toFixed(2)}..${total[1][1].toFixed(2)}  z ${total[2][0].toFixed(2)}..${total[2][1].toFixed(2)}`);
console.log(`Partes: ${NOMES.length}`);
console.log('');
console.log('Conferências:');
for (const r of resultados) {
  const estado = r.passa ? 'PASSA ' : 'FALHA ';
  const num = Number.isNaN(r.numero) ? 'n/d' : r.numero.toFixed(4);
  console.log(`  [${r.id}] ${estado} ${r.titulo}`);
  console.log(`        número: ${num}. ${r.detalhe}`);
}
for (const r of resultados.filter((x) => x.id === 'f')) for (const l of r.listadas) console.log(`        intencional: ${l}`);
console.log('');
console.log('Informativo (o plano pede coplanaridade; a original não a tem, então não é exigida):');
for (const [rotulo, a, b] of informativos) console.log(`  ${rotulo}: ${a.toFixed(2)} e ${b.toFixed(2)} mm, diferença ${Math.abs(a - b).toFixed(2)} mm`);

const falhas = resultados.filter((r) => !r.passa);
console.log('');
console.log(falhas.length === 0 ? 'Todas as conferências passam.' : `Falhas: ${falhas.map((r) => r.id).join(', ')}.`);
process.exitCode = falhas.length === 0 ? 0 : 1;
