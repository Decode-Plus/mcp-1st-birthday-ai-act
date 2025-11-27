# 💡 Usage Examples

Real-world examples of using the EU AI Act Compliance Agent.

## 🎯 Example 1: Understanding the Basics

### Question
```
What is the EU AI Act and why should I care about it?
```

### Agent Response
The agent will explain:
- Overview of the EU AI Act (Regulation 2024/1689)
- Why it matters for organizations deploying AI in Europe
- Key risk categories and their implications
- Important deadlines (Feb 2025, Aug 2026, Aug 2027)
- Penalties for non-compliance

**Use Case**: Educating stakeholders and leadership teams

---

## 🏢 Example 2: Organization Discovery

### Question
```
Discover and analyze OpenAI's compliance profile
```

### Agent Workflow
1. **Calls `discover_organization`** with "OpenAI"
   - Searches company information via Tavily
   - Identifies sector, size, AI maturity level
   - Maps EU presence and regulatory obligations
   
2. **Returns Profile**:
   ```json
   {
     "organization": {
       "name": "OpenAI",
       "sector": "AI Research & Development",
       "size": "Large Enterprise",
       "aiMaturityLevel": "Expert",
       "euPresence": true,
       "primaryRole": "Provider"
     },
     "regulatoryContext": {
       "hasQualityManagementSystem": true,
       "hasRiskManagementSystem": true,
       "complianceDeadlines": [...]
     }
   }
   ```

3. **Provides Insights**:
   - OpenAI is a Large Enterprise with Expert AI maturity
   - As an AI Provider, they must comply with Articles 16-29
   - They need authorized representative in EU (Article 22)
   - Must register high-risk systems in EU database

**Use Case**: Initial compliance assessment for your organization or analyzing competitors

---

## 🤖 Example 3: AI System Classification

### Question
```
Is a recruitment screening AI system high-risk under the EU AI Act?
```

### Agent Response
Yes, it's HIGH RISK per **Annex III, Section 4(a)**: "AI systems intended to be used for recruitment or selection of natural persons."

**Requirements**:
- ✅ Conformity assessment (Article 43) - Must undergo third-party assessment
- ✅ Technical documentation (Article 11, Annex IV) - Comprehensive system docs
- ✅ Risk management system (Article 9) - Continuous risk monitoring
- ✅ Data governance (Article 10) - Training data quality assurance
- ✅ Human oversight (Article 14) - Human-in-the-loop procedures
- ✅ Transparency (Article 13) - Clear information to users
- ✅ CE marking (Article 48) - Affixing CE mark
- ✅ EU database registration (Article 49) - Registration before deployment

**Timeline**:
- Compliance required by: **August 2, 2026**

**Use Case**: Determining if your AI system requires strict compliance measures

---

## 🔍 Example 4: Comprehensive System Discovery

### Question
```
Scan and classify all AI systems for a company called "TechCorp AI"
```

### Agent Workflow
1. **Calls `discover_organization`** for TechCorp AI
   - Gets organization context
   
2. **Calls `discover_ai_services`** with organization context
   - Discovers AI systems (real or mock data)
   - Classifies each by risk level
   - Identifies compliance gaps
   
3. **Returns Inventory**:
   ```json
   {
     "systems": [
       {
         "system": {
           "name": "Customer Service Chatbot",
           "status": "Production"
         },
         "riskClassification": {
           "category": "Limited",
           "riskScore": 35
         }
       },
       {
         "system": {
           "name": "Fraud Detection System",
           "status": "Production"
         },
         "riskClassification": {
           "category": "High",
           "annexIIICategory": "Annex III, Section 5(d)",
           "riskScore": 85
         }
       }
     ],
     "riskSummary": {
       "highRiskCount": 1,
       "limitedRiskCount": 1,
       "totalCount": 2
     }
   }
   ```

4. **Provides Summary**:
   - TechCorp AI has 2 AI systems
   - 1 high-risk system requiring immediate attention
   - 1 limited-risk system with transparency obligations

**Use Case**: Creating a comprehensive AI system inventory for compliance planning

---

## 📄 Example 5: Documentation Generation

### Question
```
Generate EU AI Act compliance documentation for our customer support chatbot
```

### Agent Workflow
1. **Classifies the system** as Limited Risk (Article 50)
   
2. **Calls `assess_compliance`** with:
   - System type: Customer support chatbot
   - Risk category: Limited Risk
   - Generate documentation: true
   
