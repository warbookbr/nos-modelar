/* receita-planejada.test.mjs — a receita planejada que o comando grava a partir de uma unidade do esboço.
 *
 * O esboço de prova é `tools/fixtures/receita-planejada/suporte.esboco.json`: um suporte por lado (a base, o braço entre dois pontos, o pino, a
 * roda da família `roda-pneu` e uma tampa anelar), com parâmetros por expressão, pontos nomeados, um cortador e o espelho em x = 0. Cada teste
 * confere uma coisa que o comando promete: o que a TABELA diz e de onde, os PONTOS, o REFINA, os contatos, a marca de plano por escrever, a
 * recusa de gravar sobre passos, o determinismo e o alvo. Um último teste gera as duas unidades reais do avião de que a prova do comando partiu
 * (os trens principais), contando partes, pontos e contatos. */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { normalizarPlanoDeModelagem } from '../../src/autoria/plano-de-modelagem.js';
import {
  comNota, comoCLI, destinoDaReceita, escrever, gravarReceitaPlanejada, lerUnidade, nomeDaParte, quebrar, receitaTemPassos,
} from './receita-planejada.mjs';
import { gerarCompostaDaUnidade } from './vistas-para-critica.mjs';

const MINI = resolve(import.meta.dirname, '../fixtures/receita-planejada/suporte.esboco.json');
const AVIAO = resolve(import.meta.dirname, '../../docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco-r2/aviao.esboco.json');
const TEMPO = 120_000;

let area;
let gerada;
let receita;
let texto;
const importar = async (caminho) => (await import(`${pathToFileURL(caminho).href}?v=${Date.now()}${Math.random()}`)).default;
const normalizar = (t) => t.replace(/\r\n/g, '\n');

beforeAll(async () => {
  area = mkdtempSync(join(tmpdir(), 'receita-planejada-'));
  gerada = await gravarReceitaPlanejada({ esboco: MINI, unidade: 'suporte', peca: 'teste/suporte', saida: join(area, 'a'), semAlvo: true, referencias: [] });
  texto = readFileSync(gerada.destino, 'utf8');
  receita = await importar(gerada.destino);
}, TEMPO);
afterAll(() => rmSync(area, { recursive: true, force: true }));

describe('os nomes e a escrita', () => {
  it('o nome da parte sai do id da forma sem ponto, hífen nem sublinhado', () => {
    expect(nomeDaParte('deriva.fin')).toBe('derivaFin');
    expect(nomeDaParte('pernaPrincipalD')).toBe('pernaPrincipalD');
    expect(nomeDaParte('janela-1_d')).toBe('janela1D');
    expect(() => nomeDaParte('1janela')).toThrow(/não dá um nome de parte/);
  });

  it('escreve número sem ruído de ponto flutuante, nota ao lado do campo e lista curta em uma linha', () => {
    const js = escrever({ a: 0.1 + 0.2, b: [1, 2, 3], c: { d: 'x' } });
    expect(js).toBe("{ a: 0.3, b: [1, 2, 3], c: { d: 'x' } }");
    expect(escrever({ largura: comNota(70, 'tpBlE') })).toBe('{\n  largura: 70, // tpBlE\n}');
  });

  it('quebra o comentário nos espaços, sem passar da largura', () => {
    const linhas = quebrar('um texto bastante comprido '.repeat(12), 40);
    expect(linhas.length).toBeGreaterThan(5);
    expect(Math.max(...linhas.map((l) => l.length))).toBeLessThanOrEqual(40);
  });

  it('a receita fica em <raiz>/<objeto>/partes/<peça>/receita.js, e a peça sozinha em <raiz>/<peça>/receita.js', () => {
    expect(destinoDaReceita('aviao/trens-principais', '/r').replaceAll('\\', '/')).toBe('/r/aviao/partes/trens-principais/receita.js');
    expect(destinoDaReceita('prensa', '/r').replaceAll('\\', '/')).toBe('/r/prensa/receita.js');
    expect(() => destinoDaReceita('Avião/Trens', '/r')).toThrow(/não é um nome de peça/);
  });
});

