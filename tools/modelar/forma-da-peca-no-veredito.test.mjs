/* forma-da-peca-no-veredito.test.mjs — o veredito da peça confere a forma contra a referência, depois do que já roda.
   Sobre o suporte de `tools/fixtures/refina-forma-global/`: o G01 sobre a malha quando a receita declara o alvo N2, o contorno por
   parte quando a pasta da peça tem `*.contornos.json`, as razões que a receita declara em `RAZOES`, e o item sem referência
   dizendo "não conferido: sem referência" sem aprovar nem barrar. Os limiares são os que cada comparador já tem. */
import { describe, expect, it } from 'vitest';
import { descreverPecaReutilizavel } from './descrever-peca.mjs';
import { receitaDoSuporte } from '../fixtures/refina-forma-global/suporte.js';

const PASTA = 'tools/fixtures/refina-forma-global';
const medir = (variante, opcoes = {}) => descreverPecaReutilizavel({ peca: `${PASTA}/${variante}/receita.js`, ...opcoes });
const SEM_G01 = 'G01 sobre a malha: não conferido: sem referência (REFINA não declara alvo N2)';
const SEM_CONTORNO = 'contorno por parte: não conferido: sem referência (nenhum *.contornos.json na pasta da peça)';
const SEM_RAZAO = 'razões: não conferido: sem referência (a receita não exporta RAZOES)';

describe('sem referência nenhuma o veredito diz que não conferiu, e não aprova nem barra', () => {
  it('a peça sem alvo, sem contorno e sem razão passa como passava, e os três itens ficam "não conferido"', async () => {
    const r = await medir('ok');
    expect(r.ok).toBe(true);
    expect(r.stderr).toBe('');
    for (const linha of [SEM_G01, SEM_CONTORNO, SEM_RAZAO]) expect(r.stdout).toContain(`  ${linha}`);
    expect(r.stdout).toContain('REFERÊNCIA DA FORMA');
    expect(r.resultado).toMatchObject({ g01: null, contornos: null, razoes: null });
  });

  it('a peça de um objeto, cujo contorno mora na pasta do objeto e não na dela, também não confere nada', async () => {
    const r = await descreverPecaReutilizavel({ peca: 'braco-robotico/base' });
    expect(r.ok).toBe(true);
    expect(r.stdout).toContain(`  ${SEM_CONTORNO}`);
    expect(r.resultado.contornos).toBeNull();
  });

  it('--sem-veredito não confere a forma nem diz nada dela', async () => {
    const r = await medir('g01-parte-fora', { semVeredito: true });
    expect(r.stdout).toContain('VEREDITO DESLIGADO');
    expect(r.stdout).not.toContain('REFERÊNCIA DA FORMA');
    expect(r.resultado).toMatchObject({ g01: null, contornos: null, razoes: null });
  });
});

describe('G01 sobre a malha da peça, com o alvo N2 que REFINA.alvo declara', () => {
  it('a malha que confere com o alvo nas três silhuetas passa, e o G00 do alvo fica bloqueado sem a crítica dele', async () => {
    const r = await medir('g01-ok');
    expect(r.stderr).toBe('');
    expect(r.ok).toBe(true);
    expect(r.resultado.g01).toMatchObject({ rodou: true, alvo: 'alvo-suporte', medidasAprovadas: true, estado: 'bloqueado' });
    expect(r.resultado.g01.avaliacaoAlvo).toEqual({ estado: 'bloqueado', motivo: 'critica-independente-ausente' });
    expect(r.resultado.g01.avaliacao.vistas.map((v) => [v.id, v.estado])).toEqual([['frontal', 'aprovada'], ['direita', 'aprovada'], ['superior', 'aprovada']]);
    expect(r.stdout).toContain('G01 sobre a malha (alvo alvo-suporte): medidas aprovadas');
    expect(r.stdout).toContain('G00 do alvo bloqueado (critica-independente-ausente)');
    expect(r.stdout).toContain(`  ${SEM_CONTORNO}`);
  });

  it('a malha vem dos triângulos da peça, nos volumes do andaime que as partes refinam', async () => {
    const r = await medir('g01-ok');
    const { estatisticas } = r.resultado.g01.blocagem;
    expect(estatisticas.volumes).toBe(2);
    expect(estatisticas.triangulos).toBeGreaterThan(estatisticas.volumes);
    expect(r.resultado.g01.blocagem.id).toBe('suporte-andaime-malha-da-peca');
  });

  it('a sapata deslocada 30 mm reprova nas silhuetas e no envelope, e a mensagem diz a vista', async () => {
    const r = await medir('g01-parte-fora');
    expect(r.ok).toBe(false);
    expect(r.codigo).toBe(1);
    expect(r.resultado.g01.medidasAprovadas).toBe(false);
    expect(r.stderr).toContain("ACHADO(S) NO G01 DA MALHA CONTRA O ALVO 'alvo-suporte'");
    expect(r.stderr).toContain('vistas.frontal: silhueta-reprovada');
    expect(r.stderr).toContain('vistas.superior: silhueta-reprovada');
    expect(r.stderr).toContain('envelope: envelope-reprovado');
    /* o refinamento do andaime, com a tolerância no teto, deixou a sapata passar: quem reprovou foi a malha */
    expect(r.resultado.refinamento.ok).toBe(true);
    expect(r.stderr).not.toContain('NO REFINAMENTO DO ANDAIME');
  });

  it('o alvo que não existe é recusado com o caminho procurado, e a peça entregue sem arquivo não resolve o caminho', async () => {
    const modulo = receitaDoSuporte({ alvo: true });
    modulo.REFINA = { ...modulo.REFINA, alvo: '../nao-existe.json' };
    const ausente = await medir('g01-ok', { modulo });
    expect(ausente.ok).toBe(false);
    expect(ausente.stderr).toContain("REFINA.alvo '../nao-existe.json' não existe");
    const semArquivo = await descreverPecaReutilizavel({ peca: 'g01-ok', modulo: receitaDoSuporte({ alvo: true }) });
    expect(semArquivo.ok).toBe(false);
    expect(semArquivo.stderr).toContain('caminho relativo à pasta da peça');
  });
});

