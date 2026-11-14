# Operações do motor que faltaram, como proposta para o plano do núcleo

As 17 peças da sessão de 2026-11-14 fizeram à mão, com pontos escritos um a um ou com cópias deslocadas, o que o motor ainda não tem como operação. A lista abaixo é a proposta para o plano "núcleo para quem escreve receita", que já tem o tubo entre dois pontos e a casca de revolução na fatia 6; nada dela foi implementado aqui, porque `procedural/nucleo/` é território desse plano.

A contagem de quantas peças pediram cada operação não foi medida por esta sessão: os relatórios dos modeladores ficaram na sessão local e não vieram para o repositório. A coluna "Peças que pediram" fica a preencher por quem os tem, e a ordem da tabela é a de prioridade que o pedido original deu aos assuntos, não uma ordem medida.

| Operação | O que o modelador fez no lugar | Peças que pediram |
|---|---|---|
| Rosca ou hélice (volta que sobe ao longo de um eixo, com passo e perfil) | pontos de cada volta escritos em lista, ou anéis empilhados que aproximam a rosca | a preencher |
| Afinar (reduzir a espessura de uma chapa ou parede numa região, até o fim dela) | recortes e subtrações sucessivas, ou perfil refeito com a espessura menor | a preencher |
| Furos em padrão circular (n furos no mesmo raio, em torno de um eixo, a partir de um furo) | um furo por posição, com a trigonometria à mão, ou `arranja` radial de uma ferramenta de corte | a preencher |
| Aletas radiais (n lâminas em torno de um eixo, com altura e espessura) | `arranja` radial de uma chapa, uma cópia nomeada por aleta | a preencher |
| Barra ou fita entre dois pontos (seção constante, do ponto A ao ponto B, com as pontas cortadas no plano que o usuário escolhe) | cubo ou extrusão rotacionados e transladados por conta própria, com o ângulo calculado à mão | a preencher |
| Canelura (sulco contínuo de seção declarada em volta ou ao longo de uma peça) | subtração de um sólido de varredura montado à mão | a preencher |
| Arredondar aresta inclinada (aresta que não é paralela a um eixo, entre faces que não são ortogonais) | arredondamento em cadeia com `arredondarAresta` escolhida por `sel.onde`, ou aresta reta mantida | a preencher |

Cada linha descreve o que a operação teria de receber (os parâmetros que o modelador calculou à mão) e o que o plano do núcleo precisa decidir antes: se a operação nasce como passo do motor, como composição declarada ou como função de receita. A barra entre dois pontos se sobrepõe ao tubo entre dois pontos que o plano já faz, e talvez se resolva com a mesma operação.

A lista segue o que o pedido original apontou. Antes de virar fatia, cada linha precisa da contagem preenchida e de uma peça do acervo que a use como exemplo de verificação.
