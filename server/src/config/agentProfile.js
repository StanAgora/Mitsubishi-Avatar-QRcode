// Builds the `properties` object for the Conversational AI Agent Engine
// "join" call from env vars, so ASR/LLM/TTS/Avatar credentials and prompts
// never live in source. Adjust the vendor-specific field names here if the
// underlying vendor (ASR/TTS/Avatar) changes.

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Cantonese (hk) uses its own prompt file since it needs a dedicated
// persona/dialect script; other languages keep sharing external/prompt.md.
const SYSTEM_PROMPT_FILE_BY_LANGUAGE = {
  hk: 'prompt-hk.md',
}

function loadSystemPrompt(language) {
  if (process.env.LLM_SYSTEM_PROMPT) return process.env.LLM_SYSTEM_PROMPT
  const fileName = SYSTEM_PROMPT_FILE_BY_LANGUAGE[language] || 'prompt.md'
  const promptPath = join(__dirname, '../../../external', fileName)
  return readFileSync(promptPath, 'utf-8')
}

// ASR language is shared across ja/en/zh via ASR_LANGUAGE (existing
// behavior); hk gets its own zh-HK override since Cantonese needs a
// distinct ASR language code.
const ASR_LANGUAGE_OVERRIDE_BY_LANGUAGE = {
  hk: 'zh-HK',
}

function asrConfig(language) {
  return {
    vendor: process.env.ASR_VENDOR || 'ares',
    language: ASR_LANGUAGE_OVERRIDE_BY_LANGUAGE[language] || process.env.ASR_LANGUAGE || 'ja-JP',
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
  hk: {
    withName: '歡迎閣下光臨，{{XXX}}，我係三菱嘅AI助手 Inspire。請問想搵邊位，定有其他嘢可以幫到你？',
    noName: '歡迎閣下光臨，我係三菱嘅AI助手 Inspire。請問想搵邊位，定有其他嘢可以幫到你？',
  },
}

const FAILURE_BY_LANGUAGE = {
  ja: '申し訳ございません、もう一度お問い合わせ内容をお伝えいただけますでしょうか？',
  en: "I'm sorry, could you please tell me again what you'd like help with?",
  zh: '非常抱歉，可以请您再说一次您的问题吗？',
  hk: '唔好意思，唔該你再講一次想搵咩幫手呀？',
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
        content: loadSystemPrompt(language),
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
  hk: { voice_id: 'Cantonese_ProfessionalHost（F)', language_boost: 'Chinese,Yue', vol: 1.6 },
}

// Cantonese runs on its own MiniMax key/model/group_id (TTS_HK_* env vars),
// so it doesn't share the shared TTS_* account used by ja/en/zh.
function ttsConfig(language) {
  const voice = TTS_VOICE_BY_LANGUAGE[language] || TTS_VOICE_BY_LANGUAGE.ja
  const isHk = language === 'hk'
  return {
    vendor: process.env.TTS_VENDOR || 'minimax',
    params: {
      key: (isHk && process.env.TTS_HK_KEY) || process.env.TTS_KEY,
      url: (isHk && process.env.TTS_HK_URL) || process.env.TTS_URL || 'wss://api-uw.minimax.io/ws/v1/t2a_v2',
      model: (isHk && process.env.TTS_HK_MODEL) || process.env.TTS_MODEL || 'speech-02-turbo',
      group_id: (isHk && process.env.TTS_HK_GROUP_ID) || process.env.TTS_GROUP_ID,
      voice_setting: {
        voice_id: voice.voice_id,
        sample_rate: Number(process.env.TTS_SAMPLE_RATE || 16000),
        ...(voice.vol ? { vol: voice.vol } : {}),
        ...(isHk ? { speed: Number(process.env.TTS_HK_SPEED || 1) } : {}),
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
    asr: asrConfig(language),
    llm: llmConfig(visitorName, language),
    tts: ttsConfig(language),
    avatar: avatarConfig({ avatarUid, avatarToken }),
  }
}
