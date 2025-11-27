# 커스텀 원격 데스크톱 구현 계획서 (MSTSC 스타일)

## 📋 프로젝트 개요

**목표**: Windows의 `mstsc.exe`와 유사하게 동작하는 원격 데스크톱 애플리케이션을 Rust로 처음부터 구현합니다.

**차이점**: 
- 표준 RDP 프로토콜을 사용하지 않고 자체 프로토콜을 구현합니다.
- 따라서 접속하려는 대상(Host) 컴퓨터에도 우리 프로그램이 실행되어 있어야 합니다.
- 하지만 프로토콜 자체는 우리가 완전히 제어할 수 있어서 최적화와 기능 추가가 자유롭습니다.

---

## 🏗️ 아키텍처

### 두 가지 실행 모드

#### 1. Host 모드 (서버 / 제어 당하는 쪽)
- 자기 화면을 캡처해서 이미지로 변환
- 이미지를 압축해서 네트워크로 전송
- 자기 오디오를 녹음해서 전송
- 상대방이 보낸 마우스/키보드 이벤트를 받아서 실제로 실행

#### 2. Viewer 모드 (클라이언트 / 제어하는 쪽)
- Host가 보낸 화면 이미지를 Canvas에 실시간으로 렌더링
- Host가 보낸 오디오를 스피커로 재생
- 사용자의 마우스/키보드 입력을 캡처해서 Host로 전송

---

## 📦 필요한 Rust 라이브러리

### 화면 캡처
```toml
xcap = "0.0.9"  # 크로스플랫폼 화면 캡처 (Windows, macOS, Linux 지원)
```

### 입력 제어 (마우스, 키보드)
```toml
enigo = "0.2"  # 크로스플랫폼 입력 시뮬레이션
```

### 이미지 처리 및 압축
```toml
image = "0.24"  # JPEG, PNG, WebP 인코딩/디코딩
# 향후 고성능 비디오 스트리밍을 위해:
# ffmpeg-next = "6.1"  # H.264/H.265 하드웨어 인코딩
```

### 오디오 캡처 및 재생
```toml
cpal = "0.15"  # 크로스플랫폼 오디오 I/O
```

### 네트워크 및 비동기
```toml
tokio = { version = "1", features = ["full"] }
serde = { version = "1", features = ["derive"] }
bincode = "1.3"  # 빠른 바이너리 직렬화
```

---

## 🎯 구현 단계 (Phase별 세부 계획)

### **Phase 0: 프로젝트 구조 정리 및 의존성 추가**

#### 작업 내용
1. 기존 `ironrdp` 관련 코드 제거
2. `Cargo.toml`에 위 라이브러리들 추가
3. 모듈 구조 설계:
   ```
   src-tauri/src/
   ├── remote_desktop/
   │   ├── mod.rs
   │   ├── host.rs          # Host 모드 구현
   │   ├── viewer.rs        # Viewer 모드 구현
   │   ├── screen.rs        # 화면 캡처
   │   ├── input.rs         # 입력 제어
   │   ├── audio.rs         # 오디오 처리
   │   └── protocol.rs      # 패킷 정의
   ```

#### 검증 방법
- `cargo check` 실행하여 의존성 오류 없는지 확인

---

### **Phase 1: 화면 캡처 구현 (Host 기능)**

#### 목표
Host 컴퓨터의 화면을 캡처하여 JPEG 이미지로 압축하는 기능을 구현합니다.

#### 세부 구현

##### 1.1 기본 화면 캡처
```rust
// src-tauri/src/remote_desktop/screen.rs

use xcap::Monitor;
use image::{ImageBuffer, RgbaImage, ImageFormat};

pub struct ScreenCapturer {
    monitor: Monitor,
}

impl ScreenCapturer {
    pub fn new() -> Result<Self, String> {
        let monitors = Monitor::all().map_err(|e| e.to_string())?;
        let primary = monitors.into_iter()
            .find(|m| m.is_primary())
            .ok_or("No primary monitor found")?;
        
        Ok(Self { monitor: primary })
    }

    /// 현재 화면을 캡처하여 JPEG 버퍼로 반환
    pub fn capture(&self) -> Result<Vec<u8>, String> {
        let image = self.monitor.capture_image()
            .map_err(|e| e.to_string())?;
        
        let mut buffer = Vec::new();
        let mut cursor = std::io::Cursor::new(&mut buffer);
        
        image.write_to(&mut cursor, ImageFormat::Jpeg)
            .map_err(|e| e.to_string())?;
        
        Ok(buffer)
    }
}
```

