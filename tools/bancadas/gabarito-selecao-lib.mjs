/* gabarito-selecao-lib.mjs — regras puras da Prova Zero: compara o acervo
 * atual ao gabarito gravado e permite declarar SOMENTE peças novas nomeadas. */
import { createHash } from 'node:crypto';

export function hashDePecas(pecas) {
  return createHash('sha256')
    .update(Object.keys(pecas).sort().map((nome) => `${nome}:${pecas[nome].hash}`).join('|'))
    .digest('hex');
}

export function nomesNovos(args) {
  const opcoes = args.filter((arg) => arg.startsWith('--novas='));
  if (args.includes('--novas') || opcoes.length > 1) throw new Error('use --novas=<peca[,outra]> uma única vez');
  if (!opcoes.length) return new Set();
  const nomes = opcoes[0].slice('--novas='.length).split(',').map((nome) => nome.trim()).filter(Boolean);
  if (!nomes.length || new Set(nomes).size !== nomes.length) throw new Error('--novas precisa nomear uma ou mais peças distintas');
  return new Set(nomes);
}

export function compararGabarito(atual, gravado, novas = new Set()) {
  const erros = [];
  const pecasGravadas = gravado.pecas ?? {};
  const nomesAtuais = Object.keys(atual).sort();
  const nomesGravados = Object.keys(pecasGravadas).sort();

  for (const nome of novas) {
    if (pecasGravadas[nome]) erros.push(`${nome}: --novas só aceita peça ausente do gabarito gravado`);
    else if (!atual[nome]) erros.push(`${nome}: declarada em --novas, mas não foi medida como peça nova`);
  }

  const todosNomes = [...new Set([...nomesAtuais, ...nomesGravados])].sort();
  for (const nome of todosNomes) {
    const agora = atual[nome], antes = pecasGravadas[nome];
    if (!antes) {
      if (!novas.has(nome)) erros.push(`${nome}: peça NOVA desde o gabarito — declare --novas=${nome} ou regrave o gabarito`);
      continue;
    }
    if (!agora) { erros.push(`${nome}: peça SUMIU desde o gabarito (existia, não existe mais ou perdeu PASSOS)`); continue; }
    if (agora.hash !== antes.hash) erros.push(`${nome}: HASH DIVERGE do gabarito — mudança não é aditiva (V=${agora.vertices} vs ${antes.vertices}, F=${agora.faces} vs ${antes.faces})`);
  }

  const hashDasGravadas = hashDePecas(Object.fromEntries(nomesGravados.filter((nome) => atual[nome]).map((nome) => [nome, atual[nome]])));
  if (!erros.length && gravado.hashTotal !== hashDasGravadas) erros.push('hash total diverge apesar de cada peça gravada bater (achado impossível — investigar)');
  return {
    erros,
    gravadasConformes: nomesGravados.filter((nome) => atual[nome]?.hash === pecasGravadas[nome]?.hash).length,
    novasAceitas: nomesAtuais.filter((nome) => !pecasGravadas[nome] && novas.has(nome)),
  };
}
