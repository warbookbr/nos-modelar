/* O curso de um mecanismo no esboço (atritos 38, 40 e 42 do avião): o trem recolhe girando por um parâmetro e atravessa o capô
   depois de 85 graus, e saber disso pediu copiar o detalhe, tirar o `oculto` das vizinhas e rodar quinze `--editar` à mão. O
   esboço declara o curso (`curso`), o gate de contato roda em cada posição e os achados vêm juntos, com a posição em que cada
   um aparece; a unidade que o curso move só vira feita sem achado em nenhuma posição. Dois mecanismos de prova: um trem que
   recolhe e bate numa parede a partir de certo ângulo (o parâmetro move as formas por ponto nomeado) e uma porta que abre
   (as `formas` giram em torno da dobradiça). Cada medida é de número: o ângulo da primeira posição com achado, as posições em
   que cada um aparece, a pose de cada forma. */
import { describe, expect, it } from 'vitest';
import { expandirEsboco } from '../src/expandir.js';
import { ErroDeEsboco, resolverOpcao } from '../src/index.js';
import { imagemDoAchado } from '../src/achado.js';
import { avancar, criarEstado, marcarFeito } from '../src/condutor.js';
import { aplicarPose, lerCurso, posesDoBrief, posicoesDoCurso } from '../src/curso.js';
import { achadosDoCursoNaUnidade, cursosDaUnidade, formatarCurso, formasQueSeMovem, quadroDoCurso, semOcultas, varrerCurso } from '../src/curso-varredura.js';

const caixa = (id, x, y, z, w, h, d, extra = {}) => ({ id, tipo: 'caixa', largura: w, altura: h, profundidade: d, centro: [x, y, z], ...extra });

/* O trem: a perna vai do pivô P (sob o corpo) à roda W, que gira com `angTrem` no plano y-z (0 estendido, 90 recolhido para trás).
   A parede fica 175 mm atrás do pivô e a roda a alcança entre 45 e 60 graus; o corpo, a 75. A 90 a roda está dentro do corpo, como
   o trem do nariz do avião entrava no capô. */
const trem = (extra = {}) => ({
  parametros: { angTrem: 0, perna: 150, raio: 60 },
  pontos: { P: [0, 185, 0], W: [0, '=185-perna*cos(angTrem)', '=-perna*sin(angTrem)'] },
  contato: { usar: true, tolerancia: 1, penetracao: 1, pares: [
    { a: 'perna', b: 'mancal', tipo: 'atravessa', max: 60, motivo: 'a perna gira dentro do mancal' },
    { a: 'perna', b: 'roda', tipo: 'atravessa', max: 120, motivo: 'a roda se prende no fim da perna' },
  ] },
  curso: { recolhe: { parametro: 'angTrem', de: 0, ate: 90, passos: 6, rotulo: 'o trem recolhendo para trás' } },
  opcoes: [{ titulo: 'T', formas: [
    caixa('corpo', 0, 300, -100, 200, 200, 400, { unidade: 'corpo' }),
    caixa('mancal', 0, 187.5, 0, 60, 25, 60, { unidade: 'trem' }),
    { id: 'perna', tipo: 'cilindro', diametro: 20, de: 'P', para: 'W', cor: 'cinza', unidade: 'trem' },
    { id: 'roda', tipo: 'cilindro', diametro: '=raio*2', comprimento: 40, eixo: 'x', centro: 'W', cor: 'preto', unidade: 'trem' },
    caixa('parede', 0, 150, -190, 200, 100, 30, { unidade: 'corpo' }),
  ] }],
  ...extra,
});

/* A porta: a caixa `porta` gira em torno da dobradiça (100, y, -50) pelo ângulo `angPorta`, sem coordenada nenhuma que dependa
   dele no JSON. O pilone fica no caminho da ponta da porta entre 25 e 70 graus, e a 75 e a 90 ela já passou por cima dele. */
const porta = () => ({
  parametros: { angPorta: 0 },
  contato: { usar: true, tolerancia: 1, penetracao: 1 },
  curso: { abre: { parametro: 'angPorta', de: 0, ate: 90, passos: 6, formas: ['porta'], gira: { eixo: 'y', centro: [100, 80, -50] } } },
  opcoes: [{ titulo: 'P', formas: [
    caixa('corpo', 0, 80, 0, 200, 160, 300),
    caixa('porta', 105, 80, 0, 10, 160, 100),
    caixa('asa', 200, 70, 70, 200, 20, 40),
    caixa('pilone', 175, 80, 20, 50, 40, 60),
  ] }],
});

