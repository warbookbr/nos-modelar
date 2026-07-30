# Arquitetura da Mecanifica

## Estado herdado

O Atelier v3 do NÓS vive em `prototipos/fps/v3/`. Ele contém:

- um renderizador WebGL 2 próprio;
- um núcleo procedural de geometria baseado em `PASSOS`;
- adaptador do núcleo para o formato de malha do renderizador;
- Oficina de objeto, material, animação e som;
- síntese de áudio em dados;
- bancadas Vitest e Playwright;
- publicação estática pelo GitHub Pages.

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
Durante a migração, o Atelier legado continuará acessível em uma rota separada.

O Pages hospeda apenas o produto compilado. O servidor local de autoria pode
oferecer rotas de gravação durante desenvolvimento, mas a experiência pública
não depende delas.

## Estratégia de migração

1. Congelar uma referência executável do Atelier.
2. Criar a aplicação Three.js ao lado dele.
3. Provar a ponte com uma peça procedural existente.
4. Criar o galpão e o freio na arquitetura nova.
5. Migrar ferramentas de autoria somente quando houver um caso real.
6. Remover código legado apenas depois de existir substituto provado.
