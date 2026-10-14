/* familia.test.js — a família de desenho (`mecanifica.familia-de-desenho@1`): o arquivo com o desenho parametrizado e a faixa de cada
   parâmetro, os valores que ela aceita, o desenho especializado que se resolve sozinho e a prova de que ele resolve nos extremos e no
   médio de cada parâmetro. A prova é o que pega a amarração errada: o desenho que resolve no padrão e quebra no extremo. */
import { describe, expect, it } from 'vitest';
import { casosDaProva, desenhar, especializarFamilia, lerCatalogoDePecas, lerFamiliaDeDesenho, provarFamilia, valoresDaFamilia } from '../src/index.js';
import { carrinho } from './carrinho.js';
import { anelCoaxial, arcoDeRodaComAro, carcacaSintetica, familiaSintetica } from './pecas.js';

const lida = (mudar = () => {}) => { const f = familiaSintetica(); mudar(f); return lerFamiliaDeDesenho(f); };
const erros = (mudar) => lida(mudar).erros;
const familia = () => lida().familia;

/* O carrinho como família de um parâmetro, o raio da roda. Com o chute da caçamba fixo, a roda grande a deixa do outro lado do braço;
   com o chute preso ao parâmetro, a mesma família resolve em toda a faixa. */
const familiaDoCarrinho = (chutePreso) => {
  const d = carrinho();
  d.formato = 'mecanifica.desenho@3';
  d.relacoes.find((r) => r.nome === 'raio da roda').mm = 'raioDaRoda';
  d.pontos.C = [10, '=raioDaRoda-20'];
  if (chutePreso) { d.pontos.A = [260, '=raioDaRoda+150']; d.pontos.B = [900, '=raioDaRoda+300']; }
  return {
    formato: 'mecanifica.familia-de-desenho@1', id: 'carrinho-de-mao', versao: '1.0.0',
    parametros: { raioDaRoda: { unidade: 'mm', padrao: 200, minimo: 180, medio: 210, maximo: 250 } },
    desenho: d,
  };
};

