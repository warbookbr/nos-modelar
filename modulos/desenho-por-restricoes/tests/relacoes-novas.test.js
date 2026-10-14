/* relacoes-novas.test.js — o que o `mecanifica.desenho@3` acrescenta às relações: a simetria entre pontos e entre partes em relação a
   uma reta, a geometria de construção (o círculo e a reta que amarram relações sem virar parte nem região), a distância só em h ou só
   em v entre dois pontos e o centro com nome do canto arredondado (para dizer "concêntrico com" e medir entre-eixos). Tudo medido
   nos pontos resolvidos e nos anéis gravados; os objetos são sintéticos. */
import { describe, expect, it } from 'vitest';
import { desenhar, modeloDaDescricao, validarDescricao } from '../src/index.js';
import { conferirCentros } from '../src/resolver.js';
import { placaArredondada } from './formas.js';

const erros = (d) => validarDescricao(d).erros;
const com = (base, mudar) => { const d = base(); mudar(d); return d; };
const aprox = (p, q, casas = 2) => { expect(p[0]).toBeCloseTo(q[0], casas); expect(p[1]).toBeCloseTo(q[1], casas); };
const dist = (p, c) => Math.hypot(p[0] - c[0], p[1] - c[1]);
const base3 = { formato: 'mecanifica.desenho@3', vista: 'frontal', referencias: { chao: { reta: 'horizontal', v: 0 }, eixo: { reta: 'vertical', h: 0 } } };

/* Dois triângulos espelhados pelo eixo (a simetria entre partes) e um par de pontos espelhado (a simetria entre pontos). */
const espelho = () => ({
  ...base3,
  objeto: 'garfo simétrico',
  pontos: { A: [-48, 2], B: [-12, 3], C: [-28, 55], A2: [50, 1], B2: [11, 2], C2: [30, 58], P: [-40, 20], Q: [38, 21] },
  partes: { esq: { poligono: ['A', 'B', 'C'] }, dir: { poligono: ['A2', 'B2', 'C2'] } },
  relacoes: [
    { nome: 'A no chão', sobre: ['A', 'chao'] },
    { nome: 'A a 50 do eixo', distancia: ['A', 'eixo'], mm: 50, lado: 'esquerda' },
    { nome: 'B no chão', sobre: ['B', 'chao'] },
    { nome: 'B a 10 do eixo', distancia: ['B', 'eixo'], mm: 10, lado: 'esquerda' },
    { nome: 'C a 60 do chão', distancia: ['C', 'chao'], mm: 60, lado: 'acima' },
    { nome: 'C a 30 do eixo', distancia: ['C', 'eixo'], mm: 30, lado: 'esquerda' },
    { nome: 'dir espelha esq', simetrico: ['esq', 'dir', 'eixo'] },
    { nome: 'P a 40 do eixo', distancia: ['P', 'eixo'], mm: 40, lado: 'esquerda' },
    { nome: 'P a 20 do chão', distancia: ['P', 'chao'], mm: 20, lado: 'acima' },
    { nome: 'Q espelha P', simetrico: ['P', 'Q', 'eixo'] },
  ],
});

/* O espelho numa diagonal que só existe como reta de construção. */
const diagonal = () => ({
  ...base3,
  objeto: 'espelho na diagonal',
  referencias: { chao: { reta: 'horizontal', v: 0 }, parede: { reta: 'vertical', h: 0 } },
  pontos: { O: [1, 1], D: [90, 95], P: [30, 10], Q: [12, 28] },
  construcao: { diagonal: { reta: ['O', 'D'] } },
  partes: { marca: { poligono: ['O', 'P', 'Q'] } },
  relacoes: [
    { nome: 'O no chão', sobre: ['O', 'chao'] },
    { nome: 'O na parede', sobre: ['O', 'parede'] },
    { nome: 'diagonal a 45 graus', angulo: ['chao', 'diagonal'], graus: 45 },
    { nome: 'comprimento da diagonal', distancia: ['O', 'D'], mm: 100 },
    { nome: 'P a 30 da parede', distancia: ['P', 'parede'], mm: 30, lado: 'direita' },
    { nome: 'P a 10 do chão', distancia: ['P', 'chao'], mm: 10, lado: 'acima' },
    { nome: 'Q espelha P', simetrico: ['P', 'Q', 'diagonal'] },
  ],
});

