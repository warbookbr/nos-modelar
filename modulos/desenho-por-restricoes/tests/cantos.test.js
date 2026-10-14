/* cantos.test.js — o canto arredondado (`raioDoCanto` do polígono e da barra): o arco sai tangente às duas arestas e com o raio dado,
   a cápsula é uma barra com a metade da espessura de raio, os desenhos gravados em @1 seguem válidos e dão o mesmo resultado,
   e o raio que não cabe na aresta é recusado dizendo qual aresta e quanto ela mede. Tudo medido sobre os anéis gravados. */
import { describe, expect, it } from 'vitest';
import { desenhar, validarDescricao, ErroDeDesenho } from '../src/index.js';
import { carrinho } from './carrinho.js';
import { chapa, placaArredondada } from './formas.js';

const area = (a) => Math.abs(a.reduce((s, [h, v], i) => s + h * a[(i + 1) % a.length][1] - a[(i + 1) % a.length][0] * v, 0) / 2);
const dist = (p, c) => Math.hypot(p[0] - c[0], p[1] - c[1]);
const erros = (d) => validarDescricao(d).erros;
const com = (mudar, base = placaArredondada) => { const d = base(); mudar(d); return d; };

describe('canto arredondado do polígono', () => {
  it('traça um arco de raio 10 tangente às duas arestas em cada canto: pontos a 10 mm do centro, tangentes em (10, 0) e (0, 10), área do retângulo menos (4 - π) r²', async () => {
    const { contornos, relatorio } = await desenhar(placaArredondada());
    expect(relatorio.estado).toBe('resolvido');
    const anel = contornos.regioes.placa.contornoMm;
    const centros = [[10, 10], [190, 10], [190, 90], [10, 90]];
    const nosCantos = anel.filter(([h, v]) => (h < 10 || h > 190) && (v < 10 || v > 90));
    expect(nosCantos.length).toBeGreaterThanOrEqual(4 * 15);
    for (const p of nosCantos) expect(Math.min(...centros.map((c) => dist(p, c))), `${p}`).toBeCloseTo(10, 2);
    for (const t of [[10, 0], [0, 10], [190, 0], [200, 10], [200, 90], [190, 100], [10, 100], [0, 90]]) expect(anel.some((p) => dist(p, t) < 0.002), `tangente ${t}`).toBe(true);
    expect(anel.some((p) => dist(p, [0, 0]) < 4)).toBe(false);
    expect(Math.abs(area(anel) - (20000 - (4 - Math.PI) * 100))).toBeLessThan(1);
    expect(relatorio.medidas.partes.placa).toMatchObject({ larguraMm: 200, alturaMm: 100, cantos: [{ ponto: 'A', raioMm: 10 }, { ponto: 'B', raioMm: 10 }, { ponto: 'C', raioMm: 10 }, { ponto: 'D', raioMm: 10 }] });
    expect(relatorio.medidas.partes.placa.lados[0]).toMatchObject({ de: 'A', ate: 'B', comprimentoMm: 200 });
  });

  it('o raio acompanha as relações: com a placa de 300 por 100 o arco continua de raio 10 e tangente', async () => {
    const d = com((x) => { x.relacoes.find((r) => r.nome === 'largura').mm = 300; });
    const { contornos } = await desenhar(d);
    const anel = contornos.regioes.placa.contornoMm;
    for (const t of [[10, 0], [290, 0], [300, 10], [300, 90]]) expect(anel.some((p) => dist(p, t) < 0.002), `tangente ${t}`).toBe(true);
    expect(Math.abs(area(anel) - (30000 - (4 - Math.PI) * 100))).toBeLessThan(1);
  });

  it('um raio por ponto arredonda só os cantos citados', async () => {
    const { contornos, relatorio } = await desenhar(com((x) => { x.partes.placa.raioDoCanto = { A: 10, C: 20 }; }));
    const anel = contornos.regioes.placa.contornoMm;
    expect(anel.some((p) => dist(p, [200, 0]) < 0.002)).toBe(true);
    expect(anel.some((p) => dist(p, [0, 100]) < 0.002)).toBe(true);
    expect(anel.some((p) => dist(p, [0, 0]) < 4)).toBe(false);
    expect(anel.some((p) => dist(p, [200, 100]) < 8)).toBe(false);
    expect(relatorio.medidas.partes.placa.cantos).toEqual([{ ponto: 'A', raioMm: 10 }, { ponto: 'C', raioMm: 20 }]);
    /* Cada canto retira (1 - π/4) r²: r = 10 em A e r = 20 em C. */
    expect(Math.abs(area(anel) - (20000 - (1 - Math.PI / 4) * (100 + 400)))).toBeLessThan(1);
  });

  it('o canto de um polígono que não é retângulo e o canto reentrante também ficam tangentes às duas arestas', async () => {
    const d = {
      formato: 'mecanifica.desenho@2', objeto: 'cantoneira', vista: 'frontal',
      referencias: { chao: { reta: 'horizontal', v: 0 }, parede: { reta: 'vertical', h: 0 } },
      pontos: { A: [2, 1], B: [98, 3], C: [101, 42], D: [41, 38], E: [43, 99], F: [-2, 101] },
      partes: { L: { poligono: ['A', 'B', 'C', 'D', 'E', 'F'], raioDoCanto: { D: 5, B: 8 } } },
      relacoes: [
        { nome: 'A no chão', sobre: ['A', 'chao'] }, { nome: 'A na parede', sobre: ['A', 'parede'] },
        { nome: 'B de nível', horizontal: ['A', 'B'] }, { nome: 'base', distancia: ['A', 'B'], mm: 100 },
        { nome: 'C a prumo', vertical: ['B', 'C'] }, { nome: 'braço baixo', distancia: ['B', 'C'], mm: 40 },
        { nome: 'D de nível', horizontal: ['C', 'D'] }, { nome: 'espessura', distancia: ['C', 'D'], mm: 60 },
        { nome: 'E a prumo', vertical: ['D', 'E'] }, { nome: 'altura', distancia: ['A', 'F'], mm: 100 },
        { nome: 'F na parede', sobre: ['F', 'parede'] }, { nome: 'topo de nível', horizontal: ['E', 'F'] },
        { nome: 'E a 100', distancia: ['E', 'chao'], mm: 100, lado: 'acima' },
      ],
    };
    const { contornos, relatorio } = await desenhar(d);
    expect(relatorio.estado).toBe('resolvido');
    const anel = contornos.regioes.L.contornoMm;
    /* O canto reentrante D (40; 40), com raio 5: o centro do arco fica fora do material, em (45; 45), e as tangentes em (40; 45) e (45; 40). */
    for (const t of [[40, 45], [45, 40], [92, 0], [100, 8]]) expect(anel.some((p) => dist(p, t) < 0.002), `tangente ${t}`).toBe(true);
    const noArcoDeD = anel.filter((p) => p[0] > 40.001 && p[0] < 44.999 && p[1] > 40.001 && p[1] < 44.999);
    expect(noArcoDeD.length).toBeGreaterThan(10);
    for (const p of noArcoDeD) expect(dist(p, [45, 45]), `${p}`).toBeCloseTo(5, 2);
  });
});

