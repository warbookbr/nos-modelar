/* O curso de um mecanismo na linha de comando e no brief do crítico (atritos 38, 40, 42 e 43 do avião): `--curso` varre as posições
   e junta os achados; o brief da unidade que o curso move traz as poses inteiras, o fim incluso, e diz ao crítico qual é o fim; o
   `--editar` de uma cópia do mestre não exige os contornos de referência ao lado; o `--integrar` leva o curso do detalhe ao
   mestre. O esboço de prova é um trem que recolhe e bate numa parede a partir de certo ângulo. Cada medida é de número, de arquivo
   ou de pixel. */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { PNG } from 'pngjs';
import { avancar, criarEstado, planoDeDetalhe } from '../src/condutor.js';
import { aplicarPose, lerCurso, posesDoBrief } from '../src/curso.js';
import { quadroDoCurso } from '../src/curso-varredura.js';
import { expandirEsboco } from '../src/expandir.js';
import { detalharUnidade, integrarUnidade } from '../src/detalhe.js';
import { editarEsboco } from '../src/editar.js';
import { desenharEsboco, resolverOpcao } from '../src/index.js';
import { briefDoCritico, cursoArquivo, descreverArquivo, editarArquivo, esbocoIsolado, variante } from '../../../tools/mecanifica/esboco.mjs';
import { FIM_DO_BRIEF, MARCA_DO_BRIEF } from '../../../tools/mecanifica/esboco-brief.mjs';

const CLI = fileURLToPath(new URL('../../../tools/mecanifica/esboco.mjs', import.meta.url));
const clone = (v) => JSON.parse(JSON.stringify(v));
const caixa = (id, x, y, z, w, h, d, extra = {}) => ({ id, tipo: 'caixa', largura: w, altura: h, profundidade: d, centro: [x, y, z], ...extra });

/* O trem do esboço detalhado: a perna vai do pivô P, sob o corpo, à roda W, que gira com `angTrem` no plano y-z (0 estendido, 90
   recolhido para trás). A parede fica atrás do pivô e a roda a alcança entre 36 e 54 graus; o corpo, só a 90. A unidade
   `trem` tem nove formas (mancal, perna, roda e seis pinos), o que lhe dá crítico por unidade. */
const trem = (extra = {}) => ({
  parametros: { angTrem: 0, perna: 150, raio: 60 },
  pontos: { P: [0, 185, 0], W: [0, '=185-perna*cos(angTrem)', '=-perna*sin(angTrem)'] },
  contato: { usar: true, tolerancia: 1, penetracao: 1, folga: 100, pares: [
    { a: 'perna', b: 'mancal', tipo: 'atravessa', max: 60, motivo: 'a perna gira dentro do mancal' },
    { a: 'perna', b: 'roda', tipo: 'atravessa', max: 120, motivo: 'a roda se prende no fim da perna' },
  ] },
  curso: { recolhe: { parametro: 'angTrem', de: 0, ate: 90, passos: 5, rotulo: 'o trem recolhendo para trás' } },
  unidades: { trem: { funcao: 'perna, roda e mancal do trem que recolhe para trás' }, corpo: { funcao: 'o corpo e a parede atrás do trem' } },
  opcoes: [{ titulo: 'T', nota: 'Maquete do trem, com a proa em z 0', formas: [
    caixa('corpo', 0, 300, -100, 200, 200, 400, { unidade: 'corpo' }),
    caixa('parede', 0, 150, -190, 200, 100, 30, { unidade: 'corpo' }),
    caixa('mancal', 0, 187.5, 0, 60, 25, 60, { unidade: 'trem' }),
    ...[-20, 0, 20].flatMap((z) => [-1, 1].map((l) => caixa(`pino${l < 0 ? 'E' : 'D'}${z + 20}`, 35 * l, 187.5, z, 10, 10, 10, { unidade: 'trem' }))),
    { id: 'perna', tipo: 'cilindro', diametro: 20, de: 'P', para: 'W', cor: 'cinza', unidade: 'trem' },
    { id: 'roda', tipo: 'cilindro', diametro: '=raio*2', comprimento: 40, eixo: 'x', centro: 'W', cor: 'preto', unidade: 'trem' },
  ] }],
  ...extra,
});

