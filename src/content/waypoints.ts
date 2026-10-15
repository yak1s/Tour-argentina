import type { Waypoint, WaypointId } from './types';

/**
 * Waypoints of the tour.
 *
 * Coordinates are WGS84 decimal degrees. Each entry says where its
 * coordinate comes from. Points marked 'approximate' could not be checked
 * against a geocoder while this build was made (the build environment had no
 * access to mapping services), so the app never auto-confirms arrival there
 * and always shows distances to them as approximate. When the players confirm
 * arrival with a good GPS fix, the app stores their actual position for that
 * waypoint (see engine/store.ts: waypointFixes) and uses it from then on.
 */
export const WAYPOINTS: Record<WaypointId, Waypoint> = {
  start: {
    id: 'start',
    name: 'Córdoba y Gallo',
    description: 'The corner of Avenida Córdoba and calle Gallo, where three barrios meet',
    address: 'Av. Córdoba 3200, at the corner of Gallo',
    barrio: 'Recoleta · Balvanera · Almagro',
    coords: { lat: -34.5974, lng: -58.4114 },
    coordsNote:
      'Approximate (±250 m): derived from the City of Buenos Aires map point for Gallo 400 and the block numbering to Av. Córdoba 3200. When you start the tour here with location on, the app replaces it with your actual position.',
    precision: 'approximate',
    arrivalRadiusM: 200,
    kind: 'street-corner',
    access: 'Public street corner, always accessible.',
  },
  ayacucho: {
    id: 'ayacucho',
    name: 'Ayacucho 1412',
    description: 'A private building on a quiet Recoleta block, between Juncal and Pacheco de Melo',
    address: 'Ayacucho 1412, between Juncal and Pacheco de Melo, Recoleta',
    barrio: 'Recoleta',
    coords: { lat: -34.5926, lng: -58.3944 },
    coordsNote:
      'Approximate (±250 m): the 1400 block of Ayacucho runs between Juncal and Pacheco de Melo (property listings); number 1412 sits near the Juncal end. Confirm arrival by the number on the building.',
    precision: 'approximate',
    arrivalRadiusM: 200,
    kind: 'private-exterior',
    access:
      'Private building: view from the opposite sidewalk only. Directories list the address for Luba Café (a kosher dairy café, reportedly on an upper floor); its hours are not verified here — listings say it closes on Friday afternoon and reopens on Saturday night.',
  },
  colon: {
    id: 'colon',
    name: 'Teatro Colón',
    description: 'Opera house; main entrance on Libertad, facing the trees of Plaza Lavalle',
    address: 'Libertad 621 (main entrance), between Tucumán and Viamonte',
    barrio: 'San Nicolás',
    coords: { lat: -34.60112, lng: -58.38334 },
    coordsNote:
      'Verified: average of two independent published coordinates for the theatre (51 m apart). The building fills a whole block, so arrival triggers from any side.',
    precision: 'verified',
    arrivalRadiusM: 110,
    kind: 'landmark',
    access:
      'Exterior always visible from the street. Entry only with a ticket: guided tours run daily, roughly every 15 minutes from 10:00 to 16:45 (box office at Tucumán 1171).',
  },
  obelisco: {
    id: 'obelisco',
    name: 'Obelisco',
    description: 'The white needle in the middle of Avenida 9 de Julio at Avenida Corrientes',
    address: 'Plaza de la República, Av. 9 de Julio and Av. Corrientes',
    barrio: 'San Nicolás',
    coords: { lat: -34.6038, lng: -58.38167 },
    coordsNote: 'Verified: two independent published coordinates agree within 23 m.',
    precision: 'verified',
    arrivalRadiusM: 70,
    kind: 'landmark',
    access: 'Public plaza in the middle of the avenue; reach it only by the signalised crosswalks.',
  },
  'plaza-de-mayo': {
    id: 'plaza-de-mayo',
    name: 'Plaza de Mayo',
    description: 'The founding square, with the Pirámide de Mayo, the Cabildo and the Casa Rosada',
    address: 'Between Av. Rivadavia, Hipólito Yrigoyen, Bolívar and Balcarce',
    barrio: 'Monserrat',
    coords: { lat: -34.60838, lng: -58.3724 },
    coordsNote: 'Centre of the square (Pirámide de Mayo); published coordinate, consistent with the square’s bounding streets.',
    precision: 'verified',
    arrivalRadiusM: 100,
    kind: 'plaza',
    access: 'Public square, always open. Parts may be fenced for events or demonstrations.',
  },
  'san-telmo': {
    id: 'san-telmo',
    name: 'Mercado de San Telmo',
    description: 'The 1897 iron-and-glass market, entrance at Defensa 961',
    address: 'Defensa 961 (also entrances at Bolívar 954, Carlos Calvo 499 and Estados Unidos 460)',
    barrio: 'San Telmo',
    coords: { lat: -34.6196, lng: -58.3714 },
    coordsNote:
      'Approximate (±200 m): estimated along Defensa from Plaza de Mayo using the street numbering (the entrance is at number 961, between Estados Unidos and Carlos Calvo).',
    precision: 'approximate',
    arrivalRadiusM: 170,
    kind: 'market',
    access: 'Open every day 9:00–20:00 (closed 25 December and 1 January). Individual stalls keep their own hours. No purchase needed.',
  },
  caminito: {
    id: 'caminito',
    name: 'Caminito',
    description: 'The short, curving open-air street museum by the Riachuelo at Vuelta de Rocha',
    address: 'Caminito, off Av. Pedro de Mendoza at Vuelta de Rocha, La Boca',
    barrio: 'La Boca',
    coords: { lat: -34.639, lng: -58.3628 },
    coordsNote: 'Approximate (±150 m): two independent estimates agree; the street itself is only about 110–150 m long.',
    precision: 'approximate',
    arrivalRadiusM: 170,
    kind: 'street-museum',
    access: 'Public pedestrian street. Visit in daylight and stay within the tourist area (see safety notes).',
  },
  rosedal: {
    id: 'rosedal',
    name: 'El Rosedal',
    description: 'The rose garden of Palermo, inside Parque Tres de Febrero',
    address: 'Av. Infanta Isabel and Av. Iraola, Parque Tres de Febrero, Palermo',
    barrio: 'Palermo',
    coords: { lat: -34.5718, lng: -58.4173 },
    coordsNote: 'Approximate (±200 m): the garden covers about 3.4 hectares between Av. Infanta Isabel, Av. Iraola and Av. Presidente Pedro Montt.',
    precision: 'approximate',
    arrivalRadiusM: 200,
    kind: 'park',
    access:
      'Free. Closed on Mondays and in strong wind or rain. Published hours differ between sources (from 8:00–19:30 to 10:00–18:00); plan to be inside between 10:00 and 17:00. No bicycles or pets.',
  },
  floralis: {
    id: 'floralis',
    name: 'Floralis Genérica',
    description: 'The giant metal flower in Plaza de las Naciones Unidas, on Av. Figueroa Alcorta',
    address: 'Plaza de las Naciones Unidas, Av. Figueroa Alcorta, next to the UBA Law School',
    barrio: 'Recoleta',
    coords: { lat: -34.5816, lng: -58.3933 },
    coordsNote: 'Approximate (±150 m): two independent estimates of the sculpture’s position, about 170 m apart; this is their midpoint.',
    precision: 'approximate',
    arrivalRadiusM: 150,
    kind: 'sculpture',
    access: 'Public plaza. The petals no longer open and close: the mechanism has not fully worked since around 2009.',
  },
};

export const WAYPOINT_IDS = Object.keys(WAYPOINTS) as WaypointId[];