/* Um triângulo com o vértice V sobre um círculo de construção (a guia), a 50 do chão. */
const comGuia = () => ({
  ...base3,
  objeto: 'cunha com o vértice na curva',
  referencias: { chao: { reta: 'horizontal', v: 0 }, parede: { reta: 'vertical', h: 0 } },
  pontos: { O: [1, 1], W: [115, 2], V: [78, 53], K: [48, 52] },
  construcao: { guia: { circulo: { centro: 'K' } } },
  partes: { cunha: { poligono: ['O', 'W', 'V'] } },
  relacoes: [
    { nome: 'O no chão', sobre: ['O', 'chao'] },
    { nome: 'O na parede', sobre: ['O', 'parede'] },
    { nome: 'W no chão', sobre: ['W', 'chao'] },
    { nome: 'largura', distancia: ['O', 'W'], mm: 120 },
    { nome: 'K a 50 da parede', distancia: ['K', 'parede'], mm: 50, lado: 'direita' },
    { nome: 'K a 50 do chão', distancia: ['K', 'chao'], mm: 50, lado: 'acima' },
    { nome: 'raio da guia', raio: 'guia', mm: 30 },
    { nome: 'V sobre a guia', sobre: ['V', 'guia'] },
    { nome: 'V a 50 do chão', distancia: ['V', 'chao'], mm: 50, lado: 'acima' },
  ],
});

/* Uma régua de Q a P, com P a 70 de Q em h e a 30 em v. */
const regua = (h = { eixo: 'h', lado: 'direita' }, v = { eixo: 'v', lado: 'acima' }, chuteDeP = [100, 100]) => ({
  ...base3,
  objeto: 'régua',
  referencias: { chao: { reta: 'horizontal', v: 0 }, parede: { reta: 'vertical', h: 0 } },
  pontos: { Q: [10, 10], P: chuteDeP },
  partes: { regua: { barra: ['Q', 'P'], espessura: 4 } },
  relacoes: [
    { nome: 'Q no chão', sobre: ['Q', 'chao'] },
    { nome: 'Q na parede', sobre: ['Q', 'parede'] },
    { nome: 'P em h', distancia: ['P', 'Q'], mm: 70, ...h },
    { nome: 'P em v', distancia: ['P', 'Q'], mm: 30, ...v },
  ],
});

