# FreeRDP3 Rust 바인딩 프로젝트 계획서 (Windows)

## 📋 프로젝트 개요

**목표**: FreeRDP C 라이브러리를 Rust FFI로 바인딩하여 안전하고 사용하기 쉬운 `freerdp3` 패키지를 만들고, crates.io에 배포합니다.

**패키지 이름**: `freerdp3-sys` (FFI) + `freerdp3` (고수준 API)

**개발 환경**: Windows 10/11 (x64)

**지원 기능** (FreeRDP의 모든 주요 기능):
- ✅ 기본 RDP 연결 (화면 공유, 입력)
- ✅ 클립보드 공유 (양방향)
- ✅ 오디오 입출력 (재생, 마이크)
- ✅ 파일 전송 (드라이브 리디렉션)
- ✅ 프린터 리디렉션
- ✅ 다중 모니터 지원
- ✅ RemoteFX (고급 그래픽 코덱)
- ✅ H.264 하드웨어 가속
- ✅ RDP Gateway 지원
- ✅ 스마트카드 인증
- ✅ USB 리디렉션

---

## 🏗️ 프로젝트 구조

### 3계층 아키텍처

```
freerdp3-rs/              # 새로운 Cargo workspace
├── freerdp3-sys/         # Low-level FFI bindings (unsafe)
│   ├── build.rs          # bindgen으로 자동 생성
│   ├── wrapper.h         # FreeRDP 헤더 집합
│   └── src/
│       └── lib.rs
├── freerdp3/             # High-level safe wrapper
│   └── src/
│       ├── lib.rs
│       ├── client.rs     # RdpClient
│       ├── settings.rs   # RdpSettings
│       ├── events.rs     # RdpEvent
│       ├── channels/     # Virtual channels
│       │   ├── mod.rs
│       │   ├── cliprdr.rs    # 클립보드
│       │   ├── rdpsnd.rs     # 오디오 출력
│       │   ├── rdpdr.rs      # 드라이브 리디렉션
│       │   └── drdynvc.rs    # 동적 채널
│       └── error.rs
├── examples/
│   ├── simple_connect.rs
│   ├── clipboard_share.rs
│   ├── audio_playback.rs
│   └── file_transfer.rs
└── README.md

rusterm/                  # 기존 프로젝트
└── src-tauri/
    └── Cargo.toml        # freerdp3 = "0.1.0" 추가
```

---

## 🎯 단계별 구현 계획

### Phase 0: Windows 환경 설정 (1일)

#### 0.1 필수 도구 설치

**Visual Studio Build Tools**:
```powershell
# Visual Studio 2022 Community 또는 Build Tools 설치
# "C++를 사용한 데스크톱 개발" 워크로드 선택
# 다운로드: https://visualstudio.microsoft.com/downloads/
```

**vcpkg 설치**:
```powershell
# C 드라이브에 vcpkg 설치 (권장)
cd C:\
git clone https://github.com/microsoft/vcpkg
cd vcpkg
.\bootstrap-vcpkg.bat
.\vcpkg integrate install

# 환경 변수 설정
$env:VCPKG_ROOT = "C:\vcpkg"
[System.Environment]::SetEnvironmentVariable("VCPKG_ROOT", "C:\vcpkg", "User")
```

**FreeRDP 설치**:
```powershell
cd C:\vcpkg
.\vcpkg install freerdp:x64-windows

# 설치 확인
.\vcpkg list | Select-String freerdp
# 출력 예상:
# freerdp:x64-windows    3.0.0    Free implementation of the Remote Desktop Protocol
```

**Rust 도구**:
```powershell
# bindgen을 위한 LLVM 설치
choco install llvm
# 또는 수동 설치: https://releases.llvm.org/download.html

# 환경 변수 설정
$env:LIBCLANG_PATH = "C:\Program Files\LLVM\bin"
```

#### 0.2 Workspace 생성

```powershell
# 프로젝트 디렉토리 생성
mkdir D:\freerdp3-rs
cd D:\freerdp3-rs

# Cargo workspace 초기화
cargo new --lib freerdp3-sys
cargo new --lib freerdp3

# Workspace 설정
@"
[workspace]
members = ["freerdp3-sys", "freerdp3"]
resolver = "2"

[workspace.package]
version = "0.1.0"
edition = "2021"
license = "MIT OR Apache-2.0"
authors = ["Your Name <your.email@example.com>"]
repository = "https://github.com/yourusername/freerdp3-rs"
keywords = ["rdp", "remote-desktop", "freerdp", "windows"]
categories = ["network-programming", "api-bindings"]
"@ | Out-File -FilePath Cargo.toml -Encoding UTF8
```

---

### Phase 1: freerdp3-sys (Low-level FFI) 구현 (3~4일)

#### 1.1 Dependencies

