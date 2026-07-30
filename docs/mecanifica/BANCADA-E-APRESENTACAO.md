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
4. enquadramento do conjunto ou apenas da seleção;
5. seleção múltipla pela árvore ou pela cena;
6. montagem opaca, contexto fantasma e isolamento;
7. explosão suave;
8. diagnóstico de faces sem identidade;
9. estado completo reproduzível pela URL.

Atalhos:

| ação | atalho |
|---|---|
| frontal / traseira | `1` / `Shift+1` |
| direita / esquerda | `3` / `Shift+3` |
| superior / inferior | `7` / `Shift+7` |
| isométrica | `0` |
| perspectiva / ortográfica | `5` |
| enquadrar seleção | `F` |
| isolar / contexto | `I` / `G` |
| limpar seleção | `Esc` |

A URL é uma entrada de ferramenta, não apenas navegação. Um estado como:

```text
bancada.html?selecionadas=disco,pinca&modo=contexto&vista=direita&projecao=ortografica&explosao=0.35
```

permite que outra pessoa ou IA veja exatamente a mesma composição.

## Explosão automática e explosão autoral

Na bancada, uma explosão radial determinística é um bom padrão de diagnóstico:
funciona imediatamente para qualquer objeto e ajuda a descobrir peças
sobrepostas.

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
