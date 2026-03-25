import { useState, type ReactNode } from 'react'
import NavBar from '../components/NavBar'
import Footer from '../components/Footer'

const HELP_STYLE_TAG = `
.help-shell { min-height: 100vh; display: flex; flex-direction: column; background: var(--bg); }
.help-inner { max-width: 1200px; margin: 0 auto; width: 100%; box-sizing: border-box; padding: 0 clamp(16px, 4vw, 56px); }
.help-hero { padding: clamp(24px, 4vw, 48px) 0 clamp(20px, 3vw, 36px); }
.help-page-eyebrow {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 0.75rem; font-weight: 600; letter-spacing: 0.8px; text-transform: uppercase;
  color: var(--accent); margin-bottom: 14px;
}
.help-eyebrow-line { width: 24px; height: 2px; background: var(--accent); border-radius: 2px; }
.help-page-h1 {
  font-family: 'Montserrat', sans-serif; font-size: clamp(1.75rem, 4vw, 2.5rem);
  font-weight: 700; color: var(--navy); margin: 0 0 12px; line-height: 1.2; letter-spacing: -0.02em;
}
.help-page-desc { font-size: 0.95rem; color: var(--muted); line-height: 1.65; max-width: 52ch; margin: 0; }
.help-video-block { padding: 32px 0 48px; }
.help-video-wrap {
  position: relative; width: 100%; border-radius: 12px; overflow: hidden;
  border: 1px solid var(--border); background: #0a0a0a; aspect-ratio: 16 / 9;
  box-shadow: 0 8px 32px rgba(15, 23, 42, 0.08);
}
.help-video-wrap iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
.help-accordion-block { padding: 0 0 72px; }
.help-accordion-list { display: flex; flex-direction: column; gap: 0; }
.help-acc-item { border-bottom: 1px solid var(--border); }
.help-acc-item:first-of-type { border-top: 1px solid var(--border); }
.help-acc-trigger {
  width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 16px;
  padding: 18px 4px 18px 0; background: none; border: none; cursor: pointer; text-align: left;
  font-family: 'Montserrat', sans-serif; font-size: 0.95rem; font-weight: 600; color: var(--navy);
  transition: color 0.15s;
}
.help-acc-trigger:hover { color: var(--accent); }
.help-acc-icon {
  flex-shrink: 0; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;
  border-radius: 6px; border: 1px solid var(--border); font-size: 1.1rem; font-weight: 600;
  color: var(--muted); background: var(--surface);
}
.help-acc-body {
  display: grid; grid-template-rows: 0fr; transition: grid-template-rows 0.25s ease;
}
.help-acc-body.open { grid-template-rows: 1fr; }
.help-acc-body-inner { overflow: hidden; min-height: 0; }
.help-acc-content p {
  font-size: 0.92rem; color: var(--text); line-height: 1.7; margin: 0 0 14px; padding-right: 8px;
}
.help-acc-content p:last-child { margin-bottom: 20px; }
`

type AccId = 'acc-1' | 'acc-2' | 'acc-3' | 'acc-4' | 'acc-5'