**`freerdp3-sys/Cargo.toml`**:
```toml
[package]
name = "freerdp3-sys"
version.workspace = true
edition.workspace = true
license.workspace = true
authors.workspace = true
repository.workspace = true

description = "Low-level FFI bindings to FreeRDP"
keywords.workspace = true
categories.workspace = true

links = "freerdp3"  # Cargo가 중복 링크 방지
build = "build.rs"

[build-dependencies]
bindgen = "0.69"
vcpkg = "0.2"  # Windows vcpkg 통합

[dependencies]
# FFI는 std에 포함
```

#### 1.2 build.rs (Windows 전용)

**`freerdp3-sys/build.rs`**:
```rust
use std::env;
use std::path::PathBuf;

fn main() {
    println!("cargo:rerun-if-changed=wrapper.h");

    // 1. vcpkg로 FreeRDP 찾기
    let freerdp = vcpkg::Config::new()
        .emit_includes(true)
        .find_package("freerdp")
        .expect("FreeRDP not found. Run: vcpkg install freerdp:x64-windows");

    // 2. FreeRDP 라이브러리 링크
    println!("cargo:rustc-link-lib=freerdp3");
    println!("cargo:rustc-link-lib=freerdp-client3");
    println!("cargo:rustc-link-lib=winpr3");

    // 3. Include paths 수집
    let mut clang_args = Vec::new();
    for path in &freerdp.include_paths {
        clang_args.push(format!("-I{}", path.display()));
    }

    // 4. bindgen 설정
    let bindings = bindgen::Builder::default()
        .header("wrapper.h")
        .clang_args(&clang_args)
        
        // 핵심 타입들
        .allowlist_type("freerdp")
        .allowlist_type("rdpContext")
        .allowlist_type("rdpSettings")
        .allowlist_type("rdpGdi")
        .allowlist_type("rdpChannels")
        
        // 핵심 함수들
        .allowlist_function("freerdp_.*")
        .allowlist_function("rdp_.*")
        .allowlist_function("gdi_.*")
        
        // 가상 채널 관련
        .allowlist_function("cliprdr_.*")
        .allowlist_function("rdpsnd_.*")
        .allowlist_function("rdpdr_.*")
        .allowlist_function("drdynvc_.*")
        
        // 입력 관련
        .allowlist_function("freerdp_input_.*")
        
        // 상수들
        .allowlist_var("FREERDP_.*")
        .allowlist_var("RDP_.*")
        .allowlist_var("PTR_FLAGS_.*")
        .allowlist_var("KBD_FLAGS_.*")
        
        // 불필요한 타입 제외
        .blocklist_type("^__.*")
        .blocklist_type("^_.*")
        
        // Rust 코드 스타일
        .derive_default(true)
        .derive_debug(true)
        .derive_eq(true)
        .derive_hash(true)
        
        // 함수 포인터를 Option으로
        .wrap_unsafe_ops(true)
        
        .parse_callbacks(Box::new(bindgen::CargoCallbacks::new()))
        .generate()
        .expect("Unable to generate bindings");

    // 5. bindings.rs 생성
    let out_path = PathBuf::from(env::var("OUT_DIR").unwrap());
    bindings
        .write_to_file(out_path.join("bindings.rs"))
        .expect("Couldn't write bindings!");

    println!("cargo:warning=FreeRDP bindings generated successfully");
}
```

#### 1.3 wrapper.h (모든 기능 포함)

**`freerdp3-sys/wrapper.h`**:
```c
// Core FreeRDP
#include <freerdp/freerdp.h>
#include <freerdp/client.h>
#include <freerdp/client/cmdline.h>
#include <freerdp/client/channels.h>
#include <freerdp/channels/channels.h>

// Graphics
#include <freerdp/gdi/gdi.h>
#include <freerdp/graphics.h>
#include <freerdp/codec/color.h>
#include <freerdp/codec/bitmap.h>
#include <freerdp/codec/rfx.h>     // RemoteFX
#include <freerdp/codec/h264.h>    // H.264

// Input
#include <freerdp/input.h>
#include <freerdp/scancode.h>

// Virtual Channels
#include <freerdp/client/cliprdr.h>    // 클립보드
#include <freerdp/client/rdpei.h>      // 터치 입력
#include <freerdp/client/rdpgfx.h>     // 그래픽 파이프라인
#include <freerdp/channels/cliprdr.h>
#include <freerdp/channels/rdpsnd.h>   // 오디오 출력
#include <freerdp/channels/audin.h>    // 오디오 입력
#include <freerdp/channels/rdpdr.h>    // 드라이브 리디렉션
#include <freerdp/channels/drdynvc.h>  // 동적 가상 채널

// Security
#include <freerdp/crypto/crypto.h>
#include <freerdp/crypto/tls.h>

// Utilities
#include <freerdp/settings.h>
#include <freerdp/update.h>
#include <freerdp/rail.h>              // RemoteApp
#include <freerdp/window.h>

// WinPR (Windows Portable Runtime)
#include <winpr/wtypes.h>
#include <winpr/wlog.h>
```

#### 1.4 lib.rs

