/* G01 sobre o andaime derivado do esboço e sobre a malha da peça. O gate (`avaliarFormaGlobal`) compara um alvo N2 com uma
   blocagem: envelope, landmarks, regiões obrigatórias, orçamento e as silhuetas frontal, direita e superior. Aqui estão as duas
   chamadas prontas. A do andaime compila a blocagem do andaime do nível zero contra o alvo; a da malha troca, na blocagem desse
   mesmo andaime, os triângulos dos volumes pelos da peça executada, e o gate roda inalterado. Nos dois casos avalia o alvo (G00, com
   a crítica quando houver) e devolve o G01 completo, mais `medidasAprovadas`, que diz se as medidas passam sem depender de a
   crítica do alvo estar registrada (o G01 fica `bloqueado` enquanto o G00 está, e esta pergunta é a que o esboço e o veredito da
   peça querem responder antes da crítica).

   O alvo e o andaime têm de ser do mesmo objeto: o `alvo`, o `objetivo`, a `familia` e os `eixos` do andaime derivado saem das opções
   do tradutor (`traduzirFormasParaAndaime(dados, { alvo: alvo.id, objetivo, familia, eixos })`), e a compilação recusa o que
   não coincide. Os landmarks do alvo são conferidos por id contra os do andaime (o centro do conjunto e os pontos nomeados do
   esboço), e um landmark que o andaime não tem aparece como `landmark-ausente`. Puro e determinístico.

   SOBRE A MALHA DA PEÇA. A blocagem da peça tem, no lugar dos vértices do andaime, os triângulos das faces da peça (as faces do
   núcleo triangulam como `prepararSolido`, em milímetro), cada triângulo no volume do andaime que a parte dele refina (`REFINA.partes`),
   e o envelope derivado sai desses vértices. Três coisas continuam sendo do andaime, porque a malha não as revela: os landmarks, o
   envelope declarado e as regiões do volume. As regiões obrigatórias valem pelas partes que a peça entregou: parte que falta tira
   a região do volume dela. O orçamento do alvo limita a blocagem do andaime e não a peça detalhada, e por isso a malha da peça não
   o conta em `medidasAprovadas` (o campo `orcamento` do G01 continua no resultado, medido). */
import { prepararSolido } from './contato-de-solidos.js';
import {
  avaliarAlvoFormaGlobal, avaliarFormaGlobal, compilarBlocagemGlobal, normalizarAlvoFormaGlobal, normalizarAndaimeGlobal,
} from './forma-global.js';

export const FORMATO_G01_DO_ANDAIME = 'mecanifica.g01-do-andaime@1';
export const FORMATO_G01_DA_PECA = 'mecanifica.g01-da-peca@1';

const MM_POR_METRO = 1000;
const aprovado = (e) => e === 'aprovada' || e === 'aprovado';

/* O gate sobre uma blocagem pronta, com o resumo que os dois chamadores devolvem. */
function g01Sobre({ alvoNormalizado, critica, blocagem, comOrcamento }) {
  const avaliacaoAlvo = avaliarAlvoFormaGlobal({ alvo: alvoNormalizado, critica });
  const avaliacao = avaliarFormaGlobal({ alvo: alvoNormalizado, avaliacaoAlvo, blocagem });
  const medidasAprovadas = avaliacao.vistas.every((v) => aprovado(v.estado)) && aprovado(avaliacao.envelope.estado)
    && avaliacao.landmarks.every((l) => aprovado(l.estado)) && aprovado(avaliacao.regioes.estado) && (!comOrcamento || aprovado(avaliacao.orcamento.estado));
  return {
    alvo: alvoNormalizado.id,
    estado: avaliacao.estado,
    medidasAprovadas,
    avaliacaoAlvo: { estado: avaliacaoAlvo.estado, motivo: avaliacaoAlvo.motivo },
    avaliacao,
    blocagem: { id: blocagem.id, estatisticas: blocagem.estatisticas },
  };
}

/* `andaime` é o `andaime` do resultado do tradutor; `alvo` é um `mecanifica.alvo-forma-global@2`; `critica` é a crítica do alvo
   (`mecanifica.critica-alvo-forma-global@1`) ou nulo. */
