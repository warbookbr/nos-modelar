/* roupeiro.test.mjs — a família `roupeiro`: contrato, recusas, a malha medida contra as contas, a parede da casca, as
   dobradiças por dentro da parede, a montagem v5 resolvida pelo resolvedor real, o curso de cada porta conferido contra as
   malhas e a abertura de várias portas ao mesmo tempo. */
import { describe, expect, it } from 'vitest';
import { neutroCanonico } from '../../nucleo/entrada.js';
import { sha256Hex } from '../../nucleo/sha256.js';
import { auditarParDeSolidos, prepararSolido } from '../../../src/autoria/contato-de-solidos.js';
import { conferirArticulacao } from '../../../src/autoria/conferir-articulacao.js';
import { executarReceita } from '../../../src/autoria/executar-receita.js';
import { FORMATO, VERSAO, parteDaFace } from '../../../src/autoria/ler-peca-resolvida.js';
import { resolverMontagemPersistida } from '../../../src/autoria/resolver-montagem-persistida.js';
import { execucaoDe, invariantesDe } from '../../../src/autoria/varrer-parametros.js';
import { descreverPeca } from '../../../src/autoria/descrever-partes.js';
import { medirPonto, pontosDaFamilia } from '../../../tools/mecanifica/aprovacao-da-familia.mjs';
import { resolverMontagemDaFamilia } from '../../../tools/mecanifica/montagem-da-familia.mjs';
import { ErroChamadaDeFamilia, FAMILIAS, chamar, criarRegistroDeFamilias } from '../index.js';
import { DOBRADICA } from '../dobradica/index.js';
import { ROUPEIRO } from './index.js';
import {
  CURSO_NA_LATERAL, FOLGA_DA_PORTA, alturaDaPorta, cursoNaDivisoria, dobradicaDaPorta, geometriaDoRoupeiro, larguraDaPorta, pesoDaPorta,
} from './geometria.js';

const registro = criarRegistroDeFamilias({ familias: [ROUPEIRO] });
const execucao = execucaoDe({ registroComposicoes: registro.registroComposicoes, registroOperacoes: registro.registroOperacoes });
const MATERIAIS = { painel: { cor: '#c9a679' }, porta: { cor: '#e6dfd0' }, chapa: { cor: '#8e98a3' }, pino: { cor: '#c9ccd1' } };
const MM = 0.001;
const conjunto = (parametros = {}) => executarReceita({ meta: { nome: 'roupeiro' }, CHAMADAS_COMPOSICOES: [chamar(ROUPEIRO, 'corpo', parametros)], MATERIAIS }, execucao).neutro;
const hash = (neutro) => sha256Hex(JSON.stringify(neutroCanonico(neutro)));
const recusa = (parametros) => { try { chamar(ROUPEIRO, 'corpo', parametros); } catch (erro) { return erro; } throw new Error('a chamada devia ser recusada'); };
const caixa = (neutro) => {
  const v = [...neutro.V.values()];
  return [0, 1, 2].map((i) => [Math.min(...v.map((p) => p[i])), Math.max(...v.map((p) => p[i]))]);
};
const completos = (parametros = {}) => ({ ...Object.fromEntries(Object.entries(ROUPEIRO.contrato.parametros).map(([nome, { padrao }]) => [nome, padrao])), ...parametros });

/* uma configuração leve (uma porta, três dobradiças) para o curso medido contra as malhas; a de quatro portas é a das aberturas
   simultâneas */
const LEVE = { portas: 1, largura: 600, altura: 1500, prateleiras: 2, cabideiro: 0 };
const QUATRO = { portas: 4, largura: 2400, altura: 2000, prateleiras: 2, cabideiro: 1 };

