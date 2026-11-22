export type Gender = "male" | "female";

/** The three garment areas the try-on model understands. */
export type Category = "upper_body" | "lower_body" | "dresses";

export interface GarmentType {
  id: string;
  label: string;
  category: Category;
  /** How the garment is named to the model, after "men's" / "women's". */
  noun: string;
  genders: readonly Gender[];
}

const EVERYONE: readonly Gender[] = ["male", "female"];
const WOMEN: readonly Gender[] = ["female"];

export const GENDERS: readonly { id: Gender; label: string }[] = [
  { id: "male", label: "Male" },
  { id: "female", label: "Female" },
];

export const GARMENT_TYPES: readonly GarmentType[] = [
  { id: "shirt", label: "Shirt", category: "upper_body", noun: "shirt", genders: EVERYONE },
  { id: "tshirt", label: "T-shirt", category: "upper_body", noun: "t-shirt", genders: EVERYONE },
  { id: "coat", label: "Coat", category: "upper_body", noun: "coat", genders: EVERYONE },
  { id: "jacket", label: "Jacket", category: "upper_body", noun: "jacket", genders: EVERYONE },
  { id: "blazer", label: "Blazer", category: "upper_body", noun: "blazer", genders: EVERYONE },
  { id: "hoodie", label: "Hoodie", category: "upper_body", noun: "hoodie", genders: EVERYONE },
  { id: "sweater", label: "Sweater", category: "upper_body", noun: "sweater", genders: EVERYONE },
  { id: "kurta", label: "Kurta", category: "upper_body", noun: "kurta", genders: EVERYONE },
  { id: "top", label: "Top", category: "upper_body", noun: "top", genders: WOMEN },
  { id: "trousers", label: "Trousers", category: "lower_body", noun: "trousers", genders: EVERYONE },
  { id: "jeans", label: "Jeans", category: "lower_body", noun: "jeans", genders: EVERYONE },
  { id: "shorts", label: "Shorts", category: "lower_body", noun: "shorts", genders: EVERYONE },
  { id: "skirt", label: "Skirt", category: "lower_body", noun: "skirt", genders: WOMEN },
  { id: "dress", label: "Dress", category: "dresses", noun: "dress", genders: WOMEN },
];

export function isGender(value: unknown): value is Gender {
  return value === "male" || value === "female";
}

export function typesFor(gender: Gender | null): readonly GarmentType[] {
  if (!gender) return GARMENT_TYPES;
  return GARMENT_TYPES.filter((t) => t.genders.includes(gender));
}

export function findType(id: unknown): GarmentType | undefined {
  return GARMENT_TYPES.find((t) => t.id === id);
}

/** e.g. "men's shirt", "women's dress" */
export function describeGarment(gender: Gender, type: GarmentType): string {
  return `${gender === "male" ? "men's" : "women's"} ${type.noun}`;
}
