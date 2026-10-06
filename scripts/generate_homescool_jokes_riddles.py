#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Generate 1000 kid-safe Spanish (es-VE) jokes/riddles for Homescool."""
from __future__ import annotations
import json, re, unicodedata
from pathlib import Path

SECTIONS = ("bib", "ide", "len", "mat", "cie")
OUT = Path(__file__).resolve().parents[1] / "frontend" / "src" / "data" / "homescool" / "jokes-riddles-1000.json"
FORBIDDEN = re.compile(
    r"(idiota|est[uú]pid|imb[eé]cil|maldit|carajo|mierda|pende|sexo|desnud|drog|alcohol|cigarr|"
    r"borracho|matar|sangre|pistola|cuchillo|terror|suic|bullying|racis|sexis|pol[ií]tico|partido|"
    r"ideolog[ií]a|tiktok|instagram|golpea|insult)",
    re.I,
)

def norm(s: str) -> str:
    s = "".join(c for c in unicodedata.normalize("NFD", s.lower()) if unicodedata.category(c) != "Mn")
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9\s]", " ", s)).strip()

class Pool:
    def __init__(self):
        self.items = []
        self.seen = set()
        self.punches = set()
    def add(self, kind, setup, punch):
        setup, punch = setup.strip(), punch.strip()
        if not punch or FORBIDDEN.search(setup + " " + punch):
            return False
        k = norm(f"{setup}|{punch}")
        if not k or k in self.seen:
            return False
        # Allow same riddle answer with different clues; keep joke punchlines unique-ish
        pn = norm(punch)
        if kind == "joke" and pn in self.punches:
            return False
        self.seen.add(k)
        if kind == "joke":
            self.punches.add(pn)
        self.items.append({"kind": kind, "setup": setup, "punchline": punch, "locale": "es-VE"})
        return True

# Compact knowledge banks: (name, clue_fragment, joke_trait)
ANIMALS = [
    ("el perro", "ladra y mueve la cola", "porque ya tiene muchos amigos en el patio"),
    ("el gato", "dice miau y tiene bigotes", "porque estudia con siete vidas de practica"),
    ("la vaca", "muge y da leche", "porque siempre va a la leche-tura"),
    ("el caballo", "relincha y galopa", "porque resuelve a galope"),
    ("la oveja", "da lana y hace bee", "porque teje buenas ideas"),
    ("el cerdo", "dice oinc en el corral", "porque le gusta revolcarse de risa"),
    ("el pato", "hace cuac en la laguna", "porque nada entre clases"),
    ("la gallina", "pone huevos en la granja", "porque siempre esta empollando ideas"),
    ("el gallo", "canta al amanecer", "porque nunca llega tarde"),
    ("el burro", "rebuzna en el camino", "porque carga buenos recuerdos"),
    ("el conejo", "salta con orejas largas", "porque llega a saltos de alegria"),
    ("el raton", "es pequeno y vive en fabulas", "porque busca el queso del saber"),
    ("el leon", "tiene melena y ruge", "porque es rey de la selva de cuentos"),
    ("el tigre", "tiene rayas naranjas", "porque deja huella en cada salto"),
    ("el oso", "es grande y peludo", "porque abraza fuerte las ideas"),
    ("el mono", "trepa y ama el cambur", "porque hace travesuras suaves"),
    ("el elefante", "tiene trompa enorme", "porque nunca olvida la leccion"),
    ("la jirafa", "tiene el cuello larguisimo", "porque ve la pizarra desde lejos"),
    ("la cebra", "tiene rayas blancas y negras", "porque va por su via rayada"),
    ("el guepardo", "corre muy rapido", "porque termina la carrera en un suspiro"),
    ("el oso polar", "es blanco y vive en el hielo", "porque estudia en fresco"),
    ("el panda", "come bambu y es blanco y negro", "porque mastica la leccion despacio"),
    ("el canguro", "salta con bolsa", "porque guarda la tarea en la panza"),
    ("el murcielago", "duerme boca abajo", "porque mira los problemas al derecho"),
    ("la tortuga", "lleva caparazon y anda despacio", "porque llega lejos a su ritmo"),
    ("el caracol", "lleva su casa a cuestas", "porque nunca pierde su mochila"),
    ("la rana", "salta y dice croac", "porque siempre esta croac-ontenta"),
    ("la abeja", "hace miel y zumba", "porque trabaja en equipo del panal"),
    ("la mariquita", "es roja con puntos negros", "porque suma puntos de color"),
    ("la arana", "teje redes", "porque enreda historias bonitas"),
    ("la luciernaga", "brilla de noche en el campo", "porque ilumina ideas pequeñas"),
    ("el mosquito", "zumba cerca del oido", "porque llega con noticia zumbante"),
    ("la mariposa", "tiene alas de colores", "porque transforma la tarea en vuelo"),
    ("el loro", "repite palabras", "porque practica el vocabulario"),
    ("el buho", "dice hoo-hoo de noche", "porque es sabio del diccionario"),
    ("el colibri", "liba flores diminuto", "porque termina rapido y vuelve"),
    ("el delfin", "nada y salta en el mar", "porque aprende a saltos de alegria"),
    ("la ballena", "es gigante y echa un chorro", "porque piensa en grande"),
    ("el pulpo", "tiene ocho brazos", "porque hace ocho tareas a la vez"),
    ("la estrella de mar", "parece estrella en la arena", "porque brilla en ciencias naturales"),
    ("el cangrejo", "camina de lado", "porque avanza aunque sea de ladito"),
    ("el pez", "nada en el agua o la pecera", "porque nada de preocuparse"),
    ("el pinguino", "usa esmoquin en el hielo", "porque siempre va elegante a clase"),
    ("el camello", "tiene joroba en el desierto", "porque guarda agua de ideas"),
    ("el perezoso", "se mueve muy despacio", "porque disfruta cada hoja del arbol"),
    ("el armadillo", "lleva armadura natural", "porque se protege con paciencia"),
    ("la iguana", "toma sol en la pared", "porque calienta sus ideas"),
    ("la hormiga", "trabaja en fila", "porque carga logros pequeñitos"),
    ("el grillo", "canta de noche", "porque pone musica a la tarea"),
    ("la ardilla", "guarda nueces", "porque ahorra buenas ideas"),
    ("el zorro", "es astuto en fabulas", "porque resuelve con ingenio"),
    ("el ciervo", "tiene cornamenta", "porque apunta alto"),
    ("el koala", "abraza eucaliptos", "porque se abraza al aprendizaje"),
    ("el camaleon", "cambia de color", "porque se adapta a cada materia"),
    ("el tucan", "tiene pico enorme", "porque cuenta historias grandes"),
    ("el flamenco", "se para en una pata", "porque equilibra arte y deporte"),
    ("el aguila", "vuela muy alto", "porque ve el panorama completo"),
    ("la foca", "aplaude en el agua", "porque celebra cada logro"),
    ("la nutria", "juega en el rio", "porque convierte el estudio en juego"),
    ("el castor", "construye diques", "porque construye buenas bases"),
    ("el hipopotamo", "abre la boca enorme en el rio", "porque se traga la leccion completa"),
    ("el rinoceronte", "tiene cuerno en la nariz", "porque va directo al punto"),
    ("el tiburon", "nada fuerte en el oceano", "porque corta dudas con hechos"),
    ("la medusa", "flota gelatinosa en el mar", "porque flota sobre los problemas"),
    ("el hamster", "corre en una ruedita", "porque da vueltas a las ideas"),
    ("el cobayo", "es suave compañero de clase", "porque escucha en silencio"),
    ("el ganso", "grazna fuerte", "porque anuncia el recreo"),
    ("el pavo", "se esponja en el corral", "porque se hincha de orgullo escolar"),
    ("la trucha", "nada en rio fresco", "porque va contra corriente con ganas"),
    ("el camaron", "es pequeño y rosado", "porque cabe en grandes equipos"),
    ("el dinosaurio", "aparece en museos y libros", "porque la historia tambien divierte"),
    ("el robot", "tiene circuitos amables", "porque procesa chistes en cero uno"),
]

