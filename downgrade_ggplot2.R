# Install remotes if needed
if (!require("remotes", quietly = TRUE)) {
  install.packages("remotes", repos = "https://cran.r-project.org")
}

library(remotes)

# Check current version
cat("Current ggplot2 version:", as.character(packageVersion("ggplot2")), "\n")

# Downgrade to 3.5.2
install_version("ggplot2", version = "3.5.2", repos = "http://cran.rstudio.com/")

# Verify
cat("New ggplot2 version:", as.character(packageVersion("ggplot2")), "\n")