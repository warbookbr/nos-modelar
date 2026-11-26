/* esqueleto.test.mjs — a árvore de juntas: recusas com campo e conserto, determinismo, propagação de medida, o andaime no normalizador de forma-global e a conferência do proporcoes. */
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { normalizarAndaimeGlobal } from '../../src/autoria/forma-global.js';
import { avisosDaPose, cadeiaDoEsqueleto, posarEsqueleto, receitaDoEsqueleto } from '../../src/autoria/esqueleto-de-bolas.js';
import { executarReceita } from '../../src/autoria/executar-receita.js';
import { avisosDoEsqueleto, comoCLI, conferirEsqueleto, escreverEsqueleto, gerarEsqueleto } from './esqueleto.mjs';
import { conferirProporcoes } from './proporcoes.mjs';

const FIXTURE = 'tools/fixtures/esqueleto';
const temporarios = [];
const lerJson = (c) => JSON.parse(readFileSync(c, 'utf8'));

function copia() {
  const pasta = mkdtempSync(join(tmpdir(), 'esqueleto-'));
  temporarios.push(pasta);
  cpSync(FIXTURE, pasta, { recursive: true });
  return { pasta, arquivo: join(pasta, 'proporcoes.json') };
}
const editar = (arquivo, fn) => { const d = lerJson(arquivo); fn(d); writeFileSync(arquivo, `${JSON.stringify(d, null, 2)}\n`); };
const comJunta = (id, fn) => (d) => fn(d.esqueleto.juntas.find((j) => j.id === id), d);
const posicoes = (caminho) => Object.fromEntries(gerarEsqueleto(caminho).arvore.juntas.map((j) => [j.id, j.posicao]));

afterEach(() => { while (temporarios.length) rmSync(temporarios.pop(), { recursive: true, force: true }); });

describe('recusas: dizem o campo, o recebido, o esperado e o comando que conserta', () => {
  const recusa = (mudar, padrao) => {
    const { arquivo } = copia();
    editar(arquivo, mudar);
    expect(() => gerarEsqueleto(arquivo)).toThrow(padrao);
    expect(() => gerarEsqueleto(arquivo)).toThrow(/conserte com: .*npm run esqueleto -- --proporcoes=/);
  };
  it('pai que não existe', () => recusa(comJunta('cotovelo-direito', (j) => { j.pai = 'umero'; }), /esqueleto\.juntas\[1\]\.pai = 'umero', que não existe; esperava a raiz 'tronco' ou um id de junta/));
  it('ciclo', () => recusa((d) => { comJunta('ombro-direito', (j) => { j.pai = 'mao-direito'; })(d); }, /o ciclo .* -> .* em esqueleto\.juntas; esperava uma árvore/));
  it('junta que é pai de si mesma', () => recusa(comJunta('cotovelo-direito', (j) => { j.pai = 'cotovelo-direito'; }), /o ciclo cotovelo-direito -> cotovelo-direito/));
  it('comprimento negativo', () => recusa(comJunta('cotovelo-direito', (j) => { j.comprimento = -5; }), /esqueleto\.juntas\[1\]\.comprimento = -5; esperava um número maior que zero/));
  it('comprimento zero vindo de fórmula', () => recusa((d) => { d.medidas.comprimentoDoBraco = '=raioDoOmbro - raioDoOmbro'; }, /comprimento = 0 \(de "=comprimentoDoBraco"\)|comprimento = 0/));
  it('direção nula', () => recusa(comJunta('cotovelo-direito', (j) => { j.direcao = [0, 0, 0]; }), /esqueleto\.juntas\[1\]\.direcao = \[0,0,0\], um vetor nulo/));
  it('fórmula com medida inexistente', () => recusa(comJunta('cotovelo-direito', (j) => { j.comprimento = '=comprimentoDoUmero + 1'; }), /esqueleto\.juntas\[1\]\.comprimento = "=comprimentoDoUmero \+ 1", que usa a medida 'comprimentoDoUmero'/));
  it('espelho de junta que não existe', () => recusa(comJunta('ombro-esquerdo', (j) => { j.espelho.de = 'ombro-fantasma'; }), /espelho\.de = 'ombro-fantasma', que não existe/));
  it('espelho sem troca quando há descendentes', () => recusa(comJunta('ombro-esquerdo', (j) => { delete j.espelho.troca; }), /espelho sem "troca"/));
  it('pai do espelho que não é o espelho do pai da fonte', () => recusa((d) => {
    d.esqueleto.juntas.push({ id: 'ombro-baixo', pai: 'mao-direito', espelho: { de: 'ombro-direito', plano: 'x', troca: ['direito', 'baixo'] } });
  }, /pai = 'mao-direito'.*esperava o espelho \(plano x\) do pai 'tronco'/));
  it('id repetido', () => recusa((d) => { d.esqueleto.juntas[2].id = 'cotovelo-direito'; }, /o id 'cotovelo-direito' repetido/));
  it('curso sem filha', () => recusa(comJunta('mao-direito', (j) => { j.eixo = [1, 0, 0]; j.curso = { minimo: 0, maximo: 10 }; }), /a junta 'mao-direito' com curso e sem filha/));
  it('o CLI recusa seção ausente e arquivo sem esqueleto', () => {
    const { arquivo } = copia();
    editar(arquivo, (d) => { delete d.esqueleto; });
    expect(() => comoCLI([`--proporcoes=${arquivo}`], () => {})).toThrow(/sem a seção "esqueleto"/);
  });
});

