"use client";

import React, { useEffect } from "react";
import { libre, roaldDahl } from "@/fonts";

import Form from "@/components/Form";
import Timestamp from "@/components/Timestamp";

import type { Chunk } from "@/types";
import { parseSegment, parseTimestamp } from "@/lib/client";
import SRT from "@/components/SRTConvert";

function classNames(...classes: string[]) {
	return classes.filter(Boolean).join(" ");
}

const triggerFileDownload = (filename: string, content: string) => {
	const element = document.createElement("a");
	const file = new Blob([content], { type: "text/plain" });

	// Lấy thời gian hiện tại và format thành YYYYMMDD_HHmmss
	const now = new Date();
	const timestamp = now.toISOString().replace(/[-:T]/g, "").split(".")[0]; // YYYYMMDDHHmmss

	// Tạo tên file theo yêu cầu
	const formattedFilename = `translated_${timestamp}.srt`;

	element.href = URL.createObjectURL(file);
	element.download = formattedFilename;
	document.body.appendChild(element);
	element.click();

	// Xóa URL để tránh rò rỉ bộ nhớ
	setTimeout(() => URL.revokeObjectURL(element.href), 1000);
};


export default function Home() {
	const [pageCurrent, setPageCurrent] = React.useState<"tts" | "srt" | "main">("main");

	return (
		<main>
			<div>

				{pageCurrent === "main" && (
					<div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
						<div className="bg-white p-6 rounded-lg shadow-md w-full max-w-md">
							<h1 className="text-xl font-bold text-center mb-4">Phần mềm hỗ trợ Reup</h1>
							<button
								onClick={() => window.open("https://colab.research.google.com/drive/1HSbWA1gkGaxI9_X9zgBC5cCzh6TyAk_D?usp=drive_link")}
								className="mt-4 w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600 transition"
							>
								Chuyển SRT thành Âm Thanh
							</button>
							<button
								onClick={() => setPageCurrent("srt")}
								className="mt-4 w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600 transition"
							>
								Dịch văn bản định dạng SRT
							</button>
						</div>
					</div>
				)}
				{pageCurrent === "srt" && <SRT />}
				<div className="w-full">

					{pageCurrent !== "main" && (
						<button
							onClick={() => setPageCurrent("main")}
							className="mt-2 mx-auto block w-[50%]  bg-blue-500 text-white py-2 rounded-md"
						>
							Quay lại trang chủ
						</button>)}
				</div>
			</div>
		</main>
	);
}
