/* esboco-blocagem-medidas.mjs — as medidas de silhueta do `--nivel-zero`, de um esboço por vez, e o conjunto de processos que as
 * tira ao mesmo tempo.
 *
 * `medirSilhueta(caminho)` faz o trabalho pesado do teste `esboco-blocagem.test.mjs` para um esboço: a blocagem, e para cada opção e
 * cada uma das quatro vistas a camada da blocagem e a do desenho atual (com os lados do esboço e com os da ferramenta), e devolve os
 * números (área da máscara, IoU, razão das escalas, tamanho do quadro) sem conferir nenhum. Quem confere é o teste, com os mesmos
 * mínimos de sempre: a medida e a conferência ficaram separadas para a medida poder rodar em outro processo.
 *
 * `iniciarMedicao(caminhos, { fios })` reparte os esboços entre `fios` processos, o maior arquivo primeiro e cada processo pegando o
 * próximo quando termina o que tinha (os esboços do banco de provas custam de menos de 1 s a mais de 20 s, e uma divisão fixa deixaria
 * um processo com o avião e os outros parados). Devolve, para cada caminho, a promessa da medida. */
import { fork } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { fileURLToPath } from 'node:url';
import { desenharEsboco } from '../../modulos/esboco/src/index.js';
import { expandirEsboco } from '../../modulos/esboco/src/expandir.js';
import { desenharBlocagem } from '../../modulos/esboco/src/desenho-da-blocagem.js';
import { blocagemDoEsboco } from './esboco-blocagem.mjs';
import { variante, VISTAS_DA_ANALISE } from './esboco.mjs';
import { CAMADA_DA_SILHUETA, iou, mascaraDaCamada } from './esboco-silhueta.mjs';

const lerJson = (caminho) => JSON.parse(readFileSync(caminho, 'utf8'));

/* O desenho atual da opção `numero` (só ela, num painel) com as formas `ocultas` escondidas, na vista, com os lados do esboço
   (`lados: false`) ou os da ferramenta (`lados: true`, o `ladosPorEscala` do `--composta`). */
export function desenhoAtual(bruto, numero, vista, ocultas, lados) {
  const e = expandirEsboco(bruto);
  const o = { ...e.opcoes[numero - 1], formas: e.opcoes[numero - 1].formas.map((f) => (ocultas.includes(f.id) ? { ...f, oculto: true } : f)) };
  return desenharEsboco(variante({ ...e, opcoes: [o], ladosPorEscala: lados }, { vista, legendas: false, centros: false }), CAMADA_DA_SILHUETA);
}

/** @returns {{ opcoesDoEsboco: number, paineis: number, opcoes: Array<{ inclinada: boolean, vistas: Array<{ vista: string, area: number, medidas: Array<{ lados: boolean, iou: number, razaoDasEscalas: number, mesmaLargura: boolean, mesmaAltura: boolean }> }> }> }} */
export function medirSilhueta(caminho) {
  const bruto = lerJson(caminho);
  const b = blocagemDoEsboco(bruto);
  const saida = { opcoesDoEsboco: expandirEsboco(bruto).opcoes.length, paineis: b.paineis.length, opcoes: [] };
  b.paineis.forEach((painel, i) => {
    const opcao = b.opcoes[i];
    const ocultas = opcao.semEquivalente.map((x) => x.id);
    const inclinada = opcao.perdas.some((p) => p.perdido.some((d) => d.codigo === 'inclinacao'));
    const vistas = [];
    for (const vista of VISTAS_DA_ANALISE) {
      const novo = desenharBlocagem({ vista, paineis: [painel] }, CAMADA_DA_SILHUETA);
      const mascara = mascaraDaCamada(novo.camada);
      const medidas = [];
      for (const lados of [false, true]) {
        const atual = desenhoAtual(bruto, i + 1, vista, ocultas, lados);
        medidas.push({
          lados,
          iou: iou(mascara, mascaraDaCamada(atual.camada)).iou,
          razaoDasEscalas: novo.escala / atual.escala,
          mesmaLargura: novo.largura === atual.largura,
          mesmaAltura: novo.altura === atual.altura,
        });
      }
      vistas.push({ vista, area: mascara.area, medidas });
    }
    saida.opcoes.push({ inclinada, vistas });
  });
  return saida;
}

export function iniciarMedicao(caminhos, { fios = Math.min(availableParallelism(), 4) } = {}) {
  const fila = [...caminhos].sort((a, b) => statSync(b).size - statSync(a).size);
  const resolvedores = new Map();
  const promessas = new Map(caminhos.map((c) => [c, new Promise((resolver) => resolvedores.set(c, resolver))]));
  const processos = [];
  let proximo = 0;
  const dar = (processo) => {
    if (proximo >= fila.length) { processo.kill(); return; }
    const caminho = fila[proximo]; proximo += 1;
    processo.emTrabalho = caminho;
    processo.send({ caminho });
  };
  for (let n = 0; n < Math.min(fios, fila.length); n++) {
    const processo = fork(fileURLToPath(new URL('./esboco-blocagem-fio.mjs', import.meta.url)), [], { stdio: ['ignore', 'inherit', 'inherit', 'ipc'] });
    processos.push(processo);
    processo.on('message', (mensagem) => { processo.emTrabalho = null; resolvedores.get(mensagem.caminho)(mensagem); dar(processo); });
    /* o processo que cai com um esboço na mão entrega a causa em vez de deixar o teste daquele esboço esperando */
    processo.on('exit', (codigo, sinal) => {
      if (processo.emTrabalho) resolvedores.get(processo.emTrabalho)({ caminho: processo.emTrabalho, erro: `o processo de medida terminou (código ${codigo}, sinal ${sinal}) antes de entregar a medida` });
    });
    dar(processo);
  }
  return { promessas, encerrar: () => processos.forEach((p) => p.kill()) };
}
