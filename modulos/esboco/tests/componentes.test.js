/* Componentes parametrizados (`usa`): expansão com ids prefixados, parâmetros no escopo do componente, entradas,
   âncoras expostas, pares do gate, espelho de instância, `--ajustar` e a moto de prova sem centro calculado à mão. */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { ancorasDe, desenharEsboco, ErroDeEsboco, resolverOpcao } from '../src/index.js';
import { expandirEsboco } from '../src/expandir.js';
import { NOMES_DOS_COMPONENTES } from '../src/componentes.js';
import { COMPONENTES } from '../componentes/index.js';
import { verificarContato } from '../src/contato.js';
import { descreverEsboco, formatarDescricao } from '../src/descrever.js';
import { ajustarEsboco, aplicarDeslocamento } from '../src/ajustar.js';
import { criarConserto } from '../src/conserto.js';

const pasta = new URL('./fixtures/', import.meta.url);
const fixture = (nome) => JSON.parse(readFileSync(new URL(nome, pasta), 'utf8'));
const perto = (v, esperado, casas = 6) => { expect(v).toHaveLength(esperado.length); v.forEach((x, i) => expect(x).toBeCloseTo(esperado[i], casas)); };
const caixa = (id, centro, l = 20, a = 20, p = 20, extra = {}) => ({ id, tipo: 'caixa', largura: l, altura: a, profundidade: p, centro, ...extra });
const esboco = (formas, extra = {}) => ({ opcoes: [{ titulo: 'T', formas }], contato: { usar: true }, ...extra });
const expandir = (formas, extra = {}) => expandirEsboco(esboco(formas, extra)).opcoes[0];
const resolvidas = (formas, extra = {}) => Object.fromEntries(resolverOpcao(expandir(formas, extra), 'T').map((r) => [r.id, r]));
const recusa = (formas, trecho, extra = {}) => {
  expect(() => expandirEsboco(esboco(formas, extra))).toThrow(ErroDeEsboco);
  expect(() => expandirEsboco(esboco(formas, extra))).toThrow(trecho);
};
const extensao = (r) => r.max.map((v, i) => v - r.min[i]);

describe('a biblioteca', () => {
  it('tem roda, garfo, quadro e mancal, cada um com principal, parâmetros e formas que existem', () => {
    expect(NOMES_DOS_COMPONENTES).toEqual(['roda', 'garfo', 'quadro', 'mancal']);
    for (const [nome, c] of Object.entries(COMPONENTES)) {
      expect(c.componente).toBe(nome);
      const ids = c.formas.map((f) => f.id);
      expect(ids).toContain(c.principal);
      expect(new Set(ids).size).toBe(ids.length);
      for (const alvo of Object.values(c.ancoras ?? {})) expect(ids).toContain(alvo.slice(0, alvo.indexOf('.')));
      for (const p of c.pares ?? []) { expect(ids).toContain(p.a); expect(ids).toContain(p.b); }
    }
  });

  it.each([
    ['roda', { centro: [0, 300, 0] }],
    ['garfo', { de: [0, 0, 0], para: [0, 500, 200] }],
    ['quadro', { centro: [0, 300, 0] }],
    ['mancal', { centro: [0, 10, 0] }],
  ])('%s sozinho expande com ids prefixados, resolve e passa no gate com os próprios pares', (nome, entradas) => {
    const e = esboco([{ id: 'x', usa: nome, ...entradas }]);
    const [o] = expandirEsboco(e).opcoes;
    expect(o.formas.every((f) => f.id.startsWith('x.') && f.daInstancia.id === 'x')).toBe(true);
    expect(o.formas.filter((f) => f.daInstancia.principal).map((f) => f.id)).toEqual([`x.${COMPONENTES[nome].principal}`]);
    const g = verificarContato(e);
    expect(g.achados).toEqual([]);
    expect(g.resultado).toBe('aprovado');
    expect(desenharEsboco(e).svg).toContain('<path');
  });
});

