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
import threading
from pathlib import Path
from typing import List, Generator, Optional
from dotenv import load_dotenv

# Load environment variables from root .env file
ROOT_DIR = Path(__file__).parent.parent.parent.parent  # Go up from src -> eu-ai-act-agent -> apps -> root
load_dotenv(ROOT_DIR / ".env")

# API Configuration
API_URL = os.getenv("API_URL", "http://localhost:3001")
PUBLIC_URL = os.getenv("PUBLIC_URL", "")  # HF Spaces public URL (empty for local dev)
API_TIMEOUT = 600  # seconds - increased for long-running compliance assessments

def get_mcp_url() -> str:
    """Get the MCP server URL based on environment"""
    if PUBLIC_URL:
        # Production: MCP is on the same server via chatgpt_app.py
        return f"{PUBLIC_URL.rstrip('/')}/gradio_api/mcp/"
    return ""

# Model Configuration
AVAILABLE_MODELS = {
    "gpt-oss": {
        "name": "🆓 GPT-OSS 20B (Modal - FREE)",
        "api_key_env": "MODAL_ENDPOINT_URL",
        "description": "Free OpenAI GPT-OSS 20B model hosted on Modal.com - No API key required! ⚠️ May take up to 60s to start responding (cold start). For faster responses and better precision, use another model with your API key."
    },
    "claude-4.5": {
        "name": "Claude 4.5 Sonnet (Anthropic)",
        "api_key_env": "ANTHROPIC_API_KEY",
        "description": "Anthropic's latest Claude Sonnet model"
    },
    "claude-opus": {
        "name": "Claude Opus 4 (Anthropic)",
        "api_key_env": "ANTHROPIC_API_KEY",
        "description": "Anthropic's most powerful Claude model"
    },
    "gemini-3": {
        "name": "Gemini 3 Pro (Google)",
        "api_key_env": "GOOGLE_GENERATIVE_AI_API_KEY",
        "description": "Google's advanced reasoning model with thinking"
    },
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
}

# Current model settings (can be updated via UI)
# SECURITY: Store user-provided keys for this session only
# NOTE: API keys are REQUIRED for paid models - GPT-OSS is FREE!
# IMPORTANT: Always default to gpt-oss (FREE model) regardless of env var
# The env var might be set for the API server, but the UI should default to FREE model
current_model_settings = {
    "model": "gpt-oss",  # Always default to FREE GPT-OSS model in UI!
    # User-provided keys (REQUIRED for paid models, optional for GPT-OSS)
    "openai_api_key": "",
    "xai_api_key": "",
    "anthropic_api_key": "",
    "google_api_key": "",  # Google Generative AI API key
    "tavily_api_key": "",  # Required for web research & organization discovery
    "modal_endpoint_url": "https://vasilis--gpt-oss-vllm-inference-serve.modal.run"  # Hardcoded Modal.com endpoint for GPT-OSS (no trailing slash!)
}

# Thread-safe cancellation flag for stopping ongoing requests
class CancellationToken:
    def __init__(self):
        self._cancelled = False
        self._lock = threading.Lock()
        self._response = None
    
    def cancel(self):
        with self._lock:
            self._cancelled = True
            # Close any active response to stop streaming
            if self._response is not None:
                try:
                    self._response.close()
                except:
                    pass
    
    def is_cancelled(self):
        with self._lock:
            return self._cancelled
    
    def set_response(self, response):
        with self._lock:
            self._response = response
    
    def reset(self):
        with self._lock:
            self._cancelled = False
            self._response = None

# Global cancellation token
cancel_token = CancellationToken()

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

def format_thinking_section(thinking_text: str, tool_name: str = None) -> str:
    """Format AI thinking/reasoning in a collapsible section"""
    if not thinking_text or not thinking_text.strip():
        return ""
    
    # Clean up the thinking text
    thinking_clean = thinking_text.strip()
    
    # Create a descriptive title based on context
    if tool_name:
        title = f"🧠 AI Reasoning (before {tool_name.replace('_', ' ').title()})"
    else:
        title = "🧠 AI Reasoning"
    
    return f"""
<details>
<summary>{title}</summary>

*The model's thought process:*

{thinking_clean}

</details>
"""

