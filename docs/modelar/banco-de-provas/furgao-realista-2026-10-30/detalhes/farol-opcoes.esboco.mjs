/* farol-opcoes.esboco.mjs — três opções para o que se vê por dentro do farol dianteiro do furgão realista (2026-11-12), numa chapa
 * da frente de prova, em mm, para a pessoa escolher.
 *
 * Em disputa: o interior atrás da lente (refletor e lâmpada). Igual nas três: o contorno do farol esquerdo (+x) da TABELA do
 * furgão (`derivarFarois`, trapézio de 410 mm de base por 240 de altura, lado de dentro vertical, cantos de raio 45) aberto numa
 * chapa por `aberturaPorContorno` na vista z, a lente recuada 3 mm, lisa e transparente, a aba de 20 mm e o aro cinza de 6 mm de
 * cada lado da borda, e a carcaça escura por trás (parede de 4 mm em volta, a 10 mm da borda, e fundo). A chapa é um pedaço da
 * frente, de x 400 a 940 e y 780 a 1140, com a leve curva em x da frente do furgão (raio 4000 mm); a face de fora em z 0 no meio.
 *
 * Os refletores são cascas de 2,5 mm por `lathe` em torno de z, parábolas abertas para +z, com a borda em z -18. A: uma concha de
 * 100 mm de raio, a lâmpada no centro. B: duas conchas (84 e 78 mm) lado a lado, farol baixo e alto, e a lâmpada de posição pequena
 * num copinho no canto de baixo de fora. C: um projetor (tubo escuro e lente de vidro abaulada) dentro de uma concha de 92 mm, e a
 * faixa de luz de posição ao longo da borda de baixo.
 *
 * Os materiais não cabem no esboço (a forma só declara `cor` lisa): `MATERIAL_DAS_PARTES` diz, por nome de parte, o material do
 * furgão, e `farol-opcoes.capturar.mjs` o aplica na captura. `npm run esboco:nucleo -- <este arquivo>` mostra as mesmas formas com
 * uma cor por parte. A lente transparente é o vidro do furgão, sem o relevo de prismas das lentes da receita. */
import { TABELA } from '../../../../../procedural/pecas/furgao-realista/receita.js';
import { derivarFarois, contornoPorRetos } from '../../../../../procedural/pecas/furgao-realista/receita/farol.js';

const [FAROL] = derivarFarois(TABELA);
const C0 = FAROL.farol; // [x, y] em mm, anti-horário
const R0 = TABELA.farol_raio;

/* ---------- a chapa ---------- */
const XS = [0, 1, 2, 3, 4, 5, 6].map((i) => 400 + 90 * i);
const YS = [0, 1, 2, 3, 4].map((j) => 780 + 90 * j);
const RAIO_CURVA_X = 4000;
const nomeP = (i, j) => `p${i}_${j}`;
const TOPO = {};
for (let i = 0; i < XS.length; i += 1) for (let j = 0; j < YS.length; j += 1) TOPO[nomeP(i, j)] = [XS[i], YS[j], -((XS[i] - 670) ** 2) / (2 * RAIO_CURVA_X)];
const FACES = [];
for (let i = 0; i + 1 < XS.length; i += 1) for (let j = 0; j + 1 < YS.length; j += 1) FACES.push([nomeP(i, j), nomeP(i + 1, j), nomeP(i + 1, j + 1), nomeP(i, j + 1)]);
const CANTOS = [nomeP(0, 0), nomeP(XS.length - 1, 0), nomeP(XS.length - 1, YS.length - 1), nomeP(0, YS.length - 1)];

/** O polígono convexo anti-horário encolhido `d` para dentro (cada lado anda `d` pela normal e os vizinhos se encontram). */
function encolher(poly, d) {
  const n = poly.length;
  const un = (a) => { const l = Math.hypot(a[0], a[1]); return [a[0] / l, a[1] / l]; };
  const retas = poly.map((p, k) => { const q = poly[(k + 1) % n]; const t = un([q[0] - p[0], q[1] - p[1]]); return { p: [p[0] - t[1] * d, p[1] + t[0] * d], t }; });
  const cz = (a, b) => a[0] * b[1] - a[1] * b[0];
  return poly.map((_, k) => {
    const a = retas[(k - 1 + n) % n]; const b = retas[k];
    const s = cz([b.p[0] - a.p[0], b.p[1] - a.p[1]], b.t) / cz(a.t, b.t);
    return [a.p[0] + a.t[0] * s, a.p[1] + a.t[1] * s];
  });
}
/** O contorno do farol encolhido `d`, com os cantos concordados no raio `R0 - d`, no plano [u, v] de uma extrusão em z (v = -y). */
const contornoEncolhido = (d) => {
  const pts = encolher(C0, d).map(([x, y]) => [x, -y]);
  return { contorno: contornoPorRetos(pts, (x) => x, R0 - d) };
};
/** O centro da caixa do farol encolhido `d` e arredondado no raio `R0 - d`: o contorno arredondado é o polígono encolhido `R0` somado a um disco de raio `R0 - d`. */
const centroDoContorno = (d) => {
  const n = encolher(C0, R0);
  const xs = n.map((p) => p[0]); const ys = n.map((p) => p[1]);
  const r = R0 - d;
  return { cx: (Math.min(...xs) - r + Math.max(...xs) + r) / 2, cy: (Math.min(...ys) - r + Math.max(...ys) + r) / 2 };
};

