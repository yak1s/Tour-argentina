import type { Leg } from './types';

/**
 * Travel legs between waypoints.
 *
 * Distances and times are estimates for normal daytime conditions; traffic,
 * weather, crowds and waiting at crossings change them. Where the original
 * plan's figures were wrong, the corrected estimate is used and noted.
 *
 * Walking directions marked 'streets' follow the street grid and numbering
 * (checked against official addresses and the city's block numbering). Those
 * marked 'orientation' give the general way only — follow street signs, or
 * open the leg in a maps app when you have a connection.
 */
export const LEGS: Record<string, Leg> = {
  'start-ayacucho': {
    id: 'start-ayacucho',
    from: 'start',
    to: 'ayacucho',
    recommended: 'taxi',
    why: 'About 2 km across Recoleta. A short taxi ride saves your legs for the walking stretch downtown.',
    taxi: {
      distanceKm: [2.5, 3.2],
      minutes: [10, 15],
      tellDriver: 'Ayacucho 1412, entre Juncal y Pacheco de Melo, por favor.',
      pickup: 'Any corner of Av. Córdoba; taxis drive towards downtown on this avenue.',
      dropoff: 'At the door of Ayacucho 1412; cross to the opposite sidewalk to look.',
    },
    walk: {
      distanceM: 2200,
      minutes: [28, 35],
      verification: 'orientation',
      steps: [
        { text: 'Walk along Avenida Córdoba towards downtown (street numbers going down) for about 12 blocks.', landmark: 'You cross the wide Avenida Pueyrredón on the way.' },
        { text: 'Turn left onto Ayacucho and walk about 5 blocks, crossing Paraguay, Marcelo T. de Alvear, Avenida Santa Fe, Arenales and Juncal.' },
        { text: 'Number 1412 is in the first block after Juncal.' },
      ],
    },
    safety: [
      'Use official black-and-yellow taxis or a ride app; keep your phone away from the kerb while you wait.',
    ],
  },
  'ayacucho-colon': {
    id: 'ayacucho-colon',
    from: 'ayacucho',
    to: 'colon',
    recommended: 'walk',
    why: 'About 2 km of easy, flat streets in the morning — or a 10-minute taxi if you prefer to save energy.',
    walk: {
      distanceM: 2000,
      minutes: [25, 30],
      verification: 'orientation',
      steps: [
        { text: 'Walk along Ayacucho with the street numbers going down, about 5 blocks, to Avenida Córdoba.' },
        { text: 'Turn left onto Avenida Córdoba and walk towards downtown for about 9 blocks, crossing Avenida Callao on the way.' },
        { text: 'Turn right onto Libertad and cross Viamonte.', landmark: 'The theatre fills the block on your left; its main doors are at Libertad 621.' },
        { text: 'Cross Libertad to the trees of Plaza Lavalle for the full view of the front.' },
      ],
    },
    taxi: {
      distanceKm: [2, 2.8],
      minutes: [8, 12],
      tellDriver: 'Al Teatro Colón, entrada por Libertad 621, por favor.',
      pickup: 'On Ayacucho or the next corner.',
      dropoff: 'Libertad 621, the main entrance facing Plaza Lavalle.',
    },
    safety: ['Cross wide avenues (Callao, Córdoba) only with the pedestrian light.'],
  },
  'colon-obelisco': {
    id: 'colon-obelisco',
    from: 'colon',
    to: 'obelisco',
    recommended: 'walk',
    why: 'Just three blocks.',
    walk: {
      distanceM: 480,
      minutes: [6, 9],
      verification: 'streets',
      steps: [
        { text: 'Facing the theatre’s main doors on Libertad, turn right and walk two blocks along Libertad, crossing Tucumán and then Lavalle.' },
        { text: 'At Avenida Corrientes, turn left and walk one block to Avenida 9 de Julio.', landmark: 'The Obelisco rises in the middle of the avenue straight ahead.' },
        { text: 'Cross to the Obelisco’s island only at the signalised crosswalks. It can take two or three green lights to get across.' },
      ],
    },
    safety: [
      'Avenida 9 de Julio is about 140 m wide. Cross only on the green pedestrian light, island by island.',
      'The central Metrobus lanes carry buses in both directions: look both ways.',
      'Busy area: keep phones and bags close.',
    ],
  },
  'obelisco-plaza': {
    id: 'obelisco-plaza',
    from: 'obelisco',
    to: 'plaza-de-mayo',
    recommended: 'walk',
    why: 'A straight, one-kilometre walk down one of the city’s grand diagonals.',
    walk: {
      distanceM: 1050,
      minutes: [13, 16],
      verification: 'streets',
      steps: [
        { text: 'From the Obelisco, cross the eastern lanes of 9 de Julio (towards downtown) at the lights.' },
        { text: 'Find Diagonal Norte — Avenida Presidente Roque Sáenz Peña — the avenue that leaves the square at an angle, heading south-east.' },
        { text: 'Walk straight along Diagonal Norte for about 1 km. It ends at Plaza de Mayo.', landmark: 'The pink Casa Rosada closes the far end of the square.' },
      ],
    },
    safety: ['Downtown is crowded on weekdays: keep phones and bags close, especially at crossings.'],
    enRoute: ['Halfway along, stop on the sidewalk and look back: the Obelisco sits framed at the end of the avenue.'],
  },
  'plaza-santelmo': {
    id: 'plaza-santelmo',
    from: 'plaza-de-mayo',
    to: 'san-telmo',
    recommended: 'walk',
    why: 'About ten blocks along Defensa, the old road south — the best way into San Telmo.',
    walk: {
      distanceM: 1250,
      minutes: [15, 20],
      verification: 'streets',
      steps: [
        { text: 'From the Pirámide, walk to the south side of the square (Hipólito Yrigoyen street). Defensa begins at the middle of that side: look for its street sign.' },
        { text: 'Walk along Defensa for about nine blocks, crossing Alsina, Moreno, Avenida Belgrano, Venezuela, México, Chile, Avenida Independencia and Estados Unidos.' },
        { text: 'Just after Estados Unidos, the market entrance is on your right at Defensa 961.', landmark: 'A doorway into a long hall under an iron roof.' },
      ],
    },
    safety: [
      'Cross Avenida Belgrano and Avenida Independencia with the lights.',
      'On Sundays the San Telmo fair fills Defensa (about 10:00–17:00): slower, livelier and busier — watch your belongings.',
    ],
  },
  'santelmo-caminito': {
    id: 'santelmo-caminito',
    from: 'san-telmo',
    to: 'caminito',
    recommended: 'taxi',
    why: 'Only a few kilometres, but the streets between San Telmo and La Boca are not recommended on foot for visitors.',
    taxi: {
      distanceKm: [3, 4],
      minutes: [10, 15],
      tellDriver: 'A Caminito, en La Boca, por favor — a la Vuelta de Rocha.',
      pickup: 'From the Defensa entrance of the market, or Avenida Paseo Colón two blocks east.',
      dropoff: 'At Vuelta de Rocha, where Caminito meets Avenida Pedro de Mendoza.',
    },
    safety: [
      'Do not walk from San Telmo to La Boca.',
      'Arrive and leave La Boca by taxi or ride app, in daylight.',
    ],
  },
  'caminito-rosedal': {
    id: 'caminito-rosedal',
    from: 'caminito',
    to: 'rosedal',
    recommended: 'taxi',
    why: 'This crosses the whole city, south-east to north-west. The original plan’s 4.8 km / 18 min was too optimistic.',
    taxi: {
      distanceKm: [11, 13],
      minutes: [25, 40],
      tellDriver: 'Al Rosedal de Palermo, por Avenida Infanta Isabel, por favor.',
      pickup: 'On Avenida Pedro de Mendoza by the riverside walk; for a ride app, set the pickup at “Fundación PROA, Av. Pedro de Mendoza 1929”.',
      dropoff: 'The Rosedal entrance on Avenida Infanta Isabel.',
    },
    safety: ['Wait for your car on the riverside walk, not in the side streets.'],
  },
  'rosedal-floralis': {
    id: 'rosedal-floralis',
    from: 'rosedal',
    to: 'floralis',
    recommended: 'taxi',
    why: 'About 3 km. A short ride — or a long park walk if you still have the energy and the daylight.',
    taxi: {
      distanceKm: [3, 4],
      minutes: [8, 12],
      tellDriver: 'A la Floralis Genérica, Plaza de las Naciones Unidas, sobre Avenida Figueroa Alcorta, por favor.',
      pickup: 'Avenida Infanta Isabel, by the Rosedal entrance.',
      dropoff: 'Avenida Figueroa Alcorta, beside the flower.',
    },
    walk: {
      distanceM: 3000,
      minutes: [35, 45],
      verification: 'orientation',
      steps: [
        { text: 'Walk out to Avenida Figueroa Alcorta and follow it towards Recoleta (south-east).' },
        { text: 'Keep going for about 2.5 km past the Palermo parks.', landmark: 'The giant metal flower stands in a plaza beside the avenue, next to the columned University of Buenos Aires Law School.' },
      ],
    },
    safety: ['Daylight only if walking; cross Figueroa Alcorta only at the lights — traffic is fast.'],
  },
  'floralis-start': {
    id: 'floralis-start',
    from: 'floralis',
    to: 'start',
    recommended: 'taxi',
    why: 'The ride home. The original plan’s 2.3 km / 8 min was optimistic: allow 3–4 km and 12–18 minutes.',
    taxi: {
      distanceKm: [3, 4],
      minutes: [12, 18],
      tellDriver: 'A Avenida Córdoba y Gallo, por favor (Córdoba al 3200).',
      pickup: 'On Avenida Figueroa Alcorta by the plaza.',
      dropoff: 'The corner of Avenida Córdoba and Gallo.',
    },
    safety: ['If it is already dark, wait for your car where the plaza is lit.'],
  },
};
