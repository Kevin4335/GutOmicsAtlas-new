require(patchwork)
require(Seurat)
require(ggplot2)
library(httpuv) # jtc
library(jsonlite) # jtc
merged.gut<-readRDS("./EEChormoneassignmentnew.rds")
#write.csv(Idents(merged.gut), "EECidentity.csv")
new.cluster.ids <- c("Endocrine Progenitors", "D cells", "N cells", "I cells", "M/X/A cells",
                    "L cells","K cells","Enterochromaffin cells")
names(new.cluster.ids) <- levels(merged.gut)
merged.gut <- RenameIdents(merged.gut, new.cluster.ids)
#saveRDS(merged.gut, "EEChormoneassignmentnew.rds")
scRNAEEC<-function(genes, pdf_path){
  p1<-FeaturePlot(merged.gut, features=genes, reduction="umap")
  p3<-p1+labs(title = "", x = "UMAP_1", y = "UMAP_2") + theme(
    axis.text = element_text(size = 32),    # Font size for axis tick labels
    axis.title = element_text(size = 38),  # Font size for axis titles
    legend.text = element_text(size = 24), # Font size for legend text
    legend.title = element_text(size = 32) # Font size for legend title
  )
  p2<-VlnPlot(merged.gut, features=genes)
  p4<-p2+labs(title = "")+theme(
    axis.text = element_text(size = 32),    # Font size for axis tick labels
    axis.title = element_text(size = 38),  # Font size for axis titles
    legend.text = element_text(size = 32), # Font size for legend text
    legend.title = element_text(size = 32) # Font size for legend title
  )
  # combined_plot<-p1+p2+plot_layout(ncol=2)
  combined_plot<-p3+p4+plot_layout(ncol=2)
  ggsave(pdf_path, plot = combined_plot, width = 30, height = 15)
}

# scRNAEEC("GIP")



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
    if(f == 24){
      cat('scRNAEEC', "\n")
      scRNAEEC(data$p1, data$p2)
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


server <- startServer("0.0.0.0", 9024, app)
cat("Server started on http://localhost:9024\n")


while(TRUE) {
  service()
  Sys.sleep(0.001)
}