describe('geração', () => {
  it('duas execuções dão os mesmos bytes, e as saídas gravadas da fixture batem', () => {
    const a = copia(), b = copia();
    escreverEsqueleto(a.arquivo); escreverEsqueleto(b.arquivo);
    for (const f of ['andaime.json', 'articulacoes.json', 'esqueleto.json']) {
      expect(readFileSync(join(a.pasta, f), 'utf8')).toBe(readFileSync(join(b.pasta, f), 'utf8'));
      expect(readFileSync(join(a.pasta, f), 'utf8')).toBe(readFileSync(join(FIXTURE, f), 'utf8'));
    }
    expect(escreverEsqueleto(a.arquivo)).toEqual([]);
    expect(conferirEsqueleto(a.arquivo)).toEqual([]);
  });

  it('o espelho reflete posição e membros, e o eixo de giro como pseudovetor', () => {
    const p = posicoes(`${FIXTURE}/proporcoes.json`);
    expect(p['ombro-direito']).toEqual([200, 1400, 0]);
    expect(p['ombro-esquerdo']).toEqual([-200, 1400, 0]);
    expect(p['cotovelo-esquerdo']).toEqual([-200, 1100, 0]);
    expect(p['mao-esquerdo']).toEqual([-200, 850, 0]);
    const andaime = lerJson(`${FIXTURE}/andaime.json`);
    const porta = (id) => andaime.portas.find((x) => x.id === id).interface;
    expect(porta('porta-ombro-esquerdo').eixo).toEqual([0, 0, -1]);
    expect(porta('porta-ombro-direito').eixo).toEqual([0, 0, 1]);
    expect(lerJson(`${FIXTURE}/articulacoes.json`).articulacoes.map((x) => x.id)).toEqual(['ombro-direito', 'cotovelo-direito', 'ombro-esquerdo', 'cotovelo-esquerdo']);
  });

  it('mudar um comprimento move a junta filha e o que pende dela, e só isso', () => {
    const { arquivo } = copia();
    const antes = posicoes(arquivo);
    editar(arquivo, (d) => { d.medidas.comprimentoDoBraco = 350; });
    const depois = posicoes(arquivo);
    expect(depois['cotovelo-direito'][1]).toBe(antes['cotovelo-direito'][1] - 50);
    expect(depois['mao-direito'][1]).toBe(antes['mao-direito'][1] - 50);
    expect(depois['cotovelo-esquerdo'][1]).toBe(antes['cotovelo-esquerdo'][1] - 50);
    for (const parado of ['tronco', 'ombro-direito', 'ombro-esquerdo']) expect(depois[parado]).toEqual(antes[parado]);
  });

  it('o andaime gerado passa no normalizador de forma-global: uma bola por junta, um bastão por segmento, uma porta por junta com eixo', () => {
    const andaime = normalizarAndaimeGlobal(lerJson(`${FIXTURE}/andaime.json`));
    expect(andaime.volumes.filter((v) => v.tipo === 'esfera')).toHaveLength(8);
    expect(andaime.volumes.filter((v) => v.tipo === 'cilindro')).toHaveLength(7);
    expect(andaime.portas).toHaveLength(4);
  });

  it('um membro oblíquo vira tubo reto e também passa no normalizador', () => {
    const { arquivo } = copia();
    editar(arquivo, comJunta('cotovelo-direito', (j) => { j.direcao = [1, -1, 0]; }));
    const { arquivos } = gerarEsqueleto(arquivo);
    const andaime = normalizarAndaimeGlobal(arquivos[0].json);
    expect(andaime.volumes.find((v) => v.id === 'bastao-cotovelo-direito').tipo).toBe('tubo');
    expect(andaime.volumes.find((v) => v.id === 'bastao-ombro-direito').tipo).toBe('cilindro');
  });
});

