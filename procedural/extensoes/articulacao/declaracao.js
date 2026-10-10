/* declaracao.js — leitura da articulação declarada entre duas peças.

   A articulação é relação e conferência, nunca geometria: ela aponta uma porta
   de cada peça (a do lado que fica e a do lado que se move), o tipo do
   movimento e o curso. Este módulo só lê e normaliza a declaração, sem malha,
   sem montagem e sem Three.js; a conferência do curso contra a montagem mora em
   `src/autoria/conferir-articulacao.js`.

   O eixo (ou a direção) não é digitado: sai do eixo da porta do lado que fica,
   e a porta do lado que se move tem de estar sobre ele. Assim o movimento e o
   encaixe têm uma fonte só. O valor 0 do curso é a pose da montagem como foi
   resolvida; o sentido positivo é o eixo da porta fixa (regra da mão direita na
   revolução). */

export const FORMATO_ARTICULACAO = 'mecanifica.articulacao@1';
export const TIPOS_DE_ARTICULACAO = Object.freeze(['revolucao', 'prismatica']);
export const UNIDADES_DO_CURSO = Object.freeze({
  revolucao: Object.freeze({ graus: Math.PI / 180, rad: 1 }),
  prismatica: Object.freeze({ mm: 0.001, m: 1 }),
});
export const UNIDADES_DA_FOLGA = Object.freeze({ mm: 0.001, m: 1 });
export const MAXIMO_DE_PASSOS = 720;
/* o mesmo mínimo do motivo das expectativas de contato (`MINIMO_DO_MOTIVO`) */
export const MINIMO_DO_MOTIVO_PERMITIDO = 15;

export class ErroArticulacao extends Error {
  constructor(codigo, caminho, mensagem) {
    super(`${caminho}: ${mensagem}`);
    this.name = 'ErroArticulacao';
    this.codigo = codigo;
    this.caminho = caminho;
  }
}

function falhar(codigo, caminho, mensagem) { throw new ErroArticulacao(codigo, caminho, mensagem); }
const objetoSimples = (v) => v !== null && typeof v === 'object' && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype;

function chavesExatas(valor, obrigatorias, opcionais, caminho) {
  const permitidas = [...obrigatorias, ...opcionais];
  const extras = Object.keys(valor).filter((chave) => !permitidas.includes(chave));
  if (extras.length) falhar('chave-desconhecida', caminho, `chave(s) desconhecida(s): ${extras.sort().join(', ')}.`);
  const faltam = obrigatorias.filter((chave) => !Object.hasOwn(valor, chave));
  if (faltam.length) falhar('campo-ausente', caminho, `falta(m): ${faltam.join(', ')}.`);
}

function texto(valor, caminho) {
  if (typeof valor !== 'string' || !valor.trim()) falhar('articulacao-invalida', caminho, 'precisa ser texto não vazio.');
  return valor;
}

function numero(valor, caminho) {
  if (!Number.isFinite(valor)) falhar('articulacao-invalida', caminho, 'precisa ser número finito.');
  return Object.is(valor, -0) ? 0 : valor;
}

function caminhoDeInstancia(valor, caminho) {
  if (!Array.isArray(valor) || !valor.length || valor.some((item) => typeof item !== 'string' || !item)) {
    falhar('articulacao-invalida', caminho, 'precisa ser lista de IDs de instância não vazios.');
  }
  return valor.slice();
}

function lado(valor, caminho) {
  if (!objetoSimples(valor)) falhar('articulacao-invalida', caminho, 'precisa ser objeto {caminho, porta}.');
  chavesExatas(valor, ['caminho', 'porta'], [], caminho);
  return { caminho: caminhoDeInstancia(valor.caminho, `${caminho}.caminho`), porta: texto(valor.porta, `${caminho}.porta`) };
}

const iguais = (a, b) => a.length === b.length && a.every((item, i) => item === b[i]);

/* Lê a declaração. `articulacao` guarda o que o autor escreveu; `si` guarda as
   mesmas grandezas em radiano ou metro, que é o que a conferência usa. */