**`freerdp3-sys/src/lib.rs`**:
```rust
#![allow(non_upper_case_globals)]
#![allow(non_camel_case_types)]
#![allow(non_snake_case)]
#![allow(improper_ctypes)]

// bindgen이 생성한 바인딩 포함
include!(concat!(env!("OUT_DIR"), "/bindings.rs"));

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_freerdp_new() {
        unsafe {
            let instance = freerdp_new();
            assert!(!instance.is_null());
            freerdp_free(instance);
        }
    }

    #[test]
    fn test_version() {
        // FreeRDP 버전 확인 (컴파일 타임)
        println!("FreeRDP version: {}.{}.{}", 
                 FREERDP_VERSION_MAJOR,
                 FREERDP_VERSION_MINOR,
                 FREERDP_VERSION_REVISION);
    }
}
```

**빌드 테스트**:
```powershell
cd freerdp3-sys
cargo build --release
cargo test
```

---

### Phase 2: freerdp3 (High-level Safe Wrapper) 구현 (5~7일)

#### 2.1 모듈 구조

**`freerdp3/Cargo.toml`**:
```toml
[package]
name = "freerdp3"
version.workspace = true
edition.workspace = true
license.workspace = true
authors.workspace = true
repository.workspace = true

description = "Safe, high-level Rust bindings to FreeRDP"
keywords.workspace = true
categories.workspace = true
readme = "../README.md"

[dependencies]
freerdp3-sys = { path = "../freerdp3-sys", version = "0.1.0" }
thiserror = "2.0"
log = "0.4"
tokio = { version = "1", features = ["sync", "rt"] }
parking_lot = "0.12"  # 빠른 Mutex
base64 = "0.22"

[dev-dependencies]
tokio = { version = "1", features = ["full", "test-util"] }
env_logger = "0.11"
```

**`freerdp3/src/lib.rs`**:
```rust
//! # FreeRDP3 - Safe Rust Bindings to FreeRDP
//! 
//! This crate provides safe, high-level Rust bindings to the FreeRDP library,
//! enabling you to create RDP clients in Rust with all FreeRDP features.
//! 
//! ## Features
//! - Full RDP protocol support (screen, input, audio, clipboard, etc.)
//! - RemoteFX and H.264 hardware acceleration
//! - Multi-monitor support
//! - RDP Gateway
//! - Safe, idiomatic Rust API
//! 
//! ## Example
//! ```no_run
//! use freerdp3::{RdpClient, RdpSettings, RdpEvent};
//! 
//! let settings = RdpSettings::new("192.168.1.100")
//!     .username("admin")
//!     .password("password")
//!     .resolution(1920, 1080);
//! 
//! let client = RdpClient::new(settings, |event| {
//!     match event {
//!         RdpEvent::Connected => println!("Connected!"),
//!         RdpEvent::Bitmap(bmp) => { /* render frame */ },
//!         _ => {}
//!     }
//! }).unwrap();
//! 
//! client.connect().unwrap();
//! ```

mod client;
mod settings;
mod events;
mod error;
mod channels;

pub use client::RdpClient;
pub use settings::{RdpSettings, AudioMode, ColorDepth};
pub use events::{RdpEvent, BitmapUpdate, AudioSample, ClipboardData};
pub use error::{RdpError, Result};

// Re-export channel APIs
pub use channels::{
    Clipboard,
    AudioOutput,
    AudioInput,
    DriveRedirection,
};
```

#### 2.2 Settings (완전한 설정 API)

**`freerdp3/src/settings.rs`**:
```rust
use std::ffi::{CString, c_char};
use freerdp3_sys::*;

#[derive(Debug, Clone)]
pub struct RdpSettings {
    // 기본 연결
    pub hostname: String,
    pub port: u16,
    pub username: Option<String>,
    pub password: Option<String>,
    pub domain: Option<String>,

    // 디스플레이
    pub width: u32,
    pub height: u32,
    pub color_depth: ColorDepth,
    pub use_multimon: bool,

    // 성능
    pub enable_compression: bool,
    pub enable_desktop_composition: bool,
    pub enable_font_smoothing: bool,
    pub enable_wallpaper: bool,
    pub enable_theming: bool,
    pub enable_menu_animations: bool,

    // 코덱
    pub enable_remotefx: bool,
    pub enable_h264: bool,
    pub gfx_progressive: bool,

    // 보안
    pub enable_nla: bool,
    pub enable_tls: bool,
    pub ignore_certificate: bool,

    // 채널
    pub enable_clipboard: bool,
    pub enable_audio_output: bool,
    pub enable_audio_input: bool,
    pub enable_printer: bool,
    pub redirect_drives: Vec<String>,

    // 게이트웨이
    pub gateway_hostname: Option<String>,
    pub gateway_username: Option<String>,
    pub gateway_password: Option<String>,

    // RemoteApp
    pub remote_app_program: Option<String>,
    pub remote_app_work_dir: Option<String>,
}

