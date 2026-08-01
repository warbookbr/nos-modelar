#!/usr/bin/env node
/*
 * revisar-pacote.mjs — marco 2 do fluxo assistido: a única ponte entre o
 * pacote, a régua headless e as quatro câmeras da bancada.
 *
 * A geometria e a semântica vêm de `descreverAlvo`; esta ferramenta não tenta
 * recalcular caixa, relação ou porta. A bancada só fornece as evidências
 * visuais e o gate de enquadramento. O diretório final nasce por rename atômico
 * depois de tudo passar, portanto uma revisão já existente nunca é tocada.
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  ErroDePacote, RAIZ_PACOTES, RAIZ_REPOSITORIO, caminhoPacote,
} from './formato-pacote.mjs';
import { validarPacoteNoDisco } from './validar-pacote.mjs';
import { construirRevisao, jsonCanonico, validarRevisao } from './revisao-modelagem.mjs';

const VISTAS = ['isometrica', 'frontal', 'direita', 'superior'];
const REVISAO = /^r[0-9]+$/;
const OLHAR_BANCADA = join(RAIZ_REPOSITORIO, 'tools/mecanifica/olhar-bancada.mjs');

function falhar(mensagem) {
  throw new ErroDePacote(mensagem);
}

function revisarId(valor) {
  if (typeof valor !== 'string' || !REVISAO.test(valor)) {
    falhar(`revisão precisa ter a forma r seguido de números, recebi ${JSON.stringify(valor)}.`);
  }
  return valor;
}

function lerRelatorio(arquivo, peca) {
  let relato;
  try { relato = JSON.parse(readFileSync(arquivo, 'utf8')); }
  catch (erro) { falhar(`a bancada não produziu relatório válido: ${erro.message}`); }
  if (!relato || relato.peca !== peca || !Array.isArray(relato.vistas)) {
    falhar('o relatório da bancada não corresponde à peça do pacote.');
  }
  const nomes = relato.vistas.map((vista) => vista?.nome);
  if (nomes.length !== VISTAS.length || new Set(nomes).size !== VISTAS.length
    || VISTAS.some((vista) => !nomes.includes(vista))) {
    falhar('a bancada não devolveu exatamente as quatro vistas canônicas.');
  }
  return relato.vistas;
}

function executarBancadaPadrao({ peca, vistas, relatorio }) {
  const relativo = (caminho) => relative(RAIZ_REPOSITORIO, caminho).replaceAll('\\', '/');
  const resultado = spawnSync(process.execPath, [
    OLHAR_BANCADA,
    peca,
    '--revisar',
    `--saida=${relativo(vistas)}`,
    `--relatorio=${relativo(relatorio)}`,
  ], {
    cwd: RAIZ_REPOSITORIO,
    encoding: 'utf8',
    timeout: 90_000,
  });
  if (resultado.stdout) process.stdout.write(resultado.stdout);
  if (resultado.stderr) process.stderr.write(resultado.stderr);
  if (resultado.error) falhar(`não consegui dirigir a bancada: ${resultado.error.message}`);
  if (resultado.status !== 0) falhar(`a bancada recusou a revisão (saída ${resultado.status ?? 'nula'}).`);
}

/* O briefing já passou pelo validador canônico antes desta leitura. Esta porta
   usa somente a descrição neutra que aquele mesmo validador acabou de produzir:
   não há uma segunda conta de faces, partes ou materiais no adaptador visual. */
function conferirOrcamento(pastaPacote, descricao) {
  let briefing;
  try { briefing = JSON.parse(readFileSync(join(pastaPacote, 'briefing.json'), 'utf8')); }
  catch (erro) { falhar(`não consegui reler o briefing validado: ${erro.message}`); }
  const orcamento = briefing?.perfil?.orcamento;
  if (!orcamento || typeof orcamento !== 'object' || Array.isArray(orcamento)) {
    falhar('briefing validado não declarou perfil.orcamento.');
  }
  const totais = descricao?.totais;
  const medidos = {
    faces: totais?.faces,
    partes: totais?.partes,
    materiais: totais?.materiais,
  };
  for (const campo of Object.keys(orcamento)) {
    const limite = orcamento[campo];
    const medido = medidos[campo];
    if (!Number.isInteger(limite) || limite <= 0 || !Number.isInteger(medido) || medido < 0) {
      falhar(`orçamento de '${campo}' não pode ser conferido contra a descrição neutra.`);
    }
    if (medido > limite) {
      falhar(`orçamento de ${campo} excedido: descrição neutra mede ${medido}, limite do briefing é ${limite}.`);
    }
  }
}

