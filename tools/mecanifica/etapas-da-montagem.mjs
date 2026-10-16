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
 *   node tools/mecanifica/etapas-da-montagem.mjs <montagem.json> --olhar [--vistas frontal,direita,isometrica] [--foco <instância>]
 *
 * `--olhar` desenha juntas, em vista ortográfica, as etapas que já têm
 * geometria. A parte de cada etapa era mostrada sozinha, e a pessoa não
 * conseguia julgar o anel da cintura sem vê-lo sobre a base. `--foco` enquadra
 * a caixa de uma instância, com uma folga, e deixa as outras peças em volta:
 * o quadro do conjunto inteiro faz a peça da etapa pequena demais para o
 * crítico, que leu um degrau na junta do capô e a deriva mais grossa do que é.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { auditarIntersecoesMontagem } from '../../src/autoria/auditar-intersecoes-montagem.js';
import { medirApoioNoChao, submontagensComDeclaracao } from '../../src/autoria/apoio-no-chao.js';
import { lerMontagemPersistida } from '../../src/autoria/ler-montagem-persistida.js';
import { resolverMontagemPersistida } from '../../src/autoria/resolver-montagem-persistida.js';
import {
  ErroEtapaDeConstrucao, atualizarRegistro, fixarEtapa, juntasPorEtapa, lerAutorDaReabertura, proximaEtapa, reabrirEtapa,
} from '../../src/autoria/etapas-de-construcao.js';
import { proximaAcao } from '../../src/autoria/laco-de-modelagem.js';
import { estadoDaAnalise } from './analise-da-peca.mjs';
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
  /* As expectativas citam instâncias pelo caminho, e uma citação de instância
     ainda sem geometria não casaria com nada: ficam as que cabem nas etapas
     construídas. O apoio no chão sai inteiro da montagem parcial, e quem
     audita o devolve com as instâncias de apoio que já existem. */
  const auditoria = dado.auditoriaIntersecoes
    ? { auditoriaIntersecoes: { ...dado.auditoriaIntersecoes, expectativas: dado.auditoriaIntersecoes.expectativas.filter((e) => fica.has(topo(e.a)) && fica.has(topo(e.b))) } }
    : {};
  const { auditoriaIntersecoes, apoioNoChao, ...resto } = dado;
  return {
    construidas,
    dado: {
      ...resto,
      ...auditoria,
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
/* ACEITE HUMANO COM DEFEITO EM ABERTO. Só a pessoa, e nunca um agente, fixa
   uma etapa que o crítico não fechou. `--aceite-humano` vale em qualquer ponto
   do laço, porque a escolha da forma é dela: em 2026-09-28 ela escolheu o
   ombro em L comparando duas opções sobre a base, e a última rodada ainda era
   do desenho antigo. Os defeitos que o crítico deixou em aberto e o estado do
   laço entram no aceite gravado, para ninguém ler a etapa como fechada pelo
   crítico. */
const PARADAS_ACEITAVEIS = new Set(['parar-limite', 'parar-sem-convergencia']);

export function conferirRodadasDaEtapa(montagem, instancia, rodadasDe = (ref) => lerRodadas(ref), limiteDe = (ref) => limiteDaPeca(ref), { aceiteHumano = false } = {}) {
  const ref = montagem.instancias.find((item) => item.id === instancia)?.alvo.ref;
  const rodadas = ref ? rodadasDe(ref) : [];
  const decisao = proximaAcao(rodadas, { limite: ref ? limiteDe(ref) : undefined });
  if (aceiteHumano && decisao.acao !== 'parar-fechou') {
    const defeitos = (rodadas.at(-1)?.veredito?.defeitos ?? []).map((d) => `${d.parte}: ${d.tipo} em ${d.onde}`);
    return PARADAS_ACEITAVEIS.has(decisao.acao) ? defeitos
      : [`crítico não fechou: ${decisao.acao} — ${decisao.motivo}`, ...defeitos];
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
  /* O passo "Pare e analise" fica registrado no aceite, sem bloquear: aceite
     humano vale em qualquer ponto. 'feita' = manifesto com o hash da receita de agora. */
  const ref = montagem.instancias.find((item) => item.id === instancia)?.alvo.ref;
  const analise = ref ? estadoDaAnalise(ref, opcoes.analise ?? {}) : 'ausente';
  return fixarEtapa(registro, instancia, { por: aceite?.por, observacao: aceite?.observacao, defeitosAceitos, analise });
}

/* Reabrir é decisão da pessoa, como o aceite humano: `por` traz
   "<quem, data: motivo>" e nenhum agente reabre por conta própria. */
export async function reabrir(arquivoMontagem, instancia, por, opcoes = {}) {
  const autor = lerAutorDaReabertura(por);
  const { registro } = await estadoDasEtapas(arquivoMontagem, opcoes);
  return reabrirEtapa(registro, instancia, autor);
}

export const SAIDA_DAS_VISTAS = join(REPO, 'tools/bancadas/out');

/* `foco` é a instância (id, ou o caminho dela) que o quadro enquadra, entre as etapas já construídas; sem ele o quadro é o do conjunto.
   Com foco, o nome do arquivo leva `-foco-<instância>` e o resultado traz o enquadramento de cada vista, a fração do quadro que a
   caixa da instância ocupa em largura e altura. `capturar` e `receitas` são injetáveis para o teste. */
export async function olharEtapas(arquivoMontagem, {
  vistas = ['frontal', 'direita', 'isometrica'], saida = SAIDA_DAS_VISTAS, foco = null, folga, largura, altura, capturar = capturarMontagem, receitas: injetadas = null, timeoutMs,
} = {}) {
  const dado = JSON.parse(readFileSync(arquivoMontagem, 'utf8'));
  const montagem = lerMontagemPersistida(dado);
  const receitas = injetadas ?? await receitasDaMontagem(montagem);
  const { dado: parcial, construidas } = montagemAteAGeometria(dado, montagem, receitas);
  if (!construidas.length) throw new Error('nenhuma etapa tem geometria ainda; não há o que olhar.');
  const caminhoDoFoco = foco === null ? null : (typeof foco === 'string' ? [foco] : foco);
  if (caminhoDoFoco && !construidas.includes(caminhoDoFoco[0])) {
    const erro = new Error(`a instância '${caminhoDoFoco.join('/')}' não está entre as etapas já construídas (${construidas.join(', ')}); não há o que enquadrar.`);
    erro.codigo = 'foco-fora-das-etapas';
    throw erro;
  }
  const resolvida = await resolverMontagemPersistida(parcial, carregadoresDeReceitas(receitas));
  const captura = await capturar({
    montagem: resolvida, vistas, projecao: 'ortografica',
    ...(caminhoDoFoco ? { foco: caminhoDoFoco } : {}),
    ...(folga === undefined ? {} : { folga }), ...(largura === undefined ? {} : { largura }), ...(altura === undefined ? {} : { altura }),
    ...(timeoutMs === undefined ? {} : { timeoutMs }),
  });
  if (!captura.ok) throw new Error(captura.erro.mensagem);
  mkdirSync(saida, { recursive: true });
  const sufixo = caminhoDoFoco ? `-foco-${caminhoDoFoco.join('-')}` : '';
  const arquivos = captura.resultado.capturas.map((vista) => {
    const arquivo = join(saida, `etapas-${montagem.id}-${vista.nome}-orto${sufixo}.png`);
    writeFileSync(arquivo, vista.dados);
    return arquivo;
  });
  const enquadramentos = captura.resultado.capturas.map((vista) => ({ vista: vista.nome, ...vista.enquadramento }));
  return { construidas, arquivos, enquadramentos, foco: caminhoDoFoco };
}

/* A AUDITORIA DA MONTAGEM CONSTRUÍDA. Resolve a montagem com as etapas que já
   têm geometria e roda as duas medidas sobre ela: as interseções entre as peças
   (com a profundidade de cada invasão) e, quando a montagem declara
   `apoioNoChao`, o apoio no chão. Não grava nada. `receitas` é injetável para o
   teste.

   A decisão de reprovar mora aqui, e não em quem imprime: `codigo` 1 quando um
   par que se invade não foi declarado ou o apoio reprova, 2 quando nada reprova
   mas a auditoria é incompleta (algum par não pôde ser medido, ou há etapas
   ainda sem geometria: inconclusivo e não construído não são livres), 0 no
   resto.
   Par que só encosta, sem declaração, aparece no relatório e não reprova, como
   na auditoria de interseções. */
export async function auditarEtapas(arquivoMontagem, { receitas: injetadas = null, toleranciaNumerica } = {}) {
  const dado = JSON.parse(readFileSync(arquivoMontagem, 'utf8'));
  const montagem = lerMontagemPersistida(dado);
  const receitas = injetadas ?? await receitasDaMontagem(montagem);
  const { dado: parcial, construidas } = montagemAteAGeometria(dado, montagem, receitas);
  if (!construidas.length) throw new Error('nenhuma etapa tem geometria ainda; não há o que auditar.');
  const resolvidaSemApoio = await resolverMontagemPersistida(parcial, carregadoresDeReceitas(receitas));
  /* O apoio é medido com as instâncias de apoio que já têm geometria. As que
     ainda não têm ficam em `apoioForaDasEtapas`, e a auditoria deixa de ser
     completa por isso: apoio adiado não pode passar por apoio conferido. */
  const apoioDeclarado = montagem.apoioNoChao;
  const apoioForaDasEtapas = (apoioDeclarado?.apoiam ?? [])
    .filter((item) => !construidas.includes(item.caminho[0])).map((item) => item.caminho);
  const resolvida = apoioDeclarado
    ? { ...resolvidaSemApoio, apoioNoChao: { ...apoioDeclarado, apoiam: apoioDeclarado.apoiam.filter((item) => construidas.includes(item.caminho[0])) } }
    : resolvidaSemApoio;
  const opcoesDeInterseccao = { profundidade: true, ...(toleranciaNumerica === undefined ? {} : { toleranciaNumerica }) };
  const intersecoes = auditarIntersecoesMontagem(resolvida, opcoesDeInterseccao);
  const apoio = apoioDeclarado
    ? medirApoioNoChao(resolvida, toleranciaNumerica === undefined ? {} : { toleranciaNumerica })
    : null;
  const invadem = intersecoes.naoDeclarados.filter((par) => par.estado === 'interpenetram');
  const reprova = invadem.length > 0 || (apoio !== null && !apoio.aprovado);
  const foraDasEtapas = montagem.etapas.filter((id) => !construidas.includes(id));
  const incompleta = intersecoes.cobertura.inconclusivos > 0 || foraDasEtapas.length > 0;
  return {
    montagem: montagem.id,
    construidas,
    foraDasEtapas,
    apoioForaDasEtapas,
    apoioIgnorado: submontagensComDeclaracao(resolvida),
    intersecoes,
    apoio,
    codigo: reprova ? 1 : (incompleta ? 2 : 0),
  };
}

const caminhoTexto = (caminho) => caminho.join('/');
const apoioTexto = (item) => `${caminhoTexto(item.caminho)}${item.parte ? ` (parte ${item.parte})` : ''}`;
const medida = (numero) => (Math.abs(numero) < 1e-6 && numero !== 0 ? numero.toExponential(2) : String(Number(numero.toFixed(6))));
const pontoTexto = (ponto) => `[${ponto.map(medida).join(', ')}]`;

function linhaDoPar(par, rotulo) {
  const profundidade = par.estado === 'interpenetram' && par.profundidade !== undefined
    ? `, profundidade ${par.profundidade === null ? 'indeterminada (só as arestas se cruzam)' : medida(par.profundidade)}`
    : '';
  const declaracao = par.expectativa ? ` — declarado '${par.expectativa.id}': ${par.expectativa.motivo}` : '';
  return `  ${rotulo} ${caminhoTexto(par.a)} x ${caminhoTexto(par.b)}: ${par.estado} (${par.metodo})${profundidade}${declaracao}`;
}

/* O texto do relatório: os pares que se invadem ou encostam sem declaração
   primeiro, na ordem de gravidade que a auditoria já entrega, depois os
   declarados, os declarados sem contato e a cobertura. As unidades são as da
   montagem. */
export function descreverAuditoria(auditoria) {
  const { intersecoes, apoio } = auditoria;
  const linhas = [];
  linhas.push(`auditoria da montagem '${auditoria.montagem}': ${auditoria.construidas.length} etapas construídas (${auditoria.construidas.join(', ')}).`);
  if (auditoria.foraDasEtapas.length) linhas.push(`  fora da auditoria, sem geometria ainda: ${auditoria.foraDasEtapas.join(', ')}.`);
  linhas.push(`interseções entre peças, tolerância ${medida(intersecoes.toleranciaNumerica)}:`);
  const declarados = intersecoes.pares.filter((par) => par.expectativa && (par.estado === 'interpenetram' || par.estado === 'encostam'))
    .sort((x, y) => (x.estado === y.estado ? 0 : x.estado === 'interpenetram' ? -1 : 1));
  if (!intersecoes.naoDeclarados.length) linhas.push('  nenhum par sem declaração se invade ou encosta.');
  for (const par of intersecoes.naoDeclarados) linhas.push(linhaDoPar(par, par.estado === 'interpenetram' ? 'REPROVA' : 'avisa  '));
  if (declarados.length) {
    linhas.push('pares declarados em contato:');
    for (const par of declarados) linhas.push(linhaDoPar(par, 'declara'));
  }
  if (intersecoes.declaradosSemContato.length) {
    linhas.push('declarações sem contato (não reprovam, mas descrevem o que não existe):');
    for (const item of intersecoes.declaradosSemContato) linhas.push(`  ${caminhoTexto(item.a)} x ${caminhoTexto(item.b)}: '${item.id}' — ${item.motivo}`);
  }
  const inconclusivos = intersecoes.pares.filter((par) => par.estado === 'inconclusivo');
  for (const par of inconclusivos) linhas.push(`  INCONCLUSIVO ${caminhoTexto(par.a)} x ${caminhoTexto(par.b)}: ${par.diagnosticos.join(', ')}`);
  const { cobertura } = intersecoes;
  linhas.push(`cobertura: ${cobertura.paresVerificados} de ${cobertura.paresTotais} pares verificados, ${cobertura.inconclusivos} inconclusivos, ${cobertura.completa ? 'completa' : 'incompleta'}.`);
  if (!apoio) {
    linhas.push('apoio no chão: a montagem não declara apoioNoChao; nada foi medido.');
  } else {
    linhas.push(`apoio no chão, plano de normal ${pontoTexto(apoio.plano.normal)} e altura ${medida(apoio.plano.altura)}, tolerância ${medida(apoio.toleranciaNumerica)}:`);
    for (const item of apoio.apoios) {
      linhas.push(item.estado === 'inconclusivo'
        ? `  REPROVA ${apoioTexto(item)}: inconclusivo (${item.diagnostico} em ${caminhoTexto(item.peca)})`
        : `  ${item.estado === 'apoia' ? 'passa  ' : 'REPROVA'} ${apoioTexto(item)}: ${item.estado}, ponto mais baixo a ${medida(item.altura)} do chão em ${pontoTexto(item.ponto)}, na peça ${caminhoTexto(item.peca)}`);
    }
    if (!apoio.abaixoDoChao.length) linhas.push('  nenhuma outra peça passa abaixo do chão.');
    for (const item of apoio.abaixoDoChao) linhas.push(`  REPROVA ${caminhoTexto(item.caminho)}: passa ${medida(-item.altura)} abaixo do chão, em ${pontoTexto(item.ponto)}`);
    for (const item of apoio.inconclusivos) linhas.push(`  REPROVA ${caminhoTexto(item.caminho)}: sem malha para medir (${item.diagnostico})`);
  }
  for (const caminho of auditoria.apoioForaDasEtapas) linhas.push(`  apoio declarado em '${caminhoTexto(caminho)}', fora das etapas construídas, não medido.`);
  for (const caminho of auditoria.apoioIgnorado) linhas.push(`  a submontagem '${caminhoTexto(caminho)}' declara apoioNoChao, e só a declaração da raiz vale.`);
  linhas.push(auditoria.codigo === 1 ? 'resultado: REPROVA.'
    : auditoria.codigo === 2 ? 'resultado: nada reprova, mas a auditoria é incompleta (etapas sem geometria ou pares que não puderam ser medidos).'
      : 'resultado: passa.');
  return linhas.join('\n');
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
  if (argv.includes('--auditar')) {
    const auditoria = await auditarEtapas(caminho);
    return { codigo: auditoria.codigo, texto: argv.includes('--json') ? JSON.stringify(auditoria, null, 2) : descreverAuditoria(auditoria), saida: true };
  }
  if (argv.includes('--olhar')) {
    const { construidas, arquivos, foco } = await olharEtapas(caminho, { vistas: valor('--vistas')?.split(',').filter(Boolean), foco: valor('--foco') ?? null });
    return { codigo: 0, texto: `etapas desenhadas juntas: ${construidas.join(', ')}${foco ? `\nquadro na instância '${foco.join('/')}'` : ''}\n${arquivos.map((a) => `  ${a}`).join('\n')}` };
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
  comoCLI(process.argv.slice(2)).then(({ codigo, texto, saida }) => {
    /* Na auditoria o relatório é a saída, passe ou reprove. */
    (codigo === 0 || saida ? console.log : console.error)(texto);
    process.exit(codigo);
  }).catch((erro) => {
    console.error(`etapas-da-montagem: ${erro.codigo ? `[${erro.codigo}] ` : ''}${erro.message}`);
    process.exit(1);
  });
}