describe('contorno por parte, com o *.contornos.json da pasta da peça', () => {
  it('as partes que casam com as regiões e a silhueta inteira passam, com o limiar que o comparador já tem', async () => {
    const r = await medir('contorno-ok');
    expect(r.stderr).toBe('');
    expect(r.ok).toBe(true);
    const [c] = r.resultado.contornos.conferencias;
    expect(c).toMatchObject({ vista: 'frontal', ok: true });
    expect(c.resultados.map((x) => x.parte)).toEqual([null, 'sapata', 'coluna']);
    expect(c.resultados.every((x) => x.tolerancia_declarada === false && x.iou_min === 0.85 && x.iou_min_declarado === false)).toBe(true);
    expect(c.resultados[0].tolerancia_mm).toBe(6);
    expect(r.stdout).toContain('contorno por parte (tools/fixtures/refina-forma-global/contorno-ok/referencias/frontal.contornos.json, vista frontal): aprovado');
    expect(r.stdout).toContain(`  ${SEM_G01}`);
  });

  it('a sapata deslocada 30 mm reprova e a mensagem nomeia a parte, e a coluna segue passando', async () => {
    const r = await medir('contorno-parte-fora');
    expect(r.ok).toBe(false);
    expect(r.codigo).toBe(1);
    expect(r.stderr).toContain('CONTORNO(S) FORA DA REFERÊNCIA');
    expect(r.stderr).toMatch(/a parte "sapata" da peça desvia 29,9 mm da referência/);
    expect(r.stderr).not.toContain('a parte "coluna"');
    const reprovados = r.resultado.contornos.conferencias[0].resultados.filter((x) => !x.ok).map((x) => x.parte);
    expect(reprovados).toContain('sapata');
    expect(reprovados).not.toContain('coluna');
    expect(r.resultado.refinamento.ok).toBe(true);
  });

  it('o contorno sem vista no nome não confere nada, e diz isso sem barrar', async () => {
    const { contornosDaPeca, conferirContornosDaPeca } = await import('./contorno-da-peca.mjs');
    const r = await medir('contorno-ok');
    const achados = [{ caminho: '/nao/importa/mapa.contornos.json', arquivo: 'mapa.contornos.json', vista: null }];
    expect(conferirContornosDaPeca({ neutro: r.resultado.neutro, contornos: achados })).toEqual({
      conferencias: [], naoConferidos: [{ arquivo: 'mapa.contornos.json', motivo: 'o nome não diz a vista (comece por frontal, lateral, superior)' }], ok: true,
    });
    expect(contornosDaPeca({ caminhoDaReceita: null, raiz: '.' })).toEqual([]);
  });
});

describe('razões declaradas em RAZOES', () => {
  it('as razões dentro da faixa passam', async () => {
    const r = await medir('razao-ok');
    expect(r.stderr).toBe('');
    expect(r.ok).toBe(true);
    expect(r.resultado.razoes.medidas.map((m) => [m.nome, m.medido])).toEqual([['colunaPelaSapata', 0.9], ['alturaPelaLargura', 1]]);
    expect(r.stdout).toContain('razões: todas dentro da faixa (2 declaradas, 2 lidas, 0 fora da faixa)');
  });

  it('a altura declarada em 0,30 a 0,40 da largura, quando é igual a ela, reprova com o valor medido', async () => {
    const r = await medir('razao-fora');
    expect(r.ok).toBe(false);
    expect(r.codigo).toBe(1);
    expect(r.stderr).toContain('1 RAZÃO(ÕES) FORA DA FAIXA OU SEM LEITURA');
    expect(r.stderr).toContain('alturaPelaLargura: razão 1 (200 mm sobre 200 mm) acima da faixa 0,3 a 0,4 por 0,6 (origem: ficha)');
  });

  it('a razão sobre parte que não existe reprova como declaração errada, e a declaração inválida é recusada', async () => {
    const semParte = receitaDoSuporte({ razoes: [{ nome: 'x', origem: 'ficha', mede: { razao: [{ caixa: 'y', formas: ['capo'] }, 'alturaTotal'], faixa: [0.1, 0.9] } }] });
    const r = await medir('razao-ok', { modulo: semParte });
    expect(r.ok).toBe(false);
    expect(r.stderr).toContain('x: não pôde ser lida ("capo" não é uma forma visível da opção)');
    const invalida = receitaDoSuporte({ razoes: [{ nome: 'x', origem: 'adivinhei', mede: { razao: ['alturaTotal', 'larguraTotal'], faixa: [0.1, 0.9] } }] });
    const i = await medir('razao-ok', { modulo: invalida });
    expect(i.ok).toBe(false);
    expect(i.stderr).toContain('RAZÕES DECLARADAS INVÁLIDAS');
    expect(i.stderr).toContain("'origem' precisa ser uma de ficha, foto, ia, referencia");
  });
});

describe('o veredito da forma é determinístico', () => {
  it('a mesma peça dá o mesmo texto e o mesmo resultado nas duas execuções', async () => {
    const a = await medir('contorno-parte-fora');
    const b = await medir('contorno-parte-fora');
    expect(b.stdout).toBe(a.stdout);
    expect(b.stderr).toBe(a.stderr);
    expect(JSON.stringify(b.resultado.contornos)).toBe(JSON.stringify(a.resultado.contornos));
  });
});
