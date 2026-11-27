/* registro-de-ferramentas.test.mjs — a conferência do registro de ferramentas recusa nos dois sentidos, e a árvore de hoje passa. */
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { GATES } from '../gates.mjs';
import { GERADOS } from './territorio-do-envio.mjs';
import {
  LEIAME, REGISTRO, ROTEIROS, TETO_DE_LUGARES, atualizarRegistro, chamadores, comandosPorArquivo, conferirRegistro, ehLinhaDeComando, ehModuloDeFerramenta,
  fraseDoCabecalho, gatesDoTexto, gerarLeiame, lerArvore, lerRegistro, lugarDeUso, modulosVivos, ondeAparece, resumoDosChamadores, semComentarios, serializarRegistro,
} from './registro-de-ferramentas.mjs';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CLI = '#!/usr/bin/env node\n/* medir.mjs — mede a peça e imprime o desvio. */\nif (process.argv[1]) console.log(1);\n';

/* Uma árvore pequena e em dia: uma ferramenta com comando, que um guia de uso cita, uma biblioteca que ela importa e um apoio de
   teste declarado. */
/* Os caminhos de documento de mentira saem montados por partes, para o gate de links não os tomar por citação quebrada. */
const doc = (...partes) => ['docs', 'modelar', ...partes].join('/');
const GUIA = doc('usar', 'MEDIR.md');
function arvore(extra = {}) {
  return {
    'package.json': '{}',
    'tools/modelar/medir.mjs': `${CLI}import { soma } from './soma.mjs';\n`,
    'tools/modelar/soma.mjs': 'export const soma = (a, b) => a + b;\n',
    'tools/modelar/apoio.mjs': 'export const apoio = 1;\n',
    'tools/modelar/apoio.test.mjs': "import { apoio } from './apoio.mjs';\n",
    [GUIA]: 'Use `npm run medir -- <peça>` quando precisar do desvio da peça.\n',
    ...extra,
  };
}
const scripts = { medir: 'node tools/modelar/medir.mjs' };
const registroEmDia = () => ({
  ferramentas: [{ arquivo: 'tools/modelar/medir.mjs', comandos: ['medir'], faz: 'Mede a peça e imprime o desvio.', tipo: 'uso', aparece: [GUIA] }],
  apoioDeTeste: [{ arquivo: 'tools/modelar/apoio.mjs' }],
  semChamador: [],
});
const conferir = (arquivos, registro = registroEmDia(), mais = {}) => conferirRegistro({ arquivos, scripts, registro, ...mais }).problemas;

describe('o que é ferramenta e o que é linha de comando', () => {
  it('módulo de ferramenta é código de tools/ fora de fixtura, de teste e de declaração de tipo', () => {
    expect(ehModuloDeFerramenta('tools/modelar/medir.mjs')).toBe(true);
    expect(ehModuloDeFerramenta('tools/blender/regua.py')).toBe(true);
    expect(ehModuloDeFerramenta('tools/modelar/medir.test.mjs')).toBe(false);
    expect(ehModuloDeFerramenta('tools/fixtures/acervo/receita.js')).toBe(false);
    expect(ehModuloDeFerramenta('tools/modelar/fixtures/cubo.js'), 'só tools/fixtures/ isenta').toBe(true);
    expect(ehModuloDeFerramenta('tools/modelar/pngjs.d.ts')).toBe(false);
    for (const ext of ['tsx', 'mts', 'jsx']) expect(ehModuloDeFerramenta(`tools/modelar/tela.${ext}`), ext).toBe(true);
    expect(ehModuloDeFerramenta('src/autoria/medir.js')).toBe(false);
  });

  it('linha de comando tem o cabeçalho de execução ou a guarda com process.argv[1]', () => {
    expect(ehLinhaDeComando('tools/a.mjs', '#!/usr/bin/env node\n')).toBe(true);
    expect(ehLinhaDeComando('tools/a.mjs', 'if (process.argv[1] && x) rodar();\n')).toBe(true);
    expect(ehLinhaDeComando('tools/a.mjs', 'if (import.meta.main) rodar();\n')).toBe(true);
    expect(ehLinhaDeComando('tools/a.mjs', 'const [modulo] = process.argv.slice(2);\n')).toBe(true);
    expect(ehLinhaDeComando('tools/a.mjs', '/* quem chama lê process.argv[1] */\nexport const a = 1;\n'), 'no comentário não conta').toBe(false);
    expect(ehLinhaDeComando('tools/a.mjs', 'export const a = process.argv.length;\n')).toBe(false);
    expect(ehLinhaDeComando('tools/ci/juntar.sh', 'set -e\n')).toBe(true);
    expect(ehLinhaDeComando('tools/blender/comum.py', 'import bpy\n')).toBe(false);
    expect(ehLinhaDeComando('tools/blender/regua.py', 'if __name__ == "__main__":\n    main()\n')).toBe(true);
  });

  it('os comandos de package.json saem por arquivo, em ordem', () => {
    expect(comandosPorArquivo({ b: 'node tools/x.mjs --check', a: 'node tools/x.mjs', c: 'vite build' })).toEqual({ 'tools/x.mjs': ['a', 'b'] });
  });
});

