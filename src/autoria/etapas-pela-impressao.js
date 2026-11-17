/* etapas-pela-impressao.js — o estado de cada etapa de uma montagem v5 como função pura do registro de eventos e do medido agora.

   O REGISTRO GUARDA SÓ FATOS IMUTÁVEIS: os aceites e as reaberturas, na ordem em que aconteceram. Nenhum comando regrava o que já está
   escrito, e o estado de uma etapa nunca é gravado: sai da comparação entre a impressão do aceite vigente e a impressão de agora.

   A IMPRESSÃO DE UM ACEITE guarda, em valores e não em hash (a recusa precisa mostrar a diferença), o que a pessoa aprovou: o hash da
   forma, os parâmetros que a montagem derivou, a pose da instância no mundo, a medida de cada junta da etapa, a interface de cada porta
   de etapa anterior que ela cita (por relação, vínculo ou posição) vista do lado de quem cita, e a ordem das etapas anteriores. A porta
   citada entra na impressão da CITANTE, e não na da citada: por isso reabrir a citada antes de mudá-la, ou mudá-la sem ninguém ter
   reaberto nada, quebra a posterior pela impressão dela, sem que o registro guarde referência de porta nenhuma.

   O ESTADO. Aberta quando não há aceite vigente (nunca houve, ou a última palavra foi uma reabertura). Com aceite vigente: fixa quando a
   impressão de agora é igual à do aceite (com os 12 algarismos significativos que o código já usa para números), quebrada quando difere,
   com a diferença como motivo, e não conferível quando não há geometria para medir (nunca fixa, e não se aceita). A quebrada cuja mudança
   é desfeita volta a fixa sozinha, porque o estado é derivado; só uma reabertura a faz aberta.

   O MEDIDO AGORA é um objeto simples, montado pelo adaptador (`medirAgora` de `etapas-da-montagem.mjs`) a partir da montagem resolvida:
     { ordem: [instância],
       etapas: { [instância]: { forma?, parametros, pose, juntas } },   // sem `forma` = sem geometria para medir
       citacoes: [{ etapa, porta, posterior, por, relacao?, profunda? }],
       portas: { [etapa]: { [porta]: interface no mundo } } }
   A porta de dentro de submontagem (`profunda`) o resolvedor não expõe no mundo: fica fora da impressão, e `avisosDaImpressao` a diz. */
import { ErroEtapaDeConstrucao, FORMATO_REGISTRO_DE_ETAPAS, lerAutorDaReabertura } from './etapas-de-construcao.js';

export const VERSAO_REGISTRO_PELA_IMPRESSAO = 3;

function falhar(codigo, mensagem) {
  throw new ErroEtapaDeConstrucao(codigo, mensagem);
}

const numero = (v) => (typeof v === 'number' ? Number(v.toPrecision(12)) : v);
/* O valor como o JSON o guarda, com os números em 12 algarismos: o que se grava é o que se compara. */
const canonico = (v) => JSON.parse(JSON.stringify(v, (_, x) => numero(x)));
const comparar = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/* A impressão de uma etapa como o medido de agora a mostra; null quando a etapa não tem geometria para medir. */
export function imprimirEtapa(medido, instancia) {
  const indice = medido.ordem.indexOf(instancia);
  if (indice < 0) falhar('etapa-inexistente', `a etapa '${instancia}' não existe nesta montagem.`);
  const agora = medido.etapas[instancia];
  if (!agora?.forma) return null;
  const grupos = new Map();
  for (const c of medido.citacoes ?? []) {
    if (c.posterior !== instancia || c.profunda) continue;
    const chave = `${c.etapa}\u0000${c.porta}`;
    if (!grupos.has(chave)) grupos.set(chave, { etapa: c.etapa, porta: c.porta, por: new Set() });
    grupos.get(chave).por.add(c.por);
  }
  const citadas = [...grupos.values()]
    .sort((a, b) => comparar(a.etapa, b.etapa) || comparar(a.porta, b.porta))
    .map((g) => ({ etapa: g.etapa, porta: g.porta, por: [...g.por].sort(comparar), interface: medido.portas?.[g.etapa]?.[g.porta] ?? null }));
  return canonico({
    forma: agora.forma,
    parametros: [...(agora.parametros ?? [])].sort((a, b) => comparar(a.param, b.param)),
    pose: agora.pose ?? null,
    juntas: [...(agora.juntas ?? [])].sort((a, b) => comparar(a.relacao, b.relacao)),
    citadas,
    anteriores: medido.ordem.slice(0, indice),
  });
}

/* O que a impressão de uma etapa deixa de fora, para a leitura dizer: a citação de porta de dentro de submontagem. */
export function avisosDaImpressao(medido, instancia) {
  return (medido.citacoes ?? []).filter((c) => c.posterior === instancia && c.profunda)
    .map((c) => `a porta '${c.porta}' de '${c.etapa}', que '${instancia}' cita (${c.por}), fica dentro de uma submontagem e não entra na impressão.`);
}

