#!/usr/bin/env python3
"""
EU AI Act Compliance Agent - ChatGPT Apps Integration
Exposes EU AI Act MCP tools as ChatGPT Apps using Gradio's MCP server capabilities

Based on: https://www.gradio.app/guides/building-chatgpt-apps-with-gradio

To use in ChatGPT:
1. Run this with: python chatgpt_app.py
2. Enable "developer mode" in ChatGPT Settings → Apps & Connectors → Advanced settings
3. Create a new connector with the MCP server URL shown in terminal
4. Use @eu-ai-act in ChatGPT to interact with the tools
"""

import gradio as gr
import requests
import json
import os
from typing import Optional
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables from root .env file
ROOT_DIR = Path(__file__).parent.parent.parent.parent
load_dotenv(ROOT_DIR / ".env")

# API Configuration - connects to existing Node.js API server
API_URL = os.getenv("API_URL", "http://localhost:3001")
PUBLIC_URL = os.getenv("PUBLIC_URL", "")  # HF Spaces public URL (empty for local dev)
API_TIMEOUT = 600  # seconds


# ============================================================================
# MCP TOOLS - Exposed to ChatGPT with OpenAI Apps SDK metadata
# ============================================================================

@gr.mcp.tool(
    _meta={
        "openai/outputTemplate": "ui://widget/organization.html",
        "openai/resultCanProduceWidget": True,
        "openai/widgetAccessible": True,
    }
)
def discover_organization(organization_name: str, domain: Optional[str] = None, context: Optional[str] = None) -> dict:
    """
    Discover and profile an organization for EU AI Act compliance assessment.
    
    This tool researches an organization and creates a comprehensive profile including:
    - Basic organization information (name, sector, size, location)
    - Contact information (email, phone, website)
    - Regulatory context and compliance deadlines
    - AI maturity level assessment
    - Certifications and compliance status
    
    Based on EU AI Act Articles 16 (Provider Obligations), 22 (Authorized Representatives), and 49 (Registration Requirements).
    
    Parameters:
        organization_name (str): Name of the organization to discover (required)
        domain (str): Organization's domain (e.g., 'ibm.com'). Auto-discovered if not provided.
        context (str): Additional context about the organization
    
    Returns:
        dict: Organization profile with regulatory context
    """
    try:
        # Call the existing Node.js API endpoint
        response = requests.post(
            f"{API_URL}/api/tools/discover_organization",
            json={
                "organizationName": organization_name,
                "domain": domain,
                "context": context
            },
            timeout=API_TIMEOUT
        )
        
        if response.status_code == 200:
            return response.json()
        else:
            return {
                "error": True,
                "message": f"API returned status {response.status_code}",
                "details": response.text
            }
    except requests.exceptions.ConnectionError:
        return {
            "error": True,
            "message": "Cannot connect to API server. Make sure it's running on http://localhost:3001"
        }
    except Exception as e:
        return {
            "error": True,
            "message": str(e)
        }


@gr.mcp.tool(
    _meta={
        "openai/outputTemplate": "ui://widget/ai-services.html",
        "openai/resultCanProduceWidget": True,
        "openai/widgetAccessible": True,
    }
)
def discover_ai_services(
    organization_context: Optional[dict] = None,
    system_names: Optional[list] = None,
    scope: Optional[str] = None,
    context: Optional[str] = None
) -> dict:
    """
    Discover and classify AI systems within an organization per EU AI Act requirements.
    
    This tool scans for AI systems and provides comprehensive compliance analysis:
    - Risk classification per Article 6 and Annex III (Unacceptable, High, Limited, Minimal)
    - Technical documentation status per Article 11
    - Conformity assessment requirements per Article 43
    - Compliance gap analysis with specific Article references
    - Registration status per Article 49
    
    Parameters:
        organization_context (dict): Organization profile from discover_organization tool (optional)
        system_names (list): Specific AI system names to discover (optional)
        scope (str): Scope of discovery: 'all' (default), 'high-risk-only', 'production-only'
        context (str): Additional context about the systems
    
    Returns:
        dict: AI systems discovery results with risk classification
    """
    try:
        response = requests.post(
            f"{API_URL}/api/tools/discover_ai_services",
            json={
                "organizationContext": organization_context,
                "systemNames": system_names,
                "scope": scope,
                "context": context
            },
            timeout=API_TIMEOUT
        )
        
        if response.status_code == 200:
            return response.json()
        else:
            return {
                "error": True,
                "message": f"API returned status {response.status_code}",
                "details": response.text
            }
    except requests.exceptions.ConnectionError:
        return {
            "error": True,
            "message": "Cannot connect to API server. Make sure it's running on http://localhost:3001"
        }
    except Exception as e:
        return {
            "error": True,
            "message": str(e)
        }


