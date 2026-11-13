/* testes-lentos.mjs — a lista dos arquivos de teste que saem da bateria padrão, e o comando que roda cada uma das duas.
 *
 * Medido em 2026-10-16 (plano gates em poucos minutos, fatia 1): a suíte inteira levava 18 minutos sozinha no contêiner de 4
 * processadores, e os 59 arquivos acima de 5 s somavam 92% do tempo, um deles com 309 s. Eles vieram para cá, com os testes do
 * servidor MCP e os que abrem a bancada, que disputam o servidor de desenvolvimento e o cache do Vite com os gates de MCP.
 *
 * `npm run test:rapidos` roda todo o resto, sempre. `npm run test:lentos` roda só os desta lista que importam, direta ou
 * indiretamente, um arquivo mudado desde o ramo remoto (`vitest --changed`), e roda todos com `--completo` no `npm run gates`
 * (variável GATES_COMPLETO=1), no CI (variável CI) e quando não dá para saber o ramo remoto. Assim nenhum teste deixa de rodar
 * antes de chegar à main. `npm test` continua rodando a suíte inteira de uma vez. */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { availableParallelism, loadavg } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { lerHistorico } from './vitest-duracoes.mjs';

export const TESTES_LENTOS = [
  /* 2026-11-12: roda as 101 receitas do acervo num processo só, 7,7 s com a máquina livre, e no CI de 2 a 3 vezes isso */
  'tools/modelar/custo-de-importar-receita.test.mjs',
  /* 2026-11-12: o sedã em cinco receitas faz cada importação custar 5,5 s, e estes dois, que percorrem o acervo, levam sozinhos 13,3 e 10,5 s com a máquina livre (de 18,1 e 15,6 s antes de baixar o custo das ferramentas gerais) */
  'src/autoria/material-da-receita.acervo.test.js',
  'tools/modelar/mapa-da-receita.test.mjs',
  'tools/modelar/ondulacao-corte-e-quina.test.mjs',
  'tools/modelar/raio-da-aresta.test.mjs',
  'modulos/esboco-nucleo/tests/leitor.test.js',
  'tools/modelar/modelo-aberto.test.mjs',
  'procedural/pecas/instalacao-solar/conferencias.test.mjs',
  'procedural/nucleo/paineis-por-vaos-curva.test.ts',
  'procedural/nucleo/paineis-por-vaos-superficie.test.ts',
  'procedural/nucleo/paineis-por-vaos-separa.test.ts',
  'tools/modelar/guardas/etapas-do-acervo.test.mjs',
  'tools/fixtures/solido-por-lacos/solido-por-lacos.test.ts',
  'tools/fixtures/solido-por-lacos/tubos.test.ts',
  'tools/fixtures/solido-por-lacos/tubos-fatiados.test.ts',
  'tools/modelar/vinco-oculto-pecas.test.mjs',
  'tools/modelar/dobras-aceitas-reguas.test.mjs',
  'tools/fixtures/aberturas-em-teste/chapa-grande.test.ts',
  'tools/fixtures/aberturas-em-teste/vizinhanca.test.ts',
  /* 2026-11-10: no CI os dois rodam sozinhos a 12,4 a 13,9 s, acima do teto de 12, e reprovaram a bateria rápida em dois envios de
     três no mesmo dia sem mudança neles; na máquina local levam 8,7 e 11,7 s */
  'tools/fixtures/aberturas-em-teste/superficies.test.ts',
  'modulos/textura/tests/mapas.test.js',
  'procedural/nucleo/operacoes/abertura-por-contorno.test.ts',
  'src/bancada/sessao/montagem-em-dados-acervo.test.js',
  'tools/modelar/exportar-gltf-braco.test.mjs',
  'modulos/exportador-cad/tests/exportador-cad.test.js',
  'modulos/textura/tests/metal-tecido.test.js',
  'procedural/familias/cilindro-hidraulico/cilindro-hidraulico.test.js',
  'procedural/familias/dobradica/dobradica.test.mjs',
  'procedural/familias/movel-de-caixa/movel-de-caixa.test.mjs',
  'procedural/familias/roda-pneu/roda-pneu.test.js',
  'procedural/familias/superficie-aerodinamica/superficie-aerodinamica.test.js',
  'procedural/nucleo/friso-contato.test.mjs',
  'procedural/nucleo/paineis-por-vaos-grande.test.ts',
  'procedural/nucleo/limpar-lascas.test.ts',
  'procedural/nucleo/apoio-do-vinco.test.ts',
  'procedural/nucleo/gaiola-por-rede-contato.test.mjs',
  'procedural/nucleo/operacoes/arredondar-costura-convexa.test.ts',
  'procedural/nucleo/operacoes/arredondar-costura-tubos-altos.test.ts',
  'procedural/nucleo/operacoes/booleana-casca-raspada.test.ts',
  'procedural/pecas/carenagem-de-prova/receita.test.mjs',
  'src/autoria/curvatura-da-lataria.test.mjs',
  'tools/blender/blender.test.mjs',
  'tools/blender/comparar-vincos.test.mjs',
  'tools/blender/conferir-refino.test.mjs',
  'tools/blender/leitura-blender.test.mjs',
  'tools/blender/leitura-do-pacote.test.mjs',
  'tools/blender/limiar-de-dobra.test.mjs',
  'tools/blender/linhas-pelos-cortes.test.mjs',
  'tools/blender/regua-sinal-curvatura-cortes.test.mjs',
  'tools/blender/superficie.test.mjs',
  'tools/mcp/catalogo-montagens.test.mjs',
  'tools/mcp/ensaio-ponta-a-ponta.test.mjs',
  'tools/mcp/mcp.test.mjs',
  'tools/mcp/perfis/parametros.test.mjs',
  'tools/mcp/procedural.test.mjs',
  'tools/mcp/universo-dependencias.test.mjs',
  'tools/modelar/acervo-real.test.mjs',
  'tools/modelar/alisar-a-superficie.test.mjs',
  'tools/modelar/alisar-rede.test.mjs',
  'tools/modelar/calibracao-do-critico.test.mjs',
  'tools/modelar/capturar-montagem.test.ts',
  'tools/modelar/cilindro-hidraulico-aprovacao.test.mjs',
  'tools/modelar/conferir-vistas.test.mjs',
  'tools/modelar/familia.test.mjs',
  'tools/modelar/forma-do-esboco.test.mjs',
  'tools/modelar/guardas/abre-na-bancada.test.mjs',
  'tools/modelar/guardas/guarda-acervo.test.mjs',
  'tools/modelar/mcp-degrau-1-preparacao.test.mjs',
  'tools/modelar/olhar-bancada.test.mjs',
  'tools/modelar/ondulacao-aneis.test.mjs',
  'tools/modelar/ondulacao-da-superficie.test.mjs',
  'tools/modelar/ondulacao-gota.test.mjs',
  'tools/modelar/ondulacao-leitura.test.mjs',
  'tools/modelar/ondulacao-rede.test.mjs',
  'tools/modelar/parametros-peca.test.mjs',
  'tools/modelar/rodada-de-modelagem.test.mjs',
  'tools/modelar/vinco-na-imagem.test.mjs',
  'tools/modelar/vincos-da-rede.test.mjs',
  'tools/modelar/vincos-das-linhas.test.mjs',
  'tools/modelar/vistas-de-superficie.test.mjs',
  'tools/oficina/oficina.test.ts',
];

