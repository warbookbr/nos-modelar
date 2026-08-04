// Prova a orquestração atômica entre pacote, descrição headless e vistas da bancada.
import {
  existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync,
} from 'node:fs';
import { EventEmitter } from 'node:events';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it, vi } from 'vitest';
import { prepararPacote } from './preparar-pacote.mjs';
import { executarBancadaPadrao, revisarPacote } from './revisar-pacote.mjs';
import { serializarCanonico } from './formato-pacote.mjs';
import { validarPacoteNoDisco } from './validar-pacote.mjs';
import { VERSAO } from './revisao-modelagem.mjs';

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
  function filhoQueEncerraCom(status, erro = null) {
    const filho = new EventEmitter();
    filho.stdout = new EventEmitter();
    filho.stderr = new EventEmitter();
    process.nextTick(() => {
      filho.stdout.emit('data', 'stdout secreto\n');
      filho.stderr.emit('data', 'stderr secreto\n');
      if (erro) filho.emit('error', erro);
      filho.emit('close', status, null);
    });
    return filho;
  }

  it('preserva timeout, falha de inicialização e recusa sem encaminhar streams', async () => {
    const escrever = vi.spyOn(process.stdout, 'write');
    const erro = vi.spyOn(process.stderr, 'write');
    const pasta = mkdtempSync(join(tmpdir(), 'mecanifica-classificacao-'));
    try {
      const argumentos = { peca: '_jardineira', vistas: pasta, relatorio: join(pasta, 'relatorio.json') };
      const timeout = await executarBancadaPadrao({
        ...argumentos, timeoutMs: 20,
        spawnProcess: () => {
          const filho = new EventEmitter();
          filho.pid = 999999999;
          filho.stdout = new EventEmitter();
          filho.stderr = new EventEmitter();
          setTimeout(() => filho.emit('close', null, 'SIGKILL'), 30);
          return filho;
        },
      });
      const iniciacao = await executarBancadaPadrao({
        ...argumentos,
        spawnProcess: () => filhoQueEncerraCom(null, Object.assign(new Error('ENOENT'), { code: 'ENOENT' })),
      });
      const recusa = await executarBancadaPadrao({
        ...argumentos,
        spawnProcess: () => {
          writeFileSync(argumentos.relatorio, '{}', 'utf8');
          return filhoQueEncerraCom(1);
        },
      });
      expect(timeout.falha.codigo).toBe('bancada_timeout');
      expect(iniciacao.falha.codigo).toBe('bancada_nao_executou');
      expect(recusa.falha.codigo).toBe('bancada_recusou');
      expect(escrever).not.toHaveBeenCalled();
      expect(erro).not.toHaveBeenCalled();
    } finally {
      escrever.mockRestore();
      erro.mockRestore();
      rmSync(pasta, { recursive: true, force: true });
    }
  });

  it('recusa plataforma sem grupos POSIX antes de iniciar a bancada', async () => {
    const spawnProcess = vi.fn();
    const plataforma = vi.spyOn(process, 'platform', 'get').mockReturnValue('win32');
    try {
      const resultado = await executarBancadaPadrao({
        peca: '_jardineira', vistas: 'vistas', relatorio: 'relatorio.json', spawnProcess,
      });
      expect(resultado.falha).toMatchObject({
        categoria: 'ferramenta', codigo: 'bancada_nao_executou',
        mensagem: expect.stringMatching(/requer um ambiente POSIX/),
      });
      expect(spawnProcess).not.toHaveBeenCalled();
    } finally {
      plataforma.mockRestore();
    }
  });

  it('libera timer e listeners depois de sucesso, erro e timeout', async () => {
    const argumentos = { peca: '_jardineira', vistas: 'vistas', relatorio: 'relatorio.json' };
    const filhos = [];
    const criarFilho = (status, erro = null) => {
      const filho = filhoQueEncerraCom(status, erro);
      filhos.push(filho);
      return filho;
    };
    const sucesso = await executarBancadaPadrao({
      ...argumentos, spawnProcess: () => criarFilho(0),
    });
    const falha = await executarBancadaPadrao({
      ...argumentos, spawnProcess: () => criarFilho(null, new Error('falha de spawn')),
    });
    const encerrar = vi.spyOn(process, 'kill').mockImplementation(() => {
      setImmediate(() => filhos[2].emit('close', null, 'SIGKILL'));
      return true;
    });
    try {
      const timeout = await executarBancadaPadrao({
        ...argumentos, timeoutMs: 20, spawnProcess: () => {
          const filho = new EventEmitter();
          filho.pid = 12345;
          filho.stdout = new EventEmitter();
          filho.stderr = new EventEmitter();
          filhos.push(filho);
          return filho;
        },
      });
      expect(sucesso.aceita).toBe(true);
      expect(falha.falha.codigo).toBe('bancada_nao_executou');
      expect(timeout.falha.codigo).toBe('bancada_timeout');
      for (const filho of filhos) {
        expect(filho.listenerCount('close')).toBe(0);
        expect(filho.listenerCount('error')).toBe(0);
        expect(filho.stdout.listenerCount('data')).toBe(0);
        expect(filho.stderr.listenerCount('data')).toBe(0);
      }
    } finally {
      encerrar.mockRestore();
    }
  });

  it('interrompe o processo real quando o prazo injetável expira', async () => {
    let pid;
    const saida = join(process.cwd(), 'tools/bancadas/out');
    mkdirSync(saida, { recursive: true });
    const pasta = mkdtempSync(join(saida, '.mecanifica-subprocesso-'));
    const resultado = await executarBancadaPadrao({
      peca: '_jardineira', vistas: pasta, relatorio: join(pasta, 'relatorio.json'), timeoutMs: 30,
      spawnProcess: (_arquivo, _argumentos, opcoes) => {
        const filho = spawn(process.execPath, ['-e', 'setInterval(() => {}, 10000)'], opcoes);
        pid = filho.pid;
        return filho;
      },
    });
    try {
      expect(resultado.falha.codigo).toBe('bancada_timeout');
      expect(() => process.kill(pid, 0)).toThrow();
    } finally {
      rmSync(pasta, { recursive: true, force: true });
    }
  });

  it('integra revisarPacote com o adaptador padrão e preserva a tentativa de timeout', async () => {
    const raiz = mkdtempSync(join(process.cwd(), 'autoria-assistida/pacotes', '.mecanifica-revisao-timeout-'));
    try {
      await prepararPacote({ id: 'prova-timeout', peca: '_jardineira', raizPacotes: raiz });
      await expect(revisarPacote({
        id: 'prova-timeout', revisao: 'r001', raizPacotes: raiz,
        tempoLimiteMs: 30,
      })).rejects.toThrow(/classificação: ferramenta/s);
      const tentativas = readdirSync(join(raiz, 'prova-timeout', 'tentativas'));
      const tentativa = JSON.parse(readFileSync(join(
        raiz, 'prova-timeout', 'tentativas', tentativas[0], 'tentativa.json',
      ), 'utf8'));
      expect(tentativa.falhas).toEqual([expect.objectContaining({
        categoria: 'ferramenta', codigo: 'bancada_timeout',
      })]);
      expect(existsSync(join(raiz, 'prova-timeout', 'revisoes', 'r001'))).toBe(false);
    } finally {
      rmSync(raiz, { recursive: true, force: true });
    }
  }, 20_000);

  it('o caminho reutilizável não encaminha stdout comum da bancada', async () => {
    const raiz = mkdtempSync(join(tmpdir(), 'mecanifica-revisao-'));
    const escrever = vi.spyOn(process.stdout, 'write');
    try {
      await prepararPacote({ id: 'prova-silenciosa', peca: '_jardineira', raizPacotes: raiz });
      await revisarPacote({
        id: 'prova-silenciosa', revisao: 'r001', raizPacotes: raiz, executarBancada: bancadaFalsa,
      });
      expect(escrever).not.toHaveBeenCalled();
    } finally {
      escrever.mockRestore();
      rmSync(raiz, { recursive: true, force: true });
    }
  });

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
      const revisao = JSON.parse(conteudo);
      expect(revisao.versao).toBe(VERSAO);
      expect(revisao.modelo.geometria).toMatchObject({
        algoritmo: 'malha-canonica-v1',
        partes: expect.arrayContaining([expect.objectContaining({ assinatura: expect.stringMatching(/^sha256:[a-f0-9]{64}$/) })]),
      });
      expect(revisao.modelo.geometria.partes[0]).toEqual({
        nome: expect.any(String), assinatura: expect.any(String),
      });
      expect(revisao.vistas.map((vista) => vista.rota)).toEqual([
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

  it('preserva imagens e diagnóstico de câmera sem publicar a revisão recusada', async () => {
    const raiz = mkdtempSync(join(tmpdir(), 'mecanifica-revisao-'));
    try {
      await prepararPacote({ id: 'prova-jardineira', peca: '_jardineira', raizPacotes: raiz });
      const bancadaComVistaInvalida = async ({ peca, vistas, relatorio }) => {
        await bancadaFalsa({ peca, vistas, relatorio });
        const dado = JSON.parse(readFileSync(relatorio, 'utf8'));
        dado.resultado = 'recusada';
        dado.falhas = [{
          categoria: 'camera', codigo: 'enquadramento_pequeno', vista: 'direita',
          mensagem: 'A câmera deixou a peça pequena demais para revisão.',
          acao: 'Corrija o enquadramento sem alterar a geometria.',
        }];
        dado.vistas[2].enquadramento.valida = false;
        writeFileSync(relatorio, `${JSON.stringify(dado)}\n`, 'utf8');
        return { aceita: false, falha: null };
      };
      await expect(revisarPacote({
        id: 'prova-jardineira', revisao: 'r002', raizPacotes: raiz,
        executarBancada: bancadaComVistaInvalida,
      })).rejects.toThrow(/preservada.*classificação: camera/s);
      expect(existsSync(join(raiz, 'prova-jardineira', 'revisoes', 'r002'))).toBe(false);
      const pastaTentativas = join(raiz, 'prova-jardineira', 'tentativas');
      const ids = readdirSync(pastaTentativas);
      expect(ids).toHaveLength(1);
      expect(ids[0]).toMatch(/^[a-f0-9]{64}$/);
      const tentativa = join(pastaTentativas, ids[0]);
      const manifestoTexto = readFileSync(join(tentativa, 'tentativa.json'), 'utf8');
      expect(manifestoTexto).not.toMatch(/[A-Za-z]:\\|127\.0\.0\.1|timestamp|em-preparo/i);
      const manifesto = JSON.parse(manifestoTexto);
      expect(manifesto).toMatchObject({
        formato: 'mecanifica.tentativa-revisao', resultado: 'recusada', revisaoSolicitada: 'r002',
        falhas: [{ categoria: 'camera', codigo: 'enquadramento_pequeno', vista: 'direita' }],
      });
      expect(manifesto.vistas).toHaveLength(4);
      for (const vista of VISTAS) {
        expect(existsSync(join(tentativa, 'vistas', `bancada-_jardineira-${vista}-orto.png`))).toBe(true);
      }

      const antes = readFileSync(join(tentativa, 'tentativa.json'), 'utf8');
      await expect(revisarPacote({
        id: 'prova-jardineira', revisao: 'r002', raizPacotes: raiz,
        executarBancada: bancadaComVistaInvalida,
      })).rejects.toThrow(/já estava preservada/);
      expect(readdirSync(pastaTentativas)).toEqual(ids);
      expect(readFileSync(join(tentativa, 'tentativa.json'), 'utf8')).toBe(antes);

      await expect(revisarPacote({
        id: 'prova-jardineira', revisao: 'r002', raizPacotes: raiz, executarBancada: bancadaFalsa,
      })).resolves.toMatchObject({ destino: expect.stringMatching(/r002$/) });
    } finally {
      rmSync(raiz, { recursive: true, force: true });
    }
  }, 20_000);

  it('classifica falha sem relatório como ferramenta e conserva a assinatura do modelo', async () => {
    const raiz = mkdtempSync(join(tmpdir(), 'mecanifica-revisao-'));
    try {
      await prepararPacote({ id: 'prova-jardineira', peca: '_jardineira', raizPacotes: raiz });
      await expect(revisarPacote({
        id: 'prova-jardineira', revisao: 'r001', raizPacotes: raiz,
        executarBancada: async () => ({
          aceita: false,
          falha: {
            categoria: 'ferramenta', codigo: 'bancada_timeout', vista: null,
            mensagem: 'A captura excedeu o limite.', acao: 'Repita sem remodelar.',
          },
        }),
      })).rejects.toThrow(/falha é da ferramenta.*classificação: ferramenta/s);
      const [idTentativa] = readdirSync(join(raiz, 'prova-jardineira', 'tentativas'));
      const tentativa = JSON.parse(readFileSync(
        join(raiz, 'prova-jardineira', 'tentativas', idTentativa, 'tentativa.json'), 'utf8',
      ));
      expect(tentativa.assinaturaModelo).toBe(`sha256:${idTentativa}`);
      expect(tentativa.falhas).toEqual([expect.objectContaining({
        categoria: 'ferramenta', codigo: 'bancada_timeout',
      })]);
      expect(existsSync(join(raiz, 'prova-jardineira', 'revisoes', 'r001'))).toBe(false);
    } finally {
      rmSync(raiz, { recursive: true, force: true });
    }
  });

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
