/* comandos.js — a tabela dos comandos de teclado da bancada: nome, assunto, tecla de fábrica e o que cada um faz.
 *
 * A tabela é a fonte única — a lista do menu, a resolução da tecla e a
 * persistência do remapeamento leem daqui, então comando novo aparece no
 * menu sozinho. `Esc` fica fora porque cancela captura e seleção, e não pode
 * ser remapeado para dentro de outra coisa. */
import { VISOES } from '../visoes/registro-de-visoes.js';

/**
 * `controlador()` devolve o controlador das partes da peça em cena, ou null; `visaoAtual()` a visão escolhida no seletor.
 * As ações são as mesmas que os botões da barra das vistas e do painel de inspeção chamam.
 */
export function criarComandos({
  definirVista, alternarProjecao, enquadrar, alternarPreferenciaCena, escolherVisao, controlador, visaoAtual,
}) {
  return [
    { id: 'vista-frontal', rotulo: 'Frente', grupo: 'Câmera', padrao: '1', executar: () => definirVista('frontal') },
    { id: 'vista-traseira', rotulo: 'Trás', grupo: 'Câmera', padrao: 'Shift+1', executar: () => definirVista('traseira') },
    { id: 'vista-direita', rotulo: 'Direita', grupo: 'Câmera', padrao: '3', executar: () => definirVista('direita') },
    { id: 'vista-esquerda', rotulo: 'Esquerda', grupo: 'Câmera', padrao: 'Shift+3', executar: () => definirVista('esquerda') },
    { id: 'vista-superior', rotulo: 'Cima', grupo: 'Câmera', padrao: '7', executar: () => definirVista('superior') },
    { id: 'vista-inferior', rotulo: 'Baixo', grupo: 'Câmera', padrao: 'Shift+7', executar: () => definirVista('inferior') },
    { id: 'vista-isometrica', rotulo: 'Isométrica', grupo: 'Câmera', padrao: '0', executar: () => definirVista('isometrica') },
    { id: 'projecao', rotulo: 'Projeção', grupo: 'Vista', padrao: '5', executar: () => alternarProjecao() },
    { id: 'enquadrar', rotulo: 'Enquadrar tudo', grupo: 'Vista', padrao: 'f', executar: () => enquadrar() },
    { id: 'alternar-grade', rotulo: 'Grade', grupo: 'Vista', padrao: 'h', executar: () => alternarPreferenciaCena('grade') },
    { id: 'isolar', rotulo: 'Isolar', grupo: 'Seleção', padrao: 'i', executar: () => controlador()?.selecionadas.length && controlador().definirModo('isolar') },
    { id: 'contexto', rotulo: 'Contexto fantasma', grupo: 'Seleção', padrao: 'g', executar: () => controlador()?.selecionadas.length && controlador().definirModo('contexto') },
    { id: 'wireframe-selecao', rotulo: 'Wireframe', grupo: 'Seleção', padrao: 'w', executar: () => controlador()?.selecionadas.length && visaoAtual() !== 'raio-x' && controlador().definirWireframeSelecao(!controlador().estado().wireframeSelecao) },
    /* Uma linha por visão do registro, inclusive as que ainda não funcionam:
       a tecla delas já existe e responde com a dica, para a pessoa não achar
       que a tecla está morta. */
    ...VISOES.map((visao) => ({
      id: `visao-${visao.id}`, rotulo: visao.rotulo, grupo: 'Visão', padrao: visao.atalho, executar: () => escolherVisao(visao.id),
    })),
  ];
}
