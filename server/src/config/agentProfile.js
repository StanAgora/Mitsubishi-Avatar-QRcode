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

function llmConfig() {
  return {
    url: process.env.LLM_URL,
    api_key: process.env.LLM_API_KEY,
    system_messages: [
      {
        role: 'system',
        content: loadSystemPrompt(),
      },
    ],
    greeting_message:
      process.env.LLM_GREETING_MESSAGE ||
      'お電話ありがとうございます。私は三菱のAIアシスタント、インスパイアです。どなたをお探しですか？それとも他に何かお手伝いできることはありますか？',
    failure_message:
      process.env.LLM_FAILURE_MESSAGE || '申し訳ございません、もう一度お問い合わせ内容をお伝えいただけますでしょうか？',
    params: {
      model: process.env.LLM_MODEL || 'gpt-4o',
    },
    max_history: Number(process.env.LLM_MAX_HISTORY || 32),
  }
}

function ttsConfig() {
  return {
    vendor: process.env.TTS_VENDOR || 'minimax',
    params: {
      key: process.env.TTS_KEY,
      url: process.env.TTS_URL || 'wss://api-uw.minimax.io/ws/v1/t2a_v2',
      model: process.env.TTS_MODEL || 'speech-02-turbo',
      group_id: process.env.TTS_GROUP_ID,
      voice_setting: {
        voice_id: process.env.TTS_VOICE_ID || 'jap_female_1222_1',
        sample_rate: Number(process.env.TTS_SAMPLE_RATE || 8000),
      },
      language_boost: process.env.TTS_LANGUAGE_BOOST || 'Japanese',
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

export function buildAgentProperties({ channel, agentToken, agentUid, remoteUids, avatarUid, avatarToken }) {
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
    llm: llmConfig(),
    tts: ttsConfig(),
    avatar: avatarConfig({ avatarUid, avatarToken }),
  }
}