describe('roda', () => {
  it('o pneu é um anel em x, o disco preenche o aro e os cubos ficam nas faces do disco', () => {
    const r = resolvidas([{ id: 'r', usa: 'roda', centro: [0, 305, 700], parametros: { diametro: 610, largura: 125 } }]);
    perto(r['r.pneu'].centro, [0, 305, 700]);
    expect(extensao(r['r.pneu'])).toEqual([125, 610, 610]);
    expect(extensao(r['r.disco'])[1]).toBeCloseTo(420, 6);
    expect(r['r.cuboE'].max[0]).toBeCloseTo(r['r.disco'].min[0], 6);
    expect(r['r.cuboD'].min[0]).toBeCloseTo(r['r.disco'].max[0], 6);
    perto(ancorasDe(r['r.pneu']).centro, [0, 305, 700]);
  });

  it('os parâmetros da instância valem no escopo do componente, e as expressões, no do esboço', () => {
    const r = resolvidas([{ id: 'r', usa: 'roda', centro: [0, '=raio', 0], parametros: { diametro: '=2*raio', aro: '=raio', largura: 100 } }], { parametros: { raio: 300 } });
    expect(extensao(r['r.pneu'])).toEqual([100, 600, 600]);
    expect(extensao(r['r.disco'])[1]).toBeCloseTo(300, 6);
    /* `espessuraDisco` é do componente: "=largura/3" enxerga o `largura` do componente, não um parâmetro do esboço */
    const s = resolvidas([{ id: 'r', usa: 'roda', centro: [0, 0, 0], parametros: { largura: 90 } }], { parametros: { largura: 999 } });
    expect(extensao(s['r.disco'])[0]).toBeCloseTo(30, 6);
  });

  it('as âncoras da instância valem em qualquer referência de fora: centro, de, para, alinha, caminho e entre', () => {
    const r = resolvidas([
      { id: 'r', usa: 'roda', centro: [0, 305, 700] },
      { id: 'a', tipo: 'caixa', largura: 10, altura: 10, profundidade: 10, centro: 'r.topo' },
      { id: 'b', tipo: 'cilindro', diametro: 10, de: 'r.eixo', para: 'r.frente' },
      { id: 'c', tipo: 'caixa', largura: 10, altura: 10, profundidade: 10, centro: [0, 0, 0], alinha: { com: 'r.lateralD', eixos: ['x'] } },
      { id: 't', tipo: 'tubo', diametro: 6, caminho: ['r.fundo', { entre: ['r.fundo', 'r.topo'], t: 0.5 }] },
      { id: 'd', tipo: 'caixa', largura: 10, altura: 10, profundidade: 10, centro: 'r.pneu.centro' },
    ]);
    perto(r.a.centro, [0, 610, 700]);
    perto(ancorasDe(r.b).inicio, [0, 305, 700]);
    perto(ancorasDe(r.b).fim, [0, 305, 1005]);
    expect(r.c.centro[0]).toBeCloseTo(r['r.cuboD'].max[0], 6);
    perto(ancorasDe(r.t).fim, [0, 305, 700]);
    perto(r.d.centro, [0, 305, 700]);
  });

  it('o id da instância sozinho é a forma principal: sobre, ponta, encosta e alinha', () => {
    const r = resolvidas([
      { id: 'r', usa: 'roda', centro: [0, 305, 700] },
      caixa('a', undefined, 20, 20, 20, { sobre: 'r' }),
      caixa('b', undefined, 20, 20, 20, { ponta: { id: 'r', lado: '+x' } }),
      caixa('c', [0, 1000, 0], 20, 20, 20, { encosta: { referencia: 'r', direcao: '-y' }, alinha: { com: 'r', eixos: ['x', 'z'] } }),
    ]);
    expect(r.a.min[1]).toBeCloseTo(r['r.pneu'].max[1], 6);
    expect(r.b.min[0]).toBeCloseTo(r['r.pneu'].max[0], 6);
    perto([r.c.centro[0], r.c.centro[2]], [0, 700]);
  });
});

