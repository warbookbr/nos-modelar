/* familia-com-esboco.mjs — o adaptador da conferência entre a família e o componente do esboço de mesmo nome.
 *
 * O núcleo da conferência (`src/autoria/familia-esboco.js`) é puro e recebe o andaime e a peça prontos. Aqui os dois lados
 * se encontram, no único lugar que importa o módulo do esboço e o núcleo: para um conjunto de parâmetros da família, a
 * instância do componente é expandida (`formasResolvidas`, sobre um esboço mínimo), traduzida para o andaime do nível zero
 * (`esboco-para-andaime.mjs`), a família é chamada (`chamar` e `executarReceita`, com o registro de composições) e a peça
 * gerada é conferida contra o andaime pelo `REFINA`. `conferirFamiliaNosTresPontos` faz isso no mínimo, no ponto médio e no
 * máximo da família. Família sem `esboco` (ou sem `esboco.conferencia`) é dispensada, dizendo que não tem vínculo. */
import { ErroFamilia } from '../../src/autoria/familia.js';
import { executarReceita } from '../../src/autoria/executar-receita.js';
import { conferirFamiliaContraEsboco, esbocoMinimo, motivoDaDispensa, pontosDaFamilia } from '../../src/autoria/familia-esboco.js';
import { chamar, criarRegistroDeFamilias } from '../../procedural/familias/index.js';
import { andaimeDoEsboco } from './esboco-para-andaime.mjs';

const ID_DA_CHAMADA = 'corpo';

/* A receita que só chama a família. `CHAMADAS_COMPOSICOES` é um getter para a recusa de `chamar` acontecer quando o
   executor lê o campo, como em qualquer receita de família. */
function receitaDaFamilia(familia, parametros, materiais) {
  return {
    get CHAMADAS_COMPOSICOES() { return [chamar(familia, ID_DA_CHAMADA, parametros)]; },
    PARAMS: {}, TOPO: {}, ALIASES: [], MATERIAIS: materiais,
  };
}

const completar = (contrato, parametros) => ({
  ...Object.fromEntries(Object.entries(contrato.parametros).map(([nome, p]) => [nome, p.padrao])),
  ...parametros,
});

/**
 * Confere a família num conjunto de parâmetros. `familia` é a que `definirFamilia` devolve; `parametros` traz só o que
 * difere dos padrões; `registro` é o de `criarRegistroDeFamilias` (por padrão, um só com esta família); `materiais` são os
 * `MATERIAIS` que as composições da família usam, se usam algum. Devolve o resultado do núcleo da conferência com os
 * `parametros` completos. Uma chamada que a família recusa (faixa ou restrição) vira o achado `chamada-recusada`, porque a
 * peça daquele ponto não existe para ser conferida.
 */
export function conferirFamiliaComEsboco({ familia, parametros = {}, registro, materiais = {} }) {
  const contrato = familia.contrato;
  const dispensa = motivoDaDispensa(contrato);
  if (dispensa) return { estado: 'dispensada', ok: true, motivo: dispensa, achados: [], partes: [], portas: [], portasSemVinculo: [], parametros: completar(contrato, parametros) };
  const completos = completar(contrato, parametros);
  const registros = registro ?? criarRegistroDeFamilias({ familias: [familia] });
  let neutro;
  try {
    ({ neutro } = executarReceita(receitaDaFamilia(familia, parametros, materiais), registros));
  } catch (erro) {
    if (!(erro instanceof ErroFamilia)) throw erro;
    return {
      estado: 'reprovada', ok: false, parametros: completos, partes: [], portas: [], portasSemVinculo: [],
      achados: [{ codigo: 'chamada-recusada', mensagem: `a família '${contrato.id}' recusa estes parâmetros, e sem a peça não há o que conferir: ${erro.message}` }],
    };
  }
  const { andaime, tabela } = andaimeDoEsboco(esbocoMinimo(contrato, completos), { opcao: 1 });
  return { ...conferirFamiliaContraEsboco({ contrato, andaime, tabela, neutro }), parametros: completos };
}

/**
 * Confere a família no mínimo, no ponto médio e no máximo (todos os parâmetros no mesmo extremo). Devolve `{ estado, ok,
 * pontos }`, em que `estado` é `conferida`, `reprovada` ou `dispensada`, e cada ponto traz o resultado de
 * `conferirFamiliaComEsboco`.
 */
export function conferirFamiliaNosTresPontos({ familia, registro, materiais }) {
  const dispensa = motivoDaDispensa(familia.contrato);
  if (dispensa) return { estado: 'dispensada', ok: true, motivo: dispensa, pontos: [] };
  const registros = registro ?? criarRegistroDeFamilias({ familias: [familia] });
  const pontos = pontosDaFamilia(familia.contrato).map(({ ponto, parametros }) => ({
    ponto, ...conferirFamiliaComEsboco({ familia, parametros, registro: registros, materiais }),
  }));
  const ok = pontos.every((p) => p.ok);
  return { estado: ok ? 'conferida' : 'reprovada', ok, pontos };
}

const parametrosEmTexto = (parametros) => Object.entries(parametros).map(([nome, valor]) => `${nome}=${valor}`).join(', ');

/** O resultado em texto: uma linha por ponto e, por achado, a linha com a parte, o volume, o lado e o desvio que a
 *  conferência mediu. */
export function descreverConferenciaDaFamilia(resultado) {
  if (resultado.estado === 'dispensada') return `dispensada: ${resultado.motivo}`;
  const pontos = resultado.pontos ?? [{ ponto: 'ponto', ...resultado }];
  return pontos.flatMap((p) => [
    `${p.ponto} (${parametrosEmTexto(p.parametros)}): ${p.ok ? 'dentro do esboço' : `${p.achados.length} achado(s)`}${p.portasSemVinculo?.length ? `; portas sem vínculo com o esboço: ${p.portasSemVinculo.join(', ')}` : ''}`,
    ...p.achados.map((a) => `  ${a.codigo}: ${a.mensagem}`),
  ]).join('\n');
}