const rotulo = (x) => (x && typeof x === 'object' && !Array.isArray(x)
  ? (x.relacao ?? (x.etapa !== undefined && x.porta !== undefined ? `${x.etapa}/${x.porta}` : x.param)) : undefined);
const texto = (v) => (v === undefined ? 'ausente' : JSON.stringify(v));

/* As diferenças entre duas impressões, uma linha por valor que mudou: "caminho: antes → agora". */
export function diferencasDaImpressao(antes, agora, caminho = 'impressão') {
  const objeto = (v) => v && typeof v === 'object' && !Array.isArray(v);
  if (objeto(antes) && objeto(agora)) {
    return [...new Set([...Object.keys(antes), ...Object.keys(agora)])].sort(comparar)
      .flatMap((chave) => diferencasDaImpressao(antes[chave], agora[chave], `${caminho}.${chave}`));
  }
  if (Array.isArray(antes) && Array.isArray(agora)) {
    const nomeados = (lista) => lista.every((x) => rotulo(x) !== undefined) && new Set(lista.map(rotulo)).size === lista.length;
    if (antes.length && agora.length && nomeados(antes) && nomeados(agora)) {
      const nomes = [...new Set([...antes.map(rotulo), ...agora.map(rotulo)])];
      return nomes.flatMap((nome) => diferencasDaImpressao(
        antes.find((x) => rotulo(x) === nome), agora.find((x) => rotulo(x) === nome), `${caminho}[${nome}]`,
      ));
    }
    const tamanho = Math.max(antes.length, agora.length);
    return Array.from({ length: tamanho }, (_, i) => diferencasDaImpressao(antes[i], agora[i], `${caminho}[${i}]`)).flat();
  }
  return texto(antes) === texto(agora) ? [] : [`${caminho}: ${texto(antes)} → ${texto(agora)}`];
}

export function registroVazio(montagemId) {
  return { formato: FORMATO_REGISTRO_DE_ETAPAS, versao: VERSAO_REGISTRO_PELA_IMPRESSAO, montagem: montagemId, eventos: [] };
}

const CAMPOS_DA_IMPRESSAO = ['forma', 'parametros', 'pose', 'juntas', 'citadas', 'anteriores'];
const textoNaoVazio = (v) => typeof v === 'string' && v.trim() !== '';

/* O registro é lido inteiro e sem tolerância: a ausência de um campo nunca é lida como "não mudou". Os registros de versão 1 e 2
   guardavam o estado e a referência das portas em vários lugares, e se leem pela migração, não por aqui. */
function validarRegistro(registro) {
  if (!registro || registro.formato !== FORMATO_REGISTRO_DE_ETAPAS) falhar('registro-invalido', 'o registro de etapas não tem o formato esperado.');
  if (registro.versao === 1 || registro.versao === 2) {
    falhar('registro-antigo', `o registro de etapas é da versão ${registro.versao}, que guarda o estado de cada etapa; a leitura por impressão só lê a versão ${VERSAO_REGISTRO_PELA_IMPRESSAO}, e o registro antigo passa pela migração.`);
  }
  if (registro.versao !== VERSAO_REGISTRO_PELA_IMPRESSAO || !Array.isArray(registro.eventos)) {
    falhar('registro-invalido', `o registro de etapas deve ser da versão ${VERSAO_REGISTRO_PELA_IMPRESSAO}, com a lista de eventos.`);
  }
  registro.eventos.forEach((evento, i) => {
    const onde = `evento ${i}`;
    if (!textoNaoVazio(evento?.instancia)) falhar('registro-invalido', `${onde}: sem instância.`);
    if (evento.tipo === 'aceite') {
      if (!textoNaoVazio(evento.aceite?.por)) falhar('registro-invalido', `${onde}: o aceite de '${evento.instancia}' não diz quem aceitou.`);
      const faltam = CAMPOS_DA_IMPRESSAO.filter((campo) => evento.impressao?.[campo] === undefined);
      if (faltam.length) falhar('registro-invalido', `${onde}: a impressão do aceite de '${evento.instancia}' não traz ${faltam.join(', ')}.`);
    } else if (evento.tipo === 'reabertura') {
      if (!textoNaoVazio(evento.por) || !textoNaoVazio(evento.quando) || !textoNaoVazio(evento.motivo)) {
        falhar('registro-invalido', `${onde}: a reabertura de '${evento.instancia}' exige quem, quando e motivo.`);
      }
    } else {
      falhar('registro-invalido', `${onde}: tipo '${evento.tipo}' desconhecido.`);
    }
  });
}

/* O aceite vigente de uma etapa: o último evento dela, se for um aceite. */
function aceiteVigente(registro, instancia) {
  const ultimo = [...registro.eventos].reverse().find((evento) => evento.instancia === instancia);
  return ultimo?.tipo === 'aceite' ? ultimo : null;
}

const MOSTRADAS = 6;
const resumo = (dif) => (dif.length > MOSTRADAS ? `${dif.slice(0, MOSTRADAS).join('; ')}; e mais ${dif.length - MOSTRADAS}` : dif.join('; '));

