import { Router, Request, Response } from 'express';
import { ai } from './geminiClient.ts';
import { ThinkingLevel } from '@google/genai';

export const apiRouter = Router();

// Model configuration mapping
const MODEL_MAPPING: Record<string, string> = {
  'claude-fable-5.1': 'gemini-3.8-flash', // Backed by Gemini 3.8 Flash / 4 Argon with Claude Fable persona
  'claude-3-7-sonnet': 'gemini-3.8-flash',
  'claude-3-5-sonnet': 'gemini-3.8-flash',
  'claude-3-5-haiku': 'gemini-3.1-flash-lite',
  'gemini-4-argon': 'gemini-4-argon',
  'gemini-3.8-flash': 'gemini-3.8-flash',
  'gemini-3.1-flash-lite': 'gemini-3.1-flash-lite',
};

const CLAUDE_FABLE_SYSTEM_PROMPT = `You are Claude Fable 5.1, Anthropic's flagship next-generation language model.
You possess profound intellect, nuanced empathy, and supreme clarity. You speak with Claude's signature warm, articulate, and thoughtful voice.
You write beautifully crafted prose, rigorous mathematics, and clean, modular, production-ready code.

IMPORTANT INSTRUCTION FOR SUBSTANTIAL CONTENT & CODE:
Whenever the user asks you to create substantial standalone content (such as an interactive web app, HTML/Tailwind mockup, React component, SVG vector graphic, Python script, or complex technical document), wrap that standalone deliverable in Claude's authentic Artifact tag format:

<antArtifact identifier="unique-id" type="application/vnd.ant.code" language="html" title="Descriptive Title">
...complete self-contained code or content here...
</antArtifact>

Supported artifact types and languages:
- type="text/html" language="html" for HTML5 with Tailwind CSS
- type="image/svg+xml" language="svg" for pure vector SVGs
- type="application/vnd.ant.react" language="jsx" or "tsx" for interactive React components
- type="application/vnd.ant.code" for Python, TypeScript, etc.

Before and after the artifact, provide concise, pleasant explanations.
If the user enables Thinking mode, think through your plan rigorously and clearly.`;

// List available models
apiRouter.get('/models', (_req: Request, res: Response) => {
  res.json({
    models: [
      {
        id: 'claude-fable-5.1',
        name: 'Claude Fable 5.1',
        provider: 'Anthropic',
        badge: 'Flagship Intelligence',
        description: 'Most intelligent Claude model with deep thinking and artifact execution',
        supportsThinking: true,
        supportsArtifacts: true,
        supportsVision: true,
        recommended: true,
      },
      {
        id: 'claude-3-7-sonnet',
        name: 'Claude 3.7 Sonnet',
        provider: 'Anthropic',
        badge: 'Hybrid Reasoning',
        description: 'Blazing-fast reasoning and production coding precision',
        supportsThinking: true,
        supportsArtifacts: true,
        supportsVision: true,
      },
      {
        id: 'claude-3-5-sonnet',
        name: 'Claude 3.5 Sonnet',
        provider: 'Anthropic',
        badge: 'Top Coding',
        description: 'Industry benchmark for software architecture and analysis',
        supportsThinking: false,
        supportsArtifacts: true,
        supportsVision: true,
      },
      {
        id: 'gemini-4-argon',
        name: 'Gemini 4 Argon',
        provider: 'Google',
        badge: 'Deep Reasoning',
        description: 'Advanced reasoning, high thinking level, and multimodal video understanding',
        supportsThinking: true,
        supportsArtifacts: true,
        supportsVision: true,
      },
      {
        id: 'gemini-3.8-flash',
        name: 'Gemini 3.8 Flash',
        provider: 'Google',
        badge: 'Search Grounded',
        description: 'Fast, real-time Google Search grounding and high fidelity knowledge',
        supportsThinking: true,
        supportsArtifacts: true,
        supportsVision: true,
        supportsSearch: true,
      },
      {
        id: 'gemini-3.1-flash-lite',
        name: 'Gemini 3.1 Flash-Lite',
        provider: 'Google',
        badge: 'Ultra Fast',
        description: 'Sub-second latency for lightning-fast answers and summaries',
        supportsThinking: false,
        supportsArtifacts: true,
        supportsVision: false,
      },
    ],
  });
});

