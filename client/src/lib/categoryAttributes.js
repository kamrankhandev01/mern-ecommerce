import { MORE_CATEGORY_SCHEMAS } from "./categoryAttributesMore.js";

/**
 * Per-category attribute schemas for the admin product form.
 *
 * The form used to ask admins to type raw JSON, which is easy to get wrong and
 * impossible to discover: nothing told you which attributes a category should
 * have, and a typo silently became a product with one odd spec on the storefront.
 *
 * Each field declares a `key` (the stored name), a friendly `label`, and a
 * `type` that decides which control the admin sees:
 *
 *   text     a free-text box
 *   number   numeric input
 *   select   a fixed list of choices
 *   boolean  a yes/no toggle
 *
 * Keys are matched case-insensitively against what is already stored, so
 * existing products keep their data when reopened. `aliases` lets a field pick
 * up older key spellings (for example `Battery` vs `Battery Life`).
 */

const COMMON_FIELDS = {
  material: {
    key: "Material",
    label: "Material",
    type: "text",
    placeholder: "e.g. Solid oak",
  },
  weight: {
    key: "Weight",
    label: "Weight",
    type: "text",
    placeholder: "e.g. 480g",
  },
  warranty: {
    key: "Warranty",
    label: "Warranty",
    type: "text",
    placeholder: "e.g. 2 years",
  },
  care: {
    key: "Care",
    label: "Care instructions",
    type: "text",
    placeholder: "e.g. Hand wash",
  },
  colour: {
    key: "Color",
    label: "Colour",
    type: "text",
    placeholder: "e.g. Black",
  },
};

/**
 * All known categories: the flagship set defined here, plus the wider catalogue
 * in `categoryAttributesMore`. Anything else falls back to `GENERIC_FIELDS`.
 */
