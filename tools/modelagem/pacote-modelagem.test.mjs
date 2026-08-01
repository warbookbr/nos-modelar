/* pacote-modelagem.test.mjs — marco 1: bytes reprodutíveis e recusa explícita
   para tudo que faria uma IA trabalhar com contexto frágil ou posicional. */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import {
  ErroDePacote, LIMITE_CHECKLIST, LIMITE_GUIAS, LIMITE_REFERENCIAS,
  serializarCanonico, validarPacote,
} from './formato-pacote.mjs';
import { prepararPacote } from './preparar-pacote.mjs';
import { validarPacoteNoDisco } from './validar-pacote.mjs';

const PARTES = ['bulbo', 'caule', 'caixa', 'flor', 'folhagem', 'terra'];

function base() {
  return {
    formato: 'mecanifica.pacote-modelagem',
    versao: 1,
    id: 'prova-jardineira',
    alvo: { modo: 'refinamento', peca: '_jardineira', caminho: 'prototipos/fps/v3/pecas/_jardineira.js' },
    objetivo: 'Conferir volumes, transições e leitura da jardineira.',
    perfil: {
      visual: 'tecnicoDidatico',
      fidelidade: 'F2',
      precisao: 'mecanica',
      interacao: 'montagem',
      distanciaMinima: 0.5,
      orcamento: { faces: 2000 },
      origem: 'suposicao-canonica',
    },
    partesEsperadas: ['caixa', 'terra', 'bulbo'],
    guias: [
      'forma/silhueta-e-transicoes',
      'material/leitura-de-material',
      'processo/evidencia-e-iteracao',
    ],
    checklist: [
      { id: 'silhueta', prioridade: 1, estado: 'aberto', criterio: 'A silhueta é legível nas vistas canônicas.' },
    ],
    provas: ['descricao-headless'],
  };
}
function referencias() {
  return {
    formato: 'mecanifica.referencias-modelagem',
    versao: 1,
    ausenciaDeclarada: true,
    referencias: [],
  };
}
function esperarFalha(briefing, refs = referencias()) {
  expect(() => validarPacote(briefing, refs, { partesDisponiveis: PARTES })).toThrow(ErroDePacote);
}
function sha256(conteudo) {
  return `sha256:${createHash('sha256').update(conteudo).digest('hex')}`;
}
function referencia({ localizador, hash = null, sustenta = [] }) {
  return {
    formato: 'mecanifica.referencias-modelagem', versao: 1, ausenciaDeclarada: false,
    referencias: [{
      id: 'referencia-local', localizador, descricao: 'Referência para conferência.', hash, sustenta,
    }],
  };
}