@gr.mcp.tool(
    _meta={
        "openai/outputTemplate": "ui://widget/compliance.html",
        "openai/resultCanProduceWidget": True,
        "openai/widgetAccessible": True,
    }
)
def assess_compliance(
    organization_context: Optional[dict] = None,
    ai_services_context: Optional[dict] = None,
    focus_areas: Optional[list] = None,
    generate_documentation: bool = True
) -> dict:
    """
    Assess EU AI Act compliance and generate documentation using AI analysis.
    
    This tool takes organization and AI services context to produce comprehensive compliance assessment:
    - Gap analysis against AI Act requirements (Articles 9-15, 16-22, 43-50)
    - Risk-specific compliance checklists
    - Draft documentation templates in markdown format
    - Remediation recommendations with priorities
    - Overall compliance score (0-100)
    
    Generates professional documentation templates for:
    - Risk Management System (Article 9)
    - Technical Documentation (Article 11, Annex IV)
    - Conformity Assessment (Article 43)
    - Transparency Notice (Article 50)
    - Quality Management System (Article 17)
    - Human Oversight Procedure (Article 14)
    - Data Governance Policy (Article 10)
    
    Parameters:
        organization_context (dict): Organization profile from discover_organization tool
        ai_services_context (dict): AI services discovery results from discover_ai_services tool
        focus_areas (list): Specific compliance areas to focus on
        generate_documentation (bool): Whether to generate documentation templates (default: True)
    
    Returns:
        dict: Compliance assessment with score, gaps, recommendations, and documentation
    """
    try:
        response = requests.post(
            f"{API_URL}/api/tools/assess_compliance",
            json={
                "organizationContext": organization_context,
                "aiServicesContext": ai_services_context,
                "focusAreas": focus_areas,
                "generateDocumentation": generate_documentation
            },
            timeout=API_TIMEOUT
        )
        
        if response.status_code == 200:
            return response.json()
        else:
            return {
                "error": True,
                "message": f"API returned status {response.status_code}",
                "details": response.text
            }
    except requests.exceptions.ConnectionError:
        return {
            "error": True,
            "message": "Cannot connect to API server. Make sure it's running on http://localhost:3001"
        }
    except Exception as e:
        return {
            "error": True,
            "message": str(e)
        }


# ============================================================================
# MCP RESOURCES - HTML/JS/CSS Widgets for ChatGPT Apps
# ============================================================================

