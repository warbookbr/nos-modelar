/* registro-de-ferramentas.test.mjs — a conferência do registro de ferramentas recusa nos dois sentidos, e a árvore de hoje passa. */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { GATES } from '../gates.mjs';
import {
  LEIAME, REGISTRO, atualizarRegistro, chamadores, comandosPorArquivo, conferirRegistro, ehLinhaDeComando, ehModuloDeFerramenta,
  fraseDoCabecalho, gerarLeiame, lerArvore, modulosVivos, semComentarios, serializarRegistro,
} from './registro-de-ferramentas.mjs';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CLI = '#!/usr/bin/env node\n/* medir.mjs — mede a peça e imprime o desvio. */\nif (process.argv[1]) console.log(1);\n';

/* Uma árvore pequena e em dia: uma ferramenta com comando, uma biblioteca que ela importa e um apoio de teste declarado. */
function arvore(extra = {}) {
  return {
    'package.json': '{}',
    'tools/modelar/medir.mjs': `${CLI}import { soma } from './soma.mjs';\n`,
    'tools/modelar/soma.mjs': 'export const soma = (a, b) => a + b;\n',
    'tools/modelar/apoio.mjs': 'export const apoio = 1;\n',
    'tools/modelar/apoio.test.mjs': "import { apoio } from './apoio.mjs';\n",
    ...extra,
  };
}
const scripts = { medir: 'node tools/modelar/medir.mjs' };
const registroEmDia = () => ({
  ferramentas: [{ arquivo: 'tools/modelar/medir.mjs', comandos: ['medir'], faz: 'Mede a peça e imprime o desvio.', tipo: 'uso' }],
  semChamador: [{ arquivo: 'tools/modelar/apoio.mjs', motivo: 'apoio de teste' }],
});
const conferir = (arquivos, registro = registroEmDia(), mais = {}) => conferirRegistro({ arquivos, scripts, registro, ...mais }).problemas;

