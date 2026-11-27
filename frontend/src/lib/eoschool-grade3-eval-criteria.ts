export type Grade3EvalItem = {
  id: string;
  text: string;
  source: string;
};

export type Grade3EvalGroup = {
  id: string;
  title: string;
  lede: string;
  items: Grade3EvalItem[];
};

/** Strongest published grade-3 bars. Grade 4 (PIRLS, TIMSS) stays out. */
export const GRADE3_EVAL_CRITERIA: { grade: 3; groups: Grade3EvalGroup[] } = {
  grade: 3,
  groups: [
    {
      id: "lectura",
      title: "Lectura",
      lede: "Texto corto del grado, en la lengua de la escuela. El niño lee solo y también escucha.",
      items: [
        {
          id: "lec-fluidez",
          text: "Lee en voz alta un texto del grado con precisión y con un ritmo que deja entender, y se corrige cuando una palabra no encaja.",
          source: "Marco global de competencia, grado 3, y Common Core RF.3.4. El ritmo lo fija la lengua, no un número universal de palabras por minuto.",
        },
        {
          id: "lec-literal",
          text: "Localiza un dato explícito en medio del texto y lo distingue de otro dato parecido.",
          source: "ERCE 2019, 3.º, Nivel III.",
        },
        {
          id: "lec-tema",
          text: "Dice el tema aunque no esté escrito en una sola frase, cuando el texto lo muestra o lo repite.",
          source: "Marco global de competencia, grado 3, y ERCE 2019, 3.º, Nivel II.",
        },
        {
          id: "lec-resumen",
          text: "Saca las ideas principales de más de un párrafo y las resume.",
          source: "Inglaterra, Year 3.",
        },
        {
          id: "lec-personaje",
          text: "En un cuento, dice rasgos, sentimientos y motivos del personaje a partir de lo que hace, y señala la parte del texto que lo sostiene.",
          source: "Common Core RL.3.3 e Inglaterra, Year 3.",
        },
        {
          id: "lec-moraleja",
          text: "Recuenta un cuento, una fábula o un mito y dice la lección o la moraleja.",
          source: "Common Core RL.3.2.",
        },
        {
          id: "lec-figurado",
          text: "Distingue una frase literal de una que no lo es.",
          source: "Common Core RL.3.4.",
        },
        {
          id: "lec-punto-de-vista",
          text: "Separa lo que él piensa de lo que piensa el narrador o un personaje.",
          source: "Common Core RL.3.6.",
        },
        {
          id: "lec-prediccion",
          text: "Predice lo que puede seguir con un detalle dicho y con uno solo insinuado.",
          source: "Inglaterra, Year 3.",
        },
        {
          id: "lec-vocabulario",
          text: "Explica una palabra nueva con una pista del texto o con una parte de la palabra.",
          source: "Marco global de competencia, grado 3, e Inglaterra, Year 3.",
        },
        {
          id: "lec-imagen",
          text: "Explica qué añade una ilustración a lo que dicen las palabras.",
          source: "Common Core RL.3.7.",
        },
        {
          id: "lec-proposito",
          text: "Dice para qué se escribió el texto cuando el título o el orden lo dejan ver: contar, informar, pedir o instruir.",
          source: "ERCE 2019, 3.º, Nivel II.",
        },
      ],
    },
    {
      id: "escritura",
      title: "Escritura",
      lede: "Un texto a mano, para alguien, en el género que se pidió. La norma adulta no es la barra.",
      items: [
        {
          id: "esc-genero",
          text: "El texto cumple el género pedido y tiene en cuenta para quién escribe y para qué.",
          source: "ERCE 2019, dominio discursivo.",
        },
        {
          id: "esc-opinion",
          text: "En una opinión, dice lo que piensa, da razones, las une con porque, por eso o por ejemplo, y cierra.",
          source: "Common Core W.3.1.",
        },
        {
          id: "esc-informe",
          text: "En un texto informativo, presenta el tema, junta lo que va junto y usa un título o un subtítulo.",
          source: "Common Core W.3.2 e Inglaterra, Year 3.",
        },
        {
          id: "esc-cuento",
          text: "En una narración hay lugar, personajes, lo que pasa y algo de diálogo.",
          source: "Inglaterra, Year 3, y Common Core, narración de grado 3.",
        },
        {
          id: "esc-parrafo",
          text: "Agrupa las oraciones en párrafos, cada uno alrededor de una idea.",
          source: "Inglaterra, Year 3.",
        },
        {
          id: "esc-cohesion",
          text: "Se queda en el tema, la información avanza y las oraciones se conectan.",
          source: "ERCE 2019, dominio textual.",
        },
        {
          id: "esc-revision",
          text: "Relee y cambia una palabra o una oración para que se entienda mejor. Corrige la ortografía y la puntuación que ya se le enseñaron.",
          source: "Inglaterra, Year 3.",
        },
        {
          id: "esc-letra",
          text: "La letra se lee: el tamaño es parejo y las líneas no se chocan.",
          source: "Australia, Year 3, e Inglaterra, Year 3.",
        },
        {
          id: "esc-legible",
          text: "Aunque la ortografía no sea perfecta, otra persona entiende el texto sin adivinar.",
          source: "ERCE 2019, convenciones de legibilidad.",
        },
      ],
    },
    {
      id: "habla",
      title: "Habla y escucha",
      lede: "En la lengua de la escuela, de viva voz.",
      items: [
        {
          id: "hab-turno",
          text: "Escucha, espera su turno y responde a lo que dijeron, no a otra cosa.",
          source: "Australia, Year 3, e Inglaterra, Year 3.",
        },
        {
          id: "hab-pregunta",
          text: "Hace una pregunta que amplía lo que entendió.",
          source: "Inglaterra, Year 3.",
        },
        {
          id: "hab-orden",
          text: "Explica o cuenta con un orden, y puede decir también cómo se siente.",
          source: "Inglaterra, Year 3.",
        },
        {
          id: "hab-razon",
          text: "Justifica una respuesta con una razón.",
          source: "Inglaterra, Year 3.",
        },
        {
          id: "hab-registro",
          text: "Se le entiende, y no le habla igual a un adulto que a un compañero.",
          source: "Inglaterra, Year 3.",
        },
      ],
    },
    {
      id: "matematica",
      title: "Matemática",
      lede: "La barra alta de tercer grado: Australia llega a 10 000, Inglaterra pide la hora al minuto y el área, y las tablas cubren hasta 10 × 10.",
      items: [
        {
          id: "mat-10000",
          text: "Lee, escribe, compara y ordena números hasta 10 000, y dice cuánto vale cada cifra.",
          source: "Australia, Year 3. ERCE 2019, 3.º, Nivel III, llega a 9 999.",
        },
        {
          id: "mat-componer",
          text: "Arma y desarma esos números. 2 540 es 2 000 + 500 + 40.",
          source: "Australia, Year 3, y ERCE 2019, 3.º.",
        },
        {
          id: "mat-suma",
          text: "Suma y resta números de hasta tres cifras, con reagrupación, y comprueba con la operación inversa o con una estimación.",
          source: "Inglaterra, Year 3, y Cambridge Primary, Stage 3.",
        },
        {
          id: "mat-tablas",
          text: "Recuerda las tablas de multiplicar y de dividir hasta 10 × 10, incluida la del 7.",
          source: "Common Core, grado 3, dentro de 100. Cambridge Stage 3 publica las tablas salvo la del 7; el grado 3 de Common Core la incluye.",
        },
        {
          id: "mat-por",
          text: "Multiplica y divide un número de dos cifras por uno de una cifra, y resuelve un problema de grupos iguales o de un arreglo.",
          source: "Inglaterra, Year 3, y Common Core, grado 3.",
        },
        {
          id: "mat-falta",
          text: "Halla el número que falta en una suma o una resta.",
          source: "Marco global de competencia, grado 3, e Inglaterra, Year 3.",
        },
        {
          id: "mat-patron",
          text: "Dice la regla de una secuencia y completa el término que falta.",
          source: "Cambridge Primary, Stage 3, y ERCE 2019, 3.º, Nivel II.",
        },
        {
          id: "mat-fraccion",
          text: "Explica la fracción como partes iguales de un entero o de un conjunto. Identifica 1/2, 1/3, 1/4, 1/5 y 1/10.",
          source: "Cambridge Primary, Stage 3, y el marco global de competencia, grado 3.",
        },
        {
          id: "mat-mismo-denominador",
          text: "Compara fracciones unitarias y fracciones del mismo denominador. Suma y resta fracciones del mismo denominador sin pasar del entero.",
          source: "Inglaterra, Year 3, y Cambridge Primary, Stage 3.",
        },
        {
          id: "mat-decimos",
          text: "Cuenta décimos y explica que un décimo sale de dividir entre 10.",
          source: "Inglaterra, Year 3.",
        },
        {
          id: "mat-medir",
          text: "Mide, compara, suma y resta longitudes en m, cm y mm, masa en kg y g, y capacidad en l y ml. Elige la unidad.",
          source: "Inglaterra, Year 3.",
        },
        {
          id: "mat-area",
          text: "Mide el perímetro de una figura plana simple y el área de un rectángulo con unidades cuadradas, contando o multiplicando.",
          source: "Inglaterra, Year 3, y Common Core, grado 3.",
        },
        {
          id: "mat-hora",
          text: "Dice la hora al minuto en un reloj de agujas y en reloj de 12 y de 24 horas, y calcula cuánto duró algo.",
          source: "Inglaterra, Year 3.",
        },
        {
          id: "mat-dinero",
          text: "Suma y resta cantidades de dinero y da el cambio.",
          source: "Inglaterra, Year 3, y Cambridge Primary, Stage 3.",
        },
        {
          id: "mat-formas",
          text: "Nombra y describe figuras planas y cuerpos aunque estén girados. Distingue un polígono regular de uno irregular.",
          source: "Cambridge Primary, Stage 3, y el marco global de competencia, grado 3.",
        },
        {
          id: "mat-angulo",
          text: "Reconoce el ángulo recto, uno mayor y uno menor, y un par de rectas paralelas y otro de perpendiculares.",
          source: "Inglaterra, Year 3.",
        },
        {
          id: "mat-simetria",
          text: "Señala un eje de simetría en una figura.",
          source: "Australia, Year 3, y el marco global de competencia, grado 3.",
        },
        {
          id: "mat-datos",
          text: "Lee un pictograma o un gráfico de barras y responde cuántos más o cuántos menos, en un paso y en dos.",
          source: "Inglaterra, Year 3.",
        },
      ],
    },
    {
      id: "ciencias",
      title: "Ciencias",
      lede: "Lo que Inglaterra pone en Year 3 y Cambridge en Stage 3.",
      items: [
        {
          id: "cie-indagar",
          text: "Hace una pregunta que se puede investigar, compara de forma justa y anota lo que observa.",
          source: "Inglaterra, Year 3, trabajo científico.",
        },
        {
          id: "cie-informe",
          text: "Muestra el resultado en un dibujo, una tabla o un gráfico de barras, y dice una conclusión corta.",
          source: "Inglaterra, Year 3, y Cambridge Primary Science, Stage 3.",
        },
        {
          id: "cie-planta",
          text: "Dice para qué sirven la raíz, el tallo, las hojas y la flor, y qué necesita una planta para vivir.",
          source: "Inglaterra, Year 3.",
        },
        {
          id: "cie-agua",
          text: "Explica que el agua entra por la raíz y sube por el tallo.",
          source: "Cambridge Primary Science, Stage 3.",
        },
        {
          id: "cie-comida",
          text: "Dice que los animales, personas incluidas, no fabrican su alimento y necesitan el tipo y la cantidad adecuada.",
          source: "Inglaterra, Year 3.",
        },
        {
          id: "cie-cuerpo",
          text: "Relaciona el esqueleto y los músculos con el soporte, la protección y el movimiento.",
          source: "Inglaterra, Year 3.",
        },
        {
          id: "cie-vivo",
          text: "Separa lo vivo de lo no vivo con nutrición, movimiento, crecimiento y reproducción.",
          source: "Cambridge Primary Science, Stage 3.",
        },
        {
          id: "cie-roca",
          text: "Agrupa rocas por el aspecto y por una propiedad simple, y dice que un fósil es el resto de un ser vivo guardado en la roca.",
          source: "Inglaterra, Year 3.",
        },
        {
          id: "cie-luz",
          text: "Dice que hace falta luz para ver, que la oscuridad es ausencia de luz, que la luz se refleja y que un cuerpo opaco hace sombra.",
          source: "Inglaterra, Year 3.",
        },
        {
          id: "cie-fuerza",
          text: "Dice que empujar y tirar son fuerzas, que unas necesitan contacto y que el imán actúa a distancia y tiene dos polos.",
          source: "Inglaterra, Year 3, y Cambridge Primary Science, Stage 3.",
        },
        {
          id: "cie-material",
          text: "Elige un material para un uso según si es duro, blando, brillante o magnético.",
          source: "Cambridge Primary Science, Stage 3.",
        },
      ],
    },
    {
      id: "ingles",
      title: "Inglés",
      lede: "Lengua que se está aprendiendo, no inglés de niño nativo. Year 3 es el año en que Inglaterra empieza la lengua extranjera.",
      items: [
        {
          id: "ing-oir",
          text: "Entiende una frase corta dicha despacio y responde con un gesto o con palabras.",
          source: "Inglaterra, lengua extranjera, desde Year 3.",
        },
        {
          id: "ing-leer",
          text: "Lee en voz alta una oración corta hecha con palabras ya vistas.",
          source: "Cambridge Primary English, Stage 3, aplicado a palabras conocidas.",
        },
        {
          id: "ing-escribir",
          text: "Escribe una oración simple sobre hoy, ayer o mañana, con el verbo en su lugar.",
          source: "Práctica de grado 3 en inglés como lengua adicional.",
        },
        {
          id: "ing-significado",
          text: "Dice el significado de las palabras de la clase, sin traducir la oración entera palabra por palabra.",
          source: "Inglaterra, lengua extranjera, desde Year 3.",
        },
      ],
    },
    {
      id: "aprender",
      title: "Cómo aprende",
      lede: "Habilidades del Programa de la Escuela Primaria, observables a los ocho años. No llevan nota de examen.",
      items: [
        {
          id: "apr-pregunta",
          text: "Hace una pregunta propia sobre el tema.",
          source: "Bachillerato Internacional, habilidades de investigación.",
        },
        {
          id: "apr-fuente",
          text: "Busca un dato en la fuente que le indican y dice de dónde salió.",
          source: "Bachillerato Internacional, habilidades de investigación.",
        },
        {
          id: "apr-persevera",
          text: "Sigue un rato en la tarea y, si se traba, prueba otra forma antes de dejarla.",
          source: "Bachillerato Internacional, autogestión.",
        },
        {
          id: "apr-cambia",
          text: "Escucha a otro y cambia una idea cuando le muestran un dato nuevo.",
          source: "Bachillerato Internacional, pensamiento y mentalidad abierta.",
        },
        {
          id: "apr-cierre",
          text: "Al terminar dice qué hizo y qué haría distinto.",
          source: "Bachillerato Internacional, reflexión.",
        },
      ],
    },
    {
      id: "socioemocional",
      title: "Con los demás y consigo",
      lede: "Las cinco competencias de CASEL, en actos que se pueden ver a esta edad.",
      items: [
        {
          id: "sel-nombre",
          text: "Nombra lo que siente y dice cómo eso cambia lo que hace.",
          source: "CASEL, conciencia de sí mismo.",
        },
        {
          id: "sel-calma",
          text: "Cuando algo le pesa, usa una forma concreta de calmarse: respirar, moverse o pedir una pausa.",
          source: "CASEL, autogestión.",
        },
        {
          id: "sel-meta",
          text: "Pone una meta corta y dice cómo sabrá que la cumplió.",
          source: "CASEL, autogestión.",
        },
        {
          id: "sel-otro",
          text: "Nota cómo se siente otro por lo que dice y por la cara, y responde sin burlarse.",
          source: "CASEL, conciencia social.",
        },
        {
          id: "sel-roce",
          text: "Resuelve un roce con palabras y pide ayuda si no puede.",
          source: "CASEL, habilidades relacionales.",
        },
        {
          id: "sel-consecuencia",
          text: "Antes de actuar, dice una consecuencia para sí y otra para el otro.",
          source: "CASEL, decisiones responsables.",
        },
      ],
    },
    {
      id: "cuerpo",
      title: "El día",
      lede: "Condiciones de la OMS y de las guías de movimiento de 24 horas. No son una nota de clase.",
      items: [
        {
          id: "dia-movimiento",
          text: "En la semana, el movimiento que acelera el corazón suma en promedio una hora al día.",
          source: "OMS, 2020, de 5 a 17 años.",
        },
        {
          id: "dia-fuerza",
          text: "Al menos tres días de la semana hay juego fuerte o algo que fortalece huesos y músculos.",
          source: "OMS, 2020, de 5 a 17 años.",
        },
        {
          id: "dia-sueno",
          text: "Duerme entre 9 y 11 horas, con un horario parecido cada noche.",
          source: "Guías de movimiento de 24 horas, de 5 a 13 años.",
        },
        {
          id: "dia-pantalla",
          text: "La pantalla de juego o de video queda por debajo de 2 horas al día. La tarea no cuenta en esas 2 horas.",
          source: "Canadá y Australia fijan 2 horas. La OMS pide limitar la pantalla recreativa y no publica un minuto exacto.",
        },
      ],
    },
  ],
};
