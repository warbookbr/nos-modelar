/* familia.test.js — o contrato `mecanifica.familia@1`: a fixture válida passa, cada defeito é recusado com o campo, o
   valor e o que é aceito, e a leitura normalizada é determinística. */
import { readFileSync } from 'node:fs';
import Ajv2020 from 'ajv/dist/2020.js';
import { describe, expect, it } from 'vitest';
import { COMPONENTES } from '../../modulos/esboco/componentes/index.js';
import {
  ErroFamilia, FERRAMENTAS_DE_FAMILIA, FORMATO_FAMILIA, LIMITE_DA_TOLERANCIA_DA_PORTA_NA_FAMILIA_MM,
  LIMITE_DA_TOLERANCIA_DO_ENVELOPE_NA_FAMILIA_MM, PAPEIS_POR_TIPO_DE_PORTA, SCHEMA_FAMILIA, TIPOS_DE_PORTA, TIPOS_DE_PORTA_COM_VOLUME,
  TETO_DE_PERGUNTAS_POR_COMPONENTE, VERSAO_CONFERENCIA_ESBOCO, avaliarRestricao, lerFamilia,
} from './familia.js';
import { TETO_POR_COMPONENTE } from './perguntas-do-critico.js';
import { FORMAS_DE_PORTA_DO_ANDAIME } from './forma-global.js';
import {
  LIMITE_DA_TOLERANCIA_DA_PORTA_MM, LIMITE_DA_TOLERANCIA_DO_ENVELOPE_MM, normalizarRefinamentoGlobal,
} from './refinamento-global.js';
import { resolverPortasDeMontagem } from './interfaces-montagem.js';

const ler = (caminho) => JSON.parse(readFileSync(new URL(caminho, import.meta.url), 'utf8'));
const fixture = () => ler('../../tools/fixtures/familia-de-prova/familia.json');
const variar = (mudar) => { const f = fixture(); mudar(f); return f; };

function recusa(familia, opcoes) {
  try { lerFamilia(familia, opcoes); } catch (erro) { expect(erro).toBeInstanceOf(ErroFamilia); return erro; }
  throw new Error('a família devia ser recusada');
}

const comPerfis = () => variar((f) => {
  f.perfis = { carro: { descricao: 'roda de carro de passeio', parametros: { diametro: 650, aro: 440, largura: 200 } } };
});

