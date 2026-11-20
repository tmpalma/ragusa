interface FilePickerAcceptType {
  description?: string;
  accept: Record<string, string[]>;
}

interface FilePickerOptions {
  suggestedName?: string;
  types?: FilePickerAcceptType[];
  multiple?: boolean;
}

interface FileSystemWritableFileStream extends WritableStream {
  write(data: string | BufferSource | Blob): Promise<void>;
  close(): Promise<void>;
}

interface FileSystemFileHandle {
  createWritable(): Promise<FileSystemWritableFileStream>;
  getFile(): Promise<File>;
}

interface Window {
  showSaveFilePicker?(options?: FilePickerOptions): Promise<FileSystemFileHandle>;
  showOpenFilePicker?(options?: FilePickerOptions): Promise<FileSystemFileHandle[]>;
}
