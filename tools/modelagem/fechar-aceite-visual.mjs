#!/usr/bin/env node
/* fechar-aceite-visual.mjs — fecha tecnicamente uma revisão privada só após
   conferir briefing, modelo, arquivos e crítica pelo porteiro visual. */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { RAIZ_PACOTES, RAIZ_REPOSITORIO, caminhoPacote } from './formato-pacote.mjs';
import { validarPacoteNoDisco } from './validar-pacote.mjs';
import { validarRevisao } from './revisao-modelagem.mjs';
import { verificarEvidenciasAceiteNoDisco } from './aceite-visual.mjs';
import { verificarEvidenciasAceiteRegionalNoDisco } from './aceite-visual-regional.mjs';

function falhar(mensagem) { throw new Error(`fechar-aceite-visual: ${mensagem}`); }
function lerJson(arquivo, nome) {
  try { return JSON.parse(readFileSync(arquivo, 'utf8')); }
  catch (causa) { falhar(`${nome} não contém JSON válido: ${causa.message}`); }
}
function assinaturaArquivo(arquivo) {
  return `sha256:${createHash('sha256').update(readFileSync(arquivo)).digest('hex')}`;
}
function caminhoRelativoSeguro(valor, onde) {
  if (typeof valor !== 'string' || !/^[A-Za-z0-9._/-]+$/.test(valor) || valor.includes('..') || valor.startsWith('/')) {
    falhar(`${onde} precisa ser caminho relativo canônico.`);
  }
  return valor;
}

/* Seleção explícita por versão; v1 não ganha semântica regional por acidente. */
export function verificarAceiteParaFechamento(aceite, opcoes, disco) {
  if (aceite?.versao === 1) return verificarEvidenciasAceiteNoDisco(aceite, opcoes, disco);
  if (aceite?.versao === 2) return verificarEvidenciasAceiteRegionalNoDisco(aceite, opcoes, disco);
  falhar(`versão de aceite não suportada: ${aceite?.versao ?? '(ausente)'}.`);
}

/** Não altera revisão: grava um veredito imutável paralelo em `aceites/`. */
export async function fecharAceiteVisual({
  id, revisao, arquivoAceite, raizPacotes = RAIZ_PACOTES, raizRepositorio = RAIZ_REPOSITORIO,
} = {}) {
  const pacote = caminhoPacote(id, { raizPacotes });
  /* Esta recusa vem antes de executar o alvo legado: sem régua visual no
     briefing não existe fechamento, mesmo que a receita histórica já tenha
     saído do acervo. A validação completa continua obrigatória logo depois. */
  const briefingInicial = lerJson(join(pacote, 'briefing.json'), 'briefing.json');
  if (!briefingInicial?.aceiteVisual) falhar(`pacote '${id}' não declarou briefing.aceiteVisual; não existe régua visual assinada para fechar.`);
  const validado = await validarPacoteNoDisco(id, { raizPacotes, raizRepositorio });
  if (!validado.aceiteVisual) falhar(`pacote '${id}' não declarou briefing.aceiteVisual; não existe régua visual assinada para fechar.`);
  const nomeRevisao = typeof revisao === 'string' && /^r[0-9]+$/.test(revisao) ? revisao : null;
  if (!nomeRevisao) falhar('revisao precisa ter a forma r seguido de números.');
  const revisaoArquivo = join(pacote, 'revisoes', nomeRevisao, 'revisao.json');
  if (!existsSync(revisaoArquivo)) falhar(`revisão '${nomeRevisao}' não existe.`);
  const revisaoValidada = validarRevisao(lerJson(revisaoArquivo, 'revisao.json'));
  const origem = join(pacote, caminhoRelativoSeguro(arquivoAceite, 'arquivoAceite'));
  if (!existsSync(origem)) falhar(`arquivo de aceite não existe: ${arquivoAceite}.`);
  const aceite = lerJson(origem, 'arquivo de aceite');
  const opcoesAceite = {
    assinaturaModelo: revisaoValidada.assinaturaModelo,
    assinaturaBriefing: assinaturaArquivo(join(pacote, 'briefing.json')),
    rejeicoesObrigatorias: validado.aceiteVisual.rejeicoes,
    recortesObrigatorios: validado.aceiteVisualRegional?.recortes ?? [],
  };
  if (aceite?.versao === 2 && !validado.aceiteVisualRegional) {
    falhar(`pacote '${id}' não declarou briefing.aceiteVisualRegional; aceite v2 não tem recortes assinados.`);
  }
  const resultado = verificarAceiteParaFechamento(aceite, opcoesAceite, { raizRepositorio });
  if (resultado.veredito.estado !== 'aprovavel') {
    falhar(`aceite reprovado: ${resultado.veredito.motivos.join(', ')}.`);
  }
  const destino = join(pacote, 'aceites', nomeRevisao, 'aceite-tecnico.json');
  if (existsSync(destino)) falhar(`aceite técnico de '${nomeRevisao}' já existe; fechar nunca sobrescreve.`);
  mkdirSync(dirname(destino), { recursive: true });
  const temporario = `${destino}.em-preparo`;
  const saida = { ...resultado, revisao: nomeRevisao };
  writeFileSync(temporario, `${JSON.stringify(saida)}\n`, { encoding: 'utf8', flag: 'wx' });
  renameSync(temporario, destino);
  return { destino, resultado: saida };
}

function argumentos(argv) {
  const resultado = {};
  for (const argumento of argv) {
    const [chave, valor] = argumento.split('=', 2);
    if (!valor || !['--pacote', '--revisao', '--arquivo'].includes(chave)) falhar('uso: --pacote=<id> --revisao=r001 --arquivo=<relativo-ao-pacote>.');
    if (resultado[chave]) falhar(`${chave} veio mais de uma vez.`);
    resultado[chave] = valor;
  }
  if (!resultado['--pacote'] || !resultado['--revisao'] || !resultado['--arquivo']) falhar('uso: --pacote=<id> --revisao=r001 --arquivo=<relativo-ao-pacote>.');
  return { id: resultado['--pacote'], revisao: resultado['--revisao'], arquivoAceite: resultado['--arquivo'] };
}
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
  try {
    const fechado = await fecharAceiteVisual(argumentos(process.argv.slice(2)));
    console.log(`aceite técnico criado: ${relative(RAIZ_REPOSITORIO, fechado.destino).replaceAll('\\', '/')}`);
  } catch (causa) { console.error(causa.message); process.exit(1); }
}
