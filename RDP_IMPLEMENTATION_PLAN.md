# RDP 프로토콜 직접 구현 계획서

## 📋 프로젝트 개요

**목표**: Microsoft의 RDP (Remote Desktop Protocol) 프로토콜을 Rust로 직접 구현하여, Windows의 `mstsc.exe`처럼 표준 RDP 서버에 접속할 수 있는 클라이언트를 만듭니다.

**중요**: IronRDP 같은 기존 라이브러리를 사용하지 않고, RDP 프로토콜 스펙을 직접 구현합니다.

### 왜 이렇게 하는가?
- ✅ RDP 프로토콜의 내부 동작을 완전히 이해
- ✅ Windows의 기본 RDP 서버에 접속 (대상에 아무것도 설치 불필요)
- ✅ 필요한 기능만 선택적으로 구현 가능
- ✅ Rust의 안전성과 성능 활용

### 현실적인 난이도 평가
⚠️ **매우 어려움**: RDP는 Microsoft의 수십 년간 축적된 프로토콜로, 공식 스펙만 1000페이지가 넘습니다.
- **예상 개발 기간**: 최소 기능(화면 보기만) 2~3개월, 전체 기능 6개월~1년
- **필요 지식**: 네트워크 프로그래밍, 암호화, 이미지 코덱, 비동기 프로그래밍

---

## 🏗️ RDP 프로토콜 레이어 구조

RDP는 OSI 7계층 모델을 따르며, 여러 하위 프로토콜로 구성됩니다:

```
┌─────────────────────────────────────────┐
│   Application Data (화면, 입력, 오디오)  │
├─────────────────────────────────────────┤
│   RDP Virtual Channels (최대 64,000개)  │ ← 데이터 종류별 채널
├─────────────────────────────────────────┤
│   MCS (Multipoint Communication Service)│ ← 채널 관리
├─────────────────────────────────────────┤
│   X.224 (Connection-Oriented Protocol)  │ ← 연결 설정
├─────────────────────────────────────────┤
│   Security Layer (TLS/NLA/RC4)          │ ← 암호화 및 인증
├─────────────────────────────────────────┤
│   TCP (Port 3389)                        │ ← 전송
└─────────────────────────────────────────┘
```

---

## 📚 구현해야 할 핵심 컴포넌트

### 1. X.224 연결 계층
**역할**: RDP 연결의 초기 handshake를 담당합니다.

#### 패킷 구조
```rust
// src-tauri/src/rdp/x224.rs

/// X.224 Connection Request (CR) TPDU
#[derive(Debug)]
pub struct X224ConnectionRequest {
    /// 길이 (Length Indicator)
    pub length: u8,
    /// Type: 0xE0 = Connection Request
    pub pdu_type: u8,
    /// Destination Reference (항상 0)
    pub dst_ref: u16,
    /// Source Reference
    pub src_ref: u16,
    /// Class Option (0 = Class 0)
    pub class: u8,
    /// RDP Negotiation Request (Optional)
    pub rdp_neg_req: Option<RdpNegotiationRequest>,
}

impl X224ConnectionRequest {
    pub fn to_bytes(&self) -> Vec<u8> {
        let mut buffer = Vec::new();
        buffer.push(self.length);
        buffer.push(self.pdu_type);
        buffer.extend_from_slice(&self.dst_ref.to_be_bytes());
        buffer.extend_from_slice(&self.src_ref.to_be_bytes());
        buffer.push(self.class);
        
        if let Some(ref neg_req) = self.rdp_neg_req {
            buffer.extend_from_slice(&neg_req.to_bytes());
        }
        
        buffer
    }
}

/// RDP Negotiation Request (TYPE_RDP_NEG_REQ = 0x01)
#[derive(Debug)]
pub struct RdpNegotiationRequest {
    pub request_type: u8,  // 0x01
    pub flags: u8,
    pub length: u16,       // 항상 8
    pub requested_protocols: u32, // TLS=1, CredSSP=3
}
```

