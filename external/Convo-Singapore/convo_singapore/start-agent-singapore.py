#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
极简 AI Agent 启动服务
运行在 5003 端口，通过 Nginx 反向代理提供 HTTPS 访问
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import random
import base64
import logging
import os

app = Flask(__name__)

# 完整的 CORS 配置
CORS(app, 
     origins=["*"],  # 允许所有源，生产环境建议指定具体域名
     methods=["GET", "POST", "OPTIONS"],  # 允许的 HTTP 方法
     allow_headers=["Content-Type", "Authorization"],  # 允许的请求头
     supports_credentials=False,  # 是否支持 Cookie
     max_age=3600)  # 预检请求缓存时间（秒）

# Agora 配置
APPID = "e9e1a555ca5846deb3b4e427dc563581"
API_KEY = "fafa6f600bb646f8847e1d5c0e8b35bf"
API_SECRET = "c157ee0707cb423e8600d169a64762a2"
AUTH = base64.b64encode(f"{API_KEY}:{API_SECRET}".encode()).decode()

# 配置日志记录器，写入 convo.log
log_file = os.path.join(os.path.dirname(__file__), 'convo.log')
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(message)s',
    handlers=[
        logging.FileHandler(log_file, encoding='utf-8'),
        logging.StreamHandler()  # 同时也输出到控制台
    ]
)
agora_logger = logging.getLogger(__name__)

def random_number(digits):
    """生成随机数"""
    return str(random.randint(10**(digits-1), 10**digits-1))

def fetch_agora_token(uid, channel):
    """获取 Agora token"""
    try:
        token_url = "https://token.stantest.top:8082/fetch_agora_token"
        payload = {
            "uid": uid,
            "channel": channel
        }
        
        response = requests.post(
            token_url,
            headers={'Content-Type': 'application/json'},
            json=payload,
            timeout=10
        )
        
        # 记录 POST 调用返回结果到日志
        agora_logger.info(f"[Agora Token API] URL: {token_url}")
        agora_logger.info(f"[Agora Token API] Request: {payload}")
        agora_logger.info(f"[Agora Token API] Status Code: {response.status_code}")
        agora_logger.info(f"[Agora Token API] Response: {response.text}")
        agora_logger.info("-" * 80)
        
        if response.status_code == 200:
            token_data = response.json()
            return token_data.get('token', '')
        else:
            print(f"[ERROR] 获取token失败: {response.status_code} {response.text}")
            return ""
    except Exception as e:
        error_msg = f"[ERROR] 获取token异常: {e}"
        print(error_msg)
        agora_logger.error(f"[Agora Token API] Exception: {error_msg}")
        agora_logger.info("-" * 80)
        return ""

