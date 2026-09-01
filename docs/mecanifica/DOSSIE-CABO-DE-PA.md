# Cabo de pá em laminado de papel com lignina — dossiê técnico

**O que este documento é:** um estudo computacional, com as contas, os critérios
fixados antes de calcular, a origem de cada número, os limites do que foi feito, e a
literatura que mostra que as perguntas são reconhecidas.

**O que ele não é:** ensaio. Nada foi medido em bancada. A seção 7 diz exatamente o
que precisa ser medido e por quê.

## 1. A pergunta

Substituir o cabo de pá de eucalipto por alternativa mais barata, com resistência
igual ou maior, boa absorção de impacto e vibração, acessível, sem agredir o meio
ambiente e sem risco de intoxicação ou irritação.

## 2. Resultado

Cabo de 1,2 m, 32 mm de diâmetro externo, carga de 300 N na ponta.

| candidato | margem estrutural (p05) | custo relativo | vibração dissipada | irritação | ambiente | conformidade |
| --- | ---: | ---: | ---: | :-: | :-: | :-: |
| eucalipto | 1.01 | 3.09 | 27.0% | 3 | 3 | 3 |
| aco-1020 | 0.80 | 6.56 | 1.6% | 3 | 2 | 3 |
| aluminio-6061-t6 | 0.97 | 12.21 | 0.6% | 3 | 1 | 3 |
| papel-fenolico | 0.49 | 3.15 | 54.4% | 1 | 2 | 1 |
| papel-lignina | 0.37 | 3.06 | 61.0% | 3 | 3 | 3 |
| fibra-de-vidro | 1.65 | 9.35 | 22.2% | 1 | 1 | 2 |

Escala qualitativa: 3 = bom, 2 = aceitável, 1 = problemático; ordinal, não métrico.

**Requisito estrutural é porta, não critério com peso.** Margem abaixo de 1,0 elimina:
quebrar não se troca por ser confortável ou barato. Passam na porta: **eucalipto**, **fibra-de-vidro**.

### Leitura

O laminado de papel com lignina ganha em custo, amortecimento, saúde e ambiente, e
ainda dispensa a norma de emissão de formaldeído. **Perde em resistência e em peso.**

A variante fenólica aparece de propósito: cola melhor e é feita com formaldeído.
Fica registrada e recusada, para o custo de escolher a que funciona ficar visível.

## 3. A troca, em número

| | eucalipto | papel-lignina |
| --- | ---: | ---: |
| massa do cabo | 0.77 kg | 1.29 kg |
| vibração dissipada | 27% | 61% |

**68% mais pesado para dissipar 126% mais vibração.** Quem decide se esse câmbio vale é quem segura a ferramenta o dia todo, não quem calcula.

## 4. Entradas, e de onde cada número veio

**Leia antes de discutir qualquer resultado.** Um só material tem fonte primária.

| material | módulo (GPa) | resistência (MPa) | densidade (kg/m³) | fator de perda | R$/kg | fonte |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| eucalipto | 13 | 112 | 800 | 0.0100 | 4.00 | **FPL-GTR-190** |
| aco-1020 | 205 | 350 | 7850 | 0.0005 | 6.00 | memória |
| aluminio-6061-t6 | 69 | 276 | 2700 | 0.0002 | 20.00 | memória |
| papel-fenolico | 8 | 120 | 1350 | 0.0250 | 5.00 | memória |
| papel-lignina | 6 | 85 | 1300 | 0.0300 | 4.00 | memória |
| fibra-de-vidro | 30 | 400 | 1900 | 0.0080 | 15.00 | memória |

### A fonte primária

Wood Handbook — Wood as an Engineering Material, FPL-GTR-190, USDA Forest Service, Forest Products Laboratory, 2010; Tabela 5-5a (Jarrah, Eucalyptus marginata, e Karri, Eucalyptus diversicolor, a 12% de umidade). Domínio público, consultado diretamente.

O fator de perda da madeira vem do mesmo manual, capítulo 5: o decremento
logarítmico vai de 0,02 (madeira seca) a 0,1 (úmida), e o fator de perda é esse
valor dividido por π — de 0,006 a 0,032.

### A correção que essa fonte impôs

Este estudo usava 75 MPa para o eucalipto, que é aproximadamente o valor da madeira
**verde**. Cabo de pá é madeira **seca**, e a 12% de umidade o jarrah dá 111,7 MPa.
Duas conclusões anteriores caíram:

