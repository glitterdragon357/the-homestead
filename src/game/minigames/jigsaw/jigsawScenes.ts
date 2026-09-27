/**
 * The pictures.
 *
 * Seventy-five of them, and none painted by hand one at a time - that
 * would be seventy-five slabs of near-identical drawing code. Instead
 * there is a kit of parts (a sky, hills, water that reflects what is
 * above it, a skyline, a shoal of fish, a field of flowers) and each
 * scene is a recipe naming its palette and which parts go in it.
 *
 * Every recipe is still a deliberate choice rather than a random roll -
 * they are grouped into places, and the palettes are picked to suit the
 * name. What the kit buys is that a new picture costs four lines rather
 * than a hundred.
 *
 * One rule applies to all of them: there must be something to look at in
 * every part of the frame. A wide flat sky makes half the pieces
 * identical and turns the puzzle into guesswork, so any recipe with open
 * sky in it also carries cloud, birds, stars or weather.
 */

export type Part =
  | { kind: 'clouds'; n?: number; tint?: string }
  | { kind: 'birds'; n?: number }
  | { kind: 'stars'; n?: number }
  | { kind: 'sun'; x: number; y: number; r?: number; colour?: string }
  | { kind: 'moon'; x: number; y: number; r?: number }
  | { kind: 'aurora' }
  | { kind: 'rain' }
  | { kind: 'snowfall' }
  | { kind: 'hills'; at: number; height: number; colour: string; seed?: number }
  | { kind: 'mountains'; at: number; height: number; colour: string; snow?: boolean; seed?: number }
  | { kind: 'dunes'; at: number; colour: string; seed?: number }
  | { kind: 'water'; at: number; colour: string; glint?: string }
  | { kind: 'fields'; at: number; cols?: string[] }
  | { kind: 'rows'; at: number; rows?: number; leaf: string; fruit?: string }
  | { kind: 'meadow'; at: number; grass: string; petals: string[] }
  | { kind: 'forest'; at: number; trunk: string; leaf: string; n?: number }
  | { kind: 'city'; at: number; colour: string; lit?: string; tall?: number }
  | { kind: 'village'; at: number; wall: string; roof: string }
  | { kind: 'lighthouse'; x: number; at: number }
  | { kind: 'bridge'; at: number; colour: string }
  | { kind: 'windmill'; x: number; at: number }
  | { kind: 'boats'; at: number; n?: number }
  | { kind: 'balloons'; n?: number }
  | { kind: 'kites'; n?: number }
  | { kind: 'coral'; n?: number }
  | { kind: 'fish'; n?: number }
  | { kind: 'shafts'; n?: number }
  | { kind: 'stripes'; cols: string[]; diagonal?: boolean }
  | { kind: 'tiles'; cols: string[] }
  | { kind: 'rings'; cols: string[] }
  | { kind: 'petalstorm'; cols: string[] }

export interface Recipe {
  key: string
  name: string
  blurb: string
  group: string
  /** Sky gradient, top to bottom, and how far down it reaches. */
  sky: string[]
  skyTo?: number
  parts: Part[]
}

const C = {
  dawn: ['#2b3f6b', '#7a6a8e', '#e09a63', '#f4c98a'],
  day: ['#4a86c4', '#89b8dc', '#cfe6ef'],
  noon: ['#3f7fc4', '#9fc8e4', '#dfeaf0'],
  dusk: ['#1d2748', '#5a4a72', '#c2705e', '#edb37a'],
  night: ['#080e22', '#131e3e', '#22305a'],
  storm: ['#2c3440', '#4a5462', '#6f7886'],
  cold: ['#17305e', '#5a7fb0', '#bcd4e0'],
  warm: ['#7a3a2a', '#c46a3a', '#e8b06a'],
  mint: ['#1d5a55', '#4f9a8a', '#a8d8c4'],
}