/* o esboço no estágio Detalhe por unidade, com as medidas tiradas das próprias formas na pose de repouso */
function naDetalhe(e) {
  const rs = resolverOpcao(expandirEsboco(e).opcoes[0]);
  const total = [0, 1, 2].map((i) => Math.max(...rs.map((r) => r.max[i])) - Math.min(...rs.map((r) => r.min[i])));
  const valorDe = { alturaTotal: total[1], larguraTotal: total[0], profundidadeTotal: total[2] };
  const medidas = ['alturaTotal', 'larguraTotal', 'profundidadeTotal', 'alturaTotal', 'larguraTotal'].map((mede, k) => ({ nome: `m${k}`, valor: Math.round(valorDe[mede] * 100) / 100, unidade: 'mm', origem: 'ficha', tolerancia: 1, mede }));
  const completo = { ...e, plano: { nivel: 'detalhado', medidas, contrato: { tocam: [['corpo', 'parede']] }, orientacao: { frente: '-z', nomeDaFrente: 'a proa', nomeDeTras: 'a cauda' } } };
  let s = criarEstado(completo, 'g.esboco.json');
  for (let i = 0; i < 3; i++) { const r = avancar(completo, s); expect(r.ok, JSON.stringify(r.portao?.falta ?? r.bloqueio)).toBe(true); s = r.estado; }
  expect(s.atual).toBe('detalhe-por-unidade');
  return { completo, estado: s };
}
const gravar = (e) => {
  const { completo, estado } = naDetalhe(e);
  const pasta = mkdtempSync(join(tmpdir(), 'curso-'));
  const arquivo = join(pasta, 'g.esboco.json');
  writeFileSync(`${arquivo}.condutor.json`, JSON.stringify(estado, null, 2));
  writeFileSync(arquivo, JSON.stringify(completo, null, 2));
  return { pasta, arquivo, completo, estado };
};
const lerPng = (c) => PNG.sync.read(readFileSync(c));
const sha = (c) => createHash('sha256').update(readFileSync(c)).digest('hex');

describe('--curso: a varredura pela linha de comando', () => {
  it('imprime os achados com a posição de cada um e sai com código 1', () => {
    const { arquivo } = gravar(trem());
    const r = cursoArquivo(arquivo);
    expect(r.codigo).toBe(1);
    expect(r.texto).toContain('curso recolhe (o trem recolhendo para trás): angTrem de 0 a 90 em 5 passos, 6 posições');
    /* os passos de 18 graus: a roda alcança a parede em 54 (a 36 ainda há folga) e só entra no corpo em 90 */
    expect(r.texto).toMatch(/parede e roda se penetram 6,2 mm, acima do limite de [\d,]+ mm \([^)]*\)\n\s+em angTrem 54 \(6,2 mm\), 72 \(27,7 mm\), 90 \(35 mm\); o pior, 35 mm em 90/);
    expect(r.texto).toMatch(/corpo e roda se penetram 45,0 mm, acima do limite de [\d,]+ mm \([^)]*\)\n\s+em angTrem 90 \(45 mm\)\n/);
    expect(r.texto).toContain('posições sem achado novo: 0, 18, 36');
  });

  it('o processo: `npm run esboco -- <arquivo> --curso [mecanismo]` sai com 1 quando o curso atravessa, e com 0 quando não', () => {
    const { arquivo } = gravar(trem());
    const com = spawnSync(process.execPath, [CLI, arquivo, '--curso'], { encoding: 'utf8' });
    expect(com.status).toBe(1);
    expect(com.stdout).toContain('2 achados aparecem ao longo do curso');
    const nomeado = spawnSync(process.execPath, [CLI, arquivo, '--curso', 'recolhe'], { encoding: 'utf8' });
    expect(nomeado.status).toBe(1);
    const errado = spawnSync(process.execPath, [CLI, arquivo, '--curso', 'recolhee'], { encoding: 'utf8' });
    expect(errado.status).toBe(1);
    expect(errado.stderr).toContain('não é um mecanismo declarado em "curso"');
    const limpo = gravar(trem({ curso: { recolhe: { parametro: 'angTrem', de: 0, ate: 36, passos: 2 } } }));
    const ok = spawnSync(process.execPath, [CLI, limpo.arquivo, '--curso'], { encoding: 'utf8' });
    expect(ok.status).toBe(0);
    expect(ok.stdout).toContain('nenhum achado novo em nenhuma das 3 posições (0, 18, 36)');
    const sem = trem();
    delete sem.curso;
    const { arquivo: semCurso } = gravar(sem);
    const nada = spawnSync(process.execPath, [CLI, semCurso, '--curso'], { encoding: 'utf8' });
    expect(nada.status).toBe(1);
    expect(nada.stderr).toContain('o esboço não declara "curso"');
  });

  it('a varredura do detalhe isolado traz à vista a parede escondida, sem a cópia nem os quinze --editar (atrito 38)', () => {
    const mestre = trem();
    const detalhe = detalharUnidade(mestre, null, 'trem');
    expect(detalhe.opcoes[0].formas.find((f) => f.id === 'parede').oculto).toBe(true);
    const pasta = mkdtempSync(join(tmpdir(), 'curso-'));
    const arquivo = join(pasta, 'g-detalhe-trem.esboco.json');
    writeFileSync(arquivo, JSON.stringify(detalhe, null, 2));
    const r = cursoArquivo(arquivo);
    expect(r.codigo).toBe(1);
    expect(r.texto).toMatch(/\d+ formas? ocultas? trazidas? à vista para a varredura/);
    expect(r.texto).toContain('parede e roda se penetram');
  });
});

