/* argumentos.test.ts — prova de que os CLIs da Mecanifica não engolem bandeira
   desconhecida em silêncio (MEDIA-7). O defeito: `--estrit` (uma letra a menos
   que `--estrito`) saía 0 SEM UMA LINHA de aviso, e o gate sumia por causa de um
   typo; `--parte=disco` imprimia o relatório inteiro enquanto o autor achava que
   tinha filtrado; e `freio-disco caixa-ferramentas` media a primeira e
   descartava a segunda calado. Contradizia o cabeçalho do próprio arquivo
   ("medir a peça errada em silêncio é pior do que não medir") e a lei do
   CLAUDE.md — referência inválida FALHA com diagnóstico, nunca vira no-op.

   Os dois CLIs são irmãos e a inconsistência entre eles é armadilha, então a
   leitura é uma só e os dois são exercitados aqui. */
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
// @ts-expect-error — leitura de argumentos em JavaScript, exercitada pela API pública.
import { lerArgumentos } from './argumentos.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const DESCREVER = resolve(REPO, 'tools/mecanifica/descrever-peca.mjs');
const BANCADA = resolve(REPO, 'tools/mecanifica/olhar-bancada.mjs');

const VOCABULARIO = {
  opcoes: ['partes', 'casas'],
  bandeiras: ['listar', 'estrito'],
  posicional: { nome: 'a peça', obrigatorio: false },
};

function correr(cli: string, args: string[]) {
  try {
    return { saida: execFileSync('node', [cli, ...args], { encoding: 'utf8' }), codigo: 0 };
  } catch (erro: any) {
    return { saida: `${erro.stdout ?? ''}${erro.stderr ?? ''}`, codigo: erro.status };
  }
}

describe('lerArgumentos: o vocabulário é declarado e nada passa fora dele', () => {
  it('lê opção, bandeira e o argumento solto', () => {
    const lido = lerArgumentos(['freio-disco', '--partes=disco,pistao', '--estrito'], VOCABULARIO);
    expect(lido.posicional).toBe('freio-disco');
    expect(lido.opcao('partes')).toBe('disco,pistao');
    expect(lido.opcao('casas', '6')).toBe('6');
    expect(lido.bandeira('estrito')).toBe(true);
    expect(lido.bandeira('listar')).toBe(false);
    expect(lerArgumentos([], VOCABULARIO).posicional).toBe(null);
  });

  it('grita em nome desconhecido e diz o que recebeu, o que aceita e o que era para ser', () => {
    expect(() => lerArgumentos(['--estrit'], VOCABULARIO))
      .toThrow(/não conheço '--estrit'.*Você quis dizer '--estrito'\?/s);
    expect(() => lerArgumentos(['--parte=disco'], VOCABULARIO))
      .toThrow(/não conheço '--parte'.*Você quis dizer '--partes'\?/s);
    /* o diagnóstico nomeia o vocabulário inteiro, não só o erro */
    expect(() => lerArgumentos(['--xyzabc'], VOCABULARIO))
      .toThrow(/aceito: opções: --partes=<valor>, --casas=<valor>; bandeiras: --listar, --estrito/);
    expect(() => lerArgumentos(['-estrito'], VOCABULARIO)).toThrow(/dois traços/);
    expect(() => lerArgumentos(['--'], VOCABULARIO)).toThrow(/dois traços/);
    expect(() => lerArgumentos(['--=1'], VOCABULARIO)).toThrow(/sem nome/);
  });

  it('grita em opção sem valor, bandeira com valor e repetição ambígua', () => {
    expect(() => lerArgumentos(['--partes'], VOCABULARIO)).toThrow(/'--partes' é opção e precisa de valor/);
    expect(() => lerArgumentos(['--estrito=1'], VOCABULARIO)).toThrow(/'--estrito' é bandeira e não aceita valor/);
    expect(() => lerArgumentos(['--casas=3', '--casas=6'], VOCABULARIO))
      .toThrow(/veio mais de uma vez \('3' e '6'\).*ambiguidade/s);
    expect(() => lerArgumentos(['--estrito', '--estrito'], VOCABULARIO)).toThrow(/mais de uma vez/);
  });

  it('grita em argumento solto a mais, e em argumento solto onde nenhum é aceito', () => {
    expect(() => lerArgumentos(['freio-disco', 'caixa-ferramentas'], VOCABULARIO))
      .toThrow(/recebi 2 valores para a peça: 'freio-disco', 'caixa-ferramentas'/);
    expect(() => lerArgumentos(['freio-disco'], { bandeiras: ['listar'] }))
      .toThrow(/não aceita argumento solto/);
    expect(() => lerArgumentos([], { ...VOCABULARIO, posicional: { nome: 'a peça', obrigatorio: true } }))
      .toThrow(/diga a peça/);
  });

  it('não deixa o CLI perguntar por nome que ele não declarou', () => {
    const lido = lerArgumentos([], VOCABULARIO);
    expect(() => lido.opcao('vistas')).toThrow(/não foi declarado como opção/);
    expect(() => lido.bandeira('focar')).toThrow(/não foi declarado como bandeira/);
  });
});