#[derive(Debug, Clone, Copy)]
pub enum ColorDepth {
    Depth8 = 8,
    Depth15 = 15,
    Depth16 = 16,
    Depth24 = 24,
    Depth32 = 32,
}

impl Default for RdpSettings {
    fn default() -> Self {
        Self {
            hostname: String::new(),
            port: 3389,
            username: None,
            password: None,
            domain: None,
            width: 1920,
            height: 1080,
            color_depth: ColorDepth::Depth32,
            use_multimon: false,
            enable_compression: true,
            enable_desktop_composition: true,
            enable_font_smoothing: true,
            enable_wallpaper: false,  // 성능을 위해 기본 off
            enable_theming: true,
            enable_menu_animations: false,
            enable_remotefx: true,
            enable_h264: true,
            gfx_progressive: true,
            enable_nla: true,
            enable_tls: true,
            ignore_certificate: false,
            enable_clipboard: true,
            enable_audio_output: true,
            enable_audio_input: false,
            enable_printer: false,
            redirect_drives: Vec::new(),
            gateway_hostname: None,
            gateway_username: None,
            gateway_password: None,
            remote_app_program: None,
            remote_app_work_dir: None,
        }
    }
}

impl RdpSettings {
    pub fn new(hostname: impl Into<String>) -> Self {
        Self {
            hostname: hostname.into(),
            ..Default::default()
        }
    }

    // Builder pattern
    pub fn username(mut self, username: impl Into<String>) -> Self {
        self.username = Some(username.into());
        self
    }

    pub fn password(mut self, password: impl Into<String>) -> Self {
        self.password = Some(password.into());
        self
    }

    pub fn domain(mut self, domain: impl Into<String>) -> Self {
        self.domain = Some(domain.into());
        self
    }

    pub fn resolution(mut self, width: u32, height: u32) -> Self {
        self.width = width;
        self.height = height;
        self
    }

    pub fn enable_multimon(mut self) -> Self {
        self.use_multimon = true;
        self
    }

    pub fn redirect_drive(mut self, path: impl Into<String>) -> Self {
        self.redirect_drives.push(path.into());
        self
    }

    pub fn with_gateway(mut self, host: impl Into<String>) -> Self {
        self.gateway_hostname = Some(host.into());
        self
    }

    pub fn remote_app(mut self, program: impl Into<String>) -> Self {
        self.remote_app_program = Some(program.into());
        self
    }

    /// FreeRDP rdpSettings에 적용
    pub(crate) unsafe fn apply_to_freerdp(&self, settings: *mut rdpSettings) {
        // Helper function
        fn set_string(settings: *mut rdpSettings, id: u32, value: &str) {
            unsafe {
                let c_str = CString::new(value).unwrap();
                freerdp_settings_set_string(settings, id as usize, c_str.as_ptr());
            }
        }

        fn set_u32(settings: *mut rdpSettings, id: u32, value: u32) {
            unsafe {
                freerdp_settings_set_uint32(settings, id as usize, value);
            }
        }

        fn set_bool(settings: *mut rdpSettings, id: u32, value: bool) {
            unsafe {
                freerdp_settings_set_bool(settings, id as usize, if value { 1 } else { 0 });
            }
        }

        // 기본 연결
        set_string(settings, FreeRDP_ServerHostname, &self.hostname);
        set_u32(settings, FreeRDP_ServerPort, self.port as u32);
        
        if let Some(ref user) = self.username {
            set_string(settings, FreeRDP_Username, user);
        }
        if let Some(ref pass) = self.password {
            set_string(settings, FreeRDP_Password, pass);
        }
        if let Some(ref domain) = self.domain {
            set_string(settings, FreeRDP_Domain, domain);
        }

        // 디스플레이
        set_u32(settings, FreeRDP_DesktopWidth, self.width);
        set_u32(settings, FreeRDP_DesktopHeight, self.height);
        set_u32(settings, FreeRDP_ColorDepth, self.color_depth as u32);
        set_bool(settings, FreeRDP_UseMultimon, self.use_multimon);

        // 성능 플래그
        set_bool(settings, FreeRDP_CompressionEnabled, self.enable_compression);
        set_bool(settings, FreeRDP_AllowDesktopComposition, self.enable_desktop_composition);
        set_bool(settings, FreeRDP_AllowFontSmoothing, self.enable_font_smoothing);
        set_bool(settings, FreeRDP_DisableWallpaper, !self.enable_wallpaper);
        set_bool(settings, FreeRDP_DisableFullWindowDrag, !self.enable_menu_animations);

        // 코덱
        set_bool(settings, FreeRDP_RemoteFxCodec, self.enable_remotefx);
        set_bool(settings, FreeRDP_NSCodec, self.enable_remotefx);
        set_bool(settings, FreeRDP_GfxH264, self.enable_h264);
        set_bool(settings, FreeRDP_GfxProgressive, self.gfx_progressive);

        // 보안
        set_bool(settings, FreeRDP_NlaSecurity, self.enable_nla);
        set_bool(settings, FreeRDP_TlsSecurity, self.enable_tls);
        set_bool(settings, FreeRDP_IgnoreCertificate, self.ignore_certificate);

        // 채널
        set_bool(settings, FreeRDP_RedirectClipboard, self.enable_clipboard);
        set_bool(settings, FreeRDP_AudioPlayback, self.enable_audio_output);
        set_bool(settings, FreeRDP_AudioCapture, self.enable_audio_input);
        set_bool(settings, FreeRDP_RedirectPrinters, self.enable_printer);

        // 드라이브 리디렉션
        if !self.redirect_drives.is_empty() {
            set_bool(settings, FreeRDP_RedirectDrives, true);
            // TODO: 개별 드라이브 설정
        }

        // 게이트웨이
        if let Some(ref gw_host) = self.gateway_hostname {
            set_bool(settings, FreeRDP_GatewayEnabled, true);
            set_string(settings, FreeRDP_GatewayHostname, gw_host);
            
            if let Some(ref gw_user) = self.gateway_username {
                set_string(settings, FreeRDP_GatewayUsername, gw_user);
            }
            if let Some(ref gw_pass) = self.gateway_password {
                set_string(settings, FreeRDP_GatewayPassword, gw_pass);
            }
        }

        // RemoteApp
        if let Some(ref program) = self.remote_app_program {
            set_bool(settings, FreeRDP_RemoteApplicationMode, true);
            set_string(settings, FreeRDP_RemoteApplicationProgram, program);
            
            if let Some(ref workdir) = self.remote_app_work_dir {
                set_string(settings, FreeRDP_RemoteApplicationWorkingDir, workdir);
            }
        }
    }
}
```

#### 2.3 Events (모든 이벤트 타입)

**`freerdp3/src/events.rs`**:
```rust
#[derive(Debug, Clone)]
pub enum RdpEvent {
    /// 연결 성공
    Connected,
    /// 연결 해제
    Disconnected,
    /// 오류 발생
    Error(String),
    
