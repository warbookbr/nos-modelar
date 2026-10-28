/* Os seis bugs do fluxo por unidades que as duas rodadas de medição acharam (plano "O esboço detalhado coerente", fatia 1), cada
   um em reprodução mínima, e os ajustes de comando: `--remover a,b`, `--adicionar` com `arranja`, `arranja` radial com centro
   por expressão no `--detalhar` e o aviso de ciclo que some depois de um `--mover` que o resolve. */
import { describe, expect, it } from 'vitest';
import { copyFileSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { avancar, criarEstado, formatarSituacao, marcarFeito, moverFormas, planoDeDetalhe, portaoDoEstagio } from '../src/condutor.js';
import { detalharUnidade, integrarUnidade } from '../src/detalhe.js';
import { descreverAchado, verificarContato } from '../src/contato.js';
import { expandirEsboco } from '../src/expandir.js';
import { desenharEsboco } from '../src/index.js';
import { medirEsboco } from '../src/descrever.js';
import { editarEsboco } from '../src/editar.js';
import { serializarComoOriginal } from '../src/ajustar.js';
import { condutorArquivo, detalharArquivo, editarArquivo, integrarArquivo, lerArgumentos } from '../../../tools/modelar/esboco.mjs';

const pasta = new URL('./fixtures/', import.meta.url);
const textoDaFixture = (nome) => readFileSync(new URL(nome, pasta), 'utf8');
const caixa = (id, centro, l = 20, a = 20, p = 20, extra = {}) => ({ id, tipo: 'caixa', largura: l, altura: a, profundidade: p, centro, ...extra });
const clone = (v) => JSON.parse(JSON.stringify(v));
const medida = (extra) => ({ nome: 'altura', valor: 20, unidade: 'mm', origem: 'ficha', tolerancia: 1, mede: 'alturaTotal', ...extra });
/* quatro caixas em fila, encostadas, uma unidade cada, com o plano do nível detalhado */
const fila = () => ({
  contato: { usar: true, tolerancia: 1, penetracao: 1, folga: 100 },
  plano: { nivel: 'detalhado', medidas: [medida(), medida({ nome: 'largura', valor: 80, mede: 'larguraTotal' }), medida({ nome: 'l2', valor: 80, mede: 'larguraTotal' }), medida({ nome: 'l3', valor: 80, mede: 'larguraTotal' }), medida({ nome: 'l4', valor: 80, mede: 'larguraTotal' })], contrato: { tocam: [['a', 'b']] } },
  opcoes: [{ titulo: 'T', formas: [caixa('a', [10, 10, 0]), caixa('b', [30, 10, 0]), caixa('c', [50, 10, 0]), caixa('d', [70, 10, 0])] }],
});
const naDetalhe = (e) => { let s = criarEstado(e, 'x.esboco.json'); for (let i = 0; i < 3; i++) { const r = avancar(e, s); expect(r.ok).toBe(true); s = r.estado; } expect(s.atual).toBe('detalhe-por-unidade'); return s; };
const dirTemp = (prefixo) => mkdtempSync(join(tmpdir(), prefixo));

describe('bug 1: `unidade` numa instância de componente espelhada', () => {
  const garfos = (extraD = {}) => ({ contato: { usar: true }, opcoes: [{ titulo: 'T', formas: [
    { id: 'garfoE', usa: 'garfo', de: [-90, 300, 700], para: [-90, 898, 421], unidade: 'frente' },
    { id: 'garfoD', espelha: { forma: 'garfoE', eixo: 'x' }, unidade: 'frente', ...extraD },
  ] }] });

  it('a leitura e o desenho aceitam a `unidade` no espelho da instância, e a unidade vale para a instância e o espelho', () => {
    const e = garfos();
    expect(() => medirEsboco(e, { projecao: false })).not.toThrow();
    expect(() => desenharEsboco(e)).not.toThrow();
    const p = planoDeDetalhe(e);
    expect(p.unidades.map((u) => u.id)).toEqual(['frente']);
    expect(p.unidades[0].membros.filter((m) => m.startsWith('garfoD.'))).toHaveLength(3);
    expect(p.unidades[0].membros.filter((m) => m.startsWith('garfoE.'))).toHaveLength(3);
  });

  it('a unidade do espelho pode ser outra, e a forma refletida a leva na leitura', () => {
    const e = garfos({ unidade: 'outra' });
    expect(() => medirEsboco(e, { projecao: false })).not.toThrow();
    expect(planoDeDetalhe(e).unidades.map((u) => u.id)).toEqual(['frente', 'outra']);
  });

  it('o espelho de uma forma simples com `unidade` também passa pela leitura', () => {
    const e = { opcoes: [{ titulo: 'T', formas: [caixa('l', [100, 10, 0], 10, 10, 10, { unidade: 'lado' }), { id: 'l2', espelha: { forma: 'l', eixo: 'x' }, unidade: 'outro' }] }] };
    expect(() => medirEsboco(e, { projecao: false })).not.toThrow();
  });
});

describe('bug 2: --feito e a colisão aberta no mestre', () => {
  /* a unidade `a` entra em `b` por 2 mm no mestre, com o gate de penetração em 1 mm */
  const comColisao = () => { const e = fila(); e.opcoes[0].formas[0].centro = [12, 10, 0]; return e; };

  it('--feito recusa a unidade que tem achado aberto do gate, e diz o achado', () => {
    const e = fila();
    const s = naDetalhe(e);
    const mestre = comColisao();
    expect(verificarContato(mestre).achados.map((a) => a.tipo)).toEqual(['colisao']);
    expect(() => marcarFeito(mestre, s, 'a')).toThrow(/a unidade "a" tem 1 achado aberto do gate de contato no mestre.*a e b se penetram 2,0 mm.*rode --integrar de novo/);
    expect(() => marcarFeito(mestre, s, 'b')).toThrow(/a e b se penetram/);
  });

  it('a unidade que o achado não envolve continua podendo ser marcada', () => {
    const s = naDetalhe(fila());
    const r = marcarFeito(comColisao(), s, 'd');
    expect(r.estado.unidades.find((u) => u.id === 'd').feito).toBe(true);
  });

  it('pela linha de comando a recusa sai como erro do esboço e o estado não muda', () => {
    const dir = dirTemp('feito-');
    const arq = join(dir, 'f.esboco.json');
    writeFileSync(arq, JSON.stringify(fila()));
    for (let i = 0; i < 3; i++) condutorArquivo(arq, { proximo: true });
    const antes = readFileSync(`${arq}.condutor.json`, 'utf8');
    writeFileSync(arq, JSON.stringify(comColisao()));
    expect(() => condutorArquivo(arq, { feito: 'a' })).toThrow(/achado aberto do gate de contato/);
    expect(readFileSync(`${arq}.condutor.json`, 'utf8')).toBe(antes);
  });
});

describe('bug 3: --detalhar com a tolerância e as ligações do mestre', () => {
  /* a e b a 3 mm um do outro (unidade U), a viga de 960 mm encostada em b: no mestre a tolerância padrão é 1% de 1003 mm */
  const mestreLongo = () => ({
    contato: { usar: true },
    opcoes: [{ titulo: 'T', formas: [caixa('a', [10, 10, 0], 20, 20, 20, { unidade: 'U' }), caixa('b', [33, 10, 0], 20, 20, 20, { unidade: 'U' }), caixa('viga', [523, 10, 0], 960, 20, 20, { unidade: 'V' })] }],
  });

  it('o isolado herda a tolerância do mestre em vez de 1% da caixa dele', () => {
    const mestre = mestreLongo();
    const doMestre = medirEsboco(mestre, { projecao: false });
    expect(doMestre.divergencias).toEqual([]);
    expect(doMestre.descricao.opcoes[0].gate.tolerancia_mm).toBeCloseTo(10, 0);
    const d = detalharUnidade(mestre, null, 'U');
    const isolado = medirEsboco(d, { projecao: false });
    expect(isolado.descricao.opcoes[0].gate.tolerancia_mm).toBe(doMestre.descricao.opcoes[0].gate.tolerancia_mm);
    expect(isolado.divergencias.map((x) => x.texto)).toEqual([]);
  });

  it('a tolerância declarada no mestre continua a declarada, e o mestre sem gate também a repassa', () => {
    const declarado = mestreLongo();
    declarado.contato.tolerancia = 4;
    expect(detalharUnidade(declarado, null, 'U').contato.tolerancia).toBe(4);
    const semGate = mestreLongo();
    delete semGate.contato;
    const d = detalharUnidade(semGate, null, 'U');
    expect(d.contato.usar).toBeUndefined();
    expect(medirEsboco(d, { projecao: false }).divergencias).toEqual([]);
  });

  it('a forma ligada às outras por uma forma oculta não vira solta nem longe', () => {
    /* a e b da unidade U têm a forma h (de outra unidade) entre elas: a 20 mm uma da outra, ligadas só pelo h */
    const mestre = { contato: { usar: true, tolerancia: 1, folga: 2 }, opcoes: [{ titulo: 'T', formas: [caixa('a', [10, 10, 0], 20, 20, 20, { unidade: 'U' }), caixa('h', [30, 10, 0], 20, 20, 20, { unidade: 'H' }), caixa('b', [50, 10, 0], 20, 20, 20, { unidade: 'U' })] }] };
    expect(medirEsboco(mestre, { projecao: false }).divergencias).toEqual([]);
    const d = detalharUnidade(mestre, null, 'U');
    expect(d.opcoes[0].formas.find((f) => f.id === 'h').oculto).toBe(true);
    expect(medirEsboco(d, { projecao: false }).divergencias.map((x) => x.texto)).toEqual([]);
    expect(verificarContato(d).achados).toEqual([]);
    /* sem o gate, a leitura de soltas também enxerga a ligação pela oculta */
    delete d.contato.usar;
    expect(medirEsboco(d, { projecao: false }).descricao.opcoes[0].soltas).toEqual([]);
  });

  it('a oculta nunca é achado, e a forma realmente solta continua solta', () => {
    const mestre = { contato: { usar: true, tolerancia: 1, folga: 2 }, opcoes: [{ titulo: 'T', formas: [caixa('a', [10, 10, 0], 20, 20, 20, { unidade: 'U' }), caixa('h', [30, 10, 0], 20, 20, 20, { unidade: 'H' }), caixa('b', [50, 10, 0], 20, 20, 20, { unidade: 'U' })] }] };
    const d = detalharUnidade(mestre, null, 'U');
    d.opcoes[0].formas.find((f) => f.id === 'b').centro = [200, 10, 0];
    const achados = verificarContato(d).achados;
    expect(achados.map((a) => `${a.tipo}:${a.pecas.join(',')}`).sort()).toEqual(['longe:b', 'voando:b']);
  });
});

describe('bug 4: --editar e --integrar mantêm o formato compacto do arquivo', () => {
  const copia = (nome) => { const dir = dirTemp('formato-'); const arq = join(dir, nome); copyFileSync(fileURLToPath(new URL(nome, pasta)), arq); return arq; };

  it('a regravação devolve o texto das fixtures byte a byte e não passa a um número por linha', () => {
    for (const nome of readdirSync(new URL('.', pasta)).filter((n) => n.endsWith('.esboco.json'))) {
      const texto = textoDaFixture(nome);
      const depois = serializarComoOriginal(JSON.parse(texto), texto);
      expect(depois, nome).toBe(texto);
    }
  });

  it('--editar de uma forma deixa o arquivo com o mesmo número de linhas', () => {
    const arq = copia('moto-curvas.esboco.json');
    const antes = readFileSync(arq, 'utf8').split('\n').length;
    editarArquivo(arq, { atribuicoes: ['tanque.cor=verde'] });
    const depois = readFileSync(arq, 'utf8');
    expect(depois.split('\n').length).toBe(antes);
    expect(depois).not.toMatch(/\[\s*\n\s*-?\d/);
    expect(JSON.parse(depois).formas.find((f) => f.id === 'tanque').cor).toBe('verde');
  });

  it('--detalhar seguido de --integrar também', () => {
    const arq = copia('moto-curvas.esboco.json');
    const antes = readFileSync(arq, 'utf8');
    const d = detalharArquivo(arq, 'farol');
    expect(readFileSync(d.destino, 'utf8').split('\n').length).toBeLessThan(120);
    integrarArquivo(arq, 'farol', d.destino);
    expect(readFileSync(arq, 'utf8')).toBe(antes);
  }, 60000);

  it('um original com as listas de números quebradas em linhas mantém o estilo expandido', () => {
    const original = `${JSON.stringify({ a: { centro: [1, 2, 3] } }, null, 2)}\n`;
    expect(serializarComoOriginal({ a: { centro: [1, 2, 3] } }, original)).toBe(original);
    expect(serializarComoOriginal({ a: { centro: [1, 2, 4] } }, '{"a": {"centro": [1, 2, 3]}}')).toBe('{\n  "a": {\n    "centro": [1, 2, 4]\n  }\n}');
  });
});

describe('bug 5: o Marco dispara quando é cruzado, um por vez', () => {
  /* a unidade `a` é detalhada em cinco caixas de 4 mm, o que não pode aumentar o custo dela */
  const detalheDeA = (e, s) => {
    const d = detalharUnidade(e, s, 'a');
    d.opcoes[0].formas = d.opcoes[0].formas.filter((f) => f.id !== 'a');
    d.opcoes[0].formas.unshift(...[2, 6, 10, 14, 18].map((x, k) => caixa(`a${k}`, [x, 10, 0], 4, 20, 20)));
    return d;
  };

  it('o detalhe integrado não aumenta o custo da unidade: o primeiro --feito cruza só o Marco de 25%', () => {
    const e = fila();
    const s = naDetalhe(e);
    const r = integrarUnidade(e, s, 'a', detalheDeA(e, s));
    expect(r.estado.unidades.find((u) => u.id === 'a').membros).toHaveLength(5);
    expect(r.estado.unidades.map((u) => u.custo)).toEqual([1, 1, 1, 1]);
    let estado = r.estado;
    const marcos = [];
    for (const id of ['a', 'b', 'c', 'd']) {
      const f = marcarFeito(r.mestre, estado, id);
      estado = f.estado;
      marcos.push(f.novosMarcos.map((m) => m.limiar));
    }
    expect(marcos).toEqual([[25], [50], [75], [100]]);
  });

  it('um salto por vários limiares registra um Marco só, o mais alto, com os pulados anotados', () => {
    const e = fila();
    e.opcoes[0].formas[1] = caixa('b', [30, 10, 0], 20, 20, 20, { daInstancia: { id: 'g', principal: true } });
    e.opcoes[0].formas[2] = caixa('c', [50, 10, 0], 20, 20, 20, { daInstancia: { id: 'g', principal: false } });
    e.opcoes[0].formas[3] = caixa('d', [70, 10, 0], 20, 20, 20, { daInstancia: { id: 'g', principal: false } });
    const s = naDetalhe(e);
    const r = marcarFeito(e, s, 'g');
    expect(r.novosMarcos).toHaveLength(1);
    expect(r.novosMarcos[0]).toMatchObject({ limiar: 75, saltou: [25, 50] });
    expect(r.estado.marcos.map((m) => m.limiar)).toEqual([75]);
    expect(marcarFeito(e, r.estado, 'a').novosMarcos.map((m) => m.limiar)).toEqual([100]);
  });

  it('com oito unidades o primeiro --feito (12,5%) não cruza nada e o segundo (25%) cruza o primeiro Marco', () => {
    const e = fila();
    e.opcoes[0].formas = Array.from({ length: 8 }, (_, k) => caixa(`c${k}`, [10 + 20 * k, 10, 0]));
    e.plano.contrato = { tocam: [['c0', 'c1']] };
    e.plano.medidas = [medida(), ...[1, 2, 3, 4].map((k) => medida({ nome: `l${k}`, valor: 160, mede: 'larguraTotal' }))];
    const s = naDetalhe(e);
    const um = marcarFeito(e, s, 'c0');
    expect(um.novosMarcos).toEqual([]);
    expect(marcarFeito(e, um.estado, 'c1').novosMarcos.map((m) => m.limiar)).toEqual([25]);
  });

  it('--feito imprime só o Marco novo, sem repetir os já registrados', () => {
    const dir = dirTemp('marco-');
    const arq = join(dir, 'f.esboco.json');
    writeFileSync(arq, JSON.stringify(fila()));
    for (let i = 0; i < 3; i++) condutorArquivo(arq, { proximo: true });
    const um = condutorArquivo(arq, { feito: 'a' });
    expect(um.texto.match(/marco de \d+%/g)).toEqual(['marco de 25%']);
    const dois = condutorArquivo(arq, { feito: 'b' });
    expect(dois.texto.match(/marco de \d+%/g)).toEqual(['marco de 50%']);
    /* a situação sem ação ainda lista o que está registrado */
    expect(condutorArquivo(arq, {}).texto.match(/marco de \d+%/g)).toEqual(['marco de 25%', 'marco de 50%']);
  });
});

describe('bug 6: a mensagem do máximo implícito da junta na mesma unidade', () => {
  it('diz que basta declarar `max` em contato.juntas ou em par, com o valor sugerido', () => {
    const e = { contato: { usar: true, juntas: [{ pecas: ['cubo', 'eixo'] }] }, opcoes: [{ titulo: 'T', formas: [caixa('cubo', [0, 10, 0], 20, 20, 20, { unidade: 'u' }), { id: 'eixo', tipo: 'cilindro', diametro: 8, comprimento: 60, eixo: 'x', centro: [0, 10, 0], unidade: 'u' }] }] };
    const g = verificarContato(e);
    expect(g.resultado).toBe('reprovado');
    const sugerido = Math.floor(g.achados[0].mm) + 1;
    expect(g.achados[0]).toMatchObject({ tipo: 'atravessa-excedido', implicita: true, max: 8, maxSugerido: sugerido });
    expect(sugerido).toBeGreaterThan(8);
    const texto = descreverAchado(g.achados[0]);
    expect(texto).toContain('implícito (mesma unidade: a menor dimensão da menor das duas formas) de 8,0 mm');
    expect(texto).toContain(`basta declarar "max" (sugestão: ${sugerido}) em contato.juntas ou em contato.pares`);
    expect(texto).toContain(`{ "a": "cubo", "b": "eixo", "tipo": "atravessa", "max": ${sugerido} }`);
    /* e declarar o max que a mensagem sugere resolve, sem motivo, dentro da unidade */
    const ok = clone(e);
    ok.contato.juntas[0].max = sugerido;
    expect(verificarContato(ok).resultado).toBe('aprovado');
  });

  it('o max declarado que estoura continua dizendo "declarado", sem a dica', () => {
    const e = { contato: { usar: true, pares: [{ a: 'cubo', b: 'eixo', tipo: 'atravessa', max: 3, motivo: 'o max declarado manda neste teste' }] }, opcoes: [{ titulo: 'T', formas: [caixa('cubo', [0, 10, 0], 20, 20, 20, { unidade: 'u' }), { id: 'eixo', tipo: 'cilindro', diametro: 8, comprimento: 60, eixo: 'x', centro: [0, 10, 0], unidade: 'u' }] }] };
    const texto = descreverAchado(verificarContato(e).achados[0]);
    expect(texto).toContain('acima do máximo declarado de 3,0 mm');
    expect(texto).not.toContain('basta declarar');
  });
});

describe('ajustes de comando', () => {
  const base = () => ({ opcoes: [{ titulo: 'T', formas: [caixa('a', [0, 10, 0]), caixa('b', [20, 10, 0]), caixa('c', [40, 10, 0]), caixa('d', [60, 10, 0])] }] });

  it('--remover a,b tira as duas formas, e a linha de comando entrega a lista inteira', () => {
    const r = editarEsboco(base(), { remover: ['a,b'] });
    expect(r.esboco.opcoes[0].formas.map((f) => f.id)).toEqual(['c', 'd']);
    expect(r.mudancas.map((m) => `${m.acao}:${m.forma}`)).toEqual(['remover:a', 'remover:b']);
    expect(lerArgumentos(['--editar', 'f.esboco.json', '--remover', 'a,b']).edicao.remover).toEqual(['a,b']);
    const dir = dirTemp('remover-');
    const arq = join(dir, 'f.esboco.json');
    writeFileSync(arq, JSON.stringify(base(), null, 2));
    editarArquivo(arq, { remover: ['c, d'] });
    expect(JSON.parse(readFileSync(arq, 'utf8')).opcoes[0].formas.map((f) => f.id)).toEqual(['a', 'b']);
    expect(() => editarEsboco(base(), { remover: ['a,zz'] })).toThrow(/--remover "zz": não há forma com esse id/);
  });

  it('--adicionar aceita a entrada `arranja`, que gera as cópias, e recusa fonte que não existe', () => {
    const arranjo = '{"arranja": {"forma": "a", "modo": "linear", "total": 3, "passo": [0, 0, 30]}}';
    const r = editarEsboco(base(), { adicionar: [arranjo] });
    expect(r.esboco.opcoes[0].formas.at(-1)).toEqual({ arranja: { forma: 'a', modo: 'linear', total: 3, passo: [0, 0, 30] } });
    expect(r.mudancas).toEqual([{ acao: 'adicionar', forma: 'arranja de a', arranjo: true }]);
    expect(expandirEsboco(r.esboco).opcoes[0].formas.map((f) => f.id)).toEqual(['a', 'b', 'c', 'd', 'a1', 'a2']);
    expect(() => editarEsboco(base(), { adicionar: ['{"arranja": {"forma": "zz", "modo": "linear", "total": 2, "passo": [1, 0, 0]}}'] })).toThrow(/o arranjo de "zz": não há forma com esse id/);
    expect(() => editarEsboco(base(), { adicionar: ['{"arranja": {"forma": "a", "modo": "linear", "total": 2, "passo": [1, 0, 0]}, "cor": "azul"}'] })).toThrow(/só tem o campo "arranja"/);
    expect(() => editarEsboco(base(), { adicionar: ['{"tipo": "caixa"}'] })).toThrow(/precisa de "id"/);
  });

  it('--detalhar e --integrar aceitam o `arranja` radial com o centro por expressão', () => {
    const mestre = {
      parametros: { raio: 100, passo: 2 },
      contato: { usar: true, tolerancia: 1, penetracao: 1, folga: 1000 },
      opcoes: [{ titulo: 'T', formas: [
        { id: 'cubo', tipo: 'cilindro', diametro: 60, comprimento: 20, eixo: 'y', centro: [0, 10, 0], unidade: 'cubo' },
        { id: 'p', tipo: 'caixa', largura: 30, altura: 20, profundidade: 30, centro: [70, 10, 0], unidade: 'parafusos' },
        { arranja: { forma: 'p', modo: 'radial', total: '=passo*2', eixo: 'y', centro: [0, '=raio-raio', '=raio*0'] } },
      ] }],
    };
    expect(expandirEsboco(mestre).opcoes[0].formas.map((f) => f.id)).toEqual(['cubo', 'p', 'p1', 'p2', 'p3']);
    const d = detalharUnidade(mestre, null, 'cubo');
    expect(d.opcoes[0].formas.map((f) => `${f.id}${f.oculto ? ':oculto' : ''}`)).toEqual(['cubo', 'p:oculto', 'p1:oculto', 'p2:oculto', 'p3:oculto']);
    expect(d.opcoes[0].formas[2].arranjoDe).toMatchObject({ fonte: 'p', modo: 'radial', total: 4, centro: [0, 0, 0], indice: 1 });
    expect(() => medirEsboco(d, { projecao: false })).not.toThrow();
    /* troca a unidade `parafusos` (que contém a fonte e as três cópias) pelo mesmo conteúdo */
    const r = integrarUnidade(mestre, null, 'cubo', d);
    expect(expandirEsboco(r.mestre).opcoes[0].formas.map((f) => f.id)).toEqual(['cubo', 'p', 'p1', 'p2', 'p3']);
    const dp = detalharUnidade(mestre, null, 'parafusos');
    expect(dp.opcoes[0].formas.filter((f) => !f.oculto).map((f) => f.id ?? 'arranja')).toEqual(['p', 'arranja']);
    expect(integrarUnidade(mestre, null, 'parafusos', dp).formas).toEqual(['p', 'p1', 'p2', 'p3']);
  });

  it('o aviso de ciclo entre unidades some depois do --mover que o resolve e volta se o ciclo volta', () => {
    /* a pousa em b e b pousa em c: com a e c numa unidade e b em outra, as duas unidades dependem uma da outra */
    const e = {
      contato: { usar: true, tolerancia: 1, penetracao: 1, folga: 100 },
      plano: { nivel: 'detalhado', medidas: Array.from({ length: 5 }, (_, k) => medida({ nome: `m${k}`, valor: 60 })), contrato: { tocam: [['a', 'b']] } },
      opcoes: [{ titulo: 'T', formas: [caixa('c', [0, 10, 0], 20, 20, 20, { unidade: 'U1' }), caixa('b', [0, 0, 0], 20, 20, 20, { sobre: 'c', unidade: 'U2' }), caixa('a', [0, 0, 0], 20, 20, 20, { sobre: 'b', unidade: 'U1' })] }],
    };
    delete e.opcoes[0].formas[1].centro; delete e.opcoes[0].formas[2].centro;
    let s = criarEstado(e, 'x.esboco.json');
    for (let i = 0; i < 2; i++) { const r = avancar(e, s); expect(r.ok, JSON.stringify(r.portao.falta)).toBe(true); s = r.estado; }
    expect(s.atual).toBe('plano-de-detalhe');
    expect(s.avisos.filter((a) => a.startsWith('dependência circular'))).toHaveLength(1);
    expect(formatarSituacao(s, portaoDoEstagio(e, s))).toContain('aviso: dependência circular entre unidades');
    const resolvido = moverFormas(e, s, { forma: 'b', para: 'U1', motivo: 'b e a formam a mesma peça montada' });
    expect(resolvido.unidades.some((u) => u.ciclo)).toBe(false);
    expect(resolvido.avisos.filter((a) => a.startsWith('dependência circular'))).toEqual([]);
    expect(formatarSituacao(resolvido, portaoDoEstagio(e, resolvido))).not.toContain('dependência circular');
    /* mover de novo para criar o ciclo traz o aviso de volta, uma vez só */
    const volta = moverFormas(e, resolvido, { forma: 'b', para: 'U2', motivo: 'separa de novo para ver o aviso voltar' });
    expect(volta.avisos.filter((a) => a.startsWith('dependência circular'))).toHaveLength(1);
  });
});