/* O ORÇAMENTO DE TEMPO DOS RÁPIDOS.
 *
 * Um arquivo da bateria rápida que passa de TETO_DO_RAPIDO_MS reprova o `test:rapidos`, com o nome dele: ou ele vai para a lista
 * acima, ou fica mais leve. O teto é largo porque a duração depende da carga da máquina: medido em 2026-10-16, o mais lento dos
 * rápidos levava 4,9 s sozinho e 18 s dentro do `npm run gates`, com outros três gates rodando ao lado. Um teste novo de 8 s
 * sozinho já passa dele na bateria, que foi como o teste do importador de STEP, de 18 a 50 s, entrou sem ninguém notar. */
export const TETO_DO_RAPIDO_MS = 30_000;

/* O TETO RELATIVO À MEDIANA, E TRÊS SEGUIDAS PARA REPROVAR.
 *
 * Três reprovações do CI numa semana (2026-11-12) foram arquivo com a peça certa que passou de um teto posto com uma medida só:
 * as conferências da instalação solar a 80 s no CI e 27 s sozinhas, o `acervo-real.test` a 337 s contra 320 s, e o
 * `abre-na-bancada.test` a 180 s. A máquina do CI varia de duas a três vezes (apoio-do-vinco: 65,6 s no CI, 18,4 s sozinho, 22,8 s
 * na bateria local; as conferências solares: 80/27, 3,0 vezes), e essa variação é de uma execução, não do arquivo. O que o teto quer
 * pegar é o arquivo que ficou mais lento e continua assim.
 *
 * Por isso, com histórico (tools/vitest-duracoes.mjs guarda as últimas execuções de cada arquivo), o teto é FATOR_DO_TETO vezes a
 * mediana das execuções de referência, que são todas menos as `SEGUIDAS_QUE_REPROVAM` últimas (a que se avalia e as duas de antes), para que uma regressão que se
 * repete não entre na própria referência. O fator é 2: abaixo das 3 vezes de uma execução ruim do CI, que por isso só avisa, e
 * abaixo do dobro de tempo que o plano quer ver reprovado quando se mantém. Uma execução acima do teto é aviso; a última e as duas
 * anteriores acima do teto, três seguidas, reprovam. Com menos de `MINIMO_DE_REFERENCIA` execuções de referência vale o teto fixo
 * do arquivo, e a ação é a de antes: o rápido reprova, o lento só avisa. O piso evita teto de poucos segundos para arquivo que
 * leva um. */