describe('a leitura da unidade', () => {
  it('unidade que o esboço não tem recusa dizendo quais tem', () => {
    const bruto = JSON.parse(readFileSync(MINI, 'utf8'));
    expect(() => lerUnidade({ bruto, unidade: 'inexistente' })).toThrow(/as unidades são suporte/);
  });

  it('as partes são as formas da unidade que não são cortadoras, com o espelho; os cortadores ficam à parte', () => {
    const bruto = JSON.parse(readFileSync(MINI, 'utf8'));
    const lida = lerUnidade({ bruto, unidade: 'suporte' });
    expect(lida.partes.map((p) => p.nome)).toEqual(['baseD', 'baseE', 'bracoD', 'bracoE', 'pinoD', 'pinoE', 'rodaD', 'rodaE', 'tampaD', 'tampaE']);
    expect(lida.cortadores.map((c) => c.id)).toEqual(['alojamentoBaseD', 'alojamentoBaseE']);
    expect(lida.partes.find((p) => p.nome === 'baseE').espelhoDe).toBe('baseD');
  });
});

describe('a TABELA', () => {
  it('traz os parâmetros resolvidos, com a expressão do esboço ao lado, e só os que a unidade usa', () => {
    expect(receita.PARAMS.parametros).toMatchObject({ bx: 120, esp: 30, bz: 60, pAy: 140, pBy: 80, raioRoda: 40, larguraRoda: 24, folgaPino: 5, diametroPino: 16 });
    expect(texto).toContain('pBy: 80, // =pAy-60');
  });

  it('traz os pontos nomeados, resolvidos, com as coordenadas cruas ao lado', () => {
    expect(receita.PARAMS.pontos).toEqual({ pA: [120, 140, 0], pB: [150, 80, 0], pC: [150, 75, 30], pRoda: [150, 75, 100] });
    expect(texto).toContain('pC: [150, 75, 30], // [=bx+30, =pBy-folgaPino, =bz/2]');
  });

  it('traz a medida e a posição de cada forma do lado D, com o parâmetro do esboço em comentário', () => {
    const { baseD, bracoD, pinoD, tampaD } = receita.PARAMS.formas;
    expect(baseD).toMatchObject({ tipo: 'caixa', eixo: 'y', centro: [120, 10, 0], largura: 60, altura: 20, profundidade: 60, raio: 4 });
    expect(texto).toContain('largura: 60, // =2*esp');
    expect(texto).toContain('profundidade: 60, // bz');
    expect(bracoD).toMatchObject({ tipo: 'caixa', largura: 30, profundidade: 12, de: [120, 140, 0], para: [150, 80, 0] });
    expect(bracoD.eixo).toBeUndefined();
    expect(texto).toContain('de: [120, 140, 0], // pA');
    expect(texto).toContain('para: [150, 80, 0], // entre(pA, pB), t 1');
    expect(pinoD).toMatchObject({ tipo: 'cilindro', diametro: 16, comprimento: 70, de: [150, 75, 30], para: [150, 75, 100] });
    expect(tampaD).toMatchObject({ tipo: 'anel', eixo: 'y', diametroExterno: 30, diametroInterno: 12, espessura: 6 });
  });

  it('a forma de família vira uma chamada com os parâmetros resolvidos, pronta para `chamar`', () => {
    expect(receita.PARAMS.familias.rodaD).toEqual({
      familia: 'roda-pneu',
      chamada: { perfil: 'carro', diametroPneu: 80, larguraPneu: 0.3, desvio: 0 },
      centro: [150, 75, 100],
      partes: ['cubo', 'pneu', 'aro', 'disco'],
    });
    expect(receita.PARAMS.formas.rodaD).toBeUndefined();
    expect(texto).toContain('larguraPneu: 0.3, // =larguraRoda/(2*raioRoda)');
  });

  it('o cortador entra em `cortadores`, e a cópia espelhada em `espelhos`, com a fonte e o plano', () => {
    expect(Object.keys(receita.PARAMS.cortadores)).toEqual(['alojamentoBaseD']);
    expect(receita.PARAMS.espelhos.baseE).toEqual({ de: 'baseD', eixo: 'x', pos: 0 });
    expect(receita.PARAMS.espelhos.alojamentoBaseE).toEqual({ de: 'alojamentoBaseD', eixo: 'x', pos: 0 });
    expect(receita.PARAMS.formas.baseE).toBeUndefined();
  });
});

