install.packages("BiocManager", repos = "http://cran.rstudio.com/")

# Install Bioconductor dependencies that Signac needs
BiocManager::install(c("GenomeInfoDb", "GenomicRanges", "IRanges", "Rsamtools", "S4Vectors", "BiocGenerics"), ask = FALSE)

# Now install CRAN packages
install.packages(c("Seurat", "Signac", "patchwork", "ggplot2", "httpuv", "jsonlite"), repos = "http://cran.rstudio.com/")