describe('garfo', () => {
  it('vai de `de` a `para`: perna, bengala e coroa no mesmo eixo, sem ângulo nem comprimento escritos', () => {
    const r = resolvidas([{ id: 'g', usa: 'garfo', de: [0, 0, 0], para: [0, 300, 400] }]);
    const a = ancorasDe(r['g.perna']);
    perto(a.inicio, [0, 0, 0]);
    perto(ancorasDe(r['g.coroa']).fim, [0, 300, 400]);
    /* o eixo do garfo é o do segmento (0,0,0) a (0,300,400), de 500 mm: perna, bengala e coroa somam 500 */
    const comp = (r0) => { const an = ancorasDe(r0); return Math.hypot(an.fim[0] - an.inicio[0], an.fim[1] - an.inicio[1], an.fim[2] - an.inicio[2]); };
    expect(comp(r['g.perna']) + comp(r['g.bengala']) + comp(r['g.coroa'])).toBeCloseTo(500, 6);
    expect(comp(r['g.perna'])).toBeCloseTo(200, 6);
    expect(comp(r['g.coroa'])).toBeCloseTo(50, 6);
    /* as pontas de cada peça coincidem com a da vizinha */
    perto(ancorasDe(r['g.perna']).fim, ancorasDe(r['g.bengala']).inicio);
    perto(ancorasDe(r['g.bengala']).fim, ancorasDe(r['g.coroa']).inicio);
  });

  it('`desloca` afasta as três partes juntas e as âncoras `eixo` e `topo` acompanham', () => {
    const r = resolvidas([{ id: 'g', usa: 'garfo', de: [0, 0, 0], para: [0, 300, 400], desloca: [-90, 0, 0] }, caixa('a', 'g.topo', 10, 10, 10)]);
    perto(ancorasDe(r['g.perna']).inicio, [-90, 0, 0]);
    perto(r.a.centro, [-90, 300, 400]);
    perto(ancorasDe(r['g.bengala']).centro, ancorasDe(r['g.bengala']).centro);
  });

  it('o ponto pode ser âncora de outra instância, e as duas entradas são obrigatórias', () => {
    const r = resolvidas([{ id: 'r', usa: 'roda', centro: [0, 300, 700] }, { id: 'q', usa: 'quadro', centro: [0, 600, 0] }, { id: 'g', usa: 'garfo', de: 'r.eixo', para: 'q.cabecote' }]);
    perto(ancorasDe(r['g.perna']).inicio, [0, 300, 700]);
    perto(ancorasDe(r['g.coroa']).fim, ancorasDe(r['q.coluna'])['+y']);
    recusa([{ id: 'g', usa: 'garfo', de: [0, 0, 0] }], /o componente "garfo" precisa da entrada "para" \(escreva "para" na instância\)/);
  });
});

describe('quadro e mancal', () => {
  it('o quadro pousa sobre outra forma e a coluna assenta na ponta da viga', () => {
    const r = resolvidas([caixa('motor', [0, 380, 0], 260, 300, 380), { id: 'q', usa: 'quadro', sobre: 'motor', parametros: { alturaColuna: 180 } }]);
    expect(r['q.viga'].min[1]).toBeCloseTo(r.motor.max[1], 6);
    expect(extensao(r['q.coluna'])[1]).toBe(180);
    expect(r['q.coluna'].min[1]).toBeCloseTo(r['q.viga'].max[1], 6);
    expect(r['q.coluna'].max[2]).toBeCloseTo(r['q.viga'].max[2] + 240, 6);
    perto(ancorasDe(r['q.coluna'])['+y'], [0, r['q.coluna'].max[1], r['q.coluna'].centro[2]]);
  });

  it('o mancal reproduz a base, o alojamento e o eixo da fixture mancal-eixo, com os pares dele', () => {
    const r = resolvidas([{ id: 'm', usa: 'mancal', centro: [0, 10, 0] }]);
    expect(extensao(r['m.base'])).toEqual([140, 20, 80]);
    expect(extensao(r['m.alojamento'])).toEqual([70, 70, 40]);
    expect(r['m.alojamento'].min[1]).toBeCloseTo(20, 6);
    perto(ancorasDe(r['m.eixo']).fim, [0, 55, 60]);
    const g = verificarContato(esboco([{ id: 'm', usa: 'mancal', centro: [0, 10, 0] }]));
    expect(g.resultado).toBe('aprovado');
    expect(g.atravessamentos).toEqual([]);
  });
});

