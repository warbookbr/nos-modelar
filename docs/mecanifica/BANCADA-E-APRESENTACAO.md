# Bancada de autoria e apresentação ao cliente

## Por que são duas experiências

A bancada e a demonstração ao cliente usam o mesmo modelo semântico, mas têm
objetivos diferentes:

- a **bancada** reduz distrações para criar, comparar e validar geometria;
- a **apresentação** preserva contexto para explicar onde o sistema está, como
  funciona e o que acontece quando falha.

Misturar as duas interfaces faria a autoria herdar decoração do galpão e faria
o cliente receber controles técnicos demais. Elas compartilham estado e
renderização, não a mesma casca.

## Contrato da bancada

A bancada precisa oferecer, para qualquer peça ou montagem:

1. estúdio neutro, piso discreto e iluminação reproduzível;
2. vistas frontal, traseira, direita, esquerda, superior, inferior e
   isométrica;
3. projeções perspectiva e ortográfica;
4. enquadramento separado do conjunto e da seleção, sem apagar seleção;
5. seleção múltipla pela árvore ou pela cena;
6. montagem opaca, contexto fantasma e isolamento;
7. explosão suave e enquadrada pela caixa já explodida;
8. régua de escala e legenda dos eixos da vista para a conferência visual;
9. diagnóstico de faces sem identidade;
10. estado completo reproduzível pela URL.

## Laço oficial de revisão por IA

A bancada é a única porta visual de autoria da Mecanifica. A Oficina humana
herdada foi retirada porque tronco inicial, som e abas do Atelier eram ruído
para agentes que precisam avaliar uma peça de forma reproduzível.

```text
fonte procedural → descrever (medidas/semântica) → revisar (4 vistas) → crítica → ajuste
```

`npm run revisar -- <peça>` produz isométrica, frontal, direita e superior em
projeção ortográfica. Ele falha se a geometria estiver cortada ou ocupar pouco
do quadro; a aprovação do enquadramento não é aprovação estética. `npm run peca`
é mantido para diagnóstico herdado de render, nunca como prova visual principal.

`npm run bancada` grava seus PNGs em `tools/bancadas/out/`, salvo quando recebe
`--saida=<pasta-relativa>`. O agente deve ler essas imagens: gerá-las sem olhar
para elas não é revisão. Para duas partes já conhecidas, use
`--par=parteA,parteB`; a ferramenta isola o par, não o desloca e escolhe a vista
canônica onde ambas têm pixels realmente visíveis. A URL impressa conserva a
câmera final, a seleção e o isolamento para outra sessão abrir o mesmo recorte.
O par recebe contornos de duas cores apenas como camada de leitura: eles
persistem nesse link, mas não alteram materiais, medidas ou geometria da peça.
A saída mostra tanto o endereço local da captura quanto o endereço equivalente
do GitHub Pages; este último representa a mesma revisão depois do deploy.

No modo isolado, a árvore preserva qual parte está selecionada, mas a malha
visível conserva o material original: tingir a única peça da tela sabotaria a
inspeção de acabamento. No modo contexto, focar mantém a montagem no cálculo da
caixa para que a aproximação não transforme o restante em névoa sem orientação.

Atalhos:

| ação | atalho |
|---|---|
| frontal / traseira | `1` / `Shift+1` |
| direita / esquerda | `3` / `Shift+3` |
| superior / inferior | `7` / `Shift+7` |
| isométrica | `0` |
| perspectiva / ortográfica | `5` |
| enquadrar montagem | `F` |
| isolar / contexto | `I` / `G` |
| limpar seleção | `Esc` |

A URL é uma entrada de ferramenta, não apenas navegação. Um estado canônico como:

```text
bancada.html?selecionadas=disco,pinca&modo=contexto&vista=direita&projecao=ortografica&explosao=0.35
```

permite que outra pessoa ou IA veja exatamente a mesma composição.

