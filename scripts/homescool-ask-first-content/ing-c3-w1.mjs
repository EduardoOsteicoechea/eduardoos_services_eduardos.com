/**
 * Inglés · ciclo 3 · semana 1 · nivel 6 — "The grammatical categories in English (parts of speech)" (v3b, 3 días).
 * Espeja a esp-c3-w1 (las nueve clases de palabras), pero se enseña EN INGLÉS sencillo.
 * Conteo honesto: 8 partes de la oración (noun, pronoun, verb, adjective, adverb, preposition,
 * conjunction, interjection) + los artículos a / an / the = 9 grupos en esta clase.
 * Hito de Venezuela (solo en preguntas y respuestas, NO en la imagen): Mount Ávila (Caracas).
 * Datos seguros usados: el Ávila es la montaña que separa Caracas del mar; se sube por distintos caminos.
 * d1 = panorama de los nueve grupos · d2 = noun, verb, pronoun, article, adjective de cerca ·
 * d3 = adverb, conjunction, preposition, interjection y contarlo (cierra la semana).
 */
export default [
  // ───────────────────────── DAY 1 · overview ─────────────────────────
  {
    key: "ing-c3-w1-d1",
    title: "The nine groups of English words",
    mppe: [
      { id: "len-lec-07", label: "I spot nouns and verbs in English sentences." },
      { id: "len-lec-05", label: "I read English sentences aloud to practice." },
    ],
    memoryPhrase:
      "Noun, pronoun, verb, adjective, adverb, preposition, conjunction, interjection, and the articles a, an, the: 9 groups.",
    units: [
      {
        h: "Point 1: Review of the last class",
        a: [
          "You already know many English words.",
          "Words are like hikers in a team.",
          "Today we climb Mount Ávila with them.",
        ],
      },
      {
        q: [
          "On Mount Ávila, do all hikers do the",
          "same job? Do all English words?",
        ],
        h: "Point 2: Every word has a job",
        a: [
          "No, each hiker has a different job.",
          "English words are a team too:",
          "8 parts of speech (clases de palabras)",
          "plus the articles a, an, the.",
        ],
      },
      {
        q: [
          "“Sofia climbs. She sees the mountain.”",
          "Which words name, act or replace?",
        ],
        h: "Point 3: Name, act and replace",
        a: [
          "A noun (sustantivo) names: Sofia.",
          "A verb (verbo) shows action: climbs.",
          "A pronoun (pronombre) replaces a noun.",
        ],
      },
      {
        q: [
          "Mount Ávila has a high peak. Which",
          "words say which one and what it is like?",
        ],
        h: "Point 4: Describe",
        a: [
          "“The” is an article (a, an, the).",
          "“High” is an adjective (adjetivo):",
          "it says what the peak is like.",
          "“Slowly” is an adverb: how we climb.",
        ],
      },
      {
        q: [
          "“Sofia climbs with Luis and says: Wow!”",
          "What do “with”, “and” and “Wow!” do?",
        ],
        h: "Point 5: Join and feel",
        a: [
          "“And” is a conjunction: it joins ideas.",
          "“With” is a preposition: it links words.",
          "“Wow!” is an interjection: a feeling.",
        ],
      },
      {
        q: [
          "The team reached the top. How many",
          "groups of words are in the team?",
        ],
        h: "Point 6: Nine groups",
        a: [
          "Noun, pronoun, verb, adjective, adverb,",
          "preposition, conjunction, interjection,",
          "and the articles a, an, the: 9 groups.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "How many groups are in this class?", o: ["Nine", "Five", "Seven", "Twelve"] },
        { q: "In “Sofia climbs”, which is the verb?", o: ["climbs", "Sofia", "she", "mountain"] },
        { q: "What kind of word is “mountain”?", o: ["A noun", "A verb", "An adverb", "A pronoun"] },
        { q: "What does the pronoun “she” do?", o: ["Replaces a noun", "Says how she climbs", "Joins two ideas", "Shows a feeling"] },
        { q: "In “the high peak”, what is “high”?", o: ["An adjective", "An article", "A verb", "A preposition"] },
        { q: "In “climb slowly”, what is “slowly”?", o: ["An adverb", "An adjective", "A noun", "A conjunction"] },
        { q: "What kind of word is “with”?", o: ["A preposition", "A conjunction", "An interjection", "An article"] },
        { q: "Which word shows a quick feeling?", o: ["Wow!", "with", "and", "high"] },
      ],
      write: [
        "Write one sentence with a noun and a verb.",
        "Tell in your words what a pronoun does.",
      ],
      schematic: [
        "Draw a mountain with three groups of words.",
        "Draw “the high peak” and label each word.",
      ],
    },
    image: [
      "Draw nine boxes in three rows. Label",
      "each one with a group name, such as noun",
      "or verb. Leave space in every box for",
      "you to write one short example word.",
    ],
    summary:
      "English has 8 parts of speech plus a, an and the: 9 groups. Like hikers on Mount Ávila, each one has its own job.",
  },

  // ───────────────────────── DAY 2 · closer ─────────────────────────
  {
    key: "ing-c3-w1-d2",
    title: "Nouns, verbs, pronouns, articles and adjectives",
    mppe: [
      { id: "len-lec-05", label: "I read and repeat English noun, verb and pronoun examples." },
    ],
    memoryPhrase: "Noun names, verb acts, pronoun replaces.",
    units: [
      {
        h: "Point 1: Review of the last class",
        a: [
          "Last class you met the nine groups.",
          "Noun names, verb acts, pronoun replaces.",
          "Today we see them closer on Mount Ávila.",
        ],
      },
      {
        q: [
          "“Mountain” and “Mount Ávila” name the",
          "same kind of thing. Do they look alike?",
        ],
        h: "Point 2: Common and proper nouns",
        a: [
          "“Mountain” is a common noun:",
          "it names any mountain.",
          "“Mount Ávila” is a proper noun: it names",
          "one place and starts with capitals.",
        ],
      },
      {
        q: [
          "One hiker is on Mount Ávila. Five more",
          "arrive. How do you say it for many?",
        ],
        h: "Point 3: One or many",
        a: [
          "One hiker, five hikers. Add -s: hikers.",
          "Some nouns change: one child,",
          "two children.",
        ],
      },
      {
        q: [
          "Say: “I climb.” Now say it for Sofia.",
          "What changes in the verb?",
        ],
        h: "Point 4: The verb can change",
        a: [
          "You say: I climb, you climb, she climbs.",
          "With he, she or it, add -s.",
          "The word “climb” stays inside.",
        ],
      },
      {
        q: [
          "“Sofia climbs. Sofia sees the top.”",
          "It sounds repeated. How can you fix it?",
        ],
        h: "Point 5: A pronoun avoids repeating",
        a: [
          "Say: “Sofia climbs. She sees the top.”",
          "“She” takes the place of Sofia.",
          "I, you, he, she, it, we, they: pronouns.",
        ],
      },
      {
        q: [
          "Say “a tall hiker” and “an old hiker”.",
          "Which words are articles? Which describe?",
        ],
        h: "Point 6: Articles and adjectives",
        a: [
          "“A” and “an” are articles (artículos).",
          "We say “an old hiker”, “a tall hiker”.",
          "“Old” and “tall” are adjectives: they",
          "describe, and they never change.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "Which is a proper noun?", o: ["Mount Ávila", "mountain", "hiker", "child"] },
        { q: "Which is a common noun?", o: ["mountain", "Mount Ávila", "Sofia", "Luis"] },
        { q: "What is the plural of “hiker”?", o: ["hikers", "hikeres", "hikerz", "hikeers"] },
        { q: "What is the plural of “child”?", o: ["children", "childs", "childes", "childrens"] },
        { q: "How do you say “climb” with “she”?", o: ["She climbs.", "She climb.", "She climbes.", "She climbing."] },
        { q: "Which word takes the place of Sofia?", o: ["She", "Hiker", "Climbs", "Top"] },
        { q: "Which word is an article?", o: ["an", "tall", "hiker", "climbs"] },
        { q: "In “a tall hiker”, what is “tall”?", o: ["An adjective", "An article", "A verb", "A pronoun"] },
      ],
      write: [
        "Write a sentence with “she” and a verb.",
        "Write two phrases: one with “a”, one with “an”.",
      ],
      schematic: [
        "Draw two columns: common and proper nouns.",
        "Draw a tall hiker and label each word.",
      ],
    },
    image: [
      "Draw five boxes in a row and name them:",
      "noun, verb, pronoun, article, adjective.",
      "In each box add a picture and leave a",
      "space to write a new example word.",
    ],
    summary:
      "A noun names, a verb acts, a pronoun replaces, and articles and adjectives go with a noun.",
  },

  // ───────────────────────── DAY 3 · most focused, and tell it ─────────────────────────
  {
    key: "ing-c3-w1-d3",
    title: "Adverbs, conjunctions, prepositions and interjections",
    mppe: [
      { id: "len-esc-03", label: "I write short English sentences with the right word groups." },
      { id: "len-ora-05", label: "I say the nine groups of words aloud clearly." },
    ],
    memoryPhrase:
      "Noun, pronoun, verb, adjective, adverb, preposition, conjunction, interjection, and the articles a, an, the: 9 groups.",
    units: [
      {
        h: "Point 1: Review of the last class",
        a: [
          "Last class you studied nouns, verbs,",
          "pronouns, articles and adjectives.",
          "Today we finish the team on Mount Ávila.",
        ],
      },
      {
        q: [
          "The team climbs Mount Ávila. How do you",
          "say that they climb without hurry?",
        ],
        h: "Point 2: An adverb tells how",
        a: [
          "You say: “The team climbs slowly.”",
          "“Slowly” is an adverb (adverbio).",
          "It tells how. Others tell when: “today”.",
        ],
      },
      {
        q: [
          "Join “I climb” and “I am tired”. Which",
          "small word goes in the middle?",
        ],
        h: "Point 3: A conjunction joins ideas",
        a: [
          "You say: “I climb, but I am tired.”",
          "“But” is a conjunction (conjunción).",
          "“And” adds and “or” gives a choice.",
        ],
      },
      {
        q: [
          "Fill in: “Sofia climbs ___ her friend.”",
          "What changes with “with”? And “without”?",
        ],
        h: "Point 4: A preposition links words",
        a: [
          "“With her friend”: they climb together.",
          "“Without her friend”: Sofia climbs alone.",
          "“With” is a preposition (preposición).",
        ],
      },
      {
        q: [
          "You reach the top of Mount Ávila. What",
          "do you shout when you feel happy?",
        ],
        h: "Point 5: An interjection shows feeling",
        a: [
          "You can shout “Wow!” or “Yay!”",
          "They are interjections (interjecciones):",
          "they show a feeling right away.",
        ],
      },
      {
        q: [
          "Back home, you tell your family about",
          "the nine groups. How do you order it?",
        ],
        h: "Point 6: Tell it in order",
        a: [
          "First say hello. Then name the groups:",
          "noun, pronoun, verb, adjective, adverb,",
          "preposition, conjunction, interjection,",
          "and the articles a, an, the: 9 groups.",
          "Last, say thank you.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "In “climbs slowly”, which tells how?", o: ["slowly", "climbs", "the", "team"] },
        { q: "What kind of word is “today”?", o: ["An adverb", "An adjective", "An article", "A verb"] },
        { q: "What kind of word is “but”?", o: ["A conjunction", "A preposition", "An interjection", "An adverb"] },
        { q: "Which word gives a choice?", o: ["or", "and", "but", "Wow!"] },
        { q: "In “with her friend”, what is “with”?", o: ["A preposition", "A conjunction", "A verb", "An adverb"] },
        { q: "“Without her friend” means…", o: ["Sofia climbs alone.", "They climb together.", "Sofia goes to sleep.", "Sofia calls her friend."] },
        { q: "Which is an interjection?", o: ["Wow!", "with", "but", "slowly"] },
        { q: "How many groups did you learn?", o: ["Nine", "Five", "Seven", "Twelve"] },
      ],
      write: [
        "Write two sentences: one with “but”, one with “today”.",
        "Tell in order the nine groups of words.",
      ],
      schematic: [
        "Draw three boxes: conjunction, preposition, interjection.",
        "Draw yourself telling the nine groups.",
      ],
    },
    image: [
      "Draw four speech bubbles and name them:",
      "adverb, conjunction, preposition and",
      "interjection. Write an example in each",
      "and leave space for your own sentence.",
    ],
    summary:
      "Adverbs, conjunctions, prepositions and interjections complete the nine groups, and you can tell them in order.",
  },
];