describe('os PONTOS', () => {
  it('são o mínimo e o máximo da caixa de cada parte, no formato de conferir-pontos, com o lado E espelhado em x', () => {
    expect(receita.PONTOS).toHaveLength(20);
    for (const p of receita.PONTOS) {
      expect(Object.keys(p).sort()).toEqual(['em', 'medida', 'nome', 'parte', 'toleranciaMm']);
      expect(['minimo', 'maximo']).toContain(p.medida);
      expect(p.toleranciaMm).toBe(1);
    }
    const ponto = (parte, medida) => receita.PONTOS.find((p) => p.parte === parte && p.medida === medida).em;
    expect(ponto('baseD', 'minimo')).toEqual([90, 0, -30]);
    expect(ponto('baseD', 'maximo')).toEqual([150, 20, 30]);
    expect(ponto('baseE', 'minimo')).toEqual([-150, 0, -30]);
    expect(ponto('baseE', 'maximo')).toEqual([-90, 20, 30]);
  });
});

describe('o REFINA', () => {
  it('liga cada parte ao volume do andaime (o slug do id) e à forma do esboço, com a opção e o mínimo de 0,95', () => {
    expect(receita.REFINA.partes.baseD).toBe('base-d');
    expect(receita.REFINA.partes.rodaE).toBe('roda-e');
    expect(Object.keys(receita.REFINA.partes)).toHaveLength(10);
    expect(receita.REFINA.esboco).toMatchObject({ opcao: 1, minimo: 0.95 });
    expect(receita.REFINA.esboco.formas.baseE).toBe('baseE');
    expect(receita.REFINA.tolerancia).toEqual({ envelope: 5, porta: 0.5 });
  });

  it('o caminho do esboço, relativo à pasta da receita, chega ao arquivo do esboço', () => {
    expect(resolve(dirname(gerada.destino), receita.REFINA.esboco.arquivo)).toBe(MINI);
    expect(texto).toContain('arquivo: ESBOCO,');
  });

  it('sem andaime a regra do slug vale e o relatório avisa que não conferiu', () => {
    expect(gerada.avisoDoAndaime).toMatch(/não existe/);
  });
});

describe('os contatos e as formas', () => {
  it('são os pares de formas que se tocam no esboço, com a medida no motivo, e só entre partes', () => {
    const pares = receita.contatos.map((c) => c.par.join(' ~ ')).sort();
    expect(pares).toEqual(['baseD ~ tampaD', 'baseE ~ tampaE', 'pinoD ~ rodaD', 'pinoE ~ rodaE']);
    for (const c of receita.contatos) expect(c.motivo.length).toBeGreaterThanOrEqual(15);
    expect(receita.contatos.some((c) => c.par.some((p) => p.startsWith('alojamento')))).toBe(false);
  });

  it('a topologia prometida só sai onde o esboço a diz: sólido, anel de um furo, e nada para família', () => {
    expect(receita.formas.baseD).toBe('solido');
    expect(receita.formas.pinoE).toBe('solido');
    expect(receita.formas.tampaD).toEqual({ furos: 1 });
    expect(receita.formas.rodaD).toBeUndefined();
    expect(receita.formas.rodaE).toBeUndefined();
    expect(gerada.semFormaPrometida).toEqual(['rodaD', 'rodaE']);
  });
});

