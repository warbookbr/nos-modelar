/* familia-com-esboco.test.mjs — a conferência da família com o componente do esboço de mesmo nome, ponta a ponta: o
   componente `roda` do esboço expandido nos parâmetros da família, traduzido para o andaime do nível zero e conferido pelo
   REFINA contra a peça que a família gera (`chamar` e `executarReceita`, com o registro de composições).

   A prova: a família `roda-com-esboco` (tools/fixtures/familia-com-esboco), cujo pneu, disco e cubos repetem o que o
   componente `roda` desenha, passa no mínimo, no ponto médio e no máximo; a mesma família com o pneu engordado além do
   volume do esboço reprova nos três, com a parte, o volume, o lado e o desvio; a porta deslocada reprova com o desvio; a
   família sem `esboco` é dispensada, dizendo que não tem vínculo. O componente é o `roda` porque o pneu (anel), o disco e os
   cubos (cilindros) traduzem sem perda e o `roda` já traz a mesma roda de eixo em x que a família desenha. */
import { describe, expect, it } from 'vitest';
import { lerFamilia } from '../../src/autoria/familia.js';
import { TUBO_DE_PROVA } from '../fixtures/familia-chamavel/familia.js';
import { CONTRATO_DA_RODA, RODA_COM_ESBOCO, criarRodaDeProva } from '../fixtures/familia-com-esboco/familia.js';
import { andaimeDoEsboco } from './esboco-para-andaime.mjs';
import { esbocoMinimo, pontosDaFamilia } from '../../src/autoria/familia-esboco.js';
import { conferirFamiliaComEsboco, conferirFamiliaNosTresPontos, descreverConferenciaDaFamilia } from './familia-com-esboco.mjs';

const copia = (x) => JSON.parse(JSON.stringify(x));
const comContrato = (mudar, defeito) => {
  const contrato = copia(CONTRATO_DA_RODA);
  mudar(contrato);
  return criarRodaDeProva({ contrato, defeito });
};
const LADOS_DO_PNEU = ['+y', '+z', '-y', '-z'];

describe('a família que bate com o componente do esboço', () => {
  const resultado = conferirFamiliaNosTresPontos({ familia: RODA_COM_ESBOCO });

  it('passa no mínimo, no ponto médio e no máximo', () => {
    expect(resultado.estado).toBe('conferida');
    expect(resultado.ok).toBe(true);
    expect(resultado.pontos.map((p) => [p.ponto, p.estado, p.achados.length])).toEqual([['minimo', 'conferida', 0], ['medio', 'conferida', 0], ['maximo', 'conferida', 0]]);
    expect(resultado.pontos.map((p) => p.parametros)).toEqual(pontosDaFamilia(RODA_COM_ESBOCO.contrato).map((p) => p.parametros));
  });

  it('mede as quatro partes dentro do volume e as duas portas no lugar, em cada ponto', () => {
    for (const ponto of resultado.pontos) {
      expect(ponto.partes.map((p) => [p.parte, p.volume])).toEqual([
        ['cuboD', 'roda-cubo-d'], ['cuboE', 'roda-cubo-e'], ['disco', 'roda-disco'], ['pneu', 'roda-pneu'],
      ]);
      for (const parte of ponto.partes) expect(parte.excessoMm, `${ponto.ponto} ${parte.parte}`).toBeLessThanOrEqual(1e-6);
      expect(ponto.portas).toEqual([{ id: 'assento-do-pneu', estado: 'no-lugar' }, { id: 'cubo-externo', estado: 'no-lugar' }]);
      expect(ponto.portasSemVinculo).toEqual([]);
    }
  });

  it('o andaime sai do componente nos parâmetros do ponto: o pneu do esboço tem o diâmetro e a largura da família', () => {
    for (const { ponto, parametros } of pontosDaFamilia(RODA_COM_ESBOCO.contrato)) {
      const { andaime, tabela } = andaimeDoEsboco(esbocoMinimo(RODA_COM_ESBOCO.contrato, parametros));
      const pneu = andaime.volumes.find((v) => v.id === tabela['roda.pneu']);
      expect(pneu, ponto).toMatchObject({ tipo: 'anel', raioExterno: parametros.diametro / 2, raioInterno: parametros.aro / 2, espessura: parametros.largura });
    }
  });

  it('o resultado é o mesmo em duas chamadas e o texto diz os três pontos', () => {
    expect(JSON.stringify(conferirFamiliaNosTresPontos({ familia: RODA_COM_ESBOCO }))).toBe(JSON.stringify(resultado));
    expect(descreverConferenciaDaFamilia(resultado).split('\n')).toEqual([
      'minimo (aro=200, diametro=300, largura=60): dentro do esboço',
      'medio (aro=400, diametro=600, largura=200): dentro do esboço',
      'maximo (aro=600, diametro=900, largura=400): dentro do esboço',
    ]);
  });

  it('confere também um ponto qualquer da faixa, com os parâmetros que diferem dos padrões', () => {
    const r = conferirFamiliaComEsboco({ familia: RODA_COM_ESBOCO, parametros: { diametro: 700, largura: 150 } });
    expect(r).toMatchObject({ estado: 'conferida', ok: true, parametros: { diametro: 700, aro: 420, largura: 150 } });
  });
});