    /// 화면 업데이트
    Bitmap(BitmapUpdate),
    /// 포인터 업데이트
    Pointer(PointerUpdate),
    
    /// 클립보드 데이터 수신
    ClipboardReceived(ClipboardData),
    /// 오디오 샘플 수신
    AudioSample(AudioSample),
    
    /// 파일 전송 요청
    FileTransferRequest { filename: String, size: u64 },
    /// 파일 전송 진행률
    FileTransferProgress { filename: String, bytes_transferred: u64, total_bytes: u64 },
}

#[derive(Debug, Clone)]
pub struct BitmapUpdate {
    pub x: u32,
    pub y: u32,
    pub width: u32,
    pub height: u32,
    /// RGBA8888 format
    pub data: Vec<u8>,
}

#[derive(Debug, Clone)]
pub struct PointerUpdate {
    pub x: u32,
    pub y: u32,
    pub cursor_data: Option<Vec<u8>>,  // RGBA 커서 이미지
}

#[derive(Debug, Clone)]
pub enum ClipboardData {
    Text(String),
    Image(Vec<u8>),  // PNG/JPEG
    Files(Vec<String>),
}

#[derive(Debug, Clone)]
pub struct AudioSample {
    /// PCM samples (f32)
    pub samples: Vec<f32>,
    pub sample_rate: u32,
    pub channels: u8,
}

#[derive(Debug, Clone)]
pub enum InputEvent {
    MouseMove { x: u32, y: u32 },
    MouseButton { button: MouseButton, pressed: bool },
    MouseWheel { delta: i16 },
    KeyPress { scancode: u32, pressed: bool },
    UnicodeKey { char: char },
}

#[derive(Debug, Clone, Copy)]
pub enum MouseButton {
    Left,
    Right,
    Middle,
}
```

#### 2.4 Client (핵심 API)

**`freerdp3/src/client.rs`** (일부):
```rust
use parking_lot::Mutex;
use std::sync::Arc;
use std::ffi::c_void;
use freerdp3_sys::*;
use crate::{RdpSettings, RdpEvent, RdpError, Result, InputEvent};

pub struct RdpClient {
    instance: *mut freerdp,
    context: Arc<ClientContext>,
    running: Arc<Mutex<bool>>,
}

struct ClientContext {
    event_callback: Mutex<Box<dyn FnMut(RdpEvent) + Send>>,
}

