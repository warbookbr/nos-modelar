/* Porta offline para enviar estímulos e reingressar respostas sem chamar rede/modelo. */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { exportarLoteCritico, ingerirRespostasCritico } from './orquestrar-calibracao-critico.mjs';

function falhar(mensagem) { throw new Error(`calibracao-critico-cli: ${mensagem}`); }
function lerJson(arquivo) {
  try { return JSON.parse(readFileSync(arquivo, 'utf8')); } catch (erro) { falhar(`não foi possível ler JSON ${arquivo}: ${erro.message}`); }
}
function escreverJson(arquivo, valor) { writeFileSync(arquivo, `${JSON.stringify(valor, null, 2)}\n`, 'utf8'); }

export function executarCalibracaoCriticoCLI(argumentos) {
  const [comando, ...caminhos] = argumentos;
  if (comando === 'exportar') {
    if (caminhos.length !== 3) falhar('uso exportar <manifesto.json> <lote-publico.json> <chave-local.json>.');
    const [manifesto, lotePublico, chaveLocal] = caminhos.map((caminho) => resolve(caminho));
    const { lote, chavePrivada } = exportarLoteCritico(lerJson(manifesto));
    escreverJson(lotePublico, lote); escreverJson(chaveLocal, chavePrivada);
    return Object.freeze({ comando, lote: lote.id, apresentacoes: lote.apresentacoes.length, lotePublico, chaveLocal });
  }
  if (comando === 'ingerir') {
    if (caminhos.length !== 4) falhar('uso ingerir <lote-publico.json> <chave-local.json> <respostas.json> <normalizado.json>.');
    const [lotePublico, chaveLocal, respostas, normalizado] = caminhos.map((caminho) => resolve(caminho));
    const resultado = ingerirRespostasCritico(lerJson(lotePublico), lerJson(chaveLocal), lerJson(respostas));
    escreverJson(normalizado, resultado);
    return Object.freeze({ comando, lote: resultado.lote, respostas: resultado.respostas, normalizado });
  }
  falhar('comando precisa ser exportar ou ingerir.');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { process.stdout.write(`${JSON.stringify(executarCalibracaoCriticoCLI(process.argv.slice(2)))}\n`); } catch (erro) { process.stderr.write(`${erro.message}\n`); process.exitCode = 1; }
}
