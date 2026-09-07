/**
 * varrer-parametros.js — mede o que cada parâmetro faz, em vez de adivinhar.
 *
 * Dois modos sobre o MESMO motor, porque são a mesma operação lida de dois
 * jeitos: variar liberdade declarada, medir cada variante, resumir.
 *
 *   sensibilidade — um parâmetro por vez, ±δ. Responde "quais movem este
 *                   critério, e o que mais cada movimento quebra";
 *   lote          — grade sobre as liberdades declaradas. Responde "entre
 *                   estas combinações, quais sobrevivem e a que custo".
 *
 * REGRA QUE NÃO SE NEGOCIA: isto devolve CANDIDATOS, nunca aplica um vencedor.
 * `METODO-DIAGNOSTICO-E-SEU-LIMITE.md` continua valendo — medida não aprova
 * forma, e uma ferramenta que escolhe sozinha o melhor número produz peça
 * medida e feia com eficiência. Nada é escrito: as variantes vivem em memória e
 * o arquivo da receita não é tocado.
 *
 * A previsão é LOCAL. Um parâmetro por vez não vê interação entre dois, e ±10%
 * não diz nada sobre ±100%. Por isso o candidato escolhido é sempre remedido de
 * verdade: a varredura aponta onde olhar, não substitui a medição.
 */
import { descreverPeca } from './descrever-partes.js';
import { executarReceita } from './executar-receita.js';
import { caminhosNumericos, comCaminho, lerCaminho, receitaComParametros } from './parametros-vivos.js';

/** Teto de variantes por varredura, para o comando não sumir por minutos. */
export const ORCAMENTO_PADRAO = 200;

const EIXOS = { x: 0, y: 1, z: 2 };

/**
 * Abaixo disto, "mudou" é aritmética de ponto flutuante, não geometria.
 *
 * Aqui a comparação é entre parâmetros DIFERENTES, então as contas percorrem
 * caminhos diferentes e os últimos bits divergem sozinhos. Medido: mexer na
 * altura do assento da cadeira desloca a menor folga em 2,8e-14 m — vinte e
 * oito femtômetros, que a peça em milímetros não distingue de zero. Sem esta
 * porta, aquele parâmetro entrava na lista dos que movem o critério, ao lado de
 * um que move seis milímetros, e a lista deixava de significar alguma coisa.
 *
 * Um nanômetro é dez mil vezes menor que a menor tolerância que este acervo
 * usa, e cinco ordens de grandeza acima do ruído medido: separa os dois casos
 * sem chegar perto de esconder efeito real. Critério que conta pares é inteiro
 * e não precisa de porta nenhuma.
 */
export const EPSILON_EFEITO = 1e-9;

/**
 * Vocabulário FECHADO de critérios.
 *
 * Fechado de propósito: uma linguagem de expressão sobre a descrição seria mais
 * poderosa e obrigaria quem chama a aprender uma gramática nova só para
 * perguntar a folga entre duas partes. Cada critério devolve um número, ou
 * `null` quando a peça não tem do que ele fala — e `null` não é zero.
 */
