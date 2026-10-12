/* A forma de família: um sólido que vem de uma família procedural (`procedural/familias`, contrato `mecanifica.familia@1`) e entra no
   esboço como uma forma só, `{ "id": "roda", "tipo": "familia", "familia": "roda-pneu", "perfil": "trem", "parametros": { "diametroPneu":
   420 } }`, posicionada pelas mesmas relações e âncoras das outras formas (`centro`, `sobre`, `ponta`, `encaixa`, `alinha`, `encosta`,
   `rotacao`, `desloca`, `espelha`, `arranja`; `de`/`para` valem só em cilindro, caixa e cone). O caso que pediu isto foi o trem do avião
   (E7 do `ATRITOS.md`), que não alcançava a roda 2.0 nem o cilindro hidráulico pelo JSON e usou o componente `roda` e cilindros por
   `ligar`, e a asa e a hélice de `superficie-aerodinamica` passam pela mesma porta.

   O módulo não importa o núcleo, nem a família, nem Three.js: quem conhece as famílias é um adaptador (`tools/mecanifica/
   esboco-familias.mjs`), que chama `chamar`, executa a receita e entrega ao módulo o dado `mecanifica.malha@1` (ver `malha.js`): a
   superfície do sólido em milímetro, as partes da família e as portas dela como âncoras. O adaptador entra por
   `definirProvedorDeFamilias`, a mesma ideia da porta de injeção do nível zero do Condutor, mas guardada aqui porque a geometria da
   forma é lida por quase todo o módulo (desenho, gate de contato, medidas, Envelope, blocagem, leitura em texto) e passar a função por
   cada uma delas não cabe.

   POR QUE UM TIPO DE FORMA E NÃO UM COMPONENTE. O componente (`usa`) é uma lista de formas primitivas do próprio módulo, que a expansão
   espalha no esboço com ids `<instância>.<parte>`; a família entrega a superfície pronta de peças que não são prismas (o pneu com o
   perfil do flanco, a camisa com o olhal, a asa com a torção), e decompô-la em primitivas perderia exatamente o que a família calcula.
   Como tipo de forma, ela é uma forma só, com um id, uma caixa, âncoras e peças convexas para o gate, e entra em `sobre`, `ponta`,
   `encaixa`, `alinha`, `encosta`, `espelha`, `arranja` e `ligar` sem caso especial.

   AS PORTAS COMO ÂNCORAS. Cada porta que a família publica (`publicarPorta`) é uma âncora da forma, com o nome da porta e o centro da
   interface dela: `"amortecedor.olhal-dianteiro"`, `"roda.eixo"`. O adaptador entrega as portas, e o módulo não inventa nenhuma. Uma
   família sem porta só tem `centro` e as seis faces.

   DETERMINISMO. A malha é função pura de (família, perfil, parâmetros): o módulo guarda a leitura por esse trio, e a mesma forma dá a
   mesma malha, as mesmas peças convexas e o mesmo desenho. Puro: não lê arquivo. */
import { ErroDeEsboco } from './index.js';
import { lerMalha } from './malha.js';

const objeto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const exigir = (cond, msg) => { if (!cond) throw new ErroDeEsboco(msg); };

let provedor = null;
const lidas = new Map();

/** Instala a função que entrega a malha de uma chamada: `({ familia, perfil, parametros }) => dado mecanifica.malha@1`, com
 *  `perfil` ausente quando o esboço não o nomeia e `parametros` só com o que o esboço ajusta, em milímetro, graus ou contagem.
 *  `null` desinstala. Esquece o que já foi lido. */
export function definirProvedorDeFamilias(funcao) {
  exigir(funcao === null || typeof funcao === 'function', 'definirProvedorDeFamilias: o provedor deve ser uma função ({ familia, perfil, parametros }) => malha, ou null');
  provedor = funcao;
  lidas.clear();
}

export const temProvedorDeFamilias = () => provedor !== null;

/** Lê os campos de uma forma de família. Com `resolvidos` falso (a validação do esquema, antes de os parâmetros do esboço virarem
 *  número) os valores de `parametros` podem ser texto; com `resolvidos` verdadeiro têm de ser número finito. */
export function lerFormaDeFamilia(f, onde, { resolvidos = true } = {}) {
  exigir(typeof f.familia === 'string' && f.familia.trim() !== '', `${onde}: a forma de família precisa de "familia", o id de uma família do registro (por exemplo "roda-pneu" ou "cilindro-hidraulico")`);
  exigir(f.perfil === undefined || (typeof f.perfil === 'string' && f.perfil.trim() !== ''), `${onde}: "perfil" deve ser o nome de um perfil da família (um texto, por exemplo "trem"); veio ${JSON.stringify(f.perfil)}`);
  const parametros = f.parametros ?? {};
  exigir(objeto(parametros), `${onde}: "parametros" deve ser { "nome do parâmetro da família": valor }, só com o que difere do perfil e dos padrões; veio ${JSON.stringify(f.parametros)}`);
  for (const [nome, v] of Object.entries(parametros)) {
    const bom = resolvidos ? typeof v === 'number' && Number.isFinite(v) : (typeof v === 'number' && Number.isFinite(v)) || typeof v === 'string';
    exigir(bom, `${onde}: o parâmetro "${nome}" da família deve ser ${resolvidos ? 'um número' : 'um número, o nome de um parâmetro do esboço ou "=expressão"'}, na unidade que a família declara (mm, graus ou contagem); veio ${JSON.stringify(v)}`);
  }
  return { familia: f.familia, perfil: f.perfil, parametros };
}

const chaveDe = ({ familia, perfil, parametros }) => JSON.stringify([familia, perfil ?? null, Object.keys(parametros).sort().map((k) => [k, parametros[k]])]);

/** A malha lida (`Malha`, ver `malha.js`) da forma de família `f`. Recusa, dizendo o campo e o que é válido, a forma mal escrita, a
 *  chamada que a família recusa (parâmetro desconhecido, fora da faixa ou restrição violada, com a mensagem da própria família) e a
 *  leitura sem provedor instalado. */
export function malhaDaFamilia(f, onde = `forma "${f?.id}"`) {
  const pedido = lerFormaDeFamilia(f, onde);
  const chave = chaveDe(pedido);
  if (lidas.has(chave)) return lidas.get(chave);
  exigir(provedor !== null, `${onde}: a forma é da família "${pedido.familia}", e esta leitura não tem o adaptador das famílias (o módulo não importa o núcleo: quem o chama instala o provedor com definirProvedorDeFamilias; a linha de comando \`npm run esboco\` já o instala)`);
  let dado;
  try {
    dado = provedor({ familia: pedido.familia, ...(pedido.perfil === undefined ? {} : { perfil: pedido.perfil }), parametros: { ...pedido.parametros } });
  } catch (erro) {
    if (erro instanceof ErroDeEsboco) throw erro;
    throw new ErroDeEsboco(`${onde}: a família "${pedido.familia}" recusa a chamada: ${erro?.message ?? erro}`);
  }
  const malha = lerMalha(dado, `${onde}, família "${pedido.familia}"`);
  lidas.set(chave, malha);
  return malha;
}

/** Os nomes das âncoras que a forma de família expõe além de `centro` e das seis faces: as portas da família. */
export const nomesDeAncorasDaFamilia = (f) => Object.keys(malhaDaFamilia(f).ancoras);
