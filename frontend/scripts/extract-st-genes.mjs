/**
 * Regenerates `src/data/stGenes.ts` from the legacy `frontend-old/js/st.js` gene list.
 * Run from frontend root: npm run extract:st-genes
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const frontendRoot = path.join(__dirname, '..')
const repoRoot = path.join(frontendRoot, '..')

const stJsPath = path.join(repoRoot, 'frontend-old/js/st.js')
const stJs = fs.readFileSync(stJsPath, 'utf8')
const m = stJs.match(/const GLB_ALL_GENES = (\[[\s\S]*?\])\s/)
if (!m) throw new Error('GLB_ALL_GENES not found in frontend-old/js/st.js')

const out =
  '/** Spatial transcriptomics gene list (from repo `frontend-old/js/st.js`). Regenerate: `npm run extract:st-genes`. */\n' +
  `export const ST_ALL_GENES: string[] = ${m[1]}\n`

const outPath = path.join(frontendRoot, 'src/data/stGenes.ts')
fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, out)
console.log('Wrote', outPath)