export const FATOR_DO_TETO = 2;
export const SEGUIDAS_QUE_REPROVAM = 3;
export const MINIMO_DE_REFERENCIA = 3;
export const PISO_DO_TETO_RELATIVO_MS = 10_000;

export function mediana(valores) {
  const ordenados = [...valores].sort((a, b) => a - b);
  const meio = Math.floor(ordenados.length / 2);
  return ordenados.length % 2 ? ordenados[meio] : (ordenados[meio - 1] + ordenados[meio]) / 2;
}

/* `historico`: as durações do arquivo, da mais antiga para a mais nova, com a execução que se avalia no fim.
   Devolve { teto, relativo, ms, acima, seguidas, veredito } com veredito 'ok', 'aviso' ou 'reprova'. */
export function avaliarTeto(historico, { fixo, piso = PISO_DO_TETO_RELATIVO_MS, semHistorico = 'reprova' }) {
  const ms = historico.at(-1);
  const referencia = historico.slice(0, -SEGUIDAS_QUE_REPROVAM);
  const relativo = referencia.length >= MINIMO_DE_REFERENCIA;
  const teto = relativo ? Math.max(FATOR_DO_TETO * mediana(referencia), piso) : fixo;
  const acima = ms > teto;
  let seguidas = 0;
  for (let i = historico.length - 1; i >= 0 && historico[i] > teto; i -= 1) seguidas += 1;
  const veredito = !acima ? 'ok' : !relativo ? semHistorico : seguidas >= SEGUIDAS_QUE_REPROVAM ? 'reprova' : 'aviso';
  return { teto, relativo, ms, acima, seguidas, veredito };
}

/* O teto de cada arquivo desta execução, com o histórico lido do disco; sem histórico do arquivo, o fixo. */
export function avaliarDuracoes(duracoes, historicos, opcoes) {
  return duracoes.map(({ arquivo, ms }) => {
    const anteriores = historicos[arquivo] ?? [];
    /* o histórico já traz esta execução, gravada pelo repórter; se não trouxer (outro modo de rodar), entra aqui */
    const historico = anteriores.at(-1) === ms ? anteriores : [...anteriores, ms];
    return { arquivo, ...avaliarTeto(historico, opcoes) };
  });
}

