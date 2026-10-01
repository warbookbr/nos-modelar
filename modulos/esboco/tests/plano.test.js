/* O `plano` estruturado: medidas nomeadas conferidas contra o esboço, contrato de relações e o esquema do JSON. */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { ErroDeEsboco } from '../src/index.js';
import { expandirEsboco } from '../src/expandir.js';
import { assimetriaDoPar, conferirPlano, lerPlano, textoDoPlano, visiveisDoEsboco } from '../src/plano.js';
import { medirEsboco } from '../src/descrever.js';
import { validarEsquema } from '../src/esquema.js';
import { maisParecido } from '../src/parecido.js';

const fixture = (nome) => JSON.parse(readFileSync(new URL(`./fixtures/${nome}`, import.meta.url), 'utf8'));
const caixa = (id, centro, l = 20, a = 20, p = 20, extra = {}) => ({ id, tipo: 'caixa', largura: l, altura: a, profundidade: p, centro, ...extra });
const com = (formas, plano, extra = {}) => ({ opcoes: [{ titulo: 'T', formas }], contato: { usar: true, tolerancia: 1, folga: 500 }, plano, ...extra });
const conferir = (e) => { const x = expandirEsboco(e); return conferirPlano(x, visiveisDoEsboco(x)); };
const medida = (extra) => ({ nome: 'm', valor: 100, unidade: 'mm', origem: 'ficha', mede: 'alturaTotal', ...extra });
/* duas caixas empilhadas: 20 mm de largura, 40 mm de altura, 20 mm de profundidade */
const pilha = [caixa('a', [0, 10, 0]), caixa('b', [0, 30, 0])];

describe('plano.medidas', () => {
  it('confere a medida contra a caixa que envolve as formas e diz o desvio em mm quando fora da tolerância', () => {
    const dentro = conferir(com(pilha, { medidas: [medida({ valor: 41, tolerancia: 2 })] }));
    expect(dentro.achados).toEqual([]);
    expect(dentro.opcoes[0].medidas[0]).toMatchObject({ nome: 'm', esperado_mm: 41, medido_mm: 40, desvio_mm: -1, tolerancia_mm: 2, ok: true });
    const fora = conferir(com(pilha, { medidas: [medida({ valor: 50, tolerancia: 2 })] }));
    expect(fora.achados).toHaveLength(1);
    expect(fora.achados[0]).toMatchObject({ tipo: 'medida-fora', nome: 'm', desvio_mm: -10, mm: 10 });
    expect(fora.achados[0].texto).toBe('medida "m" fora da tolerância: o esboço mede 40 mm e o plano declara 50 mm (origem: ficha), desvio de -10 mm com tolerância de 2 mm');
  });

  it('converte a unidade (mm, cm, m), usa 2% (mínimo 1 mm) quando não há tolerância e confere larguras e profundidades', () => {
    const r = conferir(com(pilha, { medidas: [
      medida({ nome: 'altura', valor: 4, unidade: 'cm' }),
      medida({ nome: 'largura', valor: 0.02, unidade: 'm', mede: 'larguraTotal' }),
      medida({ nome: 'prof', valor: 20, mede: 'profundidadeTotal' }),
      medida({ nome: 'errada', valor: 100, mede: 'larguraTotal' }),
    ] }));
    expect(r.opcoes[0].medidas.map((m) => `${m.nome}:${m.ok}`)).toEqual(['altura:true', 'largura:true', 'prof:true', 'errada:false']);
    expect(r.opcoes[0].medidas[3].tolerancia_mm).toBe(2);
  });

  it('mede a caixa de formas escolhidas por id ou padrão e a distância entre âncoras, em linha reta ou num eixo', () => {
    const formas = [caixa('a', [0, 10, 0]), caixa('b', [0, 30, 0]), caixa('c', [100, 10, 0])];
    const r = conferir(com(formas, { medidas: [
      medida({ nome: 'ab', valor: 40, mede: { caixa: 'y', formas: ['a', 'b'] } }),
      medida({ nome: 'so-a', valor: 20, mede: { caixa: 'y', formas: ['a*'] } }),
      medida({ nome: 'centros', valor: 100, mede: { distancia: ['a.centro', 'c.centro'], eixo: 'x' } }),
      medida({ nome: 'reta', valor: 100, mede: { distancia: ['a.centro', [100, 10, 0]] } }),
    ] }));
    expect(r.achados).toEqual([]);
    expect(r.opcoes[0].medidas.map((m) => m.medido_mm)).toEqual([40, 20, 100, 100]);
  });

  it('as âncoras de instância e os pontos nomeados valem na distância', () => {
    const j = fixture('moto-curvas.esboco.json');
    const r = conferirPlano(expandirEsboco({ ...j, plano: { medidas: [medida({ nome: 'entreEixos', valor: 1400, mede: { distancia: ['rodaFrente.eixo', 'rodaTras.eixo'], eixo: 'z' } })] } }), visiveisDoEsboco(expandirEsboco(j)));
    expect(r.achados).toEqual([]);
    expect(r.opcoes[0].medidas[0].medido_mm).toBe(1400);
    const p = conferir(com([caixa('a', [0, 0, 0])], { medidas: [medida({ valor: 30, mede: { distancia: ['ponto1', 'ponto2'], eixo: 'y' } })] }, { pontos: { ponto1: [0, 0, 0], ponto2: [0, 30, 0] } }));
    expect(p.achados).toEqual([]);
  });

  it('a medida pode valer só para algumas opções, por título ou número', () => {
    const e = { opcoes: [{ titulo: 'A', formas: [caixa('a', [0, 10, 0])] }, { titulo: 'B', formas: [caixa('a', [0, 30, 0], 20, 60)] }], plano: { medidas: [medida({ nome: 'soA', valor: 20, opcoes: ['A'] }), medida({ nome: 'soB', valor: 60, opcoes: [2] })] } };
    const r = conferir(e);
    expect(r.achados).toEqual([]);
    expect(r.opcoes.map((o) => o.medidas.map((m) => m.nome))).toEqual([['soA'], ['soB']]);
  });

  it('a leitura padrão lista a medida fora da tolerância entre as divergências, sem citar objeto nenhum', () => {
    const { divergencias } = medirEsboco(com(pilha, { medidas: [medida({ valor: 50, tolerancia: 2 })] }), { projecao: false });
    expect(divergencias.map((d) => `${d.n}:${d.classe}`)).toEqual(['1:medida']);
    expect(divergencias[0].texto).toContain('desvio de -10 mm');
  });

  it('o texto do plano continua valendo como string e como plano.texto', () => {
    expect(textoDoPlano('um texto')).toBe('um texto');
    expect(textoDoPlano({ texto: 'outro', medidas: [] })).toBe('outro');
    expect(textoDoPlano({ medidas: [] })).toBeNull();
    expect(lerPlano('texto')).toMatchObject({ texto: 'texto', medidas: [], estruturado: false });
    expect(lerPlano(undefined)).toBeNull();
  });
});

