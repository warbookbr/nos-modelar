/* chapas.js — os blocos das peças de teste neutras da bateria do plano da abertura em qualquer direção: a chapa por grade
 * (uma gaiola de pontos a cada `passo` mm sobre uma altura dada, com espessura e subdivisão), a chapa dobrada por um perfil
 * (uma folha que se dobra sobre si em duas ou três camadas), os contornos de prova (retângulo, polígono) e a receita pronta para a
 * bancada. Nada vem de referência externa; as medidas entram em milímetro e saem em metro, como o `TOPO`. */

export const m = (mm) => mm / 1000;

/** Um contorno de reto em reto, em milímetro na entrada e em metro na saída: `pontos` são [u, v] em ordem, e o último reto volta ao primeiro. */
export function poligonoDeRetas(pontos) {
  const p = pontos.map(([u, v]) => [m(u), m(v)]);
  return { inicio: p[0], trechos: [...p.slice(1), p[0]].map((q) => ({ reto: q })) };
}

/** O retângulo de u0 a u1 e v0 a v1, em milímetro, desenhado em sentido anti-horário. */
export const retangulo = (u0, v0, u1, v1) => poligonoDeRetas([[u0, v0], [u1, v0], [u1, v1], [u0, v1]]);

/** A estrela de `pontas` pontas, de raio de fora `rFora` e de dentro `rDentro`, centrada em [u, v] (mm), com a primeira ponta virada
 *  para +v: o contorno côncavo de bicos. */
export function estrela([u, v], pontas, rFora, rDentro) {
  const p = [];
  for (let k = 0; k < 2 * pontas; k++) {
    const t = Math.PI / 2 + (Math.PI * k) / pontas; const r = k % 2 ? rDentro : rFora;
    p.push([u + r * Math.cos(t), v + r * Math.sin(t)]);
  }
  return poligonoDeRetas(p);
}

/** A grade de `nx` por `nz` pontos a cada `passo` mm, com y = altura(x, z) mm, como gaiola de uma chapa de espessura `espessura` mm
 *  subdividida em `niveis` níveis. `vincos` são { nome, pontos: [[i, j], ...], nitidez } pelos índices da grade. Devolve
 *  { TOPO, passo, nome(i, j), faces }, o `passo` sendo o passo `subdivisao` sem `origemId`. */
export function chapaDeGrade({ prefixo = 'p', nx, nz, passo, altura, espessura = 2, niveis = 2, vincos = [], borda = 'suave' }) {
  const nome = (i, j) => `${prefixo}${i}_${j}`;
  const TOPO = {}; const vertices = [];
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    const x = passo * i, z = passo * j;
    TOPO[nome(i, j)] = [m(x), m(altura(x, z)), m(z)]; vertices.push(nome(i, j));
  }
  const faces = [];
  for (let i = 0; i + 1 < nx; i++) for (let j = 0; j + 1 < nz; j++) faces.push([nome(i, j), nome(i, j + 1), nome(i + 1, j + 1), nome(i + 1, j)]);
  const cantos = [nome(0, 0), nome(nx - 1, 0), nome(nx - 1, nz - 1), nome(0, nz - 1)];
  return {
    TOPO, nome, faces,
    passo: { vertices, faces, cantos, borda, medidas: [...vertices], espessura: m(espessura), niveis, ...(vincos.length ? { vincos: vincos.map((v) => ({ nome: v.nome, pontos: v.pontos.map(([i, j]) => nome(i, j)), nitidez: v.nitidez })) } : {}) },
  };
}

/** A chapa dobrada: a folha cujo perfil, em [x, z] mm, segue `perfil` (uma poligonal com `pontosPorTrecho` pontos em cada trecho) e se
 *  estende por `ny` pontos a cada `passoY` mm em y. É a chapa de uma folha só que passa várias vezes pela mesma reta do eixo z. */
export function chapaDobrada({ prefixo = 'd', perfil, ny, passoY, espessura = 2, niveis = 2 }) {
  const nome = (i, j) => `${prefixo}${i}_${j}`;
  const TOPO = {}; const vertices = [];
  perfil.forEach(([x, z], i) => { for (let j = 0; j < ny; j++) { TOPO[nome(i, j)] = [m(x), m(passoY * j), m(z)]; vertices.push(nome(i, j)); } });
  const faces = [];
  for (let i = 0; i + 1 < perfil.length; i++) for (let j = 0; j + 1 < ny; j++) faces.push([nome(i, j), nome(i, j + 1), nome(i + 1, j + 1), nome(i + 1, j)]);
  const u = perfil.length - 1;
  const cantos = [nome(0, 0), nome(u, 0), nome(u, ny - 1), nome(0, ny - 1)];
  return { TOPO, nome, faces, passo: { vertices, faces, cantos, borda: 'suave', medidas: [...vertices], espessura: m(espessura), niveis } };
}

/** Uma poligonal de perfil em [x, z] mm: os `vertices` ligados por trechos de `n` pontos cada, e as dobras (pontos que são cantos de
 *  `vertices`) trocadas por arcos de quarto de volta a 45 graus: aqui só cantos retos, que a subdivisão arredonda. */
export function perfilPorTrechos(vertices, n) {
  const p = [];
  for (let k = 0; k + 1 < vertices.length; k++) for (let s = 0; s < n; s++) {
    const t = s / n; p.push([vertices[k][0] + (vertices[k + 1][0] - vertices[k][0]) * t, vertices[k][1] + (vertices[k + 1][1] - vertices[k][1]) * t]);
  }
  p.push(vertices[vertices.length - 1]);
  return p;
}

/** A receita da peça de teste, no formato da bancada: `meta`, `TOPO` e `PASSOS`. Com `lentes`, os ids dos passos de abertura cujo pedaço
 *  retirado vira a parte `lente<id>` (substituindo a parte da chapa), para a bancada pintar o vão por parte (`--cores`). */
export function receitaDe(meta, TOPO, PASSOS, { lentes = [], ...extra } = {}) {
  const partes = lentes.map((id) => ['parte', { nome: `lente${id}`, sel: { origem: { op: 'aberturaPorContorno', id, parte: 'lente' } }, substituir: true }]);
  return { meta, PARAMS: {}, TOPO, PASSOS: [...PASSOS, ...partes], ...extra };
}

/** O passo da abertura com os campos que as peças repetem. */
export function passoDaAbertura(origemId, chapa, campos) {
  return ['aberturaPorContorno', { origemId, chapa, lente: true, segmentosArco: 16, limpezaFina: true, ...campos }];
}

/** A seleção da chapa cortada por um passo anterior. */
export const dosPassos = (op, id, parte) => ({ origem: { op, id, ...(parte ? { parte } : {}) } });
