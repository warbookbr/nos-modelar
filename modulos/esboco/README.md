# @mecanifica/esboco

Motor de renderização de esboços técnicos em projeção isométrica ou ortográfica a partir de especificações declarativas JSON. Gera arquivos vetoriais `.svg` e imagens `.png` renderizadas lado a lado para validação e escolha de conceitos antes da modelagem 3D.

## Como Executar

```bash
npm run esboco -- <caminho/arquivo.esboco.json>
```

Gera `<arquivo>.svg` e `<arquivo>.png` no mesmo diretório do arquivo de entrada.

## Testes

```bash
npx vitest run modulos/esboco/tests/esboco.test.js
```

## Estrutura do Arquivo JSON (`*.esboco.json`)

```json
{
  "vista": "isometrica",
  "linhasCentro": true,
  "opcoes": [
    {
      "id": "opcao_a",
      "titulo": "Opção 1",
      "formas": [
        {
          "id": "base",
          "tipo": "caixa",
          "largura": 120,
          "altura": 20,
          "profundidade": 70,
          "raioCanto": 10,
          "cor": "cinza",
          "rotulo": "1. base_fixacao"
        },
        {
          "id": "alojamento",
          "tipo": "anel",
          "diametroExterno": 70,
          "diametroInterno": 40,
          "espessura": 40,
          "eixo": "z",
          "sobre": "base",
          "cor": "azul",
          "rotulo": "2. alojamento"
        }
      ]
    }
  ]
}
```

### Propriedades Globais
- `vista`: `"isometrica"` (padrão), `"frontal"`, `"superior"` ou `"lateral"`.
- `linhasCentro`: `true` ativa eixos de simetria e de rotação em traço-ponto padrão técnico ISO/ABNT com fusão colinear 3D.
- `opcoes`: Lista de variantes renderizadas lado a lado na mesma escala e enquadramento.

### Tipos de Formas
- `caixa`: `largura`, `altura`, `profundidade`, `raioCanto` (opcional).
- `cilindro`: `diametro`, `comprimento`, `eixo` (`"x"`, `"y"` ou `"z"`).
- `anel`: `diametroExterno`, `diametroInterno`, `espessura`, `eixo`.
- `furoPassante`: `diametro`, `eixo`, posicionado em relação ao pai.

### Posicionamento Relativo
- `sobre`: Apoia na face superior (`+y`) da peça de referência.
- `sob`: Apoia na face inferior (`-y`).
- `naFrenteDe` / `atrasDe`: Alinha ao longo do eixo `z`.
- `aDireitaDe` / `aEsquerdaDe`: Alinha ao longo do eixo `x`.
- `centro`: `[x, y, z]` absoluto caso não use posicionamento relativo.
- `rotacao`: Ângulos em graus nos eixos `[rx, ry, rz]`.

### Identificação Visual
- `cor`: `"cinza"`, `"azul"`, `"laranja"`, `"vermelho"`, `"verde"`, `"roxo"`, `"amarelo"`, `"preto"`, `"branco"` ou código hexadecimal.
- `rotulo`: String ou objeto `{ "texto": "...", "posicao": "esquerda" | "direita" }`. Os balões e linhas de chamada são alocados automaticamente sem colidir com furos ou o corpo da peça.
