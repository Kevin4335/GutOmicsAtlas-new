require(patchwork)
require(Seurat)
require(ggplot2)
library(httpuv) 
library(jsonlite)

# ================== Load datasets ==================
# Use absolute path inside the container (mounted from host /home/ubuntu/website/data).
# fetal.eec <- readRDS("/root/data/REVISED_DATA/scRNA/Fetal/EECs/eecupdated.rds")
# adult.eec <- readRDS("/root/data/REVISED_DATA/scRNA/Adult/EECs/adultEECs.rds")

fetal.eec <- readRDS("/home/ubuntu/website/data/REVISED_DATA/scRNA/Fetal/EECs/eecupdated.rds")
adult.eec <- readRDS("/home/ubuntu/website/data/REVISED_DATA/scRNA/Adult/EECs/adultEECs.rds")

# ================== Plotting function ==================
scRNAEEC <- function(obj, genes, pdf_path) {
  p1 <- FeaturePlot(obj, features = genes, reduction = "umap")
  p3 <- p1 + labs(title = "", x = "UMAP_1", y = "UMAP_2") + theme(
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

# ================== HTTP Server ==================
app <- list(
  call = function(req) {
    url <- req$PATH_INFO
    json_data <- hex_to_string(substr(url, 2, nchar(url)))
    data <- fromJSON(json_data)
    
    # Expect JSON: { "sample_type": "fetal" or "adult", "p1": "GENE", "p2": "output.pdf" }
    if (!is.null(data$sample_type)) {
      if (data$sample_type == "fetal") {
        cat("Running fetal scRNAEEC\n")
        scRNAEEC(fetal.eec, data$p1, data$p2)
      } else if (data$sample_type == "adult") {
        cat("Running adult scRNAEEC\n")
        scRNAEEC(adult.eec, data$p1, data$p2)
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

server <- startServer("0.0.0.0", 9024, app)
cat("Server started on http://localhost:9024\n")

while(TRUE) {
  service()
  Sys.sleep(0.001)
}