describe('o PLANO e os passos', () => {
  it('traz uma parte por forma, com a forma e a técnica que o esboço permite dizer, e a escala da unidade', () => {
    expect(receita.PLANO.partes.map((p) => p.nome)).toEqual(['baseD', 'baseE', 'bracoD', 'bracoE', 'pinoD', 'pinoE', 'rodaD', 'rodaE', 'tampaD', 'tampaE']);
    const base = receita.PLANO.partes[0];
    expect(base.forma).toMatch(/caixa de 60 por 20 por 60 mm/);
    expect(base.tecnica).toBe('caixa de canto arredondado do esboço');
    expect(receita.PLANO.partes.find((p) => p.nome === 'rodaD').tecnica).toMatch(/família roda-pneu, perfil carro/);
    expect(receita.PLANO.escala.milimetros).toBeGreaterThan(0);
  });

  it('os PASSOS saem vazios', () => {
    expect(receita.PASSOS).toEqual([]);
  });

  it('o objeto, as referências e os critérios saem vazios, e o normalizador do PLANO recusa a receita enquanto estiverem assim', () => {
    expect(receita.PLANO.objeto).toBe('');
    expect(receita.PLANO.referencias).toEqual([]);
    expect(receita.PLANO.criteriosDeReprovacao).toEqual([]);
    expect(() => normalizarPlanoDeModelagem(receita.PLANO)).toThrow(/'objeto' precisa ser texto não vazio/);
    expect(gerada.pendencias.join(' ')).toMatch(/objeto.*referência.*critérios/);
    const escrita = {
      ...receita.PLANO, objeto: 'suporte de prova com base, braço, pino e roda', referencias: ['referencias/lateral.png'], criteriosDeReprovacao: ['roda solta, fora do pino do suporte'],
    };
    expect(() => normalizarPlanoDeModelagem(escrita)).not.toThrow();
  });

  it('a referência dada na linha de comando entra no plano e sai da pendência', async () => {
    const r = await gravarReceitaPlanejada({ esboco: MINI, unidade: 'suporte', peca: 'teste/suporte', saida: join(area, 'ref'), semAlvo: true, referencias: ['referencias/lateral.png'] });
    expect((await importar(r.destino)).PLANO.referencias).toEqual(['referencias/lateral.png']);
    expect(r.pendencias.join(' ')).not.toMatch(/referência/);
  }, TEMPO);
});

