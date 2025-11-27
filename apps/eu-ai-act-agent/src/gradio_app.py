#!/usr/bin/env python3
"""
EU AI Act Compliance Agent - Gradio UI
Interactive web interface for EU AI Act compliance assessment
"""

import gradio as gr
import requests
import json
import os
from typing import List, Tuple
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# API Configuration
API_URL = os.getenv("API_URL", "http://localhost:3001")
API_TIMEOUT = 60  # seconds

def chat_with_agent(message: str, history: List[List[str]]) -> Tuple[str, List[List[str]]]:
    """
    Send a message to the EU AI Act agent and get a streaming response
    
    Args:
        message: User's input message
        history: Chat history [[user_msg, bot_msg], ...]
        
    Returns:
        Tuple of (empty string, updated history)
    """
    if not message.strip():
        return "", history
    
    try:
        # Convert Gradio history format to API format
        api_history = []
        for user_msg, bot_msg in history:
            api_history.append({"role": "user", "content": user_msg})
            if bot_msg:
                api_history.append({"role": "assistant", "content": bot_msg})
        
        # Make streaming request to API
        response = requests.post(
            f"{API_URL}/api/chat",
            json={"message": message, "history": api_history},
            stream=True,
            timeout=API_TIMEOUT,
        )
        
        if response.status_code != 200:
            error_msg = f"⚠️ Error: API returned status {response.status_code}"
            return "", history + [[message, error_msg]]
        
        # Collect streamed response
        bot_response = ""
        for line in response.iter_lines():
            if line:
                line_str = line.decode('utf-8')
                if line_str.startswith('data: '):
                    try:
                        data = json.loads(line_str[6:])  # Remove 'data: ' prefix
                        if data.get("type") == "text":
                            bot_response += data.get("content", "")
                        elif data.get("type") == "done":
                            break
                    except json.JSONDecodeError:
                        continue
        
        # Add to history
        history.append([message, bot_response])
        return "", history
        
    except requests.exceptions.ConnectionError:
        error_msg = "⚠️ Cannot connect to API server. Make sure it's running on http://localhost:3001"
        return "", history + [[message, error_msg]]
    except requests.exceptions.Timeout:
        error_msg = "⚠️ Request timed out. The agent might be processing a complex query."
        return "", history + [[message, error_msg]]
    except Exception as e:
        error_msg = f"⚠️ Error: {str(e)}"
        return "", history + [[message, error_msg]]

def check_api_status() -> str:
    """Check if the API server is running"""
    try:
        response = requests.get(f"{API_URL}/health", timeout=5)
        if response.status_code == 200:
            data = response.json()
            return f"✅ API Server: {data.get('service')} v{data.get('version')}"
        else:
            return f"⚠️ API Server returned status {response.status_code}"
    except requests.exceptions.ConnectionError:
        return "❌ API Server not running. Start it with: pnpm dev"
    except Exception as e:
        return f"❌ Error: {str(e)}"

def get_example_queries() -> List[List[str]]:
    """Get example queries for the interface"""
    return [
        ["What is the EU AI Act?"],
        ["Analyze OpenAI's EU AI Act compliance"],
        ["Is a recruitment screening AI considered high-risk?"],
        ["What are the compliance requirements for chatbots?"],
        ["Generate compliance documentation for a recommendation system"],
        ["What's the timeline for EU AI Act enforcement?"],
    ]

# Create Gradio interface
with gr.Blocks(
    title="🇪🇺 EU AI Act Compliance Agent",
    theme=gr.themes.Soft(
        primary_hue="blue",
        secondary_hue="indigo",
    ),
    css="""
        .header {
            text-align: center;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 10px;
            margin-bottom: 20px;
        }
        .header h1 {
            margin: 0;
            font-size: 2.5em;
        }
        .header p {
            margin: 10px 0 0 0;
            opacity: 0.9;
        }
        .status-box {
            padding: 10px;
            border-radius: 5px;
            margin-bottom: 10px;
        }
    """
) as demo:
    
    # Header
    gr.HTML("""
        <div class="header">
            <h1>🇪🇺 EU AI Act Compliance Agent</h1>
            <p>Your intelligent assistant for navigating European AI regulation</p>
        </div>
    """)
    
    # Main content
    with gr.Row():
        with gr.Column(scale=2):
            # Chat interface
            chatbot = gr.Chatbot(
                label="Chat with EU AI Act Expert",
                height=500,
                show_label=True,
                avatar_images=(None, "🇪🇺"),
            )
            
            with gr.Row():
                msg = gr.Textbox(
                    placeholder="Ask about EU AI Act compliance, risk classification, or documentation...",
                    show_label=False,
                    scale=9,
                )
                submit = gr.Button("Send", variant="primary", scale=1)
            
            gr.Examples(
                examples=get_example_queries(),
                inputs=msg,
                label="💡 Example Questions",
            )
        
        with gr.Column(scale=1):
            # Sidebar
            gr.Markdown("### 📊 Quick Info")
            
            gr.Markdown("""
            **Risk Categories:**
            - 🔴 Unacceptable Risk
            - 🟠 High Risk
            - 🟡 Limited Risk
            - 🟢 Minimal Risk
            
            **Key Features:**
            - Organization profiling
            - AI system discovery
            - Risk classification
            - Gap analysis
            - Document generation
            
            **Timeline:**
            - Feb 2, 2025: Banned AI takes effect
            - Aug 2, 2026: High-risk obligations
            - Aug 2, 2027: Full enforcement
            """)
            
            status = gr.Textbox(
                label="API Status",
                value=check_api_status(),
                interactive=False,
                max_lines=2,
            )
            
            refresh_btn = gr.Button("🔄 Refresh Status", size="sm")
            clear_btn = gr.Button("🗑️ Clear Chat", size="sm")
    
    # Footer
    gr.Markdown("""
    ---
    <div style="text-align: center; opacity: 0.7;">
        <p>Built for the MCP 1st Birthday Hackathon 🎂</p>
        <p>Powered by Vercel AI SDK v5 + Gradio + EU AI Act MCP Server</p>
    </div>
    """)
    
    # Event handlers
    msg.submit(chat_with_agent, [msg, chatbot], [msg, chatbot])
    submit.click(chat_with_agent, [msg, chatbot], [msg, chatbot])
    refresh_btn.click(lambda: check_api_status(), None, status)
    clear_btn.click(lambda: [], None, chatbot)

# Launch the app
if __name__ == "__main__":
    print("\n" + "="*60)
    print("🇪🇺 EU AI Act Compliance Agent - Gradio UI")
    print("="*60)
    print(f"\n📡 API Server: {API_URL}")
    print(f"✓ Status: {check_api_status()}")
    print(f"\n🚀 Starting Gradio interface...")
    print("="*60 + "\n")
    
    demo.launch(
        server_name="0.0.0.0",
        server_port=7860,
        share=False,
        show_error=True,
    )