describe('quem chama cada módulo', () => {
  it('import relativo, comando, CI, skill, configuração e teste entram cada um na sua lista', () => {
    const quem = chamadores(arvore({
      '.github/workflows/ci.yml': 'run: bash tools/ci/juntar.sh\n',
      'tools/ci/juntar.sh': 'echo\n',
      '.claude/skills/medir/SKILL.md': 'Rode `node tools/modelar/soma.mjs`.\n',
      '.mcp.json': '{"args":["tools/modelar/apoio.mjs"]}',
    }), scripts);
    expect(quem['tools/modelar/medir.mjs'].comando).toEqual(['medir']);
    expect(quem['tools/modelar/soma.mjs'].importa).toEqual(['tools/modelar/medir.mjs']);
    expect(quem['tools/modelar/soma.mjs'].skill).toEqual(['.claude/skills/medir/SKILL.md']);
    expect(quem['tools/ci/juntar.sh'].ci).toEqual(['.github/workflows/ci.yml']);
    expect(quem['tools/modelar/apoio.mjs'].config).toEqual(['.mcp.json']);
    expect(quem['tools/modelar/apoio.mjs'].teste).toEqual(['tools/modelar/apoio.test.mjs']);
  });

  it('o nome solto num join é citação, e o import sem extensão do TypeScript é import', () => {
    const quem = chamadores({
      'tools/gates.mjs': "spawn('node', [join(RAIZ, 'tools', 'modelar', 'filho.mjs')]);\n",
      'tools/modelar/filho.mjs': 'export {};\n',
      'tools/oficina/malha.ts': 'export {};\n',
      'tools/oficina/usa.mts': "import { x } from './malha';\n",
      'procedural/nucleo/a.test.ts': "import { x } from '../../tools/oficina/malha';\n",
    });
    expect(quem['tools/modelar/filho.mjs'].cita).toEqual(['tools/gates.mjs']);
    expect(quem['tools/modelar/filho.mjs'].importa).toEqual([]);
    expect(quem['tools/oficina/malha.ts'].importa).toEqual(['tools/oficina/usa.mts']);
    expect(quem['tools/oficina/malha.ts'].teste).toEqual(['procedural/nucleo/a.test.ts']);
  });

  it('o import relativo de fora de tools/ não revive o módulo de mesmo nome em tools/', () => {
    const quem = chamadores({
      'src/a/b.js': "import { util } from './util.js';\nconst outro = 'x/util.js';\nconst solto = 'util.js';\n",
      'src/a/util.js': 'export const util = 1;\n',
      'tools/x/util.js': 'export const util = 2;\n',
    });
    expect(quem['tools/x/util.js']).toMatchObject({ importa: [], cita: [] });
    expect(modulosVivos(quem).size).toBe(0);
  });

  it('o caminho no meio de uma mensagem não é chamada; a string que é só o caminho, sim', () => {
    const arquivos = {
      'tools/modelar/alvo.mjs': 'export {};\n',
      'tools/modelar/lanca.mjs': "spawnSync('node', ['tools/modelar/alvo.mjs']);\n",
      'tools/modelar/avisa.mjs': "const COMO = 'gere com `node tools/modelar/alvo.mjs <receita>`';\nconst m = `rode ${'x'} tools/modelar/alvo.mjs`;\n",
    };
    const quem = chamadores(arquivos);
    expect(quem['tools/modelar/alvo.mjs'].cita).toEqual(['tools/modelar/lanca.mjs']);
    expect(resumoDosChamadores(quem['tools/modelar/alvo.mjs'])).toBe('cita tools/modelar/lanca.mjs');
    delete arquivos['tools/modelar/lanca.mjs'];
    expect(chamadores(arquivos)['tools/modelar/alvo.mjs']).toMatchObject({ importa: [], cita: [] });
  });

  it('o relatório separa quem importa de quem cita', () => {
    const quem = chamadores({
      'tools/modelar/alvo.mjs': 'export {};\n',
      'tools/modelar/a.mjs': "import './alvo.mjs';\n",
      'tools/modelar/b.mjs': "const filho = new URL('./alvo.mjs', import.meta.url);\n",
    });
    expect(resumoDosChamadores(quem['tools/modelar/alvo.mjs'])).toBe('importa tools/modelar/a.mjs; cita tools/modelar/b.mjs');
  });

  it('citar no comentário não chama ninguém, e a abertura de comentário dentro de aspas não é comentário', () => {
    expect(semComentarios("/* veja './soma.mjs' */\nconst a = 1; // './soma.mjs'\nconst u = 'https://x';\n")).not.toContain('soma');
    expect(semComentarios("const u = 'https://x';\n")).toContain('https://x');
    const texto = semComentarios("const glob = 'tools/**/*.mjs'; import './soma.mjs'; /* fim */ const b = \"a // b\";\n");
    expect(texto).toContain("import './soma.mjs'");
    expect(texto).toContain('a // b');
    expect(texto).not.toContain('fim');
    const quem = chamadores({
      'src/a.js': '/* `tools/modelar/soma.mjs` faz a conta */\n',
      'tools/modelar/b.mjs': "const padrao = 'tools/*.mjs'; import './soma.mjs';\n",
      'tools/modelar/soma.mjs': 'export {};\n',
    });
    expect(quem['tools/modelar/soma.mjs'].importa).toEqual(['tools/modelar/b.mjs']);
  });

  it('um grupo que só se importa entre si não é vivo; o que o código de fora de tools/ importa é', () => {
    const quem = chamadores({
      'tools/modelar/a.mjs': "import './b.mjs';\n",
      'tools/modelar/b.mjs': "import './a.mjs';\n",
      'tools/modelar/c.mjs': 'export {};\n',
      'tools/modelar/d.mjs': 'export {};\n',
      'procedural/pecas/x/receita.js': "import '../../../tools/modelar/c.mjs';\n",
      'tools/modelar/e.mjs': "#!/usr/bin/env node\nimport './d.mjs';\n",
    }, { e: 'node tools/modelar/e.mjs' });
    expect([...modulosVivos(quem)].sort()).toEqual(['tools/modelar/c.mjs', 'tools/modelar/d.mjs', 'tools/modelar/e.mjs']);
  });
});