/* Os arquivos fora da lista dos lentos acima do teto. `historicos` (opcional) dá o teto relativo de cada arquivo, sem piso abaixo
   do teto fixo, porque um rápido que passa do fixo deve ir para a lista dos lentos; sem ele, o teto fixo para todos, como sempre foi. */
export function acimaDoTeto(duracoes, teto = TETO_DO_RAPIDO_MS, historicos = {}) {
  const rapidos = duracoes.filter(({ arquivo }) => !TESTES_LENTOS.includes(arquivo));
  return avaliarDuracoes(rapidos, historicos, { fixo: teto, piso: teto, semHistorico: 'reprova' }).filter((a) => a.acima);
}

/* O arquivo que passou do teto dentro da bateria roda de novo sozinho, e só reprova se ainda passar de TETO_SOZINHO_MS. Entre
 * 2026-10-22 e 2026-10-24 o teto reprovou quase toda bateria completa com arquivos de 4 a 12 s sozinhos que passaram de 30 s
 * só porque os testes que abrem o Blender e os agentes de modelagem disputavam os 4 processadores; a conferência sozinha separa
 * a carga da máquina do arquivo pesado, que é o que o teto quer pegar (um teste de 8 s sozinho já passa dele na bateria). */
export const TETO_SOZINHO_MS = 12_000;

/* A medida "sozinho" só vale se a máquina estiver livre. Em 2026-11-03, com três agentes modelando ao lado, a carga média passou
 * de 11 em 4 processadores, e dois arquivos de uns 6 s mediram 12,5 e 20,5 s sozinhos e reprovaram a bateria. Com a carga média
 * de um minuto acima do número de processadores na hora da medida, o estouro vira aviso, porque não há como separar o arquivo
 * pesado da máquina ocupada; o CI, que roda em máquina limpa, cobra sempre. */
export function maquinaOcupada({ carga, processadores, ci = false }) {
  return !ci && carga > processadores;
}

/* Fora do CI a bateria roda em mais processadores, e em 2026-11-12 levou 22,8 s no arquivo que o CI mediu em 65,6 s (o mesmo
 * arquivo levou 18,4 s sozinho aqui e 16,3 s lá). Com o teto de 30 s da bateria, a conferência local nunca o media sozinho, e
 * dois envios seguidos reprovaram no CI por tempo. Fora do CI, todo arquivo acima de 12 s na bateria é medido sozinho, e o teto
 * sozinho tem margem: o segundo arquivo mediu 10,9 s aqui e 12,2 s no CI. */
export const TETO_LOCAL_DA_BATERIA_MS = 12_000;
export const TETO_LOCAL_SOZINHO_MS = 10_000;

export function tetosDaBateria({ ci = false } = {}) {
  return ci
    ? { bateria: TETO_DO_RAPIDO_MS, sozinho: TETO_SOZINHO_MS }
    : { bateria: TETO_LOCAL_DA_BATERIA_MS, sozinho: TETO_LOCAL_SOZINHO_MS };
}

export function pesadosSozinhos(lentos, medir, teto = TETO_SOZINHO_MS) {
  return lentos.map((d) => ({ ...d, sozinhoMs: medir(d.arquivo) })).filter((d) => d.sozinhoMs > teto);
}

/* Mede o arquivo pelo próprio relatório do vitest (do começo ao fim dos testes dele), e não pelo relógio de parede, que soma
 * a partida do vitest e a importação (3 a 7 s com a máquina ocupada) e fez o primeiro uso reprovar um arquivo de 4,8 s. */
function medirSozinho(raiz) {
  return (arquivo) => {
    const saida = join(raiz, 'tmp', 'gates', 'sozinho.json');
    const inicio = Date.now();
    spawnSync('npx', ['vitest', 'run', arquivo, '--reporter=json', `--outputFile=${saida}`], { cwd: raiz, stdio: 'ignore', shell: true });
    try {
      const r = JSON.parse(readFileSync(saida, 'utf8')).testResults?.[0];
      if (r && Number.isFinite(r.endTime - r.startTime)) return r.endTime - r.startTime;
    } catch { /* sem relatório: cai no relógio de parede */ }
    return Date.now() - inicio;
  };
}