/** The flagship categories, defined inline. Merged with the wider set below. */
const CORE_CATEGORY_SCHEMAS = {
  Electronics: {
    fields: [
      {
        key: "Connectivity",
        label: "Connectivity",
        type: "select",
        options: [
          "Wired",
          "Bluetooth",
          "USB-C",
          "Wi-Fi",
          "Wired / Bluetooth",
          "Wired / Type-C",
        ],
      },
      COMMON_FIELDS.colour,
      {
        key: "BatteryLife",
        label: "Battery life",
        type: "text",
        placeholder: "e.g. 12 hours",
        aliases: ["Battery"],
      },
      {
        key: "Power",
        label: "Power / rating",
        type: "text",
        placeholder: "e.g. 100W",
        aliases: ["Rating", "Output"],
      },
      {
        key: "Port",
        label: "Port(s)",
        type: "text",
        placeholder: "e.g. USB-C, HDMI",
        aliases: ["Ports", "Connector"],
      },
      {
        key: "SwitchType",
        label: "Switch type",
        type: "text",
        placeholder: "e.g. Brown tactile",
        aliases: ["Switches", "Switch"],
      },
      {
        key: "Backlight",
        label: "Backlight",
        type: "select",
        options: ["None", "White", "RGB", "Per-key RGB"],
      },
      {
        key: "Resolution",
        label: "Resolution",
        type: "select",
        options: ["720p", "1080p", "4K", "4K HDR", "8K"],
      },
      {
        key: "Length",
        label: "Length",
        type: "text",
        placeholder: "e.g. 2m",
      },
      {
        key: "WaterResistance",
        label: "Water resistance",
        type: "select",
        options: ["None", "Splash resistant", "IPX4", "IPX5", "IPX7", "IP68"],
        aliases: ["Water resistance", "Waterproof"],
      },
      COMMON_FIELDS.warranty,
    ],
  },

  Fashion: {
    fields: [
      COMMON_FIELDS.material,
      {
        key: "Fit",
        label: "Fit",
        type: "select",
        options: ["Slim", "Regular", "Relaxed", "Oversized"],
      },
      {
        key: "Sizes",
        label: "Sizes",
        type: "text",
        placeholder: "e.g. 28-40, or S-XL",
        aliases: ["Size"],
      },
      {
        key: "DialSize",
        label: "Dial size",
        type: "text",
        placeholder: "e.g. 40mm",
      },
      {
        key: "Buckle",
        label: "Buckle",
        type: "text",
        placeholder: "e.g. Solid brass",
      },
      {
        key: "Capacity",
        label: "Capacity",
        type: "text",
        placeholder: "e.g. 35L",
      },
      {
        key: "Base",
        label: "Base",
        type: "text",
        placeholder: "e.g. Leather",
      },
      {
        key: "WaterResistance",
        label: "Water resistance",
        type: "select",
        options: ["None", "Splash resistant", "IPX5", "IPX7", "Waterproof"],
        aliases: ["Water resistance"],
      },
      COMMON_FIELDS.care,
    ],
  },

  "Home & Kitchen": {
    fields: [
      COMMON_FIELDS.material,
      {
        key: "Capacity",
        label: "Capacity",
        type: "text",
        placeholder: "e.g. 1L",
      },
      {
        key: "Pieces",
        label: "Pieces included",
        type: "number",
        placeholder: "e.g. 4",
        min: 1,
      },
      {
        key: "Size",
        label: "Size",
        type: "text",
        placeholder: "e.g. 50 x 70cm",
        aliases: ["Dimensions"],
      },
      {
        key: "Diameter",
        label: "Diameter",
        type: "text",
        placeholder: "e.g. 26cm",
      },
      {
        key: "Base",
        label: "Cooktop / base",
        type: "select",
        options: ["Gas", "Electric", "Induction", "Ceramic", "Any"],
      },
      {
        key: "OvenSafe",
        label: "Oven safe",
        type: "boolean",
        aliases: ["Oven safe"],
      },
      {
        key: "DishwasherSafe",
        label: "Dishwasher safe",
        type: "boolean",
        aliases: ["Dishwasher"],
      },
      COMMON_FIELDS.weight,
      COMMON_FIELDS.care,
    ],
  },

  Outdoors: {
    fields: [
      {
        key: "Capacity",
        label: "Capacity",
        type: "text",
        placeholder: "e.g. 750ml",
      },
      {
        key: "Cold",
        label: "Keeps cold for",
        type: "text",
        placeholder: "e.g. 24 hours",
      },
      COMMON_FIELDS.weight,
      {
        key: "Layers",
        label: "Layers",
        type: "number",
        placeholder: "e.g. 3",
        min: 1,
      },
      {
        key: "Coating",
        label: "Coating",
        type: "text",
        placeholder: "e.g. Powder coat",
      },
      {
        key: "Lid",
        label: "Lid",
        type: "text",
        placeholder: "e.g. Cork-lined",
      },
      {
        key: "BoilTime",
        label: "Boil time",
        type: "text",
        placeholder: "e.g. 3.5 min",
        aliases: ["Boil time"],
      },
      {
        key: "Ignition",
        label: "Ignition",
        type: "select",
        options: ["Manual", "Piezo", "Electric"],
      },
      {
        key: "Packs",
        label: "Packs down",
        type: "text",
        placeholder: "e.g. Folds into its own pocket",
        aliases: ["Packs into itself"],
      },
      {
        key: "WaterResistance",
        label: "Water resistance",
        type: "select",
        options: ["None", "Splash resistant", "IPX5", "IPX7", "Waterproof"],
        aliases: ["Water resistance"],
      },
    ],
  },

  Stationery: {
    fields: [
      COMMON_FIELDS.material,
      {
        key: "Pages",
        label: "Pages",
        type: "number",
        placeholder: "e.g. 192",
        min: 1,
      },
      {
        key: "Grid",
        label: "Grid / ruling",
        type: "select",
        options: ["Dot", "Ruled", "Blank", "Graph", "Squared"],
      },
      {
        key: "Paper",
        label: "Paper weight",
        type: "text",
        placeholder: "e.g. 100gsm",
      },
      {
        key: "Body",
        label: "Barrel / body",
        type: "text",
        placeholder: "e.g. Aluminium",
      },
      {
        key: "Ink",
        label: "Ink",
        type: "text",
        placeholder: "e.g. Refillable",
      },
      {
        key: "Finish",
        label: "Finish",
        type: "text",
        placeholder: "e.g. Hardwax oiled",
      },
      COMMON_FIELDS.weight,
    ],
  },

  Fitness: {
    fields: [
      COMMON_FIELDS.material,
      {
        key: "Thickness",
        label: "Thickness",
        type: "text",
        placeholder: "e.g. 4.5mm",
      },
      {
        key: "Range",
        label: "Weight range",
        type: "text",
        placeholder: "e.g. 2.5-24kg each",
      },
      {
        key: "Bands",
        label: "Bands included",
        type: "number",
        placeholder: "e.g. 5",
        min: 1,
      },
      {
        key: "Handle",
        label: "Handle",
        type: "text",
        placeholder: "e.g. Knurled steel",
      },
      COMMON_FIELDS.weight,
    ],
  },

  Lighting: {
    fields: [
      COMMON_FIELDS.material,
      {
        key: "Brightness",
        label: "Brightness",
        type: "select",
        options: [
          "Dimmable",
          "3-step dimmable",
          "Single brightness",
          "Adjustable white",
        ],
      },
      {
        key: "Battery",
        label: "Battery life",
        type: "text",
        placeholder: "e.g. 12 hours",
        aliases: ["BatteryLife"],
      },
      {
        key: "Base",
        label: "Base / fitting",
        type: "text",
        placeholder: "e.g. USB-C, or E27",
      },
      {
        key: "CordLength",
        label: "Cord length",
        type: "text",
        placeholder: "e.g. 2m",
        aliases: ["Cord length"],
      },
      {
        key: "Fitting",
        label: "Lamp fitting",
        type: "select",
        options: ["E27", "E14", "G9", "GU10", "Integrated LED", "USB"],
      },
    ],
  },
};