export function lerArticulacao(valor, caminho = 'articulacao') {
  if (!objetoSimples(valor)) falhar('articulacao-invalida', caminho, 'precisa ser objeto simples.');
  chavesExatas(valor, ['id', 'tipo', 'fixo', 'movel', 'unidade', 'curso', 'passos', 'folga'], ['formato', 'acompanham', 'permitidos'], caminho);
  if (valor.formato !== undefined && valor.formato !== FORMATO_ARTICULACAO) {
    falhar('articulacao-invalida', `${caminho}.formato`, `precisa ser '${FORMATO_ARTICULACAO}'.`);
  }
  const id = texto(valor.id, `${caminho}.id`);
  if (!TIPOS_DE_ARTICULACAO.includes(valor.tipo)) {
    falhar('tipo-desconhecido', `${caminho}.tipo`, `aceita somente ${TIPOS_DE_ARTICULACAO.join(', ')}.`);
  }
  const tipo = valor.tipo;
  const fixo = lado(valor.fixo, `${caminho}.fixo`);
  const movel = lado(valor.movel, `${caminho}.movel`);
  if (iguais(fixo.caminho, movel.caminho)) falhar('articulacao-invalida', `${caminho}.movel`, 'a peça móvel não pode ser a mesma peça fixa.');
  const unidades = UNIDADES_DO_CURSO[tipo];
  if (!Object.hasOwn(unidades, valor.unidade)) {
    falhar('unidade-invalida', `${caminho}.unidade`, `na ${tipo} aceita somente ${Object.keys(unidades).join(', ')}.`);
  }
  if (!objetoSimples(valor.curso)) falhar('articulacao-invalida', `${caminho}.curso`, 'precisa ser objeto {minimo, maximo}.');
  chavesExatas(valor.curso, ['minimo', 'maximo'], [], `${caminho}.curso`);
  const minimo = numero(valor.curso.minimo, `${caminho}.curso.minimo`);
  const maximo = numero(valor.curso.maximo, `${caminho}.curso.maximo`);
  if (!(minimo < maximo)) falhar('curso-invalido', `${caminho}.curso`, 'o mínimo precisa ser menor que o máximo.');
  const fator = unidades[valor.unidade];
  if (tipo === 'revolucao' && (maximo - minimo) * fator > 2 * Math.PI + 1e-9) {
    falhar('curso-invalido', `${caminho}.curso`, 'a revolução não pode passar de uma volta (360 graus) entre o mínimo e o máximo.');
  }
  if (!Number.isInteger(valor.passos) || valor.passos < 1 || valor.passos > MAXIMO_DE_PASSOS) {
    falhar('passos-invalidos', `${caminho}.passos`, `precisa ser inteiro entre 1 e ${MAXIMO_DE_PASSOS}: o curso é amostrado em passos+1 posições, e o número de passos é decisão declarada.`);
  }
  if (!objetoSimples(valor.folga)) falhar('articulacao-invalida', `${caminho}.folga`, 'precisa ser objeto {valor, unidade}, mesmo que zero.');
  chavesExatas(valor.folga, ['valor', 'unidade'], [], `${caminho}.folga`);
  if (!Object.hasOwn(UNIDADES_DA_FOLGA, valor.folga.unidade)) {
    falhar('unidade-invalida', `${caminho}.folga.unidade`, `aceita somente ${Object.keys(UNIDADES_DA_FOLGA).join(', ')}.`);
  }
  const folgaValor = numero(valor.folga.valor, `${caminho}.folga.valor`);
  if (folgaValor < 0) falhar('articulacao-invalida', `${caminho}.folga.valor`, 'não pode ser negativa.');
  if (valor.acompanham !== undefined && !Array.isArray(valor.acompanham)) falhar('articulacao-invalida', `${caminho}.acompanham`, 'precisa ser lista de caminhos.');
  const acompanham = (valor.acompanham ?? []).map((item, i) => caminhoDeInstancia(item, `${caminho}.acompanham[${i}]`));
  const permitidosBrutos = valor.permitidos ?? [];
  if (!Array.isArray(permitidosBrutos)) falhar('articulacao-invalida', `${caminho}.permitidos`, 'precisa ser lista.');
  const permitidos = permitidosBrutos.map((item, i) => {
    const onde = `${caminho}.permitidos[${i}]`;
    if (!objetoSimples(item)) falhar('articulacao-invalida', onde, 'precisa ser objeto {movel, fixo, motivo}.');
    chavesExatas(item, ['movel', 'fixo', 'motivo'], [], onde);
    const motivo = texto(item.motivo, `${onde}.motivo`);
    if (motivo.trim().length < MINIMO_DO_MOTIVO_PERMITIDO) {
      falhar('motivo-curto', `${onde}.motivo`, `precisa dizer POR QUE o par pode se tocar durante o curso, com pelo menos ${MINIMO_DO_MOTIVO_PERMITIDO} caracteres.`);
    }
    return { movel: caminhoDeInstancia(item.movel, `${onde}.movel`), fixo: caminhoDeInstancia(item.fixo, `${onde}.fixo`), motivo };
  });
  const articulacao = {
    formato: FORMATO_ARTICULACAO, id, tipo, fixo, movel, unidade: valor.unidade,
    curso: { minimo, maximo }, passos: valor.passos,
    folga: { valor: folgaValor, unidade: valor.folga.unidade },
    acompanham, permitidos,
  };
  const si = {
    curso: { minimo: minimo * fator, maximo: maximo * fator },
    folga: folgaValor * UNIDADES_DA_FOLGA[valor.folga.unidade],
  };
  return { articulacao, si };
}
