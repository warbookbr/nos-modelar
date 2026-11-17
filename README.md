# Referências fora da história da main

Este ramo guarda só imagens de referência que não entram na main, para não se perderem quando a pasta local some. Cada pasta tem o nome da peça em `procedural/pecas/`, e o conteúdo vai para `procedural/pecas/<peça>/referencias/locais/`, que o git da main ignora. Para restaurar numa cópia nova:

    git fetch origin referencias
    git archive FETCH_HEAD robo-humanoide | tar -x --strip-components=1 -C procedural/pecas/robo-humanoide/referencias/locais/

As imagens do robô humanoide foram geradas por IA e valem como caráter da forma, nunca como medida.