##### 1.2 Tauri Command로 테스트
```rust
// src-tauri/src/commands/remote_desktop_commands.rs

#[tauri::command]
pub async fn test_screen_capture() -> Result<String, String> {
    let capturer = ScreenCapturer::new()?;
    let jpeg_data = capturer.capture()?;
    
    // 테스트: 파일로 저장
    std::fs::write("test_capture.jpg", &jpeg_data)
        .map_err(|e| e.to_string())?;
    
    Ok(format!("Captured {} bytes", jpeg_data.len()))
}
```

#### 검증 방법
- Frontend에서 버튼 클릭 시 `test_screen_capture` 호출
- `test_capture.jpg` 파일이 생성되고 정상적인 화면인지 확인

---

### **Phase 2: 입력 제어 구현 (Host 기능)**

#### 목표
네트워크로 받은 마우스/키보드 이벤트를 실제 OS 입력으로 변환합니다.

#### 세부 구현

##### 2.1 입력 이벤트 정의
```rust
// src-tauri/src/remote_desktop/protocol.rs

use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub enum InputEvent {
    MouseMove { x: i32, y: i32 },
    MouseDown { button: MouseButton },
    MouseUp { button: MouseButton },
    KeyDown { key: String },
    KeyUp { key: String },
    Scroll { delta_x: i32, delta_y: i32 },
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub enum MouseButton {
    Left,
    Right,
    Middle,
}
```

##### 2.2 입력 컨트롤러
```rust
// src-tauri/src/remote_desktop/input.rs

use enigo::{Enigo, Mouse, Keyboard, Button, Key, Direction};

pub struct InputController {
    enigo: Enigo,
}

impl InputController {
    pub fn new() -> Self {
        Self {
            enigo: Enigo::new(&enigo::Settings::default()).unwrap(),
        }
    }

    pub fn execute(&mut self, event: InputEvent) -> Result<(), String> {
        match event {
            InputEvent::MouseMove { x, y } => {
                self.enigo.move_mouse(x, y, enigo::Coordinate::Abs)
                    .map_err(|e| e.to_string())?;
            }
            InputEvent::MouseDown { button } => {
                let btn = match button {
                    MouseButton::Left => Button::Left,
                    MouseButton::Right => Button::Right,
                    MouseButton::Middle => Button::Middle,
                };
                self.enigo.button(btn, Direction::Press)
                    .map_err(|e| e.to_string())?;
            }
            InputEvent::MouseUp { button } => {
                let btn = match button {
                    MouseButton::Left => Button::Left,
                    MouseButton::Right => Button::Right,
                    MouseButton::Middle => Button::Middle,
                };
                self.enigo.button(btn, Direction::Release)
                    .map_err(|e| e.to_string())?;
            }
            InputEvent::KeyDown { key } => {
                // 키 매핑 로직 (JS keycode -> enigo Key)
                // 간단한 예시
                self.enigo.text(&key).map_err(|e| e.to_string())?;
            }
            _ => {}
        }
        Ok(())
    }
}
```

##### 2.3 테스트 Command
```rust
#[tauri::command]
pub async fn test_move_mouse(x: i32, y: i32) -> Result<(), String> {
    let mut controller = InputController::new();
    controller.execute(InputEvent::MouseMove { x, y })
}
```

#### 검증 방법
- Frontend에서 좌표를 입력하고 명령 실행 시 마우스가 실제로 이동하는지 확인

---

### **Phase 3: 오디오 캡처 및 재생 (선택적)**

#### 목표
Host의 시스템 오디오를 캡처하고 Viewer에서 재생합니다.

#### 세부 구현

##### 3.1 오디오 캡처 (Host)
```rust
// src-tauri/src/remote_desktop/audio.rs

use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};

pub struct AudioCapturer {
    // Audio stream
}

impl AudioCapturer {
    pub fn start_capture<F>(callback: F) -> Result<(), String>
    where
        F: FnMut(&[f32]) + Send + 'static
    {
        let host = cpal::default_host();
        let device = host.default_input_device()
            .ok_or("No input device available")?;
        
        let config = device.default_input_config()
            .map_err(|e| e.to_string())?;
        
        // Stream 구성 및 callback 설정
        // 실제 구현은 cpal 문서 참조
        
        Ok(())
    }
}
```

##### 3.2 오디오 재생 (Viewer)
```rust
pub struct AudioPlayer {
    // Output stream
}

impl AudioPlayer {
    pub fn play(&self, samples: &[f32]) -> Result<(), String> {
        // cpal output stream 사용
        Ok(())
    }
}
```

#### 검증 방법
- Host에서 음악 재생 시 Viewer에서 동일한 소리가 들리는지 확인

---

### **Phase 4: 네트워크 프로토콜 구현**

#### 목표
Host와 Viewer 간의 통신 프로토콜을 정의하고 구현합니다.