function ramoRemoto() {
  const r = spawnSync('git', ['rev-parse', '--abbrev-ref', '@{u}'], { encoding: 'utf8' });
  return r.status === 0 ? r.stdout.trim() : null;
}

export function argumentosDoVitest(modo, { ambiente = process.env, remoto = ramoRemoto } = {}) {
  /* A bateria, pelo seletor (tools/gates/seletor.mjs), passa os arquivos de código mudados desde a última rodada verde; o
     `vitest related` roda só os testes que os importam, respeitando a divisão entre rápidos e lentos da configuração. */
  if (ambiente.GATES_TESTES_RELACIONADOS && !ambiente.CI && ambiente.GATES_COMPLETO !== '1') {
    const arquivos = JSON.parse(readFileSync(ambiente.GATES_TESTES_RELACIONADOS, 'utf8'));
    return { args: ['related', ...arquivos, '--run', '--passWithNoTests'], motivo: `os ${modo} ligados a ${arquivos.length} arquivo(s) mudados desde a última rodada verde` };
  }
  if (modo === 'rapidos') return { args: ['run'], motivo: 'todos os testes fora da lista dos lentos' };
  if (ambiente.CI || ambiente.GATES_COMPLETO === '1') return { args: ['run'], motivo: 'todos os lentos (CI ou --completo)' };
  const base = remoto();
  if (!base) return { args: ['run'], motivo: 'todos os lentos (não deu para saber o ramo remoto)' };
  return { args: ['run', '--changed', base, '--passWithNoTests'], motivo: `os lentos ligados ao que mudou desde ${base}` };
}

/* No CI os testes lentos rodam divididos entre máquinas: GATES_PARTE=2/5 roda a segunda de cinco partes.
 *
 * Medido em 2026-10-28: o `--shard` do vitest divide pelo número de arquivos, e duas das cinco partes levavam 4,5 e 5 minutos
 * enquanto as outras levavam 2, porque os arquivos mais pesados caíram juntos. Os lentos se dividem pelo peso medido de cada
 * arquivo (`testes-lentos-pesos.json`), o mais pesado primeiro na parte mais leve; o arquivo sem peso medido entra com a
 * mediana. O peso só muda o equilíbrio, nunca quem roda: todo arquivo da lista cai em exatamente uma parte. Para renovar os pesos
 * depois de uma rodada inteira dos lentos: `node tools/testes-lentos.mjs --pesos`. */
export const ARQUIVO_DOS_PESOS = join(dirname(fileURLToPath(import.meta.url)), 'testes-lentos-pesos.json');

export function lerParte(parte) {
  const m = /^(\d+)\/(\d+)$/.exec(parte ?? '');
  if (!m || Number(m[1]) < 1 || Number(m[1]) > Number(m[2])) throw new Error(`GATES_PARTE='${parte}' não é parte/total, como 2/5`);
  return { indice: Number(m[1]), total: Number(m[2]) };
}

export function partesPorPeso(arquivos, pesos, total) {
  const medidos = arquivos.map((a) => pesos[a]).filter((p) => p > 0).sort((x, y) => x - y);
  const mediana = medidos.length ? medidos[Math.floor(medidos.length / 2)] : 1;
  const partes = Array.from({ length: total }, () => ({ peso: 0, arquivos: [] }));
  const ordem = [...arquivos].sort((a, b) => (pesos[b] ?? mediana) - (pesos[a] ?? mediana) || a.localeCompare(b));
  for (const arquivo of ordem) {
    const leve = partes.reduce((min, p) => (p.peso < min.peso ? p : min));
    leve.peso += pesos[arquivo] ?? mediana;
    leve.arquivos.push(arquivo);
  }
  return partes.map((p) => p.arquivos.sort());
}

function lerPesos() {
  try { return JSON.parse(readFileSync(ARQUIVO_DOS_PESOS, 'utf8')).segundos ?? {}; } catch { return {}; }
}

