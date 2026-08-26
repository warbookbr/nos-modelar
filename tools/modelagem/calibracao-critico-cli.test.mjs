/* CLI offline: separa lote público, chave local e respostas para auditoria. */
import { describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { gerarCorpusP0 } from './gerar-corpus-p0.mjs';
import { assinarJulgamentoCritico } from './contrato-julgamento-critico.mjs';
import { executarCalibracaoCriticoCLI } from './calibracao-critico-cli.mjs';

const raiz = resolve(import.meta.dirname, '..', '..');
const sha = (n) => `sha256:${n.toString(16).padStart(64, '0')}`;

function resposta(apresentacao, lote) {
  const base = { formato: 'mecanifica.julgamento-critico@2', lote: lote.id, assinaturaLote: lote.assinatura, apresentacao: apresentacao.id, decisao: 'primeira', achados: [], confianca: 0.7, provedor: 'simulador', modelo: 'teste', hashPrompt: sha(7) };
  return { ...base, assinaturaResposta: assinarJulgamentoCritico(base) };
}

describe('CLI da calibração crítica', () => {
  it('exporta estímulo e chave em arquivos distintos e normaliza a resposta sem rede', () => {
    gerarCorpusP0();
    const pasta = mkdtempSync(join(tmpdir(), 'mecanifica-critico-cli-'));
    try {
      const manifesto = resolve(raiz, 'autoria-assistida/avaliacao/corpus-p0/manifesto.json');
      const lote = join(pasta, 'lote-publico.json'); const chave = join(pasta, 'chave-local.json'); const respostas = join(pasta, 'respostas.json'); const normalizado = join(pasta, 'normalizado.json');
      expect(executarCalibracaoCriticoCLI(['exportar', manifesto, lote, chave])).toMatchObject({ comando: 'exportar', apresentacoes: 400 });
      const lotePublico = JSON.parse(readFileSync(lote, 'utf8'));
      expect(JSON.stringify(lotePublico)).not.toMatch(/"papel"|"item"|"ordem"/);
      writeFileSync(respostas, `${JSON.stringify(lotePublico.apresentacoes.map((apresentacao) => resposta(apresentacao, lotePublico)), null, 2)}\n`);
      expect(executarCalibracaoCriticoCLI(['ingerir', lote, chave, respostas, normalizado])).toMatchObject({ comando: 'ingerir', respostas: 400 });
      expect(JSON.parse(readFileSync(normalizado, 'utf8')).julgamentos).toHaveLength(400);
    } finally { rmSync(pasta, { recursive: true, force: true }); }
  });
});
