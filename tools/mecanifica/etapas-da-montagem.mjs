#!/usr/bin/env node
/* etapas-da-montagem.mjs — o registro de etapas de uma montagem v5, em disco,
 * e a única porta para fixar uma etapa.
 *
 * O laço constrói um objeto uma parte por vez. A regra de quando uma etapa
 * pode ficar fixa não mora na skill, que é texto e cede sob pressão de
 * terminar: mora aqui. Fixar exige, nesta ordem, que a etapa seja a próxima,
 * que o crítico tenha fechado a peça dela (`parar-fechou` nas rodadas), que a
 * última rodada traga a nota de passagem, que as juntas da etapa passem, e o
 * aceite da pessoa.
 *
 * O registro fica ao lado da montagem, em `<montagem>.etapas.json`.
 *
 * Uso:
 *   node tools/mecanifica/etapas-da-montagem.mjs <montagem.json>
 *   node tools/mecanifica/etapas-da-montagem.mjs <montagem.json> --fixar <instância> --por <quem> [--observacao <texto>]
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { lerMontagemPersistida } from '../../src/autoria/ler-montagem-persistida.js';
import { resolverMontagemPersistida } from '../../src/autoria/resolver-montagem-persistida.js';
import {
  ErroEtapaDeConstrucao, atualizarRegistro, fixarEtapa, juntasPorEtapa, proximaEtapa,
} from '../../src/autoria/etapas-de-construcao.js';
import { proximaAcao } from '../../src/autoria/laco-de-modelagem.js';
import { carregadoresDeReceitas } from './peca-com-parametros.mjs';
import { lerRodadas } from './rodada-de-modelagem.mjs';
import { resolverCaminhoReceita } from './resolver-caminho-receita.mjs';

export const arquivoDoRegistro = (arquivoMontagem) => arquivoMontagem.replace(/\.json$/, '.etapas.json');

/* As receitas que a montagem cita, carregadas pelo nome curto. Uma receita
   exporta o objeto como `default` ou como `receita`. */
async function receitasDaMontagem(montagem) {
  const receitas = {};
  for (const { alvo } of montagem.instancias) {
    if (alvo.tipo !== 'peca' || receitas[alvo.ref]) continue;
    const modulo = await import(pathToFileURL(resolverCaminhoReceita(alvo.ref)).href);
    const receita = modulo.default ?? modulo.receita;
    if (!receita?.PASSOS) throw new Error(`a receita '${alvo.ref}' não exporta o objeto da receita como default.`);
    receitas[alvo.ref] = receita;
  }
  return receitas;
}

export async function estadoDasEtapas(arquivoMontagem, { receitas, anterior } = {}) {
  const dado = JSON.parse(readFileSync(arquivoMontagem, 'utf8'));
  const montagem = lerMontagemPersistida(dado);
  const carregadores = carregadoresDeReceitas(receitas ?? await receitasDaMontagem(montagem));
  const resolvida = await resolverMontagemPersistida(dado, carregadores);
  const registroAnterior = anterior !== undefined ? anterior
    : existsSync(arquivoDoRegistro(arquivoMontagem)) ? JSON.parse(readFileSync(arquivoDoRegistro(arquivoMontagem), 'utf8')) : null;
  return { montagem, registro: atualizarRegistro(montagem.id, juntasPorEtapa(resolvida, montagem.etapas), registroAnterior) };
}

/* As condições que moram nas rodadas da peça da etapa. `rodadasDe(ref)` é
   injetável para o teste; por padrão lê a pasta de rodadas da peça. */
export function conferirRodadasDaEtapa(montagem, instancia, rodadasDe = (ref) => lerRodadas(ref)) {
  const ref = montagem.instancias.find((item) => item.id === instancia)?.alvo.ref;
  const rodadas = ref ? rodadasDe(ref) : [];
  const decisao = proximaAcao(rodadas);
  if (decisao.acao !== 'parar-fechou') {
    throw new ErroEtapaDeConstrucao('etapa-sem-critico', `'${instancia}' ainda não foi fechada pelo crítico: ${decisao.acao} — ${decisao.motivo}`);
  }
  if (!rodadas.at(-1).notaDePassagem) {
    throw new ErroEtapaDeConstrucao('etapa-sem-nota', `a última rodada de '${instancia}' não traz 'notaDePassagem' para o modelador seguinte.`);
  }
}

export async function fixar(arquivoMontagem, instancia, aceite, opcoes = {}) {
  const { montagem, registro } = await estadoDasEtapas(arquivoMontagem, opcoes);
  const proxima = proximaEtapa(registro);
  /* A ordem é conferida antes das rodadas, para a mensagem apontar a etapa
     certa quando alguém tenta pular. */
  if (proxima?.instancia === instancia) conferirRodadasDaEtapa(montagem, instancia, opcoes.rodadasDe);
  return fixarEtapa(registro, instancia, aceite);
}

function gravar(arquivoMontagem, registro) {
  writeFileSync(arquivoDoRegistro(arquivoMontagem), `${JSON.stringify(registro, null, 2)}\n`, 'utf8');
}

const descrever = (registro) => registro.etapas
  .map(({ instancia, estado, juntas }) => `  ${estado.padEnd(9)} ${instancia}${juntas.length
    ? ` — ${juntas.map((j) => `${j.relacao} ${j.satisfeita ? 'passa' : 'REPROVA'}`).join(', ')}` : ''}`)
  .join('\n');

async function comoCLI(argv) {
  const arquivo = argv.find((a) => !a.startsWith('--') && a.endsWith('.json'));
  if (!arquivo) return { codigo: 1, texto: 'diga a montagem: etapas-da-montagem.mjs <montagem.json> [--fixar <instância> --por <quem>]' };
  const caminho = resolve(arquivo);
  const valor = (nome) => { const i = argv.indexOf(nome); return i >= 0 ? argv[i + 1] : undefined; };
  const instancia = valor('--fixar');
  const registro = instancia
    ? await fixar(caminho, instancia, { por: valor('--por'), observacao: valor('--observacao') })
    : (await estadoDasEtapas(caminho)).registro;
  gravar(caminho, registro);
  const proxima = proximaEtapa(registro);
  return {
    codigo: 0,
    texto: `${instancia ? `etapa '${instancia}' fixa.\n` : ''}${descrever(registro)}\n`
      + `próxima etapa: ${proxima ? `${proxima.instancia} (${proxima.estado})` : 'nenhuma; todas fixas.'}`,
  };
}

if (process.argv[1] && process.argv[1].endsWith('etapas-da-montagem.mjs')) {
  comoCLI(process.argv.slice(2)).then(({ codigo, texto }) => {
    (codigo === 0 ? console.log : console.error)(texto);
    process.exit(codigo);
  }).catch((erro) => {
    console.error(`etapas-da-montagem: ${erro.codigo ? `[${erro.codigo}] ` : ''}${erro.message}`);
    process.exit(1);
  });
}