async function resolver(montada) {
  const carregarPeca = async (ref) => {
    const { neutro: bruto } = executarReceita(montada.receitas[ref], execucao);
    const neutro = neutroCanonico(bruto);
    return { formato: FORMATO, versao: VERSAO, peca: ref, meta: { nome: ref }, materiais: montada.receitas[ref].MATERIAIS, partes: [...new Set(neutro.F.map(parteDaFace).filter(Boolean))].sort(), portas: [...bruto.portas.values()], V: neutro.V, F: neutro.F };
  };
  return resolverMontagemPersistida(montada.montagem, { carregarPeca });
}

describe('o contrato e a chamada', () => {
  it('está registrada em FAMILIAS, é um objeto e publica a porta que declara', () => {
    expect(FAMILIAS.map(({ contrato }) => contrato.id)).toContain('roupeiro');
    expect(ROUPEIRO.contrato.nivel).toBe('objeto');
    expect([...conjunto().portas.keys()]).toEqual(['base-do-rodape']);
  });

  it('recusa cada impossível com o motivo da família', () => {
    expect(recusa({ portas: 5 }).message).toMatch(/parametros\.portas.*\[1, 4\]/);
    expect(recusa({ portas: 2.5 }).message).toMatch(/inteiro/);
    expect(recusa({ portas: 1 })).toMatchObject({ restricao: 'porta-larga-demais' });
    expect(recusa({ largura: 3000 })).toMatchObject({ restricao: 'porta-larga-demais' });
    expect(recusa({ largura: 400 })).toMatchObject({ restricao: 'porta-estreita-demais' });
    expect(recusa({ altura: 2600 })).toMatchObject({ restricao: 'porta-alta-demais' });
    expect(recusa({ prateleiras: 8 })).toMatchObject({ restricao: 'prateleiras-cabem' });
    expect(recusa({ altura: 1200 })).toMatchObject({ restricao: 'prateleiras-cabem' });
    expect(recusa({ cabideiro: 2 })).toBeInstanceOf(ErroChamadaDeFamilia);
    expect(() => ROUPEIRO.montar({ portas: 1 })).toThrow(/porta-larga-demais/);
  });

  it('os três pontos e o padrão são chamáveis, sem órfão nem face sem parte, e a mesma chamada dá a mesma malha', () => {
    const a = conjunto();
    expect(hash(a)).toBe(hash(conjunto()));
    expect(a.orfaos).toEqual([]);
    expect(invariantesDe(descreverPeca(a)).facesSemParte).toBe(0);
    for (const ponto of Object.values(pontosDaFamilia(ROUPEIRO.contrato))) expect(conjunto(ponto).orfaos).toEqual([]);
    for (const portas of [1, 2, 3, 4]) expect(conjunto({ portas, largura: portas * 700 + 100, prateleiras: 0, cabideiro: 0 }).orfaos).toEqual([]);
  });
});

