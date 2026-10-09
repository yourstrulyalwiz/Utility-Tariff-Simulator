/** Compare persisted JSON values, not the insertion order used by client/server schemas. */
export function snapshotKey(value:unknown):string {
  return JSON.stringify(value,(_key,item)=>{
    if(item!==null&&typeof item==="object"&&!Array.isArray(item)){
      return Object.fromEntries(Object.entries(item).sort(([a],[b])=>a.localeCompare(b)));
    }
    return item;
  });
}