describe('a conferência do registro', () => {
  it('a árvore em dia passa', () => {
    expect(conferir(arvore())).toEqual([]);
  });

  it('linha de comando sem entrada reprova, dizendo o recebido, o esperado e o conserto', () => {
    const problemas = conferir(arvore({ 'tools/modelar/nova.mjs': `${CLI}import './soma.mjs';\n`, '.claude/skills/x/SKILL.md': 'tools/modelar/nova.mjs' }));
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toContain('tools/modelar/nova.mjs: recebido uma linha de comando (tem a guarda de execução direta) sem entrada');
    expect(problemas[0]).toContain('esperado uma entrada com arquivo, comandos, faz e tipo');
    expect(problemas[0]).toContain('npm run ferramentas:registro:gerar');
  });

  it('o arquivo que só tem comando em package.json também é linha de comando', () => {
    const problemas = conferirRegistro({ arquivos: arvore({ 'tools/modelar/solta.mjs': 'rodar();\n' }), scripts: { ...scripts, solta: 'node tools/modelar/solta.mjs' }, registro: registroEmDia() }).problemas;
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toContain('tem o comando `solta` de package.json');
  });

  it('entrada sem arquivo reprova', () => {
    const registro = registroEmDia();
    registro.ferramentas.push({ arquivo: 'tools/modelar/sumiu.mjs', comandos: [], faz: 'Fazia alguma coisa útil.', tipo: 'uso' });
    const problemas = conferir(arvore(), registro);
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toContain('recebido a entrada tools/modelar/sumiu.mjs, e esse arquivo não existe');
    expect(problemas[0]).toContain('apague a entrada ou corrija o caminho');
  });

  it('entrada de arquivo que não é linha de comando, sem frase, com tipo errado ou com comando velho reprova', () => {
    const registro = registroEmDia();
    registro.ferramentas[0] = { arquivo: 'tools/modelar/medir.mjs', comandos: ['antigo'], faz: 'mede', tipo: 'outro' };
    registro.ferramentas.push({ arquivo: 'tools/modelar/soma.mjs', comandos: [], faz: 'Soma dois números.', tipo: 'interna' });
    const problemas = conferir(arvore(), registro).join('\n');
    expect(problemas).toContain('recebido `faz` "mede" em tools/modelar/medir.mjs');
    expect(problemas).toContain('recebido o tipo "outro" em tools/modelar/medir.mjs; esperado um de uso, gate, interna');
    expect(problemas).toContain('recebido os comandos [antigo] em tools/modelar/medir.mjs; esperado [medir]');
    expect(problemas).toContain('recebido a entrada tools/modelar/soma.mjs, que não é linha de comando');
  });

  it('tipo gate pede um comando da bateria ou o campo gatePor', () => {
    const registro = registroEmDia();
    registro.ferramentas[0].tipo = 'gate';
    delete registro.ferramentas[0].aparece;
    expect(conferir(arvore(), registro, { gates: ['outro:check'] })[0]).toContain('nenhum comando dele está na lista GATES');
    expect(conferir(arvore(), registro, { gates: ['medir'] })).toEqual([]);
    registro.ferramentas[0].gatePor = 'bancada:guardas';
    expect(conferir(arvore(), registro, { gates: ['outro:check'] })).toEqual([]);
  });

  it('módulo que nada chama reprova, e o que só teste alcança reprova enquanto não for declarado; a recusa traz a linha a escrever', () => {
    const registro = registroEmDia();
    registro.apoioDeTeste = [];
    const problemas = conferir(arvore({ 'tools/modelar/orfao.mjs': 'export {};\n' }), registro);
    expect(problemas).toHaveLength(2);
    expect(problemas[0]).toContain('tools/modelar/apoio.mjs: recebido um módulo que só teste alcança (tools/modelar/apoio.test.mjs)');
    expect(problemas[0]).toContain('escreva em `apoioDeTeste` de tools/registro-de-ferramentas.json a linha {"arquivo":"tools/modelar/apoio.mjs"}');
    expect(problemas[1]).toContain('tools/modelar/orfao.mjs: recebido um módulo que nada chama');
    expect(problemas[1]).toContain('a linha {"arquivo":"tools/modelar/orfao.mjs","motivo":"<por que fica>"}');
    expect(problemas[1]).toContain('"motivo":"carregado por caminho calculado","por":"<o carregador>"');
    for (const p of problemas) {
      expect(p).toContain('esperado um comando de package.json, um import de ferramenta viva, uma skill ou uma configuração');
      expect(p).toContain('--chamadores=tools/modelar/');
    }
  });

  it('o arquivo não rastreado entra na conferência, e a recusa diz que ele não é rastreado', () => {
    const arquivos = arvore({ 'tools/modelar/nova.mjs': CLI });
    const problemas = conferir(arquivos, registroEmDia(), { naoRastreados: new Set(['tools/modelar/nova.mjs']) });
    expect(problemas).toHaveLength(2);
    for (const p of problemas) expect(p).toContain('tools/modelar/nova.mjs (arquivo não rastreado: o CI não o vê; rode `git add tools/modelar/nova.mjs` ou apague-o)');
  });

  it('apoio de teste que nenhum teste importa reprova, e o campo por com o teste que o carrega resolve', () => {
    const arquivos = arvore({ 'tools/modelar/dado.mjs': 'export {};\n', 'tools/modelar/carrega.test.mjs': 'const nome = "dado"; await import(`./${nome}.mjs`);\n' });
    const registro = registroEmDia();
    registro.apoioDeTeste.push({ arquivo: 'tools/modelar/dado.mjs' });
    expect(conferir(arquivos, registro)[0]).toContain('recebido tools/modelar/dado.mjs em `apoioDeTeste`, e nenhum teste o importa nem o cita');
    registro.apoioDeTeste[1].por = 'tools/modelar/medir.mjs';
    expect(conferir(arquivos, registro)[0]).toContain('esperado o arquivo de teste, existente, que carrega o apoio por caminho calculado');
    registro.apoioDeTeste[1].por = 'tools/modelar/carrega.test.mjs';
    expect(conferir(arquivos, registro)).toEqual([]);
  });

  it('a declaração por pasta lista os arquivos: arquivo novo na pasta reprova até o gerador refazer a lista', () => {
    const registro = registroEmDia();
    registro.semChamador.push({ pasta: 'tools/blender/', motivo: 'opcionais, rodadas à mão', arquivos: ['tools/blender/comum.py'] });
    const arquivos = arvore({ 'tools/blender/comum.py': 'import bpy\n' });
    expect(conferir(arquivos, registro)).toEqual([]);
    arquivos['tools/blender/novo.py'] = 'import bpy\n';
    const problemas = conferir(arquivos, registro);
    expect(problemas).toHaveLength(2);
    expect(problemas[0]).toContain('tools/blender/novo.py: recebido um módulo novo na pasta tools/blender/');
    expect(problemas[0]).toContain('npm run ferramentas:registro:gerar');
    expect(problemas[1]).toContain('lista `arquivos` fora de dia (faltam tools/blender/novo.py)');
    const novo = atualizarRegistro({ arquivos, scripts, registro });
    expect(novo.semChamador[0].arquivos).toEqual(['tools/blender/comum.py', 'tools/blender/novo.py']);
    expect(conferir(arquivos, novo)).toEqual([]);
    delete arquivos['tools/blender/comum.py'];
    expect(conferir(arquivos, novo)[0]).toContain('(sobram tools/blender/comum.py)');
  });

  it('com uma pasta declarada dentro da outra, o módulo é da mais funda', () => {
    const registro = registroEmDia();
    registro.apoioDeTeste.push({ pasta: 'tools/modelar/fixtures/', arquivos: [] }, { pasta: 'tools/modelar/fixtures/contatos/', por: 'tools/modelar/apoio.test.mjs', arquivos: [] });
    const arquivos = arvore({
      'tools/modelar/fixtures/cubo.js': 'export {};\n',
      'tools/modelar/fixtures/base.js': 'export {};\n',
      'tools/modelar/fixtures/contatos/a.js': 'export {};\n',
      'tools/modelar/cubo.test.mjs': "import './fixtures/cubo.js';\n",
    });
    arquivos['tools/modelar/fixtures/cubo.js'] = "import './base.js';\n";
    const novo = atualizarRegistro({ arquivos, scripts, registro });
    expect(novo.apoioDeTeste[1].arquivos).toEqual(['tools/modelar/fixtures/base.js', 'tools/modelar/fixtures/cubo.js']);
    expect(novo.apoioDeTeste[2].arquivos).toEqual(['tools/modelar/fixtures/contatos/a.js']);
    expect(conferir(arquivos, novo), 'o apoio que só outro apoio da pasta importa vale').toEqual([]);
  });

  it('o carregado por caminho calculado declara o carregador vivo em por, e o que ele importa passa a viver', () => {
    const arquivos = arvore({
      'tools/modelar/medir.mjs': `${CLI}import { soma } from './soma.mjs';\nconst pagina = 'visor.html';\n`,
      'tools/modelar/visor.js': "import './tela.mjs';\n",
      'tools/modelar/tela.mjs': 'export {};\n',
    });
    const registro = registroEmDia();
    expect(conferir(arquivos, registro)).toHaveLength(2);
    registro.semChamador.push({ arquivo: 'tools/modelar/visor.js', motivo: 'carregado por caminho calculado: a página o carrega', por: 'tools/modelar/medir.mjs' });
    expect(conferir(arquivos, registro)).toEqual([]);
    expect(atualizarRegistro({ arquivos, scripts, registro }).semChamador).toEqual(registro.semChamador);
    registro.semChamador[0].por = 'tools/modelar/apoio.mjs';
    expect(conferir(arquivos, registro).join('\n')).toContain('esperado o caminho de um arquivo vivo (com chamador, e que não é teste) que carrega o módulo por caminho calculado');
    delete registro.semChamador[0].por;
    expect(conferir(arquivos, registro).join('\n')).toContain('recebido o motivo "carregado por caminho calculado" em tools/modelar/visor.js sem o campo `por`');
  });

  it('declaração que sobrou reprova: sem motivo, arquivo que sumiu, módulo que ganhou chamador, pasta sem ninguém', () => {
    const registro = registroEmDia();
    registro.apoioDeTeste = [];
    registro.semChamador = [
      { arquivo: 'tools/modelar/apoio.mjs', motivo: '' },
      { arquivo: 'tools/modelar/sumiu.mjs', motivo: 'apoio de teste' },
      { arquivo: 'tools/modelar/soma.mjs', motivo: 'apoio de teste' },
      { pasta: 'tools/vazia/', motivo: 'opcionais, rodadas à mão', arquivos: [] },
    ];
    const problemas = conferir(arvore(), registro).join('\n');
    expect(problemas).toContain('recebido tools/modelar/apoio.mjs em `semChamador` sem motivo');
    expect(problemas).toContain('recebido tools/modelar/sumiu.mjs em `semChamador`, e esse arquivo não existe');
    expect(problemas).toContain('recebido tools/modelar/soma.mjs em `semChamador`, e ele tem chamador (importa tools/modelar/medir.mjs)');
    expect(problemas).toContain('recebido a pasta tools/vazia/ em `semChamador`, e nenhum módulo sem chamador mora nela');
  });

  it('o registro que não lê como JSON e o registro sem a lista ferramentas reprovam sem estourar', () => {
    const quebrado = lerRegistro('{ "ferramentas": [');
    expect(quebrado.registro).toBeNull();
    expect(quebrado.problema).toContain('recebido um JSON que não lê (');
    expect(quebrado.problema).toContain('esperado um objeto com as listas `ferramentas`, `apoioDeTeste` e `semChamador`');
    expect(quebrado.problema).toContain('npm run ferramentas:registro:gerar');
    expect(lerRegistro('{"semChamador":[]}').problema).toContain('recebido um registro sem a lista `ferramentas` (object com os campos semChamador)');
    expect(lerRegistro('[]').problema).toContain('(uma lista');
    expect(lerRegistro(JSON.stringify(registroEmDia())).problema).toBeNull();
    const problemas = conferir(arvore(), { semChamador: [] });
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toContain('recebido um registro sem a lista `ferramentas`');
    expect(conferir(arvore(), null)[0]).toContain('recebido nenhum arquivo');
  });

  it('o README editado à mão reprova, e o gerado passa', () => {
    const registro = registroEmDia();
    expect(conferir(arvore(), registro, { leiame: gerarLeiame(registro) })).toEqual([]);
    const problemas = conferir(arvore(), registro, { leiame: `${gerarLeiame(registro)}uma linha a mais\n` });
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toContain(`${LEIAME}: recebido um texto diferente do que ${REGISTRO} gera`);
    expect(problemas[0]).toContain('npm run ferramentas:registro:gerar');
  });
});

