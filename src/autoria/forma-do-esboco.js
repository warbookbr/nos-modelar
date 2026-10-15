/* forma-do-esboco.js — a forma de cada parte da receita contra a forma do esboço que ela refina, pela sobreposição de volume.
 *
 * O envelope do `REFINA` (`refinamento-global.js`) é uma caixa e limita a parte só por cima: uma ponta de asa feita em qualquer lugar da
 * caixa da asa inteira passa, e a parte sem volume no andaime (a pá da hélice) nem tem o que conferir. Aqui cada parte é comparada ao
 * sólido da própria forma do esboço, com os recortes, as inclinações e a malha de família (`solido-do-esboco.js`), e a razão
 * interseção/união de volume,
 *
 *     razão = V(parte ∩ formas) / V(parte ∪ formas),
 *
 * reprova abaixo do mínimo que a receita declarou em `REFINA.esboco`. A razão vale 1 quando a parte é a forma, cai com a parte menor,
 * maior ou deslocada, e cai com o recorte que a parte não fez (a forma sem o vão tem mais volume que a forma recortada). A parte pode
 * refinar mais de uma forma do esboço, e então a comparação é com a união delas.
 *
 * A parte que a pessoa decidiu pôr noutro lugar declara `deslocamento` em `REFINA.esboco.formas` (com o `motivo`), e a razão é medida
 * contra a forma transladada por esse vetor. Como a razão não muda quando os dois sólidos andam juntos, a conta move a malha da parte
 * pelo vetor contrário e deixa a forma onde o esboço a pôs; é a mesma razão, sem criar sólido deslocado. A parte que alonga ou gira não é
 * translação, não declara deslocamento e fica com o mínimo próprio.
 *
 * O QUE ELA NÃO DIZ. A razão mede volume e não posição de cada detalhe: uma parte com a metade do volume no lugar certo e o resto no
 * errado dá uma razão baixa, mas uma que erra por menos que o mínimo passa. O mínimo é de quem declara, forma a forma, e a razão que
 * a parte tem de fato vem em `partes`. A parte cuja malha não fecha, ou cuja forma não tem sólido, não tem razão: volta como achado
 * que reprova, e não como parte aprovada.
 *
 * `esboco` é o `REFINA.esboco` (bruto ou canônico), `dados` as formas da opção (`formasResolvidas`), `neutro` o resultado da receita
 * (metro) e `malhaDaFamilia(forma)` a malha da forma de família (ver `solido-do-esboco.js`). Este módulo não conhece disco, Three.js
 * nem DOM. */
import { ErroDoSolido, criarContextoDeSolidos, criarSolidosDoEsboco, soldarMalha, triangularPoligonos } from './solido-do-esboco.js';
import { afastamentoDaParte, normalizarEsbocoDoRefinamento, vetorTexto } from './refinamento-global.js';

export const FORMATO_FORMA_DO_ESBOCO = 'mecanifica.forma-do-esboco@1';

const MM_POR_METRO = 1000;
const MM3_POR_CM3 = 1000;
const comparar = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const lista = (ids) => (ids.length === 1 ? `a forma '${ids[0]}'` : `as formas ${ids.map((id) => `'${id}'`).join(' e ')}`);
const virgula = (texto) => String(texto).replace('.', ',');

/** A razão com três casas, ou com cinco quando as três casas a igualariam ao mínimo que ela não alcançou. */
export function textoDaRazao(razao, minimo) {
  const curto = razao.toFixed(3);
  return virgula(razao < minimo && curto >= minimo.toFixed(3) ? razao.toFixed(5) : curto);
}
const textoMm = (mm) => virgula(Number(mm.toFixed(1)));
const cm3 = (mm3) => virgula(Math.round(mm3 / MM3_POR_CM3));

/* Os ids da opção em ordem, até 20, e quantos ficaram de fora (o avião tem 140 formas). */
const LIMITE_DE_IDS_NA_MENSAGEM = 20;
function listaDeIds(ids) {
  const todos = [...ids].sort(comparar);
  const mostrados = todos.slice(0, LIMITE_DE_IDS_NA_MENSAGEM).join(', ');
  return `formas: ${mostrados}${todos.length > LIMITE_DE_IDS_NA_MENSAGEM ? ` e mais ${todos.length - LIMITE_DE_IDS_NA_MENSAGEM}` : ''}`;
}