@gr.mcp.resource("ui://widget/organization.html", mime_type="text/html+skybridge")
def organization_widget():
    """Widget for displaying organization discovery results in ChatGPT"""
    return """
    <style>
        * { box-sizing: border-box; }
        body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        .org-card {
            background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%);
            border-radius: 16px;
            padding: 24px;
            color: white;
            max-width: 500px;
            margin: 0 auto;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        }
        .org-header {
            display: flex;
            align-items: center;
            gap: 16px;
            margin-bottom: 20px;
        }
        .org-logo {
            width: 64px;
            height: 64px;
            background: rgba(255,255,255,0.1);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 32px;
        }
        .org-name {
            font-size: 24px;
            font-weight: 700;
            margin: 0;
        }
        .org-sector {
            font-size: 14px;
            opacity: 0.8;
            margin: 4px 0 0 0;
        }
        .info-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
            margin: 20px 0;
        }
        .info-item {
            background: rgba(255,255,255,0.1);
            border-radius: 10px;
            padding: 12px;
        }
        .info-label {
            font-size: 11px;
            text-transform: uppercase;
            opacity: 0.7;
            margin-bottom: 4px;
        }
        .info-value {
            font-size: 16px;
            font-weight: 600;
        }
        .compliance-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: rgba(255,255,255,0.15);
            padding: 8px 12px;
            border-radius: 20px;
            font-size: 13px;
            margin-top: 16px;
        }
        .eu-flag { font-size: 18px; }
        .deadline {
            background: rgba(255,193,7,0.2);
            border: 1px solid rgba(255,193,7,0.4);
            border-radius: 8px;
            padding: 12px;
            margin-top: 16px;
        }
        .deadline-title {
            font-size: 12px;
            font-weight: 600;
            margin-bottom: 4px;
            color: #ffc107;
        }
        .deadline-date {
            font-size: 14px;
        }
        .error-card {
            background: #f44336;
            border-radius: 12px;
            padding: 20px;
            color: white;
            text-align: center;
        }
    </style>
    
    <div id="org-container">
        <div class="org-card" id="card">
            <div class="org-header">
                <div class="org-logo" id="logo">🏢</div>
                <div>
                    <h1 class="org-name" id="org-name">Loading...</h1>
                    <p class="org-sector" id="org-sector">Discovering organization...</p>
                </div>
            </div>
            
            <div class="info-grid">
                <div class="info-item">
                    <div class="info-label">Size</div>
                    <div class="info-value" id="size">-</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Headquarters</div>
                    <div class="info-value" id="hq">-</div>
                </div>
                <div class="info-item">
                    <div class="info-label">EU Presence</div>
                    <div class="info-value" id="eu-presence">-</div>
                </div>
                <div class="info-item">
                    <div class="info-label">AI Maturity</div>
                    <div class="info-value" id="ai-maturity">-</div>
                </div>
            </div>
            
            <div class="compliance-badge">
                <span class="eu-flag">🇪🇺</span>
                <span id="framework">EU AI Act Compliance Assessment</span>
            </div>
            
            <div class="deadline" id="deadline-container">
                <div class="deadline-title">⏰ Next Compliance Deadline</div>
                <div class="deadline-date" id="deadline">Loading...</div>
            </div>
        </div>
    </div>
    
    <script>
        function renderOrganization(data) {
            if (!data || data.error) {
                document.getElementById('org-container').innerHTML = 
                    '<div class="error-card">❌ ' + (data?.message || 'Failed to load organization') + '</div>';
                return;
            }
            
            const org = data.organization || data;
            const regulatory = data.regulatoryContext || {};
            
            document.getElementById('org-name').textContent = org.name || 'Unknown';
            document.getElementById('org-sector').textContent = org.sector || 'Technology';
            document.getElementById('size').textContent = org.size || 'Unknown';
            document.getElementById('hq').textContent = 
                (org.headquarters?.city || 'Unknown') + ', ' + (org.headquarters?.country || '');
            document.getElementById('eu-presence').textContent = org.euPresence ? '✅ Yes' : '❌ No';
            document.getElementById('ai-maturity').textContent = org.aiMaturityLevel || 'Unknown';
            
            // Show nearest deadline
            const deadlines = regulatory.complianceDeadlines || [];
            if (deadlines.length > 0) {
                const nearest = deadlines[0];
                document.getElementById('deadline').textContent = 
                    nearest.date + ' - ' + nearest.description;
            } else {
                document.getElementById('deadline-container').style.display = 'none';
            }
        }
        
        function render() {
            const data = window.openai?.toolOutput;
            if (data) {
                // Handle both direct text content and structured content
                let parsedData = data;
                if (typeof data === 'string') {
                    try { parsedData = JSON.parse(data); } catch (e) {}
                } else if (data.text) {
                    try { parsedData = JSON.parse(data.text); } catch (e) { parsedData = data; }
                } else if (data.content) {
                    for (const item of data.content) {
                        if (item.type === 'text') {
                            try { parsedData = JSON.parse(item.text); break; } catch (e) {}
                        }
                    }
                }
                renderOrganization(parsedData);
            }
        }
        
        window.addEventListener("openai:set_globals", (event) => {
            if (event.detail?.globals?.toolOutput) render();
        }, { passive: true });
        
        render();
    </script>
    """


