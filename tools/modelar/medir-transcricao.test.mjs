/* medir-transcricao.test.mjs — a medição de uma transcrição: turnos e entrada somada pelo `usage` (uma vez por mensagem),
   cada resultado de ferramenta na etapa da sua chamada, imagem pelo valor fixo, e a soma de várias transcrições. */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  CARACTERES_POR_TOKEN, chamadaDoTrecho, comandoEscreve, comoCLI, contarAtritos, etapaDaChamada, lerSessao, medirTranscricao, textoDaMedicao,
  TOKENS_POR_IMAGEM, trechosDoComando,
} from './medir-transcricao.mjs';

const assistente = (id, usage, content) => JSON.stringify({ type: 'assistant', message: { id, usage, content } });
const usuario = (content) => JSON.stringify({ type: 'user', message: { content } });
const uso = (entrada, cache, saida) => ({ input_tokens: entrada, cache_read_input_tokens: cache, output_tokens: saida });

const TRANSCRICAO = [
  usuario('x'.repeat(35)),
  assistente('m1', uso(100, 900, 10), [{ type: 'tool_use', id: 't1', name: 'Bash', input: { command: 'npm run esboco -- --ajuda tubo' } }]),
  usuario([{ type: 'tool_result', tool_use_id: 't1', content: 'y'.repeat(70) }]),
  /* a mesma mensagem m2 em duas linhas, como o Claude Code grava um bloco por linha */
  assistente('m2', uso(50, 1100, 20), [{ type: 'text', text: 'z'.repeat(7) }]),
  assistente('m2', uso(50, 1100, 20), [{ type: 'tool_use', id: 't2', name: 'Read', input: { file_path: '/p/vista.png' } }]),
  usuario([{ type: 'tool_result', tool_use_id: 't2', content: [{ type: 'image', source: {} }] }]),
].join('\n');

