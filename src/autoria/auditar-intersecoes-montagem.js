import {
  TOLERANCIA_CONTATO_SOLIDO,
  auditarParDeSolidos,
  exigirToleranciaDeContato,
  prepararSolido,
} from './contato-de-solidos.js';

/* auditoria de interseções de montagem — serviço neutro, sem Three.js.
 *
 * A caixa é somente a fase ampla. O resultado geométrico vem da malha final:
 * cruzamento de triângulos e teste de contenção. Malhas que não permitem
 * concluir sobre um sólido são marcadas como inconclusivas, nunca como livres.
 *
 * A GEOMETRIA MORA EM `contato-de-solidos.js` desde que a mesma pergunta passou
 * a valer para as partes de uma peça. Este módulo ficou com o que é de
 * MONTAGEM: percorrer a árvore de instâncias, aplicar foco e cruzar o resultado
 * com as expectativas declaradas. A régua é uma só, para os dois.
 *
 * A EXPECTATIVA AQUI ANOTA, NÃO JULGA — um par esperado sai marcado, e o estado
 * geométrico continua o que a medida achou. Quem decide veredito é quem chama.
 */

export const FORMATO_AUDITORIA_INTERSECOES = 'mecanifica.auditoria-intersecoes';
export const VERSAO_AUDITORIA_INTERSECOES = 1;
export const TOLERANCIA_INTERSECOES = TOLERANCIA_CONTATO_SOLIDO;

function compararTexto(a, b) { return a < b ? -1 : a > b ? 1 : 0; }

function compararCaminho(a, b) {
  for (let i = 0; i < Math.min(a.length, b.length); i += 1) {
    const ordem = compararTexto(a[i], b[i]);
    if (ordem) return ordem;
  }
  return a.length - b.length;
}

/* A folha da montagem é o sólido do núcleo com o caminho de volta no lugar do
   rótulo: quem consome esta auditoria endereça por caminho, não por texto. */
function prepararFolha(instancia, caminho) {
  const solido = prepararSolido(instancia.definicao?.neutro, instancia.poseMundo, caminho);
  const { rotulo, ...resto } = solido;
  return { caminho, ...resto };
}

function prepararFolhas(montagem, saida = []) {
  for (const instancia of [...montagem.instancias].sort((a, b) => compararCaminho(a.caminho, b.caminho))) {
    if (instancia.alvo.tipo === 'peca') saida.push(prepararFolha(instancia, instancia.caminho.slice()));
    else prepararFolhas(instancia.montagem, saida);
  }
  return saida;
}

function dentroDoFoco(caminho, foco) {
  return foco.length === 0 || (foco.length <= caminho.length && foco.every((item, i) => item === caminho[i]));
}

function expectativaDoPar(expectativas, a, b) {
  return (expectativas ?? []).find((item) => (
    (JSON.stringify(item.a.caminho) === JSON.stringify(a) && JSON.stringify(item.b.caminho) === JSON.stringify(b))
    || (JSON.stringify(item.a.caminho) === JSON.stringify(b) && JSON.stringify(item.b.caminho) === JSON.stringify(a))
  ));
}

export function auditarIntersecoesMontagem(montagemResolvida, opcoes = {}) {
  if (!montagemResolvida || !Array.isArray(montagemResolvida.instancias)) throw new TypeError('auditar interseções: montagem resolvida inválida.');
  if (!opcoes || typeof opcoes !== 'object' || Array.isArray(opcoes)) throw new TypeError('auditar interseções: opções inválidas.');
  const extras = Object.keys(opcoes).filter((chave) => !['caminho', 'modoFoco', 'toleranciaNumerica'].includes(chave));
  if (extras.length) throw new Error(`auditar interseções: opção desconhecida '${extras[0]}'.`);
  const caminho = opcoes.caminho ?? [];
  if (!Array.isArray(caminho) || caminho.some((item) => typeof item !== 'string' || item === '')) throw new Error('auditar interseções: caminho precisa ser lista de IDs não vazios.');
  const modoFoco = opcoes.modoFoco ?? 'incidente';
  if (modoFoco !== 'incidente' && modoFoco !== 'interno') throw new Error("auditar interseções: modoFoco precisa ser 'incidente' ou 'interno'.");
  const tolerancia = exigirToleranciaDeContato(opcoes.toleranciaNumerica
    ?? montagemResolvida.auditoriaIntersecoes?.toleranciaNumerica
    ?? TOLERANCIA_INTERSECOES, 'auditar interseções');
  const expectativas = montagemResolvida.auditoriaIntersecoes?.expectativas ?? [];
  const folhas = prepararFolhas(montagemResolvida);
  const pares = [];
  let filtrados = 0;
  for (let i = 0; i < folhas.length; i += 1) for (let j = i + 1; j < folhas.length; j += 1) {
    const a = folhas[i]; const b = folhas[j];
    const aNoFoco = dentroDoFoco(a.caminho, caminho);
    const bNoFoco = dentroDoFoco(b.caminho, caminho);
    const incluido = modoFoco === 'interno' ? aNoFoco && bNoFoco : aNoFoco || bNoFoco;
    if (!incluido) { filtrados += 1; continue; }
    const resultado = auditarParDeSolidos(a, b, tolerancia);
    const expectativa = expectativaDoPar(expectativas, a.caminho, b.caminho);
    pares.push({
      a: a.caminho,
      b: b.caminho,
      ...resultado,
      ...(expectativa ? { expectativa: { id: expectativa.id, motivo: expectativa.motivo } } : {}),
    });
  }
  const inconclusivos = pares.filter((par) => par.estado === 'inconclusivo').length;
  return {
    formato: FORMATO_AUDITORIA_INTERSECOES,
    versao: VERSAO_AUDITORIA_INTERSECOES,
    escopo: { caminho: caminho.slice(), modoFoco, folhas: folhas.length, paresOmitidosPorFoco: filtrados },
    toleranciaNumerica: tolerancia,
    pares,
    cobertura: {
      paresTotais: (folhas.length * (folhas.length - 1)) / 2,
      paresNoEscopo: pares.length,
      paresVerificados: pares.length - inconclusivos,
      inconclusivos,
      completa: inconclusivos === 0 && filtrados === 0,
    },
  };
}