@gr.mcp.resource("ui://widget/ai-services.html", mime_type="text/html+skybridge")
def ai_services_widget():
    """Widget for displaying AI services discovery results in ChatGPT"""
    return """
    <style>
        * { box-sizing: border-box; }
        body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        .services-container {
            max-width: 600px;
            margin: 0 auto;
            padding: 16px;
        }
        .summary-card {
            background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%);
            border-radius: 16px;
            padding: 20px;
            color: white;
            margin-bottom: 16px;
        }
        .summary-title {
            font-size: 18px;
            font-weight: 700;
            margin: 0 0 16px 0;
        }
        .risk-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 8px;
        }
        .risk-item {
            text-align: center;
            padding: 12px 8px;
            background: rgba(255,255,255,0.15);
            border-radius: 8px;
        }
        .risk-count {
            font-size: 28px;
            font-weight: 700;
        }
        .risk-label {
            font-size: 10px;
            text-transform: uppercase;
            opacity: 0.8;
            margin-top: 4px;
        }
        .risk-unacceptable { color: #ff1744; }
        .risk-high { color: #ff9100; }
        .risk-limited { color: #ffea00; }
        .risk-minimal { color: #00e676; }
        .system-card {
            background: white;
            border-radius: 12px;
            padding: 16px;
            margin-bottom: 12px;
            border-left: 4px solid #ccc;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }
        .system-card.high { border-left-color: #ff9100; background: #fff8e1; }
        .system-card.limited { border-left-color: #ffc107; background: #fffde7; }
        .system-card.minimal { border-left-color: #4caf50; background: #e8f5e9; }
        .system-card.unacceptable { border-left-color: #f44336; background: #ffebee; }
        .system-name {
            font-size: 16px;
            font-weight: 600;
            margin: 0 0 8px 0;
            color: #333;
        }
        .system-purpose {
            font-size: 13px;
            color: #666;
            margin: 0 0 12px 0;
        }
        .system-meta {
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
        }
        .meta-badge {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            font-size: 11px;
            background: rgba(0,0,0,0.06);
            padding: 4px 8px;
            border-radius: 12px;
            color: #555;
        }
        .empty-state {
            text-align: center;
            padding: 40px;
            color: #666;
        }
    </style>
    
    <div class="services-container" id="container">
        <div class="summary-card">
            <h2 class="summary-title">🤖 AI Systems Risk Overview</h2>
            <div class="risk-grid">
                <div class="risk-item">
                    <div class="risk-count risk-unacceptable" id="unacceptable">0</div>
                    <div class="risk-label">Unacceptable</div>
                </div>
                <div class="risk-item">
                    <div class="risk-count risk-high" id="high">0</div>
                    <div class="risk-label">High Risk</div>
                </div>
                <div class="risk-item">
                    <div class="risk-count risk-limited" id="limited">0</div>
                    <div class="risk-label">Limited</div>
                </div>
                <div class="risk-item">
                    <div class="risk-count risk-minimal" id="minimal">0</div>
                    <div class="risk-label">Minimal</div>
                </div>
            </div>
        </div>
        <div id="systems-list"></div>
    </div>
    
    <script>
        function renderServices(data) {
            if (!data || data.error) {
                document.getElementById('systems-list').innerHTML = 
                    '<div class="empty-state">❌ ' + (data?.message || 'No AI systems found') + '</div>';
                return;
            }
            
            const summary = data.riskSummary || {};
            document.getElementById('unacceptable').textContent = summary.unacceptableRiskCount || 0;
            document.getElementById('high').textContent = summary.highRiskCount || 0;
            document.getElementById('limited').textContent = summary.limitedRiskCount || 0;
            document.getElementById('minimal').textContent = summary.minimalRiskCount || 0;
            
            const systems = data.systems || [];
            const listHtml = systems.map(sys => {
                const risk = sys.riskClassification?.category?.toLowerCase() || 'minimal';
                const name = sys.system?.name || 'Unknown System';
                const purpose = sys.system?.intendedPurpose || 'No description';
                const score = sys.riskClassification?.riskScore || 0;
                const conformity = sys.riskClassification?.conformityAssessmentRequired ? '⚠️ Required' : '✅ Not Required';
                
                return '<div class="system-card ' + risk + '">' +
                    '<h3 class="system-name">' + name + '</h3>' +
                    '<p class="system-purpose">' + purpose.substring(0, 120) + (purpose.length > 120 ? '...' : '') + '</p>' +
                    '<div class="system-meta">' +
                    '<span class="meta-badge">📊 Risk: ' + score + '/100</span>' +
                    '<span class="meta-badge">📋 Conformity: ' + conformity + '</span>' +
                    '</div></div>';
            }).join('');
            
            document.getElementById('systems-list').innerHTML = listHtml || '<div class="empty-state">No systems discovered</div>';
        }
        
        function render() {
            const data = window.openai?.toolOutput;
            if (data) {
                let parsedData = data;
                if (typeof data === 'string') {
                    try { parsedData = JSON.parse(data); } catch (e) {}
                } else if (data.text) {
                    try { parsedData = JSON.parse(data.text); } catch (e) { parsedData = data; }
                } else if (data.content) {
                    for (const item of data.content) {
                        if (item.type === 'text') {
                            try { parsedData = JSON.parse(item.text); break; } catch (e) {}
                        }
                    }
                }
                renderServices(parsedData);
            }
        }
        
        window.addEventListener("openai:set_globals", (event) => {
            if (event.detail?.globals?.toolOutput) render();
        }, { passive: true });
        
        render();
    </script>
    """