/* ---------- os passos da chapa, da lente, da aba e do aro ---------- */
const ID_CHAPA = 1; const ID_VAO = 3; const ID_ABA = 4; const ID_ARO = 5;
const VAO = { op: 'aberturaPorContorno', id: ID_VAO };
export const SELECAO_DAS_PARTES = Object.freeze({
  chapa: { origem: { ...VAO } },
  lente: { origem: { ...VAO, parte: 'lente' } },
  aba: { origem: { op: 'friso', id: ID_ABA } },
  aro: { origem: { op: 'friso', id: ID_ARO } },
});
const perfilDoAro = [[-1, -TABELA.farol_aro_fundo], [1, -TABELA.farol_aro_fundo], [1, 0.15 * TABELA.farol_aro_altura], [0.67, TABELA.farol_aro_altura], [-0.67, TABELA.farol_aro_altura], [-1, 0.15 * TABELA.farol_aro_altura]]
  .map(([u, v]) => [u * TABELA.farol_aro_meia_largura, v]);
const PASSOS_DA_CHAPA = [
  ['subdivisao', { origemId: ID_CHAPA, vertices: Object.keys(TOPO), faces: FACES, cantos: CANTOS, borda: 'suave', medidas: Object.keys(TOPO), espessura: 2, niveis: 2 }],
  ['aberturaPorContorno', { origemId: ID_VAO, chapa: { origem: { op: 'subdivisao', id: ID_CHAPA } }, contorno: contornoPorRetos(C0, (x) => x, R0), vista: 'z', sentido: '+', lente: true, recuoDaLente: TABELA.farol_recuo_lente, limpezaFina: true }],
  ['friso', { origemId: ID_ABA, superficie: VAO, linha: { nome: 'abaVaoFarol' }, aba: { largura: TABELA.aba_vao_largura, angulo: TABELA.aba_vao_angulo, raio: TABELA.aba_vao_raio } }],
  ['friso', { origemId: ID_ARO, superficie: VAO, linha: { nome: 'aroFarol' }, perfil: perfilDoAro }],
  ...Object.entries(SELECAO_DAS_PARTES).map(([nome, sel]) => ['parte', { nome, sel }]),
];

/* o aro é um friso simétrico sobre a borda do vão: entra 1,9 mm na chapa e cobre a borda da lente e a aba, como na receita */
const CONTATOS_DO_VAO = [
  { par: ['aba', 'aro'], relacao: 'atravessa', motivo: 'o aro cobre a borda onde a aba nasce' },
  { par: ['aba', 'lente'], relacao: 'atravessa', motivo: 'a lente recuada fica dentro da perna da aba' },
  { par: ['aro', 'chapa'], relacao: 'atravessa', motivo: 'o aro entra 1,9 mm na chapa' },
  { par: ['aro', 'lente'], relacao: 'atravessa', motivo: 'o aro cobre 6 mm da borda da lente' },
];

/* ---------- as formas comuns: a carcaça escura por trás ---------- */
const Z_BORDA = -18; // a borda de todos os refletores
const Z_PAREDE_TOPO = -12;
const PAREDE_FORA = 10; const PAREDE_DENTRO = 14;
const carcaca = (zFundo) => {
  const { cx, cy } = centroDoContorno(PAREDE_FORA);
  const altura = Z_PAREDE_TOPO - zFundo;
  return [
    { id: 'carcacaParede', op: 'extrusao', args: { eixo: 'z', altura, perfil: contornoEncolhido(PAREDE_FORA), furos: [contornoEncolhido(PAREDE_DENTRO)] }, centro: [cx, cy, (Z_PAREDE_TOPO + zFundo) / 2] },
    { id: 'carcacaFundo', op: 'extrusao', args: { eixo: 'z', altura: 6, perfil: contornoEncolhido(PAREDE_FORA) }, centro: [cx, cy, zFundo - 3], contato: { carcacaParede: 'encosta' } },
  ];
};