describe('o brief da unidade com curso traz as poses inteiras, o fim incluso (atrito 40)', () => {
  it('seis imagens do curso, no mesmo quadro, a última marcada como o fim, sem depender do que o esbocista mostrou', async () => {
    const { pasta, arquivo, completo } = gravar(trem());
    const b = await briefDoCritico(arquivo, 'trem', { saida: join(pasta, 'c'), largura: 400 });
    const [c] = lerCurso(completo);
    const valores = posesDoBrief(c);
    expect(valores).toEqual([0, 18, 36, 54, 72, 90]);
    expect(b.poses).toHaveLength(6);
    for (const f of b.poses) expect(existsSync(f)).toBe(true);
    expect(b.poses.map((f) => f.match(/curso-recolhe-(\d+)-composta/)[1])).toEqual(['0', '18', '36', '54', '72', '90']);
    /* o texto diz o mecanismo, o parâmetro, as pontas, e que a última é o fim do curso */
    expect(b.texto).toContain('Curso do mecanismo "recolhe" (o trem recolhendo para trás): angTrem vai de 0 a 90.');
    expect(b.texto).toContain('A primeira, com angTrem em 0, é o começo do curso; a última, com angTrem em 90, é o FIM do curso e vale como as outras.');
    expect(b.texto).toContain('aponte a posição em que isso acontece');
    const linhas = b.texto.split('\n').filter((l) => /^ {2}angTrem \d+/.test(l));
    expect(linhas).toHaveLength(6);
    expect(linhas[0]).toContain('angTrem 0 (começo do curso)');
    expect(linhas[5]).toContain('angTrem 90 (FIM do curso)');
    for (const [k, l] of linhas.entries()) expect(l.endsWith(b.poses[k])).toBe(true);
    /* depois das imagens de sempre e antes das perguntas; o brief.md leva o mesmo bloco */
    expect(b.texto.indexOf('Curso do mecanismo')).toBeGreaterThan(b.texto.indexOf('Imagens (as quatro vistas'));
    expect(b.texto.indexOf('Curso do mecanismo')).toBeLessThan(b.texto.indexOf('Responda, olhando só as imagens:'));
    const gravado = readFileSync(join(pasta, 'c', 'brief.md'), 'utf8');
    expect(gravado.startsWith(MARCA_DO_BRIEF)).toBe(true);
    expect(gravado).toContain('angTrem 90 (FIM do curso)');
    expect(gravado.trimEnd().endsWith(FIM_DO_BRIEF)).toBe(true);
    /* as seis são grades das quatro vistas de uma mesma largura, e cada pose é uma imagem diferente: o trem mudou de lugar */
    const imagens = b.poses.map(lerPng);
    expect(new Set(imagens.map((i) => `${i.width}x${i.height}`)).size).toBe(1);
    expect(imagens[0].width).toBe(400);
    expect(new Set(b.poses.map(sha)).size).toBe(6);
  }, 280000);

  it('o quadro das poses é um só: a escala de cada vista não muda de uma pose para outra, e sem ele mudaria', () => {
    const { arquivo, completo, estado } = gravar(trem());
    expect(arquivo).toBeTruthy();
    const [c] = lerCurso(completo);
    const valores = posesDoBrief(c);
    const membros = estado.unidades.find((u) => u.id === 'trem').membros;
    const quadro = quadroDoCurso(completo, c, membros, valores);
    const escalas = (comQuadro, vista) => valores.map((valor) => {
      const bruto = aplicarPose(completo, c, valor);
      const { isolado, idsVizinhos } = esbocoIsolado(bruto, estado, 'trem', true);
      const proprias = resolverOpcao(isolado.opcoes[0]).filter((r) => r.forma.oculto !== true).map((r) => r.id).filter((id) => !idsVizinhos.includes(id));
      const com = comQuadro ? { ...isolado, enquadrar: { formas: proprias, aviso: false, pontos: quadro } } : isolado;
      return desenharEsboco(variante({ ...com, ladosPorEscala: true }, { vista, legendas: false, centros: false })).escala;
    });
    for (const vista of ['lateral', 'superior', 'frontal']) {
      const fixas = escalas(true, vista);
      for (const e of fixas) expect(e).toBeCloseTo(fixas[0], 9);
    }
    /* sem o quadro fixo a lateral acompanha a caixa da unidade em cada pose, e a escala de 0 e a de 90 graus diferem */
    const soltas = escalas(false, 'lateral');
    expect(Math.abs(soltas[0] - soltas[5])).toBeGreaterThan(1e-3 * soltas[0]);
  });

  it('o esboço sem curso tem o brief de antes: nenhuma linha de curso e nenhuma pose', async () => {
    const sem = trem();
    delete sem.curso;
    const g = gravar(sem);
    const b = await briefDoCritico(g.arquivo, 'trem', { saida: join(g.pasta, 'c'), largura: 400 });
    expect(b.texto).not.toContain('Curso do mecanismo');
    expect(b.poses).toEqual([]);
  }, 280000);
});

