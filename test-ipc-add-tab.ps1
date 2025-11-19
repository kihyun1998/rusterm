# RusTerm IPC Tab Management Test Script
# Windows Named Pipe를 통해 탭 생성/삭제 테스트

$ErrorActionPreference = "Stop"

# Named Pipe 이름
$username = $env:USERNAME
$pipeName = "rusterm-$username"
$pipeFullPath = "\\.\pipe\$pipeName"

function Send-IpcCommand {
    param(
        [string]$Command
    )

    try {
        # Named Pipe 연결
        $pipeClient = New-Object System.IO.Pipes.NamedPipeClientStream(".", $pipeName, [System.IO.Pipes.PipeDirection]::InOut)
        $pipeClient.Connect(5000)

        $streamReader = New-Object System.IO.StreamReader($pipeClient)
        $streamWriter = New-Object System.IO.StreamWriter($pipeClient)
        $streamWriter.AutoFlush = $true

        # 요청 전송
        Write-Host "[SEND] $Command" -ForegroundColor DarkGray
        $streamWriter.WriteLine($Command)

        # 응답 받기
        $response = $streamReader.ReadLine()
        Write-Host "[RECV] $response" -ForegroundColor DarkGray

        # 정리
        $streamReader.Close()
        $streamWriter.Close()
        $pipeClient.Close()

        return $response | ConvertFrom-Json

    } catch {
        Write-Host "[ERROR] $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

Write-Host "=== RusTerm IPC Tab Management Test ===" -ForegroundColor Cyan
Write-Host ""

# Test 1: Ping
Write-Host "[Test 0] Ping test..." -ForegroundColor Yellow
$pingCmd = @{
    command = "ping"
} | ConvertTo-Json -Compress

$response = Send-IpcCommand -Command $pingCmd
if ($response.success) {
    Write-Host "[OK] Ping successful - Version: $($response.data.version), PID: $($response.data.pid)" -ForegroundColor Green
} else {
    Write-Host "[FAIL] Ping failed: $($response.error)" -ForegroundColor Red
}

Write-Host ""

# Test 2: Add local tab
Write-Host "[Test 1] Adding local tab..." -ForegroundColor Yellow
$addLocalCmd = @{
    command = "add_local_tab"
    params = @{
        cols = 80
        rows = 24
        cwd = $HOME
    }
} | ConvertTo-Json -Compress

$response = Send-IpcCommand -Command $addLocalCmd
if ($response.success) {
    Write-Host "[OK] Local tab created: $($response.data.pty_id)" -ForegroundColor Green
    $localTabId = $response.data.pty_id
} else {
    Write-Host "[FAIL] $($response.error)" -ForegroundColor Red
}

Write-Host ""

# Test 3: Add SSH tab (requires SSH server)
Write-Host "[Test 2] Adding SSH tab..." -ForegroundColor Yellow
$addSshCmd = @{
    command = "add_ssh_tab"
    params = @{
        host = "localhost"
        port = 22
        username = $env:USERNAME
        authMethod = @{
            type = "password"
            password = "test123"
        }
        cols = 80
        rows = 24
    }
} | ConvertTo-Json -Compress

$response = Send-IpcCommand -Command $addSshCmd
if ($response.success) {
    Write-Host "[OK] SSH tab created: $($response.data.session_id)" -ForegroundColor Green
    $sshTabId = $response.data.session_id
} else {
    Write-Host "[WARN] SSH failed (expected if no SSH server): $($response.error)" -ForegroundColor Yellow
}

Write-Host ""

# Test 4: List tabs (currently returns empty)
Write-Host "[Test 3] Listing tabs..." -ForegroundColor Yellow
$listCmd = @{
    command = "list_tabs"
} | ConvertTo-Json -Compress

$response = Send-IpcCommand -Command $listCmd
if ($response.success) {
    Write-Host "[OK] Tabs: $($response.data.tabs.Count)" -ForegroundColor Green
} else {
    Write-Host "[FAIL] $($response.error)" -ForegroundColor Red
}

Write-Host ""

# Test 5: Close tab
if ($localTabId) {
    Write-Host "[Test 4] Closing local tab..." -ForegroundColor Yellow
    $closeCmd = @{
        command = "close_tab"
        params = @{
            tabId = $localTabId
        }
    } | ConvertTo-Json -Compress

    $response = Send-IpcCommand -Command $closeCmd
    if ($response.success) {
        Write-Host "[OK] Tab closed: $localTabId" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] $($response.error)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=== Test Completed ===" -ForegroundColor Green