describe('lerFamiliaDeDesenho', () => {
  it('aceita a família sintética e a devolve com os parâmetros em ordem de nome, o padrão, a faixa e a unidade de cada um', () => {
    const { erros: e, familia: f } = lida();
    expect(e).toEqual([]);
    expect(f.id).toBe('carcaca-sintetica');
    expect(Object.keys(f.parametros)).toEqual(['altura', 'alturaDoMastro', 'aro', 'comprimento', 'diametroDoMastro', 'raioDoArco', 'recuo', 'topoDoArco', 'vao']);
    expect(f.parametros.raioDoArco).toEqual({ unidade: 'mm', padrao: 260, minimo: 220, medio: 270, maximo: 320 });
    expect(Object.keys(f.perfis)).toEqual(['compacta', 'larga']);
    expect(f.perfis.compacta.parametros).toEqual({ comprimento: 1800, altura: 600, vao: 300, topoDoArco: 300, raioDoArco: 220, recuo: 150 });
  });

  it('recusa o formato, o id, a versão, o campo estranho e a lista de parâmetros vazia', () => {
    expect(erros((f) => { f.formato = 'mecanifica.familia@1'; })[0]).toMatch(/"formato" deve ser "mecanifica.familia-de-desenho@1"/);
    expect(erros((f) => { f.id = 'Carcaça'; })[0]).toMatch(/"id" deve ser um nome em minúsculas separado por hífen/);
    expect(erros((f) => { f.versao = '1'; })[0]).toMatch(/"versao" deve ser/);
    expect(erros((f) => { f.cor = 'azul'; })[0]).toMatch(/campo desconhecido "cor" na família/);
    expect(erros((f) => { f.parametros = {}; })[0]).toMatch(/"parametros" deve ser um objeto .* com ao menos um parâmetro/);
  });

  it('recusa a faixa fora de ordem, o padrão fora da faixa, a unidade que não existe e o nome que não é identificador', () => {
    expect(erros((f) => { f.parametros.vao.medio = 600; })[0]).toBe('o parâmetro "vao" deve ter mínimo <= médio <= máximo e mínimo < máximo; veio 300, 600 e 520 mm');
    expect(erros((f) => { f.parametros.vao.padrao = 100; })[0]).toBe('o parâmetro "vao" tem o padrão 100 fora da faixa de 300 a 520 mm');
    expect(erros((f) => { f.parametros.vao.unidade = 'polegada'; })[0]).toMatch(/o parâmetro "vao" precisa de "unidade" entre "mm", "graus", "razao" e veio "polegada"/);
    expect(erros((f) => { delete f.parametros.vao.maximo; })[0]).toBe('o parâmetro "vao" precisa de "maximo" como número');
    expect(erros((f) => { f.parametros['raio do arco'] = f.parametros.vao; })[0]).toMatch(/o parâmetro "raio do arco" deve ter nome de identificador/);
    expect(erros((f) => { f.parametros.vao.cor = 1; })[0]).toMatch(/o parâmetro "vao" tem o campo desconhecido "cor"/);
  });

  it('recusa o perfil com valor fora da faixa ou de parâmetro que a família não tem', () => {
    expect(erros((f) => { f.perfis.larga.parametros.vao = 900; })[0]).toBe('o perfil "larga" dá 900 ao parâmetro "vao", fora da faixa de 300 a 520 mm');
    expect(erros((f) => { f.perfis.larga.parametros.cor = 1; })[0]).toBe('o perfil "larga" cita o parâmetro "cor", que a família não tem');
    expect(erros((f) => { f.perfis.Larga = f.perfis.larga; })[0]).toMatch(/o perfil "Larga" deve ter nome em minúsculas separado por hífen/);
  });

  it('o parâmetro é escrito uma vez: repetido em "parametros" do desenho é recusado', () => {
    expect(erros((f) => { f.desenho.parametros.vao = 420; })).toEqual(['o parâmetro "vao" está na família e em "parametros" do desenho; escreva o valor uma vez, na família']);
  });

  it('o parâmetro que nenhum campo do desenho lê é recusado, porque a faixa dele não mudaria nada', () => {
    const e = erros((f) => { f.parametros.corDaTinta = { unidade: 'razao', padrao: 1, minimo: 0, medio: 0.5, maximo: 1 }; });
    expect(e).toEqual(['o parâmetro "corDaTinta" não é lido por nenhum campo do desenho; a faixa dele não mudaria nada. Use o nome num campo numérico do desenho ou tire o parâmetro da família']);
    /* lido só por outro parâmetro que ninguém usa: também não conta */
    expect(erros((f) => { f.parametros.base = { unidade: 'mm', padrao: 1, minimo: 1, medio: 1, maximo: 2 }; f.desenho.parametros.derivadoMorto = '=base*2'; })[0]).toMatch(/o parâmetro "base" não é lido/);
  });

  it('o desenho com os valores padrão precisa valer: o erro do desenho sai com a frase da validação', () => {
    expect(erros((f) => { f.desenho.relacoes.pop(); delete f.desenho.usos.mastro.parametros.diametro; })[0]).toMatch(/^o desenho da família, com os valores padrão, não vale: o uso "mastro" da peça "anelCoaxial": falta o parâmetro obrigatório "diametro"/);
    expect(erros((f) => { f.desenho.formato = 'mecanifica.desenho@2'; })[0]).toMatch(/o "formato" do desenho da família deve ser "mecanifica.desenho@3"/);
  });
});

