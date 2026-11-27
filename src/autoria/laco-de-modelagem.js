/* laco-de-modelagem.js — quem decide se a modelagem continua, e por quê.
 *
 * A decisão de parar não pode ser de quem modelou. Enquanto ela for, "está bom"
 * é a resposta mais barata disponível no fim de uma tarefa longa, e foi assim
 * que uma prancha torta virou "está reta, seguindo a linha corretamente". Aqui
 * a decisão sai de três números: quantos defeitos o revisor apontou, qual nota
 * ele deu, e quantas rodadas já se passaram.
 *
 * A REGRA DA NÃO CONVERGÊNCIA existe porque laço que não fecha é pior do que
 * laço que reprova. Se o número de defeitos não cai por três rodadas seguidas,
 * o problema deixou de ser a geometria: ou o plano pede algo que a técnica
 * escolhida não faz, ou o revisor está apontando coisas diferentes a cada vez.
 * Continuar aí gasta rodada e ensina que o veredito é ruído.
 *
 * O REGISTRO É PARTE DO RESULTADO, e não um relatório. Cada rodada guarda o
 * veredito que a motivou e as medidas que rodaram, para que a pergunta "por que
 * esta peça está assim" tenha resposta depois que todo mundo esqueceu. */

import { normalizarVeredito, rodadaFechou } from './veredito-de-forma.js';

export const FORMATO_RODADA = 'mecanifica.rodada-de-modelagem';
export const VERSAO_RODADA = 1;

export const LIMITE_DE_RODADAS = 6;
export const RODADAS_SEM_PROGRESSO = 3;

export const ACOES = Object.freeze([
  'modelar', 'revisar', 'parar-fechou', 'parar-limite', 'parar-sem-convergencia',
]);

function falhar(mensagem) { throw new TypeError(`laço de modelagem: ${mensagem}`); }

/* Quem decidiu, quando e o quê, no molde `FORMATO_DE_QUEM`. É o formato do `por` de `rodadas/limite.json`, do `--motivo-dos-pontos` e da
   decisão da pessoa sobre uma rodada (`rodadas/decisoes-da-pessoa.json`). O texto cabe numa linha: quebra de linha e caractere de
   controle são recusados, porque o texto é impresso no resumo do laço e uma segunda linha ali se leria como linha da ferramenta. */
export const QUEM_DATA_PALAVRAS = /^[^,:\p{Cc}\p{Zl}\p{Zp}]{2,},[^\S\p{Cc}\p{Zl}\p{Zp}]*\d{4}-\d{2}-\d{2}:[^\S\p{Cc}\p{Zl}\p{Zp}]*\S[^\p{Cc}\p{Zl}\p{Zp}]{2,}$/u;
export const FORMATO_DE_QUEM = '"<quem decidiu>, <AAAA-MM-DD>: <as palavras ou o porquê>"';

const DATA_DE_QUEM = /^[^,:]{2,},\s*(\d{4})-(\d{2})-(\d{2}):/;
/* O dia (AAAA-MM-DD, em UTC) do instante ISO deslocado em horas. O dia de quem escreve é o do fuso dela, e o instante gravado é UTC:
   somar 14 h dá o dia mais adiantado que existe naquele instante, e tirar 12 h dá o mais atrasado. */
const diaDoInstante = (iso, horas) => new Date(Date.parse(iso) + horas * 3600e3).toISOString().slice(0, 10);

/**
 * O defeito do texto "quem, AAAA-MM-DD: palavras", ou `null` quando ele está certo: fora do molde ou em mais de uma linha, e a data que
 * não existe no calendário (mês 13, dia 30 de fevereiro). Com `ate` (instante ISO) recusa a data futura naquele instante, e com `desde`
 * (instante ISO) a data anterior a ele; os dois vêm de quem chama, e aqui não se lê relógio.
 */
