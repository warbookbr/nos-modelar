#!/usr/bin/env node
/* guarda-tempo-do-descrever.mjs — o `descrever` da peça mais pesada do acervo cabe no orçamento de tempo.
 *
 * O PROBLEMA QUE ELE PEGA. O contato entre partes percorria todos os triângulos da outra malha para cada ponto amostrado, e
 * o `descrever` do furgão realista (160 mil faces em 25 partes) levou 862 s com perfil, 90,5% deles numa função só
 * (`pontoDentroMalha`). Nada reprovava: o veredito saía certo, só devagar, e a lentidão aparecia como o gate do acervo que
 * ninguém esperava terminar. Um resultado certo que demora quinze minutos deixa de ser rodado, e instrumento que não é
 * rodado volta a ser conselho. Esta guarda mede o tempo do `descrever` e reprova com o número, o orçamento e a peça.
 *
 * POR QUE ESTA PEÇA. O furgão realista é a de mais faces do acervo (160.284; a segunda tem uma ordem de grandeza menos) e a
 * única em que a lentidão apareceu a olho: nas outras o custo cabia na guarda do acervo sem se notar. É o pior caso conhecido,
 * então o que cabe nele cabe nas demais. Se a peça encolher abaixo de `FACES_MINIMAS`, a guarda reprova pedindo outra peça e
 * novo orçamento, porque o tempo de uma peça pequena não diz nada sobre o contato entre malhas grandes.
 *
 * POR QUE ESTE NÚMERO. Medido em 2026-11-03, em máquina de quatro processadores dividida com outras sessões (carga entre 4 e 12):
 * o `descrever` completo do furgão levou 904,9 s sem a árvore de caixas e 60,9 s com ela, com a saída idêntica linha a linha.
 * O orçamento de 180 s dá três vezes de folga sobre o tempo de hoje, para a máquina do CI e para a peça crescer um pouco, e
 * fica cinco vezes abaixo do tempo de antes, de modo que voltar à varredura de todos os triângulos reprova com folga. Ele mede
 * o tempo de parede de uma chamada de `descreverPecaReutilizavel` num processo novo, sem cache de execução anterior.
 *
 * Em 2026-11-09 a janela da cabine em dois vidros (253 mil faces) pôs oito vãos na booleana da chapa inteira, e o `descrever`
 * levou 202,8 s no CI; a lentidão é da execução da receita, e não do contato, e o plano
 * `docs/modelar/planos/2026-11-09-abertura-na-vizinhanca-de-todo-vao.md` a desfaz. O orçamento vai a 300 s até lá, ainda três
 * vezes abaixo da varredura de todos os triângulos, e volta a 180 s com o fechamento daquele plano.
 *
 * Mudar o orçamento pede uma medição nova, escrita aqui. Subir o número para a guarda passar é esconder a lentidão. */
import { pathToFileURL } from 'node:url';
import { descreverPecaReutilizavel } from '../descrever-peca.mjs';

export const PECA_DA_MEDIDA = 'furgao-realista';
export const FACES_MINIMAS = 150_000;
export const ORCAMENTO_EM_SEGUNDOS = 300;

/** O veredito, sem medir nada: recebe o tempo e as faces e diz se passa e o que escrever. */
export function conferirTempo({ peca = PECA_DA_MEDIDA, segundos, faces, orcamento = ORCAMENTO_EM_SEGUNDOS, facesMinimas = FACES_MINIMAS }) {
  if (!Number.isFinite(segundos) || !Number.isFinite(faces)) {
    return { ok: false, mensagem: `guarda:tempo — não consegui medir o descrever de '${peca}' (tempo ${segundos}, faces ${faces}).` };
  }
  if (faces < facesMinimas) {
    return {
      ok: false,
      mensagem: `guarda:tempo — '${peca}' tem ${faces} faces e a medida pede ao menos ${facesMinimas}.\n`
        + '  A peça encolheu e o tempo dela já não diz nada sobre o contato entre malhas grandes: escolha a peça mais pesada do acervo'
        + ' e meça o orçamento de novo (o cabeçalho de guarda-tempo-do-descrever.mjs diz como).',
    };
  }
  const medido = `${segundos.toFixed(1)} s`;
  if (segundos > orcamento) {
    return {
      ok: false,
      mensagem: `guarda:tempo — o descrever de '${peca}' levou ${medido} e o orçamento é ${orcamento} s (${faces} faces).\n`
        + '  O contato entre partes voltou a percorrer malha demais: procure o que passou a rodar por ponto ou por par sem a árvore de caixas'
        + ' (src/autoria/contato-de-solidos.js) ou sem a memória da execução (criarMemoriaDeAuditoria).',
    };
  }
  return { ok: true, mensagem: `guarda:tempo ok — o descrever de '${peca}' levou ${medido}, dentro do orçamento de ${orcamento} s (${faces} faces).` };
}

async function medir(peca) {
  const inicio = performance.now();
  const r = await descreverPecaReutilizavel({ peca });
  const segundos = (performance.now() - inicio) / 1000;
  return { segundos, faces: r.resultado?.descricao?.totais?.faces };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const medida = await medir(PECA_DA_MEDIDA);
  const veredito = conferirTempo(medida);
  (veredito.ok ? console.log : console.error)(veredito.mensagem);
  process.exit(veredito.ok ? 0 : 1);
}
