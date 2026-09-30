#!/usr/bin/env python3
"""Phase A: imbue MPPE grade-3 into his/geo/esp/pro weeks 1-2 (cycle 3, level 6)."""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MEDIA = ROOT / "frontend" / "public" / "homescool" / "media"

# key: (week, subject, day) -> mppe objectives, optional anchor (first point), optional quiz patch
CellSpec = dict


def spec(
    objectives: list[tuple[str, str]],
    anchor: str | None = None,
    quiz: tuple[str, str, list[str], str] | None = None,
) -> CellSpec:
    return {
        "objectives": [{"id": i, "label": l} for i, l in objectives],
        "anchor": anchor,
        "quiz": quiz,
    }


CELLS: dict[tuple[int, str, int], CellSpec] = {
    # --- HIS week 1 ---
    (1, "his", 1): spec(
        [
            ("ide-ind-01", "Conozco resistencia indígena, cacicazgo y líderes."),
            ("ide-hum-01", "Ubico el período indígena en la historia de Venezuela."),
        ],
        "En el **período indígena**, los pueblos no eran iguales: había **caciques** que guiaban comunidades y relatos de **resistencia** cuando llegaron cambios desde fuera.",
        ("d1-q8", "Elige la respuesta correcta. ¿Qué palabra MPPE usamos para un jefe de comunidad indígena?", ["Cacique", "Capitán europeo", "Gobernador", "Alcalde"], "Cacique"),
    ),
    (1, "his", 2): spec(
        [("ide-ind-01", "Conozco resistencia indígena, cacicazgo y líderes.")],
        "Los **Timotocuicas** organizaban conucos y trueque; un **cacique** o líder ayudaba a decidir rutas y repartos en la aldea.",
        ("d2-q7", "Elige la respuesta correcta. ¿Qué palabra describe a un jefe indígena?", ["Cacique", "Cartógrafo", "Conquistador", "Cronista"], "Cacique"),
    ),
    (1, "his", 3): spec(
        [("ide-hum-02", "Identifico formas de comunicar el conocimiento (oral, petroglifos, hoy).")],
        "Antes de libros impresos, el conocimiento viajaba en **relatos orales** y en **petroglifos** (dibujos en piedra); hoy también usamos mapas y textos.",
        ("d3-q7", "Elige la respuesta correcta. ¿Qué fuente menciona la clase además del relato oral?", ["Petroglifos", "Correo electrónico", "Televisión satelital", "Redes sociales"], "Petroglifos"),
    ),
    (1, "his", 4): spec(
        [("ide-ind-01", "Conozco resistencia indígena, cacicazgo y líderes.")],
        "Recordar nombres con respeto es parte de la **resistencia cultural**: no borrar a quienes ya vivían aquí.",
        ("d4-q7", "Elige la respuesta correcta. ¿Por qué nombramos pueblos con respeto?", ["Porque ya habitaban Venezuela", "Porque no existían", "Porque eran europeos", "Porque no tenían líderes"], "Porque ya habitaban Venezuela"),
    ),
    (1, "his", 5): spec(
        [
            ("ide-ind-01", "Conozco resistencia indígena, cacicazgo y líderes."),
            ("ide-hum-01", "Ubico el período indígena en la historia de Venezuela."),
        ],
        "Esta semana practicamos el **período indígena**: antes de Colón, con pueblos, líderes y formas propias de contar la historia.",
        ("d5-q7", "Elige la respuesta correcta. ¿Qué período estudiamos esta semana?", ["Indígena", "Petrolero", "Colonial completo", "Futuro"], "Indígena"),
    ),
    # --- GEO week 1 ---
    (1, "geo", 1): spec(
        [
            ("ide-ven-01", "Conozco superficie, estados, capitales y Caracas."),
            ("ide-ter-01", "Reconozco Costa-montaña, Llanos y Guayana."),
            ("ide-mun-02", "Conozco el mar Caribe y cuido el agua y la Tierra."),
        ],
        "Las regiones **Central**, **Llanos** y **Guayana** son conjuntos del territorio venezolano con paisajes distintos (costa-montaña, planicie, selva-tepuy).",
        ("d1-q8", "Elige la respuesta correcta. ¿Qué hay al norte de Venezuela en el mapa?", ["Mar Caribe", "Océano Pacífico", "Mar Mediterráneo", "Lago Victoria"], "Mar Caribe"),
    ),
    (1, "geo", 2): spec(
        [("ide-ven-01", "Conozco superficie, estados, capitales y Caracas.")],
        "Leer el mapa con **puntos cardinales** ayuda a ubicar fronteras sin confundir Guyana (país) con Guayana (región).",
        ("d2-q7", "Elige la respuesta correcta. ¿Qué país está al este de Venezuela?", ["Guyana", "Chile", "España", "México"], "Guyana"),
    ),
    (1, "geo", 3): spec(
        [("ide-ter-01", "Reconozco Costa-montaña, Llanos y Guayana.")],
        "En **Los Llanos** predominan pastos y ríos; en **Guayana**, selvas y tepuyes; en la costa-montaña, puertos y ciudades como Caracas.",
        ("d3-q7", "Elige la respuesta correcta. ¿Qué región tiene grandes planicies y ríos?", ["Los Llanos", "Antártida", "Sahara", "Alpes"], "Los Llanos"),
    ),
    (1, "geo", 4): spec(
        [("mat-geo-06", "Me oriento y trazo un croquis desde un punto de referencia.")],
        "Un **croquis** es un dibujo sencillo del camino: partes de tu casa, pasas la plaza y llegas a la escuela, marcando norte con una flecha.",
        ("d4-q7", "Elige la respuesta correcta. ¿Qué dibujo pide la práctica de orientación?", ["Un croquis", "Un poema", "Una canción", "Un crucigrama"], "Un croquis"),
    ),
    (1, "geo", 5): spec(
        [
            ("ide-mun-02", "Conozco el mar Caribe y cuido el agua y la Tierra."),
            ("ide-ven-01", "Conozco superficie, estados, capitales y Caracas."),
        ],
        "El **Caribe** baña nuestra costa: cuidar playas y ríos es cuidar el agua que compartimos.",
        ("d5-q7", "Elige la respuesta correcta. ¿Qué mar está al norte de Venezuela?", ["Mar Caribe", "Mar Rojo", "Mar Negro", "Mar Muerto"], "Mar Caribe"),
    ),
    # --- ESP week 1 ---
    (1, "esp", 1): spec(
        [
            ("len-lec-07", "Reconozco sustantivo y adjetivo en oraciones."),
            ("len-lec-06", "Ordeno palabras para formar oraciones."),
        ],
        "Ordena: «defiende / el / cacique / la / región» → **El cacique defiende la región**. Allí ves **sustantivos** (cacique, región) y un **verbo** (defiende).",
        ("d1-q8", "Elige la respuesta correcta. ¿Qué palabra es sustantivo en «frontera larga»?", ["Frontera", "Larga", "Es", "Muy"], "Frontera"),
    ),
    (1, "esp", 2): spec(
        [
            ("len-lec-07", "Reconozco sustantivo y adjetivo en oraciones."),
            ("len-esc-03", "Uso concordancia sustantivo–adjetivo al escribir."),
        ],
        "Concordancia: «**región** **amplia**», «**frontera** **larga**» — el adjetivo concuerda con el sustantivo.",
        ("d2-q7", "Elige la respuesta correcta. ¿Qué adjetivo concuerda con «región»?", ["Amplia", "Amplio", "Amplios", "Amplias"], "Amplia"),
    ),
    (1, "esp", 3): spec(
        [("len-lec-06", "Ordeno palabras para formar oraciones.")],
        "Banco de la semana: **Timotocuica**, **Caribe**, **frontera**, **región** — ordénalas en oraciones completas.",
        ("d3-q7", "Elige la respuesta correcta. ¿Cuántas palabras mínimo necesitas para una oración?", ["Al menos dos con sentido", "Una sola letra", "Solo números", "Solo signos"], "Al menos dos con sentido"),
    ),
    (1, "esp", 4): spec(
        [("len-esc-04", "Planifico y escribo listas o carteles con propósito.")],
        "Escribir un **cartel** para el mural del salón es escribir con propósito: avisar, explicar o invitar.",
        ("d4-q7", "Elige la respuesta correcta. ¿Para qué escribes un cartel en clase?", ["Para comunicar un mensaje", "Para borrar el mapa", "Para olvidar las palabras", "Para no leer"], "Para comunicar un mensaje"),
    ),
    (1, "esp", 5): spec(
        [
            ("len-lec-05", "Leo con distintas modalidades (explorar, repasar, redactar)."),
            ("len-ora-02", "Uso gracias y por favor al hablar en grupo."),
        ],
        "Al repasar las nueve clases, **lee en voz alta** con calma y usa «por favor» si pides ayuda al exponer.",
        ("d5-q7", "Elige la respuesta correcta. ¿Cuántas clases de palabras estudiamos?", ["Nueve", "Tres", "Doce", "Una"], "Nueve"),
    ),
    # --- PRO week 1 ---
    (1, "pro", 1): spec(
        [
            ("len-lec-01", "Sigo instrucciones numeradas para hacer un experimento."),
            ("cie-cts-03", "Observo, pregunto y registro en un experimento."),
        ],
        "Científico escolar: **observar** → **preguntar** → **probar** → **registrar** → **explicar**. Las instrucciones numeradas te guían como un texto instruccional.",
        ("d1-q8", "Elige la respuesta correcta. ¿Qué haces primero en el método científico de la clase?", ["Observar", "Dormir", "Ignorar", "Romper materiales"], "Observar"),
    ),
    (1, "pro", 2): spec(
        [
            ("cie-cts-03", "Observo, pregunto y registro en un experimento."),
            ("mat-est-01", "Registro datos en una tabla sencilla."),
        ],
        "En la **bitácora**, anota fecha, intento y resultado (¿se vio el guiño?) en una **tabla** de dos columnas.",
        ("d2-q7", "Elige la respuesta correcta. ¿Dónde anotas cada intento del disco?", ["En la bitácora o tabla", "En el aire", "Sin escribir", "Solo en el quiz"], "En la bitácora o tabla"),
    ),
    (1, "pro", 3): spec(
        [("mat-est-01", "Registro datos en una tabla sencilla.")],
        "Compara dos velocidades de giro: marca cuál intento funcionó mejor en tu **tabla**.",
        ("d3-q7", "Elige la respuesta correcta. ¿Para qué sirve la tabla de ensayos?", ["Comparar resultados", "Olvidar datos", "Evitar mirar", "No registrar"], "Comparar resultados"),
    ),
    (1, "pro", 4): spec(
        [("len-esc-04", "Planifico pasos antes de escribir la conclusión.")],
        "Antes de la conclusión, **planifica** tres líneas: qué hiciste, qué viste, qué crees que pasó.",
        ("d4-q7", "Elige la respuesta correcta. ¿Qué va antes de escribir la conclusión?", ["Planificar qué dirás", "Tirar el disco", "No pensar", "Copiar sin leer"], "Planificar qué dirás"),
    ),
    (1, "pro", 5): spec(
        [
            ("len-ora-05", "Explico en voz alta el resultado del proyecto."),
            ("ide-soc-02", "Trabajo en equipo con respeto."),
        ],
        "En la **exposición**, di «buenos días» y «gracias»; explica tu resultado en cuatro oraciones claras.",
        ("d5-q7", "Elige la respuesta correcta. ¿Qué haces el día 5 del proyecto?", ["Expones en voz alta", "Empiezas otro experimento distinto", "Olvidas la bitácora", "No hablas"], "Expones en voz alta"),
    ),
    # --- HIS week 2 ---
    (2, "his", 1): spec(
        [
            ("ide-hum-01", "Ubico el inicio del período colonial en los viajes."),
            ("len-lec-03", "Busco datos en mapas y relatos (fuentes)."),
        ],
        "Los viajes de **1498** y **1499** abren el **período colonial**: usamos **mapas** y **relatos** como fuentes para saber qué ocurrió.",
        ("d1-q8", "Elige la respuesta correcta. ¿Qué tipo de fuente es un mapa antiguo?", ["Fuente histórica", "Cuento inventado", "Chiste", "Canción sin sentido"], "Fuente histórica"),
    ),
    (2, "his", 2): spec(
        [("len-lec-03", "Busco datos en mapas y relatos (fuentes).")],
        "Juan de la Cosa fue **cartógrafo**: su mapa es una fuente que complementa el relato escrito.",
        ("d2-q7", "Elige la respuesta correcta. ¿Quién dibujaba mapas en 1499?", ["Juan de la Cosa", "Un dinosaurio", "Un robot", "Un personaje de ficción"], "Juan de la Cosa"),
    ),
    (2, "his", 3): spec(
        [("ide-hum-01", "Ubico el inicio del período colonial en los viajes.")],
        "Después del período indígena llega el encuentro europeo: fechas y rutas marcan el cambio de época.",
        ("d3-q7", "Elige la respuesta correcta. ¿Qué año llegó Colón a costas venezolanas en el tercer viaje?", ["1498", "1492", "2020", "1810"], "1498"),
    ),
    (2, "his", 4): spec(
        [("len-lec-08", "Leo mapas y gráficos sencillos.")],
        "Sigue la **línea de costa** en el mapa de Paria a La Guajira como leer un gráfico de ruta.",
        ("d4-q7", "Elige la respuesta correcta. ¿Qué marcas en el mapa de 1499?", ["Paria y La Guajira", "Luna y Marte", "Europa y Asia", "Norte y Sur polares"], "Paria y La Guajira"),
    ),
    (2, "his", 5): spec(
        [
            ("ide-hum-01", "Ubico el inicio del período colonial en los viajes."),
            ("len-lec-03", "Busco datos en mapas y relatos (fuentes)."),
        ],
        "Repaso: viajes + **fuentes** (mapa, relato) + respeto a pueblos que ya vivían en la costa.",
        ("d5-q7", "Elige la respuesta correcta. ¿Qué NO es una fuente histórica?", ["Un meme inventado hoy", "Un relato antiguo", "Un mapa antiguo", "Una fecha documentada"], "Un meme inventado hoy"),
    ),
    # --- GEO week 2 ---
    (2, "geo", 1): spec(
        [
            ("ide-ven-01", "Conozco estados, capitales y Caracas."),
            ("ide-mun-02", "Relaciono costa caribeña con cuidado del agua."),
        ],
        "**Caracas** es capital nacional; **La Guaira** es puerto caribeño — repasa frontera mar–tierra al estudiar capitales.",
        ("d1-q8", "Elige la respuesta correcta. ¿Cuál es la capital de Venezuela?", ["Caracas", "Madrid", "Brasilia", "Lima"], "Caracas"),
    ),
    (2, "geo", 2): spec(
        [("ide-ven-01", "Conozco estados, capitales y Caracas.")],
        "Memoriza pares estado–capital como ubicar personas en un mapa político de Venezuela.",
        ("d2-q7", "Elige la respuesta correcta. ¿Capital de Miranda?", ["Los Teques", "Maracay", "Caracas", "La Guaira"], "Los Teques"),
    ),
    (2, "geo", 3): spec(
        [("ide-ven-01", "Conozco estados, capitales y Caracas.")],
        "Cuatro pares de esta semana viven en la **Región Central** y litoral — léelos en el mapa, no solo en lista.",
        ("d3-q7", "Elige la respuesta correcta. ¿Capital de Aragua?", ["Maracay", "Los Teques", "Barquisimeto", "Mérida"], "Maracay"),
    ),
    (2, "geo", 4): spec(
        [("mat-geo-06", "Me oriento y trazo un croquis entre dos capitales.")],
        "Traza un **croquis** imaginario de Caracas a Los Teques marcando una ruta y el norte.",
        ("d4-q7", "Elige la respuesta correcta. ¿Qué herramienta usas para orientarte en la práctica?", ["Croquis con flecha norte", "Solo adivinar", "Ignorar el mapa", "Borrar nombres"], "Croquis con flecha norte"),
    ),
    (2, "geo", 5): spec(
        [("ide-ven-01", "Conozco estados, capitales y Caracas.")],
        "Repasa los cuatro pares señalando cada capital en un mapa de Venezuela.",
        ("d5-q7", "Elige la respuesta correcta. ¿Capital del estado La Guaira?", ["La Guaira", "Caracas", "Maracay", "Valencia"], "La Guaira"),
    ),
    # --- ESP week 2 ---
    (2, "esp", 1): spec(
        [
            ("len-lec-06", "Ordeno palabras para formar oraciones."),
            ("len-esc-09", "Escribo oraciones completas con signos . ? !"),
        ],
        "Ordena: «1499 / costa / recorrieron / la» y escribe signos **.** **?** **!** cuando corresponda.",
        ("d1-q8", "Elige la respuesta correcta. ¿Qué signo cierra una pregunta?", ["?", ".", "!", ","], "?"),
    ),
    (2, "esp", 2): spec(
        [("len-lec-06", "Ordeno palabras para formar oraciones.")],
        "Usa nombres de la semana de **historia** y **geografía** (Colón, Paria, Caracas) en oraciones ordenadas.",
        ("d2-q7", "Elige la respuesta correcta. ¿Qué haces con un banco de palabras sueltas?", ["Ordenarlas en oración", "Tirarlas", "Mezclar sin leer", "Ignorarlas"], "Ordenarlas en oración"),
    ),
    (2, "esp", 3): spec(
        [("len-esc-04", "Planifico tres oraciones para un mini-relato.")],
        "Planifica tres oraciones sobre un **viaje por la costa** antes de escribirlas.",
        ("d3-q7", "Elige la respuesta correcta. ¿Qué haces antes de escribir el mini-relato?", ["Planificar", "Publicar sin leer", "Borrar el mapa", "No pensar"], "Planificar"),
    ),
    (2, "esp", 4): spec(
        [("len-esc-09", "Escribo interrogativas y exclamativas.")],
        "Escribe una pregunta sobre el mapa (**¿**…**?**) y una exclamación sobre el hallazgo (**¡**…**!**).",
        ("d4-q7", "Elige la respuesta correcta. ¿Qué signo abre una exclamación?", ["¡", "?", ".", "("], "¡"),
    ),
    (2, "esp", 5): spec(
        [
            ("len-ora-05", "Narrar y exponer con claridad."),
            ("len-lec-03", "Comento noticias o relatos informativos."),
        ],
        "Cuenta en voz alta tu mini-relato del viaje como si explicaras una **noticia** del pasado.",
        ("d5-q7", "Elige la respuesta correcta. ¿Para qué narras en voz alta el relato?", ["Comunicar lo que entendiste", "Ocultar ideas", "No escuchar", "Evitar palabras"], "Comunicar lo que entendiste"),
    ),
    # --- PRO week 2 ---
    (2, "pro", 1): spec(
        [
            ("len-lec-01", "Leo instrucciones para armar la gota-lupa."),
            ("cie-cts-01", "Observo una mezcla (agua + gota) y describo."),
        ],
        "Agua + gota sobre letras forma una **mezcla** visible; **lee las instrucciones** antes de montar el experimento.",
        ("d1-q8", "Elige la respuesta correcta. ¿Qué debes leer antes de empezar?", ["Las instrucciones numeradas", "Un cuento ajeno", "Nada", "Solo el título"], "Las instrucciones numeradas"),
    ),
    (2, "pro", 2): spec(
        [
            ("cie-cts-03", "Observo y registro en la bitácora."),
            ("mat-est-01", "Registro datos en tabla."),
        ],
        "Anota en **tabla** si la gota redonda agrandó más la letra A o la O.",
        ("d2-q7", "Elige la respuesta correcta. ¿Qué comparas en la bitácora?", ["Resultados de cada intento", "Colores del cielo", "Nombres de dinosaurios", "Capitales europeas"], "Resultados de cada intento"),
    ),
    (2, "pro", 3): spec(
        [("mat-est-01", "Registro datos en tabla.")],
        "Repite el experimento dos veces y marca cuál gota funcionó mejor — eso es **recopilar datos**.",
        ("d3-q7", "Elige la respuesta correcta. ¿Por qué repites el experimento?", ["Comprobar lo observado", "Evitar escribir", "Cambiar el tema", "No mirar"], "Comprobar lo observado"),
    ),
    (2, "pro", 4): spec(
        [("len-lec-01", "Sigo instrucciones para concluir.")],
        "Completa «Vi que…» y «Creo que pasó porque…» siguiendo el orden de la bitácora.",
        ("d4-q7", "Elige la respuesta correcta. ¿Qué frase empieza tu conclusión?", ["Vi que…", "Nunca vi…", "Sin datos…", "Ayer soñé…"], "Vi que…"),
    ),
    (2, "pro", 5): spec(
        [
            ("len-ora-05", "Explico el experimento en voz alta."),
            ("cie-cts-03", "Comunico lo que observé."),
        ],
        "Explica la **gota lupa** con cortesía: saluda, muestra datos y di «gracias» al terminar.",
        ("d5-q7", "Elige la respuesta correcta. ¿Qué compartes en la expo?", ["Tu observación y conclusión", "Un experimento distinto", "Silencio total", "Solo bromas"], "Tu observación y conclusión"),
    ),
}