describe('simetrico', () => {
  it('põe o segundo ponto no espelho do primeiro e as partes uma no espelho da outra', async () => {
    const { relatorio } = await desenhar(espelho());
    expect(relatorio.estado).toBe('resolvido');
    expect(relatorio.grausDeLiberdade).toBe(0);
    const p = relatorio.medidas.pontos;
    aprox(p.Q, [40, 20]);
    aprox(p.A2, [50, 0]); aprox(p.B2, [10, 0]); aprox(p.C2, [30, 60]);
    expect(relatorio.medidas.partes.dir).toMatchObject({ hMin: 10, hMax: 50, vMin: 0, vMax: 60 });
  });

  it('é uma relação como as outras: o relatório a cita pelo nome, e a que contradiz o resto vira conflito com esse nome', async () => {
    const d = com(espelho, (x) => { x.relacoes.push({ nome: 'Q a 38 do eixo', distancia: ['Q', 'eixo'], mm: 38, lado: 'direita' }); });
    const { relatorio } = await desenhar(d);
    expect(relatorio.estado).toBe('conflito');
    expect(relatorio.conflitantes).toContain('Q a 38 do eixo');
  });

  it('o ponto de mesma posição nas duas partes, quando é o mesmo, fica sobre o eixo; círculos têm centros simétricos e o mesmo raio', async () => {
    const d = com(espelho, (x) => {
      x.pontos.M = [3, 70]; x.pontos.R = [-30, 30]; x.pontos.R2 = [28, 31];
      x.partes.topo = { poligono: ['C', 'M', 'C2'] };
      x.partes.furoE = { circulo: { centro: 'R' } };
      x.partes.furoD = { circulo: { centro: 'R2', chute: 3 } };
      x.partes.espelhoA = { poligono: ['A', 'M', 'B'] };
      x.partes.espelhoB = { poligono: ['A2', 'M', 'B2'] };
      x.relacoes.push(
        { nome: 'M a 70 do chão', distancia: ['M', 'chao'], mm: 70, lado: 'acima' },
        { nome: 'topo espelha a si mesmo', simetrico: ['espelhoA', 'espelhoB', 'eixo'] },
        { nome: 'R a 30 do eixo', distancia: ['R', 'eixo'], mm: 30, lado: 'esquerda' },
        { nome: 'R a 30 do chão', distancia: ['R', 'chao'], mm: 30, lado: 'acima' },
        { nome: 'raio de R', raio: 'furoE', mm: 8 },
        { nome: 'furos espelhados', simetrico: ['furoE', 'furoD', 'eixo'] },
      );
    });
    const { relatorio } = await desenhar(d);
    expect(relatorio.estado).toBe('resolvido');
    expect(relatorio.medidas.pontos.M[0]).toBeCloseTo(0, 6);
    aprox(relatorio.medidas.pontos.R2, [30, 30]);
    expect(relatorio.medidas.partes.furoD.raioMm).toBeCloseTo(8, 6);
  });

  it('com a reta de construção na diagonal, o ponto espelhado troca h e v', async () => {
    const { relatorio, contornos } = await desenhar(diagonal());
    expect(relatorio.estado).toBe('resolvido');
    aprox(relatorio.medidas.pontos.Q, [10, 30]);
    expect(Object.keys(contornos.regioes)).toEqual(['marca']);
  });

  it('recusa o ponto com ele mesmo, o eixo que passa por um dos pontos, as partes de forma ou tamanho diferente, o arco e a barra de outra espessura', () => {
    expect(erros(com(espelho, (x) => { x.relacoes.find((r) => r.nome === 'Q espelha P').simetrico = ['P', 'P', 'eixo']; }))[0]).toMatch(/cita o ponto "P" duas vezes; para pôr um ponto sobre o eixo use "sobre"/);
    expect(erros(com(diagonal, (x) => { x.relacoes.find((r) => r.nome === 'Q espelha P').simetrico = ['P', 'Q', ['O', 'P']]; }))[0]).toMatch(/usa como eixo uma reta que passa por "P"/);
    expect(erros(com(espelho, (x) => { x.partes.furo = { circulo: { centro: 'P', chute: 3 } }; x.relacoes.find((r) => r.nome === 'dir espelha esq').simetrico = ['esq', 'furo', 'eixo']; }))[0]).toMatch(/liga polígono a círculo; duas partes simétricas têm a mesma forma/);
    expect(erros(com(espelho, (x) => { x.pontos.D = [0, 9]; x.partes.dir.poligono.push('D'); x.relacoes.push({ nome: 'D no eixo', sobre: ['D', 'eixo'] }); }))[0]).toMatch(/liga "esq", de 3 pontos, a "dir", de 4; as duas partes têm o mesmo número de pontos/);
    expect(erros(com(espelho, (x) => {
      x.pontos.Z1 = [0, 1]; x.pontos.Z2 = [0, 2]; x.pontos.Z3 = [1, 1]; x.pontos.Z4 = [1, 2];
      x.partes.b1 = { barra: ['Z1', 'Z2'], espessura: 4 }; x.partes.b2 = { barra: ['Z3', 'Z4'], espessura: 6 };
      x.relacoes.find((r) => r.nome === 'dir espelha esq').simetrico = ['b1', 'b2', 'eixo'];
    }))[0]).toMatch(/liga as barras "b1" e "b2", de espessuras 4 e 6 mm/);
    expect(erros(com(espelho, (x) => { x.relacoes.find((r) => r.nome === 'Q espelha P').simetrico = ['P', 'Q']; }))[0]).toMatch(/\(simetrico\) deve listar 3 itens/);
    expect(erros(com(espelho, (x) => { x.relacoes.find((r) => r.nome === 'Q espelha P').mm = 3; }))[0]).toMatch(/declara "mm", que não vale para este tipo de relação/);
  });

  it('no @2 a relação é recusada pedindo para trocar o formato', () => {
    const d = com(espelho, (x) => { x.formato = 'mecanifica.desenho@2'; });
    expect(erros(d)[0]).toMatch(/é do tipo "simetrico", que existe a partir de "mecanifica.desenho@3"; troque o "formato"/);
  });
});

