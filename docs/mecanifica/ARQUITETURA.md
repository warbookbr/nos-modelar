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

## Arquitetura-alvo

```text
definição estruturada
        │
        ▼
núcleo de autoria ──► validação + diagnóstico + estado neutro
        │
        ├──────────► adaptador Three.js ──► cena interativa
        └──────────► ferramentas headless ──► testes, medidas e descrição
```

Organização pretendida:

```text
src/
├── app/                  # ciclo da aplicação e composição
├── autoria/              # formato, schemas, operações e estado neutro
├── bancada/              # inspeção neutra, vistas e validação de montagens
├── render/three/         # conversão e apresentação em Three.js
├── cena/galpao/          # ambiente e iluminação
├── dominio/mecanica/     # sistemas, estados e explicações automotivas
├── simulacao/            # linha do tempo e transições didáticas
├── interacao/            # seleção, câmeras e controles
└── interface/            # painéis e conteúdo para o cliente
```

## Dependências entre camadas

- `autoria` não importa Three.js, DOM nem domínio automotivo.
- `render/three` conhece o estado neutro e produz objetos visuais.
- `dominio/mecanica` combina partes e estados usando APIs públicas da autoria.
- `interface` conversa com a simulação e seleção, sem editar malhas diretamente.
- ferramentas headless usam o mesmo núcleo que o navegador.

## Duas superfícies, um modelo

`bancada.html` é a superfície de autoria: estúdio neutro, câmeras previsíveis,
seleção múltipla, isolamento, contexto fantasma e explosão diagnóstica.
`index.html` e o futuro galpão são superfícies de apresentação ao cliente.

As duas consomem o mesmo grafo semântico. Estado de câmera, opacidade, realce e
explosão são projeções temporárias; não modificam a definição da peça.

Na primeira fatia da Fase 4, `src/dominio/mecanica/freio-dianteiro-direito.js`
registra a identidade de domínio, as oito partes semânticas, o ponto de montagem
e os vetores de explosão. `src/cena/criar-veiculo-contexto.js` cria apenas uma
carroceria de leitura espacial; ela não é conteúdo persistido nem fonte de
identidade. O controlador de apresentação projeta os modos carro completo,
contexto fantasma e isolamento sem gravar em nenhum dos dois modelos.

Na segunda fatia, `roda-dianteira.js` é outro ativo procedural, revisado antes
da integração, e `src/dominio/mecanica/roda-dianteira-direita.js` declara sua
identidade, escala e composição com o freio. A roda decorativa equivalente foi
retirada somente daquele canto; as demais continuam contexto provisório e não
são apresentadas como ativos autorados.

O contrato detalhado está em
[`BANCADA-E-APRESENTACAO.md`](BANCADA-E-APRESENTACAO.md).

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

A nova aplicação usará Vite para desenvolvimento e build. O GitHub Actions
executará testes, produzirá `dist/` e publicará esse diretório no GitHub Pages.
O Pages publica somente a Mecanifica e sua bancada. A interface humana herdada
não possui rota, cópia estática ou servidor neste repositório.

O Pages hospeda apenas o produto compilado. O servidor local de autoria pode
oferecer rotas de gravação durante desenvolvimento, mas a experiência pública
não depende delas.

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