describe('--editar numa cópia do mestre sem os contornos de referência ao lado (atrito 42)', () => {
  const comReferencia = () => {
    const e = trem();
    e.plano = { nivel: 'detalhado', referencia: [{ arquivo: 'lateral.conferencia.contornos.json', vista: 'lateral', tolerancia: 50, iou_min: 0.5 }] };
    return e;
  };
  const copia = () => {
    const pasta = mkdtempSync(join(tmpdir(), 'copia-'));
    const arquivo = join(pasta, 'p83.esboco.json');
    writeFileSync(arquivo, JSON.stringify(comReferencia(), null, 2));
    return { pasta, arquivo };
  };

  it('grava a edição, diz que a referência não estava ao lado e deixa de fora a divergência de silhueta', () => {
    const { arquivo } = copia();
    const r = editarArquivo(arquivo, { atribuicoes: ['parametros.angTrem=54'] });
    expect(JSON.parse(readFileSync(arquivo, 'utf8')).parametros.angTrem).toBe(54);
    expect(r.texto).toContain('parametros.angTrem: 0 -> 54');
    expect(r.texto).toContain('referência ao lado ausente (lateral.conferencia.contornos.json): a edição foi gravada e a leitura acima vem sem a conferência da silhueta');
    expect(r.ausentes).toEqual(['lateral.conferencia.contornos.json']);
    expect(r.divergencias.some((d) => d.tipo === 'referencia-fora')).toBe(false);
    /* a leitura que sobra é a do gate na pose editada: a roda já atravessa a parede a 54 graus */
    expect(r.texto).toContain('parede e roda se penetram 6,2 mm');
  });

  it('as divergências saem numeradas de 1 em diante, sem o buraco da que ficou de fora', () => {
    const { arquivo } = copia();
    const r = editarArquivo(arquivo, { atribuicoes: ['parametros.angTrem=90'] });
    expect(r.divergencias.map((d) => d.n)).toEqual(r.divergencias.map((_, k) => k + 1));
    expect(r.divergencias.length).toBeGreaterThan(0);
  });

  it('com os contornos ao lado a leitura continua conferindo a silhueta, e os outros comandos seguem exigindo o arquivo', () => {
    const { pasta, arquivo } = copia();
    expect(() => descreverArquivo(arquivo)).toThrow(/referência "lateral\.conferencia\.contornos\.json": o arquivo não existe/);
    writeFileSync(join(pasta, 'lateral.conferencia.contornos.json'), JSON.stringify({ formato: 'mecanifica.contornos@1', mmPorPx: 1, imagem: { sha256: 'x', largura: 10, altura: 10 }, silhueta: { contornoPx: [[0, 0], [9, 0], [9, 9], [0, 9]], contornoMm: [[0, 0], [9, 0], [9, 9], [0, 9]] } }));
    const r = editarArquivo(arquivo, { atribuicoes: ['parametros.angTrem=18'] });
    expect(r.ausentes).toEqual([]);
    expect(r.texto).not.toContain('referência ao lado ausente');
  });

  it('um erro de edição continua recusando e não toca o arquivo', () => {
    const { arquivo } = copia();
    const antes = readFileSync(arquivo, 'utf8');
    expect(() => editarArquivo(arquivo, { atribuicoes: ['parametros.nao=1', 'rodaa.diametro=5'] })).toThrow(/o arquivo não foi alterado/);
    expect(readFileSync(arquivo, 'utf8')).toBe(antes);
  });
});