/* As faces de uma parte da receita como triângulos, os vértices em milímetro. Com `deslocamento` (o vetor que a receita declara para a
   parte), os vértices voltam por ele ao lugar que a forma do esboço ocupa. */
function malhaDaParte(neutro, nome, deslocamento = null) {
  const indice = new Map();
  const vertices = [];
  const poligonos = [];
  for (const face of neutro.F.values()) {
    if (face.parte !== nome) continue;
    poligonos.push(face.vs.map((id) => {
      if (!indice.has(id)) {
        const p = neutro.V.get(id);
        if (!p) throw new ErroDoSolido(`a face ${face.id} da parte '${nome}' cita o vértice ${id}, que a peça não tem`, 'malha-invalida');
        indice.set(id, vertices.length);
        vertices.push(p.map((c, k) => c * MM_POR_METRO - (deslocamento ? deslocamento[k] : 0)));
      }
      return indice.get(id);
    }));
  }
  const soldada = soldarMalha(vertices, triangularPoligonos(vertices, poligonos));
  return { ...soldada, caixa: caixaDe(vertices) };
}

function caixaDe(pontos) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const p of pontos) for (let i = 0; i < 3; i++) { min[i] = Math.min(min[i], p[i]); max[i] = Math.max(max[i], p[i]); }
  return { min, max };
}

function partesEntregues(neutro) {
  const nomes = new Set();
  for (const face of neutro.F.values()) if (face.parte) nomes.add(face.parte);
  return nomes;
}

/**
 * Confere as partes que `REFINA.esboco` liga a formas do esboço. Devolve `{ formato, ok, arquivo, opcao, minimo, achados, partes }`; cada
 * achado tem `codigo`, `parte`, `mensagem` e, conforme o caso, `formas`, `razao` e `minimo`, e cada parte medida tem `razao`, `minimo`,
 * `ok` e os volumes (mm3) da parte, das formas e da interseção.
 */