describe('construcao', () => {
  it('o círculo de construção amarra o vértice no resolvedor e não vira região, parte da silhueta nem traço na vista', async () => {
    const { relatorio, contornos, svg } = await desenhar(comGuia());
    expect(relatorio.estado).toBe('resolvido');
    expect(relatorio.grausDeLiberdade).toBe(0);
    aprox(relatorio.medidas.pontos.V, [80, 50]);
    expect(Object.keys(contornos.regioes)).toEqual(['cunha']);
    expect(Object.keys(relatorio.medidas.partes)).toEqual(['cunha']);
    expect(relatorio.medidas.construcao).toEqual({ guia: { tipo: 'circulo', raioMm: 30, centro: [50, 50] } });
    expect(contornos.silhueta.pedacos).toHaveLength(1);
    expect(svg).not.toMatch(/>guia</);
    expect(relatorio.avisos).toEqual([]);
  });

  it('o círculo de construção pode ser tangente a uma referência e dá o raio de uma relação como qualquer círculo', async () => {
    const d = com(comGuia, (x) => {
      x.relacoes = x.relacoes.filter((r) => r.nome !== 'K a 50 do chão');
      x.relacoes.push({ nome: 'guia no chão', tangente: ['guia', 'chao'], lado: 'acima' });
      x.relacoes.find((r) => r.nome === 'V a 50 do chão').mm = 40;
    });
    const { relatorio } = await desenhar(d);
    expect(relatorio.estado).toBe('resolvido');
    aprox(relatorio.medidas.pontos.K, [50, 30]);
    aprox(relatorio.medidas.pontos.V, [50 + Math.sqrt(30 * 30 - 10 * 10), 40]);
  });

  it('a reta de construção é um nome para dois pontos e vale onde uma reta vale', async () => {
    const { relatorio } = await desenhar(diagonal());
    expect(relatorio.medidas.pontos.D[0]).toBeCloseTo(70.711, 3);
    expect(relatorio.medidas.pontos.D[1]).toBeCloseTo(70.711, 3);
  });

  it('o círculo de construção sem raio, a ordem de profundidade que o cita, o nome repetido e as formas erradas são recusados', () => {
    expect(erros(com(comGuia, (x) => { x.relacoes = x.relacoes.filter((r) => r.nome !== 'raio da guia'); }))[0]).toMatch(/o círculo "guia" não tem raio/);
    expect(erros(com(comGuia, (x) => { x.frenteParaFundo = ['cunha', 'guia']; }))[0]).toMatch(/"frenteParaFundo" cita "guia", que não é uma parte/);
    expect(erros(com(comGuia, (x) => { x.partes.guia = { circulo: { centro: 'K', chute: 3 } }; }))[0]).toMatch(/o nome "guia" aparece em partes e em construcao/);
    expect(erros(com(diagonal, (x) => { x.construcao.diagonal = { reta: ['O', 'O'] }; }))[0]).toMatch(/a reta de construção "diagonal" tem os dois pontos "O", "O" no mesmo lugar ou repetidos/);
    expect(erros(com(diagonal, (x) => { x.construcao.diagonal = { reta: ['O'] }; }))[0]).toMatch(/a reta de construção "diagonal" deve ser \["<ponto>", "<ponto>"\]/);
    expect(erros(com(comGuia, (x) => { x.construcao.guia = { circulo: { centro: 'K' }, reta: ['O', 'W'] }; }))[0]).toMatch(/a construção "guia" deve ser .* uma forma só/);
    expect(erros(com(comGuia, (x) => { x.construcao.guia = { circulo: { centro: 'Z' } }; }))[0]).toMatch(/o círculo de construção "guia" deve ser \{ "centro": "<ponto>" \}/);
    expect(erros(com(comGuia, (x) => { x.relacoes.find((r) => r.nome === 'V sobre a guia').sobre = ['V', 'cunha']; }))[0]).toMatch(/"cunha" é polígono/);
  });

  it('a reta de construção citada no lugar de um círculo, e o círculo no lugar de uma reta, dizem o que cada nome é', () => {
    expect(erros(com(diagonal, (x) => { x.relacoes.find((r) => r.nome === 'comprimento da diagonal').distancia = ['O', 'diagonal']; }))[0]).toMatch(/espera no segundo lugar um ponto declarado|precisa de "lado"/);
    expect(erros(com(comGuia, (x) => { x.relacoes.push({ nome: 'x', paralela: ['guia', 'chao'] }); }))[0]).toMatch(/espera no primeiro lugar uma reta, e "guia" é círculo de construção; uma reta é uma referência, uma barra, uma reta de construção ou dois pontos/);
  });

  it('no @2 o campo é recusado pedindo para trocar o formato', () => {
    expect(erros(com(comGuia, (x) => { x.formato = 'mecanifica.desenho@2'; }))[0]).toBe('o campo "construcao" existe a partir de "mecanifica.desenho@3"; troque o "formato" da descrição');
  });
});

