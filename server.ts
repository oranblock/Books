import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import {
  parseJsonContentsToPages,
  parseAnyTextOrJsonToPages,
} from './src/utils/parser';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Server-side initialization of Gemini client according to @google/genai guidelines
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// AI Health & Status check
app.get('/api/ai/status', (_req, res) => {
  res.json({
    available: Boolean(process.env.GEMINI_API_KEY),
    model: 'gemini-3.8-flash',
  });
});

// Dedicated AI RAG Assistant Endpoint for Sahifa & Ahlulbayt Library
app.post('/api/ai/ask', async (req, res) => {
  const { question, contextPages, targetAudience = 'kids' } = req.body;

  if (!question || typeof question !== 'string') {
    res.status(400).json({ error: 'السؤال مطلوب' });
    return;
  }

  // Build RAG context from the authentic book pages
  const contextText = Array.isArray(contextPages) && contextPages.length > 0
    ? contextPages
        .map(
          (p: any) =>
            `--- [صفحة ${p.pageNumber || p.page_number} - ${p.heading || 'دعاء'}] ---\n${p.content || p.text || ''}`
        )
        .join('\n\n')
    : 'نصوص الصحيفة السجادية وأدعية أهل البيت عليهم السلام.';

  const isKidMode = targetAudience === 'kids';

  const systemInstruction = isKidMode
    ? `أنت "المعلم القرآني والسجادي اللطيف للأطفال والناشئة" (Child-friendly Ahlulbayt Spiritual Guide).
مهمتك:
1. الإجابة عن سؤال الطفل أو الناشئة بأسلوب دافئ، مشوق، ومبسط يزرع في قلبه المحبة والسكينة والرحمة.
2. الاستناد المباشر إلى نصوص الصحيفة السجادية المرفقة في السياق (دعاء الإمام علي بن الحسين زين العابدين ع).
3. استخراج اقتباس حرفي دقيق من كلام الإمام بين قوسين «...».
4. تبسيط معاني الكلمات الصعبة باللغة العربية الفصحى الجميلة.
5. تقديم تطبيق عملي وسلوكي في حياة الطفل اليومية (في المدرسة، مع الوالدين، مع الإخوة).
6. تجنب أي ألفاظ معقدة أو فلسفية جافة.`
    : `أنت باحث ومحقق متخصص في تراث أهل البيت عليهم السلام وعلوم الصحيفة السجادية.
أجب عن السؤال بدقة استناداً إلى النصوص المرفقة، وبيّن المضامين التوحيدية والأخلاقية، واذكر أرقام الصفحات والشواهد النصية.`;

  const userPrompt = `السؤال المطروح:
"${question}"

السياق المسترجع من الصحيفة السجادية (#5586) وأمهات المصادر:
${contextText}

المطلوب: قدّم الإجابة المنظمة والموثقة بصيغة JSON طبقاً للـ Schema المحددة.`;

  const generateWithFallback = async (modelName: string) => {
    return await ai.models.generateContent({
      model: modelName,
      contents: userPrompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          required: ['title', 'summary', 'directQuote', 'practicalLesson'],
          properties: {
            title: {
              type: Type.STRING,
              description: 'عنوان جذاب ومناسب للإجابة',
            },
            summary: {
              type: Type.STRING,
              description: 'شرح مبسط ودافئ يجيب عن السؤال مباشرة للأطفال والناشئة',
            },
            directQuote: {
              type: Type.STRING,
              description: 'اقتباس حرفي مباشر من كلام الإمام زين العابدين (ع) في الصحيفة السجادية مع ذكر رقم الصفحة إن أمكن',
            },
            practicalLesson: {
              type: Type.STRING,
              description: 'تطبيق عملي أو تدريب سلوكي يومي للطفل في المدرسة أو مع العائلة',
            },
            vocabulary: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  word: { type: Type.STRING },
                  meaning: { type: Type.STRING },
                },
              },
              description: 'معاني الكلمات البلاغية الصعبة إن وجدت في الاقتباس',
            },
            followUpQuestions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'سؤالان إضافيان لاستكشاف جوانب أخرى من أدعية الإمام',
            },
          },
        },
      },
    });
  };

  try {
    let response;
    try {
      response = await generateWithFallback('gemini-3.8-flash');
    } catch (firstErr: any) {
      console.warn('Retrying with gemini-3.1-flash-lite due to:', firstErr?.message);
      // Fallback model if 503 temporary high demand
      response = await generateWithFallback('gemini-3.1-flash-lite');
    }

    const jsonText = response.text || '{}';
    const parsed = JSON.parse(jsonText);
    res.json({ success: true, result: parsed });
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء معالجة السؤال بواسطة الذكاء الاصطناعي',
      fallbackNotice: 'يمكنك مواصلة استخدام الفهرس المحلي FTS5 المستقل تماماً دون الحاجة لاتصال خارجي.',
    });
  }
});