describe('a geometria contra as contas', () => {
  it('o corpo mede a largura, a altura e a profundidade pedidas, e o puxador sai 20 mm da frente', () => {
    const [x, y, z] = caixa(conjunto());
    expect(x.map((v) => v / MM)).toEqual([-800, 800].map((v) => expect.closeTo(v, 6)));
    expect(y.map((v) => v / MM)).toEqual([expect.closeTo(0, 6), expect.closeTo(2200, 6)]);
    expect(z.map((v) => v / MM)).toEqual([expect.closeTo(-275, 6), expect.closeTo(295, 6)]);
  });

  it('a parede da casca é a do painel, medida pela aprovação, nos três pontos', () => {
    for (const [nome, ponto] of Object.entries(pontosDaFamilia(ROUPEIRO.contrato))) {
      const r = medirPonto(ROUPEIRO, ponto, nome, { montagem: 'nenhuma' });
      expect(r.problemas).toEqual([]);
      const casca = r.medidas.find((m) => m.ferramenta === 'casca');
      expect(casca.espessuraMinima).toBeCloseTo(ponto.painel * MM, 9);
      expect(casca.espessuraMaxima).toBeCloseTo(ponto.painel * MM, 9);
    }
  });

  it('cada porta tem a largura, a altura e a folga das contas, e há uma divisória de três portas para cima', () => {
    for (const portas of [1, 2, 3, 4]) {
      const p = completos({ portas, largura: 3000 - (4 - portas) * 600, prateleiras: 0, cabideiro: 0 });
      const g = geometriaDoRoupeiro(p);
      expect(g.portas).toHaveLength(portas);
      expect(Boolean(g.divisoria)).toBe(portas >= 3);
      expect(g.wd).toBeCloseTo(larguraDaPorta(p), 9);
      expect(g.hd).toBeCloseTo(alturaDaPorta(p), 9);
      for (const porta of g.portas) expect(porta.xMax - porta.xMin).toBeCloseTo(g.wd, 9);
      const largurasDeBaia = g.baias.map((baia) => baia.fim - baia.x);
      const soma = largurasDeBaia.reduce((s, v) => s + v, 0) + (g.divisoria ? p.painel : 0);
      expect(soma).toBeCloseTo(p.largura - 2 * p.painel, 9);
      /* folga de 3 mm entre portas vizinhas e entre a porta e a parede */
      const ordenadas = [...g.portas].sort((a, b) => a.xMin - b.xMin);
      expect(ordenadas[0].xMin - g.quadro.x0).toBeCloseTo(FOLGA_DA_PORTA, 9);
      expect(g.quadro.x1 - ordenadas.at(-1).xMax).toBeCloseTo(FOLGA_DA_PORTA, 9);
    }
  });

  it('as peças da montagem têm a caixa das contas: portas à ras da frente, e prateleiras e cabideiro no corpo', () => {
    const montada = ROUPEIRO.montar({});
    const g = montada.geometria;
    const porta = executarReceita(montada.receitas['roupeiro-porta-1'], execucao).neutro;
    const [x, y, z] = caixa(porta);
    expect(x[0] / MM).toBeCloseTo(g.portas[0].xMin, 6);
    expect(x[1] / MM).toBeCloseTo(g.portas[0].xMax, 6);
    expect(y[0] / MM).toBeCloseTo(g.y0, 6);
    expect(y[1] / MM).toBeCloseTo(g.y0 + g.hd, 6);
    expect(z[0] / MM).toBeCloseTo(g.quadro.frente - 18, 6);
    const corpo = executarReceita(montada.receitas['roupeiro-corpo'], execucao).neutro;
    const ys = new Set([...corpo.V.values()].map((v) => Number((v[1] / MM).toFixed(3))));
    const { yPrimeira, passo } = g.prateleiras;
    for (let k = 0; k < 4; k += 1) { expect(ys.has(Number((yPrimeira + k * passo).toFixed(3)))).toBe(true); expect(ys.has(Number((yPrimeira + k * passo + 18).toFixed(3)))).toBe(true); }
    /* o cabideiro: vértices a 12,5 mm do eixo, a 120 mm do tampo */
    const raios = [...corpo.V.values()].filter((v) => Math.abs(Math.hypot(v[1] / MM - g.cabideiro.y, v[2] / MM) - 12.5) < 1e-6 && Math.abs(v[2]) < 12.6 * MM);
    expect(raios.length).toBeGreaterThanOrEqual(16);
    expect(g.cabideiro.y).toBeCloseTo(2200 - 18 - 120, 9);
  });
});

