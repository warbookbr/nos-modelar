/* descrever-partes.test.ts — prova do O-1: a conferência de uma peça é NÚMERO,
   não leitura de PNG (ATRITOS-AUTORIA A-13). Mede três coisas: que o módulo
   neutro extraído mede o mesmo que a medição manual que existia dentro do teste
   do freio; que os quatro encaixes que importam saem como número; e que a saída
   é determinística e grita em referência inválida — senão não pode virar teste
   nem contrato. */
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
// @ts-expect-error — núcleo legado em JavaScript, exercitado pela API pública.
import { nucleo } from '../../prototipos/fps/v3/motor/oficina.js';
// @ts-expect-error — peça em JavaScript, exercitada em runtime pelo Vitest.
import * as freio from '../../prototipos/fps/v3/pecas/freio-disco.js';
// @ts-expect-error — adaptador novo em JavaScript.
import { adaptarThree } from '../../src/autoria/adaptar-three.js';
// @ts-expect-error — módulo neutro de medição em JavaScript.
import { caixaDaParte, caixasPorParte, descreverPeca, formatarDescricao, relacaoEntreCaixas } from '../../src/autoria/descrever-partes.js';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const CLI = resolve(REPO, 'tools/mecanifica/descrever-peca.mjs');

function montar() {
  return nucleo(
    freio.PASSOS, freio.PARAMS, freio.TOPO, freio.MATERIAIS, null, freio.ALIASES,
  );
}

/* a medição que existia DENTRO de freio-disco-integridade.test.ts, mantida aqui
   como oráculo independente: o módulo extraído precisa medir exatamente o mesmo. */
function caixaManual(neutro: any, parte: string) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  let faces = 0;
  for (const face of neutro.F.values()) {
    if (face.parte !== parte) continue;
    faces++;
    for (const v of face.vs) {
      const p = neutro.V.get(v);
      for (let k = 0; k < 3; k++) {
        if (p[k] < min[k]) min[k] = p[k];
        if (p[k] > max[k]) max[k] = p[k];
      }
    }
  }
  return { faces, min, max };
}

function relacao(descricao: any, a: string, b: string) {
  const achada = descricao.relacoes.find((r: any) => r.a === a && r.b === b);
  if (!achada) throw new Error(`o relatório não tem a relação ${a}↔${b}`);
  return achada;
}

const cli = (args: string[]) => {
  try {
    return { saida: execFileSync('node', [CLI, ...args], { encoding: 'utf8' }), codigo: 0 };
  } catch (erro: any) {
    return { saida: `${erro.stdout ?? ''}${erro.stderr ?? ''}`, codigo: erro.status };
  }
};

