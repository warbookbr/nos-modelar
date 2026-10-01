/* A parte 10b da fatia 10: `--editar`, `estilos` e cor por unidade, simetria implícita, perfis por função, Envelope por
   forma, `--unidade` e o inventário de peças esperadas (`plano.pecas`). A fixture `estilos-perfis.esboco.json` usa estilos,
   cor por unidade, `simetrico` e os quatro geradores de perfil. */
import { describe, expect, it } from 'vitest';
import { copyFileSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import { createHash } from 'node:crypto';
import { desenharEsboco, ErroDeEsboco, resolverOpcao } from '../src/index.js';
import { expandirEsboco } from '../src/expandir.js';
import { medirEsboco, formatarResumo } from '../src/descrever.js';
import { editarEsboco, lerValor } from '../src/editar.js';
import { GERADORES, gerarPerfil } from '../src/perfis.js';
import { conferirEnvelope, criarEstado, formatarEnvelope, portaoDoEstagio, planoDeDetalhe } from '../src/condutor.js';
import { detalharUnidade } from '../src/detalhe.js';
import { conferirPlano, lerPlano } from '../src/plano.js';
import { descreverArquivo, editarArquivo, lerArgumentos, unidadeArquivo } from '../../../tools/mecanifica/esboco.mjs';

const pasta = new URL('./fixtures/', import.meta.url);
const caminho = (nome) => new URL(nome, pasta).pathname;
const fixture = (nome) => JSON.parse(readFileSync(caminho(nome), 'utf8'));
const cli = new URL('../../../tools/mecanifica/esboco.mjs', import.meta.url).pathname;
const sha = (t) => createHash('sha256').update(t).digest('hex');
const formasDe = (e, i = 0) => expandirEsboco(e).opcoes[i].formas;
const formaDe = (e, id) => formasDe(e).find((f) => f.id === id);
const resolvidas = (e) => { const x = expandirEsboco(e); return resolverOpcao(x.opcoes[0], 'opção 1', x.pontos); };
const copia = (nome = 'estilos-perfis.esboco.json') => { const dir = mkdtempSync(join(tmpdir(), 'esboco-edicao-')); const destino = join(dir, nome); copyFileSync(caminho(nome), destino); return destino; };
const caixa = (id, centro, l = 20, a = 20, p = 20, extra = {}) => ({ id, tipo: 'caixa', largura: l, altura: a, profundidade: p, centro, ...extra });
const rodar = (args, env = {}) => spawnSync('node', [cli, ...args], { encoding: 'utf8', env: { ...process.env, ...env } });

describe('--editar', () => {
  it('lê o valor como JSON, expressão ou texto simples', () => {
    expect(lerValor('450')).toBe(450);
    expect(lerValor('"azul"')).toBe('azul');
    expect(lerValor('azul')).toBe('azul');
    expect(lerValor('=vao*2')).toBe('=vao*2');
    expect(lerValor('[1,2,3]')).toEqual([1, 2, 3]);
    expect(lerValor('true')).toBe(true);
  });

  it('muda campo, sub-campo e índice, vários pares de uma vez, sem tocar parâmetros nem expressões', () => {
    const bruto = fixture('estilos-perfis.esboco.json');
    bruto.opcoes[0].formas.find((f) => f.id === 'cubo').encosta = { folga: 2 };
    const { esboco, mudancas } = editarEsboco(bruto, { atribuicoes: ['suporteE.centro[1]=240', 'cubo.encosta.folga=3', 'cubo.cor=vermelho', 'eixo.comprimento="=vao+10"', 'estrela.perfil.n=7'] });
    const f = (id) => esboco.opcoes[0].formas.find((x) => x.id === id);
    expect(f('suporteE').centro).toEqual(['=-vao/2-10', 240, 0]);
    expect(f('cubo').encosta.folga).toBe(3);
    expect(f('cubo').cor).toBe('vermelho');
    expect(f('eixo').comprimento).toBe('=vao+10');
    expect(f('estrela').perfil).toEqual({ gerar: 'estrela', n: 7, rin: 30, rout: '=raioRoda-10', semi: 12 });
    expect(f('aro').diametroExterno).toBe('=raioRoda*2');
    expect(esboco.parametros).toEqual(bruto.parametros);
    expect(mudancas.map((m) => m.acao)).toEqual(Array(5).fill('editar'));
    expect(bruto.opcoes[0].formas.find((x) => x.id === 'suporteE').centro[1]).toBe(230);
  });

  it('acha o id que tem ponto pelo maior prefixo declarado, e retira o campo com null', () => {
    const e = { formas: [caixa('roda', [0, 0, 0]), caixa('roda.pneu', [0, 0, 0], 10, 10, 10, { cor: 'azul' })], opcoes: [{ titulo: 'T' }] };
    const { esboco } = editarEsboco(e, { atribuicoes: ['roda.pneu.largura=33', 'roda.pneu.cor=null'] });
    expect(esboco.formas[1].largura).toBe(33);
    expect(esboco.formas[1].cor).toBeUndefined();
    expect(esboco.formas[0].largura).toBe(20);
  });

  it('remove e adiciona formas, e recusa id repetido, id ausente e forma que não existe', () => {
    const e = { formas: [caixa('a', [0, 0, 0])], opcoes: [{ titulo: 'T' }] };
    const { esboco } = editarEsboco(e, { adicionar: ['{"id":"b","tipo":"esfera","diametro":10,"centro":[30,0,0]}'], remover: ['a'] });
    expect(esboco.formas.map((f) => f.id)).toEqual(['b']);
    expect(() => editarEsboco(e, { adicionar: ['{"id":"a","tipo":"esfera","diametro":10}'] })).toThrow(/já existe/);
    expect(() => editarEsboco(e, { remover: ['z'] })).toThrow(/não há forma com esse id/);
    expect(() => editarEsboco(e, { atribuicoes: ['zz.cor=azul'] })).toThrow(/não começa por uma forma declarada/);
    expect(() => editarEsboco(e, { atribuicoes: ['a.id=b'] })).toThrow(/identidade/);
    expect(() => editarEsboco(e, { atribuicoes: ['a'] })).toThrow(/<forma>.<campo>=<valor>/);
    expect(() => editarEsboco(e, { atribuicoes: ['a.centro[9]=1'] })).toThrow(/fora da lista/);
  });

  it('grava preservando o recuo, e imprime a leitura padrão depois', () => {
    const arquivo = copia();
    const original = JSON.parse(readFileSync(arquivo, 'utf8'));
    writeFileSync(arquivo, `${JSON.stringify(original, null, 4)}\n`);
    const r = editarArquivo(arquivo, { atribuicoes: ['cubo.diametro=70', 'suporteE.altura=470'] });
    const novo = readFileSync(arquivo, 'utf8');
    expect(novo.startsWith('{\n    "vista"')).toBe(true);
    const e = JSON.parse(novo);
    expect(e.opcoes[0].formas.find((f) => f.id === 'cubo').diametro).toBe(70);
    expect(e.parametros).toEqual(original.parametros);
    expect(e.opcoes[0].formas.find((f) => f.id === 'aro').diametroExterno).toBe('=raioRoda*2');
    expect(r.texto).toContain('cubo.diametro: 60 -> 70');
    expect(r.texto).toContain('opção 1 (Roda): 8 formas');
    expect(r.texto).toMatch(/divergências/);
  });

  it('recusa sem gravar, dizendo o campo e o válido', () => {
    const arquivo = copia();
    const antes = readFileSync(arquivo, 'utf8');
    expect(() => editarArquivo(arquivo, { atribuicoes: ['cubo.diametroo=70'] })).toThrow(/o campo "diametroo" não existe.*quis dizer "diametro".*o arquivo não foi alterado/s);
    expect(() => editarArquivo(arquivo, { atribuicoes: ['cubo.cor=roxoclaro'] })).toThrow(/"cor" com o valor "roxoclaro" deve ser um nome/);
    expect(() => editarArquivo(arquivo, { atribuicoes: ['cubo.eixo="w"'] })).toThrow(/"eixo" com o valor "w" deve ser um de x, y, z/);
    expect(() => editarArquivo(arquivo, { remover: ['suporteE'] })).toThrow(/contato.juntas\[1\].pecas cita "suporteE", que não é uma forma visível.*o arquivo não foi alterado/s);
    expect(() => editarArquivo(arquivo, { remover: ['cubo'] })).toThrow(/o arquivo não foi alterado/);
    expect(readFileSync(arquivo, 'utf8')).toBe(antes);
  });

  it('pela linha de comando: o arquivo vem depois de --editar, com vários pares, --remover e --adicionar', () => {
    const arquivo = copia();
    const a = lerArgumentos(['--editar', arquivo, 'cubo.diametro=70', 'eixo.diametro=20', '--remover', 'tampa', '--adicionar', '{"id":"x"}']);
    expect(a.alvo).toBe(arquivo);
    expect(a.edicao).toEqual({ atribuicoes: ['cubo.diametro=70', 'eixo.diametro=20'], remover: ['tampa'], adicionar: ['{"id":"x"}'] });
    const b = lerArgumentos([arquivo, '--editar', 'cubo.diametro=70']);
    expect(b.alvo).toBe(arquivo);
    expect(b.edicao.atribuicoes).toEqual(['cubo.diametro=70']);
    const r = rodar(['--editar', arquivo, 'cubo.diametro=70', 'eixo.diametro=20']);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('eixo.diametro: 24 -> 20');
    const ruim = rodar(['--editar', arquivo, 'cubo.nada=1']);
    expect(ruim.status).toBe(1);
    expect(ruim.stderr).toContain('esboço recusado');
  });
});

describe('estilos e cor por unidade', () => {
  const bruto = fixture('estilos-perfis.esboco.json');
  it('a forma manda sobre o estilo, e o estilo sobre a unidade', () => {
    expect(formaDe(bruto, 'cubo').cor).toBe('amarelo');
    expect(formaDe(bruto, 'aro').cor).toBe('cinza');
    expect(formaDe(bruto, 'suporteE').cor).toBe('azul');
    expect(formaDe(bruto, 'paralama').cor).toBe('vermelho');
    const e = { ...bruto, estilos: { ...bruto.estilos, outro: { cor: 'verde', opacidade: 0.5 } } };
    e.opcoes = [{ titulo: 'Roda', formas: bruto.opcoes[0].formas.map((f) => (f.id === 'aro' ? { ...f, estilo: 'outro' } : f.id === 'eixo' ? { ...f, estilo: 'outro', cor: 'laranja' } : f)) }];
    expect(formaDe(e, 'aro')).toMatchObject({ cor: 'verde', opacidade: 0.5 });
    expect(formaDe(e, 'eixo')).toMatchObject({ cor: 'laranja', opacidade: 0.5 });
    expect(formaDe(e, 'aro').estilo).toBeUndefined();
  });

  it('o espelho herda a cor e a unidade da fonte, e o estilo declarado nele vale', () => {
    expect(formaDe(bruto, 'suporteD').espelha).toEqual({ forma: 'suporteE', eixo: 'x', pos: 0 });
    const r = resolvidas(bruto).find((x) => x.id === 'suporteD');
    expect(r.forma.cor).toBe('azul');
    expect(r.forma.unidade).toBe('estrutura');
  });

  it('diz o estilo que falta, com os declarados e o "quis dizer"', () => {
    const e = JSON.parse(JSON.stringify(bruto));
    e.opcoes[0].formas[0].estilo = 'metall';
    expect(() => expandirEsboco(e)).toThrow(/não é um estilo declarado.*quis dizer "metal".*estilos: metal, pintura/s);
    const f = JSON.parse(JSON.stringify(bruto));
    f.estilos.metal.cor = 'roxoclaro';
    expect(() => expandirEsboco(f)).toThrow(/estilos\.metal: "cor" com o valor "roxoclaro"/);
    const g = JSON.parse(JSON.stringify(bruto));
    g.estilos.metal.corr = 'azul';
    expect(() => expandirEsboco(g)).toThrow(/estilos\.metal: o campo "corr" não existe/);
    const h = JSON.parse(JSON.stringify(bruto));
    h.unidades.roda.estilo = 'nenhum';
    expect(() => expandirEsboco(h)).toThrow(/unidades\.roda: "estilo"/);
  });

  it('um esboço sem os campos novos gera o mesmo desenho, igual ao SVG gravado', () => {
    for (const nome of ['casa', 'mancal-eixo', 'teste-cubo']) {
      const svg = readFileSync(caminho(`${nome}.svg`), 'utf8');
      expect(sha(desenharEsboco(fixture(`${nome}.esboco.json`)).svg)).toBe(sha(svg));
    }
  });
});

describe('simetria implícita', () => {
  const base = () => ({
    simetrico: { eixo: 'x', pos: 0 },
    opcoes: [{ titulo: 'T', formas: [caixa('pernaE', [-50, 10, 0], 10, 20, 10, { lado: 'E' }), caixa('bracoD', [60, 10, 0], 10, 20, 10, { lado: 'D' }), caixa('mastroE', [-30, 40, 0]), caixa('trave', [0, 60, 0], 200, 10, 10)] }],
  });
  it('gera o espelho só da forma que declara `lado` e tem o sufixo, sem entrada espelha escrita', () => {
    const ids = formasDe(base()).map((f) => f.id);
    expect(ids).toEqual(['pernaE', 'pernaD', 'bracoD', 'bracoE', 'mastroE', 'trave']);
    const rs = resolvidas(base());
    const D = rs.find((r) => r.id === 'pernaD');
    expect([D.min[0], D.max[0]]).toEqual([45, 55]);
    expect(rs.find((r) => r.id === 'bracoE').centro[0]).toBe(-60);
  });
  it('a entrada explícita prevalece, a unidade manda sobre a raiz e `false` desliga', () => {
    const e = base();
    e.opcoes[0].formas.push({ id: 'pernaD', espelha: { forma: 'pernaE', eixo: 'x', pos: 10 } });
    expect(formasDe(e).filter((f) => f.id === 'pernaD')).toHaveLength(1);
    expect(resolvidas(e).find((r) => r.id === 'pernaD').centro[0]).toBe(70);
    const u = base();
    u.opcoes[0].formas[0].unidade = 'perna';
    u.unidades = { perna: { simetrico: { eixo: 'x', pos: 10 } } };
    expect(resolvidas(u).find((r) => r.id === 'pernaD').centro[0]).toBe(70);
    u.unidades.perna.simetrico = false;
    expect(formasDe(u).map((f) => f.id)).not.toContain('pernaD');
  });
  it('o espelho herda a unidade, a cor e o oculto, e a posição aceita parâmetro', () => {
    const e = base();
    e.parametros = { plano: 5 };
    e.simetrico = { eixo: 'x', pos: 'plano' };
    e.opcoes[0].formas[0] = { ...e.opcoes[0].formas[0], unidade: 'perna', cor: 'azul', oculto: true };
    const D = formasDe(e).find((f) => f.id === 'pernaD');
    expect(D).toMatchObject({ oculto: true, cor: 'azul' });
    expect(resolverOpcao(expandirEsboco(e).opcoes[0], 'o', {}).find((r) => r.id === 'pernaD').centro[0]).toBe(60);
  });
  it('recusa eixo inválido com a lista válida', () => {
    const e = base();
    e.simetrico = { eixo: 'w' };
    expect(() => expandirEsboco(e)).toThrow(/"simetrico.eixo" com o valor "w" deve ser "x", "y" ou "z"/);
  });
  it('o plano de detalhe agrupa o espelho com a fonte', () => {
    const bruto = fixture('estilos-perfis.esboco.json');
    const u = planoDeDetalhe(bruto).unidades.find((x) => x.id === 'estrutura');
    expect(u.membros).toEqual(['suporteE', 'suporteD', 'paralama']);
  });
});

describe('perfis por função', () => {
  const num = (v) => v;
  it('estrela: n raios, 3 pontos por raio, alcance de rout e o primeiro raio para +v', () => {
    const p = gerarPerfil({ gerar: 'estrela', n: 5, rin: 62, rout: 207, semi: 11 }, num, 'perfil', 'f');
    expect(p).toHaveLength(15);
    expect(Math.max(...p.map(([, v]) => v))).toBeCloseTo(207 * Math.cos((5.5 * Math.PI) / 180), 2);
    expect(Math.max(...p.map(([u, v]) => Math.hypot(u, v)))).toBeCloseTo(207, 2);
    expect(Math.min(...p.map(([u, v]) => Math.hypot(u, v)))).toBeCloseTo(62, 2);
  });
  it('arco: 2 x (passos + 1) pontos entre os dois raios', () => {
    const p = gerarPerfil({ gerar: 'arco', raioExterno: 325, raioInterno: 312, angulo: 34, passos: 8 }, num, 'perfil', 'f');
    expect(p).toHaveLength(18);
    const r = p.map(([u, v]) => Math.hypot(u, v));
    expect(Math.max(...r)).toBeCloseTo(325, 2);
    expect(Math.min(...r)).toBeCloseTo(312, 2);
  });
  it('circulo e polar', () => {
    const c = gerarPerfil({ gerar: 'circulo', raio: 40 }, num, 'perfil', 'f');
    expect(c).toHaveLength(24);
    expect(c.every(([u, v]) => Math.abs(Math.hypot(u, v) - 40) < 0.01)).toBe(true);
    expect(gerarPerfil({ gerar: 'circulo', raio: 40, lados: 6 }, num, 'perfil', 'f')).toHaveLength(6);
    expect(gerarPerfil({ gerar: 'polar', pontos: [[0, 10], [90, 10], [180, 10]] }, num, 'perfil', 'f')).toEqual([[10, 0], [0, 10], [-10, 0]]);
  });
  it('é determinístico, e a expansão dá a mesma lista que o gerador, com parâmetros e expressões nos argumentos', () => {
    const bruto = fixture('estilos-perfis.esboco.json');
    const estrela = formaDe(bruto, 'estrela').perfil;
    expect(estrela).toEqual(gerarPerfil({ gerar: 'estrela', n: 5, rin: 30, rout: 190, semi: 12 }, num, 'perfil', 'f'));
    expect(formaDe(bruto, 'paralama').perfil).toHaveLength(14);
    expect(formaDe(bruto, 'tampa').perfil).toHaveLength(16);
    expect(sha(desenharEsboco(bruto).svg)).toBe(sha(desenharEsboco(JSON.parse(JSON.stringify(bruto))).svg));
  });
  it('desenha o mesmo SVG que a lista numérica escrita à mão', () => {
    const gerado = { opcoes: [{ titulo: 'T', formas: [{ id: 'p', tipo: 'extrusao', eixo: 'x', comprimento: 20, perfil: { gerar: 'circulo', raio: 30, lados: 8 }, centro: [0, 0, 0] }] }] };
    const lista = JSON.parse(JSON.stringify(gerado));
    lista.opcoes[0].formas[0].perfil = gerarPerfil({ gerar: 'circulo', raio: 30, lados: 8 }, num, 'perfil', 'f');
    expect(desenharEsboco(gerado).svg).toBe(desenharEsboco(lista).svg);
  });
  it('vale em revolucao e na seção de um loft', () => {
    const rev = { opcoes: [{ titulo: 'T', formas: [{ id: 'r', tipo: 'revolucao', eixo: 'y', perfil: { gerar: 'polar', pontos: [[0, 20], [45, 30], [90, 20]] }, centro: [0, 0, 0] }] }] };
    expect(formaDe(rev, 'r').perfil).toHaveLength(3);
    const loft = { opcoes: [{ titulo: 'T', formas: [{ id: 'l', tipo: 'loft', eixo: 'y', secoes: [{ pos: 0, perfil: { gerar: 'circulo', raio: 20, lados: 6 } }, { pos: 40, tamanho: [20, 20] }], centro: [0, 0, 0] }] }] };
    expect(formaDe(loft, 'l').secoes[0].perfil).toHaveLength(6);
  });
  it('recusa gerador desconhecido, campo desconhecido e argumento inválido, dizendo a lista', () => {
    const f = (perfil) => ({ opcoes: [{ titulo: 'T', formas: [{ id: 'p', tipo: 'extrusao', eixo: 'x', comprimento: 20, perfil, centro: [0, 0, 0] }] }] });
    expect(() => expandirEsboco(f({ gerar: 'estrella', n: 5 }))).toThrow(/não é um gerador de perfil.*quis dizer "estrela".*geradores: "estrela" \(n, rin, rout, semi\); "arco".*"circulo".*"polar"/s);
    expect(() => expandirEsboco(f({ gerar: 'circulo', raio: 4, ladoss: 6 }))).toThrow(/não tem o campo "ladoss"/);
    expect(() => expandirEsboco(f({ gerar: 'estrela', n: 5, rin: 30, rout: 20, semi: 10 }))).toThrow(/0 < rin < rout/);
    expect(() => expandirEsboco(f({ gerar: 'arco', raioExterno: 20 }))).toThrow(/precisa do campo "raioInterno"/);
    expect(() => expandirEsboco(f({ gerar: 'estrela', n: 5, rin: 'semNome', rout: 20, semi: 10 }))).toThrow(/parâmetro/);
    expect(Object.keys(GERADORES)).toEqual(['estrela', 'arco', 'circulo', 'polar', 'raios', 'pneu', 'disco']);
  });
});

describe('Envelope por forma', () => {
  const bruto = fixture('estilos-perfis.esboco.json');
  const detalhado = () => detalharUnidade(bruto, null, 'roda');
  const trocar = (d, id, novas) => { const f = d.opcoes[0].formas; f.splice(f.findIndex((x) => x.id === id), 1, ...novas); return d; };
  it('sem `substitui` o resultado é o de sempre, sem o campo `formas`', () => {
    const r = conferirEnvelope(bruto, null, 'roda', detalhado());
    expect(r.ok).toBe(true);
    expect(r.formas).toBeUndefined();
    expect(formatarEnvelope(r, 'd.json')).not.toContain('formas da maquete');
  });
  it('confere cada forma da maquete contra a que a substitui e diz qual foi excedida', () => {
    const d = trocar(detalhado(), 'estrela', [{ id: 'estrelaGrossa', tipo: 'extrusao', eixo: 'x', comprimento: 40, perfil: { gerar: 'estrela', n: 5, rin: 30, rout: 190, semi: 12 }, centro: [0, 217, 0], unidade: 'roda', substitui: 'estrela' }]);
    const r = conferirEnvelope(bruto, null, 'roda', d);
    expect(r.ok).toBe(false);
    expect(r.formas.find((f) => f.forma === 'estrela')).toMatchObject({ ok: false, por: ['estrelaGrossa'] });
    expect(r.caixa.x.ok).toBe(true);
    expect(r.falta.join('\n')).toMatch(/a forma "estrela" da maquete foi excedida: estrelaGrossa passa 10 mm em x/);
    expect(formatarEnvelope(r, 'd.json')).toContain('formas da maquete: estrela excedida');
  });
  it('a forma que cabe passa, e o que não tem `substitui` fica na caixa da unidade', () => {
    const d = trocar(detalhado(), 'estrela', [{ id: 'estrelaFina', tipo: 'extrusao', eixo: 'x', comprimento: 12, perfil: { gerar: 'estrela', n: 5, rin: 30, rout: 190, semi: 12 }, centro: [0, 217, 0], unidade: 'roda', substitui: 'estrela' }]);
    expect(conferirEnvelope(bruto, null, 'roda', d).ok).toBe(true);
    d.opcoes[0].formas.push({ id: 'saliencia', tipo: 'caixa', largura: 20, altura: 20, profundidade: 20, centro: [0, 200, 400], unidade: 'roda' });
    const r = conferirEnvelope(bruto, null, 'roda', d);
    expect(r.ok).toBe(false);
    expect(r.falta.join('\n')).toMatch(/passa .* mm do Envelope em z/);
    expect(r.formas.every((f) => f.ok)).toBe(true);
  });
  it('recusa um `substitui` que não é forma da unidade na maquete', () => {
    const d = trocar(detalhado(), 'estrela', [{ id: 'e2', tipo: 'caixa', largura: 10, altura: 10, profundidade: 10, centro: [0, 200, 0], unidade: 'roda', substitui: 'estrelaa' }]);
    const r = conferirEnvelope(bruto, null, 'roda', d);
    expect(r.ok).toBe(false);
    expect(r.falta.join('\n')).toMatch(/"estrelaa", que e2 diz substituir, não é uma forma da unidade "roda" na maquete.*quis dizer "estrela"/s);
  });
  it('o espelho implícito de uma forma que substitui leva o `substitui` do outro lado', () => {
    const e = { simetrico: { eixo: 'x' }, opcoes: [{ titulo: 'T', formas: [caixa('pernaE', [-50, 10, 0], 10, 20, 10, { lado: 'E', substitui: 'baseE' })] }] };
    expect(resolvidas(e).find((r) => r.id === 'pernaD').forma.substitui).toBe('baseD');
  });
});

describe('--unidade', () => {
  it('grava a unidade isolada nas quatro vistas, enquadrada e sem legenda', async () => {
    const arquivo = copia();
    const r = await unidadeArquivo(arquivo, 'roda');
    expect(r.destinos.map((d) => d.replace(/^.*-unidade-/, ''))).toEqual(['roda-isometrica.png', 'roda-frontal.png', 'roda-lateral.png', 'roda-superior.png']);
    for (const d of r.destinos) {
      const png = PNG.sync.read(readFileSync(d));
      const fundo = [png.data[0], png.data[1], png.data[2]];
      let x0 = png.width; let x1 = 0; let y0 = png.height; let y1 = 0;
      for (let y = 0; y < png.height; y++) for (let x = 0; x < png.width; x++) {
        const k = (y * png.width + x) * 4;
        if (Math.abs(png.data[k] - fundo[0]) + Math.abs(png.data[k + 1] - fundo[1]) + Math.abs(png.data[k + 2] - fundo[2]) > 30) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
      }
      /* a unidade ocupa a maior parte do quadro nas duas direções que a vista mostra */
      expect(Math.max((x1 - x0) / png.width, (y1 - y0) / png.height)).toBeGreaterThan(0.7);
    }
  }, 120000);
  it('uma vista só com --vista, e a escala é maior que a da cena inteira', async () => {
    const arquivo = copia();
    const r = await unidadeArquivo(arquivo, 'roda', { vista: 'lateral' });
    expect(r.destinos).toHaveLength(1);
    expect(r.destinos[0]).toMatch(/-unidade-roda-lateral\.png$/);
    const inteiro = desenharEsboco({ ...fixture('estilos-perfis.esboco.json'), vista: 'lateral' });
    const isolado = expandirEsboco(detalharUnidade(fixture('estilos-perfis.esboco.json'), null, 'roda'));
    const so = desenharEsboco({ ...isolado, vista: 'lateral', legendas: 'lista' });
    expect(so.escala).toBeGreaterThanOrEqual(inteiro.escala);
    await expect(unidadeArquivo(arquivo, 'nenhuma')).rejects.toThrow(/não é uma unidade de detalhe/);
    await expect(unidadeArquivo(arquivo, 'roda', { vista: 'de-lado' })).rejects.toThrow(/vista 'de-lado' desconhecida/);
  }, 120000);
});

describe('plano.pecas', () => {
  const base = () => fixture('estilos-perfis.esboco.json');
  const classes = (e) => medirEsboco(e, { projecao: false }).divergencias.filter((d) => d.classe === 'peca');
  it('a fixture tem todas as peças e nenhuma divergência', () => {
    expect(classes(base())).toEqual([]);
    expect(medirEsboco(base(), { projecao: false }).plano.resumo.pecas).toBe(3);
  });
  it('a peça obrigatória sem forma é divergência de classe `peca` na leitura padrão, a mais grave', () => {
    const e = base();
    e.opcoes[0].formas = e.opcoes[0].formas.filter((f) => f.id !== 'paralama');
    const { divergencias, descricao } = medirEsboco(e, { projecao: false });
    const d = divergencias.find((x) => x.classe === 'peca');
    expect(d).toMatchObject({ classe: 'peca', pecas: [] });
    expect(d.texto).toMatch(/peça obrigatória "paralama" não tem nenhuma forma/);
    expect(divergencias[0].classe).toBe('peca');
    expect(formatarResumo(descricao, divergencias)).toMatch(/\[1\] peca: a peça obrigatória "paralama"/);
  });
  it('casa por id, por padrão com * e por instância de componente; a não obrigatória não reprova', () => {
    const e = base();
    e.plano.pecas = [{ nome: 'a', formas: ['suporte*'], obrigatoria: true }, { nome: 'b', formas: ['aro'], obrigatoria: true }, { nome: 'c', formas: ['nada*'] }];
    expect(classes(e)).toEqual([]);
    e.plano.pecas.push({ nome: 'd', formas: ['nada*', 'zero'], obrigatoria: true });
    expect(classes(e)).toHaveLength(1);
    const moto = fixture('moto-componentes.esboco.json');
    moto.plano = { texto: 'x', pecas: [{ nome: 'roda', formas: ['rodaFrente'], obrigatoria: true }, { nome: 'quadro', formas: ['quadro'], obrigatoria: true }] };
    expect(classes(moto)).toEqual([]);
    moto.plano.pecas.push({ nome: 'carenagem', formas: ['carenagem'], obrigatoria: true });
    const sem = classes(moto);
    expect(sem.length).toBeGreaterThan(0);
    expect(sem.every((d) => /"carenagem"/.test(d.texto))).toBe(true);
  });
  it('valor por opção, e o formato errado diz o campo e o exemplo', () => {
    const e = base();
    e.plano.pecas = [{ nome: 'x', formas: ['nada'], obrigatoria: true, opcoes: ['Outra'] }];
    expect(classes(e)).toEqual([]);
    expect(() => lerPlano({ pecas: [{ nome: 'x', forma: ['a'] }] })).toThrow(/o campo "forma" não existe.*quis dizer "formas"/s);
    expect(() => lerPlano({ pecas: [{ nome: 'x', formas: 'a' }] })).toThrow(/"formas" deve listar.*Exemplo/s);
    expect(() => lerPlano({ pecas: [{ nome: 'x', formas: ['a'], obrigatoria: 'sim' }] })).toThrow(/"obrigatoria" deve ser true ou false/);
    expect(() => lerPlano({ pecas: [{ nome: 'x', formas: ['a'] }, { nome: 'x', formas: ['b'] }] })).toThrow(/repetido/);
  });
  it('reprova o Portão da Conferência da maquete, e a Maquete ainda constrói', () => {
    const e = base();
    e.plano = { ...e.plano, nivel: 'medio' };
    e.opcoes[0].formas = e.opcoes[0].formas.filter((f) => f.id !== 'paralama');
    let estado = criarEstado(e, 'x.esboco.json');
    expect(estado.atual).toBe('maquete');
    expect(portaoDoEstagio(e, estado).falta.join('\n')).not.toMatch(/peca:/);
    estado = { ...estado, atual: 'conferencia-da-maquete' };
    expect(portaoDoEstagio(e, estado).falta.join('\n')).toMatch(/\[\d+\] peca: a peça obrigatória "paralama"/);
    expect(conferirPlano).toBeTypeOf('function');
  });
  it('um esboço sem `plano.pecas` mede o mesmo de antes (sem classe `peca` e sem `pecas` no resumo)', () => {
    const e = base();
    delete e.plano.pecas;
    const m = medirEsboco(e, { projecao: false });
    expect(m.plano.resumo.pecas).toBeUndefined();
    expect(m.divergencias).toEqual([]);
  });
});

describe('a fixture nova pela linha de comando', () => {
  it('passa a leitura padrão sem divergência', () => {
    expect(descreverArquivo(caminho('estilos-perfis.esboco.json')).texto).toContain('divergências: nenhuma');
  });
});
