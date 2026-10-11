/* familia-esboco.js — a conferência entre a família e o componente do esboço de mesmo nome (núcleo, sem disco).
 *
 * Uma família que declara `esboco: { componente, mapa, conferencia }` (ver `familia.js` e o contrato da família) diz qual
 * componente do esboço a descreve, como os parâmetros do componente saem dos da família e quais partes da família refinam
 * quais volumes do componente. Este módulo faz a parte pura da conferência: monta o esboço mínimo que só instancia o
 * componente, escolhe os três pontos da família (mínimo, médio, máximo), completa o andaime do nível zero com as portas que
 * o contrato liga a volumes e confere a peça que a família gerou contra esse andaime pela conferência do `REFINA`
 * (`refinamento-global.js`), que mede o envelope de cada parte e a interface de cada porta.
 *
 * O que ele não faz: expandir o esboço, traduzi-lo para o andaime nem executar a família. Isso é do adaptador
 * `tools/mecanifica/familia-com-esboco.mjs`, porque o módulo do esboço não importa o núcleo e o núcleo não importa o módulo.
 *
 * AS PORTAS. O esboço não declara porta, então a interface vem da geometria do volume que o contrato liga a ela, na face
 * do `lado` escolhido, que fica sobre o eixo do volume: `eixo` é a normal de saída da face (sinal do lado), `centro` é o
 * centro dessa face, e o raio vem do volume (anel: `raioInterno` e `raioExterno`; cilindro: `raio`). `inicio` e `fim`
 * (a profundidade da porta) o esboço não dá e ficam fora do andaime, de modo que a conferência não os compara. Só anel e
 * cilindro têm volume que dê a interface; porta de outro tipo fica sem vínculo e a conferência diz quais.
 *
 * Este módulo não conhece disco, Three.js, DOM nem domínio. */

import { conferirRefinamentoGlobal } from './refinamento-global.js';

export const PONTOS_DA_FAMILIA = Object.freeze(['minimo', 'medio', 'maximo']);
const EIXOS = ['x', 'y', 'z'];
const comparar = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const numero = (valor) => Number(valor.toFixed(3));

/** O motivo de não haver o que conferir, ou `null` quando a família declara os pares. */
export function motivoDaDispensa(contrato) {
  if (!contrato.esboco) {
    return `a família '${contrato.id}' não declara 'esboco': não tem vínculo com um componente do esboço, e não há o que conferir.`;
  }
  if (!contrato.esboco.conferencia) {
    return `a família '${contrato.id}' declara o componente '${contrato.esboco.componente}' mas não declara 'esboco.conferencia': nenhuma parte dela está ligada a um volume do esboço, e não há o que conferir.`;
  }
  return null;
}

/** Os três pontos da família: todos os parâmetros no mínimo, no ponto médio e no máximo. */
export function pontosDaFamilia(contrato) {
  return PONTOS_DA_FAMILIA.map((ponto) => ({
    ponto,
    parametros: Object.fromEntries(Object.entries(contrato.parametros).map(([nome, p]) => [nome, p[ponto]])),
  }));
}

/** Os parâmetros do componente a partir dos da família, pelo mapa do contrato. */
export function parametrosDoComponente(contrato, parametros) {
  return Object.fromEntries(Object.entries(contrato.esboco.mapa).map(([doComponente, daFamilia]) => [doComponente, parametros[daFamilia]]));
}

/** O esboço mínimo: uma opção com uma só forma, a instância do componente com os parâmetros mapeados. A instância tem o
 *  nome do componente, e é por ele que os volumes do andaime se chamam `<componente>-<forma>`. */
export function esbocoMinimo(contrato, parametros) {
  const { componente } = contrato.esboco;
  return {
    vista: 'lateral',
    plano: `Conferência da família '${contrato.id}' com o componente '${componente}': só a instância do componente, nos parâmetros da família.`,
    opcoes: [{
      titulo: 'Conferência',
      nota: `Componente '${componente}' nos parâmetros mapeados da família '${contrato.id}'.`,
      formas: [{ id: componente, usa: componente, parametros: parametrosDoComponente(contrato, parametros) }],
    }],
  };
}

/** O id da forma `forma` do componente na tabela do tradutor (`<instância>.<forma>` para o volume do andaime). */
export const chaveDaForma = (contrato, forma) => `${contrato.esboco.componente}.${forma}`;

const direcao = (sinal, indice) => EIXOS.map((_, i) => (i === indice ? sinal : 0));

/* A interface da porta `porta` do contrato sobre o volume `volume` do andaime, na face do `lado`. Devolve `{ interface }`
   ou `{ achado }` quando o volume não dá essa interface. */
