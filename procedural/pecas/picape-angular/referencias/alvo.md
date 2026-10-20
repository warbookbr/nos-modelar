# Alvo: picape-angular

**Origem.** Modelo "Pickup" (Pickup.fbx) do pacote pacote D, de autor D (repositório de modelos livres), licença livre sem exigência de crédito. Página: endereço omitido. A malha fica fora do repositório (importados/veiculos-livres/pacote-d/Pickup.fbx, ignorada pelo git); aqui ficam `fonte-vistas.png` e `fonte-partes.json` (escala 0,0064, frente em +z, comprimento 5,2 m). Caixa da fonte: 2,379 × 1,926 × 5,200 m.

**Como a receita foi medida.** As silhuetas em fatias deram o perfil lateral, e as faces da própria malha, lidas em milímetro, deram a seção frontal (saia 1033, ombro 1108, cintura 1043, teto 891 de meia largura), os arcos, o fundo da caçamba (y 988), as paredes (x 919 a 1043), o santantônio e as rodas (octógonos de raio 441 com vértice em cima, de x 864 a 1131). A cabine tem 1782 mm de largura no teto, como a fonte.

**Diferenças restantes.**
- Vista lateral: sobra 0,4% da área, uma placa de farol que passa alguns milímetros da face inclinada do nariz.
- Vista frontal e de cima: coincidem (interseção sobre união 0,992).
- Isométrica: sobra 0,71%, os faróis; faltam as facetas finas do capô e dos para-lamas (a fonte tem vincos de poucos milímetros que a seção não reproduz).
- Arcos de roda: a fonte tem o arco como pentágono assimétrico e a parede interna em x 762; a receita usa um pentágono simétrico e fecha o arco em x 864 (face de dentro do pneu).
- Roda traseira: a fonte a deixa 13 mm acima do chão; a receita a põe no chão, como a dianteira.
- Cabine: o miolo é recuado 10 mm sob os vidros; o canto dianteiro da cabine fica em z 1193 e não chanfrado como o pilar A da fonte.
- Caçamba: a borda da fonte desce de 1370 para 1356 nos últimos 250 mm; a receita mantém 1370.
- Santantônio: separado em cinco partes (travessa, dois montantes, duas escoras), que entram no fundo da caçamba como na fonte.
- Cores: as da fonte (verde #25cc00, vidro #7cdbff, ferro #2e2e2e, pneu #050505, aro #acacac, lanterna #cc0e03).
