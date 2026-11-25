#!/usr/bin/env bash
# Extract staging → revision_prepared (site-ready names) → install into live paths with backups.
set -euo pipefail

SRC="/home/ubuntu/website/data/incoming_revision_111526/WebsiteRevisions111526"
ROOT="/home/ubuntu/website/webserver"
PREP="$ROOT/revision_prepared"
DATA="/home/ubuntu/website/data"
BACKUP="$DATA/backups_pre_111526_$(date +%Y%m%d)"
IMGS="$ROOT/frontend/public/imgs"
ST_LIVE="$DATA/Xenium/Xenium figures"

die() { echo "ERROR: $*" >&2; exit 1; }
[[ -d "$SRC" ]] || die "missing extracted tree: $SRC"

echo "=== Preparing $PREP ==="
rm -rf "$PREP"
mkdir -p "$PREP"/{downloads,imgs,spatial_st,MANIFEST}

pdf_to_png() {
  local pdf="$1" out="$2"
  python3 - "$pdf" "$out" <<'PY'
import sys
import fitz
src, dst = sys.argv[1], sys.argv[2]
doc = fitz.open(src)
# First page, high-res for web figures
page = doc[0]
pix = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
pix.save(dst)
doc.close()
print(f"  pdf->png {dst}")
PY
}

echo "--- Overview PDFs → site PNG names ---"
# scRNA overview (site names used by Scrna.tsx)
pdf_to_png "$SRC/scRNA/Fetal/Epithelial/scRNAumap.pdf"      "$PREP/imgs/scRNAumapFetalEpithelial.png"
pdf_to_png "$SRC/scRNA/Fetal/Epithelial/scRNAdotplot.pdf"   "$PREP/imgs/scRNAdotplotFetalEpithelial.png"
pdf_to_png "$SRC/scRNA/Adult/Epithelial/scRNAumap.pdf"      "$PREP/imgs/scRNAumapAdultEpithelial.png"
pdf_to_png "$SRC/scRNA/Adult/Epithelial/scRNAdotplot.pdf"   "$PREP/imgs/scRNAdotplotAdultEpithelial.png"
pdf_to_png "$SRC/scRNA/Fetal/Enteroendocrine/scRNAumap.pdf"    "$PREP/imgs/scRNAumapFetalEEC.png"
pdf_to_png "$SRC/scRNA/Fetal/Enteroendocrine/scRNAdotplot.pdf" "$PREP/imgs/scRNAdotplotFetalEEC.png"
pdf_to_png "$SRC/scRNA/Adult/Enteroendocrine/scRNAumap.pdf"    "$PREP/imgs/scRNAumapAdultEEC.png"
pdf_to_png "$SRC/scRNA/Adult/Enteroendocrine/scRNAdotplot.pdf" "$PREP/imgs/scRNAdotplotAdultEEC.png"

echo "--- Goblet DEG CSVs ---"
cp -f "$SRC/scRNA/Fetal/Epithelial/Gobletcell/gobletcell.csv" \
  "$PREP/imgs/scrna_fetal_epithelial_gobletcell.csv"
cp -f "$SRC/scRNA/Adult/Epithelial/Gobletcells/gobletcell.csv" \
  "$PREP/imgs/scrna_adult_epithelial_gobletcell.csv"
# Also keep adult epithelial region DEG if provided
if [[ -f "$SRC/scRNA/Adult/Epithelial/scrnaadult.csv" ]]; then
  cp -f "$SRC/scRNA/Adult/Epithelial/scrnaadult.csv" "$PREP/imgs/scrna_adult_epithelial_regioncomp.csv"
fi

echo "--- Downloadable RDS + R scripts (stable URL tree) ---"
# Keep spaces out of URLs: Spatial_Modality, Gobletcells, Allcells
stage_dl() {
  local dest_rel="$1" src_file="$2"
  local dest="$PREP/downloads/$dest_rel"
  mkdir -p "$(dirname "$dest")"
  cp -f "$src_file" "$dest"
  echo "  dl $dest_rel"
}

