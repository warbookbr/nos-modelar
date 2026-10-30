/* molduras-do-vao.test.mjs — a moldura em volta do vão, medida sobre a malha varrida de verdade (fatia 12 do plano de ajustes no núcleo).
 *
 * O defeito que a fatia fecha: nenhuma ferramenta dizia se os frisos de um vão cobriam a borda inteira. A moldura com entalhe no canto
 * (um friso por lado, de corte reto) e a que para antes de fechar a volta passavam por `descrever` com saída 0, e o entalhe só aparecia
 * à pessoa na vista. Aqui a receita declara o vão em `vaos` (a borda pelos nomes da gaiola e os frisos pelo nome da linha) e a
 * conferência mede a pegada dos frisos na chapa curva de `fixtures/friso-prova.js`: a fechada da fatia 11 passa, e a que tem entalhe no
 * canto, a que não fecha a volta, a que não desce até a borda e a emenda com degrau são recusadas com a posição. A aba parcial de
 * propósito passa só com o motivo. Os casos sobre a borda do vão estão em `fixtures/moldura-prova.js`. */
import { describe, expect, it } from 'vitest';
import { nucleo } from '../../procedural/nucleo/entrada.js';
import * as prova from '../../procedural/nucleo/fixtures/friso-prova.js';
import * as molduras from '../../procedural/nucleo/fixtures/moldura-prova.js';
import { conferirVaosDaPeca, formatarVaos, lerVaosDeclarados } from './molduras-do-vao.js';
import { descreverPecaReutilizavel } from '../../tools/modelar/descrever-peca.mjs';

const P = prova.pontos();
const executa = (c) => { const n = nucleo(c.passos, P); expect(n.orfaos).toEqual([]); return n; };
const confere = (c, vaos = c.vaos) => conferirVaosDaPeca(executa(c), { vaos });
const mm = (m) => m * 1000;

describe('a moldura fechada aceita', () => {
  it('a moldura da fatia 11, a volta de largura variável ao redor do vão, cobre a volta que ela segue e não tem emenda', () => {
    const neutro = nucleo(prova.passosDaMoldura(), P);
    expect(neutro.orfaos).toEqual([]);
    const r = conferirVaosDaPeca(neutro, { vaos: [{ nome: 'volta', borda: prova.voltaDoVao(), frisos: ['molduraDoVao'] }] });
    expect(r.problemas).toEqual([]);
    expect(r.ok).toBe(true);
    const v = r.vaos[0];
    expect(v.cobertas).toBe(v.amostras);
    expect(v.descobertos).toEqual([]);
    expect(v.emendas).toEqual([]);
    /* a volta de 400 mm de lado, quatro lados de 400 mm medidos sobre a chapa curva */
    expect(mm(v.comprimento)).toBeGreaterThan(1600);
    expect(mm(v.comprimento)).toBeLessThan(1630);
  });

  it('o friso de uma volta fechada em volta da borda do vão, de largura única, também', () => {
    const r = confere(molduras.fechada());
    expect(r.problemas).toEqual([]);
    expect(r.vaos[0].descobertos).toEqual([]);
  });

  it('e com a travessa de 14 mm e o montante de 7 mm, o degrau da fatia 11 nos quatro cantos', () => {
    const r = confere(molduras.variavel());
    expect(r.problemas).toEqual([]);
    expect(r.vaos[0].cobertas).toBe(r.vaos[0].amostras);
  });

  it('com menos níveis de refino a borda ainda é a mesma e a moldura ainda a cobre', () => {
    expect(confere(molduras.fechada({ niveis: 1 })).problemas).toEqual([]);
    expect(confere(molduras.fechada({ niveis: 3 })).problemas).toEqual([]);
  });

  it('dois frisos emendados no meio de dois lados retos, com o mesmo perfil, passam, e a emenda é contada', () => {
    const r = confere(molduras.metades());
    expect(r.problemas).toEqual([]);
    expect(r.vaos[0].emendas).toHaveLength(2);
    expect(r.vaos[0].emendas.every((e) => e.tipo === 'reta' && e.ok)).toBe(true);
  });
});