describe('pares do gate', () => {
  it('os pares do componente entram com os ids prefixados e o esboço prevalece sobre eles', () => {
    const [o] = expandirEsboco(esboco([{ id: 'r', usa: 'roda', centro: [0, 300, 0] }])).opcoes;
    expect(o.contato.pares.map((p) => `${p.a}|${p.b}|${p.tipo}`)).toEqual(['r.pneu|r.disco|encosta', 'r.disco|r.cuboE|encosta', 'r.disco|r.cuboD|encosta']);
    const meu = esboco([{ id: 'r', usa: 'roda', centro: [0, 300, 0] }], { contato: { usar: true, pares: [{ a: 'r.disco', b: 'r.pneu', tipo: 'livre', motivo: 'o esboço declara o mesmo par por conta própria' }] } });
    const pares = expandirEsboco(meu).opcoes[0].contato.pares;
    expect(pares.filter((p) => [p.a, p.b].sort().join() === 'r.disco,r.pneu')).toHaveLength(0);
    expect(verificarContato(meu).silenciados.map((s) => `${s.a}|${s.b}`)).toEqual(['r.pneu|r.disco']);
  });

  it('o id da instância nos pares do gate vale pela forma principal', () => {
    const [o] = expandirEsboco({ contato: { usar: true, pares: [{ a: 'q', b: 'x', tipo: 'livre', motivo: 'só para conferir o alias no par' }] }, opcoes: [{ titulo: 'T', formas: [{ id: 'q', usa: 'quadro', centro: [0, 300, 0] }, caixa('x', [500, 0, 0])] }] }).opcoes;
    expect(o.formas.length).toBe(3);
    const raiz = expandirEsboco({ contato: { usar: true, pares: [{ a: 'q', b: 'x', tipo: 'livre', motivo: 'só para conferir o alias no par' }] }, opcoes: [{ titulo: 'T', formas: [{ id: 'q', usa: 'quadro', centro: [0, 300, 0] }, caixa('x', [500, 0, 0])] }] });
    expect(raiz.contato.pares[0]).toMatchObject({ a: 'q.viga', b: 'x' });
  });

  it('o par atravessa do mancal não reprova enquanto o eixo passa pelo furo e vira achado se o max é excedido', () => {
    const e = esboco([{ id: 'm', usa: 'mancal', centro: [0, 10, 0] }]);
    expect(verificarContato(e).resultado).toBe('aprovado');
    const largo = esboco([{ id: 'm', usa: 'mancal', centro: [0, 10, 0], parametros: { diametroEixo: 52 } }]);
    expect(verificarContato(largo).achados.map((a) => a.tipo)).toContain('atravessa-excedido');
  });
});