/* ---------- peças de revolução em torno de z ---------- */
const ESPESSURA = 2.5;
const N_PERFIL = 16;
/** Concha parabólica de raio `r` e fundura `d`, aberta para +z, com a borda em `zBorda` e a parede de 2,5 mm. */
function concha(id, cx, cy, r, d, zBorda = Z_BORDA, extra = {}) {
  const zV = zBorda - d;
  const ks = Array.from({ length: N_PERFIL + 1 }, (_, k) => k);
  const fundo = ks.map((k) => [r * (k / N_PERFIL), d * (k / N_PERFIL) ** 2 - ESPESSURA]);
  const frente = [...ks].reverse().map((k) => [r * (k / N_PERFIL), d * (k / N_PERFIL) ** 2]);
  return { id, op: 'lathe', args: { eixo: 'z', lados: 72, perfil: [...fundo, ...frente] }, centro: [cx, cy, zV + (d - ESPESSURA) / 2], ...extra };
}
/** Revolução de perfil [raio, ao longo de z] com a base em `zBase`. */
const revolucao = (id, cx, cy, zBase, perfil, extra = {}) => {
  const alt = Math.max(...perfil.map((p) => p[1])); const baixo = Math.min(...perfil.map((p) => p[1]));
  return { id, op: 'lathe', args: { eixo: 'z', lados: 36, perfil }, centro: [cx, cy, zBase + (alt + baixo) / 2], ...extra };
};
const bulbo = (r, c) => [[0, 0], [r * 0.55, 0], [r * 0.55, c * 0.16], [r, c * 0.34], [r, c * 0.78], [r * 0.7, c * 0.94], [0, c]];
const tampinha = (r, c) => [[0, 0], [r * 0.62, 0], [r * 0.62, c * 0.08], [r * 0.36, c * 0.24], [0, c * 0.28]];
const soquete = (id, cx, cy, zV, r, alt = 16) => ({ id, op: 'cilindro', args: { raio: r, altura: alt, eixo: 'z', lados: 32 }, centro: [cx, cy, zV + alt / 2 - 4] });

/* ---------- as opções ---------- */
const Y_MEIO = (TABELA.farol_y_base + TABELA.farol_y_topo) / 2;

function opcaoA() {
  const cx = 648; const cy = Y_MEIO; const r = 100; const d = 74; const zV = Z_BORDA - d;
  return {
    titulo: 'A: um refletor em concha',
    nota: 'Uma concha cromada de 200 mm com a lâmpada no centro, na ponta do soquete, e a tampinha metálica de frente: o farol comum de furgão de trabalho.',
    formas: [
      ...carcaca(zV - ESPESSURA - 6),
      concha('refletor', cx, cy, r, d, Z_BORDA, { contato: { carcacaFundo: 'folga' } }),
      { ...soquete('soquete', cx, cy, zV, 14), contato: { refletor: 'atravessa' } },
      { ...revolucao('lampada', cx, cy, zV + 12, bulbo(13, 46)), contato: { soquete: 'encosta' } },
      { ...revolucao('tampinha', cx, cy, zV + 12 + 46, tampinha(13, 8)), contato: { lampada: 'encosta' } },
    ],
  };
}