#### 세부 구현

##### 4.1 패킷 정의
```rust
// src-tauri/src/remote_desktop/protocol.rs

#[derive(Serialize, Deserialize, Debug)]
pub enum Packet {
    /// Host -> Viewer: 화면 프레임 전송
    VideoFrame {
        frame_id: u64,
        jpeg_data: Vec<u8>,
        width: u32,
        height: u32,
    },
    
    /// Host -> Viewer: 오디오 샘플 전송
    AudioSamples {
        samples: Vec<f32>,
    },
    
    /// Viewer -> Host: 입력 이벤트 전송
    Input {
        event: InputEvent,
    },
    
    /// 연결 확립
    Hello {
        version: String,
    },
    
    /// 핑퐁 (연결 유지)
    Ping,
    Pong,
}
```

##### 4.2 Host 서버
```rust
// src-tauri/src/remote_desktop/host.rs

use tokio::net::{TcpListener, TcpStream};
use tokio::io::{AsyncReadExt, AsyncWriteExt};

pub struct RemoteDesktopHost {
    listener: TcpListener,
    screen_capturer: ScreenCapturer,
    input_controller: InputController,
}

impl RemoteDesktopHost {
    pub async fn start(port: u16) -> Result<Self, String> {
        let listener = TcpListener::bind(format!("0.0.0.0:{}", port))
            .await
            .map_err(|e| e.to_string())?;
        
        println!("Host listening on port {}", port);
        
        Ok(Self {
            listener,
            screen_capturer: ScreenCapturer::new()?,
            input_controller: InputController::new(),
        })
    }
    
    pub async fn accept_connection(&self) -> Result<(), String> {
        let (mut socket, addr) = self.listener.accept()
            .await
            .map_err(|e| e.to_string())?;
        
        println!("Accepted connection from {}", addr);
        
        // 클라이언트와 통신 시작
        self.handle_client(socket).await
    }
    
    async fn handle_client(&self, mut socket: TcpStream) -> Result<(), String> {
        loop {
            // 1. 화면 캡처
            let jpeg_data = self.screen_capturer.capture()?;
            
            // 2. 패킷 생성
            let packet = Packet::VideoFrame {
                frame_id: 0, // TODO: 실제 frame counter
                jpeg_data,
                width: 1920,
                height: 1080,
            };
            
            // 3. 직렬화 및 전송
            let encoded = bincode::serialize(&packet)
                .map_err(|e| e.to_string())?;
            
            // 길이 먼저 전송 (4바이트)
            let len = encoded.len() as u32;
            socket.write_all(&len.to_be_bytes())
                .await
                .map_err(|e| e.to_string())?;
            
            // 데이터 전송
            socket.write_all(&encoded)
                .await
                .map_err(|e| e.to_string())?;
            
            // 4. 클라이언트로부터 입력 이벤트 수신 (non-blocking)
            // TODO: 별도 task로 분리 필요
            
            // 프레임레이트 제어 (30 FPS)
            tokio::time::sleep(tokio::time::Duration::from_millis(33)).await;
        }
    }
}
```

##### 4.3 Viewer 클라이언트
```rust
// src-tauri/src/remote_desktop/viewer.rs

use tokio::net::TcpStream;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tauri::{AppHandle, Emitter};

pub struct RemoteDesktopViewer {
    socket: TcpStream,
    app_handle: AppHandle,
}

impl RemoteDesktopViewer {
    pub async fn connect(host: &str, port: u16, app_handle: AppHandle) -> Result<Self, String> {
        let socket = TcpStream::connect(format!("{}:{}", host, port))
            .await
            .map_err(|e| e.to_string())?;
        
        Ok(Self { socket, app_handle })
    }
    
    pub async fn receive_loop(&mut self) -> Result<(), String> {
        loop {
            // 1. 패킷 길이 읽기
            let mut len_buf = [0u8; 4];
            self.socket.read_exact(&mut len_buf)
                .await
                .map_err(|e| e.to_string())?;
            
            let len = u32::from_be_bytes(len_buf) as usize;
            
            // 2. 패킷 데이터 읽기
            let mut packet_buf = vec![0u8; len];
            self.socket.read_exact(&mut packet_buf)
                .await
                .map_err(|e| e.to_string())?;
            
            // 3. 역직렬화
            let packet: Packet = bincode::deserialize(&packet_buf)
                .map_err(|e| e.to_string())?;
            
            // 4. 패킷 처리
            match packet {
                Packet::VideoFrame { jpeg_data, .. } => {
                    // Base64로 인코딩하여 Frontend로 전송
                    let base64_data = base64::encode(&jpeg_data);
                    self.app_handle.emit("remote-frame", base64_data)
                        .map_err(|e| e.to_string())?;
                }
                _ => {}
            }
        }
    }
    
    pub async fn send_input(&mut self, event: InputEvent) -> Result<(), String> {
        let packet = Packet::Input { event };
        let encoded = bincode::serialize(&packet)
            .map_err(|e| e.to_string())?;
        
        let len = encoded.len() as u32;
        self.socket.write_all(&len.to_be_bytes())
            .await
            .map_err(|e| e.to_string())?;
        self.socket.write_all(&encoded)
            .await
            .map_err(|e| e.to_string())?;
        
        Ok(())
    }
}
```