FOODS = [
    ("la pera", "blanca por dentro y verde por fuera", "porque es una fruta de espera... ¡pera!"),
    ("el aguacate", "tiene cate en el corazon", "porque es el rey del sandwich suave"),
    ("el platano", "parece oro y no es plata", "porque se pela de risa"),
    ("la sandia", "verde afuera, roja adentro, pepitas negras", "porque refresca al equipo"),
    ("la zanahoria", "larga y anaranjada", "porque mejora la vista de la tarea"),
    ("la cebolla", "hace llorar al cortarla", "porque emociona hasta las lagrimas de risa"),
    ("el coco", "peludo afuera y dulce adentro", "porque es un tesoro tropical"),
    ("la fresa", "roja con pepitas afuera", "porque pone puntos dulces al dia"),
    ("la uva", "morada y en racimo", "porque viene en equipo"),
    ("la manzana", "cae del manzano", "porque mantiene lejos al doctor del aburrimiento"),
    ("la papa", "vive bajo tierra y se hace pure", "porque es versatil en la cocina escolar"),
    ("el brocoli", "parece un arbolito", "porque da sombra de vitaminas"),
    ("el arroz", "grano blanco suelto", "porque acompaña casi todo"),
    ("la leche", "blanca de la vaca", "porque fortalece huesos y animo"),
    ("el chocolate", "dulce de cacao", "porque derrite malos humores"),
    ("el helado", "frio en cono", "porque se derrite de emocion"),
    ("la arepa", "pan redondo venezolano", "porque siempre va bien rellena de cariño"),
    ("la cachapa", "dulce de maiz", "porque endulza el desayuno"),
    ("el tequeño", "queso frito en palito", "porque es campeon del recreo"),
    ("la empanada", "crujiente de fiesta", "porque guarda sorpresas adentro"),
    ("el pabellon", "caraota, arroz, platano y carne", "porque es un equipo de cuatro estrellas"),
    ("la hallaca", "envuelta en hoja", "porque celebra envuelta en tradicion"),
    ("la pizza", "masa con queso", "porque reparte porciones de alegria"),
    ("la sopa", "caliente en plato hondo", "porque abriga dias lluviosos"),
    ("los espaguetis", "largos en el tenedor", "porque enredan risas"),
    ("el yogur", "frio con fruta", "porque cultiva buenos microbios amigos"),
    ("el huevo", "del desayuno", "porque empieza el dia en su cascaron de ideas"),
    ("el queso", "blanco criollo", "porque acompaña arepas y sonrisas"),
    ("el jugo", "bebida de frutas", "porque refresca la garganta lectora"),
    ("el raspado", "hielo triturado con sabor", "porque enfría el recreo"),
    ("la galleta", "dulce del lonchera", "porque cruje de felicidad"),
    ("el cambur", "amarillo y curvo", "porque es energia portatil"),
    ("la naranja", "se abre en gajos", "porque es ja-ja-ja citrica"),
    ("el ajo", "tiene dientes y no come", "porque da sabor a la sopa escolar"),
]

SCHOOL = [
    ("el lapiz", "escribe con punta de grafito", "porque saca punta a las ideas"),
    ("el borrador", "borra lo del lapiz", "porque perdona errores con cariño"),
    ("la regla", "mide centimetros", "porque mide la diversion en fiestas"),
    ("la tijera", "recorta papel", "porque corta caminos cortos a la meta"),
    ("el pegamento", "pega manualidades", "porque une equipos"),
    ("la mochila", "carga libros a la espalda", "porque viaja llena de logros"),
    ("la lonchera", "guarda la merienda", "porque abre el recreo"),
    ("el cuaderno", "tiene hojas para escribir", "porque guarda aventuras"),
    ("el libro", "cuenta historias en paginas", "porque abre mundos"),
    ("la pizarra", "recibe escritura del maestro", "porque nunca se pierde: siempre esta en clase"),
    ("el marcador", "escribe grueso", "porque deja huella clara"),
    ("el estuche", "guarda lapices", "porque es casa de heroes de grafito"),
    ("el sacapuntas", "devuelve la punta", "porque afila el ingenio"),
    ("el compas", "dibuja circulos", "porque hace amigos redondos"),
    ("el transportador", "mide angulos", "porque pone cada idea en su grado"),
    ("el abaco", "tiene cuentas de colores", "porque suma jugando"),
    ("la calculadora", "hace cuentas rapidas", "porque suma amigos en el recreo"),
    ("el rompecabezas", "se arma por piezas", "porque enseña paciencia"),
    ("la plastilina", "se modela blanda", "porque da forma a la imaginacion"),
    ("el resaltador", "pinta texto importante", "porque ilumina lo clave"),
    ("la carpeta", "guarda trabajos", "porque ordena victorias"),
    ("la botella", "lleva agua", "porque hidrata ideas"),
    ("el timbre", "suena al recreo", "porque es DJ del patio"),
    ("el pupitre", "sostiene cuadernos", "porque apoya el aprendizaje"),
    ("la silla", "sirve para sentarse", "porque espera a quien quiere aprender"),
    ("el teclado", "tiene teclas", "porque se rie tecla a tecla"),
    ("el monitor", "muestra la pantalla", "porque enseña con luz"),
    ("el globo terraqueo", "muestra continentes", "porque gira sin marearse"),
    ("el iman", "atrae clips", "porque atrae buenas respuestas"),
    ("la lupa", "agranda lo pequeño", "porque encuentra maravillas"),
    ("el microscopio", "ve lo diminuto", "porque descubre mundos invisibles"),
    ("el telescopio", "acerca estrellas", "porque trae el cielo al aula"),
    ("la linterna", "alumbra con mano", "porque ilumina exploraciones"),
    ("el papalote", "vuela con hilo", "porque saluda desde arriba"),
    ("el balon", "rebota en el patio", "porque pide patearlo con alegria"),
    ("la cuerda", "sirve para saltar", "porque esta en el aire del recreo"),
    ("la guitarra", "tiene cuerdas", "porque acompaña canciones"),
    ("el piano", "tiene teclas blancas y negras", "porque pone notas, no tristezas"),
    ("el tambor", "marca ritmo", "porque dice tum tum ja ja"),
    ("la flauta", "suena al soplar", "porque sopla melodias suaves"),
]

NATURE = [
    ("el sol", "calienta de dia", "porque va a la escuela a salir mas brillante"),
    ("la luna", "ilumina de noche", "porque estudia en cuartos crecientes"),
    ("la estrella", "brilla en el cielo", "porque sigue su constelacion"),
    ("la tierra", "es nuestro planeta", "porque nos da patio y huerto"),
    ("la lluvia", "cae en gotitas", "porque toca cancion en el techo"),
    ("el arcoiris", "tiene siete colores", "porque se rie en siete ja"),
    ("la nieve", "es blanca y fria", "porque invita a dibujar copos"),
    ("el viento", "mueve las hojas", "porque peina las olas"),
    ("el arbol", "hace sombra", "porque cuenta años en anillos"),
    ("la flor", "huele rico", "porque agradece al colibri"),
    ("la grama", "cubre el parque", "porque recibe picnics con cuidado"),
    ("la nube", "flota en el cielo", "porque guarda lluvia en el bolsillo"),
    ("el rio", "corre entre piedras", "porque lleva historias al mar"),
    ("el lago", "esta quieto", "porque refleja sonrisas"),
    ("el mar", "tiene olas", "porque saluda a la playa con olas"),
    ("la playa", "tiene arena", "porque es alfombra salada"),
    ("la montana", "es alta", "porque mira lejos"),
    ("el bosque", "tiene muchos arboles", "porque susurra cuentos verdes"),
    ("el desierto", "tiene dunas", "porque esconde tesoros de arena"),
    ("la isla", "esta rodeada de mar", "porque invita a explorar orillas"),
    ("la cascada", "cae desde arriba", "porque aplaude con agua"),
    ("la cueva", "es un hueco explorado", "porque guarda ecos amables"),
    ("la sombra", "sigue al sol", "porque acompaña sin molestar"),
    ("el eco", "repite sonidos", "porque estudia repitiendo"),
    ("la semilla", "se vuelve planta", "porque agradece a la tierra"),
    ("la raiz", "bebe bajo tierra", "porque sostiene en secreto"),
    ("la hoja", "es verde y plana", "porque es prima del cuaderno"),
    ("el petalo", "colorea la flor", "porque viste de fiesta a la planta"),
    ("el oxigeno", "se respira", "porque es el gas de la vida"),
    ("el agua", "se bebe", "porque refresca cuerpos y ideas"),
    ("el cometa", "tiene cola en el cielo", "porque deja rastro de asombro"),
    ("la constelacion", "dibuja estrellas", "porque cuenta cuentos en puntos de luz"),
    ("el cohete", "despega alto", "porque cuenta tres dos uno"),
    ("el astronauta", "usa casco blanco", "porque estudia con mucho espacio"),
    ("el fosil", "es resto antiguo", "porque cuenta historias de piedra"),
]

