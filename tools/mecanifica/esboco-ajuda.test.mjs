/* esboco-ajuda.test.mjs — o `--ajuda [tópico]` do esboço: o índice cobre todos os títulos do README, cada tópico devolve só a sua
   seção, o tópico desconhecido sugere o nome parecido, e a linha de comando liga tudo. */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ajuda, buscarTopico, FRASES, indice, lerTopicos, README_DO_ESBOCO } from './esboco-ajuda.mjs';

const texto = readFileSync(README_DO_ESBOCO, 'utf8');
const topicos = lerTopicos(texto);
const CLI = fileURLToPath(new URL('./esboco.mjs', import.meta.url));

/* Os títulos `##` e `###` contados sem o parser do módulo: tira os blocos de código e conta as linhas que começam com eles. */
function titulosDoReadme() {
  let dentro = false;
  return texto.split('\n').filter((linha) => {
    if (/^(```|~~~)/.test(linha)) { dentro = !dentro; return false; }
    return !dentro && /^#{2,3} /.test(linha);
  });
}

describe('--ajuda: o índice', () => {
  it('tem um tópico para cada título ## e ### do README, sem repetir nome', () => {
    expect(topicos.map((t) => t.titulo)).toEqual(titulosDoReadme().map((l) => l.replace(/^#+ /, '')));
    expect(new Set(topicos.map((t) => t.id)).size).toBe(topicos.length);
  });

  it('tem uma frase para cada tópico, e nenhuma frase sobra sem tópico', () => {
    const ids = new Set(topicos.map((t) => t.id));
    for (const t of topicos) expect(FRASES[t.id], `falta a frase de ${t.id}`).toBeTruthy();
    expect(Object.keys(FRASES).filter((k) => !ids.has(k))).toEqual([]);
  });

  it('sai com uma linha por tópico, o nome e a frase', () => {
    const linhas = indice(topicos).trimEnd().split('\n');
    expect(linhas).toHaveLength(topicos.length);
    linhas.forEach((linha, i) => {
      expect(linha.startsWith(topicos[i].id)).toBe(true);
      expect(linha).toContain(FRASES[topicos[i].id]);
    });
  });

  it('sem tópico, responde o índice com código 0', () => {
    expect(ajuda(null, texto)).toEqual({ codigo: 0, texto: indice(topicos) });
    expect(ajuda('   ', texto).texto).toBe(indice(topicos));
  });
});

describe('--ajuda <tópico>: só a sua seção', () => {
  it('um ### devolve só o seu trecho, do título até o próximo título', () => {
    const r = ajuda('tubo', texto);
    expect(r.codigo).toBe(0);
    expect(r.texto.startsWith('### Tubo\n')).toBe(true);
    expect(r.texto).toContain('`caminho`');
    expect(r.texto).not.toContain('### Cone');
    expect(r.texto).not.toContain('## Posicionamento');
    expect(r.texto.length).toBeLessThan(texto.length / 20);
  });

  it('um ## devolve o capítulo, com os ### que estão dentro dele', () => {
    const r = ajuda('formas', texto);
    expect(r.texto.startsWith('## Formas\n')).toBe(true);
    expect(r.texto).toContain('### Tubo');
    expect(r.texto).not.toContain('## Posicionamento');
  });

  it('um nome que cabe em dois tópicos pede o caminho completo', () => {
    const r = ajuda('explosao', texto);
    expect(r.codigo).toBe(1);
    expect(r.texto).toContain('vistas-ia/explosao');
    expect(r.texto).toContain('sobreposicao/explosao');
    const cheio = ajuda('sobreposicao/explosao', texto);
    expect(cheio.codigo).toBe(0);
    expect(cheio.texto.startsWith('### Explosão e opacidade\n')).toBe(true);
  });
});

describe('--ajuda: tópico desconhecido', () => {
  it('responde o quis dizer e o índice, com código 1', () => {
    const r = ajuda('tuba', texto);
    expect(r.codigo).toBe(1);
    expect(r.texto).toContain("tópico 'tuba' não existe. Quis dizer: tubo.");
    expect(r.texto).toContain(indice(topicos));
  });

  it('o buscador acha o tópico pelo nome e não pelo título inteiro', () => {
    expect(buscarTopico(topicos, 'Componentes').topico.id).toBe('componentes');
    expect(buscarTopico(topicos, 'desenhos').topico.titulo).toBe('Desenhos: o SVG e o PNG');
  });
});

describe('--ajuda pela linha de comando', () => {
  it('imprime o índice sem tópico e a seção com um tópico', () => {
    const sem = spawnSync(process.execPath, [CLI, '--ajuda'], { encoding: 'utf8' });
    expect(sem.status).toBe(0);
    expect(sem.stdout).toBe(indice(topicos));
    const com = spawnSync(process.execPath, [CLI, '--ajuda', 'tubo'], { encoding: 'utf8' });
    expect(com.status).toBe(0);
    expect(com.stdout.startsWith('### Tubo\n')).toBe(true);
  });

  it('um tópico desconhecido sai pela saída de erro com código 1', () => {
    const r = spawnSync(process.execPath, [CLI, '--ajuda', 'tuba'], { encoding: 'utf8' });
    expect(r.status).toBe(1);
    expect(r.stdout).toBe('');
    expect(r.stderr).toContain('Quis dizer: tubo.');
  });
});
