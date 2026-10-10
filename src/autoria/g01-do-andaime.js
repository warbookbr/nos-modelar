/* G01 sobre o andaime derivado do esboço. O gate (`avaliarFormaGlobal`) compara um alvo N2 com a blocagem compilada do andaime:
   envelope, landmarks, regiões obrigatórias, orçamento e as silhuetas frontal, direita e superior. Aqui está só a chamada pronta
   para o andaime do nível zero: compila a blocagem do andaime contra o alvo, avalia o alvo (G00, com a crítica quando houver) e
   devolve o G01 completo, mais `medidasAprovadas`, que diz se as medidas passam sem depender de a crítica do alvo estar
   registrada (o G01 fica `bloqueado` enquanto o G00 está, e esta pergunta é a que o esboço quer responder antes da crítica).

   O alvo e o andaime têm de ser do mesmo objeto: o `alvo`, o `objetivo`, a `familia` e os `eixos` do andaime derivado saem das opções
   do tradutor (`traduzirFormasParaAndaime(dados, { alvo: alvo.id, objetivo, familia, eixos })`), e a compilação recusa o que
   não coincide. Os landmarks do alvo são conferidos por id contra os do andaime (o centro do conjunto e os pontos nomeados do
   esboço), e um landmark que o andaime não tem aparece como `landmark-ausente`. Puro e determinístico. */
import {
  avaliarAlvoFormaGlobal, avaliarFormaGlobal, compilarBlocagemGlobal, normalizarAlvoFormaGlobal, normalizarAndaimeGlobal,
} from './forma-global.js';

export const FORMATO_G01_DO_ANDAIME = 'mecanifica.g01-do-andaime@1';

const aprovado = (e) => e === 'aprovada' || e === 'aprovado';

/* `andaime` é o `andaime` do resultado do tradutor; `alvo` é um `mecanifica.alvo-forma-global@2`; `critica` é a crítica do alvo
   (`mecanifica.critica-alvo-forma-global@1`) ou nulo. */
export function avaliarG01DoAndaime({ andaime, alvo, critica = null }) {
  const alvoNormalizado = normalizarAlvoFormaGlobal(alvo);
  const andaimeNormalizado = normalizarAndaimeGlobal(andaime);
  const avaliacaoAlvo = avaliarAlvoFormaGlobal({ alvo: alvoNormalizado, critica });
  const blocagem = compilarBlocagemGlobal({ alvo: alvoNormalizado, andaime: andaimeNormalizado });
  const avaliacao = avaliarFormaGlobal({ alvo: alvoNormalizado, avaliacaoAlvo, blocagem });
  const medidasAprovadas = avaliacao.vistas.every((v) => aprovado(v.estado)) && aprovado(avaliacao.envelope.estado)
    && avaliacao.landmarks.every((l) => aprovado(l.estado)) && aprovado(avaliacao.regioes.estado) && aprovado(avaliacao.orcamento.estado);
  return {
    formato: FORMATO_G01_DO_ANDAIME,
    alvo: alvoNormalizado.id,
    estado: avaliacao.estado,
    medidasAprovadas,
    avaliacaoAlvo: { estado: avaliacaoAlvo.estado, motivo: avaliacaoAlvo.motivo },
    avaliacao,
    blocagem: { id: blocagem.id, estatisticas: blocagem.estatisticas },
  };
}
