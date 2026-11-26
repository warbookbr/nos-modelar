/* prova-da-guarda.ts — o que os testes da guarda da chapa do `aberturaPorContorno` repartem (plano
   `docs/modelar/planos/2026-11-26-operacoes-repartidas-entre-nucleos.md`, fatia 2): a chapa de prova, a execução com passos de prova
   que recebem o `st`, e a comparação do índice guardado com um montado do zero. Os testes ficam em
   `procedural/nucleo/operacoes/abertura-por-contorno-guarda*.test.ts`. Nada vem de referência externa. */
// @ts-expect-error — núcleo em JavaScript.
import { REGISTRO_OPERACOES, neutroCanonico, nucleo } from '../../../procedural/nucleo/entrada.js';
// @ts-expect-error — núcleo em JavaScript.
import { GUARDA_DA_CHAPA, chapaGuardada, classificadorDeParede, indiceDaChapa } from '../../../procedural/nucleo/operacoes/abertura-por-contorno.js';
// @ts-expect-error — peça de teste em JavaScript.
import { domo } from '../aberturas-em-teste/chapa-grande.js';
// @ts-expect-error — peça de teste em JavaScript.
import { chapaDeGrade, dosPassos, passoDaAbertura, retangulo } from '../aberturas-em-teste/chapas.js';

export { GUARDA_DA_CHAPA, dosPassos, retangulo };
export const A = retangulo(120, 120, 300, 300);
export const B = retangulo(430, 400, 620, 620);
export const C = retangulo(430, 120, 600, 280);
export const D = retangulo(120, 430, 300, 620);

/** A cúpula de 770 por 770 mm e 2 mm de espessura. Com três níveis tem 6 mil faces, acima do piso do recorte da vizinhança (o
 *  classificador de parede roda e a grade do índice existe); com menos, a booleana vê a chapa inteira (2 mil faces com dois níveis, 500 com um). `dy` (mm) a abaixa, para
 *  duas chapas na mesma peça não se tocarem. */
export function chapa({ prefixo = 'p', origemId = 1, niveis = 3, dy = 0 } = {}) {
  const c = niveis >= 3
    ? chapaDeGrade({ prefixo, nx: 8, nz: 8, passo: 110, altura: (x: number, z: number) => domo(x, z) + dy, niveis })
    : chapaDeGrade({ prefixo, nx: 9, nz: 9, passo: 96, altura: (x: number, z: number) => domo(x, z) + dy, niveis });
  return { TOPO: c.TOPO, subdivisao: ['subdivisao', { origemId, ...c.passo }] };
}

/** O corte de um vão sem lente, na vista y. */
export const corte = (origemId: number, sel: any, contorno: any, campos: any = {}) => passoDaAbertura(origemId, sel, { vista: 'y', contorno, lente: false, ...campos });
/** O passo que um teste troca por uma função de prova (`noPasso`): um `transladar` de zero, que sozinho não muda nada. */
export const passoDeProva = (origemId = 2) => ['transladar', { d: [0, 0, 0], sel: dosPassos('aberturaPorContorno', origemId) }];

export type Conta = { montados: number; reaproveitados: number; facesRefeitas: number; vagas: number };

/** Roda os passos pelo núcleo. `noPasso` troca a função do `transladar` do passo de índice dado por uma de prova, que recebe o `st`
 *  (o passo fica fora das declarações de escrita do núcleo, e a procedência dele sai da conta completa). `semGuarda` apaga a guarda
 *  antes de cada corte e o chama por uma função trocada, que a operação não reaproveita: cada corte monta o índice do zero. `opcoes`
 *  vão ao núcleo (`leitura`, `retrato`). */
export function rodar(TOPO: any, PASSOS: any[], { noPasso = new Map<number, (st: any, i: number) => void>(), semGuarda = false, opcoes = {} as any } = {}) {
  let visto: any = null;
  const registro = {
    ...REGISTRO_OPERACOES,
    resolver(...argumentos: any[]) {
      const r = REGISTRO_OPERACOES.resolver(...argumentos);
      if (r?.nome === 'transladar') return { ...r, executar: (st: any, args: any, i: number) => { visto = st; const prova = noPasso.get(i); return prova ? prova(st, i) : r.executar(st, args, i); } };
      if (r?.nome === 'aberturaPorContorno' && semGuarda) return { ...r, executar: (st: any, args: any, i: number) => { visto = st; delete st[GUARDA_DA_CHAPA]; return r.executar(st, args, i); } };
      if (r?.nome === 'subdivisao') return { ...r, executar: (st: any, args: any, i: number) => { visto = st; return r.executar(st, args, i); } };
      return r;
    },
  };
  const neutro = nucleo(PASSOS, {}, TOPO, {}, null, [], { registroOperacoes: registro, ...opcoes });
  const guarda = visto?.[GUARDA_DA_CHAPA];
  const conta: Conta | null = guarda ? { montados: guarda.montados, reaproveitados: guarda.reaproveitados, facesRefeitas: guarda.facesRefeitas, vagas: guarda.chapas.length } : null;
  return { neutro, conta, json: JSON.stringify(neutroCanonico(neutro)), aberturas: JSON.stringify(neutro.aberturas) };
}