// Endpoint to explain any specific page on demand
app.post('/api/ai/explain-page', async (req, res) => {
  const { pageNumber, heading, content } = req.body;

  if (!content) {
    res.status(400).json({ error: 'محتوى الصفحة مطلوب' });
    return;
  }

  const prompt = `اشرح هذه الصفحة من الصحيفة السجادية للأطفال والعائلة:
العنوان: ${heading || 'دعاء'}
رقم الصفحة: ${pageNumber}
النص:
${content}

المطلوب:
1. ما الفكرة الجوهرية لهذا الدعاء؟ (فقرتان واضحتان)
2. درس عملي للطفل.
3. ثلاثة مفردات لغوية مع شرحها الميسر.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction:
          'أنت معلم تربوي يشرح أدعية الصحيفة السجادية بأسلوب تربوي لطيف وملهم للأطفال والعائلات.',
      },
    });

    res.json({
      success: true,
      explanation: response.text,
    });
  } catch (error: any) {
    console.error('Gemini Explain Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'تعذر شرح الصفحة عبر الذكاء الاصطناعي',
    });
  }
});

// Single-Book On-Demand Remote Fetch Endpoint (Connect-RPC JSON + Details attachment fallback)
app.post('/api/books/:bookId/fetch-remote', async (req, res) => {
  const bookId = req.params.bookId;
  const rpcHeaders = {
    'User-Agent':
      'Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36 Chrome/156.0.0.0 Mobile Safari/537.36',
    Origin: 'https://ablibrary.net',
    Referer: 'https://ablibrary.net/',
    'Content-Type': 'application/json',
    'Connect-Protocol-Version': '1',
  };

  const triedLog: string[] = [];

  // Step 1: Call BookService/Contents with string bookId
  const contentsUrl =
    'https://grpc.ablibrary.net/ablibrary.services.book_service.BookService/Contents';

  for (const payload of [{ bookId: String(bookId) }, { id: String(bookId) }]) {
    try {
      const response = await fetch(contentsUrl, {
        method: 'POST',
        headers: rpcHeaders,
        body: JSON.stringify(payload),
      });

      triedLog.push(`POST BookService/Contents ${JSON.stringify(payload)} -> ${response.status}`);
      if (response.ok) {
        const data: any = await response.json();
        const pages = parseJsonContentsToPages(data);
        if (pages.length > 0) {
          res.json({
            status: 'ok',
            method: 'BookService/Contents',
            pages_saved: pages.length,
            pages,
          });
          return;
        }
      } else {
        const errText = await response.text();
        triedLog.push(`Response: ${errText.slice(0, 160)}`);
      }
    } catch (e: any) {
      triedLog.push(`ERR BookService/Contents: ${e.message}`);
    }
  }

  // Step 2: Query BookService/Details with {"id": "<book_id>"} to get attachment URLs
  const detailsUrl =
    'https://grpc.ablibrary.net/ablibrary.services.book_service.BookService/Details';
  try {
    const detailsResp = await fetch(detailsUrl, {
      method: 'POST',
      headers: rpcHeaders,
      body: JSON.stringify({ id: String(bookId) }),
    });

    triedLog.push(`POST BookService/Details -> ${detailsResp.status}`);
    if (detailsResp.ok) {
      const details: any = await detailsResp.json();
      const atts = details?.book?.attachments || [];

      for (const att of atts) {
        const fileInfo = att?.file || {};
        const fileUrl = fileInfo.url;
        if (!fileUrl) continue;

        try {
          const dlResp = await fetch(fileUrl, {
            headers: { 'User-Agent': rpcHeaders['User-Agent'] },
          });
          triedLog.push(`GET ${fileUrl} -> ${dlResp.status}`);

          if (dlResp.ok) {
            const textContent = await dlResp.text();
            if (textContent.length > 50) {
              const parsedResult = parseAnyTextOrJsonToPages(textContent);
              if (parsedResult.pages.length > 0) {
                res.json({
                  status: 'ok',
                  method: fileUrl,
                  pages_saved: parsedResult.pages.length,
                  pages: parsedResult.pages,
                });
                return;
              }
            }
          }
        } catch (dlErr: any) {
          triedLog.push(`Download error for ${fileUrl}: ${dlErr.message}`);
        }
      }
    }
  } catch (detailsErr: any) {
    triedLog.push(`ERR BookService/Details: ${detailsErr.message}`);
  }

  res.json({
    status: 'diagnostic',
    tried: triedLog,
  });
});

// Setup Vite middleware in development or static serving in production
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Ahlulbayt Library Server running on http://localhost:${PORT}`);
  });
}

startServer();
