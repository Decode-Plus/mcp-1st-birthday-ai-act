#!/usr/bin/env python3
"""
EU AI Act Compliance Agent - Gradio UI
Interactive web interface for EU AI Act compliance assessment
With MCP tool call visualization and multi-model support
"""

import gradio as gr
from gradio import ChatMessage
import requests
import json
import os
from pathlib import Path
from typing import List, Generator, Optional
from dotenv import load_dotenv

# Load environment variables from root .env file
ROOT_DIR = Path(__file__).parent.parent.parent.parent  # Go up from src -> eu-ai-act-agent -> apps -> root
load_dotenv(ROOT_DIR / ".env")

# API Configuration
API_URL = os.getenv("API_URL", "http://localhost:3001")
API_TIMEOUT = 120  # seconds - increased for tool calls

# Model Configuration
AVAILABLE_MODELS = {
    "gpt-5": {
        "name": "GPT-5 (OpenAI)",
        "api_key_env": "OPENAI_API_KEY",
        "description": "OpenAI's most advanced model"
    },
    "grok-4-1": {
        "name": "Grok 4.1 (xAI)",
        "api_key_env": "XAI_API_KEY",
        "description": "xAI's fast reasoning model"
    },
    "claude-4.5": {
        "name": "Claude 4.5 Sonnet (Anthropic)",
        "api_key_env": "ANTHROPIC_API_KEY",
        "description": "Anthropic's latest Claude model"
    }
}

# Current model settings (can be updated via UI)
# SECURITY: Never expose backend API keys - only store user-provided keys for this session
current_model_settings = {
    "model": os.getenv("AI_MODEL", "claude-4.5"),  # Default to Anthropic (hackathon host!)
    # User-provided keys only (NOT from env - backend has its own keys)
    "openai_api_key": "",
    "xai_api_key": "",
    "anthropic_api_key": "",
    "tavily_api_key": ""  # For web research
}

def format_tool_call(tool_name: str, args: dict) -> str:
    """Format a tool call for display"""
    args_str = json.dumps(args, indent=2) if args else "{}"
    return f"""
🔧 **MCP Tool Call: `{tool_name}`**

**Arguments:**
```json
{args_str}
```
"""

def format_tool_result(tool_name: str, result) -> str:
    """Format a tool result for display"""
    # Truncate large results for display
    result_str = json.dumps(result, indent=2) if result else "null"
    if len(result_str) > 1500:
        result_str = result_str[:1500] + "\n... (truncated)"
    
    return f"""
✅ **Tool Result: `{tool_name}`**

<details>
<summary>📋 Click to expand result</summary>

```json
{result_str}
```

</details>
"""

def format_thinking_indicator() -> str:
    """Format a thinking/processing indicator"""
    return "\n\n⏳ *Processing with MCP tools...*\n"

def get_api_headers() -> dict:
    """Get headers with model configuration for API requests
    
    SECURITY: Only pass model selection. API keys are managed by the backend.
    User-provided keys (if any) are only passed when explicitly set in this session.
    Backend uses its own environment keys as primary - we don't expose them here.
    """
    headers = {"Content-Type": "application/json"}
    
    # Pass model selection only
    if current_model_settings["model"]:
        headers["X-AI-Model"] = current_model_settings["model"]
    
    # Only pass user-provided keys (for users who want to use their own keys)
    # Backend will fall back to its own env keys if these are not provided
    model = current_model_settings["model"]
    if model == "gpt-5" and current_model_settings["openai_api_key"]:
        headers["X-OpenAI-API-Key"] = current_model_settings["openai_api_key"]
    elif model == "grok-4-1" and current_model_settings["xai_api_key"]:
        headers["X-XAI-API-Key"] = current_model_settings["xai_api_key"]
    elif model == "claude-4.5" and current_model_settings["anthropic_api_key"]:
        headers["X-Anthropic-API-Key"] = current_model_settings["anthropic_api_key"]
    
    # Tavily API key for web research (optional - backend has its own)
    if current_model_settings["tavily_api_key"]:
        headers["X-Tavily-API-Key"] = current_model_settings["tavily_api_key"]
    
    return headers

