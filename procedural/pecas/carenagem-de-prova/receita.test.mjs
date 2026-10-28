/* receita.test.mjs — a carenagem de prova da superfície por subdivisão: a receita só endereça a gaiola por nome, cada
   cota medida da TABELA é vértice da malha (gate 2 do plano da carroceria por subdivisão), o sólido sai fechado com o
   volume igual à área externa vezes a espessura (gate 4), a gaiola adensa só perto do vinco, a superfície segue a forma
   desenhada tanto onde a gaiola é fina quanto onde é grossa, a leitura de ondulação não acha falha acima de 0,3 mm fora
   do que a forma declara, e os pontos da gaiola, que moram em TOPO, seguem a TABELA quando ela muda. */
import { describe, expect, it } from 'vitest';
import receita, { derivar, forma, gerarPassos, TABELA } from './receita.js';
import { enderecosPorIndice } from '../../nucleo/operacoes/subdivisao.js';
import { neutroCanonico, nucleo } from '../../nucleo/entrada.js';
import { area, volume } from '../../nucleo/fixtures/medidas-de-malha.js';
import { executarReceita } from '../../../src/autoria/executar-receita.js';
import { receitaComParametros } from '../../../src/autoria/parametros-vivos.js';
import { analisarTopologia } from '../../nucleo/topologia.js';
import { ondulacaoDaReceita } from '../../../tools/modelar/ondulacao-da-superficie.mjs';

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const malha = (neutro) => {
  const ids = [...neutro.V.keys()]; const indice = new Map(ids.map((id, k) => [id, k]));
  return { vertices: ids.map((id) => neutro.V.get(id)), faces: [...neutro.F.values()].map((f) => f.vs.map((v) => indice.get(v))) };
};
const passoDaSubdivisao = (passos) => passos.find(([op]) => op === 'subdivisao')[1];

