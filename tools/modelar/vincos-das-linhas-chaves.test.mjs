/* vincos-das-linhas-chaves.test.mjs — `vincos-das-linhas` cita só nomes que a receita declara e separa a borda de vão.
 *
 * A receita de prova (fixtures/vincos-das-linhas-chaves-prova.js) tem cinco estações-chave, as que `interpolar` gera entre
 * elas (z0_1, z0_2, z300_1, ...), que a receita não pode citar, e um vão, a abertura, entre as colunas teto e quina de z300 a
 * z600. As linhas 3D saem de formas conhecidas, com ruído de ±0,5 mm. A ferramenta devolvia 'z0_1' em de e ate de um vinco
 * de coluna, um vinco numa estação gerada (`vinco_z600_1`), um canto em 'z600_1_flancoAlto' e um vinco ao longo da borda do
 * vão; o ajudante da gaiola grita com qualquer desses nomes. Aqui os vincos vão de chave a chave, o que cai numa estação
 * gerada sai como fração entre as duas chaves, e a borda do vão sai como borda, sem vinco. */
import { describe, expect, it } from 'vitest';
import { entradaDaReceita, executarReceita } from '../../src/autoria/executar-receita.js';
import { criarResolverNumerico } from '../../procedural/nucleo/expressoes.js';
import { gaiolaDoPasso } from '../../procedural/nucleo/operacoes/subdivisao.js';
import { subdividirCatmullClark } from '../../procedural/nucleo/subdivisao.js';
import { cadeiasDaGaiola, classificarEstacoes, refinarCadeias, vincosDasLinhas } from './vincos-das-linhas.mjs';
import { COLUNAS, GERADAS, NOMES_DAS_LINHAS, gaiolaComChaves, linhasDeProva, receitaComChaves } from './fixtures/vincos-das-linhas-chaves-prova.js';

const ler = (receita = receitaComChaves(), linhas = linhasDeProva(), opcoes = {}) => vincosDasLinhas(receita, linhas, opcoes).superficies[0];
const LIDA = ler();
const linha = (s, nome) => s.linhas[NOMES_DAS_LINHAS.indexOf(nome)];
const trechos = (s, nome) => linha(s, nome).pecas.filter((p) => !p.espelhoDe).flatMap((p) => p.trechos);
/* o nome de estação que a interpolação gera: `${chave}_${k}` ou, num ponto, `${chave}_${k}_${coluna}` */
const NOME_GERADO = /z\d+_\d/;