describe('o curso se edita e se integra', () => {
  it('`curso.<mecanismo>.<campo>` edita o curso do mestre, e `curso.<mecanismo>=<json>` o declara inteiro', () => {
    const { esboco, mudancas } = editarEsboco(trem(), { atribuicoes: ['curso.recolhe.ate=95', 'curso.recolhe.passos=10', 'curso.abre={"parametro":"angTrem","de":0,"ate":10}'] });
    expect(esboco.curso.recolhe).toMatchObject({ ate: 95, passos: 10 });
    expect(esboco.curso.abre).toEqual({ parametro: 'angTrem', de: 0, ate: 10 });
    expect(mudancas.map((m) => `${m.forma}.${m.campo}`)).toEqual(['curso.recolhe.ate', 'curso.recolhe.passos', 'curso.abre']);
    expect(trem().curso.recolhe.ate).toBe(90);
    expect(() => editarEsboco(trem(), { atribuicoes: ['curso.fecha.ate=5'] })).toThrow(/o mecanismo "fecha" não está em "curso" \(mecanismos: recolhe\); declare-o inteiro primeiro/);
    expect(editarEsboco(trem(), { atribuicoes: ['curso.recolhe=null'] }).esboco.curso).toBeUndefined();
  });

  it('o --integrar leva ao mestre o curso que o detalhe reescreveu, e não desfaz o que o mestre mudou depois da cópia', () => {
    const mestre = trem();
    const detalhe = detalharUnidade(mestre, null, 'trem');
    expect(detalhe.baseDoMestre.curso).toEqual(mestre.curso);
    /* o detalhe acerta o fim do curso: a pessoa vê a unidade nele */
    const d1 = clone(detalhe);
    d1.curso.recolhe.ate = 54;
    const r1 = integrarUnidade(mestre, null, 'trem', d1);
    expect(r1.mestre.curso.recolhe.ate).toBe(54);
    expect(r1.devolvidos.some((t) => t.startsWith('curso "recolhe" (reescrito: angTrem de 0 a 54)'))).toBe(true);
    /* o mestre mudou o curso depois da cópia e o detalhe só o copiou: fica o do mestre */
    const mexido = trem();
    mexido.curso.recolhe.ate = 72;
    const r2 = integrarUnidade(mexido, null, 'trem', clone(detalhe));
    expect(r2.mestre.curso.recolhe.ate).toBe(72);
    expect(r2.devolvidos.some((t) => t.startsWith('curso '))).toBe(false);
    expect(r2.base.mudouDesde).toContain('curso');
    /* um mecanismo novo declarado no detalhe entra */
    const d3 = clone(detalhe);
    d3.curso.abre = { parametro: 'angTrem', de: 0, ate: 10 };
    expect(integrarUnidade(mestre, null, 'trem', d3).mestre.curso.abre).toEqual({ parametro: 'angTrem', de: 0, ate: 10 });
  });
});

describe('o Plano de detalhe não muda com o curso', () => {
  it('as unidades do esboço com curso são as mesmas do esboço sem ele', () => {
    const sem = trem();
    delete sem.curso;
    expect(planoDeDetalhe(trem()).unidades.map((u) => [u.id, u.membros])).toEqual(planoDeDetalhe(sem).unidades.map((u) => [u.id, u.membros]));
  });
});
