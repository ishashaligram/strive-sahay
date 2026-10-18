// Existing programme regions; server-configured regions are merged at runtime.
export const DEFAULT_REGIONS=['Pune','Mumbai','Thane','Nashik','Ahmednagar','Solapur','Satara','Kolhapur','Sangli'];
export function regionOptions(configured:string[],current:string){return [...new Set([...configured,current].map(value=>value.trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b));}