impl RdpClient {
    pub fn new<F>(settings: RdpSettings, event_callback: F) -> Result<Self>
    where
        F: FnMut(RdpEvent) + Send + 'static,
    {
        unsafe {
            // FreeRDP 인스턴스 생성
            let instance = freerdp_new();
            if instance.is_null() {
                return Err(RdpError::Init("Failed to create FreeRDP instance".into()));
            }

            // Context 생성
            if freerdp_context_new(instance) == 0 {
                freerdp_free(instance);
                return Err(RdpError::Init("Failed to create context".into()));
            }

            // Settings 적용
            settings.apply_to_freerdp((*instance).settings);

            // Callback context 설정
            let context = Arc::new(ClientContext {
                event_callback: Mutex::new(Box::new(event_callback)),
            });

            let rdp_context = (*instance).context;
            (*rdp_context).custom = Arc::into_raw(context.clone()) as *mut c_void;

            // FreeRDP 콜백 등록
            (*instance).PreConnect = Some(Self::pre_connect_callback);
            (*instance).PostConnect = Some(Self::post_connect_callback);
            (*instance).PostDisconnect = Some(Self::post_disconnect_callback);

            // Update 콜백
            let update = (*instance).update;
            (*update).BeginPaint = Some(Self::begin_paint_callback);
            (*update).EndPaint = Some(Self::end_paint_callback);
            (*update).SetPointer = Some(Self::set_pointer_callback);

            Ok(Self {
                instance,
                context,
                running: Arc::new(Mutex::new(false)),
            })
        }
    }

    pub fn connect(&mut self) -> Result<()> {
        unsafe {
            *self.running.lock() = true;

            if freerdp_connect(self.instance) == 0 {
                return Err(RdpError::Connection("Failed to connect".into()));
            }

            Ok(())
        }
    }

    pub fn disconnect(&mut self) -> Result<()> {
        unsafe {
            *self.running.lock() = false;

            if freerdp_disconnect(self.instance) == 0 {
                return Err(RdpError::Disconnection("Failed to disconnect".into()));
            }

            Ok(())
        }
    }

    pub fn send_input(&mut self, event: InputEvent) -> Result<()> {
        unsafe {
            let input = (*self.instance).input;
            
            match event {
                InputEvent::MouseMove { x, y } => {
                    freerdp_input_send_mouse_event(
                        input,
                        PTR_FLAGS_MOVE as u16,
                        x as u16,
                        y as u16
                    );
                }
                InputEvent::MouseButton { button, pressed } => {
                    let flags = match (button, pressed) {
                        (crate::events::MouseButton::Left, true) => PTR_FLAGS_DOWN | PTR_FLAGS_BUTTON1,
                        (crate::events::MouseButton::Left, false) => PTR_FLAGS_BUTTON1,
                        (crate::events::MouseButton::Right, true) => PTR_FLAGS_DOWN | PTR_FLAGS_BUTTON2,
                        (crate::events::MouseButton::Right, false) => PTR_FLAGS_BUTTON2,
                        _ => return Ok(()),
                    };
                    freerdp_input_send_mouse_event(input, flags as u16, 0, 0);
                }
                InputEvent::KeyPress { scancode, pressed } => {
                    let flags = if pressed {
                        KBD_FLAGS_DOWN
                    } else {
                        KBD_FLAGS_RELEASE
                    };
                    freerdp_input_send_keyboard_event(input, flags as u16, scancode as u8);
                }
                _ => {}
            }

            Ok(())
        }
    }

    // FreeRDP 콜백 구현
    unsafe extern "C" fn pre_connect_callback(instance: *mut freerdp) -> BOOL {
        // Channels 등록
        1
    }

    unsafe extern "C" fn post_connect_callback(instance: *mut freerdp) -> BOOL {
        let context_ptr = (*(*instance).context).custom as *const ClientContext;
        if !context_ptr.is_null() {
            let context = &*context_ptr;
            context.event_callback.lock()(RdpEvent::Connected);
        }

        // GDI 초기화
        gdi_init(instance, PIXEL_FORMAT_BGRA32);

        1
    }

    unsafe extern "C" fn post_disconnect_callback(instance: *mut freerdp) {
        let context_ptr = (*(*instance).context).custom as *const ClientContext;
        if !context_ptr.is_null() {
            let context = &*context_ptr;
            context.event_callback.lock()(RdpEvent::Disconnected);
        }

        gdi_free(instance);
    }

    unsafe extern "C" fn begin_paint_callback(context: *mut rdpContext) -> BOOL {
        1
    }

    unsafe extern "C" fn end_paint_callback(context: *mut rdpContext) -> BOOL {
        // GDI 버퍼에서 비트맵 추출
        let instance = (*context).instance;
        let gdi = (*context).gdi;
        
        if gdi.is_null() {
            return 1;
        }

        let primary = (*gdi).primary;
        let width = (*gdi).width as u32;
        let height = (*gdi).height as u32;
        
        let bitmap_data = (*primary).hdc; // HGDI_DC
        // TODO: 비트맵 데이터 복사 및 이벤트 발행

        let client_context = (*context).custom as *const ClientContext;
        if !client_context.is_null() {
            // RGBA 데이터로 변환하여 이벤트 발행
            // context.event_callback.lock()(RdpEvent::Bitmap(...));
        }

        1
    }

    unsafe extern "C" fn set_pointer_callback(
        context: *mut rdpContext,
        pointer: *const rdpPointer
    ) -> BOOL {
        // 포인터 업데이트
        1
    }
}

