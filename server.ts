import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '15mb' }));

  const getAiClient = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return null;
    }
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  };

  /**
   * POST /api/intro/generate-video
   * Generates a 16:9 anime opening cutscene video of Florie at Maplewood High School's entrance
   * using gemini-omni-1.2-flash via the Interactions API.
   */
  app.post('/api/intro/generate-video', async (_req, res) => {
    try {
      const ai = getAiClient();
      if (!ai) {
        res.status(400).json({
          error: 'Clé API Gemini non configurée.',
        });
        return;
      }

      const florieImgPath = path.resolve(
        __dirname,
        'public/assets/aistudio/Florie_fb6f2606.jpg'
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const inputItems: any[] = [];
      if (fs.existsSync(florieImgPath)) {
        const imgBase64 = fs.readFileSync(florieImgPath).toString('base64');
        inputItems.push({
          type: 'image',
          mime_type: 'image/jpeg',
          data: imgBase64,
        });
      }

      inputItems.push({
        type: 'text',
        text:
          '2D Japanese anime opening cutscene in vibrant high-detail cel-shaded style. ' +
          'The protagonist Florie (short wavy dark-brown bob hair with two yellow-gold hair clips on her right side, ' +
          'warm brown anime eyes, cream long-sleeve collared blouse under a dark chocolate-brown plaid pinafore dress, ' +
          'cream thigh-high stockings with two dark-brown stripes at the top cuff) stands in front of the grand red-brick ' +
          'neo-classical entrance of Maplewood High School with white fluted columns, triangular pediment, gold MAPLEWOOD HIGH SCHOOL sign, ' +
          'and glass double doors. She looks directly at the viewer with a radiant happy anime smile, waves her right hand warmly to greet ' +
          'the player, and then cheerfully beckons the viewer with her hand to follow her inside the school entrance while golden sunlight ' +
          'and soft sparkles float in the courtyard.',
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const interaction = await (ai as any).interactions.create({
        model: 'gemini-omni-1.2-flash',
        input: inputItems,
        response_format: {
          type: 'video',
          aspect_ratio: '16:9',
          duration: '10s',
          resolution: '720p',
        },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const outputs: any[] = interaction?.outputs || [];
      const videoOutput = outputs.find((o) => o.type === 'video' && o.data);
      if (!videoOutput) {
        res.status(502).json({
          error: 'Aucune sortie vidéo retournée par le modèle.',
        });
        return;
      }

      const mimeType = videoOutput.mime_type || 'video/mp4';
      res.json({
        videoUrl: `data:${mimeType};base64,${videoOutput.data}`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de la génération vidéo.';
      res.status(500).json({ error: msg });
    }
  });

  /**
   * POST /api/intro/voice
   * Synthesizes Florie's cheerful female French voice line using gemini-3.8-flash-tts via Interactions API.
   */
  app.post('/api/intro/voice', async (req, res) => {
    try {
      const ai = getAiClient();
      if (!ai) {
        res.status(400).json({ error: 'Clé API Gemini non configurée.' });
        return;
      }

      const text =
        typeof req.body?.text === 'string' && req.body.text.trim().length > 0
          ? req.body.text.trim()
          : "Salut ! Bienvenue à Maplewood ! Je m'appelle Florie ! Allez viens, suis-moi !";

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const interaction = await (ai as any).interactions.create({
        model: 'gemini-3.8-flash-tts',
        input:
          `Dis avec une voix féminine d'anime très enjouée, souriante, chaleureuse et pleine d'énergie : "${text}"`,
        response_format: {
          type: 'audio',
        },
        generation_config: {
          speech_config: [
            {
              language: 'fr-FR',
              voice: 'Kore',
            },
          ],
        },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const outputs: any[] = interaction?.outputs || [];
      const audioOutput = outputs.find((o) => o.type === 'audio' && o.data);
      if (!audioOutput) {
        res.status(502).json({ error: 'Aucune sortie audio retournée.' });
        return;
      }

      const mimeType = audioOutput.mime_type || 'audio/wav';
      res.json({
        audioUrl: `data:${mimeType};base64,${audioOutput.data}`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur TTS.';
      res.status(500).json({ error: msg });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*all', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

void startServer();