@gr.mcp.resource("ui://widget/compliance.html", mime_type="text/html+skybridge")
def compliance_widget():
    """Widget for displaying compliance assessment results in ChatGPT"""
    return """
    <style>
        * { box-sizing: border-box; }
        body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        .compliance-container {
            max-width: 600px;
            margin: 0 auto;
            padding: 16px;
        }
        .score-card {
            background: linear-gradient(135deg, #1a237e 0%, #283593 100%);
            border-radius: 20px;
            padding: 24px;
            color: white;
            text-align: center;
            margin-bottom: 16px;
        }
        .score-ring {
            width: 140px;
            height: 140px;
            margin: 0 auto 16px;
            position: relative;
        }
        .score-ring svg {
            transform: rotate(-90deg);
            width: 100%;
            height: 100%;
        }
        .score-ring circle {
            fill: none;
            stroke-width: 12;
        }
        .score-ring .bg { stroke: rgba(255,255,255,0.2); }
        .score-ring .progress { stroke: #4caf50; stroke-linecap: round; transition: stroke-dashoffset 1s ease; }
        .score-value {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 42px;
            font-weight: 800;
        }
        .score-label {
            font-size: 14px;
            opacity: 0.8;
        }
        .risk-badge {
            display: inline-block;
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: 600;
            font-size: 14px;
            margin-top: 12px;
        }
        .risk-critical { background: #f44336; }
        .risk-high { background: #ff9800; }
        .risk-medium { background: #ffc107; color: #333; }
        .risk-low { background: #4caf50; }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
            margin-bottom: 16px;
        }
        .stat-card {
            background: white;
            border-radius: 12px;
            padding: 16px;
            text-align: center;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }
        .stat-value {
            font-size: 28px;
            font-weight: 700;
            color: #333;
        }
        .stat-label {
            font-size: 12px;
            color: #666;
            margin-top: 4px;
        }
        .gaps-section, .recs-section {
            background: white;
            border-radius: 12px;
            padding: 16px;
            margin-bottom: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }
        .section-title {
            font-size: 16px;
            font-weight: 700;
            color: #333;
            margin: 0 0 12px 0;
        }
        .gap-item, .rec-item {
            padding: 10px 12px;
            background: #f5f5f5;
            border-radius: 8px;
            margin-bottom: 8px;
            font-size: 13px;
        }
        .gap-item.critical { background: #ffebee; border-left: 3px solid #f44336; }
        .gap-item.high { background: #fff3e0; border-left: 3px solid #ff9800; }
        .gap-article {
            font-size: 11px;
            color: #666;
            margin-top: 4px;
        }
        .rec-priority {
            display: inline-block;
            background: #e3f2fd;
            color: #1976d2;
            padding: 2px 8px;
            border-radius: 10px;
            font-size: 10px;
            font-weight: 600;
            margin-right: 8px;
        }
        .action-btn {
            display: block;
            width: 100%;
            padding: 14px;
            background: #1976d2;
            color: white;
            border: none;
            border-radius: 10px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            margin-top: 16px;
        }
        .action-btn:hover { background: #1565c0; }
    </style>
    
    <div class="compliance-container" id="container">
        <div class="score-card">
            <div class="score-ring">
                <svg viewBox="0 0 100 100">
                    <circle class="bg" cx="50" cy="50" r="42"/>
                    <circle class="progress" id="progress-ring" cx="50" cy="50" r="42" 
                        stroke-dasharray="264" stroke-dashoffset="264"/>
                </svg>
                <div class="score-value" id="score">--</div>
            </div>
            <div class="score-label">EU AI Act Compliance Score</div>
            <div class="risk-badge risk-medium" id="risk-badge">Calculating...</div>
        </div>
        
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value" id="gaps-count">-</div>
                <div class="stat-label">Compliance Gaps</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" id="recs-count">-</div>
                <div class="stat-label">Recommendations</div>
            </div>
        </div>
        
        <div class="gaps-section">
            <h3 class="section-title">⚠️ Priority Gaps</h3>
            <div id="gaps-list"></div>
        </div>
        
        <div class="recs-section">
            <h3 class="section-title">💡 Top Recommendations</h3>
            <div id="recs-list"></div>
        </div>
        
        <button class="action-btn" id="run-again" style="display:none;">
            🔄 Run Full Assessment
        </button>
    </div>
    
    <script>
        function renderCompliance(data) {
            if (!data || data.error) {
                document.getElementById('score').textContent = '❌';
                document.getElementById('gaps-list').innerHTML = '<div style="color:#999;text-align:center;">Error: ' + (data?.message || 'Assessment failed') + '</div>';
                return;
            }
            
            const assessment = data.assessment || data;
            const score = assessment.overallScore || 0;
            const riskLevel = assessment.riskLevel || 'MEDIUM';
            const gaps = assessment.gaps || [];
            const recs = assessment.recommendations || [];
            
            // Animate score ring
            document.getElementById('score').textContent = score;
            const offset = 264 - (264 * score / 100);
            document.getElementById('progress-ring').style.strokeDashoffset = offset;
            
            // Set progress color based on score
            const progressEl = document.getElementById('progress-ring');
            if (score >= 80) progressEl.style.stroke = '#4caf50';
            else if (score >= 60) progressEl.style.stroke = '#ffc107';
            else if (score >= 40) progressEl.style.stroke = '#ff9800';
            else progressEl.style.stroke = '#f44336';
            
            // Risk badge
            const badgeEl = document.getElementById('risk-badge');
            badgeEl.textContent = riskLevel + ' Risk';
            badgeEl.className = 'risk-badge risk-' + riskLevel.toLowerCase();
            
            // Stats
            document.getElementById('gaps-count').textContent = gaps.length;
            document.getElementById('recs-count').textContent = recs.length;
            
            // Top gaps (show critical/high first)
            const topGaps = gaps
                .sort((a, b) => {
                    const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
                    return (order[a.severity] || 3) - (order[b.severity] || 3);
                })
                .slice(0, 3);
            
            const gapsHtml = topGaps.map(gap => {
                const severity = (gap.severity || 'medium').toLowerCase();
                return '<div class="gap-item ' + severity + '">' +
                    '<strong>' + (gap.category || 'Compliance') + ':</strong> ' + 
                    (gap.description || 'Gap identified').substring(0, 100) + '...' +
                    '<div class="gap-article">' + (gap.articleReference || '') + '</div>' +
                    '</div>';
            }).join('');
            
            document.getElementById('gaps-list').innerHTML = gapsHtml || '<div style="color:#999;">No gaps identified</div>';
            
            // Top recommendations
            const topRecs = recs.sort((a, b) => (a.priority || 10) - (b.priority || 10)).slice(0, 3);
            const recsHtml = topRecs.map(rec => {
                return '<div class="rec-item">' +
                    '<span class="rec-priority">Priority ' + (rec.priority || '-') + '</span>' +
                    (rec.title || rec.description || 'Recommendation').substring(0, 80) +
                    '</div>';
            }).join('');
            
            document.getElementById('recs-list').innerHTML = recsHtml || '<div style="color:#999;">No recommendations</div>';
            
            // Show action button
            document.getElementById('run-again').style.display = 'block';
            document.getElementById('run-again').onclick = async function() {
                this.textContent = '⏳ Running...';
                this.disabled = true;
                try {
                    await window.openai.callTool('assess_compliance', {
                        organization_context: data.metadata?.organizationAssessed ? { name: data.metadata.organizationAssessed } : null,
                        generate_documentation: true
                    });
                } catch (e) {
                    console.error(e);
                }
                this.textContent = '🔄 Run Full Assessment';
                this.disabled = false;
            };
        }
        
        function render() {
            const data = window.openai?.toolOutput;
            if (data) {
                let parsedData = data;
                if (typeof data === 'string') {
                    try { parsedData = JSON.parse(data); } catch (e) {}
                } else if (data.text) {
                    try { parsedData = JSON.parse(data.text); } catch (e) { parsedData = data; }
                } else if (data.content) {
                    for (const item of data.content) {
                        if (item.type === 'text') {
                            try { parsedData = JSON.parse(item.text); break; } catch (e) {}
                        }
                    }
                }
                renderCompliance(parsedData);
            }
        }
        
        window.addEventListener("openai:set_globals", (event) => {
            if (event.detail?.globals?.toolOutput) render();
        }, { passive: true });
        
        render();
    </script>
    """


