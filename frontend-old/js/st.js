const GLB_ALL_GENES = ['AADAC', 'ABCC8', 'ACE2', 'ACSL5', 'ADAMTSL1', 'ADCY2', 'ADGRG7', 'ADH1C', 'ADIRF', 'ADRA2A', 'AFAP1L2', 'AFP', 'AGTR1', 'AIG1', 'AKR1C3', 'AKR7A3', 'ALDH1A1', 'ALDH1B1', 'ALDOB', 'AMBP', 'ANK2', 'ANO7', 'ANXA1', 'ANXA13', 'APOA1', 'APOA4', 'APOB', 'APOC3', 'APOE', 'AQP1', 'AQP8', 'AREG', 'ARHGAP24', 'ARID3A', 'ARX', 'ASCL2', 'ASIC5', 'ATOH1', 'ATP11A', 'ATRN', 'AVIL', 'AZGP1', 'B3GNT6', 'BANK1', 'BATF', 'BCAS1', 'BDH2', 'BEST2', 'BEST4', 'BEX5', 'BMX', 'BRCA2', 'C10orf99', 'C15orf48', 'C1QA', 'C1QB', 'C1QBP', 'C1QC', 'C2orf88', 'CA1', 'CA12', 'CA2', 'CA4', 'CA7', 'CACNA1A', 'CADPS', 'CALB2', 'CCK', 'CCL20', 'CCL25', 'CCL4', 'CCL5', 'CCR7', 'CCSER1', 'CD14', 'CD163', 'CD177', 'CD2', 'CD24', 'CD3D', 'CD3E', 'CD3G', 'CD40LG', 'CD5', 'CD6', 'CD68', 'CD7', 'CD79A', 'CD79B', 'CD83', 'CD8A', 'CD8B', 'CD9', 'CDC20', 'CDCA7', 'CDHR3', 'CDHR5', 'CDK15', 'CDK6', 'CDKN1C', 'CDKN2B', 'CEACAM1', 'CEACAM5', 'CEACAM6', 'CEACAM7', 'CEP126', 'CES1', 'CES2', 'CFTR', 'CHGA', 'CHGB', 'CHI3L2', 'CHP2', 'CHST9', 'CKAP4', 'CLCA1', 'CLCA4', 'CLEC9A', 'CLU', 'CMA1', 'CMBL', 'COL17A1', 'COL19A1', 'CPA3', 'CPE', 'CPS1', 'CPVL', 'CREB3L1', 'CRYBA2', 'CST7', 'CTLA4', 'CTSB', 'CTSE', 'CTSG', 'CTSH', 'CXCL3', 'CXCR4', 'CXCR5', 'CYBB', 'CYP2W1', 'DAB1', 'DEFA6', 'DEPP1', 'DERL3', 'DIAPH3', 'DMBT1', 'DNAJC12', 'DNASE1L3', 'DPYSL3', 'DUOX2', 'EBPL', 'EDN1', 'EGFR', 'EPCAM', 'EPHB3', 'ERGIC1', 'ERO1B', 'ETS1', 'ETS2', 'ETV1', 'FABP1', 'FABP2', 'FABP6', 'FCER2', 'FCN1', 'FCRL1', 'FCRLA', 'FER1L6', 'FERMT1', 'FEV', 'FFAR4', 'FHL2', 'FKBP11', 'FOXA3', 'FOXP3', 'FRYL', 'FRZB', 'FYB1', 'FZD7', 'GALNT5', 'GALNT8', 'GAS2L3', 'GAST', 'GATA2', 'GC', 'GCG', 'GHRH', 'GHRL', 'GIMAP7', 'GIP', 'GLIS3', 'GNA11', 'GNLY', 'GPR183', 'GPRC5C', 'GPRIN3', 'GUCA2A', 'GUCA2B', 'GZMA', 'GZMK', 'HDC', 'HEPACAM2', 'HES1', 'HES6', 'HHEX', 'HHLA2', 'HMGB2', 'HPCAL1', 'HPGDS', 'HRCT1', 'HTR3E', 'ICOS', 'ID2', 'IER5', 'IFI27', 'IFITM1', 'IGFBP7', 'IGHA1', 'IL17RB', 'IL1B', 'IL1RAPL1', 'IL1RL1', 'IL20RA', 'IL22', 'IL32', 'IL4I1', 'IL7R', 'IMPDH2', 'INSL5', 'INSM1', 'IRF8', 'ISL1', 'ITK', 'ITLN1', 'JCHAIN', 'KCNMA1', 'KHK', 'KIF20B', 'KIF5C', 'KIT', 'KLK1', 'KLRB1', 'KLRC2', 'KLRD1', 'KRT1', 'KRT20', 'KRT86', 'KRTCAP3', 'L1TD1', 'LCN2', 'LEF1', 'LEFTY1', 'LEPROTL1', 'LGALS2', 'LGR5', 'LILRA4', 'LMX1A', 'LRMP', 'LSAMP', 'LTB', 'LYVE1', 'MAF', 'MAOB', 'MB', 'MCEMP1', 'MECOM', 'MEIS2', 'MKI67', 'MLN', 'MLPH', 'MS4A1', 'MS4A12', 'MS4A2', 'MS4A7', 'MS4A8', 'MSLN', 'MT1A', 'MUC12', 'MUC2', 'MYH14', 'NEUROD1', 'NKG7', 'NKX2-2', 'NOSIP', 'NOVA1', 'NPAS3', 'NR3C2', 'NTS', 'NUSAP1', 'NXPE4', 'ODF2L', 'OLFM4', 'ONECUT3', 'OTOP2', 'PAM', 'PAX4', 'PAX5', 'PBK', 'PCLAF', 'PCSK1N', 'PDE4C', 'PDZK1IP1', 'PI3', 'PLCE1', 'PLPP2', 'PLXND1', 'PPARG', 'PPP1R1B', 'PRDX4', 'PREP', 'PROX1', 'PRPH', 'PSTPIP2', 'PTGER4', 'PTTG1', 'PYY', 'RAB26', 'RAB3B', 'RAP1GAP', 'RAP1GAP2', 'RAPGEF4', 'RARRES2', 'RBP2', 'RBP4', 'REG4', 'REP15', 'RETNLB', 'RFX6', 'RGMB', 'RGS13', 'RHOC', 'RHOV', 'RIIAD1', 'RIMBP2', 'RIMS2', 'RNASE1', 'RNF43', 'ROBO1', 'ROBO2', 'RORA', 'RORC', 'RPLP2', 'RPS4Y1', 'RRM2', 'RUNX1T1', 'S100A12', 'S100P', 'SATB2', 'SCG2', 'SCG3', 'SCG5', 'SCGN', 'SCNN1A', 'SDCBP2', 'SEC11C', 'SELENBP1', 'SELENOK', 'SELENOM', 'SELL', 'SERPINA1', 'SFXN1', 'SH2D6', 'SH2D7', 'SIT1', 'SLC12A2', 'SLC18A2', 'SLC26A2', 'SLC26A3', 'SLC29A4', 'SLC6A8', 'SLPI', 'SMIM14', 'SMIM6', 'SMOC2', 'SOCS3', 'SOX9', 'SPDEF', 'SPIB', 'SPOCK2', 'SST', 'STMN1', 'STXBP5L', 'STXBP6', 'SULT1B1', 'SVOPL', 'TBC1D4', 'TCEA3', 'TCL1A', 'TFF1', 'THBS1', 'THSD7A', 'TIGIT', 'TIMP3', 'TK1', 'TKT', 'TMEM61', 'TMIGD1', 'TNFAIP3', 'TNFRSF17', 'TNFRSF25', 'TNFSF13B', 'TOP2A', 'TPH1', 'TPX2', 'TRAC', 'TRAT1', 'TRBC1', 'TRBC2', 'TRDV1', 'TRGV4', 'TRPM5', 'TTR', 'TUBB', 'TYMS', 'UBE2C', 'UCN3', 'UGT2A3', 'UGT2B17', 'VCAN', 'VWA5B2', 'WFDC2', 'XCL2']
var GLB_CURRENT = '';