describe('o canto com entalhe é recusado, com a posição', () => {
  const r = confere(molduras.lados());

  it('um friso por lado, de corte reto, deixa o quadrante de fora de cada canto sem material', () => {
    expect(r.ok).toBe(false);
    const cantos = r.vaos[0].emendas.filter((e) => e.tipo === 'canto');
    expect(cantos).toHaveLength(4);
    for (const e of cantos) {
      expect(e.ok).toBe(false);
      expect(e.giro).toBeGreaterThan(85);
      expect(e.giro).toBeLessThan(95);
      /* o leque tem raio de 5 mm (metade da faixa); o ponto a 45 graus fica a 3,5 mm das duas faixas */
      expect(mm(e.entalhe)).toBeGreaterThan(3.3);
      expect(mm(e.entalhe)).toBeLessThan(3.9);
    }
    /* os quatro cantos da borda, em x e z de 300 e 500 mm */
    const xz = cantos.map((e) => `${Math.round(mm(e.posicao[0]))},${Math.round(mm(e.posicao[2]))}`).sort();
    expect(xz).toEqual(['300,300', '300,500', '500,300', '500,500']);
  });

  it('a borda em si está coberta: é o canto, e não o trecho, que o acusa', () => {
    expect(r.vaos[0].descobertos).toEqual([]);
  });

  it('o texto diz o canto, a posição em milímetro e o tamanho do entalhe, e aponta o friso só pela volta com variacao', () => {
    expect(r.problemas).toHaveLength(4);
    expect(r.problemas[0]).toMatch(/^'janela': entalhe no canto entre 'lado\d' e 'lado\d' em \(\d+,\d, \d+,\d, \d+,\d mm\)/);
    expect(r.problemas[0]).toMatch(/3,\d mm da faixa/);
    expect(r.problemas[0]).toMatch(/variacao/);
  });
});