# Phase B: mat + art (weeks 1–2)
CELLS_B: dict[tuple[int, str, int], CellSpec] = {
    # --- MAT week 1 (tablas 1–12) ---
    (1, "mat", 1): spec(
        [("mat-num-06", "Multiplico con grupos iguales (tablas).")],
        "Multiplicar también sirve en la feria: 4 bolsas de 5 mangos son **4×5=20** mangos — grupos iguales del entorno.",
        ("d1-q8", "Elige la respuesta correcta. ¿Qué significa 3×4?", ["Tres grupos de cuatro", "Tres más cuatro", "Un solo mango", "Una resta"], "Tres grupos de cuatro"),
    ),
    (1, "mat", 2): spec(
        [("mat-num-06", "Uso patrones para multiplicar (dobles, tabla del 5).")],
        "Patrón del 5 en precios: si un jugo cuesta **5** bolívares, **6** jugos son **6×5=30**.",
        ("d2-q7", "Elige la respuesta correcta. ¿En qué terminan muchos productos ×5?", ["En 0 o 5", "Siempre en 1", "En letras", "En 9 solamente"], "En 0 o 5"),
    ),
    (1, "mat", 3): spec(
        [("mat-num-06", "Multiplico hasta la tabla del 12.")],
        "El orden no cambia el producto: **9×8** y **8×9** dan lo mismo — útil al contar cajas en filas y columnas.",
        ("d3-q7", "Elige la respuesta correcta. ¿Cuánto es 10×6?", ["60", "16", "106", "610"], "60"),
    ),
    (1, "mat", 4): spec(
        [
            ("mat-num-06", "Multiplico por la unidad seguida de cero (×10)."),
            ("mat-num-03", "Leo cantidades con miles en un problema."),
        ],
        "×10 en moneda: **3×20 bolívares = 60**; **3×200 = 600**; **3×2.000 = 6.000** (tres **mil**).",
        ("d4-q7", "Elige la respuesta correcta. ¿Cuánto es 4×1.000?", ["4.000", "400", "40", "4"], "4.000"),
    ),
    (1, "mat", 5): spec(
        [
            ("mat-est-01", "Organizo datos en una tabla o pictograma."),
            ("mat-num-06", "Repaso tablas con conteo."),
        ],
        "Haz un **pictograma**: cada dibujo = 2 tablas que dominaste; cuenta cuántas llevas esta semana.",
        ("d5-q7", "Elige la respuesta correcta. ¿Para qué sirve un pictograma aquí?", ["Mostrar cuántas tablas practicaste", "Olvidar números", "Evitar multiplicar", "No registrar"], "Mostrar cuántas tablas practicaste"),
    ),
    # --- MAT week 2 (tablas 5–16) ---
    (2, "mat", 1): spec(
        [("mat-num-06", "Multiplico dos dígitos por un dígito.")],
        "En la tienda: **12** paquetes de **3** galletas → **12×3**; descompón **10×3 + 2×3**.",
        ("d1-q8", "Elige la respuesta correcta. ¿Qué operación cuenta 12 grupos de 3?", ["12×3", "12+3", "12−3", "12÷3 solo"], "12×3"),
    ),
    (2, "mat", 2): spec(
        [("mat-num-06", "Multiplico con tablas del 5 al 8.")],
        "Problema: **7** niños llevan **6** libros cada uno → **7×6**; comprueba con suma o doble de **3×6**.",
        ("d2-q7", "Elige la respuesta correcta. ¿Cuánto es 7×6?", ["42", "36", "13", "76"], "42"),
    ),
    (2, "mat", 3): spec(
        [("mat-num-06", "Multiplico tablas altas (9–16).")],
        "**16×4**: piensa **10×4=40** y **6×4=24**; suma **64**.",
        ("d3-q7", "Elige la respuesta correcta. ¿Cuánto es 12×12?", ["144", "121", "122", "24"], "144"),
    ),
    (2, "mat", 4): spec(
        [("mat-med-04", "Calculo con bolívares en un problema.")],
        "Pagas con **bolívares**: **5** lápices a **800** c/u → **5×800=4.000**; revisa el cambio si pagas **5.000**.",
        ("d4-q7", "Elige la respuesta correcta. ¿Qué moneda usa el problema?", ["Bolívares", "Dólares de juego", "Euros", "Pesos argentinos"], "Bolívares"),
    ),
    (2, "mat", 5): spec(
        [
            ("mat-est-01", "Leo una tabla de resultados de multiplicación."),
            ("mat-num-06", "Aplico tablas en problemas."),
        ],
        "Tabla de la semana: anota cinco productos que aún te cuestan y cuántas veces los practicaste.",
        ("d5-q7", "Elige la respuesta correcta. ¿Qué guardas en la tabla de repaso?", ["Productos y prácticas", "Solo colores", "Nombres de países", "Recetas"], "Productos y prácticas"),
    ),
    # --- ART week 1 (OiLS) ---
    (1, "art", 1): spec(
        [
            ("mat-geo-04", "Diferencio círculo y circunferencia."),
            ("mat-geo-02", "Veo ángulos en formas redondas."),
        ],
        "La letra **O** dibuja un **círculo** (relleno); el contorno solo, sin rellenar, es la **circunferencia**.",
        ("d1-q8", "Elige la respuesta correcta. ¿Qué es solo la línea alrededor del círculo?", ["Circunferencia", "Triángulo", "Cuadrado", "Punto"], "Circunferencia"),
    ),
    (1, "art", 2): spec(
        [
            ("mat-geo-05", "Uso rectas horizontales, verticales y diagonales."),
            ("mat-geo-02", "Reconozco ángulos en la casa."),
        ],
        "Las líneas **L** son **rectas**: horizontal, vertical y diagonal forman **ángulos** en la esquina de la casa.",
        ("d2-q7", "Elige la respuesta correcta. ¿Qué línea va de arriba abajo?", ["Vertical", "Horizontal", "Circular", "Diagonal siempre"], "Vertical"),
    ),
    (1, "art", 3): spec(
        [("mat-geo-01", "Cuento lados de un polígono sencillo.")],
        "La casa con **L** tiene un **polígono** de cuatro lados (rectángulo): cuenta lados antes de decorar.",
        ("d3-q7", "Elige la respuesta correcta. ¿Cuántos lados tiene un rectángulo?", ["Cuatro", "Tres", "Cinco", "Uno"], "Cuatro"),
    ),
    (1, "art", 4): spec(
        [("mat-geo-03", "Comparo formas planas al combinar O, L y S.")],
        "Al juntar **O**, **L** y **S** comparas **formas planas** (círculo, rectángulo, curva) como piezas de un rompecabezas.",
        ("d4-q7", "Elige la respuesta correcta. ¿Qué pieza OiLS es curva abierta?", ["S", "L", "O", "i"], "S"),
    ),
    (1, "art", 5): spec(
        [
            ("mat-geo-04", "Repaso círculo y circunferencia."),
            ("mat-geo-01", "Repaso polígonos y lados."),
        ],
        "Repasa: **O** = círculo; contorno = **circunferencia**; casa = **polígono** de cuatro lados.",
        ("d5-q7", "Elige la respuesta correcta. ¿Qué método usamos esta semana?", ["OiLS", "Solo colorear", "Solo números", "Mapas"], "OiLS"),
    ),
    # --- ART week 2 (espejo / simetría) ---
    (2, "art", 1): spec(
        [
            ("mat-geo-02", "Uso el eje como línea de simetría."),
            ("mat-geo-05", "La recta eje divide la figura."),
        ],
        "El **eje** del espejo es una **recta**: cada punto de un lado tiene la misma distancia al otro (simetría).",
        ("d1-q8", "Elige la respuesta correcta. ¿Qué divide la figura en dos mitades iguales?", ["El eje", "Un color", "Un borrador", "Un número"], "El eje"),
    ),
    (2, "art", 2): spec(
        [("mat-geo-02", "Completo ángulos y curvas en simetría.")],
        "Al copiar la media imagen, el **ángulo** y la **curva** del otro lado deben tener la misma abertura respecto al eje.",
        ("d2-q7", "Elige la respuesta correcta. ¿Qué revisas antes de sombrear?", ["Que las líneas coincidan", "Solo el color", "Nada", "El título"], "Que las líneas coincidan"),
    ),
    (2, "art", 3): spec(
        [("mat-geo-05", "Trazo el eje como recta de referencia.")],
        "Traza el **eje vertical** con regla: es tu **recta** guía; mide distancias con pequeños puntos.",
        ("d3-q7", "Elige la respuesta correcta. ¿Qué herramienta ayuda a trazar el eje recto?", ["Regla", "Tijeras", "Cinta adhesiva", "Agua"], "Regla"),
    ),
    (2, "art", 4): spec(
        [("mat-geo-02", "Reflexión: figura simétrica.")],
        "Nombrar cada línea (O, L, S) en ambos lados confirma que la **figura simétrica** quedó balanceada.",
        ("d4-q7", "Elige la respuesta correcta. ¿Qué significa simetría en el dibujo?", ["Mitades iguales en el eje", "Solo un lado", "Sin líneas", "Caos"], "Mitades iguales en el eje"),
    ),
    (2, "art", 5): spec(
        [
            ("mat-geo-02", "Explico simetría con mis palabras."),
            ("mat-geo-05", "Uso el eje como recta."),
        ],
        "Explica tu dibujo espejo: señala el **eje** y dos distancias iguales a la **recta** central.",
        ("d5-q7", "Elige la respuesta correcta. ¿Qué semana practicamos?", ["Dibujo espejo", "Tablas del 1", "Preposiciones latinas", "Tejidos"], "Dibujo espejo"),
    ),
}