JOBS = [
    ("el medico", "cura cuando estas enfermo", "porque receta descanso y sonrisas"),
    ("el maestro", "enseña en el salon", "porque abre puertas de saber"),
    ("el panadero", "hornea pan", "porque amasa buenos dias"),
    ("el bombero", "apaga incendios", "porque llega con valentia y agua"),
    ("el dentista", "cuida dientes", "porque premia sonrisas limpias"),
    ("el agricultor", "siembra en el campo", "porque cosecha paciencia"),
    ("el conductor", "maneja el autobus", "porque lleva sueños a la escuela"),
    ("el cocinero", "prepara platos", "porque sazona dias felices"),
    ("el pintor", "pinta con pincel", "porque da color a paredes de imaginacion"),
    ("el musico", "toca instrumentos", "porque pone ritmo al recreo"),
    ("el plomero", "arregla tuberias", "porque destapa problemas"),
    ("el electricista", "repara luces", "porque enciende ideas"),
    ("el peluquero", "corta cabello", "porque peina confianza"),
    ("el pescador", "pesca con caña", "porque tiene paciencia de rio"),
    ("el albañil", "construye paredes", "porque levanta bases firmes"),
    ("el bibliotecario", "ordena libros", "porque encuentra el cuento justo"),
    ("el jardinero", "cuida plantas", "porque riega esperanza"),
    ("el veterinario", "cuida animales", "porque habla el idioma del mimo"),
    ("el astronauta", "viaja al espacio en libros", "porque saluda orbitas"),
    ("el cientifico", "hace experimentos", "porque pregunta al mundo"),
]

VEHICLES = [
    ("la bicicleta", "tiene dos ruedas y pedales", "porque estudia equilibrio"),
    ("el carro", "tiene cuatro ruedas", "porque lleva a la familia junta"),
    ("el avion", "vuela con alas", "porque viaja por nubes esponjadas"),
    ("el barco", "surca el mar", "porque saluda faros"),
    ("el tren", "va sobre rieles", "porque silba de alegria"),
    ("el autobus escolar", "es amarillo", "porque se ve alegre de lejos"),
    ("el camion de bomberos", "tiene sirena roja", "porque corre a ayudar"),
    ("la ambulancia", "lleva enfermos", "porque cuida con prisa amable"),
    ("el submarino de juguete", "viaja bajo el agua", "porque explora en profundidad"),
    ("el dron", "vuela con helices", "porque mira el patio desde arriba"),
    ("el patin", "se desliza", "porque estudia friccion jugando"),
    ("el monopatín", "tiene una tabla", "porque equilibra aventuras"),
]

SHAPES_NUMS = [
    ("el triangulo", "tiene tres lados", "porque señala caminos en el cuaderno"),
    ("el cuadrado", "tiene cuatro lados iguales", "porque es estable como silla"),
    ("el circulo", "es redondo sin esquinas", "porque es un punto de paseo redondo"),
    ("el pentagono", "tiene cinco lados", "porque choca esos cinco"),
    ("el hexagono", "tiene seis lados", "porque es figura favorita de la abeja"),
    ("el ovalo", "parece huevo", "porque abraza ideas suaves"),
    ("el numero uno", "empieza a contar", "porque invita al equipo a empezar"),
    ("el numero dos", "es par pequeño", "porque busca companero"),
    ("el numero tres", "sigue al dos", "porque forma triangulos de amigos"),
    ("el numero cuatro", "parece silla", "porque ofrece asiento estable"),
    ("el numero cinco", "iguala los dedos de una mano", "porque choca esos cinco"),
    ("el numero seis", "es mitad de doce", "porque a veces mira al nueve de cabeza"),
    ("el numero siete", "sigue al seis", "porque se comio al nueve en el chiste clasico"),
    ("el numero ocho", "parece dos circulos", "porque usa cinturon como el cero dijo"),
    ("el numero nueve", "antes del diez", "porque a veces se pone de cabeza"),
    ("el numero diez", "completa la decena", "porque siempre esta completo"),
    ("el cero", "vale nada solo y mucho acompanando", "porque sin el no hay diez"),
    ("el infinito", "no termina", "porque se parece al ocho de lado"),
]

BODY_HOME = [
    ("los ojos", "sirven para ver", "porque descubren arcoiris"),
    ("la nariz", "sirve para oler", "porque encuentra pan recien horneado"),
    ("los oidos", "sirven para oir", "porque escuchan el recreo"),
    ("las manos", "sirven para escribir y aplaudir", "porque celebran logros"),
    ("los pies", "sirven para correr", "porque patean balones con alegria"),
    ("los dientes", "sirven para masticar", "porque brillan en la sonrisa"),
    ("el corazon", "late en el pecho", "porque guarda logros"),
    ("la sonrisa", "curva la boca", "porque contagia recreos"),
    ("el abrazo", "aprieta con cariño", "porque es juego sin reglas"),
    ("los zapatos", "van en los pies", "porque conocen caminos"),
    ("la gorra", "va en la cabeza", "porque tapa el sol del patio"),
    ("la bufanda", "abriga el cuello", "porque da calor de mañana"),
    ("el pijama", "se usa para dormir", "porque invita a sueños buenos"),
    ("el paraguas", "tapa la lluvia", "porque trabaja cuando llueve"),
    ("el jabon", "hace espuma", "porque limpia manos y humores"),
    ("el cepillo de dientes", "limpia la boca", "porque visita diario a los dientes"),
    ("la toalla", "seca el cuerpo", "porque abraza despues del baño"),
    ("el espejo", "refleja la cara", "porque muestra sonrisas"),
    ("la almohada", "suaviza la cabeza", "porque guarda sueños"),
    ("la cobija", "abriga en la cama", "porque tapa hasta la nariz"),
    ("el despertador", "suena temprano", "porque despierta aventuras"),
    ("la ventana", "deja entrar sol", "porque encuadra nubes"),
    ("la puerta", "se abre con llave", "porque invita a entrar a aprender"),
    ("la escalera", "tiene peldaños", "porque sube metas paso a paso"),
    ("la nevera", "enfría alimentos", "porque sostiene dibujos con imanes"),
    ("la escoba", "barre el piso", "porque limpia el escenario del juego"),
    ("la matera", "guarda tierra y planta", "porque es cuna de semillas"),
    ("la regadera", "riega plantas", "porque da lluvia de bolsillo"),
]

PLACES = [
    ("la escuela", "lugar de aprender", "porque llena mochilas de ideas"),
    ("el parque", "lugar de columpios", "porque premia el juego limpio"),
    ("la biblioteca", "lugar de libros", "porque presta aventuras"),
    ("el museo", "lugar de dinosaurios", "porque guarda asombros"),
    ("el zoologico", "lugar de animales cuidados", "porque enseña respeto"),
    ("el huerto", "lugar de siembra escolar", "porque cosecha paciencia"),
    ("el patio", "lugar de recreo", "porque celebra cuando llegan los niños"),
    ("la playa", "lugar de arena y olas", "porque invita a saltar espuma"),
    ("la cocina", "lugar de olores ricos", "porque mezcla cariño y sarten"),
    ("el salon", "lugar de pupitres", "porque escucha preguntas"),
    ("la feria escolar", "lugar de proyectos", "porque muestra inventos"),
    ("el gimnasio", "lugar de deporte", "porque hace rebotar ecos de ja"),
]

