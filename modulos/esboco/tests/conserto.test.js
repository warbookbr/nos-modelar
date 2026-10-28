/* Conserto proposto pelo gate e `--ajustar`: qual forma se move, quanto, e o gate aprovando depois. */
import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { desenharEsboco, resolverOpcao } from '../src/index.js';
import { verificarContato } from '../src/contato.js';
import { deslocamentoQueZera, medirProjecaoDaOpcao, verificarProjecao } from '../src/projecao.js';
import { ajustarEsboco, aplicarDeslocamento } from '../src/ajustar.js';
import { descreverEsboco, formatarDescricao } from '../src/descrever.js';
import { ajustarArquivo, analisarEsboco } from '../../../tools/modelar/esboco.mjs';

const caixa = (id, centro, l = 20, a = 20, p = 20, extra = {}) => ({ id, tipo: 'caixa', largura: l, altura: a, profundidade: p, ...(centro ? { centro } : {}), ...extra });
const esboco = (formas, contato = {}, extra = {}) => ({ opcoes: [{ titulo: 'T', formas }], contato: { usar: true, tolerancia: 1, folga: 50, ...contato }, ...extra });
const motivo = 'as peças se cruzam de propósito neste teste';
const sugestao = (r, tipo) => r.achados.find((a) => a.tipo === tipo).sugestao;
const pasta = new URL('./fixtures/', import.meta.url);
const fixture = (nome) => JSON.parse(readFileSync(new URL(nome, pasta), 'utf8'));

