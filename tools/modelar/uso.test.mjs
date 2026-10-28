/* uso.test.mjs — o registro de uso: grava uma linha por pedido de ajuda, de roteiro e por recusa; resume o que a IA mais pede
   e o que não encontra; nunca quebra o comando que registra; e a suíte não escreve no registro de quem trabalha. */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import { caminhoDoUso, chaveDaRecusa, formatarUso, lerUso, registrarUso, resumirUso } from './uso.mjs';

const ESBOCO = fileURLToPath(new URL('./esboco.mjs', import.meta.url));
const COMECAR = fileURLToPath(new URL('./comecar.mjs', import.meta.url));
const pasta = () => mkdtempSync(join(tmpdir(), 'uso-'));
const sem = (extra = {}) => ({ ...process.env, VITEST: '', MODELAR_USO: '', MODELAR_USO_ARQUIVO: '', MECANIFICA_USO: '', MECANIFICA_USO_ARQUIVO: '', ...extra });

describe('registrarUso', () => {
  it('acrescenta uma linha JSON com a hora e o evento, no destino dado', () => {
    const destino = join(pasta(), 'sub', 'uso.jsonl');
    expect(registrarUso({ evento: 'ajuda', topico: 'caixa', achado: true }, { destino, agora: () => new Date('2026-10-08T10:00:00Z') })).toBe(true);
    registrarUso({ evento: 'comecar', roteiro: 'mudar', achado: true }, { destino });
    const linhas = lerUso(destino);
    expect(linhas).toHaveLength(2);
    expect(linhas[0]).toEqual({ quando: '2026-10-08T10:00:00.000Z', evento: 'ajuda', topico: 'caixa', achado: true });
  });

  it('fica calado sob o vitest, desligado por MODELAR_USO=0, e grava quando o arquivo é redirecionado de propósito', () => {
    const arquivo = join(pasta(), 'uso.jsonl');
    expect(registrarUso({ evento: 'ajuda' }, { env: { VITEST: 'true' } })).toBe(false);
    expect(registrarUso({ evento: 'ajuda' }, { env: { MODELAR_USO: '0', MODELAR_USO_ARQUIVO: arquivo } })).toBe(false);
    expect(existsSync(arquivo)).toBe(false);
    expect(registrarUso({ evento: 'ajuda' }, { env: { VITEST: 'true', MODELAR_USO_ARQUIVO: arquivo } })).toBe(true);
    expect(lerUso(arquivo)).toHaveLength(1);
  });

  it('aceita os nomes antigos MECANIFICA_USO e MECANIFICA_USO_ARQUIVO (com aviso do novo) e o nome novo vence', () => {
    const arquivo = join(pasta(), 'uso.jsonl');
    const novo = join(pasta(), 'novo.jsonl');
    const escrita = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    try {
      expect(registrarUso({ evento: 'ajuda' }, { env: { VITEST: 'true', MECANIFICA_USO_ARQUIVO: arquivo } })).toBe(true);
      expect(lerUso(arquivo)).toHaveLength(1);
      expect(registrarUso({ evento: 'ajuda' }, { env: { MECANIFICA_USO: '0', MECANIFICA_USO_ARQUIVO: arquivo } })).toBe(false);
      expect(caminhoDoUso({ MODELAR_USO_ARQUIVO: novo, MECANIFICA_USO_ARQUIVO: arquivo })).toBe(novo);
      const avisos = escrita.mock.calls.map(([texto]) => String(texto)).join('');
      expect(avisos).toContain('use MODELAR_USO_ARQUIVO');
      expect(avisos).toContain('use MODELAR_USO (o antigo');
    } finally { escrita.mockRestore(); }
  });

  it('o caminho padrão é .diario/uso.jsonl do repositório, e o arquivo está fora do Git', () => {
    const caminho = caminhoDoUso({});
    expect(caminho.replace(/\\/g, '/')).toMatch(/\/\.diario\/uso\.jsonl$/);
    const git = spawnSync('git', ['check-ignore', '-q', '.diario/uso.jsonl'], { cwd: fileURLToPath(new URL('../..', import.meta.url)) });
    expect(git.status).toBe(0);
  });

  it('ignora a falha de escrita, em vez de levantá-la', () => {
    const base = pasta();
    writeFileSync(join(base, 'arquivo'), 'x');
    expect(registrarUso({ evento: 'ajuda' }, { destino: join(base, 'arquivo', 'dentro', 'uso.jsonl') })).toBe(false);
    expect(registrarUso({ evento: 'ajuda' }, { destino: base })).toBe(false);
  });

  it('corta a mensagem longa e junta os espaços', () => {
    const destino = join(pasta(), 'uso.jsonl');
    registrarUso({ evento: 'recusa', mensagem: `a\n  b ${'x'.repeat(500)}` }, { destino });
    const [linha] = lerUso(destino);
    expect(linha.mensagem.length).toBe(300);
    expect(linha.mensagem.startsWith('a b x')).toBe(true);
  });
});

