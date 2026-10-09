/* Base comum da forma global N2: o erro com código e caminho, e as duas verificações de estrutura que todo
   normalizador usa. Fica à parte para que o contrato (`forma-global.js`) e as primitivas
   (`primitivas-forma-global.js`) a importem sem se importarem um ao outro. Não conhece Three.js nem domínio. */

export class ErroFormaGlobal extends Error {
  constructor(codigo, caminho, mensagem) {
    super(`${caminho}: ${mensagem}`);
    this.name = 'ErroFormaGlobal';
    this.codigo = codigo;
    this.caminho = caminho;
  }
}

const comparar = (a, b) => a < b ? -1 : a > b ? 1 : 0;

export const simples = (valor) => valor !== null && typeof valor === 'object' && !Array.isArray(valor)
  && (Object.getPrototypeOf(valor) === Object.prototype || Object.getPrototypeOf(valor) === null);

export function falhar(codigo, caminho, mensagem) { throw new ErroFormaGlobal(codigo, caminho, mensagem); }

export function objeto(valor, caminho) {
  if (!simples(valor)) falhar('estrutura-invalida', caminho, 'precisa ser objeto simples.');
  return valor;
}

export function chavesExatas(valor, campos, caminho) {
  objeto(valor, caminho);
  const extras = Object.keys(valor).filter((campo) => !campos.includes(campo));
  const ausentes = campos.filter((campo) => !Object.hasOwn(valor, campo));
  if (extras.length || ausentes.length) falhar(
    'campos-invalidos', caminho,
    `campos ausentes: ${ausentes.sort(comparar).join(', ') || '(nenhum)'}; extras: ${extras.sort(comparar).join(', ') || '(nenhum)'}.`,
  );
}
