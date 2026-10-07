/* A regra da nota no Condutor (plano "O esboço detalhado coerente", fatia 7): a unidade com brief (ou o Marco) cujo último
   veredito é menor que 8 bloqueia o --feito de outra unidade e o --proximo; três vereditos abaixo de 8 travam, e só --liberar com
   motivo (autorização da pessoa) destrava, gravando a liberação no histórico. Reproduz o caso da empilhadeira. */
import { describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { avancar, criarEstado, liberar, marcarFeito, registrarVeredito } from '../src/condutor.js';
import { condutorArquivo } from '../../../tools/mecanifica/esboco.mjs';

const caixa = (id, centro, extra = {}) => ({ id, tipo: 'caixa', largura: 20, altura: 20, profundidade: 20, centro, ...extra });
const medida = (nome, valor, mede) => ({ nome, valor, unidade: 'mm', origem: 'ficha', tolerancia: 1, mede });
const grande = () => ({
  contato: { usar: true, tolerancia: 1, penetracao: 1, folga: 100 },
  plano: { nivel: 'detalhado', medidas: [medida('a', 20, 'alturaTotal'), medida('b', 200, 'larguraTotal'), medida('c', 200, 'larguraTotal'), medida('d', 200, 'larguraTotal'), medida('e', 200, 'larguraTotal')], contrato: { tocam: [['c0', 'c1']] } },
  unidades: { fila: { funcao: 'fileira de caixas encostadas que faz o corpo do objeto' } },
  opcoes: [{ titulo: 'T', formas: [...Array.from({ length: 9 }, (_, i) => caixa(`c${i}`, [10 + 20 * i, 10, 0], { unidade: 'fila' })), caixa('p', [190, 10, 0], { unidade: 'ponta' })] }],
});
const naDetalhe = (e) => { let s = criarEstado(e, 'x.esboco.json'); for (let i = 0; i < 3; i++) s = avancar(e, s).estado; expect(s.atual).toBe('detalhe-por-unidade'); return s; };
const MOTIVO = 'a nota ficou abaixo do mínimo';
const vered = (s, unidade, ...notas) => notas.reduce((x, nota) => registrarVeredito(x, { unidade, nota, motivo: MOTIVO }), s);
const gravar = (e, estado) => {
  const arquivo = join(mkdtempSync(join(tmpdir(), 'nota-')), 'g.esboco.json');
  writeFileSync(arquivo, JSON.stringify(e));
  writeFileSync(`${arquivo}.condutor.json`, JSON.stringify(estado));
  return arquivo;
};

describe('a nota abaixo de 8 bloqueia o resto do fluxo', () => {
  it('bloqueia o --feito de outra unidade, com unidade, nota, rodada e o que fazer', () => {
    const e = grande();
    const s = vered(naDetalhe(e), 'fila', 5);
    expect(() => marcarFeito(e, s, 'ponta')).toThrow(/"fila".*nota 5.*rodada 1 de 3.*refaça a unidade.*--feito fila de novo/);
  });

  it('refazer a própria unidade continua permitido, e a nota 8 ou mais libera', () => {
    const e = grande();
    const s = vered(naDetalhe(e), 'fila', 5);
    expect(marcarFeito(e, s, 'fila').estado.unidades.find((u) => u.id === 'fila').feito).toBe(true);
    expect(marcarFeito(e, vered(s, 'fila', 8), 'ponta').estado.unidades.find((u) => u.id === 'ponta').feito).toBe(true);
  });

  it('o último veredito é o que vale: 3 e depois 9 libera', () => {
    const e = grande();
    expect(marcarFeito(e, vered(naDetalhe(e), 'fila', 3, 9), 'ponta').estado.unidades.find((u) => u.id === 'ponta').feito).toBe(true);
  });

  it('unidade sem brief (até 8 formas) não é afetada, mesmo com nota baixa', () => {
    const e = grande();
    expect(marcarFeito(e, vered(naDetalhe(e), 'ponta', 2, 2, 2), 'fila').estado.unidades.find((u) => u.id === 'fila').feito).toBe(true);
  });

  it('o Marco com nota baixa bloqueia o --feito e o --proximo', () => {
    const e = grande();
    let s = marcarFeito(e, naDetalhe(e), 'ponta').estado;
    s.marcos.push({ limiar: 50, custoFeito: 1, custoTotal: 10, unidades: ['ponta'], chamar: 'critico', imagens: 'limpas' });
    s = vered(s, 'marco-50', 6);
    expect(() => marcarFeito(e, s, 'fila')).toThrow(/marco-50.*nota 6.*rodada 1 de 3/);
    const r = avancar(e, s);
    expect(r.ok).toBe(false);
    expect(r.bloqueio).toMatch(/marco-50.*nota 6.*rodada 1 de 3/);
  });
});

describe('o Marco abaixo de 8 deixa refazer as unidades que ele cobre', () => {
  const comMarco = (...notas) => {
    const e = grande();
    let s = marcarFeito(e, naDetalhe(e), 'ponta').estado;
    s.marcos.push({ limiar: 50, custoFeito: 1, custoTotal: 10, unidades: ['ponta'], chamar: 'critico', imagens: 'limpas' });
    return { e, s: vered(s, 'marco-50', ...notas) };
  };

  it('o --feito de unidade fechada no Marco passa (é a correção); o de unidade nova e o --proximo seguem recusados', () => {
    const { e, s } = comMarco(5);
    expect(marcarFeito(e, s, 'ponta').estado.unidades.find((u) => u.id === 'ponta').feito).toBe(true);
    expect(() => marcarFeito(e, s, 'fila')).toThrow(/marco-50.*nota 5.*rodada 1 de 3/);
    expect(avancar(e, s).ok).toBe(false);
  });

  it('o Marco travado (3 rodadas) bloqueia até a unidade que ele cobre', () => {
    const { e, s } = comMarco(5, 5, 6);
    expect(() => marcarFeito(e, s, 'ponta')).toThrow(/marco-50.*rodada 3 de 3/);
  });
});

describe('três rodadas abaixo de 8 travam, e só --liberar destrava', () => {
  it('na terceira rodada a mensagem manda pedir autorização explícita e citar --liberar', () => {
    const e = grande();
    expect(() => marcarFeito(e, vered(naDetalhe(e), 'fila', 3, 5, 6), 'ponta')).toThrow(/rodada 3 de 3.*--liberar fila --motivo.*autorização explícita à pessoa/);
  });

  it('--liberar antes de três rodadas é recusado, e sem bloqueio também', () => {
    const e = grande();
    expect(() => liberar(vered(naDetalhe(e), 'fila', 3, 5), { unidade: 'fila', motivo: 'a pessoa mandou seguir mesmo assim' })).toThrow(/depois de 3 vereditos.*rodada 2 de 3/);
    expect(() => liberar(vered(naDetalhe(e), 'fila', 9), { unidade: 'fila', motivo: 'a pessoa mandou seguir mesmo assim' })).toThrow(/não está bloqueada/);
  });

  it('--liberar exige motivo, grava a liberação no histórico, sobe o estado para 3 e solta o fluxo', () => {
    const e = grande();
    const s = vered(naDetalhe(e), 'fila', 3, 5, 6);
    expect(() => liberar(s, { unidade: 'fila', motivo: 'curto' })).toThrow(/motivo/);
    const l = liberar(s, { unidade: 'fila', motivo: 'a pessoa autorizou seguir com a cabine assim' });
    expect(l.versao).toBe(3);
    expect(l.liberacoes).toEqual([{ ordem: 1, unidade: 'fila', nota: 6, rodadas: 3, aposVeredito: 3, motivo: 'a pessoa autorizou seguir com a cabine assim' }]);
    expect(marcarFeito(e, l, 'ponta').estado.unidades.find((u) => u.id === 'ponta').feito).toBe(true);
    /* uma nova nota baixa depois da liberação volta à rodada 1 */
    expect(() => marcarFeito(e, vered(l, 'fila', 4), 'ponta')).toThrow(/rodada 1 de 3/);
  });

  it('refazer a unidade travada também é recusado enquanto não houver liberação', () => {
    const e = grande();
    expect(() => marcarFeito(e, vered(naDetalhe(e), 'fila', 3, 5, 6), 'fila')).toThrow(/--liberar fila/);
  });
});

describe('estado antigo e linha de comando', () => {
  it('estado de versão 1 ou 2 sem vereditos baixos segue como estava', () => {
    const e = grande();
    const v1 = naDetalhe(e);
    expect(v1.versao).toBe(1);
    expect(marcarFeito(e, v1, 'ponta').estado.unidades.find((u) => u.id === 'ponta').feito).toBe(true);
  });

  it('reproduz a empilhadeira: cabine 3, 5, 6 e marco-50 6, 5, 3 num estado de versão 2 travam, e --liberar solta cada um', () => {
    const e = grande();
    let s = marcarFeito(e, naDetalhe(e), 'fila').estado;
    s.marcos.push({ limiar: 50, custoFeito: 9, custoTotal: 10, unidades: ['fila'], chamar: 'critico', imagens: 'limpas' });
    s = vered(vered(s, 'fila', 3, 5, 6), 'marco-50', 6, 5, 3);
    expect(s.versao).toBe(2);
    const arquivo = gravar(e, s);
    expect(() => condutorArquivo(arquivo, { feito: 'ponta' })).toThrow(/"fila".*rodada 3 de 3.*marco-50.*rodada 3 de 3/);
    const prox = condutorArquivo(arquivo, { proximo: true });
    expect(prox.codigo).toBe(1);
    expect(prox.texto).toMatch(/avanço recusado:.*rodada 3 de 3/);
    expect(() => condutorArquivo(arquivo, { liberar: 'fila', motivo: 'curto' })).toThrow(/motivo/);
    condutorArquivo(arquivo, { liberar: 'fila', motivo: 'a pessoa autorizou seguir com a cabine' });
    expect(() => condutorArquivo(arquivo, { feito: 'ponta' })).toThrow(/marco-50/);
    condutorArquivo(arquivo, { liberar: 'marco-50', motivo: 'a pessoa autorizou seguir com o marco' });
    expect(condutorArquivo(arquivo, { feito: 'ponta' }).codigo).toBe(0);
    const gravado = JSON.parse(readFileSync(`${arquivo}.condutor.json`, 'utf8'));
    expect(gravado.versao).toBe(3);
    expect(gravado.liberacoes.map((l) => l.unidade)).toEqual(['fila', 'marco-50']);
    expect(condutorArquivo(arquivo, { historico: true }).texto).toContain('liberação 1: fila (nota 6 em 3 rodadas) liberada com o motivo: a pessoa autorizou seguir com a cabine');
  });

  describe('registro de tokens no veredito', () => {
    it('grava tokens quando recebe e não grava quando não recebe', () => {
      const e = grande();
      const s = naDetalhe(e);
      const comTokens = registrarVeredito(s, { unidade: 'fila', nota: 8, motivo: 'motivo valido de teste com mais de 15 caracteres', tokens: 4500 });
      expect(comTokens.vereditos[0].tokens).toBe(4500);

      const semTokens = registrarVeredito(s, { unidade: 'fila', nota: 8, motivo: 'motivo valido de teste com mais de 15 caracteres' });
      expect('tokens' in semTokens.vereditos[0]).toBe(false);
    });

    it('recusa tokens negativo ou não inteiro', () => {
      const e = grande();
      const s = naDetalhe(e);
      expect(() => registrarVeredito(s, { unidade: 'fila', nota: 8, motivo: 'motivo valido de teste com mais de 15 caracteres', tokens: -10 })).toThrow(/tokens/);
      expect(() => registrarVeredito(s, { unidade: 'fila', nota: 8, motivo: 'motivo valido de teste com mais de 15 caracteres', tokens: 10.5 })).toThrow(/tokens/);
    });

    it('grava tokens através do condutorArquivo quando informado', () => {
      const e = grande();
      const s = naDetalhe(e);
      const arquivo = gravar(e, s);
      condutorArquivo(arquivo, { veredito: 'fila', nota: 8, motivo: 'motivo valido de teste com mais de 15 caracteres', tokens: 1200 });
      const gravado = JSON.parse(readFileSync(`${arquivo}.condutor.json`, 'utf8'));
      expect(gravado.vereditos[0].tokens).toBe(1200);

      const arquivo2 = gravar(e, s);
      condutorArquivo(arquivo2, { veredito: 'fila', nota: 8, motivo: 'motivo valido de teste com mais de 15 caracteres' });
      const gravado2 = JSON.parse(readFileSync(`${arquivo2}.condutor.json`, 'utf8'));
      expect('tokens' in gravado2.vereditos[0]).toBe(false);
    });
  });
});