export function avaliarG01DoAndaime({ andaime, alvo, critica = null }) {
  const alvoNormalizado = normalizarAlvoFormaGlobal(alvo);
  const andaimeNormalizado = normalizarAndaimeGlobal(andaime);
  const blocagem = compilarBlocagemGlobal({ alvo: alvoNormalizado, andaime: andaimeNormalizado });
  return { formato: FORMATO_G01_DO_ANDAIME, ...g01Sobre({ alvoNormalizado, critica, blocagem, comOrcamento: true }) };
}

/* O envelope de uma lista de pontos. */
function envelopeDe(pontos) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const p of pontos) for (let i = 0; i < 3; i++) { if (p[i] < min[i]) min[i] = p[i]; if (p[i] > max[i]) max[i] = p[i]; }
  return { min, max };
}

/* A blocagem da peça: a do andaime com a malha trocada pela da peça executada.
   `neutro` é o `{ V, F }` do núcleo (metro); `partes` é o `REFINA.partes` canônico (`[{ parte, volume }]`). */
function blocagemDaMalha({ neutro, partes, alvoNormalizado, andaimeNormalizado }) {
  const doAndaime = compilarBlocagemGlobal({ alvo: alvoNormalizado, andaime: andaimeNormalizado });
  const volumeDaParte = new Map(partes.map(({ parte, volume }) => [parte, volume]));
  const regioesDoVolume = new Map(andaimeNormalizado.volumes.map((v) => [v.id, v.regioes]));
  const facesDaParte = new Map();
  for (const face of neutro.F.values()) {
    if (!face.parte) continue;
    if (!facesDaParte.has(face.parte)) facesDaParte.set(face.parte, new Map());
    facesDaParte.get(face.parte).set(face.id, face);
  }
  const vertices = [];
  const faces = [];
  const volumes = new Map();
  for (const parte of [...facesDaParte.keys()].sort()) {
    const solido = prepararSolido({ V: neutro.V, F: facesDaParte.get(parte) }, null, parte);
    if (!solido.triangulos?.length) return { erro: `a parte '${parte}' não tem triângulos que o núcleo consiga contar${solido.inconclusivo ? ` (${solido.inconclusivo})` : ''}` };
    const volume = volumeDaParte.get(parte) ?? null;
    const regioes = volume ? [...(regioesDoVolume.get(volume) ?? [])] : [];
    if (volume && !volumes.has(volume)) volumes.set(volume, { id: volume, regioes, tipo: 'malha-da-peca', quantidadeVertices: 0, quantidadeTriangulos: 0 });
    for (const triangulo of solido.triangulos) {
      const base = vertices.length;
      vertices.push(...triangulo.map((p) => p.map((c) => c * MM_POR_METRO)));
      faces.push({ vertices: [base, base + 1, base + 2], volume, regioes });
      if (volume) { volumes.get(volume).quantidadeVertices += 3; volumes.get(volume).quantidadeTriangulos += 1; }
    }
  }
  if (!faces.length) return { erro: 'a peça não tem nenhuma parte com triângulos' };
  return {
    blocagem: {
      ...doAndaime,
      id: `${andaimeNormalizado.id}-malha-da-peca`,
      envelopeDerivado: envelopeDe(vertices),
      volumes: [...volumes.values()].sort((a, b) => (a.id < b.id ? -1 : 1)),
      malha: { vertices, faces },
      estatisticas: { volumes: volumes.size, vertices: vertices.length, triangulos: faces.length },
    },
  };
}

/* O G01 sobre a malha da peça executada. `refinamento` é o `REFINA` canônico (de onde vêm as partes e os volumes), `andaime` e `alvo`
   são os JSON que ele aponta, e `critica` é a crítica do alvo ou nulo. Sem triângulos que sirvam devolve `{ rodou: false, motivo }`. */
export function avaliarG01DaPeca({ neutro, refinamento, andaime, alvo, critica = null }) {
  const alvoNormalizado = normalizarAlvoFormaGlobal(alvo);
  const andaimeNormalizado = normalizarAndaimeGlobal(andaime);
  const { blocagem, erro } = blocagemDaMalha({ neutro, partes: refinamento.partes, alvoNormalizado, andaimeNormalizado });
  if (erro) return { formato: FORMATO_G01_DA_PECA, rodou: false, alvo: alvoNormalizado.id, motivo: erro };
  return { formato: FORMATO_G01_DA_PECA, rodou: true, ...g01Sobre({ alvoNormalizado, critica, blocagem, comOrcamento: false }) };
}