describe('a família com uma parte maior que o envelope do esboço', () => {
  const engordada = criarRodaDeProva({ defeito: { excessoDoPneu: 30 } });
  const resultado = conferirFamiliaNosTresPontos({ familia: engordada });

  it('reprova nos três pontos, dizendo a parte, o volume, o lado e o desvio', () => {
    expect(resultado.estado).toBe('reprovada');
    for (const ponto of resultado.pontos) {
      expect(ponto.estado, ponto.ponto).toBe('reprovada');
      const fora = ponto.achados.filter((a) => a.codigo === 'parte-fora-do-envelope');
      expect(fora.map((a) => a.lado).sort(), ponto.ponto).toEqual(LADOS_DO_PNEU);
      for (const a of fora) {
        expect(a).toMatchObject({ parte: 'pneu', volume: 'roda-pneu', forma: 'pneu' });
        expect(a.desvio).toBeCloseTo(30, 6);
        expect(a.mensagem).toMatch(new RegExp(`a parte 'pneu' sai do envelope do volume 'roda-pneu' em \\${a.lado} por 30 mm \\(tolerância 1 mm\\)`));
        expect(a.mensagem).toMatch(/o volume 'roda-pneu' do andaime é a forma 'pneu' do componente 'roda'/);
      }
      expect(ponto.achados.filter((a) => a.parte !== undefined && a.parte !== 'pneu')).toEqual([]);
    }
  });

  it('o excesso é medido na peça: o raio do pneu a mais é o desvio, ponto a ponto', () => {
    const r = conferirFamiliaComEsboco({ familia: criarRodaDeProva({ defeito: { excessoDoPneu: 7 } }), parametros: { diametro: 800 } });
    const fora = r.achados.filter((a) => a.codigo === 'parte-fora-do-envelope');
    expect(fora).toHaveLength(4);
    for (const a of fora) expect(a.desvio).toBeCloseTo(7, 6);
  });

  it('um excesso dentro da tolerância declarada passa, e um pouco além reprova', () => {
    const folgada = (mm) => comContrato((c) => { c.esboco.conferencia.tolerancia = { envelope: 1, porta: 1 }; }, { excessoDoPneu: mm });
    const dentro = conferirFamiliaComEsboco({ familia: folgada(0.9) });
    expect(dentro.ok).toBe(true);
    expect(dentro.partes.find((p) => p.parte === 'pneu').excessoMm).toBeCloseTo(0.9, 6);
    const acima = conferirFamiliaComEsboco({ familia: folgada(1.1) });
    expect(acima.ok).toBe(false);
    expect(acima.achados.filter((a) => a.codigo === 'parte-fora-do-envelope')).toHaveLength(4);
  });

  it('a tolerância é a que a família declara', () => {
    expect(conferirFamiliaComEsboco({ familia: criarRodaDeProva({ defeito: { excessoDoPneu: 4 } }) }).ok).toBe(false);
    const folgada = comContrato((c) => { c.esboco.conferencia.tolerancia = { envelope: 5, porta: 5 }; }, { excessoDoPneu: 4 });
    expect(conferirFamiliaNosTresPontos({ familia: folgada }).ok).toBe(true);
  });

  it('o texto lista cada achado com a parte, o volume, o lado e o desvio', () => {
    const texto = descreverConferenciaDaFamilia(resultado);
    expect(texto).toMatch(/^minimo \(aro=200, diametro=300, largura=60\): 5 achado\(s\)$/m);
    expect(texto).toMatch(/parte-fora-do-envelope: a parte 'pneu' sai do envelope do volume 'roda-pneu' em \+y por 30 mm/);
  });
});