const valores = (a) => a.posicoes.map((p) => p.valor);
const achar = (v, pecas) => v.cursos[0].achados.find((a) => pecas.every((p) => a.pecas.includes(p)));

describe('a declaração do curso', () => {
  it('lê o curso com o passo padrão e as posições de `de` a `ate`, as duas pontas incluídas', () => {
    const [c] = lerCurso(trem());
    expect(c).toMatchObject({ nome: 'recolhe', parametro: 'angTrem', de: 0, ate: 90, passos: 6 });
    expect(posicoesDoCurso(c)).toEqual([0, 15, 30, 45, 60, 75, 90]);
    expect(posicoesDoCurso({ de: 0, ate: 95, passos: 10 })).toEqual([0, 9.5, 19, 28.5, 38, 47.5, 57, 66.5, 76, 85.5, 95]);
    expect(posicoesDoCurso({ de: 90, ate: 0, passos: 3 })).toEqual([90, 60, 30, 0]);
    expect(lerCurso({ ...trem(), curso: { a: { parametro: 'angTrem', de: 0, ate: 80 } } })[0].passos).toBe(8);
  });

  it('o brief mostra até 6 posições, espaçadas, e nunca perde a última', () => {
    expect(posesDoBrief({ de: 0, ate: 50, passos: 5 })).toEqual([0, 10, 20, 30, 40, 50]);
    expect(posesDoBrief({ de: 0, ate: 90, passos: 6 })).toEqual([0, 15, 30, 60, 75, 90]);
    const onze = posesDoBrief({ de: 0, ate: 95, passos: 10 });
    expect(onze).toHaveLength(6);
    expect(onze[0]).toBe(0);
    expect(onze.at(-1)).toBe(95);
  });

  it('recusa o que não vale, dizendo o campo e o válido', () => {
    const com = (curso) => () => expandirEsboco({ ...trem(), curso });
    expect(com({ x: { parametro: 'angTrm', de: 0, ate: 90 } })).toThrow(/esboço: curso "x": o parâmetro "angTrm" não existe.*quis dizer "angTrem"/);
    expect(com({ x: { parametro: 'angTrem', de: 0 } })).toThrow(/"ate" deve ser um número/);
    expect(com({ x: { parametro: 'angTrem', de: 10, ate: 10 } })).toThrow(/"de" e "ate" são o mesmo valor/);
    expect(com({ x: { parametro: 'angTrem', de: 0, ate: 90, passos: 0 } })).toThrow(/"passos" deve ser um inteiro de 1 a 200/);
    expect(com({ x: { parametro: 'angTrem', de: 0, ate: 90, passo: 4 } })).toThrow(/o campo "passo" não existe.*quis dizer "passos"/);
    expect(com({ x: { parametro: 'angTrem', de: 0, ate: 90, formas: ['roda'] } })).toThrow(/com "formas" falta "gira"/);
    expect(com({ x: { parametro: 'angTrem', de: 0, ate: 90, gira: { eixo: 'y', centro: [0, 0, 0] } } })).toThrow(/"gira" diz como as "formas" se movem/);
    expect(com({ x: { parametro: 'angTrem', de: 0, ate: 90, formas: ['roda'], gira: { eixo: 'w', centro: [0, 0, 0] } } })).toThrow(/gira.eixo deve ser "x", "y" ou "z"/);
    expect(com({ x: { parametro: 'angTrem', de: 0, ate: 90, formas: ['nada'], gira: { eixo: 'y', centro: [0, 0, 0] } } })).toThrow(/move "nada", que não é forma, instância nem padrão/);
    expect(com({})).toThrow(ErroDeEsboco);
  });

  it('o curso não entra no esboço expandido: o que se desenha e se mede são as formas', () => {
    expect(expandirEsboco(trem()).curso).toBeUndefined();
    expect(aplicarPose(trem(), lerCurso(trem())[0], 45).parametros.angTrem).toBe(45);
    expect(trem().parametros.angTrem).toBe(0);
  });
});

