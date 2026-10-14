/* restricoes-da-familia.test.js — o que a família de desenho declara além dos parâmetros: o catálogo de peças que usa (caminho relativo
   ao arquivo da família), as relações de ordem entre os parâmetros (`capo < painel - 5`), validadas antes de desenhar e usadas pela
   prova, e os perfis que toda família tem (`minimo`, `medio`, `maximo`). A família é a sintética de `tests/pecas.js`. */
import { describe, expect, it } from 'vitest';
import { casosDaProva, catalogosDaFamilia, lerFamiliaDeDesenho, restricoesFeridas, valoresDaFamilia } from '../src/index.js';
import { familiaSintetica } from './pecas.js';

const lida = (mudar = () => {}) => { const f = familiaSintetica(); mudar(f); return lerFamiliaDeDesenho(f); };
const erros = (mudar) => lida(mudar).erros;
const familia = () => lida().familia;

describe('o catálogo de peças que a família declara', () => {
  it('é um caminho ou uma lista de caminhos relativos ao arquivo da família, e a família lida os devolve em lista', () => {
    expect(catalogosDaFamilia({ catalogo: 'pecas.json' })).toEqual({ erros: [], caminhos: ['pecas.json'] });
    expect(catalogosDaFamilia({ catalogo: ['pecas.json', '../comuns/pecas-comuns.json'] })).toEqual({ erros: [], caminhos: ['pecas.json', '../comuns/pecas-comuns.json'] });
    expect(catalogosDaFamilia({})).toEqual({ erros: [], caminhos: [] });
    expect(catalogosDaFamilia(null)).toEqual({ erros: [], caminhos: [] });
    expect(lida((f) => { f.catalogo = 'pecas.json'; }).familia.catalogo).toEqual(['pecas.json']);
    expect(familia().catalogo).toEqual([]);
  });

  it('recusa o caminho absoluto, o repetido, a lista vazia e o que não é texto, dizendo o que o campo precisa ser', () => {
    expect(erros((f) => { f.catalogo = '/home/x/pecas.json'; })).toEqual(['o "catalogo" "/home/x/pecas.json" é um caminho absoluto; use um caminho relativo ao arquivo da família, para a família se mover com a pasta']);
    expect(erros((f) => { f.catalogo = 'C:\\pecas\\pecas.json'; })[0]).toMatch(/é um caminho absoluto/);
    expect(erros((f) => { f.catalogo = ['a.json', 'a.json']; })).toEqual(['o "catalogo" repete "a.json"; cada catálogo entra uma vez']);
    expect(erros((f) => { f.catalogo = []; })[0]).toMatch(/^"catalogo" deve ser o caminho de um arquivo de catálogo de peças, relativo ao arquivo da família .*; veio \[\]$/);
    expect(erros((f) => { f.catalogo = 3; })[0]).toMatch(/veio 3$/);
    expect(erros((f) => { f.catalogo = ['a.json', 4]; })[0]).toMatch(/veio \["a.json",4\]$/);
    expect(erros((f) => { f.catalogo = ' pecas.json'; })[0]).toMatch(/^"catalogo" deve ser/);
  });
});