export function defeitoDoTextoDeQuem(texto, { ate = null, desde = null, anteriorA = 'ao instante dado' } = {}) {
  if (typeof texto !== 'string') return 'não é texto';
  if (/[\p{Cc}\p{Zl}\p{Zp}]/u.test(texto)) return 'tem quebra de linha ou caractere de controle';
  if (!QUEM_DATA_PALAVRAS.test(texto)) return 'está fora do molde';
  const [, ano, mes, dia] = DATA_DE_QUEM.exec(texto);
  const data = `${ano}-${mes}-${dia}`;
  const real = new Date(Date.UTC(Number(ano), Number(mes) - 1, Number(dia)));
  if (Number(ano) < 1000 || real.getUTCMonth() !== Number(mes) - 1 || real.getUTCDate() !== Number(dia)) return `a data ${data} não existe no calendário`;
  if (ate !== null && data > diaDoInstante(ate, 14)) return `a data ${data} é futura: a gravação é de ${ate}, e o dia mais adiantado nesse instante é ${diaDoInstante(ate, 14)}`;
  if (desde !== null && data < diaDoInstante(desde, -12)) return `a data ${data} é anterior ${anteriorA}, de ${desde}`;
  return null;
}

/**
 * A decisão da pessoa sobre uma rodada, como vai gravada: o texto "quem, AAAA-MM-DD: as palavras dela", numa linha, sem as pontas em
 * branco. Recusa o que não está no formato, dizendo o recebido, o esperado e o comando que grava certo (`rodada` entra no comando); o
 * comando traz o molde, nunca palavras prontas, porque as palavras são só as que a pessoa disse. `ate` é o instante da gravação (a data
 * da decisão não pode ser futura) e `registradaEm` o da rodada (a pessoa não decide sobre a rodada antes de ela existir).
 */
export function normalizarDecisaoDaPessoa(valor, { peca = '<peça>', rodada = '<n>', ate = null, registradaEm = null } = {}) {
  const texto = typeof valor === 'string' ? valor.trim() : valor;
  const defeito = defeitoDoTextoDeQuem(texto, { ate, desde: registradaEm, anteriorA: `ao registro da rodada ${rodada}` });
  if (defeito) {
    falhar(`decisão da pessoa recebida: ${JSON.stringify(valor)} (${defeito}); esperado ${FORMATO_DE_QUEM}, numa linha só, com a data do dia em que a pessoa decidiu e as palavras dela. `
      + `Grave com \`node tools/modelar/rodada-de-modelagem.mjs ${peca} --decisao-da-pessoa ${FORMATO_DE_QUEM} --rodada ${rodada}\`.`);
  }
  return texto;
}

/**
 * Uma rodada registrada: o que o revisor apontou e o que as medidas disseram.
 * `medidas` é o resultado objetivo — a guarda do acervo passou ou não —, e ele
 * vem antes do veredito de propósito: peça que nem cumpre o plano não merece
 * olho humano nem de agente.
 */