describe('valoresDaFamilia', () => {
  it('o padrão, depois o perfil, depois os valores dados', () => {
    const f = familia();
    expect(valoresDaFamilia(f).valores.vao).toBe(420);
    expect(valoresDaFamilia(f, { perfil: 'larga' }).valores).toMatchObject({ comprimento: 2600, vao: 520, aro: 40, altura: 700 });
    expect(valoresDaFamilia(f, { perfil: 'larga', valores: { vao: 400, altura: 800 } }).valores).toMatchObject({ comprimento: 2600, vao: 400, altura: 800 });
  });

  it('recusa o valor fora da faixa dizendo a faixa, o parâmetro que não existe, o perfil que não existe e o que não é número', () => {
    const f = familia();
    expect(valoresDaFamilia(f, { valores: { vao: 900 } }).erros).toEqual(['o parâmetro "vao" vale 900 mm, fora da faixa da família (de 300 a 520 mm); a faixa vem das referências medidas, então um valor fora dela é extrapolação: amplie a faixa na família e prove de novo']);
    expect(valoresDaFamilia(f, { valores: { cor: 1 } }).erros[0]).toMatch(/o parâmetro "cor" não existe na família \(os parâmetros são "altura", "alturaDoMastro"/);
    expect(valoresDaFamilia(f, { perfil: 'pequena' }).erros).toEqual(['o perfil "pequena" não existe na família (os perfis são "compacta", "larga")']);
    expect(valoresDaFamilia(f, { valores: { vao: 'largo' } }).erros[0]).toMatch(/o parâmetro "vao" deve ser um número em mm/);
  });
});

describe('especializarFamilia', () => {
  it('dá um desenho @3 que se resolve sozinho, com os valores em "parametros" e as peças dentro', async () => {
    const f = familia();
    const d = especializarFamilia(f, valoresDaFamilia(f).valores);
    expect(Object.keys(d).slice(0, 5)).toEqual(['formato', 'objeto', 'vista', 'olhando', 'parametros']);
    expect(Object.keys(d.parametros).slice(0, 9)).toEqual(['altura', 'alturaDoMastro', 'aro', 'comprimento', 'diametroDoMastro', 'raioDoArco', 'recuo', 'topoDoArco', 'vao']);
    expect(d.parametros).toMatchObject({ vao: 420, folga: '=raioDoArco/10' });
    expect(Object.keys(d.pecas)).toEqual(['arcoDeRodaComAro', 'anelCoaxial']);
    const origem = { desenho: 'lateral.desenho.json', sha256: 'x' };
    const dela = await desenhar(d, { origem });
    const direto = await desenhar(carcacaSintetica(), { origem });
    expect(dela.relatorio.estado).toBe('resolvido');
    expect(JSON.stringify(dela.contornos)).toBe(JSON.stringify(direto.contornos));
  });

  it('é determinística, e muda só o que o parâmetro cita: a largura do painel acompanha o comprimento', async () => {
    const f = familia();
    const a = JSON.stringify(especializarFamilia(f, valoresDaFamilia(f, { valores: { comprimento: 2500 } }).valores));
    expect(JSON.stringify(especializarFamilia(f, valoresDaFamilia(f, { valores: { comprimento: 2500 } }).valores))).toBe(a);
    const { relatorio } = await desenhar(JSON.parse(a));
    expect(relatorio.medidas.partes['arco.painel'].larguraMm).toBe(2500);
    expect(relatorio.medidas.partes['arco.aro'].larguraMm).toBe(445);
  });

  it('põe no desenho só as peças do catálogo que ele usa, para o arquivo gravado não depender do catálogo', async () => {
    const { pecas } = lerCatalogoDePecas({ formato: 'mecanifica.pecas-de-desenho@1', pecas: { arcoDeRodaComAro: arcoDeRodaComAro(), anelCoaxial: anelCoaxial(), naoUsada: anelCoaxial() } });
    const bruta = familiaSintetica();
    delete bruta.desenho.pecas;
    const { erros: e, familia: f } = lerFamiliaDeDesenho(bruta, { pecas });
    expect(e).toEqual([]);
    const d = especializarFamilia(f, valoresDaFamilia(f).valores, { pecas });
    expect(Object.keys(d.pecas)).toEqual(['anelCoaxial', 'arcoDeRodaComAro']);
    expect((await desenhar(d)).relatorio.estado).toBe('resolvido');
  });
});

describe('casosDaProva', () => {
  it('são o padrão, todos no mínimo, no médio e no máximo, cada parâmetro nos três com os outros no padrão e cada perfil, sem repetir conjunto', () => {
    const casos = casosDaProva(familia());
    const rotulos = casos.map((c) => c.rotulo);
    expect(rotulos.slice(0, 4)).toEqual(['padrão', 'todos no mínimo', 'todos no médio', 'todos no máximo']);
    expect(rotulos).toContain('altura no médio');
    expect(rotulos).toContain('vao no mínimo');
    expect(rotulos.slice(-2)).toEqual(['perfil compacta', 'perfil larga']);
    /* o médio de comprimento é o padrão, então "comprimento no médio" repete o padrão e não entra */
    expect(rotulos).not.toContain('comprimento no médio');
    expect(rotulos).toHaveLength(1 + 3 + 9 * 3 - 5 + 2);
    expect(casos[2].valores).toMatchObject({ altura: 750, raioDoArco: 270, vao: 410, comprimento: 2200 });
    expect(new Set(casos.map((c) => JSON.stringify(c.valores))).size).toBe(casos.length);
  });
});

describe('o exemplo da skill', () => {
  /* O mastro de uma peça só que `.claude/skills/desenho-por-restricoes/SKILL.md` mostra, completado com o chão e a parede. */
  const pilha = {
    parametros: { diametro: null, comprimento: 100 },
    pontos: { P: [0, 0], Q: [0, 100] },
    partes: { corpo: { barra: ['P', 'Q'], espessura: '=diametro' } },
    relacoes: [{ nome: 'comprimento', distancia: ['P', 'Q'], mm: 'comprimento' }],
    ligacoes: { inicio: 'P', fim: 'Q', corpo: 'corpo' },
  };
  const desenho = (diametro) => ({
    formato: 'mecanifica.desenho@3', objeto: 'mastro', vista: 'lateral',
    referencias: { chao: { reta: 'horizontal', v: 0 }, parede: { reta: 'vertical', h: 0 } },
    pecas: { pilha },
    usos: { mastro: { peca: 'pilha', parametros: { diametro }, origem: [500, 0] } },
    relacoes: [
      { nome: 'mastro a prumo', vertical: ['mastro.inicio', 'mastro.fim'] },
      { nome: 'mastro no chão', sobre: ['mastro.inicio', 'chao'] },
      { nome: 'mastro na posição', distancia: ['mastro.inicio', 'parede'], mm: 500, lado: 'direita' },
    ],
  });

  it('a peça e o uso resolvem, e a família de um parâmetro e um perfil passa na prova', async () => {
    const { relatorio } = await desenhar(desenho(60));
    expect(relatorio.estado).toBe('resolvido');
    expect(relatorio.medidas.partes['mastro.corpo']).toMatchObject({ comprimentoMm: 100, espessuraMm: 60 });
    const { erros: e, familia: f } = lerFamiliaDeDesenho({
      formato: 'mecanifica.familia-de-desenho@1', id: 'mastro', versao: '1.0.0',
      parametros: { diametro: { unidade: 'mm', padrao: 60, minimo: 40, medio: 60, maximo: 100 } },
      perfis: { grosso: { parametros: { diametro: 90 } } },
      desenho: desenho('diametro'),
    });
    expect(e).toEqual([]);
    const prova = await provarFamilia(f);
    expect(prova.ok).toBe(true);
    expect(prova.casos.map((c) => c.rotulo)).toEqual(['padrão', 'todos no mínimo', 'todos no máximo', 'perfil grosso']);
  });
});

describe('provarFamilia', () => {
  it('a família sintética resolve nos extremos, no médio, no padrão e nos perfis: zero grau de liberdade, sem conflito, sem lado trocado, sem polígono cruzado', async () => {
    const prova = await provarFamilia(familia());
    expect(prova.ok).toBe(true);
    expect(prova.casos).toHaveLength(28);
    for (const c of prova.casos) {
      expect(c.estado, c.rotulo).toBe('resolvido');
      expect(c.problemas, c.rotulo).toEqual([]);
      expect(c.texto).toBeNull();
    }
    const porRotulo = Object.fromEntries(prova.casos.map((c) => [c.rotulo, c]));
    expect(porRotulo['comprimento no máximo'].vista.larguraMm).toBe(2600);
    expect(porRotulo['comprimento no mínimo'].vista.larguraMm).toBe(1800);
    expect(porRotulo['alturaDoMastro no máximo'].vista.alturaMm).toBe(porRotulo.padrão.vista.alturaMm + 200);
    expect(porRotulo['perfil compacta'].vista).toEqual({ larguraMm: 1800, alturaMm: 1000 });
  }, 60_000);

  it('a prova pega o extremo que quebra: a faixa de um ângulo que vai além do que o triângulo fecha resolve no padrão e falha no máximo, com o relatório do caso', async () => {
    const triangulo = {
      formato: 'mecanifica.familia-de-desenho@1', id: 'triangulo', versao: '1.0.0',
      parametros: {
        base: { unidade: 'mm', padrao: 100, minimo: 60, medio: 100, maximo: 160 },
        alfa: { unidade: 'graus', padrao: 60, minimo: 30, medio: 60, maximo: 100 },
      },
      desenho: {
        formato: 'mecanifica.desenho@3', objeto: 'triângulo', vista: 'frontal',
        parametros: { beta: 100 },
        referencias: { chao: { reta: 'horizontal', v: 0 }, parede: { reta: 'vertical', h: 0 } },
        pontos: { A: [3, 2], B: ['=base', 1], C: ['=base/2', '=base/2'] },
        partes: { triangulo: { poligono: ['A', 'B', 'C'] } },
        relacoes: [
          { nome: 'A no chão', sobre: ['A', 'chao'] },
          { nome: 'A na parede', sobre: ['A', 'parede'] },
          { nome: 'B de nível', horizontal: ['A', 'B'] },
          { nome: 'base', distancia: ['B', 'A'], mm: 'base', eixo: 'h', lado: 'direita' },
          { nome: 'ângulo em A', angulo: [['A', 'B'], ['A', 'C']], graus: 'alfa' },
          { nome: 'ângulo em B', angulo: [['B', 'C'], ['B', 'A']], graus: 'beta' },
        ],
      },
    };
    const { erros: e, familia: f } = lerFamiliaDeDesenho(triangulo);
    expect(e).toEqual([]);
    const prova = await provarFamilia(f);
    expect(prova.ok).toBe(false);
    const falhas = prova.casos.filter((c) => !c.ok).map((c) => c.rotulo);
    expect(falhas).toEqual(['todos no máximo', 'alfa no máximo']);
    const alfa = prova.casos.find((c) => c.rotulo === 'alfa no máximo');
    expect(alfa.estado).toBe('conflito');
    expect(alfa.problemas[0]).toMatch(/^conflito: o resolvedor não convergiu/);
    expect(alfa.texto).toMatch(/estado conflito/);
    expect(prova.casos.find((c) => c.rotulo === 'padrão').ok).toBe(true);
    expect(prova.casos.find((c) => c.rotulo === 'alfa no mínimo').ok).toBe(true);
  });

  it('o canto que não cabe no extremo é recusado com o motivo: o raio do arco da roda passa do vão no máximo da faixa', async () => {
    const bruta = familiaSintetica();
    bruta.parametros.raioDoArco.maximo = 480;
    const { erros: e, familia: f } = lerFamiliaDeDesenho(bruta);
    expect(e).toEqual([]);
    const prova = await provarFamilia(f);
    const falhas = prova.casos.filter((c) => !c.ok);
    expect(falhas.map((c) => c.rotulo)).toEqual(['todos no máximo', 'raioDoArco no máximo']);
    expect(falhas.map((c) => c.estado)).toEqual(['recusado', 'recusado']);
    expect(falhas[1].problemas[0]).toMatch(/^recusado: .*o raio de canto não cabe entre/);
    expect(prova.casos.find((c) => c.rotulo === 'padrão').ok).toBe(true);
  }, 60_000);

  it('o chute fixo é a amarração errada que só o extremo mostra: a família do carrinho com o chute da caçamba fixo falha com a roda de 250; com o chute preso ao parâmetro passa em toda a faixa', async () => {
    const fixo = lerFamiliaDeDesenho(familiaDoCarrinho(false));
    expect(fixo.erros).toEqual([]);
    const provaFixa = await provarFamilia(fixo.familia);
    expect(provaFixa.ok).toBe(false);
    /* com um parâmetro só, "todos no máximo" e "raioDaRoda no máximo" são o mesmo conjunto de valores e a prova o desenha uma vez */
    expect(provaFixa.casos.filter((c) => !c.ok).map((c) => c.rotulo)).toEqual(['todos no máximo']);
    const falho = provaFixa.casos.find((c) => !c.ok);
    expect(falho.estado).toBe('lado trocado');
    expect(falho.problemas).toEqual(['lado trocado: "folga do fundo"']);
    expect(provaFixa.casos.find((c) => c.rotulo === 'padrão').ok).toBe(true);

    const preso = lerFamiliaDeDesenho(familiaDoCarrinho(true));
    expect(preso.erros).toEqual([]);
    const provaPresa = await provarFamilia(preso.familia);
    expect(provaPresa.casos.map((c) => `${c.rotulo}: ${c.estado}`)).toEqual(['padrão: resolvido', 'todos no mínimo: resolvido', 'todos no médio: resolvido', 'todos no máximo: resolvido']);
    expect(provaPresa.ok).toBe(true);
  }, 60_000);

  it('é determinística: duas provas dão o mesmo resultado', async () => {
    const a = await provarFamilia(familia());
    const b = await provarFamilia(familia());
    expect(JSON.stringify(b)).toBe(JSON.stringify(a));
  }, 60_000);
});