#### 사용 예시
```rust
pub async fn connect_x224(stream: &mut TcpStream) -> Result<(), String> {
    // 1. Connection Request 전송
    let cr = X224ConnectionRequest {
        length: 0x0b,
        pdu_type: 0xE0,
        dst_ref: 0,
        src_ref: 0x1234,
        class: 0,
        rdp_neg_req: Some(RdpNegotiationRequest {
            request_type: 0x01,
            flags: 0,
            length: 8,
            requested_protocols: 0x01, // TLS 요청
        }),
    };
    
    stream.write_all(&cr.to_bytes()).await
        .map_err(|e| e.to_string())?;
    
    // 2. Connection Confirm 수신
    let mut response = vec![0u8; 1024];
    let n = stream.read(&mut response).await
        .map_err(|e| e.to_string())?;
    
    // TODO: 응답 파싱
    
    Ok(())
}
```

---

### 2. MCS (Multipoint Communication Service) 계층
**역할**: 가상 채널을 생성하고 관리합니다.

#### 주요 PDU
```rust
// src-tauri/src/rdp/mcs.rs

/// MCS Connect Initial PDU
pub struct McsConnectInitial {
    pub calling_domain_selector: Vec<u8>,
    pub called_domain_selector: Vec<u8>,
    pub upward_flag: bool,
    pub target_parameters: DomainParameters,
    pub minimum_parameters: DomainParameters,
    pub maximum_parameters: DomainParameters,
    pub user_data: GccConferenceCreateRequest,
}

/// GCC Conference Create Request (포함된 사용자 데이터)
pub struct GccConferenceCreateRequest {
    pub core_data: ClientCoreData,
    pub security_data: ClientSecurityData,
    pub network_data: ClientNetworkData,
}

/// Client Core Data (해상도, 색상 등)
pub struct ClientCoreData {
    pub version: u32,           // 0x00080004 (RDP 5.0+)
    pub desktop_width: u16,     // 예: 1920
    pub desktop_height: u16,    // 예: 1080
    pub color_depth: u16,       // 0xCA01 = 32bpp
    pub keyboard_layout: u32,   // 0x00000412 = Korean
    pub client_build: u32,
    pub client_name: String,    // UTF-16LE, 32 bytes
    pub keyboard_type: u32,
    pub keyboard_subtype: u32,
    pub keyboard_function_key: u32,
}
```

#### BER (Basic Encoding Rules) 처리
MCS는 ASN.1 BER 인코딩을 사용합니다. 이것이 매우 복잡한 부분입니다.

```rust
// src-tauri/src/rdp/ber.rs

pub fn encode_ber_length(length: usize) -> Vec<u8> {
    if length < 0x80 {
        // Short form
        vec![length as u8]
    } else {
        // Long form
        let mut result = Vec::new();
        let bytes = length.to_be_bytes();
        let start = bytes.iter().position(|&b| b != 0).unwrap();
        let len_of_len = bytes.len() - start;
        
        result.push(0x80 | len_of_len as u8);
        result.extend_from_slice(&bytes[start..]);
        result
    }
}

pub fn decode_ber_length(data: &[u8]) -> Result<(usize, usize), String> {
    let first = data[0];
    
    if first & 0x80 == 0 {
        // Short form
        Ok((first as usize, 1))
    } else {
        // Long form
        let len_of_len = (first & 0x7F) as usize;
        if data.len() < 1 + len_of_len {
            return Err("Insufficient data".to_string());
        }
        
        let mut length = 0usize;
        for i in 0..len_of_len {
            length = (length << 8) | data[1 + i] as usize;
        }
        
        Ok((length, 1 + len_of_len))
    }
}
```

---

### 3. Security Layer (TLS & NLA)
**역할**: 연결을 암호화하고 사용자를 인증합니다.