export function registrarRodada({ peca, numero, veredito, medidas, partes, atrito = [], notaDePassagem, receita, superficie }) {
  if (typeof peca !== 'string' || peca.trim() === '') falhar('a rodada precisa dizer de que peça é.');
  if (!Number.isInteger(numero) || numero < 1) falhar('o número da rodada começa em 1.');
  if (!medidas || typeof medidas !== 'object') falhar("a rodada precisa trazer 'medidas'.");
  if (typeof medidas.passou !== 'boolean') falhar("'medidas.passou' precisa ser booleano.");
  /* O CRÍTICO NÃO JULGA O QUE A MEDIDA JÁ REPROVOU. A instrução de medir antes do crítico estava na skill do laço, e um veredito
     gravado sobre medida reprovada passava sem que nada reclamasse: a rodada guardava as duas coisas, e a seguinte lia os
     defeitos do crítico como se a receita medida fosse a que ele viu. A recusa é daqui, de quem registra, e vale para todo
     chamador. */
  if (veredito && !medidas.passou) {
    falhar(`as medidas reprovaram (${String(medidas.relatorio ?? '').trim() || 'sem relatório'}) e a rodada traz o veredito do crítico: `
      + 'o crítico só julga receita que passa nas medidas. Grave a rodada sem veredito, com o relatório da falha, e conserte a receita.');
  }

  return {
    formato: FORMATO_RODADA,
    versao: VERSAO_RODADA,
    peca: peca.trim(),
    numero,
    /* `faces` e `segundos` (a malha e o tempo da execução da receita medida) são da ferramenta de medição e só entram quando vêm
       números; as rodadas de antes não os têm e não são reescritas */
    medidas: {
      passou: medidas.passou,
      relatorio: String(medidas.relatorio ?? '').trim(),
      ...(Number.isInteger(medidas.faces) && medidas.faces >= 0 ? { faces: medidas.faces } : {}),
      ...(Number.isFinite(medidas.segundos) && medidas.segundos >= 0 ? { segundos: medidas.segundos } : {}),
    },
    /* Sem veredito quando as medidas reprovaram: não se gasta revisão em peça
       que já falhou no que é contável. */
    veredito: veredito ? normalizarVeredito(veredito) : null,
    /* A CONFERÊNCIA PARTE POR PARTE, do modelador. O contrato dele manda gerar
       as vistas e responder, por parte, se a forma e a técnica entregues são as
       que o `PLANO` promete. A instrução existia e nada conferia que alguém
       tinha olhado: entregar sem ter olhado produzia uma rodada idêntica à de
       quem olhou. Instrumento que nenhum gate exercita volta a ser conselho, e
       conselho cede sob pressão de terminar.

       Lista com uma entrada por parte declarada. `confere` falso é resposta
       legítima e pede `observacao` dizendo onde a entrega difere da promessa. */
    partes: normalizarConferenciaDePartes(partes),
    /* O ATRITO DA RODADA: operação que faltou no motor, coisa que só saiu
       porque alguém fez à mão, medida que não existia, documento errado. A
       skill do laço mandava registrar isso e não havia campo onde cair, então
       a lista vivia na conversa e morria com ela. Lista de frases curtas, e
       vazia quando a rodada não doeu em nada. */
    atrito: normalizarAtrito(atrito),
    /* A NOTA DE PASSAGEM: por que o modelador escolheu o que escolheu. O que
       ele fez fica na receita, o que tentou fica em `receita.diferenca`; o
       porquê só existe se ele escrever, e o modelador da etapa seguinte é
       outro agente, que não viu nada disto. Fixar uma etapa exige a nota na
       última rodada dela. */
    ...(notaDePassagem !== undefined && notaDePassagem !== null
      ? { notaDePassagem: normalizarNota(notaDePassagem) } : {}),
    /* O QUE ESTA RODADA MUDOU NA RECEITA, gerado pela ferramenta ao gravar:
       a impressão do texto julgado e a diferença para a rodada anterior. */
    ...(receita ? { receita: normalizarReceita(receita) } : {}),
    /* AS VISTAS DE SUPERFÍCIE QUE O CRÍTICO RECEBEU, na peça de lataria: por que ela é de lataria e os nomes das imagens da luz
       rasante e da curvatura da lataria do pacote que ele julgou. A ferramenta grava o campo ao conferir o pacote; sem ele, a peça
       de lataria não fecha (decisão da pessoa em 2026-10-30). */
    ...(superficie !== undefined && superficie !== null ? { superficie: normalizarSuperficie(superficie, veredito) } : {}),
  };
}

function normalizarSuperficie(valor, veredito) {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) falhar("'superficie' precisa ser objeto gerado pela ferramenta.");
  if (!veredito) falhar("'superficie' diz o que o crítico recebeu, e a rodada não traz veredito.");
  if (typeof valor.lataria !== 'string' || valor.lataria.trim() === '') falhar("'superficie.lataria' precisa dizer por que a peça é de lataria.");
  if (!Array.isArray(valor.imagens) || valor.imagens.length === 0 || valor.imagens.some((i) => typeof i !== 'string' || i.trim() === '')) {
    falhar("'superficie.imagens' precisa listar as imagens da luz rasante e da curvatura da lataria.");
  }
  return { lataria: valor.lataria.trim(), imagens: valor.imagens.map((i) => i.trim()) };
}

const LIMITE_NOTA_DE_PASSAGEM = 600;

function normalizarNota(valor) {
  if (typeof valor !== 'string' || valor.trim() === '') falhar("'notaDePassagem' precisa ser texto não vazio.");
  const limpa = valor.trim();
  if (limpa.length > LIMITE_NOTA_DE_PASSAGEM) falhar(`'notaDePassagem' não passa de ${LIMITE_NOTA_DE_PASSAGEM} caracteres.`);
  return limpa;
}

