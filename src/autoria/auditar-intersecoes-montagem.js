import {
  TOLERANCIA_CONTATO_SOLIDO,
  auditarParDeSolidos,
  exigirToleranciaDeContato,
  prepararSolido,
} from './contato-de-solidos.js';
import { ESTADOS_DE_CONTATO, MINIMO_DO_MOTIVO } from './contatos-da-peca.js';

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
 * A EXPECTATIVA JULGA. Ela anotava e só: um par esperado saía marcado, o estado
 * geométrico continuava o que a medida achou, e nada além disso acontecia. Como
 * o único consumidor transformava o resultado em descrição para ser lida,
 * montagem com peça atravessando peça nunca reprovava — o defeito estava
 * fechado dentro de uma peça e aberto entre peças, que é onde ele é mais
 * provável, porque quem monta não desenhou as duas peças.
 *
 * A POLARIDADE É A MESMA DA PEÇA, e ela importa mais que o resto do módulo. A
 * montagem lista os contatos INTENCIONAIS antes de medir, e par que se toque
 * fora da lista sai em `naoDeclarados`. Se declarar servisse para calar uma
 * reprovação já emitida, bastaria declarar tudo depois de ver o vermelho.
 * Esquecer precisa falhar, não silenciar.
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

function chaveDoPar(a, b) {
  const [x, y] = compararCaminho(a, b) <= 0 ? [a, b] : [b, a];
  return `${JSON.stringify(x)} ${JSON.stringify(y)}`;
}

/**
 * Confere a lista declarada contra a montagem que existe de verdade.
 *
 * Caminho inexistente FALHA nomeando os caminhos disponíveis: declaração que não
 * casa com nada é declaração morta, e declaração morta some sem ninguém notar.
 * O motivo tem tamanho mínimo pela mesma razão que na peça — campo livre que
 * aceita "ok" é campo que some.
 */
function conferirExpectativas(expectativas, folhas, quem) {
  const conhecidos = new Set(folhas.map((folha) => JSON.stringify(folha.caminho)));
  const disponiveis = () => [...conhecidos].sort(compararTexto).join(', ') || '(nenhum)';
  const vistos = new Set();
  for (const expectativa of expectativas) {
    const onde = `${quem}: expectativa '${expectativa.id}'`;
    for (const lado of ['a', 'b']) {
      const chave = JSON.stringify(expectativa[lado].caminho);
      if (!conhecidos.has(chave)) {
        throw new Error(`${onde}: a montagem não tem a peça ${chave}. Caminhos disponíveis: ${disponiveis()}.`);
      }
    }
    if (typeof expectativa.motivo !== 'string' || expectativa.motivo.trim().length < MINIMO_DO_MOTIVO) {
      throw new Error(`${onde}: 'motivo' precisa dizer POR QUE estas peças se tocam, com pelo menos ${MINIMO_DO_MOTIVO} caracteres. Motivo curto é declaração que ninguém confere.`);
    }
    const par = chaveDoPar(expectativa.a.caminho, expectativa.b.caminho);
    if (vistos.has(par)) throw new Error(`${onde}: este par já foi declarado por outra expectativa.`);
    vistos.add(par);
  }
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
  conferirExpectativas(expectativas, folhas, 'auditar interseções');
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
  /* GRAVIDADE PRIMEIRO, como na peça: quem consome com orçamento apertado
     precisa receber os piores, e não os que vêm antes na ordem do caminho. */
  const gravidade = (estado) => (estado === 'interpenetram' ? 0 : 1);
  const suspeita = (metodo) => (metodo === 'intersecao-de-superficies' ? 0 : 1);
  const emContato = pares.filter((par) => ESTADOS_DE_CONTATO.includes(par.estado));
  const naoDeclarados = emContato
    .filter((par) => par.expectativa === undefined)
    .sort((x, y) => gravidade(x.estado) - gravidade(y.estado)
      || suspeita(x.metodo) - suspeita(y.metodo)
      || compararCaminho(x.a, y.a) || compararCaminho(x.b, y.b));
  const tocam = new Set(emContato.map((par) => chaveDoPar(par.a, par.b)));
  /* Declaração que não corresponde a contato nenhum. Não reprova — pode ser
     folga que a montagem pretende fechar — mas aparece, porque declaração que
     descreve o que não existe é a primeira forma de a lista virar ficção. */
  const declaradosSemContato = expectativas
    .filter((item) => !tocam.has(chaveDoPar(item.a.caminho, item.b.caminho)))
    .map((item) => ({ id: item.id, a: item.a.caminho, b: item.b.caminho, motivo: item.motivo }));
  return {
    formato: FORMATO_AUDITORIA_INTERSECOES,
    versao: VERSAO_AUDITORIA_INTERSECOES,
    escopo: { caminho: caminho.slice(), modoFoco, folhas: folhas.length, paresOmitidosPorFoco: filtrados },
    toleranciaNumerica: tolerancia,
    pares,
    naoDeclarados,
    declaradosSemContato,
    cobertura: {
      paresTotais: (folhas.length * (folhas.length - 1)) / 2,
      paresNoEscopo: pares.length,
      paresVerificados: pares.length - inconclusivos,
      inconclusivos,
      completa: inconclusivos === 0 && filtrados === 0,
    },
  };
}