describe('a porta', () => {
  it('fora do lugar que o esboço dá reprova com o desvio', () => {
    const r = conferirFamiliaComEsboco({ familia: criarRodaDeProva({ defeito: { excessoDoAssento: 10 } }) });
    expect(r.estado).toBe('reprovada');
    const achado = r.achados.find((a) => a.codigo === 'porta-fora-do-lugar');
    expect(achado).toMatchObject({ porta: 'assento-do-pneu', volume: 'roda-pneu', forma: 'pneu' });
    expect(achado.desvio).toBeCloseTo(10, 6);
    expect(achado.mensagem).toMatch(/raioExterno: o andaime declara 305 e a peça publica 315 \(desvio 10 mm, tolerância 0\.5 mm\)/);
    expect(r.portas).toEqual([{ id: 'assento-do-pneu', estado: 'reprovada' }, { id: 'cubo-externo', estado: 'no-lugar' }]);
  });

  it('o lado escolhe a face: a porta do cubo da direita no lado -x não está onde a peça a publica', () => {
    const r = conferirFamiliaComEsboco({ familia: comContrato((c) => { c.esboco.conferencia.portas[1].lado = '-x'; }) });
    const achado = r.achados.find((a) => a.porta === 'cubo-externo' && a.codigo === 'porta-fora-do-lugar');
    expect(achado.mensagem).toMatch(/eixo/);
    expect(achado.mensagem).toMatch(/centro/);
    expect(r.ok).toBe(false);
  });

  it('um lado que não é extremidade do volume, ou volume que não dá interface, é dito sem chamar de fora do lugar', () => {
    const lado = conferirFamiliaComEsboco({ familia: comContrato((c) => { c.esboco.conferencia.portas[0].lado = '+y'; }) });
    expect(lado.achados.find((a) => a.codigo === 'porta-sem-interface').mensagem)
      .toMatch(/a porta 'assento-do-pneu' \(anel\) não tem interface no volume 'pneu' do componente: o lado '\+y' não é uma extremidade do volume, cujo eixo é x; escolha \+x ou -x/);
    const caixa = conferirFamiliaComEsboco({ familia: comContrato((c) => { c.esboco.conferencia.portas[0].volume = 'inexistente'; }) });
    expect(caixa.achados.find((a) => a.porta === 'assento-do-pneu')).toMatchObject({ codigo: 'volume-sem-andaime', forma: 'inexistente' });
    expect(caixa.achados[0].mensagem).toMatch(/volumes: cuboD, cuboE, disco, pneu/);
  });

  it('a porta da família que não está ligada a volume é listada como sem vínculo, e não reprova', () => {
    const familia = comContrato((c) => {
      c.portas.push({ id: 'face-do-disco', tipo: 'plano', papel: 'apoia' });
    });
    const r = conferirFamiliaComEsboco({ familia });
    expect(r.ok).toBe(true);
    expect(r.portasSemVinculo).toEqual(['face-do-disco']);
    expect(descreverConferenciaDaFamilia({ ...r, pontos: [{ ponto: 'medio', ...r }] })).toMatch(/portas sem vínculo com o esboço: face-do-disco/);
  });

  it('a conferência sem porta ligada só confere as partes', () => {
    const r = conferirFamiliaComEsboco({ familia: comContrato((c) => { delete c.esboco.conferencia.portas; }) });
    expect(r.ok).toBe(true);
    expect(r.portas).toEqual([]);
    expect(r.portasSemVinculo).toEqual(['assento-do-pneu', 'cubo-externo']);
  });
});

describe('o que a conferência não tem como fazer', () => {
  it('família sem esboco é dispensada, dizendo que não tem vínculo', () => {
    const um = conferirFamiliaComEsboco({ familia: TUBO_DE_PROVA });
    expect(um).toMatchObject({ estado: 'dispensada', ok: true, achados: [] });
    expect(um.motivo).toMatch(/família 'tubo-de-prova' não declara 'esboco': não tem vínculo com um componente do esboço/);
    const tres = conferirFamiliaNosTresPontos({ familia: TUBO_DE_PROVA });
    expect(tres).toMatchObject({ estado: 'dispensada', ok: true, pontos: [] });
    expect(descreverConferenciaDaFamilia(tres)).toMatch(/^dispensada: .*não tem vínculo/);
  });

  it('família com esboço e sem a declaração dos pares também é dispensada', () => {
    const familia = comContrato((c) => { delete c.esboco.conferencia; });
    expect(conferirFamiliaNosTresPontos({ familia }).estado).toBe('dispensada');
  });

  it('parâmetros que a família recusa viram o achado chamada-recusada, com o motivo da restrição', () => {
    const r = conferirFamiliaComEsboco({ familia: RODA_COM_ESBOCO, parametros: { aro: 500, diametro: 520 } });
    expect(r.estado).toBe('reprovada');
    expect(r.achados).toHaveLength(1);
    expect(r.achados[0].codigo).toBe('chamada-recusada');
    expect(r.achados[0].mensagem).toMatch(/o pneu precisa de ao menos 20 mm de parede de cada lado do aro/);
  });

  it('o contrato lido tem a mesma conferência que o escrito', () => {
    expect(RODA_COM_ESBOCO.contrato).toEqual(lerFamilia(CONTRATO_DA_RODA));
  });
});