export function comParte(args, ambiente = process.env, modo = 'lentos', pesos = lerPesos()) {
  if (!ambiente.GATES_PARTE) return args;
  const { indice, total } = lerParte(ambiente.GATES_PARTE);
  if (modo === 'lentos' && args.length === 1 && args[0] === 'run') return ['run', ...partesPorPeso(TESTES_LENTOS, pesos, total)[indice - 1]];
  return [...args, `--shard=${indice}/${total}`];
}

function gravarPesos(raiz) {
  const { gravado, duracoes } = JSON.parse(readFileSync(join(raiz, 'tmp', 'gates', 'duracoes-dos-testes-lentos.json'), 'utf8'));
  const medidos = Object.fromEntries(duracoes.map(({ arquivo, ms }) => [arquivo, Math.max(1, Math.round(ms / 1000))]));
  const segundos = Object.fromEntries(TESTES_LENTOS.filter((a) => a in medidos).map((a) => [a, medidos[a]]));
  writeFileSync(ARQUIVO_DOS_PESOS, `${JSON.stringify({ medido: `${gravado.slice(0, 10)}; só a proporção entre os arquivos importa`, segundos }, null, 1)}\n`);
  console.log(`testes-lentos — ${Object.keys(segundos).length} pesos gravados em ${ARQUIVO_DOS_PESOS}.`);
}

/* Os lentos também têm teto: o plano da bateria rápida (fatia 5) pede cada arquivo abaixo de 60 s, e a parte do CI que segura a
   rodada é a do arquivo mais longo. Sem histórico o teto é o fixo e só avisa, como sempre foi; com histórico vale o teto relativo
   à mediana (`avaliarTeto`), uma execução acima avisa e três seguidas reprovam. A lista sai no fim da saída, onde quem lê o
   registro do CI a encontra. */
export const TETO_DO_LENTO_MS = 60_000;

export function relatarLentos(duracoes, historicos) {
  const avaliados = avaliarDuracoes(duracoes, historicos, { fixo: TETO_DO_LENTO_MS, semHistorico: 'aviso' }).filter((a) => a.acima).sort((a, b) => b.ms - a.ms);
  const s = (ms) => `${Math.round(ms / 1000)} s`;
  const linha = (a) => `${a.arquivo} ${s(a.ms)} (teto ${s(a.teto)}${a.relativo ? `, ${FATOR_DO_TETO} vezes a mediana; ${a.seguidas} seguida(s)` : ', fixo, sem histórico'})`;
  const avisos = avaliados.filter((a) => a.veredito === 'aviso');
  const reprovados = avaliados.filter((a) => a.veredito === 'reprova');
  return {
    reprovados,
    linhas: [
      ...(avisos.length ? [`test:lentos — aviso, ${avisos.length} arquivo(s) acima do teto numa execução só: ${avisos.map(linha).join(', ')}.`] : []),
      ...(reprovados.length ? [`test:lentos — ${reprovados.length} arquivo(s) acima do teto em ${SEGUIDAS_QUE_REPROVAM} execuções seguidas: ${reprovados.map(linha).join(', ')}. Meça por etapa antes de dividir, ou suba o teto com a medida.`] : []),
      ...(avaliados.length ? [] : [`test:lentos — nenhum arquivo acima do teto.`]),
    ],
  };
}

function avisarAcimaDoTetoDosLentos(caminho, inicio) {
  const { gravado, duracoes } = JSON.parse(readFileSync(caminho, 'utf8'));
  if (Date.parse(gravado) < inicio) return;
  const { linhas, reprovados } = relatarLentos(duracoes, lerHistorico('lentos'));
  for (const linha of linhas) (reprovados.length ? console.error : console.log)(linha);
  if (reprovados.length) process.exitCode = 1;
}

