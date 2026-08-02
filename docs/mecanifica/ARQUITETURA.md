# Arquitetura da Mecanifica

## Estado herdado

O recorte herdado do NÓS vive em `prototipos/fps/v3/`. Ele contém:

- um renderizador WebGL 2 próprio;
- um núcleo procedural de geometria baseado em `PASSOS`;
- adaptador do núcleo para o formato de malha do renderizador;
- peças e o jogo usados como referência de compatibilidade;
- bancadas do núcleo e do renderizador.

A Oficina humana de objeto/material/animação e sua aba de som foram removidas
da Mecanifica. Elas continuam disponíveis no repositório original do NÓS.

O núcleo procedural possui ideias reutilizáveis, mas a aplicação atual concentra
cena, interface, navegação e configurações em `jogo.html`. A numeração de
geometria também conserva dependências posicionais que ainda dificultam autoria
por IA.

## Fronteira atual entre repositórios

O projeto tem duas entregas deliberadamente separadas:

| Repositório | Responsabilidade |
|---|---|
| `warbookbr/nos-mecanifica` | linguagem procedural, receitas, bancada, diagnóstico, testes e exportação |
| `warbookbr/mecanica` | cena, domínio automotivo, interação e interface do cliente |

O produto não importa o núcleo nem `PASSOS`. A oficina resolve as receitas e
grava `pecas-resolvidas/*.json` no formato `mecanifica.peca-resolvida`. O
manifesto trava versão e cópia do leitor; `exportar:check` impede que uma receita
mude sem regenerar seus dados.

## Arquitetura-alvo

```text
receita estruturada ─► núcleo ─► validação ─► peça resolvida versionada
        │                                      │
        ├─► bancada Three.js                    └─► produto Three.js
        └─► testes, medidas e crítica               (outro repositório)
```

Organização desta oficina:

```text
src/
├── autoria/              # adaptador Three.js e leitor puro do formato exportado
└── bancada/              # inspeção neutra, vistas e validação de montagens

prototipos/fps/v3/        # núcleo procedural e receitas
tools/mecanifica/         # medidas, gates, exportador e provas de integração
pecas-resolvidas/         # saída gerada que o produto consome
```

## Dependências entre camadas

- `autoria` não importa Three.js, DOM nem domínio automotivo.
- `src/autoria` conhece o estado neutro e produz objetos visuais para a bancada.
- o produto combina partes e estados a partir do arquivo resolvido, sem editar
  receitas nem importar o núcleo;
- ferramentas headless usam o mesmo núcleo que o navegador.

## Duas superfícies, um modelo

`bancada.html` é a superfície de autoria: estúdio neutro, câmeras previsíveis,
seleção múltipla, isolamento, contexto fantasma e explosão diagnóstica.
O produto publicado em `warbookbr/mecanica` é a superfície de apresentação ao
cliente.

As duas consomem o mesmo grafo semântico. Estado de câmera, opacidade, realce e
explosão são projeções temporárias; não modificam a definição da peça.

Na primeira fatia da Fase 4, o atual `warbookbr/mecanica/src/dominio/mecanica/freio-dianteiro-direito.js`
registra a identidade de domínio, as oito partes semânticas, o ponto de montagem
e os vetores de explosão. O módulo `src/cena/criar-veiculo-contexto.js` daquele
repositório cria apenas uma
carroceria de leitura espacial; ela não é conteúdo persistido nem fonte de
identidade. O controlador de apresentação projeta os modos carro completo,
contexto fantasma e isolamento sem gravar em nenhum dos dois modelos.

Na segunda fatia, `roda-dianteira.js` é outro ativo procedural, revisado antes
da integração, e o registro de domínio do produto declara sua
identidade, escala e composição com o freio. A roda decorativa equivalente foi
retirada somente daquele canto; as demais continuam contexto provisório e não
são apresentadas como ativos autorados.

O contrato detalhado está em
[`BANCADA-E-APRESENTACAO.md`](BANCADA-E-APRESENTACAO.md).

O teto planejado para o grafo semântico — portas com quadro, relações,
hierarquia, propagação, escala e cinemática — está mapeado em
[`MONTAGENS-SEMANTICAS.md`](MONTAGENS-SEMANTICAS.md). É uma visão de maturidade,
não um plano ativo; cada degrau precisa preservar as fronteiras acima.

## Three.js

Three.js será a camada visual da nova aplicação. Ele fornece grafo de cena,
materiais, iluminação, seleção por raycast, câmeras e animação. Não será usado
como formato persistente:

- `Object3D.uuid` não é identidade de autoria;
- índice de filho não é referência estável;
- transformações do runtime não substituem a definição salva;
- `userData` pode carregar uma identidade semântica, mas a verdade permanece no
  documento de autoria.

## Adaptação do núcleo herdado

A primeira prova criará `adaptarThree()` sem alterar o resultado do `nucleo()`.
Ela converterá vértices, faces, materiais, partes e transformações para
`THREE.BufferGeometry` e `THREE.Object3D`.

Se a prova exigir regras específicas do antigo renderizador dentro do núcleo, a
fronteira será corrigida antes de modelar os freios.

## Build e publicação

Os dois repositórios usam Vite e GitHub Actions, mas publicam alvos diferentes:
`nos-mecanifica` constrói somente `bancada.html`; `mecanica` constrói somente o
produto. A interface humana herdada do NÓS não possui rota em nenhum deles.

A experiência pública nunca depende de servidor de gravação. A transferência
de peças é explícita: exportar e conferir na oficina, copiar peça, leitor e
manifesto juntos, conferir e construir no produto.

## Estratégia de migração

1. Congelar uma referência executável do núcleo e do cliente v3.
2. Criar a aplicação Three.js ao lado dele.
3. Provar a ponte com uma peça procedural existente.
4. Provar a bancada corrigindo uma peça herdada.
5. Criar o freio na arquitetura nova.
6. Contextualizar o sistema em um carro simplificado e no galpão.
7. Migrar ferramentas de autoria somente quando houver um caso real.
8. Remover superfícies legadas quando a bancada ou o produto já cobrirem sua
   responsabilidade; o núcleo só sai depois de existir substituto provado.
