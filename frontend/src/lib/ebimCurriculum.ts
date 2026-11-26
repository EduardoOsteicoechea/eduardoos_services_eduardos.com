import { renderStudyMarkdown } from "./ebimMarkdown";

export type CurriculumScreen = {
  id: string;
  group: string;
  groupLabel: string;
  nav: string;
  html: string;
};

type Draft = {
  id: string;
  group: string;
  groupLabel: string;
  nav: string;
  markdown: string;
};

const screens: Draft[] = [
  {
    id: "vigencia",
    group: "base",
    groupLabel: "Base",
    nav: "Qué está vigente",
    markdown: `## Qué es la serie y qué edición puedes usar hoy

ISO 19650 es la serie internacional para gestionar la información de un activo construido con BIM. No es un programa, ni un formato de archivo, ni un nivel de detalle. La parte 1 fija el vocabulario. Las partes 2 y 3 convierten ese vocabulario en un proceso: una para proyectar y construir, otra para usar el activo. La parte 4 dice cómo se decide si un intercambio vale. La parte 5 dice cómo tratar la información sensible. La parte 6, de 2025, trata salud y seguridad y no forma parte de este estudio.

El texto que debes estudiar es el publicado, no el borrador. A 26 de noviembre de 2026 el catálogo de ISO decía lo siguiente.

| Documento | Edición publicada | Estado en el catálogo | Qué viene después |
| --- | --- | --- | --- |
| ISO 19650-1:2018 | 1, 34 páginas, diciembre de 2018 | 90.92, en revisión, y a la vez confirmada en 2024 | ISO/DIS 19650-1, edición 2, etapa 40.93 el 18 de agosto de 2026 |
| ISO 19650-2:2018 | 1, 26 páginas, diciembre de 2018 | 90.92, en revisión, confirmada en 2024 | ISO/DIS 19650-2, etapa 40.93. El catálogo dice que sustituirá a la parte 2 y también a la parte 3 |
| ISO 19650-3:2020 | 1, 30 páginas, julio de 2020 | 90.92, en revisión, confirmada en 2024 | El mismo borrador anterior, y además ISO/DIS 19650-3, etapa 40.93 el 16 de septiembre de 2026 |
| ISO 19650-4:2022 | 1, 12 páginas, agosto de 2022 | 60.60, publicada | No había revisión ni enmienda en la ficha |
| ISO 19650-5:2020 | 1, 28 páginas, junio de 2020 | 90.93, confirmada el 24 de octubre de 2025 | No había borrador de sustitución |

Hay una contradicción que conviene recordar. El borrador ISO/DIS 19650-2 se titula proceso de gestión de la información y su ficha dice que reemplazará la entrega y la operación. Su resumen público, en cambio, sigue hablando solo de la fase de entrega. El borrador ISO/DIS 19650-3 se titula implementación de ese proceso y dice que da directrices conforme a la parte 2. Ninguno de los dos se leyó entero: están de pago y no están publicados. Hasta que salgan, la autoridad es 19650-2:2018 y 19650-3:2020.

En el Reino Unido la serie se aplica con el IMI Framework, antes llamado UK BIM Framework, mantenido por nima y BSI. Las guías son comentarios abiertos. No sustituyen a la norma. El anexo nacional británico precisa nombres y códigos; es una precisión local, no el texto internacional.

## Fuentes

- [ISO 19650-1:2018](https://www.iso.org/standard/68078.html)
- [ISO/DIS 19650-1](https://www.iso.org/standard/89703.html)
- [ISO 19650-2:2018](https://www.iso.org/standard/68080.html)
- [ISO/DIS 19650-2](https://www.iso.org/standard/89704.html)
- [ISO 19650-3:2020](https://www.iso.org/standard/75109.html)
- [ISO/DIS 19650-3](https://www.iso.org/standard/90358.html)
- [ISO 19650-4:2022](https://www.iso.org/standard/78246.html)
- [ISO 19650-5:2020](https://www.iso.org/standard/74206.html)
- [ISO 19650-6:2025, fuera de este estudio](https://www.iso.org/standard/82705.html)
- [IMI Framework, antes UK BIM Framework](https://wearenima.im/uk-bim-framework/)
`,
  },
  {
    id: "personas",
    group: "base",
    groupLabel: "Base",
    nav: "Quién hace qué",
    markdown: `## Las personas, antes que los documentos

El sistema nombra funciones, no cargos de una empresa. La misma organización puede ocupar más de una.

La appointing party es quien encarga y recibe la información. En una obra suele ser el cliente, pero la palabra no se agota en cliente, propietario o empleador. La lead appointed party coordina la información dentro de su equipo y entre ese equipo y quien encargó. La appointed party produce información sobre trabajos, bienes o servicios. Un delivery team es la lead appointed party más sus task teams. Un task team produce un paquete definido de información.

Un hospital puede tener a la vez un equipo de diseño y un equipo de obra. Cada uno tiene su propia lead appointed party y su propio delivery team. El fabricante de estructura es appointed party del contratista. Sus delineantes son un task team.

Appointment es el acuerdo por el que se gestiona o produce información. En el Reino Unido suele ser un contrato. Quien encarga redacta el information protocol del proyecto, lo incluye en cada appointment y exige que baje a los subencargos. El protocolo fija derechos y obligaciones. No es una nota explicativa. Las plantillas británicas valen para derecho inglés y no son asesoramiento legal.

La función de gestión de la información puede hacerla la propia appointing party, delegarla en una lead appointed party o encargarla a un tercero. La guía A de febrero de 2021 separa esa función de los recursos que hay que producir. Un recurso no tiene por qué ser un documento suelto: puede vivir en un sistema, o ir unido a otro contenido. Lo que importa es que el contenido exista y que no se promueva a contractual, ni se baje de contractual, por error.

## Fuentes

- [Guía 1, Conceptos, 2.ª edición, julio de 2019](https://imiframework.org/wp-content/uploads/2019/10/Information-Management-according-to-BS-EN-ISO-19650_-Guidance-Part-1_Concepts_2ndEdition.pdf)
- [Guía A, función y recursos, edición 2, febrero de 2021](https://www.ukbimframework.org/wp-content/uploads/2021/02/Guidance-Part-A_The-information-management-function-and-resources_Edition-2.pdf)
- [Guía del information protocol, edición 3, noviembre de 2021](https://www.ukbimframework.org/wp-content/uploads/2022/08/Information_protocols_supporting_the_delivery_phase_BS_EN_ISO_19650-2_and_the_operational_phase_BS_EN_ISO_19650-3_of_assets-Guidance_Edition-3.pdf)
- [Plantilla de protocolo para la entrega](https://www.ukbimframework.org/wp-content/uploads/2021/11/Information-Protocol-Template-to-support-BS-EN-ISO-19650-2.pdf)
- [Plantilla de protocolo para la operación](https://www.ukbimframework.org/wp-content/uploads/2021/11/Information-Protocol-Template-to-support-BS-EN-ISO-19650-3.pdf)
`,
  },
  {
    id: "requisitos",
    group: "base",
    groupLabel: "Base",
    nav: "Qué se pide",
    markdown: `## De la necesidad de la organización al encargo

Quien encarga tiene que saber qué información necesita para sus objetivos. La guía D, que cita la cláusula 5 de ISO 19650-1, ordena así los requisitos. No es una cadena única.

Los organizational information requirements, OIR, son el punto de partida. Están en la cláusula 5.2 de la parte 1 y en la 5.1.2 de la parte 3. Dicen la información de alto nivel que la organización necesita en toda su cartera y en sus funciones. Se redactan como actividad del negocio, no de un proyecto.

De los OIR salen, en paralelo, dos cosas distintas.

Los asset information requirements, AIR, están en la cláusula 5.3 de la parte 1 y en la 5.1.4 de la parte 3. Bajan esa necesidad a un activo concreto: energía, mantenimiento, cumplimiento, usuarios. Los prepara quien encarga, con el equipo de activos si existe, y tienen que existir antes del encargo relacionado. No son un entregable de obra. Son el origen de los requisitos de intercambio de la operación.

Los project information requirements, PIR, están en la cláusula 5.4 de la parte 1 y en la 5.1.2 de la parte 2. Hay un solo juego por proyecto. Sirven para las decisiones clave de ese proyecto: si sigue, si cabe en el presupuesto, si se puede abrir en la fecha prevista. Se anclan al plan de trabajo. La cláusula 5.1.3 pide hitos de entrega de información, definidos respecto de esas decisiones, por ejemplo unas semanas antes.

Los exchange information requirements, EIR, son de un appointment, no del proyecto entero. La cláusula 5.5 de la parte 1 los introduce. En obra los fija la cláusula 5.2.1. En operación, la 5.2.2. Dicen qué información se entrega en cada intercambio, con qué nivel de necesidad y para qué decisión. La lead appointed party puede añadir los suyos al encargar a otros, cláusula 5.4.3, sin pedir de más a quien no es el mejor situado para producirlos.

Un ejemplo cierra la cadena. El OIR de una universidad incluye informar el consumo anual de energía. El AIR de un edificio docente pide ese consumo medido por planta. El PIR de una reforma pide, al acabar el anteproyecto, la información para decidir si el coste cabe. El EIR del ingeniero mecánico nombra los contenedores, el nivel de necesidad y las fechas que permiten esas tres cosas.

La guía D separa, además, el propósito de la información y el detalle: contenido, forma y formato. Un requisito puede nombrar solo el resumen, por ejemplo una estrategia de incendio, y dejar el resto al equipo. Otro puede fijar también el desglose, el plano y el PDF. Lo constante es que cada requisito se pueda seguir hasta un propósito. Pedir sin propósito es desperdicio.

El project information model, PIM, es el conjunto de contenedores de la entrega. El asset information model, AIM, es el conjunto que se usa cuando el activo está en servicio. No son un único modelo 3D. Existen a nivel de activo, de proyecto y de equipo de entrega.

## Fuentes

- [Guía D, requisitos de información, edición 2, febrero de 2021](https://www.ukbimframework.org/wp-content/uploads/2021/02/Guidance-Part-D_Developing-information-requirements_Edition-2.pdf)
- [Guía 1, secciones 5.2 y 6](https://imiframework.org/wp-content/uploads/2019/10/Information-Management-according-to-BS-EN-ISO-19650_-Guidance-Part-1_Concepts_2ndEdition.pdf)
- [Tabla de recursos de la guía A](https://www.ukbimframework.org/wp-content/uploads/2021/02/Guidance-Part-A_The-information-management-function-and-resources_Edition-2.pdf)
`,
  },
  {
    id: "cde",
    group: "base",
    groupLabel: "Base",
    nav: "Contenedor y CDE",
    markdown: `## La unidad de información y sus estados

Un information container, cláusula 3.3.12 de ISO 19650-1 según la guía de conceptos, es una unidad con nombre e identificador único: un modelo, un plano, un presupuesto, una especificación. El information model es el conjunto de esos contenedores. Federar es juntarlos para un fin, por ejemplo coordinar, sin que dejen de tener cada uno su autor.

Se parten para que varias appointed parties trabajen a la vez sin pisarse. La federation strategy, cláusula 10.4, explica por qué se parte el modelo. La information container breakdown structure es el detalle de esas unidades. La primera puede fijarla quien encarga, si tiene una regla de proyecto, y se comunica en los métodos de producción. La segunda la acuerda la lead appointed party con su equipo. Valen para todo tipo de contenedor, no solo para la geometría.

El common data environment no es una marca de software. Es el flujo de estados, más la solución que lo sostiene. La figura 10 de ISO 19650-1, explicada en la cláusula 12 y en la guía C de septiembre de 2020, junta cuatro ideas.

Work in progress es lo que está elaborando su autor o su task team. Los demás no lo ven.

Shared es lo ya aprobado para compartirlo con otros task teams, con otros delivery teams o con quien encarga. Sirve para comentar y coordinar. Puede volver a work in progress.

Published es lo autorizado para un uso que ya obliga: desarrollar el diseño, construir o gestionar el activo. En la lectura británica, lo autoriza la lead appointed party y lo acepta la appointing party. El código de revisión con prefijo C, del anexo nacional, marca ese estado frente al preliminar P. Ese código es práctica del Reino Unido, no una regla universal de ISO.

Archive es el diario del contenedor. No es la papelera. Cada transición queda registrada.

La figura es un esquema. Un contenedor puede recorrer otro camino y puede vivir en más de una solución. La cláusula 12.1 recomienda tres metadatos: código de revisión, código de estado y código de clasificación. La cláusula 5.1.7 de la parte 2 exige que el CDE permita asignarlos. El identificador único también es metadato, pero la guía C advierte que el estado y la revisión no deben esconderse dentro del nombre.

No confundas shared resources con el estado Shared. En la cláusula 5.1.6, shared resources son plantillas, bibliotecas de objetos o estilos que quien encarga pone a disposición. El estado Shared es un momento del flujo.

## Fuentes

- [Guía C, el CDE, edición 1, septiembre de 2020](https://www.ukbimframework.org/wp-content/uploads/2020/09/Guidance-Part-C_Facilitating-the-common-data-environment-workflow-and-technical-solutions_Edition-1.pdf)
- [Guía 1, sección 6, contenedor y federación](https://imiframework.org/wp-content/uploads/2019/10/Information-Management-according-to-BS-EN-ISO-19650_-Guidance-Part-1_Concepts_2ndEdition.pdf)
`,
  },
  {
    id: "loin",
    group: "base",
    groupLabel: "Base",
    nav: "Cuánta información",
    markdown: `## Level of information need

El level of information need responde a una sola pregunta: cuánta información basta en este intercambio para este propósito. Sirve para no entregar de menos, que aumenta el riesgo, ni de más, que es desperdicio. La guía de conceptos de 2019 dice que el término no se abrevia. LOD y level of detail son marcos antiguos de algunos países. Pueden ilustrar un método local. No son el término de ISO.

El concepto entra en la cláusula 11.2 de ISO 19650-1. Quien encarga fija el método en el information standard del proyecto y lo aplica en cada EIR. El nivel de cada contenedor se anota en el task information delivery plan.

La guía D, todavía sobre la cláusula 11.2, pide tres subdivisiones: geometrical information, alphanumerical information y documentation. Una puerta cortafuego en diseño técnico puede necesitar hueco y sentido de apertura, la resistencia al fuego y el identificador, y el certificado de ensayo. Pedir en ese momento la geometría de fabricación suele ser más de lo que la decisión requiere.

ISO 7817-1:2024 es ahora el texto internacional de conceptos y principios para decir ese nivel con un método estable. El resumen público lo aplica a todo el ciclo de vida, a un intercambio general, al trabajo en curso y a un appointment con entrega especificada. Tiene 23 páginas y se publicó el 20 de junio de 2024, etapa 60.60. El catálogo de NEN da de baja NEN-EN 17412-1:2020 el 1 de julio de 2024 y lo sustituye por NEN-EN-ISO 7817-1:2024. La ficha de ISO 7817-1 no usa ella misma la palabra supersedes. El borrador de la parte 2 sí empareja los dos números: EN 17412-1, ISO 7817-1.

Esa parte 2, ISO/DTS 7817-2, seguía en borrador el 26 de noviembre de 2026, etapa 50.20 desde el 17 de septiembre de 2026. Su resumen dice que enseñará a redactar geometría, datos y documentación, y que los relacionará con el EIR, el BIM execution plan, el information delivery manual de ISO 29481 y con IFC. No es norma publicada. La parte 3, ISO/DIS 7817-3, un modelo UML y un esquema XML, cerró votación el 6 de mayo de 2026 y la ficha seguía en 40.60, sin decisión publicada.

Hasta que esas partes salgan, se estudia 7817-1 junto con la cláusula 11.2 y las tres subdivisiones de la guía D.

## Fuentes

- [ISO 7817-1:2024](https://www.iso.org/standard/82914.html)
- [NEN-EN 17412-1:2020, retirada](https://www.nen.nl/en/nen-en-17412-1-2020-en-277555)
- [ISO/DTS 7817-2, borrador](https://www.iso.org/standard/89075.html)
- [ISO/DIS 7817-3, borrador](https://www.iso.org/standard/89077.html)
- [Guía D, apartado del level of information need](https://www.ukbimframework.org/wp-content/uploads/2021/02/Guidance-Part-D_Developing-information-requirements_Edition-2.pdf)
`,
  },
  {
    id: "entrega",
    group: "proceso",
    groupLabel: "Proceso",
    nav: "Entrega",
    markdown: `## Mientras se diseña y se construye

ISO 19650-2:2018 especifica el proceso de información en la delivery phase. Vale para cualquier activo y cualquier tamaño, sea cual sea la forma de contratar. La guía 2, edición 6, de febrero de 2021, lee la cláusula 5 como ocho actividades. Las 5.1 y 5.8 son del proyecto entero. Las 5.2 a 5.7 se repiten en cada appointment.

| Cláusula | Actividad | Quién actúa primero |
| --- | --- | --- |
| 5.1 | Assessment and need | Appointing party |
| 5.2 | Invitation to tender | Appointing party |
| 5.3 | Tender response | La candidata a lead appointed party |
| 5.4 | Appointment | Lead appointed party, con quien encarga |
| 5.5 | Mobilization | Lead appointed party y su delivery team |
| 5.6 | Collaborative production of information | Task teams y lead appointed party |
| 5.7 | Information model delivery | Lead appointed party, y luego quien encarga acepta |
| 5.8 | Project close-out | Appointing party |

La grafía mobilization es la de esa edición de la guía. En inglés británico también se escribe mobilise. Es la misma actividad.

Antes de licitar, quien encarga deja listos, según la tabla de la guía A, los hitos (5.1.3), el information standard (5.1.4), los information production methods and procedures (5.1.5), la reference information y los shared resources (5.1.6), el information protocol (5.1.8), los EIR (5.2.1) y los criterios para evaluar la oferta (5.2.3).

El BIM execution plan se cita en la cláusula 3.1.3.1. Hay un solo plan con dos momentos, no dos documentos rivales. En la oferta, cláusula 5.3.2, la candidata lo establece. La cláusula nombra siete asuntos que debe considerar. El pasaje leído de la guía no los enumera, así que aquí no se inventan. Después del contrato, la cláusula 5.4.1 confirma ese plan. En la oferta también puede proponer cambios al information standard o a los métodos, incluidos los que hagan falta para repartir la información con seguridad.

Hay dos matrices y no se mezclan. La de actividades de gestión de la información tiene una plantilla indicativa en el anexo A de la parte 2, ligada a la cláusula 5.1.1. La de entregables no tiene plantilla en la serie. Nace, a alto nivel, dentro del plan de la oferta, y se afina después del contrato. Esa matriz detallada alimenta los TIDP y el MIDP. Las cláusulas que la guía cita son 5.3.2, 5.4.1, 5.4.2, 5.4.4 y 5.4.5.

Cada task team prepara un task information delivery plan, cláusula 5.4.4. Para cada contenedor anota nombre y título, predecesores o dependencias, level of information need, tiempo estimado de producción, autor e hitos de entrega. La lead appointed party compila esos planes en un master information delivery plan, cláusula 5.4.5. La norma no impone un formato único.

La cláusula 5.3.6 pide que la candidata establezca el risk register del delivery team. Trata del riesgo de entregar la información a tiempo y en condiciones, no del registro general de seguridad de la obra. La cláusula 6.3.1 de la parte 1, citada por la guía de conceptos, mete el riesgo de información dentro de la gestión ordinaria de riesgos. Un ejemplo: el especialista aún no se conoce, así que la federation strategy de la oferta es provisional y se confirma en la movilización, antes del primer intercambio shared.

La movilización, cláusulas 5.5.1, 5.5.2 y 5.5.3 en la guía, pone en marcha personas y tecnología y prueba los métodos antes de producir en serio. En la producción, las cláusulas 5.6.3 a 5.6.5 y 5.7.1 a 5.7.4 describen capas de revisión: el task team, la lead appointed party y, al entregar el modelo, la aceptación de quien encarga, cláusula 5.7.4. El cierre, 5.8, incluye las lecciones aprendidas.

## Fuentes

- [Guía 2, edición 6, febrero de 2021](https://www.ukbimframework.org/wp-content/uploads/2021/02/Guidance-Part-2_Parties-teams-and-processes-for-the-delivery-phase-of-assets_Edition-6.pdf)
- [Guía F, planificación de la entrega, septiembre de 2020](https://www.ukbimframework.org/wp-content/uploads/2020/09/Guidance-Part-F_About-information-delivery-planning_Edition-1.pdf)
- [Guía E, licitación y encargos, edición 2, febrero de 2021](https://www.ukbimframework.org/wp-content/uploads/2021/02/Guidance-Part-E_Tendering-and-appointments_Edition-2.pdf)
- [Guía A, tabla de recursos](https://www.ukbimframework.org/wp-content/uploads/2021/02/Guidance-Part-A_The-information-management-function-and-resources_Edition-2.pdf)
- [ISO 19650-2:2018](https://www.iso.org/standard/68080.html)
`,
  },
  {
    id: "operacion",
    group: "proceso",
    groupLabel: "Proceso",
    nav: "Operación",
    markdown: `## Cuando el activo ya se usa

ISO 19650-3:2020 especifica el proceso durante la operational phase, el tiempo en que el activo se usa para lo que fue hecho. Lo pueden cumplir directamente o delegarlo. El texto del director del proyecto, David Churcher, del 26 de agosto de 2020, lo dirige a quien posee u opera el activo y a los equipos que mantienen, reparan o vigilan. También les sirve a los equipos de obra, porque la información que entregan al final es el arranque de la operación.

En esta fase la appointing party es la propietaria, la operadora o quien actúe por ellas. La lead appointed party puede ser un contratista o un equipo interno. El proceso es el mismo. Un contrato marco con órdenes de llamada sigue siendo un appointment.

La guía 3, edición 2, de febrero de 2021, lee el proceso como ocho pasos, cláusulas 5.1 a 5.8. El paso 1 lo prepara quien encarga: OIR, AIR, eventos previsibles, information standard del activo y CDE. Después el diagrama se abre en tres caminos.

El camino B es un trigger event previsible, por ejemplo un mantenimiento o una inspección. Se contrata y se moviliza antes de que ocurra. Las cláusulas 5.2 y 5.3 son la contratación. Las 5.4 y 5.5, la planificación y la movilización. Cuando el evento llega, se produce y se revisa, cláusulas 5.6 y 5.7.

El camino C es un evento que no se podía planear con sensatez: un daño, un pico de demanda, un proyecto nuevo. Primero ocurre. Después se contrata, se moviliza y se produce. Habrá un retraso inevitable entre el hecho y el trabajo.

El camino D es adquirir un activo que era de otro. La relación no es la de cliente y proveedor de obras. Quien compra a menudo no puede exigir la información como condición del precio. A veces se negocia, o se encarga una comprobación propia.

La cláusula 5.1.5 es la que la guía cita para identificar los trigger events previsibles. El ritmo de la operación lo marcan esos eventos, igual que el plan de trabajo marca el ritmo de un proyecto. Un ejemplo de la guía: tras el servicio de una caldera, actualizar el libro; en un colegio vacío, los ensayos de legionela.

El traspaso entre modelos no es un único instante. La lectura de la guía sobre la figura del ciclo de vida marca tres cosas. Al empezar la entrega, la información pertinente pasa del AIM al PIM. Al empezar la operación, la pertinente pasa del PIM al AIM. Durante la entrega también puede haber traspasos, no solo en los dos extremos. Quien encarga revisa y acepta lo que entrega cada lead appointed party y entonces actualiza los sistemas donde vive el AIM. Aceptar no prueba que, más tarde, la información siga completa. El protocolo del appointment explica esa responsabilidad.

Algunas tareas, incluido el BIM execution plan, son a propósito más ligeras que en la parte 2. La proporcionalidad obliga a ajustar el esfuerzo al activo, al evento y al valor de la información. No autoriza a omitir una necesidad legal. La guía pone ejemplos: aplicar el proceso solo a los activos críticos, o no meter información de referencia en un concurso cuando ninguna sirve.

## Fuentes

- [ISO 19650-3:2020](https://www.iso.org/standard/75109.html)
- [Nota de David Churcher, 26 de agosto de 2020](https://committee.iso.org/sites/tc59/home/news/content-left-area/news-and-updates/new-standard-for-more-efficient.html)
- [Guía 3, edición 2, febrero de 2021](https://www.ukbimframework.org/wp-content/uploads/2021/02/Guidance-Part-3_Operational-phase-of-the-asset-life-cycle_Edition-2.pdf)
- [Guía D, OIR y AIR](https://www.ukbimframework.org/wp-content/uploads/2021/02/Guidance-Part-D_Developing-information-requirements_Edition-2.pdf)
`,
  },
  {
    id: "intercambio",
    group: "proceso",
    groupLabel: "Proceso",
    nav: "Intercambio",
    markdown: `## Decidir si el archivo se comparte o se publica

ISO 19650-4:2022, 12 páginas, publicada el 11 de agosto de 2022, especifica el proceso y los criterios de decisión de un information exchange, para que el PIM o el AIM resultante sirva. Aplica a las etapas de entrega de la parte 2 y a los trigger events de la parte 3. Se usa a la escala del activo.

El resumen público explica shall consider. La persona tiene que pensar de verdad en cada asunto de la lista. El tiempo y las pruebas dependen del activo, de la experiencia y de la política nacional. En un activo pequeño, algunos asuntos se descartan enseguida, siempre que el descarte sea una decisión y no un olvido.

Las partes 1, 2, 3 y 5 hablan de appointing, lead appointed y appointed parties. Para un intercambio concreto, la parte 4 usa también information provider, information receiver e information reviewer, porque la misma organización cambia de papel según el momento. Los criterios de los dos puntos de decisión son los mismos: el EIR aplicable, con el information standard y los métodos, más los criterios de calidad de la cláusula 7. También se revisa la calidad técnica.

La guía 4, de marzo de 2023, coloca dos puntos, A y B, sobre el flujo del CDE. El texto dice que ambos usan los mismos criterios. La lectura de ese texto, no una copia de la figura, asocia A con compartir durante el desarrollo y B con publicar tras autorizar y aceptar. La propia guía recomienda compartir pronto y a menudo, y publicar una vez, cuando el contenedor ya está autorizado y aceptado. Si la figura usara otras etiquetas, habría que corregir esta lectura con un ejemplar de la norma.

La guía C, a la que la guía 4 remite para operar el CDE, define published como lo autorizado por la lead appointed party y aceptado por la appointing party. Shared es el uso fuera del task team autor, antes de esa aceptación.

Las cláusulas 7.1 a 7.6 son seis criterios, en su mayoría independientes de los requisitos funcionales de un cliente, y por eso se pueden normalizar. La 7.7 dice que la norma no prescribe los criterios funcionales, técnicos o semejantes. Esos siguen en el EIR.

| Cláusula | Qué mira | Ejemplo de la guía |
| --- | --- | --- |
| 7.1 CDE | Nombre y metadatos | Un nombre que no cumple el anexo que se haya acordado |
| 7.2 Conformance | Esquema y formato | Un XML que no está bien formado |
| 7.3 Continuity | Correspondencia con otros intercambios | Un espacio que cambia de nombre entre versiones sin control |
| 7.4 Communication | Pérdida al traducir o convertir | Una fecha que se lee mal |
| 7.5 Consistency | Federación, espacio y atributos | El mismo elemento en dos modelos, un hueco entre elementos, o un peso que no coincide con la ficha del producto |
| 7.6 Completeness | Presencia y suficiencia | Faltan material y volumen |

Valen para planos, documentos y croquis, y también para modelos y bases de datos. La información abierta y estructurada hace más fáciles las comprobaciones automáticas. El programa de autor puede evitar el defecto antes de exportar. El programa de revisión puede encontrarlo después. Las dos cosas son calidad.

Information sustainability, en la guía 4, es información que sigue existiendo fuera del programa que la creó y del que la consume. El mismo dato puede servir después para coste, carbono, seguridad o suministro. Los anexos informativos, que no se copian aquí, enumeran normas abiertas candidatas para estructura, formato y clasificación. Que un intercambio concreto vaya en IFC lo decide el EIR. La parte 4 anima a no encerrar el dato en un formato que muera con la licencia.

El anexo nacional británico de esta parte, según la guía, añade Uniclass al contenedor y a entidades como zonas y productos. Es una adición nacional.

## Fuentes

- [ISO 19650-4:2022](https://www.iso.org/standard/78246.html)
- [Guía 4, marzo de 2023](https://nottingham-repository.worktribe.com/preview/21112102/ISO_19650_Guidance_4_Information%20exchange_Edition%201.pdf)
- [Guía C, estados del CDE](https://www.ukbimframework.org/wp-content/uploads/2020/09/Guidance-Part-C_Facilitating-the-common-data-environment-workflow-and-technical-solutions_Edition-1.pdf)
- [Recursos del IMI Framework](https://imiframework.org/resources/)
`,
  },
  {
    id: "seguridad",
    group: "proceso",
    groupLabel: "Proceso",
    nav: "Seguridad",
    markdown: `## Información sensible, sin cerrar la colaboración

ISO 19650-5:2020, confirmada el 24 de octubre de 2025, especifica un enfoque security-minded para la información en la madurez de la parte 1, y para la información sensible de cualquier iniciativa, proyecto, activo, producto o servicio. Cubre todo el ciclo, exista ya el activo o esté solo planeado. Incluye crear una cultura proporcionada y auditar el cumplimiento. También importa para la información comercial, la personal y la propiedad intelectual. No es un manual de protección de datos.

La National Protective Security Authority, NPSA, es adonde el IMI Framework envía al lector. No hay una guía 5 propia del UK BIM Framework. NPSA dice que la norma ISO sustituye a PAS 1192-5 y recoge ideas de PAS 185 y PAS 1085. Esas PAS son predecesoras. La guía de conceptos de julio de 2019 todavía mandaba usar PAS 1192-5 hasta que saliera la parte 5. Esa frase quedó vieja en junio de 2020.

El objetivo no es anular la colaboración del BIM. Es entender las vulnerabilidades y dejar el riesgo en un nivel que las partes toleran. El mismo cuidado sirve para un secreto comercial y para el plano interno de una estación de bombeo que no debe salir en el modelo abierto de coordinación.

La introducción de NPSA ordena el proceso así. Se establece si hace falta el enfoque, con el sensitivity assessment process cuando corresponda. Se inicia: gobierno, responsabilidades y el arranque del enfoque. Se redacta una security strategy: riesgos, mitigaciones y riesgos que se toleran. Se redacta un security management plan, que incluye políticas, security information requirements, reglas para dar información a terceros, requisitos logísticos y un security breach/incident management plan. Se trabaja con las appointed parties, dentro y fuera de contrato. Se vigila, se audita y se revisa.

Otra nota de NPSA se titula aplicación del security triage process. El fragmento recuperado dice que se conserva copia de la valoración y que, si se adopta el enfoque, se aplican las cláusulas 5 a 9. No se confirmó si sensitivity assessment y security triage son la misma cláusula. Un navegador de NHS Scotland nombra resultados ST1, ST2, ST3 y ST4 frente a la cláusula 4.8, pero ese PDF se equivoca en los años de las partes 1 y 2. Esos códigos quedan sin confirmar. No se estudian como definición.

La parte 5 no usa, según la guía del protocolo, la expresión information protocol. Sí exige que los documentos del appointment prevean lo de la cláusula 9.2. La guía E dice que las normas identificadas al hacer el security management plan se consideren en el information standard, y cita las cláusulas 7 y 9.2. Un ejemplo de la guía, no una regla universal: un metadato de sensibilidad y el CDE por el que se distribuye.

## Fuentes

- [ISO 19650-5:2020](https://www.iso.org/standard/74206.html)
- [NPSA, enfoque security-minded, actualizado el 21 de septiembre de 2026](https://www.npsa.gov.uk/security-best-practices/build-it-secure/security-minded-approach-digital-engineering)
- [Introducción de NPSA a BS EN ISO 19650-5](https://www.npsa.gov.uk/system/files/documents/NPSA%20-%20Introduction%20to%20BS%20EN%20ISO%2019650-5.pdf)
- [NPSA, aplicación del security triage process](https://www.npsa.gov.uk/system/files/documents/NPSA%20Application%20of%20the%20Security%20Triage%20Process.pdf)
- [Página de recursos del IMI Framework](https://imiframework.org/resources/)
- [Guía E, cláusulas 7 y 9.2](https://www.ukbimframework.org/wp-content/uploads/2021/02/Guidance-Part-E_Tendering-and-appointments_Edition-2.pdf)
`,
  },
  {
    id: "formatos",
    group: "formatos",
    groupLabel: "Formatos",
    nav: "IFC, IDS y bSDD",
    markdown: `## Cómo se comprueba lo que el proceso pidió

ISO 19650 dice quién necesita la información, cuándo y con qué nivel. No define por sí sola el esquema del archivo. Tres piezas abiertas hacen comprobable una parte de ese nivel.

ISO 16739-1:2024 es la edición 2 del esquema Industry Foundation Classes. Retira la edición de 2018. Se publicó el 22 de marzo de 2024, 496 páginas, etapa 60.60. El resumen añade infraestructura: puentes, carreteras, ferrocarriles, vías de agua y puertos. Publica el esquema, la documentación, los conjuntos de propiedades y cantidades, y la estructura del archivo de intercambio. Un model view definition es un subconjunto para una entrega concreta. El programa declara a qué vista se ajusta. buildingSMART identifica IFC 4.3 ADD2, versión 4.3.2.0, de abril de 2024, como la edición oficial que corresponde a esa ISO. La documentación HTML dice tener el mismo esquema, más ejemplos, bajo CC BY-ND 4.0.

ISO 7817-1 dice cómo expresar el nivel. IFC es un modo de transportar el modelo. El EIR decide si ese modo es el pedido.

Information Delivery Specification 1.0 es norma de buildingSMART, no de ISO. La etiqueta v1.0.0 se publicó el 3 de junio de 2024, tras votación favorable del comité de normas. La nota de publicación decía que se hablaba de llevarla a CEN o a ISO. El archivo de esquema del etiqueta lleva version 1.0.0. La copia de este sitio es Development/ids.xsd de esa etiqueta. No se comparó byte a byte con https://standards.buildingsmart.org/IDS/1.0/ids.xsd. La licencia del repositorio es CC BY-ND 4.0: se puede guardar sin modificar y citando a buildingSMART International Ltd.

Un archivo IDS es una lista de specifications. El manual pone este ejemplo: all walls must have a fire rating property. Cada specification tiene una description para la persona, una applicability que elige objetos y unos requirements que dicen qué deben tener. Las dos partes se arman con facets. En la 1.0 son seis: entity, con clase IFC y predefined type; attribute, con nombre y valor; classification, con sistema y valor; property, con property set, nombre y valor; material, con valor; y parts, cuyo elemento en el esquema se llama partOf. No hay facet de geometría. Se puede omitir el valor de una propiedad si basta con que exista. Las complex restrictions limitan un valor a una lista, un rango o un patrón.

El archivo de Aquisgrán que viaja en la misma etiqueta sigue apuntando al esquema 0.9.7. No es un ejemplo de la 1.0.

bSDD es un servicio gratuito de buildingSMART para publicar y citar definiciones de clases y propiedades. La página del servicio dice que no es una norma. Aplica ideas de ISO 12006-3, ISO 23386 e ISO 23387. El contenido lo publican organizaciones. Cuando una versión pasa a Active, su URI no cambia. Lo cargado de IFC, según esa página, es el diccionario de objetos tangibles y propiedades de IFC 4.3, no el esquema completo. IDS puede señalar una clase o una propiedad de bSDD por su URI, sin copiar la definición. La diferencia que pone el propio servicio: bSDD puede definir qué es una cocina y qué es una superficie neta. Un IDS puede exigir que este modelo tenga al menos una cocina así, con superficie por encima de un valor.

Un IDS aprobado no es la aceptación del contenedor. La aceptación sigue siendo la decisión de la parte 4.

La guía B de septiembre de 2020 sitúa open data, buildingSMART y COBie en el marco británico. Es anterior a IFC 4.3 y a IDS 1.0. Sirve de contexto, no de ficha técnica actual. Las plantillas CIBSE DE3, de 2016, están escritas para PAS 1192-2:2013. Son historia.

## Fuentes

- [ISO 16739-1:2024](https://www.iso.org/standard/84123.html)
- [Tabla de ediciones IFC](https://technical.buildingsmart.org/standards/ifc/ifc-schema-specifications/)
- [Introducción a IFC](https://technical.buildingsmart.org/standards/ifc/)
- [Documentación IFC 4.3.2.0](https://standards.buildingsmart.org/IFC/DEV/IFC4_3/HTML/)
- [IDS 1.0.0](https://github.com/buildingSMART/IDS/releases/tag/v1.0.0)
- [Esquema IDS 1.0](https://standards.buildingsmart.org/IDS/1.0/ids.xsd)
- [Licencia CC BY-ND 4.0](https://creativecommons.org/licenses/by-nd/4.0/)
- [bSDD](https://www.buildingsmart.org/users/services/buildingsmart-data-dictionary/)
- [Citar bSDD desde IDS e IFC](https://technical.buildingsmart.org/services/bsdd/referencing-bsdd-in-ids-and-ifc/)
- [Guía B, septiembre de 2020, solo contexto](https://www.ukbimframework.org/wp-content/uploads/2020/09/Guidance-Part-B_Open-data-buildingSMART-and-COBie_Edition-1.pdf)
`,
  },
  {
    id: "fuentes",
    group: "cierre",
    groupLabel: "Cierre",
    nav: "Todas las fuentes",
    markdown: `## Dónde está cada cosa

Las normas completas de ISO y CEN se pagan. Lo que sigue son las fichas abiertas y las guías que se pudieron leer el 26 de noviembre de 2026. La vista previa del Online Browsing Platform no cargó, así que ninguna definición se copió de ahí. Los números de cláusula son los que citan las guías, no una transcripción del texto de pago.

### Normas, fichas de catálogo

- [ISO 19650-1:2018](https://www.iso.org/standard/68078.html) y su borrador [ISO/DIS 19650-1](https://www.iso.org/standard/89703.html)
- [ISO 19650-2:2018](https://www.iso.org/standard/68080.html) y su borrador [ISO/DIS 19650-2](https://www.iso.org/standard/89704.html)
- [ISO 19650-3:2020](https://www.iso.org/standard/75109.html) y su borrador [ISO/DIS 19650-3](https://www.iso.org/standard/90358.html)
- [ISO 19650-4:2022](https://www.iso.org/standard/78246.html)
- [ISO 19650-5:2020](https://www.iso.org/standard/74206.html)
- [ISO 19650-6:2025](https://www.iso.org/standard/82705.html), salud y seguridad, no estudiada aquí
- [ISO 7817-1:2024](https://www.iso.org/standard/82914.html), [borrador de la parte 2](https://www.iso.org/standard/89075.html) y [borrador de la parte 3](https://www.iso.org/standard/89077.html)
- [Retirada de EN 17412-1:2020 en NEN](https://www.nen.nl/en/nen-en-17412-1-2020-en-277555)
- [ISO 16739-1:2024](https://www.iso.org/standard/84123.html)
- [Nota de Churcher sobre la parte 3](https://committee.iso.org/sites/tc59/home/news/content-left-area/news-and-updates/new-standard-for-more-efficient.html)

### Guías abiertas del Reino Unido

- [Qué es hoy el marco](https://wearenima.im/uk-bim-framework/) y [sus recursos](https://imiframework.org/resources/)
- [Conceptos, julio de 2019](https://imiframework.org/wp-content/uploads/2019/10/Information-Management-according-to-BS-EN-ISO-19650_-Guidance-Part-1_Concepts_2ndEdition.pdf). Su apartado de seguridad está superado.
- [Guía A, febrero de 2021](https://www.ukbimframework.org/wp-content/uploads/2021/02/Guidance-Part-A_The-information-management-function-and-resources_Edition-2.pdf)
- [Guía B, septiembre de 2020](https://www.ukbimframework.org/wp-content/uploads/2020/09/Guidance-Part-B_Open-data-buildingSMART-and-COBie_Edition-1.pdf)
- [Guía C, septiembre de 2020](https://www.ukbimframework.org/wp-content/uploads/2020/09/Guidance-Part-C_Facilitating-the-common-data-environment-workflow-and-technical-solutions_Edition-1.pdf)
- [Guía D, febrero de 2021](https://www.ukbimframework.org/wp-content/uploads/2021/02/Guidance-Part-D_Developing-information-requirements_Edition-2.pdf)
- [Guía E, febrero de 2021](https://www.ukbimframework.org/wp-content/uploads/2021/02/Guidance-Part-E_Tendering-and-appointments_Edition-2.pdf)
- [Guía F, septiembre de 2020](https://www.ukbimframework.org/wp-content/uploads/2020/09/Guidance-Part-F_About-information-delivery-planning_Edition-1.pdf)
- [Guía 2, edición 6, febrero de 2021](https://www.ukbimframework.org/wp-content/uploads/2021/02/Guidance-Part-2_Parties-teams-and-processes-for-the-delivery-phase-of-assets_Edition-6.pdf)
- [Guía 3, edición 2, febrero de 2021](https://www.ukbimframework.org/wp-content/uploads/2021/02/Guidance-Part-3_Operational-phase-of-the-asset-life-cycle_Edition-2.pdf)
- [Guía 4, marzo de 2023](https://nottingham-repository.worktribe.com/preview/21112102/ISO_19650_Guidance_4_Information%20exchange_Edition%201.pdf)
- [Guía del protocolo](https://www.ukbimframework.org/wp-content/uploads/2022/08/Information_protocols_supporting_the_delivery_phase_BS_EN_ISO_19650-2_and_the_operational_phase_BS_EN_ISO_19650-3_of_assets-Guidance_Edition-3.pdf), [plantilla de entrega](https://www.ukbimframework.org/wp-content/uploads/2021/11/Information-Protocol-Template-to-support-BS-EN-ISO-19650-2.pdf) y [plantilla de operación](https://www.ukbimframework.org/wp-content/uploads/2021/11/Information-Protocol-Template-to-support-BS-EN-ISO-19650-3.pdf)

### Seguridad y openBIM

- [Página NPSA](https://www.npsa.gov.uk/security-best-practices/build-it-secure/security-minded-approach-digital-engineering), [introducción](https://www.npsa.gov.uk/system/files/documents/NPSA%20-%20Introduction%20to%20BS%20EN%20ISO%2019650-5.pdf) y [triage](https://www.npsa.gov.uk/system/files/documents/NPSA%20Application%20of%20the%20Security%20Triage%20Process.pdf)
- [IFC, tabla de ediciones](https://technical.buildingsmart.org/standards/ifc/ifc-schema-specifications/), [introducción](https://technical.buildingsmart.org/standards/ifc/) y [documentación 4.3.2](https://standards.buildingsmart.org/IFC/DEV/IFC4_3/HTML/)
- [IDS 1.0.0](https://github.com/buildingSMART/IDS/releases/tag/v1.0.0) y [esquema](https://standards.buildingsmart.org/IDS/1.0/ids.xsd)
- [bSDD](https://www.buildingsmart.org/users/services/buildingsmart-data-dictionary/) y [cómo citarlo](https://technical.buildingsmart.org/services/bsdd/referencing-bsdd-in-ids-and-ifc/)

Lo que no se usa como definición: el texto de pago de las normas, PAS 1192 y BS 1192 como regla actual, las plantillas CIBSE de 2016, y los paquetes que piden un correo para descargarse.
`,
  },
  {
    id: "preguntas",
    group: "cierre",
    groupLabel: "Cierre",
    nav: "Comprobar",
    markdown: `## Lee la pregunta, responde, y solo después mira

1. ¿Qué edición estudias hoy de cada texto de 19650-1 a 19650-5, y cuál de ellos está confirmado sin borrador de sustitución?
2. ¿Por qué no basta el resumen de ISO/DIS 19650-2 para decir cómo quedará la operación?
3. ¿Puede una misma organización ser lead appointed party y, a la vez, contener un task team?
4. ¿De dónde salen los AIR y los PIR, y cuántos juegos de PIR tiene un proyecto?
5. ¿Qué cláusulas cita la guía D para el EIR de quien encarga, en obra y en operación?
6. ¿Quién ve un contenedor mientras está en work in progress, y qué dos actos hacen falta para llamarlo published en la lectura británica?
7. ¿Por qué level of information need no se escribe LOD?
8. ¿Qué sustituyó a EN 17412-1:2020 y en qué fecha lo registra NEN?
9. ¿Qué cláusulas de la parte 2 se repiten en cada appointment?
10. ¿En qué momento se establece el BIM execution plan y en qué momento se confirma?
11. ¿Para qué sirve el anexo A, y qué matriz no trae plantilla?
12. ¿Qué seis datos anota un TIDP en cada contenedor, según la guía F?
13. ¿Qué camino de la parte 3 contrata antes del trigger event, y qué camino no puede hacerlo?
14. ¿El paso del PIM al AIM ocurre solo al inaugurar la operación?
15. ¿Qué mira cada una de las cláusulas 7.1 a 7.6, y qué se niega a prescribir la 7.7?
16. ¿Qué PAS dice NPSA que quedó sustituida, y por qué no se memorizan ST1 a ST4?
17. ¿Qué edición de IFC retiró ISO 16739-1:2024, y qué seis facets tiene IDS 1.0?
18. ¿Un IDS superado significa que quien encarga ya aceptó el contenedor?

## Respuestas

1. 2018, 2018, 2020, 2022 y 2020. Solo la parte 5 está confirmada, etapa 90.93, sin borrador de sustitución en la ficha. La parte 4 está publicada, etapa 60.60, también sin borrador.
2. Porque ese resumen sigue describiendo la entrega, mientras la ficha dice que el borrador sustituirá también a la parte 3. El articulado no se leyó.
3. Sí. La lead appointed party puede ser la misma organización que uno de sus task teams.
4. De los OIR. Un solo juego de PIR por proyecto.
5. ISO 19650-2, cláusula 5.2.1, e ISO 19650-3, cláusula 5.2.2.
6. Solo el autor o su task team. En la guía británica, lo autoriza la lead appointed party y lo acepta la appointing party.
7. Porque la guía de 2019 dice que el término no se abrevia. LOD es un marco anterior.
8. NEN-EN-ISO 7817-1:2024, con baja de la norma europea el 1 de julio de 2024.
9. De la 5.2 a la 5.7. La 5.1 y la 5.8 son del proyecto.
10. Lo establece la candidata en la oferta, cláusula 5.3.2. Se confirma tras el contrato, cláusula 5.4.1.
11. Es una plantilla indicativa de actividades de gestión. La matriz de entregables no trae plantilla en la serie.
12. Nombre y título, predecesores o dependencias, level of information need, tiempo estimado, autor e hitos.
13. El camino B contrata antes. El C empieza porque el evento ya ocurrió. El D es una adquisición, no un contrato de obras.
14. No. También puede haber traspasos durante la entrega, y al empezar la entrega hay traspaso del AIM al PIM.
15. Nombre y metadatos, esquema y formato, continuidad, pérdida en la conversión, coherencia, y presencia. La 7.7 deja fuera los criterios funcionales y técnicos.
16. PAS 1192-5. Los códigos salen de un navegador que además fecha mal las partes 1 y 2, y no se confirmaron en la nota de NPSA usada aquí.
17. Retiró ISO 16739-1:2018. Los facets son entity, attribute, classification, property, material y partOf. No hay geometría.
18. No. La aceptación sigue siendo la decisión de la parte 4.

Si una respuesta no sale con tus palabras, vuelve a ese tema en el índice. No hace falta releer desde el mapa.
`,
  },
];

export function loadCurriculum(): CurriculumScreen[] {
  return screens.map((screen) => ({
    id: screen.id,
    group: screen.group,
    groupLabel: screen.groupLabel,
    nav: screen.nav,
    html: renderStudyMarkdown(screen.markdown, () => null),
  }));
}