# ============================================================================
# GRADIO UI - For testing tools and displaying resource code
# ============================================================================

# Build header based on environment
_is_production = bool(PUBLIC_URL)
if _is_production:
    _mcp_url = f"{PUBLIC_URL.rstrip('/')}/gradio_api/mcp/"
    _env_info = f"""
        <div style="background: rgba(76, 175, 80, 0.2); border: 1px solid rgba(76, 175, 80, 0.4); border-radius: 8px; padding: 12px; margin-top: 15px;">
            <p style="margin: 0; font-size: 0.85em;">🌐 <strong>Production Mode - MCP Server Ready</strong></p>
            <p style="margin: 8px 0 0 0; font-size: 0.9em;">
                <strong>MCP URL (copy this):</strong><br>
                <code style="background: rgba(255,255,255,0.3); padding: 6px 10px; border-radius: 4px; display: inline-block; margin-top: 4px; word-break: break-all; font-size: 0.85em;">{_mcp_url}</code>
            </p>
            <p style="margin: 10px 0 0 0; font-size: 0.75em; opacity: 0.8;">
                ChatGPT → Settings → Apps & Connectors → Create Connector → Paste URL
            </p>
        </div>
    """
else:
    _env_info = """
        <div style="background: rgba(33, 150, 243, 0.2); border: 1px solid rgba(33, 150, 243, 0.4); border-radius: 8px; padding: 12px; margin-top: 15px;">
            <p style="margin: 0; font-size: 0.85em;">🛠️ <strong>Local Development</strong></p>
            <p style="margin: 5px 0 0 0; font-size: 0.8em; opacity: 0.9;">MCP URL: <code>http://localhost:7860/gradio_api/mcp/</code></p>
            <p style="margin: 8px 0 0 0; font-size: 0.8em;">For public URL, run with <code>GRADIO_SHARE=true</code></p>
        </div>
    """