function opcaoB() {
  const d = 58; const zV = Z_BORDA - d; const cy = Y_MEIO;
  const baixo = { cx: 560, r: 84 }; const alto = { cx: 730, r: 78 };
  const pos = { cx: 796, cy: 880, r: 20, d: 14 };
  const zVp = Z_BORDA - pos.d;
  return {
    titulo: 'B: dois refletores',
    nota: 'Duas conchas cromadas lado a lado, farol baixo (84 mm de raio) e alto (78), cada uma com a sua lâmpada, e a lâmpada de posição pequena num copinho no canto de baixo de fora.',
    formas: [
      ...carcaca(zV - ESPESSURA - 6),
      concha('refletorBaixo', baixo.cx, cy, baixo.r, d, Z_BORDA, { contato: { carcacaFundo: 'folga' } }),
      { ...soquete('soqueteBaixo', baixo.cx, cy, zV, 12), contato: { refletorBaixo: 'atravessa' } },
      { ...revolucao('lampadaBaixo', baixo.cx, cy, zV + 12, bulbo(11, 40)), contato: { soqueteBaixo: 'encosta' } },
      { ...revolucao('tampinhaBaixo', baixo.cx, cy, zV + 12 + 40, tampinha(11, 7)), contato: { lampadaBaixo: 'encosta' } },
      concha('refletorAlto', alto.cx, cy, alto.r, d, Z_BORDA, { contato: { carcacaFundo: 'folga' } }),
      { ...soquete('soqueteAlto', alto.cx, cy, zV, 12), contato: { refletorAlto: 'atravessa' } },
      { ...revolucao('lampadaAlto', alto.cx, cy, zV + 12, bulbo(11, 40)), contato: { soqueteAlto: 'encosta' } },
      { ...revolucao('tampinhaAlto', alto.cx, cy, zV + 12 + 40, tampinha(11, 7)), contato: { lampadaAlto: 'encosta' } },
      concha('refletorPosicao', pos.cx, pos.cy, pos.r, pos.d, Z_BORDA, { contato: { poste: 'atravessa' } }),
      { id: 'poste', op: 'cilindro', args: { raio: 9, altura: (zVp - ESPESSURA) - (zV - ESPESSURA - 6) + 3, eixo: 'z', lados: 24 }, centro: [pos.cx, pos.cy, ((zVp - ESPESSURA) + (zV - ESPESSURA - 6)) / 2 + 1.5], contato: { carcacaFundo: 'encosta' } },
      { ...revolucao('lampadaPosicao', pos.cx, pos.cy, zVp + 2, bulbo(5.5, 14)), contato: { refletorPosicao: 'folga' } },
    ],
  };
}

function opcaoC() {
  const cx = 650; const cy = 968; const r = 92; const d = 60; const zV = Z_BORDA - d;
  const zFundo = zV - ESPESSURA - 6;
  const tubo = { raio: 46, altura: 36 };
  return {
    titulo: 'C: projetor e faixa de luz',
    nota: 'Um projetor redondo, com a lente de vidro abaulada na boca de um tubo escuro, dentro de uma concha cromada de 184 mm, e a faixa de luz de posição ao longo da borda de baixo.',
    formas: [
      ...carcaca(zFundo),
      concha('refletor', cx, cy, r, d, Z_BORDA, { contato: { carcacaFundo: 'folga' } }),
      { id: 'tuboProjetor', op: 'cilindro', args: { raio: tubo.raio, altura: tubo.altura, eixo: 'z', lados: 48 }, centro: [cx, cy, zV + tubo.altura / 2 - 6], contato: { refletor: 'atravessa' } },
      { ...revolucao('lenteProjetor', cx, cy, zV - 6 + tubo.altura, [[0, 0], [41, 0], [40, 3], [34, 9], [22, 14], [0, 16]]), contato: { tuboProjetor: 'encosta' } },
      { id: 'suporteDaFaixa', op: 'cubo', args: { larg: 285, alt: 9, prof: Z_BORDA - 6 - zFundo }, centro: [662, 863, (Z_BORDA - 6 + zFundo) / 2], contato: { carcacaFundo: 'encosta', carcacaParede: 'folga' } },
      { id: 'faixaDeLuz', op: 'chamferBox', args: { larg: 285, alt: 9, prof: 6, chanfro: 2 }, centro: [662, 863, Z_BORDA - 3], contato: { suporteDaFaixa: 'encosta', refletor: 'folga' } },
    ],
  };
}

/** O material do furgão de cada parte, por nome: a captura (`farol-opcoes.capturar.mjs`) o aplica, porque o esboço só aceita `cor`. */
export const MATERIAL_DAS_PARTES = [
  [/^chapa$/, 'azul'],
  [/^lente$/, 'vidroDoFarol'],
  [/^(aba|aro)$/, 'aroCinza'],
  [/^(carcaca|suporte|tuboProjetor|poste)/, 'plasticoLiso'],
  [/^refletor/, 'refletor'],
  [/^(lampada|faixaDeLuz)/, 'lampada'],
  [/^tampinha/, 'tampinha'],
  [/^soquete/, 'acoEscuro'],
  [/^lenteProjetor$/, 'vidroDoFarol'],
];
export const materialDaParte = (nome) => MATERIAL_DAS_PARTES.find(([re]) => re.test(nome))?.[1] ?? null;

export default {
  formato: 'esboco-nucleo@1',
  vista: 'frontal',
  opcoes: [opcaoA(), opcaoB(), opcaoC()].map((o) => ({ ...o, passos: PASSOS_DA_CHAPA, topo: TOPO, contatos: CONTATOS_DO_VAO })),
};
