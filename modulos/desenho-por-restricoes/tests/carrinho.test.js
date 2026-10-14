/* carrinho.test.js — o carrinho de mão resolve nos valores em que quatro resolvedores concordaram, os quatro cenários (completo,
   conflito, faltando, redundante) dizem o que o planegcs disse e mais, e o chute espelhado reprova com mensagem. */
import { describe, expect, it } from 'vitest';
import { desenhar } from '../src/index.js';
import { carrinho, carrinhoEmConflito, carrinhoFaltando, carrinhoRedundante, chuteEspelhado, VALORES_DO_CARRINHO } from './carrinho.js';

describe('o carrinho de mão completo', () => {
  it('resolve com zero grau de liberdade nos valores em que os quatro resolvedores concordaram', async () => {
    const { relatorio, contornos } = await desenhar(carrinho());
    expect(relatorio.estado).toBe('resolvido');
    expect(relatorio.grausDeLiberdade).toBe(0);
    expect(relatorio.conflitantes).toEqual([]);
    expect(relatorio.redundantes).toEqual([]);
    expect(relatorio.soltas).toBeNull();
    expect(relatorio.ladosTrocados).toEqual([]);
    for (const [nome, [h, v]] of Object.entries(VALORES_DO_CARRINHO)) {
      expect(relatorio.medidas.pontos[nome][0], `${nome}.h`).toBeCloseTo(h, 3);
      expect(relatorio.medidas.pontos[nome][1], `${nome}.v`).toBeCloseTo(v, 3);
    }
    expect(contornos).not.toBeNull();
  });

  it('devolve as medidas derivadas que a IA não escreveu: a altura do pé, a frente da caçamba e a vista inteira', async () => {
    const { relatorio, texto } = await desenhar(carrinho());
    const m = relatorio.medidas;
    expect(m.partes.pe.comprimentoMm).toBeCloseTo(515, 3);
    expect(m.partes.pe.anguloGraus).toBe(270);
    expect(m.pontos.E[0]).toBeCloseTo(-335.725, 3);
    expect(m.partes.roda.raioMm).toBe(200);
    expect(m.partes.braco.comprimentoMm).toBeCloseTo(1500, 3);
    expect(m.vista.alturaMm).toBe(900);
    expect(m.vista.hMin).toBeCloseTo(-335.725, 3);
    expect(texto).toMatch(/estado resolvido, 0 graus de liberdade/);
    expect(texto).toMatch(/medidas derivadas \(as que você não escreveu/);
    expect(texto).toMatch(/"pe": barra de 515 mm de comprimento a 270 graus/);
    expect(texto).toMatch(/"E" \(-335,7; 900\)/);
  });

  it('resolve igual quando as relações vêm em outra ordem e os campos em outra sequência', async () => {
    const a = await desenhar(carrinho());
    const d = carrinho();
    d.relacoes.reverse();
    const reordenada = { relacoes: d.relacoes, partes: Object.fromEntries(Object.entries(d.partes).reverse()), pontos: Object.fromEntries(Object.entries(d.pontos).reverse()), referencias: d.referencias, olhando: d.olhando, vista: d.vista, objeto: d.objeto, formato: d.formato };
    const b = await desenhar(reordenada);
    expect(b.relatorio.medidas).toEqual(a.relatorio.medidas);
    expect(JSON.stringify(b.contornos)).toBe(JSON.stringify({ ...a.contornos, origem: { ...a.contornos.origem, sha256: b.contornos.origem.sha256 } }));
  });
});

describe('os quatro cenários do carrinho', () => {
  it('conflito: nomeia as duas alturas do pegador, não grava e diz o que fazer', async () => {
    const { relatorio, texto, contornos, svg } = await desenhar(carrinhoEmConflito());
    expect(relatorio.estado).toBe('conflito');
    expect(relatorio.resolvido).toBe(false);
    expect(relatorio.conflitantes).toEqual(['altura do pegador', 'altura do pegador (de novo)']);
    expect(contornos).toBeNull();
    expect(svg).toBeNull();
    expect(texto).toMatch(/estado conflito\./);
    expect(texto).toMatch(/as relações "altura do pegador", "altura do pegador \(de novo\)" não cabem juntas/);
    expect(texto).toMatch(/não mexa nas coordenadas/);
    expect(texto).not.toMatch(/medidas derivadas/);
  });

  it('faltando: um grau de liberdade, e diz a caçamba, o ponto D na vertical e o E nos dois eixos', async () => {
    const { relatorio, texto, contornos } = await desenhar(carrinhoFaltando());
    expect(relatorio.estado).toBe('solto');
    expect(relatorio.grausDeLiberdade).toBe(1);
    expect(relatorio.soltas.partes).toEqual(['cacamba']);
    expect(relatorio.soltas.pontos).toEqual([{ nome: 'D', eixos: ['v'] }, { nome: 'E', eixos: ['h', 'v'] }]);
    expect(relatorio.soltas.raios).toEqual([]);
    expect(contornos).toBeNull();
    expect(texto).toMatch(/estado solto, 1 grau de liberdade: ainda se move a parte "cacamba"; soltos: "D" \(v\), "E" \(h e v\)/);
    expect(texto).toMatch(/pede uma relação a mais/);
  });

  it('redundante: resolve e avisa qual relação repete o que as outras já fixam', async () => {
    const { relatorio, texto, contornos } = await desenhar(carrinhoRedundante());
    expect(relatorio.estado).toBe('resolvido');
    expect(relatorio.grausDeLiberdade).toBe(0);
    expect(relatorio.conflitantes).toEqual([]);
    expect(relatorio.redundantes).toEqual(['folga do fundo (de novo)']);
    expect(relatorio.medidas.pontos.A[1]).toBeCloseTo(362.484, 3);
    expect(contornos).not.toBeNull();
    expect(texto).toMatch(/aviso: a relação "folga do fundo \(de novo\)" repete o que as outras já fixam/);
  });

  it('redundante em qualquer lugar da lista: o planegcs sozinho acusava conflito em parte das ordens, e o módulo separa a redundância do conflito', async () => {
    /* A ordem em que o planegcs recebe as restrições decide se ele chama a redundância de conflito. O módulo ordena por nome, e
       estes nomes põem a repetida antes das outras duas do grupo, onde o planegcs falha. */
    const d = carrinhoRedundante();
    d.relacoes.find((r) => r.nome === 'folga do fundo (de novo)').nome = 'a folga repetida';
    const { executar } = await import('../src/resolver.js');
    const { modeloDaDescricao } = await import('../src/index.js');
    const cru = await executar(modeloDaDescricao(d));
    expect(cru.nomeDoStatus).toBe('Failed');
    expect(cru.conflitantes.length).toBeGreaterThan(0);
    const { relatorio, contornos } = await desenhar(d);
    expect(relatorio.estado).toBe('resolvido');
    expect(relatorio.conflitantes).toEqual([]);
    expect(relatorio.redundantes).toHaveLength(1);
    expect(['a folga repetida', 'folga do fundo', 'fundo junto do braço']).toContain(relatorio.redundantes[0]);
    expect(contornos).not.toBeNull();
  });

  it('a repetida que o planegcs acha sozinho (a última da ordem) também é só aviso', async () => {
    const d = carrinhoRedundante();
    d.relacoes.find((r) => r.nome === 'folga do fundo (de novo)').nome = 'zz';
    const { relatorio } = await desenhar(d);
    expect(relatorio.estado).toBe('resolvido');
    expect(relatorio.redundantes).toEqual(['zz']);
  });

  it('o conflito de verdade continua conflito, mesmo com a relação duplicada no meio', async () => {
    const d = carrinhoEmConflito();
    d.relacoes.find((r) => r.nome === 'altura do pegador (de novo)').nome = 'a altura 700';
    const { relatorio } = await desenhar(d);
    expect(relatorio.estado).toBe('conflito');
    expect(relatorio.conflitantes).toEqual(['a altura 700', 'altura do pegador']);
  });
});

describe('o resolvedor não escreve na saída padrão', () => {
  it('nem na redundância, nem no conflito, nem na busca dos pontos soltos: o diagnóstico volta por dados', async () => {
    /* O C++ do planegcs escreve "Sketcher Redundant solving" com console.log no modo de depuração mínimo, que é o padrão, e o
       relatório de uma ferramenta de linha de comando sairia misturado com isso. */
    const escritas = [];
    const log = console.log; const escrever = process.stdout.write;
    console.log = (...a) => { escritas.push(a.join(' ')); };
    process.stdout.write = (t) => { escritas.push(String(t)); return true; };
    try {
      for (const f of [carrinhoRedundante, carrinhoEmConflito, carrinhoFaltando]) await desenhar(f());
    } finally {
      console.log = log; process.stdout.write = escrever;
    }
    expect(escritas).toEqual([]);
  });
});

describe('o chute espelhado', () => {
  it('é recusado como lado trocado, com a relação, o lado pedido, o lado em que ficou e o chute que resolve', async () => {
    const { relatorio, texto, contornos, svg } = await desenhar(chuteEspelhado());
    expect(relatorio.estado).toBe('lado trocado');
    expect(relatorio.resolvido).toBe(false);
    expect(contornos).toBeNull();
    expect(svg).toBeNull();
    expect(relatorio.ladosTrocados).toHaveLength(1);
    expect(relatorio.ladosTrocados[0]).toMatchObject({ relacao: 'folga do fundo', pedido: 'acima', ficou: 'abaixo' });
    expect(texto).toMatch(/estado lado trocado/);
    expect(texto).toMatch(/a relação "folga do fundo" pede o ponto "A" acima de "braco", e ele ficou abaixo/);
    expect(relatorio.sugestao.resolve).toBe(true);
    expect(Object.keys(relatorio.sugestao.pontos)).toEqual(['A']);
    expect(texto).toMatch(/Troque esse chute em "pontos"/);
  });

  it('o resolvedor sozinho devolvia sucesso, zero grau de liberdade e a frente da caçamba em -518', async () => {
    /* O que o planegcs faz com esse chute, sem a conferência do lado: o motivo de o lado existir. */
    const { executar } = await import('../src/resolver.js');
    const { modeloDaDescricao } = await import('../src/index.js');
    const x = await executar(modeloDaDescricao(chuteEspelhado()));
    expect(x.nomeDoStatus).toBe('Success');
    expect(x.dof).toBe(0);
    expect(x.pontos.E[0]).toBeCloseTo(-518.494, 2);
  });

  it('aplicado o chute sugerido, o desenho resolve nos mesmos valores do chute bom', async () => {
    const ruim = await desenhar(chuteEspelhado());
    const d = chuteEspelhado();
    for (const [nome, p] of Object.entries(ruim.relatorio.sugestao.pontos)) d.pontos[nome] = p;
    const { relatorio } = await desenhar(d);
    expect(relatorio.estado).toBe('resolvido');
    for (const [nome, [h, v]] of Object.entries(VALORES_DO_CARRINHO)) {
      expect(relatorio.medidas.pontos[nome][0]).toBeCloseTo(h, 3);
      expect(relatorio.medidas.pontos[nome][1]).toBeCloseTo(v, 3);
    }
  });

  it('a roda declarada acima do chão e chutada abaixo dele também reprova', async () => {
    const d = carrinho();
    d.pontos.C = [0, -150];
    const { relatorio, texto } = await desenhar(d);
    expect(relatorio.estado).toBe('lado trocado');
    expect(relatorio.ladosTrocados.map((t) => t.relacao)).toContain('roda no chão');
    expect(texto).toMatch(/pede o círculo "roda" acima de "chao", e ele ficou abaixo/);
  });

  it('o lado declarado errado também é lido: trocar "acima" por "abaixo" na folga do fundo reprova o chute bom', async () => {
    const d = carrinho();
    d.relacoes.find((r) => r.nome === 'folga do fundo').lado = 'abaixo';
    const { relatorio } = await desenhar(d);
    expect(relatorio.estado).toBe('lado trocado');
    expect(relatorio.ladosTrocados[0]).toMatchObject({ relacao: 'folga do fundo', pedido: 'abaixo', ficou: 'acima' });
  });
});
