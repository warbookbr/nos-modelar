/* memoria-em-armazem.js — a memória de execução guardada fora do processo, para um comando recomeçar do estado que o comando anterior
 * deixou (plano do cache por passo, fatia 3).
 *
 * É o cache por PREFIXO: o estado depois do passo k fica sob a chave encadeada dos passos 0 a k e do que os rodeia (`chavesDosPrefixos`
 * de `memoria-de-execucao.js`), e uma execução recomeça do último ponto guardado cujo prefixo é o dela. Uma edição no passo j muda a
 * chave de j e de todos os seguintes, e de nenhum anterior, de modo que o recomeço vem sempre de antes de j e o resultado não depende de
 * saber o que cada passo lê. A leitura declarada (`leitura-declarada.js`) não entra aqui.
 *
 * Esta memória tem a mesma interface da de `criarMemoriaDeExecucao`, e o núcleo a usa sem saber onde ela guarda. Quem a cria dá:
 *   - `armazem`: `{ ler(nome) -> bytes | null, gravar(nome, bytes), apagar(nome) }`, o disco do host (o núcleo não toca em disco), e,
 *     de opcional, `trancar(nome, fn)`, que espera a trava do índice, roda `fn` e só então volta: o ponto, o índice e o descarte se
 *     gravam dentro dela, e sem ela dois processos que guardam ao mesmo tempo podem perder um do outro a entrada do índice. `gravar`
 *     deve ser atômica (gravar ao lado e renomear), para a leitura nunca ver um ponto pela metade, e `listar()`, opcional, serve à
 *     limpeza das versões velhas (`limparOutrasVersoes`);
 *   - `serializar` e `desserializar`: a cópia do estado em bytes e de volta (no Node, `v8.serialize` e `v8.deserialize`).
 *     `desserializarDevolveCopia: true` diz que cada leitura devolve um objeto novo, só daquela execução (o `v8.deserialize` devolve), e
 *     então o núcleo não copia de novo o estado lido; sem ela, ele copia, porque um armazém que guarda o objeto e o devolve igual teria o
 *     estado guardado mudado pelos passos seguintes;
 *   - `versao`: o texto que identifica o código que gerou o estado (`versaoDoCodigo` de `versao-do-codigo.mjs`: o núcleo, as extensões do
 *     registro, as bibliotecas e o Node). Ela entra no nome de todo ponto e do índice, e o ponto lido confere a dele: estado de outra
 *     versão nunca é servido;
 *   - `rotulo`: o nome da receita (o caminho do arquivo), que separa o índice de uma receita do de outra. O ponto é pelo conteúdo e pode
 *     servir a outra receita com o mesmo prefixo, que tem por isso o mesmo estado;
 *   - `maximo`: quantos pontos o índice da receita mantém, os mais recentes (inteiro de 1 em diante, ou infinito; 16 por padrão, infinito
 *     com `todoPasso`); o mais velho sai do armazém;
 *   - `limiarDeCustoMs`: o passo que levou ao menos isto vira ponto (250 ms por padrão). Viram ponto também os dois últimos passos da
 *     receita, para a mesma receita outra vez e a edição do último passo, e o passo antes do primeiro que mudou desde a execução anterior,
 *     para a edição seguinte no mesmo lugar recomeçar dali. O tempo decide só onde guardar, nunca o resultado;
 *   - `todoPasso`: guardar depois de cada passo, e `passosGuardados`: guardar só depois destes índices, para as provas;
 *   - `somenteLeitura`: lê os pontos e não guarda nenhum (o processo de vida longa cujo código no disco mudou depois que ele o importou).
 * Todo nome no armazém começa pela marca da versão (`v<12 hex>-`), de modo que a limpeza apaga o que é de outra versão sem ler nada.
 * O índice guarda a cadeia de chaves da última execução (`ultimaCadeia`), que o núcleo compara com a da execução nova.
 * Um erro do armazém ou da serialização não muda o resultado: o ponto não é guardado ou não é lido, e a execução segue inteira. */