def add_entity_items(p: Pool, bank, topic_label):
    for name, clue, joke_why in bank:
        ans = name[0].upper() + name[1:] + "."
        p.add("riddle", f"Adivina: {clue}.", ans)
        p.add("riddle", f"¿Quien soy? {clue.capitalize()}.", ans)
        p.add("joke", f"¿Por que sonrie {name} en la escuela?", joke_why[0].upper() + joke_why[1:] + ".")
        p.add("joke", f"¿Que le dice {name} al recreo?", f"¡Gracias, recreo! Me siento un {topic_label} feliz: {name}.")
        p.add("joke", f"¿Por que {name} aplaude en clase?", f"Porque descubrio que {clue}.")
        p.add("joke", f"¿Como saluda {name} por la manana?", f"Con una sonrisa de {topic_label}.")

def add_dialog_jokes(p: Pool):
    pairs = [
        (("el lapiz", "el papel"), "Juntos hacemos historias."),
        (("el sol", "la luna"), "Tu de dia, yo de noche: buen equipo."),
        (("el cero", "el ocho"), "Que bello cinturon tienes."),
        (("el nueve", "el seis"), "Por que estas de cabeza."),
        (("la cuchara", "el tenedor"), "Juntos somos buen equipo de mesa."),
        (("el zapato", "la media"), "Sin ti no doy un paso."),
        (("el imán", "el clip"), "Ven, que hay atraccion escolar."),
        (("la abeja", "la flor"), "Gracias por el nectar y el color."),
        (("el libro", "la mochila"), "Hoy nos leen."),
        (("la merienda", "la lonchera"), "Abreme, tengo hambre de recreo."),
        (("el balon", "el pie"), "Pateame con alegria."),
        (("el diente", "el cepillo"), "Gracias por la visita diaria."),
        (("la semilla", "la tierra"), "Gracias por cuidarme."),
        (("el tren", "el tunel"), "Gracias por el atajo fresco."),
        (("el globo", "el hilo"), "No me sueltes en la fiesta."),
        (("el marcador", "la pizarra"), "Escribeme algo bueno hoy."),
        (("el recreo", "el timbre"), "Ya voy, cinco minutos mas."),
        (("el chocolate", "la arepa"), "Juntos somos desayuno feliz."),
        (("una hoja de arbol", "un cuaderno"), "Somos primas de papel."),
        (("un triangulo", "un cuadrado"), "Tu tienes un lado mas: que suerte."),
        (("un pez", "una pecera limpia"), "Que dia tan claro."),
        (("un zapato izquierdo", "el derecho"), "Somos el par perfecto."),
        (("una nube", "un avion"), "Pasa con cuidado, voy esponjada."),
        (("un boton", "otro boton"), "Que bien nos vemos cosidos."),
        (("una estrella", "otra estrella"), "Salimos a brillar esta noche."),
        (("un arbol", "otro arbol"), "Que pasa, tronco."),
        (("una pared", "otra pared"), "Nos vemos en la esquina."),
        (("un semaforo", "otro semaforo"), "No me mires, me estoy cambiando."),
        (("un ojo", "otro ojo"), "Entre nosotros esta la nariz."),
        (("un rayo", "otro rayo"), "Me caes electrizante."),
        (("un pez globo", "un globo de fiesta"), "Somos primos hinchados de alegria."),
        (("un hexagono", "un circulo"), "Yo tengo mas lados para dar."),
        (("un numero primo", "otro"), "Somos pocos, pero unicos."),
        (("un clip", "una hoja"), "Te sostengo, no te sueltes."),
        (("un diente", "otro diente"), "Nos vemos en la sonrisa."),
        (("un lapiz corto", "uno largo"), "Lo importante es dejar huella."),
        (("un arbol joven", "uno viejo"), "Cuentame tus anillos."),
        (("una media", "un pie"), "Contigo voy a todas partes."),
        (("un iman", "otro iman"), "Somos polos que se atraen a estudiar."),
        (("un cero", "el diez"), "Gracias por incluirme."),
        (("el uno", "el cien"), "Que lejos llegaste sumando amigos."),
        (("el dos", "el cuatro"), "Eres el doble de divertido."),
        (("el tres", "el seis"), "Eres mi doble divertido."),
        (("el cinco", "el diez"), "Eres mi doble de fiesta."),
        (("el cuatro", "el ocho"), "Creces duplicandote de risa."),
        (("el ocho", "el infinito"), "Que parecidos somos de lado."),
        (("un borrador", "un error"), "No te preocupes: aprendimos."),
        (("un pupitre", "una silla"), "Gracias por acompañarme en clase."),
        (("un tren", "otro tren"), "Nos vemos en la proxima via."),
        (("una flor", "un colibri"), "Bienvenido al nectar."),
        (("un paraguas", "la lluvia"), "Los niños saltan charcos gracias a ti."),
        (("un globo", "el viento"), "Llevame alto, pero con cuidado."),
        (("un balon desinflado", "el inflador"), "Devuelveme el animo."),
        (("un cuaderno lleno", "uno vacio"), "Pronto te llenaras de aventuras."),
        (("una nube gris", "una blanca"), "Hoy toca lluvia; mañana, sol."),
        (("un zapato de lluvia", "un charco"), "Hoy somos equipo."),
        (("un iman", "un clip timido"), "Ven, no muerdo: solo atraigo."),
        (("un triangulo", "un compas"), "Dibujame con cariño."),
        (("un lapiz", "un examen corto"), "Vamos con calma y claridad."),
        (("un boton", "una camisa"), "Sin mi te abres demasiado al viento."),
        (("una arepa", "un tequeño"), "Somos el equipo dorado del recreo."),
        (("un hexagono", "una abeja"), "Tu casa es mi figura favorita."),
        (("un pez", "un submarino de juguete"), "Carrera hasta la roca."),
        (("un diente", "el hilo dental"), "Gracias por el abrazo diario."),
        (("un sol", "un girasol"), "Gracias por seguirme."),
        (("un sol", "un paraguas"), "Hoy descanso; tu brillas cuando llueve."),
        (("la luna", "el despertador"), "Yo cuido la noche; tu, la mañana."),
        (("el recreo", "la tarea"), "Despues de mi, tu tambien brillas."),
        (("el recreo", "la risa"), "Sin ti no soy recreo."),
        (("el recreo", "el viernes"), "Eres mi favorito, casi tanto como yo."),
        (("el lunes", "el uniforme"), "Listos para un gran comienzo."),
        (("el viernes", "la mochila"), "Un dia mas y a descansar un poquito."),
        (("la mochila", "el cuaderno nuevo"), "Bienvenido al equipo del año."),
        (("la pizarra limpia", "el dia"), "Estoy lista para ideas nuevas."),
        (("una nota musical", "otra"), "Juntemos una melodia."),
        (("un abrigo", "el perchero"), "Gracias por cuidarme en clases."),
        (("un faro", "los barcos de juguete"), "Luz de bienvenida."),
        (("un crayón", "el arcoiris"), "Eres mi modelo a seguir."),
        (("un libro cerrado", "uno abierto"), "Cuentame que viste adentro."),
        (("un marcador de colores", "otro"), "Hoy pintamos ideas, no paredes."),
        (("un cuaderno de dibujo", "uno de matematicas"), "Tu calculas; yo ilustro: equipo."),
        (("un cero", "una meta"), "Empecemos de aqui con ganas."),
        (("un autobus", "el primer niño"), "Sube: la aventura escolar empieza."),
        (("un balon", "el equipo"), "Pasesmonos la alegria."),
        (("un arcoiris", "el sol"), "Gracias por aparecer despues de la lluvia."),
        (("un cuaderno", "un boligrafo"), "Escribe claro: quiero entenderme mañana."),
        (("un iman", "un dia dificil"), "Atraigamos algo bueno."),
        (("la luna", "el niño madrugador"), "Aun brillo un poquito para ti."),
        (("un jabon", "un cepillo"), "La sonrisa limpia es en equipo."),
        (("un zapato", "otro al guardar"), "Mision recreo cumplida."),
        (("un pez", "el filtro del acuario"), "Gracias por el agua clara de ideas."),
        (("el uno", "el equipo"), "Empezamos juntos."),
        (("el patio", "el balon perdido"), "Aqui estoy: buscale a tus amigos."),
        (("un globo", "el pastel"), "Hoy celebramos el mismo aire de fiesta."),
        (("un mapa enrollado", "el explorador"), "Me guardo hasta la proxima exploracion."),
        (("un robot", "un aplauso"), "Guardo el sonido como bateria extra."),
        (("un lapiz", "el margen"), "Dejame un poquito de aire para pensar."),
        (("una semilla", "el regador"), "Un poquito cada dia, gracias."),
        (("un caballo", "una medalla de carton"), "Relincho de orgullo escolar."),
        (("un pingüino", "una bufanda de juguete"), "Me rio: ya traigo esmoquin."),
        (("un diente sano", "un caramelo"), "De vez en cuando, y luego cepillado."),
        (("un robot", "al apagarse"), "Modo sueño: buenas noches."),
        (("el recreo", "el abrazo"), "Eres el mejor juego sin reglas."),
        (("un lapiz", "un error borrado"), "Celebramos porque aprender incluye corregir."),
        (("una abeja", "una flor de papel"), "Sonrio: igual celebro el color."),
        (("un mapa del barrio", "una casa marcada"), "Ahi empieza cada aventura escolar."),
        (("un pez bibliotecario", "el silencio"), "Pido silencio bajo el agua."),
        (("un delfin", "un diploma de cartulina"), "Lo salpico de orgullo."),
        (("un tren de juguete", "las curvas"), "Amo las vueltas felices."),
        (("una calculadora", "el final del problema"), "Igual de alegria."),
        (("un jabon", "la fiesta del baño"), "Sin mi no hay espuma de celebracion."),
        (("un buho", "una lista de utiles"), "La reviso dos veces."),
        (("un niño", "un puente dibujado"), "Uno ideas de un lado al otro."),
        (("un caracol", "el grupo de estudio"), "Lento, pero nadie se queda atras."),
        (("un sol", "las estrellas"), "Cada uno tiene su turno de brillar."),
        (("un robot", "un choca esos cinco"), "Ajusto la fuerza a modo suave."),
        (("un marcador permanente", "la cartulina"), "Trazo firme y cariño."),
        (("el recreo", "un chiste corto"), "La risa tambien es actividad del dia."),
    ]
    for (a, b), punch in pairs:
        p.add("joke", f"¿Que le dice {a} a {b}?", punch)