#### TLS Handshake
```rust
// src-tauri/src/rdp/security.rs

use tokio_rustls::{TlsConnector, rustls};

pub async fn upgrade_to_tls(
    stream: TcpStream,
    server_name: &str
) -> Result<tokio_rustls::client::TlsStream<TcpStream>, String> {
    // 1. TLS 설정 (자체 서명 인증서 허용)
    let mut root_store = rustls::RootCertStore::empty();
    root_store.add_trust_anchors(
        webpki_roots::TLS_SERVER_ROOTS.iter().map(|ta| {
            rustls::OwnedTrustAnchor::from_subject_spki_name_constraints(
                ta.subject,
                ta.spki,
                ta.name_constraints,
            )
        })
    );
    
    let config = rustls::ClientConfig::builder()
        .with_safe_defaults()
        .with_root_certificates(root_store)
        .with_no_client_auth();
    
    let connector = TlsConnector::from(Arc::new(config));
    
    // 2. TLS 연결
    let domain = rustls::ServerName::try_from(server_name)
        .map_err(|e| format!("Invalid DNS name: {}", e))?;
    
    let tls_stream = connector.connect(domain, stream).await
        .map_err(|e| format!("TLS handshake failed: {}", e))?;
    
    Ok(tls_stream)
}
```

#### NLA (Network Level Authentication)
이 부분은 매우 복잡합니다. CredSSP 프로토콜 구현이 필요합니다.

```rust
// NLA는 NTLM 또는 Kerberos 인증을 사용
// 구현이 너무 복잡하여 초기 단계에서는 스킵 가능
// (TLS만 사용하고 NLA는 비활성화)
```

---

### 4. Graphics Pipeline (화면 수신)
**역할**: 서버가 보낸 화면 업데이트를 디코딩합니다.

#### Fast-Path Update
```rust
// src-tauri/src/rdp/fastpath.rs

#[derive(Debug)]
pub enum FastPathUpdate {
    Bitmap(BitmapUpdate),
    Palette(PaletteUpdate),
    PointerPosition(u16, u16),
    // ... 기타
}

pub struct BitmapUpdate {
    pub rectangles: Vec<BitmapRectangle>,
}

pub struct BitmapRectangle {
    pub dest_left: u16,
    pub dest_top: u16,
    pub dest_right: u16,
    pub dest_bottom: u16,
    pub width: u16,
    pub height: u16,
    pub bpp: u16,           // Bits per pixel
    pub flags: u16,
    pub bitmap_data: Vec<u8>, // 압축된 비트맵 데이터
}
```

#### Bitmap Decompression
RDP는 여러 압축 방식을 사용합니다:
- **RLE (Run-Length Encoding)**: 가장 기본
- **NSCodec**: 중간
- **RemoteFX**: 고성능
- **H.264**: 최신

```rust
// src-tauri/src/rdp/codec/rle.rs

/// RDP 6.0 Bitmap Compression (RLE)
pub fn decompress_bitmap_rle(
    compressed: &[u8],
    width: u16,
    height: u16,
    bpp: u16
) -> Result<Vec<u8>, String> {
    let bytes_per_pixel = (bpp / 8) as usize;
    let mut output = vec![0u8; (width as usize) * (height as usize) * bytes_per_pixel];
    
    let mut src_offset = 0;
    let mut dst_offset = 0;
    
    while src_offset < compressed.len() {
        let code = compressed[src_offset];
        src_offset += 1;
        
        if code == 0x00 {
            // Special codes
            // TODO: 구현
        } else if code & 0xC0 == 0xC0 {
            // Literal run
            let count = (code & 0x3F) as usize;
            output[dst_offset..dst_offset + count * bytes_per_pixel]
                .copy_from_slice(&compressed[src_offset..src_offset + count * bytes_per_pixel]);
            src_offset += count * bytes_per_pixel;
            dst_offset += count * bytes_per_pixel;
        } else {
            // Regular run
            let count = (code & 0x3F) as usize;
            let pixel = &compressed[src_offset..src_offset + bytes_per_pixel];
            for _ in 0..count {
                output[dst_offset..dst_offset + bytes_per_pixel].copy_from_slice(pixel);
                dst_offset += bytes_per_pixel;
            }
            src_offset += bytes_per_pixel;
        }
    }
    
    Ok(output)
}
```

---

### 5. Input PDUs (입력 전송)
**역할**: 마우스와 키보드 이벤트를 서버로 전송합니다.