# Fetal epithelial
stage_dl "scrna/fetal/epithelial/fetalsample.rds"            "$SRC/scRNA/Fetal/Epithelial/fetalsample.rds"
stage_dl "scrna/fetal/epithelial/Codesforumapdotplot.R"      "$SRC/scRNA/Fetal/Epithelial/Codesforumapdotplot.R"
stage_dl "scrna/fetal/epithelial/scRNAfunction.R"            "$SRC/scRNA/Fetal/Epithelial/scRNAfunction.R"
stage_dl "scrna/fetal/epithelial/RegionComparison/maplot.R"  "$SRC/scRNA/Fetal/Epithelial/RegionComparison/maplot.R"
stage_dl "scrna/fetal/epithelial/Gobletcells/gobletcell.csv" "$SRC/scRNA/Fetal/Epithelial/Gobletcell/gobletcell.csv"
stage_dl "scrna/fetal/epithelial/Gobletcells/Gobletcells.rds" "$SRC/scRNA/Fetal/Epithelial/Gobletcell/Gobletcells.rds"
stage_dl "scrna/fetal/epithelial/Gobletcells/maplotGobletcell.R" "$SRC/scRNA/Fetal/Epithelial/Gobletcell/maplotGobletcell.R"
stage_dl "scrna/fetal/epithelial/Gobletcells/Gobletcellviolinplot.R" "$SRC/scRNA/Fetal/Epithelial/Gobletcell/Gobletcellviolinplot.R"

# Fetal EEC (no Codesforumapdotplot.R in pack)
stage_dl "scrna/fetal/enteroendocrine/eecupdated.rds" "$SRC/scRNA/Fetal/Enteroendocrine/eecupdated.rds"
stage_dl "scrna/fetal/enteroendocrine/EECplot.R"      "$SRC/scRNA/Fetal/Enteroendocrine/EECplot.R"

# Adult epithelial
stage_dl "scrna/adult/epithelial/adultintestine.rds"           "$SRC/scRNA/Adult/Epithelial/adultintestine.rds"
stage_dl "scrna/adult/epithelial/Codesforumapdotplot.R"        "$SRC/scRNA/Adult/Epithelial/Codesforumapdotplot.R"
stage_dl "scrna/adult/epithelial/scRNAfunction.R"              "$SRC/scRNA/Adult/Epithelial/scRNAfunction.R"
stage_dl "scrna/adult/epithelial/RegionComparison/maplot.R"    "$SRC/scRNA/Adult/Epithelial/RegionComparison/maplot.R"
stage_dl "scrna/adult/epithelial/Gobletcells/gobletcell.csv"   "$SRC/scRNA/Adult/Epithelial/Gobletcells/gobletcell.csv"
stage_dl "scrna/adult/epithelial/Gobletcells/Gobletcells.rds"  "$SRC/scRNA/Adult/Epithelial/Gobletcells/Gobletcells.rds"
stage_dl "scrna/adult/epithelial/Gobletcells/maplotGobletcell.R" "$SRC/scRNA/Adult/Epithelial/Gobletcells/maplotGobletcell.R"
stage_dl "scrna/adult/epithelial/Gobletcells/Gobletcellviolinplot.R" "$SRC/scRNA/Adult/Epithelial/Gobletcells/Gobletcellviolinplot.R"

# Adult EEC
stage_dl "scrna/adult/enteroendocrine/adultEECs.rds"           "$SRC/scRNA/Adult/Enteroendocrine/adultEECs.rds"
stage_dl "scrna/adult/enteroendocrine/CodesforUMAPdotplot.R"   "$SRC/scRNA/Adult/Enteroendocrine/CodesforUMAPdotplot.R"
stage_dl "scrna/adult/enteroendocrine/EECplot.R"               "$SRC/scRNA/Adult/Enteroendocrine/EECplot.R"