/* O estado de cada etapa, na ordem da montagem. Função pura de (registro, medido): não grava nada e não muda o registro. */
export function lerEtapas(registro, medido) {
  validarRegistro(registro);
  const etapas = medido.ordem.map((instancia) => {
    const vigente = aceiteVigente(registro, instancia);
    const avisos = avisosDaImpressao(medido, instancia);
    const comAvisos = avisos.length ? { avisos } : {};
    if (!vigente) return { instancia, estado: 'aberta', ...comAvisos };
    const agora = imprimirEtapa(medido, instancia);
    if (!agora) {
      return { instancia, estado: 'nao-conferivel', motivo: 'não há geometria para medir agora, e o aceite não pode ser conferido', aceite: vigente.aceite, ...comAvisos };
    }
    const diferencas = diferencasDaImpressao(vigente.impressao, agora);
    if (!diferencas.length) return { instancia, estado: 'fixa', aceite: vigente.aceite, ...comAvisos };
    return { instancia, estado: 'quebrada', motivo: `mudou depois do aceite: ${resumo(diferencas)}`, diferencas, aceite: vigente.aceite, ...comAvisos };
  });
  const conhecidas = new Set(medido.ordem);
  const orfaos = [...new Set(registro.eventos.map((e) => e.instancia).filter((id) => !conhecidas.has(id)))];
  return { montagem: registro.montagem, etapas, proxima: etapas.find((e) => e.estado !== 'fixa') ?? null, orfaos };
}

/* Acrescenta o aceite da pessoa à etapa, com a impressão de agora. Recusa fixar fora de ordem, sem geometria, com junta reprovada, a
   etapa que já está fixa ou quebrada, e sem quem aceitou. A quebrada não se aceita direto: a reabertura vem antes. */
export function acrescentarAceite(registro, medido, instancia, aceite = {}) {
  const leitura = lerEtapas(registro, medido);
  const etapa = leitura.etapas.find((e) => e.instancia === instancia);
  if (!etapa) falhar('etapa-inexistente', `a etapa '${instancia}' não existe nesta montagem.`);
  if (etapa.estado === 'fixa') falhar('etapa-ja-fixa', `'${instancia}' já está fixa; reabra-a para aceitar de novo.`);
  if (etapa.estado === 'quebrada') {
    falhar('etapa-quebrada', `'${instancia}' está quebrada (${etapa.motivo}); reabra-a, com quem, data e motivo, antes de aceitar de novo.`);
  }
  if (leitura.proxima?.instancia !== instancia) {
    falhar('etapa-fora-de-ordem', `a próxima etapa é '${leitura.proxima?.instancia ?? 'nenhuma'}', e não '${instancia}'.`);
  }
  const impressao = imprimirEtapa(medido, instancia);
  if (!impressao) {
    falhar('etapa-sem-geometria', `'${instancia}' não tem geometria na leitura de agora; o aceite seria dado a nada, e as posteriores se apoiariam numa porta que ninguém mediu.`);
  }
  const reprovadas = impressao.juntas.filter((junta) => !junta.satisfeita).map((junta) => junta.relacao);
  if (reprovadas.length) falhar('etapa-com-junta-reprovada', `'${instancia}' tem junta reprovada: ${reprovadas.join(', ')}.`);
  const por = typeof aceite?.por === 'string' ? aceite.por.trim() : '';
  if (!por) falhar('etapa-sem-aceite', `fixar '${instancia}' exige o aceite da pessoa, com quem aceitou.`);
  const observacao = typeof aceite.observacao === 'string' ? aceite.observacao.trim() : '';
  const defeitosAceitos = Array.isArray(aceite.defeitosAceitos) ? aceite.defeitosAceitos : [];
  const evento = {
    tipo: 'aceite',
    instancia,
    aceite: { por, ...(observacao ? { observacao } : {}), ...(defeitosAceitos.length ? { defeitosAceitos } : {}), ...(aceite.analise ? { analise: aceite.analise } : {}) },
    impressao,
  };
  return { ...registro, eventos: [...registro.eventos, evento] };
}

/* Acrescenta a reabertura de uma etapa com aceite vigente, fixa ou quebrada. Só a pessoa reabre, com quem, data e motivo. O evento não
   toca nas posteriores: cada uma segue fixa enquanto a impressão dela for a do aceite, e quebra pela própria impressão quando a porta
   que ela cita muda. */
export function acrescentarReabertura(registro, instancia, autor = {}) {
  validarRegistro(registro);
  if (!aceiteVigente(registro, instancia)) {
    falhar('etapa-nao-fixa', `a etapa '${instancia}' não tem aceite vigente; só se reabre etapa fixa ou quebrada.`);
  }
  const { por, quando, motivo } = typeof autor === 'string' ? lerAutorDaReabertura(autor) : autor;
  if (![por, quando, motivo].every(textoNaoVazio)) {
    falhar('reabertura-sem-autor', `reabrir '${instancia}' exige quem reabriu, a data e o motivo ("<quem, data: motivo>").`);
  }
  return { ...registro, eventos: [...registro.eventos, { tipo: 'reabertura', instancia, por: por.trim(), quando: quando.trim(), motivo: motivo.trim() }] };
}
