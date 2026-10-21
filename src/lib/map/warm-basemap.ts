import type { Map as MapLibreMap } from "maplibre-gl";

const PAPER = "#FBF7F0";
const LAND = "#F3EDE3";
const WATER = "#C5D4E0";
const ROAD = "#E8E0D4";
const ROAD_MAJOR = "#D9CFC0";
const BUILDING = "#EDE6DA";
const LABEL = "#5B6475";

/**
 * Tint an OpenFreeMap / liberty-like style toward warm paper tones
 * so heat-colored pins pop. Best-effort — skips missing layers.
 */
export function applyWarmBasemap(map: MapLibreMap) {
  const style = map.getStyle();
  if (!style?.layers) return;

  for (const layer of style.layers) {
    const id = layer.id;
    const type = layer.type;
    try {
      if (type === "background") {
        map.setPaintProperty(id, "background-color", PAPER);
        continue;
      }

      const lower = id.toLowerCase();

      if (type === "fill") {
        if (/water|ocean|river|lake/.test(lower)) {
          map.setPaintProperty(id, "fill-color", WATER);
          map.setPaintProperty(id, "fill-opacity", 0.85);
        } else if (/land|earth|park|grass|wood|forest|landcover|landuse/.test(lower)) {
          map.setPaintProperty(id, "fill-color", LAND);
        } else if (/building/.test(lower)) {
          map.setPaintProperty(id, "fill-color", BUILDING);
          map.setPaintProperty(id, "fill-opacity", 0.55);
        }
      }

      if (type === "line") {
        if (/water/.test(lower)) {
          map.setPaintProperty(id, "line-color", WATER);
        } else if (/motorway|trunk|primary/.test(lower)) {
          map.setPaintProperty(id, "line-color", ROAD_MAJOR);
          map.setPaintProperty(id, "line-opacity", 0.7);
        } else if (/road|street|path|highway|bridge|tunnel/.test(lower)) {
          map.setPaintProperty(id, "line-color", ROAD);
          map.setPaintProperty(id, "line-opacity", 0.55);
        }
      }

      if (type === "symbol") {
        if (/label|name|place|road/.test(lower)) {
          try {
            map.setPaintProperty(id, "text-color", LABEL);
            map.setPaintProperty(id, "text-halo-color", PAPER);
            map.setPaintProperty(id, "text-halo-width", 1.2);
          } catch {
            // some symbol layers lack text paint
          }
        }
      }
    } catch {
      // layer paint keys vary by style — ignore
    }
  }
}