describe('vincos a partir das linhas 3D, em gaiola com estações geradas e vão', () => {
  it('as estações geradas se reconhecem pelo nome e a fração entre as chaves sai da posição declarada no eixo', () => {
    const g = gaiolaComChaves();
    const indice = new Map(g.passo.vertices.map((n, k) => [n, k]));
    const estacoes = g.estacoes.map((e) => ({ nome: e.nome, pontos: COLUNAS.map((c) => indice.get(`${e.nome}_${c.nome}`)).filter((k) => k !== undefined) }));
    const posicoes = g.passo.vertices.map((n) => g.pontos[n]);
    const { chaves, geradas } = classificarEstacoes(estacoes, posicoes);
    // o ajudante diz quais estações são chaves e quais são geradas, e a leitura pelo nome concorda com ele
    expect(chaves).toEqual(g.estacoes.filter((e) => e.tipo === 'chave').map((e) => e.nome));
    expect([...geradas.keys()]).toEqual(g.estacoes.filter((e) => e.tipo === 'gerada').map((e) => e.nome));
    expect([...geradas.keys()]).toEqual(GERADAS.map((e) => e.nome));
    for (const e of GERADAS) {
      const r = geradas.get(e.nome);
      expect([r.antes, r.depois], e.nome).toEqual([e.antes, e.depois]);
      expect(Math.abs(r.fracao - e.fracao), e.nome).toBeLessThan(1e-9);
    }
    // sem eixo reto, a fração sai da projeção dos centros, e a que vem depois da última chave é uma declarada
    const torta = classificarEstacoes(estacoes, posicoes.map(([x, y, z]) => [x + 0.4 * z, y - 0.3 * z, z * 0.2 + x * 0.4]));
    expect([...torta.geradas.keys()]).toEqual(GERADAS.map((e) => e.nome));
    const so = classificarEstacoes([{ nome: 'a', pontos: [0] }, { nome: 'a_1', pontos: [1] }], [[0, 0, 0], [0, 0, 1]]);
    expect(so.chaves).toEqual(['a', 'a_1']);
    expect(so.geradas.size).toBe(0);
  });

  it('nenhum nome de estação gerada sai da ferramenta, nem em vinco, nem em canto, nem em sugestão', () => {
    expect(LIDA.cadeias).toEqual({ porNome: true, colunas: COLUNAS.length, estacoes: 5, arestas: 0, estacoesGeradas: GERADAS.length });
    expect(JSON.stringify(LIDA)).not.toMatch(NOME_GERADO);
    // o ajudante gritaria com qualquer um deles
    expect(() => receitaComChaves({ vincosNaGaiola: [{ nome: 'v', coluna: 'meiaAlta', de: 'z0_1', ate: 'z300', nitidez: 'viva' }] })).toThrow(/z0_1/);
  });

  it('a coluna que passa por estações geradas se declara de chave a chave, sem os pontos gerados', () => {
    const v = LIDA.vincos.find((x) => x.nome === 'vinco_meiaAlta');
    expect(v.acompanha).toEqual({ coluna: 'meiaAlta', de: 'z0', ate: 'z1200' });
    expect(v.pontos).toBeUndefined();
    expect(v.semPontosNoPasso).toMatch(/interpolação gerou/);
    expect(LIDA.vincosNaGaiola.find((x) => x.nome === 'vinco_meiaAlta')).toEqual({ nome: 'vinco_meiaAlta', coluna: 'meiaAlta', de: 'z0', ate: 'z1200', nitidez: 'viva' });
    // a declaração em nomes de chave é a que o ajudante aceita, e a receita com todos os vincos sugeridos roda
    const receita = receitaComChaves({ vincosNaGaiola: LIDA.vincosNaGaiola });
    expect(executarReceita(receita).neutro.orfaos).toEqual([]);
    expect(LIDA.comVincos.aceitos).toBe(true);
  });

  it('o trecho que começa e acaba numa estação gerada diz entre que chaves e a que fração', () => {
    const [t] = trechos(LIDA, 'flancoBaixo');
    expect(t.acompanha).toMatchObject({ coluna: 'flancoBaixo', de: 'z0', ate: 'z1200', deEntreChaves: { chaves: ['z0', 'z300'] }, ateEntreChaves: { chaves: ['z900', 'z1200'] } });
    expect(Math.abs(t.acompanha.deEntreChaves.fracao - 1 / 3)).toBeLessThan(0.02);
    expect(Math.abs(t.acompanha.ateEntreChaves.fracao - 1 / 3)).toBeLessThan(0.02);
    expect(LIDA.vincosNaGaiola.find((x) => x.nome === 'vinco_flancoBaixo')).toMatchObject({ coluna: 'flancoBaixo', de: 'z0', ate: 'z1200' });
  });

  it('a dobra transversal sobre uma estação gerada vira estação-chave nova entre as duas chaves, e não vinco na estação gerada', () => {
    expect(LIDA.vincos.map((v) => v.nome).filter((n) => /z600|z700/.test(n))).toEqual(['vinco_teto_z600']);
    const f = LIDA.faltantes.find((x) => x.linha === NOMES_DAS_LINHAS.indexOf('dobraEm700'));
    expect(f.sugestao).toMatchObject({ tipo: 'estacao', entre: ['z600', 'z900'], colunas: ['centro', 'quina'] });
    expect(Math.abs(f.sugestao.fracao - 1 / 3)).toBeLessThan(0.05);
    expect(f.texto).toMatch(/^estação nova entre 'z600' e 'z900', a 0,3\d? do caminho de 'z600' a 'z900'/);
    expect(f.sugestao.porColuna.map((c) => c.coluna)).toEqual(['centro', 'teto', 'quina']);
    for (const c of f.sugestao.porColuna) expect(Math.abs(c.fracao - 1 / 3)).toBeLessThan(0.02);
  });

  it('o canto que cai numa estação gerada não se declara: a saída diz entre que chaves e a que fração', () => {
    expect(LIDA.cantos).toEqual([]);
    expect(LIDA.cantosNaGaiola).toEqual([]);
    expect(LIDA.cantosSemChave).toHaveLength(1);
    const [c] = LIDA.cantosSemChave;
    expect(c).toMatchObject({ coluna: 'flancoAlto', chaves: ['z600', 'z900'] });
    expect(Math.abs(c.fracao - 1 / 3)).toBeLessThan(0.02);
    expect(c.anguloGraus).toBeGreaterThanOrEqual(10);
    expect(LIDA.vincos.find((v) => v.nome === 'vinco_flancoAlto').cantosSemChave).toEqual([c]);
  });

  it('a linha ao longo da borda do vão sai como borda, sem vinco ali, e o vinco da coluna pula o vão', () => {
    const t = trechos(LIDA, 'teto');
    const borda = t.filter((x) => x.tipo === 'borda');
    expect(borda).toHaveLength(1);
    expect(borda[0].acompanha).toMatchObject({ coluna: 'teto', de: 'z300', ate: 'z600' });
    expect(borda[0].texto).toMatch(/borda livre da gaiola.*não dobra/);
    expect(borda[0].vincos).toBeUndefined();
    expect(LIDA.bordas).toHaveLength(1);
    expect(LIDA.bordas[0]).toMatchObject({ linha: NOMES_DAS_LINHAS.indexOf('teto'), acompanha: { coluna: 'teto', de: 'z300', ate: 'z600' } });
    expect(LIDA.bordas[0].parcial).toBeUndefined();
    // os vincos sugeridos na coluna teto são os dois pedaços de fora do vão, e nenhum atravessa a borda
    const doTeto = LIDA.vincosNaGaiola.filter((v) => v.coluna === 'teto');
    expect(doTeto.map((v) => [v.nome, v.de, v.ate])).toEqual([['vinco_teto_z0', 'z0', 'z300'], ['vinco_teto_z600', 'z600', 'z1200']]);
    expect(JSON.stringify(LIDA)).not.toMatch(/vinco_teto_z300/);
  });

  it('a linha que corre pela coluna inteira, borda do vão no meio, traz a borda dentro do trecho, e o vinco cobre o resto', () => {
    // a curva da coluna teto na superfície limite, em mm: perto do vão ela sai a 8 mm da coluna de controle, e a linha que a
    // segue por inteiro mostra o trecho misto sem os cantos do vão, onde nenhuma linha de forma simples casa
    const entrada = entradaDaReceita(receitaComChaves());
    const args = entrada.PASSOS[0][1];
    const dict = { ...entrada.PARAMS, ...entrada.TOPO };
    const { num } = criarResolverNumerico(dict);
    const g = gaiolaDoPasso(args, { vec: (a) => (typeof a === 'string' ? dict[a] : a).map(num), num });
    const teto = cadeiasDaGaiola(g.declarados, g.gaiola.faces, g.gaiola.vertices.length).cadeias.find((c) => c.tipo === 'coluna' && c.nome === 'teto');
    const limite = subdividirCatmullClark({ vertices: g.gaiola.vertices, faces: g.gaiola.faces, vincos: g.gaiola.vincos, cantos: g.gaiola.cantos, niveis: 3, borda: args.borda, aoLimite: true });
    const pontos_mm = refinarCadeias(g.gaiola.faces, g.gaiola.vertices.length, 3, [teto.pontos])[0].map((i) => limite.vertices[i].map((v) => v * 1000));
    const s = ler(receitaComChaves(), { polilinhas_3d: [{ confianca: 'alta', pontos_mm }] });
    const t = s.linhas[0].pecas[0].trechos;
    expect(t).toHaveLength(1);
    expect(t[0]).toMatchObject({ tipo: 'coluna', acompanha: { coluna: 'teto', de: 'z0', ate: 'z1200' }, emBorda: [{ coluna: 'teto', de: 'z300', ate: 'z600' }] });
    expect(t[0].vincos.map((v) => v.nome)).toEqual(['vinco_teto_z0', 'vinco_teto_z600']);
    expect(s.vincosNaGaiola.map((v) => [v.coluna, v.de, v.ate])).toEqual([['teto', 'z0', 'z300'], ['teto', 'z600', 'z1200']]);
    expect(s.bordas).toHaveLength(1);
    expect(s.bordas[0]).toMatchObject({ parcial: true, emBorda: [{ coluna: 'teto', de: 'z300', ate: 'z600' }] });
    expect(s.bordas[0].texto).toMatch(/parte do trecho segue a borda livre/);
    expect(s.faltantes).toEqual([]);
    expect(JSON.stringify(s)).not.toMatch(NOME_GERADO);
  });

  it('a mesma entrada dá a mesma saída', () => {
    expect(JSON.stringify(ler())).toBe(JSON.stringify(LIDA));
  });
});