describe('as relações de ordem entre os parâmetros', () => {
  const com = (restricoes) => lida((f) => { f.restricoes = restricoes; });
  const padroes = (f) => Object.fromEntries(Object.entries(f.parametros).map(([n, p]) => [n, p.padrao]));

  it('a família lida as devolve em ordem de id, com o lado esquerdo e o direito, e as da família sintética valem no padrão', () => {
    const f = familia();
    expect(f.restricoes.map((r) => r.id)).toEqual(['arco-cabe-no-topo', 'arco-cabe-no-vao']);
    expect(f.restricoes[0]).toMatchObject({ expressao: 'raioDoArco <= topoDoArco', comparador: '<=', esquerda: 'raioDoArco', direita: 'topoDoArco' });
    expect(restricoesFeridas(f, padroes(f))).toEqual([]);
    expect(lida((x) => { delete x.restricoes; }).familia.restricoes).toEqual([]);
  });

  it('compara duas somas com <, <=, > ou >=, parâmetros, as funções do núcleo (min, max, sqrt) e menos unário', () => {
    const f = com([
      { id: 'a', expressao: 'altura > recuo + 100' },
      { id: 'b', expressao: 'min(vao, topoDoArco) >= raioDoArco' },
      { id: 'c', expressao: '-recuo < -100' },
      { id: 'd', expressao: 'sqrt(vao) < max(altura, 30)', motivo: 'só para provar a função' },
      { id: 'e', expressao: 'aro<comprimento/10' },
    ]);
    expect(f.erros).toEqual([]);
    expect(f.familia.restricoes.map((r) => r.comparador)).toEqual(['>', '>=', '<', '<', '<']);
    const valores = padroes(f.familia);
    expect(restricoesFeridas(f.familia, valores)).toEqual([]);
    expect(restricoesFeridas(f.familia, { ...valores, altura: 350 }).map((r) => r.id)).toEqual(['a']);
    expect(restricoesFeridas(f.familia, { ...valores, raioDoArco: 410 }).map((r) => r.id)).toEqual(['b']);
    expect(restricoesFeridas(f.familia, { ...valores, recuo: 90 }).map((r) => r.id)).toEqual(['c']);
    expect(restricoesFeridas(f.familia, { ...valores, aro: 300 }).map((r) => r.id)).toEqual(['e']);
  });

  it('o comparador estrito recusa a igualdade, e o largo a aceita', () => {
    const larga = com([{ id: 'larga', expressao: 'recuo <= 330' }]).familia;
    expect(restricoesFeridas(larga, { recuo: 330 })).toEqual([]);
    expect(restricoesFeridas(larga, { recuo: 330.5 }).map((r) => r.id)).toEqual(['larga']);
    const estrita = com([{ id: 'estrita', expressao: 'recuo < 330' }]).familia;
    expect(restricoesFeridas(estrita, { recuo: 330 }).map((r) => r.id)).toEqual(['estrita']);
    expect(restricoesFeridas(estrita, { recuo: 329.999 })).toEqual([]);
  });

  it('recusa a que não tem comparador, tem dois, usa um que não existe ou deixa um lado vazio', () => {
    expect(com([{ id: 'x', expressao: 'recuo + 3' }]).erros).toEqual(['a relação de ordem "x" (recuo + 3) falta o comparador; a relação compara duas somas por "<", "<=", ">" ou ">="']);
    expect(com([{ id: 'x', expressao: 'recuo < 3 < altura' }]).erros).toEqual(['a relação de ordem "x" (recuo < 3 < altura) tem 2 comparadores ("<", "<"); a relação tem um só, entre duas somas']);
    expect(com([{ id: 'x', expressao: 'recuo == 3' }]).erros).toEqual(['a relação de ordem "x" (recuo == 3) o comparador "==" não existe; use "<", "<=", ">" ou ">="']);
    expect(com([{ id: 'x', expressao: 'recuo != 3' }]).erros[0]).toMatch(/o comparador "!=" não existe/);
    expect(com([{ id: 'x', expressao: '< 3' }]).erros).toEqual(['a relação de ordem "x" (< 3) falta uma das duas somas, a da esquerda ou a da direita do comparador']);
  });

  it('recusa o nome que não é parâmetro da família, a função que não existe e a expressão mal formada', () => {
    expect(com([{ id: 'x', expressao: 'capo < painel - 5' }]).erros).toEqual([
      'a relação de ordem "x" (capo < painel - 5) cita os nomes "capo", "painel", que não são parâmetros da família; ela compara só parâmetros da família ("altura", "alturaDoMastro", "aro", "comprimento", "diametroDoMastro", "raioDoArco", "recuo", "topoDoArco", "vao")',
    ]);
    expect(com([{ id: 'x', expressao: 'asin(recuo) < 3' }]).erros[0]).toMatch(/^a relação de ordem "x" \(asin\(recuo\) < 3\) não é uma expressão válida: função 'asin' não existe/);
    expect(com([{ id: 'x', expressao: '(recuo < 3' }]).erros[0]).toMatch(/^a relação de ordem "x" \(\(recuo < 3\) não é uma expressão válida: faltou '\)'/);
    expect(com([{ id: 'x', expressao: 'recuo < 3 )' }]).erros[0]).toMatch(/não é uma expressão válida/);
  });

  it('recusa o id que se repete ou que não é um nome, o campo estranho e a lista que não é lista', () => {
    expect(com([{ id: 'x', expressao: 'recuo < 400' }, { id: 'x', expressao: 'recuo < 500' }]).erros).toEqual(['a relação de ordem "x" aparece duas vezes; o id vale um só']);
    expect(com([{ id: 'X y', expressao: 'recuo < 400' }]).erros[0]).toMatch(/precisa de "id" em minúsculas separado por hífen/);
    expect(com([{ id: 'x', expressao: 'recuo < 400', cor: 1 }]).erros[0]).toBe('a relação de ordem na posição 1 tem o campo desconhecido "cor"; os aceitos são "id", "expressao", "motivo"');
    expect(com([{ id: 'x' }]).erros[0]).toMatch(/precisa de "expressao"/);
    expect(com([{ id: 'x', expressao: 'recuo < 400', motivo: '' }]).erros[0]).toMatch(/tem "motivo" que não é um texto/);
    expect(com('recuo < 4').erros[0]).toMatch(/"restricoes" deve ser uma lista de relações de ordem/);
  });

  it('a relação que o padrão, o médio ou um perfil fere recusa a família, dizendo quanto cada lado vale', () => {
    expect(com([{ id: 'recuo-pequeno', expressao: 'recuo < 250', motivo: 'o mastro fica perto da traseira' }]).erros).toEqual([
      'o padrão fere a relação de ordem "recuo-pequeno" (recuo < 250) não vale: o lado esquerdo vale 300 e o direito 250; o mastro fica perto da traseira',
      'o médio fere a relação de ordem "recuo-pequeno" (recuo < 250) não vale: o lado esquerdo vale 320 e o direito 250; o mastro fica perto da traseira',
      'o perfil "larga" fere a relação de ordem "recuo-pequeno" (recuo < 250) não vale: o lado esquerdo vale 300 e o direito 250; o mastro fica perto da traseira',
    ]);
    expect(com([{ id: 'compacta-baixa', expressao: 'altura > 650' }]).erros).toEqual(['o perfil "compacta" fere a relação de ordem "compacta-baixa" (altura > 650) não vale: o lado esquerdo vale 600 e o direito 650']);
  });

  it('a conta que não existe nos valores conta como ferida: a raiz de um negativo', () => {
    const { familia: f } = com([{ id: 'raiz', expressao: 'sqrt(recuo - 100) < 20' }]);
    expect(restricoesFeridas(f, { recuo: 250 })).toEqual([]);
    const [ferida] = restricoesFeridas(f, { recuo: 50 });
    expect(ferida).toMatchObject({ id: 'raiz', vale: false, esquerda: null, direita: null });
    expect(ferida.indefinida).toMatch(/sqrt de -50, que é negativo/);
  });

  it('os valores dados que ferem uma relação são recusados antes de desenhar, com a frase da relação', () => {
    const f = familia();
    expect(valoresDaFamilia(f, { valores: { raioDoArco: 320, vao: 300 } }).erros).toEqual([
      'esses valores ferem a relação de ordem "arco-cabe-no-vao" (raioDoArco <= vao) não vale: o lado esquerdo vale 320 e o direito 300; o canto do aro tem o raio do arco, e o topo do recorte tem de medir ao menos isso',
    ]);
    expect(valoresDaFamilia(f, { valores: { raioDoArco: 320, vao: 520 } }).erros).toEqual([]);
    expect(valoresDaFamilia(f, { perfil: 'compacta', valores: { raioDoArco: 310 } }).erros.map((e) => e.slice(0, 60))).toEqual([
      'esses valores ferem a relação de ordem "arco-cabe-no-topo" (',
      'esses valores ferem a relação de ordem "arco-cabe-no-vao" (r',
    ]);
  });
});

describe('os perfis que toda família tem', () => {
  it('minimo, medio e maximo põem todos os parâmetros naquele ponto da faixa, sem a família declará-los', () => {
    const f = familia();
    const faixa = (campo) => Object.fromEntries(Object.entries(f.parametros).map(([n, p]) => [n, p[campo]]));
    expect(valoresDaFamilia(f, { perfil: 'minimo' })).toEqual({ erros: [], valores: faixa('minimo') });
    expect(valoresDaFamilia(f, { perfil: 'medio' })).toEqual({ erros: [], valores: faixa('medio') });
    expect(valoresDaFamilia(f, { perfil: 'maximo' })).toEqual({ erros: [], valores: faixa('maximo') });
    expect(faixa('minimo').vao).toBe(300);
    expect(faixa('maximo').comprimento).toBe(2600);
  });

  it('os valores dados valem por cima do perfil, e a relação de ordem ainda confere o conjunto', () => {
    const f = familia();
    expect(valoresDaFamilia(f, { perfil: 'minimo', valores: { vao: 400 } }).valores).toMatchObject({ vao: 400, comprimento: 1800, altura: 600 });
    expect(valoresDaFamilia(f, { perfil: 'maximo', valores: { vao: 300 } }).erros).toHaveLength(1);
  });

  it('o nome é reservado: a família que declara um perfil com ele é recusada', () => {
    expect(erros((f) => { f.perfis.minimo = { parametros: { vao: 300 } }; })).toEqual(['o perfil "minimo" tem nome reservado: toda família já tem os perfis "minimo", "medio", "maximo", com todos os parâmetros no mínimo, no médio e no máximo da faixa; dê outro nome ao perfil']);
  });

  it('são os mesmos conjuntos de "todos no mínimo" e "todos no máximo" da prova', () => {
    const f = familia();
    const casos = casosDaProva(f);
    expect(casos.find((c) => c.rotulo === 'todos no mínimo').valores).toEqual(valoresDaFamilia(f, { perfil: 'minimo' }).valores);
    expect(casos.find((c) => c.rotulo === 'todos no máximo').valores).toEqual(valoresDaFamilia(f, { perfil: 'maximo' }).valores);
  });
});