describe('medirTranscricao', () => {
  it('conta turnos e entrada pelo usage, uma vez por mensagem, e reparte o resto por etapa', () => {
    const m = medirTranscricao(TRANSCRICAO);
    expect(m).toMatchObject({ turnos: 2, entradaSomada: 1000 + 1150, saida: 30, contextoFinal: 1150 });
    expect(m).toMatchObject({ entradaNova: 150, cacheGravado: 0, cacheLido: 2000 });
    expect(m.etapas['comando esboco --ajuda']).toEqual({ tokens: 70 / CARACTERES_POR_TOKEN, chamadas: 1 });
    expect(m.etapas['imagem aberta']).toEqual({ tokens: TOKENS_POR_IMAGEM, chamadas: 1 });
    expect(m.etapas['texto da IA'].tokens).toBe(7 / CARACTERES_POR_TOKEN);
    expect(m.etapas.pedido.tokens).toBe(35 / CARACTERES_POR_TOKEN);
  });

  it('classifica as chamadas pelas etapas da medição de 2026-10-07, com --ajuda e --composta', () => {
    expect(etapaDaChamada('Read', { file_path: '/r/modulos/esboco/README.md' })).toBe('leitura: README do esboço');
    expect(etapaDaChamada('Read', { file_path: '/r/.claude/skills/esboco-detalhado/SKILL.md' })).toBe('leitura: skill');
    expect(etapaDaChamada('Edit', { file_path: '/t/a.esboco.json' })).toBe('escrita do JSON');
    expect(etapaDaChamada('Bash', { command: 'npm run esboco -- a.esboco.json --composta' })).toBe('comando esboco --composta');
    expect(etapaDaChamada('Bash', { command: 'npm run esboco -- a.esboco.json' })).toBe('comando esboco (gate e leitura padrão)');
    expect(etapaDaChamada('Grep', {})).toBe('ferramenta: Grep');
  });

  it('o texto traz cada transcrição e, com mais de uma, a soma com a porcentagem', () => {
    const m = medirTranscricao(TRANSCRICAO);
    const texto = textoDaMedicao([{ nome: 'a', medicao: m }, { nome: 'b', medicao: m }]);
    expect(texto).toContain('== a: 2 turnos, contexto final 1.150, entrada somada 2.150, saída 30');
    expect(texto).toContain('   entrada: nova 150, gravada no cache 0, lida do cache 2.000');
    expect(texto).toContain('== soma das 2 transcrições');
    expect(texto).toMatch(/imagem aberta +3\.200 tok +[\d.]+%/);
  });

  it('conta o que voltou das ferramentas até a primeira escrita, por arquivo lido, e o contexto do turno que escreveu', () => {
    const t = [
      usuario('tarefa'),
      assistente('a1', uso(10, 1000, 5), [{ type: 'tool_use', id: 'r1', name: 'Read', input: { file_path: '/r/CLAUDE.md' } }]),
      usuario([{ type: 'tool_result', tool_use_id: 'r1', content: 'é'.repeat(10) }]),
      assistente('a2', uso(10, 1200, 5), [{ type: 'tool_use', id: 'b1', name: 'Bash', input: { command: 'npm run comecar' } }]),
      usuario([{ type: 'tool_result', tool_use_id: 'b1', content: [{ type: 'text', text: 'x'.repeat(30) }, { type: 'image', source: {} }] }]),
      assistente('a3', uso(10, 1500, 5), [{ type: 'tool_use', id: 'w1', name: 'Edit', input: { file_path: '/r/a.js' } }]),
      usuario([{ type: 'tool_result', tool_use_id: 'w1', content: 'ok' }]),
      assistente('a4', uso(10, 1600, 5), [{ type: 'tool_use', id: 'r2', name: 'Read', input: { file_path: '/r/b.md' } }]),
      usuario([{ type: 'tool_result', tool_use_id: 'r2', content: 'y'.repeat(99) }]),
    ].join('\n');
    const m = medirTranscricao(t);
    expect(m.primeiroPasso).toEqual({ turno: 3, contexto: 1510, bytes: 50, imagens: 1, chamadas: 2, arquivos: { '/r/CLAUDE.md': 20 } });
    expect(textoDaMedicao([{ nome: 't', medicao: m }])).toContain('até o primeiro passo (turno 3): 50 bytes de texto, 1 imagens, 2 chamadas, contexto 1.510');
    expect(medirTranscricao(TRANSCRICAO).primeiroPasso).toBeNull();
  });

  it('conta como passo o comando de shell que edita no lugar ou redireciona para a cópia, e não para fora dela', () => {
    expect(comandoEscreve("cd /c && sed -i 's/a/b/' x.js")).toBe(true);
    expect(comandoEscreve('git -C /c apply p.patch')).toBe(true);
    expect(comandoEscreve('cat > receita.js <<EOF')).toBe(true);
    expect(comandoEscreve('npm test 2>&1 | tee -a /tmp/c/log.txt', '/tmp/c')).toBe(true);
    expect(comandoEscreve('npm test > /tmp/fora.log 2>&1', '/tmp/c')).toBe(false);
    expect(comandoEscreve('npm test > /dev/null 2>&1; sed -n 1,9p a.js')).toBe(false);
    expect(comandoEscreve('[ $a -gt 3 ] && echo x > /tmp/y')).toBe(false);
    const t = [
      assistente('a1', uso(10, 1000, 5), [{ type: 'tool_use', id: 'b1', name: 'Bash', input: { command: 'cd /c && grep -n x a.js' } }]),
      usuario([{ type: 'tool_result', tool_use_id: 'b1', content: 'x'.repeat(40) }]),
      assistente('a2', uso(10, 1100, 5), [{ type: 'tool_use', id: 'b2', name: 'Bash', input: { command: "cd /c && sed -i 's/+/-/' a.js" } }]),
    ].join('\n');
    expect(medirTranscricao(t, { raiz: '/c' }).primeiroPasso).toMatchObject({ turno: 2, bytes: 40, chamadas: 1 });
  });
});

/* A CONTAGEM DE ATRITOS POR COMANDO (`--atritos`, fatia 7 do plano de comparar com a referência). Uma sessão de mentira, a principal e
   um subagente, com a bancada chamada num laço e uma a uma, a opção de memória do Node, um script criado em tmp/ e rodado, e falhas. */