Depois de uma órbita livre, a URL troca `vista` por `livre` e acrescenta
`camera`: posição, alvo, vetor acima e zoom, nessa ordem, cada valor com cinco
casas decimais. Não há UUID, matriz, índice ou estado interno do controle. A
leitura aceita somente dez números finitos dentro do estúdio, vetor acima quase
unitário e zoom positivo; entrada ausente, longa ou inválida volta à isométrica.
Assim uma IA pode guardar uma revisão não canônica sem transformar a URL em
estado opaco de render. As vistas canônicas permanecem compactas e byte-idênticas.

## Explosão automática e explosão autoral

Na bancada, uma explosão radial determinística é um bom padrão de diagnóstico:
funciona imediatamente para qualquer objeto e ajuda a descobrir peças
sobrepostas. Ao terminar a transição, a câmera enquadra a caixa das partes
visíveis já afastadas; uma explosão não pode sair cortada só porque a câmera foi
calculada para a montagem fechada.

Ao restaurar uma URL, a explosão inicial não reenquadra a câmera: o endereço
declara tanto a explosão quanto a vista. Reenquadrar continua sendo consequência
somente de uma explosão alterada por quem está usando a bancada.

Na apresentação ao cliente, os vetores devem ser autorais. Uma pinça precisa
afastar-se pelo eixo que libera o disco; uma pastilha deve sair pelo caminho de
montagem real. O fallback automático nunca substitui conhecimento mecânico.

Exemplo pretendido:

```js
export const APRESENTACAO = {
  sistemas: {
    freioDianteiroDireito: {
      partes: ['disco', 'pinca', 'pastilhaInterna', 'pastilhaExterna'],
      foco: 'rodaDianteiraDireita',
      explosao: {
        pinca: { vetor: [0.35, 0, 0], ordem: 1 },
        pastilhaInterna: { vetor: [0.18, 0, 0], ordem: 2 },
        pastilhaExterna: { vetor: [-0.18, 0, 0], ordem: 2 },
      },
    },
  },
};
```

Os vetores pertencem à identidade semântica da peça. Não podem citar UUID,
índice de filho ou posição em array do Three.js.

## Fluxo da apresentação

```text
carro completo
      ↓ seleciona sistema
contexto — carro fantasma + sistema verde
      ↓ focar
sistema isolado
      ├── funcionamento
      ├── estados de desgaste
      └── explosão guiada
```

Ao selecionar um sistema:

- a câmera mantém orientação para o usuário não perder a localização;
- o restante do carro vai para baixa opacidade;
- o sistema recebe realce verde suave, acompanhado por nome e contorno, para
  não depender apenas de cor;
- “Focar” aproxima sem remover o contexto;
- “Mostrar somente” isola o sistema;
- “Funcionamento” e “Explosão” usam a mesma linha de tempo normalizada
  (`t` entre `0` e `1`), mas não rodam simultaneamente.

O carro completo não precisa começar como modelo de produção. Uma carroceria
externa simplificada e correta em proporção já pode fornecer contexto enquanto
o primeiro sistema recebe mais detalhe. O detalhamento cresce de dentro para
fora, guiado por demonstrações reais.

## Hierarquia mínima

A hierarquia abaixo é a necessidade do produto, ainda não o contrato de autoria.
O caminho lógico para torná-la persistente e escalável está em
[`MONTAGENS-SEMANTICAS.md`](MONTAGENS-SEMANTICAS.md).

```text
veiculo
├── carroceria-contexto
└── sistemas
    ├── freios
    │   ├── dianteiro-direito
    │   ├── dianteiro-esquerdo
    │   ├── traseiro-direito
    │   └── traseiro-esquerdo
    ├── suspensao
    └── direcao
```

Cada sistema publica:

- `id` estável;
- partes que o compõem;
- relação com outros sistemas;
- caixa de foco;
- portas e conexões;
- estados de funcionamento e falha;
- vetores e ordem de explosão;
- textos didáticos separados da geometria.

## Critérios para extrair uma skill

Este contrato permanece no repositório até ser provado em:

1. uma correção real do drone;
2. a criação e revisão do freio a disco;
3. uma montagem com explosão autoral;
4. uma rodada de refinamento feita por outra sessão ou agente.

Depois dessas provas, comandos, checklist e armadilhas estáveis podem virar uma
skill. Antes disso, uma skill apenas congelaria decisões ainda experimentais.
