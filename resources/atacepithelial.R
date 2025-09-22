require(Seurat)
require(Signac)
require(ggplot2)
library(httpuv) # jtc
library(jsonlite) # jtc
epithelial<-readRDS("./Epithelialnew.rds")
#Change path of fragment files
epithelial@assays[["ATAC"]]@fragments[[1]]@path<-"../source-selected/M1_3834_midgut/fragments.tsv.gz"
epithelial@assays[["ATAC"]]@fragments[[2]]@path<-"../source-selected/3824_hindgut/fragments.tsv.gz"
epithelial@assays[["ATAC"]]@fragments[[3]]@path<-"../source-selected/3824_midgut/fragments.tsv.gz"
epithelial@assays[["ATAC"]]@fragments[[4]]@path<-"../source-selected/3767_colon/fragments.tsv.gz"
epithelial@assays[["ATAC"]]@fragments[[5]]@path<-"../source-selected/3767_midgut/fragments.tsv.gz"
epithelial@assays[["ATAC"]]@fragments[[6]]@path<-"../source-selected/3767_foregut/fragments.tsv.gz"
epithelial@assays[["ATAC"]]@fragments[[7]]@path<-"../source-selected/3834_hindgut/fragments.tsv.gz"
epithelial@assays[["ATAC"]]@fragments[[8]]@path<-"../source-selected/F1_3834_foregut/fragments.tsv.gz"
epithelial@assays[["ATAC"]]@fragments[[9]]@path<-"../source-selected/3824_colon/fragments.tsv.gz"
cluster_colors <- c("#00BFC4", "#F8766D", "#ABA300","#C77CFF")  # Match the number of clusters
atacepithelial<-function(genes, upstream, downstream, pdf_path){
p1<-CoveragePlot(
    object = epithelial,
    region = genes,
    cols = c("Goblet cells" = "#00BFC4", "Enterocytes" = "#F8766D", "Stem cells + progenitors"="#ABA300","EECs"="#C77CFF"),
    extend.upstream = upstream,
    extend.downstream = downstream
  )
p2<-p1 & scale_fill_manual(values = cluster_colors)
ggsave(pdf_path, plot = p2, width = 10, height = 10)
}

# atacepithelial("EPCAM",1000,1000)



# ===============================================

hex_to_string <- function(hex_str) {
  hex_split <- strsplit(hex_str, "(?<=..)", perl = TRUE)[[1]]
  raw_vec <- as.raw(as.hexmode(hex_split))
  result_str <- rawToChar(raw_vec)
  return(result_str)
}


app <- list(
  call = function(req) {
    url <- req$PATH_INFO
    json_data <- hex_to_string(substr(url, 2, nchar(url)))
    data <- fromJSON(json_data)

    f <- data$f
    if(f == 27){
      cat('atacepithelial', "\n")
      atacepithelial(data$p1, 1000, 1000, data$p2)
    }
    response_body <- paste0("finished")
    return(list(
      status = 200L,
      headers = list(
        'Content-Length' = '8'
      ),
      body = response_body
    ))
  }
)


server <- startServer("0.0.0.0", 9027, app)
cat("Server started on http://localhost:9027\n")


while(TRUE) {
  service()
  Sys.sleep(0.001)
}