impl Drop for RdpClient {
    fn drop(&mut self) {
        unsafe {
            if !self.instance.is_null() {
                // Context의 custom 포인터 복원 및 해제
                let context_ptr = (*(*self.instance).context).custom as *const ClientContext;
                if !context_ptr.is_null() {
                    Arc::from_raw(context_ptr);
                }

                freerdp_context_free(self.instance);
                freerdp_free(self.instance);
            }
        }
    }
}

unsafe impl Send for RdpClient {}
```

#### 2.5 Virtual Channels (클립보드, 오디오 등)

**`freerdp3/src/channels/cliprdr.rs`**:
```rust
use freerdp3_sys::*;
use crate::{ClipboardData, Result};

pub struct Clipboard {
    // Channel handle
}

impl Clipboard {
    pub fn send_text(&mut self, text: &str) -> Result<()> {
        // cliprdr API 사용
        Ok(())
    }

    pub fn send_image(&mut self, image_data: &[u8]) -> Result<()> {
        Ok(())
    }
}
```

---

### Phase 3: 예제 및 문서화 (2~3일)

#### 3.1 Examples

**`examples/simple_connect.rs`**:
```rust
use freerdp3::{RdpClient, RdpSettings, RdpEvent};
use std::time::Duration;

fn main() {
    env_logger::init();

    let settings = RdpSettings::new("192.168.1.100")
        .username("Administrator")
        .password("Password123")
        .resolution(1280, 720);

    let mut client = RdpClient::new(settings, |event| {
        match event {
            RdpEvent::Connected => println!("✅ Connected!"),
            RdpEvent::Disconnected => println!("❌ Disconnected"),
            RdpEvent::Bitmap(bmp) => {
                println!("📺 Frame: {}×{} at ({}, {})", 
                         bmp.width, bmp.height, bmp.x, bmp.y);
            }
            _ => {}
        }
    }).expect("Failed to create client");

    client.connect().expect("Failed to connect");

    // 60초 동안 실행
    std::thread::sleep(Duration::from_secs(60));

    client.disconnect().expect("Failed to disconnect");
}
```

#### 3.2 README.md

**`README.md`**:
```markdown
# FreeRDP3 - Rust Bindings to FreeRDP

Safe, high-level Rust bindings to the FreeRDP library.

## Features

- ✅ Full RDP protocol support
- ✅ RemoteFX and H.264 hardware acceleration
- ✅ Multi-monitor support
- ✅ Clipboard sharing
- ✅ Audio input/output
- ✅ Drive redirection
- ✅ RDP Gateway
- ✅ RemoteApp

## Installation

### Prerequisites (Windows)

1. Install Visual Studio Build Tools
2. Install vcpkg:
   ```powershell
   git clone https://github.com/microsoft/vcpkg C:\vcpkg
   C:\vcpkg\bootstrap-vcpkg.bat
   C:\vcpkg\vcpkg install freerdp:x64-windows
   ```

### Add to Cargo.toml

```toml
[dependencies]
freerdp3 = "0.1.0"
```

## Quick Start

```rust
use freerdp3::{RdpClient, RdpSettings, RdpEvent};

let settings = RdpSettings::new("192.168.1.100")
    .username("user")
    .password("pass")
    .resolution(1920, 1080);

let client = RdpClient::new(settings, |event| {
    match event {
        RdpEvent::Connected => println!("Connected!"),
        RdpEvent::Bitmap(bmp) => { /* Render frame */ },
        _ => {}
    }
}).unwrap();

client.connect().unwrap();
```

## License

MIT OR Apache-2.0
```

---

### Phase 4: crates.io 배포 (1일)

#### 4.1 배포 전 체크리스트

```powershell
# 1. 버전 확인
# Cargo.toml의 모든 version 필드 확인

# 2. 문서 생성 테스트
cargo doc --no-deps --open

# 3. 테스트 실행
cargo test --all

# 4. 빌드 확인
cargo build --release --all

# 5. 패키지 확인
cargo package --allow-dirty
```

#### 4.2 crates.io 계정 설정

```powershell
# 1. crates.io 계정 생성
# https://crates.io/ 접속 → GitHub으로 로그인

# 2. API 토큰 생성
# https://crates.io/settings/tokens → New Token

# 3. Cargo 로그인
cargo login [your-api-token]
# 토큰은 %USERPROFILE%\.cargo\credentials.toml에 저장됨
```

#### 4.3 배포 순서

**Step 1: freerdp3-sys 배포**
```powershell
cd freerdp3-sys

# 패키지 검증
cargo package

# 배포 (dry-run)
cargo publish --dry-run

# 실제 배포
cargo publish

# 배포 확인
# https://crates.io/crates/freerdp3-sys 접속
```

**Step 2: freerdp3 배포**
```powershell
cd ..\freerdp3

# freerdp3-sys가 배포됨을 확인 후
# Cargo.toml에서 path 의존성을 버전 의존성으로 변경
# freerdp3-sys = { path = "../freerdp3-sys" }
# → freerdp3-sys = "0.1.0"

# 패키지 검증
cargo package

# 배포 (dry-run)
cargo publish --dry-run

