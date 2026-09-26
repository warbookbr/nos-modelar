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
 *   node tools/mecanifica/etapas-da-montagem.mjs <montagem.json> --fixar <instância> --por <quem> [--observacao <texto>] [--aceite-humano]
 *   node tools/mecanifica/etapas-da-montagem.mjs <montagem.json> --reabrir <instância> --por "<quem, data: motivo>"
 *   node tools/mecanifica/etapas-da-montagem.mjs <montagem.json> --olhar [--vistas frontal,direita,isometrica]
 *
 * `--olhar` desenha juntas, em vista ortográfica, as etapas que já têm
 * geometria. A parte de cada etapa era mostrada sozinha, e a pessoa não
 * conseguia julgar o anel da cintura sem vê-lo sobre a base.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { lerMontagemPersistida } from '../../src/autoria/ler-montagem-persistida.js';
import { resolverMontagemPersistida } from '../../src/autoria/resolver-montagem-persistida.js';
import {
  ErroEtapaDeConstrucao, atualizarRegistro, fixarEtapa, juntasPorEtapa, lerAutorDaReabertura, proximaEtapa, reabrirEtapa,
} from '../../src/autoria/etapas-de-construcao.js';
import { proximaAcao } from '../../src/autoria/laco-de-modelagem.js';
import { capturarMontagem } from './capturar-montagem.mjs';
import { carregadoresDeReceitas } from './peca-com-parametros.mjs';
import { REPO } from './resolver-caminho-receita.mjs';
import { lerRodadas, limiteDaPeca } from './rodada-de-modelagem.mjs';
import { resolverCaminhoReceita } from './resolver-caminho-receita.mjs';

export const arquivoDoRegistro = (arquivoMontagem) => arquivoMontagem.replace(/\.json$/, '.etapas.json');

/* As receitas que a montagem cita, carregadas pelo nome curto. Uma receita
   exporta o objeto como `default` ou como `receita`. */
