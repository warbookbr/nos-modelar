# Prensa Mecânica com Estampo Progressivo

Módulo procedural parametrizado de máquina industrial e ferramenta de estampagem progressiva.

## 1. Subsistemas

A máquina é dividida em três subsistemas modulares:

1. **Estrutura Estática (`estrutura.js`):**
   - **Mesa Inferior:** Bloco de assentamento com rasgos T e abertura central para queda de retalhos.
   - **4 Colunas Guia:** Cilindros retificados de sustentação e alinhamento rígido.
   - **Cabeçote Superior (Coroa):** Estrutura fixa de suporte dos mancais do excêntrico e motorização.

2. **Conjunto Cinemático de Acionamento (`cinematico.js`):**
   - **Eixo Excêntrico / Virabrequim:** Converte torque rotativo em movimento linear vertical alternativo.
   - **Volante de Inércia:** Armazenamento de energia cinética.
   - **Biela de Compressão:** Articulação de transferência de força.
   - **Martelo / Cursor Deslizante:** Placa móvel guiada nas 4 colunas com ajuste de curso.

3. **Ferramental de Estampo Progressivo (`ferramentas.js`):**
   - **Porta-Matriz Inferior:** Bloco fixo com guias de alimentação da tira metálica e buchas de corte.
   - **Estação 1 (Furação Piloto):** Punções cilíndricos de centralização da fita.
   - **Estação 2 (Desponte/Recorte):** Punções de perfilamento do blank.
   - **Estação 3 (Conformação/Dobra):** Punções em V e matriz com folga para espessura da chapa.
   - **Estação 4 (Corte Final):** Lâmina de destacamento da peça conformada.
   - **Placa Extratora:** Sistema de desprendimento da chapa com molas de retorno.

## 2. Parâmetros de Projeto

- `cursoMartelo`: Deslocamento vertical do martelo (mm).
- `larguraMesa`, `profundidadeMesa`, `alturaColuna`: Dimensões globais do chassi.
- `passoEstampo`: Distância entre estações sucessivas da tira (mm).
- `espessuraChapa`: Calibre da chapa estampada (mm).
