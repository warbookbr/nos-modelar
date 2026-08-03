/* interfaces-montagem.test.ts — provas do Recorte A de AUT-05: interfaces
   cilíndricas persistidas pelo núcleo e encaixe estritamente mensurável. */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — núcleo legado em JavaScript, exercitado pela API pública.
import { nucleo } from '../../prototipos/fps/v3/motor/oficina.js';
// @ts-expect-error — fixture em JavaScript, exercitada pela API pública.
import { montarPinoELuva } from '../../prototipos/fps/v3/montagens/pino-e-luva.js';
// @ts-expect-error — montagem piloto em JavaScript, exercitada pela API pública.
import { montarRodaNoFreio, montarAroNoPneu } from '../../prototipos/fps/v3/montagens/roda-no-freio.js';
// @ts-expect-error — fixture neutra em JavaScript, exercitada pela API pública.
import { montarAnelEFaixa } from '../../prototipos/fps/v3/montagens/anel-e-faixa.js';
// @ts-expect-error — módulo de autoria em JavaScript, exercitado pela API pública.
import { resolverPortasDeMontagem, validarEncaixeCilindrico, avaliarEstadoDeEncaixeCilindrico, classificarContatoLocalCilindrico, diagnosticarEncaixeCilindrico, formatarDiagnosticoDeEncaixe, validarAssentamentoAnular, diagnosticarAssentamentoAnular, formatarDiagnosticoDeAssentamentoAnular, derivarPreviaDeEncaixeCilindrico, aplicarPreviaDePose } from '../../src/autoria/interfaces-montagem.js';

const resolver = (montagem: any) => resolverPortasDeMontagem(montagem.instancias);
const clonarPortas = (portas: Map<string, any>) => new Map([...portas].map(([id, porta]) => [id, JSON.parse(JSON.stringify(porta))]));

describe('interfaces mensuráveis de encaixe — AUT-2026-06', () => {
  it('porta sem interface preserva a forma histórica; a interface resolve parâmetros e não guarda referência do passo', () => {
    const passos: any = [
      ['cilindro', { origemId: 1, raio: 'r', altura: 0.02, lados: 8 }],
      ['publicarPorta', { nome: 'antiga', de: { op: 'cilindro', id: 1 } }],
      ['publicarPorta', {
        nome: 'nova', de: { op: 'cilindro', id: 1 },
        interface: { forma: 'cilindro', papel: 'externa', eixo: [2, 0, 0], centro: [0, 0, 0], raio: 'r', inicio: 0, fim: 0.02 },
      }],
    ];
    const neutro = nucleo(passos, { r: 0.01 });
    expect(neutro.portas.get('antiga')).toEqual({ nome: 'antiga', de: { op: 'cilindro', id: 1 }, passo: 1 });
    expect(neutro.portas.get('nova')?.interface).toEqual({
      forma: 'cilindro', papel: 'externa', eixo: [1, 0, 0], centro: [0, 0, 0], raio: 0.01, inicio: 0, fim: 0.02,
    });
    expect(neutro.portas.get('nova')?.interface).not.toBe(passos[2][1].interface);
  });

  it('recusa interface incompleta antes de ela virar dado de montagem', () => {
    const neutro = nucleo([
      ['cilindro', { origemId: 1, raio: 0.01, altura: 0.02, lados: 8 }],
      ['publicarPorta', { nome: 'ruim', de: { op: 'cilindro', id: 1 }, interface: { forma: 'cilindro', papel: 'externa' } }],
    ] as any);
    expect(neutro.orfaos).toHaveLength(1);
    expect(neutro.orfaos[0].motivo).toMatch(/interface exige 'eixo'/);
    expect(neutro.portas.size).toBe(0);
  });

  it('pino e luva passam sem vocabulário automotivo', () => {
    const montagem = montarPinoELuva();
    const resultado = validarEncaixeCilindrico(montagem.relacao, resolver(montagem));
    expect(resultado.satisfeita).toBe(true);
    expect(resultado.medidas.folgaRadial).toBeCloseTo(0.002, 9);
    expect(resultado.diagnosticos).toEqual([]);
  });

  it('roda e cubo publicam a razão do encaixe na pose que já existe', () => {
    const montagem = montarRodaNoFreio();
    const portas = resolver(montagem);
    const resultado = validarEncaixeCilindrico(montagem.relacao, portas);
    expect(resultado).toMatchObject({
      id: 'rodaNoCubo', satisfeita: true,
      referencia: 'freio.pilotoDaRoda', movel: 'roda.cavidadeDoCubo',
    });
    expect(resultado.medidas.folgaRadial).toBeCloseTo(0.00305, 9);
    expect(resultado.medidas.sobreposicaoAxial).toBeGreaterThan(0);
    expect(formatarDiagnosticoDeEncaixe(resultado)).toContain('medição: aprovada');
  });

  it('raio fora da faixa e piloto axialmente fora falham com causas diferentes', () => {
    const montagem = montarRodaNoFreio();
    const portas = resolver(montagem);
    const radial = clonarPortas(portas);
    radial.get('freio.pilotoDaRoda').raio += 0.01;
    expect(validarEncaixeCilindrico(montagem.relacao, radial).diagnosticos.map((d: any) => d.codigo))
      .toContain('folga-radial-fora');

    const axial = clonarPortas(portas);
    axial.get('freio.pilotoDaRoda').centro[0] += 1;
    const resultadoAxial = validarEncaixeCilindrico(montagem.relacao, axial);
    expect(resultadoAxial.diagnosticos.map((d: any) => d.codigo)).toContain('intervalo-axial-fora');
    expect(resultadoAxial.diagnosticos.map((d: any) => d.codigo)).not.toContain('folga-radial-fora');
  });

  it('direção e descentro não são corrigidos em silêncio nem mutam a pose', () => {
    const montagem = montarPinoELuva();
    const portas = resolver(montagem);
    const antes = JSON.stringify([...portas]);
    const invertida = validarEncaixeCilindrico({ ...montagem.relacao, referencia: 'luva.cavidade', movel: 'pino.piloto' }, portas);
    expect(invertida.diagnosticos.map((d: any) => d.codigo)).toContain('direcao-incompativel');
    const deslocada = clonarPortas(portas);
    deslocada.get('pino.piloto').centro[0] += 0.01;
    expect(validarEncaixeCilindrico(montagem.relacao, deslocada).diagnosticos.map((d: any) => d.codigo))
      .toContain('eixos-descentrados');
    expect(JSON.stringify([...portas])).toBe(antes);
  });
});