describe('espelho de instância', () => {
  const formas = [
    { id: 'gE', usa: 'garfo', de: [0, 0, 0], para: [0, 300, 400], desloca: [-90, 0, 0], rotulo: 'garfo', cor: 'azul' },
    { id: 'gD', espelha: { forma: 'gE', eixo: 'x' }, rotulo: 'garfo direito' },
  ];

  it('copia cada forma da fonte como espelho, na ordem, com o rótulo só na principal', () => {
    const [o] = expandirEsboco(esboco(formas)).opcoes;
    expect(o.formas.map((f) => f.id)).toEqual(['gE.perna', 'gE.bengala', 'gE.coroa', 'gD.perna', 'gD.bengala', 'gD.coroa']);
    expect(o.formas.slice(3).map((f) => f.espelha.forma)).toEqual(['gE.perna', 'gE.bengala', 'gE.coroa']);
    expect(o.formas.filter((f) => f.rotulo).map((f) => `${f.id}:${f.rotulo}`)).toEqual(['gE.bengala:garfo', 'gD.bengala:garfo direito']);
    expect(o.formas.every((f) => f.cor === 'azul')).toBe(true);
  });

  it('a cópia é o sólido refletido e as âncoras da instância espelhada seguem o mesmo nome', () => {
    const r = resolvidas([...formas, caixa('a', 'gD.topo', 10, 10, 10), caixa('b', 'gE.topo', 10, 10, 10)]);
    perto(r.a.centro, [90, 300, 400]);
    perto(r.b.centro, [-90, 300, 400]);
    perto(ancorasDe(r['gD.perna']).inicio, [90, 0, 0]);
  });

  it('o par do componente vale também na cópia, e uma declaração do esboço para a fonte é herdada', () => {
    const e = esboco([...formas, { id: 'guidao', tipo: 'cilindro', diametro: 26, comprimento: 400, eixo: 'x', centro: [0, 300, 400] }],
      { contato: { usar: true, pares: [{ a: 'guidao', b: 'gE.coroa', tipo: 'atravessa', max: 60, motivo: 'a presilha do guidão abraça a coroa' }] } });
    const g = verificarContato(e);
    expect(g.achados.filter((a) => a.tipo === 'colisao' || a.tipo === 'par-nao-encosta')).toEqual([]);
    expect(g.atravessamentos.map((t) => `${t.a}+${t.b}`).sort()).toEqual(['gD.coroa+guidao', 'gE.coroa+guidao']);
  });

  it('o espelho de instância só aceita id, espelha, cor, rótulo, oculto e opacidade, e depende de a fonte vir antes', () => {
    recusa([formas[0], { ...formas[1], desloca: [1, 0, 0] }], /o espelho de um componente só aceita .*retire "desloca"/);
    recusa([formas[1], formas[0]], /o espelho "gD" vem antes da instância "gE"; declare a instância primeiro/);
  });
});

