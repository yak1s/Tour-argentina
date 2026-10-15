/**
 * Content model for the tour. Everything the player reads, hears or solves is
 * declared as data that conforms to these types, so the route, the clues, the
 * narration and the facts can be edited without touching the game engine.
 *
 * Integrity rules that the type system cannot express (unique ids, every
 * referenced narration clip has an audio file, coordinates inside Buenos
 * Aires, every puzzle has graduated hints, ...) are enforced by
 * tests/unit/content.test.ts.
 */

export interface LatLng {
  lat: number;
  lng: number;
}

export type WaypointId =
  | 'start'
  | 'ayacucho'
  | 'colon'
  | 'obelisco'
  | 'plaza-de-mayo'
  | 'san-telmo'
  | 'caminito'
  | 'rosedal'
  | 'floralis';

export type ChapterId =
  | 'prologue'
  | 'key'
  | 'architects'
  | 'foundings'
  | 'arches'
  | 'fever'
  | 'colours'
  | 'garden'
  | 'flower'
  | 'finale';

/** How confident we are in a statement shown to the players. */
export type Certainty =
  /** Documented by official or multiple reputable sources. */
  | 'documented'
  /** Sources disagree on details (dates, numbers); we say so in the text. */
  | 'disputed'
  /** A popular story or tradition; presented explicitly as such. */
  | 'tradition';

export interface Waypoint {
  id: WaypointId;
  name: string;
  /** Short recognisable description: "Opera house facing Plaza Lavalle". */
  description: string;
  address: string;
  barrio: string;
  /** The exact point the app navigates to (a safe public standing spot). */
  coords: LatLng;
  /** Where the coordinate comes from and how precise it is. */
  coordsNote: string;
  /**
   * 'verified': two independent sources agree within ~50 m, so GPS arrival is
   * confirmed automatically. 'approximate': derived from street numbering or a
   * single estimate (±150–250 m), so the app only suggests arrival and the
   * players confirm it with "We're here".
   */
  precision: 'verified' | 'approximate';
  /** Radius (m) inside which a confident GPS fix counts as "arrived". */
  arrivalRadiusM: number;
  kind: 'street-corner' | 'private-exterior' | 'landmark' | 'plaza' | 'market' | 'street-museum' | 'park' | 'sculpture';
  /** Opening information that matters for the visit, already verified. */
  access: string;
}

export type TravelMode = 'walk' | 'taxi';

export interface DirectionStep {
  text: string;
  /** Optional landmark that confirms the step. */
  landmark?: string;
}

export interface Leg {
  id: string;
  from: WaypointId;
  to: WaypointId;
  /** The mode we recommend for this leg. */
  recommended: TravelMode;
  /** Short reason for the recommendation, shown under the mode badge. */
  why: string;
  walk?: {
    /** Realistic walking distance along streets, metres. */
    distanceM: number;
    /** Typical walking time range, minutes. */
    minutes: [number, number];
    /**
     * 'streets' = the street sequence was checked against maps/official info.
     * 'orientation' = only general orientation is given (no turn list).
     */
    verification: 'streets' | 'orientation';
    steps: DirectionStep[];
  };
  taxi?: {
    distanceKm: [number, number];
    minutes: [number, number];
    /** What to say or show to the driver. */
    tellDriver: string;
    pickup: string;
    dropoff: string;
  };
  safety: string[];
  /** Small optional things to notice along the way. */
  enRoute?: string[];
}

export interface Fact {
  id: string;
  title: string;
  body: string;
  /** Optional longer explanation for curious players. */
  more?: string;
  certainty: Certainty;
  /** Short attribution of the source(s) used to verify the fact. */
  source: string;
}

export interface Alternative {
  /** Which situation the alternative covers. */
  when: 'closed' | 'crowded' | 'weather' | 'gps' | 'tired' | 'unsafe' | 'time';
  text: string;
}

/** A first-person line from the narrator that players collect as a clue. */
export interface Thread {
  id: string;
  text: string;
  /** Explanation unlocked at the finale: why this line was true of the narrator. */
  reveal: string;
}

export type ArtId =
  | 'corner'
  | 'door'
  | 'theatre'
  | 'obelisk'
  | 'pyramid'
  | 'market'
  | 'houses'
  | 'roses'
  | 'flower'
  | 'river';

export interface Chapter {
  id: ChapterId;
  /** 0 for the prologue, 9 for the finale. */
  number: number;
  title: string;
  waypoint: WaypointId;
  /** Leg that brings the players to this chapter's waypoint (absent for the prologue). */
  legId?: string;
  /** Kicker shown above the title, e.g. "Teatro Colón · San Nicolás". */
  place: string;
  /** One-sentence teaser for the route overview. */
  teaser: string;
  /** Concise introduction to the destination. */
  intro: string;
  /** Suggested time on site, minutes. */
  onSiteMinutes: [number, number];
  arrival: {
    whereToStand: string;
    lookFor: string;
    /** Exactly what starts the challenge. */
    startAction: string;
  };
  /** Narration clips offered on arrival, in order. */
  narration: string[];
  facts: Fact[];
  puzzleId?: string;
  /** Optional, purely-for-fun activities that never block progress. */
  extras: Extra[];
  thread?: Thread;
  /** Why the clue matters to the larger mystery (shown after completion). */
  whyItMatters: string;
  /** Short transition text toward the next destination. */
  transition: string;
  alternatives: Alternative[];
  art: ArtId;
  /** If true, the stop can be skipped without losing the story. Always true except prologue/finale. */
  skippable: boolean;
  /** Optional: chapter can only be reordered among these neighbours. */
  canReorder?: boolean;
}