describe('conferência (gate 2 do plano)', () => {
  it('npm run proporcoes sem escrever acusa o andaime que ficou para trás depois de mudar uma medida', () => {
    const { arquivo } = copia();
    escreverEsqueleto(arquivo);
    expect(conferirProporcoes(arquivo)).toEqual([]);
    editar(arquivo, (d) => { d.medidas.comprimentoDoAntebraco = 280; });
    const d = conferirProporcoes(arquivo);
    expect(d.length).toBeGreaterThan(0);
    expect(d.map((x) => x.lugar).join(' ')).toMatch(/andaime\.json/);
    expect(d[0].mensagem).toMatch(/o que o esqueleto dá\.\n\s+conserte com: npm run esqueleto -- --proporcoes=.* --escrever/);
    expect(escreverEsqueleto(arquivo)).toContain('andaime.json');
    expect(conferirProporcoes(arquivo)).toEqual([]);
  });

  it('o CLI responde a --ajuda, confere (1 na divergência) e escreve', () => {
    const { arquivo } = copia();
    const saida = [];
    expect(comoCLI(['--ajuda'], (t) => saida.push(t))).toBe(0);
    expect(saida.join('\n')).toMatch(/--proporcoes=<proporcoes\.json>/);
    expect(comoCLI([`--proporcoes=${arquivo}`], () => {})).toBe(0);
    editar(arquivo, (d) => { d.medidas.larguraDosOmbros = 500; });
    expect(comoCLI([`--proporcoes=${arquivo}`], () => {})).toBe(1);
    expect(comoCLI([`--proporcoes=${arquivo}`, '--escrever'], () => {})).toBe(0);
    expect(comoCLI([`--proporcoes=${arquivo}`], () => {})).toBe(0);
  });
});

