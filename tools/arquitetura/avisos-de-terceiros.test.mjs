/* avisos-de-terceiros.test.mjs — toda dependência de runtime que entra no pacote da bancada tem seção em
   THIRD-PARTY-NOTICES.md, e o build a copia para `dist/`. As licenças MIT, ISC e Apache-2.0 exigem o aviso de copyright e o
   texto da licença na distribuição; uma dependência nova no pacote sem a seção correspondente falha aqui. */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ARQUIVO_DOS_AVISOS } from '../bancadas/avisos-de-terceiros.mjs';

const REPO = resolve(fileURLToPath(new URL('.', import.meta.url)), '../..');
const ENTRADA = 'src/bancada/entrada.js';
const IMPORTA = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)['"]([^'"]+)['"]/g;
const EXTENSOES = ['', '.js', '.mjs', '/index.js'];

function resolverRelativo(de, alvo) {
  const base = resolve(dirname(de), alvo);
  return EXTENSOES.map((e) => base + e).find((c) => existsSync(c) && /\.m?js$/.test(c));
}

function nomeDoPacote(especificador) {
  const partes = especificador.split('/');
  return especificador.startsWith('@') ? partes.slice(0, 2).join('/') : partes[0];
}

/* pacotes (bare imports) alcançados a partir da entrada da bancada, seguindo os imports relativos */
export function pacotesDoPacoteDaBancada(raiz = REPO) {
  const vistos = new Set();
  const pacotes = new Set();
  const fila = [join(raiz, ENTRADA)];
  while (fila.length) {
    const arquivo = fila.pop();
    if (vistos.has(arquivo)) continue;
    vistos.add(arquivo);
    const texto = readFileSync(arquivo, 'utf8');
    for (const [, especificador] of texto.matchAll(IMPORTA)) {
      if (especificador.startsWith('.')) {
        const destino = resolverRelativo(arquivo, especificador);
        if (destino) fila.push(destino);
      } else if (!especificador.startsWith('node:') && !especificador.startsWith('/')) {
        pacotes.add(nomeDoPacote(especificador));
      }
    }
  }
  return pacotes;
}

describe('avisos de terceiros no pacote da bancada', () => {
  const pacote = JSON.parse(readFileSync(join(REPO, 'package.json'), 'utf8'));
  const avisos = existsSync(join(REPO, ARQUIVO_DOS_AVISOS)) ? readFileSync(join(REPO, ARQUIVO_DOS_AVISOS), 'utf8') : '';

  it('o arquivo de avisos existe na raiz', () => {
    expect(existsSync(join(REPO, ARQUIVO_DOS_AVISOS))).toBe(true);
  });

  it('a bancada empacota ao menos uma dependência de runtime (a varredura enxerga a entrada)', () => {
    const empacotadas = [...pacotesDoPacoteDaBancada()].filter((nome) => nome in (pacote.dependencies ?? {}));
    expect(empacotadas.length).toBeGreaterThan(0);
  });

  it('toda dependência de runtime empacotada tem seção com versão, licença e texto da licença', () => {
    const faltando = [];
    for (const nome of pacotesDoPacoteDaBancada()) {
      if (!(nome in (pacote.dependencies ?? {}))) continue;
      const instalado = JSON.parse(readFileSync(join(REPO, 'node_modules', nome, 'package.json'), 'utf8'));
      const inicio = avisos.indexOf(`\n## ${nome}\n`);
      const secao = inicio < 0 ? '' : avisos.slice(inicio + 1).split(/\n## /)[0];
      const completa = secao.includes(`- Versão: ${instalado.version}`) && secao.includes(`- Licença: ${instalado.license}`) && secao.includes('Copyright');
      if (!completa) faltando.push(`${nome}@${instalado.version} (${instalado.license})`);
    }
    expect(faltando, `sem seção completa em ${ARQUIVO_DOS_AVISOS}`).toEqual([]);
  });
});
