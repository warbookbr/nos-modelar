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
 *   node tools/modelar/etapas-da-montagem.mjs <montagem.json>
 *   node tools/modelar/etapas-da-montagem.mjs <montagem.json> --fixar <instância> --por <quem> [--observacao <texto>] [--aceite-humano]
 *   node tools/modelar/etapas-da-montagem.mjs <montagem.json> --reabrir <instância> --por "<quem, data: motivo>"
 *   node tools/modelar/etapas-da-montagem.mjs <montagem.json> --olhar [--vistas frontal,direita,isometrica] [--foco <instância>]
 *
 * O registro é o da versão 3: eventos (aceites e reaberturas) e a impressão de cada aceite, e o estado de cada etapa, que nunca é
 * gravado, sai da comparação da impressão de agora com a do aceite (`etapas-pela-impressao.js`). `--fixar` e `--reabrir` só
 * acrescentam eventos. `--reabrir` reabre a etapa fixa ou a quebrada e não mede nada; as posteriores seguem fixas enquanto a
 * impressão delas for a do aceite, e `--fixar` avisa das posteriores que seguem quebradas. O registro de versão 1 ou 2 recusa com o
 * comando que o migra (`migrar-etapas-para-impressao.mjs`).
 *
 * `--olhar` desenha juntas, em vista ortográfica, as etapas que já têm
 * geometria. A parte de cada etapa era mostrada sozinha, e a pessoa não
 * conseguia julgar o anel da cintura sem vê-lo sobre a base. `--foco` enquadra
 * a caixa de uma instância, com uma folga, e deixa as outras peças em volta:
 * o quadro do conjunto inteiro faz a peça da etapa pequena demais para o
 * crítico, que leu um degrau na junta do capô e a deriva mais grossa do que é.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { assinaturaDaForma } from '../../src/autoria/assinatura-da-forma.js';
import { auditarIntersecoesMontagem } from '../../src/autoria/auditar-intersecoes-montagem.js';
import { medirApoioNoChao, submontagensComDeclaracao } from '../../src/autoria/apoio-no-chao.js';
import { lerMontagemPersistida } from '../../src/autoria/ler-montagem-persistida.js';
import { resolverMontagemPersistida } from '../../src/autoria/resolver-montagem-persistida.js';
import {
  ErroEtapaDeConstrucao, juntasPorEtapa, lerAutorDaReabertura,
} from '../../src/autoria/etapas-de-construcao.js';
import { interfaceNoMundo } from '../../src/autoria/posicao-por-porta.js';
import {
  VERSAO_REGISTRO_PELA_IMPRESSAO, acrescentarAceite, acrescentarReabertura, lerEtapas, registroVazio,
} from '../../src/autoria/etapas-pela-impressao.js';
import { proximaAcao } from '../../src/autoria/laco-de-modelagem.js';
import { estadoDaAnalise } from './analise-da-peca.mjs';
import { capturarMontagem } from './capturar-montagem.mjs';
import { carregadoresDeReceitas } from './peca-com-parametros.mjs';
import { REPO } from './resolver-caminho-receita.mjs';
import { decisaoSobreAsParadas, lerRodadas } from './rodada-de-modelagem.mjs';
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
  return montagemAteAs(dado, montagem, montagem.etapas.slice(0, primeiraVazia));
}

