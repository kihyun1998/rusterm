use serde::Serialize;

/// 탭 생성 이벤트 페이로드
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TabCreatedPayload {
    pub tab_id: String,
    pub tab_type: String,  // "local" | "ssh"
    pub title: String,
    pub pty_id: Option<String>,
    pub session_id: Option<String>,
}

/// 탭 종료 이벤트 페이로드
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TabClosedPayload {
    pub tab_id: String,
}