export async function receitasDaMontagem(montagem) {
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

/* AS ETAPAS AINDA SEM GEOMETRIA. O plano de todas as partes nasce no
   alinhamento, e a geometria de cada uma só na etapa dela. Resolver a montagem
   inteira falhava na primeira porta que uma parte ainda vazia não publica, e o
   registro não saía nem para a etapa em trabalho. Aqui a montagem é resolvida
   até a última etapa antes da primeira receita sem passo; as seguintes entram
   no registro abertas e sem junta, e não podem ser fixadas, porque fixar exige
   o crítico ter fechado a peça. */
export function montagemAteAGeometria(dado, montagem, receitas) {
  const refDe = new Map(montagem.instancias.map((item) => [item.id, item.alvo.ref]));
  const primeiraVazia = montagem.etapas.findIndex((id) => (receitas[refDe.get(id)]?.PASSOS ?? []).length === 0);
  if (primeiraVazia < 0) return { dado, construidas: montagem.etapas };
  const construidas = montagem.etapas.slice(0, primeiraVazia);
  const fica = new Set(construidas);
  const topo = (lado) => lado?.caminho?.[0];
  return {
    construidas,
    dado: {
      ...dado,
      instancias: dado.instancias.filter((item) => fica.has(item.id)),
      etapas: construidas,
      relacoes: (dado.relacoes ?? []).filter((r) => fica.has(topo(r.referencia)) && fica.has(topo(r.movel))),
      vinculos: (dado.vinculos ?? []).filter((v) => fica.has(v.alvo.instancia) && fica.has(v.de.instancia)),
      posicoes: (dado.posicoes ?? []).filter((p) => fica.has(p.instancia) && fica.has(p.em.instancia)),
    },
  };
}

/* A impressão do texto de cada receita, por instância. Injetável no teste. */
function impressoesDasReceitas(montagem, impressoes, emMemoria) {
  if (impressoes) return impressoes;
  if (emMemoria) return {};
  return Object.fromEntries(montagem.instancias.filter((item) => item.alvo.tipo === 'peca').map((item) => [
    item.id, createHash('sha256').update(readFileSync(resolverCaminhoReceita(item.alvo.ref))).digest('hex'),
  ]));
}

export async function estadoDasEtapas(arquivoMontagem, { receitas, anterior, impressoes } = {}) {
  const dado = JSON.parse(readFileSync(arquivoMontagem, 'utf8'));
  const montagem = lerMontagemPersistida(dado);
  const todas = receitas ?? await receitasDaMontagem(montagem);
  const { dado: parcial, construidas } = montagemAteAGeometria(dado, montagem, todas);
  const medidas = construidas.length
    ? juntasPorEtapa(await resolverMontagemPersistida(parcial, carregadoresDeReceitas(todas)), construidas)
    : [];
  const semGeometria = montagem.etapas.slice(construidas.length).map((instancia) => ({ instancia, juntas: [] }));
  const impressao = impressoesDasReceitas(montagem, impressoes, Boolean(receitas));
  for (const medida of [...medidas, ...semGeometria]) {
    if (impressao[medida.instancia]) medida.receita = impressao[medida.instancia];
  }
  const registroAnterior = anterior !== undefined ? anterior
    : existsSync(arquivoDoRegistro(arquivoMontagem)) ? JSON.parse(readFileSync(arquivoDoRegistro(arquivoMontagem), 'utf8')) : null;
  return { montagem, registro: atualizarRegistro(montagem.id, [...medidas, ...semGeometria], registroAnterior) };
}

/* As condições que moram nas rodadas da peça da etapa. `rodadasDe(ref)` é
   injetável para o teste; por padrão lê a pasta de rodadas da peça. */
/* ACEITE HUMANO COM DEFEITO EM ABERTO. Etapa com defeito em aberto só passa
   por aceite humano: quando o laço para no limite ou sem convergência, a
   pessoa, e nunca um agente, pode aceitar a etapa como está. `--aceite-humano`
   só vale nesses dois casos, nunca no meio do laço, e os defeitos que o crítico
   deixou em aberto entram no aceite gravado, para ninguém ler a etapa como
   fechada pelo crítico. O ombro do braço parou assim em 2026-09-25, com dois
   defeitos pequenos que a pessoa aceitou. */
const PARADAS_ACEITAVEIS = new Set(['parar-limite', 'parar-sem-convergencia']);

export function conferirRodadasDaEtapa(montagem, instancia, rodadasDe = (ref) => lerRodadas(ref), limiteDe = (ref) => limiteDaPeca(ref), { aceiteHumano = false } = {}) {
  const ref = montagem.instancias.find((item) => item.id === instancia)?.alvo.ref;
  const rodadas = ref ? rodadasDe(ref) : [];
  const decisao = proximaAcao(rodadas, { limite: ref ? limiteDe(ref) : undefined });
  if (aceiteHumano && PARADAS_ACEITAVEIS.has(decisao.acao)) {
    if (!rodadas.at(-1).notaDePassagem) {
      throw new ErroEtapaDeConstrucao('etapa-sem-nota', `a última rodada de '${instancia}' não traz 'notaDePassagem' para o modelador seguinte.`);
    }
    return (rodadas.at(-1).veredito?.defeitos ?? []).map((d) => `${d.parte}: ${d.tipo} em ${d.onde}`);
  }
  if (decisao.acao !== 'parar-fechou') {
    throw new ErroEtapaDeConstrucao('etapa-sem-critico', `'${instancia}' ainda não foi fechada pelo crítico: ${decisao.acao} — ${decisao.motivo}`);
  }
  if (!rodadas.at(-1).notaDePassagem) {
    throw new ErroEtapaDeConstrucao('etapa-sem-nota', `a última rodada de '${instancia}' não traz 'notaDePassagem' para o modelador seguinte.`);
  }
  return [];
}

export async function fixar(arquivoMontagem, instancia, aceite, opcoes = {}) {
  const { montagem, registro } = await estadoDasEtapas(arquivoMontagem, opcoes);
  const proxima = proximaEtapa(registro);
  /* A ordem é conferida antes das rodadas, para a mensagem apontar a etapa
     certa quando alguém tenta pular. */
  let defeitosAceitos = [];
  if (proxima?.instancia === instancia) {
    defeitosAceitos = conferirRodadasDaEtapa(montagem, instancia, opcoes.rodadasDe, opcoes.limiteDe, { aceiteHumano: Boolean(aceite?.aceiteHumano) });
  }
  return fixarEtapa(registro, instancia, { por: aceite?.por, observacao: aceite?.observacao, defeitosAceitos });
}

/* Reabrir é decisão da pessoa, como o aceite humano: `por` traz
   "<quem, data: motivo>" e nenhum agente reabre por conta própria. */
export async function reabrir(arquivoMontagem, instancia, por, opcoes = {}) {
  const autor = lerAutorDaReabertura(por);
  const { registro } = await estadoDasEtapas(arquivoMontagem, opcoes);
  return reabrirEtapa(registro, instancia, autor);
}

export const SAIDA_DAS_VISTAS = join(REPO, 'tools/bancadas/out');

export async function olharEtapas(arquivoMontagem, { vistas = ['frontal', 'direita', 'isometrica'], saida = SAIDA_DAS_VISTAS } = {}) {
  const dado = JSON.parse(readFileSync(arquivoMontagem, 'utf8'));
  const montagem = lerMontagemPersistida(dado);
  const receitas = await receitasDaMontagem(montagem);
  const { dado: parcial, construidas } = montagemAteAGeometria(dado, montagem, receitas);
  if (!construidas.length) throw new Error('nenhuma etapa tem geometria ainda; não há o que olhar.');
  const resolvida = await resolverMontagemPersistida(parcial, carregadoresDeReceitas(receitas));
  const captura = await capturarMontagem({ montagem: resolvida, vistas, projecao: 'ortografica' });
  if (!captura.ok) throw new Error(captura.erro.mensagem);
  mkdirSync(saida, { recursive: true });
  const arquivos = captura.resultado.capturas.map((vista) => {
    const arquivo = join(saida, `etapas-${montagem.id}-${vista.nome}-orto.png`);
    writeFileSync(arquivo, vista.dados);
    return arquivo;
  });
  return { construidas, arquivos };
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
  if (argv.includes('--olhar')) {
    const { construidas, arquivos } = await olharEtapas(caminho, { vistas: valor('--vistas')?.split(',').filter(Boolean) });
    return { codigo: 0, texto: `etapas desenhadas juntas: ${construidas.join(', ')}\n${arquivos.map((a) => `  ${a}`).join('\n')}` };
  }
  const reaberta = valor('--reabrir');
  if (reaberta) {
    const registro = await reabrir(caminho, reaberta, valor('--por'));
    gravar(caminho, registro);
    const proxima = proximaEtapa(registro);
    return { codigo: 0, texto: `etapa '${reaberta}' reaberta.\n${descrever(registro)}\npróxima etapa: ${proxima ? `${proxima.instancia} (${proxima.estado})` : 'nenhuma; todas fixas.'}` };
  }
  const instancia = valor('--fixar');
  const registro = instancia
    ? await fixar(caminho, instancia, { por: valor('--por'), observacao: valor('--observacao'), aceiteHumano: argv.includes('--aceite-humano') })
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