def format_tool_result(tool_name: str, result) -> str:
    """Format a tool result for display"""
    
    # Special handling for assess_compliance - show generated documentation with full content
    if tool_name == "assess_compliance" and result:
        output = f"\n✅ **Tool Result: `{tool_name}`**\n\n"
        
        # Extract key information
        assessment = result.get("assessment", {})
        metadata = result.get("metadata", {})
        documentation = result.get("documentation", {})
        reasoning = result.get("reasoning", "")
        doc_files = metadata.get("documentationFiles", [])
        
        # Show assessment summary
        if assessment:
            score = assessment.get("overallScore", "N/A")
            risk_level = assessment.get("riskLevel", "N/A")
            gaps = assessment.get("gaps", [])
            recommendations = assessment.get("recommendations", [])
            gaps_count = len(gaps)
            recs_count = len(recommendations)
            
            # Risk level emoji
            risk_emoji = {"CRITICAL": "🔴", "HIGH": "🟠", "MEDIUM": "🟡", "LOW": "🟢"}.get(risk_level, "⚪")
            
            output += f"""### 📊 Compliance Assessment Summary

| Metric | Value |
|--------|-------|
| **Overall Score** | **{score}/100** |
| **Risk Level** | {risk_emoji} **{risk_level}** |
| **Gaps Identified** | {gaps_count} |
| **Recommendations** | {recs_count} |

"""
            
            # Show AI reasoning in collapsible section
            if reasoning:
                output += f"""
<details>
<summary>🧠 AI Reasoning & Analysis</summary>

{reasoning}

</details>

"""
            
            # Show gaps summary in collapsible section
            if gaps:
                critical_gaps = [g for g in gaps if g.get("severity") == "CRITICAL"]
                high_gaps = [g for g in gaps if g.get("severity") == "HIGH"]
                
                output += f"""
<details>
<summary>⚠️ Compliance Gaps ({gaps_count} total: {len(critical_gaps)} Critical, {len(high_gaps)} High)</summary>

"""
                # Group by severity
                for severity in ["CRITICAL", "HIGH", "MEDIUM", "LOW"]:
                    severity_gaps = [g for g in gaps if g.get("severity") == severity]
                    if severity_gaps:
                        severity_emoji = {"CRITICAL": "🔴", "HIGH": "🟠", "MEDIUM": "🟡", "LOW": "🟢"}.get(severity, "⚪")
                        output += f"\n**{severity_emoji} {severity} Priority Gaps:**\n\n"
                        for gap in severity_gaps:
                            output += f"- **{gap.get('category', 'Unknown')}**: {gap.get('description', 'No description')}\n"
                            output += f"  - *Article:* {gap.get('articleReference', 'N/A')} | *Effort:* {gap.get('remediationEffort', 'N/A')}\n"
                
                output += "\n</details>\n\n"
            
            # Show top recommendations in collapsible section
            if recommendations:
                # Sort by priority
                sorted_recs = sorted(recommendations, key=lambda r: r.get("priority", 10))
                top_recs = sorted_recs[:5]
                
                output += f"""
<details>
<summary>💡 Priority Recommendations (Top {len(top_recs)} of {recs_count})</summary>

"""
                for i, rec in enumerate(top_recs, 1):
                    output += f"\n**{i}. {rec.get('title', 'Recommendation')}** (Priority: {rec.get('priority', 'N/A')}/10)\n\n"
                    output += f"{rec.get('description', 'No description')}\n\n"
                    output += f"- *Article:* {rec.get('articleReference', 'N/A')}\n"
                    output += f"- *Estimated Effort:* {rec.get('estimatedEffort', 'N/A')}\n"
                    
                    steps = rec.get("implementationSteps", [])
                    if steps:
                        output += f"- *Implementation Steps:*\n"
                        for step in steps[:3]:  # Show first 3 steps
                            output += f"  1. {step}\n"
                        if len(steps) > 3:
                            output += f"  *(+ {len(steps) - 3} more steps)*\n"
                    output += "\n"
                
                output += "</details>\n\n"
        
        # Show generated documentation content in collapsible sections
        output += "---\n\n### 📄 Generated EU AI Act Documentation\n\n"
        
        # Map of documentation keys to display info
        doc_display_map = {
            "riskManagementTemplate": {
                "title": "Risk Management System",
                "article": "Article 9",
                "emoji": "⚡",
                "description": "Continuous risk identification, analysis, estimation and mitigation process"
            },
            "technicalDocumentation": {
                "title": "Technical Documentation",
                "article": "Article 11 / Annex IV",
                "emoji": "📋",
                "description": "Comprehensive technical documentation for high-risk AI systems"
            },
            "conformityAssessment": {
                "title": "Conformity Assessment",
                "article": "Article 43",
                "emoji": "✅",
                "description": "Procedures for conformity assessment of high-risk AI systems"
            },
            "transparencyNotice": {
                "title": "Transparency Notice",
                "article": "Article 50",
                "emoji": "👁️",
                "description": "Transparency obligations for AI system interactions"
            },
            "qualityManagementSystem": {
                "title": "Quality Management System",
                "article": "Article 17",
                "emoji": "🏆",
                "description": "Quality management system for AI system providers"
            },
            "humanOversightProcedure": {
                "title": "Human Oversight Procedure",
                "article": "Article 14",
                "emoji": "👤",
                "description": "Human oversight measures for high-risk AI systems"
            },
            "dataGovernancePolicy": {
                "title": "Data Governance Policy",
                "article": "Article 10",
                "emoji": "🗃️",
                "description": "Data and data governance practices for training, validation and testing"
            },
            "incidentReportingProcedure": {
                "title": "Incident Reporting Procedure",
                "article": "Article 62",
                "emoji": "🚨",
                "description": "Reporting of serious incidents and malfunctioning"
            },
        }
        
        # Display each documentation template in its own collapsible section
        docs_found = 0
        for doc_key, doc_info in doc_display_map.items():
            doc_content = documentation.get(doc_key)
            if doc_content:
                docs_found += 1
                output += f"""
<details>
<summary>{doc_info['emoji']} **{doc_info['title']}** — {doc_info['article']}</summary>

*{doc_info['description']}*

---

{doc_content}

</details>

"""
        
        if docs_found == 0:
            output += "*No documentation templates were generated in this assessment.*\n\n"
        else:
            output += f"\n> ✨ **{docs_found} documentation template(s) generated.** Expand each section above to view the full content.\n\n"
            
            # Note about limited templates for speed/cost optimization
            if docs_found < 8:
                output += "> ℹ️ **Note:** Currently generating **2 core templates** (Risk Management & Technical Documentation) for faster responses and API cost optimization. Additional templates (Conformity Assessment, Transparency Notice, etc.) are planned for future releases.\n\n"
        
        # Show file paths if documents were saved to disk
        if doc_files:
            output += "---\n\n### 💾 Saved Documentation Files\n\n"
            output += "The documentation has also been saved to disk:\n\n"
            
            # Map filenames to EU AI Act articles for context
            article_map = {
                "Risk_Management_System": "Article 9",
                "Technical_Documentation": "Article 11 / Annex IV",
                "Conformity_Assessment": "Article 43",
                "Transparency_Notice": "Article 50",
                "Quality_Management_System": "Article 17",
                "Human_Oversight_Procedure": "Article 14",
                "Data_Governance_Policy": "Article 10",
                "Incident_Reporting_Procedure": "Article 62",
                "Compliance_Assessment_Report": "Full Assessment",
            }
            
            output += "| Document | EU AI Act Reference | File Path |\n"
            output += "|----------|--------------------|-----------|\n"
            
            for file_path in doc_files:
                # Extract filename from path
                filename = file_path.split("/")[-1] if "/" in file_path else file_path
                # Remove .md extension for display name
                display_name = filename.replace(".md", "").replace("_", " ")
                # Remove leading numbers like "01_" or "00_"
                if len(display_name) > 3 and display_name[:2].isdigit() and display_name[2] == " ":
                    display_name = display_name[3:]
                
                # Find article reference
                article_ref = "—"
                for key, article in article_map.items():
                    if key.lower().replace("_", " ") in display_name.lower():
                        article_ref = article
                        break
                
                output += f"| 📄 {display_name} | {article_ref} | `{filename}` |\n"
            
            # Show the directory where files are saved
            if doc_files:
                docs_dir = "/".join(doc_files[0].split("/")[:-1])
                output += f"\n**📂 Documents Directory:** `{docs_dir}`\n\n"
        
        # Collapsible raw JSON for reference (at the very end)
        result_str = json.dumps(result, indent=2) if result else "null"
        if len(result_str) > 5000:
            result_str = result_str[:5000] + "\n... (truncated)"
        
        output += f"""
---

<details>
<summary>🔍 View Raw JSON Response</summary>

```json
{result_str}
```

</details>
"""
        return output
    
    # Default formatting for other tools
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

def format_thinking_indicator(tool_name: str = None) -> str:
    """Format a thinking/processing indicator"""
    if tool_name:
        # Show specific tool name if available
        tool_display_name = {
            "assess_compliance": "EU AI Act Compliance Assessment",
            "discover_ai_services": "AI Systems Discovery",
            "discover_organization": "Organization Discovery"
        }.get(tool_name, tool_name.replace("_", " ").title())
        
        return f"\n\n⏳ **Processing: {tool_display_name}...**\n\n*This may take a moment while the tool analyzes data and generates documentation.*\n"
    return "\n\n⏳ **Processing with MCP tools...**\n\n*Please wait while the tools execute...*\n"

