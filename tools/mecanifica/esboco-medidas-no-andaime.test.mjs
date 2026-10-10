/* A prova das medidas do `plano.medidas` lidas na blocagem do nível zero, sobre os esboços do módulo e do banco de provas que as
   declaram: a leitura na blocagem do andaime traduzido e a do módulo (`conferirPlano`, a de `--medidas`) concordam, uma medida
   alterada para reprovar reprova nas duas com o mesmo desvio, e o que o tradutor aproxima ou deixa de fora não muda uma leitura
   sem aparecer nela (a caçamba cheia não muda o envelope; a forma sem tradução ou recolhida só deixa a medida passar quando não
   pode mudá-la, e senão a medida volta não lida).

   Tolerâncias, e por que valem:
   - Concordância da blocagem com a mesma conta sobre o dado do esboço: 0,05 mm. O tubo e o cilindro fora dos eixos têm o polígono
     inscrito de 48 e 128 lados girado em relação ao do esboço, e dois n-gonos no mesmo círculo diferem na caixa por no máximo
     r (1 - cos(pi / n)); o pior caso medido nas fixtures é 0,0089 mm (a largura entre os pés do carrinho, de tubo de 26 mm).
     As formas de arestas retas e de eixo no lugar dão a mesma conta até o arredondamento de 1e-6 mm do andaime.
   - Dado do esboço contra o módulo: iguais depois do arredondamento de 0,1 mm que o módulo faz (e o mesmo veredito).
   - Desvio da medida reprovada, blocagem contra módulo: 0,1 mm, o do arredondamento do módulo somado ao da blocagem.
   Todas as medidas das fixtures são lidas na blocagem; a lista de `NAO_LIDAS` é a decisão registrada, e uma medida nova fora dela
   que deixe de ser lida reprova. */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { andaimeDoEsboco, g01DoEsboco, medidasDoAndaime, medidasDoArquivo } from './esboco-para-andaime.mjs';

const TOLERANCIA_DE_CONCORDANCIA = 0.05;
const ARREDONDAMENTO_DO_MODULO = 0.1;

const pastaDoModulo = new URL('../../modulos/esboco/tests/fixtures/', import.meta.url);
const pastaDoBanco = new URL('../../docs/mecanifica/banco-de-provas/', import.meta.url);
const lerJson = (url) => JSON.parse(readFileSync(url, 'utf8'));
const arquivosDoModulo = readdirSync(fileURLToPath(pastaDoModulo)).filter((n) => n.endsWith('.esboco.json')).sort();
const doBanco = [
  'rodada-2026-10-08/cadeira/cadeira-jantar', 'rodada-2026-10-08/guarda-roupa/guarda-roupa',
  'rodada-2026-10-08/cadeira-de-rodas/cadeira-de-rodas', 'rodada-2026-10-08/carrinho-de-mao/carrinho-de-mao',
  'carrinho-refeito-2026-10-08/carrinho-casca', 'carrinho-refeito-2026-10-08/chassi-aprovado', 'carrinho-refeito-2026-10-08/chassi-e-cacamba',
  'empilhadeira-2026-10-09/tentativa-haiku/carcaca', 'empilhadeira-2026-10-09/tentativa-ia-local/chassi-empilhadeira',
];
const caminhos = new Map([
  ...arquivosDoModulo.map((n) => [n, new URL(n, pastaDoModulo)]),
  ...doBanco.map((n) => [`${n.split('/').pop()}.esboco.json`, new URL(`${n}.esboco.json`, pastaDoBanco)]),
]);

/* Os esboços com `plano.medidas`, pela leitura do próprio arquivo: opção a opção, com quantas medidas valem para ela. */
const COM_MEDIDAS = [...caminhos].map(([nome, url]) => ({ nome, url, esboco: lerJson(url) }))
  .filter(({ esboco }) => Array.isArray(esboco.plano?.medidas) && esboco.plano.medidas.length > 0);
