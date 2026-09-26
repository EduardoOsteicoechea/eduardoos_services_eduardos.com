import fs from "node:fs";

const p = "frontend/src/styles/homescool-workspace.css";
let s = fs.readFileSync(p, "utf8");
// Corrupted sequence from PowerShell: CR + backtick + n
s = s.replace(/\r`n/g, "\n");
s = s.replace(/\r\n/g, "\n");
// Ensure every 0.6cm font-size has matching line-height on next line if missing
s = s.replace(
  /font-size: 0\.6cm;\n(?!  line-height: 0\.6cm;)/g,
  "font-size: 0.6cm;\n  line-height: 0.6cm;\n",
);
fs.writeFileSync(p, s);
const i = s.indexOf("homescool-letter__kicker");
console.log(JSON.stringify(s.slice(i, i + 110)));