export function lerCriterio(declarado) {
  const texto = String(declarado ?? '').trim();
  const [nome, ...resto] = texto.split(':');
  const arg = resto.join(':');

  if (nome === 'menor-folga') {
    return {
      nome: texto,
      unidade: 'mm',
      escala: 1000,
      avaliar: (d) => {
        const folgas = d.relacoes.filter((r) => r.tipo === 'folga').map((r) => r.distancia);
        return folgas.length ? Math.min(...folgas) : null;
      },
    };
  }
  if (nome === 'interpenetracoes') {
    return {
      nome: texto,
      unidade: 'par(es)',
      escala: 1,
      avaliar: (d) => d.relacoes.filter((r) => r.tipo === 'interpenetra').length,
    };
  }
  if (nome === 'contatos') {
    return {
      nome: texto,
      unidade: 'par(es)',
      escala: 1,
      avaliar: (d) => d.relacoes.filter((r) => r.tipo === 'encosta').length,
    };
  }
  if (nome === 'folga') {
    const [a, b] = arg.split(',').map((s) => s.trim());
    if (!a || !b) throw new Error("critério 'folga' pede duas partes: folga:<a>,<b>");
    return {
      nome: texto,
      unidade: 'mm',
      escala: 1000,
      avaliar: (d) => {
        const r = d.relacoes.find((x) => (x.a === a && x.b === b) || (x.a === b && x.b === a));
        return r ? r.distancia : null;
      },
    };
  }
  if (nome === 'dimensao') {
    const [parte, eixo] = arg.split(':').map((s) => s.trim());
    if (!parte || !(eixo in EIXOS)) {
      throw new Error("critério 'dimensao' pede parte e eixo: dimensao:<parte>:<x|y|z>");
    }
    return {
      nome: texto,
      unidade: 'mm',
      escala: 1000,
      avaliar: (d) => d.partes.find((p) => p.nome === parte)?.dimensoes?.[EIXOS[eixo]] ?? null,
    };
  }
  if (nome === 'envelope') {
    const eixo = arg.trim();
    if (!(eixo in EIXOS)) throw new Error("critério 'envelope' pede eixo: envelope:<x|y|z>");
    const i = EIXOS[eixo];
    return {
      nome: texto,
      unidade: 'mm',
      escala: 1000,
      avaliar: (d) => {
        if (!d.partes.length) return null;
        return Math.max(...d.partes.map((p) => p.max[i])) - Math.min(...d.partes.map((p) => p.min[i]));
      },
    };
  }
  throw new Error(
    `critério '${texto}' não existe. Aceitos: menor-folga, interpenetracoes, contatos,`
    + ' folga:<a>,<b>, dimensao:<parte>:<x|y|z>, envelope:<x|y|z>',
  );
}

/** O que precisa continuar verdadeiro em qualquer candidato aceitável. */
export function invariantesDe(descricao) {
  return {
    orfaos: descricao.totais.orfaos,
    facesSemParte: descricao.totais.facesSemParte,
    partes: descricao.totais.partes,
    interpenetracoes: descricao.relacoes.filter((r) => r.tipo === 'interpenetra').length,
  };
}

/**
 * Mede uma variante. Devolve o valor do critério, os invariantes e, quando o
 * motor recusa, o motivo — recusa é resultado, não exceção a engolir.
 */
export function avaliarVariante(receita, params, criterio) {
  try {
    const { neutro } = executarReceita(receitaComParametros(receita, params));
    const descricao = descreverPeca(neutro);
    return { ok: true, valor: criterio.avaliar(descricao), invariantes: invariantesDe(descricao) };
  } catch (erro) {
    return { ok: false, recusa: erro.message, valor: null, invariantes: null };
  }
}

/**
 * Um candidato QUEBROU a peça se perdeu parte, ganhou órfão ou face sem
 * identidade. Interpenetração nova NÃO entra aqui: às vezes é o próprio
 * critério, e sempre é informação que quem decide precisa ver — por isso ela é
 * relatada como custo em vez de eliminar o candidato em silêncio.
 */
function quebrou(base, cand) {
  return cand.invariantes.orfaos > base.orfaos
    || cand.invariantes.facesSemParte > base.facesSemParte
    || cand.invariantes.partes < base.partes;
}

/**
 * Sensibilidade: um parâmetro por vez, para baixo e para cima.
 *
 * Sonda TODOS os números declarados, inclusive os inertes, porque o próprio
 * "não move nada" é resposta — e sai recolhido numa linha, não em vinte.
 */