def add_classic_and_misc(p: Pool):
    classics = [
        ("joke", "¿Por que el libro de matematicas esta triste?", "Porque tenia demasiados problemas."),
        ("joke", "¿Que hace un pez todo el dia?", "Nada."),
        ("joke", "¿Por que el perro se sento a la sombra?", "Porque no queria ser un perro caliente."),
        ("joke", "¿Por que las focas miran hacia arriba?", "Porque ahi estan los focos."),
        ("joke", "¿Por que el tomate se puso rojo?", "Porque se sonrojo al ver al ketchup."),
        ("joke", "¿Que hace una abeja en el gym?", "Zumba."),
        ("joke", "¿Por que los peces no juegan tenis?", "Porque les da miedo la red."),
        ("joke", "¿Por que el seis teme al siete?", "Porque el siete se comio al nueve."),
        ("joke", "¿Como se llama un bumeran que no vuelve?", "Un palo."),
        ("joke", "¿Que animal salta mas alto que una casa?", "Todos: las casas no saltan."),
        ("joke", "¿Cual es el animal mas antiguo?", "La cebra, porque esta en blanco y negro."),
        ("joke", "¿Por que el pan fue al medico?", "Porque se sentia hecho migas."),
        ("joke", "¿Por que el mago hizo bien la tarea?", "Porque estaba encantado de estudiar."),
        ("joke", "¿Que le dice el mar a la playa?", "Nada… solo olas."),
        ("joke", "Maestra: ¿quien invento la lampara?", "Alumno: Un genio."),
        ("joke", "¿Como se despiden los peces?", "Agua-go."),
        ("joke", "¿Como sabe el arbol la hora?", "Mira sus anillos."),
        ("joke", "¿Por que el helado se fue de la fiesta?", "Porque se derretia de la emocion."),
        ("joke", "¿Cual es la fruta mas divertida?", "La naranja ja-ja-ja."),
        ("joke", "¿Que animal es bueno en beisbol?", "El murcielago: bate."),
        ("joke", "¿Cual es la planta mas matematica?", "La que tiene raices cuadradas."),
        ("joke", "¿Como saluda un iman?", "Atraido de conocerte."),
        ("joke", "Maestra: define circulo.", "Alumno: un punto que se fue de paseo redondo."),
        ("joke", "¿Cual es el colmo de un despertador?", "Que se duerma y no suene."),
        ("joke", "¿Por que el pez no usa paraguas?", "Porque ya esta mojado."),
        ("joke", "¿Cual es la letra mas redonda?", "La O: parece un lago."),
        ("joke", "Maestra: ¿que es un sinonimo?", "Alumno: una palabra que se lleva bien con otra."),
        ("joke", "¿Cual es el colmo de un mapamundi?", "Perder el norte."),
        ("joke", "¿Como se rie un eco?", "Ja ja… ja ja."),
        ("joke", "¿Por que el cero es importante?", "Porque sin el no hay diez."),
        ("joke", "¿Como se despide una estrella fugaz?", "Deseen algo bueno."),
        ("joke", "¿Cual es el colmo de un pez payaso?", "Ponerse serio."),
        ("joke", "¿Cual es el animal que mejor guarda secretos?", "El pez, porque esta callado bajo el agua."),
        ("joke", "¿Cual es el colmo de un globo de fiesta?", "Querer ser cometa."),
        ("joke", "¿Cual es el colmo de un reloj digital?", "Perder un segundo de recreo."),
        ("joke", "¿Cual es el colmo de un pez en bicicleta?", "Preferir nadar."),
        ("joke", "¿Cual es el colmo de un papalote?", "Querer ser avion y seguir feliz en el viento."),
        ("joke", "¿Cual es el colmo de un pez globo hinchado?", "Tener que deshincharse para pasar la puerta."),
        ("joke", "¿Cual es el colmo de un despertador del lunes?", "Sonar con ritmo de tambor."),
        ("joke", "¿Cual es el colmo de un pez matematico?", "Contar burbujas hasta mil."),
        ("joke", "¿Cual es el colmo de un caracol mensajero?", "Entregar la carta mañana."),
        ("joke", "¿Cual es el colmo de un pez bibliotecario?", "Pedir silencio bajo el agua."),
        ("joke", "¿Cual es el colmo de un pez relojero?", "Medir el tiempo en burbujas."),
        ("joke", "¿Cual es el colmo de un reloj de arena del recreo?", "Que se acaben los granos demasiado rapido."),
        ("joke", "¿Cual es el colmo de un globo terraqueo?", "Marearse al girar y seguir enseñando."),
        ("joke", "¿Cual es el colmo de un borrador?", "Borrar demasiado y pedir disculpas."),
        ("riddle", "Blanco por dentro, verde por fuera. Si quieres que te lo diga, espera.", "La pera."),
        ("riddle", "Agua pasa por mi casa, cate de mi corazon.", "El aguacate."),
        ("riddle", "Oro parece, plata no es.", "El platano."),
        ("riddle", "Tiene dientes y no come; tiene cabeza y no es persona.", "El ajo."),
        ("riddle", "Verde por fuera, rojo por dentro, pepitas negras.", "La sandia."),
        ("riddle", "Numero de dedos de una mano.", "Cinco."),
        ("riddle", "Huevos de una docena.", "Doce."),
        ("riddle", "Mitad de diez.", "Cinco."),
        ("riddle", "Doble de cuatro.", "Ocho."),
        ("riddle", "Minutos de un cuarto de hora.", "Quince."),
        ("riddle", "Dia despues del lunes.", "El martes."),
        ("riddle", "Dia antes del domingo.", "El sabado."),
        ("riddle", "Primera letra del abecedario.", "La A."),
        ("riddle", "Ultima letra del abecedario.", "La Z."),
        ("riddle", "Vocal redonda.", "La O."),
        ("riddle", "Mes de las flores y mama.", "Mayo."),
        ("riddle", "Mitad de una docena.", "Seis."),
        ("riddle", "Triple de tres.", "Nueve."),
        ("riddle", "Numero que sigue al nueve.", "El diez."),
    ]
    for kind, s, punch in classics:
        p.add(kind, s, punch)

