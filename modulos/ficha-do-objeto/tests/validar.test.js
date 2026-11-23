/* validar.test.js — a cópia dos esquemas da ponte confere com o SHA-256 da última versão do `versoes.json` copiado junto (decisão
   0004 do nos-mecatronica), e o conferidor aceita os exemplos de lá e recusa cada erro com o caminho do campo e a versão. */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import ficha from './exemplos/braco-de-prova.ficha.json' with { type: 'json' };
import pedido from './exemplos/braco-de-prova.pedido.json' with { type: 'json' };
import { VERSOES, conferirDocumento, textoDosErros } from '../src/index.js';

const ESQUEMAS = join(dirname(fileURLToPath(import.meta.url)), '../esquemas');
const copia = (x) => structuredClone(x);
const caminhos = (r) => r.erros.map((e) => e.caminho);

describe('a cópia dos esquemas', () => {
  const versoes = JSON.parse(readFileSync(join(ESQUEMAS, 'versoes.json'), 'utf8')).versoes;
  const ultima = versoes.at(-1);

  it('confere byte a byte com o SHA-256 da última versão de lá', () => {
    for (const nome of ['ficha.schema.json', 'pedido.schema.json']) {
      const sha = createHash('sha256').update(readFileSync(join(ESQUEMAS, nome))).digest('hex');
      expect(sha, `${nome}: copie de novo de ponte/esquemas/ do nos-mecatronica, sem editar`).toBe(ultima[nome]);
    }
  });

  it('conhece as versões que o versoes.json lista', () => {
    expect(VERSOES.ficha).toEqual(versoes.map((v) => v.versao));
    expect(VERSOES.pedido).toEqual(versoes.map((v) => v.versao));
  });
});

describe('conferirDocumento', () => {
  it('aceita a ficha e o pedido do braço de prova de lá', () => {
    expect(conferirDocumento(ficha).erros).toEqual([]);
    expect(conferirDocumento(pedido, { ficha }).erros).toEqual([]);
  });

  it('recusa campo ausente e valor sem origem com o caminho do campo e a versão', () => {
    const f = copia(ficha); delete f.malha.caixa; delete f.pecas[0].posicao.origem;
    const r = conferirDocumento(f);
    expect(caminhos(r)).toEqual(expect.arrayContaining(['$.malha.caixa', '$.pecas[0].posicao.origem']));
    expect(textoDosErros(r)).toMatch(/^ficha 1\.1: \$\.malha\.caixa campo obrigatório ausente/m);
  });

  it('recusa versão desconhecida dizendo as que a cópia conhece', () => {
    const r = conferirDocumento({ ...ficha, versao: '2.0' });
    expect(r.erros).toEqual([{ caminho: '$.versao', regra: expect.stringContaining('1.0, 1.1'), valor: '2.0' }]);
  });

  it('recusa porta de peça que não existe e junta com o filho no conjunto do pai', () => {
    const f = copia(ficha); f.portas[0].peca = 'nao-existe';
    expect(conferirDocumento(f).erros).toEqual([expect.objectContaining({ caminho: '$.portas[0].peca', valor: 'nao-existe' })]);
    const g = copia(ficha); const filho = g.pecas.find((p) => p.id === g.juntas[0].filho);
    filho.conjunto = g.pecas.find((p) => p.id === g.juntas[0].pai).conjunto;
    expect(caminhos(conferirDocumento(g))).toContain('$.juntas[0].filho');
  });

  it('recusa a porta passiva num arquivo 1.0, que não a conhece', () => {
    const f = copia(ficha); f.versao = '1.0';
    expect(caminhos(conferirDocumento(f)).some((c) => c.startsWith('$.portas['))).toBe(true);
  });

  it('no pedido, recusa terminal que não é porta da ficha e terminal em duas redes', () => {
    const p = copia(pedido); const lig = p.itens.find((i) => i.tipo === 'ligacoes'); const k = p.itens.indexOf(lig);
    lig.redes[0].terminais[0] = { peca: lig.redes[0].terminais[0].peca, porta: 'nao-existe' };
    lig.redes[1].terminais.push(lig.redes[2].terminais[0]);
    const r = conferirDocumento(p, { ficha });
    expect(caminhos(r)).toContain(`$.itens[${k}].redes[0].terminais[0].porta`);
    expect(r.erros.find((e) => e.regra.startsWith('terminal já ligado'))).toBeTruthy();
  });

  it('recusa o pedido de outra revisão da ficha', () => {
    const p = copia(pedido); p.ficha.revisao += 1;
    expect(caminhos(conferirDocumento(p, { ficha }))).toEqual(['$.ficha.revisao']);
  });
});