def get_api_headers() -> dict:
    """Get headers with model configuration for API requests
    
    SECURITY: Only pass model selection and user-provided API keys.
    API keys are REQUIRED for paid models - GPT-OSS is FREE!
    User must provide their own keys via the Model Settings UI (except for GPT-OSS).
    """
    headers = {"Content-Type": "application/json"}
    
    # Pass model selection - always use the current model setting
    selected_model = current_model_settings.get("model", "gpt-oss")
    headers["X-AI-Model"] = selected_model
    print(f"[Gradio] Sending model to API: {selected_model}")
    
    # Pass user-provided API keys based on selected model
    model = current_model_settings["model"]
    if model == "gpt-oss":
        # GPT-OSS uses hardcoded Modal endpoint URL (FREE - no API key required!)
        headers["X-Modal-Endpoint-URL"] = current_model_settings["modal_endpoint_url"]
    elif model == "gpt-5" and current_model_settings["openai_api_key"]:
        headers["X-OpenAI-API-Key"] = current_model_settings["openai_api_key"]
    elif model == "grok-4-1" and current_model_settings["xai_api_key"]:
        headers["X-XAI-API-Key"] = current_model_settings["xai_api_key"]
    elif model in ["claude-4.5", "claude-opus"] and current_model_settings["anthropic_api_key"]:
        headers["X-Anthropic-API-Key"] = current_model_settings["anthropic_api_key"]
    elif model == "gemini-3" and current_model_settings["google_api_key"]:
        headers["X-Google-API-Key"] = current_model_settings["google_api_key"]
    
    # Tavily API key for web research (optional - AI model used as fallback)
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
    global cancel_token
    
    if not message.strip():
        yield initialized_history or history
        return
    
    # Reset cancellation token for new request
    cancel_token.reset()
    
    # Use pre-initialized history or create one
    if initialized_history:
        new_history = list(initialized_history)
    else:
        new_history = list(history) + [
            ChatMessage(role="user", content=message),
            ChatMessage(role="assistant", content="⏳ *Thinking...*")
        ]
    
    response = None
    bot_response = ""
    tool_calls_content = ""  # All tool calls, results, and thinking sections (in order)
    current_thinking = ""  # Accumulate thinking text before tool calls
    
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
        
        # Register response for potential cancellation
        cancel_token.set_response(response)
        
        if response.status_code != 200:
            error_msg = f"⚠️ Error: API returned status {response.status_code}"
            new_history[-1] = ChatMessage(role="assistant", content=error_msg)
            yield new_history
            return
        
        # Initialize assistant response
        current_tool_call = None
        
        for line in response.iter_lines():
            # Check for cancellation
            if cancel_token.is_cancelled():
                # Include any accumulated thinking before cancellation
                if current_thinking.strip():
                    tool_calls_content += format_thinking_section(current_thinking)
                
                final_content = tool_calls_content + bot_response
                if final_content:
                    final_content += "\n\n*— Execution stopped by user*"
                else:
                    final_content = "*— Execution stopped by user*"
                new_history[-1] = ChatMessage(role="assistant", content=final_content)
                yield new_history
                return
            
            if line:
                line_str = line.decode('utf-8')
                print(f"[DEBUG] Received: {line_str[:100]}...")  # Debug log
                if line_str.startswith('data: '):
                    try:
                        data = json.loads(line_str[6:])  # Remove 'data: ' prefix
                        event_type = data.get("type")
                        print(f"[DEBUG] Event type: {event_type}, data: {str(data)[:100]}")
                        
                        if event_type == "thinking":
                            # Handle thinking/reasoning tokens from Claude or GPT
                            # Show thinking at the END (bottom) where action is happening
                            thinking_content = data.get("content", "")
                            if thinking_content:
                                current_thinking += thinking_content
                                
                                # Show thinking tokens in real-time AT THE BOTTOM
                                # Tool calls first, then current thinking at the end
                                live_thinking = f"\n\n🧠 **Model Thinking (live):**\n\n```\n{current_thinking}\n```"
                                full_content = tool_calls_content + live_thinking
                                
                                new_history[-1] = ChatMessage(role="assistant", content=full_content)
                                yield new_history
                        
                        elif event_type == "text":
                            # Append text chunk
                            text_content = data.get("content", "")
                            text_phase = data.get("phase", "thinking")  # Server tells us the phase
                            has_had_tools = data.get("hasHadToolCalls", False)
                            
                            # Determine if this is "thinking" text or final response based on server phase
                            if text_phase == "thinking" or (not has_had_tools and not tool_calls_content):
                                # This is thinking text (before tool calls or between them)
                                current_thinking += text_content
                                
                                # Show thinking AT THE BOTTOM after tool calls
                                if not tool_calls_content:
                                    # Initial thinking - show with brain indicator
                                    display_content = f"🧠 **AI is reasoning...**\n\n{current_thinking}"
                                else:
                                    # Thinking between tool calls - show at the end
                                    display_content = tool_calls_content + f"\n\n🧠 *Reasoning:* {current_thinking}"
                                
                                new_history[-1] = ChatMessage(role="assistant", content=display_content)
                            else:
                                # This is "potential_response" - text after tool results
                                # Could be final response OR thinking before another tool call
                                # We accumulate it and will format appropriately when we know more
                                current_thinking += text_content
                                
                                # Show as streaming response AT THE BOTTOM
                                full_content = tool_calls_content + f"\n\n{current_thinking}"
                                new_history[-1] = ChatMessage(role="assistant", content=full_content)
                            
                            yield new_history
                            
                        elif event_type == "tool_call":
                            # Before showing tool call, save any accumulated thinking as collapsible
                            tool_name = data.get("toolName", "unknown")
                            args = data.get("args", {})
                            
                            # If we have accumulated thinking text, add it as collapsible BEFORE this tool call
                            if current_thinking.strip():
                                tool_calls_content += format_thinking_section(current_thinking, tool_name)
                                current_thinking = ""  # Reset for next thinking block
                            else:
                                # No thinking text was output - add a synthetic thinking note
                                tool_display = tool_name.replace('_', ' ').title()
                                synthetic_thinking = f"I'll use the **{tool_display}** tool to gather the necessary information."
                                tool_calls_content += format_thinking_section(synthetic_thinking, tool_name)
                            
                            # Show tool call with prominent loading indicator AT THE BOTTOM
                            tool_calls_content += format_tool_call(tool_name, args)
                            # Add prominent loading indicator specific to this tool
                            loading_indicator = format_thinking_indicator(tool_name)
                            full_content = tool_calls_content + bot_response + loading_indicator
                            new_history[-1] = ChatMessage(role="assistant", content=full_content)
                            yield new_history
                            current_tool_call = tool_name
                            
                        elif event_type == "tool_result":
                            # Show tool result (removes loading indicator)
                            tool_name = data.get("toolName", current_tool_call or "unknown")
                            result = data.get("result")
                            tool_calls_content += format_tool_result(tool_name, result)
                            
                            # After tool result, show "analyzing results" indicator AT THE BOTTOM
                            analyzing_indicator = f"\n\n🧠 **Analyzing {tool_name.replace('_', ' ')} results...**\n"
                            full_content = tool_calls_content + analyzing_indicator
                            new_history[-1] = ChatMessage(role="assistant", content=full_content)
                            yield new_history
                            current_tool_call = None
                            
                        elif event_type == "step_finish":
                            # Step completed - if there's accumulated thinking, add it to tool_calls_content
                            has_had_tools_in_step = data.get("hasHadToolCalls", False)
                            
                            if current_thinking.strip():
                                tool_calls_content += format_thinking_section(current_thinking)
                                current_thinking = ""
                            
                            # Show "preparing response" if we had tool calls and step is finishing AT THE BOTTOM
                            if has_had_tools_in_step and tool_calls_content:
                                preparing_indicator = "\n\n✨ **Preparing comprehensive response based on analysis...**\n"
                                full_content = tool_calls_content + preparing_indicator
                            else:
                                full_content = tool_calls_content + bot_response
                            
                            new_history[-1] = ChatMessage(role="assistant", content=full_content)
                            yield new_history
                            
                        elif event_type == "error":
                            error_msg = data.get("error", "Unknown error")
                            bot_response += f"\n\n⚠️ Error: {error_msg}"
                            full_content = tool_calls_content + bot_response
                            new_history[-1] = ChatMessage(role="assistant", content=full_content)
                            yield new_history
                            
                        elif event_type == "done":
                            # Final update
                            # If we have tool calls, any remaining current_thinking is the final response
                            # If no tool calls, current_thinking was just direct response (no tools needed)
                            if tool_calls_content:
                                # We had tool calls - current_thinking after last tool is the final response
                                bot_response = current_thinking
                                current_thinking = ""
                            else:
                                # No tool calls - current_thinking is the direct response
                                bot_response = current_thinking
                                current_thinking = ""
                            
                            # Final response AT THE BOTTOM after all tool calls
                            full_content = tool_calls_content + bot_response
                            new_history[-1] = ChatMessage(role="assistant", content=full_content)
                            yield new_history
                            break
                            
                    except json.JSONDecodeError:
                        continue
        
        # Ensure final state (only if not cancelled)
        if not cancel_token.is_cancelled():
            # If we have accumulated text that wasn't finalized, treat it as the response
            if current_thinking.strip() and not bot_response:
                bot_response = current_thinking
            
            # Final content: tool calls first, then response at the bottom
            final_content = tool_calls_content + (bot_response or "No response generated.")
            new_history[-1] = ChatMessage(role="assistant", content=final_content)
            yield new_history
        
    except requests.exceptions.ConnectionError:
        if not cancel_token.is_cancelled():
            error_msg = "⚠️ Cannot connect to API server. Make sure it's running on http://localhost:3001"
            new_history[-1] = ChatMessage(role="assistant", content=error_msg)
            yield new_history
    except requests.exceptions.Timeout:
        if not cancel_token.is_cancelled():
            error_msg = "⚠️ Request timed out. The agent might be processing a complex query."
            final_content = tool_calls_content + bot_response + "\n\n" + error_msg
            new_history[-1] = ChatMessage(role="assistant", content=final_content)
            yield new_history
    except (requests.exceptions.ChunkedEncodingError, ConnectionError):
        # This can happen when we close the connection during cancellation - it's expected
        if not cancel_token.is_cancelled():
            error_msg = "⚠️ Connection was interrupted."
            final_content = tool_calls_content + bot_response + "\n\n" + error_msg
            new_history[-1] = ChatMessage(role="assistant", content=final_content)
            yield new_history
    except Exception as e:
        if not cancel_token.is_cancelled():
            error_msg = f"⚠️ Error: {str(e)}"
            final_content = tool_calls_content + bot_response + "\n\n" + error_msg if (tool_calls_content or bot_response) else error_msg
            new_history[-1] = ChatMessage(role="assistant", content=final_content)
            yield new_history
    finally:
        # Clean up the response connection
        if response is not None:
            try:
                response.close()
            except:
                pass
        cancel_token.set_response(None)

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
    """Get list of available MCP tools with descriptions"""
    try:
        response = requests.get(f"{API_URL}/api/tools", timeout=5)
        if response.status_code == 200:
            data = response.json()
            tools = data.get("tools", [])
            if tools:
                tool_list = "\n".join([f"• **{t['name']}**" for t in tools])
                return f"""**Available MCP Tools:**

{tool_list}

**✨ Capabilities:**
• Generate complete compliance reports
• Create documentation templates (Risk Management, Technical Docs, etc.)
• Discover AI systems and assess risk levels
• Analyze organization compliance gaps"""
            return "No tools available"
        return "Could not fetch tools"
    except:
        return "Could not connect to API"