def add_why_variants(p: Pool):
    subjects = [
        ("el lapiz", [
            ("fue al examen", "porque queria sacar punta a sus ideas"),
            ("ama los lunes", "porque empieza una pagina nueva"),
            ("no miente", "porque todo lo que escribe se puede leer"),
            ("no se rinde", "porque aunque se acorte sigue escribiendo"),
            ("visito al sacapuntas", "para recuperar la punta de las ideas"),
            ("visito el estuche", "porque hasta los heroes necesitan casa"),
            ("amo el recreo", "porque hasta escribir necesita pausa"),
            ("no pelea con la goma", "porque el equipo corrige mejor"),
            ("no viaja solo", "porque siempre va con papel o idea"),
            ("celebro un error borrado", "porque aprender incluye corregir"),
        ]),
        ("el niño", [
            ("le hablo a su planta", "porque crece con cariño y agua"),
            ("llevo un iman a matematicas", "para atraer buenas respuestas"),
            ("aplaudio en ciencias", "porque el experimento salio redondo"),
            ("compartio su crayon", "porque los colores se disfrutan en equipo"),
            ("dibujo un corazon en matematicas", "porque sumo cariño a los numeros"),
            ("miro las nubes", "porque estudiaban el agua del cielo"),
            ("planto un frijol", "para ver la vida crecer"),
            ("llevo una lupa al patio", "para ver hormigas y maravillas"),
            ("compartio su merienda", "porque un buen recreo se disfruta en dos"),
            ("dibujo un diez", "porque soño con dar lo mejor"),
            ("abrazó su mochila", "porque cargaba sus logros del dia"),
            ("guardo silencio diez segundos", "para oir su propia idea genial"),
            ("miro el cielo en el recreo", "para buscar formas en las nubes"),
            ("puso fecha al dibujo", "para recordar el dia feliz"),
            ("aplaudio su propio esfuerzo", "porque el animo tambien se practica"),
            ("midio su planta cada semana", "para celebrar cada centimetro de vida"),
            ("recogio su basura del patio", "porque el planeta tambien es compañero"),
            ("dijo gracias al maestro", "porque aprender tambien es un regalo"),
            ("compartio su regla", "porque medir juntos es mas justo"),
            ("practico lectura en voz alta", "para que las palabras salieran a pasear"),
            ("escribio su nombre con orgullo", "porque cada trabajo tiene autor feliz"),
            ("soplo las velas con cuidado", "porque los deseos necesitan aire suave"),
            ("ordeno su estuche", "para encontrar cada idea a tiempo"),
            ("levanto la mano", "porque su idea queria salir a la luz"),
            ("midio su salto", "para batir su propio record amable"),
            ("cuido el libro de la biblioteca", "porque otro niño tambien quiere leerlo"),
            ("dibujo a su familia", "porque el hogar tambien cabe en una hoja"),
            ("dibujo un puente", "para unir ideas de un lado al otro"),
            ("termino con sonrisa", "porque terminar tambien se celebra"),
        ]),
        ("el robot", [
            ("saco buena nota", "porque tenia circuitos de estudio y bateria completa"),
            ("no usa borrador", "porque corrige con deshacer amable"),
            ("no se aburre", "porque siempre hay nuevas instrucciones de juego"),
            ("choco esos cinco", "porque celebrar tambien se programa"),
            ("midio el recreo", "para no perder ni un segundo de juego"),
            ("guardo el chiste en memoria", "para contarlo si alguien se lo pierde"),
        ]),
        ("el patio", [
            ("celebra", "porque llegaron los niños"),
            ("prefiere risas", "porque las risas hacen mas grande el juego"),
            ("no cuenta secretos", "porque prefiere juegos abiertos"),
            ("pidio un minuto de silencio", "para oir a los pajaros y volver a jugar"),
            ("premia el juego limpio", "porque ganar amigos vale mas que ganar solo"),
            ("invento el choca esos cinco", "para celebrar sin palabras"),
        ]),
    ]
    for subj, variants in subjects:
        for setup_tail, punch in variants:
            p.add("joke", f"¿Por que {subj} {setup_tail}?", punch[0].upper() + punch[1:] + ".")


