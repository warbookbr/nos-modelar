/* familias.test.js — o registro explícito de famílias e a porta `chamar` ponta a ponta: uma receita com
   `get CHAMADAS_COMPOSICOES` chama a família de prova, executa e gera a peça; os mesmos parâmetros dão o mesmo hash da
   malha; cada recusa diz o motivo e não gera malha; o `derivar` escolhe a composição pelo parâmetro. */
import { describe, expect, it } from 'vitest';
import { executarReceita } from '../../src/autoria/executar-receita.js';
import { sha256Hex } from '../nucleo/sha256.js';
import { neutroCanonico } from '../nucleo/entrada.js';
import { ErroFamilia } from '../../src/autoria/familia.js';
import { COMPOSICOES, ID_BARRA, ID_TUBO } from '../../tools/fixtures/familia-chamavel/composicoes.js';
import { TUBO_DE_PROVA, receitaDoTubo } from '../../tools/fixtures/familia-chamavel/familia.js';
import { EXTENSOES_NATIVAS, FAMILIAS, ErroChamadaDeFamilia, chamar, criarRegistroDeFamilias } from './index.js';

const registro = criarRegistroDeFamilias({ familias: [TUBO_DE_PROVA] });
const rodar = (parametros) => executarReceita(receitaDoTubo(parametros), registro);
const hash = (neutro) => sha256Hex(JSON.stringify(neutroCanonico(neutro)));

const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
function volume(n) {
  let v = 0;
  for (const f of n.F.values()) {
    for (let k = 1; k < f.vs.length - 1; k++) {
      const c = cross(n.V.get(f.vs[k]), n.V.get(f.vs[k + 1]));
      const a = n.V.get(f.vs[0]);
      v += (a[0] * c[0] + a[1] * c[1] + a[2] * c[2]) / 6;
    }
  }
  return v;
}
const alturas = (n) => { const ys = [...n.V.values()].map((p) => p[1]); return [Math.min(...ys), Math.max(...ys)]; };
const recusa = (parametros) => {
  try { rodar(parametros); } catch (erro) { return erro; }
  throw new Error('a chamada devia ser recusada');
};
/* área de um polígono regular de n lados e raio circunscrito r */
const areaRegular = (n, r) => 0.5 * n * r * r * Math.sin((2 * Math.PI) / n);

describe('o registro de famílias', () => {
  it('traz as quatro extensões nativas e as composições da família, e o registro do produto só traz famílias de ids distintos', () => {
    expect(EXTENSOES_NATIVAS.map(({ manifesto }) => manifesto.operacao.nome)).toEqual(['casca', 'chapaDobrada', 'estruturaDeBarras', 'articulacao']);
    for (const { manifesto } of EXTENSOES_NATIVAS) expect(registro.registroOperacoes.resolver(manifesto.operacao.nome)).toBeTruthy();
    expect(registro.registroComposicoes.listar().map(({ id }) => id)).toEqual([ID_BARRA, ID_TUBO].sort());
    expect(registro.familias).toEqual(['tubo-de-prova']);
    expect(registro.obter('tubo-de-prova')).toBe(TUBO_DE_PROVA);
    expect(new Set(FAMILIAS.map(({ contrato }) => contrato.id)).size).toBe(FAMILIAS.length);
  });

  it('recusa lista vazia, família repetida e família que não existe, dizendo o que é aceito', () => {
    expect(() => criarRegistroDeFamilias({ familias: [] })).toThrow(/familias recebeu \[\]; aceito: lista com ao menos uma família/);
    expect(() => criarRegistroDeFamilias({ familias: [TUBO_DE_PROVA, TUBO_DE_PROVA] })).toThrow(/família 'tubo-de-prova': familias recebeu "tubo-de-prova"; aceito: família registrada uma vez só/);
    expect(() => registro.obter('roda')).toThrow(/familia recebeu "roda"; aceito: uma família registrada: tubo-de-prova/);
  });

  it('cada chamada devolve registros novos, sem estado global', () => {
    const outro = criarRegistroDeFamilias({ familias: [TUBO_DE_PROVA] });
    expect(outro.registroComposicoes).not.toBe(registro.registroComposicoes);
    expect(outro.registroComposicoes.assinatura).toBe(registro.registroComposicoes.assinatura);
  });
});

describe('uma receita que chama a família', () => {
  it('executa e gera a peça com as medidas pedidas, em metro', () => {
    const { neutro, entrada, expansao } = rodar({ comprimento: 200, diametro: 50, parede: 4, lados: 32 });
    expect(neutro.orfaos ?? []).toEqual([]);
    expect(neutro.V.size).toBeGreaterThan(0);
    const [baixo, alto] = alturas(neutro);
    expect(alto - baixo).toBeCloseTo(0.2, 9);
    const esperado = (areaRegular(32, 0.025) - areaRegular(32, 0.021)) * 0.2;
    expect(volume(neutro)).toBeCloseTo(esperado, 9);
    expect(entrada.COMPOSICAO.chamadas).toEqual([{ id: 'corpo', composicao: ID_TUBO, argumentos: expect.objectContaining({ raio: 0.025, raioInterno: 0.021, comprimento: 0.2, lados: 32 }) }]);
    expect(expansao.procedencia.nos.every(({ composicao }) => composicao === ID_TUBO)).toBe(true);
  });

  it('dá o mesmo hash da malha em duas chamadas e em duas receitas novas', () => {
    const parametros = { comprimento: 150, diametro: 60, parede: 5 };
    const a = hash(rodar(parametros).neutro);
    expect(hash(rodar(parametros).neutro)).toBe(a);
    expect(hash(executarReceita(receitaDoTubo(parametros), criarRegistroDeFamilias({ familias: [TUBO_DE_PROVA] })).neutro)).toBe(a);
    expect(hash(rodar({ ...parametros, diametro: 61 }).neutro)).not.toBe(a);
  });

  it('sem parâmetro nenhum usa os padrões da família', () => {
    const padroes = Object.fromEntries(Object.entries(TUBO_DE_PROVA.contrato.parametros).map(([nome, { padrao }]) => [nome, padrao]));
    expect(hash(rodar({}).neutro)).toBe(hash(rodar(padroes).neutro));
  });
});