describe('as dobradiças', () => {
  it('são da família dobradica, com parâmetros que crescem com o peso e a altura da porta, e a família as aceita', () => {
    const leve = dobradicaDaPorta({ peso: 4, altura: 800, painel: 18 });
    const pesada = dobradicaDaPorta({ peso: 22, altura: 2300, painel: 18 });
    expect(leve.quantidade).toBe(2);
    expect(pesada.quantidade).toBeGreaterThan(leve.quantidade);
    expect(pesada.parametros.altura).toBeGreaterThan(leve.parametros.altura);
    expect(pesada.parametros.diametroPino).toBeGreaterThan(leve.parametros.diametroPino);
    expect(pesada.parametros.espessura).toBeGreaterThan(leve.parametros.espessura);
    for (const d of [leve, pesada]) expect(() => chamar(DOBRADICA, 'dobradica', d.parametros)).not.toThrow();
    const p = completos();
    const g = geometriaDoRoupeiro(p);
    expect(g.peso).toBeCloseTo(pesoDaPorta(p), 9);
    expect(g.dobradica.quantidade).toBe(g.portas[0].dobradicas.length);
  });

  it('ficam por dentro: o tambor inteiro na espessura da parede e atrás da frente, e nada sai do corpo', () => {
    for (const parametros of [{}, QUATRO, LEVE]) {
      const montada = ROUPEIRO.montar(parametros);
      const g = montada.geometria;
      const raio = g.raioDoTambor * MM;
      for (const porta of g.portas) {
        const t = montada.parametros.painel;
        const parede = { 'lateral-esquerda': [g.quadro.x0 - t, g.quadro.x0], 'lateral-direita': [g.quadro.x1, g.quadro.x1 + t] }[porta.apoio]
          ?? [g.divisoria.esquerda, g.divisoria.direita];
        porta.dobradicas.forEach((dobradica, k) => {
          for (const lado of ['d', 'e']) {
            const neutro = executarReceita(montada.receitas[`roupeiro-dobradica-${porta.indice + 1}-${k + 1}-${lado}`], execucao).neutro;
            const vertices = [...neutro.V.values()].map(([x, y, z]) => [x / MM, y / MM, z / MM]);
            /* atrás da frente do corpo e dentro do corpo */
            for (const [x, , z] of vertices) {
              expect(z).toBeLessThan(g.quadro.frente - 0.4);
              expect(Math.abs(x)).toBeLessThan(montada.parametros.largura / 2);
            }
            /* os vértices do tambor (a menos do raio do nó do pino) ficam na espessura da parede */
            const doTambor = vertices.filter(([x, , z]) => Math.hypot(x - dobradica.x, z - dobradica.z) < raio / MM + 1e-6);
            expect(doTambor.length).toBeGreaterThan(30);
            const xs = doTambor.map(([x]) => x);
            expect(Math.min(...xs)).toBeGreaterThan(Math.min(parede[0], parede[1]) + 0.2);
            expect(Math.max(...xs)).toBeLessThan(Math.max(parede[0], parede[1]) - 0.2);
          }
        });
      }
    }
  });

  /* a chapa da folha da dobradiça sai tangente ao rolo, deslocada do eixo do pino: o rasgo da parede e o da borda da porta se
     centram nela (zDaChapa, da geometria da dobradiça), com a folga de rasgo de cada lado, nos dois lados do vão e na divisória */
  it('a folha fixa fica centrada no rasgo da parede e a móvel no da borda da porta, com a folga de rasgo de cada lado', () => {
    for (const parametros of [{}, QUATRO]) {
      const montada = ROUPEIRO.montar(parametros);
      const g = montada.geometria;
      const corpo = [...executarReceita(montada.receitas['roupeiro-corpo'], execucao).neutro.V.values()].map(([x, y, z]) => [x / MM, y / MM, z / MM]);
      const zDaChapa = g.dobradicaGeometria.mm.zDaChapa;
      const vistos = new Set();
      for (const porta of g.portas) {
        const d = porta.dobradicas[0];
        const metade = g.dobradica.parametros.altura / 2;
        const peca = (lado) => [...executarReceita(montada.receitas[`roupeiro-dobradica-${porta.indice + 1}-1-${lado}`], execucao).neutro.V.values()].map(([x, y, z]) => [x / MM, y / MM, z / MM]);
        /* a folha fixa, no rasgo da parede: as paredes do rasgo são os planos x mais próximos da folha, fundo adentro */
        const fixa = peca('d').filter(([, , z]) => z < d.z - 9);
        const xMin = Math.min(...fixa.map(([x]) => x));
        const xMax = Math.max(...fixa.map(([x]) => x));
        const centroDaFolha = (xMin + xMax) / 2;
        expect(centroDaFolha - d.x).toBeCloseTo(porta.vao * zDaChapa, 6);
        const paredes = [...new Set(corpo.filter(([x, y, z]) => z < d.z - g.raioDoTambor - 1 && Math.abs(x - centroDaFolha) < 2.5 && Math.abs(y - d.y) <= metade + 0.31).map(([x]) => Number(x.toFixed(6))))].sort((a, b) => a - b);
        expect(paredes).toHaveLength(2);
        expect(xMin - paredes[0]).toBeCloseTo(0.2, 5);
        expect(paredes[1] - xMax).toBeCloseTo(0.2, 5);
        /* a folha móvel, no rasgo da borda da porta */
        const movel = peca('e').filter(([x]) => Math.abs(x - d.x) > 9);
        const zMin = Math.min(...movel.map(([, , z]) => z));
        const zMax = Math.max(...movel.map(([, , z]) => z));
        expect((zMin + zMax) / 2 - d.z).toBeCloseTo(-zDaChapa, 6);
        const lage = [...executarReceita(montada.receitas[`roupeiro-porta-${porta.indice + 1}`], execucao).neutro.V.values()].map(([x, y, z]) => [x / MM, y / MM, z / MM]);
        const faces = [...new Set(lage.filter(([x, y, z]) => (x - porta.xDaBorda) * porta.vao > -0.01 && (x - porta.xDaBorda) * porta.vao < 20 && Math.abs(y - d.y) <= metade + 0.31 && z > zMin - 0.5 && z < zMax + 0.5).map(([, , z]) => Number(z.toFixed(6))))].sort((a, b) => a - b);
        expect(faces).toHaveLength(2);
        expect(zMin - faces[0]).toBeCloseTo(0.2, 5);
        expect(faces[1] - zMax).toBeCloseTo(0.2, 5);
        vistos.add(porta.apoio);
      }
      if (parametros === QUATRO) expect([...vistos].sort()).toEqual(['divisoria-direita', 'divisoria-esquerda', 'lateral-direita', 'lateral-esquerda']);
    }
  });

  it('as dobradiças das duas portas que giram nas faces da divisória ficam em alturas diferentes', () => {
    const g = geometriaDoRoupeiro(completos(QUATRO));
    const esquerda = g.portas.find((p) => p.apoio === 'divisoria-esquerda').dobradicas.map((d) => d.y);
    const direita = g.portas.find((p) => p.apoio === 'divisoria-direita').dobradicas.map((d) => d.y);
    const altura = g.dobradica.parametros.altura;
    for (const a of esquerda) for (const b of direita) expect(Math.abs(a - b)).toBeGreaterThan(altura + 20);
  });
});

