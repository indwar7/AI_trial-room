/**
 * What a store chooses from: garment designs, and sample fabrics to make
 * them in.
 *
 * A design is a template, not a finished garment: a picture whose
 * transparency is the garment's outline and whose grey levels are its folds
 * and seams (public/designs, with half-size copies in public/designs/thumb).
 * Laid over a fabric, it turns the fabric into that garment.
 */

import type { Gender } from "./garments";

export interface Design {
  id: string;
  name: string;
  gender: Gender;
  /** A garment type id from garments.ts. */
  typeId: string;
  template: string;
  thumb: string;
}

export interface SampleFabric {
  id: string;
  name: string;
  image: string;
  /** How wide the swatch is on the garment, as a share of the garment photo's width. */
  scale: number;
}

export const CATALOGUE_GENDERS: readonly { id: Gender; label: string }[] = [
  { id: "male", label: "Men" },
  { id: "female", label: "Women" },
];

export const CATALOGUE_TYPES: readonly { id: string; label: string }[] = [
  { id: "shirt", label: "Shirts" },
  { id: "tshirt", label: "T-shirts" },
  { id: "jacket", label: "Jackets" },
  { id: "trousers", label: "Trousers" },
];

function design(id: string, name: string): Design {
  const [who, typeId] = id.split("-");
  return {
    id,
    name,
    gender: who === "men" ? "male" : "female",
    typeId,
    template: `/designs/${id}.webp`,
    thumb: `/designs/thumb/${id}.webp`,
  };
}

export const DESIGNS: readonly Design[] = [
  design("men-shirt-1", "Classic collar"),
  design("men-shirt-2", "Button-down, chest pocket"),
  design("men-shirt-3", "Mandarin collar"),
  design("men-shirt-4", "Half sleeve"),
  design("men-shirt-5", "Camp collar"),
  design("men-tshirt-1", "Crew neck"),
  design("men-tshirt-2", "V-neck"),
  design("men-tshirt-3", "Polo"),
  design("men-tshirt-4", "Henley"),
  design("men-tshirt-5", "Full sleeve"),
  design("men-jacket-1", "Two-button blazer"),
  design("men-jacket-2", "Bomber"),
  design("men-jacket-3", "Nehru jacket"),
  design("men-jacket-4", "Trucker"),
  design("men-jacket-5", "Zip jacket"),
  design("men-trousers-1", "Straight"),
  design("men-trousers-2", "Slim tapered"),
  design("men-trousers-3", "Pleated formal"),
  design("men-trousers-4", "Relaxed"),
  design("men-trousers-5", "Five-pocket"),
  design("women-shirt-1", "Classic collar"),
  design("women-shirt-2", "Band collar"),
  design("women-shirt-3", "Oversized"),
  design("women-shirt-4", "Short sleeve"),
  design("women-shirt-5", "Sleeveless"),
  design("women-tshirt-1", "Crew neck"),
  design("women-tshirt-2", "V-neck"),
  design("women-tshirt-3", "Polo"),
  design("women-tshirt-4", "Boat neck"),
  design("women-tshirt-5", "Full sleeve"),
  design("women-jacket-1", "Blazer"),
  design("women-jacket-2", "Cropped jacket"),
  design("women-jacket-3", "Bomber"),
  design("women-jacket-4", "Trucker"),
  design("women-jacket-5", "Long blazer"),
  design("women-trousers-1", "Straight"),
  design("women-trousers-2", "Slim"),
  design("women-trousers-3", "Wide leg"),
  design("women-trousers-4", "Tapered"),
  design("women-trousers-5", "Flared"),
];

export function designsFor(gender: Gender, typeId: string): readonly Design[] {
  return DESIGNS.filter((entry) => entry.gender === gender && entry.typeId === typeId);
}

/** A swatch photographed close up covers about this much of the garment. */
export const DEFAULT_FABRIC_SCALE = 0.3;

function sample(id: string, name: string, scale = DEFAULT_FABRIC_SCALE): SampleFabric {
  return { id, name, image: `/fabrics/${id}.jpg`, scale };
}

export const SAMPLE_FABRICS: readonly SampleFabric[] = [
  sample("white-poplin", "White poplin"),
  sample("sky-oxford", "Sky Oxford"),
  sample("blue-stripe", "Blue stripe", 0.32),
  sample("navy-gingham", "Navy gingham", 0.22),
  sample("red-tartan", "Red tartan", 0.34),
  sample("olive-linen", "Olive linen"),
  sample("khaki-twill", "Khaki twill"),
  sample("indigo-denim", "Indigo denim"),
  sample("charcoal-flannel", "Charcoal flannel"),
  sample("navy-pinstripe", "Navy pinstripe"),
  sample("grey-check", "Grey check"),
  sample("black-twill", "Black twill"),
];