- eu havia concluído que a carga de 300 N era abusiva, porque reprovava até o
  eucalipto. Estava errado: a carga estava certa, minha propriedade é que estava
  errada. Com o valor correto, a madeira passa;
- a barra para o candidato subiu 50%.

### A assimetria que precisa ficar clara

O eucalipto tem fonte primária de domínio público (FPL-GTR-190) e o candidato NÃO tem nenhuma: os números dele saíram de memória. O benchmark é sólido; o candidato é o que precisa ser medido.

As três entradas mais frágeis, em ordem: **resistência do laminado de lignina**
(decide a reprovação, e a faixa 45–130 MPa é o tamanho da ignorância, não
conservadorismo); **fatores de perda** dos não-madeira (a ordem de grandeza é
robusta, os valores exatos não); e **preço por quilo** (ordem de grandeza, não
cotação).

## 5. O que decide a próxima ação

**Não medir custa 5 mm de diâmetro e 140 g.**

| caminho | diâmetro | massa | exige |
| --- | ---: | ---: | --- |
| resistência medida (±15%) | 45 mm | 1.15 kg | ensaio de flexão em ao menos dez corpos de prova |
| sem medir | 50 mm | 1.29 kg | nada, mas o cabo carrega minha ignorância em peso |

Mesmo material, mesma resistência média. A diferença entre as linhas é **só
informação**: a incerteza que engorda o cabo é a nossa ignorância sobre o material,
não a variação dele.

## 6. Limites

- A BARREIRA QUE NÃO SE TRANSPÕE AQUI: nada foi ensaiado fisicamente. Impacto real envolve taxa de deformação, e cabo real sofre fadiga por milhares de ciclos — nenhuma das duas coisas está nesta conta.
- As propriedades dos demais materiais são valor de manual de memória; NÃO conferido contra fonte primária. Os fatores de perda são a entrada mais frágil: eles variam com frequência e com o método de medida, às vezes por um fator de dois.
- A madeira foi tratada com um módulo único, mas ela é anisotrópica: fibra longitudinal e transversal têm rigidez muito diferente, e nó e umidade mudam tudo.
- Densidade e módulo da madeira andam juntos no mundo real e foram sorteados de forma independente; a cauda ruim do eucalipto está otimista.
- A junta entre cabo e pá não entrou, e é onde ferramenta costuma falhar de verdade.
- Preço por quilo é ordem de grandeza, não cotação; ele muda com região, volume e momento.
- O papel-fenólico é a entrada mais fraca: faixas largas por ignorância, não por conservadorismo. E o estudo NÃO modela o que mais ameaça esse candidato — absorção de umidade, que degrada celulose, e o desempenho da vedação ao longo do tempo. Sem isso, qualquer aprovação dele aqui é provisória.
- A hipótese da vibração saiu `contradita` por ERRO MEU DE CRITÉRIO, não por o metal ser bom: pedi que a vibração RESTANTE dobrasse, e sobra é limitada a 1. Em energia dissipada, que é a medida certa, o metal dissipa cerca de dezessete vezes menos que a madeira. O critério não foi reescrito depois do resultado, e a versão corrigida está no módulo marcada como não testada.
- CORREÇÃO REGISTRADA: este estudo afirmou que o caso de carga era abusivo porque reprovava até o eucalipto. Estava errado. Eu usava 75 MPa para a madeira, que é o valor VERDE; o Wood Handbook dá 111,7 MPa a 12% de umidade, que é a condição de um cabo. Com o valor certo o eucalipto passa, a carga estava correta, e a barra para o candidato subiu 50%.
- ASSIMETRIA DE FONTES: só o eucalipto tem fonte primária (FPL-GTR-190, domínio público, lido diretamente). Todos os outros materiais, inclusive o candidato recomendado, seguem com números de memória.

## 7. O que precisa ser medido

**Ensaio principal:** ensaio de flexão de três pontos em ao menos dez corpos de prova.

**Por quê:** a incerteza que reprova o cabo é a minha, não a do material: estreitar a faixa de 45-130 MPa para ±15% vale 5 mm de diâmetro.

**Medir junto:**

- resistência à flexão e módulo, que é o que estreita a incerteza
- absorção de água e resistência DEPOIS de molhar, que é a ameaça real ao candidato
- fator de perda medido, porque o valor usado aqui é de memória e é a vantagem inteira do material
- resistência após ciclos, porque cabo de pá é fadiga e isto foi carga única