def add_more_riddles(p: Pool):
    # Unique clue/answer pairs from many domains
    more = []
    colors = [('rojo','la manzana madura y el corazon dibujado'),('azul','el cielo y el crayon del mar'),('verde','la grama y la hoja'),('amarillo','el sol y el cambur'),('naranja','la zanahoria y la naranja'),('morado','la uva y el crayon de reyes'),('blanco','la nube y la leche'),('negro','la noche y el crayon de contorno'),('rosado','el flamenco y un globo de fiesta'),('cafe','la tierra y el chocolate')]
    for color, uses in colors:
        more.append((f'Color de {uses}.', f'El {color}.' if color != 'cafe' else 'El cafe.'))
        more.append((f'Soy el color {color}. ¿Que color soy?', f'El {color}.'))
    days = [('lunes','primer dia escolar'),('martes','despues del lunes'),('miercoles','mitad de la semana escolar'),('jueves','antes del viernes'),('viernes','ultimo dia escolar tipico'),('sabado','antes del domingo'),('domingo','dia de descanso familiar')]
    for d, clue in days:
        more.append((f'Dia de la semana: {clue}.', f'El {d}.'))
    months = [('enero','empieza el año'),('febrero','tiene dia del cariño escolar'),('marzo','llega con brisa'),('abril','trae lluvias suaves'),('mayo','mes de mama y flores'),('junio','cierra el año escolar en muchos sitios'),('julio','vacaciones a veces'),('agosto','sol fuerte'),('septiembre','vuelta a clases en muchos sitios'),('octubre','colores de otoño en otros paises'),('noviembre','casi fin de año'),('diciembre','fiestas y hallacas')]
    for m, clue in months:
        more.append((f'Mes que {clue}.', m[0].upper()+m[1:]+'.'))
    sports = [('el futbol','se patea al arco'),('el baloncesto','se encesta en aro alto'),('el tenis','usa raqueta'),('la natacion','se practica en el agua'),('el atletismo','incluye carrera y salto'),('el voleibol','se golpea por encima de la red'),('el beisbol','usa bate y guante'),('el ciclismo','usa bicicleta'),('el salto de cuerda','usa cuerda en el patio'),('el ajedrez','usa tablero de 64 casillas')]
    for name, clue in sports:
        more.append((f'Deporte o juego: {clue}.', name[0].upper()+name[1:]+'.'))
    instruments = [('la guitarra','cuerdas y caja'),('el piano','teclas blancas y negras'),('el tambor','se golpea redondo'),('la flauta','se sopla'),('el violin','se toca con arco'),('la trompeta','brilla y se sopla fuerte'),('el xilofono','barras de colores que se golpean'),('la maraca','se agita y suena'),('el triangulo musical','barra en forma de triangulo'),('el pandero','aro con sonajas')]
    for name, clue in instruments:
        more.append((f'Instrumento: {clue}.', name[0].upper()+name[1:]+'.'))
    clothes = [('la camisa','cubre el torso'),('el pantalon','cubre las piernas'),('el cinturon','sujeta la cintura'),('las medias','van dentro del zapato'),('las botas','calzado de lluvia'),('los guantes','abrigan las manos'),('los lentes de sol','protegen los ojos'),('el impermeable','tapa la lluvia en el cuerpo'),('la chaqueta','abrigan el pecho'),('las chancletas','sandalias de casa')]
    for name, clue in clothes:
        more.append((f'Prenda o accesorio: {clue}.', name[0].upper()+name[1:]+'.'))
    kitchen = [('el plato','base del almuerzo'),('el vaso','sirve el jugo'),('la cuchara','para la sopa'),('el tenedor','para la pasta'),('el cuchillo de mesa','parte suave con adulto'),('la sarten','frie con cuidado de adulto'),('la olla','hierve pasta'),('la nevera','enfría comida'),('el horno','calienta pizza con adulto'),('la servilleta','limpia la boca')]
    for name, clue in kitchen:
        more.append((f'En la cocina o mesa: {clue}.', name[0].upper()+name[1:]+'.'))
    body = [('la cabeza','piensa y lleva gorra'),('el brazo','lanza el balon'),('la pierna','corre en el patio'),('la boca','sonrie y habla'),('la lengua','prueba sabores'),('el cuello','lleva bufanda'),('la espalda','carga la mochila'),('el estomago','espera la merienda'),('la rodilla','se dobla al saltar'),('el codo','se dobla al escribir')]
    for name, clue in body:
        more.append((f'Parte del cuerpo: {clue}.', name[0].upper()+name[1:]+'.'))
    weather = [('el trueno','ruido del cielo con lluvia suave'),('el relampago','luz rapida en la tormenta'),('la llovizna','lluvia menudita'),('el aguacero','lluvia fuerte breve'),('la brisa','viento suave'),('la niebla','nube baja que tapa un poco'),('el rocío','gotitas en la grama temprano'),('el arcoiris','puente de colores'),('el granizo','bolitas de hielo raras'),('el calor','hace sudar en el recreo')]
    for name, clue in weather:
        more.append((f'Clima o fenomeno: {clue}.', name[0].upper()+name[1:]+'.'))
    school2 = [('el recreo','pausa para jugar'),('la tarea','practica en casa'),('el examen corto','prueba breve'),('la fila','orden para entrar'),('el permiso','pedir para ir al baño'),('la merienda','comida del recreo'),('el uniforme','ropa escolar'),('la asistencia','lista de presentes'),('el recreo lluvioso','juego bajo techo'),('la feria de ciencias','muestra experimentos')]
    for name, clue in school2:
        more.append((f'En la escuela: {clue}.', name[0].upper()+name[1:]+'.'))
    nums = [(1,'uno'),(2,'dos'),(3,'tres'),(4,'cuatro'),(5,'cinco'),(6,'seis'),(7,'siete'),(8,'ocho'),(9,'nueve'),(10,'diez'),(11,'once'),(12,'doce'),(15,'quince'),(20,'veinte'),(30,'treinta'),(50,'cincuenta'),(100,'cien')]
    for n, word in nums:
        more.append((f'Numero: {n}. ¿Como se llama?', word[0].upper()+word[1:]+'.'))
        more.append((f'¿Cuanto es {n}?', str(n)+'.'))
    letters = list('ABCDEFGHIJKLMNOPQRSTUVWXYZ')
    for ch in letters:
        more.append((f'Letra del abecedario: {ch}.', f'La {ch}.'))

    fillers = [
        ('Sirvo para abrochar la camisa.', 'El boton.'),
        ('Cierro la chaqueta con dientes.', 'La cremallera.'),
        ('Atan el zapato.', 'Los cordones.'),
        ('Soy elastica en el cabello.', 'La liga.'),
        ('Junto hojas sueltas.', 'El clip.'),
        ('Pego transparente.', 'La cinta adhesiva.'),
        ('Soy material de la moneda.', 'El metal.'),
        ('Soy material del lapiz.', 'La madera.'),
        ('Soy transparente en la ventana.', 'El vidrio.'),
        ('Soy de la libreta.', 'El papel.'),
        ('Soy de la franela.', 'La tela.'),
        ('Soy de la botella reciclable.', 'El plastico.'),
        ('Subo y bajo en edificios.', 'El ascensor.'),
        ('Miras la calle desde mi.', 'El balcon.'),
        ('Plantas detras de la casa.', 'El jardin.'),
        ('Barro el piso.', 'La escoba.'),
        ('Limpio el piso mojado.', 'El trapeador.'),
        ('Guardo la basura.', 'El cesto.'),
        ('Hielo triturado con sabor.', 'El raspado.'),
        ('Chocolate en leche caliente.', 'El chocolate caliente.'),
        ('Panecito dulce del recreo.', 'La galleta.'),
        ('Fruta curva amarilla.', 'El cambur.'),
        ('Ave del hielo con esmoquin.', 'El pinguino.'),
        ('Felino con melena.', 'El leon.'),
        ('Felino con rayas.', 'El tigre.'),
        ('Ave que habla a veces.', 'El loro.'),
        ('Insecto que hace miel.', 'La abeja.'),
        ('Insecto de luz nocturna.', 'La luciernaga.'),
        ('Reptil que cambia color.', 'El camaleon.'),
        ('Mamifero que salta con bolsa.', 'El canguro.'),
        ('Planeta donde vivimos.', 'La Tierra.'),
        ('Astro del dia.', 'El sol.'),
        ('Astro de la noche.', 'La luna.'),
        ('Puente de colores del cielo.', 'El arcoiris.'),
        ('Compañera oscura al sol.', 'La sombra.'),
        ('Sonido repetido en la montana.', 'El eco.'),
        ('Gas que respiramos.', 'El oxigeno.'),
        ('Liquido que bebemos.', 'El agua.'),
        ('Semilla que se vuelve planta.', 'La semilla.'),
        ('Raiz bajo tierra.', 'La raiz.'),
    ]
    more.extend(fillers)

    for clue, ans in more:
        p.add('riddle', f'Adivina: {clue}', ans)
        p.add('riddle', f'¿Que es? {clue}', ans)

