"""Gene allowlists and name normalization for scRNA, snATAC, and spatial transcriptomics."""
from pathlib import Path
import json

_DATA_DIR = Path(__file__).resolve().parent / 'gene_data'

__all__ = [
    'format_gene',
    'rna_atac_genes',
    'rna_atac_genes_formatted_to_origin',
    'st_genes',
    'st_genes_formatted_to_origin',
    'spatial_meta',
]


def format_gene(name: str) -> str:
    if name == 'TRAV1-1':
        return 'TRAV1-1'
    name = name.upper()
    name = name.replace('.', '').replace('-', '').replace('/', '').replace(' ', '')
    return name


def _load_json_list(filename: str) -> list:
    with open(_DATA_DIR / filename, encoding='utf-8') as f:
        return json.load(f)


rna_atac_genes = _load_json_list('rna_atac_genes.json')
st_genes = _load_json_list('st_genes.json')
spatial_meta = _load_json_list('spatial_meta.json')

rna_atac_genes_formatted_to_origin = {format_gene(gene): gene for gene in rna_atac_genes}
st_genes_formatted_to_origin = {format_gene(gene): gene for gene in st_genes}

assert len(rna_atac_genes) == len(rna_atac_genes_formatted_to_origin)
assert len(st_genes) == len(st_genes_formatted_to_origin)
assert len(spatial_meta) == 295
