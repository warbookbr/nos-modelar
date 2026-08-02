/* conferir-malha.ts — a conferência única que todo teste de op nova chama.

   POR QUE ELE EXISTE. A op `filete` nasceu com um defeito de forma e passou
   por tudo: os testes dela conferiam que a malha era FECHADA e que a CONTAGEM
   de faces batia, e as duas coisas estavam certas. Mesmo assim o objeto não
   desenhava. A face de entrada tinha um canto EM CIMA da aresta seguinte — um
   bico de espessura zero — e quem reclamou foi o adaptador de Three.js, ao
   tentar triangular a face. Só que nenhum teste do núcleo manda a malha para o
   adaptador, então o defeito só apareceu quando a op encontrou uma peça de
   verdade, uma rodada depois.

   A LEI: malha fechada e contagem certa NÃO provam polígono simples, e nenhuma
   das três prova que a peça desenha. São quatro propriedades, e um teste que
   olha só as duas primeiras passa verde sobre uma peça que não aparece na tela.

   A QUINTA PROPRIEDADE: o triângulo que SAI não pode ser fino a ponto de não
   ter área. Ela existe porque as quatro primeiras não a implicam. Medido: um
   cubo de lado 1 com filete de raio 0,99999999 passa em TODAS as quatro — sem
   órfão, sem bico, casca fechada, adaptador sem lançar — e ainda assim entrega
   4 dos 16 triângulos com área EXATAMENTE 0. Na tela isso é aresta que
   cintila e sombra que fura.

   O piso é RELATIVO ao tamanho da peça, `1e-9 · escala²`, com `escala` = maior
   |v| da peça. Tem de ser relativo porque a mesma malha num parafuso de 6 mm e
   numa carroceria de 4 m tem áreas em ordens de grandeza diferentes. Medido
   sobre o acervo inteiro: o menor triângulo relativo é 7,1092e-6, no
   `_corrimao`, e nenhuma das 27 peças com geometria chega perto. A folga sobre
   o piso é de 7 109 vezes, então o número não é apertado — ele caça o zero e o
   quase-zero, não o triângulo pequeno legítimo.

   COMO USAR (uma linha por teste):
     conferirMalha(n);                        // o mínimo: polígonos + desenha
     conferirMalha(n, { fechada: true });      // e mais: casca sem borda solta

   `fechada` é OPCIONAL de propósito, e isso foi medido: 6 das 28 peças do
   acervo têm borda solta, entre elas a `roda-dianteira`, que está no produto.
   Casca aberta é uma escolha legítima de modelagem (uma chapa, um anteparo, um
   perfil que encosta em vez de colar). Quem é fechada DECLARA que é, e aí a
   conferência cobra; quem não declara não é cobrada. Buraco não abre casca: uma
   chapa com furo passante continua fechada, porque o furo tem parede. */
import { expect } from 'vitest';
// @ts-expect-error — adaptador em JavaScript, exercitado em runtime pelo Vitest.
import { adaptarThree } from '../../src/autoria/adaptar-three.js';

/** distância de um ponto ao SEGMENTO a→b (não à reta): 0 quando o ponto cai em cima. */
function distanciaAoSegmento(p: number[], a: number[], b: number[]) {
  const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const ap = [p[0] - a[0], p[1] - a[1], p[2] - a[2]];
  const l2 = ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2;
  if (l2 < 1e-24) return Math.hypot(ap[0], ap[1], ap[2]);
  const t = Math.max(0, Math.min(1, (ap[0] * ab[0] + ap[1] * ab[1] + ap[2] * ab[2]) / l2));
  return Math.hypot(ap[0] - ab[0] * t, ap[1] - ab[1] * t, ap[2] - ab[2] * t);
}

/** arestas dirigidas que não têm a de volta — a medida de casca aberta. */
export function arestasSemPar(neutro: any) {
  const vistas = new Set<string>();
  for (const f of neutro.F.values()) {
    for (let k = 0; k < f.vs.length; k++) vistas.add(`${f.vs[k]}>${f.vs[(k + 1) % f.vs.length]}`);
  }
  const soltas: string[] = [];
  for (const chave of vistas) {
    const [a, b] = chave.split('>');
    if (!vistas.has(`${b}>${a}`)) soltas.push(chave);
  }
  return soltas;
}

/**
 * Cantos que caem EM CIMA de uma aresta da própria face. Zero é o que se
 * espera; qualquer um é um bico de espessura zero, e é o que quebra na tela.
 * A tolerância é RELATIVA ao tamanho da face, para valer igual num parafuso de
 * 6 mm e numa carroceria de 4 m.
 */