describe('o esquema do plano diz o campo e o valor válido', () => {
  const recusa = (plano, trecho) => {
    expect(() => lerPlano(plano)).toThrow(ErroDeEsboco);
    expect(() => lerPlano(plano)).toThrow(trecho);
  };

  it('campo inexistente, unidade, origem, nível e expressão de medida com "quis dizer"', () => {
    recusa({ medida: [] }, /o campo "medida" não existe \(quis dizer "medidas"\?\); campos válidos: texto, nivel, medidas, contrato/);
    recusa({ nivel: 'detalhdo' }, /"plano.nivel" com o valor "detalhdo" deve ser um de esquematico, medio, detalhado \(quis dizer "detalhado"\?\)/);
    recusa({ medidas: [medida({ unidade: 'milimetros' })] }, /"unidade" com o valor "milimetros" deve ser uma de mm, cm, m/);
    recusa({ medidas: [medida({ origem: 'fotos' })] }, /"origem" com o valor "fotos" deve ser uma de ficha, foto, ia, referencia .*\(quis dizer "foto"\?\)/);
    recusa({ medidas: [medida({ mede: 'alturaTotl' })] }, /"mede" com o valor "alturaTotl" não é uma expressão de medida \(quis dizer "alturaTotal"\?\)/);
    recusa({ medidas: [medida({ mede: { caixa: 'w' } })] }, /"mede.caixa" com o valor "w" deve ser um eixo/);
    recusa({ medidas: [medida({ valor: 'cem' })] }, /"valor" com o valor "cem" deve ser um número positivo/);
    recusa({ medidas: [{ nome: 'm', valor: 1, unidade: 'mm', origem: 'ia' }] }, /falta "mede"/);
    recusa({ medidas: [medida(), medida()] }, /o nome "m" está repetido/);
    recusa({ medidas: [medida({ nom: 'x' })] }, /o campo "nom" não existe/);
    recusa({ contrato: { tocam: [['a']] } }, /um par do contrato deve ser \[idA, idB\]/);
    recusa({ contrato: { toca: [] } }, /o campo "toca" não existe \(quis dizer "tocam"\?\)/);
  });

  it('a medida que aponta uma forma ou âncora que não existe diz os ids válidos', () => {
    const e = (mede) => com(pilha, { medidas: [medida({ mede })] });
    expect(() => conferir(e({ caixa: 'y', formas: ['zz'] }))).toThrow(/"zz" não é uma forma visível da opção .*\(ids: a, b\)/);
    expect(() => conferir(e({ distancia: ['a.meio', 'b.centro'] }))).toThrow(/a forma "a" não tem a âncora "meio"/);
    expect(() => conferir(e({ distancia: ['x.centro', 'b.centro'] }))).toThrow(/aponta para a forma "x", que não é visível/);
  });
});