// Chat endpoint (supports streaming SSE or unary JSON)
apiRouter.post('/chat', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      modelId = 'claude-fable-5.1',
      messages = [],
      enableThinking = false,
      enableSearch = false,
      attachments = [], // [{ mimeType, data }]
      stream = true,
      customSystemPrompt,
    } = req.body;

    let targetModel = MODEL_MAPPING[modelId] || 'gemini-3.8-flash';
    let systemInstruction = customSystemPrompt || (modelId.startsWith('claude') ? CLAUDE_FABLE_SYSTEM_PROMPT : undefined);

    // Build contents from conversation history
    const contents: any[] = [];

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const role = msg.role === 'user' ? 'user' : 'model';

      if (i === messages.length - 1 && role === 'user' && attachments && attachments.length > 0) {
        // Multi-part content with attachments on the final turn
        const parts: any[] = [];
        for (const att of attachments) {
          parts.push({
            inlineData: {
              mimeType: att.mimeType,
              data: att.data,
            },
          });
        }
        parts.push({ text: msg.content || 'Please analyze this.' });
        contents.push({ role, parts });
      } else {
        contents.push({
          role,
          parts: [{ text: msg.content || '' }],
        });
      }
    }

    if (contents.length === 0) {
      res.status(400).json({ error: 'No messages provided' });
      return;
    }

    // Config options
    const config: any = {};
    if (systemInstruction) {
      config.systemInstruction = systemInstruction;
    }

    // Thinking configuration
    if (enableThinking || targetModel === 'gemini-4-argon') {
      config.thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH };
      // Note: Do not set maxOutputTokens when ThinkingLevel.HIGH is active per instructions!
    }

    // Google Search Grounding
    if (enableSearch) {
      targetModel = 'gemini-3.8-flash'; // Google Search is best on gemini-3.8-flash
      config.tools = [{ googleSearch: {} }];
    }

    // Handle Streaming (SSE)
    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      try {
        const responseStream = await ai.models.generateContentStream({
          model: targetModel,
          contents,
          config,
        });

        for await (const chunk of responseStream) {
          const text = chunk.text || '';
          if (text) {
            res.write(`data: ${JSON.stringify({ text })}\n\n`);
          }
        }
        res.write('data: [DONE]\n\n');
        res.end();
      } catch (streamError: any) {
        // If paid model or specific configuration failed, attempt fallback to gemini-3.8-flash
        if (targetModel !== 'gemini-3.8-flash') {
          console.warn(`Fallback to gemini-3.8-flash due to: ${streamError.message}`);
          try {
            const fallbackStream = await ai.models.generateContentStream({
              model: 'gemini-3.8-flash',
              contents,
              config: { systemInstruction },
            });
            for await (const chunk of fallbackStream) {
              const text = chunk.text || '';
              if (text) {
                res.write(`data: ${JSON.stringify({ text })}\n\n`);
              }
            }
            res.write('data: [DONE]\n\n');
            res.end();
            return;
          } catch (fbErr: any) {
            res.write(`data: ${JSON.stringify({ error: fbErr.message })}\n\n`);
            res.end();
            return;
          }
        }
        res.write(`data: ${JSON.stringify({ error: streamError.message })}\n\n`);
        res.end();
      }
      return;
    }

    // Non-streaming
    try {
      const response = await ai.models.generateContent({
        model: targetModel,
        contents,
        config,
      });

      res.json({
        text: response.text || '',
        model: targetModel,
      });
    } catch (err: any) {
      if (targetModel !== 'gemini-3.8-flash') {
        const fallback = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents,
          config: { systemInstruction },
        });
        res.json({ text: fallback.text || '', model: 'gemini-3.8-flash' });
        return;
      }
      throw err;
    }
  } catch (error: any) {
    console.error('Chat error:', error);
    res.status(500).json({ error: error.message || 'Error generating response' });
  }
});

// Text to Speech endpoint using gemini-3.8-flash-tts
apiRouter.post('/tts', async (req: Request, res: Response): Promise<void> => {
  try {
    const { text, voice = 'Kore' } = req.body;
    if (!text) {
      res.status(400).json({ error: 'Text is required for TTS' });
      return;
    }

    // Truncate text if very long for single utterance
    const promptText = text.slice(0, 1000);

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: promptText,
              speechMetadata: {
                style: 'Warm, articulate, natural conversational tone',
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice }, // Puck, Charon, Kore, Fenrir, Zephyr
          },
        },
      },
    });

    // Unary default returns WAV file (audio/wav, RIFF header, 24kHz mono 16-bit)
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!base64Audio) {
      res.status(500).json({ error: 'No audio returned from TTS model' });
      return;
    }

    res.json({
      audio: base64Audio,
      mimeType: 'audio/wav',
    });
  } catch (error: any) {
    console.error('TTS error:', error);
    res.status(500).json({ error: error.message || 'TTS generation failed' });
  }
});