describe('os atritos por comando', () => {
  const chamada = (id, comando, horario) => JSON.stringify({ type: 'assistant', timestamp: horario, cwd: '/r', message: { id: `m-${id}`, content: [{ type: 'tool_use', id, name: 'Bash', input: { command: comando } }] } });
  const resultado = (id, horario, texto, erro = false) => JSON.stringify({ type: 'user', timestamp: horario, message: { content: [{ type: 'tool_result', tool_use_id: id, content: texto, is_error: erro }] } });
  const escrita = (id, caminho, horario) => JSON.stringify({ type: 'assistant', timestamp: horario, message: { id: `m-${id}`, content: [{ type: 'tool_use', id, name: 'Write', input: { file_path: caminho, content: 'x' } }] } });
  const t = (s) => `2026-11-17T10:00:${String(s).padStart(2, '0')}Z`;

  function sessao() {
    const pasta = mkdtempSync(join(tmpdir(), 'atritos-'));
    const principal = [];
    for (let i = 0; i < 4; i++) {
      principal.push(chamada(`b${i}`, `cd /r/.claude/worktrees/a && node tools/modelar/olhar-bancada.mjs p --mirar=${i},0,0 --saida=tmp/v${i}`, t(i * 10)));
      principal.push(resultado(`b${i}`, t(i * 10 + 8), i === 3 ? 'Exit code 2\nrecusou' : 'ok', false));
    }
    principal.push(chamada('n1', 'NODE_OPTIONS=--max-old-space-size=8192 npx vitest run a.test.mjs', t(50)));
    principal.push(resultado('n1', t(51), 'ok'));
    principal.push(chamada('g1', 'git -C /r status --short; grep -n x a.js', t(52)));
    principal.push(resultado('g1', t(53), 'Exit code 1', true));
    const sub = [
      chamada('s1', "cat > tmp/prancha.py <<'EOF'\nfrom PIL import Image\nimport os; os.system('node tools/x.mjs')\nEOF\npython3 tmp/prancha.py", t(1)),
      resultado('s1', t(2), 'Traceback (most recent call last)'),
      escrita('w1', '/r/tmp/chk.mjs', t(3)),
      chamada('s2', 'node --max-old-space-size=6000 tmp/chk.mjs && npm run -s bancada -- p --vistas=direita', t(4)),
      resultado('s2', t(14), 'ok'),
      chamada('s3', 'for v in a b; do node --stack-size=4000 /r/tools/modelar/olhar-bancada.mjs p --vistas=$v; done', t(20)),
      resultado('s3', t(40), 'ok'),
    ];
    writeFileSync(join(pasta, 's.jsonl'), `${principal.join('\n')}\n`);
    mkdirSync(join(pasta, 's', 'subagents'), { recursive: true });
    writeFileSync(join(pasta, 's', 'subagents', 'agent-1.jsonl'), `${sub.join('\n')}\n`);
    writeFileSync(join(pasta, 's', 'subagents', 'agent-1.meta.json'), JSON.stringify({ agentType: 'modelador', description: 'd' }));
    return pasta;
  }

  it('parte o comando fora das aspas e sem o corpo do heredoc, e dá a chave de cada trecho', () => {
    expect(trechosDoComando("cd /r && python3 - <<'EOF'\np='a; b'\nEOF\nnode -e \"a(); b()\" | head -3")).toEqual(['cd /r', "python3 - <<'EOF'", 'node -e "a(); b()"', 'head -3']);
    expect(chamadaDoTrecho('NODE_OPTIONS="--max-old-space-size=8192 --expose-gc" node --input-type=module tools/a.mjs').opcoesDeNode).toEqual([
      ['NODE_OPTIONS', '--max-old-space-size=8192'], ['NODE_OPTIONS', '--expose-gc'],
    ]);
    expect(chamadaDoTrecho('timeout 300 node --max-old-space-size=3072 /r/.claude/worktrees/b/tools/a.mjs --x', '/r')).toMatchObject({ chave: 'node tools/a.mjs', opcoesDeNode: [['--max-old-space-size', '3072']] });
    expect(trechosDoComando('npm test 2>&1 | tail -3; node a.mjs &> /dev/null & wait')).toEqual(['npm test 2>&1', 'tail -3', 'node a.mjs &> /dev/null', 'wait']);
    expect(chamadaDoTrecho('npm run -s bancada -- p').chave).toBe('npm run bancada');
    expect(chamadaDoTrecho('git -C /r log --oneline').chave).toBe('git log');
    expect(chamadaDoTrecho('python3 -I tmp/m.py a').chave).toBe('python3 tmp/m.py');
    expect(chamadaDoTrecho('node -e "x"').chave).toBe('node -e');
  });

  it('acha, sem padrão dado, a bancada repetida, as falhas, o script de tmp/ e as opções de memória do Node', () => {
    const pasta = sessao();
    try {
      const a = contarAtritos(lerSessao(join(pasta, 's.jsonl')), { limite: 3 });
      expect(a).toMatchObject({ registros: 2, comandos: 9, falhas: 3, limite: 3 });
      /* o mesmo script por caminho relativo e absoluto de outra cópia é uma chave só; git e grep são rotina e ficam fora */
      expect(a.repetidos).toEqual([{ chave: 'node tools/modelar/olhar-bancada.mjs', vezes: 5, falhas: 1, segundos: 52 }]);
      expect(a.falharam.map((k) => k.chave)).toEqual(['node tools/modelar/olhar-bancada.mjs', 'python3 tmp/prancha.py']);
      expect(a.scripts).toEqual({ arquivos: 2, escritas: 2, rodadas: 2, maisRodados: [{ nome: 'prancha.py', vezes: 1 }, { nome: 'chk.mjs', vezes: 1 }] });
      expect(a.opcoesDeNode).toEqual([
        { opcao: '--max-old-space-size', vezes: 2, pelaVariavel: 1, valores: ['6000', '8192'] },
        { opcao: '--stack-size', vezes: 1, pelaVariavel: 0, valores: ['4000'] },
      ]);
      const cli = comoCLI(['--atritos=3', join(pasta, 's.jsonl')]);
      expect(cli.codigo).toBe(0);
      expect(cli.stdout).toContain('2 registro(s) (o principal e os subagentes), 9 comandos de shell, 3 falharam (33,3%)');
      expect(cli.stdout).toMatch(/ +5 vezes +1 falhas +52 s +node tools\/modelar\/olhar-bancada\.mjs/);
      expect(cli.stdout).toContain('scripts criados em tmp/: 2 arquivo(s) em 2 escrita(s), rodados 2 vez(es)');
      expect(cli.stdout).toMatch(/2 vezes +--max-old-space-size \(6000, 8192\), 1 pelo NODE_OPTIONS/);
      /* com o limite padrão, de 10, a bancada não passa e a lista diz nenhum */
      expect(comoCLI(['--atritos', join(pasta, 's.jsonl')]).stdout).toContain('chamados mais de 10 vezes, fora ler, navegar e versionar (vezes, falhas, tempo somado das chamadas):\n   nenhum');
    } finally { rmSync(pasta, { recursive: true, force: true }); }
  });

  it('responde a --ajuda com a opção nova e recusa o limite que não é inteiro, a opção desconhecida e o arquivo que não existe', () => {
    const ajuda = comoCLI(['--ajuda']);
    expect(ajuda.codigo).toBe(0);
    expect(ajuda.stdout).toContain('--atritos[=N]');
    expect(comoCLI(['--atritos=0', 'x.jsonl']).stderr).toMatch(/--atritos pede um número inteiro de vezes, 1 ou mais; veio "0"/);
    expect(comoCLI(['--repetidos', 'x.jsonl']).codigo).toBe(2);
    expect(comoCLI(['/nao/existe.jsonl']).stderr).toContain("a transcrição '/nao/existe.jsonl' não existe");
  });
});
