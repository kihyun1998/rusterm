# RusTerm IPC Ping Test Script
# Windows Named Pipe를 통해 IPC 서버에 ping 요청을 보냅니다.

$ErrorActionPreference = "Stop"

# Named Pipe 이름 생성 (rusterm-{username})
$username = $env:USERNAME
$pipeName = "rusterm-$username"
$pipeFullPath = "\\.\pipe\$pipeName"

Write-Host "=== RusTerm IPC Ping Test ===" -ForegroundColor Cyan
Write-Host "Pipe Name: $pipeFullPath" -ForegroundColor Yellow
Write-Host ""

try {
    # Named Pipe 클라이언트 생성
    Write-Host "[1] Connecting to IPC server..." -ForegroundColor Gray
    $pipeClient = New-Object System.IO.Pipes.NamedPipeClientStream(".", $pipeName, [System.IO.Pipes.PipeDirection]::InOut)

    # 연결 시도 (5초 타임아웃)
    $pipeClient.Connect(5000)
    Write-Host "[OK] Connected successfully!" -ForegroundColor Green
    Write-Host ""

    # StreamReader/Writer 생성
    $streamReader = New-Object System.IO.StreamReader($pipeClient)
    $streamWriter = New-Object System.IO.StreamWriter($pipeClient)
    $streamWriter.AutoFlush = $true

    # Ping 요청 전송
    $pingRequest = '{"command":"ping"}'
    Write-Host "[2] Sending ping request..." -ForegroundColor Gray
    Write-Host "    Request: $pingRequest" -ForegroundColor DarkGray
    $streamWriter.WriteLine($pingRequest)

    # 응답 받기
    Write-Host "[3] Waiting for response..." -ForegroundColor Gray
    $response = $streamReader.ReadLine()

    if ($response) {
        Write-Host "[OK] Response received!" -ForegroundColor Green
        Write-Host ""
        Write-Host "=== Response ===" -ForegroundColor Cyan

        # JSON 파싱 및 예쁘게 출력
        $jsonResponse = $response | ConvertFrom-Json
        Write-Host "Success: $($jsonResponse.success)" -ForegroundColor Yellow

        if ($jsonResponse.data) {
            Write-Host "Version: $($jsonResponse.data.version)" -ForegroundColor Yellow
            Write-Host "PID: $($jsonResponse.data.pid)" -ForegroundColor Yellow
        }

        if ($jsonResponse.error) {
            Write-Host "Error: $($jsonResponse.error)" -ForegroundColor Red
        }

        Write-Host ""
        Write-Host "Raw JSON:" -ForegroundColor DarkGray
        Write-Host $response -ForegroundColor DarkGray
    } else {
        Write-Host "[ERROR] No response received" -ForegroundColor Red
    }

    # 정리
    $streamReader.Close()
    $streamWriter.Close()
    $pipeClient.Close()

    Write-Host ""
    Write-Host "=== Test Completed ===" -ForegroundColor Green

} catch [System.TimeoutException] {
    Write-Host ""
    Write-Host "[ERROR] Connection timeout!" -ForegroundColor Red
    Write-Host "Is RusTerm running? (Try: pnpm run tauri dev)" -ForegroundColor Yellow
    exit 1

} catch [System.IO.IOException] {
    Write-Host ""
    Write-Host "[ERROR] Failed to connect to pipe: $pipeFullPath" -ForegroundColor Red
    Write-Host "Is RusTerm IPC server running?" -ForegroundColor Yellow
    Write-Host "Make sure the app is started with: pnpm run tauri dev" -ForegroundColor Yellow
    exit 1

} catch {
    Write-Host ""
    Write-Host "[ERROR] Unexpected error:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host $_.Exception.GetType().FullName -ForegroundColor DarkGray
    exit 1

} finally {
    # 리소스 정리
    if ($streamReader) { $streamReader.Dispose() }
    if ($streamWriter) { $streamWriter.Dispose() }
    if ($pipeClient) { $pipeClient.Dispose() }
}