describe('onde a ferramenta de uso aparece', () => {
  const roteiros = (comandos, passo = 'Meça a peça.') => JSON.stringify({ roteiros: [{ id: 'modelar/medir', comandos, passo, conferido: 'A medida lida.' }] });

  it('skill, agente, guia, contrato, CLAUDE.md de pasta e README de módulo são lugares; plano, pesquisa e banco de provas não', () => {
    expect(lugarDeUso('.claude/skills/medir/SKILL.md')).toBe('skill');
    expect(lugarDeUso('.claude/agents/modelador.md')).toBe('skill');
    expect(lugarDeUso('.claude/REGRAS-DOS-AGENTES.md')).toBe('skill');
    for (const guia of [GUIA, 'docs/modelar/guias/modelar-carroceria.md', 'docs/modelar/contratos/ARQUITETURA.md', 'docs/COMECE-AQUI.md', 'tools/CLAUDE.md', 'CLAUDE.md', 'modulos/textura/README.md']) {
      expect(lugarDeUso(guia), guia).toBe('guia');
    }
    for (const fora of [doc('planos', '2026-11-26-x.md'), doc('pesquisas', 'X.md'), doc('banco-de-provas', 'x', 'README.md'), 'docs/MAPA.md', 'tools/README.md', 'tools/modelar/medir.mjs']) {
      expect(lugarDeUso(fora), fora).toBeNull();
    }
  });

  it('conta o npm run do comando e o caminho do arquivo, com o roteiro primeiro, depois a skill e o guia', () => {
    const arquivos = arvore({
      [ROTEIROS]: roteiros(['npm run medir -- <peça>']),
      '.claude/skills/medir/SKILL.md': 'Rode `node tools/modelar/medir.mjs <peça>`.\n',
      [doc('planos', '2026-11-26-x.md')]: 'O plano cita `npm run medir`.\n',
    });
    expect(ondeAparece(arquivos, registroEmDia().ferramentas)).toEqual({ 'tools/modelar/medir.mjs': ['roteiro modelar/medir', '.claude/skills/medir/SKILL.md', GUIA] });
  });

  it('o comando de nome mais comprido não conta como citação do mais curto, e a ferramenta que não é de uso fica de fora', () => {
    const arquivos = arvore({ [GUIA]: 'Rode `npm run medir:tudo` e `npm run medir-de-novo`; o arquivo é `tools/modelar/medir.mjs.bak`.\n' });
    expect(ondeAparece(arquivos, registroEmDia().ferramentas)).toEqual({ 'tools/modelar/medir.mjs': [] });
    expect(ondeAparece(arvore(), [{ ...registroEmDia().ferramentas[0], tipo: 'interna' }])).toEqual({});
  });

  it('a ferramenta que um plano ativo está criando espera a citação até o plano fechar', () => {
    const plano = (estado) => `# Plano\n\n**Estado:** ${estado}\n\n**Núcleo:** não\n\n**Território:** \`tools/modelar/medir.mjs\`\n`;
    const comPlano = conferir(arvore({ [GUIA]: 'outra coisa\n', [doc('planos', '2026-11-26-x.md')]: plano('ativo') }));
    expect(comPlano.some((p) => p.includes('que nenhum roteiro, skill ou guia cita')), comPlano.join('\n')).toBe(false);
    const [problema] = conferir(arvore({ [GUIA]: 'outra coisa\n', [doc('planos', '2026-11-26-x.md')]: plano('concluído') }));
    expect(problema).toContain('que nenhum roteiro, skill ou guia cita');
  });

  it('a ferramenta de uso que nenhum roteiro, skill ou guia cita reprova, com o recebido, o esperado e o conserto', () => {
    const arquivos = arvore({ [GUIA]: 'Este guia fala de outra coisa.\n' });
    const [problema, ...resto] = conferir(arquivos);
    expect(resto).toEqual([]);
    expect(problema).toContain('recebido a ferramenta de uso tools/modelar/medir.mjs (`npm run medir`), que nenhum roteiro, skill ou guia cita');
    expect(problema).toContain('esperado ao menos uma citação');
    expect(problema).toContain('cite `npm run medir` no lugar onde ela entra no trabalho');
    expect(problema).toContain('troque o `tipo` para "interna"');
  });

  it('nos dois sentidos: citar no roteiro ou marcar como interna resolve', () => {
    const semGuia = { [GUIA]: 'Este guia fala de outra coisa.\n' };
    const citado = registroEmDia();
    citado.ferramentas[0].aparece = ['roteiro modelar/medir'];
    expect(conferir(arvore({ ...semGuia, [ROTEIROS]: roteiros([], 'Rode npm run medir -- <peça> e leia o desvio.') }), citado)).toEqual([]);
    const interna = registroEmDia();
    interna.ferramentas[0].tipo = 'interna';
    delete interna.ferramentas[0].aparece;
    expect(conferir(arvore(semGuia), interna)).toEqual([]);
  });

  it('a ferramenta sem comando é citada pelo caminho, e a recusa dela manda citar o arquivo', () => {
    const registro = registroEmDia();
    registro.ferramentas.push({ arquivo: 'tools/modelar/solta.mjs', comandos: [], faz: 'Mede a peça sem comando.', tipo: 'uso', aparece: [] });
    const arquivos = { 'tools/modelar/solta.mjs': CLI, '.codex/config.toml': 'args = ["tools/modelar/solta.mjs"]\n' };
    expect(conferir(arvore(arquivos), registro).join('\n')).toContain('cite `node tools/modelar/solta.mjs` no lugar onde ela entra no trabalho');
    registro.ferramentas[1].aparece = ['.claude/skills/medir/SKILL.md'];
    expect(conferir(arvore({ ...arquivos, '.claude/skills/medir/SKILL.md': 'Rode `node tools/modelar/solta.mjs <peça>` quando não houver comando.\n' }), registro)).toEqual([]);
  });

  it('a ferramenta de uso declarada em semChamador espera a decisão de lá e não reprova por falta de citação', () => {
    const registro = registroEmDia();
    registro.ferramentas.push({ arquivo: 'tools/modelar/parada.mjs', comandos: [], faz: 'Media uma coisa que ninguém mede mais.', tipo: 'uso', aparece: [] });
    registro.semChamador.push({ arquivo: 'tools/modelar/parada.mjs', motivo: 'espera a decisão da pessoa' });
    expect(conferir(arvore({ 'tools/modelar/parada.mjs': CLI }), registro)).toEqual([]);
  });

  it('o campo aparece fora de dia reprova, guarda só os primeiros lugares, e o gerador o acerta', () => {
    const guias = Object.fromEntries(['A', 'B', 'C', 'D'].map((n) => [doc('guias', `${n}.md`), 'Use `npm run medir`.\n']));
    const arquivos = arvore(guias);
    const [problema] = conferir(arquivos);
    expect(problema).toContain(`recebido \`aparece\` ["${GUIA}"] em tools/modelar/medir.mjs`);
    expect(problema).toContain('rode `npm run ferramentas:registro:gerar`');
    const novo = atualizarRegistro({ arquivos, scripts, registro: registroEmDia() });
    expect(novo.ferramentas[0].aparece).toEqual(['A', 'B', 'C'].map((n) => doc('guias', `${n}.md`)));
    expect(novo.ferramentas[0].aparece).toHaveLength(TETO_DE_LUGARES);
    expect(conferir(arquivos, novo)).toEqual([]);
  });

  it('o campo aparece em ferramenta que não é de uso reprova', () => {
    const registro = registroEmDia();
    registro.ferramentas[0].tipo = 'interna';
    expect(conferir(arvore(), registro)[0]).toContain('recebido o campo `aparece` em tools/modelar/medir.mjs, que é do tipo interna');
  });

  it('o JSON dos roteiros que não lê não cita nada e não estoura', () => {
    expect(ondeAparece(arvore({ [ROTEIROS]: '{ quebrado' }), registroEmDia().ferramentas)).toEqual({ 'tools/modelar/medir.mjs': [GUIA] });
  });
});