/**
 * All known categories: the flagship set defined here, plus the wider catalogue
 * in `categoryAttributesMore`. Anything else falls back to `GENERIC_FIELDS`.
 */
export const CATEGORY_SCHEMAS = {
  ...CORE_CATEGORY_SCHEMAS,
  ...MORE_CATEGORY_SCHEMAS,
};

/** Shown when a category has no schema of its own. */
export const GENERIC_FIELDS = [
  COMMON_FIELDS.material,
  {
    key: "Colour",
    label: "Colour",
    type: "text",
    placeholder: "e.g. Black",
    aliases: ["Color"],
  },
  {
    key: "Size",
    label: "Size",
    type: "text",
    placeholder: "e.g. Medium",
  },
  COMMON_FIELDS.weight,
  COMMON_FIELDS.care,
];

export const CATEGORY_OPTIONS = [
  ...Object.keys(CATEGORY_SCHEMAS).sort(),
  "Books",
  "Beauty",
  "Toys & Games",
];

const normalise = (value) => String(value || "").trim().toLowerCase();

/** Category match, tolerating case and surrounding spaces. */
const resolveCategory = (category) => {
  const wanted = normalise(category);
  if (!wanted) return "";
  return (
    Object.keys(CATEGORY_SCHEMAS).find((name) => normalise(name) === wanted) ||
    ""
  );
};

export const fieldsForCategory = (category) => {
  const match = resolveCategory(category);
  return match ? CATEGORY_SCHEMAS[match].fields : GENERIC_FIELDS;
};

export const hasCustomSchema = (category) =>
  Boolean(resolveCategory(category));

/**
 * Whether a stored string should light up a boolean field.
 *
 * Existing data is inconsistent: the schema writes "Yes", but older rows and
 * hand-written values use "Safe", "true", "1" and similar. Treating anything
 * affirmative as `true` means those products are not silently reset to "off"
 * the first time an admin opens and saves them.
 */
const TRUTHY = /^(true|yes|y|1|on|safe|dishwasher ?safe|oven ?safe)$/i;

/** How a boolean is written back, so the storefront reads naturally. */
const booleanLabel = (field) => {
  const key = field.key.toLowerCase();
  if (key.includes("dishwasher")) return "Dishwasher safe";
  if (key.includes("oven")) return "Oven safe";
  return "Yes";
};

/**
 * Read a stored attribute for a field, honouring aliases.
 *
 * Without this, editing a product seeded with `Battery` would open the form
 * with an empty "Battery life" box and silently drop the value on save.
 */
const readValue = (stored, field) => {
  if (!stored || typeof stored !== "object") return "";
  const candidates = [field.key, ...(field.aliases || [])];
  const byKey = new Map(
    Object.entries(stored).map(([key, value]) => [normalise(key), value]),
  );
  for (const candidate of candidates) {
    const found = byKey.get(normalise(candidate));
    if (found !== undefined && found !== null && found !== "") {
      return String(found);
    }
  }
  return "";
};

/**
 * Turn stored attributes into form values for the given category.
 * Anything with no matching field is reported so it can be preserved.
 */
export const attributesToForm = (stored, category) => {
  const source =
    stored && typeof stored === "object" && !Array.isArray(stored) ? stored : {};
  const fields = fieldsForCategory(category);

  const values = {};
  for (const field of fields) {
    const raw = readValue(source, field);
    if (field.type === "boolean") {
      values[field.key] = TRUTHY.test(raw.trim());
    } else {
      values[field.key] = raw;
    }
  }

  // Anything the schema does not know about, so saving does not delete it.
  const known = new Set(
    fields.flatMap((field) =>
      [field.key, ...(field.aliases || [])].map(normalise),
    ),
  );
  const extras = {};
  for (const [key, value] of Object.entries(source)) {
    if (!known.has(normalise(key))) extras[key] = value;
  }

  return { values, extras };
};

/** Form values plus preserved extras back into a flat attributes object. */
export const formToAttributes = (values, extras = {}, category = "") => {
  const fields = fieldsForCategory(category);
  const result = {};

  for (const field of fields) {
    const value = values?.[field.key];
    if (field.type === "boolean") {
      // Only persist a boolean when it is switched on, so the storefront does
      // not show "Oven safe: No" on every product.
      if (value) result[field.key] = booleanLabel(field);
      continue;
    }
    const text = String(value ?? "").trim();
    if (text) result[field.key] = text;
  }

  for (const [key, value] of Object.entries(extras || {})) {
    const text = String(value ?? "").trim();
    if (text) result[key] = text;
  }

  return result;
};

/** The attribute keys this category expects, for the admin summary line. */
export const schemaKeysFor = (category) =>
  fieldsForCategory(category).map((field) => field.key);