describe('pose derivada de uma relação — AUT-2026-07', () => {
  const derivarEAplicar = (montagem: any) => {
    const previa = derivarPreviaDeEncaixeCilindrico(montagem.relacao, resolver(montagem));
    expect(previa.aplicavel).toBe(true);
    const instancias = aplicarPreviaDePose(montagem.instancias, previa);
    return { previa, instancias, resultado: validarEncaixeCilindrico(montagem.relacao, resolverPortasDeMontagem(instancias)) };
  };

  it('normaliza o vetor de referência e recusa quadro degenerado no núcleo', () => {
    const boa = nucleo([
      ['cilindro', { origemId: 1, raio: 0.01, altura: 0.02, lados: 8 }],
      ['publicarPorta', {
        nome: 'quadro', de: { op: 'cilindro', id: 1 },
        interface: { forma: 'cilindro', papel: 'externa', eixo: [2, 0, 0], referencia: [0, 3, 0], centro: [0, 0, 0], raio: 0.01, inicio: 0, fim: 0.02 },
      }],
    ] as any);
    expect(boa.portas.get('quadro')?.interface.referencia).toEqual([0, 1, 0]);
    const ruim = nucleo([
      ['cilindro', { origemId: 1, raio: 0.01, altura: 0.02, lados: 8 }],
      ['publicarPorta', {
        nome: 'ruim', de: { op: 'cilindro', id: 1 },
        interface: { forma: 'cilindro', papel: 'externa', eixo: [1, 0, 0], referencia: [1, 0, 0], centro: [0, 0, 0], raio: 0.01, inicio: 0, fim: 0.02 },
      }],
    ] as any);
    expect(ruim.orfaos[0].motivo).toMatch(/referencia precisa ser perpendicular/);
  });

  it('três poses iniciais da luva chegam à mesma pose canônica e passam pela régua existente', () => {
    const poses = [
      {},
      { deslocamento: [0.02, 0.03, -0.01] },
      { rotacao: [[0, 0, 1], [0, 1, 0], [-1, 0, 0]], deslocamento: [-0.04, 0.08, 0.06] },
    ];
    const finais = poses.map((pose) => {
      const montagem = montarPinoELuva();
      montagem.instancias[1] = { ...montagem.instancias[1], ...pose };
      const pronto = derivarEAplicar(montagem);
      expect(pronto.resultado.satisfeita).toBe(true);
      return pronto.previa.previa;
    });
    for (const final of finais.slice(1)) {
      expect(final.escala).toBe(finais[0].escala);
      final.deslocamento.forEach((valor: number, i: number) => expect(valor).toBeCloseTo(finais[0].deslocamento[i], 9));
      final.rotacao.flat().forEach((valor: number, i: number) => expect(valor).toBeCloseTo(finais[0].rotacao.flat()[i], 9));
    }
  });

  it('repetir a prévia é idempotente e roda/cubo chega a uma pose validável', () => {
    const baseline = derivarEAplicar(montarRodaNoFreio());
    expect(baseline.previa.previa.deslocamento).toEqual([0, 0, 0]);
    expect(baseline.previa.previa.rotacao).toEqual([[1, 0, 0], [0, 1, 0], [0, 0, 1]]);
    const roda = montarRodaNoFreio();
    roda.instancias[1] = { ...roda.instancias[1], deslocamento: [0.2, -0.1, 0.04] };
    const primeira = derivarEAplicar(roda);
    expect(primeira.resultado.satisfeita).toBe(true);
    const segundaMontagem = { ...roda, instancias: primeira.instancias };
    const segunda = derivarEAplicar(segundaMontagem);
    expect(segunda.previa.previa).toEqual(primeira.previa.previa);
  });

  it('quadro ausente devolve recusa estruturada e não altera a montagem', () => {
    const montagem = montarPinoELuva();
    const portas = resolver(montagem);
    delete (portas.get('luva.cavidade') as any).referencia;
    const antes = JSON.stringify(montagem);
    const previa = derivarPreviaDeEncaixeCilindrico(montagem.relacao, portas);
    expect(previa).toMatchObject({ aplicavel: false, diagnosticos: [{ codigo: 'quadro-incompleto' }] });
    expect(JSON.stringify(montagem)).toBe(antes);
  });

  it('recusa reflexão e não oferece escala não uniforme como atalho de pose', () => {
    const montagem = montarPinoELuva();
    montagem.instancias[1] = { ...montagem.instancias[1], rotacao: [[-1, 0, 0], [0, 1, 0], [0, 0, 1]] };
    expect(() => resolver(montagem)).toThrow(/rotação própria/);
    montagem.instancias[1] = { ...montagem.instancias[1], escala: [1, 2, 1] };
    expect(() => resolver(montagem)).toThrow(/número finito > 0/);
  });
});

