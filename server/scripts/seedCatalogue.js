/**
 * Demo catalogue for Astra.
 *
 * Deliberately spread across more categories than the original four products so
 * the collection filters, category navigation and hero carousel all have
 * something real to show. Prices and stock are plausible but invented.
 */

const catalogue = [
  /* ------------------------------------------------------------- Electronics */
  {
    name: "Portable Bluetooth Speaker",
    category: "Electronics",
    price: 79.99,
    stock: 26,
    description:
      "A palm-sized speaker with surprisingly full sound, twelve hours of playback and a canvas strap that clips to a backpack. Water resistant, so it is happy on a kitchen counter or in the rain.",
    attributes: { Battery: "12 hours", "Water resistance": "IPX5", Weight: "540g" },
  },
  {
    name: "4K Streaming Stick",
    category: "Electronics",
    price: 54.5,
    stock: 40,
    description:
      "Plugs into any HDMI port and turns a plain television into a smart one. The remote is voice compatible, and setup takes about two minutes with no cables beyond the stick itself.",
    attributes: { Resolution: "4K HDR", Port: "HDMI", Warranty: "2 years" },
  },
  {
    name: "USB-C Braided Cable",
    category: "Electronics",
    price: 16.0,
    stock: 120,
    description:
      "A two-metre braided cable rated for 100W charging and 10Gbps transfer. It has survived a year of daily use on our desk without a single fault.",
    attributes: { Length: "2m", Rating: "100W / 10Gbps", Connector: "USB-C" },
  },
  {
    name: "Compact Mechanical Numpad",
    category: "Electronics",
    price: 64.0,
    stock: 18,
    isBestSeller: true,
    description:
      "A detachable numpad for people who type a lot but do not want a full-size board. Hot-swappable switches and a machined case that stays put on a desk.",
    attributes: { Layout: "Numpad", Switches: "Hot-swappable", Backlight: "White" },
  },

  /* ---------------------------------------------------------------- Fashion */
  {
    name: "Organic Cotton Overshirt",
    category: "Fashion",
    price: 89.0,
    stock: 24,
    description:
      "A mid-weight overshirt in heavy organic cotton, cut boxy enough to layer over a tee and structured enough to wear alone. It softens properly after a few washes.",
    attributes: { Material: "100% organic cotton", Fit: "Relaxed", Care: "Machine wash" },
  },
  {
    name: "Full-Grain Leather Belt",
    category: "Fashion",
    price: 58.0,
    stock: 32,
    description:
      "Cut from a single hide of full-grain leather with a solid brass buckle. No synthetic lining, so it will outlast the trousers it is bought to match.",
    attributes: { Material: "Full-grain leather", Buckle: "Solid brass", Sizes: "28-40" },
  },
  {
    name: "Merino Wool Beanie",
    category: "Fashion",
    price: 38.0,
    stock: 45,
    description:
      "Fine-gauge merino that does not itch and keeps working when damp. Light enough to keep in a bag through winter and forget about.",
    attributes: { Material: "Merino wool", Weight: "Light", Care: "Hand wash" },
  },
  {
    name: "Canvas Weekender Bag",
    category: "Fashion",
    price: 145.0,
    stock: 16,
    description:
      "A two-night bag in heavy waxed canvas with a full-grain leather base. Sized to fit under a seat, with a sleeve that slides over a suitcase handle.",
    attributes: { Material: "Waxed canvas", Capacity: "35L", Base: "Leather" },
  },

  /* -------------------------------------------------------- Home & Kitchen */
  {
    name: "Stoneware Dinner Plates",
    category: "Home & Kitchen",
    price: 68.0,
    stock: 22,
    description:
      "Four speckled stoneware plates that go from oven to table. Glazed in a matte finish that hides the marks ordinary ceramic collects.",
    attributes: { Pieces: "4", Material: "Stoneware", "Oven safe": "Yes" },
  },
  {
    name: "Pour-Over Coffee Kettle",
    category: "Home & Kitchen",
    price: 92.0,
    stock: 19,
    description:
      "A gooseneck kettle with a counterweighted handle that pours slowly and precisely. The spout is narrow enough to actually stir a bloom as the water goes in.",
    attributes: { Capacity: "1L", Material: "Stainless steel", Base: "Induction" },
  },
  {
    name: "Linen Tea Towels",
    category: "Home & Kitchen",
    price: 32.0,
    stock: 38,
    description:
      "Waffle-woven linen that dries faster than cotton and gets softer each wash. Generous enough to fold over an oven rail.",
    attributes: { Material: "Linen", Pieces: "2", Size: "50 x 70cm" },
  },
  {
    name: "Cold Brew Carafe",
    category: "Home & Kitchen",
    price: 45.0,
    stock: 27,
    description:
      "Borosilicate glass with a fine steel mesh basket, sized for a full day of coffee. Fits a standard fridge door shelf.",
    attributes: { Capacity: "1L", Material: "Borosilicate glass", Dishwasher: "Safe" },
  },
  {
    name: "Cast Iron Skillet",
    category: "Home & Kitchen",
    price: 78.0,
    stock: 14,
    description:
      "Pre-seasoned cast iron with a helper handle. It is heavy, and that is the point: it is the pan you hand down rather than replace.",
    attributes: { Diameter: "26cm", Weight: "2.9kg", Care: "Hand wash" },
  },

  /* ---------------------------------------------------------------- Outdoors */
  {
    name: "Insulated Water Bottle",
    category: "Outdoors",
    price: 42.0,
    stock: 48,
    description:
      "Double-walled steel that keeps a drink cold for a full day and tea hot for six hours. The powder coat survives being dropped on rock without chipping.",
    attributes: { Capacity: "750ml", Cold: "24 hours", Coating: "Powder coat" },
  },
  {
    name: "Packable Rain Shell",
    category: "Outdoors",
    price: 135.0,
    stock: 20,
    description:
      "A three-layer waterproof shell that folds into its own pocket at about the size of a paperback. Taped seams, pit zips, and a hood that fits over a helmet.",
    attributes: { Weight: "310g", Layers: "3-layer", Packs: "Into itself" },
  },
  {
    name: "Stainless Vacuum Flask",
    category: "Outdoors",
    price: 36.0,
    stock: 36,
    description:
      "A one-litre flask with a proper cork-lined lid, so nothing tastes of metal after a week in the pack. Wide enough for ice cubes.",
    attributes: { Capacity: "1L", Lid: "Cork-lined", Cold: "48 hours" },
  },
  {
    name: "Compact Camp Stove",
    category: "Outdoors",
    price: 74.0,
    stock: 11,
    description:
      "Folds flat to the size of a sandwich box and boils a litre in about three and a half minutes. The brass burner is easy to clean, which matters more than it sounds.",
    attributes: { Weight: "480g", "Boil time": "3.5 min", Ignition: "Piezo" },
  },

  /* -------------------------------------------------------------- Stationery */
  {
    name: "Hardcover Dot Grid Notebook",
    category: "Stationery",
    price: 28.0,
    stock: 60,
    description:
      "A 192-page notebook that lies flat and stays flat. Dot grid rather than lined, so the same page works for writing, sketching and planning.",
    attributes: { Pages: "192", Grid: "Dot", Paper: "100gsm" },
  },
  {
    name: "Machined Pen",
    category: "Stationery",
    price: 52.0,
    stock: 25,
    description:
      "Knurled aluminium barrel with a refillable converter, so it can be filled with whatever ink you prefer. Balanced to write with for hours.",
    attributes: { Body: "Aluminium", Ink: "Refillable", Weight: "32g" },
  },
  {
    name: "Oak Desk Organiser",
    category: "Stationery",
    price: 64.0,
    stock: 17,
    description:
      "Solid oak with a shallow tray and three slots, sized to hold a pen, a phone and whatever else accumulates on a desk by Friday.",
    attributes: { Material: "Solid oak", Finish: "Hardwax oiled" },
  },

  /* ----------------------------------------------------------------- Fitness */
  {
    name: "Cork Yoga Mat",
    category: "Fitness",
    price: 78.0,
    stock: 21,
    description:
      "A cork surface over natural rubber, which gets grippier as your hands get sweatier rather than slipping. Warm, quiet and noticeably kinder to bare knees.",
    attributes: { Thickness: "4.5mm", Material: "Cork / natural rubber" },
  },
  {
    name: "Adjustable Dumbbell Pair",
    category: "Fitness",
    price: 249.0,
    stock: 8,
    description:
      "Dial the weight from 2.5kg to 24kg per bell and replace four pairs of fixed dumbbells. The plates lock in place without rattling.",
    attributes: { Range: "2.5-24kg each", Handle: "Knurled steel" },
  },
  {
    name: "Resistance Band Set",
    category: "Fitness",
    price: 34.0,
    stock: 52,
    description:
      "Five fabric-sleeved bands with door anchors and handles. Fabric rather than latex, so they do not rot or smell in a warm car.",
    attributes: { Bands: "5", Material: "Latex, fabric sleeve" },
  },

  /* ---------------------------------------------------------------- Lighting */
  {
    name: "Portable Table Lamp",
    category: "Lighting",
    price: 96.0,
    stock: 15,
    description:
      "A dimmable lamp with a warm-to-cool range, good for a desk that has to work in the morning and wind down in the evening. Runs for about twelve hours.",
    attributes: { Brightness: "3-step dimmable", Battery: "12 hours", Base: "USB-C" },
  },
  {
    name: "Opal Glass Pendant",
    category: "Lighting",
    price: 185.0,
    stock: 9,
    description:
      "Hand-blown opal glass that softens the light enough to read by without a shade. Comes with a fabric cord and a ceiling rose.",
    attributes: { Material: "Opal glass", "Cord length": "2m", Fitting: "E27" },
  },
];

export const buildCatalogue = () => catalogue;

export default catalogue;
