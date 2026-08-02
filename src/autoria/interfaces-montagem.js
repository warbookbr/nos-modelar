/* interfaces-montagem.js — resolve portas cilíndricas declaradas por peças e
   mede uma relação dirigida de encaixe, sem Three.js, pose derivada, hierarquia
   ou solver. É o contrato mínimo e deliberadamente read-only do Recorte A de
   AUT-05: a montagem informa a escala/translação que JÁ usa; este módulo apenas
   confere e explica. */

const EPSILON_ANGULAR = 1e-9;

function falhar(quem, mensagem) {
  throw new Error(`${quem}: ${mensagem}`);
}

function vetor(valor, quem) {
  if (!Array.isArray(valor) || valor.length !== 3 || valor.some((n) => !Number.isFinite(n))) {
    falhar(quem, 'precisa ser vetor finito [x,y,z].');
  }
  return valor.slice();
}

function escalar(valor, quem, { positivo = false, naoNegativo = false } = {}) {
  if (!Number.isFinite(valor) || (positivo && !(valor > 0)) || (naoNegativo && !(valor >= 0))) {
    falhar(quem, `precisa ser número finito${positivo ? ' > 0' : naoNegativo ? ' >= 0' : ''}.`);
  }
  return Object.is(valor, -0) ? 0 : valor;
}

const somar = (a, b) => a.map((n, i) => n + b[i]);
const subtrair = (a, b) => a.map((n, i) => n - b[i]);
const multiplicar = (a, n) => a.map((x) => x * n);
const produto = (a, b) => a.reduce((soma, n, i) => soma + n * b[i], 0);
const comprimento = (a) => Math.sqrt(produto(a, a));

function interfaceCilindrica(porta, quem) {
  const i = porta?.interface;
  if (!i || typeof i !== 'object' || Array.isArray(i)) falhar(quem, 'não publica interface.');
  if (i.forma !== 'cilindro' || (i.papel !== 'externa' && i.papel !== 'interna')) {
    falhar(quem, 'interface precisa ser cilindro interno ou externo.');
  }
  const eixo = vetor(i.eixo, `${quem}.eixo`);
  const tamanho = comprimento(eixo);
  if (!(tamanho > 0)) falhar(`${quem}.eixo`, 'não pode ser nulo.');
  const inicio = escalar(i.inicio, `${quem}.inicio`);
  const fim = escalar(i.fim, `${quem}.fim`);
  if (!(fim > inicio)) falhar(quem, 'exige fim > inicio.');
  return {
    forma: 'cilindro', papel: i.papel, eixo: multiplicar(eixo, 1 / tamanho),
    centro: vetor(i.centro, `${quem}.centro`), raio: escalar(i.raio, `${quem}.raio`, { positivo: true }),
    inicio, fim,
  };
}

/**
 * Resolve portas de várias peças para uma montagem já posada. A transformação
 * suportada neste recorte é somente escala uniforme positiva e deslocamento
 * explícitos; rotação, espelho e composição pertencem ao nível seguinte.
 */
export function resolverPortasDeMontagem(instancias) {
  const quem = 'resolverPortasDeMontagem';
  if (!Array.isArray(instancias) || !instancias.length) falhar(quem, 'instancias precisa ser lista não vazia.');
  const resultado = new Map();
  const vistos = new Set();
  for (const instancia of instancias) {
    const id = instancia?.id;
    if (typeof id !== 'string' || !id) falhar(quem, 'cada instância precisa de id não vazio.');
    if (vistos.has(id)) falhar(quem, `instância '${id}' duplicada.`);
    vistos.add(id);
    const escala = escalar(instancia.escala ?? 1, `${quem}.${id}.escala`, { positivo: true });
    const deslocamento = vetor(instancia.deslocamento ?? [0, 0, 0], `${quem}.${id}.deslocamento`);
    if (!(instancia.neutro?.portas instanceof Map)) falhar(quem, `instância '${id}' não traz portas do núcleo.`);
    for (const [nome, porta] of instancia.neutro.portas) {
      if (!porta?.interface) continue;
      const base = interfaceCilindrica(porta, `${quem}.${id}.${nome}`);
      const chave = `${id}.${nome}`;
      resultado.set(chave, {
        id: chave, instancia: id, porta: nome,
        ...base,
        centro: somar(multiplicar(base.centro, escala), deslocamento),
        raio: base.raio * escala,
        inicio: base.inicio * escala,
        fim: base.fim * escala,
      });
    }
  }
  return resultado;
}

function portaDo(mapa, chave, quem) {
  if (!(mapa instanceof Map)) falhar(quem, 'portas precisa ser o Map de resolverPortasDeMontagem().');
  if (typeof chave !== 'string' || !chave) falhar(quem, 'referência de porta precisa ser texto não vazio.');
  const porta = mapa.get(chave);
  if (!porta) falhar(quem, `porta '${chave}' não foi resolvida.`);
  return porta;
}

function intervaloNoEixo(porta, eixoReferencia) {
  const sinal = produto(porta.eixo, eixoReferencia) >= 0 ? 1 : -1;
  const centro = produto(porta.centro, eixoReferencia);
  const inicio = sinal > 0 ? porta.inicio : -porta.fim;
  const fim = sinal > 0 ? porta.fim : -porta.inicio;
  return [centro + inicio, centro + fim];
}

/**
 * Mede um encaixe externo -> interno numa pose já declarada. A função não muda
 * instância alguma: seu retorno é apenas diagnóstico estruturado e ordenado.
 */
