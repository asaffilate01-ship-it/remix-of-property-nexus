/**
 * Offline integrity gate for checked-in npm package-lock metadata.
 * npm ci remains the authoritative full dependency graph verification.
 */
import {readFileSync} from "node:fs";
import {resolve} from "node:path";

function load(path:string){
 const source=readFileSync(resolve(process.cwd(),path),"utf8");
 if(/^(<{7}|={7}|>{7})/m.test(source))throw new Error(path+" contains unresolved conflict markers");
 return JSON.parse(source) as Record<string,any>;
}
const manifest=load("package.json");
const lock=load("package-lock.json");
if(lock.lockfileVersion!==3||typeof lock.packages!=="object"||!lock.packages||typeof lock.packages[""]!=="object"){
 throw new Error("npm v3 package-lock metadata required");
}
const root=lock.packages[""];
if(root.name!==manifest.name)throw new Error("package name differs from lockfile root");
for(const key of ["dependencies","devDependencies","optionalDependencies"] as const){
 const expected=manifest[key]??{},actual=root[key]??{};
 const keys=new Set([...Object.keys(expected),...Object.keys(actual)]);
 for(const dep of keys){
  if(expected[dep]!==actual[dep])throw new Error("lockfile root mismatch: "+key+"/"+dep);
 }
}
for(const [path,entry] of Object.entries(lock.packages)){
 if(!entry||typeof entry!=="object")throw new Error("invalid package metadata "+path);
 if(path!==""&&("resolved" in (entry as object))){
  const url=String((entry as {resolved:unknown}).resolved);
  if(!url||/\s/.test(url)||url.startsWith("http://"))throw new Error("invalid package resolution "+path);
 }
}
if(Object.keys(lock.packages).length<100)throw new Error("lockfile contains too few installed package records");
process.stdout.write("Root npm lockfile manifest validated. Run npm ci to validate the complete transitive dependency graph.\n");
