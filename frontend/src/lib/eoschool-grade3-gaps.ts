import type { Grade3CrosswalkArea } from "./eoschool-grade3-standards-crosswalk";

const US_MATH = "https://www.thecorestandards.org/Math/Content/3/";
const UK_MATH =
  "https://www.gov.uk/government/publications/national-curriculum-in-england-mathematics-programmes-of-study";
const US_ELA = "https://www.thecorestandards.org/ELA-Literacy/";
const UK_EN =
  "https://www.gov.uk/government/publications/national-curriculum-in-england-english-programmes-of-study";
const NGSS = "https://www.nextgenscience.org/";
const UK_SCI =
  "https://www.gov.uk/government/publications/national-curriculum-in-england-science-programmes-of-study";
const UK_GEO =
  "https://www.gov.uk/government/publications/national-curriculum-in-england-geography-programmes-of-study";
const UK_HIS =
  "https://www.gov.uk/government/publications/national-curriculum-in-england-history-programmes-of-study";
const C3 = "https://www.socialstudies.org/standards/c3";

/**
 * Skills this age asks for in the US or in England that the MPPE grade-3
 * list does not state. Venezuela's card names the absence. The other cards
 * name the nearest standard.
 */
export const GRADE3_PROGRAM_GAPS: { areas: Grade3CrosswalkArea[] } = {
  areas: [
    {
      id: "len",
      title: "Prácticas del Lenguaje",
      icon: "article",
      rows: [
        {
          unitTitle: "Leer dos textos del mismo tema",
          learning: "El programa no pide comparar dos textos del mismo tema y decir en qué se parecen y en qué no.",
          us: {
            code: "RI.3.9",
            text: "Grade 3 compara las ideas más importantes y los detalles de dos textos sobre el mismo tema.",
            fit: "directo",
            href: `${US_ELA}RI/3/`,
          },
          uk: {
            code: "En/Y4/Reading",
            text: "Years 3–4 recuperan y anotan información de no ficción. Comparar dos textos del mismo tema no queda como un paso aparte.",
            fit: "parcial",
            href: UK_EN,
          },
        },
        {
          unitTitle: "Escribir una opinión",
          learning: "El programa pide opinar al hablar. No pide un texto de opinión con razones y un cierre.",
          us: {
            code: "W.3.1",
            text: "Grade 3 escribe una opinión sobre un tema, da razones y cierra el texto.",
            fit: "directo",
            href: `${US_ELA}W/3/`,
          },
          uk: {
            code: "En/Y4/Writing",
            text: "Years 3–4 escriben con distintos propósitos, entre ellos argumentar, y organizan el texto en párrafos.",
            fit: "directo",
            href: UK_EN,
          },
        },
        {
          unitTitle: "Palabra desconocida",
          learning: "El programa no pide una estrategia para entender una palabra nueva: el contexto, el prefijo o un glosario.",
          us: {
            code: "L.3.4",
            text: "Grade 3 averigua el sentido de una palabra o frase desconocida con el contexto, el afijo o un glosario.",
            fit: "directo",
            href: `${US_ELA}L/3/`,
          },
          uk: {
            code: "En/Y4/Vocabulary",
            text: "Years 3–4 usan el diccionario y el contexto para comprobar el sentido de una palabra.",
            fit: "directo",
            href: UK_EN,
          },
        },
      ],
    },
    {
      id: "mat",
      title: "Matemáticas",
      icon: "calculate",
      rows: [
        {
          unitTitle: "Fracciones",
          learning: "El programa no pide fracciones: partir una unidad en partes iguales, nombrarlas y compararlas.",
          us: {
            code: "3.NF.A.1",
            text: "Grade 3 entiende una fracción como partes iguales de un entero y la ubica en la recta.",
            fit: "directo",
            href: `${US_MATH}NF/`,
          },
          uk: {
            code: "Ma/Y4/Fractions",
            text: "Year 4 reconoce familias de fracciones equivalentes y cuenta en décimas y en centésimas.",
            fit: "directo",
            href: UK_MATH,
          },
        },
        {
          unitTitle: "División",
          learning: "El programa pide multiplicar. No pide dividir ni ver la división como el inverso de la multiplicación.",
          us: {
            code: "3.OA.A.2",
            text: "Grade 3 entiende la división como un reparto en grupos iguales y la relaciona con la multiplicación.",
            fit: "directo",
            href: `${US_MATH}OA/`,
          },
          uk: {
            code: "Ma/Y4/Division",
            text: "Year 4 divide un número de hasta tres cifras entre uno de una cifra.",
            fit: "directo",
            href: UK_MATH,
          },
        },
        {
          unitTitle: "Perímetro",
          learning: "El programa mide longitudes. No pide el perímetro de una figura.",
          us: {
            code: "3.MD.D.8",
            text: "Grade 3 halla el perímetro de un polígono a partir de sus lados y resuelve problemas con esa medida.",
            fit: "directo",
            href: `${US_MATH}MD/`,
          },
          uk: {
            code: "Ma/Y4/Perimeter",
            text: "Year 4 mide y calcula el perímetro de una figura rectilínea en centímetros y en metros.",
            fit: "directo",
            href: UK_MATH,
          },
        },
        {
          unitTitle: "Área",
          learning: "El programa no pide el área: cubrir una superficie con unidades cuadradas ni calcular el área de un rectángulo.",
          us: {
            code: "3.MD.C.5",
            text: "Grade 3 entiende el área como el número de unidades cuadradas que cubren una figura, sin huecos ni solapes.",
            fit: "directo",
            href: `${US_MATH}MD/`,
          },
          uk: {
            code: "Ma/Y4/Area",
            text: "Year 4 halla el área de figuras rectilíneas contando cuadrados.",
            fit: "directo",
            href: UK_MATH,
          },
        },
        {
          unitTitle: "Redondeo",
          learning: "El programa ubica cantidades hasta el diez mil. No pide redondear.",
          us: {
            code: "3.NBT.A.1",
            text: "Grade 3 redondea un número de hasta tres cifras a la decena o a la centena más cercana.",
            fit: "directo",
            href: `${US_MATH}NBT/`,
          },
          uk: {
            code: "Ma/Y4/Round",
            text: "Year 4 redondea cualquier número a la decena, a la centena o al millar más cercano.",
            fit: "directo",
            href: UK_MATH,
          },
        },
      ],
    },
    {
      id: "cie",
      title: "Ciencias Naturales",
      icon: "science",
      rows: [
        {
          unitTitle: "Fuerzas e imanes",
          learning: "El programa explica la gravedad. No pide empujes, tirones ni imanes.",
          us: {
            code: "3-PS2-3",
            text: "Grade 3 pregunta cómo un imán atrae o repele a otro sin tocarlo.",
            fit: "directo",
            href: NGSS,
          },
          uk: {
            code: "Sc/Y3/Forces",
            text: "Year 3 compara cómo se mueven los objetos sobre distintas superficies y observa que los imanes se atraen o se repelen.",
            fit: "directo",
            href: UK_SCI,
          },
        },
        {
          unitTitle: "Fósiles",
          learning: "El programa habla de plantas y de biodiversidad. No pide fósiles ni cómo era el ambiente en el pasado.",
          us: {
            code: "3-LS4-1",
            text: "Grade 3 usa fósiles para describir organismos y ambientes de hace mucho tiempo.",
            fit: "directo",
            href: NGSS,
          },
          uk: {
            code: "Sc/Y3/Rocks",
            text: "Year 3 explica, en términos sencillos, cómo se forma un fósil.",
            fit: "directo",
            href: UK_SCI,
          },
        },
        {
          unitTitle: "Tiempo y ciclo del agua",
          learning: "El programa nombra el cambio climático y los ciclones. No pide el ciclo del agua ni describir el tiempo de una región.",
          us: {
            code: "3-ESS2-1",
            text: "Grade 3 representa datos del tiempo de una estación y describe el clima de una región.",
            fit: "directo",
            href: NGSS,
          },
          uk: {
            code: "Ge/Y4/Water",
            text: "Year 4 describe el ciclo del agua.",
            fit: "directo",
            href: UK_GEO,
          },
        },
      ],
    },
    {
      id: "ide",
      title: "Identidad",
      icon: "public",
      rows: [
        {
          unitTitle: "El mundo",
          learning: "El programa ubica a Venezuela, sus estados y sus regiones. No pide nombrar continentes y océanos ni situar el país en el mapa del mundo.",
          us: {
            code: "C3 D2.Geo.2",
            text: "En los grados 3–5 se usan mapas para localizar lugares y explicar cómo la geografía marca la vida de la gente.",
            fit: "directo",
            href: C3,
          },
          uk: {
            code: "Ge/KS2/World",
            text: "Key Stage 2 nombra y localiza continentes, océanos y el ecuador.",
            fit: "directo",
            href: UK_GEO,
          },
        },
        {
          unitTitle: "Otra civilización",
          learning: "El programa recorre la historia de Venezuela. No pide estudiar una civilización antigua ni una sociedad de otro continente.",
          us: {
            code: "C3 D2.His.2",
            text: "En los grados 3–5 se compara cómo vivía la gente en otro tiempo y en otro lugar.",
            fit: "parcial",
            href: C3,
          },
          uk: {
            code: "Hi/KS2/Ancient",
            text: "Key Stage 2 estudia la Grecia o la Roma antiguas, y una sociedad no europea, como contraste con la historia local.",
            fit: "directo",
            href: UK_HIS,
          },
        },
      ],
    },
  ],
};