function rodar(modo) {
  const { args: semParte, motivo } = argumentosDoVitest(modo);
  const args = comParte(semParte, process.env, modo);
  console.log(`test:${modo} — ${motivo}${process.env.GATES_PARTE ? `, parte ${process.env.GATES_PARTE}` : ''}.`);
  const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
  const inicio = Date.now();
  const r = spawnSync('npx', ['vitest', ...args], { cwd: raiz, stdio: 'inherit', shell: true, env: { ...process.env, MODELAR_TESTES: modo } });
  process.exitCode = r.status ?? 1;
  const caminho = join(raiz, 'tmp', 'gates', `duracoes-dos-testes-${modo}.json`);
  if (!existsSync(caminho)) return;
  if (modo === 'lentos') { avisarAcimaDoTetoDosLentos(caminho, inicio); return; }
  const { gravado, duracoes } = JSON.parse(readFileSync(caminho, 'utf8'));
  if (Date.parse(gravado) < inicio) return;
  const tetos = tetosDaBateria({ ci: Boolean(process.env.CI) });
  const lentos = acimaDoTeto(duracoes, tetos.bateria, lerHistorico('rapidos'));
  if (!lentos.length) return;
  const cargaAntes = loadavg()[0];
  const pesados = pesadosSozinhos(lentos, medirSozinho(raiz), tetos.sozinho);
  const carga = Math.max(cargaAntes, loadavg()[0]);
  const processadores = availableParallelism();
  const s1 = (ms) => `${Math.round(ms / 100) / 10} s`;
  for (const d of lentos.filter((l) => !pesados.some((p) => p.arquivo === l.arquivo))) {
    console.log(`test:rapidos — ${d.arquivo} levou ${s1(d.ms)} na bateria, mas roda sozinho abaixo de ${tetos.sozinho / 1000} s: carga da máquina, não reprova.`);
  }
  if (!pesados.length) return;
  if (maquinaOcupada({ carga, processadores, ci: Boolean(process.env.CI) })) {
    console.log(`test:rapidos — aviso: ${pesados.map(({ arquivo, sozinhoMs }) => `${arquivo} (${s1(sozinhoMs)} sozinho)`).join(', ')} passaram do teto, mas a máquina está ocupada (carga ${carga.toFixed(1)} em ${processadores} processadores) e a medida não separa o arquivo da carga; o CI cobra o teto em máquina limpa.`);
    return;
  }
  /* com histórico, o estouro isolado é aviso e só três seguidas reprovam; sem histórico vale o teto fixo, que reprova */
  const avisos = pesados.filter((d) => d.veredito !== 'reprova');
  const reprovados = pesados.filter((d) => d.veredito === 'reprova');
  if (avisos.length) console.log(`test:rapidos — aviso, ${avisos.map(({ arquivo, ms, sozinhoMs, teto, seguidas }) => `${arquivo} (${s1(ms)} na bateria, ${s1(sozinhoMs)} sozinho, teto ${s1(teto)}, ${seguidas} seguida(s) de ${SEGUIDAS_QUE_REPROVAM})`).join(', ')}: acima do teto numa execução só, reprova com ${SEGUIDAS_QUE_REPROVAM} seguidas.`);
  if (!reprovados.length) return;
  console.error(`test:rapidos — ${reprovados.length} arquivo(s) passaram do teto da bateria rápida (${tetos.bateria / 1000} s, ou ${FATOR_DO_TETO} vezes a mediana das execuções guardadas) e de ${tetos.sozinho / 1000} s sozinhos${process.env.CI ? '' : ' (tetos locais, com margem para o CI)'}:`);
  for (const { arquivo, ms, sozinhoMs } of reprovados) console.error(`  ${s1(ms)} na bateria, ${s1(sozinhoMs)} sozinho  ${arquivo}`);
  console.error('Ponha cada um em TESTES_LENTOS, em tools/testes-lentos.mjs, ou deixe-o mais leve.');
  process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.includes('--pesos')) { gravarPesos(join(dirname(fileURLToPath(import.meta.url)), '..')); process.exit(0); }
  const modo = process.argv.includes('--lentos') ? 'lentos' : process.argv.includes('--rapidos') ? 'rapidos' : null;
  if (!modo) { console.error('uso: node tools/testes-lentos.mjs --rapidos | --lentos'); process.exit(2); }
  rodar(modo);
}