describe('o trem que recolhe e bate na parede (as formas dependem do parâmetro por ponto nomeado)', () => {
  it('a pose de repouso não tem achado, e os achados do curso vêm juntos com a posição em que cada um aparece', () => {
    const v = varrerCurso(trem());
    const [c] = v.cursos;
    expect(c.posicoes).toEqual([0, 15, 30, 45, 60, 75, 90]);
    expect(c.gateLigado).toBe(true);
    expect(c.achados).toHaveLength(2);
    expect(c.achados.every((a) => !a.noInicio)).toBe(true);
    /* a roda atinge a parede a partir de 60 (entre 45 e 60 graus) e o corpo a partir de 75 */
    expect(valores(achar(v, ['roda', 'parede']))).toEqual([60, 75, 90]);
    expect(valores(achar(v, ['roda', 'corpo']))).toEqual([75, 90]);
    expect(achar(v, ['roda', 'parede']).tipo).toBe('colisao');
    /* a penetração cresce com o recolhimento: 14,9 mm a 60, 29,9 a 75 e 35 a 90 */
    const mm = achar(v, ['roda', 'parede']).posicoes.map((p) => Math.round(p.mm * 10) / 10);
    expect(mm).toEqual([14.9, 29.9, 35]);
    expect(c.porPosicao.map((p) => p.achados)).toEqual([0, 0, 0, 0, 1, 2, 2]);
  });

  it('o relato diz a posição de cada achado, a das posições sem achado e sai com código 1', () => {
    const { texto, codigo } = formatarCurso(varrerCurso(trem()));
    expect(codigo).toBe(1);
    expect(texto).toContain('curso recolhe (o trem recolhendo para trás): angTrem de 0 a 90 em 6 passos, 7 posições');
    expect(texto).toMatch(/roda e parede se penetram 14,9 mm\n\s+em angTrem 60 \(14,9 mm\), 75 \(29,9 mm\), 90 \(35 mm\); o pior, 35 mm em 90/);
    expect(texto).toMatch(/corpo e roda se penetram[^\n]*\n\s+em angTrem 75 /);
    expect(texto).toContain('posições sem achado novo: 0, 15, 30, 45');
  });

  it('um curso sem achado novo sai com código 0 e diz as posições', () => {
    const curto = trem({ curso: { recolhe: { parametro: 'angTrem', de: 0, ate: 45, passos: 3 } } });
    const { texto, codigo } = formatarCurso(varrerCurso(curto));
    expect(codigo).toBe(0);
    expect(texto).toContain('nenhum achado novo em nenhuma das 4 posições (0, 15, 30, 45)');
  });

  it('o achado que já existe na primeira posição é do repouso, e não do curso', () => {
    const e = trem();
    e.opcoes[0].formas.push(caixa('intruso', 0, 300, -100, 40, 40, 40, { unidade: 'corpo' }));
    const v = varrerCurso(e);
    const doRepouso = v.cursos[0].achados.filter((a) => a.noInicio);
    expect(doRepouso.length).toBeGreaterThan(0);
    expect(doRepouso.every((a) => a.pecas.includes('intruso') || a.pecas.includes('corpo'))).toBe(true);
    expect(formatarCurso(v).texto).toMatch(/já existem? na primeira posição \(angTrem 0\) e não são do curso/);
    /* os do curso continuam os mesmos dois */
    expect(v.cursos[0].achados.filter((a) => !a.noInicio)).toHaveLength(2);
  });

  it('o mecanismo se escolhe pelo nome, e um nome que não existe diz os que existem', () => {
    const dois = trem({ curso: { recolhe: { parametro: 'angTrem', de: 0, ate: 90, passos: 6 }, meio: { parametro: 'angTrem', de: 0, ate: 45, passos: 3 } } });
    expect(varrerCurso(dois).cursos.map((c) => c.nome)).toEqual(['recolhe', 'meio']);
    expect(varrerCurso(dois, { nome: 'meio' }).cursos[0].achados).toHaveLength(0);
    expect(() => varrerCurso(dois, { nome: 'meo' })).toThrow(/--curso: "meo" não é um mecanismo declarado em "curso".*quis dizer "meio".*mecanismos: recolhe, meio/);
    expect(() => varrerCurso({ ...trem(), curso: undefined })).toThrow(/o esboço não declara "curso"/);
  });

  it('o gate desligado é dito, e não vira um curso limpo', () => {
    const e = trem();
    delete e.contato;
    const { texto, codigo } = formatarCurso(varrerCurso(e));
    expect(texto).toContain('o gate de contato está desligado (contato.usar)');
    expect(codigo).toBe(0);
  });
});