/**
 * Executável também em teste: o injetável recebe as mesmas rotas temporárias
 * que o processo real e deve gravar `relatorio`. Ele não recebe a descrição —
 * assim não existe uma segunda régua geométrica escondida no adaptador visual.
 */
export async function revisarPacote({
  id,
  revisao,
  raizPacotes = RAIZ_PACOTES,
  executarBancada = executarBancadaPadrao,
} = {}) {
  const nomeRevisao = revisarId(revisao);
  const validado = await validarPacoteNoDisco(id, { raizPacotes });
  const pastaPacote = caminhoPacote(id, { raizPacotes });
  if (!validado.alvo) {
    falhar(`pacote '${id}' está em criação e o alvo '${validado.peca}' ainda não existe; crie a fonte canônica antes de revisar.`);
  }
  conferirOrcamento(pastaPacote, validado.alvo.descricao);
  const pastaRevisoes = join(pastaPacote, 'revisoes');
  const destino = join(pastaRevisoes, nomeRevisao);
  if (existsSync(destino)) falhar(`revisão '${nomeRevisao}' já existe; revisar nunca sobrescreve diretório.`);

  mkdirSync(pastaRevisoes, { recursive: true });
  const temporaria = mkdtempSync(join(pastaRevisoes, `.${nomeRevisao}.em-preparo-`));
  const vistas = join(temporaria, 'vistas');
  const relato = join(temporaria, '.relato-bancada.json');
  mkdirSync(vistas);
  try {
    await executarBancada({ peca: validado.alvo.peca, vistas, relatorio: relato });
    const vistasDaBancada = lerRelatorio(relato, validado.alvo.peca);
    const resultado = validarRevisao(construirRevisao({
      peca: validado.alvo.peca,
      descricao: validado.alvo.descricao,
      vistas: vistasDaBancada,
    }));
    const esperado = VISTAS.map((vista) => join(vistas, `bancada-${validado.alvo.peca}-${vista}-orto.png`));
    const ausentes = esperado.filter((arquivo) => !existsSync(arquivo));
    if (ausentes.length) {
      falhar(`a bancada aprovou o relatório, mas faltam evidências PNG: ${ausentes.map((arquivo) => relative(temporaria, arquivo)).join(', ')}.`);
    }
    writeFileSync(join(temporaria, 'revisao.json'), `${jsonCanonico(resultado)}\n`, { encoding: 'utf8', flag: 'wx' });
    rmSync(relato, { force: false });
    /* Outra execução pode ter chegado durante a revisão; ainda assim não
       escolhemos uma vencedora nem apagamos o trabalho dela. */
    if (existsSync(destino)) falhar(`revisão '${nomeRevisao}' foi criada por outra execução; não sobrescrevi.`);
    renameSync(temporaria, destino);
    return { destino, revisao: resultado };
  } catch (erro) {
    rmSync(temporaria, { recursive: true, force: true });
    throw erro;
  }
}

function argumentos(argv) {
  let id = null;
  let revisao = null;
  for (const argumento of argv) {
    if (argumento.startsWith('--revisao=')) {
      if (revisao !== null) falhar('--revisao veio mais de uma vez.');
      revisao = argumento.slice('--revisao='.length);
    } else if (argumento.startsWith('--')) {
      falhar(`não conheço '${argumento}'; use: <pacote> --revisao=r001.`);
    } else if (id === null) id = argumento;
    else falhar(`recebi mais de um pacote: '${id}' e '${argumento}'.`);
  }
  if (!id || !revisao) falhar('use: npm run revisar:modelagem -- <pacote> --revisao=r001.');
  return { id, revisao };
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
  try {
    const { id, revisao } = argumentos(process.argv.slice(2));
    const resultado = await revisarPacote({ id, revisao });
    console.log(`revisão criada: ${relative(RAIZ_REPOSITORIO, resultado.destino).replaceAll('\\', '/')}`);
  } catch (erro) {
    console.error(`revisar:modelagem: ${erro.message}`);
    process.exit(1);
  }
}