export function cantosSobreAresta(neutro: any) {
  const achados: string[] = [];
  for (const f of neutro.F.values()) {
    const pts: number[][] = f.vs.map((v: number) => neutro.V.get(v));
    if (pts.length < 4) continue;   // triângulo não tem canto sobrando
    const escala = Math.max(1e-9, ...pts.map((p) => Math.hypot(p[0], p[1], p[2])));
    for (let k = 0; k < pts.length; k++) {
      const a = pts[k], b = pts[(k + 1) % pts.length];
      for (let j = 0; j < pts.length; j++) {
        if (j === k || j === (k + 1) % pts.length) continue;
        if (distanciaAoSegmento(pts[j], a, b) < 1e-9 * escala) {
          achados.push(`face ${f.id}: o canto ${j} cai sobre a aresta ${k}`);
        }
      }
    }
  }
  return achados;
}

/** tamanho da peça: o maior |v|. É o denominador do piso de área. */
export function escalaDaPeca(neutro: any) {
  let escala = 0;
  for (const p of neutro.V.values()) escala = Math.max(escala, Math.hypot(p[0], p[1], p[2]));
  return escala;
}

/**
 * Triângulos JÁ EMITIDOS com área abaixo do piso relativo. Recebe a raiz que
 * saiu do adaptador, e não o estado neutro, porque o que importa é o que chega
 * na placa de vídeo: uma face sadia pode virar sliver na triangulação.
 */
export function areasDeTriangulo(raiz: any, escala: number) {
  const piso = 1e-9 * escala * escala;
  const abaixo: string[] = [];
  let menor = Infinity;
  raiz.traverse((obj: any) => {
    if (!obj.isMesh) return;
    const p = obj.geometry.getAttribute('position');
    for (let k = 0; k < p.count; k += 3) {
      const ax = p.getX(k), ay = p.getY(k), az = p.getZ(k);
      const ux = p.getX(k + 1) - ax, uy = p.getY(k + 1) - ay, uz = p.getZ(k + 1) - az;
      const vx = p.getX(k + 2) - ax, vy = p.getY(k + 2) - ay, vz = p.getZ(k + 2) - az;
      const area = 0.5 * Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx);
      if (area < menor) menor = area;
      if (area < piso) abaixo.push(`${obj.name}: triângulo ${k / 3} com área ${area.toExponential(3)}`);
    }
  });
  return { piso, menor, abaixo };
}

export function conferirMalha(neutro: any, { fechada = false, rotulo = 'a malha' } = {}) {
  expect(neutro.orfaos.map((o: any) => `${o.op}: ${o.motivo}`), `${rotulo}: órfãos`).toEqual([]);
  expect(cantosSobreAresta(neutro), `${rotulo}: polígono com bico de espessura zero`).toEqual([]);
  if (fechada) {
    expect(arestasSemPar(neutro), `${rotulo}: casca declarada FECHADA, mas com borda solta`).toEqual([]);
  }

  /* e por fim a prova que faltava: a malha atravessa o adaptador. Ele é quem
     triangula, e é quem reclama do que a conta não vê. */
  const { raiz, estatisticas } = adaptarThree(neutro, { nome: rotulo });
  let cantos = 0;
  raiz.traverse((obj: any) => {
    if (!obj.isMesh) return;
    const p = obj.geometry.getAttribute('position');
    const n = obj.geometry.getAttribute('normal');
    expect(n.count, `${rotulo}/${obj.name}: normal e posição com contagens diferentes`).toBe(p.count);
    expect(p.count % 3, `${rotulo}/${obj.name}: contagem de cantos não é múltipla de 3`).toBe(0);
    cantos += p.count;
    for (let k = 0; k < p.count; k++) {
      const m = Math.hypot(n.getX(k), n.getY(k), n.getZ(k));
      if (!Number.isFinite(p.getX(k)) || !Number.isFinite(p.getY(k)) || !Number.isFinite(p.getZ(k))) {
        throw new Error(`${rotulo}/${obj.name}: posição não finita no canto ${k}`);
      }
      if (!(Math.abs(m - 1) < 1e-3)) throw new Error(`${rotulo}/${obj.name}: normal de módulo ${m} no canto ${k}`);
    }
  });
  expect(estatisticas.triangulos, `${rotulo}: a contagem de triângulos não bate com o buffer`).toBe(cantos / 3);
  if (neutro.F.size > 0) expect(cantos, `${rotulo}: não saiu triângulo nenhum`).toBeGreaterThan(0);

  if (neutro.F.size > 0) {
    const { abaixo } = areasDeTriangulo(raiz, escalaDaPeca(neutro));
    expect(abaixo, `${rotulo}: triângulo(s) sem área — sliver que cintila na tela`).toEqual([]);
  }
}
