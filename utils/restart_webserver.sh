#!/bin/bash
# restart_webserver.sh
# Shut down and restart the Python webserver in a screen session

BASE_DIR="/home/ubuntu/website/webserver"

echo "=========================================="
echo "Restarting Web Server"
echo "=========================================="

# Step 1: Kill existing webserver screen session
echo "Step 1: Stopping existing webserver screen session..."
screen -S webserver -X quit 2>/dev/null || true
# Also kill any screen sessions matching the pattern
screen -ls | grep -E "(webserver|server|python.*server)" | awk '{print $1}' | while read session; do
    screen -S "$session" -X quit 2>/dev/null || true
done
sleep 2

# Step 2: Kill any processes using port 80 (backup method)
echo "Step 2: Killing processes on port 80..."
pid=$(lsof -ti:80 2>/dev/null)
if [ ! -z "$pid" ]; then
    echo "  Killing process on port 80 (PID: $pid)"
    kill -9 $pid 2>/dev/null
    sleep 1
fi

# Step 3: Build React frontend
echo "Step 3: Building React frontend..."
cd "$BASE_DIR/frontend"
echo "  Running npm install..."
npm install
if npm run build; then
    echo "  ✓ React frontend built (frontend/dist)"
else
    echo "  ⚠ React build failed or npm not found; / will 404 until the frontend is built"
fi
cd "$BASE_DIR"

# Step 4: Start webserver in screen session
echo "Step 4: Starting webserver in screen session..."
screen -L -Logfile /tmp/webserver_screen.log -dmS webserver bash -lc "
  set -e
  cd '$BASE_DIR'
  python3 -c 'import sys; print(\"[BOOT]\", sys.executable)'
  exec python3 server.py
"
sleep 2

# Step 5: Verify server is running
echo ""
echo "Step 5: Verifying server is running..."
sleep 1

if screen -ls | grep -q webserver; then
  echo "  ✓ Screen session 'webserver' is running"
else
  echo "  ✗ Screen session exited. Check: /tmp/webserver_screen.log"
fi

echo ""
echo "Checking port 80..."
if lsof -ti:80 > /dev/null 2>&1; then
    echo "  ✓ Port 80 is active"
else
    echo "  ✗ Port 80 is NOT active. If the server failed to start, check: /tmp/webserver_screen.log"
fi

echo ""
echo "=========================================="
echo "Web Server restart complete!"
echo "=========================================="
echo ""
echo "To view the server's output, use:"
echo "  screen -r webserver"
echo ""
echo "To detach from the screen session: Ctrl+A, then D"