describe('pose local em referencial técnico — AUT-2026-08', () => {
  const rotacaoY90 = [[0, 0, 1], [0, 1, 0], [-1, 0, 0]];
  const referencial = { rotacao: rotacaoY90, deslocamento: [0.8, -0.3, 0.4] };

  it('três poses locais no mesmo referencial chegam à mesma pose mundial do encaixe', () => {
    const semReferencial = montarPinoELuva();
    semReferencial.instancias[1] = { ...semReferencial.instancias[1], deslocamento: [0.02, -0.06, 0.04] };
    const esperado = derivarPreviaDeEncaixeCilindrico(semReferencial.relacao, resolver(semReferencial));
    expect(esperado.aplicavel).toBe(true);

    const poses = [
      {},
      { deslocamento: [-0.1, 0.08, 0.04] },
      { rotacao: rotacaoY90, deslocamento: [0.02, -0.05, 0.09] },
    ];
    const finais = poses.map((pose) => {
      const montagem = montarPinoELuva();
      montagem.instancias[1] = { ...montagem.instancias[1], ...pose, referencial };
      const previa = derivarPreviaDeEncaixeCilindrico(montagem.relacao, resolver(montagem));
      expect(previa.aplicavel).toBe(true);
      const instancias = aplicarPreviaDePose(montagem.instancias, previa);
      expect(instancias[1].referencial).toEqual(referencial);
      expect(validarEncaixeCilindrico(montagem.relacao, resolverPortasDeMontagem(instancias)).satisfeita).toBe(true);
      previa.previa.mundo.deslocamento.forEach((valor: number, i: number) => expect(valor).toBeCloseTo(esperado.previa.mundo.deslocamento[i], 9));
      previa.previa.mundo.rotacao.flat().forEach((valor: number, i: number) => expect(valor).toBeCloseTo(esperado.previa.mundo.rotacao.flat()[i], 9));
      return previa.previa;
    });
    for (const final of finais.slice(1)) {
      final.deslocamento.forEach((valor: number, i: number) => expect(valor).toBeCloseTo(finais[0].deslocamento[i], 9));
      final.rotacao.flat().forEach((valor: number, i: number) => expect(valor).toBeCloseTo(finais[0].rotacao.flat()[i], 9));
    }
  });

  it('referencial inválido falha antes de produzir porta ou prévia parcial', () => {
    const montagem = montarPinoELuva();
    montagem.instancias[1] = {
      ...montagem.instancias[1],
      referencial: { rotacao: [[-1, 0, 0], [0, 1, 0], [0, 0, 1]] },
    };
    expect(() => resolver(montagem)).toThrow(/referencial\.rotacao.*rotação própria/);
    montagem.instancias[1] = { ...montagem.instancias[1], referencial: { escala: 1.2 } };
    expect(() => resolver(montagem)).toThrow(/referencial.*chave\(s\) desconhecida\(s\): escala/);
  });
});