describe('a montagem v5 e o curso das portas', () => {
  it('resolve pelo resolvedor real sem mudar o formato, com uma articulação por porta e as peças contadas', async () => {
    const montada = ROUPEIRO.montar({});
    expect(montada.montagem).toMatchObject({ formato: 'mecanifica.montagem', versao: 5 });
    const n = montada.geometria.dobradica.quantidade;
    const resolvida = await resolver(montada);
    expect(resolvida.instancias).toHaveLength(1 + 2 + 2 * 2 * n);
    expect(montada.articulacoes.map(({ id }) => id)).toEqual(['abre-porta-1', 'abre-porta-2']);
    for (const articulacao of montada.articulacoes) {
      expect(articulacao.curso).toEqual({ minimo: 0, maximo: CURSO_NA_LATERAL });
      expect(articulacao.acompanham).toHaveLength(n);
    }
    expect(montada.cursoMaximo).toBe(110);
  });

  it('o curso de 0 a 110 graus passa sem colisão e o corpo deixa abrir até onde a conta do encosto diz (a dobradiça toca a parede do rebaixo)', async () => {
    const montada = ROUPEIRO.montar(LEVE);
    const { resolvida, problemas } = resolverMontagemDaFamilia(ROUPEIRO, LEVE, execucao);
    expect(problemas).toEqual([]);
    const r = conferirArticulacao(resolvida, montada.articulacoes[0]);
    expect(r.ok).toBe(true);
    expect(r.colisoes).toEqual([]);
    expect(r.posicoes.at(-1)).toMatchObject({ valor: 110, livre: true });
    expect(r.eixo.direcao).toEqual([0, -1, 0]);
    /* passando do curso a dobradiça móvel bate no corpo, e a bisseção acha o ângulo livre: com a folha tangente ao rolo,
       perto de 156 graus */
    const alem = conferirArticulacao(resolvida, { ...montada.articulacoes[0], curso: { minimo: 0, maximo: 180 }, passos: 18 });
    expect(alem.ok).toBe(false);
    expect(alem.colisoes[0]).toMatchObject({ fixo: ['corpo'], estado: 'interpenetram' });
    expect(alem.primeirasColisoes[0].livreAte).toBeGreaterThan(110);
    expect(alem.primeirasColisoes[0].livreAte).toBeLessThan(170);
  }, 600_000);

  /* a dobradiça é quiral: a porta da direita do vão usa a imagem espelhada (a móvel virada 180 graus em x e a fixa em z), e
     abrir só a primeira porta não via a diferença; por isso cada porta abre no curso máximo e a da direita também passa de
     110 até onde a da esquerda passa */
  it('cada porta de duas portas abre no curso máximo, sem colisão, e a da direita é livre até o mesmo ângulo da da esquerda', () => {
    const DUAS = { portas: 2, largura: 1000, altura: 1500, prateleiras: 2, cabideiro: 0 };
    const montada = ROUPEIRO.montar(DUAS);
    const { resolvida, problemas } = resolverMontagemDaFamilia(ROUPEIRO, DUAS, execucao);
    expect(problemas).toEqual([]);
    expect(montada.articulacoes).toHaveLength(2);
    const livres = [];
    for (const articulacao of montada.articulacoes) {
      const r = conferirArticulacao(resolvida, articulacao);
      expect(r.ok, r.recusa.join(' ')).toBe(true);
      expect(r.posicoes.at(-1)).toMatchObject({ valor: 110, livre: true });
      const alem = conferirArticulacao(resolvida, { ...articulacao, curso: { minimo: 0, maximo: 170 }, passos: 17 });
      livres.push(alem.primeirasColisoes[0].livreAte);
    }
    expect(livres[0]).toBeGreaterThan(150);
    expect(Math.abs(livres[0] - livres[1])).toBeLessThan(0.01);
  }, 900_000);

  it('as portas que giram na divisória abrem no curso máximo da conta, sem colisão, nas duas faces', () => {
    const montada = ROUPEIRO.montar(QUATRO);
    const { resolvida, problemas } = resolverMontagemDaFamilia(ROUPEIRO, QUATRO, execucao);
    expect(problemas).toEqual([]);
    const daDivisoria = montada.articulacoes.filter((_, k) => montada.geometria.portas[k].apoio.startsWith('divisoria'));
    expect(daDivisoria.map(({ id }) => id)).toEqual(['abre-porta-2', 'abre-porta-3']);
    for (const articulacao of daDivisoria) {
      const r = conferirArticulacao(resolvida, articulacao);
      expect(r.ok, r.recusa.join(' ')).toBe(true);
      expect(r.posicoes.at(-1)).toMatchObject({ valor: articulacao.curso.maximo, livre: true });
    }
  }, 900_000);

  it('a mesma chamada dá a mesma montagem', () => {
    const a = resolverMontagemDaFamilia(ROUPEIRO, {}, execucao);
    const b = resolverMontagemDaFamilia(ROUPEIRO, {}, execucao);
    expect(a.hash).toBe(b.hash);
    expect(a.hash).not.toBe(resolverMontagemDaFamilia(ROUPEIRO, { portas: 3, largura: 2400 }, execucao).hash);
  });
});

