/* frente-da-fonte.mjs — de que lado fica a frente de uma malha de referência, e a conferência de que o `partes.json` a registrou.

   A convenção do acervo põe a frente em +z. Uma fonte que chega com a frente em -z, ou cuja frente ninguém conferiu, faz a receita ser medida
   contra a metade errada: o rodoviário saiu de trás para a frente e só uma imagem acusou. Aqui a frente sai de evidência da própria malha
   (as rodas e os faróis que o nome da parte diz serem da frente ou de trás, e o para-brisa contra o vidro traseiro), ou é DECLARADA por quem
   olhou a vista lateral (`--frente`). Quando a malha é uma peça só e nada no nome ajuda, a declaração é obrigatória. O resultado vai para o
   `partes.json` no campo `frente`, e `comparar-silhueta.mjs`, `folha-comparativa.mjs` e `medidas-da-fonte.mjs` recusam fonte sem esse campo. */

/* Em cada grupo, o padrão da parte da frente e o da parte de trás, aplicados ao NOME da malha. */
const GRUPOS = [
  {
    nome: 'rodas',
    frente: /(wheel|roda|tire|tyre|pneu)[-_ .]?(f[lr]\b|f[lr][-_ .]|front|frent|dianteir)|(front|frent|dianteir)[-_ .]?(wheel|roda|tire|pneu)/i,
    tras: /(wheel|roda|tire|tyre|pneu)[-_ .]?([lr]r\b|[lr]r[-_ .]|back|rear|tras|traseir)|(back|rear|tras|traseir)[-_ .]?(wheel|roda|tire|pneu)/i,
  },
  {
    nome: 'faróis',
    frente: /head.?(light|lamp)|farol.?(dianteir)?|front.?(light|lamp)/i,
    tras: /tail.?(light|lamp)|rear.?(light|lamp)|lanterna|brake.?light/i,
  },
  {
    nome: 'para-brisa',
    frente: /wind.?(shield|screen)|para.?brisa|front.?(glass|window)/i,
    tras: /rear.?(glass|window)|back.?(glass|window)|vidro.?traseiro/i,
  },
];

const centroZ = (p) => (p.minimo[2] + p.maximo[2]) / 2;
const media = (v) => v.reduce((s, x) => s + x, 0) / v.length;

/** A frente que as partes nomeadas mostram, ou null quando nenhum grupo tem uma parte da frente e uma de trás. Cada parte é `{ nome, minimo, maximo }`, em metro, já na orientação final. */
export function detectarFrente(partes) {
  for (const g of GRUPOS) {
    const da = partes.filter((p) => g.frente.test(p.nome) && !g.tras.test(p.nome));
    const de = partes.filter((p) => g.tras.test(p.nome) && !g.frente.test(p.nome));
    if (!da.length || !de.length) continue;
    const zf = media(da.map(centroZ)); const zt = media(de.map(centroZ));
    if (Math.abs(zf - zt) < 1e-3) continue;
    return { lado: zf > zt ? '+z' : '-z', origem: g.nome, evidencia: `${da.length} parte(s) da frente em z médio ${zf.toFixed(3)} m e ${de.length} de trás em ${zt.toFixed(3)} m (${g.nome})` };
  }
  return null;
}

/** Decide o campo `frente` do `partes.json`. `declarada` é '+z' ou '-z' (a frente na malha endireitada, ANTES do giro); `girar` é o giro em graus aplicado em torno de y.
    Lança Error com a instrução do que fazer quando a frente não fecha em +z ou a evidência contradiz a declaração. */
export function decidirFrente(partes, { declarada = null, girar = 0 } = {}) {
  if (declarada !== null && declarada !== '+z' && declarada !== '-z') throw new Error(`--frente aceita +z ou -z, recebeu "${declarada}"`);
  const giro = ((Math.round(girar) % 360) + 360) % 360;
  const detectada = detectarFrente(partes);
  let lado; let origem; let evidencia;
  if (declarada) {
    if (giro !== 0 && giro !== 180) throw new Error(`--frente ${declarada} com --girar ${girar}: só 0 e 180 graus deixam a frente sobre o eixo z`);
    lado = giro === 180 ? (declarada === '+z' ? '-z' : '+z') : declarada;
    origem = 'declarada'; evidencia = `frente declarada em ${declarada} antes do giro de ${giro} graus`;
    if (detectada && detectada.lado !== lado) throw new Error(`a declaração (frente em ${lado} depois do giro) contradiz a evidência da malha: ${detectada.evidencia}`);
    if (detectada) evidencia += `; confirmada por ${detectada.evidencia}`;
  } else if (detectada) ({ lado, origem, evidencia } = detectada);
  else throw new Error('a malha não diz onde fica a frente (nenhuma parte de roda, farol ou para-brisa com nome de frente e de trás): olhe a vista lateral da fonte e declare --frente +z ou --frente -z (o lado em que a frente fica na malha endireitada, antes de --girar)');
  if (lado !== '+z') throw new Error(`depois do giro de ${giro} graus a frente fica em -z (${evidencia}); a convenção do acervo é +z: some 180 graus a --girar`);
  return { lado, origem, evidencia, girarGraus: giro, ...(declarada ? { declarada } : {}) };
}

/** Recusa, com a instrução de regerar, o `partes.json` sem o campo `frente` conferido. Devolve a frente. */
export function exigirFrente(fonte, arquivo) {
  const f = fonte?.frente;
  if (!f || f.lado !== '+z' || !f.origem) {
    throw new Error(`${arquivo}: a fonte não registra a frente (campo "frente" ausente ou fora de +z), e sem ela não dá para saber se a receita está sendo medida do lado certo; regere com node tools/modelar/modelo-de-referencia.mjs <malha> --saida <pasta> [--frente +z|-z]`);
  }
  return f;
}