describe('o gerador', () => {
  it('a frase semeada vem do cabeçalho, sem o nome do arquivo', () => {
    expect(fraseDoCabecalho(CLI)).toBe('Mede a peça e imprime o desvio.');
    expect(fraseDoCabecalho('export const a = 1;\n')).toBe('');
  });

  it('acrescenta a ferramenta nova, tira a entrada órfã e a declaração que sobrou, e não mexe na frase escrita', () => {
    const registro = registroEmDia();
    registro.ferramentas[0].faz = 'Frase escrita à mão, que fica.';
    registro.ferramentas.push({ arquivo: 'tools/modelar/sumiu.mjs', comandos: [], faz: 'Fazia alguma coisa útil.', tipo: 'uso' });
    registro.semChamador.push({ arquivo: 'tools/modelar/soma.mjs', motivo: 'apoio de teste' });
    registro.apoioDeTeste.push({ arquivo: 'tools/modelar/sumiu.mjs' });
    const novo = atualizarRegistro({ arquivos: arvore({ 'tools/modelar/nova.mjs': CLI.replace('medir.mjs', 'nova.mjs') }), scripts: { ...scripts, nova: 'node tools/modelar/nova.mjs --check' }, registro, gates: ['nova'] });
    expect(novo.ferramentas).toEqual([
      { arquivo: 'tools/modelar/medir.mjs', comandos: ['medir'], faz: 'Frase escrita à mão, que fica.', tipo: 'uso', aparece: [GUIA] },
      { arquivo: 'tools/modelar/nova.mjs', comandos: ['nova'], faz: 'Mede a peça e imprime o desvio.', tipo: 'gate' },
    ]);
    expect(novo.apoioDeTeste).toEqual([{ arquivo: 'tools/modelar/apoio.mjs' }]);
    expect(novo.semChamador).toEqual([]);
    expect(JSON.parse(serializarRegistro(novo))).toEqual(novo);
  });

  it('o registro gravado tem uma entrada por linha e, na pasta, um arquivo por linha', () => {
    const registro = registroEmDia();
    registro.semChamador.push({ pasta: 'tools/blender/', motivo: 'opcionais', arquivos: ['tools/blender/a.py', 'tools/blender/b.py'] });
    const texto = serializarRegistro(registro);
    expect(JSON.parse(texto)).toEqual(registro);
    expect(texto).toContain('    {"pasta":"tools/blender/","motivo":"opcionais","arquivos":[\n      "tools/blender/a.py",\n      "tools/blender/b.py"\n    ]}');
  });

  it('o README traz a tabela das de uso e as listas com um item por linha, sem contagem nos títulos', () => {
    const registro = registroEmDia();
    registro.ferramentas.push({ arquivo: 'tools/mapa/conferir.mjs', comandos: ['x:check'], faz: 'Confere uma coisa do repositório.', tipo: 'gate' });
    registro.ferramentas.push({ arquivo: 'tools/modelar/filho.mjs', comandos: [], faz: 'Processo filho de outra ferramenta.', tipo: 'interna' });
    registro.semChamador.push({ arquivo: 'tools/modelar/visor.js', motivo: 'carregado por caminho calculado', por: 'tools/modelar/medir.mjs' });
    const texto = gerarLeiame(registro);
    expect(texto).toContain('não edite à mão');
    expect(texto).toContain('| `medir` | Mede a peça e imprime o desvio. |');
    expect(texto).toContain('\n- `mapa/conferir.mjs`\n');
    expect(texto).toContain('\n- `modelar/filho.mjs`\n');
    expect(texto).toContain('## Apoio de teste\n');
    expect(texto).toContain('\n- `modelar/apoio.mjs`\n');
    expect(texto).toContain('\n- `modelar/visor.js`: carregado por caminho calculado, por `modelar/medir.mjs`\n');
    for (const titulo of texto.split('\n').filter((l) => l.startsWith('#'))) expect(titulo, titulo).not.toMatch(/\d/);
    registro.ferramentas.push({ arquivo: 'tools/mapa/outra.mjs', comandos: ['y:check'], faz: 'Confere outra coisa do repositório.', tipo: 'gate' });
    const linhasNovas = gerarLeiame(registro).split('\n').filter((l) => !texto.split('\n').includes(l));
    expect(linhasNovas, 'ferramenta nova muda uma linha só').toEqual(['- `mapa/outra.mjs`']);
  });

  it('a lista de gates sai do texto de tools/gates.mjs, sem importar o arquivo', () => {
    expect(gatesDoTexto("export const GATES = [\n  'a', 'b:check',\n  /* 'comentado' */\n  'c',\n];\nexport const GATES_CURTOS = ['z'];\n")).toEqual(['a', 'b:check', 'c']);
    expect(gatesDoTexto(readFileSync(join(REPO, 'tools/gates.mjs'), 'utf8'))).toEqual(GATES);
  });
});

