/* dossie-do-objeto.test.mjs — o dossiê gerado é o esperado, e a conferência recusa o desatualizado e o que perdeu a seção à mão. */
import { afterEach, describe, expect, it } from 'vitest';
import { appendFileSync, cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { conferirDossie, gerarDossie, lerArgumentos, mdsAMaoNaPastaDoObjeto, montarDossie, objetosComDossie, objetosMudadosNoEnvio, operacoesPorParte, secoesAMao, secoesRepetidas, unidadesDoObjeto } from './dossie-do-objeto.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const FIXTURE = join(AQUI, '../fixtures/dossie');
const temporarias = [];
afterEach(() => { while (temporarias.length) rmSync(temporarias.pop(), { recursive: true, force: true }); });

function copia() {
  const pasta = mkdtempSync(join(tmpdir(), 'modelar-dossie-'));
  temporarias.push(pasta);
  cpSync(FIXTURE, pasta, { recursive: true });
  return pasta;
}
const DOCS = 'documentos/modelar';
/* a extensão entra por interpolação: o gate de links lê caminho de documento escrito inteiro como link */
const MD = 'md';
const dossieDe = (raiz, objeto) => join(raiz, 'procedural/pecas', objeto, 'DOSSIE.md');

describe('as operações de cada parte', () => {
  it('sobe o grafo dos passos e leva o que modifica o sólido, sem pegar as outras partes', () => {
    const { PASSOS } = JSON.parse(JSON.stringify({ PASSOS: [
      ['cubo', { origemId: 1 }], ['cubo', { origemId: 2 }], ['rotaciona', { sel: { origem: { op: 'cubo', id: 2 } } }],
      ['subtrair', { origemId: 3, solidos: [{ origem: { op: 'cubo', id: 1 } }, { origem: { op: 'cubo', id: 2 } }] }],
      ['cubo', { origemId: 4 }],
      ['parte', { nome: 'a', sel: { origem: { op: 'subtrair', id: 3 } } }], ['parte', { nome: 'b', sel: { origem: { op: 'cubo', id: 4 } } }],
      ['material', { usa: 'x', sel: { grupo: 'b' } }],
    ] }));
    const r = operacoesPorParte(PASSOS);
    expect(r.a).toEqual([{ op: 'cubo', vezes: 2 }, { op: 'rotaciona', vezes: 1 }, { op: 'subtrair', vezes: 1 }, { op: 'parte', vezes: 1 }]);
    expect(r.b).toEqual([{ op: 'cubo', vezes: 1 }, { op: 'parte', vezes: 1 }, { op: 'material', vezes: 1 }]);
  });
  it('é vazio sem PASSOS ou sem passo parte', () => {
    expect(operacoesPorParte(null)).toEqual({});
    expect(operacoesPorParte([['cubo', { origemId: 1 }]])).toEqual({});
  });
});

describe('as unidades', () => {
  it('a peça de receita única é uma unidade; o objeto de várias partes, uma por parte; a parte, só ela', () => {
    expect(unidadesDoObjeto('objeto-de-prova', FIXTURE).unidades.map((u) => u.id)).toEqual(['peca']);
    expect(unidadesDoObjeto('objeto-com-partes', FIXTURE).unidades.map((u) => u.id)).toEqual(['base', 'tampa']);
    expect(unidadesDoObjeto('objeto-com-partes/tampa', FIXTURE).unidades.map((u) => u.peca)).toEqual(['objeto-com-partes/tampa']);
    expect(() => unidadesDoObjeto('nao-existe', FIXTURE)).toThrow(/não é objeto do acervo/);
  });
});

describe('o dossiê gerado', () => {
  it('é igual ao esperado gravado na fixture, para a peça única e para o objeto de partes', async () => {
    for (const objeto of ['objeto-de-prova', 'objeto-com-partes']) {
      const raiz = copia();
      const esperado = readFileSync(dossieDe(FIXTURE, objeto), 'utf8');
      rmSync(dossieDe(raiz, objeto));
      await gerarDossie(objeto, { raiz, docs: DOCS });
      const gerado = readFileSync(dossieDe(raiz, objeto), 'utf8');
      // o esperado tem a seção à mão preenchida de propósito; o resto é igual
      const semMao = (t) => t.replace(/(<!-- dossie:a-mao:([^:\s]+):inicio -->\n)[\s\S]*?(\n<!-- dossie:a-mao:\2:fim -->)/g, '$1$3');
      expect(semMao(gerado)).toBe(semMao(esperado));
    }
  });
  it('traz o PLANO, as operações por parte, a rodada com nota e defeito, a decisão da pessoa e o plano com a tabela', async () => {
    const { texto } = await montarDossie('objeto-de-prova', { raiz: FIXTURE, docs: DOCS, aMao: secoesAMao(readFileSync(dossieDe(FIXTURE, 'objeto-de-prova'), 'utf8')) });
    expect(texto).toContain('- Escala: largura da caixa, 200 mm');
    expect(texto).toContain('| `caixa` | cubo ×2, transladar ×1, subtrair ×1, parte ×1, material ×1 |');
    expect(texto).toContain('| 1 | 2026-11-20 | passou | - | - | 4 | 1 | a pessoa, 2026-11-21: tampa de 4 mm está boa, a caixa segue |');
    expect(texto).toContain('banco de provas: [estudo-de-prova](../../../documentos/modelar/banco-de-provas/estudo-de-prova); tabela de tentativas: [README.md](../../../documentos/modelar/banco-de-provas/estudo-de-prova/README.md)');
    expect(texto).toContain('`2026-11-10-caixas-antigas.md`');
    expect(texto).not.toContain('nada a ver com a pasta');
    expect(texto).not.toContain('Plano de ferramenta');
  });
  it('preserva a seção à mão ao regerar', async () => {
    const raiz = copia();
    await gerarDossie('objeto-de-prova', { raiz, docs: DOCS });
    expect(secoesAMao(readFileSync(dossieDe(raiz, 'objeto-de-prova'), 'utf8')).peca).toContain('parede fina por subtração');
  });
});

describe('--check', () => {
  it('aceita o dossiê em dia', async () => {
    for (const objeto of ['objeto-de-prova', 'objeto-com-partes']) {
      const raiz = copia();
      await gerarDossie(objeto, { raiz, docs: DOCS });
      expect((await conferirDossie(objeto, { raiz, docs: DOCS })).problemas).toEqual([]);
    }
  });
  it('recusa o dossiê da fixture, gravado e em dia, quando a receita muda', async () => {
    const raiz = copia();
    expect((await conferirDossie('objeto-de-prova', { raiz, docs: DOCS })).problemas).toEqual([]);
    const receita = join(raiz, 'procedural/pecas/objeto-de-prova/receita.js');
    writeFileSync(receita, readFileSync(receita, 'utf8').replace('milimetros: 200', 'milimetros: 250'));
    const { problemas } = await conferirDossie('objeto-de-prova', { raiz, docs: DOCS });
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatch(/desatualizado.*rode `npm run dossie -- objeto-de-prova`/);
  });
  it('recusa o dossiê que não existe', async () => {
    const raiz = copia();
    rmSync(dossieDe(raiz, 'objeto-com-partes'));
    expect((await conferirDossie('objeto-com-partes', { raiz, docs: DOCS })).problemas[0]).toMatch(/não existe; rode `npm run dossie -- objeto-com-partes`/);
  });
  it('recusa o dossiê que perdeu a seção à mão', async () => {
    const raiz = copia();
    const arquivo = dossieDe(raiz, 'objeto-de-prova');
    writeFileSync(arquivo, readFileSync(arquivo, 'utf8').replace(/<!-- dossie:a-mao:peca:inicio -->\n[\s\S]*?\n<!-- dossie:a-mao:peca:fim -->/, ''));
    expect((await conferirDossie('objeto-de-prova', { raiz, docs: DOCS })).problemas[0]).toMatch(/perdeu a seção à mão de peca/);
  });
  it('recusa o dossiê desatualizado depois de uma rodada nova ou de um plano novo', async () => {
    const raiz = copia();
    writeFileSync(join(raiz, DOCS, 'planos', '2026-11-25-outro-da-pasta.md'), '# Outro\n\n**Estado:** ativo\n\n**Território:** `procedural/pecas/objeto-de-prova/`.\n');
    expect((await conferirDossie('objeto-de-prova', { raiz, docs: DOCS })).problemas[0]).toMatch(/desatualizado/);
  });
});

describe('o que o dossiê lê além da receita', () => {
  it('mostra faces e segundos nas rodadas que os gravaram e o traço nas antigas', async () => {
    const { texto } = await montarDossie('objeto-de-prova', { raiz: FIXTURE, docs: DOCS });
    expect(texto).toContain('| Rodada | Registrada | Medidas | Faces | Segundos da guarda | Nota | Defeitos | Decisão da pessoa |');
    expect(texto).toContain('| 1 | 2026-11-20 | passou | - | - | 4 | 1 |');
    expect(texto).toContain('| 2 | 2026-11-27 | passou | 1234 | 0.42 (cache: recomeçou do passo 9 de 12) | 4 | 1 | sem decisão gravada |');
    expect(texto).toContain('Segundos da guarda é o tempo da guarda do acervo na rodada, a primeira execução da receita na medição, e não o custo da receita: depende do cache por passo');
  });
  it('sem rodada com faces a tabela não ganha as colunas e o texto diz que nenhuma as gravou', async () => {
    const raiz = copia();
    rmSync(join(raiz, 'procedural/pecas/objeto-de-prova/rodadas/rodada-02.json'));
    const { texto } = await montarDossie('objeto-de-prova', { raiz, docs: DOCS });
    expect(texto).not.toContain('| Faces |');
    expect(texto).not.toContain('Segundos da guarda');
    expect(texto).toContain('nenhuma rodada os gravou');
  });
  it('lê o ATRITOS.md do banco de provas dos planos que cobrem o objeto: itens e os sem destino', async () => {
    const { texto } = await montarDossie('objeto-de-prova', { raiz: FIXTURE, docs: DOCS });
    expect(texto).toContain('atritos: [ATRITOS.md](../../../documentos/modelar/banco-de-provas/estudo-de-prova/ATRITOS.md), 2 item(ns), 1 sem destino');
  });
  it('o plano que só cobre o DOSSIE.md, um teste ou um dado da pasta não cobre a pasta', async () => {
    const raiz = copia();
    const so = ['DOSSIE.md', 'x.test.mjs', 'medida.json'].map((n) => `\`procedural/pecas/objeto-de-prova/${n}\``).join(', ');
    writeFileSync(join(raiz, DOCS, 'planos', '2026-11-25-so-o-dossie.md'), `# So o dossie\n\n**Estado:** ativo\n\n**Território:** ${so}.\n`);
    expect((await montarDossie('objeto-de-prova', { raiz, docs: DOCS })).texto).not.toContain('So o dossie');
    expect((await conferirDossie('objeto-de-prova', { raiz, docs: DOCS })).problemas).toEqual([]);
  });
  it('a crônica casa o nome do objeto como palavra inteira', async () => {
    const raiz = copia();
    const cronica = join(raiz, DOCS, 'decisoes/PLANOS-ENCERRADOS.md');
    writeFileSync(cronica, readFileSync(cronica, 'utf8').replace('\n- `2026-11-11', '\n- `2026-11-12-vizinho.md`: o objeto-de-prova-maior ganhou tampa. O texto está no commit `aaa1111`, em `x`.\n- `2026-11-11'));
    const { texto } = await montarDossie('objeto-de-prova', { raiz, docs: DOCS });
    expect(texto).not.toContain('vizinho');
    expect(texto).toContain('`2026-11-10-caixas-antigas.md`');
  });
  it('recusa o nome de objeto com .. antes de importar qualquer receita', async () => {
    await expect(montarDossie('../../tools', { raiz: FIXTURE, docs: DOCS })).rejects.toThrow(/não é nome de objeto/);
    expect(() => unidadesDoObjeto('a/../b', FIXTURE)).toThrow(/não é nome de objeto/);
  });
});

describe('a seção à mão que a regeração destruiria', () => {
  const duplicar = (raiz) => {
    const arquivo = dossieDe(raiz, 'objeto-de-prova');
    const texto = readFileSync(arquivo, 'utf8');
    appendFileSync(arquivo, '\n<!-- dossie:a-mao:peca:inicio -->\nsegunda seção escrita por outro modelo\n<!-- dossie:a-mao:peca:fim -->\n');
    return texto;
  };
  it('--check recusa a seção repetida e diz qual texto se perderia', async () => {
    const raiz = copia();
    duplicar(raiz);
    expect(Object.keys(secoesRepetidas(readFileSync(dossieDe(raiz, 'objeto-de-prova'), 'utf8')))).toEqual(['peca']);
    const { problemas } = await conferirDossie('objeto-de-prova', { raiz, docs: DOCS });
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatch(/seção à mão de peca 2 vezes.*perderia o texto de "/);
  });
  it('--check recusa a seção de uma unidade que não existe, e gerar não regrava', async () => {
    const raiz = copia();
    const arquivo = dossieDe(raiz, 'objeto-de-prova');
    appendFileSync(arquivo, '\n<!-- dossie:a-mao:fantasma:inicio -->\ntexto órfão\n<!-- dossie:a-mao:fantasma:fim -->\n');
    const antes = readFileSync(arquivo, 'utf8');
    expect((await conferirDossie('objeto-de-prova', { raiz, docs: DOCS })).problemas[0]).toMatch(/seção à mão de fantasma, que não é unidade do objeto/);
    await expect(gerarDossie('objeto-de-prova', { raiz, docs: DOCS })).rejects.toThrow(/nada foi regravado/);
    expect(readFileSync(arquivo, 'utf8')).toBe(antes);
  });
});

describe('o único documento do objeto', () => {
  it('condensa o atrito e a nota de passagem das rodadas, as linhas da tabela de tentativas e o aceite do alinhamento', async () => {
    const { texto } = await montarDossie('objeto-de-prova', { raiz: FIXTURE, docs: DOCS });
    expect(texto).toContain('- rodada 1: nota: a tampa segue grossa; a caixa confere e não precisa mudar | atrito: a espessura da tampa só apareceu na vista lateral, depois de duas execuções');
    expect(texto).not.toContain('- rodada 2: nota');
    expect(texto).toContain('    - a tampa é grossa demais | ensaio: espessura de 4 para 2 mm | resultado: pior: empena | destino: descartada');
    expect(texto).toContain('    - a tampa é fina demais | ensaio: espessura de 2 para 4 mm | resultado: sem empeno | destino: ficou');
    expect(texto).toContain('- alinhamento: aceite registrado: aceito pela pessoa em 2026-11-19, "a caixa é essa". ([ALINHAMENTO.md](ALINHAMENTO.md))');
    expect((await montarDossie('objeto-com-partes', { raiz: FIXTURE, docs: DOCS })).texto).toContain('Sem `ALINHAMENTO.md` na pasta');
  });
  it('condensa o atrito comprido: dois itens de no máximo 110 caracteres e a conta dos outros', async () => {
    const raiz = copia();
    const arquivo = join(raiz, 'procedural/pecas/objeto-de-prova/rodadas/rodada-01.json');
    const rodada = JSON.parse(readFileSync(arquivo, 'utf8'));
    rodada.atrito = ['a'.repeat(300), 'b'.repeat(300), 'c', 'd'];
    writeFileSync(arquivo, JSON.stringify(rodada));
    const { texto } = await montarDossie('objeto-de-prova', { raiz, docs: DOCS });
    const linha = texto.split('\n').find((l) => l.startsWith('- rodada 1: nota'));
    expect(linha).toContain(`atrito: ${'a'.repeat(109)}…; ${'b'.repeat(109)}… (e mais 2)`);
  });
  it('a seção da dívida conhecida é fixa, à mão e preservada; o dossiê que a perdeu é recusado dizendo qual', async () => {
    const raiz = copia();
    expect(secoesAMao(readFileSync(dossieDe(raiz, 'objeto-de-prova'), 'utf8'))['peca.divida']).toContain('tampa de 4 mm: a pessoa aceitou');
    await gerarDossie('objeto-de-prova', { raiz, docs: DOCS });
    expect(secoesAMao(readFileSync(dossieDe(raiz, 'objeto-de-prova'), 'utf8'))['peca.divida']).toContain('tampa de 4 mm: a pessoa aceitou');
    const arquivo = dossieDe(raiz, 'objeto-de-prova');
    writeFileSync(arquivo, readFileSync(arquivo, 'utf8').replace(/<!-- dossie:a-mao:peca\.divida:inicio -->\n[\s\S]*?\n<!-- dossie:a-mao:peca\.divida:fim -->/, ''));
    expect((await conferirDossie('objeto-de-prova', { raiz, docs: DOCS })).problemas[0]).toMatch(/perdeu a seção à mão de peca\.divida/);
    expect(Object.keys(secoesAMao(readFileSync(dossieDe(raiz, 'objeto-com-partes'), 'utf8')))).toEqual(['base', 'base.divida', 'tampa', 'tampa.divida']);
  });
  it('recusa o .md escrito à mão na pasta do objeto, e deixa o DOSSIE.md, o ALINHAMENTO.md da raiz e a referência que o PLANO cita', () => {
    const raiz = copia();
    expect(mdsAMaoNaPastaDoObjeto(raiz)).toEqual([]);
    const pasta = join(raiz, 'procedural/pecas/objeto-com-partes');
    mkdirSync(join(pasta, 'referencias'), { recursive: true });
    mkdirSync(join(pasta, 'partes/base/rodadas'), { recursive: true });
    writeFileSync(join(pasta, 'partes/base/receita.js'), `${readFileSync(join(pasta, 'partes/base/receita.js'), 'utf8')}\nexport const CITA = { referencias: ['../../referencias/citada.${MD}'] };\n`);
    writeFileSync(join(pasta, `referencias/citada.${MD}`), '# citada');
    writeFileSync(join(pasta, `referencias/alvo.${MD}`), '# alvo');
    mkdirSync(join(pasta, 'referencias/frontal.pacote'), { recursive: true });
    writeFileSync(join(pasta, `referencias/frontal.pacote/roteiro.${MD}`), '# roteiro gerado');
    writeFileSync(join(pasta, `ALINHAMENTO.${MD}`), '# alinhamento');
    writeFileSync(join(pasta, `GUIA-DA-CARROCERIA.${MD}`), '# guia à mão');
    writeFileSync(join(pasta, `partes/base/ALINHAMENTO.${MD}`), '# na parte');
    writeFileSync(join(pasta, `partes/base/rodadas/NOTAS.${MD}`), '# notas');
    const achados = mdsAMaoNaPastaDoObjeto(raiz).map((m) => m.arquivo);
    const base = 'procedural/pecas/objeto-com-partes';
    expect(achados).toEqual([`${base}/GUIA-DA-CARROCERIA.${MD}`, `${base}/partes/base/ALINHAMENTO.${MD}`, `${base}/partes/base/rodadas/NOTAS.${MD}`]);
    expect(mdsAMaoNaPastaDoObjeto(raiz)[0].problema).toMatch(/é um documento escrito à mão na pasta do objeto \(o documento do objeto é o DOSSIE\.md \(npm run dossie -- objeto-com-partes\)/);
    const r = spawnSync(process.execPath, [join(AQUI, 'dossie-do-objeto.mjs'), '--todos', '--check', `--raiz=${raiz}`, `--docs=${DOCS}`], { encoding: 'utf8' });
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/GUIA-DA-CARROCERIA\.md é um documento escrito à mão/);
  });
  it('aceita em referencias/ a análise que um módulo da receita cita no texto, e recusa a mesma análise sem a citação', () => {
    const raiz = copia();
    const pasta = join(raiz, 'procedural/pecas/objeto-com-partes');
    mkdirSync(join(pasta, 'referencias'), { recursive: true });
    mkdirSync(join(pasta, 'partes/base/receita'), { recursive: true });
    writeFileSync(join(pasta, `referencias/luzes.${MD}`), '# análise das luzes');
    expect(mdsAMaoNaPastaDoObjeto(raiz).map((m) => m.arquivo)).toEqual([`procedural/pecas/objeto-com-partes/referencias/luzes.${MD}`]);
    writeFileSync(join(pasta, 'partes/base/receita/luzes.js'), `/* as luzes, pela análise em \`referencias/luzes.${MD}\` */\nexport const X = 1;\n`);
    expect(mdsAMaoNaPastaDoObjeto(raiz)).toEqual([]);
  });
  it('recusa o DOSSIE.md escrito à mão fora da raiz do objeto e de partes/<parte>/, e o .MD, .markdown e .txt em qualquer subpasta, referencias/ inclusive', () => {
    const raiz = copia();
    const pasta = join(raiz, 'procedural/pecas/objeto-com-partes');
    const grava = (rel) => { mkdirSync(dirname(join(pasta, rel)), { recursive: true }); writeFileSync(join(pasta, rel), 'x'); return `procedural/pecas/objeto-com-partes/${rel}`; };
    const esperados = [
      grava(`rodadas/DOSSIE.${MD}`), grava(`referencias/DOSSIE.${MD}`), grava(`partes/base/rodadas/DOSSIE.${MD}`), grava(`partes/base/x/DOSSIE.${MD}`),
      grava('referencias/nota.MD'), grava('referencias/leia.markdown'), grava('referencias/leia.txt'), grava(`referencias/uncited.${MD}`), grava(`referencias/outro.pacote/guia.${MD}`),
      grava('partes/tampa/GUIA.Markdown'), grava('NOTAS.TXT'), grava(`dossie.${MD}`),
    ].sort();
    const achados = mdsAMaoNaPastaDoObjeto(raiz).map((m) => m.arquivo).sort();
    expect(achados).toEqual(esperados);
    const doDossie = mdsAMaoNaPastaDoObjeto(raiz).find((m) => m.arquivo.endsWith(`rodadas/DOSSIE.${MD}`) && m.arquivo.includes('partes'));
    expect(doDossie.problema).toMatch(/só vale na raiz do objeto e em partes\/<parte>\//);
    const ref = mdsAMaoNaPastaDoObjeto(raiz).find((m) => m.arquivo.endsWith('referencias/leia.txt'));
    expect(ref.problema).toMatch(/PLANO\.referencias da receita cita/);
  });
});

describe('o objeto que o envio mudou', () => {
  const git = (r, ...a) => execFileSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', ...a], { cwd: r, encoding: 'utf8' });
  const gravar = (raiz, nome, texto) => { mkdirSync(join(raiz, nome, '..'), { recursive: true }); writeFileSync(join(raiz, nome), texto); };
  const repositorio = () => {
    const raiz = copia();
    git(raiz, 'init', '-q'); git(raiz, 'add', '.'); git(raiz, 'commit', '-qm', 'base'); git(raiz, 'update-ref', 'refs/remotes/origin/main', 'HEAD');
    return raiz;
  };
  const rodar = (raiz) => spawnSync(process.execPath, [join(AQUI, 'dossie-do-objeto.mjs'), '--todos', '--check', `--raiz=${raiz}`, `--docs=${DOCS}`], { encoding: 'utf8' });

  it('lista o objeto com arquivo mudado, gravado ou não, e não o que só mudou o DOSSIE.md; sem a ref da main, nenhum', () => {
    const raiz = repositorio();
    expect(objetosMudadosNoEnvio(raiz)).toEqual([]);
    writeFileSync(dossieDe(raiz, 'objeto-com-partes'), `${readFileSync(dossieDe(raiz, 'objeto-com-partes'), 'utf8')}\n`);
    expect(objetosMudadosNoEnvio(raiz)).toEqual([]);
    appendFileSync(join(raiz, 'procedural/pecas/objeto-de-prova/receita.js'), '\n// mudou\n');
    gravar(raiz, 'procedural/pecas/novo-objeto/receita.js', 'export default {};\n');
    expect(objetosMudadosNoEnvio(raiz)).toEqual(['novo-objeto', 'objeto-de-prova']);
    git(raiz, 'update-ref', '-d', 'refs/remotes/origin/main');
    expect(objetosMudadosNoEnvio(raiz)).toEqual([]);
  });
  it('o gate recusa o objeto mudado sem DOSSIE.md e o mudado com o dossiê desatualizado, e passa o que está em dia', () => {
    const raiz = repositorio();
    expect(rodar(raiz).status).toBe(0);
    gravar(raiz, 'procedural/pecas/novo-objeto/receita.js', readFileSync(join(raiz, 'procedural/pecas/objeto-de-prova/receita.js'), 'utf8'));
    const semDossie = rodar(raiz);
    expect(semDossie.status).toBe(1);
    expect(semDossie.stderr).toMatch(/procedural\/pecas\/novo-objeto\/ mudou neste envio e não tem DOSSIE\.md; rode `npm run dossie -- novo-objeto`/);
    execFileSync(process.execPath, [join(AQUI, 'dossie-do-objeto.mjs'), 'novo-objeto', `--raiz=${raiz}`, `--docs=${DOCS}`]);
    /* o dossiê do objeto que o envio mudou não fica com as seções à mão no modelo */
    const aEscrever = rodar(raiz);
    expect(aEscrever.status).toBe(1);
    expect(aEscrever.stderr).toMatch(/novo-objeto\/DOSSIE\.md deixou a seção à mão de escolhas de técnica de peca em "a escrever", e o objeto novo-objeto mudou neste envio/);
    expect(aEscrever.stderr).toMatch(/deixou a seção à mão de dívida conhecida de peca em "a escrever"/);
    const arquivoNovo = dossieDe(raiz, 'novo-objeto');
    writeFileSync(arquivoNovo, readFileSync(arquivoNovo, 'utf8').replaceAll('- a escrever', '- escolha: porque (rodada 1)'));
    expect(rodar(raiz).status).toBe(0);
    appendFileSync(join(raiz, 'procedural/pecas/objeto-de-prova/receita.js'), '\n// mudou\n');
    writeFileSync(join(raiz, 'procedural/pecas/objeto-de-prova/receita.js'), readFileSync(join(raiz, 'procedural/pecas/objeto-de-prova/receita.js'), 'utf8').replace('milimetros: 200', 'milimetros: 250'));
    expect(rodar(raiz).stderr).toMatch(/objeto-de-prova\/DOSSIE\.md está desatualizado/);
  });
});

describe('o objeto que só tem o dossiê de uma parte', () => {
  const git = (r, ...a) => execFileSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', ...a], { cwd: r, encoding: 'utf8' });
  const rodar = (raiz) => spawnSync(process.execPath, [join(AQUI, 'dossie-do-objeto.mjs'), '--todos', '--check', `--raiz=${raiz}`, `--docs=${DOCS}`], { encoding: 'utf8' });
  it('cobra o dossiê da parte que mudou, e o da raiz só quando mudou arquivo fora de partes/; regerar o dossiê da parte não conta como mudança', () => {
    const raiz = copia();
    rmSync(dossieDe(raiz, 'objeto-com-partes'));
    execFileSync(process.execPath, [join(AQUI, 'dossie-do-objeto.mjs'), 'objeto-com-partes/tampa', `--raiz=${raiz}`, `--docs=${DOCS}`]);
    const arquivoTampa = join(raiz, 'procedural/pecas/objeto-com-partes/partes/tampa', `DOSSIE.${MD}`);
    writeFileSync(arquivoTampa, readFileSync(arquivoTampa, 'utf8').replaceAll('- a escrever', '- escolha: porque (rodada 1)'));
    git(raiz, 'init', '-q'); git(raiz, 'add', '.'); git(raiz, 'commit', '-qm', 'base'); git(raiz, 'update-ref', 'refs/remotes/origin/main', 'HEAD');
    expect(objetosComDossie(raiz)).toContain('objeto-com-partes/tampa');
    expect(objetosComDossie(raiz)).not.toContain('objeto-com-partes');
    appendFileSync(arquivoTampa, '\n');
    expect(objetosMudadosNoEnvio(raiz)).toEqual([]);
    git(raiz, 'checkout', '-q', '--', '.');
    appendFileSync(join(raiz, 'procedural/pecas/objeto-com-partes/partes/base/receita.js'), '\n// mudou\n');
    const daBase = rodar(raiz);
    expect(daBase.stderr).toMatch(/procedural\/pecas\/objeto-com-partes\/base\/ mudou neste envio e não tem DOSSIE\.md/);
    expect(daBase.stderr).not.toMatch(/objeto-com-partes\/ mudou/);
    git(raiz, 'checkout', '-q', '--', '.');
    appendFileSync(join(raiz, 'procedural/pecas/objeto-com-partes/partes/tampa/receita.js'), '\n// mudou\n');
    expect(rodar(raiz).stderr).not.toMatch(/mudou neste envio e não tem/);
    mkdirSync(join(raiz, 'procedural/pecas/objeto-com-partes/referencias'), { recursive: true });
    writeFileSync(join(raiz, 'procedural/pecas/objeto-com-partes/andaime.json'), '{}');
    expect(rodar(raiz).stderr).toMatch(/objeto-com-partes\/ mudou neste envio e não tem DOSSIE\.md na raiz \(só as partes tampa o têm\)/);
  });
});

describe('a falha de um dossiê em --todos', () => {
  it('diz quais foram regravados e quais não, sem dizer que nada foi regravado', () => {
    const raiz = copia();
    const arquivo = dossieDe(raiz, 'objeto-de-prova');
    appendFileSync(arquivo, '\n<!-- dossie:a-mao:peca:inicio -->\noutra\n<!-- dossie:a-mao:peca:fim -->\n');
    const r = spawnSync(process.execPath, [join(AQUI, 'dossie-do-objeto.mjs'), '--todos', `--raiz=${raiz}`, `--docs=${DOCS}`], { encoding: 'utf8' });
    expect(r.status).toBe(1);
    expect(r.stdout).toMatch(/dossie ok — .*objeto-com-partes\/DOSSIE\.md gerado/);
    expect(r.stderr).toMatch(/dossie FALHOU — regravados: objeto-com-partes; não regravados \(e por quê\): objeto-de-prova: /);
  });
});

describe('--todos', () => {
  const rodar = (...args) => spawnSync(process.execPath, [join(AQUI, 'dossie-do-objeto.mjs'), ...args], { encoding: 'utf8' });
  it('acha todo DOSSIE.md da pasta das peças, o da parte também', () => {
    expect(objetosComDossie(FIXTURE)).toEqual(['objeto-com-partes', 'objeto-de-prova']);
  });
  it('confere todos de uma vez e recusa o que está desatualizado, dizendo qual', () => {
    const raiz = copia();
    expect(rodar('--todos', '--check', `--raiz=${raiz}`, `--docs=${DOCS}`).status).toBe(0);
    writeFileSync(dossieDe(raiz, 'objeto-com-partes'), 'qualquer coisa');
    const r = rodar('--todos', '--check', `--raiz=${raiz}`, `--docs=${DOCS}`);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/dossie:check FALHOU.*objeto-com-partes/);
  });
  it('sem --check regera todos e recusa objeto junto', () => {
    const raiz = copia();
    writeFileSync(dossieDe(raiz, 'objeto-com-partes'), 'qualquer coisa');
    expect(rodar('--todos', `--raiz=${raiz}`, `--docs=${DOCS}`).status).toBe(0);
    expect(rodar('--todos', '--check', `--raiz=${raiz}`, `--docs=${DOCS}`).status).toBe(0);
    expect(rodar('--todos', 'objeto-de-prova').status).toBe(1);
  });
});

describe('a linha de comando', () => {
  const rodar = (...args) => spawnSync(process.execPath, [join(AQUI, 'dossie-do-objeto.mjs'), ...args], { encoding: 'utf8' });
  it('responde a --ajuda, recusa opção sem = desconhecida e gera e confere pela fixture', () => {
    expect(rodar('--ajuda').stdout).toMatch(/npm run dossie -- <objeto>/);
    const ruim = rodar('x', '--raiz', 'a');
    expect(ruim.status).toBe(1);
    expect(ruim.stderr).toMatch(/opção desconhecida: --raiz/);
    const raiz = copia();
    expect(rodar('objeto-de-prova', `--raiz=${raiz}`, `--docs=${DOCS}`, '--check').status).toBe(0);
    writeFileSync(dossieDe(raiz, 'objeto-de-prova'), 'qualquer coisa');
    const r = rodar('objeto-de-prova', `--raiz=${raiz}`, `--docs=${DOCS}`, '--check');
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/dossie:check FALHOU/);
  });
  it('lerArgumentos aceita --raiz com igual', () => {
    expect(lerArgumentos(['a', '--check', '--raiz=/x']).raiz).toBe('/x');
  });
});
