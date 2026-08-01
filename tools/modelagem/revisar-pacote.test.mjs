// Prova a orquestração atômica entre pacote, descrição headless e vistas da bancada.
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { prepararPacote } from './preparar-pacote.mjs';
import { revisarPacote } from './revisar-pacote.mjs';
import { serializarCanonico } from './formato-pacote.mjs';
import { validarPacoteNoDisco } from './validar-pacote.mjs';

const VISTAS = ['isometrica', 'frontal', 'direita', 'superior'];

function enquadramento() {
  return { valida: true, area: 0.61, largura: 0.81, altura: 0.75, cortado: false };
}

async function bancadaFalsa({ peca, vistas, relatorio }) {
  for (const vista of VISTAS) {
    writeFileSync(join(vistas, `bancada-${peca}-${vista}-orto.png`), `evidência ${vista}`, 'utf8');
  }
  writeFileSync(relatorio, `${JSON.stringify({
    peca,
    vistas: VISTAS.map((nome) => ({ nome, enquadramento: enquadramento() })),
  })}\n`, 'utf8');
}

async function definirOrcamentoExato(raiz, id) {
  const validado = await validarPacoteNoDisco(id, { raizPacotes: raiz });
  const briefingArquivo = join(raiz, id, 'briefing.json');
  const briefing = JSON.parse(readFileSync(briefingArquivo, 'utf8'));
  const { faces, partes, materiais } = validado.alvo.descricao.totais;
  briefing.perfil.orcamento = { faces, partes, materiais };
  writeFileSync(briefingArquivo, serializarCanonico(briefing), 'utf8');
  return { briefingArquivo, totais: { faces, partes, materiais } };
}

describe('revisar:modelagem', () => {
  it('une a régua e as quatro vistas sem persistir runtime, host ou caminho local', async () => {
    const raiz = mkdtempSync(join(tmpdir(), 'mecanifica-revisao-'));
    try {
      await prepararPacote({ id: 'prova-jardineira', peca: '_jardineira', raizPacotes: raiz });
      const resultado = await revisarPacote({
        id: 'prova-jardineira', revisao: 'r001', raizPacotes: raiz, executarBancada: bancadaFalsa,
      });
      const arquivo = join(resultado.destino, 'revisao.json');
      const conteudo = readFileSync(arquivo, 'utf8');
      expect(conteudo).not.toMatch(/127\.0\.0\.1|[A-Za-z]:\\|"passo"|"host"|timestamp/i);
      expect(JSON.parse(conteudo).vistas.map((vista) => vista.rota)).toEqual([
        'bancada.html?peca=_jardineira&projecao=ortografica',
        'bancada.html?peca=_jardineira&projecao=ortografica&vista=frontal',
        'bancada.html?peca=_jardineira&projecao=ortografica&vista=direita',
        'bancada.html?peca=_jardineira&projecao=ortografica&vista=superior',
      ]);
      expect(existsSync(join(resultado.destino, '.relato-bancada.json'))).toBe(false);
      for (const vista of VISTAS) {
        expect(existsSync(join(resultado.destino, 'vistas', `bancada-_jardineira-${vista}-orto.png`))).toBe(true);
      }
      await expect(revisarPacote({
        id: 'prova-jardineira', revisao: 'r001', raizPacotes: raiz, executarBancada: bancadaFalsa,
      })).rejects.toThrow(/nunca sobrescreve/);
    } finally {
      rmSync(raiz, { recursive: true, force: true });
    }
  }, 20_000);

  it('não publica revisão se a bancada aceitar uma vista inútil', async () => {
    const raiz = mkdtempSync(join(tmpdir(), 'mecanifica-revisao-'));
    try {
      await prepararPacote({ id: 'prova-jardineira', peca: '_jardineira', raizPacotes: raiz });
      await expect(revisarPacote({
        id: 'prova-jardineira', revisao: 'r002', raizPacotes: raiz,
        executarBancada: async ({ peca, vistas, relatorio }) => {
          await bancadaFalsa({ peca, vistas, relatorio });
          const dado = JSON.parse(readFileSync(relatorio, 'utf8'));
          dado.vistas[2].enquadramento.valida = false;
          writeFileSync(relatorio, `${JSON.stringify(dado)}\n`, 'utf8');
        },
      })).rejects.toThrow(/gate de enquadramento/);
      expect(existsSync(join(raiz, 'prova-jardineira', 'revisoes', 'r002'))).toBe(false);
    } finally {
      rmSync(raiz, { recursive: true, force: true });
    }
  }, 20_000);

  it('bloqueia revisão de criação enquanto a fonte canônica ainda não existe', async () => {
    const raiz = mkdtempSync(join(tmpdir(), 'mecanifica-revisao-'));
    try {
      await prepararPacote({
        id: 'criar-suporte', peca: 'suporte-inexistente', modo: 'criacao',
        partesEsperadas: ['base', 'braco'], raizPacotes: raiz,
      });
      await expect(revisarPacote({
        id: 'criar-suporte', revisao: 'r001', raizPacotes: raiz, executarBancada: bancadaFalsa,
      })).rejects.toThrow(/está em criação.*ainda não existe/s);
      expect(existsSync(join(raiz, 'criar-suporte', 'revisoes', 'r001'))).toBe(false);
    } finally {
      rmSync(raiz, { recursive: true, force: true });
    }
  });

  it('trata faces, partes e materiais como limites reais antes de publicar', async () => {
    const raiz = mkdtempSync(join(tmpdir(), 'mecanifica-orcamento-'));
    try {
      await prepararPacote({ id: 'prova-jardineira', peca: '_jardineira', raizPacotes: raiz });
      const { briefingArquivo, totais } = await definirOrcamentoExato(raiz, 'prova-jardineira');
      await expect(revisarPacote({
        id: 'prova-jardineira', revisao: 'r001', raizPacotes: raiz, executarBancada: bancadaFalsa,
      })).resolves.toMatchObject({ destino: expect.stringMatching(/r001$/) });

      const campos = ['faces', 'partes', 'materiais'];
      for (const [indice, campo] of campos.entries()) {
        const briefing = JSON.parse(readFileSync(briefingArquivo, 'utf8'));
        briefing.perfil.orcamento[campo] = totais[campo] - 1;
        writeFileSync(briefingArquivo, serializarCanonico(briefing), 'utf8');
        const nomeRevisao = `r00${indice + 2}`;
        await expect(revisarPacote({
          id: 'prova-jardineira', revisao: nomeRevisao, raizPacotes: raiz, executarBancada: bancadaFalsa,
        })).rejects.toThrow(new RegExp(`orçamento de ${campo} excedido`));
        expect(existsSync(join(raiz, 'prova-jardineira', 'revisoes', nomeRevisao))).toBe(false);
        briefing.perfil.orcamento[campo] = totais[campo];
        writeFileSync(briefingArquivo, serializarCanonico(briefing), 'utf8');
      }
    } finally {
      rmSync(raiz, { recursive: true, force: true });
    }
  }, 20_000);
});
