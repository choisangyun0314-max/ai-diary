"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";

/** 구글 시트에 일기 저장 (서버 전용) */
export async function saveToSheet(diary: string) {
  let gasUrl = process.env.APPS_SCRIPT_URL;
  if (!gasUrl) {
    console.error("APPS_SCRIPT_URL is missing in .env.local");
    throw new Error("구글 시트 연동 주소가 설정되지 않았습니다.");
  }

  // URL 끝에 /exec가 없는 경우 자동으로 추가
  if (gasUrl.endsWith("/")) {
    gasUrl += "exec";
  } else if (!gasUrl.endsWith("/exec")) {
    gasUrl += "/exec";
  }

  try {
    const response = await fetch(gasUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        datetime: new Date().toISOString(),
        diary: diary,
      }),
    });

    // Apps Script의 doPost는 보안상 opaque 응답이 올 수 있으므로 ok 체크와 함께 예외 처리
    if (!response.ok && response.type !== 'opaque') {
      throw new Error(`저장 실패 (상태 코드: ${response.status})`);
    }

    return { success: true };
  } catch (error: any) {
    console.error("Save to Sheet Error:", error);
    throw new Error(error?.message || "구글 시트 저장 중 오류가 발생했습니다.");
  }
}

/** 구글 시트에서 일기 목록 가져오기 (서버 전용) */
export async function getDiaryList() {
  let gasUrl = process.env.APPS_SCRIPT_URL;
  if (!gasUrl) {
    console.error("APPS_SCRIPT_URL is missing in .env.local");
    throw new Error("구글 시트 연동 주소가 설정되지 않았습니다.");
  }

  // URL 끝에 /exec가 없는 경우 자동으로 추가
  if (gasUrl.endsWith("/")) {
    gasUrl += "exec";
  } else if (!gasUrl.endsWith("/exec")) {
    gasUrl += "/exec";
  }

  try {
    const response = await fetch(gasUrl, { 
      method: "GET",
      cache: 'no-store' // 항상 최신 데이터를 가져오기 위해 캐싱 방지
    });

    if (!response.ok) {
      throw new Error(`불러오기 실패 (상태 코드: ${response.status})`);
    }

    const data = await response.json();
    if (data.error) throw new Error(data.error);

    return data as { datetime: string; diary: string }[];
  } catch (error: any) {
    console.error("Get Diary List Error:", error);
    throw new Error(error?.message || "일기 목록을 가져오는 중 오류가 발생했습니다.");
  }
}

export async function analyzeDiary(text: string) {
  if (!text) throw new Error("Text is required");

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    console.error("GOOGLE_GENERATIVE_AI_API_KEY is missing in .env.local");
    throw new Error("API 키 설정이 누락되었습니다. (.env.local 파일을 확인해주세요)");
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  // 모델명을 사용자가 요청한 gemini-3.1-flash-lite-preview로 설정합니다.
  const model = genAI.getGenerativeModel({ 
    model: "gemini-3.1-flash-lite-preview", 
  });

  const prompt = `
    다음은 사용자가 작성한 일기 내용입니다.
    내용을 분석하여 가장 적절한 감정 하나를 선택하고, 그 이유를 포함한 짧은 분석 결과를 작성해주세요.
    
    감정 후보: [행복함, 슬픔, 화남, 놀람, 평온함]
    
    응답은 반드시 아래의 JSON 형식으로만 해주세요:
    {
      "title": "일기 제목 (5~10자 내외)",
      "sentiment": "감정 후보 중 하나",
      "analysis": "분석 결과 텍스트 (2~3문장)"
    }
    
    일기 내용:
    "${text}"
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const responseText = response.text();
    
    // Extract JSON from response (handling potential markdown blocks)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("No JSON found in AI response:", responseText);
      throw new Error("AI 응답 형식이 올바르지 않습니다.");
    }
    
    const data = JSON.parse(jsonMatch[0]);
    
    // Map Korean sentiment names to IDs used in the frontend
    const sentimentMap: Record<string, string> = {
      "행복함": "happy",
      "슬픔": "sad",
      "화남": "angry",
      "놀람": "surprised",
      "평온함": "calm"
    };

    return {
      title: data.title || "오늘의 일기",
      sentimentId: sentimentMap[data.sentiment] || "calm",
      text: data.analysis
    };
  } catch (error: any) {
    console.error("AI Analysis Error:", error);
    // Return a more descriptive error if available
    const errorMsg = error?.message || "AI 분석 중 알 수 없는 오류가 발생했습니다.";
    throw new Error(errorMsg);
  }
}
