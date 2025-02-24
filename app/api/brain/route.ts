import OpenAI from "openai";
import { OpenAIStream, StreamingTextResponse } from "ai";
import { systemContent } from "@/app/lib/constants";

// Optional, but recommended: run on the edge runtime.
// See https://vercel.com/docs/concepts/functions/edge-functions
export const runtime = "edge";

type Message = {
  role: "system" | "assistant" | "user";
  content: string;
};

const openai = new OpenAI({
  baseURL: process.env.BASE_URL!,
  apiKey: process.env.GROQ_API_KEY!,
});

function getLastUserMessage(conversation: Message[]): string | null {
  const lastUserMessage = conversation
    .filter((msg) => msg.role === "user")
    .pop(); // Get the last occurrence

  return lastUserMessage ? lastUserMessage.content : null;
}

export async function POST(req: Request) {
  // Extract the `messages` from the body of the request
  const { messages } = await req.json();

  const userContent = getLastUserMessage(messages);


  const userQuery = {
    index_name: "mp-policy",
    query: userContent,
  };

  const contentResponse = await fetch("https://app33.dev.andaihub.com/query", {
    method: "POST",
    body: JSON.stringify(userQuery),
    headers: {
      "Content-Type": "application/json",
    },
  });

  const jsonData = await contentResponse.json();


  const start = Date.now();

  // Request the OpenAI API for the response based on the prompt
  try {
    const response = await openai.chat.completions.create({
      model: process.env.MODEL!,
      stream: true,
      messages: [
        {
          role: "user",
          content: `QUERY: ${userQuery} , INFORMATION : ${jsonData?.content}`,
        },
        { role: "system", content: systemContent },
      ],

    });

    const stream = OpenAIStream(response);

    return new StreamingTextResponse(stream, {
      headers: {
        "X-LLM-Start": `${start}`,
        "X-LLM-Response": `${Date.now()}`,
      },
    });
  } catch (error) {
    console.error("test", error);
  }
}
