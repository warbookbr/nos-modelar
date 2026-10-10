/* manifesto.js — contrato versionado da extensão chapa dobrada: espessura, raio interno e abas, com as medidas de chapa. */
import { FORMATO_EXTENSAO_NATIVA } from '../../nucleo/extensoes.js';
import { criarContratoUsoOperacao } from '../../nucleo/uso-operacoes.js';
import { FATOR_K_PADRAO, MAXIMO_DE_VERTICES_NO_CONTORNO, SEGMENTOS_POR_QUARTO_PADRAO } from './chapa.js';
import { PASSOS } from './fixture.js';

export const MANIFESTO = Object.freeze({
  formato: FORMATO_EXTENSAO_NATIVA, id: 'mecanifica.extensao.chapa-dobrada', versao: '1.0.0',
  operacao: {
    id: 'mecanifica.operacao.chapaDobrada', nome: 'chapaDobrada', versao: '1.0.0',
    categoria: 'extensao', artefatos: { entra: [], sai: ['mecanifica.malha-poligonal@1'] },
    efeitos: ['cria-geometria'], identidade: 'cria-por-passo',
    uso: criarContratoUsoOperacao('chapaDobrada', {
      intencao: 'Criar uma chapa dobrada de espessura constante: uma sequência de abas retas unidas por dobras de raio interno declarado, extrudada numa largura.',
      campos: {
        espessura: ['escalar', 'Espessura da chapa, maior que 0.'],
        raioInterno: ['escalar', 'Raio da face de dentro de toda dobra, maior ou igual a 0; a face de fora dobra em raioInterno + espessura.'],
        largura: ['escalar', 'Largura da chapa em z (o comprimento da dobra), maior que 0; a peça fica centrada em z = 0.'],
        abas: ['lista', 'Abas em ordem, {comprimento, angulo}: comprimento é o trecho reto da aba (sem as dobras das pontas) e angulo é a dobra depois dela, em graus, positivo anti-horário visto de +z; a última aba não leva angulo. A primeira aba começa em (0, 0) e segue +x. Exclui perfil.'],
        perfil: ['lista', 'Alternativa a abas: pontos [u, v] da linha média da chapa, nos vértices em que cada dobra se cruzaria sem raio; o trecho reto de cada segmento é o que sobra depois do recuo das dobras das pontas. Exclui abas.'],
        fatorK: ['escalar', `Posição da linha neutra na espessura, de 0 (face de dentro) a 1 (face de fora), só para as medidas; padrão ${FATOR_K_PADRAO}. A malha não depende dele.`],
        segmentosPorQuarto: ['inteiro', `Segmentos do arco de cada 90 graus de dobra, de 1 a 64; padrão ${SEGMENTOS_POR_QUARTO_PADRAO}.`],
      },
      obrigatorios: ['espessura', 'raioInterno', 'largura'],
      passos: PASSOS,
      precondicoes: ['Passe abas ou perfil, nunca os dois. As abas não podem se cruzar nem se encostar: a distância entre as linhas médias de duas abas que não são vizinhas precisa passar da espessura.'],
      limites: [
        'O comprimento planificado, o fator K e as demais medidas de chapa saem de medidasDaChapa(argumentos), em procedural/extensoes/chapa-dobrada/chapa.js, com a mesma conta da malha; a extensão em si só emite vértices e faces.',
        'Planificado = soma dos trechos retos + soma de |ângulo em radianos| · (raioInterno + fatorK · espessura) de cada dobra. A malha sai do raio pedido por arcos de ângulo igual: os vértices dos arcos estão exatamente em raioInterno e raioInterno + espessura do centro da dobra.',
        `Ids locais: vértices 0..n-1 no anel de z = -largura/2 e n..2n-1 no de z = +largura/2; face 0 é a tampa em -z, face 1 a tampa em +z e 2 + i o lado da aresta i do contorno. O contorno tem no máximo ${MAXIMO_DE_VERTICES_NO_CONTORNO} vértices.`,
        'Não há furo, recorte, aba com largura própria nem dobra em raio variável nesta versão; chapa que se fecha sobre si mesma (caixa fechada) é recusada.',
      ],
      diagnosticos: [
        { quando: 'espessura ou largura não positiva, raioInterno negativo, fatorK fora de 0..1', acao: 'a mensagem diz o campo, o valor e a faixa aceita' },
        { quando: 'trecho reto de aba não positivo, ou, em perfil, segmento mais curto que o recuo das dobras das pontas', acao: 'aumente o comprimento ou diminua raioInterno ou espessura' },
        { quando: 'abas que se cruzam ou se encostam', acao: 'a mensagem cita as duas abas e a distância; mude comprimentos ou ângulos' },
      ],
    }),
  },
});
