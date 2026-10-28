/* historico-limpo.test.mjs — o que saiu da pasta e ficou num commit antigo é achado, e o histórico limpo passa. */
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { hashDoCaminho, varrerHistorico } from './historico-limpo.mjs';
import { montarLista, proibidosDaLista } from './termos-proibidos.mjs';

const CHAVE = 'chave-de-ensaio-do-historico';
const proibidos = proibidosDaLista(montarLista(['palavra vetada'], CHAVE), CHAVE);
/* montado por partes para o gate de links não tomar o arquivo do repositório de ensaio por citação */
const VELHO = ['docs', 'velho.md'].join('/');

function repositorio(arquivos) {
  const raiz = mkdtempSync(join(tmpdir(), 'historico-limpo-'));
  const git = (...a) => execFileSync('git', a, { cwd: raiz });
  git('init', '-q'); git('config', 'user.email', 'x@x'); git('config', 'user.name', 'x');
  for (const [caminho, texto] of arquivos) {
    mkdirSync(dirname(join(raiz, caminho)), { recursive: true });
    writeFileSync(join(raiz, caminho), texto);
  }
  git('add', '-A'); git('commit', '-qm', 'primeiro');
  /* apaga da pasta: o que importa é o commit antigo continuar com tudo */
  for (const [caminho] of arquivos) if (caminho !== 'ok.md') rmSync(join(raiz, caminho));
  git('add', '-A'); git('commit', '-qm', 'apaga', '--allow-empty');
  return raiz;
}

describe('histórico limpo', () => {
  it('acha termo, malha e caminho proibido que só existem num commit antigo, e deixa a fixtura sintética', () => {
    const raiz = repositorio([
      ['ok.md', 'nada aqui\n'],
      [VELHO, 'linha\numa palavra vetada aqui\n'],
      ['refs/carro.obj', 'v 0 0 0\n'],
      ['tools/mecanifica/fixtures/importar-stl/sintetico/peca.stl.gz', 'x'],
      ['docs/silhueta.json', '{}\n'],
    ]);
    const r = varrerHistorico(raiz, { proibidos, caminhosProibidos: new Set([hashDoCaminho('docs/silhueta.json')]) });
    expect(r.termos).toEqual([{ caminho: VELHO, linha: 2 }]);
    expect(r.malhas).toEqual(['refs/carro.obj']);
    expect(r.caminhos).toHaveLength(1);
    rmSync(raiz, { recursive: true, force: true });
  });

  it('o histórico sem nada disso passa', () => {
    const raiz = repositorio([['ok.md', 'nada aqui\n']]);
    const r = varrerHistorico(raiz, { proibidos, caminhosProibidos: new Set() });
    expect([r.termos, r.malhas, r.caminhos, r.mensagens.achados]).toEqual([[], [], [], []]);
    rmSync(raiz, { recursive: true, force: true });
  });
});