describe('cápsula: barra com a metade da espessura de raio', () => {
  it('as pontas são semicírculos de raio 20 e a caixa continua 120 por 40', async () => {
    const { contornos, relatorio, texto } = await desenhar(placaArredondada());
    const anel = contornos.regioes.capsula.contornoMm;
    const [P, Q] = [relatorio.medidas.pontos.P, relatorio.medidas.pontos.Q];
    expect(relatorio.medidas.partes.capsula).toMatchObject({ larguraMm: 120, alturaMm: 40, raioDoCantoMm: 20 });
    const centros = [[P[0] + 20, P[1]], [Q[0] - 20, Q[1]]];
    for (const p of anel) {
      const naReta = Math.abs(Math.abs(p[1] - P[1]) - 20) < 0.002 && p[0] >= centros[0][0] - 0.002 && p[0] <= centros[1][0] + 0.002;
      const naPonta = centros.some((c) => Math.abs(dist(p, c) - 20) < 0.002);
      expect(naReta || naPonta, `${p}`).toBe(true);
    }
    expect(Math.abs(area(anel) - (120 * 40 - (4 - Math.PI) * 400))).toBeLessThan(3);
    expect(anel.some((p) => dist(p, [P[0], P[1]]) < 0.002)).toBe(true);
    expect(texto).toMatch(/"capsula": barra de 120 mm de comprimento a 0 graus, 40 mm de espessura, cantos arredondados de raio 20 mm \(pontas semicirculares\)/);
    expect(texto).toMatch(/cantos arredondados: A raio 10 mm, B raio 10 mm, C raio 10 mm, D raio 10 mm/);
  });

  it('a barra inclinada também: a cápsula gira com o eixo', async () => {
    const d = com((x) => {
      x.relacoes = x.relacoes.filter((r) => r.nome !== 'cápsula de nível');
      x.relacoes.push({ nome: 'cápsula a 30 graus', angulo: ['chao', ['P', 'Q']], graus: 30 });
      x.pontos.Q = [140, 190];
    });
    const { contornos, relatorio } = await desenhar(d);
    expect(relatorio.estado).toBe('resolvido');
    const [P, Q] = [relatorio.medidas.pontos.P, relatorio.medidas.pontos.Q];
    const u = [(Q[0] - P[0]) / 120, (Q[1] - P[1]) / 120];
    const centros = [[P[0] + 20 * u[0], P[1] + 20 * u[1]], [Q[0] - 20 * u[0], Q[1] - 20 * u[1]]];
    const dentroDaPonta = contornos.regioes.capsula.contornoMm.filter((p) => {
      const t = (p[0] - P[0]) * u[0] + (p[1] - P[1]) * u[1];
      return t < 19.99 || t > 100.01;
    });
    expect(dentroDaPonta.length).toBeGreaterThan(20);
    for (const p of dentroDaPonta) expect(Math.min(...centros.map((c) => dist(p, c))), `${p}`).toBeCloseTo(20, 2);
  });
});