describe('a gravação', () => {
  it('é determinística: o mesmo esboço dá o mesmo arquivo, byte a byte', async () => {
    const outra = await gravarReceitaPlanejada({ esboco: MINI, unidade: 'suporte', peca: 'teste/suporte', saida: join(area, 'b'), semAlvo: true });
    expect(normalizar(readFileSync(outra.destino, 'utf8'))).toBe(normalizar(texto));
  }, TEMPO);

  it('recusa gravar sobre receita que já tem passos, de qualquer forma, e não toca o arquivo', async () => {
    const saida = join(area, 'c');
    const destino = destinoDaReceita('teste/suporte', saida);
    mkdirSync(dirname(destino), { recursive: true });
    for (const conteudo of [
      "export default { meta: { nome: 'x' }, PASSOS: [['cubo', { origemId: 1 }]] };\n",
      "export default { meta: { nome: 'x' }, get PASSOS() { return []; } };\n",
      "export default { meta: { nome: 'x' } };\n",
    ]) {
      writeFileSync(destino, conteudo, 'utf8');
      await expect(gravarReceitaPlanejada({ esboco: MINI, unidade: 'suporte', peca: 'teste/suporte', saida, semAlvo: true })).rejects.toThrow(/já tem passos/);
      expect(readFileSync(destino, 'utf8')).toBe(conteudo);
    }
  }, TEMPO);

  it('regrava a receita planejada anterior e diz que o fez', async () => {
    const saida = join(area, 'd');
    const primeira = await gravarReceitaPlanejada({ esboco: MINI, unidade: 'suporte', peca: 'teste/suporte', saida, semAlvo: true });
    expect(primeira.regravou).toBe(false);
    const segunda = await gravarReceitaPlanejada({ esboco: MINI, unidade: 'suporte', peca: 'teste/suporte', saida, semAlvo: true });
    expect(segunda.regravou).toBe(true);
  }, TEMPO);

  it('só vale como planejada a receita com `PASSOS: []`; comentário e texto não enganam', () => {
    expect(receitaTemPassos(texto)).toBe(false);
    expect(receitaTemPassos('/* PASSOS: [] */ export default { get PASSOS() { return gerar(); } };')).toBe(true);
    expect(receitaTemPassos('export default { PASSOS: [[1]] };')).toBe(true);
  });

  it('sem --saida, recusa objeto que não existe em procedural/pecas, em vez de criar pasta por erro de digitação', async () => {
    const raiz = join(area, 'raiz');
    mkdirSync(join(raiz, 'procedural/pecas'), { recursive: true });
    await expect(gravarReceitaPlanejada({ esboco: MINI, unidade: 'suporte', peca: 'avioa/suporte', raiz, semAlvo: true })).rejects.toThrow(/o objeto 'avioa' não existe/);
    expect(readdirSync(join(raiz, 'procedural/pecas'))).toEqual([]);
  });

  it('sem --saida, grava no acervo do objeto que existe', async () => {
    const raiz = join(area, 'raiz2');
    mkdirSync(join(raiz, 'procedural/pecas/teste'), { recursive: true });
    const r = await gravarReceitaPlanejada({ esboco: MINI, unidade: 'suporte', peca: 'teste/suporte', raiz, semAlvo: true });
    expect(r.destino).toBe(join(raiz, 'procedural/pecas/teste/partes/suporte/receita.js'));
    expect(existsSync(r.destino)).toBe(true);
  }, TEMPO);
});

describe('o alvo', () => {
  it('é a composta da unidade gerada agora pela ferramenta do esboço, sem deixar a cópia do esboço ao lado da receita', async () => {
    const chamadas = [];
    const composta = async (arquivo, opcoes) => {
      chamadas.push({ arquivo, opcoes });
      const destino = arquivo.replace(/\.esboco\.json$/, `-unidade-${opcoes.unidade}-composta.png`);
      writeFileSync(destino, 'png', 'utf8');
      return { destino };
    };
    const r = await gravarReceitaPlanejada({ esboco: MINI, unidade: 'suporte', peca: 'teste/suporte', saida: join(area, 'e'), dependencias: { composta } });
    expect(chamadas).toHaveLength(1);
    expect(chamadas[0].opcoes).toEqual({ unidade: 'suporte' });
    expect(r.alvo).toBe(join(dirname(r.destino), 'alvo', 'suporte-unidade-suporte-composta.png'));
    expect(readdirSync(join(dirname(r.destino), 'alvo'))).toEqual(['suporte-unidade-suporte-composta.png']);
    expect(readFileSync(r.destino, 'utf8')).toContain('./alvo/suporte-unidade-suporte-composta.png');
  }, TEMPO);

  it('se a ferramenta do esboço não desenha, nenhuma receita fica pela metade', async () => {
    const saida = join(area, 'f');
    const composta = async () => { throw new Error('sem navegador'); };
    await expect(gravarReceitaPlanejada({ esboco: MINI, unidade: 'suporte', peca: 'teste/suporte', saida, dependencias: { composta } })).rejects.toThrow(/sem navegador/);
    expect(existsSync(destinoDaReceita('teste/suporte', saida))).toBe(false);
  }, TEMPO);

  it('a geração que o pacote do crítico usa é a mesma exposta por vistas-para-critica', async () => {
    const pasta = join(area, 'g');
    const feito = await gerarCompostaDaUnidade({
      arquivo: MINI, unidade: 'suporte', pasta, dependencias: { composta: async (arquivo) => ({ destino: `${arquivo}.png` }) },
    });
    expect(feito.copia).toBe(join(pasta, 'alvo', 'suporte.esboco.json'));
    expect(feito.imagem).toBe(`${feito.copia}.png`);
    expect(readFileSync(feito.copia, 'utf8')).toBe(readFileSync(MINI, 'utf8'));
  });
});

