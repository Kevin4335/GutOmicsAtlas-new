/**
 * Regenerates `src/data/stGenes.ts` from `data/Xenium/Xenium figures/*.png` basenames.
 * Run from frontend root: npm run extract:st-genes
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const frontendRoot = path.join(__dirname, '..')
const figuresDir = path.join(frontendRoot, '..', '..', 'data', 'Xenium', 'Xenium figures')

const genes = fs
  .readdirSync(figuresDir)
  .filter((name) => name.endsWith('.png'))
  .map((name) => name.slice(0, -4))
  .sort()

const out =
  '/** Spatial transcriptomics gene list (from `data/Xenium/Xenium figures/*.png`). Regenerate: `npm run extract:st-genes`. */\n' +
  `export const ST_ALL_GENES: string[] = ${JSON.stringify(genes)}\n`

const outPath = path.join(frontendRoot, 'src/data/stGenes.ts')
fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, out)
console.log(`Wrote ${outPath} (${genes.length} genes)`)
