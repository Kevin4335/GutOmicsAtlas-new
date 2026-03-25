import type { CSSProperties, ReactNode } from 'react'
import NavBar from '../components/NavBar'
import Footer from '../components/Footer'

const ABOUT_STYLE_TAG = `
.about-shell { min-height: 100vh; display: flex; flex-direction: column; background: var(--bg); }
.about-inner { max-width: 1200px; margin: 0 auto; width: 100%; box-sizing: border-box; padding: 0 clamp(16px, 4vw, 56px); }
.about-hero { padding: clamp(24px, 4vw, 48px) 0 clamp(28px, 4vw, 40px); }
.about-page-eyebrow {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 0.75rem; font-weight: 600; letter-spacing: 0.8px; text-transform: uppercase;
  color: var(--accent); margin-bottom: 14px;
}
.about-eyebrow-line { width: 24px; height: 2px; background: var(--accent); border-radius: 2px; }
.about-page-h1 {
  font-family: 'Montserrat', sans-serif; font-size: clamp(1.75rem, 4vw, 2.5rem);
  font-weight: 700; color: var(--navy); margin: 0 0 12px; line-height: 1.2; letter-spacing: -0.02em;
}
.about-page-desc { font-size: 0.95rem; color: var(--muted); line-height: 1.65; max-width: 62ch; margin: 0; }
.about-section { padding: 0 0 56px; }
.about-section-head { display: flex; align-items: center; margin-bottom: 28px; }
.about-section-rule { flex: 1; height: 1px; background: var(--border); max-width: 120px; }
.about-lab-grid {
  display: grid; grid-template-columns: 1fr; gap: 32px; align-items: start;
}
@media (min-width: 900px) {
  .about-lab-grid { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 48px; }
}
.about-lab-text h2 {
  font-family: 'Montserrat', sans-serif; font-size: 1.35rem; font-weight: 700; color: var(--navy);
  margin: 0 0 16px; line-height: 1.25;
}
.about-lab-text p { font-size: 0.92rem; color: var(--text); line-height: 1.7; margin: 0 0 14px; }
.about-lab-note {
  font-size: 0.9rem; color: var(--muted); font-style: italic; margin-top: 18px !important;
}
.about-lab-card {
  border: 1px solid var(--border); border-radius: 14px; background: var(--surface);
  overflow: hidden; align-self: start;
}
.about-lab-diagram-wrap {
  margin: 0; line-height: 0; background: var(--bg);
}
.about-lab-diagram {
  width: 100%; height: auto; display: block; vertical-align: top;
}
.about-team { padding: 0 0 72px; }
.about-team-list { display: flex; flex-direction: column; gap: 0; }
.about-member {
  display: grid; grid-template-columns: auto 1fr; gap: 20px; align-items: start;
  padding: 22px 0; border-bottom: 1px solid var(--border);
}
.about-member:first-of-type { border-top: 1px solid var(--border); }
.about-member-photo {
  width: 56px; height: 56px; border-radius: 12px; background: var(--surface);
  border: 1px solid var(--border); display: flex; align-items: center; justify-content: center;
  font-size: 1.75rem; line-height: 1; flex-shrink: 0;
}
.about-member-photo img { width: 100%; height: 100%; object-fit: cover; border-radius: 11px; }
.about-member-name { font-family: 'Montserrat', sans-serif; font-weight: 700; font-size: 1rem; color: var(--navy); margin-bottom: 4px; }
.about-member-title { font-size: 0.82rem; font-weight: 600; color: var(--accent); text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 8px; }
.about-member-email {
  display: inline-block; font-size: 0.88rem; color: var(--accent); text-decoration: none; font-weight: 500; margin-bottom: 10px;
}
.about-member-email:hover { text-decoration: underline; }
.about-member-affil {
  display: flex; align-items: flex-start; gap: 10px; margin: 0 0 10px; flex-wrap: wrap;
}
.about-member-affil img { width: 28px; height: 28px; border-radius: 6px; flex-shrink: 0; }
.about-member-affil-text { font-size: 0.85rem; color: var(--text); line-height: 1.5; }
.about-member-affil-text strong { color: var(--navy); font-weight: 600; }
.about-member-bio { font-size: 0.9rem; color: var(--muted); line-height: 1.65; margin: 0; }
`

type Member = {
  key: string
  photo: ReactNode
  name: string
  title: string
  email?: string
  affil?: ReactNode
  bio: ReactNode
}

