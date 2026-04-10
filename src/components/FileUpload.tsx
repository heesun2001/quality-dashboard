"use client";

import { useRef, useState, DragEvent, ChangeEvent } from "react";

interface FileUploadProps {
  onFile: (file: File) => void;
  onSampleDownload: () => void;
  isLoading: boolean;
}

export default function FileUpload({ onFile, onSampleDownload, isLoading }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onFile(file);
    e.target.value = "";
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`
          w-full max-w-xl border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer
          transition-colors duration-200 select-none
          ${dragging
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 bg-white hover:border-blue-400 hover:bg-blue-50/50"
          }
          ${isLoading ? "pointer-events-none opacity-60" : ""}
        `}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center">
            <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          {isLoading ? (
            <p className="text-gray-500 font-medium">파싱 중...</p>
          ) : (
            <>
              <p className="text-gray-700 font-medium">CSV 파일을 여기에 드래그하거나 클릭하여 업로드</p>
              <p className="text-gray-400 text-sm">날짜, 총생산량, 불량유형1, 불량유형2... 형식의 CSV</p>
            </>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={handleChange}
        />
      </div>

      <button
        onClick={onSampleDownload}
        className="text-sm text-blue-600 hover:text-blue-800 underline underline-offset-2 transition-colors"
      >
        샘플 CSV 다운로드
      </button>
    </div>
  );
}