describe('sugestão por tipo de achado, aplicada até o gate aprovar', () => {
  it('colisão: move a forma ao longo do eixo de separação por penetração mais margem', () => {
    const e = esboco([caixa('a', [0, 0, 0]), caixa('b', [10, 0, 0])]);
    const s = sugestao(verificarContato(e), 'colisao');
    expect(s).toMatchObject({ forma: 'b', fonte: 'b', delta: [10.9, 0, 0], aplicavel: true });
    expect(s.texto).toMatch(/^mova b em \[10,9 0 0\] mm \(penetração de 10 mm mais margem de 0,9 mm; nenhuma depende da outra e b é a de menor caixa envolvente/);
    const r = ajustarEsboco(e);
    expect(r.aprovado).toBe(true);
    expect(r.parou).toBe('aprovou');
    expect(r.rodadas).toHaveLength(1);
    expect(r.esboco.opcoes[0].formas[1].centro).toEqual([20.9, 0, 0]);
    expect(verificarContato(r.esboco).resultado).toBe('aprovado');
  });

  it('a margem é metade da penetração aceita, no mínimo 1 mm, e nunca passa de 90% da tolerância', () => {
    const grande = esboco([caixa('a', [0, 0, 0], 200, 200, 200), caixa('b', [190, 0, 0], 200, 200, 200)], { tolerancia: 30, penetracao: 8 });
    expect(sugestao(verificarContato(grande), 'colisao').delta).toEqual([14, 0, 0]);
    const minima = esboco([caixa('a', [0, 0, 0]), caixa('b', [10, 0, 0])], { tolerancia: 30, penetracao: 1 });
    expect(sugestao(verificarContato(minima), 'colisao').delta).toEqual([11, 0, 0]);
  });

  it('voando: move a peça até a metade da tolerância do vizinho mais próximo do grupo', () => {
    const e = esboco([caixa('a', [0, 0, 0]), caixa('b', [30, 0, 0])]);
    const s = sugestao(verificarContato(e), 'voando');
    expect(s).toMatchObject({ forma: 'b', delta: [-9.5, 0, 0] });
    expect(s.texto).toContain('mova b em [-9,5 0 0] mm');
    const r = ajustarEsboco(e);
    expect(r.aprovado).toBe(true);
    expect(r.esboco.opcoes[0].formas[1].centro).toEqual([20.5, 0, 0]);
  });

  it('longe: move até a folga chegar a metade da tolerância', () => {
    const e = esboco([caixa('a', [0, 0, 0]), caixa('b', [20, 0, 0]), caixa('c', [100, 0, 0])], { folga: 5 });
    const r0 = verificarContato(e);
    expect(sugestao(r0, 'longe')).toMatchObject({ forma: 'c', delta: [-59.5, 0, 0] });
    const r = ajustarEsboco(e);
    expect(r.aprovado).toBe(true);
    expect(r.rodadas).toHaveLength(1);
  });

  it('par-nao-encosta: aproxima até o contato, e afasta quando o par se penetra', () => {
    const par = [{ a: 'a', b: 'b', tipo: 'encosta' }];
    const longe = esboco([caixa('a', [0, 0, 0]), caixa('b', [25, 0, 0])], { pares: par });
    expect(sugestao(verificarContato(longe), 'par-nao-encosta')).toMatchObject({ forma: 'b', delta: [-5, 0, 0] });
    expect(ajustarEsboco(longe).aprovado).toBe(true);
    const dentro = esboco([caixa('a', [0, 0, 0]), caixa('b', [10, 0, 0])], { pares: par });
    const s = sugestao(verificarContato(dentro), 'par-nao-encosta');
    expect(s).toMatchObject({ forma: 'b', delta: [10, 0, 0] });
    expect(ajustarEsboco(dentro).aprovado).toBe(true);
  });

  it('atravessa-excedido: move pela diferença até o máximo declarado', () => {
    const e = esboco([caixa('a', [0, 0, 0]), caixa('b', [10, 0, 0])], { pares: [{ a: 'a', b: 'b', tipo: 'atravessa', max: 8, motivo }] });
    const s = sugestao(verificarContato(e), 'atravessa-excedido');
    expect(s).toMatchObject({ forma: 'b', delta: [2.1, 0, 0] });
    expect(s.texto).toContain('passa 2 mm do máximo de 8 mm');
    const r = ajustarEsboco(e);
    expect(r.aprovado).toBe(true);
    expect(verificarContato(r.esboco).atravessamentos[0].penetracao_mm).toBeLessThanOrEqual(8);
  });
});

describe('qual forma se move', () => {
  it('entre duas livres, a de menor caixa envolvente, e diz por quê', () => {
    const e = esboco([caixa('grande', [0, 0, 0], 100, 100, 100), caixa('pequena', [55, 0, 0])]);
    const s = sugestao(verificarContato(e), 'colisao');
    expect(s.forma).toBe('pequena');
    expect(s.motivo).toContain('nenhuma depende da outra e pequena é a de menor caixa envolvente');
    expect(s.motivo).not.toContain('volume');
    const invertida = esboco([caixa('pequena', [55, 0, 0]), caixa('grande', [0, 0, 0], 100, 100, 100)]);
    expect(sugestao(verificarContato(invertida), 'colisao')).toMatchObject({ forma: 'pequena', delta: [5.9, 0, 0] });
  });

  it('a forma que tem relação com a outra é a que se move, mesmo sendo maior, pois mover a referência a arrastaria', () => {
    const e = esboco([caixa('B', [0, 0, 0], 40, 40, 40), caixa('A', null, 100, 100, 100, { sobre: 'B', desloca: [0, -10, 0] })]);
    const s = sugestao(verificarContato(e), 'colisao');
    expect(s.forma).toBe('A');
    expect(s.motivo).toContain('A depende de B (sobre); mover B arrastaria A junto');
    const r = ajustarEsboco(e);
    expect(r.aprovado).toBe(true);
    /* a relação fica e o desloca existente é ajustado: -10 + 10,9 */
    expect(r.esboco.opcoes[0].formas[1]).toMatchObject({ sobre: 'B', desloca: [0, 0.9, 0] });
    expect(r.rodadas[0].movidos[0]).toMatchObject({ campo: 'desloca', antes: [0, -10, 0], depois: [0, 0.9, 0] });
  });

  it('a dependência encadeada também impede mover a referência', () => {
    const e = esboco([caixa('B', [0, 0, 0], 40, 40, 40), caixa('M', null, 40, 40, 40, { sobre: 'B' }), caixa('A', null, 100, 100, 100, { sobre: 'M', desloca: [0, -30, 0] })]);
    const s = verificarContato(e).achados.map((a) => a.sugestao).find((x) => x.forma === 'A');
    expect(s).toBeDefined();
    expect(verificarContato(e).achados.every((a) => a.sugestao.forma !== 'B')).toBe(true);
  });

  it('cópia de espelho aponta para a fonte, com o eixo do espelho invertido', () => {
    const e = esboco([caixa('mesa', [0, 0, 0], 100, 100, 100), caixa('pe', [55, 0, 0]), { id: 'peE', espelha: { forma: 'pe', eixo: 'x', pos: 0 } }]);
    const r = verificarContato(e);
    const dupla = r.achados.find((a) => a.pecas.includes('peE')).sugestao;
    expect(dupla).toMatchObject({ forma: 'peE', fonte: 'pe', delta: [5.9, 0, 0] });
    expect(dupla.texto).toMatch(/^mova pe \(fonte de peE: espelho de pe\) em \[5,9 0 0\] mm/);
    const a = ajustarEsboco(e);
    expect(a.aprovado).toBe(true);
    expect(a.rodadas[0].movidos).toHaveLength(1);
    expect(a.esboco.opcoes[0].formas[1].centro).toEqual([60.9, 0, 0]);
    expect(a.esboco.opcoes[0].formas[2]).toEqual({ id: 'peE', espelha: { forma: 'pe', eixo: 'x', pos: 0 } });
  });

  it('cópia de arranjo aponta para a fonte', () => {
    const e = esboco([caixa('p', [0, 0, 0]), { arranja: { forma: 'p', modo: 'linear', total: 3, passo: [20, 0, 0] } }, caixa('parede', [55, 0, 0], 20, 100, 100)]);
    const s = sugestao(verificarContato(e), 'colisao');
    expect(s).toMatchObject({ forma: 'p2', fonte: 'p', delta: [-5.9, 0, 0] });
    expect(s.texto).toContain('mova p (fonte de p2: cópia 2 de p)');
    expect(ajustarEsboco(e).aprovado).toBe(true);
  });

  it('cópia de arranjo radial devolve o vetor girado de volta para a fonte, e o gate aprova', () => {
    const e = esboco([
      caixa('cubo', [0, 0, 0], 40, 20, 40),
      caixa('dente', [30, 0, 0]),
      { arranja: { forma: 'dente', modo: 'radial', total: 4, eixo: 'y', centro: [0, 0, 0] } },
      caixa('parede', [15, 0, 35], 20, 60, 20),
    ]);
    const s = sugestao(verificarContato(e), 'colisao');
    /* a parede empurra dente3, a 270 graus, e o vetor gira de volta para a fonte, a 0 grau */
    expect(s).toMatchObject({ forma: 'dente3', fonte: 'dente', delta: [0, 0, 5.9] });
    expect(ajustarEsboco(e).aprovado).toBe(true);
  });

  it('duas cópias que se movem juntas não têm sugestão aplicável', () => {
    const e = esboco([caixa('f', [0, 0, 0], 20, 20, 20), { id: 'f2', espelha: { forma: 'f', eixo: 'x', pos: 5 } }]);
    const r = verificarContato(e);
    const s = r.achados.find((a) => a.tipo === 'colisao')?.sugestao;
    expect(s?.aplicavel).toBe(false);
    const a = ajustarEsboco(e);
    expect(a.parou).toBe('sem-sugestao');
    expect(a.aprovado).toBe(false);
  });
});

describe('--ajustar', () => {
  it('itera até aprovar quando uma correção revela outro achado', () => {
    const e = esboco([caixa('a', [0, 0, 0]), caixa('b', [10, 0, 0]), caixa('c', [25, 0, 0])]);
    expect(verificarContato(e).achados).toHaveLength(2);
    const r = ajustarEsboco(e);
    expect(r.aprovado).toBe(true);
    expect(r.rodadas.length).toBeGreaterThanOrEqual(2);
    expect(r.rodadas.map((x) => x.achados_depois)).toEqual([...r.rodadas.map((x) => x.achados_depois)].sort((x, y) => y - x));
  });

  it('para quando uma rodada não reduz os achados, descarta a rodada e diz qual foi a parada', () => {
    const e = esboco([caixa('L', [-13, 0, 0], 20, 100, 100), caixa('b', [0, 0, 0], 10, 10, 10), caixa('R', [13, 0, 0], 20, 100, 100)]);
    const r = ajustarEsboco(e);
    expect(r.parou).toBe('sem-progresso');
    expect(r.aprovado).toBe(false);
    expect(r.rodadas.at(-1).descartada).toBe(true);
    expect(r.final.achados.length).toBeLessThan(r.inicial.achados.length);
  });

  it('para no limite de rodadas', () => {
    const e = esboco([caixa('a', [0, 0, 0]), caixa('b', [10, 0, 0]), caixa('c', [25, 0, 0])]);
    const r = ajustarEsboco(e, { maxRodadas: 1 });
    expect(r.parou).toBe('limite');
    expect(r.rodadas).toHaveLength(1);
  });

  it('recusa o gate desligado e não mexe no que já aprova', () => {
    expect(() => ajustarEsboco({ opcoes: [{ formas: [caixa('a', [0, 0, 0])] }] })).toThrow(/precisa do gate de contato ligado/);
    const ok = ajustarEsboco(esboco([caixa('a', [0, 0, 0]), caixa('b', [20, 0, 0])]));
    expect(ok).toMatchObject({ aprovado: true, parou: 'ja-aprovava', rodadas: [] });
  });

  it('grava um arquivo novo, não altera o original e preserva parâmetros, expressões e notas', () => {
    const dir = mkdtempSync(join(tmpdir(), 'esboco-ajustar-'));
    const origem = join(dir, 'peca.esboco.json');
    const bruto = {
      nota: 'nota da raiz',
      parametros: { l: 20, meio: '=l/2' },
      contato: { usar: true, tolerancia: 1, folga: 50 },
      opcoes: [{ titulo: 'T', nota: 'nota da opção', formas: [
        { id: 'a', tipo: 'caixa', largura: 'l', altura: 20, profundidade: 20, centro: [0, 0, 0], rotulo: '1. a' },
        { id: 'b', tipo: 'caixa', largura: 'l', altura: 20, profundidade: 20, centro: ['meio', 0, 0], rotulo: '2. b' },
      ] }],
    };
    const texto = `${JSON.stringify(bruto, null, 2)}\n`;
    writeFileSync(origem, texto);
    const { resultado, destino } = ajustarArquivo(origem);
    expect(destino).toBe(join(dir, 'peca.ajustado.esboco.json'));
    expect(readFileSync(origem, 'utf8')).toBe(texto);
    const novo = JSON.parse(readFileSync(destino, 'utf8'));
    expect(novo.parametros).toEqual(bruto.parametros);
    expect(novo.nota).toBe('nota da raiz');
    expect(novo.opcoes[0].nota).toBe('nota da opção');
    expect(novo.opcoes[0].formas[0]).toEqual(bruto.opcoes[0].formas[0]);
    /* centro por parâmetro fica como está; a soma vai para um desloca novo */
    expect(novo.opcoes[0].formas[1]).toEqual({ ...bruto.opcoes[0].formas[1], desloca: [10.9, 0, 0] });
    expect(resultado.aprovado).toBe(true);
    expect(verificarContato(novo).resultado).toBe('aprovado');
  });

  it('soma em desloca com expressão e em centro numérico, sem expandir o resto', () => {
    const bruto = { opcoes: [{ formas: [
      { id: 'x', tipo: 'caixa', largura: 10, altura: 10, profundidade: 10, centro: [1, 2, 3] },
      { id: 'y', tipo: 'caixa', largura: 10, altura: 10, profundidade: 10, centro: 'p', desloca: ['=k/2', 'k', 5] },
    ] }] };
    expect(aplicarDeslocamento(bruto, 0, 'x', [0.5, 0, -1])).toMatchObject({ campo: 'centro', depois: [1.5, 2, 2] });
    expect(aplicarDeslocamento(bruto, 0, 'y', [2, -3, 0.5])).toMatchObject({ campo: 'desloca', depois: ['=(k/2)+2', '=k-3', 5.5] });
    expect(aplicarDeslocamento(bruto, 0, 'inexistente', [1, 0, 0])).toBeNull();
  });

  it('na linha de comando, --ajustar grava o arquivo ao lado e sai com 0 quando aprova', () => {
    const dir = mkdtempSync(join(tmpdir(), 'esboco-ajustar-'));
    const origem = join(dir, 'moto.esboco.json');
    const texto = readFileSync(new URL('moto.esboco.json', pasta), 'utf8');
    writeFileSync(origem, texto);
    const r = spawnSync(process.execPath, ['tools/modelar/esboco.mjs', origem, '--ajustar'], { encoding: 'utf8' });
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('rodada 1: 1 achados viram 0');
    expect(r.stdout).toContain('moveu banco [A. Naked] em [0 0 -13] mm: centro [0,650,-330] -> [0,650,-343]');
    expect(r.stdout).toContain('o gate aprovou na rodada 1');
    expect(r.stdout).toContain('contato (tolerância 20,1 mm, penetração 6 mm, folga 201 mm): aprovado');
    expect(readFileSync(origem, 'utf8')).toBe(texto);
    const novo = readFileSync(join(dir, 'moto.ajustado.esboco.json'), 'utf8');
    const linhas = novo.split('\n'); const velhas = texto.split('\n');
    expect(linhas).toHaveLength(velhas.length);
    expect(linhas.filter((l, i) => l !== velhas[i])).toEqual(['            -343']);
    const de = spawnSync(process.execPath, ['tools/modelar/esboco.mjs', join(dir, 'moto.ajustado.esboco.json'), '--ajustar'], { encoding: 'utf8' });
    expect(de.stdout).toContain('o gate já aprovava; nada a ajustar');
    expect(existsSync(join(dir, 'moto.ajustado.ajustado.esboco.json'))).toBe(false);
  }, 120000);
});

describe('leitura das sugestões', () => {
  it('--descrever mostra a sugestão ao lado do achado', () => {
    const d = descreverEsboco(esboco([caixa('a', [0, 0, 0]), caixa('b', [10, 0, 0])]));
    expect(d.opcoes[0].sugestoesDeContato[0]).toContain('mova b em [10,9 0 0] mm');
    expect(formatarDescricao(d)).toMatch(/achado de contato: \[T\] colisão: a e b se penetram 10,0 mm, acima do limite de [\d,]+ mm \([^)]*\); sugestão: mova b em \[10,9 0 0\] mm/);
  });

  it('o manifesto da análise guarda as sugestões por achado', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'esboco-analise-'));
    const arq = join(dir, 'x.esboco.json');
    writeFileSync(arq, JSON.stringify(esboco([caixa('a', [0, 0, 0]), caixa('b', [10, 0, 0])])));
    const { manifesto } = await analisarEsboco(arq);
    expect(manifesto.sugestoes).toContainEqual(expect.objectContaining({ origem: 'contato', achado: 'colisao', pecas: ['a', 'b'], forma: 'b', delta: [10.9, 0, 0], aplicavel: true }));
    expect(manifesto.contato.achados[0].sugestao.texto).toContain('mova b');
  }, 120000);

  it('projeção: o menor deslocamento que zera a cobertura na vista, só como informação', () => {
    const e = {
      opcoes: [{ titulo: 'P', formas: [
        { id: 'roda', tipo: 'anel', diametroExterno: 400, diametroInterno: 200, espessura: 100, eixo: 'x', centro: [0, 200, 0] },
        { id: 'garfo', tipo: 'cilindro', diametro: 50, comprimento: 500, eixo: 'y', centro: [80, 250, 0] },
      ] }],
    };
    const p = verificarProjecao(e, { forcar: true, sugerir: true });
    expect(p.achados.length).toBeGreaterThan(0);
    const rs = resolverOpcao(e.opcoes[0]);
    for (const a of p.achados) {
      expect(a.sugestao).toMatchObject({ vista: a.vista, aplicavel: false });
      expect(a.sugestao.mm).toBeGreaterThan(0);
      const [ra, rb] = [rs.find((r) => r.id === a.pecas[0]), rs.find((r) => r.id === a.pecas[1])];
      const mover = (r, d) => ({ ...r, centro: r.centro.map((x, i) => x + d[i]), min: r.min.map((x, i) => x + d[i]), max: r.max.map((x, i) => x + d[i]) });
      const depois = a.sugestao.forma === ra.id ? [mover(ra, a.sugestao.delta), rb] : [ra, mover(rb, a.sugestao.delta)];
      expect(medirProjecaoDaOpcao(depois, a.vista).pares).toHaveLength(0);
      /* e 1 mm a menos ainda cobre: é o menor deslocamento naquele eixo */
      const menos = a.sugestao.delta.map((c) => (c === 0 ? 0 : c - Math.sign(c) * 1));
      const quase = a.sugestao.forma === ra.id ? [mover(ra, menos), rb] : [ra, mover(rb, menos)];
      expect(medirProjecaoDaOpcao(quase, a.vista).pares.length).toBeGreaterThan(0);
    }
    expect(deslocamentoQueZera(rs[0], rs[1], 'frontal')).toBeDefined();
    /* sem `sugerir`, o achado sai como antes, sem o campo */
    expect(verificarProjecao(e, { forcar: true }).achados.every((a) => a.sugestao === undefined)).toBe(true);
  });
});

