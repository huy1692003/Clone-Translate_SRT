"use client";

import React, { useEffect } from "react";
import { libre, roaldDahl } from "@/fonts";

import Form from "@/components/Form";
import Timestamp from "@/components/Timestamp";

import type { Chunk } from "@/types";
import { parseSegment, parseTimestamp } from "@/lib/client";

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


export default function SRT() {
	const [status, setStatus] = React.useState<"idle" | "busy" | "done">("idle");
	const [translatedSrt, setTranslatedSrt] = React.useState("");
	const [progress, setProgress] = React.useState(0);
	const [translatedChunks, setTranslatedChunks] = React.useState<Chunk[]>([]);
	const [originalChunks, setOriginalChunks] = React.useState<Chunk[]>([]);


	useEffect(() => {
		if (status === "done") {
			alert("✅ Chuyển đổi thành công hãy kiểm tra thư mục tải xuống của bạn");
			window.location.reload();
		}
	}, [status])
	async function handleStream(response: Response) {
		const data = response.body;
		if (!data) return;
		console.log(data)

		let content = "";
		let doneReading = false;
		const reader = data.getReader();
		const decoder = new TextDecoder();

		while (!doneReading) {
			const { value, done } = await reader.read();
			doneReading = done;
			const chunk = decoder.decode(value);

			content += `${chunk}\n\n`;
			setTranslatedSrt((prev) => prev + chunk);
			if (chunk.trim().length)
				setTranslatedChunks((prev) => [...prev, parseChunk(chunk)]);
		}

		return content;

		function parseChunk(chunkStr: string): Chunk {
			const { id, timestamp, text } = parseSegment(chunkStr);
			const { start, end } = parseTimestamp(timestamp);
			return { index: id.toString(), start, end, text };
		}
	}

	async function handleSubmit(content: string, language: string) {
		try {
			if (!content) {
				console.error("No content provided");
				return;
			}

			setStatus("busy");
			setTranslatedSrt("");
			setTranslatedChunks([]);
			setOriginalChunks([]);
			setProgress(0); // Reset tiến trình về 0%

			const segments = content.split(/\r\n\r\n|\n\n/).filter((segment) => {
				const lines = segment.split(/\r\n|\n/);
				const id = Number.parseInt(lines[0], 10);
				return (
					lines.length >= 3 && !Number.isNaN(id) && lines[1].includes(" --> ")
				);
			});

			if (!segments.length) {
				setStatus("idle");
				alert("📂Vui lòng chọn đúng định dạng file SRT");
				return;
			}

			const batchSize = 10;
			const batches = [];
			for (let i = 0; i < segments.length; i += batchSize) {
				batches.push(segments.slice(i, i + batchSize));
			}

			console.log("Batches:", batches);
			let translatedContent = "";
			let indexLine: number = 0;
			for (let i = 0; i < batches.length; i++) {
				const response = await fetch("/api/srtAPI", {
					method: "POST",
					body: JSON.stringify({ content: batches[i].join("\n\n"), language ,indexLine}),
					headers: { "Content-Type": "application/json" },
				});

				if (response.ok) {
					const batchContent = await handleStream(response);
					translatedContent += batchContent;
					indexLine += batchSize;
					setProgress(Math.round(((i + 1) / batches.length) * 100)); // Cập nhật phần trăm tiến trình
				} else {
					console.error("Lỗi khi gửi batch", i);
					setStatus("idle");
					return;
				}
			}

			if (translatedContent) {
				setStatus("done");
				triggerFileDownload(`${language}.srt`, translatedContent);
			}
		} catch (error) {
			setStatus("idle");
			console.error("Lỗi trong quá trình xử lý:", error);
		}
	}



	return (
		<div
			className={classNames(
				"max-w-2xl flex flex-col items-center mx-auto",
				libre.className,
			)}
		>
			{status === "idle" && (
				<>
					<h1
						className={classNames(
							"px-4 text-3xl md:text-5xl text-center font-bold my-6",
							roaldDahl.className,
						)}
					>
						Dịch file SRT sang ngôn ngữ bất kỳ !
					</h1>
					<Form onSubmit={handleSubmit} />
				</>
			)}
			{status === "busy" && (
				<>
					<h1
						className={classNames(
							"px-4 text-3xl md:text-5xl text-center font-bold my-6",
							roaldDahl.className,
						)}
					>
						Đang chuyển đổi ... &hellip;
					</h1>
					<p className="text-center">Tiến trình: {progress}%</p>
					<div className="w-full bg-gray-200 rounded-full h-4 mt-2">
						<div
							className="bg-blue-500 h-4 rounded-full transition-all"
							style={{ width: `${progress}%` }}
						></div>
					</div>
				</>
			)}
			{status === "done" && (
				<>
					<h1
						className={classNames(
							"px-4 text-3xl md:text-5xl text-center font-bold my-6",
							roaldDahl.className,
						)}
					>
						All done!
					</h1>
					<p>Check your "Downloads" folder 🍿</p>
					<p className="mt-4 text-[#444444]">
						Psst. Need to edit your SRT? Try{" "}
						<a
							href="https://www.veed.io/subtitle-tools/edit?locale=en&source=/tools/subtitle-editor/srt-editor"
							target="_blank"
							rel="noreferrer"
						>
							this tool
						</a>
					</p>
				</>
			)}
		</div>
	);
}
