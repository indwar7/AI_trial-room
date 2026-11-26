/**
 * The sample catalogue: garments a store can try on without photographing
 * anything. Each photo is a 768 x 1024 product shot on white in
 * public/catalogue, with a half-size copy in public/catalogue/thumb.
 */

import type { Gender } from "./garments";

export interface CatalogueItem {
  id: string;
  name: string;
  gender: Gender;
  /** A garment type id from garments.ts. */
  typeId: string;
  image: string;
  thumb: string;
}

export const CATALOGUE_GENDERS: readonly { id: Gender; label: string }[] = [
  { id: "male", label: "Men" },
  { id: "female", label: "Women" },
];

export const CATALOGUE_TYPES: readonly { id: string; label: string }[] = [
  { id: "shirt", label: "Shirts" },
  { id: "tshirt", label: "T-shirts" },
  { id: "jacket", label: "Jackets" },
  { id: "jeans", label: "Jeans" },
];

function item(id: string, name: string): CatalogueItem {
  const [who, typeId] = id.split("-");
  return {
    id,
    name,
    gender: who === "men" ? "male" : "female",
    typeId,
    image: `/catalogue/${id}.jpg`,
    thumb: `/catalogue/thumb/${id}.jpg`,
  };
}

export const CATALOGUE: readonly CatalogueItem[] = [
  item("men-shirt-1", "White formal shirt"),
  item("men-shirt-2", "Light-blue Oxford shirt"),
  item("men-shirt-3", "Navy checked shirt"),
  item("men-shirt-4", "Olive linen shirt"),
  item("men-shirt-5", "Black slim shirt"),
  item("men-tshirt-1", "White crew-neck T-shirt"),
  item("men-tshirt-2", "Black crew-neck T-shirt"),
  item("men-tshirt-3", "Navy polo T-shirt"),
  item("men-tshirt-4", "Grey melange T-shirt"),
  item("men-tshirt-5", "Navy striped T-shirt"),
  item("men-jacket-1", "Blue denim jacket"),
  item("men-jacket-2", "Black leather jacket"),
  item("men-jacket-3", "Olive bomber jacket"),
  item("men-jacket-4", "Tan suede jacket"),
  item("men-jacket-5", "Navy puffer jacket"),
  item("men-jeans-1", "Mid-blue straight jeans"),
  item("men-jeans-2", "Dark indigo slim jeans"),
  item("men-jeans-3", "Black slim jeans"),
  item("men-jeans-4", "Light-wash relaxed jeans"),
  item("men-jeans-5", "Grey tapered jeans"),
  item("women-shirt-1", "White cotton shirt"),
  item("women-shirt-2", "Blush satin shirt"),
  item("women-shirt-3", "Blue striped shirt"),
  item("women-shirt-4", "Sage linen shirt"),
  item("women-shirt-5", "Red checked shirt"),
  item("women-tshirt-1", "White fitted T-shirt"),
  item("women-tshirt-2", "Black V-neck T-shirt"),
  item("women-tshirt-3", "Pink T-shirt"),
  item("women-tshirt-4", "Breton striped T-shirt"),
  item("women-tshirt-5", "Lavender T-shirt"),
  item("women-jacket-1", "Light denim jacket"),
  item("women-jacket-2", "Black leather jacket"),
  item("women-jacket-3", "Beige utility jacket"),
  item("women-jacket-4", "Pink bomber jacket"),
  item("women-jacket-5", "Cream puffer jacket"),
  item("women-jeans-1", "High-waist light jeans"),
  item("women-jeans-2", "Dark blue skinny jeans"),
  item("women-jeans-3", "Black skinny jeans"),
  item("women-jeans-4", "Wide-leg blue jeans"),
  item("women-jeans-5", "Grey straight jeans"),
];

export function catalogueFor(gender: Gender, typeId: string): readonly CatalogueItem[] {
  return CATALOGUE.filter((entry) => entry.gender === gender && entry.typeId === typeId);
}