# 실제 배포
cargo publish
```

#### 4.4 배포 후 확인

```powershell
# 1. crates.io에서 확인
# https://crates.io/crates/freerdp3

# 2. 다른 프로젝트에서 테스트
mkdir test-freerdp3
cd test-freerdp3
cargo init

# Cargo.toml
[dependencies]
freerdp3 = "0.1.0"

# 빌드 테스트
cargo build
```

#### 4.5 버전 관리

**Semantic Versioning 규칙**:
- `0.1.0`: 초기 배포
- `0.1.1`: 버그 수정
- `0.2.0`: 새 기능 추가 (하위 호환)
- `1.0.0`: Stable API

**업데이트 배포**:
```powershell
# 1. 버전 업데이트
# Cargo.toml에서 version = "0.1.1"

# 2. CHANGELOG.md 작성
@"
# Changelog

## [0.1.1] - 2025-XX-XX
### Fixed
- Fixed clipboard crash
- Improved error handling

## [0.1.0] - 2025-XX-XX
### Added
- Initial release
"@ | Out-File -FilePath CHANGELOG.md -Encoding UTF8

# 3. Git tag
git tag v0.1.1
git push origin v0.1.1

# 4. 재배포
cargo publish
```

---

## 🎯 Rusterm 통합 (2~3일)

**`rusterm/src-tauri/Cargo.toml`**:
```toml
[dependencies]
freerdp3 = "0.1.0"
```

**`rusterm/src-tauri/src/rdp/manager.rs`**:
```rust
use freerdp3::{RdpClient, RdpSettings, RdpEvent};
use tauri::{AppHandle, Emitter};
use parking_lot::Mutex;
use std::sync::Arc;
use std::collections::HashMap;

pub struct RdpManager {
    sessions: Arc<Mutex<HashMap<String, RdpClient>>>,
}

impl RdpManager {
    pub fn new() -> Self {
        Self {
            sessions: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub fn connect(
        &self,
        session_id: String,
        host: String,
        username: String,
        password: String,
        app_handle: AppHandle,
    ) -> Result<(), String> {
        let settings = RdpSettings::new(host)
            .username(username)
            .password(password)
            .resolution(1920, 1080)
            .enable_multimon();

        let sid = session_id.clone();
        let client = RdpClient::new(settings, move |event| {
            match event {
                RdpEvent::Bitmap(bmp) => {
                    let base64 = base64::encode(&bmp.data);
                    app_handle.emit(&format!("rdp:frame:{}", sid), serde_json::json!({
                        "x": bmp.x,
                        "y": bmp.y,
                        "width": bmp.width,
                        "height": bmp.height,
                        "data": base64,
                    })).ok();
                }
                RdpEvent::ClipboardReceived(data) => {
                    // 클립보드 이벤트 전달
                }
                _ => {}
            }
        }).map_err(|e| e.to_string())?;

        self.sessions.lock().insert(session_id, client);
        Ok(())
    }
}
```

---

## 📝 전체 개발 일정 요약

| Phase | 작업 내용 | 예상 기간 |
|-------|----------|-----------|
| 0 | Windows 환경 설정 | 1일 |
| 1 | freerdp3-sys (FFI) | 3~4일 |
| 2 | freerdp3 (Safe API) | 5~7일 |
| 3 | 예제 및 문서 | 2~3일 |
| 4 | crates.io 배포 | 1일 |
| 5 | Rusterm 통합 | 2~3일 |

**총 예상 기간**: 약 3주

---

## ✅ 최종 체크리스트

### 개발 완료 기준
- [ ] FreeRDP 3.0 설치 및 빌드 성공
- [ ] `freerdp3-sys` crates.io 배포
- [ ] `freerdp3` crates.io 배포
- [ ] 모든 예제 실행 확인
- [ ] 문서 (README, API docs) 작성
- [ ] CI/CD 설정 (GitHub Actions)
- [ ] Rusterm 통합 완료

### 지원 기능 확인
- [ ] 기본 RDP 연결
- [ ] 화면 출력 (RemoteFX, H.264)
- [ ] 마우스/키보드 입력
- [ ] 클립보드 공유
- [ ] 오디오 출력
- [ ] 오디오 입력
- [ ] 드라이브 리디렉션
- [ ] RDP Gateway
- [ ] 다중 모니터

---

## 🚀 시작하기

지금 바로 시작할 수 있습니다!

```powershell
# Step 1: vcpkg 설치
git clone https://github.com/microsoft/vcpkg C:\vcpkg
C:\vcpkg\bootstrap-vcpkg.bat

# Step 2: FreeRDP 설치
C:\vcpkg\vcpkg install freerdp:x64-windows

# Step 3: 프로젝트 생성
mkdir D:\freerdp3-rs
cd D:\freerdp3-rs
cargo init --lib freerdp3-sys
cargo init --lib freerdp3

# 준비 완료!
```

**이제 Phase 1부터 시작하시겠습니까?** 🎯
