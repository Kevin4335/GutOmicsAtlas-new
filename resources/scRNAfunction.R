require(patchwork)
require(Seurat)
require(ggplot2)
library(httpuv) # jtc
library(jsonlite) # jtc
merged.gut<-readRDS("./integrated_iter_2_seurat.rds")
scRNA<-function(genes, pdf_path){
  p1<-FeaturePlot(merged.gut, features=genes, reduction="umap.integrated", raster=TRUE)
  p2<-VlnPlot(merged.gut, features=genes)
  combined_plot<-p1+p2+plot_layout(ncol=2)
  ggsave(pdf_path, plot = combined_plot, width = 15, height = 7)
}

# scRNA("CHGA")



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
    if(f == 25){
      cat('scRNA', "\n")
      scRNA(data$p1, data$p2)
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


server <- startServer("0.0.0.0", 9025, app)
cat("Server started on http://localhost:9025\n")


while(TRUE) {
  service()
  Sys.sleep(0.001)
}