describe('os comandos registram sem mudar o resultado', () => {
  it('esboco --ajuda grava o tópico pedido e o que não existe, com a mesma saída e o mesmo código com o registro desligado', () => {
    const arquivo = join(pasta(), 'uso.jsonl');
    const ligado = spawnSync(process.execPath, [ESBOCO, '--ajuda', 'caxia'], { encoding: 'utf8', env: sem({ MODELAR_USO_ARQUIVO: arquivo }) });
    spawnSync(process.execPath, [ESBOCO, '--ajuda', 'caixa'], { encoding: 'utf8', env: sem({ MODELAR_USO_ARQUIVO: arquivo }) });
    const desligado = spawnSync(process.execPath, [ESBOCO, '--ajuda', 'caxia'], { encoding: 'utf8', env: sem({ MODELAR_USO: '0' }) });
    expect(ligado.status).toBe(1);
    expect(ligado.stderr).toBe(desligado.stderr);
    expect(lerUso(arquivo).map(({ evento, topico, achado }) => ({ evento, topico, achado }))).toEqual([
      { evento: 'ajuda', topico: 'caxia', achado: false },
      { evento: 'ajuda', topico: 'caixa', achado: true },
    ]);
  });

  it('comecar grava o roteiro pedido e o desconhecido', () => {
    const arquivo = join(pasta(), 'uso.jsonl');
    spawnSync(process.execPath, [COMECAR, 'mudar'], { encoding: 'utf8', env: sem({ MODELAR_USO_ARQUIVO: arquivo }) });
    const ruim = spawnSync(process.execPath, [COMECAR, 'xyz'], { encoding: 'utf8', env: sem({ MODELAR_USO_ARQUIVO: arquivo }) });
    expect(ruim.status).toBe(1);
    expect(lerUso(arquivo).map(({ evento, roteiro, achado }) => ({ evento, roteiro, achado }))).toEqual([
      { evento: 'comecar', roteiro: 'mudar', achado: true },
      { evento: 'comecar', roteiro: 'xyz', achado: false },
    ]);
  });

  it('um registro que não dá para gravar não muda a saída nem o código do comando', () => {
    const base = pasta();
    mkdirSync(join(base, 'uso.jsonl'));
    const r = spawnSync(process.execPath, [ESBOCO, '--ajuda', 'caixa'], { encoding: 'utf8', env: sem({ MODELAR_USO_ARQUIVO: join(base, 'uso.jsonl') }) });
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('### Caixa');
    expect(r.stderr).toBe('');
  });
});

describe('resumirUso e npm run uso', () => {
  const eventos = [
    ...['caixa', 'caixa', 'tubo'].map((topico) => ({ evento: 'ajuda', topico, achado: true, quando: '2026-10-08T10:00:00Z' })),
    ...['caxia', 'caxia', 'roda'].map((topico) => ({ evento: 'ajuda', topico, achado: false, quando: '2026-10-08T11:00:00Z' })),
    { evento: 'comecar', roteiro: 'mudar', achado: true },
    { evento: 'comecar', roteiro: 'modelar/peca', achado: true },
    { evento: 'comecar', roteiro: 'mudar', achado: true },
    { evento: 'comecar', roteiro: 'esboçar', achado: false },
    { evento: 'recusa', origem: 'esboco', topico: 'tubo', mensagem: 'forma "perna": o campo "raio" não existe em tubo' },
    { evento: 'recusa', origem: 'esboco', topico: 'tubo', mensagem: 'forma "braco": o campo "raioo" não existe em tubo' },
    { evento: 'recusa', origem: 'contato', topico: 'contato', mensagem: 'contato reprovado: 3 achados' },
  ];

  it('conta os tópicos mais pedidos, os não encontrados, os roteiros e as recusas repetidas', () => {
    const r = resumirUso(eventos);
    expect(r.total).toBe(eventos.length);
    expect(r.topicosPedidos[0]).toEqual({ topico: 'caixa', vezes: 2 });
    expect(r.topicosNaoEncontrados[0]).toEqual({ topico: 'caxia', vezes: 2 });
    expect(r.roteirosPedidos[0]).toEqual({ roteiro: 'mudar', vezes: 2 });
    expect(r.roteirosDesconhecidos).toEqual([{ roteiro: 'esboçar', vezes: 1 }]);
    expect(r.recusas.total).toBe(3);
    expect(r.recusas.repetidas).toHaveLength(1);
    expect(r.recusas.repetidas[0]).toMatchObject({ vezes: 2, topico: 'tubo', mensagem: chaveDaRecusa('forma "x": o campo "y" não existe em tubo') });
  });

  it('imprime as cinco seções, e o registro vazio diz o que fazer', () => {
    const texto = formatarUso(resumirUso(eventos), 'uso.jsonl');
    for (const secao of ['tópicos de ajuda mais pedidos', 'tópicos de ajuda não encontrados', 'roteiros pedidos', 'roteiros desconhecidos', 'recusas repetidas']) expect(texto).toContain(secao);
    expect(texto).toContain('   2  caxia');
    expect(formatarUso(resumirUso([]), 'uso.jsonl')).toContain('registro de uso vazio');
  });

  it('npm run uso lê o arquivo redirecionado e resume', () => {
    const arquivo = join(pasta(), 'uso.jsonl');
    writeFileSync(arquivo, `${eventos.map((e) => JSON.stringify(e)).join('\n')}\nlinha cortada {\n`);
    const r = spawnSync(process.execPath, [fileURLToPath(new URL('./uso.mjs', import.meta.url))], { encoding: 'utf8', env: sem({ MODELAR_USO_ARQUIVO: arquivo }) });
    expect(r.status).toBe(0);
    expect(r.stdout).toContain(`registro de uso: ${eventos.length} eventos`);
    expect(readFileSync(arquivo, 'utf8')).toContain('linha cortada');
  });
});