describe('distancia só em h ou só em v', () => {
  it('põe o primeiro ponto do lado dito do segundo, a tantos milímetros naquele eixo', async () => {
    const { relatorio } = await desenhar(regua());
    expect(relatorio.estado).toBe('resolvido');
    aprox(relatorio.medidas.pontos.P, [70, 30]);
  });

  it('tem sinal: o lado manda mesmo com o chute do outro lado, o que a distância entre pontos não fazia', async () => {
    const d = regua({ eixo: 'h', lado: 'esquerda' }, { eixo: 'v', lado: 'abaixo' }, [100, 100]);
    const { relatorio } = await desenhar(d);
    expect(relatorio.estado).toBe('resolvido');
    aprox(relatorio.medidas.pontos.P, [-70, -30]);
    aprox((await desenhar(regua({ eixo: 'h', lado: 'direita' }, { eixo: 'v', lado: 'abaixo' }, [-50, 90]))).relatorio.medidas.pontos.P, [70, -30]);
  });

  it('um valor que o resolvedor não satisfaz aparece como conflito com o que foi pedido e o que mediu', async () => {
    const d = com(regua, (x) => { x.relacoes.push({ nome: 'P a 50 do chão', distancia: ['P', 'chao'], mm: 50, lado: 'acima' }); });
    const { relatorio } = await desenhar(d);
    expect(relatorio.estado).toBe('conflito');
    expect(relatorio.conflitantes.length + relatorio.desvios.length).toBeGreaterThan(0);
  });

  it('recusa o eixo sem lado, o lado do outro eixo, o eixo desconhecido, o eixo fora da distância entre pontos e o eixo no @2', () => {
    expect(erros(com(regua, (x) => { delete x.relacoes[2].lado; }))[0]).toMatch(/\(distancia, eixo "h"\) precisa de "lado" "esquerda", "direita"/);
    expect(erros(com(regua, (x) => { x.relacoes[2].lado = 'acima'; }))[0]).toMatch(/precisa de "lado" "esquerda", "direita"/);
    expect(erros(com(regua, (x) => { x.relacoes[2].eixo = 'x'; }))[0]).toMatch(/declara "eixo" "x"; use "h" .* ou "v"/);
    expect(erros(com(regua, (x) => { x.relacoes.push({ nome: 'e', distancia: ['P', 'chao'], mm: 5, lado: 'acima', eixo: 'v' }); }))[0]).toMatch(/"eixo", que só vale entre dois pontos/);
    expect(erros(com(regua, (x) => { x.relacoes.push({ nome: 'e', vertical: ['P', 'Q'], eixo: 'v' }); }))[0]).toMatch(/\(vertical\) declara "eixo", que só vale para "distancia" entre dois pontos/);
    expect(erros(com(regua, (x) => { x.formato = 'mecanifica.desenho@2'; }))[0]).toMatch(/\(distancia\) declara "eixo", que existe a partir de "mecanifica.desenho@3"/);
  });
});