describe('várias portas abertas ao mesmo tempo', () => {
  function rotacao(eixo, graus) {
    const a = (graus * Math.PI) / 180;
    const c = Math.cos(a); const s = Math.sin(a); const t = 1 - c;
    return [[t * eixo[0] * eixo[0] + c, t * eixo[0] * eixo[1] - s * eixo[2], t * eixo[0] * eixo[2] + s * eixo[1]],
      [t * eixo[0] * eixo[1] + s * eixo[2], t * eixo[1] * eixo[1] + c, t * eixo[1] * eixo[2] - s * eixo[0]],
      [t * eixo[0] * eixo[2] - s * eixo[1], t * eixo[1] * eixo[2] + s * eixo[0], t * eixo[2] * eixo[2] + c]];
  }
  const aplicar = (m, v) => [0, 1, 2].map((i) => m[i][0] * v[0] + m[i][1] * v[1] + m[i][2] * v[2]);

  function preparar(parametros) {
    const { resolvida, gerada } = resolverMontagemDaFamilia(ROUPEIRO, parametros, execucao);
    const g = gerada.geometria;
    const porId = new Map(resolvida.instancias.map((i) => [i.id, i]));
    const solidosNoAngulo = (k, graus) => {
      const porta = g.portas[k];
      const m = rotacao(porta.vao === 1 ? [0, -1, 0] : [0, 1, 0], graus);
      const centro = [porta.xDoPino * MM, 0, g.zDoPino * MM];
      const deslocamento = aplicar(m, [-centro[0], 0, -centro[2]]).map((v, i) => v + centro[i]);
      const articulacao = gerada.articulacoes[k];
      return [articulacao.movel.caminho[0], ...articulacao.acompanham.map((c) => c[0])]
        .map((id) => prepararSolido(porId.get(id).definicao.neutro, { escala: 1, rotacao: m, deslocamento }, [id]));
    };
    const batem = (a, b, graus, outros) => {
      const sa = solidosNoAngulo(a, graus);
      const sb = solidosNoAngulo(b, outros);
      return sa.some((x) => sb.some((y) => ['interpenetram', 'inconclusivo'].includes(auditarParDeSolidos(x, y, 1e-9).estado)));
    };
    return { g, batem };
  }

  it('com quatro portas, nenhum par de portas se toca em nenhuma combinação de ângulos até o curso de cada uma', () => {
    const { g, batem } = preparar(QUATRO);
    const cursos = g.portas.map((p) => p.curso);
    expect(cursos[0]).toBe(110);
    expect(cursos[1]).toBeLessThanOrEqual(90);
    expect(cursos[1]).toBe(cursoNaDivisoria(geometriaDoRoupeiro(completos(QUATRO)), 18));
    for (let a = 0; a < 4; a += 1) for (let b = a + 1; b < 4; b += 1) {
      for (const fa of [0, cursos[a] / 2, cursos[a]]) for (const fb of [0, cursos[b] / 2, cursos[b]]) {
        expect(batem(a, b, fa, fb), `portas ${a + 1} e ${b + 1} a ${fa} e ${fb} graus`).toBe(false);
      }
    }
  }, 600_000);

  it('as duas portas da divisória se tocam acima do curso que a conta deu (80 graus cada), e por isso o curso delas é menor', () => {
    const { g, batem } = preparar(QUATRO);
    expect(g.portas[1].curso).toBeLessThan(80);
    expect(batem(1, 2, 80, 80)).toBe(true);
  }, 600_000);

  it('com três portas, a porta da divisória abre a 90 graus com a vizinha em qualquer ângulo', () => {
    const { g, batem } = preparar({ portas: 3, largura: 2400, altura: 2000, prateleiras: 2, cabideiro: 1 });
    expect(g.portas.map((p) => p.curso)).toEqual([110, 90, 110]);
    for (const a of [0, 40, 90]) for (const b of [0, 40, 110]) expect(batem(1, 2, a, b), `a ${a} e ${b}`).toBe(false);
  }, 600_000);
});
