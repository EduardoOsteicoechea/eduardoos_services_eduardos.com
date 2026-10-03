/**
 * Inglés · ciclo 3 · semana 2 · nivel 6 — v3 (3 días) + v3b (se enseña EN INGLÉS).
 * Espeja a esp semana 2 (los tiempos del verbo) en su equivalente en inglés:
 * simple present, simple past, simple future, past continuous, present perfect.
 * Hito de Venezuela (solo en preguntas y respuestas, NO en la imagen): Teleférico de Mérida
 * (sube por tramos, con estaciones, hacia las alturas de la sierra).
 * d1 panorama (una palabra / más palabras) · d2 pasado, continuo y perfecto de cerca
 * · d3 elegir el tiempo con pistas y contarlo.
 */
export default [
  // ───────────────────────── DAY 1 ─────────────────────────
  {
    key: "ing-c3-w2-d1",
    title: "English verb tenses: the big picture",
    mppe: [
      { id: "len-lec-06", label: "I name the English verb tenses on a timeline." },
      { id: "len-lec-05", label: "I say simple present, past and future aloud." },
    ],
    memoryPhrase: "One word: I sing, I sang. More words: I will sing, I was singing, I have sung.",
    units: [
      {
        h: "Point 1: Review of the last class",
        a: [
          "Last week you learned that a verb is",
          "an action word, like sing, run or eat.",
          "Today we ride the Mérida cable car.",
        ],
      },
      {
        q: [
          "The Mérida cable car climbs in sections.",
          "How does a verb tell us when it happens?",
        ],
        h: "Point 2: A verb tells us when",
        a: [
          "Each station is a different time:",
          "before, now and later. The verb changes",
          "to show it. These are tenses (tiempos).",
        ],
      },
      {
        q: [
          "You stand at a station and you sing.",
          "What do you say now? And yesterday?",
        ],
        h: "Point 3: One-word tenses",
        a: [
          "Now you say “I sing”: simple present.",
          "Before, you say “I sang”: simple past.",
          "Both tenses use only one word.",
        ],
      },
      {
        q: [
          "Tomorrow you ride the cable car again.",
          "How do you say that you will sing?",
        ],
        h: "Point 4: Simple future",
        a: [
          "You add the helper word will:",
          "“I will sing” is the simple future.",
          "The verb after will does not change.",
        ],
      },
      {
        q: [
          "Some trips need two sections. Can a verb",
          "use two or three words to tell when?",
        ],
        h: "Point 5: Helper words",
        a: [
          "“I was singing”: past continuous.",
          "“I have sung”: present perfect.",
          "Was and have are helper verbs.",
        ],
      },
      {
        q: [
          "Look at the five tenses together.",
          "Which use one word, which use more?",
        ],
        h: "Point 6: One word or more words",
        a: [
          "One word: I sing, I sang.",
          "More words: I will sing, I was singing,",
          "I have sung.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "Which sentence is the simple present?", o: ["I sing", "I sang", "I will sing", "I have sung"] },
        { q: "Which sentence is the simple past?", o: ["I sang", "I sing", "I will sing", "I was singing"] },
        { q: "Which helper word makes the future?", o: ["will", "was", "have", "sang"] },
        { q: "How many words are in “I sing”?", o: ["One", "Two", "Three", "Four"] },
        { q: "Which tense is “I was singing”?", o: ["Past continuous", "Simple past", "Simple future", "Present perfect"] },
        { q: "In “I have sung”, which is the helper?", o: ["have", "sung", "I", "sing"] },
        { q: "Which tense is “I have sung”?", o: ["Present perfect", "Simple past", "Simple present", "Past continuous"] },
        { q: "In the cable car story, what is a station?", o: ["A different time", "A letter", "A new verb", "A sentence"] },
      ],
      write: [
        "Write sing for before, now and later.",
        "Tell in your words what a helper verb is.",
      ],
      schematic: [
        "Draw a timeline: before, now and later.",
        "Draw two boxes: one word and more words.",
      ],
    },
    image: [
      "Draw a timeline with three big boxes:",
      "before, now and later. Write I sang,",
      "I sing and I will sing inside them.",
      "Add one empty box for a have sentence.",
    ],
    summary: "A verb tells us when: I sing, I sang, I will sing, I was singing, I have sung.",
  },

  // ───────────────────────── DAY 2 ─────────────────────────
  {
    key: "ing-c3-w2-d2",
    title: "Past, continuous and perfect up close",
    mppe: [{ id: "len-lec-05", label: "I compare I sang, I was singing and I have sung." }],
    memoryPhrase: "Simple past: I sang. Past continuous: I was singing. Present perfect: I have sung.",
    units: [
      {
        h: "Point 1: Review of the last class",
        a: [
          "Last class you met five tenses: one",
          "word and more words. Today we study",
          "three of them on the Mérida cable car.",
        ],
      },
      {
        q: [
          "You left the first station of the",
          "Mérida cable car. How do you say it?",
        ],
        h: "Point 2: Simple past",
        a: [
          "“I sang”: the action is finished.",
          "It is a station you already left.",
          "Add -ed (walked) or change: sing, sang.",
        ],
      },
      {
        q: [
          "While the Mérida cable car climbed, you",
          "sang for a long time. Which tense?",
        ],
        h: "Point 3: Past continuous",
        a: [
          "Use was or were + a verb with -ing.",
          "“I was singing”, “they were singing”.",
          "It is the ride between two stations.",
        ],
      },
      {
        q: [
          "You are at the top station now.",
          "How do you say what you have done?",
        ],
        h: "Point 4: Present perfect",
        a: [
          "Use have or has + a past participle.",
          "“I have sung”: you are at the top now.",
          "The result is still here today.",
        ],
      },
      {
        q: [
          "I have walked, but I have sung. Why?",
          "How do you make the past participle?",
        ],
        h: "Point 5: The past participle",
        a: [
          "Regular verbs add -ed: walk, walked.",
          "Irregular: sing, sang, sung.",
          "Also: eat, ate, eaten.",
        ],
      },
      {
        q: [
          "You say “I have sung”. What about Ana?",
          "Is it “Ana have sung” or “Ana has sung”?",
        ],
        h: "Point 6: Have or has?",
        a: [
          "I, you, we and they use have.",
          "He, she and it use has.",
          "“Ana has sung” is correct.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "Which tense is “I sang”?", o: ["Simple past", "Past continuous", "Present perfect", "Simple future"] },
        { q: "Which words go before a verb with -ing?", o: ["was or were", "will", "have or has", "sang"] },
        { q: "Which is the past continuous?", o: ["They were singing", "They sang", "They will sing", "They have sung"] },
        { q: "Which words make the present perfect?", o: ["have or has + participle", "was + -ing", "will + verb", "only -ed"] },
        { q: "What is the past participle of “walk”?", o: ["walked", "walking", "walks", "walkes"] },
        { q: "What is the past participle of “sing”?", o: ["sung", "sang", "singed", "sing"] },
        { q: "Which sentence is correct?", o: ["Ana has sung.", "Ana have sung.", "Ana has sing.", "Ana haves sung."] },
        { q: "What does “I sang” tell us?", o: ["The action is finished", "It is still going", "It will happen later", "It has no time"] },
      ],
      write: [
        "Write a sentence using was singing.",
        "Write have or has with sung for I and Ana.",
      ],
      schematic: [
        "Draw three cards: sang, was singing, have sung.",
        "Draw a table: sing, sang and sung.",
      ],
    },
    image: [
      "Draw three cards in a row. Write I sang,",
      "I was singing and I have sung.",
      "Under each card, leave a blank line",
      "for your own sentence with that tense.",
    ],
    summary: "I sang is finished, I was singing was going on, and I have sung links before with today.",
  },

  // ───────────────────────── DAY 3 ─────────────────────────
  {
    key: "ing-c3-w2-d3",
    title: "Choose the tense and tell it",
    mppe: [{ id: "len-lec-06", label: "I choose the right tense with clue words." }],
    memoryPhrase: "Ask: When? Is it going on? Is it done?",
    units: [
      {
        h: "Point 1: Review of the last class",
        a: [
          "Last class you studied the simple past,",
          "the continuous and the perfect. Today",
          "you pick the tense with clue words.",
        ],
      },
      {
        q: [
          "Yesterday you rode the Mérida cable car.",
          "Compare “Yesterday I sang” and “I sing",
          "every day”. What tells you the tense?",
        ],
        h: "Point 2: Clue words",
        a: [
          "Yesterday and last week: simple past.",
          "Every day and now: simple present.",
          "Clue words show you which station.",
        ],
      },
      {
        q: [
          "Tomorrow you ride the Mérida cable car",
          "again. Which clue word and tense?",
        ],
        h: "Point 3: Clues for the future",
        a: [
          "Tomorrow and next week: simple future.",
          "“I will ride the cable car tomorrow.”",
          "Will goes before the verb.",
        ],
      },
      {
        q: [
          "You were riding when your phone rang.",
          "Which action is long? Which is short?",
        ],
        h: "Point 4: Long and short actions",
        a: [
          "Was riding is the long action.",
          "Rang is the sudden one: simple past.",
          "“I was riding when the phone rang.”",
        ],
      },
      {
        q: [
          "Compare “I finished yesterday” and",
          "“I have already finished”. What changed?",
        ],
        h: "Point 5: Already and just",
        a: [
          "Already and just: present perfect.",
          "The trip is done, and you are here now.",
          "“I have already finished the trip.”",
        ],
      },
      {
        q: [
          "Be a guide of the Mérida cable car.",
          "How do you pick and tell each tense?",
        ],
        h: "Point 6: Pick and tell",
        a: [
          "Ask: When? Is it going on? Is it done?",
          "Choose the tense, then say the clue word",
          "and a sentence, like a good guide.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "What tense goes with “yesterday”?", o: ["Simple past", "Simple future", "Present perfect", "Simple present"] },
        { q: "Which clue word goes with the future?", o: ["tomorrow", "yesterday", "already", "last week"] },
        { q: "Which clue word shows the simple present?", o: ["every day", "yesterday", "tomorrow", "already"] },
        { q: "Which action is long: riding or rang?", o: ["Was riding", "Rang", "Both", "Neither"] },
        { q: "Which action is short and sudden?", o: ["Rang", "Was riding", "Will ride", "Every day"] },
        { q: "Which words point to the present perfect?", o: ["already and just", "yesterday", "tomorrow", "last week"] },
        { q: "Which sentence is the simple future?", o: ["I will ride the cable car tomorrow.", "I rode the cable car yesterday.", "I have finished the trip.", "I was riding the cable car."] },
        { q: "What is the first question to ask?", o: ["When?", "Where?", "Who?", "Why?"] },
      ],
      write: [
        "Write a sentence with the clue word yesterday.",
        "Write a sentence with the clue word already.",
      ],
      schematic: [
        "Draw a chart: clue words and their tenses.",
        "Draw a line: was riding and rang.",
      ],
    },
    image: [
      "Draw a clue-word chart with four rows:",
      "yesterday, every day, tomorrow, already.",
      "Next to each, draw an empty box for",
      "the tense and a short sentence.",
    ],
    summary: "Look at the clue word and ask: When? Is it going on? Is it done? Then pick the tense.",
  },
];
