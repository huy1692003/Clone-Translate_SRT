import { groupSegmentsByTokenLength } from "@/lib/srt";
import { parseSegment } from "@/lib/client";
import { google } from "@ai-sdk/google";
import { generateText } from "ai";

export const dynamic = "force-dynamic";


const MAX_TOKENS_IN_SEGMENT = 30000;

const retrieveTranslation = async (text: string, language: string) => {
	let retries = 3;
	while (retries > 0) {
		try {
			const { text: translatedText } = await generateText({
				model: google("gemini-2.0-flash"),
				messages: [
					// {
					// 	"role": "system",
					// 	"content": "“You are a professional semantic translator with deep knowledge of Vietnamese culture and many years of experience in creating SRT files. Please translate the content naturally and fluently while preserving the original meaning. Separate the translated segments using the ‘###’ symbol to ensure accurate segmentation.”."
					// },
					{
						"role": "system",
						"content": "Không giải thích thêm; Bạn là một nhà dịch giả có rất nhiều kinh nghiệm và vốn từ cho nhiều quốc gia hãy giữ nguyên các dấu ### để phân tách câu ."
					},
					
					{
						role: "user",
						content: `Dịch giả sang ngôn ngữ ${language}(Có thể thêm 1-4 từ để câu hài hòa và nối tiếp nhau có nghĩa) : ${text}`,
					},
				],
			});
			console.timeEnd("Google Translation API Time"); // Kết thúc đo thời gian
			return translatedText;
		} catch (error) {
			console.error("Translation error:", error);
			if (retries > 1) {
				console.warn("Retrying translation...");
				await new Promise((resolve) => setTimeout(resolve, 1000));
				retries--;
				continue;
			}
			throw error;
		}
	}
};

export async function POST(request: Request) {
	try {
		const { content, language, indexLine } = await request.json();
		const segments = content.split(/\r\n\r\n|\n\n/).map(parseSegment);
		const groups = groupSegmentsByTokenLength(segments, MAX_TOKENS_IN_SEGMENT);

		let currentIndex = 0;
		let index = indexLine ?? 0;
		const encoder = new TextEncoder();
		const stream = new ReadableStream({
			async start(controller) {
				for (const group of groups) {
					const text = group.map((segment) => segment.text).join("###");
					// console.log("Chưa dịch: ",total.length)
					const translatedText = await retrieveTranslation(text, language);
					if (!translatedText) continue;
					const translatedSegments = translatedText.split("###");
					
					for (const segment of translatedSegments) {
						if (segment.trim()) {
							const originalSegment = segments[currentIndex];
							currentIndex++
							const srt = `${++index}\n${originalSegment?.timestamp || ""}\n${segment.trim()}\n\n`;
							controller.enqueue(encoder.encode(srt));
						}
					}
				}
				controller.close();
			},
		});

		return new Response(stream);
	} catch (error) {
		console.error("Error during translation:", error);
		return new Response(JSON.stringify({ error: "Error during translation" }), {
			status: 500,
		});
	}
}