with gr.Blocks(
    title="🇪🇺 EU AI Act - ChatGPT App",
) as demo:
    
    gr.HTML(f"""
        <div style="text-align: center; padding: 20px 0; background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); border-radius: 12px; color: white; margin-bottom: 20px;">
            <h1 style="margin: 0; font-size: 2em;">🇪🇺 EU AI Act Compliance</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">ChatGPT App powered by Gradio MCP</p>
            <p style="margin: 5px 0 0 0; font-size: 0.85em; opacity: 0.7;">by <a href="https://www.legitima.ai" target="_blank" style="color: #90CAF9;">Legitima.ai</a></p>
            {_env_info}
        </div>
    """)
    
    gr.Markdown("""
    ## 🚀 How to Use in ChatGPT
    
    1. **Get the MCP URL** from the terminal/Space logs  
       ⚠️ **Important:** The URL must end with `/gradio_api/mcp/`  
       Example: `https://xxx.gradio.live/gradio_api/mcp/`
    2. **Enable Developer Mode** in ChatGPT: Settings → Apps & Connectors → Advanced settings
    3. **Create a Connector** with the MCP server URL (choose "No authentication")
    4. **Chat with ChatGPT** using `@eu-ai-act` to access these tools
    
    ---
    """)
    
    with gr.Tab("🔧 Test Tools"):
        gr.Markdown("### Test MCP Tools Directly")
        
        with gr.Row():
            with gr.Column():
                org_name = gr.Textbox(label="Organization Name", placeholder="e.g., Microsoft, IBM, OpenAI")
                org_domain = gr.Textbox(label="Domain (optional)", placeholder="e.g., microsoft.com")
                org_context = gr.Textbox(label="Context (optional)", placeholder="Additional context...")
                discover_btn = gr.Button("🔍 Discover Organization", variant="primary")
            
            with gr.Column():
                org_result = gr.JSON(label="Organization Profile")
        
        gr.Markdown("---")
        
        with gr.Row():
            with gr.Column():
                ai_systems_input = gr.Textbox(label="System Names (comma-separated)", placeholder="e.g., Watson, Copilot")
                ai_scope = gr.Dropdown(choices=["all", "high-risk-only", "production-only"], value="all", label="Scope")
                discover_ai_btn = gr.Button("🤖 Discover AI Services", variant="primary")
            
            with gr.Column():
                ai_result = gr.JSON(label="AI Services Discovery")
        
        gr.Markdown("---")
        
        with gr.Row():
            with gr.Column():
                gen_docs = gr.Checkbox(label="Generate Documentation", value=True)
                assess_btn = gr.Button("📊 Assess Compliance", variant="primary")
            
            with gr.Column():
                compliance_result = gr.JSON(label="Compliance Assessment")
    
    with gr.Tab("📝 Widget Code"):
        gr.Markdown("### MCP Resource Widgets (HTML/JS/CSS)")
        gr.Markdown("These widgets are displayed in ChatGPT when tools are called.")
        
        with gr.Accordion("Organization Widget", open=False):
            org_html = gr.Code(language="html", label="organization.html")
            org_btn = gr.Button("Load Code")
            org_btn.click(organization_widget, outputs=org_html)
        
        with gr.Accordion("AI Services Widget", open=False):
            ai_html = gr.Code(language="html", label="ai-services.html")
            ai_btn = gr.Button("Load Code")
            ai_btn.click(ai_services_widget, outputs=ai_html)
        
        with gr.Accordion("Compliance Widget", open=False):
            comp_html = gr.Code(language="html", label="compliance.html")
            comp_btn = gr.Button("Load Code")
            comp_btn.click(compliance_widget, outputs=comp_html)
    
    with gr.Tab("ℹ️ About"):
        gr.Markdown("""
        ## About This ChatGPT App
        
        This Gradio app exposes **EU AI Act compliance tools** as a ChatGPT App using the 
        [Gradio MCP Server](https://www.gradio.app/guides/building-chatgpt-apps-with-gradio) capabilities.
        
        ### Available Tools
        
        | Tool | Description | EU AI Act Articles |
        |------|-------------|-------------------|
        | `discover_organization` | Research organization profile | Articles 16, 22, 49 |
        | `discover_ai_services` | Classify AI systems by risk | Articles 6, 11, Annex III |
        | `assess_compliance` | Generate compliance report | Articles 9-15, 43-50 |
        
        ### Key Features
        
        - 🏢 **Organization Discovery**: Automatic research using Tavily AI or model fallback
        - 🤖 **AI Systems Classification**: Risk categorization per EU AI Act Annex III
        - 📊 **Compliance Assessment**: Gap analysis and documentation generation
        - 🎨 **Beautiful Widgets**: Rich UI cards displayed directly in ChatGPT
        
        ### Tech Stack
        
        - **Gradio** with MCP server (`gradio[mcp]>=6.0`)
        - **OpenAI Apps SDK** compatible widgets
        - **Node.js API** backend with Vercel AI SDK
        
        ---
        
        Built for the **MCP 1st Birthday Hackathon** 🎂
        """)
    
    # Event handlers
    def run_discover_org(name, domain, context):
        if not name:
            return {"error": "Please enter an organization name"}
        return discover_organization(name, domain or None, context or None)
    
    def run_discover_ai(systems, scope):
        system_names = [s.strip() for s in systems.split(",")] if systems else None
        return discover_ai_services(None, system_names, scope, None)
    
    def run_assess(gen_docs):
        return assess_compliance(None, None, None, gen_docs)
    
    discover_btn.click(run_discover_org, [org_name, org_domain, org_context], org_result)
    discover_ai_btn.click(run_discover_ai, [ai_systems_input, ai_scope], ai_result)
    assess_btn.click(run_assess, [gen_docs], compliance_result)


