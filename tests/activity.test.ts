import { describe, expect, it } from "vitest";
import { distanceMeters, paceMinutesPerKm, validateActivity } from "../lib/activity";
const valid = () => ({
  activity_type:"run", source:"manual", started_at:new Date(Date.now()-3600_000).toISOString(),
  duration_seconds:1800, distance_km:5, notes:"Comfortable run", points:[],
});
describe("activity validation",()=>{
  it("accepts a manual run",()=>expect(validateActivity(valid())?.distance_km).toBe(5));
  it("rejects invalid distances and durations",()=>{
    expect(validateActivity({...valid(),distance_km:-2})).toBeNull();
    expect(validateActivity({...valid(),duration_seconds:0})).toBeNull();
  });
  it("does not accept GPS points on manual entries",()=>{
    expect(validateActivity({...valid(),points:[{latitude:0,longitude:0,recorded_at:new Date().toISOString()}]})).toBeNull();
  });
  it("rejects out-of-range GPS coordinates",()=>{
    expect(validateActivity({...valid(),source:"gps",points:[{latitude:120,longitude:0,recorded_at:new Date().toISOString()}]})).toBeNull();
  });
  it("calculates geographic distance and pace",()=>{
    expect(distanceMeters({latitude:0,longitude:0},{latitude:0,longitude:0})).toBe(0);
    expect(distanceMeters({latitude:0,longitude:0},{latitude:0,longitude:1})).toBeGreaterThan(100000);
    expect(paceMinutesPerKm(1800,5)).toBe(6);
    expect(paceMinutesPerKm(100,0)).toBeNull();
  });
});