function normalizarReceita(valor) {
  if (!valor || typeof valor !== 'object') falhar("'receita' precisa ser objeto gerado pela ferramenta.");
  if (!/^sha256:[0-9a-f]{64}$/.test(valor.sha256 ?? '')) falhar("'receita.sha256' precisa ser a impressão sha256 do texto.");
  if (!valor.diferenca || !Array.isArray(valor.diferenca.linhas)) falhar("'receita.diferenca' precisa trazer as linhas.");
  return { sha256: valor.sha256, diferenca: valor.diferenca };
}

const LIMITE_OBSERVACAO_DE_PARTE = 240;

function normalizarConferenciaDePartes(valor) {
  if (valor === undefined || valor === null) {
    falhar("a rodada precisa trazer 'partes': uma entrada por parte declarada, dizendo se a forma"
      + ' e a técnica entregues são as que o PLANO promete. Rode `npm run vistas:critica` e olhe'
      + ' antes de responder.');
  }
  if (!Array.isArray(valor)) falhar("'partes' precisa ser lista.");
  if (valor.length === 0) falhar("'partes' vazia não é conferência; a peça tem partes declaradas.");
  return Object.freeze(valor.map((item, indice) => {
    if (!item || typeof item !== 'object') falhar(`'partes[${indice}]' precisa ser objeto.`);
    const nome = String(item.nome ?? '').trim();
    if (nome === '') falhar(`'partes[${indice}].nome' precisa nomear a parte do PLANO.`);
    if (typeof item.confere !== 'boolean') {
      falhar(`'partes[${indice}].confere' precisa ser booleano: a entrega bate com a promessa ou não.`);
    }
    const observacao = String(item.observacao ?? '').trim();
    if (!item.confere && observacao === '') {
      falhar(`'partes[${indice}]' não confere e não diz onde: escreva a diferença em 'observacao'.`);
    }
    if (observacao.length > LIMITE_OBSERVACAO_DE_PARTE) {
      falhar(`'partes[${indice}].observacao' não passa de ${LIMITE_OBSERVACAO_DE_PARTE} caracteres.`);
    }
    return Object.freeze({ nome, confere: item.confere, observacao });
  }));
}

const LIMITE_ATRITO = 16;
const LIMITE_FRASE_DE_ATRITO = 240;

function normalizarAtrito(valor) {
  if (valor === undefined || valor === null) return [];
  if (!Array.isArray(valor)) falhar("'atrito' precisa ser lista de frases.");
  if (valor.length > LIMITE_ATRITO) falhar(`'atrito' não passa de ${LIMITE_ATRITO} itens.`);
  return valor.map((item, i) => {
    if (typeof item !== 'string' || item.trim() === '') falhar(`'atrito[${i}]' precisa ser texto não vazio.`);
    const limpo = item.trim();
    if (limpo.length > LIMITE_FRASE_DE_ATRITO) falhar(`'atrito[${i}]' excede ${LIMITE_FRASE_DE_ATRITO} caracteres.`);
    return limpo;
  });
}

/**
 * O que fazer agora, dada a história da peça. Devolve a ação e o motivo em
 * texto, porque parada sem motivo escrito vira "achei que estava bom".
 */
export function proximaAcao(rodadas, opcoes = {}) {
  return comDecisaoGravada(decidir(rodadas, opcoes), rodadas, opcoes);
}

const PARADAS_QUE_A_PESSOA_LIBERA = new Set(['parar-limite', 'parar-sem-convergencia']);

/* A DECISÃO GRAVADA APARECE QUANDO MUDA A AÇÃO. Quando a história, sem a decisão da pessoa, pararia no limite ou sem convergência e a
   decisão gravada (`por`, as palavras dela) faz o laço seguir, o motivo diz isso e qual parada foi evitada: quem lê a ação sabe que
   a peça segue por decisão escrita, e de quem. Sem `por` (ninguém gravou decisão) o motivo sai como sempre. */