describe('a moldura que não cobre a borda inteira é recusada, com o trecho descoberto', () => {
  it('o friso que para antes de fechar a volta deixa o último lado sem moldura', () => {
    const r = confere(molduras.quePara());
    expect(r.ok).toBe(false);
    const d = r.vaos[0].descobertos;
    expect(d).toHaveLength(1);
    expect(d[0].entre).toEqual(['p3_4', 'p3_3']);
    /* o lado de baixo à esquerda, de 100 mm de grade, menos a metade da faixa da ponta dele */
    expect(mm(d[0].comprimento)).toBeGreaterThan(90);
    expect(mm(d[0].comprimento)).toBeLessThan(100);
    expect(Math.round(mm(d[0].posicao[0]))).toBe(300);
    expect(r.problemas[0]).toMatch(/trecho da borda sem moldura, \d+,\d mm entre 'p3_4' e 'p3_3' perto de \(300,0, /);
  });

  it('a moldura que não desce até a borda, com a faixa a 3 mm da linha, não cobre nenhum ponto, e o texto diz a distância', () => {
    const r = confere(molduras.afastada({ afastamento: 0.003 }));
    expect(r.ok).toBe(false);
    expect(r.vaos[0].cobertas).toBe(0);
    expect(mm(r.vaos[0].descobertos[0].distanciaDaFaixa)).toBeCloseTo(3, 1);
    expect(r.problemas[0]).toMatch(/não toca a borda: a faixa mais perto passa a 3,0 mm dela \(ela não desce até a borda\)/);
  });

  it('a tolerância declarada no vão decide: a faixa a 0,3 mm cobre com a padrão e deixa de cobrir com 0,1 mm', () => {
    const c = molduras.afastada({ afastamento: 0.0003 });
    expect(confere(c).problemas).toEqual([]);
    expect(confere(c, [{ ...c.vaos[0], tolerancia: 1e-4 }]).ok).toBe(false);
  });
});

describe('a emenda de dois frisos com perfis diferentes é recusada, com o degrau', () => {
  const r = confere(molduras.metades({ larguraA: 0.01, larguraB: 0.014 }));

  it('as duas emendas têm o degrau de 2 mm de cada lado, com as larguras e a posição, e a borda está coberta', () => {
    expect(r.ok).toBe(false);
    expect(r.vaos[0].descobertos).toEqual([]);
    expect(r.vaos[0].emendas).toHaveLength(2);
    for (const e of r.vaos[0].emendas) {
      expect(e.tipo).toBe('reta');
      expect(mm(e.degrau)).toBeCloseTo(2, 1);
      expect(mm(e.larguras[0])).toBeCloseTo(10, 1);
      expect(mm(e.larguras[1])).toBeCloseTo(14, 1);
    }
    expect(r.vaos[0].emendas.map((e) => Math.round(mm(e.posicao[0])))).toEqual([400, 400]);
    expect(r.vaos[0].emendas.map((e) => Math.round(mm(e.posicao[2]))).sort()).toEqual([300, 500]);
  });

  it('o texto diz o degrau e manda usar um friso só com variacao', () => {
    expect(r.problemas).toHaveLength(2);
    expect(r.problemas[0]).toMatch(/degrau na emenda de 'metadeA' com 'metadeB' perto de \(400,0, [\d,]+, \d+,0 mm\): os perfis das duas pontas diferem em 2,0 mm \(larguras de 10,0 e 14,0 mm\)/);
    expect(r.problemas[0]).toMatch(/variacao/);
  });
});

describe('a aba parcial de propósito passa só declarada, com o motivo', () => {
  const motivo = 'a aba não vai no lado de baixo à esquerda, onde a calha do teto interrompe a borda';

  it('a aba por três lados e meio, sem declaração, é recusada e o texto aponta a declaração', () => {
    const r = confere(molduras.aba());
    expect(r.ok).toBe(false);
    expect(r.problemas[0]).toMatch(/trecho da borda sem moldura/);
    expect(r.problemas[0]).toMatch(/parcial: \{ motivo \}/);
  });

  it('com parcial: { motivo } o trecho descoberto não reprova, e o texto continua dizendo que é parcial', () => {
    const c = molduras.aba({ parcial: { motivo } });
    const r = confere(c);
    expect(r.problemas).toEqual([]);
    expect(r.vaos[0].descobertos).toHaveLength(1);
    expect(r.vaos[0].parcial).toEqual({ motivo });
    expect(formatarVaos(r)).toMatch(/parcial declarada: a aba não vai/);
    expect(formatarVaos(r)).toMatch(/1 trecho\(s\) descoberto\(s\)/);
  });

  it('o motivo curto, o campo desconhecido e o parcial que não é objeto gritam', () => {
    const c = molduras.aba();
    expect(() => confere(c, [{ ...c.vaos[0], parcial: { motivo: 'curto' } }])).toThrow(/parcial\.motivo.*pelo menos 15 caracteres/);
    expect(() => confere(c, [{ ...c.vaos[0], parcial: {} }])).toThrow(/parcial\.motivo/);
    expect(() => confere(c, [{ ...c.vaos[0], parcial: { motivo, depois: 1 } }])).toThrow(/campo desconhecido 'depois'/);
    expect(() => confere(c, [{ ...c.vaos[0], parcial: true }])).toThrow(/precisa ser \{ motivo \}/);
  });

  it('declarar parcial numa aba que cobre a borda inteira reprova, porque descreve o que não existe', () => {
    const r = confere(molduras.aba({ lados: 8, parcial: { motivo } }));
    expect(r.ok).toBe(false);
    expect(r.problemas[0]).toMatch(/declarado parcial .* e a borda está inteira coberta: tire `parcial`/);
  });

  it('a parcial que não toca a borda em ponto nenhum reprova também', () => {
    const c = molduras.afastada({ afastamento: 0.003 });
    const r = confere(c, [{ ...c.vaos[0], parcial: { motivo } }]);
    expect(r.ok).toBe(false);
    expect(r.problemas[0]).toMatch(/a aba parcial precisa cobrir ao menos parte da borda/);
  });

  it('a aba inteira, por todo o vão, passa sem declaração', () => {
    expect(confere(molduras.aba({ lados: 8 })).problemas).toEqual([]);
  });
});

describe('a declaração em vaos é validada', () => {
  const c = molduras.fechada();
  const neutro = executa(c);
  const base = c.vaos[0];
  const lido = (v) => lerVaosDeclarados({ vaos: v }, neutro.frisos);

  it('sem vaos nada roda', () => {
    expect(conferirVaosDaPeca(neutro, {})).toEqual({ declarados: 0, vaos: [], problemas: [], ok: true });
    expect(formatarVaos(conferirVaosDaPeca(neutro, {}))).toBe('');
  });

  it('lista os frisos que existem quando a declaração cita um que não existe', () => {
    expect(() => lido([{ ...base, frisos: ['janela'] }])).toThrow(/a peça não tem friso de linha 'janela'. Frisos disponíveis: 'moldura'/);
  });

  it('recusa campo desconhecido, nome repetido, borda curta, frisos vazios e tolerância fora da faixa', () => {
    expect(() => lido([{ ...base, cor: 1 }])).toThrow(/campo desconhecido 'cor'/);
    expect(() => lido([base, base])).toThrow(/já foi declarado/);
    expect(() => lido([{ ...base, borda: ['p3_3', 'p4_3'] }])).toThrow(/três ou mais/);
    expect(() => lido([{ ...base, frisos: [] }])).toThrow(/'frisos' precisa ser a lista/);
    expect(() => lido([{ ...base, tolerancia: 0.01 }])).toThrow(/'tolerancia' precisa ser um número em metro de 0.00001 a 0.005/);
    expect(() => lido([{ ...base, tolerancia: 0 }])).toThrow(/'tolerancia'/);
    expect(() => lido({})).toThrow(/'vaos' precisa ser lista/);
  });

  it('a borda que cita ponto fora da gaiola ou liga pontos que não são aresta grita com os nomes', () => {
    expect(() => confere(c, [{ ...base, borda: ['p3_3', 'p4_3', 'zz'] }])).toThrow(/cita o ponto 'zz', que não é ponto nomeado da gaiola/);
    expect(() => confere(c, [{ ...base, borda: ['p3_3', 'p5_5', 'p3_5'] }])).toThrow(/liga 'p3_3' a 'p5_5', que não formam aresta da gaiola/);
  });

  it('o friso de polilinha, sem chapa, não tem borda de chapa para conferir e grita', () => {
    const solto = nucleo([['friso', { origemId: 1, linha: { nome: 'solto', pontos: [[0, 0, 0], [0.1, 0, 0]] }, normal: [0, 1, 0], perfil: { retangulo: { largura: 0.01, profundidade: 0.005, centro: [0, 0.001] } } }]], {});
    expect(() => conferirVaosDaPeca(solto, { vaos: [{ nome: 'v', borda: ['a', 'b', 'c'], frisos: ['solto'] }] })).toThrow(/não segue uma chapa/);
  });
});

describe('a chapa com simetria em x', () => {
  const pontos = {}; const vertices = []; const faces = [];
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { const x = 0.1 * i, z = 0.1 * j; pontos[`c${i}_${j}`] = [x, 0.2 - x * x - (z - 0.15) ** 2, z]; vertices.push(`c${i}_${j}`); }
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) faces.push([`c${i}_${j}`, `c${i}_${j + 1}`, `c${i + 1}_${j + 1}`, `c${i + 1}_${j}`]);
  const chapa = ['subdivisao', { origemId: 1, vertices, faces, simetria: 'x', medidas: [...vertices], espessura: 0.002, niveis: 2 }];
  const friso = (pts) => ['friso', { origemId: 2, superficie: { op: 'subdivisao', id: 1 }, linha: { nome: 'l', pontos: pts }, perfil: { retangulo: { largura: 0.01, profundidade: 0.004, centro: [0, 0.001] } } }];
  const roda = (linha, borda) => conferirVaosDaPeca(nucleo([chapa, friso(linha)], pontos), { vaos: [{ nome: 'v', borda, frisos: ['l'] }] });

  it('a volta que não toca o plano é conferida nas duas metades, e a moldura inteira cobre as duas', () => {
    const linha = ['c1_0', 'c2_0', 'c2_1', 'c2_2'];
    const r = roda(linha, linha);
    expect(r.problemas).toEqual([]);
    expect(r.vaos[0].comprimento).toBeGreaterThan(2 * 0.29);
  });

  it('o trecho descoberto aparece nas duas metades, e a cópia espelhada é dita', () => {
    const r = roda(['c1_0', 'c2_0', 'c2_1'], ['c1_0', 'c2_0', 'c2_1', 'c2_2']);
    expect(r.ok).toBe(false);
    expect(r.vaos[0].descobertos.map((t) => t.espelhada)).toEqual([false, true]);
    expect(r.problemas[1]).toMatch(/\(na cópia espelhada\)/);
  });

  it('a borda que toca o plano de simetria fica inconclusiva e não passa calada', () => {
    const r = roda(['c0_1', 'c1_1', 'c2_1'], ['c0_1', 'c1_1', 'c2_1']);
    expect(r.ok).toBe(false);
    expect(r.vaos[0].inconclusivo).toMatch(/toca o plano de simetria/);
    expect(r.problemas[0]).toMatch(/inconclusivo: a borda toca o plano de simetria/);
  });
});