describe('o que é ferramenta e o que é linha de comando', () => {
  it('módulo de ferramenta é código de tools/ fora de fixtura, de teste e de declaração de tipo', () => {
    expect(ehModuloDeFerramenta('tools/modelar/medir.mjs')).toBe(true);
    expect(ehModuloDeFerramenta('tools/blender/regua.py')).toBe(true);
    expect(ehModuloDeFerramenta('tools/modelar/medir.test.mjs')).toBe(false);
    expect(ehModuloDeFerramenta('tools/fixtures/acervo/receita.js')).toBe(false);
    expect(ehModuloDeFerramenta('tools/modelar/fixtures/cubo.js')).toBe(false);
    expect(ehModuloDeFerramenta('tools/modelar/pngjs.d.ts')).toBe(false);
    expect(ehModuloDeFerramenta('src/autoria/medir.js')).toBe(false);
  });

  it('linha de comando tem o cabeçalho de execução ou a guarda com process.argv[1]', () => {
    expect(ehLinhaDeComando('tools/a.mjs', '#!/usr/bin/env node\n')).toBe(true);
    expect(ehLinhaDeComando('tools/a.mjs', 'if (process.argv[1] && x) rodar();\n')).toBe(true);
    expect(ehLinhaDeComando('tools/a.mjs', 'export const a = process.argv.slice(2);\n')).toBe(false);
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

  it('o nome solto num join e o import sem extensão do TypeScript também contam', () => {
    const quem = chamadores({
      'tools/gates.mjs': "spawn('node', [join(RAIZ, 'tools', 'modelar', 'filho.mjs')]);\n",
      'tools/modelar/filho.mjs': 'export {};\n',
      'tools/oficina/malha.ts': 'export {};\n',
      'procedural/nucleo/a.test.ts': "import { x } from '../../tools/oficina/malha';\n",
    });
    expect(quem['tools/modelar/filho.mjs'].importa).toEqual(['tools/gates.mjs']);
    expect(quem['tools/oficina/malha.ts'].teste).toEqual(['procedural/nucleo/a.test.ts']);
  });

  it('citar no comentário não chama ninguém', () => {
    expect(semComentarios("/* veja './soma.mjs' */\nconst a = 1; // './soma.mjs'\nconst u = 'https://x';\n")).not.toContain('soma');
    const quem = chamadores({ 'src/a.js': '/* `tools/modelar/soma.mjs` faz a conta */\n', 'tools/modelar/soma.mjs': 'export {};\n' });
    expect(quem['tools/modelar/soma.mjs'].importa).toEqual([]);
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
    expect(conferir(arvore(), registro, { gates: ['outro:check'] })[0]).toContain('nenhum comando dele está na lista GATES');
    expect(conferir(arvore(), registro, { gates: ['medir'] })).toEqual([]);
    registro.ferramentas[0].gatePor = 'bancada:guardas';
    expect(conferir(arvore(), registro, { gates: ['outro:check'] })).toEqual([]);
  });

  it('módulo que nada chama reprova, e o que só teste alcança reprova enquanto não for declarado', () => {
    const registro = registroEmDia();
    registro.semChamador = [];
    const problemas = conferir(arvore({ 'tools/modelar/orfao.mjs': 'export {};\n' }), registro);
    expect(problemas).toHaveLength(2);
    expect(problemas[0]).toContain('tools/modelar/apoio.mjs: recebido um módulo que só teste alcança (tools/modelar/apoio.test.mjs)');
    expect(problemas[1]).toContain('tools/modelar/orfao.mjs: recebido um módulo que nada chama');
    for (const p of problemas) {
      expect(p).toContain('esperado um comando de package.json, um import de ferramenta viva, uma skill ou uma configuração');
      expect(p).toContain('declare-o em `semChamador`');
      expect(p).toContain('--chamadores=tools/modelar/');
    }
  });

  it('a declaração por pasta cobre os módulos dela', () => {
    const registro = registroEmDia();
    registro.semChamador.push({ pasta: 'tools/blender/', motivo: 'opcionais, rodadas à mão' });
    expect(conferir(arvore({ 'tools/blender/comum.py': 'import bpy\n' }), registro)).toEqual([]);
  });

  it('declaração que sobrou reprova: sem motivo, arquivo que sumiu, módulo que ganhou chamador, pasta sem ninguém', () => {
    const registro = registroEmDia();
    registro.semChamador = [
      { arquivo: 'tools/modelar/apoio.mjs', motivo: '' },
      { arquivo: 'tools/modelar/sumiu.mjs', motivo: 'apoio de teste' },
      { arquivo: 'tools/modelar/soma.mjs', motivo: 'apoio de teste' },
      { pasta: 'tools/vazia/', motivo: 'opcionais, rodadas à mão' },
    ];
    const problemas = conferir(arvore(), registro).join('\n');
    expect(problemas).toContain('recebido tools/modelar/apoio.mjs em `semChamador` sem motivo');
    expect(problemas).toContain('recebido tools/modelar/sumiu.mjs em `semChamador`, e esse arquivo não existe');
    expect(problemas).toContain('recebido tools/modelar/soma.mjs em `semChamador`, e ele tem chamador (import tools/modelar/medir.mjs)');
    expect(problemas).toContain('recebido a pasta tools/vazia/ em `semChamador`, e nenhum módulo sem chamador mora nela');
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
    const novo = atualizarRegistro({ arquivos: arvore({ 'tools/modelar/nova.mjs': CLI.replace('medir.mjs', 'nova.mjs') }), scripts: { ...scripts, nova: 'node tools/modelar/nova.mjs --check' }, registro, gates: ['nova'] });
    expect(novo.ferramentas).toEqual([
      { arquivo: 'tools/modelar/medir.mjs', comandos: ['medir'], faz: 'Frase escrita à mão, que fica.', tipo: 'uso' },
      { arquivo: 'tools/modelar/nova.mjs', comandos: ['nova'], faz: 'Mede a peça e imprime o desvio.', tipo: 'gate' },
    ]);
    expect(novo.semChamador).toEqual([{ arquivo: 'tools/modelar/apoio.mjs', motivo: 'apoio de teste' }]);
    expect(JSON.parse(serializarRegistro(novo))).toEqual(novo);
  });

  it('o README traz a tabela das de uso, as de gate e as internas pelo nome, e o que está sem chamador', () => {
    const registro = registroEmDia();
    registro.ferramentas.push({ arquivo: 'tools/mapa/conferir.mjs', comandos: ['x:check'], faz: 'Confere uma coisa do repositório.', tipo: 'gate' });
    registro.ferramentas.push({ arquivo: 'tools/modelar/filho.mjs', comandos: [], faz: 'Processo filho de outra ferramenta.', tipo: 'interna' });
    const texto = gerarLeiame(registro);
    expect(texto).toContain('não edite à mão');
    expect(texto).toContain('| `medir` | Mede a peça e imprime o desvio. |');
    expect(texto).toContain('## De gate (1)');
    expect(texto).toContain('`mapa/conferir.mjs`');
    expect(texto).toContain('Outra ferramenta chama: `modelar/filho.mjs`.');
    expect(texto).toContain('## Sem chamador, declarados (1)');
  });
});

describe('o repositório de hoje', () => {
  it('passa na conferência, com o README gerado do registro', () => {
    const arquivos = lerArvore(REPO);
    const registro = JSON.parse(readFileSync(join(REPO, REGISTRO), 'utf8'));
    const { problemas, linhasDeComando } = conferirRegistro({
      arquivos, scripts: JSON.parse(arquivos['package.json']).scripts, registro, gates: GATES, leiame: readFileSync(join(REPO, LEIAME), 'utf8'),
    });
    expect(problemas).toEqual([]);
    expect(linhasDeComando.length).toBe(registro.ferramentas.length);
  });

  it('as quatro ferramentas que o processo usa têm comando', () => {
    const scripts = JSON.parse(readFileSync(join(REPO, 'package.json'), 'utf8')).scripts;
    const porArquivo = comandosPorArquivo(scripts);
    for (const nome of ['zebra-numerica', 'distancia-a-pele', 'conferir-pontos', 'rodada-de-modelagem']) {
      expect(porArquivo[`tools/modelar/${nome}.mjs`], nome).toBeTruthy();
    }
  });
});