describe('os dois CLIs irmãos param no mesmo typo', () => {
  it('descrever-peca: o typo não some com o gate do --estrito', () => {
    const gate = correr(DESCREVER, ['caixa-ferramentas', '--estrito']);
    expect(gate.codigo).toBe(1);
    expect(gate.saida).toMatch(/sem identidade semântica/);

    const typo = correr(DESCREVER, ['caixa-ferramentas', '--estrit']);
    expect(typo.codigo).toBe(2);
    expect(typo.saida).toMatch(/não conheço '--estrit'/);
  });

  it('descrever-peca: o typo do filtro não passa por relatório filtrado', () => {
    const filtrado = correr(DESCREVER, ['freio-disco', '--partes=disco']);
    expect(filtrado.codigo).toBe(0);
    expect(filtrado.saida).toMatch(/partes: 1 de 8/);

    const typo = correr(DESCREVER, ['freio-disco', '--parte=disco']);
    expect(typo.codigo).toBe(2);
    expect(typo.saida).toMatch(/não conheço '--parte'/);
    expect(typo.saida).not.toMatch(/CAIXA POR PARTE/);
  });

  it('descrever-peca: duas peças de uma vez não medem a primeira calado', () => {
    const duas = correr(DESCREVER, ['freio-disco', 'caixa-ferramentas']);
    expect(duas.codigo).toBe(2);
    expect(duas.saida).toMatch(/recebi 2 valores para a peça/);
    expect(duas.saida).not.toMatch(/peça: freio-disco/);
  });

  it('olhar-bancada: mesma lei, e a recusa vem antes de subir navegador', () => {
    const typo = correr(BANCADA, ['freio-disco', '--vista=frontal']);
    expect(typo.codigo).toBe(2);
    expect(typo.saida).toMatch(/olhar-bancada: não conheço '--vista'.*Você quis dizer '--vistas'\?/s);

    const desconhecida = correr(BANCADA, ['--lixo=1']);
    expect(desconhecida.codigo).toBe(2);
    expect(desconhecida.saida).toMatch(/não conheço '--lixo'/);

    const duas = correr(BANCADA, ['freio-disco', 'caixa-ferramentas']);
    expect(duas.codigo).toBe(2);
    expect(duas.saida).toMatch(/recebi 2 valores para a peça/);

    /* --focar exige seleção, e a recusa é antes do navegador: `process.exit`
       não roda o `finally` que fecha Chromium e Vite. */
    const focar = correr(BANCADA, ['freio-disco', '--focar']);
    expect(focar.codigo).toBe(2);
    expect(focar.saida).toMatch(/--focar exige --selecionadas/);
  });
});