```rust
// src-tauri/src/rdp/input.rs

#[derive(Debug)]
pub enum InputEvent {
    MouseEvent {
        flags: u16,
        x: u16,
        y: u16,
    },
    KeyboardEvent {
        flags: u16,
        keycode: u16,
    },
    SyncEvent {
        flags: u16,
    },
}

impl InputEvent {
    pub fn to_pdu(&self) -> Vec<u8> {
        match self {
            InputEvent::MouseEvent { flags, x, y } => {
                let mut pdu = Vec::new();
                pdu.extend_from_slice(&0x8001u16.to_le_bytes()); // Mouse event
                pdu.extend_from_slice(&flags.to_le_bytes());
                pdu.extend_from_slice(&x.to_le_bytes());
                pdu.extend_from_slice(&y.to_le_bytes());
                pdu
            }
            InputEvent::KeyboardEvent { flags, keycode } => {
                let mut pdu = Vec::new();
                pdu.extend_from_slice(&0x0004u16.to_le_bytes()); // Keyboard event
                pdu.extend_from_slice(&flags.to_le_bytes());
                pdu.extend_from_slice(&keycode.to_le_bytes());
                pdu.extend_from_slice(&0u16.to_le_bytes()); // Padding
                pdu
            }
            _ => Vec::new(),
        }
    }
}
```

---

## 🎯 단계별 구현 계획

### Phase 0: 기초 인프라 (1주)
**목표**: 프로젝트 구조 설계 및 기본 라이브러리 추가

```toml
[dependencies]
tokio = { version = "1", features = ["full"] }
tokio-rustls = "0.24"
webpki-roots = "0.25"
serde = { version = "1", features = ["derive"] }
byteorder = "1.5"
```

**모듈 구조**:
```
src-tauri/src/rdp/
├── mod.rs
├── x224.rs          # X.224 연결
├── mcs.rs           # MCS 계층
├── ber.rs           # BER 인코딩/디코딩
├── security.rs      # TLS/NLA
├── fastpath.rs      # Fast-Path 업데이트
├── codec/
│   ├── mod.rs
│   ├── rle.rs       # RLE 압축 해제
│   └── bitmap.rs    # 비트맵 처리
└── input.rs         # 입력 이벤트
```

---

### Phase 1: X.224 연결 (1~2주)
**목표**: TCP로 서버에 연결하고 X.224 handshake 성공

#### 구현 내용
1. `X224ConnectionRequest` 패킷 생성 및 전송
2. `X224ConnectionConfirm` 응답 파싱
3. TLS 협상 요청

#### 검증 방법
```rust
#[tauri::command]
pub async fn test_x224_connect(host: String) -> Result<String, String> {
    let mut stream = TcpStream::connect(format!("{}:3389", host))
        .await
        .map_err(|e| e.to_string())?;
    
    connect_x224(&mut stream).await?;
    
    Ok("X224 연결 성공!".to_string())
}
```

Wireshark로 패킷 확인:
```
Filter: tcp.port == 3389
Expected: CR TPDU (0xE0) → CC TPDU (0xD0)
```

---

### Phase 2: MCS 연결 (2~3주)
**목표**: MCS Connect Initial/Response 교환

⚠️ **가장 복잡한 부분**: BER 인코딩 때문에 버그가 많이 발생할 수 있음

#### 구현 내용
1. `McsConnectInitial` PDU 생성 (BER 인코딩)
2. `ClientCoreData`, `ClientSecurityData` 등 포함
3. `McsConnectResponse` 파싱

#### 디버깅 팁
- IronRDP 소스코드를 참고 (어떻게 인코딩하는지 확인)
- Wireshark의 RDP dissector로 패킷 검증

---

### Phase 3: TLS 및 채널 연결 (1~2주)
**목표**: 암호화된 연결 설정 및 가상 채널 생성

#### 구현 내용
1. TLS handshake
2. MCS Attach User Request/Confirm
3. MCS Channel Join (I/O 채널 등)

---

### Phase 4: Bitmap 디코딩 (2~3주)
**목표**: 화면 업데이트를 받아서 RGBA 버퍼로 변환

#### 구현 내용
1. Fast-Path Update 파싱
2. RLE Bitmap Decompression
3. Frame Buffer 관리