describe('o detalhe isolado esconde as vizinhas, e o curso as traz de volta', () => {
  const comOculta = () => {
    const e = trem({ baseDoMestre: { unidade: 'trem' } });
    const parede = e.opcoes[0].formas.find((f) => f.id === 'parede');
    /* a vizinha do detalhe sem unidade declarada é só guia de posição: o gate não a julga (com unidade, a julgaria) */
    parede.oculto = true;
    delete parede.unidade;
    return e;
  };
  it('com `oculto` a parede não existe para o gate; a varredura do detalhe a traz à vista e acha a travessia', () => {
    const { esboco, trazidas } = semOcultas(comOculta());
    expect(trazidas).toBe(1);
    expect(esboco.opcoes[0].formas.find((f) => f.id === 'parede').oculto).toBeUndefined();
    expect(comOculta().opcoes[0].formas.find((f) => f.id === 'parede').oculto).toBe(true);
    const v = varrerCurso(comOculta());
    expect(v.cursos[0].trazidas).toBe(1);
    expect(valores(achar(v, ['roda', 'parede']))).toEqual([60, 75, 90]);
    expect(formatarCurso(v).texto).toContain('1 forma oculta trazida à vista para a varredura');
    /* sem pedir, o mestre (sem baseDoMestre) respeita o `oculto` que ele mesmo declarou */
    const mestre = comOculta();
    delete mestre.baseDoMestre;
    expect(achar(varrerCurso(mestre), ['roda', 'parede'])).toBeUndefined();
  });
});