def add_action_riddles(p: Pool):
    actions = [
        ("Sirvo para escribir y tengo punta.", "El lapiz."),
        ("Borro lo escrito con grafito.", "El borrador."),
        ("Mido lineas rectas.", "La regla."),
        ("Recorto figuras de papel.", "La tijera."),
        ("Pego hojas y manualidades.", "El pegamento."),
        ("Viajo en la espalda llena de libros.", "La mochila."),
        ("Guardo la merienda del recreo.", "La lonchera."),
        ("Sueno cuando termina el recreo.", "El timbre."),
        ("El maestro escribe sobre mi.", "La pizarra."),
        ("Cargo historias en paginas.", "El libro."),
        ("Tengo teclas para escribir.", "El teclado."),
        ("Muestro dibujos en pantalla.", "El monitor."),
        ("Atraigo clips metalicos.", "El iman."),
        ("Agrand o lo pequeño.", "La lupa."),
        ("Giro y muestro oceanos.", "El globo terraqueo."),
        ("Vuelo con dos ruedas y pedales.", "La bicicleta."),
        ("Vuelo alto con pasajeros.", "El avion."),
        ("Surco el mar con proa.", "El barco."),
        ("Corro sobre rieles.", "El tren."),
        ("Apago incendios con manguera.", "El camion de bomberos."),
        ("Llevo enfermos con cuidado.", "La ambulancia."),
        ("Soy amarillo y llevo estudiantes.", "El autobus escolar."),
        ("Tengo luces rojo amarillo y verde.", "El semaforo."),
        ("Tengo rayas para cruzar.", "El paso de cebra."),
        ("Me balanceo adelante y atras.", "El columpio."),
        ("Resbalo desde lo alto.", "El tobogan."),
        ("Uno sube y el otro baja.", "El sube y baja."),
        ("Me patea al arco.", "El balon de futbol."),
        ("Me encestan en un aro alto.", "El baloncesto."),
        ("Me golpean con raqueta.", "El tenis."),
        ("Me saltan en el patio.", "La cuerda."),
        ("Tengo cuerdas y caja de resonancia.", "La guitarra."),
        ("Tengo teclas blancas y negras.", "El piano."),
        ("Marco el ritmo redondo.", "El tambor."),
        ("Suelo al soplar en el coro.", "La flauta."),
        ("Curo personas.", "El medico."),
        ("Enseño en el salon.", "El maestro."),
        ("Horneo pan.", "El panadero."),
        ("Apago el fuego.", "El bombero."),
        ("Cuido dientes.", "El dentista."),
        ("Siembro en el campo.", "El agricultor."),
        ("Conduzco el autobus.", "El conductor."),
        ("Cocino platos ricos.", "El cocinero."),
        ("Pinto con pincel.", "El pintor."),
        ("Toco musica.", "El musico."),
        ("Arreglo tuberias.", "El plomero."),
        ("Reparo luces.", "El electricista."),
        ("Corto el cabello.", "El peluquero."),
        ("Pesco con caña.", "El pescador."),
        ("Construyo paredes.", "El albañil."),
        ("Brillo de noche en el cielo.", "La estrella."),
        ("Ilumino redonda de noche.", "La luna."),
        ("Caliento de dia.", "El sol."),
        ("Caigo en gotitas.", "La lluvia."),
        ("Muestro siete colores despues de llover.", "El arcoiris."),
        ("Hago sombra en el patio.", "El arbol."),
        ("Huelo rico en el jardin.", "La flor."),
        ("Cubro verde el parque.", "La grama."),
        ("Floto esponjada.", "La nube."),
        ("Corro entre piedras al mar.", "El rio."),
        ("Estoy quieto como espejo.", "El lago."),
        ("Tengo arena y olas.", "La playa."),
        ("Soy alta para mirar lejos.", "La montana."),
        ("Tengo muchos arboles juntos.", "El bosque."),
        ("Tengo dunas de arena.", "El desierto."),
        ("Estoy rodeada de mar.", "La isla."),
        ("Caigo con ruido de agua.", "La cascada."),
        ("Soy hueco para explorar con linterna.", "La cueva."),
        ("Sigo al niño cuando hay sol.", "La sombra."),
        ("Repito lo que gritas en la montana.", "El eco."),
        ("Empiezo siendo pequeña y me vuelvo planta.", "La semilla."),
        ("Bebo agua bajo tierra.", "La raiz."),
        ("Soy plana y verde en la planta.", "La hoja."),
        ("Soy el gas que respiras.", "El oxigeno."),
        ("Soy el liquido que bebes.", "El agua."),
        ("Despego con cuenta regresiva.", "El cohete."),
        ("Uso casco blanco espacial.", "El astronauta."),
        ("Soy resto antiguo del museo.", "El fosil."),
        ("Me inflan en la fiesta.", "El globo."),
        ("Estoy llena de dulces colgada.", "La piñata."),
        ("Brillo en el pastel.", "La vela."),
        ("Vengo envuelto con lazo.", "El regalo."),
        ("Soy mensaje hecho a mano.", "La tarjeta."),
        ("Aprieto con brazos de cariño.", "El abrazo."),
        ("Curvo la boca de alegria.", "La sonrisa."),
        ("Voy en los pies.", "Los zapatos."),
        ("Voy en la cabeza al sol.", "La gorra."),
        ("Abrigo el cuello.", "La bufanda."),
        ("Me usan para dormir.", "El pijama."),
        ("Tapo la lluvia.", "El paraguas."),
        ("Hago espuma en la ducha.", "El jabon."),
        ("Limpio dientes.", "El cepillo de dientes."),
        ("Seco despues del baño.", "La toalla."),
        ("Reflejo caras.", "El espejo."),
        ("Suavizo la cabeza en la cama.", "La almohada."),
        ("Abrigo en la noche.", "La cobija."),
        ("Sueno temprano.", "El despertador."),
        ("Dejo entrar sol a la casa.", "La ventana."),
        ("Me abres con llave.", "La puerta."),
        ("Subes peldaño a peldaño por mi.", "La escalera."),
        ("Enfrio la leche.", "La nevera."),
        ("Barro el patio.", "La escoba."),
        ("Guardo tierra y plantas.", "La matera."),
        ("Riego a mano el jardin.", "La regadera."),
        ("Presto libros en estantes.", "La biblioteca."),
        ("Muestro dinosaurios.", "El museo."),
        ("Cuido animales para visitar.", "El zoologico."),
        ("Tengo columpios.", "El parque."),
        ("Siembro tomates escolares.", "El huerto."),
        ("Soy el lugar de pupitres.", "El salon."),
        ("Soy el lugar de recreo.", "El patio."),
    ]
    for clue, ans in actions:
        p.add("riddle", f"Adivina: {clue}", ans)
        p.add("riddle", f"¿Que soy? {clue}", ans)

def build_pool():
    p = Pool()
    add_classic_and_misc(p)
    add_dialog_jokes(p)
    add_why_variants(p)
    add_action_riddles(p)
    add_more_riddles(p)
    add_entity_items(p, ANIMALS, "animal curioso")
    add_entity_items(p, FOODS, "comida feliz")
    add_entity_items(p, SCHOOL, "util escolar")
    add_entity_items(p, NATURE, "parte de la naturaleza")
    add_entity_items(p, JOBS, "oficio util")
    add_entity_items(p, VEHICLES, "vehiculo")
    add_entity_items(p, SHAPES_NUMS, "figura o numero")
    add_entity_items(p, BODY_HOME, "parte del dia a dia")
    add_entity_items(p, PLACES, "lugar especial")
    # Extra unique riddles only (no templated celebration jokes)
    for i, (name, clue, why) in enumerate(ANIMALS + FOODS + SCHOOL + NATURE):
        p.add("riddle", f"En el dia escolar numero {i+1}, adivina: {clue}.", name[0].upper()+name[1:]+".")
        p.add("riddle", f"Pista del patio {i+1}: {clue}.", name[0].upper()+name[1:]+".")
    return p

def choose_mixed(pool: Pool):
    jokes = [x for x in pool.items if x["kind"] == "joke"]
    riddles = [x for x in pool.items if x["kind"] == "riddle"]
    # target ~550 jokes, ~450 riddles
    if len(jokes) + len(riddles) < 1000:
        raise SystemExit(f"Pool short: jokes={len(jokes)} riddles={len(riddles)} total={len(pool.items)}")
    # Prefer ~55% jokes / ~45% riddles within available counts
    need_j = min(len(jokes), max(550, 1000 - len(riddles)))
    need_r = 1000 - need_j
    if need_r > len(riddles):
        need_r = len(riddles)
        need_j = 1000 - need_r
    if need_j > len(jokes):
        need_j = len(jokes)
        need_r = 1000 - need_j
    # interleave naturally: pattern J R J R J  (3j/2r => 60/40 close to 55/45)
    out = []
    ji = ri = 0
    # Build a kind sequence with exactly need_j jokes and need_r riddles, alternating.
    kinds = []
    j_left, r_left = need_j, need_r
    prefer_joke = True
    while j_left or r_left:
        if prefer_joke and j_left:
            kinds.append("joke"); j_left -= 1
        elif r_left:
            kinds.append("riddle"); r_left -= 1
        elif j_left:
            kinds.append("joke"); j_left -= 1
        # natural alternate, but if one side runs low, keep draining the other
        if j_left and r_left:
            # bias toward remaining ratio
            prefer_joke = (j_left / (j_left + r_left)) >= 0.55
        elif j_left:
            prefer_joke = True
        else:
            prefer_joke = False
    for kind in kinds:
        if kind == "joke":
            out.append(jokes[ji]); ji += 1
        else:
            out.append(riddles[ri]); ri += 1
    return out

def main():
    pool = build_pool()
    chosen = choose_mixed(pool)
    if len(chosen) != 1000:
        raise SystemExit(f"chosen={len(chosen)}")
    result = []
    idx = 0
    for day in range(1, 201):
        day_id = f"d{day}"
        for sec in SECTIONS:
            base = chosen[idx]; idx += 1
            result.append({
                "key": f"{day_id}:{sec}",
                "dayId": day_id,
                "sectionId": sec,
                "kind": base["kind"],
                "setup": base["setup"],
                "punchline": base["punchline"],
                "locale": "es-VE",
            })
    # validate
    assert len(result) == 1000
    keys = [r["key"] for r in result]
    assert len(keys) == len(set(keys))
    expected = {f"d{d}:{s}" for d in range(1,201) for s in SECTIONS}
    assert set(keys) == expected
    for r in result:
        assert r["kind"] in ("joke", "riddle")
        assert r["punchline"]
        assert r["setup"] or r["punchline"]
        assert r["locale"] == "es-VE"
        assert not FORBIDDEN.search(r["setup"] + " " + r["punchline"])
    jc = sum(1 for r in result if r["kind"]=="joke")
    rc = sum(1 for r in result if r["kind"]=="riddle")
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {OUT} items={len(result)} jokes={jc} riddles={rc} pool={len(pool.items)}")

if __name__ == "__main__":
    main()