function comDecisaoGravada(decisao, rodadas, { por, notaMinima } = {}) {
  if (typeof por !== 'string' || por.trim() === '') return decisao;
  const semDecisao = decidir(rodadas, { notaMinima });
  if (!PARADAS_QUE_A_PESSOA_LIBERA.has(semDecisao.acao) || PARADAS_QUE_A_PESSOA_LIBERA.has(decisao.acao)) return decisao;
  return { ...decisao, motivo: `${decisao.motivo} Segue por decisão gravada em rodadas/limite.json (por: ${por.trim()}); sem ela a ação seria ${semDecisao.acao}.` };
}

function decidir(rodadas, { limite = LIMITE_DE_RODADAS, notaMinima = 8, convergenciaDesde = 1 } = {}) {
  if (!Array.isArray(rodadas)) falhar('a história da peça é uma lista de rodadas.');
  /* A DECISÃO DA PESSOA DEPOIS DA PARADA. Quando o laço para sem convergência e a pessoa manda seguir, a contagem recomeça na rodada
     que ela declarar (`convergenciaDesde`, gravado por quem chama): as rodadas julgadas antes dela não entram mais na conta, e três
     rodadas julgadas sem queda a partir dela param de novo. Sem a declaração a conta é sobre todas, como sempre. */
  if (!Number.isInteger(convergenciaDesde) || convergenciaDesde < 1) {
    falhar(`'convergenciaDesde' recebido: ${JSON.stringify(convergenciaDesde)}; esperado o número inteiro (1 ou mais) da rodada a partir da qual a convergência volta a contar.`);
  }
  /* A rodada declarada existe ou é a próxima a registrar. Um número adiante disso desligaria a parada para sempre, que é o que
     "sem limite" não diz: sem limite de rodadas, a peça que não converge ainda para. */
  const proxima = (rodadas.length ? Number(rodadas[rodadas.length - 1].numero) || rodadas.length : 0) + 1;
  if (convergenciaDesde > proxima) {
    falhar(`'convergenciaDesde' recebido: ${convergenciaDesde}; esperado no máximo ${proxima}, o número da próxima rodada a registrar `
      + `(as registradas são ${rodadas.length ? rodadas.map((r) => r.numero).join(', ') : 'nenhuma'}).`);
  }
  if (rodadas.length === 0) return { acao: 'modelar', motivo: 'nenhuma rodada ainda: a peça não existe.' };

  const ultima = rodadas[rodadas.length - 1];
  if (!ultima.medidas.passou) {
    return {
      acao: 'modelar',
      motivo: `as medidas reprovaram na rodada ${ultima.numero}; revisar antes de cumprir o plano é gastar rodada.`,
    };
  }
  if (!ultima.veredito) {
    return { acao: 'revisar', motivo: `a rodada ${ultima.numero} passou nas medidas e ainda não foi julgada.` };
  }

  const { fechou, nota, defeitos } = rodadaFechou(ultima.veredito, { notaMinima });
  if (fechou) {
    return { acao: 'parar-fechou', motivo: `sem defeitos apontados e nota ${nota} na rodada ${ultima.numero}.` };
  }

  const julgadas = rodadas.filter((r) => r.veredito && r.numero >= convergenciaDesde);
  if (julgadas.length >= RODADAS_SEM_PROGRESSO) {
    const ultimas = julgadas.slice(-RODADAS_SEM_PROGRESSO).map((r) => r.veredito.defeitos.length);
    const caiuAlgumaVez = ultimas.some((quantos, i) => i > 0 && quantos < ultimas[i - 1]);
    if (!caiuAlgumaVez) {
      return {
        acao: 'parar-sem-convergencia',
        motivo: `os defeitos não caíram em ${RODADAS_SEM_PROGRESSO} rodadas julgadas (${ultimas.join(', ')}); `
          + 'ou o plano pede o que a técnica não faz, ou o revisor está apontando outra coisa a cada vez.',
      };
    }
  }

  if (rodadas.length >= limite) {
    return {
      acao: 'parar-limite',
      motivo: `${rodadas.length} rodadas com ${defeitos} defeito(s) em aberto; o limite combinado é ${limite}.`,
    };
  }

  return { acao: 'modelar', motivo: `${defeitos} defeito(s) apontado(s) na rodada ${ultima.numero}.` };
}

const curto = (sha) => String(sha ?? '').replace(/^sha256:/, '').slice(0, 8);