# snATAC
stage_dl "snatac/allcells/allcellsatac.rds"          "$SRC/snATAC/Allcells/allcellsatac.rds"
stage_dl "snatac/allcells/Codesforumapdotplot.R"     "$SRC/snATAC/Allcells/Codesforumapdotplot.R"
stage_dl "snatac/allcells/atacallcells.R"            "$SRC/snATAC/Allcells/atacallcells.R"
stage_dl "snatac/epithelial/Epithelialnew.rds"       "$SRC/snATAC/Epithelial/Epithelialnew.rds"
stage_dl "snatac/epithelial/Codesforumapdotplot.R"   "$SRC/snATAC/Epithelial/Codesforumapdotplot.R"
stage_dl "snatac/epithelial/atacepithelial.R"        "$SRC/snATAC/Epithelial/atacepithelial.R"

# Spatial
stage_dl "spatial/newgutassignedmarker.rds"                "$SRC/Spatial Modality/newgutassignedmarker.rds"
stage_dl "spatial/Codeforumapdotplot.R"                    "$SRC/Spatial Modality/Codeforumapdotplot.R"
stage_dl "spatial/Spatial_plots_across_3_tissues.R"        "$SRC/Spatial Modality/Spatial plots across 3 tissues.R"

echo "--- Spatial gene panels → GENE.png ---"
python3 - "$SRC/Spatial Modality/spatial_gene_panels" "$PREP/spatial_st" <<'PY'
import re, sys
from pathlib import Path
src, dst = Path(sys.argv[1]), Path(sys.argv[2])
dst.mkdir(parents=True, exist_ok=True)
n = 0
for p in sorted(src.glob("*_duodenum_midgut_colon_spatial.png")):
    gene = p.name.split("_duodenum_midgut_colon_spatial.png")[0]
    if not gene or "/" in gene or ".." in gene:
        continue
    target = dst / f"{gene}.png"
    target.write_bytes(p.read_bytes())
    n += 1
print(f"  renamed {n} spatial PNGs → {dst}")
PY

echo "--- Write MANIFEST ---"
{
  echo "# Revision 111526 prepared assets"
  echo
  echo "Source: $SRC"
  echo "Prepared: $PREP"
  echo
  echo "## Live RDS mapping (install step)"
  echo "| Prepared / download | Live path |"
  echo "|---|---|"
  echo "| downloads/scrna/fetal/epithelial/fetalsample.rds | $DATA/REVISED_DATA/scRNA/Fetal/Epithelialcells/fetalsample.rds |"
  echo "| downloads/scrna/adult/epithelial/adultintestine.rds | $DATA/REVISED_DATA/scRNA/Adult/Epithelialcells/adultintestine.rds |"
  echo "| downloads/scrna/fetal/enteroendocrine/eecupdated.rds | $DATA/REVISED_DATA/scRNA/Fetal/EECs/eecupdated.rds |"
  echo "| downloads/scrna/adult/enteroendocrine/adultEECs.rds | $DATA/REVISED_DATA/scRNA/Adult/EECs/adultEECs.rds |"
  echo "| downloads/snatac/allcells/allcellsatac.rds | $DATA/atac/All_cells/allcellsatac.rds (replaces integratedgutcategory.rds in R) |"
  echo "| downloads/snatac/epithelial/Epithelialnew.rds | $DATA/atac/Epithelial/Epithelialnew.rds |"
  echo
  echo "## Notes"
  echo "- Fetal EEC Codesforumapdotplot.R was not in the pack."
  echo "- snATAC/Spatial overview PNGs were not in the pack (only R code + RDS)."
  echo "- Spatial panels renamed from GENE_duodenum_midgut_colon_spatial.png → GENE.png"
} > "$PREP/MANIFEST/README.md"

echo "=== PREPARE DONE ==="
du -sh "$PREP" "$PREP/imgs" "$PREP/spatial_st" "$PREP/downloads"
find "$PREP/imgs" -type f | wc -l
find "$PREP/spatial_st" -type f | wc -l
find "$PREP/downloads" -type f | wc -l