describe('a leitura da árvore', () => {
  it('lê o nome com espaço e acento, e separa o arquivo que o git ainda não rastreia', () => {
    const raiz = mkdtempSync(join(tmpdir(), 'registro-'));
    try {
      const git = (...args) => execFileSync('git', args, { cwd: raiz, encoding: 'utf8' });
      git('init', '-q');
      mkdirSync(join(raiz, 'tools/modelar'), { recursive: true });
      mkdirSync(join(raiz, 'tools/fixtures/x'), { recursive: true });
      writeFileSync(join(raiz, 'tools/modelar/régua de vão.mjs'), 'export {};\n');
      writeFileSync(join(raiz, 'tools/fixtures/x/receita.js'), 'export {};\n');
      git('add', '-A');
      writeFileSync(join(raiz, 'tools/modelar/nova.mjs'), 'export {};\n');
      const { arquivos, naoRastreados } = lerArvore(raiz);
      expect(Object.keys(arquivos).sort()).toEqual(['tools/modelar/nova.mjs', 'tools/modelar/régua de vão.mjs']);
      expect([...naoRastreados]).toEqual(['tools/modelar/nova.mjs']);
    } finally { rmSync(raiz, { recursive: true, force: true }); }
  });
});

describe('o repositório de hoje', () => {
  it('passa na conferência, com o README gerado do registro', () => {
    const { arquivos, naoRastreados } = lerArvore(REPO);
    const { registro, problema } = lerRegistro(readFileSync(join(REPO, REGISTRO), 'utf8'));
    expect(problema).toBeNull();
    const { problemas, linhasDeComando } = conferirRegistro({
      arquivos, naoRastreados, scripts: JSON.parse(arquivos['package.json']).scripts, registro, gates: GATES, leiame: readFileSync(join(REPO, LEIAME), 'utf8'),
    });
    expect(problemas).toEqual([]);
    expect(linhasDeComando.length).toBe(registro.ferramentas.length);
  });

  it('o gerador só importa node:, porque roda no passo de juntar à main antes do npm ci', () => {
    const texto = readFileSync(join(REPO, 'tools/mapa/registro-de-ferramentas.mjs'), 'utf8');
    const importados = [...semComentarios(texto).matchAll(/(?:\bfrom|\bimport)\s*\(?\s*['"]([^'"]+)['"]/g)].map((m) => m[1]);
    expect(importados.length).toBeGreaterThan(0);
    expect(importados.filter((i) => !i.startsWith('node:'))).toEqual([]);
    expect(readFileSync(join(REPO, 'tools/ci/juntar-a-main.sh'), 'utf8')).toMatch(/node tools\/mapa\/registro-de-ferramentas\.mjs --gerar && npm run dossie -- --todos && node tools\/mapa\/mapa\.mjs'/);
  });

  it('o registro e o README gerado são arquivos gerados para o território do envio', () => {
    expect(GERADOS).toEqual(expect.arrayContaining([REGISTRO, LEIAME]));
  });

  it('toda ferramenta de uso aparece em roteiro, skill ou guia, fora as que esperam decisão em semChamador ou apoioDeTeste', () => {
    const { arquivos } = lerArvore(REPO);
    const { registro } = lerRegistro(readFileSync(join(REPO, REGISTRO), 'utf8'));
    expect(arquivos[ROTEIROS], 'a árvore lida traz o JSON dos roteiros').toBeTruthy();
    const lugares = ondeAparece(arquivos, registro.ferramentas);
    const declarados = new Set([...registro.apoioDeTeste, ...registro.semChamador].flatMap((d) => (d.pasta ? d.arquivos : [d.arquivo])));
    /* a ferramenta que um plano ativo está criando espera a citação até ele fechar */
    for (const [caminho, texto] of Object.entries(arquivos)) {
      if (!/^docs\/modelar\/planos\/\d{4}-\d{2}-\d{2}-[^/]+\.md$/.test(caminho) || !/^\*\*Estado:\*\* ativo/m.test(texto)) continue;
      for (const m of (texto.match(/^\*\*Território:\*\*(.*)$/m)?.[1] ?? '').matchAll(/`([^`]+)`/g)) declarados.add(m[1].trim());
    }
    const deUso = registro.ferramentas.filter((e) => e.tipo === 'uso');
    expect(deUso.length).toBeGreaterThan(90);
    expect(deUso.filter((e) => lugares[e.arquivo].length === 0 && !declarados.has(e.arquivo)).map((e) => e.arquivo)).toEqual([]);
    expect(lugares['tools/mapa/pedido-ao-agente.mjs']).toContain('roteiro mudar/plano');
    expect(lugares['tools/modelar/exportar-gltf.mjs']).toContain('docs/modelar/usar/EXPORTACAO.md');
    expect(lugares['tools/modelar/zebra-numerica.mjs']).toContain('docs/modelar/usar/MEDIDAS-AVULSAS.md');
  });

  it('as ferramentas que o processo usa têm comando', () => {
    const scripts = JSON.parse(readFileSync(join(REPO, 'package.json'), 'utf8')).scripts;
    const porArquivo = comandosPorArquivo(scripts);
    for (const nome of ['zebra-numerica', 'distancia-a-pele', 'conferir-pontos', 'rodada-de-modelagem', 'preenchimento-da-rede']) {
      expect(porArquivo[`tools/modelar/${nome}.mjs`], nome).toBeTruthy();
    }
  });
});