3. **Generates Templates**:

   **📋 Risk Assessment**
   ```markdown
   # Risk Assessment: Customer Support Chatbot
   
   ## Risk Classification
   - **Category**: Limited Risk
   - **Article**: Article 50 (Transparency Obligations)
   
   ## Risk Analysis
   The chatbot interacts with natural persons and must disclose
   that the user is interacting with an AI system...
   ```

   **📄 Technical Documentation**
   ```markdown
   # Technical Documentation
   
   ## System Description
   - **Name**: Customer Support Chatbot
   - **Purpose**: Automated customer service
   - **Technology**: Natural Language Processing
   
   ## Compliance Requirements
   1. Transparency Notice (Article 50)...
   ```

   **📢 Transparency Notice**
   ```markdown
   # Transparency Notice
   
   You are interacting with an AI system designed to assist
   with customer service inquiries...
   ```

4. **Provides Export Options**:
   - Download as Markdown
   - Convert to PDF
   - Generate Word document

**Use Case**: Creating required compliance documentation quickly

---

## ⚖️ Example 6: Compliance Gap Analysis

### Question
```
Analyze compliance gaps for our high-risk credit scoring AI
```

### Agent Workflow
1. **Calls `discover_ai_services`** with system details
   - Classifies as High Risk (Annex III, Section 5(b))
   
2. **Calls `assess_compliance`**
   - Analyzes current compliance status
   - Identifies gaps
   
3. **Returns Gap Analysis**:
   ```json
   {
     "assessment": {
       "overallScore": 45,
       "gaps": [
         {
           "area": "Technical Documentation",
           "severity": "Critical",
           "article": "Article 11",
           "description": "Missing comprehensive technical documentation per Annex IV",
           "recommendation": "Create detailed system architecture and data flow documentation"
         },
         {
           "area": "Conformity Assessment",
           "severity": "Critical",
           "article": "Article 43",
           "description": "No conformity assessment conducted",
           "recommendation": "Engage notified body for third-party assessment"
         },
         {
           "area": "Human Oversight",
           "severity": "High",
           "article": "Article 14",
           "description": "Insufficient human oversight mechanisms",
           "recommendation": "Implement human-in-the-loop review process"
         }
       ],
       "recommendations": [...]
     }
   }
   ```

4. **Provides Roadmap**:
   - Priority 1: Technical documentation
   - Priority 2: Conformity assessment
   - Priority 3: Human oversight implementation
   - Priority 4: Risk management system
   
**Use Case**: Understanding what needs to be done to achieve compliance

---

## 🎓 Example 7: Article-Specific Questions

### Question
```
Explain Article 14 on human oversight and how to implement it
```

### Agent Response
**Article 14: Human Oversight**

High-risk AI systems must be designed to enable effective oversight by natural persons during operation.

**Key Requirements**:
1. **Human-in-the-loop** (HITL) - Humans can intervene in real-time
2. **Human-on-the-loop** (HOTL) - Humans can monitor and intervene if needed
3. **Human-in-command** (HIC) - Humans can override AI decisions

**Implementation Steps**:
1. **Design interfaces** that enable humans to:
   - Understand AI outputs
   - Interpret system decisions
   - Override or reverse decisions
   - Interrupt system operation

2. **Provide training** to oversight personnel on:
   - System capabilities and limitations
   - Potential risks and biases
   - When and how to intervene

3. **Document procedures** for:
   - Escalation paths
   - Override protocols
   - Incident reporting

**Example Implementation**:
```typescript
// Human oversight mechanism
interface HumanOversight {
  canOverride: boolean;
  reviewRequired: boolean;
  escalationPath: string[];
  monitoringLevel: "HITL" | "HOTL" | "HIC";
}
```

**Use Case**: Understanding specific compliance requirements in depth

---

## 🌐 Example 8: Multi-Step Analysis

### Question
```
I'm launching a new AI-powered hiring platform in the EU. 
What do I need to do to be compliant?
```

### Agent Workflow (Automatic Multi-Step)

**Step 1: Risk Classification**
- Identifies this as HIGH RISK (Annex III, Section 4)
- Explains strict requirements apply

**Step 2: Organization Profile**
- Asks for or discovers organization details
- Determines provider role and obligations

**Step 3: System Discovery**
- Catalogs the hiring platform features
- Identifies which components are AI-driven

**Step 4: Compliance Assessment**
- Generates comprehensive compliance checklist
- Identifies documentation requirements
- Provides timeline and budget estimates

**Step 5: Documentation**
- Generates initial templates for:
  - Risk management system
  - Technical documentation
  - Conformity assessment preparation
  - Transparency notices