# ============================================================================
# LAUNCH
# ============================================================================

# File to store the MCP URL for the main Gradio app to read
MCP_URL_FILE = Path(__file__).parent / ".mcp_url"

def save_mcp_url(url: str):
    """Save the MCP URL to a file for the main Gradio app to read"""
    try:
        # Ensure parent directory exists
        MCP_URL_FILE.parent.mkdir(parents=True, exist_ok=True)
        MCP_URL_FILE.write_text(url)
        print(f"\n✅ MCP URL saved to: {MCP_URL_FILE}")
        print(f"   URL content: {url}")
    except Exception as e:
        print(f"⚠️ Could not save MCP URL: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    is_production = bool(PUBLIC_URL)
    server_port = int(os.getenv("GRADIO_SERVER_PORT", os.getenv("CHATGPT_APP_SERVER_PORT", "7860")))
    use_share = os.getenv("GRADIO_SHARE", "false").lower() == "true"
    
    print("\n" + "=" * 70)
    print("🇪🇺 EU AI Act Compliance - ChatGPT App (MCP Server)")
    print("=" * 70)
    
    if is_production:
        # Production on HF Spaces - MCP URL is based on PUBLIC_URL
        mcp_url = f"{PUBLIC_URL.rstrip('/')}/gradio_api/mcp/"
        print(f"\n🌐 Environment: PRODUCTION (HF Spaces)")
        print(f"\n" + "=" * 70)
        print("🎉 MCP SERVER READY!")
        print("=" * 70)
        print(f"\n🔗 MCP URL FOR CHATGPT (copy this):\n")
        print(f"   {mcp_url}")
        print(f"\n📍 Space URL: {PUBLIC_URL}")
        print("=" * 70)
    else:
        print(f"\n🛠️  Environment: LOCAL DEVELOPMENT")
        if use_share:
            print(f"   MCP URL will be shown after launch (share=True)")
        else:
            print(f"   MCP URL: http://localhost:{server_port}/gradio_api/mcp/")
    
    print(f"\n📡 API Server: {API_URL}")
    print(f"📍 Server Port: {server_port}")
    print("\n📖 ChatGPT Integration:")
    print("   1. Copy the MCP URL shown above")
    print("   2. Enable 'Developer Mode' in ChatGPT Settings → Apps & Connectors")
    print("   3. Create a connector with the MCP URL (No authentication)")
    print("   4. Use @eu-ai-act in ChatGPT to access tools")
    print("\n🚀 Starting Gradio MCP Server...")
    print("=" * 70 + "\n")
    
    # Launch the MCP server
    demo.launch(
        server_name=os.getenv("CHATGPT_APP_SERVER_NAME", "0.0.0.0"),
        server_port=server_port,
        share=use_share,  # Only use share for local dev if needed
        mcp_server=True,  # Enable MCP server for ChatGPT integration
        show_error=True,
    )