export function varrerSensibilidade(receita, {
  criterio: criterioDeclarado = 'menor-folga',
  delta = 0.1,
  orcamento = ORCAMENTO_PADRAO,
} = {}) {
  const criterio = lerCriterio(criterioDeclarado);
  const params = receita.PARAMS ?? {};
  const caminhos = caminhosNumericos(params);
  const previsto = caminhos.length * 2;
  if (previsto > orcamento) {
    throw new Error(
      `a varredura pediria ${previsto} variantes e o orçamento é ${orcamento}.`
      + ' Aumente com --orcamento ou reduza o alvo, mas decida antes de rodar.',
    );
  }

  const base = avaliarVariante(receita, params, criterio);
  if (!base.ok) throw new Error(`a receita não mede na base: ${base.recusa}`);
  if (base.invariantes.partes === 0) {
    throw new Error('a receita não publica nenhuma parte; não há o que medir. Veja `npm run parametros`.');
  }

  const efeitos = [];
  let variantes = 0;
  for (const caminho of caminhos) {
    const valor = lerCaminho(params, caminho);
    const sondas = [];
    for (const fator of [1 - delta, 1 + delta]) {
      const novo = valor === 0 ? (fator - 1) : valor * fator;
      const r = avaliarVariante(receita, comCaminho(params, caminho, novo), criterio);
      variantes += 1;
      sondas.push({
        fator,
        valor: novo,
        recusa: r.ok ? null : r.recusa,
        deltaCriterio: r.ok && r.valor !== null && base.valor !== null ? r.valor - base.valor : null,
        deltaInterpenetracoes: r.ok ? r.invariantes.interpenetracoes - base.invariantes.interpenetracoes : null,
        quebrou: r.ok ? quebrou(base.invariantes, r) : true,
      });
    }
    const epsilon = criterio.escala === 1 ? 0 : EPSILON_EFEITO;
    const move = sondas.some((s) => s.recusa || s.quebrou
      || (s.deltaCriterio !== null && Math.abs(s.deltaCriterio) > epsilon)
      || s.deltaCriterio === null
      || s.deltaInterpenetracoes !== 0);
    efeitos.push({ caminho: caminho.join('.'), valor, move, sondas });
  }

  /* A sonda que mais move o critério sem quebrar a peça define onde olhar.
     Escolher o maior efeito, e não o primeiro da lista, é o que faz a imagem
     sugerida cair na região que a decisão precisa ver. */
  let melhor = null;
  for (const efeito of efeitos) {
    if (!efeito.move) continue;
    for (const s of efeito.sondas) {
      if (s.recusa || s.quebrou || s.deltaCriterio === null) continue;
      if (!melhor || Math.abs(s.deltaCriterio) > Math.abs(melhor.deltaCriterio)) {
        melhor = { caminho: efeito.caminho, valor: s.valor, deltaCriterio: s.deltaCriterio };
      }
    }
  }
  const olhar = melhor
    ? partesMovidas(receita, comCaminho(params, melhor.caminho.split('.'), melhor.valor))
    : { partes: [], proporcao: null };

  return {
    criterio: criterio.nome,
    unidade: criterio.unidade,
    escala: criterio.escala,
    delta,
    base: { valor: base.valor, invariantes: base.invariantes },
    efeitos,
    melhor,
    movidas: olhar.partes,
    proporcao: olhar.proporcao,
    variantes,
  };
}

/**
 * Lê uma liberdade de lote: `caminho:min..max:passos`.
 *
 * O intervalo é DECLARADO por quem chama. A ferramenta não inventa o que é
 * razoável para uma espessura de madeira — inventar limite seria opinião
 * disfarçada de medição.
 */
export function lerLiberdade(declarada) {
  const texto = String(declarada ?? '').trim();
  const partes = texto.split(':');
  if (partes.length !== 3) {
    throw new Error(`liberdade '${texto}' precisa ser caminho:min..max:passos`);
  }
  const [caminho, faixa, passosTexto] = partes;
  const limites = faixa.split('..');
  if (limites.length !== 2) throw new Error(`faixa de '${caminho}' precisa ser min..max`);
  const min = Number(limites[0]);
  const max = Number(limites[1]);
  const passos = Number(passosTexto);
  if (!Number.isFinite(min) || !Number.isFinite(max) || min >= max) {
    throw new Error(`faixa de '${caminho}' precisa ser numérica e crescente, recebi '${faixa}'`);
  }
  if (!Number.isInteger(passos) || passos < 2) {
    throw new Error(`passos de '${caminho}' precisa ser inteiro ≥ 2, recebi '${passosTexto}'`);
  }
  const valores = Array.from(
    { length: passos },
    (_, i) => min + ((max - min) * i) / (passos - 1),
  );
  return { caminho: caminho.split('.'), rotulo: caminho, valores };
}

function produto(liberdades) {
  return liberdades.reduce(
    (acumulado, liberdade) => acumulado.flatMap(
      (combinacao) => liberdade.valores.map((v) => [...combinacao, { caminho: liberdade.caminho, rotulo: liberdade.rotulo, valor: v }]),
    ),
    [[]],
  );
}

/**
 * Lote: mede a grade inteira e devolve os sobreviventes ordenados.
 *
 * `objetivo` é `{ modo: 'alvo'|'maximizar'|'minimizar', alvo? }`. Sem objetivo
 * declarado o resultado sai sem ordem, porque ordenar sem critério declarado é
 * escolher no lugar de quem pediu.
 */
