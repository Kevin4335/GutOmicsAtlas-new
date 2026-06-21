# R httpuv server (port 9025): on-demand scRNA gene plots for gut epithelial cells (fetal and adult).
require(patchwork)
require(Seurat)
require(ggplot2)
library(httpuv)
library(jsonlite)

# ================== Load datasets ==================
# Use absolute path inside the container (mounted from host /home/ubuntu/website/data).
# fetal.epi <- readRDS("/root/data/REVISED_DATA/scRNA/Fetal/Epithelialcells/fetalsample.rds")
# adult.epi <- readRDS("/root/data/REVISED_DATA/scRNA/Adult/Epithelialcells/adultintestine.rds")

fetal.epi <- readRDS("/home/ubuntu/website/data/REVISED_DATA/scRNA/Fetal/Epithelialcells/fetalsample.rds")
adult.epi <- readRDS("/home/ubuntu/website/data/REVISED_DATA/scRNA/Adult/Epithelialcells/adultintestine.rds")

new.cluster.ids <- c("Stem cells","TA cells","Enterocytes","Goblet cells", "EECs","Paneth cells")
names(new.cluster.ids) <- levels(fetal.epi)
fetal.epi <- RenameIdents(fetal.epi, new.cluster.ids)

# ================== Plotting function ==================
scRNA <- function(obj, genes, pdf_path) {
  p1 <- FeaturePlot(obj, features = genes, reduction = "umap.integrated", raster = TRUE)
  p3 <- p1 + labs(title = "", x = "UMAP_1", y = "UMAP_2") +
    theme(
      axis.text = element_text(size = 32),
      axis.title = element_text(size = 38),
      legend.text = element_text(size = 24),
      legend.title = element_text(size = 32)
    )

  p2 <- VlnPlot(obj, features = genes)
  p4 <- p2 + labs(title = "") + theme(
    axis.text = element_text(size = 32),
    axis.title = element_text(size = 38),
    legend.text = element_text(size = 32),
    legend.title = element_text(size = 32)
  )

  combined_plot <- p3 + p4 + plot_layout(ncol = 2)
  ggsave(pdf_path, plot = combined_plot, width = 30, height = 15)
}

# ================== Helper ==================
hex_to_string <- function(hex_str) {
  hex_split <- strsplit(hex_str, "(?<=..)", perl = TRUE)[[1]]
  raw_vec <- as.raw(as.hexmode(hex_split))
  result_str <- rawToChar(raw_vec)
  return(result_str)
}

query_param <- function(req, key) {
  q <- ""
  if (!is.null(req$QUERY_STRING) && nchar(req$QUERY_STRING) > 0) q <- req$QUERY_STRING
  if ((is.null(q) || nchar(q) == 0) && !is.null(req$REQUEST_URI)) {
    uri <- req$REQUEST_URI
    qpos <- regexpr("\\?", uri)
    if (qpos[1] > 0) q <- substring(uri, qpos[1] + 1)
  }
  if ((is.null(q) || nchar(q) == 0) && grepl("\\?", req$PATH_INFO, fixed = TRUE)) {
    q <- sub("^[^?]*\\?", "", req$PATH_INFO)
  }
  if (is.null(q) || nchar(q) == 0) return("")
  # httpuv sometimes sets QUERY_STRING to "?a=b" — first key would be "?a" without this.
  q <- sub("^\\?", "", q)
  if (nchar(q) == 0) return("")
  for (pair in strsplit(q, "&", fixed = TRUE)[[1]]) {
    kv <- strsplit(pair, "=", fixed = TRUE)[[1]]
    if (length(kv) >= 2 && kv[1] == key) return(URLdecode(kv[2]))
  }
  ""
}

log_line <- function(msg) {
  cat(sprintf("[%s] %s\n", format(Sys.time(), "%Y-%m-%d %H:%M:%S"), msg))
  flush.console()
}

# ================== HTTP Server ==================
app <- list(
  call = function(req) {
    url <- req$PATH_INFO
    q <- if (!is.null(req$QUERY_STRING)) req$QUERY_STRING else ""
    log_line(sprintf("REQ path=%s query=%s", url, q))

    # New mode: direct PNG response for browser <img src>.
    if (grepl("^/genes/", url)) {
      gene_name <- URLdecode(sub("^/genes/", "", url))
      sample_type <- query_param(req, "sample_type")
      log_line(sprintf("DIRECT_IMAGE gene=%s sample_type=%s", gene_name, sample_type))
      if (nchar(gene_name) == 0) {
        body <- "Missing gene name"
        log_line("BAD_REQUEST missing gene name")
        return(list(
          status = 400L,
          headers = list('Content-Type' = 'text/plain; charset=utf-8', 'Content-Length' = as.character(nchar(body))),
          body = body
        ))
      }
      if (!(sample_type %in% c("fetal", "adult"))) {
        body <- "sample_type must be fetal or adult"
        log_line("BAD_REQUEST invalid sample_type")
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
      log_line("PLOT_START scRNA")
      tryCatch({
        if (sample_type == "fetal") scRNA(fetal.epi, gene_name, png_file) else scRNA(adult.epi, gene_name, png_file)
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
      log_line(sprintf("PLOT_DONE scRNA elapsed=%.2fs bytes=%d", elapsed, length(png_data)))
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
    if (!is.null(data$sample_type)) {
      if (data$sample_type == "fetal") {
        cat("Running fetal epithelial scRNA\n")
        scRNA(fetal.epi, data$p1, data$p2)
      } else if (data$sample_type == "adult") {
        cat("Running adult epithelial scRNA\n")
        scRNA(adult.epi, data$p1, data$p2)
      } else {
        stop("Invalid sample_type: must be 'fetal' or 'adult'")
      }
    }
    response_body <- "finished"
    return(list(
      status = 200L,
      headers = list(
        'Content-Length' = as.character(nchar(response_body))
      ),
      body = response_body
    ))
  }
)

server <- startServer("127.0.0.1", 9025, app)
cat("Server started on http://localhost:9025\n")

while(TRUE) {
  service()
  Sys.sleep(0.001)
}
