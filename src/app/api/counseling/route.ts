import {
  MBTI_PROFILES,
  type CounselingRequestBody,
  type CounselingChatHistoryItem,
  type CounselingAnswerLength,
} from '@/app/counseling/types';
import { GoogleGenAI } from '@google/genai';
import { NextRequest } from 'next/server';

const MODEL_NAME = 'gemini-2.5-flash';

const genAI = (() => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({ apiKey });
})();

const answerLengthHints: Record<CounselingAnswerLength, string> = {
  short: '답변을 핵심만 간결하게 2~3문장으로 정리해 주세요.',
  medium: '답변을 4~6문장 정도로 친절하게 설명해 주세요.',
  long: '답변을 충분히 자세히 7문장 이상으로 공감과 해결책을 모두 포함해 주세요.',
};

export async function POST(req: NextRequest) {
  if (!genAI) {
    return new Response('Missing GEMINI_API_KEY', { status: 500 });
  }

  let body: CounselingRequestBody;
  try {
    body = await req.json();
  } catch (error) {
    console.error('Invalid JSON body', error);
    return new Response('Invalid JSON body', { status: 400 });
  }

  const { history = [], message, config } = body ?? {};

  if (!message || typeof message !== 'string') {
    return new Response('`message` is required', { status: 400 });
  }

  const normalizedHistory: CounselingChatHistoryItem[] = Array.isArray(history)
    ? history.filter(
        (item): item is CounselingChatHistoryItem =>
          item != null &&
          (item as CounselingChatHistoryItem).role != null &&
          ((item as CounselingChatHistoryItem).role === 'user' ||
            (item as CounselingChatHistoryItem).role === 'model') &&
          Array.isArray((item as CounselingChatHistoryItem).parts)
      )
    : [];

  const personaHints: string[] = [];

  if (config?.userAge) {
    personaHints.push(`내담자의 나이: ${config.userAge}`);
  }

  if (config?.userGender) {
    personaHints.push(`내담자의 성별: ${config.userGender}`);
  }

  if (config?.userTraits) {
    personaHints.push(`내담자의 특징: ${config.userTraits}`);
  }

  if (config?.mbti) {
    personaHints.push(
      `상담봇의 MBTI: ${config.mbti} ${
        MBTI_PROFILES[config.mbti]?.longDescription ?? ''
      }`
    );
  }

  if (config?.answerLength && answerLengthHints[config.answerLength]) {
    personaHints.push(answerLengthHints[config.answerLength]);
  }

  const systemPrompt = personaHints.filter(Boolean).join('\n').trim();

  // const enrichedHistory =
  //   systemPrompt.length > 0
  //     ? [
  //         ...normalizedHistory,
  //         {
  //           role: 'user',
  //           parts: [
  //             {
  //               text: `다음은 상담 상황 정보입니다:\n${systemPrompt}\n위 설정을 고려해 이후 요청에 응답해 주세요.`,
  //             },
  //           ],
  //         },
  //       ]
  //     : normalizedHistory;

  try {
    const chat = genAI.chats.create({
      config: { systemInstruction: systemPrompt },
      model: MODEL_NAME,
      history: normalizedHistory,
    });

    const aiStream = await chat.sendMessageStream({
      message,
    });

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of aiStream) {
            if (!chunk?.text) continue;
            const payload = `data: ${JSON.stringify({ text: chunk.text })}\n\n`;
            controller.enqueue(encoder.encode(payload));
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          console.error('Gemini stream error', error);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                error:
                  error instanceof Error
                    ? error.message
                    : 'Gemini stream error',
              })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Gemini request failed', error);
    return new Response('Failed to connect to Gemini', { status: 500 });
  }
}