def chat_with_agent_streaming(message: str, history: list, initialized_history: list = None) -> Generator:
    """
    Send a message to the EU AI Act agent and stream the response with tool calls
    
    Args:
        message: User's input message
        history: Original chat history for API (without current user message)
        initialized_history: Pre-initialized history with user message and loading (optional)
        
    Yields:
        Updated history with streaming content
    """
    if not message.strip():
        yield initialized_history or history
        return
    
    # Use pre-initialized history or create one
    if initialized_history:
        new_history = list(initialized_history)
    else:
        new_history = list(history) + [
            ChatMessage(role="user", content=message),
            ChatMessage(role="assistant", content="⏳ *Thinking...*")
        ]
    
    try:
        # Convert original history to API format (handle both ChatMessage and dict)
        api_history = []
        for msg in history:
            if isinstance(msg, dict):
                api_history.append({"role": msg.get("role", "user"), "content": msg.get("content", "")})
            else:
                api_history.append({"role": msg.role, "content": msg.content})
        
        # Make streaming request to API with model configuration headers
        response = requests.post(
            f"{API_URL}/api/chat",
            json={"message": message, "history": api_history},
            headers=get_api_headers(),
            stream=True,
            timeout=API_TIMEOUT,
        )
        
        if response.status_code != 200:
            error_msg = f"⚠️ Error: API returned status {response.status_code}"
            new_history[-1] = ChatMessage(role="assistant", content=error_msg)
            yield new_history
            return
        
        # Initialize assistant response
        bot_response = ""
        tool_calls_content = ""
        current_tool_call = None
        
        for line in response.iter_lines():
            if line:
                line_str = line.decode('utf-8')
                print(f"[DEBUG] Received: {line_str[:100]}...")  # Debug log
                if line_str.startswith('data: '):
                    try:
                        data = json.loads(line_str[6:])  # Remove 'data: ' prefix
                        event_type = data.get("type")
                        print(f"[DEBUG] Event type: {event_type}, data: {str(data)[:100]}")
                        
                        if event_type == "text":
                            # Append text chunk
                            bot_response += data.get("content", "")
                            # Update the last message (replaces loading indicator)
                            new_history[-1] = ChatMessage(role="assistant", content=tool_calls_content + bot_response)
                            yield new_history
                            
                        elif event_type == "tool_call":
                            # Show tool call (replaces loading indicator)
                            tool_name = data.get("toolName", "unknown")
                            args = data.get("args", {})
                            tool_calls_content += format_tool_call(tool_name, args)
                            new_history[-1] = ChatMessage(role="assistant", content=tool_calls_content + bot_response + format_thinking_indicator())
                            yield new_history
                            current_tool_call = tool_name
                            
                        elif event_type == "tool_result":
                            # Show tool result
                            tool_name = data.get("toolName", current_tool_call or "unknown")
                            result = data.get("result")
                            tool_calls_content += format_tool_result(tool_name, result)
                            new_history[-1] = ChatMessage(role="assistant", content=tool_calls_content + bot_response)
                            yield new_history
                            current_tool_call = None
                            
                        elif event_type == "step_finish":
                            # Step completed, remove thinking indicator
                            new_history[-1] = ChatMessage(role="assistant", content=tool_calls_content + bot_response)
                            yield new_history
                            
                        elif event_type == "error":
                            error_msg = data.get("error", "Unknown error")
                            bot_response += f"\n\n⚠️ Error: {error_msg}"
                            new_history[-1] = ChatMessage(role="assistant", content=tool_calls_content + bot_response)
                            yield new_history
                            
                        elif event_type == "done":
                            # Final update
                            new_history[-1] = ChatMessage(role="assistant", content=tool_calls_content + bot_response)
                            yield new_history
                            break
                            
                    except json.JSONDecodeError:
                        continue
        
        # Ensure final state
        final_content = tool_calls_content + (bot_response or "No response generated.")
        new_history[-1] = ChatMessage(role="assistant", content=final_content)
        yield new_history
        
    except requests.exceptions.ConnectionError:
        error_msg = "⚠️ Cannot connect to API server. Make sure it's running on http://localhost:3001"
        new_history = new_history + [ChatMessage(role="assistant", content=error_msg)]
        yield new_history
    except requests.exceptions.Timeout:
        error_msg = "⚠️ Request timed out. The agent might be processing a complex query."
        final_content = tool_calls_content + bot_response + "\n\n" + error_msg
        new_history[-1] = ChatMessage(role="assistant", content=final_content)
        yield new_history
    except Exception as e:
        error_msg = f"⚠️ Error: {str(e)}"
        new_history = new_history + [ChatMessage(role="assistant", content=error_msg)]
        yield new_history

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