describe('poses, avisos e a peça (fatia 2)', () => {
  const caminho = `${FIXTURE}/proporcoes.json`;
  const arvoreDe = (c) => gerarEsqueleto(c).arvore;
  const pose = (arvore, nome) => arvore.poses.find((p) => p.nome === nome).angulos;

  it('a pose zero da fixture não tem aviso, e as poses declaradas dão o que dizem', () => {
    const r = avisosDoEsqueleto(arvoreDe(caminho));
    expect(r.map((x) => x.pose)).toEqual(['zero', 'bracos-abertos', 'antebraco-no-tronco']);
    expect(r[0].avisos).toEqual([]);
    expect(r[1].avisos).toEqual([]);
    const nomes = r[2].avisos.flatMap((a) => [a.a, a.b]);
    expect(nomes).toContain('bastao-bacia');
    expect(nomes).toContain('bastao-mao-direito');
    expect(r[2].avisos.every((a) => a.tipo === 'atravessa' && a.penetracao > 0)).toBe(true);
  });

  it('a pose gira a subárvore em torno do eixo, da raiz para as folhas, e os dois lados abrem para fora', () => {
    const arvore = arvoreDe(caminho);
    const p = posarEsqueleto(arvore, pose(arvore, 'bracos-abertos'));
    const perto = (a, b) => a.every((x, i) => Math.abs(x - b[i]) < 1e-6);
    expect(perto(p.get('ombro-direito'), [200, 1400, 0])).toBe(true);
    expect(perto(p.get('cotovelo-direito'), [500, 1400, 0])).toBe(true);
    expect(perto(p.get('cotovelo-esquerdo'), [-500, 1400, 0])).toBe(true);
    const q = posarEsqueleto(arvore, { 'ombro-direito': 90, 'cotovelo-direito': -90 });
    expect(perto(q.get('mao-direito'), [500, 1150, 0])).toBe(true);
  });

  it('o chão acusa o elemento que passa abaixo dele', () => {
    const { arquivo } = copia();
    editar(arquivo, (d) => { d.esqueleto.chao = 840; });
    const avisos = avisosDaPose(arvoreDe(arquivo), {});
    const abaixo = avisos.filter((a) => a.tipo === 'abaixo-do-chao');
    expect(abaixo.map((a) => a.elemento)).toEqual(expect.arrayContaining(['bola-mao-direito', 'bola-mao-esquerdo']));
    expect(abaixo.find((a) => a.elemento === 'bola-mao-direito').abaixo).toBe(18);
  });

  it('ângulo fora do curso é recusado com campo, recebido, esperado e o comando que conserta', () => {
    const { arquivo } = copia();
    editar(arquivo, (d) => { d.esqueleto.poses['bracos-abertos'].angulos['ombro-direito'] = 200; });
    const aviso = (f) => { try { f(); } catch (e) { return e.message; } return ''; };
    const msg = aviso(() => gerarEsqueleto(arquivo));
    expect(msg).toMatch(/esqueleto\.poses\.bracos-abertos\.angulos\.ombro-direito = 200; esperava um ângulo entre -100 e 180 graus, o curso da junta 'ombro-direito'/);
    expect(msg).toMatch(/conserte com: .*npm run esqueleto -- --proporcoes=/);
    editar(arquivo, (d) => { d.esqueleto.poses['bracos-abertos'].angulos = { 'mao-direito': 10 }; });
    expect(aviso(() => gerarEsqueleto(arquivo))).toMatch(/'mao-direito' sem curso/);
    editar(arquivo, (d) => { d.esqueleto.poses['bracos-abertos'].angulos = {}; d.esqueleto.poses.zero = { angulos: {} }; });
    expect(aviso(() => gerarEsqueleto(arquivo))).toMatch(/diferente de "zero"/);
  });

  it('o aviso não reprova por padrão, e --estrito reprova', () => {
    const { arquivo } = copia();
    escreverEsqueleto(arquivo);
    const saida = [];
    expect(comoCLI([`--proporcoes=${arquivo}`], (t) => saida.push(t))).toBe(0);
    expect(saida.join('\n')).toMatch(/aviso: pose 'antebraco-no-tronco': bola-mao-direito atravessa bastao-bacia/);
    expect(saida.join('\n')).toMatch(/zero \(sem aviso\)/);
    expect(comoCLI([`--proporcoes=${arquivo}`, '--estrito'], () => {})).toBe(1);
    editar(arquivo, (d) => { delete d.esqueleto.poses['antebraco-no-tronco']; });
    escreverEsqueleto(arquivo);
    expect(comoCLI([`--proporcoes=${arquivo}`, '--estrito'], () => {})).toBe(0);
  });

  it('a peça executa e tem uma parte por junta e por membro, em cada pose', async () => {
    const arvore = arvoreDe(caminho);
    for (const nome of ['zero', 'antebraco-no-tronco']) {
      const receita = receitaDoEsqueleto(arvore, { pose: nome });
      const partes = receita.PASSOS.filter((p) => p[0] === 'parte').map((p) => p[1].nome);
      expect(partes).toHaveLength(15);
      expect(partes).toEqual(expect.arrayContaining(['bolaTronco', 'bolaBacia', 'bolaOmbroDireito', 'bastaoCotoveloEsquerdo', 'bastaoMaoDireito']));
      expect(receita.PLANO.partes.map((x) => x.nome).sort()).toEqual([...partes].sort());
      const r = executarReceita(receita);
      expect(r).toBeTruthy();
    }
    expect(() => receitaDoEsqueleto(arvore, { pose: 'inexistente' })).toThrow(/pose 'inexistente' não existe; esperava uma de zero, bracos-abertos, antebraco-no-tronco; conserte com: npm run esqueleto/);
  });

  it('determinismo: avisos, passos e arquivos saem iguais em duas execuções', () => {
    const a = arvoreDe(caminho), b = arvoreDe(caminho);
    expect(JSON.stringify(avisosDoEsqueleto(a))).toBe(JSON.stringify(avisosDoEsqueleto(b)));
    expect(JSON.stringify(receitaDoEsqueleto(a, { pose: 'antebraco-no-tronco' }).PASSOS)).toBe(JSON.stringify(receitaDoEsqueleto(b, { pose: 'antebraco-no-tronco' }).PASSOS));
  });
});