describe('o descrever da peça', () => {
  const contatos = (frisos) => frisos.map((f) => ({ par: ['chapa', f], motivo: `o friso ${f} entra na chapa pela base do perfil, menos que a espessura` }));
  const receita = (c, nomes, extra = {}) => ({ PASSOS: c.passos, PARAMS: P, vaos: c.vaos, contatos: contatos(nomes), ...extra });
  const descreve = (modulo) => descreverPecaReutilizavel({ peca: 'moldura-de-prova', modulo });

  it('a moldura fechada sai com código 0 e a seção da moldura no texto', async () => {
    const c = molduras.fechada();
    const r = await descreve(receita(c, ['moldura']));
    expect(r.stderr).not.toMatch(/MOLDURA EM VOLTA/);
    expect(r.stdout).toMatch(/MOLDURA EM VOLTA DO VÃO — 1 vão\(s\) declarado\(s\)/);
    expect(r.stdout).toMatch(/janela: frisos 'moldura'; borda de 802,\d mm, 100,0% da borda coberta, 0 trecho\(s\) descoberto\(s\), nenhuma emenda; borda inteira; tolerância 0,5 mm/);
    expect(r.resultado.molduras.ok).toBe(true);
  });

  it('a moldura com entalhe no canto sai com código 1 e o problema no stderr', async () => {
    const c = molduras.lados();
    const adjacentes = [['lado1', 'lado2'], ['lado2', 'lado3'], ['lado3', 'lado4'], ['lado4', 'lado1']].map(([a, b]) => ({ par: [a, b], motivo: `os frisos ${a} e ${b} se encontram no canto da borda do vão` }));
    const r = await descreve(receita(c, ['lado1', 'lado2', 'lado3', 'lado4'], { contatos: [...contatos(['lado1', 'lado2', 'lado3', 'lado4']), ...adjacentes] }));
    expect(r.codigo).toBe(1);
    expect(r.stderr).toMatch(/4 PROBLEMA\(S\) NA MOLDURA EM VOLTA DO VÃO/);
    expect(r.stderr).toMatch(/entalhe no canto entre 'lado\d' e 'lado\d'/);
  });

  it('a declaração inválida é recusada com a mensagem, sem executar a conferência', async () => {
    const c = molduras.fechada();
    const r = await descreve(receita(c, ['moldura'], { vaos: [{ ...c.vaos[0], frisos: ['nenhum'] }] }));
    expect(r.codigo).toBe(1);
    expect(r.stderr).toMatch(/NÃO CONSEGUI CONFERIR OS VÃOS/);
    expect(r.stderr).toMatch(/a peça não tem friso de linha 'nenhum'/);
  });

  it('sem vaos na receita a saída não ganha seção nem campo de problema', async () => {
    const c = molduras.fechada();
    const r = await descreve(receita(c, ['moldura'], { vaos: undefined }));
    expect(r.stdout).not.toMatch(/MOLDURA EM VOLTA/);
    expect(r.resultado.molduras.declarados).toBe(0);
  });
});
