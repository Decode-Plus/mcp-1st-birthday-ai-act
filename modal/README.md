# Modal Deployment for GPT-OSS vLLM

Deploy OpenAI's GPT-OSS models (20B or 120B) on [Modal.com](https://modal.com) with vLLM for efficient inference.

## 🚀 Quick Start

### 1. Install Modal CLI

```bash
# Install the Modal Python package
pip install modal

# Authenticate with Modal (opens browser)
modal setup
```

If `modal setup` doesn't work, try:
```bash
python -m modal setup
```

### 2. Create a Modal Account

1. Go to [modal.com](https://modal.com)
2. Create a free account
3. Run `modal setup` to authenticate

### 3. Deploy the GPT-OSS Model

```bash
# Navigate to the modal directory
cd modal

# Test the server (spins up a temporary instance)
modal run gpt_oss_inference.py

# Deploy to production (creates a persistent endpoint)
modal deploy gpt_oss_inference.py
```

## 📋 Configuration

### GPU Selection (Cost Optimization)

Edit `gpt_oss_inference.py` to choose your GPU tier:

```python
# Choose your GPU - uncomment the one you want:
GPU_CONFIG = "A10G"  # ~$0.76/hr - RECOMMENDED for budget ✅
# GPU_CONFIG = "L4"     # ~$0.59/hr - Cheapest option
# GPU_CONFIG = "A100"   # ~$1.79/hr - More headroom
# GPU_CONFIG = "H100"   # ~$3.95/hr - Maximum performance
```

### GPU Pricing Comparison

| GPU       | VRAM | Price/hr   | Best For                         |
| --------- | ---- | ---------- | -------------------------------- |
| L4        | 24GB | ~$0.59     | Tightest budget (may be tight)   |
| **A10G**  | 24GB | **~$0.76** | **Best value for GPT-OSS 20B** ✅ |
| A100 40GB | 40GB | ~$1.79     | More headroom                    |
| A100 80GB | 80GB | ~$2.78     | Both 20B and 120B                |
| H100      | 80GB | ~$3.95     | Maximum performance              |

### Model Selection

```python
# 20B model - faster, fits on A10G/L4
MODEL_NAME = "openai/gpt-oss-20b"

# 120B model - needs A100 80GB or H100
MODEL_NAME = "openai/gpt-oss-120b"
```

### Performance Tuning

```python
# FAST_BOOT = True  - Faster startup, less memory (use for smaller GPUs)
# FAST_BOOT = False - Slower startup, faster inference
FAST_BOOT = True

# Data type - GPT-OSS MXFP4 quantization REQUIRES bfloat16 (float16 not supported)
# The Marlin kernel warning on A10G/L4 is expected and can be ignored
USE_FLOAT16 = False  # Must be False for GPT-OSS (MXFP4 only supports bfloat16)

# Maximum model length (context window) - reduce to speed up startup
MAX_MODEL_LEN = 32768  # 32k tokens (can increase to 131072 if needed)

# Keep container warm longer to avoid cold starts
SCALEDOWN_WINDOW = 5 * MINUTES  # Reduced from 10 minutes for faster warm starts

# Maximum concurrent requests (reduce for smaller GPUs)
MAX_INPUTS = 50
```

#### Startup Time Optimization

The following optimizations are enabled by default to reduce the ~1 minute startup time:

- **`--max-model-len 65536`**: Limits context window to 64k tokens (faster startup, can increase to 131072 if needed)
- **`--disable-custom-all-reduce`**: Disabled for single GPU (reduces startup overhead)
- **`--enable-prefix-caching`**: Enables prefix caching for faster subsequent requests
- **`--load-format auto`**: Auto-detects best loading format for faster model loading
- **Reduced scaledown window**: Keeps container warm for 5 minutes instead of 10 (faster warm starts)

Note: `--dtype bfloat16` is required for GPT-OSS (MXFP4 quantization only supports bf16)

## 🔧 Commands

| Command                                 | Description                  |
| --------------------------------------- | ---------------------------- |
| `modal run gpt_oss_inference.py`        | Test with a temporary server |
| `modal deploy gpt_oss_inference.py`     | Deploy to production         |
| `modal app stop gpt-oss-vllm-inference` | Stop the deployed app        |
| `modal app logs gpt-oss-vllm-inference` | View deployment logs         |
| `modal volume ls`                       | List cached volumes          |

## 🌐 API Usage

Once deployed, the server exposes an OpenAI-compatible API:

### Endpoint URL

After deployment, Modal will provide a URL like:
```
https://your-workspace--gpt-oss-vllm-inference-serve.modal.run
```

### Making Requests

```python
import openai

client = openai.OpenAI(
    base_url="https://your-workspace--gpt-oss-vllm-inference-serve.modal.run/v1",
    api_key="not-needed"  # Modal handles auth via the URL
)

response = client.chat.completions.create(
    model="llm",
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Hello!"}
    ]
)
print(response.choices[0].message.content)
```

### cURL Example

```bash
curl -X POST "https://your-workspace--gpt-oss-vllm-inference-serve.modal.run/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llm",
    "messages": [
      {"role": "user", "content": "Hello!"}
    ]
  }'
```

## 💰 Pricing

Modal charges per second of usage:
- **A10G GPU**: ~$0.76/hour (recommended) ✅
- **L4 GPU**: ~$0.59/hour (cheapest)
- **A100 40GB**: ~$1.79/hour
- **H100 GPU**: ~$3.95/hour (fastest)
- No charges when idle (scale to zero)
- First $30/month is free

## 📦 Model Details

### GPT-OSS 20B
- MoE architecture with efficient inference
- MXFP4 quantization for MoE layers (~10-15GB VRAM)
- Attention sink support for longer contexts
- **Fits on A10G, L4, A100, or H100** ✅

### GPT-OSS 120B
- Larger model with more capabilities
- Same quantization and architecture (~40-50GB VRAM)
- **Requires A100 80GB or H100**

## 🔍 Troubleshooting

### Authentication Issues
```bash
# Re-authenticate
modal token new
```

### GPU Availability
If your selected GPU is not available, Modal will queue your request. Tips:
- **A10G and L4** typically have better availability than H100
- Try different regions
- Use off-peak hours
- Change `GPU_CONFIG` to a different tier

### Marlin Kernel Warning
If you see: `You are running Marlin kernel with bf16 on GPUs before SM90`:
- **This warning can be safely ignored** - GPT-OSS uses MXFP4 quantization which **requires bfloat16**
- float16 is NOT supported for MXFP4 quantization (will cause a validation error)
- The warning is just a performance suggestion, but we cannot use fp16 for this model
- For optimal performance, use H100 (SM90+) which is optimized for bf16

### Startup Time Optimization
If startup takes ~1 minute:
- ✅ **Already optimized** - The code includes several optimizations:
  - Uses `float16` instead of `bfloat16` for faster loading
  - Limits context window to 32k tokens (faster memory allocation)
  - Disables custom all-reduce for single GPU
  - Enables prefix caching
  - Uses auto load format detection
- To reduce startup further, you can:
  - Increase `SCALEDOWN_WINDOW` to keep container warm longer (costs more)
  - Use a larger GPU (A100/H100) for faster model loading
  - Reduce `MAX_MODEL_LEN` if you don't need full context window

### Cache Issues
```bash
# Clear vLLM cache
modal volume rm vllm-cache
modal volume create vllm-cache

# Clear HuggingFace cache
modal volume rm huggingface-cache
modal volume create huggingface-cache
```

## 📚 Resources

- [Modal Documentation](https://modal.com/docs/guide)
- [vLLM Documentation](https://docs.vllm.ai/)
- [GPT-OSS on HuggingFace](https://huggingface.co/openai/gpt-oss-20b)
- [Modal Examples](https://modal.com/docs/examples)