export function varrerLote(receita, {
  liberdades: declaradas = [],
  criterio: criterioDeclarado = 'menor-folga',
  objetivo = null,
  orcamento = ORCAMENTO_PADRAO,
} = {}) {
  if (!declaradas.length) throw new Error('o lote precisa de pelo menos uma liberdade: caminho:min..max:passos');
  const criterio = lerCriterio(criterioDeclarado);
  const liberdades = declaradas.map(lerLiberdade);
  const grade = produto(liberdades);
  if (grade.length > orcamento) {
    throw new Error(
      `a grade tem ${grade.length} combinações e o orçamento é ${orcamento}.`
      + ' Reduza passos, reduza liberdades, ou declare --orcamento maior de propósito.',
    );
  }

  const params = receita.PARAMS ?? {};
  const base = avaliarVariante(receita, params, criterio);
  if (!base.ok) throw new Error(`a receita não mede na base: ${base.recusa}`);

  const candidatos = [];
  for (const combinacao of grade) {
    let novos = params;
    for (const { caminho, valor } of combinacao) novos = comCaminho(novos, caminho, valor);
    const r = avaliarVariante(receita, novos, criterio);
    const valores = Object.fromEntries(combinacao.map((c) => [c.rotulo, c.valor]));
    if (!r.ok) {
      candidatos.push({ valores, estado: 'recusado', motivo: r.recusa, valor: null, custo: null });
      continue;
    }
    if (quebrou(base.invariantes, r)) {
      candidatos.push({ valores, estado: 'quebrou', motivo: 'perdeu parte, ganhou órfão ou face sem identidade', valor: r.valor, custo: null });
      continue;
    }
    candidatos.push({
      valores,
      estado: 'viavel',
      motivo: null,
      valor: r.valor,
      custo: { interpenetracoes: r.invariantes.interpenetracoes - base.invariantes.interpenetracoes },
    });
  }

  const viaveis = candidatos.filter((c) => c.estado === 'viavel' && c.valor !== null);
  if (objetivo) {
    const chave = objetivo.modo === 'alvo'
      ? (c) => Math.abs(c.valor - objetivo.alvo)
      : (c) => (objetivo.modo === 'maximizar' ? -c.valor : c.valor);
    /* Desempate declarado, como na sonda N5: primeiro o objetivo, depois o
       menor custo em interpenetração. Ordem estável, sem sorte. */
    viaveis.sort((a, b) => (chave(a) - chave(b)) || (a.custo.interpenetracoes - b.custo.interpenetracoes));
  }

  /* Só o primeiro colocado ganha enquadramento: é o único que alguém vai olhar
     em seguida, e cada captura custa ~3 s. */
  let olhar = { partes: [], proporcao: null };
  if (objetivo && viaveis.length) {
    let escolhido = params;
    for (const [rotulo, valor] of Object.entries(viaveis[0].valores)) {
      escolhido = comCaminho(escolhido, rotulo.split('.'), valor);
    }
    olhar = partesMovidas(receita, escolhido);
  }

  return {
    criterio: criterio.nome,
    unidade: criterio.unidade,
    escala: criterio.escala,
    objetivo,
    base: { valor: base.valor, invariantes: base.invariantes },
    candidatos,
    viaveis,
    movidas: olhar.partes,
    proporcao: olhar.proporcao,
    variantes: grade.length,
  };
}

/**
 * Quais partes se moveram entre a base e um candidato, da que mais andou para a
 * que menos andou.
 *
 * Compara a caixa de cada parte e usa o maior deslocamento de canto como
 * medida. Nomes semânticos, nunca índice: é a mesma identidade que a bancada
 * usa em `--selecionadas`.
 */
