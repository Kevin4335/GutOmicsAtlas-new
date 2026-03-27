require(Seurat)
require(Signac)
require(ggplot2)
library(httpuv) # jtc
library(jsonlite) # jtc
cat("import finished", "\n")
category<-readRDS("/home/ubuntu/website/data/atac/All_cells/integratedgutcategory.rds")
#Change path of fragment files
cat("readRDS finished", "\n")
category@assays[["ATAC"]]@fragments[[1]]@path<-"/home/ubuntu/website/data/atac/All_cells/source-selected/M1_3834_midgut/fragments.tsv.gz"
category@assays[["ATAC"]]@fragments[[2]]@path<-"/home/ubuntu/website/data/atac/All_cells/source-selected/3824_hindgut/fragments.tsv.gz"
category@assays[["ATAC"]]@fragments[[3]]@path<-"/home/ubuntu/website/data/atac/All_cells/source-selected/3824_midgut/fragments.tsv.gz"
category@assays[["ATAC"]]@fragments[[4]]@path<-"/home/ubuntu/website/data/atac/All_cells/source-selected/3767_colon/fragments.tsv.gz"
category@assays[["ATAC"]]@fragments[[5]]@path<-"/home/ubuntu/website/data/atac/All_cells/source-selected/3767_midgut/fragments.tsv.gz"
category@assays[["ATAC"]]@fragments[[6]]@path<-"/home/ubuntu/website/data/atac/All_cells/source-selected/3767_foregut/fragments.tsv.gz"
category@assays[["ATAC"]]@fragments[[7]]@path<-"/home/ubuntu/website/data/atac/All_cells/source-selected/3834_hindgut/fragments.tsv.gz"
category@assays[["ATAC"]]@fragments[[8]]@path<-"/home/ubuntu/website/data/atac/All_cells/source-selected/F1_3834_foregut/fragments.tsv.gz"
category@assays[["ATAC"]]@fragments[[9]]@path<-"/home/ubuntu/website/data/atac/All_cells/source-selected/3824_colon/fragments.tsv.gz"
cat("loading fragment files finished", "\n")
ataccategory<-function(genes, upstream, downstream, pdf_path){
p1<-CoveragePlot(
    object = category,
    region = genes,
    extend.upstream = upstream,
    extend.downstream = downstream
  )
ggsave(pdf_path, plot = p1, width = 10, height = 10)
}

# ataccategory("EPCAM",1000,1000)




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

    # New mode: direct PNG response for browser <img src>.
    if (grepl("^/genes/", url)) {
      loci <- URLdecode(sub("^/genes/", "", url))
      if (nchar(loci) == 0) {
        body <- "Missing loci"
        return(list(
          status = 400L,
          headers = list('Content-Type' = 'text/plain; charset=utf-8', 'Content-Length' = as.character(nchar(body))),
          body = body
        ))
      }
      png_file <- tempfile(fileext = ".png")
      ok <- TRUE
      err_msg <- ""
      tryCatch({
        ataccategory(loci, 1000, 1000, png_file)
      }, error = function(e) {
        ok <<- FALSE
        err_msg <<- conditionMessage(e)
      })
      if (!ok) {
        body <- paste("ERROR:", err_msg)
        return(list(
          status = 500L,
          headers = list('Content-Type' = 'text/plain; charset=utf-8', 'Content-Length' = as.character(nchar(body))),
          body = body
        ))
      }
      png_size <- file.info(png_file)$size
      png_data <- readBin(png_file, what = "raw", n = png_size)
      unlink(png_file)
      return(list(
        status = 200L,
        headers = list(
          'Access-Control-Allow-Origin' = '*',
          'Content-Type' = 'image/png',
          'Content-Length' = as.character(length(png_data))
        ),
        body = png_data
      ))
    }

    # Legacy mode: hex payload writes to provided file path.
    json_data <- hex_to_string(substr(url, 2, nchar(url)))
    data <- fromJSON(json_data)
    f <- data$f
    if(f == 26){
      cat('ataccategory', "\n")
      ataccategory(data$p1, 1000, 1000, data$p2)
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


server <- startServer("0.0.0.0", 9026, app)
cat("Server started on http://localhost:9026\n")


while(TRUE) {
  service()
  Sys.sleep(0.001)
}