describe('familia — perfis, razão e mapa com produto', () => {
  it('lê o perfil canônico, em ordem de parâmetro, e a leitura da leitura devolve o mesmo texto', () => {
    const f = comPerfis();
    f.perfis.carro.parametros = { largura: 200, diametro: 650, aro: 440 };
    f.perfis.bicicleta = { descricao: 'roda de bicicleta', parametros: { diametro: 700 } };
    const lida = lerFamilia(f);
    expect(Object.keys(lida.perfis)).toEqual(['bicicleta', 'carro']);
    expect(Object.keys(lida.perfis.carro.parametros)).toEqual(['aro', 'diametro', 'largura']);
    expect(JSON.stringify(lerFamilia(lida))).toBe(JSON.stringify(lida));
    expect(lerFamilia(fixture()).perfis).toBeUndefined();
  });

  it('recusa o perfil de parâmetro desconhecido, fora da faixa, não inteiro, sem descrição ou que viola uma restrição', () => {
    const com = (mudar) => recusa(variar((f) => { f.perfis = comPerfis().perfis; mudar(f.perfis.carro); }));
    expect(com((p) => { p.parametros.cor = 1; }).message).toMatch(/perfis\.carro\.parametros\.cor recebeu 1; aceito: parâmetro da família/);
    expect(com((p) => { p.parametros.diametro = 5000; }).message).toMatch(/perfis\.carro\.parametros\.diametro recebeu 5000; aceito: número em mm dentro da faixa \[300, 900\]/);
    expect(com((p) => { p.parametros.raios = 2.5; }).message).toMatch(/perfis\.carro\.parametros\.raios recebeu 2.5; aceito: número inteiro/);
    expect(com((p) => { p.descricao = ''; }).message).toMatch(/perfis\.carro\.descricao/);
    expect(com((p) => { p.parametros = {}; }).message).toMatch(/perfis\.carro\.parametros/);
    expect(com((p) => { p.parametros = { diametro: 450, aro: 440 }; }).message).toMatch(/restrição 'parede-do-pneu'/);
    expect(recusa(variar((f) => { f.perfis = {}; })).message).toMatch(/perfis recebeu \{\}/);
    expect(recusa(variar((f) => { f.perfis = { 'Carro': { descricao: 'x', parametros: { aro: 300 } } }; })).message).toMatch(/perfis\.Carro/);
  });

  it("'perfil' é o nome reservado da chamada e não serve de parâmetro", () => {
    expect(recusa(variar((f) => { f.parametros.perfil = { ...f.parametros.aro }; })).message).toMatch(/parametros\.perfil.*nem 'perfil'/);
  });

  it('a unidade razao é uma proporção em número (tipo numero), e a contagem continua inteira', () => {
    const f = variar((g) => { g.parametros.aro = { tipo: 'numero', unidade: 'razao', padrao: 0.6, minimo: 0.3, maximo: 0.9, medio: 0.6 }; g.restricoes = []; g.esboco = undefined; delete g.esboco; });
    expect(lerFamilia(f).parametros.aro.unidade).toBe('razao');
    expect(recusa(variar((g) => { g.parametros.aro = { tipo: 'inteiro', unidade: 'razao', padrao: 1, minimo: 0, maximo: 3, medio: 1 }; })).message).toMatch(/aro\.tipo recebeu "inteiro"; aceito: 'numero'/);
  });

  it('o mapa do esboço aceita o produto de dois parâmetros e recusa o resto', () => {
    const lida = lerFamilia(variar((f) => { f.esboco.mapa.aro = 'aro*diametro'; }));
    expect(lida.esboco.mapa.aro).toBe('aro * diametro');
    expect(recusa(variar((f) => { f.esboco.mapa.aro = 'aro * ghost'; })).message).toMatch(/esboco\.mapa\.aro recebeu "aro \* ghost"/);
    expect(recusa(variar((f) => { f.esboco.mapa.aro = 'aro + diametro'; })).message).toMatch(/esboco\.mapa\.aro/);
  });

  it('o schema aceita o perfil e a razão, e recusa o perfil sem descrição', () => {
    const ajv = new Ajv2020({ strict: false });
    const validar = ajv.compile(SCHEMA_FAMILIA);
    expect(validar(comPerfis()), JSON.stringify(validar.errors)).toBe(true);
    const sem = comPerfis();
    delete sem.perfis.carro.descricao;
    expect(validar(sem)).toBe(false);
  });
});

describe('familia — a fixture válida', () => {
  it('passa e devolve a leitura normalizada, congelada', () => {
    const lida = lerFamilia(fixture());
    expect(lida.formato).toBe(FORMATO_FAMILIA);
    expect(lida.id).toBe('roda-de-prova');
    expect(Object.keys(lida.parametros)).toEqual(['aro', 'diametro', 'inclinacaoDoFlange', 'largura', 'raios']);
    expect(lida.parametros.raios).toEqual({ tipo: 'inteiro', unidade: 'contagem', padrao: 0, minimo: 0, maximo: 36, medio: 18 });
    expect(lida.portas.map(({ id }) => id)).toEqual(['assento-do-pneu', 'furacao-do-flange', 'furo-do-cubo']);
    expect(lida.ferramentas).toEqual(['repete', 'rodaPneu']);
    expect(Object.isFrozen(lida)).toBe(true);
    expect(Object.isFrozen(lida.parametros.aro)).toBe(true);
  });

  it('lê igual qualquer que seja a ordem de entrada, e duas leituras dão o mesmo texto', () => {
    const embaralhada = fixture();
    embaralhada.parametros = Object.fromEntries(Object.entries(embaralhada.parametros).reverse());
    embaralhada.restricoes.reverse();
    embaralhada.portas.reverse();
    embaralhada.ferramentas.reverse();
    embaralhada.perguntas = Object.fromEntries(Object.entries(embaralhada.perguntas).reverse());
    embaralhada.esboco.mapa = Object.fromEntries(Object.entries(embaralhada.esboco.mapa).reverse());
    const a = JSON.stringify(lerFamilia(fixture()));
    expect(JSON.stringify(lerFamilia(embaralhada))).toBe(a);
    expect(JSON.stringify(lerFamilia(fixture()))).toBe(a);
  });

  it('não muda a entrada, e uma leitura da leitura devolve a mesma coisa', () => {
    const entrada = fixture();
    const copia = JSON.stringify(entrada);
    const lida = lerFamilia(entrada);
    expect(JSON.stringify(entrada)).toBe(copia);
    expect(JSON.stringify(lerFamilia(lida))).toBe(JSON.stringify(lida));
  });

  it('aceita família de objeto sem vínculo com o esboço e sem restrição nem porta', () => {
    const f = variar((x) => { x.nivel = 'objeto'; x.restricoes = []; x.portas = []; delete x.esboco; });
    const lida = lerFamilia(f);
    expect(lida.nivel).toBe('objeto');
    expect(Object.hasOwn(lida, 'esboco')).toBe(false);
  });

  it('confere o vínculo com os componentes reais do esboço quando eles são dados', () => {
    const componentes = Object.fromEntries(Object.entries(COMPONENTES).map(([nome, c]) => [nome, Object.keys(c.parametros)]));
    expect(lerFamilia(fixture(), { componentes }).esboco.componente).toBe('roda');
  });
});

