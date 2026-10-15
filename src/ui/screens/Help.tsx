import { CHAPTERS, WAYPOINTS } from '../../content';
import { canPromptInstall, isStandalone, promptInstall } from '../../platform/pwa';
import { Button, Disclosure } from '../components/ui';
import { Icon } from '../components/Icon';

const WHAT_IF: { q: string; a: string }[] = [
  {
    q: 'GPS isn’t working, or shows the wrong place',
    a: 'Everything works without it. Follow the written directions and street signs, and tap “We’re here” when you arrive. In dense downtown streets GPS can drift by 20–50 m; the app waits for several consistent readings before it decides you’ve arrived, and never penalises you for drift.',
  },
  {
    q: 'We said no to location',
    a: 'That’s fine — use manual mode. To change your mind later, allow location for this site in the browser’s site settings, then switch “Location” on in Settings.',
  },
  {
    q: 'A place is closed, fenced off, or too crowded',
    a: 'Every challenge has a fallback: the answer can be reached from the chapter text and the hints. You can also skip the challenge or the whole stop; the narrator’s line still goes into your journal, so the ending always works.',
  },
  {
    q: 'Bad weather',
    a: 'Rain closes El Rosedal; elsewhere you can solve challenges from shelter. Take taxis between stops and skip anything that isn’t fun in the rain.',
  },
  {
    q: 'We want to change the plan',
    a: 'On the Route screen, tap any stop to go there next, move it earlier or later, or skip it. “Return to the planned route” puts things back.',
  },
  {
    q: 'We need a break',
    a: 'Tap “Pause for a break” on the home screen. GPS stops, and everything — even an answer you were typing — is kept.',
  },
  {
    q: 'No internet',
    a: 'Once the app has finished saving itself (see Settings → Offline), it needs no connection at all: narration, maps, clues and answers are all on the phone. Only “Open in Maps” needs internet.',
  },
  {
    q: 'The narration doesn’t play',
    a: 'Check the phone isn’t on silent and the volume is up, then tap Play (browsers don’t allow sound before a tap). Every narration has a full transcript; if a recording can’t be played, the app offers the phone’s own voice where available.',
  },
  {
    q: 'Battery is low',
    a: 'Suspend GPS (Route screen), turn off “Keep screen on”, and lower the screen brightness. The tour works fine in manual mode.',
  },
];

export function HelpScreen({ topic }: { topic?: string }) {
  return (
    <div class="stack stack--lg">
      <section class="stack stack--sm">
        <p class="kicker">Help</p>
        <h2>If something goes wrong</h2>
      </section>

      <section class="card stack">
        {WHAT_IF.map((x, i) => (
          <Disclosure summary={x.q} open={i === 0 && topic === undefined}>
            <p class="small">{x.a}</p>
          </Disclosure>
        ))}
      </section>

      <section class="card stack" id="safety">
        <p class="kicker">
          <Icon name="shield" size="sm" class="inline-icon" /> Safety
        </p>
        <p class="small">
          <strong>Crossing streets:</strong> wide avenues (9 de Julio, Corrientes, Belgrano, Independencia, Figueroa Alcorta) take more than one green light. Cross only on the pedestrian signal, island by island, and never while looking at the phone.
        </p>
        <p class="small">
          <strong>Belongings:</strong> in busy areas (Obelisco, Plaza de Mayo, San Telmo on Sundays) keep phones and bags close and away from the kerb.
        </p>
        <p class="small">
          <strong>La Boca:</strong> visit in daylight, arrive and leave by taxi, and stay on Caminito, Magallanes, Garibaldi, Del Valle Iberlucea and the Pedro de Mendoza riverside. Don’t wander into side streets.
        </p>
        <p class="small">
          <strong>Taxis:</strong> use official black-and-yellow taxis or a ride app. Show the driver the Spanish destination card from the directions screen.
        </p>
        <p class="small">
          <strong>Emergencies in Argentina:</strong> police 911 · medical emergencies (SAME, in the city) 107 · fire 100.
        </p>
      </section>

      <section class="card stack" id="install">
        <p class="kicker">
          <Icon name="phone" size="sm" class="inline-icon" /> Install on Android
        </p>
        {isStandalone.value ? (
          <p class="small">You’re already using the installed app.</p>
        ) : (
          <>
            <ol class="steps">
              <li>Open this page in Chrome while online.</li>
              <li>Wait for “Ready offline” at the top (Settings → Offline shows the file count).</li>
              <li>
                {canPromptInstall.value ? 'Tap “Install” below,' : 'Tap the menu ⋮,'} then “Install app” or “Add to Home screen”.
              </li>
              <li>Open “Hidden City” from your home screen. It now starts without a connection.</li>
            </ol>
            {canPromptInstall.value ? (
              <Button icon="download" onClick={() => void promptInstall()}>
                Install
              </Button>
            ) : null}
            <p class="xsmall faint">Other browsers: Samsung Internet and Edge offer “Add page to” → “Home screen”. On iPhone, Safari’s Share → “Add to Home Screen”.</p>
          </>
        )}
      </section>

      <section class="card stack" id="privacy">
        <p class="kicker">Privacy</p>
        <p class="small">
          No account, no analytics, no tracking. Your position, answers, progress and photos are stored only on this phone and are never uploaded. The app makes no network requests while you play; it only downloads its own files when first installed or updated.
        </p>
      </section>

      <section class="card stack" id="sources">
        <p class="kicker">Sources, accuracy &amp; credits</p>
        <p class="small">
          The mystery is fiction; the history is not. Every fact card shows how sure we are: <em>documented</em>, <em>sources differ</em>, or <em>legend</em>, with the sources used. The narrator’s first-person lines are a literary device — each one is literally true of the river.
        </p>
        <Disclosure summary="Positions of the stops">
          <div class="stack stack--sm" style={{ marginTop: '6px' }}>
            {Object.values(WAYPOINTS).map((w) => (
              <p class="xsmall">
                <strong>{w.name}</strong> ({w.precision}): {w.coordsNote}
              </p>
            ))}
          </div>
        </Disclosure>
        <Disclosure summary="Distances and times">
          <p class="xsmall" style={{ marginTop: '6px' }}>
            Walking and taxi times are daytime estimates; traffic, crowds and weather change them. Several figures in the original plan were corrected: Córdoba y Gallo is east of the Teatro Colón (about 2.7 km), Caminito to El Rosedal is 11–13 km by road (25–40 min), and Floralis Genérica to Córdoba y Gallo is about 3–4 km.
          </p>
        </Disclosure>
        <Disclosure summary="Chapters and what they rely on">
          <div class="stack stack--sm" style={{ marginTop: '6px' }}>
            {CHAPTERS.map((c) => (
              <p class="xsmall">
                <strong>{c.title}</strong>: {c.facts.map((f) => f.source).filter((v, i, a) => a.indexOf(v) === i).join('; ')}
              </p>
            ))}
          </div>
        </Disclosure>
        <Disclosure summary="Credits">
          <p class="xsmall" style={{ marginTop: '6px' }}>
            Narration voice generated offline with Kokoro-82M (Apache-2.0), voice “af_heart”, with Spanish names pronounced in Rioplatense Spanish. Typefaces: Fraunces, Inter and Courier Prime (SIL Open Font License). Illustrations, sound effects and the generated river ambience were made for this app. No map tiles or external data are used.
          </p>
        </Disclosure>
      </section>
    </div>
  );
}