describe('arquivos legados', () => {
  const sha = (t) => createHash('sha1').update(t).digest('hex');
  /* SHA-1 do SVG e da leitura --descrever de HEAD antes da fatia 6 (a moto tem um achado, que ganha a sugestão). A leitura da moto mudou uma
     vez depois: a colisão passou a dizer o limite de penetração e a regra (atrito 44) */
  const antes = {
    casa: ['921913afe9f9074b1801322dac097743bdd57d48', 'ab8355c5df90e309ebe8a13b9add4cd7fd56db77'],
    'mancal-eixo': ['bb4a355c5ca68f60de67cabf33d778d5def27c4a', 'c38f4eaa793241a223ff65bbe20446e89e961948'],
    moto: ['ee5eaae2b028ce82d3357c6e6d4a39134343370e', '0bb9f06cd5e7a046caaaf4cd47ef51b8c9037837'],
    'teste-cubo': ['fa488c1ade466fb431429eb81308d76831c148d1', '06ab0744a45d617387c7e005288f303aad7edcb8'],
    'moto-relacoes': ['524bbda4437bbd67e7fa5386b7bf591b6eef2194', '1154ae24caa52c3d36a68ee972418575ef784d16'],
    'moto-parametros': ['282776b96ac06f276181f4cbe6a2304966e313c1', '10f28aaa2420905190bdd54fa638e4404f23435d'],
  };
  for (const [nome, [svg, leitura]] of Object.entries(antes)) {
    it(`${nome}: o SVG e a leitura sem a sugestão são idênticos aos de antes`, () => {
      const e = fixture(`${nome}.esboco.json`);
      expect(sha(desenharEsboco(e).svg)).toBe(svg);
      const texto = formatarDescricao(descreverEsboco(e)).replace(/; sugestão: .*$/gm, '');
      expect(sha(texto)).toBe(leitura);
    });
  }
});
