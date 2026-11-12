/* aba-no-sedan.rascunho.mjs — RASCUNHO da opção `aba` do `paineisPorVaos` sobre a lataria de baixo do sedã (atrito 3 do RECEITA.md), sem trocar o forro da receita.
 *
 * Corta a chapa do esboço do ciclo 2 (as seis linhas por lado, sem o corpo, o teto nem o chassi) duas vezes, sem e com a aba em todas as linhas, executa o corte e mede o
 * fundo dos vãos entre os painéis pelo mesmo `vaoEntrePartes` do `npm run vao:partes -- --fundo=modelo`. A chapa sozinha não tem chão: o que a medida diz é quanto do vão a
 * perna fecha para o raio oblíquo; o raio que desce em linha reta passa pela chapa aberta embaixo (o chassi e o forro da carroceria é que o fecham). Saída: uma linha por caso.
 *   node procedural/pecas/sedan-chassi-e-lataria/alta-definicao/aba-no-sedan.rascunho.mjs [largura=20] [angulo=90] [raio=0.5] [--so-com-aba] */
process.env.HD_PAINEIS = '0';
const soComAba = process.argv.includes('--so-com-aba');
const [largura = 20, angulo = 90, raio = 0.5] = process.argv.slice(2).filter((a) => !a.startsWith('--')).map(Number);
const { default: esboco, linhasDeVao } = await import('./caminho-a-gaiola-da-casca.esboco.mjs');
const { PAINEIS, T } = await import('./alvo.mjs');
const { paineisPorVaos } = await import('../../../nucleo/paineis-por-vaos.js');
const { nucleo } = await import('../../../nucleo/entrada.js');
const { vaoEntrePartes } = await import('../../../../tools/modelar/vao-entre-partes.mjs');

const [chapa] = esboco.opcoes[0].passos;
const pontos = esboco.opcoes[0].topo;
const medir = (rotulo, aba) => {
  const t0 = Date.now();
  const g = paineisPorVaos({ chapa: { passos: [chapa], origem: { op: 'subdivisao', id: 1 }, pontos }, vao: T.vao, linhas: linhasDeVao(), paineis: PAINEIS, conferir: false, ...(aba ? { aba } : {}) });
  const st = nucleo(g.passos, {}, pontos);
  if (st.orfaos.length) throw new Error(`${rotulo}: o núcleo recusou: ${st.orfaos.slice(0, 2).map((x) => x.motivo).join('; ')}`);
  const faces = [...st.F.values()].filter((f) => f.parte && f.parte !== 'chapa').map((f) => ({ pts: f.vs.map((v) => st.V.get(v)), parte: f.parte }));
  const t1 = Date.now();
  const r = vaoEntrePartes(faces, { esperado: T.vao, tolerancia: 0.5, fundo: Infinity, soltas: 'recusar', linhaMinima: 10 });
  const sem = r.pares.filter((p) => p.semFundo && p.fora.some((f) => /vão sem fundo/.test(f.motivo)));
  console.log(`${rotulo}: ${g.passos.length} passos, ${faces.length} faces, corte e execução ${Math.round((t1 - t0) / 1000)} s, medida ${Math.round((Date.now() - t1) / 1000)} s; ${r.pares.length} pares, ${sem.length} sem fundo, ${Math.round(sem.reduce((s, p) => s + p.semFundo.linhaMm, 0))} mm de linha; folga medida ${g.medidas.folgaMedida ?? 'n/d'}`);
  return sem;
};
if (!soComAba) medir('sem aba', null);
medir(`aba de ${largura} mm a ${angulo} graus, raio ${raio}`, { largura, angulo, raio });