describe('cadeia da receita (TABELA, derivar, gerarPassos) para a guarda do acervo', () => {
  it('PASSOS da receita lê PARAMS.pose: a mesma receita com outra pose dá outros passos, e a tabela e gerarPassos concordam', () => {
    const arvore = gerarEsqueleto(`${FIXTURE}/proporcoes.json`).arvore;
    const receita = receitaDoEsqueleto(arvore, { pose: 'zero' });
    const { TABELA, derivar, gerarPassos } = cadeiaDoEsqueleto(arvore);
    expect(TABELA).toEqual({ pose: 'zero' });
    expect(JSON.stringify(gerarPassos(TABELA))).toBe(JSON.stringify(receita.PASSOS));
    receita.PARAMS = { pose: 'antebraco-no-tronco' };
    expect(JSON.stringify(receita.PASSOS)).toBe(JSON.stringify(receitaDoEsqueleto(arvore, { pose: 'antebraco-no-tronco' }).PASSOS));
    expect(JSON.stringify(receita.PASSOS)).not.toBe(JSON.stringify(gerarPassos(TABELA)));
    expect(derivar({ pose: 'antebraco-no-tronco' }).angulos).toEqual({ 'cotovelo-direito': -90 });
    expect(() => gerarPassos({ pose: 'inexistente' })).toThrow(/pose 'inexistente' não existe/);
  });
});

describe('deslocamento da raiz na pose', () => {
  it('move a raiz e tudo o que pende dela, e o chão acusa quando desce demais', () => {
    const { arquivo } = copia();
    const { arvore } = gerarEsqueleto(arquivo);
    const parado = posarEsqueleto(arvore, {});
    const descido = posarEsqueleto(arvore, {}, [0, -40, 10]);
    for (const [id, p] of parado) expect(descido.get(id)).toEqual([p[0], p[1] - 40, p[2] + 10]);
    const fundo = Math.min(...[...parado.values()].map((p) => p[1]));
    const chao = { ...arvore, chao: fundo - 1000 };
    expect(avisosDaPose(chao, {}, [0, 0, 0]).filter((a) => a.tipo === 'abaixo-do-chao')).toEqual([]);
    expect(avisosDaPose(chao, {}, [0, -1200, 0]).some((a) => a.tipo === 'abaixo-do-chao')).toBe(true);
  });

  it('a pose grava o deslocamento resolvido da fórmula, e o vetor inválido é recusado com o conserto', () => {
    const { arquivo } = copia();
    editar(arquivo, (d) => { d.esqueleto.poses['bracos-abertos'].deslocamentoDaRaiz = [0, '=0 - comprimentoDoBraco', 0]; });
    const pose = gerarEsqueleto(arquivo).arvore.poses.find((p) => p.nome === 'bracos-abertos');
    expect(pose.deslocamentoDaRaiz[1]).toBeLessThan(0);
    editar(arquivo, (d) => { d.esqueleto.poses['bracos-abertos'].deslocamentoDaRaiz = [0, -10]; });
    expect(() => gerarEsqueleto(arquivo)).toThrow(/deslocamentoDaRaiz = \[0,-10\]; esperava um vetor \[x, y, z\].*\n?.*conserte com: .*npm run esqueleto/s);
  });
});
