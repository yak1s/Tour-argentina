import type { Puzzle } from './types';

/**
 * Every challenge of the hunt. Each one can be solved two ways: by looking at
 * the real place, or from information in the app (the narration, the chapter
 * text and the hints). Nothing depends on a shop being open, a passer-by, an
 * employee, a vehicle, a time of day, or a feature that may stop working.
 *
 * Answer checking lives in engine/answers.ts and is unit-tested against these
 * definitions in tests/unit/puzzles.test.ts.
 */
export const PUZZLES: Record<string, Puzzle> = {
  'p-corner': {
    id: 'p-corner',
    chapter: 'prologue',
    type: 'text',
    title: 'Read the corner',
    prompt: 'One street on this corner carries the name of a man who signed the Declaration of Independence in 1816. What is his surname?',
    setup: [
      'Find the street signs on the corner posts or building walls.',
      'One street is Avenida Córdoba — the name of a city and province in the centre of the country.',
      'The other street honours a person.',
    ],
    intended: 'Tutorial: read a street sign, learn how answers and hints work. Answer: Gallo (Pedro León Gallo).',
    fallback: 'If you can’t see a sign, the corner’s name is on this screen: Córdoba y Gallo.',
    placeholder: 'Surname',
    accept: ['Gallo', 'Pedro León Gallo', 'Pedro Gallo', 'P. L. Gallo'],
    near: [
      { match: ['Córdoba', 'Cordoba', 'Avenida Córdoba'], reply: 'That’s the avenue, named after a place. Try the other street.' },
      { match: ['Delfín Gallo', 'Delfin Gallo'], reply: 'Right surname, different man — and you only need the surname.' },
    ],
    hints: [
      'The corner is called “Córdoba y Gallo”.',
      'Córdoba is a place. The other name is the person.',
      'Type: Gallo',
    ],
    solution:
      'Gallo — Pedro León Gallo, deputy for Santiago del Estero at the Congress of Tucumán, who signed the Act of Independence on 9 July 1816.',
    success: 'That’s how it works. Every corner in this city has something to say.',
    solvedNarration: 'prologue-solved',
  },

  'p-key': {
    id: 'p-key',
    chapter: 'key',
    type: 'code',
    title: 'The key',
    prompt: 'Every hunt needs a key. Yours is written on this building. Enter it.',
    setup: [
      'Stand on the opposite sidewalk — it’s a private building.',
      'Find the street number near the entrance.',
    ],
    intended: 'Observation of the street number. The number becomes the cipher key used in San Telmo. Answer: 1412.',
    fallback: 'If the number isn’t visible, the address on this screen is the key.',
    code: '1412',
    hints: ['Look near the door for the street number.', 'It is the address you came to.', '1 – 4 – 1 – 2'],
    solution: 'The key is 1412, the street number. You will use it to decode a message later in the day.',
    success: 'Key found. Keep it safe — it’s in your journal.',
    solvedNarration: 'key-solved',
  },

  'p-architects': {
    id: 'p-architects',
    chapter: 'architects',
    type: 'order',
    title: 'Three architects',
    prompt: 'Three architects built this theatre over almost twenty years. Put them in order.',
    setup: [
      'Stand facing the main entrance on Libertad (the trees of Plaza Lavalle behind you).',
      'Listen to the story, or read the three clue cards.',
      'Tap a name, then tap the slot where it belongs.',
    ],
    intended:
      'Historical inference: Tamburini died early in the works (c. 1890–91), Meano was killed in 1904 before the 1908 opening, Dormal lived to see it open. Order: Tamburini, Meano, Dormal.',
    fallback: 'The challenge needs only the clue cards; the building is a bonus.',
    slots: ['Drew the first plans', 'Took over and reshaped them', 'Finished the building'],
    items: [
      { id: 'dormal', label: 'Jules Dormal', detail: 'Belgian' },
      { id: 'tamburini', label: 'Francesco Tamburini', detail: 'Italian' },
      { id: 'meano', label: 'Vittorio Meano', detail: 'Italian' },
    ],
    correct: ['tamburini', 'meano', 'dormal'],
    clues: [
      'Tamburini — who also designed the great central arch of the Casa Rosada — died suddenly only months into the work.',
      'Meano had been Tamburini’s collaborator. He also designed the National Congress, and was shot dead in his own home in 1904, four years before opening night.',
      'Dormal, the Belgian, gave the building its French decoration — and lived to see it open on 25 May 1908.',
    ],
    hints: [
      'Who could have started it? Someone who died early cannot have finished it.',
      'Tamburini died months after work began, so he drew the first plans.',
      'Tamburini → Meano → Dormal.',
    ],
    solution:
      'Francesco Tamburini drew the first plans; after his sudden death, Vittorio Meano took over and reshaped them; after Meano’s murder in 1904, Jules Dormal finished the building, which opened on 25 May 1908 with Verdi’s Aida.',
    success: 'Three men, one theatre — and only one of them lived to see it open.',
    solvedNarration: 'architects-solved',
  },

  'p-foundings': {
    id: 'p-foundings',
    chapter: 'foundings',
    type: 'number',
    title: 'Two births',
    prompt: 'The city was founded twice, and the Obelisco remembers both. How many years passed between the two foundings?',
    setup: [
      'Stay on the pedestrian plaza around the Obelisco.',
      'Walk around it and read the inscriptions on its faces: each carries a year.',
      'Find the two faces that remember a founding.',
    ],
    intended: 'Observation of the face inscriptions (1536 and 1580) plus subtraction. Answer: 44.',
    fallback: 'If the inscriptions are hard to read (glare, crowds, fencing), the two years are in the chapter story: Pedro de Mendoza in 1536, Juan de Garay in 1580.',
    answer: 44,
    unit: 'years',
    near: [
      { value: 39, reply: 'That’s how long the site stood without a town (1541–1580). The question is about the two founding years.' },
      { value: 400, reply: 'That’s the anniversary the Obelisco celebrated. Compare the two founding years.' },
      { value: 1536, reply: 'That’s the first founding. How many years until the second?' },
      { value: 1580, reply: 'That’s the second founding. How many years after the first?' },
      { value: 5, reply: 'That’s how long the first town lasted. How long between the two foundings?' },
    ],
    hints: [
      'One face remembers Pedro de Mendoza’s founding; another remembers Juan de Garay’s.',
      'The years are 1536 and 1580.',
      '1580 − 1536.',
    ],
    solution: 'Forty-four years: Pedro de Mendoza founded the first settlement in 1536; it was abandoned in 1541; Juan de Garay founded the city again in 1580.',
    success: 'Born twice, forty-four years apart.',
    solvedNarration: 'foundings-solved',
  },

  'p-arches': {
    id: 'p-arches',
    chapter: 'arches',
    type: 'number',
    title: 'The missing arches',
    prompt: 'When it was finished, the Cabildo’s front had eleven arches. Count how many are left on its ground floor. How many did the avenues take?',
    setup: [
      'From the Pirámide, face the white colonial building with arches on the west side of the square — the Cabildo (the pink Casa Rosada will be behind you).',
      'Count the arches across the ground floor, including the one under the tower.',
    ],
    intended: 'Observation (five ground-floor arches remain) plus subtraction from the eleven in the story. Answer: 6.',
    fallback: 'If the façade is covered by scaffolding or crowds, use the hints: five arches remain today.',
    answer: 6,
    unit: 'arches',
    near: [
      { value: 5, reply: 'That’s how many are left. How many did the avenues take?' },
      { value: 11, reply: 'That’s how many there were. How many are gone?' },
      { value: 3, reply: 'That’s what each avenue took. How many altogether?' },
      { value: 10, reply: 'Count the ground floor only — one row of arches.' },
    ],
    hints: [
      'Count one row: the ground floor. Include the arch under the central tower.',
      'There are five left.',
      '11 − 5.',
    ],
    solution: 'Six. Of eleven arches, five remain: Avenida de Mayo cut away three on the north side in 1889, and Diagonal Sur three on the south side in 1931.',
    success: 'Two avenues, six arches. The city reshaped its own past to make room for traffic.',
    solvedNarration: 'arches-solved',
  },

  'p-message': {
    id: 'p-message',
    chapter: 'fever',
    type: 'cipher',
    title: 'The message in the market',
    prompt: 'I left you a message in code. Decode it with the key you found on Ayacucho street.',
    setup: [
      'Find somewhere to sit — this one takes a few minutes, and the market is open all day.',
      'Each digit of the key tells you how many letters to step BACK in the alphabet.',
      'Use the digits in order, one per letter, and start again after the fourth. Spaces don’t use a digit.',
    ],
    intended: 'Simple numeric shift cipher (Vigenère-style) using the key 1412 from chapter 1, connecting two stops. Decoded: I AM NOT A PERSON — the mid-story revelation.',
    fallback: 'Purely in-app; nothing physical is needed. If you skipped Ayacucho, the key is 1412.',
    ciphertext: 'J EN PPX B RFVTQO',
    key: [1, 4, 1, 2],
    plaintext: 'I AM NOT A PERSON',
    accept: ['I am not a person', 'Im not a person', 'Not a person'],
    placeholder: 'Decoded message',
    hints: [
      'The key is 1412. Step back 1 letter, then 4, then 1, then 2, then repeat: 1, 4, 1, 2…',
      'J − 1 = I. E − 4 = A. N − 1 = M. The first two words are “I AM”.',
      'The message is: I AM NOT A PERSON.',
    ],
    solution: 'J EN PPX B RFVTQO, stepped back by 1-4-1-2, reads: I AM NOT A PERSON.',
    success: 'So the narrator is not a person. Then what?',
    solvedNarration: 'fever-solved',
  },

  'p-tale': {
    id: 'p-tale',
    chapter: 'colours',
    type: 'choice',
    title: 'Three truths and a tale',
    prompt: 'Three of these are true. One is a story. Walk the street, look around, and find the tale.',
    setup: [
      'Listen to the narration (or read the four statements below).',
      'Check what you can with your own eyes: the shape of the street, the walls, the river.',
      'Stay on Caminito and the riverside walk.',
    ],
    intended:
      'Audio clue + observation + deduction: three statements are checkable on site (the curve, the corrugated-metal walls, the transporter bridge visible from Vuelta de Rocha); the fourth (the tango) cannot be seen and is false — the lyrics describe a path in Olta, La Rioja.',
    fallback: 'If you can’t walk the whole street, the bridge and the walls are visible from the Vuelta de Rocha end; the hints point the way.',
    options: [
      { id: 'railway', label: 'Caminito curves because it follows the line of an old railway.' },
      { id: 'metal', label: 'The first houses here were built of wood and corrugated metal.' },
      { id: 'tango', label: 'The tango “Caminito” was written about this very street.' },
      { id: 'bridge', label: 'From the riverside you can see a giant iron bridge from 1914 that carried people across in a hanging gondola.' },
    ],
    correct: 'tango',
    feedback: {
      railway: 'Walk it — it really does curve. It follows a disused railway stretch nicknamed “La Curva”. That one is true.',
      metal: 'Look at the walls: wood and sheets of corrugated metal. True.',
      bridge: 'Look down the river from the Vuelta de Rocha: the Puente Transbordador, opened in 1914. True.',
    },
    hints: [
      'Three of the statements can be checked with your eyes. One can’t.',
      'The street curves, the walls are corrugated metal, and the iron bridge is down the river. What’s left?',
      'The tale is the tango.',
    ],
    solution:
      'The tango is the tale. “Caminito” (1926: music by Juan de Dios Filiberto, lyrics by Gabino Coria Peñaloza) describes a path in Olta, in La Rioja province. The street took the song’s name because Filiberto was from La Boca and his friend Quinquela Martín pushed for it.',
    success: 'Well spotted. This neighbourhood is full of good stories; not all of them are true.',
    solvedNarration: 'colours-solved',
  },

  'p-tiles': {
    id: 'p-tiles',
    chapter: 'garden',
    type: 'text',
    title: 'The tiles of Seville',
    prompt: 'The tiles of the Andalusian Patio illustrate one of the most famous novels ever written. Which one?',
    setup: [
      'Find the Patio Andaluz, the tiled patio given by the city of Seville (near the lake).',
      'Study the blue-and-white scenes on the tiles: look for the characters who keep appearing.',
    ],
    intended: 'Visual recognition: a thin knight on a bony horse and a short squire on a donkey — Don Quixote. Answer: Don Quixote.',
    fallback:
      'If the garden is closed (Mondays, bad weather) or the patio is fenced off, use the hints: the scenes show a lanky knight in armour and his round squire.',
    placeholder: 'Title of the novel',
    accept: [
      'Don Quixote',
      'Don Quijote',
      'Quixote',
      'Quijote',
      'El Quijote',
      'Don Quixote de la Mancha',
      'Don Quijote de la Mancha',
      'El ingenioso hidalgo don Quijote de la Mancha',
    ],
    near: [
      { match: ['Cervantes', 'Miguel de Cervantes'], reply: 'That’s the author. Now name the novel.' },
      { match: ['Sancho', 'Sancho Panza'], reply: 'That’s the squire! Name the book he’s in.' },
      { match: ['Dulcinea'], reply: 'The lady of his dreams — name the novel.' },
      { match: ['Martín Fierro', 'Martin Fierro'], reply: 'Argentina’s great poem — but these tiles come from Seville. Look for a knight.' },
      { match: ['La Mancha'], reply: 'That’s where he comes from. Name the novel.' },
    ],
    hints: [
      'Look for a tall, thin knight on a bony horse, and a short, round companion on a donkey.',
      'The novel was written by Miguel de Cervantes and published in 1605.',
      'Don ______.',
    ],
    solution: 'Don Quixote. The tiles, made in Triana — the potters’ quarter of Seville — show scenes from Cervantes’ novel.',
    success: 'A Spanish knight in a garden on the far side of the ocean.',
    solvedNarration: 'garden-solved',
  },

  'p-silver': {
    id: 'p-silver',
    chapter: 'flower',
    type: 'text',
    title: 'The colour of my name',
    prompt: '“They made this flower the colour of my name.” What colour is that?',
    setup: [
      'Walk around the reflecting pool and look at the petals in the light.',
      'Name the colour of the metal — in English or Spanish.',
    ],
    intended: 'Observation (the brushed stainless-steel/aluminium shine) + deduction: silver, “plata” — the name of the Río de la Plata.',
    fallback: 'If the plaza is fenced or it is dark, the hints describe the flower.',
    placeholder: 'A colour',
    accept: ['Silver', 'Plata', 'Silvery', 'Plateado', 'Argent', 'Argentum', 'Silver colour', 'Silver color'],
    near: [
      { match: ['Steel', 'Stainless steel', 'Aluminium', 'Aluminum', 'Metal', 'Chrome', 'Acero', 'Aluminio'], reply: 'That’s what she’s made of. What colour does that shine look like?' },
      { match: ['Grey', 'Gray', 'Gris'], reply: 'Close — think of a more precious word for that shine.' },
      { match: ['White', 'Blanco'], reply: 'Look again: it shines. A precious metal’s colour.' },
      { match: ['Blue', 'Sky blue', 'Azul', 'Celeste'], reply: 'That’s the sky in the reflection. What colour is the metal itself?' },
      { match: ['Gold', 'Golden', 'Oro'], reply: 'A precious metal, yes — but not that one.' },
    ],
    hints: [
      'It’s the colour of a precious metal.',
      'Not gold. The other one.',
      'Silver — in Spanish, plata.',
    ],
    solution: 'Silver — plata in Spanish. Hold on to that word.',
    success: 'Silver. Plata. You’re very close now.',
    solvedNarration: 'flower-solved',
  },

  'p-voice': {
    id: 'p-voice',
    chapter: 'finale',
    type: 'elimination',
    title: 'Who has been speaking?',
    prompt: 'Read the narrator’s nine true things in your journal. Cross out every suspect who couldn’t have said them all. Who is left?',
    setup: [
      'Open the journal’s “Threads” to re-read the narrator’s lines.',
      'Tap a suspect to cross it out; tap again to bring it back.',
      'When one remains, choose it.',
    ],
    intended:
      'Final synthesis by elimination using the threads: not a person (the coded message), older than the streets, watched both founders arrive (rules out the city, Garay, the Obelisco), has water (rules out the wind), is the colour of silver. Answer: the Río de la Plata.',
    fallback: 'All the threads are in the journal, including those from skipped stops.',
    candidates: [
      { id: 'porteno', label: 'A lifelong porteño', detail: 'Someone born and raised in Buenos Aires' },
      { id: 'garay', label: 'Juan de Garay', detail: 'The founder who stayed, in 1580' },
      { id: 'city', label: 'Buenos Aires itself', detail: 'The city, speaking for itself' },
      { id: 'wind', label: 'The wind', detail: 'The “good airs” of the city’s name' },
      { id: 'obelisco', label: 'The Obelisco', detail: 'The city’s white needle, 1936' },
      { id: 'river', label: 'The Río de la Plata', detail: 'The river of silver' },
    ],
    correct: 'river',
    feedback: {
      porteno: 'The coded message in San Telmo said it plainly: “I am not a person.” And no one alive watched the ships of 1536 arrive.',
      garay: 'Garay was a person — and he arrived in 1580, so he couldn’t have watched the first founder, Pedro de Mendoza, arrive in 1536.',
      city: 'The city can’t have watched its own founders arrive — it didn’t exist yet. And at La Boca, the narrator said “the city opens its mouth to me”.',
      wind: 'The wind has no water to touch a fort’s walls, and no bluff above its shore. Read the Plaza de Mayo and San Telmo threads again.',
      obelisco: 'The Obelisco went up in 1936. The narrator watched both founders arrive, almost four centuries earlier.',
    },
    hints: [
      'Start with the coded message from San Telmo: it rules out two suspects at once.',
      'Who could have watched both founders arrive, in 1536 and 1580 — and has water, and a shore?',
      'The river of silver: the Río de la Plata.',
    ],
    solution:
      'The narrator is the Río de la Plata — the River of Silver. Older than every street, never walked one, watched Mendoza (1536) and Garay (1580) arrive, once touched the fort where the Casa Rosada stands, lies below San Telmo’s bluff, meets the Riachuelo at La Boca, carried Seville’s tiles, and gives its name — silver — to the flower’s colour and to the country.',
    success: 'Yes. The river.',
    solvedNarration: 'finale-letter',
  },
};

export const PUZZLE_IDS = Object.keys(PUZZLES);
