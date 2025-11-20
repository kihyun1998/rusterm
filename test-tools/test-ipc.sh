#!/bin/bash
# RusTerm IPC Tab Management Test Script
# Unix Socket을 통해 탭 생성/삭제 테스트

set -e

# Unix Socket 경로
SOCKET_PATH="/tmp/rusterm-$(id -u).sock"

# 색상 정의
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
GRAY='\033[0;90m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# IPC 명령어 전송 함수
send_ipc_command() {
    local command="$1"
    echo -e "${GRAY}[SEND] $command${NC}"

    local response=$(echo "$command" | nc -U "$SOCKET_PATH" -W 1)
    echo -e "${GRAY}[RECV] $response${NC}"

    echo "$response"
}

echo -e "${CYAN}=== RusTerm IPC Tab Management Test ===${NC}"
echo ""

# Test 0: Ping
echo -e "${YELLOW}[Test 0] Ping test...${NC}"
RESPONSE=$(send_ipc_command '{"command":"ping"}')

if echo "$RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    VERSION=$(echo "$RESPONSE" | jq -r '.data.version')
    PID=$(echo "$RESPONSE" | jq -r '.data.pid')
    echo -e "${GREEN}[OK] Ping successful - Version: $VERSION, PID: $PID${NC}"
else
    ERROR=$(echo "$RESPONSE" | jq -r '.error')
    echo -e "${RED}[FAIL] Ping failed: $ERROR${NC}"
fi

echo ""

# Test 1: Add local tab
echo -e "${YELLOW}[Test 1] Adding local tab...${NC}"
ADD_LOCAL_CMD=$(cat <<EOF
{"command":"add_local_tab","params":{"cols":80,"rows":24,"cwd":"$HOME"}}
EOF
)

RESPONSE=$(send_ipc_command "$ADD_LOCAL_CMD")

if echo "$RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    LOCAL_TAB_ID=$(echo "$RESPONSE" | jq -r '.data.pty_id')
    echo -e "${GREEN}[OK] Local tab created: $LOCAL_TAB_ID${NC}"
else
    ERROR=$(echo "$RESPONSE" | jq -r '.error')
    echo -e "${RED}[FAIL] $ERROR${NC}"
    LOCAL_TAB_ID=""
fi

echo ""

# Test 2: Add SSH tab (requires SSH server)
echo -e "${YELLOW}[Test 2] Adding SSH tab...${NC}"
ADD_SSH_CMD=$(cat <<EOF
{"command":"add_ssh_tab","params":{"host":"localhost","port":22,"username":"$USER","authMethod":{"type":"password","password":"test123"},"cols":80,"rows":24}}
EOF
)

RESPONSE=$(send_ipc_command "$ADD_SSH_CMD")

if echo "$RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    SSH_TAB_ID=$(echo "$RESPONSE" | jq -r '.data.session_id')
    echo -e "${GREEN}[OK] SSH tab created: $SSH_TAB_ID${NC}"
else
    ERROR=$(echo "$RESPONSE" | jq -r '.error')
    echo -e "${YELLOW}[WARN] SSH failed (expected if no SSH server): $ERROR${NC}"
    SSH_TAB_ID=""
fi

echo ""

# Test 3: List tabs (currently returns empty)
echo -e "${YELLOW}[Test 3] Listing tabs...${NC}"
RESPONSE=$(send_ipc_command '{"command":"list_tabs"}')

if echo "$RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    TAB_COUNT=$(echo "$RESPONSE" | jq '.data.tabs | length')
    echo -e "${GREEN}[OK] Tabs: $TAB_COUNT${NC}"
else
    ERROR=$(echo "$RESPONSE" | jq -r '.error')
    echo -e "${RED}[FAIL] $ERROR${NC}"
fi

echo ""

# Test 4: Close tab
if [ -n "$LOCAL_TAB_ID" ]; then
    echo -e "${YELLOW}[Test 4] Closing local tab...${NC}"
    CLOSE_CMD=$(cat <<EOF
{"command":"close_tab","params":{"tabId":"$LOCAL_TAB_ID"}}
EOF
)

    RESPONSE=$(send_ipc_command "$CLOSE_CMD")

    if echo "$RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
        echo -e "${GREEN}[OK] Tab closed: $LOCAL_TAB_ID${NC}"
    else
        ERROR=$(echo "$RESPONSE" | jq -r '.error')
        echo -e "${RED}[FAIL] $ERROR${NC}"
    fi
fi

echo ""
echo -e "${GREEN}=== Test Completed ===${NC}"