export function validarEncaixeCilindrico(declaracao, portas) {
  const quem = 'validarEncaixeCilindrico';
  if (!declaracao || typeof declaracao !== 'object' || Array.isArray(declaracao)) {
    falhar(quem, 'declaração precisa ser objeto.');
  }
  const id = declaracao.id;
  if (typeof id !== 'string' || !id) falhar(quem, 'declaração precisa de id não vazio.');
  if (declaracao.tipo !== 'encaixaCilindrico') falhar(quem, "tipo precisa ser 'encaixaCilindrico'.");
  const tolerancia = escalar(declaracao.tolerancia ?? 1e-6, `${quem}.${id}.tolerancia`, { naoNegativo: true });
  const faixa = declaracao.folgaRadial;
  if (!faixa || typeof faixa !== 'object' || Array.isArray(faixa)) falhar(quem, 'folgaRadial precisa ser {min,max}.');
  const minimo = escalar(faixa.min, `${quem}.${id}.folgaRadial.min`, { naoNegativo: true });
  const maximo = escalar(faixa.max, `${quem}.${id}.folgaRadial.max`, { naoNegativo: true });
  if (maximo < minimo) falhar(quem, 'folgaRadial.max precisa ser >= min.');

  const referencia = portaDo(portas, declaracao.referencia, quem);
  const movel = portaDo(portas, declaracao.movel, quem);
  const diagnosticos = [];
  if (referencia.forma !== 'cilindro' || movel.forma !== 'cilindro') {
    diagnosticos.push({ codigo: 'forma-incompativel', esperado: 'cilindro' });
  }
  if (referencia.papel !== 'externa' || movel.papel !== 'interna') {
    diagnosticos.push({ codigo: 'direcao-incompativel', esperado: 'referencia externa e movel interna', observado: `${referencia.papel}->${movel.papel}` });
  }

  const alinhamento = Math.abs(produto(referencia.eixo, movel.eixo));
  if (1 - alinhamento > EPSILON_ANGULAR) {
    diagnosticos.push({ codigo: 'eixos-divergentes', observado: alinhamento, limite: 1 - EPSILON_ANGULAR });
  }
  const entreCentros = subtrair(movel.centro, referencia.centro);
  const aoLongo = produto(entreCentros, referencia.eixo);
  const lateral = subtrair(entreCentros, multiplicar(referencia.eixo, aoLongo));
  const descentro = comprimento(lateral);
  if (descentro > tolerancia) {
    diagnosticos.push({ codigo: 'eixos-descentrados', observado: descentro, limite: tolerancia });
  }

  const folgaRadial = movel.raio - referencia.raio;
  if (folgaRadial < minimo - tolerancia || folgaRadial > maximo + tolerancia) {
    diagnosticos.push({ codigo: 'folga-radial-fora', observado: folgaRadial, minimo, maximo, tolerancia });
  }
  const [inicioReferencia, fimReferencia] = intervaloNoEixo(referencia, referencia.eixo);
  const [inicioMovel, fimMovel] = intervaloNoEixo(movel, referencia.eixo);
  const sobraInicio = inicioReferencia - inicioMovel;
  const sobraFim = fimMovel - fimReferencia;
  const sobreposicaoAxial = Math.max(0, Math.min(fimReferencia, fimMovel) - Math.max(inicioReferencia, inicioMovel));
  if (sobraInicio < -tolerancia || sobraFim < -tolerancia) {
    diagnosticos.push({ codigo: 'intervalo-axial-fora', sobraInicio, sobraFim, tolerancia });
  }

  return {
    id, tipo: 'encaixaCilindrico', satisfeita: diagnosticos.length === 0,
    referencia: referencia.id, movel: movel.id,
    medidas: {
      alinhamento, descentro, folgaRadial, folgaRadialMinima: minimo,
      folgaRadialMaxima: maximo, inicioReferencia, fimReferencia, inicioMovel,
      fimMovel, sobraInicio, sobraFim, sobreposicaoAxial,
    },
    diagnosticos,
  };
}

/** Texto curto, estável e utilizável por agente/CLI; não omite a causa numérica. */
export function formatarDiagnosticoDeEncaixe(resultado, casas = 6) {
  if (!resultado || typeof resultado !== 'object' || !Array.isArray(resultado.diagnosticos)) {
    falhar('formatarDiagnosticoDeEncaixe', 'esperava resultado de validarEncaixeCilindrico().');
  }
  if (!Number.isInteger(casas) || casas < 0 || casas > 12) falhar('formatarDiagnosticoDeEncaixe', 'casas precisa ser inteiro entre 0 e 12.');
  const n = (valor) => Number.isFinite(valor) ? valor.toFixed(casas).replace(/^-0(\.0+)?$/, '0') : String(valor);
  const m = resultado.medidas;
  const linhas = [
    `relação: ${resultado.id} (${resultado.tipo})`,
    `portas: referência ${resultado.referencia} -> móvel ${resultado.movel}`,
    `estado: ${resultado.satisfeita ? 'satisfeita' : 'reprovada'}`,
    `folga radial: ${n(m.folgaRadial)} (permitida ${n(m.folgaRadialMinima)}…${n(m.folgaRadialMaxima)})`,
    `axial: sobreposição ${n(m.sobreposicaoAxial)}, sobras início/fim ${n(m.sobraInicio)}/${n(m.sobraFim)}`,
    `eixos: alinhamento ${n(m.alinhamento)}, descentro ${n(m.descentro)}`,
  ];
  if (resultado.diagnosticos.length) {
    linhas.push(`causas: ${resultado.diagnosticos.map((d) => d.codigo).join(', ')}`);
  }
  return `${linhas.join('\n')}\n`;
}