describe('descrever-partes: a medição headless de uma peça', () => {
  it('mede exatamente o que a medição manual media, parte por parte', () => {
    const neutro = montar();
    const { caixas, facesSemParte } = caixasPorParte(neutro);
    expect(facesSemParte).toEqual([]);
    expect(caixas.size).toBe(8);
    for (const [nome, caixa] of caixas) {
      const manual = caixaManual(neutro, nome);
      expect(caixa.faces).toBe(manual.faces);
      expect(caixa.min).toEqual(manual.min);
      expect(caixa.max).toEqual(manual.max);
      /* centro e dimensões são derivados, não uma segunda medida */
      for (let k = 0; k < 3; k++) {
        expect(caixa.centro[k]).toBeCloseTo((manual.min[k] + manual.max[k]) / 2, 12);
        expect(caixa.dimensoes[k]).toBeCloseTo(manual.max[k] - manual.min[k], 12);
      }
    }
  });

  it('ordena as partes por ponto de código, sem depender do idioma do sistema', () => {
    const { caixas } = caixasPorParte(montar());
    const nomes = [...caixas.keys()];
    expect(nomes).toEqual([...nomes].sort());
    expect(nomes).toEqual([
      'cubo', 'disco', 'flexivel', 'pastilhaExterna',
      'pastilhaInterna', 'pinca', 'pistao', 'suporte',
    ]);
  });

  it('grita em referência inválida, ambígua ou vazia — nunca devolve nada calado', () => {
    const neutro = montar();
    expect(() => caixaDaParte(neutro, 'pastilha')).toThrow(/não tem parte 'pastilha'.*pastilhaInterna/s);
    expect(() => caixaDaParte(neutro, '')).toThrow(/texto não vazio/);
    expect(() => caixaDaParte(neutro, null)).toThrow(/texto não vazio/);
    expect(() => caixaDaParte({}, 'disco')).toThrow(/estado neutro inválido/);
    expect(() => descreverPeca(neutro, { partes: [] })).toThrow(/lista de partes vazia/);
    expect(() => descreverPeca(neutro, { partes: ['disco', 'disco'] })).toThrow(/mais de uma vez/);
    expect(() => descreverPeca(neutro, { partes: ['disco', 'roda'] })).toThrow(/não tem parte 'roda'/);
    expect(() => descreverPeca(neutro, { tolerancia: -1 })).toThrow(/tolerância/);
    expect(() => relacaoEntreCaixas({ min: [0, 0], max: [1, 1, 1] }, { min: [0, 0, 0], max: [1, 1, 1] }))
      .toThrow(/3 números finitos/);
  });

  it('classifica folga, contato e interpenetração com número exato', () => {
    const cubo = { nome: 'a', min: [0, 0, 0], max: [1, 1, 1] };
    const separado = relacaoEntreCaixas(cubo, { nome: 'b', min: [1.5, 0, 0], max: [2, 1, 1] });
    expect(separado).toMatchObject({ a: 'a', b: 'b', tipo: 'folga', eixo: 'x' });
    expect(separado.distancia).toBeCloseTo(0.5, 12);

    const diagonal = relacaoEntreCaixas(cubo, { min: [1.3, 1.4, 0], max: [2, 2, 1] });
    expect(diagonal.tipo).toBe('folga');
    expect(diagonal.distancia).toBeCloseTo(Math.sqrt(0.3 ** 2 + 0.4 ** 2), 12);

    const encostado = relacaoEntreCaixas(cubo, { min: [1, 0, 0], max: [2, 1, 1] });
    expect(encostado).toMatchObject({ tipo: 'encosta', distancia: 0, eixo: 'x' });

    const dentro = relacaoEntreCaixas(cubo, { min: [0.75, -1, -1], max: [2, 2, 2] });
    expect(dentro.tipo).toBe('interpenetra');
    expect(dentro.distancia).toBeCloseTo(0.25, 12);
    expect(dentro.eixo).toBe('x');

    /* a tolerância decide o que é contato, e é explícita */
    const quase = { min: [1 + 1e-12, 0, 0], max: [2, 1, 1] };
    expect(relacaoEntreCaixas(cubo, quase).tipo).toBe('encosta');
    expect(relacaoEntreCaixas(cubo, quase, { tolerancia: 0 }).tipo).toBe('folga');
  });

  it('os quatro encaixes do freio saem como NÚMERO, sem ler um pixel', () => {
    const P = freio.PARAMS;
    const descricao = descreverPeca(montar());

    const interna = relacao(descricao, 'disco', 'pastilhaInterna');
    expect(interna.tipo).toBe('folga');
    expect(interna.eixo).toBe('x');
    expect(interna.distancia).toBeCloseTo(P.folgaPastilha, 9);

    const externa = relacao(descricao, 'disco', 'pastilhaExterna');
    expect(externa.tipo).toBe('folga');
    expect(externa.eixo).toBe('x');
    expect(externa.distancia).toBeCloseTo(P.folgaPastilha, 9);

    const pistao = relacao(descricao, 'pastilhaInterna', 'pistao');
    expect(pistao.tipo).toBe('encosta');
    expect(pistao.distancia).toBe(0);
    expect(pistao.porEixo[0]).toBeCloseTo(0, 9);

    /* a pinça atravessa o plano do disco: sobrepõe a espessura INTEIRA em x,
       mantendo a folga da ponte em y. Dois números, nenhuma foto. */
    const pinca = relacao(descricao, 'disco', 'pinca');
    expect(pinca.tipo).toBe('folga');
    expect(pinca.eixo).toBe('y');
    expect(pinca.distancia).toBeCloseTo(P.folgaPonte, 9);
    expect(pinca.porEixo[0]).toBeCloseTo(-P.discoEspessura, 9);
    const caixaPinca = caixaDaParte(montar(), 'pinca');
    expect(caixaPinca.min[0]).toBeLessThan(-P.discoEspessura / 2);
    expect(caixaPinca.max[0]).toBeGreaterThan(P.discoEspessura / 2);
  });

  it('o relatório é determinístico e o filtro por nome não muda a ordem', () => {
    const primeiro = formatarDescricao(descreverPeca(montar()), { peca: 'freio-disco' });
    const segundo = formatarDescricao(descreverPeca(montar()), { peca: 'freio-disco' });
    expect(primeiro).toBe(segundo);
    expect(primeiro).toContain('peça: freio-disco');
    expect(primeiro).toMatch(/disco {2,}pastilhaInterna {2,}folga {2,}x {2,}0\.002000/);

    /* precisão fixa: mudar as casas muda o texto, e só isso */
    expect(formatarDescricao(descreverPeca(montar()), { casas: 3 })).toContain('0.002');
    expect(() => formatarDescricao(descreverPeca(montar()), { casas: 99 })).toThrow(/entre 0 e 12/);
    expect(() => formatarDescricao({ totais: {} })).toThrow(/descreverPeca/);

    const filtrado = descreverPeca(montar(), { partes: ['pistao', 'disco', 'pastilhaInterna'] });
    expect(filtrado.partes.map((p: any) => p.nome)).toEqual(['disco', 'pastilhaInterna', 'pistao']);
    expect(filtrado.relacoes.map((r: any) => `${r.a}↔${r.b}`)).toEqual([
      'disco↔pastilhaInterna', 'disco↔pistao', 'pastilhaInterna↔pistao',
    ]);
    expect(filtrado.totais).toMatchObject({ partes: 3, partesNaPeca: 8 });
  });

  it('conta partes e faces igual ao adaptador de Three.js: uma verdade só', () => {
    const neutro = montar();
    const descricao = descreverPeca(neutro);
    const convertido = adaptarThree(neutro, { nome: freio.meta.nome });
    expect(descricao.totais.partes).toBe(convertido.estatisticas.partes);
    expect(descricao.totais.faces).toBe(convertido.estatisticas.facesNeutras);
    expect(descricao.totais.vertices).toBe(convertido.estatisticas.verticesNeutros);
    expect(descricao.facesSemParte).toEqual(convertido.diagnosticos.facesSemParte);
    for (const parte of descricao.partes) {
      expect(convertido.partes.get(parte.nome).userData.faces.length).toBe(parte.faces);
    }
  });
});

describe('descrever-peca: o CLI', () => {
  it('mede a peça pedida e sai 0', () => {
    const { saida, codigo } = cli(['freio-disco']);
    expect(codigo).toBe(0);
    expect(saida).toContain('peça: freio-disco');
    expect(saida).toMatch(/pastilhaInterna {2,}pistao {2,}encosta/);
  });

  it('sai ≠0 com diagnóstico em peça ausente, peça inexistente e parte inexistente', () => {
    const semPeca = cli([]);
    expect(semPeca.codigo).toBe(2);
    expect(semPeca.saida).toMatch(/diga qual peça medir/);

    const inexistente = cli(['freio-a-tambor']);
    expect(inexistente.codigo).toBe(2);
    expect(inexistente.saida).toMatch(/não existe em prototipos/);

    const parteErrada = cli(['freio-disco', '--partes=disco,tambor']);
    expect(parteErrada.codigo).toBe(1);
    expect(parteErrada.saida).toMatch(/não tem parte 'tambor'/);

    const casasErradas = cli(['freio-disco', '--casas=abc']);
    expect(casasErradas.codigo).toBe(2);
    expect(casasErradas.saida).toMatch(/--casas/);
  });
});