#### 검증 방법
- Host 모드로 앱 실행 → 포트 리스닝 확인
- Viewer 모드로 다른 앱/PC에서 실행 → 연결 성공 확인

---

### **Phase 5: Frontend 구현**

#### 목표
React 컴포넌트로 원격 화면을 보여주고 입력을 캡처합니다.

#### 세부 구현

##### 5.1 Viewer 컴포넌트
```typescript
// src/components/RemoteDesktopViewer.tsx

import { useEffect, useRef, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';

export function RemoteDesktopViewer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // 프레임 수신 리스너
    const unlisten = listen<string>('remote-frame', (event) => {
      const base64Data = event.payload;
      const img = new Image();
      img.onload = () => {
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
        }
      };
      img.src = `data:image/jpeg;base64,${base64Data}`;
    });

    return () => {
      unlisten.then(fn => fn());
    };
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!connected) return;
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    invoke('send_remote_input', {
      event: {
        MouseMove: { x: Math.floor(x), y: Math.floor(y) }
      }
    });
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    invoke('send_remote_input', {
      event: {
        MouseDown: { button: 'Left' }
      }
    });
    // MouseUp 이벤트도 전송
  };

  const connect = async () => {
    try {
      await invoke('connect_to_remote_host', {
        host: '192.168.1.100',
        port: 9999
      });
      setConnected(true);
    } catch (e) {
      console.error('Connection failed:', e);
    }
  };

  return (
    <div>
      <button onClick={connect}>연결</button>
      <canvas
        ref={canvasRef}
        width={1920}
        height={1080}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        style={{ border: '1px solid black', cursor: 'none' }}
      />
    </div>
  );
}
```

##### 5.2 Tauri Commands
```rust
#[tauri::command]
pub async fn connect_to_remote_host(
    host: String,
    port: u16,
    app_handle: AppHandle
) -> Result<(), String> {
    let mut viewer = RemoteDesktopViewer::connect(&host, port, app_handle).await?;
    
    // 별도 task에서 수신 루프 실행
    tokio::spawn(async move {
        if let Err(e) = viewer.receive_loop().await {
            eprintln!("Receive loop error: {}", e);
        }
    });
    
    Ok(())
}

#[tauri::command]
pub async fn send_remote_input(event: InputEvent) -> Result<(), String> {
    // TODO: Viewer 인스턴스를 State로 관리해야 함
    Ok(())
}
```

---

## 📝 개발 순서 요약

1. **Phase 0**: 프로젝트 구조 정리 및 의존성 추가 (1일)
2. **Phase 1**: 화면 캡처 구현 및 테스트 (1~2일)
3. **Phase 2**: 입력 제어 구현 및 테스트 (1일)
4. **Phase 3**: 오디오 구현 (선택, 2~3일)
5. **Phase 4**: 네트워크 프로토콜 구현 (3~4일)
6. **Phase 5**: Frontend 통합 (2일)

**총 예상 기간**: 약 2주 (오디오 제외 시 1주)

---

## 🔧 최적화 및 추가 기능 (향후)

### 성능 최적화
- **H.264 하드웨어 인코딩**: JPEG 대신 `ffmpeg-next`로 GPU 인코딩
- **Dirty Rect 전송**: 변경된 화면 영역만 전송
- **프레임 스킵**: 네트워크 대역폭에 맞춰 FPS 동적 조절

### 추가 기능
- **파일 전송**: Drag & Drop으로 파일 전송
- **클립보드 공유**: 양쪽 클립보드 동기화
- **다중 모니터**: 여러 화면 중 선택
- **세션 녹화**: 원격 세션을 비디오로 저장

---

## ⚠️ 주의사항

1. **보안**: 현재 계획은 암호화가 없습니다. 실제 사용 시 TLS를 추가해야 합니다.
2. **방화벽**: Host는 특정 포트(예: 9999)를 열어야 합니다.
3. **성능**: 초기 JPEG 방식은 네트워크 대역폭을 많이 사용합니다 (1080p 기준 최소 10Mbps 권장).
