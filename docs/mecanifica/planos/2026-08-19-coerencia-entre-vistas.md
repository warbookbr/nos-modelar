# Coerência entre vistas na prancha

**Estado:** concluído

**Responsável:** Claude

## Objetivo

Fechar a última lacuna do motor de prancha: hoje cada vista é medida isolada, e
nada verifica que as quatro descrevem o **mesmo objeto**. Escopo fechado em
ferramenta 2D. Depois disto o motor está pronto e o investimento volta ao chassi.

## Problema, corrigido em relação ao que eu havia afirmado

Eu disse que os dois piores defeitos da sessão — pneu ultrapassando a carroceria
e arco de roda furando o capô — eram falta de coerência entre vistas. **Estava
errado.** Os dois eram defeitos dentro de uma única vista, e o teste de "detalhe
fora do contorno" já os cobria.

O pneu escapou por outro motivo, pior: eu **silenciei o teste**. As rodas da
planta levam `foraDoContorno: true`, herdado da lateral, onde a roda desce
legitimamente abaixo da soleira. Na planta, roda fora da carroceria é exatamente
o defeito que se quer pegar.

Restam então dois problemas independentes:

1. **Silenciamento indevido.** `foraDoContorno` foi aplicado por hábito, não por
   razão, e desligou um teste que funcionava.
2. **Ausência real de coerência entre vistas.** No cupê, a lateral diz que o
   corpo desce até y = 115 e a frontal diz y = 100; a planta diz meia largura
   máxima 1020 e a frontal chega a 975. São o mesmo corpo. Alguma das duas está
   errada, e nada acusa.

## Invariantes

- o motor continua sem vocabulário de domínio: conhece vista, eixo, faixa e
  tolerância;
- saída determinística, sem dependência nova;
- coerência é derivada do traçado, nunca declarada à mão;
- nenhuma alteração em núcleo, malha ou catálogo.

## Rodadas

### C1 — desfazer o silenciamento

Remover `foraDoContorno` de onde não há razão, começando pelas rodas em planta e
nas vistas verticais. Cada uso remanescente ganha comentário dizendo por que
aquela camada tem direito de sair do contorno **naquela vista**.

### C2 — faixa por eixo compartilhado

Os quatro planos compartilham eixos: lateral e planta compartilham `z`; lateral,
frontal e traseira compartilham `y`; planta, frontal e traseira compartilham `x`.
O motor passa a comparar as faixas do contorno em cada eixo compartilhado.

Cada vista declara sua **leitura**: `projecao`, que enxerga o corpo inteiro e
portanto deve bater com o extremo global, ou `secao`, que só precisa caber
dentro dele. Forçar essa declaração é metade do valor: hoje minhas vistas
verticais são desenhadas como seção e lidas como projeção, sem ninguém decidir.

### C3 — envelope declarado

As medidas rígidas — comprimento, largura, altura — deixam de ser verificadas por
`throw` escrito à mão na especificação e passam a ser conferidas pelo motor
contra o que foi de fato traçado.

### C4 — simetria

Contorno que cruza o plano de simetria é conferido contra o próprio espelho.

### C5 — prova

Cupê de cunha e prancha do P0 regenerados. Registrar o que a coerência acusou
que a medida por vista não acusava.

## Gate para concluir

- silenciamentos revistos, cada sobrevivente justificado;
- faixa por eixo, envelope e simetria implementados e cobertos por teste;
- cupê e P0 sem alerta, com as divergências encontradas explicadas;
- gates do INDEX verdes.

## Fora deste plano

Seção transversal, ajuste automático de âncora contra referência, leitura de
outras vistas da referência e qualquer geometria 3D.

**Isolamento por camada no motor de prancha** também fica fora, e vale registro
porque é lacuna conhecida: não há como renderizar só a silhueta sem cromo, roda e
cotas. Foi o que deixou a segunda iteração do estudo do fastback ilegível. Na
modelagem o equivalente já existe — `olhar-bancada.mjs` tem `--selecionadas`,
`--modo` e `--focar` — e a instrução de uso entrou nas skills `criar-peca` e
`auditar-peca`. No desenho, falta a capacidade.

**Seção transversal fica explicitamente adiada, com destino definido:** ela é a
entrada da malha de controle, não um recurso de desenho. Implementá-la aqui
criaria um contrato de seção que o P1 teria de refazer. Ela entra na rodada P1 do
plano do chassi, junto com o contrato da cage.

## Registro

- **V1 — 2026-08-19:** plano aberto. Causa raiz corrigida: o defeito do pneu era
  teste silenciado, não ausência de coerência entre vistas.
- **V2 — 2026-08-19:** C1 a C5 executadas.

  **C1.** Removido o silenciamento das rodas em planta. O teste, ao voltar a
  rodar, acusou na hora que as **quatro** rodas do cupê escapavam da carroceria:
  o para-lama cobria o centro do eixo e não a pegada do pneu. Planta corrigida.

  **C2 a C4.** Faixa por eixo compartilhado, envelope declarado e simetria
  implementados, com leitura `projecao` ou `secao` por vista e alerta quando um
  eixo não tem nenhuma projeção — para que declarar seção não vire o próximo
  silenciamento.

  **C5.** O que a coerência acusou e a medida por vista não acusava:

  - no cupê, a lateral dizia que o corpo desce até 115 mm e as vistas verticais
    diziam 100 mm. Causa: filete aplicado num mínimo local sempre levanta a
    curva. Resolvido com trecho reto na altura livre;
  - no cupê, a frontal chegava a 978 mm de meia largura contra 1020 da planta.
    Não era defeito: a frontal é seção no eixo dianteiro, e faltava declarar;
  - no P0, a lateral misturava perfil de centro em cima com linha de soleira
    embaixo, e discordava da frontal em 35 mm. A soleira virou linha de painel e
    a lateral passou a ser projeção de verdade;
  - no P0, as linhas inferiores ainda usavam `suave`, e a spline **afundava para
    94 mm onde a altura livre declarada é 105**. Convertidas para filete.

  Bug corrigido pelos testes: o envelope só era conferido em eixo com duas ou
  mais vistas, então o comprimento, que só a lateral carrega, escapava.

  Sete testes novos. Cupê e P0 sem alerta.
