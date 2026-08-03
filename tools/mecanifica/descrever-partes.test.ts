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
// @ts-expect-error — fixture em JavaScript, exercitada em runtime pelo Vitest.
import * as freioHierarquia from '../../prototipos/fps/v3/pecas/_freio-hierarquia.js';
// @ts-expect-error — adaptador novo em JavaScript.
import { adaptarThree } from '../../src/autoria/adaptar-three.js';
// @ts-expect-error — módulo neutro de medição em JavaScript.
import { caixaDaParte, caixasPorParte, corposDaParte, descreverPeca, formatarDescricao, portasPublicadas, relacaoEntreCaixas } from '../../src/autoria/descrever-partes.js';
// @ts-expect-error — consulta pura de hierarquia em JavaScript.
import { nomesDaSubarvore } from '../../src/autoria/hierarquia-partes.js';

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

/* dois cubos endereçados por `origem`, para medir montagem certa contra
   montagem errada com a mesma régua e sem depender de nenhuma peça do galpão. */
function doisCubos({ dx = 0, dy = 0, ladoA = 0.1, ladoB = 0.1 } = {}) {
  return nucleo(
    [
      ['cubo', { origemId: 1, lado: ladoA }],
      ['parte', { nome: 'a', sel: { origem: { op: 'cubo', id: 1 } } }],
      ['cubo', { origemId: 2, lado: ladoB }],
      ['transladar', { d: [dx, dy, 0], sel: { origem: { op: 'cubo', id: 2 } } }],
      ['parte', { nome: 'b', sel: { origem: { op: 'cubo', id: 2 } } }],
    ],
    {}, {}, {}, null, [],
  );
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

  /* ALTA-1: a régua dava o MESMO número para a montagem certa e para a errada.
     A relação entre partes era medida face a face, e face plana alinhada ao
     eixo tem espessura ZERO na sua normal — o vão naquele eixo nunca fica
     negativo, então `interpenetra` era INALCANÇÁVEL pelo caminho que o CLI usa:
     encostado, 50% sobreposto e engolido inteiro saíam os três como `encosta`,
     e contenção total (nenhum par de faces sobreposto) saía como `folga`. */
  it('distingue encostado de enterrado dentro, pelo caminho que o CLI usa', () => {
    const rel = (opcoes: any) => descreverPeca(doisCubos(opcoes)).relacoes[0];

    const encostado = rel({ dx: 0.10 });
    expect(encostado.tipo).toBe('encosta');
    expect(encostado.eixo).toBe('x');
    expect(encostado.distancia).toBe(0);

    const metade = rel({ dx: 0.05 });
    expect(metade.tipo).toBe('interpenetra');
    expect(metade.eixo).toBe('x');
    expect(metade.distancia).toBeCloseTo(0.05, 12);

    const sobreposto = rel({ dx: 0 });
    expect(sobreposto.tipo).toBe('interpenetra');
    expect(sobreposto.distancia).toBeCloseTo(0.1, 12);

    /* engolido: NENHUM par de faces se sobrepõe, e a medida antiga afirmava
       100 mm de VÃO entre duas partes onde uma está inteiramente dentro. */
    const engolido = rel({ dy: 0.1, ladoA: 0.3, ladoB: 0.1 });
    expect(engolido.tipo).toBe('interpenetra');
    expect(engolido.distancia).toBeCloseTo(0.1, 12);

    const separado = rel({ dx: 0.2 });
    expect(separado.tipo).toBe('folga');
    expect(separado.distancia).toBeCloseTo(0.1, 12);
  });

  it('a relação entre partes e a relação entre caixas nunca se contradizem', () => {
    for (const dx of [0.2, 0.1, 0.05, 0]) {
      const neutro = doisCubos({ dx });
      const { caixas } = caixasPorParte(neutro);
      const porParte = descreverPeca(neutro).relacoes[0];
      const porCaixa = relacaoEntreCaixas(caixas.get('a'), caixas.get('b'));
      expect(`${dx}:${porParte.tipo}`).toBe(`${dx}:${porCaixa.tipo}`);
      expect(porParte.eixo).toBe(porCaixa.eixo);
      expect(porParte.distancia).toBeCloseTo(porCaixa.distancia, 12);
      for (let k = 0; k < 3; k++) expect(porParte.porEixo[k]).toBeCloseTo(porCaixa.porEixo[k], 12);
    }
  });

  it('decompõe cada parte em corpos, e é o corpo que salva a medida da peça oca', () => {
    const neutro = montar();
    const { caixas } = caixasPorParte(neutro);
    expect([...caixas.values()].map((c: any) => [c.nome, c.corpos])).toEqual([
      /* o `cubo` são TRÊS corpos: barril, flange e piloto de roda, cada um uma
         primitiva própria, sem vértice em comum. Este número era
         `1 + freio.TOPO.prisioneiros` enquanto cada prisioneiro tinha um
         ressalto quadrado só dele; a rodada "Flange de uma peça só" trocou os
         quatro ressaltos por UM disco com os quatro furos, e o corpo por
         prisioneiro sumiu com eles. Continua contando o que contava — que o
         flange não é vértice do barril —, e é `freio-disco-integridade` que
         prende os quatro furos ao TOPO da peça. */
      ['cubo', 3], ['disco', 2], ['flexivel', 1], ['pastilhaExterna', 1],
      ['pastilhaInterna', 1], ['pinca', 3], ['pistao', 1], ['suporte', 3],
    ]);

    /* o `disco` são dois corpos — a pista e o chapéu que recua para dentro —, e
       é por isso que a pastilha interna aparece com folga em vez de dentro do
       envelope do disco. Ordem estável: menor id de face primeiro. */
    const P = freio.PARAMS;
    const corpos = corposDaParte(neutro, 'disco');
    expect(corpos.length).toBe(2);
    expect(corpos[0].min[0]).toBeCloseTo(-P.discoEspessura / 2, 9);
    expect(corpos[0].max[0]).toBeCloseTo(P.discoEspessura / 2, 9);
    expect(corpos[1].max[0]).toBeCloseTo(-P.discoEspessura / 2, 9);
    expect(corposDaParte(neutro, 'disco')).toEqual(corpos);
    expect(() => corposDaParte(neutro, 'roda')).toThrow(/não tem parte 'roda'.*disco/s);
    expect(() => corposDaParte(neutro, '')).toThrow(/texto não vazio/);
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

    /* o pistão MORA dentro da garra interna — está inteiro dentro dela em x — e
       a régua antiga chamava isso de `encosta`, escondendo os 16 mm de invasão
       num par onde ela é de propósito. */
    const pincaPistao = relacao(descricao, 'pinca', 'pistao');
    expect(pincaPistao.tipo).toBe('interpenetra');
    expect(pincaPistao.eixo).toBe('x');
    expect(pincaPistao.distancia).toBeCloseTo(P.pistaoComprimento, 9);
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

describe('AUT-2026-16 — a descrição expõe a hierarquia que o autor declarou', () => {
  function montarHierarquia() {
    return nucleo(
      freioHierarquia.PASSOS,
      freioHierarquia.PARAMS,
      freioHierarquia.TOPO,
      freioHierarquia.MATERIAIS,
      null,
      freioHierarquia.ALIASES,
    );
  }

  it('mostra a árvore completa, estável e independente do filtro geométrico', () => {
    const descricao = descreverPeca(montarHierarquia(), { partes: ['pistao'] });
    expect(descricao.partes.map((parte: any) => parte.nome)).toEqual(['pistao']);
    expect(descricao.hierarquia).toContainEqual({ nome: 'pistao', pai: 'pinca' });
    expect(descricao.hierarquia).toContainEqual({ nome: 'pastilhaInterna', pai: 'pinca' });
    expect(descricao.hierarquia.find((item: any) => item.nome === 'pinca')).toEqual({ nome: 'pinca', pai: null });
    expect(descricao.hierarquia.map((item: any) => item.nome)).toEqual(
      [...descricao.hierarquia.map((item: any) => item.nome)].sort(),
    );
    const texto = formatarDescricao(descricao);
    expect(texto).toContain('HIERARQUIA DE PARTES');
    expect(texto).toMatch(/pistao {2,}pinca/);
  });

  it('a bancada conserva a mesma relação somente como metadado, sem reparenting de cena', () => {
    const convertido = adaptarThree(montarHierarquia(), { nome: 'freio-hierarquia' });
    const pistao = convertido.partes.get('pistao');
    const pinca = convertido.partes.get('pinca');
    expect(pistao.userData.paiSemantico).toBe('pinca');
    expect(pistao.parent).toBe(convertido.raiz);
    expect(pinca.parent).toBe(convertido.raiz);
    expect(convertido.raiz.userData.hierarquia).toContainEqual({ nome: 'pistao', pai: 'pinca' });
  });

  it('a árvore exibida é consultável sem medição geométrica nem grafo Three.js', () => {
    const descricao = descreverPeca(montarHierarquia());
    expect(nomesDaSubarvore(descricao.hierarquia, 'pinca')).toEqual([
      'pinca', 'pastilhaExterna', 'pastilhaInterna', 'pistao',
    ]);
  });
});

/* A-20 — a porta publicada precisa existir FORA do núcleo. `nucleo()` passou a
   devolver `portas`, mas quem CONFERE (a régua, a bancada) não as via: `npm run
   descrever -- _jardineira` listava seis partes e nenhuma porta. O custo disso
   foi medido — provar que `sel:{porta}` sobrevive a uma transformação exigiu
   marcar cada porta com um material próprio e ler a marca de volta, afirmando
   sobre `f.material` em vez de sobre a porta. */
describe('portasPublicadas — o endereço semântico aparece onde se confere', () => {
  const comPortas = () => nucleo(
    [
      ['cilindro', { origemId: 40, r: 0.2, h: 0.5, lados: 8 }],
      ['parte', { nome: 'eixo', sel: { origem: { op: 'cilindro', id: 40 } } }],
      ['publicarPorta', { nome: 'assentoDoEixo', de: { op: 'cilindro', id: 40, tampa: 'topo' } }],
      ['cubo', { origemId: 41, lado: 0.3 }],
      ['parte', { nome: 'bloco', sel: { origem: { op: 'cubo', id: 41 } } }],
      ['publicarPorta', { nome: 'baseDoBloco', de: { op: 'cubo', id: 41 } }],
    ] as any, {}, {},
  );

  it('lista id estável, rótulo, origem declarada e passo de publicação', () => {
    expect(portasPublicadas(comPortas())).toEqual([
      { id: 'assentoDoEixo', rotulo: 'assentoDoEixo', op: 'cilindro', origemId: 40, recorte: 'tampa=topo', origem: 'cilindro:40 tampa=topo', passo: 2 },
      { id: 'baseDoBloco', rotulo: 'baseDoBloco', op: 'cubo', origemId: 41, recorte: '', origem: 'cubo:41', passo: 5 },
    ]);
  });

  /* o vocabulário é o do CONTRATO que já existe (`cubo`, `cilindro`, `tampa`),
     não um nome novo: nome publicado vira formato salvo, e nome que promete
     região e entrega primitiva é pior que nome nenhum. */
  it('a origem é a DECLARADA, não as faces resolvidas', () => {
    const porta = portasPublicadas(comPortas())[0];
    expect(porta.origem).toBe('cilindro:40 tampa=topo');
    expect(Object.keys(porta)).not.toContain('faces');
  });

  it('peça sem porta devolve lista vazia, e neutro sem `portas` também', () => {
    expect(portasPublicadas(doisCubos())).toEqual([]);
    const { V, F } = doisCubos();
    expect(portasPublicadas({ V, F } as any)).toEqual([]);
  });

  it('`portas` com forma errada FALHA com diagnóstico, nunca vira no-op', () => {
    const { V, F } = doisCubos();
    expect(() => portasPublicadas({ V, F, portas: [] } as any)).toThrow(/Map devolvido por nucleo/);
    expect(() => portasPublicadas({ V, F, portas: new Map([['p', { nome: 'p' }]]) } as any))
      .toThrow(/sem contrato/);
  });

  it('a descrição e o relatório em texto carregam as portas', () => {
    const descricao = descreverPeca(comPortas());
    expect(descricao.totais.portas).toBe(2);
    const texto = formatarDescricao(descricao);
    expect(texto).toContain('PORTAS PUBLICADAS');
    expect(texto).toMatch(/assentoDoEixo {2,}assentoDoEixo {2,}cilindro:40 tampa=topo/);
    expect(texto).toContain('portas: 2');
  });

  /* filtrar o relatório por parte não pode esconder porta: porta endereça
     ORIGEM, não parte semântica — a régua mentiria sobre o contrato da peça. */
  it('o filtro por parte não esconde porta', () => {
    expect(descreverPeca(comPortas(), { partes: ['eixo'] }).totais.portas).toBe(2);
  });

  it('peça sem porta imprime a seção dizendo que não há nenhuma', () => {
    expect(formatarDescricao(descreverPeca(doisCubos()))).toContain('(nenhuma porta publicada)');
  });
});

describe('descrever-peca: o CLI', () => {
  it('mede a peça pedida e sai 0', () => {
    const { saida, codigo } = cli(['freio-disco']);
    expect(codigo).toBe(0);
    expect(saida).toContain('peça: freio-disco');
    expect(saida).toMatch(/pastilhaInterna {2,}pistao {2,}encosta/);
  });

  /* A-20 pelo comando real: `npm run descrever -- _jardineira` mostra as oito
     portas da peça, com o que cada uma declara — inclusive os recortes que o
     A-18 e o A-19 destravaram (`aresta`, `faixa='ultima'`). */
  it('lista as portas publicadas da peça', () => {
    const { saida, codigo } = cli(['_jardineira']);
    expect(codigo).toBe(0);
    expect(saida).toContain('portas: 8');
    expect(saida).toContain('PORTAS PUBLICADAS');
    expect(saida).toMatch(/Base enterrada do caule {2,}peDoCaule {2,}cilindro:404 tampa=fundo/);
    expect(saida).toMatch(/soleiraDaJardineira {2,}chamferBox:400/);
    expect(saida).toMatch(/bordaDaFrenteDaSoleira {2,}chamferBox:400 aresta=3/);
    expect(saida).toMatch(/coloDoBulbo {2,}esfera:401 faixa=ultima/);
  });

  it('resolve uma subárvore para a IA, filtra a régua e entrega a bancada reproduzível', () => {
    const { saida, codigo } = cli(['_freio-hierarquia', '--subarvore=pinca']);
    expect(codigo).toBe(0);
    expect(saida).toContain('CONSULTA DE SUBÁRVORE');
    expect(saida).toContain('raiz: pinca');
    expect(saida).toContain('partes (4): pastilhaExterna, pastilhaInterna, pinca, pistao');
    expect(saida).toContain(
      'https://warbookbr.github.io/nos-mecanifica/bancada.html?peca=_freio-hierarquia&selecionadas=pastilhaExterna%2CpastilhaInterna%2Cpinca%2Cpistao',
    );
    expect(saida).toContain('partes: 4 de 8');
    expect(saida).not.toMatch(/\n  disco {2,}/);
  });

  it('consulta uma folha sem arrastar um conjunto vizinho', () => {
    const { saida, codigo } = cli(['_freio-hierarquia', '--subarvore=pistao']);
    expect(codigo).toBe(0);
    expect(saida).toContain('partes (1): pistao');
    expect(saida).toContain('partes: 1 de 8');
    expect(saida).not.toMatch(/\n  pinca {2,}/);
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

    const subarvoreErrada = cli(['_freio-hierarquia', '--subarvore=ausente']);
    expect(subarvoreErrada.codigo).toBe(1);
    expect(subarvoreErrada.saida).toMatch(/não tem parte 'ausente'/);

    const subarvoreVazia = cli(['_freio-hierarquia', '--subarvore=']);
    expect(subarvoreVazia.codigo).toBe(2);
    expect(subarvoreVazia.saida).toMatch(/--subarvore veio vazio/);
  });
});