export function partesMovidas(receita, paramsCandidato, { minimo = EPSILON_EFEITO } = {}) {
  const medir = (params) => {
    const { neutro } = executarReceita(receitaComParametros(receita, params));
    return new Map(descreverPeca(neutro).partes.map((p) => [p.nome, p]));
  };
  const base = medir(receita.PARAMS ?? {});
  const candidato = medir(paramsCandidato);
  const movidas = [];
  for (const [nome, antes] of base) {
    const depois = candidato.get(nome);
    if (!depois) { movidas.push({ nome, deslocamento: Infinity }); continue; }
    const deslocamento = Math.max(
      ...[0, 1, 2].map((i) => Math.max(
        Math.abs(depois.min[i] - antes.min[i]),
        Math.abs(depois.max[i] - antes.max[i]),
      )),
    );
    if (deslocamento > minimo) movidas.push({ nome, deslocamento });
  }
  const caixas = [...base.values()];
  const extensao = (i) => Math.max(...caixas.map((p) => p.max[i])) - Math.min(...caixas.map((p) => p.min[i]));
  const largura = Math.min(extensao(0), extensao(2));
  return {
    partes: movidas.sort((a, b) => b.deslocamento - a.deslocamento),
    /* Serve para escolher a resolução da vista, não para julgar a peça. */
    proporcao: largura > 0 ? extensao(1) / largura : null,
  };
}

/**
 * A linha de bancada que a MEDIÇÃO escolheu.
 *
 * Hoje o enquadramento é palpite, e cada palpite custa uma captura de ~3 s — a
 * chamada mais cara do laço. A varredura já sabe quais partes andaram entre a
 * base e o candidato, e isso decide onde olhar melhor do que a intuição de quem
 * nunca viu a peça. Duas partes viram `--par`, que é o enquadramento de encaixe;
 * uma vira `isolar --focar`; três ou mais pedem `contexto`, porque forma
 * impossível passa isolada (V-25). `--cores` sempre: sem ele, partes do mesmo
 * material leem como um borrão só.
 *
 * É sugestão, não execução: quem olha continua decidindo o que olhar.
 */
export function sugerirEnquadramento(alvo, movidas, { limite = 4, proporcao = null } = {}) {
  if (!movidas.length) return null;
  const nomes = movidas.slice(0, limite).map((m) => m.nome);
  /* Peça alta e estreita num quadro deitado sobra fundo, e é assim que nasce o
     V-25: forma julgada em pouco pixel. A cadeira ocupa 19% da largura no
     quadro padrão, medido. A bancada avisa disso DEPOIS de gastar a captura;
     sugerir a resolução junto poupa a segunda rodada.

     O limiar aqui é do MODELO (altura contra a menor das duas medidas de
     planta), não o da bancada, que compara o enquadramento já projetado de uma
     vista. Copiar o número dela seria fingir que medimos a mesma coisa. 1,5 é
     conservador: abaixo disso um quadro deitado ainda serve. */
  const res = proporcao !== null && proporcao >= 1.5 ? ' --res=1280x1707' : '';
  if (nomes.length === 1) {
    return `npm run bancada -- ${alvo} --cores --selecionadas=${nomes[0]} --modo=isolar --focar${res}`;
  }
  if (nomes.length === 2) {
    return `npm run bancada -- ${alvo} --cores --par=${nomes.join(',')}${res}`;
  }
  return `npm run bancada -- ${alvo} --cores --selecionadas=${nomes.join(',')} --modo=contexto${res}`;
}

const RODAPE = 'Isto são CANDIDATOS medidos, não uma decisão: nada foi aplicado à receita.';

function numero(valor, escala, casas = 2) {
  if (valor === null || valor === undefined) return '—';
  const n = valor * escala;
  const arredondado = n.toFixed(casas);
  /* Nunca imprimir "0.00" para efeito que existe. Um parâmetro que move a folga
     em 1,2 µm aparecendo como "+0.00 mm" ao lado da etiqueta "MOVE O CRITÉRIO"
     é uma contradição na cara de quem lê, e a leitura provável — "isto aqui é
     ruído" — pode estar certa ou errada. Mostrar o número deixa a decisão com
     quem decide. */
  if (n !== 0 && Number(arredondado) === 0) return n.toPrecision(2);
  return arredondado;
}