describe('a porta que abre (as `formas` do curso giram em torno da dobradiça)', () => {
  const pose = (angulo) => {
    const e = expandirEsboco(aplicarPose(porta(), lerCurso(porta())[0], angulo));
    return resolverOpcao(e.opcoes[0]).find((r) => r.id === 'porta');
  };

  it('a porta fica onde a rotação em torno da dobradiça a põe, em cada ângulo', () => {
    expect(pose(0).centro).toEqual([105, 80, 0]);
    /* 90 graus em y em torno de (100, 80, -50): (5, 0, 50) vai a (50, 0, -5) */
    const aberta = pose(90);
    expect(aberta.centro.map((v) => Math.round(v * 1e6) / 1e6)).toEqual([150, 80, -55]);
    expect(aberta.forma.rotacao).toEqual([0, 90, 0]);
    /* a distância do centro à dobradiça não muda em nenhum ângulo: é um giro, e não um deslocamento */
    for (const a of [15, 30, 45, 60, 75]) {
      const c = pose(a).centro;
      expect(Math.hypot(c[0] - 100, c[2] + 50)).toBeCloseTo(Math.hypot(5, 50), 6);
      expect(c[1]).toBe(80);
    }
  });

  it('o parâmetro em zero não gira nada, e a opção sai sem `giros`', () => {
    expect(expandirEsboco(porta()).opcoes[0].giros).toBeUndefined();
    expect(expandirEsboco(aplicarPose(porta(), lerCurso(porta())[0], 40)).opcoes[0].giros).toEqual([{ formas: ['porta'], pivo: { ponto: [100, 80, -50] }, rotacao: [0, 40, 0] }]);
  });

  it('a varredura acha a travessia da porta no pilone nas posições em que ela existe, e só nelas', () => {
    const v = varrerCurso(porta());
    const a = achar(v, ['porta', 'pilone']);
    expect(valores(a)).toEqual([30, 45, 60]);
    expect(a.noInicio).toBe(false);
    expect(a.tipo).toBe('colisao');
    expect(v.cursos[0].achados).toHaveLength(1);
    expect(Math.max(...a.posicoes.map((p) => p.mm))).toBeCloseTo(27.8, 1);
    expect(formatarCurso(v).texto).toContain('posições sem achado novo: 0, 15, 75, 90');
  });

  it('a imagem do achado desenha a porta girada: o giro vai junto e o ponto do zoom cai onde a porta cruza o pilone', () => {
    const e = aplicarPose(porta(), lerCurso(porta())[0], 45);
    const im = imagemDoAchado(e, { opcao: 'P', pecas: ['porta', 'pilone'] });
    expect(im.esboco.opcoes[0].giros).toEqual([{ formas: ['porta'], pivo: { ponto: [100, 80, -50] }, rotacao: [0, 45, 0] }]);
    expect(im.ponto[0]).toBeGreaterThan(150);
    expect(im.ponto[0]).toBeLessThan(200);
    /* e a pose da imagem é a do gate: a mesma porta, nas mesmas coordenadas */
    const noDesenho = resolverOpcao(im.esboco.opcoes[0], 'opção 1', im.esboco.pontos).find((r) => r.id === 'porta');
    const noGate = resolverOpcao(expandirEsboco(e).opcoes[0]).find((r) => r.id === 'porta');
    expect(noDesenho.centro).toEqual(noGate.centro);
  });

  it('o sinal inverte o sentido: a porta aberta para o lado do corpo bate nele', () => {
    const e = porta();
    e.curso.abre.gira.sinal = -1;
    const v = varrerCurso(e);
    expect(achar(v, ['porta', 'corpo'])).toBeDefined();
    expect(achar(v, ['porta', 'pilone'])).toBeUndefined();
  });

  it('o pivô pode ser um ponto nomeado ou a âncora de uma forma, lido na pose de repouso', () => {
    const nomeado = porta();
    nomeado.pontos = { dobradica: [100, 80, -50] };
    nomeado.curso.abre.gira.centro = 'dobradica';
    expect(valores(achar(varrerCurso(nomeado), ['porta', 'pilone']))).toEqual([30, 45, 60]);
    /* a âncora -z da própria porta, na pose de repouso, é (105, 80, -50): 5 mm de diferença no pivô muda a pose */
    const ancora = porta();
    ancora.curso.abre.gira.centro = 'porta.-z';
    const aberta = resolverOpcao(expandirEsboco(aplicarPose(ancora, lerCurso(ancora)[0], 90)).opcoes[0]).find((r) => r.id === 'porta');
    expect(aberta.centro.map((x) => Math.round(x * 1e6) / 1e6)).toEqual([155, 80, -50]);
  });

  it('as formas da lista podem ser uma instância ou um padrão', () => {
    const e = porta();
    e.opcoes[0].formas.push(caixa('porta.macaneta', 112, 80, 40, 6, 10, 10));
    e.curso.abre.formas = ['porta*'];
    const x = expandirEsboco(aplicarPose(e, lerCurso(e)[0], 30));
    expect(x.opcoes[0].giros[0].formas).toEqual(['porta', 'porta.macaneta']);
  });
});

describe('a unidade que o curso move', () => {
  it('o curso pertence à unidade cujas formas se movem nele', () => {
    const [c] = lerCurso(trem());
    expect([...formasQueSeMovem(trem(), c)].sort()).toEqual(['perna', 'roda']);
    const unidades = cursosDaUnidade(trem(), ['mancal', 'perna', 'roda']);
    expect(unidades.map((u) => u.curso.nome)).toEqual(['recolhe']);
    expect(unidades[0].formas.sort()).toEqual(['perna', 'roda']);
    expect(cursosDaUnidade(trem(), ['corpo', 'parede'])).toEqual([]);
    expect(cursosDaUnidade(porta(), ['porta']).map((u) => u.curso.nome)).toEqual(['abre']);
  });

  it('o quadro das poses é a caixa que une a unidade em todas as posições, em 8 cantos', () => {
    const [c] = lerCurso(trem());
    const membros = ['mancal', 'perna', 'roda'];
    const quadro = quadroDoCurso(trem(), c, membros, posicoesDoCurso(c));
    expect(quadro).toHaveLength(8);
    const min = [0, 1, 2].map((i) => Math.min(...quadro.map((p) => p[i])));
    const max = [0, 1, 2].map((i) => Math.max(...quadro.map((p) => p[i])));
    for (const valor of posicoesDoCurso(c)) {
      const e = expandirEsboco(aplicarPose(trem(), c, valor));
      for (const r of resolverOpcao(e.opcoes[0]).filter((q) => membros.includes(q.id))) {
        for (let i = 0; i < 3; i++) {
          expect(r.min[i]).toBeGreaterThanOrEqual(min[i] - 1e-6);
          expect(r.max[i]).toBeLessThanOrEqual(max[i] + 1e-6);
        }
      }
    }
    /* e é justa: a roda a 90 graus, em z -150 com raio 60, define o recuo; a roda a 0, em y 35, o fundo */
    expect(min[2]).toBeCloseTo(-210, 6);
    expect(min[1]).toBeCloseTo(185 - 150 - 60, 6);
  });
});