#### 테스트
```rust
#[tauri::command]
pub async fn start_rdp_session(host: String) -> Result<(), String> {
    // 연결, handshake, ...
    
    loop {
        let update = receive_fastpath_update(&mut stream).await?;
        
        match update {
            FastPathUpdate::Bitmap(bmp) => {
                let rgba = decompress_bitmap_rle(&bmp.data, ...)?;
                
                // Frontend로 전송
                app_handle.emit("rdp-frame", base64::encode(&rgba))?;
            }
            _ => {}
        }
    }
}
```

---

### Phase 5: 입력 전송 (1주)
**목표**: 마우스/키보드 이벤트를 서버로 전송

#### 구현 내용
```rust
#[tauri::command]
pub async fn send_rdp_input(event: InputEvent) -> Result<(), String> {
    let pdu = event.to_pdu();
    // Send via Fast-Path Input PDU
    Ok(())
}
```

---

### Phase 6: Frontend 통합 (1주)
**목표**: React에서 원격 화면 보고 조작하기

```typescript
// src/components/RdpViewer.tsx
export function RdpViewer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    listen<string>('rdp-frame', (event) => {
      const rgbaData = atob(event.payload);
      // Canvas에 그리기
    });
  }, []);
  
  // ... 입력 핸들러
}
```

---

## 📖 필수 참고 자료

### Microsoft 공식 문서
1. **[MS-RDPBCGR]** - Remote Desktop Protocol: Basic Connectivity and Graphics Remoting
   - URL: https://docs.microsoft.com/en-us/openspecs/windows_protocols/ms-rdpbcgr/
   - 핵심 스펙, 반드시 읽어야 함

2. **[MS-RDPEGDI]** - Remote Desktop Protocol: Graphics Device Interface (GDI)
   - Bitmap 압축 알고리즘

3. **[MS-RDPEI]** - Remote Desktop Protocol: Input Virtual Channel Extension
   - 입력 이벤트

### 오픈소스 참고
- **FreeRDP**: https://github.com/FreeRDP/FreeRDP
  - C로 구현된 완전한 RDP 클라이언트
  - 막혔을 때 코드 참고

---

## ⚠️ 현실적인 어려움 및 대안

### 예상되는 주요 문제점

#### 1. BER 인코딩의 복잡성
**문제**: ASN.1 BER은 배우기 어렵고 디버깅이 힘듭니다.
**대안**: `asn1` crate 사용 검토, 또는 IronRDP의 BER 부분만 참고

#### 2. Bitmap 압축 알고리즘
**문제**: RLE, NSCodec 등 구현이 복잡합니다.
**대안**: 초기에는 비압축 비트맵만 지원, 나중에 추가

#### 3. NLA 인증
**문제**: CredSSP, NTLM, Kerberos 구현은 엄청나게 복잡합니다.
**대안**: 서버 설정에서 NLA 비활성화하고 TLS만 사용

### 권장 사항
만약 3개월 안에 **실제로 작동하는** mstsc 대체품을 만들고 싶다면:
- **Option A**: IronRDP를 사용하되, 빌드 문제 해결에 집중
- **Option B**: FreeRDP를 Rust FFI로 바인딩

만약 **학습이 목표**라면:
- 이 계획서대로 진행하되, Phase 4까지만 목표로 설정 (화면 보기만)

---

## 📝 개발 순서 요약

| Phase | 내용 | 예상 기간 | 난이도 |
|-------|------|-----------|--------|
| 0 | 프로젝트 구조 | 1주 | ★☆☆☆☆ |
| 1 | X.224 연결 | 1~2주 | ★★☆☆☆ |
| 2 | MCS 연결 | 2~3주 | ★★★★☆ |
| 3 | TLS & 채널 | 1~2주 | ★★★☆☆ |
| 4 | Bitmap 디코딩 | 2~3주 | ★★★★☆ |
| 5 | 입력 전송 | 1주 | ★★☆☆☆ |
| 6 | Frontend 통합 | 1주 | ★★☆☆☆ |

**총 예상 기간**: 최소 2~3개월

---

## 🚀 시작하기

다음 중 선택해주세요:

1. **A안**: 이 계획대로 RDP를 직접 구현 시작 (Phase 0부터)
2. **B안**: IronRDP 빌드 문제 해결에 집중 (현실적)
3. **C안**: FreeRDP Rust 바인딩 만들기 (중간)

어느 방향으로 진행할까요?
