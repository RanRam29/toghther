const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const targetPath = path.join(__dirname, "../src/types/database.ts");

function generate(command, label) {
  console.log(`Generating types from ${label}...`);
  return execSync(command, {
    maxBuffer: 10 * 1024 * 1024,
    stdio: ["ignore", "pipe", "ignore"],
  });
}

function writeTypes(output) {
  const text = output
    .toString()
    .split(/\r?\n/)
    .filter((line) => !line.startsWith('{"_tag":"Error"'))
    .join("\n")
    .trim();
  if (!text || text.length < 100 || !text.includes("export type Database")) {
    throw new Error("Generated types output is empty or invalid — refusing to overwrite.");
  }
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, text + "\n");
  console.log("Successfully wrote types to:", targetPath);
}

try {
  let output;
  try {
    output = generate("npx supabase gen types typescript --linked", "Supabase Cloud");
    writeTypes(output);
  } catch (linkedError) {
    console.warn("Cloud types generation failed, falling back to local DB...");
    console.warn(String(linkedError.message ?? linkedError));
    output = generate("npx supabase gen types typescript --local", "local Supabase");
    writeTypes(output);
  }
} catch (e) {
  console.error("Error generating types:", e.message ?? e);
  process.exit(1);
}
