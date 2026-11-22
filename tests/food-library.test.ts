import { describe,expect,it } from "vitest";
import { validateFood,totalNutrition,portion,barcodeValid } from "../lib/food-library";

describe("Advanced nutrition validation",()=>{
  const food={name:"Rice",source:"food label",barcode:null,
    calories_100g:130,protein_100g:2.7,carbs_100g:28,fat_100g:0.3};
  it("accepts complete verified data and rejects missing macros",()=>{
    expect(validateFood(food)?.name).toBe("Rice");
    expect(validateFood({...food,protein_100g:null})).toBeNull();
    expect(validateFood({...food,calories_100g:-1})).toBeNull();
  });
  it("validates barcode digits",()=>{
    expect(barcodeValid("4800123456789")).toBe(true);
    expect(barcodeValid("abc")).toBe(false);
  });
  it("scales food to a measured portion",()=>{
    expect(portion({calories:130,protein:2.7,carbs:28,fat:0.3},150,100))
      .toEqual({calories:195,protein:4.1,carbs:42,fat:0.5});
  });
  it("calculates batch totals using the exact ingredient weights",()=>{
    const ingredients=[
      {name:"Rice",food_id:"1",grams:150,calories_100g:130,protein_100g:2.7,carbs_100g:28,fat_100g:0.3},
      {name:"Tofu",food_id:"2",grams:100,calories_100g:90,protein_100g:9,carbs_100g:2,fat_100g:5},
    ];
    const totals=totalNutrition(ingredients);
    expect(totals.grams).toBe(250);
    expect(totals.calories).toBe(285);
    expect(portion(totals,125,totals.grams).calories).toBe(142.5);
  });
});