describe('o Portão: a unidade só vira feita sem achado em nenhuma posição do curso', () => {
  /* o esboço no estágio Detalhe por unidade, com as medidas tiradas das próprias formas */
  const naDetalhe = (e) => {
    const medidas = ['alturaTotal', 'larguraTotal', 'profundidadeTotal', 'alturaTotal', 'larguraTotal'].map((mede, k) => ({ nome: `m${k}`, valor: 0, unidade: 'mm', origem: 'ficha', tolerancia: 1, mede }));
    const rs = resolverOpcao(expandirEsboco(e).opcoes[0]);
    const caixaTotal = [0, 1, 2].map((i) => Math.max(...rs.map((r) => r.max[i])) - Math.min(...rs.map((r) => r.min[i])));
    const valorDe = { alturaTotal: caixaTotal[1], larguraTotal: caixaTotal[0], profundidadeTotal: caixaTotal[2] };
    const comPlano = { ...e, unidades: { trem: { funcao: 'perna, roda e mancal do trem que recolhe para trás' } }, plano: { nivel: 'detalhado', medidas: medidas.map((m) => ({ ...m, valor: Math.round(valorDe[m.mede] * 100) / 100 })), contrato: { tocam: [['corpo', 'parede']] } } };
    let s = criarEstado(comPlano, 'x.esboco.json');
    for (let i = 0; i < 3; i++) { const r = avancar(comPlano, s); expect(r.ok, JSON.stringify(r.portao?.falta ?? r.bloqueio)).toBe(true); s = r.estado; }
    expect(s.atual).toBe('detalhe-por-unidade');
    return { e: comPlano, estado: s };
  };

  it('os achados do curso na unidade vêm com o mecanismo e as posições em que aparecem', () => {
    const achados = achadosDoCursoNaUnidade(trem(), ['mancal', 'perna', 'roda']);
    expect(achados.map((a) => [a.pecas.slice().sort().join('+'), a.posicoes])).toEqual([['parede+roda', [60, 75, 90]], ['corpo+roda', [75, 90]]]);
    expect(achados[0].curso).toBe('recolhe');
    expect(achadosDoCursoNaUnidade(trem(), ['corpo']).map((a) => a.pecas.sort().join('+'))).toEqual(['corpo+roda']);
    expect(achadosDoCursoNaUnidade({ ...trem(), curso: undefined }, ['roda'])).toEqual([]);
  });

  it('--feito recusa a unidade do trem enquanto o curso atravessa a parede, e diz o curso e as posições', () => {
    const { e, estado } = naDetalhe(trem());
    expect(() => marcarFeito(e, estado, 'trem')).toThrow(ErroDeEsboco);
    expect(() => marcarFeito(e, estado, 'trem')).toThrow(/tem 2 achados abertos do gate de contato no mestre e não vira feita assim \(\[T\] colisão: roda e parede se penetram 14,9 mm \(no curso "recolhe", com angTrem em 60, 75, 90\); \[T\] colisão: corpo e roda se penetram 6,2 mm \(no curso "recolhe", com angTrem em 75, 90\)\)/);
  });

  it('sem o curso a mesma unidade passa (só a pose estendida era conferida)', () => {
    const sem = trem();
    delete sem.curso;
    const { e, estado } = naDetalhe(sem);
    const r = marcarFeito(e, estado, 'trem');
    expect(r.estado.unidades.find((u) => u.id === 'trem').feito).toBe(true);
  });

  it('o curso que acaba antes da travessia deixa a unidade passar: o fim do curso é o que decide', () => {
    const { e, estado } = naDetalhe(trem({ curso: { recolhe: { parametro: 'angTrem', de: 0, ate: 45, passos: 3 } } }));
    expect(marcarFeito(e, estado, 'trem').estado.unidades.find((u) => u.id === 'trem').feito).toBe(true);
  });
});