describe('o derivar escolhe a composição pelo parâmetro', () => {
  it('parede 0 é a barra maciça e parede maior que 0 é o tubo, com volumes que fecham', () => {
    const barra = rodar({ comprimento: 100, diametro: 40, parede: 0 });
    const tubo = rodar({ comprimento: 100, diametro: 40, parede: 3 });
    expect(barra.expansao.chamadas.map(({ composicao }) => composicao)).toEqual([ID_BARRA]);
    expect(tubo.expansao.chamadas.map(({ composicao }) => composicao)).toEqual([ID_TUBO]);
    expect(volume(barra.neutro)).toBeCloseTo(areaRegular(24, 0.02) * 0.1, 9);
    expect(volume(tubo.neutro)).toBeCloseTo((areaRegular(24, 0.02) - areaRegular(24, 0.017)) * 0.1, 9);
    expect(hash(barra.neutro)).not.toBe(hash(tubo.neutro));
    expect(chamar(TUBO_DE_PROVA, 'a', { parede: 0 }).composicao).toBe(ID_BARRA);
    expect(chamar(TUBO_DE_PROVA, 'a', { parede: 0.5 }).composicao).toBe(ID_TUBO);
  });
});

describe('as recusas dizem o motivo e não geram malha', () => {
  it('parâmetro desconhecido', () => {
    const erro = recusa({ comprimento: 100, espessura: 3 });
    expect(erro).toBeInstanceOf(ErroChamadaDeFamilia);
    expect(erro).toBeInstanceOf(ErroFamilia);
    expect(erro.message).toBe("família 'tubo-de-prova': parametros.espessura recebeu 3; aceito: parâmetro conhecido da família: comprimento, diametro, lados, parede.");
  });

  it('valor fora da faixa, fora do tipo e não numérico', () => {
    expect(recusa({ diametro: 250 }).message).toBe("família 'tubo-de-prova': parametros.diametro recebeu 250; aceito: valor em mm dentro da faixa [10, 200].");
    expect(recusa({ parede: -1 }).message).toMatch(/parametros\.parede recebeu -1; aceito: valor em mm dentro da faixa \[0, 40\]/);
    expect(recusa({ lados: 12.5 }).message).toMatch(/parametros\.lados recebeu 12\.5; aceito: número inteiro \(contagem\), entre 8 e 64/);
    expect(recusa({ lados: 4 }).message).toMatch(/parametros\.lados recebeu 4; aceito: valor em contagem dentro da faixa \[8, 64\]/);
    expect(recusa({ diametro: '40' }).message).toMatch(/parametros\.diametro recebeu "40"; aceito: número finito em mm/);
    expect(recusa({ diametro: NaN }).message).toMatch(/parametros\.diametro recebeu null; aceito: número finito em mm/);
  });

  it('restrição violada, com o motivo que a família declara', () => {
    const erro = recusa({ diametro: 30, parede: 15 });
    expect(erro.restricao).toBe('parede-nao-fecha-o-furo');
    expect(erro.motivo).toBe('a parede de cada lado somada passa do diâmetro e fecha o furo; use parede 0 para a barra maciça');
    expect(erro.message).toBe("família 'tubo-de-prova': restricao 'parede-nao-fecha-o-furo' recebeu {\"diametro\":30,\"parede\":15}; aceito: parede * 2 < diametro (o lado esquerdo vale 30 e o direito 30): a parede de cada lado somada passa do diâmetro e fecha o furo; use parede 0 para a barra maciça.");
    expect(recusa({ comprimento: 20, diametro: 60, parede: 0 }).restricao).toBe('mais-comprido-que-largo');
  });

  it('a recusa acontece antes de qualquer passo: a receita não chega ao núcleo', () => {
    for (const parametros of [{ espessura: 1 }, { diametro: 999 }, { diametro: 30, parede: 15 }]) {
      const receita = receitaDoTubo(parametros);
      let neutro = null;
      expect(() => { neutro = executarReceita(receita, registro).neutro; }).toThrow(ErroChamadaDeFamilia);
      expect(neutro).toBeNull();
    }
  });
});

describe('o registro de famílias aceita as composições de duas famílias', () => {
  it('rejeita composição repetida entre famílias', () => {
    expect(() => criarRegistroDeFamilias({ familias: [TUBO_DE_PROVA, { ...TUBO_DE_PROVA, contrato: { ...TUBO_DE_PROVA.contrato, id: 'outro' } }] })).toThrow(/composição duplicada/);
    expect(COMPOSICOES).toHaveLength(2);
  });
});