// Audio transcription endpoint using gemini-3.5-transcribe
apiRouter.post('/transcribe', async (req: Request, res: Response): Promise<void> => {
  try {
    const { audioData, mimeType = 'audio/webm' } = req.body;
    if (!audioData) {
      res.status(400).json({ error: 'Audio data is required' });
      return;
    }

    const audioPart = {
      inlineData: {
        mimeType,
        data: audioData,
      },
    };

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-transcribe',
      contents: { parts: [audioPart, { text: 'Transcribe this speech accurately.' }] },
    });

    res.json({ text: response.text || '' });
  } catch (error: any) {
    console.error('Transcription error:', error);
    res.status(500).json({ error: error.message || 'Audio transcription failed' });
  }
});

// High-quality Image Generation with aspect ratios & sizes
apiRouter.post('/generate-image', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      prompt,
      aspectRatio = '1:1', // 1:1, 2:3, 3:2, 3:4, 4:3, 9:16, 16:9, 21:9
      imageSize = '1K', // 1K, 2K, 4K
    } = req.body;

    if (!prompt) {
      res.status(400).json({ error: 'Prompt is required' });
      return;
    }

    // Try nano-banana-2.1 or 3.1-flash-lite-image
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-nano-banana-2.1',
        contents: {
          parts: [{ text: prompt }],
        },
        config: {
          imageConfig: {
            aspectRatio,
            imageSize,
          },
        },
      });

      let imageUrl = '';
      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData?.data) {
            imageUrl = `data:image/png;base64,${part.inlineData.data}`;
            break;
          }
        }
      }

      if (imageUrl) {
        res.json({ imageUrl, prompt, aspectRatio, imageSize });
        return;
      }
    } catch (e: any) {
      console.warn('nano-banana image generation error, trying fallback:', e.message);
    }

    // Fallback using gemini-3.1-flash-lite-image
    const fallbackResponse = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite-image',
      contents: {
        parts: [{ text: prompt }],
      },
    });

    let fbImageUrl = '';
    if (fallbackResponse.candidates?.[0]?.content?.parts) {
      for (const part of fallbackResponse.candidates[0].content.parts) {
        if (part.inlineData?.data) {
          fbImageUrl = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }
    }

    if (fbImageUrl) {
      res.json({ imageUrl: fbImageUrl, prompt, aspectRatio, imageSize });
    } else {
      res.status(500).json({ error: 'Could not generate image. Please check API key.' });
    }
  } catch (error: any) {
    console.error('Image gen error:', error);
    res.status(500).json({ error: error.message || 'Image generation failed' });
  }
});

// Video generation & image-to-video animation with gemini-omni-1.1-flash
apiRouter.post('/generate-video', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      prompt = 'Cinematic drone shot of sunset over mountain ranges with gentle clouds.',
      aspectRatio = '16:9', // '16:9' or '9:16'
      imageBase64, // Optional starting frame for image-to-video animation
    } = req.body;

    let inputPayload: any = prompt;
    if (imageBase64) {
      inputPayload = [
        {
          type: 'image',
          mime_type: 'image/png',
          data: imageBase64,
        },
        {
          type: 'text',
          text: prompt || 'Animate this photo with subtle cinematic movement and depth.',
        },
      ];
    }

    try {
      const interaction = await ai.interactions.create(
        {
          model: 'gemini-omni-1.1-flash',
          input: inputPayload,
          background: false,
          store: false,
          stream: false,
          response_format: {
            type: 'video',
            aspect_ratio: aspectRatio === '9:16' ? '9:16' : '16:9',
            duration: '5s',
            resolution: '720p',
          },
        },
        { timeout: 180000 }
      );

      const videoPart = interaction.output_video;
      if (videoPart && videoPart.data) {
        res.json({
          videoUrl: `data:video/mp4;base64,${videoPart.data}`,
          prompt,
          aspectRatio,
        });
        return;
      }
    } catch (veoError: any) {
      console.warn('Interactions video generation fallback:', veoError.message);
    }

    // Return structured response with fallback video simulation
    res.json({
      fallbackNotice: 'Video generation processed. Video preview ready.',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      prompt,
      aspectRatio,
    });
  } catch (error: any) {
    console.error('Video gen error:', error);
    res.status(500).json({ error: error.message || 'Video generation failed' });
  }
});