/* A montagem cortada nas etapas dadas (o começo da ordem): só as instâncias, relações, vínculos e posições que cabem nelas. */
export function montagemAteAs(dado, montagem, construidas) {
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

/* AS PORTAS CITADAS. Cada porta de uma etapa que uma etapa posterior cita, por relação (a ponta da etapa, quando a outra é
   posterior), por vínculo (de onde a medida vem) ou por posição (em que porta a posterior se encaixa): [{ etapa, porta,
   posterior, por, relacao? }]. A porta de dentro de uma submontagem (caminho de mais de um nível) entra com `profunda: true` e o
   caminho no nome, porque a reabertura não a confere e não pode tratá-la como provada. */
export function citacoesDasPortas(montagem) {
  const ordem = new Map(montagem.etapas.map((id, k) => [id, k]));
  const depois = (a, b) => ordem.has(a) && ordem.has(b) && ordem.get(b) > ordem.get(a);
  const citacoes = [];
  for (const relacao of montagem.relacoes ?? []) {
    for (const [ponta, outra] of [[relacao.referencia, relacao.movel], [relacao.movel, relacao.referencia]]) {
      if (depois(ponta.caminho[0], outra.caminho[0])) {
        const profunda = ponta.caminho.length > 1;
        citacoes.push({
          etapa: ponta.caminho[0], porta: profunda ? `${ponta.caminho.slice(1).join('/')}:${ponta.porta}` : ponta.porta,
          posterior: outra.caminho[0], por: `relação ${relacao.id}`, relacao: relacao.id, ...(profunda ? { profunda } : {}),
        });
      }
    }
  }
  for (const vinculo of montagem.vinculos ?? []) {
    if (depois(vinculo.de.instancia, vinculo.alvo.instancia)) citacoes.push({ etapa: vinculo.de.instancia, porta: vinculo.de.porta, posterior: vinculo.alvo.instancia, por: `vínculo ${vinculo.id}` });
  }
  for (const posicao of montagem.posicoes ?? []) {
    if (depois(posicao.em.instancia, posicao.instancia)) citacoes.push({ etapa: posicao.em.instancia, porta: posicao.em.porta, posterior: posicao.instancia, por: `posição ${posicao.id}` });
  }
  return citacoes;
}

/* O REGISTRO É O DA VERSÃO 3 (eventos e impressão do aceite), ou não existe. Um registro da versão 1 ou 2, que gravava o estado em
   cada etapa, recusa com o comando que o migra; qualquer outro valor de versão recusa também, e o registro de formato antigo que traga
   `eventos` (versão adulterada) não passa. */
export function exigirRegistroV3(registro, arquivoMontagem = '<montagem.json>') {
  if (registro === null || registro === undefined || registro.versao === VERSAO_REGISTRO_PELA_IMPRESSAO) return registro ?? null;
  const antigo = registro.versao === 1 || registro.versao === 2 || (registro.versao === undefined && Array.isArray(registro.etapas));
  if (antigo && !('eventos' in registro)) {
    throw new ErroEtapaDeConstrucao('registro-antigo', `o registro de etapas é da versão ${registro.versao ?? 'sem número'}, que grava o estado em cada etapa e já não é lido; migre-o com \`node tools/modelar/migrar-etapas-para-impressao.mjs ${arquivoMontagem} --gravar\` (sem --gravar, só o ensaio).`);
  }
  throw new ErroEtapaDeConstrucao('registro-invalido', `o registro de etapas traz a versão ${JSON.stringify(registro.versao)}${'eventos' in registro ? ' com eventos' : ''}; esperava a 3 (impressão do aceite) ou nenhum registro.`);
}

function lerRegistroDoDisco(arquivoMontagem) {
  const arquivo = arquivoDoRegistro(arquivoMontagem);
  return existsSync(arquivo) ? JSON.parse(readFileSync(arquivo, 'utf8')) : null;
}

export async function estadoDasEtapas(arquivoMontagem, { receitas, anterior } = {}) {
  const registroAnterior = exigirRegistroV3(anterior !== undefined ? anterior : lerRegistroDoDisco(arquivoMontagem), arquivoMontagem);
  const medido = await medirAgora(arquivoMontagem, { receitas });
  const registro = registroAnterior ?? registroVazio(medido.montagem);
  return {
    montagem: lerMontagemPersistida(JSON.parse(readFileSync(arquivoMontagem, 'utf8'))), versao: VERSAO_REGISTRO_PELA_IMPRESSAO,
    registro, leitura: lerEtapas(registro, medido), medido, anterior: registroAnterior, citacoes: medido.citacoes, portas: medido.portas,
  };
}

/* O MEDIDO AGORA, para a leitura por impressão (`etapas-pela-impressao.js`): por etapa, a assinatura da forma, os parâmetros que a
   montagem derivou, a pose no mundo e as juntas medidas; e, de cada porta que uma etapa posterior cita, a interface no mundo. A
   etapa sem geometria (receita sem passos, ou depois da primeira receita sem passos, ou submontagem) fica sem `forma`. Ainda não é o
   caminho de `fixar` e `reabrir`. */
let medicoes = 0;
/** Quantas vezes a montagem foi medida neste processo (`medirAgora`): para os testes provarem que um comando mede uma vez só. */
export const medicoesFeitas = () => medicoes;

export async function medirAgora(arquivoMontagem, { receitas } = {}) {
  medicoes += 1;
  const dado = JSON.parse(readFileSync(arquivoMontagem, 'utf8'));
  const montagem = lerMontagemPersistida(dado);
  const todas = receitas ?? await receitasDaMontagem(montagem);
  /* A IMPRESSÃO DE UMA ETAPA SÓ DEPENDE DAS ANTERIORES: a receita que não executa, ou a montagem que não resolve, numa etapa, deixa as
     anteriores medidas e dá as seguintes (e ela) como sem geometria, com o motivo; o comando não cai. */
  const erros = new Map();
  const refDe = (id) => montagem.instancias.find((item) => item.id === id)?.alvo.ref;
  let ordem = [...montagem.etapas];
  for (const [indice, id] of ordem.entries()) {
    try { void todas[refDe(id)]?.PASSOS; } catch (erro) { erros.set(id, `a receita não executa: ${erro.message}`); ordem = ordem.slice(0, indice); break; }
  }
  let construidas = montagemAteAGeometria(dado, { ...montagem, etapas: ordem }, todas).construidas;
  const cortar = (ids) => (ids.length === montagem.etapas.length ? dado : montagemAteAs(dado, montagem, ids).dado);
  const resolver = (ids) => resolverMontagemPersistida(cortar(ids), carregadoresDeReceitas(todas));
  let resolvida = null;
  if (construidas.length) {
    try {
      resolvida = await resolver(construidas);
    } catch (erro) {
      /* a maior parte que resolve, por bissecção: se o começo da ordem resolve, o fim que o contém também não resolve sozinho */
      let bom = 0; let ruim = construidas.length; let mensagem = erro.message;
      while (ruim - bom > 1) {
        const meio = Math.floor((bom + ruim) / 2);
        try { await resolver(construidas.slice(0, meio)); bom = meio; } catch (falha) { ruim = meio; mensagem = falha.message; }
      }
      resolvida = bom > 0 ? await resolver(construidas.slice(0, bom)) : null;
      erros.set(construidas[bom], `a montagem não resolve a partir desta etapa: ${mensagem}`);
      construidas = construidas.slice(0, bom);
    }
  }
  const juntas = new Map((resolvida ? juntasPorEtapa(resolvida, construidas) : []).map((e) => [e.instancia, e.juntas]));
  const citacoes = citacoesDasPortas(montagem);
  const etapas = {};
  const portas = {};
  for (const id of montagem.etapas) {
    etapas[id] = { juntas: juntas.get(id) ?? [], ...(erros.has(id) ? { erro: erros.get(id) } : {}) };
    const instancia = resolvida?.instancias.find((item) => item.id === id);
    const neutro = instancia?.definicao?.neutro;
    if (!neutro) continue;
    etapas[id].forma = assinaturaDaForma(neutro);
    etapas[id].parametros = (instancia.parametrosDerivados ?? []).map(({ param, valor, unidade }) => ({ param, valor, unidade }));
    etapas[id].pose = instancia.poseMundo;
    for (const nome of new Set(citacoes.filter((c) => c.etapa === id && !c.profunda).map((c) => c.porta))) {
      const porta = neutro.portas?.get?.(nome);
      if (porta?.interface) (portas[id] ??= {})[nome] = interfaceNoMundo(porta.interface, instancia.poseMundo);
    }
  }
  return { montagem: montagem.id, ordem: [...montagem.etapas], etapas, citacoes, portas };
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

/* `limiteDe(ref)` devolve a decisão gravada da pessoa para a peça (`decisaoSobreAsParadas`: o limite e a rodada a partir da qual a convergência
   conta), a mesma que `--acao` lê; quem injeta pode devolver só o número do limite. */
export function conferirRodadasDaEtapa(montagem, instancia, rodadasDe = (ref) => lerRodadas(ref), limiteDe = (ref) => decisaoSobreAsParadas(ref), { aceiteHumano = false } = {}) {
  const ref = montagem.instancias.find((item) => item.id === instancia)?.alvo.ref;
  const rodadas = ref ? rodadasDe(ref) : [];
  const lida = ref ? limiteDe(ref) : undefined;
  const { limite, convergenciaDesde, por } = lida && typeof lida === 'object' ? lida : { limite: lida };
  const decisao = proximaAcao(rodadas, { limite, convergenciaDesde, por });
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

/* O aviso do `fixar`: as etapas depois da fixada que seguem quebradas. Aceitar a etapa não as refixa: cada uma quebrou pela própria
   impressão, e só a reabertura dela seguida de um aceite novo a devolve. */
function avisoDasPosterioresQuebradas(leitura, instancia) {
  const indice = leitura.etapas.findIndex((e) => e.instancia === instancia);
  const quebradas = leitura.etapas.slice(indice + 1).filter((e) => e.estado === 'quebrada');
  return quebradas.length
    ? `aviso: ${quebradas.map((e) => `'${e.instancia}'`).join(', ')} ${quebradas.length > 1 ? 'seguem quebradas' : 'segue quebrada'} depois deste aceite (${quebradas.map((e) => `${e.instancia}: ${e.motivo}`).join('; ')}); reabra cada uma, da primeira para a última, e aceite de novo.`
    : null;
}

/* Fixa a etapa e devolve também a leitura de depois: só acrescenta o evento do aceite. */
export async function fixarComLeitura(arquivoMontagem, instancia, aceite, opcoes = {}) {
  const estado = await estadoDasEtapas(arquivoMontagem, opcoes);
  const { montagem, registro } = estado;
  const proxima = estado.leitura.proxima;
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
  const aceito = acrescentarAceite(registro, estado.medido, instancia, { por: aceite?.por, observacao: aceite?.observacao, defeitosAceitos, analise });
  const leitura = lerEtapas(aceito, estado.medido);
  return { registro: aceito, leitura, avisos: [avisoDasPosterioresQuebradas(leitura, instancia)].filter(Boolean) };
}

export async function fixar(arquivoMontagem, instancia, aceite, opcoes = {}) {
  const { registro, avisos } = await fixarComLeitura(arquivoMontagem, instancia, aceite, opcoes);
  for (const aviso of avisos) (opcoes.avisar ?? (() => {}))(aviso);
  return registro;
}

/* Reabrir é decisão da pessoa, como o aceite humano: `por` traz "<quem, data: motivo>" e nenhum agente reabre por conta própria.
   É só acrescentar o evento, sem medir: as posteriores seguem fixas enquanto a impressão delas for a do aceite, e quebram pela própria
   impressão quando a porta que citam muda. */
export async function reabrir(arquivoMontagem, instancia, por, opcoes = {}) {
  const autor = lerAutorDaReabertura(por);
  const anterior = exigirRegistroV3(opcoes.anterior !== undefined ? opcoes.anterior : lerRegistroDoDisco(arquivoMontagem), arquivoMontagem);
  const id = lerMontagemPersistida(JSON.parse(readFileSync(arquivoMontagem, 'utf8'))).id;
  if (anterior && anterior.montagem !== id) {
    throw new ErroEtapaDeConstrucao('registro-de-outra-montagem', `o registro é da montagem '${anterior.montagem}', e a montagem é '${id}'.`);
  }
  return acrescentarReabertura(anterior ?? registroVazio(id), instancia, autor);
}

/* O registro com o estado de cada etapa, para quem só consome o estado (o fluxo do objeto, o resumo do objeto, as vistas): o da
   versão 3 passa pela leitura com o medido de agora, e o antigo traz o estado gravado. Sem registro, null. */
export async function registroComEstado(arquivoMontagem, opcoes = {}) {
  const registro = exigirRegistroV3(opcoes.anterior !== undefined ? opcoes.anterior : lerRegistroDoDisco(arquivoMontagem), arquivoMontagem);
  if (!registro) return null;
  const { leitura } = await estadoDasEtapas(arquivoMontagem, { ...opcoes, anterior: registro });
  return { ...registro, etapas: leitura.etapas.map(({ instancia, estado, aceite, motivo }) => ({ instancia, estado, ...(aceite ? { aceite } : {}), ...(motivo ? { motivo } : {}) })) };
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

/* O REGISTRO SE GRAVA SÓ QUANDO MUDA, E SEMPRE NA MESMA ORDEM. Ler o estado regravava o arquivo (2026-11-09): a cada leitura os
   campos `aceite` e `reaberturas` trocavam de lugar e o git mostrava o registro mudado sem mudança, e uma etapa quebrada lida
   duas vezes virava `aberta`, com o aceite da pessoa guardado no histórico. Agora só `--fixar` e `--reabrir` gravam, a etapa sai
   com os campos na ordem de ORDEM_DA_ETAPA, e o arquivo não é tocado quando o texto seria o mesmo. */
export function gravarRegistro(arquivoMontagem, registro) {
  const arquivo = arquivoDoRegistro(arquivoMontagem);
  /* NO REGISTRO DE EVENTOS NADA SE PERDE: dois comandos que medem ao mesmo tempo partem do mesmo registro, e o segundo a gravar
     apagaria o evento do primeiro. A gravação relê o disco e recusa quando os eventos que estão lá não são o começo dos novos. */
  exigirRegistroV3(registro, arquivoMontagem);
  if (existsSync(arquivo)) {
    const disco = JSON.parse(readFileSync(arquivo, 'utf8'));
    const deles = Array.isArray(disco.eventos) ? disco.eventos : null;
    if (!deles || JSON.stringify(registro.eventos.slice(0, deles.length)) !== JSON.stringify(deles) || registro.eventos.length < deles.length) {
      throw new ErroEtapaDeConstrucao('registro-mudou-no-disco', `o registro de etapas em disco ${deles ? `tem ${deles.length} evento(s) que o desta gravação (${registro.eventos.length}) não repete` : 'não é da versão 3'}; outro comando gravou depois de este ler. Nada foi gravado; rode o comando de novo.`);
    }
  }
  const texto = `${JSON.stringify(registro, null, 2)}\n`;
  if (existsSync(arquivo) && readFileSync(arquivo, 'utf8') === texto) return false;
  writeFileSync(arquivo, texto, 'utf8');
  return true;
}

export async function comoCLI(argv) {
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
  const avisos = [];
  const avisar = (texto) => { if (!avisos.includes(texto)) avisos.push(texto); };
  const comAvisos = (texto) => (avisos.length ? `${avisos.join('\n')}\n${texto}` : texto);
  /* O retrato do registro depois do comando: a leitura com o medido de agora, ou a que o comando já fez. */
  const retrato = async (registro, pronta = null) => {
    const leitura = pronta ?? (await estadoDasEtapas(caminho, { anterior: registro })).leitura;
    const linhas = leitura.etapas.map((e) => `  ${e.estado.padEnd(14)} ${e.instancia}${e.motivo ? ` — ${e.motivo}` : ''}`).join('\n');
    return { linhas, proxima: leitura.proxima };
  };
  const reaberta = valor('--reabrir');
  if (reaberta) {
    const registro = await reabrir(caminho, reaberta, valor('--por'));
    gravarRegistro(caminho, registro);
    const { linhas, proxima } = await retrato(registro);
    return { codigo: 0, texto: comAvisos(`etapa '${reaberta}' reaberta.\n${linhas}\npróxima etapa: ${proxima ? `${proxima.instancia} (${proxima.estado})` : 'nenhuma; todas fixas.'}`) };
  }
  const instancia = valor('--fixar');
  let registro;
  let pronta;
  if (instancia) {
    const feito = await fixarComLeitura(caminho, instancia, { por: valor('--por'), observacao: valor('--observacao'), aceiteHumano: argv.includes('--aceite-humano') });
    feito.avisos.forEach(avisar);
    registro = feito.registro;
    pronta = feito.leitura;
    gravarRegistro(caminho, registro);
  } else {
    const estado = await estadoDasEtapas(caminho);
    registro = estado.registro;
    pronta = estado.leitura;
  }
  const { linhas, proxima } = await retrato(registro, pronta);
  return {
    codigo: 0,
    texto: comAvisos(`${instancia ? `etapa '${instancia}' fixa.\n` : ''}${linhas}\n`
      + `próxima etapa: ${proxima ? `${proxima.instancia} (${proxima.estado})` : 'nenhuma; todas fixas.'}`),
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