describe('carenagem de prova', () => {
  const { neutro } = executarReceita(receita);
  const M = malha(neutro);

  it('a receita só endereça a gaiola por nome, sem índice de vértice, face, vinco, canto ou medida', () => {
    const passo = passoDaSubdivisao(receita.PASSOS);
    expect(enderecosPorIndice(passo)).toEqual([]);
    expect(JSON.stringify([passo.vertices, passo.faces, passo.vincos.map((v) => v.pontos), passo.cantos, passo.medidas])).not.toMatch(/[[,]-?\d/);
    expect(passo.vincos.map((v) => [v.nome, v.nitidez])).toEqual([['linhaDeCintura', 'viva'], ['ombro', TABELA.ombro_nitidez]]);
  });

  it('a gaiola adensa só perto do vinco, com pentágonos e triângulos na transição', () => {
    const { passo } = derivar(TABELA);
    const lados = {};
    for (const f of passo.faces) lados[f.length] = (lados[f.length] ?? 0) + 1;
    expect(passo.vertices).toHaveLength(583);
    expect(lados).toEqual({ 3: 4, 4: 516, 5: 4 });
    expect(neutro.orfaos).toEqual([]);
    expect(M.vertices).toHaveLength(34174);
  });

  it('todo ponto da gaiola é medida, e cada cota da TABELA é vértice da malha a menos de 1e-6 m, com a imagem espelhada', () => {
    const { cotas, passo } = derivar(TABELA);
    expect(passo.medidas).toEqual(passo.vertices);
    for (const nome of Object.keys(cotas)) expect(passo.medidas).toContain(nome);
    expect(cotas.meio_centro[1]).toBe(TABELA.teto_altura);
    expect(cotas.meio_ombro[1]).toBe(TABELA.ombro_altura);
    expect(cotas.meio_soleira).toEqual([TABELA.soleira_meia_largura, TABELA.borda_altura, TABELA.comprimento / 2]);
    expect(cotas.arcoTopo_soleira[1]).toBe(TABELA.borda_altura + TABELA.arco_altura);
    for (const cota of Object.values(cotas)) {
      const p = cota.map((x) => x / 1000);
      const imagem = [-p[0], p[1], p[2]];
      expect(Math.min(...M.vertices.map((v) => dist(v, p)))).toBeLessThan(1e-6);
      expect(Math.min(...M.vertices.map((v) => dist(v, imagem)))).toBeLessThan(1e-6);
    }
  });

  it('sai fechada, sem achado de topologia, com volume igual à área externa vezes a espessura a 2%', () => {
    const topologia = analisarTopologia({ vertices: neutro.V, faces: neutro.F });
    expect(topologia.veredito).toBe('aprova');
    expect(topologia.resumo.bordas).toBe(0);
    expect(topologia.resumo.componentes).toBe(1);
    const semEspessura = receita.PASSOS.map(([op, a]) => {
      if (op !== 'subdivisao') return [op, a];
      const { espessura, ...resto } = a;
      return [op, resto];
    });
    const S = malha(nucleo(semEspessura, receita.PARAMS, receita.TOPO));
    const A = area(S.vertices, S.faces); const V = volume(M.vertices, M.faces);
    expect(A).toBeGreaterThan(6.3);
    expect(Math.abs(V / (A * TABELA.espessura / 1000) - 1)).toBeLessThan(0.02);
  });

  /* Só com as sete cotas medidas, a superfície ficava para dentro das amostras da forma cerca de curvatura × passo² / 6:
     4,5 mm onde as colunas são grossas e 0,3 mm na faixa fina junto do vinco, que saltava para fora do resto da lateral
     como um degrau de 4,5 mm (de −6,2 a +3,1 mm contra a forma), e cada cota virava um calombo isolado. Com todos os
     pontos medidos e o pé da saliência da cintura sem quina, a lateral fica a 0,94 mm da forma (no começo do arco da
     frente da faixa fina) e o teto a 1,88 mm, no canto do vão, que a superfície arredonda; as tolerâncias têm folga de
     cerca de um quarto sobre esses valores. */
  it('a superfície segue a forma desenhada a até 1,2 mm na lateral e 2,2 mm no teto, fora do arredondamento do ombro', () => {
    const semEspessura = receita.PASSOS.map(([op, a]) => {
      if (op !== 'subdivisao') return [op, a];
      const { espessura, ...resto } = a;
      return [op, resto];
    });
    const S = malha(nucleo(semEspessura, receita.PARAMS, receita.TOPO));
    const f = forma(TABELA);
    let lateral = 0, teto = 0, nLateral = 0, nTeto = 0;
    for (const p of S.vertices) {
      const [x, y, z] = p.map((c) => c * 1000);
      if (x <= 0) continue;
      const altura = f.altura(z); const ombroY = TABELA.borda_altura + altura; const ombroX = f.perfil(z, 1);
      if (y <= ombroY - 40 && x > ombroX) {
        lateral = Math.max(lateral, Math.abs(x - f.perfil(z, (y - TABELA.borda_altura) / altura))); nLateral += 1;
      } else if (y > ombroY && x < ombroX - 40) {
        teto = Math.max(teto, Math.abs(y - f.teto(z, 1 - x / ombroX)[1])); nTeto += 1;
      }
    }
    expect(nLateral).toBeGreaterThan(3000);
    expect(nTeto).toBeGreaterThan(2000);
    expect(lateral).toBeLessThan(1.2);
    expect(teto).toBeLessThan(2.2);
  });

  /* A leitura de ondulação compara cada vértice com uma versão suavizada local, a três espaçamentos da gaiola. Com a
     saliência da cintura de rampa linear e pé em quina, e com a lateral longe do vinco a 175 mm de coluna, fundida em
     triângulos depois do vão, ela acusava cinco falhas de 0,48 a 1,05 mm fora do que a forma declara. */
  it('a leitura de ondulação não acha falha acima de 0,3 mm fora do que a forma declara', () => {
    const leitura = ondulacaoDaReceita(receita);
    expect(leitura.superficies).toHaveLength(1);
    expect(leitura.superficies[0].falhas).toEqual([]);
    expect(leitura.falhas).toBe(0);
    expect(leitura.superficies[0].desvioMm.maximo).toBeLessThan(0.3);
  }, 120_000);

  it('a mesma receita dá a mesma malha, e os pontos da gaiola seguem a TABELA que muda', () => {
    expect(JSON.stringify(neutroCanonico(executarReceita(receita).neutro))).toBe(JSON.stringify(neutroCanonico(neutro)));
    const maisLonga = receitaComParametros(receita, { ...TABELA, comprimento: 2500 });
    const zs = [...executarReceita(maisLonga).neutro.V.values()].map((p) => p[2]);
    expect(Math.max(...zs)).toBeCloseTo(2.5, 9);
    const passoLongo = passoDaSubdivisao(maisLonga.PASSOS);
    expect(passoLongo.medidas).toEqual(passoLongo.vertices);
    for (const nome of Object.keys(derivar(TABELA).cotas)) expect(passoLongo.medidas).toContain(nome);
  });

  it('a cintura fora da faixa das colunas finas e duas cotas na mesma estação gritam com os nomes', () => {
    expect(() => gerarPassos({ ...TABELA, cintura_altura: 700 })).toThrow(/cintura_altura 700 não deixa sete colunas abaixo da cintura e cinco acima dela \(a cintura vai de 406\.25 a 581\.25 mm\)/);
    expect(() => gerarPassos({ ...TABELA, arco_altura: 300 })).toThrow(/arco_altura 300 cruza as colunas da lateral acima do arco; o arco precisa ficar abaixo de 243\.75 mm/);
    expect(() => gerarPassos({ ...TABELA, comprimento: 2600 })).toThrow(/as estações 'meio' e 'vaoInicio' caem na mesma posição, z 1300 mm/);
  });
});
