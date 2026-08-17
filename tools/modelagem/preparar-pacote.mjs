#!/usr/bin/env node
/* preparar-pacote.mjs — cria só o esqueleto canônico; uma pasta já existente é
   sempre erro. Assim, uma segunda tentativa nunca apaga briefing ou crítica. */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  ErroDePacote, RAIZ_PACOTES, alvoExiste, caminhoPacote, descreverAlvo, serializarCanonico, validarPacote,
} from './formato-pacote.mjs';

function uso(mensagem) {
  console.error(`preparar:modelagem: ${mensagem}`);
  process.exit(2);
}
function ler(argv) {
  let id = null;
  let peca = null;
  let modo = 'refinamento';
  let modoDefinido = false;
  let partesEsperadas = null;
  for (const argumento of argv) {
    if (argumento.startsWith('--peca=')) {
      if (peca !== null) uso('--peca veio mais de uma vez.');
      peca = argumento.slice('--peca='.length);
    } else if (argumento.startsWith('--modo=')) {
      if (modoDefinido) uso('--modo veio mais de uma vez.');
      modo = argumento.slice('--modo='.length);
      modoDefinido = true;
    } else if (argumento.startsWith('--partes=')) {
      if (partesEsperadas !== null) uso('--partes veio mais de uma vez.');
      const recebido = argumento.slice('--partes='.length);
      partesEsperadas = recebido ? recebido.split(',') : [];
    } else if (argumento.startsWith('--')) {
      uso(`não conheço '${argumento}'; use: <pacote> --peca=<peça> [--modo=refinamento|criacao] [--partes=parte-a,parte-b].`);
    } else if (id === null) id = argumento;
    else uso(`recebi mais de um pacote: '${id}' e '${argumento}'.`);
  }
  if (!id || !peca) uso('use: npm run preparar:modelagem -- <pacote> --peca=<peça> [--modo=refinamento|criacao] [--partes=parte-a,parte-b].');
  if (!['refinamento', 'criacao'].includes(modo)) uso('--modo precisa ser refinamento ou criacao.');
  if (modo === 'criacao' && (!partesEsperadas || !partesEsperadas.length || partesEsperadas.some((parte) => !parte))) {
    uso('--modo=criacao exige --partes=nomes-semanticos,separados-por-virgula.');
  }
  if (modo === 'refinamento' && partesEsperadas !== null) {
    uso('--partes só é aceito em --modo=criacao; refinamento deriva as partes da descrição atual.');
  }
  return { id, peca, modo, partesEsperadas };
}

export async function prepararPacote({
  id, peca, modo = 'refinamento', partesEsperadas = null, raizPacotes = RAIZ_PACOTES,
} = {}) {
  const destino = caminhoPacote(id, { raizPacotes });
  if (existsSync(destino)) throw new ErroDePacote(`pacote '${id}' já existe; preparar nunca sobrescreve.`);
  if (!['refinamento', 'criacao'].includes(modo)) {
    throw new ErroDePacote('modo precisa ser refinamento ou criacao.');
  }
  if (modo === 'refinamento' && partesEsperadas !== null) {
    throw new ErroDePacote('partesEsperadas só pode ser declarada no modo criacao; refinamento confere a descrição atual.');
  }
  if (modo === 'criacao' && (!Array.isArray(partesEsperadas) || !partesEsperadas.length)) {
    throw new ErroDePacote('modo criacao exige partesEsperadas semânticas e não vazias.');
  }
  if (modo === 'criacao' && alvoExiste(peca)) {
    throw new ErroDePacote(`alvo '${peca}' já existe; use modo refinamento para não mascarar partes existentes.`);
  }
  const alvo = modo === 'refinamento' ? await descreverAlvo(peca) : { peca, partes: partesEsperadas };
  const briefing = {
    formato: 'mecanifica.pacote-modelagem',
    versao: 1,
    id,
    alvo: { peca: alvo.peca, caminho: `prototipos/procedural/v3/pecas/${alvo.peca}.js`, modo },
    objetivo: modo === 'criacao'
      ? `Criar a peça '${alvo.peca}' por evidência observável.`
      : `Revisar e refinar a peça '${alvo.peca}' por evidência observável.`,
    perfil: {
      visual: 'tecnicoDidatico',
      fidelidade: 'F2',
      precisao: 'mecanica',
      interacao: 'montagem',
      distanciaMinima: 0.5,
      orcamento: { faces: 2000 },
      /* Sem informação do pedido, PERFIS-DE-AUTORIA manda assumir este modo;
         a origem é determinística e não guarda data nem máquina. */
      origem: 'suposicao-canonica',
    },
    partesEsperadas: alvo.partes,
    guias: [
      'forma/silhueta-e-transicoes',
      'material/leitura-de-material',
      'processo/evidencia-e-iteracao',
    ],
    checklist: [
      { id: 'silhueta', prioridade: 1, estado: 'aberto', criterio: 'A silhueta permanece legível nas vistas ortogonais.' },
      { id: 'transicoes', prioridade: 2, estado: 'aberto', criterio: 'Transições relevantes têm intenção explícita, sem término seco involuntário.' },
      { id: 'material', prioridade: 3, estado: 'aberto', criterio: 'O material é distinguível pela forma, acabamento e leitura nas vistas canônicas.' },
      { id: 'semantica', prioridade: 4, estado: 'aberto', criterio: 'Cada parte esperada continua identificável e mensurável pela descrição headless.' },
    ],
    provas: ['descricao-headless', 'bancada-quatro-vistas'],
  };
  const referencias = {
    formato: 'mecanifica.referencias-modelagem',
    versao: 1,
    ausenciaDeclarada: true,
    referencias: [],
  };
  validarPacote(briefing, referencias, modo === 'refinamento' ? { partesDisponiveis: alvo.partes } : {});
  mkdirSync(raizPacotes, { recursive: true });
  /* mkdir sem recursive no destino é a trava de corrida e de sobrescrita. */
  mkdirSync(destino);
  writeFileSync(join(destino, 'briefing.json'), serializarCanonico(briefing), { encoding: 'utf8', flag: 'wx' });
  writeFileSync(join(destino, 'referencias.json'), serializarCanonico(referencias), { encoding: 'utf8', flag: 'wx' });
  return { destino, briefing, referencias };
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
  const { id, peca, modo, partesEsperadas } = ler(process.argv.slice(2));
  try {
    const criado = await prepararPacote({ id, peca, modo, partesEsperadas });
    console.log(`pacote criado: ${criado.destino}`);
  } catch (erro) {
    console.error(`preparar:modelagem: ${erro.message}`);
    process.exit(erro instanceof ErroDePacote ? 1 : 1);
  }
}