const opcoesDe = (esboco) => esboco.opcoes.map((_, i) => i + 1);

/* O que o esboço não deixa ler na blocagem: por esboço e opção, os nomes das medidas. Nas fixtures de hoje todas se leem. */
const NAO_LIDAS = {};

describe('as medidas do plano lidas na blocagem do andaime: as fixtures do módulo e do banco de provas', () => {
  it('os esboços com plano.medidas são os esperados', () => {
    expect(COM_MEDIDAS.map((c) => c.nome)).toEqual([
      'moto-curvas.esboco.json', 'cadeira-jantar.esboco.json', 'guarda-roupa.esboco.json', 'cadeira-de-rodas.esboco.json', 'carrinho-de-mao.esboco.json',
      'carrinho-casca.esboco.json', 'chassi-aprovado.esboco.json', 'chassi-e-cacamba.esboco.json', 'carcaca.esboco.json', 'chassi-empilhadeira.esboco.json',
    ]);
    expect(COM_MEDIDAS.some((c) => c.esboco.plano.referencia !== undefined)).toBe(false);
  });

  for (const { nome, esboco } of COM_MEDIDAS) {
    for (const opcao of opcoesDe(esboco)) {
      describe(`${nome}, opção ${opcao}`, () => {
        const r = medidasDoAndaime(esboco, { opcao });

        it('lê todas as medidas da opção na blocagem, menos as registradas como não lidas', () => {
          expect(r.naBlocagem.medidas.length).toBeGreaterThan(0);
          expect(r.naBlocagem.medidas.length).toBe(r.doEsboco.length);
          expect(r.naBlocagem.medidas.filter((m) => !m.lida).map((m) => m.nome)).toEqual(NAO_LIDAS[`${nome}#${opcao}`] ?? []);
          expect(r.naBlocagem.medidas.map((m) => m.nome)).toEqual(r.doEsboco.map((m) => m.nome));
        });

        it('a mesma conta sobre o dado do esboço dá a leitura do módulo, medida a medida', () => {
          r.noDado.medidas.forEach((m, k) => {
            const d = r.doEsboco[k];
            expect(m.lida, m.nome).toBe(true);
            expect({ nome: m.nome, origem: m.origem, esperado_mm: m.esperado_mm, medido_mm: m.medido_mm, desvio_mm: m.desvio_mm, tolerancia_mm: m.tolerancia_mm, ok: m.ok })
              .toEqual({ nome: d.nome, origem: d.origem, esperado_mm: d.esperado_mm, medido_mm: d.medido_mm, desvio_mm: d.desvio_mm, tolerancia_mm: d.tolerancia_mm, ok: d.ok });
          });
        });

        it('a blocagem e o esboço concordam dentro de 0,05 mm, com o mesmo veredito, e a diferença cabe nas perdas declaradas', () => {
          r.comparacao.forEach((c, k) => {
            const m = r.naBlocagem.medidas[k];
            if (!m.lida) return;
            expect(c.diferenca_mm, m.nome).toBeLessThanOrEqual(TOLERANCIA_DE_CONCORDANCIA);
            expect(c.mesmoVeredito, m.nome).toBe(true);
            expect(c.concordam, m.nome).toBe(true);
            expect(c.explicada, m.nome).toBe(true);
            expect(Math.abs(m.medido_mm - r.doEsboco[k].medido_mm), m.nome).toBeLessThanOrEqual(ARREDONDAMENTO_DO_MODULO + 1e-9);
            expect(m.ok, m.nome).toBe(r.doEsboco[k].ok);
          });
        });

        it('uma medida alterada para reprovar reprova nas duas leituras com o mesmo desvio', () => {
          const alterado = JSON.parse(JSON.stringify(esboco));
          const lidas = r.doEsboco;
          /* cada medida passa a declarar o valor medido mais três tolerâncias e 5 mm, em mm, com a tolerância de antes */
          alterado.plano.medidas = alterado.plano.medidas.map((m) => {
            const antes = lidas.find((x) => x.nome === m.nome);
            if (!antes) return m;
            return { ...m, valor: antes.medido_mm + 3 * antes.tolerancia_mm + 5, unidade: 'mm', tolerancia: antes.tolerancia_mm };
          });
          const a = medidasDoAndaime(alterado, { opcao });
          expect(a.naBlocagem.medidas.length).toBe(r.naBlocagem.medidas.length);
          a.naBlocagem.medidas.forEach((m, k) => {
            const d = a.doEsboco[k];
            const dado = a.noDado.medidas[k];
            expect(d.ok, m.nome).toBe(false);
            expect(m.lida, m.nome).toBe(true);
            expect(m.ok, m.nome).toBe(false);
            expect(dado.ok, m.nome).toBe(false);
            expect(Math.abs(m.desvioExato_mm - dado.desvioExato_mm), m.nome).toBeLessThanOrEqual(TOLERANCIA_DE_CONCORDANCIA);
            expect(Math.abs(m.desvio_mm - d.desvio_mm), m.nome).toBeLessThanOrEqual(ARREDONDAMENTO_DO_MODULO + 1e-9);
          });
          expect(a.naBlocagem.resumo.reprovadas).toBe(a.naBlocagem.medidas.length);
        });
      });
    }
  }

  it('a leitura é determinística e o arquivo lido dá a mesma que o esboço lido', () => {
    const { nome, url, esboco } = COM_MEDIDAS.find((c) => c.nome === 'moto-curvas.esboco.json');
    expect(JSON.stringify(medidasDoAndaime(esboco, { opcao: 2 }))).toBe(JSON.stringify(medidasDoAndaime(esboco, { opcao: 2 })));
    expect(JSON.stringify(medidasDoArquivo(fileURLToPath(url), { opcao: 2 }))).toBe(JSON.stringify(medidasDoAndaime(esboco, { opcao: 2 })));
    expect(JSON.stringify(medidasDoAndaime(esboco, { opcao: 'B. Café racer' }).naBlocagem)).toBe(JSON.stringify(medidasDoAndaime(esboco, { opcao: 2 }).naBlocagem));
    expect(nome).toBe('moto-curvas.esboco.json');
  });

  it('as medidas que valem só para uma opção não entram na outra', () => {
    const { esboco } = COM_MEDIDAS.find((c) => c.nome === 'moto-curvas.esboco.json');
    const naked = medidasDoAndaime(esboco, { opcao: 1 }).naBlocagem.medidas.map((m) => m.nome);
    const cafe = medidasDoAndaime(esboco, { opcao: 2 }).naBlocagem.medidas.map((m) => m.nome);
    expect(naked).toContain('alturaNaked');
    expect(naked).not.toContain('alturaCafe');
    expect(cafe).toContain('larguraGuidaoCafe');
    expect(cafe).not.toContain('larguraGuidaoNaked');
  });

  it('um esboço sem plano.medidas não tem o que ler', () => {
    const r = medidasDoAndaime(lerJson(caminhos.get('casa.esboco.json')));
    expect(r.naBlocagem.medidas).toEqual([]);
    expect(r.naBlocagem.resumo).toEqual({ total: 0, lidas: 0, naoLidas: 0, reprovadas: 0 });
    expect(r.comparacao).toEqual([]);
  });

  describe('a caçamba do carrinho: casca e seção inclinada não mudam o envelope', () => {
    const { esboco } = COM_MEDIDAS.find((c) => c.nome === 'carrinho-casca.esboco.json');
    const r = medidasDoAndaime(esboco);

    it('as medidas da caçamba são lidas na blocagem, tocadas pela perda declarada, e iguais às do esboço', () => {
      const daCacamba = ['larguraDaBocaDaCacamba', 'comprimentoDaCacamba', 'alturaDaCacamba', 'profundidadeDaBacia'];
      expect(r.traducao.perdas.map((p) => p.id)).toContain('cacamba');
      for (const nome of daCacamba) {
        const k = r.naBlocagem.medidas.findIndex((m) => m.nome === nome);
        expect(r.naBlocagem.medidas[k].perdas, nome).toEqual(['cacamba']);
        expect(r.comparacao[k].diferenca_mm, nome).toBeLessThanOrEqual(1e-5);
      }
      /* as medidas de total passam pela caçamba também, e continuam iguais */
      for (const nome of ['comprimentoTotal', 'alturaDasManoplas']) {
        const k = r.naBlocagem.medidas.findIndex((m) => m.nome === nome);
        expect(r.naBlocagem.medidas[k].perdas, nome).toContain('cacamba');
        expect(r.comparacao[k].diferenca_mm, nome).toBeLessThanOrEqual(TOLERANCIA_DE_CONCORDANCIA);
      }
    });

    it('a perda de envelope declarada pelo tradutor para a caçamba cabe no que a leitura admite', () => {
      const [p] = r.traducao.perdas.filter((x) => x.id === 'cacamba');
      expect(p.erroEnvelope.mm).toBeLessThanOrEqual(1e-5);
      for (const m of r.naBlocagem.medidas.filter((x) => x.perdas.includes('cacamba'))) expect(m.limiteDasPerdas_mm).toBeGreaterThanOrEqual(p.erroEnvelope.mm);
    });
  });

  describe('o que o tradutor deixa de fora ou recolhe', () => {
    const moto = COM_MEDIDAS.find((c) => c.nome === 'moto-curvas.esboco.json').esboco;
    const comMedidas = (esboco, medidas) => ({ ...JSON.parse(JSON.stringify(esboco)), plano: { nivel: 'medio', ...(typeof esboco.plano === 'object' ? JSON.parse(JSON.stringify(esboco.plano)) : { texto: esboco.plano }), medidas } });
    const m = (nome, mede, valor) => ({ nome, valor, unidade: 'mm', origem: 'ia', mede });

    it('a forma sem tradução (a perna do garfo) não impede o total que ela não muda, e impede a medida que só dela depende', () => {
      const esboco = comMedidas(moto, [m('total', 'alturaTotal', 856), m('daPerna', { caixa: 'y', formas: ['garfoE.perna'] }, 400), m('doGarfo', { caixa: 'z', formas: ['garfoE.*', 'garfoD.*'] }, 400)]);
      const r = medidasDoAndaime(esboco, { opcao: 1 });
      expect(r.traducao.naoTraduzidas.map((n) => n.id)).toEqual(['garfoE.perna', 'garfoD.perna']);
      const [total, perna, garfo] = r.naBlocagem.medidas;
      expect(total.lida).toBe(true);
      expect(total.foraDoAndaime).toEqual(['garfoD.perna', 'garfoE.perna']);
      expect(perna.lida).toBe(false);
      expect(perna.motivo).toContain('a forma "garfoE.perna" (cone) não tem tradução');
      expect(perna.motivo).toContain('rotação não deixa nenhum eixo da forma sobre um eixo do mundo');
      expect(perna.formas).toEqual(['garfoE.perna']);
      expect(r.noDado.medidas[1].lida).toBe(true);
      /* o garfo tem outras formas que se traduzem, mas a perna (cone girado em dois eixos) passa delas em z: não se lê */
      expect(garfo.lida).toBe(false);
      expect(garfo.motivo).toContain('a forma "garfoE.perna" (cone) não tem tradução');
      expect(garfo.motivo).toContain('passa de');
      expect(garfo.formas).toContain('garfoE.perna');
    });

    it('um componente recolhido ao envelope da principal: a instância lê quando as outras formas cabem, e o total não perde nada', () => {
      const base = lerJson(caminhos.get('moto-componentes.esboco.json'));
      const total = andaimeDoEsboco(base).andaime.volumes.length;
      const esboco = comMedidas(base, [m('alt', 'alturaTotal', 850), m('comp', 'profundidadeTotal', 2000), m('rodaEmY', { caixa: 'y', formas: ['rodaFrente'] }, 610), m('cuboD', { caixa: 'x', formas: ['rodaFrente.cuboD'] }, 60)]);
      const r = medidasDoAndaime(esboco, { opcao: 1, volumesMaximos: total - 2 });
      const recolhida = r.traducao.perdas.find((p) => p.tipo === 'componente');
      expect(recolhida.id).toBe('rodaFrente');
      const [alt, comp, roda, cubo] = r.naBlocagem.medidas;
      expect(alt.lida && comp.lida && roda.lida).toBe(true);
      expect(roda.perdas).toEqual(['rodaFrente']);
      for (const x of [alt, comp, roda]) expect(r.comparacao[r.naBlocagem.medidas.indexOf(x)].concordam).toBe(true);
      expect(cubo.lida).toBe(false);
      expect(cubo.motivo).toContain('foi recolhida com o componente rodaFrente');
      expect(r.noDado.medidas[3].lida).toBe(true);
    });

    it('a seção ponto de um loft, perto da borda, desloca o envelope pelo que a perda declara, e a diferença é explicada por ela', () => {
      /* a ponta em ponto vira o polígono do vizinho a 1%; a 49,8 mm do centro ele passa 0,3 mm da borda da outra seção */
      const esboco = {
        vista: 'isometrica',
        plano: { nivel: 'medio', medidas: [m('largura', { caixa: 'x', formas: ['l'] }, 100), m('comprimento', { caixa: 'z', formas: ['l'] }, 80)] },
        opcoes: [{ titulo: 'ponta', formas: [{ id: 'l', tipo: 'loft', eixo: 'z', centro: [0, 40, 0], secoes: [{ pos: 0, tamanho: [100, 60] }, { pos: 80, tamanho: [0, 0], centro: [49.8, 0] }] }] }],
      };
      const r = medidasDoAndaime(esboco);
      const [p] = r.traducao.perdas;
      expect(p.perdido.map((d) => d.codigo)).toEqual(['secao-ponto']);
      expect(p.erroEnvelope.mm).toBeGreaterThan(0.2);
      const largura = r.comparacao[0];
      expect(largura.diferenca_mm).toBeGreaterThan(TOLERANCIA_DE_CONCORDANCIA);
      expect(largura.concordam).toBe(false);
      expect(largura.explicada).toBe(true);
      expect(largura.diferenca_mm).toBeLessThanOrEqual(p.erroEnvelope.mm + 1e-6);
      expect(r.comparacao[1].concordam).toBe(true);
    });
  });

  describe('o G01 do andaime quando o esboço tem contorno de referência', () => {
    const cubo = lerJson(caminhos.get('teste-cubo.esboco.json'));
    const retangulo = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
    /* o alvo sintético: o cubo de 100 mm com a base no chão, as três silhuetas retangulares */
    const alvo = (ajuste = {}) => ({
      formato: 'mecanifica.alvo-forma-global@2', id: 'alvo-cubo', objetivo: 'cubo-nivel-zero', familia: 'peca-mecanica',
      intencao: 'cubo de 100 mm com cantos de 10 mm', unidade: 'mm', eixos: { direita: '+x', cima: '+y', frente: '+z' },
      envelope: { min: [-50, 0, -50], max: [50, 100, 50] },
      procedencia: { tipo: 'teste', referencias: ['repo://tools/mecanifica/esboco-medidas-no-andaime.test.mjs'] },
      rubrica: { id: 'cubo', categoriaEsperada: 'cubo', criterios: ['categoria-identificavel'], papeisAuxiliares: [] },
      landmarks: [{ id: 'centro-do-conjunto', posicao: [0, 50, 0], tolerancia: 5 }],
      regioesObrigatorias: ['sem-regiao'],
      vistas: Object.fromEntries(['frontal', 'direita', 'superior'].map((v) => [v, { contornos: [{ id: 'silhueta', papel: 'massa-primaria', pontos: retangulo(-50, v === 'superior' ? -50 : 0, 50, v === 'superior' ? 50 : 100) }] }])),
      limiares: { iouMinimo: 0.97, desvioMaximo: 0.05, erroEnvelopeRelativoMaximo: 0.01, erroLandmarkNormalizadoMaximo: 1 },
      orcamento: { volumesMaximos: 4, triangulosMaximos: 20000, resolucaoGrade: 96 }, rejeicoes: ['forma-parcial'], ...ajuste,
    });
    const referencia = { arquivo: 'referencias/frontal.contornos.json', vista: 'frontal' };

    it('sem plano.referencia não há contorno para o alvo: a chamada diz que não rodou e por quê', () => {
      for (const { esboco } of COM_MEDIDAS) expect(g01DoEsboco(esboco)).toMatchObject({ rodou: false, referencias: 0 });
      expect(g01DoEsboco(cubo).motivo).toContain('não declara plano.referencia');
    });

    it('com plano.referencia e sem alvo diz que falta o alvo N2, e não inventa a silhueta das três vistas', () => {
      const r = g01DoEsboco({ ...cubo, plano: { nivel: 'medio', referencia: [referencia] } });
      expect(r).toMatchObject({ rodou: false, referencias: 1 });
      expect(r.motivo).toContain('referencias/frontal.contornos.json');
      expect(r.motivo).toContain('falta o alvo');
    });

    it('com o alvo sintético roda o G01 completo sobre o andaime do esboço: medidas aprovadas, e aprova com a crítica do alvo', () => {
      const a = alvo();
      const r = g01DoEsboco(cubo, { alvo: a });
      expect(r.rodou).toBe(true);
      expect(r.traducao.andaime.alvo).toBe('alvo-cubo');
      expect(r.g01.medidasAprovadas).toBe(true);
      expect(r.g01.avaliacao.vistas.map((v) => v.estado)).toEqual(['aprovada', 'aprovada', 'aprovada']);
      expect(r.g01.estado).toBe('bloqueado');
      const critica = {
        formato: 'mecanifica.critica-alvo-forma-global@1', papel: 'critico-visual-independente', contexto: 'alvo-e-rubrica-sem-blocagem',
        alvo: a.id, estado: 'aprovada', categoriaReconhecida: 'cubo',
        criterios: [{ id: 'categoria-identificavel', estado: 'passa', achado: 'cubo reconhecível.' }], achados: [],
      };
      expect(g01DoEsboco(cubo, { alvo: a, critica }).g01.estado).toBe('aprovado');
      const referenciado = g01DoEsboco({ ...cubo, plano: { nivel: 'medio', referencia: [referencia] } }, { alvo: a });
      expect(referenciado).toMatchObject({ rodou: true, referencias: 1 });
    });

    it('um alvo de outras proporções reprova no envelope e na silhueta', () => {
      const alto = alvo({ envelope: { min: [-50, 0, -50], max: [50, 160, 50] }, landmarks: [{ id: 'centro-do-conjunto', posicao: [0, 80, 0], tolerancia: 5 }] });
      alto.vistas.frontal.contornos[0].pontos = retangulo(-50, 0, 50, 160);
      alto.vistas.direita.contornos[0].pontos = retangulo(-50, 0, 50, 160);
      const r = g01DoEsboco(cubo, { alvo: alto });
      expect(r.g01.medidasAprovadas).toBe(false);
      expect(r.g01.avaliacao.diagnosticos.map((d) => d.codigo)).toEqual(expect.arrayContaining(['envelope-reprovado', 'silhueta-reprovada']));
    });
  });
});
