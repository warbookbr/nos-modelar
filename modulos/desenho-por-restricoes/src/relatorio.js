/* relatorio.js — o relatório que volta à IA, em português: o estado do desenho, o que corrigir e as medidas que ela não escreveu.

   O estado é um de quatro: resolvido, conflito, solto ou lado trocado. Cada estado diz o que fazer pelo nome da relação que a IA
   escreveu (nunca por número de linha ou de restrição), e a correção é sempre na relação ou no `lado`, e não na coordenada de um
   ponto: o chute só escolhe o ramo da solução. Redundância e avisos saem em qualquer estado, como aviso. As medidas derivadas
   saem só no estado resolvido, que é quando o desenho é gravado. Puro. */

const arredondar = (x) => Math.round(x * 10) / 10;
export const mm = (x) => {
  const t = String(arredondar(x) || 0);
  return t.replace('.', ',');
};
const aspas = (s) => JSON.stringify(s);
const lista = (nomes) => nomes.map(aspas).join(', ');
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

function fraseDeSoltas(soltas, graus) {
  const quem = soltas.partes.length ? `ainda ${soltas.partes.length === 1 ? 'se move a parte' : 'se movem as partes'} ${lista(soltas.partes)}` : 'o resolvedor não achou qual ponto se move';
  const pontos = soltas.pontos.map((p) => `${aspas(p.nome)} (${p.eixos.length === 2 ? 'h e v' : p.eixos[0]})`);
  const raios = soltas.raios.map((n) => `o raio de ${aspas(n)}`);
  const detalhe = [...pontos, ...raios];
  return `${plural(graus, 'grau de liberdade', 'graus de liberdade')}: ${quem}${detalhe.length ? `; soltos: ${detalhe.join(', ')}` : ''}. Cada grau de liberdade pede uma relação a mais (uma distância, um ângulo, "vertical", "horizontal", "paralela" ou "sobre" uma referência) que prenda esses pontos. As relações escritas até aqui valem, e nenhuma coordenada precisa mudar.`;
}

function linhasDasMedidas(m, ordemDeNomes) {
  const L = [];
  const v = m.vista;
  L.push('medidas derivadas (as que você não escreveu; confira se a forma faz sentido):');
  L.push(`  vista: ${mm(v.larguraMm)} mm de largura (h de ${mm(v.hMin)} a ${mm(v.hMax)}) por ${mm(v.alturaMm)} mm de altura (v de ${mm(v.vMin)} a ${mm(v.vMax)})`);
  L.push(`  pontos: ${Object.entries(m.pontos).map(([n, [h, vv]]) => `${aspas(n)} (${mm(h)}; ${mm(vv)})`).join(', ')}`);
  for (const nome of ordemDeNomes) {
    const p = m.partes[nome];
    const caixa = `${mm(p.larguraMm)} de largura (h de ${mm(p.hMin)} a ${mm(p.hMax)}) por ${mm(p.alturaMm)} de altura (v de ${mm(p.vMin)} a ${mm(p.vMax)})`;
    if (p.tipo === 'barra') L.push(`  ${aspas(nome)}: barra de ${mm(p.comprimentoMm)} mm de comprimento a ${mm(p.anguloGraus)} graus, ${mm(p.espessuraMm)} mm de espessura; ${caixa}`);
    else if (p.tipo === 'circulo') L.push(`  ${aspas(nome)}: círculo de raio ${mm(p.raioMm)} mm; ${caixa}`);
    else if (p.tipo === 'arco') L.push(`  ${aspas(nome)}: arco de raio ${mm(p.raioMm)} mm; ${caixa}`);
    else L.push(`  ${aspas(nome)}: polígono; ${caixa}; lados ${p.lados.map((l) => `${l.de}-${l.ate} ${mm(l.comprimentoMm)} mm a ${mm(l.anguloGraus)} graus`).join(', ')}`);
  }
  return L;
}

export function relatorioEmTexto(r) {
  const L = [];
  const titulo = `desenho ${aspas(r.objeto)}, vista ${r.vista}`;
  if (r.estado === 'resolvido') {
    L.push(`${titulo}: estado resolvido, ${plural(r.grausDeLiberdade, 'grau de liberdade', 'graus de liberdade')}.`);
  } else if (r.estado === 'conflito') {
    L.push(`${titulo}: estado conflito.`);
    if (r.conflitantes.length) L.push(`as relações ${lista(r.conflitantes)} não cabem juntas. Apague uma delas ou corrija o valor de uma, e rode de novo; não mexa nas coordenadas.`);
    else if (!r.convergiu) L.push(`o resolvedor não convergiu a partir do chute (${r.statusDoResolvedor}) e não apontou relação em conflito. Aproxime o chute dos pontos do que você espera ou confira se alguma relação pede uma forma impossível (uma distância maior que a soma das outras, por exemplo).`);
    for (const d of r.desvios) L.push(`a relação ${aspas(d.relacao)} pede ${mm(d.pedido)} ${d.unidade === 'graus' ? 'graus' : 'mm'}, e a geometria resolvida mede ${mm(d.medido)}; o resolvedor não a satisfez junto com as outras. Revise as relações que cercam essa.`);
  } else if (r.estado === 'lado trocado') {
    L.push(`${titulo}: estado lado trocado. O resolvedor devolveu uma solução, mas ela fica do lado errado do que você declarou:`);
    for (const t of r.ladosTrocados) L.push(`- ${t.mensagem}.`);
    if (r.sugestao?.resolve) {
      const novo = Object.entries(r.sugestao.pontos).map(([n, [h, v]]) => `${aspas(n)}: [${h}, ${v}]`).join(', ');
      L.push(`com o chute refletido pela reta (${novo}) o desenho resolve com todos os lados certos. Troque esse chute em "pontos"; é o chute que escolhe o ramo da solução. Se o lado declarado é que estava errado, corrija o "lado" da relação.`);
    } else if (r.sugestao) {
      L.push('refletir só o chute do ponto não bastou. Ponha no chute a parte inteira do lado declarado (todos os pontos dela do mesmo lado da reta), ou corrija o "lado" da relação se ele é que estava errado.');
    } else {
      L.push('corrija o chute para o lado declarado, ou o "lado" da relação se ele é que estava errado.');
    }
  } else {
    L.push(`${titulo}: estado solto, ${fraseDeSoltas(r.soltas ?? { partes: [], pontos: [], raios: [] }, r.grausDeLiberdade)}`);
  }
  if (r.redundantes.length) L.push(`aviso: ${r.redundantes.length === 1 ? 'a relação' : 'as relações'} ${lista(r.redundantes)} ${r.redundantes.length === 1 ? 'repete' : 'repetem'} o que as outras já fixam. Não impede o desenho; apague ${r.redundantes.length === 1 ? 'a repetida' : 'as repetidas'} se não houver motivo para mantê-${r.redundantes.length === 1 ? 'la' : 'las'}.`);
  for (const a of r.avisos) L.push(`aviso: ${a}`);
  if (r.estado === 'resolvido' && r.medidas) L.push(...linhasDasMedidas(r.medidas, Object.keys(r.medidas.partes).sort()));
  return `${L.join('\n')}\n`;
}
