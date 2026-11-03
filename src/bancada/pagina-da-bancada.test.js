/* pagina-da-bancada.test.js — a página publicada (`bancada.html`) e a folha de estilo dela têm o que os ajustes de 2026-11-03 pedem.
 *
 * É a prova de página dos pontos de interface do plano de ajustes da bancada: o que saiu não está mais na marcação, o botão de
 * Configurações vem logo depois do Abrir, a lista de atalhos mora na janela de Configurações e as regras de largura e de lugar
 * estão na folha. A medida em pixels, num navegador, é da guarda `guarda:temas` e das capturas. */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { TEMAS, TEMA_PADRAO } from './temas/temas.js';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '../..');
const html = readFileSync(join(RAIZ, 'bancada.html'), 'utf8');
const css = readFileSync(join(RAIZ, 'src/bancada/styles.css'), 'utf8');
const temId = (id) => new RegExp(`id="${id}"`).test(html);

describe('a página da bancada', () => {
  it('o diagnóstico, as portas, o nome da peça com a luz e a dica de estado saíram da marcação', () => {
    for (const id of ['diagnostico', 'portasPublicadas', 'resumoPortas', 'listaPortas', 'nomePecaFoco', 'estadoSessaoFoco', 'dicaEstado']) {
      expect(temId(id), id).toBe(false);
    }
    expect(html).not.toMatch(/class="nome-peca"|class="dica-estado"|class="diagnostico"/);
  });

  it('o resto da aba Inspeção fica: ver no contexto, isolar, arame, opacidade, explosão e focar', () => {
    for (const id of ['btnContexto', 'btnIsolar', 'btnWireframeSelecao', 'opacidadeSelecao', 'explosao', 'btnFocarSelecao']) {
      expect(temId(id), id).toBe(true);
    }
  });

  it('o botão de Configurações vem logo depois do Abrir, e o de atalhos antigo não existe', () => {
    const barra = html.slice(html.indexOf('<div class="barra-controles">'));
    expect(barra.indexOf('id="btnMenuAbrir"')).toBeGreaterThan(-1);
    expect(barra.indexOf('id="btnMenuConfiguracoes"')).toBeGreaterThan(barra.indexOf('id="btnMenuAbrir"'));
    expect(barra.indexOf('id="btnMenuConfiguracoes"')).toBeLessThan(barra.indexOf('id="btnMenuEstado"'));
    expect(temId('btnMenuAtalhos')).toBe(false);
    const [tema] = TEMAS;
    const ordem = Object.entries(tema.lugares).filter(([, lugar]) => lugar === 'topo-peca').map(([nome]) => nome);
    expect(ordem).toEqual(['abrir', 'configuracoes']);
  });

  it('a lista de atalhos é uma seção da janela de Configurações, sem seletor de tema, sem grade nem chão', () => {
    const janela = html.slice(html.indexOf('id="menuConfiguracoes"'), html.indexOf('<nav class="vistas"'));
    expect(janela).toContain('id="listaAtalhos"');
    expect(janela).toContain('Atalhos de teclado');
    expect(janela).not.toMatch(/escolhaTema|prefGrade|prefChao/);
    expect(temId('escolhaTema')).toBe(false);
  });

  it('a raiz nasce no arranjo único e não há mais mesa da peça com a referência', () => {
    expect(html).toContain('data-tema="bancada" data-cores="escuro" data-arrumacao="bancada"');
    expect(html).not.toMatch(/mesaComparacao|data-lugar="mesa"/);
    expect(TEMAS.map((tema) => tema.id)).toEqual([TEMA_PADRAO]);
  });
});

describe('a folha de estilo da bancada', () => {
  it('o nome do Abrir só some junto do dos botões que são só ícone, e não numa janela estreita', () => {
    const media = css.slice(css.indexOf('@media (max-width: 1320px)'));
    const bloco = media.slice(0, media.indexOf('}\n') + 1);
    expect(bloco).not.toMatch(/\.topo-foco \.texto-botao\s*[,{]/);
    expect(css).not.toMatch(/#btnMenuAbrir[^{]*\.texto-botao[^{]*\{\s*display:\s*none/);
  });

  it('a legenda das visões fica no canto de cima da cena, e não no meio embaixo onde a peça chega', () => {
    const regra = css.match(/:root\[data-arrumacao="bancada"\] \.painel-visao \{[^}]*\}/)?.[0] ?? '';
    expect(regra).toMatch(/left:\s*var\(--e2\)/);
    expect(regra).toMatch(/transform:\s*none/);
    expect(regra).toMatch(/top:\s*92px/);
  });

  it('o painel da direita tem 340 pixels na aba de referência e 216 nas outras', () => {
    expect(css).toMatch(/body \{ --largura-direita: 216px; \}/);
    expect(css).toMatch(/aba-btn\.ativa\[data-aba="referencias"\]\) \{ --largura-direita: 340px; \}/);
    expect(css).toMatch(/\.painel-inspecao \{ right: 0; width: var\(--largura-direita\)/);
  });
});