export function conferirFormaDoEsboco({ esboco, dados, neutro, malhaDaFamilia = null }) {
  const declaracao = normalizarEsbocoDoRefinamento(esboco);
  const ids = new Set((dados?.formas ?? []).map((f) => f.id));
  const entregues = partesEntregues(neutro);
  const achados = [];
  const aMedir = [];

  for (const entrada of declaracao.formas) {
    const { parte, formas, minimo: proprio } = entrada;
    const minimo = proprio ?? declaracao.minimo;
    const afastamento = afastamentoDaParte(entrada);
    const desconhecidas = formas.filter((id) => !ids.has(id));
    if (desconhecidas.length) {
      achados.push({
        codigo: 'forma-do-esboco-desconhecida', parte, formas: desconhecidas,
        mensagem: `a parte '${parte}' declara refinar ${lista(desconhecidas)} do esboço ${declaracao.arquivo} (opção ${dados.opcao?.titulo ?? dados.opcao?.numero ?? declaracao.opcao}), e a opção não tem ${desconhecidas.length === 1 ? 'essa forma' : 'essas formas'} (${listaDeIds(ids)}).`,
      });
      continue;
    }
    if (!entregues.has(parte)) {
      achados.push({
        codigo: 'parte-ausente-do-esboco', parte, formas,
        mensagem: `a parte '${parte}' declara refinar ${lista(formas)} do esboço ${declaracao.arquivo}, e a peça não tem nenhuma face com esse nome.`,
      });
      continue;
    }
    aMedir.push({ parte, formas, minimo, afastamento });
  }

  const semSolidoDaParte = (parte, formas, e) => achados.push({
    codigo: 'parte-sem-solido', parte, formas,
    mensagem: `a parte '${parte}' não tem como ser comparada com ${lista(formas)} do esboço: ${e.message}.`,
  });
  const medidas = [];
  const malhas = new Map();
  for (const { parte, formas, afastamento } of aMedir) {
    try {
      malhas.set(parte, malhaDaParte(neutro, parte, afastamento.deslocamento ?? null));
    } catch (e) {
      if (!(e instanceof ErroDoSolido)) throw e;
      semSolidoDaParte(parte, formas, e);
    }
  }
  const prontas = aMedir.filter(({ parte }) => malhas.has(parte));
  if (prontas.length) {
    const caixa = caixaDe([...malhas.values()].flatMap((m) => [m.caixa.min, m.caixa.max]));
    const contexto = criarContextoDeSolidos({ origem: [0, 1, 2].map((i) => (caixa.min[i] + caixa.max[i]) / 2) });
    try {
      const solidos = criarSolidosDoEsboco(dados, { contexto, malhaDaFamilia });
      for (const { parte, formas, minimo, afastamento } of prontas) {
        let doEsboco;
        let daParte;
        try {
          doEsboco = contexto.uniao(formas.map((id) => solidos.solido(id)));
        } catch (e) {
          if (!(e instanceof ErroDoSolido)) throw e;
          achados.push({ codigo: 'forma-do-esboco-sem-solido', parte, formas, mensagem: `a parte '${parte}' declara refinar ${lista(formas)} do esboço, e o sólido não saiu: ${e.message}.` });
          continue;
        }
        /* o deslocamento tem teto proporcional à forma: uma parte posta mais longe que a maior aresta da caixa da forma saiu da vizinhança
           do esboço, e quem decidiu isso trocou de parte e não afastou esta */
        if (afastamento.deslocamento) {
          const { min, max } = contexto.caixa(doEsboco);
          const maiorAresta = Math.max(...[0, 1, 2].map((i) => max[i] - min[i]));
          const distancia = Math.hypot(...afastamento.deslocamento);
          if (distancia > maiorAresta) {
            achados.push({
              codigo: 'deslocamento-maior-que-a-forma', parte, formas, deslocamento: afastamento.deslocamento,
              mensagem: `a parte '${parte}' declara deslocamento ${vetorTexto(afastamento.deslocamento)} mm (${textoMm(distancia)} mm) em REFINA.esboco.formas, e a maior aresta da caixa do esboço para ${lista(formas)} é ${textoMm(maiorAresta)} mm: uma parte posta mais longe que o tamanho da própria forma é outra parte, e o esboço é que muda.`,
            });
          }
        }
        try {
          const m = malhas.get(parte);
          daParte = contexto.daMalha(m.vertices, m.triangulos, `a malha da parte '${parte}'`);
        } catch (e) {
          if (!(e instanceof ErroDoSolido)) throw e;
          semSolidoDaParte(parte, formas, e);
          continue;
        }
        const volumeDaParte = contexto.volume(daParte);
        const volumeDasFormas = contexto.volume(doEsboco);
        const volumeComum = contexto.volume(contexto.intersecao([daParte, doEsboco]));
        const uniao = volumeDaParte + volumeDasFormas - volumeComum;
        const razao = uniao > 0 ? volumeComum / uniao : 0;
        const ok = razao >= minimo;
        medidas.push({ parte, formas, razao, minimo, ok, ...afastamento, volumeParteMm3: volumeDaParte, volumeFormasMm3: volumeDasFormas, volumeComumMm3: volumeComum });
        if (!ok) {
          achados.push({
            codigo: 'parte-fora-da-forma-do-esboco', parte, formas, razao, minimo,
            mensagem: `a parte '${parte}' tem razão interseção/união de volume ${textoDaRazao(razao, minimo)} com ${lista(formas)} do esboço${afastamento.deslocamento ? ` deslocad${formas.length === 1 ? 'a' : 'as'} ${vetorTexto(afastamento.deslocamento)} mm (REFINA.esboco.formas.${parte}.deslocamento)` : ''} (mínimo ${virgula(minimo)}): a parte tem ${cm3(volumeDaParte)} cm3, ${formas.length === 1 ? 'a forma tem' : 'as formas têm'} ${cm3(volumeDasFormas)} cm3 e as duas dividem ${cm3(volumeComum)} cm3.`,
          });
        }
      }
    } finally {
      contexto.liberar();
    }
  }

  return {
    formato: FORMATO_FORMA_DO_ESBOCO,
    ok: achados.length === 0,
    arquivo: declaracao.arquivo,
    opcao: dados?.opcao ?? declaracao.opcao,
    minimo: declaracao.minimo,
    achados,
    partes: medidas.sort((a, b) => comparar(a.parte, b.parte)),
  };
}