describe('familia — cada defeito é recusado com campo, valor e o que é aceito', () => {
  it('faixa invertida', () => {
    const erro = recusa(variar((f) => { f.parametros.aro.minimo = 700; }));
    expect(erro.campo).toBe('parametros.aro.minimo');
    expect(erro.valor).toBe(700);
    expect(erro.message).toMatch(/aro\.minimo recebeu 700; aceito: número menor que o máximo \(600\); a faixa \[700, 600\] está invertida/);
  });

  it('padrão fora da faixa e ponto médio fora da faixa', () => {
    const padrao = recusa(variar((f) => { f.parametros.diametro.padrao = 1000; }));
    expect(padrao.campo).toBe('parametros.diametro.padrao');
    expect(padrao.message).toMatch(/recebeu 1000; aceito: número dentro da faixa \[300, 900\]/);
    const medio = recusa(variar((f) => { f.parametros.diametro.medio = 100; }));
    expect(medio.campo).toBe('parametros.diametro.medio');
    expect(medio.message).toMatch(/recebeu 100; aceito: número dentro da faixa \[300, 900\]/);
  });

  it('contagem não inteira, no padrão, no mínimo e no ponto médio', () => {
    for (const chave of ['padrao', 'minimo', 'maximo', 'medio']) {
      const erro = recusa(variar((f) => { f.parametros.raios[chave] = 2.5; }));
      expect(erro.campo).toBe(`parametros.raios.${chave}`);
      expect(erro.message).toMatch(/recebeu 2\.5; aceito: número inteiro, porque o parâmetro é uma contagem/);
    }
  });

  it('contagem e tipo que não casam', () => {
    expect(recusa(variar((f) => { f.parametros.raios.tipo = 'numero'; })).message).toMatch(/raios\.tipo recebeu "numero"; aceito: 'inteiro', porque a unidade é contagem/);
    expect(recusa(variar((f) => { f.parametros.aro.tipo = 'inteiro'; })).message).toMatch(/aro\.tipo recebeu "inteiro"; aceito: 'numero', porque a unidade é mm/);
  });

  it('unidade e tipo desconhecidos, número não finito', () => {
    expect(recusa(variar((f) => { f.parametros.aro.unidade = 'polegadas'; })).message).toMatch(/aro\.unidade recebeu "polegadas"; aceito: um de mm, graus, contagem, razao/);
    expect(recusa(variar((f) => { f.parametros.aro.tipo = 'texto'; })).message).toMatch(/aro\.tipo recebeu "texto"; aceito: um de numero, inteiro/);
    expect(recusa(variar((f) => { f.parametros.aro.maximo = '600'; })).message).toMatch(/aro\.maximo recebeu "600"; aceito: número finito/);
  });

  it('restrição que cita parâmetro inexistente', () => {
    const erro = recusa(variar((f) => { f.restricoes[0].expressao = 'aro + 40 <= diametroExterno'; }));
    expect(erro.campo).toBe('restricoes[0].expressao');
    expect(erro.valor).toBe('aro + 40 <= diametroExterno');
    expect(erro.message).toMatch(/'diametroExterno' não existe \(parâmetros: aro, diametro, inclinacaoDoFlange, largura, raios\)/);
  });

  it('restrição que o próprio padrão viola, e a que o ponto médio viola', () => {
    const padrao = recusa(variar((f) => { f.restricoes[0].expressao = 'aro + 300 <= diametro'; }));
    expect(padrao.campo).toBe("restricoes['parede-do-pneu'].expressao");
    expect(padrao.message).toMatch(/satisfeita por o padrão dos parâmetros .*aro=420.*diametro=610.*esquerdo vale 720 e o direito 610/);
    const medio = recusa(variar((f) => { f.restricoes[0].expressao = 'aro + 300 <= diametro'; f.parametros.diametro.padrao = 900; }));
    expect(medio.message).toMatch(/satisfeita por o ponto médio dos parâmetros/);
  });

  it('restrição sem motivo, com id repetido, sem comparador ou com função e símbolo desconhecidos', () => {
    expect(recusa(variar((f) => { f.restricoes[0].motivo = ' '; })).campo).toBe('restricoes[0].motivo');
    expect(recusa(variar((f) => { f.restricoes[1].id = f.restricoes[0].id; })).message).toMatch(/restricoes\[1\]\.id recebeu "parede-do-pneu"; aceito: id que ainda não foi usado/);
    expect(recusa(variar((f) => { f.restricoes[0].expressao = 'aro + 40'; })).message).toMatch(/falta o comparador \(<, <=, >, >=\)/);
    expect(recusa(variar((f) => { f.restricoes[0].expressao = 'aro == diametro'; })).message).toMatch(/símbolo '=' na posição 4/);
    expect(recusa(variar((f) => { f.restricoes[0].expressao = 'raiz(aro) < diametro'; })).message).toMatch(/função 'raiz' não existe; funções aceitas: abs, atan2/);
    expect(recusa(variar((f) => { f.restricoes[0].expressao = 'aro < diametro < largura'; })).message).toMatch(/um só comparador/);
    expect(recusa(variar((f) => { f.restricoes[0].expressao = 'max(aro) < diametro'; })).message).toMatch(/'max' pede 2 argumento\(s\) e recebeu 1/);
  });

  it('porta sem tipo, de tipo desconhecido, sem papel ou com papel de outro tipo', () => {
    const semTipo = recusa(variar((f) => { delete f.portas[0].tipo; }));
    expect(semTipo.campo).toBe('portas[0].tipo');
    expect(semTipo.valor).toBeUndefined();
    expect(semTipo.message).toMatch(/portas\[0\]\.tipo recebeu nada \(campo ausente\); aceito: o tipo da porta, um de anel, cilindro, padraoFuros, plano, trilho/);
    expect(recusa(variar((f) => { f.portas[0].tipo = 'parafuso'; })).message).toMatch(/portas\[0\]\.tipo recebeu "parafuso"; aceito: um de anel, cilindro, padraoFuros, plano, trilho, os tipos de porta do núcleo/);
    expect(recusa(variar((f) => { delete f.portas[0].papel; })).message).toMatch(/portas\[0\]\.papel recebeu nada.*um de recebe, ocupa/);
    expect(recusa(variar((f) => { f.portas[0].papel = 'guia'; })).message).toMatch(/portas\[0\]\.papel recebeu "guia"; aceito: um de recebe, ocupa, os papéis da porta anel/);
    expect(recusa(variar((f) => { f.portas[1].id = f.portas[0].id; })).message).toMatch(/portas\[1\]\.id recebeu "assento-do-pneu"/);
  });

  it('ferramenta desconhecida ou repetida', () => {
    const erro = recusa(variar((f) => { f.ferramentas.push('soldagem'); }));
    expect(erro.campo).toBe('ferramentas[2]');
    expect(erro.message).toMatch(/ferramentas\[2\] recebeu "soldagem"; aceito: uma ferramenta conhecida: aerofolio, arquitetura/);
    expect(recusa(variar((f) => { f.ferramentas.push('repete'); })).message).toMatch(/aceito: ferramenta citada uma vez só/);
    expect(recusa(variar((f) => { f.ferramentas = []; })).campo).toBe('ferramentas');
  });

  it('campo desconhecido na família, no parâmetro, na restrição, na porta e no vínculo', () => {
    const topo = recusa(variar((f) => { f.cor = 'azul'; }));
    expect(topo.campo).toBe('família.cor');
    expect(topo.message).toMatch(/família\.cor recebeu "azul"; aceito: campo conhecido \(formato, id, versao/);
    expect(recusa(variar((f) => { f.parametros.aro.passo = 1; })).campo).toBe('parametros.aro.passo');
    expect(recusa(variar((f) => { f.restricoes[0].severidade = 'alta'; })).campo).toBe('restricoes[0].severidade');
    expect(recusa(variar((f) => { f.portas[0].parte = 'aro'; })).campo).toBe('portas[0].parte');
    expect(recusa(variar((f) => { f.esboco.escala = 2; })).campo).toBe('esboco.escala');
  });

  it('campo obrigatório ausente, formato, id, versão e nível', () => {
    expect(recusa(variar((f) => { delete f.perguntas; })).message).toMatch(/família\.perguntas recebeu nada \(campo ausente\); aceito: o campo 'perguntas', obrigatório/);
    expect(recusa(variar((f) => { f.formato = 'mecanifica.familia@2'; })).message).toMatch(/formato recebeu "mecanifica.familia@2"; aceito: 'mecanifica.familia@1'/);
    expect(recusa(variar((f) => { f.id = 'Roda_de_Prova'; })).campo).toBe('id');
    expect(recusa(variar((f) => { f.versao = '1.0'; })).message).toMatch(/versao recebeu "1\.0"; aceito: versão semântica x\.y\.z/);
    expect(recusa(variar((f) => { f.nivel = 'conjunto'; })).message).toMatch(/nivel recebeu "conjunto"; aceito: um de componente, objeto/);
    expect(recusa('roda')).toBeInstanceOf(ErroFamilia);
  });

  it('nome de parâmetro inválido ou igual a função da expressão, e família sem parâmetro', () => {
    expect(recusa(variar((f) => { f.parametros.max = f.parametros.aro; })).campo).toBe('parametros.max');
    expect(recusa(variar((f) => { f.parametros.Aro2 = f.parametros.aro; })).campo).toBe('parametros.Aro2');
    expect(recusa(variar((f) => { f.parametros = {}; })).campo).toBe('parametros');
  });

  it('perguntas do crítico vazias, repetidas ou de componente sem nome', () => {
    expect(recusa(variar((f) => { f.perguntas = {}; })).campo).toBe('perguntas');
    expect(recusa(variar((f) => { f.perguntas.pneu = []; })).campo).toBe('perguntas.pneu');
    expect(recusa(variar((f) => { f.perguntas.pneu[1] = f.perguntas.pneu[0]; })).campo).toBe('perguntas.pneu[1]');
    expect(recusa(variar((f) => { f.perguntas['1pneu'] = ['x?']; })).campo).toBe('perguntas.1pneu');
  });

  it('o teto de perguntas por componente recusa o excesso, e é o mesmo do módulo das perguntas', () => {
    expect(TETO_DE_PERGUNTAS_POR_COMPONENTE).toBe(TETO_POR_COMPONENTE);
    const erro = recusa(variar((f) => { f.perguntas.pneu = Array.from({ length: TETO_DE_PERGUNTAS_POR_COMPONENTE + 1 }, (_, i) => `Onde fica a parte ${i}?`); }));
    expect(erro.campo).toBe('perguntas.pneu');
    expect(erro.message).toMatch(new RegExp(`no máximo ${TETO_DE_PERGUNTAS_POR_COMPONENTE} perguntas por componente`));
    const noTeto = variar((f) => { f.perguntas.pneu = Array.from({ length: TETO_DE_PERGUNTAS_POR_COMPONENTE }, (_, i) => `Onde fica a parte ${i}?`); });
    expect(() => lerFamilia(noTeto)).not.toThrow();
  });

  it('vínculo com o esboço: parâmetro da família inexistente, componente e parâmetro de componente desconhecidos', () => {
    expect(recusa(variar((f) => { f.esboco.mapa.diametro = 'diametroExterno'; })).message).toMatch(/esboco\.mapa\.diametro recebeu "diametroExterno"; aceito: um parâmetro da família, ou o produto de dois \('a \* b'\), entre: aro, diametro/);
    expect(recusa(variar((f) => { f.esboco.mapa = {}; })).campo).toBe('esboco.mapa');
    const componentes = Object.fromEntries(Object.entries(COMPONENTES).map(([nome, c]) => [nome, Object.keys(c.parametros)]));
    expect(recusa(variar((f) => { f.esboco.componente = 'pneu'; }), { componentes }).message).toMatch(/esboco\.componente recebeu "pneu"; aceito: um componente do esboço: dobradica, engrenagem/);
    expect(recusa(variar((f) => { f.esboco.mapa.altura = 'largura'; }), { componentes }).message).toMatch(/esboco\.mapa\.altura recebeu "altura"; aceito: um parâmetro do componente 'roda': aro, diametro/);
  });
});

describe('familia — a declaração dos pares que o esboço confere (esboco.conferencia)', () => {
  const comEsboco = () => ler('../../tools/fixtures/familia-com-esboco/familia.json');
  const variarCom = (mudar) => { const f = comEsboco(); mudar(f); return f; };

  it('é opcional: a família com esboço e sem conferência continua válida e sem o campo', () => {
    expect(Object.hasOwn(lerFamilia(fixture()).esboco, 'conferencia')).toBe(false);
    expect(Object.hasOwn(lerFamilia(variarCom((f) => { delete f.esboco.conferencia; })).esboco, 'conferencia')).toBe(false);
  });

  it('lê a conferência canônica e versionada, em ordem de parte e de porta, sem depender da ordem escrita', () => {
    const lida = lerFamilia(comEsboco()).esboco.conferencia;
    expect(lida).toEqual({
      versao: VERSAO_CONFERENCIA_ESBOCO,
      partes: { cuboD: 'cuboD', cuboE: 'cuboE', disco: 'disco', pneu: 'pneu' },
      portas: [{ porta: 'assento-do-pneu', volume: 'pneu', lado: '+x' }, { porta: 'cubo-externo', volume: 'cuboD', lado: '+x' }],
      tolerancia: { envelope: 1, porta: 0.5 },
    });
    expect(Object.keys(lida.partes)).toEqual(['cuboD', 'cuboE', 'disco', 'pneu']);
    const embaralhada = variarCom((f) => {
      f.esboco.conferencia.portas.reverse();
      f.esboco.conferencia.partes = Object.fromEntries(Object.entries(f.esboco.conferencia.partes).reverse());
      delete f.esboco.conferencia.versao;
    });
    expect(JSON.stringify(lerFamilia(embaralhada))).toBe(JSON.stringify(lerFamilia(comEsboco())));
    expect(JSON.stringify(lerFamilia(lerFamilia(comEsboco())))).toBe(JSON.stringify(lerFamilia(comEsboco())));
  });

  it('a conferência sem porta é válida, e a lista de portas não pode vir vazia', () => {
    expect(Object.hasOwn(lerFamilia(variarCom((f) => { delete f.esboco.conferencia.portas; })).esboco.conferencia, 'portas')).toBe(false);
    expect(recusa(variarCom((f) => { f.esboco.conferencia.portas = []; })).campo).toBe('esboco.conferencia.portas');
  });

  it('recusa cada defeito dizendo o campo, o valor e o que é aceito', () => {
    expect(recusa(variarCom((f) => { f.esboco.conferencia.versao = 2; })).message).toMatch(/esboco\.conferencia\.versao recebeu 2; aceito: 1/);
    expect(recusa(variarCom((f) => { f.esboco.conferencia.cor = 1; })).campo).toBe('esboco.conferencia.cor');
    expect(recusa(variarCom((f) => { delete f.esboco.conferencia.tolerancia; })).message).toMatch(/esboco\.conferencia\.tolerancia recebeu nada/);
    expect(recusa(variarCom((f) => { f.esboco.conferencia.partes = {}; })).campo).toBe('esboco.conferencia.partes');
    expect(recusa(variarCom((f) => { f.esboco.conferencia.partes['meu pneu'] = 'pneu'; })).campo).toBe('esboco.conferencia.partes.meu pneu');
    expect(recusa(variarCom((f) => { f.esboco.conferencia.partes.pneu = ''; })).campo).toBe('esboco.conferencia.partes.pneu');
    expect(recusa(variarCom((f) => { f.esboco.conferencia.portas[0].porta = 'tampa'; })).message).toMatch(/portas\[0\]\.porta recebeu "tampa"; aceito: uma porta da família: assento-do-pneu, cubo-externo/);
    expect(recusa(variarCom((f) => { f.esboco.conferencia.portas[1].porta = 'assento-do-pneu'; })).message).toMatch(/portas\[1\]\.porta recebeu "assento-do-pneu"; aceito: porta ligada a um só volume/);
    expect(recusa(variarCom((f) => { f.esboco.conferencia.portas[0].lado = 'cima'; })).message).toMatch(/portas\[0\]\.lado recebeu "cima"; aceito: um de \+x, -x/);
    expect(recusa(variarCom((f) => { f.esboco.conferencia.portas[0].volume = 'a b'; })).campo).toBe('esboco.conferencia.portas[0].volume');
    expect(recusa(variarCom((f) => { delete f.esboco.conferencia.portas[0].lado; })).campo).toBe('esboco.conferencia.portas[0].lado');
    expect(recusa(variarCom((f) => { f.esboco.conferencia.tolerancia.envelope = -1; })).message).toMatch(/tolerancia\.envelope recebeu -1; aceito: número de 0 a 50 mm/);
    expect(recusa(variarCom((f) => { f.esboco.conferencia.tolerancia.porta = 6; })).message).toMatch(/tolerancia\.porta recebeu 6; aceito: número de 0 a 5 mm/);
    expect(recusa(variarCom((f) => { f.esboco.conferencia.tolerancia.folga = 1; })).campo).toBe('esboco.conferencia.tolerancia.folga');
  });

  it('só liga a volume a porta de um tipo cuja interface o volume dá, e a família sem porta não liga nenhuma', () => {
    expect([...TIPOS_DE_PORTA_COM_VOLUME]).toEqual(['anel', 'cilindro']);
    const erro = recusa(variarCom((f) => { f.portas.push({ id: 'face-do-disco', tipo: 'plano', papel: 'apoia' }); f.esboco.conferencia.portas[0].porta = 'face-do-disco'; }));
    expect(erro.message).toMatch(/portas\[0\]\.porta recebeu "face-do-disco"; aceito: porta de tipo anel, cilindro, os que o volume do esboço dá; 'face-do-disco' é plano/);
    expect(recusa(variarCom((f) => { f.portas = []; })).message).toMatch(/aceito: uma porta da família: a família não declara porta/);
  });

  it('os tetos de tolerância são os do REFINA, e o REFINA aceita a conferência como ela sai da leitura', () => {
    expect(LIMITE_DA_TOLERANCIA_DO_ENVELOPE_NA_FAMILIA_MM).toBe(LIMITE_DA_TOLERANCIA_DO_ENVELOPE_MM);
    expect(LIMITE_DA_TOLERANCIA_DA_PORTA_NA_FAMILIA_MM).toBe(LIMITE_DA_TOLERANCIA_DA_PORTA_MM);
    const { partes, tolerancia } = lerFamilia(comEsboco()).esboco.conferencia;
    const volumes = Object.fromEntries(Object.entries(partes).map(([parte, volume]) => [parte, volume.replace(/([A-Z])/g, '-$1').toLowerCase()]));
    expect(normalizarRefinamentoGlobal({ andaime: 'a.json', partes: volumes, tolerancia }).partes).toHaveLength(4);
    expect(() => normalizarRefinamentoGlobal({ andaime: 'a.json', partes: volumes, tolerancia: { envelope: LIMITE_DA_TOLERANCIA_DO_ENVELOPE_NA_FAMILIA_MM + 1, porta: 0 } })).toThrow();
  });

  it('o schema JSON aceita a conferência e recusa a estrutura errada que o validador também recusa', () => {
    const validar = new Ajv2020({ strict: false, allErrors: true }).compile(SCHEMA_FAMILIA);
    expect(validar(comEsboco()), JSON.stringify(validar.errors)).toBe(true);
    expect(validar(lerFamilia(comEsboco())), JSON.stringify(validar.errors)).toBe(true);
    const casos = [
      (f) => { f.esboco.conferencia.versao = 2; },
      (f) => { delete f.esboco.conferencia.tolerancia; },
      (f) => { f.esboco.conferencia.partes = {}; },
      (f) => { f.esboco.conferencia.portas[0].lado = 'cima'; },
      (f) => { f.esboco.conferencia.tolerancia.envelope = 51; },
      (f) => { f.esboco.conferencia.cor = 1; },
    ];
    for (const mudar of casos) {
      const f = variarCom(mudar);
      expect(validar(f), JSON.stringify(f.esboco.conferencia)).toBe(false);
      expect(() => lerFamilia(f)).toThrow(ErroFamilia);
    }
  });
});

describe('familia — avaliação da restrição', () => {
  const r = (expressao) => ({ id: 'teste', expressao, motivo: 'm' });
  it('calcula soma, produto, parênteses, menos unário e funções fechadas', () => {
    expect(avaliarRestricao(r('a + b * 2 <= 10'), { a: 4, b: 3 })).toMatchObject({ satisfeita: true, esquerda: 10, direita: 10 });
    expect(avaliarRestricao(r('(a + b) * 2 < 10'), { a: 4, b: 3 }).satisfeita).toBe(false);
    expect(avaliarRestricao(r('-a + 10 > b'), { a: 4, b: 3 }).satisfeita).toBe(true);
    expect(avaliarRestricao(r('max(a, b) - min(a, b) >= abs(a - b)'), { a: 4, b: 3 }).satisfeita).toBe(true);
    expect(avaliarRestricao(r('sin(a) < 0.5001'), { a: 30 }).satisfeita).toBe(true);
    expect(avaliarRestricao(r('sqrt(a * a + b * b) >= 5'), { a: 3, b: 4 }).satisfeita).toBe(true);
  });

  it('trata divisão por zero e raiz de negativo como não satisfeita e indefinida', () => {
    expect(avaliarRestricao(r('a / b < 1'), { a: 1, b: 0 })).toMatchObject({ satisfeita: false, indefinida: true });
    expect(avaliarRestricao(r('sqrt(a) < 1'), { a: -1 })).toMatchObject({ satisfeita: false, indefinida: true });
  });

  it('pede o valor de cada parâmetro citado', () => {
    expect(() => avaliarRestricao(r('a < b'), { a: 1 })).toThrow(/valor finito para o parâmetro 'b'/);
  });
});

describe('familia — vocabulário conferido contra o núcleo e os documentos', () => {
  it('os tipos de porta são as formas do andaime, e o núcleo aceita cada par tipo e papel e recusa o papel de outro tipo', () => {
    expect([...TIPOS_DE_PORTA].sort()).toEqual([...FORMAS_DE_PORTA_DO_ANDAIME].sort());
    const base = { centro: [0, 0, 0], eixo: [0, 0, 1], inicio: 0, fim: 10 };
    const geometria = {
      anel: { ...base, raioInterno: 5, raioExterno: 10 },
      cilindro: { ...base, raio: 5 },
      plano: { ponto: [0, 0, 0], normal: [0, 0, 1], extensao: [10, 10] },
      padraoFuros: { plano: { ponto: [0, 0, 0], normal: [0, 0, 1] }, diametro: 5, centros: [[0, 0, 0]] },
      trilho: { ...base, perfil: { largura: 5, altura: 5 }, curso: 10 },
    };
    const interfaceDe = (forma, papel) => ({ forma, papel, ...geometria[forma] });
    const resolver = (forma, papel) => resolverPortasDeMontagem([{ id: 'p', neutro: { portas: new Map([['x', { interface: interfaceDe(forma, papel) }]]) } }]);
    const todosOsPapeis = new Set(Object.values(PAPEIS_POR_TIPO_DE_PORTA).flat());
    for (const [forma, papeis] of Object.entries(PAPEIS_POR_TIPO_DE_PORTA)) {
      for (const papel of papeis) expect(() => resolver(forma, papel), `${forma}/${papel}`).not.toThrow();
      for (const papel of [...todosOsPapeis].filter((p) => !papeis.includes(p))) expect(() => resolver(forma, papel), `${forma}/${papel}`).toThrow();
    }
  });

  it('as ferramentas são exatamente as de ferramentas-por-objeto.json', () => {
    const doc = ler('../../docs/mecanifica/ferramentas-por-objeto.json');
    expect([...FERRAMENTAS_DE_FAMILIA]).toEqual(Object.keys(doc.ferramentas).sort());
  });
});

describe('familia — schema JSON', () => {
  const ajv = new Ajv2020({ strict: false, allErrors: true });
  const validar = ajv.compile(SCHEMA_FAMILIA);

  it('aceita a fixture e a leitura normalizada dela', () => {
    expect(validar(fixture()), JSON.stringify(validar.errors)).toBe(true);
    expect(validar(lerFamilia(fixture())), JSON.stringify(validar.errors)).toBe(true);
  });

  it('recusa a estrutura errada que o validador também recusa', () => {
    const casos = [
      (f) => { f.cor = 'azul'; },
      (f) => { f.parametros.raios.minimo = 2.5; },
      (f) => { f.parametros.raios.tipo = 'numero'; },
      (f) => { f.parametros.aro.unidade = 'polegadas'; },
      (f) => { delete f.portas[0].tipo; },
      (f) => { f.portas[0].tipo = 'parafuso'; },
      (f) => { f.portas[0].papel = 'guia'; },
      (f) => { f.ferramentas.push('soldagem'); },
      (f) => { f.ferramentas = []; },
      (f) => { f.restricoes[0].motivo = ''; },
      (f) => { f.perguntas = {}; },
      (f) => { f.nivel = 'conjunto'; },
    ];
    for (const mudar of casos) {
      const f = variar(mudar);
      expect(validar(f), JSON.stringify(f)).toBe(false);
      expect(() => lerFamilia(f)).toThrow(ErroFamilia);
    }
  });
});