/**
 * A ação dada a receita que existe agora. `proximaAcao` lê só as rodadas, e a medida dela é a que a sessão escreveu na última
 * rodada, sobre uma receita que pode já ter mudado. Aqui a medição é a da receita atual, identificada pelo hash do texto:
 * `receitaAtual` é `{ sha256, medicao: { passou, relatorio } }`, e a medição é a que a ferramenta fez agora, não a que alguém
 * declarou.
 *
 * - medição da receita atual reprovada: `modelar`, qualquer que seja o histórico, porque nada se revisa antes de passar;
 * - nenhuma rodada ainda e a medição passa: `revisar`, porque a receita existe e ninguém a julgou;
 * - receita igual à da última rodada: vale a decisão das rodadas (`proximaAcao`), e a medição que passou agora vale no lugar da
 *   que a rodada registrou reprovada, porque a receita é a mesma;
 * - receita diferente da última rodada (ou rodada sem hash gravado, de antes disto): o julgamento da rodada não é desta versão.
 *   Os limites do laço continuam valendo, mas `parar-fechou` e a correção que a rodada pediu não: a versão nova passa nas medidas
 *   e falta o crítico julgá-la, `revisar`.
 */
export function acaoDaReceita(rodadas, receitaAtual, opcoes = {}) {
  if (!Array.isArray(rodadas)) falhar('a história da peça é uma lista de rodadas.');
  const { sha256, medicao } = receitaAtual ?? {};
  if (!medicao || typeof medicao.passou !== 'boolean') falhar("a receita atual precisa trazer a medição ({ passou, relatorio }).");
  if (!medicao.passou) {
    return {
      acao: 'modelar',
      motivo: `a medição da receita atual (sha256:${curto(sha256)}) reprovou: ${String(medicao.relatorio ?? '').trim() || 'sem relatório'}; `
        + 'revisar antes de a medição passar é gastar o crítico.',
      medicaoReprovada: true,
    };
  }
  return comDecisaoGravada(acaoDaReceitaQuePassa(rodadas, receitaAtual, opcoes), rodadas, opcoes);
}

function acaoDaReceitaQuePassa(rodadas, receitaAtual, opcoes) {
  const { sha256 } = receitaAtual;
  const ultima = rodadas[rodadas.length - 1];
  if (!ultima) return { acao: 'revisar', motivo: `a receita existe (sha256:${curto(sha256)}), a medição dela passa e nenhuma rodada a julgou.` };
  if (!ultima.receita?.sha256) return decidir(rodadas, opcoes);
  if (ultima.receita.sha256 === sha256) {
    if (!ultima.medidas.passou) {
      return { acao: 'revisar', motivo: `a medição da receita atual (sha256:${curto(sha256)}) passa e ainda não foi julgada.` };
    }
    return decidir(rodadas, opcoes);
  }
  const decisao = decidir(rodadas, opcoes);
  if (decisao.acao === 'parar-limite' || decisao.acao === 'parar-sem-convergencia') return decisao;
  /* o texto mudou, mas a malha e o PLANO são os que o crítico julgou na rodada (quem chama compara com a cópia dela) */
  if (receitaAtual.mesmaFormaDaRodada === ultima.numero) {
    return {
      ...decisao,
      motivo: `a receita mudou depois da rodada ${ultima.numero} (sha256:${curto(ultima.receita.sha256)} para sha256:${curto(sha256)}), `
        + `mas produz a mesma malha e o mesmo PLANO que o crítico julgou; ${decisao.motivo}`,
    };
  }
  return {
    acao: 'revisar',
    motivo: `a receita mudou depois da rodada ${ultima.numero} (sha256:${curto(ultima.receita.sha256)} para sha256:${curto(sha256)}) e a medição `
      + 'da versão nova passa; o julgamento da rodada é da versão anterior e falta o crítico julgar esta.',
  };
}

/** Os defeitos que a rodada seguinte precisa corrigir, e nada além disso. */
export function defeitosAbertos(rodadas) {
  const julgadas = (rodadas ?? []).filter((r) => r.veredito);
  return julgadas.length ? julgadas[julgadas.length - 1].veredito.defeitos : [];
}
