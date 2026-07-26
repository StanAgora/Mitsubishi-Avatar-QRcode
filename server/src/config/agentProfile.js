// Builds the `properties` object for the Conversational AI Agent Engine
// "join" call from env vars, so ASR/LLM/TTS/Avatar credentials and prompts
// never live in source. Adjust the vendor-specific field names here if the
// underlying vendor (ASR/TTS/Avatar) changes.

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

function loadSystemPrompt() {
  if (process.env.LLM_SYSTEM_PROMPT) return process.env.LLM_SYSTEM_PROMPT
  const promptPath = join(__dirname, '../../../external/prompt.md')
  return readFileSync(promptPath, 'utf-8')
}

function asrConfig() {
  return {
    vendor: process.env.ASR_VENDOR || 'ares',
    language: process.env.ASR_LANGUAGE || 'ja-JP',
  }
}

// Selected on the PC's language page (see LanguageSelectPage.jsx), same as
// TTS_VOICE_BY_LANGUAGE below. withName/noName mirror the visitor-name
// substitution that used to be a single {{XXX}} template.
const GREETING_BY_LANGUAGE = {
  ja: {
    withName: 'ご訪問ありがとうございます。{{XXX}}、私は三菱のAIアシスタント、インスパイアです。どなたをお探しですか？それとも、他に何かお手伝いできることはありますか？',
    noName: 'ご訪問ありがとうございます。私は三菱のAIアシスタント、インスパイアです。どなたをお探しですか？それとも、他に何かお手伝いできることはありますか？',
  },
  en: {
    withName: "Thank you for visiting. {{XXX}}, I'm Inspire, Mitsubishi's AI assistant. Who are you looking for today, or is there something else I can help you with?",
    noName: "Thank you for visiting. I'm Inspire, Mitsubishi's AI assistant. Who are you looking for today, or is there something else I can help you with?",
  },
  zh: {
    withName: '感谢您的光临。{{XXX}}，我是三菱的AI助手 Inspire。请问您要找哪位，或者还有什么我可以帮您的吗？',
    noName: '感谢您的光临。我是三菱的AI助手 Inspire。请问您要找哪位，或者还有什么我可以帮您的吗？',
  },
}

const FAILURE_BY_LANGUAGE = {
  ja: '申し訳ございません、もう一度お問い合わせ内容をお伝えいただけますでしょうか？',
  en: "I'm sorry, could you please tell me again what you'd like help with?",
  zh: '非常抱歉，可以请您再说一次您的问题吗？',
}

// `visitorName` comes from the input box on the PC landing page (typed
// before the QR code is shown/scanned). Falls back to a name-less greeting
// when nothing was entered.
function buildGreeting(visitorName, language) {
  const templates = GREETING_BY_LANGUAGE[language] || GREETING_BY_LANGUAGE.ja
  if (visitorName) return templates.withName.replace('{{XXX}}', visitorName)
  return templates.noName
}

function llmConfig(visitorName, language) {
  return {
    url: process.env.LLM_URL,
    api_key: process.env.LLM_API_KEY,
    system_messages: [
      {
        role: 'system',
        content: loadSystemPrompt(),
      },
    ],
    greeting_message: buildGreeting(visitorName, language),
    failure_message: FAILURE_BY_LANGUAGE[language] || FAILURE_BY_LANGUAGE.ja,
    params: {
      model: process.env.LLM_MODEL || 'gpt-4o',
    },
    max_history: Number(process.env.LLM_MAX_HISTORY || 32),
  }
}

// Selected on the PC's language page (see LanguageSelectPage.jsx) right
// after check-in, before the agent starts. Each language maps to its own
// MiniMax voice + language_boost pair.
const TTS_VOICE_BY_LANGUAGE = {
  ja: { voice_id: 'jap_female_1222_1', language_boost: 'Japanese' },
  en: { voice_id: 'jiashu_en_0111_24', language_boost: 'English' },
  zh: { voice_id: 'ai_assistant_008', language_boost: 'Chinese' },
}

function ttsConfig(language) {
  const voice = TTS_VOICE_BY_LANGUAGE[language] || TTS_VOICE_BY_LANGUAGE.ja
  return {
    vendor: process.env.TTS_VENDOR || 'minimax',
    params: {
      key: process.env.TTS_KEY,
      url: process.env.TTS_URL || 'wss://api-uw.minimax.io/ws/v1/t2a_v2',
      model: process.env.TTS_MODEL || 'speech-02-turbo',
      group_id: process.env.TTS_GROUP_ID,
      voice_setting: {
        voice_id: voice.voice_id,
        sample_rate: Number(process.env.TTS_SAMPLE_RATE || 16000),
      },
      language_boost: voice.language_boost,
    },
  }
}

function avatarConfig({ avatarUid, avatarToken }) {
  return {
    vendor: process.env.AVATAR_VENDOR || 'akool',
    enable: process.env.AVATAR_ENABLED !== 'false',
    params: {
      api_key: process.env.AVATAR_API_KEY,
      avatar_id: process.env.AVATAR_ID,
      agora_uid: String(avatarUid),
      agora_token: avatarToken,
    },
  }
}

export function buildAgentProperties({
  channel,
  agentToken,
  agentUid,
  remoteUids,
  avatarUid,
  avatarToken,
  visitorName,
  language,
}) {
  return {
    channel,
    token: agentToken,
    agent_rtc_uid: String(agentUid),
    remote_rtc_uids: remoteUids.map(String),
    enable_string_uid: false,
    idle_timeout: Number(process.env.AGENT_IDLE_TIMEOUT || 60),
    advanced_features: {
      enable_aivad: process.env.ENABLE_AIVAD !== 'false',
      enable_bhvs: process.env.ENABLE_BHVS !== 'false',
      enable_rtm: process.env.ENABLE_RTM !== 'false',
      enable_tools: process.env.ENABLE_TOOLS === 'true',
    },
    parameters: {
      enable_dump: process.env.ENABLE_DUMP === 'true',
      audio_scenario: process.env.AUDIO_SCENARIO || 'aiserver',
      data_channel: process.env.DATA_CHANNEL || 'rtm',
    },
    asr: asrConfig(),
    llm: llmConfig(visitorName, language),
    tts: ttsConfig(language),
    avatar: avatarConfig({ avatarUid, avatarToken }),
  }
}