function interfaceDaPorta(porta, volume, lado, forma) {
  const indice = EIXOS.indexOf(volume.eixo);
  const semInterface = (motivo) => ({
    achado: { codigo: 'porta-sem-interface', porta: porta.id, volume: volume.id, forma, mensagem: `a porta '${porta.id}' (${porta.tipo}) não tem interface no volume '${forma}' do componente: ${motivo}.` },
  });
  if (volume.tipo !== 'anel' && volume.tipo !== 'cilindro') return semInterface(`o volume é ${volume.tipo}, e só o anel e o cilindro dão a interface de uma porta`);
  if (indice < 0 || lado[1] !== volume.eixo) {
    return semInterface(`o lado '${lado}' não é uma extremidade do volume, cujo eixo é ${volume.eixo}; escolha +${volume.eixo} ou -${volume.eixo}`);
  }
  const sinal = lado[0] === '-' ? -1 : 1;
  const comprimento = volume.tipo === 'anel' ? volume.espessura : volume.comprimento;
  const centro = volume.centro.map((c, i) => (i === indice ? c + sinal * comprimento / 2 : c));
  const base = { papel: porta.papel, eixo: direcao(sinal, indice), centro: centro.map(numero) };
  if (porta.tipo === 'anel') {
    return { interface: { forma: 'anel', ...base, raioInterno: volume.tipo === 'anel' ? volume.raioInterno : 0, raioExterno: volume.tipo === 'anel' ? volume.raioExterno : volume.raio } };
  }
  if (volume.tipo === 'cilindro') return { interface: { forma: 'cilindro', ...base, raio: volume.raio } };
  return { interface: { forma: 'cilindro', ...base, raio: porta.papel === 'interna' ? volume.raioInterno : volume.raioExterno } };
}

/**
 * Confere a peça que a família gerou contra o andaime do componente do esboço.
 *
 * `contrato` é a família lida por `lerFamilia`; `parametros` os parâmetros completos do ponto; `andaime` o andaime do nível
 * zero traduzido do esboço mínimo e `tabela` o mapa `<instância>.<forma>` para o id do volume que o tradutor devolve;
 * `neutro` é a peça executada. Devolve `{ estado, ok, achados, partes, portas, portasSemVinculo, andaime }`: `estado` é
 * `conferida` ou `reprovada`. Cada achado tem `codigo` e `mensagem` e, quando mede, `parte`, `volume`, `lado` e `desvio`
 * em milímetro (ou `porta`); `forma` é o id do volume no componente.
 */
export function conferirFamiliaContraEsboco({ contrato, andaime, tabela, neutro }) {
  const dispensa = motivoDaDispensa(contrato);
  if (dispensa) return { estado: 'dispensada', ok: true, motivo: dispensa, achados: [], partes: [], portas: [], portasSemVinculo: [] };
  const { conferencia } = contrato.esboco;
  const achados = [];
  const formasDoComponente = Object.keys(tabela).map((chave) => chave.slice(contrato.esboco.componente.length + 1)).sort(comparar);
  const idDoVolume = (forma) => tabela[chaveDaForma(contrato, forma)];
  const semVolume = (forma, extra) => ({
    codigo: 'volume-sem-andaime', ...extra, forma,
    mensagem: `${extra.parte ? `a parte '${extra.parte}'` : `a porta '${extra.porta}'`} está ligada ao volume '${forma}', e o componente '${contrato.esboco.componente}' nessa configuração não tem esse volume no andaime (volumes: ${formasDoComponente.join(', ') || 'nenhum'}).`,
  });

  const partes = {};
  for (const [parte, forma] of Object.entries(conferencia.partes)) {
    const volume = idDoVolume(forma);
    if (volume === undefined) achados.push(semVolume(forma, { parte })); else partes[parte] = volume;
  }

  const porVolume = new Map(andaime.volumes.map((volume) => [volume.id, volume]));
  const portas = [];
  for (const ligada of conferencia.portas ?? []) {
    const porta = contrato.portas.find(({ id }) => id === ligada.porta);
    const volume = idDoVolume(ligada.volume);
    if (volume === undefined) { achados.push(semVolume(ligada.volume, { porta: ligada.porta })); continue; }
    const { interface: interfaceDoVolume, achado } = interfaceDaPorta(porta, porVolume.get(volume), ligada.lado, ligada.volume);
    if (achado) achados.push(achado); else portas.push({ id: ligada.porta, interface: interfaceDoVolume });
  }
  const portasSemVinculo = contrato.portas.map(({ id }) => id).filter((id) => !(conferencia.portas ?? []).some(({ porta }) => porta === id)).sort(comparar);

  let medidas = [];
  let situacaoDasPortas = [];
  if (Object.keys(partes).length) {
    const completo = { ...andaime, ...(portas.length ? { portas } : {}) };
    const resultado = conferirRefinamentoGlobal({
      refinamento: { andaime: 'andaime-do-esboco.json', partes, tolerancia: conferencia.tolerancia },
      andaime: completo,
      neutro,
    });
    const formaDoVolume = new Map(Object.entries(tabela).map(([chave, volume]) => [volume, chave.slice(contrato.esboco.componente.length + 1)]));
    const volumeDaPorta = new Map((conferencia.portas ?? []).map(({ porta, volume }) => [porta, volume]));
    const doComponente = (forma, volume) => ` (o volume '${volume}' do andaime é a forma '${forma}' do componente '${contrato.esboco.componente}')`;
    for (const a of resultado.achados) {
      const forma = a.volume !== undefined ? formaDoVolume.get(a.volume) : volumeDaPorta.get(a.porta);
      if (forma === undefined) { achados.push(a); continue; }
      const volume = a.volume ?? idDoVolume(forma);
      achados.push({ ...a, volume, forma, mensagem: `${a.mensagem}${doComponente(forma, volume)}` });
    }
    medidas = resultado.partes;
    situacaoDasPortas = resultado.portas;
  }
  return { estado: achados.length ? 'reprovada' : 'conferida', ok: achados.length === 0, andaime: andaime.id, tolerancia: conferencia.tolerancia, achados, partes: medidas, portas: situacaoDasPortas, portasSemVinculo };
}