ALL_CELLS: dict[tuple[int, str, int], CellSpec] = {**CELLS, **CELLS_B}


def inject_anchor(body: str, anchor: str) -> str:
    if not anchor or anchor in body:
        return body
    marker = "\n\nPráctica:"
    if marker not in body:
        return body + "\n\n" + anchor
    head, tail = body.split(marker, 1)
    return head.rstrip() + "\n\n" + anchor + marker + tail


def patch_quiz(doc: dict, quiz_spec: tuple[str, str, list[str], str] | None) -> bool:
    if not quiz_spec:
        return False
    qid, prompt, choices, answer = quiz_spec
    changed = False
    for q in doc.get("quiz", {}).get("questions", []):
        if q.get("id") == qid and q.get("type") == "mcq":
            if q.get("prompt") != prompt:
                q["prompt"] = prompt
                changed = True
            if q.get("choices") != choices:
                q["choices"] = choices
                changed = True
            if q.get("answer") != answer:
                q["answer"] = answer
                changed = True
            break
    return changed


def fix_typos(text: str) -> str:
    return text.replace("149?8", "1498").replace("149?9", "1499")


def apply_file(path: Path, week: int, subject: str, day: int, cells: dict | None = None) -> bool:
    key = (week, subject, day)
    catalog = cells if cells is not None else ALL_CELLS
    cell = catalog.get(key)
    if not cell:
        return False
    doc = json.loads(path.read_text(encoding="utf-8"))
    changed = False

    new_mppe = {"objectives": cell["objectives"]}
    if doc.get("mppe") != new_mppe:
        doc["mppe"] = new_mppe
        changed = True

    anchor = cell.get("anchor")
    if anchor:
        pts = doc["lesson"]["points"]
        if pts:
            nb = inject_anchor(fix_typos(pts[0].get("body", "")), anchor)
            nb = fix_typos(nb)
            if nb != pts[0].get("body"):
                pts[0]["body"] = nb
                changed = True

    for p in doc["lesson"]["points"]:
        if p.get("body"):
            fb = fix_typos(p["body"])
            if fb != p["body"]:
                p["body"] = fb
                changed = True

    if patch_quiz(doc, cell.get("quiz")):
        changed = True

    if changed:
        path.write_text(json.dumps(doc, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return changed


def main() -> int:
    touched: list[str] = []
    subjects = ("his", "geo", "esp", "pro", "mat", "art")
    for week in (1, 2):
        for subject in subjects:
            for day in range(1, 6):
                name = f"{subject}-c3-w{week}-d{day}-l6.eoschool.json"
                path = MEDIA / f"week{week}" / name
                if not path.is_file():
                    print("missing", path)
                    continue
                if apply_file(path, week, subject, day):
                    touched.append(f"c3-w{week}-d{day}-l6-{subject}")
                    print("updated", name)
    print("touched", len(touched), touched)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
