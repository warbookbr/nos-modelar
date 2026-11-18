/* pente-de-curvatura.test.mjs — o pente de curvatura na chapa abaulada de prova. A seção x:400 passa pelo centro do amassado (y 300, raio de 80 mm):
 * a curvatura troca de sinal dentro dele e salta de um lado e do outro do centro (a cova tem curvatura de +0,75 1/m no centro, -1,5 1/m perto da borda e zero fora); a da chapa lisa é
 * constante (zero em x:400, o abaulamento de 6 m, 0,167 1/m, em y:300) e não tem salto nem troca de sinal. Tudo conferido nos números.
 * Os vários cortes numa execução (lista, grade e guiado pela zebra numérica) são conferidos contra os cortes um a um e contra as ilhas que
 * a zebra acha no amassado, e cada recusa tem a entrada ruim que a provoca. */
import { PNG } from 'pngjs';
import { describe, expect, it } from 'vitest';
import { AMASSADO } from '../blender/chapa-com-amassado-de-prova.mjs';
import { executarReceita } from '../../src/autoria/executar-receita.js';
import { lerEntradaDeMedida } from './entrada-de-medida.mjs';
import {
  PADROES, ilhasDaZebra, juntarGrades, lerCaixa, lerCortes, lerGrades, lerZebra, modoDaLinha, numeroPositivo, penteDeCurvatura, penteDeVariosCortes, planoDeCortes, tabelaDoPente,
} from './pente-de-curvatura.mjs';
import { zebraNumerica } from './zebra-numerica.mjs';

const neutroDe = async (peca) => (await lerEntradaDeMedida(peca, { montagem: false })).executar().neutro;
const corte = (eixo, posicao) => ({ eixo, posicao });

