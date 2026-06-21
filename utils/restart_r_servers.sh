#!/bin/bash
# Restarts the four gut atlas R plot servers in screen sessions (ports 9025–9028).

BASE_DIR="/home/ubuntu/website/webserver/resources"

echo "=========================================="
echo "Restarting R Servers"
echo "=========================================="

# Step 1: Kill existing screen sessions for R servers
echo "Step 1: Stopping existing R server screen sessions..."
for session in gut_atac_all gut_atac_epi gut_scrna_eec gut_scrna_epi; do
    screen -S "$session" -X quit 2>/dev/null || true
done
# Also kill any screen sessions matching the pattern
screen -ls 2>/dev/null | grep -E "(gut_atac_all|gut_atac_epi|gut_scrna_eec|gut_scrna_epi)" | awk '{print $1}' | while read -r session; do
  screen -S "$session" -X quit 2>/dev/null || true
done
sleep 2

# Step 2: Kill any processes using the R server ports (backup method)
echo "Step 2: Killing processes on gut R server ports (9025-9028)..."
for port in 9025 9026 9027 9028; do
    pid=$(lsof -ti:$port 2>/dev/null)
    if [ ! -z "$pid" ]; then
        echo "  Killing process on port $port (PID: $pid)"
        kill -9 $pid 2>/dev/null
    fi
done
sleep 1

# Step 3: Start all R servers in screen sessions
echo "Step 3: Starting R servers in screen sessions..."

cd "$BASE_DIR"

# Gut scRNA EEC server (port 9028)
echo "  Starting gut scRNA EEC server (port 9028)..."
cd "$BASE_DIR"
screen -dmS gut_scrna_eec Rscript EECplot.R
sleep 1

# Gut scRNA epithelial server (port 9025)
echo "  Starting gut scRNA epithelial server (port 9025)..."
cd "$BASE_DIR"
screen -dmS gut_scrna_epi Rscript scRNAfunction.R
sleep 1

# Gut ATAC all-cells server (port 9026)
echo "  Starting gut ATAC all-cells server (port 9026)..."
cd "$BASE_DIR"
screen -dmS gut_atac_all Rscript atacallcells.R
sleep 1

# Gut ATAC epithelial server (port 9027)
echo "  Starting gut ATAC epithelial server (port 9027)..."
cd "$BASE_DIR"
screen -dmS gut_atac_epi Rscript atacepithelial.R
sleep 1

# Step 4: Verify servers are running
echo ""
echo "Step 4: Verifying servers are running..."
sleep 2

screen -ls

echo ""
echo "Checking ports..."
for port in 9025 9026 9027 9028; do
    if lsof -ti:$port > /dev/null 2>&1; then
        echo "  ✓ Port $port is active"
    else
        echo "  ✗ Port $port is NOT active"
    fi
done

echo ""
echo "=========================================="
echo "R Server restart complete!"
echo "=========================================="
echo ""
echo "To view a server's output, use:"
echo "  screen -r <session_name>"
echo ""
echo "Available sessions:"
echo "  - gut_scrna_eec (port 9028)"
echo "  - gut_scrna_epi (port 9025)"
echo "  - gut_atac_all (port 9026)"
echo "  - gut_atac_epi (port 9027)"
echo ""
echo "To detach from a screen session: Ctrl+A, then D"