import { sha256Hex } from '../sha256.js';

const FORMATO = 'mecanifica.ponto-de-execucao@1';

/** A marca de uma versão, que abre o nome de tudo o que ela guarda no armazém. */
export const marcaDaVersao = (versao) => `v${sha256Hex(String(versao)).slice(0, 12)}`;

/**
 * Apaga do armazém o que é de outra versão do código (e os restos `.parcial` de uma gravação interrompida): todo nome que começa por
 * marca de versão e não pela desta. Precisa de `armazem.listar()`; sem ela não faz nada. Devolve quantos nomes apagou.
 */
export function limparOutrasVersoes(armazem, versao) {
  if (typeof armazem?.listar !== 'function') return 0;
  const marca = `${marcaDaVersao(versao)}-`;
  let apagados = 0;
  for (const nome of armazem.listar()) {
    if (!/^v[0-9a-f]{12}-/.test(nome) || (nome.startsWith(marca) && !nome.endsWith('.parcial'))) continue;
    try { armazem.apagar(nome); apagados += 1; } catch { /* outro processo pode tê-lo apagado */ }
  }
  return apagados;
}

export function criarMemoriaEmArmazem({
  armazem, serializar, desserializar, desserializarDevolveCopia = false, versao, rotulo,
  maximo = undefined, limiarDeCustoMs = 250, todoPasso = false, passosGuardados = null, somenteLeitura = false,
}) {
  if (!armazem || typeof armazem.ler !== 'function' || typeof armazem.gravar !== 'function' || typeof armazem.apagar !== 'function') {
    throw new TypeError('memória em armazém: o armazém precisa de ler, gravar e apagar');
  }
  if (typeof serializar !== 'function' || typeof desserializar !== 'function') throw new TypeError('memória em armazém: serializar e desserializar são obrigatórios');
  if (typeof versao !== 'string' || !versao) throw new TypeError('memória em armazém: a versão do código é obrigatória, um texto não vazio');
  if (typeof rotulo !== 'string' || !rotulo) throw new TypeError('memória em armazém: o rótulo da receita é obrigatório, um texto não vazio');
  const limite = maximo === undefined ? (todoPasso ? Infinity : 16) : maximo;
  if (!(limite === Infinity || (Number.isSafeInteger(limite) && limite >= 1))) throw new TypeError(`memória em armazém: maximo precisa ser inteiro de 1 em diante ou infinito, recebi ${JSON.stringify(maximo)}`);
  if (!(Number.isFinite(limiarDeCustoMs) && limiarDeCustoMs >= 0)) throw new TypeError(`memória em armazém: limiarDeCustoMs precisa ser um número finito de 0 em diante, recebi ${JSON.stringify(limiarDeCustoMs)}`);
  const guardados = Array.isArray(passosGuardados) ? new Set(passosGuardados) : null;
  const estatisticas = { guardados: 0, restaurados: 0, recusados: 0, lidos: 0, falhas: 0, descartados: 0 };
  const marca = marcaDaVersao(versao);
  const nomeDoPonto = (chave) => `${marca}-ponto-${sha256Hex(`${versao}\n${chave}`).slice(0, 40)}`;
  const nomeDoIndice = `${marca}-indice-${sha256Hex(`${versao}\n${rotulo}`).slice(0, 40)}`;
  /* o índice: a cadeia da última execução e os pontos desta receita, `{ nome, passo }`, do mais velho ao mais novo */
  const lerIndice = () => {
    try {
      const bytes = armazem.ler(nomeDoIndice);
      const indice = bytes ? desserializar(bytes) : null;
      if (indice?.formato === FORMATO && indice.versao === versao && indice.rotulo === rotulo && Array.isArray(indice.pontos)) return { ...indice, pontos: indice.pontos.map((p) => ({ ...p })) };
    } catch { estatisticas.falhas += 1; }
    return { formato: FORMATO, versao, rotulo, cadeia: null, pontos: [] };
  };
  const gravarIndice = (indice) => { try { armazem.gravar(nomeDoIndice, serializar(indice)); } catch { estatisticas.falhas += 1; } };
  const apagar = (nome) => { try { armazem.apagar(nome); } catch { estatisticas.falhas += 1; } };
  /* o que muda o armazém roda dentro da trava do índice, quando o armazém sabe trancar; `fn` recebe o índice lido e o grava no fim */
  const trancado = (fn) => {
    let resultado;
    const fazer = () => { const indice = lerIndice(); resultado = fn(indice); gravarIndice(indice); };
    if (typeof armazem.trancar === 'function') { try { armazem.trancar(nomeDoIndice, fazer); } catch { estatisticas.falhas += 1; return false; } } else fazer();
    return resultado;
  };
  return {
    estatisticas,
    somenteLeitura,
    /* a cópia é a serialização, feita dentro de `guardar` */
    copiaPropria: true,
    get ultimaCadeia() { return lerIndice().cadeia; },
    set ultimaCadeia(cadeia) { if (!somenteLeitura) trancado((indice) => { indice.cadeia = Array.isArray(cadeia) ? [...cadeia] : null; }); },
    get tamanho() { return lerIndice().pontos.length; },
    deveGuardar(i, { ms, antesDaDivergencia, total }) {
      if (somenteLeitura) return false;
      if (guardados) return guardados.has(i);
      if (todoPasso) return true;
      return ms >= limiarDeCustoMs || antesDaDivergencia === true || i >= total - 2;
    },
    limpar() { trancado((indice) => { for (const { nome } of indice.pontos) apagar(nome); indice.pontos = []; }); },
    /** @returns {{ passo: number, estado: object, proprio: boolean } | null} */
    buscar(chave) {
      let bytes = null;
      try { bytes = armazem.ler(nomeDoPonto(chave)); } catch { estatisticas.falhas += 1; return null; }
      if (!bytes) return null;
      try {
        const ponto = desserializar(bytes);
        if (ponto?.formato !== FORMATO || ponto.versao !== versao || ponto.chave !== chave) return null;
        estatisticas.lidos += 1;
        return { passo: ponto.passo, estado: ponto.estado, proprio: desserializarDevolveCopia === true };
      } catch { estatisticas.falhas += 1; return null; }
    },
    guardar(chave, passo, estado) {
      if (somenteLeitura) return false;
      const nome = nomeDoPonto(chave);
      /* a serialização fica fora da trava (é a parte demorada); a gravação do ponto e a do índice, dentro */
      let bytes;
      try { bytes = serializar({ formato: FORMATO, versao, chave, passo, estado }); } catch { estatisticas.falhas += 1; return false; }
      const gravou = trancado((indice) => {
        try { armazem.gravar(nome, bytes); } catch { estatisticas.falhas += 1; return false; }
        indice.pontos = [...indice.pontos.filter((p) => p.nome !== nome), { nome, passo }];
        while (indice.pontos.length > limite) apagar(indice.pontos.shift().nome);
        return true;
      });
      if (gravou === true) estatisticas.guardados += 1;
      return gravou === true;
    },
    /** O ponto recusado sai do armazém e do índice. */
    descartar(chave) {
      const nome = nomeDoPonto(chave);
      trancado((indice) => { apagar(nome); indice.pontos = indice.pontos.filter((p) => p.nome !== nome); });
      estatisticas.descartados += 1;
    },
    /** Todos os pontos desta receita saem (o modo conferido recusou um recomeço: o veneno pode ter vindo de qualquer ponto anterior). */
    descartarTodos() {
      trancado((indice) => { for (const { nome } of indice.pontos) { apagar(nome); estatisticas.descartados += 1; } indice.pontos = []; indice.cadeia = null; });
    },
  };
}