describe('centro do canto arredondado', () => {
  const placaComCentros = (extra = () => {}) => com(placaArredondada, (x) => {
    x.formato = 'mecanifica.desenho@3';
    x.partes.placa.raioDoCanto = { A: { raio: 10, centro: 'CA' }, B: { raio: 10, centro: 'CB' }, C: { raio: 10, centro: 'CC' }, D: { raio: 10, centro: 'CD' } };
    extra(x);
  });

  it('o centro é um ponto do desenho, no lugar do arco: a 10 mm das duas arestas, e nomear o centro não muda a placa nem os graus de liberdade', async () => {
    const sem = await desenhar(placaArredondada());
    const com3 = await desenhar(placaComCentros());
    expect(com3.relatorio.estado).toBe('resolvido');
    expect(com3.relatorio.grausDeLiberdade).toBe(0);
    const p = com3.relatorio.medidas.pontos;
    aprox(p.CA, [10, 10]); aprox(p.CB, [190, 10]); aprox(p.CC, [190, 90]); aprox(p.CD, [10, 90]);
    expect(com3.relatorio.medidas.centrosDeCanto.CC).toEqual({ parte: 'placa', ponto: 'C', raioMm: 10, posicao: [190, 90] });
    expect(com3.contornos.regioes.placa.areaMm2).toBeCloseTo(sem.contornos.regioes.placa.areaMm2, 1);
    expect(com3.texto).toMatch(/centros dos cantos: "CA" \(10; 10\), canto A de "placa", raio 10 mm/);
    /* o arco traçado depois de resolver tem o centro nomeado como centro */
    const anel = com3.contornos.regioes.placa.contornoMm;
    for (const q of anel.filter(([h, v]) => h < 10 && v < 10)) expect(dist(q, p.CA)).toBeCloseTo(10, 2);
  });

  it('mede o entre-eixos: a distância entre dois centros, com o sinal do eixo, no lugar da largura, dá a mesma placa', async () => {
    const sem = await desenhar(placaArredondada());
    const d = placaComCentros((x) => {
      x.relacoes = x.relacoes.filter((r) => r.nome !== 'largura');
      x.relacoes.push({ nome: 'entre-eixos de baixo', distancia: ['CB', 'CA'], mm: 180, eixo: 'h', lado: 'direita' });
    });
    const { relatorio, contornos } = await desenhar(d);
    expect(relatorio.estado).toBe('resolvido');
    expect(relatorio.grausDeLiberdade).toBe(0);
    aprox(relatorio.medidas.pontos.B, [200, 0]);
    expect(contornos.regioes.placa.areaMm2).toBeCloseTo(sem.contornos.regioes.placa.areaMm2, 1);
  });

  it('diz concêntrico: o centro do canto coincidente com o centro de um furo leva a placa até lá, sem cotar o canto', async () => {
    const d = placaComCentros((x) => {
      x.pontos.J = [30, 28];
      x.partes.furo = { circulo: { centro: 'J' } };
      x.relacoes = x.relacoes.filter((r) => !['A no chão', 'A na parede'].includes(r.nome));
      x.relacoes.push(
        { nome: 'furo a 40 da parede', distancia: ['J', 'parede'], mm: 40, lado: 'direita' },
        { nome: 'furo a 35 do chão', distancia: ['J', 'chao'], mm: 35, lado: 'acima' },
        { nome: 'raio do furo', raio: 'furo', mm: 4 },
        { nome: 'furo concêntrico com o canto A', coincidente: ['J', 'CA'] },
      );
    });
    const { relatorio, contornos } = await desenhar(d);
    expect(relatorio.estado).toBe('resolvido');
    expect(relatorio.grausDeLiberdade).toBe(0);
    aprox(relatorio.medidas.pontos.CA, [40, 35]);
    aprox(relatorio.medidas.pontos.A, [30, 25]);
    const anel = contornos.regioes.placa.contornoMm;
    expect(Math.min(...anel.map((q) => q[0]))).toBeCloseTo(30, 3);
    expect(Math.min(...anel.map((q) => q[1]))).toBeCloseTo(25, 3);
  });

  it('vale no canto reentrante, onde o centro fica fora do polígono, e no convexo', async () => {
    const d = {
      formato: 'mecanifica.desenho@3', objeto: 'cantoneira', vista: 'frontal',
      referencias: { chao: { reta: 'horizontal', v: 0 }, parede: { reta: 'vertical', h: 0 } },
      pontos: { A: [2, 1], B: [98, 3], C: [101, 42], D: [41, 38], E: [43, 99], F: [-2, 101] },
      partes: { L: { poligono: ['A', 'B', 'C', 'D', 'E', 'F'], raioDoCanto: { D: { raio: 5, centro: 'CD' }, B: { raio: 8, centro: 'CB' } } } },
      relacoes: [
        { nome: 'A no chão', sobre: ['A', 'chao'] }, { nome: 'A na parede', sobre: ['A', 'parede'] },
        { nome: 'B de nível', horizontal: ['A', 'B'] }, { nome: 'base', distancia: ['A', 'B'], mm: 100 },
        { nome: 'C a prumo', vertical: ['B', 'C'] }, { nome: 'braço baixo', distancia: ['B', 'C'], mm: 40 },
        { nome: 'D de nível', horizontal: ['C', 'D'] }, { nome: 'espessura', distancia: ['C', 'D'], mm: 60 },
        { nome: 'E a prumo', vertical: ['D', 'E'] }, { nome: 'braço alto', distancia: ['D', 'E'], mm: 60 },
        { nome: 'F de nível', horizontal: ['E', 'F'] }, { nome: 'F na parede', sobre: ['F', 'parede'] },
      ],
    };
    const { relatorio } = await desenhar(d);
    expect(relatorio.estado).toBe('resolvido');
    aprox(relatorio.medidas.pontos.CD, [45, 45]);
    aprox(relatorio.medidas.pontos.CB, [92, 8]);
  });

  it('o centro sem canto no chute, o nome repetido, o texto vazio, o campo estranho e o formato antigo são recusados', () => {
    expect(erros(placaComCentros((x) => { x.pontos.A = [0, 0]; x.pontos.B = [50, 0]; x.pontos.D = [-50, 0]; }))[0]).toMatch(/o canto "A" do polígono "placa" declara o centro "CA", mas no chute ele é reto ou fechado/);
    expect(erros(placaComCentros((x) => { x.pontos.CA = [1, 1]; x.relacoes.push({ nome: 'x', coincidente: ['CA', 'A'] }); }))[0]).toMatch(/o nome "CA" aparece em pontos e em centros de canto/);
    expect(erros(placaComCentros((x) => { x.partes.placa.raioDoCanto.A.centro = ''; }))[0]).toMatch(/"raioDoCanto" do polígono "placa" deve ser um número/);
    expect(erros(placaComCentros((x) => { x.partes.placa.raioDoCanto.A.cor = 'azul'; }))[0]).toMatch(/"raioDoCanto" do polígono "placa" deve ser um número/);
    expect(erros(placaComCentros((x) => { x.formato = 'mecanifica.desenho@2'; }))[0]).toMatch(/nomeia o centro de um canto, que existe a partir de "mecanifica.desenho@3"/);
    expect(erros(placaComCentros((x) => { x.partes.capsula.raioDoCanto = { P: { raio: 5, centro: 'CP' } }; }))[0]).toMatch(/da barra "capsula" deve ser um número/);
  });

  it('o chute do centro é do módulo, e não da descrição: com os chutes dos vértices longe da forma final o planegcs cairia no círculo vizinho, e o módulo refaz o chute a partir da solução', async () => {
    const aRetaDe = (p, a, b) => Math.abs(((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])) / dist(a, b));
    const cantos = { CA: ['D', 'A', 'B'], CB: ['A', 'B', 'C'], CC: ['B', 'C', 'D'], CD: ['C', 'D', 'A'] };
    for (const chutes of [{ A: [3, 2], B: [8, 190], C: [-95, 195], D: [-105, 10] }, { A: [300, 300], B: [-300, 8], C: [195, 400], D: [10, -400] }]) {
      const { relatorio } = await desenhar(placaComCentros((x) => { Object.assign(x.pontos, chutes); }));
      expect(relatorio.estado, JSON.stringify(chutes)).toBe('resolvido');
      expect(relatorio.grausDeLiberdade).toBe(0);
      const p = relatorio.medidas.pontos;
      for (const [centro, [antes, canto, depois]] of Object.entries(cantos)) {
        expect(aRetaDe(p[centro], p[antes], p[canto]), `${centro} da aresta que chega`).toBeCloseTo(10, 4);
        expect(aRetaDe(p[centro], p[canto], p[depois]), `${centro} da aresta que sai`).toBeCloseTo(10, 4);
      }
    }
  });

  it('o centro que o resolvedor põe em outro círculo tangente às duas arestas é achado depois de resolver e dito como lado trocado', async () => {
    const modelo = modeloDaDescricao(placaComCentros());
    const certos = { A: [0, 0], B: [200, 0], C: [200, 100], D: [0, 100], CA: [10, 10], CB: [190, 10], CC: [190, 90], CD: [10, 90] };
    expect(conferirCentros(modelo, certos)).toEqual([]);
    const errados = conferirCentros(modelo, { ...certos, CA: [-10, 10] });
    expect(errados).toHaveLength(1);
    expect(errados[0]).toMatchObject({ relacao: 'centro do canto "CA"', centro: 'CA' });
    expect(errados[0].mensagem).toMatch(/o centro do canto "CA" \(o canto "A" do polígono "placa", raio 10 mm\) ficou a 20 mm de onde as duas arestas o põem \(10; 10\): o resolvedor o pôs em outro círculo tangente às duas retas\. Aproxime os chutes de "D", "A" e "B"/);
  });
});