describe('plano.contrato', () => {
  const tres = [caixa('a', [0, 10, 0]), caixa('b', [0, 30, 0]), caixa('c', [200, 10, 0])];

  it('confere o que deve tocar, o que deve ficar livre e o que deve ser simétrico contra o medido', () => {
    const bom = conferir(com(tres, { contrato: { tocam: [['a', 'b']], livres: [['a', 'c']], simetricas: [{ a: 'a', b: 'c', eixo: 'x', pos: 100 }] } }));
    expect(bom.achados).toEqual([]);
    expect(bom.opcoes[0].contrato.map((c) => `${c.relacao}:${c.ok}`)).toEqual(['toca:true', 'livre:true', 'simetrica:true']);
    const ruim = conferir(com(tres, { contrato: { tocam: [['a', 'c']], livres: [['a', 'b']], simetricas: [{ a: 'a', b: 'b', eixo: 'y', pos: 0 }] } }));
    expect(ruim.achados.map((a) => a.tipo)).toEqual(['contrato-toca', 'contrato-livre', 'assimetria']);
    expect(ruim.achados[0].texto).toBe('a e c deviam tocar (contrato) e há 180 mm de folga');
    expect(ruim.achados[1].texto).toContain('a e b deviam ficar livres (contrato) e se tocam');
  });

  it('a assimetria é o maior entre o desvio do centro refletido e a diferença de extensão', () => {
    const [a, b] = [{ centro: [-100, 0, 0], min: [-110, -10, -10], max: [-90, 10, 10] }, { centro: [103, 0, 0], min: [90, -10, -10], max: [110, 10, 10] }];
    const s = assimetriaDoPar(a, b, 'x', 0);
    expect(s.mm).toBeCloseTo(3, 9);
    expect(s.eixo).toBe('x');
    expect(assimetriaDoPar(a, b).pos).toBeCloseTo(1.5, 9);
    const largo = { ...b, centro: [100, 0, 0], min: [85, -10, -10], max: [115, 10, 10] };
    expect(assimetriaDoPar(a, largo, 'x', 0).mm).toBeCloseTo(10, 9);
  });

  it('o espelho deslocado depois de refletir vira divergência de assimetria e o instância vale como forma principal', () => {
    const j = fixture('moto-curvas.esboco.json');
    const ok = medirEsboco(j, { projecao: false });
    expect(ok.divergencias).toEqual([]);
    const torto = { ...j, formas: j.formas.map((f) => (f.id === 'balancimD' ? { ...f, desloca: [0, 0, 12] } : f)) };
    const r = medirEsboco(torto, { projecao: false });
    const classes = r.divergencias.map((d) => d.classe);
    expect(classes).toContain('assimetria');
    const contrato = r.divergencias.find((d) => d.tipo === 'assimetria' && d.pecas.join() === 'balancimE,balancimD');
    expect(contrato.texto).toContain('balancimE e balancimD deviam ser simétricos');
    /* o contrato já cobre o par: a assimetria não aparece duas vezes */
    expect(r.divergencias.filter((d) => d.tipo === 'assimetria').map((d) => d.opcao)).toEqual(['A. Naked', 'B. Café racer']);
    /* sem o contrato declarado, todo espelho deslocado depois de refletir é apontado sozinho */
    const sozinho = medirEsboco({ ...torto, plano: { nivel: 'detalhado' } }, { projecao: false });
    expect(sozinho.divergencias.filter((d) => d.tipo === 'assimetria').map((d) => d.texto)).toEqual(Array(2).fill('balancimD é o espelho de balancimE no eixo x, mas foi deslocado 12 mm depois de refletir'));
  });

  it('um id que não existe no contrato diz os ids válidos', () => {
    expect(() => conferir(com(tres, { contrato: { tocam: [['a', 'zzz']] } }))).toThrow(/"zzz" não é uma forma visível da opção .*\(ids: a, b, c\)/);
  });
});

