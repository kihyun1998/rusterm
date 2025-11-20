import 'dart:ffi';
import 'dart:io';
import 'dart:convert';
import 'package:ffi/ffi.dart';

// Windows API 상수
const int GENERIC_READ = 0x80000000;
const int GENERIC_WRITE = 0x40000000;
const int OPEN_EXISTING = 3;
const int FILE_ATTRIBUTE_NORMAL = 0x80;
const int INVALID_HANDLE_VALUE = -1;

// Windows API 함수 시그니처
typedef CreateFileNative = IntPtr Function(
  Pointer<Utf16> lpFileName,
  Uint32 dwDesiredAccess,
  Uint32 dwShareMode,
  Pointer dwSecurityAttributes,
  Uint32 dwCreationDisposition,
  Uint32 dwFlagsAndAttributes,
  IntPtr hTemplateFile,
);

typedef CreateFileDart = int Function(
  Pointer<Utf16> lpFileName,
  int dwDesiredAccess,
  int dwShareMode,
  Pointer dwSecurityAttributes,
  int dwCreationDisposition,
  int dwFlagsAndAttributes,
  int hTemplateFile,
);

typedef ReadFileNative = Int32 Function(
  IntPtr hFile,
  Pointer<Uint8> lpBuffer,
  Uint32 nNumberOfBytesToRead,
  Pointer<Uint32> lpNumberOfBytesRead,
  Pointer lpOverlapped,
);

typedef ReadFileDart = int Function(
  int hFile,
  Pointer<Uint8> lpBuffer,
  int nNumberOfBytesToRead,
  Pointer<Uint32> lpNumberOfBytesRead,
  Pointer lpOverlapped,
);

typedef WriteFileNative = Int32 Function(
  IntPtr hFile,
  Pointer<Uint8> lpBuffer,
  Uint32 nNumberOfBytesToWrite,
  Pointer<Uint32> lpNumberOfBytesWritten,
  Pointer lpOverlapped,
);

typedef WriteFileDart = int Function(
  int hFile,
  Pointer<Uint8> lpBuffer,
  int nNumberOfBytesToWrite,
  Pointer<Uint32> lpNumberOfBytesWritten,
  Pointer lpOverlapped,
);

typedef CloseHandleNative = Int32 Function(IntPtr hObject);
typedef CloseHandleDart = int Function(int hObject);

/// Windows Named Pipe IPC 연결
class WindowsNamedPipeConnection {
  int? _handle;
  final String pipeName;
  late final DynamicLibrary _kernel32;
  late final CreateFileDart _createFile;
  late final ReadFileDart _readFile;
  late final WriteFileDart _writeFile;
  late final CloseHandleDart _closeHandle;

  WindowsNamedPipeConnection(this.pipeName) {
    // kernel32.dll 로드
    _kernel32 = DynamicLibrary.open('kernel32.dll');

    // API 함수 로드
    _createFile = _kernel32
        .lookupFunction<CreateFileNative, CreateFileDart>('CreateFileW');
    _readFile = _kernel32.lookupFunction<ReadFileNative, ReadFileDart>('ReadFile');
    _writeFile = _kernel32.lookupFunction<WriteFileNative, WriteFileDart>('WriteFile');
    _closeHandle = _kernel32.lookupFunction<CloseHandleNative, CloseHandleDart>('CloseHandle');
  }

  /// Named Pipe 연결
  Future<void> connect() async {
    final pipeNamePtr = pipeName.toNativeUtf16();

    try {
      _handle = _createFile(
        pipeNamePtr,
        GENERIC_READ | GENERIC_WRITE,
        0, // No sharing
        nullptr,
        OPEN_EXISTING,
        FILE_ATTRIBUTE_NORMAL,
        0,
      );

      if (_handle == INVALID_HANDLE_VALUE || _handle == 0) {
        throw Exception('Failed to connect to Named Pipe: $pipeName');
      }
    } finally {
      malloc.free(pipeNamePtr);
    }
  }

  /// 요청 전송 및 응답 수신
  Future<String> sendRequest(String request) async {
    if (_handle == null) {
      throw Exception('Pipe not connected');
    }

    // 요청 작성 (줄바꿈 포함)
    final requestData = utf8.encode('$request\n');
    final requestPtr = malloc<Uint8>(requestData.length);
    final bytesWrittenPtr = malloc<Uint32>();

    try {
      // 데이터 복사
      for (var i = 0; i < requestData.length; i++) {
        requestPtr[i] = requestData[i];
      }

      // 쓰기
      final writeResult = _writeFile(
        _handle!,
        requestPtr,
        requestData.length,
        bytesWrittenPtr,
        nullptr,
      );

      if (writeResult == 0) {
        throw Exception('Failed to write to pipe');
      }

      // 응답 읽기
      const bufferSize = 8192;
      final responsePtr = malloc<Uint8>(bufferSize);
      final bytesReadPtr = malloc<Uint32>();

      try {
        final readResult = _readFile(
          _handle!,
          responsePtr,
          bufferSize,
          bytesReadPtr,
          nullptr,
        );

        if (readResult == 0) {
          throw Exception('Failed to read from pipe');
        }

        final bytesRead = bytesReadPtr.value;
        final responseData = List<int>.generate(
          bytesRead,
          (i) => responsePtr[i],
        );

        return utf8.decode(responseData).trim();
      } finally {
        malloc.free(responsePtr);
        malloc.free(bytesReadPtr);
      }
    } finally {
      malloc.free(requestPtr);
      malloc.free(bytesWrittenPtr);
    }
  }

  /// 연결 종료
  Future<void> close() async {
    if (_handle != null) {
      _closeHandle(_handle!);
      _handle = null;
    }
  }
}
