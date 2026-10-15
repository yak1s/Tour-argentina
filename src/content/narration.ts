import type { NarrationClip } from './types';

/**
 * Narration scripts. Audio files are rendered from these scripts by
 * scripts/tts/build_narration.py and bundled in public/audio/narration.
 *
 * Markup (removed from the visible transcript):
 *   [[Teatro Colón]]           pronounced in Rioplatense Spanish
 *   [[shown|spoken]]           shows "shown", pronounces "spoken" in Spanish
 *   [[shown|/IPA/]]            shows "shown", uses the given phonemes
 *   {{shown|spoken}}           shows "shown", pronounces "spoken" in English
 * Paragraph breaks (blank lines) become longer pauses.
 *
 * The narrator never lies: every first-person statement is literally true of
 * the Río de la Plata. That is the fair-play rule of the mystery.
 */
export const NARRATION: Record<string, NarrationClip> = {
  'prologue-welcome': {
    id: 'prologue-welcome',
    chapter: 'prologue',
    title: 'Good morning, you two',
    kind: 'intro',
    script: `Good morning, you two.

Almost five hundred years ago, a fleet of ships came up a wide, brown river, looking for a mountain of silver that people swore was somewhere upstream. I watched them arrive.

I'm not going to tell you who I am. Not yet. That's the game.

Today I'll take you to nine places in this city. Each one hides something: a monument inside another monument, a town hall cut in half by its own avenues, a park named after the day its owner lost everything. You'll find them by looking, really looking, and by talking to each other. Two pairs of eyes are better than one. I'm counting on that.

At every stop there's one challenge. If you get stuck, ask for a hint. If a place is closed, or crowded, or simply not worth the trouble, skip it. The story will wait for you. And at every stop, I'll tell you one true thing about myself. Collect them. By the time you're back on this corner tonight, you'll know my name.

One rule above all the others: the city comes first. Look up from the screen. Cross only where it's safe. While you're walking, I'll stay quiet unless you ask.

Now, find the street signs on this corner. Let's begin.`,
  },
  'prologue-corner': {
    id: 'prologue-corner',
    chapter: 'prologue',
    title: 'A warm-up',
    kind: 'puzzle',
    script: `Here's a warm-up, so you can see how this works.

You're standing on a corner where three [[barrios]] meet: [[Recoleta]] to the north, [[Balvanera]] and [[Almagro]] to the south. One of the two streets carries the name of [[Córdoba]], a city and province in the middle of the country. The other is named after a man who, in eighteen sixteen, signed the declaration that made this country independent.

Read the signs, and type his surname. If you can't see a sign, don't worry: the answer is already on your screen.`,
  },
  'prologue-solved': {
    id: 'prologue-solved',
    chapter: 'prologue',
    title: 'Gallo',
    kind: 'solved',
    script: `[[Gallo]]. [[Pedro León Gallo]], who signed the Act of Independence in [[Tucumán]] in July, eighteen sixteen. Keep that habit of reading the corners. This city writes its memory on its street signs.

Here's the first true thing about me: I've been here longer than anyone you'll meet today. Longer than every street on this corner.

Your first stop is a quiet address in [[Recoleta]]. It's a short taxi ride. Off you go.`,
  },
  'key-story': {
    id: 'key-story',
    chapter: 'key',
    title: 'An ordinary address',
    kind: 'story',
    script: `This is [[Ayacucho]], number {{1412|fourteen twelve}}. It's a private building, so please don't ring any bells. There's nothing here you need to enter. Stand across the street, and look for the number by the door.

You might wonder why a treasure hunt would stop at an ordinary address. Here's the honest answer: every hunt needs a key, and the best keys look like nothing at all. Yours is written on that wall.

While you look, a word about the street. [[Ayacucho]] isn't a person. It's a place in the Peruvian Andes where, on the ninth of December, eighteen twenty-four, the last great battle of South America's wars of independence was fought. In eighteen twenty-two, this city renamed many of its streets after the battles and the new nations of those years. You'll be reading history off the corners all day.

When you've found the key, type it in. Then keep it somewhere safe. You'll need it later.`,
  },
  'key-solved': {
    id: 'key-solved',
    chapter: 'key',
    title: 'The key',
    kind: 'solved',
    script: `One, four, one, two. That's your key.

Here's something curious. Add the digits together, and you get eight. And after this stop, there are exactly eight chapters left. Pure coincidence, but I'll take it.

The second true thing about me: I have never walked down a single one of these streets. Not one.

Next, one of the great opera houses of the world. It's about twenty-five minutes on foot, if you'd like the walk.`,
  },
  'architects-story': {
    id: 'architects-story',
    chapter: 'architects',
    title: 'Three men, one theatre',
    kind: 'story',
    script: `Stand back far enough to take in the whole front of the building. The trees of [[Plaza Lavalle]] are a good spot.

This is the [[Teatro Colón]]. It opened on the twenty-fifth of May, nineteen-oh-eight, with Verdi's {{Aida|/aɪˈiːdə/}}, after almost twenty years of building, and three architects.

The first, [[Francesco Tamburini|Franchesco Tamburini]], drew the original plans. He had already left his mark on this city: the great central arch of the [[Casa Rosada]] is his. He died suddenly, only months into the work.

His collaborator, [[Vittorio Meano|Vitorio Meano]], took over and reshaped the design. Meano also designed the National Congress. In nineteen-oh-four, four years before opening night, he was shot dead in his own home.

The third, a Belgian named Jules Dormal, finished the job, and gave the building its French decoration. Look at the front: an Italian Renaissance structure, dressed in French ornament. More than one pair of hands, in a single facade.

Was it worth it? In a survey published in the year two thousand by the acousticians Hidaka and Beranek, conductors ranked the [[Colón]] first among the opera houses they studied.

And here's what the city hides. The theatre doesn't stop at its walls. Its workshops, where the sets and costumes are made, lie underground, beneath the small plaza right next door. A whole working city under the pavement.

Your challenge: put the three architects in order. And while you do, think about this. There was an older [[Teatro Colón]], with the same name, on a different spot entirely. You'll walk past it before lunch.`,
  },
  'architects-solved': {
    id: 'architects-solved',
    chapter: 'architects',
    title: 'Only one lived to see it',
    kind: 'solved',
    script: `[[Tamburini]] began it. [[Meano]] reshaped it. Dormal finished it. Of the three, only Dormal lived to see it open.

The third true thing about me: the first [[Teatro Colón]] stood just a couple of blocks from my edge. When you reach [[Plaza de Mayo]], look for the big bank across the avenue on its north-east side. That's where it was.

Now, walk two blocks along [[Libertad]] to [[Avenida Corrientes]], and turn left. You'll see it straight away: a white needle in the middle of an avenue so wide it takes two or three green lights to cross. Cross with the lights. All of them.`,
  },
  'foundings-story': {
    id: 'foundings-story',
    chapter: 'foundings',
    title: 'The needle',
    kind: 'story',
    script: `You're at the [[Obelisco]]. Sixty-seven and a half metres of white, in the middle of [[Avenida 9 de Julio|Avenida nueve de julio]]. It went up in nineteen thirty-six, in about two months, designed by the architect [[Alberto Prebisch|/alβˈeɾto pɾeβˈiʃ/]].

Why nineteen thirty-six? Because it was a birthday. Four hundred years earlier, in fifteen thirty-six, a Spanish expedition led by [[Pedro de Mendoza]] founded a settlement on this shore. It didn't last. The settlers went hungry, fought with the people who already lived here, and by fifteen forty-one they had abandoned it. For almost forty years there was no town here at all. Only the people of these plains, and the wind. Then, in fifteen eighty, [[Juan de Garay]] came down the river from [[Asunción]] and founded the city again. That one stayed.

So this city was born twice. And the [[Obelisco]] remembers both births. Walk around it, and look at its faces. Each one carries an inscription, and a year.

Your challenge: find the two years that mark the two foundings, and tell me how many years passed between them.

Two more secrets, while you're here. Inside, a narrow, ladder-like staircase of two hundred and six steps climbs to four small windows at the top. One on each face. And in nineteen thirty-nine, only three years after it went up, the city council voted to tear it down. It never happened. Cities change their minds.`,
  },
  'foundings-solved': {
    id: 'foundings-solved',
    chapter: 'foundings',
    title: 'Born twice',
    kind: 'solved',
    script: `Forty-four years. Fifteen thirty-six to fifteen eighty. The first town lasted five years. The second has lasted almost four and a half centuries.

The fourth true thing about me: I watched both founders arrive. The first one didn't stay.

From here, [[Diagonal Norte]] runs as straight as a ruler to [[Plaza de Mayo]]. Cross to the downtown side of the avenue, find the diagonal, and follow it for about a kilometre. It ends in the oldest square in the city.`,
  },
  'arches-story': {
    id: 'arches-story',
    chapter: 'arches',
    title: 'The square',
    kind: 'story',
    script: `Welcome to [[Plaza de Mayo]]: the square [[Juan de Garay]] laid out in fifteen eighty, and the stage for almost everything that has happened to this country since.

In the middle stands the [[Pirámide de Mayo]], the city's first patriotic monument, raised in eighteen eleven for the first anniversary of the May Revolution. What you see isn't quite what was built, though. In eighteen fifty-six, a new, larger pyramid was built around the old one. The original is still in there. A monument inside a monument.

Look at the ground around it. White headscarves, painted on the paving. From nineteen seventy-seven, the Mothers of [[Plaza de Mayo]] walked in a circle here every Thursday, demanding to know what had happened to their children, who had disappeared under the military dictatorship. The circle is still remembered.

At the far end is the [[Casa Rosada]], the pink house, seat of the presidency. It was once two separate buildings. [[Francesco Tamburini|Franchesco Tamburini]], yes, the first architect of the [[Colón]], joined them with that great central arch. Why pink? Nobody agrees. Some say [[Sarmiento]] chose a colour between the red and the white of two rival parties. Others swear the old paint was mixed with lime and ox blood. Treat them both as stories.

Now turn around, and face the white building with the arches, on the west side. That's the [[Cabildo]], the old colonial town hall, where the May Revolution of eighteen ten played out. When it was finished, its front had eleven arches. Then the city built two avenues, and each one cut straight through it.

Your challenge: count the arches on the ground floor of the [[Cabildo]], and tell me how many the avenues took.`,
  },
  'arches-solved': {
    id: 'arches-solved',
    chapter: 'arches',
    title: 'Where the water was',
    kind: 'solved',
    script: `Six. Eleven arches, and five left. In eighteen eighty-nine, [[Avenida de Mayo]] took three from the north side. In nineteen thirty-one, a new diagonal avenue took three from the south.

Before you go, one more thing to find, and remember it, because it will matter tonight. Stand by the [[Pirámide]], and face the [[Casa Rosada]]. Before the landfill, before the docks of [[Puerto Madero]], the water came right up behind a fort that stood where that pink house stands now. Almost everything you can see beyond it was won from the river.

The fifth true thing about me: my water used to touch the back wall of that fort.

Lunch is a short walk away. Find [[Defensa]], the street that starts at the south side of the square, and follow it for about nine blocks to the [[Mercado de San Telmo]]. Bring your key.`,
  },
  'fever-story': {
    id: 'fever-story',
    chapter: 'fever',
    title: 'The market and the fever',
    kind: 'story',
    script: `This is the [[Mercado de San Telmo]], open since eighteen ninety-seven, and designed by the architect [[Juan Antonio Buschiazzo|Juan Antonio Buskiaso]]. Step inside, and look up. The iron columns, the arches, the glass and metal roof, the great central dome: most of it is the original structure. It was built to feed a neighbourhood that had changed completely in a single generation.

Here's why. In eighteen seventy-one, yellow fever swept through [[Buenos Aires]]. More than thirteen thousand people died. About one in every thirteen people in the city. The families who could afford it moved north, to new neighbourhoods like the one where you found your key. Their grand houses here were divided into rooms, and rented to newly arrived immigrants. Whole families to a room, sharing one patio. They were called [[conventillos]]. And this market fed them.

The street you walked in on, [[Defensa]], is named for the defence of the city against a British invasion, in eighteen-oh-seven. And the whole neighbourhood stands on a bluff. Walk a block or two east, towards [[Paseo Colón]], and you'll feel the ground drop. That slope was the old riverbank.

Now, your challenge. I've left you a message. It's in code, and you already have the key. Take your time. Sit down, rest, and eat if you like. The market is open all day.`,
  },
  'fever-solved': {
    id: 'fever-solved',
    chapter: 'fever',
    title: 'Not a person',
    kind: 'solved',
    script: `Yes. I am not a person.

I've been careful never to lie to you. Everything I've told you about myself has been true. It just wasn't the whole truth. I'm older than every street. I've never walked down one. I watched both founders arrive. My water touched the walls of a fort.

The sixth true thing about me: this whole neighbourhood stands on a cliff above my old shore.

So, what am I? You have three more stops to make up your minds.

Next: [[La Boca]]. Take a taxi. It's only ten or fifteen minutes, and the walk there isn't one I'd recommend.`,
  },
  'colours-story': {
    id: 'colours-story',
    chapter: 'colours',
    title: 'Three truths and a tale',
    kind: 'story',
    script: `Welcome to [[La Boca]]. The name means "the mouth": the mouth of the [[Riachuelo]], the little river running past you, where it flows out into a much bigger one.

This was the port neighbourhood: sailors, dock workers, ship builders, and immigrants, many of them from Genoa. The houses were built from whatever was at hand: wood, and sheets of corrugated metal. The colours came later. People like to say the paint was left over from the shipyards. It's a lovely story, but nobody has found a document to prove it. What we do know is that in the nineteen fifties, the painter [[Benito Quinquela Martín|Benito Kinkela Martín]], a foundling raised by a coal seller from Genoa, who grew up to become the great painter of this port, led his neighbours in turning an abandoned stretch of railway into an open-air street museum. It opened in nineteen fifty-nine, and they called it [[Caminito]].

Your challenge is a game of three truths and a tale. I'm going to tell you four things about this place. Three are true. One is a story. Walk the street, look around, and decide which one is the tale.

One. [[Caminito]] curves because it follows the line of an old railway.

Two. The first houses here were built of wood and corrugated metal.

Three. The famous tango, [[Caminito]], was written about this very street.

Four. From the riverside, you can see a giant iron bridge from nineteen fourteen, that carried people across the water in a hanging gondola.

Listen again whenever you like. Then choose.`,
  },
  'colours-solved': {
    id: 'colours-solved',
    chapter: 'colours',
    title: 'The tale',
    kind: 'solved',
    script: `The tango is the tale. [[Caminito]], with music by [[Juan de Dios Filiberto]], who grew up right here in [[La Boca]], and words by [[Gabino Coria Peñaloza]], was written in nineteen twenty-six about a little path in [[Olta]], in the province of [[La Rioja]], more than eight hundred kilometres away. The street took the song's name because of [[Filiberto]], and because his friend [[Quinquela|Kinkela]] insisted.

The seventh true thing about me: here, at [[La Boca]], the city opens its mouth to me.

Before you go: stay on [[Caminito]] and the riverside, and take a taxi from here. Your next stop is on the far side of the city, the rose garden in [[Palermo]]. Allow half an hour or more for the ride.`,
  },
  'garden-story': {
    id: 'garden-story',
    chapter: 'garden',
    title: 'The garden of a fallen man',
    kind: 'story',
    script: `You've crossed the whole city, from the south-east to the north-west, to reach [[El Rosedal]], the rose garden of [[Palermo]]. It opened in November, nineteen fourteen, with almost fifteen thousand rose bushes. At the height of spring, around eighteen thousand roses bloom here at once.

But this is a garden with a dark joke at its heart. The park around you is called [[Parque Tres de Febrero]]: the Third of February Park. On the third of February, eighteen fifty-two, at the Battle of [[Caseros]], the governor [[Juan Manuel de Rosas]] was defeated, and fled into exile. This land was his estate. After he fell, the state took it, and in eighteen seventy-five it opened as a public park, named after the day he lost everything. Even his house didn't survive. In February eighteen ninety-nine, it was blown up with dynamite, timed so that nothing would be left standing by the anniversary.

Inside the garden, look for two things. The Poets' Garden, with busts of writers from Shakespeare and Dante to [[Borges]] and [[Alfonsina Storni]]. And near the lake, the [[Patio Andaluz]]: the Andalusian Patio, a gift from the city of Seville, opened in nineteen twenty-nine. Its tiles were made in [[Triana]], the potters' quarter of Seville, and shipped across the Atlantic.

The tiles tell a story: scenes from one of the most famous novels ever written. Your challenge: find the patio, study the tiles, and tell me which novel they illustrate.

If the garden is closed today, and it does close on Mondays, and in bad weather, don't worry. The challenge card has everything you need.`,
  },
  'garden-solved': {
    id: 'garden-solved',
    chapter: 'garden',
    title: 'A knight in Palermo',
    kind: 'solved',
    script: `{{Don Quixote|/dˌɑːn kiːhˈoʊɾi/}}. Cervantes' knight, tilting at windmills in tiles from Seville.

The eighth true thing about me: these tiles crossed an ocean, and then they crossed me.

One stop left before home: a flower even bigger than these. It's a short taxi ride, or a long walk through the parks, if you still have the legs for it.`,
  },
  'flower-story': {
    id: 'flower-story',
    chapter: 'flower',
    title: 'The silver flower',
    kind: 'story',
    script: `Here she is. The [[Floralis Genérica]]: a flower of steel and aluminium, more than twenty metres tall, standing in a reflecting pool in the [[Plaza de las Naciones Unidas]]. She was designed by the Argentine architect [[Eduardo Catalano]], who gave her to the city, and she was installed in two thousand and two.

She was built to move. Every morning, her six petals were meant to open, and every evening, to close. For years, they did. Then, around two thousand and nine, the mechanism failed, and it has never fully worked since. In December, two thousand twenty-three, a storm tore two of her petals down. They were carried away for repair, and it took two years. The last one went back up in December, two thousand twenty-five. So don't wait for her to move. She's resting.

Walk around the pool. Look at the way the petals catch the sky. They're never quite the same colour twice.

Your challenge is the simplest of the day, and maybe the most important. I promised you one true thing at every stop. Here it is: they made this flower the colour of my name. Tell me. What colour is that?`,
  },
  'flower-solved': {
    id: 'flower-solved',
    chapter: 'flower',
    title: 'Silver',
    kind: 'solved',
    script: `Silver. In Spanish, [[plata]]. Hold on to that word.

That was the ninth true thing. You have them all now.

Time to go home. Take a taxi back to [[Córdoba y Gallo]], the corner where you started. When you're on your way, play the next chapter, and I'll keep you company on the ride. At the corner, the envelope is waiting.`,
  },
  'finale-ride': {
    id: 'finale-ride',
    chapter: 'finale',
    title: 'The ride back',
    kind: 'transition',
    script: `While the city slides past the window, think back over the day. A key on [[Ayacucho]] street. Three architects. Two foundings, forty-four years apart. Eleven arches, and the six that were taken. A coded message in a market that once fed a neighbourhood of strangers. A story pretending to be true, at the mouth of the [[Riachuelo]]. A novel written in tiles. And a resting flower, the colour of my name.

You haven't seen me all day. That isn't your fault. This city was built because of me, and then, little by little, it turned its back on me. Landfill, docks, avenues, until people could live their whole lives here without ever looking my way.

When you reach the corner, I'll ask you one last question.`,
  },
  'finale-question': {
    id: 'finale-question',
    chapter: 'finale',
    title: 'One last question',
    kind: 'puzzle',
    script: `You're back where you started: the corner of [[Córdoba y Gallo]], where three [[barrios]] meet.

Open your journal, and read my nine true things again, one after the other. Then look at the six suspects on your screen, and cross out everyone who couldn't have said them all. Only one will be left.

Tell me who I am.`,
  },
  'finale-letter': {
    id: 'finale-letter',
    chapter: 'finale',
    title: 'The letter',
    kind: 'finale',
    script: `Yes. I'm the river.

They named me [[Río de la Plata]]: the River of Silver. The first Europeans who sailed into me believed I was the road to a mountain of silver. They were wrong. The silver was real, but it was far away, in the mountains of [[Potosí]]. They never found it here. They kept my name anyway, and later the whole country took it too. Argentina, from the Latin word for silver. A nation named after a treasure it never had.

I watched [[Pedro de Mendoza]] arrive in fifteen thirty-six. I watched his town go hungry, and I watched it empty. And here is the secret at the heart of today: nobody knows exactly where that first town stood. Tradition points to the bluffs of what is now [[Parque Lezama]], a few blocks south of the market where you decoded my message. But no trace of it has ever been found. That is the hidden city. The first [[Buenos Aires]], lost somewhere on my old shore.

Then [[Garay]] came, and the second city stayed. It grew by my water, and traded on my water. And then it pushed me away, until most people here could forget I was there at all.

You didn't see me today. But you found me. In a theatre a couple of blocks from my old edge. In a square whose fort I used to touch. On a bluff above my shore. At the mouth of the [[Riachuelo]]. In tiles that crossed me. And in a flower the colour of my name.

So here is my one request. Before you leave this city, come and see me. Stand at the water's edge, and look out. On most days, you can't even see the other side.

Thank you for looking so carefully. Most people don't.

Goodnight, you two.`,
  },
};

export const NARRATION_IDS = Object.keys(NARRATION);

const MARKUP = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]|\{\{([^}|]+)(?:\|[^}]+)?\}\}/g;

/** Typographic quotes for display: it's → it’s, "word" → “word”. */
export function typographic(text: string): string {
  return text
    .replace(/(\w)'(\w)/g, '$1’$2')
    .replace(/(^|[\s(—–-])'/g, '$1‘')
    .replace(/'/g, '’')
    .replace(/(^|[\s(—–-])"/g, '$1“')
    .replace(/"/g, '”');
}

/** The visible transcript: the script with pronunciation markup removed, typeset for reading. */
export function transcriptOf(script: string): string {
  return typographic(script.replace(MARKUP, (_m, es: string | undefined, en: string | undefined) => es ?? en ?? ''));
}
