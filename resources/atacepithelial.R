# R httpuv server (port 9027): on-demand snATAC accessibility plots for gut epithelial cells.
require(Seurat)
require(Signac)
require(ggplot2)
library(httpuv) # jtc
library(jsonlite) # jtc
epithelial<-readRDS("/home/ubuntu/website/data/atac/Epithelial/Epithelialnew.rds")
#Change path of fragment files
epithelial@assays[["ATAC"]]@fragments[[1]]@path<-"/home/ubuntu/website/data/atac/source-selected/M1_3834_midgut/fragments.tsv.gz"
epithelial@assays[["ATAC"]]@fragments[[2]]@path<-"/home/ubuntu/website/data/atac/source-selected/3824_hindgut/fragments.tsv.gz"
epithelial@assays[["ATAC"]]@fragments[[3]]@path<-"/home/ubuntu/website/data/atac/source-selected/3824_midgut/fragments.tsv.gz"
epithelial@assays[["ATAC"]]@fragments[[4]]@path<-"/home/ubuntu/website/data/atac/source-selected/3767_colon/fragments.tsv.gz"
epithelial@assays[["ATAC"]]@fragments[[5]]@path<-"/home/ubuntu/website/data/atac/source-selected/3767_midgut/fragments.tsv.gz"
epithelial@assays[["ATAC"]]@fragments[[6]]@path<-"/home/ubuntu/website/data/atac/source-selected/3767_foregut/fragments.tsv.gz"
epithelial@assays[["ATAC"]]@fragments[[7]]@path<-"/home/ubuntu/website/data/atac/source-selected/3834_hindgut/fragments.tsv.gz"
epithelial@assays[["ATAC"]]@fragments[[8]]@path<-"/home/ubuntu/website/data/atac/source-selected/F1_3834_foregut/fragments.tsv.gz"
epithelial@assays[["ATAC"]]@fragments[[9]]@path<-"/home/ubuntu/website/data/atac/source-selected/3824_colon/fragments.tsv.gz"

atacepithelial<-function(genes, upstream, downstream, pdf_path){
  # Use CoveragePlot's cols only. Combining with & scale_fill_manual() breaks Signac/patchwork
  # and often yields: non-numeric argument to binary operator (during render/ggsave).
  p1 <- CoveragePlot(
    object = epithelial,
    region = genes,
    cols = c(
      "Goblet cells" = "#00BFC4",
      "Enterocytes" = "#F8766D",
      "Stem cells + progenitors" = "#ABA300",
      "EECs" = "#C77CFF"
    ),
    extend.upstream = upstream,
    extend.downstream = downstream
  )
  ggsave(pdf_path, plot = p1, width = 10, height = 10)
}

# atacepithelial("EPCAM",1000,1000)



# ===============================================

hex_to_string <- function(hex_str) {
  hex_split <- strsplit(hex_str, "(?<=..)", perl = TRUE)[[1]]
  raw_vec <- as.raw(as.hexmode(hex_split))
  result_str <- rawToChar(raw_vec)
  return(result_str)
}

log_line <- function(msg) {
  cat(sprintf("[%s] %s\n", format(Sys.time(), "%Y-%m-%d %H:%M:%S"), msg))
  flush.console()
}


app <- list(
  call = function(req) {
    url <- req$PATH_INFO
    q <- if (!is.null(req$QUERY_STRING)) req$QUERY_STRING else ""
    log_line(sprintf("REQ path=%s query=%s", url, q))

    # New mode: direct PNG response for browser <img src>.
    if (grepl("^/genes/", url)) {
      loci <- URLdecode(sub("^/genes/", "", url))
      log_line(sprintf("DIRECT_IMAGE loci=%s", loci))
      if (nchar(loci) == 0) {
        body <- "Missing loci"
        log_line("BAD_REQUEST missing loci")
        return(list(
          status = 400L,
          headers = list('Content-Type' = 'text/plain; charset=utf-8', 'Content-Length' = as.character(nchar(body))),
          body = body
        ))
      }
      png_file <- tempfile(fileext = ".png")
      ok <- TRUE
      err_msg <- ""
      started_at <- Sys.time()
      log_line("PLOT_START atacepithelial")
      tryCatch({
        atacepithelial(loci, 1000, 1000, png_file)
      }, error = function(e) {
        ok <<- FALSE
        err_msg <<- conditionMessage(e)
      })
      if (!ok) {
        body <- paste("ERROR:", err_msg)
        log_line(sprintf("PLOT_ERROR %s", err_msg))
        return(list(
          status = 500L,
          headers = list('Content-Type' = 'text/plain; charset=utf-8', 'Content-Length' = as.character(nchar(body))),
          body = body
        ))
      }
      png_size <- file.info(png_file)$size
      png_data <- readBin(png_file, what = "raw", n = png_size)
      unlink(png_file)
      elapsed <- as.numeric(difftime(Sys.time(), started_at, units = "secs"))
      log_line(sprintf("PLOT_DONE atacepithelial elapsed=%.2fs bytes=%d", elapsed, length(png_data)))
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

    # Crawlers on public ports — not legacy hex API.
    if (grepl("^/(favicon\\.ico|robots\\.txt|sitemap\\.xml|security\\.txt)$", url, ignore.case = TRUE) ||
        grepl("^/\\.well-known/", url)) {
      body <- "Not found"
      log_line("SCANNER_PATH_404")
      return(list(
        status = 404L,
        headers = list('Content-Type' = 'text/plain; charset=utf-8', 'Content-Length' = as.character(nchar(body))),
        body = body
      ))
    }
    hex_tail <- substring(url, 2)
    if (!grepl("^[0-9a-fA-F]+$", hex_tail) || nchar(hex_tail) < 16) {
      body <- "Not found"
      log_line("NOT_LEGACY_HEX_404")
      return(list(
        status = 404L,
        headers = list('Content-Type' = 'text/plain; charset=utf-8', 'Content-Length' = as.character(nchar(body))),
        body = body
      ))
    }

    # Legacy mode: hex payload writes to provided file path.
    log_line("LEGACY_HEX_REQUEST")
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


server <- startServer("127.0.0.1", 9027, app)
cat("Server started on http://localhost:9027\n")


while(TRUE) {
  service()
  Sys.sleep(0.001)
}



