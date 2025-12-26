
import { blobToBase64 } from './audio';
import { Message } from '../types';

// 默认使用的 Key (仅作兜底，建议用户在设置中输入自己的)
export const DEFAULT_KEY = "966cec8673c747d9af68fd11ae5226f9.DufxR7EdpFZQmihL";

/**
 * 生成智谱 AI 鉴权 Token (JWT 模拟)
 */
export const generateToken = async (apiKey: string): Promise<string> => {
  try {
    const [id, secret] = apiKey.split('.');
    if (!id || !secret) throw new Error('API Key 格式错误，应为 "id.secret"');

    const now = Date.now();
    const header = { alg: 'HS256', sign_type: 'SIGN' };
    const payload = {
      api_key: id,
      exp: now + 3600 * 1000, 
      timestamp: now,
    };

    const encode = (obj: any) => btoa(JSON.stringify(obj)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    
    const encodedHeader = encode(header);
    const encodedPayload = encode(payload);
    const data = `${encodedHeader}.${encodedPayload}`;

    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const msgData = encoder.encode(data);

    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', key, msgData);
    const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    return `${data}.${encodedSignature}`;
  } catch (e) {
    console.error("Token 生成失败:", e);
    throw new Error("鉴权 Token 生成失败，请检查 API Key 格式");
  }
};

/**
 * 发送语音消息到 GLM-4-Voice
 */
export const sendVoiceMessage = async (
  apiKey: string,
  audioBlob: Blob, 
  history: Message[],
  systemPrompt: string | undefined,
  onChunk: (text: string, audio?: string, audioId?: string) => void
) => {
  const currentKey = apiKey || DEFAULT_KEY;
  const token = await generateToken(currentKey);
  const base64Audio = await blobToBase64(audioBlob);

  // 构建消息体
  const messages: any[] = [];

  // 1. 系统提示词 (GLM-4-Voice 建议放在第一条)
  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }

  // 2. 历史记录处理
  history.forEach((msg) => {
    if (msg.role === 'user') {
      // 避免发送空文本历史
      const cleanContent = msg.content?.trim();
      if (cleanContent && cleanContent !== "..." && cleanContent !== "语音消息") {
        messages.push({ role: 'user', content: cleanContent });
      }
    } else if (msg.role === 'assistant') {
      // 智谱语音模型要求历史中的回复必须包含 audio.id 以维持声学上下文
      if (msg.audioId) {
        messages.push({
          role: 'assistant',
          audio: { id: msg.audioId }
        });
      } else if (msg.content) {
        messages.push({ role: 'assistant', content: msg.content });
      }
    }
  });

  // 3. 当前语音输入 (必须是最后一项且为 user role)
  messages.push({
    role: 'user',
    content: [
      {
        type: "input_audio",
        input_audio: {
          data: base64Audio,
          format: "wav"
        }
      }
    ]
  });

  console.debug("发送到智谱的 Payload:", JSON.stringify({ model: 'glm-4-voice', messages }));

  try {
    const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'glm-4-voice',
        messages: messages,
        stream: false 
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const errMsg = errData.error?.message || response.statusText;
      console.error("智谱 API 报错详情:", errData);
      throw new Error(`API 错误 (${response.status}): ${errMsg}`);
    }

    const data = await response.json();
    console.debug("智谱 API 返回数据:", data);

    const choice = data.choices?.[0];
    if (choice) {
      const text = choice.message?.content || "";
      const audioData = choice.message?.audio?.data;
      const audioId = choice.message?.audio?.id || choice.id; 

      onChunk(text, audioData, audioId);
    } else {
      throw new Error("服务器返回数据格式异常 (No choices)");
    }

  } catch (error: any) {
    console.error("请求失败:", error);
    throw error;
  }
};
