/* forma-do-esboco.test.mjs — a forma da receita contra a forma do esboço, de ponta a ponta: o esboço lido pelo módulo (`formasResolvidas`),
   o sólido de cada forma (o recorte, a inclinação, a malha de família) e a razão interseção/união de volume no veredito de `descrever-peca`,
   na `guarda:acervo` e na linha de comando. A receita que reproduz a forma passa, a menor, a deslocada, a sem recorte e a viga sem a
   inclinação reprovam com a parte, a forma, a razão e o mínimo, e a receita sem `REFINA.esboco` não muda. O sólido de cada forma de
   todos os esboços de prova do repositório é conferido contra a caixa que o módulo calcula para ela. */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { conferirAcervo } from './guardas/guarda-acervo.mjs';
import { descreverPecaReutilizavel } from './descrever-peca.mjs';
import { comoCLI, descreverFormaDoEsboco, formaDoEsbocoDaPeca, ligarPartes } from './forma-do-esboco.mjs';
import { conferirFormaDoEsbocoDoJson, formasDoEsboco, malhaDaFormaDeFamilia } from './esboco-solido.mjs';
import { malhaDaChamada } from './esboco-familias.mjs';
import { criarContextoDeSolidos, criarSolidosDoEsboco } from '../../src/autoria/solido-do-esboco.js';
import { normalizarEsbocoDoRefinamento } from '../../src/autoria/refinamento-global.js';
import { receitaDoBloco } from '../fixtures/forma-do-esboco/suporte.js';

const PASTA = 'tools/fixtures/forma-do-esboco';
const ESBOCO = `${PASTA}/bloco.esboco.json`;
const medir = (variante) => descreverPecaReutilizavel({ peca: `${PASTA}/${variante}/receita.js` });
const razao = (r, parte) => r.resultado.formaDoEsboco.partes.find((p) => p.parte === parte).razao;
const lerJson = (caminho) => JSON.parse(readFileSync(caminho, 'utf8'));

describe('o veredito da peça confere a forma contra o esboço', () => {
  it('a receita que reproduz o bloco furado e a viga inclinada passa, com razão acima de 0,99', async () => {
    const r = await medir('ok');
    expect(r.stderr).toBe('');
    expect(r.ok).toBe(true);
    expect(r.resultado.formaDoEsboco).toMatchObject({ ok: true, arquivo: '../bloco.esboco.json', minimo: 0.99, achados: [] });
    expect(razao(r, 'bloco')).toBeGreaterThan(0.99);
    expect(razao(r, 'viga')).toBeGreaterThan(0.99);
    expect(r.stdout).toContain('forma contra o esboço (../bloco.esboco.json, opção Bloco e viga): aprovada — bloco 1, viga 1 (razão interseção/união de volume, mínimo 0,99)');
  });

  it('o bloco sem o furo é recusado dizendo a parte, a forma, a razão e o mínimo, e o envelope não o vê', async () => {
    const r = await medir('sem-recorte');
    expect(r.ok).toBe(false);
    expect(r.codigo).toBe(1);
    expect(r.stderr).toContain("1 ACHADO(S) NA FORMA CONTRA O ESBOÇO '../bloco.esboco.json'");
    expect(r.stderr).toContain("a parte 'bloco' tem razão interseção/união de volume 0,882 com a forma 'bloco' do esboço (mínimo 0,99)");
    expect(r.resultado.formaDoEsboco.achados.map((a) => a.codigo)).toEqual(['parte-fora-da-forma-do-esboco']);
    expect(r.resultado.refinamento.ok).toBe(true);
    expect(r.stdout).toContain('REPROVADA');
  });

  it.each([
    ['menor', 'bloco', /razão interseção\/união de volume 0,706/],
    ['deslocada', 'bloco', /razão interseção\/união de volume 0,71\d/],
    ['viga-reta', 'viga', /razão interseção\/união de volume 0,15\d/],
  ])('a variante %s reprova na parte %s e o envelope aprova', async (variante, parte, mensagem) => {
    const r = await medir(variante);
    expect(r.ok).toBe(false);
    expect(r.resultado.formaDoEsboco.achados.map((a) => a.parte)).toEqual([parte]);
    expect(r.stderr).toMatch(mensagem);
    expect(r.resultado.refinamento.ok).toBe(true);
  });

  it('o mínimo de uma parte vale no lugar do geral', async () => {
    const r = await medir('minimo-proprio');
    expect(r.ok).toBe(true);
    expect(r.resultado.formaDoEsboco.partes.find((p) => p.parte === 'bloco')).toMatchObject({ minimo: 0.8, ok: true });
  });

  it('a receita sem REFINA.esboco não muda: nada roda e o veredito não cita o esboço', async () => {
    const r = await descreverPecaReutilizavel({ peca: 'tools/fixtures/refina-forma-global/ok/receita.js' });
    expect(r.ok).toBe(true);
    expect(r.resultado.formaDoEsboco).toBeNull();
    expect(r.stdout).not.toContain('forma contra o esboço');
    expect(r.stderr).toBe('');
    const sem = await descreverPecaReutilizavel({ peca: 'braco-robotico/anel-cintura' });
    expect(sem.resultado.formaDoEsboco).toBeNull();
  });

  it('sem --sem-veredito a conferência não roda, e a execução diz isso', async () => {
    const r = await descreverPecaReutilizavel({ peca: `${PASTA}/sem-recorte/receita.js`, semVeredito: true });
    expect(r.stdout).toContain('VEREDITO DESLIGADO');
    expect(r.resultado.formaDoEsboco).toBeNull();
  });
});