describe('recusas', () => {
  it('componente inexistente lista os nomes, e id repetido ou misturado é recusado', () => {
    recusa([{ id: 'x', usa: 'helice' }], /o componente "helice" não existe \(componentes: roda, garfo, quadro, mancal\)/);
    recusa([{ id: 'x', usa: 'roda' }, { id: 'x', usa: 'roda' }], /o id "x" está repetido entre as instâncias/);
    recusa([{ id: 'x', usa: 'roda' }, caixa('x', [0, 0, 0])], /o id "x" é de uma instância de componente e de outra forma/);
    recusa([{ usa: 'roda' }], /uma instância de componente \("usa": "roda"\) precisa de "id"/);
  });

  it('parâmetro, campo, escolha e âncora inexistentes dizem o que é válido', () => {
    recusa([{ id: 'r', usa: 'roda', parametros: { raio: 3 } }], /o parâmetro "raio" não é do componente \(parâmetros: diametro, aro, largura, espessuraDisco, diametroCubo, salienciaCubo\)/);
    recusa([{ id: 'r', usa: 'roda', tipo: 'anel' }], /o campo "tipo" não é do componente \(campos: id, usa, parametros, cor, rotulo, oculto, opacidade, unidade, centro, sobre, alinha, encosta, desloca\)/);
    recusa([{ id: 'r', usa: 'roda' }, caixa('a', 'r.hélice')], /o componente "roda" \(instância "r"\) não tem a âncora "hélice" \(âncoras: eixo, topo, fundo, frente, tras, lateralE, lateralD, centro, inicio, fim,/);
    recusa([{ id: 'r', usa: 'roda', parametros: { diametro: '=2*naoExiste' } }], /o campo "parametros.diametro" com o valor "=2\*naoExiste" usa o parâmetro "naoExiste", que não existe/);
  });

  it('arranja não repete componente, e o esboço sem componente não muda', () => {
    recusa([{ id: 'r', usa: 'roda' }, { arranja: { forma: 'r', modo: 'linear', total: 2, passo: [0, 0, 100] } }], /"arranja" não repete um componente \("r"\); declare uma instância por cópia/);
    const semUso = esboco([caixa('a', [0, 0, 0])]);
    expect(JSON.stringify(expandirEsboco(semUso).opcoes[0])).not.toContain('daInstancia');
  });

  it('a expansão é idempotente: expandir o que já foi expandido não muda nada', () => {
    const e = fixture('moto-componentes.esboco.json');
    const uma = expandirEsboco(e);
    expect(expandirEsboco(uma)).toEqual(uma);
  });
});

describe('--descrever e --ajustar com componentes', () => {
  it('a leitura em texto marca a forma principal e as partes do componente', () => {
    const texto = formatarDescricao(descreverEsboco(esboco([{ id: 'r', usa: 'roda', centro: [0, 300, 0] }])));
    expect(texto).toContain('forma r.pneu: anel');
    expect(texto).toContain('relação: principal do componente r');
    expect(texto).toContain('forma r.disco: cilindro');
    expect(texto).toContain('parte do componente r');
  });

  it('a colisão com a forma principal do componente move a instância pelo `centro` e o gate aprova', () => {
    const e = esboco([{ id: 'q', usa: 'quadro', centro: [0, 200, 0] }, caixa('x', [0, 250, 0], 400, 400, 400)], { contato: { usar: true, tolerancia: 2, penetracao: 1, folga: 5000 } });
    expect(verificarContato(e).resultado).toBe('reprovado');
    const ajuste = ajustarEsboco(e);
    expect(ajuste.aprovado).toBe(true);
    const [q, x] = ajuste.esboco.opcoes[0].formas;
    expect(x.centro).toEqual([0, 250, 0]);
    expect(q.centro).not.toEqual([0, 200, 0]);
    expect(q.usa).toBe('quadro');
    expect(ajuste.rodadas[0].movidos[0]).toMatchObject({ forma: 'q.viga', fonte: 'q.viga', campo: 'centro' });
    expect(verificarContato(ajuste.esboco).resultado).toBe('aprovado');
  });

  it('uma parte que não é a principal não se move sozinha: a sugestão sai não aplicável e o gate escolhe quem pode', () => {
    const bruto = esboco([{ id: 'r', usa: 'roda', centro: [0, 300, 0] }, { id: 's', usa: 'roda', centro: [0, 300, 900] }]);
    const e = expandirEsboco(bruto);
    const formas = e.opcoes[0].formas;
    const conserto = criarConserto(formas, resolverOpcao(e.opcoes[0], 'T'));
    /* a parte contra a principal: quem se move é a principal */
    const par = conserto.par('r.cuboD', 's.pneu', [1, 0, 0], 5, 'teste');
    expect(par).toMatchObject({ forma: 's.pneu', aplicavel: true });
    /* uma forma que se move por definição, mas é parte: não aplicável, com o motivo */
    const parte = conserto.forma('r.cuboD', [1, 0, 0], 5, 'teste');
    expect(parte.aplicavel).toBe(false);
    expect(parte.texto).toContain('r.cuboD é parte do componente r e não se move sozinha: ajuste a instância');
    /* duas partes: ninguém se move */
    expect(conserto.par('r.cuboD', 's.cuboE', [1, 0, 0], 5, 'teste')).toMatchObject({ forma: null, aplicavel: false });
    expect(aplicarDeslocamento(bruto, 0, 'r.disco', [0, 1, 0])).toBeNull();
  });

  it('`aplicarDeslocamento` na forma principal edita `centro` numérico da instância ou soma no `desloca`', () => {
    const numerico = { opcoes: [{ formas: [{ id: 'q', usa: 'quadro', centro: [0, 200, 0] }] }] };
    expect(aplicarDeslocamento(numerico, 0, 'q.viga', [0, 5, 0])).toMatchObject({ campo: 'centro', depois: [0, 205, 0] });
    const expressao = { opcoes: [{ formas: [{ id: 'q', usa: 'quadro', centro: [0, '=a', 0] }] }] };
    expect(aplicarDeslocamento(expressao, 0, 'q.viga', [0, 5, 0])).toMatchObject({ campo: 'desloca', depois: [0, 5, 0] });
    expect(aplicarDeslocamento(numerico, 0, 'q.coluna', [0, 5, 0])).toBeNull();
  });
});

describe('a moto de prova com componentes', () => {
  const moto = fixture('moto-componentes.esboco.json');

  it('usa roda, garfo e quadro, sem rotação, sem ângulo e sem nenhum centro calculado à mão', () => {
    const texto = JSON.stringify(moto);
    expect(texto).not.toContain('"rotacao"');
    const usos = moto.formas.filter((f) => f.usa).map((f) => f.usa);
    expect(new Set(usos)).toEqual(new Set(['roda', 'garfo', 'quadro']));
    /* toda posição é um parâmetro, uma âncora ou uma relação: nenhum `centro` tem número que não seja 0 ou parâmetro */
    for (const f of moto.formas) {
      if (!Array.isArray(f.centro)) continue;
      for (const c of f.centro) expect(c === 0 || typeof c === 'string').toBe(true);
    }
    const garfo = moto.formas.find((f) => f.id === 'garfoE');
    expect(typeof garfo.de).toBe('string');
    expect(typeof garfo.para).toBe('string');
  });

  it('escreve menos números à mão que a moto com parâmetros e o gate aprova as duas opções', () => {
    const TEXTOS = new Set(['plano', 'nota', 'titulo', 'rotulo', 'motivo', 'id', 'tipo', 'cor', 'vista']);
    const literais = (v) => {
      if (typeof v === 'number') return 1;
      if (typeof v === 'string') return v.startsWith('=') ? (v.match(/(?<![A-Za-z_])\d+(\.\d+)?/g) ?? []).length : 0;
      if (Array.isArray(v)) return v.reduce((s, x) => s + literais(x), 0);
      if (v && typeof v === 'object') return Object.entries(v).reduce((s, [k, x]) => s + (TEXTOS.has(k) && typeof x === 'string' ? 0 : literais(x)), 0);
      return 0;
    };
    expect(literais(moto)).toBeLessThan(literais(fixture('moto-parametros.esboco.json')));
    expect(literais(moto)).toBeLessThanOrEqual(literais(fixture('moto.esboco.json')) / 2);
    const g = verificarContato(moto);
    expect(g.resultado).toBe('aprovado');
    expect(g.achados).toEqual([]);
    expect(g.atravessamentos.map((t) => `${t.opcao}:${t.a}+${t.b}`).sort()).toEqual([
      'A. Naked:garfoD.coroa+guidao', 'A. Naked:garfoE.coroa+guidao', 'B. Café racer:garfoD.coroa+guidao', 'B. Café racer:garfoE.coroa+guidao',
    ]);
  }, 60000);

  it('o café racer difere do naked só onde os parâmetros mandam: a coluna desce e o guidão estreita', () => {
    const e = expandirEsboco(moto);
    const [a, b] = e.opcoes.map((o) => Object.fromEntries(resolverOpcao(o, 'T').map((r) => [r.id, r])));
    expect(Object.keys(a)).toEqual(Object.keys(b));
    expect(extensao(a['quadro.coluna'])[1]).toBe(240);
    expect(extensao(b['quadro.coluna'])[1]).toBe(180);
    expect(extensao(a.guidao)[0]).toBe(760);
    expect(extensao(b.guidao)[0]).toBe(540);
    expect(a['rodaFrente.pneu'].centro).toEqual(b['rodaFrente.pneu'].centro);
    /* o garfo acompanha o cabeçote: o topo dele desce junto com a coluna */
    const topo = (o) => ancorasDe(o['garfoE.coroa']).fim;
    expect(topo(a)[1] - topo(b)[1]).toBeCloseTo(60, 6);
    /* os garfos direito e esquerdo são simétricos em x */
    perto(ancorasDe(a['garfoD.bengala']).centro, ancorasDe(a['garfoE.bengala']).centro.map((c, i) => (i === 0 ? -c : c)));
  });

  it('o desenho é o mesmo em duas chamadas', () => {
    const um = desenharEsboco(moto).svg;
    expect(um).toBe(desenharEsboco(moto).svg);
  }, 60000);
});