const SECTIONS: { id: AccId; title: string; children: ReactNode }[] = [
  {
    id: 'acc-1',
    title: '1. Introduction — Navigation Overview',
    children: (
      <>
        <p>
          The navigation bar is on the top, including the home page, scRNA page, snATAC page, Spatial Metabolomics
          page, Spatial Transcriptomics page, Help page, and About page. You can click the corresponding link to enter
          the page you want to visit.
        </p>
        <p>
          <strong>Home page:</strong> The main page of the website, which provides a brief introduction of the website
          and the database, and a chat box with our AI assistant.
        </p>
        <p>
          <strong>scRNA page:</strong> The page for you to visualize the expression of a single gene in epithelial cells
          or enteroendocrine cells, differential gene expression in different gut regions, and top marker gene expression
          in goblet cells.
        </p>
        <p>
          <strong>snATAC page:</strong> This page allows you to visualize the IGV plots of a single gene in all cell
          types or epithelial cells.
        </p>
        <p>
          <strong>Spatial Metabolomics page:</strong> This page displays differential detection of metabolite levels in
          fetal duodenum and colon tissues and allows users to visualize metabolite distribution.
        </p>
        <p>
          <strong>Spatial Transcriptomics page:</strong> This page displays differential distribution of genes in
          different regions of fetal duodenum and colon tissues (e.g. crypt versus villi).
        </p>
        <p>There are also the Help page and About page to show the tutorials and basic information of this website.</p>
      </>
    ),
  },
  {
    id: 'acc-2',
    title: '2. scRNA — Single-Cell RNA Sequencing',
    children: (
      <>
        <p>
          The page that enables you to visualize the expression of a single gene in epithelial cells or enteroendocrine
          cells. You can see the UMAP clustering of various cell types and the dot plot of characteristic marker genes of
          different cell types among epithelial cells or enteroendocrine cells. Additionally, a single gene can be
          entered in the query box to visualize the feature plot and violin plot of a single gene.
        </p>
        <p>
          <strong>Region comparison:</strong> This page shows the 3D volcano plot of the differential gene expression
          (DGE) analysis comparing the scRNA-seq data between the duodenum and colon tissues. Moreover, split violin
          plots are displayed to show the top duodenum and colon specific marker genes. You can also download the DEG
          list comparing duodenum and colon tissues in fetal and adult samples.
        </p>
        <p>
          <strong>Goblet cells:</strong> This page shows the MA plot of the top marker genes enriched in goblet cells
          compared to other epithelial cells. Split violin plots are displayed to show the top goblet cell marker genes.
          You can also download the DEG list comparing goblet cells to other epithelial cell types.
        </p>
      </>
    ),
  },
  {
    id: 'acc-3',
    title: '3. snATAC — Single-Nucleus ATAC Sequencing',
    children: (
      <p>
        This page allows you to visualize the accessibility of a single gene in all cell types or epithelial cells. You
        can see the UMAP clustering of various cell types and the dot plot of accessibility of gene loci close to
        characteristic marker genes of different cell types among all cell types or epithelial cells. Additionally, a
        single gene can be entered in the query box to visualize the IGV plot of a single gene.
      </p>
    ),
  },
  {
    id: 'acc-4',
    title: '4. Spatial Metabolomics — MALDI Imaging',
    children: (
      <p>
        This page shows the heatmap comparing the Log₂(Fold Change (Duodenum/Colon)) of normalized metabolite levels of
        metabolites detected via MALDI imaging. You can click on individual metabolites to visualize the metabolite
        distribution in the fetal duodenum and colon tissues as well as quantification of the normalized metabolite
        levels in the fetal duodenum and colon tissues.
      </p>
    ),
  },
  {
    id: 'acc-5',
    title: '5. Spatial Transcriptomics — Spatial Gene Expression',
    children: (
      <p>
        This page displays the UMAP clustering of epithelial cell types in 17 and 20 week old fetal duodenum and colon
        tissues as well as the dot plot of characteristic marker genes used to identify different epithelial cell types.
        A drop down menu is provided with 422 genes. Individual genes can be clicked to visualize the expression and
        distribution of these genes across duodenum and colon tissues.
      </p>
    ),
  },
]

export default function Help() {
  const [openId, setOpenId] = useState<AccId | null>(null)

  function toggle(id: AccId) {
    setOpenId((prev) => (prev === id ? null : id))
  }

  return (
    <div className="help-shell">
      <style>{HELP_STYLE_TAG}</style>
      <NavBar />
      <main>
        <div className="help-inner help-hero">
          <div className="help-page-eyebrow">
            <span className="help-eyebrow-line" />
            Documentation
          </div>
          <h1 className="help-page-h1">Tutorials</h1>
          <p className="help-page-desc">
            Learn how to use each section of GutOmicsAtlas with step-by-step guides and a video walkthrough.
          </p>
        </div>

        <div className="help-inner help-video-block">
          <div className="help-video-wrap">
            <iframe
              src="https://www.youtube-nocookie.com/embed/F1Tz5PHCGhs"
              allowFullScreen
              title="GutOmicsAtlas Tutorial Video"
            />
          </div>
        </div>

        <div className="help-inner help-accordion-block">
          <div className="help-accordion-list">
            {SECTIONS.map(({ id, title, children }) => {
              const open = openId === id
              return (
                <div key={id} id={id} className="help-acc-item">
                  <button type="button" className="help-acc-trigger" onClick={() => toggle(id)} aria-expanded={open}>
                    <span>{title}</span>
                    <span className="help-acc-icon" aria-hidden>
                      {open ? '−' : '+'}
                    </span>
                  </button>
                  <div className={`help-acc-body${open ? ' open' : ''}`}>
                    <div className="help-acc-body-inner">
                      <div className="help-acc-content">{children}</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
