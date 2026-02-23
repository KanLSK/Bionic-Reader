import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const SYSTEM_PROMPT = `You are an academic tutor. From the following text, generate 3-5 high-quality flashcards.
Requirements:
- Question and Answer format
- Focus on core concepts, mechanisms, and definitions
- Avoid trivial details
- Concise and clear
- Suitable for medical students
- Extract a 1-3 word \`topicTag\` representing the main concept cluster.
- Assign a \`sectionComplexityScore\` from 1-10 evaluating the cognitive density of the text.
- Return ONLY a valid JSON array, no markdown, no explanation

Format:
[
  { 
    "question": "...", 
    "answer": "...",
    "topicTag": "Neuroanatomy",
    "sectionComplexityScore": 8
  },
  ...
]`;

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    if (!text || text.trim().length < 50) {
      return NextResponse.json(
        { error: 'Text too short to generate flashcards' },
        { status: 400 },
      );
    }

    // Trim to ~3000 words to stay within token limits
    const trimmed = text.split(/\s+/).slice(0, 3000).join(' ');

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const result = await model.generateContent(
      `${SYSTEM_PROMPT}\n\nText:\n${trimmed}`,
    );

    const raw = result.response.text().trim();

    // Strip potential markdown code fences
    const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();

    let cards: { question: string; answer: string; topicTag?: string; sectionComplexityScore?: number }[];
    try {
      cards = JSON.parse(clean);
    } catch {
      console.error('Gemini JSON parse failed:', clean);
      return NextResponse.json(
        { error: 'AI returned malformed JSON. Please try again.' },
        { status: 502 },
      );
    }

    if (!Array.isArray(cards) || cards.length === 0) {
      return NextResponse.json(
        { error: 'No flashcards were generated.' },
        { status: 502 },
      );
    }

    return NextResponse.json({ cards });
  } catch (error: unknown) {
    console.error('Flashcard generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
