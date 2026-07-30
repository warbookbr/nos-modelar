/* argumentos.mjs — leitura de linha de comando dos CLIs da Mecanifica, com a
   MESMA lei que o núcleo de autoria aplica a uma referência: bandeira
   desconhecida, ambígua ou vazia FALHA com diagnóstico, nunca vira no-op
   silencioso (CLAUDE.md, "Regras de autoria").

   Existe porque `descrever-peca.mjs` e `olhar-bancada.mjs` liam argumento com
   `args.includes('--x')` e `args.find(a => !a.startsWith('--'))`, e nesse
   desenho um TYPO some com o gate: `--estrit` (uma letra a menos que
   `--estrito`) saía 0 sem uma linha de aviso, `--parte=disco` imprimia o
   relatório inteiro enquanto o autor achava que tinha filtrado, e
   `peca-a peca-b` media a primeira e descartava a segunda calado. Régua que
   mede a peça errada em silêncio é pior do que não medir — e dois CLIs irmãos
   com validações diferentes são armadilha, por isso a leitura é uma só.

   Erra sempre para o lado de FALAR: cada mensagem diz o que foi recebido, o que
   é aceito e, quando o nome está a até duas edições de um conhecido, sugere o
   nome certo. A sugestão é determinística (distância menor vence; empate vai
   para o primeiro da lista declarada). */

/** Distância de edição (Levenshtein), para sugerir o nome certo num typo. */
function distanciaDeEdicao(a, b) {
  const linha = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = linha[0];
    linha[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const anterior = linha[j];
      linha[j] = Math.min(
        linha[j] + 1,
        linha[j - 1] + 1,
        diagonal + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      diagonal = anterior;
    }
  }
  return linha[b.length];
}

function sugerir(nome, conhecidos) {
  let melhor = null;
  for (const candidato of conhecidos) {
    const d = distanciaDeEdicao(nome, candidato);
    if (d <= 2 && (melhor === null || d < melhor.distancia)) melhor = { candidato, distancia: d };
  }
  return melhor ? ` Você quis dizer '--${melhor.candidato}'?` : '';
}

function aceitos(opcoes, bandeiras) {
  const partes = [];
  if (opcoes.length) partes.push(`opções: ${opcoes.map((o) => `--${o}=<valor>`).join(', ')}`);
  if (bandeiras.length) partes.push(`bandeiras: ${bandeiras.map((b) => `--${b}`).join(', ')}`);
  return partes.length ? partes.join('; ') : '(nenhuma)';
}

/**
 * Lê `argv` contra um vocabulário DECLARADO e falha em qualquer coisa fora dele.
 *
 * `opcoes` são os nomes que exigem `--nome=valor`; `bandeiras` os que não
 * aceitam valor; `posicional` é `{ nome, obrigatorio }` do único argumento solto
 * aceito (ou `null` para nenhum). Devolve `{ opcao, bandeira, posicional }`.
 *
 * Lança `Error` com diagnóstico em: nome desconhecido, opção sem valor,
 * bandeira com valor, repetição (ambiguidade não se resolve em silêncio),
 * argumento solto a mais e argumento solto quando nenhum é aceito.
 */
export function lerArgumentos(argv, { opcoes = [], bandeiras = [], posicional = null } = {}) {
  const conhecidos = [...opcoes, ...bandeiras];
  const valores = new Map();
  const marcadas = new Set();
  const soltos = [];

  for (const bruto of argv) {
    if (!bruto.startsWith('-')) {
      soltos.push(bruto);
      continue;
    }
    if (!bruto.startsWith('--') || bruto === '--') {
      throw new Error(
        `argumento '${bruto}' não é reconhecido — as opções têm dois traços.`
        + `\n  aceito: ${aceitos(opcoes, bandeiras)}`,
      );
    }
    const corpo = bruto.slice(2);
    const igual = corpo.indexOf('=');
    const nome = igual === -1 ? corpo : corpo.slice(0, igual);
    const valor = igual === -1 ? null : corpo.slice(igual + 1);

    if (nome === '') {
      throw new Error(`argumento '${bruto}' veio sem nome.\n  aceito: ${aceitos(opcoes, bandeiras)}`);
    }
    if (!conhecidos.includes(nome)) {
      throw new Error(
        `não conheço '--${nome}' (recebi '${bruto}').${sugerir(nome, conhecidos)}`
        + `\n  aceito: ${aceitos(opcoes, bandeiras)}`,
      );
    }
    if (opcoes.includes(nome)) {
      if (valor === null) {
        throw new Error(`'--${nome}' é opção e precisa de valor: use --${nome}=<valor>.`);
      }
      if (valores.has(nome)) {
        throw new Error(
          `'--${nome}' veio mais de uma vez ('${valores.get(nome)}' e '${valor}');`
          + ' ambiguidade não é escolhida em silêncio — passe uma vez só.',
        );
      }
      valores.set(nome, valor);
    } else {
      if (valor !== null) {
        throw new Error(`'--${nome}' é bandeira e não aceita valor (recebi '${bruto}').`);
      }
      if (marcadas.has(nome)) {
        throw new Error(`'--${nome}' veio mais de uma vez; passe uma vez só.`);
      }
      marcadas.add(nome);
    }
  }

  if (posicional === null && soltos.length) {
    throw new Error(
      `este comando não aceita argumento solto, e recebi ${soltos.map((s) => `'${s}'`).join(', ')}.`
      + `\n  aceito: ${aceitos(opcoes, bandeiras)}`,
    );
  }
  if (posicional !== null && soltos.length > 1) {
    throw new Error(
      `recebi ${soltos.length} valores para ${posicional.nome}: ${soltos.map((s) => `'${s}'`).join(', ')}.`
      + `\n  este comando mede um por vez — medir o errado em silêncio é pior do que não medir.`,
    );
  }
  if (posicional?.obrigatorio && soltos.length === 0) {
    throw new Error(`diga ${posicional.nome}.`);
  }

  return {
    opcao: (nome, padrao = null) => {
      if (!opcoes.includes(nome)) {
        throw new Error(`argumentos: '--${nome}' não foi declarado como opção deste comando.`);
      }
      return valores.has(nome) ? valores.get(nome) : padrao;
    },
    bandeira: (nome) => {
      if (!bandeiras.includes(nome)) {
        throw new Error(`argumentos: '--${nome}' não foi declarado como bandeira deste comando.`);
      }
      return marcadas.has(nome);
    },
    posicional: soltos.length ? soltos[0] : null,
  };
}
