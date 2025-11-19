mod protocol;
mod server;
mod handler;
mod lifecycle;
mod platform;

pub use protocol::{IpcRequest, IpcResponse, IpcError};
pub use server::IpcServer;