export type ExtraKind = 'look' | 'camera' | 'inclinometer' | 'compass' | 'listen' | 'taste';

export interface Extra {
  id: string;
  kind: ExtraKind;
  title: string;
  body: string;
}

/* ------------------------------------------------------------------ */
/* Puzzles                                                             */
/* ------------------------------------------------------------------ */

interface PuzzleBase {
  id: string;
  chapter: ChapterId;
  title: string;
  /** The question, one or two sentences. */
  prompt: string;
  /** Concrete instructions: what to look at and from where. */
  setup: string[];
  /** Internal design note: the intended observation or reasoning. */
  intended: string;
  /** What players should do if the physical detail is unavailable. */
  fallback: string;
  /** Graduated hints, gentlest first. The last hint all but gives it away. */
  hints: string[];
  /** Explanation shown after solving or skipping. */
  solution: string;
  /** Short line shown when solved. */
  success: string;
  /** Narration clip played (optionally) after solving. */
  solvedNarration?: string;
}

export interface NumberPuzzle extends PuzzleBase {
  type: 'number';
  answer: number;
  /** Accepted absolute deviation (default 0). */
  tolerance?: number;
  unit?: string;
  /** Specific feedback for likely wrong numbers. */
  near?: { value: number; reply: string }[];
}

export interface TextPuzzle extends PuzzleBase {
  type: 'text';
  /** Accepted answers; compared accent-, case- and punctuation-insensitively. */
  accept: string[];
  placeholder: string;
  /** Specific feedback for likely near-misses. */
  near?: { match: string[]; reply: string }[];
}

export interface ChoiceOption {
  id: string;
  label: string;
  detail?: string;
  /** Optional visual for the option (e.g. a flag), rendered by the UI. */
  visual?: string;
}

export interface ChoicePuzzle extends PuzzleBase {
  type: 'choice';
  options: ChoiceOption[];
  correct: string;
  /** Explanation for each wrong option. */
  feedback: Record<string, string>;
}

export interface OrderPuzzle extends PuzzleBase {
  type: 'order';
  /** Slot labels in order, e.g. ["Began it", "Reshaped it", "Finished it"]. */
  slots: string[];
  items: ChoiceOption[];
  /** Item ids in correct slot order. */
  correct: string[];
  /** Clue cards the players reason from. */
  clues: string[];
}

export interface CipherPuzzle extends PuzzleBase {
  type: 'cipher';
  /** Encrypted message, letters A–Z and spaces. */
  ciphertext: string;
  /** Numeric key: letters were shifted forward by these amounts, repeating. */
  key: number[];
  /** The decoded message (for validation of the decoding step and tests). */
  plaintext: string;
  /** Accepted answers to the decoded question. */
  accept: string[];
  placeholder: string;
  near?: { match: string[]; reply: string }[];
}

export interface EliminationCandidate {
  id: string;
  label: string;
  detail: string;
}

export interface EliminationPuzzle extends PuzzleBase {
  type: 'elimination';
  candidates: EliminationCandidate[];
  correct: string;
  /** Why each wrong candidate is impossible (which thread rules it out). */
  feedback: Record<string, string>;
}

export interface CodePuzzle extends PuzzleBase {
  type: 'code';
  /** The exact digit string that opens the lock. */
  code: string;
}

export type Puzzle =
  | NumberPuzzle
  | TextPuzzle
  | ChoicePuzzle
  | OrderPuzzle
  | CipherPuzzle
  | EliminationPuzzle
  | CodePuzzle;

export type PuzzleType = Puzzle['type'];

/* ------------------------------------------------------------------ */
/* Narration                                                           */
/* ------------------------------------------------------------------ */

export interface NarrationClip {
  id: string;
  chapter: ChapterId;
  title: string;
  kind: 'intro' | 'story' | 'puzzle' | 'solved' | 'transition' | 'finale';
  /**
   * Text sent to the speech engine. Spanish words are wrapped in [[double
   * brackets]] so they are pronounced in Rioplatense Spanish. The visible
   * transcript is the same text with the brackets removed.
   */
  script: string;
}

export interface AudioManifestEntry {
  file: string;
  durationSec: number;
  /** Hash of the script the file was rendered from (detects stale audio). */
  scriptHash: string;
  voice: string;
}

export type AudioManifest = Record<string, AudioManifestEntry>;