**Step 6: Roadmap**
- Creates phased implementation plan
- Suggests notified bodies for assessment
- Provides resource recommendations

**Use Case**: End-to-end compliance planning for new AI products

---

## 🔄 Example 9: Compliance Monitoring

### Question
```
We completed initial compliance last year. 
How do we maintain ongoing compliance?
```

### Agent Response

**Ongoing Compliance Requirements**:

**1. Post-Market Monitoring (Article 72)**
- Establish monitoring system
- Collect and analyze incident data
- Report serious incidents to authorities

**2. Regular Updates**:
- Update technical documentation with system changes
- Re-assess risks after major updates
- Maintain conformity assessment validity

**3. Quality Management (Article 17)**:
- Conduct internal audits
- Maintain management review process
- Implement corrective actions

**4. Record Keeping**:
- Maintain logs for high-risk systems (Article 12)
- Keep documentation for 10 years
- Track all modifications

**5. Incident Response**:
- Report serious incidents within 15 days
- Implement corrective measures
- Update risk assessments

**Recommended Schedule**:
- Monthly: Review system logs and incidents
- Quarterly: Internal compliance audit
- Annually: Full compliance review and update documentation
- As needed: Risk re-assessment after changes

**Use Case**: Establishing continuous compliance processes

---

## 💼 Example 10: Executive Summary

### Question
```
Create an executive summary of our AI compliance status 
for the board meeting
```

### Agent Workflow
1. Runs organization discovery
2. Discovers all AI systems
3. Assesses overall compliance
4. Generates executive summary

### Sample Output

```markdown
# EU AI Act Compliance - Executive Summary

## Overview
- **Organization**: [Company Name]
- **Total AI Systems**: 8
- **Overall Compliance Score**: 62/100

## Risk Breakdown
- 🔴 Unacceptable Risk: 0 systems
- 🟠 High Risk: 2 systems
- 🟡 Limited Risk: 3 systems
- 🟢 Minimal Risk: 3 systems

## Critical Actions Required
1. **Urgent**: Complete conformity assessment for recruitment AI (Deadline: Aug 2026)
2. **High Priority**: Implement human oversight for credit scoring AI
3. **Medium Priority**: Create transparency notices for chatbots

## Budget Impact
- Conformity assessments: €50,000 - €100,000
- Documentation & implementation: €30,000 - €50,000
- Ongoing compliance: €20,000/year

## Timeline
- Q1 2025: Complete high-risk system documentation
- Q2 2025: Begin conformity assessments
- Q3 2025: Implement human oversight mechanisms
- Q4 2025: Final compliance verification

## Risks of Non-Compliance
- Fines up to €35M or 7% of global revenue
- Prohibition from EU market
- Reputational damage
```

**Use Case**: Communicating compliance status to leadership and stakeholders

---

## 🎯 Pro Tips for Using the Agent

### 1. Be Specific
❌ "Tell me about compliance"
✅ "Analyze compliance requirements for our facial recognition system"

### 2. Provide Context
❌ "Is this high-risk?"
✅ "Is a chatbot for mental health counseling high-risk?"

### 3. Use Follow-Ups
Ask clarifying questions based on the agent's responses:
- "Can you explain that Article in more detail?"
- "What's the timeline for implementing this?"
- "How much does conformity assessment typically cost?"

### 4. Request Specifics
- "Generate just the transparency notice"
- "Focus only on Article 10 data governance requirements"
- "What are the penalties for non-compliance?"

### 5. Leverage Tools
The agent automatically uses the right tools:
- Organization questions → `discover_organization`
- System questions → `discover_ai_services`
- Documentation requests → `assess_compliance`

---

## 📚 Common Questions

**Q: Can it analyze my actual systems?**
A: With proper integration, yes. Currently it uses mock data but can be connected to your infrastructure.

**Q: Is the documentation legally binding?**
A: No, it provides templates and guidance. Always consult legal professionals for final documentation.

**Q: Can it help with GDPR compliance too?**
A: The EU AI Act intersects with GDPR. The agent provides guidance on data governance (Article 10) which aligns with GDPR.

**Q: How often should I use it?**
A: 
- Initially: For assessment and planning
- Quarterly: For compliance reviews
- As needed: When launching new AI systems

**Q: Can it track multiple projects?**
A: Currently it's conversation-based. Consider exporting and saving assessments for different projects.

---

**Ready to try these examples?** Start the agent and copy any of the questions above! 🚀