describe('esquema do JSON: campo e valor válido, com "quis dizer"', () => {
  const recusa = (esboco, trecho) => {
    expect(() => validarEsquema(esboco)).toThrow(ErroDeEsboco);
    expect(() => validarEsquema(esboco)).toThrow(trecho);
    expect(() => expandirEsboco(esboco)).toThrow(trecho);
  };
  const forma = (extra) => ({ opcoes: [{ titulo: 'T', formas: [{ id: 'f', tipo: 'cilindro', diametro: 10, comprimento: 20, ...extra }] }] });

  it('campo de forma que não existe, com o nome parecido e os campos do tipo', () => {
    recusa(forma({ diametr: 5 }), /opção 1 \(T\), forma "f": o campo "diametr" não existe em cilindro \(quis dizer "diametro"\?\); campos válidos: id, tipo, .*diametro, comprimento, eixo, achatado, lados/);
    recusa(forma({ largura: 5 }), /o campo "largura" não existe em cilindro; o campo "largura" vale em caixa, envolve; campos válidos/);
  });

  it('tipo de forma, eixo, cor e tipo de par que não existem dizem o valor válido', () => {
    recusa(forma({ tipo: 'cilindo' }), /"tipo" com o valor "cilindo" deve ser um de caixa, cilindro, anel, cone, esfera, extrusao, loft, revolucao, tubo, envolve \(quis dizer "cilindro"\?\)/);
    recusa(forma({ eixo: 'w' }), /"eixo" com o valor "w" deve ser um de x, y, z/);
    recusa(forma({ cor: 'azull' }), /"cor" com o valor "azull" deve ser um nome \(roxo, verde, azul, .*\) ou um hexadecimal de 6 dígitos como "#3d6fb5" \(quis dizer "azul"\?\)/);
    recusa({ ...forma({}), contato: { usar: true, pares: [{ a: 'f', b: 'g', tipo: 'atravesa', max: 1, motivo: 'x' }] } }, /contato\.pares\[0\]: "tipo" com o valor "atravesa" deve ser um de atravessa, encosta, livre \(quis dizer "atravessa"\?\)/);
    recusa(forma({ diametro: { valor: 1 } }), /o campo "diametro" com o valor \{"valor":1\} deve ser um número em mm, o nome de um parâmetro ou "=expressão"/);
    recusa(forma({ oculto: 'sim' }), /"oculto" deve ser true ou false/);
  });

  it('campo da raiz, da opção, do contato e da explosão que não existe', () => {
    recusa({ opcoe: [], opcoes: [{ formas: [{ id: 'f', tipo: 'esfera', diametro: 1 }] }] }, /esboço: o campo "opcoe" não existe \(quis dizer "opcoes"\?\); campos válidos: nota, opcoes, plano, vista/);
    recusa({ opcoes: [{ titulo: 'T', nota: 'x', forma: [] }] }, /opção 1 \(T\): o campo "forma" não existe \(quis dizer "formas"\?\)/);
    recusa({ ...forma({}), contato: { usa: true } }, /esboço: contato: o campo "usa" não existe \(quis dizer "usar"\?\)/);
    recusa({ ...forma({}), contato: { usar: true, projecao: { limiar: 0.1, reprovar: true } } }, /contato\.projecao: o campo "reprovar" não existe \(quis dizer "reprova"\?\)/);
    recusa({ ...forma({}), explosao: { eixo: 'x', fatr: 2 } }, /explosao: o campo "fatr" não existe \(quis dizer "fator"\?\)/);
  });

  it('as fixtures do repositório continuam válidas', () => {
    for (const nome of ['casa', 'mancal-eixo', 'moto', 'moto-componentes', 'moto-curvas', 'moto-parametros', 'moto-relacoes', 'teste-cubo']) {
      expect(() => validarEsquema(fixture(`${nome}.esboco.json`))).not.toThrow();
    }
  });

  it('"quis dizer" acha o nome parecido e não inventa um quando nada se parece', () => {
    expect(maisParecido('altura', ['largura', 'altura', 'profundidade'])).toBe('altura');
    expect(maisParecido('alutra', ['largura', 'altura', 'profundidade'])).toBe('altura');
    expect(maisParecido('xyz', ['largura', 'altura'])).toBeNull();
    expect(maisParecido('ALTURA', ['altura'])).toBe('altura');
    expect(maisParecido('atravesa', ['atravessa', 'encosta', 'livre'])).toBe('atravessa');
  });
});
