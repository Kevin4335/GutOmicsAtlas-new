/**
 * Regenerates `src/data/scrnaGenes.ts` from the legacy `frontend-old/js/glb_genes.js` list.
 * Run from frontend root: npm run extract:scrna-genes
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const frontendRoot = path.join(__dirname, '..')
const repoRoot = path.join(frontendRoot, '..')

const srcPath = path.join(repoRoot, 'frontend-old/js/glb_genes.js')
const src = fs.readFileSync(srcPath, 'utf8')
const m = src.match(/const GLB_GENES = (\[[\s\S]*\]);/)
if (!m) throw new Error('GLB_GENES not found in frontend-old/js/glb_genes.js')

const out =
  '/** scRNA gene list (from repo `frontend-old/js/glb_genes.js`). Regenerate: `npm run extract:scrna-genes`. */\n' +
  `export const SCRNA_GENES: string[] = ${m[1]}\n`

const outPath = path.join(frontendRoot, 'src/data/scrnaGenes.ts')
fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, out)
console.log('Wrote', outPath)