describe('o esboço que a receita aponta', () => {
  const comEsboco = (mudar) => {
    const modulo = receitaDoBloco();
    modulo.REFINA = { ...modulo.REFINA, esboco: { ...modulo.REFINA.esboco, ...mudar } };
    return modulo;
  };

  it('o arquivo que não existe é recusado com o caminho procurado', async () => {
    const r = await descreverPecaReutilizavel({ peca: `${PASTA}/ok/receita.js`, modulo: comEsboco({ arquivo: '../nao-existe.esboco.json' }) });
    expect(r.ok).toBe(false);
    expect(r.stderr).toContain('FORMA CONTRA O ESBOÇO INVÁLIDA');
    expect(r.stderr).toContain("REFINA.esboco.arquivo '../nao-existe.esboco.json' não existe");
  });

  it('o arquivo fora do repositório é recusado', async () => {
    const r = await descreverPecaReutilizavel({ peca: `${PASTA}/ok/receita.js`, modulo: comEsboco({ arquivo: '../../../../../../etc/a.esboco.json' }) });
    expect(r.ok).toBe(false);
    expect(r.stderr).toContain('sai do repositório');
  });

  it('a peça entregue sem arquivo não resolve o caminho do esboço e diz isso', async () => {
    const r = await descreverPecaReutilizavel({ peca: 'ok', modulo: receitaDoBloco() });
    expect(r.ok).toBe(false);
    expect(r.stderr).toContain('caminho relativo à pasta da peça');
  });

  it('a opção que o esboço não tem é recusada pelo módulo, com as que ele tem', async () => {
    const r = await descreverPecaReutilizavel({ peca: `${PASTA}/ok/receita.js`, modulo: comEsboco({ opcao: 3 }) });
    expect(r.ok).toBe(false);
    expect(r.stderr).toContain('FORMA CONTRA O ESBOÇO INVÁLIDA');
    expect(r.stderr).toMatch(/a opção 3 não existe \(o esboço tem 1/);
  });

  it('a declaração inválida é recusada com o campo', async () => {
    const r = await descreverPecaReutilizavel({ peca: `${PASTA}/ok/receita.js`, modulo: comEsboco({ minimo: 2 }) });
    expect(r.ok).toBe(false);
    expect(r.stderr).toContain('REFINAMENTO DA FORMA GLOBAL INVÁLIDO');
    expect(r.stderr).toContain("'minimo' precisa ser a razão interseção/união mínima");
  });

  it('a forma que o esboço não tem é um achado que reprova', async () => {
    const r = await descreverPecaReutilizavel({ peca: `${PASTA}/ok/receita.js`, modulo: comEsboco({ formas: { bloco: 'bloco', viga: 'trave' } }) });
    expect(r.ok).toBe(false);
    expect(r.stderr).toContain("a parte 'viga' declara refinar a forma 'trave' do esboço ../bloco.esboco.json (opção Bloco e viga)");
  });
});

describe('a guarda do acervo roda a conferência no caminho da receita', () => {
  const guarda = (variante) => conferirAcervo([`${PASTA}/${variante}/receita`]);

  it('aprova a receita que reproduz a forma', async () => {
    const { reprovadas } = await guarda('ok');
    expect(reprovadas).toEqual([]);
  });

  it.each([
    ['sem-recorte', /a parte 'bloco' tem razão interseção\/união de volume 0,882 com a forma 'bloco' do esboço/],
    ['menor', /a parte 'bloco' tem razão/],
    ['deslocada', /a parte 'bloco' tem razão/],
    ['viga-reta', /a parte 'viga' tem razão/],
  ])('reprova %s', async (variante, mensagem) => {
    const { reprovadas } = await guarda(variante);
    expect(reprovadas).toHaveLength(1);
    expect(reprovadas[0].motivo).toMatch(mensagem);
  });
});

describe('o sólido de cada forma é o do módulo do esboço', () => {
  it('a caixa e o volume do bloco recortado são os que o módulo calcula pelas peças convexas', () => {
    const dados = formasDoEsboco(lerJson(ESBOCO), 1);
    const contexto = criarContextoDeSolidos({ origem: [0, 200, 0] });
    try {
      const solidos = criarSolidosDoEsboco(dados, { contexto, malhaDaFamilia: malhaDaFormaDeFamilia });
      const bloco = dados.formas.find((f) => f.id === 'bloco').geometria;
      const m = solidos.solido('bloco');
      expect(contexto.volume(m)).toBeCloseTo(bloco.recorte.volumeMm3, -1);
      const { min, max } = contexto.caixa(m);
      for (let i = 0; i < 3; i++) {
        expect(min[i]).toBeCloseTo(bloco.caixa.min[i], 3);
        expect(max[i]).toBeCloseTo(bloco.caixa.max[i], 3);
      }
      expect(contexto.volume(solidos.solidoInteiro('bloco'))).toBeCloseTo(bloco.recorte.volumeCheioMm3, -1);
    } finally {
      contexto.liberar();
    }
  });

  /* Todos os esboços de prova que o módulo resolve depressa: cada forma, visível ou molde, vira sólido, com a caixa que o módulo calcula. */
  const arquivos = [
    ...readdirSync('modulos/esboco/tests/fixtures').filter((a) => a.endsWith('.esboco.json')).map((a) => join('modulos/esboco/tests/fixtures', a)),
    ...readdirSync('modulos/esboco/tests/fixtures/adversarial').filter((a) => a.endsWith('.esboco.json')).map((a) => join('modulos/esboco/tests/fixtures/adversarial', a)),
    'docs/mecanifica/banco-de-provas/carrinho-refeito-2026-10-08/carrinho-casca.esboco.json',
    'docs/mecanifica/banco-de-provas/rodada-2026-10-11/cadeira-de-rodas/cadeira-de-rodas.esboco.json',
    'docs/mecanifica/banco-de-provas/rodada-2026-10-11/carrinho-de-mao/carrinho-de-mao.esboco.json',
    'tools/fixtures/esboco-com-familias/perna-do-trem.esboco.json',
    ESBOCO,
  ];

  it(`as ${arquivos.length} fontes: nenhuma forma fica sem sólido e a caixa de cada uma é a do módulo`, () => {
    const formas = [];
    const falhas = [];
    const desvios = [];
    for (const arquivo of arquivos) {
      const bruto = lerJson(arquivo);
      for (let opcao = 1; opcao <= bruto.opcoes.length; opcao++) {
        const dados = formasDoEsboco(bruto, opcao);
        const todas = dados.formas.map((f) => f.geometria.caixa);
        const origem = [0, 1, 2].map((i) => (Math.min(...todas.map((c) => c.min[i])) + Math.max(...todas.map((c) => c.max[i]))) / 2);
        const contexto = criarContextoDeSolidos({ origem });
        try {
          const solidos = criarSolidosDoEsboco(dados, { contexto, malhaDaFamilia: malhaDaFormaDeFamilia });
          for (const f of dados.formas) {
            formas.push(f.id);
            try {
              const { min, max } = contexto.caixa(solidos.solido(f.id));
              const desvio = Math.max(...[0, 1, 2].flatMap((i) => [Math.abs(min[i] - f.geometria.caixa.min[i]), Math.abs(max[i] - f.geometria.caixa.max[i])]));
              /* o cilindro e o tubo são polígonos inscritos: a caixa do módulo é a do círculo, e a diferença é a da faceta (até 0,07 mm) */
              if (desvio > 0.1) desvios.push(`${arquivo}#${opcao} ${f.id} (${f.tipo}): ${desvio.toFixed(3)} mm`);
            } catch (erro) {
              falhas.push(`${arquivo}#${opcao} ${f.id} (${f.tipo}): ${erro.message}`);
            }
          }
        } finally {
          contexto.liberar();
        }
      }
    }
    expect(formas.length).toBeGreaterThan(300);
    expect(falhas).toEqual([]);
    expect(desvios).toEqual([]);
  });
});

describe('a forma de família é a malha que o provedor entrega, e o recorte vale nela', () => {
  /* a pá de hélice da família `superficie-aerodinamica` (uma parte só, `fixa`), como peça: a mesma malha do provedor, em metro, no quadro
     da família, com o esboço apontando a forma de família no centro da caixa dela */
  const PEDIDO = { familia: 'superficie-aerodinamica', perfil: 'pa-de-helice', parametros: {} };
  const malha = malhaDaChamada(PEDIDO);
  const caixa = { min: [0, 1, 2].map((i) => Math.min(...malha.vertices.map((v) => v[i]))), max: [0, 1, 2].map((i) => Math.max(...malha.vertices.map((v) => v[i]))) };
  const centro = caixa.min.map((m, i) => (m + caixa.max[i]) / 2);

  function pecaDaMalha({ escala = 1, deslocamento = [0, 0, 0] } = {}) {
    const V = new Map(malha.vertices.map((v, i) => [i, v.map((c, k) => (centro[k] + (c - centro[k]) * escala + deslocamento[k]) / 1000)]));
    const F = new Map();
    for (const { nome, de, ate } of malha.partes) for (let k = de; k < ate; k++) F.set(k, { id: k, vs: malha.faces[k], parte: nome });
    return { V, F };
  }
  const esboco = (cortador = null) => ({
    opcoes: [{
      titulo: 'Pá',
      formas: [
        { id: 'pa', tipo: 'familia', ...PEDIDO, centro, ...(cortador ? { subtrai: ['corte'] } : {}) },
        ...(cortador ? [{ id: 'corte', tipo: 'caixa', cortador: true, ...cortador }] : []),
      ],
    }],
  });
  const declaracao = normalizarEsbocoDoRefinamento({ arquivo: 'pa.esboco.json', formas: { fixa: 'pa' }, minimo: 0.99 });
  const conferir = (peca, bruto) => conferirFormaDoEsbocoDoJson({ esboco: declaracao, bruto, neutro: peca });

  it('a peça que é a malha da família dá razão 1, e a menor e a deslocada reprovam', () => {
    expect(malha.partes.map((p) => p.nome)).toEqual(['fixa']);
    const ok = conferir(pecaDaMalha(), esboco());
    expect(ok.ok).toBe(true);
    expect(ok.partes[0].razao).toBeGreaterThan(0.9999);
    const menor = conferir(pecaDaMalha({ escala: 0.9 }), esboco());
    expect(menor.ok).toBe(false);
    expect(menor.partes[0].razao).toBeLessThan(0.8);
    expect(menor.achados[0]).toMatchObject({ codigo: 'parte-fora-da-forma-do-esboco', parte: 'fixa', formas: ['pa'] });
    const deslocada = conferir(pecaDaMalha({ deslocamento: [20, 0, 0] }), esboco());
    expect(deslocada.ok).toBe(false);
    expect(deslocada.partes[0].razao).toBeLessThan(0.9);
  });

  it('o recorte da forma de família tira o volume do molde, e a peça sem o recorte dá a razão que ele tira', () => {
    const altura = caixa.max[2] - caixa.min[2];
    const molde = { largura: 400, altura: 400, profundidade: altura, centro: [caixa.min[0] + 50 + 200, centro[1], centro[2]] };
    const bruto = esboco(molde);
    const r = conferir(pecaDaMalha(), bruto);
    const parte = r.partes[0];
    expect(parte.volumeFormasMm3).toBeLessThan(parte.volumeParteMm3);
    expect(parte.volumeComumMm3).toBeCloseTo(parte.volumeFormasMm3, -1);
    expect(parte.razao).toBeCloseTo(parte.volumeFormasMm3 / parte.volumeParteMm3, 5);
    expect(parte.razao).toBeLessThan(0.99);
    expect(r.ok).toBe(false);
  });
});

describe('a linha de comando', () => {
  it('liga as partes às formas de mesmo id, ou pelas que o pedido cita', () => {
    const ids = new Set(['bloco', 'viga', 'furo']);
    expect(ligarPartes({ partes: ['bloco', 'tampa', 'viga'], ids, mesmoId: true })).toEqual({ bloco: ['bloco'], viga: ['viga'] });
    expect(ligarPartes({ partes: ['x'], ids, formas: 'conjunto:viga+bloco, bloco:bloco' })).toEqual({ conjunto: ['viga', 'bloco'], bloco: ['bloco'] });
    expect(() => ligarPartes({ partes: ['tampa'], ids, mesmoId: true })).toThrow(/nenhuma parte da peça \(tampa\) tem uma forma de mesmo id/);
    expect(() => ligarPartes({ partes: ['bloco'], ids })).toThrow(/diga como ligar as partes às formas/);
    expect(() => ligarPartes({ partes: [], ids, formas: 'a' })).toThrow(/parte:forma\[\+forma\]/);
    expect(() => ligarPartes({ partes: [], ids, formas: 'a:b,a:c' })).toThrow(/repete a parte 'a'/);
  });

  it('mede a peça fixa sem mudar a receita: o bloco furado passa e o deslocado reprova, com o tempo', async () => {
    const ok = await comoCLI([`${PASTA}/ok/receita.js`, `--esboco=${ESBOCO}`, '--mesmo-id', '--minimo=0.99']);
    expect(ok.stderr).toBe('');
    expect(ok.codigo).toBe(0);
    expect(ok.stdout).toContain('forma de tools/fixtures/forma-do-esboco/ok/receita.js contra o esboço bloco.esboco.json (opção Bloco e viga): aprovada');
    expect(ok.stdout).toMatch(/bloco\s+1,0000\s+ok/);
    expect(ok.stdout).toMatch(/tempo: resolver a opção do esboço .* s, sólidos e razões .* s/);
    const fora = await comoCLI([`${PASTA}/deslocada/receita.js`, `--esboco=${ESBOCO}`, '--formas=bloco:bloco,viga:viga', '--minimo=0.99']);
    expect(fora.codigo).toBe(1);
    expect(fora.stdout).toContain('REPROVADA');
    expect(fora.stdout).toMatch(/bloco\s+0,71\d+\s+ABAIXO/);
    expect(fora.stdout).toContain("ACHADO parte-fora-da-forma-do-esboco: a parte 'bloco' tem razão");
  });

  it('devolve o que mediu como dado, com as partes sem forma ligada', async () => {
    const feito = await formaDoEsbocoDaPeca({ peca: `${PASTA}/ok/receita.js`, esboco: ESBOCO, formas: 'bloco:bloco', minimo: 0.9 });
    expect(feito.semForma).toEqual(['viga']);
    expect(feito.resultado.partes.map((p) => p.parte)).toEqual(['bloco']);
    expect(descreverFormaDoEsboco({ peca: 'x', ...feito })).toContain('sem forma ligada, fora da conferência: viga');
  });

  it.each([
    [['--esboco=a.esboco.json'], /diga a peça/],
    [['tools/fixtures/refina-forma-global/ok/receita.js'], /diga o esboço: --esboco.*ou declare REFINA.esboco/],
    [[`${PASTA}/ok/receita.js`, '--mesmo-id'], /diga o esboço: --esboco/],
    [[`${PASTA}/ok/receita.js`, `--esboco=${ESBOCO}`, '--minimo=2', '--mesmo-id'], /--minimo precisa ser a razão mínima/],
    [[`${PASTA}/ok/receita.js`, `--esboco=${ESBOCO}`, '--mesmo-id', '--minimu=0.9'], /não conheço '--minimu'.*Você quis dizer '--minimo'/s],
  ])('o uso errado %j sai com 2 e diz o que falta', async (argv, mensagem) => {
    const r = await comoCLI(argv);
    expect(r.codigo).toBe(2);
    expect(r.stderr).toMatch(mensagem);
  });

  it('sem --esboco, a CLI lê o REFINA.esboco da receita, com o mínimo próprio de cada parte', async () => {
    const r = await comoCLI([`${PASTA}/minimo-proprio/receita.js`]);
    expect(r.codigo).toBe(0);
    expect(r.stdout).toContain('contra o esboço bloco.esboco.json');
    expect(r.stdout).toMatch(/bloco .*\(bloco, mínimo 0,80\)/);
  });

  it('sem dizer como ligar as partes, a CLI recusa dizendo as duas maneiras', async () => {
    const r = await comoCLI([`${PASTA}/ok/receita.js`, `--esboco=${ESBOCO}`]);
    expect(r.codigo).toBe(1);
    expect(r.stderr).toContain('--mesmo-id (a forma de mesmo id) ou --formas=parte:forma');
  });
});