describe('formato: versão, validação e o que já estava gravado', () => {
  it('uma descrição em @1 sem raioDoCanto segue válida e dá o mesmo contorno, o mesmo relatório e o mesmo SVG que em @2', async () => {
    const velho = carrinho(); velho.formato = 'mecanifica.desenho@1';
    expect(erros(velho)).toEqual([]);
    const a = await desenhar(velho, { origem: { desenho: 'x', sha256: 'y' } });
    const b = await desenhar(carrinho(), { origem: { desenho: 'x', sha256: 'y' } });
    expect(JSON.stringify(a.contornos)).toBe(JSON.stringify(b.contornos));
    expect(a.texto).toBe(b.texto);
    expect(a.svg).toBe(b.svg);
    const chapaVelha = chapa(); chapaVelha.formato = 'mecanifica.desenho@1';
    expect(erros(chapaVelha)).toEqual([]);
  });

  it('raioDoCanto em @1 é recusado dizendo para trocar o formato', () => {
    const e = erros(com((x) => { x.formato = 'mecanifica.desenho@1'; }));
    expect(e).toHaveLength(2);
    expect(e[0]).toMatch(/a parte "capsula" declara "raioDoCanto", que existe a partir de "mecanifica.desenho@2"; troque o "formato"/);
  });

  it('recusa o raio negativo, o ponto que não é do polígono, o objeto vazio, o canto vivo com centro nomeado, a barra além da metade da espessura e o círculo', () => {
    expect(erros(com((x) => { x.partes.placa.raioDoCanto = -3; }))[0]).toMatch(/"raioDoCanto" do polígono "placa" deve ser um número em milímetro, zero ou maior \(zero é canto vivo\).*"<ponto do polígono>"/);
    expect(erros(com((x) => { x.partes.capsula.raioDoCanto = -1; }))[0]).toMatch(/"raioDoCanto" da barra "capsula" deve ser um número em milímetro, zero ou maior \(zero é canto vivo\), e veio -1/);
    expect(erros(com((x) => { x.partes.placa.raioDoCanto = { A: { raio: 0, centro: 'CA' } }; }))[0]).toMatch(/do polígono "placa".*o canto com centro nomeado tem raio maior que zero/);
    expect(erros(com((x) => { x.partes.placa.raioDoCanto = { Z: 5 }; }))[0]).toMatch(/do polígono "placa".*e veio \{"Z":5\}/);
    expect(erros(com((x) => { x.partes.placa.raioDoCanto = {}; }))[0]).toMatch(/do polígono "placa"/);
    expect(erros(com((x) => { x.partes.capsula.raioDoCanto = 21; }))[0]).toMatch(/"raioDoCanto" 21 da barra "capsula" passa da metade da espessura \(20 mm\).*cápsula/);
    expect(erros(com((x) => { x.partes.capsula.raioDoCanto = { P: 5 }; }))[0]).toMatch(/da barra "capsula" deve ser um número/);
    const circulo = erros(com((x) => { x.partes.roda = { circulo: { centro: 'P' }, raioDoCanto: 5 }; x.relacoes.push({ nome: 'raio da roda', raio: 'roda', mm: 5 }); }));
    expect(circulo[0]).toMatch(/a parte "roda" declara "raioDoCanto", que só vale para "barra" e "poligono"/);
  });

  it('o raio zero é o canto vivo: no polígono inteiro, só em alguns cantos e na barra, o contorno sai igual ao de quem não declara o raio', async () => {
    const semRaio = (x) => { delete x.partes.placa.raioDoCanto; delete x.partes.capsula.raioDoCanto; };
    const vivo = await desenhar(com(semRaio), { origem: { desenho: 'x', sha256: 'y' } });
    expect(vivo.relatorio.estado).toBe('resolvido');
    const zero = await desenhar(com((x) => { x.partes.placa.raioDoCanto = 0; x.partes.capsula.raioDoCanto = 0; }), { origem: { desenho: 'x', sha256: 'y' } });
    expect(erros(com((x) => { x.partes.placa.raioDoCanto = 0; x.partes.capsula.raioDoCanto = 0; }))).toEqual([]);
    expect(JSON.stringify(zero.contornos)).toBe(JSON.stringify(vivo.contornos));
    expect(zero.svg).toBe(vivo.svg);
    expect(zero.relatorio.medidas.partes.placa.cantos).toBeUndefined();
    expect(zero.texto).not.toMatch(/antes de arredondar/);
    expect(zero.relatorio.medidas.partes.placa.lados).toHaveLength(4);
    expect(zero.relatorio.medidas.partes.capsula.raioDoCantoMm).toBeUndefined();
    /* o canto vivo tem o vértice no lugar */
    expect(zero.contornos.regioes.placa.contornoMm).toContainEqual([0, 0]);
    expect(zero.contornos.regioes.placa.contornoMm).toContainEqual([200, 100]);
    expect(Math.abs(area(zero.contornos.regioes.placa.contornoMm) - 20000)).toBeLessThan(1e-6);

    /* só os cantos citados com raio, os outros em zero */
    const origem = { desenho: 'x', sha256: 'y' };
    const misto = await desenhar(com((x) => { x.partes.placa.raioDoCanto = { A: 0, B: 10, C: 0, D: 10 }; }), { origem });
    const so = await desenhar(com((x) => { x.partes.placa.raioDoCanto = { B: 10, D: 10 }; }), { origem });
    expect(JSON.stringify(misto.contornos)).toBe(JSON.stringify(so.contornos));
    expect(misto.relatorio.medidas.partes.placa.cantos).toEqual([{ ponto: 'B', raioMm: 10 }, { ponto: 'D', raioMm: 10 }]);
  });

  it('o raio de canto de um parâmetro vale zero no uso e arredonda no outro: a mesma descrição com "raioDoCanto": "canto" nos dois valores', async () => {
    const com3 = (canto) => com((x) => {
      x.formato = 'mecanifica.desenho@3'; x.parametros = { canto };
      x.partes.placa.raioDoCanto = 'canto';
    });
    const vivo = await desenhar(com3(0));
    const redondo = await desenhar(com3(10));
    expect(vivo.relatorio.estado).toBe('resolvido');
    expect(vivo.relatorio.medidas.partes.placa.cantos).toBeUndefined();
    expect(redondo.relatorio.medidas.partes.placa.cantos).toHaveLength(4);
    expect(vivo.contornos.regioes.placa.contornoMm).toContainEqual([0, 0]);
    expect(redondo.contornos.regioes.placa.contornoMm).not.toContainEqual([0, 0]);
  });

  it('o raio que não cabe é recusado com a aresta e as medidas: 60 mm numa placa de 100 de altura', async () => {
    const quando = desenhar(placaArredondada(60));
    await expect(quando).rejects.toThrow(ErroDeDesenho);
    await expect(quando).rejects.toThrow(/na parte "placa" o raio de canto não cabe entre "B" e "C": essa aresta mede 100 mm e os dois cantos pedem 120 mm de tangência/);
  });

  it('a metade exata da aresta cabe (cápsula) e o que cabe só num canto de cada vez também', async () => {
    const meio = await desenhar(placaArredondada(50));
    expect(meio.relatorio.estado).toBe('resolvido');
    const par = await desenhar(com((x) => { x.partes.placa.raioDoCanto = { A: 80, C: 80 }; }));
    expect(par.relatorio.estado).toBe('resolvido');
    await expect(desenhar(com((x) => { x.partes.placa.raioDoCanto = { A: 80, D: 80 }; }))).rejects.toThrow(/entre "D" e "A": essa aresta mede 100 mm e os dois cantos pedem 160 mm/);
  });

  it('a barra curta demais para o raio é recusada pelo comprimento', async () => {
    const d = com((x) => { x.relacoes.find((r) => r.nome === 'comprimento da cápsula').mm = 30; });
    await expect(desenhar(d)).rejects.toThrow(/na parte "capsula" o raio de canto não cabe entre a ponta de "P" e a ponta de "Q": essa aresta mede 30 mm e os dois cantos pedem 40 mm/);
  });

  it('com o desenho solto o raio que não cabe não derruba o relatório: o estado do resolvedor vem primeiro', async () => {
    const d = com((x) => { x.partes.placa.raioDoCanto = 60; x.relacoes = x.relacoes.filter((r) => r.nome !== 'altura'); });
    const r = await desenhar(d);
    expect(r.relatorio.estado).toBe('solto');
    expect(r.contornos).toBeNull();
  });

  it('a mesma descrição dá a mesma saída byte a byte, e a ordem dos pontos do arquivo não muda o contorno', async () => {
    const a = await desenhar(placaArredondada(), { origem: { desenho: 'x', sha256: 'y' } });
    const d = placaArredondada();
    d.pontos = Object.fromEntries(Object.entries(d.pontos).reverse());
    d.relacoes.reverse();
    const b = await desenhar(d, { origem: { desenho: 'x', sha256: 'y' } });
    expect(JSON.stringify(b.contornos)).toBe(JSON.stringify(a.contornos));
    expect(b.svg).toBe(a.svg);
  });
});
