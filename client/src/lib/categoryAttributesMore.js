/**
 * Schemas for the wider catalogue.
 *
 * Kept in a second module purely for file size. These mirror the attribute
 * names the stored products actually use, so an admin filling in a "Gaming"
 * product sees fields that match the rest of that category.
 *
 * Every field is optional, and anything not listed here is preserved as an
 * "other attribute" by the main module, so a short list can never lose data.
 */

const t = (key, label, placeholder) => ({ key, label, type: "text", placeholder });
const n = (key, label, placeholder, min = 1) => ({
  key,
  label,
  type: "number",
  placeholder,
  min,
});
const s = (key, label, options) => ({ key, label, type: "select", options });
/*
 * Boolean fields are almost always phrased as the attribute itself, so the
 * label defaults to the key. Passing only one argument is therefore safe —
 * without this default a missing label silently renders an empty checkbox.
 */
const b = (key, label = key) => ({ key, label, type: "boolean" });

const yesNo = ["No", "Yes"];

export const MORE_CATEGORY_SCHEMAS = {
  Apparel: {
    fields: [
      t("Size", "Size", "e.g. M"),
      s("Fit", "Fit", ["Slim", "Regular", "Relaxed", "Oversized"]),
      t("Material", "Material", "e.g. Organic cotton"),
      t("Fabric", "Fabric", "e.g. 100% cotton"),
      s("Insulation", "Insulation", ["None", "Light", "Medium", "Heavy"]),
      t("Wash", "Care", "e.g. Machine wash cold"),
      t("Color", "Colour", "e.g. Black"),
    ],
  },

  "Beauty & Skincare": {
    fields: [
      t("Volume", "Volume", "e.g. 50ml"),
      s("Skin Type", "Skin type", ["All", "Dry", "Oily", "Combination", "Sensitive"]),
      t("Key Active", "Key active ingredient", "e.g. Niacinamide"),
      b("Sulfate-Free"),
      b("Cruelty-Free"),
      t(
        "Organic",
        "Organic",
        "e.g. Yes, or Certified Organic",
      ),
      t("Finish", "Finish", "e.g. Matte"),
      s("Scent", "Scent", ["Unscented", "Floral", "Citrus", "Woody"]),
    ],
  },

  "Hair Care": {
    fields: [
      s("Hair Type", "Hair type", ["All", "Straight", "Wavy", "Curly", "Coily"]),
      t("Key Ingredient", "Key ingredient", "e.g. Argan oil"),
      t("Wattage", "Wattage", "e.g. 1800W"),
      t("Technology", "Technology", "e.g. Ionic"),
      t("Attachments", "Attachments", "e.g. Diffuser"),
      t("Plate Size", "Plate size", "e.g. 38mm"),
      t("Max Temp", "Max temperature", "e.g. 230C"),
      t("Anti-Static", "Anti-static", "e.g. Yes"),
      t("Shut-Off", "Auto shut-off", "e.g. Auto 60 Min, or Yes"),
    ],
  },

  "Health & Wellness": {
    fields: [
      t("Speeds", "Speeds", "e.g. 3"),
      t("Battery", "Battery", "e.g. Rechargeable"),
      t("Attachments", "Attachments", "e.g. 3 heads"),
      t("Cuff Size", "Cuff size", "e.g. 22-42cm"),
      t("Memory", "Memory", "e.g. 60 readings"),
      t("Power", "Power", "e.g. 5W"),
      t("Run Time", "Run time", "e.g. 60 min"),
      t("Max Weight", "Max weight", "e.g. 150kg"),
    ],
  },

  Bedding: {
    fields: [
      t("Size", "Size", "e.g. Queen"),
      t("Material", "Material", "e.g. Cotton"),
      t("Fill", "Fill", "e.g. Down alternative"),
      t("Pocket Depth", "Pocket depth", "e.g. 12in"),
      t("Dimensions", "Dimensions", "e.g. 230 x 230cm"),
      t("Machine Washable", "Machine washable", "e.g. Yes, or 100% Barrier"),
      t("Waterproof", "Waterproof", "e.g. Yes, or 100% Barrier"),
      t("Hypoallergenic", "Hypoallergenic", "e.g. Yes"),
      t("Cover", "Cover", "e.g. Fitted sheet"),
      t("Pattern", "Pattern", "e.g. 400 thread count"),
    ],
  },

  "Home Decor": {
    fields: [
      t("Material", "Material", "e.g. Ceramic"),
      t("Color", "Colour", "e.g. Terracotta"),
      t("Dimensions", "Dimensions", "e.g. 20 x 20cm"),
      t("Diameter", "Diameter", "e.g. 18cm"),
      t("Shape", "Shape", "e.g. Round"),
      t("Finish", "Finish", "e.g. Matte"),
      t("Burn Time", "Burn time", "e.g. 40 hours"),
      s("Orientation", "Orientation", ["Vertical", "Horizontal"]),
    ],
  },

  Kitchenware: {
    fields: [
      t("Material", "Material", "e.g. Stainless steel"),
      t("Steel", "Steel", "e.g. 18/10"),
      t("Handle", "Handle", "e.g. Hollow handle"),
      t("Capacity", "Capacity", "e.g. 2L"),
      t("Blade Length", "Blade length", "e.g. 20cm"),
      t("Dimensions", "Dimensions", "e.g. 30 x 18cm"),
      t("Lid", "Lid", "e.g. Splash-proof, or None"),
      b("BPA Free"),
    ],
  },

  Jewelry: {
    fields: [
      t("Metal", "Metal", "e.g. Sterling silver"),
      t("Stone", "Stone", "e.g. Sapphire"),
      t("Plating", "Plating", "e.g. 18k gold"),
      t("Clasp", "Clasp", "e.g. Lobster"),
      t("Chain Length", "Chain length", "e.g. 45cm"),
      t("Size", "Size", "e.g. M"),
      t("Finish", "Finish", "e.g. Polished"),
      b("Hypoallergenic"),
    ],
  },

  Watches: {
    fields: [
      t("Case Diameter", "Case diameter", "e.g. 40mm"),
      t("Case Size", "Case size", "e.g. 40mm"),
      t("Band", "Band", "e.g. Leather"),
      t("Strap Material", "Strap material", "e.g. Full-grain leather"),
      s("Movement", "Movement", ["Quartz", "Automatic", "Mechanical", "Smart"]),
      s("Display", "Display", ["Analog", "Digital", "Hybrid"]),
      t("Crystal", "Crystal", "e.g. Sapphire"),
      s("Water Resistance", "Water resistance", ["None", "30m", "50m", "100m", "200m"]),
    ],
  },

  Footwear: {
    fields: [
      t("Size", "Size", "e.g. UK 8"),
      t("Material", "Material", "e.g. Full-grain leather"),
      t("Sole", "Sole", "e.g. Rubber"),
      s("Waterproof", "Waterproof", yesNo),
      t("Support", "Support", "e.g. Arch support"),
      t("Style", "Style", "e.g. Chelsea boot"),
      t("Color", "Colour", "e.g. Tan"),
    ],
  },

  "Luggage & Travel": {
    fields: [
      t("Size", "Size", "e.g. Cabin"),
      t("Material", "Material", "e.g. Waxed canvas"),
      t("Capacity", "Capacity", "e.g. 35L"),
      t("Filling", "Filling", "e.g. Recycled polyester"),
      t("Lock", "Lock", "e.g. TSA"),
      t("Compatibility", "Compatibility", "e.g. 55x40x23cm"),
      t("Slots", "Slots", "e.g. 2"),
      t("Includes", "Includes", "e.g. Detachable pouch"),
    ],
  },

  "Outdoor Recreation": {
    fields: [
      t("Capacity", "Capacity", "e.g. 30L"),
      t("Sport", "Sport", "e.g. Hiking"),
      t("Max Load", "Max load", "e.g. 15kg"),
      t("Material", "Material", "e.g. 210D nylon"),
      s("Waterproof", "Waterproof", yesNo),
      s("Seasons", "Seasons", ["All season", "Summer", "Winter", "3-season"]),
      t("Included", "Included", "e.g. Tent, poles, pegs"),
    ],
  },

  Gardening: {
    fields: [
      t("Material", "Material", "e.g. Powder-coated steel"),
      t("Cut Capacity", "Cut capacity", "e.g. 38mm"),
      t("Blade", "Blade", "e.g. Carbon steel"),
      t("Handle", "Handle", "e.g. Soft grip"),
      t("Light", "Light", "e.g. Full spectrum"),
      t("Power", "Power", "e.g. 20W"),
      t("Nozzle", "Nozzle", "e.g. Adjustable"),
      b("Foldable"),
    ],
  },

  "Tools & Hardware": {
    fields: [
      t("Voltage", "Voltage", "e.g. 18V"),
      t("Speed", "Speed", "e.g. 0-1800 rpm"),
      t("Chuck Size", "Chuck size", "e.g. 13mm"),
      t("Blade Width", "Blade width", "e.g. 165mm"),
      t("Length", "Length", "e.g. 300mm"),
      t("Pieces", "Pieces", "e.g. 12"),
      t("Range", "Range", "e.g. 0-10m"),
      t("Accuracy", "Accuracy", "e.g. +/- 0.5mm"),
    ],
  },

  "Sports Equipment": {
    fields: [
      t("Size", "Size", "e.g. 5"),
      t("Material", "Material", "e.g. Composite"),
      t("Head Size", "Head size", "e.g. 100 sq in"),
      t("Grip Size", "Grip size", "e.g. 4 1/4in"),
      t("Construction", "Construction", "e.g. Forged"),
      t("Includes", "Includes", "e.g. Bag"),
      t("Use", "Use", "e.g. Match play"),
    ],
  },

  "Fitness & Gym": {
    fields: [
      t("Material", "Material", "e.g. Nylon"),
      t("Weight", "Weight", "e.g. 2.5kg"),
      t("Thickness", "Thickness", "e.g. 10mm"),
      t("Levels", "Levels", "e.g. 8"),
      t("Quantity", "Quantity", "e.g. 2"),
      t("Density", "Density", "e.g. Medium"),
      t("Length", "Length", "e.g. 183cm"),
      t("Bearings", "Bearings", "e.g. Sealed"),
    ],
  },

  Cycling: {
    fields: [
      t("Material", "Material", "e.g. Aluminium"),
      t("Brightness", "Brightness", "e.g. 800 lumens"),
      t("Battery", "Battery", "e.g. Rechargeable"),
      t("Waterproof", "Water resistance", "e.g. IPX6, or Yes"),
      t("Compatibility", "Compatibility", "e.g. 700c"),
      t("Max Pressure", "Max pressure", "e.g. 120 PSI"),
      t("Valve", "Valve", "e.g. Presta"),
      t("Gauge", "Gauge", "e.g. Digital"),
    ],
  },

  Gaming: {
    fields: [
      n("DPI", "DPI", "e.g. 16000"),
      t("Buttons", "Buttons", "e.g. 6"),
      t("Sensor", "Sensor", "e.g. Optical"),
      s("Connectivity", "Connectivity", ["Wired", "Wireless", "Bluetooth", "2.4GHz"]),
      t("Battery", "Battery", "e.g. 30 hours"),
      t("Platform", "Platform", "e.g. PC, PS5"),
      t("Audio", "Audio", "e.g. 7.1 surround"),
      t("Compatibility", "Compatibility", "e.g. Windows 11"),
    ],
  },

  "Smart Home": {
    fields: [
      t("Connectivity", "Connectivity", "e.g. Wi-Fi + Matter"),
      t("Wattage", "Wattage", "e.g. 9W"),
      t("Resolution", "Resolution", "e.g. 2K"),
      t("Power", "Power", "e.g. Solar"),
      t("App", "App", "e.g. iOS and Android"),
      t("Compatibility", "Compatibility", "e.g. Alexa, Google Home"),
      t("Energy Star", "Energy Star", "e.g. Certified, or Yes"),
      t("Night Vision", "Night vision", "e.g. Up to 30ft"),
      t("Color Modes", "Colour modes", "e.g. 16 million"),
      t("LED Count", "LED count", "e.g. 24"),
      t("Control", "Control", "e.g. App and voice"),
      t("Color Temperature", "Colour temperature", "e.g. 2700-6500K"),
    ],
  },

  "Office Supplies": {
    fields: [
      t("Capacity", "Capacity", "e.g. 20L"),
      t("Material", "Material", "e.g. Recycled PET"),
      t("Type", "Type", "e.g. Backpack"),
      t("Bin Size", "Bin size", "e.g. 3x"),
      t("Dimensions", "Dimensions", "e.g. 30 x 45cm"),
      t("Compatibility", "Compatibility", "e.g. 16 inch laptops"),
      t("Backing", "Backing", "e.g. Anti-slip"),
      b("Foldable"),
    ],
  },

  "Books & Stationery": {
    fields: [
      n("Pages", "Pages", "e.g. 320"),
      t("Paper", "Paper", "e.g. 100gsm cream"),
      t("Cover", "Cover", "e.g. Hardcover"),
      t("Binding", "Binding", "e.g. Sewn"),
      t("Material", "Material", "e.g. Brass"),
      t("Nib Size", "Nib size", "e.g. Medium"),
      b("Refillable"),
      b("Non-Toxic"),
    ],
  },

  "Art & Craft": {
    fields: [
      t("Material", "Material", "e.g. Cotton canvas"),
      t("Type", "Type", "e.g. Acrylic"),
      t("Size", "Size", "e.g. 30x40cm"),
      t("Includes", "Includes", "e.g. 5 brushes"),
      t("Lightfast", "Lightfast", "e.g. ASTM D4236"),
      t("Bristle", "Bristle", "e.g. Hog"),
      t("Use", "Use", "e.g. Fine detail"),
      t("Primed", "Primed", "e.g. Triple Gesso, or Yes"),
      t("Colors", "Colours", "e.g. 12"),
      t("Count", "Pieces", "e.g. 5"),
      t("Pack", "Pack size", "e.g. 3"),
      t("Case", "Case", "e.g. Included"),
    ],
  },

  "Musical Instruments": {
    fields: [
      t("Material", "Material", "e.g. Spruce"),
      t("Top Wood", "Top wood", "e.g. Sitka spruce"),
      t("Strings", "Strings", "e.g. 6"),
      t("Keys", "Keys", "e.g. 88"),
      t("Frequency", "Frequency", "e.g. 20Hz-20kHz"),
      t("Cable", "Cable", "e.g. 1.5m braided"),
      t("Power", "Power", "e.g. Rechargeable"),
    ],
  },

  "Groceries & Gourmet": {
    fields: [
      t("Weight", "Weight", "e.g. 250g"),
      t("Volume", "Volume", "e.g. 500ml"),
      t("Origin", "Origin", "e.g. Ethiopia"),
      t("Roast", "Roast", "e.g. Medium"),
      t("Cacao", "Cacao", "e.g. 72%"),
      t("Type", "Type", "e.g. Whole bean"),
      t("Source", "Source", "e.g. Single origin"),
      t("Organic", "Organic", "e.g. Yes, or Certified Organic"),
    ],
  },

  Automotive: {
    fields: [
      t("Material", "Material", "e.g. ABS"),
      t("Power", "Power", "e.g. 36W"),
      t("Screen", "Screen", "e.g. 6.5 inch"),
      t("Resolution", "Resolution", "e.g. 1080p"),
      t("Storage", "Storage", "e.g. 128GB"),
      t("Lens", "Lens", "e.g. 140 degree"),
      t("Installation", "Installation", "e.g. Plug and play"),
      t("Compatibility", "Compatibility", "e.g. 2015-2022"),
    ],
  },

  "Pet Supplies": {
    fields: [
      t("Material", "Material", "e.g. Plush"),
      t("Size", "Size", "e.g. Medium"),
      t("Max Weight", "Max weight", "e.g. 25kg"),
      t("Capacity", "Capacity", "e.g. 3L"),
      t("Length", "Length", "e.g. 60cm"),
      t("Modes", "Modes", "e.g. 3"),
      t("Handle", "Handle", "e.g. Padded"),
      // Existing products store heights and ranges, not a yes/no.
      t("Levels", "Heights / levels", "e.g. 3 Heights"),
      t("Height", "Height", "e.g. 35cm"),
      t("Adjustable", "Adjustable", "e.g. Yes, or 3 positions"),
    ],
  },

  "Toys & Games": {
    fields: [
      n("Pieces", "Pieces", "e.g. 500"),
      t("Material", "Material", "e.g. ABS"),
      t("Age Range", "Age range", "e.g. 6+"),
      t("Players", "Players", "e.g. 2-4"),
      t("Play Time", "Play time", "e.g. 30 min"),
      t("Finished Size", "Finished size", "e.g. 20x20x15cm"),
      t("Language", "Language", "e.g. English"),
    ],
  },

  "Baby & Kids": {
    fields: [
      t("Age", "Age range", "e.g. 0-24 months"),
      t("Max Weight", "Max weight", "e.g. 15kg"),
      t("Material", "Material", "e.g. Organic cotton"),
      t("Positions", "Positions", "e.g. 5"),
      t("Melodies", "Melodies", "e.g. 8"),
      t("Count", "Pieces", "e.g. 3"),
      b("BPA Free"),
      b("Dishwasher Safe"),
    ],
  },
};