const TEAM: Member[] = [
  {
    key: 'jeya',
    photo: '👩‍🔬',
    name: 'J. Jeya Vandana, B.Sc.',
    title: 'Graduate Student',
    email: 'jjv4001@med.cornell.edu',
    bio: 'Graduate student in the Chen Laboratory focusing on gut organoid models and transcriptomic characterization of intestinal development.',
  },
  {
    key: 'dongliang',
    photo: '👨‍🔬',
    name: 'Dongliang Leng, PhD.',
    title: 'Postdoctoral Researcher',
    email: 'dol4005@med.cornell.edu',
    bio: 'Postdoctoral researcher specializing in single-cell multi-omics approaches to study cell fate decisions in the human gut.',
  },
  {
    key: 'tiancheng',
    photo: '🧑‍💻',
    name: 'Tiancheng Jiao',
    title: 'Undergraduate Student',
    email: 'tcjiao@umich.edu',
    bio: 'Undergraduate student contributing to spatial transcriptomics data analysis and visualization for the GutOmicsAtlas platform.',
  },
  {
    key: 'ricky',
    photo: '👨‍💻',
    name: 'Ricky Han, B.S.',
    title: 'Graduate Student (Bioinformatics)',
    email: 'rickyhan@umich.edu',
    bio: 'Graduate student in bioinformatics developing computational pipelines for integrative multi-omics analysis of gut tissue data.',
  },
  {
    key: 'yuanhao',
    photo: '🧑‍🔬',
    name: 'Yuanhao Huang',
    title: 'Graduate Student',
    email: 'hyhao@umich.edu',
    bio: 'Graduate student investigating spatial metabolomics and lipid distribution patterns in fetal gut development.',
  },
  {
    key: 'kevin',
    photo: '🧑‍💻',
    name: 'Kevin Chang',
    title: 'Graduate Student',
    email: 'kvchang@umich.edu',
    bio: 'Graduate student contributing to web development and data visualization for the GutOmicsAtlas interactive platform.',
  },
  {
    key: 'zion',
    photo: '🧑‍💻',
    name: 'Zion Muhammud',
    title: 'Undergraduate Student',
    email: 'zionm@umich.edu',
    bio: 'Undergraduate student contributing to web development and data visualization for the GutOmicsAtlas interactive platform.',
  },
  {
    key: 'kai',
    photo: '🧑‍💻',
    name: 'Kai Liu',
    title: 'Designer and front-end developer',
    email: 'kailiua@umich.edu',
    bio: 'Responsible for interface design, front-end implementation, and database architecture for the GutOmicsAtlas platform.',
  },
  {
    key: 'hao',
    photo: '🎨',
    name: 'Hao Liu',
    title: 'Designer',
    email: 'haoliusi@umich.edu',
    bio: 'Responsible for interface and user experience design.',
  },
]

const shell: CSSProperties = { minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }

export default function About() {
  return (
    <div style={shell}>
      <style>{ABOUT_STYLE_TAG}</style>
      <NavBar />
      <main>
        <div className="about-inner about-hero">
          <div className="about-page-eyebrow">
            <span className="about-eyebrow-line" />
            Chen Laboratory · Weill Cornell Medicine
          </div>
          <h1 className="about-page-h1">About GutOmicsAtlas</h1>
          <p className="about-page-desc">
            GutOmicsAtlas is built and maintained by the Chen Laboratory at Weill Cornell Medicine, dedicated to
            advancing stem cell research and regenerative medicine.
          </p>
        </div>

        <div className="about-inner about-section">
          <div className="about-section-head">
            <div className="about-section-rule" />
          </div>
          <div className="about-lab-grid">
            <div className="about-lab-text">
              <h2>Welcome to Shuibing Chen Laboratory!</h2>
              <p>
                The major research interest in the Chen Laboratory is to apply human pluripotent stem cell (hPSC)-derived
                cells/organoids to model human diseases and perform drug screens toward development of novel
                therapeutics. We have identified many small molecules controlling stem cell fate decision using high
                throughput/content chemical screens.
              </p>
              <p>
                By combining gene targeting, directed differentiation, human organoids, and humanized mouse models, we have
                established several unique models to systematically explore the role of genetic and/or environmental
                factors in disease progression. We establish proof-of-principle that &quot;disease in a dish&quot; models
                that can be adapted to high throughput/content screening platforms and to discover drug candidates for
                precision therapy.
              </p>
              <p className="about-lab-note">
                If you have any questions about this website, please don&apos;t hesitate to contact anyone of the members
                below!
              </p>
            </div>
            <div className="about-lab-card">
              <figure className="about-lab-diagram-wrap">
                <img
                  className="about-lab-diagram"
                  src="/imgs/diagram.webp"
                  alt="Diagram of the hPSC research cycle in the Chen Laboratory, from disease models and screening through organoids and translational approaches."
                  loading="lazy"
                  decoding="async"
                />
              </figure>
            </div>
          </div>
        </div>

        <div className="about-inner about-team" id="contact">
          <div className="about-team-list">
            {TEAM.map((m) => (
              <div key={m.key} className="about-member">
                <div className="about-member-photo">{m.photo}</div>
                <div>
                  <div className="about-member-name">{m.name}</div>
                  <div className="about-member-title">{m.title}</div>
                  {m.email ? (
                    <a className="about-member-email" href={`mailto:${m.email}`}>
                      {m.email}
                    </a>
                  ) : null}
                  {m.affil ? (
                    <div className="about-member-affil">
                      <img src="/imgs/umich-logo.svg" alt="University of Michigan" width={28} height={28} />
                      {m.affil}
                    </div>
                  ) : null}
                  <p className="about-member-bio">{m.bio}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