## 8. Literatura

Metadados obtidos do Crossref e guardados em disco. **Estes artigos não foram
lidos** — eles sustentam que as perguntas são reconhecidas e o campo é ativo, e não
sustentam nenhum número deste documento. A única fonte efetivamente lida é o Wood
Handbook citado na seção 4.

### o candidato depende de um ligante natural que cole bem; o campo existe?

Busca: `lignin based wood adhesive bonding strength formaldehyde free` — 7344485 resultados, consultada em 2026-09-01.

- Zhu (2024), *Chemical Engineering Journal*. Aminated alkali lignin nanoparticles enabled formaldehyde-free biomass wood adhesive with high strength, toughness, and mildew resistance. [10.1016/j.cej.2024.152914](https://doi.org/10.1016/j.cej.2024.152914) — 63 citações.
- Hu (2025), *ACS Applied Polymer Materials*. Formaldehyde-Free, High-Bonding Performance, Fully Lignin-Based Adhesive Cross-Linked by Glutaraldehyde. [10.1021/acsapm.4c03378](https://doi.org/10.1021/acsapm.4c03378) — 14 citações.
- Chen (2026), *ACS Sustainable Chemistry &amp; Engineering*. A Formaldehyde-Free Lignin-Based Adhesive with High Bonding Strength, Mild Curing Conditions, and Reusability. [10.1021/acssuschemeng.5c13165](https://doi.org/10.1021/acssuschemeng.5c13165) — 2 citações.
- Li (2026), *ACS Sustainable Chemistry &amp; Engineering*. Wood Adhesive Based on Lignin-Crosslinked Epoxidized Carboxymethyl Chitosan with High Bonding Strength. [10.1021/acssuschemeng.6c05201](https://doi.org/10.1021/acssuschemeng.6c05201) — 1 citações.

### a recusa da variante fenólica se apoia em risco reconhecido, ou é implicância minha?

Busca: `formaldehyde emission particleboard adhesive regulation health` — 4127671 resultados, consultada em 2026-09-01.

- Ghani (2018), *Building and Environment*. Reducing formaldehyde emission of urea formaldehyde-bonded particleboard by addition of amines as formaldehyde scavenger. [10.1016/j.buildenv.2018.06.020](https://doi.org/10.1016/j.buildenv.2018.06.020) — 103 citações.
- Kawalerczyk (2022), *Polymers*. APTES-Modified Nanocellulose as the Formaldehyde Scavenger for UF Adhesive-Bonded Particleboard and Strawboard. [10.3390/polym14225037](https://doi.org/10.3390/polym14225037) — 45 citações.
- Zhang (2016), *RSC Advances*. Influence of a urea–formaldehyde resin adhesive on pyrolysis characteristics and volatiles emission of poplar particleboard. [10.1039/c5ra18068f](https://doi.org/10.1039/c5ra18068f) — 27 citações.
- Risnasari (2019), *Proceedings of the International Conference on Natural Resources and Technology*. Characterization of Particleboard from Waste Tea Leaves  (Camellia Sinensis L) and Meranti Wood (Shorea Sp) using Urea-Formaldehyde Adhesive and It’s Formaldehyde Emission. [10.5220/0008552702610264](https://doi.org/10.5220/0008552702610264) — 2 citações.

### laminado de papel tem propriedades mecânicas estudadas?

Busca: `paper phenolic laminate mechanical properties composite` — 2932267 resultados, consultada em 2026-09-01.

- Zhang (2022), *Composite Structures*. Mechanical properties prediction of composite laminate with FEA and machine learning coupled method. [10.1016/j.compstruct.2022.116086](https://doi.org/10.1016/j.compstruct.2022.116086) — 95 citações.
- Jang (2000), *Polymer Testing*. The effect of flame retardants on the flammability and mechanical properties of paper-sludge/phenolic composite. [10.1016/s0142-9418(98)00088-9](https://doi.org/10.1016/s0142-9418(98)00088-9) — 43 citações.
- Quagliato (2019), *Composite Structures*. Manufacturing process and mechanical properties characterization for steel skin – Carbon fiber reinforced polymer core laminate structures. [10.1016/j.compstruct.2018.10.078](https://doi.org/10.1016/j.compstruct.2018.10.078) — 10 citações.
- He (2021), *Composite Structures*. Experimental study on mechanical properties of sandwich tempered glass unidirectional composite laminate. [10.1016/j.compstruct.2020.112980](https://doi.org/10.1016/j.compstruct.2020.112980) — 7 citações.

### a diferença de amortecimento entre madeira e metal é medida por alguém?

Busca: `damping loss factor wood metal comparison vibration` — 2778867 resultados, consultada em 2026-09-01.

- Cherif (2015), *Journal of Sound and Vibration*. Damping loss factor estimation of two-dimensional orthotropic structures from a displacement field measurement. [10.1016/j.jsv.2015.06.042](https://doi.org/10.1016/j.jsv.2015.06.042) — 41 citações.
- Parrinello (2018), *Journal of Sound and Vibration*. Evaluation of damping loss factor of flat laminates by sound transmission. [10.1016/j.jsv.2018.03.017](https://doi.org/10.1016/j.jsv.2018.03.017) — 9 citações.
- Bin Fazail (2023), *Journal of Sound and Vibration*. Damping loss factor characterization of complex structures using a Green’s function-based model. [10.1016/j.jsv.2023.117642](https://doi.org/10.1016/j.jsv.2023.117642) — 7 citações.
- Ma (2018), *Composite Structures*. Wave component solutions of free vibration and mode damping loss factor of finite length periodic beam structure with damping material. [10.1016/j.compstruct.2018.06.096](https://doi.org/10.1016/j.compstruct.2018.06.096) — 7 citações.

### a ameaça que eu apontei ao candidato — umidade — é reconhecida?

Busca: `moisture absorption cellulose composite mechanical degradation` — 1820219 resultados, consultada em 2026-09-01.

- Boukhoulda (2006), *Composite Structures*. The effect of fiber orientation angle in composite materials on moisture absorption and material degradation after hygrothermal ageing. [10.1016/j.compstruct.2005.04.032](https://doi.org/10.1016/j.compstruct.2005.04.032) — 103 citações.
- Ridzuan (2016), *Composite Structures*. Moisture absorption and mechanical degradation of hybrid Pennisetum purpureum/glass–epoxy composites. [10.1016/j.compstruct.2016.01.030](https://doi.org/10.1016/j.compstruct.2016.01.030) — 88 citações.
- Gabr (2013), *Cellulose*. Mechanical, thermal, and moisture absorption properties of nano-clay reinforced nano-cellulose biocomposites. [10.1007/s10570-013-9876-8](https://doi.org/10.1007/s10570-013-9876-8) — 75 citações.
- Hassan (2019), *Cellulose*. Thermo-mechanical, morphological and water absorption properties of thermoplastic starch/cellulose composite foams reinforced with PLA. [10.1007/s10570-019-02393-1](https://doi.org/10.1007/s10570-019-02393-1) — 74 citações.

### vibração em cabo de ferramenta é preocupação estabelecida ou detalhe?

Busca: `hand arm vibration tool handle damping material` — 1346136 resultados, consultada em 2026-09-01.

- Marcotte (2005), *Journal of Sound and Vibration*. Effect of handle size and hand–handle contact force on the biodynamic response of the hand–arm system under zh-axis vibration. [10.1016/j.jsv.2004.06.007](https://doi.org/10.1016/j.jsv.2004.06.007) — 71 citações.
- Aldien (2006), *Journal of Sound and Vibration*. Influence of hand forces and handle size on power absorption of the human hand–arm exposed to zh-axis vibration. [10.1016/j.jsv.2005.05.005](https://doi.org/10.1016/j.jsv.2005.05.005) — 19 citações.
- Oddo (2004), *Journal of Sound and Vibration*. Design of a suspended handle to attenuate rock drill hand-arm vibration: model development and validation. [10.1016/j.jsv.2003.06.006](https://doi.org/10.1016/j.jsv.2003.06.006) — 17 citações.
- Tony (2019), *Work*. Influence of handle shape and size to reduce the hand-arm vibration discomfort. [10.3233/wor-192948](https://doi.org/10.3233/wor-192948) — 6 citações.

## 9. Fabricação e fornecimento

enrolamento espiral de papel impregnado é tecnologia madura e barata, ordem de grandeza abaixo de pultrusão de fibra ou trefilação de tubo; o gargalo é o ligante, porque lignina é abundante mas queimada dentro da própria fábrica de celulose em vez de vendida como adesivo pronto. ISTO NÃO SAIU DO LABORATÓRIO: é análise, não estudo, e não foi medido.
