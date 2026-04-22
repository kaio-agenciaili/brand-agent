import { rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL("..", import.meta.url)));
const dirs = [join(root, ".next"), join(root, "node_modules", ".cache")];

for (const p of dirs) {
  if (existsSync(p)) {
    try {
      rmSync(p, { recursive: true, force: true });
      console.log("Removido:", p);
    } catch (e) {
      console.error("Falha ao remover", p, e);
    }
  }
}
console.log("Pronto. Executa: npm run dev  ou  npm run build");