def get_available_tools() -> str:
    """Get list of available MCP tools"""
    try:
        response = requests.get(f"{API_URL}/api/tools", timeout=5)
        if response.status_code == 200:
            data = response.json()
            tools = data.get("tools", [])
            if tools:
                tool_list = "\n".join([f"• **{t['name']}**" for t in tools])
                return f"**Available MCP Tools:**\n{tool_list}"
            return "No tools available"
        return "Could not fetch tools"
    except:
        return "Could not connect to API"

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
) as demo:
    
    # Custom CSS to hide Gradio footer and style stop button
    gr.HTML("""
    <style>
    /* Hide Gradio's default footer */
    footer { display: none !important; }
    .gradio-container footer { display: none !important; }
    .footer { display: none !important; }
    [data-testid="footer"] { display: none !important; }
    
    /* Style the stop button */
    button.stop {
        background-color: #dc3545 !important;
        border-color: #dc3545 !important;
    }
    button.stop:hover {
        background-color: #c82333 !important;
        border-color: #bd2130 !important;
    }
    </style>
    """)
    
    # Header
    gr.HTML("""
        <div style="text-align: center; padding: 20px 0;">
            <h1 style="margin: 0; font-size: 2em;">🇪🇺 EU AI Act Compliance Agent</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.8;">by <a href="https://www.legitima.ai" target="_blank" style="color: #4CAF50;">Legitima.ai</a></p>
            <p style="margin: 5px 0; font-size: 0.9em; opacity: 0.7;">Your intelligent assistant for navigating European AI regulation</p>
        </div>
    """)
    
    # Main content
    with gr.Row():
        with gr.Column(scale=3):
            # Chat interface - using ChatMessage format
            chatbot = gr.Chatbot(
                label="Chat with EU AI Act Expert",
                height=550,
                show_label=True,
            )
            
            with gr.Row():
                msg = gr.Textbox(
                    placeholder="Ask about EU AI Act compliance, risk classification, or documentation...",
                    show_label=False,
                    scale=8,
                )
                submit = gr.Button("Send", variant="primary", scale=1)
                stop_btn = gr.Button("⏹ Stop", variant="stop", scale=1, visible=False)
            
            gr.Examples(
                examples=get_example_queries(),
                inputs=msg,
                label="💡 Example Questions",
            )
        
        with gr.Column(scale=1):
            # Sidebar
            gr.Markdown("### 🤖 Model Settings")
            
            model_dropdown = gr.Dropdown(
                choices=[(v["name"], k) for k, v in AVAILABLE_MODELS.items()],
                value="claude-4.5",  # Default to Anthropic (hackathon host!)
                label="AI Model",
                info="Select the AI model to use"
            )
            
            # API Key inputs (password fields) - OPTIONAL: Backend has its own keys
            with gr.Accordion("🔑 API Keys (Optional)", open=False):
                gr.Markdown("*Backend uses configured keys by default. Only provide your own keys if you want to override.*")
                
                gr.Markdown("#### 🔍 Research API")
                tavily_key = gr.Textbox(
                    label="Tavily API Key",
                    placeholder="tvly-... (leave empty to use backend key)",
                    type="password",
                    value="",  # Never show existing keys
                    info="Optional - for web research & organization discovery"
                )
                
                gr.Markdown("#### 🤖 AI Model APIs")
                anthropic_key = gr.Textbox(
                    label="Anthropic API Key",
                    placeholder="sk-ant-... (leave empty to use backend key)",
                    type="password",
                    value="",  # Never show existing keys
                    info="Optional - for Claude 4.5 (default model)"
                )
                openai_key = gr.Textbox(
                    label="OpenAI API Key",
                    placeholder="sk-... (leave empty to use backend key)",
                    type="password",
                    value="",  # Never show existing keys
                    info="Optional - for GPT-5"
                )
                xai_key = gr.Textbox(
                    label="xAI API Key",
                    placeholder="xai-... (leave empty to use backend key)",
                    type="password",
                    value="",  # Never show existing keys
                    info="Optional - for Grok 4.1"
                )
                save_keys_btn = gr.Button("💾 Save Keys", variant="secondary", size="sm")
                keys_status = gr.Markdown("")
            
            gr.Markdown("---")
            
            gr.Markdown("### 📊 Quick Reference")
            
            gr.Markdown("""
**Risk Categories:**
- 🔴 **Unacceptable** - Banned
- 🟠 **High Risk** - Strict requirements
- 🟡 **Limited Risk** - Transparency
- 🟢 **Minimal Risk** - No obligations

**Key Deadlines:**
- 📅 Feb 2, 2025: Banned AI
- 📅 Aug 2, 2026: High-risk rules
- 📅 Aug 2, 2027: Full enforcement
            """)
            
            gr.Markdown("---")
            
            tools_info = gr.Markdown(
                value=get_available_tools(),
                label="MCP Tools"
            )
            
            gr.Markdown("---")
            
            status = gr.Textbox(
                label="🔌 API Status",
                value=check_api_status(),
                interactive=False,
                max_lines=2,
            )
            
            with gr.Row():
                refresh_btn = gr.Button("🔄 Refresh", size="sm")
                clear_btn = gr.Button("🗑️ Clear", size="sm")
    
    # Footer
    gr.Markdown("""
---
<div style="text-align: center; opacity: 0.7; font-size: 0.85em;">
    <p>Built for the MCP 1st Birthday Hackathon 🎂</p>
    <p>Powered by Vercel AI SDK v5 + Model Context Protocol + Gradio</p>
</div>
    """)
    
    # Disclaimer box - separate for better visibility
    gr.HTML("""
<style>
.disclaimer-box {
    text-align: center;
    margin: 20px auto;
    padding: 15px 20px;
    max-width: 800px;
    background: #fff3cd !important;
    border: 2px solid #ffc107 !important;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
.disclaimer-box p {
    color: #000000 !important;
    margin: 0;
}
.disclaimer-box strong {
    color: #000000 !important;
}
</style>
<div class="disclaimer-box">
    <p style="font-size: 0.9em; font-weight: 500; margin-bottom: 8px;">
        <strong>⚠️ Disclaimer:</strong> This is a <strong style="background: rgba(255, 193, 7, 0.3); padding: 2px 4px; border-radius: 3px;">demo application (Work in Progress)</strong> and does not constitute legal advice.
    </p>
    <p style="font-size: 0.85em; line-height: 1.4;">
        Always consult with qualified legal professionals before making compliance decisions based on AI outputs.
    </p>
</div>
    """)
    
    # Model and API key handlers
    def update_model(model_value):
        """Update the selected model"""
        current_model_settings["model"] = model_value
        model_info = AVAILABLE_MODELS.get(model_value, {})
        return f"✅ Model set to: **{model_info.get('name', model_value)}**"
    
    def save_api_keys(tavily_val, anthropic_val, openai_val, xai_val):
        """Save user-provided API keys for this session only
        
        SECURITY: These are stored in memory only for this session.
        They are NOT persisted and NOT sent to backend unless user provides them.
        Backend uses its own configured keys by default.
        """
        saved = []
        
        # Only update if a real key is provided
        if tavily_val and len(tavily_val) > 10:
            current_model_settings["tavily_api_key"] = tavily_val
            saved.append("Tavily")
        
        if anthropic_val and len(anthropic_val) > 10:
            current_model_settings["anthropic_api_key"] = anthropic_val
            saved.append("Anthropic")
        
        if openai_val and len(openai_val) > 10:
            current_model_settings["openai_api_key"] = openai_val
            saved.append("OpenAI")
        
        if xai_val and len(xai_val) > 10:
            current_model_settings["xai_api_key"] = xai_val
            saved.append("xAI")
        
        if saved:
            return f"✅ Keys saved for this session: {', '.join(saved)}"
        return "ℹ️ No keys provided (backend will use its configured keys)"
    
    def get_current_model_status():
        """Get current model and key status"""
        model = current_model_settings["model"]
        model_info = AVAILABLE_MODELS.get(model, {})
        required_key = model_info.get("api_key_env", "")
        
        key_status = "❌ Missing"
        if required_key == "OPENAI_API_KEY" and current_model_settings["openai_api_key"]:
            key_status = "✅ Set"
        elif required_key == "XAI_API_KEY" and current_model_settings["xai_api_key"]:
            key_status = "✅ Set"
        elif required_key == "ANTHROPIC_API_KEY" and current_model_settings["anthropic_api_key"]:
            key_status = "✅ Set"
        
        return f"**Model:** {model_info.get('name', model)}\n**Key Status:** {key_status}"
    
    # Event handlers - clear input immediately and stream response together
    def respond_and_clear(message: str, history: list):
        """Wrapper that yields (cleared_input, chat_history, stop_visible) tuples"""
        if not message.strip():
            yield "", history, gr.update(visible=False)
            return
            
        # First yield: clear input, show loading, and show stop button
        model_name = AVAILABLE_MODELS.get(current_model_settings["model"], {}).get("name", current_model_settings["model"])
        initial_history = list(history) + [
            ChatMessage(role="user", content=message),
            ChatMessage(role="assistant", content=f"⏳ *Thinking with {model_name}...*")
        ]
        yield "", initial_history, gr.update(visible=True)
        
        # Stream the actual response (pass initialized_history to avoid duplication)
        for updated_history in chat_with_agent_streaming(message, history, initial_history):
            yield "", updated_history, gr.update(visible=True)
        
        # Final yield: hide stop button when done
        yield "", updated_history, gr.update(visible=False)
    
    def stop_response(history: list):
        """Stop the current response and add a stopped message"""
        if history and len(history) > 0:
            # Check if the last message is still loading/thinking
            last_msg = history[-1]
            if isinstance(last_msg, ChatMessage) and "⏳" in last_msg.content:
                # Update the last message to show it was stopped
                history[-1] = ChatMessage(
                    role="assistant", 
                    content=last_msg.content.replace("⏳", "⏹️") + "\n\n*— Execution stopped by user*"
                )
            elif isinstance(last_msg, ChatMessage):
                # Append stopped message to existing content
                history[-1] = ChatMessage(
                    role="assistant",
                    content=last_msg.content + "\n\n*— Execution stopped by user*"
                )
        # Return history and hide stop button
        return history, gr.update(visible=False)
    
    # On submit/click: clear input immediately while streaming response
    # These events are cancellable by the stop button
    submit_event = msg.submit(respond_and_clear, [msg, chatbot], [msg, chatbot, stop_btn])
    click_event = submit.click(respond_and_clear, [msg, chatbot], [msg, chatbot, stop_btn])
    
    # Stop button cancels the streaming events and updates the chat
    stop_btn.click(
        fn=stop_response,
        inputs=[chatbot],
        outputs=[chatbot, stop_btn],
        cancels=[submit_event, click_event]
    )
    
    refresh_btn.click(
        lambda: (check_api_status(), get_available_tools()), 
        None, 
        [status, tools_info]
    )
    clear_btn.click(lambda: [], None, chatbot)
    
    # Model selection handler
    model_dropdown.change(update_model, [model_dropdown], [keys_status])
    
    # Save keys handler (order matches function signature)
    save_keys_btn.click(save_api_keys, [tavily_key, anthropic_key, openai_key, xai_key], [keys_status])

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
        server_name=os.getenv("GRADIO_SERVER_NAME", "0.0.0.0"),
        server_port=int(os.getenv("GRADIO_SERVER_PORT", "7860")),
        share=os.getenv("GRADIO_SHARE", "false").lower() == "true",
        show_error=True,
    )
