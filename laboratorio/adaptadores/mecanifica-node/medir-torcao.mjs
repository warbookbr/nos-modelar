#!/usr/bin/env node
/* medir-torcao.mjs — instrumento: mede a torção das faces de uma cabeça de
 * `inflate` sob variação de `lados` e `expoenteSecao`, e mede junto a caixa
 * envolvente, que é o que prova se a forma mudou.
 *
 * ESTE É O ÚNICO ARQUIVO DO LABORATÓRIO QUE PODE CITAR A MECANIFICA, e a guarda
 * `arquitetura:lab:check` é quem garante isso. A direção é sempre laboratório →
 * portas públicas da Mecanifica; nunca o contrário.
 *
 * Ele NÃO conclui nada. Devolve medida em JSON com a versão do instrumento e os
 * parâmetros efetivos, e quem julga é o plano de evidências, do lado Python.
 * Instrumento que decide se a própria saída prova a hipótese é instrumento que
 * se aprova sozinho.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '../../..');
export const VERSAO = '1.1.0';

const RECEITA = join(REPO, 'prototipos/procedural/v3/armas/machado-de-guerra.js');

/* A medida sozinha não diz de QUE peça ela é. A receita mudou no meio do
   primeiro estudo — os índices de face do olho deixaram de ser literais — e a
   conclusão publicada apontava para um objeto ambíguo. O hash dos BYTES do
   arquivo resolve isso sem depender de ninguém lembrar. */
export function hashDe(caminho) {
  return `sha256:${createHash('sha256').update(readFileSync(caminho)).digest('hex')}`;
}

const { executarReceita } = await import(pathToFileURL(join(REPO, 'src/autoria/executar-receita.js')).href);
const { prepararParaMicropoligono } = await import(
  pathToFileURL(join(REPO, 'modulos/preparo-micropoligono/src/preparar.js')).href
);
const receitaModulo = await import(
  pathToFileURL(join(REPO, 'prototipos/procedural/v3/armas/machado-de-guerra.js')).href
);

/* Torção e caixa da MESMA execução. A caixa entra porque a pergunta não é só
   "a torção cai": é "cai sem mudar a forma". Sem essa segunda medida, baixar a
   torção achatando a peça passaria por sucesso. */
export function medir({ lados, expoenteSecao }) {
  const base = receitaModulo.default;
  /* Os PASSOS, não os PARAMS. A receita calcula contornos e argumentos no
     CARREGAMENTO do módulo, a partir de `P.cabeca`; trocar `receita.PARAMS`
     depois disso não muda passo nenhum. A primeira versão deste instrumento
     fazia exatamente isso e devolveu vinte e cinco medidas IDÊNTICAS, com cara
     de varredura. Instrumento que não mede nada e responde mesmo assim é pior
     que instrumento que falha. */
  const PASSOS = base.PASSOS.map((passo) => (
    passo[0] === 'inflate' ? ['inflate', { ...passo[1], lados, expoenteSecao }] : passo
  ));
  if (!PASSOS.some((p) => p[0] === 'inflate')) {
    throw new Error('medir-torcao: a receita não tem passo `inflate` — o instrumento não se aplica a ela.');
  }
  const receita = { ...base, PASSOS };
  const { neutro } = executarReceita(receita);
  const gritos = (neutro.orfaos ?? []).length;
  const malha = { vertices: neutro.V, faces: neutro.F };
  const preparo = prepararParaMicropoligono(malha, { tolerânciaPlanaridade: 0 });
  const desvios = preparo.achados
    .filter((a) => a.codigo === 'face-torta')
    .map((a) => a.onde.desvio)
    .sort((a, b) => a - b);

  const caixa = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
  for (const [, f] of neutro.F.entries()) {
    for (const v of f.vs) {
      const p = neutro.V.get(v);
      for (let k = 0; k < 3; k++) {
        if (p[k] < caixa.min[k]) caixa.min[k] = p[k];
        if (p[k] > caixa.max[k]) caixa.max[k] = p[k];
      }
    }
  }

  return {
    parametros: { lados, expoenteSecao },
    gritos,
    triangulos: preparo.resumo.triangulos,
    torcaoMaxima: desvios.length ? desvios[desvios.length - 1] : 0,
    torcaoMediana: desvios.length ? desvios[Math.floor(desvios.length / 2)] : 0,
    facesTortas: desvios.length,
    caixa: {
      min: caixa.min.map((n) => Number(n.toFixed(6))),
      max: caixa.max.map((n) => Number(n.toFixed(6))),
    },
  };
}

/* CANÁRIO: duas configurações que TÊM de diferir. Ele roda antes da varredura e
   derruba o instrumento se as medidas vierem iguais — que foi exatamente o modo
   de falha da primeira versão. Canário com resposta conhecida antes de qualquer
   medida é exigência do desenho (seção 16.2), e esta é a razão prática dela. */
export function canario() {
  const a = medir({ lados: 10, expoenteSecao: 6 });
  const b = medir({ lados: 26, expoenteSecao: 30 });
  if (a.triangulos === b.triangulos && a.torcaoMaxima === b.torcaoMaxima) {
    throw new Error(
      'medir-torcao: o canário falhou — dois parâmetros diferentes deram medida idêntica, '
      + 'então o instrumento não está aplicando os parâmetros. Nenhuma varredura foi feita.',
    );
  }
  return { a, b };
}

const executadoComoCLI = process.argv[1]
  && pathToFileURL(process.argv[1]).href === import.meta.url;
if (executadoComoCLI) {
  canario();

  /* DOMÍNIO PRIMEIRO. `lados` parecia parâmetro livre e não é: mais lados
     estreita cada face, e o furo do olho precisa CABER numa face só. Varrer
     `lados` sem conferir isso gerou 21 execuções gritando na primeira rodada
     deste estudo, e medir a torção de uma peça cujo furo não abriu não responde
     pergunta nenhuma. Então o instrumento primeiro descobre onde pode medir. */
  const ladosViaveis = [];
  for (const lados of [10, 14, 18, 22, 26]) {
    const teste = medir({ lados, expoenteSecao: 14 });
    if (teste.gritos === 0) ladosViaveis.push(lados);
  }

  const combinacoes = [];
  for (const lados of ladosViaveis) {
    for (const expoenteSecao of [6, 10, 14, 20, 30]) combinacoes.push({ lados, expoenteSecao });
  }
  const medidas = combinacoes.map(medir);
  process.stdout.write(JSON.stringify({
    instrumento: 'mecanifica.inflate-torcao',
    versao: VERSAO,
    peca: 'machado-de-guerra',
    entradas: {
      receita: hashDe(RECEITA),
      instrumento: hashDe(fileURLToPath(import.meta.url)),
    },
    dominio: {
      ladosTestados: [10, 14, 18, 22, 26],
      ladosViaveis,
      motivoDaExclusao: 'o furo do olho precisa caber numa face só, e mais lados estreita a face',
    },
    medidas,
  }, null, 2));
}