export const RECIPES: Recipe[] = [
  /* ---- Coasts ---------------------------------------------------- */
  { key: 'harbour', name: 'The Harbour', blurb: 'Boats, a low sun and a long jetty.', group: 'Coasts', sky: C.dawn, skyTo: 240,
    parts: [{ kind: 'sun', x: 400, y: 196, r: 26 }, { kind: 'clouds', n: 10 }, { kind: 'birds', n: 8 }, { kind: 'water', at: 240, colour: '#1b3b52', glint: '#ffd696' }, { kind: 'boats', at: 250, n: 5 }] },
  { key: 'lightkeep', name: 'The Lightkeeper', blurb: 'One white tower and a great deal of weather.', group: 'Coasts', sky: C.storm, skyTo: 230,
    parts: [{ kind: 'clouds', n: 14, tint: '#9aa4b2' }, { kind: 'birds', n: 6 }, { kind: 'hills', at: 250, height: 70, colour: '#4a4f58' }, { kind: 'water', at: 268, colour: '#2f3b48', glint: '#c8d6e4' }, { kind: 'lighthouse', x: 150, at: 250 }] },
  { key: 'lowtide', name: 'Low Tide', blurb: 'Wet sand, a pale sky and the boats aground.', group: 'Coasts', sky: C.day, skyTo: 210,
    parts: [{ kind: 'clouds', n: 12 }, { kind: 'birds', n: 9 }, { kind: 'water', at: 230, colour: '#6f8a92', glint: '#e8f2f6' }, { kind: 'boats', at: 300, n: 4 }] },
  { key: 'nightharbour', name: 'Harbour at Night', blurb: 'Lamps on the quay and every one of them doubled.', group: 'Coasts', sky: C.night, skyTo: 230,
    parts: [{ kind: 'stars', n: 90 }, { kind: 'moon', x: 470, y: 60, r: 20 }, { kind: 'city', at: 232, colour: '#1a2340', lit: '#ffd68a', tall: 90 }, { kind: 'water', at: 250, colour: '#0d1628', glint: '#ffd68a' }, { kind: 'boats', at: 262, n: 3 }] },
  { key: 'cliffpath', name: 'The Cliff Path', blurb: 'Green on top, a long way down.', group: 'Coasts', sky: C.noon, skyTo: 190,
    parts: [{ kind: 'clouds', n: 11 }, { kind: 'birds', n: 10 }, { kind: 'water', at: 240, colour: '#2f6a80', glint: '#bfe4f0' }, { kind: 'hills', at: 250, height: 70, colour: '#5f8a4a' }] },
  { key: 'sandbar', name: 'The Sandbar', blurb: 'Turquoise either side of a thin pale line.', group: 'Coasts', sky: C.day, skyTo: 170,
    parts: [{ kind: 'clouds', n: 10 }, { kind: 'birds', n: 7 }, { kind: 'water', at: 180, colour: '#2fa5b8', glint: '#dff8ff' }, { kind: 'dunes', at: 300, colour: '#e0cfa4' }] },
  { key: 'stormcoast', name: 'Storm Coast', blurb: 'Rain coming in sideways.', group: 'Coasts', sky: C.storm, skyTo: 250,
    parts: [{ kind: 'clouds', n: 16, tint: '#8a94a4' }, { kind: 'rain' }, { kind: 'water', at: 268, colour: '#28323e', glint: '#aebccc' }, { kind: 'lighthouse', x: 460, at: 268 }] },
  { key: 'pier', name: 'The Long Pier', blurb: 'Out over the water and back again.', group: 'Coasts', sky: C.dusk, skyTo: 220,
    parts: [{ kind: 'sun', x: 120, y: 190, r: 24, colour: '#ffd9a0' }, { kind: 'clouds', n: 9 }, { kind: 'birds', n: 8 }, { kind: 'water', at: 240, colour: '#2a2a48', glint: '#ffbe86' }, { kind: 'bridge', at: 300, colour: '#3a2b22' }] },
  { key: 'gulls', name: 'Gulls', blurb: 'A lot of them, over a lot of grey.', group: 'Coasts', sky: C.storm, skyTo: 240,
    parts: [{ kind: 'clouds', n: 13, tint: '#96a0ae' }, { kind: 'birds', n: 26 }, { kind: 'water', at: 258, colour: '#39434f', glint: '#c4d0dc' }] },
  { key: 'firstlight', name: 'First Light', blurb: 'The sun not quite up and the sea not quite awake.', group: 'Coasts', sky: ['#1a2744', '#6a4a70', '#d4886a', '#f6d2a2'], skyTo: 260,
    parts: [{ kind: 'sun', x: 300, y: 250, r: 20 }, { kind: 'clouds', n: 12 }, { kind: 'birds', n: 5 }, { kind: 'water', at: 262, colour: '#22344a', glint: '#ffd0a0' }] },

  /* ---- Mountains ------------------------------------------------- */
  { key: 'peaks', name: 'The Peaks', blurb: 'Snow, rock and a very cold lake.', group: 'Mountains', sky: C.cold, skyTo: 230,
    parts: [{ kind: 'clouds', n: 9 }, { kind: 'mountains', at: 250, height: 90, colour: '#7d93ad' }, { kind: 'mountains', at: 285, height: 115, colour: '#54688a', snow: true }, { kind: 'water', at: 330, colour: '#20364d', glint: '#c8e0f4' }] },
  { key: 'treeline', name: 'The Treeline', blurb: 'Where the forest gives up.', group: 'Mountains', sky: C.day, skyTo: 190,
    parts: [{ kind: 'clouds', n: 10 }, { kind: 'birds', n: 6 }, { kind: 'mountains', at: 240, height: 100, colour: '#6d7f96', snow: true }, { kind: 'forest', at: 300, trunk: '#3f3226', leaf: '#2f5a38', n: 40 }] },
  { key: 'firstsnow', name: 'First Snow', blurb: 'Coming down over the pass.', group: 'Mountains', sky: ['#3a4256', '#606a80', '#9aa4b4'], skyTo: 240,
    parts: [{ kind: 'snowfall' }, { kind: 'mountains', at: 270, height: 110, colour: '#5a6478', snow: true }, { kind: 'forest', at: 330, trunk: '#2e2620', leaf: '#3a4a3c', n: 30 }] },
  { key: 'tarn', name: 'The Tarn', blurb: 'Still enough to be two mountains.', group: 'Mountains', sky: C.cold, skyTo: 200,
    parts: [{ kind: 'clouds', n: 8 }, { kind: 'mountains', at: 230, height: 120, colour: '#4d6182', snow: true }, { kind: 'water', at: 280, colour: '#1b2c42', glint: '#b4d0ec' }] },
  { key: 'goldenridge', name: 'Golden Ridge', blurb: 'Last light on the high ground.', group: 'Mountains', sky: C.dusk, skyTo: 230,
    parts: [{ kind: 'sun', x: 90, y: 200, r: 22 }, { kind: 'clouds', n: 11 }, { kind: 'mountains', at: 260, height: 120, colour: '#6a4a52' }, { kind: 'mountains', at: 300, height: 90, colour: '#3c2e38' }] },
  { key: 'switchback', name: 'The Switchback', blurb: 'A road that keeps changing its mind.', group: 'Mountains', sky: C.noon, skyTo: 180,
    parts: [{ kind: 'clouds', n: 12 }, { kind: 'birds', n: 8 }, { kind: 'hills', at: 230, height: 80, colour: '#7d8a5e' }, { kind: 'hills', at: 300, height: 70, colour: '#5f6c42' }, { kind: 'forest', at: 360, trunk: '#3c3024', leaf: '#43613c', n: 26 }] },
  { key: 'coldstars', name: 'Cold Stars', blurb: 'Above the snowline, after dark.', group: 'Mountains', sky: C.night, skyTo: 250,
    parts: [{ kind: 'stars', n: 140 }, { kind: 'moon', x: 110, y: 70, r: 18 }, { kind: 'mountains', at: 280, height: 120, colour: '#1c2740', snow: true }] },
  { key: 'aurora', name: 'The Lights', blurb: 'Green curtains over black rock.', group: 'Mountains', sky: C.night, skyTo: 260,
    parts: [{ kind: 'aurora' }, { kind: 'stars', n: 100 }, { kind: 'mountains', at: 300, height: 110, colour: '#101a2c', snow: true }] },
  { key: 'scree', name: 'Scree', blurb: 'Loose rock all the way down.', group: 'Mountains', sky: C.storm, skyTo: 200,
    parts: [{ kind: 'clouds', n: 14, tint: '#8f98a6' }, { kind: 'mountains', at: 250, height: 100, colour: '#5a5f68' }, { kind: 'dunes', at: 300, colour: '#6e6a64' }] },
  { key: 'valleyfog', name: 'Valley Fog', blurb: 'The tops out, the bottom gone.', group: 'Mountains', sky: ['#6a7a92', '#a8b6c6', '#dce4ec'], skyTo: 230,
    parts: [{ kind: 'mountains', at: 250, height: 110, colour: '#4a5a72', snow: true }, { kind: 'clouds', n: 18, tint: '#e6edf4' }, { kind: 'forest', at: 380, trunk: '#33302c', leaf: '#3f5244', n: 24 }] },

  /* ---- Countryside ------------------------------------------------ */
  { key: 'orchard', name: 'The Orchard', blurb: 'Rows of trees on a green slope.', group: 'Countryside', sky: C.day, skyTo: 170,
    parts: [{ kind: 'clouds', n: 10 }, { kind: 'birds', n: 6 }, { kind: 'hills', at: 190, height: 40, colour: '#6f9b62' }, { kind: 'rows', at: 400, rows: 5, leaf: '#4a8c40', fruit: '#c4352f' }] },
  { key: 'vineyard', name: 'The Vineyard', blurb: 'Stripes of vine on a warm hillside.', group: 'Countryside', sky: C.warm, skyTo: 180,
    parts: [{ kind: 'clouds', n: 9, tint: '#f0d6b4' }, { kind: 'hills', at: 200, height: 50, colour: '#8a7a4a' }, { kind: 'rows', at: 410, rows: 6, leaf: '#5a7a3a', fruit: '#6a3a72' }] },
  { key: 'patchwork', name: 'Patchwork', blurb: 'Fields in every green there is.', group: 'Countryside', sky: C.noon, skyTo: 200,
    parts: [{ kind: 'clouds', n: 12 }, { kind: 'birds', n: 9 }, { kind: 'fields', at: 210 }] },
  { key: 'haymaking', name: 'Haymaking', blurb: 'Cut, turned and waiting.', group: 'Countryside', sky: C.warm, skyTo: 190,
    parts: [{ kind: 'sun', x: 440, y: 120, r: 28 }, { kind: 'clouds', n: 8, tint: '#f4dcb8' }, { kind: 'fields', at: 200, cols: ['#d8bc72', '#c4a85e', '#e0cc8a', '#b89a54'] }] },
  { key: 'windmill', name: 'The Windmill', blurb: 'Turning, slowly, over flat country.', group: 'Countryside', sky: C.day, skyTo: 210,
    parts: [{ kind: 'clouds', n: 13 }, { kind: 'birds', n: 7 }, { kind: 'fields', at: 220 }, { kind: 'windmill', x: 400, at: 250 }] },
  { key: 'villagelane', name: 'The Village', blurb: 'Cottages, and smoke going straight up.', group: 'Countryside', sky: C.dusk, skyTo: 190,
    parts: [{ kind: 'clouds', n: 9 }, { kind: 'birds', n: 5 }, { kind: 'hills', at: 220, height: 50, colour: '#4a5a3c' }, { kind: 'village', at: 300, wall: '#e0d4b8', roof: '#8a4a3a' }] },
  { key: 'poppyfield', name: 'The Poppy Field', blurb: 'Red, as far as it goes.', group: 'Countryside', sky: C.noon, skyTo: 170,
    parts: [{ kind: 'clouds', n: 11 }, { kind: 'birds', n: 8 }, { kind: 'meadow', at: 180, grass: '#5f8a48', petals: ['#c42f2a', '#e04a3a', '#a82420'] }] },
  { key: 'lavender', name: 'Lavender', blurb: 'Purple rows and a very blue sky.', group: 'Countryside', sky: C.day, skyTo: 180,
    parts: [{ kind: 'clouds', n: 9 }, { kind: 'rows', at: 410, rows: 6, leaf: '#7a5aa8', fruit: '#c2a8e0' }] },
  { key: 'stubble', name: 'Stubble Burning', blurb: 'Smoke low over a cut field.', group: 'Countryside', sky: C.warm, skyTo: 200,
    parts: [{ kind: 'clouds', n: 14, tint: '#e0c49a' }, { kind: 'fields', at: 210, cols: ['#a88a52', '#8a6e3e', '#c4a468', '#6e5632'] }] },
  { key: 'frostmorning', name: 'Frost Morning', blurb: 'White on everything, going quickly.', group: 'Countryside', sky: ['#6a7e9c', '#a4b8cc', '#e4eef4'], skyTo: 200,
    parts: [{ kind: 'birds', n: 10 }, { kind: 'fields', at: 210, cols: ['#c4d0cc', '#b0bebc', '#d8e2de', '#9caeaa'] }, { kind: 'forest', at: 300, trunk: '#4a423a', leaf: '#8ea2a0', n: 20 }] },

  /* ---- Cities ------------------------------------------------------ */
  { key: 'market', name: 'Night Market', blurb: 'Awnings, lanterns and a lot of colour.', group: 'Cities', sky: ['#1b1226', '#2a1c38'], skyTo: 200,
    parts: [{ kind: 'stars', n: 40 }, { kind: 'city', at: 210, colour: '#2a2038', lit: '#ffca7a', tall: 70 }, { kind: 'village', at: 276, wall: '#3a2c48', roof: '#c2452f' }] },
  { key: 'skyline', name: 'The Skyline', blurb: 'Every window lit, none of them yours.', group: 'Cities', sky: C.night, skyTo: 260,
    parts: [{ kind: 'stars', n: 70 }, { kind: 'moon', x: 90, y: 56, r: 16 }, { kind: 'city', at: 300, colour: '#151c30', lit: '#ffd68a', tall: 180 }, { kind: 'water', at: 330, colour: '#0b1120', glint: '#ffd68a' }] },
  { key: 'rooftops', name: 'Rooftops', blurb: 'Chimneys and slate, all the way over.', group: 'Cities', sky: C.dusk, skyTo: 180,
    parts: [{ kind: 'clouds', n: 10 }, { kind: 'birds', n: 12 }, { kind: 'village', at: 220, wall: '#6a5a52', roof: '#4a4048' }, { kind: 'village', at: 320, wall: '#7a6a5e', roof: '#5a4a50' }] },
  { key: 'rainstreet', name: 'Rain on the Street', blurb: 'Neon in every puddle.', group: 'Cities', sky: ['#160f1e', '#241a30'], skyTo: 220,
    parts: [{ kind: 'rain' }, { kind: 'city', at: 240, colour: '#201a2c', lit: '#ff9ad0', tall: 110 }, { kind: 'water', at: 300, colour: '#181024', glint: '#ff9ad0' }] },
  { key: 'bridgecity', name: 'The Bridge', blurb: 'Iron over water, city behind.', group: 'Cities', sky: C.dawn, skyTo: 200,
    parts: [{ kind: 'clouds', n: 9 }, { kind: 'birds', n: 7 }, { kind: 'city', at: 220, colour: '#3a3a52', lit: '#ffd0a0', tall: 80 }, { kind: 'water', at: 270, colour: '#2a3a4e', glint: '#ffc898' }, { kind: 'bridge', at: 290, colour: '#5a4a44' }] },
  { key: 'trams', name: 'Tram Wires', blurb: 'A web of them against the evening.', group: 'Cities', sky: C.dusk, skyTo: 210,
    parts: [{ kind: 'clouds', n: 8 }, { kind: 'birds', n: 14 }, { kind: 'city', at: 240, colour: '#32293c', lit: '#ffdca0', tall: 100 }, { kind: 'village', at: 330, wall: '#4a3f4a', roof: '#2e2630' }] },
  { key: 'parkcity', name: 'The Park', blurb: 'Green in the middle of all that stone.', group: 'Cities', sky: C.noon, skyTo: 170,
    parts: [{ kind: 'clouds', n: 11 }, { kind: 'birds', n: 8 }, { kind: 'city', at: 200, colour: '#5a6272', lit: '#e8eef4', tall: 120 }, { kind: 'forest', at: 300, trunk: '#4a3a2a', leaf: '#4a8c48', n: 22 }, { kind: 'meadow', at: 340, grass: '#5f9a52', petals: ['#e0d44a', '#ffffff'] }] },
  { key: 'snowcity', name: 'Snow in Town', blurb: 'Quiet, for once.', group: 'Cities', sky: ['#3a4560', '#5e6a84', '#8c97ac'], skyTo: 220,
    parts: [{ kind: 'snowfall' }, { kind: 'city', at: 250, colour: '#39415a', lit: '#ffe0a8', tall: 130 }, { kind: 'village', at: 330, wall: '#d8dce4', roof: '#6a7284' }] },
  { key: 'harbourcity', name: 'Dockside', blurb: 'Cranes, containers and a cold morning.', group: 'Cities', sky: C.storm, skyTo: 200,
    parts: [{ kind: 'clouds', n: 12, tint: '#93a0b0' }, { kind: 'birds', n: 9 }, { kind: 'city', at: 230, colour: '#4a5260', lit: '#f0d090', tall: 90 }, { kind: 'water', at: 280, colour: '#333e4c', glint: '#b8c8d8' }, { kind: 'boats', at: 292, n: 4 }] },
  { key: 'festival', name: 'Festival Night', blurb: 'Kites, lanterns and nobody going home.', group: 'Cities', sky: ['#1a1030', '#32204a', '#5a3060'], skyTo: 240,
    parts: [{ kind: 'stars', n: 60 }, { kind: 'kites', n: 12 }, { kind: 'city', at: 270, colour: '#241a38', lit: '#ffca7a', tall: 90 }] },

  /* ---- Underwater --------------------------------------------------- */
  { key: 'reef', name: 'The Reef', blurb: 'Coral, fish and light coming down through it.', group: 'Underwater', sky: ['#2fa5c8', '#1c7ba0', '#0c4763'],
    parts: [{ kind: 'shafts', n: 7 }, { kind: 'coral', n: 26 }, { kind: 'fish', n: 22 }] },
  { key: 'kelp', name: 'The Kelp Forest', blurb: 'Tall green, swaying.', group: 'Underwater', sky: ['#2a7a6a', '#155a50', '#08302c'],
    parts: [{ kind: 'shafts', n: 5 }, { kind: 'forest', at: 420, trunk: '#3a6a3a', leaf: '#4a8a4a', n: 34 }, { kind: 'fish', n: 16 }] },
  { key: 'shoal', name: 'The Shoal', blurb: 'All of them turning at once.', group: 'Underwater', sky: ['#3ab0d0', '#2080a8', '#0d4a68'],
    parts: [{ kind: 'shafts', n: 6 }, { kind: 'fish', n: 60 }] },
  { key: 'deepdark', name: 'The Deep', blurb: 'Whatever is down here makes its own light.', group: 'Underwater', sky: ['#0a2038', '#061424', '#020a12'],
    parts: [{ kind: 'stars', n: 70 }, { kind: 'fish', n: 14 }, { kind: 'coral', n: 12 }] },
  { key: 'wreck', name: 'The Wreck', blurb: 'Something old, with fish living in it.', group: 'Underwater', sky: ['#24707f', '#155060', '#08303c'],
    parts: [{ kind: 'shafts', n: 4 }, { kind: 'boats', at: 340, n: 2 }, { kind: 'coral', n: 20 }, { kind: 'fish', n: 18 }] },
  { key: 'anemone', name: 'Anemones', blurb: 'Colour that moves when you touch it.', group: 'Underwater', sky: ['#2f90b0', '#1b6a88', '#0c4058'],
    parts: [{ kind: 'shafts', n: 5 }, { kind: 'coral', n: 40 }, { kind: 'fish', n: 10 }] },
  { key: 'jellies', name: 'Jellyfish', blurb: 'Drifting, lit from inside.', group: 'Underwater', sky: ['#1a2a58', '#122044', '#08122a'],
    parts: [{ kind: 'balloons', n: 12 }, { kind: 'stars', n: 50 }, { kind: 'fish', n: 8 }] },
  { key: 'lagoonfloor', name: 'The Lagoon Floor', blurb: 'White sand and a net of light on it.', group: 'Underwater', sky: ['#4fd0e0', '#2fa8c0', '#1a7890'],
    parts: [{ kind: 'shafts', n: 9 }, { kind: 'dunes', at: 330, colour: '#e4e0c8' }, { kind: 'fish', n: 20 }] },

  /* ---- Night skies -------------------------------------------------- */
  { key: 'balloons', name: 'Balloons', blurb: 'Seven of them, over a patchwork of fields.', group: 'Skies', sky: C.noon, skyTo: 260,
    parts: [{ kind: 'clouds', n: 10 }, { kind: 'fields', at: 260 }, { kind: 'balloons', n: 7 }] },
  { key: 'milkyway', name: 'The Milky Way', blurb: 'More stars than dark.', group: 'Skies', sky: C.night, skyTo: 340,
    parts: [{ kind: 'stars', n: 320 }, { kind: 'hills', at: 360, height: 50, colour: '#0d1422' }] },
  { key: 'fullmoon', name: 'Full Moon', blurb: 'Bright enough to cast a shadow.', group: 'Skies', sky: C.night, skyTo: 300,
    parts: [{ kind: 'moon', x: 380, y: 110, r: 46 }, { kind: 'stars', n: 90 }, { kind: 'clouds', n: 8, tint: '#5a6a8a' }, { kind: 'forest', at: 380, trunk: '#141a24', leaf: '#1c2a2c', n: 22 }] },
  { key: 'kiteday', name: 'Kite Day', blurb: 'Windy, and everybody had the same idea.', group: 'Skies', sky: C.day, skyTo: 280,
    parts: [{ kind: 'clouds', n: 12 }, { kind: 'kites', n: 16 }, { kind: 'meadow', at: 300, grass: '#6a9a52', petals: ['#ffffff', '#e0d44a'] }] },
  { key: 'thunderhead', name: 'Thunderhead', blurb: 'Building all afternoon.', group: 'Skies', sky: ['#3a3f52', '#6a6e82', '#aeb4c4'], skyTo: 300,
    parts: [{ kind: 'clouds', n: 22, tint: '#dfe4ee' }, { kind: 'birds', n: 8 }, { kind: 'fields', at: 320, cols: ['#5a6a48', '#4a5a3c', '#6a7a52', '#3f4c34'] }] },
  { key: 'sunsetflats', name: 'Sunset Flats', blurb: 'Nothing in the way of it.', group: 'Skies', sky: ['#2a2450', '#8a4a62', '#e08a54', '#ffd49a'], skyTo: 320,
    parts: [{ kind: 'sun', x: 280, y: 300, r: 34 }, { kind: 'clouds', n: 14 }, { kind: 'birds', n: 10 }, { kind: 'dunes', at: 340, colour: '#8a6a4a' }] },
  { key: 'comet', name: 'The Comet', blurb: 'Back again, after a long time away.', group: 'Skies', sky: C.night, skyTo: 320,
    parts: [{ kind: 'stars', n: 200 }, { kind: 'sun', x: 150, y: 110, r: 10, colour: '#dff0ff' }, { kind: 'mountains', at: 360, height: 60, colour: '#0e1624' }] },
  { key: 'dawnbirds', name: 'Dawn Chorus', blurb: 'Everything awake at once.', group: 'Skies', sky: C.dawn, skyTo: 300,
    parts: [{ kind: 'sun', x: 420, y: 250, r: 30 }, { kind: 'clouds', n: 12 }, { kind: 'birds', n: 34 }, { kind: 'forest', at: 380, trunk: '#3a2e24', leaf: '#3f5e34', n: 24 }] },
  { key: 'snowsky', name: 'Snow Sky', blurb: 'That particular yellow-grey.', group: 'Skies', sky: ['#6a6a72', '#8e8c92', '#c4c0bc'], skyTo: 300,
    parts: [{ kind: 'snowfall' }, { kind: 'birds', n: 6 }, { kind: 'forest', at: 360, trunk: '#3a342e', leaf: '#8a9490', n: 26 }] },

  /* ---- Gardens ------------------------------------------------------ */
  { key: 'cottagegarden', name: 'Cottage Garden', blurb: 'Everything planted too close together.', group: 'Gardens', sky: C.day, skyTo: 150,
    parts: [{ kind: 'clouds', n: 8 }, { kind: 'meadow', at: 160, grass: '#4a7a3a', petals: ['#e04a6a', '#e0d44a', '#8a5ac2', '#ffffff', '#e08a3a'] }] },
  { key: 'wisteria', name: 'Wisteria', blurb: 'Hanging down over everything.', group: 'Gardens', sky: C.noon, skyTo: 140,
    parts: [{ kind: 'clouds', n: 7 }, { kind: 'rows', at: 300, rows: 4, leaf: '#6a5a9a', fruit: '#c4a8e8' }, { kind: 'meadow', at: 330, grass: '#5a8a48', petals: ['#c4a8e8', '#ffffff'] }] },
  { key: 'pondgarden', name: 'The Pond', blurb: 'Lilies, and something moving under them.', group: 'Gardens', sky: C.day, skyTo: 150,
    parts: [{ kind: 'clouds', n: 8 }, { kind: 'forest', at: 200, trunk: '#4a3a2a', leaf: '#4a8a48', n: 16 }, { kind: 'water', at: 240, colour: '#2f5a48', glint: '#c8f0d8' }, { kind: 'fish', n: 10 }] },
  { key: 'sunflowers', name: 'Sunflowers', blurb: 'All facing the same way.', group: 'Gardens', sky: C.noon, skyTo: 160,
    parts: [{ kind: 'clouds', n: 9 }, { kind: 'birds', n: 6 }, { kind: 'meadow', at: 170, grass: '#4a6a2a', petals: ['#e8c43a', '#f0d868', '#c49a2a'] }] },
  { key: 'greenhouse', name: 'The Greenhouse', blurb: 'Glass, damp air and a great deal of green.', group: 'Gardens', sky: C.mint, skyTo: 200,
    parts: [{ kind: 'stripes', cols: ['#2a6a5a', '#357a68', '#2f7060'] }, { kind: 'forest', at: 400, trunk: '#4a5a3a', leaf: '#3f8a5a', n: 30 }] },
  { key: 'rosewalk', name: 'The Rose Walk', blurb: 'Arches, and petals on the path.', group: 'Gardens', sky: C.dusk, skyTo: 160,
    parts: [{ kind: 'clouds', n: 8 }, { kind: 'rings', cols: ['#8a3a4a', '#c46a7a', '#e8a8b4'] }, { kind: 'petalstorm', cols: ['#e8a8b4', '#c46a7a', '#ffffff'] }] },
  { key: 'herbbeds', name: 'The Herb Beds', blurb: 'Squares of every green and grey.', group: 'Gardens', sky: C.day, skyTo: 140,
    parts: [{ kind: 'clouds', n: 7 }, { kind: 'tiles', cols: ['#5a7a4a', '#6f8a52', '#8a9a6a', '#47603c', '#7f8f62'] }] },
  { key: 'blossom', name: 'Blossom', blurb: 'Two weeks of it, then gone.', group: 'Gardens', sky: C.day, skyTo: 180,
    parts: [{ kind: 'clouds', n: 8 }, { kind: 'rows', at: 400, rows: 4, leaf: '#e8b8c8', fruit: '#ffffff' }, { kind: 'petalstorm', cols: ['#f4cddb', '#ffffff'] }] },
  { key: 'nightgarden', name: 'The Night Garden', blurb: 'White flowers, because they show up.', group: 'Gardens', sky: C.night, skyTo: 180,
    parts: [{ kind: 'stars', n: 70 }, { kind: 'moon', x: 440, y: 60, r: 22 }, { kind: 'meadow', at: 200, grass: '#1e3a2c', petals: ['#ffffff', '#dff0e8'] }] },

  /* ---- Patterns ------------------------------------------------------ */
  { key: 'quilt', name: 'The Quilt', blurb: 'Squares, and no two the same.', group: 'Patterns', sky: ['#2a2a34'],
    parts: [{ kind: 'tiles', cols: ['#c4452f', '#2f6ec2', '#e0a03a', '#4a8c40', '#8a5ac2', '#e8d4a8', '#2fa5b8'] }] },
  { key: 'bunting', name: 'Bunting', blurb: 'Strung corner to corner.', group: 'Patterns', sky: C.day, skyTo: 420,
    parts: [{ kind: 'clouds', n: 10 }, { kind: 'kites', n: 22 }] },
  { key: 'ripples', name: 'Ripples', blurb: 'Rings going out from somewhere.', group: 'Patterns', sky: ['#123a4a'],
    parts: [{ kind: 'rings', cols: ['#2fa5b8', '#4fd0e0', '#1a7890', '#dff8ff'] }] },
  { key: 'stainedglass', name: 'Stained Glass', blurb: 'Lit from behind.', group: 'Patterns', sky: ['#1a1420'],
    parts: [{ kind: 'tiles', cols: ['#c42f4a', '#2f6ac4', '#e0b03a', '#3f8a4a', '#7a3ac2', '#c46a2f'] }, { kind: 'rings', cols: ['#ffe8a8', '#ffffff'] }] },
  { key: 'tartan', name: 'Tartan', blurb: 'Crossing itself over and over.', group: 'Patterns', sky: ['#20242c'],
    parts: [{ kind: 'stripes', cols: ['#2a4a6a', '#6a2a2a', '#d8c48a', '#2a3a2a'] }, { kind: 'stripes', cols: ['#2a4a6a', '#6a2a2a', '#d8c48a', '#2a3a2a'], diagonal: true }] },
  { key: 'confetti', name: 'Confetti', blurb: 'Thrown, and still coming down.', group: 'Patterns', sky: ['#1e1a2a', '#2c2640'],
    parts: [{ kind: 'petalstorm', cols: ['#e04a6a', '#e0d44a', '#4ad0e0', '#8a5ac2', '#4ae08a', '#ffffff'] }] },
  { key: 'sunburst', name: 'Sunburst', blurb: 'Rays all the way to the edges.', group: 'Patterns', sky: ['#e8a83a', '#f4d06a'],
    parts: [{ kind: 'stripes', cols: ['#e8a83a', '#f4d888', '#d88a2a'], diagonal: true }, { kind: 'rings', cols: ['#fff0c4', '#ffd88a'] }] },
  { key: 'mosaic', name: 'Mosaic', blurb: 'Small tiles, laid by hand.', group: 'Patterns', sky: ['#1a2a30'],
    parts: [{ kind: 'tiles', cols: ['#2f7a8a', '#3f9aa8', '#d8c48a', '#c46a4a', '#1f5a68', '#8ac4c8'] }] },
  { key: 'feathers', name: 'Feathers', blurb: 'Overlapping, all one way.', group: 'Patterns', sky: ['#243040'],
    parts: [{ kind: 'rings', cols: ['#4a7a9a', '#6a9aba', '#2f5a76', '#a8cade'] }, { kind: 'petalstorm', cols: ['#a8cade', '#6a9aba'] }] },
]