/** As faces da chapa que o corte de `origemId` deixou, em ordem crescente, como o corte seguinte as recebe. */
export const facesDoCorte = (st: any, origemId: number) => st.origens.get(origemId).at(-1).faces as number[];
export const verticesDasFaces = (st: any, faces: number[]) => [...new Set(faces.flatMap((f) => st.F.get(f).vs as number[]))];

/** As diferenças entre o índice guardado, posto em dia, e o montado do zero no mesmo estado: os registros na ordem da chapa (os
 *  vértices, os mesmos vetores de ponto, a caixa, a normal), as faces de cada vértice, as células da grade e a resposta do classificador
 *  de parede para toda face. Lista vazia quando são iguais. */
export function diferencas(guardado: any, novo: any, ids: number[]) {
  const d: string[] = [];
  const igual = (x: any[], y: any[]) => x.length === y.length && x.every((v, k) => v === y[k]);
  if (guardado.regs.length !== novo.regs.length || guardado.porId.size !== novo.porId.size) d.push(`tamanhos ${guardado.regs.length}/${guardado.porId.size} contra ${novo.regs.length}/${novo.porId.size}`);
  /* a grade, com a célula que a guarda tem (o índice montado de novo ainda não tem grade, e ganha uma aqui) */
  const espessura = guardado.grade ? guardado.grade.celula / 25 : 0.002;
  const daGuarda = classificadorDeParede({ espessura, indice: guardado });
  const doNovo = classificadorDeParede({ espessura, indice: novo });
  for (let k = 0; k < novo.regs.length && d.length < 10; k++) {
    const g = guardado.regs[k], n = novo.regs[k];
    if (g?.id !== n.id || g.ordem !== k || g.fora || guardado.porId.get(n.id) !== g) { d.push(`registro ${k}: face ${g?.id} na ordem ${g?.ordem}, contra a face ${n.id}`); continue; }
    if (!igual(g.vs, n.vs)) d.push(`face ${n.id}: vértices ${g.vs} contra ${n.vs}`);
    if (!igual(g.pts, n.pts)) d.push(`face ${n.id}: os pontos não são os vetores de agora`);
    if (!igual(g.a, n.a) || !igual(g.b, n.b)) d.push(`face ${n.id}: caixa ${g.a} ${g.b} contra ${n.a} ${n.b}`);
    if ((g.n == null) !== (n.n == null) || (g.n && !igual(g.n, n.n))) d.push(`face ${n.id}: normal ${g.n} contra ${n.n}`);
  }
  if (guardado.doVertice.size !== novo.doVertice.size) d.push(`vértices com face: ${guardado.doVertice.size} contra ${novo.doVertice.size}`);
  for (const [v, l] of novo.doVertice) if (d.length < 10 && !igual(guardado.doVertice.get(v) ?? [], l)) d.push(`vértice ${v}: faces ${guardado.doVertice.get(v)} contra ${l}`);
  const celulas = (grade: any) => new Map([...grade.mapa].map(([c, l]: any) => [c, l.map((g: any) => g.id).sort((x: number, y: number) => x - y).join(',')]));
  const cg = celulas(guardado.grade), cn = celulas(novo.grade);
  if (guardado.grade.celula !== novo.grade.celula || cg.size !== cn.size) d.push(`grade: ${cg.size} células de ${guardado.grade.celula} contra ${cn.size} de ${novo.grade.celula}`);
  for (const [c, l] of cn) if (d.length < 10 && cg.get(c) !== l) d.push(`célula ${c}: ${cg.get(c)} contra ${l}`);
  if (guardado.grade.grandes.length !== novo.grade.grandes.length) d.push('grade: as faces grandes diferem');
  let paredes = 0;
  for (const id of ids) { const p = doNovo(id); if (p) paredes++; if (d.length < 10 && daGuarda(id) !== p) d.push(`face ${id}: parede ${daGuarda(id)} na guarda e ${p} no índice novo`); }
  if (!paredes) d.push('nenhuma face de parede na chapa: a conferência do classificador não mediu nada');
  return d;
}

/** Pede o índice da chapa como o corte faria, de dentro de um passo de prova: com a conta de `set` e `delete` do passo que o despacho
 *  dá à operação do núcleo (`tocados`, vazia quando o passo ainda não escreveu nada). Devolve o índice e o que mudou na conta. */
export function pedirIndice(st: any, i: number, ids: number[], tocados: { V?: number[]; F?: number[] } = {}) {
  const antes = { ...st[GUARDA_DA_CHAPA] };
  st.tocadosV = new Set(tocados.V ?? []); st.tocadosF = new Set(tocados.F ?? []);
  const indice = chapaGuardada(st, i, ids);
  st.tocadosV = st.tocadosF = null;
  const depois = st[GUARDA_DA_CHAPA];
  return { indice, remontou: depois.montados > antes.montados, refeitas: depois.facesRefeitas - antes.facesRefeitas };
}

/** O passo de prova que confere a guarda: pede o índice e o compara com um montado do zero. Sem guarda no `st`, não faz nada. */
export function conferencia(saida: any[], origemId: number) {
  return (st: any, i: number) => {
    if (!st[GUARDA_DA_CHAPA]) return;
    const ids = facesDoCorte(st, origemId);
    const { indice, remontou, refeitas } = pedirIndice(st, i, ids);
    const tinhaGrade = Boolean(indice.grade);
    saida.push({ diferencas: diferencas(indice, indiceDaChapa(st.V, st.F, ids), ids), remontou, refeitas, tinhaGrade, faces: ids.length });
  };
}