describe('estados explicáveis de encaixe — AUT-2026-09', () => {
  it('distingue satisfeito, subdeterminado, divergente e impossível sem mutar portas', () => {
    const montagem = montarPinoELuva();
    const portas = resolver(montagem);
    const antes = JSON.stringify([...portas]);

    const satisfeito = avaliarEstadoDeEncaixeCilindrico(montagem.relacao, portas);
    expect(satisfeito).toMatchObject({ estado: 'satisfeita', satisfeita: true, grausDeLiberdade: [] });
    expect(formatarDiagnosticoDeEncaixe(satisfeito)).toContain('estado do encaixe: satisfeita');

    const subdeterminada = avaliarEstadoDeEncaixeCilindrico({ ...montagem.relacao, poseCanonica: undefined }, portas);
    expect(subdeterminada).toMatchObject({
      estado: 'subdeterminada', satisfeita: true,
      grausDeLiberdade: ['giro-no-eixo', 'posicao-axial'],
    });
    expect(formatarDiagnosticoDeEncaixe(subdeterminada)).toContain('a declarar: giro-no-eixo, posicao-axial');

    const divergentes = clonarPortas(portas);
    divergentes.get('luva.cavidade').centro[0] += 0.01;
    const divergente = avaliarEstadoDeEncaixeCilindrico(montagem.relacao, divergentes);
    expect(divergente).toMatchObject({ estado: 'divergente', satisfeita: false });
    expect(divergente.diagnosticos.map((d: any) => d.codigo)).toContain('eixos-descentrados');

    const impossivel = avaliarEstadoDeEncaixeCilindrico({ ...montagem.relacao, referencia: 'luva.cavidade', movel: 'pino.piloto' }, portas);
    expect(impossivel).toMatchObject({ estado: 'impossivel', satisfeita: false });
    expect(impossivel.diagnosticos.map((d: any) => d.codigo)).toContain('direcao-incompativel');

    const incompativeis = clonarPortas(portas);
    incompativeis.get('luva.cavidade').forma = 'plano';
    expect(avaliarEstadoDeEncaixeCilindrico(montagem.relacao, incompativeis).diagnosticos.map((d: any) => d.codigo))
      .toContain('forma-incompativel');
    expect(JSON.stringify([...portas])).toBe(antes);
  });

  it('reprova quadro ausente como impossível e preserva a ordem do relatório', () => {
    const montagem = montarPinoELuva();
    const portas = resolver(montagem);
    delete (portas.get('luva.cavidade') as any).referencia;
    const resultado = avaliarEstadoDeEncaixeCilindrico(montagem.relacao, portas);
    expect(resultado).toMatchObject({ estado: 'impossivel', satisfeita: false });
    expect(resultado.diagnosticos.map((d: any) => d.codigo)).toEqual(['quadro-incompleto']);
  });
});

