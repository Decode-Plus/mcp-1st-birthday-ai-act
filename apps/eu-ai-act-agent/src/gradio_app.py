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
API_TIMEOUT = 600  # seconds - increased for long-running compliance assessments

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
# SECURITY: Store user-provided keys for this session only
# NOTE: API keys are REQUIRED - no backend keys are provided
current_model_settings = {
    "model": os.getenv("AI_MODEL", "claude-4.5"),  # Default to Anthropic (hackathon host!)
    # User-provided keys (REQUIRED - no backend fallback)
    "openai_api_key": "",
    "xai_api_key": "",
    "anthropic_api_key": "",
    "tavily_api_key": ""  # Required for web research & organization discovery
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
    API keys are REQUIRED - no backend keys are provided.
    User must provide their own keys via the Model Settings UI.
    """
    headers = {"Content-Type": "application/json"}
    
    # Pass model selection
    if current_model_settings["model"]:
        headers["X-AI-Model"] = current_model_settings["model"]
    
    # Pass user-provided API keys (REQUIRED - no backend fallback)
    model = current_model_settings["model"]
    if model == "gpt-5" and current_model_settings["openai_api_key"]:
        headers["X-OpenAI-API-Key"] = current_model_settings["openai_api_key"]
    elif model == "grok-4-1" and current_model_settings["xai_api_key"]:
        headers["X-XAI-API-Key"] = current_model_settings["xai_api_key"]
    elif model == "claude-4.5" and current_model_settings["anthropic_api_key"]:
        headers["X-Anthropic-API-Key"] = current_model_settings["anthropic_api_key"]
    
    # Tavily API key for web research (REQUIRED for organization discovery)
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
    
    # Custom CSS and JavaScript to handle scroll behavior and styling
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
    </style>
    
    <script>
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
                value="claude-4.5",  # Default to Anthropic (hackathon host!)
                label="AI Model",
                info="Select the AI model to use"
            )
            
            # API Key inputs (password fields) - REQUIRED: No backend keys provided
            with gr.Accordion("🔑 API Keys (Required)", open=True):
                gr.Markdown("⚠️ **API keys are required to use this service.** Please provide your own API keys below.")
                
                gr.Markdown("#### 🔍 Research API")
                tavily_key = gr.Textbox(
                    label="Tavily API Key *",
                    placeholder="tvly-... (required for web research)",
                    type="password",
                    value="",  # Never show existing keys
                    info="Required - for web research & organization discovery"
                )
                
                gr.Markdown("#### 🤖 AI Model APIs")
                anthropic_key = gr.Textbox(
                    label="Anthropic API Key *",
                    placeholder="sk-ant-... (required for Claude 4.5)",
                    type="password",
                    value="",  # Never show existing keys
                    info="Required - for Claude 4.5 (default model)"
                )
                openai_key = gr.Textbox(
                    label="OpenAI API Key",
                    placeholder="sk-... (required for GPT-5)",
                    type="password",
                    value="",  # Never show existing keys
                    info="Required if using GPT-5 model"
                )
                xai_key = gr.Textbox(
                    label="xAI API Key",
                    placeholder="xai-... (required for Grok 4.1)",
                    type="password",
                    value="",  # Never show existing keys
                    info="Required if using Grok 4.1 model"
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
                label="🔧 MCP Tools - Generate Reports & Documentation"
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
        API keys are REQUIRED - no backend keys are provided.
        """
        saved = []
        missing = []
        
        # Only update if a real key is provided
        if tavily_val and len(tavily_val) > 10:
            current_model_settings["tavily_api_key"] = tavily_val
            saved.append("Tavily")
        else:
            missing.append("Tavily")
        
        if anthropic_val and len(anthropic_val) > 10:
            current_model_settings["anthropic_api_key"] = anthropic_val
            saved.append("Anthropic")
        
        if openai_val and len(openai_val) > 10:
            current_model_settings["openai_api_key"] = openai_val
            saved.append("OpenAI")
        
        if xai_val and len(xai_val) > 10:
            current_model_settings["xai_api_key"] = xai_val
            saved.append("xAI")
        
        # Build status message
        status_parts = []
        if saved:
            status_parts.append(f"✅ Keys saved: {', '.join(saved)}")
        
        # Check for missing required keys based on selected model
        model = current_model_settings["model"]
        model_key_missing = False
        if model == "claude-4.5" and not current_model_settings["anthropic_api_key"]:
            model_key_missing = True
            status_parts.append("⚠️ **Anthropic API key required** for Claude 4.5")
        elif model == "gpt-5" and not current_model_settings["openai_api_key"]:
            model_key_missing = True
            status_parts.append("⚠️ **OpenAI API key required** for GPT-5")
        elif model == "grok-4-1" and not current_model_settings["xai_api_key"]:
            model_key_missing = True
            status_parts.append("⚠️ **xAI API key required** for Grok 4.1")
        
        # Tavily is always required for research tools
        if "Tavily" in missing:
            status_parts.append("⚠️ **Tavily API key required** for web research")
        
        if not status_parts:
            return "✅ All required keys configured!"
        
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
        """
        missing_keys = []
        
        # Check model API key based on selected model
        model = current_model_settings["model"]
        if model == "claude-4.5" and not current_model_settings["anthropic_api_key"]:
            missing_keys.append("**Anthropic API Key** (required for Claude 4.5)")
        elif model == "gpt-5" and not current_model_settings["openai_api_key"]:
            missing_keys.append("**OpenAI API Key** (required for GPT-5)")
        elif model == "grok-4-1" and not current_model_settings["xai_api_key"]:
            missing_keys.append("**xAI API Key** (required for Grok 4.1)")
        
        # Tavily is required for web research and organization discovery
        if not current_model_settings["tavily_api_key"]:
            missing_keys.append("**Tavily API Key** (required for web research & organization discovery)")
        
        if missing_keys:
            error_msg = """## ⚠️ API Keys Required

To use this service, you need to provide your own API keys. The following keys are missing:

"""
            for key in missing_keys:
                error_msg += f"- {key}\n"
            
            error_msg += """
### How to add your API keys:

1. Expand the **🔑 API Keys (Required)** section in the sidebar
2. Enter your API keys in the corresponding fields
3. Click **💾 Save Keys**

### Where to get API keys:

- **Tavily**: [tavily.com](https://tavily.com) - Sign up for free tier
- **Anthropic**: [console.anthropic.com](https://console.anthropic.com) - Get Claude API key
- **OpenAI**: [platform.openai.com](https://platform.openai.com) - Get GPT API key
- **xAI**: [console.x.ai](https://console.x.ai) - Get Grok API key
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
        model_name = AVAILABLE_MODELS.get(current_model_settings["model"], {}).get("name", current_model_settings["model"])
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