window.addEventListener('DOMContentLoaded', function () {
    var container = document.querySelector('#st-gene-select > div');
    for (var i = 0; i < GLB_ALL_GENES.length; i++) {
        var gene = GLB_ALL_GENES[i];
        var button = document.createElement('a');
        button.innerHTML = gene;
        button.addEventListener('click', function(gene_name) {
            return function() {
                if (GLB_CURRENT === gene_name) {
                    return;
                }
                document.getElementById('selected-right').style.display = 'none';
                GLB_CURRENT = gene_name;
                document.getElementById('static-img').style.display = 'none';
                document.getElementById('static-img-2').style.display = 'none';
                document.getElementById('selected').src = '';
                document.getElementById('selected').src = GLB_DATA_SERVER_URL + '/st/' + gene_name + '.png';
                document.getElementById('selected').style.display = 'block';
                // document.getElementById('selected-right').style.display = 'flex';
                document.getElementById('back-main').style.display = 'block';
                document.getElementById('selected').addEventListener('load', function() {
                    document.getElementById('selected-right').style.display = 'flex';
                });
            }
        } (gene));
        container.appendChild(button);
    }

    document.getElementById('back-main').addEventListener('click', function() {
        GLB_CURRENT = '';
        document.getElementById('static-img').style.display = 'flex';
        document.getElementById('static-img-2').style.display = 'flex';
        document.getElementById('selected').src = '';
        document.getElementById('selected').style.display = 'none';
        document.getElementById('selected-right').style.display = 'none';
        document.getElementById('back-main').style.display = 'none';
    });
});