export function formatarSensibilidade(resultado, { alvo = 'receita' } = {}) {
  const { escala, unidade } = resultado;
  const linhas = [
    `SENSIBILIDADE DE ${alvo} — critério ${resultado.criterio}, ±${Math.round(resultado.delta * 100)}%`,
    `  base: ${numero(resultado.base.valor, escala)} ${unidade}`
    + `, ${resultado.base.invariantes.interpenetracoes} interpenetração(ões)`
    + `, ${resultado.variantes} variantes medidas`,
  ];

  const movem = resultado.efeitos.filter((e) => e.move);
  if (movem.length) {
    linhas.push('', `  MOVEM O CRITÉRIO (${movem.length})`);
    for (const efeito of movem) {
      linhas.push(`    ${efeito.caminho} = ${efeito.valor}`);
      for (const s of efeito.sondas) {
        const seta = s.fator < 1 ? '−' : '+';
        if (s.recusa) {
          linhas.push(`      ${seta}  motor recusa: ${s.recusa}`);
          continue;
        }
        const custo = s.quebrou
          ? 'QUEBRA A PEÇA'
          : (s.deltaInterpenetracoes ? `${s.deltaInterpenetracoes > 0 ? '+' : ''}${s.deltaInterpenetracoes} interpenetração(ões)` : 'sem custo');
        const efeitoTexto = s.deltaCriterio === null
          ? 'critério indefinido'
          : `${s.deltaCriterio >= 0 ? '+' : ''}${numero(s.deltaCriterio, escala)} ${unidade}`;
        linhas.push(`      ${seta}  ${efeitoTexto}   ${custo}`);
      }
    }
  }

  const inertes = resultado.efeitos.filter((e) => !e.move);
  if (inertes.length) {
    linhas.push('', `  SEM EFEITO (${inertes.length}): ${inertes.map((e) => e.caminho).join(', ')}`);
  }
  if (!movem.length) {
    linhas.push('', '  Nenhum parâmetro move este critério. Confira `npm run parametros`:');
    linhas.push('  receita com PASSOS literais não responde a parâmetro nenhum.');
  }
  linhas.push(...linhasDeEnquadramento(resultado, alvo));
  linhas.push('', `  ${RODAPE}`);
  return `${linhas.join('\n')}\n`;
}

/** A vista que a medição escolheu, quando houve o que ver. */
function linhasDeEnquadramento(resultado, alvo) {
  const comando = sugerirEnquadramento(alvo, resultado.movidas, { proporcao: resultado.proporcao });
  if (!comando) return [];
  const nomes = resultado.movidas.slice(0, 4).map((m) => m.nome).join(', ');
  return ['', `  ONDE OLHAR — a medição escolheu, não o palpite: ${nomes}`, `    ${comando}`];
}

export function formatarLote(resultado, { alvo = 'receita', mostrar = 5 } = {}) {
  const { escala, unidade } = resultado;
  const recusados = resultado.candidatos.filter((c) => c.estado === 'recusado').length;
  const quebrados = resultado.candidatos.filter((c) => c.estado === 'quebrou').length;
  const linhas = [
    `LOTE DE ${alvo} — critério ${resultado.criterio}, ${resultado.variantes} combinações`,
    `  base: ${numero(resultado.base.valor, escala)} ${unidade}`
    + `  |  viáveis ${resultado.viaveis.length}, recusadas ${recusados}, quebraram ${quebrados}`,
  ];
  if (resultado.objetivo) {
    const alvoTexto = resultado.objetivo.modo === 'alvo'
      ? `alvo ${numero(resultado.objetivo.alvo, escala)} ${unidade}`
      : resultado.objetivo.modo;
    linhas.push(`  objetivo: ${alvoTexto}`);
  } else {
    linhas.push('  sem objetivo declarado: a lista sai na ordem da grade, não ordenada por mérito.');
  }

  const lista = resultado.viaveis.slice(0, mostrar);
  if (lista.length) {
    linhas.push('', `  CANDIDATOS (${lista.length} de ${resultado.viaveis.length})`);
    for (const c of lista) {
      const valores = Object.entries(c.valores).map(([k, v]) => `${k}=${Number(v.toFixed(6))}`).join('  ');
      const custo = c.custo.interpenetracoes
        ? `  ${c.custo.interpenetracoes > 0 ? '+' : ''}${c.custo.interpenetracoes} interpenetração(ões)`
        : '';
      linhas.push(`    ${numero(c.valor, escala)} ${unidade}   ${valores}${custo}`);
    }
  } else {
    linhas.push('', '  NENHUM CANDIDATO VIÁVEL. A faixa declarada não contém solução que preserve a peça.');
  }
  linhas.push(...linhasDeEnquadramento(resultado, alvo));
  linhas.push('', `  ${RODAPE}`);
  return `${linhas.join('\n')}\n`;
}