describe('pacote de modelagem v1', () => {
  it('canonicaliza objetos em qualquer ordem para os mesmos bytes', () => {
    const a = base();
    const b = {
      provas: a.provas,
      checklist: a.checklist,
      guias: a.guias,
      partesEsperadas: a.partesEsperadas,
      perfil: a.perfil,
      objetivo: a.objetivo,
      alvo: { caminho: a.alvo.caminho, modo: a.alvo.modo, peca: a.alvo.peca },
      id: a.id,
      versao: a.versao,
      formato: a.formato,
    };
    expect(serializarCanonico(a)).toBe(serializarCanonico(b));
    expect(validarPacote(a, referencias(), { partesDisponiveis: PARTES }).bytes).toBeGreaterThan(0);
  });

  it('prepara duas vezes a mesma entrada em raízes limpas com bytes idênticos e sem sobrescrever', async () => {
    const temporario = mkdtempSync(join(tmpdir(), 'mecanifica-pacote-'));
    const primeira = join(temporario, 'primeira');
    const segunda = join(temporario, 'segunda');
    try {
      const a = await prepararPacote({ id: 'prova-jardineira', peca: '_jardineira', raizPacotes: primeira });
      const b = await prepararPacote({ id: 'prova-jardineira', peca: '_jardineira', raizPacotes: segunda });
      expect(readFileSync(join(a.destino, 'briefing.json'), 'utf8'))
        .toBe(readFileSync(join(b.destino, 'briefing.json'), 'utf8'));
      expect(readFileSync(join(a.destino, 'referencias.json'), 'utf8'))
        .toBe(readFileSync(join(b.destino, 'referencias.json'), 'utf8'));
      await expect(prepararPacote({ id: 'prova-jardineira', peca: '_jardineira', raizPacotes: primeira }))
        .rejects.toThrow(/nunca sobrescreve/);
      await expect(validarPacoteNoDisco('prova-jardineira', { raizPacotes: primeira }))
        .resolves.toMatchObject({ peca: '_jardineira' });
    } finally {
      rmSync(temporario, { recursive: true, force: true });
    }
  });

  it('prepara criação sem importar alvo inexistente e preserva as partes semânticas declaradas', async () => {
    const temporario = mkdtempSync(join(tmpdir(), 'mecanifica-criacao-'));
    const segunda = mkdtempSync(join(tmpdir(), 'mecanifica-criacao-'));
    try {
      const opcoes = {
        id: 'criar-suporte', peca: 'suporte-inexistente', modo: 'criacao',
        partesEsperadas: ['base', 'braco', 'pino'],
      };
      const a = await prepararPacote({ ...opcoes, raizPacotes: temporario });
      const b = await prepararPacote({ ...opcoes, raizPacotes: segunda });
      expect(a.briefing.alvo).toEqual({
        caminho: 'prototipos/fps/v3/pecas/suporte-inexistente.js', modo: 'criacao', peca: 'suporte-inexistente',
      });
      expect(a.briefing.partesEsperadas).toEqual(['base', 'braco', 'pino']);
      expect(readFileSync(join(a.destino, 'briefing.json'), 'utf8'))
        .toBe(readFileSync(join(b.destino, 'briefing.json'), 'utf8'));
      await expect(validarPacoteNoDisco('criar-suporte', { raizPacotes: temporario }))
        .resolves.toMatchObject({ modo: 'criacao', alvo: null, partes: ['base', 'braco', 'pino'] });
    } finally {
      rmSync(temporario, { recursive: true, force: true });
      rmSync(segunda, { recursive: true, force: true });
    }
  });

  it('mantém refinamento estrito e recusa confundir modo com partes planejadas', async () => {
    const semModo = base();
    delete semModo.alvo.modo;
    esperarFalha(semModo);

    const modoInvalido = base();
    modoInvalido.alvo.modo = 'misto';
    esperarFalha(modoInvalido);

    const criacao = base();
    criacao.alvo = {
      caminho: 'prototipos/fps/v3/pecas/suporte-inexistente.js', modo: 'criacao', peca: 'suporte-inexistente',
    };
    criacao.partesEsperadas = ['base', 'braco'];
    /* Sem fonte, a criação só valida o contrato; quando há descrição, a
       mesma lista fica estrita como no refinamento. */
    expect(validarPacote(criacao, referencias()).modo).toBe('criacao');
    expect(() => validarPacote(criacao, referencias(), { partesDisponiveis: ['base'] }))
      .toThrow(/braco.*descrição headless/s);

    const temporario = mkdtempSync(join(tmpdir(), 'mecanifica-criacao-'));
    try {
      await expect(prepararPacote({
        id: 'sem-partes', peca: 'suporte-inexistente', modo: 'criacao', raizPacotes: temporario,
      })).rejects.toThrow(/exige partesEsperadas/);
      await expect(prepararPacote({
        id: 'refinamento-com-plano', peca: '_jardineira', modo: 'refinamento', partesEsperadas: ['nova-parte'], raizPacotes: temporario,
      })).rejects.toThrow(/só pode ser declarada no modo criacao/);
      await expect(prepararPacote({
        id: 'criacao-sobre-existente', peca: '_jardineira', modo: 'criacao', partesEsperadas: ['caixa'], raizPacotes: temporario,
      })).rejects.toThrow(/já existe; use modo refinamento/);

      /* Um pacote de criação antigo pode chegar à revisão depois de a fonte
         existir. Nesse ponto ele não ganha exceção: a descrição confere cada
         parte prometida. */
      const chegouARevisao = base();
      chegouARevisao.id = 'criacao-que-ja-existe';
      chegouARevisao.alvo.modo = 'criacao';
      chegouARevisao.partesEsperadas = ['caixa', 'parte-inventada'];
      const pasta = join(temporario, chegouARevisao.id);
      mkdirSync(pasta);
      writeFileSync(join(pasta, 'briefing.json'), serializarCanonico(chegouARevisao), 'utf8');
      writeFileSync(join(pasta, 'referencias.json'), serializarCanonico(referencias()), 'utf8');
      await expect(validarPacoteNoDisco(chegouARevisao.id, { raizPacotes: temporario }))
        .rejects.toThrow(/parte-inventada.*descrição headless/s);
    } finally {
      rmSync(temporario, { recursive: true, force: true });
    }
  });

  it('falha fechado em excesso de contexto, IDs repetidos e identidade posicional', () => {
    const refsDemais = referencias();
    refsDemais.ausenciaDeclarada = false;
    refsDemais.referencias = Array.from({ length: LIMITE_REFERENCIAS + 1 }, (_, i) => ({
      id: `ref-${i}`, localizador: `https://exemplo.test/${i}`, descricao: 'Imagem externa.', hash: null, sustenta: [],
    }));
    esperarFalha(base(), refsDemais);

    const guiasDemais = base();
    guiasDemais.guias = Array.from({ length: LIMITE_GUIAS + 1 }, () => 'forma/silhueta-e-transicoes');
    esperarFalha(guiasDemais);

    const checklistDemais = base();
    checklistDemais.checklist = Array.from({ length: LIMITE_CHECKLIST + 1 }, (_, i) => ({
      id: `item-${i}`, prioridade: i + 1, estado: 'aberto', criterio: `Critério ${i}.`,
    }));
    esperarFalha(checklistDemais);

    const muitoGrande = base();
    muitoGrande.objetivo = 'ç'.repeat(13_000);
    expect(() => validarPacote(muitoGrande, referencias(), { partesDisponiveis: PARTES }))
      .toThrow(/limite é 24576 bytes/);

    const repetido = base();
    repetido.partesEsperadas = ['caixa', 'caixa'];
    esperarFalha(repetido);

    const posicional = base();
    posicional.partesEsperadas = ['face:12'];
    esperarFalha(posicional);
  });

  it('falha fechado em localizador frágil, hash ausente e parte que a régua não encontra', () => {
    const semHash = referencias();
    semHash.ausenciaDeclarada = false;
    semHash.referencias = [{
      id: 'vista-frontal', localizador: 'https://exemplo.test/vista.png', descricao: 'Vista frontal.', hash: null, sustenta: ['aceite'],
    }];
    esperarFalha(base(), semHash);

    const temp = referencias();
    temp.ausenciaDeclarada = false;
    temp.referencias = [{
      id: 'vista-frontal', localizador: 'repo://C:/Users/tiago/AppData/Local/Temp/vista.png', descricao: 'Vista frontal.', hash: null, sustenta: [],
    }];
    esperarFalha(base(), temp);

    const uuid = base();
    uuid.id = '550e8400-e29b-41d4-a716-446655440000';
    esperarFalha(uuid);

    const inexistente = base();
    inexistente.partesEsperadas = ['asa'];
    esperarFalha(inexistente);
  });

  it('resolve repo:// somente dentro da raiz, exige arquivo regular e confere seu SHA-256', () => {
    const raiz = mkdtempSync(join(tmpdir(), 'mecanifica-referencias-raiz-'));
    const fora = mkdtempSync(join(tmpdir(), 'mecanifica-referencias-fora-'));
    try {
      mkdirSync(join(raiz, 'referencias'));
      const arquivo = join(raiz, 'referencias', 'roda.png');
      writeFileSync(arquivo, 'referência local estável', 'utf8');
      const hash = sha256(readFileSync(arquivo));
      const opcoes = { partesDisponiveis: PARTES, raizRepositorio: raiz };

      expect(validarPacote(base(), referencia({
        localizador: 'repo://referencias/roda.png', hash, sustenta: ['aceite'],
      }), opcoes)).toMatchObject({ peca: '_jardineira' });

      expect(() => validarPacote(base(), referencia({
        localizador: 'repo://referencias/roda.png', hash: sha256('outro conteúdo'), sustenta: [],
      }), opcoes)).toThrow(/hash SHA-256 diverge/);
      expect(() => validarPacote(base(), referencia({
        localizador: 'repo://referencias/inexistente.png', hash: null,
      }), opcoes)).toThrow(/arquivo inexistente/);
      expect(() => validarPacote(base(), referencia({
        localizador: 'repo://referencias', hash: null,
      }), opcoes)).toThrow(/arquivo regular/);
      expect(() => validarPacote(base(), referencia({
        localizador: 'repo://../fora.png', hash: null,
      }), opcoes)).toThrow(/caminho relativo canônico/);
      expect(() => validarPacote(base(), referencia({
        localizador: 'repo:///fora.png', hash: null,
      }), opcoes)).toThrow(/caminho relativo canônico/);

      writeFileSync(join(fora, 'segredo.png'), 'fora da raiz', 'utf8');
      symlinkSync(fora, join(raiz, 'atalho-externo'), 'junction');
      expect(() => validarPacote(base(), referencia({
        localizador: 'repo://atalho-externo/segredo.png', hash: null,
      }), opcoes)).toThrow(/symlink ou junction para fora/);
    } finally {
      rmSync(raiz, { recursive: true, force: true });
      rmSync(fora, { recursive: true, force: true });
    }
  });

  it('trata hash https como compromisso externo e nunca baixa a referência', () => {
    /* O host deliberadamente inexistente prova que validarPacote só valida o
       compromisso declarado: baixar HTTPS faria este teste depender da rede. */
    const externo = referencia({
      localizador: 'https://host-que-nao-deve-ser-acessado.invalid/roda.png',
      hash: `sha256:${'0'.repeat(64)}`,
      sustenta: ['medida', 'aceite'],
    });
    expect(validarPacote(base(), externo, { partesDisponiveis: PARTES }))
      .toMatchObject({ peca: '_jardineira' });
  });

  it('faz validarPacoteNoDisco conferir repo:// pela raiz de repositório injetada', async () => {
    const raiz = mkdtempSync(join(tmpdir(), 'mecanifica-referencias-disco-'));
    try {
      mkdirSync(join(raiz, 'referencias'));
      const arquivo = join(raiz, 'referencias', 'croqui.png');
      writeFileSync(arquivo, 'croqui local', 'utf8');
      const briefing = base();
      briefing.id = 'criacao-com-referencia-local';
      briefing.alvo = {
        caminho: 'prototipos/fps/v3/pecas/suporte-inexistente.js', modo: 'criacao', peca: 'suporte-inexistente',
      };
      briefing.partesEsperadas = ['base', 'braco'];
      const pasta = join(raiz, 'pacotes', briefing.id);
      mkdirSync(pasta, { recursive: true });
      writeFileSync(join(pasta, 'briefing.json'), serializarCanonico(briefing), 'utf8');
      writeFileSync(join(pasta, 'referencias.json'), serializarCanonico(referencia({
        localizador: 'repo://referencias/croqui.png', hash: sha256(readFileSync(arquivo)), sustenta: ['medida'],
      })), 'utf8');

      await expect(validarPacoteNoDisco(briefing.id, {
        raizPacotes: join(raiz, 'pacotes'), raizRepositorio: raiz,
      })).resolves.toMatchObject({ modo: 'criacao', peca: 'suporte-inexistente', alvo: null });
    } finally {
      rmSync(raiz, { recursive: true, force: true });
    }
  });

  it('exige os cinco eixos documentados, incluindo orçamento positivo', () => {
    const visualInvalido = base();
    visualInvalido.perfil.visual = 'tecnico-procedural';
    esperarFalha(visualInvalido);

    const distanciaInvalida = base();
    distanciaInvalida.perfil.distanciaMinima = -0.1;
    esperarFalha(distanciaInvalida);

    const orcamentoInvalido = base();
    orcamentoInvalido.perfil.orcamento = { faces: 0, partes: 6, materiais: 3 };
    esperarFalha(orcamentoInvalido);

    const semOrigem = base();
    delete semOrigem.perfil.origem;
    esperarFalha(semOrigem);
  });

  it('recusa arquivo fora da forma canônica antes de aceitar o alvo', async () => {
    const temporario = mkdtempSync(join(tmpdir(), 'mecanifica-pacote-'));
    try {
      const criado = await prepararPacote({ id: 'prova-jardineira', peca: '_jardineira', raizPacotes: temporario });
      const arquivo = join(criado.destino, 'briefing.json');
      writeFileSync(arquivo, `${readFileSync(arquivo, 'utf8')} `, 'utf8');
      await expect(validarPacoteNoDisco('prova-jardineira', { raizPacotes: temporario }))
        .rejects.toThrow(/não está canonicalizado/);
    } finally {
      rmSync(temporario, { recursive: true, force: true });
    }
  });

  it('confere as partes esperadas contra a peça realmente construída, não contra texto do pacote', async () => {
    const temporario = mkdtempSync(join(tmpdir(), 'mecanifica-pacote-'));
    try {
      const criado = await prepararPacote({ id: 'prova-jardineira', peca: '_jardineira', raizPacotes: temporario });
      const arquivo = join(criado.destino, 'briefing.json');
      const briefing = JSON.parse(readFileSync(arquivo, 'utf8'));
      briefing.partesEsperadas = ['caixa', 'parte-inventada'];
      writeFileSync(arquivo, serializarCanonico(briefing), 'utf8');
      await expect(validarPacoteNoDisco('prova-jardineira', { raizPacotes: temporario }))
        .rejects.toThrow(/parte-inventada.*descrição headless/s);
    } finally {
      rmSync(temporario, { recursive: true, force: true });
    }
  });

  it('registra o padrão canônico completo quando prepara uma tarefa sem perfil declarado', async () => {
    const temporario = mkdtempSync(join(tmpdir(), 'mecanifica-pacote-'));
    try {
      const criado = await prepararPacote({ id: 'prova-jardineira', peca: '_jardineira', raizPacotes: temporario });
      expect(criado.briefing.perfil).toEqual({
        visual: 'tecnicoDidatico', fidelidade: 'F2', precisao: 'mecanica', interacao: 'montagem',
        distanciaMinima: 0.5, orcamento: { faces: 2000 }, origem: 'suposicao-canonica',
      });
    } finally {
      rmSync(temporario, { recursive: true, force: true });
    }
  });
});