describe('pente de curvatura', () => {
  it('na chapa com amassado a seção pelo centro mostra o salto nas bordas e a troca de sinal', async () => {
    const { json, png } = penteDeCurvatura(await neutroDe('chapa-de-reflexo-de-prova'), { corte: corte('x', AMASSADO.x * 1000), lado: '+z', nome: 'chapa' });
    expect(json.curvas).toHaveLength(1);
    const [c] = json.curvas;
    /* os saltos de curvatura ficam dentro do amassado (|y - 300| < 80), um de cada lado do centro, onde a curvatura cai de +0,75 a -1,5 1/m */
    const dentro = c.saltos.filter((s) => Math.abs(s.ponto[1] - AMASSADO.y * 1000) < AMASSADO.raio * 1000 && Math.abs(s.variacao) > 0.4);
    expect(dentro.length).toBeGreaterThanOrEqual(2);
    expect(dentro.some((s) => s.ponto[1] < AMASSADO.y * 1000) && dentro.some((s) => s.ponto[1] > AMASSADO.y * 1000)).toBe(true);
    expect(c.saltos.length).toBe(dentro.length);
    expect(c.mudancasDeSinal.length).toBeGreaterThanOrEqual(2);
    expect(c.mudancasDeSinal.every((m) => Math.abs(m.ponto[1] - AMASSADO.y * 1000) < AMASSADO.raio * 1000)).toBe(true);
    expect(c.resumo.maximo).toBeGreaterThan(0.4);
    expect(c.resumo.minimo).toBeLessThan(-0.4);
    const img = PNG.sync.read(png);
    expect([img.width, img.height]).toEqual([1280, 720]);
  });

  it('na chapa lisa as duas seções não têm salto nem troca de sinal', async () => {
    const neutro = await neutroDe('chapa-lisa-de-reflexo-de-prova');
    const transversal = penteDeCurvatura(neutro, { corte: corte('x', 400), lado: '+z' }).json;
    const longitudinal = penteDeCurvatura(neutro, { corte: corte('y', 300), lado: '+z' }).json;
    for (const j of [transversal, longitudinal]) { expect(j.saltos).toBe(0); expect(j.mudancasDeSinal).toBe(0); }
    expect(Math.abs(transversal.curvas[0].resumo.maximo)).toBeLessThan(0.02);
    expect(longitudinal.curvas[0].resumo.mediana).toBeGreaterThan(0.15); /* 1/6 m = 0,167 1/m */
    expect(longitudinal.curvas[0].resumo.mediana).toBeLessThan(0.18);
  });

  it('sem --lado a seção dá a volta pelas duas peles, e recusa corte ausente ou fora da peça', async () => {
    const neutro = await neutroDe('chapa-lisa-de-reflexo-de-prova');
    const volta = penteDeCurvatura(neutro, { corte: corte('x', 400) }).json.curvas;
    expect(volta).toHaveLength(1);
    expect(volta[0].fechada).toBe(true);
    expect(volta[0].comprimentoMm).toBeGreaterThan(1200); /* as duas peles de 600 mm e as paredes da borda */
    expect(() => penteDeCurvatura(neutro, {})).toThrow('o pente pede o plano de corte: --corte=<x|y|z>:<mm>');
    expect(() => penteDeCurvatura(neutro, { corte: corte('x', 5000), lado: '+z' })).toThrow(/não corta a peça/);
  });

  it('vários cortes numa execução dão o mesmo que os cortes um a um, e o que não toca a peça fica na tabela com zero curvas', async () => {
    const neutro = await neutroDe('chapa-de-reflexo-de-prova');
    const pedidos = [['x', 400, '+z'], ['y', 300, '+z'], ['x', 700, '+z'], ['x', 400, null]];
    const cortes = [...pedidos.map(([eixo, posicao, lado]) => ({ eixo, posicao, lado })), { eixo: 'x', posicao: 5000, lado: '+z' }];
    const { json, imagens } = penteDeVariosCortes(neutro, { cortes, amostras: true, nome: 'chapa' });
    expect(imagens).toEqual([]); /* a imagem por corte é desligada por padrão */
    expect(json.cortes).toHaveLength(5);
    pedidos.forEach(([eixo, posicao, lado], k) => {
      const um = penteDeCurvatura(neutro, { corte: corte(eixo, posicao), lado, nome: 'chapa' }).json;
      expect(json.cortes[k].curvas).toEqual(um.curvas);
      expect([json.cortes[k].saltos, json.cortes[k].mudancasDeSinal]).toEqual([um.saltos, um.mudancasDeSinal]);
      expect(json.tabela[k]).toMatchObject({ corte: `${eixo}:${posicao}`, lado, curvas: um.curvas.length, saltos: um.saltos, mudancasDeSinal: um.mudancasDeSinal });
      expect(json.tabela[k].maiorSalto).toBe(Math.max(0, ...um.curvas.map((c) => c.resumo.maiorSalto)));
    });
    /* o maior salto do corte pelo amassado fica dentro dele, e a tabela diz onde */
    expect(json.tabela[0].maiorSalto).toBeGreaterThan(0.4);
    expect(Math.hypot(json.tabela[0].onde[0] - AMASSADO.x * 1000, json.tabela[0].onde[1] - AMASSADO.y * 1000)).toBeLessThan(AMASSADO.raio * 1000);
    expect(json.tabela[2]).toMatchObject({ saltos: 0, maiorSalto: 0, onde: null, mudancasDeSinal: 0 });
    expect(json.cortes[4]).toMatchObject({ naoCorta: true, curvas: [], saltos: 0 });
    expect(json.saltos).toBe(json.cortes.reduce((n, c) => n + c.saltos, 0));
    const texto = tabelaDoPente(json).split('\n');
    expect(texto).toHaveLength(2 + 5);
    expect(texto[0]).toBe('| corte | lado | origem | curvas | saltos | maior salto (1/m) | onde (x, y, z em mm) | trocas de sinal |');
    expect(texto[6]).toContain('| x:5000 | +z | lista | 0 (não corta) | 0 | - | - | 0 |');
    /* a caixa limita a conta: metade do amassado (y de 300 para cima) fica com um dos dois saltos de x:400, e a caixa longe dele, com nenhum */
    const inteiro = json.cortes[0];
    const metade = penteDeVariosCortes(neutro, { cortes: cortes.slice(0, 1), caixa: lerCaixa('y:300:600') }).json;
    expect(metade.caixa).toEqual({ y: [300, 600] });
    expect(metade.cortes[0].saltos).toBe(inteiro.curvas[0].saltos.filter((s) => s.ponto[1] >= 300).length);
    expect(metade.cortes[0].saltos).toBeGreaterThanOrEqual(1);
    expect(metade.cortes[0].saltos).toBeLessThan(inteiro.saltos);
    expect(metade.cortes[0].curvas[0].saltos.every((s) => s.ponto[1] >= 300)).toBe(true);
    const longe = penteDeVariosCortes(neutro, { cortes: [...cortes.slice(0, 2), corte('x', 900)], lado: '+z', caixa: lerCaixa('x:0:1000,y:450:560') }).json;
    expect(longe.tabela.map((l) => [l.corte, l.curvas, l.saltos, l.mudancasDeSinal])).toEqual([['x:400', 1, 0, 0], ['y:300', 0, 0, 0], ['x:900', 1, 0, 0]]);
    expect(longe.cortes[1]).toMatchObject({ foraDaCaixa: true });
    expect(Math.abs(longe.cortes[0].curvas[0].resumo.maximo)).toBeLessThan(0.05);
    expect(tabelaDoPente(longe)).toContain('| y:300 | +z | lista | 0 (fora da caixa) |');
    /* sem --amostras o JSON não leva as amostras, e com --imagens sai um PNG por corte que toca a peça */
    const enxuto = penteDeVariosCortes(neutro, { cortes: cortes.slice(0, 2), imagens: true });
    expect(enxuto.json.cortes[0].curvas[0].amostras).toBeUndefined();
    expect(enxuto.imagens.map((i) => [i.eixo, i.posicao, i.lado])).toEqual([['x', 400, '+z'], ['y', 300, '+z']]);
    expect(PNG.sync.read(enxuto.imagens[0].png).width).toBe(1280);
  });

  it('a lista e a grade viram o plano de cortes, sem repetir o corte igual', () => {
    expect(lerCortes('x:400, y:600')).toEqual([corte('x', 400), corte('y', 600)]);
    expect(lerGrades('y:400:650:50')).toEqual([400, 450, 500, 550, 600, 650].map((p) => corte('y', p)));
    expect(lerGrades('x:0:10:4,z:-5:-5:1')).toEqual([corte('x', 0), corte('x', 4), corte('x', 8), corte('z', -5)]);
    expect(juntarGrades(['peca', '--grade=y:0:10:5', '--lado=+z', '--grade=x:1:1:1'])).toEqual(['peca', '--lado=+z', '--grade=y:0:10:5,x:1:1:1']);
    expect(juntarGrades(['peca', '--grade=y:0:10:5'])).toEqual(['peca', '--grade=y:0:10:5']);
    const plano = planoDeCortes({ cortes: lerCortes('y:450,x:400'), grades: lerGrades('y:400:500:50'), lado: '+z' });
    expect(plano.cortes.map((c) => [c.eixo, c.posicao, c.lado, c.origem])).toEqual([['y', 450, '+z', 'lista'], ['x', 400, '+z', 'lista'], ['y', 400, '+z', 'grade'], ['y', 500, '+z', 'grade']]);
    expect(plano.cortesDeixadosDeFora).toBe(0);
    expect(modoDaLinha({ corte: 'x:400' })).toBe('um');
    expect(modoDaLinha({ grade: 'y:0:10:5', caixa: 'x:0:1' })).toBe('varios');
    expect(lerCaixa('x:600:2000, z:-690:-20')).toEqual({ x: [600, 2000], z: [-690, -20] });
    expect(numeroPositivo('passo', null, 5)).toBe(5);
    expect(numeroPositivo('passo', '2.5', 5)).toBe(2.5);
  });

  it('guiado pela zebra numérica, o pente corta pelas ilhas do amassado, pelos dois eixos perpendiculares ao olhar, sem repetir corte a menos de um passo', async () => {
    const { default: receita } = await import('../fixtures/acervo/chapa-de-reflexo-de-prova/receita.js');
    const chapa = executarReceita({ ...receita, PASSOS: receita.PASSOS.filter(([op]) => op === 'subdivisao') }).neutro.chapas[0];
    const zebra = JSON.parse(JSON.stringify(zebraNumerica(chapa, {})));
    const ilhas = ilhasDaZebra(zebra);
    expect(ilhas.length).toBeGreaterThanOrEqual(2);
    for (let k = 1; k < ilhas.length; k++) expect(ilhas[k - 1].persistencia).toBeGreaterThanOrEqual(ilhas[k].persistencia);
    /* as ilhas que a zebra acha na chapa com amassado ficam dentro dele */
    for (const i of ilhas) expect(Math.hypot(i.ponto[0] - AMASSADO.x * 1000, i.ponto[1] - AMASSADO.y * 1000)).toBeLessThan(AMASSADO.raio * 1000);
    const plano = planoDeCortes({ zebra });
    expect(plano.separacaoMm).toBe(zebra.parametros.passoEfetivoMm);
    /* o olhar da região é +z: os cortes são por x e por y, do lado +z, e cada ilha tem um corte de cada eixo a menos de um passo do ponto dela */
    expect(plano.cortes.every((c) => c.origem === 'zebra' && c.lado === '+z' && ['x', 'y'].includes(c.eixo))).toBe(true);
    for (const i of ilhas) {
      for (const [eixo, k] of [['x', 0], ['y', 1]]) expect(plano.cortes.some((c) => c.eixo === eixo && Math.abs(c.posicao - i.ponto[k]) < plano.separacaoMm && c.ilhas.some((j) => JSON.stringify(j) === JSON.stringify(i)))).toBe(true);
    }
    /* nenhum par de cortes do mesmo eixo a menos de um passo, e menos cortes que dois por ilha, porque as ilhas se alinham */
    for (const a of plano.cortes) for (const b of plano.cortes) if (a !== b && a.eixo === b.eixo) expect(Math.abs(a.posicao - b.posicao)).toBeGreaterThanOrEqual(plano.separacaoMm);
    expect(plano.cortes.length).toBeLessThan(2 * ilhas.length);
    expect(plano.cortes.reduce((n, c) => n + c.ilhas.length, 0)).toBe(2 * ilhas.length);
    const { json } = penteDeVariosCortes(await neutroDe('chapa-de-reflexo-de-prova'), { cortes: plano.cortes, separacaoMm: plano.separacaoMm });
    /* cada corte guiado passa pelo amassado: tem salto e troca de sinal, e eles caem nas ilhas */
    for (const c of json.cortes) {
      expect(c.saltos).toBeGreaterThanOrEqual(2);
      expect(c.nasIlhas.saltos).toBe(c.saltos);
      expect(c.nasIlhas.mudancasDeSinal).toBe(c.mudancasDeSinal);
      expect(c.ilhas.every((i) => i.naIlha.raioMm === i.ondaMm / 2)).toBe(true);
    }
    expect(tabelaDoPente(json).split('\n')[0]).toContain('| ilhas | saltos nas ilhas | maior salto nas ilhas (1/m) | trocas nas ilhas |');
    expect(json.cortes[0].nasIlhas.maiorSalto).toBe(Math.abs(json.cortes[0].maiorSalto.variacao));
    expect(tabelaDoPente(json)).toContain('| zebra: chapa |');
    /* o máximo corta a lista pela persistência, e conta o que ficou de fora; a separação maior junta mais ilhas num corte */
    const curto = planoDeCortes({ zebra, maximo: 2 });
    expect(curto.cortes).toEqual(plano.cortes.slice(0, 2).map((c) => expect.objectContaining({ eixo: c.eixo, posicao: c.posicao })));
    expect(curto.cortesDeixadosDeFora).toBeGreaterThan(0);
    expect(planoDeCortes({ zebra, separacaoMm: 200 }).cortes).toHaveLength(2);
    /* a lista entra antes, e a ilha a menos de um passo de um corte da lista é anotada nele em vez de repetir o corte */
    const misto = planoDeCortes({ cortes: [corte('x', ilhas[0].ponto[0] + 1)], zebra, lado: '+z' });
    expect(misto.cortes[0]).toMatchObject({ origem: 'lista', eixo: 'x' });
    expect(misto.cortes[0].ilhas).toContainEqual(ilhas[0]);
    expect(misto.cortes.length).toBe(plano.cortes.length);
    /* --lado vence o olhar da região */
    expect(planoDeCortes({ zebra, lado: '-z' }).cortes.every((c) => c.lado === '-z')).toBe(true);
    expect(PADROES.maximoDeCortes).toBe(24);
  });

  it('recusa a lista, a grade, a zebra e a mistura de opções que não valem, dizendo o que veio e o que era esperado', async () => {
    expect(() => lerCortes('')).toThrow("--cortes pede uma lista de <eixo>:<mm> separados por vírgula, por exemplo x:400,y:600; veio ''");
    expect(() => lerCortes('x:400,w:3')).toThrow(/--cortes: o item 'w:3' não é um corte \(.*\) O esperado é <x\|y\|z>:<mm>, como em --cortes=x:400,y:600/);
    expect(() => lerGrades(' ')).toThrow("--grade pede <eixo>:<de>:<até>:<passo> em mm, por exemplo y:400:650:50; veio ' '");
    for (const ruim of ['y:400:650', 'w:400:650:50', 'y:400:abc:50', 'y:400::50']) expect(() => lerGrades(ruim)).toThrow(`--grade: '${ruim}' não é uma grade; o esperado é <x|y|z>:<de>:<até>:<passo> em mm, como em --grade=y:400:650:50`);
    for (const ruim of ['y:650:400:50', 'y:400:650:0', 'y:400:650:-5']) expect(() => lerGrades(ruim)).toThrow(/--grade: '.*' não dá corte nenhum \(de .* até .*, passo .*\); o esperado é o até maior ou igual ao de e o passo maior que zero, como em --grade=y:400:650:50/);
    expect(() => lerZebra('tmp/nao-existe/zebra.json')).toThrow(/--guiado-pela-zebra: não foi possível ler 'tmp\/nao-existe\/zebra.json' \(ENOENT\); o esperado é o arquivo de saída da zebra numérica, gere-a com/);
    expect(() => lerZebra('tools/modelar/pente-de-curvatura.mjs')).toThrow(/--guiado-pela-zebra: 'tools\/modelar\/pente-de-curvatura.mjs' não é JSON válido \(.*\); o esperado é o arquivo de saída da zebra numérica, gere-a com/);
    expect(lerZebra('tools/fixtures/curvas-lisas/carro-caixas.json')).toHaveProperty('porta');
    expect(() => ilhasDaZebra({ porta: {} })).toThrow('--guiado-pela-zebra espera a saída em JSON da zebra numérica, com regioes[].direcoes[].ilhas, e veio um objeto com porta; gere-a com');
    expect(() => ilhasDaZebra(null)).toThrow('--guiado-pela-zebra espera a saída em JSON da zebra numérica, com regioes[].direcoes[].ilhas, e veio null');
    expect(() => ilhasDaZebra({ regioes: [{ nome: 'porta', olhar: 'lado', direcoes: [] }] })).toThrow("--guiado-pela-zebra: a região 'porta' veio com o olhar 'lado', e o esperado é +x, -x, +y, -y, +z ou -z, como a zebra numérica escreve");
    expect(() => ilhasDaZebra({ regioes: [{ nome: 'porta', olhar: '+x', direcoes: [{ eixo: 'y', ilhas: [{ tipo: 'maximo', persistencia: 0.01, ponto: [1, 2] }] }] }] })).toThrow("--guiado-pela-zebra: uma ilha da região 'porta' veio sem o ponto [x, y, z] em mm (veio [1,2])");
    expect(() => planoDeCortes({ grades: lerGrades('y:0:100:10'), maximo: 5 })).toThrow('--cortes e --grade pedem 11 cortes e o máximo é 5; aumente com --maximo-de-cortes=11 ou abra o passo da grade');
    expect(() => planoDeCortes({ cortes: [corte('x', 1)], maximo: 2.5 })).toThrow("--maximo-de-cortes espera um inteiro a partir de 1, e veio '2.5'");
    expect(() => planoDeCortes({})).toThrow('nenhum corte a fazer: não veio --cortes nem --grade; diga os planos, por exemplo --cortes=x:400,y:600 ou --grade=y:400:650:50');
    expect(() => planoDeCortes({ zebra: { regioes: [{ nome: 'lisa', olhar: '+z', direcoes: [{ eixo: 'x', ilhas: [] }] }] } })).toThrow('nenhum corte a fazer: a zebra não trouxe nenhuma ilha (regioes[].direcoes[].ilhas está vazio) e não veio --cortes nem --grade');
    expect(() => modoDaLinha({ corte: 'x:400', cortes: 'y:300', zebra: 'z.json' })).toThrow('--corte mede um plano só e veio junto de --cortes e --guiado-pela-zebra; ponha o plano na lista (--cortes=x:400,...) e tire o --corte');
    expect(() => modoDaLinha({ corte: 'x:400', caixa: 'y:0:1' })).toThrow('--corte mede um plano só e veio junto de --caixa');
    expect(() => modoDaLinha({ caixa: 'y:0:1' })).toThrow('o pente pede ao menos um plano');
    expect(() => lerCaixa('')).toThrow("--caixa pede <eixo>:<min>:<max> em mm, um a três eixos separados por vírgula, por exemplo x:600:2000,z:-690:-20; veio ''");
    for (const ruim of ['x:600', 'w:1:2', 'x:a:2', 'x::2']) expect(() => lerCaixa(ruim)).toThrow(`--caixa: '${ruim}' não é um intervalo; o esperado é <x|y|z>:<min>:<max> em mm, como em --caixa=x:600:2000,z:-690:-20`);
    expect(() => lerCaixa('x:2000:600')).toThrow("--caixa: em 'x:2000:600' o mínimo 2000 é maior que o máximo 600; escreva x:600:2000");
    expect(() => lerCaixa('x:0:1,x:2:3')).toThrow('--caixa: o eixo x veio duas vezes (0:1 e 2:3); cada eixo tem um intervalo só');
    expect(() => modoDaLinha({})).toThrow('o pente pede ao menos um plano: --corte=<x|y|z>:<mm>, --cortes=x:400,y:600, --grade=<eixo>:<de>:<até>:<passo> ou --guiado-pela-zebra=<json da zebra numérica>');
    for (const ruim of ['0', '-3', 'abc']) expect(() => numeroPositivo('passo', ruim, 5)).toThrow(`--passo espera um número maior que zero, e veio '${ruim}'`);
    const neutro = await neutroDe('chapa-lisa-de-reflexo-de-prova');
    expect(() => penteDeVariosCortes(neutro, { cortes: [] })).toThrow('o pente de vários cortes pede a lista de planos: --cortes=x:400,y:600, --grade=<eixo>:<de>:<até>:<passo> ou --guiado-pela-zebra=<json>');
    expect(() => penteDeVariosCortes(neutro, { cortes: [corte('x', 5000), corte('y', -900)], lado: '+z' })).toThrow('nenhum dos 2 planos corta a peça (x:5000 lado +z, y:-900 lado +z); confira as posições em mm do referencial da peça e o --lado');
    expect(() => penteDeVariosCortes(neutro, { cortes: [corte('x', 400)], lado: '+z', caixa: { y: [900, 950] } })).toThrow('nenhum dos 1 planos corta a peça dentro da caixa {"y":[900,950]} (x:400 lado +z); confira as posições em mm do referencial da peça, a --caixa e o --lado');
  });
});