describe('a linha de comando', () => {
  it('aceita --opção valor como --opção=valor, grava e relata o que fica para quem conduz', async () => {
    const saida = join(area, 'h');
    const r = await comoCLI([MINI, '--unidade', 'suporte', '--peca', 'teste/suporte', '--saida', saida, '--sem-alvo']);
    expect(r.codigo).toBe(0);
    expect(r.stdout).toMatch(/gravada a receita planejada/);
    expect(r.stdout).toMatch(/10 partes, 20 pontos, 4 contatos, 2 cortadores/);
    expect(r.stdout).toMatch(/fica para quem conduz:\n {4}- o texto do objeto/);
  }, TEMPO);

  it('recusa com código 2 o que falta ou está errado, dizendo o quê', async () => {
    expect((await comoCLI([MINI, '--peca', 'a/b'])).stderr).toMatch(/diga a unidade/);
    expect((await comoCLI([MINI, '--unidade', 'suporte'])).stderr).toMatch(/diga a peça/);
    expect((await comoCLI([MINI, '--unidade', 'suporte', '--peca', 'a/b', '--minimo', '2'])).stderr).toMatch(/--minimo precisa ser/);
    expect((await comoCLI([MINI, '--unidade', 'suporte', '--peca', 'a/b', '--unidades', 'x'])).codigo).toBe(2);
  });

  it('esboço que não existe e unidade que não existe saem com código 1 e a causa', async () => {
    const semArquivo = await comoCLI([join(area, 'nada.esboco.json'), '--unidade', 'suporte', '--peca', 'teste/suporte', '--saida', area, '--sem-alvo']);
    expect(semArquivo.codigo).toBe(1);
    expect(semArquivo.stderr).toMatch(/não achei o esboço/);
    const semUnidade = await comoCLI([MINI, '--unidade', 'outra', '--peca', 'teste/suporte', '--saida', join(area, 'i'), '--sem-alvo']);
    expect(semUnidade.codigo).toBe(1);
    expect(semUnidade.stderr).toMatch(/a unidade 'outra' não tem forma/);
  });
});

describe('uma unidade do avião', () => {
  it('os trens principais: 32 partes, 64 pontos, 34 contatos, a roda de família e os seis cortadores fora das partes', async () => {
    const r = await gravarReceitaPlanejada({ esboco: AVIAO, unidade: 'trens-principais', peca: 'aviao/trens-principais', saida: join(area, 'aviao'), semAlvo: true });
    expect([r.partes, r.pontos, r.contatos, r.cortadores.length]).toEqual([32, 64, 34, 6]);
    expect(r.familias).toEqual(['rodaPrincipalD']);
    expect(r.semVolume).toEqual([]);
    expect(r.avisoDoAndaime).toBeNull();
    const gerada2 = await importar(r.destino);
    expect(gerada2.PARAMS.parametros).toMatchObject({ tpX: 1920, tpPy: 1115, tpZ: 4522, tpHub: 313.5, tpR: 296.5 });
    expect(gerada2.PARAMS.familias.rodaPrincipalD.chamada).toMatchObject({ perfil: 'carro', diametroPneu: 593, desvio: 0 });
    expect(gerada2.REFINA.partes.pernaPrincipalD).toBe('perna-principal-d');
    expect(resolve(dirname(r.destino), gerada2.REFINA.esboco.arquivo)).toBe(AVIAO);
  }, TEMPO);
});