def get_example_queries() -> List[List[str]]:
    """Get example queries for the interface"""
    return [
        # MCP Tools Examples - Showcase full compliance analysis capabilities
        ["Generate a complete EU AI Act compliance report for Microsoft with all documentation templates"],
        ["Analyze IBM's watsonX system compliance and generate risk management documentation"],
        ["Create full compliance assessment for OpenAI including technical documentation templates"],
        # General Questions
        ["What is the EU AI Act?"],
        ["Is a recruitment screening AI considered high-risk?"],
        ["What are the compliance requirements for chatbots?"],
        ["What's the timeline for EU AI Act enforcement?"],
    ]

# Create Gradio interface  
with gr.Blocks(
    title="🇪🇺 EU AI Act Compliance Agent",
) as demo:
    
    # Custom CSS and JavaScript to handle scroll behavior, styling, and secure cookie storage
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
    
    /* Scroll indicator when user has scrolled up */
    .scroll-indicator {
        position: absolute;
        bottom: 10px;
        right: 20px;
        background: rgba(0, 0, 0, 0.7);
        color: white;
        padding: 8px 16px;
        border-radius: 20px;
        font-size: 12px;
        cursor: pointer;
        z-index: 1000;
        display: none;
    }
    .scroll-indicator:hover {
        background: rgba(0, 0, 0, 0.9);
    }
    
    /* Keys loaded indicator */
    .keys-loaded-badge {
        display: inline-block;
        background: #28a745;
        color: white;
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 11px;
        margin-left: 8px;
    }
    </style>
    
    <script>
    // ============================================
    // Secure Cookie Storage for API Keys
    // Keys are encoded and expire after 1 day
    // ============================================
    
    const SecureKeyStorage = {
        // Simple obfuscation key (not military-grade, but prevents casual inspection)
        _obfKey: 'EU_AI_ACT_2024_MCP',
        _cookiePrefix: 'euai_',
        _expirationDays: 1,
        
        // XOR-based encoding with base64
        _encode: function(str) {
            if (!str) return '';
            let encoded = '';
            for (let i = 0; i < str.length; i++) {
                encoded += String.fromCharCode(
                    str.charCodeAt(i) ^ this._obfKey.charCodeAt(i % this._obfKey.length)
                );
            }
            return btoa(encoded);
        },
        
        // Decode from base64 + XOR
        _decode: function(encoded) {
            if (!encoded) return '';
            try {
                const decoded = atob(encoded);
                let result = '';
                for (let i = 0; i < decoded.length; i++) {
                    result += String.fromCharCode(
                        decoded.charCodeAt(i) ^ this._obfKey.charCodeAt(i % this._obfKey.length)
                    );
                }
                return result;
            } catch (e) {
                console.warn('[SecureKeyStorage] Failed to decode:', e);
                return '';
            }
        },
        
        // Set a cookie with 1-day expiration and security flags
        _setCookie: function(name, value) {
            const expires = new Date();
            expires.setTime(expires.getTime() + (this._expirationDays * 24 * 60 * 60 * 1000));
            
            // Security flags: SameSite=Strict prevents CSRF, Secure ensures HTTPS only in production
            const isSecure = window.location.protocol === 'https:';
            const secureFlag = isSecure ? '; Secure' : '';
            
            document.cookie = `${this._cookiePrefix}${name}=${encodeURIComponent(value)}; ` +
                `expires=${expires.toUTCString()}; ` +
                `path=/; SameSite=Strict${secureFlag}`;
        },
        
        // Get a cookie value
        _getCookie: function(name) {
            const fullName = this._cookiePrefix + name;
            const cookies = document.cookie.split(';');
            for (let cookie of cookies) {
                const [cookieName, cookieValue] = cookie.trim().split('=');
                if (cookieName === fullName) {
                    return decodeURIComponent(cookieValue || '');
                }
            }
            return '';
        },
        
        // Delete a cookie
        _deleteCookie: function(name) {
            document.cookie = `${this._cookiePrefix}${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Strict`;
        },
        
        // Store an API key (encoded)
        storeKey: function(keyName, keyValue) {
            if (!keyValue || keyValue.length < 10) {
                this._deleteCookie(keyName);
                return false;
            }
            const encoded = this._encode(keyValue);
            this._setCookie(keyName, encoded);
            console.log(`[SecureKeyStorage] Stored ${keyName} (expires in ${this._expirationDays} day)`);
            return true;
        },
        
        // Retrieve an API key (decoded)
        getKey: function(keyName) {
            const encoded = this._getCookie(keyName);
            if (!encoded) return '';
            return this._decode(encoded);
        },
        
        // Store all keys at once
        storeAllKeys: function(keys) {
            const stored = [];
            if (keys.tavily) { this.storeKey('tavily', keys.tavily); stored.push('Tavily'); }
            if (keys.anthropic) { this.storeKey('anthropic', keys.anthropic); stored.push('Anthropic'); }
            if (keys.google) { this.storeKey('google', keys.google); stored.push('Google'); }
            if (keys.openai) { this.storeKey('openai', keys.openai); stored.push('OpenAI'); }
            if (keys.xai) { this.storeKey('xai', keys.xai); stored.push('xAI'); }
            return stored;
        },
        
        // Get all stored keys
        getAllKeys: function() {
            return {
                tavily: this.getKey('tavily'),
                anthropic: this.getKey('anthropic'),
                google: this.getKey('google'),
                openai: this.getKey('openai'),
                xai: this.getKey('xai')
            };
        },
        
        // Check if any keys are stored
        hasStoredKeys: function() {
            const keys = this.getAllKeys();
            return !!(keys.tavily || keys.anthropic || keys.google || keys.openai || keys.xai);
        },
        
        // Clear all stored keys
        clearAllKeys: function() {
            this._deleteCookie('tavily');
            this._deleteCookie('anthropic');
            this._deleteCookie('google');
            this._deleteCookie('openai');
            this._deleteCookie('xai');
            console.log('[SecureKeyStorage] All keys cleared');
        }
    };
    
    // Make it globally accessible
    window.SecureKeyStorage = SecureKeyStorage;
    
    // Function to populate key fields from cookies on page load
    function populateKeysFromCookies() {
        const keys = SecureKeyStorage.getAllKeys();
        let populated = [];
        
        // Find Gradio input elements by their element IDs or labels
        // Gradio 4.x uses specific data attributes and structure
        setTimeout(() => {
            // Try to find inputs by elem_id first (more reliable)
            const tavilyInput = document.querySelector('#tavily_key_input input[type="password"]');
            const anthropicInput = document.querySelector('#anthropic_key_input input[type="password"]');
            const googleInput = document.querySelector('#google_key_input input[type="password"]');
            const openaiInput = document.querySelector('#openai_key_input input[type="password"]');
            const xaiInput = document.querySelector('#xai_key_input input[type="password"]');
            
            // Populate from cookies
            if (tavilyInput && keys.tavily) {
                tavilyInput.value = keys.tavily;
                tavilyInput.dispatchEvent(new Event('input', { bubbles: true }));
                populated.push('Tavily');
            }
            if (anthropicInput && keys.anthropic) {
                anthropicInput.value = keys.anthropic;
                anthropicInput.dispatchEvent(new Event('input', { bubbles: true }));
                populated.push('Anthropic');
            }
            if (googleInput && keys.google) {
                googleInput.value = keys.google;
                googleInput.dispatchEvent(new Event('input', { bubbles: true }));
                populated.push('Google');
            }
            if (openaiInput && keys.openai) {
                openaiInput.value = keys.openai;
                openaiInput.dispatchEvent(new Event('input', { bubbles: true }));
                populated.push('OpenAI');
            }
            if (xaiInput && keys.xai) {
                xaiInput.value = keys.xai;
                xaiInput.dispatchEvent(new Event('input', { bubbles: true }));
                populated.push('xAI');
            }
            
            // Fallback: try finding by label text if elem_id didn't work
            if (populated.length === 0) {
                const inputs = document.querySelectorAll('input[type="password"]');
                inputs.forEach(input => {
                    const container = input.closest('.gradio-textbox, .gr-textbox, [class*="textbox"]');
                    if (!container) return;
                    
                    const label = container.querySelector('label, span.label-text, [data-testid="label"]');
                    const labelText = label ? label.textContent.toLowerCase() : '';
                    
                    if (labelText.includes('tavily') && keys.tavily && !input.value) {
                        input.value = keys.tavily;
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                        populated.push('Tavily');
                    } else if (labelText.includes('anthropic') && keys.anthropic && !input.value) {
                        input.value = keys.anthropic;
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                        populated.push('Anthropic');
                    } else if (labelText.includes('google') && keys.google && !input.value) {
                        input.value = keys.google;
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                        populated.push('Google');
                    } else if (labelText.includes('openai') && keys.openai && !input.value) {
                        input.value = keys.openai;
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                        populated.push('OpenAI');
                    } else if (labelText.includes('xai') && keys.xai && !input.value) {
                        input.value = keys.xai;
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                        populated.push('xAI');
                    }
                });
            }
            
            if (populated.length > 0) {
                console.log('[SecureKeyStorage] Loaded keys from cookies:', populated.join(', '));
                
                // Show a notification that keys were loaded
                showKeysLoadedNotification(populated);
                
                // Auto-click the save button to register keys with the backend
                setTimeout(() => {
                    const saveBtn = Array.from(document.querySelectorAll('button')).find(
                        btn => btn.textContent.includes('Save Keys')
                    );
                    if (saveBtn) {
                        saveBtn.click();
                        console.log('[SecureKeyStorage] Auto-saved loaded keys to session');
                    }
                }, 500);
            }
        }, 1500); // Wait for Gradio to fully render
    }
    
    // Show notification when keys are loaded from cookies
    function showKeysLoadedNotification(keyNames) {
        // Find the keys status markdown element
        const statusElements = document.querySelectorAll('.prose, [class*="markdown"]');
        
        // Create a temporary notification
        const notification = document.createElement('div');
        notification.innerHTML = `
            <div style="background: #d4edda; border: 1px solid #c3e6cb; color: #155724; 
                        padding: 10px 15px; border-radius: 6px; margin: 10px 0;
                        display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 1.2em;">🔐</span>
                <div>
                    <strong>Keys restored from secure storage</strong><br>
                    <small>Loaded: ${keyNames.join(', ')} (expires in 24h)</small>
                </div>
            </div>
        `;
        
        // Insert near the API Keys accordion
        const accordion = document.querySelector('[class*="accordion"]');
        if (accordion) {
            accordion.insertAdjacentElement('afterend', notification);
            
            // Auto-hide after 5 seconds
            setTimeout(() => {
                notification.style.transition = 'opacity 0.5s';
                notification.style.opacity = '0';
                setTimeout(() => notification.remove(), 500);
            }, 5000);
        }
    }
    
    // Initialize on page load
    document.addEventListener('DOMContentLoaded', function() {
        if (SecureKeyStorage.hasStoredKeys()) {
            populateKeysFromCookies();
        }
    });
    
    // Also try on window load (Gradio might not be ready on DOMContentLoaded)
    window.addEventListener('load', function() {
        if (SecureKeyStorage.hasStoredKeys()) {
            setTimeout(populateKeysFromCookies, 500);
        }
    });
    // Disable Gradio's auto-scroll when user manually scrolls
    (function() {
        let userHasScrolled = false;
        let chatContainer = null;
        let scrollIndicator = null;
        let isStreaming = false;
        
        function findChatContainer() {
            // Find the chat messages container (Gradio uses different selectors)
            const selectors = [
                '.chatbot .messages-wrapper',
                '.chatbot [data-testid="bot"]',
                '.chatbot .overflow-y-auto',
                '[data-testid="chatbot"] > div',
                '.chatbot'
            ];
            
            for (const selector of selectors) {
                const el = document.querySelector(selector);
                if (el && el.scrollHeight > el.clientHeight) {
                    return el;
                }
            }
            
            // Fallback: find any scrollable element in chatbot
            const chatbot = document.querySelector('.chatbot');
            if (chatbot) {
                const scrollable = chatbot.querySelector('[style*="overflow"]') || 
                                   chatbot.querySelector('.overflow-y-auto') ||
                                   Array.from(chatbot.querySelectorAll('*')).find(el => 
                                       el.scrollHeight > el.clientHeight && 
                                       getComputedStyle(el).overflowY !== 'visible'
                                   );
                return scrollable || chatbot;
            }
            return null;
        }
        
        function isNearBottom(container) {
            if (!container) return true;
            const threshold = 100; // pixels from bottom
            return container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
        }
        
        function scrollToBottom(container) {
            if (container) {
                container.scrollTop = container.scrollHeight;
            }
        }
        
        function createScrollIndicator(container) {
            if (scrollIndicator) return scrollIndicator;
            
            scrollIndicator = document.createElement('div');
            scrollIndicator.className = 'scroll-indicator';
            scrollIndicator.innerHTML = '⬇️ New content below - click to scroll';
            scrollIndicator.onclick = function() {
                userHasScrolled = false;
                scrollToBottom(container);
                scrollIndicator.style.display = 'none';
            };
            
            // Position relative to chat container
            const chatbot = document.querySelector('.chatbot');
            if (chatbot) {
                chatbot.style.position = 'relative';
                chatbot.appendChild(scrollIndicator);
            }
            
            return scrollIndicator;
        }
        
        function handleScroll(e) {
            const container = e.target;
            
            // If user scrolls up (not near bottom), mark as user-scrolled
            if (!isNearBottom(container)) {
                userHasScrolled = true;
                if (scrollIndicator && isStreaming) {
                    scrollIndicator.style.display = 'block';
                }
            } else {
                // User scrolled back to bottom
                userHasScrolled = false;
                if (scrollIndicator) {
                    scrollIndicator.style.display = 'none';
                }
            }
        }
        
        function setupScrollHandling() {
            chatContainer = findChatContainer();
            if (!chatContainer) {
                // Retry after a short delay if container not found yet
                setTimeout(setupScrollHandling, 500);
                return;
            }
            
            // Remove any existing listeners
            chatContainer.removeEventListener('scroll', handleScroll);
            
            // Add scroll listener
            chatContainer.addEventListener('scroll', handleScroll, { passive: true });
            
            // Create scroll indicator
            createScrollIndicator(chatContainer);
            
            // Override Gradio's auto-scroll behavior using MutationObserver
            const observer = new MutationObserver(function(mutations) {
                // Content changed - this is likely streaming
                isStreaming = true;
                
                // Only auto-scroll if user hasn't manually scrolled
                if (!userHasScrolled) {
                    scrollToBottom(chatContainer);
                } else if (scrollIndicator) {
                    scrollIndicator.style.display = 'block';
                }
            });
            
            observer.observe(chatContainer, {
                childList: true,
                subtree: true,
                characterData: true
            });
            
            console.log('[Scroll] Auto-scroll handler initialized');
        }
        
        // Reset scroll state when a new message is sent
        function resetScrollState() {
            userHasScrolled = false;
            isStreaming = true;
            if (scrollIndicator) {
                scrollIndicator.style.display = 'none';
            }
        }
        
        // Listen for form submissions to reset scroll state
        document.addEventListener('click', function(e) {
            if (e.target.matches('button[type="submit"], button.primary')) {
                resetScrollState();
            }
        });
        
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                const activeEl = document.activeElement;
                if (activeEl && activeEl.tagName === 'TEXTAREA') {
                    resetScrollState();
                }
            }
        });
        
        // Mark streaming as complete when stop button is clicked or response ends
        document.addEventListener('click', function(e) {
            if (e.target.matches('button.stop, button[variant="stop"]')) {
                isStreaming = false;
                if (scrollIndicator) {
                    scrollIndicator.style.display = 'none';
                }
            }
        });
        
        // Initialize when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', setupScrollHandling);
        } else {
            setupScrollHandling();
        }
        
        // Re-initialize on Gradio component updates
        window.addEventListener('load', function() {
            setTimeout(setupScrollHandling, 1000);
        });
    })();
    </script>
    """)
    
    # Header - use PUBLIC_URL for production links
    # In production (HF Spaces): Show info about gradio.live URL
    # In local dev: Direct link to localhost:7861
    chatgpt_link_href = PUBLIC_URL if PUBLIC_URL else "http://localhost:7861"
    is_production = bool(PUBLIC_URL)
    
    # Get MCP URL (written by chatgpt_app.py when it starts)
    mcp_url = get_mcp_url()
    
    # MCP Server is deployed separately
    MCP_SPACE_URL = "https://mcp-1st-birthday-eu-ai-act-chatgpt-mcp.hf.space"
    MCP_URL = f"{MCP_SPACE_URL}/gradio_api/mcp/"
    
    if is_production:
        # Production: Link to separate MCP Space
        chatgpt_section = f"""
            <a href="{MCP_SPACE_URL}" target="_blank" style="text-decoration: none;">
                <div style="background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); padding: 12px 20px; border-radius: 10px; display: inline-block;">
                    <span style="color: #fff; font-size: 0.9em;">
                        💬 <strong>ChatGPT MCP Server</strong>
                    </span>
                    <p style="color: rgba(255,255,255,0.9); font-size: 0.75em; margin: 8px 0 0 0; word-break: break-all;">
                        <code style="background: rgba(255,255,255,0.2); padding: 3px 6px; border-radius: 3px;">{MCP_URL}</code>
                    </p>
                    <p style="color: rgba(255,255,255,0.7); font-size: 0.7em; margin: 6px 0 0 0;">
                        Click to open MCP Server Space →
                    </p>
                </div>
            </a>
        """
    else:
        # Local dev: Direct link
        chatgpt_section = """
            <a href="http://localhost:7861" target="_blank" style="color: #2196F3; text-decoration: none; padding: 6px 12px; border: 1px solid #2196F3; border-radius: 4px; display: inline-block;">
                💬 Open ChatGPT App (MCP Server)
            </a>
        """
    
    gr.HTML(f"""
        <div style="text-align: center; padding: 20px 0;">
            <h1 style="margin: 0; font-size: 2em;">🇪🇺 EU AI Act Compliance Agent</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.8;">by <a href="https://www.legitima.ai" target="_blank" style="color: #4CAF50;">Legitima.ai</a></p>
            <p style="margin: 5px 0; font-size: 0.9em; opacity: 0.7;">Your intelligent assistant for navigating European AI regulation</p>
            <p style="margin: 10px 0 0 0; font-size: 0.9em;">
                {chatgpt_section}
            </p>
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
                autoscroll=False,  # Disable auto-scroll - we handle it with JS
            )
            
            with gr.Row():
                msg = gr.Textbox(
                    placeholder="Ask about compliance, or request a full compliance report with documentation for an organization...",
                    show_label=False,
                    scale=8,
                )
                submit = gr.Button("Send", variant="primary", scale=1)
                stop_btn = gr.Button("⏹ Stop", variant="stop", scale=1, visible=False)
            
            gr.Examples(
                examples=get_example_queries(),
                inputs=msg,
                label="💡 Example Questions (Try MCP tools for compliance reports & documentation!)",
            )
        
        with gr.Column(scale=1):
            # Sidebar
            gr.Markdown("### 🤖 Model Settings")
            
            model_dropdown = gr.Dropdown(
                choices=[(v["name"], k) for k, v in AVAILABLE_MODELS.items()],
                value=current_model_settings["model"],  # Use current model setting
                label="AI Model",
                info="Select the AI model to use. ⚠️ GPT-OSS is FREE but may take up to 60s to start (cold start). For faster responses and better precision, use another model with your API key."
            )
            
            # API Key inputs (password fields) - GPT-OSS is FREE, other models require API keys
            with gr.Accordion("🔑 API Keys & Settings", open=True):
                gr.Markdown("""🆓 **GPT-OSS 20B is FREE** - Uses pre-configured Modal endpoint (no setup required).

⏱️ **Note:** GPT-OSS may take up to **60 seconds** to start responding due to cold start. For **faster responses and better precision**, select another model and provide your API key below.

⚠️ For paid models (Claude, GPT-5, Gemini, Grok), an API key is required.

🔐 Keys are stored securely in encoded cookies and **auto-expire after 24 hours**.

ℹ️ *Tavily is optional - enhances web research but AI model works as fallback.*""")
                
                gr.Markdown("#### 🔍 Research API (Optional)")
                tavily_key = gr.Textbox(
                    label="Tavily API Key (Optional)",
                    placeholder="tvly-... (optional - enhances web research)",
                    type="password",
                    value="",  # Will be populated from cookies via JS
                    info="Optional - enhances web research. AI model used as fallback.",
                    elem_id="tavily_key_input"
                )
                
                gr.Markdown("#### 🤖 AI Model APIs")
                anthropic_key = gr.Textbox(
                    label="Anthropic API Key *",
                    placeholder="sk-ant-... (required for Claude models)",
                    type="password",
                    value="",  # Will be populated from cookies via JS
                    info="Required - for Claude 4.5 Sonnet or Claude Opus 4",
                    elem_id="anthropic_key_input"
                )
                google_key = gr.Textbox(
                    label="Google API Key",
                    placeholder="AIza... (required for Gemini 3)",
                    type="password",
                    value="",  # Will be populated from cookies via JS
                    info="Required if using Gemini 3 Pro model",
                    elem_id="google_key_input"
                )
                openai_key = gr.Textbox(
                    label="OpenAI API Key",
                    placeholder="sk-... (required for GPT-5)",
                    type="password",
                    value="",  # Will be populated from cookies via JS
                    info="Required if using GPT-5 model",
                    elem_id="openai_key_input"
                )
                xai_key = gr.Textbox(
                    label="xAI API Key",
                    placeholder="xai-... (required for Grok 4.1)",
                    type="password",
                    value="",  # Will be populated from cookies via JS
                    info="Required if using Grok 4.1 model",
                    elem_id="xai_key_input"
                )
                with gr.Row():
                    save_keys_btn = gr.Button("💾 Save Keys", variant="secondary", size="sm")
                    clear_keys_btn = gr.Button("🗑️ Clear Keys", variant="stop", size="sm")
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
                label="🔧 MCP Tools - Generate Reports & Documentation"
            )
            
            gr.Markdown("---")
            
            # Sidebar ChatGPT App section
            if is_production:
                sidebar_chatgpt = f"""
                <a href="{MCP_SPACE_URL}" target="_blank" style="text-decoration: none;">
                    <div style="background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); padding: 12px; border-radius: 8px; margin: 5px 0;">
                        <strong style="color: #fff;">💬 MCP Server</strong>
                        <p style="color: rgba(255,255,255,0.9); font-size: 0.7em; margin: 6px 0 0 0;">
                            Click to get MCP URL →
                        </p>
                    </div>
                </a>
                """
            else:
                sidebar_chatgpt = """
                <a href="http://localhost:7861" target="_blank" style="color: #2196F3; text-decoration: none; padding: 8px 16px; border: 1px solid #2196F3; border-radius: 6px; display: inline-block; margin: 5px 0;">
                    💬 ChatGPT App (MCP Server)
                </a>
                <p style="font-size: 0.85em; opacity: 0.7; margin-top: 8px;">
                    Use the ChatGPT App to connect with ChatGPT Desktop and access MCP tools via OpenAI Apps SDK.
                </p>
                """
            
            gr.HTML(f"""
            <div>
                <h3 style="margin-bottom: 10px;">🔗 Other Interfaces</h3>
                <div>
                    {sidebar_chatgpt}
                </div>
            </div>
            """)
            
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
        print(f"[Gradio] Model updated to: {model_value} ({model_info.get('name', model_value)})")
        return f"✅ Model set to: **{model_info.get('name', model_value)}**"
    
    def save_api_keys(tavily_val, anthropic_val, google_val, openai_val, xai_val):
        """Save user-provided API keys to session AND secure cookie storage
        
        SECURITY: Keys are stored in memory for this session AND in encoded cookies
        that expire after 1 day. Cookies use XOR obfuscation + base64 encoding.
        GPT-OSS is FREE and uses pre-configured Modal endpoint from environment.
        Paid models require API keys. Note: Tavily is OPTIONAL - AI model is used as fallback for research.
        """
        saved = []
        
        # Only update if a real key is provided
        if tavily_val and len(tavily_val) > 10:
            current_model_settings["tavily_api_key"] = tavily_val
            saved.append("Tavily")
        
        if anthropic_val and len(anthropic_val) > 10:
            current_model_settings["anthropic_api_key"] = anthropic_val
            saved.append("Anthropic")
        
        if google_val and len(google_val) > 10:
            current_model_settings["google_api_key"] = google_val
            saved.append("Google")
        
        if openai_val and len(openai_val) > 10:
            current_model_settings["openai_api_key"] = openai_val
            saved.append("OpenAI")
        
        if xai_val and len(xai_val) > 10:
            current_model_settings["xai_api_key"] = xai_val
            saved.append("xAI")
        
        # Build status message
        status_parts = []
        if saved:
            status_parts.append(f"✅ Saved: {', '.join(saved)}")
            status_parts.append("🔐 *Stored in secure cookies (expires in 24h)*")
        
        # Check for missing required keys based on selected model
        model = current_model_settings["model"]
        if model == "gpt-oss":
            # GPT-OSS uses hardcoded Modal endpoint - always available
            status_parts.append("🆓 *GPT-OSS model is FREE - using hardcoded endpoint!*")
        elif model in ["claude-4.5", "claude-opus"] and not current_model_settings["anthropic_api_key"]:
            status_parts.append(f"⚠️ **Anthropic API key required** for {model}")
        elif model == "gemini-3" and not current_model_settings["google_api_key"]:
            status_parts.append("⚠️ **Google API key required** for Gemini 3")
        elif model == "gpt-5" and not current_model_settings["openai_api_key"]:
            status_parts.append("⚠️ **OpenAI API key required** for GPT-5")
        elif model == "grok-4-1" and not current_model_settings["xai_api_key"]:
            status_parts.append("⚠️ **xAI API key required** for Grok 4.1")
        
        # Tavily is optional - just inform user about enhanced features if they have it
        if not current_model_settings["tavily_api_key"]:
            status_parts.append("ℹ️ *Tavily not set - AI model will be used for web research*")
        
        if not status_parts:
            return "✅ All configured!\n\n🔐 *Stored in secure cookies (expires in 24h)*"
        
        return "\n\n".join(status_parts)
    
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
    
    def check_required_keys():
        """Check if required API keys are configured
        
        Returns a tuple of (is_valid, error_message)
        - is_valid: True if all required keys are present
        - error_message: Description of missing keys if not valid
        
        Note: GPT-OSS is FREE and only needs Modal endpoint URL.
        Tavily API key is optional - the system will fallback to AI model for research.
        """
        missing_keys = []
        
        # Check model API key based on selected model
        model = current_model_settings["model"]
        if model == "gpt-oss":
            # GPT-OSS uses hardcoded endpoint - no check needed
            pass
        elif model in ["claude-4.5", "claude-opus"] and not current_model_settings["anthropic_api_key"]:
            missing_keys.append(f"**Anthropic API Key** (required for {model})")
        elif model == "gemini-3" and not current_model_settings["google_api_key"]:
            missing_keys.append("**Google API Key** (required for Gemini 3)")
        elif model == "gpt-5" and not current_model_settings["openai_api_key"]:
            missing_keys.append("**OpenAI API Key** (required for GPT-5)")
        elif model == "grok-4-1" and not current_model_settings["xai_api_key"]:
            missing_keys.append("**xAI API Key** (required for Grok 4.1)")
        
        # Note: Tavily is OPTIONAL - system will fallback to AI model for research
        # We no longer require Tavily API key
        
        if missing_keys:
            error_msg = """## ⚠️ API Keys Required

To use this service, you need to provide your own API keys. The following keys are missing:

"""
            for key in missing_keys:
                error_msg += f"- {key}\n"
            
            error_msg += """
### How to add your API keys:

1. Expand the **🔑 API Keys & Settings** section in the sidebar
2. Enter your API keys in the corresponding fields
3. Click **💾 Save Keys**

### Where to get API keys:

- **Anthropic**: [console.anthropic.com](https://console.anthropic.com) - Get Claude API key
- **Google**: [aistudio.google.com](https://aistudio.google.com/apikey) - Get Gemini API key
- **OpenAI**: [platform.openai.com](https://platform.openai.com) - Get GPT API key
- **xAI**: [console.x.ai](https://console.x.ai) - Get Grok API key

**🆓 FREE Alternative:**
- Select **GPT-OSS 20B** from the model dropdown - it's FREE via Modal.com!

**Optional:**
- **Tavily**: [tavily.com](https://tavily.com) - For enhanced web research (AI model will be used as fallback)
"""
            return False, error_msg
        
        return True, ""
    
    # Event handlers - clear input immediately and stream response together
    def respond_and_clear(message: str, history: list):
        """Wrapper that yields (cleared_input, chat_history, stop_visible) tuples"""
        global cancel_token
        
        if not message.strip():
            yield "", history, gr.update(visible=False)
            return
        
        # Check for required API keys before proceeding
        keys_valid, error_message = check_required_keys()
        if not keys_valid:
            # Show user message and error about missing keys
            error_history = list(history) + [
                ChatMessage(role="user", content=message),
                ChatMessage(role="assistant", content=error_message)
            ]
            yield "", error_history, gr.update(visible=False)
            return
        
        # Reset cancellation token for new request
        cancel_token.reset()
            
        # First yield: clear input, show loading, and show stop button
        # Get the actual selected model from current_model_settings (not from env)
        selected_model = current_model_settings.get("model", "gpt-oss")
        model_info = AVAILABLE_MODELS.get(selected_model, {})
        model_name = model_info.get("name", selected_model)
        print(f"[Gradio] Using model: {selected_model} ({model_name})")
        initial_history = list(history) + [
            ChatMessage(role="user", content=message),
            ChatMessage(role="assistant", content=f"⏳ *Thinking with {model_name}...*")
        ]
        yield "", initial_history, gr.update(visible=True)
        
        # Stream the actual response (pass initialized_history to avoid duplication)
        updated_history = initial_history  # Initialize in case generator doesn't yield
        for updated_history in chat_with_agent_streaming(message, history, initial_history):
            # Check if cancelled during streaming
            if cancel_token.is_cancelled():
                break
            yield "", updated_history, gr.update(visible=True)
        
        # Final yield: hide stop button when done
        yield "", updated_history, gr.update(visible=False)
    
    def stop_response(history: list):
        """Stop the current response by triggering cancellation"""
        global cancel_token
        
        # Trigger cancellation - this will close the HTTP connection
        cancel_token.cancel()
        
        # Update history to show stopped state (the generator will also update when it detects cancellation)
        if history and len(history) > 0:
            last_msg = history[-1]
            if isinstance(last_msg, ChatMessage):
                content = last_msg.content
                # Remove thinking indicator and add stopped message
                if "⏳" in content:
                    content = content.replace("⏳ *Thinking", "⏹️ *Stopped")
                    content = content.replace("⏳ *Processing", "⏹️ *Stopped")
                if "*— Execution stopped by user*" not in content:
                    content += "\n\n*— Execution stopped by user*"
                history[-1] = ChatMessage(role="assistant", content=content)
        
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
    
    # Save keys handler with JavaScript to store in secure cookies
    # The _js parameter runs after the Python function completes
    save_keys_btn.click(
        save_api_keys, 
        [tavily_key, anthropic_key, google_key, openai_key, xai_key], 
        [keys_status],
        js="""
        (tavily, anthropic, google, openai, xai) => {
            // Store keys in secure cookies using our SecureKeyStorage
            if (window.SecureKeyStorage) {
                const stored = window.SecureKeyStorage.storeAllKeys({
                    tavily: tavily,
                    anthropic: anthropic,
                    google: google,
                    openai: openai,
                    xai: xai
                });
                if (stored.length > 0) {
                    console.log('[SecureKeyStorage] Stored to cookies:', stored.join(', '));
                }
            }
            return [tavily, anthropic, google, openai, xai];
        }
        """
    )
    
    # Clear keys function - clears both session and cookies
    def clear_api_keys():
        """Clear all stored API keys from session and cookies"""
        # Note: modal_endpoint_url is hardcoded, so we don't clear it
        current_model_settings["tavily_api_key"] = ""
        current_model_settings["anthropic_api_key"] = ""
        current_model_settings["google_api_key"] = ""
        current_model_settings["openai_api_key"] = ""
        current_model_settings["xai_api_key"] = ""
        return "", "", "", "", "", "🗑️ All settings cleared from session and cookies"
    
    # Clear keys handler with JavaScript to clear cookies
    clear_keys_btn.click(
        clear_api_keys,
        [],
        [tavily_key, anthropic_key, google_key, openai_key, xai_key, keys_status],
        js="""
        () => {
            // Clear keys from secure cookies
            if (window.SecureKeyStorage) {
                window.SecureKeyStorage.clearAllKeys();
                console.log('[SecureKeyStorage] All cookies cleared');
            }
            return [];
        }
        """
    )

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
