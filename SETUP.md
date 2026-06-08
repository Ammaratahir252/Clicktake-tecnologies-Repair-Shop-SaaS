# DibnowAI Chatbot — Complete Setup Guide
## DibnowRepairSaaS · Module 8 · AI & Automation

---

## 📦 What's Inside

```
dibnow-chatbot/
├── main.py              ← Python backend (FastAPI + Groq AI)
├── requirements.txt     ← Python dependencies
├── static/
│   └── index.html       ← Full chatbot UI
└── SETUP.md             ← This file
```

---

## 🔑 STEP 1 — Get Your FREE Groq API Key

1. Go to **https://console.groq.com**
2. Click **Sign Up** (free — no credit card needed)
3. Go to **API Keys** → click **Create API Key**
4. Copy the key (starts with `gsk_...`)
5. Keep it somewhere safe

> **Model used:** `llama3-8b-8192` — completely **FREE** on Groq Cloud  
> **Limits:** 30 requests/min, 14,400 req/day on free tier — more than enough

---

## 🔧 STEP 2 — Add Your API Key

Open `main.py` in VS Code.

Find this line (around line 17):
```python
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "YOUR_GROQ_API_KEY_HERE")
```

**Option A — Replace directly in the file (simplest):**
```python
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "gsk_YOUR_ACTUAL_KEY_HERE")
```

**Option B — Set as environment variable (more secure):**

Windows (PowerShell):
```powershell
$env:GROQ_API_KEY = "gsk_your_key_here"
```

Mac/Linux (Terminal):
```bash
export GROQ_API_KEY="gsk_your_key_here"
```

---

## 🐍 STEP 3 — Install Python & Dependencies

### Check if Python is installed:
```bash
python --version
# Should show Python 3.10 or higher
```

If not installed → download from **https://python.org/downloads**  
(Check "Add Python to PATH" during installation on Windows)

### Open the project in VS Code:
1. Open VS Code
2. File → Open Folder → select the `dibnow-chatbot` folder
3. Open Terminal: `Ctrl + `` ` (backtick)

### Install dependencies:
```bash
pip install -r requirements.txt
```

Wait for everything to install (takes 1-2 minutes).

---

## 🚀 STEP 4 — Run the Chatbot

In the VS Code terminal:
```bash
python main.py
```

You'll see:
```
=======================================================
  DibnowAI Chatbot — DibnowRepairSaaS Module 8
  Powered by Groq Cloud (Llama3-8b) — FREE TIER
=======================================================

  🚀 Server starting at: http://localhost:8000
=======================================================
```

---

## 🌐 STEP 5 — Open the Chatbot

Open your browser and go to:
```
http://localhost:8000
```

The DibnowAI chatbot interface will load. ✅

---

## ✅ Verification Checklist

- [ ] Groq API key set in main.py
- [ ] `pip install -r requirements.txt` completed without errors
- [ ] `python main.py` running in terminal
- [ ] Browser shows the chat UI at http://localhost:8000
- [ ] Status bar at bottom-left shows green dot "Connected"
- [ ] You can send a message and get a response

---

## 💬 What DibnowAI Can Do

| Capability | Example Prompt |
|---|---|
| Device Diagnostics | "iPhone 13 won't turn on after drop, diagnose" |
| Cost Estimation | "Samsung S23 screen crack repair cost in PKR" |
| Workflow Automation | "Set up IF/THEN rule for high-value estimates" |
| Inventory Advice | "What parts should I reorder this month?" |
| Customer Support | "Explain repair ticket statuses to customer" |
| Platform Navigation | "How do I set up doorstep delivery zones?" |
| Leads Management | "How does GPS lead routing work?" |
| Business Analytics | "How to improve technician performance KPIs?" |

---

## 🛠️ Troubleshooting

### "ModuleNotFoundError: No module named 'fastapi'"
```bash
pip install -r requirements.txt
```

### "Connection refused" in browser
Make sure `python main.py` is running in terminal.

### "API key not configured" warning
Check that you set the API key correctly in `main.py`.

### Port 8000 already in use
Edit the last line of `main.py`:
```python
uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
```
Then go to `http://localhost:8001`

### Slow responses
Normal — Groq free tier can take 2-5 seconds. Paid tier is faster.

---

## 🔄 Stopping the Server

Press `Ctrl + C` in the terminal.

---

## 📝 Notes

- Conversation history is stored **in memory** — it resets when you restart the server
- The chatbot uses `llama3-8b-8192` model (free) — you can switch to `mixtral-8x7b-32768` for longer context
- No data is sent to any server other than Groq's API
- All conversation data stays on your machine

---

## 🏢 DibnowRepairSaaS — Module 8 AI Features Included

✅ AI Diagnostic Assistant (symptom → probable causes + confidence %)  
✅ Repair Cost Estimation  
✅ Workflow Automation Guidance (IF/THEN rules)  
✅ Inventory Intelligence & Demand Forecasting  
✅ Customer Support & FAQ Bot  
✅ Platform Navigation Assistant  
✅ Leads Management Guidance  
✅ Business Analytics Insights  
✅ Streaming responses (real-time token output)  
✅ Role-based context (Technician / Owner / Manager / etc.)  
✅ Multi-turn conversation memory (per session)  
✅ New chat / clear conversation  
✅ Copy message button  
✅ Quick action prompts  

---

*Dibnow Engineering © 2026 | DibnowRepairSaaS v2.0*