describe('contato local cilíndrico e alerta global — AUT-2026-10', () => {
  it('mostra folga e alcance locais sem ocultar o alerta amplo em pino/luva e roda/cubo', () => {
    for (const montagem of [montarPinoELuva(), montarRodaNoFreio()]) {
      const antes = JSON.stringify(montagem);
      const diagnostico = diagnosticarEncaixeCilindrico(montagem.relacao, montagem.instancias);
      expect(diagnosticarEncaixeCilindrico(montagem.relacao, montagem.instancias)).toEqual(diagnostico);
      expect(diagnostico.contatoLocal).toMatchObject({
        radial: { estado: 'folga', unidade: 'm' },
        axial: { estado: 'alcanca', unidade: 'm', separacao: 0 },
      });
      expect(diagnostico.alertaGlobal).toMatchObject({ tipo: 'interpenetra' });
      expect(formatarDiagnosticoDeEncaixe(diagnostico)).toContain('alerta global por caixa: interpenetra');
      expect(JSON.stringify(montagem)).toBe(antes);
    }
  });

  it('distingue encosta, interferência e falta de alcance pelas medidas locais', () => {
    const montagem = montarPinoELuva();
    const portas = resolver(montagem);

    const encosta = clonarPortas(portas);
    encosta.get('pino.piloto').raio = encosta.get('luva.cavidade').raio;
    expect(classificarContatoLocalCilindrico(validarEncaixeCilindrico(montagem.relacao, encosta))).toMatchObject({
      radial: { estado: 'encosta' }, axial: { estado: 'alcanca' },
    });

    const interfere = clonarPortas(portas);
    interfere.get('pino.piloto').raio = interfere.get('luva.cavidade').raio + 0.01;
    expect(classificarContatoLocalCilindrico(validarEncaixeCilindrico(montagem.relacao, interfere)).radial.estado)
      .toBe('interferencia');

    const semAlcance = clonarPortas(portas);
    semAlcance.get('pino.piloto').centro[1] += 1;
    expect(classificarContatoLocalCilindrico(validarEncaixeCilindrico(montagem.relacao, semAlcance)).axial.estado)
      .toBe('sem-alcance');
  });

  it('uma interface inválida altera a leitura local, mas conserva o alerta amplo', () => {
    const montagem = montarPinoELuva();
    const pino = montagem.instancias[0];
    const portas = new Map([...pino.neutro.portas].map(([nome, porta]) => [nome, JSON.parse(JSON.stringify(porta))]));
    portas.get('piloto').interface.raio += 0.01;
    const alterada = [{ ...pino, neutro: { ...pino.neutro, portas } }, montagem.instancias[1]];

    const diagnostico = diagnosticarEncaixeCilindrico(montagem.relacao, alterada);
    expect(diagnostico.contatoLocal.radial.estado).toBe('interferencia');
    expect(diagnostico.alertaGlobal).toMatchObject({ tipo: 'interpenetra' });
  });
});

describe('assentamento anular declarado — AUT-2026-11', () => {
  it('passa no piloto aro/pneu e na fixture neutra, preservando o alerta amplo', () => {
    for (const montagem of [montarAroNoPneu(), montarAnelEFaixa()]) {
      const antes = JSON.stringify(montagem);
      const diagnostico = diagnosticarAssentamentoAnular(montagem.relacao, montagem.instancias);
      expect(diagnostico).toMatchObject({ satisfeita: true, alertaGlobal: { tipo: 'interpenetra' } });
      expect(diagnostico.medidas.sobreposicaoRadial).toBeGreaterThan(0);
      expect(diagnostico.medidas.sobreposicaoAxial).toBeGreaterThan(0);
      expect(formatarDiagnosticoDeAssentamentoAnular(diagnostico)).toContain('alerta global por caixa: interpenetra');
      expect(JSON.stringify(montagem)).toBe(antes);
    }
  });

  it('distingue faixa radial, eixo e alcance axial sem escolher correção', () => {
    const montagem = montarAnelEFaixa();
    const portas = resolver(montagem);

    const radial = clonarPortas(portas);
    radial.get('anel.ocupaFaixa').raioInterno = 0.041;
    expect(validarAssentamentoAnular(montagem.relacao, radial).diagnosticos.map((d: any) => d.codigo)).toContain('faixa-radial-fora');

    const eixo = clonarPortas(portas);
    eixo.get('anel.ocupaFaixa').eixo = [1, 0, 0];
    expect(validarAssentamentoAnular(montagem.relacao, eixo).diagnosticos.map((d: any) => d.codigo)).toContain('eixos-divergentes');

    const axial = clonarPortas(portas);
    axial.get('anel.ocupaFaixa').centro[1] += 1;
    expect(validarAssentamentoAnular(montagem.relacao, axial).diagnosticos.map((d: any) => d.codigo)).toContain('faixa-axial-fora');
  });

  it('rejeita anel incompleto no núcleo antes de ele virar porta de montagem', () => {
    const neutro = nucleo([
      ['lathe', { origemId: 44, lados: 8, perfil: [[0.02, 0], [0.03, 0], [0.03, 0.01], [0.02, 0.01], [0.02, 0]] }],
      ['publicarPorta', { nome: 'ruim', de: { op: 'lathe', id: 44 }, interface: { forma: 'anel', papel: 'recebe', eixo: [0, 1, 0], centro: [0, 0, 0], raioInterno: 0.02, inicio: 0, fim: 0.01 } }],
    ] as any);
    expect(neutro.orfaos[0].motivo).toMatch(/interface exige 'raioExterno'/);
    expect(neutro.portas.size).toBe(0);
  });
});