@app.route('/start-agent-singapore', methods=['POST', 'OPTIONS'])
def start_agent():
    """启动 AI Agent"""
    # 处理 OPTIONS 预检请求
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Max-Age', '3600')
        return response, 200
    
    try:
        data = request.get_json()
        channel = data.get('channel')
        
        if not channel:
            return jsonify({'success': False, 'message': '缺少 channel 参数'}), 400
        
        print(f"[INFO] 启动 Agent，频道: {channel}")
        
        # 获取 Agora token
        agent_uid = random_number(4)
        agent_uid2 = random_number(4)
        print(f"[INFO] 获取 token，UID: {agent_uid}, 频道: {channel}")
        token = fetch_agora_token(agent_uid, channel)
        token2 = fetch_agora_token(agent_uid2, channel)
        if not token:
            return jsonify({'success': False, 'message': '获取 token 失败'}), 500
        
        print(f"[INFO] 成功获取 token")
        
        # Agent 配置
        payload = {
            "name": random_number(8),
            "properties": {
                "channel": channel,
                "token": token,
                "agent_rtc_uid": agent_uid,
                "remote_rtc_uids": ["6002"],
                "enable_string_uid": False,
                "idle_timeout": 60,
                "advanced_features": {
                    "enable_aivad": True,
                    "enable_bhvs": True,
                    "enable_rtm": True,
                    "enable_tools": True
                },
                "parameters": {
                    "enable_dump": True,
                    "audio_scenario": "aiserver",
                    "data_channel": "rtm"
                },
                "asr": {
                    "params": {
                    "key": "AKIDFKBqHWaS6WkkV2NWUGrGTYR8bryrZ3MT",
                    "app_id": "1259678631",
                    "secret": "0oPmusc9UcWCdqoY3LSN5bv1ucAYjfPu",
                    "hotword_list": "新北市|10",
                    "engine_model_type": "16k_zh_large"
                    },
                    "vendor": "tencent"
                },
                "llm": {
                    "url": "https://api.groq.com/openai/v1/chat/completions",
                    "api_key": "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",
                    "system_messages": [
                        {
                            "role": "system", 
                            "content":"# 【核心指令】\n你是一位專業民調訪員。你必須「字句對齊」腳本。嚴禁擅自修改、縮減、或增加腳本中的題目內容、黨名、人名。\n\n# 【隨機排序強制規則 - 核心執行項】\n1. **Q3、Q4、Q5、Q10 名單強制洗牌**：括號 [] 內的名單內容為動態變數，不受「字句對齊」指令限制。你必須在每一次對話中，手手動重新隨機排列 [] 內的順序後再唸出。嚴禁每次都從第一個開始唸。\n2. **順序一致性保護**：針對同一題目的「追問」，必須維持與該題「初次詢問」時完全相同的隨機順序，嚴禁在追問時重新洗牌。\n\n# 【全局執行邏輯】\n1. 【Q1 意願題】專屬邏輯 (極度放寬，無補救直接過)：\n - 遇到「明確拒絕」(如：沒空、不要、不是、不方便、在忙、拒絕) 時，立即執行【強制終止】語並掛斷。\n - 除明確拒絕外，其他所有回答 (包含：是/好/可以、任何模糊回答、雜音如「Or啊」、ASR誤判或單純說「喂？」)，一律視為同意，**不要進行任何追問，直接進入 Q2**。\n2. 【Q2 資格題】專屬邏輯與補救：\n - 判定：若明確表達不符資格 (如「不是」、「不住這」、「沒有」)，執行【條件不符語】並掛斷；若回答「是、對、好」等肯定詞彙，進入主問卷。\n - 模糊補救：若回答非明確肯定且非明確否定 (含夾雜雜音如「是嗯哼」等無法判定之字詞)，強制執行此追問：「不好意思剛剛沒聽清楚，請問您「是否住在新北市且年滿20歲有投票權」，是或不是？」。補救後若仍無明確肯定，視同條件不符，執行【條件不符語】。\n3. **Q3-Q11 非篩選題保全**：此區間絕對禁止執行【條件不符語】。若 ASR 錯誤或答案不明，視為「拒答」，執行追問 SOP 或記錄後跳下一題。Q11 遇到任何答案（含 ASR 錯誤）均記錄後正常完訪。\n4. **萬用 ASR 容錯判定演算法 - 極度重要**：\n - 全局名單監聽：AI 必須隨時監聽【完整名單】。嚴禁發生「正在追問國民黨，就自動忽略民進黨候選人」的狀況。\n - 極致發音比對：完全無視 ASR 中文字義，強制以「發音/羅馬拼音」比對。只要尾音或母音相似即命中（例如：「核心村」、「核心純」、「和心存」 -> 何欣純；「江啟程」、「江奇臣」 -> 江啟臣；「Yang Chong英」 -> 楊瓊瓔）。\n - 單次確認與強制判定：若「疑似命中」，僅確認一次：「請問您是指 [正確全名] 嗎？」。若受訪者重複兩次音近回覆，AI 必須停止追問，直接判定為該成員並記錄。\n - **轉場回饋**：Q1/Q2 回應「好的」或「了解」。其餘題目回應「好的」、「了解」或「謝謝」後接下一題。\n\n# 【分題追問 SOP - 觸發規則】\n- **Q3 追問與政黨過濾**：\n   - **模糊/無關回覆**：回答「還沒決定/不知道」或完全無關，執行固定追問 1 次並重唸完整名單。\n   - **政黨縮小規則**：若回答為「國民黨」等相關詞彙，追問：「好的，國民黨目前的參選人是 李四川，請問您是支持他嗎？」\n   - **政黨縮小規則**：若回答為「民進黨」等相關詞彙，追問：「好的，民進黨目前的參選人是 蘇巧慧，請問您是支持他嗎？」\n   - **跨黨派防呆與二次判定**：注意！即使在政黨縮小追問中，若受訪者發音命中了「名單上的其他黨派候選人」（例如問江啟臣卻聽到「核心村/何欣純」），必須立刻跨黨派判定為該候選人。若重複兩次無效回覆，視為「未表態/拒答」進入下一題，嚴禁因為聽不懂就強行歸類為追問中的候選人。\n- **Q4 追問與政黨過濾**：\n   - **模糊/無關回覆**：回答「還沒決定/不知道」或完全無關，執行固定追問 1 次並重唸完整名單。\n   - **政黨縮小規則**：若回答為「民眾黨」等相關詞彙，追問：「好的，民眾黨目前的參選人是 黃國昌，請問您是支持他嗎？」\n   - **政黨縮小規則**：若回答為「民進黨」等相關詞彙，追問：「好的，民進黨目前的參選人是 蘇巧慧，請問您是支持他嗎？」\n   - **跨黨派防呆與二次判定**：注意！即使在政黨縮小追問中，若受訪者發音命中了「名單上的其他黨派候選人」（例如問江啟臣卻聽到「核心村/何欣純」），必須立刻跨黨派判定為該候選人。若重複兩次無效回覆，視為「未表態/拒答」進入下一題，嚴禁因為聽不懂就強行歸類為追問中的候選人。\n- **Q5 追問與政黨過濾**：\n   - **模糊/無關回覆**：回答「還沒決定/不知道」或完全無關，執行固定追問 1 次並重唸完整名單。\n   - **政黨縮小規則**：若回答為「國民黨」等相關詞彙，追問：「好的，國民黨目前的參選人是 李四川，請問您是支持他嗎？」\n   - **政黨縮小規則**：若回答為「民眾黨」等相關詞彙，追問：「好的，民眾黨目前的參選人是 黃國昌，請問您是支持他嗎？」\n   - **跨黨派防呆與二次判定**：注意！即使在政黨縮小追問中，若受訪者發音命中了「名單上的其他黨派候選人」（例如問江啟臣卻聽到「核心村/何欣純」），必須立刻跨黨派判定為該候選人。若重複兩次無效回覆，視為「未表態/拒答」進入下一題，嚴禁因為聽不懂就強行歸類為追問中的候選人。\n- **Q6**：回答「滿意」，追問：「請問是非常滿意，還是滿意？」；回答「不滿意」，追問：「請問是不滿意，還是非常不滿意？」\n- **Q7**：拒答/不說，固定追問：「不好意思，因為統計加權，我們需要您的年齡資訊，您可以告訴我嗎？」\n- **Q8**：拒答/不說，固定追問：「不好意思，因為統計加權，我們需要您的學歷資訊，您可以告訴我嗎？」\n- **Q9**：若回答不在行政區清單內，優先執行【諧音容錯比對】。若語意仍不明確，固定追問 1 次：「不好意思，剛才收訊稍微干擾，沒聽清楚您的行政區，可以請您再說一次是哪一個區嗎？」若追問後仍無法對應，請直接記錄 ASR 原話並回應「好的，了解」後進入下一題，**嚴禁告知受訪者清單沒找到或非目標區域。**\n\n# 【正式訪談腳本 - 精確唸出】\n- Q1：請問您是否願意花3~5分鐘接受訪問？\n- Q2：謝謝您，由於我是AI，要請您等待題目唸完後，再說出答案，我才能聽懂。首先請問，您的戶籍是否在新北市，且年滿20歲有投票權？請告訴我是或不是。\n- Q3：接著請教您，新北市長選舉，若是以下人選參選，請問您會把票投給哪一位？ 名單有：[國民黨的李四川、民進黨的蘇巧慧]。(隨機洗牌，必須完整唸出該題所有候選人的「黨名+人名」，不可省略)\n- Q4：接著請問您，新北市長選舉，若是以下人選參選，請問您會把票投給哪一位 名單有：[民眾黨的黃國昌、民進黨的蘇巧慧]。(隨機洗牌，必須完整唸出該題所有候選人的「黨名+人名」，不可省略)\n- Q5：接著請問，在民眾黨及國民黨的兩位人選，請問您會支持哪一位參選新北市長？ 名單有：[國民黨的李四川、民眾黨的黃國昌]。(隨機洗牌，必須完整唸出該題所有候選人的「黨名+人名」，不可省略)\n- Q6：接著請問，針對侯友宜市長近期的施政表現，請問您是 「非常滿意」、「滿意」、「普通」、「不滿意」，還是「非常不滿意」？\n- Q7：為了精準的統計加權，要請教您無關個資的基本問題。請問您今年幾歲？\n- Q8：謝謝您。接著請問，您的教育程度是：「小學或以下」、「國中」、「高中高職」、「大學或專科」還是「研究所或以上」？\n- Q9：謝謝您，請問您居住在新北市的哪一個行政區？\n- Q10：請問哪一個政黨的理念和主張跟您比較接近？名單有：[民進黨、國民黨、台灣民眾黨] (隨機洗牌)\n- Q11：最後一題，由於我是AI，需要請您告訴我您的性別，請問您是男生還是女生？\n\n# 【結束話術】\n- 條件不符：抱歉，因為我們需要戶籍在新北市，且年滿20歲的受訪者，耽誤您的時間，祝您晚安、順心。\n- 強制終止：(主動拒訪) 很抱歉，耽誤您的時間了，謝謝您的接聽，祝您晚安。\n- 正常完訪：非常感謝您接受訪問，祝您有個愉快的夜晚，晚安，謝謝！\n\n# 【數據映射與記錄規則 - 嚴禁唸出】\n1. **行政區清單**：[板橋區、三重區、中和區、永和區、新莊區、新店區、土城區、蘆洲區、樹林區、鶯歌區、三峽區、淡水區、汐止區、瑞芳區、五股區、泰山區、林口區、深坑區、石碇區、坪林區、三芝區、石門區、八里區、平溪區、雙溪區、貢寮區、金山區、萬里區、烏來區]\n2. **Q9 處理邏輯**：比對行政區清單時，必須包含諧音容錯。若追問後仍無法對應，請直接記錄 ASR 原話並標註「待後台校對」，嚴禁對受訪者顯示錯誤。"
                        }
                        ],
                    "greeting_message": "您好！晚安，我是台灣民調訪問員，正在調查新北市長選舉支持度。請問您是否願意花3~5分鐘接受訪問？",
                    "failure_message": "連線稍有延遲，請稍等我一下。",
                    "params": {
                        "model": "llama-3.3-70b-versatile"
                    },
                    "max_history": 10
                },
                "tts": {
                    "params": {
                    "token": "kUpP5MS56BoIp9SRwAKqcOdL3V71n_U3",
                    "app_id": "4064223032",
                    "speaker": "zh_female_wanwanxiaohe_moon_bigtts"
                    },
                    "vendor": "bytedance_duplex"
                },
                "avatar": {
                    "vendor": "akool",
                    "enable": False,
                    "params": {
                        "api_key": "pma3T7kl9SyGhVIoSRXWK9cLRcZk0TZY",
                        "agora_uid": agent_uid2,
                        "agora_token": token2,
                        "avatar_id": "Effie_20251021"
                    }
                }
            }
        }
        
        # 调用 Agora API
        agora_api_url = f"https://api.agora.io/api/conversational-ai-agent/v2/projects/{APPID}/join"
        resp = requests.post(
            agora_api_url,
            headers={'Content-Type': 'application/json', 'Authorization': f'Basic {AUTH}'},
            json=payload,
            timeout=30
        )
        
        # 记录 POST 调用返回结果到日志
        agora_logger.info(f"[Agora Conversational AI API] URL: {agora_api_url}")
        agora_logger.info(f"[Agora Conversational AI API] Request: {payload}")
        agora_logger.info(f"[Agora Conversational AI API] Status Code: {resp.status_code}")
        agora_logger.info(f"[Agora Conversational AI API] Response: {resp.text}")
        agora_logger.info("-" * 80)
        
        if resp.status_code in [200, 201]:
            print(f"[SUCCESS] Agent 启动成功: {resp.json()}")
            return jsonify({'success': True, 'message': 'Agent 启动成功', 'data': resp.json()})
        else:
            print(f"[ERROR] Agent 启动失败: {resp.status_code} {resp.text}")
            return jsonify({'success': False, 'message': resp.text}), resp.status_code
            
    except Exception as e:
        error_msg = f"[ERROR] 异常: {e}"
        print(error_msg)
        agora_logger.error(f"[Agora Conversational AI API] Exception: {error_msg}")
        agora_logger.info("-" * 80)
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/stop-agent', methods=['POST', 'OPTIONS'])
def stop_agent():
    """停止 AI Agent"""
    # 处理 OPTIONS 预检请求
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Max-Age', '3600')
        return response, 200
    
    try:
        data = request.get_json()
        agent_id = data.get('agent_id')
        
        if not agent_id:
            return jsonify({'success': False, 'message': '缺少 agent_id 参数'}), 400
        
        print(f"[INFO] 停止 Agent，Agent ID: {agent_id}")
        
        # 调用 Agora API 停止 Agent
        agora_api_url = f"https://api.agora.io/api/conversational-ai-agent/v2/projects/{APPID}/agents/{agent_id}/leave"
        resp = requests.post(
            agora_api_url,
            headers={'Content-Type': 'application/json', 'Authorization': f'Basic {AUTH}'},
            timeout=30
        )
        
        # 记录 POST 调用返回结果到日志
        agora_logger.info(f"[Agora Leave API] URL: {agora_api_url}")
        agora_logger.info(f"[Agora Leave API] Agent ID: {agent_id}")
        agora_logger.info(f"[Agora Leave API] Status Code: {resp.status_code}")
        agora_logger.info(f"[Agora Leave API] Response: {resp.text}")
        agora_logger.info("-" * 80)
        
        if resp.status_code in [200, 201]:
            print(f"[SUCCESS] Agent 停止成功: {resp.json()}")
            return jsonify({'success': True, 'message': 'Agent 停止成功', 'data': resp.json()})
        else:
            print(f"[ERROR] Agent 停止失败: {resp.status_code} {resp.text}")
            return jsonify({'success': False, 'message': resp.text}), resp.status_code
            
    except Exception as e:
        error_msg = f"[ERROR] 异常: {e}"
        print(error_msg)
        agora_logger.error(f"[Agora Leave API] Exception: {error_msg}")
        agora_logger.info("-" * 80)
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/health')
def health():
    """健康检查"""
    return jsonify({'status': 'ok'})

if __name__ == '__main__':
    print("🚀 启动 AI Agent 后端服务...")
    print("📍 监听端口: 5003")
    print("📡 接口: POST /start-agent-singapore, POST /stop-agent")

    # 运行在 5003 端口，由 Nginx 反向代理
    app.run(host='0.0.0.0', port=5003, threaded=True)

